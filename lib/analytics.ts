import { getSupabase } from '@/lib/supabase-server'
import { intentOf, normalizeMessages, type ChatMessage } from '@/lib/chat'

export interface AnalyticsTotals {
  conversations: number
  activeChats: number
  messages: number
  inbound: number
  outbound: number
  searches: number
  resultOpens: number
  chatOpens: number
  responseMedian: string
  responseP90: string
  completionRate: number
  unanswered: number
}

export interface AnalyticsSection {
  title: string
  description: string
  items: { label: string; count: number }[]
}

export interface AnalyticsData {
  rangeDays: number
  generatedAt: string
  volume: { date: string; label: string; inbound: number; outbound: number; total: number }[]
  totals: AnalyticsTotals
  intents: { label: string; count: number }[]
  unanswered: { text: string; at: string | null; phone: string }[]
  sections: AnalyticsSection[]
  definitions: string[]
}

function clampDays(days: number | undefined): number {
  const value = Number(days || 30)
  if (!Number.isFinite(value)) return 30
  return Math.min(90, Math.max(7, Math.round(value)))
}

function sinceISO(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function dateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10)
}

function buildVolume(
  messages: { at: string | null; direction: 'in' | 'out' | 'system' }[],
  days: number
): AnalyticsData['volume'] {
  const byDate = new Map<string, { inbound: number; outbound: number }>()
  for (const message of messages) {
    if (!message.at || message.direction === 'system') continue
    const key = dateKey(message.at)
    const entry = byDate.get(key) || { inbound: 0, outbound: 0 }
    if (message.direction === 'in') entry.inbound++
    else entry.outbound++
    byDate.set(key, entry)
  }
  const volume: AnalyticsData['volume'] = []
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  for (let i = 0; i < days; i++) {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + i)
    const key = date.toISOString().slice(0, 10)
    const entry = byDate.get(key) || { inbound: 0, outbound: 0 }
    volume.push({
      date: key,
      label: key.slice(5),
      inbound: entry.inbound,
      outbound: entry.outbound,
      total: entry.inbound + entry.outbound,
    })
  }
  return volume
}

function responseStats(messages: ChatMessage[]): { median: string; p90: string } {
  const gaps: number[] = []
  let pendingInbound: number | null = null
  for (const message of messages) {
    if (!message.at) continue
    const at = new Date(message.at).getTime()
    if (message.direction === 'in') {
      if (pendingInbound == null) pendingInbound = at
    } else if (message.direction === 'out' && pendingInbound != null) {
      const gap = at - pendingInbound
      if (gap >= 0 && gap < 24 * 3_600_000) gaps.push(gap)
      pendingInbound = null
    }
  }
  if (!gaps.length) return { median: '—', p90: '—' }
  gaps.sort((a, b) => a - b)
  const median = gaps[Math.floor(gaps.length / 2)]
  const p90 = gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * 0.9))]
  const format = (ms: number) => {
    if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s`
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`
    return `${(ms / 3_600_000).toFixed(1)}h`
  }
  return { median: format(median), p90: format(p90) }
}

function unansweredQuestions(messages: ChatMessage[]): { text: string; at: string | null; phone: string }[] {
  const byPhone = new Map<string, ChatMessage[]>()
  for (const message of messages) {
    const key = (message as ChatMessage & { phone?: string }).phone || ''
    if (!key) continue
    const list = byPhone.get(key) || []
    list.push(message)
    byPhone.set(key, list)
  }
  const results: { text: string; at: string | null; phone: string }[] = []
  for (const [phone, list] of byPhone) {
    for (let i = 0; i < list.length; i++) {
      const message = list[i]
      if (message.direction !== 'in' || !/\?$/.test(message.text.trim())) continue
      const at = message.at ? new Date(message.at).getTime() : 0
      const answered = list
        .slice(i + 1)
        .some(next => {
          if (next.direction !== 'out' || !next.at) return false
          const nextAt = new Date(next.at).getTime()
          return nextAt - at <= 30 * 60_000
        })
      if (!answered) results.push({ text: message.text, at: message.at, phone })
    }
  }
  return results.sort((a, b) => {
    const at = a.at ? new Date(a.at).getTime() : 0
    const bt = b.at ? new Date(b.at).getTime() : 0
    return bt - at
  })
}

function topCounts(values: string[], limit = 8): { label: string; count: number }[] {
  const map = new Map<string, number>()
  for (const value of values) {
    const label = (value || '').trim()
    if (!label) continue
    map.set(label, (map.get(label) || 0) + 1)
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function intentCounts(firstInbound: string[]): { label: string; count: number }[] {
  const map = new Map<string, number>()
  for (const text of firstInbound) {
    const intent = intentOf(text)
    map.set(intent, (map.get(intent) || 0) + 1)
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

function completion(messagesByPhone: Map<string, ChatMessage[]>, threshold = 4): number {
  if (!messagesByPhone.size) return 0
  let reached = 0
  for (const list of messagesByPhone.values()) {
    if (list.filter(message => message.direction !== 'system').length >= threshold) reached++
  }
  return Math.round((reached / messagesByPhone.size) * 100)
}

async function dailyTotals(businessId: string | null, days: number) {
  let query = getSupabase()
    .from('daily_stats')
    .select('type, count')
    .gte('date', sinceISO(days).slice(0, 10))
    .in('type', ['bot_search', 'bot_select', 'bot_chat_open'])
  if (businessId) query = query.eq('business_id', businessId)
  const { data } = await query
  const totals = { searches: 0, resultOpens: 0, chatOpens: 0 }
  for (const row of data || []) {
    const count = Number(row.count || 0)
    if (row.type === 'bot_search') totals.searches += count
    else if (row.type === 'bot_select') totals.resultOpens += count
    else if (row.type === 'bot_chat_open') totals.chatOpens += count
  }
  return totals
}

export async function getAdminAnalytics(daysInput?: number): Promise<AnalyticsData> {
  const days = clampDays(daysInput)
  const since = sinceISO(days)
  const supabase = getSupabase()

  const [messagesRes, searchesRes, contactsRes, activeRes, daily] = await Promise.all([
    supabase
      .from('bot_messages')
      .select('phone, dir, body, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(8000),
    supabase
      .from('bot_searches')
      .select('term, city, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(3000),
    supabase.from('bot_contacts').select('id', { count: 'exact', head: true }),
    supabase
      .from('bot_contacts')
      .select('id', { count: 'exact', head: true })
      .gte('last_seen', new Date(Date.now() - 7 * 86_400_000).toISOString()),
    dailyTotals(null, days),
  ])

  const rows = messagesRes.data || []
  const chronological = rows.slice().reverse()
  const messages: (ChatMessage & { phone: string })[] = chronological.map(row => ({
    id: '',
    direction: row.dir === 'out' ? 'out' : 'in',
    kind: 'text',
    text: row.body || '',
    at: row.created_at,
    phone: row.phone,
  }))

  const byPhone = new Map<string, ChatMessage[]>()
  const firstInbound = new Map<string, string>()
  for (const message of messages) {
    const list = byPhone.get(message.phone) || []
    list.push(message)
    byPhone.set(message.phone, list)
    if (message.direction === 'in' && !firstInbound.has(message.phone)) {
      firstInbound.set(message.phone, message.text)
    }
  }

  const inbound = messages.filter(message => message.direction === 'in').length
  const outbound = messages.filter(message => message.direction === 'out').length
  const response = responseStats(messages)
  const unanswered = unansweredQuestions(messages)
  const searches = searchesRes.data || []

  const threads = byPhone.size
  const conversations = Math.max(threads, contactsRes.count || 0)
  const completionRate = completion(byPhone)

  return {
    rangeDays: days,
    generatedAt: new Date().toISOString(),
    volume: buildVolume(messages, days),
    totals: {
      conversations,
      activeChats: activeRes.count || 0,
      messages: messages.length,
      inbound,
      outbound,
      searches: daily.searches || searches.length,
      resultOpens: daily.resultOpens,
      chatOpens: daily.chatOpens,
      responseMedian: response.median,
      responseP90: response.p90,
      completionRate,
      unanswered: unanswered.length,
    },
    intents: intentCounts([...firstInbound.values()]),
    unanswered: unanswered.slice(0, 12),
    sections: [
      {
        title: 'Top search terms',
        description: 'What people asked the bot to find.',
        items: topCounts(searches.map(row => row.term.toLowerCase())),
      },
      {
        title: 'Popular locations',
        description: 'Cities and towns used in searches.',
        items: topCounts(searches.map(row => row.city)),
      },
      {
        title: 'Conversation outcomes',
        description: 'Conversations reaching a business chat versus all bot contacts.',
        items: [
          { label: 'Business chats opened', count: daily.chatOpens },
          { label: 'Results opened', count: daily.resultOpens },
          { label: 'Searches (no result opened, approx.)', count: Math.max(0, daily.searches - daily.resultOpens) },
        ].filter(item => item.count > 0),
      },
    ],
    definitions: [
      'Volume counts each inbound and outbound bot message once, for the selected range.',
      'Active chats are bot contacts seen in the last 7 days.',
      'Completion rate is the share of conversations with 4+ messages.',
      'Searches without a result opened is an approximation: successful searches can open more than one result.',
      'Unanswered questions are inbound messages ending in “?” with no bot reply within 30 minutes.',
      'Intents are keyword-based and intended as a directional signal, not a classifier.',
      `Based on up to 8,000 recent messages and 3,000 searches in the last ${days} days.`,
    ],
  }
}

export async function getBusinessAnalytics(
  businessId: string,
  businessName: string,
  daysInput?: number
): Promise<AnalyticsData> {
  const days = clampDays(daysInput)
  const since = sinceISO(days)
  const supabase = getSupabase()

  const [logsRes, daily] = await Promise.all([
    supabase
      .from('chat_logs')
      .select('customer_phone, messages, found_via, created_at, updated_at')
      .eq('business_id', businessId)
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(500),
    dailyTotals(businessId, days),
  ])

  const logs = logsRes.data || []
  const all: (ChatMessage & { phone: string })[] = []
  const byPhone = new Map<string, ChatMessage[]>()
  const firstInbound = new Map<string, string>()
  const sources: string[] = []

  for (const log of logs) {
    const normalized = normalizeMessages(log.messages, log.customer_phone)
    const tagged = normalized.map(message => ({ ...message, phone: log.customer_phone }))
    all.push(...tagged)
    byPhone.set(log.customer_phone, tagged)
    const first = tagged.find(message => message.direction === 'in')
    if (first) firstInbound.set(log.customer_phone, first.text)
    if (log.found_via) sources.push(log.found_via)
  }

  all.sort((a, b) => {
    const at = a.at ? new Date(a.at).getTime() : 0
    const bt = b.at ? new Date(b.at).getTime() : 0
    return at - bt
  })

  const inbound = all.filter(message => message.direction === 'in').length
  const outbound = all.filter(message => message.direction === 'out').length
  const response = responseStats(all)
  const unanswered = unansweredQuestions(all)
  const activeChats = logs.filter(
    log => new Date(log.updated_at).getTime() >= Date.now() - 7 * 86_400_000
  ).length

  return {
    rangeDays: days,
    generatedAt: new Date().toISOString(),
    volume: buildVolume(all, days),
    totals: {
      conversations: logs.length,
      activeChats,
      messages: all.length,
      inbound,
      outbound,
      searches: daily.searches,
      resultOpens: daily.resultOpens,
      chatOpens: daily.chatOpens,
      responseMedian: response.median,
      responseP90: response.p90,
      completionRate: completion(byPhone),
      unanswered: unanswered.length,
    },
    intents: intentCounts([...firstInbound.values()]),
    unanswered: unanswered.slice(0, 12),
    sections: [
      {
        title: 'How customers found you',
        description: 'Attribution recorded when the chat was opened.',
        items: topCounts(sources),
      },
      {
        title: 'What customers asked about',
        description: 'Keyword signals from opening messages.',
        items: intentCounts([...firstInbound.values()]).slice(0, 8),
      },
    ],
    definitions: [
      `Conversation analytics for ${businessName}, from bot-attributed chats only.`,
      'Volume counts each transcript message once, for the selected range.',
      'Active chats had activity in the last 7 days.',
      'Completion rate is the share of conversations with 4+ messages.',
      'Response times are gaps between a customer message and the next bot reply.',
      'Searches and chat opens come from the directory’s daily bot statistics.',
    ],
  }
}

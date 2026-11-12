import { getSupabase } from '@/lib/supabase-server'
import { fetchBusinessesByIds } from '@/lib/business-select'
import { logBotMessage } from '@/lib/bot-log'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import {
  mergeMessages,
  normalizeMessage,
  normalizeMessages,
  phoneDigits,
  phoneVariants,
  readableValue,
  type ChatDetail,
  type ChatMessage,
  type ChatThread,
} from '@/lib/chat'

export type ChatScope = 'admin' | { businessId: string; businessName?: string; businessCity?: string }

export function scopeKey(scope: ChatScope): string {
  return scope === 'admin' ? 'admin' : `biz:${scope.businessId}`
}

type ChatFlag = {
  status: 'active' | 'resolved' | 'archived'
  blocked: boolean
  last_read_at: string | null
}

const FLAG_COLUMNS = 'phone, status, blocked, last_read_at, updated_at'

// Older rows stored the number with a leading "+" while contacts and sessions
// use bare digits. Key flags by digits and keep the freshest row so every
// screen sees the same status for the same person.
async function loadFlags(key: string): Promise<Map<string, ChatFlag>> {
  try {
    const { data, error } = await getSupabase()
      .from('chat_flags')
      .select(FLAG_COLUMNS)
      .eq('scope', key)
      .limit(1000)
    if (error) return new Map()
    const flags = new Map<string, ChatFlag>()
    const stamp = new Map<string, number>()
    for (const row of data || []) {
      const digits = phoneDigits(row.phone)
      if (!digits) continue
      const updated = row.updated_at ? Date.parse(row.updated_at) : 0
      const current = stamp.get(digits)
      if (current !== undefined && updated < current) continue
      flags.set(digits, {
        status: (row.status || 'active') as ChatFlag['status'],
        blocked: !!row.blocked,
        last_read_at: row.last_read_at,
      })
      stamp.set(digits, updated)
    }
    return flags
  } catch {
    return new Map()
  }
}

function locationFrom(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const direct = readableValue(
      obj.label || obj.name || obj.address || obj.city || obj.area || obj.location || ''
    )
    if (direct) return direct
    const lat = Number(obj.lat ?? obj.latitude)
    const lng = Number(obj.lng ?? obj.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
  return ''
}

function cityFromSession(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const obj = data as Record<string, unknown>
  for (const key of ['city', 'town', 'area', 'location', 'address', 'place']) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    const nested = locationFrom(value)
    if (nested) return nested
  }
  return ''
}

export async function listAdminChats(): Promise<ChatThread[]> {
  const supabase = getSupabase()

  const [contactsRes, sessionsRes, messagesRes, logsRes] = await Promise.all([
    supabase
      .from('bot_contacts')
      .select('phone, name, first_seen, last_seen, message_count, last_step, opted_out')
      .order('last_seen', { ascending: false })
      .limit(400),
    supabase
      .from('chat_sessions')
      .select('phone, step, data, updated_at')
      .order('updated_at', { ascending: false })
      .limit(400),
    supabase
      .from('bot_messages')
      .select('phone, dir, kind, body, created_at')
      .order('created_at', { ascending: false })
      .limit(1200),
    supabase
      .from('chat_logs')
      .select('customer_phone, business_id, found_via, updated_at')
      .order('updated_at', { ascending: false })
      .limit(400),
  ])

  const flags = await loadFlags('admin')
  const contacts = contactsRes.data || []
  const sessions = sessionsRes.data || []
  const recent = messagesRes.data || []
  const logs = logsRes.data || []

  const contactByPhone = new Map<string, (typeof contacts)[number]>()
  for (const row of contacts) {
    const digits = phoneDigits(row.phone)
    if (digits && !contactByPhone.has(digits)) contactByPhone.set(digits, row)
  }
  const sessionByPhone = new Map<string, (typeof sessions)[number]>()
  for (const row of sessions) {
    const digits = phoneDigits(row.phone)
    if (digits && !sessionByPhone.has(digits)) sessionByPhone.set(digits, row)
  }
  // Rows are newest-first: track the latest activity for sorting/unread, but
  // pick the inbox preview from the latest message that carries real
  // conversation text — tap row ids ("list_publish"), reactions ("wamid…")
  // and raw structured tails are references, not a conversation preview.
  const lastAnyByPhone = new Map<string, { at: string; dir: string }>()
  const lastTextByPhone = new Map<string, string>()
  const recentCount = new Map<string, number>()
  const unreadByPhone = new Map<string, number>()
  for (const row of recent) {
    const digits = phoneDigits(row.phone)
    if (!digits) continue
    recentCount.set(digits, (recentCount.get(digits) || 0) + 1)
    if (!lastAnyByPhone.has(digits)) {
      lastAnyByPhone.set(digits, { at: row.created_at, dir: row.dir })
    }
    if (row.dir === 'in') {
      // A chat is unread when its newest message is inbound and arrived after
      // the admin last opened it. Comparing timestamps (not just "never read")
      // is what keeps the counter alive for the second and third messages.
      const readAt = flags.get(digits)?.last_read_at
      if (!readAt || Date.parse(row.created_at) > Date.parse(readAt)) {
        unreadByPhone.set(digits, (unreadByPhone.get(digits) || 0) + 1)
      }
    }
    if (!lastTextByPhone.has(digits)) {
      const kind = (row.kind || 'text').toLowerCase()
      if (kind !== 'tap' && kind !== 'reaction') {
        const message = normalizeMessage(
          { dir: row.dir, kind: row.kind, body: row.body, created_at: row.created_at },
          0,
          digits
        )
        const previewText = message.preview?.title && !message.text ? message.preview.title : message.text
        if (previewText && previewText !== 'Unsupported message') {
          lastTextByPhone.set(digits, previewText.slice(0, 220))
        }
      }
    }
  }

  const logByPhone = new Map<string, { foundVia: string; businessId: string | null; at: string }>()
  for (const row of logs) {
    const digits = phoneDigits(row.customer_phone)
    if (digits && !logByPhone.has(digits)) {
      logByPhone.set(digits, {
        foundVia: row.found_via || '',
        businessId: row.business_id,
        at: row.updated_at,
      })
    }
  }

  const businessIds = [...new Set(logs.map(row => row.business_id).filter(Boolean))] as string[]
  const businesses = await fetchBusinessesByIds(supabase, businessIds, 'id, name, city, area')
  const businessById = new Map(businesses.map(b => [String(b.id), b]))

  const phones = new Set<string>([
    ...contactByPhone.keys(),
    ...sessionByPhone.keys(),
    ...lastAnyByPhone.keys(),
    ...logByPhone.keys(),
  ])

  const threads: ChatThread[] = []
  for (const phone of phones) {
    if (!phone) continue
    const contact = contactByPhone.get(phone)
    const session = sessionByPhone.get(phone)
    const lastAny = lastAnyByPhone.get(phone)
    const log = logByPhone.get(phone)
    const flag = flags.get(phone)
    const business = log?.businessId ? businessById.get(log.businessId) : null
    const updatedAt =
      lastAny?.at || session?.updated_at || contact?.last_seen || log?.at || null
    const status = flag?.status || 'active'
    const lastDir = lastAny?.dir || ''
    const lastText =
      lastTextByPhone.get(phone) ||
      (session?.step ? `Bot step: ${session.step}` : '') ||
      (log?.foundVia ? `Found via ${log.foundVia}` : '') ||
      'No transcript yet'

    threads.push({
      id: phone,
      phone,
      name: contact?.name || '',
      lastText,
      lastAt: updatedAt,
      firstAt: contact?.first_seen || session?.updated_at || null,
      status,
      blocked: !!flag?.blocked,
      unread: !!unreadByPhone.get(phone),
      unreadCount: unreadByPhone.get(phone) || 0,
      messageCount: Number(contact?.message_count || recentCount.get(phone) || 0),
      foundVia: log?.foundVia || '',
      businessName: business ? String(business.name || '') : '',
      location: cityFromSession(session?.data),
      channel: 'bot',
    })
  }

  threads.sort((a, b) => {
    const at = a.lastAt ? new Date(a.lastAt).getTime() : 0
    const bt = b.lastAt ? new Date(b.lastAt).getTime() : 0
    return bt - at
  })
  return threads
}

function firstResponseStats(messages: ChatMessage[]): { median: string; p90: string } {
  const gaps: number[] = []
  let pendingInbound: number | null = null
  for (const message of messages) {
    if (!message.at) continue
    const at = new Date(message.at).getTime()
    if (message.direction === 'in') {
      if (pendingInbound == null) pendingInbound = at
    } else if (message.direction === 'out' && pendingInbound != null) {
      const gap = at - pendingInbound
      if (gap >= 0 && gap < 24 * 3600_000) gaps.push(gap)
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

const ADMIN_MESSAGE_PAGE = 200

export async function getAdminChat(phone: string, before = ''): Promise<ChatDetail | null> {
  const digits = phoneDigits(phone)
  if (!digits) return null
  const variants = phoneVariants(digits)
  const supabase = getSupabase()

  let messageQuery = supabase
    .from('bot_messages')
    .select('id, dir, kind, body, created_at')
    .in('phone', variants)
    .order('created_at', { ascending: false })
    .limit(ADMIN_MESSAGE_PAGE + 1)
  if (before) messageQuery = messageQuery.lt('created_at', before)

  const [messagesRes, contactRes, sessionRes, logsRes, flags] = await Promise.all([
    messageQuery,
    supabase
      .from('bot_contacts')
      .select('phone, name, first_seen, last_seen, message_count, last_step, opted_out')
      .in('phone', variants)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('chat_sessions')
      .select('phone, step, data, updated_at')
      .in('phone', variants)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('chat_logs')
      .select('id, customer_phone, business_id, found_via, messages, created_at, updated_at')
      .in('customer_phone', variants)
      .order('updated_at', { ascending: false })
      .limit(20),
    loadFlags('admin'),
  ])

  const fetched = messagesRes.data || []
  const hasMore = fetched.length > ADMIN_MESSAGE_PAGE
  const rows = fetched.slice(0, ADMIN_MESSAGE_PAGE).slice().reverse()
  const nextBefore = hasMore && rows.length ? String(rows[0].created_at || '') || null : null
  let messages = normalizeMessages(rows, digits)
  const logs = logsRes.data || []

  // Older conversations predate bot_messages: fall back to chat_logs copies.
  if (!messages.length && !before && logs.length) {
    messages = mergeMessages(logs.map(log => normalizeMessages(log.messages, digits)))
  }

  const contact = contactRes.data
  const session = sessionRes.data
  const flag = flags.get(digits)
  const latestLog = logs[0]
  const businessIds = [...new Set(logs.map(log => log.business_id).filter(Boolean))] as string[]
  const businesses = await fetchBusinessIdsSafe(businessIds)
  const business = latestLog?.business_id ? businesses.get(latestLog.business_id) : null

  const last = messages[messages.length - 1]
  const inbound = messages.filter(message => message.direction === 'in').length
  const outbound = messages.filter(message => message.direction === 'out').length
  const response = firstResponseStats(messages)
  const location = cityFromSession(session?.data) || (business?.city as string) || ''

  const thread: ChatThread = {
    id: digits,
    phone: digits,
    name: contact?.name || '',
    lastText: last?.text || (session?.step ? `Bot step: ${session.step}` : 'No transcript yet'),
    lastAt: last?.at || contact?.last_seen || session?.updated_at || null,
    firstAt: contact?.first_seen || (messages[0]?.at ?? null),
    status: flag?.status || 'active',
    blocked: !!flag?.blocked,
    unread: false,
    messageCount: Number(contact?.message_count || messages.length),
    foundVia: latestLog?.found_via || '',
    businessName: business ? String(business.name || '') : '',
    location,
    channel: 'bot',
  }

  const insights: { label: string; value: string }[] = [
    { label: 'Messages', value: `${messages.length}` },
    { label: 'Inbound / outbound', value: `${inbound} / ${outbound}` },
    { label: 'Median first reply', value: response.median },
    { label: '90th percentile reply', value: response.p90 },
    { label: 'Bot step', value: session?.step || contact?.last_step || '—' },
    { label: 'Marketing opt-out', value: contact?.opted_out ? 'Yes' : 'No' },
  ]

  const held = session?.data && typeof session.data === 'object'
    ? (session.data as Record<string, unknown>).held
    : null
  if (held) insights.push({ label: 'Session hold', value: 'Held by admin' })

  const lastInboundAt = [...messages].reverse().find(message => message.direction === 'in')?.at
  const replyWindowOpen =
    !!lastInboundAt && Date.now() - Date.parse(lastInboundAt) < 24 * 3600_000
  if (latestLog?.found_via) insights.push({ label: 'Found via', value: latestLog.found_via })
  if (business) insights.push({ label: 'Business attributed', value: String(business.name || '—') })

  return {
    thread,
    messages,
    hasMore,
    nextBefore,
    location,
    insights,
    canReply: replyWindowOpen,
    replyHint: replyWindowOpen
      ? 'Replies are sent from the directory WhatsApp number, and the bot pauses for this contact while you talk.'
      : 'The 24-hour WhatsApp reply window has closed. Ask the customer to send a message, then reply here.',
    canBlock: true,
    canClear: true,
  }
}

/** Pause the bot for this contact so it cannot answer over an admin reply. */
async function holdSession(phone: string) {
  const digits = phoneDigits(phone)
  if (!digits) return
  const supabase = getSupabase()
  const { data: existing } = await supabase
    .from('chat_sessions')
    .select('phone, step, data')
    .in('phone', phoneVariants(digits))
    .limit(1)
    .maybeSingle()
  const current = ((existing?.data || {}) as Record<string, unknown>)
  if (current.held) return
  const now = new Date().toISOString()
  if (!existing) {
    // Contacts with no live session still need a hold row, otherwise the bot
    // would build a fresh unlocked session on their next message.
    await supabase
      .from('chat_sessions')
      .upsert(
        { phone: digits, step: '', data: { held: { at: now, notified: false } }, updated_at: now },
        { onConflict: 'phone' }
      )
    return
  }
  await supabase
    .from('chat_sessions')
    .update({ step: existing.step, data: { ...current, held: { at: now, notified: false } }, updated_at: now })
    .eq('phone', existing.phone)
}

/**
 * Send a free-form reply to a customer from the admin chat screen.
 * WhatsApp only delivers these inside the 24-hour customer service window, so
 * the window is checked first and the failure is explained instead of guessed.
 */
export async function sendAdminReply(
  phone: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const digits = (phone || '').replace(/\D/g, '')
  const text = (message || '').trim()
  if (!digits) return { ok: false, error: 'This chat has no phone number to reply to.' }
  if (!text) return { ok: false, error: 'Type a reply first.' }
  if (text.length > 4000) return { ok: false, error: 'Keep the reply under 4000 characters.' }

  const supabase = getSupabase()
  let lastInbound: string | null = null
  for (const key of [phone, digits]) {
    const { data } = await supabase
      .from('bot_messages')
      .select('created_at')
      .eq('phone', key)
      .eq('dir', 'in')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.created_at) {
      lastInbound = data.created_at
      break
    }
  }
  if (!lastInbound || Date.now() - Date.parse(lastInbound) > 24 * 3600_000) {
    return {
      ok: false,
      error:
        'WhatsApp only allows a free reply within 24 hours of the customer\'s last message. Ask them to message first, then reply here.',
    }
  }

  const delivered = await sendWhatsAppMessage(digits, text)
  if (!delivered) {
    return { ok: false, error: 'WhatsApp did not accept the message. Check the connection and try again.' }
  }

  await logBotMessage(digits, 'out', 'admin', text)
  await updateChat('admin', digits, 'read').catch(() => {})
  await holdSession(digits).catch(() => {})
  return { ok: true }
}

async function fetchBusinessIdsSafe(ids: string[]): Promise<Map<string, Record<string, unknown>>> {
  if (!ids.length) return new Map()
  try {
    const rows = await fetchBusinessesByIds(getSupabase(), ids, 'id, name, city, area')
    return new Map(rows.map(row => [String(row.id), row]))
  } catch {
    return new Map()
  }
}

export async function listBusinessChats(
  businessId: string,
  businessName: string,
  businessCity: string
): Promise<ChatThread[]> {
  const supabase = getSupabase()
  const { data: logs } = await supabase
    .from('chat_logs')
    .select('id, customer_phone, messages, found_via, created_at, updated_at')
    .eq('business_id', businessId)
    .order('updated_at', { ascending: false })
    .limit(300)

  const flags = await loadFlags(`biz:${businessId}`)
  const threads: ChatThread[] = []

  for (const log of logs || []) {
    const messages = normalizeMessages(log.messages, log.customer_phone)
    const last = messages[messages.length - 1]
    const flag = flags.get(log.customer_phone)
    const unreadLast = last?.direction === 'in'
    const lastAt = last?.at || log.updated_at
    threads.push({
      id: log.id,
      phone: log.customer_phone,
      name: '',
      lastText: last?.text || 'No messages',
      lastAt,
      firstAt: log.created_at,
      status: flag?.status || 'active',
      blocked: !!flag?.blocked,
      unread: !flag?.last_read_at && unreadLast,
      messageCount: messages.length,
      foundVia: log.found_via || '',
      businessName,
      location: businessCity,
      channel: 'business',
    })
  }

  threads.sort((a, b) => {
    const at = a.lastAt ? new Date(a.lastAt).getTime() : 0
    const bt = b.lastAt ? new Date(b.lastAt).getTime() : 0
    return bt - at
  })
  return threads
}

export async function getBusinessChat(
  businessId: string,
  businessName: string,
  businessCity: string,
  phone: string
): Promise<ChatDetail | null> {
  if (!phone) return null
  const supabase = getSupabase()
  const [{ data: log }, flags] = await Promise.all([
    supabase
      .from('chat_logs')
      .select('id, customer_phone, messages, found_via, created_at, updated_at')
      .eq('business_id', businessId)
      .eq('customer_phone', phone)
      .maybeSingle(),
    loadFlags(`biz:${businessId}`),
  ])
  if (!log) return null

  const messages = normalizeMessages(log.messages, phone)
  const flag = flags.get(phone)
  const last = messages[messages.length - 1]
  const inbound = messages.filter(message => message.direction === 'in').length
  const outbound = messages.filter(message => message.direction === 'out').length
  const response = firstResponseStats(messages)

  const thread: ChatThread = {
    id: log.id,
    phone,
    name: '',
    lastText: last?.text || 'No messages',
    lastAt: last?.at || log.updated_at,
    firstAt: log.created_at,
    status: flag?.status || 'active',
    blocked: !!flag?.blocked,
    unread: false,
    messageCount: messages.length,
    foundVia: log.found_via || '',
    businessName,
    location: businessCity,
    channel: 'business',
  }

  return {
    thread,
    messages,
    hasMore: false,
    nextBefore: null,
    location: businessCity,
    insights: [
      { label: 'Messages', value: `${messages.length}` },
      { label: 'Customer / bot', value: `${inbound} / ${outbound}` },
      { label: 'Median first reply', value: response.median },
      { label: 'Attribution', value: log.found_via || '—' },
      { label: 'Chat opened', value: 'From WA Directory bot' },
    ],
    canReply: false,
    replyHint:
      'Reply from the WhatsApp Business app on your phone. The directory only reads bot conversations, so nothing you type here could reach the customer.',
    canBlock: true,
    canClear: false,
  }
}

export type ChatAction =
  | 'read'
  | 'resolve'
  | 'reopen'
  | 'archive'
  | 'unarchive'
  | 'block'
  | 'unblock'

const ACTION_PATCH: Record<Exclude<ChatAction, 'read'>, (now: string) => Record<string, unknown>> = {
  resolve: now => ({ status: 'resolved', resolved_at: now, updated_at: now }),
  reopen: now => ({ status: 'active', resolved_at: null, archived_at: null, updated_at: now }),
  archive: now => ({ status: 'archived', archived_at: now, updated_at: now }),
  unarchive: now => ({ status: 'active', archived_at: null, updated_at: now }),
  block: now => ({ blocked: true, blocked_at: now, updated_at: now }),
  unblock: now => ({ blocked: false, blocked_at: null, updated_at: now }),
}

export async function updateChat(
  key: string,
  phone: string,
  action: ChatAction
): Promise<{ ok: boolean; error?: string }> {
  const digits = phoneDigits(phone)
  if (!digits) return { ok: false, error: 'Phone is required' }
  const now = new Date().toISOString()
  const patch =
    action === 'read' ? { last_read_at: now, updated_at: now } : ACTION_PATCH[action]?.(now)
  if (!patch) return { ok: false, error: 'Unknown action' }

  try {
    const { error } = await getSupabase()
      .from('chat_flags')
      .upsert({ scope: key, phone: digits, ...patch }, { onConflict: 'scope,phone' })
    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return { ok: false, error: 'Chat management is not migrated yet. Apply migration 035.' }
      }
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not update chat' }
  }
}

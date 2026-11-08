/**
 * Chat presentation helpers shared by the portal and admin workspaces.
 *
 * Transcripts arrive from three legacy shapes:
 *   chat_logs.messages : [{ from: 'customer'|'bot', text, at, ... }]
 *   bot_messages       : [{ dir: 'in'|'out', kind, body, created_at }]
 *   chat_sessions.data : the bot's free-form state (location, city, name…)
 *
 * Everything is normalised here so the UI can never render "[object Object]"
 * and rich payloads (business cards, search results, locations, media) get a
 * real preview instead of a JSON dump.
 */

export type ChatDirection = 'in' | 'out' | 'system'

export interface ChatPreview {
  kind: 'business' | 'search' | 'location' | 'call' | 'media'
  title?: string
  subtitle?: string
  href?: string
  phone?: string
  lat?: number
  lng?: number
  imageUrl?: string
  items?: { title: string; subtitle?: string; href?: string }[]
}

export interface ChatMessage {
  id: string
  direction: ChatDirection
  kind: string
  text: string
  at: string | null
  preview?: ChatPreview
}

export interface ChatThread {
  id: string
  phone: string
  name: string
  lastText: string
  lastAt: string | null
  firstAt: string | null
  status: 'active' | 'resolved' | 'archived'
  blocked: boolean
  unread: boolean
  messageCount: number
  foundVia?: string
  businessName?: string
  location?: string
  channel: 'bot' | 'business'
}

export interface ChatDetail {
  thread: ChatThread
  messages: ChatMessage[]
  hasMore: boolean
  nextBefore: string | null
  location: string
  insights: { label: string; value: string }[]
  canReply: boolean
  replyHint: string
  canBlock: boolean
  canClear: boolean
}

const INBOUND = new Set(['customer', 'user', 'in', 'inbound', 'buyer', 'client', 'them', 'contact'])
const OUTBOUND = new Set(['bot', 'out', 'outbound', 'business', 'assistant', 'agent', 'us', 'me', 'owner'])
const SYSTEM = new Set(['system', 'event', 'notice', 'marker'])

function asString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(asString).filter(Boolean).join(', ')
  return ''
}

/** Human-readable rendering of an unknown value — never "[object Object]". */
export function readableValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(readableValue).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of ['text', 'body', 'message', 'content', 'caption', 'title', 'name', 'label', 'value']) {
      const candidate = obj[key]
      if (typeof candidate === 'string' && candidate.trim()) return candidate
    }
    const parts = Object.entries(obj)
      .filter(([, v]) => v != null && typeof v !== 'object')
      .slice(0, 8)
      .map(([k, v]) => `${labelForKey(k)}: ${String(v)}`)
    if (parts.length) return parts.join(' · ')
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return String(value)
}

function labelForKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase())
}

function firstString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function directionOf(raw: Record<string, unknown>): ChatDirection {
  const direct = firstString(raw, ['direction']).toLowerCase()
  if (direct === 'in' || direct === 'out' || direct === 'system') return direct
  const sender = firstString(raw, ['from', 'dir', 'role', 'sender', 'author', 'side', 'type']).toLowerCase()
  if (SYSTEM.has(sender)) return 'system'
  if (INBOUND.has(sender)) return 'in'
  if (OUTBOUND.has(sender)) return 'out'
  // bot_messages uses dir: 'in' | 'out'
  if (raw.dir === 'in') return 'in'
  if (raw.dir === 'out') return 'out'
  if (raw.is_bot === true || raw.bot === true) return 'out'
  return 'in'
}

function timestampOf(raw: Record<string, unknown>): string | null {
  for (const key of ['at', 'created_at', 'timestamp', 'time', 'sent_at', 'date']) {
    const value = raw[key]
    if (typeof value === 'string' && value.trim()) {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const ms = value > 1e12 ? value : value * 1000
      return new Date(ms).toISOString()
    }
  }
  return null
}

function nestedObject(raw: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const value = raw[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
    if (typeof value === 'string' && value.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(value)
        if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
      } catch {
        // not JSON — ignore
      }
    }
  }
  return null
}

function looksLikeBusiness(obj: Record<string, unknown>): boolean {
  return Boolean(
    obj.name &&
      (obj.category || obj.categories || obj.city || obj.area || obj.slug || obj.phone || obj.whatsapp)
  )
}

function businessPreview(obj: Record<string, unknown>): ChatPreview {
  const name = firstString(obj, ['name', 'business_name', 'title', 'label'])
  const category = asString(obj.category || obj.categories)
  const city = firstString(obj, ['city', 'area', 'location', 'address'])
  const phone = firstString(obj, ['phone', 'whatsapp', 'whatsapp_number']).replace(/[^0-9]/g, '')
  const slug = firstString(obj, ['slug', 'username'])
  return {
    kind: 'business',
    title: name || 'Business',
    subtitle: [category, city].filter(Boolean).join(' · ') || undefined,
    phone: phone || undefined,
    href: slug ? `/business/${slug}` : undefined,
    imageUrl: firstString(obj, ['logo_url', 'image', 'image_url']) || undefined,
  }
}

function searchPreview(obj: Record<string, unknown>): ChatPreview | undefined {
  const rawItems = obj.items || obj.results || obj.businesses || obj.list
  if (!Array.isArray(rawItems) || rawItems.length === 0) return undefined
  const items = rawItems.slice(0, 5).map(item => {
    if (typeof item === 'string') return { title: item }
    const row = (item || {}) as Record<string, unknown>
    const title = firstString(row, ['name', 'business_name', 'title', 'label']) || readableValue(item)
    const subtitle = [
      asString(row.category || row.categories),
      firstString(row, ['city', 'area', 'location']),
    ]
      .filter(Boolean)
      .join(' · ')
    const slug = firstString(row, ['slug', 'username'])
    return { title, subtitle: subtitle || undefined, href: slug ? `/business/${slug}` : undefined }
  })
  return {
    kind: 'search',
    title: firstString(obj, ['title', 'term', 'query']) || 'Search results',
    subtitle: asString(obj.city || obj.location) || undefined,
    items,
  }
}

export function normalizeMessage(raw: unknown, index = 0, fallbackPhone = ''): ChatMessage {
  if (typeof raw === 'string') {
    return { id: `m-${index}`, direction: 'in', kind: 'text', text: raw, at: null }
  }
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  let direction = directionOf(obj)
  const kind = firstString(obj, ['kind', 'message_type', 'media_type']).toLowerCase() || 'text'
  const text = readableValue(
    obj.text ?? obj.body ?? obj.message ?? obj.content ?? obj.caption ?? obj.value ?? obj
  )

  const business =
    nestedObject(obj, ['business', 'business_card', 'businessCard', 'vendor', 'listing']) ||
    (looksLikeBusiness(obj) ? obj : null)
  const search = nestedObject(obj, ['search', 'search_results', 'results_preview'])
  const location =
    nestedObject(obj, ['location', 'coordinates', 'place', 'geo']) ||
    (kind === 'location' && (obj.lat || obj.latitude) ? obj : null)
  const call =
    nestedObject(obj, ['call', 'call_action']) ||
    (kind === 'call' && (obj.phone || obj.number) ? obj : null)
  const media =
    nestedObject(obj, ['media', 'image', 'document', 'audio', 'voice']) ||
    (kind === 'image' || kind === 'audio' || kind === 'voice' || kind === 'document' ? obj : null)

  let preview: ChatPreview | undefined
  if (business && (business.name || business.business_name)) {
    preview = businessPreview(business)
  } else if (search) {
    preview = searchPreview(search)
  }
  if (!preview && location) {
    const lat = Number(location.lat ?? location.latitude)
    const lng = Number(location.lng ?? location.longitude ?? location.lon)
    preview = {
      kind: 'location',
      title: firstString(location, ['label', 'name', 'address', 'title']) || 'Shared location',
      subtitle: firstString(location, ['address', 'subtitle']) || undefined,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    }
  }
  if (!preview && call) {
    const phoneDigits = firstString(call, ['phone', 'number', 'to']).replace(/[^0-9]/g, '')
    preview = {
      kind: 'call',
      title: firstString(call, ['label', 'title', 'name']) || 'Call',
      phone: phoneDigits || undefined,
      href: phoneDigits ? `tel:+${phoneDigits}` : undefined,
    }
  }
  if (!preview && media) {
    const url = firstString(media, ['url', 'link', 'src'])
    preview = {
      kind: 'media',
      title: firstString(media, ['caption', 'title', 'name']) || labelForKey(kind || 'attachment'),
      href: url || undefined,
      imageUrl: url || undefined,
    }
  }

  let resolvedText = text
  const isEventMarker = text.includes('opened your chat') || obj.event === true
  if (isEventMarker) {
    direction = 'system'
    resolvedText = text.replace(/^Customer\s+/, 'Customer ')
  }
  if (!resolvedText && preview) resolvedText = preview.title || labelForKey(preview.kind)
  if (!resolvedText) {
    const unknown = Object.keys(obj)
      .filter(k => !['from', 'dir', 'role', 'at', 'created_at', 'id'].includes(k))
      .slice(0, 4)
    resolvedText = unknown.length ? unknown.map(k => labelForKey(k)).join(' · ') : 'Unsupported message'
  }

  const idSource = obj.id
  return {
    id: idSource != null ? String(idSource) : `m-${index}-${fallbackPhone}`,
    direction,
    kind: kind || 'text',
    text: resolvedText,
    at: timestampOf(obj),
    preview,
  }
}

export function normalizeMessages(raw: unknown, fallbackPhone = ''): ChatMessage[] {
  if (!raw) return []
  let list: unknown[] = []
  if (Array.isArray(raw)) list = raw
  else if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>
    const maybe = obj.messages || obj.items || obj.list || obj.transcript
    if (Array.isArray(maybe)) list = maybe
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) list = parsed
    } catch {
      list = [raw]
    }
  }
  return list.map((item, index) => normalizeMessage(item, index, fallbackPhone))
}

/** Merge and de-duplicate messages from more than one transcript source. */
export function mergeMessages(groups: ChatMessage[][]): ChatMessage[] {
  const seen = new Set<string>()
  const merged: ChatMessage[] = []
  for (const group of groups) {
    for (const message of group) {
      const key = `${message.at || ''}|${message.direction}|${message.text}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(message)
    }
  }
  merged.sort((a, b) => {
    const at = a.at ? new Date(a.at).getTime() : 0
    const bt = b.at ? new Date(b.at).getTime() : 0
    return at - bt
  })
  return merged
}

export function formatPhone(raw: string | null | undefined): string {
  const digits = String(raw || '').replace(/[^0-9]/g, '')
  if (!digits) return ''
  if (digits.startsWith('263')) {
    const rest = digits.slice(3).replace(/(\d{3})(?=\d)/g, '$1 ')
    return `+263 ${rest}`.trim()
  }
  if (digits.startsWith('0')) return `+263 ${digits.slice(1).replace(/(\d{3})(?=\d)/g, '$1 ')}`.trim()
  if (digits.startsWith('1') && digits.length === 11) {
    const rest = digits.slice(1).replace(/(\d{3})(?=\d)/g, '$1 ')
    return `+${digits.slice(0, 1)} ${rest}`.trim()
  }
  return `+${digits}`
}

export function phoneDigits(raw: string | null | undefined): string {
  return String(raw || '').replace(/[^0-9]/g, '')
}

export function initials(raw: string | null | undefined): string {
  const digits = phoneDigits(raw)
  return digits ? digits.slice(-2) : 'WA'
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return 'now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export function formatFullDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function escapeCsv(value: unknown): string {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

/** Replace phone numbers and emails so harvested examples carry no PII. */
export function redactPersonalData(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, candidate => {
      const digits = candidate.replace(/[^0-9]/g, '')
      return digits.length >= 9 ? '[phone]' : candidate
    })
}

export function intentOf(text: string): string {
  const lower = (text || '').toLowerCase()
  if (/\b(price|cost|how much|charges?|fee|rate)\b/.test(lower)) return 'Pricing'
  if (/\b(where|location|address|directions|map|near)\b/.test(lower)) return 'Location'
  if (/\b(open|hours|close|available|availability|when)\b/.test(lower)) return 'Availability'
  if (/\b(deliver|delivery|ship|drop)\b/.test(lower)) return 'Delivery'
  if (/\b(book|booking|appointment|order|reserve)\b/.test(lower)) return 'Booking / order'
  if (/\b(contact|phone|call|whatsapp|reach)\b/.test(lower)) return 'Contact'
  if (/\b(repair|fix|service|install)\b/.test(lower)) return 'Service request'
  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lower)) return 'Greeting'
  if (/\?$/.test(lower.trim())) return 'Question'
  return 'Other'
}

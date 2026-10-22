import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import {
  sendWhatsAppMessage as sendWhatsAppText,
  sendInteractiveList as sendInteractiveListRaw,
  sendInteractiveButtons as sendInteractiveButtonsRaw,
  sendCtaUrl as sendCtaUrlRaw,
  sendLocationRequest as sendLocationRequestRaw,
  sendReaction as sendReactionRaw,
  sendContactCard,
  markRead,
} from '@/lib/whatsapp'
import type { InteractiveRow, InteractiveButton } from '@/lib/whatsapp'
import { logBotMessage, logBotSearch } from '@/lib/bot-log'
import { orderSearchResults } from '@/lib/ranking'
import { expandSearchQuery } from '@/lib/gemini'
import type { Business } from '@/types'
import { getSession, saveSession, clearSession, type ChatSession, type ChatSessionData } from '@/lib/chat-session'
import { getSupabase } from '@/lib/supabase-server'
import { upsertBotContact, markBotContactOptOut, setBotContactOptIn, sweepIdleNudges, getBotContactName } from '@/lib/bot-contacts'
import { getBotSetting, setBotSetting } from '@/lib/bot-settings'
import { createListing } from '@/lib/listing-create'
import { uploadLogoImage } from '@/lib/image-storage'
import { fetchWhatsAppMedia, perceiveMedia, mediaRateOk, type MediaKind } from '@/lib/bot-sense'
import {
  parseListingMessage,
  renderListingForm,
  renderMissingRequiredList,
  missingRequired,
  findListingCity,
  LIST_INTRO,
  type ListingFormState,
} from '@/lib/listing-intake'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import { validatePhone } from '@/data/countries'
import { getApprovedCategories, getApprovedAreas, matchCategoryAgainst } from '@/lib/approved-data'
import { searchPayBusinesses, type PayBusiness } from '@/lib/pay-lookup'
import { createListingPayment, paymentAmountFor } from '@/lib/listing-pay'
import { normalizeEcoCashPhone } from '@/lib/paynow'
import { PLAN_CONFIG } from '@/types'
import type { PlanType } from '@/types'
import { SITE_URL } from '@/lib/site-url'
import { digitsOnly } from '@/lib/phone'
import {
  CHAT_OPEN_MARKER,
  renderResultsListBody,
  renderNearbyListBody,
  renderNearMeListBody,
  resultRows,
  RESULTS_PER_PAGE,
  renderMainMenuBody,
  renderWelcomeInstructions,
  renderGreetingBody,
  renderDetailCard,
  renderChatPrompt,
  chatCtaUrl,
  renderEmptyResults,
  renderInvalidSelection,
  renderErrorCard,
  FALLBACK_HELP_LINES,
  renderNeedIntro,
  renderNeedConfirm,
  renderNeedPosted,
  renderQuoteCard,
  renderNeedSilence,
  renderNeedClosedByBuyer,
  renderNeedFilled,
  renderDealAsk,
  renderCeremony,
  type ResultCard,
} from '@/lib/bot-templates'
import {
  addNeedQuote,
  adminWeeklyStats,
  bumpDigestCursor,
  canonicalRq,
  closeNeedByRqId,
  channelPostFor,
  compileDigest,
  createNeed,
  fmtHarare,
  getDigestCursor,
  getNeedById,
  getNeedByRqId,
  getQuoteById,
  listNeedQuotes,
  listOpenNeeds,
  parseDigestWindow,
  prioritySwitchState,
  reopenNeed,
  setPrioritySwitch,
} from '@/lib/needs'

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN
// Verify Meta's X-Hub-Signature-256 over the raw request body. Fail closed:
// if WHATSAPP_APP_SECRET is unset, no inbound payload can be authenticated, so
// forged messages (toll fraud, fake listings, fake ratings) are rejected.
function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) return false
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const provided = Buffer.from(signatureHeader.slice(7), 'hex')
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest()
  if (provided.length !== expected.length) return false
  return crypto.timingSafeEqual(provided, expected)
}
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP
const COUNTRY_CODE = '+263'

const STOPWORDS = new Set([
  'i', 'am', 'im', 'looking', 'for', 'a', 'an', 'the', 'find', 'in', 'at', 'near',
  'me', 'please', 'help', 'need', 'want', 'to', 'and', 'or', 'is', 'are', 'with',
  'some', 'get', 'any', 'have', 'just', 'like', 'of', 'on', 'my', 'your',
])

const HELP_TEXT = FALLBACK_HELP_LINES(SITE_URL).join('\n')

// ── Admin settings (S16.1) ────────────────────────────────────────────────
// Channel link: bot_settings override, env (CHANNEL_LINK) fallback.
async function channelLine(): Promise<string> {
  const override = await getBotSetting('channel_link')
  const link = (override || process.env.CHANNEL_LINK || '').trim()
  return link ? `📲 Live buys & deals: ${link}` : ''
}

async function helpText(): Promise<string> {
  const ch = await channelLine()
  return ch ? `${HELP_TEXT}\n\n${ch}` : HELP_TEXT
}

// Extra admin numbers live in bot_settings.admin_allowlist (JSON array).
// The env ADMIN_WHATSAPP number is always the undeletable owner.
async function adminNumbers(): Promise<string[]> {
  const root = digitsOnly(ADMIN_WHATSAPP || '')
  const raw = await getBotSetting('admin_allowlist')
  let extras: string[] = []
  try {
    const parsed = JSON.parse(raw || '[]')
    if (Array.isArray(parsed)) extras = parsed.map(x => digitsOnly(String(x))).filter(Boolean)
  } catch {
    extras = []
  }
  return [...new Set([root, ...extras].filter(Boolean))]
}

async function isBotAdmin(from: string): Promise<boolean> {
  return (await adminNumbers()).includes(digitsOnly(from))
}

function fmtAdminNumber(n: string): string {
  return `+${n}`
}

interface PendingBusiness {
  id: string
  name: string
  phone: string | null
  city: string | null
  created_at: string
}

async function listUnverifiedBusinesses(limit = 10): Promise<PendingBusiness[]> {
  try {
    const { data } = await getSupabase()
      .from('businesses')
      .select('id, name, phone, city, created_at')
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data as PendingBusiness[]) || []
  } catch {
    return []
  }
}

// ── Transcript-logging send wrappers (S16) ────────────────────────────────
// Every bot send goes through one replay: the raw Cloud API call plus a
// fire-and-forget transcript row in bot_messages. Call sites keep the old
// names, so logging covers every flow without touching them.
function logOut(to: string, kind: string, body: string) {
  logBotMessage(to, 'out', kind, body).catch(() => {})
}

async function sendWhatsAppMessage(to: string, message: string, replyTo?: string) {
  logOut(to, 'text', message)
  return sendWhatsAppText(to, message, replyTo)
}

async function sendInteractiveList(
  to: string,
  body: string,
  rows: InteractiveRow[],
  buttonLabel = 'Choose a business',
  replyTo?: string
) {
  logOut(to, 'list', `${body}\n↳ rows: ${rows.map(r => r.title).join(' | ')}`)
  return sendInteractiveListRaw(to, body, rows, buttonLabel, replyTo)
}

async function sendInteractiveButtons(
  to: string,
  body: string,
  buttons: InteractiveButton[],
  replyTo?: string
) {
  logOut(to, 'buttons', `${body}\n[${buttons.map(b => b.title).join(' | ')}]`)
  return sendInteractiveButtonsRaw(to, body, buttons, replyTo)
}

async function sendCtaUrl(to: string, body: string, displayText: string, url: string) {
  logOut(to, 'cta', `${body}\n→ ${url}`)
  return sendCtaUrlRaw(to, body, displayText, url)
}

async function sendLocationRequest(to: string, body: string) {
  logOut(to, 'location_req', body)
  return sendLocationRequestRaw(to, body)
}

async function sendReaction(to: string, messageId: string, emoji: string) {
  logOut(to, 'reaction', `[${emoji}] on ${messageId}`)
  return sendReactionRaw(to, messageId, emoji)
}

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50) || 'business'
  )
}

function findCity(text: string): string | null {
  const lower = text.toLowerCase()
  for (const c of zimbabweCities) {
    if (lower.includes(c.name.toLowerCase())) return c.name
  }
  return null
}

function findArea(city: string, text: string): string | null {
  const cityObj = zimbabweCities.find(c => c.name === city)
  if (!cityObj) return null
  const lower = text.toLowerCase()
  for (const a of cityObj.areas) {
    if (lower.includes(a.toLowerCase())) return a
  }
  return null
}

// ── Product / location search helpers ────────────────────────────────────

interface BotBusinessRow {
  id: string
  name: string
  slug: string | null
  category: string[] | null
  city: string | null
  area: string | null
  price_range: string | null
  rating: number
  review_count: number | null
  phone: string | null
  phone_type: string | null
  lat: number | null
  lng: number | null
  socials?: string[] | null
}

const BOT_BIZ_COLUMNS =
  'id, name, slug, category, city, area, price_range, rating, review_count, phone, phone_type, lat, lng, socials'

interface ParsedQuery {
  term: string
  city: string | null
  nationwide: boolean
  // Optional "Near me" origin — when set, candidate ordering switches to
  // distance (km) from this point instead of the city ranking.
  origin?: { lat: number; lng: number } | null
}

const NATIONWIDE_RE =
  /(whole country|country ?wide|nation ?wide|everywhere|anywhere|all (of )?(the )?(cities|towns)|across zimbabwe|all over zimbabwe|\bzimbabwe\b)/i

function parseQuery(text: string): ParsedQuery {
  const nationwide = NATIONWIDE_RE.test(text)
  const city = findCity(text)
  let t = text.toLowerCase()
  if (nationwide) t = t.replace(NATIONWIDE_RE, ' ')
  if (city) t = t.replace(new RegExp(city.toLowerCase(), 'g'), ' ')
  const words = t.split(/[^a-z0-9]+/).filter(w => w.length > 1 && !STOPWORDS.has(w))
  return { term: words.join(' '), city, nationwide }
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

async function recordBotEvents(businesses: { id: string }[]) {
  try {
    const rows = businesses.map(b => ({
      business_id: b.id,
      type: 'bot_search' as const,
      category: '',
      city: '',
    }))
    await getSupabase().from('stats_events').insert(rows)
  } catch {
    // fire-and-forget
  }
}

async function appendTranscript(from: string, text: string, fromBot = false) {
  try {
    const supabase = getSupabase()
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    const { data: logs } = await supabase
      .from('chat_logs')
      .select('id, business_id, messages')
      .eq('customer_phone', from)
      .gte('updated_at', cutoff)
      .order('updated_at', { ascending: false })
      .limit(5)

    const row = (logs || []).find(l => {
      const arr = Array.isArray(l.messages) ? l.messages : []
      const last = arr.length ? arr[arr.length - 1] : null
      return last && typeof last === 'object' && (last as any).from === 'bot' && String((last as any).text || '').includes(CHAT_OPEN_MARKER)
    })

    if (!row) return

    const messages = Array.isArray(row.messages) ? row.messages : []
    messages.push({ from: fromBot ? 'bot' : 'customer', text, at: new Date().toISOString() })
    await supabase
      .from('chat_logs')
      .update({ messages, updated_at: new Date().toISOString() })
      .eq('id', row.id)
  } catch {
    // best-effort transcript
  }
}

async function refreshBusinessRating(businessId: string) {
  try {
    const supabase = getSupabase()
    const { data: ratings } = await supabase
      .from('ratings')
      .select('rating')
      .eq('business_id', businessId)
    const list = ratings || []
    if (list.length === 0) return
    const avg = list.reduce((a, r) => a + Number(r.rating), 0) / list.length
    await supabase
      .from('businesses')
      .update({ rating: Math.round(avg * 10) / 10, review_count: list.length })
      .eq('id', businessId)
  } catch {
    // best-effort
  }
}

async function handleRatingReply(from: string, session: ChatSession | null, text: string): Promise<boolean> {
  const pendingBusinessId = session?.data?.rating_pending
  if (!pendingBusinessId) return false

  const supabase = getSupabase()
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', pendingBusinessId)
    .maybeSingle()

  if (!business) return false

  const lower = text.toLowerCase()
  if (/^(skip|no|pass|nope)/.test(lower)) {
    await saveSession(from, 'done', {})
    await sendWhatsAppMessage(from, `No problem! Thanks for trying *${business.name}*. Reply *help* anytime.`)
    return true
  }

  // Search-first everywhere: a mid-rating reply that reads as a search exits
  // the rating step and runs the search instead of nagging.
  const parsed = parseQuery(text)
  if (parsed.term || parsed.city || parsed.nationwide) {
    await clearSession(from)
    await dispatchSearch(from, text)
    return true
  }

  const match = text.trim().match(/^([1-5])\b[\s\S]*/)
  if (!match) {
    await sendWhatsAppMessage(
      from,
      `How was your experience with *${business.name}*? Reply a number 1 to 5 (1 = poor, 5 = excellent), or *skip*.`
    )
    return true
  }

  const rating = Number(match[1])
  const comment = text.trim().slice(match[0].length).trim().replace(/^[-–—:.]\s*/, '')

  // Portal review display gets richer when we know the customer's name
  // (captured from their WhatsApp profile during conversations).
  const { data: contact } = await supabase
    .from('bot_contacts')
    .select('name')
    .eq('phone', from)
    .maybeSingle()

  await supabase.from('ratings').insert({
    business_id: business.id,
    customer_phone: from,
    name: (contact?.name || '').slice(0, 120),
    rating,
    comment: comment.slice(0, 500),
  })
  await refreshBusinessRating(business.id)
  await saveSession(from, 'done', {})

  await sendWhatsAppMessage(
    from,
    [
      `🙏 *Thank you!* You rated *${business.name}* ${rating}/5.`,
      comment ? `Your comment: "${comment}"` : '',
      '',
      'Your review helps other customers. Reply *help* anytime.',
    ].filter(Boolean).join('\n')
  )
  return true
}

async function promptRatingIfDue(from: string): Promise<ChatSession | null> {
  try {
    const supabase = getSupabase()
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    const { data: logs } = await supabase
      .from('chat_logs')
      .select('business_id, messages')
      .eq('customer_phone', from)
      .gte('updated_at', cutoff)
      .order('updated_at', { ascending: false })
      .limit(3)

    const opened = (logs || []).find(l => {
      const arr = Array.isArray(l.messages) ? l.messages : []
      const last = arr.length ? arr[arr.length - 1] : null
      return last && typeof last === 'object' && (last as any).from === 'bot' && String((last as any).text || '').includes(CHAT_OPEN_MARKER)
    })

    if (!opened?.business_id) return null

    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('business_id', opened.business_id)
      .eq('customer_phone', from)
      .gte('created_at', cutoff)
      .maybeSingle()

    if (existingRating) return null

    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', opened.business_id)
      .maybeSingle()
    if (!business) return null

    const session = await getSession(from)
    if (session?.step === 'rating') return session

    await saveSession(from, 'rating', { rating_pending: opened.business_id })
    await sendWhatsAppMessage(
      from,
      [
        `Did you just chat with *${business.name}*?`,
        '',
        `Rate your experience 1 to 5 (1 = poor, 5 = excellent), add a short comment if you like, or reply *skip*.`,
      ].join('\n')
    )
    return { phone: from, step: 'rating', data: { rating_pending: opened.business_id } }
  } catch {
    return null
  }
}

async function sendAskTown(from: string, term: string, again = false, withLocation = false) {
  let msg = ''
  if (!again && term) {
    msg = `*${term}* 👍 Which town are you in?\n\n`
  } else {
    msg = `Which town are you in?\n\n`
  }
  const cities = zimbabweCities.slice(0, 8).map(c => c.name).join(', ')
  msg += `e.g. ${cities}…\n\nReply *whole country* to search everywhere.`
  if (msg.length <= 1020) {
    await sendInteractiveButtons(from, msg, [
      { id: 'whole_country', title: '🌍 Whole country' },
      { id: 'cancel', title: '✖ Cancel' },
    ])
  } else {
    await sendWhatsAppMessage(from, msg)
  }
  // Fast path: sharing the live location ranks matches by real km.
  if (withLocation) {
    await sendLocationRequest(
      from,
      term
        ? `Better: share your location once and I'll rank *${term}* by how close it is to you. 📍`
        : 'Better: share your location once and I will rank matches by how close they are to you. 📍'
    )
  }
}

async function sendAskTerm(from: string, city: string | null) {
  let msg: string
  if (city) {
    msg = `What do you need in *${city}*?\n\n(e.g. plumber, bread, salon…)`
  } else {
    msg = 'What product or service are you looking for? (e.g. plumber, bread, salon…)'
  }
  if (msg.length <= 1020) {
    await sendInteractiveButtons(from, msg, [
      { id: 'whole_country', title: '🌍 Whole country' },
      { id: 'cancel', title: '✖ Cancel' },
    ])
  } else {
    await sendWhatsAppMessage(from, msg)
  }
}

function bizMatchesQuery(
  b: BotBusinessRow,
  lowerTerm: string,
  category: string
): boolean {
  const catHit = category !== 'Other' && (b.category || []).includes(category)
  const nameHit = lowerTerm.length >= 3 && (b.name || '').toLowerCase().includes(lowerTerm)
  return catHit || nameHit
}

interface BotResult {
  biz: BotBusinessRow
  item: { name: string; price: number | null } | null
  km?: number
}

// Cheapest matching item per business (the product tier). Priced items win
// ordering; a business that only lists an unpriced match stays visible via
// the "Price not listed" card instead of vanishing from results.
async function fetchMatchingItems(
  bizIds: string[],
  term: string
): Promise<Map<string, { name: string; price: number | null }>> {
  const out = new Map<string, { name: string; price: number | null }>()
  if (bizIds.length === 0 || term.length < 3) return out
  const { data } = await getSupabase()
    .from('business_items')
    .select('business_id, name, price')
    .in('business_id', bizIds)
    .eq('is_active', true)
    .ilike('name', `%${term}%`)
    .order('price', { ascending: true })
    .limit(200)
  for (const it of (data as { business_id: string; name: string; price: number | null }[]) || []) {
    const cur = out.get(it.business_id)
    if (it.price != null) {
      if (!cur || cur.price == null || it.price < cur.price) {
        out.set(it.business_id, { name: it.name, price: it.price })
      }
    } else if (!cur) {
      out.set(it.business_id, { name: it.name, price: null })
    }
  }
  return out
}

// Search-tier result → template card (pruned to what presentation needs).
function toCard(r: BotResult): ResultCard {
  return {
    id: r.biz.id,
    name: r.biz.name,
    city: r.biz.city,
    area: r.biz.area,
    km: r.km ?? null,
    item: r.item,
    priceRange: r.biz.price_range,
  }
}

// Search message rendering moved to lib/bot-templates.ts (Stage 2). The
// toCard mapper above adapts tier results to the template's pruned shape.

// ── Interactive routing helpers ───────────────────────────────────────────
// Deterministic ids only: anything unknown falls back to a friendly prompt
// with the session preserved, so a stale or forged payload cannot trap
// users in a dead end.

async function startFreshSearchPrompt(from: string) {
  await clearSession(from)
  await sendWhatsAppMessage(
    from,
    'Tell me what you need + your town, e.g. *"bread chinhoyi"* or *"plumber harare"*.'
  )
}

// Main menu: search is NOT a menu row — typing is searching, so the menu
// only carries account features. Titles cap at 24 chars (WhatsApp limit);
// the pricing hook lives in the row description.
const MENU_ROWS = [
  { id: 'menu_needs', title: '🛒 Post a need', description: 'Suppliers quote you here' },
  { id: 'menu_register', title: '✎ Register', description: 'Business $1/mo · Personal 20c' },
  { id: 'menu_pay', title: '$ Pay (EcoCash)', description: 'Pay or top up via EcoCash' },
  { id: 'menu_help', title: '✆ Help', description: 'Tips & support' },
]

async function sendMainMenu(from: string) {
  await clearSession(from)
  const ch = await channelLine()
  await sendInteractiveList(
    from,
    [renderMainMenuBody(), ch].filter(Boolean).join('\n\n'),
    MENU_ROWS,
    'Main menu'
  )
}

async function startRegister(from: string, initialText: string = '') {
  const { state } = parseListingMessage(initialText, from)
  await saveSession(from, 'list_form', { list: state } as ChatSessionData)
  await sendFormUpdate(from, state, LIST_INTRO())
}

// ✎ Register opens with the honest price list, then routes to the flow that
// matches what the user is adding: a business subscription or paid personal
// contacts — never both silently merged.
async function sendRegisterChoice(from: string) {
  await clearSession(from)
  await sendInteractiveButtons(
    from,
    [
      '✎ *Registering on WA Directory*',
      '',
      '• Business subscription — USD 1 per month',
      '• Personal contact — USD 0.20 each, per month',
      '',
      'Which are you adding?',
    ].join('\n'),
    [
      { id: 'reg_personal', title: 'Personal contact $0.20' },
      { id: 'reg_business', title: '• Business $1/mo' },
      { id: 'cancel', title: '✖ Cancel' },
    ]
  )
}

// Personal contact intake: the whole draft is ONE message —
// "Tendai Ncube 0771 234 567 Harare IG @tendai tiktok.com/@tendai". Deliberately
// simpler than the business form: name, phone, optional city, up to 3 socials.
const CONTACT_PHONE_RE = /(?:\+?263|0)\s?7[\d\s.\-]{8,11}(?!\d)/
// Social links: instagram/facebook/tiktok/linkedin/twitter URLs and bare
// @handles ("@tendai" / "ig @tendai" / "instagram.com/tendai").
const SOCIAL_HINT_RE = /(?:^|\s)(?:ig|insta(?:gram)?|facebook|fb|tiktok|tt|linked(?:in)?|in|twitter|x|snap(?:chat)?|whatsapp|wa|socials?)(?:\s*[:@\/])?\s*/gi

interface ContactDraft {
  name: string
  phone: string
  city: string | null
  socials?: string[]
}

function extractSocials(text: string): { socials: string[]; stripped: string } {
  const socials: string[] = []
  // Pull explicit platform-prefixed tokens first: "IG @tendai", "fb tendai.ncube",
  // "tiktok: @t.n" — separator can be @ : / or just a space.
  let working = text
  const prefixTokens = /(?:ig|insta(?:gram)?|instagram\.com|facebook|fb(?:\.com|\.me)?|tiktok|linkedin(?:\.com)?|twitter|x\.com|snap(?:chat)?)\s*(?:[:@/]\s*|(?=[a-zA-Z0-9._]))\s*(@?[a-zA-Z][a-zA-Z0-9._]{2,39})/gi
  let pm: RegExpExecArray | null
  while ((pm = prefixTokens.exec(text)) !== null && socials.length < 3) {
    const handle = pm[1]
    if (handle && !socials.includes(handle)) socials.push(handle)
  }
  working = text.replace(prefixTokens, ' ')
  working = working.replace(SOCIAL_HINT_RE, (s) => (s.trim() ? ' ' : ' '))
  // Bare @handles (min 3 chars, no spaces) anywhere left in the text.
  const atHandles = working.match(/@[a-zA-Z][a-zA-Z0-9._]{2,39}/g) || []
  for (const h of atHandles) {
    if (socials.length >= 3) break
    if (!socials.includes(h)) socials.push(h)
    working = working.replace(h, ' ')
  }
  // Bare URLs (any domain) — someone pasting insta.me/x/... links.
  const urls = working.match(/(?:https?:\/\/|www\.)[^\s]+/gi) || []
  for (const u of urls) {
    if (socials.length >= 3) break
    if (!socials.includes(u)) socials.push(u)
    working = working.replace(u, ' ')
  }
  return { socials, stripped: working.replace(/\s{2,}/g, ' ').trim() }
}

function parseContactLine(text: string): ContactDraft | null {
  const m = text.trim().match(CONTACT_PHONE_RE)
  if (!m || m.index == null) return null
  const phoneDigits = m[0].replace(/[^0-9]/g, '')
  const before = text.slice(0, m.index).trim()
  const after = text.slice(m.index + m[0].length).trim()

  // Socials may appear before or after the phone; lint them out of both
  // halves before deciding what the name should be.
  const pre = extractSocials(before)
  const post = extractSocials(after)
  const socials = [...pre.socials, ...post.socials].filter(Boolean).slice(0, 3)
  const nameSource = post.stripped.length >= 2 ? post.stripped : pre.stripped
  const otherSide = nameSource === pre.stripped ? post.stripped : pre.stripped

  const cityRaw = findListingCity(nameSource) || findListingCity(otherSide)
  let name = nameSource
  if (cityRaw) name = name.replace(new RegExp(cityRaw, 'i'), '').replace(/\s{2,}/g, ' ').trim()
  if (!name || name.length < 2) name = otherSide
  name = name.replace(/^(?:the\s+)?(?:contact\s+)?(?:name\s+)?(?:is\s+:?\s*)?/i, '').replace(/[,:;]+$/, '').trim()
  if (!name || name.length < 2 || /\d/.test(name)) return null
  return {
    name: name.slice(0, 80),
    phone: phoneDigits,
    city: cityRaw,
    socials: socials.length ? socials : undefined,
  }
}

// Publish the personal contact: shared listing engine (verified:false +
// pending) and the payment engine with the personal pricing override. The
// EcoCash PIN confirmation path flips verified + active with no admin step.
async function tryPublishContact(
  from: string,
  session: ChatSession,
  msgId?: string,
  plan: '1m' | '12m' = '1m',
  amount = 0.2
) {
  const c = session.data.contact!
  const rawName = c.name
  const rawPhone = c.phone.replace(/[^0-9]/g, '')
  const phone = rawPhone.startsWith('263') ? rawPhone.slice(3) : rawPhone
  const fullListedPhone = `+263${phone}`
  // payer_phone exists in two stored formats (263… from the bot flow, 0…
  // from web /api/pay) — match either.
  const payerDigits = digitsOnly(from)
  const payerZero = payerDigits.replace(/^263/, '0')

  // Guard 1 — cap: max 3 ACTIVE personal contacts per payer phone, so a
  // business can't dodge the USD 1 subscription by batch-buying 20c rows.
  const { data: payerSubs } = await getSupabase()
    .from('listing_subscriptions')
    .select('business_id, businesses!inner(category)')
    .or(`payer_phone.eq.${payerDigits},payer_phone.eq.${payerZero}`)
    .eq('status', 'active')
  const personalIds = (payerSubs || [])
    .map((s: unknown) => s as { business_id?: string; businesses?: { category?: unknown } | null })
    .filter((s): s is { business_id: string; businesses?: { category?: unknown } } =>
      Array.isArray(s.businesses?.category) && (s.businesses!.category as string[]).includes('Personal Contact'))
    .map((s) => s.business_id)
  if (personalIds.length >= 3) {
    await sendWhatsAppMessage(
      from,
      [
        'You already have 3 active personal contacts 📱',
        '',
        'That is the limit per person. If you are registering a business,',
        'tap ✎ Register and choose *Business* — USD 1 per month, no cap.',
      ].join('\n')
    )
    await clearSession(from)
    return
  }

  // Guard 2 — existing business: the listed phone belonging to a business
  // listing means personal is the wrong (discounted) product. phones are
  // stored both as 263… and +263… depending on the route in.
  const listedDigits = rawPhone.replace(/^263/, '').replace(/^0/, '')
  const { data: bizRows } = await getSupabase()
    .from('businesses')
    .select('id, name, category')
    .in('phone', [`+263${listedDigits}`, `263${listedDigits}`])
    .neq('payment_status', 'expired')
  const bizBlock = (bizRows || ([]) as { name?: string; category?: unknown }[]).find(
    (b) => Array.isArray(b.category) && !b.category.includes('Personal Contact')
  )
  if (
    bizBlock &&
    bizBlock.name
  ) {
    await sendWhatsAppMessage(
      from,
      [
        `*+263${listedDigits}* is already registered as a business listing`,
        `(*${bizBlock.name}*) — personal contacts are for people, not companies.`,
        '',
        'If that is you: renew it for USD 1/month (send *pay*), or register a',
        'different number for the personal contact.',
      ].join('\n')
    )
    await clearSession(from)
    return
  }

  const result = await createListing({
    name: rawName,
    countryCode: COUNTRY_CODE,
    phone,
    categories: ['Personal Contact'],
    city: c.city || undefined,
    phoneType: 'whatsapp',
    socials: c.socials,
    generateSite: false,
    notify: false,
  })
  if ('error' in result) {
    console.error('[webhook] personal contact insert failed:', result.error)
    await sendWhatsAppMessage(from, 'Sorry, something went wrong saving that contact. Please send the name + phone again.')
    await saveSession(from, 'reg_contact', { contact: c })
    return
  }

  if (msgId) await sendReaction(from, msgId, '✅').catch(() => {})

  const pay = await createListingPayment({
    businessId: result.businessId,
    payerPhone: from,
    plan,
    amountOverride: amount,
  })
  if (!pay.ok) {
    // The listing exists but payment couldn't start — the admin fallback in
    // the subscription engine still alerts, so tell the user it's queued.
    await sendWhatsAppMessage(
      from,
      [
        `✅ *${result.name}* — Personal contact was saved.`,
        '',
        `The USD ${amount.toFixed(2)} payment could not start right now. Our team will confirm it and your contact will go live.`,
      ].join('\n')
    )
    await clearSession(from)
    return
  }
  await sendWhatsAppMessage(
    from,
    [
      `✅ *${result.name}* — Personal contact`,
      '',
      `💸 USD ${amount.toFixed(2)}${plan === '12m' ? ' · 12 months' : ' · 1 month'} · EcoCash`,
      pay.autoEcoCash
        ? pay.message
        : pay.message + ' (goes live once confirmed — usually within minutes).',
      '',
      'Save your edit link:',
      `${SITE_URL}/edit?token=${result.editToken}`,
      '',
      'Reply *help* anytime.',
    ].join('\n')
  )
  await clearSession(from)
}

// The living form: renders the current fill state; the interactive row below
// it carries Publish / Cancel (Publish's gating lives in the tap handler).
async function sendFormUpdate(from: string, state: ListingFormState, tailNote?: string) {
  const body = [renderListingForm(state, from)]
  if (tailNote) body.push('', tailNote)
  const text = body.filter(Boolean).join('\n')
  if (text.length <= 1020) {
    await sendInteractiveButtons(from, text, [
      { id: 'list_publish', title: '↗ Publish' },
      { id: 'list_cancel', title: '✖ Cancel' },
    ])
  } else {
    await sendWhatsAppMessage(from, text)
  }
}

// Tap on ↗ Publish: the webapp's mandatory set (name + approved category +
// valid phone) gates submission; anything missing is listed for the user.
async function tryPublishForm(from: string, session: ChatSession, msgId?: string) {
  const state = session.data.list || {}
  const missing = missingRequired(state)
  if (missing.length > 0) {
    await sendWhatsAppMessage(from, renderMissingRequiredList(state))
    await sendFormUpdate(from, state)
    return
  }
  // Lift the flat form state into the registration shape publishBusiness
  // already consumes (written through the shared listing engine).
  const merged: ChatSessionData = {
    ...session.data,
    name: state.name,
    categories: state.categories,
    category: state.categories?.[0],
    city: state.whole_country ? '' : state.city,
    whole_country: state.whole_country === true,
    area: state.area,
    phone: state.phone,
    phone_type: state.phone_type,
    price_range: state.price_range,
    website: state.website,
    address: state.address,
    whatsapp_username: state.username,
    description: state.description,
  }
  await publishBusiness(from, { phone: from, step: 'confirm', data: merged }, msgId)
  await clearSession(from)
}

async function handleListFormText(from: string, session: ChatSession, text: string) {
  const before = session.data.list || {}
  const beforeMissing = missingRequired(before).length
  const { state } = parseListingMessage(text, from, before)
  await saveSession(from, 'list_form', { list: state } as ChatSessionData)
  const missing = missingRequired(state)
  const filledAny =
    missing.length < beforeMissing ||
    ['name', 'categories', 'city', 'area', 'phone', 'price_range', 'website', 'address', 'description', 'username']
      .some(k => JSON.stringify((state as Record<string, unknown>)[k]) !== JSON.stringify((before as Record<string, unknown>)[k]))
  const tail = !filledAny
    ? "I couldn't match that to a field yet — send e.g. *name …*, *city …*, *phone …*, or a description."
    : missing.length === 0
      ? 'All mandatory fields are set — tap ↗ Publish to submit.'
      : `${missing.length} mandatory field${missing.length > 1 ? 's' : ''} still missing: ${missing.join(', ')}.`
  await sendFormUpdate(from, state, tail)
}

// ── Bot perception: voice notes and photos ────────────────────────────────
// Media becomes intent: a search outside registration, or form fields/logo
// while the user is mid-registration. Every failure answers with a text
// fallback so nothing silently dies.

async function handleBotMedia(
  from: string,
  session: ChatSession | null,
  message: Record<string, unknown>,
  mediaMsgId: string
) {
  const kind: MediaKind = message.type === 'audio' ? 'audio' : 'image'
  const blob = message[kind] as { id?: string; caption?: string } | undefined
  const mediaId = blob?.id || ''
  const caption = typeof blob?.caption === 'string' ? blob.caption : ''

  if (!mediaRateOk(from)) {
    await sendWhatsAppMessage(
      from,
      'You can send at most 3 voice or photo tries per hour to keep things quick. Send it as text and I keep working.',
      mediaMsgId
    )
    return
  }

  // Slow segment ahead (download + AI): light the composing indicator.
  void markRead(mediaMsgId, true).catch(() => {})
  const media = await fetchWhatsAppMedia(mediaId)
  const sense = media ? await perceiveMedia(kind, media.buffer, media.mime, caption) : null

  if (!sense || !sense.term) {
    if (session?.step === 'list_form' && kind === 'image') {
      await sendWhatsAppMessage(
        from,
        "I couldn't read that photo. Keep typing — *name …*, *category …*, *description …* — or tap ↗ Publish when ready.",
        mediaMsgId
      )
      return
    }
    await sendWhatsAppMessage(
      from,
      kind === 'audio'
        ? "I couldn't hear that clearly. Send it as text and I'll search instantly."
        : "I couldn't recognise that photo. Describe it in text and I'll search instantly.",
      mediaMsgId
    )
    return
  }

  if (session?.step === 'list_form') {
    await handleListFormMedia(from, session, kind, sense, media!.buffer)
    return
  }

  // Voice note while drafting a need: the transcript fills the draft.
  if (session?.step === 'need_form' && kind === 'audio') {
    await handleNeedFormText(from, session, sense.transcript || sense.term || '')
    return
  }

  // Search-first: voice notes transcribed, photos recognised, then a search.
  const query = [sense.term, sense.city].filter(Boolean).join(' ')
  const echo =
    kind === 'audio'
      ? `You said: *${query}* — searching…`
      : `That photo looks like: *${query}* — searching…`
  await sendWhatsAppMessage(from, echo, mediaMsgId)
  await dispatchSearch(from, query, { replyTo: mediaMsgId })
}

// Shared location ("📍 Near me" prompt or the phone's location picker).
// With a pending search term the nearby search runs immediately; otherwise
// the point is stashed on the session and the bot asks what they need.
async function handleBotLocation(
  from: string,
  session: ChatSession | null,
  origin: { lat: number; lng: number },
  mediaMsgId: string
) {
  if (session?.step === 'search_loc' && session.data.pending_search_term) {
    const term = session.data.pending_search_term
    await clearSession(from)
    await sendWhatsAppMessage(from, `📍 Got it — searching *${term}* near you…`, mediaMsgId)
    await runSearchAndReply(
      from,
      { term, city: null, nationwide: false, origin },
      { replyTo: mediaMsgId }
    )
    return
  }

  await saveSession(from, 'search_term', {
    pending_city: '',
    origin_lat: origin.lat,
    origin_lng: origin.lng,
  })
  await sendWhatsAppMessage(
    from,
    '📍 Got it. What are you looking for nearby? Send e.g. *plumber* or *bread*.',
    mediaMsgId
  )
}

// Media while filling the listing form: voice notes flow through the same
// paragraph parser as text; photos contribute category + description and
// queue themselves as the listing logo (uploads at publish).
async function handleListFormMedia(
  from: string,
  session: ChatSession,
  kind: MediaKind,
  sense: { transcript?: string; term?: string; city?: string; category?: string; description?: string },
  buffer: Buffer
) {
  const before = session.data.list || {}

  if (kind === 'audio') {
    const transcript = sense.transcript || [sense.term, sense.city].filter(Boolean).join(' ')
    await handleListFormText(from, session, transcript)
    return
  }

  // Photo: description + (matched) category fill the form; bytes off to storage.
  const state: ListingFormState = { ...before }
  const changed: string[] = []
  if (sense.description) {
    state.description = sense.description.slice(0, 400)
    changed.push('description')
  }
  if (sense.category) {
    const cats = state.categories?.length ? [...state.categories] : []
    const approved = await getApprovedCategories()
    // matchCategoryAgainst falls back to 'Other' — don't trust garbage here.
    const matchedRaw = matchCategoryAgainst(sense.category, approved)
    const matched = matchedRaw === 'Other' ? null : matchedRaw
    if (matched && !cats.includes(matched) && cats.length < 4) {
      cats.push(matched)
      state.categories = cats
      changed.push(`category: ${matched}`)
    }
  }
  const beforeLogo = typeof before.logo === 'string' ? before.logo : ''
  const logoUrl = await uploadLogoImage(new Uint8Array(buffer))
  if (logoUrl) {
    state.logo = logoUrl
    changed.push('photo queued as logo')
  }

  await saveSession(from, 'list_form', { list: state } as ChatSessionData)
  const missing = missingRequired(state)
  const tail = `Photo read${changed.length ? `: ${changed.join(', ')}` : ' — nothing usable, keep typing'}.` +
    (!logoUrl && !beforeLogo ? ' (Logo not saved — try a clearer shot.)' : '') +
    (missing.length === 0
      ? ' All mandatory fields set — tap ↗ Publish.'
      : ` Still missing: ${missing.join(', ')}.`)
  await sendFormUpdate(from, state, tail)
}

// ── Bot pay flow (shared with /api/pay via lib/pay-lookup + lib/listing-pay) ──

function payStatusLabel(status: string): string {
  if (status === 'active') return 'live'
  if (status === 'pending') return 'awaiting payment'
  return 'not yet paid'
}

function canonicalPlan(text: string): PlanType | null {
  const t = text.toLowerCase().trim()
  if (/^(1|1m|1 ?month)$/.test(t)) return '1m'
  if (/^(6|6m|6 ?months)$/.test(t)) return '6m'
  if (/^(12|12m|1 ?year|12 ?months)$/.test(t)) return '12m'
  return null
}

// Open the pay conversation: ask whether the payer wants to pay for an
// existing business or register a new one. If this WhatsApp number has
// exactly one unpaid listing, confirm it directly (three-tap quick path).
async function startPayChoice(from: string) {
  await clearSession(from)
  const own = await ownPayableListings(from)
  if (own.length === 1) {
    const o = own[0]
    await saveSession(from, 'pay_pick', { pay_candidates: [{ id: o.id, name: o.name }] } as ChatSessionData)
    await sendInteractiveButtons(
      from,
      `You have an unpaid listing: *${o.name}* \`${o.id}\`. Pay it now?`,
      [
        { id: 'payown1', title: '$ Pay it' },
        { id: 'pay_search', title: 'Another business' },
        { id: 'pay_new', title: 'New listing' },
      ]
    )
    return
  }
  if (own.length > 1) {
    const candidates = own.map(b => ({ id: b.id, name: b.name }))
    await saveSession(from, 'pay_pick', { pay_candidates: candidates } as ChatSessionData)
    await sendInteractiveList(
      from,
      `You have ${candidates.length} unpaid listings. Tap which one to pay:`,
      candidates.map((b, i) => ({ id: `payown${i + 1}`, title: b.name, description: b.id })),
      'Your listings'
    )
    return
  }
  await sendInteractiveButtons(
    from,
    'What do you want to pay for — a business already in the directory, or a new listing you still need to register?',
    [
      { id: 'pay_existing', title: 'Existing business' },
      { id: 'pay_new', title: 'Register new' },
    ]
  )
}

// Unpaid, non-Yellow-Pages listings whose phone matches the sender.
async function ownPayableListings(from: string): Promise<{ id: string; name: string; business_id: string }[]> {
  try {
    const supabase = getSupabase()
    const [{ data: raw }, { data: specialCats }] = await Promise.all([
      supabase.from('businesses').select('name, business_id, payment_status, category').eq('phone', digitsOnly(from)),
      supabase.from('categories').select('name').eq('special', true),
    ])
    const specialNames = new Set((specialCats || []).map(sc => sc.name))
    return (raw || [])
      .filter(b => b.payment_status !== 'active' && !b.category?.some((c: string) => specialNames.has(c)))
      .map(b => ({ id: b.business_id, name: b.name, business_id: b.business_id }))
      .slice(0, 9)
  } catch {
    return []
  }
}

// Fresh DB read before every payment step: guards missing / already-live /
// Yellow-Pages-free businesses (conditions can change mid-conversation).
async function assertPayableBusiness(
  businessId: string
): Promise<{ ok: true; name: string; waId: string } | { ok: false; reply: string }> {
  const supabase = getSupabase()
  const [{ data: biz }, { data: specialCats }] = await Promise.all([
    supabase
      .from('businesses')
      .select('name, business_id, payment_status, category')
      .eq('business_id', businessId)
      .maybeSingle(),
    supabase.from('categories').select('name').eq('special', true),
  ])
  if (!biz) return { ok: false, reply: "That business isn't in the directory anymore." }
  if (biz.payment_status === 'active') {
    return { ok: false, reply: `*${biz.name}* is already live — no payment needed.` }
  }
  if (
    Array.isArray(biz.category) &&
    biz.category.some((c: string) => (specialCats || []).some(sc => sc.name === c))
  ) {
    return { ok: false, reply: `*${biz.name}* is a Yellow Pages listing — free forever, nothing to pay.` }
  }
  return { ok: true, name: biz.name, waId: businessId }
}

async function beginPayPlan(from: string, cand: { id: string; name: string }) {
  const guard = await assertPayableBusiness(cand.id)
  if (!guard.ok) {
    await clearSession(from)
    await sendWhatsAppMessage(from, guard.reply)
    return
  }
  await saveSession(from, 'pay_plan', { pay_business: { id: guard.waId, name: guard.name } } as ChatSessionData)
  await sendInteractiveButtons(
    from,
    `*${guard.name}* (${guard.waId}) — which plan covers the listing?`,
    [
      { id: 'pay_1m', title: `1 Month · $${PLAN_CONFIG['1m'].price.toFixed(0)}` },
      { id: 'pay_6m', title: `6 Months · $${PLAN_CONFIG['6m'].price.toFixed(0)}` },
      { id: 'pay_12m', title: `12 Months · $${PLAN_CONFIG['12m'].price.toFixed(0)}` },
    ]
  )
}

async function askEcoCashNumber(
  from: string,
  biz: { id: string; name: string } | undefined,
  plan: PlanType,
  base: ChatSessionData = {}
) {
  if (!biz) {
    await startPayChoice(from)
    return
  }
  await saveSession(from, 'pay_ecocash', { ...base, pay_business: biz, pay_plan: plan } as ChatSessionData)
  const amount = paymentAmountFor(plan)
  await sendWhatsAppMessage(from, [
    `${PLAN_CONFIG[plan].label} · $${amount.toFixed(2)} for *${biz.name}* (${biz.id})`,
    '',
    "Which EcoCash number should get the PIN prompt? e.g. *0771 234 567* — or reply *me* (this chat's number).",
  ].join('\n'))
}

async function handleEcoCashText(from: string, session: ChatSession, text: string) {
  const biz = session.data.pay_business
  const plan = session.data.pay_plan || '1m'
  if (!biz) {
    await startPayChoice(from)
    return
  }
  const eco = normalizeEcoCashPhone(text.trim())
  if (!/^0(71|73|77|78)\d{7}$/.test(eco)) {
    await sendWhatsAppMessage(
      from,
      `"${text.trim().slice(0, 30)}" doesn't look like an EcoCash number (077… / 078…).\n\nSend the number again, reply *me*, or *cancel*.`
    )
    return
  }

  const result = await createListingPayment({ businessId: biz.id, payerPhone: eco, plan })
  const amount = paymentAmountFor(plan)
  if (!result.ok) {
    if (result.error === 'Invalid payer phone number') {
      await sendWhatsAppMessage(from, "That number didn't look right — try again (077… / 078…) or reply *me*.")
      return
    }
    // Business-state errors terminate the flow cleanly.
    await clearSession(from)
    await sendWhatsAppMessage(from, result.error)
    return
  }
  await clearSession(from)
  if (result.autoEcoCash) {
    await sendWhatsAppMessage(
      from,
      [
        '💸 *EcoCash prompt sent!*',
        '',
        `Check your phone for the $${amount.toFixed(2)} PIN request (${PLAN_CONFIG[plan].label} plan for *${biz.name}*).`,
        'Enter your PIN and the listing goes live automatically —',
        "I'll message you here the moment it does.",
      ].join('\n')
    )
  } else {
    await sendWhatsAppMessage(
      from,
      [
        '📝 *Payment request logged* — nothing charged yet.',
        '',
        `${PLAN_CONFIG[plan].label} plan · $${amount.toFixed(2)} for *${biz.name}*.`,
        'Our team verifies the EcoCash transaction and the listing goes live right after.',
        `Prefer paying right now? ${SITE_URL}/pay`,
      ].join('\n')
    )
  }
}

async function startPaySearch(from: string) {
  await clearSession(from)
  await saveSession(from, 'pay_search', {} as ChatSessionData)
  await sendWhatsAppMessage(
    from,
    [
      'Which business should the payment go to?',
      'Send a name, phone, *WA-* ID or @username — or *cancel*.',
    ].join('\n')
  )
}

async function handlePaySearchText(from: string, session: ChatSession, text: string) {
  const lower = text.toLowerCase().trim()
  if (/^(?:register|list me|list my|list on|get listed|add my business|sign me up)\b/.test(lower) || lower === 'list') {
    await startRegister(from)
    return
  }
  if (lower === 'menu' || lower === 'hi' || lower === 'hello') {
    await sendMainMenu(from)
    return
  }

  let results: PayBusiness[] = []
  try {
    results = await searchPayBusinesses(getSupabase(), text)
  } catch {
    results = []
  }

  if (results.length === 1) {
    const b = results[0]
    const guard = await assertPayableBusiness(b.business_id)
    if (!guard.ok) {
      await clearSession(from)
      await sendWhatsAppMessage(from, guard.reply)
      return
    }
    await beginPayPlan(from, { id: b.business_id, name: b.name })
    return
  }

  if (results.length === 0) {
    await sendWhatsAppMessage(
      from,
      `No business matches "*${text.trim().slice(0, 40)}*".\n\nSend a name, phone, *WA-* ID or @username — or *cancel*.`
    )
    return
  }

  const shown = results.slice(0, 9)
  await saveSession(
    from,
    'pay_pick',
    { pay_candidates: shown.map(b => ({ id: b.business_id, name: b.name })) } as ChatSessionData
  )
  await sendInteractiveList(
    from,
    `${results.length} businesses match. Tap the one to pay (live and Yellow Pages ones are refused automatically):`,
    shown.map((b, i) => ({
      id: `pay${i + 1}`,
      title: b.name,
      description: `${b.business_id} · ${payStatusLabel(b.payment_status)}`,
    })),
    'Matching businesses'
  )
}

// A tap or typed digit picked one candidate from the on-screen pay list.
async function selectPayCandidate(from: string, session: ChatSession | null, n: number) {
  const cand = (session?.data.pay_candidates || [])[n - 1]
  if (!cand) {
    await sendWhatsAppMessage(from, 'That option expired — send *pay* to restart, or a new search.')
    return
  }
  await beginPayPlan(from, cand)
}

// pay_existing: list the sender's own unpaid listings (their default target).
async function sendOwnPayList(from: string) {
  const own = await ownPayableListings(from)
  if (own.length === 1) {
    await beginPayPlan(from, { id: own[0].id, name: own[0].name })
    return
  }
  if (own.length === 0) {
    await sendWhatsAppMessage(
      from,
      'No unpaid listings linked to your number yet.\n\n• Pay for another business: send *pay* and search.\n• New listing: send *register*.'
    )
    return
  }
  const candidates = own.map(b => ({ id: b.id, name: b.name }))
  await saveSession(from, 'pay_pick', { pay_candidates: candidates } as ChatSessionData)
  await sendInteractiveList(
    from,
    `You have ${candidates.length} unpaid listings. Tap which one to pay:`,
    candidates.map((b, i) => ({ id: `payown${i + 1}`, title: b.name, description: b.id })),
    'Your listings'
  )
}

// Where the search came from — makes ⬅ Back able to restore the last prompt.
function originOf(prev: ChatSession | null): NonNullable<ChatSessionData['origin']> {
  if (prev?.step === 'search_loc') return 'search_loc'
  if (prev?.step === 'search_term') return 'search_term'
  return 'free'
}

function pendingFields(prev: ChatSession | null): ChatSessionData {
  return {
    origin: originOf(prev),
    pending_search_term: prev?.step === 'search_loc' ? prev.data.pending_search_term : undefined,
    pending_city: prev?.step === 'search_term' ? prev.data.pending_city : undefined,
  }
}

/**
 * ⬅ Back handler. detail → list; list → the prompting question that preceded
 * the search; prompt screens → the generic search prompt.
 */
async function goBack(from: string, session: ChatSession | null) {
  const data = session?.data || {}
  if (session?.step === 'browse') {
    const cards = data.results || []
    if (data.lastScreen === 'detail' && cards.length > 0) {
      await saveSession(from, 'browse', { ...data, lastScreen: 'list' })
      await sendResultsListPage(
        from, cards, data.page || 0, data.lastTerm || 'search', data.lastCity ?? null, !!data.nearby
      )
      return
    }
    // On page 2+, Back walks one page back before leaving the list.
    const page = data.page || 0
    if (page > 0 && cards.length > 0) {
      await saveSession(from, 'browse', { ...data, page: page - 1 })
      await sendResultsListPage(
        from, cards, page - 1, data.lastTerm || 'search', data.lastCity ?? null, !!data.nearby
      )
      return
    }
    if (data.origin === 'search_term') {
      await saveSession(from, 'search_term', { pending_city: data.pending_city || '' })
      await sendAskTerm(from, data.pending_city || null)
      return
    }
    if (data.origin === 'search_loc') {
      await saveSession(from, 'search_loc', { pending_search_term: data.pending_search_term || '' })
      await sendAskTown(from, data.pending_search_term || '', false)
      return
    }
  }
  await startFreshSearchPrompt(from)
}

/** Single router for every interactive id the bot can send. */
// ── S16: needs & quotes ────────────────────────────────────────────────
// Buyers post a need, quotes carry "RQ-xxxx …", buyer relays stay capped at
// 5 with an explicit stop. No numbers are shared until the buyer deals.

function parseNeedLine(text: string): { item: string; qty: string; budget: string; city: string } {
  const work = text.replace(/[*_`]/g, ' ').replace(/\s+/g, ' ').trim()
  let rest = work
  const city = findCity(rest)
  if (city) rest = rest.replace(new RegExp(city.replace(/[-/\\^$*+.?()|[\]{}]/g, '\\$&'), 'ig'), ' ')
  let budget = ''
  const bm = rest.match(/(?:\$|usd)\s*([\d,]+(?:\.\d{1,2})?(?:\s*[-–-]\s*[\d,]+(?:\.\d{1,2})?)?)/i)
  if (bm) {
    budget = `$${bm[1].replace(/\s+/g, '')}`
    rest = rest.replace(bm[0], ' ')
  }
  let qty = ''
  const qm = rest.match(/^\s*([\d,]+(?:\.\d+)?\s*(?:x\s*)?[a-zA-Z]{0,6})\s+(.{2,})$/)
  if (qm) {
    qty = qm[1].trim()
    rest = qm[2]
  }
  return { item: rest.trim(), qty, budget, city: city || '' }
}

async function showNeedConfirm(from: string, d: ChatSessionData['need']) {
  const draft = d || { item: '', qty: '', budget: '', city: '' }
  await saveSession(from, 'need_form', { need: draft })
  await sendInteractiveButtons(
    from,
    renderNeedConfirm(draft),
    [
      { id: 'need_post', title: '✅ Post it' },
      { id: 'need_edit', title: '✎ Edit details' },
      { id: 'need_cancel', title: '✖ Cancel' },
    ]
  )
}

async function startNeedIntake(from: string, prefill?: { item: string; city: string }) {
  if (prefill && prefill.item) {
    await showNeedConfirm(from, { item: prefill.item, qty: '', budget: '', city: prefill.city || '' })
    return
  }
  await saveSession(from, 'need_form', {})
  await sendWhatsAppMessage(from, renderNeedIntro())
}

async function handleNeedFormText(from: string, session: ChatSession, text: string) {
  const parsed = parseNeedLine(text)
  if (!parsed.item && !parsed.qty) {
    await sendWhatsAppMessage(
      from,
      "Send what you need as one line, e.g. *50 bags cement harare*. I need at least an item."
    )
    return
  }
  const prev = session.data.need || { item: '', qty: '', budget: '', city: '' }
  const draft = {
    item: parsed.item || prev.item,
    qty: parsed.qty || prev.qty,
    budget: parsed.budget || prev.budget,
    city: parsed.city || prev.city,
  }
  await showNeedConfirm(from, draft)
}

async function postBuyerNeed(from: string, session: ChatSession | null) {
  const d = session?.data.need
  if (!d || !d.item) {
    await startNeedIntake(from)
    return
  }
  const need = await createNeed({ buyer_phone: from, item: d.item, qty: d.qty, budget: d.budget, city: d.city })
  if (!need) {
    await sendWhatsAppMessage(from, renderErrorCard())
    return
  }
  await sendWhatsAppMessage(from, renderNeedPosted(need.rq_id, d))
  // Instant copy to every admin: need summary + a channel-ready post to
  // copy-paste, plus the one-word commands for this need.
  const admins = await adminNumbers()
  const ch = await channelLine()
  const adminBody = [
    `🛒 NEW NEED ${need.rq_id}`,
    [d.qty, d.item].filter(Boolean).join(' '),
    `${d.budget || 'no budget'} · ${(d.city || 'countrywide').toUpperCase()}`,
    `Buyer: +${from}`,
    '',
    '— channel post (copy below) —',
    channelPostFor(need),
    ...(ch ? ['', ch] : []),
    '',
    `Quick replies: quotes ${need.rq_id} · close ${need.rq_id} · post ${need.rq_id}`,
  ].join('\n')
  for (const admin of admins) {
    if (!admin || admin === digitsOnly(from)) continue
    await sendWhatsAppText(admin, adminBody)
    logOut(admin, 'text', adminBody)
  }
  await clearSession(from)
}

/** Buyer taps ✅ on a quote card: close the need with that winner and
 * hand both sides a bare WhatsApp number each — one tap to save. */
async function pickQuoteForBuyer(buyerPhone: string, quoteId: number) {
  const quote = await getQuoteById(quoteId)
  if (!quote) return
  const need = await getNeedById(quote.need_id)
  if (!need) return
  if (digitsOnly(need.buyer_phone) !== digitsOnly(buyerPhone)) return
  if (need.status !== 'open') {
    await sendWhatsAppMessage(buyerPhone, renderNeedFilled(need.rq_id, '', 'another supplier'))
    return
  }
  await closeNeedByRqId(need.rq_id, 'buyer', quote.id)
  const quotes = await listNeedQuotes(need.id)
  const other = quotes.filter(q => q.id !== quote.id && q.price).slice(0, 4)
  await sendWhatsAppMessage(
    buyerPhone,
    [
      `🎉 Deal noted on *${need.rq_id}* — thread quiet now.`,
      quote.supplier_name ? `Winner: *${quote.supplier_name}* — their contact card is on its way, one tap to save.` : '',
      other.length > 0 ? `Other quotes for reference: ${other.map(q => q.price).join(', ')}.` : '',
      '',
      'Send a new search or 🛒 *menu* → Post a need anytime.',
    ].filter(Boolean).join('\n')
  )
  await sendContactCard(buyerPhone, quote.supplier_name || 'Supplier', quote.supplier_phone)
  await sendWhatsAppMessage(
    quote.supplier_phone,
    [
      `🎉 You won *${need.rq_id}* (${[need.qty, need.item].filter(Boolean).join(' ')}${need.city ? `, ${need.city}` : ''})!`,
      'The buyer\'s contact card is on its way — one tap to save, then chat directly.',
    ].join('\n')
  )
  await sendContactCard(quote.supplier_phone, 'Buyer', need.buyer_phone)
}

/** Any "RQ-…" text: quote capture, buyer stop/reopen, closed-need notices.
 * Returns true when the message was handled as a need interaction. */
// String-built regexes: the bundler strips backslashes inside string
// literals, so every escape here is assembled from a runtime backslash —
// never a literal one in source.
const RQS = String.fromCharCode(92)
const RQ_DETECT = new RegExp('(?:^|[^a-z0-9])rq[-' + RQS + 's]?(' + RQS + 'd{3,8})(?:[^a-z0-9]|$)', 'i')
const RQ_STOP = new RegExp('(?:' + RQS + 'b)(stop|quiet)(?:' + RQS + 'b)', 'i')
const RQ_OPEN = new RegExp('(?:' + RQS + 'b)(open|reopen|more quotes)(?:' + RQS + 'b)', 'i')
const STOP_ALL = new RegExp('^stop quotes?$', 'i')
const RQ_PRICE = new RegExp('(?:' + RQS + '$|usd)' + RQS + 's*([0-9,]+(?:' + RQS + '.' + RQS + 'd{1,2})?)', 'i')

async function handleRqText(from: string, waName: string, text: string): Promise<boolean> {
  const clean = text.replace(/[*_`]/g, '').replace(/\s+/g, " ").trim()
  // Buyer's wholesale quiet: stops the most recent open need.
  if (!RQ_DETECT.test(clean) && STOP_ALL.test(clean)) {
    const open = (await listOpenNeeds(20)).find(n => digitsOnly(n.buyer_phone) === digitsOnly(from))
    if (open) {
      await closeNeedByRqId(open.rq_id, 'buyer')
      await sendWhatsAppMessage(from, renderNeedClosedByBuyer(open.rq_id))
      return true
    }
  }

  if (!RQ_DETECT.test(clean)) return false
  const rqId = canonicalRq(clean)
  if (!rqId) return false

  const need = await getNeedByRqId(rqId)
  if (!need) {
    await sendWhatsAppMessage(from, `${rqId} is not a need on our board. Check the id - it looks like *RQ-1234*.`)
    return true
  }
  const isBuyer = digitsOnly(need.buyer_phone) === digitsOnly(from)

  if (RQ_STOP.test(clean)) {
    if (isBuyer) {
      await closeNeedByRqId(rqId, 'buyer')
      await sendWhatsAppMessage(from, renderNeedClosedByBuyer(rqId))
    } else {
      await sendWhatsAppMessage(from, 'Only the person who posted this need can quiet it.')
    }
    return true
  }
  if (isBuyer && RQ_OPEN.test(clean) && !/[$0-9]{2}/.test(clean.replace(/rq[-\s]?[0-9]+/i, " "))) {
    const reopened = need.status !== "open"
    if (reopened) await reopenNeed(need.id)
    await sendWhatsAppMessage(
      from,
      reopened
        ? `🔄 ${rqId} is live again - matching suppliers will pick it up on their next quote.`
        : `${rqId} is already live and waiting for quotes.`
    )
    return true
  }

  if (need.status !== 'open') {
    let winner = 'another supplier'
    if (need.winner_quote_id) {
      const q = await getQuoteById(need.winner_quote_id)
      if (q?.supplier_name) winner = q.supplier_name
    }
    await sendWhatsAppMessage(from, renderNeedFilled(rqId, need.updated_at ? `on ${fmtHarare(need.updated_at, true)}` : "", winner))
    return true
  }

  // Price: prefer anything after $/USD; else the first number on the line.
  let price = ''
  let bodyText = clean.replace(/rq[-\s]?[0-9]+/i, " ")
  const pm = bodyText.match(RQ_PRICE)
  if (pm) {
    price = `$${pm[1].replace(/,/g, "")}`
    bodyText = bodyText.replace(pm[0], " ")
  } else {
    const nm = bodyText.match(/[0-9][0-9,]*(?:.\d{1,2})?/)
    if (nm) {
      price = `$${nm[0].replace(/,/g, "")}`
      bodyText = bodyText.replace(nm[0], " ")
    }
  }
  bodyText = bodyText.replace(/\s+/g, " ").trim().slice(0, 200)

  const result = await addNeedQuote(need.id, from, waName, price, bodyText)
  if (result.atCap) {
    await sendWhatsAppMessage(from, `${rqId} is closed to new quotes (5 already relayed). The buyer may reopen it with *${rqId} open* - meanwhile reply *menu* for other work.`)
    return true
  }
  if (!result.ok || !result.quote) {
    await sendWhatsAppMessage(from, 'Your quote could not be saved just now - send it again in a moment.')
    return true
  }

  // Relay straight into the buyer's chat (never the buyer's number out).
  const quotes = await listNeedQuotes(need.id)
  await sendInteractiveButtons(
    need.buyer_phone,
    renderQuoteCard(rqId, waName || "A supplier", price, bodyText, quotes.length, Math.max(quotes.length, (need.quotes_forwarded || 0) + 1)),
    [
      { id: `q_pick_${result.quote.id}`, title: "✅ Deal with this" },
      { id: `q_stop_${rqId}`, title: "✋ Stop quotes" },
    ]
  )
  await sendWhatsAppMessage(
    from,
    [
      `✔ Quote sent to the buyer of ${rqId}.`,
      "If they pick you, you get their contact card here - deal directly after that.",
    ].join("\n")
  )
  return true
}
async function handleAdminCommand(from: string, text: string): Promise<boolean> {
  const clean = text.trim()
  const lower = clean.toLowerCase()

  if (lower === 'digest' || lower.startsWith('digest ')) {
    const args = clean.slice(6).trim().split(/\s+/).filter(Boolean)
    const cursor = await getDigestCursor()
    const win = parseDigestWindow(args, cursor)
    if (win.error) {
      await sendWhatsAppMessage(
        from,
        [
          "Didn't catch that time. Formats: *digest*, *digest 10:30*, *digest 10:30 13:00*.",
          '*digest* reports everything since your last check-in and moves the window.',
        ].join('\n')
      )
      return true
    }
    const digest = await compileDigest(win.fromIso, win.toIso)
    await sendWhatsAppMessage(from, digest)
    if (args.length === 0) {
      await bumpDigestCursor(win.toIso)
      await sendWhatsAppMessage(from, `— cursor moved to ${fmtHarare(win.toIso)} (Harare). Next plain *digest* starts from here.`)
    }
    return true
  }

  if (lower === 'needs') {
    const needs = await listOpenNeeds(20)
    if (needs.length === 0) {
      await sendWhatsAppMessage(from, 'No open needs on the board right now.')
      return true
    }
    const lines = ['🛒 *Open needs*', '']
    for (const n of needs) {
      lines.push(`${n.rq_id} · ${[n.qty, n.item].filter(Boolean).join(' ')} · ${(n.city || 'countrywide').toUpperCase()} · ${n.quotes_forwarded || 0} quote${n.quotes_forwarded === 1 ? '' : 's'}`)
    }
    lines.push('', 'Reply *close RQ-xxxx* to quiet one, or *digest* for the full report.')
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  if (lower.startsWith('close ')) {
    const rqId = canonicalRq(clean.slice(6))
    if (!rqId) {
      await sendWhatsAppMessage(from, 'Which need? e.g. *close RQ-7181*.')
      return true
    }
    const ok = await closeNeedByRqId(rqId, 'admin')
    await sendWhatsAppMessage(from, ok ? `✅ ${rqId} closed — no more quotes relay.` : `${rqId} was not open (might already be closed).`)
    return true
  }

  if (lower === 'stats') {
    await sendWhatsAppMessage(from, await adminWeeklyStats())
    return true
  }

  if (lower === 'admins') {
    const list = await adminNumbers()
    const root = digitsOnly(ADMIN_WHATSAPP || '')
    const lines = ['👥 *Bot admins*', '']
    for (const n of list) lines.push(`${fmtAdminNumber(n)}${n === root ? ' · owner' : ''}`)
    lines.push('', 'Owner can add/remove: *admin add 263…* / *admin del 263…*')
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  const adminAdd = clean.match(/^admin\s+(add|del)\s+(\+?[\d\s-]{6,20})$/i)
  if (adminAdd) {
    const root = digitsOnly(ADMIN_WHATSAPP || '')
    if (digitsOnly(from) !== root) {
      await sendWhatsAppMessage(from, 'Only the owner number can change admins.')
      return true
    }
    const num = digitsOnly(adminAdd[2])
    if (num.length < 9 || num === root) {
      await sendWhatsAppMessage(from, 'Send a full number like *admin add 263771234567*.')
      return true
    }
    const raw = await getBotSetting('admin_allowlist')
    let extras: string[] = []
    try {
      const parsed = JSON.parse(raw || '[]')
      if (Array.isArray(parsed)) extras = parsed.map(x => digitsOnly(String(x))).filter(Boolean)
    } catch {
      extras = []
    }
    if (adminAdd[1].toLowerCase() === 'add') {
      if (extras.includes(num)) {
        await sendWhatsAppMessage(from, `${fmtAdminNumber(num)} is already an admin.`)
        return true
      }
      extras.push(num)
      await setBotSetting('admin_allowlist', JSON.stringify(extras))
      await sendWhatsAppMessage(from, `✅ Added ${fmtAdminNumber(num)}. They can now run *digest*, *needs*, *stats* and get need copies.`)
    } else {
      if (!extras.includes(num)) {
        await sendWhatsAppMessage(from, `${fmtAdminNumber(num)} is not on the admin list.`)
        return true
      }
      extras = extras.filter(n => n !== num)
      await setBotSetting('admin_allowlist', JSON.stringify(extras))
      await sendWhatsAppMessage(from, `✅ Removed ${fmtAdminNumber(num)}.`)
    }
    return true
  }

  const quotesCmd = clean.match(/^quotes\s+(.+)$/i)
  if (quotesCmd) {
    const rqId = canonicalRq(quotesCmd[1])
    const need = rqId ? await getNeedByRqId(rqId) : null
    if (!need) {
      await sendWhatsAppMessage(from, 'Which need? e.g. *quotes RQ-7181*.')
      return true
    }
    const qs = await listNeedQuotes(need.id, 10)
    const lines = [
      `💬 *${need.rq_id}* · ${[need.qty, need.item].filter(Boolean).join(' ')} · ${(need.city || 'countrywide').toUpperCase()}`,
      `Status: ${need.status} · ${qs.length} quote${qs.length === 1 ? '' : 's'} stored`,
      '',
    ]
    qs.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.supplier_name || 'supplier'} · ${q.price || '(no price)'}${q.body ? ` · ${q.body}` : ''}`)
    })
    if (!qs.length) lines.push('No quotes yet.')
    lines.push('', `Reply *close ${need.rq_id}* to quiet it, *reopen ${need.rq_id}* to restart.`)
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  const reopenCmd = clean.match(/^reopen\s+(.+)$/i)
  if (reopenCmd) {
    const rqId = canonicalRq(reopenCmd[1])
    const need = rqId ? await getNeedByRqId(rqId) : null
    if (!need) {
      await sendWhatsAppMessage(from, 'Which need? e.g. *reopen RQ-7181*.')
      return true
    }
    if (need.status === 'open') {
      await sendWhatsAppMessage(from, `${need.rq_id} is already open.`)
      return true
    }
    await reopenNeed(need.id)
    await sendWhatsAppMessage(from, `🔄 ${need.rq_id} reopened — quotes relay again.`)
    return true
  }

  const postCmd = clean.match(/^post\s+(.+)$/i)
  if (postCmd) {
    const rqId = canonicalRq(postCmd[1])
    const need = rqId ? await getNeedByRqId(rqId) : null
    if (!need) {
      await sendWhatsAppMessage(from, 'Which need? e.g. *post RQ-7181*.')
      return true
    }
    await sendWhatsAppMessage(from, `📋 Channel post for ${need.rq_id}:\n\n${channelPostFor(need)}`)
    return true
  }

  const peopleCmd = clean.match(/^(optin|optout)\s+(\+?[\d\s-]{6,20})$/i)
  if (peopleCmd) {
    const num = digitsOnly(peopleCmd[2])
    if (num.length < 9) {
      await sendWhatsAppMessage(from, 'Send a full number like *optout 263771234567*.')
      return true
    }
    const off = peopleCmd[1].toLowerCase() === 'optout'
    if (off) await markBotContactOptOut(num)
    else await setBotContactOptIn(num)
    await sendWhatsAppMessage(from, `✅ ${fmtAdminNumber(num)} ${off ? 'will not get follow-ups' : 'can get follow-ups again'}.`)
    return true
  }

  if (lower === 'switch' || lower.startsWith('switch ')) {
    const state = await prioritySwitchState()
    if (lower === 'switch') {
      await sendWhatsAppMessage(from, `🔀 Priority-supplier switch: *${state.enabled ? 'ON' : 'OFF'}* · price ${state.price}\n\nReply *switch on*, *switch off* or *switch price $5*.`)
      return true
    }
    if (lower === 'switch on' || lower === 'switch off') {
      await setPrioritySwitch(lower === 'switch on', state.price)
      await sendWhatsAppMessage(from, `🔀 Priority-supplier switch is now *${lower === 'switch on' ? 'ON' : 'OFF'}*.`)
      return true
    }
    const priceMatch = clean.match(/^switch\s+price\s+(\S{1,24})$/i)
    if (priceMatch) {
      await setPrioritySwitch(state.enabled, priceMatch[1])
      await sendWhatsAppMessage(from, `💵 Priority-supplier price set to *${priceMatch[1]}*.`)
      return true
    }
    await sendWhatsAppMessage(from, 'Use *switch on*, *switch off*, or *switch price $5*.')
    return true
  }

  if (lower === 'channel' || lower.startsWith('channel ')) {
    const stored = await getBotSetting('channel_link')
    const cur = (stored || process.env.CHANNEL_LINK || '').trim()
    if (lower === 'channel') {
      await sendWhatsAppMessage(from, cur ? `📣 Channel: ${cur}` : 'No channel link set. Reply *channel set <link>*.')
      return true
    }
    const setMatch = clean.match(/^channel\s+set\s+(https?:\/\/\S+)$/i)
    if (setMatch) {
      await setBotSetting('channel_link', setMatch[1])
      await sendWhatsAppMessage(from, `✅ Channel link saved.\n${setMatch[1]}`)
      return true
    }
    if (lower === 'channel clear') {
      await setBotSetting('channel_link', '')
      await sendWhatsAppMessage(from, 'Channel link cleared.')
      return true
    }
    await sendWhatsAppMessage(from, 'Use *channel set https://…* or *channel clear*.')
    return true
  }

  if (lower === 'pending') {
    const bus = await listUnverifiedBusinesses(10)
    if (!bus.length) {
      await sendWhatsAppMessage(from, 'No unverified businesses right now. ✅')
      return true
    }
    await saveSession(from, 'admin_pending', { pendingBiz: bus.map(b => b.id) })
    const lines = ['🕵️ *Unverified businesses*', '']
    bus.forEach((b, i) => {
      lines.push(`${i + 1}. ${b.name} · ${(b.city || '—').toUpperCase()} · ${fmtHarare(b.created_at, true)}${b.phone ? ` · +${digitsOnly(b.phone)}` : ''}`)
    })
    lines.push('', 'Reply *verify 1* to approve (the business gets a ✅ notice), or *unverify 1*.')
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  const verifyCmd = clean.match(/^(verify|unverify)\s+(\d{1,2})$/i)
  if (verifyCmd) {
    const sess = await getSession(from)
    const ids = sess?.data.pendingBiz || []
    const idx = Number(verifyCmd[2]) - 1
    if (idx < 0 || idx >= ids.length) {
      await sendWhatsAppMessage(from, 'Run *pending* first, then reply *verify 1* with the list number.')
      return true
    }
    const bizId = ids[idx]
    const { data: biz } = await getSupabase()
      .from('businesses')
      .select('id, name, phone, verified')
      .eq('id', bizId)
      .maybeSingle()
    if (!biz) {
      await sendWhatsAppMessage(from, 'That business was not found — run *pending* again.')
      return true
    }
    const verify = verifyCmd[1].toLowerCase() === 'verify'
    await getSupabase().from('businesses').update({ verified: verify }).eq('id', bizId)
    await sendWhatsAppMessage(from, `${verify ? '✅' : '↩️'} *${biz.name}* is now ${verify ? 'verified' : 'unverified'}.`)
    if (verify && biz.phone) {
      const bph = digitsOnly(biz.phone)
      if (bph && bph !== digitsOnly(from)) {
        await sendWhatsAppMessage(bph, [
          `✅ *${biz.name}* is now Verified on WA Directory.`,
          'Customers see the badge on your listing. Reply *help* for other options.',
        ].join('\n'))
      }
    }
    return true
  }

  return false
}

async function handleAction(from: string, session: ChatSession | null, action: string, msgId?: string) {
  // Need-quote actions carry data ids (pick / stop / deal-ask answers).
  const pick = action.match(/^q_pick_(\d+)$/)
  if (pick) {
    await pickQuoteForBuyer(from, Number(pick[1]))
    return
  }
  const stop = action.match(/^q_stop_(RQ-\d+)$/)
  if (stop) {
    await closeNeedByRqId(stop[1], 'buyer')
    await sendWhatsAppMessage(from, renderNeedClosedByBuyer(stop[1]))
    return
  }
  const deal = action.match(/^nd_(yes|no)_(RQ-\d+)$/)
  if (deal) {
    const need = await getNeedByRqId(deal[2])
    if (need) {
      if (deal[1] === 'yes') {
        await closeNeedByRqId(deal[2], 'buyer')
        await sendWhatsAppMessage(
          from,
          `🎉 Sorted — congrats on the deal. That's exactly what this space is for. Send a new search anytime.`
        )
      } else {
        await reopenNeed(need.id)
        await sendWhatsAppMessage(
          from,
          `🔄 ${deal[2]} reopened — suppliers see it again and can quote. Tap ✋ on any quote card if it gets noisy.`
        )
      }
    }
    return
  }

  const sel = action.match(/^sel_([1-9][0-9]?)$/)
  if (sel) {
    if (session?.step === 'browse') {
      const cards = session.data.results || []
      const pick = Number(sel[1])
      if (pick > 0 && pick <= cards.length) {
        await sendResultDetail(from, session, pick)
      } else if (cards.length > 0) {
        await sendWhatsAppMessage(from, renderInvalidSelection(cards.length))
      } else {
        await startFreshSearchPrompt(from)
      }
      return
    }
    await startFreshSearchPrompt(from)
    return
  }

  switch (action) {
    case 'back':
      await goBack(from, session)
      return
    case 'more':
    case 'next': {
      if (session?.step === 'browse') {
        const cards = session.data.results || []
        const page = session.data.page || 0
        if (cards.length > (page + 1) * RESULTS_PER_PAGE) {
          await saveSession(from, 'browse', { ...session.data, lastScreen: 'list', page: page + 1 })
          await sendResultsListPage(
            from, cards, page + 1, session.data.lastTerm || 'search',
            session.data.lastCity ?? null, !!session.data.nearby
          )
        } else {
          await sendWhatsAppMessage(
            from,
            `That's all ${cards.length} match${cards.length === 1 ? '' : 'es'} — reply a number or tap a business.`
          )
        }
        return
      }
      await startFreshSearchPrompt(from)
      return
    }
    case 'end_list': {
      if (session?.step === 'browse') {
        const cards = session.data.results || []
        await sendWhatsAppMessage(
          from,
          `That's all ${cards.length} match${cards.length === 1 ? '' : 'es'} for *${session.data.lastTerm || 'your search'}* — reply a number or send a new search.`
        )
        return
      }
      await startFreshSearchPrompt(from)
      return
    }
    case 'new_search':
      await startFreshSearchPrompt(from)
      return
    case 'menu_needs':
      await startNeedIntake(from)
      return
    case 'need_post':
      await postBuyerNeed(from, session)
      return
    case 'need_edit':
      await saveSession(from, 'need_form', {})
      await sendWhatsAppMessage(
        from,
        [
          'Send the corrected line — what + how many (+ town, budget).',
          'e.g. *50 bags cement harare $40-60*',
        ].join('\n')
      )
      return
    case 'need_cancel':
      await clearSession(from)
      await sendWhatsAppMessage(from, 'Need dropped. Send *help* anytime.')
      return
    case 'need_more': {
      const lastCity = session?.data.lastCity || ''
      const city = lastCity && lastCity !== 'Near you' ? lastCity : ''
      const term = session?.data.lastTerm || ''
      if (term) {
        await showNeedConfirm(from, { item: term, qty: '', budget: '', city })
      } else {
        await startNeedIntake(from)
      }
      return
    }
    case 'menu_register':
      await sendRegisterChoice(from)
      return
    case 'reg_business':
      await startRegister(from)
      return
    case 'reg_personal': {
      await saveSession(from, 'reg_contact', {})
      await sendWhatsAppMessage(
        from,
        [
          'Add a personal contact to the directory 📱',
          '',
          "Send the contact's name + phone (+ city, socials optional), e.g.",
          '*Tendai Ncube 0771 234 567 Harare IG @tendai*',
          '',
          'USD 0.20/month or USD 1.00/year — paid via EcoCash.',
        ].join('\n')
      )
      return
    }
    case 'reg_contact_pay_monthly':
    case 'reg_contact_publish': {
      if (session?.step === 'reg_contact' && session.data.contact) {
        await tryPublishContact(from, session, msgId, '1m', 0.2)
      } else {
        await sendRegisterChoice(from)
      }
      return
    }
    case 'reg_contact_pay_year': {
      if (session?.step === 'reg_contact' && session.data.contact) {
        await tryPublishContact(from, session, msgId, '12m', 1.0)
      } else {
        await sendRegisterChoice(from)
      }
      return
    }
    case 'reg_contact_fix': {
      await saveSession(from, 'reg_contact', {})
      await sendWhatsAppMessage(
        from,
        [
          'Add a personal contact to the directory 📱',
          '',
          "Send the contact's name + phone (+ city, socials optional), e.g.",
          '*Tendai Ncube 0771 234 567 Harare IG @tendai*',
        ].join('\n')
      )
      return
    }
    case 'list_publish': {
      if (session?.step === 'list_form') {
        await tryPublishForm(from, session, msgId)
      } else {
        await startRegister(from)
      }
      return
    }
    case 'list_cancel':
      await clearSession(from)
      await sendWhatsAppMessage(from, 'Registration cancelled. Send *help* anytime.')
      return
    case 'menu_help':
      await sendWhatsAppMessage(from, await helpText())
      return
    case 'menu_pay':
    case 'pay':
      await startPayChoice(from)
      return
    case 'pay_existing':
      await sendOwnPayList(from)
      return
    case 'pay_search':
      await startPaySearch(from)
      return
    case 'pay_new':
      await clearSession(from)
      await startRegister(from)
      return
    case 'pay_1m':
    case 'pay_6m':
    case 'pay_12m': {
      const plan: PlanType = action === 'pay_1m' ? '1m' : action === 'pay_6m' ? '6m' : '12m'
      await askEcoCashNumber(from, session?.data.pay_business, plan, session?.data || {})
      return
    }
    case 'cancel':
      await clearSession(from)
      await sendWhatsAppMessage(from, await helpText())
      return
    case 'whole_country':
      if (session?.step === 'search_loc' && session.data.pending_search_term) {
        await clearSession(from)
        await runSearchAndReply(from, {
          term: session.data.pending_search_term,
          city: null,
          nationwide: true,
        })
        return
      }
      if (session?.step === 'search_term') {
        await sendAskTerm(from, null)
        return
      }
      await startFreshSearchPrompt(from)
      return
    default:
      break
  }

  // Pay-flow row taps: payown<N> (own listings) and pay<N> (search results)
  // share the same candidate-picker.
  const payRow = action.match(/^(?:payown|pay)([1-9])$/)
  if (payRow) {
    await selectPayCandidate(from, session, Number(payRow[1]))
    return
  }

  await sendWhatsAppMessage(
    from,
    "That option isn't available. Reply *menu* for the main menu, or send a search."
  )
}

// Bot retrieval cap: performance guard requested by the owner — page through
// the stored candidates instead of re-querying for every scroll.
const MAX_RESULTS = 20

// Shared sender for any list page (page 0 = first screen). Keeps row ids,
// numbering and copy consistent between search results, nearby results,
// "More results" pages and ⬅ Back re-renders.
async function sendResultsListPage(
  from: string,
  cards: ResultCard[],
  page: number,
  termDisplay: string,
  cityLabel: string | null,
  nearby: boolean,
  replyTo?: string
) {
  if (cards.length === 0) return
  const body = nearby && cityLabel === 'Near you'
    ? renderNearMeListBody(termDisplay, cards.length, page)
    : nearby
      ? renderNearbyListBody(termDisplay, cityLabel || 'Zimbabwe', cards.length, page)
      : renderResultsListBody(termDisplay, cityLabel, cards.length, page)
  await sendInteractiveList(from, body, resultRows(cards, page), 'Choose a business', replyTo)
}

async function runSearchAndReply(
  from: string,
  p: ParsedQuery,
  opts?: { replyTo?: string; aliased?: boolean; nationwideTried?: boolean }
) {
  const supabase = getSupabase()
  const term = p.term.toLowerCase()
  const city = p.nationwide ? null : p.city

  // - Tier A: in-town category/name matches, ordered by the webapp's ranking
  //   (paid rank_spots when active, rarely-seen shuffle otherwise)
  // - Tier B (when A misses): in-town named products with exact prices
  // - Tier C (when the town has nothing): nearest towns, ranked by km
  const scopeReq = supabase.from('businesses').select(BOT_BIZ_COLUMNS).eq('verified', true)
  const { data: scopeRows } = city ? await scopeReq.eq('city', city) : await scopeReq
  const scope = (scopeRows as BotBusinessRow[]) || []

  const category = p.term ? matchCategoryAgainst(p.term, await getApprovedCategories()) : 'Other'

  if (scope.length === 0 && city) {
    // Requested town has no verified businesses at all — fall straight
    // through to the nationwide experience so the user never dead-ends.
    await runSearchAndReply(from, { ...p, city: null, nationwide: true }, {
      ...opts,
      nationwideTried: true,
    })
    return
  }

  let results: BotResult[] = []
  const candidates = scope.filter(b => bizMatchesQuery(b, term, category))
  if (candidates.length > 0) {
    if (p.origin) {
      // "Near me" ranking: plain distance sort from the shared point — no
      // city rank_spots in this mode (the user's position is the context).
      const origin = p.origin
      const ranked = candidates
        .map(b => ({
          biz: b,
          km: b.lat != null && b.lng != null
            ? haversineKm(origin.lat, origin.lng, b.lat, b.lng)
            : undefined,
        }))
        .sort((x, y) => (x.km ?? 999999) - (y.km ?? 999999))
      const itemMap = await fetchMatchingItems(ranked.map(r => r.biz.id), term)
      results = ranked.slice(0, MAX_RESULTS).map(r => ({
        biz: r.biz,
        item: itemMap.get(r.biz.id) || null,
        km: r.km,
      }))
    } else {
      const seedText = p.term || category.toLowerCase()
      // Respect the bidding feature: orderSearchResults places active rank_spots
      // for (category, city) first — nationwide spots as fallback — and applies
      // the webapp's default weighted shuffle when no bids are active.
      const ordered = (await orderSearchResults(
        candidates as unknown as Business[],
        category,
        city || '',
        seedText
      )) as unknown as BotBusinessRow[]
      const itemMap = await fetchMatchingItems(ordered.map(b => b.id), term)
      results = ordered.map(b => ({ biz: b, item: itemMap.get(b.id) || null }))
    }
  } else if (term.length >= 3) {
    const itemMap = await fetchMatchingItems(scope.map(b => b.id), term)
    const ownerIds = new Set(itemMap.keys())
    let tmp = scope.filter(b => ownerIds.has(b.id)).map(b => ({ biz: b, item: itemMap.get(b.id)! }))
    if (p.origin) {
      const origin = p.origin
      tmp = tmp
        .map(r => ({
          ...r,
          km: r.biz.lat != null && r.biz.lng != null
            ? haversineKm(origin.lat, origin.lng, r.biz.lat, r.biz.lng)
            : undefined,
        }))
        .sort((x, y) => (x.km ?? 999999) - (y.km ?? 999999))
    }
    results = tmp
  }

  results = results.slice(0, MAX_RESULTS)
  const termDisplay = p.term || category.toLowerCase()

  // Name direct hit: a query that names exactly one business shows contact
  // details right away without the intermediate list.
  if (
    results.length === 1 &&
    term.length >= 3 &&
    (results[0].biz.name || '').toLowerCase().includes(term)
  ) {
    const cards = results.map(toCard)
    const prev = await getSession(from)
    const data = {
      ...pendingFields(prev),
      results: cards,
      lastScreen: 'list' as const,
      lastTerm: termDisplay,
      lastCity: city,
      page: 0,
    }
    await saveSession(from, 'browse', data)
    await sendResultDetail(from, { phone: from, step: 'browse', data }, 1)
    return
  }

  if (results.length === 0 && city) {
    // Nearby tier: same matching in other towns, ranked by distance
    const { data: allRows } = await supabase
      .from('businesses')
      .select(BOT_BIZ_COLUMNS)
      .eq('verified', true)
    const all = (allRows as BotBusinessRow[]) || []
    const nearCandidates = all
      .filter(b => b.city !== city && bizMatchesQuery(b, term, category))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    if (nearCandidates.length > 0) {
      const originRows = all.filter(b => b.city === city && b.lat != null && b.lng != null)
      let origin: { lat: number; lng: number } | null = null
      if (originRows.length > 0) {
        origin = {
          lat: originRows.reduce((s, b) => s + (b.lat || 0), 0) / originRows.length,
          lng: originRows.reduce((s, b) => s + (b.lng || 0), 0) / originRows.length,
        }
      }
      const itemMap = await fetchMatchingItems(nearCandidates.map(b => b.id), term)
      results = nearCandidates
        .map(b => ({
          biz: b,
          item: itemMap.get(b.id) || null,
          km: origin && b.lat != null && b.lng != null
            ? haversineKm(origin.lat, origin.lng, b.lat, b.lng)
            : undefined,
        }))
        .sort((x, y) => (x.km ?? 999999) - (y.km ?? 999999))
        .slice(0, MAX_RESULTS)
      const nearbyDisplay = p.term || category.toLowerCase()
      const cards = results.map(toCard)
      const prev = await getSession(from)
      await saveSession(from, 'browse', {
        ...pendingFields(prev),
        results: cards,
        lastScreen: 'list',
        lastTerm: nearbyDisplay,
        lastCity: city,
        nearby: true,
        page: 0,
      })
      await sendResultsListPage(from, cards, 0, nearbyDisplay, city, true)
      recordBotEvents(results.map(r => r.biz)).catch(() => {})
      return
    }
  }

  if (results.length === 0) {
    const missTerm = p.term || category.toLowerCase()
    if (missTerm.length >= 3) {
      // Slow path ahead (AI expansion / fallback search) — flip the typing
      // indicator on the original message first.
      if (opts?.replyTo) await markRead(opts.replyTo, true).catch(() => {})
      // Rescue 1 — AI alias sweep: Gemini suggests synonym/category terms;
      // the first alias that matches renders the real search screen.
      if (!opts?.aliased) {
        const aliases = (await expandSearchQuery(missTerm))
          .map(s => s.trim().toLowerCase())
          .filter(s => s && s !== missTerm.toLowerCase())
        for (const alias of aliases.slice(0, 3)) {
          const aliasResults = scope.filter(b =>
            bizMatchesQuery(b, alias, category)
          )
          if (aliasResults.length > 0) {
            await runSearchAndReply(from, {
              term: alias,
              city: p.city,
              nationwide: p.nationwide,
              origin: p.origin,
            }, { ...opts, aliased: true })
            return
          }
        }
      }
      // Rescue 2 — no matches in the user's town (or near-them point):
      // repeat the sweep countrywide so they never dead-end.
      if ((p.city || p.origin) && !opts?.nationwideTried) {
        await runSearchAndReply(from, {
          term: p.term,
          city: null,
          nationwide: true,
          origin: null,
        }, { replyTo: opts?.replyTo, aliased: opts?.aliased, nationwideTried: true })
        return
      }
    }
    await sendInteractiveButtons(
      from,
      `${renderEmptyResults(missTerm)}\n\n🛒 Or let suppliers find it: I post this exact need and they quote you right here.`,
      [{ id: 'need_more', title: '🛒 Post as a need' }],
      opts?.replyTo
    )
    return
  }

  const fromOrigin = !!p.origin
  const cards = results.map(toCard)
  const prev = await getSession(from)
  await saveSession(from, 'browse', {
    ...pendingFields(prev),
    results: cards,
    lastScreen: 'list',
    lastTerm: termDisplay,
    lastCity: fromOrigin ? 'Near you' : city,
    nearby: fromOrigin,
    page: 0,
  })
  await sendResultsListPage(from, cards, 0, termDisplay, fromOrigin ? 'Near you' : city, fromOrigin, opts?.replyTo)
  recordBotEvents(results.map(r => r.biz)).catch(() => {})
}

async function dispatchSearch(
  from: string,
  text: string,
  opts?: { origin?: { lat: number; lng: number } | null; replyTo?: string }
) {    const p: ParsedQuery = { ...parseQuery(text), origin: opts?.origin ?? null }
    // Demand radar: every user query lands in bot_searches, even the ones
    // that never find supply — that's the admin digest's radar section.
    logBotSearch(from, p.term || (p.city ? '(town only)' : '(blank)'), p.city).catch(() => {})

  // Bare name search with no town: when exactly one verified business is
  // named by the query, show its contact details right away (nationwide)
  // instead of the intermediate "Which town?" step. Multiple matches keep
  // the existing town-first flow.
  if (p.term && !p.city && !p.nationwide) {
    const { data: nameProbe } = await getSupabase()
      .from('businesses')
      .select('id')
      .eq('verified', true)
      .ilike('name', `%${p.term}%`)
    if (nameProbe && nameProbe.length === 1) {
      await runSearchAndReply(from, { term: p.term, city: null, nationwide: true }, { replyTo: opts?.replyTo })
      return
    }
  }

  if (!p.term && !p.nationwide && p.city) {
    // Town only — ask what they need in that town
    await saveSession(from, 'search_term', { pending_city: p.city })
    await sendAskTerm(from, p.city)
    return
  }

  if (!p.term) {
    if (p.nationwide) {
      await saveSession(from, 'search_term', { pending_city: '' })
      await sendAskTerm(from, null)
    } else {
      await sendWhatsAppMessage(
        from,
        'Tell me what you need + your town, e.g. *"bread chinhoyi"* or *"plumber harare"*.',
        opts?.replyTo
      )
    }
    return
  }

  if (!p.nationwide && !p.city) {
    // Product/service only — ask for the town first (plus the share-location
    // fast path that ranks matches by real distance).
    await saveSession(from, 'search_loc', { pending_search_term: p.term })
    await sendAskTown(from, p.term, false, true)
    return
  }

  await runSearchAndReply(from, p, { replyTo: opts?.replyTo })
}

async function sendResultDetail(
  from: string,
  session: ChatSession,
  pick: number
) {
  const results = session.data.results || []
  const stub = results[pick - 1]
  const supabase = getSupabase()
  const { data: row } = await supabase
    .from('businesses')
    .select(BOT_BIZ_COLUMNS)
    .eq('id', stub.id)
    .maybeSingle()
  const b = row as BotBusinessRow | null

  if (!b) {
    await sendWhatsAppMessage(from, 'That listing is not available anymore. Type your search again.')
    await clearSession(from)
    return
  }

  const { data: itemRows } = await supabase
    .from('business_items')
    .select('name, price')
    .eq('business_id', b.id)
    .eq('is_active', true)
    .not('price', 'is', null)
    .order('price', { ascending: true })
    .limit(3)

  await saveSession(from, 'browse', { ...session.data, lastScreen: 'detail' })

  // One interactive item only: the Chat on WhatsApp button (the old
  // Back/New-search row is gone — typed replies cover those actions).
  const msg = renderDetailCard({
    name: b.name,
    slug: b.slug,
    city: b.city,
    area: b.area,
    rating: b.rating,
    reviewCount: b.review_count,
    items: ((itemRows as { name: string; price: number | null }[]) || []).slice(),
    phone: b.phone,
    phoneType: b.phone_type,
    socials: Array.isArray(b.socials) ? b.socials : [],
  })
  await sendWhatsAppMessage(from, msg)

  // Native "Chat on WhatsApp" button (cta_url) — the card's only button.
  // Voice-only listings have nothing to chat with, so they skip it.
  const digits = (b.phone || '').replace(/[^0-9]/g, '')
  if (digits && b.phone_type !== 'voice') {
    await sendCtaUrl(
      from,
      `Start a WhatsApp chat with *${b.name}* — or type a new search anytime.`,
      '💬 Chat on WhatsApp',
      chatCtaUrl(b.id, from)
    )
  }

  // Selection analytics — 'bot_select' requires migration 023 to be applied;
  // the insert is best-effort so nothing breaks before then.
  try {
    await supabase
      .from('stats_events')
      .insert({ business_id: b.id, type: 'bot_select', category: '', city: b.city || '' })
  } catch {}
}

async function publishBusiness(from: string, session: ChatSession, msgId?: string) {
  const data = session.data
  const name = data.name?.trim() || ''
  const description = data.description?.trim() || ''
  const city = data.city || ''
  const area = data.area || ''
  const wholeCountry = data.whole_country === true
  const countryCode = data.country_code || COUNTRY_CODE
  // Both flows store phones here — the guided flow collects national digits,
  // the form flow stores full '263…' numbers. Normalize to national.
  const rawPhone = (data.phone || '').replace(/[^0-9]/g, '')
  const phone = rawPhone.startsWith('263') ? rawPhone.slice(3) : rawPhone

  // One code path for listings, webapp and WhatsApp: the shared engine owns
  // validation, business-id/username/slug generation, payment_status rules
  // (pending unless Yellow Pages), auto-website copy and admin alerts.
  const result = await createListing({
    name,
    countryCode,
    phone,
    categories: data.categories && data.categories.length ? data.categories : [data.category || 'Other'],
    city: wholeCountry ? '*' : city || undefined,
    pendingCity: !wholeCountry && !!city && !zimbabweCities.some(c => c.name === city),
    areas: city ? [area].filter(Boolean) : [],
    description,
    whatsappUsername: data.whatsapp_username || '',
    requestedUsername: data.whatsapp_username || '',
    priceRange: typeof data.price_range === 'string' ? data.price_range : undefined,
    website: typeof data.website === 'string' ? data.website : undefined,
    address: typeof data.address === 'string' ? data.address : undefined,
    phoneType: data.phone_type === 'voice' ? 'voice' : 'whatsapp',
    logoUrl: typeof data.list?.logo === 'string' ? data.list.logo : undefined,
    generateSite: true,
    notify: false,
  })

  if ('error' in result) {
    console.error('[webhook] register insert failed:', result.error)
    await sendWhatsAppMessage(from, 'Sorry, something went wrong saving your listing. Please try again later.')
    return
  }

  const businessId = result.id
  const token = result.editToken
  const slug = result.slug

  // Auto-request unapproved category / area so admins can review them
  if (businessId) {
    const { data: bizRow } = await getSupabase()
      .from('businesses')
      .select('category, city, location, phone')
      .eq('id', businessId)
      .maybeSingle()
    const approvedCats = await getApprovedCategories()
    const cats = Array.isArray(bizRow?.category) ? (bizRow!.category as string[]) : []
    for (const category of cats) {
      if (!approvedCats.some(c => c.name === category)) {
        try {
          await getSupabase().from('feature_requests').insert({
            type: 'category', name: category, city: '', business_id: businessId, status: 'pending',
          })
        } catch {}
      }
    }
    const approvedAreas = await getApprovedAreas()
    if (city && area) {
      const approvedAreaNames = new Set(approvedAreas.filter(a => a.city === city).map(a => a.name))
      if (!approvedAreaNames.has(area)) {
        try {
          await getSupabase().from('feature_requests').insert({
            type: 'area', name: area, city, business_id: businessId, status: 'pending',
          })
        } catch {}
      }
    }
  }

  // ✅ React to the tap the user sent — a lightweight thumbs-up confirmation
  // that the form truly landed before the long status message arrives.
  if (msgId) await sendReaction(from, msgId, '✅').catch(() => {})

  await sendWhatsAppMessage(
    from,
    [
      '🎉 *Submitted for Approval!*',
      '',
      `Your business "${name}" is now pending review.`,
      'Once an admin approves it you will get a confirmation here.',
      '',
      result.pendingPayment
        ? '💵 To go live: pay USD 1 — link: ' + SITE_URL + '/pay (manual confirmation; EcoCash on WhatsApp is coming soon)'
        : '⭐ Public-service listing: our team verifies it fast.',
      '',
      `✏️ Save this link to edit your listing later:`,
      `${SITE_URL}/edit?token=${token}`,
      '',
      `🔐 Create your portal account (stats, conversations, ranking):`,
      `${SITE_URL}/account-setup?token=${token}`,
      '',
      `📱 Your QR codes (chat + portal): print them for customers:`,
      `${SITE_URL}/my-qr/${slug}`,
      '',
      'Reply *help* anytime.',
    ].join('\n')
  )

  if (ADMIN_WHATSAPP) {
    sendWhatsAppMessage(
      ADMIN_WHATSAPP,
      [
        result.pendingPayment ? '🆕 NEW BUSINESS PENDING VERIFICATION' : '🚨 YELLOW PAGES SUBMISSION: VERIFY FAST',
        '',
        `Name: ${name}`,
        `Category: ${result.categories.join(', ')}`,
        `Location: ${result.city || 'Zimbabwe (whole country)'}`,
        `Phone: ${phone}`,
        `Approve: ${SITE_URL}/admin`,
        result.isYellowPages ? 'Public-service listing: verify ASAP for the Emergency & Essential strip.' : '',
      ].filter(Boolean).join('\n')
    ).catch(() => {})
  }
}

async function continueRegistration(from: string, session: ChatSession, text: string, msgId?: string) {
  const data = session.data
  const t = text.trim()

  switch (session.step) {
    case 'name':
      await saveSession(from, 'username', { ...data, name: t })
      await sendWhatsAppMessage(
        from,
        'Nice! Now your *WhatsApp username* (the one shown on your WhatsApp Business profile).'
      )
      break

    case 'username':
      if (!/^[a-zA-Z0-9_]{3,}$/.test(t)) {
        await sendWhatsAppMessage(from, 'Username must be letters, numbers or underscores (min 3). Try again:')
        break
      }
      await saveSession(from, 'phone', { ...data, whatsapp_username: t })
      await sendWhatsAppMessage(
        from,
        `Got it *@${t}*. Now your *phone number* (e.g. 712345678). Customers will use it to WhatsApp you.`
      )
      break

    case 'phone': {
      const digits = t.replace(/[^0-9]/g, '')
      const err = validatePhone(COUNTRY_CODE, digits)
      if (err) {
        await sendWhatsAppMessage(from, `${err}. Try again (e.g. 712345678):`)
        break
      }
      await saveSession(from, 'category', { ...data, phone: digits, country_code: COUNTRY_CODE })
      await sendWhatsAppMessage(
        from,
        'What do you sell? e.g. *phones, plumbing, catering, magetsi, salon*...'
      )
      break
    }

    case 'category': {
      const approved = await getApprovedCategories()
      const category = matchCategoryAgainst(t, approved)
      if (category === 'Other') {
        const list = approved
          .filter(c => c.name !== 'Other')
          .slice(0, 12)
          .map(c => `${c.icon} ${c.name}`)
          .join('\n')
        await sendWhatsAppMessage(from, `I couldn't place that category. Choose one:\n\n${list}\n\nType the category name:`)
        break
      }
      await saveSession(from, 'description', { ...data, category })
      await sendWhatsAppMessage(from, `*${category}*! Great, now describe your business in one or two sentences (what you offer):`)
      break
    }

    case 'description':
      if (t.length < 10) {
        await sendWhatsAppMessage(from, 'Please give a slightly longer description of what you offer:')
        break
      }
      await saveSession(from, 'city', { ...data, description: t })
      {
        const cities = zimbabweCities.slice(0, 8).map(c => c.name).join(', ')
        await sendWhatsAppMessage(
          from,
          `Which town or city are you based in?\n\n${cities}...\n\nOr type *whole country*`
        )
      }
      break

    case 'city': {
      if (/(whole country|anywhere|zimbabwe|everywhere)/.test(t.toLowerCase()) || t === '*') {
        const merged: ChatSessionData = { ...data, city: '', area: '' }
        await saveSession(from, 'confirm', merged)
        await sendConfirmation(from, merged)
        break
      }
      const city = findCity(t)
      if (!city) {
        const cities = zimbabweCities.slice(0, 8).map(c => c.name).join(', ')
        await sendWhatsAppMessage(from, `I couldn't find that town. Pick one:\n\n${cities}...\n\nOr type *whole country*`)
        break
      }
      const cityObj = zimbabweCities.find(c => c.name === city)
      if (cityObj && cityObj.areas.length > 0) {
        await saveSession(from, 'area', { ...data, city })
        const areas = cityObj.areas.slice(0, 12).join(', ')
        await sendWhatsAppMessage(
          from,
          `*${city}*: which area?\n\n${areas}...\n\nOr type *skip* for the whole city.`
        )
      } else {
        const merged: ChatSessionData = { ...data, city, area: '' }
        await saveSession(from, 'confirm', merged)
        await sendConfirmation(from, merged)
      }
      break
    }

    case 'area': {
      const city = data.city || ''
      if (/(skip|none|whole country|anywhere)/.test(t.toLowerCase())) {
        const merged: ChatSessionData = { ...data, area: '' }
        await saveSession(from, 'confirm', merged)
        await sendConfirmation(from, merged)
        break
      }
      const area = findArea(city, t)
      if (!area) {
        await sendWhatsAppMessage(from, `I couldn't match that area in *${city}*. Type one of the areas listed, or *skip*.`)
        break
      }
      const merged: ChatSessionData = { ...data, area }
      await saveSession(from, 'confirm', merged)
      await sendConfirmation(from, merged)
      break
    }

    case 'confirm': {
      if (/^(yes|y|publish|confirm|go)/i.test(t)) {
        await publishBusiness(from, session, msgId)
        await clearSession(from)
      } else if (/^(no|n|cancel)/i.test(t)) {
        await clearSession(from)
        await sendWhatsAppMessage(from, 'Registration cancelled. Send *register* to start again, or *help*.')
      } else {
        await sendConfirmation(from, data)
      }
      break
    }

    default:
      await clearSession(from)
      await sendWhatsAppMessage(from, await helpText())
  }
}

async function sendConfirmation(from: string, data: ChatSessionData) {
  const location = data.city ? [data.area, data.city, 'Zimbabwe'].filter(Boolean).join(', ') : 'Zimbabwe'
  const lines = [
    '*Please confirm your details:*',
    '',
    `🏢 *${data.name}*`,
    `📱 @${data.whatsapp_username}`,
    `☎️ ${data.country_code || COUNTRY_CODE} ${data.phone}`,
    `🏷️ ${data.category}`,
    `📍 ${location}`,
    `📝 ${data.description}`,
    '',
    'Reply *YES* to publish (pending approval), or *CANCEL* to start over.',
  ]
  await sendWhatsAppMessage(from, lines.join('\n'))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && WEBHOOK_VERIFY_TOKEN && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  console.warn('Webhook verification failed', { mode, token })
  return new NextResponse('Verification failed', { status: 403 })
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    if (!verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
      console.warn('[webhook] rejected: invalid or missing X-Hub-Signature-256')
      return NextResponse.json({ status: 'unauthorized' }, { status: 401 })
    }
    const body = JSON.parse(rawBody)

    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages) {
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    // Piggyback the idle-nudge sweep on inbound traffic (serverless can't
    // self-wake). Best-effort, never blocks message handling.
    if (value.messages.some((m: { id?: string }) => typeof m.id === 'string' && m.id)) {
      sweepIdleNudges(async (phone, body) => {
        await sendWhatsAppMessage(phone, body)
      })
    }

    for (const message of value.messages) {
      // Meta redelivers webhooks it has not acknowledged in time; record each
      // message id and skip duplicates. Fail-open on DB trouble: a rare
      // duplicate beats a lost customer reply.
      const msgId = typeof message.id === 'string' ? message.id : ''
      if (msgId) {
        const { error: receiptErr } = await getSupabase()
          .from('webhook_receipts')
          .insert({ message_id: msgId })
        if (receiptErr) {
          if (receiptErr.code === '23505') {
            continue
          }
          console.warn('[webhook] receipt insert failed (fail-open):', receiptErr.message)
        }
      }

      const from = typeof message.from === 'string' ? message.from : ''
      // Blue tick straight away, before any processing latency builds up.
      if (msgId) markRead(msgId).catch(() => {})
      try {
        const text = (message.text?.body || '').trim()
        const lower = text.toLowerCase()
        // Native taps arrive as interactive replies carrying a deterministic id
        // (set by our own list/button payloads). They route beside plain text.
        const action =
          message.interactive?.button_reply?.id ||
          message.interactive?.list_reply?.id ||
          ''
        // Voice notes and photos become intent (search or registration input).
        const mediaKind: MediaKind | null =
          message.type === 'audio' ? 'audio' : message.type === 'image' ? 'image' : null
        // Shared location (from the 📍 Near me prompt or the phone's
        // location picker) drives distance-ranked searches.
        const location: { lat: number; lng: number } | null =
          message.type === 'location' &&
          Number.isFinite(Number(message.location?.latitude)) &&
          Number.isFinite(Number(message.location?.longitude))
            ? { lat: Number(message.location.latitude), lng: Number(message.location.longitude) }
            : null

        if (!text && !action && !mediaKind && !location) continue

        console.log(
          `WhatsApp message from ${from}: ${text || `[${action || (mediaKind === 'audio' ? 'voice note' : mediaKind === 'image' ? 'photo' : 'location')}]`}`
        )

        // Word-for-word inbound record (fail-open) for the admin transcript view.
        logBotMessage(
          from,
          'in',
          text ? 'text' : mediaKind === 'audio' ? 'voice' : mediaKind === 'image' ? 'image' : location ? 'location' : action ? 'tap' : 'other',
          text || action || `[${mediaKind === 'audio' ? 'voice note' : mediaKind === 'image' ? 'photo' : 'location'}]`
        ).catch(() => {})

        // Customer base: one row per number, profile name when Meta send it.
        const waName = value.contacts?.find((c: { wa_id?: string }) => c.wa_id === from)?.profile?.name || ''
        let contactSession = await getSession(from)
        if (lower === 'stop') {
          await markBotContactOptOut(from)
          await clearSession(from)
          await sendWhatsAppMessage(from, 'Okay 👌 You will not hear from us again. Reply *help* if you ever want to browse again.')
          continue
        } else {
          await upsertBotContact(from, waName, contactSession?.step || '')
        }
        let session = contactSession

        // ── Admin command suite (owner + allowlisted numbers) ───────────
        if (await isBotAdmin(from)) {
          if (await handleAdminCommand(from, text)) {
            continue
          }
          // Admins fall through: their phone works as a normal user too.
        }

        if (action) {
          await handleAction(from, session, action, msgId)
          continue
        }

        // Greeting-only messages ("hi", "mangwanani", "sawubona"…) reset to
        // plain instructions from ANY state — the two ways to find things
        // typed out, greeting word mirrored, profile name when Meta sends it.
        let greetBody = renderGreetingBody(text, waName)
        if (greetBody && !waName) {
          const contactName = await getBotContactName(from)
          if (contactName) greetBody = renderGreetingBody(text, contactName) || greetBody
        }
        if (greetBody) {
          await clearSession(from)
          const ch = await channelLine()
          await sendWhatsAppMessage(from, [renderWelcomeInstructions(greetBody), ch].filter(Boolean).join('\n\n'))
          continue
        }

        // Shared location drives distance-ranked near-me searches.
        if (location) {
          await handleBotLocation(from, session, location, msgId)
          continue
        }

        // Voice note / photo: search intent outside registration, form input
        // + logo while filling the listing form.
        if (mediaKind) {
          await handleBotMedia(from, session, message, msgId)
          continue
        }

        // 🛒 Need intake (S16): buyers type one line, confirm card follows.
        if (session?.step === 'need_form') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText())
            continue
          }
          await handleNeedFormText(from, session, text)
          continue
        }

        // Any "RQ-…" message: supplier quoting, buyer stop/reopen, filled
        // notices. Checked before other flows so wa.me deep links always win.
        const rqHandled = await handleRqText(from, waName, text)
        if (rqHandled) {
          continue
        }

        if (session?.step === 'rating') {
          if (lower === 'cancel' || lower === 'help' || lower === 'back') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText())
            continue
          }
          await handleRatingReply(from, session, text)
          continue
        }

        // ── Bot search conversation steps ───────────────────────────────
        if (session?.step === 'search_loc') {
          // Waiting for the user's town (term already captured)
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText())
            continue
          }
          if (lower === 'back' || lower === '0') {
            await startFreshSearchPrompt(from)
            continue
          }
          const p = parseQuery(text)
          if (p.nationwide || p.city) {
            const pendingTerm = session.data.pending_search_term || ''
            if (p.term) {
              // The reply was a full query — honor the latest intent
              await runSearchAndReply(from, { term: p.term, city: p.city ?? null, nationwide: p.nationwide })
            } else if (pendingTerm) {
              await runSearchAndReply(from, {
                term: pendingTerm,
                city: p.city ?? null,
                nationwide: p.nationwide,
              })
            } else {
              await saveSession(from, 'search_term', { pending_city: p.city || '' })
              await sendAskTerm(from, p.city)
            }
            continue
          }
          // Not a town — re-ask. If the reply itself carries a fresh term,
          // rebind it: "cancel" steps or "plumber" retypes should never leave
          // an older pending term latched on.
          if (p.term && !p.city && !p.nationwide) {
            await saveSession(from, 'search_loc', { pending_search_term: p.term })
          }
          await sendAskTown(from, p.term || session.data.pending_search_term || '', true, true)
          continue
        }

        if (session?.step === 'search_term') {
          // Waiting for the search term (town already captured)
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText())
            continue
          }
          if (lower === 'back' || lower === '0') {
            await startFreshSearchPrompt(from)
            continue
          }
          const p = parseQuery(text)
          const pendingCity = session.data.pending_city || ''
          if (p.term) {
            const city = p.nationwide ? null : p.city ?? (pendingCity || null)
            // A stashed shared-location point makes this term a near-me
            // search when the user didn't specify their own town instead.
            const hasOrigin =
              session.data.origin_lat != null &&
              session.data.origin_lng != null &&
              !pendingCity &&
              !p.nationwide &&
              !p.city
            await runSearchAndReply(from, {
              term: p.term,
              city,
              nationwide: (p.nationwide || (!city && !pendingCity)) && !hasOrigin,
              origin: hasOrigin
                ? { lat: session.data.origin_lat!, lng: session.data.origin_lng! }
                : null,
            })
            continue
          }
          if (p.nationwide) {
            await saveSession(from, 'search_term', { pending_city: '' })
            await sendAskTerm(from, null)
            continue
          }
          if (p.city) {
            // They typed another town — update and keep asking for the term
            await saveSession(from, 'search_term', { pending_city: p.city })
            await sendAskTerm(from, p.city)
            continue
          }
          await sendAskTerm(from, pendingCity || null)
          continue
        }

        if (session?.step === 'browse') {
          // Numbered results are on screen; taps and typed numbers open cards,
          // more/next pages through the stored candidates.
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText())
            continue
          }
          if (lower === 'back' || lower === '0') {
            await goBack(from, session)
            continue
          }
          const results = session.data.results || []
          const page = session.data.page || 0
          if (lower === 'more' || lower === 'next') {
            if (results.length > (page + 1) * RESULTS_PER_PAGE) {
              await saveSession(from, 'browse', { ...session.data, lastScreen: 'list', page: page + 1 })
              await sendResultsListPage(
                from, results, page + 1, session.data.lastTerm || 'search',
                session.data.lastCity ?? null, !!session.data.nearby
              )
            } else {
              await sendWhatsAppMessage(
                from,
                `That's all ${results.length} match${results.length === 1 ? '' : 'es'} — reply a number or tap a business.`
              )
            }
            continue
          }
          const m = text.trim().match(/^([1-9][0-9]?)(?![0-9])/)
          if (m && results.length > 0) {
            const n = Number(m[1])
            // Typed 1-9 = position on the current page; 10-20 = absolute rank.
            const pick = n <= RESULTS_PER_PAGE ? page * RESULTS_PER_PAGE + n : n
            if (pick >= 1 && pick <= results.length) {
              await sendResultDetail(from, session, pick)
              continue
            }
            await sendWhatsAppMessage(from, renderInvalidSelection(results.length))
            continue
          }
          // Anything else is a fresh search — drop the list and re-dispatch
          await clearSession(from)
          session = null
          await dispatchSearch(from, text)
          continue
        }

        // ── Personal contact intake: name + phone (+ city, socials) ─────
        if (session?.step === 'reg_contact') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText())
            continue
          }
          const c = parseContactLine(text)
          if (!c) {
            await sendWhatsAppMessage(
              from,
              [
                "I need the contact's name and phone. e.g.",
                '*Tendai Ncube 0771 234 567 Harare*',
                '',
                'Add socials too if you like: *IG @tendai* or *fb tendai*.',
              ].join('\n')
            )
            continue
          }
          await saveSession(from, 'reg_contact', { contact: c })
          const socialLines = (c.socials || []).slice(0, 3).map(s => `🔗 ${s}`)
          await sendInteractiveButtons(
            from,
            [
              `*${c.name}* ${c.city ? `📍 ${c.city}` : '📍 Zimbabwe'}`,
              `📱 +${c.phone.startsWith('263') ? c.phone : '263' + c.phone.replace(/^0/, '')}`,
              ...socialLines,
              '',
              'Personal contact pricing:',
              '• USD 0.20 per month, or',
              '• USD 1.00 for a full year',
              'Paid via EcoCash — you enter the PIN now.',
              '',
              'Ready to go live?',
            ].join('\n'),
            [
              { id: 'reg_contact_pay_monthly', title: 'Pay 20c · 1 month' },
              { id: 'reg_contact_pay_year', title: 'Pay $1 · 12 months' },
              { id: 'reg_contact_fix', title: '✎ Fix details' },
            ]
          )
          continue
        }

        // ── Living list-form: parse + re-render after every reply ──────
        if (session?.step === 'list_form') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText())
            continue
          }
          if (/^(publish|submit|yes|y|go live)\b/.test(lower)) {
            await tryPublishForm(from, session)
            continue
          }
          await handleListFormText(from, session, text)
          continue
        }

        // ── Pay flow: typed answers mirror the tap handlers ─────────────
        if (session?.step === 'pay_search') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText())
            continue
          }
          await handlePaySearchText(from, session, text)
          continue
        }
        if (session?.step === 'pay_pick') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText())
            continue
          }
          const mPick = lower.match(/^([1-9])$/)
          if (mPick) {
            await selectPayCandidate(from, session, Number(mPick[1]))
          } else {
            // Not a pick — treat as a brand-new search query
            await clearSession(from)
            session = null
            await dispatchSearch(from, text)
          }
          continue
        }
        if (session?.step === 'pay_plan') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText())
            continue
          }
          const plan = canonicalPlan(text)
          if (plan) {
            await askEcoCashNumber(from, session.data.pay_business, plan, session.data)
          } else {
            await sendWhatsAppMessage(from, 'Tap a plan above, or reply *1*, *6* or *12*.')
          }
          continue
        }
        if (session?.step === 'pay_ecocash') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText())
            continue
          }
          await handleEcoCashText(from, session, text)
          continue
        }

        if (session?.step && lower !== 'cancel' && lower !== 'help') {
          await continueRegistration(from, session, text, msgId)
          continue
        }

        if (session?.step && (lower === 'cancel' || lower === 'help')) {
          await clearSession(from)
          await sendWhatsAppMessage(from, await helpText())
          continue
        }

        // Pay intent before everything else free-text: "I want to pay", renew,
        // subscription… all open the same two-way question.
        if (/\b(?:pay|payment|paynow|pay now|subscription|subscribe|renew|ecocash|top ?up)\b/.test(lower)) {
          appendTranscript(from, text)
          await startPayChoice(from)
          continue
        }

        if (/^(register|list me|list my|list on|get listed|add my business|sign me up|advertise\b|sell\b.*\b(list|advertise|get listed)\b|i want to (list|sell|advertise)|join\b)\b/.test(lower) || lower === 'list') {
          await startRegister(from, text)
          continue
        }

        if (lower === 'menu' || lower === 'hi' || lower === 'hello') {
          await sendMainMenu(from)
          continue
        }

        if (lower === 'help') {
          await sendWhatsAppMessage(from, await helpText())
          continue
        }

        // Search-first: any text that parses as a search runs the search, even
        // when a rating prompt is due; only clearly non-search text may prompt
        // a pending rating (which otherwise never blocks).
        const parsedTail = parseQuery(text)
        if (parsedTail.term || parsedTail.city || parsedTail.nationwide) {
          appendTranscript(from, text)
          await dispatchSearch(from, text)
          continue
        }
        appendTranscript(from, text)
        const ratingSession = await promptRatingIfDue(from)
        if (ratingSession?.step === 'rating') {
          continue
        }

        await dispatchSearch(from, text)
      } catch (err) {
        console.error('[webhook] message error:', err)
        try {
          if (from) await sendWhatsAppMessage(from, renderErrorCard())
        } catch {}
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  }
}
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { sendWhatsAppMessage, sendInteractiveList, sendInteractiveButtons, sendCtaUrl } from '@/lib/whatsapp'
import { orderSearchResults } from '@/lib/ranking'
import type { Business } from '@/types'
import { getSession, saveSession, clearSession, type ChatSession, type ChatSessionData } from '@/lib/chat-session'
import { getSupabase } from '@/lib/supabase-server'
import { upsertBotContact, markBotContactOptOut, sweepIdleNudges } from '@/lib/bot-contacts'
import { createListing } from '@/lib/listing-create'
import {
  parseListingMessage,
  renderListingForm,
  renderMissingRequiredList,
  missingRequired,
  LIST_INTRO,
  type ListingFormState,
} from '@/lib/listing-intake'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import { validatePhone } from '@/data/countries'
import { getApprovedCategories, getApprovedAreas, matchCategoryAgainst } from '@/lib/approved-data'
import { SITE_URL } from '@/lib/site-url'
import { digitsOnly } from '@/lib/phone'
import {
  CHAT_OPEN_MARKER,
  renderResultsListBody,
  renderNearbyListBody,
  resultRows,
  RESULTS_PER_PAGE,
  renderMainMenuBody,
  renderDetailCard,
  renderChatPrompt,
  chatCtaUrl,
  renderEmptyResults,
  renderInvalidSelection,
  renderErrorCard,
  FALLBACK_HELP_LINES,
  type ResultCard,
} from '@/lib/bot-templates'

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
}

const BOT_BIZ_COLUMNS =
  'id, name, slug, category, city, area, price_range, rating, review_count, phone, phone_type, lat, lng'

interface ParsedQuery {
  term: string
  city: string | null
  nationwide: boolean
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

async function sendAskTown(from: string, term: string, again = false) {
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

async function sendMainMenu(from: string) {
  await clearSession(from)
  await sendInteractiveList(
    from,
    renderMainMenuBody(),
    [
      { id: 'menu_search', title: '🔍 Search' },
      { id: 'menu_register', title: '🏪 Register' },
      { id: 'menu_help', title: 'ℹ️ Help' },
    ],
    'Main menu'
  )
}

async function startRegister(from: string, initialText: string = '') {
  const { state } = parseListingMessage(initialText, from)
  await saveSession(from, 'list_form', { list: state } as ChatSessionData)
  await sendFormUpdate(from, state, LIST_INTRO())
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
async function tryPublishForm(from: string, session: ChatSession) {
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
  await publishBusiness(from, { phone: from, step: 'confirm', data: merged })
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
async function handleAction(from: string, session: ChatSession | null, action: string) {
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
    case 'menu_search':
      await startFreshSearchPrompt(from)
      return
    case 'menu_register':
      await clearSession(from)
      await startRegister(from)
      return
    case 'list_publish': {
      if (session?.step === 'list_form') {
        await tryPublishForm(from, session)
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
      await sendWhatsAppMessage(from, HELP_TEXT)
      return
    case 'cancel':
      await clearSession(from)
      await sendWhatsAppMessage(from, HELP_TEXT)
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
      await sendWhatsAppMessage(
        from,
        "That option isn't available. Reply *menu* for the main menu, or send a search."
      )
  }
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
  nearby: boolean
) {
  if (cards.length === 0) return
  const body = nearby
    ? renderNearbyListBody(termDisplay, cityLabel || 'Zimbabwe', cards.length, page)
    : renderResultsListBody(termDisplay, cityLabel, cards.length, page)
  await sendInteractiveList(from, body, resultRows(cards, page), 'Choose a business')
}

async function runSearchAndReply(from: string, p: ParsedQuery) {
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
    await runSearchAndReply(from, { ...p, city: null, nationwide: true })
    return
  }

  let results: BotResult[] = []
  const candidates = scope.filter(b => bizMatchesQuery(b, term, category))
  if (candidates.length > 0) {
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
  } else if (term.length >= 3) {
    const itemMap = await fetchMatchingItems(scope.map(b => b.id), term)
    const ownerIds = new Set(itemMap.keys())
    results = scope.filter(b => ownerIds.has(b.id)).map(b => ({ biz: b, item: itemMap.get(b.id)! }))
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
    await sendWhatsAppMessage(from, renderEmptyResults(p.term || category.toLowerCase()))
    return
  }

  const cards = results.map(toCard)
  const prev = await getSession(from)
  await saveSession(from, 'browse', {
    ...pendingFields(prev),
    results: cards,
    lastScreen: 'list',
    lastTerm: termDisplay,
    lastCity: city,
    nearby: false,
    page: 0,
  })
  await sendResultsListPage(from, cards, 0, termDisplay, city, false)
  recordBotEvents(results.map(r => r.biz)).catch(() => {})
}

async function dispatchSearch(from: string, text: string) {
  const p = parseQuery(text)

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
      await runSearchAndReply(from, { term: p.term, city: null, nationwide: true })
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
        'Tell me what you need + your town, e.g. *"bread chinhoyi"* or *"plumber harare"*.'
      )
    }
    return
  }

  if (!p.nationwide && !p.city) {
    // Product/service only — ask for the town first
    await saveSession(from, 'search_loc', { pending_search_term: p.term })
    await sendAskTown(from, p.term)
    return
  }

  await runSearchAndReply(from, p)
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

async function publishBusiness(from: string, session: ChatSession) {
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

async function continueRegistration(from: string, session: ChatSession, text: string) {
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
        await publishBusiness(from, session)
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
      await sendWhatsAppMessage(from, HELP_TEXT)
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
      try {
        const text = (message.text?.body || '').trim()
        const lower = text.toLowerCase()
        // Native taps arrive as interactive replies carrying a deterministic id
        // (set by our own list/button payloads). They route beside plain text.
        const action =
          message.interactive?.button_reply?.id ||
          message.interactive?.list_reply?.id ||
          ''

        if (!text && !action) continue

        console.log(`WhatsApp message from ${from}: ${text || `[${action}]`}`)

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

        if (action) {
          await handleAction(from, session, action)
          continue
        }

        if (session?.step === 'rating') {
          if (lower === 'cancel' || lower === 'help' || lower === 'back') {
            await clearSession(from)
            await sendWhatsAppMessage(from, HELP_TEXT)
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
            await sendWhatsAppMessage(from, HELP_TEXT)
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
          // Not a town — re-ask
          await sendAskTown(from, session.data.pending_search_term || '', true)
          continue
        }

        if (session?.step === 'search_term') {
          // Waiting for the search term (town already captured)
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, HELP_TEXT)
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
            await runSearchAndReply(from, {
              term: p.term,
              city,
              nationwide: p.nationwide || (!city && !pendingCity),
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
            await sendWhatsAppMessage(from, HELP_TEXT)
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

        // ── Living list-form: parse + re-render after every reply ──────
        if (session?.step === 'list_form') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, HELP_TEXT)
            continue
          }
          if (/^(publish|submit|yes|y|go live)\b/.test(lower)) {
            await tryPublishForm(from, session)
            continue
          }
          await handleListFormText(from, session, text)
          continue
        }

        if (session?.step && lower !== 'cancel' && lower !== 'help') {
          await continueRegistration(from, session, text)
          continue
        }

        if (session?.step && (lower === 'cancel' || lower === 'help')) {
          await clearSession(from)
          await sendWhatsAppMessage(from, HELP_TEXT)
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
          await sendWhatsAppMessage(from, HELP_TEXT)
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
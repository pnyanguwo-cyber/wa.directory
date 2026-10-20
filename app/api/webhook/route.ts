import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { sendWhatsAppMessage, sendInteractiveList, sendInteractiveButtons } from '@/lib/whatsapp'
import { getSession, saveSession, clearSession, type ChatSession, type ChatSessionData } from '@/lib/chat-session'
import { getSupabase } from '@/lib/supabase-server'
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
  renderMainMenuBody,
  renderDetailCard,
  renderEmptyResults,
  renderInvalidSelection,
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

  await supabase.from('ratings').insert({
    business_id: business.id,
    customer_phone: from,
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

async function startRegister(from: string) {
  await saveSession(from, 'name', {})
  await sendWhatsAppMessage(
    from,
    [
      "Great, let's list your business on WA Directory! 🎉",
      '',
      'First, what is your *business name*?',
      'Send *cancel* anytime to stop.',
    ].join('\n')
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
      await sendInteractiveList(
        from,
        renderResultsListBody(data.lastTerm || 'search', data.lastCity ?? null, cards.length),
        resultRows(cards),
        'Choose a business'
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
  const sel = action.match(/^sel_([1-9])$/)
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
    case 'new_search':
    case 'menu_search':
      await startFreshSearchPrompt(from)
      return
    case 'menu_register':
      await clearSession(from)
      await startRegister(from)
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

async function runSearchAndReply(from: string, p: ParsedQuery) {
  const supabase = getSupabase()
  const term = p.term.toLowerCase()
  const city = p.nationwide ? null : p.city

  // - Tier A: in-town category/name matches, best rated first
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
    candidates.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    const itemMap = await fetchMatchingItems(candidates.map(b => b.id), term)
    results = candidates.map(b => ({ biz: b, item: itemMap.get(b.id) || null }))
  } else if (term.length >= 3) {
    const itemMap = await fetchMatchingItems(scope.map(b => b.id), term)
    const ownerIds = new Set(itemMap.keys())
    results = scope.filter(b => ownerIds.has(b.id)).map(b => ({ biz: b, item: itemMap.get(b.id)! }))
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
        .slice(0, 3)
      const termDisplay = p.term || category.toLowerCase()
      const cards = results.map(toCard)
      const prev = await getSession(from)
      await saveSession(from, 'browse', {
        ...pendingFields(prev),
        results: cards,
        lastScreen: 'list',
        lastTerm: termDisplay,
        lastCity: city,
      })
      await sendInteractiveList(
        from,
        renderNearbyListBody(termDisplay, city, cards.length),
        resultRows(cards),
        'Choose a business'
      )
      recordBotEvents(results.map(r => r.biz)).catch(() => {})
      return
    }
  }

  if (results.length === 0) {
    await sendWhatsAppMessage(from, renderEmptyResults(p.term || category.toLowerCase()))
    return
  }

  const top = results.slice(0, 5)
  const termDisplay = p.term || category.toLowerCase()
  const prev = await getSession(from)
  const cards = top.map(toCard)
  await saveSession(from, 'browse', {
    ...pendingFields(prev),
    results: cards,
    lastScreen: 'list',
    lastTerm: termDisplay,
    lastCity: city,
  })
  await sendInteractiveList(
    from,
    renderResultsListBody(termDisplay, city, cards.length),
    resultRows(cards),
    'Choose a business'
  )
  recordBotEvents(top.map(r => r.biz)).catch(() => {})
}

async function dispatchSearch(from: string, text: string) {
  const p = parseQuery(text)

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
    .select(`${BOT_BIZ_COLUMNS}, whatsapp_link`)
    .eq('id', stub.id)
    .maybeSingle()
  const b = row as (BotBusinessRow & { whatsapp_link: string | null }) | null

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
    chatLink: b.whatsapp_link,
  })
  if (msg.length <= 1020) {
    await sendInteractiveButtons(from, msg, [
      { id: 'back', title: '⬅ Back' },
      { id: 'new_search', title: '↺ New search' },
    ])
  } else {
    await sendWhatsAppMessage(from, msg)
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
  const username = data.whatsapp_username?.trim() || ''
  const category = data.category || 'Other'
  const description = data.description?.trim() || ''
  const city = data.city || ''
  const area = data.area || ''
  const countryCode = data.country_code || COUNTRY_CODE
  const phone = (data.phone || '').replace(/[^0-9]/g, '')
  const fullPhone = (countryCode + phone).replace(/[^0-9]/g, '')
  const token = crypto.randomUUID()
  const slug = `${generateSlug(name)}-${Math.random().toString(36).slice(2, 8)}`
  const location = city ? [area, city, 'Zimbabwe'].filter(Boolean).join(', ') : 'Zimbabwe'

  const { data: inserted, error } = await getSupabase().from('businesses').insert({
    name,
    slug,
    whatsapp_username: username,
    bio: `Professional ${description} services.`,
    category: [category],
    location,
    country_code: countryCode,
    city: city || '',
    area: city ? area : '',
    areas: city ? [area].filter(Boolean) : [],
    phone: fullPhone,
    whatsapp_link: `https://wa.me/${fullPhone}?text=${encodeURIComponent('Hi, I found you on WA Directory')}`,
    catalog_link: null,
    logo_url: null,
    price_range: null,
    edit_token: token,
    verified: false,
    rating: 0,
    review_count: 0,
  }).select('id')

  if (error) {
    console.error('[webhook] register insert failed:', error.message)
    await sendWhatsAppMessage(from, 'Sorry, something went wrong saving your listing. Please try again later.')
    return
  }

  // Auto-request unapproved category / area so admins can review them
  const businessId = inserted?.[0]?.id
  if (businessId) {
    const [approvedCats, approvedAreas] = await Promise.all([
      getApprovedCategories(),
      getApprovedAreas(),
    ])
    const approvedCatNames = new Set(approvedCats.map(c => c.name))
    if (!approvedCatNames.has(category)) {
      try {
        await getSupabase().from('feature_requests').insert({
          type: 'category', name: category, city: '', business_id: businessId, status: 'pending',
        })
      } catch {}
    }
    if (area && city) {
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
        '🆕 NEW BUSINESS PENDING VERIFICATION',
        '',
        `Name: ${name}`,
        `Category: ${category}`,
        `Location: ${location}`,
        `Phone: ${fullPhone}`,
        `Approve: ${SITE_URL}/admin`,
      ].join('\n')
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

    for (const message of value.messages) {
      const from = message.from
      const text = (message.text?.body || '').trim()
      // Native taps arrive as interactive replies carrying a deterministic id
      // (set by our own list/button payloads). They route beside plain text.
      const action =
        message.interactive?.button_reply?.id ||
        message.interactive?.list_reply?.id ||
        ''

      if (!text && !action) continue

      console.log(`WhatsApp message from ${from}: ${text || `[${action}]`}`)

      let session = await getSession(from)
      const lower = text.toLowerCase()

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

      // ── Bot search conversation steps ─────────────────────────────────
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
        // Numbered results are on screen; "1"-"5" opens the contact card
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
        const m = text.trim().match(/^([1-9])(?![0-9])/)
        if (m && results.length > 0) {
          const pick = Number(m[1])
          if (pick <= results.length) {
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

      if (session?.step && lower !== 'cancel' && lower !== 'help') {
        await continueRegistration(from, session, text)
        continue
      }

      if (session?.step && (lower === 'cancel' || lower === 'help')) {
        await clearSession(from)
        await sendWhatsAppMessage(from, HELP_TEXT)
        continue
      }

      if (/^(register|list me|list|sign me up|add my business)/.test(lower)) {
        await startRegister(from)
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

      appendTranscript(from, text)
      const ratingSession = await promptRatingIfDue(from)
      if (ratingSession?.step === 'rating') {
        continue
      }

      await dispatchSearch(from, text)
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
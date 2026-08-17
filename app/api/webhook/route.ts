import { NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { getSession, saveSession, clearSession, type ChatSession, type ChatSessionData } from '@/lib/chat-session'
import { getSupabase } from '@/lib/supabase-server'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import { validatePhone } from '@/data/countries'
import { BUSINESS_CARD_COLUMNS } from '@/lib/business-select'
import { getApprovedCategories, getApprovedAreas, matchCategoryAgainst } from '@/lib/approved-data'

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'wa-directory-verify-2024'
const SITE_URL = process.env.SITE_URL || 'https://wadirectory.co.zw'
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP
const COUNTRY_CODE = '+263'

const STOPWORDS = new Set([
  'i', 'am', 'im', 'looking', 'for', 'a', 'an', 'the', 'find', 'in', 'at', 'near',
  'me', 'please', 'help', 'need', 'want', 'to', 'and', 'or', 'is', 'are', 'with',
  'some', 'get', 'any', 'have', 'just', 'like', 'of', 'on', 'my', 'your',
])

const HELP_TEXT = [
  '*WA Directory Bot* 🤖',
  'Find any business on WhatsApp or list your own.',
  '',
  '*Search:* type what you need + town',
  'e.g. "phone harare", "plumber in bulawayo", "i am looking for a salon"',
  '',
  '*List your business:* send *register*',
  '*Cancel:* send *cancel*  |  *Help:* send *help*',
  '',
  `Website: ${SITE_URL}`,
].join('\n')

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50) || 'business'
  )
}

function cleanQuery(text: string, cityName?: string): string {
  let t = text.toLowerCase()
  if (cityName) t = t.replace(new RegExp(cityName.toLowerCase(), 'g'), ' ')
  const words = t.split(/[^a-z0-9]+/).filter(w => w.length > 1 && !STOPWORDS.has(w))
  return words.join(' ')
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
      return last && typeof last === 'object' && (last as any).from === 'bot' && String((last as any).text || '').includes('opened your chat')
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
      `How was your experience with *${business.name}*? Reply a number *1–5* (1 = poor, 5 = excellent), or *skip*.`
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
      return last && typeof last === 'object' && (last as any).from === 'bot' && String((last as any).text || '').includes('opened your chat')
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
        `Rate your experience 1–5 (1 = poor, 5 = excellent), add a short comment if you like, or reply *skip*.`,
      ].join('\n')
    )
    return { phone: from, step: 'rating', data: { rating_pending: opened.business_id } }
  } catch {
    return null
  }
}

async function sendSearchResults(from: string, text: string) {
  const city = findCity(text)
  const query = cleanQuery(text, city || undefined)
  const approved = await getApprovedCategories()
  const category = matchCategoryAgainst(query || text, approved)

  const orFilters: string[] = []
  if (query) {
    orFilters.push(`name.ilike.%${query}%`)
    orFilters.push(`bio.ilike.%${query}%`)
  }
  if (category !== 'Other') orFilters.push(`category.cs.{${category}}`)
  if (city) {
    orFilters.push(`city.ilike.%${city}%`)
    orFilters.push(`location.ilike.%${city}%`)
    orFilters.push(`area.ilike.%${city}%`)
  }

  const supabase = getSupabase()
  let req = supabase.from('businesses').select(BUSINESS_CARD_COLUMNS).eq('verified', true)
  if (orFilters.length > 0) req = req.or(orFilters.join(','))
  req = req.order('rating', { ascending: false }).limit(5)

  const { data: businesses } = await req

  if (!businesses || businesses.length === 0) {
    await sendWhatsAppMessage(
      from,
      [
        `No results found for *"${text}"*.`,
        '',
        'Try: "find plumber in bulawayo", "phone harare", or "catering in chitungwiza".',
        'Send *help* for tips.',
      ].join('\n')
    )
    return
  }

  recordBotEvents(businesses)

  const lines: string[] = []
  lines.push(
    `Top ${businesses.length} result${businesses.length > 1 ? 's' : ''} for *${query || category}*${city ? ` in *${city}*` : ''}:`
  )
  businesses.forEach((b, i) => {
    const area = [b.area, b.city].filter(Boolean).join(', ') || b.location || 'Zimbabwe'
    const chatLink = b.phone
      ? `https://wa.me/${String(b.phone).replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I found you on WA Directory')}`
      : `${SITE_URL}/go/${b.id}`
    lines.push(
      [
        `${i + 1}. *${b.name}*`,
        `📍 ${area}`,
        b.price_range ? `💰 ${b.price_range}` : '',
        b.rating > 0 ? `⭐ ${b.rating.toFixed(1)} (${b.review_count || 0})` : '',
        `👉 Chat: ${chatLink}`,
        `🔗 ${SITE_URL}/business/${b.slug || b.id}`,
      ]
        .filter(Boolean)
        .join('\n')
    )
  })
  lines.push('', 'Send *help* for more options.')

  const resultMessage = lines.join('\n\n')
  await sendWhatsAppMessage(from, resultMessage)
  appendTranscript(from, resultMessage, true)
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
      `📱 Your QR codes (chat + portal) — print them for customers:`,
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
      await sendWhatsAppMessage(from, `*${category}*! Great, now describe your business in 1-2 sentences (what you offer):`)
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

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  console.warn('Webhook verification failed', { mode, token })
  return new NextResponse('Verification failed', { status: 403 })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages) {
      return NextResponse.json({ status: 'ok' }, { status: 200 })
    }

    for (const message of value.messages) {
      const from = message.from
      const text = message.text?.body?.trim() || ''

      if (!text) continue

      console.log(`WhatsApp message from ${from}: ${text}`)

      const session = await getSession(from)
      const lower = text.toLowerCase()

      if (session?.step === 'rating') {
        if (lower === 'cancel' || lower === 'help') {
          await clearSession(from)
          await sendWhatsAppMessage(from, HELP_TEXT)
          continue
        }
        await handleRatingReply(from, session, text)
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
        await saveSession(from, 'name', {})
        await sendWhatsAppMessage(
          from,
          [
            'Great, let\'s list your business on WA Directory! 🎉',
            '',
            'First, what is your *business name*?',
            'Send *cancel* anytime to stop.',
          ].join('\n')
        )
        continue
      }

      if (lower === 'help' || lower === 'hi' || lower === 'hello') {
        await sendWhatsAppMessage(from, HELP_TEXT)
        continue
      }

      appendTranscript(from, text)
      const ratingSession = await promptRatingIfDue(from)
      if (ratingSession?.step === 'rating') {
        continue
      }

      await sendSearchResults(from, text)
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
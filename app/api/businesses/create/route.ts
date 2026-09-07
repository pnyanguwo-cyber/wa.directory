import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import { categories as staticCategories } from '@/data/categories'
import { toFullPhone, normalizeVoicePhone } from '@/lib/phone'

// Yellow Pages (special public-service) categories get a priority admin alert
// so councils/police/fire listings are verified fast.
const SPECIAL_CATEGORIES = new Set(staticCategories.filter(c => c.special).map(c => c.name))

const WA_MSG = 'Hi%2C%20I%20found%20you%20on%20WA%20Directory'

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50) || 'business'
  return `${base}-${Math.random().toString(36).slice(2, 8)}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      countryCode,
      phone,
      whatsapp_username,
      description,
      bio,
      categories,
      city,
      pending_city,
      areas,
      catalog_link,
      logo_url,
      price_range,
      website,
      address,
      show_location,
      is_remote,
      phone_type,
      lat,
      lng,
      address_verified,
    } = body || {}

    // --- Validation ---
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return NextResponse.json({ error: 'A business name between 2 and 80 characters is required.' }, { status: 400 })
    }

    if (!Array.isArray(categories) || categories.length === 0 || categories.length > 4 ||
        !categories.every((c: unknown) => typeof c === 'string')) {
      return NextResponse.json({ error: 'Select at least one category.' }, { status: 400 })
    }

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'A WhatsApp phone number is required.' }, { status: 400 })
    }
    const code = typeof countryCode === 'string' && countryCode.startsWith('+') ? countryCode : '+263'
    // Voice listings (landlines & hotlines) are stored in national format and
    // get a Call button instead of WhatsApp; everything else is WhatsApp-first.
    const isVoice = phone_type === 'voice'
    // Accept 077…, +26377…, 26377… etc. — always stored as full international digits.
    const fullPhone = isVoice ? normalizeVoicePhone(phone) : toFullPhone(code, phone)
    if (fullPhone.length < (isVoice ? 3 : 10) || fullPhone.length > 15) {
      return NextResponse.json({ error: 'That phone number looks invalid for the selected country code.' }, { status: 400 })
    }

    const validCityNames = new Set(zimbabweCities.map(c => c.name))
    const isRemote = body.is_remote === true || (typeof city === 'string' && (city === 'remote' || city === '*'))
    const isPendingCity = pending_city === true && typeof city === 'string' && city.trim().length > 0 && city !== 'remote' && city !== '*'
    const cleanCity = typeof city === 'string'
      ? (isRemote ? '' : validCityNames.has(city) ? city : isPendingCity ? city.trim() : '')
      : ''

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch approved category names using the same client.
    const { data: catRows } = await supabase
      .from('categories')
      .select('name')
      .eq('active', true)
    const approvedCategories = new Set((catRows || []).map((r: { name: string }) => r.name))

    const cleanCategories = [...new Set(categories.map((c: string) => c.trim()))]
      .filter(c => approvedCategories.has(c))
    if (cleanCategories.length === 0) {
      return NextResponse.json({ error: 'Selected categories are not on the approved list.' }, { status: 400 })
    }

    let cleanAreas: string[] = []
    if (Array.isArray(areas)) {
      cleanAreas = [...new Set(areas)]
        .filter((a: unknown): a is string => typeof a === 'string' && a.trim().length > 0)
        .map(a => a.trim())
        .slice(0, 8)
    }
    if (isRemote && !cleanCity) cleanAreas = []

    const location = isRemote && !cleanCity
      ? 'Zimbabwe'
      : [cleanAreas.join(', '), cleanCity, 'Zimbabwe'].filter(Boolean).join(', ')

    const price = typeof price_range === 'string' ? price_range.trim() : ''
    const normalizedPrice = price ? (price.startsWith('$') ? price : `$${price}`) : null

    // Only ever generated here — a client-supplied edit_token is ignored.
    const editToken = crypto.randomUUID()

    // Slug collisions are rare (random suffix), but retry a few times regardless.
    let inserted: { id: string; slug: string | null } | null = null
    let lastError: string | null = null
    for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
      const slug = generateSlug(name)
      const { data, error } = await supabase
        .from('businesses')
        .insert({
          name: name.trim(),
          slug,
          whatsapp_username: typeof whatsapp_username === 'string' ? whatsapp_username.trim() : '',
          bio: (typeof bio === 'string' && bio.trim()) ||
            `Professional ${typeof description === 'string' ? description.trim() : ''} services.`.replace('Professional  ', 'Professional '),
          category: cleanCategories,
          location,
          country_code: code,
          city: cleanCity,
          area: cleanAreas.length === 0 ? '' : cleanAreas[0],
          areas: cleanAreas,
          is_remote: isRemote,
          phone: fullPhone,
          phone_type: isVoice ? 'voice' : 'whatsapp',
          whatsapp_link: isVoice ? null : `https://wa.me/${fullPhone}?text=${WA_MSG}`,
          catalog_link: typeof catalog_link === 'string' && catalog_link.trim() ? catalog_link.trim() : null,
          logo_url: typeof logo_url === 'string' && logo_url.trim() ? logo_url.trim() : null,
          price_range: normalizedPrice,
          website: typeof website === 'string' && website.trim() ? website.trim() : null,
          address: typeof address === 'string' ? address.trim() : '',
          lat: typeof lat === 'number' && Number.isFinite(lat) ? lat : null,
          lng: typeof lng === 'number' && Number.isFinite(lng) ? lng : null,
          address_verified: address_verified === true,
          show_location: show_location !== false,
          edit_token: editToken,
          verified: false,
          rating: 0,
          review_count: 0,
        })
        .select('id, slug')
        .single()
      if (!error) inserted = data
      else lastError = error.message
    }

    if (!inserted) {
      return NextResponse.json({ error: lastError || 'Could not create the listing. Please try again.' }, { status: 500 })
    }

    // Yellow Pages submission: priority WhatsApp to the admin (authoritative —
    // sent server-side so it fires even if the client never does).
    const isYellowPages = cleanCategories.some(c => SPECIAL_CATEGORIES.has(c))
    if (isYellowPages && process.env.ADMIN_WHATSAPP) {
      const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'
      const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
      sendWhatsAppMessage(
        process.env.ADMIN_WHATSAPP,
        [
          '🚨 *YELLOW PAGES SUBMISSION — VERIFY FAST*',
          '',
          'A public-service listing was just submitted and needs priority verification.',
          '',
          `Name: ${name.trim()}`,
          `Category: ${cleanCategories.join(', ')}`,
          `Location: ${location}`,
          `Phone: ${fullPhone}`,
          '',
          `Profile: ${siteUrl}/business/${inserted.slug || inserted.id}`,
          `Review: ${siteUrl}/admin`,
          '',
          'Verify ASAP so it appears in the Emergency & Essential Services strip and /yellow-pages.',
        ].join('\n')
      )      .catch(() => {})
    }

    // Submission confirmation to the submitter's own WhatsApp: status + their
    // private edit link. Best-effort, non-blocking. If a Meta-approved
    // template is configured (WHATSAPP_TEMPLATE_SUBMITTED, params: name,
    // status, edit link) it is used — business-initiated plain text only
    // delivers inside Meta's 24h customer-service window.
    {
      const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'
      const editLink = `${siteUrl}/edit?token=${editToken}`
      const statusText = isYellowPages
        ? 'received — public-service listings get priority review'
        : 'received — an admin will review it shortly'
      const { sendWhatsAppMessage, sendWhatsAppTemplate } = await import('@/lib/whatsapp')
      const tpl = process.env.WHATSAPP_TEMPLATE_SUBMITTED
      if (tpl) {
        sendWhatsAppTemplate(fullPhone, tpl, [name.trim(), statusText, editLink]).catch(() => {})
      } else {
        sendWhatsAppMessage(
          fullPhone,
          [
            `✅ *LISTING RECEIVED — ${name.trim()}*`,
            '',
            `Your listing on WA Directory is ${statusText}.`,
            '',
            'Verification status: ⏳ Pending review',
            isYellowPages ? 'Public-service listings are prioritized by our team.' : '',
            '',
            'Edit your listing anytime with your private link:',
            editLink,
            '',
            'Keep this link safe — anyone with it can edit your listing.',
          ].filter(Boolean).join('\n')
        ).catch(() => {})
      }
    }

    return NextResponse.json({
      id: inserted.id,
      slug: inserted.slug,
      edit_token: editToken,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request. Please check your details and try again.' }, { status: 400 })
  }
}

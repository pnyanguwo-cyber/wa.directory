import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getApprovedCategoryNames } from '@/lib/approved-data'
import { zimbabweCities } from '@/data/zimbabwe-locations'

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
    const fullPhone = `${code}${phone}`.replace(/[^0-9]/g, '')
    if (fullPhone.length < 10 || fullPhone.length > 15) {
      return NextResponse.json({ error: 'That phone number looks invalid for the selected country code.' }, { status: 400 })
    }

    const validCityNames = new Set(zimbabweCities.map(c => c.name))
    const isPendingCity = pending_city === true && typeof city === 'string' && city.trim().length > 0 && city !== 'remote'
    const isRemote = typeof city === 'string' && city === 'remote'
    const cleanCity = typeof city === 'string'
      ? (city === '*' || isRemote ? city : validCityNames.has(city) ? city : isPendingCity ? city.trim() : '')
      : ''

    // Categories must be a subset of the approved taxonomy.
    const approvedCategories = await getApprovedCategoryNames()
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
    if (cleanCity === '*') cleanAreas = []

    const location = cleanCity === '*'
      ? 'Zimbabwe'
      : [cleanAreas.join(', '), cleanCity, 'Zimbabwe'].filter(Boolean).join(', ')

    const price = typeof price_range === 'string' ? price_range.trim() : ''
    const normalizedPrice = price ? (price.startsWith('$') ? price : `$${price}`) : null

    // Only ever generated here — a client-supplied edit_token is ignored.
    const editToken = crypto.randomUUID()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
          city: cleanCity === '*' ? '' : cleanCity,
          area: cleanCity === '*' || cleanAreas.length === 0 ? '' : cleanAreas[0],
          areas: cleanCity === '*' ? [] : cleanAreas,
          phone: fullPhone,
          whatsapp_link: `https://wa.me/${fullPhone}?text=${WA_MSG}`,
          catalog_link: typeof catalog_link === 'string' && catalog_link.trim() ? catalog_link.trim() : null,
          logo_url: typeof logo_url === 'string' && logo_url.trim() ? logo_url.trim() : null,
          price_range: normalizedPrice,
          website: typeof website === 'string' && website.trim() ? website.trim() : null,
          address: typeof address === 'string' ? address.trim() : '',
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

    return NextResponse.json({
      id: inserted.id,
      slug: inserted.slug,
      edit_token: editToken,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request. Please check your details and try again.' }, { status: 400 })
  }
}

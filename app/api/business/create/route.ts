import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const category = Array.isArray(body.category) ? body.category.filter((c: unknown) => typeof c === 'string') : []

    if (!name || !phone || category.length === 0) {
      return NextResponse.json({ error: 'Name, phone and at least one category are required' }, { status: 400 })
    }

    const payload: Record<string, unknown> = {
      name,
      slug: body.slug || null,
      whatsapp_username: body.whatsapp_username?.trim() || '',
      bio: body.bio || `Professional services.`,
      category,
      location: body.location || 'Zimbabwe',
      country_code: body.country_code || '',
      city: body.city || '',
      area: body.area || '',
      areas: Array.isArray(body.areas) ? body.areas : [],
      phone,
      whatsapp_link: body.whatsapp_link || null,
      catalog_link: body.catalog_link || null,
      logo_url: body.logo_url || null,
      price_range: body.price_range || null,
      website: body.website || null,
      edit_token: body.edit_token || null,
      verified: false,
      rating: 0,
      review_count: 0,
    }

    const { data, error } = await getSupabase()
      .from('businesses')
      .insert(payload)
      .select('id, slug, edit_token')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ id: data.id, slug: data.slug, edit_token: data.edit_token })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
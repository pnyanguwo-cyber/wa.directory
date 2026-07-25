import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { edit_token, name, bio, category, phone, country_code, whatsapp_username, city, area, price_range, catalog_link, logo_url } = body

    if (!edit_token) {
      return NextResponse.json({ error: 'Edit token is required' }, { status: 400 })
    }

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: existing, error: findError } = await supabase
      .from('businesses')
      .select('id')
      .eq('edit_token', edit_token)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Invalid or expired edit token' }, { status: 401 })
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const fullPhone = phone.replace(/[^0-9]/g, '')
    const whatsappLink = `https://wa.me/${fullPhone}?text=Hi%2C%20I%20found%20you%20on%20WA%20Directory`

    const { error: updateError } = await supabase
      .from('businesses')
      .update({
        name,
        slug,
        whatsapp_username: whatsapp_username || null,
        bio: bio || null,
        category: typeof category === 'string' ? [category] : category,
        phone: fullPhone,
        country_code: country_code || null,
        city: city || null,
        area: area || null,
        location: [area, city, 'Zimbabwe'].filter(Boolean).join(', ') || '',
        price_range: price_range || null,
        catalog_link: catalog_link || null,
        logo_url: logo_url || null,
        whatsapp_link: whatsappLink,
      })
      .eq('edit_token', edit_token)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

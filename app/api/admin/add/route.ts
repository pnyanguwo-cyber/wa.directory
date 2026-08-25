import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'

export async function POST(request: Request) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, category, phone, whatsapp_username, city, area, bio, price_range, whatsapp_link, catalog_link, logo_url, verified, address, show_location, featured_eligible } = body

    if (!name || !category || !phone) {
      return NextResponse.json({ error: 'Name, category, and phone are required' }, { status: 400 })
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        name,
        slug,
        whatsapp_username: whatsapp_username || null,
        category: typeof category === 'string' ? [category] : category,
        phone,
        city: city || null,
        area: area || null,
        bio: bio || null,
        price_range: price_range || null,
        whatsapp_link: whatsapp_link || null,
        catalog_link: catalog_link || null,
        logo_url: logo_url || null,
        verified: verified ?? true,
        location: city || '',
        address: address || '',
        show_location: show_location !== false,
        featured_eligible: featured_eligible !== false,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

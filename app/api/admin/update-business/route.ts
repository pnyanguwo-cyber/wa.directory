import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, name, phone, country_code, whatsapp_username, category, areas, city, area, bio, price_range, catalog_link, logo_url, website, verified } = body

    if (!id || !name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const fullPhone = String(phone).replace(/[^0-9]/g, '')
    const areaList = Array.isArray(areas) ? areas.filter(Boolean) : []
    const primaryArea = areaList[0] || (area || '')

    const { error } = await supabase
      .from('businesses')
      .update({
        name: name.trim(),
        phone: fullPhone,
        country_code: country_code || '+263',
        whatsapp_username: whatsapp_username || null,
        category: Array.isArray(category) ? category : [category].filter(Boolean),
        areas: areaList,
        area: primaryArea,
        city: city || '',
        bio: bio || null,
        price_range: price_range || null,
        catalog_link: catalog_link || null,
        logo_url: logo_url || null,
        website: website || null,
        verified: !!verified,
        location: [primaryArea, city, 'Zimbabwe'].filter(Boolean).join(', ') || '',
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

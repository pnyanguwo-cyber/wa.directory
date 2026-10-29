import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin-auth'
import { adminGuard } from '@/lib/admin-auth'
import { dedupeCategories } from '@/lib/utils'

export async function POST(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const body = await request.json()
    const { id, name, phone, country_code, whatsapp_username, category, areas, city, area, bio, price_range, catalog_link, logo_url, website, verified, payment_status, address, show_location, featured_eligible } = body

    if (!id || !name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    const supabase = getSupabase()

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
        category: dedupeCategories(category),
        areas: areaList,
        area: primaryArea,
        city: city || '',
        bio: bio || null,
        price_range: price_range || null,
        catalog_link: catalog_link || null,
        logo_url: logo_url || null,
        website: website || null,
        verified: !!verified,
        // Optional direct payment-status override; only accept known values.
        ...(typeof payment_status === 'string' && ['active', 'pending', 'expired', 'unpaid'].includes(payment_status)
          ? { payment_status }
          : {}),
        location: [primaryArea, city, 'Zimbabwe'].filter(Boolean).join(', ') || '',
        address: address || '',
        show_location: show_location !== false,
        featured_eligible: featured_eligible !== false,
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

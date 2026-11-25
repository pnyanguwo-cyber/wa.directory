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
    const { id, name, phone, country_code, whatsapp_username, category, areas, city, area, bio, price_range, catalog_link, logo_url, website, verified, payment_status, address, show_location, featured_eligible, requested_category } = body

    if (!id || !name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const fullPhone = String(phone).replace(/[^0-9]/g, '')
    const areaList = Array.isArray(areas) ? areas.filter(Boolean) : []
    const primaryArea = areaList[0] || (area || '')

    // Keep the owner's pending category request in step with a spelling fix,
    // otherwise approving it later would restore the misspelled name and leave
    // the "Other" placeholder on the listing forever.
    let pendingRename: { from: string; to: string } | null = null
    if (typeof requested_category === 'string') {
      const nextRequested = requested_category.trim()
      const { data: current } = await supabase
        .from('businesses')
        .select('requested_category')
        .eq('id', id)
        .maybeSingle()
      const previous = String((current as { requested_category?: string | null } | null)?.requested_category || '').trim()
      if (previous && previous.toLowerCase() !== nextRequested.toLowerCase() && nextRequested) {
        pendingRename = { from: previous, to: nextRequested }
      }
    }

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
        ...(typeof requested_category === 'string' ? { requested_category: requested_category.trim() || null } : {}),
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (pendingRename) {
      const { data: requests } = await supabase
        .from('feature_requests')
        .select('id, name')
        .eq('business_id', id)
        .eq('type', 'category')
        .eq('status', 'pending')
      for (const req of requests || []) {
        if (String((req as { name: string }).name).toLowerCase() !== pendingRename.from.toLowerCase()) continue
        await supabase
          .from('feature_requests')
          .update({ name: pendingRename.to })
          .eq('id', (req as { id: string }).id)
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

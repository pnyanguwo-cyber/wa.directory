import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { adminGuard } from '@/lib/admin-auth'

export async function GET() {
  const denied = adminGuard()
  if (denied) return denied

  const supabase = getSupabase()

  const { data: requests, error } = await supabase
    .from('address_requests')
    .select('id, address, lat, lng, status, admin_note, created_at, resolved_at, business_id, business_name')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ requests: requests || [] })
}

export async function POST(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const { id, action, note } = await request.json()

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: req } = await supabase
      .from('address_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    if (action === 'reject') {
      await supabase
        .from('address_requests')
        .update({ status: 'rejected', admin_note: note || '', resolved_at: new Date().toISOString() })
        .eq('id', id)

      return NextResponse.json({ success: true })
    }

    // Approve: geocode the address via Nominatim, then update the business.
    const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
    const query = encodeURIComponent(req.address + ', Zimbabwe')
    const url = `${NOMINATIM_URL}?q=${query}&format=json&countrycodes=zw&limit=1&addressdetails=1`

    let lat: number | null = null
    let lng: number | null = null
    let formattedAddress = req.address

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'WADirectory/1.0 (https://wa.directory)' },
      })
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        lat = parseFloat(data[0].lat)
        lng = parseFloat(data[0].lon)
        formattedAddress = data[0].display_name || req.address
      }
    } catch {
      // Geocoding failed, mark as approved but without coordinates
    }

    // Update the business if linked
    if (req.business_id) {
      await supabase
        .from('businesses')
        .update({
          address: formattedAddress,
          lat,
          lng,
          address_verified: lat !== null && lng !== null,
        })
        .eq('id', req.business_id)
    }

    await supabase
      .from('address_requests')
      .update({
        status: 'approved',
        lat,
        lng,
        admin_note: note || '',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({ success: true, lat, lng })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

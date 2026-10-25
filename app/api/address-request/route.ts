import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { address, business_id, business_name } = await request.json()

    if (!address || typeof address !== 'string' || address.trim().length < 3) {
      return NextResponse.json({ error: 'A valid address is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const cleanAddress = address.trim()

    const { data, error } = await supabase
      .from('address_requests')
      .insert({
        address: cleanAddress,
        business_id: business_id || null,
        business_name: business_name || null,
        status: 'pending',
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

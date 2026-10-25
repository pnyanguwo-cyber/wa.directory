import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'

// Lightweight payment-status probe used by the /pay confirmation screen and
// the listing-form splash to auto-detect webhook activation: the client polls
// this until payment_status flips to 'active', so the listing goes live with
// no admin step and no page reload.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id') || ''
  if (!businessId) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, payment_status, verified')
    .eq('business_id', businessId)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  return NextResponse.json({
    payment_status: business.payment_status,
    verified: business.verified === true,
    active: business.payment_status === 'active',
  })
}

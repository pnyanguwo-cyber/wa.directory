import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'

// Lightweight payment-status probe used by the /pay confirmation screen and
// the listing-form splash to auto-detect webhook activation: the client polls
// this until payment_status flips to 'active', so the listing goes live with
// no admin step and no page reload.
//
// In addition to the live business status it returns:
//   - subscription: the newest listing_subscriptions row.
//   - lastEvent: the newest payment_events row — including terminal Paynow
//     rejections (Cancelled / Failed / Disputed / Expired) logged by the
//     /api/paynow/result webhook — so clients can tell "still waiting" apart
//     from "the payment didn't go through" and show a retry prompt instead
//     of a silent never-ending spinner.
//
// NOTE: clients probe with the human-readable business id (WA-XXXX); the
// subscription/event queries below key off the row's UUID id instead.
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

  // UUID keying: listing_subscriptions and payment_events store the row's
  // UUID id, not the human-friendly WA- id.
  const [subscriptionResult, lastEventResult] = await Promise.all([
    supabase
      .from('listing_subscriptions')
      .select('id, status, paynow_paid_at, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('payment_events')
      .select('event_type, outcome, detail, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  return NextResponse.json({
    payment_status: business.payment_status,
    verified: business.verified === true,
    active: business.payment_status === 'active',
    subscription: subscriptionResult.data?.[0] || null,
    lastEvent: lastEventResult.data?.[0] || null,
  })
}

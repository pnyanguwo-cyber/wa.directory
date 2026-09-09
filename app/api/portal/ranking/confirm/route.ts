import { NextResponse } from 'next/server'
import { getBusinessId } from '@/lib/business-auth'
import { getSupabase } from '@/lib/supabase-server'
import { pollTransactionStatus } from '@/lib/paynow'
import { activateBidAsNumberOne, markBidPaid, notifyAdminTakeover } from '@/lib/bid-activation'
import { logPaymentEvent } from '@/lib/payment-events'

// Front-end polls this while the EcoCash PIN prompt is on the payer's phone.
// Paynow reporting the transaction as paid flips the bid to `paid` and
// instantly activates the winner as the #1 spot holder (see lib/bid-activation).
// The Paynow result webhook (/api/paynow/result) drives the same shared logic
// server-to-server, so activation happens even if the payer closes this page.

export async function POST(request: Request) {
  const businessId = getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { bid_id } = await request.json().catch(() => ({}))
  if (!bid_id) return NextResponse.json({ error: 'bid_id is required' }, { status: 400 })

  const supabase = getSupabase()

  const { data: bid } = await supabase
    .from('bids')
    .select('id, business_id, status, paynow_poll_url, paynow_paid_at, paynow_reference, amount')
    .eq('id', bid_id)
    .maybeSingle()

  if (!bid || bid.business_id !== businessId) {
    return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
  }

  // Already activated — nothing to do.
  if (bid.status === 'approved') {
    return NextResponse.json({ status: 'approved', activated: true })
  }

  // Payment already confirmed earlier (e.g. by the webhook) but the client
  // hasn't seen the activation yet.
  if (bid.paynow_paid_at && bid.status === 'paid') {
    const result = await activateBidAsNumberOne(supabase, bid_id)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json({ status: 'approved', activated: true })
  }

  // No gateway transaction attached — nothing to poll.
  if (!bid.paynow_poll_url) {
    return NextResponse.json({ status: bid.status, paid: false })
  }

  const poll = await pollTransactionStatus(bid.paynow_poll_url)
  if (!poll.ok) {
    return NextResponse.json({ error: poll.error || 'Could not check payment status' }, { status: 502 })
  }

  if (poll.paid) {
    await logPaymentEvent({
      eventType: 'payment_confirmed',
      businessId,
      bidId: bid_id,
      detail: { via: 'polling', paynowStatus: poll.status, paynowRef: bid.paynow_reference },
      request,
    })

    const flipped = await markBidPaid(supabase, bid_id)
    if (flipped.error) {
      await logPaymentEvent({ eventType: 'activation_failed', outcome: 'error', businessId, bidId: bid_id, detail: { stage: 'mark_paid', error: flipped.error }, request })
      return NextResponse.json({ error: flipped.error }, { status: 500 })
    }

    const result = await activateBidAsNumberOne(supabase, bid_id)
    if (result.error) {
      await logPaymentEvent({ eventType: 'activation_failed', outcome: 'error', businessId, bidId: bid_id, detail: { stage: 'activate', error: result.error }, request })
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    if (flipped.flipped) await notifyAdminTakeover(bid)
    return NextResponse.json({ status: 'approved', activated: true })
  }

  await logPaymentEvent({
    eventType: 'payment_pending',
    outcome: 'pending',
    businessId,
    bidId: bid_id,
    detail: { via: 'polling', paynowStatus: poll.status, bidStatus: bid.status },
    request,
  })
  return NextResponse.json({ status: bid.status, paid: false, paynow_status: poll.status })
}

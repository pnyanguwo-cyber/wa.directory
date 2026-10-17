import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { pollTransactionStatus, verifyHash, parseUrlencoded } from '@/lib/paynow'
import { activateBidAsNumberOne, markBidPaid, notifyAdminTakeover } from '@/lib/bid-activation'
import { activateListingSubscription } from '@/lib/listing-activation'
import { logPaymentEvent } from '@/lib/payment-events'

// Paynow server-to-server result update (configured as the integration's
// "result url"). Paynow POSTs an application/x-www-form-urlencoded body here
// whenever a transaction's status changes, e.g.:
//   reference=BID-<bidId>&paynowreference=...&amount=...&status=Paid&pollurl=...&hash=...
// Security model:
//   1. Verify the SHA512 hash over the posted values + integration key.
//   2. Never trust the posted status alone — re-confirm by POSTing to the
//      poll URL (hash-verified response) before flipping anything.
//   3. The reference (BID-<bidId>) is matched against the stored poll URL so
//      a forged reference can't touch an unrelated bid.

export async function POST(request: Request) {
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY
  if (!integrationKey) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 })
  }

  const body = await request.text()
  const values = parseUrlencoded(body)
  if (!values.hash || !verifyHash(values, integrationKey)) {
    await logPaymentEvent({
      eventType: 'webhook_rejected',
      outcome: 'rejected',
      detail: { reason: 'invalid_hash', reference: values.reference || null, postedStatus: values.status || null },
      request,
    })
    return NextResponse.json({ error: 'Invalid hash' }, { status: 401 })
  }

  const reference = values.reference || ''

  // LISTING-<subId>: a listing subscription paid via /api/pay's automatic
  // EcoCash push. Confirm and activate without any admin step.
  if (reference.startsWith('LISTING-')) {
    const subscriptionId = reference.slice(8)
    const supabase = getSupabase()

    const { data: sub } = await supabase
      .from('listing_subscriptions')
      .select('id, business_id, status, paynow_poll_url')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (!sub) {
      await logPaymentEvent({ eventType: 'webhook_rejected', outcome: 'rejected', detail: { reason: 'listing_sub_not_found', reference }, request })
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    if (sub.paynow_poll_url && values.pollurl && sub.paynow_poll_url !== values.pollurl) {
      await logPaymentEvent({ eventType: 'webhook_rejected', outcome: 'rejected', businessId: sub.business_id, detail: { reason: 'poll_url_mismatch', reference }, request })
      return NextResponse.json({ error: 'Poll URL mismatch' }, { status: 409 })
    }

    // Idempotency: already active.
    if (sub.status === 'active') return NextResponse.json({ ok: true, status: 'active' })

    const pollUrl = values.pollurl || sub.paynow_poll_url
    if (!pollUrl) return NextResponse.json({ error: 'No poll URL available' }, { status: 400 })

    const poll = await pollTransactionStatus(pollUrl)
    if (!poll.ok) return NextResponse.json({ error: 'Status check failed' }, { status: 503 })
    if (!poll.paid) return NextResponse.json({ ok: true, paynow_status: poll.status })

    await logPaymentEvent({
      eventType: 'payment_confirmed',
      businessId: sub.business_id,
      detail: { via: 'webhook', kind: 'listing', paynowStatus: poll.status },
      request,
    })

    await supabase
      .from('listing_subscriptions')
      .update({ paynow_paid_at: new Date().toISOString(), paynow_reference: values.paynowreference || null })
      .eq('id', subscriptionId)

    const result = await activateListingSubscription(supabase, subscriptionId, { autoConfirmed: true })
    if (!result.ok) {
      await logPaymentEvent({ eventType: 'activation_failed', outcome: 'error', businessId: sub.business_id, detail: { kind: 'listing', error: result.error }, request })
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true, status: 'active', auto: true })
  }

  if (!reference.startsWith('BID-')) {
    // Unknown product — acknowledge and ignore.
    await logPaymentEvent({ eventType: 'webhook_rejected', outcome: 'rejected', detail: { reason: 'unknown_reference', reference }, request })
    return NextResponse.json({ ok: true, ignored: true })
  }
  const bidId = reference.slice(4)

  const supabase = getSupabase()

  const { data: bid } = await supabase
    .from('bids')
    .select('id, business_id, status, paynow_poll_url, paynow_paid_at, paynow_reference, amount')
    .eq('id', bidId)
    .maybeSingle()

  if (!bid) {
    await logPaymentEvent({ eventType: 'webhook_rejected', outcome: 'rejected', bidId, detail: { reason: 'bid_not_found', reference }, request })
    return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
  }

  // Match the stored poll URL against the one Paynow posted (defence in depth:
  // a hash-valid but replayed update for a different transaction won't match).
  if (bid.paynow_poll_url && values.pollurl && bid.paynow_poll_url !== values.pollurl) {
    await logPaymentEvent({
      eventType: 'webhook_rejected',
      outcome: 'rejected',
      bidId,
      businessId: bid.business_id,
      detail: { reason: 'poll_url_mismatch', reference },
      request,
    })
    return NextResponse.json({ error: 'Poll URL mismatch' }, { status: 409 })
  }

  // Idempotency: nothing left to do for an activated bid.
  if (bid.status === 'approved') {
    return NextResponse.json({ ok: true, status: 'approved' })
  }

  // Confirm status with Paynow directly (never trust the posted status).
  const pollUrl = values.pollurl || bid.paynow_poll_url
  if (!pollUrl) return NextResponse.json({ error: 'No poll URL available' }, { status: 400 })

  const poll = await pollTransactionStatus(pollUrl)
  if (!poll.ok) {
    // Ask Paynow to retry later rather than failing permanently.
    return NextResponse.json({ error: 'Status check failed' }, { status: 503 })
  }

  if (!poll.paid) {
    // Sent / Cancelled / Failed / Disputed etc. — acknowledge, don't activate.
    return NextResponse.json({ ok: true, paynow_status: poll.status })
  }

  await logPaymentEvent({
    eventType: 'payment_confirmed',
    businessId: bid.business_id,
    bidId,
    detail: { via: 'webhook', paynowStatus: poll.status, paynowRef: bid.paynow_reference },
    request,
  })

  const flipped = await markBidPaid(supabase, bidId)
  if (flipped.error) {
    await logPaymentEvent({ eventType: 'activation_failed', outcome: 'error', businessId: bid.business_id, bidId, detail: { stage: 'mark_paid', error: flipped.error }, request })
    return NextResponse.json({ error: flipped.error }, { status: 500 })
  }

  const result = await activateBidAsNumberOne(supabase, bidId)
  if (result.error) {
    await logPaymentEvent({ eventType: 'activation_failed', outcome: 'error', businessId: bid.business_id, bidId, detail: { stage: 'activate', error: result.error }, request })
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (flipped.flipped) await notifyAdminTakeover(bid)

  return NextResponse.json({ ok: true, status: 'approved', activated: result.activated })
}

import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { activateListingSubscription } from '@/lib/listing-activation'
import { activateBidAsNumberOne, markBidPaid, notifyAdminTakeover } from '@/lib/bid-activation'
import { logPaymentEvent } from '@/lib/payment-events'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { paymentSimulationApiEnabled } from '@/lib/pay-simulation'
import { PLAN_CONFIG, PRO_ASSISTANCE_PRICE } from '@/types'
import type { PlanType } from '@/types'
import { SITE_URL } from '@/lib/site-url'

// DEV-ONLY payment simulation: confirms a payment exactly the way a real
// EcoCash payment is confirmed — same shared activation helpers as the
// Paynow webhook (/api/paynow/result) and the admin override, so the
// simulated run exercises the true production path.
//
// Kinds:
//   listing  { business_id, plan }                          → activateListingSubscription (first activation)
//   renewal  { business_id, plan, has_pro_assistance? }     → same, but extends an already-live listing
//   bid      { bid_id } | { business_id, category, city?, amount }
//                                                          → markBidPaid + activateBidAsNumberOne (the #1 takeover)
//   premium  { business_id }                                → mirror the admin premium "activate" action
//
// business_id accepts either the public Business ID code (used at /pay and in
// the listing form) or the internal UUID (used by portal components).
// Gated by lib/pay-simulation: dev by default, or when the deployment sets
// NEXT_PUBLIC_ENABLE_PAYMENT_SIMULATION=1 / ENABLE_PAYMENT_SIMULATION=1.

type Supabase = ReturnType<typeof getSupabase>

async function findBusiness(supabase: Supabase, idOrCode: string) {
  const select = 'id, name, payment_status, verified, phone'
  const byId = await supabase.from('businesses').select(select).eq('id', idOrCode).maybeSingle()
  if (byId.data) return byId.data
  const byCode = await supabase.from('businesses').select(select).eq('business_id', idOrCode).maybeSingle()
  return byCode.data
}

// The #1 auction groups bids under the current month's period (same rule as
// /api/portal/ranking).
function currentPeriodStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

async function simulateListing(
  supabase: Supabase,
  body: Record<string, unknown>,
  request: Request,
  opts: { renewal: boolean }
) {
  const business = await findBusiness(supabase, String(body.business_id || ''))
  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // First activation only: a live listing needs the renewal path, which
  // extends the current period instead of refusing.
  if (!opts.renewal && business.payment_status === 'active') {
    return NextResponse.json({ success: true, activated: false, message: 'Listing is already live.' })
  }

  const rawPlan = body.plan
  const plan: PlanType = rawPlan === '6m' || rawPlan === '12m' ? rawPlan : '1m'
  const hasProAssistance = body.has_pro_assistance === true

  // Reuse the pending subscription if there is one (same as the real flow);
  // otherwise create the record the simulation then confirms.
  let subscriptionId: string | null = null
  const { data: pending } = await supabase
    .from('listing_subscriptions')
    .select('id')
    .eq('business_id', business.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (pending) {
    subscriptionId = pending.id
    if (opts.renewal) {
      await supabase
        .from('listing_subscriptions')
        .update({
          plan,
          pro_assistance: hasProAssistance,
          amount: PLAN_CONFIG[plan].price + (hasProAssistance ? PRO_ASSISTANCE_PRICE : 0),
        })
        .eq('id', pending.id)
    }
  } else {
    const inserted = await supabase
      .from('listing_subscriptions')
      .insert({
        business_id: business.id,
        status: 'pending',
        amount: PLAN_CONFIG[plan].price + (hasProAssistance ? PRO_ASSISTANCE_PRICE : 0),
        payer_phone: 'dev-simulator',
        plan,
        pro_assistance: hasProAssistance,
      })
      .select('id')
      .single()
    if (inserted.error || !inserted.data) {
      return NextResponse.json({ error: inserted.error?.message || 'Could not create the payment record' }, { status: 500 })
    }
    subscriptionId = inserted.data.id
  }

  // Mirror the real webhook's bookkeeping: paynow_paid_at + a reference so
  // the admin payment history shows the simulated transaction like any other.
  if (subscriptionId) {
    await supabase
      .from('listing_subscriptions')
      .update({ paynow_paid_at: new Date().toISOString(), paynow_reference: 'SIMULATED-DEV' })
      .eq('id', subscriptionId)
  }

  // EXACT same activation as a real confirmed payment.
  if (!subscriptionId) {
    return NextResponse.json({ error: 'Could not resolve subscription' }, { status: 500 })
  }
  const result = await activateListingSubscription(supabase, subscriptionId, { autoConfirmed: true })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  await logPaymentEvent({
    eventType: 'payment_confirmed',
    businessId: business.id,
    detail: { via: 'simulated', kind: opts.renewal ? 'renewal' : 'listing' },
    request,
  })

  return NextResponse.json({ success: true, activated: true })
}

async function simulateBid(supabase: Supabase, body: Record<string, unknown>, request: Request) {
  let bidId = typeof body.bid_id === 'string' && body.bid_id ? body.bid_id : null

  if (bidId) {
    const { data: bid } = await supabase
      .from('bids')
      .select('id, business_id, status')
      .eq('id', bidId)
      .maybeSingle()
    if (!bid) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
    }
    if (bid.status === 'approved') {
      return NextResponse.json({ success: true, activated: false, message: 'Bid is already active.' })
    }
  } else {
    // No bid yet (the modal's "Bid & pay" form): create the pending bid the
    // same way /api/portal/ranking does, then confirm it.
    const business = await findBusiness(supabase, String(body.business_id || ''))
    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }
    const category = typeof body.category === 'string' ? body.category : ''
    if (!category) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }
    const fee = Number(body.amount)
    if (!Number.isFinite(fee) || fee <= 0) {
      return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
    }
    const city = typeof body.city === 'string' ? body.city : ''
    const period = currentPeriodStart()

    const { data: existing } = await supabase
      .from('bids')
      .select('id')
      .eq('business_id', business.id)
      .eq('category', category)
      .eq('city', city)
      .eq('period', period)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      bidId = existing.id
      await supabase.from('bids').update({ amount: fee, payer_phone: 'dev-simulator' }).eq('id', bidId)
    } else {
      const inserted = await supabase
        .from('bids')
        .insert({
          business_id: business.id,
          category,
          city,
          position: 1,
          amount: fee,
          period,
          status: 'pending',
          payer_phone: 'dev-simulator',
        })
        .select('id')
        .single()
      if (inserted.error || !inserted.data) {
        return NextResponse.json({ error: inserted.error?.message || 'Could not create the bid' }, { status: 500 })
      }
      bidId = inserted.data.id
    }
  }

  if (!bidId) {
    return NextResponse.json({ error: 'Could not resolve bid' }, { status: 500 })
  }

  await supabase.from('bids').update({ paynow_reference: 'SIMULATED-DEV' }).eq('id', bidId)

  // EXACT same confirmation chain as the real webhook.
  const flipped = await markBidPaid(supabase, bidId)
  if (flipped.error) {
    return NextResponse.json({ error: flipped.error }, { status: 500 })
  }

  const result = await activateBidAsNumberOne(supabase, bidId)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  const { data: bidFull } = await supabase
    .from('bids')
    .select('id, business_id, amount, paynow_reference')
    .eq('id', bidId)
    .maybeSingle()

  if (flipped.flipped && bidFull) await notifyAdminTakeover(bidFull)

  if (bidFull) {
    await logPaymentEvent({
      eventType: 'payment_confirmed',
      businessId: bidFull.business_id,
      bidId,
      detail: { via: 'simulated', kind: 'bid', paynowRef: 'SIMULATED-DEV' },
      request,
    })
  }

  return NextResponse.json({ success: true, activated: result.activated !== false })
}

async function simulatePremium(supabase: Supabase, body: Record<string, unknown>, request: Request) {
  const business = await findBusiness(supabase, String(body.business_id || ''))
  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id, status, expires_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.status === 'active' && (!existing.expires_at || new Date(existing.expires_at) > new Date())) {
    return NextResponse.json({ success: true, activated: false, message: 'Premium is already active.' })
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 86400000)

  let subscriptionId = existing?.id
  if (!subscriptionId) {
    const inserted = await supabase
      .from('subscriptions')
      .insert({ business_id: business.id, status: 'pending', amount: 0, admin_note: 'simulated-dev' })
      .select('id')
      .single()
    if (inserted.error || !inserted.data) {
      return NextResponse.json({ error: inserted.error?.message || 'Could not create the subscription' }, { status: 500 })
    }
    subscriptionId = inserted.data.id
  }

  // Mirror the admin "activate" action exactly (app/api/admin/subscriptions).
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq('id', subscriptionId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (business.phone) {
    sendWhatsAppMessage(
      business.phone,
      [
        '🎉 *Your premium subscription is active!*',
        '',
        `Enjoy full statistics, conversations, bidding and competitor insights until ${expiresAt.toISOString().slice(0, 10)}.`,
        '',
        'Open your portal to explore: ' + (SITE_URL) + '/portal',
      ].join('\n')
    ).catch(() => {})
  }

  await logPaymentEvent({
    eventType: 'payment_confirmed',
    businessId: business.id,
    detail: { via: 'simulated', kind: 'premium' },
    request,
  })

  return NextResponse.json({ success: true, activated: true })
}

export async function POST(request: Request) {
  if (!paymentSimulationApiEnabled()) {
    return NextResponse.json({ error: 'Simulated payments are only available in development.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const kind = typeof body.kind === 'string' ? body.kind : 'listing'

    const supabase = getSupabase()

    if (kind === 'bid') return simulateBid(supabase, body, request)
    if (kind === 'premium') return simulatePremium(supabase, body, request)
    if (kind === 'renewal') return simulateListing(supabase, body, request, { renewal: true })
    return simulateListing(supabase, body, request, { renewal: false })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

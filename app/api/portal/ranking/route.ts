import { NextResponse } from 'next/server'
import { getBusinessId } from '@/lib/business-auth'
import { getSupabase } from '@/lib/supabase-server'
import { initiateEcoCashPayment, paynowConfigured } from '@/lib/paynow'

// Minimum gap over the current #1 fee (10 cents).
const MIN_BID_GAP = 0.1

// The #1 auction is live: a paid bid takes over the spot immediately, so all
// bids are grouped under the current month's period.
function currentPeriodStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

// Businesses only ever compete inside their own categories, and inside their
// own location — unless their listing serves the whole country (is_remote),
// in which case they can view and bid in every city, one location at a time.
async function loadScope(supabase: ReturnType<typeof getSupabase>, businessId: string) {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, category, city, is_remote')
    .eq('id', businessId)
    .maybeSingle()
  if (!business) return null

  const myCategories = (business.category || []).filter(Boolean)
  const isRemote = business.is_remote === true
  const myCity = business.city || ''

  return {
    myCategories,
    isRemote,
    myCity,
    // In-scope = one of the listing's own categories, and the listing's city —
    // or any location (including nationwide '') when is_remote is set.
    allows(category: string, city: string): boolean {
      if (!myCategories.includes(category)) return false
      if (isRemote) return true
      return (city || '') === myCity
    },
  }
}

export async function GET(request: Request) {
  const businessId = getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || ''
  const city = searchParams.get('city') || ''

  const supabase = getSupabase()
  const scope = await loadScope(supabase, businessId)
  if (!scope) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  if (!category || !scope.allows(category, city)) {
    return NextResponse.json(
      {
        error: 'You can only view rankings for your own categories and location.',
        myCategories: scope.myCategories,
        myCity: scope.myCity,
        isRemote: scope.isRemote,
      },
      { status: 403 }
    )
  }

  const period = currentPeriodStart()

  const [spotsRes, allBidsRes, myBidsRes] = await Promise.all([
    // Current #1 holder for this (category, city)
    supabase
      .from('rank_spots')
      .select('id, business_id, position, monthly_fee, period_start, period_end')
      .eq('category', category)
      .eq('city', city)
      .eq('position', 1)
      .eq('status', 'active')
      .order('period_start', { ascending: false })
      .limit(1),
    // Live competition: every pending/paid/approved bid in this scope, highest first
    supabase
      .from('bids')
      .select('id, business_id, position, amount, status, created_at')
      .eq('category', category)
      .eq('city', city)
      .eq('period', period)
      .in('status', ['pending', 'paid', 'approved'])
      .order('amount', { ascending: false }),
    // My own bids in this scope (all statuses, incl. payment state + admin feedback)
    supabase
      .from('bids')
      .select('id, position, amount, period, status, admin_feedback, payer_phone, paynow_paid_at, created_at')
      .eq('business_id', businessId)
      .eq('category', category)
      .eq('city', city)
      .eq('period', period)
      .order('created_at', { ascending: false }),
  ])

  // Resolve names for spot holders and competition bidders
  const nameIds = new Set<string>([
    ...(spotsRes.data || []).map(s => s.business_id),
    ...(allBidsRes.data || []).map(b => b.business_id),
  ])
  const { data: bidders } = nameIds.size
    ? await supabase.from('businesses').select('id, name').in('id', Array.from(nameIds))
    : { data: [] }
  const nameById = new Map((bidders || []).map(b => [b.id, b.name]))

  const competition = (allBidsRes.data || []).map(b => ({
    id: b.id,
    position: b.position,
    amount: Number(b.amount),
    status: b.status,
    businessName: nameById.get(b.business_id) || 'Business',
    mine: b.business_id === businessId,
  }))

  const holder = (spotsRes.data || [])[0] || null

  return NextResponse.json({
    category,
    city,
    period,
    myCategories: scope.myCategories,
    myCity: scope.myCity,
    isRemote: scope.isRemote,
    spots: holder
      ? [{
          position: holder.position,
          businessId: holder.business_id,
          businessName: nameById.get(holder.business_id) || 'Business',
          monthlyFee: Number(holder.monthly_fee || 0),
          periodStart: holder.period_start,
          periodEnd: holder.period_end,
          mine: holder.business_id === businessId,
        }]
      : [],
    competition,
    bids: myBidsRes.data || [],
    currentFees: {
      one: holder ? Number(holder.monthly_fee || 0) : null,
      two: null,
      three: null,
    },
    minBid: holder ? Number(holder.monthly_fee || 0) + MIN_BID_GAP : MIN_BID_GAP,
    paymentsConfigured: paynowConfigured(),
  })
}

export async function POST(request: Request) {
  const businessId = getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { category, city, amount, payer_phone } = await request.json().catch(() => ({}))
  if (!category) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 })
  }
  const fee = Number(amount)
  if (!Number.isFinite(fee) || fee <= 0) {
    return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
  }
  const payerClean = String(payer_phone || '').replace(/\D/g, '')
  if (payerClean.length < 9) {
    return NextResponse.json({ error: 'Enter the EcoCash number making the payment' }, { status: 400 })
  }

  const supabase = getSupabase()
  const scope = await loadScope(supabase, businessId)
  if (!scope) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  // Hard scope enforcement: own categories only; own city unless nationwide.
  if (!scope.allows(category, city || '')) {
    return NextResponse.json(
      {
        error: scope.myCategories.includes(category)
          ? 'You can only bid in your listing\u2019s location.'
          : 'You can only bid in categories listed on your business.',
      },
      { status: 403 }
    )
  }

  const period = currentPeriodStart()

  // One live (unpaid) bid at a time per scope — reuse it when re-bidding.
  const { data: existing } = await supabase
    .from('bids')
    .select('id, amount')
    .eq('business_id', businessId)
    .eq('category', category)
    .eq('city', city || '')
    .eq('period', period)
    .eq('status', 'pending')
    .maybeSingle()

  // Current #1 holder for this scope, covering the target month (or the
  // running month when next month has no holder yet).
  const { data: holderSpot } = await supabase
    .from('rank_spots')
    .select('monthly_fee, business_id')
    .eq('category', category)
    .eq('city', city || '')
    .eq('position', 1)
    .eq('status', 'active')
    .gte('period_end', period)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: fallbackSpot } = holderSpot
    ? { data: null }
    : await supabase
        .from('rank_spots')
        .select('monthly_fee, business_id')
        .eq('category', category)
        .eq('city', city || '')
        .eq('position', 1)
        .eq('status', 'active')
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle()

  const currentFee = Number((holderSpot || fallbackSpot)?.monthly_fee ?? 0)

  // Auction rule: outbid the current #1 by at least 10 cents — never bid
  // equal to or below the holder. An open spot starts at 10 cents.
  const minBid = currentFee > 0 ? currentFee + MIN_BID_GAP : MIN_BID_GAP
  if (fee < minBid) {
    return NextResponse.json(
      {
        error: currentFee > 0
          ? `Your bid must beat the current #1 ($${currentFee.toFixed(2)}) by at least $${MIN_BID_GAP.toFixed(2)}. Minimum bid: $${minBid.toFixed(2)}.`
          : `Minimum bid for the open #1 spot is $${MIN_BID_GAP.toFixed(2)}.`,
      },
      { status: 400 }
    )
  }

  let bidId = existing?.id
  if (bidId) {
    const { error } = await supabase
      .from('bids')
      .update({ amount: fee, payer_phone: payerClean })
      .eq('id', bidId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { data: inserted, error } = await supabase
      .from('bids')
      .insert({
        business_id: businessId,
        category,
        city: city || '',
        position: 1,
        amount: fee,
        period,
        status: 'pending',
        payer_phone: payerClean,
      })
      .select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    bidId = inserted?.[0]?.id
  }

  // Attach the EcoCash payment: the payer gets a PIN prompt on their phone.
  let instructions = ''
  let paymentError = ''
  if (paynowConfigured()) {
    const init = await initiateEcoCashPayment({
      reference: `BID-${bidId}`,
      amount: fee,
      phone: payerClean,
      additionalInfo: `Ranking bid (live auction): ${category}${city ? ` in ${city}` : ''}`,
      // resultUrl = server-to-server status updates from Paynow (webhook);
      // returnUrl = where the payer's browser lands if Paynow opens a page.
      resultUrl: `${process.env.SITE_URL || 'https://wadirectory.co.zw'}/api/paynow/result`,
      returnUrl: `${process.env.SITE_URL || 'https://wadirectory.co.zw'}/portal/ranking`,
    })
    if (init.ok && init.pollUrl) {
      await supabase
        .from('bids')
        .update({ paynow_poll_url: init.pollUrl, paynow_reference: init.paynowReference || null })
        .eq('id', bidId)
      instructions = init.instructions || ''
    } else {
      // Bid stays pending — the business can retry the payment.
      paymentError = init.error || 'Could not start the EcoCash payment.'
    }
  } else {
    paymentError = 'Online payments are not enabled yet: the admin will confirm your bid manually.'
  }

  // Notify admin via WhatsApp
  const admin = process.env.ADMIN_WHATSAPP
  if (admin) {
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .maybeSingle()
    const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
    sendWhatsAppMessage(
      admin,
      [
        '💼 *NEW BID*',
        '',
        `Business: *${business?.name || 'Unknown'}*`,
        `Category: ${category}`,
        `Location: ${city || 'Nationwide'}`,
        'Bidding for: #1 (live auction)',
        `Bid: $${fee.toFixed(2)}`,
        currentFee > 0 ? `Outbids current #1 ($${currentFee.toFixed(2)})` : 'Spot was open',
        `Payer EcoCash: +${payerClean}`,
        '',
        `Review: ${process.env.SITE_URL || 'https://wadirectory.co.zw'}/admin`,
      ].join('\n')
    ).catch(() => {})
  }

  return NextResponse.json({
    success: true,
    bid_id: bidId,
    instructions,
    payment_error: paymentError,
  })
}

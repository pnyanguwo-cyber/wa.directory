import { NextResponse } from 'next/server'
import { getBusinessId } from '@/lib/business-auth'
import { getSupabase } from '@/lib/supabase-server'

function nextMonthStart(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return d.toISOString().slice(0, 10)
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

  const period = nextMonthStart()

  const [spotsRes, allBidsRes, myBidsRes] = await Promise.all([
    // Current month's paid holders for this (category, city)
    supabase
      .from('rank_spots')
      .select('id, business_id, position, monthly_fee, period_start, period_end')
      .eq('category', category)
      .eq('city', city)
      .eq('status', 'active')
      .order('position', { ascending: true }),
    // Next month's competition: every pending/approved bid in this scope
    supabase
      .from('bids')
      .select('id, business_id, position, amount, status, created_at')
      .eq('category', category)
      .eq('city', city)
      .eq('period', period)
      .in('status', ['pending', 'approved'])
      .order('amount', { ascending: false }),
    // My own bids in this scope (all statuses, incl. admin feedback)
    supabase
      .from('bids')
      .select('id, position, amount, period, status, admin_feedback, created_at')
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

  const byPos = new Map<number, { monthly_fee: number; business_id: string }>()
  for (const s of spotsRes.data || []) byPos.set(s.position, s)

  return NextResponse.json({
    category,
    city,
    period,
    myCategories: scope.myCategories,
    myCity: scope.myCity,
    isRemote: scope.isRemote,
    spots: (spotsRes.data || []).map(s => ({
      position: s.position,
      businessId: s.business_id,
      businessName: nameById.get(s.business_id) || 'Business',
      monthlyFee: Number(s.monthly_fee || 0),
      periodStart: s.period_start,
      periodEnd: s.period_end,
      mine: s.business_id === businessId,
    })),
    competition,
    bids: myBidsRes.data || [],
    currentFees: {
      one: byPos.get(1)?.monthly_fee ?? null,
      two: byPos.get(2)?.monthly_fee ?? null,
      three: byPos.get(3)?.monthly_fee ?? null,
    },
  })
}

export async function POST(request: Request) {
  const businessId = getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { category, city, position, amount, fallback_position } = await request.json().catch(() => ({}))
  if (!category || !['1', '2', '3'].includes(String(position))) {
    return NextResponse.json({ error: 'Category and position are required' }, { status: 400 })
  }
  const pos = Number(position)
  const fee = Number(amount)
  if (!Number.isFinite(fee) || fee <= 0) {
    return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
  }

  const fallback = fallback_position != null ? Number(fallback_position) : null
  if (fallback !== null && ![2, 3].includes(fallback)) {
    return NextResponse.json({ error: 'Fallback position must be 2 or 3' }, { status: 400 })
  }
  if (fallback !== null && pos !== 1) {
    return NextResponse.json({ error: 'Fallback position is only available when bidding for #1' }, { status: 400 })
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

  const { data: existing } = await supabase
    .from('bids')
    .select('id, status')
    .eq('business_id', businessId)
    .eq('category', category)
    .eq('city', city || '')
    .eq('position', pos)
    .eq('period', nextMonthStart())
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You already have a pending bid for this position' }, { status: 400 })
  }

  const { data: spots } = await supabase
    .from('rank_spots')
    .select('position, monthly_fee')
    .eq('category', category)
    .eq('city', city || '')
    .eq('status', 'active')

  const feeByPos = new Map<number, number>()
  for (const s of spots || []) feeByPos.set(s.position, Number(s.monthly_fee))

  const minPos1 = feeByPos.get(1) ?? 1
  if (pos === 1 && fee <= minPos1) {
    return NextResponse.json({ error: `Position 1 must outbid the current #1 fee of $${minPos1.toFixed(2)}` }, { status: 400 })
  }
  if (pos === 2) {
    const cap = feeByPos.get(1) ?? Infinity
    if (fee >= cap) {
      return NextResponse.json({ error: `Position 2 must be less than the #1 fee of $${cap.toFixed(2)}` }, { status: 400 })
    }
  }
  if (pos === 3) {
    const cap = feeByPos.get(2) ?? feeByPos.get(1) ?? Infinity
    if (fee >= cap) {
      return NextResponse.json(
        { error: `Position 3 must be less than the #2 fee of $${cap.toFixed(2)}` },
        { status: 400 }
      )
    }
  }

  const { error } = await supabase.from('bids').insert({
    business_id: businessId,
    category,
    city: city || '',
    position: pos,
    amount: fee,
    period: nextMonthStart(),
    status: 'pending',
    fallback_position: fallback,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

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
        `Position: #${pos} for next month`,
        `Bid: $${fee.toFixed(2)}`,
        '',
        `Review: ${process.env.SITE_URL || 'https://wadirectory.co.zw'}/admin`,
      ].join('\n')
    ).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
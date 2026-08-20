import { NextResponse } from 'next/server'
import { getBusinessId } from '@/lib/business-auth'
import { getSupabase } from '@/lib/supabase-server'

function nextMonthStart(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const businessId = getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || ''
  const city = searchParams.get('city') || ''
  if (!category) return NextResponse.json({ error: 'Missing category' }, { status: 400 })

  const supabase = getSupabase()

  const [spotsRes, bidsRes, activeRes] = await Promise.all([
    supabase
      .from('rank_spots')
      .select('id, business_id, category, city, position, monthly_fee, period_start, period_end, status')
      .eq('category', category)
      .eq('city', city)
      .eq('status', 'active')
      .order('position', { ascending: true }),
    supabase
      .from('bids')
      .select('id, position, amount, period, status, admin_feedback, created_at')
      .eq('business_id', businessId)
      .eq('category', category)
      .eq('city', city)
      .eq('period', nextMonthStart())
      .order('created_at', { ascending: false }),
    supabase
      .from('rank_spots')
      .select('id, position, status, period_start, period_end')
      .eq('business_id', businessId)
      .eq('category', category)
      .eq('city', city)
      .eq('status', 'active')
  ])

  const byPos = new Map<number, { id: string; business_id: string; monthly_fee: number; period_start: string; period_end: string }>()
  for (const s of spotsRes.data || []) {
    byPos.set(s.position, s)
  }

  return NextResponse.json({
    spots: spotsRes.data || [],
    bids: bidsRes.data || [],
    myActive: activeRes.data || [],
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

  const { category, city, position, amount } = await request.json().catch(() => ({}))
  if (!category || !['1', '2', '3'].includes(String(position))) {
    return NextResponse.json({ error: 'Category and position are required' }, { status: 400 })
  }
  const pos = Number(position)
  const fee = Number(amount)
  if (!Number.isFinite(fee) || fee <= 0) {
    return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data: existing } = await supabase
    .from('bids')
    .select('id, status')
    .eq('business_id', businessId)
    .eq('category', category)
    .eq('city', city)
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
    .eq('city', city)
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
    city,
    position: pos,
    amount: fee,
    period: nextMonthStart(),
    status: 'pending',
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
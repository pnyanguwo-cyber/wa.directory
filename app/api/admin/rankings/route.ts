import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()

  const [spotsRes, bidsRes] = await Promise.all([
    supabase
      .from('rank_spots')
      .select('id, business_id, category, city, position, monthly_fee, period_start, period_end, status, payment_confirmed_at, created_at')
      .order('period_start', { ascending: false })
      .limit(300),
    supabase
      .from('bids')
      .select('id, business_id, category, city, position, amount, period, status, admin_feedback, fallback_position, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const bizIds = new Set<string>()
  for (const s of spotsRes.data || []) bizIds.add(s.business_id)
  for (const b of bidsRes.data || []) bizIds.add(b.business_id)

  const { data: businesses } = bizIds.size
    ? await supabase.from('businesses').select('id, name, slug, phone').in('id', [...bizIds])
    : { data: [] }

  const bizById = new Map((businesses || []).map(b => [b.id, b]))

  return NextResponse.json({
    spots: (spotsRes.data || []).map(s => ({ ...s, business: bizById.get(s.business_id) || null })),
    bids: (bidsRes.data || []).map(b => ({ ...b, business: bizById.get(b.business_id) || null })),
  })
}

function monthRange(): { start: string; end: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const supabase = getSupabase()
    const { start, end } = monthRange()

    if (body.action === 'override') {
      const { business_id, category, city, position, monthly_fee, period_start, period_end } = body
      if (!business_id || !category || !position) {
        return NextResponse.json({ error: 'business_id, category and position are required' }, { status: 400 })
      }
      const pos = Number(position)
      if (![1, 2, 3].includes(pos)) {
        return NextResponse.json({ error: 'Position must be 1, 2 or 3' }, { status: 400 })
      }

      await supabase
        .from('rank_spots')
        .update({ status: 'expired' })
        .eq('category', category)
        .eq('city', city || '')
        .eq('position', pos)
        .eq('status', 'active')

      const { data, error } = await supabase
        .from('rank_spots')
        .insert({
          business_id,
          category,
          city: city || '',
          position: pos,
          monthly_fee: Number(monthly_fee || 0),
          period_start: period_start || start,
          period_end: period_end || end,
          status: 'active',
          payment_confirmed_at: new Date().toISOString(),
        })
        .select('id')

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, id: data?.[0]?.id })
    }

    if (body.action === 'place') {
      // Promote an existing pending bid or pending spot to active (payment confirmed)
      const { rank_spot_id, bid_id } = body
      if (rank_spot_id) {
        const { data: spot } = await supabase
          .from('rank_spots')
          .select('business_id, category, city, position, monthly_fee, period_start, period_end')
          .eq('id', rank_spot_id)
          .maybeSingle()
        if (!spot) return NextResponse.json({ error: 'Spot not found' }, { status: 404 })

        await supabase
          .from('rank_spots')
          .update({ status: 'expired' })
          .eq('category', spot.category)
          .eq('city', spot.city)
          .eq('position', spot.position)
          .eq('status', 'active')

        const { error } = await supabase
          .from('rank_spots')
          .update({
            status: 'active',
            payment_confirmed_at: new Date().toISOString(),
            period_start: spot.period_start || start,
            period_end: spot.period_end || end,
          })
          .eq('id', rank_spot_id)

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        if (bid_id) {
          await supabase.from('bids').update({ status: 'approved' }).eq('id', bid_id)
          const { data: bidBiz } = await supabase
            .from('bids')
            .select('business_id')
            .eq('id', bid_id)
            .maybeSingle()
          if (bidBiz) {
            const { data: business } = await supabase
              .from('businesses')
              .select('name, phone')
              .eq('id', bidBiz.business_id)
              .maybeSingle()
            if (business?.phone) {
              sendWhatsAppMessage(
                business.phone,
                [
                  '🎉 *Your bid was approved!*',
                  '',
                  `Your business is now in the top 3 for *${spot.category}*${spot.city ? ` in ${spot.city}` : ''} (position #${spot.position}).`,
                  `Period: ${spot.period_start || start} → ${spot.period_end || end}`,
                  '',
                  'Manage it anytime in your portal.',
                ].join('\n')
              ).catch(() => {})
            }
          }
        }
        return NextResponse.json({ success: true })
      }

      if (body.bid_paid) {
        const { bid_id, monthly_fee } = body
        const { data: bid } = await supabase
          .from('bids')
          .select('business_id, category, city, position, amount, period')
          .eq('id', bid_id)
          .maybeSingle()
        if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 })

        await supabase
          .from('rank_spots')
          .update({ status: 'expired' })
          .eq('category', bid.category)
          .eq('city', bid.city)
          .eq('position', bid.position)
          .eq('status', 'active')

        const { error } = await supabase.from('rank_spots').insert({
          business_id: bid.business_id,
          category: bid.category,
          city: bid.city,
          position: bid.position,
          monthly_fee: Number(monthly_fee || bid.amount),
          period_start: bid.period,
          period_end: end,
          status: 'active',
          payment_confirmed_at: new Date().toISOString(),
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        await supabase.from('bids').update({ status: 'approved' }).eq('id', bid_id)
        return NextResponse.json({ success: true })
      }

      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const supabase = getSupabase()

    if (body.action === 'reject_bid') {
      const { bid_id, feedback } = body
      if (!bid_id) return NextResponse.json({ error: 'bid_id is required' }, { status: 400 })

      const { data: bid } = await supabase
        .from('bids')
        .select('business_id, category, city, position, amount, period, fallback_position')
        .eq('id', bid_id)
        .maybeSingle()

      await supabase
        .from('bids')
        .update({ status: 'rejected', admin_feedback: feedback || '' })
        .eq('id', bid_id)

      if (bid) {
        const { data: business } = await supabase
          .from('businesses')
          .select('phone, name')
          .eq('id', bid.business_id)
          .maybeSingle()

        if (business?.phone) {
          let message = [
            'ℹ️ *Your bid was not approved*',
            '',
            `Bid: ${bid.category}${bid.city ? ` in ${bid.city}` : ''} — position #${bid.position}`,
            feedback ? `Reason: ${feedback}` : 'Reason: not specified',
          ].join('\n')

          if (bid.fallback_position && bid.position === 1) {
            const { error: fallbackError } = await supabase.from('bids').insert({
              business_id: bid.business_id,
              category: bid.category,
              city: bid.city,
              position: bid.fallback_position,
              amount: bid.amount,
              period: bid.period,
              status: 'pending',
              fallback_position: null,
            })

            if (!fallbackError) {
              message += [
                '',
                '',
                `🔄 *Fallback bid created*`,
                `Your #1 bid was redirected to position #${bid.fallback_position} for the same amount ($${Number(bid.amount).toFixed(2)}).`,
                'Awaiting admin approval.',
              ].join('\n')
            }
          } else {
            message += '\n\nYou can submit a new bid anytime from your portal.'
          }

          sendWhatsAppMessage(business.phone, message).catch(() => {})
        }
      }
      return NextResponse.json({ success: true })
    }

    if (body.action === 'expire_spot') {
      const { spot_id } = body
      if (!spot_id) return NextResponse.json({ error: 'spot_id is required' }, { status: 400 })
      const { error } = await supabase
        .from('rank_spots')
        .update({ status: 'expired' })
        .eq('id', spot_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (body.action === 'delete_bid') {
      const { bid_id } = body
      if (!bid_id) return NextResponse.json({ error: 'bid_id is required' }, { status: 400 })
      const { error } = await supabase.from('bids').delete().eq('id', bid_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
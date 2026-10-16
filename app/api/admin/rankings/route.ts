import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin-auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

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
      .select('id, business_id, category, city, position, amount, period, status, admin_feedback, fallback_position, payer_phone, paynow_paid_at, paynow_reference, created_at')
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

    if (body.action === 'reset_scope') {
      // Manually reset the auction for one (category, city) scope: the base
      // price returns to $0.10 and rankings fall back to the default
      // algorithm (rarely-seen weighted shuffle) — every business starts
      // from zero again.
      const { category, city } = body
      if (!category) return NextResponse.json({ error: 'category is required' }, { status: 400 })
      const cityKey = city || ''
      const period = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

      // 1. Snapshot everyone affected BEFORE anything changes, so we can
      //    notify them afterwards: spot holders (paid placements), unpaid
      //    bidders and paid bidders.
      const [spotsRes, pendingRes, paidRes] = await Promise.all([
        supabase
          .from('rank_spots')
          .select('business_id, position')
          .eq('category', category)
          .eq('city', cityKey)
          .eq('status', 'active'),
        supabase
          .from('bids')
          .select('business_id, amount')
          .eq('category', category)
          .eq('city', cityKey)
          .eq('period', period)
          .eq('status', 'pending'),
        supabase
          .from('bids')
          .select('business_id, amount')
          .eq('category', category)
          .eq('city', cityKey)
          .eq('period', period)
          .eq('status', 'paid'),
      ])

      // 2. Expire every active rank spot in this scope (the paid #1/#2/#3 go away).
      const { error: spotsError } = await supabase
        .from('rank_spots')
        .update({ status: 'expired' })
        .eq('category', category)
        .eq('city', cityKey)
        .eq('status', 'active')
      if (spotsError) return NextResponse.json({ error: spotsError.message }, { status: 500 })

      // 3. Close out this period's live bids in the scope so the auction
      //    restarts clean: unpaid → expired, paid-but-not-yet-activated →
      //    outbid (they lost their money spot to the reset).
      const { error: pendingError } = await supabase
        .from('bids')
        .update({ status: 'expired' })
        .eq('category', category)
        .eq('city', cityKey)
        .eq('period', period)
        .eq('status', 'pending')
      if (pendingError) return NextResponse.json({ error: pendingError.message }, { status: 500 })

      const { error: paidError } = await supabase
        .from('bids')
        .update({ status: 'outbid' })
        .eq('category', category)
        .eq('city', cityKey)
        .eq('period', period)
        .eq('status', 'paid')
      if (paidError) return NextResponse.json({ error: paidError.message }, { status: 500 })

      // 4. WhatsApp every affected business — spot holders and bidders
      //    alike — with a note tailored to what the reset costs them.
      const affected = new Map<string, { spots: number[]; paid?: number; pending?: number }>()
      for (const s of spotsRes.data || []) {
        const entry = affected.get(s.business_id) || { spots: [] }
        entry.spots.push(Number(s.position))
        affected.set(s.business_id, entry)
      }
      for (const b of paidRes.data || []) {
        const entry = affected.get(b.business_id) || { spots: [] }
        entry.paid = Math.max(entry.paid ?? 0, Number(b.amount))
        affected.set(b.business_id, entry)
      }
      for (const b of pendingRes.data || []) {
        const entry = affected.get(b.business_id) || { spots: [] }
        entry.pending = Math.max(entry.pending ?? 0, Number(b.amount))
        affected.set(b.business_id, entry)
      }

      let notified = 0
      if (affected.size > 0) {
        const { data: affectedBiz } = await supabase
          .from('businesses')
          .select('id, phone')
          .in('id', [...affected.keys()])
        const portalUrl = `${process.env.SITE_URL || 'https://wadirectory.co.zw'}/portal/ranking`
        for (const biz of affectedBiz || []) {
          const info = affected.get(biz.id)
          if (!info || !biz.phone) continue
          const lines: string[] = []
          if (info.spots.length > 0) {
            lines.push(`Your paid spot${info.spots.length > 1 ? 's' : ''} (#${info.spots.sort((a, b) => a - b).join(', #')}) was cleared.`)
          }
          if (info.paid != null) {
            lines.push(`Your paid bid of $${info.paid.toFixed(2)} was outbid by the reset.`)
          }
          if (info.pending != null) {
            lines.push(`Your pending bid of $${info.pending.toFixed(2)} was closed — nothing was charged.`)
          }
          sendWhatsAppMessage(
            biz.phone,
            [
              'ℹ️ *Ranking auction reset*',
              '',
              `The ranking auction for *${category}*${cityKey ? ` in ${cityKey}` : ''} was reset by the directory team.`,
              ...lines,
              'Results now follow the default order and the bidding base price restarts from $0.10.',
              '',
              'You can bid again anytime from your portal:',
              portalUrl,
            ].join('\n')
          ).catch(() => {})
          notified++
        }
      }

      return NextResponse.json({ success: true, notified })
    }

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
            `Bid: ${bid.category}${bid.city ? ` in ${bid.city}` : ''}, position #${bid.position}`,
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
// Shared #1-spot activation used by both payment confirmation paths:
//   • /api/portal/ranking/confirm  (client polling the poll URL)
//   • /api/paynow/result           (Paynow's server-to-server result update)
// The moment a bid's EcoCash payment is confirmed, the bid is marked `paid`
// and, as the live auction's winner, it takes over the #1 spot instantly:
// the previous holder's active spot is expired and the winner's spot is
// inserted with payment_confirmed_at set.
// Bids are ONE-TIME payments; you hold #1 indefinitely until outbid.

import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { SITE_URL } from '@/lib/site-url'
import { getHarareStartOfDay, formatHarareDateTimeFull } from '@/lib/date-utils'

export async function activateBidAsNumberOne(supabase: ReturnType<typeof getSupabase>, bidId: string) {
  const { data: bid } = await supabase
    .from('bids')
    .select('id, business_id, category, city, position, amount, period, status, paynow_paid_at')
    .eq('id', bidId)
    .maybeSingle()
  if (!bid) return { error: 'Bid not found' }

  // Idempotency: already activated?
  if (bid.status === 'approved') return { activated: false }

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, phone')
    .eq('id', bid.business_id)
    .maybeSingle()

  // Get the current #1 holder BEFORE expiring (for notification)
  const { data: oldHolder } = await supabase
    .from('rank_spots')
    .select('business_id, monthly_fee')
    .eq('category', bid.category)
    .eq('city', bid.city)
    .eq('position', 1)
    .eq('status', 'active')
    .maybeSingle()

  // Expire the current #1 holder in the same scope.
  await supabase
    .from('rank_spots')
    .update({ status: 'expired' })
    .eq('category', bid.category)
    .eq('city', bid.city)
    .eq('position', 1)
    .eq('status', 'active')

  const periodStart = getHarareStartOfDay().slice(0, 10)
  // period_end is set far in the future (year 2099) = indefinite until outbid
  const periodEnd = '2099-12-31'
  const { error: spotError } = await supabase
    .from('rank_spots')
    .insert({
      business_id: bid.business_id,
      category: bid.category,
      city: bid.city,
      position: 1,
      monthly_fee: bid.amount,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'active',
      payment_confirmed_at: formatHarareDateTimeFull(new Date()),
    })

  if (spotError) return { error: spotError.message }

  await supabase.from('bids').update({ status: 'approved' }).eq('id', bidId)

  // Outbid the rest of the field: any lower pending/paid bids become outbid.
  await supabase
    .from('bids')
    .update({ status: 'outbid' })
    .eq('category', bid.category)
    .eq('city', bid.city)
    .eq('period', bid.period)
    .eq('position', 1)
    .in('status', ['pending', 'paid'])
    .lt('amount', bid.amount)
    .neq('id', bidId)

  // Tell the winner.
  if (business?.phone) {
    sendWhatsAppMessage(
      business.phone,
      [
        '🎉 *You are now #1!*',
        '',
        `Your business is the top result for *${bid.category}*${bid.city ? ` in ${bid.city}` : ''}.`,
        `One-time fee paid: $${Number(bid.amount).toFixed(2)} — you hold #1 until someone outbids you.`,
        '',
        'Manage it anytime in your portal.',
      ].join('\n')
    ).catch(() => {})
  }

  // Notify the previous #1 holder they've been outbid.
  if (oldHolder && oldHolder.business_id !== bid.business_id) {
    const { data: oldBusiness } = await supabase
      .from('businesses')
      .select('name, phone')
      .eq('id', oldHolder.business_id)
      .maybeSingle()

    if (oldBusiness?.phone) {
      sendWhatsAppMessage(
        oldBusiness.phone,
        [
          '📉 *You\'ve been outbid*',
          '',
          `Your #1 spot for *${bid.category}*${bid.city ? ` in ${bid.city}` : ''} was taken over.`,
          `Your previous fee: $${Number(oldHolder.monthly_fee).toFixed(2)}`,
          `New #1 fee: $${Number(bid.amount).toFixed(2)}`,
          '',
          'Type `bid` to place a new bid and reclaim the top spot.',
        ].join('\n')
      ).catch(() => {})
    }
  }

  return { activated: true }
}

// Mark a bid paid (idempotent) — returns true when this call flipped it.
export async function markBidPaid(supabase: ReturnType<typeof getSupabase>, bidId: string) {
  const { data: bid } = await supabase
    .from('bids')
    .select('id, status, paynow_paid_at')
    .eq('id', bidId)
    .maybeSingle()
  if (!bid) return { error: 'Bid not found' as const }
  if (bid.paynow_paid_at) return { flipped: false }
  const { error } = await supabase
    .from('bids')
    .update({ status: 'paid', paynow_paid_at: formatHarareDateTimeFull(new Date()) })
    .eq('id', bidId)
  if (error) return { error: error.message }
  return { flipped: true }
}

// Admin notification for an instant #1 takeover.
export async function notifyAdminTakeover(bid: {
  amount: number | string
  paynow_reference?: string | null
  business_id: string
}) {
  const admin = process.env.ADMIN_WHATSAPP
  if (!admin) return
  const supabase = getSupabase()
  const { data: business } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', bid.business_id)
    .maybeSingle()
  sendWhatsAppMessage(
    admin,
    [
      '💳 *BID PAID — #1 TAKEN OVER*',
      '',
      `Business: *${business?.name || 'Unknown'}*`,
      `Bid: $${Number(bid.amount).toFixed(2)}`,
      `Paynow ref: ${bid.paynow_reference || 'n/a'}`,
      'EcoCash confirmed automatically via Paynow.',
      '',
      `Review: ${SITE_URL}/admin`,
    ].join('\n')
  ).catch(() => {})
}
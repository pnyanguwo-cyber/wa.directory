// Shared #1-spot activation used by both payment confirmation paths:
//   • /api/portal/ranking/confirm  (client polling the poll URL)
//   • /api/paynow/result           (Paynow's server-to-server result update)
// The moment a bid's EcoCash payment is confirmed, the bid is marked `paid`
// and, as the live auction's winner, it takes over the #1 spot instantly:
// the previous holder's active spot is expired and the winner's spot is
// inserted with payment_confirmed_at set.

import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function monthEnd(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return d.toISOString().slice(0, 10)
}

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

  // Expire the current #1 holder in the same scope.
  await supabase
    .from('rank_spots')
    .update({ status: 'expired' })
    .eq('category', bid.category)
    .eq('city', bid.city)
    .eq('position', 1)
    .eq('status', 'active')

  const periodStart = new Date().toISOString().slice(0, 10)
  const { error: spotError } = await supabase
    .from('rank_spots')
    .insert({
      business_id: bid.business_id,
      category: bid.category,
      city: bid.city,
      position: 1,
      monthly_fee: bid.amount,
      period_start: periodStart,
      period_end: monthEnd(),
      status: 'active',
      payment_confirmed_at: new Date().toISOString(),
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
        `Monthly fee: $${Number(bid.amount).toFixed(2)} · until ${monthEnd()}`,
        '',
        'Manage it anytime in your portal.',
      ].join('\n')
    ).catch(() => {})
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
    .update({ status: 'paid', paynow_paid_at: new Date().toISOString() })
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
      `Review: ${process.env.SITE_URL || 'https://wadirectory.co.zw'}/admin`,
    ].join('\n')
  ).catch(() => {})
}

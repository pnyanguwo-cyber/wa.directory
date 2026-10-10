// Shared listing-subscription activation used by both confirmation paths:
//   • /api/paynow/result        (Paynow's server-to-server result update)
//   • /api/admin/subscriptions  (manual admin override)
// The moment a listing payment is confirmed, the subscription becomes active
// and the business flips to payment_status 'active' + verified, so it shows
// in search instantly.

import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function activateListingSubscription(
  supabase: NonNullable<ReturnType<typeof import('@/lib/supabase-server').getSupabase>>,
  subscriptionId: string,
  opts: { autoConfirmed?: boolean } = {}
): Promise<{ ok: boolean; error?: string; businessId?: string }> {
  const { data: sub } = await supabase
    .from('listing_subscriptions')
    .select('id, business_id, plan, pro_assistance, amount')
    .eq('id', subscriptionId)
    .maybeSingle()

  if (!sub) return { ok: false, error: 'Listing subscription not found' }

  const now = new Date()

  const { data: existingActive } = await supabase
    .from('listing_subscriptions')
    .select('id, expires_at')
    .eq('business_id', sub.business_id)
    .eq('status', 'active')
    .maybeSingle()

  // Activation extends an existing active period; otherwise starts fresh.
  const base =
    existingActive?.expires_at && new Date(existingActive.expires_at) > now
      ? new Date(existingActive.expires_at)
      : now
  const planDays = sub.plan === '6m' ? 180 : sub.plan === '12m' ? 360 : 30
  const expiresAt = new Date(base.getTime() + planDays * 86400000)

  const { error: subError } = await supabase
    .from('listing_subscriptions')
    .update({
      status: 'active',
      started_at: (existingActive?.expires_at ? undefined : now.toISOString()) as string | undefined,
      expires_at: expiresAt.toISOString(),
      auto_confirmed_at: opts.autoConfirmed ? now.toISOString() : null,
    })
    .eq('id', subscriptionId)

  if (subError) return { ok: false, error: subError.message }

  const { error: bizError } = await supabase
    .from('businesses')
    .update({
      payment_status: 'active',
      verified: true,
      listing_activated_at: now.toISOString(),
    })
    .eq('id', sub.business_id)

  if (bizError) return { ok: false, error: bizError.message }

  // Best-effort owner notification for auto-confirmed payments.
  if (opts.autoConfirmed) {
    const { data: business } = await supabase
      .from('businesses')
      .select('name, phone, username')
      .eq('id', sub.business_id)
      .maybeSingle()

    if (business?.phone) {
      const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'
      sendWhatsAppMessage(
        business.phone,
        [
          '🎉 *Payment received — you are live!*',
          '',
          `${business.name} (@${business.username || 'N/A'}) is now visible on WA Directory.`,
          `Active until ${expiresAt.toISOString().slice(0, 10)}.`,
          '',
          `Renew anytime: ${siteUrl}/pay`,
        ].join('\n')
      ).catch(() => {})
    }
  }

  return { ok: true, businessId: sub.business_id }
}

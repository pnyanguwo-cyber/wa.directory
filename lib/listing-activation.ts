// Shared listing-subscription activation used by both confirmation paths:
//   • /api/paynow/result        (Paynow's server-to-server result update)
//   • /api/admin/subscriptions  (manual admin override)
// The moment a listing payment is confirmed, the subscription becomes active
// and the business flips to payment_status 'active' + verified, so it shows
// in search instantly.

import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { SITE_URL } from '@/lib/site-url'
import { getBotSetting } from '@/lib/bot-settings'
import { renderChannelPitch } from '@/lib/bot-templates'

export async function activateListingSubscription(
  supabase: NonNullable<ReturnType<typeof import('@/lib/supabase-server').getSupabase>>,
  subscriptionId: string,
  opts: { autoConfirmed?: boolean } = {}
): Promise<{ ok: boolean; error?: string; businessId?: string }> {
  const { data: sub } = await supabase
    .from('listing_subscriptions')
    .select('id, business_id, plan, pro_assistance, amount, payer_phone')
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
      const siteUrl = SITE_URL
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

      // Channel pitch: now that the supplier is live, tell them where buyer
      // leads surface (free-form while the session window is open).
      const chOverride = await getBotSetting('channel_link')
      const chLink = (chOverride || process.env.CHANNEL_LINK || '').trim()
      if (chLink) {
        sendWhatsAppMessage(business.phone, renderChannelPitch(chLink)).catch(() => {})
      }
    }

    // When someone pays for a business other than their own, the payer should
    // also hear the confirmation (the owner notify above targets the listing
    // phone). payer_phone is stored in 07… format; WhatsApp needs 263….
    const payerPhone = (sub as { payer_phone?: string | null }).payer_phone
    const payerWa = payerPhone
      ? payerPhone.startsWith('263')
        ? payerPhone
        : payerPhone.startsWith('0')
          ? `263${payerPhone.slice(1)}`
          : null
      : null
    if (payerWa && business?.phone !== payerWa) {
      sendWhatsAppMessage(
        payerWa,
        [
          '🎉 *Payment received!*',
          '',
          `${business?.name || 'The listing'} is paid and active until ${expiresAt.toISOString().slice(0, 10)}.`,
          '',
          'Thank you for supporting the directory!',
        ].join('\n')
      ).catch(() => {})
    }
  }

  return { ok: true, businessId: sub.business_id }
}

// Shared listing-subscription activation used by both confirmation paths:
//   • /api/paynow/result        (Paynow's server-to-server result update)
//   • /api/admin/subscriptions  (manual admin override)
// The moment a listing payment is confirmed, the subscription becomes active
// and the business flips to payment_status 'active' + verified, so it shows
// in search instantly.

import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { sendCategoryEducationalImage } from '@/lib/category-education'
import { SITE_URL } from '@/lib/site-url'
import { getBotSetting } from '@/lib/bot-settings'
import { renderChannelPitch } from '@/lib/bot-templates'
import { portalAccessLines } from '@/lib/portal-invite'
import { clearConversationState } from '@/lib/bot-state'
import { PLAN_CONFIG, formatUsd, type PlanType } from '@/types'

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
      // A paid payment always produces a paid subscription. If this row was a
      // trial, its trial history stays on the row but it is no longer a trial
      // and must never be counted as $0 revenue.
      is_trial: false,
      trial_eligible: false,
      trial_status: 'converted',
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

  // Owner onboarding notification — fires for auto-confirmed payments AND
  // admin manual confirmations alike: the moment money lands or the admin
  // activates, the owner gets their confirmation + every link.
  {
    const { data: business } = await supabase
      .from('businesses')
      .select('name, phone, username, slug, edit_token, category')
      .eq('id', sub.business_id)
      .maybeSingle()

    if (business?.phone) {
      const siteUrl = SITE_URL
      // Throw the owner their links immediately: listing, auto-website,
      // portal — the paying moment is the best onboarding window we get.
      const bizSlug = business.slug || business.username || ''
      const editToken = (business as { edit_token?: string | null }).edit_token || ''
      const links = [
        `🏢 Profile: ${siteUrl}/business/${bizSlug}`,
        `🌐 Website: ${siteUrl}/site/${bizSlug}`,
        ...(await portalAccessLines(supabase, {
          id: sub.business_id,
          username: business.username,
          editToken,
        })),
      ]

      // Determine plan details for the message from the one pricing table.
      const config = sub.plan && PLAN_CONFIG[sub.plan as PlanType] ? PLAN_CONFIG[sub.plan as PlanType] : null
      const planLabel = config ? `${config.label} (${formatUsd(config.price)})` : sub.plan

      // Main confirmation message (clean, focused on review/publishing)
      await sendWhatsAppMessage(
        business.phone,
        [
          '🎉 *Payment received — you are live!*',
          '',
          `${business.name} (@${business.username || 'N/A'}) is now visible on WA Directory.`,
          `Plan: ${planLabel}`,
          `Active until ${expiresAt.toISOString().slice(0, 10)}.`,
          '',
          ...links,
          '',
          ...(editToken
            ? [`📱 Your QR codes (chat + portal) — print them for customers: ${siteUrl}/my-qr/${bizSlug}`, '']
            : []),
          `Renew anytime: ${siteUrl}/pay`,
          '',
          'Your listing is live! Customers can now find you in search.',
          '',
          'Reply *help* anytime.',
        ].join('\n')
      ).catch(() => {})

      // Send category-specific educational image (post-submission onboarding)
      await sendCategoryEducationalImage(business.phone, business.category).catch(() => {})

      // Clear conversation state - onboarding complete
      clearConversationState(business.phone).catch(() => {})

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

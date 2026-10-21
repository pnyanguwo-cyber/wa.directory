// Core listing-subscription payment engine, shared by /api/pay (web) and the
// WhatsApp bot pay flow:
//   1. Validate the business (exists, not already active, not Yellow Pages).
//   2. Create/update the pending listing_subscriptions row (idempotent).
//   3. Flip the business to payment_status 'pending'.
//   4. When Paynow env vars exist, push an EcoCash remote transaction to the
//      payer's phone; /api/paynow/result auto-confirms LISTING-<subId> and
//      activates the listing with no admin step. Otherwise the admin manual
//      verification flow applies (the admin WhatsApp alert fires either way).

import { getSupabase } from '@/lib/supabase-server'
import { initiateEcoCashPayment } from '@/lib/paynow'
import { logPaymentEvent } from '@/lib/payment-events'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { PLAN_CONFIG, PRO_ASSISTANCE_PRICE } from '@/types'
import type { PlanType } from '@/types'
import { SITE_URL } from '@/lib/site-url'
import { digitsOnly } from '@/lib/phone'
import type { NextRequest } from 'next/server'

export interface CreateListingPaymentInput {
  /** Public business id, e.g. WA-8SLL6A */
  businessId: string
  /** Paying phone — raw user input; digitsOnly is applied inside. */
  payerPhone: string
  plan: PlanType
  hasProAssistance?: boolean
  /** Overrides PLAN_CONFIG pricing (sub row, Paynow request, labels) —
   * used by the $0.20 personal-contact listing flow, which rides plan '1m'. */
  amountOverride?: number
  /** Optional request for the payment-event audit log (IP/UA). */
  request?: Request | NextRequest
}

export type CreateListingPaymentResult =
  | { ok: true; autoEcoCash: boolean; instructions: string | null; message: string }
  | { ok: false; status: number; error: string }

export function paymentAmountFor(plan: PlanType, hasProAssistance?: boolean): number {
  return PLAN_CONFIG[plan].price + (hasProAssistance ? PRO_ASSISTANCE_PRICE : 0)
}

export async function createListingPayment(
  input: CreateListingPaymentInput
): Promise<CreateListingPaymentResult> {
  const payerClean = digitsOnly(input.payerPhone)
  if (payerClean.length < 9) {
    return { ok: false, status: 400, error: 'Invalid payer phone number' }
  }

  const supabase = getSupabase()

  // Find the business + the special (Yellow Pages) categories — independent.
  const [{ data: business }, { data: specialCats }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, name, username, payment_status, category')
      .eq('business_id', input.businessId)
      .maybeSingle(),
    supabase
      .from('categories')
      .select('name')
      .eq('special', true),
  ])

  if (!business) {
    return { ok: false, status: 404, error: 'Business not found' }
  }

  const bizId = (business as { id: string }).id

  // Check if already active
  if (business.payment_status === 'active') {
    return { ok: false, status: 400, error: 'This listing is already active' }
  }

  const isFree = business.category?.some((c: string) =>
    (specialCats || []).some(sc => sc.name === c)
  )
  if (isFree) {
    return { ok: false, status: 400, error: 'Yellow Pages listings are free' }
  }

  // Check for an existing pending subscription to reuse (idempotent retries).
  const { data: existing } = await supabase
    .from('listing_subscriptions')
    .select('id')
    .eq('business_id', bizId)
    .eq('status', 'pending')
    .maybeSingle()

  // Create or update the pending subscription, then — when Paynow is
  // configured — push a real EcoCash payment request to the payer's phone.
  // Paynow's result webhook (/api/paynow/result) auto-confirms LISTING-<id>
  // payments and activates the subscription without any admin action.
  const amount = input.amountOverride ?? paymentAmountFor(input.plan, input.hasProAssistance)
  const planLabel = input.amountOverride != null ? 'Personal contact' : PLAN_CONFIG[input.plan].label

  let subscriptionId: string
  if (existing) {
    subscriptionId = existing.id
    await supabase
      .from('listing_subscriptions')
      .update({ payer_phone: payerClean, amount, plan: input.plan, pro_assistance: !!input.hasProAssistance })
      .eq('id', existing.id)
  } else {
    const inserted = await supabase
      .from('listing_subscriptions')
      .insert({
        business_id: bizId,
        status: 'pending',
        amount,
        payer_phone: payerClean,
        plan: input.plan,
        pro_assistance: !!input.hasProAssistance,
      })
      .select('id')
      .single()
    if (inserted.error || !inserted.data) {
      return { ok: false, status: 500, error: inserted.error?.message || 'Could not create the payment record' }
    }
    subscriptionId = inserted.data.id
  }

  // Update business payment_status
  await supabase
    .from('businesses')
    .update({ payment_status: 'pending' })
    .eq('id', bizId)

  // Attempt automatic EcoCash payment via Paynow. Falls back to manual
  // admin verification when Paynow env vars are absent or initiation fails.
  let autoPayment: { initiated: boolean; instructions?: string } = { initiated: false }
  if (process.env.PAYNOW_INTEGRATION_ID && process.env.PAYNOW_INTEGRATION_KEY && process.env.SITE_URL) {
    const init = await initiateEcoCashPayment({
      reference: `LISTING-${subscriptionId}`,
      amount,
      phone: payerClean,
      additionalInfo: `WA Directory listing: ${business.name} (${planLabel})`,
      resultUrl: `${process.env.SITE_URL}/api/paynow/result`,
    })
    if (init.ok && init.pollUrl) {
      await supabase
        .from('listing_subscriptions')
        .update({ paynow_poll_url: init.pollUrl, paynow_reference: init.paynowReference || null })
        .eq('id', subscriptionId)
      autoPayment = { initiated: true, instructions: init.instructions }
      await logPaymentEvent({
        eventType: 'payment_initiated',
        businessId: bizId,
        detail: { via: 'listing_pay', plan: input.plan, amount, paynowRef: init.paynowReference },
        request: input.request,
      })
    } else {
      await logPaymentEvent({
        eventType: 'payment_init_failed',
        outcome: 'error',
        businessId: bizId,
        detail: { via: 'listing_pay', error: init.error || 'unknown' },
        request: input.request,
      })
    }
  }

  // Notify admin via WhatsApp (manual fallback signal — never blocks)
  if (process.env.ADMIN_WHATSAPP) {
    sendAdminPaymentNotification({
      businessName: business.name,
      username: (business as { username?: string | null }).username || null,
      planLabel,
      amount,
      hasProAssistance: !!input.hasProAssistance,
      payerEcoCash: payerClean,
      autoInitiated: autoPayment.initiated,
      siteUrl: SITE_URL,
    }).catch(() => {})
  }

  return {
    ok: true,
    autoEcoCash: autoPayment.initiated,
    instructions: autoPayment.instructions || null,
    message: autoPayment.initiated
      ? 'An EcoCash prompt was sent to your phone. Enter your PIN and your listing goes live automatically.'
      : 'Payment request submitted. Admin will verify and activate shortly.',
  }
}

// Decoupled so the notification can never break the payment result.
async function sendAdminPaymentNotification(payload: {
  businessName: string
  username: string | null
  planLabel: string
  amount: number
  hasProAssistance: boolean
  payerEcoCash: string
  autoInitiated: boolean
  siteUrl: string
}): Promise<void> {
  if (!process.env.ADMIN_WHATSAPP) return
  await sendWhatsAppMessage(
    process.env.ADMIN_WHATSAPP,
    [
      payload.autoInitiated ? '💰 *AUTOMATIC PAYMENT IN PROGRESS*' : '💰 *PAYMENT REQUEST*',
      '',
      `Business: ${payload.businessName}`,
      `Username: @${payload.username || 'N/A'}`,
      `Plan: ${payload.planLabel}`,
      `Amount: USD ${payload.amount.toFixed(2)}`,
      payload.hasProAssistance ? 'Add-on: Pro WhatsApp catalog setup' : '',
      `Payer EcoCash: +${payload.payerEcoCash}`,
      '',
      payload.autoInitiated
        ? 'EcoCash prompt sent to the payer. It will auto-confirm without admin action if they pay.'
        : `Check EcoCash for transaction from +${payload.payerEcoCash}`,
      payload.autoInitiated ? '' : `Review: ${payload.siteUrl}/admin`,
    ].filter(Boolean).join('\n')
  )
}

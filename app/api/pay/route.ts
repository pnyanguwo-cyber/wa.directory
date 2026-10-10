import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidBusinessId } from '@/lib/business-id'
import { normalizeForSearch, usernameMatches } from '@/lib/username'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { initiateEcoCashPayment, paynowConfigured } from '@/lib/paynow'
import { logPaymentEvent } from '@/lib/payment-events'
import { PLAN_CONFIG, PRO_ASSISTANCE_PRICE } from '@/types'
import type { PlanType } from '@/types'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Search for businesses by ID, username, phone, or name
async function searchBusinesses(supabase: ReturnType<typeof getSupabase>, query: string) {
  const trimmed = query.trim()
  if (!trimmed) return []

  // 1. Exact business ID match (WA-XXXXXX)
  if (isValidBusinessId(trimmed)) {
    const { data } = await supabase
      .from('businesses')
      .select('id, name, slug, business_id, username, phone, city, area, logo_url, category, payment_status')
      .eq('business_id', trimmed)
      .maybeSingle()
    return data ? [data] : []
  }

  // 2. Phone number search (strip non-digits)
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 9) {
    const { data } = await supabase
      .from('businesses')
      .select('id, name, slug, business_id, username, phone, city, area, logo_url, category, payment_status')
      .eq('phone', digits)
      .limit(10)
    if (data?.length) return data
  }

  // 3. Username search (smart match)
  const { data: allBiz } = await supabase
    .from('businesses')
    .select('id, name, slug, business_id, username, phone, city, area, logo_url, category, payment_status')
    .not('username', 'is', null)
    .limit(100)

  const usernameMatches_ = (allBiz || []).filter(b =>
    b.username && usernameMatches(trimmed, b.username)
  )
  if (usernameMatches_.length > 0) return usernameMatches_

  // 4. Name search (fuzzy)
  const { data: nameResults } = await supabase
    .from('businesses')
    .select('id, name, slug, business_id, username, phone, city, area, logo_url, category, payment_status')
    .ilike('name', `%${trimmed}%`)
    .limit(10)

  return nameResults || []
}

// GET: Search for a business
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  if (!query.trim()) {
    return NextResponse.json({ businesses: [] })
  }

  const supabase = getSupabase()
  const businesses = await searchBusinesses(supabase, query)
  return NextResponse.json({ businesses, payments_configured: paynowConfigured() })
}

// POST: Create a pending payment for a business
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { business_id, payer_phone, plan: rawPlan, hasProAssistance } = body || {}
    const plan: PlanType = rawPlan && PLAN_CONFIG[rawPlan as PlanType] ? rawPlan : '1m'

    if (!business_id || !payer_phone) {
      return NextResponse.json({ error: 'Business ID and payer phone are required' }, { status: 400 })
    }

    const payerClean = payer_phone.replace(/\D/g, '')
    if (payerClean.length < 9) {
      return NextResponse.json({ error: 'Invalid payer phone number' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Find the business
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, username, payment_status, category')
      .eq('business_id', business_id)
      .maybeSingle()

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if already active
    if (business.payment_status === 'active') {
      return NextResponse.json({ error: 'This listing is already active' }, { status: 400 })
    }

    // Check if Yellow Pages (free)
    const { data: specialCats } = await supabase
      .from('categories')
      .select('name')
      .eq('special', true)

    const isFree = business.category?.some((c: string) =>
      (specialCats || []).some(sc => sc.name === c)
    )
    if (isFree) {
      return NextResponse.json({ error: 'Yellow Pages listings are free' }, { status: 400 })
    }

    // Check for an existing pending subscription to reuse (idempotent retries).
    const { data: existing } = await supabase
      .from('listing_subscriptions')
      .select('id')
      .eq('business_id', business.id)
      .eq('status', 'pending')
      .maybeSingle()

    // Create or update the pending subscription, then — when Paynow is
    // configured — push a real EcoCash payment request to the payer's phone.
    // Paynow's result webhook (/api/paynow/result) auto-confirms LISTING-<id>
    // payments and activates the subscription without any admin action.
    let subscriptionId: string
    const amount = PLAN_CONFIG[plan].price + (hasProAssistance ? PRO_ASSISTANCE_PRICE : 0)

    if (existing) {
      subscriptionId = existing.id
      await supabase
        .from('listing_subscriptions')
        .update({ payer_phone: payerClean, amount, plan, pro_assistance: !!hasProAssistance })
        .eq('id', existing.id)
    } else {
      const inserted = await supabase
        .from('listing_subscriptions')
        .insert({
          business_id: business.id,
          status: 'pending',
          amount,
          payer_phone: payerClean,
          plan,
          pro_assistance: !!hasProAssistance,
        })
        .select('id')
        .single()
      if (inserted.error || !inserted.data) {
        return NextResponse.json({ error: inserted.error?.message || 'Could not create the payment record' }, { status: 500 })
      }
      subscriptionId = inserted.data.id
    }

    // Update business payment_status
    await supabase
      .from('businesses')
      .update({ payment_status: 'pending' })
      .eq('id', business.id)

    // Attempt automatic EcoCash payment via Paynow. Falls back to manual
    // admin verification when Paynow env vars are absent or initiation fails.
    let autoPayment: { initiated: boolean; instructions?: string } = { initiated: false }
    if (process.env.PAYNOW_INTEGRATION_ID && process.env.PAYNOW_INTEGRATION_KEY && process.env.SITE_URL) {
      const init = await initiateEcoCashPayment({
        reference: `LISTING-${subscriptionId}`,
        amount,
        phone: payerClean,
        additionalInfo: `WA Directory listing: ${business.name} (${PLAN_CONFIG[plan].label})`,
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
          businessId: business.id,
          detail: { via: 'listing_pay', plan, amount, paynowRef: init.paynowReference },
          request,
        })
      } else {
        await logPaymentEvent({
          eventType: 'payment_init_failed',
          outcome: 'error',
          businessId: business.id,
          detail: { via: 'listing_pay', error: init.error || 'unknown' },
          request,
        })
      }
    }

    // Notify admin via WhatsApp (manual fallback signal — never blocks)
    if (process.env.ADMIN_WHATSAPP) {
      const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'
      sendWhatsAppMessage(
        process.env.ADMIN_WHATSAPP,
        [
          autoPayment.initiated ? '💰 *AUTOMATIC PAYMENT IN PROGRESS*' : '💰 *PAYMENT REQUEST*',
          '',
          `Business: ${business.name}`,
          `Username: @${business.username || 'N/A'}`,
          `Plan: ${PLAN_CONFIG[plan].label}`,
          `Amount: USD ${amount.toFixed(2)}`,
          hasProAssistance ? 'Add-on: Pro WhatsApp catalog setup' : '',
          `Payer EcoCash: +${payerClean}`,
          '',
          autoPayment.initiated
            ? 'EcoCash prompt sent to the payer. It will auto-confirm without admin action if they pay.'
            : `Check EcoCash for transaction from +${payerClean}`,
          autoPayment.initiated ? '' : `Review: ${siteUrl}/admin`,
        ].filter(Boolean).join('\n')
      ).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      auto_ecocash: autoPayment.initiated,
      instructions: autoPayment.instructions || null,
      message: autoPayment.initiated
        ? 'An EcoCash prompt was sent to your phone. Enter your PIN and your listing goes live automatically.'
        : 'Payment request submitted. Admin will verify and activate shortly.',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

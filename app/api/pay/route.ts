import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { searchPayBusinesses } from '@/lib/pay-lookup'
import { createListingPayment } from '@/lib/listing-pay'
import { paynowConfigured } from '@/lib/paynow'
import { PLAN_CONFIG, PERSONAL_PLAN_CONFIG } from '@/types'
import type { PlanType } from '@/types'

// Thin wrapper over lib/pay-lookup + lib/listing-pay (shared with the
// WhatsApp bot pay flow — see those modules for the logic).

// GET: Search for a business
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  if (!query.trim()) {
    return NextResponse.json({ businesses: [] })
  }

  const supabase = getSupabase()
  const businesses = await searchPayBusinesses(supabase, query)
  return NextResponse.json({ businesses, payments_configured: paynowConfigured() })
}

// POST: Create a pending payment for a business
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { business_id, payer_phone, plan: rawPlan, hasProAssistance, kind } = body || {}
    const plan: PlanType = rawPlan && PERSONAL_PLAN_CONFIG[rawPlan as PlanType] ? rawPlan : '1m'

    if (!business_id || !payer_phone) {
      return NextResponse.json({ error: 'Business ID and payer phone are required' }, { status: 400 })
    }

    // Personal contacts ride the same plan keys/durations at the half-price
    // personal rates; lives through the same listing_subscriptions engine.
    const isPersonal = kind === 'personal'
    const result = await createListingPayment({
      businessId: business_id,
      payerPhone: payer_phone,
      plan,
      hasProAssistance: isPersonal ? false : !!hasProAssistance,
      amountOverride: isPersonal ? PERSONAL_PLAN_CONFIG[plan].price : undefined,
      request,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      auto_ecocash: result.autoEcoCash,
      instructions: result.instructions,
      message: result.message,
      amount: isPersonal ? PERSONAL_PLAN_CONFIG[plan].price : undefined,
      label: isPersonal ? 'Personal contact' : PLAN_CONFIG[plan].label,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidBusinessId } from '@/lib/business-id'
import { normalizeForSearch, usernameMatches } from '@/lib/username'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
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
  return NextResponse.json({ businesses })
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

    // Check for existing pending subscription
    const { data: existing } = await supabase
      .from('listing_subscriptions')
      .select('id')
      .eq('business_id', business.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      const amount = PLAN_CONFIG[plan].price + (hasProAssistance ? PRO_ASSISTANCE_PRICE : 0)
      await supabase
        .from('listing_subscriptions')
        .update({ payer_phone: payerClean, amount, plan, pro_assistance: !!hasProAssistance })
        .eq('id', existing.id)
    } else {
      const amount = PLAN_CONFIG[plan].price + (hasProAssistance ? PRO_ASSISTANCE_PRICE : 0)
      await supabase
        .from('listing_subscriptions')
        .insert({
          business_id: business.id,
          status: 'pending',
          amount,
          payer_phone: payerClean,
          plan,
          pro_assistance: !!hasProAssistance,
        })
    }

    // Update business payment_status
    await supabase
      .from('businesses')
      .update({ payment_status: 'pending' })
      .eq('id', business.id)

    // Notify admin via WhatsApp
    if (process.env.ADMIN_WHATSAPP) {
      const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'
      const amount = PLAN_CONFIG[plan].price + (hasProAssistance ? PRO_ASSISTANCE_PRICE : 0)
      sendWhatsAppMessage(
        process.env.ADMIN_WHATSAPP,
        [
          '💰 *PAYMENT REQUEST*',
          '',
          `Business: ${business.name}`,
          `Username: @${business.username || 'N/A'}`,
          `Plan: ${PLAN_CONFIG[plan].label}`,
          `Amount: USD ${amount.toFixed(2)}`,
          hasProAssistance ? 'Add-on: Pro WhatsApp catalog setup' : '',
          `Payer EcoCash: +${payerClean}`,
          '',
          `Check EcoCash for transaction from +${payerClean}`,
          `Review: ${siteUrl}/admin`,
        ].filter(Boolean).join('\n')
      ).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: 'Payment request submitted. Admin will verify and activate shortly.',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

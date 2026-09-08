import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBusinessId } from '@/lib/business-auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { PLAN_CONFIG, PRO_ASSISTANCE_PRICE } from '@/types'
import type { PlanType } from '@/types'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const businessId = getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const plan: PlanType = body.plan || '1m'
    const hasProAssistance: boolean = body.hasProAssistance || false

    if (!PLAN_CONFIG[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Get business info
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, username, phone, payment_status')
      .eq('id', businessId)
      .maybeSingle()

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    // Check if Yellow Pages (free)
    const { data: specialCats } = await supabase
      .from('categories')
      .select('name')
      .eq('special', true)

    const { data: bizCats } = await supabase
      .from('businesses')
      .select('category')
      .eq('id', businessId)
      .maybeSingle()

    const isFree = bizCats?.category?.some((c: string) =>
      (specialCats || []).some(sc => sc.name === c)
    )
    if (isFree) {
      return NextResponse.json({ error: 'Yellow Pages listings are free' }, { status: 400 })
    }

    const amount = PLAN_CONFIG[plan].price + (hasProAssistance ? PRO_ASSISTANCE_PRICE : 0)

    // Check for existing pending subscription
    const { data: existing } = await supabase
      .from('listing_subscriptions')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'pending')
      .maybeSingle()

    if (!existing) {
      await supabase
        .from('listing_subscriptions')
        .insert({
          business_id: businessId,
          status: 'pending',
          amount,
          plan,
          pro_assistance: hasProAssistance,
        })
    } else {
      await supabase
        .from('listing_subscriptions')
        .update({ amount, plan, pro_assistance: hasProAssistance })
        .eq('id', existing.id)
    }

    // Update payment_status
    await supabase
      .from('businesses')
      .update({ payment_status: 'pending' })
      .eq('id', businessId)

    // Notify admin
    if (process.env.ADMIN_WHATSAPP) {
      const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'
      const planLabel = PLAN_CONFIG[plan].label
      sendWhatsAppMessage(
        process.env.ADMIN_WHATSAPP,
        [
          '💰 *LISTING RENEWAL REQUEST*',
          '',
          `Business: ${business.name}`,
          `Username: @${business.username || 'N/A'}`,
          `Plan: ${planLabel}`,
          `Amount: USD ${amount.toFixed(2)}`,
          hasProAssistance ? 'Add-on: Pro WhatsApp catalog setup' : '',
          '',
          `Owner requesting renewal from portal.`,
          `Review: ${siteUrl}/admin`,
        ].filter(Boolean).join('\n')
      ).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: `Renewal request (${PLAN_CONFIG[plan].label}) submitted. Pay USD ${amount.toFixed(2)} via EcoCash at /pay or let the admin know.`,
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

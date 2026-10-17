import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { getActingPortalBusiness } from '@/lib/portal'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { PLAN_CONFIG, PRO_ASSISTANCE_PRICE } from '@/types'
import type { PlanType } from '@/types'
import { SITE_URL } from '@/lib/site-url'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    // branch_id: HQ renewing a branch's listing on its behalf (org-scoped).
    const session = await getActingPortalBusiness(body?.branch_id)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const businessId = session.business.id

    const plan: PlanType = body.plan || '1m'
    const hasProAssistance: boolean = body.hasProAssistance || false

    if (!PLAN_CONFIG[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Get business info + the special (Yellow Pages) categories in parallel.
    // The business row already carries `category`, so no second query is needed.
    const [{ data: business }, { data: specialCats }] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, name, username, phone, payment_status, category')
        .eq('id', businessId)
        .maybeSingle(),
      supabase
        .from('categories')
        .select('name')
        .eq('special', true),
    ])

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    // Check if Yellow Pages (free)
    const isFree = (business.category || []).some((c: string) =>
      (specialCats || []).some((sc: { name: string }) => sc.name === c)
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
      const siteUrl = SITE_URL
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

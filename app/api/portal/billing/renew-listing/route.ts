import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBusinessId } from '@/lib/business-auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

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

    // Check for existing pending subscription
    const { data: existing } = await supabase
      .from('listing_subscriptions')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'pending')
      .maybeSingle()

    if (!existing) {
      // Create new pending subscription
      await supabase
        .from('listing_subscriptions')
        .insert({
          business_id: businessId,
          status: 'pending',
          amount: 1.00,
        })
    }

    // Update payment_status
    await supabase
      .from('businesses')
      .update({ payment_status: 'pending' })
      .eq('id', businessId)

    // Notify admin
    if (process.env.ADMIN_WHATSAPP) {
      const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'
      sendWhatsAppMessage(
        process.env.ADMIN_WHATSAPP,
        [
          '💰 *LISTING RENEWAL REQUEST*',
          '',
          `Business: ${business.name}`,
          `Username: @${business.username || 'N/A'}`,
          `Amount: USD 1.00`,
          '',
          `Owner requesting renewal from portal.`,
          `Review: ${siteUrl}/admin`,
        ].join('\n')
      ).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: 'Renewal request submitted. Pay USD 1 via EcoCash at /pay or let the admin know.',
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

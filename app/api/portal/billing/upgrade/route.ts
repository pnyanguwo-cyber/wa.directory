import { NextResponse } from 'next/server'
import { getBusinessId } from '@/lib/business-auth'
import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(request: Request) {
  const businessId = getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (body?.businessId && body.businessId !== businessId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, phone')
    .eq('id', businessId)
    .maybeSingle()

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id, status, expires_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.status === 'active' && (!existing.expires_at || new Date(existing.expires_at) > new Date())) {
    return NextResponse.json({ error: 'You already have an active subscription' }, { status: 400 })
  }
  if (existing?.status === 'pending') {
    return NextResponse.json({ success: true })
  }

  await supabase.from('subscriptions').insert({
    business_id: businessId,
    status: 'pending',
    amount: 0,
    admin_note: '',
  })

  const admin = process.env.ADMIN_WHATSAPP
  if (admin) {
    sendWhatsAppMessage(
      admin,
      [
        '💎 *PREMIUM UPGRADE REQUEST*',
        '',
        `Business: *${business.name}*`,
        `Phone: ${business.phone}`,
        '',
        `Confirm payment & activate: ${process.env.SITE_URL || 'https://wadirectory.co.zw'}/admin`,
      ].join('\n')
    ).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
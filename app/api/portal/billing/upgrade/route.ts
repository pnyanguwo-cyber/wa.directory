import { NextResponse } from 'next/server'
import { getActingPortalBusiness } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  // branch_id: HQ requesting an upgrade for one of its branches (org-scoped).
  const session = await getActingPortalBusiness(body?.branch_id)
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  const businessId = session.business.id

  if (body?.businessId && body.businessId !== businessId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = getSupabase()

  // The business row and the latest subscription are independent — fetch together.
  const [{ data: business }, { data: existing }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, name, phone')
      .eq('id', businessId)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('id, status, expires_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

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
import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import { prioritySwitchState, setPrioritySwitch } from '@/lib/needs'

export async function GET() {
  const denied = adminGuard()
  if (denied) return denied

  const state = await prioritySwitchState()
  return NextResponse.json({
    enabled: state.enabled,
    price: state.price,
    adminWhatsAppSet: !!process.env.ADMIN_WHATSAPP,
  })
}

export async function POST(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const body = await request.json()
    const enabled = body?.enabled === true
    const price = String(body?.price || '$3/month').slice(0, 40)
    const ok = await setPrioritySwitch(enabled, price)
    if (!ok) return NextResponse.json({ error: 'save failed' }, { status: 500 })
    return NextResponse.json({ ok: true, enabled, price })
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
}

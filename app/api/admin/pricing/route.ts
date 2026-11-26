import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import { getPricing, setPricing, DEFAULT_PRICING, type PricingConfig } from '@/lib/pricing'

export async function GET() {
  const denied = adminGuard()
  if (denied) return denied
  const pricing = await getPricing()
  return NextResponse.json({ pricing, defaults: DEFAULT_PRICING })
}

export async function PATCH(request: Request) {
  const denied = adminGuard()
  if (denied) return denied
  try {
    const body = await request.json()
    const pricing = body?.pricing as PricingConfig
    if (!pricing) return NextResponse.json({ error: 'pricing required' }, { status: 400 })
    const ok = await setPricing(pricing)
    if (!ok) return NextResponse.json({ error: 'save failed' }, { status: 500 })
    const saved = await getPricing()
    return NextResponse.json({ ok: true, pricing: saved })
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
}

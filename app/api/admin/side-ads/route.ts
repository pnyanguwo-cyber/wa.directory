import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import { getBotSetting, setBotSetting } from '@/lib/bot-settings'

interface SideAd { text: string; link: string; image_url: string; active: boolean }

const DEFAULTS = { left: { text: '', link: '', image_url: '', active: false }, right: { text: '', link: '', image_url: '', active: false } }

export async function GET() {
  const denied = adminGuard()
  if (denied) return denied
  const raw = await getBotSetting('side_ads')
  let data = DEFAULTS
  if (raw) {
    try { data = { ...DEFAULTS, ...JSON.parse(raw) } } catch {}
  }
  return NextResponse.json({ sideAds: data })
}

export async function PATCH(request: Request) {
  const denied = adminGuard()
  if (denied) return denied
  try {
    const body = await request.json()
    const currentRaw = await getBotSetting('side_ads')
    let current = DEFAULTS
    if (currentRaw) { try { current = { ...DEFAULTS, ...JSON.parse(currentRaw) } } catch {} }
    const next = { ...current, ...(body || {}) }
    await setBotSetting('side_ads', JSON.stringify(next))
    return NextResponse.json({ ok: true, sideAds: next })
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
}

import { NextResponse } from 'next/server'
import { getBotSetting } from '@/lib/bot-settings'

export async function GET() {
  const raw = await getBotSetting('side_ads')
  let data = { left: { text: '', link: '', image_url: '', active: false }, right: { text: '', link: '', image_url: '', active: false } }
  if (raw) { try { data = { ...data, ...JSON.parse(raw) } } catch {} }
  return NextResponse.json({ sideAds: data })
}

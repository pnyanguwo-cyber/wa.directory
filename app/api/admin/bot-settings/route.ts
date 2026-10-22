import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import { prioritySwitchState, setPrioritySwitch } from '@/lib/needs'
import { getBotSetting, setBotSetting } from '@/lib/bot-settings'
import { digitsOnly } from '@/lib/phone'

const MAX_ADMINS = 20

async function readAllowlist(): Promise<string[]> {
  const raw = await getBotSetting('admin_allowlist')
  try {
    const parsed = JSON.parse(raw || '[]')
    if (Array.isArray(parsed)) {
      return [...new Set(parsed.map((x: unknown) => digitsOnly(String(x))).filter(Boolean))] as string[]
    }
  } catch {
    // fallthrough
  }
  return []
}

export async function GET() {
  const denied = adminGuard()
  if (denied) return denied

  const state = await prioritySwitchState()
  const root = digitsOnly(process.env.ADMIN_WHATSAPP || '')
  const override = ((await getBotSetting('channel_link')) || '').trim()
  const envLink = (process.env.CHANNEL_LINK || '').trim()
  return NextResponse.json({
    enabled: state.enabled,
    price: state.price,
    adminWhatsAppSet: !!process.env.ADMIN_WHATSAPP,
    root: root ? `+${root}` : '',
    allowlist: await readAllowlist(),
    channelLink: { override, env: envLink },
  })
}

export async function POST(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const body = await request.json()
    const action = String(body?.action || 'switch')

    if (action === 'admin_add' || action === 'admin_del') {
      const num = digitsOnly(String(body?.number || ''))
      if (!num || num.length < 10) return NextResponse.json({ error: 'use a full phone number, e.g. 2637…' }, { status: 400 })
      const current = await readAllowlist()
      const next =
        action === 'admin_add'
          ? [...new Set([...current, num])]
          : current.filter(n => n !== num)
      if (action === 'admin_add' && next.length > MAX_ADMINS) {
        return NextResponse.json({ error: `list is full (${MAX_ADMINS} admins max)` }, { status: 400 })
      }
      await setBotSetting('admin_allowlist', JSON.stringify(next))
      return NextResponse.json({ ok: true, allowlist: next })
    }

    if (action === 'channel_set') {
      const link = String(body?.link || '').trim()
      if (!/^https?:\/\/\S+$/.test(link)) {
        return NextResponse.json({ error: 'paste a full link starting with https://' }, { status: 400 })
      }
      await setBotSetting('channel_link', link.slice(0, 200))
      return NextResponse.json({ ok: true })
    }

    if (action === 'channel_clear') {
      await setBotSetting('channel_link', '')
      return NextResponse.json({ ok: true })
    }

    // Default: the priority supplier switch (legacy shape without action).
    const enabled = body?.enabled === true
    const price = String(body?.price || '$3/month').slice(0, 40)
    const ok = await setPrioritySwitch(enabled, price)
    if (!ok) return NextResponse.json({ error: 'save failed' }, { status: 500 })
    return NextResponse.json({ ok: true, enabled, price })
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
}

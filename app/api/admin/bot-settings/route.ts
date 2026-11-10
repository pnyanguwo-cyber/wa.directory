import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import { prioritySwitchState, setPrioritySwitch } from '@/lib/needs'
import { getBotSetting, setBotSetting } from '@/lib/bot-settings'
import { digitsOnly } from '@/lib/phone'

const MAX_ADMINS = 20

// Default AI feature controls
const DEFAULT_FEATURE_CONTROLS = {
  registration_draft: { enabled: true, daily_limit_per_biz: 10 },
  listing_draft: { enabled: true, daily_limit_per_biz: 20 },
  search_expansion: { enabled: true, daily_limit_per_biz: 50 },
  seo_blurb: { enabled: true, daily_limit_per_biz: 5 },
  intent_classification: { enabled: true, daily_limit_per_biz: 100 },
  vision_analysis: { enabled: true, daily_limit_per_biz: 10 },
}

// Default usage limits by tier
const DEFAULT_USAGE_LIMITS = {
  free: { daily_requests: 20, daily_tokens: 50000, monthly_tokens: 500000 },
  premium: { daily_requests: 200, daily_tokens: 500000, monthly_tokens: 5000000 },
  admin: { daily_requests: 1000, daily_tokens: 2000000, monthly_tokens: 20000000 },
}

// Default model config
const DEFAULT_MODEL_CONFIG = {
  default_model: 'gemini-1.5-flash',
  fallback_model: 'gemini-1.5-flash-8b',
  allowed_models: ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
}

// Default quota alerts
const DEFAULT_QUOTA_ALERTS = {
  warning_threshold_pct: 80,
  critical_threshold_pct: 95,
  notified_at: null,
}

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

async function getJsonSetting<T>(key: string, defaultValue: T): Promise<T> {
  const raw = await getBotSetting(key)
  if (!raw) return defaultValue
  try {
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

export async function GET() {
  const denied = adminGuard()
  if (denied) return denied

  const state = await prioritySwitchState()
  const root = digitsOnly(process.env.ADMIN_WHATSAPP || '')
  const override = ((await getBotSetting('channel_link')) || '').trim()
  const envLink = (process.env.CHANNEL_LINK || '').trim()

  // Fetch AI settings
  const [
    aiGlobalPaused,
    aiFeatureControls,
    aiUsageLimits,
    aiModelConfig,
    aiQuotaAlerts,
  ] = await Promise.all([
    getJsonSetting('ai_global_paused', { paused: false }),
    getJsonSetting('ai_feature_controls', DEFAULT_FEATURE_CONTROLS),
    getJsonSetting('ai_usage_limits', DEFAULT_USAGE_LIMITS),
    getJsonSetting('ai_model_config', DEFAULT_MODEL_CONFIG),
    getJsonSetting('ai_quota_alerts', DEFAULT_QUOTA_ALERTS),
  ])

  return NextResponse.json({
    enabled: state.enabled,
    price: state.price,
    adminWhatsAppSet: !!process.env.ADMIN_WHATSAPP,
    root: root ? `+${root}` : '',
    allowlist: await readAllowlist(),
    channelLink: { override, env: envLink },
    // AI Controls
    ai_global_paused: aiGlobalPaused,
    ai_feature_controls: aiFeatureControls,
    ai_usage_limits: aiUsageLimits,
    ai_model_config: aiModelConfig,
    ai_quota_alerts: aiQuotaAlerts,
  })
}

export async function PATCH(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const body = await request.json()
    // Allow partial updates: { key: value }
    const entries = Object.entries(body)
    if (entries.length === 0) {
      return NextResponse.json({ error: 'no fields provided' }, { status: 400 })
    }

    for (const [key, value] of entries) {
      await setBotSetting(key, JSON.stringify(value))
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
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

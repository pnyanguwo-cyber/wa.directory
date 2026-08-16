import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authorized(request: Request): boolean {
  if (request.headers.get('x-vercel-cron') === '1') return true
  const secret = process.env.CRON_SECRET
  return !!secret && request.headers.get('authorization') === `Bearer ${secret}`
}

const SITE_URL = process.env.SITE_URL || 'https://wadirectory.co.zw'

async function notifyExpiringSpots(supabase: ReturnType<typeof getSupabase>) {
  const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const { data: spots } = await supabase
    .from('rank_spots')
    .select('id, business_id, category, city, position, period_end, renewal_notified_at')
    .eq('status', 'active')
    .lte('period_end', soon)
    .is('renewal_notified_at', null)
    .limit(50)

  if (!spots?.length) return { notified: 0 }

  const ids = [...new Set(spots.map(s => s.business_id))]
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, phone')
    .in('id', ids)

  const bizById = new Map((businesses || []).map(b => [b.id, b]))

  let notified = 0
  for (const s of spots) {
    const biz = bizById.get(s.business_id)
    if (!biz?.phone) continue
    sendWhatsAppMessage(
      biz.phone,
      [
        '⏰ *Your ranking spot expires soon*',
        '',
        `Your #${s.position} spot for *${s.category}*${s.city ? ` in ${s.city}` : ''} ends on ${s.period_end}.`,
        '',
        `Renew or bid for next month before it expires:`,
        `${SITE_URL}/portal/ranking`,
      ].join('\n')
    ).catch(() => {})
    await supabase
      .from('rank_spots')
      .update({ renewal_notified_at: new Date().toISOString() })
      .eq('id', s.id)
    notified++
  }
  return { notified }
}

async function notifyExpiringSubscriptions(supabase: ReturnType<typeof getSupabase>) {
  const soon = new Date(Date.now() + 3 * 86400000).toISOString()
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, business_id, expires_at')
    .eq('status', 'active')
    .lte('expires_at', soon)
    .limit(50)

  if (!subs?.length) return { notified: 0 }

  const ids = [...new Set(subs.map(s => s.business_id))]
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, phone')
    .in('id', ids)

  const bizById = new Map((businesses || []).map(b => [b.id, b]))

  let notified = 0
  for (const s of subs) {
    const biz = bizById.get(s.business_id)
    if (!biz?.phone) continue
    sendWhatsAppMessage(
      biz.phone,
      [
        '⏰ *Your premium subscription expires soon*',
        '',
        `Your subscription ends on ${s.expires_at ? s.expires_at.slice(0, 10) : 'soon'}.`,
        'Renew to keep full statistics, conversations and bidding:',
        `${SITE_URL}/portal/billing`,
      ].join('\n')
    ).catch(() => {})
    notified++
  }
  return { notified }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const results: Record<string, unknown> = {}

  const rollup = await supabase.rpc('rollup_stats')
  results.rollup = rollup.data

  const expire = await supabase.rpc('expire_ranks')
  results.expired = expire.data

  results.spotsNotified = await notifyExpiringSpots(supabase)
  results.subsNotified = await notifyExpiringSubscriptions(supabase)

  return NextResponse.json(results)
}
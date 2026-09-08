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

// === LISTING SUBSCRIPTION REMINDERS & EXPIRY ===

async function notifyExpiringListings(supabase: ReturnType<typeof getSupabase>) {
  const now = new Date()
  let notified = 0

  // Tier 1: 3-day reminder — expires within 3 days, not yet notified at 3-day mark
  const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000).toISOString()
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString()

  const { data: tier1 } = await supabase
    .from('listing_subscriptions')
    .select('id, business_id, expires_at, renewal_notified_at')
    .eq('status', 'active')
    .lte('expires_at', threeDaysFromNow)
    .or(`renewal_notified_at.is.null,renewal_notified_at.lt.${twoDaysAgo}`)
    .limit(50)

  if (tier1?.length) {
    const ids = [...new Set(tier1.map(s => s.business_id))]
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, name, phone, username')
      .in('id', ids)
    const bizById = new Map((businesses || []).map(b => [b.id, b]))

    for (const s of tier1) {
      const biz = bizById.get(s.business_id)
      if (!biz?.phone) continue
      const daysLeft = Math.ceil((new Date(s.expires_at).getTime() - now.getTime()) / 86400000)
      sendWhatsAppMessage(
        biz.phone,
        [
          '⏰ *Your WA Directory listing expires soon*',
          '',
          `${biz.name} (@${biz.username || 'N/A'}) expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
          '',
          `Pay USD 1 to renew. Anyone can pay for you:`,
          `${SITE_URL}/pay`,
          '',
          `Or renew from your portal:`,
          `${SITE_URL}/portal/billing`,
        ].join('\n')
      ).catch(() => {})
      await supabase
        .from('listing_subscriptions')
        .update({ renewal_notified_at: now.toISOString() })
        .eq('id', s.id)
      notified++
    }
  }

  // Tier 2: 1-day final reminder — expires within 1 day, notified more than 2 days ago
  const oneDayFromNow = new Date(now.getTime() + 1 * 86400000).toISOString()
  const { data: tier2 } = await supabase
    .from('listing_subscriptions')
    .select('id, business_id, expires_at, renewal_notified_at')
    .eq('status', 'active')
    .lte('expires_at', oneDayFromNow)
    .not('renewal_notified_at', 'is', null)
    .lte('renewal_notified_at', twoDaysAgo)
    .limit(50)

  if (tier2?.length) {
    const ids = [...new Set(tier2.map(s => s.business_id))]
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, name, phone, username')
      .in('id', ids)
    const bizById = new Map((businesses || []).map(b => [b.id, b]))

    for (const s of tier2) {
      const biz = bizById.get(s.business_id)
      if (!biz?.phone) continue
      sendWhatsAppMessage(
        biz.phone,
        [
          '🚨 *FINAL NOTICE: Your listing expires TOMORROW!*',
          '',
          `${biz.name} (@${biz.username || 'N/A'}) will be hidden from search results.`,
          '',
          `Pay USD 1 now to stay live:`,
          `${SITE_URL}/pay`,
        ].join('\n')
      ).catch(() => {})
      await supabase
        .from('listing_subscriptions')
        .update({ renewal_notified_at: now.toISOString() })
        .eq('id', s.id)
      notified++
    }
  }

  return { notified }
}

async function warnExpiredListings(supabase: ReturnType<typeof getSupabase>) {
  const now = new Date()
  // Tier 3: Grace period warning — expired 1-7 days ago, still active in DB
  const oneDayAgo = new Date(now.getTime() - 1 * 86400000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const { data: tier3 } = await supabase
    .from('listing_subscriptions')
    .select('id, business_id, expires_at')
    .eq('status', 'active')
    .lte('expires_at', oneDayAgo)
    .gte('expires_at', sevenDaysAgo)
    .limit(50)

  if (!tier3?.length) return { warned: 0, hidden: 0 }

  const ids = [...new Set(tier3.map(s => s.business_id))]
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, phone, username')
    .in('id', ids)
  const bizById = new Map((businesses || []).map(b => [b.id, b]))

  let warned = 0
  for (const s of tier3) {
    const biz = bizById.get(s.business_id)
    if (!biz?.phone) continue
    const daysExpired = Math.ceil((now.getTime() - new Date(s.expires_at).getTime()) / 86400000)
    const daysUntilHidden = 7 - daysExpired
    sendWhatsAppMessage(
      biz.phone,
      [
        '⚠️ *Your listing has expired*',
        '',
        `${biz.name} (@${biz.username || 'N/A'}) expired ${daysExpired} day${daysExpired !== 1 ? 's' : ''} ago.`,
        `It will be hidden in ${daysUntilHidden} day${daysUntilHidden !== 1 ? 's' : ''}.`,
        '',
        `Pay USD 1 to restore visibility:`,
        `${SITE_URL}/pay`,
      ].join('\n')
    ).catch(() => {})
    warned++
  }
  return { warned }
}

async function hideExpiredListings(supabase: ReturnType<typeof getSupabase>) {
  const now = new Date()
  // Tier 4: Hide listings expired more than 7 days ago
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const { data: toHide } = await supabase
    .from('listing_subscriptions')
    .select('id, business_id')
    .eq('status', 'active')
    .lte('expires_at', sevenDaysAgo)
    .limit(100)

  if (!toHide?.length) return { hidden: 0 }

  const ids = [...new Set(toHide.map(s => s.business_id))]

  // Expire the subscriptions
  await supabase
    .from('listing_subscriptions')
    .update({ status: 'expired' })
    .in('id', toHide.map(s => s.id))

  // Hide the businesses
  await supabase
    .from('businesses')
    .update({ payment_status: 'expired' })
    .in('id', ids)

  // Notify
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, phone, username')
    .in('id', ids)
  const bizById = new Map((businesses || []).map(b => [b.id, b]))

  let hidden = 0
  for (const s of toHide) {
    const biz = bizById.get(s.business_id)
    if (!biz?.phone) continue
    sendWhatsAppMessage(
      biz.phone,
      [
        '❌ *Your listing has been hidden*',
        '',
        `${biz.name} (@${biz.username || 'N/A'}) is no longer visible in the directory.`,
        '',
        `Pay USD 1 to restore it:`,
        `${SITE_URL}/pay`,
      ].join('\n')
    ).catch(() => {})
    hidden++
  }
  return { hidden }
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
  results.listingNotified = await notifyExpiringListings(supabase)
  results.listingWarned = await warnExpiredListings(supabase)
  results.listingHidden = await hideExpiredListings(supabase)

  return NextResponse.json(results)
}

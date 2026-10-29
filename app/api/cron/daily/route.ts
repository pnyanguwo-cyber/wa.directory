import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { SITE_URL } from '@/lib/site-url'
import { PERSONAL_PLAN_CONFIG } from '@/types'
import type { PlanType } from '@/types'

function authorized(request: Request): boolean {
  if (request.headers.get('x-vercel-cron') === '1') return true
  const secret = process.env.CRON_SECRET
  return !!secret && request.headers.get('authorization') === `Bearer ${secret}`
}

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

// Personal contacts (categories ['Personal Contact']) ride the same
// listing_subscriptions rows as businesses, but the generic "Your WA Directory
// listing" copy and the listed phone don't fit them: the person who pays is
// often NOT the number in the listing (a friend registered them from the bot,
// or /api/pay with kind=personal), and the renew price is the personal
// package, not the business one. These helpers branch the copy per tier and
// send the nag to the payer first, falling back to the listed number.

function isPersonalRow(biz: { category?: unknown } | undefined): boolean {
  return Array.isArray(biz?.category) && (biz!.category as string[]).includes('Personal Contact')
}

// Normalize payer_phone / business.phone to WhatsApp digits. Stored formats:
// 263… (bot flow), 0… (web /api/pay), +263… (businesses.phone). Returns 263….
function waNumber(raw: string | null | undefined): string | null {
  const digits = (raw || '').replace(/[^0-9]/g, '')
  if (!digits) return null
  if (digits.startsWith('263')) return digits
  if (digits.startsWith('0')) return `263${digits.slice(1)}`
  return digits
}

// Who should hear the nag for a personal contact: whoever paid (they can
// approve another EcoCash or send *pay* in chat); the listed number as backup.
function personalReminderTo(sub: { payer_phone?: string | null }, biz: { phone?: string | null }): string | null {
  return waNumber(sub.payer_phone) || waNumber(biz.phone)
}

// Renew price + duration label straight off the stored subscription, so
// legacy 20c rows and current $1/$5/$10 rows each quote what they actually cost.
function personalPackageLabel(sub: { plan?: string | null; amount?: number | null }): string {
  const typedPlan = sub.plan as PlanType | null
  const config = typedPlan ? PERSONAL_PLAN_CONFIG[typedPlan] : undefined
  const amount = typeof sub.amount === 'number' ? sub.amount : config?.price
  const price = amount != null ? `USD ${amount.toFixed(2)}` : 'your package'
  return config ? `${price} · ${config.label.toLowerCase()}` : price
}

type PersonalTier = 'soon' | 'final' | 'expired' | 'hidden'

function personalReminderBody(
  tier: PersonalTier,
  sub: { plan?: string | null; amount?: number | null },
  biz: { name?: string | null; business_id?: string | null },
  days?: number
): string {
  const head = `👤 *${biz.name || 'Personal contact'}* — directory contact`
  const pkg = personalPackageLabel(sub)
  const renewLink = biz.business_id ? `${SITE_URL}/pay?business_id=${biz.business_id}` : `${SITE_URL}/pay`
  switch (tier) {
    case 'soon':
      return [
        '⏰ *Your personal contact expires soon*',
        '',
        head,
        pkg,
        `Goes dark in ${days === 1 ? '1 day' : `${days} days`} — buyers stop finding the number.`,
        '',
        'Renew in 30 seconds (EcoCash PIN):',
        renewLink,
      ].join('\n')
    case 'final':
      return [
        '🚨 *Final notice — expires tomorrow!*',
        '',
        head,
        pkg,
        'Tomorrow it drops off the directory and WhatsApp shoppers stop finding it.',
        '',
        'Pay now to stay live:',
        renewLink,
      ].join('\n')
    case 'expired':
      return [
        '⚠️ *Your personal contact has expired*',
        '',
        head,
        pkg,
        `Expired ${days === 1 ? '1 day' : `${days} days`} ago — it stays visible in grace for 7 days, then it is hidden.`,
        '',
        'Pay to restore it the moment it confirms:',
        renewLink,
      ].join('\n')
    case 'hidden':
      return [
        '❌ *Personal contact removed from the directory*',
        '',
        head,
        `${pkg} — the 7-day grace period ended, so the number is no longer visible.`,
        '',
        'Pay to bring it back instantly, or register it again:',
        renewLink,
      ].join('\n')
  }
}

async function notifyExpiringListings(supabase: ReturnType<typeof getSupabase>) {
  const now = new Date()
  let notified = 0

  // Tier 1: 3-day reminder — expires within 3 days, not yet notified at 3-day mark
  const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000).toISOString()
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString()

  const { data: tier1 } = await supabase
    .from('listing_subscriptions')
    .select('id, business_id, expires_at, renewal_notified_at, plan, amount, payer_phone')
    .eq('status', 'active')
    .lte('expires_at', threeDaysFromNow)
    .or(`renewal_notified_at.is.null,renewal_notified_at.lt.${twoDaysAgo}`)
    .limit(50)

  if (tier1?.length) {
    const ids = [...new Set(tier1.map(s => s.business_id))]
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, name, phone, username, category, business_id')
      .in('id', ids)
    const bizById = new Map((businesses || []).map(b => [b.id, b]))

    for (const s of tier1) {
      const biz = bizById.get(s.business_id) as { name?: string; phone?: string; username?: string; category?: unknown; business_id?: string } | undefined
      if (!biz?.phone) continue
      if (isPersonalRow(biz)) {
        const to = personalReminderTo(s, biz)
        if (!to) continue
        const daysLeft = Math.max(1, Math.ceil((new Date(s.expires_at).getTime() - now.getTime()) / 86400000))
        sendWhatsAppMessage(to, personalReminderBody('soon', s, biz, daysLeft)).catch(() => {})
      } else {
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
      }
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
    .select('id, business_id, expires_at, renewal_notified_at, plan, amount, payer_phone')
    .eq('status', 'active')
    .lte('expires_at', oneDayFromNow)
    .not('renewal_notified_at', 'is', null)
    .lte('renewal_notified_at', twoDaysAgo)
    .limit(50)

  if (tier2?.length) {
    const ids = [...new Set(tier2.map(s => s.business_id))]
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, name, phone, username, category, business_id')
      .in('id', ids)
    const bizById = new Map((businesses || []).map(b => [b.id, b]))

    for (const s of tier2) {
      const biz = bizById.get(s.business_id) as { name?: string; phone?: string; username?: string; category?: unknown; business_id?: string } | undefined
      if (!biz?.phone) continue
      if (isPersonalRow(biz)) {
        const to = personalReminderTo(s, biz)
        if (!to) continue
        sendWhatsAppMessage(to, personalReminderBody('final', s, biz)).catch(() => {})
      } else {
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
      }
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
    .select('id, business_id, expires_at, plan, amount, payer_phone')
    .eq('status', 'active')
    .lte('expires_at', oneDayAgo)
    .gte('expires_at', sevenDaysAgo)
    .limit(50)

  if (!tier3?.length) return { warned: 0, hidden: 0 }

  const ids = [...new Set(tier3.map(s => s.business_id))]
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, phone, username, category, business_id')
    .in('id', ids)
  const bizById = new Map((businesses || []).map(b => [b.id, b]))

  let warned = 0
  for (const s of tier3) {
    const biz = bizById.get(s.business_id) as { name?: string; phone?: string; username?: string; category?: unknown; business_id?: string } | undefined
    if (!biz?.phone) continue
    const daysExpired = Math.ceil((now.getTime() - new Date(s.expires_at).getTime()) / 86400000)
    const daysUntilHidden = 7 - daysExpired
    if (isPersonalRow(biz)) {
      const to = personalReminderTo(s, biz)
      if (!to) continue
      sendWhatsAppMessage(to, personalReminderBody('expired', s, biz, daysExpired)).catch(() => {})
    } else {
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
    }
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
    .select('id, business_id, plan, amount, payer_phone')
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
    .select('id, name, phone, username, category, business_id')
    .in('id', ids)
  const bizById = new Map((businesses || []).map(b => [b.id, b]))

  let hidden = 0
  for (const s of toHide) {
    const biz = bizById.get(s.business_id) as { name?: string; phone?: string; username?: string; category?: unknown; business_id?: string } | undefined
    if (!biz?.phone) continue
    if (isPersonalRow(biz)) {
      const to = personalReminderTo(s, biz)
      if (!to) continue
      sendWhatsAppMessage(to, personalReminderBody('hidden', s, biz)).catch(() => {})
    } else {
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

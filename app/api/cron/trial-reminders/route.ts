/**
 * Trial Reminder Cron Job
 *
 * Sends reminders to businesses with active 90-day free trials:
 * - 7 days before expiry: "Your trial ends in 7 days"
 * - 3 days before expiry: "Your trial ends in 3 days"
 * - On expiry: "Your trial has expired"
 *
 * Can also send renewal prompts to expired trials.
 *
 * Cron schedule: Run daily at 9 AM local time
 * curl -X POST https://wa.directory/api/cron/trial-reminders
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { SITE_URL } from '@/lib/site-url'
import { PLAN_CONFIG, formatUsd } from '@/types'
import { setConversationState } from '@/lib/bot-state'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Simple auth check - require a secret key
  const authKey = request.nextUrl.searchParams.get('key')
  if (authKey !== process.env.CRON_SECRET_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await POST({} as Request)
  return NextResponse.json(results)
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase()
    const now = new Date()

    // Rolling windows, not "now minus N days": the old query looked for
    // trials that expired BEFORE today and after today at the same time, so it
    // could never match anything.
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Find trials expiring in 7 days (not yet reminded)
    const { data: sevenDayTrials, error: err7 } = await supabase
      .from('listing_subscriptions')
      .select(`
        business_id,
        trial_expires_at,
        trial_reminder_sent_7d
      `)
      .eq('is_trial', true)
      .eq('status', 'active')
      .not('trial_expires_at', 'is', null)
      .lte('trial_expires_at', in7Days.toISOString())
      .gt('trial_expires_at', in3Days.toISOString())
      .eq('trial_reminder_sent_7d', false)

    if (err7) console.error('[cron] Error fetching 7-day trials:', err7)

    // 2. 3-day expiry reminders
    const { data: threeDayTrials, error: err3 } = await supabase
      .from('listing_subscriptions')
      .select(`
        business_id,
        trial_expires_at,
        trial_reminder_sent_3d
      `)
      .eq('is_trial', true)
      .eq('status', 'active')
      .not('trial_expires_at', 'is', null)
      .lte('trial_expires_at', in3Days.toISOString())
      .gt('trial_expires_at', now.toISOString())
      .eq('trial_reminder_sent_3d', false)

    if (err3) console.error('[cron] Error fetching 3-day trials:', err3)

    // 3. Expired trials (offer renewal)
    const { data: expiredTrials, error: errExpired } = await supabase
      .from('listing_subscriptions')
      .select(`
        business_id,
        trial_expires_at,
        trial_reminder_sent_3d
      `)
      .eq('is_trial', true)
      .eq('status', 'active')
      .not('trial_expires_at', 'is', null)
      .lte('trial_expires_at', now.toISOString())

    if (errExpired) console.error('[cron] Error fetching expired trials:', errExpired)

    const messagesSent = {
      sevenDay: 0,
      threeDay: 0,
      expired: 0,
    }

    // Send 7-day reminders
    for (const trial of sevenDayTrials || []) {
      const business = await getBusinessById(supabase, trial.business_id)
      if (business?.phone) {
        await sendWhatsAppMessage(
          business.phone,
          `⏳ *Trial Expiring in 7 Days*

Your 90-day free trial expires on ${trial.trial_expires_at?.slice(0, 10)}.

To continue your listing:
• Reply *renew* for subscription options
• Or visit ${SITE_URL}/pay?business_id=${business.business_id}

Your listing will become inactive after the trial ends.`
        )
        await supabase
          .from('listing_subscriptions')
          .update({ trial_reminder_sent_7d: true })
          .eq('business_id', trial.business_id)
          .eq('is_trial', true)
        messagesSent.sevenDay++
      }
    }

    // Send 3-day reminders
    for (const trial of threeDayTrials || []) {
      const business = await getBusinessById(supabase, trial.business_id)
      if (business?.phone) {
        await sendWhatsAppMessage(
          business.phone,
          `⚠️ *Trial Expiring in 3 Days*

Your 90-day free trial expires on ${trial.trial_expires_at?.slice(0, 10)}.

⚡ Time to act now!
• Reply *renew* for subscription options
• Or visit ${SITE_URL}/pay?business_id=${business.business_id}

Your listing will become inactive after the trial ends.`
        )
        await supabase
          .from('listing_subscriptions')
          .update({ trial_reminder_sent_3d: true, trial_status: 'expiring' })
          .eq('business_id', trial.business_id)
          .eq('is_trial', true)
        await setConversationState(business.phone, 'TRIAL_EXPIRING', {
          businessId: trial.business_id,
          businessName: business.name,
          businessSlug: business.username || null,
          trialExpiresAt: trial.trial_expires_at,
        })
        messagesSent.threeDay++
      }
    }

    // Send expiry + renewal offer
    for (const trial of expiredTrials || []) {
      const business = await getBusinessById(supabase, trial.business_id)
      if (business?.phone) {
        await sendWhatsAppMessage(
          business.phone,
          `⏰ *Trial Expired*

Your 90-day free trial ended on ${trial.trial_expires_at?.slice(0, 10)}.

To reactivate your listing:
• Visit ${SITE_URL}/pay?business_id=${business.business_id}
• Choose your subscription plan (${formatUsd(PLAN_CONFIG['1m'].price)}/month, ${formatUsd(PLAN_CONFIG['6m'].price)}/6mo, ${formatUsd(PLAN_CONFIG['12m'].price)}/year)

Contact support if you need assistance.`
        )
        await supabase
          .from('listing_subscriptions')
          .update({ status: 'expired', trial_status: 'expired' })
          .eq('business_id', trial.business_id)
          .eq('is_trial', true)
        await supabase
          .from('businesses')
          .update({ payment_status: 'expired' })
          .eq('id', trial.business_id)
        await setConversationState(business.phone, 'TRIAL_EXPIRED', {
          businessId: trial.business_id,
          businessName: business.name,
          businessSlug: business.username || null,
          trialExpiresAt: trial.trial_expires_at,
        })
        messagesSent.expired++
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      messagesSent,
    })
  } catch (err) {
    console.error('[cron] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Helper to get business by subscription business_id
 */
async function getBusinessById(supabase: ReturnType<typeof getSupabase>, businessId: string) {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, business_id, phone, name, username')
    .eq('id', businessId)
    .single()

  return business
}
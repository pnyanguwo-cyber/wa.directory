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

    // 1. 7-day expiry reminders
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const today = new Date(now.toISOString().slice(0, 10))

    // Find trials expiring in 7 days (not yet reminded)
    const { data: sevenDayTrials, error: err7 } = await supabase
      .from('listing_subscriptions')
      .select(`
        business_id,
        trial_expires_at,
        trial_reminder_sent_7d
      `)
      .eq('trial_eligible', false)
      .eq('status', 'active')
      .not('trial_expires_at', 'is', null)
      .lt('trial_expires_at', sevenDaysAgo.toISOString())
      .gt('trial_expires_at', today.toISOString())
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
      .eq('trial_eligible', false)
      .eq('status', 'active')
      .not('trial_expires_at', 'is', null)
      .lt('trial_expires_at', threeDaysAgo.toISOString())
      .gt('trial_expires_at', today.toISOString())
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
      .eq('trial_eligible', false)
      .eq('status', 'active')
      .not('trial_expires_at', 'is', null)
      .lt('trial_expires_at', today.toISOString())
      .eq('trial_reminder_sent_3d', true) // Only send renewal offer once

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
• Reply *paid* for subscription options
• Or visit ${SITE_URL}/pay?business_id=${business.business_id}

Your listing will become inactive after the trial ends.`
        )
        await supabase
          .from('listing_subscriptions')
          .update({ trial_reminder_sent_7d: true })
          .eq('business_id', trial.business_id)
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
• Reply *paid* for subscription options
• Or visit ${SITE_URL}/pay?business_id=${business.business_id}

Your listing will become inactive after the trial ends.`
        )
        await supabase
          .from('listing_subscriptions')
          .update({ trial_reminder_sent_3d: true })
          .eq('business_id', trial.business_id)
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
• Choose your subscription plan ($2/month, $10/6mo, $20/year)

Contact support if you need assistance.`
        )
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
    .select('id, business_id, phone, name')
    .eq('id', businessId)
    .single()

  return business
}
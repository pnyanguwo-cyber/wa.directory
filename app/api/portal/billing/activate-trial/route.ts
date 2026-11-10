import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase-server'
import { getActingPortalBusiness } from '@/lib/portal'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { isTrialEligible } from '@/lib/trial-helpers'
import { SITE_URL } from '@/lib/site-url'

export async function POST(request: Request) {
  try {
    const session = await getActingPortalBusiness()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const businessId = session.business.id

    const supabase = getSupabase()

    // Check if already in trial
    const { data: existingTrial } = await supabase
      .from('listing_subscriptions')
      .select('id, trial_activated_at, trial_expires_at')
      .eq('business_id', businessId)
      .maybeSingle()

    if (existingTrial?.trial_activated_at && existingTrial?.trial_expires_at) {
      const expiresAt = new Date(existingTrial.trial_expires_at)
      if (expiresAt > new Date()) {
        return NextResponse.json({ error: 'Business already has an active trial' }, { status: 400 })
      }
    }

    // Check trial eligibility
    const eligibility = await isTrialEligible(businessId)
    if (!eligibility.eligible) {
      return NextResponse.json({ error: eligibility.reason || 'Not eligible for trial' }, { status: 400 })
    }

    const now = new Date()
    const trialExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    // Create or update subscription with trial
    const { error: subError } = await supabase
      .from('listing_subscriptions')
      .upsert({
        business_id: businessId,
        status: 'active',
        amount: 0,
        plan: '1m',
        trial_eligible: false,
        trial_activated_at: now.toISOString(),
        trial_expires_at: trialExpiresAt.toISOString(),
      })

    if (subError) {
      console.error('[activate-trial] error:', subError)
      return NextResponse.json({ error: subError.message }, { status: 500 })
    }

    // Update business status
    await supabase
      .from('businesses')
      .update({ payment_status: 'active', verified: true, listing_activated_at: now.toISOString() })
      .eq('id', businessId)

    // Send confirmation to business
    const { data: business } = await supabase
      .from('businesses')
      .select('name, phone')
      .eq('id', businessId)
      .single()

    if (business?.phone) {
      await sendWhatsAppMessage(
        business.phone,
        [
          '🎉 *90-Day FREE Trial Activated!*',
          '',
          `Your business listing is now live on WA Directory!`,
          '',
          `📅 Trial period: ${now.toISOString().slice(0, 10)} to ${trialExpiresAt.toISOString().slice(0, 10)}`,
          '',
          '✅ No payment required. Your listing stays active for 90 days.',
          '',
          `Profile: ${SITE_URL}/business/${business.name}`,
          '',
          'Reply *help* anytime.',
        ].join('\n')
      ).catch(() => {})
    }

    revalidatePath('/portal')
    revalidatePath('/portal/billing')

    return NextResponse.json({
      success: true,
      message: 'Trial activated! Your listing is now live for 90 days.',
      expires_at: trialExpiresAt.toISOString(),
    })
  } catch (err) {
    console.error('[activate-trial] Error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
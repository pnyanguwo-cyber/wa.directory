import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabase } from '@/lib/supabase-server'
import { getActingPortalBusiness } from '@/lib/portal'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { startTrialForBusiness } from '@/lib/trial-helpers'
import { logOnboarding } from '@/lib/onboarding-log'
import { SITE_URL } from '@/lib/site-url'

export async function POST(request: Request) {
  try {
    const session = await getActingPortalBusiness()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const businessId = session.business.id

    const supabase = getSupabase()

    // Published first: the 90 days must not start on submission or on a
    // pending listing. startTrialForBusiness enforces this and the one-trial
    // rule in a single place.
    const result = await startTrialForBusiness(businessId)
    if (!result.ok || !result.trialExpiresAt || !result.business) {
      logOnboarding('portal_trial_blocked', {
        businessId,
        error: result.error,
      })
      return NextResponse.json(
        { error: result.error || 'Not eligible for trial' },
        { status: 400 }
      )
    }

    const business = result.business
    const now = new Date()

    if (business.phone) {
      await sendWhatsAppMessage(
        business.phone,
        [
          '🎉 *90-Day FREE Trial Activated!*',
          '',
          `Your business listing is now live on WA Directory!`,
          '',
          `📅 Trial period: ${now.toISOString().slice(0, 10)} to ${result.trialExpiresAt.slice(0, 10)}`,
          '',
          '✅ No payment required and no automatic charge at the end.',
          '',
          `Profile: ${SITE_URL}/business/${business.slug || business.username || ''}`,
          '',
          'Reply *help* anytime.',
        ].join('\n')
      ).catch(() => {})
    }

    await supabase.from('businesses').update({ payment_status: 'active' }).eq('id', businessId)

    revalidatePath('/portal')
    revalidatePath('/portal/billing')

    return NextResponse.json({
      success: true,
      message: 'Trial activated! Your listing is now live for 90 days.',
      expires_at: result.trialExpiresAt,
    })
  } catch (err) {
    console.error('[activate-trial] Error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
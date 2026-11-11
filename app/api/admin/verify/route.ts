import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp'
import { isAdmin } from '@/lib/admin-auth'
import { SITE_URL } from '@/lib/site-url'
import { digitsOnly } from '@/lib/phone'
import { activateListingForDays, notifyBusinessLive } from '@/lib/admin-verify'
import { autoApproveBusinessLocations } from '@/lib/feature-request-actions'
import { notifyAdminApproval, notifyTrialActivation, notifyRejection } from '@/app/api/webhook/route'
import { isTrialEligible } from '@/lib/trial-helpers'

export async function POST(request: Request) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, verified, reason } = await request.json()

    const supabase = getSupabase()

    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, phone, slug, username, edit_token, payment_status, category')
      .eq('id', id)
      .single()

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (verified) {
      // Verifying a business verifies its location too: pending city/area
      // requests land in the approved lists for future users. Non-blocking.
      try {
        await autoApproveBusinessLocations(String(id))
      } catch {}

      // NEW FLOW: Offer trial option instead of requiring immediate payment
      // Only auto-grant if payment_status is already 'active' (already paid)
      const alreadyPaid = business.payment_status === 'active'

      if (alreadyPaid) {
        // Already paid - just verify and activate
        const grant = await activateListingForDays(String(id), 30)
        if (grant.error) {
          return NextResponse.json({ error: grant.error }, { status: 500 })
        }

        await notifyBusinessLive({
          name: business.name,
          phone: business.phone,
          slug: business.slug,
          id: String(id),
          username: business.username ?? null,
          editToken: business.edit_token ?? null,
        })
      } else if (reason?.toLowerCase().includes('trial')) {
        // Admin explicitly approved as trial
        await notifyTrialActivation(business.id, reason)
      } else {
        // Check if business is eligible for trial before offering payment selection
        const trialCheck = await isTrialEligible(String(id))

        if (trialCheck.eligible) {
          // Offer trial option to the business owner
          await notifyAdminApproval(business.id, reason, true)
        } else {
          // Offer direct package selection (business not eligible for trial)
          await notifyAdminApproval(business.id, reason, false)
        }
      }
    } else {
      // Rejection flow
      await notifyRejection(business.id, reason || 'Your listing was not approved')

      // Update business record
      await supabase
        .from('businesses')
        .update({ verified: false, payment_status: 'rejected', rejection_reason: reason })
        .eq('id', id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[verify] Error:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

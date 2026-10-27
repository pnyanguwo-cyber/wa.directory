import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp'
import { isAdmin } from '@/lib/admin-auth'
import { SITE_URL } from '@/lib/site-url'
import { digitsOnly } from '@/lib/phone'
import { activateListingForDays, notifyBusinessLive } from '@/lib/admin-verify'

export async function POST(request: Request) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, verified, reason } = await request.json()

    const supabase = getSupabase()

    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, phone, slug, username, edit_token, payment_status')
      .eq('id', id)
      .single()

    // Approving a business makes it live: search only shows listings with
    // payment_status = 'active'. Mirror the bot `verify` command: a fresh
    // approval grants 30 days (the cron reminder + expiry machinery takes
    // over); an already-active (paid) listing is just verified, never
    // extended for free.
    const paidThrough = business?.payment_status !== 'active'
    if (verified && paidThrough) {
      const grant = await activateListingForDays(String(id), 30)
      if (grant.error) {
        return NextResponse.json({ error: grant.error }, { status: 500 })
      }
    } else {
      const { error } = await supabase
        .from('businesses')
        .update({ verified })
        .eq('id', id)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (verified && business?.phone) {
      await notifyBusinessLive({
        name: business.name,
        phone: business.phone,
        slug: business.slug,
        id: String(id),
        username: business.username ?? null,
      })
    }

    // Rejected / unverified: tell the owner why (optional admin note) and
    // give them their private edit link so they can fix and resubmit.
    if (!verified && business?.phone) {
      const to = '+' + digitsOnly(business.phone)
      const editLink = business.edit_token
        ? `${SITE_URL}/edit?token=${business.edit_token}`
        : `${SITE_URL}/business/${business.slug || id}`
      const note = typeof reason === 'string' && reason.trim() ? reason.trim() : ''
      const tpl = process.env.WHATSAPP_TEMPLATE_REJECTED
      if (tpl) {
        sendWhatsAppTemplate(
          to,
          tpl,
          [business.name, note || 'Your listing was not approved', editLink]
        ).catch(err => console.error('[verify] rejection notification failed:', err))
      } else {
        sendWhatsAppMessage(
          to,
          [
            `⚠️ *LISTING UPDATE: ${business.name}*`,
            '',
            'Your listing on WA Directory is currently NOT verified.',
            note ? `Admin note: ${note}` : '',
            '',
            'You can review and update your listing anytime with your private link:',
            editLink,
            '',
            'Once updated, our team can verify it again.',
          ].filter(Boolean).join('\n')
        ).catch(err => console.error('[verify] rejection notification failed:', err))
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

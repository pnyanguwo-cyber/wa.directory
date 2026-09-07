import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp'
import { isAdmin } from '@/lib/admin-auth'

const SITE_URL = process.env.SITE_URL || 'https://wadirectory.co.zw'

export async function POST(request: Request) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, verified, reason } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: business } = await supabase
      .from('businesses')
      .select('phone, name, slug, edit_token')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('businesses')
      .update({ verified })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (verified && business?.phone) {
      const to = '+' + business.phone.replace(/\D/g, '')
      const link = `${SITE_URL}/business/${business.slug || id}`
      sendWhatsAppTemplate(
        to,
        process.env.WHATSAPP_TEMPLATE_APPROVED || 'you_are_live',
        [business.name, link]
      ).catch(err => console.error('[verify] notification failed:', err))
    }

    // Rejected / unverified: tell the owner why (optional admin note) and
    // give them their private edit link so they can fix and resubmit.
    if (!verified && business?.phone) {
      const to = '+' + business.phone.replace(/\D/g, '')
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
            `⚠️ *LISTING UPDATE — ${business.name}*`,
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
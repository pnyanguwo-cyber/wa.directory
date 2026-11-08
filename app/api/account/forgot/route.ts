import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { normalizePhone } from '@/lib/business-auth'
import { SITE_URL } from '@/lib/site-url'

export async function POST(request: Request) {
  try {
    const { phone } = await request.json()
    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, phone')
      .limit(1000)

    const given = normalizePhone(phone)
    const match = (businesses || []).find(b => normalizePhone(b.phone || '') === given)

    if (!match) {
      return NextResponse.json({ error: 'No account found for this number.' }, { status: 404 })
    }

    // A business registered through the WhatsApp bot never chose a password,
    // so there is no account row to store the OTP on. Sending the account
    // setup link is the only way in — an OTP here would never verify.
    const { data: account } = await supabase
      .from('business_accounts')
      .select('id')
      .eq('business_id', match.id)
      .maybeSingle()

    if (!account) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('edit_token')
        .eq('id', match.id)
        .maybeSingle()
      const token = (biz as { edit_token?: string | null } | null)?.edit_token || ''
      if (token) {
        sendWhatsAppMessage(
          given,
          [
            '🔐 *Create your WA Directory portal password*',
            '',
            'Your listing does not have a portal account yet — set a password here:',
            `${SITE_URL}/account-setup?token=${token}`,
            '',
            'The link is private to your listing. Once the password is set you can log in at',
            `${SITE_URL}/login with this WhatsApp number.`,
          ].join('\n')
        ).catch(err => console.error('[account/forgot] setup send failed:', err))
      }
      return NextResponse.json({
        success: true,
        needsSetup: true,
        message: token
          ? 'No password yet — we sent a setup link to your WhatsApp.'
          : 'No portal account yet. Contact support on WhatsApp to get your setup link.',
      })
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const otp_hash = await bcrypt.hash(otp, 10)

    await supabase
      .from('business_accounts')
      .update({ otp_hash, otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
      .eq('business_id', match.id)

    sendWhatsAppMessage(
      given,
      [
        '🔐 *WA Directory login code*',
        '',
        `Your one-time code is: *${otp}*`,
        'It expires in 10 minutes. Never share it with anyone.',
      ].join('\n')
    ).catch(err => console.error('[account/forgot] send failed:', err))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
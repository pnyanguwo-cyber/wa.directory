import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import bcrypt from 'bcryptjs'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { normalizePhone } from '@/lib/business-auth'
import { SITE_URL } from '@/lib/site-url'
import {
  findBusinessesByPhone,
  getBusinessAccounts,
  sortChoicesForDisplay,
  toBusinessChoice,
} from '@/lib/account-lookup'

export async function POST(request: Request) {
  try {
    const { phone, business_id } = await request.json()
    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 })
    }

    const matches = await findBusinessesByPhone(phone)
    if (matches.length === 0) {
      return NextResponse.json({ error: 'No account found for this number.' }, { status: 404 })
    }

    const accounts = await getBusinessAccounts(matches.map(business => business.id))

    // One number can own several listings. Ask which one before sending a
    // code or setup link, so the reset happens on the listing they chose.
    if (!business_id && matches.length > 1) {
      return NextResponse.json(
        {
          error: 'This number is linked to more than one business. Choose the business you want to recover.',
          needsBusinessSelection: true,
          businesses: sortChoicesForDisplay(
            matches.map(business => toBusinessChoice(business, accounts.get(business.id)))
          ),
        },
        { status: 409 }
      )
    }

    const match = business_id
      ? matches.find(business => business.id === business_id)
      : matches[0]

    if (!match) {
      return NextResponse.json(
        { error: 'That business is not linked to this phone number.' },
        { status: 400 }
      )
    }

    const account = accounts.get(match.id)
    const given = normalizePhone(phone)

    // A business registered through the WhatsApp bot never chose a password,
    // so there is no account row to store the OTP on. Sending the account
    // setup link is the only way in — an OTP here would never verify.
    if (!account) {
      const { data: biz } = await getSupabase()
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

    if (account.disabled) {
      return NextResponse.json({ error: 'This account is disabled. Contact support.' }, { status: 403 })
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const otp_hash = await bcrypt.hash(otp, 10)

    await getSupabase()
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

    return NextResponse.json({ success: true, business: { id: match.id, name: match.name } })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { normalizePhone } from '@/lib/business-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
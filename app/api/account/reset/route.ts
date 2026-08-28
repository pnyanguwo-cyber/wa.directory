import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { setBusinessSession, normalizePhone } from '@/lib/business-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const { phone, otp, password } = await request.json()
    if (!phone || !otp || !password) {
      return NextResponse.json({ error: 'Phone, code and password are required' }, { status: 400 })
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include letters and numbers' },
        { status: 400 }
      )
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

    const { data: account } = await supabase
      .from('business_accounts')
      .select('otp_hash, otp_expires_at')
      .eq('business_id', match.id)
      .maybeSingle()

    if (!account?.otp_hash) {
      return NextResponse.json({ error: 'No code was sent. Request a new one.' }, { status: 400 })
    }

    if (!account.otp_expires_at || new Date(account.otp_expires_at) < new Date()) {
      return NextResponse.json({ error: 'That code has expired. Request a new one.' }, { status: 400 })
    }

    const ok = await bcrypt.compare(otp, account.otp_hash)
    if (!ok) {
      return NextResponse.json({ error: 'Incorrect code' }, { status: 401 })
    }

    const password_hash = await bcrypt.hash(password, 10)
    await supabase
      .from('business_accounts')
      .update({ password_hash, otp_hash: '', otp_expires_at: null })
      .eq('business_id', match.id)

    setBusinessSession(match.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
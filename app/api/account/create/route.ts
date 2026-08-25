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
    const { edit_token, phone, password } = await request.json()

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Ownership is proven by possession of the listing's edit_token — a
    // server-generated secret delivered to the owner. A raw business_id is
    // NOT accepted here: it is public, so trusting it would let anyone claim
    // any listing (account takeover).
    if (!edit_token) {
      return NextResponse.json({ error: 'A valid setup link is required' }, { status: 400 })
    }
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: business } = await supabase
      .from('businesses')
      .select('id, phone')
      .eq('edit_token', edit_token)
      .single()

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // The entered phone must match the listed number (defence in depth).
    const given = normalizePhone(phone)
    const stored = normalizePhone(business.phone || '')
    if (!stored || given !== stored) {
      return NextResponse.json({ error: 'Phone number does not match this listing' }, { status: 400 })
    }

    // Never overwrite an existing password. Once an account is secured, a new
    // password must go through the OTP-verified reset flow (/api/account/reset).
    const { data: existing } = await supabase
      .from('business_accounts')
      .select('password_hash')
      .eq('business_id', business.id)
      .maybeSingle()

    if (existing?.password_hash) {
      return NextResponse.json(
        { error: 'An account already exists for this listing. Please log in or reset your password.' },
        { status: 409 }
      )
    }

    const password_hash = await bcrypt.hash(password, 10)

    const { error } = await supabase.from('business_accounts').upsert(
      { business_id: business.id, password_hash },
      { onConflict: 'business_id' }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    setBusinessSession(business.id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

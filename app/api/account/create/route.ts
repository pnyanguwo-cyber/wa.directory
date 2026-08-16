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
    const { business_id, edit_token, phone, password } = await request.json()

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const supabase = getSupabase()

    let business: { id: string; phone: string } | null = null

    if (business_id) {
      const { data } = await supabase.from('businesses').select('id, phone').eq('id', business_id).single()
      business = data || null
    } else if (edit_token) {
      const { data } = await supabase.from('businesses').select('id, phone').eq('edit_token', edit_token).single()
      business = data || null
    }

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (phone) {
      const given = normalizePhone(phone)
      const stored = normalizePhone(business.phone || '')
      if (stored && given !== stored) {
        return NextResponse.json({ error: 'Phone number does not match this listing' }, { status: 400 })
      }
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
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
    const { phone, password } = await request.json()
    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, phone, name, slug, verified')
      .order('created_at', { ascending: true })
      .limit(1000)

    const given = normalizePhone(phone)
    const match = (businesses || []).find(b => normalizePhone(b.phone || '') === given)

    if (!match) {
      return NextResponse.json({ error: 'No account found for this number. List your business first.' }, { status: 404 })
    }

    const { data: account } = await supabase
      .from('business_accounts')
      .select('password_hash, disabled')
      .eq('business_id', match.id)
      .maybeSingle()

    if (!account || account.disabled) {
      return NextResponse.json({ error: 'No password set for this number yet.' }, { status: 404 })
    }

    const ok = await bcrypt.compare(password, account.password_hash)
    if (!ok) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    setBusinessSession(match.id)
    return NextResponse.json({ success: true, name: match.name, slug: match.slug, verified: match.verified })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
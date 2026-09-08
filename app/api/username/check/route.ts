import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeUsername, suggestUsername } from '@/lib/username'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('username') || ''
  const name = searchParams.get('name') || ''

  if (!raw.trim() && !name.trim()) {
    return NextResponse.json({ error: 'Username or name is required' }, { status: 400 })
  }

  const supabase = getSupabase()

  // If only a name was provided, suggest a username
  const username = raw.trim() ? normalizeUsername(raw) : suggestUsername(name)

  if (!username || username.length < 3) {
    return NextResponse.json({ available: false, username: '', suggestion: '', error: 'Username too short' })
  }

  // Check exact match
  const { data: existing } = await supabase
    .from('businesses')
    .select('id, name, city, phone')
    .eq('username', username)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json({ available: true, username, suggestion: username })
  }

  // Username taken — suggest alternatives
  let suggestion = username
  for (let i = 2; i <= 10; i++) {
    const candidate = `${username}_${i}`
    const { data: check } = await supabase
      .from('businesses')
      .select('id')
      .eq('username', candidate)
      .maybeSingle()
    if (!check) {
      suggestion = candidate
      break
    }
  }

  return NextResponse.json({
    available: false,
    username,
    suggestion,
    existing: {
      name: existing.name,
      city: existing.city || '',
      phone: existing.phone || '',
    },
  })
}

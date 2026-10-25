import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin-auth'
import { adminGuard } from '@/lib/admin-auth'

export async function GET(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()

  const supabase = getSupabase()
  let query = supabase
    .from('chat_sessions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200)

  if (q) {
    query = query.ilike('phone', `%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ sessions: data || [] })
}

export async function DELETE(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const { phone } = await request.json()
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 })

    const supabase = getSupabase()
    const { error } = await supabase.from('chat_sessions').delete().eq('phone', phone)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

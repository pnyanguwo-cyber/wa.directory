import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { adminGuard } from '@/lib/admin-auth'
import { phoneDigits, phoneVariants } from '@/lib/chat'

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

export async function PATCH(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const { phone, action } = await request.json()
    if (!phone || (action !== 'hold' && action !== 'release')) {
      return NextResponse.json(
        { error: 'phone and action ("hold" or "release") are required' },
        { status: 400 }
      )
    }

    // Sessions and inbox rows have disagreed on the leading "+" before, so
    // look the contact up in both shapes before creating anything.
    const digits = phoneDigits(phone)
    if (!digits) return NextResponse.json({ error: 'phone is required' }, { status: 400 })
    const supabase = getSupabase()
    const { data: existing, error: readErr } = await supabase
      .from('chat_sessions')
      .select('*')
      .in('phone', phoneVariants(digits))
      .limit(1)
      .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })

    const now = new Date().toISOString()
    if (!existing && action === 'release') {
      // Nothing stored means nothing is held - releasing should not error.
      return NextResponse.json({ session: null, released: true })
    }
    if (!existing) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ phone: digits, step: '', data: { held: { at: now, notified: false } }, updated_at: now })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ session: data, created: true })
    }

    // The bot preserves other jsonb fields (paused, etc.) on its own saves,
    // so hand it back the row with only the "held" key changed.
    const current = (existing.data || {}) as Record<string, unknown>
    const nextData =
      action === 'hold'
        ? { ...current, held: { at: now, notified: false } }
        : { ...current, held: null }

    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ step: existing.step, data: nextData, updated_at: now })
      .eq('phone', existing.phone)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ session: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const { phone } = await request.json()
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 })

    const digits = phoneDigits(phone)
    if (!digits) return NextResponse.json({ error: 'phone is required' }, { status: 400 })
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('chat_sessions')
      .delete()
      .in('phone', phoneVariants(digits))
      .select('phone')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) {
      return NextResponse.json(
        { error: 'This chat has no live bot session to clear - its transcript is already kept.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

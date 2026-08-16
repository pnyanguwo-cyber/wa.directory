import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VALID_TYPES = new Set([
  'profile_view', 'click_whatsapp', 'click_call', 'click_website',
  'impression', 'qr_scan', 'bot_search', 'bot_chat_open',
  'share_bot', 'share_web',
])

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const events = body.events ? body.events : [{ ...body }]

    const rows: { business_id: string; type: string; category: string; city: string }[] = []
    for (const ev of events) {
      if (!ev.business_id || typeof ev.business_id !== 'string' || !VALID_TYPES.has(ev.type)) continue
      rows.push({
        business_id: ev.business_id,
        type: ev.type,
        category: typeof ev.category === 'string' ? ev.category : '',
        city: typeof ev.city === 'string' ? ev.city : '',
      })
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    await getSupabase().from('stats_events').insert(rows)

    return NextResponse.json({ success: true, count: rows.length })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
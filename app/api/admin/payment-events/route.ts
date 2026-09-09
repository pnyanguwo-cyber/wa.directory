import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/payment-events?outcome=rejected&event=webhook_rejected
// Serves the admin "Payment Events" audit tab. The payment_events table is
// RLS-locked with no anon policies, so this service-role read is the only way
// in — same pattern as the other admin endpoints.
export async function GET(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const outcome = searchParams.get('outcome') || ''
  const event = searchParams.get('event') || ''
  const limit = Math.min(Number(searchParams.get('limit')) || 100, 300)

  const supabase = getSupabase()

  let query = supabase
    .from('payment_events')
    .select('id, bid_id, business_id, event_type, outcome, detail, ip_hash, user_agent, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (outcome) query = query.eq('outcome', outcome)
  if (event) query = query.eq('event_type', event)

  const { data: events, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve business names for display.
  const bizIds = new Set<string>()
  for (const e of events || []) {
    if (e.business_id) bizIds.add(e.business_id)
  }
  const { data: businesses } = bizIds.size
    ? await supabase.from('businesses').select('id, name').in('id', [...bizIds])
    : { data: [] }
  const nameById = new Map((businesses || []).map(b => [b.id, b.name]))

  return NextResponse.json({
    events: (events || []).map(e => ({
      ...e,
      businessName: e.business_id ? nameById.get(e.business_id) || null : null,
    })),
  })
}

import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { adminGuard } from '@/lib/admin-auth'

export async function GET(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const businessId = searchParams.get('business_id')
  const orgId = searchParams.get('org_id')

  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('admin_get_ai_usage_summary', {
    p_from: from || null,
    p_to: to || null,
    p_business_id: businessId || null,
    p_org_id: orgId || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // An empty range comes back with NULL jsonb aggregates. Send empty objects
  // instead so the dashboard can render its zero state rather than crash.
  const row = (data?.[0] || {}) as Record<string, unknown>
  return NextResponse.json({
    total_requests: Number(row.total_requests || 0),
    total_input_tokens: Number(row.total_input_tokens || 0),
    total_output_tokens: Number(row.total_output_tokens || 0),
    total_tokens: Number(row.total_tokens || 0),
    total_estimated_cost_usd: Number(row.total_estimated_cost_usd || 0),
    avg_latency_ms: Number(row.avg_latency_ms || 0),
    error_rate: Number(row.error_rate || 0),
    by_feature: row.by_feature || {},
    by_model: row.by_model || {},
    by_business: row.by_business || [],
    by_day: row.by_day || {},
    by_channel: row.by_channel || {},
  })
}

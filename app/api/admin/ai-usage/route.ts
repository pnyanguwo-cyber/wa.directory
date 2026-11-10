import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { adminGuard } from '@/lib/admin-auth'

export async function GET(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const feature = searchParams.get('feature')
  const model = searchParams.get('model')
  const businessId = searchParams.get('business_id')
  const orgId = searchParams.get('org_id')
  const status = searchParams.get('status')
  const channel = searchParams.get('channel')
  const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000)
  const offset = parseInt(searchParams.get('offset') || '0')

  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('admin_get_ai_usage', {
    p_from: from || null,
    p_to: to || null,
    p_feature: feature || null,
    p_model: model || null,
    p_business_id: businessId || null,
    p_org_id: orgId || null,
    p_status: status || null,
    p_channel: channel || null,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}
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

  return NextResponse.json(data?.[0] || {})
}
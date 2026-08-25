import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// One authenticated endpoint for the admin Listings tab — replaces the three
// browser-side anon queries (businesses, categories, active subscriptions).
export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const [businessesRes, categoriesRes, subsRes] = await Promise.all([
    supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('categories').select('name, icon').eq('active', true),
    supabase.from('subscriptions').select('business_id').eq('status', 'active'),
  ])

  if (businessesRes.error) {
    return NextResponse.json({ error: businessesRes.error.message }, { status: 500 })
  }

  return NextResponse.json({
    businesses: businessesRes.data || [],
    categories: categoriesRes.data || [],
    premiumIds: (subsRes.data || []).map((s: { business_id: string }) => s.business_id),
  })
}

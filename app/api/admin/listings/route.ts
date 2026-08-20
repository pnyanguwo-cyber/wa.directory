import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const [businessesRes, categoriesRes] = await Promise.all([
    supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('categories')
      .select('name, icon')
      .eq('active', true),
  ])

  return NextResponse.json({
    businesses: businessesRes.data || [],
    categories: categoriesRes.data || [],
  })
}

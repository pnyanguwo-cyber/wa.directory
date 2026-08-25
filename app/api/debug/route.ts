import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: businesses, error, count } = await supabase
    .from('businesses')
    .select('*', { count: 'exact' })
    .eq('verified', true)
    .order('created_at', { ascending: false })
    .limit(12)

  return NextResponse.json({
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    totalVerified: count,
    returned: businesses?.length || 0,
    error: error?.message || null,
    businesses: (businesses || []).map(b => ({
      name: b.name,
      slug: b.slug,
      created_at: b.created_at,
    })),
  })
}

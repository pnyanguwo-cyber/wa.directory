import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BUSINESS_CARD_COLUMNS } from '@/lib/business-select'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 50

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit')) || 12, MAX_LIMIT)
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
  const sort = searchParams.get('sort') === 'newest' ? 'newest' : 'rating'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let query = supabase
    .from('businesses')
    .select(BUSINESS_CARD_COLUMNS)
    .eq('verified', true)

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('rating', { ascending: false })
  }

  const { data, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    businesses: data || [],
    hasMore: (data?.length || 0) === limit,
  })
}

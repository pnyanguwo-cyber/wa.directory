import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { matchCategory } from '@/data/categories'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  if (!q.trim()) {
    return NextResponse.json({ suggestions: [] })
  }

  const supabase = getSupabase()

  const conditions = [`name.ilike.%${q}%`]
  const matchedCat = matchCategory(q)
  if (matchedCat !== 'Other') conditions.push(`category.cs.{${matchedCat}}`)

  const { data } = await supabase
    .from('businesses')
    .select('name')
    .or(conditions.join(','))
    .eq('payment_status', 'active')
    .limit(5)

  return NextResponse.json({
    suggestions: data?.map(b => b.name) || [],
  })
}

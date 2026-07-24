import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { matchCategory } from '@/data/categories'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  if (!q.trim()) {
    return NextResponse.json({ suggestions: [] })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const conditions = [`name.ilike.%${q}%`]
  const matchedCat = matchCategory(q)
  if (matchedCat !== 'Other') {
    conditions.push(`category.cs.{${matchedCat}}`)
  }

  const { data } = await supabase
    .from('businesses')
    .select('name')
    .or(conditions.join(','))
    .limit(5)

  return NextResponse.json({
    suggestions: data?.map(b => b.name) || [],
  })
}

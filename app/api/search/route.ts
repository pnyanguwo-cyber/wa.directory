import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { matchCategory } from '@/data/categories'
import { expandSearchQuery } from '@/lib/gemini'

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
  if (matchedCat !== 'Other') conditions.push(`category.cs.{${matchedCat}}`)

  const related = await expandSearchQuery(q)
  const relatedCats = new Set<string>()
  for (const term of related) {
    const cat = matchCategory(term)
    if (cat !== 'Other') relatedCats.add(cat)
  }
  Array.from(relatedCats).forEach(cat => {
    conditions.push(`category.cs.{${cat}}`)
  })

  const { data } = await supabase
    .from('businesses')
    .select('name')
    .or(conditions.join(','))
    .limit(5)

  return NextResponse.json({
    suggestions: data?.map(b => b.name) || [],
  })
}

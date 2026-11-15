import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { matchCategory } from '@/data/categories'

export const dynamic = 'force-dynamic'

export interface SearchSuggestion {
  type: 'product' | 'business'
  label: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  if (!q.trim()) {
    return NextResponse.json({ suggestions: [] })
  }

  const supabase = getSupabase()
  const matchedCat = matchCategory(q)

  const businessConditions = [`name.ilike.%${q}%`]
  if (matchedCat !== 'Other') businessConditions.push(`category.cs.{${matchedCat}}`)

  // Same keyword surface as searchProducts: name, description, brand, plus a
  // category guess to widen recall for short queries.
  const itemConditions = [`name.ilike.%${q}%`, `description.ilike.%${q}%`, `brand.ilike.%${q}%`]
  if (matchedCat !== 'Other') itemConditions.push(`category.eq.${matchedCat}`)

  const [businessesRes, itemsRes] = await Promise.all([
    supabase
      .from('businesses')
      .select('name')
      .or(businessConditions.join(','))
      .eq('payment_status', 'active')
      .limit(3),
    supabase
      .from('business_items')
      .select('name, businesses!inner(payment_status)')
      .or(itemConditions.join(','))
      .eq('status', 'active')
      .eq('businesses.payment_status', 'active')
      .limit(3),
  ])

  if (businessesRes.error) console.error('[search] businesses failed:', businessesRes.error.message)
  if (itemsRes.error) console.error('[search] items failed:', itemsRes.error.message)

  const seen = new Set<string>()
  const suggestions: SearchSuggestion[] = []
  const push = (type: 'product' | 'business', label: unknown) => {
    const text = String(label || '').trim()
    if (!text) return
    const key = text.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    suggestions.push({ type, label: text })
  }

  for (const item of itemsRes.data || []) push('product', item.name)
  for (const business of businessesRes.data || []) push('business', business.name)

  return NextResponse.json({ suggestions: suggestions.slice(0, 5) })
}

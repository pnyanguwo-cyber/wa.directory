import { getSupabase } from '@/lib/supabase-server'
import { categories as staticCategories, matchCategory as staticMatch } from '@/data/categories'

export interface ApprovedCategory {
  name: string
  icon: string
  keywords: string[]
}

export interface ApprovedArea {
  city: string
  name: string
}

export async function getApprovedCategories(): Promise<ApprovedCategory[]> {
  try {
    const { data } = await getSupabase()
      .from('categories')
      .select('name, icon, keywords')
      .eq('active', true)
      .order('name', { ascending: true })
    if (data && data.length > 0) return data as ApprovedCategory[]
  } catch {}
  return staticCategories.map(c => ({ name: c.name, icon: c.icon, keywords: c.keywords }))
}


export async function getApprovedCategoryNames(): Promise<Set<string>> {
  const rows = await getApprovedCategories()
  return new Set(rows.map(r => r.name))
}

export async function getApprovedAreas(): Promise<ApprovedArea[]> {
  try {
    const { data } = await getSupabase()
      .from('areas')
      .select('city, name')
      .eq('active', true)
    return (data || []) as ApprovedArea[]
  } catch {
    return []
  }
}


export async function getApprovedAreaNames(city: string): Promise<Set<string>> {
  const rows = await getApprovedAreas()
  return new Set(rows.filter(r => r.city === city).map(r => r.name))
}

export function categoryIcon(
  name: string,
  approved: ApprovedCategory[]
): string {
  return approved.find(c => c.name === name)?.icon ||
    staticCategories.find(c => c.name === name)?.icon ||
    '📋'
}

export function matchCategoryAgainst(input: string, approved: ApprovedCategory[]): string {
  const lower = input.toLowerCase().trim()
  if (!lower) return 'Other'

  for (const c of approved) {
    if (c.name.toLowerCase() === lower) return c.name
  }
  for (const c of approved) {
    if (c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase())) return c.name
  }

  let bestMatch: string | null = null
  let bestScore = 0
  for (const c of approved) {
    for (const kw of c.keywords || []) {
      const kwLower = kw.toLowerCase()
      if (kwLower.includes(lower) || lower.includes(kwLower)) {
        const score = kwLower.includes(lower)
          ? kwLower.length / Math.max(lower.length, 1)
          : lower.length / Math.max(kwLower.length, 1)
        if (score > bestScore) {
          bestScore = score
          bestMatch = c.name
        }
      }
    }
  }
  if (bestMatch) return bestMatch

  const staticMatchResult = staticMatch(input)
  return staticMatchResult
}

import { unstable_cache } from 'next/cache'
import { getSupabase } from '@/lib/supabase-server'
import { categories as staticCategories, matchCategory as staticMatch } from '@/data/categories'
import { zimbabweCities } from '@/data/zimbabwe-locations'

export interface ApprovedCategory {
  name: string
  icon: string
  keywords: string[]
}

export interface ApprovedArea {
  city: string
  name: string
}

// Categories/areas/cities change rarely — cache the DB reads for 5 minutes so
// hot paths (webhook turns, listing/edit gates, directory pages) don't hit
// Supabase on every request. Falls back to the bundled static data below.
const fetchApprovedCategories = unstable_cache(async (): Promise<ApprovedCategory[]> => {
  try {
    const { data } = await getSupabase()
      .from('categories')
      .select('name, icon, keywords')
      .eq('active', true)
      .order('name', { ascending: true })
    if (data && data.length > 0) return data as ApprovedCategory[]
  } catch {}
  return staticCategories.map(c => ({ name: c.name, icon: c.icon, keywords: c.keywords }))
}, ['approved-categories'], { revalidate: 300 })

export async function getApprovedCategories(): Promise<ApprovedCategory[]> {
  return fetchApprovedCategories()
}


export async function getApprovedCategoryNames(): Promise<Set<string>> {
  const rows = await getApprovedCategories()
  return new Set(rows.map(r => r.name))
}

const fetchApprovedAreas = unstable_cache(async (): Promise<ApprovedArea[]> => {
  try {
    const { data } = await getSupabase()
      .from('areas')
      .select('city, name')
      .eq('active', true)
    return (data || []) as ApprovedArea[]
  } catch {
    return []
  }
}, ['approved-areas'], { revalidate: 300 })

export async function getApprovedAreas(): Promise<ApprovedArea[]> {
  return fetchApprovedAreas()
}


export async function getApprovedAreaNames(city: string): Promise<Set<string>> {
  const rows = await getApprovedAreas()
  return new Set(rows.filter(r => r.city === city).map(r => r.name))
}

export interface ApprovedCity {
  name: string
}

const fetchApprovedCities = unstable_cache(async (): Promise<ApprovedCity[]> => {
  const staticCityNames = new Set(zimbabweCities.map(c => c.name))
  try {
    const { data } = await getSupabase()
      .from('cities')
      .select('name')
      .eq('active', true)
      .order('name', { ascending: true })
    const dbCities = (data || []) as ApprovedCity[]
    const merged = new Map<string, ApprovedCity>()
    for (const c of dbCities) merged.set(c.name.toLowerCase(), c)
    for (const name of staticCityNames) {
      if (!merged.has(name.toLowerCase())) merged.set(name.toLowerCase(), { name })
    }
    return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return zimbabweCities.map(c => ({ name: c.name }))
  }
}, ['approved-cities'], { revalidate: 300 })

export async function getApprovedCities(): Promise<ApprovedCity[]> {
  return fetchApprovedCities()
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

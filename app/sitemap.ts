import type { MetadataRoute } from 'next'
import { getSupabase } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/site-url'
import { zimbabweCities } from '@/data/zimbabwe-locations'

// Rebuilt hourly so a business that goes live is discoverable the same day.
export const revalidate = 3600

// Mirrors the slug format the category route parses back into a name.
const slugKey = (value: string) => value.toLowerCase().trim().replace(/\s+/g, '-')

const CITY_KEYS = new Set(zimbabweCities.map(c => slugKey(c.name)))

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/categories`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/yellow-pages`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/list`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/map`, changeFrequency: 'monthly', priority: 0.5 },
  ]

  const { data } = await getSupabase()
    .from('businesses')
    .select('id, slug, category, city, created_at')
    .eq('verified', true)
    .eq('payment_status', 'active')
    .order('created_at', { ascending: false })

  const businesses = data || []

  const businessUrls: MetadataRoute.Sitemap = businesses.map(b => ({
    url: `${SITE_URL}/business/${b.slug || b.id}`,
    lastModified: b.created_at ? new Date(b.created_at) : undefined,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  // Only emit category pages a real listing supports. The route splits the
  // slug on "-" and matches the city suffix, so both halves must round-trip.
  const seen = new Set<string>()
  const categoryUrls: MetadataRoute.Sitemap = []
  for (const b of businesses) {
    const cityKey = b.city ? slugKey(b.city) : ''
    if (!cityKey || !CITY_KEYS.has(cityKey)) continue
    for (const cat of b.category || []) {
      const catKey = slugKey(cat)
      if (!/^[a-z0-9&-]+$/.test(catKey)) continue
      const slug = `${catKey}-${cityKey}`
      // "&" is legal in a path but must be percent-encoded inside XML.
      const url = `${SITE_URL}/category/${encodeURIComponent(slug)}`
      if (seen.has(url)) continue
      seen.add(url)
      categoryUrls.push({ url, changeFrequency: 'weekly', priority: 0.6 })
    }
  }

  return [...staticUrls, ...categoryUrls, ...businessUrls]
}

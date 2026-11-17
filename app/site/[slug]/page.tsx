import { getSupabase } from '@/lib/supabase-server'
import { parseSiteContent } from '@/lib/site-content'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Business, BusinessItem } from '@/types'
import { resolveTheme } from '@/registry/websites'
import { buildSiteView, type ThemeProps } from '@/lib/site-view'
import type { ComponentType } from 'react'

import ClassicSiteView from '@/components/site/classic-site'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const { data } = await getSupabase()
    .from('businesses')
    .select('slug, id')
  return (data || []).map((b) => ({ slug: b.slug || b.id }))
}

const SITE_SELECT =
  'id, name, slug, bio, category, phone, phone_type, voice_phone, whatsapp_link, logo_url, city, area, areas, payment_status, generate_site, site_hero, site_services, site_contact_email, site_theme, site_socials, site_content, site_cover_luminance, created_at, rating, review_count, website, address, lat, lng, show_location, business_id'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data } = (await getSupabase()
    .from('businesses')
    .select('name, bio, city, site_content')
    .eq('slug', params.slug)
    .single()) as { data: { name: string; bio: string; city: string; site_content: unknown } | null }
  if (!data) return {}
  const tagline = parseSiteContent(data.site_content).tagline
  const description = (tagline || data.bio)?.slice(0, 160) || `Contact ${data.name} on WhatsApp in ${data.city || 'Zimbabwe'}.`
  return {
    title: `${data.name}${tagline ? ` — ${tagline}` : ''} | WA Directory`,
    description,
    alternates: { canonical: `/site/${params.slug}` },
  }
}

export default async function BusinessSitePage({ params }: { params: { slug: string } }) {
  let { data: business } = (await getSupabase()
    .from('businesses')
    .select(SITE_SELECT)
    .eq('slug', params.slug)
    .single()) as { data: Business | null }

  if (!business) {
    const { data: fallback } = (await getSupabase()
      .from('businesses')
      .select(SITE_SELECT)
      .eq('id', params.slug)
      .single()) as { data: Business | null }
    business = fallback
  }

  if (!business || !business.generate_site || business.payment_status !== 'active') notFound()

  const [itemsRes, ratingsRes] = await Promise.all([
    getSupabase()
      .from('business_items')
      .select('id, business_id, name, slug, price, image_url, image_luminance, is_active, created_at, updated_at')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    getSupabase()
      .from('ratings')
      .select('rating, comment, name, created_at')
      .eq('business_id', business.id)
      .in('rating', [4, 5])
      .not('comment', 'eq', '')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const itemList = (itemsRes.data as BusinessItem[]) || []
  const testimonials = (
    (ratingsRes.data as { rating: number; comment: string; name: string; created_at: string }[]) || []
  )
    .filter((r) => r.comment.trim())
    .slice(0, 6)

  const site = await buildSiteView(business, itemList, testimonials)

  const themeEntry = await resolveTheme(site.theme.design)
  if (themeEntry) {
    let Theme: ComponentType<ThemeProps> | null = null
    try {
      Theme = (await themeEntry.load()).default
    } catch {
      Theme = null
    }
    if (Theme) {
      return (
        <Theme
          site={site}
          orientation={site.theme.orientation || themeEntry.meta.defaultOrientation}
          mode="live"
        />
      )
    }
  }

  return (
    <ClassicSiteView
      business={business}
      itemList={itemList}
      testimonials={testimonials}
    />
  )
}

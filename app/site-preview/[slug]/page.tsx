import { getSupabase } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { ComponentType } from 'react'
import type { Business, BusinessItem } from '@/types'
import { digitsOnly } from '@/lib/phone'
import { isAdmin } from '@/lib/admin-auth'
import { getActingPortalBusiness } from '@/lib/portal'
import { resolveTheme, type WebsiteThemeEntry } from '@/registry/websites'
import { ORIENTATIONS, buildSiteView, type ThemeProps } from '@/lib/site-view'
import { CartProvider } from '@/components/order/cart'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Theme preview',
  robots: { index: false, follow: false },
}

type PreviewQuery = { [key: string]: string | string[] | undefined }

async function fetchBusinessForAdmin(slug: string): Promise<Business | null> {
  const { data } = (await getSupabase()
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()) as { data: Business | null }
  if (data) return data
  const { data: fallback } = (await getSupabase()
    .from('businesses')
    .select('*')
    .eq('id', slug)
    .maybeSingle()) as { data: Business | null }
  return fallback
}

export default async function SitePreviewPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: PreviewQuery
}) {
  let business: Business | null = null

  if (isAdmin()) {
    business = await fetchBusinessForAdmin(params.slug)
  } else {
    const branch = typeof searchParams.branch === 'string' ? searchParams.branch : undefined
    const acting = await getActingPortalBusiness(branch)
    if (acting) business = acting.business
  }

  if (!business) notFound()
  if (business.slug && business.slug !== params.slug && business.id !== params.slug) notFound()

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

  const requestedTheme = typeof searchParams.theme === 'string' ? searchParams.theme.trim() : ''
  const entry: WebsiteThemeEntry | null = requestedTheme ? await resolveTheme(requestedTheme) : null
  if (!entry) notFound()

  const requestedOrientation =
    typeof searchParams.orientation === 'string' ? searchParams.orientation.trim() : ''
  const orientation = (ORIENTATIONS as readonly string[]).includes(requestedOrientation)
    ? requestedOrientation
    : site.theme.orientation || entry.meta.defaultOrientation

  let Theme: ComponentType<ThemeProps> | null = null
  try {
    Theme = (await entry.load()).default
  } catch {
    Theme = null
  }
  if (!Theme) notFound()

  const phoneClean = digitsOnly(business.phone || '')
  const waLinkDigits = /wa\.me\/(\d+)/.exec(business.whatsapp_link || '')?.[1] || null
  const orderDigits = business.phone_type !== 'voice' && phoneClean ? phoneClean : waLinkDigits || ''

  return (
    <CartProvider
      business={{
        slug: business.slug || business.id,
        name: business.name,
        city: business.city,
        whatsappDigits: orderDigits,
      }}
    >
      <Theme site={site} orientation={orientation} mode="preview" />
    </CartProvider>
  )
}

import Link from 'next/link'
import type { Metadata } from 'next'
import { getSupabase } from '@/lib/supabase-server'
import { BUSINESS_CARD_COLUMNS } from '@/lib/business-select'
import { categories as staticCategories } from '@/data/categories'
import YellowPagesGrid from '@/components/yellow-pages-grid'

export const revalidate = 300

const SITE_URL = process.env.SITE_URL || 'https://wadirectory.co.zw'

const YELLOW_PAGES = staticCategories.filter(c => c.special)
const YELLOW_PAGES_NAMES = YELLOW_PAGES.map(c => c.name)

export const metadata: Metadata = {
  title: 'Yellow Pages: Emergency & Government Services | WA Directory',
  description:
    'Verified emergency, public and government service providers in Zimbabwe: police, fire brigade, ambulance, councils and more. Chat instantly on WhatsApp.',
  alternates: { canonical: '/yellow-pages' },
  openGraph: {
    title: 'Yellow Pages: Emergency & Government Services | WA Directory',
    description:
      'Verified emergency and government service providers across Zimbabwe. Tap to chat on WhatsApp.',
    siteName: 'WA Directory',
    locale: 'en_ZW',
    type: 'website',
  },
}

export default async function YellowPagesPage() {
  const { data } = await getSupabase()
    .from('businesses')
    .select(BUSINESS_CARD_COLUMNS)
    .overlaps('category', YELLOW_PAGES_NAMES)
    .order('rating', { ascending: false })
    .limit(300)

  const businesses = (data || []) as any[]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Yellow Pages: Emergency & Government Services',
    url: `${SITE_URL}/yellow-pages`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElements: businesses
        .filter(b => b.verified)
        .slice(0, 50)
        .map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/business/${b.slug || b.id}`,
          name: b.name,
        })),
    },
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-200/60 dark:border-amber-800/40 shadow-soft-lift bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 dark:from-amber-950/30 dark:via-gray-900 dark:to-amber-950/20 p-6 sm:p-8 mb-6 sm:mb-8">
        <span className="badge-yellow-pages">★ Yellow Pages</span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight mt-3">
          Emergency &amp; Government Services
        </h1>
        <p className="text-text-secondary text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          Zimbabwe&apos;s Yellow Pages: verified public-service providers including police, fire brigade,
          ambulance services, councils, registries and more. Select a category below to browse listings.
        </p>
        <p className="text-[11px] text-text-secondary/80 mt-3">
          In a life-threatening emergency, always call your national emergency number first. These are verified directory listings, not official hotlines.
        </p>
      </section>

      {businesses.length === 0 ? (
        <section className="neo-card p-8 text-center">
          <p className="text-3xl mb-3" aria-hidden="true">🚨</p>
          <h2 className="text-lg font-bold text-text-primary">No Yellow Pages listings yet</h2>
          <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
            Emergency and government service listings will appear here as they are added and verified.
            Know a service that should be listed?
          </p>
          <Link href="/list" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold mt-4">
            List a Service Free
          </Link>
        </section>
      ) : (
        <YellowPagesGrid businesses={businesses} />
      )}
    </div>
  )
}

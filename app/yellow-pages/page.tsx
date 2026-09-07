import Link from 'next/link'
import type { Metadata } from 'next'
import { getSupabase } from '@/lib/supabase-server'
import { BUSINESS_CARD_COLUMNS } from '@/lib/business-select'
import { categories as staticCategories } from '@/data/categories'
import type { Business } from '@/types'
import BusinessCard from '@/components/business-card'
import CategoryDoodle from '@/components/category-doodle'

export const revalidate = 300

const SITE_URL = process.env.SITE_URL || 'https://wadirectory.co.zw'

// The Yellow Pages taxonomy is the static special-category list — the same
// source the public styling keys off. Admins manage which businesses carry
// these categories (and verification) from /admin.
const YELLOW_PAGES = staticCategories.filter(c => c.special)
const YELLOW_PAGES_NAMES = YELLOW_PAGES.map(c => c.name)

export const metadata: Metadata = {
  title: 'Yellow Pages — Emergency & Government Services | WA Directory',
  description:
    'Verified emergency, public and government service providers in Zimbabwe — police, fire brigade, ambulance, councils and more. Chat instantly on WhatsApp.',
  alternates: { canonical: '/yellow-pages' },
  openGraph: {
    title: 'Yellow Pages — Emergency & Government Services | WA Directory',
    description:
      'Verified emergency and government service providers across Zimbabwe. Tap to chat on WhatsApp.',
    siteName: 'WA Directory',
    locale: 'en_ZW',
    type: 'website',
  },
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default async function YellowPagesPage() {
  const { data } = await getSupabase()
    .from('businesses')
    .select(BUSINESS_CARD_COLUMNS)
    // Yellow Pages deliberately includes UNVERIFIED listings (badge-marked):
    // councils and public offices often can't complete verification quickly,
    // but citizens still need to find them. The home-page emergency strip
    // stays verified-only.
    .overlaps('category', YELLOW_PAGES_NAMES)
    .order('rating', { ascending: false })
    .limit(300)

  const businesses = (data || []) as Business[]
  const verifiedCount = businesses.filter(b => b.verified).length

  // Group: category (static order) → city → businesses. Verified listings
  // float to the top of each city group; pending ones follow (stable sort
  // preserves the rating order within each tier).
  const byCategory = YELLOW_PAGES.map(cat => {
    const inCategory = businesses
      .filter(b => (b.category || []).includes(cat.name))
      .sort((a, b) => Number(b.verified || false) - Number(a.verified || false))
    const cityMap = new Map<string, Business[]>()
    for (const b of inCategory) {
      const city = b.city || 'Nationwide'
      if (!cityMap.has(city)) cityMap.set(city, [])
      cityMap.get(city)!.push(b)
    }
    const cities = Array.from(cityMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    return { cat, total: inCategory.length, cities }
  })

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Yellow Pages — Emergency & Government Services',
    url: `${SITE_URL}/yellow-pages`,
    mainEntity: {
      '@type': 'ItemList',
      // Only verified listings go into structured data — pending ones stay
      // out of search engines until an admin verifies them.
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
      <section className="relative overflow-hidden rounded-3xl border border-amber-300/60 dark:border-amber-800/50 shadow-soft-lift bg-gradient-to-br from-amber-50/95 via-amber-50/80 to-yellow-100/40 dark:from-amber-950/40 dark:via-gray-900/90 dark:to-yellow-950/20 backdrop-blur-xl p-6 sm:p-8 mb-6 sm:mb-8">
        <CategoryDoodle
          categories={['Emergency Services']}
          strokeWidth={0.9}
          className="absolute -right-4 -bottom-6 w-40 h-40 sm:w-56 sm:h-56 text-amber-600/25 dark:text-amber-400/20"
        />
        <span className="badge-yellow-pages">★ Yellow Pages</span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight mt-3">
          Emergency &amp; Government Services
        </h1>
        <p className="text-text-secondary text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          Zimbabwe&apos;s Yellow Pages: verified public-service providers — police, fire brigade,
          ambulance services, councils, registries and more. Tap any listing to chat instantly on
          WhatsApp, or scan their profile for details.
        </p>
        <p className="text-[11px] text-text-secondary/80 mt-3">
          In a life-threatening emergency, always call your national emergency number first — these are verified directory listings, not official hotlines.
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
        <>
          {/* Jump navigation: one chip per category that has listings */}
          <nav aria-label="Jump to category" className="flex flex-wrap gap-2 mb-8">
            {byCategory
              .filter(g => g.total > 0)
              .map(({ cat, total }) => (
                <a
                  key={cat.name}
                  href={`#${slugify(cat.name)}`}
                  className="chip text-xs sm:text-sm chip-yellow-pages bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50"
                >
                  <span aria-hidden="true">{cat.icon}</span>
                  {cat.name}
                  <span className="font-bold">({total})</span>
                </a>
              ))}                  </nav>

          <p className="text-[11px] text-text-secondary mb-6 flex items-center gap-1.5">
            <span className="badge-pending">Pending</span>
            <span>= awaiting admin verification — details may still change. Verified listings appear first in each location.</span>
          </p>

          {/* One section per Yellow Pages category */}
          <div className="space-y-10">
            {byCategory
              .filter(g => g.total > 0)
              .map(({ cat, cities, total }) => (
                <section key={cat.name} id={slugify(cat.name)} className="scroll-mt-20" aria-labelledby={`yp-${slugify(cat.name)}`}>
                  <div className="flex items-end justify-between gap-3 mb-4">
                    <div>
                      <h2 id={`yp-${slugify(cat.name)}`} className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
                        <span aria-hidden="true">{cat.icon}</span>
                        {cat.name}
                        <span className="badge-yellow-pages">★ Yellow Pages</span>
                      </h2>
                      <p className="text-text-secondary text-xs sm:text-sm mt-1">
                        {total} listing{total !== 1 ? 's' : ''} across {cities.length} location{cities.length !== 1 ? 's' : ''}
                        {(() => {
                          const pending = cities.reduce((n, [, list]) => n + list.filter(b => !b.verified).length, 0)
                          return pending > 0 ? ` · ${pending} pending verification` : ''
                        })()}
                      </p>
                    </div>
                    <Link
                      href={`/search?q=${encodeURIComponent(cat.name)}`}
                      className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0"
                    >
                      Search
                    </Link>
                  </div>

                  {/* City groups within the category */}
                  <div className="space-y-6">
                    {cities.map(([city, list]) => (
                      <div key={city}>
                        <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                          </svg>
                          {city === 'Nationwide' ? (
                            <span>
                              Nationwide <span className="font-normal text-text-secondary text-xs">— serves the whole country</span>
                            </span>
                          ) : (
                            <span>
                              {city} <span className="font-normal text-text-secondary text-xs">({list.length})</span>
                            </span>
                          )}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {list.map(b => (
                            <BusinessCard key={b.id} business={b} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
          </div>
        </>
      )}
    </div>
  )
}

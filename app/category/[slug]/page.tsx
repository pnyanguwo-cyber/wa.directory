import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-server'
import { BUSINESS_CARD_COLUMNS } from '@/lib/business-select'
import BusinessCard from '@/components/business-card'
import SkeletonCard from '@/components/skeleton-card'
import ImpressionPing from '@/components/impression-ping'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import { generateSEOBlurb } from '@/lib/gemini'
import { getApprovedCategories, matchCategoryAgainst } from '@/lib/approved-data'
import { orderSearchResults } from '@/lib/ranking'

export const revalidate = 3600
export const dynamicParams = true

const POPULAR_CATEGORIES = [
  'Plumber',
  'Electrician',
  'Food & Restaurant',
  'Hair & Beauty',
  'Automotive',
  'Health & Medical',
]

export async function generateStaticParams() {
  const params: { slug: string }[] = []
  for (const cat of POPULAR_CATEGORIES) {
    const catKey = cat.toLowerCase().replace(/\s+/g, '-')
    for (const city of zimbabweCities) {
      const cityKey = city.name.toLowerCase().replace(/\s+/g, '-')
      params.push({ slug: `${catKey}-${cityKey}` })
    }
  }
  return params
}

function parseSlug(slug: string): { category: string; location: string } | null {
  const parts = slug.split('-')
  if (parts.length < 2) return null

  const normalizedCities = zimbabweCities.map(c => ({
    name: c.name,
    key: c.name.toLowerCase().replace(/\s+/g, '-'),
  }))

  for (let i = parts.length - 1; i >= 0; i--) {
    const candidate = parts.slice(i).join('-')
    const match = normalizedCities.find(c => c.key === candidate)
    if (match) {
      const categoryRaw = parts.slice(0, i).join(' ')
      return { category: categoryRaw, location: match.name }
    }
  }

  return null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const parsed = parseSlug(params.slug)
  if (!parsed) return { title: 'Category | WA Directory' }

  const approved = await getApprovedCategories()
  const matched = matchCategoryAgainst(parsed.category, approved)

  return {
    title: `Best ${matched} in ${parsed.location} | WA Directory`,
    description: `Find the best ${matched} businesses in ${parsed.location}, Zimbabwe. Browse verified services and start a WhatsApp conversation instantly.`,
  }
}

function CategorySkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-72 rounded mb-2" />
      <div className="skeleton h-20 w-full rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

async function CategoryResults({ category, location }: { category: string; location: string }) {
  const approved = await getApprovedCategories()
  const matchedCategory = matchCategoryAgainst(category, approved)

  const query = getSupabase()
    .from('businesses')
    .select(BUSINESS_CARD_COLUMNS)
    .contains('category', [matchedCategory])

  const filtered = query.or(
    `city.ilike.%${location}%,location.ilike.%${location}%`
  )

  const { data: rawBusinesses } = await filtered
    .order('rating', { ascending: false })
    .limit(100)

  const businesses = await orderSearchResults(rawBusinesses || [], matchedCategory, location, `${matchedCategory}-${location}`)
  const count = businesses.length
  const seoText = await generateSEOBlurb(matchedCategory, location)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Best ${matchedCategory} in ${location}`,
    description: `Find the best ${matchedCategory} services in ${location}, Zimbabwe.`,
    about: {
      '@type': 'Thing',
      name: `${matchedCategory} in ${location}`,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: businesses.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'LocalBusiness',
          name: b.name,
          url: `https://wadirectory.vercel.app/business/${b.slug || b.id}`,
        },
      })),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
          Best {matchedCategory} in {location}
        </h1>
        <p className="text-text-secondary text-sm leading-relaxed">
          {seoText}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-text-secondary font-medium">
          {count} business{count !== 1 ? 'es' : ''} found
        </span>
      </div>

      {count === 0 ? (
        <div className="text-center py-16">
          <div className="bg-surface w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">No businesses listed yet</h2>
          <p className="text-text-secondary text-sm">
            Be the first to list a {matchedCategory.toLowerCase()} business in {location}
          </p>
        </div>
      ) : (
        <>
          <ImpressionPing businesses={businesses} category={matchedCategory} city={location} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businesses.map(b => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const parsed = parseSlug(params.slug)
  if (!parsed) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-6 sm:p-8">
        <Suspense fallback={<CategorySkeleton />}>
          <CategoryResults category={parsed.category} location={parsed.location} />
        </Suspense>
      </div>
    </div>
  )
}

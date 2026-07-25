import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getSupabase } from '@/lib/supabase-server'
import BusinessCard from '@/components/business-card'
import FilterBar from '@/components/filter-bar'
import SkeletonCard from '@/components/skeleton-card'
import { matchCategory } from '@/data/categories'
import { expandSearchQuery } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ searchParams }: { searchParams: { q?: string } }): Promise<Metadata> {
  const q = searchParams.q || ''
  return {
    title: q ? `Search: ${q} in Zimbabwe | WA Directory` : 'Browse Businesses | WA Directory',
    description: q ? `Find ${q} services on WhatsApp in Zimbabwe.` : 'Browse all businesses listed on WA Directory.',
  }
}

async function SearchResults({ q, verified, sort }: { q: string; verified: boolean; sort: string }) {
  let query = getSupabase()
    .from('businesses')
    .select('*')

  if (verified) {
    query = query.eq('verified', true)
  }

  if (q) {
    const conditions = [`name.ilike.%${q}%`, `bio.ilike.%${q}%`]
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

    query = query.or(conditions.join(','))
  }

  if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('rating', { ascending: false })
  }

  const { data: businesses } = await query
  const count = businesses?.length || 0

  return (
    <>
      <FilterBar total={count} query={q} />
      {count === 0 ? (
        <div className="text-center py-16">
          <div className="bg-surface w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">No results found</h2>
          <p className="text-text-secondary text-sm">
            Try &ldquo;hardware near me&rdquo; or check your spelling
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businesses!.map(b => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      )}
    </>
  )
}

function SearchSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-5 w-48 rounded" />
        <div className="flex gap-2">
          <div className="skeleton h-8 w-20 rounded-full" />
          <div className="skeleton h-8 w-20 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; verified?: string; sort?: string }
}) {
  const q = searchParams.q || ''
  const verified = searchParams.verified === 'true'
  const sort = searchParams.sort || 'rating'

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-6 sm:p-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-whatsapp-700 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Home
        </Link>
        <Suspense fallback={<SearchSkeleton />}>
          <SearchResults q={q} verified={verified} sort={sort} />
        </Suspense>
      </div>
    </div>
  )
}

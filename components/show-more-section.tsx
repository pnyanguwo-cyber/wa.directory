'use client'

import { useState } from 'react'
import type { Business } from '@/types'
import BusinessCard from './business-card'

const PER_PAGE = 6

export default function ShowMoreSection({ businesses }: { businesses: Business[] }) {
  const [items, setItems] = useState<Business[]>(businesses)
  const [visibleCount, setVisibleCount] = useState(PER_PAGE)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const visible = items.slice(0, visibleCount)
  const allShown = visibleCount >= items.length && !hasMore

  async function loadMore() {
    if (loading) return
    setLoading(true)
    try {
      if (visibleCount + PER_PAGE > items.length && hasMore) {
        const res = await fetch(`/api/businesses?limit=${PER_PAGE}&offset=${items.length}&sort=rating`)
        const data = await res.json()
        const next = data.businesses || []
        setItems(prev => [...prev, ...next])
        setHasMore(!!data.hasMore)
      }
      setVisibleCount(c => c + PER_PAGE)
    } catch {
      setHasMore(false)
      setVisibleCount(c => c + PER_PAGE)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) return null

  return (
    <section className="pt-5 border-t border-gray-200/60" aria-labelledby="show-more-heading">
      <h2 id="show-more-heading" className="text-xl font-bold text-text-primary tracking-tight mb-4">
        All Businesses
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map(b => (
          <BusinessCard key={b.id} business={b} />
        ))}
      </div>
      <div className="flex justify-center mt-6">
        {allShown ? (
          <button
            onClick={() => setVisibleCount(PER_PAGE)}
            className="btn-secondary px-6 py-2.5 text-sm font-semibold flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            Show Less
          </button>
        ) : (
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn-secondary px-6 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Load More'}
            {!loading && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </button>
        )}
      </div>
    </section>
  )
}

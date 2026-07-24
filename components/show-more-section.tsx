'use client'

import { useState } from 'react'
import type { Business } from '@/types'
import BusinessCard from './business-card'

const PER_PAGE = 6

export default function ShowMoreSection({ businesses }: { businesses: Business[] }) {
  const [count, setCount] = useState(PER_PAGE)
  const expanded = count >= businesses.length

  if (businesses.length === 0) return null

  const visible = businesses.slice(0, count)

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
        {expanded ? (
          <button
            onClick={() => setCount(PER_PAGE)}
            className="btn-secondary px-6 py-2.5 text-sm font-semibold flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            Show Less
          </button>
        ) : (
          <button
            onClick={() => setCount(prev => Math.min(prev + PER_PAGE, businesses.length))}
            className="btn-secondary px-6 py-2.5 text-sm font-semibold flex items-center gap-2"
          >
            Load More
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        )}
      </div>
    </section>
  )
}

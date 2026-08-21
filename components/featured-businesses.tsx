import type { Business } from '@/types'
import BusinessCard from './business-card'

export default function FeaturedBusinesses({ businesses }: { businesses: Business[] }) {
  if (businesses.length === 0) {
    return (
      <section className="mt-6 pt-5 border-t border-gray-200/60" aria-labelledby="featured-businesses-heading">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="featured-businesses-heading" className="text-xl font-bold text-text-primary tracking-tight">
              Featured Verified Businesses
            </h2>
            <p className="text-text-secondary text-xs sm:text-sm mt-0.5">Discover top-rated sellers and services on WhatsApp</p>
          </div>
        </div>
        <div className="p-6 text-center bg-surface/60 rounded-2xl border border-dashed border-gray-300">
          <p className="text-text-secondary text-sm font-medium">No featured businesses listed yet. Be the first to verify and feature your business!</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-6 pt-5 border-t border-gray-200/60" aria-labelledby="featured-businesses-heading">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 gap-1">
<div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-whatsapp-50 text-whatsapp-700 text-[11px] font-semibold mb-1">
              Top Rated
            </div>
            <h2 id="featured-businesses-heading" className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
              Featured Verified Businesses
            </h2>
            <p className="text-text-secondary text-sm sm:text-base mt-0.5">Hand-picked verified shops and services ready to chat</p>
          </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businesses.map(b => (
          <BusinessCard key={b.id} business={b} />
        ))}
      </div>
    </section>
  )
}

import type { Business } from '@/types'
import BusinessCard from './business-card'

export default function FeaturedBusinesses({ businesses }: { businesses: Business[] }) {
  if (businesses.length === 0) {
    return (
      <section className="mt-14 pt-8 border-t border-gray-100" aria-labelledby="featured-businesses-heading">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 id="featured-businesses-heading" className="text-2xl font-bold text-text-primary tracking-tight">
              Featured Verified Businesses
            </h2>
            <p className="text-text-secondary text-sm mt-1">Discover top-rated sellers and services on WhatsApp</p>
          </div>
        </div>
        <div className="p-8 text-center bg-surface/60 rounded-2xl border border-dashed border-gray-300">
          <p className="text-text-secondary text-sm font-medium">No featured businesses listed yet. Be the first to verify and feature your business!</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-14 pt-8 border-t border-gray-100" aria-labelledby="featured-businesses-heading">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-whatsapp-50 text-whatsapp-700 text-xs font-semibold mb-2">
            Top Rated
          </div>
          <h2 id="featured-businesses-heading" className="text-2xl font-bold text-text-primary tracking-tight">
            Featured Verified Businesses
          </h2>
          <p className="text-text-secondary text-sm mt-1">Hand-picked verified shops and services ready to chat</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {businesses.map(b => (
          <BusinessCard key={b.id} business={b} />
        ))}
      </div>
    </section>
  )
}

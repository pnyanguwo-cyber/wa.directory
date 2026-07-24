import type { Business } from '@/types'
import BusinessCard from './business-card'

export default function FeaturedBusinesses({ businesses }: { businesses: Business[] }) {
  if (businesses.length === 0) {
    return (
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Featured Verified Businesses</h2>
        <p className="text-gray-500">No featured businesses yet. Be the first to list yours!</p>
      </section>
    )
  }

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold mb-6">Featured Verified Businesses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businesses.map(b => (
          <BusinessCard key={b.id} business={b} />
        ))}
      </div>
    </section>
  )
}

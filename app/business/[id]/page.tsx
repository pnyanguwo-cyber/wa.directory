import { getSupabase } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import WhatsAppButton from '@/components/whatsapp-button'
import type { Business } from '@/types'

export const dynamic = 'force-dynamic'

export default async function BusinessProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const { data: business } = await getSupabase()
    .from('businesses')
    .select('*')
    .eq('id', params.id)
    .single() as { data: Business | null }

  if (!business) {
    notFound()
  }

  const stars = Math.round(business.rating)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="h-32 sm:h-40 bg-gradient-to-r from-whatsapp-100 to-whatsapp-200" />

        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold">{business.name}</h1>
            {business.verified && (
              <span className="bg-whatsapp-100 text-whatsapp-700 text-sm px-2 py-0.5 rounded-full">
                ✓ Verified
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mb-4">
            <span className="text-yellow-500 text-lg">
              {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
            </span>
            <span className="text-gray-500 text-sm">
              ({business.review_count} review{business.review_count !== 1 ? 's' : ''})
            </span>
          </div>

          {business.bio && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">About</h2>
              <p className="text-gray-700 leading-relaxed">{business.bio}</p>
            </div>
          )}

          {business.category.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Categories</h2>
              <div className="flex flex-wrap gap-2">
                {business.category.map((cat, i) => (
                  <span
                    key={i}
                    className="bg-whatsapp-50 text-whatsapp-700 text-sm px-3 py-1 rounded-full"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {business.location && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Location</h2>
              <p className="text-gray-700">{business.location}</p>
            </div>
          )}

          {business.catalog_link && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Catalog</h2>
              <a
                href={business.catalog_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-whatsapp-600 hover:underline"
              >
                View Catalog
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          <WhatsAppButton phone={business.phone} />
        </div>
      </div>
    </div>
  )
}

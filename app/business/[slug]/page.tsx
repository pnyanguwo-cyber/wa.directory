import { getSupabase } from '@/lib/supabase-server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import WhatsAppButton from '@/components/whatsapp-button'
import ShareButton from '@/components/share-button'
import { Suspense } from 'react'
import { SkeletonProfile } from '@/components/skeleton-card'
import type { Business } from '@/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data } = await getSupabase()
    .from('businesses')
    .select('name, bio, city')
    .eq('slug', params.slug)
    .single() as { data: { name: string; bio: string; city: string } | null }

  if (!data) return {}

  return {
    title: `${data.name} | WA Directory`,
    description: data.bio?.slice(0, 160) || `Contact ${data.name} on WhatsApp in ${data.city || 'Zimbabwe'}.`,
    openGraph: {
      title: `${data.name} | WA Directory`,
      description: data.bio?.slice(0, 160) || `Contact ${data.name} on WhatsApp.`,
      siteName: 'WA Directory',
      locale: 'en_ZW',
      type: 'profile',
    },
  }
}

function Stars({ rating }: { rating: number }) {
  const stars = Math.round(rating)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          className={`w-5 h-5 ${i <= stars ? 'text-yellow-500' : 'text-gray-300'}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function LogoDisplay({ name, url }: { name: string; url?: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-20 h-20 rounded-full object-cover border-4 border-white -mt-10 relative z-10"
        loading="lazy"
      />
    )
  }

  return (
    <div className="w-20 h-20 rounded-full bg-whatsapp-100 border-4 border-white -mt-10 relative z-10 flex items-center justify-center">
      <span className="text-whatsapp-700 font-bold text-xl">{initials}</span>
    </div>
  )
}

function CatalogItems({ catalogLink }: { catalogLink: string }) {
  return (
    <div className="space-y-3">
      <a
        href={catalogLink}
        target="_blank"
        rel="noopener noreferrer"
        className="card p-4 flex items-center justify-between hover:scale-[1.01] transition-all duration-150"
      >
        <div>
          <p className="font-medium text-text-primary">View Full Catalog</p>
          <p className="text-sm text-text-secondary">Browse all products and services</p>
        </div>
        <svg className="w-5 h-5 text-text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )
}

async function BusinessContent({ slug }: { slug: string }) {
  let { data: business } = await getSupabase()
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single() as { data: Business | null }

  if (!business) {
    const { data: fallback } = await getSupabase()
      .from('businesses')
      .select('*')
      .eq('id', slug)
      .single() as { data: Business | null }
    business = fallback
  }

  if (!business) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    telephone: business.phone ? `+${business.phone.replace(/[^0-9]/g, '')}` : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: business.city || 'Zimbabwe',
    },
    description: business.bio,
    ...(business.rating > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: business.rating,
        reviewCount: business.review_count,
      },
    } : {}),
  }

  const shareSlug = business.slug || business.id

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <ShareButton businessSlug={shareSlug} businessName={business.name} />
        </div>

        <div className="card overflow-hidden">
          <div className="h-32 sm:h-40 bg-gradient-to-r from-whatsapp-100 to-whatsapp-200 relative" />

          <div className="px-4 sm:px-6">
            <LogoDisplay name={business.name} url={business.logo_url} />
          </div>

          <div className="p-4 sm:p-6 pt-3 pb-24 sm:pb-6">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{business.name}</h1>
              {business.verified && (
                <span className="badge-verified text-sm px-2.5 py-0.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Stars rating={business.rating} />
              <span className="text-text-secondary text-sm">
                ({business.review_count} review{business.review_count !== 1 ? 's' : ''})
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {(business.city || business.area || business.location) && (
                <p className="text-text-secondary text-sm flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {[business.area, business.city, 'Zimbabwe'].filter(Boolean).join(', ') || business.location}
                </p>
              )}
              {business.price_range && (
                <span className="bg-surface text-text-secondary text-sm px-2.5 py-0.5 rounded flex items-center gap-1">
                  <span>??</span>
                  {business.price_range}
                </span>
              )}
              {business.phone && (
                <a
                  href={`tel:${business.phone.replace(/[^0-9+]/g, '')}`}
                  className="text-whatsapp-600 text-sm flex items-center gap-1 hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {business.phone}
                </a>
              )}
            </div>

            {business.bio && (
              <div className="mb-6">
                <h2 className="text-[16px] font-semibold text-text-primary mb-2">About</h2>
                <p className="text-text-secondary leading-relaxed">{business.bio}</p>
              </div>
            )}

            {business.category.length > 0 && (
              <div className="mb-6">
                <h2 className="text-[16px] font-semibold text-text-primary mb-2">Categories</h2>
                <div className="flex flex-wrap gap-2">
                  {business.category.map((cat, i) => (
                    <span key={i} className="chip">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {business.catalog_link && (
              <div className="mb-6">
                <h2 className="text-[16px] font-semibold text-text-primary mb-3">Catalog</h2>
                <CatalogItems catalogLink={business.catalog_link} />
              </div>
            )}

            <div className="hidden sm:block">
              <WhatsAppButton phone={business.phone} />
            </div>

            <div className="mt-4 text-center">
              <a
                href="mailto:report@wadirectory.vercel.app?subject=Report%20Business"
                className="text-xs text-text-secondary hover:text-danger transition-colors"
              >
                Report this business
              </a>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 sm:hidden z-40">
          <WhatsAppButton phone={business.phone} />
        </div>
      </div>
    </>
  )
}

export default function BusinessProfilePage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<SkeletonProfile />}>
      <BusinessContent slug={params.slug} />
    </Suspense>
  )
}

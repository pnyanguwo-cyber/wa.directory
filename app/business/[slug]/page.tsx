import { getSupabase } from '@/lib/supabase-server'
import { BUSINESS_PROFILE_COLUMNS } from '@/lib/business-select'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import WhatsAppButton from '@/components/whatsapp-button'
import ShareButton from '@/components/share-button'
import QrCard from '@/components/qr-card'
import StatsPing from '@/components/stats-ping'
import TrackLink from '@/components/track-link'
import BusinessCard from '@/components/business-card'
import LogoImage from '@/components/logo-image'
import BusinessCardPrint from '@/components/business-card-print'
import { Suspense } from 'react'
import { SkeletonProfile } from '@/components/skeleton-card'
import type { Business } from '@/types'
import { getApprovedCategoryNames, getApprovedAreaNames } from '@/lib/approved-data'

const SITE_URL = process.env.SITE_URL || 'https://wadirectory.co.zw'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const { data } = await getSupabase()
    .from('businesses')
    .select('slug, id')

  return (data || []).map(b => ({ slug: b.slug || b.id }))
}

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
          className={`w-5 h-5 ${i <= stars ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`}
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
      <LogoImage
        src={url}
        alt={name}
        width={80}
        height={80}
        sizes="(max-width: 640px) 56px, 80px"
        className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white -mt-7 sm:-mt-10 relative z-10"
      />
    )
  }

  return (
    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-whatsapp-100 border-4 border-white -mt-7 sm:-mt-10 relative z-10 flex items-center justify-center">
      <span className="text-whatsapp-700 font-bold text-base sm:text-xl">{initials}</span>
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
    .select(BUSINESS_PROFILE_COLUMNS)
    .eq('slug', slug)
    .single() as { data: Business | null }

  if (!business) {
    const { data: fallback } = await getSupabase()
      .from('businesses')
      .select(BUSINESS_PROFILE_COLUMNS)
      .eq('id', slug)
      .single() as { data: Business | null }
    business = fallback
  }

  if (!business) notFound()

  const [approvedCategoryNames, approvedAreaNames, statsRes, similarRes, ratingsRes] = await Promise.all([
    getApprovedCategoryNames(),
    getApprovedAreaNames(business.city || ''),
    getSupabase()
      .from('daily_stats')
      .select('count')
      .eq('business_id', business.id)
      .eq('type', 'profile_view')
      .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
    getSupabase()
      .from('businesses')
      .select(BUSINESS_PROFILE_COLUMNS)
      .eq('verified', true)
      .neq('id', business.id)
      .contains('category', business.category.slice(0, 1))
      .order('rating', { ascending: false })
      .limit(6),
    getSupabase()
      .from('ratings')
      .select('customer_phone, rating, comment, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const monthlyViews = (statsRes.data || []).reduce((a, r) => a + Number(r.count), 0)
  const similar = similarRes.data || []
  const ratings = ratingsRes.data || []

  const businessAreas = business.areas?.length
    ? business.areas
    : business.area
      ? [business.area]
      : []

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
  const phoneClean = (business.phone || '').replace(/\D/g, '')
  const qrMessage = encodeURIComponent(`Hi ${business.name}, I came to you through WA.Directory and I want to ask about your services.`)
  const qrUrl = phoneClean ? `https://wa.me/${phoneClean}?text=${qrMessage}` : (business.whatsapp_link || '')

  return (
    <>
      <StatsPing businessId={business.id} type="profile_view" category={business.category[0] || ''} city={business.city || ''} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/70 dark:border-gray-800 shadow-soft-lift p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:from-whatsapp-600 hover:to-whatsapp-700 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            <ShareButton businessSlug={shareSlug} businessName={business.name} businessId={business.id} />
          </div>

          <div className="card overflow-hidden">
            <div className="h-20 sm:h-40 bg-gradient-to-r from-whatsapp-100 to-whatsapp-200 relative" />

            <div className="px-4 sm:px-6">
              <LogoDisplay name={business.name} url={business.logo_url} />
            </div>

            <div className="p-3 sm:p-6 pt-2 sm:pt-3 pb-20 sm:pb-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-bold text-text-primary">{business.name}</h1>
                {business.verified && (
                  <span className="badge-verified">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M23 12L21.2 14.5L21.5 17.5L18.7 18.7L17.5 21.5L14.5 21.2L12 23L9.5 21.2L6.5 21.5L5.3 18.7L2.5 17.5L2.8 14.5L1 12L2.8 9.5L2.5 6.5L5.3 5.3L6.5 2.5L9.5 2.8L12 1L14.5 2.8L17.5 2.5L18.7 5.3L21.5 6.5L21.2 9.5Z" fill="#0095F6" stroke="white" strokeWidth="0.8" />
                      <path d="M9.5 15.5L7 13L5.5 14.5L9.5 18.5L18.5 9.5L17 8L9.5 15.5Z" fill="white" />
                    </svg>
                  </span>
                )}
              </div>
              {business.whatsapp_username && (
                <p className="text-xs sm:text-sm text-whatsapp-600 font-medium flex items-center gap-1.5 mb-1.5 sm:mb-2">
                  @{business.whatsapp_username}
                  <span className="text-text-secondary text-[10px] sm:text-xs font-normal">Business Username on WhatsApp</span>
                </p>
              )}

              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-4">
                <Stars rating={business.rating} />
                <span className="text-text-secondary text-xs sm:text-sm">
                  ({business.review_count} review{business.review_count !== 1 ? 's' : ''})
                </span>
              </div>

              {monthlyViews > 0 && (
                <div className="mb-2 sm:mb-4">
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                    <span className="text-[10px] sm:text-xs font-semibold text-text-secondary">Popularity</span>
                    <span className="text-[10px] sm:text-xs font-bold text-whatsapp-700">{monthlyViews} profile views this month</span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-surface dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-whatsapp-400 to-whatsapp-600 rounded-full"
                      style={{ width: `${Math.min(100, 15 + monthlyViews * 0.85)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4 flex-wrap">
                {businessAreas.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {businessAreas.map((a, i) => {
                      const isPending = !approvedAreaNames.has(a)
                      return (
                        <span
                          key={a}
                          className={`inline-flex items-center gap-0.5 sm:gap-1 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-0.5 text-[10px] sm:text-xs font-medium border ${
                            i === 0
                              ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800/50'
                              : isPending
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                : 'bg-surface dark:bg-gray-800 text-text-secondary border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {i === 0 && (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" aria-hidden="true" />
                              <span className="font-semibold">Primary</span>
                            </>
                          )}
                          {a}
                          {isPending && <span className="text-[10px] font-semibold uppercase tracking-wide">Pending</span>}
                        </span>
                      )
                    })}
                    {business.city && (
                      <span className="text-text-secondary text-sm">{business.city}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-text-secondary text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {[business.city, 'Zimbabwe'].filter(Boolean).join(', ') || business.location}
                  </p>
                )}
                {business.price_range && (
                  <span className="bg-surface dark:bg-gray-800 text-text-secondary text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded flex items-center gap-1">
                    <span>{business.price_range.startsWith('$') ? '' : '$'}</span>
                    {business.price_range}
                  </span>
                )}
                {business.website && (
                  <TrackLink
                    href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                    businessId={business.id}
                    type="click_website"
                    className="text-whatsapp-700 text-xs sm:text-sm flex items-center gap-1 hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 01-5.656-5.656l1.707-1.707M10.172 13.828a4 4 0 010-5.656l4-4a4 4 0 015.656 5.656l-1.707 1.707" />
                    </svg>
                    {business.website.replace(/^https?:\/\//, '')}
                  </TrackLink>
                )}
              </div>

              {business.bio && (
                <div className="mb-3 sm:mb-6">
                  <h2 className="text-sm sm:text-[16px] font-semibold text-text-primary mb-1.5 sm:mb-2">About</h2>
                  <p className="text-text-secondary leading-relaxed text-xs sm:text-sm">{business.bio}</p>
                </div>
              )}

              {business.category.length > 0 && (
                <div className="mb-3 sm:mb-6">
                  <h2 className="text-sm sm:text-[16px] font-semibold text-text-primary mb-1.5 sm:mb-2">Categories</h2>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {business.category.map((cat, i) => {
                      const isPending = !approvedCategoryNames.has(cat)
                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm border ${
                            isPending
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                              : 'bg-whatsapp-50 dark:bg-whatsapp-950/40 text-whatsapp-800 dark:text-whatsapp-300 border-whatsapp-200 dark:border-whatsapp-800/50'
                          }`}
                        >
                          {cat}
                          {isPending && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Pending</span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                  {business.category.some(c => !approvedCategoryNames.has(c)) && (
                    <p className="text-xs text-amber-600 mt-2">
                      Greyed categories are awaiting admin approval and will appear in search once approved.
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-4 sm:gap-6 mb-4 sm:mb-6 items-start">
                {(qrUrl || business.whatsapp_link) && (
                  <div className="w-full md:w-[280px] lg:w-[310px] shrink-0">
                    <h2 className="text-sm sm:text-[16px] font-semibold text-text-primary mb-2 sm:mb-3">Scan to chat</h2>
                    <QrCard
                      value={qrUrl}
                      businessName={business.name}
                      businessSlug={business.slug || business.id}
                      location={[businessAreas.length ? businessAreas[0] : '', business.city, 'Zimbabwe'].filter(Boolean).join(', ')}
                      verified={business.verified}
                      title="Scan to chat"
                      subtitle="Scan with your phone camera to start a chat"
                      downloadName={`${business.slug || 'business'}-qr.png`}
                      size={200}
                      interactive={true}
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0 w-full">
                  <h2 className="text-sm sm:text-[16px] font-semibold text-text-primary mb-2 sm:mb-3">Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {/* WhatsApp Username */}
                    {business.whatsapp_username ? (
                      <div className="rounded-2xl bg-surface/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 p-3 sm:p-3.5 flex items-center gap-3 shadow-xs h-full min-h-[64px]">
                        <div className="w-9 h-9 rounded-xl bg-whatsapp-50 dark:bg-whatsapp-950/60 border border-whatsapp-200/60 dark:border-whatsapp-800/60 flex items-center justify-center text-whatsapp-600 dark:text-whatsapp-400 shrink-0">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.83 14.12c-.25.7-1.45 1.33-2.03 1.42-.52.08-1.17.11-1.89-.12-.44-.14-1-.32-1.71-.63-3.01-1.3-4.98-4.34-5.13-4.54-.15-.2-1.23-1.63-1.23-3.11 0-1.48.78-2.21 1.05-2.51.28-.3.6-.38.8-.38.2 0 .4 0 .58.01.19.01.44-.07.69.53.25.61.86 2.11.94 2.26.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.4-.45.53-.15.15-.31.31-.13.61.18.3.79 1.31 1.7 2.12 1.17 1.04 2.16 1.37 2.46 1.52.3.15.48.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.75.83 2.05.98.3.15.5.23.58.35.08.13.08.73-.17 1.43z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider leading-none mb-1">WhatsApp</p>
                          <p className="text-xs sm:text-sm font-bold text-text-primary truncate">@{business.whatsapp_username}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-surface/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 p-3 sm:p-3.5 flex items-center gap-3 shadow-xs h-full min-h-[64px]">
                        <div className="w-9 h-9 rounded-xl bg-whatsapp-50 dark:bg-whatsapp-950/60 border border-whatsapp-200/60 dark:border-whatsapp-800/60 flex items-center justify-center text-whatsapp-600 dark:text-whatsapp-400 shrink-0">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.83 14.12c-.25.7-1.45 1.33-2.03 1.42-.52.08-1.17.11-1.89-.12-.44-.14-1-.32-1.71-.63-3.01-1.3-4.98-4.34-5.13-4.54-.15-.2-1.23-1.63-1.23-3.11 0-1.48.78-2.21 1.05-2.51.28-.3.6-.38.8-.38.2 0 .4 0 .58.01.19.01.44-.07.69.53.25.61.86 2.11.94 2.26.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.4-.45.53-.15.15-.31.31-.13.61.18.3.79 1.31 1.7 2.12 1.17 1.04 2.16 1.37 2.46 1.52.3.15.48.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.75.83 2.05.98.3.15.5.23.58.35.08.13.08.73-.17 1.43z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider leading-none mb-1">WhatsApp</p>
                          <p className="text-xs sm:text-sm font-bold text-text-primary truncate">Direct Chat</p>
                        </div>
                      </div>
                    )}

                    {/* Location */}
                    <div className="rounded-2xl bg-surface/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 p-3 sm:p-3.5 flex items-center gap-3 shadow-xs h-full min-h-[64px]">
                      <div className="w-9 h-9 rounded-xl bg-whatsapp-50 dark:bg-whatsapp-950/60 border border-whatsapp-200/60 dark:border-whatsapp-800/60 flex items-center justify-center text-whatsapp-600 dark:text-whatsapp-400 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider leading-none mb-1">Location</p>
                        <p className="text-xs sm:text-sm font-bold text-text-primary truncate">
                          {businessAreas.length ? businessAreas[0] : ''}{business.city ? (businessAreas.length ? `, ${business.city}` : business.city) : ' Zimbabwe'}
                        </p>
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="rounded-2xl bg-surface/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 p-3 sm:p-3.5 flex items-center gap-3 shadow-xs h-full min-h-[64px]">
                      <div className="w-9 h-9 rounded-xl bg-whatsapp-50 dark:bg-whatsapp-950/60 border border-whatsapp-200/60 dark:border-whatsapp-800/60 flex items-center justify-center text-whatsapp-600 dark:text-whatsapp-400 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider leading-none mb-1">Price range</p>
                        <p className="text-xs sm:text-sm font-bold text-text-primary truncate">
                          {business.price_range ? (business.price_range.startsWith('$') ? business.price_range : `$${business.price_range}`) : 'Contact for pricing'}
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="rounded-2xl bg-surface/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 p-3 sm:p-3.5 flex items-center gap-3 shadow-xs h-full min-h-[64px]">
                      <div className="w-9 h-9 rounded-xl bg-whatsapp-50 dark:bg-whatsapp-950/60 border border-whatsapp-200/60 dark:border-whatsapp-800/60 flex items-center justify-center text-whatsapp-600 dark:text-whatsapp-400 shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider leading-none mb-1">Status</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs sm:text-sm font-bold ${business.verified ? 'text-whatsapp-700 dark:text-whatsapp-400' : 'text-text-primary'}`}>
                            {business.verified ? 'Verified listing' : 'New listing'}
                          </span>
                          {business.verified && (
                            <span className="w-1.5 h-1.5 rounded-full bg-whatsapp-500 animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Full Address (if present) */}
                    {business.address && business.show_location !== false && (
                      <div className="rounded-2xl bg-surface/90 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 p-3 sm:p-3.5 flex items-center gap-3 shadow-xs sm:col-span-2 min-h-[64px]">
                        <div className="w-9 h-9 rounded-xl bg-whatsapp-50 dark:bg-whatsapp-950/60 border border-whatsapp-200/60 dark:border-whatsapp-800/60 flex items-center justify-center text-whatsapp-600 dark:text-whatsapp-400 shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider leading-none mb-1">Address</p>
                          <p className="text-xs sm:text-sm font-bold text-text-primary truncate">{business.address}</p>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address + ', ' + (business.city || 'Zimbabwe') + ', Zimbabwe')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 h-8 px-3 bg-whatsapp-500 hover:bg-whatsapp-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                          </svg>
                          Directions
                        </a>
                      </div>
                    )}
                  </div>
                  {ratings.length > 0 && (
                    <div className={business.bio ? 'mt-2 sm:mt-4' : ''}>
                      <h2 className="text-sm sm:text-[16px] font-semibold text-text-primary mb-2 sm:mb-3">Top reviews</h2>
                      <div className="space-y-2 sm:space-y-3">
                        {ratings.slice(0, 5).map((r, i) => (
                          <div key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-3 last:pb-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-whatsapp-50 dark:bg-whatsapp-950/60 text-whatsapp-700 dark:text-whatsapp-400 flex items-center justify-center text-[10px] font-bold">
                                  {r.customer_phone.slice(-2)}
                                </div>
                                <span className="text-xs font-semibold text-text-primary">+{r.customer_phone.replace(/^\+/, '').slice(0, 4)}•••{r.customer_phone.slice(-3)}</span>
                              </div>
                              <span className="text-[10px] text-text-secondary">{new Date(r.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-0.5 mb-1">
                              {[1, 2, 3, 4, 5].map(s => (
                                <svg key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            {r.comment && <p className="text-xs text-text-secondary leading-relaxed">{r.comment}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {business.catalog_link && (
                <div className="mb-3 sm:mb-6">
                  <h2 className="text-sm sm:text-[16px] font-semibold text-text-primary mb-2 sm:mb-3">Catalog</h2>
                  <CatalogItems catalogLink={business.catalog_link} />
                </div>
              )}

              <div id="business-card" className="mb-4 sm:mb-8 pt-5 border-t border-gray-100 dark:border-gray-800 scroll-mt-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-text-primary">Official Business Card</h2>
                      <span className="inline-flex items-center gap-1 bg-whatsapp-50 dark:bg-whatsapp-950/60 border border-whatsapp-200 dark:border-whatsapp-800 text-whatsapp-700 dark:text-whatsapp-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-whatsapp-500 animate-pulse" />
                        World Standard · 3.5″ × 2.0″
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Interactive 3D digital card with instant WhatsApp QR code & 300 DPI print-ready specifications.
                    </p>
                  </div>
                </div>
                <BusinessCardPrint business={business} />
              </div>

              <div className="hidden sm:block">
                <WhatsAppButton phone={business.phone} businessId={business.id} />
              </div>

              <div className="mt-4 text-center">
                <a
                  href={`mailto:wadirectory@proton.me?subject=${encodeURIComponent(`Report business: ${business.name}`)}`}
                  className="text-xs text-text-secondary hover:text-danger transition-colors"
                >
                  Report this business
                </a>
              </div>
            </div>
          </div>

          {similar.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-bold text-text-primary mb-3">Similar businesses</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {similar.map(b => (
                  <BusinessCard key={b.id} business={b} />
                ))}
              </div>
            </div>
          )}

          <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 sm:hidden z-40">
            <WhatsAppButton phone={business.phone} businessId={business.id} />
          </div>
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

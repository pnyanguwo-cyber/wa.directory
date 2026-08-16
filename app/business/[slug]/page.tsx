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

  return (
    <>
      <StatsPing businessId={business.id} type="profile_view" category={business.category[0] || ''} city={business.city || ''} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-4 sm:p-6">
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
          <ShareButton businessSlug={shareSlug} businessName={business.name} businessId={business.id} />
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
            {business.whatsapp_username && (
              <p className="text-sm text-whatsapp-600 font-medium flex items-center gap-1.5 mb-2">
                @{business.whatsapp_username}
                <span className="text-text-secondary text-xs font-normal">Business Username on WhatsApp</span>
              </p>
            )}

            <div className="flex items-center gap-2 mb-4">
              <Stars rating={business.rating} />
              <span className="text-text-secondary text-sm">
                ({business.review_count} review{business.review_count !== 1 ? 's' : ''})
              </span>
            </div>

            {monthlyViews > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-text-secondary">Popularity</span>
                  <span className="text-xs font-bold text-whatsapp-700">{monthlyViews} profile views this month</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-whatsapp-400 to-whatsapp-600 rounded-full"
                    style={{ width: `${Math.min(100, 15 + monthlyViews * 0.85)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {businessAreas.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <svg className="w-4 h-4 text-text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {businessAreas.map((a, i) => {
                    const isPending = !approvedAreaNames.has(a)
                    return (
                      <span
                        key={a}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                          i === 0
                            ? 'bg-orange-50 text-orange-800 border-orange-300'
                            : isPending
                              ? 'bg-gray-100 text-gray-500 border-gray-200'
                              : 'bg-surface text-text-secondary border-gray-200'
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
                <span className="bg-surface text-text-secondary text-sm px-2.5 py-0.5 rounded flex items-center gap-1">
                  <span>{business.price_range.startsWith('$') ? '' : '$'}</span>
                  {business.price_range}
                </span>
              )}
              {business.website && (
                <TrackLink
                  href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                  businessId={business.id}
                  type="click_website"
                  className="text-whatsapp-700 text-sm flex items-center gap-1 hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 01-5.656-5.656l1.707-1.707M10.172 13.828a4 4 0 010-5.656l4-4a4 4 0 015.656 5.656l-1.707 1.707" />
                  </svg>
                  {business.website.replace(/^https?:\/\//, '')}
                </TrackLink>
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
                  {business.category.map((cat, i) => {
                    const isPending = !approvedCategoryNames.has(cat)
                    return (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm border ${
                          isPending
                            ? 'bg-gray-100 text-gray-500 border-gray-200'
                            : 'bg-whatsapp-50 text-whatsapp-800 border-whatsapp-200'
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

            {business.whatsapp_link && (
              <div className="mb-6">
                <h2 className="text-[16px] font-semibold text-text-primary mb-3">Scan to chat</h2>
                <QrCard
                  value={`${SITE_URL}/qr/${business.slug || business.id}`}
                  title="Chat with us on WhatsApp"
                  subtitle="Scan with your phone camera to start a chat"
                  downloadName={`${business.slug || 'business'}-qr.png`}
                />
              </div>
            )}

            {business.bio && (
              <div className="mb-6">
                <h2 className="text-[16px] font-semibold text-text-primary mb-3">Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {business.whatsapp_username && (
                    <div className="rounded-2xl bg-surface border border-gray-200/80 px-3.5 py-2.5 flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-whatsapp-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.83 14.12c-.25.7-1.45 1.33-2.03 1.42-.52.08-1.17.11-1.89-.12-.44-.14-1-.32-1.71-.63-3.01-1.3-4.98-4.34-5.13-4.54-.15-.2-1.23-1.63-1.23-3.11 0-1.48.78-2.21 1.05-2.51.28-.3.6-.38.8-.38.2 0 .4 0 .58.01.19.01.44-.07.69.53.25.61.86 2.11.94 2.26.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.4-.45.53-.15.15-.31.31-.13.61.18.3.79 1.31 1.7 2.12 1.17 1.04 2.16 1.37 2.46 1.52.3.15.48.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.75.83 2.05.98.3.15.5.23.58.35.08.13.08.73-.17 1.43z" />
                      </svg>
                      <div>
                        <p className="text-[11px] font-semibold text-text-secondary">WhatsApp</p>
                        <p className="text-sm font-bold text-text-primary">@{business.whatsapp_username}</p>
                      </div>
                    </div>
                  )}
                  <div className="rounded-2xl bg-surface border border-gray-200/80 px-3.5 py-2.5 flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-whatsapp-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0z" />
                    </svg>
                    <div>
                      <p className="text-[11px] font-semibold text-text-secondary">Location</p>
                      <p className="text-sm font-bold text-text-primary">
                        {businessAreas.length ? businessAreas[0] : ''}{business.city ? `, ${business.city}` : ''}{business.city ? '' : ' Zimbabwe'}
                      </p>
                    </div>
                  </div>
                  {business.price_range && (
                    <div className="rounded-2xl bg-surface border border-gray-200/80 px-3.5 py-2.5 flex items-center gap-2.5">
                      <svg className="w-4 h-4 text-whatsapp-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                      </svg>
                      <div>
                        <p className="text-[11px] font-semibold text-text-secondary">Price range</p>
                        <p className="text-sm font-bold text-text-primary">{business.price_range.startsWith('$') ? '' : '$'}{business.price_range}</p>
                      </div>
                    </div>
                  )}
                  <div className="rounded-2xl bg-surface border border-gray-200/80 px-3.5 py-2.5 flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-whatsapp-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <div>
                      <p className="text-[11px] font-semibold text-text-secondary">Status</p>
                      <p className="text-sm font-bold text-text-primary">{business.verified ? 'Verified listing' : 'New listing'}</p>
                    </div>
                  </div>
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
              <WhatsAppButton phone={business.phone} businessId={business.id} />
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

        {ratings.length > 0 && (
          <div className="card p-5 sm:p-6 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">Ratings & reviews</h2>
              <div className="flex items-center gap-2">
                <Stars rating={business.rating} />
                <span className="text-sm text-text-secondary font-semibold">{business.rating.toFixed(1)}</span>
              </div>
            </div>
            <div className="space-y-4">
              {ratings.slice(0, 10).map((r, i) => (
                <div key={i} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-whatsapp-50 text-whatsapp-700 flex items-center justify-center text-xs font-bold">
                        {r.customer_phone.slice(-2)}
                      </div>
                      <span className="text-sm font-semibold text-text-primary">+{r.customer_phone.replace(/^\+/, '').slice(0, 4)}•••{r.customer_phone.slice(-3)}</span>
                    </div>
                    <span className="text-[11px] text-text-secondary">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <svg key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-yellow-500' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-text-secondary leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

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

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 sm:hidden z-40">
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

'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Business } from '@/types'
import LogoImage from '@/components/logo-image'
import CategoryDoodle from '@/components/category-doodle'
import TrackLink from '@/components/track-link'
import { isYellowPages } from '@/lib/category-style'
import { getCategoryImage } from '@/data/category-images'
import { cleanBio } from '@/lib/utils'

const WA_MSG = 'Hi%2C%20I%20found%20you%20on%20WA%20Directory'

function LogoInitials({ name, url }: { name: string; url?: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (url) {
    return (
      <div className="relative shrink-0">
        <LogoImage
          src={url}
          alt={name}
          width={64}
          height={64}
          sizes="(max-width: 640px) 36px, 64px"
          className="w-9 h-9 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-white shadow-md"
        />
      </div>
    )
  }

  return (
    <div
      className="w-9 h-9 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-whatsapp-100 to-whatsapp-200 border border-whatsapp-300/40 flex items-center justify-center shrink-0 shadow-sm"
      aria-hidden="true"
    >
      <span className="text-whatsapp-800 font-bold text-xs sm:text-lg tracking-wider">{initials}</span>
    </div>
  )
}

function LocationDisplay({ business }: { business: Business }) {
  const parts = [business.area, business.city, 'Zimbabwe'].filter(Boolean)
  if (parts.length === 0 && !business.location) return null
  const location = parts.length > 0 ? parts.join(', ') : business.location
  return (
    <p className="text-text-secondary text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 font-medium">
      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-whatsapp-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
      <span className="truncate">{location}</span>
    </p>
  )
}

export default function BusinessCard({ business }: { business: Business }) {
  const stars = Math.round(business.rating)
  const profilePath = `/business/${business.slug || business.id}`
  const phoneDigits = (business.phone || '').replace(/[^0-9]/g, '')
  const yellow = isYellowPages(business.category)

  const coverImage = getCategoryImage(business.category)

  return (
    <div className={`neo-card p-1.5 sm:p-5 flex flex-col justify-between h-full group hover:-translate-y-1 transition-all duration-300 relative block cursor-pointer ${yellow ? 'yellow-pages-card' : ''}`}>
      <Link href={profilePath} className="relative block" aria-label={`View profile of ${business.name}`}>
        <div className="relative">
          {coverImage && (
            <div className="relative w-full h-20 sm:h-28 rounded-xl overflow-hidden mb-3 -mt-1 -mx-1">
              <Image
                src={coverImage}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          )}
          <CategoryDoodle
            categories={business.category}
            className={`absolute -bottom-3 -right-2 w-20 h-20 sm:w-28 sm:h-28 ${
              yellow
                ? 'text-amber-600 opacity-[0.12] dark:text-amber-400 dark:opacity-[0.14]'
                : 'text-whatsapp-700 opacity-[0.06] dark:text-whatsapp-300 dark:opacity-[0.08]'
            }`}
          />
          <div className="flex gap-2 sm:gap-3.5">
            <LogoInitials name={business.name} url={business.logo_url} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-text-primary text-sm sm:text-lg truncate leading-tight group-hover:text-whatsapp-700 transition-colors">
                  {business.name}
                </h3>
                {business.verified && (
                  <span className="badge-verified" title="Meta Verified Business">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M23 12L21.2 14.5L21.5 17.5L18.7 18.7L17.5 21.5L14.5 21.2L12 23L9.5 21.2L6.5 21.5L5.3 18.7L2.5 17.5L2.8 14.5L1 12L2.8 9.5L2.5 6.5L5.3 5.3L6.5 2.5L9.5 2.8L12 1L14.5 2.8L17.5 2.5L18.7 5.3L21.5 6.5L21.2 9.5Z" fill="#0095F6" stroke="white" strokeWidth="0.8" />
                      <path d="M9.5 15.5L7 13L5.5 14.5L9.5 18.5L18.5 9.5L17 8L9.5 15.5Z" fill="white" />
                    </svg>
                  </span>
                )}
                {yellow && <span className="badge-yellow-pages">★ Yellow Pages</span>}
                {!business.verified && <span className="badge-pending" title="Awaiting admin verification">Pending</span>}
              </div>
              {business.whatsapp_username && (
                <p className="text-xs text-whatsapp-600 font-medium items-center gap-1 mt-0.5 hidden sm:flex">
                  @{business.whatsapp_username}
                  <span className="text-text-secondary text-[10px] font-normal">Business Username on WhatsApp</span>
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <div className="flex items-center gap-0.5" aria-label={`Rated ${business.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <svg
                      key={i}
                      className={`w-3 h-3 sm:w-4 sm:h-4 ${i <= stars ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300 dark:text-gray-600 dark:fill-gray-600'}`}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <span className="text-text-secondary text-[10px] sm:text-sm font-medium">({business.review_count})</span>
                <span className="text-text-secondary text-[10px] sm:text-xs hidden sm:inline">·</span>
                <span className="text-text-secondary text-[10px] sm:text-xs hidden sm:inline truncate">{[business.area, business.city].filter(Boolean).join(', ')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <LocationDisplay business={business} />
            {business.price_range && (
              <span className="bg-surface/80 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700 text-text-secondary dark:text-gray-300 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                <span className="text-whatsapp-600 dark:text-whatsapp-400 font-semibold">$</span>
                {business.price_range}
              </span>
            )}
          </div>

          {business.bio && (
            <p className="text-text-secondary dark:text-gray-400 text-xs sm:text-base mt-1.5 mb-1 sm:mt-2.5 sm:mb-2 line-clamp-1 sm:line-clamp-2 leading-relaxed">{cleanBio(business.bio)}</p>
          )}              {business.category && business.category.length > 0 && (
                <div className="flex flex-wrap gap-0.5 sm:gap-1.5 my-0.5 sm:my-3">
                  {business.category.slice(0, 3).map((cat, i) => (
                    <span key={i} className={`chip text-[10px] sm:text-xs ${isYellowPages([cat]) ? 'chip-yellow-pages' : ''}`}>
                      {cat}
                    </span>
                  ))}
                </div>
              )}
        </div>
      </Link>

      <div className="relative flex items-stretch gap-1 sm:gap-2 mt-1.5 pt-2 sm:mt-4 sm:pt-3.5 border-t border-gray-100 dark:border-gray-800">
        {phoneDigits && (
          business.phone_type === 'voice' ? (
            <TrackLink
              href={`tel:${business.phone}`}
              businessId={business.id}
              type="click_call"
              className="btn-primary flex-1 h-8 sm:h-12 text-xs sm:text-base flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 min-w-0 shadow-md hover:shadow-lg z-10 pointer-events-auto"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" />
              </svg>
              <span className="truncate font-semibold text-[10px] sm:text-base">Call</span>
            </TrackLink>
          ) : (
            <a
              href={`https://wa.me/${phoneDigits}?text=${WA_MSG}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex-1 h-8 sm:h-12 text-xs sm:text-base flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 min-w-0 shadow-md hover:shadow-lg z-10 pointer-events-auto"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="truncate font-semibold text-[10px] sm:text-base">WhatsApp</span>
            </a>
          )
        )}
        <Link
          href={profilePath}
          className="btn-secondary flex-1 h-8 sm:h-12 px-2 sm:px-4 flex items-center justify-center gap-1.5 text-[10px] sm:text-base font-medium text-text-primary dark:text-gray-100 shrink-0 z-10"
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-text-secondary dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          <span className="truncate">Profile</span>
        </Link>
      </div>
    </div>
  )
}
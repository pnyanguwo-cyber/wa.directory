'use client'

import Link from 'next/link'
import type { Business } from '@/types'
import LogoImage from '@/components/logo-image'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`w-4 h-4 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300 dark:text-gray-600 dark:fill-gray-600'}`} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export default function FeaturedScroll({ businesses }: { businesses: Business[] }) {
  if (businesses.length === 0) return null

  const doubled = [...businesses, ...businesses]

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-whatsapp-500 animate-pulse" aria-hidden="true" />
          <span className="text-xs font-bold text-text-primary dark:text-gray-200 tracking-wider uppercase">Recently Added to WA Directory</span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden pt-1 pb-2">
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />

        <div className="animate-marquee animate-marquee-hover-pause flex gap-3.5">
          {doubled.map((b, idx) => (
            <Link key={`${b.id}-${idx}`} href={`/business/${b.slug || b.id}`} className="shrink-0 w-64 bg-white/95 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-gray-200/60 dark:border-gray-700/80 shadow-card hover:shadow-card-hover hover:border-whatsapp-300 dark:hover:border-whatsapp-500 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group">
              <div>
                <Stars rating={b.rating} />
                <div className="flex items-center gap-2.5 mt-2.5 mb-1.5">
                  {b.logo_url ? (
                    <LogoImage src={b.logo_url} alt={b.name} width={44} height={44} sizes="44px" className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-gray-100 dark:ring-gray-700" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-whatsapp-100 to-whatsapp-200 dark:from-whatsapp-900/60 dark:to-whatsapp-800/60 flex items-center justify-center shrink-0 border border-whatsapp-300/40 dark:border-whatsapp-700/40" aria-hidden="true">
                      <span className="text-sm font-bold text-whatsapp-800 dark:text-gray-200">{b.name.charAt(0)}</span>
                    </div>
                  )}
                  <span className="font-bold text-text-primary dark:text-gray-200 text-base truncate leading-tight group-hover:text-whatsapp-700 dark:group-hover:text-whatsapp-400 transition-colors">{b.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary dark:text-gray-400 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                <span className="truncate font-medium">{b.category?.[0] || 'Business'}</span>
                {(b.city || b.location) && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" aria-hidden="true" />
                    <span className="truncate text-gray-500 dark:text-gray-400">{b.city || b.location}</span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

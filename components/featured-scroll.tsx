'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Business } from '@/types'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rated ${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

export default function FeaturedScroll({ businesses }: { businesses: Business[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout>()
  const isHoveringOrFocused = useRef(false)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (businesses.length < 2 || !isPlaying) return

    // Respect reduced motion settings
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) return

    function advance() {
      if (isHoveringOrFocused.current) return
      const el = scrollRef.current
      if (!el) return

      const maxScroll = el.scrollWidth - el.clientWidth
      const nearEnd = el.scrollLeft >= maxScroll - 20

      if (nearEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        const firstCard = el.children[0] as HTMLElement | undefined
        const step = firstCard?.offsetWidth ? firstCard.offsetWidth + 14 : 220
        el.scrollBy({ left: step, behavior: 'smooth' })
      }
    }

    timerRef.current = setInterval(advance, 5000)
    return () => clearInterval(timerRef.current)
  }, [businesses.length, isPlaying])

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const step = 240
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' })
  }

  if (businesses.length === 0) return null

  return (
    <div
      className="relative my-2"
      onMouseEnter={() => { isHoveringOrFocused.current = true }}
      onMouseLeave={() => { isHoveringOrFocused.current = false }}
      onFocus={() => { isHoveringOrFocused.current = true }}
      onBlur={() => { isHoveringOrFocused.current = false }}
    >
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-whatsapp-500 animate-pulse" aria-hidden="true" />
          <span className="text-xs font-bold text-text-primary tracking-wider uppercase">
            Live Verified Directory Stream
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-xs font-medium text-text-secondary hover:text-whatsapp-700 px-2.5 py-1 rounded-full bg-white/80 border border-gray-200/80 shadow-sm transition-all"
            aria-label={isPlaying ? 'Pause auto-scrolling' : 'Start auto-scrolling'}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={() => scrollByAmount('left')}
            className="w-8 h-8 rounded-full bg-white/90 border border-gray-200/80 shadow-sm flex items-center justify-center text-text-secondary hover:text-whatsapp-700 hover:border-whatsapp-300 transition-all"
            aria-label="Scroll left"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={() => scrollByAmount('right')}
            className="w-8 h-8 rounded-full bg-white/90 border border-gray-200/80 shadow-sm flex items-center justify-center text-text-secondary hover:text-whatsapp-700 hover:border-whatsapp-300 transition-all"
            aria-label="Scroll right"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        aria-label="Recently added businesses list"
        className="flex gap-3.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-3 pt-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {businesses.map(b => (
          <Link
            key={b.id}
            href={`/business/${b.slug || b.id}`}
            className="snap-start shrink-0 w-52 bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-white/90 shadow-card hover:shadow-card-hover hover:border-whatsapp-200 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group"
          >
            <div>
              <Stars rating={b.rating} />
              <div className="flex items-center gap-2.5 mt-2.5 mb-1.5">
                {b.logo_url ? (
                  <img
                    src={b.logo_url}
                    alt={b.name}
                    className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-gray-100"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-whatsapp-100 to-whatsapp-200 flex items-center justify-center shrink-0 border border-whatsapp-300/40" aria-hidden="true">
                    <span className="text-xs font-bold text-whatsapp-800">{b.name.charAt(0)}</span>
                  </div>
                )}
                <span className="font-bold text-text-primary text-sm truncate leading-tight group-hover:text-whatsapp-700 transition-colors">
                  {b.name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-3 pt-2 border-t border-gray-100">
              <span className="truncate font-medium">{b.category?.[0] || 'Business'}</span>
              {(b.city || b.location) && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" aria-hidden="true" />
                  <span className="truncate text-gray-500">{b.city || b.location}</span>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

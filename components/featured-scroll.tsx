'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import type { Business } from '@/types'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-200'}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function FeaturedScroll({ businesses }: { businesses: Business[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout>()
  const isHovering = useRef(false)

  useEffect(() => {
    if (businesses.length < 2) return

    function advance() {
      if (isHovering.current) return
      const el = scrollRef.current
      if (!el) return

      const maxScroll = el.scrollWidth - el.clientWidth
      const nearEnd = el.scrollLeft >= maxScroll - 20

      if (nearEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        const firstCard = el.children[0] as HTMLElement | undefined
        const step = firstCard?.offsetWidth ? firstCard.offsetWidth + 12 : 200
        el.scrollBy({ left: step, behavior: 'smooth' })
      }
    }

    timerRef.current = setInterval(advance, 5000)
    return () => clearInterval(timerRef.current)
  }, [businesses.length])

  if (businesses.length === 0) return null

  return (
    <div
      className="relative mt-6"
      onMouseEnter={() => { isHovering.current = true }}
      onMouseLeave={() => { isHovering.current = false }}
    >
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {businesses.map(b => (
          <Link
            key={b.id}
            href={`/business/${b.slug || b.id}`}
            className="snap-start shrink-0 w-44 card p-3 hover:shadow-card-hover transition-all"
          >
            <Stars rating={b.rating} />
            <div className="flex items-center gap-2 mt-2 mb-1.5">
              {b.logo_url ? (
                <img
                  src={b.logo_url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-gray-400">{b.name.charAt(0)}</span>
                </div>
              )}
              <span className="font-semibold text-text-primary text-sm truncate leading-tight">
                {b.name}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <span className="truncate">{b.category?.[0]}</span>
              {(b.city || b.location) && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                  <span className="truncate">{b.city || b.location}</span>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

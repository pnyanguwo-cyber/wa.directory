// Emergency Hotline strip for Yellow Pages listings (police, fire, government
// services). Sits at the top of the home page; renders nothing when no
// verified special-service listings exist yet.
import Link from 'next/link'
import CategoryDoodle from '@/components/category-doodle'
import YellowCompactCard from '@/components/yellow-compact-card'
import type { Business } from '@/types'

export default function EmergencyStrip({ businesses }: { businesses: Business[] }) {
  if (!businesses || businesses.length === 0) return null

  // Duplicate cards for seamless mobile marquee loop
  const doubled = [...businesses, ...businesses]

  return (
    <section
      aria-label="Emergency and essential services"
      className="relative overflow-hidden rounded-3xl border border-amber-300/60 shadow-soft-lift bg-gradient-to-br from-amber-50 via-amber-50 to-yellow-100 p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge-yellow-pages">★ Yellow Pages</span>
            <h2 className="text-base sm:text-xl font-extrabold text-text-primary tracking-tight">
              Emergency &amp; Essential Services
            </h2>
          </div>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Verified public services.{' '}
            <Link href="/yellow-pages" className="text-amber-700 font-semibold hover:underline whitespace-nowrap">
              View all →
            </Link>
          </p>
        </div>
        {/* Light beacon doodle */}
        <CategoryDoodle
          categories={['Emergency Services']}
          strokeWidth={1}
          className="hidden sm:block w-16 h-16 shrink-0 text-amber-600/40"
        />
      </div>

      {/* Mobile: auto-scroll marquee. Desktop: manual scroll. */}
      <div className="relative">
        {/* Fade edges on mobile */}
        <div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-amber-50 to-transparent z-10 pointer-events-none sm:hidden" />
        <div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-amber-50 to-transparent z-10 pointer-events-none sm:hidden" />

        <div className="flex gap-3 overflow-hidden sm:overflow-x-auto pb-2 -mx-1 px-1 sm:snap-x sm:snap-mandatory emergency-scroll-container">
          {doubled.map((b, idx) => (
            <YellowCompactCard
              key={`${b.id}-${idx}`}
              business={b}
              className="w-[150px] sm:w-[260px] sm:snap-start"
            />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-text-secondary/80 mt-2">
        In a life-threatening emergency, always call your national emergency number first. These are verified directory listings, not official hotlines.
      </p>
    </section>
  )
}

'use client'

export interface StatItem {
  label: string
  value: string
}

/**
 * Rock-solid, glitch-free trust stats strip.
 * Renders verified metrics (Rating, Reviews, Products, Directory Status)
 * with zero layout shift, zero hydration flicker, and tabular numeral alignment.
 */
export default function SiteStats({ stats, accent }: { stats: StatItem[]; accent: string }) {
  if (!stats || stats.length === 0) return null

  return (
    <div className="relative z-10 -mt-10 sm:-mt-12 max-w-6xl mx-auto px-4 sm:px-6">
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-3xl border border-black/[0.08] bg-black/[0.06] overflow-hidden shadow-card-lift backdrop-blur-md">
        {stats.map((s) => (
          <div
            key={s.label}
            className="group relative bg-white/95 backdrop-blur-sm px-5 py-5 sm:px-7 sm:py-6 transition-all duration-300 hover:bg-white"
          >
            {/* Subtle accent hover indicator on top border */}
            <div
              className="absolute top-0 inset-x-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ backgroundColor: accent }}
            />
            <dt className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-text-secondary line-clamp-1">
              {s.label}
            </dt>
            <dd className="mt-1.5 flex items-baseline gap-1 font-extrabold tracking-tight tabular-nums text-2xl md:text-3xl text-text-primary">
              <span>{s.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

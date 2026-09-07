// Emergency Hotline strip for Yellow Pages listings (police, fire, government
// services). Sits at the top of the home page; renders nothing when no
// verified special-service listings exist yet.
import Link from 'next/link'
import type { Business } from '@/types'
import CategoryDoodle from '@/components/category-doodle'
import TrackLink from '@/components/track-link'
import { isYellowPages } from '@/lib/category-style'

const WA_MSG = 'Hi%2C%20I%20found%20you%20on%20WA%20Directory'

export default function EmergencyStrip({ businesses }: { businesses: Business[] }) {
  if (!businesses || businesses.length === 0) return null

  return (
    <section
      aria-label="Emergency and essential services"
      className="relative overflow-hidden rounded-3xl border border-amber-300/60 dark:border-amber-800/50 shadow-soft-lift bg-gradient-to-br from-amber-50/95 via-amber-50/80 to-yellow-100/40 dark:from-amber-950/40 dark:via-gray-900/90 dark:to-yellow-950/20 backdrop-blur-xl p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge-yellow-pages">★ Yellow Pages</span>
            <h2 className="text-lg sm:text-xl font-extrabold text-text-primary tracking-tight">
              Emergency &amp; Essential Services
            </h2>
          </div>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Verified public-service providers — tap to chat instantly on WhatsApp.{' '}
            <Link href="/yellow-pages" className="text-amber-700 dark:text-amber-400 font-semibold hover:underline whitespace-nowrap">
              View all →
            </Link>
          </p>
        </div>
        {/* Light beacon doodle */}
        <CategoryDoodle
          categories={['Emergency Services']}
          strokeWidth={1}
          className="hidden sm:block w-16 h-16 shrink-0 text-amber-600/40 dark:text-amber-400/30"
        />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
        {businesses.map(b => {
          const phoneDigits = (b.phone || '').replace(/[^0-9]/g, '')
          const profilePath = `/business/${b.slug || b.id}`
          return (
            <div
              key={b.id}
              className="neo-card yellow-pages-card relative overflow-hidden shrink-0 w-[250px] sm:w-[280px] snap-start p-4 flex flex-col"
            >
              <CategoryDoodle
                categories={b.category}
                className="absolute -right-3 -bottom-3 w-24 h-24 text-amber-600 opacity-[0.12] dark:text-amber-400 dark:opacity-[0.14]"
              />
              <div className="flex items-start gap-2.5">
                <span className="text-xl leading-none mt-0.5" aria-hidden="true">🚨</span>
                <div className="min-w-0">
                  <Link
                    href={profilePath}
                    className="font-bold text-sm text-text-primary hover:text-amber-700 dark:hover:text-amber-300 transition-colors line-clamp-1"
                  >
                    {b.name}
                  </Link>
                  <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                    {[b.area, b.city].filter(Boolean).join(', ') || 'Zimbabwe'}
                  </p>
                </div>
              </div>

              {b.bio && (
                <p className="text-[11px] text-text-secondary mt-2 line-clamp-2 leading-relaxed">{b.bio}</p>
              )}

              <div className="flex flex-wrap gap-1 my-2">
                {(b.category || []).slice(0, 2).map((cat, i) => (
                  <span
                    key={i}
                    className={`chip text-[10px] ${isYellowPages([cat]) ? 'chip-yellow-pages' : ''}`}
                  >
                    {cat}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-stretch gap-1.5 pt-2 border-t border-amber-200/60 dark:border-amber-800/40">
                {phoneDigits && (
                  b.phone_type === 'voice' ? (
                    <TrackLink
                      href={`tel:${b.phone}`}
                      businessId={b.id}
                      type="click_call"
                      className="btn-primary flex-1 h-9 text-xs flex items-center justify-center gap-1.5 px-2 min-w-0"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 0 0 6.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" />
                      </svg>
                      <span className="truncate font-semibold">Call now</span>
                    </TrackLink>
                  ) : (
                    <TrackLink
                      href={`https://wa.me/${phoneDigits}?text=${WA_MSG}`}
                      businessId={b.id}
                      type="click_whatsapp"
                      className="btn-primary flex-1 h-9 text-xs flex items-center justify-center gap-1.5 px-2 min-w-0"
                    >                      <svg className="w-3.5 h-3.5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span className="truncate font-semibold">WhatsApp</span>
                    </TrackLink>
                  )
                )}
                <Link
                  href={profilePath}
                  className="btn-secondary flex-1 h-9 text-xs flex items-center justify-center gap-1.5 px-2 font-semibold text-text-primary dark:text-gray-100"
                >
                  Profile
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-text-secondary/80 mt-2">
        In a life-threatening emergency, always call your national emergency number first — these are verified directory listings, not official hotlines.
      </p>
    </section>
  )
}

import Link from 'next/link'
import type { Business } from '@/types'

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
        <img
          src={url}
          alt={name}
          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-md"
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div
      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-whatsapp-100 to-whatsapp-200 border border-whatsapp-300/40 flex items-center justify-center shrink-0 shadow-sm"
      aria-hidden="true"
    >
      <span className="text-whatsapp-800 font-bold text-base tracking-wider">{initials}</span>
    </div>
  )
}

function LocationDisplay({ business }: { business: Business }) {
  const parts = [business.area, business.city, 'Zimbabwe'].filter(Boolean)
  if (parts.length === 0 && !business.location) return null
  const location = parts.length > 0 ? parts.join(', ') : business.location
  return (
    <p className="text-text-secondary text-xs flex items-center gap-1.5 font-medium">
      <svg className="w-3.5 h-3.5 text-whatsapp-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
      <span className="truncate">{location}</span>
    </p>
  )
}

export default function BusinessCard({ business }: { business: Business }) {
  const stars = Math.round(business.rating)
  const profilePath = business.slug || business.id

  return (
    <div className="neo-card p-5 flex flex-col justify-between h-full group hover:-translate-y-1 transition-all duration-300">
      <div>
        <div className="flex gap-3.5">
          <LogoInitials name={business.name} url={business.logo_url} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-text-primary text-[17px] truncate leading-tight group-hover:text-whatsapp-700 transition-colors">
                {business.name}
              </h3>
              {business.verified && (
                <span className="badge-verified shrink-0" title="Meta Verified Business">
                  <svg className="w-3 h-3 text-whatsapp-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                  <span>Verified</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex items-center gap-0.5" aria-label={`Rated ${business.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map(i => (
                  <svg
                    key={i}
                    className={`w-3.5 h-3.5 ${i <= stars ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}`}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>
              <span className="text-text-secondary text-xs font-medium">({business.review_count})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <LocationDisplay business={business} />
          {business.price_range && (
            <span className="bg-surface/80 border border-gray-200/60 text-text-secondary text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
              <span className="text-whatsapp-600 font-semibold">$</span>
              {business.price_range}
            </span>
          )}
        </div>

        {business.bio && (
          <p className="text-text-secondary text-sm mt-2.5 mb-2 line-clamp-2 leading-relaxed">{business.bio}</p>
        )}

        {business.category && business.category.length > 0 && (
          <div className="flex flex-wrap gap-1.5 my-3">
            {business.category.slice(0, 3).map((cat, i) => (
              <span key={i} className="chip text-xs">
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-stretch gap-2.5 mt-4 pt-3.5 border-t border-gray-100">
        <a
          href={`https://wa.me/${business.phone.replace(/[^0-9]/g, '')}?text=${WA_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex-1 h-11 text-sm flex items-center justify-center gap-2 px-4 min-w-0 shadow-md hover:shadow-lg"
        >
          <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span className="truncate font-semibold">Chat on WhatsApp</span>
        </a>
        <Link
          href={`/business/${profilePath}`}
          className="btn-secondary h-11 px-3.5 flex items-center justify-center gap-1.5 text-sm font-medium text-text-primary shrink-0"
        >
          <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          <span className="hidden sm:inline">Profile</span>
        </Link>
      </div>
    </div>
  )
}

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
      <img
        src={url}
        alt={name}
        className="w-14 h-14 rounded-full object-cover shrink-0"
        loading="lazy"
      />
    )
  }

  return (
    <div className="w-14 h-14 rounded-full bg-whatsapp-100 flex items-center justify-center shrink-0">
      <span className="text-whatsapp-700 font-semibold text-sm">{initials}</span>
    </div>
  )
}

function LocationDisplay({ business }: { business: Business }) {
  const parts = [business.area, business.city, 'Zimbabwe'].filter(Boolean)
  if (parts.length === 0 && !business.location) return null
  const location = parts.length > 0 ? parts.join(', ') : business.location
  return (
    <p className="text-text-secondary text-xs flex items-center gap-1">
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span className="truncate">{location}</span>
    </p>
  )
}

export default function BusinessCard({ business }: { business: Business }) {
  const stars = Math.round(business.rating)
  const profilePath = business.slug || business.id

  return (
    <div className="card p-4 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150">
      <div className="flex gap-3">
        <LogoInitials name={business.name} url={business.logo_url} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-primary text-[16px] truncate">{business.name}</h3>
            {business.verified && (
              <span className="badge-verified shrink-0">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(i => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${i <= stars ? 'text-yellow-500' : 'text-gray-300'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-text-secondary text-sm">({business.review_count})</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <LocationDisplay business={business} />
        {business.price_range && (
          <span className="bg-surface text-text-secondary text-xs px-2 py-0.5 rounded flex items-center gap-1">
            <span>??</span>
            {business.price_range}
          </span>
        )}
      </div>

      {business.bio && (
        <p className="text-text-secondary text-sm mt-2 mb-2 line-clamp-2 leading-relaxed">{business.bio}</p>
      )}

      {business.category.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {business.category.slice(0, 3).map((cat, i) => (
            <span key={i} className="chip text-xs">
              {cat}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-stretch gap-2">
        <a
          href={`https://wa.me/${business.phone.replace(/[^0-9]/g, '')}?text=${WA_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex-1 h-10 text-sm flex items-center justify-center gap-1.5 px-3"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span>Chat on WhatsApp</span>
        </a>
        <Link
          href={`/business/${profilePath}`}
          className="h-10 px-4 border border-gray-300 rounded-xl flex items-center justify-center gap-1.5 text-sm font-medium text-text-primary hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </Link>
      </div>
    </div>
  )
}

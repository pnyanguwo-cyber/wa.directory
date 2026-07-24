import Link from 'next/link'
import type { Business } from '@/types'

export default function BusinessCard({ business }: { business: Business }) {
  const stars = Math.round(business.rating)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg truncate">{business.name}</h3>
            {business.verified && (
              <span className="bg-whatsapp-100 text-whatsapp-700 text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap">
                ✓ Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-yellow-500">
              {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
            </span>
            <span className="text-gray-500 text-sm">({business.review_count})</span>
          </div>
        </div>
      </div>
      {business.location && (
        <p className="text-gray-500 text-sm mb-2 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {business.location}
        </p>
      )}
      {business.bio && (
        <p className="text-gray-700 text-sm mb-3 line-clamp-2">{business.bio}</p>
      )}
      {business.category.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {business.category.slice(0, 3).map((cat, i) => (
            <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
              {cat}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <a
          href={`https://wa.me/${business.phone.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-whatsapp-500 text-white text-center py-2 rounded-lg text-sm font-medium hover:bg-whatsapp-600 transition-colors"
        >
          Chat on WhatsApp
        </a>
        <Link
          href={`/business/${business.id}`}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View Profile
        </Link>
      </div>
    </div>
  )
}

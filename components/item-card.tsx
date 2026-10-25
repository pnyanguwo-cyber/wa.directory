import Link from 'next/link'
import Image from 'next/image'
import type { BusinessItem } from '@/types'
import { formatPrice } from '@/lib/utils'

export default function ItemCard({ item }: { item: BusinessItem }) {
  const href = `/business/${item.business?.slug || item.business_id}`
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-card hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group"
    >
      <div className="flex items-start gap-3 min-w-0">
        {item.image_url ? (
          <div className="w-11 h-11 rounded-xl border border-gray-200/80 overflow-hidden bg-surface shrink-0">
            <Image src={item.image_url} alt={item.name} width={44} height={44} className="w-11 h-11 object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-xl border border-dashed border-gray-300 bg-surface flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M18 6h.008v.008H18V6Zm2.25 12H3.75A1.5 1.5 0 0 1 2.25 16.5v-9A1.5 1.5 0 0 1 3.75 6h16.5A1.5 1.5 0 0 1 21.75 7.5v9a1.5 1.5 0 0 1-1.5 1.5Z" />
            </svg>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-text-primary text-sm truncate group-hover:text-whatsapp-700 transition-colors">{item.name}</p>
          {item.business?.name && (
            <p className="text-[11px] sm:text-xs text-text-secondary font-medium mt-0.5 truncate">
              {item.business?.city ? `${item.business.name} · ${item.business.city}` : item.business.name}
            </p>
          )}
        </div>
      </div>
      <span className="shrink-0 inline-flex items-center rounded-full bg-whatsapp-50 border border-whatsapp-200 px-2.5 py-1 text-xs font-bold text-whatsapp-800">
        {formatPrice(item.price)}
      </span>
    </Link>
  )
}

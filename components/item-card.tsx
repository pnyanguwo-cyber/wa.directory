import Link from 'next/link'
import type { BusinessItem } from '@/types'

function formatPrice(price: number | string | null | undefined): string {
  const n = Number(price ?? 0)
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`
}

export default function ItemCard({ item }: { item: BusinessItem }) {
  const href = `/business/${item.business?.slug || item.business_id}`
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-card hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group"
    >
      <div className="min-w-0">
        <p className="font-semibold text-text-primary text-sm truncate group-hover:text-whatsapp-700 transition-colors">{item.name}</p>
        {item.business?.name && (
          <p className="text-[11px] sm:text-xs text-text-secondary font-medium mt-0.5 truncate">
            {item.business?.city ? `${item.business.name} · ${item.business.city}` : item.business.name}
          </p>
        )}
      </div>
      <span className="shrink-0 inline-flex items-center rounded-full bg-whatsapp-50 border border-whatsapp-200 px-2.5 py-1 text-xs font-bold text-whatsapp-800">
        {formatPrice(item.price)}
      </span>
    </Link>
  )
}

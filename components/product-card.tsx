import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, Package, MapPin, ShieldCheck } from 'lucide-react'
import type { BusinessItem } from '@/types'
import { formatMoney, availabilityLabel } from '@/lib/product-format'
import { whatsappHref, hasWhatsAppChannel } from '@/components/contact'

/**
 * Product result card for Products mode.
 *
 * Price/currency come straight from the row: an explicit `on_request` renders
 * as "Price on request", never as $0.00, and a genuinely missing price is
 * labelled rather than invented.
 */
export default function ProductCard({ product }: { product: BusinessItem }) {
  const seller = product.businesses || (product.business as unknown as BusinessItem['businesses'])
  const sellerSlug = seller?.slug || product.business_id
  const href = `/business/${sellerSlug}`
  const phone = seller?.phone || ''
  const available = product.availability_status !== 'out_of_stock'
  const outOfStock = product.availability_status === 'out_of_stock'

  return (
    <article className="group bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-card hover:shadow-lg transition-all flex flex-col">
      <Link href={href} className="block relative aspect-square bg-surface overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 240px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <Package className="w-10 h-10" aria-hidden="true" />
          </div>
        )}
        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-slate-900/75 text-white text-[11px] font-semibold text-center py-1">
            Out of stock
          </span>
        )}
      </Link>

      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <Link href={href} className="text-sm font-semibold text-text-primary line-clamp-2 hover:text-whatsapp-700">
          {product.name}
        </Link>

        <p className="text-base font-extrabold text-whatsapp-800">
          {formatMoney(product.price, product.currency_code, product.price_type)}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              outOfStock
                ? 'bg-slate-100 text-slate-600'
                : available
                  ? 'bg-whatsapp-50 text-whatsapp-800 border border-whatsapp-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {availabilityLabel(product.availability_status)}
          </span>
          {product.category && (
            <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-text-secondary">
              {product.category}
            </span>
          )}
        </div>

        <div className="mt-auto pt-1.5">
          <p className="text-[11px] font-medium text-text-secondary truncate flex items-center gap-1">
            {seller?.verified && <ShieldCheck className="w-3 h-3 text-whatsapp-600 shrink-0" aria-hidden="true" />}
            <span className="truncate">{seller?.name || 'Seller'}</span>
            {seller?.city && (
              <>
                <span aria-hidden="true">·</span>
                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{seller.city}</span>
              </>
            )}
          </p>

          {phone && hasWhatsAppChannel({ phone, phone_type: seller?.phone_type }) && (
            <a
              href={whatsappHref(phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-whatsapp-500 hover:bg-whatsapp-600 text-white text-xs font-bold py-2 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              Contact seller
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

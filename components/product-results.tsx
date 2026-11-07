import Link from 'next/link'
import { Package, Search } from 'lucide-react'
import { searchProducts, AVAILABILITY_STATES, availabilityLabel } from '@/lib/products'
import ProductCard from '@/components/product-card'

const PAGE_SIZE = 24

/**
 * Products mode results (server component).
 *
 * Uses the shared product service, so the same eligibility rules apply here as
 * on the map, in the bot and in the image search.
 */
export default async function ProductResults({
  q,
  category,
  availability,
  page,
}: {
  q: string
  category: string
  availability: string
  page: number
}) {
  const offset = Math.max(page - 1, 0) * PAGE_SIZE
  const { products, total } = await searchProducts({
    q,
    category,
    availability: availability || undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const hasNext = offset + products.length < total
  const filterHref = (state: string) => {
    const params = new URLSearchParams({ mode: 'products' })
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (state) params.set('availability', state)
    return `/search?${params.toString()}`
  }

  const availabilityOptions = [
    { key: '', label: 'Any availability' },
    ...AVAILABILITY_STATES.filter((s) => s !== 'out_of_stock').map((s) => ({ key: s, label: availabilityLabel(s) })),
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-secondary">
          <span className="font-bold text-text-primary">{total}</span>{' '}
          {total === 1 ? 'product' : 'products'}
          {q ? ` matching “${q}”` : ''}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {availabilityOptions.map((option) => {
            const active = (availability || '') === option.key
            return (
              <Link
                key={option.key || 'any'}
                href={filterHref(option.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-whatsapp-600 text-white'
                    : 'bg-white/80 border border-gray-200 text-text-secondary hover:text-text-primary'
                }`}
              >
                {option.label}
              </Link>
            )
          })}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-surface w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            {q ? (
              <Search className="w-8 h-8 text-text-secondary" aria-hidden="true" />
            ) : (
              <Package className="w-8 h-8 text-text-secondary" aria-hidden="true" />
            )}
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">No products found</h2>
          <p className="text-text-secondary text-sm">
            {q
              ? 'Try a shorter or more general term, or search by photo.'
              : 'Products appear here once local sellers publish their stock.'}
          </p>
          <Link
            href="/list"
            className="inline-flex items-center gap-1.5 mt-4 rounded-full bg-whatsapp-500 hover:bg-whatsapp-600 text-white px-4 py-2 text-sm font-semibold transition-colors"
          >
            List your business
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {hasNext && (
        <div className="flex justify-center pt-2">
          <Link
            href={`/search?${new URLSearchParams({
              mode: 'products',
              ...(q ? { q } : {}),
              ...(category ? { category } : {}),
              ...(availability ? { availability } : {}),
              page: String(page + 1),
            }).toString()}`}
            className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-text-primary hover:border-whatsapp-300 hover:text-whatsapp-700 transition-colors"
          >
            Show more products
          </Link>
        </div>
      )}
    </div>
  )
}

import Link from 'next/link'
import { Package, Wrench, LayoutGrid } from 'lucide-react'

export type DiscoveryMode = 'all' | 'products' | 'services'

/**
 * The single Products / Services / All control shared by /search and /map.
 *
 * It is a pair of links, so the selected mode survives refresh, browser
 * back/forward and deep links, and all modes run over the same shell.
 */
export default function DiscoveryModeSwitch({
  mode,
  allHref,
  productsHref,
  servicesHref,
  className = '',
}: {
  mode: DiscoveryMode
  allHref: string
  productsHref: string
  servicesHref: string
  className?: string
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all'
  const selected = 'bg-whatsapp-600 text-white shadow-sm'
  const idle = 'text-text-secondary hover:text-text-primary hover:bg-white/70'

  return (
    <div
      role="tablist"
      aria-label="Discovery mode"
      className={`inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/85 p-1 backdrop-blur-xl shadow-soft-lift ${className}`}
    >
      <Link
        href={allHref}
        role="tab"
        aria-selected={mode === 'all'}
        className={`${base} ${mode === 'all' ? selected : idle}`}
      >
        <LayoutGrid className="w-4 h-4" aria-hidden="true" />
        All
      </Link>
      <Link
        href={productsHref}
        role="tab"
        aria-selected={mode === 'products'}
        className={`${base} ${mode === 'products' ? selected : idle}`}
      >
        <Package className="w-4 h-4" aria-hidden="true" />
        Products
      </Link>
      <Link
        href={servicesHref}
        role="tab"
        aria-selected={mode === 'services'}
        className={`${base} ${mode === 'services' ? selected : idle}`}
      >
        <Wrench className="w-4 h-4" aria-hidden="true" />
        Services
      </Link>
    </div>
  )
}

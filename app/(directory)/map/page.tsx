import type { Metadata } from 'next'
import dynamicImport from 'next/dynamic'
import { getSupabase } from '@/lib/supabase-server'
import { BUSINESS_CARD_COLUMNS } from '@/lib/business-select'
import { CITY_COORDS } from '@/lib/map-locations'
import { searchSellersWithProducts, type SellerWithProducts, resolveProductCategory } from '@/lib/products'
import DiscoveryModeSwitch from '@/components/discovery-mode-switch'
import type { Business } from '@/types'

const BusinessMap = dynamicImport(() => import('@/components/business-map'), { ssr: false })

export const metadata: Metadata = {
  title: 'Interactive Zimbabwe Business Map | WA Directory',
  description: 'Explore verified businesses across Harare, Bulawayo, and all Zimbabwe on an interactive map. Find shops, solar installers, plumbers, clinics & chat on WhatsApp.',
  alternates: { canonical: '/map' },
}

export const dynamic = 'force-dynamic'

// Coordinates come from the listing when present; otherwise the city centre
// with a deterministic offset. Never presented as a precise address.
function withCoordinates(rows: Record<string, unknown>[]): Business[] {
  return rows
    .map((b) => {
      let lat = typeof b.lat === 'number' ? b.lat : Number(b.lat)
      let lng = typeof b.lng === 'number' ? b.lng : Number(b.lng)

      if ((!lat || !lng || isNaN(lat) || isNaN(lng)) && b.city) {
        const cityKey = String(b.city).toLowerCase().trim()
        const coords = CITY_COORDS[cityKey]
        if (coords) {
          const hash = String(b.id || b.name)
            .split('')
            .reduce((acc, char) => acc + char.charCodeAt(0), 0)
          const offsetLat = ((hash % 100) / 100 - 0.5) * 0.03
          const offsetLng = (((hash * 17) % 100) / 100 - 0.5) * 0.03
          lat = coords[0] + offsetLat
          lng = coords[1] + offsetLng
        }
      }

      return {
        ...b,
        lat: typeof lat === 'number' && !isNaN(lat) ? lat : null,
        lng: typeof lng === 'number' && !isNaN(lng) ? lng : null,
      } as unknown as Business
    })
    .filter((b) => b.lat !== null && b.lng !== null)
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: { mode?: string }
}) {
  const mode = searchParams?.mode === 'products' ? 'products' : 'services'

  let businesses: Business[] = []

  if (mode === 'products') {
    // Products mode: one marker per SELLER, carrying its matching products.
    // Individual items are never treated as separate physical locations.
    // Pin icon/color uses the seller's primary product category (normalized to taxonomy).
    try {
      const sellers = await searchSellersWithProducts({ limit: 300 })
      const sellersWithCoords = withCoordinates(sellers as unknown as Record<string, unknown>[])

      // Attach primary product category for pin styling in Products mode
      // Normalize through resolveProductCategory to ensure it matches the taxonomy
      businesses = sellersWithCoords.map(seller => {
        const products = (seller as SellerWithProducts).products || []
        const firstProduct = products[0]
        const primaryProductCategory = firstProduct?.category || ''
        // Use product name as fallback for better category matching
        const fallbackText = firstProduct?.name || primaryProductCategory
        // Normalize against controlled taxonomy so map pins use correct icons
        // If no match found (returns ''), fall back to seller's first business category
        const normalizedCategory = resolveProductCategory(primaryProductCategory, fallbackText)
        const sellerBusinessCategory = (seller.category?.[0] || '')
        return {
          ...seller,
          productCategory: normalizedCategory || sellerBusinessCategory
        } as Business & { productCategory: string }
      })
    } catch (e) {
      console.error('Error fetching product sellers for map:', e)
    }
  } else {
    try {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('businesses')
        .select(BUSINESS_CARD_COLUMNS)
        .eq('verified', true)
        .eq('payment_status', 'active')
        .order('rating', { ascending: false })
        .limit(350)
      businesses = withCoordinates((data || []) as unknown as Record<string, unknown>[])
    } catch (e) {
      console.error('Error fetching businesses for map:', e)
    }
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] -mb-16 md:mb-0 w-full relative overflow-hidden bg-slate-900 flex flex-col">
      <div className="shrink-0 flex justify-center bg-slate-900/95 px-3 py-2 border-b border-white/10">
        <DiscoveryModeSwitch
          mode={mode}
          productsHref="/map?mode=products"
          servicesHref="/map"
        />
      </div>
      <div className="flex-1 relative overflow-hidden">
        <BusinessMap businesses={businesses} mode={mode} />
      </div>
    </div>
  )
}

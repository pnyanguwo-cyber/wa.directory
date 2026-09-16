import type { Metadata } from 'next'
import dynamicImport from 'next/dynamic'
import { getSupabase } from '@/lib/supabase-server'
import { BUSINESS_CARD_COLUMNS } from '@/lib/business-select'
import { CITY_COORDS } from '@/lib/map-locations'

const BusinessMap = dynamicImport(() => import('@/components/business-map'), { ssr: false })

export const metadata: Metadata = {
  title: 'Interactive Zimbabwe Business Map | WA Directory',
  description: 'Explore verified businesses across Harare, Bulawayo, and all Zimbabwe on an interactive map. Find shops, solar installers, plumbers, clinics & chat on WhatsApp.',
  alternates: { canonical: '/map' },
}

export const dynamic = 'force-dynamic'

export default async function MapPage() {
  let rawBusinesses: any[] = []
  try {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('businesses')
      .select(BUSINESS_CARD_COLUMNS)
      .eq('verified', true)
      .eq('payment_status', 'active')
      .order('rating', { ascending: false })
      .limit(350)
    rawBusinesses = data || []
  } catch (e) {
    console.error('Error fetching businesses for map:', e)
  }

  // Normalize coordinates: if lat/lng missing, infer from city
  const businesses = rawBusinesses
    .map((b) => {
      let lat = typeof b.lat === 'number' ? b.lat : Number(b.lat)
      let lng = typeof b.lng === 'number' ? b.lng : Number(b.lng)

      if ((!lat || !lng || isNaN(lat) || isNaN(lng)) && b.city) {
        const cityKey = b.city.toLowerCase().trim()
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
      }
    })
    .filter((b) => b.lat !== null && b.lng !== null)

  return (
    <div className="h-[calc(100dvh-3.5rem)] -mb-16 md:mb-0 w-full relative overflow-hidden bg-slate-900 flex flex-col">
      <BusinessMap businesses={businesses} />
    </div>
  )
}

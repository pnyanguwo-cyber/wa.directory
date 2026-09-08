import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { getSupabase } from '@/lib/supabase-server'

const BusinessMap = dynamic(() => import('@/components/business-map'), { ssr: false })

export const metadata: Metadata = {
  title: 'Business Map | WA Directory',
  description: 'Explore verified businesses across Zimbabwe on an interactive map. Find shops, services, and professionals near you.',
  alternates: { canonical: '/map' },
}

export const dynamic_page = 'force-dynamic'

export default async function MapPage() {
  const supabase = getSupabase()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, slug, category, phone, phone_type, rating, review_count, city, area, lat, lng, payment_status')
    .eq('verified', true)
    .eq('payment_status', 'active')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .order('rating', { ascending: false })
    .limit(200)

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Header bar */}
      <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-text-primary">Business Map</h1>
          <p className="text-[10px] text-text-secondary">
            {(businesses || []).length} verified businesses with locations
          </p>
        </div>
        <a
          href="/"
          className="text-[11px] font-semibold text-whatsapp-600 hover:text-whatsapp-700"
        >
          ← Back home
        </a>
      </div>
      {/* Map */}
      <div className="flex-1 relative">
        <BusinessMap businesses={(businesses || []) as any} />
      </div>
    </div>
  )
}

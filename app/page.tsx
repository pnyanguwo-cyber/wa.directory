import { getSupabase } from '@/lib/supabase-server'
import SearchBar from '@/components/search-bar'
import TrendingPills from '@/components/trending-pills'
import FeaturedBusinesses from '@/components/featured-businesses'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { data: featured } = await getSupabase()
    .from('businesses')
    .select('*')
    .eq('verified', true)
    .order('rating', { ascending: false })
    .limit(3)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Find any business on WhatsApp
        </h1>
        <p className="text-gray-500 text-lg mb-6">
          AI finds shops, services, prices instantly
        </p>
        <div className="max-w-xl mx-auto">
          <SearchBar large />
        </div>
        <TrendingPills />
      </div>
      <FeaturedBusinesses businesses={featured || []} />
    </div>
  )
}

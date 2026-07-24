import { getSupabase } from '@/lib/supabase-server'
import SearchBar from '@/components/search-bar'
import FeaturedScroll from '@/components/featured-scroll'
import FeaturedBusinesses from '@/components/featured-businesses'
import Footer from '@/components/footer'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { data: scrollBusinesses } = await getSupabase()
    .from('businesses')
    .select('*')
    .eq('verified', true)
    .order('created_at', { ascending: false })
    .limit(12)

  const { data: featured } = await getSupabase()
    .from('businesses')
    .select('*')
    .eq('verified', true)
    .order('rating', { ascending: false })
    .limit(3)

  const { count } = await getSupabase()
    .from('businesses')
    .select('*', { count: 'exact', head: true })

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
            Find any business on WhatsApp
          </h1>
          <p className="text-text-secondary text-[16px] mb-6">
            AI finds shops, services, prices instantly
          </p>
          <div className="max-w-xl mx-auto">
            <SearchBar large />
          </div>
          {count !== null && (
            <p className="mt-4 text-sm text-text-secondary">
              <span className="font-semibold text-whatsapp-600">{count.toLocaleString()}</span> businesses listed
            </p>
          )}
          <FeaturedScroll businesses={scrollBusinesses || []} />
        </div>
        <FeaturedBusinesses businesses={featured || []} />
      </div>
      <Footer />
    </>
  )
}

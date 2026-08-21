import { getSupabase } from '@/lib/supabase-server'
import { BUSINESS_CARD_COLUMNS } from '@/lib/business-select'
import SearchBar from '@/components/search-bar'
import FeaturedScroll from '@/components/featured-scroll'
import FeaturedBusinesses from '@/components/featured-businesses'
import ShowMoreSection from '@/components/show-more-section'
import TypingHeadline from '@/components/typing-headline'
import Link from 'next/link'

export const revalidate = 300

const CATEGORY_CHIPS = ['Plumbing', 'Solar & Power', 'Catering', 'Auto Repairs', 'Salons & Spas', 'Tech & Phones']
const ALL_BUSINESSES_INITIAL = 24

export default async function HomePage() {
  const supabase = getSupabase()

  const { data: scrollBusinesses } = await supabase
    .from('businesses')
    .select(BUSINESS_CARD_COLUMNS)
    .eq('verified', true)
    .order('created_at', { ascending: false })
    .limit(12)

  const { data: topRated } = await supabase
    .from('businesses')
    .select(BUSINESS_CARD_COLUMNS)
    .eq('verified', true)
    .order('rating', { ascending: false })
    .limit(ALL_BUSINESSES_INITIAL + 3)

  const { count } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true })

  const featured = (topRated || []).slice(0, 3)
  const allVerified = (topRated || []).slice(3)

  return (
    <>
      <main className="min-h-[calc(100vh-3.5rem)]">
        {/* Glass Mesh Hero */}
        <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-whatsapp-100/70 via-surface to-surface py-10 sm:py-16 min-h-[480px] sm:min-h-[600px] border-b border-gray-200/50">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-64 bg-[radial-gradient(circle_at_center,_rgba(37,211,102,0.12)_0%,_transparent_70%)] pointer-events-none" />

          <img
            src="/wad1.webp"
            alt=""
            aria-hidden="true"
            decoding="async"
            className="absolute left-0 top-0 h-full w-[58%] object-contain object-left pointer-events-none select-none hidden sm:block"
          />
          <img
            src="/wad2.webp"
            alt=""
            aria-hidden="true"
            decoding="async"
            className="absolute right-0 top-0 h-full w-[58%] object-contain object-right pointer-events-none select-none hidden sm:block"
          />
          
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-whatsapp-200/80 text-whatsapp-800 text-sm font-semibold mb-3 shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-whatsapp-500 animate-pulse" aria-hidden="true" />
              <span>AI-Powered Business Directory</span>
            </div>

            <TypingHeadline />

            <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto mb-4 leading-relaxed font-normal">
              Instant AI search for verified local shops, trusted services, and real-time catalog prices in your city.
            </p>

            <div className="max-w-2xl mx-auto relative z-10">
              <SearchBar large />
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3.5 max-w-2xl mx-auto">
              <span className="text-xs text-text-secondary font-medium mr-1">Popular:</span>
              {CATEGORY_CHIPS.map((cat, i) => (
                <Link
                  key={i}
                  href={`/search?q=${encodeURIComponent(cat)}`}
                  className="chip text-sm hover:border-whatsapp-300 hover:scale-[1.03] transition-all"
                >
                  {cat}
                </Link>
              ))}
            </div>

            {count !== null && (
              <p className="mt-3 text-sm text-text-secondary flex items-center justify-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-whatsapp-500" aria-hidden="true" />
                <span>Over <strong className="font-semibold text-whatsapp-800">{count.toLocaleString()}</strong> verified businesses ready to chat</span>
              </p>
            )}
          </div>
        </section>

        {/* Content Container */}
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-5 sm:p-8 space-y-6">
            <section aria-label="Recent listings">
              <FeaturedScroll businesses={scrollBusinesses || []} />
            </section>

            <FeaturedBusinesses businesses={featured || []} />

            <ShowMoreSection businesses={allVerified || []} />
          </div>
        </div>
      </main>
    </>
  )
}

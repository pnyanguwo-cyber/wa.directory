import { getSupabase } from '@/lib/supabase-server'
import { BUSINESS_CARD_COLUMNS } from '@/lib/business-select'
import SearchBar from '@/components/search-bar'
import FeaturedScroll from '@/components/featured-scroll'
import FeaturedBusinesses from '@/components/featured-businesses'
import ShowMoreSection from '@/components/show-more-section'
import TypingHeadline from '@/components/typing-headline'
import Icon from '@/components/icon'
import CountUp from '@/components/count-up'
import CategoryChips from '@/components/category-chips'
import ExploreCategories from '@/components/explore-categories'
import FaqSection from '@/components/faq-section'
import Link from 'next/link'
import Image from 'next/image'

export const revalidate = 300

const QUICK_CATEGORIES = [
  { name: 'Plumbing', icon: 'wrench', query: 'Plumber' },
  { name: 'Solar & Inverters', icon: 'sun', query: 'Solar' },
  { name: 'Catering & Food', icon: 'chefHat', query: 'Food' },
  { name: 'Auto Repairs', icon: 'car', query: 'Automotive' },
  { name: 'Hair & Beauty', icon: 'scissors', query: 'Hair' },
  { name: 'Tech & Phones', icon: 'smartphone', query: 'Electronics' },
  { name: 'Electricians', icon: 'zap', query: 'Electrician' },
  { name: 'Building & Hardware', icon: 'hammer', query: 'Building Materials' },
]

const EXPLORE_CATEGORIES = [
  { name: 'Solar & Power Systems', icon: 'sun', query: 'Solar', desc: 'Inverters, lithium batteries, panels & installation' },
  { name: 'Plumbers & Boreholes', icon: 'wrench', query: 'Plumber', desc: 'Pumps, water tanks, pipe leaks & drain clearing' },
  { name: 'Auto Mechanics & Spares', icon: 'car', query: 'Automotive', desc: 'Car service, engines, panel beating & tyres' },
  { name: 'Salons, Barbers & Spas', icon: 'scissors', query: 'Hair & Beauty', desc: 'Hair braiding, fades, nail art & skincare' },
  { name: 'Catering & Event Decor', icon: 'chefHat', query: 'Food & Restaurant', desc: 'Platters, cakes, event setups & meal delivery' },
  { name: 'Phones, Laptops & IT', icon: 'smartphone', query: 'Electronics', desc: 'Screen repair, accessories, laptops & software' },
  { name: 'Building & Hardware', icon: 'hammer', query: 'Building Materials', desc: 'Cement, bricks, roofing sheets, timber & paint' },
  { name: 'Health, Clinics & Chemist', icon: 'heartPulse', query: 'Health & Medical', desc: 'Pharmacies, doctors, dental & wellness' },
]

const ALL_BUSINESSES_INITIAL = 24

export default async function HomePage() {
  const supabase = getSupabase()

  const [{ data: scrollBusinesses }, { data: topRated }, { count }] = await Promise.all([
    supabase
      .from('businesses')
      .select(BUSINESS_CARD_COLUMNS)
      .eq('verified', true)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('businesses')
      .select(BUSINESS_CARD_COLUMNS)
      .eq('verified', true)
      .eq('featured_eligible', true)
      .order('rating', { ascending: false })
      .limit(ALL_BUSINESSES_INITIAL + 3),
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true),
  ])

  const featured = (topRated || []).slice(0, 3)
  const allVerified = (topRated || []).slice(3)

  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      {/* High-Converting Glass Mesh Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-whatsapp-500/10 via-surface/40 to-transparent dark:from-whatsapp-900/20 dark:via-gray-900/30 dark:to-transparent pt-8 pb-12 sm:pt-14 sm:pb-16 border-b border-gray-200/50 dark:border-gray-800">
        {/* Left Flank Image: wad1 fading seamlessly into white/background towards the middle */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-[20%] sm:w-[35%] md:w-[40%] lg:w-[45%] max-w-[520px] h-full pointer-events-none select-none z-0 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0.7) 80%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0.7) 80%, rgba(0,0,0,0) 100%)',
          }}
        >
          <Image
            src="/wad1.webp"
            alt=""
            fill
            sizes="(max-width: 640px) 20vw, 45vw"
            className="object-cover object-left"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/60 dark:to-gray-900/80" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/70 dark:from-gray-900/30 dark:to-gray-900/70" />
        </div>

        {/* Right Flank Image: wad2 fading seamlessly into white/background towards the middle */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 bottom-0 w-[20%] sm:w-[35%] md:w-[40%] lg:w-[45%] max-w-[520px] h-full pointer-events-none select-none z-0 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0.7) 80%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 55%, rgba(0,0,0,0.7) 80%, rgba(0,0,0,0) 100%)',
          }}
        >
          <Image
            src="/wad2.webp"
            alt=""
            fill
            sizes="(max-width: 640px) 20vw, 45vw"
            className="object-cover object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-white/60 dark:to-gray-900/80" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/70 dark:from-gray-900/30 dark:to-gray-900/70" />
        </div>

        {/* Soft Ambient Glows */}
        <div
          aria-hidden="true"
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[400px] bg-whatsapp-400/20 dark:bg-whatsapp-500/15 rounded-full blur-3xl pointer-events-none -z-10"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/2 -left-20 w-72 h-72 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none -z-10"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/3 -right-20 w-72 h-72 bg-whatsapp-300/15 rounded-full blur-3xl pointer-events-none -z-10"
        />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          {/* Typing Headline */}
          <TypingHeadline />

          {/* Subtitle */}
          <p className="text-text-primary dark:text-gray-100 text-sm sm:text-lg max-w-2xl mx-auto mb-4 sm:mb-6 leading-relaxed font-medium">
            Find verified local shops, trusted service providers, and real-time catalog prices in Harare, Bulawayo, and across Zimbabwe. Connect directly on WhatsApp with zero hassle.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative z-20 mb-4">
            <SearchBar large />
          </div>

          {/* Popular Category Chips */}
          <CategoryChips categories={QUICK_CATEGORIES} />

          {/* Live Verified Stats */}
          <div className="mt-4 pt-4 sm:mt-6 sm:pt-5 border-t border-gray-200/60 dark:border-gray-800/80 flex flex-wrap items-center justify-center">
            {count !== null && (
              <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-text-secondary dark:text-gray-300">
                <span className="w-2 h-2 rounded-full bg-whatsapp-500" aria-hidden="true" />
                <span>Over <strong className="font-bold text-whatsapp-700 dark:text-whatsapp-400"><CountUp target={count} />+</strong> verified businesses listed</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* Recently Added Marquee Strip */}
        {scrollBusinesses && scrollBusinesses.length > 0 && (
          <section aria-label="Recent listings" className="bg-gradient-to-br from-white/90 via-white/85 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-gray-800 shadow-soft-lift p-4 sm:p-6">
            <FeaturedScroll businesses={scrollBusinesses} />
          </section>
        )}

        {/* Featured Verified Businesses */}
        <section aria-label="Featured businesses" className="bg-gradient-to-br from-white/90 via-white/85 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-gray-800 shadow-soft-lift p-5 sm:p-8">
          <FeaturedBusinesses businesses={featured || []} />
        </section>

        {/* How WA Directory Works (3 Step Value Proposition) */}
        <section aria-labelledby="how-it-works-heading" className="bg-gradient-to-br from-white/90 via-white/85 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-gray-800 shadow-soft-lift p-6 sm:p-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-whatsapp-100/70 dark:bg-whatsapp-900/40 text-whatsapp-800 dark:text-gray-100 text-xs font-bold uppercase tracking-wider mb-2">
              Simple & Fast
            </div>
            <h2 id="how-it-works-heading" className="text-2xl sm:text-3xl font-extrabold text-text-primary dark:text-gray-100 tracking-tight">
              How WA Directory Works
            </h2>
            <p className="text-text-secondary dark:text-gray-400 text-sm sm:text-base mt-1.5">
              Connect with reliable local Zimbabwean vendors in seconds with zero app installation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-5 sm:p-6 rounded-2xl border border-gray-200/70 dark:border-gray-800 flex flex-col items-start relative overflow-hidden group hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-2xl bg-whatsapp-100 dark:bg-whatsapp-900/50 text-whatsapp-700 dark:text-gray-100 flex items-center justify-center mb-4 shadow-sm">
                <Icon name="search" className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-whatsapp-600 dark:text-whatsapp-400 tracking-wider uppercase mb-1">Step 1</span>
              <h3 className="text-lg font-bold text-text-primary dark:text-gray-100 mb-2">
                1. Search or Ask AI
              </h3>
              <p className="text-text-secondary dark:text-gray-400 text-sm leading-relaxed">
                Type what you need in plain English or Shona (e.g. &ldquo;solar installer in Avondale&rdquo; or &ldquo;plumber Bulawayo&rdquo;). Our smart AI searches verified local listings.
              </p>
            </div>

            <div className="card p-5 sm:p-6 rounded-2xl border border-gray-200/70 dark:border-gray-800 flex flex-col items-start relative overflow-hidden group hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-2xl bg-whatsapp-100 dark:bg-whatsapp-900/50 text-whatsapp-700 dark:text-gray-100 flex items-center justify-center mb-4 shadow-sm">
                <Icon name="messageSquare" className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-whatsapp-600 dark:text-whatsapp-400 tracking-wider uppercase mb-1">Step 2</span>
              <h3 className="text-lg font-bold text-text-primary dark:text-gray-100 mb-2">
                2. Chat on WhatsApp
              </h3>
              <p className="text-text-secondary dark:text-gray-400 text-sm leading-relaxed">
                Tap &ldquo;Chat on WhatsApp&rdquo; to open an instant conversation with the verified owner. Ask questions, request quotes, or browse their official WhatsApp catalog.
              </p>
            </div>

            <div className="card p-5 sm:p-6 rounded-2xl border border-gray-200/70 dark:border-gray-800 flex flex-col items-start relative overflow-hidden group hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-2xl bg-whatsapp-100 dark:bg-whatsapp-900/50 text-whatsapp-700 dark:text-gray-100 flex items-center justify-center mb-4 shadow-sm">
                <Icon name="handshake" className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-whatsapp-600 dark:text-whatsapp-400 tracking-wider uppercase mb-1">Step 3</span>
              <h3 className="text-lg font-bold text-text-primary dark:text-gray-100 mb-2">
                3. Buy with Confidence
              </h3>
              <p className="text-text-secondary dark:text-gray-400 text-sm leading-relaxed">
                Review verified badges, real customer star ratings, and exact business locations to deal safely with trusted Zimbabwean entrepreneurs.
              </p>
            </div>
          </div>
        </section>

        {/* Explore Popular Zimbabwean Categories */}
        <section aria-labelledby="categories-grid-heading" className="bg-gradient-to-br from-white/90 via-white/85 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-gray-800 shadow-soft-lift p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-whatsapp-100/80 dark:bg-whatsapp-900/40 text-whatsapp-800 dark:text-gray-100 text-xs font-bold mb-1">
                Taxonomy
              </div>
              <h2 id="categories-grid-heading" className="text-2xl sm:text-3xl font-extrabold text-text-primary dark:text-gray-100 tracking-tight">
                Explore Top Categories
              </h2>
              <p className="text-text-secondary dark:text-gray-400 text-sm sm:text-base mt-0.5">
                Browse businesses by specialty in Harare, Bulawayo, Mutare, and more
              </p>
            </div>
            <Link
              href="/search"
              className="text-xs sm:text-sm font-bold text-whatsapp-700 dark:text-whatsapp-400 hover:text-whatsapp-800 flex items-center gap-1 shrink-0 group"
            >
              <span>View All Categories</span>
              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          <ExploreCategories categories={EXPLORE_CATEGORIES} />
        </section>

        {/* FAQ */}
        <FaqSection />

        {/* All Verified Businesses Grid */}
        <section aria-label="All verified businesses" className="bg-gradient-to-br from-white/90 via-white/85 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/80 dark:border-gray-800 shadow-soft-lift p-5 sm:p-8">
          <ShowMoreSection businesses={allVerified || []} />
        </section>

        {/* Business Owner High-Converting CTA Banner */}
        <section aria-labelledby="business-cta-heading" className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-whatsapp-700 via-whatsapp-600 to-whatsapp-500 text-white p-6 sm:p-10 shadow-lg">
          <div
            aria-hidden="true"
            className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute -left-16 -top-16 w-64 h-64 bg-black/10 rounded-full blur-2xl pointer-events-none"
          />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-sm">
              For Zimbabwean Business Owners
            </div>
            <h2 id="business-cta-heading" className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
              List Your Business Free & Get Direct WhatsApp Customers
            </h2>
            <p className="text-whatsapp-50 text-sm sm:text-base leading-relaxed mb-6 max-w-2xl">
              Get discovered by thousands of buyers across Zimbabwe. Get your verified listing, printable QR code cards, customer ratings, and owner portal with visitor analytics.
            </p>

            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                href="/list"
                className="h-12 px-6 bg-white hover:bg-whatsapp-50 text-whatsapp-800 text-sm sm:text-base font-bold rounded-2xl shadow-md hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
              >
                <span>List Your Business Free</span>
                <svg className="w-4 h-4 text-whatsapp-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="h-12 px-5 bg-whatsapp-800/60 hover:bg-whatsapp-800/80 text-white border border-white/30 text-sm sm:text-base font-semibold rounded-2xl backdrop-blur-md active:scale-95 transition-all duration-200 flex items-center gap-2"
              >
                <span>Owner Portal Login</span>
                <svg className="w-4 h-4 text-whatsapp-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}


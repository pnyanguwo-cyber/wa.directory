import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { getSupabase } from '@/lib/supabase-server'
import { categories } from '@/data/categories'
import { CATEGORY_IMAGES } from '@/data/category-images'
import { LUCIDE_DOODLES } from '@/lib/category-style'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'All Categories | WA Directory',
  description: 'Browse all business categories on WA Directory. Find verified shops, service providers, and professionals across Zimbabwe.',
  alternates: { canonical: '/categories' },
}

export default async function CategoriesPage() {
  const { data } = await getSupabase()
    .from('businesses')
    .select('category')
    .eq('verified', true)
    .eq('payment_status', 'active')

  // Count businesses per category
  const counts: Record<string, number> = {}
  for (const b of data || []) {
    for (const cat of b.category || []) {
      counts[cat] = (counts[cat] || 0) + 1
    }
  }

  // Build category list with counts, sorted by count descending (most populated first)
  const cats = categories
    .filter(c => c.name !== 'Other')
    .map(c => ({
      name: c.name,
      icon: c.icon,
      count: counts[c.name] || 0,
      lucideIcon: LUCIDE_DOODLES[c.name] || null,
    }))
    .sort((a, b) => b.count - a.count)

  const totalBusinesses = data?.length || 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <section className="rounded-3xl border border-white/70 dark:border-gray-800 shadow-soft-lift bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl p-6 sm:p-8 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
          All Categories
        </h1>
        <p className="text-text-secondary text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
          Browse {cats.length} business categories across Zimbabwe. Find verified shops, service providers, and professionals.
        </p>
        <p className="text-xs text-text-secondary/80 mt-3">
          {totalBusinesses} verified businesses listed
        </p>
      </section>

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {cats.map(cat => {
          const coverImage = CATEGORY_IMAGES[cat.name]
          const LucideIcon = cat.lucideIcon

          return (
            <Link
              key={cat.name}
              href={`/search?q=${encodeURIComponent(cat.name)}`}
              className="card relative overflow-hidden p-4 sm:p-5 rounded-2xl border border-gray-200/70 dark:border-gray-800 hover:border-whatsapp-300 dark:hover:border-whatsapp-600 hover:-translate-y-1 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between min-h-[160px] sm:min-h-[180px]"
            >
              {coverImage && (
                <div className="absolute inset-0 z-0">
                  <Image
                    src={coverImage}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover opacity-10 dark:opacity-15 group-hover:opacity-20 transition-opacity"
                  />
                </div>
              )}
              <div className="relative z-10">
                {LucideIcon ? (
                  <LucideIcon className="w-5 h-5 sm:w-6 sm:h-6 mb-2 text-whatsapp-600 dark:text-whatsapp-400" />
                ) : (
                  <span className="text-xl mb-2 block" aria-hidden="true">{cat.icon}</span>
                )}
                <h3 className="font-bold text-text-primary dark:text-gray-100 text-sm sm:text-base group-hover:text-whatsapp-700 dark:group-hover:text-whatsapp-400 transition-colors">
                  {cat.name}
                </h3>
              </div>
              <div className="relative z-10 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] sm:text-xs font-semibold text-whatsapp-700 dark:text-whatsapp-400">
                <span>{cat.count} listing{cat.count !== 1 ? 's' : ''}</span>
                <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

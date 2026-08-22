'use client'

import Link from 'next/link'
import Icon from '@/components/icon'

interface ExploreCategory {
  name: string
  icon: string
  query: string
  desc: string
}

export default function ExploreCategories({ categories }: { categories: ExploreCategory[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {categories.map((cat, idx) => (
        <Link
          key={idx}
          href={`/search?q=${encodeURIComponent(cat.query)}`}
          className="card p-3 sm:p-4 rounded-2xl border border-gray-200/70 dark:border-gray-800 hover:border-whatsapp-300 dark:hover:border-whatsapp-600 hover:-translate-y-1 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
        >
          <div>
            <Icon name={cat.icon} className="w-5 h-5 sm:w-6 sm:h-6 mb-1.5 sm:mb-2" />
            <h3 className="font-bold text-text-primary dark:text-gray-100 text-sm sm:text-base group-hover:text-whatsapp-700 dark:group-hover:text-whatsapp-400 transition-colors">
              {cat.name}
            </h3>
            <p className="text-text-secondary dark:text-gray-400 text-xs mt-1 leading-relaxed">
              {cat.desc}
            </p>
          </div>
          <div className="mt-2 pt-2 sm:mt-3 sm:pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] sm:text-xs font-semibold text-whatsapp-700 dark:text-whatsapp-400">
            <span>Browse Listings</span>
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </div>
        </Link>
      ))}
    </div>
  )
}

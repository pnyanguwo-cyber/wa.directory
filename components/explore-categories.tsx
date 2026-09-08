'use client'

import Link from 'next/link'
import Image from 'next/image'
import Icon from '@/components/icon'
import { getCategoryImage } from '@/data/category-images'

interface ExploreCategory {
  name: string
  icon: string
  query: string
  desc: string
}

export default function ExploreCategories({ categories }: { categories: ExploreCategory[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {categories.map((cat, idx) => {
        const coverImage = getCategoryImage([cat.name])
        return (
          <Link
            key={idx}
            href={`/search?q=${encodeURIComponent(cat.query)}`}
            className="card relative overflow-hidden p-3 sm:p-4 rounded-2xl border border-gray-200/70 dark:border-gray-800 hover:border-whatsapp-300 dark:hover:border-whatsapp-600 hover:-translate-y-1 hover:shadow-card-hover transition-all duration-200 group flex flex-col justify-between"
          >
            {coverImage && (
              <div className="absolute inset-0 z-0">
                <Image
                  src={coverImage}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover opacity-10 dark:opacity-15 group-hover:opacity-20 transition-opacity"
                />
              </div>
            )}
            <div className="relative z-10">
              <Icon name={cat.icon} className="w-5 h-5 sm:w-6 sm:h-6 mb-1.5 sm:mb-2" />
              <h3 className="font-bold text-text-primary dark:text-gray-100 text-sm sm:text-base group-hover:text-whatsapp-700 dark:group-hover:text-whatsapp-400 transition-colors">
                {cat.name}
              </h3>
              <p className="text-text-secondary dark:text-gray-400 text-xs mt-1 leading-relaxed">
                {cat.desc}
              </p>
            </div>
            <div className="relative z-10 mt-2 pt-2 sm:mt-3 sm:pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] sm:text-xs font-semibold text-whatsapp-700 dark:text-whatsapp-400">
              <span>Browse Listings</span>
              <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

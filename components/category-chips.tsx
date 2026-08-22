'use client'

import Link from 'next/link'
import Icon from '@/components/icon'

interface Category {
  name: string
  icon: string
  query: string
}

export default function CategoryChips({ categories }: { categories: Category[] }) {
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap max-w-3xl mx-auto">
      <span className="text-xs text-text-secondary dark:text-gray-400 font-semibold mr-0.5">Popular:</span>
      {categories.map((cat, i) => (
        <Link
          key={i}
          href={`/search?q=${encodeURIComponent(cat.query)}`}
          className="chip text-xs sm:text-sm flex items-center gap-1.5 hover:border-whatsapp-400 hover:scale-[1.03] transition-all dark:border-gray-700 dark:hover:border-whatsapp-500"
        >
          <Icon name={cat.icon} className="w-4 h-4" />
          <span>{cat.name}</span>
        </Link>
      ))}
    </div>
  )
}

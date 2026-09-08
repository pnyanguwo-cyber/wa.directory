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
    <div className="relative max-w-3xl mx-auto">
      {/* Mobile: horizontal scroll row */}
      <div className="flex sm:hidden items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
        {categories.map((cat, i) => (
          <Link
            key={i}
            href={`/search?q=${encodeURIComponent(cat.query)}`}
            className="chip text-xs flex items-center gap-1.5 hover:border-whatsapp-400 hover:scale-[1.03] transition-all dark:border-gray-700 dark:hover:border-whatsapp-500 shrink-0 snap-start"
          >
            <Icon name={cat.icon} className="w-3.5 h-3.5" />
            <span>{cat.name}</span>
          </Link>
        ))}
      </div>
      {/* Desktop: centered wrap */}
      <div className="hidden sm:flex items-center justify-center gap-2 flex-wrap">
        <span className="text-xs text-text-secondary dark:text-gray-400 font-semibold mr-0.5">Popular:</span>
        {categories.map((cat, i) => (
          <Link
            key={i}
            href={`/search?q=${encodeURIComponent(cat.query)}`}
            className="chip text-sm flex items-center gap-1.5 hover:border-whatsapp-400 hover:scale-[1.03] transition-all dark:border-gray-700 dark:hover:border-whatsapp-500"
          >
            <Icon name={cat.icon} className="w-4 h-4" />
            <span>{cat.name}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

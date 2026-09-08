'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Siren, Landmark, ArrowLeft, MapPin, type LucideProps } from 'lucide-react'
import { CATEGORY_IMAGES } from '@/data/category-images'
import BusinessCard from '@/components/business-card'
import type { Business } from '@/types'

interface YellowPagesCategory {
  name: string
  icon: React.ComponentType<LucideProps>
  description: string
  query: string
}

const YP_CATEGORIES: YellowPagesCategory[] = [
  {
    name: 'Emergency Services',
    icon: Siren,
    description: 'Police, fire brigade, ambulance, emergency response and hotlines',
    query: 'emergency',
  },
  {
    name: 'Government Services',
    icon: Landmark,
    description: 'Councils, municipalities, registrar, passport office, ZIMRA and public offices',
    query: 'government',
  },
]

export default function YellowPagesGrid({ businesses }: { businesses: Business[] }) {
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = selected
    ? businesses.filter(b => (b.category || []).includes(selected))
    : []

  // Group filtered businesses by city
  const cityMap = new Map<string, Business[]>()
  for (const b of filtered) {
    const city = b.city || 'Nationwide'
    if (!cityMap.has(city)) cityMap.set(city, [])
    cityMap.get(city)!.push(b)
  }
  const cities = Array.from(cityMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  const selectedCat = YP_CATEGORIES.find(c => c.name === selected)

  return (
    <div className="space-y-6">
      {/* Category grid — always visible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {YP_CATEGORIES.map(cat => {
          const count = businesses.filter(b => (b.category || []).includes(cat.name)).length
          const coverImage = CATEGORY_IMAGES[cat.name]
          const Icon = cat.icon
          const isActive = selected === cat.name

          return (
            <button
              key={cat.name}
              onClick={() => setSelected(isActive ? null : cat.name)}
              className={`card relative overflow-hidden p-5 sm:p-6 rounded-2xl border text-left transition-all duration-200 group ${
                isActive
                  ? 'border-amber-400 dark:border-amber-500/60 shadow-card-hover ring-2 ring-amber-200 dark:ring-amber-500/30'
                  : 'border-gray-200/70 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-600 hover:-translate-y-1 hover:shadow-card-hover'
              }`}
            >
              {coverImage && (
                <div className="absolute inset-0 z-0">
                  <Image
                    src={coverImage}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover opacity-10 dark:opacity-15 group-hover:opacity-20 transition-opacity"
                  />
                </div>
              )}
              <div className="relative z-10">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 ${
                  isActive
                    ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50'
                } transition-colors`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-bold text-text-primary dark:text-gray-100 text-base sm:text-lg group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-text-secondary dark:text-gray-400 text-xs sm:text-sm mt-1 leading-relaxed">
                  {cat.description}
                </p>
              </div>
              <div className="relative z-10 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
                <span>{count} listing{count !== 1 ? 's' : ''}</span>
                <span className={`transition-transform ${isActive ? 'rotate-90' : 'group-hover:translate-x-1'}`}>
                  &rarr;
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filtered business list */}
      {selected && selectedCat && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              All Categories
            </button>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
              <selectedCat.icon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              {selectedCat.name}
            </h2>
            <p className="text-text-secondary text-xs sm:text-sm mt-1">
              {filtered.length} listing{filtered.length !== 1 ? 's' : ''} across {cities.length} location{cities.length !== 1 ? 's' : ''}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="neo-card p-8 text-center">
              <p className="text-3xl mb-3" aria-hidden="true">📋</p>
              <h3 className="text-lg font-bold text-text-primary">No listings yet</h3>
              <p className="text-sm text-text-secondary mt-2">
                {selectedCat.name} listings will appear here as they are added and verified.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {cities.map(([city, list]) => (
                <div key={city}>
                  <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    {city === 'Nationwide' ? (
                      <span>
                        Nationwide <span className="font-normal text-text-secondary text-xs">serves the whole country</span>
                      </span>
                    ) : (
                      <span>
                        {city} <span className="font-normal text-text-secondary text-xs">({list.length})</span>
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {list.map(b => (
                      <BusinessCard key={b.id} business={b} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

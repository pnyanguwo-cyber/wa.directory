'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import Link from 'next/link'
import L from 'leaflet'
import { categories } from '@/data/categories'
import type { Business } from '@/types'
import 'leaflet/dist/leaflet.css'

const WA_MSG = 'Hi%2C%20I%20found%20you%20on%20WA%20Directory'

function getCategoryEmoji(businessCategories: string[]): string {
  for (const catName of businessCategories) {
    const found = categories.find(c => c.name === catName)
    if (found) return found.icon
  }
  return '📍'
}

function createEmojiIcon(emoji: string) {
  return L.divIcon({
    className: '',
    html: `<div style="font-size:22px;line-height:1;text-align:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

const ZIMBABWE_CENTER: [number, number] = [-19.015, 29.155]

function FlyToBusiness({ business }: { business: Business | null }) {
  const map = useMap()
  useEffect(() => {
    if (business?.lat && business?.lng) {
      map.flyTo([business.lat, business.lng], 14, { duration: 1.2 })
    }
  }, [business, map])
  return null
}

interface Props {
  businesses: Business[]
}

export default function BusinessMap({ businesses }: Props) {
  const [selected, setSelected] = useState<Business | null>(null)
  const [showList, setShowList] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="w-5 h-5 border-2 border-whatsapp-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading map...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={ZIMBABWE_CENTER}
        zoom={10}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToBusiness business={selected} />
        {businesses.map(b => {
          if (!b.lat || !b.lng) return null
          const emoji = getCategoryEmoji(b.category || [])
          return (
            <Marker
              key={b.id}
              position={[b.lat, b.lng]}
              icon={createEmojiIcon(emoji)}
              eventHandlers={{ click: () => setSelected(b) }}
            />
          )
        })}
        {selected && selected.lat && selected.lng && (
          <Popup position={[selected.lat, selected.lng]} maxWidth={240}>
            <div className="p-0.5">
              <Link
                href={`/business/${selected.slug || selected.id}`}
                className="block"
              >
                <p className="font-bold text-sm text-gray-900 hover:text-emerald-700 line-clamp-1 m-0">{selected.name}</p>
              </Link>
              <p className="text-[11px] text-gray-500 mt-0.5 m-0">
                {(selected.category || []).slice(0, 2).join(' · ')}
              </p>
              {selected.rating > 0 && (
                <p className="text-[11px] text-gray-500 mt-0.5 m-0">
                  ⭐ {selected.rating.toFixed(1)} ({selected.review_count} reviews)
                </p>
              )}
              <div className="flex gap-1.5 mt-2">
                {selected.phone && (
                  <a
                    href={`https://wa.me/${(selected.phone || '').replace(/[^0-9]/g, '')}?text=${WA_MSG}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-1 rounded-full hover:bg-emerald-700 no-underline"
                  >
                    WhatsApp
                  </a>
                )}
                <Link
                  href={`/business/${selected.slug || selected.id}`}
                  className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded-full hover:bg-gray-200 no-underline"
                >
                  Profile
                </Link>
              </div>
            </div>
          </Popup>
        )}
      </MapContainer>

      {/* Zoom controls — right side */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
        <button
          onClick={() => {
            const map = document.querySelector('.leaflet-container') as any
            if (map?._leaflet_map) map._leaflet_map.zoomIn()
          }}
          className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-lg font-bold text-text-primary hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
        >
          +
        </button>
        <button
          onClick={() => {
            const map = document.querySelector('.leaflet-container') as any
            if (map?._leaflet_map) map._leaflet_map.zoomOut()
          }}
          className="w-8 h-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-lg font-bold text-text-primary hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
        >
          −
        </button>
      </div>

      {/* List toggle button */}
      <button
        onClick={() => setShowList(!showList)}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-text-primary hover:shadow-xl transition-all active:scale-95"
      >
        {showList ? '🗺️ Map' : '📋 List'}
      </button>

      {/* Bottom sheet list */}
      {showList && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700 max-h-[50vh] overflow-y-auto">
          <div className="p-4 space-y-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
            <p className="text-xs font-bold text-text-secondary mb-2">{businesses.length} businesses on map</p>
            {businesses.map(b => (
              <button
                key={b.id}
                onClick={() => { setSelected(b); setShowList(false) }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <span className="text-xl shrink-0">{getCategoryEmoji(b.category || [])}</span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-text-primary truncate">{b.name}</p>
                  <p className="text-[10px] text-text-secondary truncate">
                    {(b.category || []).slice(0, 2).join(' · ')} · {b.city || 'Zimbabwe'}
                  </p>
                </div>
                {b.rating > 0 && (
                  <span className="text-[10px] text-amber-600 font-semibold shrink-0">⭐ {b.rating.toFixed(1)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

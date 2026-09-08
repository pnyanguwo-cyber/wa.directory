'use client'

import { useCallback, useRef, useState } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api'
import Link from 'next/link'
import { categories } from '@/data/categories'
import type { Business } from '@/types'

const WA_MSG = 'Hi%2C%20I%20found%20you%20on%20WA%20Directory'

function getCategoryEmoji(businessCategories: string[]): string {
  for (const catName of businessCategories) {
    const found = categories.find(c => c.name === catName)
    if (found) return found.icon
  }
  return '📍'
}

const ZIMBABWE_CENTER = { lat: -19.015, lng: 29.155 }
const mapContainerStyle = { width: '100%', height: '100%' }
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
}

interface Props {
  businesses: Business[]
}

export default function BusinessMap({ businesses }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  })

  const [selected, setSelected] = useState<Business | null>(null)
  const [showList, setShowList] = useState(false)
  const mapRef = useRef<google.maps.Map | null>(null)

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const panTo = useCallback((b: Business) => {
    if (mapRef.current && b.lat && b.lng) {
      mapRef.current.panTo({ lat: b.lat, lng: b.lng })
      mapRef.current.setZoom(15)
      setSelected(b)
    }
  }, [])

  if (!isLoaded) {
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
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={ZIMBABWE_CENTER}
        zoom={6}
        onLoad={onMapLoad}
        options={mapOptions}
      >
        {businesses.map(b => {
          if (!b.lat || !b.lng) return null
          const emoji = getCategoryEmoji(b.category || [])
          return (
            <MarkerF
              key={b.id}
              position={{ lat: b.lat, lng: b.lng }}
              label={{ text: emoji, fontSize: '18px' }}
              onClick={() => setSelected(b)}
            />
          )
        })}

        {selected && selected.lat && selected.lng && (
          <InfoWindowF
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div className="max-w-[220px] p-1">
              <Link
                href={`/business/${selected.slug || selected.id}`}
                className="block"
              >
                <p className="font-bold text-sm text-gray-900 hover:text-emerald-700 line-clamp-1">{selected.name}</p>
              </Link>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {(selected.category || []).slice(0, 2).join(' · ')}
              </p>
              {selected.rating > 0 && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  ⭐ {selected.rating.toFixed(1)} ({selected.review_count} reviews)
                </p>
              )}
              <div className="flex gap-1.5 mt-2">
                {selected.phone && (
                  <a
                    href={`https://wa.me/${(selected.phone || '').replace(/[^0-9]/g, '')}?text=${WA_MSG}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-1 rounded-full hover:bg-emerald-700"
                  >
                    WhatsApp
                  </a>
                )}
                <Link
                  href={`/business/${selected.slug || selected.id}`}
                  className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded-full hover:bg-gray-200"
                >
                  Profile
                </Link>
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {/* List toggle button */}
      <button
        onClick={() => setShowList(!showList)}
        className="absolute top-4 right-4 z-20 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-text-primary hover:shadow-xl transition-all active:scale-95"
      >
        {showList ? 'Map' : 'List'}
      </button>

      {/* Bottom sheet list */}
      {showList && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700 max-h-[50vh] overflow-y-auto">
          <div className="p-4 space-y-2">
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
            <p className="text-xs font-bold text-text-secondary mb-2">{businesses.length} businesses on map</p>
            {businesses.map(b => (
              <button
                key={b.id}
                onClick={() => { panTo(b); setShowList(false) }}
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

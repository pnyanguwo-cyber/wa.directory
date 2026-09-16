'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Search,
  MapPin,
  Crosshair,
  Navigation,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Share2,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  ExternalLink,
  Star,
  RefreshCw,
  Store,
  SlidersHorizontal,
  Home,
  ArrowLeft,
  ArrowUpRight,
  LocateFixed,
  List,
  Map as MapIcon,
  Filter,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

import { categories } from '@/data/categories'
import type { Business } from '@/types'
import {
  hasWhatsAppChannel,
  hasVoiceChannel,
  voiceNumber,
  whatsappHref,
  callHref,
  WA_MSG,
} from '@/components/contact'
import {
  ZIMBABWE_CENTER,
  ZIMBABWE_DEFAULT_ZOOM,
  MAJOR_ZIMBABWE_CITIES,
  MAP_TILE_LAYERS,
  calculateDistanceKm,
  formatDistance,
  type TileLayerId,
  type CityCenter,
} from '@/lib/map-locations'

// Category icon helper
function getCategoryEmoji(businessCategories: string[] = []): string {
  for (const catName of businessCategories) {
    const found = categories.find((c) => c.name.toLowerCase() === (catName || '').toLowerCase())
    if (found?.icon) return found.icon
  }
  return '🏢'
}

// Custom Leaflet DivIcon for Business Pin
function createBusinessMarkerIcon(
  emoji: string,
  isSelected: boolean,
  isHovered: boolean,
  isFeatured: boolean
) {
  const isHighlighted = isSelected || isHovered
  const bgGradient = isSelected
    ? 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)'
    : isHovered
    ? 'linear-gradient(135deg, #128C7E 0%, #25D366 100%)'
    : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)'

  const ringStyle = isSelected
    ? 'ring-4 ring-whatsapp-400 ring-offset-2 ring-offset-white scale-125 z-[1000]'
    : isHovered
    ? 'ring-2 ring-whatsapp-500 scale-110 z-[900]'
    : 'shadow-lg hover:scale-105'

  const pingEffect = isSelected
    ? '<span class="absolute -inset-1 rounded-2xl bg-whatsapp-400 opacity-60 animate-ping"></span>'
    : ''

  const starBadge = isFeatured
    ? `<span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 border border-white rounded-full flex items-center justify-center text-[9px] font-bold text-amber-950 shadow-sm">★</span>`
    : ''

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div class="relative flex flex-col items-center group cursor-pointer transition-all duration-200">
        ${pingEffect}
        <div class="relative w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border-2 border-white shadow-md transition-all duration-200 ${ringStyle}"
             style="background: ${bgGradient};">
          <span class="text-base sm:text-lg select-none leading-none pointer-events-none drop-shadow-sm">${emoji}</span>
          ${starBadge}
        </div>
        <div class="w-2.5 h-2.5 rotate-45 -mt-1.5 border-r border-b border-white/60 shadow-sm"
             style="background: ${isSelected ? '#075E54' : '#128C7E'};"></div>
      </div>
    `,
    iconSize: [40, 46],
    iconAnchor: [20, 44],
    popupAnchor: [0, -44],
  })
}

// Custom User GPS Pin
function createUserLocationMarkerIcon() {
  return L.divIcon({
    className: 'user-gps-pin',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-9 h-9 rounded-full bg-sky-400/40 animate-ping"></div>
        <div class="w-6 h-6 rounded-full bg-sky-500 border-2 border-white shadow-xl flex items-center justify-center ring-4 ring-sky-300/50">
          <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

// Controller to smoothly animate to coordinate targets
function MapController({
  target,
  bounds,
  zoom,
}: {
  target: [number, number] | null
  bounds: L.LatLngBoundsExpression | null
  zoom?: number
}) {
  const map = useMap()

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true, duration: 1 })
    } else if (target) {
      map.flyTo(target, zoom ?? 14, { duration: 1.2, easeLinearity: 0.25 })
    }
  }, [target, bounds, zoom, map])

  return null
}

// Event listener for user interaction with map (pan, zoom, click)
function MapEventsHandler({
  onBoundsChange,
  onMapClick,
}: {
  onBoundsChange: (bounds: L.LatLngBounds) => void
  onMapClick: () => void
}) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds())
    },
    zoomend: () => {
      onBoundsChange(map.getBounds())
    },
    click: (e) => {
      // If clicking empty map area, dismiss selected
      const target = e.originalEvent.target as HTMLElement
      if (target?.classList?.contains('leaflet-container')) {
        onMapClick()
      }
    },
  })

  useEffect(() => {
    onBoundsChange(map.getBounds())
  }, [map, onBoundsChange])

  return null
}

interface BusinessMapProps {
  businesses: Business[]
}

export default function BusinessMap({ businesses = [] }: BusinessMapProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Selection & Hover
  const [selected, setSelected] = useState<Business | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Map state
  const [targetCoord, setTargetCoord] = useState<[number, number] | null>(null)
  const [targetZoom, setTargetZoom] = useState<number | undefined>(undefined)
  const [fitBounds, setFitBounds] = useState<L.LatLngBoundsExpression | null>(null)
  const [activeTileId, setActiveTileId] = useState<TileLayerId>('voyager')
  const [showLayerMenu, setShowLayerMenu] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedCity, setSelectedCity] = useState<string>('All Zimbabwe')
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'reviews' | 'name'>('rating')

  // User Geolocation
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  // "Search This Area" & Viewport tracking
  const [currentBounds, setCurrentBounds] = useState<L.LatLngBounds | null>(null)
  const [isAreaFiltered, setIsAreaFiltered] = useState(false)
  const [showSearchAreaPill, setShowSearchAreaPill] = useState(false)
  const [isAreaFilteringLoading, setIsAreaFilteringLoading] = useState(false)

  // UI view modes
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map')
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [navigatingSlug, setNavigatingSlug] = useState<string | null>(null)

  // Trigger feedback toast helper
  const showToast = useCallback(
    (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      setToast({ message, type })
      setTimeout(() => {
        setToast((curr) => (curr?.message === message ? null : curr))
      }, 3500)
    },
    []
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // Categories with counts derived from actual businesses
  const categoryList = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of businesses) {
      for (const cat of b.category || []) {
        counts[cat] = (counts[cat] || 0) + 1
      }
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return [
      { name: 'All', icon: '🌟', count: businesses.length },
      ...sorted.map(([name, count]) => {
        const found = categories.find((c) => c.name.toLowerCase() === name.toLowerCase())
        return {
          name,
          icon: found?.icon || '🏢',
          count,
        }
      }),
    ]
  }, [businesses])

  // Filter and sort businesses
  const filteredBusinesses = useMemo(() => {
    return businesses
      .filter((b) => {
        if (!b.lat || !b.lng) return false

        // Search text matching
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const nameMatch = (b.name || '').toLowerCase().includes(q)
          const cityMatch = (b.city || '').toLowerCase().includes(q)
          const areaMatch = (b.area || '').toLowerCase().includes(q)
          const bioMatch = (b.bio || '').toLowerCase().includes(q)
          const catMatch = (b.category || []).some((c) => c.toLowerCase().includes(q))
          if (!nameMatch && !cityMatch && !areaMatch && !bioMatch && !catMatch) {
            return false
          }
        }

        // Category filter
        if (selectedCategory !== 'All') {
          const hasCat = (b.category || []).some(
            (c) => c.toLowerCase() === selectedCategory.toLowerCase()
          )
          if (!hasCat) return false
        }

        // City filter
        if (selectedCity !== 'All Zimbabwe') {
          const cityLower = selectedCity.toLowerCase()
          const bCity = (b.city || '').toLowerCase()
          const bArea = (b.area || '').toLowerCase()
          const bLoc = (b.location || '').toLowerCase()
          if (!bCity.includes(cityLower) && !bArea.includes(cityLower) && !bLoc.includes(cityLower)) {
            return false
          }
        }

        // Bounds filter (when user clicked "Search This Area")
        if (isAreaFiltered && currentBounds) {
          if (!currentBounds.contains([b.lat, b.lng])) {
            return false
          }
        }

        return true
      })
      .map((b) => {
        let distanceKm: number | null = null
        if (userCoords && b.lat && b.lng) {
          distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, b.lat, b.lng)
        }
        return { ...b, distanceKm }
      })
      .sort((a, b) => {
        if (sortBy === 'distance' && userCoords) {
          return (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999)
        }
        if (sortBy === 'reviews') {
          return (b.review_count || 0) - (a.review_count || 0)
        }
        if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '')
        }
        // Default: rating desc
        return (b.rating || 0) - (a.rating || 0)
      })
  }, [
    businesses,
    searchQuery,
    selectedCategory,
    selectedCity,
    isAreaFiltered,
    currentBounds,
    userCoords,
    sortBy,
  ])

  // Locate User via GPS
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error')
      return
    }

    setIsLocating(true)
    showToast('Acquiring your GPS location...', 'info')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setUserCoords(coords)
        setTargetCoord([coords.lat, coords.lng])
        setTargetZoom(14)
        setIsLocating(false)
        setSortBy('distance')
        showToast('📍 Located! Showing nearest verified businesses', 'success')
      },
      (error) => {
        setIsLocating(false)
        let errorMsg = 'Unable to retrieve your location'
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. You can still pick your city!'
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out. Please try again.'
        }
        showToast(errorMsg, 'error')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [showToast])

  // Fit All Bounds
  const handleFitAll = useCallback(() => {
    if (filteredBusinesses.length === 0) {
      setTargetCoord(ZIMBABWE_CENTER)
      setTargetZoom(ZIMBABWE_DEFAULT_ZOOM)
      return
    }

    const lats = filteredBusinesses.map((b) => b.lat!).filter(Boolean)
    const lngs = filteredBusinesses.map((b) => b.lng!).filter(Boolean)

    if (lats.length === 0) return

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    setFitBounds([
      [minLat, minLng],
      [maxLat, maxLng],
    ])
    setIsAreaFiltered(false)
    setShowSearchAreaPill(false)
    showToast(`Refocused view to ${filteredBusinesses.length} places`, 'info')
  }, [filteredBusinesses, showToast])

  // Switch City
  const handleSelectCity = useCallback(
    (cityName: string) => {
      setSelectedCity(cityName)
      setIsAreaFiltered(false)
      setShowSearchAreaPill(false)

      const foundCity = MAJOR_ZIMBABWE_CITIES.find((c) => c.name === cityName)
      if (foundCity) {
        setTargetCoord([foundCity.lat, foundCity.lng])
        setTargetZoom(foundCity.zoom)
        showToast(`Flying to ${cityName}`, 'info')
      } else {
        setTargetCoord(ZIMBABWE_CENTER)
        setTargetZoom(ZIMBABWE_DEFAULT_ZOOM)
      }
    },
    [showToast]
  )

  // Bounds change handler from MapEventsHandler
  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
    setCurrentBounds(bounds)
    setShowSearchAreaPill(true)
  }, [])

  // "Search this area" button click
  const handleSearchThisArea = useCallback(() => {
    setIsAreaFilteringLoading(true)
    setIsAreaFiltered(true)
    setShowSearchAreaPill(false)

    setTimeout(() => {
      setIsAreaFilteringLoading(false)
      showToast('Locked list to current map view', 'success')
    }, 300)
  }, [showToast])

  // Fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      mapContainerRef.current?.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }, [])

  // Share link
  const handleShareMap = useCallback(() => {
    const url = new URL(window.location.href)
    if (selected) {
      url.searchParams.set('b', selected.slug || selected.id)
    }
    if (selectedCity !== 'All Zimbabwe') {
      url.searchParams.set('city', selectedCity)
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url.toString())
      setCopiedLink(true)
      showToast('Map link copied to clipboard! 📋', 'success')
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }, [selected, selectedCity, showToast])

  // Select business pin
  const handleSelectBusiness = useCallback(
    (business: Business) => {
      setSelected(business)
      if (business.lat && business.lng) {
        setTargetCoord([business.lat, business.lng])
        setTargetZoom(15)
      }
    },
    []
  )

  // Active tile configuration
  const activeTile = useMemo(() => {
    return MAP_TILE_LAYERS.find((t) => t.id === activeTileId) || MAP_TILE_LAYERS[0]
  }, [activeTileId])

  if (!mounted) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="relative flex items-center justify-center mb-5">
          <div className="w-16 h-16 rounded-full border-4 border-whatsapp-500/20 border-t-whatsapp-500 animate-spin" />
          <Store className="w-6 h-6 text-whatsapp-400 absolute" />
        </div>
        <p className="text-base font-bold text-white tracking-wide">Loading Interactive Zimbabwe Map...</p>
        <p className="text-xs text-slate-400 mt-1">Preparing verified businesses and street layers</p>
      </div>
    )
  }

  return (
    <div
      ref={mapContainerRef}
      className="relative w-full h-full flex flex-col md:flex-row overflow-hidden bg-slate-100 font-sans select-none"
    >
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] animate-slide-up pointer-events-none">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border text-xs sm:text-sm font-semibold transition-all ${
              toast.type === 'success'
                ? 'bg-whatsapp-900/90 text-whatsapp-100 border-whatsapp-500/40 shadow-whatsapp-950/30'
                : toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-100 border-rose-500/40 shadow-rose-950/30'
                : 'bg-slate-900/90 text-slate-100 border-slate-700/60 shadow-slate-950/30'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-whatsapp-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4 text-whatsapp-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR EXPLORER PANEL */}
      <aside
        className={`hidden md:flex flex-col shrink-0 bg-white/95 backdrop-blur-xl border-r border-slate-200/80 transition-all duration-300 z-20 shadow-xl relative ${
          isSidebarOpen ? 'w-96 lg:w-[420px]' : 'w-0 overflow-hidden border-none'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-gradient-to-b from-whatsapp-50/50 to-transparent">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-whatsapp-700 bg-white hover:bg-whatsapp-50 px-2.5 py-1.5 rounded-xl border border-slate-200/90 hover:border-whatsapp-300 shadow-sm transition-all active:scale-95 group shrink-0"
              title="Return to Home Screen"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-whatsapp-600 group-hover:-translate-x-0.5 transition-transform" />
              <span>Home</span>
            </Link>

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-whatsapp-600 to-whatsapp-500 flex items-center justify-center text-white shadow-sm shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xs font-extrabold text-slate-900 leading-none truncate">Directory Map</h1>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {filteredBusinesses.length} verified {filteredBusinesses.length === 1 ? 'place' : 'places'}
                </p>
              </div>
            </div>

            <Link
              href="/list"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-whatsapp-700 bg-whatsapp-100/80 hover:bg-whatsapp-200/80 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 shrink-0"
              title="Add your business"
            >
              <span>+ Add</span>
            </Link>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search solar, plumbers, clinics..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-xl border border-transparent focus:border-whatsapp-500 focus:ring-2 focus:ring-whatsapp-500/20 transition-all outline-none text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-5 h-5 absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full hover:bg-slate-200 text-slate-400 flex items-center justify-center text-xs transition-colors"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* City Selector & Sort Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={selectedCity}
                onChange={(e) => handleSelectCity(e.target.value)}
                className="w-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 border-none rounded-xl px-2.5 py-2 appearance-none cursor-pointer pr-7 transition-colors focus:ring-2 focus:ring-whatsapp-500/20 outline-none"
              >
                {MAJOR_ZIMBABWE_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    📍 {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative w-36">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/70 border-none rounded-xl px-2 py-2 appearance-none cursor-pointer pr-6 transition-colors focus:ring-2 focus:ring-whatsapp-500/20 outline-none"
              >
                <option value="rating">⭐ Top Rated</option>
                <option value="distance" disabled={!userCoords}>
                  📍 Nearest {userCoords ? '' : '(GPS off)'}
                </option>
                <option value="reviews">💬 Most Reviews</option>
                <option value="name">🔤 A - Z</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Quick Categories Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 map-scrollbar">
            {categoryList.slice(0, 8).map((cat) => {
              const active = selectedCategory.toLowerCase() === cat.name.toLowerCase()
              return (
                <button
                  key={cat.name}
                  onClick={() => {
                    setSelectedCategory(cat.name)
                    setIsAreaFiltered(false)
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 flex items-center gap-1 ${
                    active
                      ? 'bg-whatsapp-600 text-white shadow-sm shadow-whatsapp-600/30'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className={`text-[9px] px-1 rounded-full ${active ? 'bg-whatsapp-800 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {cat.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable Listings */}
        <div className="flex-1 overflow-y-auto map-scrollbar divide-y divide-slate-100 p-2 space-y-1">
          {filteredBusinesses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No businesses found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                Try adjusting your search keywords, clearing categories, or zooming out.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('All')
                  setSelectedCity('All Zimbabwe')
                  setIsAreaFiltered(false)
                }}
                className="mt-4 px-4 py-2 bg-whatsapp-600 hover:bg-whatsapp-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-95"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredBusinesses.map((b) => {
              const isSelected = selected?.id === b.id
              const emoji = getCategoryEmoji(b.category || [])
              return (
                <div
                  key={b.id}
                  onClick={() => handleSelectBusiness(b)}
                  onMouseEnter={() => setHoveredId(b.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-whatsapp-50/90 border border-whatsapp-500/40 shadow-sm'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xl shadow-sm transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-whatsapp-600 to-whatsapp-800 text-white ring-2 ring-whatsapp-500'
                          : 'bg-slate-100'
                      }`}
                    >
                      {emoji}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{b.name}</h3>
                        {b.verified && (
                          <span title="Verified business" className="inline-flex">
                            <ShieldCheck className="w-3.5 h-3.5 text-whatsapp-600 shrink-0" />
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {(b.category || []).slice(0, 2).join(' · ')}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-600">
                        {b.rating > 0 && (
                          <span className="font-bold text-amber-700 flex items-center gap-0.5">
                            ⭐ {b.rating.toFixed(1)}
                            <span className="text-[10px] text-slate-400">({b.review_count || 1})</span>
                          </span>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="truncate text-slate-500">
                          {b.area ? `${b.area}, ` : ''}
                          {b.city || 'Zimbabwe'}
                        </span>
                        {(b as any).distanceKm !== undefined && (b as any).distanceKm !== null && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-whatsapp-700 font-semibold shrink-0">
                              {formatDistance((b as any).distanceKm)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100/80">
                    {hasWhatsAppChannel(b) && (
                      <a
                        href={whatsappHref(b.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-1.5 px-2 rounded-xl bg-whatsapp-500 hover:bg-whatsapp-600 text-white shadow-sm transition-all active:scale-95"
                      >
                        <MessageCircle className="w-3 h-3 shrink-0" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {hasVoiceChannel(b) && (
                      <a
                        href={callHref(voiceNumber(b))}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center gap-1 text-[11px] font-semibold py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95"
                      >
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>Call</span>
                      </a>
                    )}
                    <Link
                      href={`/business/${b.slug || b.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center gap-0.5 text-[11px] font-semibold py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all active:scale-95"
                    >
                      <span>Profile</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* DESKTOP SIDEBAR TOGGLE & HOME BUTTON */}
      <div
        className="hidden md:flex items-center gap-2 absolute top-4 z-[1000] transition-all duration-300"
        style={{ left: isSidebarOpen ? 'calc(420px + 12px)' : '16px' }}
      >
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="bg-white/95 backdrop-blur-md text-slate-700 hover:text-whatsapp-700 hover:bg-white border border-slate-200/80 shadow-lg w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          title={isSidebarOpen ? 'Collapse sidebar' : 'Open places panel'}
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {!isSidebarOpen && (
          <Link
            href="/"
            className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 hover:text-whatsapp-700 px-3.5 py-2 rounded-2xl shadow-xl border border-slate-200/90 text-xs font-bold transition-all active:scale-95 hover:shadow-card hover:-translate-y-0.5"
            title="Go back to Home screen"
          >
            <ArrowLeft className="w-4 h-4 text-whatsapp-600" />
            <span>Home</span>
          </Link>
        )}
      </div>

      {/* MAIN MAP WORKSPACE */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        {/* TOP FLOATING SEARCH & CONTROLS ON MOBILE */}
        <div className="md:hidden absolute top-2 left-2 right-2 z-[1000] space-y-2 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-2 pointer-events-auto flex items-center gap-2">
            <Link
              href="/"
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-whatsapp-50 border border-slate-200/80 text-slate-700 hover:text-whatsapp-700 flex items-center justify-center shrink-0 transition-all active:scale-90"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4 text-whatsapp-600" />
            </Link>

            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search places in Zimbabwe..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-whatsapp-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={selectedCity}
              onChange={(e) => handleSelectCity(e.target.value)}
              className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-1.5 rounded-xl border-none outline-none max-w-[110px] truncate"
            >
              {MAJOR_ZIMBABWE_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Category Pills on Mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto map-scrollbar pointer-events-auto px-1">
            {categoryList.slice(0, 10).map((cat) => {
              const active = selectedCategory.toLowerCase() === cat.name.toLowerCase()
              return (
                <button
                  key={cat.name}
                  onClick={() => {
                    setSelectedCategory(cat.name)
                    setIsAreaFiltered(false)
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shadow-md transition-all active:scale-95 flex items-center gap-1 backdrop-blur-md ${
                    active
                      ? 'bg-whatsapp-600 text-white ring-2 ring-white'
                      : 'bg-white/90 text-slate-700 hover:bg-white'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* FLOATING "SEARCH THIS AREA" PILL */}
        {showSearchAreaPill && !isAreaFiltered && (
          <div className="absolute top-16 md:top-4 left-1/2 -translate-x-1/2 z-[1000] animate-slide-up">
            <button
              onClick={handleSearchThisArea}
              disabled={isAreaFilteringLoading}
              className="flex items-center gap-2 bg-white/95 hover:bg-white text-slate-800 hover:text-whatsapp-700 px-4 py-2 rounded-full shadow-2xl border border-slate-200/90 text-xs font-bold transition-all active:scale-95 hover:shadow-card hover:-translate-y-0.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-whatsapp-600 ${isAreaFilteringLoading ? 'animate-spin' : ''}`} />
              <span>Search this area</span>
            </button>
          </div>
        )}

        {/* TOP-RIGHT MAP CONTROLS CLUSTER */}
        <div className="absolute top-16 md:top-4 right-3 z-[1000] flex flex-col gap-2">
          {/* GPS Locate Me Button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className={`w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center border transition-all active:scale-90 ${
              isLocating
                ? 'bg-whatsapp-600 text-white border-whatsapp-700'
                : userCoords
                ? 'bg-sky-500 text-white border-sky-600 shadow-sky-500/25 ring-2 ring-sky-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="Locate me via GPS"
          >
            {isLocating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <LocateFixed className="w-5 h-5" />
            )}
          </button>

          {/* Map Layer Switcher Button */}
          <div className="relative">
            <button
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className={`w-10 h-10 rounded-2xl shadow-xl flex items-center justify-center border transition-all active:scale-90 ${
                showLayerMenu
                  ? 'bg-whatsapp-600 text-white border-whatsapp-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Change Map Style"
            >
              <Layers className="w-5 h-5" />
            </button>

            {/* Layer Popover Menu */}
            {showLayerMenu && (
              <div className="absolute right-0 top-12 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 p-2 space-y-1 animate-slide-up z-50">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Map Style
                </p>
                {MAP_TILE_LAYERS.map((layer) => {
                  const isActive = activeTileId === layer.id
                  return (
                    <button
                      key={layer.id}
                      onClick={() => {
                        setActiveTileId(layer.id)
                        setShowLayerMenu(false)
                        showToast(`Switched to ${layer.name} map`, 'info')
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs font-semibold ${
                        isActive
                          ? 'bg-whatsapp-50 text-whatsapp-800'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="leading-tight">{layer.name}</p>
                        <p className="text-[10px] text-slate-400 font-normal">{layer.description}</p>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-whatsapp-600 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Zoom In & Out */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            <button
              onClick={() => {
                const mapEl = document.querySelector('.leaflet-container') as any
                if (mapEl?._leaflet_map) mapEl._leaflet_map.zoomIn()
              }}
              className="w-10 h-9 flex items-center justify-center text-slate-700 hover:text-whatsapp-700 hover:bg-slate-50 border-b border-slate-100 transition-all active:scale-90"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const mapEl = document.querySelector('.leaflet-container') as any
                if (mapEl?._leaflet_map) mapEl._leaflet_map.zoomOut()
              }}
              className="w-10 h-9 flex items-center justify-center text-slate-700 hover:text-whatsapp-700 hover:bg-slate-50 transition-all active:scale-90"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Fit All Markers / Reset View Button */}
          <button
            onClick={handleFitAll}
            className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-700 hover:text-whatsapp-700 rounded-2xl shadow-xl border border-slate-200 flex items-center justify-center transition-all active:scale-90"
            title="Fit all markers in view"
          >
            <Navigation className="w-4 h-4 -rotate-45" />
          </button>

          {/* Share Map Button */}
          <button
            onClick={handleShareMap}
            className={`w-10 h-10 rounded-2xl shadow-xl border flex items-center justify-center transition-all active:scale-90 ${
              copiedLink
                ? 'bg-whatsapp-600 text-white border-whatsapp-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="Share this map"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={handleToggleFullscreen}
            className="w-10 h-10 bg-white hover:bg-slate-50 text-slate-700 hover:text-whatsapp-700 rounded-2xl shadow-xl border border-slate-200 hidden sm:flex items-center justify-center transition-all active:scale-90"
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>

        {/* LEAFLET MAP CONTAINER */}
        <MapContainer
          center={ZIMBABWE_CENTER}
          zoom={ZIMBABWE_DEFAULT_ZOOM}
          zoomControl={false}
          className="w-full h-full z-0"
        >
          <TileLayer
            key={activeTile.id}
            url={activeTile.url}
            attribution={activeTile.attribution}
            maxZoom={activeTile.maxZoom}
          />

          <MapController target={targetCoord} bounds={fitBounds} zoom={targetZoom} />

          <MapEventsHandler
            onBoundsChange={handleBoundsChange}
            onMapClick={() => setSelected(null)}
          />

          {/* User Location Radar Marker */}
          {userCoords && (
            <Marker
              position={[userCoords.lat, userCoords.lng]}
              icon={createUserLocationMarkerIcon()}
            >
              <Popup>
                <div className="p-1 text-center font-bold text-xs text-sky-800">
                  📍 You are here
                </div>
              </Popup>
            </Marker>
          )}

          {/* Business Markers */}
          {filteredBusinesses.map((b) => {
            if (!b.lat || !b.lng) return null
            const isSelected = selected?.id === b.id
            const isHovered = hoveredId === b.id
            const emoji = getCategoryEmoji(b.category || [])

            return (
              <Marker
                key={b.id}
                position={[b.lat, b.lng]}
                icon={createBusinessMarkerIcon(emoji, isSelected, isHovered, !!b.featured_eligible)}
                eventHandlers={{
                  click: () => handleSelectBusiness(b),
                }}
              />
            )
          })}
        </MapContainer>

        {/* SELECTED BUSINESS PREVIEW CARD / MODAL (FLOATING) */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto md:w-[380px] z-[1000] animate-slide-up">
            <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 p-4 relative overflow-hidden ring-1 ring-black/5">
              {/* Top gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-whatsapp-500 via-whatsapp-400 to-whatsapp-600" />

              {/* Close button */}
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center absolute top-3.5 right-3.5 transition-all active:scale-90"
                title="Close card"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3 mt-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-whatsapp-600 to-whatsapp-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-md shadow-whatsapp-600/30">
                  {getCategoryEmoji(selected.category || [])}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-extrabold text-slate-900 truncate">
                      {selected.name}
                    </h2>
                    {selected.verified && (
                      <span title="Verified business" className="inline-flex">
                        <ShieldCheck className="w-4 h-4 text-whatsapp-600 shrink-0" />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {(selected.category || []).join(' · ')}
                  </p>

                  <div className="flex items-center gap-2 mt-1 text-xs">
                    {selected.rating > 0 && (
                      <span className="font-extrabold text-amber-700 flex items-center gap-0.5">
                        ⭐ {selected.rating.toFixed(1)}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({selected.review_count || 1})
                        </span>
                      </span>
                    )}
                    {selected.city && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-600 truncate font-medium">
                          {selected.area ? `${selected.area}, ` : ''}
                          {selected.city}
                        </span>
                      </>
                    )}
                    {(selected as any).distanceKm !== undefined && (selected as any).distanceKm !== null && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-whatsapp-700 font-bold">
                          {formatDistance((selected as any).distanceKm)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio / Description snippet */}
              {selected.bio && (
                <p className="text-xs text-slate-600 line-clamp-2 mt-2.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {selected.bio}
                </p>
              )}

              {/* Address indicator */}
              {selected.address && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-2">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{selected.address}</span>
                </p>
              )}

              {/* ACTION BUTTONS (State-of-the-Art responsive feedback) */}
              <div className="grid grid-cols-2 gap-2 mt-3.5">
                {hasWhatsAppChannel(selected) && (
                  <a
                    href={whatsappHref(selected.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-whatsapp-500 hover:bg-whatsapp-600 text-white font-bold text-xs rounded-xl shadow-md shadow-whatsapp-500/25 transition-all active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {hasVoiceChannel(selected) ? (
                  <a
                    href={callHref(voiceNumber(selected))}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>Call</span>
                  </a>
                ) : (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all active:scale-95"
                  >
                    <Navigation className="w-4 h-4 text-whatsapp-600 shrink-0" />
                    <span>Directions</span>
                  </a>
                )}
              </div>

              {/* Secondary actions: Directions + Profile */}
              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
                {hasVoiceChannel(selected) && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-whatsapp-700 py-1 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 text-whatsapp-600" />
                    <span>Get Directions</span>
                  </a>
                )}

                <Link
                  href={`/business/${selected.slug || selected.id}`}
                  onClick={() => setNavigatingSlug(selected.slug || selected.id)}
                  className="inline-flex items-center gap-1 ml-auto font-bold text-whatsapp-700 hover:text-whatsapp-800 py-1 transition-all active:scale-95"
                >
                  {navigatingSlug === (selected.slug || selected.id) ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Opening...</span>
                    </>
                  ) : (
                    <>
                      <span>Full Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE LIST BOTTOM SHEET / DRAWER */}
        {mobileTab === 'list' && (
          <div className="md:hidden absolute inset-0 z-[1500] bg-white flex flex-col animate-slide-up">
            {/* Sheet Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {filteredBusinesses.length} Verified Places
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedCity} {selectedCategory !== 'All' ? `· ${selectedCategory}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                  title="Back to Home"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-whatsapp-600" />
                  <span>Home</span>
                </Link>
                <button
                  onClick={() => setMobileTab('map')}
                  className="px-3 py-1.5 bg-whatsapp-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Show Map</span>
                </button>
              </div>
            </div>

            {/* Sheet List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {filteredBusinesses.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    handleSelectBusiness(b)
                    setMobileTab('map')
                  }}
                  className="p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-whatsapp-100 text-whatsapp-800 flex items-center justify-center text-xl shrink-0">
                      {getCategoryEmoji(b.category || [])}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-sm text-slate-900 truncate">{b.name}</p>
                        {b.verified && <ShieldCheck className="w-3.5 h-3.5 text-whatsapp-600 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {(b.category || []).slice(0, 2).join(' · ')} · {b.city || 'Zimbabwe'}
                      </p>
                      {b.rating > 0 && (
                        <p className="text-xs text-amber-700 font-bold mt-0.5">
                          ⭐ {b.rating.toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MOBILE FLOATING ACTIONS PILL (HOME + LIST/MAP TOGGLE) */}
        <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md hover:bg-slate-900 text-white px-4 py-2.5 rounded-full shadow-2xl border border-white/20 text-xs font-bold transition-all active:scale-95"
            title="Go back to Home screen"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-whatsapp-400" />
            <span>Home</span>
          </Link>

          <button
            onClick={() => setMobileTab(mobileTab === 'map' ? 'list' : 'map')}
            className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md hover:bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl border border-white/20 text-xs font-bold transition-all active:scale-95"
          >
            {mobileTab === 'map' ? (
              <>
                <List className="w-4 h-4 text-whatsapp-400" />
                <span>List ({filteredBusinesses.length})</span>
              </>
            ) : (
              <>
                <MapIcon className="w-4 h-4 text-whatsapp-400" />
                <span>Map</span>
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  )
}

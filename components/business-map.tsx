'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Map as MaplibreMap,
  Popup,
  AttributionControl,
  type Map as MlMap,
  type MapMouseEvent,
  type GeoJSONSource,
  type LayerSpecification,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  LayoutGrid,
  Map as MapIcon,
  Filter,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertCircle,
  Grid,
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
  calculateDistanceKm,
  formatDistance,
} from '@/lib/map-locations'
import {
  MAP_PROVIDERS,
  MAP_DEFAULT_PROVIDER,
  getMapProvider,
  type MapProviderId,
} from '@/lib/map-providers'
import CategoryIcon from '@/components/map/category-icon'
import { formatMoney } from '@/lib/product-format'
import { doodleFor } from '@/lib/category-style'
import {
  registerPinImages,
  sanitizeKey,
} from '@/components/map/category-pin'

interface BusinessMapProps {
  businesses: Business[]
  // Products mode reuses this map: markers are sellers that have matching
  // products, and the preview shows those products.
  mode?: 'all' | 'products' | 'services'
}

interface MapBounds {
  south: number
  north: number
  west: number
  east: number
}

// Leaf flavour of marker data lives on GeoJSON features.
interface WaMarkerProperties {
  uid: string // feature key - always String(slug || id), used by the selected-pin filter
  bRef: string // business id used for selection lookup
  catKey: string // sanitized category -> pin image key
  name: string
  featured: boolean
  cluster?: boolean
  cluster_id?: number
  point_count?: number
  point_count_abbreviated?: string
}

const BUSINESS_SOURCE = 'wa-businesses'
const USER_SOURCE = 'wa-user'
const EMPTY_FC = { type: 'FeatureCollection', features: [] }
const MOVE_BOUNCE_MS = 800 // easeTo duration - smooth fly-to parity with Leaflet

function getBoundsSnapshot(map: MlMap): MapBounds | null {
  try {
    const b = map.getBounds()
    if (!b) return null
    return {
      south: b.getSouth(),
      north: b.getNorth(),
      west: b.getWest(),
      east: b.getEast(),
    }
  } catch {
    return null
  }
}

function boundsContainPoint(b: MapBounds | null, lat: number, lng: number): boolean {
  if (!b) return false
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east
}

// Primary category for the pin glyph: first recognisable name from the
// business categories (same order rule as everywhere else in the app).
function catKeyFor(businessCategories: string[] = []): string {
  return sanitizeKey(doodleFor(businessCategories)?.name || 'Other')
}

// For Products mode: use the seller's primary product category for the pin.
// Falls back to the seller's business category if product category is empty/invalid.
function productCatKeyFor(productCategory: string, businessCategories?: string[]): string {
  if (productCategory && productCategory.trim()) {
    const hit = doodleFor([productCategory])
    if (hit) return sanitizeKey(hit.name)
  }
  // Fall back to seller's business category
  if (businessCategories && businessCategories.length > 0) {
    return sanitizeKey(doodleFor(businessCategories)?.name || 'Other')
  }
  return sanitizeKey('Other')
}

function toFeatureCollection(list: Business[], mode: 'all' | 'products' | 'services' = 'services'): {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    id: string
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: WaMarkerProperties
  }>
} {
  return {
    type: 'FeatureCollection',
    features: list
      .filter((b) => typeof b.lat === 'number' && typeof b.lng === 'number')
      .map((b) => {
        // In Products mode, use productCategory for pin icon/color, falling back to business category
        const productCategory = mode === 'products' && (b as Business & { productCategory?: string }).productCategory
        const catKey = productCategory
          ? productCatKeyFor(productCategory, b.category || [])
          : catKeyFor(b.category || [])
        return {
          type: 'Feature' as const,
          id: String(b.slug || b.id),
          geometry: { type: 'Point' as const, coordinates: [b.lng as number, b.lat as number] },
          properties: {
            uid: String(b.slug || b.id),
            bRef: String(b.slug || b.id),
            catKey,
            name: b.name || '',
            featured: !!b.featured_eligible,
          },
        }
      }),
  }
}

// Idempotently install the runtime GeoJSON source + symbol layers (both
// states of every pin, cluster circles/labels, featured badge) and the
// user-location layers. Safe across setStyle() style swaps.
function ensureSourcesAndLayers(map: MlMap, mode: 'all' | 'products' | 'services' = 'services', enableClustering: boolean = false): void {
  if (!map.getSource(BUSINESS_SOURCE)) {
    map.addSource(BUSINESS_SOURCE, {
      type: 'geojson',
      data: toFeatureCollection([], mode) as never,
      cluster: enableClustering,
      clusterMaxZoom: 14,
      clusterRadius: 55,
    })
  }

  if (!map.getLayer('wa-clusters-halo')) {
    map.addLayer({
      id: 'wa-clusters-halo',
      type: 'circle',
      source: BUSINESS_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-radius': 17,
        'circle-color': '#FFFFFF',
        'circle-opacity': 0.45,
        'circle-stroke-width': 4,
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-opacity': 0.35,
      },
    } as LayerSpecification)
  }
  if (!map.getLayer('wa-clusters')) {
    map.addLayer({
      id: 'wa-clusters',
      type: 'circle',
      source: BUSINESS_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-radius': 12.5,
        'circle-color': '#FFFFFF',
        'circle-opacity': 0.95,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': 'rgba(100, 116, 139, 0.3)',
      },
    } as LayerSpecification)
  }
  if (!map.getLayer('wa-cluster-count')) {
    map.addLayer({
      id: 'wa-cluster-count',
      type: 'symbol',
      source: BUSINESS_SOURCE,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 11,
      },
      paint: {
        'text-color': '#334155',
        'text-halo-color': 'rgba(255, 255, 255, 0.9)',
        'text-halo-width': 1,
      },
    } as LayerSpecification)
  }

  if (!map.getLayer('wa-pins')) {
    map.addLayer({
      id: 'wa-pins',
      type: 'symbol',
      source: BUSINESS_SOURCE,
      filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': ['concat', 'wa-pin-default-', ['get', 'catKey']],
        'icon-anchor': 'bottom',
        'icon-offset': [0, 4],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: {
        'icon-opacity': [
          'case',
          ['feature-state', 'hover'],
          0.7,
          1.0,
        ],
      },
    } as LayerSpecification)
  }
  // Selected look is a second layer narrowed by feature-id filter: layout
  // expressions cannot read feature-state, but a cheap shim filter can.
  if (!map.getLayer('wa-pins-selected')) {
    map.addLayer({
      id: 'wa-pins-selected',
      type: 'symbol',
      source: BUSINESS_SOURCE,
      filter: ['==', ['get', 'uid'], '__none__'],
      layout: {
        'icon-image': ['concat', 'wa-pin-selected-', ['get', 'catKey']],
        'icon-anchor': 'bottom',
        'icon-offset': [0, 4],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    } as LayerSpecification)
  }
  if (!map.getLayer('wa-featured-badge')) {
    map.addLayer({
      id: 'wa-featured-badge',
      type: 'symbol',
      source: BUSINESS_SOURCE,
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'featured'], true]],
      layout: {
        'icon-image': 'wa-featured-badge',
        'icon-anchor': 'center',
        'icon-offset': [17, -44],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    } as LayerSpecification)
  }

  if (!map.getSource(USER_SOURCE)) {
    map.addSource(USER_SOURCE, { type: 'geojson', data: EMPTY_FC as never })
  }
  if (!map.getLayer('wa-user-pulse')) {
    map.addLayer({
      id: 'wa-user-pulse',
      type: 'circle',
      source: USER_SOURCE,
      paint: {
        'circle-radius': 9,
        'circle-color': '#38BDF8',
        'circle-opacity': 0.35,
        'circle-stroke-color': 'rgba(56, 189, 248, 0.45)',
        'circle-stroke-width': 1.5,
      },
    } as LayerSpecification)
  }
  if (!map.getLayer('wa-user-core')) {
    map.addLayer({
      id: 'wa-user-core',
      type: 'circle',
      source: USER_SOURCE,
      paint: {
        'circle-radius': 5.5,
        'circle-color': '#0EA5E9',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#FFFFFF',
      },
    } as LayerSpecification)
  }
}

export default function BusinessMap({ businesses = [], mode = 'services' }: BusinessMapProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Selection & Hover
  const [selected, setSelected] = useState<Business | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Map runtime
  const [mapReady, setMapReady] = useState(false)
  const [installTick, setInstallTick] = useState(0) // bumped after every layer install
  const mapRef = useRef<MlMap | null>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [activeProviderId, setActiveProviderId] = useState<MapProviderId>(MAP_DEFAULT_PROVIDER)
  const [showLayerMenu, setShowLayerMenu] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedCity, setSelectedCity] = useState<string>('All Zimbabwe')
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'reviews' | 'name'>('rating')

  // User Geolocation
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const userPopupRef = useRef<Popup | null>(null)

  // "Search This Area" & Viewport tracking
  const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null)
  const [isAreaFiltered, setIsAreaFiltered] = useState(false)
  const [showSearchAreaPill, setShowSearchAreaPill] = useState(false)
  const [isAreaFilteringLoading, setIsAreaFilteringLoading] = useState(false)

  // UI view modes
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map')
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [navigatingSlug, setNavigatingSlug] = useState<string | null>(null)
  const [clusteringEnabled, setClusteringEnabled] = useState(false)

  // Sidebar row refs for list <-> map selection scroll-sync
  const sidebarRowRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Latest values for map event handlers (avoid stale closures)
  const businessesRef = useRef(businesses)
  useEffect(() => {
    businessesRef.current = businesses
  }, [businesses])

  const filteredRef = useRef<Business[]>([])

  const handlersRef = useRef<{
    onBoundsChange?: (b: MapBounds | null) => void
    handleSelectNone?: () => void
    handleSelectBusiness?: (b: Business) => void
  }>({})

  const hoverStateRef = useRef<string | null>(null)
  const deepLinkDoneRef = useRef(false)

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
    return [{ name: 'All', count: businesses.length }, ...sorted.map(([name, count]) => ({ name, count }))]
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
          if (!boundsContainPoint(currentBounds, b.lat, b.lng)) {
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

  useEffect(() => {
    filteredRef.current = filteredBusinesses
  }, [filteredBusinesses])

  // Drag the map to a business, with smooth easing (FlyTo parity).
  const flyToBusiness = useCallback((b: Business, zoom = 15) => {
    if (typeof b.lat === 'number' && typeof b.lng === 'number') {
      mapRef.current?.easeTo({ center: [b.lng, b.lat], zoom, duration: MOVE_BOUNCE_MS })
    }
  }, [])

  // Select business pin (from list row OR map feature) - keeps both in sync.
  const handleSelectBusiness = useCallback(
    (business: Business) => {
      setSelected(business)
      flyToBusiness(business)
      requestAnimationFrame(() => {
        sidebarRowRefs.current[business.id]?.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        })
      })
    },
    [flyToBusiness]
  )

  const handleSelectNone = useCallback(() => setSelected(null), [])

  // Keep imperative handlers fresh without re-binding map listeners.
  useEffect(() => {
    handlersRef.current.handleSelectBusiness = handleSelectBusiness
    handlersRef.current.handleSelectNone = handleSelectNone
  }, [handleSelectBusiness, handleSelectNone])

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
        mapRef.current?.easeTo({ center: [coords.lng, coords.lat], zoom: 14, duration: 1000 })
        setIsLocating(false)
        setSortBy('distance')
        showToast('Located! Showing nearest verified businesses', 'success')
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
      mapRef.current?.easeTo({
        center: [ZIMBABWE_CENTER[1], ZIMBABWE_CENTER[0]],
        zoom: ZIMBABWE_DEFAULT_ZOOM,
        duration: 1000,
      })
      return
    }

    const lats = filteredBusinesses.map((b) => b.lat!).filter(Boolean)
    const lngs = filteredBusinesses.map((b) => b.lng!).filter(Boolean)

    if (lats.length === 0) return

    mapRef.current?.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 60, maxZoom: 15, duration: 1000 }
    )
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
        mapRef.current?.easeTo({
          center: [foundCity.lng, foundCity.lat],
          zoom: foundCity.zoom,
          duration: 1100,
        })
        if (cityName !== 'All Zimbabwe') showToast(`Flying to ${cityName}`, 'info')
      } else {
        mapRef.current?.easeTo({
          center: [ZIMBABWE_CENTER[1], ZIMBABWE_CENTER[0]],
          zoom: ZIMBABWE_DEFAULT_ZOOM,
          duration: 1100,
        })
      }
    },
    [showToast]
  )

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
      showToast('Map link copied to clipboard', 'success')
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }, [selected, selectedCity, showToast])

  const activeProvider = useMemo(() => getMapProvider(activeProviderId), [activeProviderId])

  const providerButtons = useMemo(
    () =>
      MAP_PROVIDERS.map((p) => (
        <button
          key={p.id}
          onClick={() => {
            setActiveProviderId(p.id)
            setShowLayerMenu(false)
            showToast(`Switched to ${p.name} map`, 'info')
          }}
          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs font-semibold ${
            activeProviderId === p.id
              ? 'bg-whatsapp-50 text-whatsapp-800'
              : 'hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div>
            <p className="leading-tight">{p.name}</p>
            <p className="text-[10px] text-slate-400 font-normal">{p.description}</p>
          </div>
          {activeProviderId === p.id && <Check className="w-4 h-4 text-whatsapp-600 shrink-0" />}
        </button>
      )),
    [activeProviderId, showToast]
  )

  // ---------------------------------------------------------------------
  // MAP BOOTSTRAP
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!mounted) return
    const container = mapDivRef.current
    if (!container) return

    const map = new MaplibreMap({
      container,
      style: getMapProvider(MAP_DEFAULT_PROVIDER).buildStyle() as StyleSpecification,
      center: [ZIMBABWE_CENTER[1], ZIMBABWE_CENTER[0]],
      zoom: ZIMBABWE_DEFAULT_ZOOM,
      maxZoom: 19,
      attributionControl: false,
    })
    mapRef.current = map

    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    try {
      map.dragRotate.disable()
      map.touchZoomRotate.disableRotation()
    } catch {
      /* ignore */
    }

    const onDataApplied = (installTickResult: number) => {
      setInstallTick(installTickResult)
    }

    // Clamp our custom controls & click delegation to the latest handlers.
    const handleClick = (e: MapMouseEvent) => {
      const h = handlersRef.current
      const feats = map.queryRenderedFeatures(e.point, {
        layers: ['wa-pins', 'wa-pins-selected', 'wa-featured-badge', 'wa-clusters'],
      })
      if (feats.length === 0) {
        h.handleSelectNone?.()
        return
      }
      const f = feats[0]
      if (f.properties?.cluster) {
        const src = map.getSource(BUSINESS_SOURCE) as GeoJSONSource | undefined
        const coords = (f.geometry as { coordinates?: [number, number] })?.coordinates
        if (!src || !coords) return
        src
          .getClusterExpansionZoom(f.properties.cluster_id as number)
          .then((zoom) => {
            map.easeTo({
              center: coords as [number, number],
              zoom,
              duration: 550,
            })
          })
          .catch(() => {
            map.easeTo({
              center: coords as [number, number],
              zoom: map.getZoom() + 2,
              duration: 550,
            })
          })
        return
      }
      const bRef = f.properties?.bRef as string | undefined
      const biz =
        businessesRef.current.find((b) => String(b.slug || b.id) === bRef) ||
        filteredRef.current.find((b) => String(b.slug || b.id) === bRef)
      if (biz) h.handleSelectBusiness?.(biz)
    }

    // Hover highlight via feature-state (zero React re-renders). A single
    // mousemove listener owns the hover state so layer- and map-level
    // listeners can never fight over it.
    const onMapMouseMove = (e: MapMouseEvent) => {
      const hit = map.queryRenderedFeatures(e.point, {
        layers: ['wa-pins', 'wa-pins-selected', 'wa-featured-badge'],
      })[0]
      const id = (hit?.properties?.bRef as string | undefined) || null
      if (id === hoverStateRef.current) return
      if (hoverStateRef.current) {
        try {
          map.setFeatureState(
            { source: BUSINESS_SOURCE, id: hoverStateRef.current },
            { hover: false }
          )
        } catch {
          /* ignore */
        }
      }
      hoverStateRef.current = id
      if (id) {
        try {
          map.setFeatureState({ source: BUSINESS_SOURCE, id }, { hover: true })
        } catch {
          /* ignore */
        }
      }
      map.getCanvas().style.cursor = id ? 'pointer' : ''
    }

    const onBoundsEvent = () => {
      handlersRef.current.onBoundsChange?.(getBoundsSnapshot(map))
    }

    // Re-install runtime layers after every style swap (basemap change).
    const onStyleLoad = () => {
      void registerPinImages(map, PIN_CATALOG)
        .then(() => {
          ensureSourcesAndLayers(map, mode, clusteringEnabled)
          const src = map.getSource(BUSINESS_SOURCE) as GeoJSONSource | undefined
          if (src) src.setData(toFeatureCollection(filteredRef.current, mode) as never)
          setInstallTick((v) => v + 1)
        })
        .catch(() => {})
    }

    map.on('moveend', onBoundsEvent)
    map.on('zoomend', onBoundsEvent)
    map.on('click', handleClick)
    map.on('mousemove', onMapMouseMove)
    map.on('style.load', onStyleLoad)
    map.on('load', () => {
      setMapReady(true)
      onBoundsEvent() // parity: Leaflet fired bounds once on mount
    })

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      try {
        map.resize()
      } catch {
        /* ignore */
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      try {
        map.remove()
      } catch {
        /* ignore */
      }
      mapRef.current = null
      userPopupRef.current = null
      setMapReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // keep bounds handler fresh
  const handleBoundsChange = useCallback((bounds: MapBounds | null) => {
    setCurrentBounds(bounds)
    setShowSearchAreaPill(true)
  }, [])
  useEffect(() => {
    handlersRef.current.onBoundsChange = handleBoundsChange
  }, [handleBoundsChange])

  // ---------------------------------------------------------------------
  // DATA SYNC: filtered businesses -> GeoJSON source (cached rasterizer)
  // ---------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    let cancelled = false
    void registerPinImages(map, PIN_CATALOG)
      .then(() => {
        if (cancelled) return
        ensureSourcesAndLayers(map, mode, clusteringEnabled)
        const src = map.getSource(BUSINESS_SOURCE) as GeoJSONSource | undefined
        if (src) src.setData(toFeatureCollection(filteredBusinesses, mode) as never)
        setInstallTick((v) => v + 1)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, filteredBusinesses, mode, clusteringEnabled])

  // ---------------------------------------------------------------------
  // SELECTION / HOVER -> feature-state (smooth, no DOM churn)
  // ---------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !installTick) {
      return
    }
    const selectedId = selected ? String(selected.slug || selected.id) : null

    try {
      // Selected pins are a filter-narrowed overlay layer ('wa-pins-selected');
      // feature-state selected would not be legal on symbol layout props.
      map.setFilter('wa-pins-selected', ['==', ['get', 'uid'], selectedId ?? '__none__'])
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, installTick])

  // ---------------------------------------------------------------------
  // USER LOCATION -> user GeoJSON + "You are here" callout
  // ---------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !installTick) return
    try {
      const src = map.getSource(USER_SOURCE) as GeoJSONSource | undefined
      if (!src) return
      src.setData(
        userCoords
          ? {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [userCoords.lng, userCoords.lat],
                  },
                  properties: {},
                },
              ],
            }
          : (EMPTY_FC as never)
      )

      if (userCoords) {
        userPopupRef.current?.remove()
        userPopupRef.current = new Popup({
          closeButton: false,
          offset: [0, -10],
          maxWidth: '220px',
        })
          .setLngLat([userCoords.lng, userCoords.lat])
          .setHTML('<div class="wa-user-callout">You are here</div>')
          .addTo(map)
      } else if (userPopupRef.current) {
        userPopupRef.current.remove()
        userPopupRef.current = null
      }
    } catch {
      /* ignore */
    }
  }, [userCoords, installTick])

  // Radar pulse animation around the user dot.
  useEffect(() => {
    if (!userCoords || !mapReady) return
    let raf = 0
    let t0: number | null = null
    const step = (now: number) => {
      if (t0 === null) t0 = now
      const phase = ((now - t0) % 2000) / 2000
      try {
        const map = mapRef.current
        if (map?.getLayer('wa-user-pulse')) {
          map.setPaintProperty('wa-user-pulse', 'circle-radius', 8 + phase * 20)
          map.setPaintProperty('wa-user-pulse', 'circle-opacity', 0.38 * (1 - phase) + 0.04)
        }
      } catch {
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [userCoords, mapReady, installTick])

  // ---------------------------------------------------------------------
  // BASEMAP SWAP
  // ---------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return
    map.setStyle(getMapProvider(activeProviderId).buildStyle() as StyleSpecification)
    setInstallTick((v) => v + 1) // style.load continues the reinstall
  }, [activeProviderId, mapReady])

  // ---------------------------------------------------------------------
  // SHARE-URL DEEP LINK (?b=<slug|id>&city=<city>)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!mapReady || deepLinkDoneRef.current) return
    deepLinkDoneRef.current = true
    try {
      const params = new URLSearchParams(window.location.search)
      const cityParam = params.get('city')
      if (cityParam && MAJOR_ZIMBABWE_CITIES.some((c) => c.name === cityParam)) {
        handleSelectCity(cityParam)
      }
      const bParam = params.get('b')
      if (bParam) {
        const biz = businesses.find((b) => b.slug === bParam || b.id === bParam)
        if (biz) handleSelectBusiness(biz)
      }
    } catch {
      /* ignore */
    }
  }, [mapReady, businesses, handleSelectCity, handleSelectBusiness])

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
        className={`hidden md:flex flex-col shrink-0 bg-white/90 backdrop-blur-xl border-r border-white/80 transition-all duration-300 z-20 shadow-xl relative ${
          isSidebarOpen ? 'w-96 lg:w-[420px]' : 'w-0 overflow-hidden border-none'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/80 space-y-3 bg-gradient-to-b from-white/70 to-transparent">
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
              className="w-full pl-9 pr-8 py-2 text-xs bg-white/70 hover:bg-white focus:bg-white rounded-xl border border-white/80 focus:border-whatsapp-500 focus:ring-2 focus:ring-whatsapp-500/20 transition-all outline-none text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="w-5 h-5 absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center text-xs transition-colors"
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
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative w-36">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as never)}
                className="w-full text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/70 border-none rounded-xl px-2 py-2 appearance-none cursor-pointer pr-6 transition-colors focus:ring-2 focus:ring-whatsapp-500/20 outline-none"
              >
                <option value="rating">Top Rated</option>
                <option value="distance" disabled={!userCoords}>
                  Nearest {userCoords ? '' : '(GPS off)'}
                </option>
                <option value="reviews">Most Reviews</option>
                <option value="name">A - Z</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Quick Categories Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 map-scrollbar bg-white/50 backdrop-blur-sm rounded-xl px-2 py-1.5 border border-white/80">
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
                  {cat.name === 'All' ? (
                    <LayoutGrid className="w-3.5 h-3.5" />
                  ) : (
                    <CategoryIcon categories={[cat.name]} className="w-3.5 h-3.5" />
                  )}
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
        <div className="flex-1 overflow-y-auto map-scrollbar divide-y divide-white/80 p-2 space-y-1 bg-white/30 backdrop-blur-sm rounded-xl">
          {filteredBusinesses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center mb-3 text-slate-400 border border-white/80">
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
              return (
                <div
                  key={b.id}
                  ref={(el) => {
                    sidebarRowRefs.current[b.id] = el
                  }}
                  onClick={() => handleSelectBusiness(b)}
                  onMouseEnter={() => setHoveredId(b.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white/90 backdrop-blur-md border border-whatsapp-500/40 shadow-sm'
                      : 'hover:bg-white/60 backdrop-blur-sm border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-whatsapp-600 to-whatsapp-800 text-white ring-2 ring-whatsapp-500'
                          : 'bg-white/80 backdrop-blur-sm text-slate-600 border border-white/80'
                      }`}
                    >
                      <CategoryIcon categories={b.category || []} className="w-5 h-5" />
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
                            {b.rating.toFixed(1)}
                            <span className="text-[10px] text-slate-400">({b.review_count || 1})</span>
                          </span>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="truncate text-slate-500">
                          {b.area ? `${b.area}, ` : ''}
                          {b.city || 'Zimbabwe'}
                        </span>
                        {(b as { distanceKm?: number | null }).distanceKm !== undefined &&
                          (b as { distanceKm?: number | null }).distanceKm !== null && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-whatsapp-700 font-semibold shrink-0">
                                {formatDistance((b as { distanceKm?: number }).distanceKm!)}
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
          className="bg-white/90 backdrop-blur-xl text-slate-700 hover:text-whatsapp-700 hover:bg-white border border-white/80 shadow-lg w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          title={isSidebarOpen ? 'Collapse sidebar' : 'Open places panel'}
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {!isSidebarOpen && (
          <Link
            href="/"
            className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xl hover:bg-white text-slate-800 hover:text-whatsapp-700 px-3.5 py-2 rounded-2xl shadow-xl border border-white/80 text-xs font-bold transition-all active:scale-95 hover:shadow-card hover:-translate-y-0.5"
            title="Go back to Home screen"
          >
            <ArrowLeft className="w-4 h-4 text-whatsapp-600" />
            <span>Home</span>
          </Link>
        )}
      </div>

      {/* MAIN MAP WORKSPACE */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        {/* MAPLIBRE CANVAS */}
        <div ref={mapDivRef} className="absolute inset-0 z-0 h-full w-full" />

        {/* TOP FLOATING SEARCH & CONTROLS ON MOBILE */}
        <div className="md:hidden absolute top-2 left-2 right-2 z-[1000] space-y-2 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/80 p-2 pointer-events-auto flex items-center gap-2">
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
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100/80 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-whatsapp-500"
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
              className="text-[11px] font-semibold bg-slate-100/80 text-slate-700 px-2 py-1.5 rounded-xl border-none outline-none max-w-[110px] truncate"
            >
              {MAJOR_ZIMBABWE_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Category Pills on Mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto map-scrollbar pointer-events-auto px-1 bg-white/50 backdrop-blur-sm rounded-xl p-1.5 border border-white/80">
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
                  {cat.name === 'All' ? (
                    <LayoutGrid className="w-3 h-3" />
                  ) : (
                    <CategoryIcon categories={[cat.name]} className="w-3 h-3" />
                  )}
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
              className="flex items-center gap-2 bg-white/90 hover:bg-white backdrop-blur-xl text-slate-800 hover:text-whatsapp-700 px-4 py-2 rounded-full shadow-2xl border border-white/80 text-xs font-bold transition-all active:scale-95 hover:shadow-card hover:-translate-y-0.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-whatsapp-600 ${isAreaFilteringLoading ? 'animate-spin' : ''}`} />
              <span>Search this area</span>
            </button>
          </div>
        )}

        {/* TOP-RIGHT MAP CONTROLS CLUSTER */}
        <div className="absolute top-16 md:top-4 right-3 z-[1000] flex flex-col gap-2 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/80 shadow-xl p-1.5">
          {/* GPS Locate Me Button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all active:scale-90 ${
              isLocating
                ? 'bg-whatsapp-600 text-white border-whatsapp-700'
                : userCoords
                ? 'bg-sky-500 text-white border-sky-600 shadow-sky-500/25 ring-2 ring-sky-300'
                : 'bg-white/80 hover:bg-white text-slate-700 border-white/80'
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
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all active:scale-90 ${
                showLayerMenu
                  ? 'bg-whatsapp-600 text-white border-whatsapp-700'
                  : 'bg-white/80 hover:bg-white text-slate-700 border-white/80'
              }`}
              title="Change Map Style"
            >
              <Layers className="w-5 h-5" />
            </button>

            {/* Layer Popover Menu */}
            {showLayerMenu && (
              <div className="absolute right-0 top-12 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/80 p-2 space-y-1 animate-slide-up z-50">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Map Style
                </p>
                {providerButtons}
              </div>
            )}
          </div>

          {/* Zoom In & Out */}
          <div className="bg-white/80 rounded-xl border border-white/80 overflow-hidden flex flex-col">
            <button
              onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
              className="w-10 h-9 flex items-center justify-center text-slate-700 hover:text-whatsapp-700 hover:bg-white border-b border-white/80 transition-all active:scale-90"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
              className="w-10 h-9 flex items-center justify-center text-slate-700 hover:text-whatsapp-700 hover:bg-white transition-all active:scale-90"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>

          {/* Fit All Markers / Reset View Button */}
          <button
            onClick={handleFitAll}
            className="w-10 h-10 bg-white/80 hover:bg-white text-slate-700 hover:text-whatsapp-700 rounded-xl shadow-lg border border-white/80 flex items-center justify-center transition-all active:scale-90"
            title="Fit all markers in view"
          >
            <Navigation className="w-4 h-4 -rotate-45" />
          </button>

          {/* Share Map Button */}
          <button
            onClick={handleShareMap}
            className={`w-10 h-10 rounded-xl shadow-lg border flex items-center justify-center transition-all active:scale-90 ${
              copiedLink
                ? 'bg-whatsapp-600 text-white border-whatsapp-700 shadow-whatsapp-500/25'
                : 'bg-white/80 hover:bg-white text-slate-700 border-white/80'
            }`}
            title="Share this map"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={handleToggleFullscreen}
            className="w-10 h-10 bg-white/80 hover:bg-white text-slate-700 hover:text-whatsapp-700 rounded-xl shadow-lg border border-white/80 hidden sm:flex items-center justify-center transition-all active:scale-90"
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Clustering Toggle Button */}
          <button
            onClick={() => setClusteringEnabled(!clusteringEnabled)}
            className={`w-10 h-10 rounded-xl shadow-lg border flex items-center justify-center transition-all active:scale-90 ${
              clusteringEnabled
                ? 'bg-whatsapp-600 text-white border-whatsapp-700'
                : 'bg-white/80 hover:bg-white text-slate-700 border-white/80'
            }`}
            title={clusteringEnabled ? 'Disable clustering (show all pins)' : 'Enable clustering (group nearby pins)'}
          >
            <Grid className="w-5 h-5" />
          </button>
        </div>

        {/* SELECTED BUSINESS PREVIEW CARD / MODAL (FLOATING) */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto md:w-[380px] z-[1000] animate-slide-up">
            <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/80 p-4 relative overflow-hidden ring-1 ring-black/5">
              {/* Top gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-whatsapp-500 via-whatsapp-400 to-whatsapp-600" />

              {/* Close button */}
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-full bg-white/80 hover:bg-white backdrop-blur-sm text-slate-500 hover:text-slate-800 flex items-center justify-center absolute top-3.5 right-3.5 transition-all active:scale-90 border border-white/80"
                title="Close card"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3 mt-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-whatsapp-600 to-whatsapp-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-whatsapp-600/30">
                  <CategoryIcon categories={selected.category || []} className="w-6 h-6" strokeWidth={2.2} />
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
                        {selected.rating.toFixed(1)}
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
                    {(selected as { distanceKm?: number | null }).distanceKm !== undefined &&
                      (selected as { distanceKm?: number | null }).distanceKm !== null && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-whatsapp-700 font-bold">
                            {formatDistance((selected as { distanceKm?: number }).distanceKm!)}
                          </span>
                        </>
                      )}
                  </div>
                </div>
              </div>

              {/* Bio / Description snippet */}
              {selected.bio && (
                <p className="text-xs text-slate-600 line-clamp-2 mt-2.5 bg-white/70 backdrop-blur-sm p-2 rounded-xl border border-white/80">
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

              {/* PRODUCTS MODE: the seller's matching products */}
              {mode === 'products' && (selected.products?.length ?? 0) > 0 && (
                <div className="mt-3 rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                    {selected.productCount || selected.products!.length} matching{' '}
                    {(selected.productCount || selected.products!.length) === 1 ? 'product' : 'products'}
                  </p>
                  <ul className="space-y-1">
                    {selected.products!.map((product) => (
                      <li key={product.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-slate-700">{product.name}</span>
                        <span className="shrink-0 font-bold text-whatsapp-700">
                          {formatMoney(product.price, product.currency_code, product.price_type)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {(selected.productCount || 0) > selected.products!.length && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      +{(selected.productCount || 0) - selected.products!.length} more on the profile
                    </p>
                  )}
                </div>
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
                      <ArrowRightIcon />
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
                  ref={(el) => {
                    sidebarRowRefs.current[b.id] = el
                  }}
                  onClick={() => {
                    handleSelectBusiness(b)
                    setMobileTab('map')
                  }}
                  className="p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-whatsapp-100 text-whatsapp-800 flex items-center justify-center shrink-0">
                      <CategoryIcon categories={b.category || []} className="w-5 h-5" />
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
                          {b.rating.toFixed(1)}
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

function ArrowRightIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  )
}

// All built-in categories, so every pin image exists before any business
// arrives (also covers the "Other" fallback glyph).
const PIN_CATALOG: string[] = [...categories.map((c) => c.name), 'Other']

export { PIN_CATALOG }

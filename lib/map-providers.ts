// Tile provider registry for the WA Directory map (requirement: provider
// configurable without touching the map implementation).
//
// To switch providers or self-host tiles: edit the roots below (or set
// NEXT_PUBLIC_MAP_TILES_URL / NEXT_PUBLIC_MAP_FONTS_URL /
// NEXT_PUBLIC_MAP_ESRI_URL at build time). Attribution strings are part of
// the contract - never ship a provider without its required credit.

import type { StyleSpecification } from 'maplibre-gl'
import { buildLightStyle, buildSatelliteStyle } from './map-styles'

export type MapProviderId = 'light' | 'satellite'

// OpenFreeMap: free vector tiles, OpenMapTiles schema, no API key.
// Esri World_Imagery: raster aerial tiles (satellite basemap).
const TILES_URL =
  process.env.NEXT_PUBLIC_MAP_TILES_URL || 'https://tiles.openfreemap.org/planet'
const FONTS_URL =
  process.env.NEXT_PUBLIC_MAP_FONTS_URL || 'https://tiles.openfreemap.org/fonts'
const ESRI_URL =
  process.env.NEXT_PUBLIC_MAP_ESRI_URL ||
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

export interface MapProviderConfig {
  id: MapProviderId
  name: string
  description: string
  attribution: string
  maxZoom: number
  buildStyle: () => StyleSpecification
}

export const MAP_PROVIDERS: MapProviderConfig[] = [
  {
    id: 'light',
    name: 'Light',
    description: 'Custom WA Directory cartography',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &middot; <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a>',
    maxZoom: 19,
    buildStyle: () => buildLightStyle(TILES_URL, FONTS_URL),
  },
  {
    id: 'satellite',
    name: 'Satellite',
    description: 'Esri aerial imagery',
    attribution:
      'Imagery &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>, Earthstar Geographics &middot; Labels &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    maxZoom: 18,
    buildStyle: () => buildSatelliteStyle(TILES_URL, ESRI_URL, FONTS_URL),
  },
]

export const MAP_DEFAULT_PROVIDER: MapProviderId = 'light'

export function getMapProvider(id: MapProviderId): MapProviderConfig {
  return MAP_PROVIDERS.find((p) => p.id === id) || MAP_PROVIDERS[0]
}

export function isMapProviderId(id: string | null | undefined): id is MapProviderId {
  return !!id && MAP_PROVIDERS.some((p) => p.id === id)
}

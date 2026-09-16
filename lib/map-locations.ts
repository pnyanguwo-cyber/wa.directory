export interface CityCenter {
  name: string
  lat: number
  lng: number
  zoom: number
}

export const ZIMBABWE_CENTER: [number, number] = [-19.0154, 29.1549]
export const ZIMBABWE_DEFAULT_ZOOM = 7

export const MAJOR_ZIMBABWE_CITIES: CityCenter[] = [
  { name: 'All Zimbabwe', lat: -19.0154, lng: 29.1549, zoom: 7 },
  { name: 'Harare', lat: -17.8252, lng: 31.0335, zoom: 12 },
  { name: 'Bulawayo', lat: -20.1325, lng: 28.5803, zoom: 12 },
  { name: 'Chitungwiza', lat: -17.9911, lng: 31.0486, zoom: 13 },
  { name: 'Mutare', lat: -18.9689, lng: 32.6276, zoom: 13 },
  { name: 'Gweru', lat: -19.45, lng: 29.8167, zoom: 13 },
  { name: 'Chinhoyi', lat: -17.3667, lng: 30.2, zoom: 13 },
  { name: 'Victoria Falls', lat: -17.9243, lng: 25.8572, zoom: 13 },
  { name: 'Kwekwe', lat: -18.9286, lng: 29.8149, zoom: 13 },
  { name: 'Masvingo', lat: -20.0623, lng: 30.8564, zoom: 13 },
  { name: 'Beitbridge', lat: -22.2167, lng: 30.0, zoom: 13 },
  { name: 'Kadoma', lat: -18.3364, lng: 29.9172, zoom: 13 },
  { name: 'Marondera', lat: -18.1853, lng: 31.5519, zoom: 13 },
]

export const CITY_COORDS: Record<string, [number, number]> = {
  harare: [-17.8252, 31.0335],
  bulawayo: [-20.1325, 28.5803],
  chitungwiza: [-17.9911, 31.0486],
  mutare: [-18.9689, 32.6276],
  gweru: [-19.45, 29.8167],
  kwekwe: [-18.9286, 29.8149],
  kadoma: [-18.3364, 29.9172],
  masvingo: [-20.0623, 30.8564],
  chinhoyi: [-17.3667, 30.2],
  bindura: [-17.3, 31.3333],
  chegutu: [-18.1333, 30.15],
  marondera: [-18.1853, 31.5519],
  'victoria falls': [-17.9243, 25.8572],
  victoriafalls: [-17.9243, 25.8572],
  kariba: [-16.52, 28.8],
  zvishavane: [-20.3333, 30.0333],
  hwange: [-18.3667, 26.5],
  norton: [-17.8833, 30.7],
  rusape: [-18.5333, 32.1333],
  beitbridge: [-22.2167, 30.0],
  chiredzi: [-21.05, 31.6667],
  lupane: [-18.9333, 27.8],
  gwanda: [-20.9333, 29.0],
  plumtree: [-20.4833, 27.8167],
  chipinge: [-20.2, 32.6167],
  shurugwi: [-19.6667, 30.0],
  nyanga: [-18.2167, 32.7333],
  ruwa: [-17.8833, 31.25],
  redcliff: [-18.0333, 29.95],
}

export type TileLayerId = 'voyager' | 'osm' | 'satellite' | 'dark'

export interface TileLayerConfig {
  id: TileLayerId
  name: string
  description: string
  url: string
  attribution: string
  maxZoom: number
}

export const MAP_TILE_LAYERS: TileLayerConfig[] = [
  {
    id: 'voyager',
    name: 'Clean Street',
    description: 'Crisp & modern light map',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  {
    id: 'osm',
    name: 'Standard OSM',
    description: 'Detailed classic street map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  {
    id: 'satellite',
    name: 'Satellite',
    description: 'High-res aerial imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, Earthstar Geographics',
    maxZoom: 18,
  },
  {
    id: 'dark',
    name: 'Night Mode',
    description: 'High-contrast dark map',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
]

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function formatDistance(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000)
    return `${meters} m away`
  }
  if (km < 10) {
    return `${km.toFixed(1)} km away`
  }
  return `${Math.round(km)} km away`
}

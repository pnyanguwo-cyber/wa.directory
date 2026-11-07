// MapLibre style builders for WA Directory.
//
// Two basemaps: a premium light vector style over OpenFreeMap tiles
// (OpenMapTiles schema) and a satellite style (Esri raster imagery with
// vector place labels on top). Both are pure data - the map component
// hands them to map.setStyle() and never needs to know the provider.
//
// Layer id prefix "wa-" is reserved for the runtime business/user layers
// installed by business-map.tsx; keep basemap styles free of it.

import type { StyleSpecification } from 'maplibre-gl'

export type MapStylePreset = 'light' | 'satellite'

// Palette for the light cartographic style - tuned for a clean, calm,
// commercial discovery map: pale blue water, warm-neutral land, quiet roads.
const LIGHT = {
  background: '#F7F9FB',
  landcover: 'rgba(226, 240, 225, 0.55)',
  water: '#C7DCEB',
  waterway: '#B9D2E5',
  building: '#E3E9EF',
  buildingStroke: 'rgba(148, 163, 184, 0.25)',
  roadMinor: '#DFE5EC',
  road: '#CDD6E0',
  roadMajor: '#BFCBD9',
  boundary: 'rgba(148, 163, 184, 0.55)',
  labelDark: '#3F5068', // city / place labels
  labelLight: '#5B6B80', // neighbourhood + road labels
  labelHalo: 'rgba(255, 255, 255, 0.85)',
}

const FONT_STACK_REGULAR = 'Noto Sans Regular'
const FONT_STACK_BOLD = 'Noto Sans Bold'

export function glyphsUrlFor(fontsUrl: string): string {
  return `${fontsUrl}/{fontstack}/{range}.pbf`
}

// Shared skeleton; sources/layers are filled in per preset.
function baseSpec(glyphsUrl: string): StyleSpecification {
  return {
    version: 8,
    glyphs: glyphsUrl,
    sources: {},
    layers: [],
  }
}

// tilesUrl may be either a TileJSON document URL (e.g. OpenFreeMap's
// ".../planet" which advertises the real tile template) or a direct
// {z}/{x}/{y} template - both are accepted to keep providers swappable.
function vectorTilesSource(tilesUrl: string) {
  if (tilesUrl.includes('{z}')) {
    return {
      'wa-openmaptiles': {
        type: 'vector' as const,
        tiles: [tilesUrl],
        minzoom: 0,
        maxzoom: 14,
      },
    }
  }
  return {
    'wa-openmaptiles': {
      type: 'vector' as const,
      url: tilesUrl,
    },
  }
}

function esriRasterSource(tileUrl: string) {
  return {
    'wa-esri-imagery': {
      type: 'raster' as const,
      tiles: [tileUrl],
      tileSize: 256,
      maxzoom: 18,
    },
  }
}

function lightFillLayers(): StyleSpecification['layers'] {
  return [
    {
      id: 'wa-bg-light',
      type: 'background',
      paint: { 'background-color': LIGHT.background },
    },
    // Parks / green landcover - whisper subtle, only deep enough to read.
    {
      id: 'wa-landcover',
      type: 'fill',
      source: 'wa-openmaptiles',
      'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'park', 'forest']]],
      paint: {
        'fill-color': LIGHT.landcover,
        'fill-antialias': true,
      },
    },
    {
      id: 'wa-park',
      type: 'fill',
      source: 'wa-openmaptiles',
      'source-layer': 'park',
      minzoom: 6,
      paint: { 'fill-color': LIGHT.landcover },
    },
    {
      id: 'wa-water',
      type: 'fill',
      source: 'wa-openmaptiles',
      'source-layer': 'water',
      paint: { 'fill-color': LIGHT.water },
    },
    {
      id: 'wa-waterway',
      type: 'line',
      source: 'wa-openmaptiles',
      'source-layer': 'waterway',
      minzoom: 9,
      paint: {
        'line-color': LIGHT.waterway,
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 14, 2.4],
        'line-opacity': 0.9,
      },
    },
    // Building footprints (quiet fill + faint outline) at street zoom.
    {
      id: 'wa-building',
      type: 'fill',
      source: 'wa-openmaptiles',
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-color': LIGHT.building,
        'fill-outline-color': LIGHT.buildingStroke,
      },
    },
  ]
}

function lightRoadLayers(): StyleSpecification['layers'] {
  const roadLine = (
    id: string,
    classes: string[],
    color: string,
    stops: number[] // flat [zoom, width, zoom, width, ...]
  ): StyleSpecification['layers'][number] => ({
    id,
    type: 'line',
    source: 'wa-openmaptiles',
    'source-layer': 'transportation',
    minzoom: stops[0],
    filter: ['in', ['get', 'class'], ['literal', classes]],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': color,
      'line-width': ['interpolate', ['linear'], ['zoom'], ...stops],
    },
  })

  return [
    roadLine(
      'wa-road-minor',
      ['residential', 'service', 'track', 'pedestrian', 'living_street'],
      LIGHT.roadMinor,
      [12, 0.6, 14, 0.8, 19, 6]
    ),
    roadLine('wa-road-secondary', ['secondary', 'tertiary'], LIGHT.road, [8, 0.8, 14, 3, 19, 8]),
    roadLine('wa-road-primary', ['primary', 'trunk'], LIGHT.roadMajor, [6, 1, 14, 3.8, 19, 10]),
    roadLine('wa-road-motorway', ['motorway'], LIGHT.roadMajor, [5, 1.2, 14, 5, 19, 13]),
  ]
}

function placeLabelLayer(
  id: string,
  classes: string[],
  minzoom: number,
  size: number,
  bold: boolean,
  color: string = LIGHT.labelDark,
  halo: string = LIGHT.labelHalo,
  haloWidth: number = 1.4
): StyleSpecification['layers'][number] {
  return {
    id,
    type: 'symbol',
    source: 'wa-openmaptiles',
    'source-layer': 'place',
    minzoom,
    filter: ['in', ['get', 'class'], ['literal', classes]],
    layout: {
      'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
      'text-size': size,
      'text-font': [bold ? FONT_STACK_BOLD : FONT_STACK_REGULAR],
      'text-max-width': 8,
    },
    paint: {
      'text-color': color,
      'text-halo-color': halo,
      'text-halo-width': haloWidth,
    },
  }
}

function placeLabelLayers(
  colorOverride?: { dark?: string; light?: string; halo?: string; haloWidth?: number }
): StyleSpecification['layers'] {
  return [
    placeLabelLayer(
      'wa-place-capital',
      ['capital', 'city'],
      4,
      13,
      true,
      colorOverride?.dark,
      colorOverride?.halo,
      colorOverride?.haloWidth
    ),
    placeLabelLayer(
      'wa-place-town',
      ['town'],
      7,
      11,
      true,
      colorOverride?.light,
      colorOverride?.halo,
      colorOverride?.haloWidth
    ),
    placeLabelLayer(
      'wa-place-suburb',
      ['suburb', 'village'],
      9,
      10,
      false,
      colorOverride?.light,
      colorOverride?.halo,
      colorOverride?.haloWidth
    ),
    // Road name labels, tucked in at street zoom only.
    {
      id: 'wa-road-labels',
      type: 'symbol',
      source: 'wa-openmaptiles',
      'source-layer': 'transportation_name',
      minzoom: 14,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
        'text-size': 9.5,
        'text-font': [FONT_STACK_REGULAR],
        'text-max-angle': 45,
      },
      paint: {
        'text-color': LIGHT.labelLight,
        'text-halo-color': LIGHT.labelHalo,
        'text-halo-width': 1.2,
      },
    },
  ]
}

function boundaryLayer(): StyleSpecification['layers'][number] {
  return {
    id: 'wa-boundary',
    type: 'line',
    source: 'wa-openmaptiles',
    'source-layer': 'boundary',
    filter: ['<=', ['get', 'admin_level'], 4],
    paint: {
      'line-color': LIGHT.boundary,
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 12, 1.2],
      'line-dasharray': [3, 2],
    },
  }
}

/** Premium light cartographic style over OpenFreeMap vector tiles. */
export function buildLightStyle(tilesUrl: string, fontsUrl: string): StyleSpecification {
  const spec = baseSpec(glyphsUrlFor(fontsUrl))
  spec.sources = vectorTilesSource(tilesUrl) as StyleSpecification['sources']
  spec.layers = [
    ...lightFillLayers(),
    ...lightRoadLayers(),
    boundaryLayer(),
    ...placeLabelLayers(),
  ]
  return spec
}

/** Satellite style: Esri World_Imagery raster + readable vector place labels. */
export function buildSatelliteStyle(
  tilesUrl: string,
  esriTileUrl: string,
  fontsUrl: string
): StyleSpecification {
  const spec = baseSpec(glyphsUrlFor(fontsUrl))
  spec.sources = {
    ...esriRasterSource(esriTileUrl),
    ...vectorTilesSource(tilesUrl),
  } as StyleSpecification['sources']

  spec.layers = placeLabelLayers({
    dark: '#FFFFFF',
    light: '#F1F5F9',
    halo: 'rgba(15, 23, 42, 0.85)',
    haloWidth: 1.6,
  })
  // Imagery goes below the labels; drop the light-only road-name labels.
  spec.layers = [
    {
      id: 'wa-imagery',
      type: 'raster',
      source: 'wa-esri-imagery',
      paint: {},
    },
    ...spec.layers.filter((l) => l.id !== 'wa-road-labels'),
  ]
  return spec
}

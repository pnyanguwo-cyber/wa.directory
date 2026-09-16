// TEST-ONLY: backfill fake map coordinates for businesses without lat/lng so
// the /map page has pins during development. Coordinates cluster around the
// business's city center (jittered per business, deterministic by id) so the
// map looks realistic. Real geocoding from the registration form is untouched
// (only rows with NULL lat get seeded).
//
// Usage: node scripts/seed-test-coords.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// --- Minimal .env.local parser (no dotenv dependency needed) ---
const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const envVars = {}
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) envVars[m[1]] = m[2].trim()
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment/.env.local')
  process.exit(1)
}

const supabase = createClient(url, key)

// Deterministic hash → seeded PRNG so re-runs produce identical coords
// (no duplicate-looking drift between test runs).
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// City centers (lat, lng) + typical spread in degrees (~0.06° ≈ 6-7 km).
const CITY_CENTERS = {
  Harare: { lat: -17.8252, lng: 31.0335 },
  Bulawayo: { lat: -20.1325, lng: 28.6265 },
  Mutare: { lat: -18.9707, lng: 32.6709 },
  Gweru: { lat: -19.45, lng: 29.8167 },
  Kwekwe: { lat: -18.9281, lng: 29.8149 },
  Masvingo: { lat: -20.0637, lng: 30.8277 },
  'Chinhoyi': { lat: -17.3667, lng: 30.2 },
  'Chitungwiza': { lat: -18.0128, lng: 31.0756 },
  'Marondera': { lat: -18.1853, lng: 31.5519 },
  Bindura: { lat: -17.3019, lng: 31.3306 },
  Zvishavane: { lat: -20.3333, lng: 29.9833 },
  'Beitbridge': { lat: -22.2167, lng: 29.9833 },
  Bikita: { lat: -20.0667, lng: 31.3167 },
  'Victoria Falls': { lat: -17.9315, lng: 25.831 },
  'Kariba': { lat: -16.5167, lng: 28.8 },
  Hwange: { lat: -18.3667, lng: 26.4833 },
  'Chiredzi': { lat: -21.05, lng: 31.6667 },
  'Chegutu': { lat: -18.1333, lng: 30.1333 },
  'Norton': { lat: -17.8833, lng: 30.7 },
  'Ruwa': { lat: -17.8897, lng: 31.2447 },
  'Epworth': { lat: -17.89, lng: 31.1475 },
  'Ruwa/Epworth': { lat: -17.8897, lng: 31.2447 },
}
const DEFAULT_CENTER = { lat: -19.0154, lng: 29.1549 } // country centroid
const SPREAD = 0.06

const { data: businesses, error } = await supabase
  .from('businesses')
  .select('id, name, city, area, lat, lng')
  .is('lat', null)

if (error) {
  console.error('Query failed:', error.message)
  process.exit(1)
}
if (!businesses || businesses.length === 0) {
  console.log('Nothing to seed: every business already has coordinates.')
  process.exit(0)
}

let updated = 0
for (const b of businesses) {
  const center = CITY_CENTERS[b.city?.trim()] || DEFAULT_CENTER
  const rand = mulberry32(hash(b.id))
  // Spread picks inside the city or, for unknown cities, near the area name
  // basis — jittered uniformly in a square, deterministic per business id.
  const jitterLat = (rand() - 0.5) * 2 * SPREAD
  const jitterLng = (rand() - 0.5) * 2 * SPREAD
  const lat = Number((center.lat + jitterLat).toFixed(6))
  const lng = Number((center.lng + jitterLng).toFixed(6))

  const { error: updErr } = await supabase
    .from('businesses')
    .update({ lat, lng, address_verified: false })
    .eq('id', b.id)
  if (updErr) {
    console.error(`✗ ${b.name}: ${updErr.message}`)
  } else {
    updated++
    console.log(`✓ ${b.name} [${b.city || b.area || 'no city'}] → ${lat}, ${lng}`)
  }
}

console.log(`\nSeeded ${updated}/${businesses.length} businesses with test coordinates.`)

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !PEXELS_API_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PEXELS_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Harare, Zimbabwe — geolocation anchor for Wikimedia results (COVER_PHOTOS.md §2)
const HARARE = { lat: -17.8252, lon: 31.0335 }
const WIKIMEDIA_RADIUS_KM = 500
const MIN_WIDTH = 1200
const MIN_HEIGHT = 630
const PEXELS_HD_WIDTH = 1920
const USER_AGENT = 'wa-directory/1.0 (cover-photo ingestion pipeline)'

// Ensure the 'categories' storage bucket exists
async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.some(b => b.name === 'categories')) return
  const { error } = await supabase.storage.createBucket('categories', { public: true })
  if (error && !error.message?.includes('already exists')) throw error
  console.log('Created "categories" storage bucket')
}
await ensureBucket()

// ── Parse categories from categories.ts ──────────────────────────────────
const categoriesPath = resolve(__dirname, '..', 'data', 'categories.ts')
const src = readFileSync(categoriesPath, 'utf-8')

const nameRegex = /name:\s*'([^']+)'/g
const categories = []
let m
while ((m = nameRegex.exec(src)) !== null) {
  categories.push(m[1])
}

console.log(`Found ${categories.length} categories\n`)

// ── Search queries ───────────────────────────────────────────────────────
// Wikimedia queries: simpler, more specific (filtered by distance from Harare)
const wikimediaQueries = {
  'Baker':                'bakery bread',
  'Plumber':              'plumbing pipes wrench',
  'Electrician':          'electrician wires cables',
  'Food & Restaurant':    'restaurant food dining',
  'Hair & Beauty':        'hair salon braids',
  'Building Materials':   'construction materials bricks',
  'Clothing & Fashion':   'fashion clothing market',
  'Automotive':           'car mechanic repair',
  'Cleaning Services':    'cleaning service professional',
  'Farming & Agriculture':'tobacco farm field',
  'Health & Medical':     'hospital doctor medical',
  'Education & Tutoring': 'school classroom students',
  'IT & Web':             'computer technology office',
  'Transport & Delivery': 'delivery truck vehicle',
  'Real Estate':          'house building modern',
  'Financial Services':   'bank office finance',
  'Legal Services':       'law office books',
  'Photography':          'photographer camera',
  'Electronics':          'electronics store gadgets',
  'Pet Services':         'dog pet grooming',
  'Mining':               'platinum mine mining',
  'Utilities':            'solar panels energy',
  'Manufacturing':        'factory production workers',
  'Wholesale':            'warehouse shelves goods',
  'Security Services':    'security guard',
  'Funeral Services':     'funeral flowers memorial',
  'Fitness & Gym':        'gym fitness workout',
  'Printing':             'printing press',
  'Jewelry':              'gemstone emerald jewelry',
  'Entertainment':        'concert music stage',
  'Hotel & Lodging':      'safari lodge hotel',
  'Travel & Tourism':     'Victoria Falls waterfall',
  'Brewery':              'beer brewery craft',
  'Professional Services':'office meeting business',
  'Music Studio':         'recording studio music',
  'Translation':          'books languages library',
  'Nonprofit':            'community volunteers',
  'Daycare':              'children playing school',
  'Coworking Space':      'coworking office modern',
  'Landscaping':          'garden landscaping',
  'Emergency Services':   'fire truck emergency',
  'Government Services':  'government building',
  'Other':                'office meeting professional',
}

// Pexels fallback queries (Zimbabwe/African focused)
const pexelsQueries = {
  'Baker':                'Zimbabwe bakery bread fresh',
  'Plumber':              'plumbing tools Zimbabwe',
  'Electrician':          'electrician work Zimbabwe',
  'Food & Restaurant':    'Zimbabwe restaurant Harare food',
  'Hair & Beauty':        'African hair salon braids beauty',
  'Building Materials':   'construction materials Africa',
  'Clothing & Fashion':   'African fashion dress vibrant',
  'Automotive':           'mechanic auto repair Africa',
  'Cleaning Services':    'cleaning professional Africa',
  'Farming & Agriculture':'Zimbabwe tobacco farm field',
  'Health & Medical':     'Zimbabwe hospital doctor',
  'Education & Tutoring': 'Zimbabwe school classroom students',
  'IT & Web':             'tech office laptop Africa',
  'Transport & Delivery': 'delivery van Africa',
  'Real Estate':          'modern house Zimbabwe',
  'Financial Services':   'bank office Africa',
  'Legal Services':       'law office Africa',
  'Photography':          'photographer camera Africa',
  'Electronics':          'electronics store Africa',
  'Pet Services':         'pet grooming dog Africa',
  'Mining':               'Zimbabwe mining platinum',
  'Utilities':            'Zimbabwe solar panels energy',
  'Manufacturing':        'factory workers Africa',
  'Wholesale':            'warehouse Africa',
  'Security Services':    'security guard Zimbabwe',
  'Funeral Services':     'memorial flowers Africa',
  'Fitness & Gym':        'gym workout Africa',
  'Printing':             'printing press Africa',
  'Jewelry':              'Zimbabwe emerald gemstone jewelry',
  'Entertainment':        'concert music Africa',
  'Hotel & Lodging':      'Zimbabwe safari lodge hotel',
  'Travel & Tourism':     'Zimbabwe Victoria Falls safari',
  'Brewery':              'craft beer brewery Africa',
  'Professional Services':'business meeting Africa',
  'Music Studio':         'recording studio Africa',
  'Translation':          'books languages Africa',
  'Nonprofit':            'community volunteers Africa',
  'Daycare':              'children playing Africa',
  'Coworking Space':      'coworking space Africa',
  'Landscaping':          'garden landscaping Zimbabwe',
  'Emergency Services':   'fire truck emergency Africa',
  'Government Services':  'Zimbabwe government building flag',
  'Other':                'professional office Africa',
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Helpers ──────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// ── Buffer validation: magic-byte MIME sniff + dimension parse (no deps) ──
function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

function imageDimensions(buf, mime) {
  try {
    if (mime === 'image/png') {
      // IHDR is always the first chunk: width @ 16, height @ 20 (big-endian)
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
    }
    if (mime === 'image/jpeg') {
      // Walk marker segments to the SOF frame header
      let pos = 2 // skip SOI
      while (pos + 9 < buf.length) {
        if (buf[pos] !== 0xff) { pos += 1; continue }
        const marker = buf[pos + 1]
        if (marker === 0xff) { pos += 1; continue }
        // Standalone markers carry no length payload
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { pos += 2; continue }
        const segmentLength = buf.readUInt16BE(pos + 2)
        // SOF0–SOF15 hold frame size; skip DHT (C4), JPG (C8), DAC (CC)
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buf.readUInt16BE(pos + 5), width: buf.readUInt16BE(pos + 7) }
        }
        pos += 2 + segmentLength
      }
      return null
    }
    if (mime === 'image/webp') {
      const fourCC = buf.toString('ascii', 12, 16)
      if (fourCC === 'VP8 ') {
        // Lossy: sync code 9D 01 2A at offset 23, then 14-bit dims at 26/28
        if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null
        return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
      }
      if (fourCC === 'VP8L') {
        // Lossless: signature 0x2F at offset 20, packed 14-bit dims follow
        if (buf[20] !== 0x2f) return null
        const bits = buf.readUInt32LE(21)
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
      }
      if (fourCC === 'VP8X') {
        // Extended: canvas size as 24-bit LE width-1/height-1 at offsets 24/27
        return {
          width: buf.readUIntLE(24, 3) + 1,
          height: buf.readUIntLE(27, 3) + 1,
        }
      }
      return null
    }
  } catch {
    return null
  }
  return null
}

function validateImageBuffer(buf) {
  const mime = sniffImageType(buf)
  if (!mime) throw new Error('unrecognized image format (expected JPEG, PNG, or WebP)')
  const dims = imageDimensions(buf, mime)
  if (!dims || !dims.width || !dims.height) throw new Error('could not read image dimensions')
  if (dims.width < MIN_WIDTH || dims.height < MIN_HEIGHT) {
    throw new Error(`below minimum ${MIN_WIDTH}x${MIN_HEIGHT} (got ${dims.width}x${dims.height})`)
  }
  return { mime, ...dims }
}

// Wikimedia Commons API — text search filtered by distance from Harare (COVER_PHOTOS.md §2)
const SUPPORTED_MIMES = ['image/jpeg', 'image/png', 'image/webp']

async function searchWikimedia(query) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '20',
    prop: 'imageinfo|coordinates',
    iiprop: 'url|size|mime',
    format: 'json',
  })

  const url = `https://commons.wikimedia.org/w/api.php?${params}`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) return null

  const data = await res.json()
  const pages = Object.values(data.query?.pages || {})

  const matches = []
  for (const page of pages) {
    const info = page.imageinfo?.[0]
    const coord = page.coordinates?.[0]
    if (!info || !coord) continue
    if (!SUPPORTED_MIMES.includes(info.mime)) continue
    if (!info.url || !info.width || !info.height) continue
    if (info.width < info.height) continue // landscape only
    if (info.width < MIN_WIDTH || info.height < MIN_HEIGHT) continue

    const km = distanceKm(HARARE.lat, HARARE.lon, coord.lat, coord.lon)
    if (km > WIKIMEDIA_RADIUS_KM) continue
    matches.push({ url: info.url, width: info.width, km })
  }

  if (matches.length === 0) return null
  // Prefer closest to Harare, then largest
  matches.sort((a, b) => a.km - b.km || b.width - a.width)
  return { url: matches[0].url, source: 'wikimedia' }
}

// Pexels API fallback
async function searchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape&size=large`
  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } })
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${res.statusText}`)
  const data = await res.json()

  const photos = data.photos || []
  if (photos.length === 0) return null

  // Sort by width (prefer larger), then prefer true HD results
  photos.sort((a, b) => (b.width || 0) - (a.width || 0))
  const best = photos.find((p) => (p.width || 0) >= PEXELS_HD_WIDTH) || photos[0]
  const bestUrl = best.src?.original || best.src?.large2x || best.src?.landscape
  if (!bestUrl) return null
  return { url: bestUrl, source: 'pexels' }
}

async function downloadValidated(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`download failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const { mime } = validateImageBuffer(buf)
  return { buf, mime }
}

async function uploadToSupabase(slug, imageBuffer, contentType) {
  const path = `categories/${slug}.jpg`
  const { error } = await supabase.storage
    .from('categories')
    .upload(path, imageBuffer, {
      contentType,
      upsert: true,
    })
  if (error) throw error
  const { data } = supabase.storage.from('categories').getPublicUrl(path)
  return data.publicUrl
}

// Raw Wikimedia/Pexels originals can be 3–5 MB; that stalls the Next image
// optimizer on first paint (blank hero until it finishes). Re-encode every
// cover to a light JPEG before upload. Keep in sync with
// scripts/compress-category-images.mjs (MAX_WIDTH/MAX_HEIGHT/JPEG_QUALITY).
const MAX_COVER_WIDTH = 2400
const MAX_COVER_HEIGHT = 1350
async function compressImage(input) {
  return sharp(input)
    .rotate() // bake EXIF orientation
    .resize({ width: MAX_COVER_WIDTH, height: MAX_COVER_HEIGHT, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 74, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toBuffer()
}

// ── Main ─────────────────────────────────────────────────────────────────
const results = {}
let success = 0
let skipped = 0
let wikimediaCount = 0
let pexelsCount = 0

for (const name of categories) {
  const slug = slugify(name)
  const wmQuery = wikimediaQueries[name] || name.toLowerCase()
  const pxQuery = pexelsQueries[name] || name.toLowerCase()

  process.stdout.write(`[${name}] `)

  try {
    // Try Wikimedia Commons first (text search + geolocation filter near Harare)
    let result = await searchWikimedia(wmQuery)
    let downloaded = null

    if (result) {
      process.stdout.write(`Wikimedia ✓ `)
      try {
        downloaded = await downloadValidated(result.url)
      } catch (err) {
        process.stdout.write(`(rejected: ${err.message}) – falling back `)
        result = null
      }
    }

    // Fallback to Pexels
    if (!result) {
      result = await searchPexels(pxQuery)
      if (!result) {
        console.log('no results – skipping')
        skipped++
        continue
      }
      process.stdout.write(`Pexels ✓ `)
      pexelsCount++
      downloaded = await downloadValidated(result.url)
    } else {
      wikimediaCount++
    }

    const compressedBuf = await compressImage(downloaded.buf)
    const publicUrl = await uploadToSupabase(slug, compressedBuf, 'image/jpeg')
    console.log(`(compressed ${(downloaded.buf.length / 1024).toFixed(0)} → ${(compressedBuf.length / 1024).toFixed(0)} KB)`)
    results[name] = publicUrl
    console.log(`→ ${publicUrl}`)
    success++
  } catch (err) {
    console.log(`error – ${err.message}`)
    skipped++
  }

  // Respect rate limits (Wikimedia: ~200ms between requests is polite)
  await sleep(300)
}

// ── Write JSON + TypeScript map ──────────────────────────────────────────
const jsonPath = resolve(__dirname, '..', 'data', 'category-images.json')
const tsPath = resolve(__dirname, '..', 'data', 'category-images.ts')

// Preserve existing URLs for categories that failed to refresh this run
// so a transient provider error never shrinks site coverage.
const existing = {}
try {
  const prevSrc = readFileSync(tsPath, 'utf-8')
  const prevRegex = /'([^']+)':\s*'([^']+)'/g
  let pm
  while ((pm = prevRegex.exec(prevSrc)) !== null) {
    existing[pm[1]] = pm[2]
  }
} catch {}

const merged = {}
let preserved = 0
for (const name of categories) {
  if (results[name]) {
    merged[name] = results[name]
  } else if (existing[name]) {
    merged[name] = existing[name]
    preserved++
  }
}

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const tsLines = [
  '// Static mapping of category name → cover image URL (hosted on Supabase Storage).',
  '// Generated by scripts/fetch-category-images.mjs — do not edit by hand.',
  '// Sources: Wikimedia Commons (geosearch near Zimbabwe) with Pexels fallback.',
  '',
  'export const CATEGORY_IMAGES: Record<string, string> = {',
  ...Object.entries(merged).map(([name, url]) => `  ${q(name)}: ${q(url)},`),
  '}',
  '',
  '/** Return the cover image URL for a business\'s primary category, or null. */',
  'export function getCategoryImage(categories?: string[] | null): string | null {',
  '  if (!categories || categories.length === 0) return null',
  '  for (const cat of categories) {',
  '    const url = CATEGORY_IMAGES[cat]',
  '    if (url) return url',
  '  }',
  "  return CATEGORY_IMAGES['Other']",
  '}',
  '',
]

writeFileSync(jsonPath, JSON.stringify(merged, null, 2) + '\n')
writeFileSync(tsPath, tsLines.join('\n'))

console.log(`\nDone: ${success} uploaded, ${skipped} skipped, ${preserved} previous URLs preserved`)
console.log(`  Wikimedia: ${wikimediaCount}, Pexels: ${pexelsCount}`)
console.log(`Output: ${tsPath}`)
console.log(`Output: ${jsonPath}`)

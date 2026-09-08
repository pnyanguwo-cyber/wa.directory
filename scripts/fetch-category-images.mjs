import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PEXELS_API_KEY = 'r4UclGmUkeo3DDCTefX0lBC9bHu3pOgtqCsymAlDIIb0agtQWDb2vJJl'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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
// Wikimedia queries: simpler, more specific (used with Zimbabwe geosearch)
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

// Wikimedia Commons API - geosearch near Zimbabwe
async function searchWikimedia(query) {
  // Zimbabwe center: lat=-17.8, lon=31.0, radius=200km
  const searchQuery = `Zimbabwe ${query}`
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: searchQuery,
    gsrnamespace: '6',
    prop: 'imageinfo',
    iiprop: 'url|size|mime',
    gsrlimit: '10',
    format: 'json',
  })
  
  const url = `https://commons.wikimedia.org/w/api.php?${params}`
  const res = await fetch(url)
  if (!res.ok) return null
  
  const data = await res.json()
  const pages = data.query?.pages || {}
  
  // Find first valid landscape image
  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0]
    if (!info) continue
    
    // Must be image
    if (!info.mime?.startsWith('image/')) continue
    
    // Prefer landscape (width > height)
    if (info.width && info.height && info.width < info.height) continue
    
    // Skip tiny images
    if (info.width < 800 || info.height < 400) continue
    
    // Must be a direct file URL
    if (!info.url) continue
    
    return { url: info.url, source: 'wikimedia' }
  }
  
  return null
}

// Pexels API fallback
async function searchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=large`
  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } })
  if (!res.ok) throw new Error(`Pexels ${res.status}: ${res.statusText}`)
  const data = await res.json()
  
  // Pick best result (prefer larger images)
  const photos = data.photos || []
  if (photos.length === 0) return null
  
  // Sort by width (prefer larger)
  photos.sort((a, b) => (b.width || 0) - (a.width || 0))
  return { url: photos[0].src.large || photos[0].src.landscape, source: 'pexels' }
}

async function uploadToSupabase(slug, imageBuffer) {
  const path = `categories/${slug}.jpg`
  const { error } = await supabase.storage
    .from('categories')
    .upload(path, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })
  if (error) throw error
  const { data } = supabase.storage.from('categories').getPublicUrl(path)
  return data.publicUrl
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
    // Try Wikimedia Commons first (geosearch near Zimbabwe)
    let result = await searchWikimedia(wmQuery)
    
    if (result) {
      process.stdout.write(`Wikimedia ✓ `)
      wikimediaCount++
    } else {
      // Fallback to Pexels
      result = await searchPexels(pxQuery)
      if (result) {
        process.stdout.write(`Pexels ✓ `)
        pexelsCount++
      }
    }
    
    if (!result) {
      console.log('no results – skipping')
      skipped++
      continue
    }

    // Download image
    const imgRes = await fetch(result.url)
    if (!imgRes.ok) throw new Error(`Download failed: ${imgRes.status}`)
    const buf = Buffer.from(await imgRes.arrayBuffer())

    // Convert to JPEG if needed (Wikimedia may serve PNG)
    let finalBuf = buf
    const contentType = imgRes.headers.get('content-type') || ''
    if (!contentType.includes('jpeg') && !contentType.includes('jpg')) {
      // Upload as-is, Supabase will handle it
      // Or we could convert, but for now just upload
    }

    const publicUrl = await uploadToSupabase(slug, finalBuf)
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

// ── Write JSON ───────────────────────────────────────────────────────────
const outPath = resolve(__dirname, '..', 'data', 'category-images.json')
writeFileSync(outPath, JSON.stringify(results, null, 2) + '\n')

console.log(`\nDone: ${success} uploaded, ${skipped} skipped`)
console.log(`  Wikimedia: ${wikimediaCount}, Pexels: ${pexelsCount}`)
console.log(`Output: ${outPath}`)

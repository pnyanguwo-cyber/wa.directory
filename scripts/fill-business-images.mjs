// Fill all image spaces for one business: searches Pexels per product name
// and for bakery/gallery shots, resizes with sharp, uploads to the public
// `business-media` storage bucket, then updates business_items.image_url and
// businesses.site_content.gallery. Usage:
//   node scripts/fill-business-images.mjs <slug>
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

function loadEnv() {
  const env = readFileSync('.env.local', 'utf8')
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env: supabase keys')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Query strings tuned per product name (generic fallback = middle word).
function queriesFor(name) {
  const n = name.toLowerCase().trim()
  const exact = {
    'white bread loaf': ['white bread loaf bakery', 'sliced white bread'],
    'whole wheat loaf': ['whole wheat bread loaf', 'brown bread loaf bakery'],
    'dozen vetko': ['vetko fried dough', 'amagwinya fat cake', 'fried dough rolls'],
    'dozen scones': ['scones cream tea', 'fresh baked scones bakery'],
    'chocolate fudge cake (1kg)': ['chocolate fudge cake', 'chocolate layer cake'],
    'two-tier wedding cake': ['two tier wedding cake', 'wedding cake tiers white'],
  }
  for (const key of Object.keys(exact)) {
    if (n === key || n.includes(key.replace(' (1kg)', ''))) return exact[key]
  }
  const words = n.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  return [words.filter(w => w.length > 2).join(' ') || n, 'bakery bread']
}

// Gallery/hero queries for a bakery-class demo. When `--bright` is passed,
// queries lean toward sunlit shots so the hero photo reads clearly.
const BRIGHT = process.argv.includes('--bright')
const BUSINESS_SHOTS = BRIGHT
  ? ['sunlit bakery storefront', 'bakery bread display warm morning light', 'fresh bread loaves shelf daylight', 'bakeshop counter bright interior', 'artisan bread morning market', 'croissants golden sunlight']
  : ['artisan bakery shop interior', 'bakery bread display shelves', 'baker kneading dough hands flour', 'fresh pastries baking tray', 'bakery storefront', 'croissants baker cafe']

// Wikimedia Commons text search (no key needed) — returns thumb URLs at a
// consistent width so downloads stay light. No geo filter: relevance wins.
const SUPPORTED_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const UA = 'wa-directory/1.0 (fill-business-images; contact: bot@wadirectory)'

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function commonsSearch(query, thumbWidth = 1600) {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '15',
    prop: 'imageinfo',
    iiprop: 'url|size|mime',
    iiurlwidth: String(thumbWidth),
    format: 'json',
  })
  const url = `https://commons.wikimedia.org/w/api.php?${params}`
  const headers = { 'User-Agent': UA }
  let res = await fetch(url, { headers })
  if (res.status === 429) {
    await sleep(4000)
    res = await fetch(url, { headers })
  }
  if (!res.ok) {
    console.error(`  commons ${res.status} for "${query}"`)
    return []
  }
  await sleep(1500)
  const json = await res.json()
  const pages = Object.values(json.query?.pages || {})
  const out = []
  for (const page of pages) {
    const info = page.imageinfo?.[0]
    if (!info) continue
    const mime = info.mime || ''
    if (!SUPPORTED_MIMES.includes(mime)) continue
    const u = info.thumburl || info.url
    if (!u) continue
    if ((info.width || 0) < (info.height || 0)) continue // landscape only
    out.push({ url: u })
    if (out.length >= 3) break
  }
  return out
}

async function fetchImage(url, { width, height }) {
  const res = await fetch(url, { headers: { 'User-Agent': 'wa-directory/1.0' } })
  if (!res.ok) throw new Error(`download ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const opts = height
    ? { width, height, fit: 'cover', position: 'centre' }
    : { width, withoutEnlargement: true }
  return sharp(buf).resize(opts).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
}

const HERO_W = 1600
const TILE_W = 900

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  if (buckets?.some(b => b.name === 'business-media')) return
  const { error } = await supabase.storage.createBucket('business-media', { public: true })
  if (error && !error.message?.includes('already exists')) throw error
  console.log('Created "business-media" bucket')
  await ensureBucketCreator()
}
async function ensureBucketCreator() {
  await supabase.storage.updateBucket('business-media', { public: true })
}

async function uploadJpeg(slug, path, buffer) {
  const { error } = await supabase.storage
    .from('business-media')
    .upload(`${slug}/${path}`, buffer, { contentType: 'image/jpeg', upsert: true })
  if (error && !error.message?.includes('exists')) throw error
  const ref = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0]
  return `https://${ref}.supabase.co/storage/v1/object/public/business-media/${slug}/${path}`
}

const slug = process.argv[2]
if (!slug) {
  console.error('Usage: node scripts/fill-business-images.mjs <business-slug>')
  process.exit(1)
}

const { data: business, error: bizErr } = await supabase
  .from('businesses')
  .select('id, name, slug, site_content')
  .eq('slug', slug)
  .maybeSingle()
if (bizErr || !business) {
  console.error(`Business "${slug}" not found  ${bizErr?.message || ''}`)
  process.exit(1)
}
console.log(`Filling images for: ${business.name}`)

const { data: items, error: itemsErr } = await supabase
  .from('business_items')
  .select('id, name, price, slug, image_url')
  .eq('business_id', business.id)
  .eq('is_active', true)
  .order('price')
if (itemsErr) throw itemsErr
const pending = items.filter(i => !i.image_url)
console.log(`Active products: ${items.length} (need photos: ${pending.length})`)

await ensureBucket()

// ---- 1. Product photos ---------------------------------------------------
const itemUrls = {}
for (const item of pending) {
    const tries = queriesFor(item.name)
    let done = false
    for (const q of tries) {
      console.log(`[${item.name}] commons: "${q}"`)
      const results = await commonsSearch(q)
      for (const photo of results) {
        try {
          const buf = await fetchImage(photo.url, { width: TILE_W, height: 675 })
        const path = `item-${item.id}.jpg`
        itemUrls[item.id] = await uploadJpeg(slug, path, buf)
        console.log(`  ✓  ${itemUrls[item.id]}`)
        done = true
        break
      } catch (e) {
        console.log(`  ✗  ${e.message}`)
      }
    }
    if (done) break
  }
  if (!done) console.log(`  !! no photo for ${item.name}`)
}

for (const [id, image_url] of Object.entries(itemUrls)) {
  const { error: oneErr } = await supabase.from('business_items').update({ image_url }).eq('id', id)
  if (oneErr) throw oneErr
}
if (Object.keys(itemUrls).length) console.log(`Updated ${Object.keys(itemUrls).length} product photos`)

// ---- 2. Gallery + hero shots ---------------------------------------------
const gallery = []
for (const q of BUSINESS_SHOTS) {
  console.log(`[gallery] commons: "${q}"`)
  const results = await commonsSearch(q)
  for (const photo of results) {
    const path = `gallery-${gallery.length + 1}.jpg`
    try {
      const buf = await fetchImage(photo.url, { width: HERO_W, height: 1000 })
      const url = await uploadJpeg(slug, path, buf)
      gallery.push(url)
      console.log(`  ✓  ${url}`)
      break
    } catch (e) {
      console.log(`  ✗  ${e.message}`)
    }
  }
}

// Preserve tagline/faq/hours — only set gallery.
const content = { ...(business.site_content || {}) }
content.gallery = gallery
const { error: contentErr } = await supabase
  .from('businesses')
  .update({ site_content: content })
  .eq('id', business.id)
if (contentErr) throw contentErr
console.log(`Gallery set with ${gallery.length} photos`)

console.log('DONE — items:', Object.keys(itemUrls).length, '| gallery:', gallery.length)

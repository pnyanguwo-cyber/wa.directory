// Fill all image spaces for one business: searches Wikimedia Commons per
// product name and for category gallery shots, resizes with sharp, uploads to the public
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

// When `--bright` is passed, bakery queries lean toward sunlit shots so the
// hero photo reads clearly on light page themes.
const BRIGHT = process.argv.includes('--bright')

// Gallery/hero + generic-fallback queries, tuned per business category.
function categoryShots(category = '', bright = BRIGHT) {
  let raw = category || ''
  if (Array.isArray(raw)) raw = raw.filter(v => typeof v === 'string').join(' ')
  if (raw && typeof raw === 'object') raw = raw.name || raw.title || ''
  const c = String(raw).toLowerCase()
  if (/bak/.test(c)) return bright
    ? ['sunlit bakery storefront', 'bakery bread display warm morning light', 'fresh bread loaves shelf daylight', 'bakeshop counter bright interior', 'artisan bread morning market']
    : ['artisan bakery shop interior', 'bakery bread display shelves', 'baker kneading dough hands flour', 'fresh pastries baking tray', 'bakery storefront']
  if (/restaurant|kitchen|food|eat|cater/.test(c)) return ['restaurant kitchen cooking chef', 'restaurant dining tables interior', 'chef plating food kitchen', 'grilled food plate restaurant', 'cafe interior tables counter']
  if (/jewel|goldsmith/.test(c)) return ['goldsmith workshop hands', 'jewellery display window shop', 'gold ring craft hands', 'jeweler working bench tools']
  if (/tutor|education|school|study|academ/.test(c)) return ['study desk books lamp', 'tutor student classroom lesson', 'library study room reading', 'school books stationery desk']
  if (/securit|guard/.test(c)) return ['security guard uniform patrol', 'cctv security cameras wall', 'security control room monitors', 'chain link fence gate']
  if (/hotel|lodg|guest/.test(c)) return ['hotel lobby interior', 'hotel room bed tidy', 'hotel exterior entrance', 'breakfast table hotel room']
  if (/plumb/.test(c)) return ['plumber wrench pipes working', 'copper water pipes installation', 'plumber fixing sink bathroom', 'plumbing tools workbench']
  if (/financ|account|tax|bookkeep|loan/.test(c)) return ['accountant desk calculator documents', 'financial ledger paperwork office', 'calculator receipts desk accounting', 'office business meeting documents']
  if (/hardware|building material|construct/.test(c)) return ['hardware store shelves tools', 'construction site materials sand', 'cement bags stacked site', 'paint buckets row hardware']
  if (/mining|mine/.test(c)) return ['gold mine shaft entrance', 'mining workers equipment underground', 'geological rock samples tray', 'open pit mine landscape']
  if (/tour|travel|safari|park/.test(c)) return ['tourists guided tour group', 'african safari savanna landscape', 'traveler map camera backpack', 'heritage monument ancient stones']
  if (/veterinar|vet|pet/.test(c)) return ['veterinarian examining dog clinic', 'veterinary clinic cat', 'pet care dog grooming', 'vet stethoscope animal']
  if (/gym|fitness/.test(c)) return ['gym weights equipment interior', 'fitness training dumbbells rack', 'gym interior machines rows', 'personal trainer workout session']
  if (/sound|audio|music|dj|band/.test(c)) return ['audio mixing console studio', 'loudspeakers sound system event', 'recording studio microphone booth', 'dj controller equipment setup']
  if (/propert|real estate|estate agent/.test(c)) return ['modern house exterior street', 'real estate agent handing keys', 'house for sale sign garden', 'apartment building facade']
  if (/electron|gadget|phone|computer repair/.test(c)) return ['electronics repair workshop bench', 'smartphone devices on display', 'circuit board components closeup', 'tv screens electronics store shelf']
  if (/courier|haulage|transport|logistic|deliver/.test(c)) return ['parcel delivery boxes van', 'cargo truck highway road', 'courier handing parcel customer', 'warehouse logistics loading dock']
  if (/electric/.test(c)) return ['electrician working on wires', 'electrical distribution panel wiring', 'electricians tools toolkit table', 'ceiling light installation work']
  if (/daycare|child|kids|tot|nursery/.test(c)) return ['children playing kindergarten classroom', 'preschool toys kids table', 'kids drawing crayons crafts', 'playground children playing outdoor']
  if (/motor|garage| auto|car serv/.test(c)) return ['car mechanic garage workshop', 'car engine bay repair', 'auto mechanic tools garage bench', 'car on lift workshop service']
  if (/clean/.test(c)) return ['cleaning supplies mop bucket', 'housekeeper cleaning bright room', 'cleaning crew uniforms office', 'window cleaning squeegee glass']
  if (/hair|salon|beauty|barber/.test(c)) return ['hair salon chairs mirrors interior', 'hairdresser cutting clients hair', 'braiding hair salon work', 'barber shop grooming chair']
  if (/steel|metal|wire|weld|fabricat/.test(c)) return ['steel wire coils factory', 'welding sparks workshop metal', 'metal fabrication workshop tools', 'steel mesh fencing rolls']
  if (/law|legal|chamber|advocate/.test(c)) return ['law books library shelf', 'lawyer office desk documents', 'courthouse columns architecture', 'signing contract pen document']
  if (/digit|agency|software|web|tech|internet/.test(c)) return ['laptop computer workspace', 'code programming monitor screen', 'technology gadgets table', 'office computer desks modern']
  if (/agri|farm|seed|feed|grain/.test(c)) return ['maize field green crop', 'farm tractor plowing field', 'poultry farm chickens', 'sacks grain market']
  if (/tailor|sewing|fashion|cloth/.test(c)) return ['tailor sewing machine workshop', 'colorful fabric rolls textile shop', 'tailor measuring fabric suit', 'sewing thread spools table']
  if (/photo|lens|camera/.test(c)) return ['professional camera photographer working', 'photography studio lights setup', 'photographer shooting landscape tripod', 'camera lenses laid on table']
  if (/brew|beer|drink|beverage/.test(c)) return ['beer barrels brewery', 'beer glasses bar counter', 'brewery fermentation barrels', 'glass bottles production line']
  if (/wholesale|depot|retail|supermarket|store|shop/.test(c)) return ['warehouse shelves stacked', 'warehouse pallets stacked goods', 'supermarket shelves products rows', 'shop counter merchandise display']
  return ['small business storefront market', 'shop counter with goods africa', 'market stall vendor produce', 'local workshop craftsman tools']
}

// Product-name queries: curated exact-match map first (keyed by the normalized
// generic string), then generic name words, then a category shot.
const EXACT = {
  // bakery (mbuya-nehanda-bakehouse)
  'white bread loaf': ['white bread loaf bakery', 'sliced white bread'],
  'whole wheat loaf': ['whole wheat bread loaf', 'brown bread loaf bakery'],
  'dozen vetko': ['vetko fried dough', 'amagwinya fat cake', 'fried dough rolls'],
  'dozen scones': ['scones cream tea', 'fresh baked scones bakery'],
  'chocolate fudge cake 1kg': ['chocolate fudge cake', 'chocolate layer cake'],
  'two tier wedding cake': ['two tier wedding cake', 'wedding cake tiers white'],
  // plumbing & drainage (chiedza-plumbing-drainage)
  'emergency drain unblocking': ['plumber plunger sink', 'drain cleaning pipes'],
  'standalone leak repair': ['leaking pipe water', 'plumber repairing pipe'],
  'septic tank pump out': ['septic tank trucks', 'vacuum truck waste'],
  'bathroom piping refit': ['plumber fixing sink', 'bathroom tap faucet', 'plumbing copper pipes'],
  // wholesale (marondera-wholesale-depot)
  'mealie meal 25kg': ['maize sacks warehouse', 'corn flour sacks'],
  'soap powder 25kg': ['laundry detergent', 'soap bars market'],
  'cooking oil 20l drum': ['cooking oil bottles', 'olive oil bottles'],
  'sugar 50kg bale': ['sugar sacks warehouse', 'sugar cubes'],
  'bulk rice 50kg': ['rice sacks warehouse', 'rice bags market'],
  // brewery (matobo-brew-co)
  'craft ipa six pack': ['craft beer bottles', 'beer bottles row'],
  'golden lager case 330ml': ['lager beer bottles', 'beer bottles row'],
  'event keg 30l': ['beer keg', 'keg beer barrel'],
  // courier (mbizo-courier-haulage)
  'cross border courier per': ['parcel packages stacked', 'delivery boxes van'],
  'same day cbd delivery': ['delivery scooter city', 'courier bicycle parcel'],
  'kwekwe harare parcel': ['parcel wrapped boxes', 'package parcel delivery'],
  // it services (sable-byte-digital)
  'business email setup': ['laptop email inbox screen', 'office computer workspace'],
  'starter website package': ['website design laptop', 'web design computer'],
  'commerce store setup': ['online shopping laptop', 'ecommerce website laptop'],
  // agri inputs (sakubva-agri-supplies)
  'chicken feed 50kg': ['chicken feed farm', 'poultry feeding farm'],
  'compound fertiliser 50kg': ['fertilizer bags stacked', 'fertiliser sacks farm'],
  'maize seed blend 50kg': ['maize seed bags', 'seed sacks warehouse'],
  'day old chicks per 100': ['baby chicks', 'chicks poultry farm'],
}

function queriesFor(name, category) {
  const generic = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 2).join(' ') || name.toLowerCase().trim()
  const exact = EXACT[generic]
  return exact ? [...exact, generic, categoryShots(category)[0]] : [generic, categoryShots(category)[0]]
}

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
  let res
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) })
    if (res.status === 429) {
      await sleep(4000)
      res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) })
    }
  } catch {
    console.error(`  commons network error for "${query}", retrying once`)
    await sleep(5000)
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) })
    } catch {
      return []
    }
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
  const res = await fetch(url, { headers: { 'User-Agent': 'wa-directory/1.0' }, signal: AbortSignal.timeout(30000) })
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
  .select('id, name, slug, category, site_content')
  .eq('slug', slug)
  .maybeSingle()
if (bizErr || !business) {
  console.error(`Business "${slug}" not found  ${bizErr?.message || ''}`)
  process.exit(1)
}
console.log(`Filling images for: ${business.name} [${business.category}]`)
const BUSINESS_SHOTS = categoryShots(business.category, BRIGHT)

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
    const tries = queriesFor(item.name, business.category)
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

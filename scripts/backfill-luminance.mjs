// One-shot backfill: computes cover luminance for existing rows.
//   • business_items.image_luminance  from business_items.image_url
//   • businesses.site_cover_luminance from site_content->gallery[0]
// Run: node scripts/backfill-luminance.mjs   (reads .env.local service key)
// Duplicate of lib/image-luminance.ts decode is deliberate — plain node
// cannot import the TS lib module here.

import { readFileSync } from 'node:fs'

let SUPABASE_URL, SERVICE_KEY
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  ;({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } = process.env)
} else {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || ''
  SUPABASE_URL = get('NEXT_PUBLIC_SUPABASE_URL')
  SERVICE_KEY = get('SUPABASE_SERVICE_ROLE_KEY')
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase service credentials (.env.local)')
  process.exit(1)
}
const headers = { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, 'content-type': 'application/json' }

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, ...init })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`REST ${res.status} ${body.slice(0, 200)}`)
  }
  return res.status === 204 ? null : res.json()
}

// Fetch over an HTTP(S) URL, capped size, then decode luminance.
const lumForUrl = async (url) => {
  try {
    if (!/^https:\/\//.test(url) || url.length > 2048) return null
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const bytes = new Uint8Array(await res.arrayBuffer())
    if (!bytes.length || bytes.length > 12 * 1024 * 1024) return null
    const { sharp } = await import('sharp')
    const { data } = await sharp(Buffer.from(bytes)).resize(24, 24, { fit: 'inside' }).grayscale().raw().toBuffer({ resolveWithObject: true })
    if (!data.length) return null
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]
    const lum = Math.min(1, Math.max(0, sum / data.length / 255))
    return Number.isFinite(lum) ? lum : null
  } catch {
    return null
  }
}

const PATCH = async (table, id, lum) =>
  rest(`${table}?id=eq.${id}`, { method: 'PATCH', headers, body: JSON.stringify(lum) })

console.log('== items with image_url ==')
const items = await rest('business_items?id=neq.null&image_url=neq.&select=id,image_url')
console.log('count:', items.length)
let done = 0
for (const it of items) {
  const lum = await lumForUrl(it.image_url)
  if (lum == null) continue
  await PATCH('business_items', it.id, { image_luminance: lum })
  done++
  if (done % 25 === 0) console.log('items patched so far:', done)
}
console.log('items patched:', done)

console.log('== businesses with gallery[0] ==')
const biz = await rest('businesses?site_content=neq.null&select=id,site_content')
console.log('with content:', biz.length)
let bDone = 0
for (const b of biz) {
  const gal = b.site_content?.gallery
  if (!Array.isArray(gal) || !gal.length) continue
  const lum = await lumForUrl(gal[0])
  if (lum == null) continue
  await PATCH('businesses', b.id, { site_cover_luminance: lum })
  bDone++
}
console.log('businesses patched:', bDone)
console.log('BACKFILL DONE')

// Re-encode oversized category cover images on Supabase Storage in place.
// Downloads each file from its public URL, resizes/re-encodes with sharp,
// and upserts back to the SAME storage path so the URLs in
// data/category-images.ts stay valid (no regen needed).
//
// Usage:
//   node scripts/compress-category-images.mjs            # compress anything > MAX_BYTES
//   node scripts/compress-category-images.mjs --all      # compress every image
//   node scripts/compress-category-images.mjs slug [slug…]   # only these slugs (e.g. travel-and-tourism)

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

// --- Minimal .env.local parser (no dotenv dependency needed) ---
const envContent = readFileSync('.env.local', 'utf8')
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment/.env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const MAX_WIDTH = 2400
const MAX_HEIGHT = 1350
const JPEG_QUALITY = 74
const MAX_BYTES = 256 * 1024 // anything above this gets compressed

// ── Parse category → URL map from the generated TS file ──────────────────
const tsSrc = readFileSync(new URL('../data/category-images.ts', import.meta.url), 'utf8')
const images = {}
{
  const re = /'([^']+)':\s*'([^']+)'/g
  let m
  while ((m = re.exec(tsSrc)) !== null) {
    images[m[1]] = m[2]
  }
}

const args = process.argv.slice(2)
const onlySlugs = new Set(
  args.filter((a) => !a.startsWith('--')).map((a) => a.replace(/\.jpg$/, ''))
)
const forceAll = args.includes('--all')

const entries = Object.entries(images)
  .map(([name, url]) => ({ name, url, slug: url.split('/').pop()?.replace(/\.jpg$/, '') || name }))
  .filter(({ slug }) => onlySlugs.size === 0 || onlySlugs.has(slug))

if (entries.length === 0) {
  console.error('No matching category images found (check slugs)')
  process.exit(1)
}

let compressed = 0
let skipped = 0
let failed = 0

for (const { name, url, slug } of entries) {
  process.stdout.write(`[${name}] `)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`download failed: ${res.status}`)
    const raw = Buffer.from(await res.arrayBuffer())

    if (!forceAll && raw.length <= MAX_BYTES) {
      console.log(`already small (${(raw.length / 1024).toFixed(0)} KB) – skipping`)
      skipped++
      continue
    }

    const output = await sharp(raw)
      .rotate() // bake EXIF orientation
      .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toBuffer()

    if (output.length >= raw.length) {
      console.log(`compression made it bigger (${(output.length / 1024).toFixed(0)} KB) – skipping`)
      skipped++
      continue
    }

    const path = `categories/${slug}.jpg`
    const { error } = await supabase.storage.from('categories').upload(path, output, {
      contentType: 'image/jpeg',
      upsert: true,
    })
    if (error) throw error

    const before = (raw.length / 1024).toFixed(0)
    const after = (output.length / 1024).toFixed(0)
    const saved = (100 - (output.length / raw.length) * 100).toFixed(0)
    console.log(`${before} KB → ${after} KB (-${saved}%) ✓`)
    compressed++
  } catch (err) {
    console.log(`error – ${err.message}`)
    failed++
  }
}

console.log(`\nDone: ${compressed} compressed, ${skipped} skipped, ${failed} failed`)
if (failed > 0) process.exit(1)

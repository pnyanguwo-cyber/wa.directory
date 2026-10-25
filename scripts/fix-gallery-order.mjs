// Patch gallery ordering: bright hero first, then the 4 standing shots.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const env = readFileSync('.env.local', 'utf8')
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}
loadEnv()
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const slug = process.argv[2]
const heroFirst = process.argv[3]
if (!slug || !heroFirst) {
  console.error('Usage: node scripts/fix-gallery-order.mjs <slug> <hero-url>')
  process.exit(1)
}
const base = 'https://zefhvpifhzklkbkptjgv.supabase.co/storage/v1/object/public/business-media'

const { data: biz, error } = await supabase
  .from('businesses')
  .select('site_content')
  .eq('slug', slug)
  .maybeSingle()
if (error || !biz) throw error || new Error('not found')

const content = { ...(biz.site_content || {}) }
const former = (content.gallery || []).filter(u => u !== heroFirst)
content.gallery = [heroFirst, ...former].filter(Boolean)
const { error: upErr } = await supabase
  .from('businesses')
  .update({ site_content: content })
  .eq('slug', slug)
if (upErr) throw upErr
console.log(`gallery → ${content.gallery.length} photos, hero = ${content.gallery[0]}`)

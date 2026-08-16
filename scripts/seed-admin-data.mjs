// Seeds categories + areas from the static data files and backfills businesses.areas
// Usage: node scripts/seed-admin-data.mjs
// Env:  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from '@supabase/supabase-js'
import { categories } from '../data/categories.ts'
import { zimbabweCities } from '../data/zimbabwe-locations.ts'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

const { error: catErr } = await supabase
  .from('categories')
  .upsert(
    categories.map(c => ({ name: c.name, icon: c.icon, keywords: c.keywords, active: true })),
    { onConflict: 'name', ignoreDuplicates: false }
  )
if (catErr) throw new Error(`categories seed: ${catErr.message}`)
console.log(`categories: ${categories.length} upserted`)

const areaRows = zimbabweCities.flatMap(c => c.areas.map(a => ({ city: c.name, name: a, active: true })))
const { error: areaErr } = await supabase
  .from('areas')
  .upsert(areaRows, { onConflict: 'city,name', ignoreDuplicates: false })
if (areaErr) throw new Error(`areas seed: ${areaErr.message}`)
console.log(`areas: ${areaRows.length} upserted`)

const { data: businesses, error: listErr } = await supabase
  .from('businesses')
  .select('id, area, areas')
if (listErr) throw new Error(`list: ${listErr.message}`)

let backfilled = 0
for (const b of businesses || []) {
  const existing = Array.isArray(b.areas) ? b.areas.filter(Boolean) : []
  if (existing.length === 0 && b.area) {
    const { error } = await supabase
      .from('businesses')
      .update({ areas: [b.area] })
      .eq('id', b.id)
    if (error) console.log(`backfill failed ${b.id}: ${error.message}`)
    else backfilled++
  }
}
console.log(`businesses.areas backfilled: ${backfilled} of ${(businesses || []).length}`)
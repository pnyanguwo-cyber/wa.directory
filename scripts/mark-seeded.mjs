// Marks demo/seed listings so the admin panel can filter them and remove them
// in bulk without touching real businesses.
//
// scripts/seed.mjs creates its demo rows on the 2637722340NN phone block; this
// backfills is_seed for rows created before that column existed. Safe to re-run.
//
// Usage: node scripts/mark-seeded.mjs
// Env:   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (via .env.local)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnv() {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase
  .from('businesses')
  .update({ is_seed: true })
  .like('phone', '2637722340%')
  .eq('is_seed', false)
  .select('id')

if (error) {
  console.error(`mark seeded failed: ${error.message}`)
  process.exit(1)
}
console.log(`marked ${(data || []).length} seeded listings`)

const { count, error: countErr } = await supabase
  .from('businesses')
  .select('id', { count: 'exact', head: true })
  .eq('is_seed', true)
if (countErr) console.error(`count failed: ${countErr.message}`)
else console.log(`is_seed total: ${count}`)

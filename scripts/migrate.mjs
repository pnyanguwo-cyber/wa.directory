import { createClient } from '@supabase/supabase-js'

const oldUrl = process.env.SUPABASE_OLD_URL
const oldKey = process.env.SUPABASE_OLD_KEY
const newUrl = process.env.SUPABASE_NEW_URL
const newKey = process.env.SUPABASE_NEW_KEY

if (!oldUrl || !oldKey || !newUrl || !newKey) {
  console.error('Missing env: SUPABASE_OLD_URL, SUPABASE_OLD_KEY, SUPABASE_NEW_URL, SUPABASE_NEW_KEY')
  process.exit(1)
}

const oldClient = createClient(oldUrl, oldKey)
const newClient = createClient(newUrl, newKey)

const { data: rows, error } = await oldClient
  .from('businesses')
  .select('*')
  .order('created_at', { ascending: false })

if (error) {
  console.error('Failed to read OLD project:', error.message)
  process.exit(1)
}

console.log(`Read ${rows.length} businesses from OLD project\n`)

let copied = 0
let skipped = 0
let failed = 0

for (const b of rows) {
  const { data: existing } = await newClient
    .from('businesses')
    .select('id')
    .eq('slug', b.slug)
    .maybeSingle()

  if (existing) {
    console.log(`  SKIP ${b.slug} (already exists in NEW)`)
    skipped++
    continue
  }

  const { error: insErr } = await newClient.from('businesses').insert(b)

  if (insErr) {
    console.log(`  FAIL ${b.slug}: ${insErr.message}`)
    failed++
  } else {
    console.log(`  OK   ${b.name}`)
    copied++
  }
}

const { count } = await newClient
  .from('businesses')
  .select('*', { count: 'exact', head: true })

console.log(`\nDone: ${copied} copied, ${skipped} skipped, ${failed} failed. NEW total: ${count}`)

if (failed > 0 || copied !== rows.length - skipped) {
  process.exit(1)
}
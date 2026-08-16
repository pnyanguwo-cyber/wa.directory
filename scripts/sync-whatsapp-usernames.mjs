// Sync whatsapp_username + website from source project into target project
// Matches businesses by normalized name (fallback: slug)
// Env: SRC_URL, SRC_KEY (the project we wrongly worked in), TGT_URL, TGT_KEY (real project)
import { createClient } from '@supabase/supabase-js'

const srcUrl = process.env.SRC_URL
const srcKey = process.env.SRC_KEY
const tgtUrl = process.env.TGT_URL
const tgtKey = process.env.TGT_KEY

if (!srcUrl || !srcKey || !tgtUrl || !tgtKey) {
  console.error('Missing env vars (SRC_URL/SRC_KEY/TGT_URL/TGT_KEY)')
  process.exit(1)
}

const src = createClient(srcUrl, srcKey)
const tgt = createClient(tgtUrl, tgtKey)

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const { data: srcRows, error: srcErr } = await src
  .from('businesses')
  .select('name, slug, whatsapp_username')

if (srcErr) throw new Error(`src: ${srcErr.message}`)

const { data: tgtRows, error: tgtErr } = await tgt
  .from('businesses')
  .select('id, name, slug, whatsapp_username, website')

if (tgtErr) throw new Error(`tgt: ${tgtErr.message}`)

let updated = 0
let skipped = 0
let matched = 0
let total = 0

for (const t of tgtRows || []) {
  const tName = norm(t.name)
  const s =
    (srcRows || []).find(r => norm(r.name) === tName) ||
    (srcRows || []).find(r => r.slug === t.slug)
  total++
  if (!s) {
    console.log(`NO MATCH: ${t.name} (${t.slug})`)
    continue
  }
  matched++
  const patch = {}
  if ((s.whatsapp_username || '').trim() && (t.whatsapp_username || '').trim() !== (s.whatsapp_username || '').trim()) {
    patch.whatsapp_username = s.whatsapp_username.trim()
  }
  if (Object.keys(patch).length > 0) {
    const { error } = await tgt.from('businesses').update(patch).eq('id', t.id)
    if (error) {
      console.log(`UPDATE FAILED: ${t.name}: ${error.message}`)
      skipped++
    } else {
      updated++
      console.log(`UPDATED ${t.name}: ${Object.keys(patch).join(', ')}`)
    }
  } else {
    skipped++
  }
}

console.log(`\nTotal: ${total}, matched: ${matched}, updated: ${updated}, no-change: ${skipped - updated}`)
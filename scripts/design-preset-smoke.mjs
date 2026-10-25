// S17 battery: force-apply each design preset to the Mbuya bakery and verify
// the rendered page carries the right variant markup + design tokens.
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
const SLUG = 'mbuya-nehanda-bakehouse'
const BASE = 'http://localhost:3000'

const CASES = [
  {
    key: 'classic', theme: {}, must: [],
    absent: ['hero-classic-ok'],
  },
  {
    key: 'maison', theme: { design: 'maison' }, must: ['text-center', 'font-family:'],
  },
  {
    key: 'bolt', theme: { design: 'bolt' }, must: ['WhatsApp orders', 'EcoCash accepted', 'rounded-full'],
  },
  {
    key: 'craft', theme: { design: 'craft' }, must: ['Fresh &amp; local', 'rotate-6'],
  },
  { key: 'font-grotesk', theme: { design: 'bolt', font: 'grotesk' }, must: [] },
  { key: 'font-warm', theme: { design: 'craft', font: 'warm' }, must: [] },
]

async function fetchPage(themePatch) {
  await supabase.from('businesses').update({ site_theme: themePatch }).eq('slug', SLUG)
  const res = await fetch(`${BASE}/site/${SLUG}`, { cache: 'no-store' })
  return { status: res.status, html: await res.text() }
}

function headVar(html) {
  // The var value is HTML-escaped (__, fallbacks), so slice instead of regex stops.
  const idx = html.indexOf('--site-head:')
  if (idx < 0) return ''
  return html.slice(idx + 12, idx + 90)
}

let exitCode = 0
let classicHead = ''
const heads = []
const { data: original } = await supabase.from('businesses').select('site_theme').eq('slug', SLUG).maybeSingle()

for (const t of CASES) {
  const current = original.site_theme || {}
  const { status, html } = await fetchPage({ ...current, ...t.theme })
  const label = `[${t.key}]`
  if (status !== 200) { console.log(`FAIL ${label} HTTP ${status}`); exitCode = 1; continue }
  let fail = false
  for (const needle of t.must) {
    if (!html.includes(needle)) { console.log(`FAIL ${label} missing: ${needle}`); fail = true }
  }
  if (!fail) console.log(`PASS ${label} (len ${html.length}) — ${t.must.length} checks`)
  if (fail) exitCode = 1
const hv = headVar(html)
if (t.key === 'classic') classicHead = hv
else if (fail) {} else heads.push(hv)
}

// Font var must have swapped away from the classic (Inter) stack on the preset pages
const distinct = new Set([classicHead, ...heads])
if (!classicHead) { console.log('FAIL font-var: classic page missing --site-head'); exitCode = 1 }
else if (distinct.size < 3) { console.log(`FAIL font-var: expected ≥3 distinct heading fonts across presets, got ${distinct.size}`); exitCode = 1 }
else console.log(`PASS font-var — ${distinct.size} distinct heading fonts across pages`)

// Restore the owner's original theme.
await supabase.from('businesses').update({ site_theme: original.site_theme }).eq('slug', SLUG)
const { data: restored } = await supabase.from('businesses').select('site_theme').eq('slug', SLUG).maybeSingle()
console.log('restored site_theme =', JSON.stringify(restored.site_theme))
console.log(exitCode === 0 ? 'ALL PASS' : 'FAILURES PRESENT')
process.exit(exitCode)

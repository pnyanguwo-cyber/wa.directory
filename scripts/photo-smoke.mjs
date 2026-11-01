// 📸 battery (local dry-run): single-item photo views end-to-end —
// "zzphotodemo harare" search → results list + 📸 See product photo button →
// cheapest-with-photo item card image → detail card 📸 See a photo →
// pick-list (🧺 Browse catalog row) → imageless item polite reply →
// 💬 chat handoff (/go link). Self-made fixtures, self-cleaned. Run with
// WHATSAPP_DRY_RUN=1 dev server +:
//   BATTERY_BASE='http://localhost:3000' node scripts/photo-smoke.mjs
// DB checks use bot_messages (dry-run still logs outgoing bot messages).
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'

const BASE = process.env.BATTERY_BASE || 'http://localhost:3000'
const env = readFileSync('.env.local', 'utf8')
const get = k => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || ''
const APP_SECRET = get('WHATSAPP_APP_SECRET')
const OWNER = '263773791864'

let seq = 0
const RUN_PREFIX = `wamid.ph1${Date.now().toString(36)}`
async function post(from, message) {
  seq++
  const body = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: '1', changes: [{ value: {
      messaging_product: 'whatsapp',
      contacts: [{ profile: { name: 'Cyber' }, wa_id: from }],
      messages: [message],
    }, field: 'messages' }] }],
  })
  const sig = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex')
  return (await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sig },
    body,
  })).status
}
const textMsg = (from, body) => ({
  from, id: `${RUN_PREFIX}t${seq}`, timestamp: `${Math.floor(Date.now() / 1000)}`, type: 'text', text: { body },
})
const buttonMsg = (from, id) => ({
  from, id: `${RUN_PREFIX}b${seq}`, timestamp: `${Math.floor(Date.now() / 1000)}`, type: 'interactive',
  interactive: { type: 'button_reply', button_reply: { id, title: id } },
})
const send = (t, from = OWNER) => post(from, textMsg(from, t))
const tap = (id, from = OWNER) => post(from, buttonMsg(from, id))

const SB_URL = get('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')
const SB_KEY = get('SUPABASE_SERVICE_ROLE_KEY')

async function rest(table, params = '', method = 'GET', payload) {
  const url = `${SB_URL}/rest/v1/${table}${params ? '?' + params : ''}`
  const res = await fetch(url, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      ...(method === 'GET'
        ? {}
        : { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(`REST ${method} ${table} failed: ${res.status} ${JSON.stringify(err)}`)
  }
  if (res.status === 204) return []
  return await res.json().catch(() => null)
}
const dbSelect = (table, filters) => rest(table, filters)
const dbInsert = (table, rows) => rest(table, '', 'POST', rows)
const dbDelete = (table, filters) => rest(table, filters, 'DELETE')
function ok(label, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${cond || !extra ? '' : ` — ${extra}`}`)
  if (!cond) process.exitCode = 1
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function outsAfterId(phone, minId) {
  let rows = []
  let stable = 0
  for (let i = 0; i < 16; i++) {
    await sleep(450)
    const fresh = await dbSelect('bot_messages', `phone=eq.${phone}&dir=eq.out&id=gt.${minId}&order=id&select=id,kind,body`)
    if (Array.isArray(fresh) && fresh.length === rows.length) stable++
    else stable = 0
    if (Array.isArray(fresh)) rows = fresh
    if (rows.length > 0 && stable >= 3) break
  }
  return rows
}
async function maxOutId(phone) {
  const rows = await dbSelect('bot_messages', `phone=eq.${phone}&dir=eq.out&order=id.desc&limit=1&select=id`)
  return Number(rows?.[0]?.id ?? 0)
}
function mLens(rows) { return rows.map(r => r.body).join('\n---\n') }

// ── fixtures ───────────────────────────────────────────────────────────
await dbDelete('chat_sessions', `phone=in.(${OWNER},263779999311)`)
const oldFixtures = (await dbSelect('businesses', 'username=in.(vsimphoto)&select=id')) || []
if (oldFixtures.length) {
  await dbDelete('business_items', `business_id=in.(${oldFixtures.map(r => r.id).join(',')})`)
  await dbDelete('businesses', 'username=in.(vsimphoto)')
}
await dbInsert('businesses', [
  { name: 'Photofix Demo Bakery', username: 'vsimphoto', city: 'Harare', phone: '263779999311', phone_type: 'whatsapp', category: ['Bakery'], verified: true, payment_status: 'active' },
])
const fixtures = (await dbSelect('businesses', 'username=in.(vsimphoto)&select=id,username')) || []
const BID = fixtures.find(r => r.username === 'vsimphoto').id
await dbInsert('business_items', [
  { business_id: BID, name: 'Zzphotodemo Bread', price: 1.0, is_active: true, image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff' },
  { business_id: BID, name: 'Zzphotodemo Plain Roll', price: 2.0, is_active: true, image_url: '' },
])
console.log('fixtures in')
ok('fixture ids resolved', !!BID)

// 1) Product search → results list + 📸 quick button.
let before = await maxOutId(OWNER)
ok('hello → 200', (await send('hello')) === 200)
await outsAfterId(OWNER, before)
before = await maxOutId(OWNER)
ok('product search → 200', (await send('zzphotodemo harare')) === 200)
let outs = await outsAfterId(OWNER, before)
let out = mLens(outs)
ok('search shows results list', /Photofix Demo Bakery/.test(out), out.slice(0, 600))
ok('search results carry 📸 quick button', /See product photo/.test(out), out.slice(0, 900))

// 2) Tap the quick button → the cheapest WITH-photo item goes out as an
// image card (raw dry-run is server console; here we assert the tap is
// accepted and no text error replaces it).
const listRows = await dbSelect('bot_messages', `phone=eq.${OWNER}&dir=eq.out&kind=eq.list&order=id.desc&limit=1`)
const items = await dbSelect('business_items', `business_id=eq.${BID}&order=price.asc&select=id,name,image_url`)
const photoItem = items.find(i => i.image_url)
const plainItem = items.find(i => !i.image_url)
ok('fixtures resolve items', !!photoItem && !!plainItem)
before = await maxOutId(OWNER)
ok('see_photo tap → 200', (await tap(`see_photo_${photoItem.id}`)) === 200)
outs = await outsAfterId(OWNER, before)
ok('no polite-error after photographed item', !/no photo has been uploaded/.test(mLens(outs)), mLens(outs).slice(0, 400))

// 3) Name hit → detail card → 📸 See a photo button.
before = await maxOutId(OWNER)
ok('name search → 200', (await send('photofix')) === 200)
outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('detail card shows 📸 See a photo button', /See a photo/.test(out) && /Browse all items/.test(out), out.slice(0, 900))

// 4) 📸 pick-list: items + the full-catalog row.
before = await maxOutId(OWNER)
ok('photo_pick tap → 200', (await tap(`photo_pick_${BID}`)) === 200)
outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('pick-list lists both items', /Zzphotodemo Bread/.test(out) && /Zzphotodemo Plain Roll/.test(out), out.slice(0, 700))
ok('pick-list keeps the full-catalog row', /Browse catalog/.test(out), out.slice(0, 900))

// 5) Imageless item → polite reply, never a dead end.
before = await maxOutId(OWNER)
ok('imageless see_photo tap → 200', (await tap(`see_photo_${plainItem.id}`)) === 200)
outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('imageless item gets the polite note', /no photo has been uploaded for \*Zzphotodemo Plain Roll\* yet at Photofix Demo Bakery/.test(out), out.slice(0, 500))

// 6) 💬 chat handoff → tracked /go link.
before = await maxOutId(OWNER)
ok('cta_chat tap → 200', (await tap(`cta_chat_${BID}`)) === 200)
outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('chat button opens the tracked /go link', /go\//.test(out), out.slice(0, 500))

// ── cleanup ────────────────────────────────────────────────────────────
await dbDelete('business_items', `business_id=eq.${BID}`)
await dbDelete('businesses', `id=eq.${BID}`)
await dbDelete('chat_sessions', `phone=in.(${OWNER},263779999311)`)
await dbDelete('bot_contacts', 'phone=eq.263779999311')
console.log('cleanup done')
console.log(`Fixture business id: ${BID} (image card sends are dry-run console only)`)

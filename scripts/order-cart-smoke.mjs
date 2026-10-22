// S18 battery (local dry-run): customer cart → compiled order → supplier
// WhatsApp handoff. Covers the bot flow (picker / add / view / remove via
// typed number / checkout / voice-only) plus the web Add chips on the
// profile + auto-website pages. Fixtures are self-made and self-cleaned.
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'

const BASE = process.env.BATTERY_BASE || 'http://localhost:3001'
const env = readFileSync('.env.local', 'utf8')
const get = k => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || ''
const APP_SECRET = get('WHATSAPP_APP_SECRET')
const OWNER = '263773791864'
const PAT = process.env.SUPABASE_PAT || ''
const REF = process.env.PROJECT_REF || ''

let seq = 0
const RUN_PREFIX = `wamid.s188${Date.now().toString(36)}`
async function send(text) {
  seq++
  const body = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: '1', changes: [{ value: {
      messaging_product: 'whatsapp',
      contacts: [{ profile: { name: 'Cyber' }, wa_id: OWNER }],
      messages: [{ from: OWNER, id: `${RUN_PREFIX}x${seq}`, timestamp: `${Math.floor(Date.now() / 1000)}`, type: 'text', text: { body: text } }],
    }, field: 'messages' }] }],
  })
  const sig = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex')
  return (await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sig },
    body,
  })).status
}
async function tap(id, title) {
  seq++
  const body = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: '1', changes: [{ value: {
      messaging_product: 'whatsapp',
      contacts: [{ profile: { name: 'Cyber' }, wa_id: OWNER }],
      messages: [{ from: OWNER, id: `${RUN_PREFIX}x${seq}`, timestamp: `${Math.floor(Date.now() / 1000)}`, type: 'interactive', interactive: { type: 'button_reply', button_reply: { id, title: title || id } } }],
    }, field: 'messages' }] }],
  })
  const sig = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex')
  return (await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sig },
    body,
  })).status
}
async function listReply(id, title) {
  seq++
  const body = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: '1', changes: [{ value: {
      messaging_product: 'whatsapp',
      contacts: [{ profile: { name: 'Cyber' }, wa_id: OWNER }],
      messages: [{ from: OWNER, id: `${RUN_PREFIX}x${seq}`, timestamp: `${Math.floor(Date.now() / 1000)}`, type: 'interactive', interactive: { type: 'list_reply', list_reply: { id, title: title || id } } }],
    }, field: 'messages' }] }],
  })
  const sig = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex')
  return (await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sig },
    body,
  })).status
}
async function sql(query) {
  let last = null
  for (let i = 0; i < 4; i++) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })
    const json = await res.json().catch(() => null)
    if (res.ok) return json
    last = { status: res.status, json }
    if (res.status !== 544 && res.status !== 503) break
    await sleep(1200 * (i + 1))
  }
  throw new Error(`SQL failed: ${JSON.stringify(last)}`)
}
function ok(label, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label}`)
  if (!cond) process.exitCode = 1
}
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function outsAfterId(phone, minId) {
  let rows = []
  let stable = 0
  for (let i = 0; i < 16; i++) {
    await sleep(450)
    const fresh = await sql(`SELECT id, kind, body FROM bot_messages WHERE phone = '${phone}' AND dir = 'out' AND id > ${minId} ORDER BY id`)
    if (Array.isArray(fresh) && fresh.length === rows.length) stable++
    else stable = 0
    if (Array.isArray(fresh)) rows = fresh
    if (rows.length > 0 && stable >= 3) break
  }
  return rows
}
async function maxOutId(phone) {
  const rows = await sql(`SELECT coalesce(max(id), 0) m FROM bot_messages WHERE phone = '${phone}'`)
  return rows?.[0]?.m ?? 0
}
function mLens(rows) { return rows.join('\n---\n') }

// ── fixtures ─────────────────────────────────────────────────────────────
await sql(["DELETE FROM business_items WHERE business_id IN (SELECT id FROM businesses WHERE username IN ('vsimcart','vsimcartv'))",
  "DELETE FROM businesses WHERE username IN ('vsimcart','vsimcartv')"].join('; '))
await sql([
  `INSERT INTO businesses (name, username, city, phone, phone_type, category, verified, payment_status) VALUES`,
  `('Cart Fixture Bread','vsimcart','Bulawayo','263779999301','whatsapp','{Bakery}',true,'active')`
].join('\n'))
const ids = await sql(`SELECT id FROM businesses WHERE username = 'vsimcart'`)
const BID = ids[0].id
await sql([
  `INSERT INTO business_items (business_id, name, price, is_active) VALUES`,
  `('${BID}','Sourdough Loaf',2.5,true),`,
  `('${BID}','Bite Cake',3.0,true),`,
  `('${BID}','Plain Scones',1.0,true)`
].join('\n'))
const itemRowsDb = await sql(`SELECT id, name FROM business_items WHERE business_id = '${BID}' ORDER BY price ASC`)
const itemByName = Object.fromEntries(itemRowsDb.map(r => [r.name, r.id]))
const ID_BREAD = itemByName['Sourdough Loaf']
const ID_CAKE = itemByName['Bite Cake']
await sql([
  `INSERT INTO businesses (name, username, city, phone, phone_type, category, verified, payment_status) VALUES`,
  `('Cart Fixture Voice','vsimcartv','Gweru','263779999302','voice','{Bakery}',true,'active')`
].join('\n'))
const vids = await sql(`SELECT id FROM businesses WHERE username = 'vsimcartv'`)
const VID = vids[0].id
await sql(`INSERT INTO business_items (business_id, name, price, is_active) VALUES ('${VID}','Voice Bread',2.0,true)`)
const voiceRow = await sql(`SELECT id FROM business_items WHERE business_id = '${VID}' LIMIT 1`)
const ID_VOICE = voiceRow[0].id
console.log('fixtures in')
ok('fixture ids resolved', !!BID && !!VID && !!ID_BREAD && !!ID_CAKE && !!ID_VOICE)

// 1) Start order straight from the action id (no search needed)
let before = await maxOutId(OWNER)
ok('hello → 200', (await send('hello')) === 200)
await outsAfterId(OWNER, before)
before = await maxOutId(OWNER)
ok('cstart → 200', (await tap(`cstart_${BID}`)) === 200)
let rows = await outsAfterId(OWNER, before)
let out = mLens(rows.map(r => r.body))
ok('± list names supplier', /Build your order — \*?Cart Fixture Bread\*?/.test(out))
ok('± rows with plus prefix', /\+ Sourdough Loaf|Plain Scones|\+ Bite Cake/.test(out))
ok('± intro teaches taps', /Tap ➕ rows to add/.test(out))

// 2) tap one item → ONE reply: refreshed builder screen, no "added ✅" chatter
before = await maxOutId(OWNER)
ok('cadd → 200', (await tap(`cadd_${ID_BREAD}`)) === 200)
rows = await outsAfterId(OWNER, before)
out = mLens(rows.map(r => r.body))
ok('no added-chatter', !/added to your order/.test(out))
ok('builder summary 1×', /Sourdough Loaf ×1 — `\$2\.50`/.test(out) || /Sourdough Loaf ×1/.test(out))
ok('total on screen', /Total: \$2\.5/.test(out))
ok('builder buttons', /Checkout \| .{0,4}Add \/ remove \| .{0,4}Empty order/.test(out))

// 3) tap ± again → list now shows the − row for the picked item
before = await maxOutId(OWNER)
ok('citems → 200', (await tap(`citems_${BID}`)) === 200)
rows = await outsAfterId(OWNER, before)
out = mLens(rows.map(r => r.body))
ok('minus row for picked item', /− Sourdough Loaf ×1/.test(out))
ok('plus row keeps marker', /\+ Sourdough Loaf ×1/.test(out))
ok('unpicked stays plus-only', /\+ Bite Cake/.test(out) && !/− Bite Cake/.test(out))

// 4) ± bump second item + bump bread again → ×2
before = await maxOutId(OWNER)
ok('cadd #2 → 200', (await tap(`cadd_${ID_CAKE}`)) === 200)
rows = await outsAfterId(OWNER, before)
out = mLens(rows.map(r => r.body))
ok('second item on screen', /Bite Cake ×1/.test(out) && /Sourdough Loaf ×1/.test(out))
before = await maxOutId(OWNER)
ok('cinc bump → 200', (await tap(`cinc_${ID_BREAD}`)) === 200)
rows = await outsAfterId(OWNER, before)
out = mLens(rows.map(r => r.body))
ok('qty now 2 on screen', /Sourdough Loaf ×2/.test(out) && /Total: \$8/.test(out))

// 5) minus row takes one back
before = await maxOutId(OWNER)
ok('cdec → 200', (await tap(`cdec_${ID_CAKE}`)) === 200)
rows = await outsAfterId(OWNER, before)
out = mLens(rows.map(r => r.body))
ok('cake emptied itself (qty 0 → gone)', !/Bite Cake/.test(out))
ok('bread survives', /Sourdough Loaf ×2/.test(out))

// 6) checkout → wa.me handoff carries the compiled order
before = await maxOutId(OWNER)
ok('checkout → 200', (await send('checkout')) === 200)
rows = await outsAfterId(OWNER, before)
out = mLens(rows.map(r => r.body))
const waMatch = out.match(/https:\/\/wa\.me\/(\d+)\/?\?text=/)
ok('wa.me handoff present', !!waMatch)
ok('handoff to supplier digits', !!waMatch && waMatch[1] === '263779999301')
ok('order header in url', /\?text=%F0%9F%A7%BA/.test(out))
ok('order text has qty+total', /Sourdough Loaf ×2/.test(out) && /\*Total: \$5\*/.test(out))
ok('attribution line', /sent via WA Directory/.test(out))
ok('cta message kind logged', rows.some(r => r.kind === 'cta'))

// 7) voice-only supplier: no wa.me — call + read copy instead
before = await maxOutId(OWNER)
ok('cstart voice → 200', (await tap(`cstart_${VID}`)) === 200)
rows = await outsAfterId(OWNER, before)
out = mLens(rows.map(r => r.body))
ok('voice ± list', /Voice Bread/.test(out))
before = await maxOutId(OWNER)
ok('cadd voice → 200', (await tap(`cadd_${ID_VOICE}`)) === 200)
rows = await outsAfterId(OWNER, before)
await outsAfterId(OWNER, before)
before = await maxOutId(OWNER)
ok('voice checkout → 200', (await send('checkout')) === 200)
rows = await outsAfterId(OWNER, before)
out = mLens(rows.map(r => r.body))
ok('voice-only notice', /WhatsApp channel/.test(out))
ok('voice order text for call', /Voice Bread ×1/.test(out))
ok('no wa.me for voice-only', !/wa\.me/.test(out))

// 8) web surfaces render the Add chips (Mbuya has priced items + a site)
const prof = await fetch(`${BASE}/business/mbuya-nehanda-bakehouse`)
ok('profile page 200', prof.status === 200)
const profHtml = await prof.text()
ok('profile has Add chips', /\+ Add/.test(profHtml))
const site = await fetch(`${BASE}/site/mbuya-nehanda-bakehouse`)
ok('auto-website page 200', site.status === 200)
const siteHtml = await site.text()
ok('site has Add chips', /\+ Add/.test(siteHtml))
ok('site no raw &-anchor appends', !/&text=/i.test(siteHtml.match(/Add to order|wa\.me[\s\S]{0,80}/)?.[0] || 'Add to order'))

// — cleanup —
await sql(["DELETE FROM business_items WHERE business_id IN (SELECT id FROM businesses WHERE username IN ('vsimcart','vsimcartv'))",
  "DELETE FROM businesses WHERE username IN ('vsimcart','vsimcartv')"].join('; '))
console.log('battery done')

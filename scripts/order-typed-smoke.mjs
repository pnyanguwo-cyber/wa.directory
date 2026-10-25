// S18.2 battery (local dry-run): typed customer orders end-to-end —
// "order 2 zzcart sourdough, 1 zzcart cement sacks" → cross-shelf match → verify screen →
// commit → per-shop rows + short /go/o/<token> checkout → supplier push
// (DM to active bot contacts, claim tap) → buyer tracker. Self-made
// fixtures, self-cleaned. Run with WHATSAPP_DRY_RUN=1 dev server +:
//   $env:BATTERY_BASE='http://localhost:3000'; node scripts/order-typed-smoke.mjs
// DB checks + fixtures use the service-role key via PostgREST (from
// .env.local — the old management-PAT SQL helper died mid-session).
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'

const BASE = process.env.BATTERY_BASE || 'http://localhost:3000'
const env = readFileSync('.env.local', 'utf8')
const get = k => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || ''
const APP_SECRET = get('WHATSAPP_APP_SECRET')
const OWNER = '263773791864'
const SUP1 = '263779999301' // Cart Fixture Bread (whatsapp)
const SUP2 = '263779999303' // Fixture Cement (whatsapp)

let seq = 0
const RUN_PREFIX = `wamid.ot2${Date.now().toString(36)}`
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

// ── fixtures ─────────────────────────────────────────────────────────────
await dbDelete('supply_orders', 'buyer_phone=eq.263773791864')
await dbDelete('chat_sessions', `phone=in.(${OWNER},${SUP1},${SUP2})`)
const oldFixtures = (await dbSelect('businesses', 'username=in.(vsimcart,vsimcartb)&select=id')) || []
if (oldFixtures.length) {
  await dbDelete('business_items', `business_id=in.(${oldFixtures.map(r => r.id).join(',')})`)
  await dbDelete('businesses', 'username=in.(vsimcart,vsimcartb)')
}
await dbDelete('bot_contacts', `phone=in.(${SUP1},${SUP2})`)
await dbInsert('businesses', [
  { name: 'Cart Fixture Bread', username: 'vsimcart', city: 'Bulawayo', phone: SUP1, phone_type: 'whatsapp', category: ['Bakery'], verified: true, payment_status: 'active' },
  { name: 'Fixture Cement', username: 'vsimcartb', city: 'Gweru', phone: SUP2, phone_type: 'whatsapp', category: ['Hardware'], verified: true, payment_status: 'active' },
])
const bids = await dbSelect('businesses', 'username=in.(vsimcart,vsimcartb)&select=id,username')
const BID = bids.find(r => r.username === 'vsimcart').id
const CID = bids.find(r => r.username === 'vsimcartb').id
await dbInsert('business_items', [
  { business_id: BID, name: 'Zzcart Sourdough Round', price: 2.5, is_active: true },
  { business_id: BID, name: 'Bite Cake', price: 3.0, is_active: true },
  { business_id: BID, name: 'Plain Scones', price: 1.0, is_active: true },
  { business_id: BID, name: 'Zzcart Wheat Bread', price: 0.9, is_active: true },
  { business_id: CID, name: 'Zzcart Cement Sacks', price: 10.0, is_active: true },
])
// Both suppliers look active in the bot so the push lands as a DM.
await dbInsert('bot_contacts', [
  { phone: SUP1, name: 'Fixture Bread', last_seen: new Date().toISOString(), message_count: 3, opted_out: false },
  { phone: SUP2, name: 'Fixture Cement', last_seen: new Date().toISOString(), message_count: 3, opted_out: false },
])
console.log('fixtures in')
ok('fixture ids resolved', !!BID && !!CID)

// 1) Typed order with no shop context → split across two shelf suppliers.
let before = await maxOutId(OWNER)
ok('hello → 200', (await send('hello')) === 200)
await outsAfterId(OWNER, before)
before = await maxOutId(OWNER)
ok('typed order → 200', (await send('order 2 zzcart sourdough, 1 zzcart cement sacks')) === 200)
let outs = await outsAfterId(OWNER, before)
let out = mLens(outs)
if (process.env.BATTERY_DEBUG) {
  console.log('DBG outs', JSON.stringify(outs).slice(0, 1200))
  console.log('OUTVAL>' + out + '<OUTVAL')
}
ok('verify screen reached', /Check your order/.test(out), out)
ok('bread shop on verify', /Cart Fixture Bread/.test(out))
ok('cement shop on verify', /Fixture Cement/.test(out))
ok('sourdough line', /2 × Zzcart Sourdough Round/.test(out))
ok('zzcart cement line', /1 × Zzcart Cement Sacks/.test(out))
ok('send buttons offered', outs.some(r => /Send order/.test(r.body)) && outs.some(r => r.kind === 'buttons' || r.body.includes('[')))

// 2) ✅ commits: two rows one group, suppliers DMed, buyer gets receipt.
before = await maxOutId(OWNER)
// 3) Supplier DM: active contacts got the slice + buyer + claim button.
// Capture ids BEFORE the osend tap — otherwise the poll floor already
// includes the DM rows and comes back empty.
const s1before = await maxOutId(SUP1)
const s2before = await maxOutId(SUP2)
ok('osend tap → 200', (await tap('osend')) === 200)
await sleep(2500)
const rowsDb = await dbSelect('supply_orders', `buyer_phone=eq.${OWNER}&order=id&select=id,token,biz_id,status,clicks,group_id,buyer_phone,lines`)
ok('two rows filed', Array.isArray(rowsDb) && rowsDb.length === 2)
const breadRow = (rowsDb || []).find(r => r.biz_id === BID)
const cementRow = (rowsDb || []).find(r => r.biz_id === CID)
ok('rows carry tokens', !!breadRow?.token && !!cementRow?.token)
ok('one shared group', !!breadRow?.group_id && breadRow.group_id === cementRow.group_id)
ok('rows open before click', breadRow?.status === 'open' && cementRow?.status === 'open')
ok('buyer phone stored', breadRow?.buyer_phone === '263773791864')

outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('receipt counts shops', /Order off! 2 shops queued/.test(out), out)
ok('receipt shows links', out.includes(`/go/o/${breadRow.token}`) && out.includes(`/go/o/${cementRow.token}`))
ok('per-shop send cta', outs.some(r => r.kind === 'cta' && /go\/o\//.test(r.body)), out)

// 3) Supplier DM: active contacts got the slice + buyer + claim button.
const s1outs = await outsAfterId(SUP1, s1before)
const s1out = mLens(s1outs)
ok('bread supplier got DM', /New order on WA Directory/.test(s1out), s1out)
ok('DM names the buyer', /263773791864/.test(s1out))
ok('DM has claim button', s1outs.some(r => r.body.includes('I can supply')))
const s2outs = await outsAfterId(SUP2, s2before)
ok('cement supplier got DM', /New order on WA Directory/.test(mLens(s2outs)))

// 4) Short checkout link: click promotes the row (open → sent, clicks 1).
before = await maxOutId(OWNER)
const linkRes = await fetch(`${BASE}/go/o/${breadRow.token}`, { redirect: 'manual' })
ok('short link alive', linkRes.status === 302, `status ${linkRes.status}`)
const loc = linkRes.headers.get('location') || ''
ok('jumps to supplier chat', loc.includes('wa.me/263779999301'), loc)
ok('jump keeps text', loc.includes('?text=') && /Order/i.test(decodeURIComponent(loc)), loc)
const freshBread = await dbSelect('supply_orders', `token=eq.${breadRow.token}&select=status,clicks`)
ok('row promoted to sent', freshBread?.[0]?.status === 'sent' && freshBread?.[0]?.clicks === 1)

const dead = await fetch(`${BASE}/go/o/ZZZZZZ`, { redirect: 'manual' })
ok('bogus token page', dead.status === 404, `status ${dead.status}`)

// 5) Cement supplier claims: buyer is pinged instantly.
before = await maxOutId(OWNER)
const cemClaim = s2outs.find(r => r.body.includes('I can supply'))
ok('claim tap → 200', (await tap(`oclaim_${cementRow.id}`, SUP2)) === 200)
const claimedOut = await outsAfterId(OWNER, before)
const claimedStr = mLens(claimedOut)
ok('buyer notified of claim', /Fixture Cement.*confirmed your order|confirmed your order/.test(claimedStr), claimedStr)
const cemAfter = await dbSelect('supply_orders', `id=eq.${cementRow.id}&select=status`)
ok('row claimed in db', cemAfter?.[0]?.status === 'claimed')

// 6) Buyer tracker.
before = await maxOutId(OWNER)
ok('myorders → 200', (await send('myorders')) === 200)
outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('tracker lists claimed', /Fixture Cement/.test(out) && /confirmed/.test(out), out)
ok('tracker lists sent', /Cart Fixture Bread/.test(out), out)

// 7) Miss: nothing anywhere stocks "chips".
before = await maxOutId(OWNER)
ok('miss order → 200', (await send('order 3 gnseblek')) === 200)
outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('miss asks for corrections', /Nothing on any shelf matches/.test(out), out)

// 8) Explicit-shop flow: open the bread store card, order plain "bread"
// — must resolve against THAT shelf (Zzcart Wheat Bread), not the directory.
before = await maxOutId(OWNER)
ok('search zzcart bread → 200', (await send('zzcart bread')) === 200)
outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('search asks for town first', /Which town are you in\?/.test(out), out)
// Search without a town asks for the town first; the results list follows
// the town answer, then we tap the fixture's row by its list index.
before = await maxOutId(OWNER)
ok('town reply → 200', (await send('bulawayo')) === 200)
outs = await outsAfterId(OWNER, before)
const listMsg2 = outs.find(r => /rows:/.test(r.body) && /Cart Fixture Bread/.test(r.body))
ok('results list shows fixture', !!listMsg2, mLens(outs))
let pick = 0
if (listMsg2) {
  pick = listMsg2.body.split('↳ rows:')[1] || ''
  const rowsPart = pick.split(' | ')
  const idx = rowsPart.findIndex(p => /Cart Fixture Bread/.test(p))
  if (idx >= 0) pick = idx + 1
  else pick = 0
}
ok('fixture ranked with a number', pick >= 1, `pick=${pick}`)
before = await maxOutId(OWNER)
ok('detail open → 200', (await send(String(pick))) === 200)
outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('detail card shows order word', /Order from this shop/.test(out), out)
before = await maxOutId(OWNER)
ok('explicit order → 200', (await send('order 2 zzcart bread')) === 200)
outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('explicit shelf wins', /2 × Zzcart Wheat Bread/.test(out), out)
ok('explicit keeps shop', /Cart Fixture Bread/.test(out), out)
before = await maxOutId(OWNER)
ok('pause ordering → 200', (await send('back')) === 200)

// 9) Teach path: unusable line gets the format lesson, not a search.
before = await maxOutId(OWNER)
ok('garbage order → 200', (await send('order 1234')) === 200)
outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('teaches the format', /quantities first/.test(out) || /e\.g\./.test(out), out)

// 10) Menu affordance: 🧺 Order items opens the same teach screen.
before = await maxOutId(OWNER)
ok('menu_order tap → 200', (await tap('menu_order')) === 200)
outs = await outsAfterId(OWNER, before)
out = mLens(outs)
ok('menu order teaches too', /quantities first|e\.g\./.test(out) || /order 2 zzcart bread/i.test(out), out)

// 11) Supplier board: the bread shop sees its open slice + claim buttons.
const tBoardBefore = await maxOutId(SUP1)
const sBoard = await send('orders', SUP1)
ok('supplier orders → 200', sBoard === 200)
const sBoardOut = await outsAfterId(SUP1, tBoardBefore)
const sBoardStr = mLens(sBoardOut)
ok('board shows slice', /Open orders waiting on you/.test(sBoardStr), sBoardStr)
ok('board shows token', sBoardStr.includes(breadRow.token), sBoardStr)

console.log('\\nbattery done — fixtures left on the board for inspection')

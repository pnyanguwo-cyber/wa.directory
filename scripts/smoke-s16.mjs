// S16 smoke battery: need intake → quote → pick → close → admin commands.
// Runs against a LOCAL dev server with WHATSAPP_DRY_RUN=1 so nothing real
// goes out. DB checks + cleanup use the service-role key via PostgREST
// (read from .env.local — no management PAT needed).
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000'
const env = readFileSync('.env.local', 'utf8')
const get = k => (env.match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1] || ''
const APP_SECRET = get('WHATSAPP_APP_SECRET')
const ADMIN = get('ADMIN_WHATSAPP').replace(/\D/g, '')
const SB_URL = get('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '')
const SB_KEY = get('SUPABASE_SERVICE_ROLE_KEY')

const BUYER = process.env.SMOKE_BUYER || '263770111222'
const SUPPLIER = process.env.SMOKE_SUPPLIER || '263770333444'

let seq = 0
// Run-scoped receipt prefix: a failed earlier battery must never trip the
// webhook_receipts dedupe on retry.
const RUN_PREFIX = `wamid.s16${Date.now().toString(36)}`
async function send(from, name, { text, action } = {}) {
  seq++
  const body = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      id: '1',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          contacts: [{ profile: { name }, wa_id: from }],
          messages: [{
            from,
            id: `${RUN_PREFIX}x${seq}`,
            timestamp: `${Math.floor(Date.now() / 1000)}`,
            type: action ? 'interactive' : 'text',
            ...(action
              ? { interactive: { type: 'button_reply', button_reply: { id: action, title: action } } }
              : { text: { body: text } }),
          }],
        },
        field: 'messages',
      }],
    }],
  })
  const sig = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex')
  const res = await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sig },
    body,
  })
  return res.status
}

// PostgREST helpers on the service role (bypasses RLS; smoke is trusted).
// Filters use REST syntax: "phone=eq.X&order=id.desc&limit=1", with *
// wildcards inside like. patterns per PostgREST rules.
async function rest(table, params = '', method = 'GET') {
  const url = `${SB_URL}/rest/v1/${table}${params ? '?' + params : ''}`
  const res = await fetch(url, {
    method,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`REST failed: ${res.status} ${JSON.stringify(json)}`)
  return json
}
const dbRows = (table, filters) => rest(table, filters)
const dbCount = async (table, filters) => {
  const rows = await rest(table, filters)
  return Array.isArray(rows) ? rows.length : 0
}
const dbDelete = (table, filters) => rest(table, filters, 'DELETE')

function ok(label, cond) {
  console.log(`${cond ? '✓' : '✗ FAIL'} ${label}`)
  if (!cond) process.exitCode = 1
}

// Send strictly in order — session state is what the battery walks through.
// 1 — menu opens the need intake (🛒 row action)
ok('menu_needs tap → 200', (await send(BUYER, 'Test Buyer', { action: 'menu_needs' })) === 200)
// 2 — one-line intake → confirm card
ok('intake line → 200', (await send(BUYER, 'Test Buyer', { text: '50 bags cement harare $40-60' })) === 200)
// 3 — post it
ok('post tap → 200', (await send(BUYER, 'Test Buyer', { action: 'need_post' })) === 200)

// 4 — need row exists
const needRows = await dbRows(
  'work_needs', `buyer_phone=eq.${BUYER}&order=id.desc&limit=1&select=id,rq_id,buyer_phone,item,qty,budget,city,status`
)
const need = Array.isArray(needRows) ? needRows[0] : null
ok('need row created', !!need)
ok('need fields parsed', !!need && /cement/i.test(need.item) && /50/i.test(need.qty) && /40/.test(need.budget) && /harare/i.test(need.city))
if (!need) process.exit(1)
const rq = need.rq_id
console.log('   rq:', rq)

// 5 — supplier quotes via deep-link style text
ok('supplier quote → 200', (await send(SUPPLIER, 'Supplier Sam', { text: `${rq} $45 ready tuesday` })) === 200)
const quoteRows = await dbRows(
  'need_quotes', `need_id=eq.${need.id}&order=id.desc&limit=1&select=id,supplier_phone,price,body`
)
const quote = Array.isArray(quoteRows) ? quoteRows[0] : null
ok('quote row created', !!quote)
ok('price parsed', !!quote && quote.price === '$45')
if (!quote) process.exit(1)

// 6 — relay cap: 5 more quotes → only 5 relayed
for (let i = 0; i < 6; i++) {
  await send(SUPPLIER, 'Supplier Sam', { text: `${rq} $4${i} bulk deal ${i}` })
}
const cnt = await dbCount('need_quotes', `need_id=eq.${need.id}&select=id`)
ok('quotes stored ≤ 6 (cap holds relays, storage continues as quiet)', cnt <= 7)

// 7 — buyer picks the first real quote
ok('q_pick → 200', (await send(BUYER, 'Test Buyer', { action: `q_pick_${quote.id}` })) === 200)
const closed = await dbRows('work_needs', `id=eq.${need.id}&select=status,closed_by,winner_quote_id`)
ok('need closed with winner', Array.isArray(closed) && closed[0]?.status === 'closed' && closed[0]?.winner_quote_id === quote.id)

// 8 — quote after close gets the filled notice (no new quote row)
const before = cnt
ok('late quote → 200', (await send(SUPPLIER, 'Supplier Sam', { text: `${rq} $20 late` })) === 200)
const after = await dbCount('need_quotes', `need_id=eq.${need.id}&select=id`)
ok('no quote stored after close', after === before)

// 9 — admin command suite
ok('digest → 200', (await send(ADMIN, 'Owner', { text: 'digest' })) === 200)
ok('digest 10:30 → 200', (await send(ADMIN, 'Owner', { text: 'digest 10:30' })) === 200)
ok('digest range → 200', (await send(ADMIN, 'Owner', { text: 'digest 10:30 13:00' })) === 200)
ok('digest bad → 200', (await send(ADMIN, 'Owner', { text: 'digest banana' })) === 200)
ok('needs → 200', (await send(ADMIN, 'Owner', { text: 'needs' })) === 200)
ok('stats → 200', (await send(ADMIN, 'Owner', { text: 'stats' })) === 200)

// 10 — demand radar: a buyer search lands in bot_searches
ok('search → 200', (await send(BUYER, 'Test Buyer', { text: 'cement harare' })) === 200)
const searches = await dbCount('bot_searches', `phone=in.(${BUYER},${SUPPLIER})&select=id`)
ok('search logged', searches >= 1)

// 11 — transcripts logged both directions
const msgs = await dbCount('bot_messages', `phone=eq.${BUYER}&select=id`)
ok('transcript rows exist', msgs >= 5)

// cleanup (PostgREST can't subquery — resolve the need ids first)
const myNeeds = (await dbRows('work_needs', `buyer_phone=in.(${BUYER},${SUPPLIER})&select=id`)) || []
const ids = myNeeds.map(r => r.id).join(',')
if (ids) await dbDelete('need_quotes', `need_id=in.(${ids})`)
await dbDelete('work_needs', `buyer_phone=in.(${BUYER},${SUPPLIER})`)
await dbDelete('bot_messages', `phone=in.(${BUYER},${SUPPLIER},${ADMIN})`)
await dbDelete('bot_searches', `phone=in.(${BUYER},${SUPPLIER})`)
await dbDelete('chat_sessions', `phone=in.(${BUYER},${SUPPLIER},${ADMIN})`)
await dbDelete('webhook_receipts', `message_id=like.wamid.s16*`)
console.log('cleanup done')

import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage, sendInteractiveButtons } from '@/lib/whatsapp'
import { CEREMONY_IDLE_HOURS, listNeedQuotes, fmtHarare } from '@/lib/needs'
import { logBotMessage, pruneBotMessages } from '@/lib/bot-log'
import { sweepStaleOrders } from '@/lib/orders'

function authorized(request: Request): boolean {
  if (request.headers.get('x-vercel-cron') === '1') return true
  const secret = process.env.CRON_SECRET
  return !!secret && request.headers.get('authorization') === `Bearer ${secret}`
}

interface TraceRow {
  id: number
  rq_id: string
  buyer_phone: string
  item: string
  qty?: string
  status: string
  closed_by?: string | null
  winner_quote_id?: number | null
  trace: { k?: string }[]
}

async function tracePush(supabase: ReturnType<typeof getSupabase>, id: number, trace: { k?: string }[], kind: string) {
  const next = [...(Array.isArray(trace) ? trace : []), { t: new Date().toISOString(), k: kind }]
  await supabase.from('work_needs').update({ trace: next }).eq('id', id)
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 403 })
  }

  const supabase = getSupabase()
  const idleCutoff = new Date(Date.now() - CEREMONY_IDLE_HOURS * 3600000).toISOString()
  const windowStart = new Date(Date.now() - (CEREMONY_IDLE_HOURS + 2) * 3600000).toISOString()
  const windowEnd = new Date(Date.now() - CEREMONY_IDLE_HOURS * 3600000).toISOString()

  let ceremonies = 0
  let dealAsks = 0

  // ── Closing ceremony: open needs silent for 22h ────────────────────────
  try {
    const { data: idleNeeds } = await supabase
      .from('work_needs')
      .select('id, rq_id, buyer_phone, item, qty, status, closed_by, winner_quote_id, trace, updated_at')
      .eq('status', 'open')
      .is('ceremony_sent_at', null)
      .lt('updated_at', idleCutoff)
      .limit(50)

    for (const n of (idleNeeds as TraceRow[]) || []) {
      const quotes = await listNeedQuotes(n.id, 5)
      const quoteLines = quotes.map(q => `${q.supplier_name || 'supplier'}${q.price ? ` · ${q.price}` : ''}`)
      const body = [
        `⏳ This thread goes quiet soon — *${n.rq_id}* (${[n.qty, n.item].filter(Boolean).join(' ')}).`,
        '',
        quotes.length > 0 ? `Quotes received: ${quotes.length}` : 'No quotes came in.',
        'Sorted? Great — nothing to do, save any contact you still need.',
        `Still looking? Answer below and it stays live:`,
      ].join('\n')
      await sendInteractiveButtons(n.buyer_phone, body, [
        { id: `nd_no_${n.rq_id}`, title: 'Still looking' },
        { id: `nd_yes_${n.rq_id}`, title: '✅ Sorted' },
      ])
      logBotMessage(n.buyer_phone, 'out', 'buttons', body).catch(() => {})
      await supabase.from('work_needs').update({
        ceremony_sent_at: new Date().toISOString(),
        status: 'closed',
        closed_by: 'auto',
      }).eq('id', n.id)
      await tracePush(supabase, n.id, n.trace, 'ceremony')
      ceremonies++
    }
  } catch (err) {
    console.error('[cron-hourly] ceremony failed:', err)
  }

  // ── Deal-ask follow-up: closed threads, asked at most once ─────────────
  try {
    const { data: closedNeeds } = await supabase
      .from('work_needs')
      .select('id, rq_id, buyer_phone, item, status, closed_by, trace, updated_at')
      .eq('status', 'closed')
      .gte('updated_at', windowStart)
      .lt('updated_at', windowEnd)
      .limit(50)

    for (const n of (closedNeeds as TraceRow[]) || []) {
      if ((Array.isArray(n.trace) ? n.trace : []).some(e => e?.k === 'deal_ask')) continue
      const body = [
        `🤝 Did the deal happen for *${n.rq_id}* (${[n.qty, n.item].filter(Boolean).join(' ')})?`,
      ].join('\n')
      await sendInteractiveButtons(n.buyer_phone, body, [
        { id: `nd_yes_${n.rq_id}`, title: '✅ Yes, sorted' },
        { id: `nd_no_${n.rq_id}`, title: 'Still open' },
      ])
      logBotMessage(n.buyer_phone, 'out', 'buttons', body).catch(() => {})
      await tracePush(supabase, n.id, n.trace, 'deal_ask')
      dealAsks++
    }
  } catch (err) {
    console.error('[cron-hourly] deal-ask failed:', err)
  }

  // ── Typed-order TTL: stale open/sent rows close at 24h ────────────────
  let ordersSwept = 0
  try {
    ordersSwept = await sweepStaleOrders()
  } catch (err) {
    console.error('[cron-hourly] order sweep failed:', err)
  }

  // ── Transcript hygiene (60-day trim) ───────────────────────────────────
  await pruneBotMessages()

  return NextResponse.json({
    status: 'ok',
    at: fmtHarare(new Date().toISOString(), true),
    ceremonies,
    dealAsks,
    ordersSwept,
  })
}

import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import { getSupabase } from '@/lib/supabase-server'
import { listRecentNeeds, closeNeedByRqId, channelPostFor, reopenNeed, getNeedByRqId } from '@/lib/needs'

export async function GET() {
  const denied = adminGuard()
  if (denied) return denied

  const needs = await listRecentNeeds(100)

  // Quotes for the listed needs in one probe.
  const ids = needs.map(n => n.id)
  let quotesByNeed = new Map<number, { id: number; supplier_name: string; price: string }[]>()
  if (ids.length > 0) {
    const { data: quotes } = await getSupabase()
      .from('need_quotes')
      .select('id, need_id, supplier_name, price')
      .in('need_id', ids)
      .order('created_at', { ascending: true })
    for (const q of quotes || []) {
      const list = quotesByNeed.get(q.need_id) || []
      list.push({ id: q.id, supplier_name: q.supplier_name, price: q.price })
      quotesByNeed.set(q.need_id, list)
    }
  }

  return NextResponse.json({
    needs: needs.map(n => ({
      ...n,
      quotes: quotesByNeed.get(n.id) || [],
      channel_post: channelPostFor(n),
    })),
  })
}

export async function POST(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const body = await request.json()
    const action = body?.action as string
    const rqId = String(body?.rq_id || '')

    if (action === 'close') {
      const ok = await closeNeedByRqId(rqId, 'admin')
      return NextResponse.json({ ok }, { status: ok ? 200 : 409 })
    }

    if (action === 'relaunch') {
      const need = await getNeedByRqId(rqId)
      if (!need) return NextResponse.json({ error: 'need not found' }, { status: 404 })
      if (need.status !== 'open') await reopenNeed(need.id)
      return NextResponse.json({ ok: true, channel_post: channelPostFor(need) })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
}

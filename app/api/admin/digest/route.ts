import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import { compileDigest, getDigestCursor, searchesInWindow, listRecentNeeds } from '@/lib/needs'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

async function windowFrom(params: URLSearchParams): Promise<{ fromIso: string; toIso: string }> {
  const toIso = params.get('to') ? new Date(params.get('to') as string).toISOString() : new Date().toISOString()
  const fromRaw = params.get('from')
  if (fromRaw) return { fromIso: new Date(fromRaw).toISOString(), toIso }
  let fromIso: string
  if (params.get('cursor') === '1') {
    const cursor = await getDigestCursor()
    fromIso = cursor || new Date(new Date(toIso).getTime() - 24 * 3600000).toISOString()
  } else {
    fromIso = new Date(new Date(toIso).getTime() - 24 * 3600000).toISOString()
  }
  return { fromIso, toIso }
}

export async function GET(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  const params = new URL(request.url).searchParams
  if (params.get('cursor') === 'cursor') {
    return NextResponse.json({ cursor: await getDigestCursor() })
  }

  const { fromIso, toIso } = await windowFrom(params)

  if (params.get('csv') === '1') {
    // CSV dump of raw needs in the window (spreadsheet-friendly).
    const all = await listRecentNeeds(300)
    const needs = all.filter(n => n.created_at >= fromIso && n.created_at <= toIso)
    const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`
    const rows = [
      'rq_id,created_at,item,qty,budget,city,status,closed_by,quotes_forwarded,buyer_phone',
      ...needs.map(n =>
        [
          esc(n.rq_id),
          esc(n.created_at),
          esc(n.item),
          esc(n.qty),
          esc(n.budget),
          esc(n.city),
          esc(n.status),
          esc(n.closed_by),
          esc(n.quotes_forwarded),
          esc(n.buyer_phone),
        ].join(',')
      ),
    ].join('\n')
    return new NextResponse(rows, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="needs-${fromIso.slice(0, 10)}.csv"`,
      },
    })
  }

  const text = await compileDigest(fromIso, toIso)
  const all = await listRecentNeeds(300)
  const needs = all.filter(n => n.created_at >= fromIso && n.created_at <= toIso)
  const searches = await searchesInWindow(fromIso, toIso)
  return NextResponse.json({
    text,
    fromIso,
    toIso,
    counts: { needs: needs.length, searches: searches.length },
  })
}

export async function POST(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const body = await request.json()
    const admin = (process.env.ADMIN_WHATSAPP || '').replace(/\D/g, '')
    if (!admin) {
      return NextResponse.json({ error: 'ADMIN_WHATSAPP is not set on the server' }, { status: 400 })
    }
    const params = new URLSearchParams()
    if (body?.from) params.set('from', body.from)
    if (body?.to) params.set('to', body.to)
    if (body?.cursor) params.set('cursor', '1')
    const { fromIso, toIso } = await windowFrom(params)
    const text = await compileDigest(fromIso, toIso)
    // The relay answers with ok/false only under dry-run; the real send
    // errors are logged server-side. A closed 24h window also fails silently
    // on Meta's side — the copy still lands on the next `digest` command.
    try {
      await sendWhatsAppMessage(admin, text)
    } catch {
      return NextResponse.json(
        { error: 'send failed — the admin chat window may be closed; reply *digest* from your WhatsApp instead (free).' },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, fromIso, toIso })
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
}

import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'

export const runtime = 'nodejs'

// Admin transcript images: WhatsApp inbound photos are stored as Meta media
// ids (they expire in ~30 days and need the access token to fetch), so the
// chat view streams them through here instead of showing a broken <img>.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = adminGuard()
  if (denied) return denied

  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!token) return NextResponse.json({ error: 'WhatsApp is not configured' }, { status: 503 })

  const { id } = await params
  if (!/^[A-Za-z0-9_-]{4,120}$/.test(id || '')) {
    return NextResponse.json({ error: 'Bad media id' }, { status: 400 })
  }

  try {
    const metaRes = await fetch(`https://graph.facebook.com/v18.0/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!metaRes.ok) {
      return NextResponse.json({ error: `Media unavailable (${metaRes.status})` }, { status: 404 })
    }
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string }

    const bin = await fetch(meta.url || '', { headers: { Authorization: `Bearer ${token}` } })
    if (!bin.ok || !bin.body) {
      return NextResponse.json({ error: 'Could not download media' }, { status: 502 })
    }

    return new NextResponse(bin.body, {
      headers: {
        'content-type': meta.mime_type || 'image/jpeg',
        // Media ids are long-lived enough for a chat view; keep the browser
        // from re-fetching on every poll.
        'cache-control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Could not load media' }, { status: 502 })
  }
}

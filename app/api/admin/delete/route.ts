import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { isAdmin } from '@/lib/admin-auth'

export async function POST(request: Request) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const ids: string[] = Array.isArray(body.ids) && body.ids.length
      ? body.ids.filter((x: unknown) => typeof x === 'string')
      : body.id ? [body.id] : []

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No listing id(s) provided' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch contact details before deletion so owners can be notified.
    const { data: doomed } = await supabase
      .from('businesses')
      .select('id, name, phone')
      .in('id', ids)

    const { error } = await supabase
      .from('businesses')
      .delete()
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Best-effort removal notice to each owner (non-blocking).
    for (const b of doomed || []) {
      const digits = (b.phone || '').replace(/\D/g, '')
      if (!digits) continue
      sendWhatsAppMessage(
        '+' + digits,
        [
          `🗑️ *LISTING REMOVED — ${b.name}*`,
          '',
          'Your listing on WA Directory has been removed by our team.',
          '',
          'If you believe this was a mistake or want to re-list, please contact our support team.',
        ].join('\n')
      ).catch(() => {})
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

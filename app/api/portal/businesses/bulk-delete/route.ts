import { NextResponse } from 'next/server'
import { getPortalActor, resolveActingBusinessId } from '@/lib/org-auth'
import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { digitsOnly } from '@/lib/phone'

export async function POST(request: Request) {
  try {
    const actor = await getPortalActor()
    if (!actor) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    // Only HQ can bulk delete branches
    if (actor.role !== 'org-hq') {
      return NextResponse.json({ error: 'Only organization HQ can bulk delete branches' }, { status: 403 })
    }

    const body = await request.json()
    const ids: string[] = Array.isArray(body.ids) && body.ids.length
      ? body.ids.filter((x: unknown) => typeof x === 'string')
      : body.id ? [body.id] : []

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No listing id(s) provided' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Verify all IDs belong to this organization
    const { data: orgBusinesses } = await supabase
      .from('businesses')
      .select('id, name, phone')
      .in('id', ids)
      .eq('org_id', actor.orgId)
      .eq('is_hq', false) // Can't delete HQ

    if (!orgBusinesses || orgBusinesses.length !== ids.length) {
      return NextResponse.json({ error: 'Some listings do not belong to your organization or cannot be deleted' }, { status: 403 })
    }

    // Delete the businesses
    const { error } = await supabase
      .from('businesses')
      .delete()
      .in('id', ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Best-effort removal notice to each owner (non-blocking)
    for (const b of orgBusinesses) {
      const digits = digitsOnly(b.phone || '')
      if (!digits) continue
      sendWhatsAppMessage(
        '+' + digits,
        [
          `🗑️ *LISTING REMOVED: ${b.name}*`,
          '',
          'Your listing on WA Directory has been removed by your organization.',
          '',
          'If you believe this was a mistake or want to re-list, please contact your organization admin.',
        ].join('\n')
      ).catch(() => {})
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
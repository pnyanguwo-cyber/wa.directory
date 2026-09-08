import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const { data: contests } = await supabase
    .from('name_contests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const businessIds = [...new Set((contests || []).filter(c => c.business_id).map(c => c.business_id))]
  const { data: businesses } = businessIds.length
    ? await supabase.from('businesses').select('id, name, username, city').in('id', businessIds)
    : { data: [] }

  const bizById = new Map((businesses || []).map(b => [b.id, b]))

  return NextResponse.json({
    contests: (contests || []).map(c => ({
      ...c,
      business: c.business_id ? bizById.get(c.business_id) || null : null,
    })),
  })
}

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { contest_id, action, note } = body

    if (!contest_id || !action) {
      return NextResponse.json({ error: 'contest_id and action are required' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: contest } = await supabase
      .from('name_contests')
      .select('*')
      .eq('id', contest_id)
      .maybeSingle()

    if (!contest) return NextResponse.json({ error: 'Contest not found' }, { status: 404 })

    if (action === 'approve') {
      // Approve: transfer username to contestant (if business exists, update it)
      // For now, just mark as approved — admin decides what to do
      await supabase
        .from('name_contests')
        .update({ status: 'approved', admin_note: note || '' })
        .eq('id', contest_id)

      // Notify contestant
      if (contest.contestant_phone) {
        sendWhatsAppMessage(
          contest.contestant_phone,
          [
            '✅ *Name contest approved!*',
            '',
            `Your claim for @${contest.contested_username} has been approved.`,
            'Contact admin to complete the transfer.',
          ].join('\n')
        ).catch(() => {})
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'reject') {
      await supabase
        .from('name_contests')
        .update({ status: 'rejected', admin_note: note || '' })
        .eq('id', contest_id)

      // Notify contestant
      if (contest.contestant_phone) {
        sendWhatsAppMessage(
          contest.contestant_phone,
          [
            '❌ *Name contest rejected*',
            '',
            `Your claim for @${contest.contested_username} was not approved.`,
            note ? `Reason: ${note}` : '',
            'Choose a different username or contact us for more information.',
          ].filter(Boolean).join('\n')
        ).catch(() => {})
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

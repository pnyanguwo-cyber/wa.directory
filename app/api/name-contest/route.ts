import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizeUsername } from '@/lib/username'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contestant_name, contestant_phone, contested_username, reason } = body || {}

    if (!contestant_name || !contestant_phone || !contested_username) {
      return NextResponse.json({ error: 'Name, phone, and username are required' }, { status: 400 })
    }

    const normalized = normalizeUsername(contested_username)
    if (!normalized || normalized.length < 3) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Find the existing business that holds this username
    const { data: existing } = await supabase
      .from('businesses')
      .select('id, name, city')
      .eq('username', normalized)
      .maybeSingle()

    // Check for duplicate contest
    const { data: duplicate } = await supabase
      .from('name_contests')
      .select('id')
      .eq('contested_username', normalized)
      .eq('contestant_phone', contestant_phone)
      .eq('status', 'pending')
      .maybeSingle()

    if (duplicate) {
      return NextResponse.json({ error: 'You already have a pending contest for this username' }, { status: 409 })
    }

    const { error } = await supabase
      .from('name_contests')
      .insert({
        contestant_name: contestant_name.trim(),
        contestant_phone: contestant_phone.trim(),
        contested_username: normalized,
        business_id: existing?.id || null,
        reason: (reason || '').trim(),
        status: 'pending',
      })

    if (error) {
      return NextResponse.json({ error: 'Failed to submit contest' }, { status: 500 })
    }

    // Notify admin via WhatsApp
    if (process.env.ADMIN_WHATSAPP) {
      const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'
      sendWhatsAppMessage(
        process.env.ADMIN_WHATSAPP,
        [
          '⚠️ *NAME CONTEST SUBMITTED*',
          '',
          `Contestant: ${contestant_name.trim()} (${contestant_phone.trim()})`,
          `Claims username: @${normalized}`,
          existing ? `Currently held by: ${existing.name} (${existing.city || 'unknown city'})` : 'No existing holder found',
          reason ? `Reason: ${reason.trim()}` : '',
          '',
          `Review: ${siteUrl}/admin`,
        ].filter(Boolean).join('\n')
      ).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

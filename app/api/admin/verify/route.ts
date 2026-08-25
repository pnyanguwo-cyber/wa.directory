import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'
import { isAdmin } from '@/lib/admin-auth'

const SITE_URL = process.env.SITE_URL || 'https://wadirectory.co.zw'

export async function POST(request: Request) {
  try {
    if (!isAdmin()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, verified } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: business } = await supabase
      .from('businesses')
      .select('phone, name, slug')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('businesses')
      .update({ verified })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (verified && business?.phone) {
      const to = '+' + business.phone.replace(/\D/g, '')
      const link = `${SITE_URL}/business/${business.slug || id}`
      sendWhatsAppTemplate(
        to,
        process.env.WHATSAPP_TEMPLATE_APPROVED || 'you_are_live',
        [business.name, link]
      ).catch(err => console.error('[verify] notification failed:', err))
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const customerPhone = searchParams.get('f') || ''
  const foundVia = searchParams.get('via') || ''

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: business } = await supabase
    .from('businesses')
    .select('id, phone')
    .eq('id', params.id)
    .maybeSingle()

  if (!business) {
    redirect('/')
  }

  try {
    await supabase.from('stats_events').insert({
      business_id: business.id,
      type: 'bot_chat_open',
      category: '',
      city: '',
    })
  } catch {
    // never block the redirect
  }

  if (customerPhone) {
    try {
      const now = new Date().toISOString()
      const { data: existing } = await supabase
        .from('chat_logs')
        .select('id, messages')
        .eq('customer_phone', customerPhone)
        .eq('business_id', business.id)
        .maybeSingle()

      const messages = Array.isArray(existing?.messages) ? existing.messages : []
      messages.push({
        from: 'bot',
        text: `Customer opened your chat (found via ${foundVia || 'bot search'})`,
        at: now,
      })

      await supabase.from('chat_logs').upsert(
        {
          business_id: business.id,
          customer_phone: customerPhone,
          messages,
          found_via: foundVia || 'bot search',
          created_at: existing ? undefined : now,
          updated_at: now,
        },
        { onConflict: 'customer_phone,business_id' }
      )
    } catch {
      // attribution is best-effort
    }
  }

  const phone = (business.phone || '').replace(/[^0-9]/g, '')
  redirect(
    `https://wa.me/${phone}?text=${encodeURIComponent('Hi! I found you on WA Directory and I would like to chat.')}`
  )
}
import { redirect } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  const supabase = getSupabase()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, phone, phone_type, whatsapp_link')
    .eq('slug', slug)
    .maybeSingle()

  if (!business) {
    redirect('/')
  }

  try {
    await supabase.from('stats_events').insert({
      business_id: business.id,
      type: 'qr_scan',
      category: '',
      city: '',
    })
  } catch {
    // fire-and-forget: never block the redirect
  }

  // Voice-only listings have no WhatsApp chat — the QR dials the number instead.
  if (business.phone_type === 'voice') {
    redirect(`tel:${business.phone}`)
  }

  const message = encodeURIComponent(
    `Hi! I scanned your QR code on WA Directory and would like to chat.`
  )
  const phone = (business.phone || '').replace(/[^0-9]/g, '')
  redirect(`https://wa.me/${phone}?text=${message}`)
}
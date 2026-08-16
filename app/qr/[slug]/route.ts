import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: business } = await supabase
    .from('businesses')
    .select('id, phone, whatsapp_link')
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

  const message = encodeURIComponent(
    `Hi! I scanned your QR code on WA Directory and would like to chat.`
  )
  const phone = (business.phone || '').replace(/[^0-9]/g, '')
  redirect(`https://wa.me/${phone}?text=${message}`)
}
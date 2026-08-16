import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const SITE_URL = process.env.SITE_URL || 'https://wadirectory.co.zw'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()

  const { data: requests, error } = await supabase
    .from('feature_requests')
    .select('id, type, name, city, status, corrected_name, created_at, business_id, businesses(name, phone, slug)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ requests: requests || [] })
}

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id, action, corrected_name } = await request.json()

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: req } = await supabase
      .from('feature_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const finalName = action === 'approve' && corrected_name?.trim()
      ? corrected_name.trim()
      : req.name

    if (action === 'reject') {
      const arrCol = req.type === 'category' ? 'category' : 'areas'

      // Remove the rejected name from the business's array
      const { data: biz } = await supabase
        .from('businesses')
        .select('category, areas, phone, slug')
        .eq('id', req.business_id)
        .single()

      if (biz) {
        const arr: string[] = req.type === 'category' ? (biz.category || []) : (biz.areas || [])
        const next = arr.filter((n: string) => n !== req.name && n !== finalName)
        await supabase
          .from('businesses')
          .update({ [arrCol]: next })
          .eq('id', req.business_id)

        if (biz.phone) {
          const profileUrl = biz.slug ? `${SITE_URL}/business/${biz.slug}` : SITE_URL
          sendWhatsAppMessage(
            '+' + String(biz.phone).replace(/\D/g, ''),
            [
              `Hi! We couldn't approve *"${req.name}"* as your ${req.type === 'category' ? 'category' : 'area'}.`,
              '',
              'Please review your listing, or suggest a correction by contacting us.',
              `Your listing: ${profileUrl}`,
              'WA Directory team',
            ].join('\n')
          ).catch(err => console.error('[feature-request] notify failed:', err))
        }
      }

      await supabase.from('feature_requests').update({ status: 'rejected' }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    // Approve
    if (req.type === 'category') {
      await supabase
        .from('categories')
        .upsert({ name: finalName, active: true }, { onConflict: 'name' })
    } else {
      await supabase
        .from('areas')
        .upsert({ city: req.city, name: finalName, active: true }, { onConflict: 'city,name' })
    }

    // Replace the old name with the corrected name in the business's array
    const { data: biz } = await supabase
      .from('businesses')
      .select('category, areas')
      .eq('id', req.business_id)
      .single()

    if (biz) {
      const arrCol = req.type === 'category' ? 'category' : 'areas'
      const arr: string[] = req.type === 'category' ? (biz.category || []) : (biz.areas || [])
      const next = arr.map((n: string) => (n === req.name ? finalName : n))
      await supabase.from('businesses').update({ [arrCol]: next }).eq('id', req.business_id)
    }

    await supabase
      .from('feature_requests')
      .update({ status: 'approved', corrected_name: finalName === req.name ? '' : finalName })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

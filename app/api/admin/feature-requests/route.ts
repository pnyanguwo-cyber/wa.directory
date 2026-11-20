import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { adminGuard } from '@/lib/admin-auth'
import { SITE_URL } from '@/lib/site-url'
import { digitsOnly } from '@/lib/phone'
import { approveFeatureRequest, connectCategoryRequest, type FeatureRequestRow } from '@/lib/feature-request-actions'

export async function GET() {
  const denied = adminGuard()
  if (denied) return denied

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
  const denied = adminGuard()
  if (denied) return denied

  try {
    const { id, action, corrected_name } = await request.json()

    if (!id || !['approve', 'reject', 'connect'].includes(action)) {
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
      const arrCol = req.type === 'category' ? 'category' : req.type === 'area' ? 'areas' : 'city'

      // Remove the rejected name from the business's array
      const { data: biz } = await supabase
        .from('businesses')
        .select('category, areas, city, phone, slug, requested_category')
        .eq('id', req.business_id)
        .single()

      if (biz) {
        if (req.type === 'city') {
          await supabase
            .from('businesses')
            .update({ city: '' })
            .eq('id', req.business_id)
        } else {
          const arr: string[] = req.type === 'category' ? (biz.category || []) : (biz.areas || [])
          const next = arr.filter((n: string) => n !== req.name && n !== finalName)
          // A rejected category request must also release the placeholder that
          // was waiting on it, or the listing keeps a pending label forever.
          const provisional = (biz.requested_category || '').trim().toLowerCase()
          const clearsPlaceholder =
            req.type === 'category' && !!provisional && provisional === req.name.toLowerCase()
          await supabase
            .from('businesses')
            .update(clearsPlaceholder ? { [arrCol]: next, requested_category: '' } : { [arrCol]: next })
            .eq('id', req.business_id)
        }

        if (biz.phone) {
          const profileUrl = biz.slug ? `${SITE_URL}/business/${biz.slug}` : SITE_URL
          const typeLabel = req.type === 'category' ? 'category' : req.type === 'area' ? 'area' : 'city / town'
          sendWhatsAppMessage(
            '+' + digitsOnly(biz.phone),
            [
              `Hi! We couldn't approve *"${req.name}"* as your ${typeLabel}.`,
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

    // Connect to an existing category: no new category, just the alias and the
    // listing filed where it belongs.
    if (action === 'connect') {
      const result = await connectCategoryRequest(supabase, req as FeatureRequestRow, corrected_name || '')
      if (!result.ok) return NextResponse.json({ error: result.error || 'Could not connect' }, { status: 400 })

      if (req.business_id) {
        const { data: biz } = await supabase
          .from('businesses')
          .select('phone, slug')
          .eq('id', req.business_id)
          .maybeSingle()
        if (biz?.phone) {
          const profileUrl = biz.slug ? `${SITE_URL}/business/${biz.slug}` : SITE_URL
          sendWhatsAppMessage(
            '+' + digitsOnly(biz.phone),
            `✅ Thanks! We've filed *${req.name}* under the existing *${result.name}* category, so buyers searching either word will find you.\n\nYour listing: ${profileUrl}`
          ).catch(err => console.error('[feature-request] connect notify failed:', err))
        }
      }
      return NextResponse.json({ success: true, name: result.name })
    }

    // Approve
    await approveFeatureRequest(supabase, req as FeatureRequestRow, corrected_name)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

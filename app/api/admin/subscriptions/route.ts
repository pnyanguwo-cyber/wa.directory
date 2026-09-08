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

function monthEnd(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return d.toISOString()
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()

  // Premium subscriptions (existing)
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, business_id, status, amount, started_at, expires_at, admin_note, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  const ids = [...new Set((subs || []).map(s => s.business_id))]
  const { data: businesses } = ids.length
    ? await supabase.from('businesses').select('id, name, slug, phone').in('id', ids)
    : { data: [] }

  const bizById = new Map((businesses || []).map(b => [b.id, b]))

  // Listing subscriptions (new)
  const { data: listingSubs } = await supabase
    .from('listing_subscriptions')
    .select('id, business_id, status, amount, payer_phone, started_at, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(300)

  const listingIds = [...new Set((listingSubs || []).map(s => s.business_id))]
  const { data: listingBusinesses } = listingIds.length
    ? await supabase.from('businesses').select('id, name, slug, phone, business_id, username, city, payment_status').in('id', listingIds)
    : { data: [] }

  const listingBizById = new Map((listingBusinesses || []).map(b => [b.id, b]))

  return NextResponse.json({
    subscriptions: (subs || []).map(s => ({ ...s, business: bizById.get(s.business_id) || null })),
    listingSubscriptions: (listingSubs || []).map(s => ({
      ...s,
      business: listingBizById.get(s.business_id) || null,
    })),
  })
}

export async function POST(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const supabase = getSupabase()

    if (body.action === 'activate') {
      const { subscription_id, amount } = body
      if (!subscription_id) return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 })

      const { data: existing } = await supabase
        .from('subscriptions')
        .select('business_id')
        .eq('id', subscription_id)
        .maybeSingle()

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          amount: Number(amount || 0),
          started_at: new Date().toISOString(),
          expires_at: monthEnd(),
        })
        .eq('id', subscription_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      if (existing) {
        const { data: business } = await supabase
          .from('businesses')
          .select('name, phone')
          .eq('id', existing.business_id)
          .maybeSingle()
        if (business?.phone) {
          sendWhatsAppMessage(
            business.phone,
            [
              '🎉 *Your premium subscription is active!*',
              '',
              `Enjoy full statistics, conversations, bidding and competitor insights until ${monthEnd().slice(0, 10)}.`,
              '',
              'Open your portal to explore: ' + (process.env.SITE_URL || 'https://wadirectory.co.zw') + '/portal',
            ].join('\n')
          ).catch(() => {})
        }
      }
      return NextResponse.json({ success: true })
    }

    if (body.action === 'extend') {
      const { subscription_id, days } = body
      if (!subscription_id || !days) return NextResponse.json({ error: 'subscription_id and days are required' }, { status: 400 })

      const { data: existing } = await supabase
        .from('subscriptions')
        .select('expires_at')
        .eq('id', subscription_id)
        .maybeSingle()

      const base = existing?.expires_at && new Date(existing.expires_at) > new Date()
        ? new Date(existing.expires_at)
        : new Date()
      base.setDate(base.getDate() + Number(days))

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active', expires_at: base.toISOString() })
        .eq('id', subscription_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (body.action === 'cancel') {
      const { subscription_id, note } = body
      if (!subscription_id) return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 })
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', admin_note: note || '' })
        .eq('id', subscription_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    // === LISTING PAYMENT ACTIONS ===

    if (body.action === 'confirm_listing_payment') {
      const { subscription_id } = body
      if (!subscription_id) return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 })

      const { data: existing } = await supabase
        .from('listing_subscriptions')
        .select('business_id')
        .eq('id', subscription_id)
        .maybeSingle()

      if (!existing) return NextResponse.json({ error: 'Listing subscription not found' }, { status: 404 })

      const { error } = await supabase
        .from('listing_subscriptions')
        .update({
          status: 'active',
          amount: 1.00,
          started_at: new Date().toISOString(),
          expires_at: monthEnd(),
        })
        .eq('id', subscription_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Activate the business listing
      await supabase
        .from('businesses')
        .update({
          payment_status: 'active',
          verified: true,
          listing_activated_at: new Date().toISOString(),
        })
        .eq('id', existing.business_id)

      // Notify business owner
      const { data: business } = await supabase
        .from('businesses')
        .select('name, phone, username')
        .eq('id', existing.business_id)
        .maybeSingle()

      if (business?.phone) {
        sendWhatsAppMessage(
          business.phone,
          [
            '🎉 *Your listing is now live!*',
            '',
            `${business.name} (@${business.username || 'N/A'}) is now visible on WA Directory.`,
            `Active until ${monthEnd().slice(0, 10)}.`,
            '',
            'Anyone can renew for you at: ' + (process.env.SITE_URL || 'https://wadirectory.co.zw') + '/pay',
          ].join('\n')
        ).catch(() => {})
      }

      return NextResponse.json({ success: true })
    }

    if (body.action === 'extend_listing') {
      const { subscription_id, days } = body
      if (!subscription_id || !days) return NextResponse.json({ error: 'subscription_id and days are required' }, { status: 400 })

      const { data: existing } = await supabase
        .from('listing_subscriptions')
        .select('business_id, expires_at')
        .eq('id', subscription_id)
        .maybeSingle()

      if (!existing) return NextResponse.json({ error: 'Listing subscription not found' }, { status: 404 })

      const base = existing.expires_at && new Date(existing.expires_at) > new Date()
        ? new Date(existing.expires_at)
        : new Date()
      base.setDate(base.getDate() + Number(days))

      const { error } = await supabase
        .from('listing_subscriptions')
        .update({ status: 'active', expires_at: base.toISOString() })
        .eq('id', subscription_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Ensure business is active
      await supabase
        .from('businesses')
        .update({ payment_status: 'active', verified: true })
        .eq('id', existing.business_id)

      return NextResponse.json({ success: true })
    }

    if (body.action === 'cancel_listing') {
      const { subscription_id } = body
      if (!subscription_id) return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 })

      const { data: existing } = await supabase
        .from('listing_subscriptions')
        .select('business_id')
        .eq('id', subscription_id)
        .maybeSingle()

      const { error } = await supabase
        .from('listing_subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', subscription_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      if (existing) {
        await supabase
          .from('businesses')
          .update({ payment_status: 'expired' })
          .eq('id', existing.business_id)
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { PLAN_CONFIG } from '@/types'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()

  // Premium subscriptions
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

  // Listing subscriptions — include plan + pro_assistance
  const { data: listingSubs } = await supabase
    .from('listing_subscriptions')
    .select('id, business_id, status, amount, payer_phone, started_at, expires_at, renewal_notified_at, created_at, plan, pro_assistance')
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

    // === PREMIUM SUBSCRIPTION ACTIONS ===

    if (body.action === 'activate') {
      const { subscription_id, amount } = body
      if (!subscription_id) return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 })

      const { data: existing } = await supabase
        .from('subscriptions')
        .select('business_id')
        .eq('id', subscription_id)
        .maybeSingle()

      const now = new Date()
      const expiresAt = addDays(now, 30)

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          amount: Number(amount || 0),
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
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
              `Enjoy full statistics, conversations, bidding and competitor insights until ${expiresAt.toISOString().slice(0, 10)}.`,
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
      const expiresAt = addDays(base, Number(days))

      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'active', expires_at: expiresAt.toISOString() })
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
        .select('business_id, plan')
        .eq('id', subscription_id)
        .maybeSingle()

      if (!existing) return NextResponse.json({ error: 'Listing subscription not found' }, { status: 404 })

      const plan = existing.plan || '1m'
      const planDays = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]?.days || 30
      const now = new Date()
      const expiresAt = addDays(now, planDays)

      const { error } = await supabase
        .from('listing_subscriptions')
        .update({
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', subscription_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Activate the business listing
      await supabase
        .from('businesses')
        .update({
          payment_status: 'active',
          verified: true,
          listing_activated_at: now.toISOString(),
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
            `Active for ${PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]?.label || '1 Month'} until ${expiresAt.toISOString().slice(0, 10)}.`,
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

      // Stacking: if expires_at is in the future, add days on top; otherwise start from now
      const base = existing.expires_at && new Date(existing.expires_at) > new Date()
        ? new Date(existing.expires_at)
        : new Date()
      const expiresAt = addDays(base, Number(days))

      const { error } = await supabase
        .from('listing_subscriptions')
        .update({ status: 'active', expires_at: expiresAt.toISOString() })
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

/**
 * Unified Financial Reporting Layer
 *
 * This module provides a single source of truth for all revenue data.
 * It aggregates payments from multiple sources:
 * - subscriptions (premium portal)
 * - listing_subscriptions (listing plans)
 * - rank_spots (ranking bids)
 * - support_subscriptions (IT Concierge)
 * - bids (one-time ranking payments)
 *
 * It handles:
 * - Deduplication of Paynow callbacks
 * - Status-based filtering (only confirmed payments)
 * - Currency normalization (all USD)
 * - Revenue categorization
 */

import { getSupabase } from '@/lib/supabase-server'
import { getHarareStartOfCurrentMonth, getHarareStartOfCurrentWeek, getHarareStartOfCurrentYear } from '@/lib/date-utils'

export type PaymentSource =
  | 'premium_subscription'  // subscriptions table
  | 'listing_payment'       // listing_subscriptions with Paynow confirmation
  | 'rank_spot_payment'     // rank_spots with payment_confirmed_at
  | 'support_subscription'  // support_subscriptions
  | 'bid_payment'           // bids with paynow_approved status

export interface UnifiedPayment {
  id: string
  source: PaymentSource
  businessId: string | null
  amount: number
  currency: string
  reference: string
  status: 'confirmed' | 'pending' | 'failed' | 'cancelled' | 'refunded'
  paymentMethod: 'paynow' | 'manual' | 'subscription' | 'unknown'
  createdAt: string
  confirmedAt: string | null
  paynowReference: string | null
  description: string | null
}

export interface RevenueSummary {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time'
  from: string
  to: string
  totalRevenue: number
  revenueBySource: Record<PaymentSource, number>
  totalTransactions: number
  confirmedTransactions: number
  pendingTransactions: number
  failedTransactions: number
  avgTransactionValue: number
  revenueGrowth?: {
    previousPeriod?: number
    growthPercent?: number
  }
}

/**
 * Get all confirmed payments for revenue reporting.
 * Filters out pending, failed, cancelled, and refunded transactions.
 * Deduplicates Paynow callbacks by using unique reference tracking.
 */
export async function getConfirmedPayments(opts: {
  businessId?: string
  from?: string
  to?: string
  limit?: number
}): Promise<UnifiedPayment[]> {
  const supabase = getSupabase()
  const from = opts.from || getHarareStartOfCurrentMonth()
  const to = opts.to || new Date().toISOString()
  const limit = opts.limit || 1000

  const payments: UnifiedPayment[] = []

  // 1. Premium Subscriptions (from subscriptions table)
  // These are free-tier premium portal access, amount set by admin at activation
  const { data: premiumSubs } = await supabase
    .from('subscriptions')
    .select('id, business_id, amount, status, started_at, expires_at, admin_note, created_at')
    .eq('status', 'active')
    .gte('started_at', from)
    .lte('created_at', to)

  for (const sub of (premiumSubs || [])) {
    payments.push({
      id: sub.id,
      source: 'premium_subscription',
      businessId: sub.business_id,
      amount: Number(sub.amount || 0),
      currency: 'USD',
      reference: `PREMIUM-${sub.id}`,
      status: 'confirmed',
      paymentMethod: sub.amount && Number(sub.amount) > 0 ? 'subscription' : 'manual',
      createdAt: sub.created_at,
      confirmedAt: sub.started_at,
      paynowReference: null,
      description: 'Premium portal subscription'
    })
  }

  // 2. Listing Subscriptions (with Paynow confirmation)
  const { data: listingSubs } = await supabase
    .from('listing_subscriptions')
    .select('id, business_id, amount, status, started_at, expires_at, plan, pro_assistance, paynow_reference, paynow_paid_at, auto_confirmed_at, created_at')
    .in('status', ['active', 'approved']) // Only confirmed
    .gte('created_at', from)
    .lte('created_at', to)

  for (const sub of (listingSubs || [])) {
    const isAutoConfirmed = sub.status === 'active' && sub.auto_confirmed_at
    const isManuallyConfirmed = sub.status === 'active' && !sub.auto_confirmed_at && sub.started_at
    const confirmedAt = sub.paynow_paid_at || sub.auto_confirmed_at || sub.started_at

    // Skip duplicates - only count once per subscription ID
    const paynowVerified = isAutoConfirmed || isManuallyConfirmed

    if (paynowVerified) {
      payments.push({
        id: sub.id,
        source: 'listing_payment',
        businessId: sub.business_id,
        amount: Number(sub.amount || 2), // Default $2 if not set
        currency: 'USD',
        reference: `LISTING-${sub.id}`,
        status: 'confirmed',
        paymentMethod: sub.paynow_reference ? 'paynow' : 'manual',
        createdAt: sub.created_at,
        confirmedAt: confirmedAt,
        paynowReference: sub.paynow_reference,
        description: `Listing plan: ${sub.plan}${sub.pro_assistance ? ' (pro)' : ''}`
      })
    }
  }

  // 3. Rank Spot Payments (confirmed via paynow_approved or payment_confirmed_at)
  // These are one-time payments for #1-3 ranking positions
  const { data: rankSpots } = await supabase
    .from('rank_spots')
    .select('id, business_id, category, city, monthly_fee, position, period_end, status, payment_confirmed_at, created_at')
    .eq('status', 'active')
    .gte('created_at', from)
    .lte('created_at', to)

  for (const spot of (rankSpots || [])) {
    if (spot.payment_confirmed_at) {
      payments.push({
        id: spot.id,
        source: 'rank_spot_payment',
        businessId: spot.business_id,
        amount: Number(spot.monthly_fee || 0),
        currency: 'USD',
        reference: `RANK-${spot.position}-${spot.category}-${spot.city}`,
        status: 'confirmed',
        paymentMethod: 'paynow',
        createdAt: spot.created_at,
        confirmedAt: spot.payment_confirmed_at,
        paynowReference: null,
        description: `Rank spot #${spot.position} in ${spot.category}, ${spot.city}`
      })
    }
  }

  // 4. Support Subscriptions
  const { data: supportSubs } = await supabase
    .from('support_subscriptions')
    .select('id, biz_id, tier, price_usd, status, current_period_start, current_period_end, created_at')
    .eq('status', 'active')
    .gte('created_at', from)
    .lte('created_at', to)

  for (const sub of (supportSubs || [])) {
    payments.push({
      id: sub.id,
      source: 'support_subscription',
      businessId: sub.biz_id,
      amount: Number(sub.price_usd || 0),
      currency: 'USD',
      reference: `SUPPORT-${sub.id}`,
      status: 'confirmed',
      paymentMethod: 'subscription',
      createdAt: sub.created_at,
      confirmedAt: sub.current_period_start,
      paynowReference: null,
      description: `IT Concierge ${sub.tier} tier`
    })
  }

  // 5. Bids (one-time ranking payments)
  const { data: bids } = await supabase
    .from('bids')
    .select('id, business_id, category, city, amount, position, status, paynow_reference, paynow_paid_at, created_at')
    .in('status', ['paid', 'approved', 'outbid']) // Paid or approved bids
    .gte('created_at', from)
    .lte('created_at', to)

  for (const bid of (bids || [])) {
    if (bid.status === 'paid' || bid.status === 'approved') {
      payments.push({
        id: bid.id,
        source: 'bid_payment',
        businessId: bid.business_id,
        amount: Number(bid.amount || 0),
        currency: 'USD',
        reference: `BID-${bid.id}`,
        status: 'confirmed',
        paymentMethod: bid.paynow_reference ? 'paynow' : 'unknown',
        createdAt: bid.created_at,
        confirmedAt: bid.paynow_paid_at || bid.created_at,
        paynowReference: bid.paynow_reference,
        description: `Bid for #${bid.position} in ${bid.category}, ${bid.city}`
      })
    } else if (bid.status === 'outbid') {
      // Outbids are failed attempts - still record for audit but don't count as revenue
      payments.push({
        id: bid.id,
        source: 'bid_payment',
        businessId: bid.business_id,
        amount: Number(bid.amount || 0),
        currency: 'USD',
        reference: `BID-${bid.id}`,
        status: 'failed',
        paymentMethod: bid.paynow_reference ? 'paynow' : 'unknown',
        createdAt: bid.created_at,
        confirmedAt: null,
        paynowReference: bid.paynow_reference,
        description: `Outbid attempt for #${bid.position} in ${bid.category}, ${bid.city}`
      })
    }
  }

  // Deduplicate by paynow_reference (Paynow might send multiple callbacks)
  const seenRefs = new Set<string>()
  const uniquePayments = payments.filter(p => {
    if (p.paynowReference) {
      if (seenRefs.has(p.paynowReference)) return false
      seenRefs.add(p.paynowReference)
    }
    return true
  })

  // Filter by business if specified
  const filtered = opts.businessId
    ? uniquePayments.filter(p => p.businessId === opts.businessId)
    : uniquePayments

  // Sort by date descending and limit
  return filtered
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
}

/**
 * Get revenue summary for a given period.
 */
export async function getRevenueSummary(opts: {
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  businessId?: string
  includeGrowth?: boolean
  from?: string
  to?: string
} = {}): Promise<RevenueSummary> {
  const period = opts.period || 'monthly'
  const now = new Date()
  const to = opts.to || now.toISOString()

  let from: string, previousFrom: string | undefined, previousTo: string | undefined

  switch (period) {
    case 'daily':
      from = new Date(now.setDate(now.getDate() - 1)).toISOString()
      break
    case 'weekly':
      const monday = new Date(now.setDate(now.getDate() - now.getDay()))
      from = monday.toISOString()
      const prevMonday = new Date(monday.setDate(monday.getDate() - 7))
      previousFrom = prevMonday.toISOString()
      previousTo = monday.toISOString()
      break
    case 'monthly':
      from = opts.from || getHarareStartOfCurrentMonth()
      const prevMonth = new Date(now.setMonth(now.getMonth() - 1))
      previousFrom = getHarareStartOfCurrentMonth()
      previousTo = from
      break
    case 'yearly':
      from = opts.from || getHarareStartOfCurrentYear()
      previousTo = from
      break
    default:
      from = opts.from || getHarareStartOfCurrentMonth()
  }

  const payments = await getConfirmedPayments({
    businessId: opts.businessId,
    from,
    to,
    limit: 10000
  })

  const confirmedPayments = payments.filter(p => p.status === 'confirmed')
  const pendingPayments = payments.filter(p => p.status === 'pending')
  const failedPayments = payments.filter(p => p.status === 'failed' || p.status === 'cancelled' || p.status === 'refunded')

  const revenueBySource: Record<PaymentSource, number> = {
    premium_subscription: 0,
    listing_payment: 0,
    rank_spot_payment: 0,
    support_subscription: 0,
    bid_payment: 0
  }

  for (const p of confirmedPayments) {
    revenueBySource[p.source] = (revenueBySource[p.source] || 0) + p.amount
  }

  const totalRevenue = Object.values(revenueBySource).reduce((a, b) => a + b, 0)
  const totalTransactions = payments.length
  const confirmedTransactions = confirmedPayments.length
  const pendingTransactions = pendingPayments.length
  const failedTransactions = failedPayments.length
  const avgTransactionValue = confirmedTransactions > 0 ? totalRevenue / confirmedTransactions : 0

  const result: RevenueSummary = {
    period,
    from,
    to,
    totalRevenue,
    revenueBySource,
    totalTransactions,
    confirmedTransactions,
    pendingTransactions,
    failedTransactions,
    avgTransactionValue
  }

  // Calculate growth if requested
  if (opts.includeGrowth && previousFrom && previousTo) {
    const prevPayments = await getConfirmedPayments({
      businessId: opts.businessId,
      from: previousFrom,
      to: previousTo,
      limit: 10000
    })
    const prevTotal = prevPayments.reduce((sum, p) => sum + p.amount, 0)
    result.revenueGrowth = {
      previousPeriod: prevTotal,
      growthPercent: prevTotal > 0 ? ((totalRevenue - prevTotal) / prevTotal) * 100 : undefined
    }
  }

  return result
}

/**
 * Get financial dashboard data for admin panel.
 * Combines revenue reporting with transaction details.
 */
export async function getFinancialDashboardData(opts: {
  businessId?: string
  from?: string
  to?: string
  limit?: number
} = {}): Promise<{
  summary: RevenueSummary
  recentPayments: UnifiedPayment[]
  revenueTrend: Array<{ date: string; amount: number; source: PaymentSource }>
}> {
  const from = opts.from || getHarareStartOfCurrentMonth()
  const to = opts.to || new Date().toISOString()
  const limit = opts.limit || 50

  const [summary, payments] = await Promise.all([
    getRevenueSummary({ period: 'monthly', businessId: opts.businessId, includeGrowth: true }),
    getConfirmedPayments({ businessId: opts.businessId, from, to, limit })
  ])

  // Build revenue trend (daily for last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const trend = getConfirmedPayments({
    businessId: opts.businessId,
    from: thirtyDaysAgo.toISOString(),
    to: to,
    limit: 10000
  })

  return {
    summary,
    recentPayments: payments,
    revenueTrend: (await trend).map(p => ({
      date: p.createdAt.slice(0, 10),
      amount: p.amount,
      source: p.source
    }))
  }
}
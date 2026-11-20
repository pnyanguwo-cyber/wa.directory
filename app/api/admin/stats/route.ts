import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase-server'
import { isAdmin } from '@/lib/admin-auth'
import { adminGuard } from '@/lib/admin-auth'
import { fetchBusinessesByIds } from '@/lib/business-select'
import {
  getHarareStartOfDay,
  getHarareStartOfDaysAgo,
  getHarareStartOfMonthsAgo,
  getHarareStartOfCurrentMonth,
  getHarareStartOfCurrentWeek,
  getHarareStartOfCurrentYear,
} from '@/lib/date-utils'
import {
  getConfirmedPayments,
  getRevenueSummary,
  type PaymentSource,
} from '@/lib/financial-reporting'
import { getLaunchAt, getCountAt, laterOf, laterDayOf } from '@/lib/launch'

export async function GET(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id')

  const supabase = getSupabase()
  // Use Africa/Harare calendar boundaries for all reporting periods
  const todayStart = getHarareStartOfDay()
  const sevenDaysAgo = getHarareStartOfDaysAgo(7)
  const thirtyDaysAgo = getHarareStartOfDaysAgo(30)
  const ninetyDaysAgo = getHarareStartOfDaysAgo(90)
  const thisMonthStart = getHarareStartOfCurrentMonth()
  const thisWeekStart = getHarareStartOfCurrentWeek()
  const thisYearStart = getHarareStartOfCurrentYear()
  // Admin "start fresh" cutoff: pre-launch rows stay in the DB but out of the
  // numbers shown here.
  const launchAt = await getLaunchAt()
  // Counter cutoff: total/verified businesses, accounts and the category/city
  // charts start from here when the admin resets counts for launch. Unlike the
  // money cutoff this is cleared separately, and it changes nothing in the
  // public directory.
  const countAt = await getCountAt()
  const countFloor = countAt || '1970-01-01T00:00:00.000Z'

  if (businessId) {
    const [businessRes, statsRes] = await Promise.all([
      supabase.from('businesses').select('id, name, slug, category, city').eq('id', businessId).maybeSingle(),
      supabase
        .from('daily_stats')
        .select('date, type, count')
        .eq('business_id', businessId)
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: true }),
    ])

    if (!businessRes.data) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const mainCat = (businessRes.data.category || [])[0] || 'Other'
    const { data: sameCat } = await supabase
      .from('businesses')
      .select('id')
      .eq('verified', true)
      .contains('category', [mainCat])
      .limit(500)

    const ids = (sameCat || []).map(b => b.id)
    const { data: catStats } = ids.length
      ? await supabase
          .from('daily_stats')
          .select('business_id, count')
          .in('business_id', ids)
          .eq('type', 'profile_view')
      : { data: [] }

    const sums = new Map<string, number>()
    for (const s of catStats || []) {
      sums.set(s.business_id, (sums.get(s.business_id) || 0) + Number(s.count))
    }
    const myTotal = sums.get(businessId) || 0
    const sorted = [...sums.values()].sort((a, b) => b - a)

    return NextResponse.json({
      business: {
        id: businessRes.data.id,
        name: businessRes.data.name,
        slug: businessRes.data.slug,
        category: mainCat,
        city: businessRes.data.city || '',
      },
      rows: statsRes.data || [],
      categoryRank: {
        rank: sorted.indexOf(myTotal) >= 0 ? sorted.indexOf(myTotal) + 1 : sorted.length + 1,
        total: ids.length,
        myTotal,
        median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0,
      },
    })
  }

  // Get unified financial data
  const [
    eventsToday,
    views7d,
    views30d,
    accountsCount,
    verifiedCount,
    totalCount,
    growthData,
    categoryData,
    cityData,
    dailyTraffic,
    premiumCount,
  ] = await Promise.all([
    supabase
      .from('stats_events')
      .select('type')
      .gte('created_at', laterOf(todayStart, launchAt)),
    supabase
      .from('daily_stats')
      .select('type, count')
      .gte('date', laterDayOf(sevenDaysAgo.slice(0, 10), launchAt)),
    supabase
      .from('daily_stats')
      .select('business_id, count')
      .eq('type', 'profile_view')
      .gte('date', laterDayOf(thirtyDaysAgo.slice(0, 10), launchAt)),
    supabase.from('business_accounts').select('id', { count: 'exact', head: true }).gte('created_at', countFloor),
    supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('verified', true).gte('created_at', countFloor),
    supabase.from('businesses').select('id', { count: 'exact', head: true }).gte('created_at', countFloor),
    supabase.from('businesses').select('created_at').gte('created_at', laterOf(ninetyDaysAgo, launchAt)).order('created_at', { ascending: true }),
    supabase.from('businesses').select('category').eq('verified', true).gte('created_at', countFloor),
    supabase.from('businesses').select('city').eq('verified', true).gte('created_at', countFloor),
    supabase.from('daily_stats').select('date, type, count').gte('date', laterDayOf(thirtyDaysAgo.slice(0, 10), launchAt)).order('date', { ascending: true }),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  // Use unified financial reporting
  const financialSummary = await getRevenueSummary({
    period: 'monthly',
    businessId: undefined,
    includeGrowth: true,
    from: laterOf(thisMonthStart, launchAt),
  })
  const paymentsData = await getConfirmedPayments({ from: laterOf(thisMonthStart, launchAt), to: new Date().toISOString(), limit: 50 })

  // Group payments by source
  const revenueBySource: Record<string, number> = {
    premium_subscription: 0,
    listing_payment: 0,
    rank_spot_payment: 0,
    support_subscription: 0,
    bid_payment: 0
  }

  for (const p of paymentsData) {
    revenueBySource[p.source] = (revenueBySource[p.source] || 0) + p.amount
  }

  // Get revenue from the last 7 days, 30 days, and year
  const recentPayments = await getConfirmedPayments({ from: laterOf(ninetyDaysAgo, launchAt), limit: 500 })

  // Calculate revenue for this month
  const revenueThisMonth = revenueBySource.premium_subscription + revenueBySource.listing_payment +
                          revenueBySource.rank_spot_payment + revenueBySource.support_subscription +
                          revenueBySource.bid_payment

  // Weekly revenue (last 7 days)
  const sevenDaysAgoDate = getHarareStartOfDaysAgo(7)
  const weeklyPayments = await getConfirmedPayments({ from: laterOf(sevenDaysAgoDate, launchAt), limit: 500 })
  const revenueThisWeek = weeklyPayments.reduce((sum, p) => sum + p.amount, 0)

  // Yearly revenue
  const yearlyPayments = await getConfirmedPayments({ from: laterOf(thisYearStart, launchAt), limit: 1000 })
  const revenueThisYear = yearlyPayments.reduce((sum, p) => sum + p.amount, 0)

  const byType = new Map<string, number>()
  for (const r of eventsToday.data || []) {
    byType.set(r.type, (byType.get(r.type) || 0) + 1)
  }
  const eventsTodayTotal = eventsToday.data?.length || 0
  const sevenTotal = (views7d.data || []).reduce((a, r) => a + Number(r.count), 0)

  const sums = new Map<string, number>()
  for (const s of views30d.data || []) {
    sums.set(s.business_id, (sums.get(s.business_id) || 0) + Number(s.count))
  }
  const topBusinesses = [...sums.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const topIds = topBusinesses.map(([id]) => id)
  const topBiz = await fetchBusinessesByIds(supabase, topIds, 'id, name, slug, category, city')

  const growthMap = new Map<string, number>()
  for (const r of growthData.data || []) {
    const week = r.created_at.slice(0, 10)
    growthMap.set(week, (growthMap.get(week) || 0) + 1)
  }
  const growth = [...growthMap.entries()].map(([date, count]) => ({ date, count }))

  const catCount = new Map<string, number>()
  for (const r of categoryData.data || []) {
    for (const c of (r.category || [])) {
      catCount.set(c, (catCount.get(c) || 0) + 1)
    }
  }
  const categories = [...catCount.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const cityCount = new Map<string, number>()
  for (const r of cityData.data || []) {
    const city = r.city || 'Unknown'
    cityCount.set(city, (cityCount.get(city) || 0) + 1)
  }
  const cities = [...cityCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const trafficMap = new Map<string, Record<string, number>>()
  for (const r of dailyTraffic.data || []) {
    if (!trafficMap.has(r.date)) trafficMap.set(r.date, {})
    const day = trafficMap.get(r.date)!
    day[r.type] = (day[r.type] || 0) + Number(r.count)
  }
  const traffic = [...trafficMap.entries()]
    .map(([date, types]) => ({ date, ...types }))

  const revenueMap = new Map<string, number>()
  for (const p of recentPayments) {
    const month = p.createdAt.slice(0, 7)
    revenueMap.set(month, (revenueMap.get(month) || 0) + p.amount)
  }
  const revenue = [...revenueMap.entries()].map(([month, amount]) => ({ month, amount }))

  const registrations = {
    this_month: (growthData.data || []).filter(r => r.created_at >= thisMonthStart).length,
    this_week: (growthData.data || []).filter(r => r.created_at >= sevenDaysAgoDate).length,
    this_year: (growthData.data || []).filter(r => r.created_at >= thisYearStart).length
  }

  // Average weekly revenue (based on last 12 weeks)
  const twelveWeeksAgo = getHarareStartOfDaysAgo(84)
  const recentSubsSummary = await getRevenueSummary({ from: laterOf(twelveWeeksAgo, launchAt), period: 'monthly' })

  // revenueThisMonth already calculated from revenueBySource
  // revenueThisWeek and revenueThisYear already calculated above

  // Payment performance from actual payments
  const paymentStats = {
    success: paymentsData.filter(p => p.status === 'confirmed').length,
    failed: paymentsData.filter(p => p.status === 'failed' || p.status === 'cancelled').length,
    pending: paymentsData.filter(p => p.status === 'pending').length,
    total_amount: paymentsData.reduce((sum, p) => sum + p.amount, 0)
  }

  // Recent payments with business names
  const recentPaymentsData = await Promise.all(
    (recentPayments || []).map(async (p) => {
      let businessName = 'Unknown'
      if (p.businessId) {
        const { data: biz } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', p.businessId)
          .maybeSingle()
        businessName = biz?.name || 'Unknown'
      }
      return {
        id: p.id,
        status: p.status,
        amount: p.amount,
        reference: p.reference,
        business_name: businessName,
        created_at: p.createdAt,
        source: p.source
      }
    })
  )

  // Group by source for display
  const sources: PaymentSource[] = ['premium_subscription', 'listing_payment', 'rank_spot_payment', 'support_subscription', 'bid_payment']
  const sourceLabels: Record<PaymentSource, string> = {
    premium_subscription: 'Premium Portal',
    listing_payment: 'Listing Subscriptions',
    rank_spot_payment: 'Rank Spot Payments',
    support_subscription: 'Support Subscriptions',
    bid_payment: 'Bid Payments'
  }

  return NextResponse.json({
    macro: {
      eventsToday: eventsTodayTotal,
      byType: Object.fromEntries(byType),
      views7d: sevenTotal,
      accounts: accountsCount.count || 0,
      verifiedBusinesses: verifiedCount.count || 0,
      totalBusinesses: totalCount.count || 0,
      premiumBusinesses: premiumCount.count || 0,
    },
    // Financial analytics - UPFDATED
    financial: {
      revenue: {
        this_month: revenueThisMonth,
        this_week: revenueThisWeek,
        this_year: revenueThisYear,
        by_source: revenueBySource,
        source_labels: sourceLabels,
                    avg_transaction_value: financialSummary.avgTransactionValue,
      },
                  registrations,
      launch_at: launchAt,
      counts_at: countAt,
      premium_members: premiumCount.count || 0,
      payment_performance: paymentStats,
      recent_payments: recentPaymentsData,
    },
    topBusinesses: topBusinesses.map(([id, views]) => ({
      ...(topBiz || []).find(b => b.id === id),
      views,
    })),
    charts: {
      growth,
      categories,
      cities,
      traffic,
      revenue,
    },
  })
}
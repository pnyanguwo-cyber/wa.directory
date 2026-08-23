import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin } from '@/lib/admin-auth'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('business_id')

  const supabase = getSupabase()
  const today = new Date().toISOString().slice(0, 10)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)

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
    revenueData,
    premiumCount,
  ] = await Promise.all([
    supabase
      .from('stats_events')
      .select('type')
      .gte('created_at', `${today}T00:00:00`),
    supabase
      .from('daily_stats')
      .select('type, count')
      .gte('date', sevenDaysAgo),
    supabase
      .from('daily_stats')
      .select('business_id, count')
      .eq('type', 'profile_view')
      .gte('date', thirtyDaysAgo),
    supabase.from('business_accounts').select('id', { count: 'exact', head: true }),
    supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('verified', true),
    supabase.from('businesses').select('id', { count: 'exact', head: true }),
    supabase.from('businesses').select('created_at').gte('created_at', ninetyDaysAgo).order('created_at', { ascending: true }),
    supabase.from('businesses').select('category').eq('verified', true),
    supabase.from('businesses').select('city').eq('verified', true),
    supabase.from('daily_stats').select('date, type, count').gte('date', thirtyDaysAgo).order('date', { ascending: true }),
    supabase.from('subscriptions').select('amount, created_at').eq('status', 'active').gte('created_at', ninetyDaysAgo).order('created_at', { ascending: true }),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])

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
  const { data: topBiz } = topIds.length
    ? await supabase.from('businesses').select('id, name, slug, category, city').in('id', topIds)
    : { data: [] }

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
  for (const r of revenueData.data || []) {
    const month = r.created_at.slice(0, 7)
    revenueMap.set(month, (revenueMap.get(month) || 0) + Number(r.amount))
  }
  const revenue = [...revenueMap.entries()].map(([month, amount]) => ({ month, amount }))

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

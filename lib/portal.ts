import { getBusinessId } from '@/lib/business-auth'
import { getSupabase } from '@/lib/supabase-server'
import { memoize } from '@/lib/memo'
import type { Business } from '@/types'
import type { StatsEventType } from '@/lib/stats-format'

function nextMonthStart(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return d.toISOString().slice(0, 10)
}

export async function getPortalBusiness(): Promise<Business | null> {
  const businessId = getBusinessId()
  if (!businessId) return null
  return memoize(`portal-business:${businessId}`, 1000, async () => {
    const { data } = await getSupabase().from('businesses').select('*').eq('id', businessId).maybeSingle()
    return data || null
  })
}

export async function getSubscription(businessId: string): Promise<{
  status: string
  expiresAt: string | null
  amount: number
  adminNote: string
} | null> {
  return memoize(`portal-sub:${businessId}`, 1000, async () => {
    const { data } = await getSupabase()
      .from('subscriptions')
      .select('status, expires_at, amount, admin_note')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data) return null
    return { status: data.status, expiresAt: data.expires_at, amount: data.amount, adminNote: data.admin_note }
  })
}

export async function isPaidSubscriber(businessId: string): Promise<boolean> {
  const sub = await getSubscription(businessId)
  return sub?.status === 'active' && (!sub.expiresAt || new Date(sub.expiresAt) > new Date())
}

const RANGES = { '7': 7, '30': 30, '90': 90 } as const
export type StatsRange = keyof typeof RANGES | 'all'

export async function getDailyStats(businessId: string, days: number | null) {
  const supabase = getSupabase()
  let q = supabase
    .from('daily_stats')
    .select('date, type, count')
    .eq('business_id', businessId)
  if (days) q = q.gte('date', new Date(Date.now() - days * 86400000).toISOString().slice(0, 10))
  q = q.order('date', { ascending: true })
  const { data } = await q
  return data || []
}

export async function getLifetimeTotals(businessId: string) {
  const { data } = await getSupabase()
    .from('daily_stats')
    .select('type, count')
    .eq('business_id', businessId)
  const totals: Record<string, number> = {}
  for (const row of data || []) {
    totals[row.type] = (totals[row.type] || 0) + Number(row.count)
  }
  return totals
}

export async function getRankingData(businessId: string, category: string, city: string) {
  const supabase = getSupabase()
  const [spotsRes, bidsRes, activeRes] = await Promise.all([
    supabase
      .from('rank_spots')
      .select('id, business_id, category, city, position, monthly_fee, period_start, period_end, status')
      .eq('category', category)
      .eq('city', city)
      .eq('status', 'active')
      .order('position', { ascending: true }),
    supabase
      .from('bids')
      .select('id, position, amount, period, status, admin_feedback, created_at')
      .eq('business_id', businessId)
      .eq('category', category)
      .eq('city', city)
      .eq('period', nextMonthStart())
      .order('created_at', { ascending: false }),
    supabase
      .from('rank_spots')
      .select('id, position, status, period_start, period_end')
      .eq('business_id', businessId)
      .eq('category', category)
      .eq('city', city)
      .eq('status', 'active'),
  ])

  const byPos = new Map<number, { id: string; business_id: string; monthly_fee: number; period_start: string; period_end: string }>()
  for (const s of spotsRes.data || []) {
    byPos.set(s.position, s)
  }

  return {
    spots: spotsRes.data || [],
    bids: bidsRes.data || [],
    myActive: activeRes.data || [],
    currentFees: {
      one: byPos.get(1)?.monthly_fee ?? null,
      two: byPos.get(2)?.monthly_fee ?? null,
      three: byPos.get(3)?.monthly_fee ?? null,
    },
  }
}

export function buildChartData(
  rows: { date: string; type: string; count: number }[],
  types: string[]
): { date: string; label: string; values: Record<string, number>; total: number }[] {
  const byDate = new Map<string, Record<string, number>>()
  for (const r of rows) {
    if (!types.includes(r.type)) continue
    if (!byDate.has(r.date)) byDate.set(r.date, {})
    byDate.get(r.date)![r.type] = (byDate.get(r.date)![r.type] || 0) + Number(r.count)
  }
  return Array.from(byDate.entries()).map(([date, values]) => ({
    date,
    label: date.slice(5),
    values,
    total: Object.keys(values).reduce((sum, k) => sum + (values[k] || 0), 0),
  }))
}

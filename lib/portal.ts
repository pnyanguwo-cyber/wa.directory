import { getBusinessId } from '@/lib/business-auth'
import { getSupabase } from '@/lib/supabase-server'
import type { Business } from '@/types'
import type { StatsEventType } from '@/lib/stats-format'

export async function getPortalBusiness(): Promise<Business | null> {
  const businessId = getBusinessId()
  if (!businessId) return null
  const { data } = await getSupabase().from('businesses').select('*').eq('id', businessId).maybeSingle()
  return data || null
}

export async function getSubscription(businessId: string): Promise<{
  status: string
  expiresAt: string | null
  amount: number
  adminNote: string
} | null> {
  const { data } = await getSupabase()
    .from('subscriptions')
    .select('status, expires_at, amount, admin_note')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { status: data.status, expiresAt: data.expires_at, amount: data.amount, adminNote: data.admin_note }
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

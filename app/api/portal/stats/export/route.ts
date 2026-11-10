import { NextResponse } from 'next/server'
import { getActingPortalBusiness } from '@/lib/portal'
import { isPremiumActive } from '@/lib/premium-entitlement'
import { getSupabase } from '@/lib/supabase-server'
import { STAT_EVENT_LABELS } from '@/lib/stats-format'

export const dynamic = 'force-dynamic'

function csvEscape(value: unknown): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const branchId = url.searchParams.get('branch')
  const rangeParam = url.searchParams.get('range') || 'all' // '7', '30', '90', 'all'

  const session = await getActingPortalBusiness(branchId)
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  if (!(await isPremiumActive(branchId))) {
    return NextResponse.json({ error: 'CSV export requires an active premium subscription' }, { status: 403 })
  }

  try {
    const businessId = session.business.id
    const supabase = getSupabase()

    // Determine date range
    let dateFilter = ''
    if (rangeParam !== 'all') {
      const days = Number(rangeParam)
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
      dateFilter = since
    }

    // Fetch daily stats for the business
    let query = supabase
      .from('daily_stats')
      .select('date, type, count')
      .eq('business_id', businessId)
      .order('date', { ascending: true })

    if (dateFilter) {
      query = query.gte('date', dateFilter)
    }

    const { data: rows, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to daily rows with all event types
    const eventTypes = Object.keys(STAT_EVENT_LABELS) as (keyof typeof STAT_EVENT_LABELS)[]
    const byDate = new Map<string, Record<string, number>>()

    for (const row of rows || []) {
      if (!byDate.has(row.date)) {
        byDate.set(row.date, {})
      }
      byDate.get(row.date)![row.type] = (byDate.get(row.date)![row.type] || 0) + Number(row.count)
    }

    // Fill missing dates with zeros for continuous timeline
    const allDates = Array.from(byDate.keys()).sort()
    let filled: { date: string; values: Record<string, number>; total: number }[] = []

    if (allDates.length > 0) {
      const start = new Date(allDates[0])
      const end = new Date(allDates[allDates.length - 1])

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10)
        const values = byDate.get(dateStr) || {}
        const total = Object.values(values).reduce((sum, v) => sum + v, 0)
        filled.push({ date: dateStr, values, total })
      }
    }

    // Build CSV
    const header = ['Date', ...eventTypes.map(t => STAT_EVENT_LABELS[t]), 'Total']
    const csvRows = filled.map(day => [
      day.date,
      ...eventTypes.map(t => day.values[t] || 0),
      day.total,
    ])

    const csv = [header, ...csvRows].map(r => r.map(csvEscape).join(',')).join('\n')

    // Business name for filename
    const businessName = session.business.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    const filename = `${businessName}-stats-${rangeParam === 'all' ? 'all' : rangeParam}d.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not generate CSV' },
      { status: 500 }
    )
  }
}
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal in-memory Supabase query builder covering the chains used by the
// trial helpers. This lets the lifecycle be exercised without a real DB.
const h = vi.hoisted(() => {
  const tables: Record<string, any[]> = {
    businesses: [],
    listing_subscriptions: [],
    categories: [],
  }
  let seq = 1

  function from(table: string) {
    let filters: Array<(row: any) => boolean> = []
    let orderBy: { key: string; ascending: boolean } | null = null
    let limitN: number | null = null
    let action: 'select' | 'update' | 'insert' = 'select'
    let payload: any = null

    const matching = () => {
      let rows = (tables[table] || []).filter(row => filters.every(fn => fn(row)))
      if (orderBy) {
        const { key, ascending } = orderBy
        rows = [...rows].sort((a, b) => {
          const av = a[key] || ''
          const bv = b[key] || ''
          return (av < bv ? -1 : av > bv ? 1 : 0) * (ascending ? 1 : -1)
        })
      }
      if (limitN !== null) rows = rows.slice(0, limitN)
      return rows
    }

    const builder: any = {
      select: () => builder,
      eq: (key: string, value: any) => {
        filters.push(row => row[key] === value)
        return builder
      },
      in: (key: string, values: any[]) => {
        filters.push(row => values.includes(row[key]))
        return builder
      },
      not: (key: string, _op: string, value: any) => {
        filters.push(row => row[key] !== value)
        return builder
      },
      lte: (key: string, value: any) => {
        filters.push(row => row[key] <= value)
        return builder
      },
      gte: (key: string, value: any) => {
        filters.push(row => row[key] >= value)
        return builder
      },
      lt: (key: string, value: any) => {
        filters.push(row => row[key] < value)
        return builder
      },
      gt: (key: string, value: any) => {
        filters.push(row => row[key] > value)
        return builder
      },
      order: (key: string, opts?: { ascending?: boolean }) => {
        orderBy = { key, ascending: opts?.ascending !== false }
        return builder
      },
      limit: (n: number) => {
        limitN = n
        return builder
      },
      maybeSingle: async () => {
        const rows = matching()
        return { data: rows[0] || null, error: null }
      },
      single: async () => {
        const rows = matching()
        return rows[0]
          ? { data: rows[0], error: null }
          : { data: null, error: { message: 'not found' } }
      },
      update: (values: any) => {
        action = 'update'
        payload = values
        return builder
      },
      insert: (values: any) => {
        action = 'insert'
        payload = values
        return builder
      },
      then: (resolve: (value: any) => any, reject: (reason: any) => any) => {
        try {
          if (action === 'update') {
            for (const row of matching()) Object.assign(row, payload)
            return resolve({ data: [], error: null })
          }
          if (action === 'insert') {
            const rows = (Array.isArray(payload) ? payload : [payload]).map(row => ({
              id: `id-${seq++}`,
              created_at: new Date().toISOString(),
              ...row,
            }))
            ;(tables[table] ||= []).push(...rows)
            return resolve({ data: rows, error: null })
          }
          return resolve({ data: matching(), error: null })
        } catch (err) {
          return reject(err)
        }
      },
    }

    return builder
  }

  return { tables, from, reset: () => { for (const key of Object.keys(tables)) tables[key] = [] } }
})

vi.mock('@/lib/supabase-server', () => ({
  getSupabase: () => ({ from: h.from }),
  getSupabaseAdmin: () => ({ from: h.from }),
}))

import { PLAN_CONFIG, PERSONAL_PLAN_CONFIG } from '@/types'
import { startTrialForBusiness, requestTrial, hasTrialHistory } from '@/lib/trial-helpers'

const DAY = 24 * 60 * 60 * 1000

beforeEach(() => {
  h.reset()
  h.tables.categories.push({ id: 'c1', name: 'Food & Restaurant', special: false })
})

function addBusiness(overrides: Record<string, any> = {}) {
  const row = {
    id: 'biz-1',
    name: 'Acme Bakery',
    phone: '263771234567',
    slug: 'acme-bakery',
    username: 'acmebakery',
    category: ['Food & Restaurant'],
    verified: false,
    payment_status: 'pending',
    ...overrides,
  }
  h.tables.businesses.push(row)
  return row
}

describe('Authoritative pricing', () => {
  it('uses USD 2 / 10 / 20 for business and USD 1 / 5 / 10 for personal contacts', () => {
    expect(PLAN_CONFIG['1m'].price).toBe(2)
    expect(PLAN_CONFIG['6m'].price).toBe(10)
    expect(PLAN_CONFIG['12m'].price).toBe(20)
    expect(PERSONAL_PLAN_CONFIG['1m'].price).toBe(1)
    expect(PERSONAL_PLAN_CONFIG['6m'].price).toBe(5)
    expect(PERSONAL_PLAN_CONFIG['12m'].price).toBe(10)
  })
})

describe('Journey D — the trial starts at approval, once, for 90 days', () => {
  it('refuses to start before the listing is published', async () => {
    addBusiness({ verified: false })

    const result = await startTrialForBusiness('biz-1')

    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/approved and published/i)
    expect(h.tables.listing_subscriptions).toHaveLength(0)
  })

  it('starts on publication, creates a distinct $0 record, and blocks a second trial', async () => {
    addBusiness({ verified: true })
    const before = Date.now()

    const first = await startTrialForBusiness('biz-1')
    expect(first.ok).toBe(true)

    const row = h.tables.listing_subscriptions[0]
    expect(row.is_trial).toBe(true)
    expect(row.amount).toBe(0)
    expect(row.status).toBe('active')
    expect(row.trial_status).toBe('active')
    expect(new Date(row.trial_expires_at).getTime()).toBeGreaterThanOrEqual(before + 90 * DAY - 5000)
    expect(new Date(row.trial_expires_at).getTime()).toBeLessThanOrEqual(before + 90 * DAY + 5000)

    const business = h.tables.businesses[0]
    expect(business.verified).toBe(true)
    expect(business.payment_status).toBe('active')

    const second = await startTrialForBusiness('biz-1')
    expect(second.ok).toBe(false)
    expect(second.error).toMatch(/already used/i)
    expect(h.tables.listing_subscriptions).toHaveLength(1)
  })

  it('records a request without starting the clock and does not overwrite paid history', async () => {
    addBusiness({ verified: true })
    h.tables.listing_subscriptions.push({
      id: 'paid-old',
      business_id: 'biz-1',
      amount: 2,
      status: 'expired',
      is_trial: false,
      plan: '1m',
      created_at: '2026-01-01T00:00:00.000Z',
    })

    const request = await requestTrial('biz-1')
    expect(request.ok).toBe(true)
    expect(h.tables.listing_subscriptions).toHaveLength(2)

    const paid = h.tables.listing_subscriptions.find(r => r.id === 'paid-old')
    const trial = h.tables.listing_subscriptions.find(r => r.id !== 'paid-old')
    expect(paid.amount).toBe(2)
    expect(paid.is_trial).toBe(false)
    expect(trial.is_trial).toBe(true)
    expect(trial.amount).toBe(0)
    expect(trial.trial_status).toBe('requested')
    expect(trial.trial_activated_at).toBeUndefined()

    expect(await hasTrialHistory('biz-1')).toBe(true)
  })
})

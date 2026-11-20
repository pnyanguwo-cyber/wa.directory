import { getSupabase } from '@/lib/supabase-server'

/** Shared with the WhatsApp bot: it reads this marker to tell customers when AI
 *  comes back. Google's daily quota clears at midnight Pacific, not Harare. */
const QUOTA_KEY = 'ai_limit_until'

function nextPacificMidnight(): Date {
  const now = new Date()
  const shifted = new Date(now.getTime() - 8 * 3_600_000)
  shifted.setUTCHours(24, 0, 0, 0)
  return new Date(shifted.getTime() + 8 * 3_600_000)
}

/** Records that Google refused every model with 429 today. Best effort. */
export async function markAiQuotaExhausted(): Promise<void> {
  try {
    await getSupabase()
      .from('bot_settings')
      .upsert(
        { key: QUOTA_KEY, value: nextPacificMidnight().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
  } catch {
    // best effort: the notice is a courtesy, not a control
  }
}

/**
 * Hard daily ceiling on what the shared Gemini key is allowed to spend.
 *
 * Spend is read from ai_usage_log, so the cap covers every caller on this
 * database (site and WhatsApp bot) rather than one instance's memory. Once the
 * day's total reaches the limit, AI calls stop and every feature falls back to
 * its non-AI path (template copy, regex intent, manual entry) until midnight
 * Harare time.
 *
 * AI_DAILY_BUDGET_USD overrides the default; set it to 0 or "off" to disable.
 * A cold full rebuild costs about $0.40, so a lower cap would trip halfway
 * through a deploy and cache fallback copy; $1 leaves room for that plus a
 * normal day of chat and search, and still caps the month near $30 if an
 * anomaly somehow sustains every day.
 */
const RAW_LIMIT = process.env.AI_DAILY_BUDGET_USD ?? '1.00'
const PARSED_LIMIT = Number(RAW_LIMIT)
const LIMIT_DISABLED = RAW_LIMIT === 'off' || !Number.isFinite(PARSED_LIMIT)
export const AI_DAILY_BUDGET_USD = LIMIT_DISABLED || PARSED_LIMIT <= 0 ? 0 : PARSED_LIMIT

// Re-reading the day's spend on every request would double the database load
// the cap is trying to protect. One read a minute means a spike can overshoot
// by at most a minute of calls, which is cents at these volumes.
const CHECK_TTL_MS = 60_000
// The cap being hit is itself a flood: thousands of page views would each want
// to write a log row. One row per ten minutes still shows up in the dashboard.
const BLOCK_LOG_TTL_MS = 10 * 60_000

let snapshot: { spent: number; at: number } | null = null
let lastBlockLogAt = 0

// Harare is UTC+2 all year, and this matches the day the admin dashboard groups
// usage by.
function harareDayStart(): string {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Harare' }).format(new Date())
  return `${day}T00:00:00+02:00`
}

async function sumSpentToday(): Promise<number> {
  const since = harareDayStart()
  let total = 0

  // PostgREST returns at most 1000 rows per request, so page through. 25 pages
  // is 25,000 rows, far beyond any plausible day; the loop stops early on the
  // short last page.
  for (let page = 0; page < 25; page++) {
    const from = page * 1000
    const { data, error } = await getSupabase()
      .from('ai_usage_log')
      .select('estimated_cost_usd')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(from, from + 999)

    if (error) throw error

    const rows = (data as { estimated_cost_usd: number | string | null }[] | null) || []
    for (const row of rows) total += Number(row.estimated_cost_usd) || 0
    if (rows.length < 1000) break
  }

  return total
}

export async function checkAiBudget(): Promise<{ allowed: boolean; spent: number; limit: number }> {
  if (!AI_DAILY_BUDGET_USD) return { allowed: true, spent: 0, limit: 0 }

  if (!snapshot || Date.now() - snapshot.at > CHECK_TTL_MS) {
    try {
      snapshot = { spent: await sumSpentToday(), at: Date.now() }
    } catch {
      // If spend cannot be read, keep serving AI rather than turning the whole
      // site off on a database hiccup. The provider-side quota is the backstop.
      return { allowed: true, spent: snapshot?.spent ?? 0, limit: AI_DAILY_BUDGET_USD }
    }
  }

  return {
    allowed: snapshot.spent < AI_DAILY_BUDGET_USD,
    spent: snapshot.spent,
    limit: AI_DAILY_BUDGET_USD,
  }
}

/** Harare midnight tonight — when a blocked day clears. */
export function nextBudgetReset(): Date {
  const now = new Date()
  const shifted = new Date(now.getTime() + 2 * 3_600_000)
  shifted.setUTCHours(24, 0, 0, 0)
  return new Date(shifted.getTime() - 2 * 3_600_000)
}

/** The provider-quota marker the bot writes when every model returns 429. */
export async function getAiQuotaUntil(): Promise<string> {
  try {
    const { data } = await getSupabase()
      .from('bot_settings')
      .select('value')
      .eq('key', QUOTA_KEY)
      .maybeSingle()
    const value = typeof data?.value === 'string' ? data.value : ''
    if (!value) return ''
    const at = new Date(value)
    return Number.isNaN(at.getTime()) || at.getTime() <= Date.now() ? '' : value
  } catch {
    return ''
  }
}

/** One shape for the admin dashboard: spend against the cap, and what is open. */
export async function getAiBudgetStatus() {
  const budget = await checkAiBudget()
  const quotaUntil = await getAiQuotaUntil()
  return {
    limit: budget.limit,
    spent: budget.spent,
    allowed: budget.allowed,
    resets_at: budget.limit ? nextBudgetReset().toISOString() : '',
    quota_until: quotaUntil,
  }
}

/** True at most once every ten minutes, so a blocked cap logs one row, not one per request. */
export function shouldLogBudgetBlock(): boolean {
  const now = Date.now()
  if (now - lastBlockLogAt < BLOCK_LOG_TTL_MS) return false
  lastBlockLogAt = now
  return true
}

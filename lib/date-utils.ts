/**
 * Centralized date/time formatting utilities using Africa/Harare timezone (CAT, UTC+02:00).
 *
 * All timestamps from the database are stored as UTC (timestamptz).
 * Display timestamps are converted to Africa/Harare using Intl.DateTimeFormat.
 *
 * Usage:
 *   import { formatHarareDate, formatHarareTime, formatHarareDateTime, formatHarareRelative } from '@/lib/date-utils'
 *
 *   formatHarareDate('2024-01-15T10:30:00Z') // "15 Jan 2024"
 *   formatHarareTime('2024-01-15T10:30:00Z') // "12:30"
 *   formatHarareDateTime('2024-01-15T10:30:00Z') // "15 Jan 2024, 12:30"
 *   formatHarareRelative('2024-01-15T10:30:00Z') // "2h ago" or "now"
 */

// CAT timezone (Africa/Harare) - UTC+02:00, no DST
const HARARE_TZ = 'Africa/Harare'

/**
 * Parse an ISO timestamp string or Date object into a Date.
 * Returns null if invalid.
 */
function parseISO(iso: string | Date | null | undefined): Date | null {
  if (!iso) return null
  const date = typeof iso === 'string' ? new Date(iso) : iso
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Format a date as "DD MMM YYYY" (e.g., "15 Jan 2024")
 * Uses Africa/Harare timezone.
 */
export function formatHarareDate(iso: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  const date = parseISO(iso)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date)
}

/**
 * Format a time as "HH:MM" 24-hour (e.g., "12:30")
 * Uses Africa/Harare timezone.
 */
export function formatHarareTime(iso: string | Date | null | undefined): string {
  const date = parseISO(iso)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * Format a date and time as "DD MMM YYYY, HH:MM" (e.g., "15 Jan 2024, 12:30")
 * Uses Africa/Harare timezone.
 */
export function formatHarareDateTime(iso: string | Date | null | undefined): string {
  const date = parseISO(iso)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * Format a full date with seconds as "DD MMM YYYY, HH:MM:SS" (e.g., "15 Jan 2024, 12:30:45")
 * Uses Africa/Harare timezone.
 */
export function formatHarareDateTimeFull(iso: string | Date | null | undefined): string {
  const date = parseISO(iso)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * Format a relative time string (e.g., "now", "5m", "2h", "3d", "15 Jan 2024")
 * Uses Africa/Harare timezone for the "today" comparison.
 */
export function formatHarareRelative(iso: string | Date | null | undefined): string {
  const date = parseISO(iso)
  if (!date) return ''

  const now = new Date()

  // Get today's date in Harare timezone for comparison
  const todayHarare = new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now)

  const dateHarare = new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)

  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'now'
  if (diffMinutes < 60) return `${diffMinutes}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`

  // For older dates, return the formatted date
  return formatHarareDate(date)
}

/**
 * Format a day label for chat transcripts (e.g., "Today", "Yesterday", "15 Jan 2024")
 * Uses Africa/Harare timezone.
 */
export function formatHarareDay(iso: string | Date | null | undefined): string {
  const date = parseISO(iso)
  if (!date) return ''

  const now = new Date()
  const todayHarare = new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now)

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayHarare = new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(yesterday)

  const dateHarare = new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)

  if (dateHarare === todayHarare) return 'Today'
  if (dateHarare === yesterdayHarare) return 'Yesterday'

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/**
 * Check if a date is today in Africa/Harare timezone.
 */
export function isHarareToday(iso: string | Date | null | undefined): boolean {
  const date = parseISO(iso)
  if (!date) return false

  const now = new Date()
  const todayHarare = new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now)

  const dateHarare = new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)

  return dateHarare === todayHarare
}

/**
 * Get the current date/time in Africa/Harare timezone as an ISO string.
 * Useful for "live clock" displays.
 */
export function getHarareNow(): string {
  const now = new Date()
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)
}

/**
 * Format a date as "DD MMM YYYY" for review timestamps (e.g., "15 Jan 2024")
 * Alias for formatHarareDate for semantic clarity in review components.
 */
export function formatHarareReviewDate(iso: string | Date | null | undefined): string {
  return formatHarareDate(iso)
}

/**
 * Format a timestamp for CSV export using Africa/Harare timezone.
 * Returns "DD/MM/YYYY HH:MM" format.
 */
export function formatHarareCsv(iso: string | Date | null | undefined): string {
  const date = parseISO(iso)
  if (!date) return ''
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(',', '')
}

/**
 * Get the current time in Africa/Harare as HH:MM for live clock displays.
 */
export function getHarareTimeNow(): string {
  const now = new Date()
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
}

/**
 * Get the current date in Africa/Harare as "DD MMM YYYY" for live clock displays.
 */
export function getHarareDateNow(): string {
  const now = new Date()
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HARARE_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(now)
}

/**
 * Get the start of today in Africa/Harare timezone as an ISO string (YYYY-MM-DDT00:00:00.000Z).
 * Useful for database queries that need "today" in Harare calendar boundaries.
 */
export function getHarareStartOfDay(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: HARARE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(date)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  if (!year || !month || !day) return new Date().toISOString()
  // Construct ISO string for midnight in Harare, then convert to UTC
  // We create a date at midnight Harare time and get its UTC ISO string
  const harareMidnight = new Date(`${year}-${month}-${day}T00:00:00+02:00`)
  return harareMidnight.toISOString()
}

/**
 * Get the start of N days ago in Africa/Harare timezone as an ISO string.
 * Useful for "last 7 days", "last 30 days" queries with Harare calendar boundaries.
 */
export function getHarareStartOfDaysAgo(daysAgo: number): string {
  const now = new Date()
  const harareDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: HARARE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [year, month, day] = harareDate.split('-').map(Number)
  // Create a date at midnight Harare time for today, then subtract days
  const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  targetDate.setUTCDate(targetDate.getUTCDate() - daysAgo)
  return targetDate.toISOString()
}

/**
 * Get the start of N months ago in Africa/Harare timezone as an ISO string (YYYY-MM-01T00:00:00.000Z).
 * Useful for monthly revenue queries with Harare calendar boundaries.
 */
export function getHarareStartOfMonthsAgo(monthsAgo: number): string {
  const now = new Date()
  const harareDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: HARARE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [year, month] = harareDate.split('-').map(Number)
  const targetMonth = month - monthsAgo
  const targetYear = year + Math.floor((targetMonth - 1) / 12)
  const normalizedMonth = ((targetMonth - 1) % 12) + 1
  // Create first day of target month at midnight Harare time
  const targetDate = new Date(Date.UTC(targetYear, normalizedMonth - 1, 1, 0, 0, 0))
  return targetDate.toISOString()
}

/**
 * Get the start of current month in Africa/Harare timezone as an ISO string.
 */
export function getHarareStartOfCurrentMonth(): string {
  return getHarareStartOfMonthsAgo(0)
}

/**
 * Get the start of current week (Monday) in Africa/Harare timezone as an ISO string.
 */
export function getHarareStartOfCurrentWeek(): string {
  const now = new Date()
  const harareDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: HARARE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [year, month, day] = harareDate.split('-').map(Number)
  const today = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const dayOfWeek = today.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(today)
  monday.setUTCDate(monday.getUTCDate() - daysToMonday)
  return monday.toISOString()
}

/**
 * Get the start of current year in Africa/Harare timezone as an ISO string.
 */
export function getHarareStartOfCurrentYear(): string {
  const now = new Date()
  const harareDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: HARARE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const [year] = harareDate.split('-').map(Number)
  const targetDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0))
  return targetDate.toISOString()
}

/**
 * Get calendar date keys for Harare timezone.
 * Useful for aggregations and reporting periods.
 */
export function getCalendarDateKey(): {
  harare: {
    date: string   // YYYY-MM-DD
    month: string  // YYYY-MM
  }
  utc: {
    date: string   // YYYY-MM-DD
    month: string  // YYYY-MM
  }
} {
  const now = new Date()

  // Harare timezone keys
  const harareFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: HARARE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const [year, month, day] = harareFormatter.format(now).split('-')

  return {
    harare: {
      date: `${year}-${month}-${day}`,
      month: `${year}-${month}`
    },
    utc: {
      date: now.toISOString().slice(0, 10),
      month: now.toISOString().slice(0, 7)
    }
  }
}
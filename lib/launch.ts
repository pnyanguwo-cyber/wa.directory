import { getBotSetting, setBotSetting } from './bot-settings'

// A single timestamp that tells the admin dashboards "count from here".
//
// The launch reset is a cutoff, not a delete: every payment, subscription and
// activity row stays in the database for audit, but anything older than this
// is left out of the numbers the dashboard shows. Clearing the value restores
// the full history.

const KEY = 'dashboard_launch_at'
const COUNT_KEY = 'dashboard_counts_at'

function parseIso(raw: string): string | null {
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function getLaunchAt(): Promise<string | null> {
  const raw = (await getBotSetting(KEY)).trim()
  return raw ? parseIso(raw) : null
}

export async function setLaunchAt(iso: string | null): Promise<boolean> {
  return setBotSetting(KEY, iso || '')
}

// Separate cutoff for the inventory counters (total businesses, verified,
// accounts, category/city charts). It is kept apart from the money cutoff so
// the two can be cleared independently, and it never hides a listing from the
// live directory - only from the numbers the admin dashboard shows.
export async function getCountAt(): Promise<string | null> {
  const raw = (await getBotSetting(COUNT_KEY)).trim()
  return raw ? parseIso(raw) : null
}

export async function setCountAt(iso: string | null): Promise<boolean> {
  return setBotSetting(COUNT_KEY, iso || '')
}

/** Later of a period start and the launch cutoff (both ISO). */
export function laterOf(iso: string, launchAt: string | null): string {
  return launchAt && launchAt > iso ? launchAt : iso
}

/** Later of a YYYY-MM-DD day and the launch cutoff's day. */
export function laterDayOf(day: string, launchAt: string | null): string {
  const floor = launchAt ? launchAt.slice(0, 10) : ''
  return floor && floor > day ? floor : day
}

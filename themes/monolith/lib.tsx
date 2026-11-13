/* Self-contained helpers for the Monolith theme.
 *
 * Mirrors the intent of wa.directory's `lib/utils.ts` (formatPrice, getInitials)
 * and `components/social-icons.tsx` (icon paths) so the theme renders
 * identically whether it lives in `websites/monolith/` (preview app) or inside
 * `wa.directory/themes/monolith/` (registry). No app imports, no 'use client'. */

import type { CSSProperties, ReactNode } from 'react'

import type { ThemeHoursEntry, ThemeItem, ThemeSiteView } from './types'

/* ------------------------------------------------------------------ */
/* Social icons                                                        */
/* ------------------------------------------------------------------ */

export const SOCIAL_ICONS: Record<string, string> = {
  twitter:
    'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  facebook:
    'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  tiktok:
    'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  youtube:
    'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
}

export const SOCIAL_LABELS: Record<string, string> = {
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
}

const NETWORK_DOMAINS: Record<string, string> = {
  twitter: 'x.com',
  instagram: 'instagram.com',
  facebook: 'facebook.com',
  linkedin: 'linkedin.com',
  tiktok: 'tiktok.com',
  youtube: 'youtube.com',
}

/* ------------------------------------------------------------------ */
/* Formatting helpers (mirror lib/utils.ts)                            */
/* ------------------------------------------------------------------ */

export function getInitials(name: string, fallback = 'WA'): string {
  const words = (name ?? '').trim().split(' ')
  return (
    (
      (words[0]?.[0] ?? '') +
      (words.length > 1 ? words[words.length - 1][0] ?? '' : '')
    )
      .toUpperCase()
      .slice(0, 2) || fallback
  )
}

/* Item price rendering. "POA" (price on request) when the business has not
 * published a fixed price; otherwise mirrors lib/utils.ts formatPrice. */
export function money(item: ThemeItem): string {
  if (item.price_type === 'on_request') return 'POA'
  const price = item.price
  if (price === null || price === undefined || Number.isNaN(Number(price))) {
    return 'POA'
  }
  return `$${Number(price).toFixed(2)}`
}

export function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

/* ------------------------------------------------------------------ */
/* URL helpers                                                         */
/* ------------------------------------------------------------------ */

export function safeUrl(input: string): string {
  const raw = (input ?? '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^\//.test(raw)) return raw
  if (/^[\w-]+(\.[\w-]+)+/.test(raw)) return `https://${raw}`
  return ''
}

export function socialHref(key: string, url: string): string {
  const raw = (url ?? '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.includes('/')) return `https://${raw.replace(/^\/+/, '')}`
  const handle = raw.replace(/^@/, '')
  const domain = NETWORK_DOMAINS[key] ?? 'x.com'
  return `https://${domain}/${handle}`
}

/* ------------------------------------------------------------------ */
/* Ordering                                                            */
/* ------------------------------------------------------------------ */

export function whatsappOrderHref(site: ThemeSiteView): string {
  if (site.voiceOnly) {
    const tel = site.voicePhone || site.phoneClean
    return tel ? `tel:${tel}` : ''
  }
  const text = encodeURIComponent(
    `Hi ${site.name}, I found you on wa.directory and I'd like to place an order.`,
  )
  return `https://wa.me/${site.orderDigits}?text=${text}`
}

export function itemOrderHref(site: ThemeSiteView, item: ThemeItem): string {
  if (site.voiceOnly) {
    const tel = site.voicePhone || site.phoneClean
    return tel ? `tel:${tel}` : ''
  }
  const text = encodeURIComponent(`Hi ${site.name}, I'd like to order: ${item.name}`)
  return `https://wa.me/${site.orderDigits}?text=${text}`
}

/* ------------------------------------------------------------------ */
/* Hero wash                                                           */
/* ------------------------------------------------------------------ */

export function washStyle(site: ThemeSiteView): CSSProperties {
  if (site.coverImage) {
    const wash = site.heroWash
    return {
      background: `linear-gradient(
        180deg,
        rgba(10, 12, 16, ${wash.scrimL}) 0%,
        rgba(10, 12, 16, ${wash.scrimM}) 55%,
        rgba(10, 12, 16, ${wash.scrimB}) 100%
      )`,
    }
  }
  return { background: 'transparent' }
}

/* ------------------------------------------------------------------ */
/* Availability chips                                                  */
/* ------------------------------------------------------------------ */

export function itemStatus(
  item: ThemeItem,
): { label: string; tone: 'ok' | 'warn' | 'off' } | null {
  if (item.price_type === 'on_request') {
    return { label: 'Price on request', tone: 'warn' }
  }
  switch (item.availability_status) {
    case 'in_stock':
      return { label: 'In stock', tone: 'ok' }
    case 'available_on_order':
      return { label: 'On order', tone: 'warn' }
    case 'out_of_stock':
      return { label: 'Out of stock', tone: 'off' }
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* Opening hours                                                       */
/* ------------------------------------------------------------------ */

const WEEKDAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/* Returns "Open now · closes 17:00" / "Closed now" for a business' local
 * (Africa/Harare) time, honouring overnight spans (close <= open). */
export function getOpenStatus(hours?: ThemeHoursEntry[] | null): string {
  if (!hours || hours.length === 0) return ''
  const byDay = new Map<string, ThemeHoursEntry>()
  for (const entry of hours) byDay.set(entry.day, entry)

  const now = new Date()
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'Africa/Harare',
  }).format(now)
  const clock = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Harare',
  }).format(now)
  const nowMin = toMinutes(clock)
  if (nowMin === null) return ''

  const today = byDay.get(weekday)
  const yesterday =
    byDay.get(WEEKDAY_KEYS[(WEEKDAY_KEYS.indexOf(weekday) + 6) % 7]) ?? null

  if (today) {
    const open = toMinutes(today.open)
    const close = toMinutes(today.close)
    if (open !== null && close !== null) {
      if (close > open) {
        if (nowMin >= open && nowMin < close) {
          return `Open now · closes ${today.close}`
        }
      } else if (nowMin >= open) {
        return `Open now · closes ${today.close}`
      }
    }
  }
  if (yesterday) {
    const open = toMinutes(yesterday.open)
    const close = toMinutes(yesterday.close)
    if (open !== null && close !== null && close <= open && nowMin < close) {
      return `Open now · closes ${yesterday.close}`
    }
  }
  return 'Closed now'
}

/* ------------------------------------------------------------------ */
/* Presentational atoms                                                */
/* ------------------------------------------------------------------ */

export function Placeholder({
  label,
  category,
  tone = 'accent',
}: {
  label: string
  category?: string
  tone?: 'accent' | 'dark'
}): ReactNode {
  return (
    <div className={`mono-placeholder${tone === 'dark' ? ' mono-placeholder--dark' : ''}`}>
      <span className="mono-placeholder__initials">{getInitials(label, 'WA')}</span>
      {category ? <span className="mono-placeholder__category">{category}</span> : null}
    </div>
  )
}

const STAR_PATH =
  'M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8-5.3-2.9-5.3 2.9 1.1-5.8L1.5 7.7l5.9-.8L10 1.5z'

export function StarRating({
  value,
  className = '',
}: {
  value: number
  className?: string
}): ReactNode {
  const filled = Math.round(value)
  const stars = Array.from({ length: 5 }, (_, index) => index)
  return (
    <span
      className={`mono-stars${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`${value.toFixed(1)} out of 5`}
    >
      {stars.map((index) => (
        <svg
          key={index}
          className={index < filled ? 'mono-star mono-star--fill' : 'mono-star'}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  )
}

'use client'

import { useMemo } from 'react'
import type { SiteHoursEntry } from '@/types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime12(time24: string): string {
  if (!time24) return ''
  const [hStr, mStr] = time24.split(':')
  const h = parseInt(hStr, 10)
  if (isNaN(h)) return time24
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${mStr} ${suffix}`
}

export default function HoursStatus({
  hours,
  accent,
}: {
  hours: SiteHoursEntry[]
  accent: string
}) {
  const currentStatus = useMemo(() => {
    try {
      // Zimbabwe is UTC+2 (CAT)
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Harare',
        weekday: 'long',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      })
      const parts = formatter.formatToParts(now)
      let weekday = ''
      let hourStr = '0'
      let minStr = '0'

      for (const p of parts) {
        if (p.type === 'weekday') weekday = p.value
        if (p.type === 'hour') hourStr = p.value
        if (p.type === 'minute') minStr = p.value
      }

      const currentMinutes = parseInt(hourStr, 10) * 60 + parseInt(minStr, 10)
      const todayEntry = hours.find((h) => h.day.toLowerCase() === weekday.toLowerCase())

      if (todayEntry && todayEntry.open && todayEntry.close) {
        const [oH, oM] = todayEntry.open.split(':').map(Number)
        const [cH, cM] = todayEntry.close.split(':').map(Number)
        const openMinutes = oH * 60 + oM
        const closeMinutes = cH * 60 + cM

        if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
          return {
            isOpen: true,
            todayDay: weekday,
            message: `Open now · Closes at ${formatTime12(todayEntry.close)}`,
          }
        } else if (currentMinutes < openMinutes) {
          return {
            isOpen: false,
            todayDay: weekday,
            message: `Closed now · Opens today at ${formatTime12(todayEntry.open)}`,
          }
        }
      }

      // If closed, find next open day
      const currentDayIdx = DAYS.findIndex((d) => d.toLowerCase() === weekday.toLowerCase())
      for (let offset = 1; offset <= 7; offset++) {
        const nextDayName = DAYS[(currentDayIdx + offset) % 7]
        const nextEntry = hours.find((h) => h.day.toLowerCase() === nextDayName.toLowerCase())
        if (nextEntry && nextEntry.open && nextEntry.close) {
          const dayLabel = offset === 1 ? 'tomorrow' : nextDayName
          return {
            isOpen: false,
            todayDay: weekday,
            message: `Closed now · Opens ${dayLabel} at ${formatTime12(nextEntry.open)}`,
          }
        }
      }

      return {
        isOpen: false,
        todayDay: weekday,
        message: 'Currently closed',
      }
    } catch {
      return null
    }
  }, [hours])

  return (
    <div className="mt-8 max-w-3xl">
      {/* Live status badge */}
      {currentStatus && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold border border-black/[0.08] bg-white shadow-sm">
          <span className="relative flex h-2 w-2">
            {currentStatus.isOpen ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500/80" />
            )}
          </span>
          <span className={currentStatus.isOpen ? 'text-emerald-700 font-bold' : 'text-text-secondary'}>
            {currentStatus.message}
          </span>
        </div>
      )}

      {/* Structured hours table */}
      <dl className="rounded-3xl border border-black/[0.08] bg-white shadow-card divide-y divide-black/[0.05] overflow-hidden">
        {hours.map((h) => {
          const isToday = currentStatus?.todayDay?.toLowerCase() === h.day.toLowerCase()
          return (
            <div
              key={h.day}
              className={`flex items-center justify-between px-5 py-3.5 sm:px-6 transition-colors ${
                isToday ? 'bg-surface/80 font-bold' : 'hover:bg-surface/40'
              }`}
            >
              <dt className="text-sm flex items-center gap-2">
                <span className={isToday ? 'text-text-primary' : 'text-text-secondary'}>{h.day}</span>
                {isToday && (
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${accent} 15%, transparent)`,
                      color: accent,
                    }}
                  >
                    Today
                  </span>
                )}
              </dt>
              <dd
                className={`text-sm tabular-nums ${
                  h.open && h.close
                    ? isToday
                      ? 'text-text-primary font-bold'
                      : 'text-text-secondary font-medium'
                    : 'text-text-secondary/50 italic'
                }`}
              >
                {h.open && h.close ? `${formatTime12(h.open)} – ${formatTime12(h.close)}` : 'Closed'}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

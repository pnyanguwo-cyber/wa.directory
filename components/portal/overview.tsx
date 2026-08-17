'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { STAT_EVENT_LABELS, STAT_EVENT_COLORS, getEventLabel, csvEscape } from '@/lib/stats-format'
import QrCard from '@/components/qr-card'

type Range = '7' | '30' | '90' | 'all'

interface DayRow {
  date: string
  label: string
  values: Record<string, number>
  total: number
}

export default function PortalOverview({ businessId, businessName, businessSlug, paid, rows, lifetime }: {
  businessId: string
  businessName: string
  businessSlug: string
  paid: boolean
  rows: DayRow[]
  lifetime: Record<string, number>
}) {
  const [range, setRange] = useState<Range>('7')

  const visible = useMemo(() => {
    if (range === 'all') return rows
    return rows.slice(-Number(range))
  }, [rows, range])

  const totals = useMemo(() => {
    const t: Record<string, number> = {}
    for (const day of visible) {
      for (const [type, count] of Object.entries(day.values)) {
        t[type] = (t[type] || 0) + count
      }
    }
    return t
  }, [visible])

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0)
  const maxDay = Math.max(1, ...visible.map(d => d.total))
  const maxLifetime = Math.max(1, ...Object.values(lifetime))

  function exportCsv() {
    const header = ['Date', ...Object.keys(STAT_EVENT_LABELS), 'Total']
    const lines = visible.map(d => [
      d.date,
      ...Object.keys(STAT_EVENT_LABELS).map(t => d.values[t] || 0),
      d.total,
    ])
    const csv = [header, ...lines].map(r => r.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${businessName.replace(/\s+/g, '-').toLowerCase()}-stats-${range === 'all' ? 'all' : range}d.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const chartHeight = 160
  const chartWidth = 640

  const bars = visible.map((d, i) => {
    const h = Math.max(2, Math.round((d.total / maxDay) * (chartHeight - 8)))
    return { ...d, i, h }
  })

  return (
    <div className="space-y-6" id={`portal-overview-${businessId}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Overview</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {paid ? 'Full history available' : 'Free plan: last 7 days + lifetime totals'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface rounded-2xl p-1 border border-gray-200/80">
            {(['7', '30', '90', 'all'] as Range[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                disabled={!paid && r !== '7' && r !== 'all'}
                title={!paid && r !== '7' && r !== 'all' ? 'Premium feature' : undefined}
                className={`h-8 px-3.5 rounded-xl text-xs font-semibold transition-all ${
                  range === r
                    ? 'bg-whatsapp-500 text-white shadow-md'
                    : 'text-text-secondary hover:text-text-primary'
                } ${!paid && r !== '7' && r !== 'all' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {r === 'all' ? 'All' : `${r}d`}
              </button>
            ))}
          </div>
          <button onClick={exportCsv} className="btn-secondary h-10 px-3.5 text-xs font-semibold flex items-center gap-1.5">
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['profile_view', 'click_whatsapp', 'qr_scan', 'bot_search'] as const).map(t => (
          <div key={t} className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{STAT_EVENT_LABELS[t]}</p>
            <p className="text-2xl font-extrabold text-text-primary mt-1">{totals[t] || 0}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">Lifetime: {lifetime[t] || 0}</p>
          </div>
        ))}
      </div>

      {grandTotal === 0 && (
        <div className="bg-gradient-to-br from-whatsapp-50 to-white border border-whatsapp-200 rounded-2xl p-5 shadow-card">
          <p className="text-sm font-bold text-whatsapp-800">Get found — share your QR codes</p>
          <p className="text-xs text-text-secondary mt-1">
            Print these and place them on your counter, shelves and packaging. Customers scan to chat with you directly.
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <QrCard
              value={`https://wadirectory.co.zw/qr/${businessSlug}`}
              title="Customer chat QR"
              subtitle="Scans open a chat with you — tracked as QR scans"
              size={130}
              downloadName={`${businessSlug}-customer-chat-qr.png`}
            />
            <QrCard
              value={`https://wadirectory.co.zw/portal`}
              title="Portal QR"
              subtitle="Scans open your private portal — stats & settings"
              size={130}
              downloadName={`${businessSlug}-portal-qr.png`}
            />
            <Link
              href={`/my-qr/${businessSlug}`}
              className="self-center text-xs font-semibold text-whatsapp-600 hover:underline"
            >
              View full page →
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-text-primary">Daily activity{paid ? '' : ' (last 7 days)'}</p>
          <p className="text-xs font-semibold text-whatsapp-700">{grandTotal} total events</p>
        </div>
        {visible.length === 0 ? (
          <p className="text-xs text-text-secondary py-8 text-center">
            No activity yet. Share your QR code and profile link to get started.
          </p>
        ) : (
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto" role="img" aria-label="Daily activity chart">
            {Array.from({ length: 4 }).map((_, i) => (
              <line key={i} x1="0" x2={chartWidth} y1={i * (chartHeight / 4)} y2={i * (chartHeight / 4)} stroke="#f0f0f0" strokeWidth="1" />
            ))}
            {bars.map(b => (
              <g key={b.date}>
                <rect
                  x={(b.i * chartWidth) / bars.length + 2}
                  y={chartHeight - b.h}
                  width={Math.max(2, chartWidth / bars.length - 6)}
                  height={b.h}
                  rx="3"
                  fill="#25d366"
                  className="hover:opacity-80 transition-opacity"
                >
                  <title>{`${b.date}: ${b.total} events`}</title>
                </rect>
              </g>
            ))}
          </svg>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {Object.entries(totals).filter(([, v]) => v > 0).map(([type, count]) => (
            <span key={type} className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STAT_EVENT_COLORS[type] || '#999' }} />
              {getEventLabel(type)}: <b className="text-text-primary">{count}</b>
            </span>
          ))}
          {Object.keys(totals).length === 0 && (
            <span className="text-[11px] text-text-secondary">No breakdown yet</span>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-card">
        <p className="text-sm font-bold text-text-primary mb-3">Lifetime totals</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(lifetime).filter(([, v]) => v > 0).map(([type, count]) => (
            <div key={type} className="rounded-2xl bg-surface border border-gray-200/80 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold text-text-secondary">{getEventLabel(type)}</p>
              <p className="text-xl font-extrabold text-text-primary">{count}</p>
            </div>
          ))}
          {Object.keys(lifetime).length === 0 && (
            <p className="text-xs text-text-secondary">No events recorded yet.</p>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm font-bold text-text-primary mb-2">Lifetime breakdown</p>
          {Object.entries(lifetime).filter(([, v]) => v > 0).map(([type, count]) => (
            <div key={type} className="flex items-center gap-3 mb-1.5">
              <span className="w-32 text-[11px] text-text-secondary truncate">{getEventLabel(type)}</span>
              <div className="flex-1 h-2.5 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(count / maxLifetime) * 100}%`, backgroundColor: STAT_EVENT_COLORS[type] || '#999' }}
                />
              </div>
              <span className="text-[11px] font-semibold text-text-primary w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-card overflow-x-auto">
        <p className="text-sm font-bold text-text-primary mb-3">Daily table</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-text-secondary border-b border-gray-200">
              <th className="py-2 pr-3 font-semibold">Date</th>
              {Object.keys(STAT_EVENT_LABELS).map(t => (
                <th key={t} className="py-2 pr-3 font-semibold whitespace-nowrap">{getEventLabel(t)}</th>
              ))}
              <th className="py-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...visible].reverse().map(d => (
              <tr key={d.date} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-3 font-medium text-text-primary whitespace-nowrap">{d.date}</td>
                {Object.keys(STAT_EVENT_LABELS).map(t => (
                  <td key={t} className="py-2 pr-3 text-text-secondary">{d.values[t] || 0}</td>
                ))}
                <td className="py-2 font-semibold text-whatsapp-700">{d.total}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={Object.keys(STAT_EVENT_LABELS).length + 2} className="py-6 text-center text-text-secondary">No data for this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
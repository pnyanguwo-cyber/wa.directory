'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertCircle, MessageSquare, RefreshCw, Timer, TrendingUp, Users } from 'lucide-react'
import type { AnalyticsData } from '@/lib/analytics'
import { relativeTime } from '@/lib/chat'

const RANGES = [7, 30, 90] as const

export default function AnalyticsPanel({
  endpoint,
  branchId,
  title = 'Analytics',
  subtitle = 'Conversation volume, search behaviour and response performance.',
}: {
  endpoint: string
  branchId?: string
  title?: string
  subtitle?: string
}) {
  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(
    async (range: number, quiet = false) => {
      if (!quiet) setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ days: String(range) })
        if (branchId) params.set('branch', branchId)
        const res = await fetch(`${endpoint}?${params.toString()}`, { cache: 'no-store' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body?.error || 'Could not load analytics')
        setData(body.analytics as AnalyticsData)
      } catch (err) {
        if (!quiet) setError(err instanceof Error ? err.message : 'Could not load analytics')
      } finally {
        if (!quiet) setLoading(false)
      }
    },
    [endpoint, branchId]
  )

  useEffect(() => {
    load(days)
  }, [days, load])

  const totals = data?.totals
  const kpis = [
    { label: 'Conversations', value: totals?.conversations ?? 0, icon: MessageSquare, hint: 'Unique contacts / chats' },
    { label: 'Active chats', value: totals?.activeChats ?? 0, icon: Users, hint: 'Seen in the last 7 days' },
    { label: 'Messages', value: totals?.messages ?? 0, icon: TrendingUp, hint: 'Inbound + outbound' },
    { label: 'Searches', value: totals?.searches ?? 0, icon: TrendingUp, hint: 'Bot searches in range' },
    { label: 'Median first reply', value: totals?.responseMedian ?? '—', icon: Timer, hint: `p90 ${totals?.responseP90 ?? '—'}` },
    { label: 'Completion rate', value: `${totals?.completionRate ?? 0}%`, icon: TrendingUp, hint: 'Chats with 4+ messages' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold tracking-tight text-text-primary">{title}</h2>
          <p className="text-[11px] text-text-secondary">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5" role="tablist" aria-label="Analytics range">
            {RANGES.map(range => (
              <button
                key={range}
                type="button"
                role="tab"
                aria-selected={days === range}
                onClick={() => setDays(range)}
                className={`rounded-md px-2 py-1 text-[10.5px] font-semibold ${
                  days === range ? 'bg-whatsapp-50 text-whatsapp-800' : 'text-text-secondary hover:bg-surface'
                }`}
              >
                {range}d
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => load(days)}
            disabled={loading}
            className="btn-secondary flex h-8 items-center gap-1 px-2.5 text-[10.5px] font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[11.5px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(index => (
            <div key={index} className="skeleton h-[74px] rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {kpis.map(kpi => (
              <div key={kpi.label} className="rounded-xl border border-gray-100 bg-white p-2.5 shadow-card">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <kpi.icon className="h-3.5 w-3.5" />
                  <p className="truncate text-[9.5px] font-bold uppercase tracking-wide">{kpi.label}</p>
                </div>
                <p className="mt-1 text-lg font-extrabold leading-none text-text-primary">{kpi.value}</p>
                <p className="mt-1 truncate text-[9.5px] text-text-secondary">{kpi.hint}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-card">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-bold text-text-primary">Conversation volume</p>
                <p className="text-[10px] text-text-secondary">Messages per day for the last {data.rangeDays} days.</p>
              </div>
              <div className="flex items-center gap-3 text-[9.5px] font-semibold text-text-secondary">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-whatsapp-500" /> Inbound {totals?.inbound ?? 0}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-whatsapp-300" /> Outbound {totals?.outbound ?? 0}
                </span>
              </div>
            </div>
            <div className="h-[190px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.volume} margin={{ top: 4, right: 2, left: -26, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f4" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.max(0, Math.floor(data.volume.length / 8))}
                  />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 11 }}
                    labelStyle={{ fontWeight: 700, color: '#111B21' }}
                  />
                  <Bar dataKey="inbound" name="Inbound" stackId="a" fill="#25D366" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="outbound" name="Outbound" stackId="a" fill="#96deb3" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-2 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-card">
              <p className="text-[12px] font-bold text-text-primary">Intent signals</p>
              <p className="text-[10px] text-text-secondary">Keyword-based opening-message themes.</p>
              <div className="mt-2 space-y-1.5">
                {data.intents.length === 0 && <EmptyLine text="No intent data in this range." />}
                {data.intents.slice(0, 7).map(item => (
                  <BarLine key={item.label} label={item.label} count={item.count} max={Math.max(1, data.intents[0]?.count || 1)} />
                ))}
              </div>
            </div>

            {data.sections.map(section => (
              <div key={section.title} className="rounded-xl border border-gray-100 bg-white p-3 shadow-card">
                <p className="text-[12px] font-bold text-text-primary">{section.title}</p>
                <p className="text-[10px] text-text-secondary">{section.description}</p>
                <div className="mt-2 space-y-1.5">
                  {section.items.length === 0 && <EmptyLine text="Nothing recorded in this range." />}
                  {section.items.slice(0, 7).map(item => (
                    <BarLine
                      key={item.label}
                      label={item.label}
                      count={item.count}
                      max={Math.max(1, section.items[0]?.count || 1)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-card">
              <p className="text-[12px] font-bold text-text-primary">Unanswered questions</p>
              <p className="text-[10px] text-text-secondary">
                Questions with no bot reply within 30 minutes ({totals?.unanswered ?? 0} detected).
              </p>
              <div className="mt-2 max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
                {data.unanswered.length === 0 && <EmptyLine text="No unanswered questions detected. 🎉" />}
                {data.unanswered.map((item, index) => (
                  <div key={`${item.phone}-${index}`} className="rounded-lg bg-surface/70 px-2 py-1.5">
                    <p className="text-[11px] font-medium leading-snug text-text-primary">{item.text}</p>
                    <p className="mt-0.5 text-[9.5px] text-text-secondary">
                      +{item.phone} · {relativeTime(item.at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-card">
              <p className="text-[12px] font-bold text-text-primary">Conversation outcomes</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <Outcome label="Business chats opened" value={totals?.chatOpens ?? 0} />
                <Outcome label="Results opened" value={totals?.resultOpens ?? 0} />
                <Outcome label="Inbound messages" value={totals?.inbound ?? 0} />
                <Outcome label="Outbound messages" value={totals?.outbound ?? 0} />
              </div>
              <p className="mt-2 text-[9.5px] leading-relaxed text-text-secondary">
                Searches without a result opened: approximately{' '}
                <b className="text-text-primary">{Math.max(0, (totals?.searches || 0) - (totals?.resultOpens || 0))}</b>.
              </p>
            </div>
          </div>

          <details className="rounded-xl border border-gray-100 bg-white p-3 shadow-card">
            <summary className="cursor-pointer text-[11px] font-bold text-text-primary">How these numbers are calculated</summary>
            <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-text-secondary">
              {data.definitions.map(definition => (
                <li key={definition}>• {definition}</li>
              ))}
            </ul>
          </details>
        </>
      ) : null}
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return <p className="rounded-lg bg-surface/60 px-2 py-2 text-[10px] text-text-secondary">{text}</p>
}

function BarLine({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10.5px] font-medium capitalize text-text-primary">{label}</span>
        <span className="shrink-0 text-[9.5px] font-bold text-text-secondary">{count}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-whatsapp-400"
          style={{ width: `${Math.max(3, Math.min(100, (count / max) * 100))}%` }}
        />
      </div>
    </div>
  )
}

function Outcome({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-surface/60 px-2 py-1.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-extrabold text-text-primary">{value}</p>
    </div>
  )
}

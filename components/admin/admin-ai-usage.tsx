'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminSectionHeader } from './shared'
import { formatHarareDate, formatHarareDateTime, formatHarareTime } from '@/lib/date-utils'
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface AiUsageSummary {
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
  total_tokens: number
  total_estimated_cost_usd: number
  avg_latency_ms: number
  error_rate: number
  by_feature: Record<string, {
    requests: number
    input_tokens: number
    output_tokens: number
    total_tokens: number
    estimated_cost_usd: number
    avg_latency_ms: number
    error_rate: number
  }>
  by_model: Record<string, {
    requests: number
    input_tokens: number
    output_tokens: number
    total_tokens: number
    estimated_cost_usd: number
  }>
  by_business: Array<{
    business_id: string
    business_name: string
    requests: number
    input_tokens: number
    output_tokens: number
    total_tokens: number
    estimated_cost_usd: number
  }>
  by_day: Record<string, {
    requests: number
    input_tokens: number
    output_tokens: number
    total_tokens: number
    estimated_cost_usd: number
    errors: number
  }>
  by_channel: Record<string, {
    requests: number
    input_tokens: number
    output_tokens: number
    total_tokens: number
    estimated_cost_usd: number
  }>
}

interface AiUsageLog {
  id: number
  feature: string
  model: string
  input_tokens: number
  output_tokens: number
  total_tokens: number
  latency_ms: number
  estimated_cost_usd: number
  status: string
  error_message: string
  business_id: string | null
  org_id: string | null
  channel: string
  metadata: Record<string, unknown>
  created_at: string
}

const FEATURE_LABELS: Record<string, string> = {
  registration_draft: 'Registration Draft',
  listing_draft: 'Listing Draft',
  search_expansion: 'Search Expansion',
  seo_blurb: 'SEO Blurb',
  intent_classification: 'Intent Classification',
  vision_analysis: 'Vision Analysis',
}

const CHANNEL_LABELS: Record<string, string> = {
  web: 'Web',
  whatsapp: 'WhatsApp',
  cron: 'Cron',
  admin: 'Admin',
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`neo-card p-4 ${className}`}>
      <h3 className="text-sm font-bold text-text-primary mb-3">{title}</h3>
      {children}
    </div>
  )
}

function KpiCard({ label, value, color = 'text-text-primary', subLabel }: { label: string; value: React.ReactNode; color?: string; subLabel?: string }) {
  return (
    <div className="neo-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`text-2xl font-extrabold ${color} mt-1`}>{value}</p>
      {subLabel && <p className="text-[10px] text-text-secondary mt-0.5">{subLabel}</p>}
    </div>
  )
}

export default function AdminAiUsage() {
  const router = useRouter()
  const [summary, setSummary] = useState<AiUsageSummary | null>(null)
  const [logs, setLogs] = useState<AiUsageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [selectedFeature, setSelectedFeature] = useState<string>('all')
  const [selectedModel, setSelectedModel] = useState<string>('all')
  const [selectedChannel, setSelectedChannel] = useState<string>('all')
  const [showLogs, setShowLogs] = useState(false)
  const [logPage, setLogPage] = useState(0)
  const [hasMoreLogs, setHasMoreLogs] = useState(true)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (dateRange.from) params.set('from', dateRange.from)
    if (dateRange.to) params.set('to', dateRange.to)
    const { ok, data } = await adminFetch(`/api/admin/ai-usage/summary?${params}`)
    if (!ok) {
      if (data?.error === 'Unauthorized') router.push('/admin-login')
      setLoading(false)
      return
    }
    setSummary(data)
    setLoading(false)
  }, [dateRange, router])

  const loadLogs = useCallback(async (page = 0) => {
    setLoadingLogs(true)
    const params = new URLSearchParams()
    if (dateRange.from) params.set('from', dateRange.from)
    if (dateRange.to) params.set('to', dateRange.to)
    if (selectedFeature !== 'all') params.set('feature', selectedFeature)
    if (selectedModel !== 'all') params.set('model', selectedModel)
    if (selectedChannel !== 'all') params.set('channel', selectedChannel)
    params.set('limit', '100')
    params.set('offset', String(page * 100))

    const { ok, data } = await adminFetch(`/api/admin/ai-usage?${params}`)
    if (!ok) {
      if (data?.error === 'Unauthorized') router.push('/admin-login')
      setLoadingLogs(false)
      return
    }
    const newLogs = data?.data || []
    if (page === 0) {
      setLogs(newLogs)
    } else {
      setLogs(prev => [...prev, ...newLogs])
    }
    setHasMoreLogs(newLogs.length === 100)
    setLogPage(page)
    setLoadingLogs(false)
  }, [dateRange, selectedFeature, selectedModel, selectedChannel, router])

  useEffect(() => {
    loadSummary()
    if (showLogs) loadLogs(0)
  }, [loadSummary, showLogs, loadLogs])

  useEffect(() => {
    if (showLogs) {
      loadLogs(0)
    }
  }, [selectedFeature, selectedModel, selectedChannel, showLogs, loadLogs])

  // Default to last 30 days in Harare timezone
  const getDefaultDateRange = () => {
    const now = new Date()
    const harareDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Harare',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
    const [year, month, day] = harareDate.split('-').map(Number)
    const toDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59))
    const fromDate = new Date(toDate)
    fromDate.setUTCDate(fromDate.getUTCDate() - 29)
    return {
      from: fromDate.toISOString().split('T')[0],
      to: toDate.toISOString().split('T')[0],
    }
  }

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) {
      setDateRange(getDefaultDateRange())
    }
  }, [])

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`
  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
    return String(tokens)
  }

  const featureEntries = summary ? Object.entries(summary.by_feature || {}) : []
  const modelEntries = summary ? Object.entries(summary.by_model || {}) : []
  const channelEntries = summary ? Object.entries(summary.by_channel || {}) : []
  const dayEntries = summary ? Object.entries(summary.by_day || {}).sort(([a], [b]) => a.localeCompare(b)) : []

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="AI Usage Dashboard"
        subtitle="Gemini API usage, costs, and performance across all features and channels"
      />

      {/* Date Range & Filters */}
      <div className="neo-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex gap-2">
            <label className="text-xs font-medium text-text-secondary">From</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="input-field text-sm w-36"
            />
            <label className="text-xs font-medium text-text-secondary">To</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="input-field text-sm w-36"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedFeature}
              onChange={e => setSelectedFeature(e.target.value)}
              className="input-field text-sm w-40"
            >
              <option value="all">All Features</option>
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="input-field text-sm w-48"
            >
              <option value="all">All Models</option>
              {modelEntries.map(([model]) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <select
              value={selectedChannel}
              onChange={e => setSelectedChannel(e.target.value)}
              className="input-field text-sm w-36"
            >
              <option value="all">All Channels</option>
              {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => { setShowLogs(!showLogs); if (!showLogs) loadLogs(0) }}
              className={`btn-secondary h-9 px-4 text-xs font-semibold ${showLogs ? 'bg-whatsapp-500 text-white border-whatsapp-500' : ''}`}
            >
              {showLogs ? 'Hide Logs' : 'Show Logs'}
            </button>
            <button onClick={() => { setDateRange(getDefaultDateRange()); loadSummary(); if (showLogs) loadLogs(0) }} className="btn-secondary h-9 px-4 text-xs font-semibold">
              Last 30 Days
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-48 w-full rounded-2xl" />)}
        </div>
      ) : summary && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Total Requests" value={summary.total_requests.toLocaleString()} />
            <KpiCard label="Total Tokens" value={formatTokens(summary.total_tokens)} subLabel={`In: ${formatTokens(summary.total_input_tokens)} · Out: ${formatTokens(summary.total_output_tokens)}`} />
            <KpiCard label="Est. Cost (USD)" value={formatCost(summary.total_estimated_cost_usd)} color="text-amber-600" />
            <KpiCard label="Avg Latency" value={`${Math.round(summary.avg_latency_ms)}ms`} />
            <KpiCard label="Error Rate" value={`${(summary.error_rate * 100).toFixed(2)}%`} color={summary.error_rate > 0.05 ? 'text-red-600' : 'text-text-primary'} />
            <KpiCard label="Features Used" value={featureEntries.length} />
          </div>

          {/* Charts Row 1: Daily Usage + Daily Costs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Daily Requests & Tokens (Harare days)">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dayEntries.map(([day, stats]) => ({ day: day.slice(5), ...stats }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="requests" name="Requests" stroke="#25D366" fill="#25D366" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="total_tokens" name="Tokens" stroke="#34B7F1" fill="#34B7F1" fillOpacity={0.1} strokeWidth={1.5} />
                  <Area type="monotone" dataKey="errors" name="Errors" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Daily Estimated Cost (USD)">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={dayEntries.map(([day, stats]) => ({ day: day.slice(5), cost: stats.estimated_cost_usd }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v.toFixed(4)}`} />
                  <Tooltip />
                  <Area type="monotone" dataKey="cost" name="Cost" stroke="#FBBF24" fill="#FBBF24" fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Charts Row 2: By Feature Pie + By Model Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Usage by Feature (Tokens)">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={featureEntries.map(([feature, stats]) => ({ name: FEATURE_LABELS[feature] || feature, value: stats.total_tokens }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    label={(props: any) => `${props.name || ''} (${((props.percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false} style={{ fontSize: 10 }}
                  >
                    {featureEntries.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Usage by Model (Tokens)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={modelEntries.map(([model, stats]) => ({ model, tokens: stats.total_tokens }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatTokens(v)} />
                  <YAxis type="category" dataKey="model" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="tokens" fill="#25D366" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Charts Row 3: By Channel + Top Businesses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Usage by Channel">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={channelEntries.map(([channel, stats]) => ({ name: CHANNEL_LABELS[channel] || channel, value: stats.total_tokens }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  >
                    {channelEntries.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top Businesses by Token Usage">
              <ResponsiveContainer width="100%" height={Math.max(200, (summary.by_business?.length || 0) * 40)}>
                <BarChart data={summary.by_business?.slice(0, 10) || []} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => formatTokens(v)} />
                  <YAxis type="category" dataKey="business_name" tick={{ fontSize: 10 }} width={140} />
                  <Tooltip />
                  <Bar dataKey="total_tokens" fill="#25D366" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Feature Detail Table */}
          <ChartCard title="Breakdown by Feature">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white"><tr className="text-left text-text-secondary border-b border-gray-200">
                  <th className="py-2 pr-3 font-semibold">Feature</th>
                  <th className="py-2 pr-3 font-semibold text-right">Requests</th>
                  <th className="py-2 pr-3 font-semibold text-right">Input Tokens</th>
                  <th className="py-2 pr-3 font-semibold text-right">Output Tokens</th>
                  <th className="py-2 pr-3 font-semibold text-right">Total Tokens</th>
                  <th className="py-2 pr-3 font-semibold text-right">Cost (USD)</th>
                  <th className="py-2 pr-3 font-semibold text-right">Avg Latency</th>
                  <th className="py-2 font-semibold text-right">Error Rate</th>
                </tr></thead>
                <tbody>
                  {featureEntries.map(([feature, stats], i) => (
                    <tr key={feature} className={`border-b border-gray-100 last:border-0 ${i % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                      <td className="py-2 pr-3 text-text-primary font-medium">{FEATURE_LABELS[feature] || feature}</td>
                      <td className="py-2 pr-3 text-right text-text-secondary">{stats.requests}</td>
                      <td className="py-2 pr-3 text-right text-text-secondary">{formatTokens(stats.input_tokens)}</td>
                      <td className="py-2 pr-3 text-right text-text-secondary">{formatTokens(stats.output_tokens)}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-text-primary">{formatTokens(stats.total_tokens)}</td>
                      <td className="py-2 pr-3 text-right font-mono text-amber-600">{formatCost(stats.estimated_cost_usd)}</td>
                      <td className="py-2 pr-3 text-right text-text-secondary">{Math.round(stats.avg_latency_ms)}ms</td>
                      <td className="py-2 text-right">
                        <span className={stats.error_rate > 0.05 ? 'text-red-600 font-semibold' : 'text-text-secondary'}>
                          {(stats.error_rate * 100).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {featureEntries.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-text-secondary">No data for selected period.</td></tr>}
                </tbody>
              </table>
            </div>
          </ChartCard>

          {/* Raw Logs */}
          {showLogs && (
            <ChartCard title="Recent API Calls" className="max-h-[500px]">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white"><tr className="text-left text-text-secondary border-b border-gray-200">
                    <th className="py-2 pr-3 font-semibold">Time (CAT)</th>
                    <th className="py-2 pr-3 font-semibold">Feature</th>
                    <th className="py-2 pr-3 font-semibold">Model</th>
                    <th className="py-2 pr-3 font-semibold">Channel</th>
                    <th className="py-2 pr-3 font-semibold text-right">Tokens</th>
                    <th className="py-2 pr-3 font-semibold text-right">Cost</th>
                    <th className="py-2 pr-3 font-semibold text-right">Latency</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 pr-3 font-semibold">Business</th>
                  </tr></thead>
                  <tbody>
                    {loadingLogs ? (
                      <tr><td colSpan={9} className="py-4 text-center text-text-secondary">Loading...</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={9} className="py-4 text-center text-text-secondary">No calls found for selected filters.</td></tr>
                    ) : (
                      logs.map((log, i) => (
                        <tr key={log.id} className={`border-b border-gray-100 last:border-0 ${log.status !== '200' ? 'bg-red-50/50' : i % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                          <td className="py-1.5 pr-3 text-text-secondary font-mono">{formatHarareTime(log.created_at)}</td>
                          <td className="py-1.5 pr-3 text-text-primary">{FEATURE_LABELS[log.feature] || log.feature}</td>
                          <td className="py-1.5 pr-3 text-text-secondary font-mono text-[10px]">{log.model}</td>
                          <td className="py-1.5 pr-3 text-text-secondary capitalize">{CHANNEL_LABELS[log.channel] || log.channel}</td>
                          <td className="py-1.5 pr-3 text-right text-text-secondary">{formatTokens(log.total_tokens)}</td>
                          <td className="py-1.5 pr-3 text-right font-mono text-amber-600">{formatCost(log.estimated_cost_usd)}</td>
                          <td className="py-1.5 pr-3 text-right text-text-secondary">{log.latency_ms}ms</td>
                          <td className="py-1.5 pr-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === '200' ? 'bg-green-100 text-green-700' :
                              log.status === '429' ? 'bg-amber-100 text-amber-700' :
                              log.status.startsWith('blocked_') ? 'bg-purple-100 text-purple-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {log.status === '200' ? 'OK' : log.status === '429' ? 'Rate Limited' : log.status.startsWith('blocked_') ? 'Blocked' : log.status}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-text-secondary truncate max-w-xs">
                            {log.business_id ? log.business_id.slice(0, 8) + '…' : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {hasMoreLogs && !loadingLogs && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => loadLogs(logPage + 1)}
                    className="btn-secondary h-9 px-4 text-xs font-semibold"
                  >
                    Load More
                  </button>
                </div>
              )}
            </ChartCard>
          )}
        </>
      )}
    </div>
  )
}

const PIE_COLORS = ['#25D366', '#128C7E', '#34B7F1', '#075E54', '#FBBF24', '#8338EC', '#F97316', '#EF4444', '#6366F1', '#14B8A6', '#EC4899', '#8B5CF6']
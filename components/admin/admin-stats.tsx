'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminSectionHeader } from './shared'
import { getEventLabel, STAT_EVENT_COLORS } from '@/lib/stats-format'
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface Macro {
  eventsToday: number
  byType: Record<string, number>
  views7d: number
  accounts: number
  verifiedBusinesses: number
  totalBusinesses: number
  premiumBusinesses: number
}

interface TopBusiness {
  id: string
  name: string
  slug: string
  category: string[]
  city: string
  views: number
}

interface Charts {
  growth: { date: string; count: number }[]
  categories: { name: string; value: number }[]
  cities: { name: string; count: number }[]
  traffic: { date: string; [key: string]: string | number }[]
  revenue: { month: string; amount: number }[]
}

interface Detail {
  business: { id: string; name: string; slug: string; category: string; city: string }
  rows: { date: string; type: string; count: number }[]
  categoryRank: { rank: number; total: number; myTotal: number; median: number }
}

const PIE_COLORS = ['#25D366', '#128C7E', '#34B7F1', '#075E54', '#FBBF24', '#8338EC', '#F97316', '#EF4444', '#6366F1', '#14B8A6', '#EC4899', '#8B5CF6']

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`neo-card p-4 ${className}`}>
      <h3 className="text-sm font-bold text-text-primary mb-3">{title}</h3>
      {children}
    </div>
  )
}

export default function AdminStats() {
  const router = useRouter()
  const [macro, setMacro] = useState<Macro | null>(null)
  const [top, setTop] = useState<TopBusiness[]>([])
  const [charts, setCharts] = useState<Charts | null>(null)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Detail | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/stats')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setMacro(data.macro)
    setTop(data.topBusinesses || [])
    setCharts(data.charts)
    setLoading(false)
  }

  async function openDetail(id: string) {
    const { ok, data } = await adminFetch(`/api/admin/stats?business_id=${id}`)
    if (!ok) return
    setDetail(data)
  }

  const eventKeys = macro ? Object.keys(macro.byType).sort() : []

  return (
    <div className="space-y-6">
      <AdminSectionHeader title="Statistics" subtitle="Macro overview, charts, and per-business drill-down" />

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-up border border-white max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary">{detail.business.name}</h3>
                <p className="text-xs text-text-secondary">{detail.business.category} {detail.business.city ? `· ${detail.business.city}` : ''}</p>
              </div>
              <button onClick={() => setDetail(null)} className="w-9 h-9 rounded-2xl bg-surface flex items-center justify-center text-text-secondary hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-surface rounded-xl px-3 py-2.5 border border-gray-200/80">
                <p className="text-[11px] font-semibold text-text-secondary">30d views</p>
                <p className="text-lg font-extrabold text-text-primary">{detail.categoryRank.myTotal}</p>
              </div>
              <div className="bg-surface rounded-xl px-3 py-2.5 border border-gray-200/80">
                <p className="text-[11px] font-semibold text-text-secondary">Category rank</p>
                <p className="text-lg font-extrabold text-text-primary">#{detail.categoryRank.rank}<span className="text-xs text-text-secondary font-semibold">/{detail.categoryRank.total}</span></p>
              </div>
              <div className="bg-surface rounded-xl px-3 py-2.5 border border-gray-200/80">
                <p className="text-[11px] font-semibold text-text-secondary">Median</p>
                <p className="text-lg font-extrabold text-text-primary">{detail.categoryRank.median}</p>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white"><tr className="text-left text-text-secondary border-b border-gray-200"><th className="py-2 pr-3 font-semibold">Date</th><th className="py-2 pr-3 font-semibold">Type</th><th className="py-2 font-semibold text-right">Count</th></tr></thead>
                <tbody>
                  {[...detail.rows].reverse().map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-1.5 pr-3 text-text-primary whitespace-nowrap">{r.date}</td>
                      <td className="py-1.5 pr-3 text-text-secondary">{getEventLabel(r.type)}</td>
                      <td className="py-1.5 font-semibold text-right text-whatsapp-700">{r.count}</td>
                    </tr>
                  ))}
                  {detail.rows.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-text-secondary">No activity in the last 30 days.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-48 w-full rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Events today</p>
              <p className="text-2xl font-extrabold text-text-primary mt-1">{macro?.eventsToday || 0}</p>
            </div>
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Views (7d)</p>
              <p className="text-2xl font-extrabold text-text-primary mt-1">{macro?.views7d || 0}</p>
            </div>
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Total businesses</p>
              <p className="text-2xl font-extrabold text-text-primary mt-1">{macro?.totalBusinesses || 0}</p>
            </div>
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Verified</p>
              <p className="text-2xl font-extrabold text-whatsapp-600 mt-1">{macro?.verifiedBusinesses || 0}</p>
            </div>
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Premium</p>
              <p className="text-2xl font-extrabold text-amber-500 mt-1">{macro?.premiumBusinesses || 0}</p>
            </div>
          </div>

          {/* Charts Row 1: Growth + Traffic */}
          {charts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Business Growth (90d)">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={charts.growth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#25D366" fill="#25D366" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Daily Traffic (30d)">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={charts.traffic}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="profile_view" name="Views" stroke="#25D366" fill="#25D366" fillOpacity={0.1} strokeWidth={1.5} />
                    <Area type="monotone" dataKey="click_whatsapp" name="WhatsApp" stroke="#128C7E" fill="#128C7E" fillOpacity={0.1} strokeWidth={1.5} />
                    <Area type="monotone" dataKey="impression" name="Searches" stroke="#34B7F1" fill="#34B7F1" fillOpacity={0.1} strokeWidth={1.5} />
                    <Area type="monotone" dataKey="qr_scan" name="QR Scans" stroke="#8338EC" fill="#8338EC" fillOpacity={0.1} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          {/* Charts Row 2: Category Pie + City Bar */}
          {charts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Businesses by Category">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={charts.categories.slice(0, 10)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(props: any) => `${props.name || ''} (${((props.percent || 0) * 100).toFixed(0)}%)`} labelLine={false} style={{ fontSize: 10 }}>
                      {charts.categories.slice(0, 10).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Businesses by City">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={charts.cities.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#25D366" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          {/* Charts Row 3: Revenue + Events Donut */}
          {charts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Subscription Revenue (90d)">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={charts.revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} />
                    <Bar dataKey="amount" fill="#FBBF24" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Events Today by Type">
                {eventKeys.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={eventKeys.map(k => ({ name: getEventLabel(k), value: macro?.byType[k] || 0 }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                        {eventKeys.map((k, i) => <Cell key={k} fill={STAT_EVENT_COLORS[k as keyof typeof STAT_EVENT_COLORS] || PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-text-secondary text-center py-8">No events recorded yet today.</p>
                )}
              </ChartCard>
            </div>
          )}

          {/* Top Businesses */}
          <ChartCard title="Top Businesses by Profile Views (30d)">
            <ResponsiveContainer width="100%" height={Math.max(200, top.length * 48)}>
              <BarChart data={top} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                <Tooltip />
                <Bar dataKey="views" fill="#25D366" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(data) => data?.id && openDetail(data.id)} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-text-secondary mt-2">Click a bar for the full 30-day breakdown and category rank.</p>
          </ChartCard>
        </>
      )}
    </div>
  )
}

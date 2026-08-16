'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminSectionHeader } from './shared'
import { getEventLabel } from '@/lib/stats-format'

interface Macro {
  eventsToday: number
  byType: Record<string, number>
  views7d: number
  accounts: number
  verifiedBusinesses: number
}

interface TopBusiness {
  id: string
  name: string
  slug: string
  category: string[]
  city: string
  views: number
}

interface Detail {
  business: { id: string; name: string; slug: string; category: string; city: string }
  rows: { date: string; type: string; count: number }[]
  categoryRank: { rank: number; total: number; myTotal: number; median: number }
}

export default function AdminStats() {
  const router = useRouter()
  const [macro, setMacro] = useState<Macro | null>(null)
  const [top, setTop] = useState<TopBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Detail | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/stats')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setMacro(data.macro)
    setTop(data.topBusinesses || [])
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
      <AdminSectionHeader title="Statistics" subtitle="Macro overview plus per-business drill-down" />

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-up border border-white max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary">{detail.business.name}</h3>
                <p className="text-xs text-text-secondary">
                  {detail.business.category} {detail.business.city ? `· ${detail.business.city}` : ''}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="w-9 h-9 rounded-2xl bg-surface flex items-center justify-center text-text-secondary hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
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
                <p className="text-[11px] font-semibold text-text-secondary">Category median</p>
                <p className="text-lg font-extrabold text-text-primary">{detail.categoryRank.median}</p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-text-secondary border-b border-gray-200">
                    <th className="py-2 pr-3 font-semibold">Date</th>
                    <th className="py-2 pr-3 font-semibold">Type</th>
                    <th className="py-2 font-semibold text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {[...detail.rows].reverse().map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-1.5 pr-3 text-text-primary whitespace-nowrap">{r.date}</td>
                      <td className="py-1.5 pr-3 text-text-secondary">{getEventLabel(r.type)}</td>
                      <td className="py-1.5 font-semibold text-right text-whatsapp-700">{r.count}</td>
                    </tr>
                  ))}
                  {detail.rows.length === 0 && (
                    <tr><td colSpan={3} className="py-6 text-center text-text-secondary">No activity in the last 30 days.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Events today</p>
              <p className="text-2xl font-extrabold text-text-primary mt-1">{macro?.eventsToday || 0}</p>
            </div>
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Profile views (7d)</p>
              <p className="text-2xl font-extrabold text-text-primary mt-1">{macro?.views7d || 0}</p>
            </div>
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Business accounts</p>
              <p className="text-2xl font-extrabold text-text-primary mt-1">{macro?.accounts || 0}</p>
            </div>
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Verified listings</p>
              <p className="text-2xl font-extrabold text-text-primary mt-1">{macro?.verifiedBusinesses || 0}</p>
            </div>
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Event types today</p>
              <p className="text-2xl font-extrabold text-text-primary mt-1">{eventKeys.length}</p>
            </div>
          </div>

          <div className="neo-card p-4">
            <h3 className="text-sm font-bold text-text-primary mb-3">Events today by type</h3>
            <div className="flex flex-wrap gap-2">
              {eventKeys.map(k => (
                <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-whatsapp-50 text-whatsapp-800 border border-whatsapp-200 px-3 py-1.5 text-xs font-semibold">
                  {getEventLabel(k)}
                  <b>{macro?.byType[k]}</b>
                </span>
              ))}
              {eventKeys.length === 0 && <p className="text-xs text-text-secondary">No events recorded yet today.</p>}
            </div>
          </div>

          <div className="neo-card p-4">
            <h3 className="text-sm font-bold text-text-primary mb-3">Top businesses by profile views (30d)</h3>
            <div className="space-y-2">
              {top.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => openDetail(b.id)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-surface/50 px-3.5 py-2.5 hover:bg-surface transition-colors text-left"
                >
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-500' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-whatsapp-50 text-whatsapp-700'}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-text-primary truncate">{b.name}</p>
                    <p className="text-[11px] text-text-secondary truncate">
                      {(b.category || []).join(', ')}{b.city ? ` · ${b.city}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-whatsapp-700 shrink-0">{b.views}</span>
                </button>
              ))}
              {top.length === 0 && <p className="text-xs text-text-secondary">No profile views in the last 30 days.</p>}
            </div>
            <p className="text-[11px] text-text-secondary mt-2">Click a business for the full 30-day breakdown and category rank.</p>
          </div>
        </>
      )}
    </div>
  )
}
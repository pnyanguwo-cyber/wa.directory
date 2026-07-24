'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getClient } from '@/lib/supabase-client'
import type { Business } from '@/types'

const PAGE_SIZE = 15

function SkeletonRow() {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="skeleton h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-48 rounded" />
        <div className="skeleton h-3 w-32 rounded" />
      </div>
      <div className="skeleton h-8 w-20 rounded-full" />
      <div className="skeleton h-8 w-8 rounded-lg" />
    </div>
  )
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-text-primary font-medium">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="h-9 px-4 border border-gray-200 rounded-xl text-sm font-medium text-text-primary hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} className="h-9 px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-xl transition-all active:scale-[0.97]">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending'>('all')
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth') === 'true'
    const pwd = sessionStorage.getItem('admin_password') || ''
    setIsAuthenticated(auth)
    setAdminPassword(pwd)
    setLoading(false)
    if (!auth) router.push('/admin-login')
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return
    getClient()
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load businesses', error)
        if (data) setBusinesses(data as Business[])
      })
  }, [isAuthenticated])

  const stats = useMemo(() => {
    const total = businesses.length
    const verified = businesses.filter(b => b.verified).length
    const pending = total - verified
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const newThisWeek = businesses.filter(b => new Date(b.created_at) >= weekAgo).length
    return { total, verified, pending, newThisWeek }
  }, [businesses])

  const filtered = useMemo(() => {
    let list = businesses
    if (filterStatus === 'verified') list = list.filter(b => b.verified)
    if (filterStatus === 'pending') list = list.filter(b => !b.verified)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.category?.some(c => c.toLowerCase().includes(q)) ||
        (b.city || '').toLowerCase().includes(q) ||
        (b.location || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [businesses, search, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search, filterStatus])

  const handleToggleVerify = async (id: string, current: boolean) => {
    if (!adminPassword) {
      router.push('/admin-login')
      return
    }
    setTogglingId(id)
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
      body: JSON.stringify({ id, verified: !current }),
    })
    setTogglingId(null)
    if (res.ok) {
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, verified: !current } : b))
    }
  }

  const handleDelete = async (id: string) => {
    if (!adminPassword) {
      router.push('/admin-login')
      return
    }
    setConfirmDelete(null)
    setDeletingId(id)
    const res = await fetch('/api/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
      body: JSON.stringify({ id }),
    })
    setDeletingId(null)
    if (res.ok) {
      setBusinesses(prev => prev.filter(b => b.id !== id))
    }
  }

  if (loading) return null
  if (!isAuthenticated) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete "${businesses.find(b => b.id === confirmDelete)?.name || 'this business'}"? This cannot be undone.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
        <button
          onClick={() => {
            localStorage.removeItem('admin_auth')
            sessionStorage.removeItem('admin_password')
            router.push('/admin-login')
          }}
          className="h-10 px-5 border border-gray-300 rounded-xl flex items-center gap-1.5 text-sm font-medium text-text-primary hover:bg-gray-50 active:bg-gray-100 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'text-text-primary', bg: 'bg-gray-50', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
          { label: 'Verified', value: stats.verified, color: 'text-whatsapp-700', bg: 'bg-whatsapp-50', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label: 'New / Week', value: stats.newThisWeek, color: 'text-blue-700', bg: 'bg-blue-50', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
            <div className="flex items-center gap-3">
              <svg className={`w-5 h-5 ${stat.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
              <div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-text-secondary">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, category, or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:border-whatsapp-500 focus:ring-4 focus:ring-whatsapp-500/10 outline-none transition-all"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'verified', 'pending'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`h-10 px-4 rounded-xl text-sm font-medium transition-all ${
                filterStatus === status
                  ? 'bg-whatsapp-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-text-secondary hover:bg-gray-50'
              }`}
            >
              {status === 'all' ? 'All' : status === 'verified' ? 'Verified' : 'Pending'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-surface w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">No businesses found</h2>
          <p className="text-text-secondary text-sm">
            {search || filterStatus !== 'all' ? 'Try adjusting your search or filters' : 'Businesses will appear here once they are submitted'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-text-secondary">
              Showing {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
          </div>
          <div className="space-y-2">
            {paginated.map(b => (
              <div key={b.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 flex items-center gap-3">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-gray-400">{b.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-text-primary text-sm truncate">{b.name}</h3>
                      {b.verified && (
                        <span className="badge-verified text-[11px] px-2 py-0.5 shrink-0">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <span>{b.category?.slice(0, 2).join(', ')}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span>{b.city || b.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {b.verified ? (
                    <button
                      onClick={() => handleToggleVerify(b.id, true)}
                      disabled={togglingId === b.id}
                      className="h-8 px-3 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all disabled:opacity-50"
                      title="Unverify"
                    >
                      {togglingId === b.id ? '...' : 'Unverify'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleVerify(b.id, false)}
                      disabled={togglingId === b.id}
                      className="h-8 px-3 text-xs font-medium text-whatsapp-700 bg-whatsapp-50 hover:bg-whatsapp-100 rounded-lg transition-all disabled:opacity-50"
                      title="Approve"
                    >
                      {togglingId === b.id ? '...' : 'Approve'}
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(b.id)}
                    disabled={deletingId === b.id}
                    className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === b.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-text-secondary hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-9 w-9 rounded-xl text-sm font-medium transition-all ${
                    p === page
                      ? 'bg-whatsapp-500 text-white'
                      : 'border border-gray-200 text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-text-secondary hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

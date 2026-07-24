'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getClient } from '@/lib/supabase-client'
import type { Business } from '@/types'
import { categories } from '@/data/categories'
import { zimbabweCities } from '@/data/zimbabwe-locations'

const PAGE_SIZE = 15

function SkeletonRow() {
  return (
    <div className="neo-card p-4 flex items-center gap-4">
      <div className="skeleton h-10 w-10 rounded-2xl shrink-0" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-up border border-white">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm text-text-primary font-medium leading-snug">{message}</p>
        </div>
        <div className="flex gap-2.5 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary h-9 px-4 text-xs font-semibold">
            Cancel
          </button>
          <button onClick={onConfirm} className="h-9 px-4 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xs font-semibold rounded-2xl transition-all shadow-md">
            Confirm Delete
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '', category: [] as string[], phone: '', city: '', area: '',
    bio: '', price_range: '', whatsapp_link: '', catalog_link: '', logo_url: '',
  })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

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

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminPassword) { router.push('/admin-login'); return }
    setAddError('')
    setAdding(true)
    const res = await fetch('/api/admin/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
      body: JSON.stringify({ ...addForm, verified: true }),
    })
    const data = await res.json()
    setAdding(false)
    if (res.ok) {
      setShowAddModal(false)
      setAddForm({ name: '', category: [], phone: '', city: '', area: '', bio: '', price_range: '', whatsapp_link: '', catalog_link: '', logo_url: '' })
      getClient().from('businesses').select('*').order('created_at', { ascending: false }).then(({ data }) => {
        if (data) setBusinesses(data as Business[])
      })
    } else {
      setAddError(data.error || 'Failed to add business')
    }
  }

  if (loading) return null
  if (!isAuthenticated) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete "${businesses.find(b => b.id === confirmDelete)?.name || 'this business'}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-slide-up my-auto border border-white">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-text-primary">Add New Business</h2>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface text-text-secondary transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddBusiness} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Business Name *</label>
                  <input type="text" required value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className="input-field text-sm" placeholder="e.g. Harare Solar Solutions" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">WhatsApp Phone *</label>
                  <input type="text" required value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} className="input-field text-sm" placeholder="+263 77 123 4567" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Categories *</label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-gray-200/80 rounded-2xl bg-surface/50">
                    {categories.filter(c => c.name !== 'Other').map(cat => {
                      const selected = addForm.category.includes(cat.name)
                      return (
                        <button key={cat.name} type="button" onClick={() => setAddForm(f => ({
                          ...f,
                          category: selected ? f.category.filter(c => c !== cat.name) : [...f.category, cat.name],
                        }))}
                          className={`chip text-xs ${selected ? 'chip-active' : ''}`}
                        >
                          {cat.icon} {cat.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">City</label>
                  <select value={addForm.city} onChange={e => setAddForm(f => ({ ...f, city: e.target.value, area: '' }))} className="input-field text-sm">
                    <option value="">Select city</option>
                    {zimbabweCities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Area</label>
                  <select value={addForm.area} onChange={e => setAddForm(f => ({ ...f, area: e.target.value }))} className="input-field text-sm" disabled={!addForm.city}>
                    <option value="">Select area</option>
                    {zimbabweCities.find(c => c.name === addForm.city)?.areas.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Short Bio</label>
                  <textarea rows={2} value={addForm.bio} onChange={e => setAddForm(f => ({ ...f, bio: e.target.value }))} className="input-field text-sm resize-none" placeholder="Brief business summary..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Price Range</label>
                  <input type="text" value={addForm.price_range} onChange={e => setAddForm(f => ({ ...f, price_range: e.target.value }))} className="input-field text-sm" placeholder="e.g. $10-$50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Logo URL</label>
                  <input type="text" value={addForm.logo_url} onChange={e => setAddForm(f => ({ ...f, logo_url: e.target.value }))} className="input-field text-sm" placeholder="https://..." />
                </div>
              </div>
              {addError && <p className="text-red-500 text-xs font-medium">{addError}</p>}
              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={adding || addForm.category.length === 0} className="btn-primary h-10 px-5 text-xs font-semibold">
                  {adding ? 'Adding Business...' : 'Add Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-whatsapp-700">Directory Administration</span>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary h-10 px-4 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Add Business</span>
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('admin_auth')
              sessionStorage.removeItem('admin_password')
              router.push('/admin-login')
            }}
            className="btn-secondary h-10 px-4 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Listings', value: stats.total, color: 'text-text-primary', bg: 'bg-white/90', icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25zM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6z' },
          { label: 'Verified', value: stats.verified, color: 'text-whatsapp-700', bg: 'bg-whatsapp-50/70', icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
          { label: 'Pending Approval', value: stats.pending, color: 'text-amber-700', bg: 'bg-amber-50/70', icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
          { label: 'New This Week', value: stats.newThisWeek, color: 'text-blue-700', bg: 'bg-blue-50/70', icon: 'M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 0 5.814-5.518l2.74-1.22m0 0-3.75-.625m3.75.625v3.75' },
        ].map(stat => (
          <div key={stat.label} className={`neo-card p-4 ${stat.bg}`}>
            <div className="flex items-center gap-3">
              <svg className={`w-5 h-5 ${stat.color}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
              </svg>
              <div>
                <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs font-medium text-text-secondary">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search listings by name, category, or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 text-sm py-2.5"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'verified', 'pending'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`h-11 px-4 rounded-2xl text-xs font-semibold transition-all ${
                filterStatus === status
                  ? 'bg-whatsapp-500 text-white shadow-md'
                  : 'bg-white border border-gray-200/80 text-text-secondary hover:bg-surface'
              }`}
            >
              {status === 'all' ? 'All Businesses' : status === 'verified' ? 'Verified Only' : 'Pending Approval'}
            </button>
          ))}
        </div>
      </div>

      {/* Business List Rows */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="neo-card p-12 text-center">
          <div className="bg-whatsapp-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 text-whatsapp-600">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-text-primary mb-1">No matching listings</h2>
          <p className="text-text-secondary text-xs max-w-sm mx-auto">
            {search || filterStatus !== 'all' ? 'Try refining your search query or status filter.' : 'Business listings will appear here when submitted.'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium text-text-secondary">
              Showing {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} listings
            </p>
          </div>

          <div className="space-y-2.5">
            {paginated.map(b => (
              <div key={b.id} className="neo-card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1 flex items-center gap-3.5">
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-gray-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-whatsapp-100 to-whatsapp-200 flex items-center justify-center shrink-0 border border-whatsapp-300/40">
                      <span className="text-xs font-bold text-whatsapp-800">{b.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-text-primary text-sm truncate">{b.name}</h3>
                      {b.verified && (
                        <span className="badge-verified text-[10px] px-2 py-0.5 shrink-0">
                          <svg className="w-3 h-3 text-whatsapp-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <span>{b.category?.slice(0, 2).join(', ')}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" aria-hidden="true" />
                      <span>{b.city || b.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {b.verified ? (
                    <button
                      onClick={() => handleToggleVerify(b.id, true)}
                      disabled={togglingId === b.id}
                      className="h-8 px-3 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all disabled:opacity-50"
                      title="Unverify business"
                    >
                      {togglingId === b.id ? '...' : 'Unverify'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleVerify(b.id, false)}
                      disabled={togglingId === b.id}
                      className="h-8 px-3 text-xs font-medium text-whatsapp-800 bg-whatsapp-100 hover:bg-whatsapp-200 rounded-xl transition-all disabled:opacity-50"
                      title="Approve business"
                    >
                      {togglingId === b.id ? '...' : 'Approve'}
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete(b.id)}
                    disabled={deletingId === b.id}
                    className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                    title="Delete listing"
                  >
                    {deletingId === b.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-text-secondary hover:bg-surface disabled:opacity-30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-9 w-9 rounded-xl text-xs font-semibold transition-all ${
                    p === page
                      ? 'bg-whatsapp-500 text-white shadow-sm'
                      : 'border border-gray-200 text-text-secondary hover:bg-surface'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-9 w-9 flex items-center justify-center rounded-xl border border-gray-200 text-text-secondary hover:bg-surface disabled:opacity-30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

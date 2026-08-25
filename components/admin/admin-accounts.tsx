'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminSectionHeader } from './shared'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Account {
  id: string
  business_id: string
  disabled: boolean
  created_at: string
  business: { id: string; name: string; slug: string; phone: string } | null
}

type ConfirmMode = null | 'logins' | 'listings'

export default function AdminAccounts() {
  const router = useRouter()
  const [rows, setRows] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [resetting, setResetting] = useState<Account | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/accounts')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      setLoading(false)
      return
    }
    setRows(data.accounts || [])
    setSelectedIds(new Set())
    setLoading(false)
  }

  async function act(action: string, payload: Record<string, unknown>, successMsg?: string) {
    setBusy(true)
    setMessage('')
    const { ok, status, data } = await adminFetch('/api/admin/accounts', {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
    })
    setBusy(false)
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      setMessage(data?.error || 'Action failed')
      return false
    }
    setResetting(null)
    setNewPassword('')
    if (successMsg) setMessage(successMsg)
    load()
    return true
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // --- Metrics ---
  const stats = useMemo(() => {
    const total = rows.length
    const active = rows.filter(a => !a.disabled).length
    const disabled = total - active
    const weekAgo = Date.now() - 7 * 86400000
    const newThisWeek = rows.filter(a => new Date(a.created_at).getTime() >= weekAgo).length
    return { total, active, disabled, newThisWeek }
  }, [rows])

  const signupChart = useMemo(() => {
    const buckets = new Map<string, number>()
    for (let i = 7; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i * 7)
      d.setHours(0, 0, 0, 0)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      buckets.set(key, 0)
    }
    for (const r of rows) {
      const created = new Date(r.created_at)
      created.setHours(0, 0, 0, 0)
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`
      // Assign to the most recent weekly bucket start <= created date
      let assigned: string | null = null
      for (const bucketKey of [...buckets.keys()].reverse()) {
        if (new Date(key) >= new Date(bucketKey)) { assigned = bucketKey; break }
      }
      if (!assigned) {
        const first = [...buckets.keys()][0]
        if (new Date(key) < new Date(first)) continue
        assigned = first
      }
      buckets.set(assigned!, (buckets.get(assigned!) || 0) + 1)
    }
    return [...buckets.entries()].map(([week, count]) => ({
      week: new Date(week + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      signups: count,
    }))
  }, [rows])

  // --- Search ---
  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(a =>
      (a.business?.name || '').toLowerCase().includes(q) ||
      (a.business?.phone || '').toLowerCase().includes(q)
    )
  }, [rows, search])

  const allFilteredSelected = filtered.length > 0 && filtered.every(a => selectedIds.has(a.id))

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filtered.forEach(a => next.delete(a.id))
        return next
      })
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)))
    }
  }

  async function handleBulkDelete(mode: Exclude<ConfirmMode, null>) {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBulkDeleting(true)
    const okResult = await act(
      'delete',
      { account_ids: ids, delete_listings: mode === 'listings' },
      mode === 'listings'
        ? `Deleted ${ids.length} account${ids.length === 1 ? '' : 's'} and their business listings.`
        : `Removed ${ids.length} portal login${ids.length === 1 ? '' : 's'} — public listings untouched.`
    )
    setBulkDeleting(false)
    if (okResult) setConfirmMode(null)
  }

  return (
    <div className="space-y-6">
      {resetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white">
            <h2 className="text-lg font-bold text-text-primary">Reset password</h2>
            <p className="text-xs text-text-secondary">
              {resetting.business?.name || 'This business'} · {resetting.business?.phone || ''}
            </p>
            <form onSubmit={e => { e.preventDefault(); act('reset', { account_id: resetting.id, new_password: newPassword }, 'Saved. The new password was sent to the owner via WhatsApp.') }} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-text-secondary block">New password (min 6 characters)</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword('wd-' + Math.random().toString(36).slice(2, 10))}
                    className="text-[11px] font-semibold text-whatsapp-600 hover:underline"
                  >
                    Generate random
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input-field text-sm font-mono"
                  placeholder="temp-pass-2026"
                  autoFocus
                />
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setResetting(null)} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={busy} className="btn-primary h-10 px-5 text-xs font-semibold">{busy ? 'Saving...' : 'Reset & notify'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white">
            <h2 className="text-lg font-bold text-text-primary">
              {confirmMode === 'listings' ? 'Delete accounts AND listings?' : 'Remove portal logins?'}
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              {confirmMode === 'listings'
                ? `${selectedIds.size} account${selectedIds.size === 1 ? '' : 's'} and their public business listing${selectedIds.size === 1 ? '' : 's'} will be permanently deleted. This cannot be undone.`
                : `${selectedIds.size} owner${selectedIds.size === 1 ? '' : 's'} will lose portal access. The public business listing${selectedIds.size === 1 ? '' : 's'} stay${selectedIds.size === 1 ? 's' : ''} untouched.`}
            </p>
            <div className="flex gap-2.5 justify-end pt-2">
              <button onClick={() => setConfirmMode(null)} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
              <button
                onClick={() => handleBulkDelete(confirmMode)}
                disabled={bulkDeleting}
                className={`h-10 px-5 rounded-full text-xs font-semibold text-white transition-all disabled:opacity-50 ${confirmMode === 'listings' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-900 hover:bg-black'}`}
              >
                {bulkDeleting ? 'Deleting...' : confirmMode === 'listings' ? 'Delete everything' : 'Remove logins'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminSectionHeader title="Accounts" subtitle={`${stats.total} business accounts`} />

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{message}</p>
      )}

      {/* Metrics */}
      {!loading && stats.total > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Total accounts</p>
              <p className="text-2xl font-extrabold text-text-primary mt-1">{stats.total}</p>
            </div>
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Active</p>
              <p className="text-2xl font-extrabold text-whatsapp-600 mt-1">{stats.active}</p>
            </div>
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Disabled</p>
              <p className="text-2xl font-extrabold text-red-500 mt-1">{stats.disabled}</p>
            </div>
            <div className="neo-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">New this week</p>
              <p className="text-2xl font-extrabold text-blue-500 mt-1">{stats.newThisWeek}</p>
            </div>
          </div>

          <div className="neo-card p-4">
            <h3 className="text-sm font-bold text-text-primary mb-3">Account signups (last 8 weeks)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={signupChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="signups" fill="#25D366" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Search */}
      {!loading && rows.length > 0 && (
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search accounts by business name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 text-sm py-2.5"
          />
        </div>
      )}

      {/* Bulk select-all */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-medium text-text-secondary">
            Showing {filtered.length} of {rows.length} accounts
          </p>
          <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              className="w-4 h-4 accent-whatsapp-600 cursor-pointer"
              aria-label="Select all filtered accounts"
            />
            Select all ({filtered.length})
          </label>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="neo-card p-8 text-center">
          <p className="text-sm font-semibold text-text-primary">No accounts yet</p>
          <p className="text-xs text-text-secondary mt-1">Businesses create accounts from their edit link.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="neo-card p-8 text-center">
          <p className="text-sm font-semibold text-text-primary">No matching accounts</p>
          <p className="text-xs text-text-secondary mt-1">Try a different name or phone number.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(a => (
            <div key={a.id} className="neo-card p-4 flex flex-wrap items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(a.id)}
                onChange={() => toggleSelect(a.id)}
                className="w-4 h-4 accent-whatsapp-600 shrink-0 cursor-pointer"
                aria-label={`Select ${a.business?.name || 'account'}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-text-primary truncate">{a.business?.name || 'Unknown business'}</p>
                <p className="text-[11px] text-text-secondary">
                  {a.business?.phone || 'no phone'} · created {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize ${a.disabled ? 'bg-red-50 text-red-700 border-red-200' : 'bg-whatsapp-50 text-whatsapp-800 border-whatsapp-200'}`}>
                {a.disabled ? 'Disabled' : 'Active'}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => { setResetting(a); setNewPassword('') }} className="h-9 px-3.5 bg-whatsapp-50 hover:bg-whatsapp-100 text-whatsapp-700 border border-whatsapp-200 text-xs font-semibold rounded-2xl active:scale-95 transition-transform">
                  Reset password
                </button>
                <button
                  onClick={() => act('toggle', { account_id: a.id, disabled: !a.disabled })}
                  className={`h-9 px-3.5 text-xs font-semibold rounded-2xl ${a.disabled ? 'bg-whatsapp-500 hover:bg-whatsapp-600 text-white' : 'btn-secondary'} active:scale-95 transition-transform`}
                >
                  {a.disabled ? 'Enable' : 'Disable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
          <div className="flex flex-wrap items-center justify-center gap-2.5 bg-gray-900 text-white rounded-full shadow-2xl px-5 py-3 max-w-[92vw]">
            <span className="text-xs font-bold whitespace-nowrap">{selectedIds.size} selected</span>
            <button
              onClick={() => setConfirmMode('logins')}
              disabled={bulkDeleting}
              className="h-8 px-3.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap"
            >
              Remove logins
            </button>
            <button
              onClick={() => setConfirmMode('listings')}
              disabled={bulkDeleting}
              className="h-8 px-3.5 rounded-full bg-red-500 hover:bg-red-600 text-xs font-bold transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap"
            >
              Delete + listings
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold transition-all active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

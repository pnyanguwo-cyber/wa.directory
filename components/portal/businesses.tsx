'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Business } from '@/types'
import { ConfirmDialog, adminFetch } from '../admin/shared'
import Link from 'next/link'

const PAGE_SIZE = 15

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'rating-desc' | 'reviews-desc'

interface BranchRow {
  id: string
  name: string
  slug: string | null
  city: string
  area: string
  phone: string
  isHq: boolean
  branchLabel: string
  verified: boolean
  views7d: number
  chats7d: number
  lifetimeViews: number
}

interface OrgTotals {
  perBranch: Record<string, { views: number; chats: number }>
  orgTotals: { views: number; chats: number }
}

export default function PortalBusinesses({ orgName, branches, totals, currentBusinessId }: {
  orgName: string
  branches: Business[]
  totals: OrgTotals
  currentBusinessId: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterCity, setFilterCity] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  // Transform branches into BranchRow format with stats
  const rows: BranchRow[] = useMemo(() => {
    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      city: b.city || '',
      area: b.area || '',
      phone: b.phone || '',
      isHq: b.is_hq === true,
      branchLabel: b.branch_label || '',
      verified: b.verified === true,
      views7d: 0, // Will be populated from totals.perBranch
      chats7d: 0,
      lifetimeViews: 0,
    }))
  }, [branches])

  // Merge with per-branch stats
  const mergedRows: BranchRow[] = useMemo(() => {
    return rows.map(r => ({
      ...r,
      views7d: totals.perBranch?.[r.id]?.views || 0,
      chats7d: totals.perBranch?.[r.id]?.chats || 0,
    }))
  }, [rows, totals.perBranch])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setBulkDeleting(true)
    try {
      const res = await fetch('/api/portal/businesses/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      setBulkDeleting(false)
      setConfirmBulkDelete(false)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to delete')
        return
      }
      setSelectedIds(new Set())
      router.refresh()
    } catch {
      setBulkDeleting(false)
      alert('Failed to delete')
    }
  }

  const STATUS_STYLES: Record<string, string> = {
    active: 'bg-whatsapp-100 text-whatsapp-800',
    pending: 'bg-amber-100 text-amber-700',
    expired: 'bg-red-100 text-red-700',
    unpaid: 'bg-gray-100 text-gray-600',
  }

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>()
    branches.forEach(b => { if (b.city) cities.add(b.city) })
    return [...cities].sort()
  }, [branches])

  const filtered = useMemo(() => {
    let list = mergedRows
    if (filterStatus === 'verified') list = list.filter(b => b.verified)
    if (filterStatus === 'pending') list = list.filter(b => !b.verified)
    if (filterCity) list = list.filter(b => (b.city || '').toLowerCase() === filterCity.toLowerCase())
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.city || '').toLowerCase().includes(q) ||
        (b.area || '').toLowerCase().includes(q) ||
        (b.branchLabel || '').toLowerCase().includes(q) ||
        (b.phone || '').includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(branches.find(b => b.id === b.id)?.created_at || 0).getTime() - new Date(branches.find(b => b.id === a.id)?.created_at || 0).getTime()
        case 'oldest': return new Date(branches.find(b => b.id === a.id)?.created_at || 0).getTime() - new Date(branches.find(b => b.id === b.id)?.created_at || 0).getTime()
        case 'name-asc': return a.name.localeCompare(b.name)
        case 'name-desc': return b.name.localeCompare(a.name)
        case 'rating-desc': return (branches.find(b => b.id === b.id)?.rating || 0) - (branches.find(b => b.id === a.id)?.rating || 0)
        case 'reviews-desc': return (branches.find(b => b.id === b.id)?.review_count || 0) - (branches.find(b => b.id === a.id)?.review_count || 0)
        default: return 0
      }
    })
    return list
  }, [mergedRows, search, filterStatus, filterCity, sortBy, branches])

  const allFilteredSelected = filtered.length > 0 && filtered.every(b => selectedIds.has(b.id))

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filtered.forEach(b => next.delete(b.id))
        return next
      })
    } else {
      setSelectedIds(new Set(filtered.map(b => b.id)))
    }
  }

  const handleDelete = async (id: string) => {
    setConfirmDelete(null)
    setDeletingId(id)
    try {
      const res = await fetch('/api/portal/businesses/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setDeletingId(null)
      if (res.ok) {
        router.refresh()
      } else if (res.status === 401) {
        router.push('/login')
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Failed to delete')
      }
    } catch {
      setDeletingId(null)
      alert('Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete "${branches.find(b => b.id === confirmDelete)?.name || 'this business'}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmBulkDelete && (
        <ConfirmDialog
          message={`Permanently delete ${selectedIds.size} listing${selectedIds.size === 1 ? '' : 's'}? This action cannot be undone.`}
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
          <div className="flex items-center gap-3 bg-gray-900 text-white rounded-full shadow-2xl px-5 py-3">
            <span className="text-xs font-bold whitespace-nowrap">{selectedIds.size} selected</span>
            <button
              onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkDeleting}
              className="h-8 px-3.5 rounded-full bg-red-500 hover:bg-red-600 text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
            >
              {bulkDeleting ? 'Deleting...' : 'Delete selected'}
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

      <div>
        <h2 className="text-lg font-bold text-text-primary">My Businesses — {orgName}</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Manage all branches in your organization. Select multiple to bulk delete.
        </p>
      </div>

      {/* Org totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-whatsapp-200 bg-gradient-to-br from-whatsapp-50 to-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">Profile views (7 days)</p>
          <p className="text-2xl font-extrabold text-whatsapp-700 mt-1">{totals.orgTotals.views}</p>
          <p className="text-[11px] text-text-secondary">All locations combined</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">WhatsApp clicks (7 days)</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{totals.orgTotals.chats}</p>
          <p className="text-[11px] text-text-secondary">All locations combined</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, branch label, city, area, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 text-sm py-2.5"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
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
              {status === 'all' ? 'All' : status === 'verified' ? 'Verified' : 'Pending'}
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`h-11 px-4 rounded-2xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              showFilters
                ? 'bg-whatsapp-500 text-white shadow-md'
                : 'bg-white border border-gray-200/80 text-text-secondary hover:bg-surface'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="neo-card p-4 space-y-4 animate-slide-down">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1 block">Sort by</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className="input-field text-xs py-2 w-full">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name-asc">Name A→Z</option>
                <option value="name-desc">Name Z→A</option>
                <option value="rating-desc">Highest rated</option>
                <option value="reviews-desc">Most reviews</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1 block">City</label>
              <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="input-field text-xs py-2 w-full">
                <option value="">All cities</option>
                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {dataLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="neo-card p-4 flex items-center gap-4">
              <div className="skeleton h-10 w-10 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-48 rounded" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="neo-card p-12 text-center">
          <div className="bg-whatsapp-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 text-whatsapp-600">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-text-primary mb-1">No matching businesses</h2>
          <p className="text-text-secondary text-xs max-w-sm mx-auto">
            {search || filterStatus !== 'all' ? 'Try refining your search query or status filter.' : 'No branches created yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium text-text-secondary">
              Showing {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} businesses
            </p>
            <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                className="w-4 h-4 accent-whatsapp-600 cursor-pointer"
                aria-label="Select all filtered businesses"
              />
              Select all ({filtered.length})
            </label>
          </div>

          <div className="space-y-2.5">
            {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(b => (
              <div key={b.id} className="neo-card p-3.5 sm:p-4 flex flex-col gap-3">
                {/* Row 1: identity */}
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(b.id)}
                    onChange={() => toggleSelect(b.id)}
                    className="w-4 h-4 accent-whatsapp-600 shrink-0 cursor-pointer"
                    aria-label={`Select ${b.name}`}
                  />
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-whatsapp-100 to-whatsapp-200 flex items-center justify-center shrink-0 border border-whatsapp-300/40">
                    <span className="text-xs font-bold text-whatsapp-800">{b.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="font-bold text-text-primary text-sm truncate">{b.name}</h3>
                      {b.isHq && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wide bg-whatsapp-500 text-white rounded-full px-2 py-0.5">
                          HQ
                        </span>
                      )}
                      {b.branchLabel && (
                        <span className="text-[10px] font-semibold text-whatsapp-700">{b.branchLabel}</span>
                      )}
                      {b.verified && (
                        <span className="text-[10px] font-semibold text-whatsapp-700">✓ Verified</span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary truncate mt-0.5">
                      {[b.area, b.city].filter(Boolean).join(', ') || 'Location not set'} · {b.phone}
                    </p>
                  </div>
                </div>

                {/* Row 2: meta pills */}
                <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[11px] text-text-secondary">
                    <b className="text-text-primary text-xs">{b.views7d}</b> views · 7d
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    <b className="text-text-primary text-xs">{b.chats7d}</b> WhatsApp clicks · 7d
                  </p>
                  <p className="text-[11px] text-text-secondary">
                    <b className="text-text-primary text-xs">{b.lifetimeViews}</b> lifetime views
                  </p>
                </div>

                {/* Row 3: actions */}
                <div className="grid grid-cols-3 gap-2">
                  {b.isHq ? (
                    <span className="h-9 flex items-center justify-center text-xs font-medium text-gray-400 bg-gray-100 rounded-xl" title="HQ cannot be deleted">
                      HQ
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(b.id)}
                      disabled={deletingId === b.id}
                      className="h-9 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                      title="Delete branch"
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
                  )}
                  <Link
                    href={`/portal/ranking?branch=${b.id}`}
                    className="h-9 text-xs font-medium text-whatsapp-700 bg-whatsapp-100 hover:bg-whatsapp-200 rounded-xl flex items-center justify-center transition-all"
                    title="Promote this branch"
                  >
                    Promote
                  </Link>
                  {b.slug && (
                    <Link
                      href={`/business/${b.slug}`}
                      className="h-9 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center transition-all"
                      title="View public profile"
                    >
                      Profile
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {Math.ceil(filtered.length / PAGE_SIZE) > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-6 max-w-full overflow-x-auto pb-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-gray-200 text-text-secondary hover:bg-surface disabled:opacity-30 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              {Array.from({ length: Math.ceil(filtered.length / PAGE_SIZE) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-9 w-9 shrink-0 rounded-xl text-xs font-semibold transition-all ${
                    p === page
                      ? 'bg-whatsapp-500 text-white shadow-sm'
                      : 'border border-gray-200 text-text-secondary hover:bg-surface'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / PAGE_SIZE), p + 1))}
                disabled={page === Math.ceil(filtered.length / PAGE_SIZE)}
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-gray-200 text-text-secondary hover:bg-surface disabled:opacity-30 transition-all"
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
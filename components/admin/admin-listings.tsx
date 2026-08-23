'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getClient } from '@/lib/supabase-client'
import type { Business } from '@/types'
import { categories as staticCategories } from '@/data/categories'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import MultiSearchSelect from '@/components/multi-search-select'
import { ConfirmDialog, adminFetch, AdminSectionHeader } from './shared'

const PAGE_SIZE = 15

type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'rating-desc' | 'reviews-desc'
type SubscriptionFilter = 'all' | 'premium' | 'basic'

interface EditForm {
  name: string
  phone: string
  country_code: string
  whatsapp_username: string
  categories: string[]
  city: string
  areas: string[]
  bio: string
  price_range: string
  catalog_link: string
  logo_url: string
  website: string
  verified: boolean
  address: string
  show_location: boolean
  featured_eligible: boolean
}

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

export default function AdminListings() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'pending'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterSubscription, setFilterSubscription] = useState<SubscriptionFilter>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [subscriptionIds, setSubscriptionIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([])
  const [addForm, setAddForm] = useState({
    name: '', categories: [] as string[], phone: '', whatsapp_username: '', city: '', areas: [] as string[],
    bio: '', price_range: '', whatsapp_link: '', catalog_link: '', logo_url: '',
  })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [editForm, setEditForm] = useState<EditForm | null>(null)

  useEffect(() => {
    refresh()
    getClient()
      .from('categories')
      .select('name, icon')
      .eq('active', true)
      .then(({ data }) => {
        const merged = new Map<string, string>()
        for (const c of staticCategories) merged.set(c.name, c.icon)
        for (const c of (data || [])) merged.set(c.name, c.icon)
        setCategoryOptions(
          Array.from(merged.entries()).map(([name, icon]) => ({ value: name, label: `${icon} ${name}` }))
        )
      })
  }, [])

  function refresh() {
    getClient()
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (data) setBusinesses(data as Business[])
        setDataLoading(false)
      })
    getClient()
      .from('subscriptions')
      .select('business_id')
      .eq('status', 'active')
      .then(({ data }) => {
        setSubscriptionIds(new Set((data || []).map((s: any) => s.business_id)))
      })
  }

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
    if (filterSubscription === 'premium') list = list.filter(b => subscriptionIds.has(b.id))
    if (filterSubscription === 'basic') list = list.filter(b => !subscriptionIds.has(b.id))
    if (filterCategory) list = list.filter(b => b.category?.includes(filterCategory))
    if (filterCity) list = list.filter(b => (b.city || '').toLowerCase() === filterCity.toLowerCase())
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.category?.some(c => c.toLowerCase().includes(q)) ||
        (b.city || '').toLowerCase().includes(q) ||
        (b.location || '').toLowerCase().includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name-asc': return a.name.localeCompare(b.name)
        case 'name-desc': return b.name.localeCompare(a.name)
        case 'rating-desc': return (b.rating || 0) - (a.rating || 0)
        case 'reviews-desc': return (b.review_count || 0) - (a.review_count || 0)
        default: return 0
      }
    })
    return list
  }, [businesses, search, filterStatus, sortBy, filterSubscription, filterCategory, filterCity, subscriptionIds])

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>()
    businesses.forEach(b => b.category?.forEach(c => cats.add(c)))
    return [...cats].sort()
  }, [businesses])

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>()
    businesses.forEach(b => { if (b.city) cities.add(b.city) })
    return [...cities].sort()
  }, [businesses])

  const hasActiveFilters = filterStatus !== 'all' || filterSubscription !== 'all' || filterCategory || filterCity || sortBy !== 'newest'

  function clearFilters() {
    setFilterStatus('all')
    setFilterSubscription('all')
    setFilterCategory('')
    setFilterCity('')
    setSortBy('newest')
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search, filterStatus])

  const handleToggleVerify = async (id: string, current: boolean) => {
    setTogglingId(id)
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, verified: !current }),
    })
    setTogglingId(null)
    if (res.ok) {
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, verified: !current } : b))
    } else if (res.status === 401) {
      router.push('/admin-login')
    }
  }

  const handleDelete = async (id: string) => {
    setConfirmDelete(null)
    setDeletingId(id)
    const res = await fetch('/api/admin/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeletingId(null)
    if (res.ok) {
      setBusinesses(prev => prev.filter(b => b.id !== id))
    } else if (res.status === 401) {
      router.push('/admin-login')
    }
  }

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    const res = await fetch('/api/admin/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...addForm,
        area: addForm.areas[0] || '',
        areas: addForm.areas,
        category: addForm.categories,
        verified: true,
      }),
    })
    const data = await res.json()
    setAdding(false)
    if (res.ok) {
      setShowAddModal(false)
      setAddForm({ name: '', categories: [], phone: '', whatsapp_username: '', city: '', areas: [], bio: '', price_range: '', whatsapp_link: '', catalog_link: '', logo_url: '' })
      refresh()
    } else if (res.status === 401) {
      router.push('/admin-login')
    } else {
      setAddError(data.error || 'Failed to add business')
    }
  }

  const openEdit = (b: Business) => {
    setEditForm({
      name: b.name,
      phone: b.phone,
      country_code: b.country_code || '+263',
      whatsapp_username: b.whatsapp_username || '',
      categories: b.category || [],
      city: b.city || '',
      areas: b.areas?.length ? b.areas : (b.area ? [b.area] : []),
      bio: b.bio || '',
      price_range: b.price_range || '',
      catalog_link: b.catalog_link || '',
      logo_url: b.logo_url || '',
      website: (b as { website?: string }).website || '',
      verified: b.verified,
      address: b.address || '',
      show_location: b.show_location !== false,
      featured_eligible: b.featured_eligible !== false,
    })
    setEditingId(b.id)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm || !editingId) return
    setFormError('')
    setSaving(true)
    const { ok, status, data } = await adminFetch('/api/admin/update-business', {
      method: 'POST',
      body: JSON.stringify({ id: editingId, ...editForm }),
    })
    setSaving(false)
    if (ok) {
      setEditingId(null)
      setEditForm(null)
      refresh()
    } else if (status === 401) {
      router.push('/admin-login')
    } else {
      setFormError(data?.error || 'Failed to save')
    }
  }

  return (
    <div className="space-y-6">
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
                  <label className="text-xs font-medium text-text-secondary mb-1 block">WhatsApp Username *</label>
                  <input type="text" required value={addForm.whatsapp_username} onChange={e => setAddForm(f => ({ ...f, whatsapp_username: e.target.value }))} className="input-field text-sm" placeholder="e.g. johnsplumbing" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Categories</label>
                  <MultiSearchSelect
                    options={categoryOptions}
                    values={addForm.categories}
                    onChange={cats => setAddForm(f => ({ ...f, categories: cats }))}
                    placeholder="Select categories"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">City</label>
                  <select value={addForm.city} onChange={e => setAddForm(f => ({ ...f, city: e.target.value, areas: [] }))} className="input-field text-sm">
                    <option value="">Select city</option>
                    {zimbabweCities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Areas</label>
                  <MultiSearchSelect
                    options={(zimbabweCities.find(c => c.name === addForm.city)?.areas || []).map(a => ({ value: a, label: a }))}
                    values={addForm.areas}
                    onChange={areas => setAddForm(f => ({ ...f, areas }))}
                    primary
                    placeholder="Select areas"
                  />
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
                <button type="submit" disabled={adding || addForm.categories.length === 0} className="btn-primary h-10 px-5 text-xs font-semibold">
                  {adding ? 'Adding Business...' : 'Add Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingId && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-slide-up my-auto border border-white">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-text-primary">Edit Business</h2>
              <button onClick={() => { setEditingId(null); setEditForm(null) }} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface text-text-secondary transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Business Name *</label>
                  <input type="text" required value={editForm.name} onChange={e => setEditForm(f => ({ ...f!, name: e.target.value }))} className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Phone *</label>
                  <input type="text" required value={editForm.phone} onChange={e => setEditForm(f => ({ ...f!, phone: e.target.value }))} className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">WhatsApp Username</label>
                  <input type="text" value={editForm.whatsapp_username} onChange={e => setEditForm(f => ({ ...f!, whatsapp_username: e.target.value }))} className="input-field text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Categories</label>
                  <MultiSearchSelect
                    options={categoryOptions}
                    values={editForm.categories}
                    onChange={cats => setEditForm(f => ({ ...f!, categories: cats }))}
                    placeholder="Select categories"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">City</label>
                  <select value={editForm.city} onChange={e => setEditForm(f => ({ ...f!, city: e.target.value, areas: [] }))} className="input-field text-sm">
                    <option value="">Select city</option>
                    {zimbabweCities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Areas</label>
                  <MultiSearchSelect
                    options={(zimbabweCities.find(c => c.name === editForm.city)?.areas || []).map(a => ({ value: a, label: a }))}
                    values={editForm.areas}
                    onChange={areas => setEditForm(f => ({ ...f!, areas }))}
                    primary
                    placeholder="Select areas"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Bio</label>
                  <textarea rows={2} value={editForm.bio} onChange={e => setEditForm(f => ({ ...f!, bio: e.target.value }))} className="input-field text-sm resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Price Range</label>
                  <input type="text" value={editForm.price_range} onChange={e => setEditForm(f => ({ ...f!, price_range: e.target.value }))} className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Website</label>
                  <input type="text" value={editForm.website} onChange={e => setEditForm(f => ({ ...f!, website: e.target.value }))} className="input-field text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Catalog Link</label>
                  <input type="text" value={editForm.catalog_link} onChange={e => setEditForm(f => ({ ...f!, catalog_link: e.target.value }))} className="input-field text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Logo URL</label>
                  <input type="text" value={editForm.logo_url} onChange={e => setEditForm(f => ({ ...f!, logo_url: e.target.value }))} className="input-field text-sm" />
                </div>
                <label className="sm:col-span-2 flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <input
                    type="checkbox"
                    checked={editForm.verified}
                    onChange={e => setEditForm(f => ({ ...f!, verified: e.target.checked }))}
                    className="w-4 h-4 accent-whatsapp-600"
                  />
                  Verified (approved)
                </label>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Address</label>
                  <input type="text" value={editForm.address} onChange={e => setEditForm(f => ({ ...f!, address: e.target.value }))} className="input-field text-sm" placeholder="e.g. 123 Samora Machel Ave" />
                </div>
                <label className="sm:col-span-2 flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <input
                    type="checkbox"
                    checked={editForm.show_location}
                    onChange={e => setEditForm(f => ({ ...f!, show_location: e.target.checked }))}
                    className="w-4 h-4 accent-whatsapp-600"
                  />
                  Show address on profile (enables Google Maps directions)
                </label>
                <label className="sm:col-span-2 flex items-center gap-2 text-xs font-medium text-text-secondary">
                  <input
                    type="checkbox"
                    checked={editForm.featured_eligible}
                    onChange={e => setEditForm(f => ({ ...f!, featured_eligible: e.target.checked }))}
                    className="w-4 h-4 accent-whatsapp-600"
                  />
                  Eligible for Featured section
                </label>
              </div>
              {formError && <p className="text-red-500 text-xs font-medium">{formError}</p>}
              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button type="button" onClick={() => { setEditingId(null); setEditForm(null) }} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary h-10 px-5 text-xs font-semibold">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminSectionHeader
        title="Business Listings"
        subtitle={`${stats.total} total, ${stats.verified} verified, ${stats.pending} pending approval, ${stats.newThisWeek} new this week`}
        action={
          <button onClick={() => setShowAddModal(true)} className="btn-primary h-10 px-4 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Add Business</span>
          </button>
        }
      />

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
              {status === 'all' ? 'All' : status === 'verified' ? 'Verified' : 'Pending'}
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`h-11 px-4 rounded-2xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              showFilters || hasActiveFilters
                ? 'bg-whatsapp-500 text-white shadow-md'
                : 'bg-white border border-gray-200/80 text-text-secondary hover:bg-surface'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            Filters
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="neo-card p-4 space-y-4 animate-slide-down">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">Filters & Sort</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-whatsapp-600 font-semibold hover:underline">
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1 block">Subscription</label>
              <select value={filterSubscription} onChange={e => setFilterSubscription(e.target.value as SubscriptionFilter)} className="input-field text-xs py-2 w-full">
                <option value="all">All</option>
                <option value="premium">Premium only</option>
                <option value="basic">Basic only</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1 block">Category</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field text-xs py-2 w-full">
                <option value="">All categories</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
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
                        <span className="badge-verified shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M23 12L21.2 14.5L21.5 17.5L18.7 18.7L17.5 21.5L14.5 21.2L12 23L9.5 21.2L6.5 21.5L5.3 18.7L2.5 17.5L2.8 14.5L1 12L2.8 9.5L2.5 6.5L5.3 5.3L6.5 2.5L9.5 2.8L12 1L14.5 2.8L17.5 2.5L18.7 5.3L21.5 6.5L21.2 9.5Z" fill="#0095F6" stroke="white" strokeWidth="0.8" />
                            <path d="M9.5 15.5L7 13L5.5 14.5L9.5 18.5L18.5 9.5L17 8L9.5 15.5Z" fill="white" />
                          </svg>
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
                    onClick={() => openEdit(b)}
                    className="h-8 px-3 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
                    title="Edit business"
                  >
                    Edit
                  </button>
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
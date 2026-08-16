'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import { ConfirmDialog, adminFetch, AdminSectionHeader } from './shared'

interface AreaRow {
  id: string
  city: string
  name: string
  active: boolean
}

export default function AdminAreas() {
  const router = useRouter()
  const [rows, setRows] = useState<AreaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [bulkCity, setBulkCity] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<AreaRow | null>(null)
  const [editing, setEditing] = useState<AreaRow | null>(null)
  const [editCity, setEditCity] = useState('')
  const [editName, setEditName] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/areas')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setRows(data.areas || [])
    setLoading(false)
  }

  const grouped = rows.reduce<Record<string, AreaRow[]>>((acc, r) => {
    if (!acc[r.city]) acc[r.city] = []
    acc[r.city].push(r)
    return acc
  }, {})

  async function addBulk(e: React.FormEvent) {
    e.preventDefault()
    const names = bulkText.split('\n').map(s => s.trim()).filter(Boolean)
    if (!bulkCity || names.length === 0) return
    setBusy(true)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/areas', {
      method: 'POST',
      body: JSON.stringify({ city: bulkCity, names }),
    })
    setBusy(false)
    if (!ok) {
      setMessage(data?.error || 'Failed to add')
      return
    }
    setBulkText('')
    setMessage(`Added ${data.added}, skipped ${data.skipped} in ${bulkCity}`)
    load()
  }

  async function toggleActive(row: AreaRow) {
    const { ok } = await adminFetch('/api/admin/areas', {
      method: 'PATCH',
      body: JSON.stringify({ id: row.id, active: !row.active }),
    })
    if (ok) load()
  }

  function openEdit(row: AreaRow) {
    setEditing(row)
    setEditCity(row.city)
    setEditName(row.name)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setBusy(true)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/areas', {
      method: 'PATCH',
      body: JSON.stringify({ id: editing.id, city: editCity.trim(), name: editName.trim() }),
    })
    setBusy(false)
    if (!ok) {
      setMessage(data?.error || 'Failed to save')
      return
    }
    setEditing(null)
    load()
  }

  async function removeArea(row: AreaRow) {
    setConfirmDelete(null)
    const { ok, data } = await adminFetch('/api/admin/areas', {
      method: 'DELETE',
      body: JSON.stringify({ id: row.id }),
    })
    if (!ok) {
      setMessage(data?.error || 'Failed to delete')
      return
    }
    setMessage(`Deleted "${row.name}"`)
    load()
  }

  return (
    <div className="space-y-6">
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete area "${confirmDelete.name}" (${confirmDelete.city})?`}
          onConfirm={() => removeArea(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white">
            <h2 className="text-lg font-bold text-text-primary">Edit Area</h2>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">City</label>
                <select value={editCity} onChange={e => setEditCity(e.target.value)} className="input-field text-sm">
                  {zimbabweCities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Area Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="input-field text-sm" required />
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={busy} className="btn-primary h-10 px-5 text-xs font-semibold">{busy ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminSectionHeader
        title="Areas"
        subtitle={`${rows.length} areas across ${Object.keys(grouped).length} cities`}
      />

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{message}</p>
      )}

      <form onSubmit={addBulk} className="neo-card p-4 space-y-3">
        <h3 className="text-sm font-bold text-text-primary">Add Areas in Bulk</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">City</label>
            <select value={bulkCity} onChange={e => setBulkCity(e.target.value)} className="input-field text-sm" required>
              <option value="">Select city</option>
              {zimbabweCities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Areas (one per line)</label>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              rows={3}
              className="input-field text-sm resize-none"
              placeholder={'e.g.:\nChikanga\nDangamvura\nMutare CBD'}
            />
          </div>
        </div>
        <button type="submit" disabled={busy || !bulkCity} className="btn-primary h-10 px-4 text-xs font-semibold">
          {busy ? 'Adding...' : `Add ${bulkText.split('\n').filter(s => s.trim()).length || 0} Areas`}
        </button>
      </form>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(grouped).map(([city, areas]) => (
            <div key={city} className="neo-card p-4">
              <h3 className="text-sm font-bold text-text-primary mb-2">{city} <span className="text-text-secondary font-normal text-xs">({areas.length})</span></h3>
              <div className="flex flex-wrap gap-1.5">
                {areas.map(a => (
                  <span
                    key={a.id}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-all ${
                      a.active
                        ? 'bg-whatsapp-50 text-whatsapp-800 border-whatsapp-200'
                        : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                    }`}
                  >
                    {a.name}
                    <button onClick={() => toggleActive(a)} title={a.active ? 'Hide area' : 'Show area'} className="text-[10px] font-semibold uppercase tracking-wide hover:opacity-70">
                      {a.active ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => openEdit(a)} title="Edit" className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 hover:opacity-70">Edit</button>
                    <button onClick={() => setConfirmDelete(a)} title="Delete" className="text-[10px] font-semibold uppercase tracking-wide text-red-600 hover:opacity-70">Del</button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
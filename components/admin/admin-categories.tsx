'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog, adminFetch, AdminSectionHeader } from './shared'

interface CategoryRow {
  id: string
  name: string
  icon: string
  keywords: string[]
  active: boolean
  business_count: number
}

export default function AdminCategories() {
  const router = useRouter()
  const [rows, setRows] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [singleName, setSingleName] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<CategoryRow | null>(null)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [editKeywords, setEditKeywords] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/categories')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setRows(data.categories || [])
    setLoading(false)
  }

  async function addSingle(e: React.FormEvent) {
    e.preventDefault()
    if (!singleName.trim()) return
    setBusy(true)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ names: [singleName.trim()] }),
    })
    setBusy(false)
    if (!ok) {
      setMessage(data?.error || 'Failed to add')
      return
    }
    setSingleName('')
    setMessage(`Added ${data.added}, skipped ${data.skipped}`)
    load()
  }

  async function addBulk(e: React.FormEvent) {
    e.preventDefault()
    const names = bulkText.split('\n').map(s => s.trim()).filter(Boolean)
    if (names.length === 0) return
    setBusy(true)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ names }),
    })
    setBusy(false)
    if (!ok) {
      setMessage(data?.error || 'Failed to add')
      return
    }
    setBulkText('')
    setMessage(`Added ${data.added}, skipped ${data.skipped}`)
    load()
  }

  async function toggleActive(row: CategoryRow) {
    const { ok } = await adminFetch('/api/admin/categories', {
      method: 'PATCH',
      body: JSON.stringify({ id: row.id, active: !row.active }),
    })
    if (ok) load()
  }

  function openEdit(row: CategoryRow) {
    setEditing(row)
    setEditName(row.name)
    setEditIcon(row.icon)
    setEditKeywords((row.keywords || []).join(', '))
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setBusy(true)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/categories', {
      method: 'PATCH',
      body: JSON.stringify({
        id: editing.id,
        name: editName.trim(),
        icon: editIcon.trim() || '📋',
        keywords: editKeywords.split(',').map(s => s.trim()).filter(Boolean),
      }),
    })
    setBusy(false)
    if (!ok) {
      setMessage(data?.error || 'Failed to save')
      return
    }
    setEditing(null)
    load()
  }

  async function removeCategory(row: CategoryRow) {
    setConfirmDelete(null)
    const { ok, data } = await adminFetch('/api/admin/categories', {
      method: 'DELETE',
      body: JSON.stringify({ id: row.id }),
    })
    if (!ok) {
      setMessage(data?.error || 'Failed to delete')
      return
    }
    setMessage(`Deleted "${row.name}" and removed it from businesses`)
    load()
  }

  return (
    <div className="space-y-6">
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete category "${confirmDelete.name}"? It will be removed from ${confirmDelete.business_count} business listing${confirmDelete.business_count !== 1 ? 's' : ''}.`}
          onConfirm={() => removeCategory(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white">
            <h2 className="text-lg font-bold text-text-primary">Edit Category</h2>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="input-field text-sm" required />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Icon (emoji)</label>
                <input value={editIcon} onChange={e => setEditIcon(e.target.value)} className="input-field text-sm" placeholder="🍞" />
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Keywords (comma separated)</label>
                <textarea value={editKeywords} onChange={e => setEditKeywords(e.target.value)} rows={3} className="input-field text-sm resize-none" placeholder="cakes, bread, pastry..." />
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
        title="Categories"
        subtitle={`${rows.length} categories, ${rows.filter(r => r.active).length} active`}
      />

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{message}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={addSingle} className="neo-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-text-primary">Add One</h3>
          <div className="flex gap-2">
            <input
              value={singleName}
              onChange={e => setSingleName(e.target.value)}
              className="input-field text-sm flex-1"
              placeholder="e.g. Solar Installation"
            />
            <button type="submit" disabled={busy || !singleName.trim()} className="btn-primary h-11 px-4 text-xs font-semibold shrink-0">Add</button>
          </div>
        </form>

        <form onSubmit={addBulk} className="neo-card p-4 space-y-3">
          <h3 className="text-sm font-bold text-text-primary">Add in Bulk</h3>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            rows={3}
            className="input-field text-sm resize-none"
            placeholder={'One category per line, e.g.:\nSolar Installation\nPest Control\nFitness & Gyms'}
          />
          <button type="submit" disabled={busy} className="btn-primary h-10 px-4 text-xs font-semibold w-full">
            {busy ? 'Adding...' : `Add ${bulkText.split('\n').filter(s => s.trim()).length || 0} Categories`}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-text-secondary text-sm py-10">No categories yet.</p>
      ) : (
        <div className="neo-card overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-xs text-text-secondary border-b border-gray-100">
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold hidden sm:table-cell">Keywords</th>
                <th className="px-4 py-3 font-semibold">Used by</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-surface/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-text-primary">{r.icon} {r.name}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-text-secondary text-xs max-w-[280px] truncate">
                    {(r.keywords || []).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{r.business_count}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(r)}
                      className={`text-xs font-semibold rounded-full px-2.5 py-1 transition-all ${
                        r.active ? 'bg-whatsapp-100 text-whatsapp-800' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {r.active ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="text-xs font-medium text-blue-700 hover:underline mr-3">Edit</button>
                    <button onClick={() => setConfirmDelete(r)} className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
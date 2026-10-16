'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ShopItem {
  id: string
  business_id: string
  name: string
  slug: string
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function PortalShop({ businessId, businessName }: { businessId: string; businessName: string }) {
  const router = useRouter()
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')

  async function loadItems() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/portal/shop')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not load items')
        setLoading(false)
        return
      }
      setItems(data.items || [])
    } catch {
      setError('Could not load items. Check your connection and try again.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const price = Number(newPrice)
    if (newName.trim().length < 2) {
      setError('Item name must be at least 2 characters.')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Enter a valid price.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/portal/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), price, is_active: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not add item')
        return
      }
      setNotice('Item added.')
      setNewName('')
      setNewPrice('')
      await loadItems()
    } catch {
      setError('Could not add item. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: string) {
    const price = Number(editPrice)
    if (editName.trim().length < 2) {
      setError('Item name must be at least 2 characters.')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Enter a valid price.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/portal/shop/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), price, is_active: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not update item')
        return
      }
      setNotice('Item updated.')
      setEditingId(null)
      await loadItems()
    } catch {
      setError('Could not update item. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/portal/shop/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not delete item')
        return
      }
      setNotice('Item deleted.')
      await loadItems()
    } catch {
      setError('Could not delete item. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(item: ShopItem) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/portal/shop/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not update item')
        return
      }
      setNotice(item.is_active ? 'Item hidden from your shop.' : 'Item visible in your shop.')
      await loadItems()
    } catch {
      setError('Could not update item. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Shop</h2>
        <p className="text-xs text-text-secondary mt-0.5">List the items {businessName} offers. Customers search these items and see the price.</p>
      </div>

      {/* Create form */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <h3 className="text-sm font-bold text-text-primary mb-3">Add item</h3>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Item name</label>
              <input
                type="text"
                value={newName}
                onChange={e => { setNewName(e.target.value); setNotice('') }}
                placeholder="e.g. Borehole Drilling"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Price (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newPrice}
                onChange={e => { setNewPrice(e.target.value); setNotice('') }}
                placeholder="0.00"
                className="input-field w-full"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
          {notice && <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{notice}</p>}
          <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold disabled:opacity-60">
            {saving ? 'Saving…' : 'Add item'}
          </button>
        </form>
      </div>

      {/* Item list */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <h3 className="text-sm font-bold text-text-primary mb-3">Your items ({items.length})</h3>
        {loading ? (
          <p className="text-sm text-text-secondary">Loading items…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-text-secondary">No items yet. Add your first item above.</p>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/80 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
                  <p className="text-xs text-text-secondary font-medium mt-0.5">{`$${Number(item.price || 0).toFixed(2)} USD`}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    disabled={saving}
                    className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${item.is_active ? 'bg-whatsapp-500' : 'bg-gray-300'}`}
                    role="switch"
                    aria-checked={item.is_active}
                    aria-label={`Toggle ${item.name}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${item.is_active ? 'translate-x-4' : ''}`} />
                  </button>
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="input-field w-40 text-sm"
                        placeholder="Item name"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        className="input-field w-24 text-sm"
                        placeholder="0.00"
                      />
                      <button type="button" onClick={() => handleUpdate(item.id)} disabled={saving} className="btn-primary px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-60">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="btn-secondary px-3 py-2 rounded-xl text-xs font-semibold">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditingId(item.id); setEditName(item.name); setEditPrice(String(item.price)); setNotice('') }}
                        className="btn-secondary px-3 py-2 rounded-xl text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(item.id)} disabled={saving} className="btn-secondary px-3 py-2 rounded-xl text-xs font-semibold text-red-600">Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mt-4">{error}</p>}
        {notice && <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 mt-4 animate-fade-in">{notice}</p>}
      </div>
    </div>
  )
}

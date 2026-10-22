'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface ShopItem {
  id: string
  business_id: string
  name: string
  slug: string
  price: number
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Product photo picker: uploads via /api/upload (2 MB cap, PNG/JPEG/WebP)
// and hands the hosted URL back through onSet. Empty string = no image.
function ItemImageField({ imageUrl, onSet, inputId }: { imageUrl: string; onSet: (url: string) => void; inputId: string }) {
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setErr('Image too large (max 2MB).')
      return
    }
    setUploading(true)
    setErr('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error || 'Upload failed')
        return
      }
      onSet(data.url || '')
    } catch {
      setErr('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">Photo</label>
      <div className="flex items-center gap-3">
        {imageUrl ? (
          <div className="w-14 h-14 rounded-xl border border-gray-200/80 overflow-hidden bg-surface shrink-0">
            <Image src={imageUrl} alt="Item photo" width={56} height={56} className="w-14 h-14 object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl border border-dashed border-gray-300 bg-surface flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M18 6h.008v.008H18V6Zm2.25 12H3.75A1.5 1.5 0 0 1 2.25 16.5v-9A1.5 1.5 0 0 1 3.75 6h16.5A1.5 1.5 0 0 1 21.75 7.5v9a1.5 1.5 0 0 1-1.5 1.5Z" />
            </svg>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={inputId}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer select-none"
          >
            {uploading ? 'Uploading…' : imageUrl ? 'Change photo' : 'Add photo'}
          </label>
          {imageUrl && (
            <button type="button" onClick={() => onSet('')} disabled={uploading} className="px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 w-fit">
              Remove
            </button>
          )}
        </div>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>
      {err && <p className="text-xs text-red-600 mt-1.5">{err}</p>}
    </div>
  )
}

export default function PortalShop({ businessId, businessName }: { businessId: string; businessName: string }) {
  const router = useRouter()
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')

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

  async function refreshPublicPages() {
    // Profile + auto-site are ISR-cached; the API revalidates them. This just
    // nudges local client state if we are currently on one of those pages.
    router.refresh()
  }

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
        body: JSON.stringify({ name: newName.trim(), price, image_url: newImageUrl, is_active: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not add item')
        return
      }
      setNotice('Item added.')
      setNewName('')
      setNewPrice('')
      setNewImageUrl('')
      await loadItems()
      refreshPublicPages()
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
        body: JSON.stringify({ name: editName.trim(), price, image_url: editImageUrl, is_active: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not update item')
        return
      }
      setNotice('Item updated.')
      setEditingId(null)
      await loadItems()
      refreshPublicPages()
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
      refreshPublicPages()
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
      refreshPublicPages()
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
        <p className="text-xs text-text-secondary mt-0.5">List the items {businessName} offers. Customers search these items and see the price on your profile and website.</p>
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
          <ItemImageField imageUrl={newImageUrl} onSet={setNewImageUrl} inputId="new-item-image" />
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
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {item.image_url ? (
                    <div className="w-11 h-11 rounded-xl border border-gray-200/80 overflow-hidden bg-surface shrink-0">
                      <Image src={item.image_url} alt={item.name} width={44} height={44} className="w-11 h-11 object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-xl border border-dashed border-gray-300 bg-surface flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M18 6h.008v.008H18V6Zm2.25 12H3.75A1.5 1.5 0 0 1 2.25 16.5v-9A1.5 1.5 0 0 1 3.75 6h16.5A1.5 1.5 0 0 1 21.75 7.5v9a1.5 1.5 0 0 1-1.5 1.5Z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
                    <p className="text-xs text-text-secondary font-medium mt-0.5">{`$${Number(item.price || 0).toFixed(2)} USD`}</p>
                  </div>
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
                        onClick={() => { setEditingId(item.id); setEditName(item.name); setEditPrice(String(item.price)); setEditImageUrl(item.image_url || ''); setNotice('') }}
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
            {editingId && (
              <div className="rounded-2xl border border-gray-200/80 px-4 py-4">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Edit photo</p>
                <ItemImageField imageUrl={editImageUrl} onSet={setEditImageUrl} inputId={`edit-item-image-${editingId}`} />
                <p className="text-[11px] text-text-secondary mt-2">Remember to press Save to keep the change.</p>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mt-4">{error}</p>}
        {notice && <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 mt-4 animate-fade-in">{notice}</p>}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Boxes, Loader2, PackageOpen, ScanLine, Sparkles, Store, Tag } from 'lucide-react'
import { categories } from '@/data/categories'

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
  description?: string
  category?: string
  brand?: string
  item_condition?: string
  currency_code?: string
  price_type?: 'fixed' | 'on_request'
  availability_status?: string
  status?: string
  stock_quantity?: number | null
}

// Only the fields the AI actually supports are prefilled; everything else is
// left for the seller (no invented prices, stock or specifications).
interface ListingSuggestion {
  product_name?: { value: string; confidence: number }
  description?: { value: string; confidence: number }
  category?: { value: string; confidence: number }
  brand?: { value: string; confidence: number }
  condition?: { value: string; confidence: number }
  price?: { amount: number | null; currency: string | null; confidence: number }
  availability?: { value: string; confidence: number }
  missing_required_fields?: string[]
  warnings?: string[]
}

// True when the typed category is not on the approved list yet.
function isPendingProductCategory(name: string): boolean {
  return (
    name.length >= 2 &&
    name.length <= 60 &&
    !categories.some(c => c.name.toLowerCase() === name.toLowerCase())
  )
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
      <label className="block text-[12px] font-semibold text-text-primary mb-1.5">Photo</label>
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

  // Product detail fields (migration 033).
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newCondition, setNewCondition] = useState('')
  const [newCurrency, setNewCurrency] = useState('USD')
  const [newPriceType, setNewPriceType] = useState<'fixed' | 'on_request'>('fixed')
  const [newAvailability, setNewAvailability] = useState('in_stock')
  const [newStock, setNewStock] = useState('')

  // AI listing assistant state.
  const [analysing, setAnalysing] = useState(false)
  const [aiNote, setAiNote] = useState('')
  const [aiWarnings, setAiWarnings] = useState<string[]>([])
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [usedAI, setUsedAI] = useState(false)

  const categoryTrimmed = newCategory.trim()
  const categoryIsPending = isPendingProductCategory(categoryTrimmed)
  const activeCount = items.filter(item => item.is_active).length
  const stockValue = items.reduce((sum, item) => (item.price_type === 'on_request' ? sum : sum + Number(item.price || 0)), 0)

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

  // Uploads the photo, stores it, and prefills only what the model could
  // actually read. A failure keeps the image and falls back to manual entry.
  async function analysePhoto(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo too large (max 2MB).')
      return
    }
    setAnalysing(true)
    setError('')
    setNotice('')
    setAiNote('')
    setAiWarnings([])
    setMissingFields([])
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/portal/products/analyse', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not read that photo.')
        return
      }
      if (data.imageUrl) setNewImageUrl(data.imageUrl)

      const suggestion = data.suggestion as ListingSuggestion | null
      if (!data.analysed || !suggestion) {
        setAiNote(data.message || 'We could not read that photo. Fill in the details below.')
        return
      }

      setUsedAI(true)
      if (suggestion.product_name?.value) setNewName(suggestion.product_name.value)
      if (suggestion.description?.value) setNewDescription(suggestion.description.value)
      if (suggestion.category?.value && (suggestion.category.confidence || 0) >= 0.5) {
        setNewCategory(suggestion.category.value)
      }
      if (suggestion.brand?.value) setNewBrand(suggestion.brand.value)
      if (suggestion.condition?.value) setNewCondition(suggestion.condition.value)
      if (suggestion.price?.amount) {
        setNewPrice(String(suggestion.price.amount))
        setNewPriceType('fixed')
      }
      if (suggestion.price?.currency) setNewCurrency(suggestion.price.currency)
      if (suggestion.availability?.value && suggestion.availability.value !== 'availability_unknown') {
        setNewAvailability(suggestion.availability.value)
      }
      setMissingFields(suggestion.missing_required_fields || [])
      setAiWarnings(suggestion.warnings || [])
      setAiNote('We filled in what we could read. Please check every field before publishing.')
    } catch {
      setError('Could not read that photo. Check your connection and try again.')
    } finally {
      setAnalysing(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const price = Number(newPrice)
    if (newName.trim().length < 2) {
      setError('Product name must be at least 2 characters.')
      return
    }
    if (newPriceType === 'fixed' && (!Number.isFinite(price) || price < 0)) {
      setError('Enter a valid price, or choose "Price on request".')
      return
    }
    if (newStock !== '' && (!Number.isInteger(Number(newStock)) || Number(newStock) < 0)) {
      setError('Enter a whole number for stock, or leave it blank.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/portal/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          price: newPriceType === 'on_request' ? 0 : price,
          price_type: newPriceType,
          currency_code: newCurrency,
          description: newDescription,
          category: newCategory,
          brand: newBrand,
          item_condition: newCondition,
          availability_status: newAvailability,
          stock_quantity: newStock === '' ? null : Number(newStock),
          status: 'active',
          image_url: newImageUrl,
          ai_generated: usedAI,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not add item')
        return
      }
      if (categoryIsPending) {
        const businessId = data.item?.business_id
        if (businessId) {
          fetch('/api/feature-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'category', name: categoryTrimmed, business_id: businessId }),
          }).catch(() => {})
        }
        setNotice(`Product published. Your new category "${categoryTrimmed}" is pending review.`)
      } else {
        setNotice('Product published.')
      }
      setNewName('')
      setNewPrice('')
      setNewImageUrl('')
      setNewDescription('')
      setNewCategory('')
      setNewBrand('')
      setNewCondition('')
      setNewStock('')
      setNewAvailability('in_stock')
      setNewPriceType('fixed')
      setNewCurrency('USD')
      setAiNote('')
      setAiWarnings([])
      setMissingFields([])
      setUsedAI(false)
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
      <div className="relative overflow-hidden rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-[#062f1b] via-[#084225] to-[#0b5630] p-4 sm:p-5 text-white shadow-card">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Store className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold leading-tight">Shop</h2>
              <p className="mt-0.5 max-w-xl text-[11.5px] leading-relaxed text-emerald-50/80">
                List what {businessName} sells. Buyers see these items on your profile, website and WhatsApp catalogue.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: Boxes, label: `${activeCount} live`, value: `${items.length} total` },
              { icon: Tag, label: "Stock value", value: `$${stockValue.toFixed(2)}` },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-emerald-100/70">
                  <stat.icon className="h-3 w-3" aria-hidden="true" />
                  {stat.label}
                </p>
                <p className="mt-0.5 text-sm font-extrabold tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create form */}
      <div className="rounded-3xl border border-gray-300/70 bg-white p-4 shadow-card sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-text-primary">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-whatsapp-50 text-whatsapp-700">
              <PackageOpen className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            Add product
          </h3>
        </div>
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-900/10 bg-gradient-to-r from-[#062f1b] to-[#0b4d2c] p-3 text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <ScanLine className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold leading-tight">Fill the form from a photo</p>
              <p className="mt-0.5 text-[10.5px] leading-snug text-emerald-50/75">
                Snap the item and we read the name, category, brand and visible condition.
              </p>
            </div>
            <label
              className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors ${
                analysing ? 'bg-white/10 text-emerald-50/60' : 'bg-white text-[#073a20] hover:bg-emerald-50'
              }`}
            >
              {analysing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
              {analysing ? 'Reading photo…' : 'Choose photo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={analysing}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) void analysePhoto(file)
                  e.target.value = ''
                }}
              />
            </label>
          </div>

        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-primary mb-1.5">Product name</label>
              <input
                type="text"
                value={newName}
                onChange={e => { setNewName(e.target.value); setNotice('') }}
                placeholder="e.g. iPhone 15 Pro"
                className="input-field w-full !rounded-xl !px-3 !py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-primary mb-1.5">Price</label>
              <div className="flex gap-2">
                <select
                  value={newCurrency}
                  onChange={e => setNewCurrency(e.target.value)}
                  className="input-field w-24 !rounded-xl !px-2.5 !py-2 text-sm"
                  aria-label="Currency"
                >
                  <option value="USD">USD</option>
                  <option value="ZAR">ZAR</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newPrice}
                  onChange={e => { setNewPrice(e.target.value); setNotice('') }}
                  placeholder="0.00"
                  className="input-field w-full !rounded-xl !px-3 !py-2 text-sm"
                  disabled={newPriceType === 'on_request'}
                  aria-label="Price amount"
                />
              </div>
              <label className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={newPriceType === 'on_request'}
                  onChange={e => setNewPriceType(e.target.checked ? 'on_request' : 'fixed')}
                />
                Price on request
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-text-primary mb-1.5">
              Description <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <textarea
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="What is it, and what condition is it in?"
              className="input-field w-full resize-y !rounded-xl !px-3 !py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-primary mb-1.5">Category</label>
              <input
                type="text"
                list="product-category-options"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="e.g. Electronics"
                className="input-field w-full !rounded-xl !px-3 !py-2 text-sm"
              />
              <datalist id="product-category-options">
                {categories.map(category => (
                  <option key={category.name} value={category.name} />
                ))}
              </datalist>
              {categoryIsPending && (
                <p className="mt-1 text-[11px] text-amber-600">
                  New category — "{categoryTrimmed}" is saved with your product and pending review before it joins the category list.
                </p>
              )}
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-primary mb-1.5">
                Brand <span className="text-text-secondary font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={newBrand}
                onChange={e => setNewBrand(e.target.value)}
                placeholder="e.g. Samsung"
                className="input-field w-full !rounded-xl !px-3 !py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-primary mb-1.5">
                Condition <span className="text-text-secondary font-normal">(optional)</span>
              </label>
              <select value={newCondition} onChange={e => setNewCondition(e.target.value)} className="input-field w-full !rounded-xl !px-3 !py-2 text-sm">
                <option value="">Not stated</option>
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-primary mb-1.5">Availability</label>
              <select
                value={newAvailability}
                onChange={e => setNewAvailability(e.target.value)}
                className="input-field w-full !rounded-xl !px-3 !py-2 text-sm"
              >
                <option value="in_stock">In stock</option>
                <option value="available_on_order">Available on order</option>
                <option value="out_of_stock">Out of stock</option>
                <option value="availability_unknown">Not sure</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-primary mb-1.5">
                Stock <span className="text-text-secondary font-normal">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={newStock}
                onChange={e => setNewStock(e.target.value)}
                placeholder="e.g. 12"
                className="input-field w-full !rounded-xl !px-3 !py-2 text-sm"
              />
            </div>
          </div>

          <ItemImageField imageUrl={newImageUrl} onSet={setNewImageUrl} inputId="new-item-image" />

          {missingFields.length > 0 && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              Still needed before this is useful to buyers: {missingFields.join(', ')}.
            </p>
          )}
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
          {notice && <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{notice}</p>}
          <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold disabled:opacity-60">
            {saving ? 'Saving…' : 'Publish product'}
          </button>
        </form>
      </div>

      {/* Item list */}
      <div className="rounded-3xl border border-gray-300/70 bg-white p-4 shadow-card sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-text-primary">Your items <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-[10.5px] font-bold text-text-secondary tabular-nums">{items.length}</span></h3>
          <span className="text-[10.5px] font-semibold text-text-secondary tabular-nums">{activeCount} visible to buyers</span>
        </div>
        {loading ? (
          <p className="text-sm text-text-secondary">Loading items…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-surface/60 px-4 py-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-whatsapp-600 shadow-sm">
              <PackageOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-bold text-text-primary">Your shelf is empty</p>
            <p className="max-w-xs text-[11.5px] leading-relaxed text-text-secondary">Add your first item above, or drop in a photo and let AI fill the details.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-3 transition-colors sm:px-4 ${item.is_active ? 'border-gray-200 bg-white hover:border-whatsapp-300' : 'border-dashed border-gray-300 bg-surface/60'}`}>
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
                        className="input-field w-40 !rounded-xl !px-2.5 !py-2 text-sm"
                        placeholder="Item name"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        className="input-field w-24 !rounded-xl !px-2.5 !py-2 text-sm"
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

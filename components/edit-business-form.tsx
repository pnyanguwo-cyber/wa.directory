'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Business } from '@/types'
import { categories as staticCategories } from '@/data/categories'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import SearchSelect from '@/components/search-select'
import MultiSearchSelect from '@/components/multi-search-select'

const cityOptions = [
  { value: '*', label: 'Whole country' },
  ...zimbabweCities.map(c => ({ value: c.name, label: c.name })),
]

type LogoMode = 'url' | 'upload'
type FeatureRequest = { type: 'category' | 'area'; name: string; city?: string }

export default function EditBusinessForm({
  business,
  categoryOptions,
  approvedAreas,
  pendingFeatureNames,
}: {
  business: Business
  categoryOptions: { value: string; label: string }[]
  approvedAreas: { city: string; name: string }[]
  pendingFeatureNames: { type: string; name: string; city?: string }[]
}) {
  const [form, setForm] = useState({
    name: business.name,
    phone: business.phone,
    country_code: business.country_code || '+263',
    whatsapp_username: business.whatsapp_username || '',
    bio: business.bio || '',
    city: business.city || '',
    price_range: business.price_range || '',
    catalog_link: business.catalog_link || '',
    logo_url: business.logo_url || '',
    website: (business as { website?: string }).website || '',
  })
  const [categories, setCategories] = useState<string[]>(business.category || [])
  const [areas, setAreas] = useState<string[]>(business.areas?.length ? business.areas : (business.area ? [business.area] : []))
  const [requests, setRequests] = useState<FeatureRequest[]>(
    pendingFeatureNames.map(p => ({ type: p.type as 'category' | 'area', name: p.name, city: p.city }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [logoMode, setLogoMode] = useState<LogoMode>(business.logo_url ? 'url' : 'upload')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const selectedCity = zimbabweCities.find(c => c.name === form.city)

  const allCategoryOptions = (() => {
    const merged = new Map<string, string>()
    for (const c of staticCategories) merged.set(c.name, c.icon)
    for (const c of categoryOptions) merged.set(c.value, c.label.replace(/^\S+\s/, ''))
    const list: { value: string; label: string }[] = []
    merged.forEach((icon, name) => {
      list.push({ value: name, label: `${icon} ${name}` })
    })
    return list.sort((a, b) => a.label.localeCompare(b.label))
  })()

  const areaOptions = form.city && form.city !== '*'
    ? [
        ...(selectedCity?.areas || []).map(a => ({ value: a, label: a })),
        ...approvedAreas
          .filter(a => a.city === form.city)
          .filter(a => !(selectedCity?.areas || []).some(s => s.toLowerCase() === a.name.toLowerCase()))
          .map(a => ({ value: a.name, label: a.name })),
      ]
    : []

  const pendingAreaNames = requests.filter(r => r.type === 'area').map(r => r.name)
  const pendingCategoryNames = requests.filter(r => r.type === 'category').map(r => r.name)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large (max 2MB)')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handleRequestCategory(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    if (allCategoryOptions.some(o => o.value.toLowerCase() === trimmed.toLowerCase())) return
    if (categories.includes(trimmed)) return
    setCategories(c => [...c, trimmed])
    setRequests(r => [...r, { type: 'category', name: trimmed }])
  }

  function handleRequestArea(name: string) {
    const trimmed = name.trim()
    if (!trimmed || !form.city || form.city === '*') return
    if (areaOptions.some(o => o.value.toLowerCase() === trimmed.toLowerCase())) return
    if (areas.includes(trimmed)) return
    setAreas(a => [...a, trimmed])
    setRequests(r => [...r, { type: 'area', name: trimmed, city: form.city }])
  }

  async function handleSave() {
    if (!form.name.trim() || !form.whatsapp_username.trim() || !form.phone.trim()) {
      setError('Name, WhatsApp username, and phone are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      let logoUrl = form.logo_url.trim()

      if (logoFile) {
        const uploadForm = new FormData()
        uploadForm.append('file', logoFile)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm })
        if (!uploadRes.ok) throw new Error('Logo upload failed')
        const { url } = await uploadRes.json()
        logoUrl = url
      }

      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edit_token: business.edit_token,
          name: form.name.trim(),
          whatsapp_username: form.whatsapp_username.trim(),
          phone: form.phone,
          country_code: form.country_code,
          bio: form.bio,
          category: categories,
          city: form.city === '*' ? '' : form.city,
          area: form.city === '*' ? '' : (areas[0] || ''),
          areas: form.city === '*' ? [] : areas,
          price_range: form.price_range,
          catalog_link: form.catalog_link,
          logo_url: logoUrl,
          website: form.website.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')

      for (const r of requests) {
        fetch('/api/feature-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: r.type, name: r.name, city: r.city || '', business_id: business.id }),
        }).catch(() => {})
      }

      setSaved(true)
      setTimeout(() => router.push(`/business/${business.slug || business.id}`), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 animate-slide-up">
        <div className="bg-whatsapp-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-whatsapp-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M7 12.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">Saved!</h2>
        <p className="text-text-secondary">Redirecting to your listing...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Edit Your Business</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Business Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="input-field"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Phone Number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^0-9]/g, '') }))}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Business Username on WhatsApp</label>
          <input
            type="text"
            value={form.whatsapp_username}
            onChange={e => setForm(f => ({ ...f, whatsapp_username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
            placeholder="e.g. johnsplumbing"
            className="input-field"
          />
          {form.whatsapp_username && (
            <p className="text-xs text-whatsapp-600 mt-1">@{form.whatsapp_username}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Categories <span className="text-text-secondary font-normal">pick all that apply</span>
          </label>
          <MultiSearchSelect
            options={allCategoryOptions}
            values={categories}
            onChange={setCategories}
            pending={pendingCategoryNames}
            onRequestName={handleRequestCategory}
            placeholder="Select categories"
          />
          <p className="text-xs text-whatsapp-600 mt-1">Can't find yours? Type it and press Enter to request it.</p>
          {pendingCategoryNames.length > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Requested: {pendingCategoryNames.join(', ')} (pending admin approval)
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Bio</label>
          <textarea
            value={form.bio}
            onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            rows={4}
            className="input-field resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SearchSelect
            options={cityOptions}
            value={form.city}
            onChange={v => setForm(f => ({ ...f, city: v }))}
            placeholder="Select city"
            label="Town/city your business is based in"
          />
          {form.city && form.city !== '*' ? (
            <div>
              <MultiSearchSelect
                options={areaOptions}
                values={areas}
                onChange={setAreas}
                primary
                pending={pendingAreaNames}
                onRequestName={handleRequestArea}
                placeholder="Select areas"
                label="Areas you cover"
                hint={
                  areas.length === 0
                    ? undefined
                    : areas.length === 1
                      ? 'Your primary location is marked orange. Customers will see it highlighted.'
                      : 'First area (orange) is your primary location. Add more if you cover them.'
                }
              />
            </div>
          ) : (
            <div />
          )}
        </div>
        {form.city === '*' && (
          <p className="text-xs text-whatsapp-600 -mt-2">You serve the whole country</p>
        )}

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Average Price <span className="text-text-secondary font-normal">(optional)</span></label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary font-medium text-sm pointer-events-none">
              $
            </span>
            <input
              type="text"
              value={form.price_range}
              onChange={e => setForm(f => ({ ...f, price_range: e.target.value }))}
              placeholder="10 - 50"
              className="input-field pl-8"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">WhatsApp Catalog Link <span className="text-text-secondary font-normal">(optional)</span></label>
          <input
            type="url"
            value={form.catalog_link}
            onChange={e => setForm(f => ({ ...f, catalog_link: e.target.value }))}
            placeholder="https://wa.me/c/..."
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Website <span className="text-text-secondary font-normal">(optional)</span></label>
          <input
            type="url"
            value={form.website}
            onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            placeholder="https://yourwebsite.com"
            className="input-field"
          />
          <p className="text-xs text-whatsapp-600 mt-1">Your website or online store link</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Logo</label>
          <div className="flex gap-1 mb-3 bg-surface rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setLogoMode('url'); setLogoFile(null); setLogoPreview('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                logoMode === 'url' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => setLogoMode('upload')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                logoMode === 'upload' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Upload
            </button>
          </div>
          {logoMode === 'url' ? (
            <div>
              <input
                type="url"
                value={form.logo_url}
                onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.jpg"
                className="input-field"
              />
              <p className="text-xs text-whatsapp-600 mt-1">Square image works best</p>
              {form.logo_url && (
                <div className="mt-2 animate-fade-in">
                  <img src={form.logo_url} alt="preview" className="w-12 h-12 rounded-xl object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
            </div>
          ) : (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 text-center hover:border-whatsapp-500 hover:bg-whatsapp-50 transition-all duration-150 active:scale-[0.98]"
              >
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={logoPreview} alt="logo preview" className="w-16 h-16 rounded-full object-cover" />
                    <span className="text-xs text-text-secondary">{logoFile?.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-text-secondary">Click to upload logo</span>
                    <span className="text-xs text-text-secondary">PNG, JPG or WebP max 2MB</span>
                  </div>
                )}
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger animate-fade-in">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full py-3 text-[16px]"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  )
}

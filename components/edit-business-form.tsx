'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Business } from '@/types'
import { categories } from '@/data/categories'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import SearchSelect from '@/components/search-select'

const categoryOptions = categories.map(c => ({
  value: c.name,
  label: `${c.icon} ${c.name}`,
}))

const cityOptions = [
  { value: '*', label: 'Whole country' },
  ...zimbabweCities.map(c => ({ value: c.name, label: c.name })),
]

export default function EditBusinessForm({ business }: { business: Business }) {
  const [form, setForm] = useState({
    name: business.name,
    phone: business.phone,
    country_code: business.country_code || '+263',
    whatsapp_username: business.whatsapp_username || '',
    category: business.category[0] || '',
    bio: business.bio || '',
    city: business.city || '',
    area: business.area || '',
    price_range: business.price_range || '',
    catalog_link: business.catalog_link || '',
    logo_url: business.logo_url || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const selectedCity = zimbabweCities.find(c => c.name === form.city)
  const areaOptions = form.city && form.city !== '*'
    ? [{ value: '', label: 'All areas' }, ...(selectedCity?.areas || []).map(a => ({ value: a, label: a }))]
    : []

  async function handleSave() {
    if (!form.name.trim() || !form.whatsapp_username.trim() || !form.phone.trim()) {
      setError('Name, WhatsApp username, and phone are required')
      return
    }
    setSaving(true)
    setError('')
    try {
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
          category: form.category,
          city: form.city === '*' ? '' : form.city,
          area: form.city === '*' ? '' : form.area,
          price_range: form.price_range,
          catalog_link: form.catalog_link,
          logo_url: form.logo_url,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
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
          <label className="block text-sm font-medium text-text-primary mb-1.5">Category</label>
          <SearchSelect
            options={categoryOptions}
            value={form.category}
            onChange={v => setForm(f => ({ ...f, category: v }))}
            placeholder="Select category"
          />
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

        <div className="grid grid-cols-2 gap-3">
          <SearchSelect
            options={cityOptions}
            value={form.city}
            onChange={v => setForm(f => ({ ...f, city: v, area: v === '*' ? '' : f.area }))}
            placeholder="Select city"
            label="Select the town/city you are based in"
          />
          {form.city && form.city !== '*' && (
            <SearchSelect
              options={areaOptions}
              value={form.area}
              onChange={v => setForm(f => ({ ...f, area: v }))}
              placeholder="Area"
              label="Area"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Average Price <span className="text-text-secondary font-normal">(optional)</span></label>
          <input
            type="text"
            value={form.price_range}
            onChange={e => setForm(f => ({ ...f, price_range: e.target.value }))}
            placeholder="e.g. $10 - $50"
            className="input-field"
          />
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
          <label className="block text-sm font-medium text-text-primary mb-1.5">Logo URL <span className="text-text-secondary font-normal">(optional)</span></label>
          <input
            type="url"
            value={form.logo_url}
            onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
            placeholder="https://example.com/logo.jpg"
            className="input-field"
          />
          {form.logo_url && (
            <div className="mt-2 animate-fade-in">
              <img src={form.logo_url} alt="preview" className="w-12 h-12 rounded-xl object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
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

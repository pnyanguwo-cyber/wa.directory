'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getClient } from '@/lib/supabase-client'
import { countryCodes, validatePhone } from '@/data/countries'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import { categories, matchCategory } from '@/data/categories'
import SearchSelect from '@/components/search-select'

const WA_MSG = 'Hi%2C%20I%20found%20you%20on%20WA%20Directory'

const countryOptions = countryCodes.map(c => ({
  value: c.code,
  label: `${c.flag} ${c.code} ${c.country}`,
}))

const categoryOptions = categories.map(c => ({
  value: c.name,
  label: `${c.icon} ${c.name}`,
}))

const cityOptions = [
  { value: '*', label: 'Whole country' },
  ...zimbabweCities.map(c => ({ value: c.name, label: c.name })),
]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

type LogoMode = 'url' | 'upload'

export default function ListBusinessForm() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [editToken, setEditToken] = useState('')
  const [logoMode, setLogoMode] = useState<LogoMode>('url')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: '',
    countryCode: '+263',
    phone: '',
    category: '',
    description: '',
    bio: '',
    city: '',
    area: '',
    catalog_link: '',
    logo_url: '',
    price_range: '',
  })
  const router = useRouter()

  const selectedCountry = countryCodes.find(c => c.code === form.countryCode)
  const phoneError = form.phone ? validatePhone(form.countryCode, form.phone) : null
  const selectedCity = zimbabweCities.find(c => c.name === form.city)
  const areaOptions = form.city && form.city !== '*'
    ? [{ value: '', label: 'All areas' }, ...(selectedCity?.areas || []).map(a => ({ value: a, label: a }))]
    : []
  const hasLocation = form.city === '*' || !!form.city || !!form.area
  const isValidStep1 = form.name.trim() && form.phone.trim() && !phoneError
  const isValidStep2 = form.description.trim() && !!form.category && hasLocation

  async function handleGenerateBio() {
    if (!form.description.trim()) return
    setBioLoading(true)
    try {
      const res = await fetch('/api/generate-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: form.description }),
      })
      const data = await res.json()
      if (data.bio) setForm(f => ({ ...f, bio: data.bio }))
    } catch {
    } finally {
      setBioLoading(false)
    }
  }

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

  async function handleSubmit() {
    setLoading(true)
    try {
      let logoUrl = form.logo_url.trim()

      if (logoFile) {
        const uploadForm = new FormData()
        uploadForm.append('file', logoFile)
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm })
        if (!uploadRes.ok) throw new Error('Upload failed')
        const { url } = await uploadRes.json()
        logoUrl = url
      }

      const slug = generateSlug(form.name)
      const fullPhone = (form.countryCode + form.phone).replace(/[^0-9]/g, '')
      const whatsappLink = `https://wa.me/${fullPhone}?text=${WA_MSG}`
      const location = form.city === '*'
        ? 'Zimbabwe'
        : [form.area, form.city, 'Zimbabwe'].filter(Boolean).join(', ')

      const token = crypto.randomUUID()

      const { data, error } = await getClient()
        .from('businesses')
        .insert({
          name: form.name.trim(),
          slug,
          bio: form.bio || `Professional ${form.description} services.`,
          category: [form.category],
          location,
          country_code: form.countryCode,
          city: form.city === '*' ? '' : form.city,
          area: form.city === '*' ? '' : form.area,
          phone: fullPhone,
          whatsapp_link: whatsappLink,
          catalog_link: form.catalog_link.trim() || null,
          logo_url: logoUrl || null,
          price_range: form.price_range.trim() || null,
          edit_token: token,
          verified: false,
          rating: 0,
          review_count: 0,
        })
        .select()
        .single()

      if (error) throw error
      setEditToken(token)
      setSubmittedId(data.slug || data.id)
    } catch (err) {
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submittedId) {
    return (
      <div className="max-w-lg mx-auto text-center py-8 animate-slide-up">
        <div className="bg-whatsapp-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 relative">
          <svg className="w-10 h-10 text-whatsapp-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="11" className="animate-pulse" />
            <path
              d="M7 12.5l3 3 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="checkmark-path"
              style={{ strokeDasharray: 20, strokeDashoffset: 20, animation: 'check-draw 400ms 200ms ease-out forwards' }}
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-1">You&apos;re Live!</h2>
        <p className="text-text-secondary mb-2">{form.name} is now on WA Directory.</p>
        <p className="text-sm text-text-secondary mb-6">Customers can find you instantly on WhatsApp.</p>
        <div className="bg-whatsapp-50 border border-whatsapp-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-whatsapp-800 mb-1">Save this link to edit your listing later:</p>
          <p className="text-sm text-whatsapp-700 break-all font-mono bg-white rounded-lg p-2 border border-whatsapp-100 select-all">
            {typeof window !== 'undefined' ? `${window.location.origin}/edit?token=${editToken}` : ''}
          </p>
          <p className="text-xs text-text-secondary mt-2">If you lose this link, contact us to get a new one.</p>
        </div>
        <div className="flex flex-col gap-3">
          <Link href={`/`} className="btn-primary py-3 text-[16px]">
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Cancel
      </Link>

      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center">
            {s > 1 && (
              <div className={`h-1 w-8 sm:w-12 transition-colors duration-300 ${step >= s ? 'bg-whatsapp-500' : 'bg-gray-200'}`} />
            )}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                step >= s ? 'bg-whatsapp-500 text-white scale-100' : 'bg-gray-200 text-gray-500 scale-90'
              }`}
            >
              {s}
            </div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Business Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. John's Plumbing"
              className="input-field"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <div className="w-40 shrink-0">
              <SearchSelect
                options={countryOptions}
                value={form.countryCode}
                onChange={v => setForm(f => ({ ...f, countryCode: v }))}
                placeholder="+263"
                label="Country Code"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-primary mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^0-9]/g, '') }))}
                placeholder={selectedCountry ? `e.g. 71 234 5678` : 'Phone number'}
                className="input-field"
              />
              {phoneError && (
                <p className="text-xs text-danger mt-1 animate-fade-in">{phoneError}</p>
              )}
              {!phoneError && form.phone && selectedCountry && (
                <p className="text-xs text-text-secondary mt-1">
                  {selectedCountry.flag} {selectedCountry.country}: {selectedCountry.prefix || '___'}XXX XXX ({selectedCountry.length} digits)
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => router.push('/')} className="btn-secondary flex-1 py-3 text-[16px]">
              Cancel
            </button>
            <button onClick={() => setStep(2)} disabled={!isValidStep1} className="btn-primary flex-1 py-3 text-[16px]">
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Category <span className="text-text-secondary font-normal">type what you sell</span>
            </label>
            <SearchSelect
              options={categoryOptions}
              value={form.category}
              onChange={v => setForm(f => ({ ...f, category: v }))}
              placeholder="e.g. cakes, food, magetsi..."
            />
            {form.category && (
              <p className="text-xs text-whatsapp-600 mt-1">
                {categories.find(c => c.name === form.category)?.icon} Selected: {form.category}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">What do you sell?</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe your business, products, or services..."
              rows={3}
              className="input-field resize-none"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SearchSelect
              options={cityOptions}
              value={form.city}
              onChange={v => setForm(f => ({ ...f, city: v, area: v === '*' ? '' : f.area }))}
              placeholder="Select city"
              label="City"
            />
            {form.city && form.city !== '*' && (
              <SearchSelect
                options={areaOptions}
                value={form.area}
                onChange={v => setForm(f => ({ ...f, area: v }))}
                placeholder="Select area"
                label="Area"
              />
            )}
          </div>
          {!hasLocation && (
            <p className="text-xs text-danger">Select a city or area</p>
          )}
          <button
            onClick={handleGenerateBio}
            disabled={!isValidStep2 || bioLoading}
            className="w-full border-2 border-whatsapp-500 text-whatsapp-600 py-2.5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-whatsapp-50 hover:scale-[1.02] active:scale-[0.95] active:brightness-90 transition-all duration-150"
          >
            {bioLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-whatsapp-500 border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              'Generate AI Bio'
            )}
          </button>
          {form.bio && (
            <div className="bg-whatsapp-50 border border-whatsapp-200 rounded-xl p-4 animate-slide-up">
              <p className="text-sm text-text-primary">{form.bio}</p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setForm(f => ({ ...f, description: f.bio, bio: '' }))}
                  className="flex-1 bg-whatsapp-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-whatsapp-600 active:scale-[0.95] transition-all"
                >
                  Update
                </button>
                <button
                  onClick={handleGenerateBio}
                  disabled={bioLoading}
                  className="flex-1 border border-whatsapp-500 text-whatsapp-600 py-2 rounded-lg text-sm font-medium hover:bg-whatsapp-50 active:scale-[0.95] transition-all"
                >
                  {bioLoading ? (
                    <span className="flex items-center justify-center gap-1">
                      <div className="w-3 h-3 border-2 border-whatsapp-500 border-t-transparent rounded-full animate-spin" />
                      ...
                    </span>
                  ) : 'Retry'}
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, bio: '' }))}
                  className="px-3 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-3 text-[16px]">
              Back
            </button>
            <button onClick={() => setStep(3)} disabled={!isValidStep2} className="btn-primary flex-1 py-3 text-[16px]">
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Logo</label>
            <div className="flex gap-1 mb-3 bg-surface rounded-xl p-1">
              <button
                onClick={() => { setLogoMode('url'); setLogoFile(null); setLogoPreview('') }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  logoMode === 'url' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                URL
              </button>
              <button
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
                {form.logo_url && (
                  <div className="mt-2 flex items-center gap-2 animate-fade-in">
                    <img src={form.logo_url} alt="logo preview" className="w-10 h-10 rounded-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <span className="text-xs text-text-secondary">Preview</span>
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
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              WhatsApp Catalog Link <span className="text-text-secondary">(optional)</span>
            </label>
            <input
              type="url"
              value={form.catalog_link}
              onChange={e => setForm(f => ({ ...f, catalog_link: e.target.value }))}
              placeholder="https://wa.me/c/..."
              className="input-field"
            />
            <details className="mt-1 group">
              <summary className="text-xs text-whatsapp-600 cursor-pointer hover:underline list-none flex items-center gap-1">
                <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                How to get your WhatsApp catalog link
              </summary>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Open <strong>WhatsApp Business</strong> Settings Business Tools Catalog Share Copy Link
              </p>
            </details>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Average Price <span className="text-text-secondary">(optional)</span>
            </label>
            <input
              type="text"
              value={form.price_range}
              onChange={e => setForm(f => ({ ...f, price_range: e.target.value }))}
              placeholder="e.g. $10 - $50"
              className="input-field"
            />
          </div>
          <div className="bg-surface border border-gray-200 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-text-primary mb-2">Preview</h3>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Name:</span> {form.name}
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Category:</span>{' '}
              {form.category ? `${categories.find(c => c.name === form.category)?.icon || ''} ${form.category}` : 'Not set'}
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Phone:</span> {form.countryCode} {form.phone}
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Location:</span>{' '}
              {form.city === '*' ? 'Zimbabwe' : [form.area, form.city, 'Zimbabwe'].filter(Boolean).join(', ')}
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Price:</span> {form.price_range || 'Not set'}
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Bio:</span>{' '}
              {form.bio || `Professional ${form.description} services.`}
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-3 text-[16px]">
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex-1 py-3 text-[16px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Go Live'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

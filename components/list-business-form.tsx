'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { countryCodes, validatePhone } from '@/data/countries'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import { categories as staticCategories } from '@/data/categories'
import SearchSelect from '@/components/search-select'
import MultiSearchSelect from '@/components/multi-search-select'
import QrCard from '@/components/qr-card'
import RequestConfirmModal from '@/components/request-confirm-modal'

interface ApprovedCategory { name: string; icon: string; hint?: string }
interface ApprovedArea { city: string; name: string }
interface ApprovedCity { name: string }

const countryOptions = countryCodes.map(c => ({
  value: c.code,
  label: `${c.flag} ${c.code} ${c.country}`,
}))

type LogoMode = 'url' | 'upload'
type FeatureRequest = { type: 'category' | 'area' | 'city'; name: string; city?: string }

export default function ListBusinessForm({
  categoryOptions,
  approvedAreas,
  approvedCities,
}: {
  categoryOptions: { value: string; label: string }[]
  approvedAreas: ApprovedArea[]
  approvedCities: ApprovedCity[]
}) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [editToken, setEditToken] = useState('')
  const [logoMode, setLogoMode] = useState<LogoMode>('url')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const areaInputRef = useRef<HTMLInputElement>(null)
  const logoUrlRef = useRef<HTMLInputElement>(null)
  const catalogRef = useRef<HTMLInputElement>(null)
  const websiteRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: '',
    countryCode: '+263',
    phone: '',
    whatsapp_username: '',
    description: '',
    bio: '',
    city: '',
    catalog_link: '',
    logo_url: '',
    price_range: '',
    website: '',
    password: '',
    address: '',
    show_location: true,
    isRemote: false,
  })
  const [categories, setCategories] = useState<string[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [errors, setErrors] = useState<{ password?: string; logo?: string; submit?: string }>({})
  const [requestModal, setRequestModal] = useState<{ open: boolean; type: 'city' | 'area' | 'category'; name: string }>({ open: false, type: 'category', name: '' })
  const [pendingCities, setPendingCities] = useState<string[]>([])
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  const selectedCountry = countryCodes.find(c => c.code === form.countryCode)
  const phoneError = form.phone ? validatePhone(form.countryCode, form.phone) : null
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

  const categoryHints = (() => {
    const hints = new Map<string, string>()
    for (const c of staticCategories) {
      if (c.hint) hints.set(c.name, c.hint)
    }
    return hints
  })()

  const allCityOptions = (() => {
    const merged = new Map<string, string>()
    for (const c of approvedCities) merged.set(c.name.toLowerCase(), c.name)
    for (const c of zimbabweCities) {
      if (!merged.has(c.name.toLowerCase())) merged.set(c.name.toLowerCase(), c.name)
    }
    for (const name of pendingCities) {
      if (!merged.has(name.toLowerCase())) merged.set(name.toLowerCase(), name)
    }
    const list: { value: string; label: string }[] = []
    merged.forEach((name) => list.push({ value: name, label: name }))
    return list.sort((a, b) => a.label.localeCompare(b.label))
  })()

  const cityOptions = [
    { value: '*', label: 'Whole country' },
    ...allCityOptions,
  ]

  const areaOptions = form.city && form.city !== '*'
    ? [
        ...(selectedCity?.areas || []).map(a => ({ value: a, label: a })),
        ...approvedAreas
          .filter(a => a.city === form.city)
          .filter(a => !(selectedCity?.areas || []).some(s => s.toLowerCase() === a.name.toLowerCase()))
          .map(a => ({ value: a.name, label: a.name })),
      ]
    : []

  const hasLocation = form.isRemote || form.city === '*' || !!form.city || areas.length > 0
  const isValidStep1 = form.name.trim() && form.whatsapp_username.trim() && form.phone.trim() && !phoneError
  const isValidStep2 = form.description.trim() && categories.length > 0 && hasLocation

const pendingAreaNames = requests.filter(r => r.type === 'area').map(r => r.name)
const pendingCategoryNames = requests.filter(r => r.type === 'category').map(r => r.name)

async function fetchWithTimeout(url: string, init: RequestInit, ms = 30000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

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
      else setErrors(prev => ({ ...prev, submit: 'Could not generate a bio. Please try again.' }))
    } catch {
      setErrors(prev => ({ ...prev, submit: 'Failed to generate bio. Check your connection and try again.' }))
    } finally {
      setBioLoading(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'File too large (max 2MB)' }))
      return
    }
    setErrors(prev => ({ ...prev, logo: undefined }))
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function submitFeatureRequests(businessId: string) {
    for (const r of requests) {
      fetch('/api/feature-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: r.type, name: r.name, city: r.city || '', business_id: businessId }),
      }).catch(() => {})
    }
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

  function handleRequestConfirm() {
    if (requestModal.type === 'city') {
      setPendingCities(c => [...c, requestModal.name])
      setRequests(r => [...r, { type: 'city', name: requestModal.name }])
      setForm(f => ({ ...f, city: requestModal.name }))
    } else if (requestModal.type === 'area') {
      handleRequestArea(requestModal.name)
    } else if (requestModal.type === 'category') {
      handleRequestCategory(requestModal.name)
    }
    setRequestModal({ open: false, type: 'category', name: '' })
  }

  async function handleSubmit() {
    if (form.password && form.password.length < 6) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 6 characters, or leave it blank to set one later.' }))
      setStep(3)
      passwordRef.current?.focus()
      return
    }
    if (form.password && form.password !== confirmPassword) {
      setErrors(prev => ({ ...prev, password: 'Passwords do not match.' }))
      setStep(3)
      return
    }
    setErrors(prev => ({ ...prev, submit: undefined }))
    setLoading(true)
    try {
      let logoUrl = form.logo_url.trim()

      if (logoFile) {
        const uploadForm = new FormData()
        uploadForm.append('file', logoFile)
        const uploadRes = await fetchWithTimeout('/api/upload', { method: 'POST', body: uploadForm })
        if (!uploadRes.ok) throw new Error('Upload failed. Please try a smaller image.')
        const { url } = await uploadRes.json()
        logoUrl = url
      }

      // Listing creation happens server-side (validated + service role).
      const fullPhone = (form.countryCode + form.phone).replace(/[^0-9]/g, '')
      const hasPendingCity = pendingCities.includes(form.city)
      let createRes: Response
      try {
        createRes = await fetchWithTimeout('/api/businesses/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            countryCode: form.countryCode,
            phone: form.phone,
            whatsapp_username: form.whatsapp_username.trim(),
            description: form.description,
            bio: form.bio,
            categories,
            city: form.city,
            pending_city: hasPendingCity,
            areas,
            catalog_link: form.catalog_link.trim(),
            logo_url: logoUrl,
            price_range: form.price_range,
            website: form.website.trim(),
            address: form.address.trim(),
            show_location: form.show_location,
          }),
        })
      } catch (fetchErr) {
        if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
          throw new Error('Request timed out. Please check your connection and try again.')
        }
        throw new Error('Could not reach the server. Please check your connection and try again.')
      }
      if (!createRes.ok) {
        const payload = await createRes.json().catch(() => null)
        throw new Error(payload?.error || 'Could not create your listing. Please try again.')
      }
      const created = await createRes.json() as { id: string; slug: string; edit_token: string }

      setEditToken(created.edit_token)
      setSubmittedId(created.slug || created.id)
      submitFeatureRequests(created.id)
      if (form.password && form.password.length >= 6) {
        fetch('/api/account/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ edit_token: created.edit_token, phone: fullPhone, password: form.password }),
        }).catch(() => {})
      }
      fetch('/api/admin/notify-new-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business: { name: form.name, category: categories.join(', '), city: form.city, phone: fullPhone, id: created.id } }),
      }).catch(() => {})
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ||
        (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setErrors(prev => ({ ...prev, submit: msg }))
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
        <h2 className="text-2xl font-bold text-text-primary mb-1">Submitted for Approval!</h2>
        <p className="text-text-secondary mb-2">{form.name} is pending approval.</p>
        <p className="text-sm text-text-secondary mb-6">Once approved, customers will find you on WA Directory.</p>
        {requests.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">Your requests are in review:</p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {requests.map(r => r.type === 'city' ? `"${r.name}" (city)` : `"${r.name}"`).join(', ')} will appear once an admin approves {requests.length > 1 ? 'them' : 'it'}.
            </p>
          </div>
        )}
        <div className="bg-whatsapp-50 dark:bg-whatsapp-950/40 border border-whatsapp-200 dark:border-whatsapp-800/50 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-whatsapp-800 dark:text-whatsapp-300 mb-1">Save this link to edit your listing later:</p>
          <p className="text-sm text-whatsapp-700 dark:text-whatsapp-300 break-all font-mono bg-white dark:bg-gray-900 rounded-lg p-2 border border-whatsapp-100 dark:border-whatsapp-900 select-all">
            {typeof window !== 'undefined' ? `${window.location.origin}/edit?token=${editToken}` : ''}
          </p>
          <p className="text-xs text-text-secondary mt-2">If you lose this link, contact us to get a new one.</p>
        </div>
        <div className="flex flex-col items-center mb-6">
          <QrCard
            value={typeof window !== 'undefined' ? `${window.location.origin}/edit?token=${editToken}` : ''}
            title="Scan to save your edit link"
            subtitle="Screenshot or print this to keep access to your listing"
            downloadName={`${form.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-edit-link.png`}
          />
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-card mb-6">
          <p className="text-sm font-bold text-text-primary mb-1">Your QR codes (once approved)</p>
          <p className="text-xs text-text-secondary mb-4">
            Print these and place them on your counter, shelves and packaging — customers scan to chat with you directly.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <QrCard
              value={typeof window !== 'undefined' ? `${window.location.origin}/qr/${submittedId}` : ''}
              title="Customer chat QR"
              subtitle="Opens WhatsApp chat with you — tracked"
              size={130}
              downloadName={`${submittedId}-customer-chat-qr.png`}
            />
            <QrCard
              value={typeof window !== 'undefined' ? `${window.location.origin}/portal` : ''}
              title="Portal QR"
              subtitle="Opens your private portal"
              size={130}
              downloadName={`${submittedId}-portal-qr.png`}
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Link href={`/`} className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white rounded-full py-3 text-[16px] font-medium shadow-sm hover:from-whatsapp-600 hover:to-whatsapp-700 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
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
              <div className={`h-1 w-8 sm:w-12 transition-colors duration-300 ${step >= s ? 'bg-whatsapp-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                step >= s ? 'bg-whatsapp-500 text-white scale-100' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 scale-90'
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
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); usernameRef.current?.focus() } }}
              placeholder="e.g. John's Plumbing"
              className="input-field"
              autoFocus
            />
            <p className="text-xs text-whatsapp-600 mt-1">This is what customers will search for</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Business Username on WhatsApp</label>
            <input
              ref={usernameRef}
              type="text"
              value={form.whatsapp_username}
              onChange={e => setForm(f => ({ ...f, whatsapp_username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); phoneRef.current?.focus() } }}
              placeholder="e.g. johnsplumbing"
              className="input-field"
            />
            <p className="text-xs text-whatsapp-600 mt-1">Your business username on WhatsApp (no spaces)</p>
            {form.whatsapp_username && (
              <p className="text-xs text-whatsapp-600 mt-1">@{form.whatsapp_username}</p>
            )}
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
                ref={phoneRef}
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^0-9]/g, '') }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (isValidStep1) setStep(2) } }}
                placeholder={selectedCountry ? `e.g. 71 234 5678` : 'Phone number'}
                className="input-field"
              />
              <p className="text-xs text-whatsapp-600 mt-1">Customers will chat with this number</p>
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
              Categories <span className="text-text-secondary font-normal">pick all that apply</span>
            </label>
            <MultiSearchSelect
              options={allCategoryOptions}
              values={categories}
              onChange={setCategories}
              pending={pendingCategoryNames}
              onRequestName={(name) => setRequestModal({ open: true, type: 'category', name })}
              onEnterNext={() => descriptionRef.current?.focus()}
              placeholder="e.g. cakes, food, magetsi..."
            />
            <p className="text-xs text-whatsapp-600 mt-1">Start typing to search (e.g. plumber, salon). Can't find yours? Type it and press Enter to request it.</p>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {categories.map(c => {
                  const cat = allCategoryOptions.find(o => o.value === c)
                  const hint = categoryHints.get(c)
                  return hint ? (
                    <span key={c} className="text-xs text-text-secondary bg-surface dark:bg-gray-800 rounded-lg px-2 py-1">
                      {cat?.label.split(' ')[0]} {hint}
                    </span>
                  ) : null
                })}
              </div>
            )}
            {pendingCategoryNames.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Requested: {pendingCategoryNames.join(', ')} (pending admin approval)
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">What do you sell?</label>
            <textarea
              ref={descriptionRef}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe your business, products, or services..."
              rows={3}
              className="input-field resize-none"
              autoFocus
            />
            <p className="text-xs text-whatsapp-600 mt-1">What you sell, your services, and your prices</p>
          </div>
          <button
            onClick={handleGenerateBio}
            disabled={!form.description.trim() || bioLoading}
            className="w-full border-2 border-whatsapp-500 text-whatsapp-600 py-2.5 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-whatsapp-50 dark:hover:bg-whatsapp-950/30 hover:scale-[1.02] active:scale-[0.95] active:brightness-90 transition-all duration-150"
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
            <div className="bg-whatsapp-50 dark:bg-whatsapp-950/40 border border-whatsapp-200 dark:border-whatsapp-800/50 rounded-xl p-4 animate-slide-up">
              <p className="text-sm text-text-primary">{form.bio}</p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setForm(f => ({ ...f, description: f.bio, bio: '' }))}
                  className="flex-1 bg-whatsapp-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-whatsapp-600 active:scale-[0.95] transition-all"
                >
                  Use This Bio
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
          <p className="text-xs text-text-secondary">Type what you sell above, then click to generate a professional bio.</p>
          <div className="bg-surface dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">I work remotely (no physical location)</p>
              <p className="text-xs text-text-secondary">Skip city/area selection - serve clients online</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newRemote = !form.isRemote
                setForm(f => ({ ...f, isRemote: newRemote, city: newRemote ? 'remote' : '' }))
                if (newRemote) setAreas([])
              }}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.isRemote ? 'bg-whatsapp-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              role="switch"
              aria-checked={form.isRemote}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.isRemote ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SearchSelect
              options={cityOptions}
              value={form.city}
              onChange={v => setForm(f => ({ ...f, city: v }))}
              onEnterNext={() => (form.city && form.city !== '*' ? areaInputRef.current?.focus() : isValidStep2 ? setStep(3) : undefined)}
              placeholder={form.isRemote ? 'Remote - no location needed' : 'Select city'}
              label="Town/city your business is based in"
              onRequestName={(name) => setRequestModal({ open: true, type: 'city', name })}
            />
            {form.city && form.city !== '*' ? (
              <div>
              <MultiSearchSelect
                options={areaOptions}
                values={areas}
                onChange={setAreas}
                primary
                pending={pendingAreaNames}
                onRequestName={(name) => setRequestModal({ open: true, type: 'area', name })}
                onEnterNext={() => (isValidStep2 ? setStep(3) : undefined)}
                inputRef={areaInputRef}
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
          {!hasLocation && (
            <p className="text-xs text-danger">Select a city or area</p>
          )}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Street Address <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="e.g. 123 Samora Machel Ave, Harare"
              className="input-field"
            />
            <p className="text-xs text-whatsapp-600 mt-1">Adding your address lets customers get directions on Google Maps</p>
          </div>
          <div className="flex items-center justify-between bg-surface dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200/60 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-text-primary">Show my address on my profile</p>
              <p className="text-xs text-text-secondary">Customers can see your location and get directions</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, show_location: !f.show_location }))}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.show_location ? 'bg-whatsapp-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              role="switch"
              aria-checked={form.show_location}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${form.show_location ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(1)} className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white rounded-full flex-1 py-3 text-[16px] font-medium shadow-sm hover:from-whatsapp-600 hover:to-whatsapp-700 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
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
            <div className="flex gap-1 mb-3 bg-surface dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => { setLogoMode('url'); setLogoFile(null); setLogoPreview(''); setErrors(prev => ({ ...prev, logo: undefined })) }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  logoMode === 'url' ? 'bg-white dark:bg-gray-700 shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                URL
              </button>
              <button
                onClick={() => setLogoMode('upload')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  logoMode === 'upload' ? 'bg-white dark:bg-gray-700 shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Upload
              </button>
            </div>
            {logoMode === 'url' ? (
              <div>
                <input
                  ref={logoUrlRef}
                  type="url"
                  value={form.logo_url}
                  onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); catalogRef.current?.focus() } }}
                  placeholder="https://example.com/logo.jpg"
                  className="input-field"
                />
                <p className="text-xs text-whatsapp-600 mt-1">Square image works best (max 2MB)</p>
                {form.logo_url && (
                  <div className="mt-2 flex items-center gap-2 animate-fade-in">
                    <img src={form.logo_url} alt="logo preview" width={40} height={40} className="w-10 h-10 rounded-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
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
                  className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl py-6 text-center hover:border-whatsapp-500 hover:bg-whatsapp-50 dark:hover:bg-whatsapp-950/30 transition-all duration-150 active:scale-[0.98]"
                >
                  {logoPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={logoPreview} alt="logo preview" width={64} height={64} className="w-16 h-16 rounded-full object-cover" />
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
            {errors.logo && (
              <p className="text-xs text-danger mt-2 flex items-center gap-1 animate-fade-in">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                {errors.logo}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              WhatsApp Catalog Link <span className="text-text-secondary">(optional)</span>
            </label>
            <input
              ref={catalogRef}
              type="url"
              value={form.catalog_link}
              onChange={e => setForm(f => ({ ...f, catalog_link: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); websiteRef.current?.focus() } }}
              placeholder="https://wa.me/c/..."
              className="input-field"
            />
            <p className="text-xs text-whatsapp-600 mt-1">Customers can browse your full WhatsApp catalog</p>
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
              Website <span className="text-text-secondary">(optional)</span>
            </label>
            <input
              ref={websiteRef}
              type="url"
              value={form.website}
              onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); priceRef.current?.focus() } }}
              placeholder="https://yourwebsite.com"
              className="input-field"
            />
            <p className="text-xs text-whatsapp-600 mt-1">Your website or online store link</p>
          </div>
          <div>
            <label htmlFor="field-password" className="block text-sm font-medium text-text-primary mb-1.5">
              Portal Password <span className="text-text-secondary">(optional)</span>
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                id="field-password"
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                value={form.password}
                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })) }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-confirm-password')?.focus() } }}
                placeholder="Create a password for your portal account"
                className="input-field pr-10"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'field-password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
            </div>
            {errors.password ? (
              <p id="field-password-error" className="text-xs text-danger mt-1 flex items-center gap-1 animate-fade-in">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                {errors.password}
              </p>
            ) : (
              <p className="text-xs text-whatsapp-600 mt-1">
                Set a password now to unlock your statistics portal, or do it later from your edit link.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="field-confirm-password" className="block text-sm font-medium text-text-primary mb-1.5">
              Confirm Password <span className="text-text-secondary">(optional)</span>
            </label>
            <div className="relative">
              <input
                id="field-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                minLength={6}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })) }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); priceRef.current?.focus() } }}
                placeholder="Re-enter your password"
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>
            </div>
            {confirmPassword && form.password && form.password !== confirmPassword && (
              <p className="text-xs text-danger mt-1">Passwords do not match</p>
            )}
            {confirmPassword && form.password && form.password === confirmPassword && (
              <p className="text-xs text-whatsapp-600 mt-1">Passwords match</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Average Price <span className="text-text-secondary">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary font-medium text-sm pointer-events-none">
                $
              </span>
              <input
                ref={priceRef}
                type="text"
                value={form.price_range}
                onChange={e => setForm(f => ({ ...f, price_range: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!loading) handleSubmit() } }}
                placeholder="10 - 50"
                className="input-field pl-8"
              />
            </div>
            <p className="text-xs text-whatsapp-600 mt-1">Average price customers should expect</p>
          </div>
          <div className="bg-surface dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-text-primary mb-2">Preview</h3>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Name:</span> {form.name}
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">WhatsApp Username:</span> @{form.whatsapp_username}
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Categories:</span>{' '}
              {categories.length > 0
                ? categories.map(c => `${allCategoryOptions.find(o => o.value === c)?.label.split(' ')[0] || '📋'} ${c}`).join(', ')
                : 'Not set'}
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Phone:</span> {form.countryCode} {form.phone}
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Location:</span>{' '}
              {form.city === '*' ? 'Zimbabwe' : [areas.join(', '), form.city, 'Zimbabwe'].filter(Boolean).join(', ')}
            </p>
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Price:</span> {form.price_range ? (form.price_range.startsWith('$') ? form.price_range : `$${form.price_range}`) : 'Not set'}
            </p>
            {form.website && (
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">Website:</span> {form.website}
              </p>
            )}
            <p className="text-sm text-text-secondary">
              <span className="font-medium text-text-primary">Bio:</span>{' '}
              {form.bio || `Professional ${form.description} services.`}
            </p>
          </div>
          {errors.submit && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-2.5 flex items-center gap-2 animate-fade-in">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              {errors.submit}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={() => setStep(2)} className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white rounded-full flex-1 py-3 text-[16px] font-medium shadow-sm hover:from-whatsapp-600 hover:to-whatsapp-700 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
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

      <RequestConfirmModal
        open={requestModal.open}
        name={requestModal.name}
        type={requestModal.type}
        onConfirm={handleRequestConfirm}
        onCancel={() => setRequestModal({ open: false, type: 'category', name: '' })}
      />
    </div>
  )
}

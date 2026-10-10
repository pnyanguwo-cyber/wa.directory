'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PLAN_CONFIG } from '@/types'
import type { PlanType } from '@/types'
import { countryCodes, validatePhone } from '@/data/countries'
import { zimbabweCities } from '@/data/zimbabwe-locations'
import { categories as staticCategories } from '@/data/categories'
import SearchSelect from '@/components/search-select'
import MultiSearchSelect from '@/components/multi-search-select'
import QrCard from '@/components/qr-card'
import RequestConfirmModal from '@/components/request-confirm-modal'
import { PasswordStrengthMeter, validatePassword } from '@/components/password-strength'
import { Smartphone, PhoneCall } from 'lucide-react'
import { toFullPhone, normalizeVoicePhone } from '@/lib/phone'
import { normalizeUsername } from '@/lib/username'

interface ApprovedCategory { name: string; icon: string; hint?: string }
interface ApprovedArea { city: string; name: string }
interface ApprovedCity { name: string }

const countryOptions = countryCodes.map(c => ({
  value: c.code,
  label: `${c.flag} ${c.code} ${c.country}`,
}))

// Yellow Pages (special) submissions get a priority alert sent server-side
// from /api/businesses/create — skip the generic notification to avoid doubles.
const SPECIAL_CATEGORIES = new Set(
  staticCategories.filter(c => c.special).map(c => c.name)
)

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
  const [businessId, setBusinessId] = useState('')
  const [submittedUsername, setSubmittedUsername] = useState('')
  const [isPaidListings, setIsPaidListings] = useState(false)
  // Going-live splash: EcoCash number entry on the success screen.
  // Post-submit payment flow: package selection → phone entry → feedback.
  const [splashStage, setSplashStage] = useState<'entry' | 'done'>('entry')
  const [splashPhone, setSplashPhone] = useState('')
  const [splashLoading, setSplashLoading] = useState(false)
  const [splashError, setSplashError] = useState('')
  const [payPlan, setPayPlan] = useState<'1m' | '6m' | '12m'>('1m')
  // Post-submit payment flow: package selection → phone entry.
  const [payStage, setPayStage] = useState<'packages' | 'phone'>('packages')
  // Feedback modal states: 'verified' (simulated success) or 'pending' (awaiting admin).
  const [payResult, setPayResult] = useState<'none' | 'verified' | 'pending'>('none')
  const [simulating, setSimulating] = useState(false)
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
    username: '',
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
    isPhysical: true,
    isRemote: false,
  })
  const [categories, setCategories] = useState<string[]>([])
  const [areas, setAreas] = useState<string[]>([])
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [errors, setErrors] = useState<{ password?: string; logo?: string; submit?: string; username?: string }>({})
  const [requestModal, setRequestModal] = useState<{ open: boolean; type: 'city' | 'area' | 'category'; name: string }>({ open: false, type: 'category', name: '' })
  const [pendingCities, setPendingCities] = useState<string[]>([])
  const [confirmPassword, setConfirmPassword] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [usernameSuggestion, setUsernameSuggestion] = useState('')
  // Phone type is an optional choice: WhatsApp mobile (default), landline or
  // hotline (voice), or BOTH. Only a voice-only listing stores the number in
  // national format with a Call button; when both are chosen the mobile
  // number stays the WhatsApp contact and the landline is saved separately.
  const [phoneWhatsapp, setPhoneWhatsapp] = useState(true)
  const [phoneVoice, setPhoneVoice] = useState(false)
  const [voicePhone, setVoicePhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [addressStatus, setAddressStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [addressResult, setAddressResult] = useState<{ formatted_address: string; lat?: number; lng?: number } | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [addressRequestSent, setAddressRequestSent] = useState(false)
  const router = useRouter()

  const selectedCountry = countryCodes.find(c => c.code === form.countryCode)
  const rawPhoneDigits = form.phone.replace(/\D/g, '')
  const isHotline = rawPhoneDigits.length > 0 && rawPhoneDigits.length <= 5
  const phoneError = !form.phone
    ? null
    : isHotline && !phoneVoice
      ? 'Short hotline numbers (999, 393…) can\u2019t be a WhatsApp number. Also select “Landline or hotline” below.'
      : phoneWhatsapp
        ? validatePhone(form.countryCode, form.phone)
        : rawPhoneDigits.length >= 6
          ? null
          : 'Enter a valid phone number'
  const selectedCity = zimbabweCities.find(c => c.name === form.city)
  const isWholeCountry = form.city === '*'

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

  // "Whole country" covers nationwide businesses: no sub-location needed,
  // and the server treats '*' as a remote/nationwide listing.
  const cityOptions = [
    { value: '*', label: '🌍 Whole country (nationwide)' },
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

  const needsPhysical = form.isPhysical && !form.isRemote && !isWholeCountry
  const hasPhysical = !!form.city || areas.length > 0
  const hasLocation = form.isRemote || hasPhysical
  const locationMissing = (!form.isPhysical && !form.isRemote) || (needsPhysical && !hasPhysical)
  const isValidStep1 = !!(form.name.trim() && form.whatsapp_username.trim() && form.phone.trim() && !phoneError)
  const isValidStep2 = !!(form.description.trim() && categories.length > 0 && !locationMissing)
  const passwordError = !form.password
    ? 'Create a portal password. It unlocks your statistics portal.'
    : validatePassword(form.password)
  const isValidStep3 = !passwordError && form.password === confirmPassword

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

  async function handleValidateAddress() {
    const addr = form.address.trim()
    if (!addr) {
      setAddressStatus('idle')
      setAddressResult(null)
      return
    }
    setAddressStatus('checking')
    try {
      const res = await fetch('/api/validate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      })
      const data = await res.json().catch(() => null)
      // Graceful fallback: no API key / server error → skip silently.
      if (!res.ok || data?.error) {
        setAddressStatus('idle')
        setAddressResult(null)
        return
      }
      if (data?.valid) {
        setAddressStatus('valid')
        setAddressResult({ formatted_address: data.formatted_address, lat: data.lat, lng: data.lng })
      } else {
        setAddressStatus('invalid')
        setAddressResult(null)
      }
    } catch {
      setAddressStatus('idle')
      setAddressResult(null)
    }
  }

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setAddressStatus('invalid')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        try {
          const res = await fetch('/api/validate-address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng }),
          })
          const data = await res.json().catch(() => null)
          if (data?.valid) {
            setForm(f => ({ ...f, address: data.formatted_address }))
            setAddressStatus('valid')
            setAddressResult({ formatted_address: data.formatted_address, lat, lng })
          } else {
            setForm(f => ({ ...f, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }))
            setAddressStatus('valid')
            setAddressResult({ formatted_address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng })
          }
        } catch {
          setForm(f => ({ ...f, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }))
          setAddressStatus('valid')
          setAddressResult({ formatted_address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng })
        }
        setGeoLoading(false)
      },
      () => {
        setGeoLoading(false)
        setAddressStatus('invalid')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  async function handleRequestAddressVerification() {
    setAddressRequestSent(true)
    try {
      await fetch('/api/address-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: form.address.trim(),
          business_name: form.name || undefined,
        }),
      })
    } catch {
      // Silent fail - request still submitted visually
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

  const checkUsername = useCallback(async (value: string) => {
    const normalized = normalizeUsername(value)
    if (normalized.length < 3) {
      setUsernameStatus('idle')
      setUsernameSuggestion('')
      return
    }
    setUsernameStatus('checking')
    try {
      const res = await fetch(`/api/username/check?username=${encodeURIComponent(normalized)}`)
      const data = await res.json()
      if (data.available) {
        setUsernameStatus('available')
        setUsernameSuggestion('')
      } else {
        setUsernameStatus('taken')
        setUsernameSuggestion(data.suggestion || '')
      }
    } catch {
      setUsernameStatus('idle')
    }
  }, [])

  async function handleSubmit() {
    // Portal password is mandatory — it is what unlocks the business portal.
    const pwError = !form.password
      ? 'Create a portal password. It unlocks your statistics portal.'
      : validatePassword(form.password)
    if (pwError) {
      setErrors(prev => ({ ...prev, password: pwError }))
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
      // Accepts 077…, 26377… etc. — normalized to full international digits.
      // Voice-only listings store the landline/hotline as the main number;
      // WhatsApp(+voice) listings keep the mobile as the main number.
      const voiceOnly = !phoneWhatsapp && phoneVoice
      const fullPhone = voiceOnly
        ? normalizeVoicePhone(form.phone)
        : toFullPhone(form.countryCode, form.phone)
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
            username: form.username.trim() || undefined,
            description: form.description,
            bio: form.bio,
            categories,
            city: form.isPhysical ? form.city : '',
            pending_city: hasPendingCity,
            // Remote-only businesses may pick the cities they serve — they
            // travel in the same `areas` field.
            areas,
            voice_phone: phoneVoice && phoneWhatsapp ? normalizeVoicePhone(voicePhone) : null,
            catalog_link: form.catalog_link.trim(),
            logo_url: logoUrl,
            price_range: form.price_range,
            website: form.website.trim(),
            address: form.address.trim(),
            lat: addressStatus === 'valid' ? (addressResult?.lat ?? null) : null,
            lng: addressStatus === 'valid' ? (addressResult?.lng ?? null) : null,
            address_verified: addressStatus === 'valid',
            show_location: form.show_location,
            is_remote: form.isRemote,
            phone_type: voiceOnly ? 'voice' : 'whatsapp',
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
      const created = await createRes.json() as { id: string; slug: string; edit_token: string; business_id: string; username: string; payment_status: string }

      setBusinessId(created.business_id || '')
      setSubmittedUsername(created.username || '')
      setIsPaidListings(created.payment_status !== 'active')
      setEditToken(created.edit_token)
      setSubmittedId(created.slug || created.id)
      submitFeatureRequests(created.id)
      fetch('/api/account/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edit_token: created.edit_token, phone: fullPhone, password: form.password }),
      }).catch(() => {})
      if (!categories.some(c => SPECIAL_CATEGORIES.has(c))) {
        fetch('/api/admin/notify-new-business', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business: { name: form.name, category: categories.join(', '), city: form.isPhysical ? form.city : '', phone: fullPhone, id: created.id } }),
        }).catch(() => {})
      }
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
        {isPaidListings ? (
          <>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Listing Created!</h2>
            <p className="text-text-secondary mb-1">{form.name} is ready, but needs payment to go live.</p>
            <p className="text-xs text-text-secondary mb-4">Business ID: <span className="font-mono font-bold">{businessId}</span></p>
            <p className="text-xs text-text-secondary mb-1">Username: <span className="font-bold">@{submittedUsername}</span></p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-text-primary mb-1">Submitted for Approval!</h2>
            <p className="text-text-secondary mb-2">{form.name} is pending approval.</p>
            <p className="text-sm text-text-secondary mb-6">Once approved, customers will find you on WA Directory.</p>
          </>
        )}

        {isPaidListings && splashStage === 'entry' && payResult === 'none' && (
          <div className="bg-white border border-amber-200 rounded-3xl p-4 sm:p-6 mb-6 text-left shadow-xl relative overflow-hidden animate-fade-in">
            {/* Splash card header */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <div>
                <p className="text-base font-extrabold text-text-primary leading-tight">Choose a package to go live</p>
                <p className="text-xs text-text-secondary">Your listing shows in search once payment is confirmed · {form.name}</p>
              </div>
            </div>

            {/** Step 1: package picker */}
            {payStage === 'packages' && (
              <div className="space-y-2.5">
                {(Object.keys(PLAN_CONFIG) as PlanType[]).map(key => {
                  const p = PLAN_CONFIG[key]
                  const selected = payPlan === key
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setPayPlan(key)}
                      aria-pressed={selected}
                      className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                        selected ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-gray-200 bg-white hover:border-amber-300'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selected ? 'border-amber-500' : 'border-gray-300'}`}>
                          {selected && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-text-primary">{p.label}</span>
                          <span className="block text-[11px] text-text-secondary">USD ${p.perMonth.toFixed(2)}/mo equivalent</span>
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block text-base font-extrabold text-text-primary">${p.price.toFixed(0)}</span>
                        {key !== '1m' && <span className="text-[10px] text-whatsapp-700 font-semibold">save ${((PLAN_CONFIG['1m'].price * p.months - p.price)).toFixed(0)}</span>}
                      </span>
                    </button>
                  )})
                }
                <button
                  type="button"
                  onClick={() => {
                    if (!splashPhone.trim()) return
                    setPayStage('phone')
                  }}
                  className="w-full py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600 transition-all mt-3"
                >
                  Continue with {PLAN_CONFIG[payPlan].label} — ${PLAN_CONFIG[payPlan].price.toFixed(0)}
                </button>
              </div>
            )}

            {/** Step 2: EcoCash phone entry */}
            {payStage === 'phone' && (
              <form
                onSubmit={async e => {
                  e.preventDefault()
                  if (!businessId) return
                  setSplashLoading(true)
                  setSplashError('')
                  try {
                    const res = await fetch('/api/pay', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        business_id: businessId,
                        payer_phone: splashPhone.trim(),
                        plan: payPlan,
                      }),
                    })
                    const data = await res.json()
                    if (!res.ok) {
                      setSplashError(data.error || 'Could not submit your payment')
                      return
                    }
                    setPayResult('pending')
                  } catch {
                    setSplashError('Could not submit your payment. Please try again.')
                  } finally {
                    setSplashLoading(false)
                  }
                }}
                className="space-y-3"
              >
                <button type="button" onClick={() => setPayStage('packages')} className="text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1">
                  ← Change package ({PLAN_CONFIG[payPlan].label}, ${PLAN_CONFIG[payPlan].price.toFixed(0)})
                </button>
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1">Your EcoCash number</label>
                  <p className="text-xs text-text-secondary mb-2">
                    Enter the number paying from. Admin will verify the transaction from this number.
                  </p>
                  <input
                    type="tel"
                    value={splashPhone}
                    onChange={e => { setSplashPhone(e.target.value.replace(/[^0-9+ ]/g, '')); setSplashError('') }}
                    placeholder="e.g. 0771234567"
                    className="input-field"
                    autoFocus
                    required
                  />
                </div>
                {splashError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{splashError}</p>
                )}
                <button type="submit" disabled={splashLoading} className="w-full py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-60">
                  {splashLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting…
                    </span>
                  ) : `Pay $${PLAN_CONFIG[payPlan].price.toFixed(0)} & Go Live`}
                </button>
              </form>
            )}

            {/** Simulate payment (dev only) — activates the listing without a real
                gateway transaction, exactly like admin confirmation would. */}
            {process.env.NODE_ENV !== 'production' && (
            <button
              type="button"
              disabled={simulating}
              onClick={async () => {
                if (!businessId) return
                setSimulating(true)
                try {
                  const res = await fetch('/api/pay/simulate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ business_id: businessId, plan: payPlan }),
                  })
                  const data = await res.json()
                  if (!res.ok) {
                    setSplashError(data.error || 'Simulation failed')
                    return
                  }
                  setPayResult('verified')
                } catch {
                  setSplashError('Simulation failed. Please try again.')
                } finally {
                  setSimulating(false)
                }
              }}
              className="w-full py-2.5 mt-2 rounded-2xl text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-60"
            >
              {simulating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  Simulating payment…
                </span>
              ) : '⚙ Simulate payment (dev only)'}
            </button>
            )}

            <p className="text-[11px] text-text-secondary mt-4 text-center">
              Anyone can pay for you. They just need your Business ID <span className="font-mono font-bold">{businessId}</span> at <span className="font-mono">/pay</span>
            </p>
          </div>
        )}

        {/** Payment feedback modal */}
        {payResult !== 'none' && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 py-4 sm:py-8 bg-black/40 backdrop-blur-sm animate-fade-in overflow-y-auto"
          >
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm w-full p-5 sm:p-6 space-y-4 animate-slide-up my-auto border border-white text-center">
              {payResult === 'verified' ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-whatsapp-100 flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-whatsapp-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-extrabold text-text-primary">Payment verified ✓</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Your {PLAN_CONFIG[payPlan].label} package (${PLAN_CONFIG[payPlan].price.toFixed(0)}) was successfully applied to <strong>{form.name || 'your listing'}</strong>. Your listing is now live and visible in search.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPayResult('none')}
                    className="w-full py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white shadow-md hover:from-whatsapp-600 hover:to-whatsapp-700 transition-all"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-amber-600 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-extrabold text-text-primary">Payment not verified yet</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Your request for <strong>{PLAN_CONFIG[payPlan].label}</strong> (${PLAN_CONFIG[payPlan].price.toFixed(0)}) is being processed. We&apos;ll confirm on {splashPhone ? `+${splashPhone.replace(/D/g, '')}` : 'your EcoCash number'} within <strong className="text-text-primary">15 minutes</strong> — your listing goes live once confirmed.
                  </p>
                  {process.env.NODE_ENV !== 'production' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!businessId || simulating) return
                      setSimulating(true)
                      try {
                        const res = await fetch('/api/pay/simulate', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ business_id: businessId, plan: payPlan }),
                        })
                        const data = await res.json()
                        if (!res.ok) {
                          setSplashError(data.error || 'Simulation failed')
                          return
                        }
                        setPayResult('verified')
                      } catch {
                        setSplashError('Simulation failed. Please try again.')
                      } finally {
                        setSimulating(false)
                      }
                    }}
                    disabled={simulating}
                    className="w-full py-2.5 rounded-2xl text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-60"
                  >
                    {simulating ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        Simulating payment…
                      </span>
                    ) : '⚙ Simulate payment (dev only)'}
                  </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPayResult('none')}
                    className="w-full py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600 transition-all"
                  >
                    Ok, waiting
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {requests.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-amber-800 mb-1">Your requests are in review:</p>
            <p className="text-sm text-amber-800">
              {requests.map(r => r.type === 'city' ? `"${r.name}" (city)` : `"${r.name}"`).join(', ')} will appear once an admin approves {requests.length > 1 ? 'them' : 'it'}.
            </p>
          </div>
        )}
        <div className="bg-whatsapp-50 border border-whatsapp-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-whatsapp-800 mb-1">Save this link to edit your listing later:</p>
          <p className="text-sm text-whatsapp-700 break-all font-mono bg-white rounded-lg p-2 border border-whatsapp-100 select-all">
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
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card mb-6">
          <p className="text-sm font-bold text-text-primary mb-1">Your QR codes (once {isPaidListings ? 'paid and ' : ''}approved)</p>
          <p className="text-xs text-text-secondary mb-4">
            Print these and place them on your counter, shelves and packaging: customers scan to chat with you directly.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <QrCard
              value={typeof window !== 'undefined' ? `${window.location.origin}/qr/${submittedId}` : ''}
              title="Customer chat QR"
              subtitle="Opens WhatsApp chat with you (tracked)"
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
          {isPaidListings && (
            <Link href="/pay" className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full py-3 text-[16px] font-medium shadow-sm hover:from-amber-600 hover:to-amber-700 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              Payment options
            </Link>
          )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">Business Name</label>
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
              <label className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">
                WhatsApp Business Username <span className="text-text-secondary font-normal">(optional)</span>
              </label>
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
            </div>
          </div>
          <details className="group bg-surface/60 border border-gray-200/70 rounded-2xl px-4 py-3">
            <summary className="text-sm font-semibold text-text-primary cursor-pointer list-none flex items-center gap-1.5 select-none">
              <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90 text-whatsapp-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Directory Username <span className="text-text-secondary font-normal">(optional, your unique handle)</span>
            </summary>
            <div className="pt-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">@</span>
              <input
                type="text"
                value={form.username}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
                  setForm(f => ({ ...f, username: val }))
                  if (val.length >= 3) {
                    const timer = setTimeout(() => checkUsername(val), 500)
                    return () => clearTimeout(timer)
                  } else {
                    setUsernameStatus('idle')
                    setUsernameSuggestion('')
                  }
                }}
                placeholder="e.g. johns_plumbing"
                className="input-field pl-7"
              />
            </div>
            <p className="text-xs text-whatsapp-600 mt-1">Your unique WA Directory handle (letters, numbers, underscores)</p>
            {usernameStatus === 'checking' && (
              <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-whatsapp-500 border-t-transparent rounded-full animate-spin" />
                Checking availability...
              </p>
            )}
            {usernameStatus === 'available' && form.username && (
              <p className="text-xs text-whatsapp-700 mt-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                @{form.username} is available!
              </p>
            )}
            {usernameStatus === 'taken' && (
              <div className="mt-1 space-y-1">
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
                  @{form.username} is already taken
                </p>
                {usernameSuggestion && (
                  <button
                    type="button"
                    onClick={() => { setForm(f => ({ ...f, username: usernameSuggestion })); setUsernameStatus('available'); setUsernameSuggestion('') }}
                    className="text-xs text-whatsapp-600 font-medium hover:underline"
                  >
                    Use @{usernameSuggestion} instead
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRequestModal({ open: true, type: 'category', name: form.username })}
                  className="text-xs text-amber-600 font-medium hover:underline block"
                >
                  Contest this name
                </button>
              </div>
            )}
            </div>
          </details>
          <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-3">
            <SearchSelect
              options={countryOptions}
              value={form.countryCode}
              onChange={v => setForm(f => ({ ...f, countryCode: v }))}
              placeholder="+263"
              label="Country Code"
            />
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">Phone Number</label>
              <input
                ref={phoneRef}
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^0-9]/g, '') }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (isValidStep1) setStep(2) } }}
                placeholder={selectedCountry ? `e.g. ${selectedCountry.prefix || ''}71 234 5678` : 'Phone number'}
                className="input-field"
              />
              {form.phone && !phoneError && selectedCountry && phoneWhatsapp && (
                <p className="text-[11px] text-whatsapp-700 mt-1">
                  Will be saved as +{toFullPhone(form.countryCode, form.phone)}
                </p>
              )}
              {form.phone && !phoneWhatsapp && (
                <p className="text-[11px] text-whatsapp-700 mt-1">
                  Will be saved exactly as entered: {normalizeVoicePhone(form.phone)} (customers see a Call button)
                </p>
              )}
              {/* How customers reach you: WhatsApp mobile, voice line, or both. */}
              <fieldset className="mt-3">
                <legend className="text-xs font-semibold text-text-primary mb-1.5">
                  How can customers use this number? <span className="text-text-secondary font-normal">select one or both</span>
                </legend>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={phoneWhatsapp}
                    onClick={() => setPhoneWhatsapp(v => !v)}
                    className={`flex items-center gap-2.5 text-left rounded-xl border-2 px-3 py-2.5 sm:flex-1 transition-all duration-150 ${
                      phoneWhatsapp
                        ? 'border-whatsapp-500 bg-whatsapp-50 shadow-sm active:scale-[0.98]'
                        : 'border-gray-200 bg-white text-text-secondary hover:border-whatsapp-200 active:scale-[0.98]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        phoneWhatsapp ? 'bg-whatsapp-500 border-whatsapp-500' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {phoneWhatsapp && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </span>
                    <Smartphone className={`w-4 h-4 shrink-0 ${phoneWhatsapp ? 'text-whatsapp-600' : 'text-text-secondary'}`} />
                    <span className="min-w-0">
                      <span className={`block text-xs font-bold ${phoneWhatsapp ? 'text-whatsapp-800' : 'text-text-primary'}`}>
                        WhatsApp mobile
                      </span>
                      <span className="block text-[11px] text-text-secondary leading-snug">
                        Customers tap to chat with you on WhatsApp
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={phoneVoice}
                    onClick={() => setPhoneVoice(v => !v)}
                    className={`flex items-center gap-2.5 text-left rounded-xl border-2 px-3 py-2.5 sm:flex-1 transition-all duration-150 ${
                      phoneVoice
                        ? 'border-whatsapp-600 bg-whatsapp-50 shadow-sm active:scale-[0.98]'
                        : 'border-gray-200 bg-white text-text-secondary hover:border-whatsapp-200 active:scale-[0.98]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        phoneVoice ? 'bg-whatsapp-600 border-whatsapp-600' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {phoneVoice && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </span>
                    <PhoneCall className={`w-4 h-4 shrink-0 ${phoneVoice ? 'text-whatsapp-700' : 'text-text-secondary'}`} />
                    <span className="min-w-0">
                      <span className={`block text-xs font-bold ${phoneVoice ? 'text-whatsapp-800' : 'text-text-primary'}`}>
                        Landline / hotline
                      </span>
                      <span className="block text-[11px] text-text-secondary leading-snug">
                        Customers tap to call. Voice only, no chat
                      </span>
                    </span>
                  </button>
                </div>
                {!phoneWhatsapp && !phoneVoice && (
                  <p className="text-xs text-danger mt-1.5">Select at least one option above.</p>
                )}
              </fieldset>
              {phoneVoice && phoneWhatsapp && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">Landline / hotline number <span className="text-text-secondary font-normal">(optional)</span></label>
                  <input
                    type="tel"
                    value={voicePhone}
                    onChange={e => setVoicePhone(e.target.value.replace(/[^0-9+ ]/g, ''))}
                    placeholder="e.g. 024 275 0000 or 999"
                    className="input-field"
                  />
                </div>
              )}
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
            <button onClick={() => setStep(2)} disabled={!isValidStep1 || (!phoneWhatsapp && !phoneVoice)} className="btn-primary flex-1 py-3 text-[16px]">
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">
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
                    <span key={c} className="text-xs text-text-secondary bg-surface rounded-lg px-2 py-1">
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
            <label className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">What do you sell?</label>
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
          <div className="bg-surface border border-gray-200/60 rounded-xl px-4 py-3 space-y-3">
            <div className="flex gap-3">
              <label className="flex-1 flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPhysical}
                  onChange={e => {
                    if (!e.target.checked && !form.isRemote) return
                    setForm(f => ({ ...f, isPhysical: e.target.checked }))
                  }}
                  className="w-4 h-4 accent-whatsapp-500"
                />
                <span>
                  <span className="block text-sm font-medium text-text-primary">Physical</span>
                  <span className="block text-xs text-text-secondary">I have a shop / office</span>
                </span>
              </label>
              <label className="flex-1 flex items-center gap-2.5 bg-white border border-gray-200 rounded-xl px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRemote}
                  onChange={e => {
                    if (!e.target.checked && !form.isPhysical) return
                    setForm(f => ({ ...f, isRemote: e.target.checked, ...(e.target.checked && !form.isPhysical ? { city: '', areas: [] } : {}) }))
                  }}
                  className="w-4 h-4 accent-whatsapp-500"
                />
                <span>
                  <span className="block text-sm font-medium text-text-primary">Remote</span>
                  <span className="block text-xs text-text-secondary">Serve whole country online</span>
                </span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SearchSelect
              options={cityOptions}
              value={form.city}
              onChange={v => {
                setForm(f => ({ ...f, city: v }))
                // Whole country = nationwide: no sub-location to pick.
                if (v === '*') setAreas([])
              }}
              onEnterNext={() => (form.city && !isWholeCountry ? areaInputRef.current?.focus() : isValidStep2 ? setStep(3) : undefined)}
              placeholder="Select city or Whole country"
              label="Town/city your business is based in"
              onRequestName={(name) => setRequestModal({ open: true, type: 'city', name })}
            />
            {form.city && !isWholeCountry ? (
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
          {isWholeCountry && (
            <p className="text-xs text-whatsapp-600 -mt-1">🌍 Whole country selected. No sub-location needed. Customers everywhere can find you.</p>
          )}
          {form.isRemote && !form.isPhysical && !isWholeCountry && (
            <div>
              <MultiSearchSelect
                options={allCityOptions}
                values={areas}
                onChange={setAreas}
                pending={pendingAreaNames}
                onEnterNext={() => (isValidStep2 ? setStep(3) : undefined)}
                placeholder="All of Zimbabwe (default)"
                label="Locations you serve (remote)"
                hint="Optional: pick the cities/areas you serve. Leave empty to cover all of Zimbabwe."
              />
              <p className="text-xs text-whatsapp-600 mt-1">You serve customers remotely. Pick the locations you cover.</p>
            </div>
          )}
          {form.isRemote && !form.isPhysical && isWholeCountry && (
            <p className="text-xs text-whatsapp-600 -mt-2">You serve the whole country online</p>
          )}
          {form.isRemote && form.isPhysical && form.city && (
            <p className="text-xs text-whatsapp-600 -mt-2">Based in {form.city}: serves the whole country</p>
          )}
          {locationMissing && (
            <p className="text-xs text-danger">Select at least one option above, and a city/area if you have a physical location.</p>
          )}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">
              Street Address <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                onBlur={() => handleValidateAddress()}
                placeholder="e.g. 123 Samora Machel Ave, Harare"
                className="input-field flex-1"
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={geoLoading}
                title="Use my current location"
                className={`shrink-0 h-11 px-3 rounded-xl border-2 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  geoLoading
                    ? 'border-whatsapp-200 bg-whatsapp-50 text-whatsapp-500 cursor-wait'
                    : 'border-gray-200 bg-white text-text-secondary hover:border-whatsapp-300 hover:text-whatsapp-600 active:scale-[0.97]'
                }`}
              >
                {geoLoading ? (
                  <span className="w-4 h-4 border-2 border-whatsapp-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                )}
                <span className="hidden sm:inline">{geoLoading ? 'Locating...' : 'Current'}</span>
              </button>
            </div>
            <p className="text-xs text-whatsapp-600 mt-1">Adding your address lets customers get directions on Google Maps</p>
            {addressStatus === 'checking' && (
              <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-whatsapp-500 border-t-transparent rounded-full animate-spin" />
                Checking address...
              </p>
            )}
            {addressStatus === 'valid' && addressResult && (
              <p className="text-xs text-whatsapp-700 mt-1 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="truncate">{addressResult.formatted_address}</span>
                {addressResult.lat != null && addressResult.lng != null && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${addressResult.lat},${addressResult.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline ml-1 shrink-0"
                  >
                    View on Maps
                  </a>
                )}
              </p>
            )}
            {addressStatus === 'invalid' && (
              <div className="mt-1.5 space-y-1.5">
                <p className="text-xs text-amber-600 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  Address not found on the map.
                </p>
                <div className="flex flex-wrap gap-2">
                  {!addressRequestSent ? (
                    <button
                      type="button"
                      onClick={handleRequestAddressVerification}
                      className="text-xs font-semibold text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 hover:bg-whatsapp-100 rounded-lg px-3 py-1.5 transition-all"
                    >
                      Request admin verification
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-whatsapp-600 bg-whatsapp-50 border border-whatsapp-200 rounded-lg px-3 py-1.5">
                      Request sent
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={geoLoading}
                    className="text-xs font-semibold text-text-secondary bg-white border border-gray-200 hover:border-whatsapp-300 hover:text-whatsapp-600 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
                  >
                    {geoLoading ? 'Locating...' : 'Use current location'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between bg-surface rounded-xl px-4 py-3 border border-gray-200/60">
            <div>
              <p className="text-sm font-medium text-text-primary">Show my address on my profile</p>
              <p className="text-xs text-text-secondary">Customers can see your location and get directions</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, show_location: !f.show_location }))}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.show_location ? 'bg-whatsapp-500' : 'bg-gray-300'}`}
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
          {/* Optional profile extras (logo, links, price) collapsed by default. */}
          <details className="group bg-surface/60 border border-gray-200/70 rounded-2xl px-4 py-3">
            <summary className="text-sm font-semibold text-text-primary cursor-pointer list-none flex items-center gap-1.5 select-none">
              <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90 text-whatsapp-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Logo &amp; links <span className="text-text-secondary font-normal">(optional)</span>
            </summary>
            <div className="pt-3 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">Logo</label>
            <div className="flex gap-1 mb-3 bg-surface rounded-xl p-1">
              <button
                onClick={() => { setLogoMode('url'); setLogoFile(null); setLogoPreview(''); setErrors(prev => ({ ...prev, logo: undefined })) }}
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
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 text-center hover:border-whatsapp-500 hover:bg-whatsapp-50 transition-all duration-150 active:scale-[0.98]"
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
            <label className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">
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
            <label className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">
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
            </div>
          </details>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="field-password" className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">
                Portal Password <span className="text-danger font-semibold">(required)</span>
              </label>
            <div className="relative">
              <input
                ref={passwordRef}
                id="field-password"
                type={showPassword ? 'text' : 'password'}
                minLength={8}
                required
                value={form.password}
                onChange={e => { setForm(f => ({ ...f, password: e.target.value })); if (errors.password) setErrors(prev => ({ ...prev, password: undefined })) }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('field-confirm-password')?.focus() } }}
                placeholder="Create a password for your portal account"
                className="input-field pr-10"
                aria-invalid={!!errors.password || !form.password}
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
                Unlocks your statistics portal. At least 8 characters with letters and numbers.
              </p>
            )}
            <PasswordStrengthMeter password={form.password} />
            </div>
            <div>
              <label htmlFor="field-confirm-password" className="block text-sm font-medium text-text-primary mb-1.5 min-h-[2.5rem]">
                Confirm Password <span className="text-danger font-semibold">(required)</span>
              </label>
            <div className="relative">
              <input
                id="field-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                minLength={8}
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
          </div>
          {passwordError && form.password !== confirmPassword && (
            <p className="text-xs text-danger">Check the password fields above before going live.</p>
          )}
          <details className="group bg-surface/60 border border-gray-200/70 rounded-2xl px-4 py-3">
            <summary className="text-sm font-semibold text-text-primary cursor-pointer list-none flex items-center gap-1.5 select-none">
              <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90 text-whatsapp-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Average Price <span className="text-text-secondary font-normal">(optional)</span>
            </summary>
            <div className="pt-3">
          <div>
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
            </div>
          </details>
          <div className="bg-surface border border-gray-200 rounded-xl p-4 space-y-2">
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
              {form.isRemote && !form.isPhysical
                ? 'Serves whole country (online)'
                : form.isRemote && form.isPhysical
                  ? `Based in ${form.city || 'N/A'}: serves whole country`
                  : [areas.join(', '), form.city, 'Zimbabwe'].filter(Boolean).join(', ')}
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
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2 animate-fade-in">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              {errors.submit}
            </p>
          )}
          {form.address.trim() && addressStatus !== 'valid' && addressStatus !== 'checking' && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              Your address hasn't been verified on the map yet. It may not appear correctly on the map. You can go back to fix it or submit anyway.
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
              disabled={loading || !isValidStep3}
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

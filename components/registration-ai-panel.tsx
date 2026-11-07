'use client'

import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, HelpCircle, Loader2, Sparkles, Upload, X } from 'lucide-react'

export interface RegistrationPrefillData {
  name: string
  description: string
  phone: string
  whatsapp_username: string
  website: string
  address: string
  city: string
  categories: string[]
  opening_hours: string
  offerings: string[]
  phone_is_whatsapp: boolean
}

interface ExtractedFieldShape {
  value: string
  confidence: number
  status: 'suggested' | 'missing'
  needs_confirmation: boolean
}

interface DuplicateShape {
  id: string
  name: string
  slug: string
  city: string
}

/**
 * Upload-first introduction to business registration.
 *
 * Uploading is recommended but never required: "Continue without an image" is
 * always visible, and every failure path leaves the manual form untouched.
 * Nothing here submits a listing — the owner still reviews and submits the
 * existing form, so verification and payment gates are unaffected.
 */
export default function RegistrationAIPanel({
  onApply,
}: {
  onApply: (prefill: RegistrationPrefillData) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(true)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fields, setFields] = useState<Record<string, ExtractedFieldShape> | null>(null)
  const [missing, setMissing] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateShape[]>([])
  const [applied, setApplied] = useState(false)

  function reset() {
    setFiles([])
    setPreviews((old) => {
      old.forEach((url) => URL.revokeObjectURL(url))
      return []
    })
    setFields(null)
    setMissing([])
    setWarnings([])
    setDuplicates([])
    setError('')
    setMessage('')
    setApplied(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleFiles(selected: File[]) {
    const valid = selected.filter((f) => f.size > 0).slice(0, 4)
    if (valid.length === 0) return
    for (const file of valid) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload PNG, JPEG or WebP images.')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        setError('Each image must be 2MB or smaller.')
        return
      }
    }

    setFiles(valid)
    setPreviews(valid.map((f) => URL.createObjectURL(f)))
    setLoading(true)
    setError('')
    setMessage('')
    setFields(null)
    setDuplicates([])
    setApplied(false)

    try {
      const fd = new FormData()
      for (const file of valid) fd.append('file', file)
      const res = await fetch('/api/registration/analyse', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'We could not read that image. You can still continue below.')
        return
      }

      if (!data.analysed) {
        setMessage(data.message || 'We could not read that image. Continue with the questions below.')
        return
      }

      setFields(data.fields || null)
      setMissing(data.missing_required_fields || [])
      setWarnings(data.warnings || [])
      setDuplicates(data.duplicates || [])
      setMessage('We pre-filled what we could read. Please check every value, then finish the form below.')

      if (data.prefill) {
        onApply(data.prefill as RegistrationPrefillData)
        setApplied(true)
      }
    } catch {
      setError('We could not read that image. Check your connection, or continue without an image.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <div className="rounded-2xl border border-whatsapp-200/70 bg-whatsapp-50/50 px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">Saving time? Upload a banner, flyer or business card and we will prefill the form.</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white border border-whatsapp-200 px-3 py-1.5 text-xs font-semibold text-whatsapp-800 hover:bg-whatsapp-50"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          Use a photo
        </button>
      </div>
    )
  }

  const fieldRows: Array<{ key: string; label: string }> = [
    { key: 'business_name', label: 'Business name' },
    { key: 'category', label: 'Category' },
    { key: 'phone', label: 'Phone' },
    { key: 'whatsapp', label: 'WhatsApp number' },
    { key: 'city', label: 'City' },
    { key: 'address', label: 'Address' },
    { key: 'description', label: 'Description' },
  ]

  return (
    <section className="rounded-2xl border border-whatsapp-200/70 bg-gradient-to-br from-whatsapp-50/80 to-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-whatsapp-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Let&apos;s get your business listed</h2>
            <p className="text-xs text-text-secondary mt-0.5 max-w-prose">
              We&apos;ll ask a few questions to create your profile. Have a business banner, promotional flyer,
              poster or business card? <span className="font-semibold text-text-primary">Upload it here</span> and our
              AI will fill in as much as it can, so you type less. You&apos;ll review everything before submitting.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide the upload panel"
          className="shrink-0 w-7 h-7 rounded-full text-text-secondary hover:bg-white/80 flex items-center justify-center"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-whatsapp-600 hover:bg-whatsapp-700 disabled:opacity-60 text-white px-4 py-2 text-sm font-semibold transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />}
          {loading ? 'Reading your image…' : files.length ? 'Replace image' : 'Upload business material'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          Continue without an image
        </button>
        <span className="text-[11px] text-text-secondary">PNG, JPEG or WebP · up to 4 images · 2MB each</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const selected = Array.from(e.target.files || [])
          void handleFiles(selected)
        }}
      />

      {previews.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {previews.map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`Uploaded business material ${index + 1}`}
              className="w-14 h-14 rounded-xl object-cover border border-gray-200 bg-white"
            />
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
      {message && !error && (
        <p className="mt-3 text-xs text-whatsapp-800 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-3 py-2">
          {message}
          {applied && <span className="font-semibold"> The form below has been updated.</span>}
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="mt-2 space-y-1">
          {warnings.map((warning, index) => (
            <li key={index} className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}

      {fields && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary mb-2">What we found</p>
          <ul className="space-y-1.5">
            {fieldRows.map(({ key, label }) => {
              const field = fields[key]
              if (!field) return null
              const isMissing = field.status === 'missing' || !field.value
              const needsCheck = !isMissing && (field.needs_confirmation || field.confidence < 0.85)
              return (
                <li key={key} className="flex items-start justify-between gap-3 text-xs">
                  <span className="text-text-secondary shrink-0">{label}</span>
                  <span className="flex items-center gap-1.5 text-right">
                    <span className={isMissing ? 'text-gray-400 italic' : 'text-text-primary font-medium truncate max-w-[220px]'}>
                      {isMissing ? 'Still needed' : field.value}
                    </span>
                    {isMissing ? (
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                    ) : needsCheck ? (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-whatsapp-600 shrink-0" aria-hidden="true" />
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          {missing.length > 0 && (
            <p className="mt-2 text-[11px] text-text-secondary">
              Still needed before submission: {missing.join(', ').replace(/_/g, ' ')}.
            </p>
          )}
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={reset} className="text-[11px] font-semibold text-text-secondary hover:text-text-primary">
              Discard image and start over
            </button>
          </div>
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-[11px] font-semibold text-amber-900">
            This may already be listed. Check before creating a duplicate:
          </p>
          <ul className="mt-1 space-y-0.5">
            {duplicates.map((duplicate) => (
              <li key={duplicate.id} className="text-[11px] text-amber-900">
                <a href={`/business/${duplicate.slug || duplicate.id}`} target="_blank" rel="noopener noreferrer" className="underline">
                  {duplicate.name}
                </a>
                {duplicate.city ? ` · ${duplicate.city}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

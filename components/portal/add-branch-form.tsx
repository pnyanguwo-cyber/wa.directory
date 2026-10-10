'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  orgName: string
  categoryOptions: { value: string; label: string }[]
  cityOptions: string[]
  // Org defaults pre-fill the form (HQ configures them in "Branch defaults").
  defaults: {
    defaultLogoUrl: string
    defaultCategories: string[]
    bioTemplate: string
  }
}

export default function AddBranchForm({ orgName, categoryOptions, cityOptions, defaults }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [name, setName] = useState('')
  const [branchLabel, setBranchLabel] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  // Categories start from the org's defaults; HQ can adjust per branch.
  const [category, setCategory] = useState<string[]>(defaults.defaultCategories)
  // Empty bio = server renders the org's bio template (or generic fallback).
  const [bio, setBio] = useState('')

  function reset() {
    setName('')
    setBranchLabel('')
    setPhone('')
    setCity('')
    setArea('')
    setCategory(defaults.defaultCategories)
    setBio('')
    setError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/portal/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          branch_label: branchLabel,
          phone,
          city,
          area,
          category,
          bio,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not create the branch.')
        return
      }
      setSuccess(`Branch created. An invite was sent to ${data.phone}. The manager sets their own password from that link.`)
      reset()
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  function toggleCategory(c: string) {
    setCategory(prev => (prev.includes(c) ? prev.filter(x => x !== c) : prev.length >= 4 ? prev : [...prev, c]))
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-10 px-4 rounded-2xl bg-whatsapp-500 hover:bg-whatsapp-600 text-white text-xs font-semibold shadow-md transition-colors"
      >
        + Add branch
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-4 py-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-up border border-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Add a branch</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              New listing under <b>{orgName}</b>. The branch manager gets a WhatsApp invite to set their own password — they will only ever see their branch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); reset(); setSuccess('') }}
            className="text-text-secondary hover:text-text-primary shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success && (
          <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5">{success}</p>
        )}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
        )}

        {(defaults.defaultLogoUrl || defaults.bioTemplate) && (
          <p className="text-[11px] text-text-secondary bg-surface/60 border border-gray-200/70 rounded-xl px-3 py-2">
            {defaults.defaultLogoUrl && 'Org logo will be applied. '}
            {defaults.bioTemplate && 'Bio comes from your template — leave the description empty to use it.'}
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Branch listing name</label>
            <input
              className="input-field"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={`${orgName} Chinhoyi`}
              required
              minLength={2}
              maxLength={80}
            />
            <p className="text-[11px] text-text-secondary mt-1">Usually the org name + location.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Short label</label>
              <input
                className="input-field"
                value={branchLabel}
                onChange={e => setBranchLabel(e.target.value)}
                placeholder="Chinhoyi"
                required
                maxLength={40}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">WhatsApp number</label>
              <input
                type="tel"
                className="input-field"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="077 123 4567"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">City / town</label>
              <input
                className="input-field"
                list="branch-city-options"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Chinhoyi"
                required
              />
              <datalist id="branch-city-options">
                {cityOptions.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Area / suburb <span className="text-text-secondary font-normal">(optional)</span></label>
              <input
                className="input-field"
                value={area}
                onChange={e => setArea(e.target.value)}
                placeholder="e.g. Magamba Way"
                maxLength={60}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Categories <span className="text-text-secondary font-normal text-xs">(1–4)</span></label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
              {categoryOptions.map(opt => {
                const value = opt.value
                const selected = category.includes(value)
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleCategory(value)}
                    className={`h-8 px-3 rounded-2xl text-[11px] font-semibold border transition-all ${
                      selected
                        ? 'bg-whatsapp-500 text-white border-whatsapp-500 shadow-sm'
                        : 'bg-white border-gray-200/80 text-text-secondary hover:bg-surface'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Description <span className="text-text-secondary font-normal">(optional)</span></label>
            <textarea
              className="input-field min-h-[70px]"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder={
                defaults.bioTemplate
                  ? defaults.bioTemplate.replaceAll('{branch}', branchLabel || 'this branch')
                  : `What does the ${branchLabel || 'branch'} offer?`
              }
              maxLength={600}
            />
            {defaults.bioTemplate && (
              <p className="text-[11px] text-text-secondary mt-1">
                Empty = your bio template is used: “{defaults.bioTemplate.replaceAll('{branch}', branchLabel || '…').slice(0, 90)}”
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setOpen(false); reset(); setSuccess('') }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? 'Creating…' : 'Create branch & invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export interface OrgDefaults {
  defaultLogoUrl: string
  defaultCategories: string[]
  bioTemplate: string
  orgLogoUrl: string
}

export default function OrgDefaultsEditor({ orgName, defaults, categoryOptions, missingLogoCount = 0 }: {
  orgName: string
  defaults: OrgDefaults
  categoryOptions: { value: string; label: string }[]
  // How many org locations currently have no logo (drives the retrofill hint).
  missingLogoCount?: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const [logoUrl, setLogoUrl] = useState(defaults.defaultLogoUrl)
  const [uploading, setUploading] = useState(false)
  const [cats, setCats] = useState<string[]>(defaults.defaultCategories)
  const [bio, setBio] = useState(defaults.bioTemplate)

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyMsg, setApplyMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function uploadLogo(file: File) {
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Logo upload failed.')
        return
      }
      setLogoUrl(data.url)
    } catch {
      setError('Logo upload failed — check your connection.')
    } finally {
      setUploading(false)
    }
  }

  async function applyToBranches() {
    setApplying(true)
    setApplyMsg(null)
    setError('')
    try {
      const res = await fetch('/api/portal/org-defaults', { method: 'PATCH' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setApplyMsg({ ok: false, text: data?.error || 'Could not apply the logo.' })
        return
      }
      setApplyMsg(
        data.updated > 0
          ? { ok: true, text: `Logo applied to ${data.updated} location${data.updated === 1 ? '' : 's'} ✓` }
          : { ok: true, text: 'All locations already have a logo — nothing to update.' }
      )
      router.refresh()
    } catch {
      setApplyMsg({ ok: false, text: 'Network error — try again.' })
    } finally {
      setApplying(false)
    }
  }

  function toggleCat(c: string) {
    setCats(prev => (prev.includes(c) ? prev.filter(x => x !== c) : prev.length >= 4 ? prev : [...prev, c]))
  }

  async function save() {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/portal/org-defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_logo_url: logoUrl,
          default_categories: cats,
          bio_template: bio,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not save defaults.')
        return
      }
      setMessage('Defaults saved — new branches will use them.')
      router.refresh()
      setTimeout(() => setMessage(''), 5000)
    } catch {
      setError('Could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl shadow-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface/50 transition-colors"
      >
        <div>
          <p className="text-sm font-bold text-text-primary">Branch defaults</p>
          <p className="text-[11px] text-text-secondary">
            Pre-fill new branches with {defaults.defaultLogoUrl ? 'a logo, ' : ''}
            {defaults.defaultCategories.length > 0 ? `${defaults.defaultCategories.length} default categor${defaults.defaultCategories.length === 1 ? 'y' : 'ies'}, ` : ''}
            {defaults.bioTemplate ? 'a bio template' : 'your shared details'}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-text-secondary transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
          <p className="text-[11px] text-text-secondary leading-relaxed">
            These pre-fill the “Add branch” form. They never change existing branches. Use <code className="bg-surface rounded px-1">{'{branch}'}</code> in the bio template — it becomes the branch name (e.g. “Chinhoyi”).
          </p>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-whatsapp-100 border border-whatsapp-200 overflow-hidden flex items-center justify-center shrink-0">
              {logoUrl ? (
                <Image src={logoUrl} alt="Org logo" width={56} height={56} className="w-full h-full object-cover" unoptimized={logoUrl.endsWith('.svg')} />
              ) : (
                <span className="text-whatsapp-700 font-bold text-lg">{orgName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-text-primary mb-1">Default branch logo</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) uploadLogo(f)
                  e.target.value = ''
                }}
                className="text-[11px] text-text-secondary file:mr-2 file:h-7 file:px-2.5 file:rounded-lg file:border-0 file:bg-whatsapp-50 file:text-whatsapp-700 file:text-[11px] file:font-semibold cursor-pointer"
              />
              {uploading && <p className="text-[11px] text-text-secondary mt-0.5">Uploading…</p>}
              {logoUrl && !uploading && (
                <button type="button" onClick={() => setLogoUrl('')} className="text-[11px] text-red-600 hover:underline mt-0.5">
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Default categories <span className="text-text-secondary font-normal">(up to 4, preselected for new branches)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
              {categoryOptions.map(opt => {
                const selected = cats.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleCat(opt.value)}
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

          {/* Bio template */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Bio template <span className="text-text-secondary font-normal">({'{branch}'} = branch label)</span>
            </label>
            <textarea
              className="input-field min-h-[70px]"
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={600}
              placeholder={`Official ${orgName} {branch} desk. Reach us for fast assistance.`}
            />
            {bio.includes('{branch}') && (
              <p className="text-[11px] text-whatsapp-700 mt-1">
                Preview: {bio.replaceAll('{branch}', 'Chinhoyi').slice(0, 120)}
              </p>
            )}
          </div>

          {message && <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5">{message}</p>}
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
          {applyMsg && (
            <p className={`text-xs rounded-xl px-4 py-2.5 border ${
              applyMsg.ok
                ? 'text-whatsapp-700 bg-whatsapp-50 border-whatsapp-200'
                : 'text-red-600 bg-red-50 border-red-200'
            }`}>
              {applyMsg.text}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={save} disabled={saving || uploading} className="btn-primary h-10 px-5 text-xs font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save defaults'}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={applyToBranches}
                disabled={applying || uploading}
                className="h-10 px-5 rounded-2xl bg-white border border-whatsapp-300 text-whatsapp-700 text-xs font-semibold hover:bg-whatsapp-50 transition-colors disabled:opacity-50"
              >
                {applying ? 'Applying…' : missingLogoCount > 0 ? `Apply logo to ${missingLogoCount} location${missingLogoCount === 1 ? '' : 's'}` : 'Apply logo to existing branches'}
              </button>
            )}
          </div>
          {logoUrl && (
            <p className="text-[11px] text-text-secondary">
              Fills in the org logo only where a location has no logo of its own — never overwrites one a branch uploaded. Save first if you just changed the logo.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

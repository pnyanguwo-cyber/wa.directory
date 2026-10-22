'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SOCIAL_KEYS, SOCIAL_META, SocialIcon, type SocialKey } from '@/components/social-icons'
import type { SiteHoursEntry, SiteFaqEntry, SiteContentBlocks } from '@/types'

type ThemeKey = 'header' | 'hero' | 'shop' | 'contact' | 'accent'
type SiteTheme = Record<ThemeKey, string>
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const THEME_ROWS: { key: ThemeKey; label: string; hint: string }[] = [
  { key: 'header', label: 'Header', hint: 'Top bar with your business name' },
  { key: 'hero', label: 'Hero', hint: 'The big intro section' },
  { key: 'shop', label: 'Shop', hint: 'Panel behind your item listings' },
  { key: 'contact', label: 'Contact band', hint: 'The closing call-to-action' },
  { key: 'accent', label: 'Accent', hint: 'Buttons, stars and price badges (default: per-category colour)' },
]

// One-tap colour schemes that fill every section at once.
const PALETTES: { name: string; theme: SiteTheme }[] = [
  { name: 'WhatsApp', theme: { header: '', hero: '', shop: '', contact: '', accent: '#25D366' } },
  { name: 'Deep forest', theme: { header: '#075E54', hero: '#07381B', shop: '', contact: '#25D366', accent: '#25D366' } },
  { name: 'Royal blue', theme: { header: '#1E3A8A', hero: '#1D4ED8', shop: '', contact: '#3B82F6', accent: '#F59E0B' } },
  { name: 'Graphite', theme: { header: '#111827', hero: '#1F2937', shop: '', contact: '#374151', accent: '#22D3EE' } },
  { name: 'Violet edge', theme: { header: '#4C1D95', hero: '#6D28D9', shop: '', contact: '#8B5CF6', accent: '#F472B6' } },
  { name: 'Terracotta', theme: { header: '#7C2D12', hero: '#C2410C', shop: '', contact: '#F97316', accent: '#F59E0B' } },
  { name: 'Fresh mint', theme: { header: '', hero: '#D1FAE5', shop: '', contact: '#059669', accent: '#059669' } },
]

const PRESET_HEXES = ['#25D366', '#0F766E', '#2563EB', '#4F46E5', '#D97706', '#E11D48', '#334155', '#111827']

function cleanHex(v: string): string {
  return v.replace(/[^#0-9a-fA-F]/g, '').slice(0, 7)
}

function sortDays(rows: SiteHoursEntry[]): SiteHoursEntry[] {
  const order = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return rows
    .filter((row, i) => rows.findIndex(r => r.day === row.day) === i)
    .slice(0, 7)
    .sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day))
}

export default function PortalSite({
  businessId,
  businessName,
  generateSite: generateSiteProp,
  siteHero,
  siteServices,
  siteContactEmail,
  siteTheme,
  siteSocials,
  siteContent,
}: {
  businessId: string
  businessName: string
  generateSite: boolean
  siteHero: string
  siteServices: string
  siteContactEmail: string
  siteTheme?: Partial<Record<ThemeKey, string>> | null
  siteSocials?: Partial<Record<SocialKey, string>> | null
  siteContent?: SiteContentBlocks | null
}) {
  const router = useRouter()
  const [hero, setHero] = useState(siteHero)
  const [services, setServices] = useState(siteServices)
  const [contactEmail, setContactEmail] = useState(siteContactEmail)
  const [siteEnabled, setSiteEnabled] = useState(generateSiteProp)
  const [theme, setTheme] = useState<SiteTheme>({
    header: siteTheme?.header || '',
    hero: siteTheme?.hero || '',
    shop: siteTheme?.shop || '',
    contact: siteTheme?.contact || '',
    accent: siteTheme?.accent || '',
  })
  const [socials, setSocials] = useState<Record<SocialKey, string>>({
    twitter: siteSocials?.twitter || '',
    instagram: siteSocials?.instagram || '',
    facebook: siteSocials?.facebook || '',
    linkedin: siteSocials?.linkedin || '',
    tiktok: siteSocials?.tiktok || '',
    youtube: siteSocials?.youtube || '',
  })
  const [socialTicked, setSocialTicked] = useState<Record<SocialKey, boolean>>({
    twitter: !!siteSocials?.twitter,
    instagram: !!siteSocials?.instagram,
    facebook: !!siteSocials?.facebook,
    linkedin: !!siteSocials?.linkedin,
    tiktok: !!siteSocials?.tiktok,
    youtube: !!siteSocials?.youtube,
  })

  // Editor state synced after AI generates so hours/gallery survive.
  const [tagline, setTagline] = useState(siteContent?.tagline || '')
  const [faq, setFaq] = useState<SiteFaqEntry[]>(
    siteContent?.faq && siteContent.faq.length ? siteContent.faq : [],
  )
  const [hours, setHours] = useState<SiteHoursEntry[]>(() => {
    const set = siteContent?.hours && siteContent.hours.length ? siteContent.hours : DAYS.map(day => ({ day, open: '', close: '' }))
    return DAYS.map(day => set.find(h => h.day === day) || ({ day, open: '', close: '' } as SiteHoursEntry))
  })
  const [gallery, setGallery] = useState<string[]>(siteContent?.gallery || [])
  const [uploading, setUploading] = useState(false)
  const uploadInput = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const payload = () => ({
    generate_site: siteEnabled,
    site_hero: hero,
    site_services: services,
    site_contact_email: contactEmail,
    site_theme: theme,
    site_socials: socials,
    site_content: {
      tagline,
      faq: faq.filter(f => f.q.trim() && f.a.trim()),
      hours: sortDays(hours.filter(h => (h.open && h.close) ? true : h.open === '' && h.close === '')),
      gallery,
    },
  })

  async function handleSave(ai = false) {
    setBusy(true)
    setGenerating(ai)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/portal/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ai ? { ...payload(), generate_ai: true } : payload()),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not save site settings')
        return
      }
      if (ai && data.site_content) {
        const fresh = data.site_content as SiteContentBlocks
        if (fresh.tagline) setTagline(fresh.tagline)
        if (fresh.faq) setFaq(fresh.faq)
      }
      setNotice(ai ? 'AI content generated and saved.' : 'Site settings saved — changes are live now.')
      setSocialTicked({
        twitter: !!socials.twitter,
        instagram: !!socials.instagram,
        facebook: !!socials.facebook,
        linkedin: !!socials.linkedin,
        tiktok: !!socials.tiktok,
        youtube: !!socials.youtube,
      })
      router.refresh()
    } catch {
      setError('Could not save site settings. Check your connection and try again.')
    } finally {
      setBusy(false)
      setGenerating(false)
    }
  }

  async function handleUpload(file: File) {
    if (file.size === 0) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo too large (max 2MB)')
      return
    }
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Upload failed')
        return
      }
      setGallery(g => (g.length < 8 ? [...g, String(data.url)] : g))
    } catch {
      setError('Upload failed. Check your connection and try again.')
    } finally {
      setUploading(false)
      if (uploadInput.current) uploadInput.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Website</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Control the automatic website your customers see. The shop listing is managed from the Shop tab.
        </p>
      </div>

      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-text-primary">Automatic website</p>
            <p className="text-xs text-text-secondary mt-0.5">Generate a website for {businessName} when customers browse your shop.</p>
          </div>
          <button
            type="button"
            onClick={() => setSiteEnabled(!siteEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${siteEnabled ? 'bg-whatsapp-500' : 'bg-gray-300'}`}
            role="switch"
            aria-checked={siteEnabled}
            aria-label="Toggle automatic website"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${siteEnabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        <p className="text-[11px] text-text-secondary mt-3">
          {siteEnabled
            ? 'Your website is live and customers can browse your shop.'
            : 'Your website is turned off. Customers will see your existing website link instead.'}
        </p>
      </div>

      {/* Social profiles */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-text-primary">Social profiles</h3>
          <p className="text-xs text-text-secondary mt-0.5">Tick the networks you&apos;re on and add your page link. Shown on your website and profile.</p>
        </div>
        <div className="space-y-3">
          {SOCIAL_KEYS.map(key => (
            <div key={key} className="rounded-2xl border border-gray-200/80 p-3.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={socialTicked[key]}
                  onChange={e => { setSocialTicked(t => ({ ...t, [key]: e.target.checked })); setNotice('') }}
                  className="w-4 h-4 accent-whatsapp-600 shrink-0"
                />
                <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <SocialIcon platform={key} className="w-4 h-4 text-text-secondary" />
                  I have a {SOCIAL_META[key].label} page
                </span>
              </label>
              {socialTicked[key] && (
                <input
                  type="url"
                  value={socials[key]}
                  onChange={e => { setSocials(s => ({ ...s, [key]: e.target.value.slice(0, 200) })); setNotice('') }}
                  placeholder={SOCIAL_META[key].placeholder}
                  className="input-field w-full mt-2.5 text-sm"
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-text-secondary mt-3">
          Only links matching the network&apos;s web address are saved. Untick a network to remove it.
        </p>
      </div>

      {/* Colours */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-text-primary">Colours</h3>
          <p className="text-xs text-text-secondary mt-0.5">Quick-pick a full colour scheme, or fine-tune each section below.</p>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {PALETTES.map(p => (
            <button
              key={p.name}
              type="button"
              onClick={() => { setTheme({ ...p.theme }); setNotice('') }}
              className="flex items-center gap-2 rounded-full border border-gray-200/80 bg-surface px-3 py-1.5 text-xs font-medium hover:border-whatsapp-400 hover:bg-whatsapp-50 transition-colors"
            >
              <span className="flex -space-x-1">
                {[p.theme.header || '#ffffff', p.theme.accent, p.theme.contact].slice(0, 3).map((c, i) => (
                  <span key={i} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: c || '#e5e7eb' }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {THEME_ROWS.map(row => (
            <div key={row.key} className="rounded-2xl border border-gray-200/80 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">{row.label}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">{row.hint}</p>
                </div>
                {theme[row.key] !== '' && (
                  <button
                    type="button"
                    onClick={() => setTheme(t => ({ ...t, [row.key]: '' }))}
                    className="text-[11px] font-medium text-text-secondary hover:text-text-primary underline underline-offset-2 shrink-0"
                  >
                    Reset to default
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <input
                  type="color"
                  value={theme[row.key] || '#ffffff'}
                  onChange={e => { setTheme(t => ({ ...t, [row.key]: e.target.value.toUpperCase() })); setNotice('') }}
                  aria-label={`${row.label} colour`}
                  className="w-10 h-10 rounded-xl border border-gray-200 bg-white p-1 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={theme[row.key]}
                  onChange={e => { setTheme(t => ({ ...t, [row.key]: cleanHex(e.target.value) })); setNotice('') }}
                  placeholder="Default"
                  className="input-field w-28 font-mono text-sm shrink-0"
                  maxLength={7}
                  spellCheck={false}
                />
                <div className="flex flex-wrap gap-1.5 min-w-0">
                  {PRESET_HEXES.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setTheme(t => ({ ...t, [row.key]: p })); setNotice('') }}
                      aria-label={`Use preset ${p}`}
                      className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${theme[row.key].toUpperCase() === p ? 'ring-2 ring-offset-1 ring-whatsapp-600 border-transparent' : 'border-gray-200'}`}
                      style={{ backgroundColor: p }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-text-secondary mt-3">
          Tip: for dark colours the text on your website switches to white automatically.
        </p>
      </div>

      {/* Hero + services text */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-text-primary">Hero / bio</h3>
          <p className="text-xs text-text-secondary mt-0.5">This section appears at the top of your website.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">Hero / bio text</label>
          <textarea
            value={hero}
            onChange={e => { setHero(e.target.value); setNotice('') }}
            rows={4}
            className="input-field resize-none w-full"
            placeholder="Tell customers who you are and what you offer…"
          />
          <p className="text-[11px] text-text-secondary mt-1">{hero.length}/2000 characters</p>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-text-primary mb-1.5">Services overview</label>
          <textarea
            value={services}
            onChange={e => { setServices(e.target.value); setNotice('') }}
            rows={4}
            className="input-field resize-none w-full"
            placeholder={'Describe the services you offer…\nTip: start lines with "- " to show each one as a card on your website.'}
          />
          <p className="text-[11px] text-text-secondary mt-1">{services.length}/2000 characters</p>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-text-primary mb-1.5">Contact email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={e => { setContactEmail(e.target.value); setNotice('') }}
            className="input-field w-full"
            placeholder="you@yourbusiness.com"
          />
          <p className="text-[11px] text-text-secondary mt-1">Shown to customers as your contact email on the website.</p>
        </div>
      </div>

      {/* Tagline */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Tagline</h3>
            <p className="text-xs text-text-secondary mt-0.5">The big headline on your website&apos;s opening section.</p>
          </div>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={busy || generating}
            className="rounded-full border border-whatsapp-300 bg-whatsapp-50 px-4 py-2 text-xs font-bold text-whatsapp-800 hover:bg-whatsapp-100 transition-colors disabled:opacity-60 shrink-0"
          >
            {generating ? 'Generating…' : '✨ Generate with AI'}
          </button>
        </div>
        <input
          type="text"
          value={tagline}
          onChange={e => { setTagline(e.target.value.slice(0, 140)); setNotice('') }}
          className="input-field w-full"
          placeholder="Quality plumbing, right when you need it"
          maxLength={140}
        />
        <p className="text-[11px] text-text-secondary mt-2">
          Generates a fresh tagline + starter FAQ. It won&apos;t touch your opening hours or photos.
        </p>
      </div>

      {/* FAQ */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-text-primary">FAQ</h3>
            <p className="text-xs text-text-secondary mt-0.5">Common questions customers ask (up to 8).</p>
          </div>
          <button
            type="button"
            onClick={() => { if (faq.length < 8) setFaq(f => [...f, { q: '', a: '' }]); setNotice('') }}
            disabled={faq.length >= 8}
            className="text-xs font-bold text-whatsapp-700 border border-whatsapp-200 rounded-full px-3.5 py-1.5 hover:bg-whatsapp-50 disabled:opacity-50 transition-colors shrink-0"
          >
            + Add question
          </button>
        </div>
        {faq.length === 0 && (
          <p className="text-xs text-text-secondary">No FAQ yet. Use ✨ Generate with AI to create a starter set, or add your own.</p>
        )}
        <div className="space-y-3">
          {faq.map((f, i) => (
            <div key={i} className="rounded-2xl border border-gray-200/80 p-3.5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Question {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setFaq(list => list.filter((_, j) => j !== i))}
                  className="text-[11px] font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                value={f.q}
                onChange={e => { setFaq(list => list.map((x, j) => (j === i ? { ...x, q: e.target.value.slice(0, 220) } : x))); setNotice('') }}
                placeholder="What are your prices?"
                className="input-field w-full text-sm"
              />
              <textarea
                value={f.a}
                onChange={e => { setFaq(list => list.map((x, j) => (j === i ? { ...x, a: e.target.value.slice(0, 800) } : x))); setNotice('') }}
                placeholder="Your answer…"
                rows={2}
                className="input-field resize-none w-full text-sm mt-2"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Opening hours */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-text-primary">Opening hours</h3>
          <p className="text-xs text-text-secondary mt-0.5">Tick the days you&apos;re open and set the times. Unticked days show as closed.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {hours.map((h, i) => {
            const open = h.open !== '' && h.close !== ''
            return (
              <div key={h.day} className="flex items-center gap-2.5 rounded-2xl border border-gray-200/80 px-3.5 py-2.5">
                <label className="flex items-center gap-2 shrink-0 w-[104px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={open}
                    onChange={e => { setHours(rows => rows.map((x, j) => (j === i ? { ...x, open: e.target.checked ? '08:00' : '', close: e.target.checked ? '17:00' : '' } : x))); setNotice('') }}
                    className="w-4 h-4 accent-whatsapp-600"
                  />
                  <span className={`text-sm font-medium truncate ${open ? 'text-text-primary' : 'text-text-secondary'}`}>{h.day}</span>
                </label>
                {open ? (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="time"
                      value={h.open}
                      onChange={e => { setHours(rows => rows.map((x, j) => (j === i ? { ...x, open: e.target.value } : x))); setNotice('') }}
                      className="input-field w-[104px] px-2 text-sm"
                      aria-label={`${h.day} opening time`}
                    />
                    <span className="text-xs text-text-secondary">–</span>
                    <input
                      type="time"
                      value={h.close}
                      onChange={e => { setHours(rows => rows.map((x, j) => (j === i ? { ...x, close: e.target.value } : x))); setNotice('') }}
                      className="input-field w-[104px] px-2 text-sm"
                      aria-label={`${h.day} closing time`}
                    />
                  </div>
                ) : (
                  <span className="ml-auto text-xs text-text-secondary/70">Closed</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Gallery */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-text-primary">Gallery photos</h3>
          <p className="text-xs text-text-secondary mt-0.5">Up to 8 photos of your work or products (PNG, JPEG or WebP, max 2MB each).</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {gallery.map((url, i) => (
            <div key={url + i} className="relative w-20 h-20 rounded-2xl border border-gray-200/80 overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Gallery photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setGallery(g => g.filter((_, j) => j !== i))}
                aria-label={`Remove gallery photo ${i + 1}`}
                className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] font-bold py-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Remove
              </button>
            </div>
          ))}
          {gallery.length < 8 && (
            <label
              className={`w-20 h-20 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-whatsapp-400 hover:bg-whatsapp-50 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" /></svg>
              <span className="text-[10px] font-semibold text-text-secondary">{uploading ? 'Uploading…' : 'Add photo'}</span>
              <input ref={uploadInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); else if (uploadInput.current) uploadInput.current.value = '' }} />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
      {notice && <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{notice}</p>}

      <button
        onClick={() => handleSave(false)}
        disabled={busy || generating}
        className="btn-primary w-full py-3 text-[16px] disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Save website settings'}
      </button>
    </div>
  )
}

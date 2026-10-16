'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ThemeKey = 'header' | 'hero' | 'shop' | 'contact' | 'accent'
type SiteTheme = Record<ThemeKey, string>

const THEME_ROWS: { key: ThemeKey; label: string; hint: string }[] = [
  { key: 'header', label: 'Header', hint: 'Top bar with your business name' },
  { key: 'hero', label: 'Hero / About', hint: 'The main intro section' },
  { key: 'shop', label: 'Shop', hint: 'Panel behind your item listings' },
  { key: 'contact', label: 'Contact', hint: 'The contact section panel' },
  { key: 'accent', label: 'Accent', hint: 'Buttons and price badges' },
]

const PRESETS: string[] = ['#25D366', '#0F766E', '#2563EB', '#4F46E5', '#D97706', '#E11D48', '#334155', '#111827']

const EMPTY_THEME: SiteTheme = { header: '', hero: '', shop: '', contact: '', accent: '' }

function cleanHex(v: string): string {
  return v.replace(/[^#0-9a-fA-F]/g, '').slice(0, 7)
}

export default function PortalSite({
  businessId,
  businessName,
  generateSite,
  siteHero,
  siteServices,
  siteContactEmail,
  siteTheme,
}: {
  businessId: string
  businessName: string
  generateSite: boolean
  siteHero: string
  siteServices: string
  siteContactEmail: string
  siteTheme?: Partial<Record<ThemeKey, string>> | null
}) {
  const router = useRouter()
  const [hero, setHero] = useState(siteHero)
  const [services, setServices] = useState(siteServices)
  const [contactEmail, setContactEmail] = useState(siteContactEmail)
  const [siteEnabled, setSiteEnabled] = useState(generateSite)
  const [theme, setTheme] = useState<SiteTheme>({
    header: siteTheme?.header || '',
    hero: siteTheme?.hero || '',
    shop: siteTheme?.shop || '',
    contact: siteTheme?.contact || '',
    accent: siteTheme?.accent || '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSave() {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/portal/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generate_site: siteEnabled,
          site_hero: hero,
          site_services: services,
          site_contact_email: contactEmail,
          site_theme: theme,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not save site settings')
        return
      }
      setNotice('Site settings saved.')
      router.refresh()
    } catch {
      setError('Could not save site settings. Check your connection and try again.')
    } finally {
      setBusy(false)
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

      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-text-primary">Colours</h3>
          <p className="text-xs text-text-secondary mt-0.5">Pick a colour for each section of your website. Leave empty to use the default.</p>
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
                  {PRESETS.map(p => (
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
            placeholder="Describe the services you offer…"
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

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mt-4">{error}</p>}
        {notice && <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 mt-4 animate-fade-in">{notice}</p>}

        <button
          onClick={handleSave}
          disabled={busy}
          className="btn-primary w-full py-3 text-[16px] mt-5 disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save website settings'}
        </button>
      </div>
    </div>
  )
}

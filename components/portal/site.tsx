'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PortalSite({
  businessId,
  businessName,
  generateSite,
  siteHero,
  siteServices,
  siteContactEmail,
}: {
  businessId: string
  businessName: string
  generateSite: boolean
  siteHero: string
  siteServices: string
  siteContactEmail: string
}) {
  const router = useRouter()
  const [hero, setHero] = useState(siteHero)
  const [services, setServices] = useState(siteServices)
  const [contactEmail, setContactEmail] = useState(siteContactEmail)
  const [siteEnabled, setSiteEnabled] = useState(generateSite)
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

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminSectionHeader } from './shared'
import type { PricingConfig } from '@/lib/pricing'

const PLAN_LABELS: Record<string, string> = {
  '1m': '1 Month',
  '6m': '6 Months',
  '12m': '12 Months',
}

export default function AdminPricing() {
  const router = useRouter()
  const [pricing, setPricing] = useState<PricingConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/pricing')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setPricing(data.pricing)
    setLoading(false)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!pricing) return
    setBusy(true)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/pricing', {
      method: 'PATCH',
      body: JSON.stringify({ pricing }),
    })
    setBusy(false)
    if (!ok) {
      setMessage(data?.error || 'Failed to save pricing')
      return
    }
    setPricing(data.pricing)
    setMessage('Pricing saved. Paynow will use the new amounts immediately.')
  }

  function setBusiness(plan: string, value: string) {
    if (!pricing) return
    setPricing({ ...pricing, business: { ...pricing.business, [plan]: Number(value) || 0 } })
  }
  function setPersonal(plan: string, value: string) {
    if (!pricing) return
    setPricing({ ...pricing, personal: { ...pricing.personal, [plan]: Number(value) || 0 } })
  }
  function setSupport(tier: string, value: string) {
    if (!pricing) return
    setPricing({ ...pricing, support: { ...pricing.support, [tier]: Number(value) || 0 } })
  }

  if (loading || !pricing) {
    return <p className="text-sm text-text-secondary">Loading pricing…</p>
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader title="Pricing" subtitle="Edit Paynow charges. Changes take effect immediately for new payments." />
      {message && <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5">{message}</p>}
      <form onSubmit={save} className="neo-card p-4 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-2">Business listings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.keys(pricing.business).map(plan => (
              <div key={plan}>
                <label className="text-xs font-medium text-text-secondary mb-1 block">{PLAN_LABELS[plan] || plan}</label>
                <input type="number" step="0.01" min="0" value={pricing.business[plan as keyof typeof pricing.business]} onChange={e => setBusiness(plan, e.target.value)} className="input-field text-sm" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-2">Personal contacts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.keys(pricing.personal).map(plan => (
              <div key={plan}>
                <label className="text-xs font-medium text-text-secondary mb-1 block">{PLAN_LABELS[plan] || plan}</label>
                <input type="number" step="0.01" min="0" value={pricing.personal[plan as keyof typeof pricing.personal]} onChange={e => setPersonal(plan, e.target.value)} className="input-field text-sm" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-2">Pro WhatsApp catalog setup</h3>
          <input type="number" step="0.01" min="0" value={pricing.proAssistance} onChange={e => setPricing({ ...pricing, proAssistance: Number(e.target.value) || 0 })} className="input-field text-sm max-w-xs" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary mb-2">IT support packages</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.keys(pricing.support).map(tier => (
              <div key={tier}>
                <label className="text-xs font-medium text-text-secondary mb-1 block capitalize">{tier}</label>
                <input type="number" step="0.01" min="0" value={pricing.support[tier as keyof typeof pricing.support]} onChange={e => setSupport(tier, e.target.value)} className="input-field text-sm" />
              </div>
            ))}
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary h-10 px-5 text-xs font-semibold">
          {busy ? 'Saving...' : 'Save pricing'}
        </button>
      </form>
    </div>
  )
}

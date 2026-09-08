'use client'

import { useState } from 'react'
import Link from 'next/link'
import LogoImage from '@/components/logo-image'
import type { PlanType } from '@/types'
import { PLAN_CONFIG, PRO_ASSISTANCE_PRICE } from '@/types'

interface Business {
  id: string
  name: string
  slug: string
  business_id: string
  username: string
  phone: string
  city: string
  area: string
  logo_url: string
  category: string[]
  payment_status: string
}

export default function PayPage() {
  const [step, setStep] = useState<'plan' | 'search' | 'select' | 'pay' | 'done'>('plan')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Business[]>([])
  const [selected, setSelected] = useState<Business | null>(null)
  const [plan, setPlan] = useState<PlanType>('1m')
  const [proAssistance, setProAssistance] = useState(false)
  const [payerPhone, setPayerPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResults([])
    try {
      const res = await fetch(`/api/pay?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      setResults(data.businesses || [])
      if (!data.businesses?.length) {
        setError('No businesses found. Try a different search (name, phone, or Business ID like WA-XXXXXX).')
      } else if (data.businesses.length === 1) {
        setSelected(data.businesses[0])
        setStep('pay')
      } else {
        setStep('select')
      }
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(biz: Business) {
    setSelected(biz)
    setStep('pay')
  }

  async function handlePay() {
    if (!selected || !payerPhone.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: selected.business_id,
          payer_phone: payerPhone.trim(),
          plan,
          hasProAssistance: proAssistance,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Payment request failed')
        return
      }
      setStep('done')
    } catch {
      setError('Could not submit payment request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = PLAN_CONFIG[plan].price + (proAssistance ? PRO_ASSISTANCE_PRICE : 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm mb-8 transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 bg-whatsapp-500/10 rounded-2xl blur-xl" />
            <div className="relative bg-whatsapp-100 dark:bg-whatsapp-900/40 w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ boxShadow: '0 4px 12px -2px rgba(37,211,102,0.20), 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
              <svg className="w-8 h-8 text-whatsapp-600 dark:text-whatsapp-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">Pay for a Listing</h1>
          <p className="text-text-secondary text-sm mt-2.5 max-w-xs mx-auto leading-relaxed">
            Choose a plan and pay via EcoCash to activate or renew a business listing.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 p-6 sm:p-7 space-y-5"
          style={{ boxShadow: '0 2px 8px -2px rgba(11,20,26,0.06), 0 1px 4px -1px rgba(11,20,26,0.04), 0 0 0 1px rgba(255,255,255,0.5) inset' }}>

          {/* STEP 1: Plan selection */}
          {step === 'plan' && (
            <div key="plan" className="animate-fade-in">
              <p className="text-sm font-semibold tracking-tight text-text-primary mb-3">Choose a payment plan</p>
              <div className="grid grid-cols-3 gap-3">
                {(['1m', '6m', '12m'] as PlanType[]).map(p => {
                  const cfg = PLAN_CONFIG[p]
                  const isActive = plan === p
                  const isBest = p === '6m'
                  return (
                    <button
                      key={p}
                      onClick={() => { setPlan(p); if (p !== '12m') setProAssistance(false) }}
                      className={`relative rounded-2xl border-2 p-4 text-center transition-all duration-150 ${
                        isActive
                          ? 'border-whatsapp-500 bg-whatsapp-50 dark:bg-whatsapp-950/40'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      style={isActive ? { boxShadow: '0 4px 14px -3px rgba(37,211,102,0.25), 0 2px 6px -1px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)' } : { boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                    >
                      {isBest && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-whatsapp-600 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          Best value
                        </div>
                      )}
                      {isActive && !isBest && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-whatsapp-500 rounded-full flex items-center justify-center"
                          style={{ boxShadow: '0 2px 6px rgba(37,211,102,0.35)' }}>
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                      <p className={`text-2xl font-extrabold tracking-tight ${isActive ? 'text-whatsapp-700 dark:text-whatsapp-400' : 'text-text-primary'}`}>
                        {cfg.months}
                      </p>
                      <p className={`text-xs font-semibold mt-0.5 ${isActive ? 'text-whatsapp-600 dark:text-whatsapp-400' : 'text-text-secondary'}`}>
                        {cfg.months === 1 ? 'Month' : 'Months'}
                      </p>
                      <div className={`mt-3 pt-3 border-t ${isActive ? 'border-whatsapp-200/80 dark:border-whatsapp-800/60' : 'border-gray-100 dark:border-gray-700/60'}`}>
                        <p className={`text-base font-extrabold tracking-tight ${isActive ? 'text-whatsapp-700 dark:text-whatsapp-400' : 'text-text-primary'}`}>
                          ${cfg.price.toFixed(2)}
                        </p>
                        {cfg.months > 1 && (
                          <p className="text-[10px] text-text-secondary mt-0.5">${cfg.perMonth.toFixed(2)}/mo</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Pro assistance add-on */}
              {plan === '12m' && (
                <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 animate-fade-in"
                  style={{ boxShadow: '0 2px 8px -2px rgba(217,119,6,0.10), inset 0 1px 0 rgba(255,255,255,0.5)' }}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proAssistance}
                      onChange={e => setProAssistance(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-whatsapp-600 focus:ring-whatsapp-500"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary leading-snug">Professional WhatsApp catalog setup & name reservation</p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">Get expert help setting up your WhatsApp Business catalog and securing your directory name. +${PRO_ASSISTANCE_PRICE.toFixed(2)}</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Summary */}
              <div className="rounded-2xl p-4 border border-gray-100 dark:border-gray-800"
                style={{ backgroundColor: 'rgb(var(--bg-secondary))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-primary">{PLAN_CONFIG[plan].label} listing</span>
                  <span className="font-bold text-text-primary tabular-nums">${PLAN_CONFIG[plan].price.toFixed(2)}</span>
                </div>
                {proAssistance && (
                  <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                    <span className="font-medium text-text-primary">Pro assistance</span>
                    <span className="font-bold text-text-primary tabular-nums">+${PRO_ASSISTANCE_PRICE.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                  <span className="font-bold text-text-primary">Total</span>
                  <span className="font-extrabold text-whatsapp-700 dark:text-whatsapp-400 tabular-nums">${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button onClick={() => setStep('search')} className="btn-primary w-full mt-1">
                Continue
              </button>
            </div>
          )}

          {/* STEP 2: Search for business */}
          {step === 'search' && (
            <div key="search" className="animate-fade-in">
              <label className="block text-sm font-semibold tracking-tight text-text-primary mb-1">
                Search for a business
              </label>
              <p className="text-xs text-text-secondary mb-3 leading-relaxed">
                Enter the business name, phone number, or Business ID (e.g. WA-XXXXXX)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                  placeholder="e.g. John's Plumbing, +263771234567, WA-7K3M9X"
                  className="input-field flex-1"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="btn-primary px-5"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
                    </svg>
                  )}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5 mt-3">{error}</p>
              )}
              <button onClick={() => setStep('plan')} className="btn-secondary w-full mt-4">
                Back to plans
              </button>
            </div>
          )}

          {/* STEP 3: Select business (if multiple results) */}
          {step === 'select' && (
            <div key="select" className="animate-fade-in">
              <p className="text-sm font-semibold tracking-tight text-text-primary mb-1">Select the business you&apos;re paying for</p>
              <p className="text-xs text-text-secondary mb-3">{results.length} businesses found</p>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {results.map(biz => (
                  <button
                    key={biz.id}
                    onClick={() => handleSelect(biz)}
                    className="w-full text-left p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-whatsapp-400 hover:bg-whatsapp-50 dark:hover:bg-whatsapp-950/30 transition-all duration-150"
                    style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                  >
                    <div className="flex items-center gap-3">
                      {biz.logo_url ? (
                        <LogoImage src={biz.logo_url} alt="" width={40} height={40} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-whatsapp-100 dark:bg-whatsapp-900/30 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-whatsapp-700 dark:text-whatsapp-400">{biz.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-text-primary truncate">{biz.name}</p>
                        <p className="text-xs text-text-secondary">
                          {biz.city || 'Zimbabwe'}
                          {biz.username && <> · @{biz.username}</>}
                        </p>
                        <p className="text-[10px] text-text-secondary font-mono">{biz.business_id}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        biz.payment_status === 'active'
                          ? 'bg-whatsapp-100 text-whatsapp-700 dark:bg-whatsapp-900/30 dark:text-whatsapp-400'
                          : biz.payment_status === 'expired'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {biz.payment_status || 'active'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => { setStep('search'); setResults([]); setError('') }} className="btn-secondary w-full mt-4">
                Search again
              </button>
            </div>
          )}

          {/* STEP 4: Pay */}
          {step === 'pay' && selected && (
            <div key="pay" className="animate-fade-in">
              <div className="rounded-2xl p-4 border border-whatsapp-200/80 dark:border-whatsapp-800/40"
                style={{ backgroundColor: 'rgba(230,247,237,0.5)', boxShadow: '0 2px 8px -2px rgba(37,211,102,0.10), inset 0 1px 0 rgba(255,255,255,0.5)' }}>
                <div className="flex items-center gap-3">
                  {selected.logo_url ? (
                    <LogoImage src={selected.logo_url} alt="" width={48} height={48} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-whatsapp-100 dark:bg-whatsapp-900/40 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-whatsapp-700 dark:text-whatsapp-400">{selected.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-base font-bold tracking-tight text-text-primary">{selected.name}</p>
                    <p className="text-xs text-text-secondary">
                      {PLAN_CONFIG[plan].label} · ${totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-semibold tracking-tight text-text-primary mb-1">
                  Your EcoCash phone number
                </label>
                <p className="text-xs text-text-secondary mb-3 leading-relaxed">
                  Enter the number you&apos;re paying from. Admin will verify the EcoCash transaction from this number.
                </p>
                <input
                  type="tel"
                  value={payerPhone}
                  onChange={e => { setPayerPhone(e.target.value.replace(/[^0-9]/g, '')); setError('') }}
                  placeholder="e.g. 0771234567 or +263771234567"
                  className="input-field"
                  autoFocus
                />
              </div>

              {/* Summary */}
              <div className="mt-5 rounded-2xl p-4 border border-gray-100 dark:border-gray-800"
                style={{ backgroundColor: 'rgb(var(--bg-secondary))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 3px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-text-primary">{PLAN_CONFIG[plan].label} listing</span>
                  <span className="font-bold text-text-primary tabular-nums">${PLAN_CONFIG[plan].price.toFixed(2)}</span>
                </div>
                {proAssistance && (
                  <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                    <span className="font-medium text-text-primary">Pro assistance</span>
                    <span className="font-bold text-text-primary tabular-nums">+${PRO_ASSISTANCE_PRICE.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                  <span className="font-bold text-text-primary">Total</span>
                  <span className="font-extrabold text-whatsapp-700 dark:text-whatsapp-400 tabular-nums">${totalAmount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  Covers your listing for {PLAN_CONFIG[plan].label.toLowerCase()}. Admin will verify the EcoCash transaction.
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5 mt-3">{error}</p>
              )}

              <div className="flex gap-2 mt-5">
                <button onClick={() => { setStep('search'); setError('') }} className="btn-secondary flex-1">
                  Back
                </button>
                <button
                  onClick={handlePay}
                  disabled={loading || !payerPhone.trim() || payerPhone.replace(/\D/g, '').length < 9}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Submitting...' : 'Submit Payment Request'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Done — the peak moment */}
          {step === 'done' && (
            <div key="done" className="text-center py-6 animate-fade-in">
              {/* Check icon with glow */}
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-whatsapp-400/20 rounded-full blur-2xl" />
                <div className="relative bg-whatsapp-100 dark:bg-whatsapp-900/40 w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ boxShadow: '0 8px 24px -4px rgba(37,211,102,0.30), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                  <svg className="w-10 h-10 text-whatsapp-600 dark:text-whatsapp-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>

              <h2 className="text-xl font-extrabold tracking-tight text-text-primary mb-2">Payment Request Submitted</h2>
              <p className="text-sm text-text-secondary mb-1 leading-relaxed">
                You&apos;re paying <span className="font-bold text-whatsapp-700 dark:text-whatsapp-400">${totalAmount.toFixed(2)}</span> ({PLAN_CONFIG[plan].label}) for <strong className="text-text-primary">{selected?.name}</strong>
              </p>
              <p className="text-xs text-text-secondary mb-6 leading-relaxed">
                Admin will verify the EcoCash transaction from +{payerPhone.replace(/\D/g, '')} and activate the listing shortly.
              </p>

              {/* What happens next */}
              <div className="rounded-2xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 p-5 mb-6 text-left"
                style={{ boxShadow: '0 2px 8px -2px rgba(217,119,6,0.10), inset 0 1px 0 rgba(255,255,255,0.5)' }}>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">What happens next</p>
                <ol className="text-xs text-amber-900 dark:text-amber-300 space-y-1.5 leading-relaxed">
                  <li className="flex gap-2"><span className="font-bold text-amber-600 dark:text-amber-500 shrink-0">1.</span> Admin checks EcoCash for your transaction</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-600 dark:text-amber-500 shrink-0">2.</span> Once confirmed, your listing goes live for {PLAN_CONFIG[plan].label.toLowerCase()}</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-600 dark:text-amber-500 shrink-0">3.</span> You&apos;ll receive a WhatsApp confirmation</li>
                </ol>
              </div>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white rounded-full px-6 py-3 text-sm font-semibold shadow-[0_4px_14px_0_rgba(37,211,102,0.39)] hover:from-whatsapp-600 hover:to-whatsapp-700 hover:shadow-[0_6px_20px_rgba(18,140,126,0.35)] active:scale-[0.97] transition-all duration-150"
              >
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

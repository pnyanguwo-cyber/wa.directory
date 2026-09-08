'use client'

import { useEffect, useState } from 'react'
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

  // Bring the active step's card into view when moving between steps
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

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

  // Selected plan badge, shown in the header of steps 2-4
  const planBadgeClass = 'shrink-0 inline-flex items-center rounded-full border border-whatsapp-200/70 dark:border-whatsapp-800/50 bg-whatsapp-50 dark:bg-whatsapp-900/30 px-3 py-1 text-[11px] font-bold text-whatsapp-700 dark:text-whatsapp-400'
  const planBadge = (
    <span className={planBadgeClass}>
      {PLAN_CONFIG[plan].label} · ${totalAmount.toFixed(2)}
    </span>
  )

  return (
    <div className="pay-flow min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm mb-8 transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        {/* STEP 1: Plan selection */}
        {step === 'plan' && (
          <div key="plan" className="animate-fade-in">
            {/* Hero with phone mockup */}
            <div className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-whatsapp-500 via-whatsapp-600 to-emerald-700 p-8 sm:p-10 text-white"
              style={{ boxShadow: '0 20px 50px -12px rgba(37,211,102,0.35)' }}>
              {/* Decorative circles */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm tracking-wide">WhatsApp Business</p>
                    <p className="text-white/60 text-xs">Connect &bull; Engage &bull; Grow</p>
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3">
                  Choose Your<br />Payment Plan
                </h1>
                <p className="text-white/70 text-sm sm:text-base leading-relaxed max-w-md">
                  Get started with WhatsApp Business and unlock powerful features to connect with your customers, increase visibility and grow your business.
                </p>
              </div>

              {/* Phone mockup */}
              <div className="hidden sm:block absolute top-6 right-8 w-36 lg:w-44">
                <div className="relative">
                  <div className="bg-gray-900 rounded-[2rem] p-2 shadow-2xl"
                    style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
                    <div className="bg-gradient-to-b from-whatsapp-500 to-emerald-600 rounded-[1.4rem] aspect-[9/19] flex flex-col items-center justify-center p-4">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm">
                        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <p className="text-white text-xs font-semibold text-center">WhatsApp Business</p>
                    </div>
                  </div>
                  {/* Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-900 rounded-full" />
                </div>
              </div>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
              {(['1m', '6m', '12m'] as PlanType[]).map(p => {
                const cfg = PLAN_CONFIG[p]
                const isBest = p === '6m'
                const is12m = p === '12m'
                const features = [
                  'Registration, account activation and validation',
                  `Link to WhatsApp search engine for ${cfg.days} days`,
                  'Access to portal insights',
                  'Allowed to bid for promotion in search',
                ]
                return (
                  <div
                    key={p}
                    className={`relative flex flex-col rounded-2xl border-2 bg-white dark:bg-gray-900 transition-all duration-200 overflow-hidden ${
                      isBest
                        ? 'border-whatsapp-500 dark:border-whatsapp-500'
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                    style={isBest
                      ? { boxShadow: '0 8px 30px -8px rgba(37,211,102,0.25), 0 4px 10px -2px rgba(0,0,0,0.06)' }
                      : { boxShadow: '0 2px 8px -2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }
                    }
                  >
                    {/* Most popular badge */}
                    {isBest && (
                      <div className="bg-whatsapp-600 text-white text-[10px] font-bold uppercase tracking-widest text-center py-2">
                        Most Popular
                      </div>
                    )}

                    <div className="p-5 sm:p-6 flex flex-col flex-1">
                      {/* Duration label */}
                      <div className={`inline-flex self-start px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-4 ${
                        isBest
                          ? 'bg-whatsapp-100 text-whatsapp-700 dark:bg-whatsapp-900/40 dark:text-whatsapp-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {cfg.months === 1 ? '1 MONTH' : `${cfg.months} MONTHS`}
                      </div>

                      {/* Price */}
                      <div className="mb-1">
                        <span className="text-4xl font-extrabold tracking-tight text-text-primary">${cfg.price.toFixed(0)}</span>
                        <span className="text-sm font-semibold text-text-secondary ml-1">USD</span>
                      </div>
                      <p className="text-xs text-text-secondary mb-5">
                        {cfg.months === 1 ? 'per month' : `per ${cfg.months} months`}
                      </p>

                      {/* Divider */}
                      <div className="border-t border-gray-200 dark:border-gray-800 mb-5" />

                      {/* Features */}
                      <ul className="space-y-3 mb-6 flex-1">
                        {features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <svg className="w-5 h-5 mt-0.5 shrink-0 text-whatsapp-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm text-text-secondary leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Get Started button */}
                      <button
                        onClick={() => { setPlan(p); if (!is12m) setProAssistance(false); setStep('search') }}
                        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                          isBest
                            ? 'bg-whatsapp-600 text-white hover:bg-whatsapp-700 shadow-[0_4px_14px_0_rgba(37,211,102,0.39)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.35)]'
                            : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90'
                        } active:scale-[0.97]`}
                      >
                        Get Started
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pro assistance add-on */}
            {plan === '12m' && (
              <div className="mb-8 rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 p-4 animate-fade-in"
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
            <div className="rounded-2xl p-4 border border-gray-100 dark:border-gray-800 mb-6"
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

            {/* Benefits bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: (
                  <svg className="w-5 h-5 text-whatsapp-600 dark:text-whatsapp-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                  </svg>
                ), title: 'More Visibility', desc: 'Get discovered by potential customers' },
                { icon: (
                  <svg className="w-5 h-5 text-whatsapp-600 dark:text-whatsapp-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                ), title: 'Better Engagement', desc: 'Connect directly on WhatsApp' },
                { icon: (
                  <svg className="w-5 h-5 text-whatsapp-600 dark:text-whatsapp-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ), title: 'Generate Leads', desc: 'Turn conversations into customers' },
                { icon: (
                  <svg className="w-5 h-5 text-whatsapp-600 dark:text-whatsapp-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ), title: 'Trusted Platform', desc: "Backed by Meta's secure infrastructure" },
              ].map((b, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                  <div className="w-9 h-9 rounded-lg bg-whatsapp-50 dark:bg-whatsapp-900/20 flex items-center justify-center shrink-0">
                    {b.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary leading-tight">{b.title}</p>
                    <p className="text-[10px] text-text-secondary leading-snug mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Steps 2-5 wrapper */}
        {step !== 'plan' && (
          <div className="relative max-w-lg mx-auto">
            {/* Ambient glows behind the card */}
            <div className="absolute -top-10 -left-10 w-44 h-44 bg-whatsapp-400/20 dark:bg-whatsapp-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-8 w-40 h-40 bg-emerald-300/25 dark:bg-emerald-700/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/70 dark:border-gray-800 overflow-hidden"
              style={{ boxShadow: '0 24px 48px -12px rgba(7,94,84,0.18), 0 8px 20px -8px rgba(11,20,26,0.10), inset 0 1px 0 rgba(255,255,255,0.8)' }}>
              {/* Gradient accent strip */}
              <div className="h-1.5 w-full bg-gradient-to-r from-whatsapp-400 via-whatsapp-500 to-emerald-600" />

              <div className="p-6 sm:p-7 space-y-5">

          {/* STEP 2: Search for business */}
          {step === 'search' && (
            <div key="search" className="animate-fade-in">
              {/* Header: title + selected plan summary */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold tracking-tight text-text-primary">
                    Search for a business
                  </h2>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    Enter the business name, phone number, or Business ID (e.g. WA-XXXXXX)
                  </p>
                </div>
                {planBadge}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                  placeholder="e.g. John's Plumbing or WA-7K3M9X"
                  className="input-field flex-1 min-w-0"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="btn-primary shrink-0 inline-flex items-center justify-center gap-2 px-4 sm:px-5"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
                      </svg>
                      <span className="hidden sm:inline text-sm">Search</span>
                    </>
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
              {/* Header: title + selected plan summary */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold tracking-tight text-text-primary">
                    Select the business you&apos;re paying for
                  </h2>
                  <p className="text-xs text-text-secondary mt-1">{results.length} businesses found</p>
                </div>
                {planBadge}
              </div>
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
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold tracking-tight text-text-primary">{selected.name}</p>
                    <p className="text-xs text-text-secondary truncate">
                      {selected.city || 'Zimbabwe'}
                      {selected.username && <> · @{selected.username}</>}
                    </p>
                  </div>
                  {planBadge}
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
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : 'Submit Payment Request'}
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
        )}
      </div>
    </div>
  )
}

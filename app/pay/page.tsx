'use client'

import { useState } from 'react'
import Link from 'next/link'
import LogoImage from '@/components/logo-image'

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
  const [step, setStep] = useState<'search' | 'select' | 'pay' | 'done'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Business[]>([])
  const [selected, setSelected] = useState<Business | null>(null)
  const [payerPhone, setPayerPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Payment request failed')
        return
      }
      setSuccess(data.message || 'Payment request submitted!')
      setStep('done')
    } catch {
      setError('Could not submit payment request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div className="text-center mb-8">
          <div className="bg-whatsapp-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-whatsapp-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary">Pay for a Listing</h1>
          <p className="text-text-secondary text-sm mt-2">
            Pay USD 1 via EcoCash to activate or renew a business listing on WA Directory.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-card p-6 space-y-5">
          {step === 'search' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Search for a business
                </label>
                <p className="text-xs text-text-secondary mb-3">
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
              </div>
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
              )}
            </>
          )}

          {step === 'select' && (
            <>
              <div>
                <p className="text-sm font-medium text-text-primary mb-1">Select the business you're paying for:</p>
                <p className="text-xs text-text-secondary mb-3">{results.length} businesses found</p>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {results.map(biz => (
                  <button
                    key={biz.id}
                    onClick={() => handleSelect(biz)}
                    className="w-full text-left p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-whatsapp-400 hover:bg-whatsapp-50 dark:hover:bg-whatsapp-950/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {biz.logo_url ? (
                        <LogoImage src={biz.logo_url} alt="" width={40} height={40} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-whatsapp-100 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-whatsapp-700">{biz.name.charAt(0)}</span>
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
                          ? 'bg-whatsapp-100 text-whatsapp-700'
                          : biz.payment_status === 'expired'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {biz.payment_status || 'active'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => { setStep('search'); setResults([]); setError('') }} className="btn-secondary w-full">
                Search again
              </button>
            </>
          )}

          {step === 'pay' && selected && (
            <>
              <div className="bg-whatsapp-50 dark:bg-whatsapp-950/40 border border-whatsapp-200 dark:border-whatsapp-800/50 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  {selected.logo_url ? (
                    <LogoImage src={selected.logo_url} alt="" width={48} height={48} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-whatsapp-100 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-whatsapp-700">{selected.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-base font-bold text-text-primary">{selected.name}</p>
                    <p className="text-xs text-text-secondary">
                      {selected.city || 'Zimbabwe'}
                      {selected.username && <> · @{selected.username}</>}
                    </p>
                    <p className="text-[10px] text-text-secondary font-mono">{selected.business_id}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Your EcoCash phone number
                </label>
                <p className="text-xs text-text-secondary mb-3">
                  Enter the number you're paying from. Admin will verify the EcoCash transaction from this number.
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

              <div className="bg-surface dark:bg-gray-800 rounded-2xl p-4 border border-gray-200/60 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">Listing activation</span>
                  <span className="text-sm font-bold text-text-primary">USD 1.00</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Covers your first month. Your listing goes live once admin confirms the EcoCash payment.
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setStep('search'); setResults([]); setError('') }} className="btn-secondary flex-1">
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
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="bg-whatsapp-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-whatsapp-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Payment Request Submitted!</h2>
              <p className="text-sm text-text-secondary mb-1">
                You're paying USD 1.00 for <strong>{selected?.name}</strong>
              </p>
              <p className="text-xs text-text-secondary mb-6">
                Admin will verify the EcoCash transaction from +{payerPhone.replace(/\D/g, '')} and activate the listing shortly.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">What happens next?</p>
                <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <li>1. Admin checks EcoCash for your transaction</li>
                  <li>2. Once confirmed, your listing goes live</li>
                  <li>3. You&apos;ll receive a WhatsApp confirmation</li>
                </ul>
              </div>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 text-white rounded-full px-6 py-3 text-sm font-medium shadow-sm hover:from-whatsapp-600 hover:to-whatsapp-700 transition-all"
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

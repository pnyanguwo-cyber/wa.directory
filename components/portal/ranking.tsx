'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface Spot {
  position: number
  businessId: string
  businessName: string
  monthlyFee: number
  periodStart: string
  periodEnd: string
  mine: boolean
}

interface CompetitionBid {
  id: string
  position: number
  amount: number
  status: string
  businessName: string
  mine: boolean
}

interface Bid {
  id: string
  position: number
  amount: number
  period: string
  status: string
  admin_feedback: string
  payer_phone?: string | null
  paynow_paid_at?: string | null
  created_at: string
}

const MIN_GAP = 0.1

export default function PortalRanking({
  businessId,
  myCategories,
  myCity,
  isRemote,
  cities,
}: {
  businessId: string
  myCategories: string[]
  myCity: string
  isRemote: boolean
  cities: string[]
}) {
  // Scope state: which of MY categories + which location I'm looking at.
  // Non-nationwide businesses are pinned to their own city.
  const [category, setCategory] = useState(myCategories[0] || '')
  const [city, setCity] = useState(myCity)

  const [spots, setSpots] = useState<Spot[]>([])
  const [competition, setCompetition] = useState<CompetitionBid[]>([])
  const [bids, setBids] = useState<Bid[]>([])
  const [minBid, setMinBid] = useState<number>(MIN_GAP)
  const [paymentsConfigured, setPaymentsConfigured] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [amount, setAmount] = useState('')
  const [payerPhone, setPayerPhone] = useState('')

  // Payment modal state: shown as a card in the middle of the screen with the
  // page blurred behind it.
  const [payBid, setPayBid] = useState<{ id: string; amount: number } | null>(null)
  const [payPhone, setPayPhone] = useState('')
  const [payStage, setPayStage] = useState<'entry' | 'waiting'>('entry')
  const [payInstructions, setPayInstructions] = useState('')
  const [payError, setPayError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)

  const canBid = myCategories.length > 0

  const load = useCallback(async function load(cat: string, loc: string) {
    if (!cat) return
    setLoadError('')
    try {
      const res = await fetch(
        `/api/portal/ranking?category=${encodeURIComponent(cat)}&city=${encodeURIComponent(loc)}`,
        { cache: 'no-store' }
      )
      const d = await res.json()
      if (!res.ok) {
        setLoadError(d.error || 'Could not load ranking data')
        setSpots([])
        setCompetition([])
        setBids([])
        setMinBid(MIN_GAP)
      } else {
        setSpots(d.spots || [])
        setCompetition(d.competition || [])
        setBids(d.bids || [])
        setMinBid(typeof d.minBid === 'number' ? d.minBid : MIN_GAP)
        setPaymentsConfigured(d.paymentsConfigured !== false)
      }
    } catch {
      setLoadError('Could not load ranking data: check your connection.')
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    load(category, city)
  }, [category, city, load])

  // Stop polling when the modal closes.
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  function openPaymentModal(bid: { id: string; amount: number }) {
    setPayBid(bid)
    setPayStage('entry')
    setPayPhone('')
    setPayInstructions('')
    setPayError('')
  }

  function closePaymentModal() {
    stopPolling()
    setPayBid(null)
    load(category, city)
  }

  // Submit the EcoCash number → Paynow pushes a PIN prompt → start polling.
  async function submitPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payBid) return
    setBusy(true)
    setPayError('')
    try {
      const res = await fetch('/api/portal/ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          city,
          amount: payBid.amount,
          payer_phone: payPhone.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPayError(data.error || 'Could not start the payment')
        return
      }
      if (data.payment_error) {
        setPayError(data.payment_error)
        return
      }
      setPayInstructions(data.instructions || '')
      setPayStage('waiting')
      // Poll for payment confirmation every 4 seconds, up to ~5 minutes.
      pollCountRef.current = 0
      stopPolling()
      pollRef.current = setInterval(async () => {
        pollCountRef.current += 1
        if (pollCountRef.current > 75) {
          stopPolling()
          setPayError('Payment is still pending. Check back in a few minutes.')
          return
        }
        try {
          const cres = await fetch('/api/portal/ranking/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bid_id: data.bid_id }),
          })
          const cdata = await cres.json()
          if (cres.ok && cdata.activated) {
            stopPolling()
            setPayBid(null)
            setNotice('Payment confirmed! You are now the #1 spot holder. 🎉')
            load(category, city)
          }
        } catch {
          // transient network error: keep polling
        }
      }, 4000)
    } catch {
      setPayError('Could not start the payment. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const myPending = bids.filter(b => b.status === 'pending')

  // Live auction board: bids grouped by status, highest first.
  const competitionSorted = useMemo(
    () => [...competition].sort((a, b) => b.amount - a.amount),
    [competition]
  )
  const leader = competitionSorted[0] || null

  if (myCategories.length === 0) {
    return (
      <div className="neo-card p-6 text-center">
        <h2 className="text-lg font-bold text-text-primary">Ranking & bidding</h2>
        <p className="text-sm text-text-secondary mt-2">
          Your listing has no categories yet. Add at least one category to your listing (Edit Listing) to compete for top spots.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Ranking & bidding</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          One auction, one prize: the #1 search spot for your category and location. Outbid the current holder by at least ${MIN_GAP.toFixed(2)}, pay with EcoCash, and you take #1 instantly.
        </p>
      </div>

      {/* Scope picker: my categories × my locations. Nationwide businesses get a
          location dropdown and bid one location at a time; everyone else is
          pinned to their own city. */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 shadow-card space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mb-1.5">Your categories</p>
          <div className="flex flex-wrap gap-2">
            {myCategories.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`h-9 px-4 rounded-2xl text-xs font-semibold border transition-all ${
                  category === c
                    ? 'bg-whatsapp-500 text-white border-whatsapp-500 shadow-md'
                    : 'bg-white dark:bg-gray-800 border-gray-200/80 dark:border-gray-700 text-text-secondary hover:bg-surface dark:hover:bg-gray-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mb-1.5">Location</p>
          {isRemote ? (
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="input-field text-sm max-w-xs"
              aria-label="Bid location"
            >
              <option value="">All Zimbabwe (nationwide)</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <span className="inline-flex items-center gap-1.5 h-9 px-4 rounded-2xl text-xs font-semibold bg-whatsapp-50 dark:bg-whatsapp-900/30 text-whatsapp-800 dark:text-whatsapp-300 border border-whatsapp-200 dark:border-whatsapp-700/40">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              {myCity || 'Nationwide'}
              <span className="font-normal text-text-secondary">: your listing&rsquo;s location</span>
            </span>
          )}
          {isRemote && (
            <p className="text-[11px] text-text-secondary mt-1.5">
              Your listing serves the whole country: pick a location above to see its board, then bid in each one separately.
            </p>
          )}
        </div>
      </div>

      {/* Current #1 holder */}
      <div className="rounded-2xl border p-5 shadow-card bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-gray-900 border-amber-200 dark:border-amber-800/50">
        {(() => {
          const spot = spots.find(s => s.position === 1)
          return (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">#1 Gold — current holder</p>
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                  {spot ? `$${spot.monthlyFee.toFixed(2)}/mo` : 'Open'}
                </span>
              </div>
              <p className="text-base font-bold text-text-primary mt-2 truncate">
                {spot ? (spot.mine ? 'Your business 🎉' : spot.businessName) : 'No holder yet'}
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {spot
                  ? `Held until ${spot.periodEnd}${spot.mine ? ': this is you — outbid yourself to raise the bar' : ' — outbid them by at least $' + MIN_GAP.toFixed(2) + ' to take the spot'}`
                  : `Minimum bid: $${MIN_GAP.toFixed(2)}`}
              </p>
            </>
          )
        })()}
      </div>

      {/* Live auction board */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-text-primary">Live auction board</p>
          <span className="text-[11px] text-text-secondary">
            {category}{city ? ` · ${city}` : ' · Nationwide'}
          </span>
        </div>
        {!loaded ? (
          <p className="text-xs text-text-secondary py-3">Loading bids…</p>
        ) : loadError ? (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{loadError}</p>
        ) : competition.length === 0 ? (
          <p className="text-xs text-text-secondary py-3">
            No bids yet for this category{city ? ` in ${city}` : ''}: the first paid bid takes #1.
          </p>
        ) : (
          <div className="space-y-1.5">
            {competitionSorted.map((b, i) => (
              <div
                key={b.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                  b.mine
                    ? 'bg-whatsapp-50 dark:bg-whatsapp-950/30 border-whatsapp-300 dark:border-whatsapp-700'
                    : 'bg-surface/60 dark:bg-gray-800/60 border-gray-200/70 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                    i === 0 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {i + 1}
                  </span>
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {b.mine ? 'Your business' : b.businessName}
                  </p>
                  {b.mine && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-whatsapp-700 dark:text-whatsapp-300 shrink-0">You</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-text-primary">${b.amount.toFixed(2)}</p>
                  <p className={`text-[10px] font-semibold capitalize ${
                    b.status === 'approved' || b.status === 'paid'
                      ? 'text-whatsapp-700 dark:text-whatsapp-300'
                      : b.status === 'outbid'
                        ? 'text-gray-400'
                        : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {b.status === 'pending' ? 'awaiting payment' : b.status}
                  </p>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-text-secondary pt-1">
              {leader
                ? `${leader.mine ? 'You lead' : `${leader.businessName} leads`} with $${leader.amount.toFixed(2)}. Bid at least $${(leader.amount + MIN_GAP).toFixed(2)} to take the lead.`
                : ''}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
      )}
      {notice && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{notice}</p>
      )}

      {/* Bid form: amount only — payment happens in the modal card */}
      {canBid && (
        <form
          onSubmit={e => {
            e.preventDefault()
            const fee = Number(amount)
            setError('')
            if (!Number.isFinite(fee) || fee < minBid) {
              setError(minBid > MIN_GAP
                ? `Your bid must be at least $${minBid.toFixed(2)} to beat the current #1.`
                : `Minimum bid is $${minBid.toFixed(2)}.`)
              return
            }
            openPaymentModal({ id: '', amount: fee })
          }}
          className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-card space-y-4"
        >
          <div>
            <p className="text-sm font-bold text-text-primary">
              Bid for #1: {category}{city ? `, ${city}` : ' (nationwide)'}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {minBid > MIN_GAP
                ? `Current #1 fee is $${(minBid - MIN_GAP).toFixed(2)} — you must bid at least $${minBid.toFixed(2)}.`
                : `This spot is open — minimum bid is $${minBid.toFixed(2)}.`}
              {' '}You&rsquo;ll pay with EcoCash right after this.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Your monthly fee (USD)
            </label>
            <input
              type="number"
              min={minBid.toFixed(2)}
              step="0.05"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="input-field"
              placeholder={minBid.toFixed(2)}
              autoFocus
            />
            <p className="text-[11px] text-text-secondary mt-1.5">
              Must exceed the #1 fee by at least ${MIN_GAP.toFixed(2)} (10 cents). Bids equal to or below the current #1 are not allowed.
            </p>
          </div>
          <button type="submit" className="btn-primary w-full py-3 text-sm font-semibold">
            Bid &amp; pay with EcoCash
          </button>
        </form>
      )}

      {/* My bids with payment retry */}
      {myPending.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-text-primary">My unpaid bids</p>
          {myPending.map(b => (
            <div key={b.id} className="bg-white dark:bg-gray-900 border border-amber-200/70 dark:border-amber-800/40 rounded-2xl p-4 shadow-card flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-extrabold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                  #1
                </span>
                <div>
                  <p className="text-sm font-bold text-text-primary">${Number(b.amount).toFixed(2)}/month</p>
                  <p className="text-[11px] text-text-secondary">Awaiting EcoCash payment · {b.period}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openPaymentModal({ id: b.id, amount: Number(b.amount) })}
                className="h-9 px-4 bg-whatsapp-500 hover:bg-whatsapp-600 text-white text-xs font-semibold rounded-2xl"
              >
                Pay now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ===== Payment modal: card centered, background blurred ===== */}
      {payBid && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-md animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="EcoCash payment"
        >
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white dark:border-gray-700">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-whatsapp-400 to-whatsapp-600 flex items-center justify-center shadow-lg mb-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-text-primary">Pay to claim #1</h2>
              <p className="text-xs text-text-secondary mt-1">
                {category}{city ? ` · ${city}` : ' · Nationwide'} · <span className="font-bold text-text-primary">${payBid.amount.toFixed(2)}/month</span>
              </p>
            </div>

            {!paymentsConfigured && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                Online payments are not enabled yet: your bid will be confirmed manually by an admin.
              </p>
            )}

            {payStage === 'entry' ? (
              <form onSubmit={submitPayment} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Your EcoCash number
                  </label>
                  <p className="text-[11px] text-text-secondary mb-2">
                    You&rsquo;ll get a PIN prompt on this phone — enter it to approve the payment. Payment is attached to your bid: once it goes through you become #1 instantly (if you outbid the current holder).
                  </p>
                  <input
                    type="tel"
                    value={payPhone}
                    onChange={e => { setPayPhone(e.target.value.replace(/[^0-9+ ]/g, '')); setPayError('') }}
                    placeholder="e.g. 0771234567"
                    className="input-field"
                    autoFocus
                    required
                  />
                </div>
                {payError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{payError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={closePaymentModal} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={busy} className="btn-primary flex-1">
                    {busy ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Starting…
                      </span>
                    ) : `Pay $${payBid.amount.toFixed(2)}`}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-center">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 bg-whatsapp-400/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-16 h-16 rounded-full border-4 border-whatsapp-100 dark:border-whatsapp-900 border-t-whatsapp-500 animate-spin" />
                </div>
                <p className="text-sm font-bold text-text-primary">Waiting for your EcoCash PIN…</p>
                {payInstructions && (
                  <p className="text-xs text-text-secondary bg-surface dark:bg-gray-800 rounded-xl px-4 py-2.5 leading-relaxed">{payInstructions}</p>
                )}
                <p className="text-[11px] text-text-secondary">
                  Approve the prompt on your phone. This page updates automatically — you&rsquo;ll become #1 the moment the payment lands.
                </p>
                {payError && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">{payError}</p>
                )}
                <button type="button" onClick={closePaymentModal} className="btn-secondary w-full">
                  Close and check later
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

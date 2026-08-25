'use client'

import { useEffect, useState } from 'react'

interface Spot {
  position: number
  businessId: string
  businessName: string
  businessSlug: string
  monthlyFee: number
  periodStart: string
  periodEnd: string
  mine: boolean
}

interface Bid {
  id: string
  position: number
  amount: number
  period: string
  status: string
  admin_feedback: string
  created_at: string
}

const POSITION_INFO = [
  { pos: 1, label: 'Gold', subtitle: 'Top of search — outbid the current #1 fee' },
  { pos: 2, label: 'Silver', subtitle: 'Second spot — must be less than the #1 fee' },
  { pos: 3, label: 'Bronze', subtitle: 'Third spot — must be less than the #2 fee' },
]

export default function PortalRanking({ businessId, category, city, spots }: {
  businessId: string
  category: string
  city: string
  spots: Spot[]
}) {
  const [bids, setBids] = useState<Bid[]>([])
  const [currentFees, setCurrentFees] = useState<{ one: number | null; two: number | null; three: number | null }>({ one: null, two: null, three: null })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedPos, setSelectedPos] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [fallbackPos, setFallbackPos] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/portal/ranking?category=${encodeURIComponent(category)}&city=${encodeURIComponent(city)}`)
      .then(r => r.json())
      .then(d => {
        setBids(d.bids || [])
        setCurrentFees(d.currentFees || { one: null, two: null, three: null })
      })
      .catch(() => {})
  }, [category, city])

  async function submitBid(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPos) return
    setBusy(true)
    setError('')
    setNotice('')
    const res = await fetch('/api/portal/ranking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, city, position: selectedPos, amount, fallback_position: selectedPos === 1 ? fallbackPos : null }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Could not submit bid')
      return
    }
    setNotice(`Bid submitted for position #${selectedPos} (next month). An admin will review it.`)
    setAmount('')
    setSelectedPos(null)
    const d = await fetch(`/api/portal/ranking?category=${encodeURIComponent(category)}&city=${encodeURIComponent(city)}`).then(r => r.json())
    setBids(d.bids || [])
  }

  const myPending = bids.filter(b => b.status === 'pending')
  const feeHint = (pos: number): string => {
    if (pos === 1) return currentFees.one ? `Must be above $${currentFees.one.toFixed(2)} (current #1)` : 'You set the first fee — bid anything'
    if (pos === 2) return `Must be below $${(currentFees.one ?? 0).toFixed(2)} (#1 fee)`
    if (pos === 3) return `Must be below $${(currentFees.two ?? currentFees.one ?? 0).toFixed(2)} (#2 fee)`
    return ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Ranking & bidding</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Top 3 spots in “{category}”{city ? ` in ${city}` : ''} for the current month. Bids are for next month and are confirmed by an admin near month-end.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {POSITION_INFO.map(p => {
          const spot = spots.find(s => s.position === p.pos)
          return (
            <div
              key={p.pos}
              className={`rounded-2xl border p-4 shadow-card ${
                p.pos === 1
                  ? 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-gray-900 border-amber-200 dark:border-amber-800/50'
                  : p.pos === 2
                    ? 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700'
                    : 'bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/40 dark:to-gray-900 border-orange-200 dark:border-orange-800/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-sm font-extrabold ${p.pos === 1 ? 'text-amber-600 dark:text-amber-400' : p.pos === 2 ? 'text-gray-500 dark:text-gray-400' : 'text-orange-700 dark:text-orange-400'}`}>
                  #{p.pos} {p.label}
                </p>
                <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                  {spot ? `$${spot.monthlyFee.toFixed(2)}/mo` : 'Open'}
                </span>
              </div>
              <p className="text-sm font-bold text-text-primary mt-2 truncate">
                {spot ? spot.businessName : 'No holder yet'}
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {spot ? `Held until ${spot.periodEnd}` : p.subtitle}
              </p>
            </div>
          )
        })}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
      )}
      {notice && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{notice}</p>
      )}

      <form onSubmit={submitBid} className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-card space-y-4">
        <div>
          <p className="text-sm font-bold text-text-primary">Bid for next month</p>
          <p className="text-xs text-text-secondary mt-0.5">
            Choose a position and set your monthly fee. Your bid stays pending until an admin approves it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {POSITION_INFO.map(p => (
            <button
              key={p.pos}
              type="button"
              onClick={() => {
                setSelectedPos(p.pos)
                setFallbackPos(null)
                setError('')
              }}
              className={`h-10 px-4 rounded-2xl text-xs font-semibold border transition-all ${
                selectedPos === p.pos
                  ? 'bg-whatsapp-500 text-white border-whatsapp-500 shadow-md'
                  : 'bg-white dark:bg-gray-800 border-gray-200/80 dark:border-gray-700 text-text-secondary hover:bg-surface dark:hover:bg-gray-700'
              }`}
            >
              Position #{p.pos}
            </button>
          ))}
        </div>
        {selectedPos && (
          <>
            {selectedPos === 1 && (
              <div>
                <p className="text-xs text-text-secondary mb-2">If I don't get #1, I'd like:</p>
                <div className="flex gap-2">
                  {[null, 2, 3].map(pos => (
                    <button
                      key={String(pos)}
                      type="button"
                      onClick={() => setFallbackPos(pos)}
                      className={`h-9 px-4 rounded-2xl text-xs font-semibold border transition-all ${
                        fallbackPos === pos
                          ? 'bg-whatsapp-500 text-white border-whatsapp-500 shadow-md'
                          : 'bg-white dark:bg-gray-800 border-gray-200/80 dark:border-gray-700 text-text-secondary hover:bg-surface dark:hover:bg-gray-700'
                      }`}
                    >
                      {pos === null ? 'None' : `#${pos}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Monthly fee (USD) — {feeHint(selectedPos)}
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="input-field"
                placeholder="e.g. 15"
                autoFocus
              />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-sm font-semibold">
              {busy ? 'Submitting...' : `Submit bid for position #${selectedPos}`}
            </button>
          </>
        )}
      </form>

      {myPending.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-text-primary">My bids for next month</p>
          {bids.map(b => (
            <div key={b.id} className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 shadow-card flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-extrabold ${
                  b.position === 1 ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300' : b.position === 2 ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' : 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300'
                }`}>
                  #{b.position}
                </span>
                <div>
                  <p className="text-sm font-bold text-text-primary">${Number(b.amount).toFixed(2)}/month</p>
                  <p className="text-[11px] text-text-secondary">
                    Period: {b.period} · Status:{' '}
                    <span className={`font-semibold capitalize ${b.status === 'pending' ? 'text-amber-600' : b.status === 'approved' ? 'text-whatsapp-700' : b.status === 'rejected' ? 'text-red-600' : 'text-text-secondary'}`}>
                      {b.status}
                    </span>
                  </p>
                  {b.admin_feedback && (
                    <p className="text-[11px] text-text-secondary mt-0.5">Admin: {b.admin_feedback}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
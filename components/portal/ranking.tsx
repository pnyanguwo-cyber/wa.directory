'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

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
  created_at: string
}

const POSITION_INFO = [
  { pos: 1, label: 'Gold', subtitle: 'Top of search: outbid the current #1 fee' },
  { pos: 2, label: 'Silver', subtitle: 'Second spot: must be less than the #1 fee' },
  { pos: 3, label: 'Bronze', subtitle: 'Third spot: must be less than the #2 fee' },
]

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
  const [city, setCity] = useState(isRemote ? myCity : myCity)

  const [spots, setSpots] = useState<Spot[]>([])
  const [competition, setCompetition] = useState<CompetitionBid[]>([])
  const [bids, setBids] = useState<Bid[]>([])
  const [currentFees, setCurrentFees] = useState<{ one: number | null; two: number | null; three: number | null }>({ one: null, two: null, three: null })
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedPos, setSelectedPos] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [fallbackPos, setFallbackPos] = useState<number | null>(null)

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
        setCurrentFees({ one: null, two: null, three: null })
      } else {
        setSpots(d.spots || [])
        setCompetition(d.competition || [])
        setBids(d.bids || [])
        setCurrentFees(d.currentFees || { one: null, two: null, three: null })
      }
    } catch {
      setLoadError('Could not load ranking data: check your connection.')
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    load(category, city)
  }, [category, city, load])

  async function reloadBoard() {
    await load(category, city)
  }

  async function submitBid(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPos) return
    setBusy(true)
    setError('')
    setNotice('')
    const res = await fetch('/api/portal/ranking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        city,
        position: selectedPos,
        amount,
        fallback_position: selectedPos === 1 ? fallbackPos : null,
      }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Could not submit bid')
      return
    }
    setNotice(`Bid submitted for position #${selectedPos}: ${category}${city ? ` in ${city}` : ' (nationwide)'}. An admin will review it.`)
    setAmount('')
    setSelectedPos(null)
    reloadBoard()
  }

  const myPending = bids.filter(b => b.status === 'pending')

  // Competition board: next month's bids grouped per position, highest first.
  const competitionByPos = useMemo(() => {
    const map = new Map<number, CompetitionBid[]>()
    for (const b of competition) {
      if (!map.has(b.position)) map.set(b.position, [])
      map.get(b.position)!.push(b)
    }
    for (const list of map.values()) list.sort((a, b) => b.amount - a.amount)
    return map
  }, [competition])

  const feeHint = (pos: number): string => {
    if (pos === 1) return currentFees.one ? `Must be above $${currentFees.one.toFixed(2)} (current #1)` : 'You set the first fee: bid anything'
    if (pos === 2) return `Must be below $${(currentFees.one ?? 0).toFixed(2)} (#1 fee)`
    if (pos === 3) return `Must be below $${(currentFees.two ?? currentFees.one ?? 0).toFixed(2)} (#2 fee)`
    return ''
  }

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
          Top 3 spots per category and location, sold monthly by bid. You compete only against businesses in the same category and location as you.
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

      {/* Current top-3 holders for the selected scope */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {POSITION_INFO.map(p => {
          const spot = spots.find(s => s.position === p.pos)
          return (
            <div
              key={p.pos}
              className={`rounded-2xl border p-4 shadow-card ${
                spot?.mine
                  ? 'bg-gradient-to-br from-whatsapp-50 to-white dark:from-whatsapp-950/40 dark:to-gray-900 border-whatsapp-400 dark:border-whatsapp-600'
                  : p.pos === 1
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
                {spot ? (spot.mine ? 'Your business 🎉' : spot.businessName) : 'No holder yet'}
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {spot ? `Held until ${spot.periodEnd}${spot.mine ? ': this is you' : ''}` : p.subtitle}
              </p>
            </div>
          )
        })}
      </div>

      {/* Competition board: who else is bidding for next month in this scope */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-text-primary">Next month&rsquo;s bids</p>
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
            No bids yet for this category{city ? ` in ${city}` : ''} next month: the first bid leads the board.
          </p>
        ) : (
          <div className="space-y-2">
            {POSITION_INFO.map(p => {
              const list = competitionByPos.get(p.pos) || []
              if (list.length === 0) return null
              return (
                <div key={p.pos}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mb-1.5">
                    Position #{p.pos}
                  </p>
                  <div className="space-y-1.5">
                    {list.map((b, i) => (
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
                          <p className={`text-[10px] font-semibold capitalize ${b.status === 'approved' ? 'text-whatsapp-700 dark:text-whatsapp-300' : 'text-amber-600 dark:text-amber-400'}`}>
                            {b.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <p className="text-[11px] text-text-secondary pt-1">
              Higher bids win #1; the ladder fills #2 and #3 below it. Bids are confirmed by an admin near month-end.
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

      {canBid && (
        <form onSubmit={submitBid} className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-card space-y-4">
          <div>
            <p className="text-sm font-bold text-text-primary">
              Bid for next month: {category}{city ? `, ${city}` : ' (nationwide)'}
            </p>
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
                  <p className="text-xs text-text-secondary mb-2">If I don&rsquo;t get #1, I&rsquo;d like:</p>
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
                  Monthly fee (USD): {feeHint(selectedPos)}
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
      )}

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

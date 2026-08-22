'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog, adminFetch, AdminSectionHeader } from './shared'

interface BizRef {
  id: string
  name: string
  slug: string
  phone: string
}

interface Spot {
  id: string
  business_id: string
  category: string
  city: string
  position: number
  monthly_fee: number
  period_start: string
  period_end: string
  status: string
  payment_confirmed_at: string | null
  created_at: string
  business: BizRef | null
}

interface Bid {
  id: string
  business_id: string
  category: string
  city: string
  position: number
  amount: number
  period: string
  status: string
  admin_feedback: string
  fallback_position: number | null
  created_at: string
  business: BizRef | null
}

export default function AdminRankings() {
  const router = useRouter()
  const [spots, setSpots] = useState<Spot[]>([])
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [showOverride, setShowOverride] = useState(false)
  const [rejecting, setRejecting] = useState<Bid | null>(null)
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [overrideBiz, setOverrideBiz] = useState('')
  const [overrideCategory, setOverrideCategory] = useState('')
  const [overrideCity, setOverrideCity] = useState('')
  const [overridePosition, setOverridePosition] = useState(1)
  const [overrideFee, setOverrideFee] = useState('')
  const [overrideDays, setOverrideDays] = useState('30')
  const [overrideMode, setOverrideMode] = useState<'days' | 'dates'>('days')
  const [overrideStart, setOverrideStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [overrideEnd, setOverrideEnd] = useState(() => {
    const d = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  })
  const [payingBid, setPayingBid] = useState<Bid | null>(null)
  const [payFee, setPayFee] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/rankings')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setSpots(data.spots || [])
    setBids(data.bids || [])
    setLoading(false)
  }

  async function act(action: string, payload: Record<string, unknown>) {
    setBusy(true)
    setMessage('')
    const method = action === 'reject_bid' || action === 'expire_spot' || action === 'delete_bid' ? 'PATCH' : 'POST'
    const { ok, data } = await adminFetch('/api/admin/rankings', {
      method,
      body: JSON.stringify({ action, ...payload }),
    })
    setBusy(false)
    if (!ok) {
      setMessage(data?.error || 'Action failed')
      return
    }
    setShowOverride(false)
    setPayingBid(null)
    setRejecting(null)
    setMessage('Saved.')
    load()
  }

  const groupedSpots = spots.reduce<Record<string, Spot[]>>((acc, s) => {
    const key = `${s.category}|||${s.city || ''}`
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const pendingBids = bids.filter(b => b.status === 'pending')
  const statusStyle = (status: string) =>
    status === 'active' ? 'bg-whatsapp-50 text-whatsapp-800 border-whatsapp-200'
    : status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-gray-100 text-gray-500 border-gray-200'

  return (
    <div className="space-y-6">
      {showOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white">
            <h2 className="text-lg font-bold text-text-primary">Place business manually</h2>
            <form onSubmit={e => { e.preventDefault(); act('override', {
              business_id: overrideBiz, category: overrideCategory, city: overrideCity,
              position: overridePosition, monthly_fee: Number(overrideFee || 0),
              period_start: overrideMode === 'dates' ? overrideStart : new Date().toISOString().slice(0, 10),
              period_end: overrideMode === 'dates'
                ? overrideEnd
                : new Date(Date.now() + (Math.max(1, Number(overrideDays) || 30) - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            }) }} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Business ID</label>
                <input value={overrideBiz} onChange={e => setOverrideBiz(e.target.value)} className="input-field text-sm" placeholder="uuid" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Category</label>
                  <input value={overrideCategory} onChange={e => setOverrideCategory(e.target.value)} className="input-field text-sm" required />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">City (blank = national)</label>
                  <input value={overrideCity} onChange={e => setOverrideCity(e.target.value)} className="input-field text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Position</label>
                  <select value={overridePosition} onChange={e => setOverridePosition(Number(e.target.value))} className="input-field text-sm">
                    <option value={1}>#1</option>
                    <option value={2}>#2</option>
                    <option value={3}>#3</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary mb-1 block">Monthly fee</label>
                  <input type="number" min="0" step="0.5" value={overrideFee} onChange={e => setOverrideFee(e.target.value)} className="input-field text-sm" placeholder="e.g. 20" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">Period</label>
                <div className="flex gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setOverrideMode('days')}
                    className={`h-8 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      overrideMode === 'days' ? 'bg-whatsapp-500 text-white border-whatsapp-500' : 'bg-white border-gray-200/80 text-text-secondary'
                    }`}
                  >
                    Duration (days)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideMode('dates')}
                    className={`h-8 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      overrideMode === 'dates' ? 'bg-whatsapp-500 text-white border-whatsapp-500' : 'bg-white border-gray-200/80 text-text-secondary'
                    }`}
                  >
                    Custom dates
                  </button>
                </div>
                {overrideMode === 'days' ? (
                  <div>
                    <input
                      type="number"
                      min="1"
                      value={overrideDays}
                      onChange={e => setOverrideDays(e.target.value)}
                      className="input-field text-sm"
                    />
                    <p className="text-[11px] text-text-secondary mt-1">Days from today — default is 30.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">Start</label>
                      <input type="date" value={overrideStart} onChange={e => setOverrideStart(e.target.value)} className="input-field text-sm" required />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-text-secondary mb-1 block">End</label>
                      <input type="date" value={overrideEnd} onChange={e => setOverrideEnd(e.target.value)} className="input-field text-sm" required />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setShowOverride(false)} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={busy} className="btn-primary h-10 px-5 text-xs font-semibold">{busy ? 'Saving...' : 'Place spot'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white">
            <h2 className="text-lg font-bold text-text-primary">Reject bid</h2>
            <p className="text-xs text-text-secondary">
              {rejecting.business?.name} — #{rejecting.position} in {rejecting.category}{rejecting.city ? `, ${rejecting.city}` : ''} for ${Number(rejecting.amount).toFixed(2)}
              {rejecting.fallback_position && <span className="ml-1 text-amber-600">(fallback #{rejecting.fallback_position} will be auto-submitted)</span>}
            </p>
            <textarea
              value={rejectFeedback}
              onChange={e => setRejectFeedback(e.target.value)}
              rows={3}
              className="input-field text-sm resize-none"
              placeholder="Feedback to the business (optional)"
            />
            <div className="flex gap-2.5 justify-end pt-2">
              <button type="button" onClick={() => setRejecting(null)} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
              <button type="button" disabled={busy} onClick={() => act('reject_bid', { bid_id: rejecting.id, feedback: rejectFeedback })} className="h-10 px-5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-2xl">
                {busy ? 'Saving...' : 'Reject bid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {payingBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white">
            <h2 className="text-lg font-bold text-text-primary">Confirm payment & activate</h2>
            <p className="text-xs text-text-secondary">
              {payingBid.business?.name} — #{payingBid.position} in {payingBid.category}{payingBid.city ? `, ${payingBid.city}` : ''} for {payingBid.period}
            </p>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Monthly fee (defaults to bid amount)</label>
              <input type="number" min="0" step="0.5" value={payFee} onChange={e => setPayFee(e.target.value)} className="input-field text-sm" placeholder={String(Number(payingBid.amount).toFixed(2))} />
            </div>
            <div className="flex gap-2.5 justify-end pt-2">
              <button type="button" onClick={() => setPayingBid(null)} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
              <button type="button" disabled={busy} onClick={() => act('place', { bid_paid: true, bid_id: payingBid.id, monthly_fee: Number(payFee || payingBid.amount) })} className="h-10 px-5 bg-whatsapp-500 hover:bg-whatsapp-600 text-white text-xs font-semibold rounded-2xl">
                {busy ? 'Activating...' : 'Mark paid & activate'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminSectionHeader
        title="Rankings & Bids"
        subtitle={`${spots.length} spots · ${pendingBids.length} pending bids`}
        action={
          <button onClick={() => setShowOverride(true)} className="btn-primary h-10 px-4 text-xs font-semibold">
            Place manually
          </button>
        }
      />

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{message}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="neo-card p-4">
            <h3 className="text-sm font-bold text-text-primary mb-3">Pending bids</h3>
            {pendingBids.length === 0 ? (
              <p className="text-xs text-text-secondary">No pending bids.</p>
            ) : (
              <div className="space-y-2.5">
                {pendingBids.map(b => (
                  <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200/80 bg-surface/50 px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-text-primary truncate">{b.business?.name || 'Unknown'}</p>
                      <p className="text-[11px] text-text-secondary">
                        #{b.position} · {b.category}{b.city ? `, ${b.city}` : ' · nationwide'} · period {b.period}
                        {b.fallback_position && <span className="ml-1 text-amber-600">→ fallback #{b.fallback_position}</span>}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-whatsapp-700">${Number(b.amount).toFixed(2)}/mo</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setPayingBid(b); setPayFee(String(Number(b.amount).toFixed(2))) }} className="h-9 px-3.5 bg-whatsapp-500 hover:bg-whatsapp-600 text-white text-xs font-semibold rounded-2xl">
                        Approve & mark paid
                      </button>
                      <button onClick={() => setRejecting(b)} className="btn-secondary h-9 px-3.5 text-xs font-semibold">
                        Reject
                      </button>
                      <button onClick={() => act('delete_bid', { bid_id: b.id })} title="Delete" className="w-9 h-9 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {Object.entries(groupedSpots).map(([key, list]) => {
            const [category, city] = key.split('|||')
            return (
              <div key={key} className="neo-card p-4">
                <h3 className="text-sm font-bold text-text-primary mb-3">
                  {category} {city ? `· ${city}` : '· nationwide'}
                  <span className="text-text-secondary font-normal text-xs ml-1.5">({list.length})</span>
                </h3>
                <div className="space-y-2">
                  {list.sort((a, b) => a.position - b.position).map(s => (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200/80 bg-surface/50 px-3.5 py-2.5">
                      <span className="w-8 h-8 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-xs font-extrabold">
                        #{s.position}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-text-primary truncate">{s.business?.name || 'Unknown'}</p>
                        <p className="text-[11px] text-text-secondary">
                          ${Number(s.monthly_fee).toFixed(2)}/mo · {s.period_start} → {s.period_end}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize ${statusStyle(s.status)}`}>
                        {s.status}
                      </span>
                      {s.status === 'pending' && (
                        <button onClick={() => act('place', { rank_spot_id: s.id })} className="h-9 px-3.5 bg-whatsapp-500 hover:bg-whatsapp-600 text-white text-xs font-semibold rounded-2xl">
                          Mark paid
                        </button>
                      )}
                      {s.status === 'active' && (
                        <button onClick={() => act('expire_spot', { spot_id: s.id })} className="btn-secondary h-9 px-3.5 text-xs font-semibold">
                          Expire
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="neo-card p-4">
            <h3 className="text-sm font-bold text-text-primary mb-3">Recent bids (all statuses)</h3>
            {bids.length === 0 ? (
              <p className="text-xs text-text-secondary">No bids yet.</p>
            ) : (
              <div className="space-y-1.5">
                {bids.slice(0, 15).map(b => (
                  <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 px-3 py-2">
                    <span className={`w-2 h-2 rounded-full ${b.status === 'pending' ? 'bg-amber-500' : b.status === 'approved' ? 'bg-whatsapp-500' : b.status === 'rejected' ? 'bg-red-500' : 'bg-gray-400'}`} />
                    <p className="text-xs font-bold text-text-primary truncate flex-1 min-w-0">{b.business?.name || 'Unknown'}</p>
                    <p className="text-[11px] text-text-secondary">#{b.position} · {b.category}{b.city ? `, ${b.city}` : ''} · {b.period}{b.fallback_position ? ` · fallback #${b.fallback_position}` : ''}</p>
                    <p className="text-xs font-extrabold text-whatsapp-700">${Number(b.amount).toFixed(2)}</p>
                    <span className={`text-[10px] font-bold uppercase capitalize px-2 py-0.5 rounded-full border ${statusStyle(b.status)}`}>{b.status}</span>
                    {b.admin_feedback && <p className="text-[11px] text-text-secondary italic w-full">“{b.admin_feedback}”</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
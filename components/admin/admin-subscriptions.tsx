'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog, adminFetch, AdminSectionHeader } from './shared'

interface Subscription {
  id: string
  business_id: string
  status: string
  amount: number
  started_at: string | null
  expires_at: string | null
  admin_note: string
  created_at: string
  business: { id: string; name: string; slug: string; phone: string } | null
}

interface ListingSubscription {
  id: string
  business_id: string
  status: string
  amount: number
  payer_phone: string
  started_at: string | null
  expires_at: string | null
  created_at: string
  business: { id: string; name: string; slug: string; phone: string; business_id: string; username: string; city: string; payment_status: string } | null
}

type Tab = 'listing' | 'premium'

export default function AdminSubscriptions() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('listing')
  const [rows, setRows] = useState<Subscription[]>([])
  const [listingRows, setListingRows] = useState<ListingSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmCancel, setConfirmCancel] = useState<Subscription | ListingSubscription | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'expired'>('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/subscriptions')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setRows(data.subscriptions || [])
    setListingRows(data.listingSubscriptions || [])
    setLoading(false)
  }

  async function act(action: string, payload: Record<string, unknown>) {
    setBusy(true)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
    })
    setBusy(false)
    if (!ok) {
      setMessage(data?.error || 'Action failed')
      return
    }
    setConfirmCancel(null)
    setMessage('Saved.')
    load()
  }

  const statusStyle: Record<string, string> = {
    active: 'bg-whatsapp-50 text-whatsapp-800 border-whatsapp-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  }

  const filteredListing = listingRows.filter(s => filter === 'all' || s.status === filter)
  const listingCounts = listingRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {confirmCancel && (
        <ConfirmDialog
          message={`Cancel the subscription for "${('business' in confirmCancel ? confirmCancel.business?.name : null) || 'this business'}"?`}
          onConfirm={() => {
            if ('payer_phone' in confirmCancel) {
              act('cancel_listing', { subscription_id: confirmCancel.id })
            } else {
              act('cancel', { subscription_id: confirmCancel.id })
            }
          }}
          onCancel={() => setConfirmCancel(null)}
        />
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1.5 bg-surface dark:bg-gray-800 rounded-xl p-1">
        <button
          onClick={() => setTab('listing')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            tab === 'listing' ? 'bg-white dark:bg-gray-700 shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Listing Payments ({listingRows.length})
        </button>
        <button
          onClick={() => setTab('premium')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            tab === 'premium' ? 'bg-white dark:bg-gray-700 shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Premium Subscriptions ({rows.length})
        </button>
      </div>

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{message}</p>
      )}

      {tab === 'listing' && (
        <>
          <AdminSectionHeader
            title="Listing Payments"
            subtitle={`${listingRows.length} total · ${listingCounts.pending || 0} pending · ${listingCounts.active || 0} active · ${listingCounts.expired || 0} expired`}
          />

          {/* Filter */}
          <div className="flex gap-1.5">
            {(['all', 'pending', 'active', 'expired'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-all ${
                  filter === f
                    ? 'bg-whatsapp-500 text-white shadow-md'
                    : 'bg-white border border-gray-200/80 text-text-secondary hover:bg-surface'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && listingCounts.pending ? ` (${listingCounts.pending})` : ''}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}
            </div>
          ) : filteredListing.length === 0 ? (
            <div className="neo-card p-8 text-center">
              <p className="text-sm font-semibold text-text-primary">No listing payments</p>
              <p className="text-xs text-text-secondary mt-1">When businesses submit listings, payment requests appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredListing.map(s => (
                <div key={s.id} className="neo-card p-4 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-text-primary truncate">{s.business?.name || 'Unknown'}</p>
                      {s.business?.username && (
                        <span className="text-xs text-text-secondary font-mono">@{s.business.username}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      {s.business?.business_id && <>{s.business.business_id} · </>}
                      {s.business?.city || 'N/A'}
                      {s.payer_phone && <> · Payer: +{s.payer_phone}</>}
                      {s.started_at && <> · Since {new Date(s.started_at).toLocaleDateString()}</>}
                      {s.expires_at && <> · Expires {new Date(s.expires_at).toLocaleDateString()}</>}
                    </p>
                    <p className="text-[11px] text-text-secondary">
                      Requested {new Date(s.created_at).toLocaleDateString()} · ${Number(s.amount || 0).toFixed(2)}
                    </p>
                  </div>

                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize ${statusStyle[s.status] || statusStyle.cancelled}`}>
                    {s.status}
                  </span>

                  {s.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => act('confirm_listing_payment', { subscription_id: s.id })}
                        disabled={busy}
                        className="h-9 px-3.5 bg-whatsapp-500 hover:bg-whatsapp-600 text-white text-xs font-semibold rounded-2xl"
                      >
                        Confirm Payment
                      </button>
                      <button
                        onClick={() => setConfirmCancel(s)}
                        className="btn-secondary h-9 px-3.5 text-xs font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {s.status === 'active' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => act('extend_listing', { subscription_id: s.id, days: 30 })}
                        disabled={busy}
                        className="h-9 px-3.5 bg-whatsapp-50 hover:bg-whatsapp-100 text-whatsapp-700 border border-whatsapp-200 text-xs font-semibold rounded-2xl"
                      >
                        +30 days
                      </button>
                      <button
                        onClick={() => setConfirmCancel(s)}
                        className="btn-secondary h-9 px-3.5 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {s.status === 'expired' && (
                    <button
                      onClick={() => act('extend_listing', { subscription_id: s.id, days: 30 })}
                      disabled={busy}
                      className="h-9 px-3.5 bg-whatsapp-50 hover:bg-whatsapp-100 text-whatsapp-700 border border-whatsapp-200 text-xs font-semibold rounded-2xl"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'premium' && (
        <>
          <AdminSectionHeader
            title="Premium Subscriptions"
            subtitle={`${rows.length} total · Portal features (stats, conversations, bidding)`}
          />

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="neo-card p-8 text-center">
              <p className="text-sm font-semibold text-text-primary">No subscriptions yet</p>
              <p className="text-xs text-text-secondary mt-1">When businesses request an upgrade, they appear here.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {rows.map(s => (
                <div key={s.id} className="neo-card p-4 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-text-primary truncate">{s.business?.name || 'Unknown business'}</p>
                    <p className="text-[11px] text-text-secondary">
                      Requested {new Date(s.created_at).toLocaleDateString()}
                      {s.started_at && <> · active since {new Date(s.started_at).toLocaleDateString()}</>}
                      {s.expires_at && <> · expires {new Date(s.expires_at).toLocaleDateString()}</>}
                      {' · '}${Number(s.amount || 0).toFixed(2)}/mo
                    </p>
                    {s.admin_note && <p className="text-[11px] text-text-secondary italic mt-0.5">Note: {s.admin_note}</p>}
                  </div>

                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize ${statusStyle[s.status] || statusStyle.cancelled}`}>
                    {s.status}
                  </span>

                  {s.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => act('activate', { subscription_id: s.id, amount: s.amount })} className="h-9 px-3.5 bg-whatsapp-500 hover:bg-whatsapp-600 text-white text-xs font-semibold rounded-2xl">
                        Mark paid & activate
                      </button>
                      <button onClick={() => setConfirmCancel(s)} className="btn-secondary h-9 px-3.5 text-xs font-semibold">
                        Reject
                      </button>
                    </div>
                  )}

                  {s.status === 'active' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => act('extend', { subscription_id: s.id, days: 30 })} disabled={busy} className="h-9 px-3.5 bg-whatsapp-50 hover:bg-whatsapp-100 text-whatsapp-700 border border-whatsapp-200 text-xs font-semibold rounded-2xl">
                        +30 days
                      </button>
                      <button onClick={() => setConfirmCancel(s)} className="btn-secondary h-9 px-3.5 text-xs font-semibold">
                        Cancel
                      </button>
                    </div>
                  )}

                  {s.status === 'expired' && (
                    <button onClick={() => act('extend', { subscription_id: s.id, days: 30 })} disabled={busy} className="h-9 px-3.5 bg-whatsapp-50 hover:bg-whatsapp-100 text-whatsapp-700 border border-whatsapp-200 text-xs font-semibold rounded-2xl">
                      Reactivate +30 days
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

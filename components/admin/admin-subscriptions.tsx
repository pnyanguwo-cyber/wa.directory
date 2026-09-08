'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog, adminFetch, AdminSectionHeader } from './shared'
import { PLAN_CONFIG } from '@/types'
import type { PlanType } from '@/types'

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
  renewal_notified_at: string | null
  created_at: string
  plan: string
  pro_assistance: boolean
  business: { id: string; name: string; slug: string; phone: string; business_id: string; username: string; city: string; payment_status: string } | null
}

type Tab = 'listing' | 'premium'
type ListingFilter = 'all' | 'pending' | 'active' | 'expired' | '1st_reminder' | '2nd_reminder'

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const now = new Date()
  const exp = new Date(expiresAt)
  return Math.ceil((exp.getTime() - now.getTime()) / 86400000)
}

function getReminderBadge(sub: ListingSubscription): { label: string; color: string } | null {
  if (sub.status !== 'active') return null
  const daysLeft = getDaysLeft(sub.expires_at)
  if (daysLeft === null || daysLeft <= 0) return null

  // 2nd reminder: expires within 3 days, already notified more than 2 days ago
  if (daysLeft <= 3 && sub.renewal_notified_at) {
    const notifiedAgo = (Date.now() - new Date(sub.renewal_notified_at).getTime()) / 86400000
    if (notifiedAgo > 2) return { label: '2nd Reminder', color: 'bg-red-100 text-red-700 border-red-200' }
  }

  // 1st reminder: expires within 7 days
  if (daysLeft <= 7) return { label: '1st Reminder', color: 'bg-amber-100 text-amber-700 border-amber-200' }

  return null
}

export default function AdminSubscriptions() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('listing')
  const [rows, setRows] = useState<Subscription[]>([])
  const [listingRows, setListingRows] = useState<ListingSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmCancel, setConfirmCancel] = useState<Subscription | ListingSubscription | null>(null)
  const [filter, setFilter] = useState<ListingFilter>('all')

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

  const filteredListing = useMemo(() => {
    return listingRows.filter(s => {
      if (filter === 'all') return true
      if (filter === 'pending') return s.status === 'pending'
      if (filter === 'active') return s.status === 'active'
      if (filter === 'expired') return s.status === 'expired'
      if (filter === '1st_reminder') {
        const badge = getReminderBadge(s)
        return badge?.label === '1st Reminder'
      }
      if (filter === '2nd_reminder') {
        const badge = getReminderBadge(s)
        return badge?.label === '2nd Reminder'
      }
      return true
    })
  }, [listingRows, filter])

  const listingCounts = useMemo(() => {
    const counts = listingRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1
      return acc
    }, {})
    // Count reminder tiers
    let firstReminder = 0
    let secondReminder = 0
    for (const s of listingRows) {
      const badge = getReminderBadge(s)
      if (badge?.label === '1st Reminder') firstReminder++
      if (badge?.label === '2nd Reminder') secondReminder++
    }
    counts['1st_reminder'] = firstReminder
    counts['2nd_reminder'] = secondReminder
    return counts
  }, [listingRows])

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
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'active', label: 'Active' },
              { key: 'expired', label: 'Expired' },
              { key: '1st_reminder', label: '1st Reminder' },
              { key: '2nd_reminder', label: '2nd Reminder' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`h-9 px-3 rounded-xl text-xs font-semibold transition-all ${
                  filter === f.key
                    ? f.key === '2nd_reminder'
                      ? 'bg-red-500 text-white shadow-md'
                      : f.key === '1st_reminder'
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-whatsapp-500 text-white shadow-md'
                    : 'bg-white border border-gray-200/80 text-text-secondary hover:bg-surface'
                }`}
              >
                {f.label}
                {f.key === 'pending' && listingCounts.pending ? ` (${listingCounts.pending})` : ''}
                {f.key === 'active' && listingCounts.active ? ` (${listingCounts.active})` : ''}
                {f.key === 'expired' && listingCounts.expired ? ` (${listingCounts.expired})` : ''}
                {f.key === '1st_reminder' && listingCounts['1st_reminder'] ? ` (${listingCounts['1st_reminder']})` : ''}
                {f.key === '2nd_reminder' && listingCounts['2nd_reminder'] ? ` (${listingCounts['2nd_reminder']})` : ''}
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
              {filteredListing.map(s => {
                const daysLeft = getDaysLeft(s.expires_at)
                const reminderBadge = getReminderBadge(s)
                const planLabel = PLAN_CONFIG[s.plan as PlanType]?.label || '1m'
                return (
                  <div key={s.id} className="neo-card p-4 flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-text-primary truncate">{s.business?.name || 'Unknown'}</p>
                        {s.business?.username && (
                          <span className="text-xs text-text-secondary font-mono">@{s.business.username}</span>
                        )}
                        {reminderBadge && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${reminderBadge.color}`}>
                            {reminderBadge.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-text-secondary">
                        {s.business?.business_id && <>{s.business.business_id} · </>}
                        {s.business?.city || 'N/A'}
                        {s.payer_phone && <> · Payer: +{s.payer_phone}</>}
                        {s.started_at && <> · Since {new Date(s.started_at).toLocaleDateString()}</>}
                        {s.expires_at && <> · Expires {new Date(s.expires_at).toLocaleDateString()}</>}
                        {daysLeft !== null && s.status === 'active' && <> · <span className={daysLeft <= 3 ? 'text-red-600 font-semibold' : daysLeft <= 7 ? 'text-amber-600 font-semibold' : ''}>{daysLeft}d left</span></>}
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        {planLabel} · Requested {new Date(s.created_at).toLocaleDateString()} · ${Number(s.amount || 0).toFixed(2)}
                        {s.pro_assistance && <> · +Pro</>}
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
                )
              })}
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

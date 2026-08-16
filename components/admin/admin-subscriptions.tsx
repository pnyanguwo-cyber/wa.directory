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

export default function AdminSubscriptions() {
  const router = useRouter()
  const [rows, setRows] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmCancel, setConfirmCancel] = useState<Subscription | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/subscriptions')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setRows(data.subscriptions || [])
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

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  const statusStyle: Record<string, string> = {
    active: 'bg-whatsapp-50 text-whatsapp-800 border-whatsapp-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  }

  return (
    <div className="space-y-6">
      {confirmCancel && (
        <ConfirmDialog
          message={`Cancel the subscription for "${confirmCancel.business?.name || 'this business'}"?`}
          onConfirm={() => act('cancel', { subscription_id: confirmCancel.id })}
          onCancel={() => setConfirmCancel(null)}
        />
      )}

      <AdminSectionHeader
        title="Subscriptions"
        subtitle={`${rows.length} total · ${counts.active || 0} active · ${counts.pending || 0} pending · ${counts.expired || 0} expired`}
      />

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{message}</p>
      )}

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
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch } from './shared'

interface AddressRequest {
  id: string
  address: string
  lat: number | null
  lng: number | null
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string
  created_at: string
  resolved_at: string | null
  business_id: string | null
  business_name: string | null
}

export default function AdminAddressRequests() {
  const router = useRouter()
  const [rows, setRows] = useState<AddressRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/address-requests')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setRows(data.requests || [])
    setLoading(false)
  }

  async function act(id: string, action: 'approve' | 'reject') {
    setBusyId(id)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/address-requests', {
      method: 'POST',
      body: JSON.stringify({ id, action }),
    })
    if (ok && data?.success) {
      setMessage(action === 'approve' ? 'Address verified and updated.' : 'Request rejected.')
      setRows(prev =>
        prev.map(r => (r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected', resolved_at: new Date().toISOString() } : r))
      )
    } else {
      setMessage(data?.error || 'Action failed')
    }
    setBusyId(null)
  }

  const visible = filter === 'pending' ? rows.filter(r => r.status === 'pending') : rows

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Address Verification Requests</h2>
        <div className="flex gap-1.5">
          {(['pending', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-8 px-3 rounded-xl text-xs font-semibold transition-all ${
                filter === f ? 'bg-whatsapp-500 text-white' : 'bg-white border border-gray-200 text-text-secondary hover:bg-surface'
              }`}
            >
              {f === 'pending' ? 'Pending' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-3 py-2">{message}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-whatsapp-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-12">
          {filter === 'pending' ? 'No pending address requests.' : 'No address requests found.'}
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map(r => (
            <div
              key={r.id}
              className={`bg-white border rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                r.status === 'approved'
                  ? 'border-whatsapp-200 bg-whatsapp-50/30'
                  : r.status === 'rejected'
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-gray-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{r.address}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  {r.business_name && (
                    <span className="text-xs text-text-secondary">Business: {r.business_name}</span>
                  )}
                  <span className="text-xs text-text-secondary">
                    {new Date(r.created_at).toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      r.status === 'approved'
                        ? 'bg-whatsapp-100 text-whatsapp-700'
                        : r.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                {r.lat != null && r.lng != null && (
                  <p className="text-[11px] text-text-secondary mt-1">
                    Coords: {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                  </p>
                )}
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, 'approve')}
                    className="h-8 px-3 bg-whatsapp-500 hover:bg-whatsapp-600 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                  >
                    {busyId === r.id ? '...' : 'Approve'}
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => act(r.id, 'reject')}
                    className="h-8 px-3 bg-white border border-red-200 hover:bg-red-50 active:scale-95 text-red-600 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

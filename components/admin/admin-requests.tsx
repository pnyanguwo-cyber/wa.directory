'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminSectionHeader } from './shared'

interface RequestRow {
  id: string
  type: 'category' | 'area'
  name: string
  city: string
  status: 'pending' | 'approved' | 'rejected'
  corrected_name: string
  created_at: string
  business_id: string
  businesses?: { name?: string; phone?: string; slug?: string } | null
}

export default function AdminRequests() {
  const router = useRouter()
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [approving, setApproving] = useState<RequestRow | null>(null)
  const [correction, setCorrection] = useState('')
  const [confirmReject, setConfirmReject] = useState<RequestRow | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/feature-requests')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setRows(data.requests || [])
    setLoading(false)
  }

  async function act(id: string, action: 'approve' | 'reject', corrected_name = '') {
    setBusyId(id)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/feature-requests', {
      method: 'POST',
      body: JSON.stringify({ id, action, corrected_name }),
    })
    setBusyId(null)
    if (!ok) {
      setMessage(data?.error || 'Action failed')
      return
    }
    setApproving(null)
    setConfirmReject(null)
    setMessage(action === 'approve' ? 'Approved. It is now live across the site.' : 'Rejected and removed from the business profile.')
    load()
  }

  const visible = filter === 'pending' ? rows.filter(r => r.status === 'pending') : rows

  return (
    <div className="space-y-6">
      {approving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white">
            <h2 className="text-lg font-bold text-text-primary">Approve &quot;{approving.name}&quot;</h2>
            <p className="text-xs text-text-secondary">
              Fix any spelling before approving. Businesses already using this {approving.type} will update automatically.
            </p>
            <input
              value={correction}
              onChange={e => setCorrection(e.target.value)}
              className="input-field text-sm"
              placeholder={approving.name}
              autoFocus
            />
            <div className="flex gap-2.5 justify-end pt-2">
              <button onClick={() => setApproving(null)} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
              <button
                onClick={() => act(approving.id, 'approve', correction.trim() || approving.name)}
                disabled={busyId === approving.id}
                className="btn-primary h-10 px-5 text-xs font-semibold"
              >
                {busyId === approving.id ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white">
            <h2 className="text-lg font-bold text-text-primary">Reject &quot;{confirmReject.name}&quot;?</h2>
            <p className="text-xs text-text-secondary">
              It will be removed from the business profile and the business owner will be notified on WhatsApp to review their listing.
            </p>
            <div className="flex gap-2.5 justify-end pt-2">
              <button onClick={() => setConfirmReject(null)} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
              <button
                onClick={() => act(confirmReject.id, 'reject')}
                disabled={busyId === confirmReject.id}
                className="h-10 px-5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xs font-semibold rounded-2xl transition-all shadow-md"
              >
                {busyId === confirmReject.id ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminSectionHeader
        title="Category & Area Requests"
        subtitle="Businesses requested these while listing. Approve to make them live, or reject (owner is notified to review)."
        action={
          <div className="flex gap-1.5">
            {(['pending', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-9 px-4 rounded-xl text-xs font-semibold transition-all ${
                  filter === f
                    ? 'bg-whatsapp-500 text-white shadow-sm'
                    : 'bg-white border border-gray-200/80 text-text-secondary hover:bg-surface'
                }`}
              >
                {f === 'pending' ? `Pending (${rows.filter(r => r.status === 'pending').length})` : 'All'}
              </button>
            ))}
          </div>
        }
      />

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{message}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="neo-card p-10 text-center">
          <h2 className="text-base font-bold text-text-primary mb-1">Nothing to review</h2>
          <p className="text-text-secondary text-xs">New requests from businesses will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map(r => (
            <div key={r.id} className="neo-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                    r.type === 'category' ? 'bg-whatsapp-100 text-whatsapp-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {r.type}
                  </span>
                  <h3 className="font-bold text-text-primary text-sm truncate">{r.name}</h3>
                  {r.city && <span className="text-xs text-text-secondary">({r.city})</span>}
                  {r.status === 'approved' && (
                    <span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-whatsapp-100 text-whatsapp-800">Approved{r.corrected_name ? ` as "${r.corrected_name}"` : ''}</span>
                  )}
                  {r.status === 'rejected' && (
                    <span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-red-100 text-red-700">Rejected</span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  From <span className="font-medium text-text-primary">{r.businesses?.name || 'Unknown business'}</span>
                  {' · '}{new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              {r.status === 'pending' && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setApproving(r); setCorrection(r.name) }}
                    disabled={busyId === r.id}
                    className="h-9 px-4 text-xs font-semibold text-whatsapp-800 bg-whatsapp-100 hover:bg-whatsapp-200 rounded-xl transition-all disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setConfirmReject(r)}
                    disabled={busyId === r.id}
                    className="h-9 px-4 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-all disabled:opacity-50"
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
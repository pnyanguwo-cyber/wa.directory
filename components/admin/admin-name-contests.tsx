'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog, adminFetch, AdminSectionHeader } from './shared'

interface NameContest {
  id: string
  contestant_name: string
  contestant_phone: string
  contested_username: string
  business_id: string | null
  reason: string
  status: string
  admin_note: string
  created_at: string
  business: { id: string; name: string; username: string; city: string } | null
}

export default function AdminNameContests() {
  const router = useRouter()
  const [contests, setContests] = useState<NameContest[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ contest: NameContest; action: 'approve' | 'reject' } | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/name-contests')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setContests(data.contests || [])
    setLoading(false)
  }

  async function act(action: 'approve' | 'reject') {
    if (!confirmAction) return
    setBusy(true)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/name-contests', {
      method: 'POST',
      body: JSON.stringify({ contest_id: confirmAction.contest.id, action, note }),
    })
    setBusy(false)
    setConfirmAction(null)
    setNote('')
    if (!ok) {
      setMessage(data?.error || 'Action failed')
      return
    }
    setMessage(action === 'approve' ? 'Contest approved.' : 'Contest rejected.')
    load()
  }

  const pending = contests.filter(c => c.status === 'pending')
  const resolved = contests.filter(c => c.status !== 'pending')

  const statusStyle: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-whatsapp-50 text-whatsapp-700 border-whatsapp-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className="space-y-6">
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-text-primary">
              {confirmAction.action === 'approve' ? 'Approve Contest?' : 'Reject Contest?'}
            </h3>
            <p className="text-sm text-text-secondary">
              {confirmAction.action === 'approve'
                ? `Approve ${confirmAction.contest.contestant_name}'s claim for @${confirmAction.contest.contested_username}?`
                : `Reject ${confirmAction.contest.contestant_name}'s claim for @${confirmAction.contest.contested_username}?`}
            </p>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">Admin note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="input-field text-sm"
                placeholder="Reason or note..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setConfirmAction(null); setNote('') }} className="btn-secondary px-4 py-2 text-sm">Cancel</button>
              <button
                onClick={() => act(confirmAction.action)}
                disabled={busy}
                className={`px-4 py-2 text-sm font-semibold rounded-xl text-white ${
                  confirmAction.action === 'approve' ? 'bg-whatsapp-500 hover:bg-whatsapp-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {busy ? 'Processing...' : confirmAction.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminSectionHeader
        title="Name Contests"
        subtitle={`${pending.length} pending · ${resolved.length} resolved`}
      />

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{message}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}
        </div>
      ) : contests.length === 0 ? (
        <div className="neo-card p-8 text-center">
          <p className="text-sm font-semibold text-text-primary">No name contests</p>
          <p className="text-xs text-text-secondary mt-1">When users contest a taken username, they appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">Pending</h3>
              <div className="space-y-2.5">
                {pending.map(c => (
                  <div key={c.id} className="neo-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-text-primary">{c.contestant_name}</p>
                        <p className="text-xs text-text-secondary">
                          Phone: {c.contestant_phone} · Claims: <span className="font-mono font-bold">@{c.contested_username}</span>
                        </p>
                        {c.business && (
                          <p className="text-xs text-text-secondary">
                            Currently held by: {c.business.name} (@{c.business.username}) in {c.business.city || 'N/A'}
                          </p>
                        )}
                        {c.reason && (
                          <p className="text-xs text-text-secondary mt-1 italic">Reason: {c.reason}</p>
                        )}
                        <p className="text-[10px] text-text-secondary mt-1">{new Date(c.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setConfirmAction({ contest: c, action: 'approve' })}
                          className="h-8 px-3 text-xs font-semibold bg-whatsapp-100 text-whatsapp-700 hover:bg-whatsapp-200 rounded-xl"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setConfirmAction({ contest: c, action: 'reject' })}
                          className="h-8 px-3 text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 rounded-xl"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resolved.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">Resolved</h3>
              <div className="space-y-2.5">
                {resolved.map(c => (
                  <div key={c.id} className="neo-card p-4 opacity-75">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary">{c.contestant_name} → @{c.contested_username}</p>
                        {c.admin_note && <p className="text-xs text-text-secondary italic">Note: {c.admin_note}</p>}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize ${statusStyle[c.status] || ''}`}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

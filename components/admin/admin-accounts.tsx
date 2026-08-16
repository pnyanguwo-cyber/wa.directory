'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminSectionHeader } from './shared'

interface Account {
  id: string
  business_id: string
  disabled: boolean
  created_at: string
  business: { id: string; name: string; slug: string; phone: string } | null
}

export default function AdminAccounts() {
  const router = useRouter()
  const [rows, setRows] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [resetting, setResetting] = useState<Account | null>(null)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { ok, status, data } = await adminFetch('/api/admin/accounts')
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setRows(data.accounts || [])
    setLoading(false)
  }

  async function act(action: string, payload: Record<string, unknown>) {
    setBusy(true)
    setMessage('')
    const { ok, data } = await adminFetch('/api/admin/accounts', {
      method: 'POST',
      body: JSON.stringify({ action, ...payload }),
    })
    setBusy(false)
    if (!ok) {
      setMessage(data?.error || 'Action failed')
      return
    }
    setResetting(null)
    setNewPassword('')
    setMessage('Saved. The new password was sent to the owner via WhatsApp.')
    load()
  }

  return (
    <div className="space-y-6">
      {resetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-white">
            <h2 className="text-lg font-bold text-text-primary">Reset password</h2>
            <p className="text-xs text-text-secondary">
              {resetting.business?.name || 'This business'} · {resetting.business?.phone || ''}
            </p>
            <form onSubmit={e => { e.preventDefault(); act('reset', { account_id: resetting.id, new_password: newPassword }) }} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-text-secondary mb-1 block">New password (min 6 characters)</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input-field text-sm"
                  placeholder="temp-pass-2026"
                  autoFocus
                />
              </div>
              <div className="flex gap-2.5 justify-end pt-2">
                <button type="button" onClick={() => setResetting(null)} className="btn-secondary h-10 px-4 text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={busy} className="btn-primary h-10 px-5 text-xs font-semibold">{busy ? 'Saving...' : 'Reset & notify'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminSectionHeader title="Accounts" subtitle={`${rows.length} business accounts`} />

      {message && (
        <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 animate-fade-in">{message}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="neo-card p-8 text-center">
          <p className="text-sm font-semibold text-text-primary">No accounts yet</p>
          <p className="text-xs text-text-secondary mt-1">Businesses create accounts from their edit link.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map(a => (
            <div key={a.id} className="neo-card p-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-text-primary truncate">{a.business?.name || 'Unknown business'}</p>
                <p className="text-[11px] text-text-secondary">
                  {a.business?.phone || 'no phone'} · created {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize ${a.disabled ? 'bg-red-50 text-red-700 border-red-200' : 'bg-whatsapp-50 text-whatsapp-800 border-whatsapp-200'}`}>
                {a.disabled ? 'Disabled' : 'Active'}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => { setResetting(a); setNewPassword('') }} className="h-9 px-3.5 bg-whatsapp-50 hover:bg-whatsapp-100 text-whatsapp-700 border border-whatsapp-200 text-xs font-semibold rounded-2xl">
                  Reset password
                </button>
                <button
                  onClick={() => act('toggle', { account_id: a.id, disabled: !a.disabled })}
                  className={`h-9 px-3.5 text-xs font-semibold rounded-2xl ${a.disabled ? 'bg-whatsapp-500 hover:bg-whatsapp-600 text-white' : 'btn-secondary'}`}
                >
                  {a.disabled ? 'Enable' : 'Disable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
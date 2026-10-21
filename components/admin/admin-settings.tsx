'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminSectionHeader, adminFetch } from './shared'

export default function AdminSettings() {
  const [enabled, setEnabled] = useState(false)
  const [price, setPrice] = useState('$3/month')
  const [adminSet, setAdminSet] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await adminFetch('/api/admin/bot-settings')
    setEnabled(!!data?.enabled)
    setPrice(data?.price || '$3/month')
    setAdminSet(!!data?.adminWhatsAppSet)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function save(nextEnabled: boolean) {
    setMsg('')
    const { ok, data } = await adminFetch('/api/admin/bot-settings', {
      method: 'POST',
      body: JSON.stringify({ enabled: nextEnabled, price }),
    })
    setMsg(ok ? `Saved — priority supplier ${nextEnabled ? 'ON' : 'OFF'}` : `Failed: ${data?.error || 'unknown'}`)
    load()
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader title="Bot Settings" subtitle="Feature switches live here; dormant ones stay off until you flip them" />

      {loading && <p className="text-sm text-text-secondary">Loading…</p>}

      {!loading && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary">💤 Priority supplier switch</h3>
              <p className="text-xs text-text-secondary mt-1">
                When ON, matched needs are pushed to paying suppliers first (WhatsApp template, ~$0.005
                each). While OFF, channel posts + quote deep links do all distribution — free.
                Nothing else changes in the buyer flow either way.
              </p>
            </div>
            <button
              onClick={() => save(!enabled)}
              className={`shrink-0 h-8 px-3 rounded-xl text-xs font-bold ${enabled ? 'bg-whatsapp-500 text-white' : 'bg-gray-100 text-text-secondary'}`}
            >
              {enabled ? 'ON' : 'OFF'}
            </button>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">Supplier plan price</span>
            <input
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-whatsapp-400"
            />
          </label>
          <div className="flex items-center gap-2">
            <button onClick={() => save(enabled)} className="btn-secondary h-9 px-4 text-xs font-semibold">Save price</button>
            {msg && <span className="text-xs font-semibold text-whatsapp-700">{msg}</span>}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 space-y-2">
        <h3 className="text-sm font-bold text-text-primary">Environment</h3>
        <p className="text-xs text-text-secondary">
          ADMIN_WHATSAPP (digest commands + instant need copies): <b>{adminSet ? 'set ✅' : 'not set — add it to the deployment env'}</b>
        </p>
        <p className="text-xs text-text-secondary">
          WHATSAPP_BOT_NUMBER (wa.me deep links on channel posts): check .env — quoted posts show a placeholder when missing.
        </p>
      </div>
    </div>
  )
}

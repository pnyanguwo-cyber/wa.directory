'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminSectionHeader, adminFetch } from './shared'

export default function AdminSettings() {
  const [enabled, setEnabled] = useState(false)
  const [price, setPrice] = useState('$3/month')
  const [adminSet, setAdminSet] = useState(false)
  const [root, setRoot] = useState('')
  const [allowlist, setAllowlist] = useState<string[]>([])
  const [newAdmin, setNewAdmin] = useState('')
  const [adminMsg, setAdminMsg] = useState('')
  const [chOverride, setChOverride] = useState('')
  const [chEnv, setChEnv] = useState('')
  const [chInput, setChInput] = useState('')
  const [chMsg, setChMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await adminFetch('/api/admin/bot-settings')
    setEnabled(!!data?.enabled)
    setPrice(data?.price || '$3/month')
    setAdminSet(!!data?.adminWhatsAppSet)
    setRoot(data?.root || '')
    setAllowlist(Array.isArray(data?.allowlist) ? data.allowlist : [])
    setChOverride(data?.channelLink?.override || '')
    setChEnv(data?.channelLink?.env || '')
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

  async function adminAction(action: 'admin_add' | 'admin_del', number?: string) {
    setAdminMsg('')
    const { ok, data } = await adminFetch('/api/admin/bot-settings', {
      method: 'POST',
      body: JSON.stringify({ action, number: number || newAdmin }),
    })
    if (!ok) {
      setAdminMsg(`Failed: ${data?.error || 'unknown'}`)
      return
    }
    if (action === 'admin_add') setNewAdmin('')
    if (action === 'admin_add') setAdminMsg('Added — they can now run bot commands.')
    if (action === 'admin_del') setAdminMsg('Removed.')
    load()
  }

  async function channelAction(action: 'channel_set' | 'channel_clear') {
    setChMsg('')
    const { ok, data } = await adminFetch('/api/admin/bot-settings', {
      method: 'POST',
      body: JSON.stringify({ action, link: chInput }),
    })
    if (!ok) {
      setChMsg(`Failed: ${data?.error || 'unknown'}`)
      return
    }
    setChInput('')
    setChMsg(action === 'channel_set' ? 'Channel link saved.' : 'Cleared — using the env link again.')
    load()
  }

  const activeLink = chOverride || chEnv
  const chSource = activeLink ? (chOverride ? 'dashboard override' : 'Vercel env CHANNEL_LINK') : ''

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

      {!loading && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-text-primary">👥 WhatsApp bot admins</h3>
            <p className="text-xs text-text-secondary mt-1">
              Extra admins can run bot commands from their phone: quotes / reopen / post, optin / optout,
              switch, channel, pending / verify, cast. Web edits here are owner-session only.
            </p>
          </div>
          <ul className="space-y-1.5">
            {root && (
              <li className="flex items-center justify-between text-sm">
                <span className="font-medium text-text-primary">{root}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-whatsapp-700">owner · permanent</span>
              </li>
            )}
            {allowlist.map(n => (
              <li key={n} className="flex items-center justify-between text-sm">
                <span className="font-medium text-text-primary">+{n}</span>
                <button
                  onClick={() => adminAction('admin_del', n)}
                  className="text-xs font-semibold text-text-secondary hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
            {!root && !allowlist.length && (
              <li className="text-xs text-text-secondary">No admins yet — set ADMIN_WHATSAPP in the deployment env first.</li>
            )}
          </ul>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newAdmin}
              onChange={e => setNewAdmin(e.target.value)}
              placeholder="2637… (full number)"
              inputMode="numeric"
              className="flex-1 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-whatsapp-400"
            />
            <button
              onClick={() => adminAction('admin_add')}
              disabled={!newAdmin.trim()}
              className="h-10 px-4 rounded-xl bg-whatsapp-500 text-white text-xs font-bold disabled:opacity-50"
            >
              Add admin
            </button>
          </div>
          {adminMsg && <p className="text-xs font-semibold text-whatsapp-700">{adminMsg}</p>}
        </div>
      )}

      {!loading && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-text-primary">📣 WhatsApp channel link</h3>
            <p className="text-xs text-text-secondary mt-1">
              Shown in welcome messages, help, menu and supplier pitches.{' '}
              {activeLink ? (
                <>Effective now: <b className="break-all">{activeLink}</b> <span className="whitespace-nowrap">({chSource}).</span></>
              ) : (
                <b>No channel link set — add a CHANNEL_LINK env or save an override here.</b>
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={chInput}
              onChange={e => setChInput(e.target.value)}
              placeholder="https://whatsapp.com/channel/…"
              inputMode="url"
              className="flex-1 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-whatsapp-400"
            />
            <button
              onClick={() => channelAction('channel_set')}
              disabled={!chInput.trim()}
              className="h-10 px-4 rounded-xl bg-whatsapp-500 text-white text-xs font-bold disabled:opacity-50"
            >
              Save link
            </button>
            {chOverride && (
              <button
                onClick={() => channelAction('channel_clear')}
                className="h-10 px-4 rounded-xl bg-gray-100 text-text-secondary text-xs font-bold"
              >
                Clear override
              </button>
            )}
          </div>
          {chMsg && <p className="text-xs font-semibold text-whatsapp-700">{chMsg}</p>}
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

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminSectionHeader } from './shared'

interface SessionRow {
  phone: string
  step: string
  data: Record<string, unknown>
  updated_at: string
}

export default function AdminChatSessions() {
  const router = useRouter()
  const [rows, setRows] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load(q = '') {
    const { ok, status, data } = await adminFetch(`/api/admin/chat-sessions${q ? `?q=${encodeURIComponent(q)}` : ''}`)
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      return
    }
    setRows(data.sessions || [])
    setLoading(false)
  }

  async function removeSession(phone: string) {
    setDeleting(phone)
    const { ok } = await adminFetch('/api/admin/chat-sessions', {
      method: 'DELETE',
      body: JSON.stringify({ phone }),
    })
    setDeleting(null)
    if (ok) setRows(prev => prev.filter(r => r.phone !== phone))
  }

  function searchNow(e: React.FormEvent) {
    e.preventDefault()
    load(search.trim())
  }

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title="Chat Sessions"
        subtitle="Live conversations people are having with the WhatsApp bot."
      />

      <form onSubmit={searchNow} className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 text-sm"
            placeholder="Search by phone number..."
          />
        </div>
        <button type="submit" className="btn-primary h-11 px-4 text-xs font-semibold shrink-0">Search</button>
      </form>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="neo-card p-10 text-center">
          <h2 className="text-base font-bold text-text-primary mb-1">No sessions</h2>
          <p className="text-text-secondary text-xs">When someone talks to the WhatsApp bot, their conversation shows up here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map(s => (
            <div key={s.phone} className="neo-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-whatsapp-100 to-whatsapp-200 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-whatsapp-800">+{s.phone.slice(-4)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-text-primary text-sm">+{s.phone}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-blue-100 text-blue-800">
                    step: {s.step || 'search'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1 truncate">
                  {s.data && Object.keys(s.data).length > 0
                    ? Object.entries(s.data).map(([k, v]) => `${k}: ${v}`).join(' · ')
                    : 'No form data yet'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Last activity: {new Date(s.updated_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => removeSession(s.phone)}
                disabled={deleting === s.phone}
                className="h-8 px-3 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all disabled:opacity-50 shrink-0"
              >
                {deleting === s.phone ? '...' : 'Clear'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
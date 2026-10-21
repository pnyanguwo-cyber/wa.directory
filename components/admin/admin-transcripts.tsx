'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminSectionHeader, adminFetch } from './shared'

interface Caller {
  phone: string
  last_at: string
  messages: number
}

interface BotMessageLite {
  dir: string
  kind: string
  body: string
  created_at: string
}

export default function AdminTranscripts() {
  const [callers, setCallers] = useState<Caller[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [openPhone, setOpenPhone] = useState<string | null>(null)
  const [messages, setMessages] = useState<BotMessageLite[]>([])
  const [loadingChat, setLoadingChat] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await adminFetch('/api/admin/transcripts')
    setCallers(data?.callers || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function openChat(phone: string) {
    setOpenPhone(phone)
    setLoadingChat(true)
    const { data } = await adminFetch(`/api/admin/transcripts?phone=${encodeURIComponent(phone)}`)
    setMessages(data?.messages || [])
    setLoadingChat(false)
  }

  const filtered = callers.filter(c => !query || c.phone.includes(query.replace(/\D/g, '')))

  function fmtWhen(iso: string) {
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      <AdminSectionHeader
        title="Bot Conversations"
        subtitle="Word-for-word transcripts of everyone chatting with the bot (last 14 days)"
      />

      {!openPhone && (
        <>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by phone number…"
            className="w-full h-10 px-4 rounded-2xl border border-gray-200 bg-white text-sm outline-none focus:border-whatsapp-400"
          />
          {loading && <p className="text-sm text-text-secondary">Loading callers…</p>}
          {!loading && filtered.length === 0 && <p className="text-sm text-text-secondary">No transcript activity yet.</p>}
          <div className="space-y-2">
            {filtered.map(c => (
              <button key={c.phone} onClick={() => openChat(c.phone)} className="w-full text-left rounded-2xl border border-gray-200/80 bg-white p-3 hover:bg-surface transition-colors flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-text-primary">+{c.phone}</span>
                  <p className="text-xs text-text-secondary">last word {fmtWhen(c.last_at)}</p>
                </div>
                <span className="text-xs font-bold text-whatsapp-700">{c.messages} msg{c.messages === 1 ? '' : 's'} →</span>
              </button>
            ))}
          </div>
        </>
      )}

      {openPhone && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpenPhone(null)} className="btn-secondary h-9 px-3 text-xs font-semibold">← Callers</button>
            <span className="text-sm font-bold text-text-primary">+{openPhone}</span>
          </div>
          {loadingChat && <p className="text-sm text-text-secondary">Loading conversation…</p>}
          <div className="space-y-1.5 max-h-[32rem] overflow-auto">
            {messages.map((m, i) => (
              <div key={i} className={`rounded-xl px-3 py-2 text-xs max-w-[85%] ${m.dir === 'in' ? 'bg-white border border-gray-200' : 'bg-emerald-50 ml-auto'}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className="text-[10px] text-text-secondary mt-1">
                  {m.dir === 'in' ? '← them' : 'bot →'} {m.kind} · {fmtWhen(m.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

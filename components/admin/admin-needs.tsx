'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminSectionHeader, adminFetch } from './shared'

interface QuoteLite {
  id: number
  supplier_name: string
  price: string
}

interface NeedLite {
  id: number
  rq_id: string
  item: string
  qty: string
  budget: string
  city: string
  status: string
  closed_by: string | null
  buyer_phone: string
  created_at: string
  quotes_forwarded: number
  quotes: QuoteLite[]
  channel_post: string
}

export default function AdminNeeds() {
  const [needs, setNeeds] = useState<NeedLite[]>([])
  const [loading, setLoading] = useState(true)
  const [openPost, setOpenPost] = useState<{ rqId: string; text: string } | null>(null)
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await adminFetch('/api/admin/needs')
    setNeeds(data?.needs || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function act(rqId: string, action: 'close' | 'relaunch') {
    await adminFetch('/api/admin/needs', {
      method: 'POST',
      body: JSON.stringify({ action, rq_id: rqId }),
    })
    if (action === 'relaunch') {
      const res = await adminFetch('/api/admin/needs')
      const found = (res.data?.needs || []).find((n: NeedLite) => n.rq_id === rqId)
      if (found) setOpenPost({ rqId, text: found.channel_post })
    }
    load()
  }

  function fmtWhen(iso: string) {
    const d = new Date(iso)
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  // ── Digest card ──────────────────────────────────────────────────────
  const [digestText, setDigestText] = useState('')
  const [digestCounts, setDigestCounts] = useState<{ needs: number; searches: number } | null>(null)
  const [digestBusy, setDigestBusy] = useState(false)
  const [digestMsg, setDigestMsg] = useState('')

  async function compileDigest(kind: 'cursor' | '24h') {
    setDigestBusy(true)
    setDigestMsg('')
    const q = kind === 'cursor' ? 'cursor=1' : ''
    const { ok, data } = await adminFetch(`/api/admin/digest${q ? `?${q}` : ''}`)
    if (ok) {
      setDigestText(data.text || '')
      setDigestCounts(data.counts || null)
    } else {
      setDigestMsg('Could not compile the digest.')
    }
    setDigestBusy(false)
  }

  async function sendDigest() {
    setDigestBusy(true)
    setDigestMsg('')
    const { ok, data } = await adminFetch('/api/admin/digest', {
      method: 'POST',
      body: JSON.stringify({ cursor: true }),
    })
    setDigestMsg(ok ? 'Sent to your WhatsApp ✅' : `Failed: ${data?.error || 'unknown'}`)
    setDigestBusy(false)
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(''), 1500)
    })
  }

  function downloadCsv() {
    window.location.href = '/api/admin/digest?csv=1'
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <AdminSectionHeader
          title="Needs & Matchmaking"
          subtitle="Buyer needs, supplier quotes, and the channel-ready tip-off posts"
        />
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 space-y-3">
          <h3 className="text-sm font-bold text-text-primary">📥 Demand digest</h3>
          <p className="text-xs text-text-secondary">
            Same compiler as the WhatsApp command. <b>Since last check-in</b> mirrors the cursor
            you move by replying <code>digest</code> from your own number.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => compileDigest('cursor')} disabled={digestBusy} className="btn-secondary h-9 px-3 text-xs font-semibold">
              Since last check-in
            </button>
            <button onClick={() => compileDigest('24h')} disabled={digestBusy} className="btn-secondary h-9 px-3 text-xs font-semibold">
              Last 24h
            </button>
            <button onClick={sendDigest} disabled={digestBusy} className="btn-secondary h-9 px-3 text-xs font-semibold">
              Send to my WhatsApp
            </button>
            <button onClick={downloadCsv} className="btn-secondary h-9 px-3 text-xs font-semibold">
              ⬇ CSV (needs)
            </button>
          </div>
          {digestCounts && (
            <p className="text-xs text-text-secondary">
              {digestCounts.needs} need{digestCounts.needs === 1 ? '' : 's'} · {digestCounts.searches} searches in window
            </p>
          )}
          {digestMsg && <p className="text-xs font-semibold text-whatsapp-700">{digestMsg}</p>}
          {digestText && (
            <div className="relative">
              <pre className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-text-primary max-h-80 overflow-auto">{digestText}</pre>
              <button onClick={() => copy(digestText, 'digest')} className="absolute top-2 right-2 h-7 px-2 rounded-lg bg-white border text-[10px] font-bold">
                {copied === 'digest' ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <AdminSectionHeader
          title={`Open needs (${needs.filter(n => n.status === 'open').length})`}
          action={
            <button onClick={load} className="btn-secondary h-9 px-3 text-xs font-semibold">
              Refresh
            </button>
          }
        />
        {loading && <p className="text-sm text-text-secondary">Loading needs…</p>}
        {!loading && needs.length === 0 && (
          <p className="text-sm text-text-secondary">No needs posted yet. The 🛒 flow in the bot feeds this list.</p>
        )}
        <div className="space-y-2">
          {needs.map(n => (
            <div key={n.id} className="rounded-2xl border border-gray-200/80 bg-white p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-text-primary">
                    {n.rq_id} · {[n.qty, n.item].filter(Boolean).join(' ') || n.item}
                  </span>
                  <p className="text-xs text-text-secondary">
                    {(n.city || 'countrywide').toUpperCase()} · {n.budget || 'no budget'} · {fmtWhen(n.created_at)} · buyer +{n.buyer_phone}
                    {n.status !== 'open' && <> · {n.status.toUpperCase()}{n.closed_by ? ` (${n.closed_by})` : ''}</>}
                  </p>
                </div>
              </div>
              {n.quotes.length > 0 && (
                <p className="text-xs text-text-primary">
                  💬 {n.quotes.length} quote{n.quotes.length === 1 ? '' : 's'}:{' '}
                  {n.quotes.map(q => `${q.supplier_name || 'supplier'}${q.price ? ` ${q.price}` : ''}`).join(' · ')}
                </p>
              )}
              {n.status === 'open' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => act(n.rq_id, 'close')} className="h-8 px-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100">
                    Close now
                  </button>
                  <button onClick={() => setOpenPost({ rqId: n.rq_id, text: n.channel_post })} className="btn-secondary h-8 px-3 text-xs font-semibold">
                    Copy channel post
                  </button>
                  <button onClick={() => act(n.rq_id, 'relaunch')} className="btn-secondary h-8 px-3 text-xs font-semibold">
                    Relaunch
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {openPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 space-y-3">
            <h3 className="text-sm font-bold text-text-primary">Channel post · {openPost.rqId}</h3>
            <pre className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs">{openPost.text}</pre>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpenPost(null)} className="btn-secondary h-9 px-4 text-xs font-semibold">Close</button>
              <button onClick={() => { copy(openPost.text, 'post'); setOpenPost(null) }} className="h-9 px-4 rounded-2xl bg-whatsapp-500 text-white text-xs font-semibold">
                {copied === 'post' ? 'Copied ✓' : 'Copy post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

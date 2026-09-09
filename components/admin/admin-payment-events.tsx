'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch, AdminSectionHeader } from './shared'

interface PaymentEvent {
  id: string
  bid_id: string | null
  business_id: string | null
  event_type: string
  outcome: string
  detail: Record<string, unknown> | null
  ip_hash: string | null
  user_agent: string | null
  created_at: string
  businessName: string | null
}

const OUTCOME_FILTERS = [
  { value: '', label: 'All outcomes' },
  { value: 'rejected', label: 'Rejected (abuse)' },
  { value: 'error', label: 'Errors' },
  { value: 'ok', label: 'OK' },
  { value: 'pending', label: 'Pending' },
]

const EVENT_FILTERS = [
  { value: '', label: 'All events' },
  { value: 'bid_rejected', label: 'Bid rejected' },
  { value: 'payment_initiated', label: 'Payment initiated' },
  { value: 'payment_init_failed', label: 'Init failed' },
  { value: 'payment_confirmed', label: 'Payment confirmed' },
  { value: 'payment_pending', label: 'Payment pending' },
  { value: 'webhook_rejected', label: 'Webhook rejected' },
  { value: 'activation_failed', label: 'Activation failed' },
]

function outcomeBadge(outcome: string) {
  switch (outcome) {
    case 'rejected':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'error':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'pending':
      return 'bg-gray-100 text-gray-600 border-gray-200'
    default:
      return 'bg-whatsapp-50 text-whatsapp-800 border-whatsapp-200'
  }
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

export default function AdminPaymentEvents() {
  const router = useRouter()
  const [events, setEvents] = useState<PaymentEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [outcome, setOutcome] = useState('')
  const [event, setEvent] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, event])

  async function load() {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (outcome) params.set('outcome', outcome)
    if (event) params.set('event', event)
    const { ok, status, data } = await adminFetch(`/api/admin/payment-events?${params.toString()}`)
    if (!ok) {
      if (status === 401) router.push('/admin-login')
      setError(data?.error || 'Could not load payment events')
      setEvents([])
    } else {
      setEvents(data.events || [])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <AdminSectionHeader
        title="Payment Events"
        subtitle="Audit trail for EcoCash bid payments — abuse attempts, gateway failures and #1 activations"
        action={
          <button onClick={load} className="btn-secondary h-10 px-4 text-xs font-semibold">
            Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={outcome} onChange={e => setOutcome(e.target.value)} className="input-field text-xs max-w-[180px]" aria-label="Filter by outcome">
          {OUTCOME_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select value={event} onChange={e => setEvent(e.target.value)} className="input-field text-xs max-w-[200px]" aria-label="Filter by event">
          {EVENT_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="neo-card p-6 text-center">
          <p className="text-sm text-text-secondary">No payment events recorded yet.</p>
          <p className="text-xs text-text-secondary mt-1">
            Events appear here as businesses bid, pay via EcoCash, or attempt to abuse the payment endpoints.
          </p>
        </div>
      ) : (
        <div className="neo-card p-4">
          <div className="space-y-2">
            {events.map(e => (
              <div key={e.id} className="rounded-2xl border border-gray-200/80 bg-surface/50 px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  className="w-full flex flex-wrap items-center gap-2.5 text-left"
                >
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${outcomeBadge(e.outcome)}`}>
                    {e.outcome}
                  </span>
                  <span className="text-xs font-bold text-text-primary">{e.event_type}</span>
                  {e.businessName && (
                    <span className="text-xs text-text-secondary truncate">{e.businessName}</span>
                  )}
                  {typeof e.detail?.amount === 'number' && (
                    <span className="text-xs font-semibold text-whatsapp-700">${Number(e.detail.amount).toFixed(2)}</span>
                  )}
                  <span className="ml-auto text-[10px] text-text-secondary shrink-0">{timeAgo(e.created_at)}</span>
                </button>

                {expanded === e.id && (
                  <div className="mt-3 space-y-2 border-t border-gray-200/70 dark:border-gray-700/50 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <p><span className="font-semibold text-text-secondary">When:</span> <span className="text-text-primary">{new Date(e.created_at).toLocaleString()}</span></p>
                      <p className="truncate"><span className="font-semibold text-text-secondary">IP hash:</span> <span className="text-text-primary font-mono">{e.ip_hash || '—'}</span></p>
                      <p className="truncate sm:col-span-2"><span className="font-semibold text-text-secondary">User agent:</span> <span className="text-text-primary">{e.user_agent || '—'}</span></p>
                      {e.bid_id && <p className="truncate"><span className="font-semibold text-text-secondary">Bid:</span> <span className="text-text-primary font-mono">{e.bid_id}</span></p>}
                    </div>
                    {e.detail && Object.keys(e.detail).length > 0 && (
                      <pre className="text-[10px] leading-relaxed bg-gray-900 text-gray-100 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(e.detail, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

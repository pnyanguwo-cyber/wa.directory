'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  Download,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sprout,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { HARVEST_CATEGORIES } from '@/lib/harvest-constants'
import {
  formatFullDate,
  redactPersonalData,
  relativeTime,
  type ChatMessage,
} from '@/lib/chat'

interface TrainingExample {
  id: string
  phone: string
  user_message: string
  assistant_message: string
  category: string
  tags: string[]
  redacted: boolean
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string
  reviewed_at: string | null
  rejection_reason: string
  created_at: string
}

interface HarvestStats {
  pending: number
  approved: number
  rejected: number
  total: number
  ready: boolean
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all'

interface Exchange {
  key: string
  user: string
  assistant: string
  at: string
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  all: 'All examples',
}

export default function AdminHarvest({ initialPhone }: { initialPhone?: string }) {
  const [examples, setExamples] = useState<TrainingExample[]>([])
  const [stats, setStats] = useState<HarvestStats>({ pending: 0, approved: 0, rejected: 0, total: 0, ready: true })
  const [status, setStatus] = useState<StatusFilter>('pending')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [phone, setPhone] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [harvestCategory, setHarvestCategory] = useState<string>('general')
  const [harvestTags, setHarvestTags] = useState('')
  const [redact, setRedact] = useState(true)
  const [saving, setSaving] = useState(false)

  const [drafts, setDrafts] = useState<Record<string, { category: string; tags: string }>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadExamples = useCallback(
    async (nextStatus: StatusFilter, nextCategory: string, nextQuery: string, quiet = false) => {
      if (!quiet) setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ status: nextStatus, category: nextCategory })
        if (nextQuery.trim()) params.set('q', nextQuery.trim())
        const res = await fetch(`/api/admin/harvest?${params.toString()}`, { cache: 'no-store' })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body?.error || 'Could not load training examples')
        setExamples(Array.isArray(body.examples) ? body.examples : [])
        if (body.stats) setStats(body.stats)
      } catch (err) {
        if (!quiet) setError(err instanceof Error ? err.message : 'Could not load training examples')
      } finally {
        if (!quiet) setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    loadExamples(status, category, appliedQuery)
  }, [status, category, appliedQuery, loadExamples])

  const loadConversation = useCallback(async (targetPhone: string) => {
    const cleaned = targetPhone.trim()
    if (!cleaned) return
    setChatLoading(true)
    setChatError('')
    setMessages([])
    setSelected(new Set())
    try {
      const res = await fetch(`/api/admin/chats?phone=${encodeURIComponent(cleaned)}`, { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Conversation not found')
      setMessages(Array.isArray(body?.detail?.messages) ? body.detail.messages : [])
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Could not load that conversation')
    } finally {
      setChatLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialPhone) return
    setPhone(initialPhone)
    loadConversation(initialPhone)
  }, [initialPhone, loadConversation])

  const exchanges = useMemo<Exchange[]>(() => {
    const result: Exchange[] = []
    const list = messages.filter(message => (message.text || '').trim())
    for (let index = 0; index < list.length; index += 1) {
      const inbound = list[index]
      if (inbound.direction !== 'in') continue
      let replyIndex = -1
      for (let next = index + 1; next < list.length; next += 1) {
        if (list[next].direction === 'out') {
          replyIndex = next
          break
        }
        if (list[next].direction === 'in') break
      }
      if (replyIndex === -1) continue
      result.push({
        key: `x-${index}-${replyIndex}`,
        user: inbound.text,
        assistant: list[replyIndex].text,
        at: inbound.at || list[replyIndex].at || '',
      })
      index = replyIndex
    }
    return result
  }, [messages])

  function toggleExchange(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function createExamples() {
    if (selected.size === 0) {
      setChatError('Select at least one complete exchange.')
      return
    }
    setSaving(true)
    setChatError('')
    try {
      const chosen = exchanges.filter(exchange => selected.has(exchange.key))
      const res = await fetch('/api/admin/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          exchanges: chosen.map(exchange => ({
            userMessage: exchange.user,
            assistantMessage: exchange.assistant,
          })),
          category: harvestCategory,
          tags: harvestTags.split(',').map(tag => tag.trim()).filter(Boolean),
          redact,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not save training examples')
      setNotice(`${body.created || chosen.length} example(s) added to pending review.`)
      setSelected(new Set())
      setHarvestTags('')
      await loadExamples(status, category, appliedQuery, true)
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Could not save training examples')
    } finally {
      setSaving(false)
    }
  }

  async function review(id: string, action: 'approve' | 'reject', reason = '') {
    const draft = drafts[id]
    setError('')
    try {
      const res = await fetch('/api/admin/harvest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action,
          category: draft?.category,
          tags: draft ? draft.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
          reason,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not update example')
      setNotice(action === 'approve' ? 'Example approved.' : 'Example rejected.')
      setRejecting(null)
      await loadExamples(status, category, appliedQuery, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update example')
    }
  }

  async function remove(id: string) {
    setError('')
    try {
      const res = await fetch('/api/admin/harvest', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not delete example')
      setNotice('Example deleted.')
      setConfirmDelete(null)
      await loadExamples(status, category, appliedQuery, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete example')
    }
  }

  const exportParams = new URLSearchParams({ format: 'csv', status })
  if (category !== 'all') exportParams.set('category', category)
  const preview = selected.size
    ? exchanges.find(exchange => selected.has(exchange.key))
    : undefined

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-text-primary">Harvest Data</h2>
          <p className="text-[11px] text-text-secondary">
            Turn real bot conversations into reviewed training examples. Originals are never changed.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={`/api/admin/harvest/export?${exportParams.toString()}`}
            className="btn-secondary flex h-8 items-center gap-1 px-2.5 text-[10.5px] font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
          <a
            href={`/api/admin/harvest/export?${new URLSearchParams({ ...Object.fromEntries(exportParams), format: 'json' }).toString()}`}
            className="btn-secondary flex h-8 items-center gap-1 px-2.5 text-[10.5px] font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> JSON
          </a>
          <button
            type="button"
            onClick={() => loadExamples(status, category, appliedQuery)}
            disabled={loading}
            className="btn-secondary flex h-8 items-center gap-1 px-2.5 text-[10.5px] font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {!stats.ready && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Harvest storage is not migrated on this database yet. Apply{' '}
            <b>supabase/migrations/035_chat_management_harvest.sql</b> to enable review, approval and export.
          </span>
        </div>
      )}

      {(error || notice) && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-xl border p-2.5 text-[11px] ${
            error ? 'border-red-200 bg-red-50 text-red-700' : 'border-whatsapp-200 bg-whatsapp-50 text-whatsapp-800'
          }`}
        >
          <span>{error || notice}</span>
          <button type="button" onClick={() => { setError(''); setNotice('') }} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Pending" value={stats.pending} tone="amber" />
        <Stat label="Approved" value={stats.approved} tone="green" />
        <Stat label="Rejected" value={stats.rejected} tone="red" />
        <Stat label="Total harvested" value={stats.total} tone="gray" />
      </div>

      <div className="grid items-start gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
        <section className="rounded-xl border border-gray-100 bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-100 p-2.5">
            <div className="flex flex-wrap gap-0.5 rounded-lg bg-surface p-0.5" role="tablist" aria-label="Review status">
              {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(value => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={status === value}
                  onClick={() => setStatus(value)}
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                    status === value ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
                  }`}
                >
                  {STATUS_LABELS[value]}
                  {value !== 'all' && (
                    <span className="ml-1 text-[9px] text-gray-400">{stats[value]}</span>
                  )}
                </button>
              ))}
            </div>
            <select
              value={category}
              onChange={event => setCategory(event.target.value)}
              aria-label="Filter by category"
              className="input h-7 w-auto py-0 text-[10.5px]"
            >
              <option value="all">All categories</option>
              {HARVEST_CATEGORIES.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <div className="relative ml-auto">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') setAppliedQuery(query)
                }}
                placeholder="Search examples…"
                aria-label="Search training examples"
                className="input h-7 w-44 py-0 pl-7 text-[10.5px]"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-1.5 p-2.5">
              {[1, 2, 3, 4].map(index => (
                <div key={index} className="skeleton h-20 rounded-lg" />
              ))}
            </div>
          ) : examples.length === 0 ? (
            <div className="p-8 text-center">
              <Sprout className="mx-auto h-7 w-7 text-gray-300" />
              <p className="mt-2 text-[12px] font-bold text-text-primary">Nothing here yet</p>
              <p className="mt-0.5 text-[10.5px] text-text-secondary">
                Load a conversation on the right and select exchanges to harvest.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {examples.map(example => {
                const draft = drafts[example.id] || {
                  category: example.category,
                  tags: example.tags.join(', '),
                }
                const isOpen = expanded === example.id
                return (
                  <li key={example.id} className="p-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={example.status} />
                      <span className="rounded-md bg-surface px-1.5 py-0.5 text-[9.5px] font-semibold text-text-secondary">
                        {example.category}
                      </span>
                      {example.redacted && (
                        <span className="flex items-center gap-0.5 rounded-md bg-sky-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-sky-700">
                          <ShieldCheck className="h-2.5 w-2.5" /> redacted
                        </span>
                      )}
                      <span className="ml-auto text-[9.5px] text-gray-400">
                        +{example.phone} · {relativeTime(example.created_at)}
                      </span>
                    </div>

                    <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                      <p className={`rounded-lg bg-surface/70 px-2 py-1.5 text-[10.5px] leading-snug text-text-primary ${isOpen ? '' : 'line-clamp-3'}`}>
                        <span className="mr-1 text-[9px] font-bold uppercase text-gray-400">Customer</span>
                        {example.user_message}
                      </p>
                      <p className={`rounded-lg bg-whatsapp-50/50 px-2 py-1.5 text-[10.5px] leading-snug text-text-primary ${isOpen ? '' : 'line-clamp-3'}`}>
                        <span className="mr-1 text-[9px] font-bold uppercase text-whatsapp-700">Bot</span>
                        {example.assistant_message}
                      </p>
                    </div>

                    {example.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Tag className="h-2.5 w-2.5 text-gray-400" />
                        {example.tags.map(tag => (
                          <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-text-secondary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {example.status === 'rejected' && example.rejection_reason && (
                      <p className="mt-1 text-[9.5px] text-red-600">Reason: {example.rejection_reason}</p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : example.id)}
                        className="text-[10px] font-semibold text-text-secondary hover:text-text-primary"
                      >
                        {isOpen ? 'Show less' : 'Read full'}
                      </button>
                      <span className="text-[9px] text-gray-300">·</span>
                      <span className="text-[9.5px] text-gray-400">{formatFullDate(example.created_at)}</span>

                      {example.status === 'pending' && (
                        <div className="ml-auto flex flex-wrap items-center gap-1.5">
                          <select
                            value={draft.category}
                            onChange={event =>
                              setDrafts(prev => ({ ...prev, [example.id]: { ...draft, category: event.target.value } }))
                            }
                            aria-label="Example category"
                            className="input h-6 w-auto py-0 text-[9.5px]"
                          >
                            {HARVEST_CATEGORIES.map(item => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                          <input
                            value={draft.tags}
                            onChange={event =>
                              setDrafts(prev => ({ ...prev, [example.id]: { ...draft, tags: event.target.value } }))
                            }
                            placeholder="tags, comma separated"
                            aria-label="Example tags"
                            className="input h-6 w-32 py-0 text-[9.5px]"
                          />
                          <button
                            type="button"
                            onClick={() => review(example.id, 'approve')}
                            className="flex h-6 items-center gap-0.5 rounded-md bg-whatsapp-600 px-1.5 text-[9.5px] font-semibold text-white hover:bg-whatsapp-700"
                          >
                            <Check className="h-2.5 w-2.5" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejecting({ id: example.id, reason: '' })}
                            className="flex h-6 items-center gap-0.5 rounded-md border border-red-200 bg-red-50 px-1.5 text-[9.5px] font-semibold text-red-700 hover:bg-red-100"
                          >
                            <X className="h-2.5 w-2.5" /> Reject
                          </button>
                        </div>
                      )}

                      {example.status !== 'pending' && (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(example.id)}
                          className="ml-auto flex h-6 items-center gap-0.5 rounded-md border border-gray-200 px-1.5 text-[9.5px] font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-2.5 w-2.5" /> Delete
                        </button>
                      )}
                    </div>

                    {example.status !== 'pending' && example.reviewed_at && (
                      <p className="mt-1 text-[9px] text-gray-400">
                        Reviewed {formatFullDate(example.reviewed_at)} · {example.reviewed_by || 'admin'}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <div className="border-t border-gray-100 px-2.5 py-1.5 text-[9px] text-gray-400">
            Showing up to 300 examples, newest first. Export honours the current status and category filters.
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-2.5 shadow-card xl:sticky xl:top-2">
          <div className="flex items-center gap-1.5">
            <Sprout className="h-4 w-4 text-whatsapp-600" />
            <p className="text-[12px] font-bold text-text-primary">Harvest a conversation</p>
          </div>
          <p className="mt-0.5 text-[10px] leading-relaxed text-text-secondary">
            Select complete customer → bot exchanges. Only selected pairs are copied into the training set.
          </p>

          <div className="mt-2 flex gap-1.5">
            <input
              value={phone}
              onChange={event => setPhone(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') loadConversation(phone)
              }}
              placeholder="Customer phone, e.g. +263771234567"
              aria-label="Customer phone"
              className="input h-8 flex-1 py-0 text-[10.5px]"
            />
            <button
              type="button"
              onClick={() => loadConversation(phone)}
              disabled={chatLoading || !phone.trim()}
              className="btn-primary flex h-8 items-center gap-1 px-2.5 text-[10.5px] font-semibold disabled:opacity-50"
            >
              {chatLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />} Load
            </button>
          </div>

          {chatError && <p className="mt-1.5 rounded-lg bg-red-50 p-2 text-[10px] text-red-700">{chatError}</p>}

          {chatLoading ? (
            <div className="mt-2 space-y-1.5">
              <div className="skeleton h-12 rounded-lg" />
              <div className="skeleton h-12 rounded-lg" />
              <div className="skeleton h-12 rounded-lg" />
            </div>
          ) : exchanges.length > 0 ? (
            <>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-text-secondary">
                  {exchanges.length} complete exchange{exchanges.length === 1 ? '' : 's'}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      selected.size === exchanges.length ? new Set() : new Set(exchanges.map(exchange => exchange.key))
                    )
                  }
                  className="text-[10px] font-semibold text-whatsapp-700 hover:underline"
                >
                  {selected.size === exchanges.length ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="mt-1.5 max-h-64 space-y-1 overflow-y-auto pr-0.5">
                {exchanges.map(exchange => {
                  const checked = selected.has(exchange.key)
                  return (
                    <label
                      key={exchange.key}
                      className={`flex cursor-pointer items-start gap-1.5 rounded-lg border p-1.5 ${
                        checked ? 'border-whatsapp-300 bg-whatsapp-50/50' : 'border-gray-100 bg-surface/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExchange(exchange.key)}
                        className="mt-0.5 h-3 w-3 shrink-0 accent-whatsapp-600"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[10px] font-semibold text-text-primary">{exchange.user}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-text-secondary">→ {exchange.assistant}</span>
                        {exchange.at && (
                          <span className="mt-0.5 block text-[9px] text-gray-400">{formatFullDate(exchange.at)}</span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <label className="text-[9.5px] font-semibold text-text-secondary">
                  Category
                  <select
                    value={harvestCategory}
                    onChange={event => setHarvestCategory(event.target.value)}
                    className="input mt-0.5 h-7 w-full py-0 text-[10px]"
                  >
                    {HARVEST_CATEGORIES.map(item => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[9.5px] font-semibold text-text-secondary">
                  Tags
                  <input
                    value={harvestTags}
                    onChange={event => setHarvestTags(event.target.value)}
                    placeholder="pricing, urgent"
                    className="input mt-0.5 h-7 w-full py-0 text-[10px]"
                  />
                </label>
              </div>

              <label className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-surface/60 p-1.5">
                <input
                  type="checkbox"
                  checked={redact}
                  onChange={event => setRedact(event.target.checked)}
                  className="mt-0.5 h-3 w-3 accent-whatsapp-600"
                />
                <span className="text-[9.5px] leading-relaxed text-text-secondary">
                  <b className="text-text-primary">Redact personal data</b> (phone numbers, emails, IDs) before saving.
                  Recommended.
                </span>
              </label>

              {redact && preview && (
                <div className="mt-1.5 rounded-lg border border-sky-100 bg-sky-50/60 p-1.5">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-sky-700">Redacted preview</p>
                  <p className="mt-0.5 line-clamp-2 text-[9.5px] text-text-primary">{redactPersonalData(preview.user)}</p>
                </div>
              )}

              <button
                type="button"
                onClick={createExamples}
                disabled={saving || selected.size === 0}
                className="btn-primary mt-2 flex h-8 w-full items-center justify-center gap-1.5 text-[10.5px] font-semibold disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sprout className="h-3 w-3" />}
                Add {selected.size || ''} to Training Set
              </button>
              <p className="mt-1 text-center text-[9px] text-gray-400">
                New examples start as pending and need approval before use.
              </p>
            </>
          ) : (
            <p className="mt-2 rounded-lg bg-surface/60 p-2.5 text-[10px] leading-relaxed text-text-secondary">
              Load a customer conversation to see its complete exchanges. You can also start from any chat in the Chats
              tab with “Harvest This Chat”.
            </p>
          )}
        </section>
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-white p-3.5 shadow-xl">
            <p className="text-[12px] font-bold text-text-primary">Reject this example?</p>
            <p className="mt-0.5 text-[10.5px] text-text-secondary">
              The original conversation is untouched. Add an optional reason for the audit trail.
            </p>
            <textarea
              value={rejecting.reason}
              onChange={event => setRejecting({ ...rejecting, reason: event.target.value })}
              rows={3}
              placeholder="Reason (optional)"
              className="input mt-2 w-full text-[11px]"
            />
            <div className="mt-2 flex justify-end gap-1.5">
              <button type="button" onClick={() => setRejecting(null)} className="btn-secondary h-8 px-3 text-[10.5px] font-semibold">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => review(rejecting.id, 'reject', rejecting.reason)}
                className="flex h-8 items-center rounded-lg bg-red-600 px-3 text-[10.5px] font-semibold text-white hover:bg-red-700"
              >
                Reject example
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-white p-3.5 shadow-xl">
            <p className="text-[12px] font-bold text-text-primary">Delete this training example?</p>
            <p className="mt-0.5 text-[10.5px] text-text-secondary">
              This removes the harvested copy only. The source conversation remains in chat history.
            </p>
            <div className="mt-2 flex justify-end gap-1.5">
              <button type="button" onClick={() => setConfirmDelete(null)} className="btn-secondary h-8 px-3 text-[10.5px] font-semibold">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => remove(confirmDelete)}
                className="flex h-8 items-center rounded-lg bg-red-600 px-3 text-[10.5px] font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'green' | 'red' | 'gray' }) {
  const tones = {
    amber: 'border-amber-100 bg-amber-50 text-amber-800',
    green: 'border-whatsapp-100 bg-whatsapp-50 text-whatsapp-800',
    red: 'border-red-100 bg-red-50 text-red-700',
    gray: 'border-gray-100 bg-white text-text-primary',
  }
  return (
    <div className={`rounded-xl border p-2.5 shadow-card ${tones[tone]}`}>
      <p className="text-[9.5px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold leading-none">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: TrainingExample['status'] }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-whatsapp-50 text-whatsapp-700 border-whatsapp-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold capitalize ${styles[status]}`}>{status}</span>
  )
}

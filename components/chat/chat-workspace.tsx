'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  Ban,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  Info,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Search,
  Send,
  Sprout,
  UserRound,
  X,
} from 'lucide-react'
import {
  formatDay,
  formatFullDate,
  formatPhone,
  formatTime,
  initials,
  phoneDigits,
  relativeTime,
  type ChatDetail,
  type ChatMessage,
  type ChatThread,
} from '@/lib/chat'
import { isChatMuted, playChatChime, setChatMuted, unlockChatAudio } from '@/lib/chat-notify'
import WhatsAppText from './whatsapp-text'

function chatMessageKey(message: ChatMessage): string {
  return `${message.id}|${message.at || ''}|${message.direction}`
}

type Filter = 'all' | 'active' | 'archived'
type Action =
  | 'read'
  | 'resolve'
  | 'reopen'
  | 'archive'
  | 'unarchive'
  | 'block'
  | 'unblock'

interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  tone: 'danger' | 'primary'
  run: () => Promise<void>
}

export default function ChatWorkspace({
  endpoint,
  branchId,
  canBlock = true,
  canClear = false,
  onHarvest,
  harvestLabel = 'Harvest This Chat',
  initialPhone,
  emptyTitle = 'No conversations yet',
  emptyBody = 'When a customer talks to the WhatsApp bot, their conversation appears here.',
  subtitle,
}: {
  endpoint: string
  branchId?: string
  canBlock?: boolean
  canClear?: boolean
  onHarvest?: (phone: string) => void
  harvestLabel?: string
  initialPhone?: string
  emptyTitle?: string
  emptyBody?: string
  subtitle?: string
}) {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [detail, setDetail] = useState<ChatDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [visibleCount, setVisibleCount] = useState(80)
  const [busy, setBusy] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [toast, setToast] = useState('')
  const [muted, setMuted] = useState(false)
  const latestMessageAt = detail?.messages[detail.messages.length - 1]?.at || null
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const seenRef = useRef<Map<string, string>>(new Map())
  const primedRef = useRef(false)

  const withBranch = useCallback(
    (url: string) => {
      if (!branchId) return url
      return `${url}${url.includes('?') ? '&' : '?'}branch=${encodeURIComponent(branchId)}`
    },
    [branchId]
  )

  // Chime + toast when an inbound message lands. Runs off the polled inbox, so
  // it fires for other conversations too, not just the one on screen.
  function announceNewChats(next: ChatThread[]) {
    if (!primedRef.current) {
      next.forEach(thread => seenRef.current.set(thread.phone, thread.lastAt || ''))
      primedRef.current = true
      return
    }
    const fresh: ChatThread[] = []
    for (const thread of next) {
      const previous = seenRef.current.get(thread.phone)
      const at = thread.lastAt || ''
      const isNew =
        previous === undefined
          ? thread.unread
          : thread.unread && !!at && previous !== at && Date.parse(at) > Date.parse(previous)
      if (isNew) fresh.push(thread)
      seenRef.current.set(thread.phone, at)
    }
    if (!fresh.length || isChatMuted()) return
    playChatChime()
    const first = fresh[0]
    setToast(
      fresh.length === 1
        ? `New message from ${first.name || formatPhone(first.phone)}`
        : `${fresh.length} new chats need a reply`
    )
  }

  const loadThreads = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true)
      try {
        const res = await fetch(withBranch(endpoint), { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Could not load conversations')
        const next: ChatThread[] = Array.isArray(data.threads) ? data.threads : []
        setThreads(next)
        announceNewChats(next)
        setError('')
      } catch (err) {
        if (!quiet) setError(err instanceof Error ? err.message : 'Could not load conversations')
      } finally {
        if (!quiet) setLoading(false)
      }
    },
    [endpoint, withBranch]
  )

  const loadDetail = useCallback(
    async (phone: string, quiet = false, before?: string) => {
      if (!quiet) {
        setDetailLoading(true)
        setDetailError('')
      }
      try {
        const cursor = before ? `&before=${encodeURIComponent(before)}` : ''
        const url = withBranch(`${endpoint}?phone=${encodeURIComponent(phone)}${cursor}`)
        const res = await fetch(url, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Could not load this conversation')
        const next = data.detail as ChatDetail
        setDetail(prev => {
          if (!prev || prev.thread.phone !== next.thread.phone) return next
          if (before) {
            const seen = new Set(next.messages.map(chatMessageKey))
            const newer = prev.messages.filter(message => !seen.has(chatMessageKey(message)))
            return { ...next, messages: [...newer, ...next.messages] }
          }
          if (quiet && prev.messages.length > next.messages.length) {
            const newestAt = next.messages[0]?.at || ''
            const older = prev.messages.filter(
              message => (message.at || '') < newestAt && !next.messages.some(item => chatMessageKey(item) === chatMessageKey(message))
            )
            if (older.length) {
              return { ...next, messages: [...older, ...next.messages], hasMore: prev.hasMore, nextBefore: prev.nextBefore }
            }
          }
          return next
        })
        setThreads(prev => prev.map(thread => (thread.phone === phone ? next.thread : thread)))
        return next
      } catch (err) {
        if (!quiet) setDetailError(err instanceof Error ? err.message : 'Could not load this conversation')
        return null
      } finally {
        if (!quiet) setDetailLoading(false)
      }
    },
    [endpoint, withBranch]
  )

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  useEffect(() => {
    if (!initialPhone || loading || selectedPhone) return
    if (threads.some(thread => thread.phone === initialPhone)) {
      selectThread(initialPhone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhone, loading, threads.length])

  useEffect(() => {
    setVisibleCount(80)
  }, [selectedPhone])

  // Muted preference + a first user gesture to unlock the alert sound.
  useEffect(() => {
    setMuted(isChatMuted())
    const unlock = () => unlockChatAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Live inbox: poll even with nothing selected, and refresh the open thread.
  useEffect(() => {
    function tick() {
      if (document.visibilityState !== 'visible') return
      loadThreads(true)
      if (selectedPhone) loadDetail(selectedPhone, true)
    }
    const timer = setInterval(tick, 5_000)
    window.addEventListener('focus', tick)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [selectedPhone, loadThreads, loadDetail])

  useEffect(() => {
    if (!selectedPhone || !detail) return
    const list = messagesRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [selectedPhone, latestMessageAt])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(timer)
  }, [toast])

  async function showEarlier() {
    if (!detail || !selectedPhone) return
    const previousTotal = detail.messages.length
    let available = previousTotal
    if (visibleCount + 80 > available && detail.hasMore && detail.nextBefore) {
      const next = await loadDetail(selectedPhone, true, detail.nextBefore)
      if (next && next.messages.length > 0) {
        // Keep the messages already on screen and reveal 80 more above them.
        const mergedTotal = previousTotal + next.messages.length
        setVisibleCount(mergedTotal - Math.max(0, previousTotal - visibleCount) + 80)
        return
      }
      if (next && next.messages.length > 0) available = next.messages.length
    }
    setVisibleCount(count => Math.min(available, count + 80))
  }

  async function selectThread(phone: string) {
    setSelectedPhone(phone)
    setMoreOpen(false)
    setDetail(null)
    setDetailsOpen(false)
    await loadDetail(phone)
    // Mark read best-effort; the unread dot clears locally either way.
    setThreads(prev => prev.map(thread => (thread.phone === phone ? { ...thread, unread: false } : thread)))
    fetch(withBranch(endpoint), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, action: 'read', branch_id: branchId }),
    }).catch(() => {})
  }

  async function act(action: Action, phone = selectedPhone) {
    if (!phone) return
    setBusy(action)
    try {
      const res = await fetch(withBranch(endpoint), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action, branch_id: branchId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not update the conversation')
      const status =
        action === 'resolve'
          ? 'resolved'
          : action === 'archive'
            ? 'archived'
            : action === 'reopen' || action === 'unarchive'
              ? 'active'
              : null
      const blocked = action === 'block' ? true : action === 'unblock' ? false : null
      setThreads(prev =>
        prev.map(thread =>
          thread.phone === phone
            ? {
                ...thread,
                status: status ?? thread.status,
                blocked: blocked ?? thread.blocked,
                unread: false,
              }
            : thread
        )
      )
      setDetail(prev =>
        prev && prev.thread.phone === phone
          ? {
              ...prev,
              thread: {
                ...prev.thread,
                status: status ?? prev.thread.status,
                blocked: blocked ?? prev.thread.blocked,
                unread: false,
              },
            }
          : prev
      )
      setToast(
        action === 'resolve'
          ? 'Marked as resolved'
          : action === 'archive'
            ? 'Conversation archived'
            : action === 'block'
              ? 'Customer blocked'
              : action === 'unblock'
                ? 'Customer unblocked'
                : action === 'unarchive' || action === 'reopen'
                  ? 'Conversation reopened'
                  : 'Conversation updated'
      )
      setMoreOpen(false)
      loadThreads(true)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not update the conversation')
    } finally {
      setBusy('')
    }
  }

  async function clearConversation(phone: string) {
    setBusy('clear')
    try {
      const res = await fetch('/api/admin/chat-sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not clear the session')
      setThreads(prev => prev.filter(thread => thread.phone !== phone))
      setSelectedPhone(null)
      setDetail(null)
      setMoreOpen(false)
      setToast('Bot session cleared')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not clear the session')
    } finally {
      setBusy('')
    }
  }

  async function toggleHold(phone: string, held: boolean) {
    setBusy('hold')
    try {
      const res = await fetch('/api/admin/chat-sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action: held ? 'release' : 'hold' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not update the hold')
      await loadDetail(phone)
      setToast(held ? 'Hold released' : 'Session held — the bot will pause for this contact')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not update the hold')
    } finally {
      setBusy('')
    }
  }

  function askBlock(phone: string) {
    setConfirm({
      title: 'Block this customer?',
      message:
        'The conversation is hidden from active chats and the contact is flagged. No messages are deleted and you can unblock at any time.',
      confirmLabel: 'Block customer',
      tone: 'danger',
      run: async () => {
        await act('block', phone)
      },
    })
  }

  function askClear(phone: string) {
    setConfirm({
      title: 'Clear the bot session?',
      message:
        'This removes the contact’s live bot state (their current step and saved answers) so their next message starts fresh. Transcript history is kept.',
      confirmLabel: 'Clear session',
      tone: 'danger',
      run: async () => {
        await clearConversation(phone)
      },
    })
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return threads.filter(thread => {
      if (filter === 'active' && thread.status !== 'active') return false
      if (filter === 'archived' && thread.status !== 'archived') return false
      if (!term) return true
      return (
        thread.phone.includes(term.replace(/\D/g, '')) ||
        thread.name.toLowerCase().includes(term) ||
        thread.lastText.toLowerCase().includes(term) ||
        (thread.businessName || '').toLowerCase().includes(term)
      )
    })
  }, [threads, filter, query])

  const counts = useMemo(
    () => ({
      all: threads.length,
      active: threads.filter(thread => thread.status === 'active').length,
      archived: threads.filter(thread => thread.status === 'archived').length,
      unread: threads.filter(thread => thread.unread).length,
    }),
    [threads]
  )

  const selectedThread = detail?.thread || threads.find(thread => thread.phone === selectedPhone) || null
  const held = detail?.insights.some(insight => insight.label === 'Session hold') || false
  const visibleMessages = detail ? detail.messages.slice(Math.max(0, detail.messages.length - visibleCount)) : []
  const hasEarlier = detail ? detail.messages.length > visibleCount || detail.hasMore : false

  function openMap(location: string, phone: string) {
    const target = location.trim() || `+${phoneDigits(phone)}`
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`, '_blank', 'noopener,noreferrer')
  }

  function copyPhone(phone: string) {
    navigator.clipboard?.writeText(`+${phoneDigits(phone)}`).then(
      () => setToast('Phone number copied'),
      () => setToast('Could not copy the number')
    )
  }

  const detailsPanel = selectedThread ? (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-3.5 py-3.5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Conversation details</p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-whatsapp-100 text-xs font-extrabold text-whatsapp-800">
              {initials(selectedThread.phone)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-text-primary">
                {selectedThread.name || formatPhone(selectedThread.phone)}
              </p>
              <p className="truncate text-[11px] text-text-secondary">{formatPhone(selectedThread.phone)}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusPill status={selectedThread.status} />
            {selectedThread.blocked && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">Blocked</span>
            )}
            {selectedThread.foundVia && (
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                via {selectedThread.foundVia}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen(false)}
          className="rounded-lg p-1 text-text-secondary hover:bg-surface xl:hidden"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4">
        <section className="space-y-1.5">
          <InfoRow label="Phone" value={formatPhone(selectedThread.phone)} />
          <InfoRow label="First contact" value={formatFullDate(selectedThread.firstAt)} />
          <InfoRow label="Last message" value={formatFullDate(selectedThread.lastAt)} />
          <InfoRow label="Messages" value={String(selectedThread.messageCount || detail?.messages.length || 0)} />
          <InfoRow label={selectedThread.channel === 'business' ? 'Listing area' : 'Location'} value={selectedThread.location || 'Not shared'} />
          {selectedThread.channel === 'bot' && (
            <InfoRow label="Business" value={selectedThread.businessName || 'No chat opened yet'} />
          )}
        </section>

        <section>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Quick insights</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(detail?.insights || [
              { label: 'Messages', value: String(selectedThread.messageCount) },
              { label: 'Status', value: selectedThread.status },
            ]).slice(0, 6).map(insight => (
              <div key={insight.label} className="rounded-lg border border-gray-100 bg-surface/60 px-2 py-1.5">
                <p className="truncate text-[9.5px] font-semibold uppercase tracking-wide text-gray-400">{insight.label}</p>
                <p className="truncate text-[11.5px] font-bold text-text-primary">{insight.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Management</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => act('resolve')} disabled={!!busy} className="action-button">
              <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
            </button>
            <button type="button" onClick={() => act('archive')} disabled={!!busy} className="action-button">
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
            {canBlock && (
              <button
                type="button"
                onClick={() => askBlock(selectedThread.phone)}
                disabled={!!busy}
                className="action-button text-red-600 hover:bg-red-50"
              >
                <Ban className="h-3.5 w-3.5" /> Block
              </button>
            )}
            <button type="button" onClick={() => openMap(selectedThread.location || '', selectedThread.phone)} className="action-button">
              <MapPin className="h-3.5 w-3.5" /> Map
            </button>
          </div>
          {onHarvest && (
            <button
              type="button"
              onClick={() => onHarvest(selectedThread.phone)}
              className="mt-1.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-whatsapp-600 text-[11.5px] font-semibold text-white transition-colors hover:bg-whatsapp-700"
            >
              <Sprout className="h-3.5 w-3.5" /> {harvestLabel}
            </button>
          )}
          {selectedThread.status !== 'active' && (
            <button
              type="button"
              onClick={() => act(selectedThread.status === 'archived' ? 'unarchive' : 'reopen')}
              disabled={!!busy}
              className="mt-1.5 h-8 w-full rounded-lg border border-gray-200 text-[11px] font-semibold text-text-secondary hover:bg-surface disabled:opacity-50"
            >
              {selectedThread.status === 'archived' ? 'Move back to active chats' : 'Reopen conversation'}
            </button>
          )}
        </section>
      </div>
    </div>
  ) : (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <UserRound className="h-7 w-7 text-gray-300" />
      <p className="mt-2 text-xs font-semibold text-text-secondary">Select a conversation</p>
      <p className="mt-0.5 text-[11px] text-gray-400">Customer details and quick insights appear here.</p>
    </div>
  )

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold tracking-tight text-text-primary">Chats</h2>
          <p className="text-[11px] text-text-secondary">
            {subtitle || 'Customer conversations attributed to the WhatsApp bot. Private WhatsApp chats stay private.'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-whatsapp-700 shadow-card sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-whatsapp-500" />
            Live
          </span>
          <button
            type="button"
            onClick={() => {
              const next = !muted
              setMuted(next)
              setChatMuted(next)
              if (!next) {
                unlockChatAudio()
                setToast('Sound alerts on')
              } else {
                setToast('Sound alerts muted')
              }
            }}
            aria-pressed={muted}
            title={muted ? 'New chat alerts are muted' : 'Mute new chat alerts'}
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
              muted
                ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                : 'border-gray-200 bg-white text-text-secondary hover:bg-surface'
            }`}
          >
            {muted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{muted ? 'Muted' : 'Alerts'}</span>
          </button>
          <button onClick={() => loadThreads()} className="btn-secondary h-8 px-3 text-[11px] font-semibold">
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="relative flex h-[calc(100dvh-11rem)] min-h-[540px] overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-card lg:grid lg:h-[calc(100vh-8rem)] lg:grid-cols-[minmax(240px,30fr)_minmax(0,70fr)] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[minmax(228px,27fr)_minmax(0,50fr)_minmax(238px,23fr)]">
        {/* Left: inbox */}
        <aside
          className={`${selectedPhone ? 'hidden lg:flex' : 'flex'} w-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-gray-100 lg:w-auto`}
          aria-label="Chat inbox"
        >
          <div className="border-b border-gray-100 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12.5px] font-extrabold text-text-primary">Inbox</p>
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                {counts.all} chat{counts.all === 1 ? '' : 's'}
              </span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search chats"
                aria-label="Search chats"
                className="h-8 w-full rounded-lg border border-gray-200 bg-surface/60 pl-8 pr-2.5 text-[11.5px] outline-none transition-colors focus:border-whatsapp-400 focus:bg-white"
              />
            </div>
            <div className="mt-2 flex items-center gap-1" role="tablist" aria-label="Chat filters">
              {(
                [
                  ['all', 'All Chats', counts.all],
                  ['active', 'Active', counts.active],
                  ['archived', 'Archived', counts.archived],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  onClick={() => setFilter(key)}
                  className={`rounded-md px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                    filter === key
                      ? 'bg-whatsapp-50 text-whatsapp-800'
                      : 'text-text-secondary hover:bg-surface'
                  }`}
                >
                  {label}
                  <span className="ml-1 text-[9.5px] opacity-70">{count}</span>
                </button>
              ))}
              {(query || filter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setFilter('all')
                  }}
                  className="ml-auto text-[10px] font-semibold text-whatsapp-700 hover:underline"
                >
                  View all
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-2.5">
                {[1, 2, 3, 4, 5].map(index => (
                  <div key={index} className="skeleton h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                <MessageCircle className="h-7 w-7 text-gray-300" />
                <p className="mt-2 text-xs font-semibold text-text-primary">
                  {threads.length ? 'No chats match this filter' : emptyTitle}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
                  {threads.length ? 'Try a different search or switch back to All Chats.' : emptyBody}
                </p>
              </div>
            ) : (
              filtered.map(thread => {
                const active = selectedPhone === thread.phone
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => selectThread(thread.phone)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full items-start gap-2.5 border-b border-gray-50 px-3 py-2.5 text-left transition-colors ${
                      active ? 'bg-whatsapp-50/70' : 'hover:bg-surface/70'
                    }`}
                  >
                    <div
                      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10.5px] font-extrabold ${
                        active ? 'bg-whatsapp-500 text-white' : 'bg-whatsapp-50 text-whatsapp-800'
                      }`}
                    >
                      {initials(thread.phone)}
                      {thread.unread && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-red-600 px-0.5 text-[9px] font-bold leading-none text-white tabular-nums">
                          {Math.min(99, thread.unreadCount || 1)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`truncate text-[12px] ${thread.unread ? 'font-extrabold' : 'font-bold'} text-text-primary`}>
                          {thread.name || formatPhone(thread.phone)}
                        </p>
                        <span className="ml-auto shrink-0 text-[9.5px] font-medium text-gray-400">
                          {relativeTime(thread.lastAt)}
                        </span>
                      </div>
                      <p className={`mt-0.5 truncate text-[11px] ${thread.unread ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {thread.lastText}
                      </p>
                      <div className="mt-1 flex items-center gap-1">
                        {thread.status === 'archived' && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">
                            Archived
                          </span>
                        )}
                        {thread.status === 'resolved' && (
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                            Resolved
                          </span>
                        )}
                        {thread.blocked && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-600">
                            Blocked
                          </span>
                        )}
                        {thread.channel === 'bot' && thread.businessName && (
                          <span className="truncate rounded bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-text-secondary">
                            {thread.businessName}
                          </span>
                        )}
                        {thread.foundVia && thread.channel === 'business' && (
                          <span className="truncate rounded bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-text-secondary">
                            via {thread.foundVia}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
          <div className="border-t border-gray-100 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setFilter('all')
              }}
              className="text-[10.5px] font-semibold text-whatsapp-700 hover:underline"
            >
              View All Chats
            </button>
          </div>
        </aside>

        {/* Centre: conversation */}
        <section className={`${selectedPhone ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 min-h-0 flex-col overflow-hidden bg-[#fbfcfb]`} aria-label="Conversation">
          {!selectedThread ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-whatsapp-50 text-whatsapp-600">
                <MessageCircle className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-bold text-text-primary">Select a chat to open the conversation</p>
              <p className="mt-1 max-w-xs text-[11.5px] leading-relaxed text-text-secondary">
                Choose a conversation from the inbox to see the full history, customer details and management actions.
              </p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhone(null)
                    setDetail(null)
                  }}
                  className="rounded-lg p-1 text-text-secondary hover:bg-surface lg:hidden"
                  aria-label="Back to chats"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-whatsapp-100 text-[10px] font-extrabold text-whatsapp-800">
                  {initials(selectedThread.phone)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-extrabold text-text-primary">
                    {selectedThread.name || formatPhone(selectedThread.phone)}
                  </p>
                  <p className="truncate text-[10px] text-text-secondary">
                    {selectedThread.channel === 'bot' ? 'WhatsApp bot conversation' : 'Directory bot conversation'}
                    {selectedThread.foundVia ? ` · found via ${selectedThread.foundVia}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `tel:+${phoneDigits(selectedThread.phone)}`
                    }}
                    aria-label="Call customer"
                    className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2 text-[10.5px] font-semibold text-text-primary hover:bg-surface"
                  >
                    <Phone className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openMap(selectedThread.location || '', selectedThread.phone)}
                    aria-label="View location on map"
                    className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2 text-[10.5px] font-semibold text-text-primary hover:bg-surface"
                  >
                    <MapPin className="h-3.5 w-3.5" /> <span className="hidden sm:inline">View on Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(true)}
                    aria-label="Open conversation details"
                    className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2 text-[10.5px] font-semibold text-text-primary hover:bg-surface xl:hidden"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMoreOpen(open => !open)}
                      className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2 text-[10.5px] font-semibold text-text-primary hover:bg-surface"
                      aria-expanded={moreOpen}
                      aria-label="More conversation actions"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" /> <span className="hidden sm:inline">More</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {moreOpen && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-20 cursor-default"
                          onClick={() => setMoreOpen(false)}
                          aria-label="Close menu"
                        />
                        <div className="absolute right-0 top-9 z-30 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-dropdown">
                          {onHarvest && (
                            <MenuButton
                              icon={<Sprout className="h-3.5 w-3.5" />}
                              onClick={() => {
                                setMoreOpen(false)
                                onHarvest(selectedThread.phone)
                              }}
                            >
                              {harvestLabel}
                            </MenuButton>
                          )}
                          <MenuButton
                            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                            onClick={() => act(selectedThread.status === 'resolved' ? 'reopen' : 'resolve')}
                          >
                            {selectedThread.status === 'resolved' ? 'Reopen chat' : 'Mark as Resolved'}
                          </MenuButton>
                          <MenuButton
                            icon={<Archive className="h-3.5 w-3.5" />}
                            onClick={() => act(selectedThread.status === 'archived' ? 'unarchive' : 'archive')}
                          >
                            {selectedThread.status === 'archived' ? 'Unarchive chat' : 'Archive Chat'}
                          </MenuButton>
                          <MenuButton icon={<Copy className="h-3.5 w-3.5" />} onClick={() => copyPhone(selectedThread.phone)}>
                            Copy phone number
                          </MenuButton>
                          <MenuButton
                            icon={<ExternalLink className="h-3.5 w-3.5" />}
                            onClick={() => window.open(`https://wa.me/${phoneDigits(selectedThread.phone)}`, '_blank', 'noopener,noreferrer')}
                          >
                            Open in WhatsApp
                          </MenuButton>
                          {canBlock && (
                            <MenuButton
                              icon={<Ban className="h-3.5 w-3.5" />}
                              danger
                              onClick={() =>
                                selectedThread.blocked ? act('unblock') : askBlock(selectedThread.phone)
                              }
                            >
                              {selectedThread.blocked ? 'Unblock user' : 'Block User'}
                            </MenuButton>
                          )}
                          {canClear && (
                            <MenuButton
                              icon={<Clock3 className="h-3.5 w-3.5" />}
                              onClick={() => toggleHold(selectedThread.phone, held)}
                            >
                              {held ? 'Release session hold' : 'Hold session'}
                            </MenuButton>
                          )}
                          {canClear && (
                            <MenuButton
                              icon={<X className="h-3.5 w-3.5" />}
                              danger
                              onClick={() => askClear(selectedThread.phone)}
                            >
                              Clear bot session
                            </MenuButton>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </header>

              <div ref={messagesRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-4">
                {detailLoading && !detail ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(index => (
                      <div key={index} className={`skeleton h-10 rounded-2xl ${index % 2 ? 'w-2/3' : 'ml-auto w-1/2'}`} />
                    ))}
                  </div>
                ) : detailError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[11.5px] text-red-700">{detailError}</div>
                ) : visibleMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <MessageCircle className="h-7 w-7 text-gray-300" />
                    <p className="mt-2 text-xs font-semibold text-text-primary">No transcript yet</p>
                    <p className="mt-0.5 text-[11px] text-text-secondary">
                      This chat was attributed, but the bot has not logged any messages for it.
                    </p>
                  </div>
                ) : (
                  <>
                    {hasEarlier && (
                      <div className="flex justify-center pb-1">
                        <button
                          type="button"
                          onClick={showEarlier}
                          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[10.5px] font-semibold text-text-secondary hover:bg-surface"
                        >
                          {detail!.hasMore ? 'Load earlier messages' : `Load earlier messages (${detail!.messages.length - visibleCount} more)`}
                        </button>
                      </div>
                    )}
                    {visibleMessages.map((message, index) => {
                      const previous = visibleMessages[index - 1]
                      const newDay = !previous || formatDay(previous.at) !== formatDay(message.at)
                      return (
                        <div key={`${message.id}-${index}`}>
                          {newDay && message.at && (
                            <div className="mb-2 mt-1 flex justify-center">
                              <span className="rounded-full bg-white px-2.5 py-0.5 text-[9.5px] font-semibold text-gray-400 shadow-sm">
                                {formatDay(message.at)}
                              </span>
                            </div>
                          )}
                          <MessageBubble message={message} />
                        </div>
                      )
                    })}
                    <div ref={messageEndRef} />
                  </>
                )}
              </div>

              <div className="border-t border-gray-100 bg-white px-3 py-2.5">
                {detail?.canReply ? (
                  <form
                    onSubmit={event => {
                      event.preventDefault()
                      setToast('Replies are not connected to the bot from this workspace yet.')
                    }}
                    className="flex items-center gap-2"
                  >
                    <textarea
                      rows={1}
                      placeholder="Type a reply…"
                      className="h-9 flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-[11.5px] outline-none focus:border-whatsapp-400"
                    />
                    <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-lg bg-whatsapp-500 text-white">
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 flex-1 text-[10px] leading-relaxed text-text-secondary">
                      {detail?.replyHint ||
                        'Replies are sent from WhatsApp Business on your phone. This workspace is transcript-only.'}
                    </p>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => window.open(`https://wa.me/${phoneDigits(selectedThread.phone)}`, '_blank', 'noopener,noreferrer')}
                        className="flex h-8 items-center gap-1.5 rounded-lg bg-whatsapp-500 px-2.5 text-[10.5px] font-semibold text-white hover:bg-whatsapp-600"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Reply in WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* Right: details */}
        <aside className="hidden min-w-0 border-l border-gray-100 xl:flex" aria-label="Conversation details">
          {detailsPanel}
        </aside>

        {/* Details drawer (tablet/mobile) */}
        {detailsOpen && selectedThread && (
          <div className="absolute inset-0 z-40 xl:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-text-primary/20"
              onClick={() => setDetailsOpen(false)}
              aria-label="Close details"
            />
            <div className="absolute inset-y-0 right-0 w-[86vw] max-w-[330px] bg-white shadow-2xl">{detailsPanel}</div>
          </div>
        )}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white bg-white p-4 shadow-2xl">
            <p className="text-sm font-bold text-text-primary">{confirm.title}</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-text-secondary">{confirm.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirm(null)} className="btn-secondary h-8 px-3 text-[11px] font-semibold">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const action = confirm
                  setConfirm(null)
                  await action.run()
                }}
                className={`h-8 rounded-lg px-3 text-[11px] font-semibold text-white ${
                  confirm.tone === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-whatsapp-600 hover:bg-whatsapp-700'
                }`}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-text-primary px-3.5 py-2 text-[11px] font-semibold text-white shadow-dropdown">
          {toast}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: ChatThread['status'] }) {
  const styles =
    status === 'resolved'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'archived'
        ? 'bg-gray-100 text-gray-600'
        : 'bg-whatsapp-50 text-whatsapp-800'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${styles}`}>{status}</span>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-50 pb-1.5 last:border-0">
      <span className="shrink-0 text-[10.5px] font-medium text-gray-400">{label}</span>
      <span className="min-w-0 break-words text-right text-[11px] font-semibold text-text-primary">{value}</span>
    </div>
  )
}

function MenuButton({
  children,
  icon,
  onClick,
  danger = false,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11.5px] font-medium transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-text-primary hover:bg-surface'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.direction === 'system') {
    return (
      <div className="flex justify-center py-0.5">
        <span className="max-w-[85%] rounded-full bg-white px-2.5 py-1 text-center text-[9.5px] font-medium text-text-secondary shadow-sm">
          {message.text}
        </span>
      </div>
    )
  }

  const outgoing = message.direction === 'out'
  return (
    <div className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[11.5px] leading-relaxed shadow-[0_1px_2px_rgba(11,20,26,0.08)] sm:max-w-[76%] ${
          outgoing
            ? 'rounded-br-[5px] border border-whatsapp-100 bg-gradient-to-b from-whatsapp-50 to-whatsapp-100 text-text-primary'
            : 'rounded-bl-[5px] border border-gray-200/80 bg-white text-text-primary'
        }`}
      >
        {message.preview && <MessagePreview preview={message.preview} />}
        {message.text && message.text !== message.preview?.title && (
          <WhatsAppText text={message.text} />
        )}
        <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${outgoing ? 'text-whatsapp-700/70' : 'text-gray-400'}`}>
          {message.at && <span>{formatTime(message.at)}</span>}
          {outgoing && <Check className="h-3 w-3" />}
        </div>
      </div>
    </div>
  )
}

function MessagePreview({ preview }: { preview: NonNullable<ChatMessage['preview']> }) {
  if (preview.kind === 'buttons' && preview.buttons?.length) {
    return (
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {preview.buttons.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="rounded-full border border-whatsapp-200 bg-whatsapp-50 px-2.5 py-1 text-[10px] font-semibold text-whatsapp-800"
          >
            {label}
          </span>
        ))}
      </div>
    )
  }
  if (preview.kind === 'rows' && preview.rows?.length) {
    return (
      <div className="mb-1.5 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {preview.rows.map((row, index) => (
          <p
            key={`${row}-${index}`}
            className={`px-2.5 py-1.5 text-[10.5px] font-medium text-text-primary ${index ? 'border-t border-gray-100' : ''}`}
          >
            {row}
          </p>
        ))}
      </div>
    )
  }
  if (preview.kind === 'link' && preview.href) {
    return (
      <a
        href={preview.href}
        target="_blank"
        rel="noreferrer"
        className="mb-1.5 flex items-center justify-center gap-1.5 rounded-lg border border-whatsapp-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-whatsapp-700 transition-colors hover:bg-whatsapp-50"
      >
        <ExternalLink className="h-3 w-3" />
        {preview.title || preview.href}
      </a>
    )
  }
  if (preview.kind === 'business') {
    return (
      <a
        href={preview.href || undefined}
        target={preview.href ? '_blank' : undefined}
        rel="noreferrer"
        className="mb-1.5 flex items-center gap-2 rounded-lg border border-whatsapp-200 bg-white p-2 transition-colors hover:border-whatsapp-300"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-whatsapp-100 text-[10px] font-extrabold text-whatsapp-800">
          {preview.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            (preview.title || 'B').slice(0, 1).toUpperCase()
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11.5px] font-bold text-text-primary">{preview.title}</span>
          {preview.subtitle && <span className="block truncate text-[10px] text-text-secondary">{preview.subtitle}</span>}
        </span>
        <ExternalLink className="h-3 w-3 shrink-0 text-whatsapp-600" />
      </a>
    )
  }
  if (preview.kind === 'search') {
    return (
      <div className="mb-1.5 rounded-lg border border-gray-200 bg-white p-2">
        <p className="text-[10.5px] font-bold text-text-primary">{preview.title}</p>
        {preview.subtitle && <p className="text-[9.5px] text-text-secondary">{preview.subtitle}</p>}
        <div className="mt-1 space-y-1">
          {(preview.items || []).map((item, index) => (
            <a
              key={`${item.title}-${index}`}
              href={item.href}
              target={item.href ? '_blank' : undefined}
              rel="noreferrer"
              className="block rounded-md bg-surface/70 px-1.5 py-1 hover:bg-whatsapp-50"
            >
              <span className="block truncate text-[10.5px] font-semibold text-text-primary">{item.title}</span>
              {item.subtitle && <span className="block truncate text-[9px] text-text-secondary">{item.subtitle}</span>}
            </a>
          ))}
        </div>
      </div>
    )
  }
  if (preview.kind === 'location') {
    const href =
      preview.lat != null && preview.lng != null
        ? `https://www.google.com/maps/search/?api=1&query=${preview.lat},${preview.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(preview.title || '')}`
    return (
      <a href={href} target="_blank" rel="noreferrer" className="mb-1.5 flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
        <MapPin className="h-4 w-4 shrink-0 text-whatsapp-600" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10.5px] font-bold text-text-primary">{preview.title}</span>
          {preview.subtitle && <span className="block truncate text-[9.5px] text-text-secondary">{preview.subtitle}</span>}
        </span>
        <ExternalLink className="h-3 w-3 text-text-secondary" />
      </a>
    )
  }
  if (preview.kind === 'call') {
    return (
      <a href={preview.href || '#'} className="mb-1.5 flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
        <Phone className="h-4 w-4 shrink-0 text-whatsapp-600" />
        <span className="text-[10.5px] font-bold text-text-primary">{preview.title}</span>
        {preview.phone && <span className="ml-auto text-[9.5px] text-text-secondary">{formatPhone(preview.phone)}</span>}
      </a>
    )
  }
  return (
    <a
      href={preview.href || undefined}
      target="_blank"
      rel="noreferrer"
      className="mb-1.5 block overflow-hidden rounded-lg border border-gray-200 bg-white"
    >
      {preview.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.imageUrl} alt={preview.title || 'Attachment'} className="max-h-40 w-full object-cover" />
      )}
      <span className="block px-2 py-1.5 text-[10.5px] font-semibold text-text-primary">{preview.title || 'Attachment'}</span>
    </a>
  )
}

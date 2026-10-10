'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface PendingInvite {
  id: string
  name: string
  phone: string
  branchLabel: string
  city: string
  createdAt: string
  claimed: boolean
}

export default function PendingBranchInvites({ invites }: { invites: PendingInvite[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [doneId, setDoneId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function resend(invite: PendingInvite) {
    setBusyId(invite.id)
    setErrorId(null)
    setErrorMsg('')
    try {
      const res = await fetch('/api/portal/branches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch_id: invite.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorId(invite.id)
        setErrorMsg(data?.error || 'Could not resend the invite.')
        return
      }
      setDoneId(invite.id)
      // Clear the success flag after a few seconds.
      setTimeout(() => setDoneId(cur => (cur === invite.id ? null : cur)), 6000)
      router.refresh()
    } catch {
      setErrorId(invite.id)
      setErrorMsg('Network error — try again.')
    } finally {
      setBusyId(null)
    }
  }

  if (invites.length === 0) return null

  return (
    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
      <p className="text-xs font-bold text-amber-800">
        {invites.length} branch invite{invites.length === 1 ? '' : 's'} pending
      </p>
      <p className="text-[11px] text-amber-800 mt-0.5">
        Each manager sets their own password from the WhatsApp invite link. Resend if the link was lost — the old link stops working and a fresh one is sent.
      </p>
      <ul className="mt-2.5 space-y-2">
        {invites.map(b => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 bg-white/70 border border-amber-200/70 rounded-xl px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[11px] text-amber-900 truncate">
                <b>{b.name}</b> · {b.branchLabel || b.city} · {b.phone}
              </p>
              {errorId === b.id && (
                <p className="text-[11px] text-red-600 mt-0.5">{errorMsg}</p>
              )}
              {doneId === b.id && (
                <p className="text-[11px] text-whatsapp-700 font-semibold mt-0.5">
                  Invite re-sent to {b.phone} ✓
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => resend(b)}
              disabled={busyId === b.id}
              className="h-8 px-3 rounded-xl text-[11px] font-semibold bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50 shrink-0"
            >
              {busyId === b.id ? 'Sending…' : 'Resend invite'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

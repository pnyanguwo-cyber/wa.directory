'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PortalBilling({ businessId, businessName, sub }: {
  businessId: string
  businessName: string
  sub: { status: string; expiresAt: string | null; amount: number; adminNote: string } | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const status = sub?.status || 'none'
  const active = status === 'active' && (!sub!.expiresAt || new Date(sub!.expiresAt) > new Date())
  const pending = status === 'pending'

  async function requestUpgrade() {
    setBusy(true)
    setError('')
    setNotice('')
    const res = await fetch('/api/portal/billing/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Could not request upgrade')
      return
    }
    setNotice('Upgrade request sent. An admin will confirm your payment, usually within a day.')
    router.refresh()
  }

  const statusStyle: Record<string, string> = {
    active: 'bg-whatsapp-50 text-whatsapp-800 border-whatsapp-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
    none: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Billing & subscription</h2>
        <p className="text-xs text-text-secondary mt-0.5">Premium gives you full statistics, conversations, bidding and competitor insights.</p>
      </div>

      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-text-primary">{businessName}</p>
            <p className="text-xs text-text-secondary mt-0.5">Subscription status</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold capitalize ${statusStyle[status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-whatsapp-500' : 'bg-current'}`} />
            {status === 'none' ? 'Not subscribed' : status}
          </span>
        </div>

        {sub && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-surface rounded-xl px-3 py-2.5 border border-gray-200/80">
              <p className="text-text-secondary font-medium">Monthly fee</p>
              <p className="text-base font-extrabold text-text-primary mt-0.5">${Number(sub.amount || 0).toFixed(2)}</p>
            </div>
            <div className="bg-surface rounded-xl px-3 py-2.5 border border-gray-200/80">
              <p className="text-text-secondary font-medium">Expires</p>
              <p className="text-base font-extrabold text-text-primary mt-0.5">
                {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '—'}
              </p>
            </div>
            {sub.adminNote && (
              <div className="bg-surface rounded-xl px-3 py-2.5 border border-gray-200/80 col-span-2 sm:col-span-1">
                <p className="text-text-secondary font-medium">Admin note</p>
                <p className="text-sm font-semibold text-text-primary mt-0.5">{sub.adminNote}</p>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mt-4">{error}</p>
        )}
        {notice && (
          <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 mt-4 animate-fade-in">{notice}</p>
        )}

        <div className="mt-5">
          {active ? (
            <p className="text-xs text-whatsapp-700 font-semibold flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              Your premium subscription is active.
            </p>
          ) : pending ? (
            <p className="text-xs text-amber-700 font-semibold">
              Your upgrade request is pending admin confirmation. Make your payment and let the admin know — they will activate it.
            </p>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-whatsapp-50 to-white border border-whatsapp-200 p-4">
              <p className="text-sm font-bold text-text-primary">Go premium</p>
              <ul className="text-xs text-text-secondary mt-2 space-y-1">
                <li>• Full statistics history (30/90/all days) + CSV export</li>
                <li>• Customer conversations with full chat transcripts</li>
                <li>• Bid for a top-3 spot in search results</li>
                <li>• Competitor insights and the complete improvement analysis</li>
              </ul>
              <button
                onClick={requestUpgrade}
                disabled={busy}
                className="btn-primary mt-4 px-5 py-2.5 text-xs font-semibold rounded-2xl inline-flex items-center gap-1.5"
              >
                {busy ? 'Sending...' : 'Request upgrade'}
              </button>
              <p className="text-[11px] text-text-secondary mt-2">
                Payment is confirmed manually by an admin (gateway coming soon).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
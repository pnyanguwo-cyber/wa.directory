'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PortalBilling({ businessId, businessName, sub, listingSub }: {
  businessId: string
  businessName: string
  sub: { status: string; expiresAt: string | null; amount: number; adminNote: string } | null
  listingSub: { status: string; expiresAt: string | null; amount: number; payerPhone: string } | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const premiumStatus = sub?.status || 'none'
  const premiumActive = premiumStatus === 'active' && (!sub!.expiresAt || new Date(sub!.expiresAt) > new Date())
  const premiumPending = premiumStatus === 'pending'

  const listingStatus = listingSub?.status || 'none'
  const listingActive = listingStatus === 'active' && (!listingSub!.expiresAt || new Date(listingSub!.expiresAt) > new Date())
  const listingPending = listingStatus === 'pending'
  const listingExpired = listingStatus === 'expired'

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

  async function requestRenewal() {
    setBusy(true)
    setError('')
    setNotice('')
    const res = await fetch('/api/portal/billing/renew-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Could not request renewal')
      return
    }
    setNotice('Renewal request sent. Pay USD 1 via EcoCash at /pay or let the admin know.')
    router.refresh()
  }

  const statusStyle: Record<string, string> = {
    active: 'bg-whatsapp-50 dark:bg-whatsapp-950/50 text-whatsapp-800 dark:text-whatsapp-300 border-whatsapp-200 dark:border-whatsapp-800/50',
    pending: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
    expired: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50',
    cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
    none: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Billing & subscription</h2>
        <p className="text-xs text-text-secondary mt-0.5">Manage your listing subscription and premium features.</p>
      </div>

      {/* Listing Subscription */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-text-primary">Directory Listing</p>
            <p className="text-xs text-text-secondary mt-0.5">Keeps your business visible in the directory</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold capitalize ${statusStyle[listingStatus]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${listingActive ? 'bg-whatsapp-500' : 'bg-current'}`} />
            {listingStatus === 'none' ? 'No subscription' : listingStatus}
          </span>
        </div>

        {listingSub && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-surface dark:bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-200/80 dark:border-gray-700">
              <p className="text-text-secondary font-medium">Monthly fee</p>
              <p className="text-base font-extrabold text-text-primary mt-0.5">${Number(listingSub.amount || 0).toFixed(2)}</p>
            </div>
            <div className="bg-surface dark:bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-200/80 dark:border-gray-700">
              <p className="text-text-secondary font-medium">Expires</p>
              <p className="text-base font-extrabold text-text-primary mt-0.5">
                {listingSub.expiresAt ? new Date(listingSub.expiresAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mt-4">{error}</p>
        )}
        {notice && (
          <p className="text-xs text-whatsapp-700 bg-whatsapp-50 border border-whatsapp-200 rounded-xl px-4 py-2.5 mt-4 animate-fade-in">{notice}</p>
        )}

        <div className="mt-5">
          {listingActive ? (
            <p className="text-xs text-whatsapp-700 font-semibold flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              Your listing is active and visible to customers.
            </p>
          ) : listingPending ? (
            <p className="text-xs text-amber-700 font-semibold">
              Payment pending. Pay USD 1 via EcoCash at <Link href="/pay" className="underline">/pay</Link> or let the admin know.
            </p>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-gray-900 border border-amber-200 dark:border-amber-800/50 p-4">
              <p className="text-sm font-bold text-text-primary">
                {listingExpired ? 'Your listing is hidden' : 'Keep your listing visible'}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Pay USD 1/month to stay in the directory. Anyone can pay for you at <Link href="/pay" className="text-whatsapp-600 font-semibold hover:underline">/pay</Link>.
              </p>
              <button
                onClick={requestRenewal}
                disabled={busy}
                className="mt-3 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold rounded-2xl hover:from-amber-600 hover:to-amber-700 transition-all inline-flex items-center gap-1.5"
              >
                {busy ? 'Sending...' : 'Request Renewal'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Premium Subscription */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-text-primary">Premium Features</p>
            <p className="text-xs text-text-secondary mt-0.5">Full statistics, conversations and competitor insights</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold capitalize ${statusStyle[premiumStatus]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${premiumActive ? 'bg-whatsapp-500' : 'bg-current'}`} />
            {premiumStatus === 'none' ? 'Not subscribed' : premiumStatus}
          </span>
        </div>

        {sub && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-surface dark:bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-200/80 dark:border-gray-700">
              <p className="text-text-secondary font-medium">Monthly fee</p>
              <p className="text-base font-extrabold text-text-primary mt-0.5">${Number(sub.amount || 0).toFixed(2)}</p>
            </div>
            <div className="bg-surface dark:bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-200/80 dark:border-gray-700">
              <p className="text-text-secondary font-medium">Expires</p>
              <p className="text-base font-extrabold text-text-primary mt-0.5">
                {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '—'}
              </p>
            </div>
            {sub.adminNote && (
              <div className="bg-surface dark:bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-200/80 dark:border-gray-700 col-span-2 sm:col-span-1">
                <p className="text-text-secondary font-medium">Admin note</p>
                <p className="text-sm font-semibold text-text-primary mt-0.5">{sub.adminNote}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-5">
          {premiumActive ? (
            <p className="text-xs text-whatsapp-700 font-semibold flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              Your premium subscription is active.
            </p>
          ) : premiumPending ? (
            <p className="text-xs text-amber-700 font-semibold">
              Your upgrade request is pending admin confirmation. Make your payment and let the admin know: they will activate it.
            </p>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-whatsapp-50 to-white dark:from-whatsapp-950/40 dark:to-gray-900 border border-whatsapp-200 dark:border-whatsapp-800/50 p-4">
              <p className="text-sm font-bold text-text-primary">Go premium</p>
              <ul className="text-xs text-text-secondary mt-2 space-y-1">
                <li>• Full statistics history (30/90/all days) + CSV export</li>
                <li>• Customer conversations with full chat transcripts</li>
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

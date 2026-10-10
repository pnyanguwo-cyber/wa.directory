'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PaymentPlanModal from '@/components/payment-plan-modal'
import type { PlanType } from '@/types'
import { PLAN_CONFIG, PRO_ASSISTANCE_PRICE } from '@/types'

export default function PortalBilling({ businessId, businessName, sub, listingSub }: {
  businessId: string
  businessName: string
  sub: { status: string; expiresAt: string | null; amount: number; adminNote: string } | null
  listingSub: { status: string; expiresAt: string | null; amount: number; payerPhone: string; plan: string; proAssistance: boolean } | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [simulating, setSimulating] = useState<'plan' | 'premium' | null>(null)
  const isDev = process.env.NODE_ENV !== 'production'

  const premiumStatus = sub?.status || 'none'
  const premiumActive = premiumStatus === 'active' && (!sub!.expiresAt || new Date(sub!.expiresAt) > new Date())
  const premiumPending = premiumStatus === 'pending'

  const listingStatus = listingSub?.status || 'none'
  const listingActive = listingStatus === 'active' && (!listingSub!.expiresAt || new Date(listingSub!.expiresAt) > new Date())
  const listingPending = listingStatus === 'pending'
  const listingExpired = listingStatus === 'expired'

  // Due date + remaining days
  const now = new Date()
  const expiresAt = listingSub?.expiresAt ? new Date(listingSub.expiresAt) : null
  const daysRemaining = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000) : null
  const isUrgent = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0
  const isWarning = daysRemaining !== null && daysRemaining <= 14 && daysRemaining > 7

  async function handlePlanProceed(payload: { plan: PlanType; hasProAssistance: boolean }) {
    setBusy(true)
    setError('')
    setNotice('')
    setShowPlanModal(false)
    const res = await fetch('/api/portal/billing/renew-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: payload.plan, hasProAssistance: payload.hasProAssistance }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(data.error || 'Could not request renewal')
      return
    }
    setNotice(data.message || 'Renewal request sent. Pay via EcoCash at /pay or let the admin know.')
    router.refresh()
  }

  // Dev-only: confirm the renewal through the simulated payment path — same
  // activation helper the real EcoCash webhook runs.
  async function handleSimulatePlan(payload: { plan: PlanType; hasProAssistance: boolean }) {
    setSimulating('plan')
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/pay/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'renewal',
          business_id: businessId,
          plan: payload.plan,
          has_pro_assistance: payload.hasProAssistance,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Simulation failed')
        return
      }
      setShowPlanModal(false)
      setNotice('Simulated payment confirmed — your listing subscription is active.')
      router.refresh()
    } catch {
      setError('Simulation failed. Please try again.')
    } finally {
      setSimulating(null)
    }
  }

  // Dev-only: activate premium the same way the admin confirmation does.
  async function simulatePremium() {
    setSimulating('premium')
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/pay/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'premium', business_id: businessId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Simulation failed')
        return
      }
      setNotice('Simulated payment confirmed — premium is active.')
      router.refresh()
    } catch {
      setError('Simulation failed. Please try again.')
    } finally {
      setSimulating(null)
    }
  }

  const statusStyle: Record<string, string> = {
    active: 'bg-whatsapp-50 text-whatsapp-800 border-whatsapp-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
    none: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const planLabel = listingSub?.plan ? PLAN_CONFIG[listingSub.plan as PlanType]?.label || '1 Month' : '1 Month'

  return (
    <div className="space-y-6">
      <PaymentPlanModal
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onProceed={handlePlanProceed}
        onSimulate={isDev ? handleSimulatePlan : undefined}
        simulating={simulating === 'plan'}
      />

      <div>
        <h2 className="text-lg font-bold text-text-primary">Billing & subscription</h2>
        <p className="text-xs text-text-secondary mt-0.5">Manage your listing subscription and premium features.</p>
      </div>

      {/* Listing Subscription */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
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
            <div className="bg-surface rounded-xl px-3 py-2.5 border border-gray-200/80">
              <p className="text-text-secondary font-medium">Plan</p>
              <p className="text-base font-extrabold text-text-primary mt-0.5">{planLabel}</p>
            </div>
            <div className="bg-surface rounded-xl px-3 py-2.5 border border-gray-200/80">
              <p className="text-text-secondary font-medium">Amount</p>
              <p className="text-base font-extrabold text-text-primary mt-0.5">${Number(listingSub.amount || 0).toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Due date & remaining days */}
        {listingActive && listingSub && expiresAt && (
          <div className={`mt-3 rounded-xl px-4 py-3 border ${
            isUrgent
              ? 'bg-red-50 border-red-200'
              : isWarning
                ? 'bg-amber-50 border-amber-200'
                : 'bg-whatsapp-50 border-whatsapp-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold ${isUrgent ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-whatsapp-700'}`}>
                  Due: {expiresAt.toLocaleDateString('en-ZW', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {listingSub.proAssistance && (
                  <p className="text-[10px] text-text-secondary mt-0.5">Includes pro WhatsApp catalog setup</p>
                )}
              </div>
              <span className={`text-lg font-extrabold ${isUrgent ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-whatsapp-700'}`}>
                {daysRemaining}d
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-whatsapp-500'}`}
                style={{ width: `${Math.min(100, Math.max(5, ((daysRemaining || 0) / 30) * 100))}%` }}
              />
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
              Payment pending. Pay via EcoCash at <Link href="/pay" className="underline">/pay</Link> or let the admin know.
            </p>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border border-amber-200 p-4">
              <p className="text-sm font-bold text-text-primary">
                {listingExpired ? 'Your listing is hidden' : 'Keep your listing visible'}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Choose a plan to stay in the directory. Anyone can pay for you at <Link href="/pay" className="text-whatsapp-600 font-semibold hover:underline">/pay</Link>.
              </p>
              <button
                onClick={() => setShowPlanModal(true)}
                disabled={busy}
                className="mt-3 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-semibold rounded-2xl hover:from-amber-600 hover:to-amber-700 transition-all inline-flex items-center gap-1.5"
              >
                {busy ? 'Sending...' : 'Choose a Plan'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Premium Subscription */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-card">
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
            <div className="rounded-2xl bg-gradient-to-br from-whatsapp-50 to-white border border-whatsapp-200 p-4">
              <p className="text-sm font-bold text-text-primary">Go premium</p>
              <ul className="text-xs text-text-secondary mt-2 space-y-1">
                <li>• Full statistics history (30/90/all days) + CSV export</li>
                <li>• Customer conversations with full chat transcripts</li>
                <li>• Competitor insights and the complete improvement analysis</li>
              </ul>
              <button
                onClick={async () => {
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
                }}
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
          {isDev && !premiumActive && (
            <button
              type="button"
              onClick={simulatePremium}
              disabled={simulating !== null}
              className="mt-3 w-full py-2 rounded-2xl text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-60"
            >
              {simulating === 'premium' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  Simulating payment…
                </span>
              ) : '⚙ Simulate payment (dev only)'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPortalBusiness, getSubscription } from '@/lib/portal'
import PortalTabs from '@/components/portal-tabs'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const business = await getPortalBusiness()
  if (!business) redirect('/login')

  const sub = await getSubscription(business.id)
  const paid = sub?.status === 'active' && (!sub.expiresAt || new Date(sub.expiresAt) > new Date())

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-whatsapp-700">Business Portal</span>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight truncate">{business.name}</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              {paid ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-whatsapp-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-whatsapp-500" /> Premium subscription active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-text-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Free plan — 7 days of history, 3 tips
                </span>
              )}
            </p>
          </div>
          <form action="/api/account/logout" method="POST" className="shrink-0">
            <button type="submit" className="btn-secondary h-10 px-4 text-xs sm:text-sm font-semibold flex items-center gap-1.5">
              <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
              </svg>
              <span>Logout</span>
            </button>
          </form>
        </div>

        <PortalTabs />

        {children}
      </div>
    </div>
  )
}

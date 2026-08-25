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
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-whatsapp-950/20 backdrop-blur-xl rounded-3xl border border-white/70 dark:border-gray-800 shadow-soft-lift p-6 space-y-6">
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

        {!business.verified && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 space-y-2">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              Your listing is pending approval
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
              Customers can't find you yet. An admin will review your listing shortly — you'll be notified here once you're live.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href={`/edit?token=${business.edit_token}`}
                className="text-xs font-semibold bg-amber-600 text-white rounded-xl px-3.5 py-2 hover:bg-amber-700 transition-colors"
              >
                Edit listing
              </Link>
              <Link
                href={`/my-qr/${business.slug || business.id}`}
                className="text-xs font-semibold bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-xl px-3.5 py-2 hover:bg-amber-100 dark:hover:bg-gray-700 transition-colors"
              >
                Get your QR codes
              </Link>
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MobileFloatingActions() {
  const pathname = usePathname()

  // Hide on desktop and on the map/pay pages themselves
  if (pathname === '/map' || pathname === '/pay') return null

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 sm:hidden animate-slide-up">
      <Link
        href="/pay"
        className="flex items-center gap-1.5 bg-black/50 dark:bg-white/15 backdrop-blur-md text-white rounded-full pl-3 pr-4 py-2 shadow-lg hover:bg-black/60 dark:hover:bg-white/20 transition-all active:scale-95"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
        <span className="text-[11px] font-semibold whitespace-nowrap">Make Payment</span>
      </Link>
      <Link
        href="/map"
        className="flex items-center gap-1.5 bg-black/50 dark:bg-white/15 backdrop-blur-md text-white rounded-full pl-3 pr-4 py-2 shadow-lg hover:bg-black/60 dark:hover:bg-white/20 transition-all active:scale-95"
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        <span className="text-[11px] font-semibold whitespace-nowrap">View Map</span>
      </Link>
    </div>
  )
}

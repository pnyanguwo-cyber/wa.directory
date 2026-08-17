'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Splash from '@/components/splash'

export default function Navbar() {
  const router = useRouter()
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    fetch('/api/account/session')
      .then(r => r.json())
      .then(d => setLoggedIn(!!d.loggedIn))
      .catch(() => setLoggedIn(false))
  }, [])

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch('/api/account/logout', { method: 'POST' })
    } catch {}
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-200/60 shadow-sm" aria-label="Main navigation">
      {loggingOut && <Splash label="Logging out..." />}
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img
            src="/logo-square.png"
            alt="WA Directory logo"
            className="w-10 h-10 object-contain rounded-xl group-hover:scale-105 transition-transform duration-200"
          />
          <span className="text-lg font-extrabold text-text-primary tracking-tight group-hover:text-whatsapp-700 transition-colors leading-tight">
            WA Directory
          </span>
        </Link>

        <div className="flex items-center gap-2.5">
          <Link
            href="/list"
            className="btn-primary px-3.5 py-1.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>List your business</span>
          </Link>
          {loggedIn === null ? (
            <div className="h-9 w-24 bg-gray-200/60 rounded-xl animate-pulse" />
          ) : loggedIn ? (
            <>
              <Link
                href="/portal"
                className="btn-secondary px-3.5 py-1.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
              >
                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625z" />
                </svg>
                <span>My Portal</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="btn-secondary px-3.5 py-1.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
              >
                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
                </svg>
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="btn-secondary px-3.5 py-1.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span>Log in your account</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
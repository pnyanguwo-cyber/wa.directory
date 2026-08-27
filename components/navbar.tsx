'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import Splash from '@/components/splash'

const NAV_SPINNER = (
  <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setNavigatingTo(null)
  }, [pathname])

  function navigate(href: string) {
    if (navigatingTo) return
    setNavigatingTo(href)
    router.push(href)
  }

  useEffect(() => {
    // Re-sync on every route change so the navbar can never go stale
    // (e.g. still saying "logged in" after logging out elsewhere).
    fetch('/api/account/session')
      .then(r => r.json())
      .then(d => setLoggedIn(!!d.loggedIn))
      .catch(() => setLoggedIn(false))
  }, [pathname])

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch('/api/account/logout', { method: 'POST' })
    } catch {}
    // Always dismiss the splash and flip the UI, even if we were already
    // on '/' (same-route navigation doesn't remount anything).
    setLoggedIn(false)
    setLoggingOut(false)
    router.replace('/')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl border-b shadow-sm dark:bg-gray-900/85 dark:border-gray-800" style={{ backgroundColor: 'rgba(var(--bg-card), 0.85)', borderColor: 'rgb(var(--border-color))' }} aria-label="Main navigation">
      {loggingOut && <Splash label="Logging out..." />}
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo-square.png"
            alt="WA Directory logo"
            width={40}
            height={40}
            priority
            className="w-10 h-10 object-contain rounded-xl group-hover:scale-105 transition-transform duration-200"
          />
          <span className="text-lg font-extrabold tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-whatsapp-500 to-whatsapp-600 bg-clip-text text-transparent">WA</span>
            <span className="group-hover:text-whatsapp-700 transition-colors" style={{ color: 'rgb(var(--text-primary))' }}> Directory</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:bg-surface dark:hover:bg-gray-800 active:scale-90"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-text-secondary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" />
                </svg>
              )}
            </button>
          )}
          <Link
            href="/list"
            title="List your business"
            className="btn-primary px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">List your business</span>
            <span className="inline sm:hidden">List</span>
          </Link>
          {loggedIn === null ? (
            <div className="h-10 w-10 sm:w-24 bg-gray-200/60 rounded-xl animate-pulse" />
          ) : loggedIn ? (
            <>
              <Link
                href="/portal"
                title="My Portal"
                className="btn-secondary px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap"
              >
                <svg className="w-4 h-4 shrink-0 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625z" />
                </svg>
                <span className="hidden sm:inline">My Portal</span>
                <span className="inline sm:hidden">Portal</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                title="Logout"
                className="btn-secondary px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap"
              >
                <svg className="w-4 h-4 shrink-0 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
                <span className="inline sm:hidden">Logout</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              title="Log in your account"
              className={`btn-secondary px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap ${navigatingTo === '/login' ? 'opacity-70 cursor-wait' : ''}`}
            >
              {navigatingTo === '/login' ? (
                NAV_SPINNER
              ) : (
                <svg className="w-4 h-4 shrink-0 text-text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
              <span className="hidden sm:inline">{navigatingTo === '/login' ? 'Opening...' : 'Log in your account'}</span>
              <span className="inline sm:hidden">{navigatingTo === '/login' ? '...' : 'Login'}</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
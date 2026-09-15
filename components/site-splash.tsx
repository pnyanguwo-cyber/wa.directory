'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const SPLASH_KEY = 'wa_site_splash_v3'

// Minimal one-time welcome splash: logo + tagline + a slim CSS-only loader.
// No buttons, no extra copy. The splash is flipped on inside an effect (never
// during render) so hydration always matches the server, and the fade timer is
// idempotent so React StrictMode's double-invoked effects can never leave it
// stuck on screen (the bug that broke the old splash in dev).
export default function SiteSplash() {
  const [phase, setPhase] = useState<'off' | 'on' | 'fading'>('off')

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SPLASH_KEY)) {
        sessionStorage.setItem(SPLASH_KEY, '1')
        setPhase('on')
      }
    } catch {
      // Private / incognito mode: just show it
      setPhase('on')
    }

    // Idempotent: only acts while the splash is actually showing.
    const fade = setTimeout(() => setPhase(p => (p === 'on' ? 'fading' : p)), 900)
    return () => clearTimeout(fade)
  }, [])

  useEffect(() => {
    if (phase !== 'fading') return
    const hide = setTimeout(() => setPhase('off'), 500)
    return () => clearTimeout(hide)
  }, [phase])

  // Invisible safety hatch: clicking anywhere dismisses the splash.
  function handleDismiss() {
    setPhase(p => (p === 'on' ? 'fading' : p))
  }

  if (phase === 'off') return null

  return (
    <div
      role="status"
      aria-label="Welcome to WA Directory"
      onClick={handleDismiss}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-7 select-none overflow-hidden transition-opacity duration-500 ${
        phase === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 35%, #064e3b 0%, #033b2d 45%, #02241c 100%)',
      }}
    >
      {/* Logo */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 animate-wa-pop">
        <div
          className="absolute -inset-3 rounded-3xl bg-whatsapp-500/25 blur-2xl animate-pulse-glow"
          aria-hidden="true"
        />
        <div className="relative w-full h-full rounded-3xl bg-white p-2 shadow-2xl flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="WA Directory"
            width={80}
            height={80}
            priority
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* The one statement kept below the logo */}
      <p className="animate-fade-in px-8 max-w-xs text-center text-xs sm:text-sm font-medium leading-relaxed text-emerald-100/80">
        Find shops, verified services &amp; direct WhatsApp catalogs instantly in Zimbabwe.
      </p>

      {/* Slim indeterminate loader — pure CSS, cannot get stuck */}
      <div className="h-1 w-28 rounded-full bg-white/15 overflow-hidden" aria-hidden="true">
        <div
          className="h-full w-1/3 rounded-full bg-whatsapp-400"
          style={{ animation: 'splash-loader 1.1s ease-in-out infinite' }}
        />
      </div>
    </div>
  )
}

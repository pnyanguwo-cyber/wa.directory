'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

// Pure SVG WhatsApp Vector Glyph
const WA_SVG_PATH =
  'M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.83 14.12c-.25.7-1.45 1.33-2.03 1.42-.52.08-1.17.11-1.89-.12-.44-.14-1-.32-1.71-.63-3.01-1.3-4.98-4.34-5.13-4.54-.15-.2-1.23-1.63-1.23-3.11 0-1.48.78-2.21 1.05-2.51.28-.3.6-.38.8-.38.2 0 .4 0 .58.01.19.01.44-.07.69.53.25.61.86 2.11.94 2.26.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.4-.45.53-.15.15-.31.31-.13.61.18.3.79 1.31 1.7 2.12 1.17 1.04 2.16 1.37 2.46 1.52.3.15.48.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.75.83 2.05.98.3.15.5.23.58.35.08.13.08.73-.17 1.43z'

export default function SiteSplash() {
  const [phase, setPhase] = useState<'off' | 'on' | 'fading'>('off')
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('Initializing WA Directory...')

  useEffect(() => {
    try {
      if (sessionStorage.getItem('wa_site_splash_v2')) return
      sessionStorage.setItem('wa_site_splash_v2', '1')
    } catch {
      // Private / incognito mode fallback
    }

    setPhase('on')

    // Compressed timeline: ~500ms total
    const t0 = setTimeout(() => {
      setProgress(50)
      setStatusText('Connecting...')
    }, 50)

    const t1 = setTimeout(() => {
      setProgress(100)
      setStatusText('Ready!')
    }, 200)

    const t2 = setTimeout(() => setPhase('fading'), 300)
    const t3 = setTimeout(() => setPhase('off'), 500)

    return () => {
      clearTimeout(t0)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  function handleDismiss() {
    setPhase('fading')
    setTimeout(() => setPhase('off'), 450)
  }

  if (phase === 'off') return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to WA Directory"
      onClick={handleDismiss}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between p-6 sm:p-10 select-none cursor-pointer overflow-hidden transition-all duration-500 ${
        phase === 'fading'
          ? 'opacity-0 scale-105 blur-md pointer-events-none'
          : 'opacity-100 scale-100 blur-0'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 30%, #064e3b 0%, #033b2d 35%, #02241c 70%, #01140f 100%)',
      }}
    >
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Soft pulsing light spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full bg-whatsapp-500/15 blur-[100px] animate-pulse-glow" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-emerald-400/10 blur-[90px]" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-teal-300/10 blur-[90px]" />

        {/* Ambient Subtle Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(#25D366 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Top Header Tag */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-md pt-2 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-xs font-semibold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-whatsapp-400 animate-pulse" />
          <span>Official WhatsApp Business Hub</span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs font-semibold text-white/60 hover:text-white transition-colors px-2 py-1"
        >
          Skip ✕
        </button>
      </div>

      {/* Central Animated Hero Emblem */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-7 my-auto max-w-sm w-full text-center">
        {/* Glowing Expanding Ripple Rings */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-36 h-36 rounded-full border border-whatsapp-500/30 animate-ripple pointer-events-none" />
          <div className="absolute w-36 h-36 rounded-full border border-whatsapp-400/20 animate-ripple [animation-delay:800ms] pointer-events-none" />

          {/* Rotating Gradient Orbit Ring */}
          <div
            className="absolute -inset-2 rounded-[2.25rem] bg-gradient-to-tr from-whatsapp-400 via-emerald-300 to-teal-500 opacity-60 blur-sm animate-spin-slow"
            aria-hidden="true"
          />

          {/* Luxury 3D Glassmorphic Icon Shield */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] bg-gradient-to-b from-white via-white/95 to-slate-100 p-1 shadow-[0_20px_50px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.9)] animate-wa-pop flex items-center justify-center border border-white/80">
            {/* Center Official Brand Logo or Vector Glyph */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center animate-float">
              <Image
                src="/logo.png"
                alt="WA Directory"
                width={80}
                height={80}
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>

            {/* Glowing Verified Chip */}
            <span
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-tr from-whatsapp-600 to-whatsapp-400 border-[3px] border-white shadow-md flex items-center justify-center text-white text-xs font-black"
              title="Verified Zimbabwe Business Directory"
            >
              ✓
            </span>
          </div>
        </div>

        {/* Brand Titles & Slogan */}
        <div className="space-y-2 animate-slide-up">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
            WA <span className="text-transparent bg-clip-text bg-gradient-to-r from-whatsapp-400 via-emerald-300 to-teal-200">Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/80 font-medium max-w-xs mx-auto leading-relaxed">
            Find shops, verified services & direct WhatsApp catalogs instantly in Zimbabwe.
          </p>
        </div>

        {/* Dynamic Loading Progress Bar */}
        <div className="w-full max-w-[220px] space-y-2 pt-2 animate-fade-in">
          <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden backdrop-blur-md p-[1px]">
            <div
              className="h-full bg-gradient-to-r from-whatsapp-400 via-emerald-300 to-teal-300 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(37,211,102,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] font-semibold text-emerald-200/70 tracking-wide">
            {statusText}
          </p>
        </div>
      </div>

      {/* Bottom Footer Callout */}
      <div className="relative z-10 w-full text-center pb-2 animate-fade-in">
        <p className="text-[11px] text-white/50 font-medium tracking-wider uppercase">
          Powered by WhatsApp Business AI • wadirectory.co.zw
        </p>
      </div>
    </div>
  )
}

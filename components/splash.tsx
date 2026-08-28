'use client'

import Image from 'next/image'

// Pure SVG WhatsApp Vector Glyph
const WA_SVG_PATH =
  'M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.83 14.12c-.25.7-1.45 1.33-2.03 1.42-.52.08-1.17.11-1.89-.12-.44-.14-1-.32-1.71-.63-3.01-1.3-4.98-4.34-5.13-4.54-.15-.2-1.23-1.63-1.23-3.11 0-1.48.78-2.21 1.05-2.51.28-.3.6-.38.8-.38.2 0 .4 0 .58.01.19.01.44-.07.69.53.25.61.86 2.11.94 2.26.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.4-.45.53-.15.15-.31.31-.13.61.18.3.79 1.31 1.7 2.12 1.17 1.04 2.16 1.37 2.46 1.52.3.15.48.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.75.83 2.05.98.3.15.5.23.58.35.08.13.08.73-.17 1.43z'

export interface SplashProps {
  label?: string
  subtitle?: string
  variant?: 'auth' | 'logout' | 'success' | 'general'
}

export default function Splash({
  label = 'Loading...',
  subtitle,
  variant = 'auth',
}: SplashProps) {
  const isLogout = variant === 'logout' || label.toLowerCase().includes('log')
  const defaultSubtitle = isLogout
    ? 'Safely ending your session...'
    : label.toLowerCase().includes('account') || label.toLowerCase().includes('creat')
    ? 'Setting up your verified business portal...'
    : 'Securing your connection to WA Directory...'

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 select-none animate-fade-in backdrop-blur-xl"
      style={{
        background:
          'radial-gradient(circle at 50% 40%, rgba(6, 78, 59, 0.95) 0%, rgba(3, 36, 28, 0.98) 50%, rgba(1, 20, 15, 0.99) 100%)',
      }}
    >
      {/* Ambient Lighting Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-whatsapp-500/20 blur-[110px] animate-pulse-glow" />
        <div className="absolute top-1/3 left-1/4 w-60 h-60 rounded-full bg-teal-400/10 blur-[80px]" />
      </div>

      {/* Central Interactive Glass Card */}
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-xs w-full text-center">
        {/* Floating Logo Badge with Animated Orbit */}
        <div className="relative flex items-center justify-center">
          {/* Subtle Outer Glow Waves */}
          <div className="absolute w-28 h-28 rounded-full border border-whatsapp-400/30 animate-ripple pointer-events-none" />

          {/* Rotating Gradient Ring */}
          <div
            className="absolute -inset-1.5 rounded-[1.75rem] bg-gradient-to-tr from-whatsapp-400 via-emerald-300 to-teal-400 opacity-70 blur-[3px] animate-spin-slow"
            aria-hidden="true"
          />

          {/* 3D Glass Badge */}
          <div className="relative w-24 h-24 rounded-[1.5rem] bg-gradient-to-b from-white via-white/95 to-slate-100 p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.9)] animate-wa-pop flex items-center justify-center border border-white/80">
            <div className="relative w-14 h-14 flex items-center justify-center animate-float">
              <Image
                src="/logo.png"
                alt="WA Directory"
                width={56}
                height={56}
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>

            {/* Status dot */}
            <span
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-whatsapp-500 border-2 border-white shadow-sm flex items-center justify-center text-white text-[10px] font-black"
            >
              {isLogout ? '⏻' : '✓'}
            </span>
          </div>
        </div>

        {/* Dynamic Action Typography */}
        <div className="space-y-1.5 animate-slide-up">
          <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white drop-shadow-sm">
            {label}
          </h2>
          <p className="text-xs text-emerald-200/70 font-medium max-w-xs">
            {subtitle || defaultSubtitle}
          </p>
        </div>

        {/* Elegant Animated Status Indicator (Bouncing Glowing Dots + Progress Bar) */}
        <div className="flex flex-col items-center gap-3 pt-1">
          {/* 3 WhatsApp Pulse Dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-whatsapp-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-teal-300 animate-bounce" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/75 text-[11px] font-semibold">
            <svg className="w-3.5 h-3.5 text-whatsapp-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d={WA_SVG_PATH} />
            </svg>
            <span>WA Directory Official Network</span>
          </div>
        </div>
      </div>
    </div>
  )
}

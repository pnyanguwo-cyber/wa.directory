import Image from 'next/image'

export default function GlobalLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading WA Directory"
      className="min-h-[70vh] flex flex-col items-center justify-center p-6 select-none animate-fade-in relative"
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-whatsapp-500/10 dark:bg-whatsapp-500/15 blur-[90px] animate-pulse-glow" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5 max-w-xs text-center">
        {/* Floating Animated Logo Badge */}
        <div className="relative flex items-center justify-center">
          {/* Subtle Outer Ripple Ring */}
          <div className="absolute w-24 h-24 rounded-full border border-whatsapp-500/25 animate-ripple pointer-events-none" />

          {/* Rotating Gradient Orbit */}
          <div
            className="absolute -inset-1 rounded-[1.75rem] bg-gradient-to-tr from-whatsapp-400 via-emerald-300 to-teal-400 opacity-60 blur-xs animate-spin-slow"
            aria-hidden="true"
          />

          {/* 3D Glass Badge */}
          <div className="relative w-20 h-20 rounded-[1.5rem] bg-white dark:bg-gray-900 border border-white/80 dark:border-gray-800 shadow-[0_12px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] flex items-center justify-center p-3 animate-wa-pop">
            <div className="relative w-12 h-12 flex items-center justify-center animate-float">
              <Image
                src="/logo.png"
                alt="WA Directory"
                width={48}
                height={48}
                className="w-full h-full object-contain drop-shadow-xs"
                priority
              />
            </div>
          </div>
        </div>

        {/* Loading Title & Pulse Indicator */}
        <div className="space-y-2 animate-slide-up">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin text-whatsapp-600 dark:text-whatsapp-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-85" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-bold text-text-primary">Loading WA Directory...</p>
          </div>
          <p className="text-xs text-text-secondary">Fetching verified Zimbabwean businesses</p>
        </div>

        {/* Staged Shimmer Bar */}
        <div className="w-40 h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-whatsapp-400 to-emerald-500 rounded-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        </div>
      </div>
    </div>
  )
}

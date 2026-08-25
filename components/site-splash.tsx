'use client'

import { useState, useEffect } from 'react'

// WhatsApp-branded intro screen shown once per browser session.
export default function SiteSplash() {
  const [phase, setPhase] = useState<'off' | 'on' | 'fading'>('off')

  useEffect(() => {
    try {
      if (sessionStorage.getItem('wa_site_splash')) return
      sessionStorage.setItem('wa_site_splash', '1')
    } catch {
      // Private mode etc. — still show it this once.
    }
    setShowOn()
  }, [])

  function setShowOn() {
    setPhase('on')
    const t1 = setTimeout(() => setPhase('fading'), 1300)
    const t2 = setTimeout(() => setPhase('off'), 1900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }

  if (phase === 'off') return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 ${phase === 'fading' ? 'animate-fade-out pointer-events-none' : ''}`}
      style={{ background: 'linear-gradient(160deg, #075E54 0%, #128C7E 55%, #25D366 130%)' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-whatsapp-300/20 blur-3xl" />
      </div>

      <div className="relative animate-wa-pop">
        <div className="w-24 h-24 rounded-[1.75rem] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.35)] flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="#25D366" className="w-14 h-14" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full border-[3px] border-white/90 animate-pulse" style={{ backgroundColor: '#25D366' }} />
      </div>

      <div className="relative text-center animate-slide-up">
        <p className="text-white text-xl font-extrabold tracking-tight">WA Directory</p>
        <p className="text-white/70 text-xs font-medium mt-1">Find any business on WhatsApp</p>
      </div>
    </div>
  )
}

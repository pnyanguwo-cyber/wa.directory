'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone) {
      setInstalled(true)
      return
    }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIOS) setShowIOS(true)

    function onPrompt(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferred(null)
  }

  if (installed || (!deferred && !showIOS)) return null

  return (
    <div className="fixed bottom-5 left-4 z-50 animate-slide-up">
      {deferred ? (
        <button
          onClick={install}
          className="flex items-center gap-2 bg-text-primary text-white rounded-2xl pl-2 pr-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-black/80 transition-all active:scale-95"
        >
          <svg className="w-8 h-8 rounded-xl bg-white/15 p-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v10.5m0 0-3.75-3.75M12 13.5l3.75-3.75M4.5 16.5v1.5A2.25 2.25 0 0 0 6.75 20.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-1.5" />
          </svg>
          <span className="text-xs font-semibold text-left leading-tight">
            Install App
            <span className="block font-normal text-white/70">Add WA Directory to your screen</span>
          </span>
        </button>
      ) : (
        <button
          onClick={() => setShowIOS(false)}
          className="flex items-center gap-2 bg-text-primary text-white rounded-2xl pl-2 pr-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.25)] active:scale-95 transition-all"
        >
          <svg className="w-8 h-8 rounded-xl bg-white/15 p-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v10.5m0 0-3.75-3.75M12 13.5l3.75-3.75M4.5 16.5v1.5A2.25 2.25 0 0 0 6.75 20.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-1.5" />
          </svg>
          <span className="text-xs font-semibold text-left leading-tight">
            Install App
            <span className="block font-normal text-white/70">Tap Share → Add to Home Screen</span>
          </span>
        </button>
      )}
    </div>
  )
}
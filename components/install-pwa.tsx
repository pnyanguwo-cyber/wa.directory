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
          className="flex items-center gap-1.5 bg-black/50 dark:bg-white/15 backdrop-blur-md text-white rounded-full pl-2.5 pr-3.5 py-1.5 shadow-lg hover:bg-black/60 dark:hover:bg-white/20 transition-all active:scale-95"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v10.5m0 0-3.75-3.75M12 13.5l3.75-3.75M4.5 16.5v1.5A2.25 2.25 0 0 0 6.75 20.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-1.5" />
          </svg>
          <span className="text-[11px] font-semibold whitespace-nowrap">Install to home</span>
        </button>
      ) : (
        <button
          onClick={() => setShowIOS(false)}
          className="flex items-center gap-1.5 bg-black/50 dark:bg-white/15 backdrop-blur-md text-white rounded-full pl-2.5 pr-3.5 py-1.5 shadow-lg active:scale-95 transition-all"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v10.5m0 0-3.75-3.75M12 13.5l3.75-3.75M4.5 16.5v1.5A2.25 2.25 0 0 0 6.75 20.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-1.5" />
          </svg>
          <span className="text-[11px] font-semibold whitespace-nowrap">Install to home</span>
        </button>
      )}
    </div>
  )
}

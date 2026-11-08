'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'

function isInstalledNow(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari's own marker for a launched home-screen web app.
  if ((window.navigator as unknown as { standalone?: boolean }).standalone) return true
  return false
}

export default function InstallPWA() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showIOSSheet, setShowIOSSheet] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Already running as the installed app — never show the pill.
    if (isInstalledNow()) {
      setInstalled(true)
      return
    }

    try {
      if (localStorage.getItem(DISMISSED_KEY) === '1') {
        setDismissed(true)
        return
      }
    } catch {
      // localStorage unavailable (private mode) — just show the pill
    }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIOS) setShowIOS(true)

    function onPrompt(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      // The app now lives on the home screen; hide the pill permanently.
      setInstalled(true)
      setDismissed(true)
      setDeferred(null)
      setShowIOSSheet(false)
      try {
        localStorage.setItem(DISMISSED_KEY, '1')
      } catch {
        // ignore
      }
    }
    function onModeChange(e: MediaQueryListEvent) {
      if (e.matches) onInstalled()
    }

    const modeQuery = window.matchMedia('(display-mode: standalone)')
    modeQuery.addEventListener('change', onModeChange)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      modeQuery.removeEventListener('change', onModeChange)
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    if (outcome === 'dismissed') dismiss()
    setDeferred(null)
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // ignore persistence failures
    }
    setDismissed(true)
    setShowIOS(false)
    setShowIOSSheet(false)
  }

  if (installed || dismissed || (!deferred && !showIOS)) return null

  return (
    <>
      <div className="fixed bottom-5 left-4 z-50 animate-slide-up">
        <button
          onClick={deferred ? install : () => setShowIOSSheet(true)}
          className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-white rounded-full pl-2.5 pr-3.5 py-1.5 shadow-lg hover:bg-black/60 transition-all active:scale-95"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v10.5m0 0-3.75-3.75M12 13.5l3.75-3.75M4.5 16.5v1.5A2.25 2.25 0 0 0 6.75 20.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-1.5" />
          </svg>
          <span className="text-[11px] font-semibold whitespace-nowrap">Install to home</span>
        </button>
      </div>

      {/* iOS Safari has no beforeinstallprompt: walk the user through it. */}
      {showIOSSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 px-4 pb-6 backdrop-blur-sm" onClick={() => setShowIOSSheet(false)}>
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="Add to home screen"
          >
            <p className="text-sm font-bold text-gray-900">Add WA Directory to your home screen</p>
            <ol className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-gray-400">1.</span>
                <span>
                  Tap the <b>Share</b> icon at the bottom of Safari
                  <svg className="mx-0.5 inline h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L4 7m3-3 3 3m6 9v-1.5a2.25 2.25 0 0 0-2.25-2.25H9.75A2.25 2.25 0 0 0 7.5 13.5V16M4 21h16" />
                  </svg>
                  (arrow pointing up out of a box).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-gray-400">2.</span>
                <span>Scroll down and tap <b>Add to Home Screen</b>.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-gray-400">3.</span>
                <span>Tap <b>Add</b> — the app icon appears on your home screen.</span>
              </li>
            </ol>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowIOSSheet(false)} className="h-8 rounded-lg px-3 text-[11px] font-semibold text-gray-600 hover:bg-gray-100">
                Later
              </button>
              <button onClick={dismiss} className="h-8 rounded-lg bg-green-600 px-3 text-[11px] font-semibold text-white hover:bg-green-700">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

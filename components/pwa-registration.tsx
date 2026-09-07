'use client'

import { useEffect } from 'react'

export default function PWARegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return

    // Check for a newer service worker on every load so UI fixes actually
    // reach users instead of being pinned by the old cache.
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.update().catch(() => {})
    }).catch(() => {})

    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Reload exactly once when an UPDATED worker takes over (not on the
      // very first install, where no controller existed yet) so stale cached
      // HTML/JS bundles are replaced immediately.
      if (reloading || !navigator.serviceWorker.controller) return
      reloading = true
      window.location.reload()
    })
  }, [])

  return null
}

'use client'

import { useEffect } from 'react'

export default function PWARegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Outside production: make sure no service worker from an earlier
    // production build can keep serving stale chunks to dev sessions.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then(regs => Promise.all(regs.map(r => r.unregister())))
        .catch(() => {})
      if ('caches' in window) {
        caches.keys()
          .then(keys => Promise.all(keys.map(k => caches.delete(k))))
          .catch(() => {})
      }
      return
    }

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

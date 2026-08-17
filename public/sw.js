const CACHE = 'wa-directory-v4'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest'])).catch(() => {})
  )
  e.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  e.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  if (url.origin !== self.location.origin) return
  if (e.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return

  if (e.request.mode === 'navigate') {
    // Network-first for pages so users get fresh listings
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const clone = r.clone()
          caches.open(CACHE).then((c) => c.put(e.request, clone))
          return r
        })
        .catch(() =>
          caches.match(e.request).then((r) => r || caches.match('/'))
        )
    )
    return
  }

  // Cache-first for hashed assets (JS/CSS/images) and other static files
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((r) => {
          if (r.ok) {
            const clone = r.clone()
            caches.open(CACHE).then((c) => c.put(e.request, clone))
          }
          return r
        })
    )
  )
})

const CACHE = 'wa-directory-v1'
const API = '/api/'

self.addEventListener('install', (e) => {
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

  if (url.pathname.startsWith(API)) return

  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const clone = r.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return r
      })
      .catch(() => caches.match(e.request))
  )
})

// My AI Sous Chef — Service Worker v3
// Bump version to force cache invalidation on all PWA installs
const CACHE_NAME = 'sous-chef-v3'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Network-first for API routes
  if (event.request.url.includes('/api/')) {
    return
  }
  // Network-first strategy for everything — freshness over speed
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request)
    )
  )
})

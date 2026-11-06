/* Café Dugout — service worker (PWA)
   Stratégies :
   - navigations (pages)  : réseau d'abord, cache en secours, puis page hors-ligne
   - assets _next/static  : cache d'abord (noms hachés = immuables)
   - images / icônes      : cache d'abord
   - le reste (GET)       : réseau d'abord + copie en cache
   Les appels Supabase (autre origine) ne sont JAMAIS mis en cache. */

const VERSION = 'cafe-dugout-brand-v3'
const SHELL = [
  '/',
  '/login',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/brand/logo.jpg',
  '/brand/entete.jpg'
]

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION)
      // addAll échoue en bloc : on ajoute une par une pour être tolérant
      await Promise.all(
        SHELL.map(url =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        )
      )
      self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // Supabase & co : jamais de cache
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  // --- Pages ---
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          const cache = await caches.open(VERSION)
          cache.put(req, fresh.clone()).catch(() => {})
          return fresh
        } catch {
          const cache = await caches.open(VERSION)
          // page déjà vue -> version en cache ; sinon page « hors ligne »
          return (
            (await cache.match(req)) ||
            (await cache.match('/offline.html')) ||
            new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain' } })
          )
        }
      })()
    )
    return
  }

  // --- Assets statiques / images ---
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/.test(url.pathname)

  if (isStatic) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION)
        const hit = await cache.match(req)
        if (hit) return hit
        try {
          const fresh = await fetch(req)
          if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {})
          return fresh
        } catch {
          return hit || new Response('', { status: 504 })
        }
      })()
    )
    return
  }

  // --- Reste : réseau d'abord, cache en secours ---
  event.respondWith(
    (async () => {
      try {
        return await fetch(req)
      } catch {
        const cache = await caches.open(VERSION)
        return (await cache.match(req)) || new Response('', { status: 504 })
      }
    })()
  )
})

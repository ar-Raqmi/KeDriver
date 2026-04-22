const CACHE_NAME = 'kedriver-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  // Force the new service worker to take over immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Delete all old, outdated caches to prevent white screens
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Strategy: Network First for HTML pages
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Fallback to cache if completely offline
        return caches.match(event.request);
      })
    );
    return;
  }

  // Strategy: Cache First for static assets (images, CSS, JS)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      // If not in cache, fetch from network
      return fetch(event.request).then(networkResponse => {
        // Optionally cache new assets dynamically here, but basic cache is fine for now
        return networkResponse;
      });
    })
  );
});

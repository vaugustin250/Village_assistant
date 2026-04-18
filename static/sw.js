const CACHE_NAME = 'arogyam-kill-cache-v11';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => caches.delete(key)));
    }).then(() => {
      self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  // Always fetch from network and never cache
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

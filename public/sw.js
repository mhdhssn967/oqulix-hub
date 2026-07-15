self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // A simple pass-through fetch handler is required by some browsers to trigger the PWA install prompt.
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

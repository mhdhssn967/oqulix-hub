self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Clear any old caches
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Only handle same-origin GET requests; let external resources (like Cloudflare R2 images) bypass service worker
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    fetch(e.request).catch(async () => {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      return new Response('', { status: 408, statusText: 'Request timed out / offline' });
    })
  );
});

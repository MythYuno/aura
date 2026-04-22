const CACHE_NAME = 'aura-v4-4';
const STATIC = ['./manifest.json', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((c) => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Network-first for HTML/JS/CSS
  if (
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          if (r && r.status === 200) {
            const clone = r.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => caches.match(e.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static
  e.respondWith(
    caches.match(e.request).then((c) => {
      if (c) return c;
      return fetch(e.request).then((r) => {
        if (!r || r.status !== 200) return r;
        const clone = r.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return r;
      });
    })
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

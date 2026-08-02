const CACHE_NAME = 'hub-v2';
const ASSETS = [
  '/',
  '/static/css/style.css',
  '/static/js/app.js',
  '/static/js/sw-register.js',
  '/static/images/icon.svg',
  '/static/images/icon-192.webp',
  '/static/images/icon-512.webp',
  '/static/manifest.json',
  '/login'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Nicht-essentiale API-Calls nicht cachen
  if (event.request.url.includes('/api/')) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match('/')))
  );
});

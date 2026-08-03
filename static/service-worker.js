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

// Push Notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const options = {
      body: payload.body || '',
      icon: '/static/images/icon-192.webp',
      badge: '/static/images/icon-192.webp',
      data: { url: payload.url || '/' },
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [{ action: 'open', title: 'Öffnen' }]
    };
    event.waitUntil(
      self.registration.showNotification(payload.title || 'HUB', options)
    );
  } catch (e) {
    // fallback: raw text
    event.waitUntil(
      self.registration.showNotification('HUB', {
        body: event.data.text(),
        icon: '/static/images/icon-192.webp'
      })
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clients => {
      for (const client of clients) {
        if (client.url.includes(self.registration.scope)) {
          client.navigate(url);
          client.focus();
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

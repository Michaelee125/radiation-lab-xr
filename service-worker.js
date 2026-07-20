const CACHE_VERSION = 'radiation-lab-v1.0.6';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/state.js',
  './js/physics-model.js',
  './js/radiation-emitter.js',
  './js/shield-interaction.js',
  './js/gm-counter.js',
  './js/ui-controller.js',
  './js/quest-controls.js',
  './vendor/aframe.min.js',
  './assets/fonts/Roboto-msdf.json',
  './assets/fonts/Roboto-msdf.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy)));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy)));
      }
      return response;
    }))
  );
});

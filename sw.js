/* ============================================
   VendIX - Service Worker (Offline Support)
   ============================================ */

const CACHE_NAME = 'vendix-v14';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/db.js',
    './js/utils.js',
    './js/app.js',
    './js/pages/dashboard.js',
    './js/pages/produtos.js',
    './js/pages/clientes.js',
    './js/pages/vendas.js',
    './js/pages/cobrancas.js',
    './js/pages/relatorios.js',
    './js/pages/config.js',
    './js/backup.js',
    './js/demo-data.js',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Install: cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Skip non-http requests
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request).then((response) => {
                // Cache CDN resources (Dexie.js)
                if (response.status === 200 && event.request.url.includes('unpkg.com')) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

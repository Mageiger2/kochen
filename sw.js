// ==========================================
// SCHULKÜCHEN REZEPT-FINDER - SERVICE WORKER
// Version: 4.6 (Chrome/Edge Offline Fix)
// ==========================================

const CACHE_NAME = 'rezept-app-cache-v4.6';

// Alle Dateien, die für das Design und die Offline-App zwingend nötig sind.
const URLS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './Logo_Schulamt_Dachau.png',
    './logo_bdb.png',
    './AppEdge.png',
    './AppSafari.jpg',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@0.344.0/dist/umd/lucide.min.js'
];

// 1. INSTALLATION: Kugelsicheres Laden in den Offline-Speicher
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Cache v4.6 geöffnet');
            // Nutzt allSettled! Verhindert, dass der komplette SW abstürzt, 
            // falls eine einzelne Datei im Netzwerk kurz hängt.
            return Promise.allSettled(
                URLS_TO_CACHE.map(url => {
                    return fetch(url).then(response => {
                        if (response.ok) {
                            return cache.put(url, response);
                        }
                    }).catch(err => console.log('Offline-Speicher übersprungen für:', url));
                })
            );
        })
    );
    self.skipWaiting();
});

// 2. AKTIVIERUNG: Lösche alte App-Versionen von den Tablets/PCs
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Lösche alten Cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. OFFLINE-BETRIEB: Fange Anfragen ab & lerne dazu
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Google Docs und Besucherzähler niemals cachen
    if (url.includes('docs.google.com') || url.includes('hits.sh')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            // Wenn im Cache gefunden, sofort ausliefern
            if (response) {
                return response; 
            }
            // Ansonsten aus dem Internet laden UND direkt für die Zukunft cachen (Dynamisches Caching)
            return fetch(event.request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                console.warn('[Service Worker] Ressource offline nicht verfügbar:', url);
            });
        })
    );
});

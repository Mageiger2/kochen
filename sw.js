// ==========================================
// SCHULKÜCHEN REZEPT-FINDER - SERVICE WORKER
// Version: 4.5 (Grundrezepte-Update)
// ==========================================

const CACHE_NAME = 'rezept-app-cache-v4.5';

// Alle Dateien, die für das Design und die Offline-App nötig sind.
// HINWEIS: Die Rezept-Daten (CSV) werden absichtlich nicht hier, 
// sondern dynamisch in der index.html (im localStorage) gespeichert!
const URLS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './Logo_Schulamt_Dachau.png',
    './logo_bdb.png',
    './AppEdge.png',
    './AppSafari.jpg',
    './icon-192.png',
    './icon-512.png'
];

// 1. INSTALLATION: Lade alle wichtigen Dateien in den Offline-Speicher
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching App Shell');
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// 2. AKTIVIERUNG: Lösche alte App-Versionen von den Tablets/PCs
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Lösche alten Cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. OFFLINE-BETRIEB: Fange Anfragen ab
self.addEventListener('fetch', (event) => {
    // Ignoriere die Google Docs CSV-Anfrage (die regelt die index.html selbst)
    if (event.request.url.includes('docs.google.com') || event.request.url.includes('hits.sh')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Wenn die Datei im Offline-Speicher ist, nimm diese
                if (response) {
                    return response;
                }
                // Ansonsten versuche sie aus dem Internet zu laden
                return fetch(event.request).catch(() => {
                    // Fallback, falls man offline ist und die Datei fehlt
                    console.warn('[Service Worker] Ressource offline nicht verfügbar:', event.request.url);
                });
            })
    );
});

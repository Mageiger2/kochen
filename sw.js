// ==========================================
// SCHULKÜCHEN REZEPT-FINDER - SERVICE WORKER
// Version: 4.7
// Neu:
//   - Robuste CDN-Caching-Strategie (CORS → no-cors-Fallback)
//   - Fetch-Handler liefert nie mehr `undefined` zurück
//     (das war die Hauptursache für das kaputte Design in Edge/Chrome,
//      wenn das WLAN kurz hing)
//   - Icons werden mitgecacht
//   - GET-Filter, ignoriert POST/HEAD korrekt
// ==========================================

const CACHE_NAME = 'rezept-app-cache-v4.7';

// Alle Dateien, die für das Design und die Offline-App zwingend nötig sind.
const URLS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './Logo_Schulamt_Dachau.png',
    './logo_bdb.png',
    './AppEdge.png',
    './AppSafari.jpg',
    './icon-192.png',
    './icon-512.png',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@0.344.0/dist/umd/lucide.min.js'
];

// Robustes Caching: Erst per CORS versuchen, bei Misserfolg auf no-cors-Modus zurückfallen.
// no-cors-Antworten sind zwar opak, lassen sich aber speichern und vom Browser als
// Script/Bild/CSS wiederverwenden.
function cacheResource(cache, url) {
    return fetch(url, { credentials: 'omit' })
        .then(response => {
            if (response && response.ok) {
                return cache.put(url, response);
            }
            throw new Error('Antwort nicht OK: ' + (response && response.status));
        })
        .catch(() => {
            return fetch(url, { mode: 'no-cors', credentials: 'omit' })
                .then(r => cache.put(url, r))
                .catch(err => console.warn('[SW] Konnte nicht cachen:', url, err));
        });
}

// 1. INSTALLATION
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Cache', CACHE_NAME, 'wird angelegt');
            return Promise.allSettled(URLS_TO_CACHE.map(url => cacheResource(cache, url)));
        })
    );
    self.skipWaiting();
});

// 2. AKTIVIERUNG: Alte Cache-Versionen aufräumen
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names
                    .filter(n => n !== CACHE_NAME)
                    .map(n => {
                        console.log('[Service Worker] Lösche alten Cache:', n);
                        return caches.delete(n);
                    })
            ))
            .then(() => self.clients.claim())
    );
});

// 3. OFFLINE-BETRIEB: Cache-First mit sicherem Fallback
self.addEventListener('fetch', event => {
    // Nur GET-Requests behandeln
    if (event.request.method !== 'GET') return;

    const url = event.request.url;

    // Live-Daten und externer Besucherzähler werden niemals gecacht
    if (url.includes('docs.google.com') || url.includes('hits.sh')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(networkResponse => {
                // Erfolgreiche Antworten dynamisch nachcachen
                // (status 200 für CORS/basic, type 'opaque' für no-cors-Bilder)
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return networkResponse;
            }).catch(() => {
                // WICHTIG: niemals `undefined` zurückgeben — sonst sieht der Browser
                // einen kompletten Netzwerk-Abbruch und das Layout bricht zusammen.
                return new Response('', {
                    status: 504,
                    statusText: 'Offline – keine gespeicherte Version vorhanden'
                });
            });
        })
    );
});

// ==========================================================
// Service Worker für den Schulküchen-Rezeptfinder
// ==========================================================

const CACHE_NAME = 'schulkueche-cache-v4.3'; // NEU: Zwingt alle Geräte zum Update

// Diese Dateien werden beim ersten Start gesichert
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './Logo_Schulamt_Dachau.png',
    './logo_bdb.png',
    './AppEdge.png',
    './AppSafari.jpg',
    // Mac/iPad Fix: Wir sichern auch die genutzten Frameworks!
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@0.344.0/dist/umd/lucide.min.js'
];

// INSTALLATION: Lädt Dateien einzeln in den Cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Cache v4.3 geöffnet');
            // Nutzt allSettled statt all, damit Safari nicht abstürzt, 
            // falls das externe Tailwind mal eine Millisekunde zu lange braucht.
            return Promise.allSettled(
                urlsToCache.map(url => {
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

// AKTIVIERUNG: Löscht alten Müll (z.B. v4.2 oder älter)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// FETCH: Liefert den Cache aus, wenn man offline ist
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Google-Datenbank und Bilder NIEMALS aus dem Hintergrund-Cache laden!
    if (url.includes('docs.google.com') || url.includes('lh3.googleusercontent.com')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                return response; // Gefunden -> Sofort ausliefern
            }
            return fetch(event.request).then(networkResponse => {
                // Dynamisches Sichern für die Zukunft
                if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Fehler ignorieren, wenn komplett offline
            });
        })
    );
});

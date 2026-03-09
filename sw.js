const CACHE_NAME = 'rezeptfinder-v4';

// Hier tragen wir alle Dateien ein, die für den Offline-Start zwingend auf dem Gerät liegen müssen
const ASSETS_TO_CACHE = [
    './',
    './index.html', // oder rezept_finder.html (je nachdem wie deine HTML Datei wirklich heißt)
    './Logo_Schulamt_Dachau.png',
    './logo_bdb.png',
    './AppEdge.png',
    './AppSafari.jpg'
];

// Installation des Service Workers
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(ASSETS_TO_CACHE))
        .catch(err => console.log('Cache fehlgeschlagen', err))
    );
});

// Aktivierung
self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

// Anfragen abfangen (Offline-Fähigkeit sicherstellen)
self.addEventListener('fetch', event => {
    // Nur GET-Anfragen (Downloads) bearbeiten
    if (event.request.method !== 'GET') return;
    
    // Den Besucherzähler bewusst nicht speichern (macht keinen Sinn offline)
    if (event.request.url.includes('hits.sh')) return;

    event.respondWith(
        fetch(event.request).then(response => {
            // Wenn das Internet klappt: Lade die aktuelle Datei und lege eine Kopie in den Cache
            if (response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    // Google Sheets Parameter "säubern", um den korrekten Link zu merken
                    let cacheKey = event.request;
                    if(event.request.url.includes('docs.google.com')) {
                        cacheKey = new Request(event.request.url.split('&_t=')[0]);
                    }
                    cache.put(cacheKey, responseToCache);
                });
            }
            return response;
        }).catch(() => {
            // WENN KEIN INTERNET: Suche die Datei im lokalen Cache
            let cacheKey = event.request;
            if(event.request.url.includes('docs.google.com')) {
                cacheKey = new Request(event.request.url.split('&_t=')[0]);
            }
            return caches.match(cacheKey);
        })
    );
});

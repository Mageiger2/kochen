// ==========================================================
// Service Worker für den Schulküchen-Rezeptfinder
// ==========================================================

// WICHTIG: Wenn du in Zukunft die index.html änderst, 
// musst du hier einfach die Versionsnummer (z.B. auf v5.0) ändern.
// Das zwingt die Tablets, das Update herunterzuladen!
const CACHE_NAME = 'schulkueche-cache-v4.2';

// Diese lokalen Dateien werden beim ersten Start für den Offline-Modus gespeichert
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './Logo_Schulamt_Dachau.png',
    './logo_bdb.png',
    './AppEdge.png',
    './AppSafari.jpg'
];

// INSTALLATION: Speichert die Dateien im Cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache geöffnet');
                return cache.addAll(urlsToCache);
            })
    );
    // Zwingt den neuen Service Worker, sofort aktiv zu werden (wartet nicht auf Neustart)
    self.skipWaiting();
});

// AKTIVIERUNG: Löscht alte, nicht mehr benötigte Caches (z.B. v4.1)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Alter Cache wird gelöscht:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Übernimmt sofort die Kontrolle über alle offenen Tabs der App
    return self.clients.claim();
});

// FETCH: Fängt Netzwerkanfragen ab (Offline-Fähigkeit)
self.addEventListener('fetch', event => {
    // Ignoriere Anfragen an fremde Server (wie Google Sheets oder Google Drive Bilder),
    // da diese von unserer index.html selbst offline verwaltet werden.
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Wenn die Datei im Cache gefunden wird (z.B. index.html oder Logos), gib sie zurück
                if (response) {
                    return response;
                }
                // Ansonsten lade sie ganz normal aus dem Internet
                return fetch(event.request);
            })
    );
});

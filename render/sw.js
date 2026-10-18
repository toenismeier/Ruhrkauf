// Offline-Shell. Funktioniert nur unter HTTPS oder localhost, nicht ueber eine HTTP-LAN-Adresse.
// Spielstaende liegen ausschliesslich in IndexedDB, nicht im Cache.
const CACHE = 'hartwig-shell-v1';
const SHELL = ['./spiel.html', './spiel-bundle.js', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('hartwig-shell-') && k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Alle Shell-Dateien bei Netzverbindung aktualisieren, offline aus Cache laden.
  // Das vermeidet veraltete Bundles bei gleichem Service-Worker-Cache-Namen.
  event.respondWith(fetch(event.request).then((antwort) => {
    if (antwort.ok) {
      const kopie = antwort.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, kopie));
    }
    return antwort;
  }).catch(() => caches.match(event.request)));
});

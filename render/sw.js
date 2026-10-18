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
  // Bei Updates online bleiben; nur offline auf den letzten geladenen Stand zurueckfallen.
  const netzZuerst = url.pathname.endsWith('/spiel.html') || url.pathname.endsWith('/');
  if (netzZuerst) {
    event.respondWith(fetch(event.request).then((antwort) => {
      if (antwort.ok) { const kopie = antwort.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, kopie)); }
      return antwort;
    }).catch(() => caches.match(event.request)));
  } else {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});

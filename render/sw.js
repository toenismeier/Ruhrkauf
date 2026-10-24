// N11: Versionsabhängige, bewusst kleine Offline-Shell.
// Spielstände liegen ausschließlich in IndexedDB und werden niemals vom Service Worker gecacht.
// Bei jeder Veröffentlichung, die die Shell ändert, diese Versionskennung erhöhen.
const CACHE = 'hartwig-shell-n11-v3';
const SHELL = [
  './spiel.html', './spiel-bundle.js', './manifest.webmanifest',
  './app-icon-180.png', './app-icon-512.png', './src/ui/hartwig.css'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  // NICHT automatisch skipWaiting: die laufende Partie soll die Version selbst wechseln.
});
self.addEventListener('message', (event) => {
  if (event.data?.typ === 'AKTIVIEREN') self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('hartwig-shell-') && key !== CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const root = new URL('./', self.registration.scope).pathname;
  if (!url.pathname.startsWith(root)) return;
  const pfad = './' + (url.pathname.slice(root.length) || 'spiel.html');
  if (!SHELL.includes(pfad)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const antwort = await cache.match(pfad);
    if (antwort) return antwort;
    try {
      const netz = await fetch(event.request);
      if (netz.ok) await cache.put(pfad, netz.clone());
      return netz;
    } catch {
      if (event.request.mode === 'navigate') {
        const start = await cache.match('./spiel.html');
        if (start) return start;
      }
      return Response.error();
    }
  })());
});

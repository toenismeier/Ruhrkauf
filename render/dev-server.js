// Einfacher Preview-Server fuer den iPhone-Test im privaten WLAN. Ohne Deployment und ohne API.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = __dirname;
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT muss eine Zahl zwischen 1 und 65535 sein.');
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch { res.writeHead(400); res.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { res.writeHead(400); res.end(); return; }
  const datei = path.resolve(root, '.' + (pathname === '/' ? '/spiel.html' : pathname));
  if (!datei.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(datei, (fehler, inhalt) => {
    if (fehler) { res.writeHead(fehler.code === 'ENOENT' ? 404 : 500); res.end(); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(datei)] || 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : inhalt);
  });
});
server.listen(port, '0.0.0.0', () => {
  console.log('Hartwig lokal: http://localhost:' + port + '/spiel.html');
  for (const liste of Object.values(os.networkInterfaces())) for (const n of liste || []) {
    if (n.family === 'IPv4' && !n.internal) console.log('iPhone im selben WLAN: http://' + n.address + ':' + port + '/spiel.html');
  }
  console.log('Nur im vertrauenswuerdigen privaten Netzwerk nutzen. Mit Strg+C beenden.');
});

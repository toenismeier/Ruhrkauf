// N11 Browserabnahme: Speicherplätze, Gzip-Transfer, Wiederaufnahme und Offline-Start.
// Aufruf nach dem Build: cd render && node tests/app-pwa-smoke.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.css': 'text/css',
  '.webmanifest': 'application/manifest+json'
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file;
  try {
    file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/spiel.html' : url.pathname));
  } catch { res.writeHead(400); res.end(); return; }
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, bytes) => {
    if (err) { res.writeHead(err.code === 'ENOENT' ? 404 : 500); res.end(); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(bytes);
  });
});

(async () => {
  let browser, context;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const adresse = 'http://127.0.0.1:' + server.address().port + '/spiel.html';
    const optionen = {
      headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    };
    if (process.env.CHROMIUM_PATH) optionen.executablePath = process.env.CHROMIUM_PATH;
    browser = await chromium.launch(optionen);
    context = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
      isMobile: true, hasTouch: true, acceptDownloads: true
    });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(e.message));
    await page.goto(adresse, { waitUntil: 'load' });
    await page.locator('#start.an').waitFor();
    const manifest = await page.evaluate(async () => (await (await fetch('./manifest.webmanifest')).json()));
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.orientation, 'portrait');
    assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.type === 'image/png'));
    assert.equal(await page.evaluate(async () => (await fetch('./app-icon-512.png')).ok), true);
    assert.equal(await page.evaluate(async () => (await fetch('./app-icon-180.png')).ok), true);

    // N09: zuerst Szenario wählen, danach Schwierigkeit und Start.
    await page.locator('.sz-karte[data-szenario=standard]').click();
    await page.locator('#startknopf').click();
    await page.waitForFunction(() => window.bereit && window.spiel?.s?.haeuser?.length > 0);
    // N04: Die Einführungsfrage beim ersten Start schließen, damit die Spielstände bedienbar sind.
    const nie = page.locator('[data-ein="nie"]');
    if (await nie.isVisible().catch(() => false)) await nie.click();
    const soll = await page.evaluate(() => {
      window.spiel.woche(false);
      const roh = JSON.stringify(window.spiel.s);
      let hash = 2166136261;
      for (let i = 0; i < roh.length; i++) hash = Math.imul(hash ^ roh.charCodeAt(i), 16777619) >>> 0;
      return { woche: window.spiel.s.woche, cash: window.spiel.s.cash,
        hauszahl: window.spiel.s.haeuser.length, historie: window.spiel.s.historie.length,
        laenge: roh.length, hash };
    });
    await page.evaluate(() => window.spiel.speichern());
    await page.evaluate(() => window.spiel.app.oeffne());
    const platz1 = page.locator('#pinhalt [data-platz="platz-1"]');
    await platz1.locator('[data-name]').fill('Essen Sanierung');
    await platz1.locator('[data-app-aktion="speichern"]').click();
    await page.waitForFunction(() => !!document.querySelector('#pinhalt [data-platz="platz-1"] .app-daten strong')?.textContent.includes('Essen Sanierung'));
    const vorschau = await page.locator('#pinhalt [data-platz="platz-1"] .app-vorschau').getAttribute('src');
    assert.ok(vorschau.startsWith('data:image/jpeg;base64,'), 'Vorschau ist JPEG');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#pinhalt [data-platz="platz-1"] [data-app-aktion="export"]').click();
    const download = await downloadPromise;
    assert.ok(download.suggestedFilename().endsWith('.hartwig'));
    const gzipBytes = fs.readFileSync(await download.path());
    assert.equal(gzipBytes[0], 0x1f);
    assert.equal(gzipBytes[1], 0x8b);

    // Import auf einen anderen Platz, dann vollständige Wiederaufnahme im selben Browser.
    const datei = page.locator('#pinhalt [data-platz="platz-2"] [data-app-datei]');
    await datei.setInputFiles({ name: 'backup.hartwig', mimeType: 'application/gzip', buffer: gzipBytes });
    await page.waitForFunction(() => !!document.querySelector('#pinhalt [data-platz="platz-2"] .app-daten strong'));
    const platz2 = await page.evaluate(() => {
      const k = document.querySelector('#pinhalt [data-platz="platz-2"]');
      return { name: k.querySelector('strong')?.textContent, wo: k.querySelector('.app-daten')?.textContent };
    });
    assert.equal(platz2.name, 'Essen Sanierung');
    await page.locator('#pinhalt [data-platz="platz-2"] [data-app-aktion="laden"]').click();
    await page.waitForFunction(() => window.spiel.s.woche === 1 && window.bereit);
    let ist = await page.evaluate(() => {
      const roh = JSON.stringify(window.spiel.s);
      let hash = 2166136261;
      for (let i = 0; i < roh.length; i++) hash = Math.imul(hash ^ roh.charCodeAt(i), 16777619) >>> 0;
      return { woche: window.spiel.s.woche, cash: window.spiel.s.cash,
        hauszahl: window.spiel.s.haeuser.length, historie: window.spiel.s.historie.length,
        laenge: roh.length, hash };
    });
    assert.deepEqual(ist, soll, 'Importierter Stand und Ausgangszustand sind identisch');

    await page.reload({ waitUntil: 'load' });
    await page.locator('#start.an').waitFor();
    await page.locator('#start [data-platz="platz-1"] [data-app-aktion="laden"]').click();
    await page.waitForFunction(() => window.bereit && window.spiel?.s?.woche === 1);
    ist = await page.evaluate(() => {
      const roh = JSON.stringify(window.spiel.s);
      let hash = 2166136261;
      for (let i = 0; i < roh.length; i++) hash = Math.imul(hash ^ roh.charCodeAt(i), 16777619) >>> 0;
      return { woche: window.spiel.s.woche, cash: window.spiel.s.cash,
        hauszahl: window.spiel.s.haeuser.length, historie: window.spiel.s.historie.length,
        laenge: roh.length, hash };
    });
    assert.deepEqual(ist, soll, 'Laden nach Seitenneustart liefert denselben Stand');

    // SW muss die App-Shell übernehmen, erst danach Browser wirklich offline schalten.
    await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 60000 });
    await context.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.locator('#start.an').waitFor();
    assert.equal(await page.evaluate(() => navigator.onLine), false);
    assert.equal(await page.locator('.sz-karte[data-szenario=standard]').isVisible(), true);
    await page.locator('#start [data-platz="platz-1"] [data-app-aktion="laden"]').click();
    await page.waitForFunction(() => window.bereit && window.spiel?.s?.woche === 1);
    assert.equal(await page.evaluate(() => window.spiel.s.cash), soll.cash);

    assert.deepEqual(fehler, [], 'Keine ungefangenen JavaScript-Fehler');
    const ziel = path.join(root, '..', 'bilder', 'nice', 'app');
    fs.mkdirSync(ziel, { recursive: true });
    await page.screenshot({ path: path.join(ziel, 'offline.png') });
    console.log('N11 OK: Manifest, Icons, 4 Plätze, JPEG, gzip-Export/Import, Reload, Offline-Neustart');
  } catch (e) {
    console.error('N11 App-Smoke-Test FEHLER:', e);
    process.exitCode = 1;
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})();

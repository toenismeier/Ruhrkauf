// Q23: iPhone-Smoke-Test für Deutschlandkarte und das unterste Reiseziel.
// Nach lokalem Build: node tests/q23-reise-mobile.cjs (optional CHROMIUM_PATH).
// Claude führt den Test und die Bildabnahme aus; keine Aktualisierung von Fingerabdrücken.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/spiel.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end(String(error)); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(bytes);
  });
});
async function pruefen(browser, url, breite, hoehe) {
  const context = await browser.newContext({
    viewport: { width: breite, height: hoehe }, deviceScaleFactor: 2, isMobile: true,
    hasTouch: true, reducedMotion: 'reduce'
  });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(e.message));
    await page.goto(url + '?ohne-animation', { waitUntil: 'load' });
    await page.locator('#start.an').waitFor();
    await page.locator('.sz-karte[data-szenario="standard"]').click();
    await page.locator('#startknopf').click();
    await page.waitForFunction(() => window.bereit === true && !!window.spiel?.s?.haeuser?.length);

    await page.locator('#stadt-reise').click();
    await page.locator('#reise-overlay.ziele-offen').waitFor();
    const karte = page.locator('.hw-reise-karte .hw-deutschland');
    assert.equal(await karte.count(), 1, 'Die Reise benutzt genau eine gemeinsame Deutschlandkarte');
    assert.equal(await page.locator('.hw-dl-laender path').count(), 16, '16 Bundesländer mit echten Grenzverläufen');
    const info = await page.evaluate(() => window.spiel.reise.pruefe());
    assert.ok(info.kartenPunkte >= 10, 'Echte Städtekoordinaten aus der Engine');
    assert.equal(info.stadt, 'Essen', 'Essen ist als aktueller Standort hinterlegt');
    assert.equal(await page.locator('.hw-dl-aktuell[data-stadt="Essen"]').count(), 1,
      'Der aktuelle Standort wird auf der Karte hervorgehoben');
    if (breite === 390) {
      fs.mkdirSync(path.join(root, 'out'), { recursive: true });
      await page.screenshot({ path: path.join(root, 'out', 'q23-reise-karte-390.png') });
    }

    await page.locator('[data-reiseansicht="liste"]').click();
    const liste = page.locator('#reise-blatt-liste');
    assert.equal(await liste.isVisible(), true, 'Liste liegt auf einem eigenen Blatt');
    assert.equal(await page.locator('#reise-blatt-karte').isVisible(), false, 'Karte gibt den gesamten Listenbereich frei');
    const eintraege = page.locator('#reise-blatt-liste [data-reiseziel]');
    const anzahl = await eintraege.count();
    const erwartet = await page.evaluate(() => window.spiel.reise.pruefe().zielAnzahl);
    assert.equal(anzahl, erwartet);
    assert.ok(anzahl > 10, 'Alle Reiseziele sind vorhanden');
    const letzter = eintraege.last();
    const ziel = await letzter.getAttribute('data-reiseziel');
    await letzter.scrollIntoViewIfNeeded();
    const sichtbar = await letzter.evaluate((el) => {
      const ziel = el.getBoundingClientRect(), rand = el.closest('.hw-inhalt').getBoundingClientRect();
      return { oben: ziel.top, unten: ziel.bottom, randOben: rand.top, randUnten: rand.bottom,
        scroll: el.closest('.hw-inhalt').scrollTop };
    });
    assert.ok(sichtbar.oben >= sichtbar.randOben - 2 && sichtbar.unten <= sichtbar.randUnten + 2,
      'Letzte Stadt ist vollständig im sichtbaren Listenbereich: ' + JSON.stringify(sichtbar));
    assert.ok(sichtbar.scroll > 0, 'Die Liste lässt sich tatsächlich bis zum Ende scrollen');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 1, 'Kein horizontaler iPhone-Überlauf');
    if (breite === 390) await page.screenshot({ path: path.join(root, 'out', 'q23-reise-liste-ende-390.png') });
    await letzter.click();
    await page.waitForFunction((name) =>
      !window.spiel.reise.aktiv() && window.spiel.reise.pruefe().stadt === name, ziel, { timeout: 120000 });
    assert.equal((await page.evaluate(() => window.spiel.reise.pruefe())).stadt, ziel,
      'Antippen der letzten Stadt löst eine tatsächliche Reise aus');

    // Die Karte bleibt auch nach einer Reise ohne erneuten Stadtlistenaufbau bedienbar.
    if (breite === 375) {
      await page.locator('#stadt-reise').click();
      await page.locator('#reise-overlay.ziele-offen').waitFor();
      const von = (await page.evaluate(() => window.spiel.reise.pruefe())).stadt;
      const karteZiel = von === 'Berlin' ? 'Hamburg' : 'Berlin';
      await page.locator('.hw-reise-karte [data-stadt="' + karteZiel + '"]').click();
      await page.waitForFunction((name) =>
        !window.spiel.reise.aktiv() && window.spiel.reise.pruefe().stadt === name,
        karteZiel, { timeout: 120000 });
    }
    assert.deepEqual(fehler, [], 'Keine JavaScript-Laufzeitfehler auf iPhone-Größe');
    console.log('Q23 OK:', breite + '×' + hoehe, 'Ziele:', anzahl, 'letzte Stadt:', ziel);
  } finally { await context.close(); }
}
(async () => {
  let browser;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const optionen = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
    if (process.env.CHROMIUM_PATH) optionen.executablePath = process.env.CHROMIUM_PATH;
    browser = await chromium.launch(optionen);
    const url = 'http://127.0.0.1:' + server.address().port + '/spiel.html';
    await pruefen(browser, url, 390, 844);
    await pruefen(browser, url, 375, 667);
  } catch (e) {
    console.error('Q23 Mobil-Smoke-Test fehlgeschlagen:', e);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})();

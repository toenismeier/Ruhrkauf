// Integrations-Smoke-Test ueber einen echten HTTP-Origin im iPhone-Viewport.
// Prueft Start, Folgewoche, IndexedDB-Spielstand, Fortsetzen und 90-Frame-Diagnose.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/spiel.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end(error.message); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
});
(async () => {
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const url = `http://127.0.0.1:${server.address().port}/spiel.html`;
    const opts = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
    if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
    browser = await chromium.launch(opts);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.locator('#start.an').waitFor();
    assert.equal(await page.locator('.stufe-karte').count(), 3, 'Startbildschirm hat drei Schwierigkeitsgrade');
    await page.locator('#startknopf').click();
    await page.waitForFunction(() => window.bereit === true && window.spiel?.s?.haeuser?.length > 0);
    const vorher = await page.evaluate(() => {
      window.spiel.woche(false);
      return { woche: window.spiel.s.woche, cash: window.spiel.s.cash, umsatz: window.spiel.s.historie.at(-1).umsatz };
    });
    assert.equal(vorher.woche, 1, 'Eine Woche wurde gespielt');
    await page.evaluate(() => window.spiel.speichern());
    await page.reload({ waitUntil: 'load' });
    await page.locator('#fortsetzen').waitFor({ state: 'visible' });
    await page.locator('#fortsetzen').click();
    await page.waitForFunction(() => window.bereit === true && window.spiel?.s?.woche === 1);
    const nachher = await page.evaluate(() => ({
      woche: window.spiel.s.woche, cash: window.spiel.s.cash, umsatz: window.spiel.s.historie.at(-1).umsatz
    }));
    assert.deepEqual(nachher, vorher, 'Fortsetzen bewahrt exakt dieselbe Wochen-GuV und Liquidität');
    // Posteingang: Öffnen, Zähler und eine tatsächliche Engine-Entscheidung prüfen.
    await page.evaluate(() => {
      const s = window.spiel.s, h = s.haeuser[0];
      s.entscheidungen.push({
        id: 'e-mobil-post', typ: 'instandhaltung', woche: s.woche, frist: s.woche + 1,
        titel: 'Brandschutz im Haus', text: 'Prüfung für den Posteingang.',
        optionen: [{ id: 'zahlen', label: 'Zahlen' }, { id: 'verschieben', label: 'Verschieben' }],
        standard: 'zahlen', daten: { haus: h.id, kosten: 500000 },
      });
      window.spiel.oeffnePosteingang('handeln');
    });
    const eingang = await page.evaluate(() => ({
      ...window.spiel.posteingang.pruefe(), titel: document.getElementById('ptitel').textContent
    }));
    assert.equal(eingang.titel, 'Posteingang');
    assert.equal(eingang.badge, eingang.soll, 'Badge zählt alle offenen Vorgänge');
    assert.equal(eingang.karten, eingang.soll, 'Jeder Vorgang hat eine Karte');
    const entscheidungSoll = await page.evaluate(() => {
      const kopie = structuredClone(window.spiel.s);
      const r = window.spiel.E.fuehreAus(kopie, { typ: 'entscheiden', id: 'e-mobil-post', option: 'verschieben' });
      if (!r.ok) throw new Error(r.text);
      return JSON.stringify(kopie);
    });
    await page.locator('[data-post-id="e-mobil-post"] [data-po-a="option"][data-v="verschieben"]').click();
    const entscheidungIst = await page.evaluate(() => JSON.stringify(window.spiel.s));
    assert.equal(entscheidungIst, entscheidungSoll, 'UI-Aktion entspricht fuehreAus auf einem Klon');
    await page.locator('#pzu').click();
    await page.locator('#menueknopf').click();
    await page.locator('#performance').click();
    await page.waitForFunction(() =>
      window.spiel.letzteDiagnose?.frames >= 5 ||
      document.getElementById('punter')?.textContent === 'Messung fehlgeschlagen',
      null, { timeout: 45000 });
    const status = await page.evaluate(() => ({
      diag: window.spiel.letzteDiagnose,
      titel: document.getElementById('ptitel')?.textContent,
      unter: document.getElementById('punter')?.textContent,
      text: document.getElementById('pinhalt')?.textContent?.slice(0, 700)
    }));
    assert.ok(status.diag, 'Performance-Messung nicht abgeschlossen: ' + JSON.stringify(status));
    const diag = status.diag;
    assert.ok(diag.fps > 0 && Number.isFinite(diag.frameP95Ms), 'Performance-Messung liefert echte Frames');
    assert.ok(diag.drawCalls > 0, 'Die Stadt wurde tatsaechlich gerendert');
    assert.equal(diag.grafikprofil, 'sparsam', 'Mobiles Geraet verwendet das sparsame Grafikprofil');
    assert.deepEqual(errors, [], 'Keine JavaScript-Laufzeitfehler');
    fs.mkdirSync(path.join(root, 'out'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'out', 'mobil-smoke.png') });
    console.log(`OK: Start, Wochenlauf, IndexedDB, Wiederaufnahme, Performance (${diag.fps} FPS, P95 ${diag.frameP95Ms} ms)`);
    await context.close();
  } catch (e) {
    console.error('Mobil-Smoke-Test FEHLER:', e);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})();

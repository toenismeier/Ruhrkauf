// Prüft die gepackte App-Datei spiel/spiel.html wie in der iOS-WebView: eine Datei, fester Ursprung, keine Nachladungen.
// Aufruf: npm run smoke   (nutzt Playwright aus render/node_modules)
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(__dirname, '..', '..', 'render', 'node_modules', 'playwright'));
const URSPRUNG = 'https://spiel.hartwig.app/';
const html = fs.readFileSync(path.join(__dirname, '..', 'spiel', 'spiel.html'), 'utf8');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const nachgeladen = [];
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url === URSPRUNG) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
    if (url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    nachgeladen.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(180000);
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  const t0 = Date.now();
  await page.goto(URSPRUNG, { waitUntil: 'load' });
  await page.locator('#start.an').waitFor();
  const tStart = Date.now() - t0;
  await page.locator('.sz-karte[data-szenario=standard]').click(); // N09: Szenarioauswahl
  await page.locator('#startknopf').click();
  const t1 = Date.now();
  await page.waitForFunction(() => window.bereit === true && window.spiel?.s?.haeuser?.length > 0);
  const tSpielbar = Date.now() - t1;
  const vorher = await page.evaluate(() => { for (let i = 0; i < 20; i++) window.spiel.woche(false); return { woche: window.spiel.s.woche, cash: window.spiel.s.cash }; });
  assert.equal(vorher.woche, 20, '20 Wochen gespielt');
  await page.evaluate(() => window.spiel.speichern());
  await page.reload({ waitUntil: 'load' });
  await page.locator('#fortsetzen').waitFor({ state: 'visible' });
  await page.locator('#fortsetzen').click();
  await page.waitForFunction(() => window.bereit === true && window.spiel?.s?.woche === 20);
  const nachher = await page.evaluate(() => ({ woche: window.spiel.s.woche, cash: window.spiel.s.cash }));
  assert.deepEqual(nachher, vorher, 'Spielstand über IndexedDB am festen Ursprung erhalten');
  await page.screenshot({ path: path.join(__dirname, '..', 'spiel', 'smoke.png') });
  await browser.close();
  assert.deepEqual(fehler, [], 'Keine Seitenfehler');
  const extern = nachgeladen.filter((u) => !u.endsWith('/sw.js'));
  assert.deepEqual(extern, [], 'Keine nachgeladenen Dateien');
  console.log(`OK: Startbildschirm ${tStart} ms, Stadt spielbar ${tSpielbar} ms (Desktop-Chromium), 20 Wochen, Speichern/Fortsetzen`);
})().catch((e) => { console.error(e); process.exit(1); });

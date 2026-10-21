// N03: End-to-End-Abnahme und drei Pflichtbilder.
// Aufruf: cd render && node tests/erfolge-smoke.cjs
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

(async () => {
  const root = path.resolve(__dirname, '..');
  const bilder = path.resolve(root, '..', 'bilder', 'nice', 'erfolge');
  mkdirSync(bilder, { recursive: true });
  execFileSync(process.execPath, [path.join(root, 'spiel-render.js'), '--bundle'], { cwd: root, stdio: 'inherit' });
  const browser = await chromium.launch({ headless: true, args: ['--headless=new'], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const fehler = [];
  page.on('pageerror', err => fehler.push(err.message));
  try {
    await page.goto('file://' + path.join(root, 'spiel.html') + '?stadt=Essen&seed=1&ohne-animation=1');
    await page.waitForFunction(() => window.bereit === true, null, { timeout: 120_000 });
    const daten = await page.evaluate(() => window.spiel.E.erfolgeUebersicht(window.spiel.s));
    if (daten.length !== 30) throw new Error('Erwartet 30 Erfolge, gefunden: ' + daten.length);
    await page.evaluate(() => window.spiel.oeffneErfolge());
    await page.screenshot({ path: path.join(bilder, 'erfolge-seite.png') });
    await page.evaluate(() => window.spiel.schliessePanel());

    // Bot C erzeugt in Woche 26 garantiert den Meilenstein „Halbes Jahr“.
    for (let i = 0; i < 25; i++) {
      await page.evaluate(() => window.spiel.woche(true));
    }
    await page.evaluate(() => window.spiel.wochenbericht.oeffne());
    await page.locator('[data-wa="ja"]').click();
    await page.waitForSelector('.wb-bericht');
    const bericht = await page.locator('.wb-erfolge').innerText();
    if (!bericht.includes('Halbes Jahr')) throw new Error('Wochenergebnis ohne neuen Erfolg: ' + bericht);
    await page.screenshot({ path: path.join(bilder, 'erfolge-wochenbericht.png') });

    // Toast der echten Freischaltung fotografieren; keine fiktiven Format-Daten injizieren.
    await page.evaluate(() => document.querySelector('#wochen-overlay .wb-schliessen')?.click());
    await page.waitForSelector('#erfolge-toast.sichtbar', { timeout: 10000 });
    await page.screenshot({ path: path.join(bilder, 'erfolge-toast.png') });
    if (fehler.length) throw new Error('Browserfehler: ' + fehler.join('; '));
    console.log('N03 Erfolge: 30 Einträge, Freischaltbericht und Toast geprüft. Bilder in ' + bilder);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('Erfolge-Abnahme fehlgeschlagen:', e); process.exitCode = 1; });

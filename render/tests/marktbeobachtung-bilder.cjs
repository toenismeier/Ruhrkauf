// Lokale visuelle Abnahme Q06: cd render && npm ci && node tests/marktbeobachtung-bilder.cjs
// Schreibt vier echte Screenshots in bilder/wurf1/marktbeobachtung/.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const bilder = path.resolve(root, '..', 'bilder', 'wurf1', 'marktbeobachtung');
  fs.mkdirSync(bilder, { recursive: true });
  const build = spawnSync(process.execPath, ['spiel-render.js', '--bundle'], { cwd: root, stdio: 'inherit' });
  if (build.status !== 0) throw new Error('Bundle fehlgeschlagen.');
  const opts = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(opts);
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(e.message));
    await page.goto('file://' + path.join(root, 'spiel.html') + '?stadt=Essen&seed=1&ohne-animation=1', { waitUntil: 'load' });
    await page.waitForFunction(() => window.bereit === true, null, { timeout: 120000 });
    // Fachabteilung aktivieren, bevor die 52-Wochen-Stichprobe beginnt.
    await page.evaluate(() => window.spiel.oeffneOrganisation());
    await page.locator('[data-org="marktStufe"][data-stufe="1"]').click();
    await page.evaluate(() => window.spiel.schliessePanel());
    const spieleBis = (woche) => page.evaluate((ziel) => {
      while (window.spiel.s.woche < ziel && window.spiel.s.phase !== 'zerschlagen') window.spiel.woche(true);
      return window.spiel.s.woche;
    }, woche);
    const bild = async (datei) => {
      await page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));
      await page.screenshot({ path: path.join(bilder, datei) });
      console.log('Q06-Zeitungsbild:', path.join(bilder, datei));
    };
    await spieleBis(3);
    await page.evaluate(() => window.spiel.oeffneZeitung());
    await bild('01-normale-woche.png');
    const versammlung = await spieleBis(23);
    if (versammlung !== 23) throw new Error('Bot C hat die Gläubigerversammlung nicht erreicht.');
    const ereignisAusgabe = await page.evaluate(() => {
      const ausgaben = window.spiel.s.zeitung?.ausgaben ?? [];
      return [...ausgaben].reverse().find((x) => [x.aufmacher, ...x.meldungen].some((a) => a.art === 'glaeubiger'));
    });
    if (!ereignisAusgabe) throw new Error('Gläubigerversammlung ist in keiner Ausgabe enthalten.');
    await page.evaluate((woche) => window.spiel.oeffneZeitung(woche), ereignisAusgabe.woche);
    await bild('02-glaeubigerversammlung.png');
    const weihnachten = await spieleBis(49);
    if (weihnachten !== 49) throw new Error('Bot C hat das Weihnachtsgeschäft nicht erreicht.');
    await page.evaluate(() => window.spiel.oeffneZeitung(48));
    await page.locator('[data-z-a="tab"][data-v="Handel"]').click();
    await bild('03-weihnachtsquartal.png');
    await page.locator('[data-z-a="archiv"]').click();
    await bild('04-archiv.png');
    if (fehler.length) throw new Error('Browserfehler: ' + fehler.join('; '));
  } finally {
    await browser.close();
  }
})().catch((err) => { console.error(err); process.exitCode = 1; });

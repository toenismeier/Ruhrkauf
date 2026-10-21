// Abnahmebilder: cd render && npm ci && npm run build && node tests/hausbesuch-bilder.cjs
// Auf Wunsch mit CHROMIUM_PATH=/pfad/chromium ausführen. Browser-Emulation ist KEIN echter iPhone-FPS-Nachweis.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const bilder = path.resolve(root, '..', 'bilder', 'nice', 'hausbesuch');
const ausgabe = { screenshots: [], messungen: [], hinweise: ['FPS stammen aus headless Chromium, nicht aus iPhone Safari.'] };

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
  });
  try {
    fs.mkdirSync(bilder, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('file://' + path.join(root, 'spiel.html') + '?stadt=Essen&seed=1&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
    await page.waitForFunction(() => window.bereit === true, null, { timeout: 0 });
    const h = await page.evaluate(() => {
      const l = window.spiel.s.haeuser.filter((q) => q.status === 'offen');
      const hartwig = l.find((q) => q.format === 'warenhaus' && q.lage === '1a' && q.etagen.length >= 2) ?? l.find((q) => q.format === 'warenhaus');
      const sport = l.find((q) => q.format === 'sport');
      if (!hartwig || !sport) throw Error('Keine Hartwig- oder Sportfiliale im Spielstand');
      return [{ ...hartwig, art: 'hartwig-a' }, { ...sport, art: 'sport' },
        { id: 'O001', stadt: 'Essen', etagen: [0], art: 'fundus' }];
    });
    const bild = async (name) => {
      const datei = path.join(bilder, name);
      await page.locator('.hb:not([hidden])').screenshot({ path: datei });
      ausgabe.screenshots.push(path.relative(root, datei));
    };
    for (const haus of h) {
      await page.evaluate(({ stadt, id }) => {
        const sp = window.spiel;
        sp.hausbesuch.schliesse();
        sp.stadt(stadt);
        if (!sp.oeffneHausbesuch(id)) throw Error('Hausbesuch konnte nicht geöffnet werden: ' + id);
      }, { stadt: haus.stadt, id: haus.id });
      for (const nr of [...haus.etagen].sort((a, b) => a - b)) {
        await page.evaluate((e) => window.spiel.hausbesuch.etage(e), nr);
        await page.waitForTimeout(400);
        await bild(haus.art + '-' + haus.id + '-etage-' + nr + '.png');
      }
      if (haus.art === 'hartwig-a' && haus.etagen.length >= 2) {
        const [start, ziel] = [...haus.etagen].sort((a, b) => a - b);
        await page.evaluate((e) => window.spiel.hausbesuch.etage(e), start);
        await page.waitForTimeout(400);
        await page.evaluate((e) => window.spiel.hausbesuch.etage(e), ziel);
        for (const [ms, titel] of [[75, 'start'], [75, 'mitte'], [170, 'ende']]) {
          await page.waitForTimeout(ms);
          await bild('etagenfahrt-' + titel + '.png');
        }
      }
      await page.waitForTimeout(1200);
      ausgabe.messungen.push({ haus: haus.art, id: haus.id, ...await page.evaluate(() => window.spiel.hausbesuch.messung()) });
    }
    if (errors.length) throw Error('Browserfehler: ' + errors.join(' | '));
    fs.writeFileSync(path.join(bilder, 'abnahme.json'), JSON.stringify(ausgabe, null, 2) + '\n');
    console.log('Hausbesuch: ' + ausgabe.screenshots.length + ' Screenshots; Bericht: ' + path.join(bilder, 'abnahme.json'));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });

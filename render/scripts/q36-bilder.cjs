// Q36-Abnahme: Hartwig-Häuser in Aachen, Essen, Berlin, Bielefeld aus Standardkamera und Nahzoom.
// Aufruf: cd render && node scripts/q36-bilder.cjs <ausgabeordner> [Stadt,Stadt]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const aus = path.resolve(process.argv[2] ?? path.join(__dirname, '..', 'out', 'q36'));
  const staedte = (process.argv[3] ?? 'Aachen,Essen,Berlin,Bielefeld').split(',');
  fs.mkdirSync(aus, { recursive: true });
  const optionen = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROMIUM_PATH) optionen.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(optionen);
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    page.on('pageerror', (e) => console.log('Browser:', e.message));
    const url = 'file://' + path.join(__dirname, '..', 'spiel.html') + '?stadt=' + encodeURIComponent(staedte[0]) + '&seed=1&leben=aus&ohne-animation=1';
    await page.goto(url, { waitUntil: 'load', timeout: 0 });
    await page.waitForFunction(() => window.bereit === true, null, { timeout: 0 });
    // Bedienelemente ausblenden, damit die Stadt frei sichtbar ist.
    await page.addStyleTag({ content: 'body > *:not(canvas):not(#szene):not(#bühne){visibility:hidden!important} canvas{visibility:visible!important}' });
    for (const stadt of staedte) {
      const pins = await page.evaluate((s) => { window.spiel.stadt(s); return window.spiel.hauspinListe(); }, stadt);
      const hw = pins.filter((p) => p.format === 'warenhaus' || p.format === 'premium').slice(0, 2);
      let i = 0;
      for (const p of hw) {
        i++;
        for (const [name, halb] of [['standard', 60], ['nah', 30]]) {
          await page.evaluate(({ p, halb }) => window.spiel.kamera({ x: p.dach.x, z: p.dach.z, halb }), { p, halb });
          await page.waitForFunction(() => window.kachelnRuhig !== false, null, { timeout: 0, polling: 100 });
          await page.evaluate(() => window.spiel.jetztZeichnen());
          const datei = path.join(aus, `${stadt.toLowerCase()}-${i}-${name}.png`);
          await page.screenshot({ path: datei });
          console.log(datei, p.hausId);
        }
      }
    }
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });

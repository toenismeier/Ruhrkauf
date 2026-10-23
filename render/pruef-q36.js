// Q36-Prüfregeln über alle Städte, aus der Spielkamera (Startzustand, Seed 1):
//  1. Schriftzug: jeder Buchstabe eines Haus-Schriftzugs ist zu mindestens 90 % sichtbar
//     (Ausnahme: ganze Seite bewusst verdeckt, etwa Gerüstplane beim Umbau).
//  2. Pin: Spitze sitzt auf der Dachkante über dem Eingang (Hauspin-Prüfung aus Q22 mit neuem Anker).
// Aufruf: cd render && node pruef-q36.js [Stadt,Stadt] [--halb=60,30] [--teil=1/2] [--ohne-bundle]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const liste = args.find((a) => !a.startsWith('--'));
  const halbe = (args.find((a) => a.startsWith('--halb='))?.slice(7) ?? '60,30').split(',').map(Number);
  if (!args.includes('--ohne-bundle')) execFileSync('node', ['spiel-render.js', '--bundle'], { cwd: __dirname, stdio: 'inherit' });
  const optionen = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROMIUM_PATH) optionen.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(optionen);
  const bericht = { staedte: [], fehler: [] };
  const t0 = Date.now();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    page.on('pageerror', (e) => bericht.fehler.push('Browser: ' + e.message));
    const url = 'file://' + path.join(__dirname, 'spiel.html') + '?seed=1&leben=aus&ohne-animation=1';
    await page.goto(url, { waitUntil: 'load', timeout: 0 });
    await page.waitForFunction(() => window.bereit === true, null, { timeout: 0 });
    const alle = await page.evaluate(() => [...document.querySelectorAll('#stadtwahl option')].map((e) => e.value));
    const teil = args.find((a) => a.startsWith('--teil='))?.slice(7).split('/').map(Number);
    const staedte = (liste ? liste.split(',') : alle).filter((_, i) => !teil || i % teil[1] === teil[0] - 1);
    for (const stadt of staedte) {
      if (!alle.includes(stadt)) { bericht.fehler.push('Unbekannte Stadt: ' + stadt); continue; }
      const pins = await page.evaluate((s) => { window.spiel.stadt(s); return window.spiel.hauspinListe(); }, stadt);
      const e = { stadt, haeuser: pins.length, buchstaben: 0, fehler: [] };
      for (const p of pins) {
        for (const halb of halbe) {
          await page.evaluate(({ p, halb }) => window.spiel.kamera({ x: p.dach.x, z: p.dach.z, halb }), { p, halb });
          await page.waitForFunction(() => window.kachelnRuhig !== false, null, { timeout: 0, polling: 100 });
          const r = await page.evaluate(({ id, halb }) => window.spiel.pruefeSchriftzug(id, halb), { id: p.hausId, halb });
          e.buchstaben += r.buchstaben;
          for (const f of r.fehler) e.fehler.push('Schriftzug (Zoom ' + halb + ') ' + f);
        }
      }
      const pinPruefung = await page.evaluate(() => { window.spiel.kamera({ halb: 60 }); return window.spiel.pruefeHauspins(); });
      for (const f of pinPruefung.fehler) e.fehler.push('Pin ' + f);
      bericht.staedte.push(e);
      for (const f of e.fehler) { bericht.fehler.push(stadt + ': ' + f); console.error('Q36-Verstoß: ' + stadt + ': ' + f); }
      console.log(stadt + ';' + e.haeuser + ' Häuser;' + e.buchstaben + ' Buchstaben;' + e.fehler.length + ' Verstöße');
    }
  } finally { await browser.close(); }
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'out', 'q36-pruefung' + (args.find((a) => a.startsWith('--teil='))?.slice(7).replace('/', '-von-') ?? '') + '.json'), JSON.stringify(bericht, null, 2));
  console.log('Q36: ' + bericht.staedte.length + ' Städte, ' + bericht.fehler.length + ' Verstöße, ' + Math.round((Date.now() - t0) / 1000) + ' s');
  if (bericht.fehler.length) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exitCode = 1; });

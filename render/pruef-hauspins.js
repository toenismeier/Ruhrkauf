// Q22-Abnahme: 10 Städte, alle fünf Hausformate, realer Abstand in iPhone-Pixeln.
// Aufruf: cd render && node pruef-hauspins.js
// Claude führt den Lauf und die Bildprüfung lokal aus; nicht durch CI push-getriggert.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  execFileSync('node', ['spiel-render.js', '--bundle'], { cwd: __dirname, stdio: 'inherit' });
  const verzeichnis = path.join(__dirname, 'out');
  fs.mkdirSync(verzeichnis, { recursive: true });
  const optionen = { headless: true, args: ['--headless=new', '--use-gl=angle',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROMIUM_PATH) optionen.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(optionen);
  const bericht = { bildgroesse: '390 × 844', grenzePx: 8, staedte: [], fehler: [], bilder: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    page.on('pageerror', (e) => bericht.fehler.push('Browser: ' + e.message));
    const url = 'file://' + path.join(__dirname, 'spiel.html') + '?stadt=Berlin&seed=1&leben=aus&ohne-animation=1';
    await page.goto(url, { waitUntil: 'load', timeout: 0 });
    await page.waitForFunction(() => window.bereit === true, null, { timeout: 0 });
    const vorhanden = await page.evaluate(() =>
      [...document.querySelectorAll('#stadtwahl option')].map((e) => e.value));
    const bevorzugt = ['Berlin', 'München', 'Hamburg', 'Düsseldorf', 'Essen',
      'Frankfurt', 'Köln', 'Leipzig', 'Hannover', 'Dortmund'];
    const staedte = [...new Set([...bevorzugt.filter((s) => vorhanden.includes(s)), ...vorhanden])].slice(0, 10);
    if (!staedte.includes('Berlin') || !staedte.includes('München') || staedte.length !== 10) {
      throw new Error('Berlin, München oder insgesamt zehn Städte fehlen in der Auswahlliste.');
    }
    for (const stadt of staedte) {
      const werte = await page.evaluate((s) => {
        window.spiel.stadt(s);
        // Die Abnahme nutzt die Spielkamera, nicht eine künstliche Testszenen-Projektion.
        window.spiel.kamera({ halb: 60 });
        return window.spiel.pruefeHauspins();
      }, stadt);
      bericht.staedte.push(werte);
      for (const f of werte.fehler) bericht.fehler.push(stadt + ': ' + f);
      if (werte.maxAbstandPx > 8) bericht.fehler.push(stadt + ': Abstand ' + werte.maxAbstandPx + ' px');
      // Zweite Projektion mit fernem Zoom: Pin muss auf dem Dach bleiben.
      const fern = await page.evaluate(() => {
        window.spiel.kamera({ halb: 220 });
        return window.spiel.pruefeHauspins();
      });
      for (const f of fern.fehler) bericht.fehler.push(stadt + ' (fern): ' + f);
      if (fern.maxAbstandPx > 8) bericht.fehler.push(stadt + ': Fernabstand ' + fern.maxAbstandPx + ' px');
      if (['Berlin', 'München'].includes(stadt)) {
        await page.evaluate(() => {
          const p = window.spiel.hauspinListe().find((x) => x.format === 'premium')
            ?? window.spiel.hauspinListe()[0];
          if (p) window.spiel.kamera({ x: p.dach.x, z: p.dach.z, halb: 55 });
          window.spiel.jetztZeichnen();
        });
        await page.screenshot({ path: path.join(verzeichnis, 'q22-' +
          (stadt === 'München' ? 'muenchen' : 'berlin') + '-iphone.png') });
        bericht.bilder.push('q22-' + (stadt === 'München' ? 'muenchen' : 'berlin') + '-iphone.png');
      }
    }
    if (bericht.staedte.some((s) => s.geprueft === 0)) bericht.fehler.push('Mindestens eine Stadt ohne geprüfte Häuser');
    fs.writeFileSync(path.join(verzeichnis, 'q22-hauspins-pruefung.json'), JSON.stringify(bericht, null, 2));
    console.log(JSON.stringify({ staedte: bericht.staedte.length,
      haeuser: bericht.staedte.reduce((n, s) => n + s.geprueft, 0),
      maxAbstandPx: Math.max(...bericht.staedte.map((s) => s.maxAbstandPx)), fehler: bericht.fehler }, null, 2));
    if (bericht.fehler.length) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });

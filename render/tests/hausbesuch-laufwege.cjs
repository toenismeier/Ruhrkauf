// Q12: reale Ladenbau-Belegung je Etage 60 Sekunden ohne Rendering im Zeitraffer prüfen.
// Claude: cd render && npm ci && npm run build && node tests/hausbesuch-laufwege.cjs
// Bildfolge unter bilder/nice/hausbesuch/laufwege/; Browser-Emulation ist kein iPhone-FPS-Test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const ausgabe = path.resolve(root, '..', 'bilder', 'nice', 'hausbesuch', 'laufwege');
const bericht = { referenzen: ['testflight/wurf-2/01-hausbesuch-essen.png',
  'testflight/wurf-2/17-hausbesuch-video-bildfolge.png'], etagen: [], bildfolge: [],
  hinweise: ['Simulation mit der tatsächlich gebauten Etage, keine fiktive Möbelverteilung.',
    'Gemessenes Kundentempo zählt nur Gehzeiten; Stöbern und Kassenschlange sind gesonderte Pausen.',
    'Browser-FPS sind nicht mit iPhone-Safari-FPS gleichzusetzen.'] };
(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    fs.mkdirSync(ausgabe, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 },
      hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    await page.goto('file://' + path.join(root, 'spiel.html') +
      '?stadt=Essen&seed=1&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
    await page.waitForFunction(() => window.bereit === true, null, { timeout: 0 });
    const haeuser = await page.evaluate(() => {
      const offen = window.spiel.s.haeuser.filter(h => h.status === 'offen');
      const hartwig = offen.find(h => h.format === 'warenhaus' && h.lage === '1a' &&
        h.etagen.length >= 2) ?? offen.find(h => h.format === 'warenhaus');
      const sport = offen.find(h => h.format === 'sport');
      if (!hartwig || !sport) throw Error('Hartwig- oder Sporthaus nicht vorhanden');
      return [{ id: hartwig.id, stadt: hartwig.stadt, etagen: hartwig.etagen, typ: 'hartwig' },
        { id: sport.id, stadt: sport.stadt, etagen: sport.etagen, typ: 'sport' },
        { id: 'O001', stadt: 'Essen', etagen: [0], typ: 'fundus' }];
    });
    for (const haus of haeuser) {
      const ok = await page.evaluate(({ id, stadt }) => {
        const sp = window.spiel;
        sp.hausbesuch.schliesse();
        sp.stadt(stadt);
        return sp.oeffneHausbesuch(id);
      }, haus);
      assert.ok(ok, 'Hausbesuch nicht geöffnet: ' + haus.id);
      for (const etage of [...haus.etagen].sort((a, b) => a - b)) {
        const start = Date.now();
        const wert = await page.evaluate(n => {
          window.spiel.hausbesuch.etage(n);
          return window.spiel.hausbesuch.pruefung(60, 0.05);
        }, etage);
        wert.aufbauUndSimulationMs = Date.now() - start;
        assert.equal(wert.kollisionen, 0, 'Kollision im Haus ' + haus.id + ' Etage ' + etage);
        if (wert.kunden > 0) {
          assert.ok(wert.kundenMeter > 0, 'Kunden laufen nicht: ' + haus.id + '/' + etage);
          assert.ok(wert.kundentempo >= 0.8 && wert.kundentempo <= 1.4,
            'Geschwindigkeit außerhalb 0,8–1,4 m/s: ' + haus.id + '/' + etage +
            ' = ' + wert.kundentempo);
        }
        bericht.etagen.push({ typ: haus.typ, ...wert });
        // Drei aufeinanderfolgende Situationen derselben Etage: echte Wegsuche statt Punkt-Interpolation.
        if (etage === [...haus.etagen].sort((a, b) => a - b)[0]) {
          for (const sekunde of [0, 5, 10]) {
            if (sekunde) await page.evaluate(() => window.spiel.hausbesuch.bildschritt(5));
            const datei = haus.typ + '-' + haus.id + '-t' + String(sekunde).padStart(2, '0') + '.png';
            await page.locator('.hb:not([hidden])').screenshot({ path: path.join(ausgabe, datei) });
            bericht.bildfolge.push(path.relative(root, path.join(ausgabe, datei)));
          }
          // Zeitschritt-Konsistenz: dieselbe 30-Sekunden-Simulation bei 30 und 120 fps.
          const vergleich = await page.evaluate(() => ({
            fps30: window.spiel.hausbesuch.pruefung(30, 1 / 30),
            fps120: window.spiel.hausbesuch.pruefung(30, 1 / 120)
          }));
          const basis = Math.max(1, vergleich.fps30.kundenMeter);
          assert.ok(Math.abs(vergleich.fps30.kundenMeter - vergleich.fps120.kundenMeter) / basis < 0.02,
            'Wegstrecke hängt von der Bildrate ab: ' + haus.id);
          bericht.etagen[bericht.etagen.length - 1].bildratenVergleich = {
            fps30: vergleich.fps30.kundenMeter, fps120: vergleich.fps120.kundenMeter };
        }
      }
      await page.waitForTimeout(1000);
      bericht.etagen[bericht.etagen.length - 1].browserMessung =
        await page.evaluate(() => window.spiel.hausbesuch.messung());
    }
    assert.deepEqual(fehler, [], 'Browserfehler');
    fs.writeFileSync(path.join(ausgabe, 'abnahme.json'), JSON.stringify(bericht, null, 2) + '\n');
    console.log('Q12: ' + bericht.etagen.length + ' Etagen, 60 Sekunden je Etage; ' +
      bericht.bildfolge.length + ' Bildfolge-Screenshots.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

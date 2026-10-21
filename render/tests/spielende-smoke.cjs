// N02-Abnahme: vier Endszenen, Bilanz, No-Action-Zerschlagung und Anzeigenvergleich.
// Vorher: npm run build. Chromium optional über CHROMIUM_PATH.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const ziel = path.join(root, '..', 'bilder', 'nice', 'spielende');
(async () => {
  const opts = {
    headless: true, args: ['--headless=new','--use-gl=angle','--use-angle=swiftshader',
      '--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--js-flags=--max-old-space-size=6144'],
  };
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(opts);
  try {
    fs.mkdirSync(ziel, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const url = 'file://' + path.join(root, 'spiel.html') + '?stadt=Essen&seed=1&ohne-animation=1&testspiel';
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.bereit === true && window.spiel?.s?.haeuser?.length > 0);
    for(const art of ['zerschlagen','saniert','investor','ruhestand']) {
      const gezeigt = await page.evaluate((art) => {
        const api = window.spiel, s = api.s;
        api.spielende.zu();
        s.ende = undefined;
        s.phase = art === 'zerschlagen' ? 'zerschlagen' : 'regulaer';
        s.woche = 260;
        api.E.spielBeenden(s, art, art === 'investor' ? 'Rheingold Beteiligungen' : undefined);
        return api.zeigeSpielende() && api.spielende.pruefe().art === art;
      }, art);
      assert.ok(gezeigt, 'Endszene ' + art + ' nicht sichtbar');
      await page.screenshot({ path: path.join(ziel, art + '.png') });
      await page.locator('[data-se="bilanz"]').click();
      assert.equal(await page.locator('.se-bilanz').count(), 1, 'Bilanz nach ' + art);
      if (art === 'zerschlagen') await page.screenshot({ path: path.join(ziel, 'bilanz.png') });
      const weiter = await page.locator('[data-se="weiter"]').count();
      assert.equal(Boolean(weiter), art === 'saniert' || art === 'ruhestand', 'Weiterspielen ' + art);
    }

    // Echter Eingriffs-freier Spielablauf, keine injizierte Zerschlagungsphase.
    const ohneEingriff = await page.evaluate(async () => {
      const api = window.spiel;
      const s = api.neuesSpiel(1, 'Essen');
      for(let i=0; i<104 && !s.ende && s.phase !== 'zerschlagen'; i++) api.woche(false);
      await new Promise(resolve => setTimeout(resolve, 50));
      return { phase: s.phase, ende: s.ende?.art, woche: s.woche,
        sichtbar: api.spielende.pruefe().sichtbar, abweichungen: api.pruefeAnzeigen().fehler };
    });
    assert.equal(ohneEingriff.phase, 'zerschlagen', 'No-Action endet vor Woche 104');
    assert.equal(ohneEingriff.ende, 'zerschlagen', 'Ende korrekt gespeichert');
    assert.equal(ohneEingriff.sichtbar, true, 'Endszene aus der Simulation sichtbar');
    assert.deepEqual(ohneEingriff.abweichungen, [], '0 Cockpit-Abweichungen');
    assert.deepEqual(errors, [], '0 Browserfehler');
    console.log('N02: 4 Endszenen, Bilanz, No-Action-Zerschlagung, 0 Abweichungen. Bilder: ' + ziel);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });

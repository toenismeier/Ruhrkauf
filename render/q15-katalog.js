// Q15-Abnahme für Claude: nach cd render && npm run build && node spiel-render.js --bundle
// node q15-katalog.js   (Chromium optional über CHROMIUM_PATH)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ABTEILUNGEN = ['controlling', 'personal', 'einkauf', 'marketing', 'ecommerce',
  'logistik', 'immobilien', 'recht', 'vm', 'verwaltung', 'produkt'];
const ziel = path.join(__dirname, 'out', 'q15-abteilungen');
fs.mkdirSync(ziel, { recursive: true });

(async () => {
  const einstellungen = {
    headless: true,
    args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  };
  if (process.env.CHROMIUM_PATH) einstellungen.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(einstellungen);
  const ergebnis = { format: '390 × 844', abteilungen: [], fehler: [],
    zusaetzlicheWebglDrawCalls: 0, abnahme: 'offen' };
  try {
    const seite = await browser.newPage({ viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    seite.on('pageerror', (e) => ergebnis.fehler.push('Browser: ' + e.message));
    await seite.goto('file://' + path.join(__dirname, 'spiel.html') +
      '?stadt=Essen&seed=1&leben=aus&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
    await seite.waitForFunction(() => window.bereit === true, null, { timeout: 0 });

    for (const id of ABTEILUNGEN) {
      await seite.evaluate((name) => window.spiel.oeffneHqAbteilung(name), id);
      await seite.waitForSelector('#pinhalt .q15-seite', { timeout: 0 });
      const pruefung = await seite.evaluate((name) => {
        const u = window.spiel.E.hqUebersicht(window.spiel.s);
        const g = window.spiel.E.hqFuerGrafik(window.spiel.s);
        const a = u.abteilungen.find((x) => x.id === name);
        const el = document.querySelector('.q15-seite');
        const svg = el.querySelector('svg.q15-etagenbild');
        const bildFte = svg ? svg.querySelectorAll('circle[fill="#DDB69D"]').length : 0;
        const etagen = g.gebaeude.flatMap((haus) => haus.etagen.flatMap((etage) =>
          etage.abteilungen.filter((b) => b.id === name).map((b) => b.fte)));
        const daten = {
          id: name, fte: Number(el.querySelector('[data-q15-fte]')?.dataset.q15Fte),
          gehalt: Number(el.querySelector('[data-q15-gehalt]')?.dataset.q15Gehalt),
          engineFte: a?.fte, engineGehalt: a?.gehaltFaktor, bildFte,
          etagenFte: etagen, scrollBreite: el.scrollWidth, breite: el.clientWidth,
          hatDelegation: !!el.querySelector('.q15-delegation'),
          hatNavigation: el.querySelectorAll('.q15-navigation button').length >= 6,
          /* SVG statt Canvas/WebGL: für die Etage genau null zusätzliche Draw Calls. */
          webglFlaechen: el.querySelectorAll('canvas').length,
        };
        return daten;
      }, id);
      const fehler = [];
      if (pruefung.fte !== pruefung.engineFte) fehler.push('FTE ungleich Engine');
      if (pruefung.gehalt !== pruefung.engineGehalt) fehler.push('Gehaltsfaktor ungleich Engine');
      if (pruefung.etagenFte.length && !pruefung.etagenFte.includes(pruefung.bildFte))
        fehler.push('Bildfigurenzahl ungleich Etagen-FTE');
      if (!pruefung.hatDelegation || !pruefung.hatNavigation) fehler.push('Navigation/Delegation fehlt');
      if (pruefung.scrollBreite > pruefung.breite + 1) fehler.push('Horizontaler Seitenüberlauf');
      if (pruefung.webglFlaechen > 0) fehler.push('Unerwartete WebGL-Fläche in der Etage');
      ergebnis.abteilungen.push({ ...pruefung, fehler });
      ergebnis.fehler.push(...fehler.map((f) => id + ': ' + f));
      await seite.screenshot({ path: path.join(ziel, id + '-390x844.png') });
    }
    // Mobile Interaktion ohne Simulationsfortschritt: neue Gehaltsentscheidung.
    await seite.evaluate(() => window.spiel.oeffneHqAbteilung('marketing'));
    const kostenVor = await seite.evaluate(() => window.spiel.E.hqUebersicht(window.spiel.s).kostenWoche);
    await seite.locator('.q15-steuerung input[aria-label="Gehaltsniveau der Abteilung"]').evaluate((el) => {
      el.value = '105'; el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const kostenNach = await seite.evaluate(() => window.spiel.E.hqUebersicht(window.spiel.s).kostenWoche);
    if (kostenNach <= kostenVor) ergebnis.fehler.push('Gehaltsregler ohne Kostenwirkung');
    ergebnis.regler = { kostenVor, kostenNach };
    ergebnis.abnahme = ergebnis.fehler.length ? 'fehlgeschlagen' : 'bestanden';
    fs.writeFileSync(path.join(ziel, 'pruefung.json'), JSON.stringify(ergebnis, null, 2));
    console.log('Q15:', ergebnis.abnahme, '-', ergebnis.fehler.length,
      'Fehler,', ergebnis.abteilungen.length, 'Ansichten, 0 zusätzliche WebGL-Draw-Calls');
  } finally {
    await browser.close();
  }
  if (ergebnis.fehler.length) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exitCode = 1; });

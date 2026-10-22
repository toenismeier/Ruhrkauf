// Q20: Bildabnahme der Startbildschirm-Karten für alle sieben Szenarien.
// Vorbereitung: cd render && npm run build
// Aufruf: node start-szenarien-katalog.js
// Erzeugt out/q20-start-<id>.png und out/q20-start-katalog.json.
// Ein Browserlauf ist Voraussetzung; dieser Auftrag führt ihn nicht selbst aus.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const ziel = path.join(__dirname, 'out');
  fs.mkdirSync(ziel, { recursive: true });
  const optionen = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
  if (process.env.CHROMIUM_PATH) optionen.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(optionen);
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 1050 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const datei = 'file://' + path.join(__dirname, 'spiel.html') + '?ohne-animation=1';
    await page.goto(datei, { waitUntil: 'load' });
    await page.waitForFunction(() => window.spiel?.E?.schwierigkeitenFuerSzenario && document.querySelectorAll('.sz-karte').length === 7);
    const ids = await page.evaluate(() => window.spiel.E.SZENARIEN.map((s) => s.id));
    const alleTexte = new Set();
    const bericht = [];
    for (const id of ids) {
      await page.locator('[data-szenario="' + id + '"]').click();
      const ergebnis = await page.evaluate((szenario) => {
        const stufen = window.spiel.E.schwierigkeitenFuerSzenario(szenario);
        return {
          id: szenario,
          sichtbar: document.querySelector('#startsetup') && !document.querySelector('#startsetup').hidden,
          karten: [...document.querySelectorAll('#startstufen .stufe-karte')].map((k) => ({
            stufe: k.dataset.v,
            text: k.querySelector('small')?.textContent,
          })),
          versteckt: document.getElementById('startstufen').hidden,
          soll: stufen.map((k) => ({ stufe: k.id, text: k.beschreibung })),
        };
      }, id);
      assert.equal(ergebnis.sichtbar, true, id + ': Einstellungen fehlen');
      assert.deepEqual(ergebnis.karten, ergebnis.soll, id + ': UI weicht von Engine ab');
      assert.equal(ergebnis.versteckt, id === 'sandkasten', id + ': falsche Sichtbarkeit');
      for (const karte of ergebnis.karten) {
        assert.ok(!alleTexte.has(karte.text), id + ': doppelter Stufentext');
        alleTexte.add(karte.text);
      }
      await page.locator('.startkarte').screenshot({ path: path.join(ziel, 'q20-start-' + id + '.png') });
      bericht.push({ szenario: id, karten: ergebnis.karten.length, bild: 'q20-start-' + id + '.png' });
      await page.locator('#szenario-zurueck').click();
    }
    assert.equal(alleTexte.size, 18, 'Erwartet werden 18 unterschiedliche Stufentexte');
    fs.writeFileSync(path.join(ziel, 'q20-start-katalog.json'), JSON.stringify(bericht, null, 2));
    console.log('Q20 Startbildschirm: sieben Szenarien, 18 eindeutige Stufentexte und sieben Katalogbilder');
  } finally {
    await browser.close();
  }
}
main().catch((err) => { console.error(err); process.exitCode = 1; });

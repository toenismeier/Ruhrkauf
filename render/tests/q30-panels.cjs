// Q30: Aufnahme aller Spiel-Panels bei 390 × 844 plus Stilprüfung (verbotene Muster).
// Aufruf: node tests/q30-panels.cjs [--ordner out/q30/nachher] [--nur haus,posteingang] [--alle] [--streng]
// Bündelt nicht selbst: vorher `node spiel-render.js --bundle`.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PANELS } = require('./q30-panelliste.cjs');
const { panelLauf } = require('./q30-stil.cjs');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const ordner = path.resolve(__dirname, '..', arg('--ordner', 'out/q30/nachher'));
const nur = arg('--nur', '') ? arg('--nur', '').split(',') : null;

(async () => {
  const opt = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=6144'] };
  if (process.env.CHROMIUM_PATH) opt.executablePath = process.env.CHROMIUM_PATH;
  const b = await chromium.launch(opt);
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const fehlerSeite = [];
  p.on('pageerror', (e) => { fehlerSeite.push(e.message); console.log('FEHLER', e.message); });
  await p.goto('file://' + path.join(__dirname, '..', 'spiel.html') + '?stadt=Essen&seed=1&leben=aus&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
  await p.waitForFunction('window.bereit === true', null, { timeout: 0, polling: 500 });
  const ergebnis = await panelLauf(p, PANELS, { ordner, nur, alle: process.argv.includes('--alle') });
  fs.writeFileSync(path.join(ordner, 'ergebnis.json'), JSON.stringify({ ergebnis, fehlerSeite }, null, 1));
  await b.close();
  const schlecht = ergebnis.filter((e) => e.fehler || e.verstoesse?.length).length + fehlerSeite.length;
  console.log(schlecht ? `${schlecht} Befunde` : 'alle Panels ohne Befund');
  if (process.argv.includes('--streng') && schlecht) process.exit(1);
})();

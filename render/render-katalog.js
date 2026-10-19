// Aufruf: node render-katalog.js <modul> [ausgabe.png]   (kein Zeitlimit; Kacheln werden einzeln gerendert und freigegeben)
// Bündelt src/kataloge/<modul>.js, rendert headless und speichert das Katalogblatt.
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
(async () => {
  const modul = process.argv[2];
  const aus = process.argv[3] ?? path.join(__dirname, 'out', `katalog-${modul}.png`);
  const bundle = path.join(__dirname, 'out', `.bundle-${modul}.js`);
  fs.mkdirSync(path.dirname(aus), { recursive: true });
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  await esbuild.build({ entryPoints: [path.join(__dirname, 'src', 'kataloge', `${modul}.js`)], bundle: true, outfile: bundle, loader: { '.json': 'json' }, logLevel: 'error' });
  const html = path.join(__dirname, 'out', `.seite-${modul}.html`);
  fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><script src="${path.basename(bundle)}"></script></body></html>`);
  const browserOptionen = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=6144'] };
  if (process.env.CHROMIUM_PATH) browserOptionen.executablePath = process.env.CHROMIUM_PATH;
  const b = await chromium.launch(browserOptionen);
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('FEHLER', e.message));
  p.on('console', (m) => { if (m.text().startsWith('LEER')) console.log(m.text()); });
  await p.goto('file://' + html, { waitUntil: 'commit', timeout: 0 });
  await p.waitForFunction('window.fertig === true', null, { timeout: 0, polling: 2000 });
  const fehler = await p.evaluate('window.fehler');
  const daten = await p.evaluate('window.bild');
  fs.writeFileSync(aus, Buffer.from(daten.split(',')[1], 'base64'));
  await b.close();
  if (fehler.length) throw new Error('Katalogfehler: ' + fehler.join(' | '));
  console.log('gespeichert:', aus);
})();

// E53 Etappe 1: Bilder der Organisationsseite (Konzern nach Formaten, Format, Region, Formatleitung) bei 390 × 844.
// Aufruf: node tests/e53-formate-bilder.cjs [Zielordner]  (vorher: node spiel-render.js --bundle)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const ordner = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'bilder', 'formate'));
fs.mkdirSync(ordner, { recursive: true });
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 2400 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'spiel.html') + '?stadt=Essen&seed=1&leben=aus&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
  await p.waitForFunction('window.bereit === true', null, { timeout: 0, polling: 500 });
  await p.addStyleTag({ content: '#panel, #panel.gross { max-height: none !important; }' });
  const bild = async (name) => { await p.waitForTimeout(400); await (await p.$('#panel')).screenshot({ path: path.join(ordner, name + '.png') }); };
  await p.evaluate(() => window.spiel.oeffneOrganisation('vertrieb')); await bild('formate-1-konzern');
  for (const f of ['volkskauf', 'premium']) { await p.evaluate((f) => window.spiel.oeffneOrganisation('vertrieb', f), f); await bild('formate-2-' + f); }
  await p.evaluate(() => window.spiel.oeffneOrganisation('vertrieb', 'volkskauf'));
  await p.click('[data-org="profil"][data-ebene="format"]'); await bild('formate-3-formatleitung');
  const pr = await p.evaluate(() => window.spiel.organisation.pruefe());
  console.log(JSON.stringify(pr), fehler.length ? 'Seitenfehler: ' + fehler.join(' | ') : 'ohne Seitenfehler');
  await b.close();
  if (fehler.length) process.exit(1);
})();

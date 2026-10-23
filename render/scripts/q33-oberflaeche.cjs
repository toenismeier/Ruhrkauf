// Q33: Bildschirmbilder „Neues Produkt“ für Pünktchen (Reiter Kinder: Kinder und Teens & Tweens) und den Sortimentskatalog Teens.
// Aufruf: cd render && node scripts/q33-oberflaeche.cjs   (vorher node spiel-render.js --bundle)
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], executablePath: process.env.CHROMIUM_PATH });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  p.on('pageerror', (e) => console.log('FEHLER', e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'spiel.html') + '?stadt=Essen&seed=1&leben=aus&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
  await p.waitForFunction('window.bereit === true', null, { timeout: 0, polling: 500 });
  const tippe = async (sel) => { const ok = await p.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; e.scrollIntoView({ block: 'center' }); e.click(); return true; }, sel); if (!ok) console.log('FEHLT', sel); await p.waitForTimeout(300); };
  const bild = async (name) => { await p.waitForTimeout(400); await p.screenshot({ path: path.join(__dirname, '..', 'out', name) }); console.log('gespeichert', name); };
  await tippe('#produkte');
  await tippe('[data-a=marke][data-v="em4"]');
  await tippe('[data-a=neu]');
  await tippe('[data-a=q24Fach][data-v="kinder"]');
  const chips = await p.$$eval('[data-a=q24Ziel]', (l) => l.map((e) => e.textContent));
  console.log('Chips unter Kinder:', chips.join(', '));
  await tippe('[data-a=q24Ziel][data-v="teens"]');
  console.log(await p.$eval('.q24-anzahl', (e) => e.textContent));
  await tippe('[data-a=baumKat]');
  await bild('q33-neu-teens.png');
  await tippe('[data-a=q24Ziel][data-v="kinder"]');
  console.log(await p.$eval('.q24-anzahl', (e) => e.textContent));
  const kats = await p.$$eval('[data-a=baumKat]', (l) => l.map((e) => e.textContent.replace(/[+−]/g, '').trim()));
  console.log('Äste Kinder:', kats.join(' | '));
  await tippe('[data-a=baumKat][data-v="kinder"]');
  await bild('q33-neu-kinder.png');
  await b.close();
})();

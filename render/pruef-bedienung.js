// N13: prüft die tatsächlich sichtbaren Bedienfelder und erzeugt Abnahmebilder.
// Aufruf: cd render && node pruef-bedienung.js
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function pruefen() {
  execFileSync(process.execPath, ['spiel-render.js', '--bundle'], { cwd: __dirname, stdio: 'inherit' });
  const ziel = path.resolve(__dirname, '../bilder/nice/einstellungen');
  fs.mkdirSync(ziel, { recursive: true });
  const opts = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(opts);
  const fehler = [];
  let kontrolliert = 0;
  const pruefe = async (page, seite) => {
    const a = await page.evaluate(() => {
      const sichtbar = (el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return false;
        for (let p = el; p && p.nodeType === 1; p = p.parentElement) {
          const css = getComputedStyle(p);
          if (css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) === 0 || p.hidden) return false;
        }
        return true;
      };
      return [...document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')]
        .filter(sichtbar).map((b) => {
          const r = b.getBoundingClientRect();
          return { id: b.id || b.outerHTML.slice(0, 120), label: b.getAttribute('aria-label') || '',
            breite: Math.round(r.width * 10) / 10, hoehe: Math.round(r.height * 10) / 10 };
        });
    });
    kontrolliert += a.length;
    for (const b of a) {
      if (!b.label.trim()) fehler.push(seite + ': ohne Beschriftung: ' + b.id);
      if (b.breite < 43.9 || b.hoehe < 43.9) fehler.push(seite + ': unter 44 px (' + b.breite + ' × ' + b.hoehe + '): ' + b.id);
    }
    console.log(seite + ': ' + a.length + ' sichtbare Knöpfe');
  };
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const seitenfehler = [];
    page.on('pageerror', (e) => seitenfehler.push(e.message));
    await page.goto('file://' + path.join(__dirname, 'spiel.html') + '?stadt=Essen&seed=1&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
    await page.waitForFunction(() => window.bereit === true, { timeout: 120000 });
    await pruefe(page, 'Cockpit');
    await page.locator('#menueknopf').click();
    await pruefe(page, 'Menü');
    for (const id of ['posteingang', 'hq', 'einkauf', 'vorstand', 'marketing', 'produkte', 'einstellungen']) {
      await page.locator('#menueknopf').click().catch(() => {}); // offene Menüs bleiben offen
      if (!(await page.locator('#menue').evaluate((m) => m.classList.contains('offen')))) await page.locator('#menueknopf').click();
      await page.locator('#' + id).click();
      await pruefe(page, 'Panel ' + id);
      await page.locator('#pzu').click();
    }
    await page.evaluate(() => window.spiel.oeffneEinstellungen());
    for (const [wert, name] of [['klein', 'klein'], ['normal', 'normal'], ['gross', 'gross']]) {
      await page.locator('[data-einstellung="schrift"]').selectOption(wert);
      await pruefe(page, 'Einstellungen ' + name);
      await page.screenshot({ path: path.join(ziel, 'einstellungen-' + name + '.png'), animations: 'disabled' });
    }
    await page.locator('[data-einstellung="schrift"]').selectOption('normal');
    await page.locator('[data-einstellung="farbschwaeche"]').check();
    await page.locator('#pzu').click();
    await pruefe(page, 'Cockpit Farbschwäche');
    await page.screenshot({ path: path.join(ziel, 'cockpit-farbschwaeche.png'), animations: 'disabled' });
    await page.locator('#weiter').click();
    await pruefe(page, 'Wochenabschluss');
    if (await page.locator('[data-wa="nein"]').count()) await page.locator('[data-wa="nein"]').click();
    fehler.push(...seitenfehler.map((x) => 'Browser: ' + x));
  } finally { await browser.close(); }
  console.log('Prüfprotokoll: ' + kontrolliert + ' sichtbare Knöpfe, ' + fehler.length + ' Funde.');
  for (const f of fehler) console.error('FEHLER:', f);
  if (fehler.length) process.exitCode = 1;
}
pruefen().catch((e) => { console.error(e); process.exitCode = 1; });

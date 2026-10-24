// Q19 – iPhone-Abnahme (390 × 844) und echter Produktkarten-Katalog.
// Nur Claude führt aus: cd render && node tests/q19-it-produkte-bilder.cjs
// Screenshots in bilder/wurf2/it-produkte; keine Bilddateien von GPT erzeugen.
const { chromium } = require('playwright');
const { spawnSync } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const root = path.resolve(__dirname, '..');
  const ziel = path.resolve(root, '..', 'bilder', 'wurf2', 'it-produkte');
  mkdirSync(ziel, { recursive: true });
  const build = spawnSync(process.execPath, ['spiel-render.js', '--bundle'], { cwd: root, stdio: 'inherit' });
  assert.equal(build.status, 0, 'Der Spiel-Build muss fehlerfrei sein.');
  const opts = { headless: true,
    args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) };
  const browser = await chromium.launch(opts);
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.join(root, 'spiel.html') + '?stadt=Essen&seed=1&ohne-animation=1');
    await page.waitForFunction(() => window.bereit === true, null, { timeout: 120000 });
    const bild = async name => {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: path.join(ziel, name+'.png'), timeout:120000 });
    };
    const pruefeLayout = async () => {
      const result = await page.evaluate(() => {
        const root = document.getElementById('pinhalt');
        const felder = [...root.querySelectorAll('.hw-g3-produkt,.hw-g3-version,.hw-knopf,.hw-g3-vorstellung')];
        const panel = root.getBoundingClientRect();
        return { ueberlauf:feldernRechts(), seitenbreite:panel.width,
          fragwuerdig:/\b(undefined|null|hc-\d+)\b/i.test(root.textContent),
          knoepfe:[...root.querySelectorAll('.hw-knopf:not([disabled])')].filter(b=>b.getBoundingClientRect().height<44).length };
        function feldernRechts() { return felder.filter(e=>{
          const box=e.getBoundingClientRect();
          // E47: Karten im Karussell schauen gewollt seitlich heraus; dort zählt nur, dass die Karte in ihren Rahmen passt.
          const karte=e.closest('.hw-karte');
          if(karte) return e.scrollWidth>karte.clientWidth+1;
          return box.right>panel.right+1 || box.left<panel.left-1;
        }).map(e=>e.className); }
      });
      assert.deepEqual(result.ueberlauf, [], 'Produktkarten überlaufen den iPhone-Bildschirm');
      assert.equal(result.fragwuerdig,false,'UI zeigt rohe technische Bezeichnungen');
      assert.equal(result.knoepfe,0,'Touch-Ziele sind kleiner als 44 px');
    };
    await page.evaluate(() => window.spiel.oeffneIt('produkte'));
    await page.locator('[data-it="produkt"]').first().waitFor();
    assert.equal(await page.locator('[data-it="produkt"]').count(),4);
    await bild('01-it-produktuebersicht');
    await pruefeLayout();
    // Echte Wochenabschlüsse, keine für den Katalog erfundenen Kennzahlen.
    for(let i=0;i<6;i++) await page.evaluate(() => window.spiel.woche(true));
    const ids = ['kundenkarte','hartwig_app','kasse','mobile_pay'];
    for(let i=0;i<ids.length;i++){
      await page.evaluate(id => window.spiel.oeffneIt('produkte',id),ids[i]);
      const title = await page.locator('.hw-g3-produkttitel').innerText();
      assert.ok(title.length>2, ids[i]+' ohne Produkttitel');
      assert.equal(await page.locator('.hw-g3-kurve .hw-balkenfuss span').count(),5,'5 Wochenpunkte müssen gezeigt werden');
      assert.equal(await page.locator('.hw-g3-version .hw-g3-sterne svg').count(),5,'Qualitätssterne fehlen');
      await pruefeLayout();
      await bild(String(i+2).padStart(2,'0')+'-'+ids[i]);
    }
    // Reale Teamsteuerung und Abschaltbestätigung (kein Fake-Schalter).
    await page.evaluate(() => window.spiel.oeffneIt('produkte','hartwig_app'));
    await page.locator('[data-it="team"][data-n="3"]').click();
    assert.match(await page.locator('[aria-label="Produktteam"] output').innerText(),/^3 Personen/);
    await page.locator('[data-it="abschalten"]').click();
    assert.equal(await page.locator('[data-it="aktiv"]').innerText(),'Abschalten bestätigen');
    await page.locator('[data-it="aktiv"]').click();
    assert.match(await page.locator('.hw-g3-version').innerText(),/Abgeschaltet/i);
    await page.locator('[data-it="aktiv"]').click();
    assert.match(await page.locator('.hw-g3-version').innerText(),/Aktiv/i);
    // O09: Einstieg aus E-Commerce öffnet die gleiche IT-Produktseite.
    await page.evaluate(() => window.spiel.oeffneEcommerce('produkte'));
    assert.equal(await page.locator('[data-online="produkt"]').count(),4);
    await page.locator('[data-online="produkt"][data-id="hartwig_app"]').click();
    assert.match(await page.locator('.hw-g3-produkttitel').innerText(),/Hartwig App/);
    assert.deepEqual(errors, [], 'Browserfehler');
    console.log('Q19: vier Produktseiten, fünf Wochenpunkte, Team, Abschalten und Online-Navigation geprüft. Bilder: '+ziel);
  } finally { await browser.close(); }
})().catch(err => { console.error('Q19-Abnahme fehlgeschlagen:',err);process.exitCode=1; });

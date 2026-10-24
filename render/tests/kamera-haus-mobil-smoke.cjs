// Q10: Drei reale Berührungen in Berlin, iPhone-Viewport, 2 Sekunden Kachel-Nachlauf.
// Der Test prüft den geometrischen Hausanker im sichtbaren Kartenstreifen, nicht bloß den K-Zustand.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.ttf': 'font/ttf', '.png': 'image/png', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/spiel.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end(error.message); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
});
const snapshot = () => {
  const m = window.spiel.kameraHaus();
  return { m, K: { x: window.spiel.K.x, z: window.spiel.K.z, halb: window.spiel.K.halb },
    offen: document.getElementById('panel').classList.contains('offen') };
};
(async () => {
  let browser;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const opts = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
    if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
    browser = await chromium.launch(opts);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.setDefaultTimeout(120000);
    await page.goto('http://127.0.0.1:' + server.address().port + '/spiel.html?stadt=Berlin&seed=1',
      { waitUntil: 'load' });
    await page.waitForFunction(() => window.bereit === true && window.spiel?.sb?.haeuser?.size >= 3);
    // G6: Seit die Stildateien mit text/css ausgeliefert werden, deckt die Einführungsfrage die Karte ab wie auf dem iPhone.
    if (await page.locator('[data-ein="spaeter"]').count()) await page.locator('[data-ein="spaeter"]').click();

    const ids = await page.evaluate(() => [...window.spiel.sb.haeuser.keys()].filter(id => {
      const x = window.spiel.sb.haeuser.get(id); return x?.p && x?.gruppe;
    }).slice(0, 3));
    assert.equal(ids.length, 3, 'Berlin benötigt mindestens drei klickbare Hartwig-Häuser');
    assert.equal(new Set(ids).size, 3, 'Drei verschiedene Häuser');
    for (const [i, id] of ids.entries()) {
      // Nur die Ausgangsposition herstellen. Die eigentliche Auswahl erfolgt per Touch-Event.
      const p = await page.evaluate(id => {
        const x = window.spiel.sb.haeuser.get(id);
        window.spiel.kamera({ x: x.p.x + x.p.w / 2, z: x.p.z + x.p.d / 2, halb: 38 });
        return window.spiel.tippPunkt(id);
      }, id);
      assert.ok(p, 'Haus ' + id + ' im mobilen Canvas antippbar');
      await page.touchscreen.tap(p.x, p.y);
      await page.waitForFunction(id => window.spiel.kameraHaus()?.id === id &&
        document.getElementById('panel').classList.contains('offen'), id);
      await page.waitForTimeout(2000); // asynchrones Nachladen mehrerer Stadtkacheln
      const a = await page.evaluate(snapshot);
      assert.ok(a.m?.abweichungPx <= 40, id + ': Kameraziel nach 2 Sekunden: ' + JSON.stringify(a.m));
      if (i === 0) {
        // Neuaufbaupfad und Aktualisierung der Hausdaten nach einer vollen Spielwoche.
        await page.evaluate(() => {
          window.spiel.woche(false);
          document.getElementById('pinhalt').scrollTop = 450;
          window.dispatchEvent(new Event('resize'));
        });
        await page.waitForTimeout(250);
        const nachWoche = await page.evaluate(snapshot);
        assert.equal(nachWoche.m?.id, id, 'Hausziel bleibt beim Wochenwechsel gebunden');
        assert.ok(nachWoche.m.abweichungPx <= 40, 'Kameramitte nach Woche/Scroll/Resize: ' + JSON.stringify(nachWoche.m));
      }
      const vorZu = await page.evaluate(snapshot);
      await page.locator('#pzu').click();
      const nachZu = await page.evaluate(snapshot);
      assert.equal(nachZu.offen, false, 'Hausdetail geschlossen');
      assert.equal(nachZu.m, null, 'Kamerabindung beim Schließen entfernt');
      assert.deepEqual(nachZu.K, vorZu.K, 'Kamera bleibt nach Schließen am zuletzt gewählten Haus');
    }
    assert.deepEqual(errors, [], 'Keine JavaScript-Laufzeitfehler');
    console.log('OK: Berlin, 3 Touch-Hauswahlen, je 2 s, <=40 px, Woche, Scroll, Resize, Schließen');
    await context.close();
  } catch (e) {
    console.error('Q10 Mobil-Smoketest FEHLER:', e);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})();

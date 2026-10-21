// Q04: bildbasierte Abnahme im iPhone-Profil 390 × 844.
// Baseline: Q04_SPIEL_ROOT=<absoluter Pfad zum main-Worktree>/render Q04_MODUS=vorher node tests/q04-mobile.cjs
// Feature:  Q04_MODUS=nachher node tests/q04-mobile.cjs
// Vorher erzeugt Vergleichsbilder ohne Korrektur-Assertions; nachher prüft die sieben Befunde.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.env.Q04_SPIEL_ROOT ?? path.resolve(__dirname, '..'));
const modus = process.env.Q04_MODUS === 'vorher' ? 'vorher' : 'nachher';
const ausgabe = path.resolve(__dirname, '..', 'out', 'q04', modus);
const nachher = modus === 'nachher';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const datei = path.resolve(root, '.' + (url === '/' ? '/spiel.html' : url));
  if (!datei.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(datei, (error, data) => {
    if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end(error.message); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(datei)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  });
});

(async () => {
  let browser;
  try {
    fs.mkdirSync(ausgabe, { recursive: true });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const start = 'http://127.0.0.1:' + server.address().port + '/spiel.html?ohne-animation';
    const optionen = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
    if (process.env.CHROMIUM_PATH) optionen.executablePath = process.env.CHROMIUM_PATH;
    browser = await chromium.launch(optionen);
    const kontext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const seite = await kontext.newPage();
    seite.setDefaultTimeout(120000);
    const fehler = [];
    seite.on('pageerror', e => fehler.push(e.message));
    await seite.goto(start, { waitUntil: 'load' });
    await seite.locator('#start.an').waitFor();
    await seite.locator('#startknopf').click();
    await seite.waitForFunction(() => window.bereit === true && window.spiel?.s?.haeuser?.length);
    const bild = async (name) => seite.screenshot({ path: path.join(ausgabe, name + '.png') });

    await bild('02-bot-stadtchip-essen');
    if (nachher) {
      assert.equal(await seite.locator('.botwahl').isVisible(), false, 'Bot darf im regulären Spiel nicht sichtbar sein');
    }
    await seite.evaluate(() => window.spiel.oeffneHaus('O001'));
    await bild('01-fundus-haus');
    if (nachher) {
      assert.match(await seite.locator('#ptitel').innerText(), /FUNDUS/);
      assert.match(await seite.locator('.haus-reiter').innerText(), /Sortiment/);
    }
    await seite.evaluate(() => window.spiel.oeffneHaus('K001'));
    await bild('01-volkskauf-haus');
    if (nachher) {
      assert.match(await seite.locator('#punter').innerText(), /Volkskauf/);
      assert.match(await seite.locator('.haus-reiter').innerText(), /Etagen/);
    }

    await seite.evaluate(() => { window.spiel.schliessePanel(); window.spiel.stadt('Frankfurt (Oder)'); });
    await bild('03-langer-stadtname');
    if (nachher) {
      const chip = await seite.evaluate(() => {
        const s = document.getElementById('stadtname'), stil = getComputedStyle(s);
        return { text: s.textContent, ellipsis: stil.textOverflow, overflow: stil.overflow, w: s.getBoundingClientRect().width };
      });
      assert.equal(chip.text, 'Frankfurt (Oder)');
      assert.equal(chip.overflow, 'visible', 'Langer Stadtname muss vollständig sichtbar sein');
      assert.ok(chip.w > 0);
    }

    await seite.evaluate(() => window.spiel.stadt('Chemnitz'));
    await bild('04-region-chemnitz');
    if (nachher) assert.equal(await seite.locator('#stadtcluster').innerText(), 'Region Ost');
    await seite.evaluate(() => window.spiel.stadt('Hannover'));
    await bild('04-region-hannover');
    if (nachher) assert.equal(await seite.locator('#stadtcluster').innerText(), 'Region Nord');

    await seite.evaluate(() => window.spiel.oeffneOrganisation('vertrieb'));
    await bild('05-06-organisation-start');
    if (nachher) {
      const inhalt = await seite.locator('#pinhalt').innerText();
      assert.match(inhalt, /Premium & Flagships/);
      for (const premium of ['Palais Hartwig','Hartwig am Hofgarten','Alsterhaus Hartwig','Hartwig Königsallee']) {
        assert.ok(inhalt.includes(premium), 'Premiumhaus fehlt: ' + premium);
      }
      assert.match(inhalt, /Umsatz\/Woche noch offen/);
      const feste = await seite.locator('#pinhalt .zeile button:disabled').count();
      assert.equal(feste, 4, 'Vier feste Premiumhäuser');
    }

    await seite.evaluate(() => { window.spiel.schliessePanel(); window.spiel.reise.oeffne(); });
    await seite.locator('.reise-zielraster .reise-ziel').first().waitFor();
    await bild('07-reise');
    if (nachher) {
      const w = await seite.locator('.reise-deutschland svg').evaluate(el => el.getBoundingClientRect().width);
      assert.ok(w >= 195, 'Deutschlandkarte muss mindestens die halbe Breite bei 390 Pixel haben: ' + w);
      const formate = await seite.locator('.reise-format').all();
      assert.ok(formate.length, 'Formatmengen müssen einzeln markiert sein');
      for (const el of formate) assert.equal(await el.evaluate(x => getComputedStyle(x).whiteSpace), 'nowrap');
    }

    // Entwicklungsschalter ist ausschließlich über ?dev=1 sichtbar.
    if (nachher) {
      const dev = await kontext.newPage();
      await dev.goto(start + '&dev=1', { waitUntil: 'load' });
      await dev.locator('#start.an').waitFor();
      assert.equal(await dev.locator('.botwahl').isVisible(), true, '?dev=1 muss Bot sichtbar machen');
      await dev.close();
      assert.deepEqual(fehler, [], 'Keine JavaScript-Laufzeitfehler');
    }
    console.log('Q04 ' + modus + ': sieben Bildstationen bei 390 × 844 gespeichert in ' + ausgabe +
      (nachher ? '; DOM-Prüfungen erfolgreich' : '; Vergleichsbasis ohne Assertions'));
    await kontext.close();
  } catch (err) {
    console.error('Q04-Abnahme FEHLER:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
})();

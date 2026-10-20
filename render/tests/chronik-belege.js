// N12 Abnahme: node spiel-render.js --bundle && node tests/chronik-belege.js
// Speichert zwei echte Browserbilder nach ../bilder/nice/chronik.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const ziel = path.resolve(root, '../bilder/nice/chronik');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent((req.url || '/').split('?')[0]));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, b) => {
    if (err) { res.writeHead(404); res.end(err.message); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(b);
  });
});
(async () => {
  let browser;
  try {
    await new Promise((ok, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', ok); });
    const opts = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
    if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
    browser = await chromium.launch(opts);
    const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(120000);
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/spiel.html');
    await page.locator('#start.an').waitFor();
    await page.locator('#startknopf').click();
    await page.waitForFunction(() => window.bereit === true && window.spiel?.s?.haeuser?.length > 0);
    await page.evaluate(() => window.spiel.oeffneChronik());
    assert.equal(await page.locator('.chronik-station').count(), 15);
    assert.equal(await page.locator('.chronik-motiv').count(), 15);
    fs.mkdirSync(ziel, { recursive: true });
    await page.locator('#panel').screenshot({ path: path.join(ziel, 'zeitleiste.png') });
    await page.evaluate(() => {
      const s = window.spiel.s;
      const g = s.hq.gebaeude.find(g => g.etagen.some(e => e.gemietet));
      const e = g.etagen.find(e => e.gemietet && !e.abteilungen.length) || g.etagen.find(e => e.gemietet);
      window.hqKlick('archiv', g.id, e.nr, 'true');
      window.hqKlick('etage', g.id, e.nr);
    });
    assert.ok(await page.locator('#pinhalt').getByText('Archiv').count());
    await page.locator('#panel').screenshot({ path: path.join(ziel, 'archiv-etage.png') });
    assert.deepEqual(errors, [], 'keine Browserausnahmen');
    console.log('Chronik: 15 Stationen, Archiv-Etage und zwei Belegbilder erzeugt.');
  } finally {
    await browser?.close();
    await new Promise(ok => server.close(ok));
  }
})().catch(err => { console.error(err); process.exitCode = 1; });

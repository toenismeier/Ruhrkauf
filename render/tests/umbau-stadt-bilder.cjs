// E48/E49: Baustelle je Etage und Klima auf dem Dach in der Spielstadt, für jedes Format (Bilder zur Sichtprüfung).
// Aufruf: node tests/umbau-stadt-bilder.cjs [Stadt] → out/umbau-stadt/<Stadt>-<format>.png
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), stadt = process.argv[2] ?? 'Berlin', aus = path.join(root, 'out/umbau-stadt');
fs.mkdirSync(aus, { recursive: true });
const mime = { '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.json': 'application/json', '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent((req.url || '/').split('?')[0]), f = path.resolve(root, '.' + (p === '/' ? '/spiel.html' : p));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(f)] ?? 'application/octet-stream' }); res.end(d); });
});
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  const fehler = []; page.on('pageerror', (e) => fehler.push(e.message));
  page.setDefaultTimeout(180000);
  await page.goto('http://127.0.0.1:' + server.address().port + '/spiel.html?stadt=' + encodeURIComponent(stadt) + '&seed=1');
  await page.waitForFunction(() => window.bereit === true && window.spiel?.sb?.haeuser?.size >= 1);
  await page.evaluate(() => document.querySelector('[data-ein="spaeter"]')?.click());
  await page.addStyleTag({ content: ':is(.oben,#cockpit,#stadt-chips,.unten,#wochenstreifen,.botwahl,.hw-pin,.pins){visibility:hidden!important}' });
  const faelle = await page.evaluate((stadt) => {
    const sp = window.spiel, s = sp.s, E = sp.E, out = [];
    const art = (h) => h.klasse === 'premium' ? 'premium' : h.format;
    const gesehen = new Set();
    for (const h of s.haeuser) {
      const a = art(h);
      if (h.stadt !== stadt || h.status !== 'offen' || gesehen.has(a) || !sp.sb.haeuser.get(h.id)?.p) continue;
      gesehen.add(a);
      // Etagenbaustelle im 1. OG (sonst EG) und Klima auf dem Dach (Technik fertig)
      const nr = h.etagen.includes(1) ? 1 : 0;
      E.fuehreAus(s, { typ: 'umbauPlanen', haus: h.id, etage: nr, stufe: 'ladenbau', gewerk: 'moebel' });
      for (const n of h.etagen) { h.etagenBau[n].technik.klima = 2; h.etagenBau[n].klimaModernisiert = true; }
      out.push({ id: h.id, art: a, name: h.name });
    }
    sp.grafikNachziehen();
    return out;
  }, stadt);
  for (const f of faelle) {
    await page.evaluate((id) => { const x = window.spiel.sb.haeuser.get(id); window.spiel.schliessePanel(); window.spiel.kameraAuf(x.p.x + x.p.w / 2, x.p.z + x.p.d / 2, 55); }, f.id);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(aus, stadt + '-' + f.art + '.png') });
    console.log(stadt, f.art, f.name);
  }
  if (fehler.length) console.log('FEHLER', fehler.slice(0, 5).join(' | '));
  await browser.close(); server.close();
})().catch((e) => { console.error(e); process.exit(1); });

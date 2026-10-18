// Aufruf: node pruef-render.js [Stadt,Stadt,…] [--bilder] [--zeit]
// --zeit: statt zu rendern jede Parzelle einzeln bauen und die Zeit je Slot-Bauer messen (out/zeit-bauer.txt).
// Rendert jede Stadt aus haeuser.json einzeln als ganze Stadt (eine Seite je Stadt, Kachel 640 × 360, Metropolen zur
// Reserve zusätzlich 1280 × 720) und protokolliert Dreiecke, Teile, Zeit und Erfolg in out/render-protokoll.csv.
// --bilder legt die Kacheln unter out/render-pruef/ ab. Ein Absturz der Seite (Speicher) zählt als Fehler.
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const METROPOLEN = ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Düsseldorf'];
(async () => {
  const args = process.argv.slice(2);
  const bilder = args.includes('--bilder'), zeit = args.includes('--zeit');
  const zeitStat = {};
  const nur = args.find((a) => !a.startsWith('--'))?.split(',');
  // Städteliste aus dem Bündel von staedte.js
  const listeJs = path.join(__dirname, 'out', '.pruef-render-liste.mjs');
  fs.writeFileSync(path.join(__dirname, 'out', '.pruef-render-liste-quelle.js'), "import { STADTLISTE } from '../src/kit/staedte.js'; console.log(JSON.stringify(STADTLISTE.map((s) => [s.name, s.typ])));");
  esbuild.buildSync({ entryPoints: [path.join(__dirname, 'out', '.pruef-render-liste-quelle.js')], bundle: true, platform: 'node', format: 'esm', outfile: listeJs, loader: { '.json': 'json' }, logLevel: 'error' });
  const liste = JSON.parse(require('child_process').execFileSync('node', [listeJs], { encoding: 'utf8' }));
  const bundle = path.join(__dirname, 'out', '.bundle-pruef-render.js');
  await esbuild.build({ entryPoints: [path.join(__dirname, 'src', 'pruef-render-seite.js')], bundle: true, outfile: bundle, loader: { '.json': 'json' }, logLevel: 'error' });
  const html = path.join(__dirname, 'out', '.seite-pruef-render.html');
  fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><script src="${path.basename(bundle)}"></script></body></html>`);
  if (bilder) fs.mkdirSync(path.join(__dirname, 'out', 'render-pruef'), { recursive: true });
  const start = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--max-old-space-size=6144'] });
  let browser = await start();
  const zeilen = ['stadt;typ;kachel;erfolg;dreiecke;dreiecke_instanzen;dreiecke_gerendert;drawcalls;teile;instanzen;ms;heap_mb;fehler'];
  const auftraege = [];
  for (const [n, typ] of liste) {
    if (nur && !nur.includes(n)) continue;
    auftraege.push([n, typ, '640x360']);
    if (METROPOLEN.includes(n) && !zeit) auftraege.push([n, typ, '1280x720']);
  }
  let fehler = 0, k = 0;
  for (const [n, typ, kachel] of auftraege) {
    if (++k % 12 === 0) { await browser.close(); browser = await start(); }
    const page = await browser.newPage();
    let erg = null, absturz = null;
    page.on('crash', () => { absturz = 'Seite abgestürzt'; });
    page.on('pageerror', (e) => { absturz = absturz ?? 'Seitenfehler: ' + e.message; });
    const t0 = Date.now();
    try {
      await page.goto('file://' + html + '#' + encodeURIComponent(`${n}|${kachel}${zeit ? '|zeit' : ''}`), { waitUntil: 'commit', timeout: 0 });
      await page.waitForFunction('window.ergebnis !== undefined', null, { timeout: 15 * 60000, polling: 500 });
      erg = await page.evaluate('window.ergebnis');
      if (bilder && erg.erfolg) { const d = await page.evaluate('window.bild'); fs.writeFileSync(path.join(__dirname, 'out', 'render-pruef', `${n}-${kachel}.png`), Buffer.from(d.split(',')[1], 'base64')); }
    } catch (e) { absturz = absturz ?? String(e.message).split('\n')[0]; }
    await page.close().catch(() => {});
    if (!erg) { erg = { erfolg: false, fehler: absturz, ms: Date.now() - t0 }; await browser.close().catch(() => {}); browser = await start(); }
    if (!erg.erfolg) fehler++;
    if (zeit && erg.zeit) {
      for (const [k, e] of Object.entries(erg.zeit)) { const z = zeitStat[k] ?? (zeitStat[k] = { n: 0, summe: 0, max: 0, wo: '' }); z.n += e.n; z.summe += e.summe; if (e.max > z.max) { z.max = e.max; z.wo = n; } }
      const zl = Object.entries(zeitStat).sort((a, b) => b[1].max - a[1].max).map(([k, e]) => `${k.padEnd(44)} n ${String(e.n).padStart(6)}  mittel ${(e.summe / e.n).toFixed(1).padStart(7)} ms  max ${e.max.toFixed(0).padStart(6)} ms  ${e.wo}`);
      fs.writeFileSync(path.join(__dirname, 'out', 'zeit-bauer.txt'), 'Zeit je Slot-Bauer (Browser, je Aufruf), sortiert nach Höchstwert\n' + zl.join('\n') + '\n');
      console.log(`zeit ${n.padEnd(18)} ${erg.ms} ms, langsamster Bauer ${Object.entries(erg.zeit).sort((a, b) => b[1].max - a[1].max)[0]?.map((x) => (typeof x === 'string' ? x : x.max.toFixed(0) + ' ms')).join(' ')}`);
      continue;
    }
    const f = (erg.fehler ?? '').replace(/[;\n]/g, ' ');
    zeilen.push([n, typ, kachel, erg.erfolg ? 'ja' : 'nein', erg.dreiecke ?? '', erg.dreieckeInst ?? '', erg.dreieckeGerendert ?? '', erg.drawcalls ?? '', erg.teile ?? '', erg.instanzen ?? '', erg.ms ?? '', erg.heapMB ?? '', f].join(';'));
    console.log(`${erg.erfolg ? 'ok  ' : 'FEHL'} ${n.padEnd(18)} ${kachel.padEnd(9)} ${String(erg.dreiecke ?? '').padStart(9)} Dreiecke (${erg.dreieckeInst ?? ''} inst.) ${String(erg.teile ?? '').padStart(8)} Teile ${String(erg.ms ?? '').padStart(7)} ms ${String(erg.heapMB ?? '').padStart(5)} MB ${f}`);
    if (process.env.STAT && erg.statistik) console.log('   ', erg.verworfen, 'verworfen;', erg.statistik.slice(0, 8).map(([t, [n, d]]) => `${t} ${n}× ${Math.round(d / 1000)}k`).join(', '));
    if (!zeit) fs.writeFileSync(path.join(__dirname, 'out', 'render-protokoll.csv'), zeilen.join('\n') + '\n');
  }
  await browser.close();
  console.log(`Fehler: ${fehler} von ${auftraege.length}`);
})();

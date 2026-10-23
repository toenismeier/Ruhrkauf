// Q34: Kontaktbogen je Zielgruppe (alle Artikeltypen, die die Zielgruppe in Damen, Herren und Home sieht), 64-px-Kacheln.
// Aufruf (cd render):
//   node scripts/q34-bogen.mjs bogen out/q34-adults.png adults          Kacheln mit Namen, gruppiert nach Kategorie
//   node scripts/q34-bogen.mjs blind out/q34-blind-1.png erwachsen out/q34-blind-1.json 1/6    (erwachsen = Adults ∪ Best Ager)
//                                                                         nummeriert ohne Namen (Blindtest), Schlüssel als JSON
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { chromium } from 'playwright';

const [modus = 'bogen', aus = 'out/q34-bogen.png', zielgruppe = 'adults', schluessel, teilArg = '1/1'] = process.argv.slice(2);
const hier = dirname(fileURLToPath(import.meta.url));
const tmp = join(hier, '../out/q34-bogen.bundle.mjs');
mkdirSync(dirname(tmp), { recursive: true });
buildSync({
  stdin: { contents: `export { produktKatalog } from '../engine/src/produkte.ts';\nexport { passendeTypen } from './src/ui/produkte-q24.js';\nexport { typKachelSVG } from './src/kit/produktbild.js';`, resolveDir: join(hier, '..'), loader: 'js' },
  bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'error',
});
const M = await import(tmp + '?' + Date.now());
const K = M.produktKatalog({});
const gesehen = new Map();
for (const z of zielgruppe === 'erwachsen' ? ['adults', 'bestager'] : [zielgruppe]) for (const fach of ['damen', 'herren', 'home']) for (const t of M.passendeTypen(K, fach, z)) gesehen.set(t.typ, t);
const typen = [...gesehen.values()];
const kachel = (t, g) => M.typKachelSVG(t.typ, g, t.bild ? { bild: t.bild } : {});
const img = (svg) => `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const name = zielgruppe === 'erwachsen' ? 'Adults und Best Ager' : K.zielgruppen.find((z) => z.id === zielgruppe)?.name ?? zielgruppe;

let html = '';
if (modus === 'bogen') {
  const nachKat = new Map();
  for (const t of typen) { if (!nachKat.has(t.kategorie)) nachKat.set(t.kategorie, []); nachKat.get(t.kategorie).push(t); }
  html = `<h1>${esc(name)}: ${typen.length} Artikeltypen (64 px)</h1>` + [...nachKat].map(([kat, l]) => `<h2>${esc(kat)} (${l.length})</h2><div class="raster">${l.sort((a, b) => a.typ.localeCompare(b.typ, 'de')).map((t) => `<div class="k">${img(kachel(t, 64))}<span>${esc(t.typ)}</span></div>`).join('')}</div>`).join('');
} else {
  // gemischte Reihenfolge, damit Nachbarn nicht helfen; teil i/n schneidet den Bogen in Blöcke für den Blindtest
  const [i, n] = teilArg.split('/').map(Number);
  const reihe = typen.map((t, k) => [t, (k * 7919) % 1009]).sort((a, b) => a[1] - b[1]).map(([t]) => t);
  const je = Math.ceil(reihe.length / n), von = (i - 1) * je, block = reihe.slice(von, von + je);
  if (schluessel) writeFileSync(schluessel, JSON.stringify(Object.fromEntries(block.map((t, k) => [von + k + 1, t.typ])), null, 1));
  html = `<div class="raster b">${block.map((t, k) => `<div class="k"><b>${von + k + 1}</b>${img(kachel(t, 64))}</div>`).join('')}</div>`;
}
const seite = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#1d262e;font:12px "DejaVu Sans",Arial;color:#c9d4db;padding:12px}
h1{color:#fff;font-size:18px;margin:2px 0 8px}h2{color:#fff;font-size:14px;margin:12px 0 6px}
.raster{display:grid;grid-template-columns:repeat(12,96px);gap:6px}.k{background:#243340;padding:4px;text-align:center}
.k span{display:block;margin-top:2px;font-size:10.5px;line-height:1.15}.b .k{display:flex;align-items:center;gap:4px}.b b{color:#fff;font-size:14px;width:26px}
</style></head><body>${html}</body></html>`;
mkdirSync(dirname(aus), { recursive: true });
const b = await chromium.launch({ headless: true, args: ['--headless=new'], executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 1230, height: 800 } });
await p.setContent(seite, { waitUntil: 'load' });
await p.screenshot({ path: aus, fullPage: true });
await b.close();
console.log('gespeichert:', aus, typen.length, 'Artikeltypen', name);

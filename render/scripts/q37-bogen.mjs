// Q37: Musterbogen (64-px-Kacheln je Muster und Artikeltyp) und Blindtest-Bögen für das Musterfeld.
// Aufruf (cd render):
//   node scripts/q37-bogen.mjs bogen out/q37-muster.png                 Raster Muster × Artikeltyp mit Namen, dazu Model-Beispiele
//   node scripts/q37-bogen.mjs blind out/q37-blind.png out/q37-blind.json   nummeriert ohne Namen, Schlüssel als JSON
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { chromium } from 'playwright';

const [modus = 'bogen', aus = 'out/q37-muster.png', schluessel] = process.argv.slice(2);
const hier = dirname(fileURLToPath(import.meta.url));
const tmp = join(hier, '../out/q37-bogen.bundle.mjs');
mkdirSync(dirname(tmp), { recursive: true });
buildSync({
  stdin: { contents: `export { produktKatalog } from '../engine/src/produkte.ts';\nexport { produktbildSVG, modelbildSVG } from './src/kit/produktbild.js';`, resolveDir: join(hier, '..'), loader: 'js' },
  bundle: true, format: 'esm', platform: 'node', outfile: tmp, logLevel: 'error',
});
const M = await import(tmp + '?' + Date.now());
const K = M.produktKatalog({});
const T = new Map(K.typen.map((t) => [t.typ, t]));
const SPALTEN = [['T-Shirt', 'weiß'], ['Hemd', 'hellblau'], ['Kleid', 'marine'], ['Hoodie', 'grau'], ['Strickpullover', 'creme'], ['Crop-Top', 'rosa'], ['Midirock', 'camel'], ['Stoffhose', 'anthrazit'], ['Cargo-Hose', 'olive'], ['Schal', 'bordeaux'], ['Sneaker', 'weiß'], ['Kissen', 'salbei']];
const img = (svg) => `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const bild = (typ, farbe, m, g = 64) => { const t = T.get(typ); return M.produktbildSVG(typ, farbe, t.materialien[0], g, { ...(t.bild ? { bild: t.bild } : {}), muster: m.bild }); };

let html = '';
if (modus === 'bogen') {
  html = `<h1>Musterfeld: ${K.muster.length} Muster (64 px)</h1><table><tr><th></th>${SPALTEN.map(([t]) => `<th>${esc(t)}</th>`).join('')}</tr>`;
  for (const m of K.muster) {
    html += `<tr><th class="m">${esc(m.name)}${m.gesperrt ? '<small>gesperrt</small>' : ''}</th>`;
    for (const [typ, farbe] of SPALTEN) html += T.get(typ).muster.includes(m.name) ? `<td>${img(bild(typ, farbe, m))}</td>` : '<td class="leer">–</td>';
    html += '</tr>';
  }
  html += '</table><h2>Am Model (Detailansicht)</h2><div class="model">';
  for (const [typ, farbe, mu, zg, g] of [['Hemd', 'hellblau', 'Karo', 'adults', 'herren'], ['Kleid', 'marine', 'Blumen', 'adults', 'damen'], ['Hoodie', 'grau', 'Batik', 'teens', 'herren'], ['Midirock', 'camel', 'Leo', 'young', 'damen'], ['Strickpullover', 'creme', 'Norweger', 'bestager', 'damen'], ['T-Shirt', 'weiß', 'Schriftzug', 'teens', 'damen'], ['Crop-Top', 'rosa', 'Ringel', 'teens', 'damen'], ['Cargo-Hose', 'olive', 'Camouflage', 'young', 'herren']]) {
    const t = T.get(typ), m = K.muster.find((x) => x.name === mu);
    const svg = M.modelbildSVG(typ, farbe, t.materialien[0], { geschlecht: g, zielgruppe: zg, groesse: 150, hintergrund: null, ...(t.bild ? { bild: t.bild } : {}), muster: m.bild });
    html += `<div class="k">${svg ? img(svg) : ''}<span>${esc(typ)} · ${esc(mu)}</span></div>`;
  }
  html += '</div>';
} else {
  // Blindtest: je Muster (ohne Uni und Lizenz) drei zufällige erlaubte Typ-Farbe-Paare, gemischt und nummeriert
  const paare = [];
  let k = 0;
  for (const m of K.muster.filter((x) => x.name !== 'Uni' && !x.gesperrt)) {
    const moeglich = SPALTEN.filter(([t]) => T.get(t).muster.includes(m.name));
    for (let i = 0; i < 3; i++) { const [typ, farbe] = moeglich[(k++ * 5 + i * 3) % moeglich.length]; paare.push({ typ, farbe, m }); }
  }
  const reihe = paare.map((x, i) => [x, (i * 7919) % 1009]).sort((a, b) => a[1] - b[1]).map(([x]) => x);
  if (schluessel) writeFileSync(schluessel, JSON.stringify(Object.fromEntries(reihe.map((x, i) => [i + 1, { muster: x.m.name, typ: x.typ }])), null, 1));
  html = `<div class="raster">${reihe.map((x, i) => `<div class="b"><b>${i + 1}</b>${img(bild(x.typ, x.farbe, x.m))}</div>`).join('')}</div>`;
}
const seite = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#1d262e;font:12px "DejaVu Sans",Arial;color:#c9d4db;padding:12px}
h1{color:#fff;font-size:18px;margin:2px 0 8px}h2{color:#fff;font-size:14px;margin:14px 0 6px}
table{border-collapse:separate;border-spacing:4px}th{font-size:10.5px;color:#fff;font-weight:600;padding:0 2px}th.m{text-align:right;width:84px}th.m small{display:block;color:#e8a090;font-weight:400}
td{background:#243340;width:70px;height:70px;text-align:center}td.leer{color:#55626c}
.model{display:flex;gap:8px;flex-wrap:wrap}.model .k{background:#eef1f4;color:#223;padding:4px;text-align:center;width:150px}.model span{display:block;font-size:11px}
.raster{display:grid;grid-template-columns:repeat(9,110px);gap:6px}.b{display:flex;align-items:center;gap:4px;background:#243340;padding:4px}.b b{color:#fff;font-size:14px;width:28px}
</style></head><body>${html}</body></html>`;
mkdirSync(dirname(aus), { recursive: true });
const b = await chromium.launch({ headless: true, args: ['--headless=new'], executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 1060, height: 800 } });
await p.setContent(seite, { waitUntil: 'load' });
await p.screenshot({ path: aus, fullPage: true });
await b.close();
console.log('gespeichert:', aus);

// Q33: Kontaktbögen für Kinder, Teens & Tweens, Young Adults.
// Aufruf (cd render):
//   node scripts/q33-bogen.mjs silhouetten out/q33-silh.png [k_|t_]          neue Q33-Silhouetten mit id, 120 px
//   node scripts/q33-bogen.mjs zielgruppe out/q33-kinder.png kinder katalog.json   alle sichtbaren Artikeltypen der Zielgruppe, 64 px mit Namen
//   node scripts/q33-bogen.mjs blind out/q33-blind.png schluessel.json [k_|t_]  nummeriert ohne Namen, 64 px und 160 px
//   node scripts/q33-bogen.mjs model out/q33-model.png [k_|t_]                   Model je Silhouette (Kinder bzw. Teens/Young)
// katalog.json erzeugt: cd engine && npx tsx scripts/q33-zaehlung.ts --json <datei>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';
import { SILHOUETTEN } from '../src/kit/mode/silhouetten.js';
import { produktSVG, modelFuerProdukt, bildFuer } from '../src/kit/mode/produkt.js';
import { typKachelSVG } from '../src/kit/produktbild.js';

const [modus = 'silhouetten', aus = 'out/q33-bogen.png', a3, a4] = process.argv.slice(2);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const img = (svg) => `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;
const q33 = (prefix) => (prefix && prefix.includes(',') ? prefix.split(',') : Object.keys(SILHOUETTEN).filter((id) => (prefix ? id.startsWith(prefix) : /^[kt]_/.test(id))));

let html = '';
if (modus === 'silhouetten') {
  html = `<div class="raster" style="grid-template-columns:repeat(12,124px)">${q33(a3).map((id) => `<div class="k">${img(produktSVG(id, undefined, undefined, 120, { hintergrund: '#f4f5f7' }))}<span>${esc(id)}</span></div>`).join('')}</div>`;
} else if (modus === 'zielgruppe') {
  const { katalog: K, sichtbar } = JSON.parse(readFileSync(a4, 'utf8'));
  const idx = new Map(K.typen.map((t) => [t.typ, t]));
  const name = K.zielgruppen.find((z) => z.id === a3)?.name ?? a3;
  const liste = [...sichtbar[a3]].sort((x, y) => x.localeCompare(y, 'de'));
  html = `<h2>${esc(name)}: ${liste.length} Artikeltypen (Kachel 64 px wie im Spiel)</h2><div class="raster" style="grid-template-columns:repeat(14,96px)">${liste.map((typ) => `<div class="k s">${img(typKachelSVG(typ, 64, { bild: idx.get(typ)?.bild ?? bildFuer(typ) }))}<span>${esc(typ)}</span></div>`).join('')}</div>`;
} else if (modus === 'blind') {
  const ids = q33(a4);
  const reihe = ids.map((id, i) => [id, (i * 7919) % 1009]).sort((x, y) => x[1] - y[1]).map(([id]) => id);
  writeFileSync(a3, JSON.stringify(Object.fromEntries(reihe.map((id, i) => [i + 1, id])), null, 1));
  html = `<div class="raster" style="grid-template-columns:repeat(7,236px)">${reihe.map((id, i) => `<div class="k b"><b>${i + 1}</b>${img(produktSVG(id, undefined, undefined, 140, { hintergrund: '#f4f5f7' }))}<div class="klein">${img(produktSVG(id, undefined, undefined, 64, { hintergrund: '#f4f5f7' }))}</div></div>`).join('')}</div>`;
} else if (modus === 'model') {
  html = `<div class="raster" style="grid-template-columns:repeat(10,148px)">${q33(a3).filter((id) => SILHOUETTEN[id].model).map((id, i) => {
    const s = SILHOUETTEN[id];
    const g = s.geschlecht ?? (s.nur === 'damen' || s.nur === 'herren' ? s.nur : i % 2 ? 'herren' : 'damen');
    const zg = s.nur === 'kinder' ? 'kinder' : i % 3 ? 'teens' : 'young';
    return `<div class="k">${img(modelFuerProdukt(id, undefined, undefined, { geschlecht: g, zielgruppe: zg, groesse: 144 }))}<span>${esc(id)} · ${zg}</span></div>`;
  }).join('')}</div>`;
}
const seite = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#1d262e;font:12px "DejaVu Sans",Arial;color:#c9d4db;padding:12px}h2{color:#fff;margin:2px 0 10px;font-size:16px}
.raster{display:grid;gap:6px}.k{background:#243340;padding:4px;text-align:center}.k span{display:block;margin-top:2px;word-break:break-word}
.s span{font-size:10px;line-height:1.15}.b{display:flex;align-items:center;gap:6px}.b b{font-size:18px;color:#fff;width:28px}.klein{width:64px}
</style></head><body>${html}</body></html>`;
mkdirSync(dirname(aus), { recursive: true });
const b = await chromium.launch({ headless: true, args: ['--headless=new'], executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 1520, height: 800 } });
await p.setContent(seite, { waitUntil: 'load' });
await p.screenshot({ path: aus, fullPage: true });
await b.close();
console.log('geschrieben:', aus);

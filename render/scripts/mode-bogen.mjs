// Kontaktbogen für Mode-Silhouetten (Q27): Freisteller und Models als PNG.
// Aufruf (cd render):
//   node scripts/mode-bogen.mjs bogen  out/bogen.png [ids,…|alle|neu]        Freisteller 160 px mit Namen
//   node scripts/mode-bogen.mjs blind  out/blind.png [ids,…|neu] [schluessel.json]  nummeriert, 64 px und 160 px, ohne Namen
//   node scripts/mode-bogen.mjs model  out/model.png [ids,…|neu]             Model je Zielgruppe × Geschlecht
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';
import { SILHOUETTEN } from '../src/kit/mode/silhouetten.js';
import { SILHOUETTEN as Q27 } from '../src/kit/mode/erweiterung-q27.js';
import { produktSVG, modelFuerProdukt } from '../src/kit/mode/produkt.js';

const [modus = 'bogen', aus = 'out/mode-bogen.png', liste = 'alle', schluessel] = process.argv.slice(2);
const ids = liste === 'alle' ? Object.keys(SILHOUETTEN) : liste === 'neu' ? Object.keys(Q27) : liste.split(',');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const svgImg = (svg) => `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}">`;

let html = '';
if (modus === 'bogen') {
  html = ids.map((id) => `<div class="k">${svgImg(produktSVG(id, undefined, undefined, 160, { hintergrund: '#f4f5f7' }))}<span>${esc(id)}</span></div>`).join('');
  html = `<div class="raster" style="grid-template-columns:repeat(8,170px)">${html}</div>`;
} else if (modus === 'blind') {
  // gemischte Reihenfolge, damit Nachbarn nicht helfen
  const reihe = ids.map((id, i) => [id, (i * 7919) % 1009]).sort((a, b) => a[1] - b[1]).map(([id]) => id);
  if (schluessel) writeFileSync(schluessel, JSON.stringify(Object.fromEntries(reihe.map((id, i) => [i + 1, id])), null, 1));
  html = reihe.map((id, i) => `<div class="k b"><b>${i + 1}</b>${svgImg(produktSVG(id, undefined, undefined, 160, { hintergrund: '#f4f5f7' }))}<div class="klein">${svgImg(produktSVG(id, undefined, undefined, 64, { hintergrund: '#f4f5f7' }))}</div></div>`).join('');
  html = `<div class="raster" style="grid-template-columns:repeat(6,250px)">${html}</div>`;
} else if (modus === 'abnahme') {
  // Abnahmebild: Freisteller mit Namen, darunter je Silhouette ein Model in passender Gruppe
  const frei = ids.map((id) => `<div class="k">${svgImg(produktSVG(id, undefined, undefined, 130, { hintergrund: '#f4f5f7' }))}<span>${esc(id)}</span></div>`).join('');
  const zgs = ['teens', 'young', 'adults', 'bestager'];
  const mods = ids.filter((id) => SILHOUETTEN[id].model).map((id, i) => {
    const s = SILHOUETTEN[id];
    const g = s.geschlecht ?? (s.nur === 'damen' || s.nur === 'herren' ? s.nur : i % 2 ? 'herren' : 'damen');
    const z = s.nur === 'kinder' ? 'kinder' : s.nur === 'teens' ? 'teens' : zgs[i % 4];
    return `<div class="m">${svgImg(modelFuerProdukt(id, undefined, undefined, { geschlecht: g, zielgruppe: z, groesse: 250 }))}<span>${esc(id)} · ${g[0]} ${z}</span></div>`;
  }).join('');
  html = `<h2 style="color:#fff;margin:4px 0 10px">Q27 Mode: Freisteller</h2><div class="raster" style="grid-template-columns:repeat(10,140px)">${frei}</div><h2 style="color:#fff;margin:18px 0 10px">Q27 Mode: Model je Silhouette</h2><div class="raster" style="grid-template-columns:repeat(12,120px)">${mods}</div>`;
} else if (modus === 'model') {
  const zg = ['kinder', 'teens', 'young', 'adults', 'bestager'];
  html = ids.map((id) => {
    const s = SILHOUETTEN[id];
    const ges = s.nur === 'kinder' ? (s.geschlecht ? [[s.geschlecht, 'kinder']] : [['damen', 'kinder'], ['herren', 'kinder']]) : s.nur === 'teens' ? (s.geschlecht ? [[s.geschlecht, 'teens']] : [['damen', 'teens'], ['herren', 'teens']]) : (s.nur === 'damen' || s.nur === 'herren' ? [s.nur] : ['damen', 'herren']).flatMap((g) => zg.filter((z) => z !== 'kinder').map((z) => [g, z]));
    const zellen = ges.map(([g, z]) => { const m = modelFuerProdukt(id, undefined, undefined, { geschlecht: g, zielgruppe: z, groesse: 230 }); return m ? `<div class="m">${svgImg(m)}<span>${g[0]} ${z}</span></div>` : ''; }).join('');
    return `<div class="z"><div class="n">${esc(id)}${svgImg(produktSVG(id, undefined, undefined, 110, { hintergrund: '#f4f5f7' }))}</div>${zellen}</div>`;
  }).join('');
}
const seite = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#1d262e;font:13px "DejaVu Sans",Arial;color:#c9d4db;padding:14px}
.raster{display:grid;gap:8px}.k{background:#243340;padding:5px;text-align:center}.k span{display:block;margin-top:3px}
.b{display:flex;align-items:center;gap:8px}.b b{font-size:20px;color:#fff;width:30px}.klein{width:64px}
.z{display:flex;align-items:flex-end;gap:4px;background:#243340;margin-bottom:6px;padding:4px}.n{width:120px;text-align:center}.n img{display:block;margin:4px auto}
.m{text-align:center}.m span{display:block;font-size:11px}
</style></head><body>${html}</body></html>`;
mkdirSync(dirname(aus), { recursive: true });
const b = await chromium.launch({ headless: true, args: ['--headless=new'], executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 1500, height: 800 } });
await p.setContent(seite, { waitUntil: 'load' });
await p.screenshot({ path: aus, fullPage: true });
await b.close();
console.log('gespeichert:', aus, ids.length, 'Silhouetten');

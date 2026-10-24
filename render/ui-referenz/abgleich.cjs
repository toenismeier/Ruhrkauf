// Bildabgleich Referenzpanel gegen Coffee-Vorlage (E47).
// Aufruf: node ui-referenz/abgleich.cjs 26 [Schriftdatei.ttf] [Ausgabeordner]
// Rendert ui-referenz/referenz-<n>.html bei 402 × 874 und Faktor 3 (wie die Vorlage), legt
// Vorlage | eigenes Bild | Differenz nebeneinander und misst Tintenkästen in festen Fenstern.
const path = require('path'), fs = require('fs');
const { chromium } = require(path.join(__dirname, '..', 'node_modules', 'playwright'));
const { PNG } = require(path.join(__dirname, '..', 'node_modules', 'pngjs'));

const n = process.argv[2] || '26';
const schrift = process.argv[3] || null;
const aus = process.argv[4] || path.join(__dirname, '..', 'out', 'ui-referenz');
const groessen = process.argv[5] ? JSON.parse(process.argv[5]) : null; // z. B. {"titel":20}
fs.mkdirSync(aus, { recursive: true });
const vorlage = path.join(__dirname, '..', '..', 'testflight', 'vorlage-coffee', n + '.png');
const FENSTER = require(path.join(__dirname, 'fenster.cjs'))[n] || [];

function lade(datei) { return PNG.sync.read(fs.readFileSync(datei)); }
function grau(p, x, y) { const i = (y * p.width + x) * 4; return 0.299 * p.data[i] + 0.587 * p.data[i + 1] + 0.114 * p.data[i + 2]; }
// Tintenkasten: Zeilen/Spalten im Fenster, deren Helligkeit um mehr als `schwelle` vom Fenstergrund abweicht.
function tinte(p, [x0, y0, x1, y1], schwelle = 60) {
  const grund = grau(p, x0, y0);
  let a = null, b = null, l = null, r = null;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (Math.abs(grau(p, x, y) - grund) > schwelle) { if (a === null) a = y; b = y; if (l === null || x < l) l = x; if (r === null || x > r) r = x; }
  }
  return a === null ? null : { oben: a / 3, unten: (b + 1) / 3, links: l / 3, rechts: (r + 1) / 3 };
}

(async () => {
  const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const page = await browser.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3 });
  await page.goto('file://' + path.join(__dirname, `referenz-${n}.html`));
  if (schrift) {
    const daten = fs.readFileSync(schrift).toString('base64');
    await page.addStyleTag({ content: `@font-face{font-family:'Probe';src:url(data:font/ttf;base64,${daten});font-weight:100 900}:root{--hw-schrift:'Probe',sans-serif}` });
  }
  if (groessen) await page.addStyleTag({ content: ':root{' + Object.entries(groessen).map(([k, v]) => `--hw-gr-${k}:${v}px`).join(';') + '}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const eigen = path.join(aus, `eigen-${n}.png`);
  await page.screenshot({ path: eigen });
  await browser.close();

  const A = lade(vorlage), B = lade(eigen);
  const W = A.width, H = A.height, out = new PNG({ width: W * 3, height: H });
  let summe = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, o1 = (y * W * 3 + x) * 4, o2 = o1 + W * 4, o3 = o2 + W * 4;
    for (let k = 0; k < 4; k++) { out.data[o1 + k] = A.data[i + k]; out.data[o2 + k] = B.data[i + k]; }
    const d = Math.abs(grau(A, x, y) - grau(B, x, y)); summe += d;
    out.data[o3] = Math.min(255, d * 2); out.data[o3 + 1] = Math.min(255, d * 2); out.data[o3 + 2] = Math.min(255, d * 2); out.data[o3 + 3] = 255;
  }
  fs.writeFileSync(path.join(aus, `abgleich-${n}.png`), PNG.sync.write(out));
  console.log(`Mittlere Abweichung Grauwert: ${(summe / (W * H)).toFixed(2)} (0 = gleich)`);
  const ergebnisse = [];
  for (const f of FENSTER) {
    const s = tinte(A, f.box, f.schwelle), e = tinte(B, f.box, f.schwelle);
    const d = s && e ? ['oben', 'unten', 'links', 'rechts'].map((k) => (e[k] - s[k]).toFixed(1)).join(' / ') : 'fehlt';
    const h = s && e ? `Höhe ${(s.unten - s.oben).toFixed(1)} → ${(e.unten - e.oben).toFixed(1)}` : '';
    console.log(`${f.name.padEnd(22)} Abweichung o/u/l/r px: ${d}   ${h}`);
    if (process.env.JSON_AUS) ergebnisse.push({ name: f.name, s, e });
  }
  if (process.env.JSON_AUS) fs.writeFileSync(process.env.JSON_AUS, JSON.stringify(ergebnisse));
})().catch((e) => { console.error(e); process.exit(1); });

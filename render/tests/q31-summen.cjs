// Q31 „Zahlen zuerst“: Jede angezeigte Summe muss sich aus den angezeigten Zeilen nachrechnen lassen.
// Je Buch [data-summenbuch] werden die Zeilenwerte [data-s=k] in Dokumentreihenfolge addiert; an jeder Summe
// [data-summe=k] muss die Summe passen (Toleranz: halbe Rundungseinheit je angezeigtem Wert). Danach läuft die Summe
// als Vortrag weiter (z. B. Brutto → minus Beteiligung → Netto).
// Aufruf: node spiel-render.js --bundle && node tests/q31-summen.cjs
const path = require('path');
const { chromium } = require('playwright');

const ANSICHTEN = [
  ['Einkauf Freigaben', () => window.spiel.einkauf.oeffne('freigaben')],
  ['Eigenmarken', () => window.spiel.einkauf.oeffne('eigenmarken')],
  ['Merchandise', () => window.spiel.einkauf.oeffne('merchandise')],
  ['Marketing', () => { document.getElementById('menueknopf').click(); document.getElementById('marketing').click(); }],
  ['Online', () => { document.getElementById('menueknopf').click(); document.getElementById('online').click(); }],
  ['Planung', () => { document.getElementById('menueknopf').click(); document.getElementById('planung').click(); }],
  ['Reporting', () => { document.getElementById('menueknopf').click(); document.getElementById('reporting').click(); }],
];

function pruefeImBrowser() {
  const EINHEIT = [[/Mrd\./, 1e9], [/Mio\./, 1e6], [/Tsd\./, 1e3]];
  const wert = (el) => {
    const t = el.textContent.replace(/ /g, ' ').trim();
    const m = /([+−-]?)\s*([\d.]+(?:,\d+)?)/.exec(t);
    if (!m) return null;
    const ziffern = m[2], nachkomma = (ziffern.split(',')[1] ?? '').length;
    let f = 1; for (const [re, x] of EINHEIT) if (re.test(t)) { f = x; break; }
    // Planblatt: Zahlen ohne Einheit stehen unter einem Kopf „Mio. €“
    if (f === 1 && el.closest('[data-summenbuch^="Planblatt"]')) f = 1e6;
    const v = Number(ziffern.replace(/\./g, '').replace(',', '.')) * f * (m[1] === '−' || m[1] === '-' ? -1 : 1);
    return { v, halb: 0.5 * f * 10 ** -nachkomma };
  };
  const fehler = [], ok = [];
  for (const buch of document.querySelectorAll('#pinhalt [data-summenbuch]')) {
    const name = buch.dataset.summenbuch, lauf = {};
    for (const el of buch.querySelectorAll('[data-s],[data-summe]')) {
      const w = wert(el); if (!w) { fehler.push(`${name}: Wert nicht lesbar „${el.textContent}“`); continue; }
      if (el.dataset.s) { const k = el.dataset.s; lauf[k] ??= { v: 0, t: 0, n: 0 }; lauf[k].v += w.v; lauf[k].t += w.halb; lauf[k].n++; }
      else {
        const k = el.dataset.summe, a = lauf[k] ?? { v: 0, t: 0, n: 0 };
        const toleranz = a.t + w.halb + 1;
        if (Math.abs(a.v - w.v) > toleranz) fehler.push(`${name} [${k}]: Zeilen ergeben ${Math.round(a.v)}, angezeigt ${Math.round(w.v)} (Toleranz ${Math.round(toleranz)})`);
        else ok.push(`${name} [${k}]: ${a.n} Zeilen = ${el.textContent.trim()}`);
        lauf[k] = { v: w.v, t: w.halb, n: 1 };
      }
    }
  }
  return { fehler, ok };
}

(async () => {
  const opt = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROMIUM_PATH) opt.executablePath = process.env.CHROMIUM_PATH;
  const b = await chromium.launch(opt);
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const seitenFehler = [];
  p.on('pageerror', (e) => seitenFehler.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'spiel.html') + '?stadt=Essen&seed=1&leben=aus&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
  await p.waitForFunction('window.bereit === true', null, { timeout: 0, polling: 500 });
  await p.evaluate(() => { window.spiel.schliessePanel(); window.spiel.neuesSpiel(1, 'Essen'); for (let i = 0; i < 8; i++) window.spiel.woche(false); });
  let fehler = 0, geprueft = 0;
  for (const [name, oeffne] of ANSICHTEN) {
    await p.evaluate(() => window.spiel.schliessePanel());
    await p.evaluate(oeffne); await p.waitForTimeout(250);
    const r = await p.evaluate(pruefeImBrowser);
    for (const x of r.ok) console.log('OK    ' + x);
    for (const x of r.fehler) console.log('FEHLER ' + x);
    if (!r.ok.length && !r.fehler.length) { console.log(`FEHLER ${name}: keine Summe gefunden`); fehler++; }
    fehler += r.fehler.length; geprueft += r.ok.length + r.fehler.length;
  }
  await b.close();
  for (const e of seitenFehler) console.log('FEHLER Seite ' + e);
  console.log(`Summen: ${geprueft} geprüft, ${fehler + seitenFehler.length} Fehler`);
  if (fehler + seitenFehler.length) process.exit(1);
})();

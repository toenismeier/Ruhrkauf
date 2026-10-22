// Q31: Bilder aller Management-Panels bei 390 × 844 (Vorher/Nachher).
// Aufruf: node tests/q31-bilder.cjs <zielordner> [panel,panel]
// Je Panel und Reiter: Kopf (scrollTop 0) und bis zu zwei weitere Bildschirmhöhen.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ziel = path.resolve(process.argv[2] || path.join(__dirname, '..', 'out', 'q31'));
const nur = process.argv[3] ? process.argv[3].split(',') : null;
const PANELS = [
  ['einkauf', 'einkauf'], ['produkte', 'produkte'], ['marketing', 'marketing'], ['it', 'it'],
  ['online', 'ecommerce'], ['planung', 'planung'], ['reporting', 'reporting'], ['vorstand', 'vorstand'],
  ['app-oeffnen', 'spielstaende'],
];

// Zusatzansichten je Panel (Detailseiten, schlechte Tage). Jede Funktion läuft im Browser.
const EXTRA = {
  einkauf: [
    ['wg', () => window.spiel.einkauf.oeffne('wg', 'damen.kleider')],
    ['freigaben-leer', () => { const S = window.spiel.s; window.spiel.E.fuehreAus(S, { typ: 'sammelfreigabe', filter: {} }); window.spiel.einkauf.oeffne('freigaben'); }],
  ],
};

(async () => {
  fs.mkdirSync(ziel, { recursive: true });
  const opt = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROMIUM_PATH) opt.executablePath = process.env.CHROMIUM_PATH;
  const b = await chromium.launch(opt);
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const fehler = [];
  p.on('pageerror', (e) => { fehler.push(e.message); console.log('FEHLER', e.message); });
  await p.goto('file://' + path.join(__dirname, '..', 'spiel.html') + '?stadt=Essen&seed=1&leben=aus&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
  await p.waitForFunction('window.bereit === true', null, { timeout: 0, polling: 500 });
  await p.addScriptTag({ path: path.join(__dirname, '..', 'src', 'ui', 'stilpruefung.js') });
  await p.evaluate(() => { window.spiel.schliessePanel(); window.spiel.neuesSpiel(1, 'Essen'); for (let i = 0; i < 8; i++) window.spiel.woche(false); window.spiel.fokusHaeuser(); });
  const ruhig = async () => { await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await p.waitForTimeout(250); };
  const bild = async (name) => { await ruhig(); await p.evaluate(() => { const m = document.getElementById('meldung'); if (m) m.className = ''; document.querySelectorAll('.erfolge-toast-bild').forEach((x) => { const t = x.parentElement; if (t) t.style.display = 'none'; }); /* Banner-Überdeckung ist an Q30 gemeldet */ }); const f = path.join(ziel, name); await p.screenshot({ path: f }); console.log('gespeichert:', f); };
  const textPruefen = async (basis) => {
    const treffer = await p.evaluate(() => {
      const t = document.getElementById('panel').innerText;
      return [...new Set((t.match(/\b(undefined|null|NaN)\b|hc-[a-zäöü]+-\d+|premium-flagships/g) || []))];
    });
    if (treffer.length) { fehler.push(`${basis}: ${treffer.join(', ')}`); console.log('FEHLER Text', basis, treffer.join(', ')); }
    // Stilprüfung der Q30-Bausteine (nur Panels im dunklen Look)
    const stil = await p.evaluate(() => (document.querySelector('#panel .hk-bereich') ? window.hartwigStilpruefung('#panel') : null));
    if (stil?.length) { fehler.push(`${basis}: ${stil.length} Stilverstöße`); console.log('STIL', basis, stil.slice(0, 10).join(' | ')); }
  };
  const seiten = async (basis) => {
    await textPruefen(basis);
    const n = await p.evaluate(() => { const pi = document.getElementById('pinhalt'); pi.scrollTop = 0; return Math.min(3, Math.ceil(pi.scrollHeight / Math.max(1, pi.clientHeight))); });
    for (let i = 0; i < n; i++) {
      await p.evaluate((i) => { const pi = document.getElementById('pinhalt'); pi.scrollTop = i * (pi.clientHeight - 60); }, i);
      await bild(`${basis}-${i + 1}.png`);
    }
  };
  for (const [knopf, name] of PANELS) {
    if (nur && !nur.includes(name)) continue;
    await p.evaluate(() => window.spiel.schliessePanel());
    await p.tap('#menueknopf'); await p.waitForTimeout(150);
    const h = await p.$('#' + knopf);
    if (!h) { console.log('FEHLER Menüpunkt fehlt', knopf); continue; }
    await h.scrollIntoViewIfNeeded(); await h.tap(); await p.waitForTimeout(300);
    await seiten(`${name}`);
    const reiter = await p.evaluate(() => [...document.querySelectorAll('#pinhalt .tab, #pinhalt [role=tab]')].map((t) => t.textContent.trim()).filter(Boolean));
    const gesehen = new Set();
    for (let r = 1; r < reiter.length && r < 8; r++) {
      const t = reiter[r]; if (gesehen.has(t)) continue; gesehen.add(t);
      const ok = await p.evaluate((t) => { const e = [...document.querySelectorAll('#pinhalt .tab, #pinhalt [role=tab]')].find((x) => x.textContent.trim() === t); if (!e) return false; e.click(); return true; }, t);
      if (!ok) continue;
      await p.waitForTimeout(200);
      await seiten(`${name}-r${r}`);
    }
    for (const [x, f] of EXTRA[name] ?? []) {
      await p.evaluate(f); await p.waitForTimeout(250);
      await seiten(`${name}-x-${x}`);
    }
  }
  await b.close();
  if (fehler.length) process.exitCode = 1;
})();

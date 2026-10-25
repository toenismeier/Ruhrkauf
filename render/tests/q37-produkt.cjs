// Q37: Produktentwicklung mit Musterfeld und Anlass im Spiel (390 × 844): Ast „Anlass“ belegt den Anlass vor,
// Musterwahl ändert Bild, Name und Normpreis wie die Engine, Entwicklung startet mit Muster und Anlass,
// Produktkarte zeigt beides, Gründungsassistent bietet den Schwerpunkt Anlass. Bilder nach out/q37-*.png.
// Aufruf: node spiel-render.js --bundle && node tests/q37-produkt.cjs
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const opt = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] };
  if (process.env.CHROMIUM_PATH) opt.executablePath = process.env.CHROMIUM_PATH;
  const b = await chromium.launch(opt);
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const seitenFehler = [];
  p.on('pageerror', (e) => seitenFehler.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'spiel.html') + '?stadt=Essen&seed=1&leben=aus&ohne-animation=1', { waitUntil: 'load', timeout: 0 });
  await p.waitForFunction('window.bereit === true', null, { timeout: 0, polling: 500 });
  const warte = (ms) => p.waitForTimeout(ms);
  const klick = async (sel) => { const ok = await p.evaluate((s) => { const e = [...document.querySelectorAll('#pinhalt ' + s)].find((x) => !x.disabled); if (!e) return false; e.click(); return true; }, sel); await warte(150); return ok; };
  const f = [];
  // Platz schaffen: eine Bluse von Lisanne auslisten (Kapazität), dann Assistent „Neues Produkt“
  await p.evaluate(() => { const S = window.spiel, s = S.s; const x = s.produkte.liste.find((q) => q.marke === 'em1' && q.typ === 'Bluse' && q.status === 'sortiment'); S.E.fuehreAus(s, { typ: 'produktAuslisten', produkt: x.id }); S.produkte.oeffne('neu', 'em1'); });
  await warte(300);
  if (!(await klick('[data-a=baumKat][data-v="anlass"]'))) f.push('Ast „Anlass“ fehlt im Assistenten');
  await p.screenshot({ path: 'out/q37-anlass-ast.png' });
  if (!(await klick('[data-a=typ][data-v="Etuikleid"][data-anlass]'))) f.push('Etuikleid im Ast Anlass nicht wählbar');
  const ui1 = await p.evaluate(() => ({ ...window.spiel.produkte.ui.neu }));
  if (!ui1.anlass) f.push('Anlass nicht vorbelegt');
  await klick('[data-a=zielgruppe][data-v="teens"]');
  if (!(await klick('[data-a=muster][data-v="Punkte"]'))) f.push('Muster Punkte nicht wählbar');
  const vorher = await p.evaluate(() => { const S = window.spiel, e = S.produkte.ui.neu; return { e: { ...e }, uni: S.E.produktVorschau(S.s, { ...e, marke: 'em1', muster: undefined }), mit: S.E.produktVorschau(S.s, { ...e, marke: 'em1' }), name: document.querySelector('#pinhalt [data-p="n:name"]')?.textContent, gesperrt: [...document.querySelectorAll('#pinhalt [data-a=muster]')].filter((x) => x.disabled).map((x) => x.dataset.v), anlassChips: [...document.querySelectorAll('#pinhalt [data-a=anlass]')].length }; });
  if (vorher.e.muster !== 'Punkte') f.push('Muster nicht im Entwurf');
  if (!vorher.mit.ok) f.push('Vorschau mit Muster nicht ok: ' + vorher.mit.fehler);
  if (vorher.name !== vorher.mit.name || !/gepunktet/.test(vorher.name ?? '')) f.push(`Name in der Vorschau „${vorher.name}“ ≠ Engine „${vorher.mit.name}“`);
  if (!(vorher.mit.normpreis > vorher.uni.normpreis)) f.push('Muster ohne Preisaufschlag');
  if (vorher.anlassChips < 2) f.push('Anlass-Auswahl fehlt');
  await p.screenshot({ path: 'out/q37-muster-wahl.png', fullPage: false });
  await p.evaluate(() => { const el = document.querySelector('#pinhalt .hw-g1-muster'); el?.scrollIntoView({ block: 'center' }); });
  await warte(150);
  await p.screenshot({ path: 'out/q37-muster-raster.png' });
  const n0 = await p.evaluate(() => window.spiel.s.produkte.liste.length);
  await klick('[data-a=entwickeln]');
  const neu = await p.evaluate((n) => { const s = window.spiel.s; return s.produkte.liste.length > n ? s.produkte.liste[s.produkte.liste.length - 1] : null; }, n0);
  if (!neu) f.push('Entwicklung nicht gestartet');
  else {
    if (neu.muster !== 'Punkte') f.push('Produkt ohne Muster');
    if (!neu.anlass) f.push('Produkt ohne Anlass');
    const unter = await p.evaluate(() => [...document.querySelectorAll('#pinhalt .hw-g1-unter')].map((x) => x.textContent).join(' | '));
    if (!/Punkte/.test(unter) || !/Konfirmation|Feier|Tanzschulball/.test(unter)) f.push('Produktkarte ohne Muster oder Anlass: ' + unter.slice(0, 160));
    await p.screenshot({ path: 'out/q37-produktkarte.png' });
  }
  // Gründungsassistent: Vorlage Anlass und Festmode, Schwerpunkt in Schritt Profil
  const gr = await p.evaluate(() => window.spiel.E.EM_VORLAGEN.some((v) => v.entwurf.schwerpunkt === 'anlass'));
  if (!gr) f.push('Vorlage „Anlass und Festmode“ fehlt');
  if (seitenFehler.length) f.push('Seitenfehler: ' + seitenFehler.join(' / '));
  await b.close();
  console.log(f.length ? 'Q37 Produkt: ' + f.length + ' Fehler\n' + f.join('\n') : 'Q37 Produkt: 0 Fehler');
  process.exit(f.length ? 1 : 0);
})();

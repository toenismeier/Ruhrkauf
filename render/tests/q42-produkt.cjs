// Q42: Schnittvarianten im Produktentwickler (390 × 844): Bluse bietet „Schnitt“ mit Grundform und den Varianten,
// die Wahl ändert den Namen wie die Engine, die Entwicklung startet mit Variante, die Produktkarte zeigt sie.
// Haarspangen im Set (Kinderartikel) erscheint für Young Adults nur über seine Varianten, ohne Grundform. Bilder nach out/q42-*.png.
// Aufruf: node spiel-render.js --bundle && node tests/q42-produkt.cjs
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
  const schnitte = () => p.evaluate(() => [...document.querySelectorAll('#pinhalt [data-a=variante]')].map((x) => x.dataset.v));
  const f = [];
  // Platz schaffen: eine Bluse von Lisanne auslisten, Assistent mit Bluse für Teens im Schritt Gestaltung öffnen
  await p.evaluate(() => {
    const S = window.spiel, s = S.s; const x = s.produkte.liste.find((q) => q.marke === 'em1' && q.typ === 'Bluse' && q.status === 'sortiment');
    S.E.fuehreAus(s, { typ: 'produktAuslisten', produkt: x.id }); S.produkte.oeffne('neu', 'em1');
    const u = S.produkte.ui; u.neu.typ = 'Bluse'; u.neu.zielgruppe = 'teens'; u.zielgruppe = 'teens'; u.neu.material = 'Viskose'; u.neuSchritt = 2; S.produkte.neuZeichnen();
  });
  await warte(300);
  const wahl = await schnitte();
  if (wahl.join('|') !== '|Blazerbluse|Cape-Bluse') f.push('Schnittwahl Bluse: ' + wahl.join('|'));
  if (!(await klick('[data-a=variante][data-v="Cape-Bluse"]'))) f.push('Cape-Bluse nicht wählbar');
  const v = await p.evaluate(() => { const S = window.spiel, e = S.produkte.ui.neu; return { e: { ...e }, engine: S.E.produktVorschau(S.s, { ...e, marke: 'em1' }), name: document.querySelector('#pinhalt [data-p="n:name"]')?.textContent }; });
  if (v.e.variante !== 'Cape-Bluse') f.push('Variante nicht im Entwurf');
  if (!v.engine.ok) f.push('Vorschau mit Variante nicht ok: ' + v.engine.fehler);
  if (v.name !== v.engine.name || !/^Cape-Bluse /.test(v.name ?? '')) f.push(`Name in der Vorschau „${v.name}“ ≠ Engine „${v.engine.name}“`);
  await p.evaluate(() => document.querySelector('#pinhalt [data-a=variante]')?.scrollIntoView({ block: 'center' }));
  await warte(150);
  await p.screenshot({ path: 'out/q42-schnitt-wahl.png' });
  const n0 = await p.evaluate(() => window.spiel.s.produkte.liste.length);
  await klick('[data-a=entwickeln]');
  const neu = await p.evaluate((n) => { const s = window.spiel.s; return s.produkte.liste.length > n ? s.produkte.liste[s.produkte.liste.length - 1] : null; }, n0);
  if (!neu) f.push('Entwicklung nicht gestartet');
  else {
    if (neu.variante !== 'Cape-Bluse' || neu.typ !== 'Bluse') f.push(`Produkt ${neu.typ}/${neu.variante}`);
    const unter = await p.evaluate(() => [...document.querySelectorAll('#pinhalt .hw-g1-unter')].map((x) => x.textContent).join(' | '));
    if (!/Cape-Bluse/.test(unter)) f.push('Produktkarte ohne Variante: ' + unter.slice(0, 160));
    await p.screenshot({ path: 'out/q42-produktkarte.png' });
  }
  // Kinderartikel mit Varianten für Young Adults: in der Auswahl für Lisanne (Damen) sichtbar, nur als Variante
  const hs = await p.evaluate(() => {
    const S = window.spiel; S.produkte.oeffne('neu', 'em1');
    const u = S.produkte.ui; u.neu.typ = 'Haarspangen im Set'; u.neu.zielgruppe = 'young'; u.zielgruppe = 'young'; u.neu.material = 'Polyester'; u.neuSchritt = 2; S.produkte.neuZeichnen();
    const M = S.E.produkte(S.s).marken.find((m) => m.marke === 'em1');
    return { entwickelbar: M.entwickelbar.includes('Haarspangen im Set'), variante: u.neu.variante, schnitte: [...document.querySelectorAll('#pinhalt [data-a=variante]')].map((x) => x.dataset.v) };
  });
  if (!hs.entwickelbar) f.push('Haarspangen im Set für Lisanne nicht entwickelbar');
  if (hs.schnitte.join('|') !== 'Haarnadeln|Haarspange' || hs.variante !== 'Haarnadeln') f.push('Haarspangen im Set für Young Adults: ' + JSON.stringify(hs));
  if (seitenFehler.length) f.push('Seitenfehler: ' + seitenFehler.join(' / '));
  await b.close();
  console.log(f.length ? 'Q42 Produkt: ' + f.length + ' Fehler\n' + f.join('\n') : 'Q42 Produkt: 0 Fehler');
  process.exit(f.length ? 1 : 0);
})();

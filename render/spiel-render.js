// Aufruf: node spiel-render.js [--bundle] [--nur-haus] [--nur-werkzeuge] [--nur-einkauf] [--nur-panels] [--nur-karte] [--stadt Karlsruhe] [--seed 1]
// Bündelt src/spiel.js (Engine-TS direkt aus /home/claude/turnaround/src) nach spiel-bundle.js. Mit --bundle nur bündeln.
// Sonst headless im Hochformat 390 × 844: Woche 0, 26 und 52 mit Bot-Strategie C, dazu ein Bild mit offenem Hauspanel
// (out/spiel-w00.png, out/spiel-w26.png, out/spiel-w52.png, out/spiel-haus.png, out/spiel-hq-w00.png, out/spiel-hq.png, out/spiel-essen.png, out/spiel-essen-hq.png, out/spiel-hq-abteilungen.png), Messwerte nach out/spiel-messung.json.
// Q05 Abnahme: out/q05-produkte-gruendung.png, q05-marketing-gruendung.png, q05-erster-markenumsatz.png.\n// Einkauf (EINKAUF-VERTRAG.md, Prototyp): neues Spiel in Essen, 8 Wochen, dann Panels per Antippen mit Abgleich gegen die
// Engine-Abfragen und Aktionen (Freigabe, Kürzen, Ablehnen, Sammelfreigabe, Regler, Marke gründen) samt Wirkung in der
// Folgewoche: out/einkauf-uebersicht.png, einkauf-wg.png, einkauf-freigaben.png, eigenmarken.png, eigenmarke-gruenden.png,
// haus-eigenmarke.png, Ergebnis nach out/einkauf-pruefung.json. --nur-einkauf überspringt den Rest.
// Vorstand, Marketing, Produkte (VORSTAND-MARKETING-VERTRAG.md 5): Menü, Panels per Antippen, Abgleich jedes data-p-Werts gegen
// frische Abfragen, Klicktests (Delegation, Gehalt, Bonus, Einstellen, Kanalbudget, Kartenrabatt, CRM, Aktion planen und absagen,
// Preis, Sortiment, Produkt entwickeln) mit Folgewoche: out/menue.png, vorstand.png, vorstand-profil.png, vorstand-einstellen.png,
// marketing.png, marketing-crm.png, marketing-kalender.png, produkte.png, produkt-entwickeln.png, out/panels-pruefung.json.
// Karte: weitester Zoom, vier Ränder, Randpixel (Hintergrund magenta), Ecken erreichbar, Gesten (Wischen mit Trägheit, Pinch,
// Mausrad): out/karte-zoom-min.png, karte-rand-links/rechts/oben/unten.png, out/karte-pruefung.json.
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
function gitVersion() {
  try { return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return (process.env.GITHUB_SHA || '').slice(0, 7) || 'Entwicklung'; }
}
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };

// Porträts und Produktbilder (src/kit/portraet.js, src/kit/produktbild.js) baut ein anderer Agent; solange eine Datei fehlt,
// bündeln wir einen leeren Ersatz, die Oberfläche zeigt dann Platzhalter (typeof-Prüfung in den Panels).
const ERSATZ = { 'portraet.js': 'export const ERSATZ = true;', 'produktbild.js': 'export const ERSATZ = true;' };
const ersatzPlugin = { name: 'kit-ersatz', setup(b) {
  b.onResolve({ filter: /kit\/(portraet|produktbild)\.js$/ }, (a) => {
    const f = path.resolve(a.resolveDir, a.path);
    return fs.existsSync(f) ? { path: f } : { path: path.basename(f), namespace: 'ersatz' };
  });
  b.onLoad({ filter: /.*/, namespace: 'ersatz' }, (a) => ({ contents: ERSATZ[a.path], loader: 'js' }));
} };

async function buendeln() {
  // Das direkt aufgerufene Bundelskript erzeugt auch die für eine installierbare App
  // erforderlichen PNG-Dateien. Bei unveränderten Quellen bleibt dieser Schritt aus.
  const symbolQuelle = path.join(__dirname, 'src/kit/app-symbol.js');
  const icon = path.join(__dirname, 'app-icon-512.png');
  const startbild = path.join(__dirname, 'startbilder/start-1170x2532.png');
  if (!fs.existsSync(icon) || !fs.existsSync(startbild) ||
      fs.statSync(icon).mtimeMs < fs.statSync(symbolQuelle).mtimeMs) {
    await require('./symbol.js').symboleErzeugen();
  }
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'spiel.js')], bundle: true, outfile: path.join(__dirname, 'spiel-bundle.js'),
    loader: { '.json': 'json' }, logLevel: 'error', format: 'iife', target: 'es2020', plugins: [ersatzPlugin],
    // scripts/bot.ts prüft require.main === module (nur für den Aufruf in Node)
    define: { 'require.main': 'null', module: 'undefined', __HARTWIG_VERSION__: JSON.stringify(gitVersion()) },
  });
}

(async () => {
  const t0 = Date.now();
  await buendeln();
  console.log('gebündelt:', path.join(__dirname, 'spiel-bundle.js'), `${Date.now() - t0} ms`);
  if (process.argv.includes('--bundle')) return;
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  const stadt = arg('--stadt', 'Karlsruhe'), seed = arg('--seed', '1');
  const browserOptionen = { headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',  '--js-flags=--max-old-space-size=6144'] };
  if (process.env.CHROMIUM_PATH) browserOptionen.executablePath = process.env.CHROMIUM_PATH;
  const b = await chromium.launch(browserOptionen);
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  p.on('pageerror', (e) => console.log('FEHLER', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.log('KONSOLE', m.text()); });
  const animationen = process.argv.includes('--mit-animation') && !process.argv.includes('--ohne-animation');
  const url = 'file://' + path.join(__dirname, 'spiel.html') + `?stadt=${encodeURIComponent(stadt)}&seed=${seed}&leben=aus${animationen ? '' : '&ohne-animation=1'}`;
  await p.goto(url, { waitUntil: 'load', timeout: 0 });
  await p.waitForFunction('window.bereit === true', null, { timeout: 0, polling: 500 });
  const bild = async (name) => {
    await p.waitForFunction('window.spiel.kachelnRuhig()', null, { timeout: 0, polling: 200 });
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await p.waitForTimeout(300);
    const f = path.join(__dirname, 'out', name);
    await p.screenshot({ path: f });
    console.log('gespeichert:', f);
  };

  // ─────────────────────────────────────────── Einkauf und Eigenmarken
  async function einkaufPruefen() {
    const erg = { pruefungen: [], aktionen: [], fehler: [] };
    const ev = (f, a) => p.evaluate(f, a);
    const tippe = async (sel, text) => {
      const h = await p.evaluateHandle(({ sel, text }) => [...document.querySelectorAll(sel)].find((e) => !text || e.textContent.replace(/^EM/, '').trim().startsWith(text)) ?? null, { sel, text });
      const el = h.asElement();
      if (!el) { erg.fehler.push(`nicht gefunden: ${sel} ${text ?? ''}`); return false; }
      await el.scrollIntoViewIfNeeded();
      await el.tap();
      await p.waitForTimeout(150);
      return true;
    };
    const pruef = async (wann) => { const r = await ev(() => window.spiel.pruefeEinkauf()); erg.pruefungen.push({ wann, ...r }); console.log(`Einkauf ${wann}: ${r.werte} Werte, ${r.fehler.length ? 'FEHLER ' + r.fehler.slice(0, 5).join('; ') : '0 Abweichungen'}`); };
    const pruefSoll = (name, ok, info) => { erg.aktionen.push({ name, ok, info }); console.log(`${ok ? 'OK ' : 'FEHLER'} ${name}: ${info}`); if (!ok) erg.fehler.push(name); };
    await ev(() => { window.spiel.neuesSpiel(1, 'Essen'); for (let i = 0; i < 8; i++) window.spiel.woche(false); });
    await ev(() => window.spiel.fokusHaeuser());
    // Badge am Knopf
    const badge = await ev(() => ({ text: document.getElementById('ekbadge').textContent, sichtbar: document.getElementById('ekbadge').style.display !== 'none', soll: window.spiel.E.freigaben(window.spiel.s).anzahl }));
    pruefSoll('Badge am Knopf Einkauf', badge.sichtbar && Number(badge.text) === badge.soll, `${badge.text} offene Freigaben`);
    // Übersicht: Knopf antippen, Bereich Damen ist offen, Spalte Reichweite wählen, nach Reichweite sortieren
    await tippe('#menueknopf');
    await tippe('#einkauf');
    await tippe('.chipk', 'Reichweite');
    await tippe('.lkopf button', 'Reichweite');
    await pruef('Übersicht');
    await ev(() => { document.getElementById('pinhalt').scrollTop = 0; });
    await bild('einkauf-uebersicht.png');
    // WG-Detail: Kleider antippen, Servicegrad 98 % setzen
    await tippe('.lzeile.wgz', 'Kleider');
    await pruef('WG-Detail');
    await tippe('[data-a=servicegrad][data-v="0.98"]');
    await pruef('WG-Detail nach Regler');
    await ev(() => { const k = document.querySelector('.kurve'), pi = document.getElementById('pinhalt'); pi.scrollTop += k.getBoundingClientRect().top - pi.getBoundingClientRect().top - 66; });
    await bild('einkauf-wg.png');
    const sg = await ev(() => window.spiel.E.wgDetail(window.spiel.s, 'damen.kleider').steuerung.servicegrad);
    pruefSoll('Regler Servicegrad', sg === 0.98, `Servicegrad Kleider ${sg}`);
    // Freigaben
    await tippe('.tab', 'Freigaben');
    await pruef('Freigaben');
    await ev(() => { document.getElementById('meldung').className = ''; });
    await bild('einkauf-freigaben.png');
    const vorher = await ev(() => { const s = window.spiel.s, l = window.spiel.E.freigaben(s).liste; return { l: l.slice(0, 3).map((o) => ({ id: o.id, wg: o.wg, wert: o.wert, lieferungen: o.lieferungen })), anzahl: l.length, cash: s.cash }; });
    const orders = (wg) => ev((wg) => window.spiel.E.wgDetail(window.spiel.s, wg).kennzahlen.offeneOrders, wg);
    const [a, bb, c] = vorher.l;
    const oA = await orders(a.wg);
    await tippe(`[data-a=frei][data-v="${a.id}"]`);
    const nA = await orders(a.wg);
    const weg = await ev((id) => !window.spiel.E.freigaben(window.spiel.s).liste.some((o) => o.id === id), a.id);
    pruefSoll('Einzelfreigabe', weg && nA > oA, `${a.id} ${a.wg}: offene Orders ${oA} → ${nA} (Order ${a.wert})`);
    const oB = await orders(bb.wg);
    await tippe(`[data-a=orderAuf][data-v="${bb.id}"]`); // Q31: Kürzen/Ablehnen erst nach Antippen der Orderzeile
    await tippe(`[data-a=kuerzenAuf][data-v="${bb.id}"]`);
    await tippe(`[data-a=kuerzen][data-v="${bb.id}"][data-p2="25"]`);
    const nB = await orders(bb.wg);
    pruefSoll('Kürzen um 25 % und freigeben', Math.abs(nB - oB - bb.wert * 0.75) <= bb.lieferungen.length + 1, `${bb.wg}: offene Orders +${nB - oB} bei Order ${bb.wert}`);
    await tippe(`[data-a=orderAuf][data-v="${c.id}"]`);
    await tippe(`[data-a=ablehnen][data-v="${c.id}"]`);
    const wegC = await ev((id) => !window.spiel.E.freigaben(window.spiel.s).liste.some((o) => o.id === id), c.id);
    pruefSoll('Ablehnen', wegC, c.id);
    const grenzeVorher = await ev(() => window.spiel.E.freigaben(window.spiel.s).grenze);
    await tippe('[data-a=grenze][data-v="10000"]');
    const gr = await ev(() => window.spiel.E.freigaben(window.spiel.s).grenze);
    const grenzeSoll = grenzeVorher + 10000;
    pruefSoll('Freigabegrenze +10.000 €', gr === grenzeSoll, `${gr} € (Start ${grenzeVorher} €)`);
    await tippe('[data-a=filterArt][data-v=nos]');
    const nos = await ev(() => window.spiel.E.freigaben(window.spiel.s, { art: 'nos' }).anzahl);
    await pruef('Freigaben Filter NOS');
    if (nos) await tippe('[data-a=sammel]');
    const nosDanach = await ev(() => window.spiel.E.freigaben(window.spiel.s, { art: 'nos' }).anzahl);
    pruefSoll('Sammelfreigabe NOS', nosDanach === 0, `${nos} NOS-Orders freigegeben, offen ${nosDanach}`);
    await pruef('Freigaben nach Aktionen');
    // O05 Ware: Merchandise, Allokation und Reduzierung öffnen sich und zeigen Engine-Werte.
    for (const reiter of ['Merchandise', 'Allokation', 'Reduzierung']) { await tippe('.tab', reiter); await pruef(reiter); }
    // Eigenmarken und Gründen über den Assistenten (Vorlage Young Adults)
    await tippe('.tab', 'Eigenmarken');
    await pruef('Eigenmarken');
    await ev(() => { document.getElementById('meldung').className = ''; });
    await bild('eigenmarken.png');
    await tippe('[data-a=emGruenden]');
    await tippe('[data-a=emVorlage]', 'Young Adults');
    for (let i = 0; i < 4; i++) await tippe('[data-a=emWeiter]');
    await ev(() => { const i = document.querySelector('[data-a=emName]'); i.value = 'Kiez & Co.'; i.dispatchEvent(new Event('change', { bubbles: true })); });
    await p.waitForTimeout(150);
    await tippe('[data-a=emFarbe][data-v="#2f63b5"]');
    await pruef('Assistent letzter Schritt');
    await ev(() => { document.getElementById('pinhalt').scrollTop = 0; document.getElementById('meldung').className = ''; });
    await bild('eigenmarke-gruenden.png');
    const v = await ev(() => window.spiel.E.eigenmarkeVorschau(window.spiel.s, window.spiel.einkauf.ui.em.assistent.daten));
    const cash0 = await ev(() => window.spiel.s.cash);
    await tippe('[data-a=emFertig]');
    const neu = await ev(() => window.spiel.s.eigenmarken.marken.find((m) => m.name === 'Kiez & Co.'));
    const cash1 = await ev(() => window.spiel.s.cash);
    pruefSoll('Marke gründen', !!neu && neu.status === 'aufbau' && cash0 - cash1 === v.kosten, `Kiez & Co. ${neu?.status}, Kosten ${cash0 - cash1} (Vorschau ${v.kosten}), WG ${Object.keys(neu?.wgAnteile ?? {}).join(', ')}`);
    await pruef('Eigenmarken nach Gründung');
    // Woche weiter: Wirkung prüfen
    const vorWoche = await ev(() => { const s = window.spiel.s; return { woche: s.woche, kleider: window.spiel.E.wgDetail(s, 'damen.kleider').kennzahlen.nosVerfuegbarkeit }; });
    await ev(() => window.spiel.woche(false));
    const nach = await ev(({ a, bb, c }) => {
      const s = window.spiel.s, pr = s.einkauf.protokoll[s.einkauf.protokoll.length - 1];
      const ids = new Set(window.spiel.E.freigaben(s).liste.map((o) => o.id));
      const m = s.eigenmarken.marken.find((x) => x.name === 'Kiez & Co.');
      return { woche: s.woche, offenAbc: [a, bb, c].filter((id) => ids.has(id)), servicegrad: window.spiel.E.wgDetail(s, 'damen.kleider').steuerung.servicegrad, marke: m && { status: m.status, bis: m.bis }, grenze: s.einkauf.grenze, karte: window.spiel.E.eigenmarkenUebersicht(s).marken.some((x) => x.name === 'Kiez & Co.'), protokoll: pr };
    }, { a: a.id, bb: bb.id, c: c.id });
    pruefSoll('Folgewoche: entschiedene Orders bleiben erledigt', nach.offenAbc.length === 0, `Woche ${vorWoche.woche} → ${nach.woche}`);
    pruefSoll('Folgewoche: Regler und Grenze wirken weiter', nach.servicegrad === 0.98 && nach.grenze === grenzeSoll, `Servicegrad ${nach.servicegrad}, Grenze ${nach.grenze}`);
    pruefSoll('Folgewoche: neue Marke im Aufbau mit Karte', !!nach.marke && nach.karte, `${JSON.stringify(nach.marke)}`);
    console.log('Protokoll Folgewoche:', JSON.stringify(nach.protokoll));
    await pruef('Eigenmarken Folgewoche');
    // Haus mit Eigenmarken-Shop: Etage ansehen
    const haus = await ev(() => {
      const s = window.spiel.s, E = window.spiel.E;
      const je = E.eigenmarkenUebersicht(s).jeBereich;
      for (const h of s.haeuser.filter((x) => x.stadt === 'Essen' && x.format === 'warenhaus' && x.status === 'offen')) {
        const sh = window.spiel.EQ.shops(s, h, je);
        const f = h.flaechen.find((x) => sh[x.gruppe] && x.konzept === 'eigen' && x.etage > 0) ?? h.flaechen.find((x) => sh[x.gruppe] && x.konzept === 'eigen');
        if (f) return { id: h.id, etage: f.etage, shop: sh[f.gruppe] };
      }
      return null;
    });
    if (haus) {
      await ev(() => window.spiel.schliessePanel());
      await ev((id) => window.spiel.oeffneHaus(id), haus.id);
      await tippe('.karte .khead .mini', undefined).catch(() => {});
      await ev(({ id, etage }) => window.spiel.hausEtage(id, etage), haus);
      await p.waitForTimeout(300);
      const ib = await ev(() => window.spiel.innenbild);
      pruefSoll('Eigenmarken-Shop im Innenraum', ib?.shops?.includes(haus.shop.name), `${haus.id} Etage ${haus.etage}: ${ib?.shops?.join(', ')}`);
      await ev(() => { const k = document.querySelectorAll('.haus3d')[1] ?? document.querySelector('.haus3d'), pi = document.getElementById('pinhalt'); pi.scrollTop += k.getBoundingClientRect().top - pi.getBoundingClientRect().top - 8; });
      await bild('haus-eigenmarke.png');
    } else pruefSoll('Eigenmarken-Shop im Innenraum', false, 'kein Haus mit Shop in Essen');
    await ev(() => window.spiel.schliessePanel());
    erg.abweichungen = erg.pruefungen.reduce((x, q) => x + q.fehler.length, 0);
    // Q05: iPhone-Abnahme über Produktentwicklung und Marketing direkt zum Gründungsassistenten,
    // anschließend echte Wochen bis zur ersten in der Engine gebuchten Markenumsatz-Kennzahl.
    await ev(() => window.spiel.oeffneProdukte());
    const neuImProdukt = await tippe('[data-a=eigenmarkeGruenden]');
    pruefSoll('Q05: Gründung aus Produktentwicklung erreichbar',
      neuImProdukt && (await ev(() => window.spiel.einkauf.ui.seite)) === 'gruenden', 'Assistent über Produkte');
    await bild('q05-produkte-gruendung.png');
    await ev(() => window.spiel.oeffneMarketing());
    const neuImMarketing = await tippe('[data-a=eigenmarkeGruenden]');
    pruefSoll('Q05: Gründung aus Marketing erreichbar',
      neuImMarketing && (await ev(() => window.spiel.einkauf.ui.seite)) === 'gruenden', 'Assistent über Marketing');
    await bild('q05-marketing-gruendung.png');
    await ev(() => window.spiel.oeffneEinkauf('eigenmarken'));
    // Für den Markenumsatz benötigt die neue Ware einen realen Beschaffungsvorlauf;
    // die wöchentlichen Sammelfreigaben stellen die Warenverfügbarkeit her.
    const ersteUmsatzWoche = await ev(() => {
      const S = window.spiel.s, E = window.spiel.E;
      for (let i = 0; i < 52 && S.phase !== 'zerschlagen'; i++) {
        const m = E.eigenmarkenUebersicht(S).marken.find((x) => x.name === 'Kiez & Co.');
        if (m?.umsatz13 > 0) return { woche: S.woche, umsatz: m.umsatz13, status: m.status };
        E.fuehreAus(S, { typ: 'sammelfreigabe' });
        E.wocheAbspielen(S);
      }
      const m = E.eigenmarkenUebersicht(S).marken.find((x) => x.name === 'Kiez & Co.');
      return { woche: S.woche, umsatz: m?.umsatz13 ?? 0, status: m?.status ?? 'fehlt' };
    });
    pruefSoll('Q05: Erste Eigenmarkenumsätze real gebucht', ersteUmsatzWoche.umsatz > 0,
      JSON.stringify(ersteUmsatzWoche));
    await ev(() => window.spiel.oeffneEinkauf('eigenmarken'));
    await bild('q05-erster-markenumsatz.png');
    fs.writeFileSync(path.join(__dirname, 'out', 'einkauf-pruefung.json'), JSON.stringify(erg, null, 1));
    console.log(`Einkauf: ${erg.pruefungen.reduce((x, q) => x + q.werte, 0)} Werte geprüft, ${erg.abweichungen} Abweichungen, ${erg.aktionen.filter((x) => x.ok).length}/${erg.aktionen.length} Aktionen ok`);
    return erg;
  }
  // ─────────────────────────────────────────── Karte: Zoomgrenze, Ränder, Gesten
  async function kartePruefen() {
    const erg = { staedte: [], gesten: [], fehler: [] };
    const ok = (name, bed, info) => { erg.gesten.push({ name, ok: bed, info }); console.log(`${bed ? 'OK ' : 'FEHLER'} ${name}: ${info}`); if (!bed) erg.fehler.push(name); };
    const sichtbarEcke = (m, p, a) => { const x = p.x - m.mitte.x, z = p.z - m.mitte.z, r = (x - z) / Math.SQRT2, v = -(x + z) / (2 * Math.SQRT2); return Math.abs(r) <= m.halb * a + 0.5 && Math.abs(v) <= m.halb + 0.5; };
    const a = 390 / 844;
    for (const st of process.argv.includes('--nur-gesten') ? [] : ['Essen', 'Karlsruhe', 'Berlin', 'Gelsenkirchen']) {
      const da = await p.evaluate((st) => { try { window.spiel.stadt(st); window.spiel.schliessePanel(); return true; } catch (e) { return false; } }, st);
      if (!da) continue;
      await p.evaluate((an) => window.spiel.kachelnPause(an), st !== 'Essen');
      const G = (await p.evaluate(() => window.spiel.karte.messen())).G;
      const eintrag = { stadt: st, raender: {} };
      // ganz herausgezoomt in der Mitte
      await p.evaluate(({ G }) => window.spiel.kamera({ halb: 1e5, x: (G.x0 + G.x1) / 2, z: (G.z0 + G.z1) / 2 }), { G });
      const m0 = await p.evaluate(() => window.spiel.karte.messen());
      const r0 = await p.evaluate(() => window.spiel.karte.randPixel());
      Object.assign(eintrag, { max: Math.round(m0.max), halb3: Math.round(m0.zoom.halb3), halbReich: Math.round(m0.zoom.halbReich), bindend: m0.zoom.bindend, bildbreiteM: Math.round(m0.bildbreite), planbreiteM: G.x1 - G.x0, anteilBreite: +m0.anteilBreite.toFixed(3), anteilProjiziert: +m0.anteilProjiziert.toFixed(3), randPixelMitte: r0.randPixel });
      if (st === 'Essen') await bild('karte-zoom-min.png');
      // vier Ränder: ganz heraus und so weit wie möglich nach links, rechts, oben, unten schieben
      const RICHTUNG = { links: [-1, 1], rechts: [1, -1], oben: [-1, -1], unten: [1, 1] };
      const ecken = [{ x: G.x0, z: G.z0, n: 'x0z0' }, { x: G.x1, z: G.z0, n: 'x1z0' }, { x: G.x0, z: G.z1, n: 'x0z1' }, { x: G.x1, z: G.z1, n: 'x1z1' }];
      const gesehen = new Set();
      for (const [rand, [dx, dz]] of Object.entries(RICHTUNG)) {
        await p.evaluate(({ dx, dz }) => window.spiel.kamera({ halb: 1e5, x: dx * 1e5, z: dz * 1e5 }), { dx, dz });
        const m = await p.evaluate(() => window.spiel.karte.messen());
        const r = await p.evaluate(() => window.spiel.karte.randPixel());
        for (const e of ecken) if (sichtbarEcke(m, e, a)) gesehen.add(e.n);
        eintrag.raender[rand] = { mitte: { x: Math.round(m.mitte.x), z: Math.round(m.mitte.z) }, mitteInG: m.mitteInG, eckenInE: m.eckenInE, randPixel: r.randPixel };
        if (st === 'Essen') await bild(`karte-rand-${rand}.png`);
      }
      // Ecken der Stadt bei weitestem Zoom: in jede Ecke schieben
      for (const e of ecken) {
        await p.evaluate((e) => window.spiel.kamera({ halb: 1e5, x: e.x, z: e.z }), e);
        const m = await p.evaluate(() => window.spiel.karte.messen());
        if (sichtbarEcke(m, e, a)) gesehen.add(e.n);
      }
      eintrag.eckenErreicht = `${gesehen.size}/4`;
      erg.staedte.push(eintrag);
      const rp = Object.values(eintrag.raender).reduce((x, q) => x + q.randPixel, 0) + eintrag.randPixelMitte;
      ok(`${st} Grenze`, rp === 0 && Object.values(eintrag.raender).every((q) => q.eckenInE && q.mitteInG) && gesehen.size === 4, `max halb ${eintrag.max} (${eintrag.bindend}), Bildbreite ${eintrag.bildbreiteM} m = ${(eintrag.anteilBreite * 100).toFixed(1)} % der Stadtbreite ${eintrag.planbreiteM} m, Randpixel ${rp}, Ecken ${eintrag.eckenErreicht}`);
    }
    // Gesten in Essen über CDP-Touch (erzeugt echte Pointer-Events)
    await p.evaluate(() => { window.spiel.kachelnPause(true); window.spiel.stadt('Essen'); window.spiel.schliessePanel(); });
    const cdp = await p.context().newCDPSession(p);
    let uhr = Date.now() / 1000;
    // Zeitstempel der Eingaben im Abstand von 12 ms (wie ein Finger auf dem iPhone), unabhängig von der Renderzeit im Prüfbrowser
    const touch = (type, pts) => { uhr += 0.012; return cdp.send('Input.dispatchTouchEvent', { type, timestamp: uhr, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) }); };
    const K = () => p.evaluate(() => ({ x: window.spiel.K.x, z: window.spiel.K.z, halb: window.spiel.K.halb }));
    await p.evaluate(() => window.spiel.kamera({ halb: 120 }));
    // Wischen nach links mit Schwung
    let k0 = await K();
    await touch('touchStart', [[300, 500]]);
    for (let i = 1; i <= 8; i++) await touch('touchMove', [[300 - i * 25, 500]]);
    await touch('touchEnd', []);
    let k1 = await K();
    console.log('Loslassen:', JSON.stringify(await p.evaluate(() => window.spiel.karte.info)));
    // Der Prüfbrowser rendert langsam (Software-GL): bis 20 s auf das Ende des Nachlaufs warten, gemessen wird der Weg bis dahin
    await p.waitForFunction('!window.spiel.karte.laeuft', null, { timeout: 20000, polling: 200 }).catch(() => {});
    const k2 = await K();
    const zug = Math.hypot(k1.x - k0.x, k1.z - k0.z), nach = Math.hypot(k2.x - k1.x, k2.z - k1.z);
    ok('Wischen verschiebt die Karte', zug > 50, `${zug.toFixed(0)} m beim Ziehen über 200 px`);
    ok('Trägheit nach dem Loslassen', nach > 10, `${nach.toFixed(0)} m Nachlauf`);
    ok('Wischen nach links bewegt die Mitte nach rechts im Bild', (k1.x - k0.x) - (k1.z - k0.z) > 0, `dx ${(k1.x - k0.x).toFixed(0)}, dz ${(k1.z - k0.z).toFixed(0)}`);
    // Pinch auseinander: hineinzoomen
    k0 = await K();
    await touch('touchStart', [[150, 420], [240, 420]]);
    for (let i = 1; i <= 6; i++) { await touch('touchMove', [[150 - i * 15, 420], [240 + i * 15, 420]]); await p.waitForTimeout(12); }
    await touch('touchEnd', []);
    k1 = await K();
    ok('Pinch zoomt hinein', k1.halb < k0.halb * 0.6, `halb ${k0.halb.toFixed(0)} → ${k1.halb.toFixed(0)}`);
    // Pinch zusammen bis zur Grenze
    for (let n = 0; n < 4; n++) {
      await touch('touchStart', [[60, 420], [330, 420]]);
      for (let i = 1; i <= 6; i++) { await touch('touchMove', [[60 + i * 20, 420], [330 - i * 20, 420]]); await p.waitForTimeout(10); }
      await touch('touchEnd', []);
    }
    const mz = await p.evaluate(() => window.spiel.karte.messen());
    ok('Pinch zusammen endet am weitesten Zoom', Math.abs(mz.halb - mz.max) < 0.01 && mz.eckenInE, `halb ${mz.halb.toFixed(0)} = max ${mz.max.toFixed(0)}`);
    // Mausrad
    k0 = await K();
    await p.mouse.move(195, 420);
    await p.mouse.wheel(0, -400);
    await p.waitForTimeout(100);
    k1 = await K();
    ok('Mausrad zoomt', k1.halb < k0.halb, `halb ${k0.halb.toFixed(0)} → ${k1.halb.toFixed(0)}`);
    await p.evaluate(() => window.spiel.kamera({ halb: 1 }));
    const mn = await p.evaluate(() => window.spiel.karte.messen());
    ok('Zoom nach innen begrenzt', mn.halb === mn.min, `min halb ${mn.min}`);
    await cdp.detach();
    await p.evaluate(() => window.spiel.kachelnPause(false));
    fs.writeFileSync(path.join(__dirname, 'out', 'karte-pruefung.json'), JSON.stringify(erg, null, 1));
    console.log('Karte:', JSON.stringify(erg.staedte));
    return erg;
  }
  // ─────────────────────────────────────────── Vorstand, Marketing, Produktentwicklung
  async function panelsPruefen() {
    const erg = { pruefungen: [], aktionen: [], fehler: [] };
    const ev = (f, a) => p.evaluate(f, a);
    const tippe = async (sel, text) => {
      const h = await p.evaluateHandle(({ sel, text }) => [...document.querySelectorAll(sel)].find((e) => !e.disabled && (!text || e.textContent.trim().startsWith(text))) ?? null, { sel, text });
      const el = h.asElement();
      if (!el) { erg.fehler.push(`nicht gefunden: ${sel} ${text ?? ''}`); console.log(`FEHLER nicht gefunden: ${sel} ${text ?? ''}`); return false; }
      await el.scrollIntoViewIfNeeded();
      await el.tap();
      await p.waitForTimeout(120);
      return true;
    };
    const pruef = async (modul, wann) => { const r = await ev((m) => window.spiel[m].pruefe(), modul); erg.pruefungen.push({ modul, wann, ...r }); console.log(`${modul} ${wann}: ${r.werte} Werte, ${r.fehler.length ? 'FEHLER ' + r.fehler.slice(0, 4).join('; ') : '0 Abweichungen'}`); };
    const soll = (name, ok, info) => { erg.aktionen.push({ name, ok, info }); console.log(`${ok ? 'OK ' : 'FEHLER'} ${name}: ${info}`); if (!ok) erg.fehler.push(name); };
    const oben = () => ev(() => { document.getElementById('pinhalt').scrollTop = 0; document.getElementById('meldung').className = ''; });
    const zu = async (sel) => { await ev((sel) => { const k = document.querySelector(sel), pi = document.getElementById('pinhalt'); if (k) pi.scrollTop += k.getBoundingClientRect().top - pi.getBoundingClientRect().top - 8; document.getElementById('meldung').className = ''; }, sel); };
    const meld = () => ev(() => document.getElementById('meldung').textContent);
    await ev(() => { window.spiel.schliessePanel(); window.spiel.neuesSpiel(1, 'Essen'); for (let i = 0; i < 8; i++) window.spiel.woche(false); window.spiel.fokusHaeuser(); });
    // Menü
    await tippe('#menueknopf');
    await bild('menue.png');
    // ── Vorstand: Übersicht
    await tippe('#vorstand');
    await pruef('vorstand', 'Übersicht');
    await oben();
    await bild('vorstand.png');
    const besetzt = await ev(() => window.spiel.E.vorstandUebersicht(window.spiel.s).ressorts.map((r) => ({ id: r.id, besetzt: r.besetzt })));
    soll('Vorstand: Start mit unbesetztem CRO und CDO', besetzt.filter((r) => !r.besetzt).map((r) => r.id).sort().join(',') === 'cdo,cro', besetzt.filter((r) => !r.besetzt).map((r) => r.id).join(', '));
    // Profil CPO: Delegation, Gehalt, Erfolgsbonus
    await tippe('.vkarte[data-v=cpo]');
    await pruef('vorstand', 'Profil CPO');
    const vor = await ev(() => window.spiel.E.vorstandProfil(window.spiel.s, 'cpo'));
    await tippe('.schalter[data-v=produktentwicklung]');
    await tippe('[data-a=gehalt][data-v="1"]');
    await tippe('[data-a=erfolgsbonus][data-v="0.2"]');
    const nach = await ev(() => window.spiel.E.vorstandProfil(window.spiel.s, 'cpo'));
    soll('Delegation Produktentwicklung umschalten', nach.delegationen.find((d) => d.id === 'produktentwicklung').an !== vor.delegationen.find((d) => d.id === 'produktentwicklung').an, `an: ${nach.delegationen.find((d) => d.id === 'produktentwicklung').an}`);
    soll('Gehalt +', nach.person.gehalt === vor.person.gehalt + vor.gehaltsSchritt, `${vor.person.gehalt} → ${nach.person.gehalt}`);
    soll('Erfolgsbonus 20 %', nach.person.erfolgsbonus === 0.2, `${nach.person.erfolgsbonus}`);
    await pruef('vorstand', 'Profil CPO nach Aktionen');
    await oben();
    await bild('vorstand-profil.png');
    await zu('.karte.steuerung');
    await bild('vorstand-verguetung.png');
    // Einstellen CRO: Karussell, Angebot, Annahmechance
    await tippe('.zurueck');
    await tippe('.vkarte[data-v=cro]');
    await tippe('[data-a=einstellen]');
    await tippe('.punkte button[data-v="1"]');
    await tippe('[data-a=angebotGehalt][data-v="1"]');
    await tippe('[data-a=angebotGehalt][data-v="1"]');
    await tippe('[data-a=angebotHalte][data-v="0.25"]');
    await pruef('vorstand', 'Einstellen CRO');
    const ang = await ev(() => { const v = window.spiel.vorstand.ui, A = v.angebot, L = window.spiel.E.kandidaten(window.spiel.s, 'cro'), k = L.kandidaten.find((x) => x.id === A.id); return { A, k: { name: k.name, forderung: k.gehaltsforderung }, idx: v.k, chance: window.spiel.E.angebotsChance(window.spiel.s, 'cro', A.id, A.gehalt, Math.round(A.gehalt * A.halte), A.erfolg), angezeigt: document.querySelector('[data-p="a:chance"]').textContent, karussell: Math.round(document.querySelector('.karussell').scrollLeft) }; });
    soll('Karussell auf Kandidat 2', ang.idx === 1 && ang.karussell > 100, `Index ${ang.idx}, scrollLeft ${ang.karussell}`);
    soll('Angebot über Forderung', ang.A.gehalt === ang.k.forderung + 20000, `${ang.k.name}: ${ang.A.gehalt} bei Forderung ${ang.k.forderung}, Chance ${ang.angezeigt}`);
    await ev(() => { const k = document.querySelector('.karussell'), pi = document.getElementById('pinhalt'); pi.scrollTop += k.getBoundingClientRect().top - pi.getBoundingClientRect().top - 60; document.getElementById('meldung').className = ''; });
    await bild('vorstand-einstellen.png');
    await tippe('[data-a=anbieten]');
    const nachAngebot = await ev((name) => { const r = window.spiel.E.vorstandUebersicht(window.spiel.s).ressorts.find((x) => x.id === 'cro'); return { besetzt: r.besetzt, name: r.person?.name, meldung: document.getElementById('meldung').textContent, gehalt: r.person?.gehalt }; }, ang.k.name);
    soll('Angebot entschieden', nachAngebot.besetzt ? nachAngebot.name === ang.k.name && nachAngebot.gehalt === ang.A.gehalt : /lehnt ab/.test(nachAngebot.meldung), `${nachAngebot.meldung}`);
    await pruef('vorstand', 'nach Angebot');
    // ── Marketing
    await ev(() => window.spiel.schliessePanel());
    await tippe('#menueknopf');
    await tippe('#marketing');
    await pruef('marketing', 'Übersicht');
    await oben();
    await bild('marketing.png');
    await tippe('.tab', 'Kanäle');
    const kb0 = await ev(() => window.spiel.E.kanaele(window.spiel.s).kanaele.find((k) => k.id === 'online').budgetWoche);
    // Q16: exakt derselbe Kanalbudget-Aktionspfad wie zuvor, jetzt über den Wochenbudget-Regler.
    await ev(() => {
      const el = document.querySelector('[data-a="kanalBudgetSlider"][data-k="online"]');
      const budget = window.spiel.E.kanaele(window.spiel.s).kanaele.find((k) => k.id === 'online').budgetWoche;
      el.value = String(Math.round(budget * 1.1 / 100) * 100);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const kb1 = await ev(() => window.spiel.E.kanaele(window.spiel.s).kanaele.find((k) => k.id === 'online').budgetWoche);
    soll('Kanal Online +10 %', Math.abs(kb1 / kb0 - 1.1) < 0.01, `${kb0} → ${kb1} € je Woche`);
    await pruef('marketing', 'Kanäle');
    await tippe('.tab', 'Städte');
    const markt = await ev(() => window.spiel.E.marketingStaedte(window.spiel.s));
    soll('Q16 Marktanteile 100 %', markt.staedte.every((x) => Math.abs(Object.values(x.marktanteile).reduce((a, b) => a + b, 0) - 1) < 0.000001), markt.staedte.length + ' Städte');
    await pruef('marketing', 'Städte und Marktanteil');
    await tippe('.tab', 'Karte');
    await tippe('[data-a=kartenrabatt][data-v="0.02"]');
    const kr = await ev(() => window.spiel.E.kundenkarte(window.spiel.s).kartenrabatt);
    soll('Kartenrabatt 2 %', kr === 0.02, `${kr}`);
    await pruef('marketing', 'Karte und App');
    await tippe('.tab', 'CRM');
    const crm0 = await ev(() => window.spiel.E.crmKampagnen(window.spiel.s).kampagnen.length);
    await ev(() => { const s = document.querySelector('[data-a=crmSeg]'); const i = window.spiel.E.crmKampagnen(window.spiel.s).segmente.findIndex((x) => x.segment.typ === 'inaktive'); s.value = String(i); s.dispatchEvent(new Event('change', { bubbles: true })); });
    await p.waitForTimeout(100);
    await tippe('[data-a=crmProzent][data-v="0.2"]');
    await tippe('[data-a=crmFrequenz][data-v=zweiwoechentlich]');
    await pruef('marketing', 'CRM-Baukasten');
    await oben();
    await bild('marketing-crm.png');
    await tippe('[data-a=crmStart]');
    const crm1 = await ev(() => { const l = window.spiel.E.crmKampagnen(window.spiel.s).kampagnen; return { n: l.length, neu: l[l.length - 1] }; });
    soll('CRM-Kampagne anlegen', crm1.n === crm0 + 1 && crm1.neu.segment.typ === 'inaktive' && crm1.neu.angebot.prozent === 0.2, `${crm1.neu.name}: ${crm1.neu.segmentText}, ${crm1.neu.angebotText}, ${crm1.neu.frequenzText}, ${crm1.neu.status}`);
    await pruef('marketing', 'CRM nach Anlegen');
    await tippe('.tab', 'Kalender');
    const kal0 = await ev(() => window.spiel.E.aktionskalender(window.spiel.s).eintraege.length);
    await tippe('[data-a=planen]');
    await ev(() => { const s = document.querySelector('[data-a=planAnlass]'); s.value = 'jubilaeum'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await p.waitForTimeout(100);
    await tippe('[data-a=planKw][data-v="-1"]');
    await tippe('[data-a=planRabatt][data-v="0.2"]');
    await tippe('[data-a=planFertig]');
    const kal1 = await ev(() => { const K = window.spiel.E.aktionskalender(window.spiel.s); return { n: K.eintraege.length, neu: K.eintraege.filter((a) => !a.standard).pop(), m: document.getElementById('meldung').textContent }; });
    soll('Aktion planen', kal1.n === kal0 + 1 && kal1.neu && kal1.neu.startKw === 38, `${kal1.neu?.name} KW ${kal1.neu?.startKw}, ${kal1.neu?.mechanikText} ${kal1.neu?.rabatt}, ${kal1.neu?.scopeText}: ${kal1.m}`);
    const abs = await ev(() => window.spiel.E.aktionskalender(window.spiel.s).eintraege.find((a) => a.status === 'geplant' && a.standard)?.id);
    if (abs) { await tippe(`.zeile[data-a=aktion][data-v="${abs}"]`); await tippe('[data-a=aktionAbsagen]'); }
    const absSt = await ev((id) => window.spiel.E.aktionskalender(window.spiel.s).eintraege.find((a) => a.id === id)?.status, abs);
    soll('Aktion absagen', absSt === 'abgesagt', `${abs}: ${absSt}`);
    await pruef('marketing', 'Auswertung abgesagt');
    await tippe('.zurueck');
    await pruef('marketing', 'Kalender');
    await oben();
    await bild('marketing-kalender.png');
    // ── Produkte
    await ev(() => window.spiel.schliessePanel());
    await tippe('#menueknopf');
    await tippe('#produkte');
    await pruef('produkte', 'Liste');
    const pk = await ev(() => { const u = window.spiel.produkte.ui, L = window.spiel.E.produkte(window.spiel.s), M = L.marken.find((m) => m.marke === u.marke); const l = M.produkte.filter((x) => x.kategorie === u.kategorie && x.status !== 'ausgelistet'); return l[u.k]; });
    if (pk && pk.status !== 'entwicklung') {
      await tippe(`[data-a=preis][data-v="1"][data-p2="${pk.id}"]`);
      const pk1 = await ev((id) => window.spiel.E.produkte(window.spiel.s).marken.flatMap((m) => m.produkte).find((x) => x.id === id), pk.id);
      soll('Preis +', pk1.preis > pk.preis, `${pk.name}: ${pk.preis} → ${pk1.preis} €`);
      await tippe(`.schalter[data-v="${pk.id}"]`);
      const st1 = await ev((id) => window.spiel.E.produkte(window.spiel.s).marken.flatMap((m) => m.produkte).find((x) => x.id === id).status, pk.id);
      await tippe(`.schalter[data-v="${pk.id}"]`);
      const st2 = await ev((id) => window.spiel.E.produkte(window.spiel.s).marken.flatMap((m) => m.produkte).find((x) => x.id === id).status, pk.id);
      soll('Sortiment aus und wieder an', st1 !== 'sortiment' && st2 === 'sortiment', `${pk.status} → ${st1} → ${st2}`);
    } else soll('Produktkarte vorhanden', false, 'keine Produktkarte im Sortiment');
    await tippe('.punkte button[data-v="1"]');
    await pruef('produkte', 'Liste Karte 2');
    await oben();
    await bild('produkte.png');
    await tippe('[data-a=neu]');
    const q11Pfad = await ev(() => {
      const s = window.spiel.s, E = window.spiel.E, K = E.produktKatalog(s), u = window.spiel.produkte.ui;
      const M = E.produkte(s).marken.find((m) => m.marke === u.marke);
      const freie = new Set(M.kategorien.filter((k) => k.belegt < k.kapazitaet).map((k) => k.id));
      const kandidaten = K.typen.filter((t) => freie.has(t.kategorie) && (t.gruppe[M.trendGruppe] ?? 0) > 0.15);
      const t = kandidaten.find((t) => {
        const e = { ...u.neu, marke: M.marke, typ: t.typ, material: t.materialien[0], zielgruppe: 'bestager' };
        return E.produktVorschau(s, e).ok;
      }) ?? kandidaten[0];
      const ast = K.baum.flatMap((k) => k.unterkategorien.map((a) => ({ k: k.id, a: a.id, typen: a.typen }))).find((x) => x.typen.includes(t?.typ));
      return ast ? { kategorie: ast.k, unterkategorie: ast.a, typ: t.typ } : null;
    });
    soll('Q11: Freier Artikel im Kategoriebaum', !!q11Pfad, JSON.stringify(q11Pfad));
    if (q11Pfad) {
      await tippe(`[data-a=baumKat][data-v="${q11Pfad.kategorie}"]`);
      await tippe(`[data-a=baumAst][data-v="${q11Pfad.unterkategorie}"]`);
      await oben();
      await bild('q11-kategorie-artikel.png');
      await tippe(`[data-a=typ][data-v="${q11Pfad.typ}"]`);
      soll('Q11: Artikeltyp führt zur Zielgruppe', await ev(() => window.spiel.produkte.ui.neuSchritt === 1), q11Pfad.typ);
      await bild('q11-zielgruppen.png');
      await tippe('[data-a=zielgruppe][data-v="bestager"]');
      soll('Q11: Best Ager in Produktentwurf', await ev(() => window.spiel.produkte.ui.neu.zielgruppe === 'bestager' && window.spiel.produkte.ui.neuSchritt === 2), 'Best Ager');
    }
    await tippe('[data-a=dauer][data-v="8"]');
    await tippe('[data-a=budget][data-v="1"]');
    await pruef('produkte', 'Neues Produkt');
    await oben();
    await bild('produkt-entwickeln.png');
    await zu('.karte.vorschau');
    await bild('produkt-entwickeln-vorschau.png');
    const entwurf = await ev(() => ({ ...window.spiel.produkte.ui.neu, marke: window.spiel.produkte.ui.marke }));
    const vors = await ev((e) => window.spiel.E.produktVorschau(window.spiel.s, e), entwurf);
    const n0 = await ev(() => window.spiel.E.produkte(window.spiel.s).marken.reduce((a, m) => a + m.inEntwicklung, 0));
    if (vors.ok) await tippe('[data-a=entwickeln]');
    else { await ev(() => { document.querySelector('[data-a=entwickeln]').disabled = false; }); }
    const n1 = await ev(() => window.spiel.E.produkte(window.spiel.s).marken.reduce((a, m) => a + m.inEntwicklung, 0));
    soll('Entwicklung starten', vors.ok && n1 === n0 + 1, `${entwurf.typ} ${entwurf.farbe} ${entwurf.material}, ${entwurf.dauer} Wochen, ${entwurf.budgetWoche} € je Woche, Vorschau ${vors.sterneVon} bis ${vors.sterneBis} Sterne${vors.fehler ? ', ' + vors.fehler : ''}: ${await meld()}`);
    await pruef('produkte', 'Liste nach Start');
    await tippe('[data-a=trend]');
    await pruef('produkte', 'Trendbericht');
    // ── Folgewoche: Wirkung und Anzeige nach Woche weiter
    await tippe('.zurueck');
    const fw0 = await ev(() => { const s = window.spiel.s, E = window.spiel.E; const neu = E.produkte(s).marken.flatMap((m) => m.produkte).filter((x) => x.status === 'entwicklung').sort((a, b) => a.start - b.start).pop(); return { woche: s.woche, neu: neu && { id: neu.id, f: neu.fortschritt } }; });
    await ev(() => window.spiel.woche(false));
    await pruef('produkte', 'Folgewoche');
    const fw = await ev(({ id }) => {
      const s = window.spiel.s, E = window.spiel.E, cpo = E.vorstandProfil(s, 'cpo');
      const c = E.crmKampagnen(s).kampagnen; const k = c[c.length - 1];
      return { woche: s.woche, neu: E.produkte(s).marken.flatMap((m) => m.produkte).find((x) => x.id === id), cpo: { gehalt: cpo.person?.gehalt, bonus: cpo.person?.erfolgsbonus, del: cpo.delegationen.find((d) => d.id === 'produktentwicklung').an }, crm: { status: k.status, sendungen: k.summe.sendungen }, rabatt: E.kundenkarte(s).kartenrabatt, online: E.kanaele(s).kanaele.find((x) => x.id === 'online').quote };
    }, { id: fw0.neu?.id });
    soll('Folgewoche: Produkt entwickelt sich weiter', !!fw.neu && fw.neu.fortschritt > fw0.neu.f, `Woche ${fw0.woche} → ${fw.woche}, Fortschritt ${fw0.neu?.f} → ${fw.neu?.fortschritt}`);
    soll('Folgewoche: Vorstand behält Gehalt, Bonus, Delegation', fw.cpo.gehalt === nach.person.gehalt && fw.cpo.bonus === 0.2 && fw.cpo.del === nach.delegationen.find((d) => d.id === 'produktentwicklung').an, JSON.stringify(fw.cpo));
    soll('Folgewoche: CRM-Kampagne läuft', ['aktiv', 'geplant'].includes(fw.crm.status), `${fw.crm.status}, ${fw.crm.sendungen} Sendungen`);
    soll('Folgewoche: Kartenrabatt bleibt', fw.rabatt === 0.02, String(fw.rabatt));
    await ev(() => window.spiel.oeffneMarketing('crm'));
    await pruef('marketing', 'CRM Folgewoche');
    await ev(() => window.spiel.oeffneVorstand('uebersicht'));
    await pruef('vorstand', 'Folgewoche');
    // Mehr Wochen: Vorstandssitzung und Aktionsauswertung
    await ev(() => { for (let i = 0; i < 14; i++) window.spiel.woche(false); });
    await pruef('vorstand', 'nach Sitzung');
    const sitz = await ev(() => { const u = window.spiel.E.vorstandUebersicht(window.spiel.s); return { letzte: u.letzteSitzung?.woche, offen: u.offeneEntscheidungen.length }; });
    soll('Vorstandssitzung im Quartal', sitz.letzte !== undefined, `letzte Sitzung Woche ${sitz.letzte}, offene Entscheidungen ${sitz.offen}`);
    if (sitz.offen) { await tippe('.entscheid [data-a=entscheiden]'); const o2 = await ev(() => window.spiel.E.vorstandUebersicht(window.spiel.s).offeneEntscheidungen.length); soll('Entscheidung der Sitzung', o2 === sitz.offen - 1, `${sitz.offen} → ${o2}: ${await meld()}`); await pruef('vorstand', 'nach Entscheidung'); }
    const ausw = await ev(() => window.spiel.E.aktionskalender(window.spiel.s).eintraege.find((a) => a.ausgewertet)?.id);
    if (ausw) { await ev((id) => window.spiel.oeffneMarketing('aktion', id), ausw); await pruef('marketing', 'Auswertung'); }
    await ev(() => window.spiel.schliessePanel());
    erg.abweichungen = erg.pruefungen.reduce((x, q) => x + q.fehler.length, 0);
    erg.werte = erg.pruefungen.reduce((x, q) => x + q.werte, 0);
    fs.writeFileSync(path.join(__dirname, 'out', 'panels-pruefung.json'), JSON.stringify(erg, null, 1));
    console.log(`Panels: ${erg.werte} Werte geprüft, ${erg.abweichungen} Abweichungen, ${erg.aktionen.filter((x) => x.ok).length}/${erg.aktionen.length} Aktionen ok`);
    return erg;
  }
  // ─────────────────────────────────────────── Startbildschirm: ohne URL-Parameter, Schwierigkeit schwer wählen, starten
  async function startPruefen() {
    const erg = { aktionen: [] };
    const soll = (name, ok, info) => { erg.aktionen.push({ name, ok, info }); console.log(`${ok ? 'OK ' : 'FEHLER'} ${name}: ${info}`); };
    const q = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    q.on('pageerror', (e) => console.log('FEHLER', e.message));
    await q.goto('file://' + path.join(__dirname, 'spiel.html') + '?leben=aus', { waitUntil: 'load', timeout: 0 });
    await q.waitForSelector('#start.an', { timeout: 60000 });
    const szenarien = await q.evaluate(() => [...document.querySelectorAll('#startszenarien .hw-karte-titel')].map((k) => k.textContent));
    soll('Sieben Szenarien auswählbar', szenarien.length === 7, szenarien.join(', '));
    const niceBilder = path.join(__dirname, '..', 'bilder', 'nice', 'szenarien');
    fs.mkdirSync(niceBilder, { recursive: true });
    await q.screenshot({ path: path.join(niceBilder, 'szenarien-auswahl.png') });
    await q.tap('[data-szenario=standard]');
    const karten = await q.evaluate(() => [...document.querySelectorAll('#startstufen [data-v]')].map((k) => k.textContent));
    soll('Startbildschirm mit drei Schwierigkeiten', karten.length === 3, karten.join(', '));
    await q.screenshot({ path: path.join(__dirname, 'out', 'start.png') });
    console.log('gespeichert:', path.join(__dirname, 'out', 'start.png'));
    await q.screenshot({ path: path.join(niceBilder, 'szenarien-schwierigkeit.png') });
    await q.tap('#startstufen [data-v=schwer]');
    await q.selectOption('#startstadt', 'Karlsruhe');
    await q.tap('#startknopf');
    await q.waitForFunction('window.bereit === true', null, { timeout: 0, polling: 500 });
    const r = await q.evaluate(() => ({ ui: window.spiel.schwierigkeit, engine: window.spiel.s.schwierigkeit, stadt: document.getElementById('stadtname').textContent, cash: window.spiel.s.cash, unter: document.getElementById('stufe').textContent, mittel: window.spiel.E.neuesSpiel(1, { schwierigkeit: 'mittel' }).cash }));
    soll('Start schwer in Karlsruhe', r.ui === 'schwer' && (r.engine === undefined || r.engine === 'schwer') && r.stadt === 'Karlsruhe' && r.cash !== r.mittel, `Anzeige ${r.unter}, Engine ${r.engine}, Cash ${r.cash} statt ${r.mittel} bei mittel`);
    await q.close();
    return erg;
  }

  // Posteingang: Seed 1, Bot C, Woche 30, 390 × 844 Pixel.
  async function posteingangPruefen() {
    const bilder = path.join(__dirname, 'bilder');
    fs.mkdirSync(bilder, { recursive: true });
    await p.evaluate(() => {
      window.spiel.neuesSpiel(1, 'Essen');
      for (let i = 0; i < 30; i++) window.spiel.woche(true);
    });
    await p.evaluate(() => {
      const streifen = document.getElementById('wochenstreifen');
      if (!streifen.textContent.startsWith('KW 31:')) throw new Error('Wochenstreifen enthält nicht die aktuelle Kalenderwoche.');
      streifen.classList.add('an'); // Screenshot unabhängig von der 6-Sekunden-Ausblendung
    });
    await p.screenshot({ path: path.join(bilder, 'posteingang-wochenstreifen.png') });
    await p.evaluate(() => window.spiel.oeffnePosteingang('handeln'));
    await p.waitForTimeout(350); // Slide-up-Animation abschließen lassen
    const info = await p.evaluate(() => ({ ...window.spiel.posteingang.pruefe(), aufgaben: window.spiel.E.posteingang(window.spiel.s).handeln.length }));
    if (info.soll !== info.badge || info.soll !== info.karten || info.soll !== info.aufgaben) {
      throw new Error('Posteingang weicht von Engine ab: ' + JSON.stringify(info));
    }
    await p.screenshot({ path: path.join(bilder, 'posteingang.png') });
    await p.evaluate(() => window.spiel.oeffnePosteingang('meldungen'));
    await p.screenshot({ path: path.join(bilder, 'posteingang-meldungen.png') });
    await p.evaluate(() => {
      const E = window.spiel.E, s = window.spiel.s, haus = s.haeuser[0];
      s.entscheidungen.push({
        id: 'e-pruef-post', typ: 'instandhaltung', woche: s.woche, frist: s.woche + 2,
        titel: 'Instandhaltung prüfen', text: 'Automatisierter Klicktest.',
        optionen: [{ id: 'zahlen', label: 'Zahlen' }, { id: 'verschieben', label: 'Verschieben' }],
        standard: 'zahlen', daten: { haus: haus.id, kosten: 300000 },
      });
      const klon = structuredClone(s);
      E.fuehreAus(klon, { typ: 'entscheiden', id: 'e-pruef-post', option: 'verschieben' });
      window.__postSoll = JSON.stringify(klon);
      window.spiel.oeffnePosteingang('handeln');
    });
    await p.locator('[data-post-id="e-pruef-post"] [data-v="verschieben"]').tap();
    const entscheidungKorrekt = await p.evaluate(() => JSON.stringify(window.spiel.s) === window.__postSoll);
    if (!entscheidungKorrekt) throw new Error('Entscheidungsbutton verändert Spielstand anders als fuehreAus.');

    for (const modus of ['ablehnen', 'annehmen']) {
      const kandidat = await p.evaluate((modus) => {
        const E = window.spiel.E, s = window.spiel.s;
        let a = s.angebote.find((x) => x.status === 'offen');
        if (!a) {
          a = { id: 'a-test-' + modus, typ: 'sonderposten', titel: 'Testposten', text: 'Integrationstest',
            woche: s.woche, frist: s.woche + 3, wert: 500000, gruppe: 'damen', _passt: true, status: 'offen' };
          s.angebote.push(a);
        }
        const klon = structuredClone(s);
        E.fuehreAus(klon, { typ: modus === 'ablehnen' ? 'angebotAblehnen' : 'angebotAnnehmen', angebot: a.id });
        window.__postSoll = JSON.stringify(klon);
        window.spiel.oeffnePosteingang('handeln');
        return a.id;
      }, modus);
      await p.locator('[data-post-id="' + kandidat + '"] [data-v="' + modus + '"]').tap();
      const gleich = await p.evaluate(() => JSON.stringify(window.spiel.s) === window.__postSoll);
      if (!gleich) throw new Error('Angebot ' + modus + ': UI weicht von fuehreAus ab.');
    }
    console.log('Posteingang: Karten, Zähler, Entscheidung, Annehmen, Ablehnen = 0 Abweichungen; Bilder: ' + bilder);
  }

  // Optional: --mit-animation protokolliert 100-ms-Bildfolgen; Prüfmodus überspringt Wartezeiten.
  async function reiseWochePruefen() {
    const fehler = [], zeiten = {}, bilder = path.join(__dirname, 'bilder');
    const ordnerReise = path.join(bilder, 'reise'), ordnerWoche = path.join(bilder, 'wochenbericht');
    const abnahme = path.join(bilder, 'reise-woche');
    for (const dir of [ordnerReise, ordnerWoche, abnahme]) fs.mkdirSync(dir, { recursive: true });
    const errors = []; p.on('pageerror', (err) => errors.push(err.message));
    const pruefe = (ok, msg) => { if (!ok) fehler.push(msg); console.log((ok ? 'OK: ' : 'FEHLER: ') + msg); };
    await p.evaluate(() => window.spiel.neuesSpiel(1, 'Essen'));
    await p.locator('#stadt-reise').click();
    await p.waitForSelector('#reise-overlay:not([hidden]) .reise-panel');
    await p.screenshot({ path: path.join(ordnerReise, '00-hauptbahnhof.png') });
    await p.screenshot({ path: path.join(abnahme, '04-reiseziele.png') });
    const zielBilder = await p.locator('.reise-vorschaurahmen').count();
    pruefe(zielBilder > 0, 'Reiseziele enthalten eigene Vorschaurahmen');
    await p.locator('.reise-suche').fill('Düsseldorf');
    const gefiltert = await p.locator('[data-reiseziel]').count();
    pruefe(gefiltert === 1, 'Reisesuche filtert Düsseldorf');
    await p.screenshot({ path: path.join(ordnerReise, '01-zielwahl.png') });
    const ankunft = p.locator('[data-reiseziel="Düsseldorf"]');
    await ankunft.click();
    if (animationen) {
      const rasterStart = Date.now();
      for (let ms = 0; ms <= 4900; ms += 100) {
        await p.waitForTimeout(Math.max(0, rasterStart + ms - Date.now()));
        await p.screenshot({ path: path.join(ordnerReise, String(ms).padStart(5, '0') + '.png') });
      }
    }
    await p.waitForFunction(() => window.spiel.reise.pruefe().stadt === 'Düsseldorf' && !window.spiel.reise.pruefe().aktiv, null, { timeout: 30000 });
    const r = await p.evaluate(() => ({ ...window.spiel.reise.pruefe(), ort: window.spiel.bahnhofBildpunkt(),
      stadt: document.getElementById('stadtname').textContent }));
    zeiten.reise = r.schritte;
    if (animationen) { const fertig = r.schritte.find((x) => x.schritt === 'Reise abgeschlossen');
      pruefe(!!fertig && Math.abs(fertig.reiseMs - 4950) <= 495, 'Reisedauer 4.950 ms ±10 %'); }
    pruefe(r.stadt === 'Düsseldorf', 'Reiseziel und Stadtchip sind Düsseldorf');
    pruefe(!!r.ort && r.ort.x >= 0 && r.ort.x <= 390 && r.ort.y >= 0 && r.ort.y <= 844, 'Zielbahnhof im sichtbaren Kamerabereich');
    await p.screenshot({ path: path.join(ordnerReise, '99-angekommen.png') });
    // Nach der ersten Reise muss der Cache einen echten Stadtbildausschnitt statt generischem Motiv enthalten.
    await p.locator('#stadt-reise').click();
    await p.waitForSelector('#reise-overlay:not([hidden]) .reise-panel');
    const erstesZiel = await p.locator('[data-reiseziel]').first().getAttribute('data-reiseziel');
    pruefe(erstesZiel === 'Essen', 'Zuletzt besuchte Stadt steht vor umsatzsortierten Reisezielen');
    const cached = await p.locator('[data-reiseziel="Essen"] .reise-vorschaurahmen img').getAttribute('src');
    pruefe(cached?.startsWith('data:image/jpeg;base64,'), 'Bereiste Stadt nutzt gecachten 96x96-Kartenausschnitt');
    await p.screenshot({ path: path.join(abnahme, '05-stadtvorschau.png') });
    await p.locator('[data-reisezu]').click();
    // Eine tatsächliche Engine-Woche mit neuem Vorgang suchen; keine Testmeldung erfinden.
    const testWoche = await p.evaluate(() => {
      const spiel = window.spiel, E = spiel.E;
      for (let i = 0; i < 44; i++) {
        const davor = new Set(E.posteingang(spiel.s).handeln.map((m) => m.id));
        const probe = structuredClone(spiel.s);
        E.wocheAbspielen(probe);
        const neu = E.posteingang(probe).handeln.filter((m) => !davor.has(m.id));
        if (neu.length) return { woche: spiel.s.woche, vorgaenge: neu.length };
        spiel.woche(true);
      }
      return null;
    });
    pruefe(!!testWoche, 'Engine-Testwoche mit mindestens einem neuen Vorgang gefunden');
    await p.locator('#weiter').click();
    await p.waitForSelector('#wochen-overlay:not([hidden]) .wochen-frage');
    await p.waitForTimeout(300);
    const dialogDarstellung = await p.evaluate(() => {
      const maske = getComputedStyle(document.querySelector('.wochen-maske'));
      const karte = getComputedStyle(document.querySelector('.wochen-frage'));
      return { maske: maske.backgroundColor, karte: karte.backgroundColor, opacity: Number(karte.opacity) };
    });
    pruefe(/rgba?\(12, 20, 28, (?:0\.6|0\.60)\)/.test(dialogDarstellung.maske),
      'Hintergrund um 60 Prozent abgedunkelt: ' + dialogDarstellung.maske);
    pruefe(dialogDarstellung.karte === 'rgb(248, 247, 244)' && dialogDarstellung.opacity > .95,
      'Bestätigungskarte deckend: ' + JSON.stringify(dialogDarstellung));
    await p.screenshot({ path: path.join(ordnerWoche, '00-bestaetigung.png') });
    await p.screenshot({ path: path.join(abnahme, '01-bestaetigung.png') });
    await p.locator('[data-wa="ja"]').click();
    if (animationen) {
      const rasterStart = Date.now();
      for (let ms = 0; ms <= 12900; ms += 100) {
        await p.waitForTimeout(Math.max(0, rasterStart + ms - Date.now()));
        await p.screenshot({ path: path.join(ordnerWoche, String(ms).padStart(5, '0') + '.png') });
      }
    }
    await p.waitForFunction(() => ['bericht', 'vorfall'].includes(window.spiel.wochenbericht.status), null, { timeout: 30000 });
    const w = await p.evaluate(() => ({ ...window.spiel.wochenbericht.pruefe(),
      soll: window.spiel.E.cockpit(window.spiel.s),
      aktuell: document.getElementById('wb-umsatz')?.dataset.wert,
      ebitda: document.getElementById('wb-ebitda')?.dataset.wert,
      zeitung: document.querySelector('.wb-zeitung')?.textContent,
      kapitalfluss: window.spiel.E.kapitalfluss(window.spiel.s),
      kapitalflussText: document.querySelector('.wb-cash')?.textContent }));
    zeiten.wochenbericht = w.zeiten;
    if (animationen) { const fertig = w.zeiten.find((x) => x.ereignis === 'Zählung beendet');
      pruefe(!!fertig && Math.abs(fertig.jaMs - 11860) <= 1186, 'Wochenbericht bis Zählerende 11.860 ms ±10 %'); }
    pruefe(w.bericht?.umsatz === w.soll.umsatzWoche && Number(w.aktuell) === w.soll.umsatzWoche, 'Umsatz entspricht Engine');
    pruefe(w.bericht?.ebitda === w.soll.ebitdaWoche && Number(w.ebitda) === w.soll.ebitdaWoche, 'EBITDA entspricht Engine');
    pruefe(!!w.zeitung?.includes('Der Handelsbote'), 'Zeitung vorhanden');
    const f = w.kapitalfluss;
    pruefe(!!f && f.operativ + f.investitionen + f.finanzierung + f.sonstiges === f.netto,
      'Kapitalfluss nach Zahlarten stimmt exakt mit Cash netto überein');
    pruefe(!!f && Math.abs(f.netto - (w.bericht?.cashNetto ?? NaN)) <= 1 && Math.abs(f.bestand - w.soll.cash) <= 1,
      'Kapitalfluss stimmt mit Woche und Cash-Bestand überein (±1 €)');
    pruefe(!!w.kapitalflussText && !w.kapitalflussText.includes('nicht separat erfasst') &&
      ['Cash operativ', 'Investitionen', 'Finanzierung', 'Sonstiges', 'Cash netto', 'Cash-Bestand']
        .every((x) => w.kapitalflussText.includes(x)), 'Kapitalfluss wird vollständig angezeigt');
    pruefe((w.bericht?.meldungstexte ?? []).slice(1).every((text) => w.zeitung?.includes(text)), 'Zeitung enthält neue Presse- und Konkurrenzmeldungen der abgeschlossenen Woche (Aufmacher aus N08)');
    await p.screenshot({ path: path.join(ordnerWoche, '99-wochenbericht.png') });
    await p.screenshot({ path: path.join(abnahme, '02-kapitalfluss.png') });
    if (w.bericht?.vorgaenge > 0) {
      await p.waitForSelector('#wb-vorfall.offen .wb-vorfall');
      await p.screenshot({ path: path.join(ordnerWoche, '100-vorfall.png') });
      await p.screenshot({ path: path.join(abnahme, '03-vorfall-portraet.png') });
      pruefe(await p.locator('#wb-vorfall.offen .wb-gesicht svg').count() === 1, 'Zuständiges Porträt als SVG (kein Buchstabe)');
      pruefe(true, 'Neuer Engine-Vorgang als Bottom-Sheet');
      // Alle Vorfälle verlassen, damit der Wochenstreifen nach Schließen des Berichts prüfbar ist.
      for (let i = 0; i < Math.min(3, w.bericht.vorgaenge); i++) {
        await p.waitForSelector('#wb-vorfall.offen [data-wa="spaeter"]:not([hidden])');
        await p.locator('#wb-vorfall [data-wa="spaeter"]').click();
      }
      await p.waitForFunction(() => window.spiel.wochenbericht.status === 'bericht');
    } else {
      console.warn('Kein neuer Vorgang in dieser Testwoche; Vorfall-Test nicht abgedeckt.');
      fehler.push('Vorfalldialog nicht überprüft: keine neuen Vorgänge aus der Engine');
    }
    if (await p.locator('.wb-schliessen:visible').count()) {
      await p.locator('.wb-schliessen').click();
      const streifen = await p.locator('#wochenstreifen').evaluate((el) =>
        ({ sichtbar: !!el.offsetWidth && !!el.offsetHeight, text: el.textContent }));
      pruefe(!streifen.sichtbar, 'Im normalen Spiel erscheint kein Wochenstreifen nach dem Bericht');
    }
    pruefe(errors.length === 0, 'Keine JavaScript-Konsolenfehler: ' + errors.join('; '));
    fs.writeFileSync(path.join(ordnerWoche, 'pruefung.json'), JSON.stringify({ fehler, zeiten, engine: w.soll }, null, 2));
    fs.writeFileSync(path.join(abnahme, 'pruefung.json'), JSON.stringify({ fehler, zeiten,
      kapitalfluss: w.kapitalfluss, dialog: dialogDarstellung, engine: w.soll }, null, 2));
    if (fehler.length) throw new Error('Reise/Wochenbericht: ' + fehler.length + ' Abweichungen: ' + fehler.join('; '));
    console.log('Reise und Wochenbericht: 0 Abweichungen, ' + bilder);
  }

  // Eigenständiger End-to-End-Lauf: 112 Städte, zwei Bot-Verläufe und
  // Abgleich zwischen Engine, sichtbaren Gruppen und Pins; keine CI-Aktivierung.
  async function wettbewerberPruefen() {
    const bilder = path.join(__dirname, 'bilder');
    fs.mkdirSync(bilder, { recursive: true });
    const report = { standorte: [], verlaeufe: [], fehler: [], leistungswerte: [] };
    const staedte = await p.evaluate(() => [...new Set(window.spiel.s.haeuser.map((h) => h.stadt))]);
    for (const name of staedte) {
      const r = await p.evaluate((name) => {
        window.spiel.stadt(name);
        return window.spiel.pruefeWettbewerber();
      }, name);
      report.standorte.push(r);
      if (r.fehler.length) report.fehler.push(name + ': ' + r.fehler.join(', '));
    }
    for (const stadtName of ['Essen', 'Berlin']) {
      await p.evaluate((stadtName) => window.spiel.neuesSpiel(1, stadtName), stadtName);
      const screenshots = [0, 30, 104];
      const folge = [];
      for (let i = 0; i <= 260; i++) {
        if (screenshots.includes(i)) {
          const pruefung = await p.evaluate(() => window.spiel.pruefeWettbewerber());
          folge.push({ ...pruefung, testwoche: i });
          if (pruefung.fehler.length) report.fehler.push(stadtName + ' Woche ' + i + ': ' + pruefung.fehler.join(', '));
          await p.screenshot({ path: path.join(bilder, 'wettbewerb-' + stadtName.toLowerCase() + '-w' + i + '.png') });
          if (i === 30) {
            const info = await p.evaluate(() => {
              const w = window.spiel.E.wettbewerbFuerGrafik(window.spiel.s, document.getElementById('stadtname').textContent).find((w) => w.status !== 'geschlossen');
              if (w) window.spiel.oeffneWettbewerber(w.id);
              return w?.id ?? null;
            });
            if (info) await p.screenshot({ path: path.join(bilder, 'wettbewerb-detail-' + stadtName.toLowerCase() + '.png') });
            await p.evaluate(() => window.spiel.schliessePanel());
          }
        }
        if (i === 260) break;
        const m = await p.evaluate(() => window.spiel.woche(true));
        if (!m) { report.fehler.push(stadtName + ': Spiel beendet vor Testwoche 260 (' + i + ')'); break; }
        if (m.neu?.some((id) => id.startsWith('wb:'))) report.leistungswerte.push({ stadt: stadtName, woche: m.woche, ms: m.neuBauMs, orte: m.neu.filter((id) => id.startsWith('wb:')) });
      }
      report.verlaeufe.push({ stadt: stadtName, folgen: folge });
    }
    const l = report.leistungswerte.map((x) => x.ms);
    report.leistung = { anzahl: l.length, mittelMs: l.length ? l.reduce((a, v) => a + v, 0) / l.length : 0, maxMs: l.length ? Math.max(...l) : 0 };
    if (l.length && report.leistung.mittelMs >= 80) report.fehler.push('Neubau-Mittel ' + report.leistung.mittelMs.toFixed(1) + ' ms (Ziel < 80)');
    if (l.length && report.leistung.maxMs >= 200) report.fehler.push('Neubau-Maximum ' + report.leistung.maxMs.toFixed(1) + ' ms (Ziel < 200)');
    fs.writeFileSync(path.join(__dirname, 'out', 'wettbewerb-spiel-pruefung.json'), JSON.stringify(report, null, 2));
    console.log('Wettbewerber: ' + report.standorte.length + ' Städte, ' +
      report.leistungswerte.length + ' Neubauten, ' + report.fehler.length + ' Abweichungen');
    if (report.fehler.length) throw new Error('Wettbewerber-Integration: ' + report.fehler.slice(0, 12).join('; '));
    return report;
  }
  // Maßstab: 561 Häuser, bis zu 220 Stadtpunkte und Sammelaktion, Seed 1 / Woche 30.
  async function massstabPruefen() {
    const report = { pruefungen: [], fehler: [] };
    const pruefen = (titel, bedingung, ist) => {
      report.pruefungen.push({ titel, ok: !!bedingung, ist });
      if (!bedingung) report.fehler.push(titel + ': ' + JSON.stringify(ist));
    };
    const bilder = path.join(__dirname, '..', 'bilder');
    fs.mkdirSync(bilder, { recursive: true });
    await p.evaluate(() => {
      window.spiel.neuesSpiel(1, 'Essen');
      for (let i = 0; i < 30 && window.spiel.s.phase !== 'zerschlagen'; i++) window.spiel.woche(false);
      window.spiel.oeffnePortfolio('karte');
    });
    const karte = await p.evaluate(() => {
      const s = window.spiel.s, hs = window.spiel.E.portfolio(s);
      return { woche: s.woche, hauser: hs.length,
        staedte: new Set(hs.map((h) => h.stadt)).size,
        pins: document.querySelectorAll('.deutschland-svg g[data-stadt]').length,
        ohne: hs.filter((h) => !h.steuerbar).length,
        fehler: window.spiel.portfolio.pruefe().fehler };
    });
    pruefen('Spiel erreicht Woche 30', karte.woche === 30, karte.woche);
    pruefen('Jede Engine-Stadt erhält Kartenpunkt', karte.pins === karte.staedte, karte);
    pruefen('Karte ohne fehlende Hausattribute', !karte.fehler.length, karte.fehler);
    await p.screenshot({ path: path.join(bilder, 'deutschland.png') });
    const stadt = await p.locator('.deutschland-svg g[data-stadt]').first().getAttribute('data-stadt');
    await p.locator('.deutschland-svg g[data-stadt]').first().evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    pruefen('Stadtauswahl per Kartenpunkt', await p.evaluate((name) => document.getElementById('stadtname').textContent === name ||
      document.getElementById('ptitel').textContent === name, stadt), stadt);
    await p.evaluate(() => window.spiel.oeffnePortfolio('liste'));
    const liste = await p.evaluate(() => {
      const hs = window.spiel.E.portfolio(window.spiel.s);
      const d = window.spiel.portfolio.pruefe();
      return { alle: hs.length, daten: d.anzeige, imDom: d.domZeilen,
        spalten: [...document.querySelectorAll('[data-pp="sort"] option')].map((x) => x.value) };
    });
    pruefen('Portfolio zeigt alle Engine-Häuser', liste.alle === liste.daten, liste);
    pruefen('Nur sichtbare Listenzeilen im DOM', liste.imDom > 0 && liste.imDom <= 35, liste);
    pruefen('Sortierspalten vollständig', ['umsatz', 'ebitda', 'marge', 'mietquote', 'substanz', 'restlaufzeitMiete', 'status'].every((x) => liste.spalten.includes(x)), liste.spalten);
    // Pro Format bis zu 50 Häuser mit den unveränderten Werten aus portfolio(s) abgleichen;
    // Premium und Sport haben weniger als 50 Häuser, daher min(50, Formatbestand).
    for (const format of ['hartwig', 'premium', 'sport', 'volkskauf', 'fundus']) {
      const check = await p.evaluate((key) => {
        const select = document.querySelector('[data-pp-filter="format"]');
        select.value = key; select.dispatchEvent(new Event('change', { bubbles: true }));
        const s = window.spiel.s, hs = window.spiel.E.portfolio(s).filter((h) => h.formatKey === key)
          .sort((a, b) => b.umsatz - a.umsatz || a.stadt.localeCompare(b.stadt, 'de') || a.id.localeCompare(b.id, 'de'));
        const scroll = document.getElementById('pp-scroll');
        const fehlt = [];
        for (let i = 0; i < Math.min(50, hs.length); i++) {
          scroll.scrollTop = (i + 1) * 58;
          scroll.dispatchEvent(new Event('scroll'));
          const row = scroll.querySelector('[data-haus="' + hs[i].id + '"]');
          if (!row || !row.textContent.includes(hs[i].name) ||
            Number(row.dataset.wert) !== hs[i].umsatz) fehlt.push(hs[i].id);
        }
        return { anzahl: hs.length, geprueft: Math.min(50, hs.length), fehlt };
      }, format);
      pruefen('Portfolio-Stichprobe ' + format, !check.fehlt.length && check.geprueft > 0, check);
    }
    await p.evaluate(() => {
      document.querySelector('[data-pp-filter="format"]').value = 'alle';
      document.querySelector('[data-pp-filter="format"]').dispatchEvent(new Event('change', { bubbles: true }));
      document.getElementById('pp-scroll').scrollTop = 0;
    });
    await p.screenshot({ path: path.join(bilder, 'portfolio-liste.png') });
    const soll = await p.evaluate(() => {
      const st = window.spiel.s;
      const ids = window.spiel.E.portfolio(st).filter((h) => h.steuerbar).slice(0, 3).map((h) => h.id);
      const kopie = structuredClone(st);
      const r = window.spiel.E.fuehreAus(kopie, { typ: 'personalabbau', haeuser: ids, prozent: 0.05 });
      if (!r.ok) return { ids, fehler: r.text };
      return { ids, personen: kopie.haeuser.filter((h) => ids.includes(h.id))
        .map((h) => [h.id, h.personal.vollzeit, h.personal.teilzeit]) };
    });
    pruefen('Personalabbau laut Engine ausführbar', !soll.fehler && soll.ids?.length === 3, soll);
    if (!soll.fehler) {
      await p.evaluate((ids) => {
        const pp = window.spiel.portfolio;
        pp.filterSetzen('alle');
        window.spiel.oeffnePortfolio('liste');
        // Kein direkter UI-Bypass: Liste per Checkboxen selektieren, ggf. scrollen.
        const zeilen = window.spiel.E.portfolio(window.spiel.s);
        const sort = [...zeilen].sort((a, b) => b.umsatz - a.umsatz || a.stadt.localeCompare(b.stadt, 'de') || a.id.localeCompare(b.id, 'de'));
        const formatNamen = ['hartwig', 'premium', 'sport', 'volkskauf', 'fundus'];
        const positionen = [];
        for (const format of formatNamen) {
          const group = sort.filter((h) => h.formatKey === format);
          if (!group.length) continue;
          const start = positionen.length;
          positionen.push({ gruppe: format });
          for (const h of group) positionen.push({ id: h.id });
        }
        for (const id of ids) {
          const i = positionen.findIndex((x) => x.id === id);
          if (i < 0) throw new Error('Nicht in der Liste: ' + id);
          const scroll = document.getElementById('pp-scroll');
          scroll.scrollTop = i * 58;
          scroll.dispatchEvent(new Event('scroll'));
          const cb = scroll.querySelector('[data-pp-id="' + id + '"]');
          if (!cb) throw new Error('Checkbox fehlt: ' + id);
          cb.checked = true;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
        document.querySelector('[data-pp="abbau"]').click();
      }, soll.ids);
      const ist = await p.evaluate((ids) => window.spiel.s.haeuser.filter((h) => ids.includes(h.id))
        .map((h) => [h.id, h.personal.vollzeit, h.personal.teilzeit]), soll.ids);
      pruefen('Sammelaktion Personal −5 % wie fuehreAus', JSON.stringify(ist) === JSON.stringify(soll.personen), { ist, soll: soll.personen });
    }
    await p.screenshot({ path: path.join(bilder, 'sammelaktion.png') });
    fs.writeFileSync(path.join(__dirname, 'out', 'massstab-pruefung.json'), JSON.stringify(report, null, 2));
    console.log('Maßstab-Oberfläche: ' + report.pruefungen.length + ' Prüfungen, ' + report.fehler.length + ' Abweichungen');
    if (report.fehler.length) throw new Error(report.fehler.join('; '));
    return report;
  }
  if (process.argv.includes('--nur-massstab')) {
    try { await massstabPruefen(); } finally { await b.close(); }
    return;
  }
  // N04: Browser-Abnahme mit echten UI-Handlungen. Bilder aller 14 Schritte.
  async function einfuehrungPruefen() {
    const ordner = path.join(__dirname, '..', 'bilder', 'nice', 'einfuehrung');
    fs.mkdirSync(ordner, { recursive: true });
    const fehler = [], durchlauf = [], javascriptFehler = [];
    p.on('pageerror', (e) => javascriptFehler.push(e.message));
    await p.evaluate(() => {
      const spiel = window.spiel;
      spiel.neuesSpiel(1, 'Essen');
      // Reale Freigaben für die Abnahme aufbauen; keine Test-Orders erzeugen.
      for (let n = 0; n < 8; n++) spiel.woche(false);
      spiel.fokusHaeuser();
      spiel.einfuehrung.starten(true);
    });
    async function schritt(n) {
      const id = ['lage', 'karte', 'haus', 'kennzahlen', 'cockpit', 'posteingang',
        'einkauf', 'marketing', 'vorstand', 'hq', 'insolvenz', 'woche', 'bericht', 'reise'][n - 1];
      await p.waitForFunction((v) => window.spiel.einfuehrung.zustand().schritt === v, id, { timeout: 12000 });
      await p.waitForTimeout(120);
      const z = await p.evaluate(() => window.spiel.einfuehrung.zustand());
      const name = String(n).padStart(2, '0') + '-' + id + '.png';
      await p.screenshot({ path: path.join(ordner, name) });
      durchlauf.push({ n, id, datei: name, index: z.index });
    }
    async function klick(selector) {
      const q = p.locator(selector).first();
      await q.waitFor({ state: 'visible', timeout: 12000 });
      await q.click();
      await p.waitForTimeout(100);
    }
    try {
      await schritt(1); await klick('[data-ein="weiter"]');
      await schritt(2);
      await p.mouse.move(190, 355); await p.mouse.down();
      await p.mouse.move(230, 385, { steps: 6 }); await p.mouse.up();
      await p.mouse.move(190, 355); await p.mouse.wheel(0, -170);
      await schritt(3);
      const punkt = await p.evaluate(() => {
        const spiel = window.spiel;
        spiel.fokusHaeuser();
        // Liegt kein Haus frei antippbar im Bild, Kamera auf das erste offene Essener Haus setzen.
        const frei = (q) => q && q.y < 620 && q.x > 30 && q.x < innerWidth - 30 && document.elementFromPoint(q.x, q.y)?.id === 'karte';
        const offen = spiel.s.haeuser.filter((h) => h.stadt === 'Essen' && h.status === 'offen');
        if (!offen.some((h) => frei(spiel.tippPunkt(h.id)))) {
          const g = spiel.sb.haeuser.get(offen[0].id)?.gruppe;
          if (g) { const m = new spiel.THREE.Box3().setFromObject(g).getCenter(new spiel.THREE.Vector3()); spiel.kamera({ x: m.x, z: m.z }); }
        }
        const haus = spiel.s.haeuser.filter((h) => h.stadt === 'Essen' && h.status === 'offen')
          .map((h) => spiel.tippPunkt(h.id)).filter((q) => q && q.y < 620 && q.x > 30 && q.x < innerWidth - 30 && document.elementFromPoint(q.x, q.y)?.id === 'karte')
          .sort((a, b) => Math.abs(a.x - innerWidth / 2) - Math.abs(b.x - innerWidth / 2))[0];
        return haus;
      });
      if (!punkt) throw new Error('Kein antippbares Haus für Schritt 3');
      await p.touchscreen.tap(punkt.x, punkt.y);
      await schritt(4); await klick('[data-ein="weiter"]');
      await schritt(5); await klick('[data-ein="weiter"]');
      await schritt(6);
      await klick('#pzu'); await klick('#postdirekt');
      await schritt(7);
      await klick('#pzu'); await klick('#menueknopf'); await klick('#einkauf');
      await klick('#pinhalt [data-a="seite"][data-v="freigaben"]');
      const freigaben = await p.evaluate(() => window.spiel.E.freigaben(window.spiel.s).anzahl);
      if (freigaben) {
        await klick('#pinhalt [data-a="frei"]');
      } else {
        // Keine Engine-Freigabe verfügbar: explizite UI-Alternative benutzen.
        await klick('[data-ein="weiter"]');
      }
      await schritt(8);
      await klick('#pzu'); await klick('#menueknopf'); await klick('#marketing');
      await klick('#pinhalt [data-a="seite"][data-v="kalender"]');
      await schritt(9);
      await klick('#pzu'); await klick('#menueknopf'); await klick('#vorstand');
      await schritt(10);
      await klick('#pzu'); await klick('#menueknopf'); await klick('#hq');
      await schritt(11); await klick('[data-ein="weiter"]');
      await schritt(12);
      await klick('#pzu'); await klick('#weiter'); await klick('[data-wa="ja"]');
      await schritt(13);
      await p.waitForSelector('#wochen-overlay .wb-bericht');
      await klick('[data-ein="weiter"]');
      await schritt(14);
      for (let i = 0; i < 4 && await p.locator('#wb-vorfall .wb-vorfall').count(); i++) {
        await p.locator('#wb-vorfall [data-wa="spaeter"]').click();
        await p.waitForTimeout(30);
      }
      if (await p.locator('#wochen-overlay .wb-bericht').count()) await klick('#wochen-overlay [data-wa="schliessen"]');
      await klick('#stadt-reise');
      await p.waitForSelector('[data-reiseziel="Düsseldorf"]');
      await klick('[data-reiseziel="Düsseldorf"]');
      await p.waitForFunction(() => window.spiel.einfuehrung.zustand().modus === 'fertig', null, { timeout: 40000 });
      const ergebnis = await p.evaluate(() => ({
        tutorial: window.spiel.einfuehrung.zustand(),
        stadt: window.spiel.reise.pruefe().stadt,
        woche: window.spiel.s.woche,
        freigaben: window.spiel.E.freigaben(window.spiel.s).anzahl,
      }));
      if (ergebnis.stadt !== 'Düsseldorf') fehler.push('Stadtwechsel nicht ausgeführt');
      if (ergebnis.tutorial.modus !== 'fertig') fehler.push('Einführung nicht abgeschlossen');
    } catch (e) {
      fehler.push(e.message);
    }
    fehler.push(...javascriptFehler);
    if (durchlauf.length !== 14) fehler.push('Bildnachweis nur ' + durchlauf.length + '/14 Schritte');
    const protokoll = { durchlauf, fehler, aufruf: 'node spiel-render.js --nur-einfuehrung',
      stand: 'Bilder und Protokoll nur nach tatsächlich ausgeführtem Browser-Test belastbar' };
    fs.writeFileSync(path.join(ordner, 'pruefung.json'), JSON.stringify(protokoll, null, 2));
    console.log('Einführung: ' + durchlauf.length + '/14 Schritte, ' + fehler.length + ' Fehler');
    if (fehler.length) throw new Error('Einführung: ' + fehler.join('; '));
  }
  if (process.argv.includes('--nur-einfuehrung')) {
    try { await einfuehrungPruefen(); } finally { await b.close(); }
    return;
  }

  // N01: Seed 1, Bot C, 104 Wochen, Serien-Endwerte und Bildbelege.
  async function statistikPruefen() {
    const ziel = path.join(__dirname, '..', 'bilder', 'nice', 'statistik');
    fs.mkdirSync(ziel, { recursive: true });
    await p.evaluate(() => { window.spiel.schliessePanel(); window.spiel.neuesSpiel(1, 'Essen'); });
    for (let i = 0; i < 104; i++) {
      const ergebnis = await p.evaluate(() => window.spiel.woche(true));
      if (!ergebnis) throw new Error('Bot C beendet vor Woche 104: ' + i);
    }
    const seiten = [['konzern','konzern'],['formate','formate'],['regionen','regionen'],['rangliste','haeuser']];
    const bericht = { seed:1, woche:104, bilder:[], abweichungen:[], reihen:0, hausverlaeufe:0, spielstandBytes:0 };
    const messung = await p.evaluate(() => {
      const s = window.spiel.s;
      const textBytes = x => new TextEncoder().encode(JSON.stringify(x)).length;
      const voller = textBytes(s);
      const verlaufBytes = s.haeuser.reduce((n,h)=>n+textBytes(h.verlauf??[]),0);
      return { hauser:s.haeuser.length, voller, verlaufBytes,
        proHaus:Math.round(verlaufBytes/Math.max(1,s.haeuser.length)),
        bei560:Math.round(verlaufBytes/Math.max(1,s.haeuser.length)*560),
        punkteMax:Math.max(...s.haeuser.map(h=>h.verlauf?.length??0)),
        sparsam: s.statistik?.sparsam ?? false };
    });
    bericht.hausverlaeufe = messung.hauser;
    bericht.spielstandBytes = messung.voller;
    bericht.groesse = messung;
    for (const [seite,datei] of seiten) {
      await p.evaluate(v => window.spiel.oeffneStatistik(v), seite);
      await p.waitForTimeout(150);
      const kontrolle = await p.evaluate(() => {
        const s=window.spiel.s, E=window.spiel.E, k=E.cockpit(s), liste=[];
        if (window.spiel.statistik.ui.seite === 'konzern') {
          const graphen=[...document.querySelectorAll('.stat-diagramm')];
          for (const [i,[name,soll]] of [['Umsatz',k.umsatzWoche],['EBITDA',k.ebitdaWoche],['Cash',k.cash]].entries()) {
            const ist=Number(graphen[i]?.dataset.stEnde);
            if (!Number.isFinite(ist)||ist!==soll) liste.push(name+': Endpunkt '+ist+' statt '+soll);
          }
        }
        return { seite:window.spiel.statistik.ui.seite, diagramme:document.querySelectorAll('.stat-diagramm').length,
          fehler:liste.concat(window.spiel.statistik.pruefe().fehler) };
      });
      bericht.reihen += kontrolle.diagramme;
      bericht.abweichungen.push(...kontrolle.fehler.map(f => seite + ': ' + f));
      await p.screenshot({ path:path.join(ziel,datei+'.png'), fullPage:false });
      bericht.bilder.push(datei+'.png');
    }
    const hausId = await p.evaluate(() => window.spiel.s.haeuser.find(h=>h.verlauf?.length && h.status === 'offen')?.id);
    if (hausId) {
      await p.evaluate(id=>window.spiel.oeffneHaus(id),hausId);
      // Q30: Hausdetail zeigt Umsatz und Deckungsbeitrag als zwei Balkenreihen (5 Wochen, je eigene Skala).
      const test = await p.evaluate((id) => {
        const reihen = [...document.querySelectorAll('#pinhalt .hk-balkenpaar .hk-balken')];
        const letzterBalken = reihen[0] ? [...reihen[0].querySelectorAll('[data-w]')].at(-1)?.dataset.w : null;
        return { diagramme: reihen.length, balken: letzterBalken == null ? null : Number(letzterBalken),
          letztes: window.spiel.E.verlauf(window.spiel.s, { ebene: 'haus', id, kennzahl: 'umsatz', wochen: 5 }).punkte.at(-1)?.wert };
      }, hausId);
      if(test.diagramme!==2)bericht.abweichungen.push('Hausdetail: '+test.diagramme+' Balkenreihen statt 2');
      else if(test.balken!==Math.round(test.letztes))bericht.abweichungen.push('Hausdetail: letzter Umsatzbalken '+test.balken+' statt '+test.letztes);
      await p.screenshot({ path:path.join(ziel,'hausdetail.png') });
      bericht.bilder.push('hausdetail.png');
    }
    fs.writeFileSync(path.join(ziel,'pruefung.json'),JSON.stringify(bericht,null,2));
    console.log('N01 Statistik:',bericht.reihen+' Diagramme, '+bericht.abweichungen.length+' Abweichungen, '+messung.voller+' Spielstand-Bytes');
    if(bericht.abweichungen.length)throw new Error('Statistik: '+bericht.abweichungen.join('; '));
    return bericht;
  }

  if (process.argv.includes('--nur-statistik')) { try { await statistikPruefen(); } finally { await b.close(); } return; }
  // O07 Haus: Oberfläche gegen echte Engine-Abfragen prüfen und alle sieben Reiter fotografieren.
  async function hausPruefen() {
    const fehler = [];
    const reiter = ['ueberblick','leitung','personal','ware','partner','kosten','kommentare'];
    const id = await p.evaluate(() => {
      window.spiel.neuesSpiel(1, 'Essen');
      return window.spiel.s.haeuser.find(h => h.stadt === 'Essen' && h.status === 'offen').id;
    });
    const check = await p.evaluate(id => window.spiel.pruefeHaus(id), id);
    fehler.push(...check.fehler);
    for (const r of reiter) {
      const daten = await p.evaluate(({id,r}) => {
        window.spiel.oeffneHausReiter(id,r);
        const el = document.getElementById('pinhalt'), d = window.spiel.E.hausUebersicht(window.spiel.s,id);
        const tab = el.querySelector('.haus-reiter button[aria-current=page] span');
        return { aktiv: tab?.textContent, tabs: el.querySelectorAll('.haus-reiter button').length, text: el.textContent, d };
      }, {id,r});
      if (daten.tabs !== 7) fehler.push(r + ': 7 Reiter erwartet');
      const title = {ueberblick:'Haus',leitung:'Leitung',personal:'Personal',ware:'Ware',partner:'Fläche',kosten:'Kosten',kommentare:'Notizen'}[r]; // Q30: Reiterleiste unten
      if (daten.aktiv !== title) fehler.push(r+': falscher aktiver Reiter ' + daten.aktiv);
      if (r==='ueberblick' && !daten.text.includes(String(daten.d.kundenScore))) fehler.push('Kundenscore stimmt nicht');
      if (r==='leitung' && !daten.text.includes(daten.d.leitungsdaten.name)) fehler.push('Name Hausleitung fehlt');
      if (r==='kosten' && !daten.text.includes('Energie')) fehler.push('Kostenposten Energie fehlt');
      if (r==='partner' && !daten.text.includes('Gastronomie')) fehler.push('Gastronomie fehlt');
      await bild('haus-o07-'+r+'.png');
    }
    const score = await p.evaluate(id => {
      const e=window.spiel.E,s=window.spiel.s,vor=e.hausKundenscore(s,s.haeuser.find(h=>h.id===id));
      const erg=e.fuehreAus(s,{typ:'hausKostenSetzen',haus:id,posten:'reinigung',faktor:0.6});
      const nach=e.hausKundenscore(s,s.haeuser.find(h=>h.id===id));
      return {vor,nach,erg};
    },id);
    if(!score.erg.ok || score.nach >= score.vor) fehler.push('Reinigungskürzung ohne Kundenscore-Absenkung');
    await p.evaluate(() => window.spiel.oeffneBeobachtung());
    await bild('haus-o07-beobachtung.png');
    await p.evaluate(() => window.spiel.oeffneHausReporting());
    await bild('haus-o07-reporting.png');
    const bericht = { id, pruefung:check, reinigen:score, reiter, fehler };
    fs.writeFileSync(path.join(__dirname,'out','haus-o07-pruefung.json'),JSON.stringify(bericht,null,2));
    if(fehler.length) throw Error('O07 Hausfehler: '+fehler.join('; '));
    return bericht;
  }
  if (process.argv.includes('--nur-haus')) {
    try { await hausPruefen(); } finally { await b.close(); }
    return;
  }
  // N14: Testpanel im iPhone-Viewport, 13 Wochen und Fehlerbericht-Roundtrip.
  async function werkzeugePruefen() {
    const ausgabe = path.join(__dirname, '..', 'bilder', 'nice', 'werkzeuge');
    fs.mkdirSync(ausgabe, { recursive: true });
    await p.evaluate(() => window.spiel.neuesSpiel(1, 'Essen'));
    const zuerst = await p.evaluate(() => ({
      verborgen: document.getElementById('werkzeuge').hidden,
      menue: getComputedStyle(document.getElementById('werkzeuge')).display,
      sichtbar: document.querySelector('.testwerkzeuge') !== null,
      markiert: !!window.spiel.s.testGenutzt,
    }));
    if (!zuerst.verborgen || zuerst.menue !== 'none' || zuerst.sichtbar || zuerst.markiert)
      throw new Error('Testwerkzeuge sind vor Freischaltung sichtbar: ' + JSON.stringify(zuerst));
    await p.evaluate(() => {
      const datum = document.querySelector('.datum');
      for (let i = 0; i < 5; i++) datum.click();
    });
    const offen = await p.evaluate(() => ({
      entsperrt: window.spiel.werkzeuge.freigeschaltet,
      kachel: !document.getElementById('werkzeuge').hidden,
      panel: !!document.querySelector('.testwerkzeuge'),
    }));
    if (!offen.entsperrt || !offen.kachel || !offen.panel)
      throw new Error('Fünffach-Tipp hat Werkzeuge nicht geöffnet: ' + JSON.stringify(offen));
    await p.screenshot({ path: path.join(ausgabe, 'testwerkzeuge.png') });
    const sprung = await p.evaluate(() => window.spiel.werkzeuge.springen(13, true));
    const snapshot = await p.evaluate(() => ({
      woche: window.spiel.s.woche, cash: window.spiel.s.cash,
      test: window.spiel.s.testGenutzt, label: document.getElementById('phase').textContent,
    }));
    if (sprung.fertig !== 13 || snapshot.woche !== 13 || !snapshot.test || !snapshot.label.includes('Testspiel'))
      throw new Error('Zeitsprung nicht korrekt: ' + JSON.stringify({ sprung, snapshot }));
    await p.evaluate(() => console.error('N14 Fehlerprobe'));
    const fehlerpunkt = await p.evaluate(() => document.querySelector('.datum').classList.contains('testfehler'));
    if (!fehlerpunkt) throw new Error('Fehlerpunkt nach Konsolenfehler fehlt.');
    const bericht = await p.evaluate(() => window.spiel.werkzeuge.erstelleBericht());
    if (!bericht.startsWith('RUHRKAUF-TEST-1:gzip:')) throw new Error('Fehlerbericht nicht gzip/Base64.');
    const archiv = await p.evaluate(async (b) => {
      const roh = atob(b.slice('RUHRKAUF-TEST-1:gzip:'.length));
      const bytes = Uint8Array.from(roh, (c) => c.charCodeAt(0));
      const text = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      const daten = JSON.parse(text);
      return {
        woche: daten.woche, cash: daten.spiel.cash, seed: daten.seed,
        fehler: daten.fehler.some((e) => e.text.includes('N14 Fehlerprobe')),
        userAgent: !!daten.userAgent, version: daten.version,
      };
    }, bericht);
    if (!archiv.fehler || !archiv.userAgent || archiv.version !== 1 || archiv.woche !== 13 || archiv.cash !== snapshot.cash)
      throw new Error('Komprimierter Fehlerbericht unvollständig: ' + JSON.stringify(archiv));
    await p.evaluate(() => window.spiel.neuesSpiel(3, 'Essen'));
    const wieder = await p.evaluate((b) => window.spiel.werkzeuge.berichtLaden(b), bericht);
    if (wieder.woche !== snapshot.woche || wieder.cash !== snapshot.cash || wieder.seed !== 1)
      throw new Error('Fehlerbericht verändert Spielstand: ' + JSON.stringify({ snapshot, wieder }));
    await p.screenshot({ path: path.join(ausgabe, 'testwerkzeuge-geladen.png') });
    await p.goto(url + '&werkzeuge=1', { waitUntil: 'load', timeout: 0 });
    await p.waitForFunction('window.bereit === true', null, { timeout: 0, polling: 500 });
    const urlFreischaltung = await p.evaluate(() => ({
      entsperrt: window.spiel.werkzeuge.freigeschaltet,
      geoeffnet: !!document.querySelector('.testwerkzeuge'),
    }));
    if (!urlFreischaltung.entsperrt || !urlFreischaltung.geoeffnet)
      throw new Error('URL-Freischaltung fehlgeschlagen: ' + JSON.stringify(urlFreischaltung));
    fs.writeFileSync(path.join(ausgabe, 'pruefung.json'), JSON.stringify({ zuerst, offen, sprung, snapshot, wieder, archiv, urlFreischaltung, berichtZeichen: bericht.length }, null, 2));
    console.log('N14 Testwerkzeuge: beide Freischaltungen, 13 Wochen, gzip-Bericht und Wiederherstellung identisch.');
    return { sprung, snapshot, wieder, urlFreischaltung };
  }
  if (process.argv.includes('--nur-werkzeuge')) { try { await werkzeugePruefen(); } finally { await b.close(); } return; }
  if (process.argv.includes('--nur-wettbewerber')) {
    try { await wettbewerberPruefen(); } finally { await b.close(); }
    return;
  }
  if (process.argv.includes('--nur-reise-woche')) { try { await reiseWochePruefen(); } finally { await b.close(); } return; }
  if (process.argv.includes('--nur-posteingang')) { await posteingangPruefen(); await b.close(); return; }
  if (process.argv.includes('--nur-start')) {
    const ergebnis = await startPruefen();
    await b.close();
    const fehler = ergebnis.aktionen.filter((x) => !x.ok);
    if (fehler.length) throw new Error(`Browser-Smoke-Test: ${fehler.length} Fehler: ${fehler.map((x) => x.name).join(', ')}`);
    return;
  }
  // Q30/Q31: verbotene Muster (Schatten, Schrift < 12 px, Touch-Ziel < 44 px, Platzhalter, Verläufe, Summen) für alle
  // umgestellten Panels; endet mit Fehler. Panellisten: tests/q30-, q31-, q32-panelliste.cjs. Q32 ergänzt Überlauf,
  // Kontrast (WCAG AA), helle Flächen, Rot ohne Gefahr, interne Kürzel, Dezimalpunkt, doppelte Titel, Unterstreichung.
  async function stilPruefen() {
    const { panelLauf } = require('./tests/q30-stil.cjs');
    const listen = ['./tests/q30-panelliste.cjs', './tests/q31-panelliste.cjs', './tests/q32-panelliste.cjs'].filter((f) => fs.existsSync(path.join(__dirname, f)));
    const alle = listen.flatMap((f) => require(f).PANELS);
    const panels = [...alle.filter((x) => !/^spielende/.test(x.name)), ...alle.filter((x) => /^spielende/.test(x.name))]; // Spielende beendet den Spielstand
    await p.evaluate(() => window.spiel.schliessePanel());
    const erg = await panelLauf(p, panels);
    const schlecht = erg.filter((e) => e.fehler || e.verstoesse?.length);
    fs.writeFileSync(path.join(__dirname, 'out', 'stil-pruefung.json'), JSON.stringify(erg, null, 1));
    console.log(`Stilprüfung: ${erg.length} umgestellte Panels geprüft, ${schlecht.length} mit Verstößen`);
    if (schlecht.length) process.exitCode = 1;
  }
  if (process.argv.includes('--nur-panels')) { await startPruefen(); await panelsPruefen(); await stilPruefen(); await b.close(); return; }
  if (process.argv.includes('--nur-karte') || process.argv.includes('--nur-gesten')) { await kartePruefen(); await b.close(); return; }
  if (process.argv.includes('--nur-einkauf')) { await einkaufPruefen(); await b.close(); return; }
  // Kamera auf die Hartwig-Häuser der Stadt
  const fokus = () => p.evaluate(() => window.spiel.fokusHaeuser());
  await fokus();
  await bild('spiel-w00.png');
  const pruefung = [];
  const pruefe = async (wann) => { const r = await p.evaluate(() => window.spiel.pruefeAnzeigen()); pruefung.push({ wann, ...r }); console.log(`Prüfung ${wann} (KW ${r.kw}/${r.jahr}): Image ${r.cockpit.image}, HQ ${r.hq ? r.hq.kostenWoche + ' €/Woche, ' + r.hq.fte + ' FTE' : '-'} · ${r.fehler.length ? 'FEHLER ' + r.fehler.join('; ') : 'Anzeige = Engine'}`); };
  // Zentrale in Woche 0 (vor jeder Bot-Aktion)
  await p.evaluate(() => window.spiel.oeffneHq());
  await p.waitForTimeout(300);
  await pruefe('Woche 0');
  await bild('spiel-hq-w00.png');
  await p.evaluate(() => window.spiel.schliessePanel());
  console.log('Teile nach Füllen W0:', JSON.stringify(await p.evaluate(() => ({ ...window.spiel.teileStand(), sichtbarKlotz: window.spiel.kachelInfo() }))));
  const wochen = [];
  for (let w = 0; w < 52; w++) {
    const m = await p.evaluate(() => window.spiel.woche(true));
    if (m) wochen.push(m);
    if (m?.neu.length) console.log(`W${m.woche}: neu gebaut ${m.neu.join(', ')} (${m.neuBauMs} ms)`);
    if (m?.woche === 26) await bild('spiel-w26.png');
  }
  await bild('spiel-w52.png');
  // Hauspanel: erstes Warenhaus der Stadt antippen (echtes Antippen über den Bildschirmpunkt des Hauses)
  const punkt = await p.evaluate(() => { const ids = [...window.spiel.sb.haeuser.keys()]; return ids.find((id) => id.startsWith('W')) ?? ids[0]; });
  const tipp = await p.evaluate((id) => window.spiel.tippPunkt(id), punkt);
  if (tipp) await p.touchscreen.tap(tipp.x, tipp.y);
  const offen = await p.evaluate(() => document.getElementById('panel').classList.contains('offen'));
  if (!offen) await p.evaluate((id) => window.spiel.oeffneHaus(id), punkt);
  await p.waitForTimeout(400);
  await bild('spiel-haus.png');
  // O02: Hauswerte und Treiberdarstellung gegen die Engine prüfen.
  await pruefe('Haus Umsatztreiber');
  await p.evaluate(() => window.spiel.oeffneReporting());
  await p.waitForTimeout(150);
  await pruefe('Reporting Umsatzbrücke');
  await bild('spiel-reporting.png');
  await p.evaluate(() => window.spiel.schliessePanel());
  // HQ-Übersicht
  await p.evaluate(() => { window.spiel.schliessePanel(); document.getElementById('hq').click(); });
  await p.waitForTimeout(400);
  if (await p.evaluate(() => document.getElementById('panel').classList.contains('offen'))) { await pruefe('Woche 52'); await bild('spiel-hq.png'); }
  await p.evaluate(() => window.spiel.schliessePanel());
  // Standardstadt Essen: Aufbauzeit messen und Bild
  await p.evaluate(() => window.spiel.stadt('Essen'));
  await fokus();
  await bild('spiel-essen.png');
  // Zentrale in Essen: Gebäude in der Stadt, Panel mit Abteilungen, Stufe + für Controlling
  const hqInfo = await p.evaluate(() => { const x = [...window.spiel.sb.hqs.values()]; if (!x.length) return null; const q = x[0].p; window.spiel.kamera({ x: q.x + q.w / 2, z: q.z + q.d / 2, halb: 115 }); return { anzahl: x.length, id: x[0].p.standort.id }; });
  console.log('HQ-Gebäude in Essen:', JSON.stringify(hqInfo));
  if (hqInfo) {
    await bild('spiel-essen-hq.png');
    await p.evaluate(() => document.getElementById('hq').click());
    await p.waitForTimeout(300);
    await p.evaluate(() => { const b = [...document.querySelectorAll('.abt .stufe .mini')].find((q) => q.textContent === '+'); b?.click(); });
    await p.waitForTimeout(400);
    console.log('HQ-Aktion:', await p.evaluate(() => document.getElementById('meldung').textContent));
    await p.evaluate(() => { const a = document.querySelector('.abt'); a?.scrollIntoView(); });
    await bild('spiel-hq-abteilungen.png');
    await p.evaluate(() => window.spiel.schliessePanel());
  }
  const ek = await einkaufPruefen();
  const sp = await startPruefen();
  const pn = await panelsPruefen();
  await posteingangPruefen();
  const kt = await kartePruefen();
  const ms = await massstabPruefen();
  await statistikPruefen();
  const messung = await p.evaluate(() => window.spiel.messung);
  const teile = await p.evaluate(() => window.spiel.teileStand());
  const engine = wochen.map((m) => m.engineMs), neu = wochen.filter((m) => m.neu.length).map((m) => m.neuBauMs);
  const mittel = (l) => (l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : 0);
  const km = messung.kachelMs;
  const zusammen = { stadt: messung.stadtMs, teileEssenNachFuellen: teile, kachelMittelMs: mittel(km), kachelMaxMs: km.length ? Math.max(...km) : 0, wocheEngineMittelMs: mittel(engine), wocheEngineMaxMs: Math.max(...engine), neuBauMittelMs: mittel(neu), neuBauMaxMs: neu.length ? Math.max(...neu) : 0, wochenMitNeubau: neu.length, renderMittelMs: mittel(messung.renderMs), angetippt: !!(tipp && offen) };
  zusammen.anzeigeFehler = pruefung.reduce((a, q) => a + q.fehler.length, 0);
  zusammen.einkaufAbweichungen = ek.abweichungen; zusammen.einkaufAktionenOk = `${ek.aktionen.filter((x) => x.ok).length}/${ek.aktionen.length}`;
  zusammen.startOk = `${sp.aktionen.filter((x) => x.ok).length}/${sp.aktionen.length}`;
  zusammen.panelsWerte = pn.werte; zusammen.panelsAbweichungen = pn.abweichungen; zusammen.panelsAktionenOk = `${pn.aktionen.filter((x) => x.ok).length}/${pn.aktionen.length}`;
  zusammen.massstabPruefungen = ms.pruefungen.length; zusammen.massstabAbweichungen = ms.fehler.length;
  zusammen.karte = kt.staedte.map((x) => ({ stadt: x.stadt, maxHalb: x.max, bildbreiteM: x.bildbreiteM, anteilBreite: x.anteilBreite, randPixel: x.randPixelMitte + Object.values(x.raender).reduce((a, q) => a + q.randPixel, 0), ecken: x.eckenErreicht })); zusammen.karteGestenOk = `${kt.gesten.filter((x) => x.ok).length}/${kt.gesten.length}`;
  fs.writeFileSync(path.join(__dirname, 'out', 'spiel-messung.json'), JSON.stringify({ ...zusammen, pruefung, wochen }, null, 1));
  console.log(JSON.stringify(zusammen));
  await b.close();
})();

// Aufruf: node spiel-render.js [--bundle] [--nur-einkauf] [--nur-panels] [--nur-karte] [--stadt Karlsruhe] [--seed 1]
// Bündelt src/spiel.js (Engine-TS direkt aus /home/claude/turnaround/src) nach spiel-bundle.js. Mit --bundle nur bündeln.
// Sonst headless im Hochformat 390 × 844: Woche 0, 26 und 52 mit Bot-Strategie C, dazu ein Bild mit offenem Hauspanel
// (out/spiel-w00.png, out/spiel-w26.png, out/spiel-w52.png, out/spiel-haus.png, out/spiel-hq-w00.png, out/spiel-hq.png, out/spiel-essen.png, out/spiel-essen-hq.png, out/spiel-hq-abteilungen.png), Messwerte nach out/spiel-messung.json.
// Einkauf (EINKAUF-VERTRAG.md, Prototyp): neues Spiel in Essen, 8 Wochen, dann Panels per Antippen mit Abgleich gegen die
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
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'spiel.js')], bundle: true, outfile: path.join(__dirname, 'spiel-bundle.js'),
    loader: { '.json': 'json' }, logLevel: 'error', format: 'iife', target: 'es2020', plugins: [ersatzPlugin],
    // scripts/bot.ts prüft require.main === module (nur für den Aufruf in Node)
    define: { 'require.main': 'null', module: 'undefined' },
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
  const url = 'file://' + path.join(__dirname, 'spiel.html') + `?stadt=${encodeURIComponent(stadt)}&seed=${seed}`;
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
    await tippe(`[data-a=kuerzenAuf][data-v="${bb.id}"]`);
    await tippe(`[data-a=kuerzen][data-v="${bb.id}"][data-p2="25"]`);
    const nB = await orders(bb.wg);
    pruefSoll('Kürzen um 25 % und freigeben', Math.abs(nB - oB - bb.wert * 0.75) <= bb.lieferungen.length + 1, `${bb.wg}: offene Orders +${nB - oB} bei Order ${bb.wert}`);
    await tippe(`[data-a=ablehnen][data-v="${c.id}"]`);
    const wegC = await ev((id) => !window.spiel.E.freigaben(window.spiel.s).liste.some((o) => o.id === id), c.id);
    pruefSoll('Ablehnen', wegC, c.id);
    await tippe('[data-a=grenze][data-v="10000"]');
    const gr = await ev(() => window.spiel.E.freigaben(window.spiel.s).grenze);
    pruefSoll('Freigabegrenze +10.000 €', gr === 60000, `${gr} €`);
    await tippe('[data-a=filterArt][data-v=nos]');
    const nos = await ev(() => window.spiel.E.freigaben(window.spiel.s, { art: 'nos' }).anzahl);
    await pruef('Freigaben Filter NOS');
    if (nos) await tippe('[data-a=sammel]');
    const nosDanach = await ev(() => window.spiel.E.freigaben(window.spiel.s, { art: 'nos' }).anzahl);
    pruefSoll('Sammelfreigabe NOS', nosDanach === 0, `${nos} NOS-Orders freigegeben, offen ${nosDanach}`);
    await pruef('Freigaben nach Aktionen');
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
    pruefSoll('Folgewoche: Regler und Grenze wirken weiter', nach.servicegrad === 0.98 && nach.grenze === 60000, `Servicegrad ${nach.servicegrad}, Grenze ${nach.grenze}`);
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
    await tippe('[data-a=kanalBudget][data-k=online][data-v="1"]');
    const kb1 = await ev(() => window.spiel.E.kanaele(window.spiel.s).kanaele.find((k) => k.id === 'online').budgetWoche);
    soll('Kanal Online +10 %', Math.abs(kb1 / kb0 - 1.1) < 0.01, `${kb0} → ${kb1} € je Woche`);
    await pruef('marketing', 'Kanäle');
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
    await tippe('.typkacheln button:not(.voll):not(.an)');
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
    await q.goto('file://' + path.join(__dirname, 'spiel.html'), { waitUntil: 'load', timeout: 0 });
    await q.waitForSelector('#start.an', { timeout: 60000 });
    const karten = await q.evaluate(() => [...document.querySelectorAll('.stufe-karte')].map((k) => k.querySelector('b').textContent));
    soll('Startbildschirm mit drei Schwierigkeiten', karten.length === 3, karten.join(', '));
    await q.screenshot({ path: path.join(__dirname, 'out', 'start.png') });
    console.log('gespeichert:', path.join(__dirname, 'out', 'start.png'));
    await q.tap('.stufe-karte[data-v=schwer]');
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
    await p.screenshot({ path: path.join(bilder, 'posteingang-wochenstreifen.png') });
    await p.evaluate(() => window.spiel.oeffnePosteingang('handeln'));
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
  if (process.argv.includes('--nur-posteingang')) { await posteingangPruefen(); await b.close(); return; }
  if (process.argv.includes('--nur-start')) {
    const ergebnis = await startPruefen();
    await b.close();
    const fehler = ergebnis.aktionen.filter((x) => !x.ok);
    if (fehler.length) throw new Error(`Browser-Smoke-Test: ${fehler.length} Fehler: ${fehler.map((x) => x.name).join(', ')}`);
    return;
  }
  if (process.argv.includes('--nur-panels')) { await startPruefen(); await panelsPruefen(); await b.close(); return; }
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
  zusammen.karte = kt.staedte.map((x) => ({ stadt: x.stadt, maxHalb: x.max, bildbreiteM: x.bildbreiteM, anteilBreite: x.anteilBreite, randPixel: x.randPixelMitte + Object.values(x.raender).reduce((a, q) => a + q.randPixel, 0), ecken: x.eckenErreicht })); zusammen.karteGestenOk = `${kt.gesten.filter((x) => x.ok).length}/${kt.gesten.length}`;
  fs.writeFileSync(path.join(__dirname, 'out', 'spiel-messung.json'), JSON.stringify({ ...zusammen, pruefung, wochen }, null, 1));
  console.log(JSON.stringify(zusammen));
  await b.close();
})();

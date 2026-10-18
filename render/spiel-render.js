// Aufruf: node spiel-render.js [--bundle] [--nur-einkauf] [--stadt Karlsruhe] [--seed 1]
// Bündelt src/spiel.js (Engine-TS direkt aus /home/claude/turnaround/src) nach spiel-bundle.js. Mit --bundle nur bündeln.
// Sonst headless im Hochformat 390 × 844: Woche 0, 26 und 52 mit Bot-Strategie C, dazu ein Bild mit offenem Hauspanel
// (out/spiel-w00.png, out/spiel-w26.png, out/spiel-w52.png, out/spiel-haus.png, out/spiel-hq-w00.png, out/spiel-hq.png, out/spiel-essen.png, out/spiel-essen-hq.png, out/spiel-hq-abteilungen.png), Messwerte nach out/spiel-messung.json.
// Einkauf (EINKAUF-VERTRAG.md, Prototyp): neues Spiel in Essen, 8 Wochen, dann Panels per Antippen mit Abgleich gegen die
// Engine-Abfragen und Aktionen (Freigabe, Kürzen, Ablehnen, Sammelfreigabe, Regler, Marke gründen) samt Wirkung in der
// Folgewoche: out/einkauf-uebersicht.png, einkauf-wg.png, einkauf-freigaben.png, eigenmarken.png, eigenmarke-gruenden.png,
// haus-eigenmarke.png, Ergebnis nach out/einkauf-pruefung.json. --nur-einkauf überspringt den Rest.
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };

async function buendeln() {
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'spiel.js')], bundle: true, outfile: path.join(__dirname, 'spiel-bundle.js'),
    loader: { '.json': 'json' }, logLevel: 'error', format: 'iife', target: 'es2020',
    // scripts/bot.ts prüft require.main === module (nur für den Aufruf in Node)
    define: { 'require.main': 'null', module: 'undefined' },
  });
}

(async () => {
  const t0 = Date.now();
  await buendeln();
  console.log('gebündelt:', path.join(__dirname, 'spiel-bundle.js'), `${Date.now() - t0} ms`);
  if (process.argv.includes('--bundle')) return;
  const stadt = arg('--stadt', 'Karlsruhe'), seed = arg('--seed', '1');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: true, args: ['--headless=new', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=6144'] });
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
  const messung = await p.evaluate(() => window.spiel.messung);
  const teile = await p.evaluate(() => window.spiel.teileStand());
  const engine = wochen.map((m) => m.engineMs), neu = wochen.filter((m) => m.neu.length).map((m) => m.neuBauMs);
  const mittel = (l) => (l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : 0);
  const km = messung.kachelMs;
  const zusammen = { stadt: messung.stadtMs, teileEssenNachFuellen: teile, kachelMittelMs: mittel(km), kachelMaxMs: km.length ? Math.max(...km) : 0, wocheEngineMittelMs: mittel(engine), wocheEngineMaxMs: Math.max(...engine), neuBauMittelMs: mittel(neu), neuBauMaxMs: neu.length ? Math.max(...neu) : 0, wochenMitNeubau: neu.length, renderMittelMs: mittel(messung.renderMs), angetippt: !!(tipp && offen) };
  zusammen.anzeigeFehler = pruefung.reduce((a, q) => a + q.fehler.length, 0);
  zusammen.einkaufAbweichungen = ek.abweichungen; zusammen.einkaufAktionenOk = `${ek.aktionen.filter((x) => x.ok).length}/${ek.aktionen.length}`;
  fs.writeFileSync(path.join(__dirname, 'out', 'spiel-messung.json'), JSON.stringify({ ...zusammen, pruefung, wochen }, null, 1));
  console.log(JSON.stringify(zusammen));
  await b.close();
})();

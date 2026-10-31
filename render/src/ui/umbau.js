// O08/E48 Umbau: Bestand je Cluster, Bauprogramm über mehrere Cluster, Haus mit Etagenschnitt, Vorher/Nachher.
// Hauptfrage der Konzernseite: Wo steht der Bestand, und was bauen wir als Nächstes?
import { geld, esc, fmt } from './format.js';
import * as K from './komponenten.js';
const ETAGE = (nr) => nr === -1 ? 'UG' : nr === 0 ? 'EG' : nr + '. OG';
const ETAGE_LANG = (nr) => nr === -1 ? 'Untergeschoss' : nr === 0 ? 'Erdgeschoss' : nr + '. Obergeschoss';
const GRUPPEN = [['technik', 'Technik'], ['moebel', 'Möbel'], ['oberflaeche', 'Boden'], ['fassade', 'Fassade']];
const GEWERK_FOLGE = ['moebel', 'oberflaeche', 'klima', 'licht', 'brandschutz', 'foerdertechnik', 'fassade', 'komplett'];
const ZUSTAND = ['schlecht', 'mittel', 'gut'];
const prozent = (x, n = 1) => (Number(x) || 0).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n }) + ' %';
const mio = (x) => ((Number(x) || 0) / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' Mio. €';

/** Vier einfarbige Füllbalken (Anteil gut) mit Kürzel darunter. */
function zustandsBalken(gut) {
  return '<span class="hw-bestand" role="img" aria-label="' + esc(GRUPPEN.map(([g, n]) => n + ' ' + (gut[g] ?? 0) + ' % gut').join(', ')) + '">'
    + GRUPPEN.map(([g, n]) => '<span><i style="--a:' + Math.max(0, Math.min(100, gut[g] ?? 0)) + '%"></i><small>' + esc(n.slice(0, 1)) + '</small></span>').join('') + '</span>';
}
/** Etagenschnitt: je Etage eine Zeile, je Gewerkgruppe ein Feld (3 Stufen), Baustelle schraffiert. */
function etagenSchnitt(etagen) {
  const zeilen = etagen.map((e) => '<div class="hw-schnitt-zeile' + (e.baustelle ? ' bau' : '') + (e.gesperrt ? ' zu' : '') + '"><b>' + ETAGE(e.etage) + '</b>'
    + GRUPPEN.map(([g]) => '<i data-z="' + e.zustand[g] + '"></i>').join('') + '</div>').join('');
  return '<div class="hw-schnitt" role="img" aria-label="Etagenschnitt">' + '<div class="hw-schnitt-kopf"><b></b>' + GRUPPEN.map(([, n]) => '<span>' + esc(n) + '</span>').join('') + '</div>' + zeilen
    + '<div class="hw-schnitt-legende"><span><i data-z="2"></i>gut</span><span><i data-z="1"></i>mittel</span><span><i data-z="0"></i>schlecht</span><span><i class="bau"></i>Baustelle</span></div></div>';
}

export function umbauModul(ctx) {
  const E = ctx.E, s = () => ctx.s();
  const ui = { aktiv: false, seite: 'bestand', haus: null, etage: 0, gewerk: 'moebel', cluster: null, projekt: null,
    auftrag: { cluster: [], gewerk: 'moebel', bisZustand: 0, parallel: 6 } };
  const kw = (w) => 'KW ' + ((w % 52) + 1) + '/' + (s().startJahr + Math.floor(w / 52));
  const G = () => E.GEWERKE ?? {};

  // ───────────── Hausdetail-Karte (Reiter Überblick)
  function hausKarte(id) {
    if (typeof E.umbauHaus !== 'function') return '';
    const h = s().haeuser.find((x) => x.id === id);
    const cl = typeof E.bestandCluster === 'function' && h?.hauscluster ? E.bestandCluster(s(), h.hauscluster) : null;
    const eintrag = cl?.haeuser.find((x) => x.id === id);
    const kritisch = (eintrag?.etagen ?? []).filter((e) => e.substanz < 35).length;
    return K.abschnitt('Bau und Technik', kritisch ? kritisch + (kritisch === 1 ? ' Etage kritisch' : ' Etagen kritisch') : (h?.etagen.length ?? 0) + ' Etagen')
      + '<div data-umbau-karte="' + esc(id) + '">' + (eintrag ? etagenSchnitt(eintrag.etagen) : '') + '</div>'
      + K.knoepfe(K.knopf('Umbau planen', 'data-umbau="planen" data-id="' + esc(id) + '" data-etage="' + (eintrag?.etagen.slice().sort((a, b) => a.substanz - b.substanz)[0]?.etage ?? 0) + '"', 'zweit'),
        K.knopf('Bestand im Konzern', 'data-umbau="modernisierung"', 'text'));
  }

  // ───────────── Haus: Etagenschnitt und Gewerke je Etage
  function planen() {
    const h = s().haeuser.find((x) => x.id === ui.haus);
    const cl = h?.hauscluster && typeof E.bestandCluster === 'function' ? E.bestandCluster(s(), h.hauscluster)?.haeuser.find((x) => x.id === ui.haus) : null;
    const etagen = cl?.etagen ?? [];
    const e = etagen.find((x) => x.etage === ui.etage) ?? etagen[0];
    if (e) ui.etage = e.etage;
    const rest = E.bestandUebersicht(s()).rest;
    const p = E.gewerkSchaetzung(s(), ui.haus, ui.etage, ui.gewerk);
    const laeuft = !!e?.baustelle;
    let x = K.gross([{ label: 'Kosten', wert: geld(p?.kosten ?? 0), ton: (p?.kosten ?? 0) > rest ? 'schlecht' : '', unter: 'Budget frei ' + esc(geld(rest)) },
      { label: 'Bauzeit', wert: (p?.wochen ?? 0) + ' Wochen', unter: esc(G()[ui.gewerk]?.ebene === 'haus' ? 'ganzes Haus' : ETAGE_LANG(ui.etage)) }]);
    x += K.abschnitt('Etagenschnitt', 'Etage antippen');
    x += etagenSchnitt(etagen);
    x += K.liste(etagen.map((q) => K.zeile({ was: ETAGE_LANG(q.etage) + (q.etage === ui.etage ? ' · gewählt' : ''),
      unter: GRUPPEN.map(([g, n]) => n + ' ' + ZUSTAND[q.zustand[g]]).join(' · ') + (q.baustelle ? ' · <span class="hw-achtung">Baustelle bis ' + kw(q.baustelle.ende) + '</span>' : q.gesperrt ? ' · <span class="hw-schlecht">behördlich gesperrt</span>' : ''),
      wert: q.substanz + ' / 100', wertUnter: 'Substanz', ton: q.substanz < 35 ? 'schlecht' : q.substanz < 55 ? 'achtung' : '', tippbar: true,
      attr: 'data-umbau="etage" data-etage="' + q.etage + '" aria-label="' + esc(ETAGE_LANG(q.etage)) + ' wählen"' })));
    x += K.abschnitt('Gewerk', ETAGE_LANG(ui.etage));
    x += K.liste(GEWERK_FOLGE.map((g) => {
      const d = G()[g], q = E.gewerkSchaetzung(s(), ui.haus, ui.etage, g), z = e?.gewerke?.[g];
      return K.zeile({ was: esc(d.name) + (g === ui.gewerk ? ' · gewählt' : ''), unter: (z != null ? 'heute ' + ZUSTAND[z] + ' · ' : '') + esc(d.text),
        wert: esc(geld(q?.kosten ?? 0)), wertUnter: (q?.wochen ?? 0) + ' Wochen', tippbar: true, attr: 'data-umbau="gewerkwahl" data-v="' + g + '"' });
    }));
    x += K.liste([
      K.zeile({ was: 'Umsatzausfall in der Bauzeit', wert: esc(geld(p?.ausfall ?? 0)), ton: 'schlecht' }),
      K.zeile({ was: 'Mehrumsatz im Jahr', wert: esc(geld(p?.plusJahr ?? 0)), ton: 'gut' }),
      K.zeile({ was: 'Rendite auf den Bruttogewinn', wert: prozent(p?.rendite ?? 0), wertUnter: 'im Jahr' })]);
    if (laeuft) x += K.hinweis('Auf dieser Etage läuft bereits eine Baustelle.', 'achtung');
    else if ((p?.kosten ?? 0) > rest) x += K.hinweis('Die Kosten übersteigen das freie Baubudget.', 'achtung');
    x += K.knoepfe(K.knopf('Umbau starten', 'data-umbau="starten"', 'breit', laeuft));
    x += K.knoepfe(K.knopf('Zum Bestand', 'data-umbau="modernisierung"', 'text'));
    ctx.panel('Umbau planen', (h?.name ?? 'Haus') + ' · ' + ETAGE(ui.etage), K.bereich('haus', 'umbau') + '<div class="hw-g5">' + K.rumpf(x) + '</div>');
  }

  // ───────────── Konzern: Bestand je Cluster
  function bestand() {
    const u = E.bestandUebersicht(s()), g = u.gesamt;
    const schlechtM = g.schlecht.moebel, schlechtT = g.schlecht.technik;
    const sp = K.sprecher({ text: schlechtM + ' % der Etagen haben Möbel aus den 90ern, ' + schlechtT + ' % alte Technik. Bedarf ' + mio(g.bedarf) + '.' });
    let x = K.gross([{ label: 'Budget frei', wert: geld(u.rest), ton: u.rest <= 0 ? 'schlecht' : '', unter: 'von ' + esc(geld(u.budget)) },
      { label: 'Baustellen', wert: String(u.programme.reduce((a, p) => a + p.laufend, 0) + (s().umbau?.projekte ?? []).filter((p) => p.status === 'laufend' && !p.programm).length), unter: g.fristen + ' Prüffristen in 12 Monaten' }]);
    x += K.abschnitt('Zustand Konzern', 'Anteil gut je Gewerk');
    x += K.liste([K.zeile({ was: g.haeuser + ' Häuser', unter: fmt.format(g.etagen) + ' Etagen' + (g.gesperrt ? ' · <span class="hw-schlecht">' + g.gesperrt + ' gesperrt</span>' : ''), wert: zustandsBalken(g.gut) })]);
    x += K.knoepfe(K.knopf('Bauprogramm anlegen', 'data-umbau="assistent"', 'breit'));
    const laufend = u.programme.filter((p) => p.status === 'laufend');
    if (laufend.length) {
      x += K.abschnitt('Laufende Bauprogramme', String(laufend.length));
      x += K.liste(laufend.map((p) => K.zeile({ was: esc(p.name), unter: p.fertig + ' fertig · ' + p.laufend + ' im Bau · ' + p.warteschlange + ' warten',
        wert: Math.round(p.fertig / Math.max(1, p.gesamt) * 100) + ' %', wertUnter: esc(geld(p.kosten)), tippbar: true, attr: 'data-umbau="programm" data-id="' + esc(p.id) + '"' })));
    }
    x += K.abschnitt('Cluster', 'T Technik · M Möbel · B Boden · F Fassade');
    x += K.liste(u.cluster.map((c) => K.zeile({ was: esc(c.name), unter: c.haeuser + ' Häuser · ' + mio(c.bedarf) + (c.baustellen ? ' · ' + c.baustellen + ' im Bau' : '') + (c.fristen ? ' · <span class="hw-achtung">' + c.fristen + ' Fristen</span>' : ''),
      wert: zustandsBalken(c.gut), tippbar: true, attr: 'data-umbau="cluster" data-id="' + esc(c.id) + '"' })));
    ctx.panel('Modernisierung', 'Bestand und Bauprogramme', K.bereich('haus', 'umbau') + sp + '<div class="hw-g5">' + K.rumpf(x) + '</div>', 'gross');
  }
  function cluster() {
    const c = E.bestandCluster(s(), ui.cluster);
    if (!c) { ui.seite = 'bestand'; return bestand(); }
    const zeile = E.bestandUebersicht(s()).cluster.find((q) => q.id === c.id);
    let x = zeile ? K.gross([{ label: 'Möbel gut', wert: zeile.gut.moebel + ' %' }, { label: 'Bedarf', wert: mio(zeile.bedarf) }]) : '';
    x += K.knoepfe(K.knopf('Bauprogramm für diesen Cluster', 'data-umbau="assistent" data-id="' + esc(c.id) + '"', 'breit'));
    x += K.abschnitt('Häuser', 'T Technik · M Möbel · B Boden · F Fassade');
    x += K.liste(c.haeuser.map((h) => K.zeile({ was: esc(h.name), unter: esc(h.stadt) + ' · ' + h.etagen.length + ' Etagen' + (h.etagen.some((e) => e.baustelle) ? ' · im Bau' : ''),
      wert: zustandsBalken(h.gut), tippbar: true, attr: 'data-umbau="planen" data-id="' + esc(h.id) + '" data-etage="' + (h.etagen.slice().sort((a, b) => a.substanz - b.substanz)[0]?.etage ?? 0) + '"' })));
    x += K.knoepfe(K.knopf('Zum Bestand', 'data-umbau="modernisierung"', 'text'));
    ctx.panel(c.name, 'Bestand im Cluster', K.bereich('haus', 'umbau') + '<div class="hw-g5">' + K.rumpf(x) + '</div>', 'gross');
  }

  // ───────────── Bauprogramm-Assistent
  function assistent() {
    const a = ui.auftrag, u = E.bestandUebersicht(s());
    const v = a.cluster.length ? E.bauprogrammSchaetzung(s(), a) : null;
    let x = K.gross([{ label: 'Kosten', wert: v ? mio(v.kosten) : '–', ton: v?.ueberBudget ? 'schlecht' : '', unter: 'Budget frei ' + esc(geld(u.rest)) },
      { label: 'Bauzeit', wert: v ? v.wochen + ' Wochen' : '–', unter: v ? v.haeuser + ' Häuser · ' + v.auftraege + ' Baustellen' : 'Cluster wählen' }]);
    x += K.abschnitt('1 · Gewerk');
    x += K.liste(GEWERK_FOLGE.map((g) => K.zeile({ was: esc(G()[g].name) + (g === a.gewerk ? ' · gewählt' : ''), unter: esc(G()[g].text), tippbar: true, attr: 'data-umbau="agewerk" data-v="' + g + '"' })));
    x += K.abschnitt('2 · Umfang');
    x += K.seg([['0', 'nur schlechte'], ['1', 'schlechte und mittlere']], String(a.bisZustand), (w) => 'data-umbau="abis" data-v="' + w + '"');
    x += K.feld('Gleichzeitige Baustellen', K.stepper({ wert: String(a.parallel), unter: 'je Haus eine', attrMinus: 'data-umbau="apar" data-v="-1"', attrPlus: 'data-umbau="apar" data-v="1"', minusAus: a.parallel <= 1, plusAus: a.parallel >= 40, label: 'Gleichzeitige Baustellen' }));
    x += K.abschnitt('3 · Cluster', a.cluster.length + ' gewählt');
    x += K.knoepfe(K.knopf('Alle', 'data-umbau="aalle"', 'zweit'), K.knopf('Keine', 'data-umbau="akeine"', 'zweit'), K.knopf('Schlechteste 5', 'data-umbau="aschlecht"', 'zweit'));
    const grp = G()[a.gewerk]?.gruppe, sortGruppe = grp === 'komplett' ? 'moebel' : grp;
    x += u.cluster.slice().sort((p, q) => (p.gut[sortGruppe] ?? 0) - (q.gut[sortGruppe] ?? 0)).map((c) => K.schalter({ text: c.name,
      unter: c.haeuser + ' Häuser · ' + GRUPPEN.find(([g]) => g === sortGruppe)[1] + ' gut ' + (c.gut[sortGruppe] ?? 0) + ' %', an: a.cluster.includes(c.id), attr: 'data-umbau="acluster" data-id="' + esc(c.id) + '"' })).join('');
    if (v) {
      x += K.abschnitt('Vorschau');
      x += K.liste([
        K.zeile({ was: 'Umsatzausfall in der Bauzeit', wert: esc(mio(v.ausfall)), ton: 'schlecht' }),
        K.zeile({ was: 'Mehrumsatz im Jahr danach', wert: esc(mio(v.plusJahr)), ton: 'gut' }),
        K.zeile({ was: 'Mehr Bruttogewinn im Jahr', wert: esc(mio(v.ertragJahr)), wertUnter: v.amortisationJahre != null ? 'Amortisation ' + v.amortisationJahre.toLocaleString('de-DE') + ' Jahre' : '' }),
        K.zeile({ was: 'Höchste Zahlung in einer Woche', wert: esc(mio(v.spitzeWoche)), wertUnter: 'Liquidität' })]);
      if (!v.auftraege) x += K.hinweis('In diesen Clustern ist für dieses Gewerk nichts mehr zu tun.', 'achtung');
      else if (v.ueberBudget) x += K.hinweis('Das Programm übersteigt das freie Baubudget dieses Jahres.', 'achtung');
    }
    x += K.knoepfe(K.knopf('Bauprogramm starten', 'data-umbau="astart"', 'breit', !v?.auftraege));
    x += K.knoepfe(K.knopf('Abbrechen', 'data-umbau="modernisierung"', 'text'));
    ctx.panel('Bauprogramm', 'Mehrere Cluster auf einmal', K.bereich('haus', 'umbau') + '<div class="hw-g5">' + K.rumpf(x) + '</div>', 'gross');
  }
  function programm() {
    const p = E.bestandUebersicht(s()).programme.find((q) => q.id === ui.programm);
    if (!p) { ui.seite = 'bestand'; return bestand(); }
    let x = K.gross([{ label: 'Fortschritt', wert: Math.round(p.fertig / Math.max(1, p.gesamt) * 100) + ' %', unter: p.fertig + ' von ' + p.gesamt + ' fertig' },
      { label: 'Bisher', wert: mio(p.kosten), unter: p.laufend + ' im Bau · ' + p.warteschlange + ' warten' }]);
    const projekte = (s().umbau?.projekte ?? []).filter((q) => q.programm === p.id).slice().reverse().slice(0, 30);
    x += K.abschnitt('Baustellen', String(projekte.length));
    x += K.liste(projekte.map((q) => K.zeile({ was: esc(s().haeuser.find((h) => h.id === q.haus)?.name ?? q.haus), unter: q.etagen.map(ETAGE).join(', ') + ' · ' + (q.status === 'laufend' ? 'bis ' + kw(q.ende) : 'fertig ' + kw(q.ende)),
      wert: esc(geld(q.kosten)), tippbar: q.status === 'abgeschlossen', attr: q.status === 'abgeschlossen' ? 'data-umbau="projekt" data-id="' + esc(q.id) + '"' : '' })));
    if (p.status === 'laufend') x += K.knoepfe(K.knopf('Programm stoppen', 'data-umbau="pstop" data-id="' + esc(p.id) + '"', 'gefahr'));
    x += K.knoepfe(K.knopf('Zum Bestand', 'data-umbau="modernisierung"', 'text'));
    ctx.panel(p.name, 'Bauprogramm seit ' + kw(p.start), K.bereich('haus', 'umbau') + '<div class="hw-g5">' + K.rumpf(x) + '</div>', 'gross');
  }
  function projekt() {
    const v = E.umbauVorherNachher?.(s(), ui.projekt);
    if (!v) { ui.seite = 'bestand'; return bestand(); }
    const p = v.projekt;
    let x = '<div class="hw-vergleich"><figure><img data-umbaubild="' + esc(p.id) + '|vorher" alt="Vorher"><figcaption>Vorher</figcaption></figure><figure><img data-umbaubild="' + esc(p.id) + '|nachher" alt="Nachher"><figcaption>Nachher</figcaption></figure></div>';
    const etagen = Object.keys(p.vorher ?? {}).map(Number).sort((a, b) => b - a);
    const nachher = p.nachher ?? {};
    x += K.abschnitt('Was sich geändert hat', p.etagen.map(ETAGE).join(', '));
    const zeilen = [];
    for (const nr of etagen) for (const g of ['moebel', 'oberflaeche', 'klima', 'licht', 'brandschutz', 'foerdertechnik', 'fassade']) {
      const a = p.vorher[nr]?.[g], b = nachher[nr]?.[g];
      if (a == null || b == null || a === b || (g === 'fassade' && nr !== etagen[0])) continue;
      zeilen.push(K.zeile({ was: esc(G()[g].name), unter: g === 'fassade' ? 'ganzes Haus' : ETAGE_LANG(nr), wert: ZUSTAND[a] + ' → ' + ZUSTAND[b], ton: 'gut' }));
    }
    x += zeilen.length ? K.liste(zeilen) : K.leer('Keine sichtbare Änderung.');
    x += K.liste([K.zeile({ was: 'Kosten', wert: esc(geld(p.kosten)) }), K.zeile({ was: 'Bauzeit', wert: (p.ende - p.start) + ' Wochen' })]);
    x += K.knoepfe(K.knopf('Zum Haus', 'data-umbau="planen" data-id="' + esc(p.haus) + '" data-etage="' + (p.etagen[0] ?? 0) + '"', 'zweit'), K.knopf('Zum Bestand', 'data-umbau="modernisierung"', 'text'));
    ctx.panel(v.gewerk + ' fertig', (v.haus?.name ?? '') + ' · ' + kw(p.ende), K.bereich('haus', 'umbau') + '<div class="hw-g5">' + K.rumpf(x) + '</div>', 'gross');
    // Bilder nach dem Aufbau des Panels rendern (eigener kleiner Renderer, nicht im Klickpfad blockierend)
    setTimeout(() => {
      for (const img of document.querySelectorAll('#pinhalt img[data-umbaubild]')) {
        const [id, wann] = img.dataset.umbaubild.split('|'), url = ctx.bild?.(id, wann);
        if (url) img.src = url; else img.closest('figure')?.remove();
      }
    }, 0);
  }

  function anzeigen() {
    ui.aktiv = true;
    if (ui.seite === 'haus' && ui.haus) return planen();
    if (ui.seite === 'cluster') return cluster();
    if (ui.seite === 'assistent') return assistent();
    if (ui.seite === 'programm') return programm();
    if (ui.seite === 'projekt') return projekt();
    return bestand();
  }
  function tun(a, danach = null) {
    const r = E.fuehreAus(s(), a);
    ctx.meldung(r.text, r.ok);
    if (r.ok) { if (danach) ui.seite = danach; ctx.nachAktion?.(); }
    anzeigen();
  }
  document.getElementById('pinhalt').addEventListener('click', (ev) => {
    const el = ev.target.closest('button[data-umbau]'); if (!el || el.disabled) return;
    const art = el.dataset.umbau, A = ui.auftrag;
    if (art === 'modernisierung') { ui.seite = 'bestand'; ui.haus = null; return anzeigen(); }
    if (art === 'haus') { ui.haus = null; ctx.hausOeffnen(el.dataset.id); return; }
    if (art === 'planen') { ui.seite = 'haus'; ui.haus = el.dataset.id; ui.etage = Number(el.dataset.etage); return anzeigen(); }
    if (art === 'etage') { ui.etage = Number(el.dataset.etage); return anzeigen(); }
    if (art === 'gewerkwahl') { ui.gewerk = el.dataset.v; return anzeigen(); }
    if (art === 'starten') return tun({ typ: 'umbauPlanen', haus: ui.haus, etage: ui.etage, stufe: 'ladenbau', gewerk: ui.gewerk });
    if (art === 'cluster') { ui.seite = 'cluster'; ui.cluster = el.dataset.id; return anzeigen(); }
    if (art === 'programm') { ui.seite = 'programm'; ui.programm = el.dataset.id; return anzeigen(); }
    if (art === 'projekt') { ui.seite = 'projekt'; ui.projekt = el.dataset.id; return anzeigen(); }
    if (art === 'pstop') return tun({ typ: 'bauprogrammStoppen', id: el.dataset.id });
    if (art === 'assistent') { ui.seite = 'assistent'; if (el.dataset.id) A.cluster = [el.dataset.id]; return anzeigen(); }
    if (art === 'agewerk') { A.gewerk = el.dataset.v; return anzeigen(); }
    if (art === 'abis') { A.bisZustand = Number(el.dataset.v); return anzeigen(); }
    if (art === 'apar') { A.parallel = Math.max(1, Math.min(40, A.parallel + Number(el.dataset.v))); return anzeigen(); }
    if (art === 'acluster') { const id = el.dataset.id; A.cluster = A.cluster.includes(id) ? A.cluster.filter((c) => c !== id) : [...A.cluster, id]; return anzeigen(); }
    if (art === 'aalle') { A.cluster = E.bestandUebersicht(s()).cluster.map((c) => c.id); return anzeigen(); }
    if (art === 'akeine') { A.cluster = []; return anzeigen(); }
    if (art === 'aschlecht') {
      const grp = G()[A.gewerk]?.gruppe, g = grp === 'komplett' ? 'moebel' : grp;
      A.cluster = E.bestandUebersicht(s()).cluster.filter((c) => !c.sonder).sort((p, q) => (p.gut[g] ?? 0) - (q.gut[g] ?? 0)).slice(0, 5).map((c) => c.id);
      return anzeigen();
    }
    if (art === 'astart') return tun({ typ: 'bauprogrammStarten', auftrag: { ...A, cluster: [...A.cluster] } }, 'bestand');
  });
  return {
    oeffne: (haus = null, etage = 0, projektId = null) => {
      if (projektId) { ui.seite = 'projekt'; ui.projekt = projektId; }
      else if (haus) { ui.seite = 'haus'; ui.haus = haus; ui.etage = etage; }
      else ui.seite = 'bestand';
      anzeigen();
    },
    hausKarte, zu: () => { ui.aktiv = false; }, aktiv: () => ui.aktiv, neuZeichnen: () => { if (ui.aktiv) anzeigen(); },
  };
}

// Einkauf-Panel (EINKAUF-VERTRAG.md, Abschnitt Prototyp): Übersicht nach Bereich mit Warengruppen, Spaltenwahl, Sortierung
// und Ampeln; WG-Detail mit Verlauf und allen Reglern; Freigabe-Eingang mit Einzel- und Sammelfreigabe.
// E47 (G2): Blatt wie Coffee 17 bis 22. Oben spricht der Einkaufsvorstand den Befund, darunter Großkennzahlen, Balken und
// das Buch mit Strich vor der Summe; Reiterleiste unten. Die Eigenmarken-Seite liegt in eigenmarken.js, die Ware in ware.js.
// Alle Zahlen kommen über quelle.js aus den Engine-Abfragen (einkaufUebersicht, wgDetail, freigaben). Jeder angezeigte
// Wert trägt data-p; pruefe() rechnet ihn aus einer frischen Abfrage nach (0 Abweichungen erwartet).
import { geld, fmt, pz, dez, kwVon, esc } from './format.js';
import * as K from './komponenten.js';
import * as B from './g2-buch.js';
import { eigenmarkenSeite, eigenmarkenAktion, eigenmarkenErwartet, neuerEntwurf } from './eigenmarken.js';
// O05 Ware
import { warenSeite, warenAktion, wareErwartet } from './ware.js';

/** Kurze Spaltenköpfe; Name und Format der Spalten kommen aus EINKAUF_SPALTEN. */
const KOPF = { umsatz: 'Umsatz 13 Wo.', rohertragsquote: 'Rohertrag', lagerumschlag: 'Umschlag', reichweite: 'Reichweite', abverkaufsquote: 'Abverkauf', altwarenanteil: 'Altware', nosVerfuegbarkeit: 'NOS', limitFrei: 'Limit frei', rohertrag: 'Rohertrag €', bestandEk: 'Bestand', abschriften: 'Abschriften', reduzierungsquote: 'Reduzierung', entgangenerUmsatz: 'Fehlmengen', offeneOrders: 'Orders', offeneFreigaben: 'Freigaben', eigenmarkenAnteil: 'Eigenmarke', eigenmarkenMarge: 'EM-Marge' };
export function formatiere(format, x) {
  if (format === 'eur') return geld(x);
  if (format === 'prozent') return pz(x, 1);
  if (format === 'faktor') return dez(x, 1);
  if (format === 'wochen') return `${dez(x, 1)} Wo.`;
  return fmt.format(Math.round(x));
}
const AMPEL_TEXT = { gruen: 'im Ziel', gelb: 'beobachten', rot: 'handeln' };
const ART = { nos: 'NOS', saison: 'Saison' };
const TYP = { nos: 'NOS-Nachschub', vororder: 'Vororder', nachorder: 'Nachorder' };
/** Kennzahlen im WG-Detail über den 8 Standardspalten hinaus. */
const DETAIL_EXTRA = [['umsatzWoche', 'Umsatz letzte Woche', 'eur'], ['bestandEk', 'Bestand EK', 'eur'], ['offeneOrders', 'Offene Orders', 'eur'], ['abschriften', 'Abschriften 13 Wochen', 'eur'], ['reduzierungsquote', 'Reduzierungsquote', 'prozent'], ['entgangenerUmsatz', 'Fehlmengen 13 Wochen', 'eur'], ['eigenmarkenAnteil', 'Eigenmarkenanteil', 'prozent'], ['eigenmarkenMarge', 'Eigenmarkenmarge', 'prozent']];
/** Ampel als Farbe des Werts (kein Punkt, keine Pille): Rot handeln, Gelb beobachten, Grün ohne Farbe. */
const TON = { rot: 'schlecht', gelb: 'achtung' };
/** Reiterleiste unten (Einkauf-Bereiche). */
const REITER = [['uebersicht', 'Übersicht', 'ware'], ['freigaben', 'Freigaben', 'freigaben'], ['eigenmarken', 'Marken', 'marken'],
  ['merchandise', 'Saison', 'saison'], ['allokation', 'Allokation', 'allokation'], ['reduzierungKalender', 'Reduzierung', 'reduzierung']];

export function einkaufModul(ctx) {
  const { q } = ctx;
  const ui = {
    aktiv: false, seite: 'uebersicht', format: 'warenhaus', spalten: ['umsatz', 'rohertragsquote'], sort: { key: 'umsatz', dir: -1 },
    offen: new Set(['damen']), wg: null, filter: { bereich: '', art: '', wert: '' }, kuerzen: null, em: { assistent: null, einstellen: null },
  };
  const s = () => ctx.s();
  const SP = () => new Map(q.spalten().map((c) => [c.id, c]));
  const text = (id, k) => formatiere(SP().get(id)?.format ?? 'eur', k[id] ?? 0);

  // ─────────────────────────── Bausteine
  const zelle = (t, p, a) => ({ t, p, ton: TON[a] });
  function tabs() {
    const an = ui.seite === 'wg' ? 'uebersicht' : ui.seite === 'gruenden' ? 'eigenmarken' : ui.seite;
    const n = q.freigaben(s()).anzahl;
    const reiter = REITER.map(([id, name, sym]) => [id, id === 'freigaben' && n ? `${name} ${n}` : name, sym]);
    return B.G2 + K.reiterUnten(reiter, an, (id) => `data-a="seite" data-v="${id}"${id === 'freigaben' ? ` aria-label="Freigaben, ${n} offen"` : ''}`);
  }
  const cpo = (text, ton = '') => B.vorstandSprecher(s(), 'cpo', 'Einkaufsvorstand', text, ton);
  /** Prozent-Stepper in 5er-Schritten für Regler (NOS-Ziel, Vororder, Eigenmarkenanteil). */
  const prozentStepper = (feld, wert, min, max, label) => K.stepper({ wert: `${wert} %`, label, attrMinus: `data-a="regelSchritt" data-f="${feld}" data-v="-5"`, attrPlus: `data-a="regelSchritt" data-f="${feld}" data-v="5"`, minusAus: wert <= min, plusAus: wert >= max });

  // ─────────────────────────── Übersicht
  function sortiere(liste) {
    const { key, dir } = ui.sort;
    return [...liste].sort((a, b) => (key === 'name' ? a.name.localeCompare(b.name, 'de') * dir : ((a.kennzahlen[key] ?? 0) - (b.kennzahlen[key] ?? 0)) * dir));
  }
  function uebersicht() {
    // Hauptfrage: Wo läuft die Ware aus dem Ruder? Oben Rohertrag und Limit, darunter das Warenbuch, Ampel als Farbe des Werts.
    const u = q.uebersicht(s(), { format: ui.format }), g = u.summe.kennzahlen, ga = u.summe.ampeln;
    const rot = u.bereiche.filter((b) => Object.values(b.ampeln).includes('rot'));
    let h = tabs() + cpo(rot.length
      ? `<b>${rot.length} von ${u.bereiche.length} Bereichen stehen auf Rot:</b> ${rot.slice(0, 3).map((b) => esc(b.name)).join(', ')}${rot.length > 3 ? ' und weitere' : ''}.`
      : `<b>Kein Bereich steht auf Rot.</b> ${esc(u.saison.name)}, Woche ${u.saison.woche} von ${u.saison.wochen}.`, rot.length ? 'engpass' : '');
    let x = '<div class="hw-g2-oben">' + K.seg([['warenhaus', 'Hartwig'], ['sport', 'Hartwig Sport']], ui.format, (v) => `data-a="format" data-v="${v}"`) + '</div>';
    x += K.gross([
      { label: 'Rohertrag 13 Wochen', wert: text('rohertragsquote', g), p: 'g:rohertragsquote', ton: TON[ga.rohertragsquote], unter: `Umsatz Woche <span data-p="g:umsatzWoche">${geld(g.umsatzWoche)}</span>` },
      { label: 'Limit frei', wert: text('limitFrei', g), p: 'g:limitFrei', ton: g.limitFrei < 0 ? 'schlecht' : '', unter: `Bestand EK <span data-p="g:bestandEk">${geld(g.bestandEk)}</span>` },
    ]);
    const pfeil = (key) => (ui.sort.key === key ? (ui.sort.dir < 0 ? ' ▼' : ' ▲') : '');
    const werte = (k, a, p) => ui.spalten.map((c) => zelle(text(c, k), `${p}:${c}`, a[c]));
    const zeilen = [];
    for (const b of sortiere(u.bereiche)) {
      const auf = ui.offen.has(b.bereich);
      zeilen.push(B.reihe({ name: esc(b.name), unter: `${b.wgs.length} Warengruppen`, werte: werte(b.kennzahlen, b.ampeln, `b:${b.bereich}`), art: 'bereich', pfeil: auf ? '▾' : '▸', attr: `data-a="bereich" data-v="${b.bereich}" aria-expanded="${auf}"` }));
      if (auf) for (const w of sortiere(b.wgs)) zeilen.push(B.reihe({ name: esc(w.name), unter: w.eigenmarken.length ? 'mit Eigenmarke' : '', werte: werte(w.kennzahlen, w.ampeln, `w:${w.id}`), art: 'unter', attr: `data-a="wg" data-v="${w.id}"` }));
    }
    zeilen.push(B.reihe({ name: `${ui.format === 'sport' ? 'Hartwig Sport' : 'Hartwig'} gesamt`, werte: ui.spalten.map((c) => zelle(text(c, g), `g:${c}`, ga[c])), art: 'summe' }));
    x += B.buch({ titel: 'Bereich' + pfeil('name'), titelAttr: 'data-a="sort" data-v="name"', spalten: ui.spalten.map((c) => ({ t: (KOPF[c] ?? SP().get(c)?.name) + pfeil(c), attr: `data-a="sort" data-v="${c}"` })), zeilen, breite: 98 });
    const gen = { grob: 'grob, das Controlling ist schwach besetzt', normal: 'normal', exakt: 'exakt' }[u.genauigkeit] ?? u.genauigkeit;
    x += B.fuss(`Rot heißt handeln, Gelb beobachten. Spaltenkopf antippen sortiert. Genauigkeit der Zahlen: ${esc(gen)}.`);
    const spalten = [...q.spalten()].sort((a, b) => b.standard - a.standard).map((c) => [c.id, c.name]);
    x += B.felder(K.feld('Spalte links', B.auswahl(spalten, ui.spalten[0], 'data-a="spalteWahl" data-i="0"', 'Spalte links')),
      K.feld('Spalte rechts', B.auswahl(spalten, ui.spalten[1], 'data-a="spalteWahl" data-i="1"', 'Spalte rechts')));
    // FUNDUS: Altware aus den Häusern
    const o = ctx.E.outletUebersicht(s());
    x += K.abschnitt('Altware ins Outlet', 'FUNDUS');
    x += K.liste([
      K.zeile({ was: 'Poolbestand EK', unter: `Reichweite <span data-p="format:reichweite">${dez(o.reichweite, 1)} Wo.</span>`, wert: `<span data-p="format:poolWert">${geld(o.poolWert)}</span>` }),
      K.zeile({ was: 'Abschriften', wert: `<span data-p="format:abschriften">${geld(o.abschriften)}</span>` }),
      K.zeile({ was: 'Markenposten', wert: `<span data-p="format:markenposten">${geld(o.markenposten)}</span>` })]);
    x += B.felder(
      K.feld('Altwarequote', K.stepper({ wert: `${Math.round(o.altwareQuote * 100)} %`, label: 'Altwarequote', attrMinus: 'data-a="formatQuoteSchritt" data-v="-5"', attrPlus: 'data-a="formatQuoteSchritt" data-v="5"', minusAus: o.altwareQuote <= 0, plusAus: o.altwareQuote >= 1 })),
      K.feld('Zukauf je Woche', K.stepper({ wert: geld(o.zukaufBudget), label: 'Markenposten-Zukauf je Woche', attrMinus: 'data-a="formatBudgetSchritt" data-v="-500000"', attrPlus: 'data-a="formatBudgetSchritt" data-v="500000"', minusAus: o.zukaufBudget <= 0 })));
    const kandidaten = ctx.E.outletKandidaten(s()).slice(0, 8);
    if (kandidaten.length) {
      x += K.abschnitt('Neue FUNDUS-Standorte', '12 Wochen Vorlauf');
      x += K.liste(kandidaten.map((k) => `<div class="hw-zeile"><span class="hw-was">${esc(k.stadt)}<small>${fmt.format(k.qm)} qm · Miete ${geld(k.mieteWoche)} je Woche · Investition ${geld(k.investition)}</small></span>${K.knopf('Eröffnen', `onclick="formateTun('outletEroeffnen','${esc(k.stadt)}')" aria-label="FUNDUS in ${esc(k.stadt)} eröffnen"`, 'zweit')}</div>`));
    }
    h += K.rumpf(x);
    return { titel: 'Einkauf', unter: `${u.bereiche.length} Bereiche · ${u.bereiche.reduce((a, b) => a + b.wgs.length, 0)} Warengruppen · KW ${kwVon(s().woche)}`, html: h };
  }

  // ─────────────────────────── WG-Detail
  function wgSeite() {
    const d = q.wg(s(), ui.wg);
    if (!d) { ui.seite = 'uebersicht'; return uebersicht(); }
    const k = d.kennzahlen, st = d.steuerung, a = d.ampeln;
    // Hauptfrage: Passt der Bestand zum Abverkauf? Reichweite groß, Verlauf als Balken, Kennzahlen als Buch, Regler darunter.
    const rote = q.spalten().filter((c) => a[c.id] === 'rot').map((c) => c.name);
    const befund = a.reichweite === 'rot' ? `<b>Die Reichweite von ${esc(text('reichweite', k))} steht auf Rot.</b> Limit, Vororder und Reduzierung prüfen.`
      : rote.length ? `<b>${rote.length === 1 ? 'Eine Kennzahl steht' : rote.length + ' Kennzahlen stehen'} auf Rot:</b> ${esc(rote.slice(0, 3).join(', '))}.`
        : `<b>${esc(d.name)} liegt im Ziel.</b> Bestand und Abverkauf passen zusammen.`;
    let h = tabs() + cpo(befund, a.reichweite === 'rot' || rote.length ? 'engpass' : '');
    let x = '<div class="hw-g2-oben">' + K.knopf(`‹ ${d.bereichName}`, `data-a="seite" data-v="uebersicht" aria-label="Zurück zur Übersicht ${esc(d.bereichName)}"`, 'text') + '</div>';
    x += K.gross([
      { label: 'Reichweite', wert: text('reichweite', k), p: 'd:reichweite', ton: TON[a.reichweite], unter: AMPEL_TEXT[a.reichweite] ?? 'ohne Ampel' },
      { label: 'Umsatz letzte Woche', wert: formatiere('eur', k.umsatzWoche), p: 'd:umsatzWoche', unter: `13 Wochen ${esc(text('umsatz', k))}` },
    ]);
    const v = d.verlauf, n = v.woche.length, von = Math.max(0, n - 5);
    const punkte = (r) => v.woche.slice(von).map((w, i) => ({ label: String(kwVon(w)), wert: r[von + i] }));
    const kw = punkte(v.umsatz).map((z) => z.label);
    x += K.balken(punkte(v.umsatz).map((z, i) => ({ label: 'KW ' + z.label, a: z.wert, b: punkte(v.bestand)[i]?.wert ?? null })), ['Umsatz', 'Bestand EK']);
    const rw = q.spalten().find((c) => c.id === 'reichweite');
    const zeilen = q.spalten().filter((c) => c.standard && c !== rw).map((c) => B.reihe({ name: esc(c.name), werte: [zelle(text(c.id, k), `d:${c.id}`, a[c.id])] }))
      .concat(DETAIL_EXTRA.filter(([id]) => id !== 'umsatzWoche').map(([id, tt, f]) => B.reihe({ name: esc(tt), werte: [zelle(id === 'eigenmarkenMarge' && !k.eigenmarkenAnteil ? 'keine' : formatiere(f, k[id]), `d:${id}`, a[id])] })));
    x += B.buch({ titel: 'Kennzahlen', spalten: ['Wert'], zeilen, breite: 110 });
    x += B.fuss('Rot heißt handeln, Gelb beobachten.');
    // Steuerung
    const L0 = d.limits[0], L1 = d.limits[1];
    x += K.abschnitt('Limit je Saison', 'Open to Buy');
    x += K.feld('Faktor auf den Saisonplan', K.stepper({ wert: pz(st.limitFaktor), unter: geld(k.limit), label: 'Limitfaktor', attrMinus: 'data-a="limit" data-v="-0.05"', attrPlus: 'data-a="limit" data-v="0.05"' }));
    x += K.liste([
      K.zeile({ was: esc(L0?.name ?? 'Laufende Saison'), unter: `verbraucht <span data-p="d:limitVerbraucht">${geld(k.limitVerbraucht)}</span>`, wert: `<span data-p="d:limit">${geld(k.limit)}</span>`, wertUnter: `frei <span data-p="d:limitFrei2">${geld(k.limitFrei)}</span>` }),
      ...(L1 ? [K.zeile({ was: esc(L1.name), unter: `verbraucht ${geld(L1.verbraucht)}`, wert: geld(L1.limit), wertUnter: `frei ${geld(L1.frei)}` })] : [])]);
    x += K.abschnitt('Nachschub und Saison');
    x += B.felder(K.feld('NOS-Anteil Ziel', prozentStepper('nosZiel', Math.round(st.nosZiel * 100), 0, 95, 'NOS-Anteil Ziel')),
      K.feld('Vororderquote', prozentStepper('vororderquote', Math.round(st.vororderquote * 100), 20, 100, 'Vororderquote')));
    x += B.fuss(`NOS heute ${pz(st.nosAnteil)}, Rest Saisonware. Was nicht vorgeordert wird, kommt alle 4 Wochen als Nachorder.`);
    x += K.feld('NOS-Servicegrad', K.seg([[0.9, '90 %'], [0.95, '95 %'], [0.98, '98 %']], st.servicegrad, (w) => `data-a="servicegrad" data-v="${w}"`));
    x += '<div class="hw-abstand"></div>' + K.feld('Reduzierung', K.seg([['frueh', 'früh'], ['normal', 'normal'], ['spaet', 'spät']], st.reduzierung, (w) => `data-a="reduzierung" data-v="${w}"`));
    x += B.fuss('Höherer Servicegrad heißt mehr Sicherheitsbestand. Frühe Reduzierung senkt Altware und erhöht die Abschrift.');
    x += K.abschnitt('Ohne Freigabe nach Frist');
    x += K.feld('NOS', K.seg([['auto', 'automatisch'], ['verfall', 'verfällt']], st.modus.nos, (w) => `data-a="modus" data-f="nos" data-v="${w}"`));
    x += '<div class="hw-abstand"></div>' + K.feld('Saison', K.seg([['auto', 'automatisch'], ['verfall', 'verfällt']], st.modus.saison, (w) => `data-a="modus" data-f="saison" data-v="${w}"`));
    if (d.stammdaten.eigenmarkenfaehig) {
      const alle = q.marken(s()).marken, drin = d.eigenmarken, ids = new Set(drin.map((m) => m.marke));
      const rest = alle.filter((m) => !ids.has(m.id) && m.status !== 'eingestellt');
      x += K.abschnitt('Eigenmarkenanteile', 'Ziel am WG-Volumen');
      x += drin.length ? '<div class="hw-felder">' + drin.map((m) => K.feld(`${m.name}, ist ${pz(m.anteilIst)}`, prozentStepper('em:' + m.marke, Math.round(m.anteilZiel * 100), 0, 60, `Anteil ${m.name}`))).join('') + '</div>' : K.leer('Noch keine Eigenmarke in dieser Warengruppe.');
      if (rest.length) x += '<div class="hw-abstand"></div>' + K.feld('Eigenmarke aufnehmen', B.auswahl([['', 'Marke wählen'], ...rest.map((m) => [m.id, m.name])], '', 'data-a="emNeu"', 'Eigenmarke aufnehmen'));
    }
    x += B.fuss(`Lieferant ${esc(d.lieferant)} · Vorlauf Vororder ${d.stammdaten.vorlaufVor}, Nachorder ${d.stammdaten.vorlaufNach}, NOS ${d.stammdaten.vorlaufNos} Wochen · Mindestabnahme ${geld(d.stammdaten.mindestabnahme)} je Saisonorder.`);
    if (d.freigaben?.length) x += K.knoepfe(K.knopf(`${d.freigaben.length} offene ${d.freigaben.length === 1 ? 'Freigabe' : 'Freigaben'} ansehen`, `data-a="seite" data-v="freigaben" data-bereich="${d.bereich}"`, 'zweit breit'));
    h += K.rumpf(x);
    return { titel: d.name, unter: `${d.bereichName} · Warengruppe · KW ${kwVon(s().woche)}`, html: h };
  }

  // ─────────────────────────── Freigaben
  const engineFilter = () => ({ ...(ui.filter.bereich ? { bereich: ui.filter.bereich } : {}), ...(ui.filter.art ? { art: ui.filter.art } : {}), ...(ui.filter.wert === 'klein' ? { bisWert: 100000 } : {}) });
  function gefiltert() {
    const l = q.freigaben(s(), engineFilter()).liste;
    return ui.filter.wert === 'gross' ? l.filter((o) => o.wert > 100000) : l;
  }
  const fristText = (o) => (o.restWochen <= 0 ? 'Frist diese Woche' : o.restWochen === 1 ? 'Frist nächste Woche' : 'Frist später');
  function freigabenSeite() {
    // Hauptfrage: Was muss ich diese Woche freigeben? Summe groß, eine Hauptaktion, darunter das Orderbuch mit Summenstrich.
    // Je Vorgang genau eine Aktion (Frei); Kürzen und Ablehnen erst nach Antippen der Zeile.
    const alle = q.freigaben(s()), l = gefiltert();
    const bereiche = [...new Map(alle.liste.map((o) => [o.bereich, o.bereichName])).entries()];
    const summe = l.reduce((a, o) => a + o.wert, 0);
    const dringend = l.filter((o) => o.restWochen <= 0), verfall = dringend.filter((o) => o.modus !== 'auto');
    const befund = !alle.anzahl ? `<b>Keine Order wartet.</b> Orders bis ${geld(alle.grenze)} EK gehen ohne dich durch.`
      : verfall.length ? `<b>${verfall.length} ${verfall.length === 1 ? 'Saisonorder verfällt' : 'Saisonorders verfallen'} diese Woche.</b> Ohne Freigabe fehlt die Ware in der Saison.`
        : dringend.length ? `<b>${dringend.length} ${dringend.length === 1 ? 'Order läuft' : 'Orders laufen'} diese Woche ab.</b> Danach ${dringend.length === 1 ? 'geht sie' : 'gehen sie'} automatisch durch.`
          : `<b>${alle.anzahl} ${alle.anzahl === 1 ? 'Order wartet' : 'Orders warten'}.</b> Diese Woche läuft keine Frist ab.`;
    let h = tabs() + cpo(befund, verfall.length ? 'alarm' : dringend.length ? 'engpass' : '');
    let x = K.gross([
      { label: 'Wartet auf Freigabe', wert: geld(summe), p: 'sammel', unter: `${l.length} ${l.length === 1 ? 'Order' : 'Orders'} · ${dringend.length} fällig` },
      { label: 'Freigabegrenze', wert: geld(alle.grenze), p: 'grenze', unter: 'darüber entscheidest du' },
    ]);
    if (l.length) x += K.knoepfe(K.knopf(`Alle ${l.length} freigeben`, 'data-a="sammel"', 'breit'));
    x += K.abschnitt('Filter');
    x += K.feld('Bereich', B.auswahl([['', `Alle Bereiche (${alle.anzahl})`], ...bereiche.map(([b, nm]) => [b, `${nm} (${alle.liste.filter((o) => o.bereich === b).length})`])], ui.filter.bereich, 'data-a="filterBereich"', 'Bereich'));
    x += '<div class="hw-abstand"></div>' + K.seg([['', 'Alle'], ['nos', 'NOS'], ['saison', 'Saison']], ui.filter.art, (v) => `data-a="filterArt" data-v="${v}"`);
    x += '<div class="hw-abstand"></div>' + K.seg([['', 'Jeder Wert'], ['klein', 'bis 100 Tsd.'], ['gross', 'darüber']], ui.filter.wert, (v) => `data-a="filterWert" data-v="${v}"`);
    const zeilen = [];
    const zeigeN = ui.mehrOrders ? l.length : Math.min(l.length, 25);
    let gruppe = null;
    for (const o of l.slice(0, zeigeN)) {
      const g = fristText(o);
      if (g !== gruppe) { gruppe = g; const n = l.filter((y) => fristText(y) === g); zeilen.push(B.reihe({ name: g, werte: [`${n.length} · ${geld(n.reduce((a, y) => a + y.wert, 0))}`], art: 'bereich' })); }
      const auf = ui.orderAuf === o.id || ui.kuerzen === o.id;
      const frist = o.modus === 'auto' ? 'sonst automatisch' : `<span class="${o.restWochen <= 0 ? 'hw-schlecht' : ''}">sonst verfällt sie</span>`;
      let v = B.reihe({ name: esc(o.wgName), unter: `${esc(o.lieferant)} · ${TYP[o.typ] ?? ART[o.art]}${o.markeName ? ` · ${esc(o.markeName)}` : ''}${o.ueberLimit ? ' · gekürzt' : ''} · ${frist}`, werte: [{ t: geld(o.wert), s: 'w', p: `f:${o.id}:wert` }], attr: `data-a="orderAuf" data-v="${o.id}" aria-expanded="${auf}"` })
        + K.knopf('Frei', `data-a="frei" data-v="${o.id}" aria-label="${esc(o.wgName)} freigeben"`, 'zweit');
      if (auf) {
        v += `<p class="hw-g2-details">Abverkauf 8 Wochen <span data-p="f:${o.id}:abverkauf">${geld(o.erwarteterAbverkauf)}</span> · Reichweite danach <span data-p="f:${o.id}:reichweite">${dez(o.reichweiteDanach, 1)} Wo.</span> · erste Lieferung KW ${kwVon(o.ersteLieferung)}${o.lieferungen.length > 1 ? ` in ${o.lieferungen.length} Teilen` : ''}${o.hinweis ? ` · ${esc(o.hinweis)}` : ''}</p>`;
        v += ui.kuerzen === o.id
          ? `<div class="hw-knoepfe hw-g2-aktionen">${[10, 25, 50].map((p) => K.knopf(`−${p} % und frei`, `data-a="kuerzen" data-v="${o.id}" data-p2="${p}"`, 'zweit')).join('')}${K.knopf('Zurück', 'data-a="kuerzenZu"', 'text')}</div>`
          : `<div class="hw-knoepfe hw-g2-aktionen">${K.knopf('Kürzen', `data-a="kuerzenAuf" data-v="${o.id}"`, 'zweit')}${K.knopf('Ablehnen', `data-a="ablehnen" data-v="${o.id}"`, 'zweit')}</div>`;
      }
      zeilen.push(`<div class="hw-g2-vorgang${auf ? ' auf' : ''}">${v}</div>`);
    }
    if (zeigeN < l.length) { const rest = l.slice(zeigeN); zeilen.push(B.reihe({ name: `Weitere ${rest.length} Orders`, unter: 'kleinere Werte', werte: [{ t: geld(rest.reduce((a, o) => a + o.wert, 0)), s: 'w' }] })); }
    if (l.length) zeilen.push(B.reihe({ name: `Summe ${l.length} ${l.length === 1 ? 'Order' : 'Orders'}`, werte: [{ t: geld(summe), summe: 'w', p: 'sammel' }], art: 'summe' }));
    x += l.length ? B.buch({ titel: `Orderbuch KW ${kwVon(s().woche)}`, spalten: ['Wert EK'], zeilen, breite: 96, attr: 'data-summenbuch="Orderbuch"' })
      : K.abschnitt(`Orderbuch KW ${kwVon(s().woche)}`) + K.leer(alle.anzahl ? `${alle.anzahl} Orders warten in anderen Bereichen oder Wertklassen.` : 'Neue Orders kommen mit der nächsten Orderrunde oder Nachorder.', alle.anzahl ? 'Keine Order passt zum Filter.' : 'Das Orderbuch ist leer.');
    if (zeigeN < l.length) x += K.knoepfe(K.knopf(`Alle ${l.length} Orders zeigen`, 'data-a="mehrOrders"', 'zweit breit'));
    x += K.abschnitt('Freigabegrenze', 'Orders darüber brauchen dich');
    x += K.stepper({ wert: geld(alle.grenze), label: 'Freigabegrenze', attrMinus: 'data-a="grenze" data-v="-10000"', attrPlus: 'data-a="grenze" data-v="10000"', minusAus: alle.grenze <= 0 });
    const p = alle.protokoll[alle.protokoll.length - 1];
    if (p) x += B.fuss(`Letzte Woche: ${p.neu} neue Orders, ${p.direkt} direkt unter der Grenze, ${p.freigegeben} freigegeben, ${p.auto} automatisch, ${p.verfallen} verfallen${p.verfallenWert ? ` (${geld(p.verfallenWert)})` : ''}, ${p.abgelehnt} abgelehnt.`);
    h += K.rumpf(x);
    return { titel: 'Freigaben', unter: `${alle.anzahl} Orders offen · ${geld(alle.wert)} EK · KW ${kwVon(s().woche)}`, html: h };
  }

  // ─────────────────────────── Steuerung
  function zeigen(scrollHalten = false) {
    const sc = document.getElementById('pinhalt').scrollTop;
    const r = ui.seite === 'wg' ? wgSeite() : ui.seite === 'freigaben' ? freigabenSeite() : ui.seite === 'eigenmarken' || ui.seite === 'gruenden' ? eigenmarkenSeite(ctx, ui, tabs()) : ['merchandise', 'allokation', 'reduzierungKalender'].includes(ui.seite) ? warenSeite(ctx, ui, tabs()) : uebersicht();
    ctx.panel(r.titel, r.unter, K.bereich('zentrale') + r.html, 'gross');
    ui.aktiv = true;
    if (scrollHalten) document.getElementById('pinhalt').scrollTop = sc;
    badge();
  }
  function badge() {
    const n = q.freigaben(s()).anzahl, b = document.getElementById('ekbadge');
    if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; }
  }
  function tun(aktion, scroll = true) {
    const r = q.tun(s(), aktion);
    if (r) ctx.meldung(r.text, r.ok);
    ctx.nachAktion?.();
    zeigen(scroll);
    return r;
  }
  /** Regler in 5er-Schritten: neuer Anteil aus dem aktuellen Engine-Wert (gleiche Aktionen wie zuvor die Schieber). */
  function regelSchritt(f, delta) {
    const d = q.wg(s(), ui.wg);
    if (!d) return;
    const grenze = (x, lo, hi) => Math.max(lo, Math.min(hi, Math.round(x * 100 + delta))) / 100;
    if (f.startsWith('em:')) { const m = d.eigenmarken.find((y) => y.marke === f.slice(3)); if (m) tun({ typ: 'eigenmarkeAnteil', marke: m.marke, wg: ui.wg, anteil: grenze(m.anteilZiel, 0, 60) }); }
    else if (f === 'nosZiel') tun({ typ: 'wgNosZiel', wg: ui.wg, anteil: grenze(d.steuerung.nosZiel, 0, 95) });
    else if (f === 'vororderquote') tun({ typ: 'wgVororderquote', wg: ui.wg, quote: grenze(d.steuerung.vororderquote, 20, 100) });
  }
  function klick(el, ev) {
    const a = el.dataset.a, v = el.dataset.v;
    if (a.startsWith('em')) { const r = eigenmarkenAktion(ctx, ui, el, ev, tun); if (r !== 'nichts') zeigen(r !== 'oben'); return; }
    // O05 Ware
    if (a.startsWith('ware')) { if (warenAktion(ctx, ui, el, tun) === 'zeigen') zeigen(true); return; }
    switch (a) {
      case 'seite': ui.seite = v; ui.kuerzen = null; if (el.dataset.bereich) ui.filter = { bereich: el.dataset.bereich, art: '', wert: '' }; zeigen(); document.getElementById('pinhalt').scrollTop = 0; return;
      case 'format': ui.format = v; zeigen(true); return;
      case 'sort': ui.sort = ui.sort.key === v ? { key: v, dir: -ui.sort.dir } : { key: v, dir: v === 'name' ? 1 : -1 }; zeigen(true); return;
      case 'bereich': if (ui.offen.has(v)) ui.offen.delete(v); else ui.offen.add(v); zeigen(true); return;
      case 'wg': ui.wg = v; ui.seite = 'wg'; zeigen(); document.getElementById('pinhalt').scrollTop = 0; return;
      case 'limit': { const d = q.wg(s(), ui.wg); tun({ typ: 'wgLimit', wg: ui.wg, faktor: Math.round((d.steuerung.limitFaktor + Number(v)) * 100) / 100 }); return; }
      case 'regelSchritt': regelSchritt(el.dataset.f, Number(v)); return;
      case 'servicegrad': tun({ typ: 'wgServicegrad', wg: ui.wg, ziel: Number(v) }); return;
      case 'reduzierung': tun({ typ: 'wgReduzierung', wg: ui.wg, strategie: v }); return;
      case 'modus': tun({ typ: 'wgFreigabeModus', wg: ui.wg, art: el.dataset.f, modus: v }); return;
      case 'grenze': tun({ typ: 'freigabeGrenze', euro: Math.max(0, q.freigaben(s()).grenze + Number(v)) }); return;
      case 'filterArt': ui.filter.art = v; zeigen(true); return;
      case 'filterWert': ui.filter.wert = v; zeigen(true); return;
      case 'sammel': tun(ui.filter.wert === 'gross' ? { typ: 'freigeben', ids: gefiltert().map((o) => o.id) } : { typ: 'sammelfreigabe', filter: engineFilter() }, false); return;
      case 'frei': tun({ typ: 'freigeben', ids: [v] }); return;
      case 'ablehnen': tun({ typ: 'freigabeAblehnen', ids: [v] }); return;
      case 'kuerzenAuf': ui.kuerzen = v; zeigen(true); return;
      case 'kuerzenZu': ui.kuerzen = null; zeigen(true); return;
      case 'formatQuoteSchritt': { const o = ctx.E.outletUebersicht(s()); tun({ typ: 'altwareOutlet', quote: Math.max(0, Math.min(100, Math.round(o.altwareQuote * 100) + Number(v))) / 100 }); return; }
      case 'formatBudgetSchritt': { const o = ctx.E.outletUebersicht(s()); tun({ typ: 'offpriceZukauf', budget: Math.max(0, o.zukaufBudget + Number(v)) }); return; }
      case 'mehrOrders': ui.mehrOrders = true; zeigen(true); return;
      case 'orderAuf': ui.orderAuf = ui.orderAuf === v ? null : v; ui.kuerzen = null; zeigen(true); return;
      case 'kuerzen': ui.kuerzen = null; tun({ typ: 'freigabeKuerzen', id: v, prozent: Number(el.dataset.p2) / 100, freigeben: true }); return;
      default:
    }
  }
  function wechsel(el) {
    const a = el.dataset.a;
    if (a.startsWith('em')) { const r = eigenmarkenAktion(ctx, ui, el, null, tun); if (r !== 'nichts') zeigen(true); return; }
    // O05 Ware
    if (a.startsWith('ware')) { (ui.ware ??= {})[({ wareVon: 'von', wareNach: 'nach', wareGruppe: 'gruppe', wareWert: 'wert' })[a]] = a === 'wareWert' ? Number(el.value) : el.value; return; }
    if (a === 'filterBereich') { ui.filter.bereich = el.value; zeigen(true); return; }
    if (a === 'spalteWahl') {
      const i = Number(el.dataset.i), neu = [...ui.spalten];
      if (neu[1 - i] === el.value) neu[1 - i] = neu[i]; // gleiche Spalte zweimal: die beiden tauschen
      neu[i] = el.value; ui.spalten = neu; zeigen(true); return;
    }
  }
  const inhalt = document.getElementById('pinhalt'), leiste = document.getElementById('preiter');
  inhalt.addEventListener('click', (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-a]'); if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return; klick(el, ev); });
  // E47: Die Reiterleiste liegt außerhalb von #pinhalt (huelleOrdnen hebt sie in #preiter).
  leiste?.addEventListener('click', (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-a="seite"]'); if (el) klick(el, ev); });
  inhalt.addEventListener('change', (ev) => { if (!ui.aktiv) return; const el = ev.target.closest('[data-a]'); if (el) wechsel(el); });

  /** Prüfung: jeden angezeigten Wert (data-p) aus einer frischen Engine-Abfrage nachrechnen. */
  function pruefe() {
    const fehler = [];
    let n = 0;
    const u = q.uebersicht(s(), { format: ui.format });
    const bs = new Map(u.bereiche.map((b) => [b.bereich, b])), ws = new Map(u.bereiche.flatMap((b) => b.wgs.map((w) => [w.id, w])));
    const d = ui.seite === 'wg' ? q.wg(s(), ui.wg) : null;
    const fl = q.freigaben(s()), fg = new Map(fl.liste.map((o) => [o.id, o]));
    const ex = new Map(DETAIL_EXTRA.map(([id, , f]) => [id, f]));
    const soll = (p) => {
      const t = p.split(':');
      if (t[0] === 'format') {
        const x = ctx.E.outletUebersicht(s());
        return t[1] === 'reichweite' ? dez(x.reichweite, 1) + ' Wo.' : geld(x[t[1]]);
      }
      if (t[0] === 'g') return text(t[1], u.summe.kennzahlen);
      if (t[0] === 'b') return text(t[2], bs.get(t[1]).kennzahlen);
      if (t[0] === 'w') return text(t[2], ws.get(t[1]).kennzahlen);
      if (t[0] === 'badge') return String(fl.anzahl);
      if (t[0] === 'grenze') return geld(fl.grenze);
      if (t[0] === 'sammel') return geld(gefiltert().reduce((a, o) => a + o.wert, 0));
      if (t[0] === 'f') { const o = fg.get(t[1]); return t[2] === 'wert' ? geld(o.wert) : t[2] === 'abverkauf' ? geld(o.erwarteterAbverkauf) : `${dez(o.reichweiteDanach, 1)} Wo.`; }
      if (t[0] === 'd') {
        const k = d.kennzahlen;
        if (t[1] === 'limitFaktor') return pz(d.steuerung.limitFaktor);
        if (t[1] === 'limitFrei2') return geld(k.limitFrei);
        if (t[1] === 'limit' || t[1] === 'limitVerbraucht') return geld(k[t[1]]);
        if (t[1] === 'eigenmarkenMarge' && !k.eigenmarkenAnteil) return 'keine';
        return ex.has(t[1]) ? formatiere(ex.get(t[1]), k[t[1]]) : text(t[1], k);
      }
      if (t[0] === 'ware') return wareErwartet(s(), ctx.E, t);
      return eigenmarkenErwartet(ctx, t, ui);
    };
    for (const el of document.querySelectorAll('#pinhalt [data-p], #psprecher [data-p]')) {
      n++;
      let e;
      try { e = soll(el.dataset.p); } catch (x) { e = `Fehler ${x.message}`; }
      if (e !== el.textContent) fehler.push(`${el.dataset.p}: ${el.textContent} statt ${e}`);
    }
    return { seite: ui.seite, werte: n, fehler };
  }

  return {
    ui, oeffne: (seite = 'uebersicht', arg) => { ui.seite = seite; if (seite === 'gruenden') ui.em.assistent = { schritt: 0, daten: neuerEntwurf(s()) }; if (seite === 'wg') ui.wg = arg; ui.kuerzen = null; zeigen(); document.getElementById('pinhalt').scrollTop = 0; },
    neuZeichnen: () => zeigen(true), aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; }, badge, pruefe, tun,
  };
}

// N01: Diagramme ohne Chart-Bibliothek. Daten ausschließlich aus Engine-Abfragen.
// E47: Statistik als Säulen und Tabellen (Coffee 17, 22): oben die zwei Großkennzahlen der Woche, je Kennzahl eine
// Säulenreihe über den Zeitraum (antippen zeigt Ist, Vorjahr, Plan), Formate und Regionen als Anteilsbalken mit Tabelle,
// die EBITDA-Brücke als GuV-Tabelle mit Summenprüfung.
import { geld, fmt, esc } from './format.js';
import * as K from './komponenten.js';

const KENNZAHL = { umsatz: 'Umsatz', ebitda: 'EBITDA', cash: 'Cash', db: 'Deckungsbeitrag',
  frequenz: 'Kundenfrequenz (Schätzung)', personalFte: 'Personal (FTE)', stimmung: 'Stakeholder-Stimmung' };
const GELD = new Set(['umsatz', 'ebitda', 'cash', 'db']);
const BESTAND = new Set(['cash', 'stimmung', 'personalFte']);
const xAchse = (w) => 'KW ' + (((w % 52) + 52) % 52 + 1);
const mitJahr = (w, start) => xAchse(w) + '/' + (start + Math.floor(w / 52));
const prozent = (x) => Number.isFinite(x) ? (x * 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace('-', '−') + ' %' : 'ohne Umsatz';

export function statistikModul(ctx) {
  const { E } = ctx, s = ctx.s;
  const ui = { aktiv: false, seite: 'konzern', kennzahl: 'umsatz', wochen: 52, typ: 'balken', zeilen: 25 };
  const charts = new Map();
  let naechsteId = 0, ausstehend = false, zeiger = null;
  const daten = (ebene, id, kennzahl = ui.kennzahl, wochen = ui.wochen) => E.verlauf(s(), { ebene, id, kennzahl, wochen });
  const wert = (n, k) => GELD.has(k) ? geld(n) : fmt.format(Math.round(n));
  const seg = (a, optionen, aktiv, label) => K.seg(optionen, String(aktiv), (v) => 'data-st-a="' + a + '" data-v="' + esc(v) + '"').replace('class="hw-segment"', 'class="hw-segment eng" aria-label="' + esc(label) + '"');
  const kopf = () => K.seg([['konzern', 'Konzern'], ['formate', 'Formate'], ['regionen', 'Regionen'], ['rangliste', 'Häuser']], ui.seite, (v) => 'data-st-a="seite" data-v="' + v + '"')
    .replace('class="hw-segment"', 'class="hw-segment eng" aria-label="Statistikseiten"')
    + seg('wochen', [['13', '13 Wochen'], ['52', '52 Wochen'], ['alle', 'Alle Wochen']], ui.wochen, 'Zeitraum')
    + (ui.seite === 'konzern' ? seg('typ', [['balken', 'Wochen'], ['quartal', 'Quartale']], ui.typ, 'Darstellung') : '');

  function gruppieren(punkte, kennzahl) {
    if (ui.typ !== 'quartal') return punkte;
    const summen = new Map();
    for (const p of punkte) {
      const start = Math.floor(p.woche / 13) * 13;
      let a = summen.get(start);
      if (!a) { a = { woche: start, wert: 0, quartal: true }; summen.set(start, a); }
      if (BESTAND.has(kennzahl)) a.wert = p.wert;
      else a.wert += p.wert;
    }
    return [...summen.values()];
  }

  /** Säulenreihe: je Woche (oder Quartal) eine Säule, Nulllinie, optional Insolvenzgrenze. */
  function saeulen(titel, punkteRoh, kennzahl, opt = {}) {
    const punkte = gruppieren(punkteRoh ?? [], kennzahl);
    if (!punkte.length) return K.abschnitt(titel) + K.leer('Für diese Auswahl sind noch keine Verlaufsdaten verfügbar.');
    const werte = punkte.map((p) => p.wert);
    if (Number.isFinite(opt.grenze)) werte.push(opt.grenze);
    const min = Math.min(0, ...werte), max = Math.max(0, ...werte), spanne = Math.max(1, max - min);
    const pos = (v) => ((v - min) / spanne * 100).toFixed(2);
    const id = ++naechsteId;
    charts.set(id, { punkte, kennzahl });
    const null0 = pos(0);
    const s1 = punkte.map((p) => {
      const hoehe = Math.max(0.6, Math.abs(p.wert) / spanne * 100).toFixed(2);
      return '<span><i class="' + (p.wert < 0 ? 'neg' : '') + (p.vorlauf ? ' vorlauf' : '') + '" style="bottom:' + (p.wert < 0 ? pos(p.wert) : null0) + '%;height:' + hoehe + '%" data-w="' + Math.round(p.wert) + '"></i></span>';
    }).join('');
    const grenze = Number.isFinite(opt.grenze) ? '<i class="hw-saeulen-grenze" style="bottom:' + pos(opt.grenze) + '%" title="Insolvenzgrenze"></i>' : '';
    const letzte = punkte.at(-1);
    return K.abschnitt(titel, wert(letzte.wert, kennzahl))
      + '<div class="hw-saeulen' + (opt.serie === 'b' ? ' b' : '') + '" role="img" aria-label="' + esc(titel) + ': Werte durch Antippen oder Ziehen anzeigen" data-st-chart="' + id + '" data-st-ende="' + esc(String(punkteRoh.at(-1)?.wert ?? 0)) + '">'
      + s1 + '<i class="hw-saeulen-null" style="bottom:' + null0 + '%"></i>' + grenze + '</div>'
      + '<div class="hw-saeulen-fuss"><span>' + (letzte.quartal ? 'ab ' : '') + mitJahr(punkte[0].woche, s().startJahr) + '</span><span>' + (letzte.quartal ? 'ab ' : '') + mitJahr(letzte.woche, s().startJahr) + '</span></div>'
      + '<div class="hw-stat-wert" aria-live="polite">' + esc(ablesen(punkte, punkte.length - 1, kennzahl)) + '</div>';
  }
  function ablesen(punkte, i, kennzahl) {
    const p = punkte[i];
    if (!p) return '';
    return (p.quartal ? 'Quartal ab ' : '') + xAchse(p.woche) + ' · Ist ' + wert(p.wert, kennzahl)
      + (p.vorjahr !== undefined && !p.quartal ? ' · Vorjahr ' + wert(p.vorjahr, kennzahl) : '')
      + (p.plan !== undefined && !p.quartal ? ' · Plan ' + wert(p.plan, kennzahl) : '')
      + (p.vorlauf ? ' · Vorlauf' : '');
  }
  function konzern() {
    const gk = (k, t) => { const pk = daten('konzern', undefined, k, 2).punkte, a = pk.at(-1)?.wert ?? 0, v = pk.length > 1 ? pk.at(-2).wert : null;
      return { label: t, wert: wert(a, k), ton: k === 'ebitda' ? (a < 0 ? 'schlecht' : 'gut') : '', unter: v == null ? 'keine Vorwoche' : K.abweichung(a - v, (a >= v ? '+' : '−') + geld(Math.abs(a - v)), v ? (a - v) / Math.abs(v) : null) }; };
    let html = K.gross([gk('umsatz', 'Umsatz Woche'), gk('ebitda', 'EBITDA Woche')]);
    for (const [k, t, serie] of [['umsatz', 'Umsatz', 'a'], ['ebitda', 'EBITDA', 'b'], ['cash', 'Cash', 'a'], ['stimmung', 'Stakeholder-Stimmung', 'a']]) {
      html += saeulen(t, daten('konzern', undefined, k).punkte, k, { serie, grenze: k === 'cash' ? -s().kreditlinie : undefined });
      if (k === 'cash') html += '<p class="hw-text">Gestrichelt: Insolvenzgrenze ' + esc(geld(-s().kreditlinie)) + ' (verfügbarer Kreditrahmen). Änderungen der Kreditlinie sind historisch nicht rekonstruierbar.</p>';
    }
    return html + bruecke();
  }
  /** Summe einer Reihe über den gewählten Zeitraum (Bestandsgrößen: letzter Wert). */
  const imZeitraum = (punkte, k) => BESTAND.has(k) ? (punkte.at(-1)?.wert ?? 0) : punkte.reduce((a, p) => a + p.wert, 0);
  function vergleich(ebene, ids, titel) {
    const zeilen = ids.map((name) => ({ name, umsatz: Math.round(imZeitraum(daten(ebene, name, 'umsatz').punkte, 'umsatz')), db: Math.round(imZeitraum(daten(ebene, name, 'db').punkte, 'db')) }));
    const summeU = zeilen.reduce((a, z) => a + z.umsatz, 0), summeD = zeilen.reduce((a, z) => a + z.db, 0);
    const maxU = Math.max(1, ...zeilen.map((z) => Math.abs(z.umsatz))), maxD = Math.max(1, ...zeilen.map((z) => Math.abs(z.db)));
    const zeitraum = ui.wochen === 'alle' ? 'alle Wochen' : ui.wochen + ' Wochen';
    const anteile = (feld, max, serie) => '<div class="hw-anteile">' + zeilen.map((z) => '<span>' + esc(z.name) + '</span><i><i class="' + serie + (z[feld] < 0 ? ' neg' : '') + '" style="width:calc(' + (Math.abs(z[feld]) / max * 100).toFixed(1) + '% - 4px)"></i></i><b>' + esc(geld(z[feld])) + '</b>').join('') + '</div>';
    return K.abschnitt('Umsatz nach ' + titel, zeitraum) + anteile('umsatz', maxU, '')
      + K.abschnitt('Deckungsbeitrag nach ' + titel, zeitraum) + anteile('db', maxD, 'b')
      + '<div class="hw-abstand"></div><div data-summen-name="' + esc(titel) + '">' + K.tabelle({ titel: titel, spalten: ['Umsatz', 'DB', 'Quote'], pruefen: true,
        zeilen: zeilen.map((z) => ({ name: z.name, werte: [geld(z.umsatz), geld(z.db), z.umsatz ? prozent(z.db / z.umsatz) : 'ohne Umsatz'], roh: [z.umsatz, z.db, null], ton: ['', z.db < 0 ? 'schlecht' : '', ''] })),
        summe: { name: 'Summe', werte: [geld(summeU), geld(summeD), summeU ? prozent(summeD / summeU) : 'ohne Umsatz'], roh: [summeU, summeD, null] } }) + '</div>';
  }
  function formate() {
    return vergleich('format', ['Hartwig', 'Volkskauf', 'Sport', 'FUNDUS'], 'Format') + '<p class="hw-text">Noch nicht simulierte Formate bleiben ohne Werte.</p>';
  }
  function regionen() { return vergleich('region', ['Nord', 'Ost', 'West', 'Mitte', 'Süd'], 'Region'); }
  function rangliste() {
    const hauser = s().haeuser.filter((h) => h.verlauf?.length).map((h) => {
      const p = h.verlauf.at(-1), wk = s().historie.at(-1);
      const zentral = wk ? wk.wkz - wk.abschriften - wk.zentrale - wk.marketing - wk.beratung : 0;
      const marge = p.umsatz > 0 ? (p.db + zentral * p.umsatz / Math.max(1, wk?.umsatz ?? 1)) / p.umsatz : -Infinity;
      return { h, p, marge };
    }).sort((a, b) => b.marge - a.marge || a.h.name.localeCompare(b.h.name));
    if (!hauser.length) return K.leer('Nach der ersten Woche erscheinen die Ranglisten.');
    const verteilt = hauser.filter((x) => Number.isFinite(x.marge));
    const positiv = verteilt.filter((x) => x.marge >= 0).length;
    let html = K.gross([{ label: 'Häuser positiv', wert: fmt.format(positiv), ton: 'gut' }, { label: 'Häuser negativ', wert: fmt.format(verteilt.length - positiv), ton: verteilt.length - positiv ? 'schlecht' : '' }]);
    html += K.abschnitt('Rangliste EBITDA-Marge', hauser.length + ' Häuser');
    html += K.liste(hauser.slice(0, ui.zeilen).map((x, i) => K.zeile({ was: (i + 1) + '. ' + esc(x.h.name), unter: esc(x.h.stadt + ' · ' + x.h.region) + ' · Umsatz ' + esc(geld(x.p.umsatz)),
      wert: prozent(x.marge), ton: x.marge < 0 ? 'schlecht' : 'gut', tippbar: true, attr: 'data-st-a="haus" data-v="' + esc(x.h.id) + '"' })));
    if (ui.zeilen < hauser.length) html += K.knoepfe(K.knopf('Weitere Häuser (' + (hauser.length - ui.zeilen) + ')', 'data-st-a="mehr"', 'zweit breit'));
    return html + '<p class="hw-text">EBITDA-Marge je Haus: Deckungsbeitrag mit proportional zum Umsatz verteilten Zuschüssen, Abschriften und Zentralkosten. Unternehmensweit identische Verteilungsschlüssel, geschätzte Hauszuordnung. Häuser ohne Umsatz am Ende.</p>';
  }
  function bruecke() {
    const k = s().historie.at(-1);
    if (!k) return '';
    const z = (name, v) => ({ name, werte: [geld(v)], roh: [Math.round(v)], ton: [v < 0 ? 'schlecht' : ''] });
    const zeilen = [z('Rohertrag', k.rohertrag), z('Konzession, Mieten, WKZ', k.konzession + k.untermiete + k.wkz), z('Werbeflächen, Dienstleistungen', (k.werbeflaechen ?? 0) + (k.dienstleistungen ?? 0)),
      z('Personal', -k.personal), z('Miete', -k.miete), z('Nebenkosten', -k.nebenkosten), z('Sonstiges und Logistik', -k.sonstige - k.logistik),
      z('Zentrale', -k.zentrale), z('Marketing', -k.marketing), z('Beratung', -k.beratung)];
    const summe = zeilen.reduce((a, r) => a + r.roh[0], 0);
    return K.band('<div data-summen-name="EBITDA-Brücke">' + K.tabelle({ titel: 'EBITDA-Brücke', spalten: [xAchse(k.woche)], zeilen, summe: z('EBITDA', k.ebitda), pruefen: Math.abs(summe - k.ebitda) <= zeilen.length }) + '</div>');
  }
  function zeigen(halten = false) {
    const vorher = document.getElementById('pinhalt').scrollTop;
    charts.clear();
    const inhalt = ui.seite === 'konzern' ? konzern() : ui.seite === 'formate' ? formate() : ui.seite === 'regionen' ? regionen() : rangliste();
    const teile = inhalt.split('<section class="hw-band">');
    const html = K.bereich('betrieb', 'zahlen') + '<div class="hw-g5">' + K.rumpf(kopf() + teile[0]) + (teile[1] ? '<section class="hw-band">' + teile[1] : '') + '</div>';
    ctx.panel('Zahlen', 'Verläufe und Vergleich · KW ' + (s().woche % 52 + 1), html, 'gross');
    ui.aktiv = true;
    if (halten) document.getElementById('pinhalt').scrollTop = vorher;
  }
  function hausGrafik(id) {
    return saeulen('Umsatz · letzte 52 Wochen', daten('haus', id, 'umsatz', 52).punkte, 'umsatz') + saeulen('Deckungsbeitrag · letzte 52 Wochen', daten('haus', id, 'db', 52).punkte, 'db', { serie: 'b' });
  }
  const inhalt = document.getElementById('pinhalt');
  inhalt.addEventListener('click', (e) => {
    const b = e.target.closest('[data-st-a]'); if (!b || !ui.aktiv) return;
    const a = b.dataset.stA, v = b.dataset.v;
    if (a === 'seite') { ui.seite = v; ui.zeilen = 25; }
    else if (a === 'wochen') ui.wochen = v === 'alle' ? 'alle' : Number(v);
    else if (a === 'typ') ui.typ = v;
    else if (a === 'mehr') ui.zeilen += 25;
    else if (a === 'haus') { ctx.oeffneHaus(v); return; }
    else return;
    zeigen(a !== 'seite');
  });
  function tip(e) {
    const feld = e.target.closest?.('[data-st-chart]');
    if (!feld) return;
    const info = charts.get(Number(feld.dataset.stChart));
    if (!info) return;
    const box = feld.getBoundingClientRect();
    const i = Math.max(0, Math.min(info.punkte.length - 1, Math.floor((e.clientX - box.left) / box.width * info.punkte.length)));
    feld.classList.add('zeigt');
    [...feld.children].forEach((sp, k) => sp.classList?.toggle('an', k === i));
    const ausgabe = feld.nextElementSibling?.nextElementSibling;
    if (ausgabe?.classList.contains('hw-stat-wert')) ausgabe.textContent = ablesen(info.punkte, i, info.kennzahl);
  }
  inhalt.addEventListener('pointerdown', (e) => { if (e.target.closest?.('[data-st-chart]')) { e.target.setPointerCapture?.(e.pointerId); tip(e); } });
  inhalt.addEventListener('pointermove', (e) => {
    if (!e.target.closest?.('[data-st-chart]')) return;
    zeiger = { target: e.target, clientX: e.clientX };
    if (ausstehend) return;
    ausstehend = true;
    requestAnimationFrame(() => { ausstehend = false; if (zeiger) tip(zeiger); });
  });
  return {
    ui, oeffne: (seite = 'konzern') => { ui.seite = seite; zeigen(); }, hausGrafik,
    aktiv: () => ui.aktiv, zu: () => { ui.aktiv = false; }, neuZeichnen: () => { if (ui.aktiv) zeigen(true); },
    pruefe: () => {
      const fehler = [];
      for (const k of ['umsatz', 'ebitda', 'cash', 'stimmung']) {
        const d = daten('konzern', undefined, k), p = d.punkte.at(-1), c = E.cockpit(s());
        const soll = k === 'umsatz' ? c.umsatzWoche : k === 'ebitda' ? c.ebitdaWoche : k === 'stimmung' ? c.vertrauen : c.cash;
        if (p && p.wert !== soll) fehler.push(k + ': ' + p.wert + ' statt ' + soll);
      }
      return { fehler, diagramme: inhalt.querySelectorAll('[data-st-chart]').length };
    },
  };
}

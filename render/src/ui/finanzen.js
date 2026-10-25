// Finanzen der Zentrale wie Coffee Inc 2 „Finance“ (Vorlagen 20, neu-2510/finance-woche, finance-quartal):
// Kopfbild der Finanzabteilung, zwei Großkennzahlen, fünf Balkenpaare ab null, zwei schmale Umschalter
// (GuV / Bilanz / Cashflow, Woche / Quartal / Jahr) und darunter die Aufstellung mit den zwei letzten Perioden.
// Reine Projektion von s.historie (WochenKpi); keine eigene Rechnung außer Summen über Wochen.
import { esc, geld, kwVon } from './format.js';
import * as K from './komponenten.js';
import { zentraleReiter, G4 } from './zentrale-abteilungen.js';
import { portraetSVG } from '../kit/portraet.js';

const ARTEN = [['guv', 'GuV'], ['bilanz', 'Bilanz'], ['cashflow', 'Cashflow']];
const ZEITEN = [['woche', 'Woche'], ['quartal', 'Quartal'], ['jahr', 'Jahr']];
const ERTRAEGE = [['konzession', 'Konzessionen'], ['untermiete', 'Untermiete'], ['wkz', 'Werbekostenzuschüsse'], ['werbeflaechen', 'Werbeflächen'], ['dienstleistungen', 'Dienstleistungen']];
const KOSTEN = [['personal', 'Personal'], ['miete', 'Miete'], ['nebenkosten', 'Nebenkosten'], ['logistik', 'Logistik'], ['marketing', 'Marketing'], ['zentrale', 'Zentrale'], ['beratung', 'Beratung'], ['sonstige', 'Sonstige Kosten']];
const SUMME = ['umsatz', 'rohertrag', 'ebitda', 'sondereffekte', ...ERTRAEGE.map((x) => x[0]), ...KOSTEN.map((x) => x[0])];
const FLUSS = [['operativ', 'Aus dem Geschäft'], ['investitionen', 'Investitionen'], ['finanzierung', 'Finanzierung'], ['sonstiges', 'Sonstiges']];

const jahrVon = (st, w) => st.startJahr + Math.floor(w / 52);
const quartalVon = (w) => Math.floor((((w % 52) + 52) % 52) / 13) + 1;

/** Wochen zu Perioden bündeln; Stromgrößen werden summiert, Bestände gelten am letzten Wochenende der Periode. */
export function perioden(st, zeit) {
  const hist = st.historie ?? [];
  const schluessel = (w) => zeit === 'woche' ? String(w) : zeit === 'quartal' ? `${jahrVon(st, w)}-${quartalVon(w)}` : String(jahrVon(st, w));
  const gruppen = [];
  for (const k of hist) {
    const sch = schluessel(k.woche);
    let g = gruppen[gruppen.length - 1];
    if (!g || g.sch !== sch) { g = { sch, wochen: [] }; gruppen.push(g); }
    g.wochen.push(k);
  }
  return gruppen.map(({ wochen }) => {
    const erst = wochen[0], letzt = wochen[wochen.length - 1];
    const p = { wochen: wochen.length, von: erst.woche, bis: letzt.woche };
    for (const f of SUMME) p[f] = wochen.reduce((n, k) => n + (k[f] ?? 0), 0);
    p.fluss = Object.fromEntries([...FLUSS.map((x) => x[0]), 'netto'].map((f) => [f, wochen.reduce((n, k) => n + (k.kapitalfluss?.[f] ?? 0), 0)]));
    p.mitFluss = wochen.some((k) => k.kapitalfluss);
    p.cash = letzt.cash; p.bestand = letzt.bestand; p.kreditFrei = letzt.kreditFrei;
    p.verbindlichkeiten = letzt.verbindlichkeiten; p.altVerbindlichkeiten = letzt.altVerbindlichkeiten ?? 0;
    p.label = zeit === 'woche' ? `KW ${kwVon(letzt.woche)}` : zeit === 'quartal' ? `Q${quartalVon(letzt.woche)} ${jahrVon(st, letzt.woche)}` : String(jahrVon(st, letzt.woche));
    p.laufend = zeit === 'quartal' ? wochen.length < 13 : zeit === 'jahr' ? wochen.length < 52 : false;
    p.ergebnis = p.ebitda + p.sondereffekte;
    p.wareneinsatz = p.umsatz - p.rohertrag;
    p.ertraege = ERTRAEGE.reduce((n, [f]) => n + p[f], 0);
    p.kosten = KOSTEN.reduce((n, [f]) => n + p[f], 0);
    // Vereinfachte Bilanz: Vermögen = Kasse + Ware; Schulden = genutzte Kreditlinie + Lieferanten + Altforderungen.
    p.kasse = Math.max(0, p.cash); p.kredit = Math.max(0, -p.cash);
    p.vermoegen = p.kasse + p.bestand;
    p.schulden = p.kredit + (p.verbindlichkeiten ?? 0) + p.altVerbindlichkeiten;
    p.reinvermoegen = p.vermoegen - p.schulden;
    return p;
  });
}

/** Kurzform für die Tabellen (Coffee schreibt volle Zahlen; bei Hartwig sind Mrd. sonst unlesbar). */
const mio = (x) => { const v = Math.round(x / 1e5) / 10; return (v < 0 ? '−' : '') + Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); };
const delta = (jetzt, vorher, umgekehrt = false) => {
  if (vorher == null) return 'keine Vorperiode';
  const d = jetzt - vorher, q = vorher ? d / Math.abs(vorher) : null;
  return K.abweichung(Math.abs(d) < 0.5 ? 0 : d, (d > 0 ? '+' : d < 0 ? '−' : '±') + geld(Math.abs(d)), q, umgekehrt);
};

function inhalt(st, ui) {
  const ps = perioden(st, ui.zeit);
  if (!ps.length) return { befund: '<b>Der erste Abschluss folgt nach der ersten Woche.</b>', html: K.leer('Nach dem ersten Wochenabschluss stehen hier GuV, Bilanz und Cashflow.', 'Noch kein Abschluss') };
  const p = ps[ps.length - 1], v = ps[ps.length - 2] ?? null, fuenf = ps.slice(-5);
  const zeitWort = { woche: 'Woche', quartal: 'Quartal', jahr: 'Jahr' }[ui.zeit];
  const spalten = [v?.label, p.label + (p.laufend ? ' bisher' : '')].filter(Boolean);
  const einheit = '<p class="hw-fin-einheit">Beträge in Mio. €</p>';
  const zwei = (f) => [v, p].filter(Boolean).map(f);
  const reihe = (name, f, ton = null) => ({ name, werte: zwei((q) => mio(f(q))), roh: zwei((q) => Math.round(f(q))), ...(ton ? { ton: zwei((q) => ton(f(q))) } : {}) });
  const vorz = (x) => x < 0 ? 'schlecht' : '';
  const tabelle = (titel, zeilen, summe, mitKopf = false) => K.tabelle({ titel, spalten: mitKopf ? spalten : (v ? ['', ''] : ['']), zeilen, summe, pruefen: true });
  let gross, saeulen, legende, tabellen, befund;

  if (ui.art === 'guv') {
    gross = [{ label: 'Umsatz', wert: geld(p.umsatz), unter: delta(p.umsatz, v?.umsatz) },
      { label: 'EBITDA', wert: geld(p.ebitda), ton: p.ebitda < 0 ? 'schlecht' : 'gut', unter: delta(p.ebitda, v?.ebitda) }];
    saeulen = fuenf.map((q) => ({ label: q.label, a: q.umsatz, b: q.ebitda })); legende = ['Umsatz', 'EBITDA'];
    tabellen = tabelle('Umsatz', [reihe('Umsatz', (q) => q.umsatz), reihe('Wareneinsatz und Abschriften', (q) => -q.wareneinsatz)], reihe('Rohertrag', (q) => q.rohertrag), true)
      + tabelle('Erträge', ERTRAEGE.map(([f, n]) => reihe(n, (q) => q[f])), reihe('Erträge gesamt', (q) => q.ertraege))
      + tabelle('Kosten', KOSTEN.map(([f, n]) => reihe(n, (q) => -q[f])), reihe('Kosten gesamt', (q) => -q.kosten))
      + tabelle('Ergebnis', [reihe('Rohertrag', (q) => q.rohertrag), reihe('Erträge', (q) => q.ertraege), reihe('Kosten', (q) => -q.kosten)], reihe('EBITDA', (q) => q.ebitda, vorz))
      + tabelle('', [reihe('EBITDA', (q) => q.ebitda), reihe('Sondereffekte', (q) => q.sondereffekte)], reihe('Ergebnis', (q) => q.ergebnis, vorz));
    const groesster = KOSTEN.map(([f, n]) => [n, p[f] - (v?.[f] ?? p[f])]).sort((a, b) => b[1] - a[1])[0];
    befund = p.ebitda < 0 ? `<b>EBITDA ${geld(p.ebitda)} im ${zeitWort === 'Jahr' ? 'Jahr' : zeitWort === 'Quartal' ? 'Quartal' : 'Wochenabschluss'}.</b>${groesster && groesster[1] > 0 ? ` Größter Kostenanstieg: ${groesster[0]} +${geld(groesster[1])}.` : ''}`
      : `<b>EBITDA ${geld(p.ebitda)}${v ? `, ${p.ebitda >= v.ebitda ? 'mehr' : 'weniger'} als ${ui.zeit === 'woche' ? 'in der Vorwoche' : 'in der Vorperiode'}` : ''}.</b>`;
  } else if (ui.art === 'bilanz') {
    gross = [{ label: 'Vermögen', wert: geld(p.vermoegen), unter: delta(p.vermoegen, v?.vermoegen) },
      { label: 'Reinvermögen', wert: geld(p.reinvermoegen), ton: p.reinvermoegen < 0 ? 'schlecht' : 'gut', unter: delta(p.reinvermoegen, v?.reinvermoegen) }];
    saeulen = fuenf.map((q) => ({ label: q.label, a: q.vermoegen, b: q.reinvermoegen })); legende = ['Vermögen', 'Reinvermögen'];
    const lief = p.verbindlichkeiten != null;
    tabellen = tabelle('Vermögen', [reihe('Kasse', (q) => q.kasse), reihe('Warenbestand', (q) => q.bestand)], reihe('Vermögen gesamt', (q) => q.vermoegen), true)
      + tabelle('Schulden', [reihe('Genutzte Kreditlinie', (q) => q.kredit), ...(lief ? [reihe('Lieferanten', (q) => q.verbindlichkeiten ?? 0)] : []),
        ...(p.altVerbindlichkeiten || v?.altVerbindlichkeiten ? [reihe('Forderungen aus der Insolvenz', (q) => q.altVerbindlichkeiten)] : [])], reihe('Schulden gesamt', (q) => q.schulden))
      + tabelle('', [reihe('Vermögen', (q) => q.vermoegen), reihe('Schulden', (q) => -q.schulden)], reihe('Reinvermögen', (q) => q.reinvermoegen, vorz))
      + K.liste([K.zeile({ was: 'Freie Kreditlinie', unter: 'Spielraum bis zur Zahlungsunfähigkeit', wert: geld(p.kreditFrei), ton: p.kreditFrei < 0 ? 'schlecht' : '' })])
      + `<p class="hw-lese hw-leise hw-unterzeile">Vereinfachte Bilanz zum Ende ${ui.zeit === 'woche' ? 'der Woche' : ui.zeit === 'quartal' ? 'des Quartals' : 'des Jahres'}: Häuser, Mietverträge und Ausstattung sind nicht bewertet.${lief ? '' : ' Lieferantenschulden werden ab dem nächsten Abschluss erfasst.'}</p>`;
    befund = p.kredit > 0 ? `<b>Die Kreditlinie ist mit ${geld(p.kredit)} gezogen.</b> Frei sind noch ${geld(Math.max(0, p.kreditFrei))}.` : `<b>In der Kasse liegen ${geld(p.kasse)}.</b> Die Kreditlinie ist frei.`;
  } else {
    gross = [{ label: 'Aus dem Geschäft', wert: geld(p.fluss.operativ), ton: p.fluss.operativ < 0 ? 'schlecht' : '', unter: delta(p.fluss.operativ, v?.fluss.operativ) },
      { label: 'Kassenänderung', wert: geld(p.fluss.netto), ton: p.fluss.netto < 0 ? 'schlecht' : 'gut', unter: 'Kasse ' + geld(p.cash) }];
    saeulen = fuenf.map((q) => ({ label: q.label, a: q.fluss.operativ, b: q.fluss.netto })); legende = ['Aus dem Geschäft', 'Kassenänderung'];
    tabellen = p.mitFluss ? tabelle('Zahlungen', FLUSS.map(([f, n]) => reihe(n, (q) => q.fluss[f])), reihe('Kassenänderung', (q) => q.fluss.netto, vorz), true)
      + K.liste([K.zeile({ was: 'Kasse am Ende', wert: geld(p.cash), ton: p.cash < 0 ? 'schlecht' : '' }), K.zeile({ was: 'Freie Kreditlinie', wert: geld(p.kreditFrei), ton: p.kreditFrei < 0 ? 'schlecht' : '' })])
      : K.leer('Der Kapitalfluss wird ab dem nächsten Wochenabschluss aufgeschlüsselt.');
    befund = p.fluss.netto < 0 ? `<b>Die Kasse ist um ${geld(-p.fluss.netto)} geschrumpft.</b>` : `<b>Die Kasse ist um ${geld(p.fluss.netto)} gewachsen.</b>`;
  }
  const html = K.gross(gross)
    + `<div class="hw-fin-balken">${K.balken([...Array.from({ length: Math.max(0, 5 - saeulen.length) }, () => ({ label: '', geist: true })), ...saeulen], legende)}</div>`
    + `<div class="hw-fin-schalter">${K.seg(ARTEN, ui.art, (w) => `data-fin="art" data-wert="${w}"`)}${K.seg(ZEITEN, ui.zeit, (w) => `data-fin="zeit" data-wert="${w}"`)}</div>`
    + `<div class="hw-fin-tabellen">${einheit}${tabellen}</div>`;
  return { befund, html };
}

export function finanzenModul(ctx) {
  const ui = { aktiv: false, art: 'guv', zeit: 'woche' };
  function anzeigen(halten = false) {
    const vorher = ctx.inhalt.scrollTop, st = ctx.s();
    const { befund, html } = inhalt(st, ui);
    const cfo = ctx.cfo?.();
    const bild = ctx.kopfbild?.();
    let h = K.bereich('zentrale', 'finanzen') + G4 + '<i class="hw-fin" aria-hidden="true"></i>'
      + K.sprecher({ text: befund, unter: (cfo?.name ? cfo.name + ' · ' : '') + 'Finanzvorstand', person: cfo?.portraet ? portraetSVG(cfo.portraet, 72) : '' });
    if (bild) h += `<div class="hw-kopfbild"><img src="${bild.url}" alt="${esc(bild.alt)}">`
      + (bild.abteilung ? `<button type="button" class="hw-bildknopf hw-kontur hw-bildknopf-links" data-fin="abteilung" data-wert="${esc(bild.abteilung)}" aria-label="Finanzabteilung öffnen">${K.illustration('personal') || K.SYMBOLE.personal}</button>` : '') + '</div>';
    h += K.rumpf(html) + zentraleReiter('finanzen');
    const u = ctx.unter?.() ?? '';
    ctx.panel('Finanzen', u, h, 'gross');
    ui.aktiv = true;
    if (halten) ctx.inhalt.scrollTop = vorher;
  }
  ctx.inhalt.addEventListener('click', (e) => {
    if (!ui.aktiv) return;
    const el = e.target.closest('[data-fin]');
    if (!el) return;
    const k = el.dataset.fin;
    if (k === 'abteilung') { ui.aktiv = false; ctx.oeffneAbteilung(el.dataset.wert); return; }
    ui[k] = el.dataset.wert; anzeigen(true);
  });
  return { oeffne: (art) => { if (art) ui.art = art; anzeigen(); }, zu: () => { ui.aktiv = false; }, aktiv: () => ui.aktiv };
}

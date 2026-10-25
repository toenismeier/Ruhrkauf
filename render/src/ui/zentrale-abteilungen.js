// Zentrale (Coffee 17–20): Übersicht mit Etagenschnitt als Kopfbild, Großkennzahlen, Kostenverlauf, Kostenaufstellung,
// Etagen und Abteilungen als Listen; Abteilungsseiten mit Personenblock wie Coffee 28. Reine Projektion der
// Engine-Abfragen (hqUebersicht, organisationUebersicht, historie); Aktionen laufen über hqKlick in spiel.js.
import { esc, geld, fmt, kwVon } from './format.js';
import * as K from './komponenten.js';
import { portraetSVG, zufallsMerkmale } from '../kit/portraet.js';

const TITEL = {
  controlling: 'Finanzen', personal: 'Personal', einkauf: 'Einkauf', marketing: 'Marketing',
  ecommerce: 'IT und E-Commerce', recht: 'Recht', immobilien: 'Immobilien',
  logistik: 'Logistik', vm: 'Visual Merchandising', verwaltung: 'Verwaltung',
  produkt: 'Produktentwicklung',
};
const REIHENFOLGE = ['controlling', 'personal', 'einkauf', 'marketing', 'ecommerce',
  'logistik', 'immobilien', 'recht', 'vm', 'verwaltung', 'produkt'];
const KOSTEN = [['personal', 'Gehälter der Abteilungen'], ['sach', 'Sachkosten'], ['reise', 'Reisekosten'], ['miete', 'Büromiete'],
  ['nebenkosten', 'Nebenkosten'], ['strafen', 'Folgekosten schwacher Verwaltung'], ['vorstand', 'Vorstand'], ['entwicklung', 'Produktentwicklung'],
  ['leitung', 'Bereichs- und Clusterleitungen'], ['marktbeobachtung', 'Marktbeobachtung']];
const prozent = (q) => Math.round(q * 100) + ' %';
const etageName = (n) => n === 0 ? 'Erdgeschoss' : n + '. Etage';
const etageKurz = (n) => n === 0 ? 'EG' : n + '. OG';
const klick = (...x) => `onclick="hqKlick(${x.map((v) => `'${esc(String(v))}'`).join(',')})"`;

/** Reiterleiste der Zentrale (Coffee 20: Finanzen, Einkauf, Vorstand …). Gilt für Zentrale, Vorstand, Organisation, Reporting. */
export const zentraleReiter = (aktiv) => K.reiterUnten([['finanzen', 'Finanzen', 'finanzen'], ['zentrale', 'Zentrale', 'zentrale'], ['vorstand', 'Vorstand', 'vorstand'],
  ['organisation', 'Organisation', 'organisation'], ['reporting', 'Reporting', 'reporting']], aktiv, (id) => klick('reiter', id));

/** Kopfbild: Etagenschnitt der gewählten Etage, unten links der Knopf zur Abteilung auf dieser Etage. */
function kopfbild(bild, alt, knopf = '') {
  if (!bild) return '';
  return `<div class="hw-kopfbild"><img src="${bild}" alt="${esc(alt)}">${knopf}</div>`;
}
const bildzeile = (text) => `<p class="hw-bildzeile">${esc(text)}</p>`;
/** Marker für die G4-Regeln in hartwig.css (Blattgrund, Kopf und Reiter aus der Skala). */
export const G4 = '<i class="hw-g4" aria-hidden="true"></i>';

/** Kleine Kit-Figur für Listen (Kandidaten, Stimmen). */
export const figurKlein = (svg) => `<span class="hw-figur" aria-hidden="true">${svg}</span>`;

// ───────────────────────────────────────────── Übersicht (Coffee 20)
/** c = { u, organisation, historie, woche, gebaeudeId, etageWahl, etagenBild(gid, nr) } */
export function zentraleHtml(c) {
  const { u, organisation } = c;
  const gs = u.gebaeude ?? [];
  // Hauptfrage: Was kostet die Zentrale, und wo zahle ich für leere Fläche?
  const leerEtagen = gs.flatMap((g) => g.etagen.filter((e) => e.gemietet && !e.abteilungen.length && !e.archiv));
  const ohnePlatz = (u.abteilungen ?? []).filter((a) => !a.gebaeudeId).length;
  const diffStart = u.kostenWoche - (u.kostenStart ?? u.kostenWoche);
  // Q35: Befund aus derselben Quelle wie „x % belegt“ je Gebäude (qmGemietet, qmBelegt).
  const qmMiete = gs.reduce((n, g) => n + (g.qmGemietet ?? 0), 0);
  const qmFrei = Math.max(0, qmMiete - gs.reduce((n, g) => n + (g.qmBelegt ?? 0), 0));
  const befund = (leerEtagen.length ? `<b>${leerEtagen.length} gemietete ${leerEtagen.length === 1 ? 'Etage steht' : 'Etagen stehen'} leer.</b> `
    : qmMiete > 0 && qmFrei / qmMiete >= 0.02 ? `<b>${prozent(1 - qmFrei / qmMiete)} der gemieteten Bürofläche sind belegt, ${fmt.format(Math.round(qmFrei))} qm stehen frei.</b> `
    : '<b>Alle gemieteten Etagen sind voll belegt.</b> ')
    + (ohnePlatz ? `${ohnePlatz} ${ohnePlatz === 1 ? 'Abteilung hat' : 'Abteilungen haben'} keinen Platz und wirken nur mit Stufe 0. ` : '')
    + (u.restmieteWoche > 0 ? `Für alte Büros laufen noch ${geld(u.restmieteWoche)} Restmiete je Woche.` : '');
  const verwaltung = (organisation?.bereiche ?? []).find((b) => b.abteilung === 'verwaltung' && b.stelle?.person)?.stelle.person;
  let h = K.bereich('zentrale', 'zentrale') + G4 + K.sprecher({ text: befund, unter: (verwaltung ? verwaltung.name + ' · ' : '') + 'Leitung Verwaltung',
    person: verwaltung?.portraet ? portraetSVG(verwaltung.portraet, 72) : '', ton: leerEtagen.length || ohnePlatz || (qmMiete > 0 && qmFrei / qmMiete >= 0.15) ? 'engpass' : '' });

  // Kopfbild: gewählte Etage (Standard: erste belegte Etage des gewählten bzw. ersten Gebäudes)
  const gWahl = gs.find((g) => g.id === c.etageWahl?.g) ?? gs.find((g) => g.id === c.gebaeudeId) ?? gs[0];
  let nrWahl = null;
  if (gWahl) {
    nrWahl = c.etageWahl?.g === gWahl.id ? c.etageWahl.nr : (gWahl.etagen.find((e) => e.abteilungen.length) ?? gWahl.etagen[0])?.nr;
    const e = gWahl.etagen.find((q) => q.nr === nrWahl);
    const bild = c.etagenBild?.(gWahl.id, nrWahl);
    const erste = e?.abteilungen?.[0];
    h += kopfbild(bild, `Etagenschnitt ${gWahl.name}, ${etageName(nrWahl)}`,
      erste ? `<button type="button" class="hw-bildknopf hw-kontur hw-bildknopf-links" ${klick('abteilung', erste.id)} aria-label="${esc(erste.name)} öffnen">${K.SYMBOLE.personal}</button>` : '');
    if (bild) h += bildzeile(`${gWahl.name} · ${etageName(nrWahl)} · ${(e?.abteilungen ?? []).map((a) => a.name).join(', ') || (e?.gemietet ? 'gemietet, frei' : 'nicht gemietet')}`);
  }

  let r = K.gross([
    { label: 'Kosten je Woche', p: 'hq:kosten', wert: geld(u.kostenWoche), unter: diffStart ? K.abweichung(-diffStart, (diffStart > 0 ? '+' : '−') + geld(Math.abs(diffStart)) + ' zum Start', null) : 'wie zum Start' },
    { label: 'Beschäftigte', p: 'hq:fte', wert: fmt.format(Math.round(u.fte)) + ' FTE', unter: `${fmt.format(qmMiete)} qm gemietet` }]);
  // Der Verlauf steht im Reiter Finanzen; hier nur die Aufstellung der Woche.
  // Kostenaufstellung wie die GuV in Coffee 17
  const ko = u.kosten ?? {};
  const anteil = (v) => u.kostenWoche ? (100 * v / u.kostenWoche).toFixed(1).replace('.', ',') + ' %' : '0 %';
  r += K.abschnitt('Kosten der Zentrale', 'je Woche');
  r += `<div data-summen-name="Kosten der Zentrale">${K.tabelle({ titel: 'Posten', spalten: ['Woche', 'Anteil'],
    zeilen: KOSTEN.map(([k, name]) => ({ name, werte: [geld(ko[k] ?? 0), anteil(ko[k] ?? 0)], roh: [Math.round(ko[k] ?? 0), null] })),
    summe: { name: 'Zentrale gesamt', werte: [geld(u.kostenWoche), '100 %'], roh: [Math.round(ko.gesamt ?? u.kostenWoche), null] }, pruefen: true })}</div>`;
  r += K.liste([K.zeile({ was: 'Restmiete alter Büros', wert: geld(u.restmieteWoche ?? 0), ton: u.restmieteWoche > 0 ? 'schlecht' : '' })]);

  // Etagen je Gebäude
  for (const g of [...gs].sort((a, b) => (a.id === c.gebaeudeId ? -1 : b.id === c.gebaeudeId ? 1 : 0))) {
    r += K.abschnitt(g.name);
    r += `<p class="hw-lese hw-leise hw-unterkopf">${esc(g.stadt)} · ${fmt.format(g.qmGemietet)} qm gemietet · ${prozent(g.auslastung)} belegt · ${geld(g.kostenWoche)} je Woche</p>`;
    const etagen = [...(g.etagen ?? [])].sort((x, y) => y.nr - x.nr);
    r += K.liste(etagen.map((e) => {
      const ab = (e.abteilungen ?? []).map((a) => a.name).join(', ');
      const gewaehlt = gWahl?.id === g.id && nrWahl === e.nr;
      return K.zeile({ was: etageName(e.nr) + (e.archiv ? ' · Archiv' : ''), unter: esc(ab || (e.gemietet ? 'gemietet, frei' : 'nicht gemietet')) + ' · ' + fmt.format(e.qm) + ' qm',
        wert: e.gemietet ? prozent(e.auslastung) : '', wertUnter: e.gemietet ? 'belegt' : '', ton: e.gemietet && !ab && !e.archiv ? 'achtung' : '', tippbar: true,
        attr: `${klick(e.archiv ? 'archivOeffnen' : 'etage', g.id, e.nr)}${gewaehlt ? ' aria-current="true"' : ''} aria-label="${esc(etageName(e.nr))} ansehen"` });
    }));
    const e = gWahl?.id === g.id ? g.etagen.find((q) => q.nr === nrWahl) : null;
    if (e?.gemietet) {
      const ab = (e.abteilungen ?? []).length;
      r += `<p class="hw-lese hw-leise hw-auswahl">${esc(etageName(e.nr))} im Bild</p>` + `<div class="hw-knoepfe zweispaltig">`
        + K.knopf(e.archiv ? 'Archiv auflösen' : 'Archiv einrichten', klick('archiv', g.id, e.nr, !e.archiv), 'zweit')
        + (e.archiv ? K.knopf('Chronik ansehen', klick('archivOeffnen'), 'zweit') : '')
        + (!ab && !e.archiv ? K.knopf('Etage kündigen', klick('kuendigenE', g.id, e.nr), 'gefahr') : '') + '</div>';
    }
    if (gs.length > 1) r += K.knoepfe(K.knopf('Gebäude kündigen', klick('kuendigenG', g.id), 'gefahr breit'));
  }

  // Abteilungen
  if (u.abteilungen?.length) {
    r += K.abschnitt('Abteilungen', `${u.abteilungen.length} Bereiche`);
    r += K.liste(u.abteilungen.map((a) => {
      const umzug = a.umzugBis !== undefined && a.umzugBis > c.woche ? ` · Umzug bis KW ${kwVon(a.umzugBis)}` : '';
      const ort = a.gebaeudeId ? `${a.gebaeude ?? ''} ${etageKurz(a.etage)}`.trim() : 'ohne Platz';
      return K.zeile({ was: esc(a.name), unter: `${fmt.format(Math.round(a.fte))} von ${fmt.format(a.sollFte)} FTE · Stufe ${a.stufe} · ${esc(ort)}${umzug}`,
        wert: geld(a.kostenWoche), wertUnter: 'je Woche', ton: a.gebaeudeId ? '' : 'achtung', tippbar: true, attr: klick('abteilung', a.id) });
    }));
  }
  // Freie Bürogebäude
  if (u.angebote?.length) {
    r += K.abschnitt('Freie Bürogebäude', `${u.angebote.length} Angebote`);
    r += K.liste(u.angebote.map((a) => {
      const qm = a.etagen.reduce((x, e) => x + e.qm, 0), k = a.etagen.reduce((x, e) => x + e.kostenWoche, 0);
      return `<div class="hw-zeile"><span class="hw-was">${esc(a.name)}<small>${esc(a.stadt)} · ${a.etagen.length} Etagen · ${fmt.format(qm)} qm · ${geld(k)} je Woche · Frist KW ${kwVon(a.frist)}</small></span>${K.knopf('Mieten', klick('mieten', a.id), 'zweit')}</div>`;
    }));
  }
  h += K.rumpf(r) + zentraleReiter('zentrale');
  const weitere = (u.staedte ?? []).filter((q) => q !== u.sitz);
  return { titel: 'Zentrale', unter: `Sitz ${u.sitz}${weitere.length ? ` · auch in ${weitere.join(', ')}` : ''} · ${gs.length} Gebäude`, html: h };
}

// ───────────────────────────────────────────── Abteilungsseite (Coffee 17–19, 28)
// Besetzung gegen den Personalbedarf der Ausbaustufe (sollFte), nicht gegen freie Schreibtische im Gebäude.
const unterbesetzt = (a, fte) => a.sollFte > 0 && fte < a.sollFte * 0.9;
const ueberbesetzt = (a, fte) => a.sollFte > 0 && fte > a.sollFte * 1.15;
function spruch(a, fte, kap) {
  if (unterbesetzt(a, fte)) return 'Uns fehlen Kolleginnen und Kollegen. Wir müssen offene Stellen besetzen.';
  if (a.einarbeitungBis) return 'Neue Kolleginnen und Kollegen werden eingearbeitet.';
  if (a.moral < 65) return 'Die Gehälter belasten die Stimmung im Team.';
  if (ueberbesetzt(a, fte)) return 'Wir sind mehr Leute, als die Aufgaben derzeit brauchen.';
  if (fte >= kap) return 'Unsere Plätze sind voll. Für weitere Einstellungen brauchen wir Raum.';
  return 'Die Aufgaben sind verteilt. Wir arbeiten an den Zielen.';
}
function stimmungsTexte(a, fte) {
  return [
    a.gehaltFaktor < 1 ? 'Ich wünsche mir ein höheres Gehalt.' : 'Das Gehalt ist für mich in Ordnung.',
    a.moral >= 70 ? 'Unser Team erreicht seine Ziele.' : 'Die Stimmung ist angespannt.',
    a.fluktuation > .08 ? 'Ich sehe mich nach einer anderen Stelle um.' : 'Ich möchte bleiben.',
    unterbesetzt(a, fte) ? 'Die Arbeit ist kaum zu schaffen.' : ueberbesetzt(a, fte) ? 'Mir fehlt manchmal eine richtige Aufgabe.' : 'Die Aufgaben sind gut verteilt.',
  ];
}
/** Reine Projektion der Engine-Abfragen. Auswahl ist eine bereits vorhandene HQ-Abteilung.
 *  Hauptfrage: „Ist diese Abteilung richtig besetzt, und was kostet sie?“ */
export function zentraleAbteilungHtml(u, grafik, organisation, id, etageWahl, etagenBild = null) {
  const a = (u.abteilungen ?? []).find((x) => x.id === id);
  if (!a) return { titel: 'Abteilung nicht gefunden', unter: '', html: K.bereich('zentrale') + G4 + K.rumpf(K.leer('Diese Abteilung ist nicht verfügbar.')) + zentraleReiter('zentrale') };
  const teams = (organisation?.bereiche ?? []).filter((b) => b.abteilung === a.id);
  const team = teams.find((b) => b.stelle?.person) ?? teams[0];
  const leitung = team?.stelle?.person;
  const raeume = (grafik?.gebaeude ?? []).flatMap((g) => (g.etagen ?? [])
    .filter((e) => e.gemietet && e.abteilungen.some((b) => b.id === id))
    .map((e) => ({ gebaeude: g, etage: e, zugewiesen: e.abteilungen.find((b) => b.id === id) })));
  const wahl = raeume.find((q) => q.gebaeude.id === etageWahl?.g && q.etage.nr === etageWahl?.nr) ??
    raeume.find((q) => q.gebaeude.id === a.gebaeudeId && q.etage.nr === a.etage) ?? raeume[0];
  const geb = (u.gebaeude ?? []).find((g) => g.id === wahl?.gebaeude.id);
  // Q35: eine Quelle (Engine abteilungPlaetze): FTE je Etage summieren sich zur Abteilung,
  // Plätze = eigene Arbeitsplätze plus freie Plätze dieser Etage.
  const platz = (a.plaetze ?? []).find((z) => z.gebaeudeId === wahl?.gebaeude.id && z.etage === wahl?.etage.nr);
  const fteEtage = platz?.fte ?? wahl?.zugewiesen?.fte ?? 0;
  const kapEtage = wahl ? (platz?.plaetze ?? fteEtage) : 0;
  const kap = Math.max(a.fte, a.kapazitaetFte ?? a.fte);
  const etagenAnzahl = (a.plaetze ?? []).length;
  const ohnePlatz = Math.max(0, Math.round(a.fte) - (a.plaetze ?? []).reduce((n, z) => n + z.fte, 0));
  const st = a.gehaltFaktor ?? 1;
  const gName = geb?.name ?? wahl?.gebaeude.name ?? '';
  const etText = wahl ? etageName(wahl.etage.nr) : 'ohne Etage';
  const ton = unterbesetzt(a, a.fte) || a.moral < 65 || a.fluktuation > 0.08 ? 'engpass' : '';

  let h = K.bereich('zentrale', 'zentrale') + G4;
  h += K.sprecher({ text: '<b>' + esc(spruch(a, a.fte, kap)) + '</b>', unter: (leitung?.name ?? 'Leitung unbesetzt') + ' · ' + (team?.name ?? 'Bereichsleitung'),
    person: leitung?.portraet ? portraetSVG(leitung.portraet, 72) : '', ton });
  const bild = wahl && etagenBild ? etagenBild(wahl.gebaeude.id, wahl.etage.nr) : null;
  if (bild) h += kopfbild(bild, 'Etagenschnitt ' + gName + ', ' + etText) + bildzeile(gName + ' · ' + etText);

  let r = '';
  const bedarf = a.sollFte > 0 ? a.sollFte : null;
  r += K.gross([
    { label: 'Beschäftigte', wert: fmt.format(Math.round(a.fte)) + ' FTE', ton: unterbesetzt(a, a.fte) ? 'schlecht' : '',
      unter: bedarf ? `<span class="${unterbesetzt(a, a.fte) ? 'hw-schlecht' : ''}">Bedarf Stufe ${a.stufe}: ${fmt.format(Math.round(bedarf))} FTE</span>` : 'Stufe ' + a.stufe },
    { label: 'Personalkosten je Woche', wert: geld(a.kostenWoche), unter: Math.round(st * 100) + ' % des Gehaltsstandards' },
  ]);
  if (!wahl) r += K.leer('Kein Büro zugewiesen. Unten unter Arbeitsplatz eine gemietete Etage wählen.', 'Ohne Arbeitsplatz');
  r += K.abschnitt('Arbeitsplätze');
  r += K.liste([
    // Q35: eine Quelle (Engine abteilungPlaetze). Platz im Gebäude = eigene Plätze plus freie Fläche, 14 qm je FTE.
    K.zeile({ was: 'Platz im Gebäude', unter: (etagenAnzahl > 1 ? fmt.format(Math.round(a.fte)) + ' FTE auf ' + etagenAnzahl + ' Etagen, ' : '') + 'inkl. freier Fläche, 14 qm je FTE', wert: fmt.format(kap) }),
    ...(wahl ? [K.zeile({ was: 'Auf dieser Etage belegt', unter: esc(gName) + ' · ' + etText + (ohnePlatz ? ' · ' + fmt.format(ohnePlatz) + ' ohne Arbeitsplatz' : ''), wert: fmt.format(fteEtage) + ' von ' + fmt.format(kapEtage) })] : []),
  ]);
  if (raeume.length > 1) {
    r += K.abschnitt('Etagen der Abteilung', `${raeume.length} Etagen`);
    r += K.liste(raeume.map((q) => { const z = (a.plaetze ?? []).find((x) => x.gebaeudeId === q.gebaeude.id && x.etage === q.etage.nr);
      return K.zeile({ was: etageName(q.etage.nr), unter: esc(q.gebaeude.name), wert: z ? fmt.format(z.fte) + ' FTE' : '', wertUnter: z ? fmt.format(z.plaetze) + ' Plätze' : '',
        tippbar: true, attr: `${klick('abteilungEtage', id, q.gebaeude.id, q.etage.nr)}${q === wahl ? ' aria-current="true"' : ''} aria-label="${esc(etageName(q.etage.nr))} im Bild zeigen"` }); }));
  }

  // Personal und Vergütung: große Stepper wie das Jahresgehalt in Coffee 28
  r += K.abschnitt('Personal und Vergütung');
  const fteMinus = Math.max(1, Math.round(a.fte) - 5), ftePlus = Math.min(kap, Math.round(a.fte) + 5);
  r += `<div class="hw-felder" data-q15-fte="${a.fte}" data-q15-gehalt="${st}">`
    + K.feld('Besetzung', K.stepper({ wert: fmt.format(Math.round(a.fte)) + ' FTE', unter: 'Platz für ' + fmt.format(kap), label: 'Besetzung der Abteilung',
      attrMinus: klick('fte', a.id, fteMinus), attrPlus: klick('fte', a.id, ftePlus), minusAus: Math.round(a.fte) <= 1, plusAus: Math.round(a.fte) >= kap }))
    + K.feld('Gehaltsniveau', K.stepper({ wert: Math.round(st * 100) + ' %', unter: 'des Standards', label: 'Gehaltsniveau der Abteilung',
      attrMinus: klick('gehalt', a.id, Math.round(st * 100) - 5), attrPlus: klick('gehalt', a.id, Math.round(st * 100) + 5), minusAus: st * 100 <= 80.5, plusAus: st * 100 >= 119.5 }))
    + '</div>';
  r += `<p class="hw-lese hw-leise hw-unterzeile">Schritt 5 FTE. Einstellen braucht freie Bürofläche und Einarbeitung, Abbau kostet Abfindungen.</p>`;
  r += `<div class="hw-skalen">${K.skala('Moral', a.moral)}</div>`;
  r += K.liste([
    K.zeile({ was: 'Fluktuationsrisiko', wert: prozent(a.fluktuation) + ' p. a.', ton: a.fluktuation > 0.08 ? 'schlecht' : '' }),
    K.zeile({ was: 'Qualitätsfaktor', wert: prozent(a.qualitaet) }),
  ]);
  r += K.abschnitt('Ausbaustufe', 'wirkt auf die Fachbereiche');
  r += K.seg([0, 1, 2, 3].map((n) => [n, 'Stufe ' + n]), a.stufe, (n) => klick('stufe', a.id, n));
  r += a.wirkung ? `<p class="hw-lese hw-leise hw-unterzeile">${esc(a.wirkung)}</p>` : '';

  r += K.abschnitt('Stimmen aus dem Team');
  r += K.liste(stimmungsTexte(a, a.fte).map((satz, i) => `<div class="hw-zeile">${figurKlein(portraetSVG(zufallsMerkmale(a.id + ':stimme:' + i), 56))}<span class="hw-was">„${esc(satz)}“</span></div>`));

  // Leitung: Personenblock wie Coffee 28
  r += K.abschnitt('Leitung', team?.name ?? 'Bereichsleitung');
  if (leitung) {
    r += `<div class="hw-person"><div class="hw-portraet hw-kontur">${portraetSVG(leitung.portraet ?? zufallsMerkmale(a.id), 104)}</div><div class="hw-person-daten"><h3 class="hw-person-name">${esc(leitung.name)}</h3>`
      + `<span class="hw-marke">Fähigkeiten</span>${K.skala('Fachwissen', leitung.qualitaet * 100)}${K.skala('Stimmung', leitung.stimmung)}</div></div>`;
  } else r += K.leer('Die Leitungsstelle ist frei. Die Abteilung arbeitet ohne Führung schwächer.', 'Leitung unbesetzt');
  r += K.knoepfe(K.knopf('Leitung und Kandidaten in der Organisation', klick('organisation'), 'zweit breit'));

  r += K.abschnitt('Delegation je Aufgabe');
  if (!teams.length) r += K.leer('Für diese Abteilung sind keine Einzelaufgaben hinterlegt.');
  for (const bereich of teams) {
    if (teams.length > 1) r += `<p class="hw-marke hw-gruppe">${esc(bereich.name)} · ${bereich.aufgaben?.length ?? 0} Aufgaben</p>`;
    r += (bereich.aufgaben ?? []).map((aufgabe) => K.schalter({ text: aufgabe.name,
      unter: aufgabe.grenze === undefined ? (aufgabe.an ? 'delegiert' : 'entscheidest du') : 'Grenze ' + geld(aufgabe.grenze) + (aufgabe.an ? ' · delegiert' : ' · entscheidest du'),
      an: !!aufgabe.an, attr: klick('aufgabe', bereich.id, aufgabe.id, !aufgabe.an) })).join('');
  }

  // Arbeitsplatz wählen (früher Auswahlfeld in der Übersicht)
  const ort = a.gebaeudeId ? `${a.gebaeudeId}|${a.etage}` : '';
  const alleZiele = (u.gebaeude ?? []).flatMap((g) => g.etagen.filter((e) => e.gemietet && !e.archiv).map((e) => ({ v: `${g.id}|${e.nr}`, g, e, frei: Math.max(0, e.qm - e.belegtQm) })));
  // Nur der jetzige Platz und die fünf Etagen mit dem meisten freien Platz (sonst 40 Zeilen bei Hochhäusern).
  const ziele = [...alleZiele.filter((z) => z.v === ort), ...alleZiele.filter((z) => z.v !== ort).sort((x, y) => y.frei - x.frei).slice(0, 5)];
  r += K.abschnitt('Umzug', 'meiste freie Fläche');
  r += K.liste(ziele.map((z) => K.zeile({ was: `${esc(z.g.name)} · ${etageKurz(z.e.nr)}`, unter: fmt.format(z.frei) + ' qm frei',
    wert: z.v === ort ? 'hier' : '', ton: z.v === ort ? 'gut' : '', tippbar: z.v !== ort, attr: z.v === ort ? '' : klick('setzen', a.id, z.v) })));

  // Weitere Abteilungen je Gebäude
  const gruppen = (u.gebaeude ?? []).map((g) => ({ name: g.name, ids: REIHENFOLGE.filter((x) => x !== id && (u.abteilungen ?? []).some((b) => b.id === x && b.gebaeudeId === g.id)) })).filter((g) => g.ids.length);
  const ohneBuero = REIHENFOLGE.filter((x) => x !== id && (u.abteilungen ?? []).some((b) => b.id === x && !b.gebaeudeId));
  if (ohneBuero.length) gruppen.push({ name: 'Ohne zugewiesenes Büro', ids: ohneBuero });
  r += K.abschnitt('Weitere Abteilungen');
  for (const g of gruppen) {
    r += `<p class="hw-marke hw-gruppe">${esc(g.name)}</p>` + K.liste(g.ids.map((x) => { const b = u.abteilungen.find((y) => y.id === x);
      return K.zeile({ was: esc(TITEL[x] ?? b.name), wert: fmt.format(Math.round(b.fte)) + ' FTE', tippbar: true, attr: klick('abteilung', x) }); }));
  }
  h += K.rumpf(r) + zentraleReiter('zentrale');
  return { titel: a.name, unter: (a.stadt ?? u.sitz) + ' · ' + etText, html: h };
}

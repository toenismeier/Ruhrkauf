// Q15: eigenständige HQ-Abteilungsseiten. Keine Berechnung der Wirtschaftskennzahlen im UI.
// Die isometrische Etage ist eine skalierbare SVG-Szene und erzeugt 0 WebGL-Draw-Calls.
import { esc, geld, fmt } from './format.js';
import * as K from './komponenten.js';
import { portraetSVG, zufallsMerkmale } from '../kit/portraet.js';

const TITEL = {
  controlling: 'Finanzen', personal: 'Personal', einkauf: 'Einkauf', marketing: 'Marketing',
  ecommerce: 'IT & E-Commerce', recht: 'Recht', immobilien: 'Immobilien',
  logistik: 'Logistik', vm: 'Visual Merchandising', verwaltung: 'Verwaltung',
  produkt: 'Produktentwicklung',
};
const REIHENFOLGE = ['controlling', 'personal', 'einkauf', 'marketing', 'ecommerce',
  'logistik', 'immobilien', 'recht', 'vm', 'verwaltung', 'produkt'];
const prozent = (q) => Math.round(q * 100) + ' %';
const etageName = (n) => n === 0 ? 'Erdgeschoss' : n + '. Etage';

function iso(x, y, schritt) {
  return [180 + (x - y) * schritt, 24 + (x + y) * schritt * 0.52];
}
function punkt(x, y) { return x.toFixed(1) + ',' + y.toFixed(1); }
function polygon(ecken, farbe, linie = '#AAB6B9') {
  return '<polygon points="' + ecken.map((p) => punkt(...p)).join(' ') +
    '" fill="' + farbe + '" stroke="' + linie + '" stroke-width=".8"/>';
}
/** Jedes tatsächliche FTE der gewählten Etage erhält genau eine sitzende Figur. */
export function abteilungsEtageSvg(ist, kapazitaet, name) {
  const besetzt = Math.max(0, Math.floor(ist));
  const plaetze = Math.max(1, Math.ceil(kapazitaet), besetzt);
  const spalten = Math.ceil(Math.sqrt(plaetze * 1.25));
  const reihen = Math.ceil(plaetze / spalten);
  const schritt = Math.min(17, 156 / Math.max(spalten, reihen));
  const p = (x, y) => iso(x, y, schritt);
  let svg = '<svg class="q15-etagenbild" role="img" aria-label="' + esc(name) +
    ': isometrische Büroetage mit ' + besetzt + ' besetzten und ' +
    (plaetze - besetzt) + ' freien Arbeitsplätzen" viewBox="0 0 360 225" xmlns="http://www.w3.org/2000/svg">';
  const basis = [p(0, 0), p(spalten + .2, 0), p(spalten + .2, reihen + .2), p(0, reihen + .2)];
  svg += '<path d="M' + basis.map((q) => punkt(...q)).join('L') + 'Z" fill="#3b4b54" stroke="#5a6c76" stroke-width="2"/>';
  // Gläserne Besprechungsräume, ohne Arbeitsplätze verdecken.
  svg += polygon([p(.1, .1), p(spalten * .34, .1), p(spalten * .34, .45), p(.1, .45)], '#DDE9E9', '#849A9B');
  svg += polygon([p(spalten * .64, .1), p(spalten - .1, .1), p(spalten - .1, .45), p(spalten * .64, .45)], '#E6EEEE', '#849A9B');
  for (let i = 0; i < plaetze; i++) {
    const x = (i % spalten) + .14, y = Math.floor(i / spalten) + .17;
    const e = [p(x, y), p(x + .7, y), p(x + .7, y + .52), p(x, y + .52)];
    svg += polygon(e, '#F3E8D9', '#B49A7C');
    const sitz = p(x + .44, y + .77), oben = p(x + .44, y + .49);
    svg += '<ellipse cx="' + sitz[0].toFixed(1) + '" cy="' + sitz[1].toFixed(1) +
      '" rx="' + (schritt * .23).toFixed(1) + '" ry="' + (schritt * .15).toFixed(1) +
      '" fill="#A6AEB2"/>';
    if (i < besetzt) {
      const farben = ['#426576', '#9A7066', '#5D7771', '#746F92'];
      const farbe = farben[i % farben.length];
      svg += '<path d="M' + punkt(...sitz) + 'L' + punkt(...oben) +
        '" stroke="' + farbe + '" stroke-width="' + Math.max(2, schritt * .34).toFixed(1) +
        '" stroke-linecap="round"/>';
      svg += '<circle cx="' + oben[0].toFixed(1) + '" cy="' + oben[1].toFixed(1) +
        '" r="' + Math.max(1.3, schritt * .19).toFixed(1) + '" fill="#DDB69D" stroke="#8E7261" stroke-width=".4"/>';
    }
  }
  // Pflanzen am Eingang; Farbgebung aus dem neutralen Q14-Gestaltungssystem.
  for (const [x, y] of [[.1, reihen - .1], [spalten - .1, reihen - .1]]) {
    const t = p(x, y);
    svg += '<rect x="' + (t[0] - 2).toFixed(1) + '" y="' + (t[1] - 1).toFixed(1) +
      '" width="4" height="5" fill="#90765E"/><circle cx="' + t[0].toFixed(1) +
      '" cy="' + (t[1] - 4).toFixed(1) + '" r="4" fill="#56806E"/>';
  }
  return svg + '</svg>';
}
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
function stimmungsTexte(a, fte, kap) {
  return [
    a.gehaltFaktor < 1 ? 'Ich wünsche mir ein höheres Gehalt.' : 'Das Gehalt ist für mich in Ordnung.',
    a.moral >= 70 ? 'Unser Team erreicht seine Ziele.' : 'Die Stimmung ist angespannt.',
    a.fluktuation > .08 ? 'Ich sehe mich nach einer anderen Stelle um.' : 'Ich möchte bleiben.',
    unterbesetzt(a, fte) ? 'Die Arbeit ist kaum zu schaffen.' : ueberbesetzt(a, fte) ? 'Mir fehlt manchmal eine richtige Aufgabe.' : 'Die Aufgaben sind gut verteilt.',
  ];
}
/** Reine Projektion der Engine-Abfragen. Auswahl ist eine bereits vorhandene HQ-Abteilung.
 *  Q32: dunkler Zentrale-Look mit Q30-Bausteinen (Sprecher, Kopfbild, Großkennzahlen, Liste, Segmente, Schalter);
 *  Kopfbild ist dieselbe isometrische Etage wie im Zentrale-Blatt (etagenBild), Personen sind Kit-Porträts.
 *  Hauptfrage: „Ist diese Abteilung richtig besetzt, und was kostet sie?“ */
export function zentraleAbteilungHtml(u, grafik, organisation, id, etageWahl, etagenBild = null) {
  const a = (u.abteilungen ?? []).find((x) => x.id === id);
  if (!a) return { titel: 'Abteilung nicht gefunden', unter: '', html: K.bereich('zentrale') + K.rumpf(K.leer('Diese Abteilung ist nicht verfügbar.')) };
  const teams = (organisation?.bereiche ?? []).filter((b) => b.abteilung === a.id);
  const team = teams.find((b) => b.stelle?.person) ?? teams[0];
  const leitung = team?.stelle?.person;
  const raeume = (grafik?.gebaeude ?? []).flatMap((g) => (g.etagen ?? [])
    .filter((e) => e.gemietet && e.abteilungen.some((b) => b.id === id))
    .map((e) => ({ gebaeude: g, etage: e, zugewiesen: e.abteilungen.find((b) => b.id === id) })));
  const wahl = raeume.find((q) => q.gebaeude.id === etageWahl?.g && q.etage.nr === etageWahl?.nr) ??
    raeume.find((q) => q.gebaeude.id === a.gebaeudeId && q.etage.nr === a.etage) ?? raeume[0];
  const geb = (u.gebaeude ?? []).find((g) => g.id === wahl?.gebaeude.id);
  const ue = geb?.etagen.find((e) => e.nr === wahl?.etage.nr);
  const fteEtage = wahl?.zugewiesen?.fte ?? 0;
  const freieQm = Math.max(0, (ue?.qm ?? 0) - (ue?.belegtQm ?? 0));
  const zugewiesenQm = ue?.abteilungen.find((x) => x.id === id)?.qm ?? 0;
  const kapEtage = wahl ? Math.max(fteEtage, Math.floor((zugewiesenQm + freieQm) / 14)) : 0;
  const kap = Math.max(a.fte, a.kapazitaetFte ?? a.fte);
  const st = a.gehaltFaktor ?? 1;
  const klick = (...x) => `onclick="hqKlick(${x.map((v) => `'${esc(String(v))}'`).join(',')})"`;
  const gName = geb?.name ?? wahl?.gebaeude.name ?? '';
  const etText = wahl ? etageName(wahl.etage.nr) : 'ohne Etage';
  const ton = unterbesetzt(a, a.fte) ? 'engpass' : a.moral < 65 || a.fluktuation > 0.08 ? 'engpass' : '';
  const leitungBild = leitung?.portraet ? portraetSVG(leitung.portraet, 72) : '';

  let h = K.bereich('zentrale', 'zentrale');
  h += K.sprecher({ text: '<b>' + esc(spruch(a, a.fte, kap)) + '</b>', unter: (leitung?.name ?? 'Leitung unbesetzt') + ' · ' + (team?.name ?? 'Bereichsleitung'), person: leitungBild, ton });
  const bild = wahl && etagenBild ? etagenBild(wahl.gebaeude.id, wahl.etage.nr) : null;
  if (bild) h += '<div class="hk-kopfbild schnitt"><img src="' + bild + '" alt="Etagenschnitt ' + esc(gName) + ', ' + esc(etText) + '"><span class="hk-bildtitel">' + esc(gName) + ' · ' + esc(etText) + '</span></div>';
  else if (wahl) h += '<div class="hk-kopfbild schnitt">' + abteilungsEtageSvg(fteEtage, kapEtage, a.name) + '<span class="hk-bildtitel">' + esc(gName) + ' · ' + esc(etText) + '</span></div>';

  let r = '<button class="zurueck" type="button" ' + klick('uebersicht') + '>‹ Zentrale</button>';
  const bedarf = a.sollFte > 0 ? a.sollFte : null;
  r += K.gross([
    { label: 'Beschäftigte', wert: fmt.format(Math.round(a.fte)) + ' FTE', ton: unterbesetzt(a, a.fte) ? 'schlecht' : '',
      unter: bedarf ? (unterbesetzt(a, a.fte) ? '<span class="schlecht">' : '<span>') + 'Bedarf Stufe ' + a.stufe + ': ' + fmt.format(Math.round(bedarf)) + ' FTE</span>' : 'Stufe ' + a.stufe },
    { label: 'Personalkosten je Woche', wert: geld(a.kostenWoche), unter: Math.round(st * 100) + ' % des Gehaltsstandards' },
  ]);
  if (!wahl) r += K.leer('Kein Büro zugewiesen. In der Zentrale eine gemietete Etage wählen.', 'Ohne Arbeitsplatz', '<button type="button" class="hk-knopf zweit" ' + klick('uebersicht') + '>Zur Zentrale</button>');
  r += K.liste([
    K.zeile({ was: 'Arbeitsplätze der Abteilung', unter: 'alle zugewiesenen Etagen, 14 qm je FTE', wert: fmt.format(kap) }),
    ...(wahl ? [K.zeile({ was: 'Auf dieser Etage', unter: esc(gName) + ' · ' + etText, wert: fmt.format(fteEtage) + ' von ' + fmt.format(kapEtage) })] : []),
  ]);
  if (raeume.length > 1) r += '<div class="hk-seg q32-etagen" role="group" aria-label="Etage auswählen">' + raeume.map((q) =>
    '<button type="button" aria-pressed="' + (q === wahl) + '" ' + klick('abteilungEtage', id, q.gebaeude.id, q.etage.nr) + '>' + esc(etageName(q.etage.nr)) + '</button>').join('') + '</div>';

  r += K.abschnitt('Personal und Vergütung');
  r += '<div class="q32-regler"><div><span>Besetzung</span><b>' + fmt.format(a.fte) + ' von ' + fmt.format(kap) + ' FTE</b></div><input type="range" aria-label="Besetzung der Abteilung" min="1" max="' + kap + '" step="1" value="' + a.fte +
    '" onchange="hqKlick(\'fte\',\'' + esc(a.id) + '\',this.value)" data-q15-fte="' + a.fte + '"><small>Einstellen braucht freie Bürofläche und Einarbeitung, Abbau kostet Abfindungen.</small></div>';
  r += '<div class="q32-regler"><div><span>Gehaltsniveau</span><b>' + Math.round(st * 100) + ' % des Standards</b></div><input type="range" aria-label="Gehaltsniveau der Abteilung" min="80" max="120" step="5" value="' +
    Math.round(st * 100) + '" onchange="hqKlick(\'gehalt\',\'' + esc(a.id) + '\',this.value)" data-q15-gehalt="' + st + '"></div>';
  r += K.liste([
    K.zeile({ was: 'Moral', wert: a.moral + ' / 100', ton: a.moral < 65 ? 'schlecht' : '' }),
    K.zeile({ was: 'Fluktuationsrisiko', wert: prozent(a.fluktuation) + ' p. a.', ton: a.fluktuation > 0.08 ? 'schlecht' : '' }),
    K.zeile({ was: 'Qualitätsfaktor', wert: prozent(a.qualitaet) }),
  ]);
  r += K.abschnitt('Ausbaustufe', 'wirkt auf die Fachbereiche');
  r += K.seg([0, 1, 2, 3].map((n) => [n, 'Stufe ' + n]), a.stufe, (n) => klick('stufe', a.id, n));

  r += K.abschnitt('Stimmen aus dem Team');
  r += '<div class="q32-stimmen">' + stimmungsTexte(a, a.fte, kap).map((satz, i) =>
    '<div class="q32-stimme"><span class="q32-figur" aria-hidden="true">' + portraetSVG(zufallsMerkmale(a.id + ':stimme:' + i), 56) + '</span><p>„' + esc(satz) + '“</p></div>').join('') + '</div>';

  r += K.abschnitt('Leitung');
  if (leitung) {
    r += '<div class="hk-person-karte"><span class="hk-portraet">' + portraetSVG(leitung.portraet ?? zufallsMerkmale(a.id), 104) + '</span><div><b>' + esc(leitung.name) + '</b><small>' + esc(team?.name ?? 'Bereichsleitung') + '</small></div></div>';
    r += '<div class="q32-skalen">' + K.skala('Fachwissen', leitung.qualitaet * 100) + K.skala('Stimmung', leitung.stimmung) + '</div>';
  } else r += K.leer('Die Leitungsstelle ist frei. Die Abteilung arbeitet ohne Führung schwächer.', 'Leitung unbesetzt');
  r += '<div class="hk-knopfreihe"><button type="button" class="hk-knopf zweit breit" ' + klick('organisation') + '>Leitung und Kandidaten in Organisation</button></div>';

  r += K.abschnitt('Delegation je Aufgabe');
  if (!teams.length) r += K.leer('Für diese Abteilung sind keine Einzelaufgaben hinterlegt.');
  for (const bereich of teams) {
    r += '<div class="hk-liste q32-delegation"><div class="hk-zeile"><span class="hk-was"><b>' + esc(bereich.name) + '</b></span><span class="hk-wert">' + (bereich.aufgaben?.length ?? 0) + ' Aufgaben</span></div>';
    for (const aufgabe of bereich.aufgaben ?? []) {
      r += K.schalter({ text: aufgabe.name, unter: aufgabe.grenze === undefined ? (aufgabe.an ? 'delegiert' : 'entscheidest du') : 'Grenze ' + geld(aufgabe.grenze) + (aufgabe.an ? ' · delegiert' : ' · entscheidest du'),
        an: !!aufgabe.an, attr: 'onclick="hqKlick(\'aufgabe\',\'' + esc(bereich.id) + '\',\'' + esc(aufgabe.id) + '\',\'' + (!aufgabe.an) + '\')"' });
    }
    r += '</div>';
  }

  const gebaeudeGruppen = (u.gebaeude ?? []).map((g) => ({
    name: g.name,
    ids: REIHENFOLGE.filter((id0) => (u.abteilungen ?? []).some((x) => x.id === id0 && x.gebaeudeId === g.id)),
  })).filter((g) => g.ids.length);
  const ohneBuero = REIHENFOLGE.filter((id0) => (u.abteilungen ?? []).some((x) => x.id === id0 && !x.gebaeudeId));
  if (ohneBuero.length) gebaeudeGruppen.push({ name: 'Ohne zugewiesenes Büro', ids: ohneBuero });
  r += K.abschnitt('Weitere Abteilungen');
  for (const gruppe of gebaeudeGruppen) {
    r += '<div class="q32-navtitel">' + esc(gruppe.name) + '</div><div class="hk-seg q32-nav" role="group" aria-label="Abteilungen in ' + esc(gruppe.name) + '">';
    for (const id0 of gruppe.ids) r += '<button type="button" aria-pressed="' + (id0 === id) + '"' + (id0 === id ? ' aria-current="page"' : '') + ' ' + klick('abteilung', id0) + '>' + TITEL[id0] + '</button>';
    r += '</div>';
  }
  h += K.rumpf(r);
  return { titel: a.name, unter: (a.stadt ?? u.sitz) + ' · ' + etText, html: h };
}

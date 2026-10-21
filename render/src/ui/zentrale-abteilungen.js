// Q15: eigenständige HQ-Abteilungsseiten. Keine Berechnung der Wirtschaftskennzahlen im UI.
// Die isometrische Etage ist eine skalierbare SVG-Szene und erzeugt 0 WebGL-Draw-Calls.
import { esc, geld, fmt } from './format.js';

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
const balken = (label, wert) => '<div class="q15-balken"><div><span>' + esc(label) +
  '</span><b>' + Math.round(wert) + ' / 100</b></div><div class="q15-balken-bahn"><i style="width:' +
  Math.min(100, Math.max(0, wert)) + '%"></i></div></div>';

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
  svg += '<path d="M' + basis.map((q) => punkt(...q)).join('L') + 'Z" fill="#D7D4CA" stroke="#8D979B" stroke-width="2"/>';
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
function spruch(a, fte, kap) {
  if (fte < kap * .65) return 'Uns fehlen Kolleginnen und Kollegen. Wir müssen offene Stellen besetzen.';
  if (a.einarbeitungBis) return 'Neue Kolleginnen und Kollegen werden eingearbeitet.';
  if (a.moral < 65) return 'Die Gehälter belasten die Stimmung im Team.';
  if (fte >= kap) return 'Unsere Plätze sind voll. Für weitere Einstellungen brauchen wir Raum.';
  return 'Die Aufgaben sind verteilt. Wir arbeiten an den Zielen.';
}
function stimmungsTexte(a, fte, kap) {
  return [
    a.gehaltFaktor < 1 ? 'Ich wünsche mir ein höheres Gehalt.' : 'Das Gehalt ist für mich in Ordnung.',
    a.moral >= 70 ? 'Unser Team erreicht seine Ziele.' : 'Die Stimmung ist angespannt.',
    a.fluktuation > .08 ? 'Ich sehe mich nach einer anderen Stelle um.' : 'Ich möchte bleiben.',
    fte < kap * .65 ? 'Die Arbeit ist kaum zu schaffen.' : 'Die Aufgaben sind gut verteilt.',
  ];
}
/** Reine Projektion der Engine-Abfragen. Auswahl ist eine bereits vorhandene HQ-Abteilung. */
export function zentraleAbteilungHtml(u, grafik, organisation, id, etageWahl) {
  const a = (u.abteilungen ?? []).find((x) => x.id === id);
  if (!a) return { titel: 'Abteilung nicht gefunden', unter: '', html: '<p>Diese Abteilung ist nicht verfügbar.</p>' };
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
  const stufeWahl = '<div class="q15-stufe" aria-label="Abteilungsstufe"><span>Ausbau:</span>' +
    [0, 1, 2, 3].map((n) => '<button type="button" class="' + (n === a.stufe ? 'an' : '') +
      '" onclick="hqKlick(\'stufe\',\'' + esc(a.id) + '\',\'' + n +
      '\')" aria-pressed="' + (n === a.stufe) + '">' + n + '</button>').join('') + '</div>';
  let h = '<div class="q15-seite"><button class="q15-zurueck" type="button" onclick="hqKlick(\'uebersicht\')">‹ Zentrale und Gebäude</button>';
  h += '<section class="q15-kopf"><div><span class="q15-meta">' + esc(a.stadt ?? u.sitz) +
    ' · ' + esc(wahl ? etageName(wahl.etage.nr) : 'ohne Etage') + '</span><h2>' + esc(a.name) +
    '</h2></div><b class="q15-zaehler">' + fmt.format(Math.round(a.fte)) + ' / ' + fmt.format(kap) +
    '<small>FTE / Arbeitsplätze</small></b></section>';
  h += '<section class="q15-szene"><div class="q15-szenekopf"><b>' + esc(geb?.name ?? 'Noch keine gemietete Etage') +
    '</b><small>' + (wahl ? esc(etageName(wahl.etage.nr)) + ' · ' + fteEtage + ' / ' + kapEtage + ' Plätze' : 'Erst Arbeitsplätze zuweisen') +
    '</small></div>' + (wahl ? abteilungsEtageSvg(fteEtage, kapEtage, a.name) :
    '<div class="q15-leer">Kein Büro zugewiesen. Wählen Sie einen Standort in der Zentralenübersicht.</div>') + '</section>';
  if (raeume.length > 1) h += '<nav class="q15-etagenwahl" aria-label="Etage auswählen">' + raeume.map((q) =>
    '<button type="button" class="' + (q === wahl ? 'an' : '') +
    '" onclick="hqKlick(\'abteilungEtage\',\'' + esc(id) + '\',\'' + esc(q.gebaeude.id) +
    '\',\'' + q.etage.nr + '\')">' + esc(etageName(q.etage.nr)) + '</button>').join('') + '</nav>';
  h += '<section class="q15-leitung"><div class="q15-portrait" aria-hidden="true">' +
    (leitung ? esc(leitung.name.split(' ').map((w) => w[0]).slice(0, 2).join('')) : '–') +
    '</div><div><small>' + esc(team?.name ?? 'Bereichsleitung') + '</small><b>' +
    esc(leitung?.name ?? 'Leitung unbesetzt') + '</b><p>„' + esc(spruch(a, a.fte, kap)) + '“</p></div></section>';
  h += '<section class="q15-steuerung"><h3>Personal und Vergütung</h3><div class="q15-reglerkopf"><b>Besetzung</b><b>' +
    a.fte + ' / ' + kap + ' FTE</b></div><input type="range" aria-label="Besetzung der Abteilung" ' +
    'min="1" max="' + kap + '" step="1" value="' + a.fte +
    '" onchange="hqKlick(\'fte\',\'' + esc(a.id) + '\',this.value)"' +
    ' data-q15-fte="' + a.fte + '"><small>Zusätzliche Einstellungen benötigen freie Bürofläche und Einarbeitung. Stellenabbau verursacht Abfindungen.</small>';
  h += '<div class="q15-reglerkopf"><b>Gehaltsniveau</b><b>' + Math.round(st * 100) +
    ' % des Standards</b></div><input type="range" aria-label="Gehaltsniveau der Abteilung" min="80" max="120" step="5" value="' +
    Math.round(st * 100) + '" onchange="hqKlick(\'gehalt\',\'' + esc(a.id) +
    '\',this.value)" data-q15-gehalt="' + st +
    '"><div class="q15-werte"><span>Moral <b>' + a.moral + ' / 100</b></span><span>Fluktuationsrisiko <b>' +
    prozent(a.fluktuation) + ' p. a.</b></span><span>Qualitätsfaktor <b>' + prozent(a.qualitaet) +
    '</b></span></div>' + stufeWahl + '<div class="q15-hinweis">Personalkosten je Woche: <b>' +
    geld(a.kostenWoche) + '</b></div></section>';
  h += '<section class="q15-team"><h3>Stimmen aus dem Team</h3><div class="q15-stimmen">' +
    stimmungsTexte(a, a.fte, kap).map((satz) => '<div class="q15-stimme"><span class="q15-avatar" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<circle cx="12" cy="7.5" r="3"/><path d="M5.5 21v-4c0-3.5 2.5-5.5 6.5-5.5s6.5 2 6.5 5.5v4"/></svg>' +
      '</span><p>' + esc(satz) + '</p></div>').join('') + '</div></section>';
  h += '<section class="q15-fuehrung"><h3>Leitung</h3>' + (leitung ?
    balken('Fachliche Kompetenz', leitung.qualitaet * 100) + balken('Stimmung', leitung.stimmung) :
    '<p>Die Leitungsstelle ist vakant. Besetzen Sie diese über Organisation.</p>') +
    '<button type="button" class="q15-sekundaer" onclick="hqKlick(\'organisation\')">Leitung und Kandidaten in Organisation</button></section>';
  h += '<section class="q15-delegation"><h3>Delegation je Aufgabe</h3><small>Die Fachbereiche nutzen die bestehende Organisation (Q05).</small>';
  if (!teams.length) h += '<p>Keine Einzelaufgaben für diese Abteilung hinterlegt.</p>';
  for (const bereich of teams) {
    h += '<details><summary><b>' + esc(bereich.name) + '</b><span>' + (bereich.aufgaben?.length ?? 0) +
      ' Aufgaben</span></summary>';
    for (const aufgabe of bereich.aufgaben ?? []) {
      h += '<div class="q15-aufgabe"><span>' + esc(aufgabe.name) +
        (aufgabe.grenze === undefined ? '' : '<small>Grenze ' + geld(aufgabe.grenze) + '</small>') +
        '</span><button type="button" aria-pressed="' + !!aufgabe.an +
        '" onclick="hqKlick(\'aufgabe\',\'' + esc(bereich.id) + '\',\'' + esc(aufgabe.id) +
        '\',\'' + (!aufgabe.an) + '\')">' + (aufgabe.an ? 'Delegiert' : 'Beim CEO') +
        '</button></div>';
    }
    h += '</details>';
  }
  h += '</section><div class="q15-navgebaeude">';
  const gebaeudeGruppen = (u.gebaeude ?? []).map((g) => ({
    name: g.name,
    ids: REIHENFOLGE.filter((id0) => (u.abteilungen ?? []).some((x) => x.id === id0 && x.gebaeudeId === g.id)),
  })).filter((g) => g.ids.length);
  const ohneBuero = REIHENFOLGE.filter((id0) => (u.abteilungen ?? []).some((x) => x.id === id0 && !x.gebaeudeId));
  if (ohneBuero.length) gebaeudeGruppen.push({ name: 'Ohne zugewiesenes Büro', ids: ohneBuero });
  for (const gruppe of gebaeudeGruppen) {
    h += '<div class="q15-navtitel">' + esc(gruppe.name) + '</div>';
    h += '<nav class="q15-navigation" aria-label="Abteilungen in ' + esc(gruppe.name) + '">';
    for (const id0 of gruppe.ids) {
      h += '<button type="button" class="' + (id0 === id ? 'an' : '') +
        '" aria-current="' + (id0 === id ? 'page' : 'false') +
        '" onclick="hqKlick(\\'abteilung\\',\\'' + id0 + '\\')">' + TITEL[id0] + '</button>';
    }
    h += '<button type="button" onclick="hqKlick(\\'uebersicht\\')">Etage hinzufügen</button></nav>';
  }
  h += '</div></div>';
  return { titel: a.name, unter: (a.stadt ?? u.sitz) + ' · ' + (wahl ? etageName(wahl.etage.nr) : 'ohne Etage'), html: h };
}

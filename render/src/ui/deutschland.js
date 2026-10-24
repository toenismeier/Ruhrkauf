// Eine gemeinsame Deutschlandkarte für Portfolio (#23) und Reise (Q23).
// Alle geografischen Daten sind lokal: Standorte aus der Engine, Bundesländer aus dem Katalog.
// E47: Darstellung im dunklen Blatt (Farben über hartwig.css, Abschnitt G5); Städte beschriftet, ohne Überlappung.
import { KOORDINATEN } from '../../../engine/src/standorte';
import { BUNDESLAENDER } from './deutschland-geometrie.js';

const NS = 'http://www.w3.org/2000/svg';
const element = (name, attrs = {}) => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};
const x = (lon) => 26 + ((lon - 5.5) / 9.8) * 304;
const y = (lat) => 514 - ((lat - 47.2) / 8.1) * 484;
export const AMPEL_FARBE = { gruen: '#4caf50', gelb: '#e0a526', rot: '#e0574c', ohne: '#8c9295' };
const GROSSE_STAEDTE = new Set(['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart',
  'Hannover', 'Leipzig', 'Dresden', 'Bremen', 'Düsseldorf', 'Essen']);

/** Die Schnittstelle des Deutschlandmoduls aus PR #23 bleibt erhalten. */
export function kartenStaedte(zeilen) {
  const gruppen = new Map();
  for (const haus of zeilen) {
    if (!gruppen.has(haus.stadt)) gruppen.set(haus.stadt, []);
    gruppen.get(haus.stadt).push(haus);
  }
  return [...gruppen.entries()].map(([stadt, hs]) => {
    const umsatz = hs.reduce((sum, h) => sum + (Number(h.umsatz) || 0), 0);
    const steuerbar = hs.filter((h) => h.steuerbar);
    const ebitda = steuerbar.reduce((sum, h) => sum + (Number(h.ebitda) || 0), 0);
    const amp = steuerbar.length ? (ebitda < 0 ? 'rot' : umsatz > 0 && ebitda / umsatz < 0.04 ? 'gelb' : 'gruen') : 'ohne';
    return { stadt, umsatz, ebitda, amp, anzahl: hs.length, koordinaten: KOORDINATEN[stadt] };
  }).sort((a, b) => a.stadt.localeCompare(b.stadt, 'de'));
}

/** Gemeinsamer SVG-Zeichner; keine voneinander abweichenden Reise-/Portfolio-Umrisse. */
function zeichneDeutschland(punkte, beiStadt, { aktuell = null, modus = 'portfolio' } = {}) {
  const svg = element('svg', {
    viewBox: '0 0 356 542', role: 'group',
    'aria-label': modus === 'reise' ? 'Deutschlandkarte mit auswählbaren Reisezielen' : 'Deutschlandkarte mit Städten und ihren Ergebnissen',
    class: 'hw-deutschland'
  });
  // Die sechzehn Bundesländer ergeben gemeinsam eine geografisch richtige Außengrenze.
  const land = element('g', { class: 'hw-dl-laender', 'aria-hidden': 'true' });
  for (const bundesland of BUNDESLAENDER) {
    land.append(element('path', { d: bundesland.d, class: 'hw-dl-land', 'stroke-width': '0.85', 'stroke-linejoin': 'round', 'fill-rule': 'evenodd' }));
  }
  svg.append(land);

  // Aktive Stadt zuletzt zeichnen; sie bleibt auch bei dichtem Ruhrgebietsnetz sichtbar.
  // Danach große Städte über kleinen Nachbarn (Berlin über Potsdam, Köln über Leverkusen), damit sie antippbar bleiben.
  const gewicht = (p) => (p.stadt === aktuell ? 1e6 : 0) + (GROSSE_STAEDTE.has(p.stadt) ? 1e3 : 0) + (p.anzahl ?? 0);
  const verfuegbar = punkte.filter((p) => Array.isArray(p.koordinaten) && p.koordinaten.length === 2)
    .sort((a, b) => gewicht(a) - gewicht(b) || a.stadt.localeCompare(b.stadt, 'de'));
  const radius = (p) => Math.min(9, Math.max(3.6,
    3.6 + Math.sqrt(Math.max(0, modus === 'reise' ? p.anzahl : p.umsatz / 1000000)) * (modus === 'reise' ? 0.9 : 0.6)));
  for (const punkt of verfuegbar) {
    const [lat, lon] = punkt.koordinaten, cx = x(lon), cy = y(lat);
    const aktiv = punkt.stadt === aktuell, r = radius(punkt);
    const name = punkt.stadt;
    const g = element('g', { tabindex: '0', role: 'button', 'data-stadt': name,
      class: 'hw-dl-stadt' + (aktiv ? ' hw-dl-aktuell' : ''),
      'aria-label': name + ', ' + punkt.anzahl + ' ' + (punkt.anzahl === 1 ? 'Haus' : 'Häuser') + (aktiv ? ', aktueller Standort' : '') });
    const title = element('title');
    title.textContent = name + ' · ' + punkt.anzahl + ' Häuser' + (aktiv ? ' · aktuell' : '');
    g.append(title);
    // Große transparente Zeigerfläche; die alphabetische Reiseliste ist der barrierearme Alternativzugang.
    // Zeigerfläche großer Städte 21, kleiner Städte 12 Einheiten: dichte Gebiete bleiben einzeln antippbar.
    g.append(element('circle', { cx, cy, r: GROSSE_STAEDTE.has(name) || aktiv ? 21 : 12, fill: 'transparent', stroke: 'none' }));
    if (aktiv) g.append(element('circle', { cx, cy, r: r + 5, class: 'hw-dl-ring', 'stroke-width': '2', 'pointer-events': 'none' }));
    g.append(element('circle', { cx, cy, r, class: 'hw-dl-punkt' + (aktiv ? ' an' : ''),
      fill: aktiv ? '#5fa8bf' : modus === 'reise' ? '#e5e1db' : AMPEL_FARBE[punkt.amp] ?? AMPEL_FARBE.ohne,
      'stroke-width': '1.3', 'pointer-events': 'none' }));
    g.addEventListener('click', () => beiStadt(name));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); beiStadt(name); }
    });
    svg.append(g);
  }

  // Ortsnamen: aktueller Standort, Metropolen, dann nach Gewicht, solange sie sich nicht überdecken.
  // Die Reise beschriftet alle Städte, für die Platz ist; das Portfolio bleibt bei den großen Namen.
  // Alle Punkte gelten vorab als belegte Fläche, damit Namen keine Nachbarpunkte verdecken.
  // Große Namen müssen nur anderen Namen ausweichen, kleine Namen auch den Punkten.
  const punktKasten = verfuegbar.map((p) => { const r = radius(p), px = x(p.koordinaten[1]), py = y(p.koordinaten[0]); return { x0: px - r, x1: px + r, y0: py - r, y1: py + r }; });
  const kasten = [];
  const trifft = (k, liste) => liste.some((b) => k.x0 < b.x1 && k.x1 > b.x0 && k.y0 < b.y1 && k.y1 > b.y0);
  const frei = (k, gross) => !trifft(k, kasten) && (gross || !trifft(k, punktKasten));
  const reihenfolge = [...verfuegbar].sort((a, b) => Number(b.stadt === aktuell) - Number(a.stadt === aktuell) || Number(GROSSE_STAEDTE.has(b.stadt)) - Number(GROSSE_STAEDTE.has(a.stadt)) || gewicht(b) - gewicht(a));
  for (const punkt of reihenfolge) {
    const gross = punkt.stadt === aktuell || GROSSE_STAEDTE.has(punkt.stadt);
    if (!gross && modus !== 'reise') continue;
    const [lat, lon] = punkt.koordinaten, px = x(lon), py = y(lat), r = radius(punkt);
    const fs = gross ? 11 : 9.5, breite = punkt.stadt.length * fs * 0.56;
    // Rechts, links, darüber, darunter: erste freie Lage gewinnt.
    const lagen = [[px + r + 3, py + fs * 0.35, 'start'], [px - r - 3, py + fs * 0.35, 'end'], [px, py - r - 3, 'middle'], [px, py + r + fs, 'middle']];
    for (const [tx, ty, anker] of lagen) {
      const x0 = anker === 'start' ? tx : anker === 'end' ? tx - breite : tx - breite / 2;
      const k = { x0: x0 - 1, x1: x0 + breite + 1, y0: ty - fs * 0.85, y1: ty + fs * 0.25 };
      if (k.x0 < 0 || k.x1 > 356 || !frei(k, gross)) continue;
      kasten.push(k);
      const lbl = element('text', { x: tx.toFixed(1), y: ty.toFixed(1), 'font-size': fs, 'font-weight': punkt.stadt === aktuell ? '700' : gross ? '600' : '400',
        'text-anchor': anker, class: 'hw-dl-name' + (gross ? ' gross' : ''), 'stroke-width': '3', 'paint-order': 'stroke', 'pointer-events': 'none' });
      lbl.textContent = punkt.stadt;
      svg.append(lbl);
      break;
    }
  }
  return svg;
}

/** Portfolio-Karte aus #23. */
export function deutschlandKarte(zeilen, beiStadt, optionen = {}) {
  return zeichneDeutschland(kartenStaedte(zeilen), beiStadt, optionen);
}

/** Dieselbe Karte für die Reise. Die Punkte nutzen Engine-Koordinaten, keine Regions-Hashes. */
export function reiseDeutschlandKarte(staedte, hier, beiStadt) {
  return zeichneDeutschland(staedte.map((c) => ({
    stadt: c.name, anzahl: Math.max(1, c.groesse ?? 1), koordinaten: KOORDINATEN[c.name],
    umsatz: c.umsatz ?? 0, amp: 'ohne'
  })), beiStadt, { aktuell: hier, modus: 'reise' });
}

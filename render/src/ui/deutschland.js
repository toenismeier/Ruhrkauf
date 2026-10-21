// Eine gemeinsame Deutschlandkarte für Portfolio (#23) und Reise (Q23).
// Alle geografischen Daten sind lokal: Standorte aus der Engine, Bundesländer aus dem Katalog.
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
export const AMPEL_FARBE = { gruen: '#248453', gelb: '#d69b24', rot: '#c43e36', ohne: '#88929a' };
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
    class: 'deutschland-svg'
  });
  // Die sechzehn Bundesländer ergeben gemeinsam eine geografisch richtige Außengrenze.
  const land = element('g', { class: 'deutschland-laender', 'aria-hidden': 'true' });
  for (const bundesland of BUNDESLAENDER) {
    const pfad = element('path', { d: bundesland.d, class: 'deutschland-land',
      fill: '#e8edf0', stroke: '#a9b6bc', 'stroke-width': '0.85', 'stroke-linejoin': 'round',
      'fill-rule': 'evenodd' });
    land.append(pfad);
  }
  svg.append(land);

  // Aktive Stadt zuletzt zeichnen; sie bleibt auch bei dichtem Ruhrgebietsnetz sichtbar.
  const verfuegbar = punkte.filter((p) => Array.isArray(p.koordinaten) && p.koordinaten.length === 2)
    .sort((a, b) => Number(a.stadt === aktuell) - Number(b.stadt === aktuell));
  for (const punkt of verfuegbar) {
    const [lat, lon] = punkt.koordinaten, cx = x(lon), cy = y(lat);
    const aktiv = punkt.stadt === aktuell;
    const radius = Math.min(9, Math.max(3.6,
      3.6 + Math.sqrt(Math.max(0, modus === 'reise' ? punkt.anzahl : punkt.umsatz / 1000000)) * (modus === 'reise' ? 0.9 : 0.6)));
    const name = punkt.stadt;
    const g = element('g', { tabindex: '0', role: 'button', 'data-stadt': name,
      class: 'deutschland-stadt' + (aktiv ? ' deutschland-aktuell' : ''),
      'aria-label': name + ', ' + punkt.anzahl + ' ' + (punkt.anzahl === 1 ? 'Haus' : 'Häuser') + (aktiv ? ', aktueller Standort' : '') });
    const title = element('title');
    title.textContent = name + ' · ' + punkt.anzahl + ' Häuser' + (aktiv ? ' · aktuell' : '');
    g.append(title);
    // Große transparente Zeigerfläche; die alphabetische Reiseliste ist der barrierearme Alternativzugang.
    g.append(element('circle', { cx, cy, r: 21, fill: 'transparent', stroke: 'none' }));
    if (aktiv) g.append(element('circle', { cx, cy, r: radius + 5, fill: '#fff', stroke: '#b32632', 'stroke-width': '2', 'pointer-events': 'none' }));
    g.append(element('circle', { cx, cy, r: radius, fill: aktiv ? '#b32632' :
      modus === 'reise' ? '#365e78' : AMPEL_FARBE[punkt.amp] ?? AMPEL_FARBE.ohne,
      stroke: '#fff', 'stroke-width': '1.3', 'pointer-events': 'none' }));
    g.addEventListener('click', () => beiStadt(name));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); beiStadt(name); }
    });
    svg.append(g);
  }

  // Ortsnamen bewusst sparsam: Metropolen und aktueller Standort, keine Textwand im Rhein-Ruhr-Gebiet.
  const beschriftet = [];
  for (const punkt of [...verfuegbar].sort((a, b) =>
    Number(b.stadt === aktuell) - Number(a.stadt === aktuell) ||
    Number(GROSSE_STAEDTE.has(b.stadt)) - Number(GROSSE_STAEDTE.has(a.stadt)))) {
    if (punkt.stadt !== aktuell && !GROSSE_STAEDTE.has(punkt.stadt)) continue;
    const [lat, lon] = punkt.koordinaten, px = x(lon), py = y(lat);
    if (beschriftet.some(([lx, ly]) => Math.abs(px - lx) < 47 && Math.abs(py - ly) < 16)) continue;
    beschriftet.push([px, py]);
    const tx = px > 245 ? px - 9 : px + 9;
    const lbl = element('text', { x: tx, y: py - 9, 'font-size': '11', 'font-weight': punkt.stadt === aktuell ? '750' : '600',
      'text-anchor': px > 245 ? 'end' : 'start', fill: '#25323d', stroke: '#f9fbfc',
      'stroke-width': '3', 'paint-order': 'stroke', 'pointer-events': 'none' });
    lbl.textContent = punkt.stadt;
    svg.append(lbl);
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

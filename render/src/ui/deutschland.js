// Schematische Deutschlandübersicht. Koordinaten aus der Engine, keine three.js-Szene.
import { KOORDINATEN } from '../../../engine/src/standorte';

const NS = 'http://www.w3.org/2000/svg';
const element = (name, attrs = {}) => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};
const x = (lon) => 26 + ((lon - 5.5) / 9.8) * 304;
const y = (lat) => 514 - ((lat - 47.2) / 8.1) * 484;
export const AMPEL_FARBE = { gruen: '#248453', gelb: '#d69b24', rot: '#c43e36', ohne: '#88929a' };

/** Liefert jede Stadt mit ihrem tatsächlichen Portfolio-Umsatz und einem gemittelten Ampelstatus. */
export function kartenStaedte(zeilen) {
  const gruppen = new Map();
  for (const haus of zeilen) {
    if (!gruppen.has(haus.stadt)) gruppen.set(haus.stadt, []);
    gruppen.get(haus.stadt).push(haus);
  }
  return [...gruppen.entries()].map(([stadt, hs]) => {
    const umsatz = hs.reduce((sum, h) => sum + h.umsatz, 0);
    const steuerbar = hs.filter((h) => h.steuerbar);
    const ebitda = steuerbar.reduce((sum, h) => sum + h.ebitda, 0);
    const amp = steuerbar.length ? (ebitda < 0 ? 'rot' : umsatz > 0 && ebitda / umsatz < 0.04 ? 'gelb' : 'gruen') : 'ohne';
    return { stadt, umsatz, ebitda, amp, anzahl: hs.length, koordinaten: KOORDINATEN[stadt] };
  }).sort((a, b) => a.stadt.localeCompare(b.stadt, 'de'));
}

/** SVG-Karte mit zugänglichen Stadtpunkten. Der Umriss ist bewusst schematisch. */
export function deutschlandKarte(zeilen, beiStadt) {
  const svg = element('svg', { viewBox: '0 0 356 542', role: 'group', 'aria-label': 'Deutschlandkarte mit Städten und ihren Ergebnissen', class: 'deutschland-svg' });
  svg.append(element('path', {
    d: 'M 135 21 L 185 31 L 211 54 L 240 48 L 265 86 L 277 122 L 310 158 L 290 198 L 318 242 L 307 273 L 323 320 L 294 359 L 307 407 L 279 455 L 243 473 L 236 510 L 187 527 L 157 505 L 132 512 L 104 470 L 74 456 L 55 405 L 64 358 L 42 324 L 61 293 L 47 241 L 70 207 L 61 173 L 85 144 L 79 108 L 111 79 Z',
    fill: '#e4eaf0', stroke: '#95a7b6', 'stroke-width': '2', 'stroke-linejoin': 'round'
  }));
  // Einfache Orientierungsmarken statt einer externen kartografischen Abhängigkeit.
  for (const stadt of kartenStaedte(zeilen)) {
    if (!stadt.koordinaten) continue;
    const [lat, lon] = stadt.koordinaten;
    const cx = x(lon), cy = y(lat);
    const radius = Math.min(9, Math.max(3.5, 3.5 + Math.sqrt(Math.max(0, stadt.umsatz) / 1000000) * 0.6));
    const g = element('g', { tabindex: '0', role: 'button', 'aria-label': stadt.stadt + ', ' + stadt.anzahl + ' Häuser', 'data-stadt': stadt.stadt });
    g.append(element('circle', { cx, cy, r: Math.max(22, radius + 4), fill: 'transparent', stroke: 'none' }));
    g.append(element('circle', { cx, cy, r: radius, fill: AMPEL_FARBE[stadt.amp], stroke: '#fff', 'stroke-width': '1.25', 'pointer-events': 'none' }));
    const title = element('title');
    title.textContent = stadt.stadt + ' · ' + stadt.anzahl + ' Häuser';
    g.append(title);
    g.addEventListener('click', () => beiStadt(stadt.stadt));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); beiStadt(stadt.stadt); } });
    svg.append(g);
  }
  return svg;
}

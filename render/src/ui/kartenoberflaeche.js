// G6 (E47): Symbole der Kartenoberfläche, des Menüs und der Ebenenliste. Gleiche Bauweise wie die Reitersymbole in
// komponenten.js (isometrische Quader, drei Flächen, Licht von links), ergänzt um Gegenstände, die dort fehlen.
// Aussehen der Hüllen ausschließlich in hartwig.css, Abschnitt G6.
import { SYMBOLE } from './komponenten.js';

const C30 = Math.cos(Math.PI / 6);
const pt = (x, y, z, s = 2.9) => [(x - y) * C30 * s, (x + y) * 0.5 * s - z * s];
const poly = (pts, f) => `<path d="M${pts.map(([a, b]) => a.toFixed(1) + ' ' + b.toFixed(1)).join('L')}Z" fill="${f}"/>`;
/** Quader [x,x+w]×[y,y+d]×[z,z+h]; farbe: [oben, links (+y), rechts (+x)]. */
function q(x, y, z, w, d, h, [o, l, r]) {
  return poly([pt(x, y, z + h), pt(x + w, y, z + h), pt(x + w, y + d, z + h), pt(x, y + d, z + h)], o)
    + poly([pt(x, y + d, z), pt(x + w, y + d, z), pt(x + w, y + d, z + h), pt(x, y + d, z + h)], l)
    + poly([pt(x + w, y, z), pt(x + w, y + d, z), pt(x + w, y + d, z + h), pt(x + w, y, z + h)], r);
}
function svg(inhalt) {
  const z = [...inhalt.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const x0 = Math.min(...z.map((p) => p[0])), x1 = Math.max(...z.map((p) => p[0])), y0 = Math.min(...z.map((p) => p[1])), y1 = Math.max(...z.map((p) => p[1]));
  const g = Math.max(x1 - x0, y1 - y0) + 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return `<svg viewBox="${(cx - g / 2).toFixed(1)} ${(cy - g / 2).toFixed(1)} ${g.toFixed(1)} ${g.toFixed(1)}" aria-hidden="true">${inhalt}</svg>`;
}
const GRAU = ['#d9d3cb', '#b3aba1', '#8d847a'], DUNKEL = ['#6c655e', '#55504a', '#433f3a'], ROT = ['#ef6b60', '#d23c32', '#a62a22'];
const GRUEN = ['#8ed694', '#6dbf73', '#4a8d50'], BLAU = ['#9dc2dc', '#6f9cbd', '#4f7a99'], SAND = ['#f0dfb8', '#d9c393', '#b8a170'], WEISS = ['#ffffff', '#e5e1db', '#c9c3bb'];
const GOLD = ['#ffd77a', '#e8b23f', '#b9862a'], PETROL = ['#7fc3d6', '#2f8aa6', '#1f6f8b'], VIOLETT = ['#d77fb3', '#a9447f', '#7f2c5f'], PAPIER = ['#fbf7ee', '#e5ddcd', '#cdc3ad'];
const figur = (x, y, f) => q(x, y, 0, 1.4, 1.4, 3.2, f) + q(x + 0.15, y + 0.15, 3.3, 1.1, 1.1, 1.1, ['#f2d2b6', '#dcb593', '#c29a77']);
/** Warenhaus mit Band in der Formatfarbe (wie die Hauspins: Hartwig rot, Sport grün, Volkskauf blau, FUNDUS violett, Premium gold). */
const haus = (band, dach = DUNKEL, hoch = 4.5) => svg(q(-3, -3, 0, 6, 6, hoch, WEISS) + q(-3, -3, hoch * 0.53, 6, 6, 0.6, band) + q(-3, -3, hoch, 6, 6, 0.5, dach));

export const SYM = {
  ...SYMBOLE,
  // Formate und Gebäude der Stadt
  warenhaus: haus(ROT), premium: haus(GOLD, ['#4a3a24', '#3b2e1c', '#2c2215'], 5.4), sport: haus(GRUEN), volkskauf: haus(BLAU), fundus: haus(VIOLETT),
  wettbewerber: svg(q(-3, -3, 0, 6, 6, 4, GRAU) + q(-3, -3, 1.6, 6, 6, 0.5, DUNKEL) + q(-3, -3, 4, 6, 6, 0.4, DUNKEL)),
  // Ebenen: drei Platten übereinander (Coffee 15, unten links)
  ebenen: svg(q(-4, -4, 0, 8, 8, 0.7, WEISS) + q(-4, -4, 2.1, 8, 8, 0.7, WEISS) + q(-4, -4, 4.2, 8, 8, 0.7, WEISS)),
  karte: svg(q(-4.5, -3.5, 0, 9, 7, 0.5, ['#cfe0c4', '#b2c7a5', '#93ab86']) + q(-1.5, -1, 0.5, 3, 2, 0.15, ['#e5e1db', '#c9c3bb', '#aaa39a'])
    + q(-0.3, -0.3, 0.5, 0.6, 0.6, 3.2, ROT) + q(-1, -1, 3.6, 2, 2, 1.6, ROT)),
  liste: svg(q(-3, -4, 0, 6, 8, 0.5, SAND) + q(-2.5, -3.5, 0.5, 5, 7, 0.2, PAPIER) + q(-1, -4.2, 0.5, 2, 1, 0.8, ROT)
    + q(-1.8, -2, 0.7, 3.6, 0.3, 0.1, DUNKEL) + q(-1.8, -0.4, 0.7, 3.6, 0.3, 0.1, DUNKEL) + q(-1.8, 1.2, 0.7, 2.4, 0.3, 0.1, DUNKEL)),
  ziel: svg(q(-3, -3, 0, 6, 6, 0.5, GRAU) + q(-0.25, -0.25, 0.5, 0.5, 0.5, 7, DUNKEL) + q(0.25, -0.1, 4.2, 3.6, 0.2, 2.6, ROT)),
  bahn: svg(q(-1.5, -4.5, 0, 3, 9, 0.3, DUNKEL) + q(-1.2, -4, 0.3, 2.4, 8, 2.6, ['#e9edf0', '#c3ccd3', '#9aa7b1']) + q(-1.2, -4, 1.6, 2.4, 8, 0.6, PETROL)),
  // Zentrale und Vorstand
  organisation: svg(q(-1.2, -1.2, 4, 2.4, 2.4, 1.8, PETROL) + q(-0.15, -0.15, 2, 0.3, 0.3, 2, DUNKEL) + q(-3.6, -0.15, 2, 7.2, 0.3, 0.3, DUNKEL)
    + q(-4.4, -1, 0, 2.4, 2.4, 1.8, WEISS) + q(2, -1, 0, 2.4, 2.4, 1.8, WEISS)),
  online: svg(q(-3.5, -2.5, 0, 7, 5, 0.4, DUNKEL) + q(-3.5, -2.8, 0.4, 7, 0.4, 4.2, ['#3c4a55', '#2b363f', '#1f282f']) + q(-3, -2.5, 0.9, 6, 0.1, 3.2, BLAU) + q(-1, 0.5, 0.4, 2, 1.6, 1.2, SAND)),
  it: svg(q(-2, -2, 0, 4, 4, 8, ['#4b545c', '#394047', '#2b3036']) + q(-2, 1.95, 1.2, 4, 0.1, 0.5, BLAU) + q(-2, 1.95, 3, 4, 0.1, 0.5, BLAU) + q(-2, 1.95, 4.8, 4, 0.1, 0.5, GRUEN) + q(-2, 1.95, 6.6, 4, 0.1, 0.5, BLAU)),
  planung: svg(q(-3.5, -0.4, 0, 7, 0.8, 6, PAPIER) + q(-3.5, -0.4, 6, 7, 0.8, 1.2, ROT) + q(-2.6, 0.45, 1, 1.2, 0.1, 1, DUNKEL) + q(-0.6, 0.45, 1, 1.2, 0.1, 1, DUNKEL) + q(1.4, 0.45, 1, 1.2, 0.1, 1, GRUEN)
    + q(-2.6, 0.45, 3.2, 1.2, 0.1, 1, DUNKEL) + q(-0.6, 0.45, 3.2, 1.2, 0.1, 1, DUNKEL)),
  // Spiel
  zeitung: svg(q(-3.5, -4, 0, 7, 8, 0.5, PAPIER) + q(-3, -3.5, 0.5, 6, 1.4, 0.1, DUNKEL) + q(-3, -1.5, 0.5, 2.6, 2.6, 0.1, BLAU)
    + q(0.2, -1.5, 0.5, 2.8, 0.4, 0.1, GRAU) + q(0.2, -0.5, 0.5, 2.8, 0.4, 0.1, GRAU) + q(-3, 1.8, 0.5, 6, 0.4, 0.1, GRAU) + q(-3, 2.8, 0.5, 6, 0.4, 0.1, GRAU)),
  chronik: svg(q(-3, -4, 0, 6, 8, 0.6, ROT) + q(-2.8, -3.8, 0.6, 5.6, 7.6, 1.2, PAPIER) + q(-3, -4, 1.8, 6, 8, 0.6, ROT) + q(-0.6, -4.1, 1.9, 1.2, 0.2, 0.6, GOLD)),
  pokal: svg(q(-2.2, -2.2, 0, 4.4, 4.4, 1, DUNKEL) + q(-0.5, -0.5, 1, 1, 1, 2, GOLD) + q(-2, -2, 3, 4, 4, 3.4, GOLD) + q(-1.4, -1.4, 6.3, 2.8, 2.8, 0.1, ['#8a6420', '#7a581c', '#6a4c18'])),
  podest: svg(q(-1.3, -4.5, 0, 2.6, 3, 4.6, GOLD) + q(-1.3, -1.5, 0, 2.6, 3, 3.2, GRAU) + q(-1.3, 1.5, 0, 2.6, 3, 2, SAND)),
  speichern: svg(q(-3.5, -3.5, 0, 7, 7, 1, PETROL) + q(-2.4, -3.5, 1, 4.8, 3.2, 0.2, WEISS) + q(-2, 0.6, 1, 4, 2.4, 0.2, DUNKEL)),
  spielstaende: svg(q(-3.6, -2, 0, 1.8, 4, 6, ROT) + q(-1.6, -2, 0, 1.8, 4, 6.6, BLAU) + q(0.4, -2, 0, 1.8, 4, 5.6, SAND) + q(2.4, -2, 0, 1.4, 4, 6.2, GRUEN)),
  einstellungen: svg(q(-4, -3, 0, 8, 6, 0.6, DUNKEL) + q(-3, -2, 0.6, 0.4, 4, 0.2, GRAU) + q(-0.2, -2, 0.6, 0.4, 4, 0.2, GRAU) + q(2.6, -2, 0.6, 0.4, 4, 0.2, GRAU)
    + q(-3.5, -1, 0.8, 1.4, 1.4, 1, PETROL) + q(-0.7, 0.6, 0.8, 1.4, 1.4, 1, PETROL) + q(2.1, -1.6, 0.8, 1.4, 1.4, 1, PETROL)),
  klang: svg(q(-2.5, -2, 0, 5, 4, 7, ['#4b545c', '#394047', '#2b3036']) + q(-1.6, 1.95, 4.2, 3.2, 0.1, 2, GRAU) + q(-1.2, 1.95, 0.8, 2.4, 0.1, 2.6, GRAU)),
  einfuehrung: svg(figur(-0.7, -0.7, PETROL) + q(1.5, -2.5, 0, 3, 0.4, 4.4, PAPIER)),
  messung: svg(q(-4, -2, 0, 8, 4, 0.5, DUNKEL) + q(-3.4, -1, 0.5, 1.4, 1.4, 1.4, GRUEN) + q(-1.4, -1, 0.5, 1.4, 1.4, 2.6, GRUEN) + q(0.6, -1, 0.5, 1.4, 1.4, 3.8, SAND) + q(2.6, -1, 0.5, 1.4, 1.4, 5, ROT)),
  ruhestand: svg(q(-3, -2, 0, 6, 4, 2, SAND) + q(-3, -2, 2, 6, 0.8, 3.4, SAND) + q(-3, -2, 2, 0.8, 4, 1.4, SAND) + q(2.2, -2, 2, 0.8, 4, 1.4, SAND)),
  werkzeuge: svg(q(-3.5, -2, 0, 7, 4, 3, ROT) + q(-3.5, -2, 3, 7, 4, 0.4, ['#ef6b60', '#c1352c', '#99261e']) + q(-1.2, -0.3, 3.4, 2.4, 0.6, 1.2, DUNKEL)),
  menue: svg(q(-4, -3, 0, 8, 6, 0.5, WEISS) + q(-4, -3, 1.8, 8, 6, 0.5, WEISS) + q(-4, -3, 3.6, 8, 6, 0.5, WEISS)),
};

/** Hartwig-Logo (rotes Quadrat mit H, wie das App-Symbol). */
export const LOGO = '<svg viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="105" fill="#d23c32"/><path fill="#fff" d="M133 110h68v117h110V110h68v292h-68V290H201v112h-68z"/></svg>';

/** Symbole in alle Platzhalter [data-sym] eines Teilbaums einsetzen. */
export function symboleEinsetzen(wurzel = document) {
  for (const el of wurzel.querySelectorAll('[data-sym]')) if (!el.firstElementChild) el.innerHTML = el.dataset.sym === 'logo' ? LOGO : SYM[el.dataset.sym] ?? '';
}
/** Formatschlüssel aus Portfolio (formatKey) auf Symbolnamen. */
export const FORMAT_SYMBOL = { hartwig: 'warenhaus', premium: 'premium', sport: 'sport', volkskauf: 'volkskauf', fundus: 'fundus' };

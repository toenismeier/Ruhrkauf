// Q33: Dessins (Stoffmuster) für junge Mode, als SVG-Muster im Bildraum 0..100.
// dessin(S, name) legt das Muster in S.defs an und gibt die Füllung zurück (ersetzt S.tex, flaeche() legt es über die Grundfarbe).
// Maße: Ringel 6 Einheiten (≈ 1,5 cm), Schach 7, Camouflage-Flecken 6–12, Leo-Flecken 3–5, Sterne 2,4.

import { hell, dunkel, helligkeit } from './stoff.js';

let zaehler = 0;
const uid = () => 'd33' + (++zaehler).toString(36) + Math.random().toString(36).slice(2, 5);
const muster = (S, w, h, inhalt, extra = '') => { const id = uid(); S.defs.push(`<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${extra}>${inhalt}</pattern>`); return `url(#${id})`; };
const kontrast = (S) => (helligkeit(S.c) > 0.6 ? '#273659' : '#f4f3ef');
const stern = (x, y, r, c, o = 0.9) => {
  const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p.push(`${(x + rr * Math.cos(a)).toFixed(2)} ${(y + rr * Math.sin(a)).toFixed(2)}`); }
  return `<path d="M${p.join(' L')} Z" fill="${c}" opacity="${o}"/>`;
};
const herz = (x, y, r, c, o = 0.9) => `<path d="M${x} ${y + r * 0.9} C${x - r * 1.6} ${y - r * 0.2} ${x - r * 0.7} ${y - r * 1.3} ${x} ${y - r * 0.35} C${x + r * 0.7} ${y - r * 1.3} ${x + r * 1.6} ${y - r * 0.2} ${x} ${y + r * 0.9} Z" fill="${c}" opacity="${o}"/>`;

export const DESSINS = {
  // Bunte Ringel (Kinder): 4 Farben je 3 Einheiten
  ringelbunt: (S) => muster(S, 12, 12, ['#e8833a', '#f1cf4a', '#5f8f7a', '#4f6f9a'].map((c, i) => `<rect y="${i * 3}" width="12" height="3" fill="${c}" opacity="0.9"/>`).join('')),
  // Breite Bretonringel (marine auf hell)
  bretagne: (S) => muster(S, 7, 7, `<rect width="7" height="2.6" fill="${kontrast(S)}" opacity="0.9"/>`),
  // Schachbrett (Teens): 7er Felder
  schach: (S) => muster(S, 14, 14, `<rect width="7" height="7" fill="${kontrast(S)}" opacity="0.88"/><rect x="7" y="7" width="7" height="7" fill="${kontrast(S)}" opacity="0.88"/>`),
  // Batik/Tie-Dye: Spirale aus Farbringen um die Bildmitte
  tiedye: (S) => {
    const id = uid();
    S.defs.push(`<radialGradient id="${id}" cx="50" cy="48" r="44" gradientUnits="userSpaceOnUse" spreadMethod="repeat"><stop offset="0" stop-color="#e86aa0"/><stop offset="0.18" stop-color="#f1cf4a"/><stop offset="0.36" stop-color="#6fc4c9"/><stop offset="0.55" stop-color="#9a7bd0"/><stop offset="0.75" stop-color="#e86aa0"/><stop offset="1" stop-color="#f1cf4a"/></radialGradient>`);
    return `url(#${id})`;
  },
  // Camouflage: drei Grüntöne/Braun in Flecken
  camo: (S) => muster(S, 30, 30, [
    ['#5f6b3a', 'M2 4 Q8 0 13 5 Q16 11 9 13 Q2 12 2 4 Z'], ['#3f4a2a', 'M16 2 Q24 1 27 7 Q24 12 18 10 Q14 6 16 2 Z'],
    ['#8a7a52', 'M4 17 Q11 14 15 19 Q14 26 7 26 Q1 23 4 17 Z'], ['#3f4a2a', 'M18 16 Q26 14 29 20 Q28 28 21 27 Q16 22 18 16 Z'],
    ['#2f3424', 'M10 10 Q14 12 12 16 Q8 15 10 10 Z'],
  ].map(([c, d]) => `<path d="${d}" fill="${c}" opacity="0.92"/>`).join('')),
  // Leo: Rosetten
  leo: (S) => muster(S, 14, 14, [[3, 3], [10, 5], [5, 10], [12, 12]].map(([x, y]) => `<path d="M${x - 2} ${y} q1 -2.4 3 -1.4 q1.6 1.4 -0.4 3 q-2 1 -2.6 -1.6 Z" fill="none" stroke="#2a2018" stroke-width="0.9" opacity="0.8"/><circle cx="${x + 0.3}" cy="${y + 0.2}" r="0.8" fill="#8a5a2e" opacity="0.7"/>`).join('')),
  // Sterne verstreut
  sterne: (S) => muster(S, 12, 12, stern(3, 3, 1.6, kontrast(S)) + stern(9, 8.5, 1.3, '#f1cf4a')),
  // Herzen
  herzen: (S) => muster(S, 11, 11, herz(3, 3.4, 1.5, '#e86a7a') + herz(8.5, 8.4, 1.3, kontrast(S))),
  // Regenbogen-Querstreifen über die ganze Breite (fester Bildraum)
  regenbogen: (S) => muster(S, 100, 100, ['#c8372f', '#e8833a', '#f1cf4a', '#5f8f7a', '#4f6f9a', '#7a4f9a'].map((c, i) => `<rect y="${34 + i * 4}" width="100" height="4" fill="${c}" opacity="0.92"/>`).join('')),
  // Colorblock: Brustband und Schulterpartie in Zweitfarbe
  block: (S) => muster(S, 100, 100, `<rect y="0" width="100" height="32" fill="${dunkel(S.c, 0.55)}" opacity="0.9"/><rect y="32" width="100" height="7" fill="#f4f3ef" opacity="0.9"/>`),
  // Schottenkaro (Tartan)
  schotten: (S) => muster(S, 12, 12, `<rect width="12" height="4" fill="#1f3a2a" opacity="0.55"/><rect width="4" height="12" fill="#1f3a2a" opacity="0.55"/><path d="M0 8 H12 M8 0 V12" stroke="#f1cf4a" stroke-width="0.5" opacity="0.8"/><path d="M0 2 H12 M2 0 V12" stroke="#000" stroke-width="0.4" opacity="0.4"/>`),
  // Karo groß (Flanell)
  flanell: (S) => muster(S, 10, 10, `<rect width="10" height="4.5" fill="#000" opacity="0.28"/><rect width="4.5" height="10" fill="#000" opacity="0.28"/><path d="M0 7.5 H10 M7.5 0 V10" stroke="#fff" stroke-width="0.5" opacity="0.5"/>`),
  // Norweger: Bordüre mit Zacken und Sternen auf Brusthöhe, Rest uni
  norweger: (S) => {
    const k = kontrast(S);
    let z = `<rect y="26" width="100" height="16" fill="${dunkel(S.c, 0.35)}" opacity="0.9"/>`;
    for (let x = 0; x < 100; x += 5) z += `<path d="M${x} 27.5 l2.5 2.5 l2.5 -2.5" stroke="${k}" stroke-width="0.8" fill="none"/><path d="M${x} 40.5 l2.5 -2.5 l2.5 2.5" stroke="${k}" stroke-width="0.8" fill="none"/>`;
    for (let x = 5; x < 100; x += 10) z += `<path d="M${x} 31.5 v5 M${x - 2.5} 34 h5 M${x - 1.8} 32.2 l3.6 3.6 M${x + 1.8} 32.2 l-3.6 3.6" stroke="${k}" stroke-width="0.7"/>`;
    return muster(S, 100, 100, z);
  },
  // Netz (Mesh)
  netz: (S) => muster(S, 3, 3, `<path d="M0 0 L3 3 M3 0 L0 3" stroke="#000" stroke-width="0.45" opacity="0.45"/>`),
  // Grobes Netz (Netzshirt): schwarze Rauten über heller Grundfarbe
  netzgrob: (S) => muster(S, 5, 5, `<path d="M0 0 L5 5 M5 0 L0 5" stroke="#1d1b1c" stroke-width="0.8" opacity="0.9"/>`),
  // Glitzer-Tupfen
  glitzer: (S) => muster(S, 8, 8, `<circle cx="2" cy="2" r="0.7" fill="#fff" opacity="0.85"/><circle cx="6" cy="5" r="0.5" fill="#f1cf4a" opacity="0.9"/><circle cx="3.5" cy="6.5" r="0.4" fill="#fff" opacity="0.7"/>`),
  // Anker (maritim)
  anker: (S) => muster(S, 12, 12, `<path d="M4 2 v6 M2.4 3.6 h3.2 M1.8 6.4 q2.2 3 4.4 0" stroke="${kontrast(S)}" stroke-width="0.7" fill="none"/><circle cx="4" cy="1.6" r="0.7" fill="none" stroke="${kontrast(S)}" stroke-width="0.5"/>`),
  // Kleine Dinos
  dinos: (S) => muster(S, 14, 12, `<path d="M2 8 q1 -4 5 -4 q3 0 4 -2 q1 2 -1 4 l0 3 h-1 v-2 h-3 v2 h-1 v-2 q-2 0 -3 1 Z" fill="${kontrast(S)}" opacity="0.85"/>`),
  // Kleine Autos
  autos: (S) => muster(S, 14, 10, `<path d="M2 6 h10 v-2 l-2 -2 h-5 l-2 2 h-1 Z" fill="${hell(S.c, 0.5)}" opacity="0.9"/><circle cx="4.5" cy="6.4" r="1.1" fill="#2a2c30"/><circle cx="9.5" cy="6.4" r="1.1" fill="#2a2c30"/>`),
  // Blümchen (Millefleurs)
  bluemchen: (S) => muster(S, 9, 9, [[2.5, 2.5, '#fff'], [7, 6.5, '#f2b8cc']].map(([x, y, c]) => [0, 1, 2, 3, 4].map((i) => `<circle cx="${(x + 1.1 * Math.cos(i * 1.2566)).toFixed(2)}" cy="${(y + 1.1 * Math.sin(i * 1.2566)).toFixed(2)}" r="0.75" fill="${c}"/>`).join('') + `<circle cx="${x}" cy="${y}" r="0.55" fill="#f1cf4a"/>`).join('')),
  // Fleece/Plüsch über Struktur: dichte helle Bögen
  fleece: (S) => muster(S, 3, 3, `<path d="M0.4 1.6 q0.8 -1.2 1.6 0" stroke="#fff" stroke-width="0.45" fill="none" opacity="0.45"/><path d="M1.4 2.8 q0.8 -1 1.4 0" stroke="#000" stroke-width="0.35" fill="none" opacity="0.18"/>`),
  // Steppung (Rauten)
  stepp: (S) => muster(S, 8, 8, `<path d="M0 4 L4 0 L8 4 L4 8 Z" fill="none" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.5" opacity="0.8"/>`),
};

export function dessin(S, name) {
  const d = DESSINS[name];
  return d ? d(S) : S.tex;
}

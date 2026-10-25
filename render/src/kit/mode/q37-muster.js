// Q37: Musterfeld der Produktentwicklung. Schlüssel kommen aus der Engine (engine/src/muster.ts MUSTER_INFO.bild).
// musterFuellung(S, key) legt das Muster in S.defs an und gibt die Füllung zurück (ersetzt S.tex, flaeche() legt es über die Grundfarbe).
// Maße im Bildraum 0..100, so groß, dass das Muster auch in der 64-px-Kachel lesbar bleibt (Blindtest).
import { hell, dunkel, helligkeit } from './stoff.js';
import { DESSINS } from './q33-dessins.js';

let zaehler = 0;
/** Mitte für Motive (Schriftzug, Lizenzmotiv, Batik) im Freisteller-Bildraum 0..100. */
const ORT = { cx: 50, cy: 44, s: 1 };
const uid = () => 'm37' + (++zaehler).toString(36) + Math.random().toString(36).slice(2, 5);
const muster = (S, w, h, inhalt, extra = '') => { const id = uid(); S.defs.push(`<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"${extra}>${inhalt}</pattern>`); return `url(#${id})`; };
const kontrast = (S) => (helligkeit(S.c) > 0.58 ? '#273659' : '#f4f3ef');

const blume = (x, y, r, blatt, mitte) => {
  let z = '';
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; z += `<circle cx="${(x + r * Math.cos(a)).toFixed(2)}" cy="${(y + r * Math.sin(a)).toFixed(2)}" r="${(r * 0.78).toFixed(2)}" fill="${blatt}"/>`; }
  return z + `<circle cx="${x}" cy="${y}" r="${(r * 0.55).toFixed(2)}" fill="${mitte}"/>`;
};

export const MUSTER_FUELLUNG = {
  uni: () => null,
  // Nadel- bzw. Hemdenstreifen: senkrecht, schmal
  nadelstreifen: (S) => muster(S, 5, 5, `<rect x="0" width="1.3" height="5" fill="${kontrast(S)}" opacity="0.85"/>`),
  // Ringel: breite Querstreifen
  ringel: (S) => muster(S, 8, 8, `<rect width="8" height="3.4" fill="${kontrast(S)}" opacity="0.9"/>`),
  // Karo: Vichy-Karo aus zwei Bahnen und hellem Schnittpunkt
  karo: (S) => { const d = dunkel(S.c, 0.55), k = kontrast(S); return muster(S, 12, 12, `<rect width="12" height="5" fill="${d}" opacity="0.6"/><rect width="5" height="12" fill="${d}" opacity="0.6"/><path d="M0 9 H12 M9 0 V12" stroke="${k}" stroke-width="0.8" opacity="0.9"/>`); },
  punkte: (S) => muster(S, 8, 8, `<circle cx="2" cy="2" r="1.35" fill="${kontrast(S)}"/><circle cx="6" cy="6" r="1.35" fill="${kontrast(S)}"/>`),
  // Blumen: Fünfblattblüten mit Herz und Blatt
  blumen: (S) => {
    const hl = helligkeit(S.c) > 0.58;
    return muster(S, 20, 20, blume(5.5, 5.5, 3, hl ? '#c8372f' : '#f4f3ef', '#f1cf4a') + blume(15, 15, 2.6, hl ? '#4d6f9a' : '#f2b8cc', '#f1cf4a')
      + `<path d="M13 4 q3 -2.4 5 0.2 q-3 2 -5 -0.2 Z" fill="#5f8f5a"/><path d="M2 15 q3 -2.4 5 -0.4 q-3 2.2 -5 0.4 Z" fill="#5f8f5a"/><path d="M8.5 8.5 Q10 11 12.5 12.5" stroke="#5f8f5a" stroke-width="0.9" fill="none"/>`);
  },
  leo: (S) => muster(S, 16, 16, `<rect width="16" height="16" fill="#c99a5a" opacity="0.55"/>` + [[4, 4], [12, 6], [6.5, 12], [14, 14]].map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="1.6" fill="#8a5a2a"/>` + [0, 1.3, 2.6, 3.9, 5.2].map((a) => `<path d="M${(x + 2.7 * Math.cos(a)).toFixed(2)} ${(y + 2.7 * Math.sin(a)).toFixed(2)} l${(1.1 * Math.cos(a + 1.6)).toFixed(2)} ${(1.1 * Math.sin(a + 1.6)).toFixed(2)}" stroke="#1e1610" stroke-width="1.3" stroke-linecap="round"/>`).join('')).join('')),
  tier: (S) => muster(S, 10, 14, `<rect width="10" height="14" fill="#f4f3ef" opacity="0.55"/><path d="M0 0 q3 3.5 0 7 t0 7 h3.4 q-3 -3.5 0 -7 t0 -7 Z" fill="#141210"/><path d="M5.5 0 q3 3.5 0 7 t0 7 h2.6 q-3 -3.5 0 -7 t0 -7 Z" fill="#141210"/>`),
  camouflage: (S) => DESSINS.camo(S),
  // Batik: Spirale aus Grundfarbe, hell und Akzent
  batik: (S, o = ORT) => {
    const id = uid();
    S.defs.push(`<radialGradient id="${id}" cx="${o.cx}" cy="${o.cy}" r="${22 * o.s}" gradientUnits="userSpaceOnUse" spreadMethod="repeat"><stop offset="0" stop-color="${hell(S.c, 0.7)}"/><stop offset="0.3" stop-color="${S.c}"/><stop offset="0.55" stop-color="#e86aa0"/><stop offset="0.8" stop-color="${hell(S.c, 0.4)}"/><stop offset="1" stop-color="${hell(S.c, 0.7)}"/></radialGradient>`);
    return `url(#${id})`;
  },
  // Print: grafisches Allover aus Blättern und Kreisen
  print: (S) => {
    const hl = helligkeit(S.c) > 0.58;
    return muster(S, 16, 16, `<path d="M2 11 Q4 3 11 2 Q9 9 2 11 Z" fill="${hl ? '#2c5a40' : '#f1cf4a'}" opacity="0.85"/><path d="M9 15.5 Q11 10 15.5 9.5 Q14 14 9 15.5 Z" fill="${hl ? '#c0643f' : '#f4f3ef'}" opacity="0.8"/><circle cx="13" cy="4" r="1.6" fill="${hl ? '#c0643f' : '#f4f3ef'}" opacity="0.85"/>`);
  },
  // Schriftzug: ein Wort quer über die Brust (kein Markenname)
  schriftzug: (S, o = ORT) => muster(S, 400, 500, `<text x="${o.cx}" y="${o.cy}" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="${8 * o.s}" textLength="${30 * o.s}" lengthAdjust="spacingAndGlyphs" fill="${kontrast(S)}">WEEKEND</text><rect x="${o.cx - 15 * o.s}" y="${o.cy + 2.4 * o.s}" width="${30 * o.s}" height="${1.4 * o.s}" fill="${kontrast(S)}"/>`),
  schachbrett: (S) => muster(S, 12, 12, `<rect width="6" height="6" fill="${kontrast(S)}" opacity="0.9"/><rect x="6" y="6" width="6" height="6" fill="${kontrast(S)}" opacity="0.9"/>`),
  norweger: (S) => DESSINS.norweger(S),
  // Häkel und Strickmuster: offene Maschenkreise im Raster (Granny-Optik)
  // Häkel und Strickmuster: Zopfmuster (verschlungene Zöpfe in Bahnen, dazwischen linke Maschen)
  haekel: (S) => { const d = dunkel(S.c, 0.4), h = hell(S.c, 0.35); return muster(S, 12, 12, `<rect x="0" width="1.8" height="12" fill="${d}" opacity="0.7"/><path d="M4 0 C4 3 10 3 10 6 C10 9 4 9 4 12" stroke="${d}" stroke-width="2.8" fill="none"/><path d="M10 0 C10 3 4 3 4 6 C4 9 10 9 10 12" stroke="${d}" stroke-width="2.8" fill="none"/><path d="M10 0 C10 3 4 3 4 6" stroke="${h}" stroke-width="1.1" fill="none"/><path d="M10 6 C10 9 4 9 4 12" stroke="${h}" stroke-width="1.1" fill="none"/>`); },
  // Lizenzmotiv (gesperrt, bis es Lizenzgeber gibt): Figur in der Brustmitte
  lizenz: (S, o = ORT) => { const k = kontrast(S), x = (v) => (o.cx + (v - 50) * o.s).toFixed(2), y = (v) => (o.cy + (v - 44) * o.s).toFixed(2), r = (v) => (v * o.s).toFixed(2);
    return muster(S, 400, 500, `<circle cx="${x(50)}" cy="${y(40)}" r="${r(9)}" fill="${k}"/><circle cx="${x(42.5)}" cy="${y(31.5)}" r="${r(4)}" fill="${k}"/><circle cx="${x(57.5)}" cy="${y(31.5)}" r="${r(4)}" fill="${k}"/><circle cx="${x(46.5)}" cy="${y(39)}" r="${r(1.4)}" fill="${S.c}"/><circle cx="${x(53.5)}" cy="${y(39)}" r="${r(1.4)}" fill="${S.c}"/><path d="M${x(45.5)} ${y(44)} q${r(4.5)} ${r(3.5)} ${r(9)} 0" stroke="${S.c}" stroke-width="${r(1.3)}" fill="none"/>`); },
};

/** Füllung für einen Musterschlüssel (null bei Uni oder unbekannt). ort: Mitte für Motive (Freisteller 50/44, Model Brust). */
export function musterFuellung(S, key, ort = ORT) {
  const f = MUSTER_FUELLUNG[key];
  return f ? f(S, ort) : null;
}
export const istMuster = (key) => typeof key === 'string' && key in MUSTER_FUELLUNG;

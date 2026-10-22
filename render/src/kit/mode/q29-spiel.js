// Q29: Spielwaren – Holzspielzeug, Puzzle, Bauklötze, Puppe, Plüschtier. Weiche Farben, Holz natur.

import { f, E, glatt, hell, dunkel, mische, linie, boden, form, zylinder, rund, maserung } from './q29-hilfen.js';

const HOLZ = '#d9b98c';
const FARBEN = ['#c8574a', '#e3b04b', '#5f8f7a', '#4f6f9a', '#d98a6b'];
const rr = (x, y, w, h, r) => `M${f(x + r)} ${f(y)} L${f(x + w - r)} ${f(y)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} L${f(x + w)} ${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} L${f(x + r)} ${f(y + h)} Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)} L${f(x)} ${f(y + r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} Z`;
// Würfel in Iso-Ansicht (Front, rechte Seite, Deckel)
function klotz(S, t, x, yb, w, h, farbe, tief = 6) {
  t.push(form(S, `M${x} ${yb - h} L${x + w} ${yb - h} L${x + w} ${yb} L${x} ${yb} Z`, farbe));
  t.push(form(S, `M${x + w} ${yb - h} L${x + w + tief} ${yb - h - tief * 0.6} L${x + w + tief} ${yb - tief * 0.6} L${x + w} ${yb} Z`, dunkel(farbe, 0.18)));
  t.push(form(S, `M${x} ${yb - h} L${x + w} ${yb - h} L${x + w + tief} ${yb - h - tief * 0.6} L${x + tief} ${yb - h - tief * 0.6} Z`, hell(farbe, 0.15)));
}
const rad = (x, y, r, farbe) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${farbe}"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${dunkel(farbe, 0.35)}" stroke-width="0.6"/><circle cx="${x}" cy="${y}" r="${f(r * 0.35)}" fill="${HOLZ}"/><circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.25)}" fill="#fff" opacity="0.25"/>`;

export const SPIEL = {
  // Holzeisenbahn: Lok mit Kessel, Schornstein, Führerhaus, Anhänger mit Klötzen, farbige Räder.
  // Maß: Lok 0,55 der Zuglänge, Rad Ø 0,3 Lokhöhe.
  holzspielzeug(S, t) {
    t.push(boden(50, 82, 44, 2.6));
    // Anhänger
    t.push(form(S, rr(6, 58, 34, 14, 1.6), HOLZ), maserung(S, rr(6, 58, 34, 14, 1.6), HOLZ, 3, 6, 40, 58, 72));
    klotz(S, t, 9, 58, 9, 9, FARBEN[1], 3), klotz(S, t, 21, 58, 9, 12, FARBEN[2], 3);
    t.push(linie('M40 66 H46', '#7a5a3a', 1.6));
    // Lok
    t.push(form(S, rr(44, 56, 50, 16, 2), HOLZ));
    t.push(form(S, rr(46, 40, 30, 16, 8), S.c, { licht: 'rund' }));
    t.push(form(S, 'M52 26 L60 26 L59 40 L53 40 Z', dunkel(S.c, 0.25), { licht: 'rund' }), `<rect x="50.6" y="23.4" width="10.8" height="3.6" rx="1" fill="${dunkel(S.c, 0.35)}"/>`);
    t.push(form(S, rr(74, 30, 20, 26, 1.6), HOLZ), maserung(S, rr(74, 30, 20, 26, 1.6), HOLZ, 4, 74, 94, 30, 56));
    t.push(form(S, rr(72, 26, 24, 5, 1.4), S.c), `<rect x="78" y="35" width="12" height="9" rx="1.2" fill="#f5efe2" stroke="${dunkel(HOLZ, 0.35)}" stroke-width="0.5"/>`);
    t.push(rad(12, 74, 5.4, FARBEN[3]), rad(32, 74, 5.4, FARBEN[3]), rad(52, 74, 7, FARBEN[0]), rad(70, 74, 7, FARBEN[0]), rad(86, 74, 7, FARBEN[0]));
    t.push(`<circle cx="46.6" cy="48" r="2.4" fill="${hell(S.c, 0.4)}"/>`);
  },

  // Puzzle: Rahmen 4×3 Teile mit Motiv (Landschaft), zwei lose Teile davor; Teile mit Nasen und Löchern.
  // Maß: Teil quadratisch, Nase Ø 0,3 Teilbreite.
  puzzle(S, t) {
    t.push(boden(50, 86, 44, 3));
    const x0 = 10, y0 = 18, w = 80, h = 60, cw = w / 4, ch = h / 3;
    const bild = `M${x0} ${y0} h${w} v${h} h-${w} Z`;
    const id = 'pz' + Math.random().toString(36).slice(2, 6);
    S.defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd6e4"/><stop offset="0.55" stop-color="#e9eef0"/></linearGradient>`);
    t.push(`<path d="${bild}" fill="url(#${id})"/>`);
    t.push(`<path d="M${x0} ${y0 + 40} Q30 26 46 38 Q60 22 ${x0 + w} 36 L${x0 + w} ${y0 + h} L${x0} ${y0 + h} Z" fill="${S.c}"/><path d="M${x0} ${y0 + 50} Q40 40 ${x0 + w} 52 L${x0 + w} ${y0 + h} L${x0} ${y0 + h} Z" fill="${dunkel(S.c, 0.2)}"/>`);
    t.push(`<circle cx="70" cy="28" r="5" fill="#f1cf4a"/><path d="M24 30 q3 -3 6 0 q3 -3 6 0" stroke="#5a5a5a" stroke-width="0.7" fill="none"/>`);
    // Fehlstelle (ein Teil fehlt)
    const fx = x0 + 2 * cw, fy = y0 + ch;
    t.push(`<path d="M${fx} ${fy} h${cw} v${ch} h-${cw} Z" fill="#c9bfae"/>`);
    // Schnittlinien mit Nasen
    const g = [];
    for (let i = 1; i < 4; i++) { const x = x0 + i * cw; for (let j = 0; j < 3; j++) { const y = y0 + j * ch, s = (i + j) % 2 ? 1 : -1; g.push(`M${f(x)} ${f(y)} V${f(y + ch * 0.36)} c${f(s * 4)} -2 ${f(s * 4)} ${f(ch * 0.28 + 2)} 0 ${f(ch * 0.28)} V${f(y + ch)}`); } }
    for (let j = 1; j < 3; j++) { const y = y0 + j * ch; for (let i = 0; i < 4; i++) { const x = x0 + i * cw, s = (i + j) % 2 ? -1 : 1; g.push(`M${f(x)} ${f(y)} H${f(x + cw * 0.36)} c-2 ${f(s * 4)} ${f(cw * 0.28 + 2)} ${f(s * 4)} ${f(cw * 0.28)} 0 H${f(x + cw)}`); } }
    t.push(`<path d="${g.join(' ')}" stroke="#000" stroke-opacity="0.35" stroke-width="0.6" fill="none"/><path d="${g.join(' ')}" stroke="#fff" stroke-opacity="0.35" stroke-width="0.4" fill="none" transform="translate(0.5 0.5)"/>`);
    t.push(`<path d="${bild}" fill="none" stroke="#7f7466" stroke-width="0.8"/>`);
    // loses Teil
    const teil = `M0 0 H7 c-2 -4 9 -4 7 0 H20 V7 c4 -2 4 9 0 7 V20 H13 c2 4 -9 4 -7 0 H0 V13 c-4 2 -4 -9 0 -7 Z`;
    t.push(`<g transform="translate(66 72) rotate(12)"><path d="${teil}" fill="#000" opacity="0.12" transform="translate(1 1.4)"/><path d="${teil}" fill="${S.c}"/><path d="${teil}" fill="none" stroke="${dunkel(S.c, 0.4)}" stroke-width="0.6"/><path d="M0 12 Q10 6 20 12 V20 H0 Z" fill="${dunkel(S.c, 0.2)}"/></g>`);
  },

  // Bauklötze aus Buche: Würfel 4 cm, Quader, Zylinder, Dachprisma, als kleiner Turm und lose Klötze.
  // Maß: Würfelkante 0,22 der Bildhöhe, Farben lasiert.
  bauklotze(S, t) {
    t.push(boden(50, 88, 44, 3));
    klotz(S, t, 14, 88, 22, 20, FARBEN[0]);
    klotz(S, t, 40, 88, 22, 20, HOLZ);
    t.push(maserung(S, 'M40 68 L62 68 L62 88 L40 88 Z', HOLZ, 4, 40, 62, 68, 88));
    klotz(S, t, 66, 88, 20, 20, FARBEN[3]);
    klotz(S, t, 22, 68, 44, 12, FARBEN[1]);
    // Zylinder
    t.push(zylinder(S, 32, 40, 56, 8, 2.6, FARBEN[2]));
    // Dachprisma
    t.push(form(S, 'M44 56 L66 56 L55 38 Z', S.c), form(S, 'M66 56 L72 52.4 L61 34.4 L55 38 Z', dunkel(S.c, 0.2)));
    // Buchstabe auf Würfel vorn
    t.push(`<text x="25" y="83" font-family="Georgia, serif" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle" opacity="0.9">A</text>`);
    t.push(`<text x="76" y="83" font-family="Georgia, serif" font-size="13" font-weight="bold" fill="#fff" text-anchor="middle" opacity="0.9">B</text>`);
  },

  // Stoffpuppe 35 cm: Kopf rund, Wollhaar mit zwei Zöpfen, Kleid mit Kragen, Strumpfbeine, Stoffschuhe.
  // Maß: Kopf 1/4 der Höhe, Kleid bis 2/3, Arme bis Hüfte.
  puppe(S, t) {
    t.push(boden(50, 92, 22, 2.4));
    const haut = '#f1d3bd', haar = '#b9763f';
    // Beine
    for (const x of [44, 56]) t.push(`<rect x="${x - 3.4}" y="64" width="6.8" height="22" rx="3" fill="#f4efe6"/><path d="M${x - 3.4} 70 h6.8 M${x - 3.4} 75 h6.8 M${x - 3.4} 80 h6.8" stroke="${S.c}" stroke-width="1.4" opacity="0.6"/><path d="M${x - 4.6} 86 Q${x - 4.6} 82 ${x} 82 Q${x + 5} 82 ${x + 5} 86 Q${x + 5} 90 ${x} 90 Q${x - 4.6} 90 ${x - 4.6} 86 Z" fill="#6c4a3a"/>`);
    // Arme
    for (const s of [-1, 1]) t.push(`<path d="M${50 + s * 9} 40 Q${50 + s * 20} 50 ${50 + s * 19} 62" stroke="${haut}" stroke-width="5.4" fill="none" stroke-linecap="round"/>`);
    // Kleid
    const kleid = 'M41 38 L59 38 Q62 44 61 48 L70 70 Q50 74 30 70 L39 48 Q38 44 41 38 Z';
    t.push(form(S, kleid, S.c, { tex: true }));
    t.push(`<path d="M30 70 Q50 74 70 70" stroke="${hell(S.c, 0.5)}" stroke-width="1.6" fill="none" stroke-dasharray="1 0.9"/>`);
    t.push(`<path d="M42 38 Q46 44 50 40 Q54 44 58 38 Z" fill="#fbfaf6" stroke="#d8d2c6" stroke-width="0.4"/>`);
    for (const y of [46, 52]) t.push(`<circle cx="50" cy="${y}" r="0.9" fill="#fbfaf6"/>`);
    // Kopf und Haar
    t.push(`<circle cx="50" cy="24" r="14" fill="${haut}"/><circle cx="50" cy="24" r="14" fill="${rund(S)}"/>`);
    t.push(`<path d="M36 22 Q36 8 50 8 Q64 8 64 22 Q60 14 50 14 Q40 14 36 22 Z" fill="${haar}"/>`);
    for (const s of [-1, 1]) t.push(`<path d="M${50 + s * 13} 20 Q${50 + s * 18} 30 ${50 + s * 16} 44" stroke="${haar}" stroke-width="4.4" fill="none" stroke-linecap="round" stroke-dasharray="3 0.8"/><circle cx="${50 + s * 16}" cy="38" r="1.6" fill="${S.c}"/>`);
    t.push(`<circle cx="45" cy="25" r="1.2" fill="#3a2f2a"/><circle cx="55" cy="25" r="1.2" fill="#3a2f2a"/><circle cx="42" cy="29" r="2.2" fill="#e8a39a" opacity="0.6"/><circle cx="58" cy="29" r="2.2" fill="#e8a39a" opacity="0.6"/><path d="M47.6 30 Q50 32 52.4 30" stroke="#b5574b" stroke-width="0.8" fill="none"/>`);
  },

  // Teddybär sitzend 30 cm: Plüsch mit Florstruktur, abgesetzte Schnauze, Nähte, Pfotenballen, Schleife.
  // Maß: Kopf 0,4 der Sitzhöhe, Ohren 0,25 Kopfbreite, Beine nach vorn.
  plueschtier(S, t) {
    t.push(boden(50, 90, 34, 3));
    const id = 'fl' + Math.random().toString(36).slice(2, 6);
    S.defs.push(`<pattern id="${id}" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><path d="M0.4 1.8 q0.6 -1.2 1.2 -0.2" stroke="#fff" stroke-opacity="0.22" stroke-width="0.5" fill="none"/><path d="M1.4 0.8 q0.6 -1 1 0" stroke="#000" stroke-opacity="0.12" stroke-width="0.5" fill="none"/></pattern>`);
    const P = (d, ton = 0) => [`<path d="${d}" fill="${ton ? (ton > 0 ? hell(S.c, ton) : dunkel(S.c, -ton)) : S.c}"/>`, `<path d="${d}" fill="url(#${id})"/>`, `<path d="${d}" fill="${rund(S)}" opacity="0.7"/>`, `<path d="${d}" fill="none" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.5" opacity="0.5"/>`].join('');
    const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    // Körper
    t.push(P(ell(50, 64, 21, 22)));
    t.push(`<path d="${ell(50, 68, 11, 13)}" fill="${hell(S.c, 0.3)}" opacity="0.8"/>`);
    // Arme
    t.push(P(ell(29, 62, 7, 13), -0.05), P(ell(71, 62, 7, 13), -0.05));
    // Beine nach vorn
    for (const x of [36, 64]) { t.push(P(ell(x, 82, 10, 8), -0.02)); t.push(`<ellipse cx="${x}" cy="84" rx="6" ry="4.4" fill="${hell(S.c, 0.35)}"/><path d="M${x - 3} 81 q3 -2 6 0" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.5" fill="none"/>`); }
    // Kopf und Ohren
    for (const x of [33, 67]) t.push(P(ell(x, 18, 7, 7), -0.04), `<circle cx="${x}" cy="18" r="3.6" fill="${hell(S.c, 0.3)}"/>`);
    t.push(P(ell(50, 30, 18, 16)));
    t.push(`<ellipse cx="50" cy="36" rx="8" ry="6" fill="${hell(S.c, 0.38)}"/><path d="M47 33.4 Q50 31.6 53 33.4 Q52 36 50 36.4 Q48 36 47 33.4 Z" fill="#2c2420"/><path d="M50 36.4 V39 M47 40 Q50 41.6 53 40" stroke="#2c2420" stroke-width="0.7" fill="none"/>`);
    t.push(`<circle cx="43" cy="27" r="1.7" fill="#1e1a18"/><circle cx="57" cy="27" r="1.7" fill="#1e1a18"/><circle cx="42.5" cy="26.4" r="0.5" fill="#fff"/><circle cx="56.5" cy="26.4" r="0.5" fill="#fff"/>`);
    t.push(`<path d="M50 14.6 V22" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.4" stroke-dasharray="0.8 0.6"/><path d="M50 48 V84" stroke="${dunkel(S.c, 0.25)}" stroke-width="0.4" stroke-dasharray="0.8 0.6" opacity="0.6"/>`);
    // Schleife
    t.push(`<path d="M50 46 L41 42 L42 50 Z M50 46 L59 42 L58 50 Z" fill="#9fb393"/><circle cx="50" cy="46" r="2" fill="#86a07a"/>`);
  },
};

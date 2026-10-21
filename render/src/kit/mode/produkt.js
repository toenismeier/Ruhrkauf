// Q25: Freisteller-Produktbilder (Flatlay, Licht von links) für Liste und Assistent.
// produktSVG(typ, farbe, material, groesse = 160, opt = { hintergrund, muster }) → SVG-String (viewBox 0 0 100 100) oder null, wenn der Typ hier nicht gezeichnet wird.

import { glatt } from './model.js';
import { hell, dunkel, materialDefs, flaeche, farbeVon, mische } from './stoff.js';

const f = (n) => Math.round(n * 10) / 10;
const E = 'ecke';
const sp = (pts) => pts.map(([x, y, e]) => [100 - x, y, e]);
const sym = (rechts) => [...rechts, ...sp([...rechts].reverse())];
const naht = (d, S, o = 0.8) => `<path d="${d}" stroke="${S.denim ? S.naht : S.cD}" stroke-width="0.55" stroke-dasharray="1.2 0.9" fill="none" opacity="${o}"/>`;
const linie = (d, c, w = 0.7, o = 1) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${o}"/>`;
const schatten = (cx, cy, rx, ry = 3) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="0.1"/>`;

// ─────────────────────────────────────────── Bekleidung
const Z = {
  'Jeans-Shorts'(S, t) {
    // Bund 30–70, Beinöffnungen weit, kurzer Schritt, ausgefranster Saum, Aufschlag optional
    const bein = [[50, 22, E], [70.5, 22, E], [72.5, 34], [76.5, 58, E], [53.5, 62, E], [50.4, 46]];
    t.push(flaeche(S, glatt(bein, true, 0.3)), flaeche(S, glatt(sp(bein), true, 0.3)));
    t.push(flaeche(S, glatt([[29.5, 22, E], [70.5, 22, E], [70.8, 28, E], [29.2, 28, E]]), { ton: -0.06 }));
    for (const x of [33, 43, 57, 67]) t.push(`<rect x="${x - 0.9}" y="21.3" width="1.8" height="7.4" rx="0.5" fill="${S.cD}"/>`);
    t.push(`<circle cx="50" cy="25" r="1.7" fill="#caa34c" stroke="#8f6f2a" stroke-width="0.4"/>`);
    t.push(naht('M52.5 28 L52.5 40 Q52.5 45 49.6 46', S));
    t.push(linie('M50.2 28 L50.2 46', S.cK, 0.6, 0.7));
    for (const s of [1, -1]) {
      const X = (x) => (s > 0 ? x : 100 - x);
      t.push(naht(`M${X(70)} 30 Q${X(62)} 38 ${X(54.5)} 29`, S));
      t.push(linie(`M${X(70.3)} 29 Q${X(62)} 37 ${X(55.5)} 28`, S.cK, 0.6, 0.55));
      t.push(naht(`M${X(73)} 36 L${X(75.6)} 55`, S, 0.6));
      // Saum ausgefranst
      t.push(linie(`M${X(54)} 59.4 L${X(76)} 55.6`, hell(S.c, 0.45), 1.6, 0.85));
      for (let i = 0; i <= 12; i++) { const x = 54 + i * 1.8, y = 61.6 - i * 0.33; t.push(linie(`M${X(x)} ${f(y)} l${s * 0.2} ${1.4 + (i % 3) * 0.4}`, hell(S.c, 0.55), 0.55)); }
      // Waschung
      t.push(`<path d="M${X(58)} 33 Q${X(63)} 45 ${X(61)} 56" stroke="#fff" stroke-width="5" fill="none" opacity="0.09" stroke-linecap="round"/>`);
    }
    t.push(schatten(50, 66, 28, 2.4));
  },
  'T-Shirt'(S, t) {
    const r = [[57.5, 13, E], [70, 16.5], [79, 22], [88, 37, E], [76.5, 43.5, E], [72, 35.5], [71.5, 60], [72.5, 86, E]];
    t.push(flaeche(S, glatt([...r, [50, 87], ...sp([...r].reverse()), [42.5, 13, E], [50, 18.5]], true, 0.3)));
    t.push(flaeche(S, glatt([[42.5, 13, E], [50, 18.5], [57.5, 13, E], [59.5, 14, E], [50, 22.5], [40.5, 14, E]], true, 0.4), { ton: -0.07 }));
    t.push(linie('M72 36 Q70 31 70 18', S.cD, 0.6, 0.5), linie('M28 36 Q30 31 30 18', S.cD, 0.6, 0.5));
    t.push(naht('M77.5 41.5 L86.8 36.2', S, 0.5), naht('M22.5 41.5 L13.2 36.2', S, 0.5), naht('M28 83.5 Q50 84.6 72 83.5', S, 0.5));
    t.push(linie('M60 46 Q63 62 59 80', S.cD, 0.7, 0.35), linie('M38 52 Q36 66 40 78', S.cD, 0.6, 0.25));
  },
  Hoodie(S, t) {
    const koerper = [[60, 17, E], [72, 21], [83, 34], [87, 70, E], [79.5, 72, E], [74, 44], [72, 82, E], [50, 83], [28, 82, E], [26, 44], [20.5, 72, E], [13, 70, E], [17, 34], [28, 21], [40, 17, E], [50, 26]];
    t.push(flaeche(S, glatt(koerper, true, 0.35)));
    // Bündchen
    for (const s of [1, -1]) { const X = (x) => (s > 0 ? x : 100 - x); t.push(flaeche(S, glatt([[X(79.3), 66, E], [X(87.4), 64.5, E], [X(87.6), 71, E], [X(79.8), 72.5, E]]), { ton: -0.08 })); }
    t.push(flaeche(S, glatt([[28, 76, E], [72, 76, E], [72.2, 83, E], [50, 83.6], [27.8, 83, E]]), { ton: -0.08 }));
    // Kapuze flach aufliegend
    t.push(flaeche(S, glatt([[40, 17, E], [36.5, 9], [44, 4.5], [56, 4.5], [63.5, 9], [60, 17, E], [56, 25], [50, 29, E], [44, 25]]), { ton: -0.05 }));
    t.push(`<path d="${glatt([[44, 17], [50, 13.5], [56, 17], [53, 24], [50, 26.5], [47, 24]])}" fill="${dunkel(S.c, 0.35)}"/>`);
    t.push(linie('M47.5 26 Q47 33 47.6 39', hell(S.c, 0.55), 0.9), linie('M52.5 26 Q53 33 52.4 39', hell(S.c, 0.55), 0.9));
    t.push(`<circle cx="47.6" cy="39.6" r="0.9" fill="${hell(S.c, 0.55)}"/><circle cx="52.4" cy="39.6" r="0.9" fill="${hell(S.c, 0.55)}"/>`);
    // Kängurutasche
    t.push(flaeche(S, glatt([[36, 57, E], [64, 57, E], [68, 75, E], [32, 75, E]]), { ton: 0.03 }));
    t.push(linie('M36 57 Q33.5 66 32 75', S.cD, 0.9), linie('M64 57 Q66.5 66 68 75', S.cD, 0.9));
    t.push(linie('M28 28 Q27 40 26.5 52', S.cD, 0.6, 0.45), linie('M72 28 Q73 40 73.5 52', S.cD, 0.6, 0.45));
  },
  Kleid(S, t) {
    const r = [[56, 10, E], [62, 11, E], [64.5, 24], [61.5, 37], [61, 41, E], [72, 86, E]];
    t.push(flaeche(S, glatt([...r, [50, 88.5], ...sp([...r].reverse()), [50, 22, E]], true, 0.32)));
    t.push(`<rect x="38.6" y="37.4" width="22.8" height="3.8" rx="1" fill="${dunkel(S.c, 0.22)}"/>`);
    for (const x of [44, 50, 56]) t.push(linie(`M${x} 42 Q${x + (x - 50) * 0.4} 64 ${x + (x - 50) * 0.9} 86`, S.cD, 0.7, 0.5));
    t.push(linie('M56 10 Q55 14 50 22 Q45 14 44 10', S.cK, 0.6, 0.6));
  },
  // ─────────────────────────────────────────── Wohnen
  'Bettwäsche'(S, t, opt) {
    const S2 = opt.S2;
    t.push(schatten(50, 85, 40, 3.2));
    // Bettbezug, dreifach gefaltet: Vorderkante mit Falzen, Deckfläche leicht perspektivisch
    t.push(flaeche(S, glatt([[12, 54, E], [88, 54, E], [88, 84], [50, 85], [12, 84]], true, 0.2), { ton: -0.06 }));
    for (const y of [64, 74]) t.push(`<path d="M12 ${y} Q50 ${y + 2.4} 88 ${y}" stroke="${dunkel(S.c, 0.3)}" stroke-width="1.1" fill="none" opacity="0.7"/>`, `<path d="M12 ${y + 1.2} Q50 ${y + 3.6} 88 ${y + 1.2}" stroke="${hell(S.c, 0.35)}" stroke-width="0.7" fill="none" opacity="0.6"/>`);
    t.push(flaeche(S, glatt([[18, 44, E], [82, 44, E], [88, 54, E], [12, 54, E]], true, 0.2), { ton: 0.08 }));
    // Kissenbezug obenauf
    t.push(flaeche(S2, glatt([[22, 30, E], [78, 30, E], [81, 44.5, E], [19, 44.5, E]], true, 0.2), { ton: -0.04 }));
    t.push(flaeche(S2, glatt([[25, 24, E], [75, 24, E], [78, 30, E], [22, 30, E]], true, 0.2), { ton: 0.1 }));
    t.push(naht('M21 41.5 L79 41.5', S2, 0.45));
    // Banderole mit Etikett
    t.push(`<path d="M59 23.6 L66 23.6 L69 30 L68 84.6 L61 84.8 Z" fill="#f5f0e6"/><path d="M59 23.6 L66 23.6 L69 30 L68 84.6 L61 84.8 Z" fill="none" stroke="#cfc5b3" stroke-width="0.45"/>`);
    t.push(`<rect x="61.6" y="56" width="5.4" height="12" rx="0.8" fill="${dunkel(S.c, 0.4)}"/><path d="M63 59 v6.4 M65.4 59 v4.4" stroke="#f5f0e6" stroke-width="0.7"/>`);
  },
  Kissen(S, t) {
    t.push(schatten(50, 82, 32, 3));
    const d = glatt([[17, 22, E], [50, 25], [83, 22, E], [80, 50], [83, 78, E], [50, 75], [17, 78, E], [20, 50]], true, 0.4);
    t.push(flaeche(S, d));
    t.push(`<path d="${glatt([[24, 27], [50, 30], [76, 27], [74, 50], [76, 73], [50, 70], [24, 73], [26, 50]], true, 0.4)}" fill="none" stroke="${S.cD}" stroke-width="0.6" opacity="0.5"/>`);
    t.push(linie('M17 22 L26 30 M83 22 L74 30 M17 78 L26 70 M83 78 L74 70', S.cD, 0.7, 0.5));
    t.push(`<ellipse cx="42" cy="44" rx="16" ry="11" fill="#fff" opacity="0.1"/>`);
  },
  Duftkerze(S, t, opt) {
    // Glas mit Wachs in Farbe, Holzdeckel daneben, Etikett
    t.push(schatten(46, 86, 26, 3));
    const glas = opt.glas ?? '#e9e4da';
    t.push(`<rect x="25" y="34" width="42" height="52" rx="5" fill="${mische(S.c, '#ffffff', 0.15)}"/>`);
    t.push(`<rect x="25" y="34" width="42" height="52" rx="5" fill="${glas}" opacity="0.35"/>`);
    t.push(`<ellipse cx="46" cy="38" rx="19.5" ry="3.4" fill="${hell(S.c, 0.32)}"/>`);
    t.push(`<path d="M46 38 l0 -5" stroke="#3a2f27" stroke-width="0.9"/>`);
    t.push(`<path d="M46 25.4 Q42.6 30.2 46 33.2 Q49.4 30.2 46 25.4 Z" fill="#f6c453"/><path d="M46 28.4 Q44.6 30.8 46 32.4 Q47.4 30.8 46 28.4 Z" fill="#fff4cf"/>`);
    t.push(`<rect x="31" y="53" width="30" height="20" rx="1.2" fill="#f7f3ea"/><path d="M36 60 h20 M38 64.6 h16" stroke="${dunkel(S.c, 0.4)}" stroke-width="1"/><path d="M40 68.4 h12" stroke="#b0a89a" stroke-width="0.6"/>`);
    t.push(`<rect x="27" y="36" width="4" height="47" rx="2" fill="#fff" opacity="0.35"/><rect x="25" y="34" width="42" height="52" rx="5" fill="none" stroke="#000" stroke-opacity="0.12" stroke-width="0.6"/>`);
    // Deckel
    t.push(`<ellipse cx="78" cy="83.4" rx="13" ry="3.6" fill="#a9825a"/><rect x="65" y="77" width="26" height="6.4" fill="#b88f64"/><ellipse cx="78" cy="77" rx="13" ry="3.6" fill="#c9a074"/><ellipse cx="74" cy="76.4" rx="6" ry="1.2" fill="#fff" opacity="0.18"/>`);
  },
  Vase(S, t) {
    t.push(schatten(50, 88, 22, 3));
    const r = [[56, 14, E], [55, 20], [64, 40], [66, 62], [60, 82], [56, 87, E]];
    const d = glatt([...r, ...sp([...r].reverse())], true, 0.45);
    t.push(`<path d="${d}" fill="${S.c}"/>`);
    t.push(`<path d="${d}" fill="url(#${S.id}l)"/>`);
    for (let y = 28; y < 84; y += 5) t.push(linie(`M${f(100 - xAt(r, y))} ${y} Q50 ${y + 1.6} ${f(xAt(r, y))} ${y}`, dunkel(S.c, 0.25), 0.5, 0.35));
    t.push(`<ellipse cx="50" cy="14" rx="6" ry="1.6" fill="${dunkel(S.c, 0.45)}"/>`);
    t.push(`<path d="M41.5 34 Q38 54 42 78" stroke="#fff" stroke-width="2.4" fill="none" opacity="0.3" stroke-linecap="round"/>`);
    // Zweig
    t.push(linie('M50 14 Q52 6 60 1', '#6b5a3c', 0.9), linie('M50 14 Q46 7 38 4', '#6b5a3c', 0.8));
    for (const [x, y, w] of [[58, 2.6, 30], [55, 6.2, -20], [42, 4.6, 40], [46.5, 8.6, -30]]) t.push(`<ellipse cx="${x}" cy="${y}" rx="3.2" ry="1.4" fill="#7f9a6a" transform="rotate(${w} ${x} ${y})"/>`);
  },
};
Z.Kapuzenpullover = Z.Hoodie;
Z.Kerze = Z.Duftkerze;

function xAt(r, y) { for (let i = 0; i < r.length - 1; i++) if (y >= r[i][1] && y <= r[i + 1][1]) return r[i][0] + (r[i + 1][0] - r[i][0]) * (y - r[i][1]) / (r[i + 1][1] - r[i][1]); return r.at(-1)[0]; }

// Typ → [Faktor, Mittelpunkt x, y]: kleinere Motive füllen die Kachel
const SKALA = { 'Jeans-Shorts': [1.32, 50, 44] };

export const PRODUKT_TYPEN = Object.keys(Z);

export function produktSVG(typ, farbe, material, groesse = 160, opt = {}) {
  const zeichner = Z[typ];
  if (!zeichner) return null;
  const defs = [], t = [];
  const mat = String(material ?? '').toLowerCase().replace('bio-baumwolle', 'baumwolle');
  const S = materialDefs(farbe, mat || 'baumwolle', defs, opt.muster);
  const o = { ...opt };
  if (typ === 'Bettwäsche') o.S2 = materialDefs(opt.farbe2 ?? hell(farbeVon(farbe), 0.55), mat || 'leinen', defs, opt.muster2);
  zeichner(S, t, o);
  const sk = SKALA[typ];
  if (sk) { t.unshift(`<g transform="translate(${f(50 - sk[1] * sk[0])} ${f(50 - sk[2] * sk[0])}) scale(${sk[0]})">`); t.push('</g>'); }
  const hg = opt.hintergrund ? `<rect width="100" height="100" fill="${opt.hintergrund}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${groesse}" height="${groesse}"><defs>${defs.join('')}</defs>${hg}${t.join('')}</svg>`;
}

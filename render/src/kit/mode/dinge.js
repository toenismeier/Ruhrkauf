// Q25: Freisteller für Dinge außerhalb der Bekleidungs-Flatlays: Spezialschnitte, Home/Living, Accessoires.
// Jeder Zeichner: (S, t, p) mit Stoffkontext S (stoff.js), Teile-Array t, Bildparametern p (p.S2 = Zweitstoff).

import { glatt } from './model.js';
import { hell, dunkel, flaeche, mische } from './stoff.js';
import { naht, linie } from './flatlay.js';

const f = (n) => Math.round(n * 10) / 10;
const E = 'ecke';
const sp = (pts) => pts.map(([x, y, e]) => [100 - x, y, e]);
const X = (s, x) => (s > 0 ? x : 100 - x);
const schatten = (cx, cy, rx, ry = 3) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="0.1"/>`;
const hart = (S, d, o = {}) => `<path d="${d}" fill="${o.ton ? (o.ton > 0 ? hell(S.c, o.ton) : dunkel(S.c, -o.ton)) : S.c}"/><path d="${d}" fill="url(#${S.id}l)"/><path d="${d}" fill="none" stroke="${S.cK}" stroke-width="0.5" opacity="0.5"/>`;
function xAt(r, y) { for (let i = 0; i < r.length - 1; i++) if (y >= r[i][1] && y <= r[i + 1][1]) return r[i][0] + (r[i + 1][0] - r[i][0]) * (y - r[i][1]) / (r[i + 1][1] - r[i][1]); return r.at(-1)[0]; }

export const DINGE = {
  'jeansshorts'(S, t) {
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
  'bettwaesche'(S, t, opt) {
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
  'kissen'(S, t) {
    t.push(schatten(50, 82, 32, 3));
    const d = glatt([[17, 22, E], [50, 25], [83, 22, E], [80, 50], [83, 78, E], [50, 75], [17, 78, E], [20, 50]], true, 0.4);
    t.push(flaeche(S, d));
    t.push(`<path d="${glatt([[24, 27], [50, 30], [76, 27], [74, 50], [76, 73], [50, 70], [24, 73], [26, 50]], true, 0.4)}" fill="none" stroke="${S.cD}" stroke-width="0.6" opacity="0.5"/>`);
    t.push(linie('M17 22 L26 30 M83 22 L74 30 M17 78 L26 70 M83 78 L74 70', S.cD, 0.7, 0.5));
    t.push(`<ellipse cx="42" cy="44" rx="16" ry="11" fill="#fff" opacity="0.1"/>`);
  },
  'duftkerze'(S, t, opt) {
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
  'vase'(S, t) {
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

  handtuch(S, t) {
    // drei gefaltete Handtücher, gerollte Kante vorne, Bordüre
    t.push(schatten(50, 86, 38, 3));
    for (const [i, y] of [[0, 62], [1, 45], [2, 28]]) {
      const ton = [-0.06, 0, 0.06][i], x0 = 15 + i * 2, x1 = 85 - i * 2;
      t.push(flaeche(S, glatt([[x0, y, E], [x1, y, E], [x1 + 1.5, y + 7], [x1, y + 16, E], [x0, y + 16, E], [x0 - 1.5, y + 7]], true, 0.4), { ton }));
      t.push(linie(`M${x0 + 2} ${y + 3} Q50 ${y + 1.6} ${x1 - 2} ${y + 3}`, hell(S.c, 0.3), 0.8, 0.7));
      t.push(`<rect x="${x0}" y="${y + 10}" width="${x1 - x0}" height="2.4" fill="${dunkel(S.c, 0.2)}" opacity="0.6"/>`);
    }
  },
  plaid(S, t, p) {
    t.push(schatten(50, 82, 36, 3));
    t.push(flaeche(S, glatt([[16, 40, E], [84, 40, E], [84, 78, E], [16, 78, E]], true, 0.2), { ton: -0.06 }));
    for (const y of [52.6, 65.2]) t.push(`<path d="M16 ${y} Q50 ${y + 2} 84 ${y}" stroke="${dunkel(S.c, 0.3)}" stroke-width="1" fill="none" opacity="0.7"/>`);
    t.push(flaeche(S, glatt([[20, 26, E], [80, 26, E], [84, 40, E], [16, 40, E]], true, 0.2), { ton: 0.08 }));
    // Fransen
    for (let x = 18; x < 83; x += 2.2) t.push(linie(`M${f(x)} 78 l0.3 4`, S.cD, 0.7));
    // Rolle seitlich
    t.push(flaeche(S, glatt([[66, 18, E], [84, 18, E], [86, 24], [84, 30, E], [66, 30, E], [64, 24]], true, 0.4), { ton: -0.02 }));
    t.push(`<ellipse cx="85" cy="24" rx="2.4" ry="6" fill="${dunkel(S.c, 0.25)}"/><path d="M85 19 q-1.6 5 0 10" stroke="${hell(S.c, 0.2)}" stroke-width="0.7" fill="none"/>`);
  },
  becher(S, t) {
    t.push(schatten(46, 84, 22, 2.6));
    t.push(`<path d="M66 44 C78 44 80 64 66 66" stroke="${S.c}" stroke-width="5" fill="none"/><path d="M66 44 C78 44 80 64 66 66" stroke="#000" stroke-opacity="0.12" stroke-width="5" fill="none"/>`);
    t.push(hart(S, glatt([[26, 30, E], [68, 30, E], [66, 80], [62, 84, E], [32, 84, E], [28, 80]], true, 0.3)));
    t.push(`<ellipse cx="47" cy="30" rx="21" ry="3.6" fill="${dunkel(S.c, 0.25)}"/><ellipse cx="47" cy="30.6" rx="18.6" ry="2.8" fill="#4a2d1e"/>`);
    t.push(`<path d="M32 36 Q30 60 34 78" stroke="#fff" stroke-width="2.4" fill="none" opacity="0.35" stroke-linecap="round"/>`);
    t.push(`<path d="M28 66 Q47 70 66 66 L66 72 Q47 76 28 72 Z" fill="${hell(S.c, 0.55)}" opacity="0.8"/>`);
  },
  teller(S, t) {
    // Stapel: zwei flache Teller, tiefer Teller obenauf, Steingut mit Rand
    t.push(schatten(50, 80, 40, 4));
    for (const [y, rx] of [[74, 40], [68, 39]]) { t.push(`<ellipse cx="50" cy="${y}" rx="${rx}" ry="${rx * 0.28}" fill="${dunkel(S.c, 0.1)}"/><ellipse cx="50" cy="${y - 2}" rx="${rx}" ry="${rx * 0.28}" fill="${S.c}"/><ellipse cx="50" cy="${y - 2}" rx="${rx * 0.62}" ry="${rx * 0.17}" fill="${dunkel(S.c, 0.06)}"/>`); }
    t.push(`<path d="M18 48 Q20 66 50 66 Q80 66 82 48 Z" fill="${dunkel(S.c, 0.08)}"/><ellipse cx="50" cy="48" rx="32" ry="9" fill="${hell(S.c, 0.08)}"/><ellipse cx="50" cy="49" rx="26" ry="6.6" fill="${dunkel(S.c, 0.12)}"/>`);
    t.push(`<ellipse cx="50" cy="48" rx="32" ry="9" fill="none" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.9" stroke-dasharray="0.6 1.4"/>`);
    t.push(`<path d="M24 54 Q32 62 44 63" stroke="#fff" stroke-width="1.6" fill="none" opacity="0.4" stroke-linecap="round"/>`);
  },
  glas(S, t) {
    // zwei Wassergläser, Glas leicht getönt
    t.push(schatten(50, 86, 34, 3));
    for (const [x, h] of [[34, 46], [64, 40]]) {
      const y0 = 84 - h;
      t.push(`<path d="M${x - 11} ${y0} L${x + 11} ${y0} L${x + 9} 84 L${x - 9} 84 Z" fill="${mische(S.c, '#ffffff', 0.55)}" opacity="0.55"/>`);
      t.push(`<path d="M${x - 10} ${y0 + h * 0.4} L${x + 10} ${y0 + h * 0.4} L${x + 9} 84 L${x - 9} 84 Z" fill="${mische(S.c, '#bfe0ee', 0.5)}" opacity="0.5"/>`);
      t.push(`<ellipse cx="${x}" cy="${y0}" rx="11" ry="2.2" fill="none" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.6" opacity="0.7"/>`);
      t.push(`<path d="M${x - 11} ${y0} L${x - 9} 84 L${x + 9} 84 L${x + 11} ${y0}" fill="none" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.6" opacity="0.6"/>`);
      t.push(`<path d="M${x - 7} ${y0 + 4} L${x - 6} 80" stroke="#fff" stroke-width="1.6" opacity="0.6"/><rect x="${x - 9}" y="82" width="18" height="2.4" fill="${dunkel(S.c, 0.1)}" opacity="0.4"/>`);
    }
  },
  karaffe(S, t) {
    t.push(schatten(50, 88, 22, 3));
    const r = [[54, 10, E], [54, 30], [62, 46], [68, 64], [66, 82], [60, 87, E]];
    const d = glatt([...r, ...sp([...r].reverse())], true, 0.4);
    t.push(`<path d="${d}" fill="${mische(S.c, '#ffffff', 0.6)}" opacity="0.5"/>`);
    t.push(`<path d="${glatt([[66.5, 58, E], [68, 64], [66, 82], [60, 87, E], [40, 87, E], [34, 82], [32, 64], [33.5, 58, E]], true, 0.4)}" fill="${mische(S.c, '#cfe6ee', 0.4)}" opacity="0.55"/>`);
    t.push(`<path d="${d}" fill="none" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.7" opacity="0.7"/><ellipse cx="50" cy="10" rx="4" ry="1.2" fill="none" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.7"/>`);
    t.push(`<path d="M41 44 Q34 60 38 80" stroke="#fff" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round"/>`);
  },
  korb(S, t) {
    t.push(schatten(50, 86, 34, 3));
    const d = glatt([[16, 40, E], [84, 40, E], [78, 84, E], [22, 84, E]], true, 0.2);
    t.push(`<path d="${d}" fill="${S.c}"/>`);
    for (let y = 44; y < 84; y += 4) t.push(`<path d="M${f(16 + (y - 40) * 0.14)} ${y} Q50 ${y + 2} ${f(84 - (y - 40) * 0.14)} ${y}" stroke="${dunkel(S.c, 0.25)}" stroke-width="1.6" fill="none" opacity="0.55"/>`);
    for (let x = 22; x < 80; x += 6) t.push(linie(`M${x} 41 L${f(50 + (x - 50) * 0.88)} 84`, hell(S.c, 0.2), 1.1, 0.5));
    t.push(`<path d="${d}" fill="url(#${S.id}l)"/><ellipse cx="50" cy="40" rx="34" ry="5" fill="${dunkel(S.c, 0.35)}"/><ellipse cx="50" cy="40" rx="34" ry="5" fill="none" stroke="${hell(S.c, 0.15)}" stroke-width="2"/>`);
    for (const s of [1, -1]) t.push(`<path d="M${X(s, 80)} 44 q${s * 6} 2 ${s * 4} 9" stroke="${dunkel(S.c, 0.2)}" stroke-width="2.2" fill="none"/>`);
  },
  serviette(S, t) {
    t.push(schatten(50, 82, 34, 3));
    for (const [i, dy] of [[0, 8], [1, 0]]) t.push(flaeche(S, glatt([[22 + i * 3, 30 + dy, E], [78 - i * 3, 30 + dy, E], [78 - i * 3, 74 + dy, E], [22 + i * 3, 74 + dy, E]], true, 0.2), { ton: i ? 0.04 : -0.06 }));
    t.push(naht('M28 34 L72 34 L72 70 L28 70 Z', S, 0.6));
    t.push(`<rect x="44" y="26" width="12" height="52" rx="2" fill="#d8c7a6"/><rect x="44" y="26" width="12" height="52" rx="2" fill="none" stroke="#a8946d" stroke-width="0.5"/>`);
  },
  bilderrahmen(S, t) {
    t.push(schatten(52, 86, 28, 2.6));
    t.push(hart(S, 'M22 14 L78 14 L78 84 L22 84 Z'));
    t.push(`<rect x="28" y="20" width="44" height="58" fill="#f6f3ec"/><rect x="34" y="27" width="32" height="44" fill="#dfe6e2"/>`);
    t.push(`<path d="M34 62 Q42 50 50 58 Q58 46 66 56 L66 71 L34 71 Z" fill="#b9c6b0"/><circle cx="59" cy="36" r="4" fill="#e7c17a"/>`);
    t.push(`<path d="M22 14 L28 20 M78 14 L72 20 M22 84 L28 78 M78 84 L72 78" stroke="${S.cK}" stroke-width="0.5" opacity="0.6"/>`);
  },
  teppich(S, t, p) {
    t.push(schatten(50, 82, 40, 3));
    // aufgerollt halb: Fläche in leichter Perspektive mit Muster, Rolle hinten
    t.push(`<path d="M12 78 L88 78 L80 40 L20 40 Z" fill="${S.c}"/><path d="M12 78 L88 78 L80 40 L20 40 Z" fill="url(#${S.id}l)"/>`);
    t.push(`<path d="M18 74 L82 74 L76 44 L24 44 Z" fill="none" stroke="${hell(S.c, 0.5)}" stroke-width="1.4"/>`);
    t.push(`<path d="M50 48 L62 59 L50 70 L38 59 Z" fill="none" stroke="${dunkel(S.c, 0.3)}" stroke-width="1.6"/><path d="M50 53 L56.4 59 L50 65 L43.6 59 Z" fill="${hell(S.c, 0.5)}"/>`);
    t.push(`<rect x="20" y="31" width="60" height="10" rx="5" fill="${dunkel(S.c, 0.12)}"/><ellipse cx="80" cy="36" rx="3" ry="5" fill="${dunkel(S.c, 0.35)}"/><path d="M80 32 q-2 4 0 8" stroke="${hell(S.c, 0.3)}" stroke-width="0.7" fill="none"/>`);
    for (let x = 13; x < 88; x += 2.4) t.push(linie(`M${f(x)} 78 l0 3`, hell(S.c, 0.4), 0.6));
  },
  cap(S, t) {
    t.push(schatten(50, 76, 32, 3));
    t.push(flaeche(S, glatt([[20, 62, E], [24, 40], [36, 28], [50, 25], [64, 28], [76, 40], [80, 62, E]], true, 0.4)));
    for (const x of [36, 50, 64]) t.push(linie(`M50 25.5 Q${x} 42 ${x + (x - 50) * 0.4} 62`, S.cD, 0.6, 0.7));
    t.push(`<circle cx="50" cy="25.6" r="1.6" fill="${S.cD}"/>`);
    t.push(flaeche(S, glatt([[18, 60, E], [82, 60, E], [86, 66], [72, 74], [50, 76], [28, 74], [14, 66]], true, 0.45), { ton: -0.1 }));
    t.push(naht('M22 68 Q50 76 78 68', S, 0.6));
  },
  buckethat(S, t) {
    t.push(schatten(50, 78, 38, 3));
    t.push(flaeche(S, glatt([[30, 58, E], [32, 34], [50, 28], [68, 34], [70, 58, E]], true, 0.4)));
    t.push(flaeche(S, glatt([[30, 56, E], [70, 56, E], [88, 68], [74, 76], [50, 78], [26, 76], [12, 68]], true, 0.45), { ton: -0.06 }));
    for (const y of [62, 67, 72]) t.push(naht(`M${f(20 + (y - 60) * 0.4)} ${y} Q50 ${y + 7} ${f(80 - (y - 60) * 0.4)} ${y}`, S, 0.45));
    t.push(`<rect x="30" y="50" width="40" height="5" fill="${S.cD}" opacity="0.6"/>`);
  },
  tote(S, t) {
    t.push(schatten(50, 88, 30, 3));
    for (const s of [1, -1]) t.push(`<path d="M${X(s, 40)} 40 Q${X(s, 40)} 12 ${X(s, 50 + s * 0)} 12" stroke="${S.cD}" stroke-width="3" fill="none"/>`);
    t.push(`<path d="M40 40 Q40 14 50 14 Q60 14 60 40" stroke="${S.cD}" stroke-width="3" fill="none"/>`);
    t.push(flaeche(S, glatt([[24, 38, E], [76, 38, E], [80, 86, E], [20, 86, E]], true, 0.2)));
    t.push(naht('M26 42 L74 42', S, 0.6), `<rect x="38" y="56" width="24" height="14" rx="1" fill="${hell(S.c, 0.4)}" opacity="0.5"/>`);
  },
  rucksack(S, t) {
    t.push(schatten(50, 90, 26, 3));
    t.push(`<path d="M42 16 Q50 6 58 16" stroke="${S.cD}" stroke-width="2.6" fill="none"/>`);
    t.push(flaeche(S, glatt([[28, 26], [50, 16], [72, 26], [75, 84, E], [25, 84, E]], true, 0.4)));
    t.push(flaeche(S, glatt([[28, 26], [50, 16], [72, 26], [73, 40, E], [27, 40, E]], true, 0.4), { ton: -0.08 }));
    t.push(flaeche(S, glatt([[34, 56, E], [66, 56, E], [67, 80, E], [33, 80, E]], true, 0.3), { ton: 0.05 }));
    t.push(linie('M34 58 L66 58', '#c9c6bf', 0.9), `<rect x="61" y="56.4" width="2" height="4" rx="0.4" fill="#c9c6bf"/>`);
    t.push(linie('M29 40 L71 40', '#c9c6bf', 0.9));
  },
  loafer(S, t) {
    t.push(schatten(52, 80, 40, 3));
    const schuh = (dx, dy, k, ton) => {
      const g = [];
      const P = (pts) => pts.map(([x, y, e]) => [dx + x * k, dy + y * k, e]);
      // Sohle und Absatz
      g.push(`<path d="${glatt(P([[10, 70, E], [88, 69, E], [92, 72], [88, 75, E], [24, 75, E], [24, 78, E], [11, 78, E]]), true, 0.3)}" fill="${dunkel(S.c, 0.55)}"/>`);
      g.push(`<path d="M${dx + 24 * k} ${dy + 74.6 * k} L${dx + 88 * k} ${dy + 74.6 * k}" stroke="${hell(S.c, 0.25)}" stroke-width="0.5" opacity="0.5"/>`);
      // Schaft
      const schaft = glatt(P([[11, 70, E], [10, 56], [14, 49], [22, 47.6], [34, 50.6], [46, 51], [58, 48.6], [70, 50], [82, 55], [90, 62], [90, 68], [86, 70, E]]), true, 0.4);
      g.push(flaeche(S, schaft, { ton }));
      // Fußöffnung
      g.push(`<path d="${glatt(P([[14.5, 50], [22, 48.8], [34, 51.4], [44, 51.8], [34, 53.6], [22, 52.6]]), true, 0.4)}" fill="${dunkel(S.c, 0.6)}"/>`);
      // Mokassinnaht und Riegel
      g.push(`<path d="M${dx + 46 * k} ${dy + 52.4 * k} Q${dx + 60 * k} ${dy + 49.4 * k} ${dx + 74 * k} ${dy + 52.6 * k} Q${dx + 86 * k} ${dy + 57 * k} ${dx + 88.6 * k} ${dy + 63 * k}" stroke="${dunkel(S.c, 0.35)}" stroke-width="${0.8 * k}" fill="none"/>`);
      g.push(`<path d="M${dx + 46.6 * k} ${dy + 53.6 * k} Q${dx + 60 * k} ${dy + 50.8 * k} ${dx + 73.6 * k} ${dy + 54 * k}" stroke="${hell(S.c, 0.4)}" stroke-width="${0.45 * k}" stroke-dasharray="${1 * k} ${0.8 * k}" fill="none" opacity="0.8"/>`);
      g.push(`<path d="${glatt(P([[45, 53.4, E], [60, 50.4, E], [62, 56.6, E], [46.4, 59.4, E]]), true, 0.2)}" fill="${dunkel(S.c, 0.2)}"/>`);
      g.push(`<path d="${glatt(P([[51, 54.6, E], [56, 53.6, E], [56.6, 56.6, E], [51.6, 57.6, E]]), true, 0.2)}" fill="${dunkel(S.c, 0.55)}"/>`);
      // Ferse, Glanz
      g.push(`<path d="M${dx + 12 * k} ${dy + 58 * k} Q${dx + 16 * k} ${dy + 64 * k} ${dx + 13 * k} ${dy + 69 * k}" stroke="${dunkel(S.c, 0.25)}" stroke-width="${0.6 * k}" fill="none"/>`);
      g.push(`<path d="M${dx + 66 * k} ${dy + 53.4 * k} Q${dx + 80 * k} ${dy + 56 * k} ${dx + 86 * k} ${dy + 63 * k}" stroke="#fff" stroke-width="${1.6 * k}" fill="none" opacity="0.35" stroke-linecap="round"/>`);
      return g.join('');
    };
    t.push(schuh(4, -14, 0.92, -0.12), schuh(-2, 0, 1, 0));
  },
  sandale(S, t) {
    t.push(schatten(50, 86, 36, 3));
    const bett = [[0, -32], [7.4, -29], [10.6, -18], [10, -6], [7.6, 6], [8.4, 18], [7.6, 28], [0, 33], [-6.4, 28], [-7.4, 16], [-8.4, 4], [-9.6, -10], [-8.8, -24], [-5, -31]];
    const sandale = (cx, cy, rot, spiegel) => {
      const g = [`<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${spiegel} 1)">`];
      g.push(`<path d="${glatt(bett.map(([x, y]) => [x * 1.12, y * 1.04 + 1.6]))}" fill="${dunkel('#c7a77d', 0.25)}"/>`);
      g.push(`<path d="${glatt(bett.map(([x, y]) => [x * 1.08, y]))}" fill="#c7a77d"/>`);
      g.push(`<path d="${glatt(bett.map(([x, y]) => [x * 0.9, y * 0.94 - 0.4]))}" fill="#e7d3b1"/>`);
      g.push(`<ellipse cx="0.6" cy="-24" rx="5.6" ry="4" fill="#d9c19c" opacity="0.7"/><ellipse cx="0" cy="22" rx="4.6" ry="5" fill="#d9c19c" opacity="0.7"/>`);
      // Riemen
      g.push(flaeche(S, glatt([[-11.6, -19, E], [12, -21, E], [12.4, -12, E], [-11.2, -9.6, E]], true, 0.3)));
      g.push(flaeche(S, glatt([[-10.6, 2, E], [10.4, 0, E], [10.8, 8.4, E], [-10.2, 10.4, E]], true, 0.3)));
      for (const y of [-15.4, 5.2]) {
        g.push(`<rect x="7.6" y="${y - 3.6}" width="5" height="7.2" rx="1" fill="none" stroke="#c9a24a" stroke-width="1.1"/>`);
        g.push(`<path d="M-9 ${y - 2.6} L7 ${y - 3.6} M-9 ${y + 2.6} L7 ${y + 1.8}" stroke="${hell(S.c, 0.35)}" stroke-width="0.4" stroke-dasharray="0.9 0.7"/>`);
      }
      g.push('</g>');
      return g.join('');
    };
    t.push(sandale(36, 50, -6, -1), sandale(64, 48, 6, 1));
  },
  schal(S, t) {
    t.push(schatten(50, 86, 34, 3));
    // gefaltetes Paket mit Faltkanten
    t.push(flaeche(S, glatt([[20, 30, E], [80, 30, E], [80, 70, E], [20, 70, E]], true, 0.2), { ton: -0.06 }));
    for (const y of [43.3, 56.6]) t.push(`<path d="M20 ${y} Q50 ${y + 1.6} 80 ${y}" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.9" fill="none" opacity="0.7"/><path d="M20 ${y + 1} Q50 ${y + 2.6} 80 ${y + 1}" stroke="${hell(S.c, 0.3)}" stroke-width="0.6" fill="none" opacity="0.5"/>`);
    t.push(flaeche(S, glatt([[22, 24, E], [78, 24, E], [80, 30, E], [20, 30, E]], true, 0.2), { ton: 0.08 }));
    // herabhängendes Ende mit Fransen
    const ende = [[56, 28, E], [76, 28, E], [74, 46], [72, 66], [70, 84, E], [50, 84, E], [52, 64], [54, 46]];
    t.push(flaeche(S, glatt(ende, true, 0.35)));
    t.push(`<path d="M56 28 Q66 33 76 28" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.9" fill="none"/>`);
    for (let i = 0; i <= 12; i++) { const x = 50.6 + i * 1.6; t.push(linie(`M${f(x)} 84 l${f(-0.2 + (i % 3) * 0.2)} ${4 + (i % 2) * 0.8}`, dunkel(S.c, 0.12), 0.8)); }
    t.push(`<path d="M51.4 80 L70.4 80" stroke="${hell(S.c, 0.3)}" stroke-width="1.2" opacity="0.5"/>`);
    t.push(`<path d="M60 34 Q58 56 56 78" stroke="#fff" stroke-width="2" fill="none" opacity="0.12" stroke-linecap="round"/>`);
  },
  guertel(S, t) {
    t.push(schatten(50, 82, 34, 3));
    // aufgerollter Gürtel von oben: Spirale, außen das Schnallenende
    const pts = [];
    for (let a = 0; a <= Math.PI * 4.2; a += Math.PI / 10) { const r = 9 + 7.2 * a / (2 * Math.PI); pts.push([46 + Math.cos(a) * r, 50 + Math.sin(a) * r * 0.86]); }
    const d = glatt(pts, false, 0.5);
    t.push(`<path d="${d}" stroke="${dunkel(S.c, 0.45)}" stroke-width="8" fill="none" stroke-linecap="butt"/>`);
    t.push(`<path d="${d}" stroke="${S.c}" stroke-width="6.6" fill="none"/>`);
    t.push(`<path d="${d}" stroke="${hell(S.c, 0.4)}" stroke-width="0.5" stroke-dasharray="1.1 0.8" fill="none" opacity="0.8" transform="translate(-0.4 -0.6)"/>`);
    t.push(`<path d="${d}" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.14" transform="translate(-1.2 -1.6)"/>`);
    // Spitze innen mit Löchern
    const [x0, y0] = pts[0];
    t.push(`<circle cx="${f(x0)}" cy="${f(y0 - 0.2)}" r="3.3" fill="${S.c}"/>`);
    for (const k of [2, 4]) { const [x, y] = pts[k]; t.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="0.9" ry="0.8" fill="${dunkel(S.c, 0.6)}"/>`); }
    // Schnalle am äußeren Ende
    const [xe, ye] = pts.at(-1);
    t.push(`<rect x="${f(xe - 2)}" y="${f(ye - 6.6)}" width="10" height="13.2" rx="2.6" fill="none" stroke="#7f858c" stroke-width="2.6"/>`);
    t.push(`<rect x="${f(xe - 2)}" y="${f(ye - 6.6)}" width="10" height="13.2" rx="2.6" fill="none" stroke="#d9dde1" stroke-width="1.4"/>`);
    t.push(`<path d="M${f(xe - 2)} ${f(ye)} L${f(xe + 6)} ${f(ye)}" stroke="#aeb3b8" stroke-width="1.2" stroke-linecap="round"/>`);
    t.push(`<rect x="${f(xe - 6)}" y="${f(ye - 3.6)}" width="4.2" height="7.2" rx="0.6" fill="${dunkel(S.c, 0.25)}"/>`);
  },
  lippenstift(S, t) {
    t.push(schatten(50, 86, 24, 2.6));
    t.push(`<rect x="30" y="52" width="16" height="34" rx="1.4" fill="#2c2b2e"/><rect x="31" y="52" width="3" height="34" fill="#fff" opacity="0.18"/><rect x="31.6" y="44" width="12.8" height="9" fill="#c9a24a"/>`);
    t.push(`<path d="M33 44 L33 30 Q38 22 43 26 L43 44 Z" fill="${S.c}"/><path d="M33 44 L33 30 Q38 22 43 26 L43 44 Z" fill="url(#${S.id}l)"/>`);
    t.push(`<rect x="54" y="38" width="16" height="48" rx="1.4" fill="#2c2b2e"/><rect x="55" y="38" width="3" height="48" fill="#fff" opacity="0.18"/><rect x="54" y="66" width="16" height="2.4" fill="#c9a24a"/>`);
  },
};

// Q29: Tisch und Küche – Steingut mit Reaktivglasur, Glas, Edelstahl, Holz. Produktfoto mit Standfläche.

import { f, E, glatt, hell, dunkel, mische, linie, boden, form, zylinder, glas, maserung, rund, metall, glanz, stoff2 } from './q29-hilfen.js';

const TON = '#b58866'; // roher Scherben am Rand (Steingut)
let n = 0;
// Sprenkel der Reaktivglasur
function sprenkel(S, d) {
  const id = 'sp' + (++n).toString(36) + Math.random().toString(36).slice(2, 5);
  const c = dunkel(S.c, 0.55);
  S.defs.push(`<pattern id="${id}" width="9" height="7" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.4" r="0.35" fill="${c}" opacity="0.55"/><circle cx="5.6" cy="2.2" r="0.25" fill="${c}" opacity="0.5"/><circle cx="3.4" cy="5.2" r="0.3" fill="${c}" opacity="0.45"/><circle cx="7.8" cy="5.8" r="0.22" fill="${c}" opacity="0.5"/></pattern>`);
  return `<path d="${d}" fill="url(#${id})"/>`;
}
const ell = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;

// flacher Teller: Unterseite, Fahne, Spiegel, roher Rand
function teller(S, cx, cy, rx, k = 0.36, farbe = S.c) {
  const ry = rx * k;
  const t = [];
  t.push(`<path d="M${f(cx - rx)} ${f(cy)} Q${f(cx - rx * 0.9)} ${f(cy + ry + 3)} ${f(cx)} ${f(cy + ry + 3)} Q${f(cx + rx * 0.9)} ${f(cy + ry + 3)} ${f(cx + rx)} ${f(cy)} Z" fill="${dunkel(farbe, 0.16)}"/>`);
  const ob = ell(cx, cy, rx, ry);
  t.push(form(S, ob, farbe, { ko: 0.3 }), sprenkel(S, ob));
  const sp = ell(cx, cy + ry * 0.08, rx * 0.64, ry * 0.6);
  t.push(`<path d="${sp}" fill="${dunkel(farbe, 0.07)}"/>`, `<path d="M${f(cx - rx * 0.6)} ${f(cy + ry * 0.1)} A${f(rx * 0.62)} ${f(ry * 0.58)} 0 0 1 ${f(cx + rx * 0.6)} ${f(cy + ry * 0.1)}" stroke="${dunkel(farbe, 0.18)}" stroke-width="0.6" fill="none" opacity="0.6"/>`);
  t.push(`<path d="${ob}" fill="none" stroke="${TON}" stroke-width="0.9" opacity="0.8"/>`);
  return t.join('');
}
// Schale: Außenwand, Innenseite, Standring
function schale(S, cx, cy, rx, tiefe, farbe = S.c, innen) {
  const ry = rx * 0.32;
  const t = [];
  const wand = `M${f(cx - rx)} ${f(cy)} C${f(cx - rx)} ${f(cy + tiefe * 0.9)} ${f(cx - rx * 0.5)} ${f(cy + tiefe)} ${f(cx - rx * 0.38)} ${f(cy + tiefe)} L${f(cx + rx * 0.38)} ${f(cy + tiefe)} C${f(cx + rx * 0.5)} ${f(cy + tiefe)} ${f(cx + rx)} ${f(cy + tiefe * 0.9)} ${f(cx + rx)} ${f(cy)} Z`;
  t.push(form(S, wand, farbe, { licht: 'rund' }), sprenkel(S, wand));
  t.push(`<rect x="${f(cx - rx * 0.36)}" y="${f(cy + tiefe - 0.4)}" width="${f(rx * 0.72)}" height="1.6" rx="0.6" fill="${TON}"/>`);
  const ic = innen ?? hell(farbe, 0.06);
  t.push(`<path d="${ell(cx, cy, rx, ry)}" fill="${dunkel(ic, 0.12)}"/>`);
  t.push(`<path d="M${f(cx - rx + 1.2)} ${f(cy + 0.4)} A${f(rx - 1.2)} ${f(ry - 0.6)} 0 0 0 ${f(cx + rx - 1.2)} ${f(cy + 0.4)} A${f(rx - 1.2)} ${f(ry * 1.6)} 0 0 1 ${f(cx - rx + 1.2)} ${f(cy + 0.4)} Z" fill="${ic}"/>`);
  t.push(`<path d="${ell(cx, cy, rx, ry)}" fill="none" stroke="${TON}" stroke-width="0.8" opacity="0.85"/>`);
  return t.join('');
}
// Becher ohne Henkel (konisch)
function becher(S, cx, yb, rb, rt, h, farbe, glasur = true) {
  const yt = yb - h, ry = rt * 0.3;
  const d = `M${f(cx - rt)} ${f(yt)} L${f(cx - rb)} ${f(yb)} A${f(rb)} ${f(rb * 0.3)} 0 0 0 ${f(cx + rb)} ${f(yb)} L${f(cx + rt)} ${f(yt)} Z`;
  const t = [form(S, d, farbe, { licht: 'rund' })];
  if (glasur) { t.push(sprenkel(S, d)); const g = `M${f(cx - rb * 1.02)} ${f(yb - h * 0.18)} L${f(cx - rb)} ${f(yb)} A${f(rb)} ${f(rb * 0.3)} 0 0 0 ${f(cx + rb)} ${f(yb)} L${f(cx + rb * 1.02)} ${f(yb - h * 0.18)} A${f(rb * 1.02)} ${f(rb * 0.3)} 0 0 1 ${f(cx - rb * 1.02)} ${f(yb - h * 0.18)} Z`; t.push(`<path d="${g}" fill="${TON}"/>`, `<path d="${g}" fill="${rund(S)}"/>`); }
  t.push(`<path d="${ell(cx, yt, rt, ry)}" fill="${dunkel(farbe, 0.25)}"/><path d="${ell(cx, yt, rt, ry)}" fill="none" stroke="${hell(farbe, 0.2)}" stroke-width="0.8"/>`);
  return t.join('');
}

export const TISCH = {
  // Teller-Stapel: drei flache Teller Ø 27 cm, Reaktivglasur mit Sprenkeln, roher Rand.
  // Maß: Aufsicht 20° (ry = 0,36 rx), Stapelhöhe 1,2 cm je Teller.
  teller(S, t) {
    t.push(boden(50, 80, 42, 3.4));
    for (const [i, y] of [[0, 66], [1, 59], [2, 52]]) t.push(teller(S, 50, y, 40 - i * 0.4, 0.36, [dunkel(S.c, 0.04), S.c, hell(S.c, 0.03)][i]));
    // zweiter, kleiner Teller schräg angelehnt dahinter
    t.push(`<g transform="rotate(-8 74 40)">${teller(S, 74, 34, 16, 0.92, hell(S.c, 0.04))}</g>`);
    t.push(`<path d="M24 50 Q30 58 44 59" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.35" stroke-linecap="round"/>`);
  },

  // Geschirrset: Speiseteller Ø 27, Frühstücksteller Ø 21, Schale Ø 15 gestapelt, Becher daneben.
  // Maß: Teller : Frühstücksteller : Schale = 1 : 0,78 : 0,55.
  geschirrset(S, t) {
    t.push(boden(54, 82, 42, 3.4));
    t.push(teller(S, 56, 70, 38));
    t.push(teller(S, 56, 62, 29.5, 0.36, hell(S.c, 0.04)));
    t.push(schale(S, 56, 40, 21, 18, S.c));
    // Becher mit Henkel links vorn
    t.push(`<path d="M8.6 62 C1 62 1 76 9.4 76" stroke="${dunkel(S.c, 0.08)}" stroke-width="3" fill="none"/>`);
    t.push(becher(S, 18, 88, 9, 10, 26, dunkel(S.c, 0.05)));
  },

  // Schalen: drei Müslischalen Ø 15/13/11, gestaffelt, Innenseite heller glasiert.
  // Maß: Tiefe 0,45 des Durchmessers, Standring 0,36 Ø.
  schalen(S, t) {
    t.push(boden(50, 86, 42, 3.2));
    t.push(schale(S, 70, 34, 18, 16, dunkel(S.c, 0.1)));
    t.push(schale(S, 28, 40, 20, 18, hell(S.c, 0.06)));
    t.push(schale(S, 52, 58, 27, 24, S.c));
  },

  // Besteck: Tafelgabel, Tafelmesser, Esslöffel, Länge 21 cm, nebeneinander auf Leinen.
  // Maß: Griffbreite 1/10 der Länge, Gabel vier Zinken auf 1/4 Länge, Löffelmulde 1/3 Länge.
  besteck(S, t) {
    t.push(`<path d="M14 10 L86 8 L88 90 L12 92 Z" fill="#ebe5d8"/><path d="M14 10 L86 8 L88 90 L12 92 Z" fill="none" stroke="#cfc6b4" stroke-width="0.5"/>`);
    for (let x = 16; x < 86; x += 3.4) t.push(linie(`M${f(x)} 10 L${f(x - 1.6)} 91`, '#000', 0.25, 0.06));
    const st = S.c, M = (d) => form(S, d, st, { licht: 'metall', ko: 0.6 });
    // Gabel
    t.push(`<g transform="rotate(-3 30 50)">`, M('M27 50 L33 50 L33.4 84 Q30 88 26.6 84 Z'), M('M26 14 L34 14 L34 38 Q34 46 31.2 50 L28.8 50 Q26 46 26 38 Z'));
    for (const x of [28, 30, 32]) t.push(`<rect x="${x - 0.4}" y="13" width="0.8" height="16" fill="#ebe5d8"/>`);
    t.push('</g>');
    // Messer
    t.push(`<g transform="rotate(1 50 50)">`, M('M47.4 12 Q53.6 14 53 46 L47.4 46 Z'), M('M46.8 46 L53.2 46 L53.6 86 Q50 90 46.4 86 Z'), linie('M48.6 16 L48.6 44', '#fff', 0.5, 0.6), '</g>');
    // Löffel
    t.push(`<g transform="rotate(4 70 50)">`, M('M64 24 Q64 11 70 11 Q76 11 76 24 Q76 34 71.2 37 L71.6 84 Q70 88 68.4 84 L68.8 37 Q64 34 64 24 Z'), `<ellipse cx="70" cy="22" rx="4.2" ry="8" fill="#fff" opacity="0.25"/>`, '</g>');
  },

  // Wassergläser (Tumbler 0,3 l), geriffelt, eines mit Wasser.
  // Maß: Höhe : Durchmesser = 1,2 : 1, Riffelung 12 Rippen.
  wasserglas(S, t) {
    t.push(boden(50, 86, 38, 3));
    for (const [cx, h, voll] of [[30, 44, false], [64, 52, true]]) {
      const rx = h / 2.3, yb = 84, yt = yb - h;
      const d = `M${f(cx - rx)} ${f(yt)} L${f(cx - rx * 0.92)} ${f(yb)} A${f(rx * 0.92)} ${f(rx * 0.26)} 0 0 0 ${f(cx + rx * 0.92)} ${f(yb)} L${f(cx + rx)} ${f(yt)} Z`;
      t.push(glas(S, d, { ton: mische(S.c, '#e8f0f2', 0.6) }));
      if (voll) t.push(`<path d="M${f(cx - rx * 0.95)} ${f(yt + h * 0.35)} L${f(cx - rx * 0.92)} ${f(yb - 1)} A${f(rx * 0.9)} ${f(rx * 0.24)} 0 0 0 ${f(cx + rx * 0.92)} ${f(yb - 1)} L${f(cx + rx * 0.95)} ${f(yt + h * 0.35)} Z" fill="${mische(S.c, '#bcdbe6', 0.5)}" opacity="0.5"/><ellipse cx="${cx}" cy="${f(yt + h * 0.35)}" rx="${f(rx * 0.95)}" ry="${f(rx * 0.26)}" fill="#e6f2f6" opacity="0.8" stroke="#9cb7c0" stroke-width="0.4"/>`);
      for (let i = 1; i < 12; i++) { const a = -1 + i / 6; t.push(linie(`M${f(cx + a * rx * 0.98)} ${f(yt + 3)} L${f(cx + a * rx * 0.9)} ${f(yb - 2)}`, '#7f949c', 0.4, 0.35 + 0.25 * (1 - Math.abs(a)))); }
      t.push(`<ellipse cx="${cx}" cy="${f(yt)}" rx="${f(rx)}" ry="${f(rx * 0.26)}" fill="none" stroke="#7f949c" stroke-width="0.6"/>`);
      t.push(`<path d="M${f(cx - rx * 0.92)} ${f(yb - 2.4)} A${f(rx * 0.92)} ${f(rx * 0.26)} 0 0 0 ${f(cx + rx * 0.92)} ${f(yb - 2.4)}" stroke="#7f949c" stroke-width="1.6" fill="none" opacity="0.35"/>`);
    }
  },

  // Weinglas (Bordeaux), Kelch Ø 9, Stiel 9 cm, Fuß Ø 8, Rotwein bis zur breitesten Stelle.
  // Maß: Kelch : Stiel : Gesamt = 0,5 : 0,4 : 1.
  weinglas(S, t) {
    t.push(boden(50, 91, 22, 2.4));
    const kelch = 'M35 10 C33 24 30 40 38 49 C42 53 47 54 50 54 C53 54 58 53 62 49 C70 40 67 24 65 10 Z';
    t.push(`<path d="M32.4 34 C32 42 34 47 38 49 C42 53 47 54 50 54 C53 54 58 53 62 49 C66 47 68 42 67.6 34 Z" fill="${S.c}" opacity="0.88"/>`);
    t.push(`<ellipse cx="50" cy="34" rx="17.6" ry="3" fill="${hell(S.c, 0.2)}" opacity="0.9"/>`);
    t.push(glas(S, kelch, { deck: 0.25 }));
    t.push(`<ellipse cx="50" cy="10" rx="15" ry="2.2" fill="none" stroke="#7f949c" stroke-width="0.6"/>`);
    t.push(`<path d="M48.8 54 L48.6 86 M51.2 54 L51.4 86" stroke="#8ea2aa" stroke-width="0.7"/><path d="M48.8 54 L51.2 54 L51.4 86 L48.6 86 Z" fill="#e8f0f2" opacity="0.6"/>`);
    t.push(`<ellipse cx="50" cy="88" rx="15" ry="3.2" fill="#e8f0f2" opacity="0.7" stroke="#7f949c" stroke-width="0.6"/>`);
    t.push(`<path d="M38 18 C36 28 36 38 40 45" stroke="#fff" stroke-width="1.6" fill="none" opacity="0.7" stroke-linecap="round"/>`);
  },

  // Becher-Set: drei henkellose Becher 0,25 l, Glasurverlauf, unglasierter Fuß.
  // Maß: Höhe : Ø oben = 1,1 : 1, unten 0,8.
  becherset(S, t) {
    t.push(boden(50, 86, 42, 3));
    t.push(becher(S, 28, 70, 11, 13.6, 30, hell(S.c, 0.25)));
    t.push(becher(S, 72, 70, 11, 13.6, 30, dunkel(S.c, 0.18)));
    t.push(becher(S, 50, 86, 12, 15, 33, S.c));
  },

  // Teekanne 1,2 l, kugelig, Ausguss geschwungen, Bügelgriff aus Rattan.
  // Maß: Körper Ø 1,2 × Höhe, Ausguss auf 2/3 Höhe, Griffbogen 0,6 Ø über dem Deckel.
  teekanne(S, t) {
    t.push(boden(50, 88, 34, 3));
    const r = '#b98f5f';
    t.push(`<path d="M28 44 C26 14 74 14 72 44" stroke="${dunkel(r, 0.2)}" stroke-width="3.6" fill="none"/><path d="M28 44 C26 14 74 14 72 44" stroke="${r}" stroke-width="2.4" fill="none" stroke-dasharray="1.6 0.8"/>`);
    t.push(form(S, 'M70 58 C80 56 82 48 90 40 Q92 39 91.6 42 C86 52 84 64 72 72 Z', S.c, { licht: 'rund' }));
    const k = 'M24 48 C18 62 22 84 50 86 C78 84 82 62 76 48 C72 40 28 40 24 48 Z';
    t.push(form(S, k, S.c, { licht: 'rund' }), sprenkel(S, k));
    t.push(`<ellipse cx="50" cy="45" rx="20" ry="4.2" fill="${dunkel(S.c, 0.12)}"/><path d="M33 44 Q50 34 67 44 Q50 48 33 44 Z" fill="${hell(S.c, 0.1)}"/><ellipse cx="50" cy="38.6" rx="3.4" ry="2.4" fill="${dunkel(S.c, 0.1)}"/>`);
    for (const x of [28, 72]) t.push(`<rect x="${x - 2}" y="43" width="4" height="4" rx="1" fill="${dunkel(r, 0.3)}"/>`);
    t.push(`<path d="M30 56 Q28 70 36 78" stroke="#fff" stroke-width="2" fill="none" opacity="0.3" stroke-linecap="round"/>`);
  },

  // Kochtopf 20 cm Edelstahl, zwei Griffe, Glasdeckel mit Dampfloch und Knauf.
  // Maß: Höhe : Ø = 0,62, Griffe auf 80 % Höhe.
  topf(S, t) {
    t.push(boden(50, 86, 38, 3));
    t.push(zylinder(S, 50, 42, 82, 30, 9, S.c, { metall: true, deckel: false }));
    for (const s of [-1, 1]) t.push(form(S, `M${50 + s * 30} 46 L${50 + s * 41} 45 Q${50 + s * 43} 47 ${50 + s * 41} 49 L${50 + s * 30} 51 Z`, dunkel(S.c, 0.15), { licht: 'metall' }));
    t.push(`<ellipse cx="50" cy="42" rx="30.6" ry="9.2" fill="${dunkel(S.c, 0.2)}"/>`);
    t.push(glas(S, 'M19 42 Q22 31 50 29 Q78 31 81 42 Q50 50 19 42 Z', { ton: '#e9eef0', deck: 0.55 }));
    t.push(`<ellipse cx="50" cy="42" rx="31" ry="8.6" fill="none" stroke="${dunkel(S.c, 0.1)}" stroke-width="1.4"/>`);
    t.push(form(S, 'M45 29 L55 29 L54 23 Q50 21 46 23 Z', '#2f3237'), `<circle cx="64" cy="35" r="0.9" fill="#556"/>`);
    t.push(`<path d="M24 40 Q32 33 44 31.6" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.8" stroke-linecap="round"/>`);
  },

  // Bratpfanne 28 cm, antihaftbeschichtet, Stielgriff Holz, Aufsicht 30°.
  // Maß: Stiel 0,8 Ø, Randhöhe 0,16 Ø.
  pfanne(S, t) {
    t.push(boden(42, 74, 36, 3.4));
    const holz = '#a77c52';
    t.push(form(S, 'M70 50 L94 82 Q96 86 92 87 Q89 88 87 85 L64 54 Z', holz, { licht: 'rund' }), maserung(S, 'M70 50 L94 82 Q96 86 92 87 Q89 88 87 85 L64 54 Z', holz, 3, 60, 96, 50, 88));
    t.push(form(S, 'M66 50 L72 47 L74 54 L68 56 Z', '#7f858c', { licht: 'metall' }));
    t.push(`<path d="M6 42 Q8 66 40 68 Q72 66 74 42 Z" fill="${dunkel(S.c, 0.1)}"/><path d="M6 42 Q8 66 40 68 Q72 66 74 42 Z" fill="${metall(S)}"/>`);
    t.push(`<path d="${ell(40, 42, 34, 13)}" fill="${S.c}"/><path d="${ell(40, 43.6, 29.6, 10.6)}" fill="#2d2f33"/><path d="${ell(40, 44.4, 24, 8)}" fill="#3a3d42"/>`);
    t.push(`<path d="M18 40 Q26 35 40 34.6" stroke="#fff" stroke-width="1.2" fill="none" opacity="0.25" stroke-linecap="round"/>`);
  },

  // Schneidebrett Eiche 40×25×2, Griff mit Loch, aufrecht angelehnt, zweites Brett davor.
  // Maß: Griff 1/4 der Länge, Loch Ø 0,1 Breite.
  schneidebrett(S, t) {
    t.push(boden(50, 90, 36, 2.6));
    const hinten = glatt([[30, 26, E], [70, 26, E], [72, 88, E], [28, 88, E]], true, 0.2);
    const hp = `M36 8 Q36 4 40 4 L60 4 Q64 4 64 8 L64 26 L36 26 Z`;
    const brett = `M28 28 Q28 26 32 26 L68 26 Q72 26 72 30 L72 86 Q72 88 70 88 L30 88 Q28 88 28 86 Z`;
    const griff = `M40 8 Q40 6 44 6 L56 6 Q60 6 60 8 L62 26 L38 26 Z`;
    void hinten; void hp;
    t.push(form(S, `${griff} ${brett}`, S.c), maserung(S, `${griff} ${brett}`, S.c, 14, 20, 80, 6, 88));
    t.push(`<circle cx="50" cy="14" r="3" fill="#f3f1ec" stroke="${dunkel(S.c, 0.4)}" stroke-width="0.5"/>`);
    t.push(`<path d="M72 30 L74 31 L74 88 L72 88 Z" fill="${dunkel(S.c, 0.3)}"/>`);
    // zweites, kleines Brett vorne
    const v = 'M12 66 Q12 63 16 63 L44 63 Q48 63 48 66 L48 88 Q48 91 44 91 L16 91 Q12 91 12 88 Z';
    const S2c = dunkel(S.c, 0.18);
    t.push(form(S, v, S2c), maserung(S, v, S2c, 5, 10, 50, 63, 91), `<path d="M48 66 L50 67 L50 91 L48 91 Z" fill="${dunkel(S2c, 0.3)}"/>`);
    // Kräuter
    for (const [x, y, w] of [[24, 72, -20], [30, 70, 15], [35, 74, -40], [28, 77, 30]]) t.push(`<ellipse cx="${x}" cy="${y}" rx="3.6" ry="1.8" fill="#6f8f4e" transform="rotate(${w} ${x} ${y})"/>`);
  },

  // Vorratsglas 1 l mit Bügelverschluss und Gummiring, gefüllt mit Pasta; zweites Glas mit Linsen.
  // Maß: Höhe : Ø = 1,4, Deckel gewölbt, Bügel Draht.
  vorratsglas(S, t) {
    t.push(boden(50, 88, 40, 3));
    const glasK = (cx, yb, rx, h, inhalt, art) => {
      const yt = yb - h, d = `M${f(cx - rx)} ${f(yt + 4)} Q${f(cx - rx)} ${f(yt)} ${f(cx - rx + 4)} ${f(yt)} L${f(cx + rx - 4)} ${f(yt)} Q${f(cx + rx)} ${f(yt)} ${f(cx + rx)} ${f(yt + 4)} L${f(cx + rx)} ${f(yb - 3)} Q${f(cx + rx)} ${f(yb)} ${f(cx + rx - 4)} ${f(yb)} L${f(cx - rx + 4)} ${f(yb)} Q${f(cx - rx)} ${f(yb)} ${f(cx - rx)} ${f(yb - 3)} Z`;
      const fy = yt + h * 0.32;
      t.push(`<path d="M${f(cx - rx + 1)} ${f(fy)} L${f(cx + rx - 1)} ${f(fy)} L${f(cx + rx - 1)} ${f(yb - 3)} Q${f(cx + rx - 1)} ${f(yb - 1)} ${f(cx + rx - 4)} ${f(yb - 1)} L${f(cx - rx + 4)} ${f(yb - 1)} Q${f(cx - rx + 1)} ${f(yb - 1)} ${f(cx - rx + 1)} ${f(yb - 3)} Z" fill="${inhalt}"/>`);
      if (art === 'pasta') for (let y = fy + 2; y < yb - 3; y += 4.2) for (let x = cx - rx + 4; x < cx + rx - 3; x += 5.4) t.push(`<path d="M${f(x)} ${f(y)} q1.4 -1.6 2.8 0 q1.4 1.6 2.8 0" stroke="${dunkel(inhalt, 0.22)}" stroke-width="0.9" fill="none"/>`);
      else for (let y = fy + 1.4; y < yb - 2; y += 2) for (let x = cx - rx + 2.4; x < cx + rx - 1; x += 2.2) t.push(`<circle cx="${f(x + ((y * 3) % 1.1))}" cy="${f(y)}" r="0.85" fill="${(x + y) % 2 < 1 ? dunkel(inhalt, 0.2) : hell(inhalt, 0.1)}"/>`);
      t.push(glas(S, d, { deck: 0.3 }));
      // Deckel, Gummiring, Bügel
      t.push(glas(S, `M${f(cx - rx - 0.5)} ${f(yt - 1)} Q${f(cx)} ${f(yt - 7)} ${f(cx + rx + 0.5)} ${f(yt - 1)} Z`, { deck: 0.45 }));
      t.push(`<rect x="${f(cx - rx - 0.4)}" y="${f(yt - 1.4)}" width="${f(rx * 2 + 0.8)}" height="2" fill="#d9763f"/>`);
      t.push(`<path d="M${f(cx + rx - 2)} ${f(yt + 6)} L${f(cx + rx + 2)} ${f(yt - 1)} L${f(cx)} ${f(yt - 5.4)}" stroke="#9aa0a6" stroke-width="0.9" fill="none"/><path d="M${f(cx + rx)} ${f(yt + 7)} L${f(cx + rx + 2)} ${f(yt - 1)}" stroke="#9aa0a6" stroke-width="0.9"/>`);
    };
    glasK(32, 86, 16, 54, '#e3c27a', 'pasta');
    glasK(70, 86, 12, 40, '#b5603b', 'linsen');
  },

  // Servierplatte oval 40×22 mit Griffmulden an den Enden, flacher Rand 2 cm, Glasur mit Sprenkeln.
  // Maß: Länge : Breite 1,8 : 1, Aufsicht 30°.
  servierplatte(S, t) {
    t.push(boden(50, 72, 44, 3.4));
    t.push(`<path d="M4 53 Q8 69 50 69 Q92 69 96 53 Z" fill="${dunkel(S.c, 0.18)}"/>`);
    const ob = ell(50, 52, 46, 13);
    t.push(form(S, ob, S.c, { ko: 0.3 }), sprenkel(S, ob));
    const sp = ell(50, 52.6, 37, 9.4);
    t.push(`<path d="${sp}" fill="${dunkel(S.c, 0.06)}"/><path d="M13 52.6 A37 9.4 0 0 1 87 52.6" stroke="${dunkel(S.c, 0.2)}" stroke-width="0.7" fill="none" opacity="0.6"/>`);
    t.push(`<path d="${ob}" fill="none" stroke="${TON}" stroke-width="0.9"/>`);
    // Griffmulden an den Enden
    for (const s2 of [-1, 1]) t.push(`<path d="M${50 + s2 * 41} 50 Q${50 + s2 * 44.6} 52 ${50 + s2 * 41} 54" stroke="${dunkel(S.c, 0.35)}" stroke-width="1.2" fill="none"/>`);
  },
};
TISCH.glas = TISCH.wasserglas;

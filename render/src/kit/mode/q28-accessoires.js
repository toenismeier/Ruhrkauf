// Q28: Accessoires als Freisteller (Licht von links, weicher Bodenschatten, Stoff aus stoff.js).
// Je Zeichner eine Maßzeile (cm) nach Ware im Warenhaus.

import { glatt } from './model.js';
import { hell, dunkel, flaeche, mische, materialDefs } from './stoff.js';
import { naht, linie } from './flatlay.js';

const f = (n) => Math.round(n * 10) / 10;
const E = 'ecke';
const sp = (pts) => pts.map(([x, y, e]) => [100 - x, y, e]);
const sym = (rechts) => [...rechts, ...sp([...rechts].reverse())];
const schatten = (cx, cy, rx, ry = 3, op = 0.1) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#000" opacity="${op}"/>`;
const GOLD = '#c9a24a', GOLD_D = '#8f6f2a', GOLD_H = '#f0dc9a';
const metallVerlauf = (S, id, farbe = GOLD) => { S.defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hell(farbe, 0.45)}"/><stop offset="0.45" stop-color="${farbe}"/><stop offset="1" stop-color="${dunkel(farbe, 0.35)}"/></linearGradient>`); return `url(#${id})`; };
let nr = 0;
const uid = (S, k) => `${S.id}${k}${(++nr).toString(36)}`;
const metallFarbe = (S) => (S.m === 'silber' || S.c === '#c9ced3' ? '#c9ced3' : GOLD);

// Strickbündchen: Rechteck mit senkrechten Rippen
function buendchen(S, t, x0, y0, x1, y1, o = {}) {
  t.push(flaeche(S, glatt([[x0, y0, E], [x1, y0, E], [x1 + (o.ausw ?? 0), y1, E], [x0 - (o.ausw ?? 0), y1, E]], true, 0.2), { ton: o.ton ?? -0.08 }));
  for (let x = x0 + 2; x < x1 - 1; x += o.abstand ?? 2.4) t.push(linie(`M${f(x)} ${f(y0 + 0.8)} L${f(x + (o.ausw ?? 0) * ((x - (x0 + x1) / 2) / ((x1 - x0) / 2)))} ${f(y1 - 0.8)}`, dunkel(S.c, 0.3), 0.6, 0.55));
}
function bommel(S, t, cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, rr = r * (i % 2 ? 0.9 : 1.04); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  t.push(`<path d="${glatt(pts, true, 0.5)}" fill="${hell(S.c, 0.06)}" stroke="${S.cK}" stroke-width="0.5" opacity="0.98"/>`);
  for (let i = 0; i < 26; i++) { const a = i * 2.39, rr = r * 0.75 * Math.sqrt((i + 0.5) / 26); t.push(linie(`M${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)} l${f(Math.cos(a) * 1.4)} ${f(Math.sin(a) * 1.4)}`, i % 3 ? dunkel(S.c, 0.2) : hell(S.c, 0.3), 0.6, 0.7)); }
  t.push(`<circle cx="${f(cx - r * 0.3)}" cy="${f(cy - r * 0.35)}" r="${f(r * 0.35)}" fill="#fff" opacity="0.18"/>`);
}

export const ACCESSOIRES = {
  // Bommelmütze: Höhe 23 ohne Bommel, Breite 21, Umschlag 7, Bommel Ø 9
  muetze(S, t, p) {
    t.push(schatten(50, 92, 28, 2.6));
    const kopf = sym([[50, 26], [61, 28], [69, 36], [73, 50], [74, 64, E]]);
    t.push(flaeche(S, glatt(kopf, true, 0.5)));
    for (const x of [38, 44, 50, 56, 62]) t.push(linie(`M${x} ${x === 50 ? 27 : 29} Q${f(50 + (x - 50) * 1.5)} 46 ${f(50 + (x - 50) * 1.9)} 64`, dunkel(S.c, 0.25), 0.55, 0.5));
    buendchen(S, t, 24, 62, 76, 88, { ausw: 1.2, abstand: 2.6 });
    t.push(linie('M23 62.4 Q50 64 77 62.4', dunkel(S.c, 0.4), 1, 0.7));
    if (p.bommel !== false) bommel(S, t, 50, 20, 10);
    // Etikett am Umschlag
    if (p.etikett !== false) t.push(`<rect x="64" y="70" width="7" height="5" rx="0.6" fill="${hell(S.c, 0.6)}" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.35"/>`);
  },
  // Beanie: Höhe 20, Breite 21, schmaler Umschlag 5, oben abgeflacht, kein Bommel
  beanie(S, t, p) {
    t.push(schatten(50, 90, 27, 2.6));
    const kopf = sym([[50, 16], [62, 17, E], [70, 24], [74, 40], [75, 66, E]]);
    t.push(flaeche(S, glatt(kopf, true, 0.45)));
    // Kronennähte: vier Zwickel laufen oben zusammen
    for (const [x, q] of [[50, 0], [41, -1], [59, 1]]) t.push(linie(`M${x} 17 Q${f(x + q * 6)} 30 ${f(x + q * 12)} 42`, dunkel(S.c, 0.3), 0.55, 0.55));
    for (let x = 29; x <= 71; x += 3) t.push(linie(`M${x} ${x < 40 || x > 60 ? 30 : 22} L${f(50 + (x - 50) * 1.05)} 66`, dunkel(S.c, 0.25), 0.45, 0.4));
    buendchen(S, t, 25, 64, 75, 82, { ausw: 0.6, abstand: 2.2 });
    t.push(`<rect x="45" y="68" width="10" height="7" rx="0.6" fill="${dunkel(S.c, 0.35)}"/><rect x="46.2" y="69.2" width="7.6" height="4.6" rx="0.3" fill="none" stroke="${hell(S.c, 0.4)}" stroke-width="0.35" stroke-dasharray="0.6 0.5"/>`);
  },
  // Strohhut (Fedora): Krempe Ø 36, Kopfhöhe 11, Band 3
  strohhut(S, t, p) {
    t.push(schatten(50, 84, 44, 3.6));
    // Krempe als flache Ellipse, vorne leicht heruntergebogen
    const krempe = glatt([[6, 66], [20, 56], [50, 52], [80, 56], [94, 66], [82, 76], [50, 80], [18, 76]], true, 0.5);
    t.push(flaeche(S, krempe, { ton: -0.04 }));
    for (let r = 0.92; r > 0.62; r -= 0.07) t.push(`<ellipse cx="50" cy="67" rx="${f(44 * r)}" ry="${f(13 * r)}" fill="none" stroke="${dunkel(S.c, 0.22)}" stroke-width="0.45" opacity="0.6"/>`);
    t.push(`<path d="M8 67 Q50 86 92 67" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.9" fill="none" opacity="0.6"/>`);
    // Kopf mit Kniff (Fedora): Wände, Dellen oben
    const kopf = [[30, 66, E], [31, 42], [36, 30], [44, 27], [50, 31], [56, 27], [64, 30], [69, 42], [70, 66, E]];
    t.push(flaeche(S, glatt(kopf, true, 0.45)));
    t.push(`<path d="M50 31 Q49 40 50 46" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.8" fill="none"/><path d="M36 33 Q44 37 50 46 Q56 37 64 33" stroke="${dunkel(S.c, 0.25)}" stroke-width="0.6" fill="none" opacity="0.6"/>`);
    for (let y = 34; y < 60; y += 2.6) t.push(linie(`M${f(31.5 - (y - 34) * 0.02)} ${y} Q50 ${y + 2.2} ${f(68.5 + (y - 34) * 0.02)} ${y}`, dunkel(S.c, 0.2), 0.45, 0.5));
    // Band mit Schleife
    const band = p.band ?? '#3a2a20';
    t.push(`<path d="M30.4 56 Q50 59.6 69.6 56 L69.9 64 Q50 67.6 30.1 64 Z" fill="${band}"/><path d="M30.4 56 Q50 59.6 69.6 56" stroke="${hell(band, 0.3)}" stroke-width="0.5" fill="none"/>`);
    t.push(`<path d="M62 58 l6 -2 l1 6 l-6 0.6 Z" fill="${dunkel(band, 0.2)}"/>`);
  },
  // Sonnenbrille: Gesamtbreite 14, Glas 5,4 × 4,6, Steg 1,8; leicht von vorn oben, Bügel nach hinten
  sonnenbrille(S, t, p) {
    t.push(schatten(50, 76, 40, 3));
    const glasId = uid(S, 'g');
    S.defs.push(`<linearGradient id="${glasId}" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${p.glas ?? '#3c3a38'}" stop-opacity="0.92"/><stop offset="0.6" stop-color="${p.glas ?? '#3c3a38'}" stop-opacity="0.75"/><stop offset="1" stop-color="${hell(p.glas ?? '#3c3a38', 0.3)}" stop-opacity="0.7"/></linearGradient>`);
    // Bügel (perspektivisch nach hinten oben)
    for (const s of [1, -1]) {
      const X = (x) => (s > 0 ? x : 100 - x);
      t.push(`<path d="M${X(90)} 46 L${X(84)} 30 L${X(80)} 28" stroke="${S.cK}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${X(90)} 46 L${X(84)} 30 L${X(80)} 28" stroke="${S.c}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    const glas = (s) => {
      const X = (x) => (s > 0 ? x : 100 - x);
      return glatt([[X(55), 42], [X(60), 38], [X(78), 37.5], [X(90), 41], [X(90.5), 50], [X(85), 62], [X(72), 66], [X(60), 63], [X(55.5), 54]], true, 0.5);
    };
    for (const s of [1, -1]) {
      const d = glas(s);
      t.push(`<path d="${d}" fill="url(#${glasId})"/>`);
      t.push(`<path d="${d}" fill="none" stroke="${S.c}" stroke-width="3.4"/><path d="${d}" fill="none" stroke="${S.cK}" stroke-width="0.5" opacity="0.6"/>`);
      const X = (x) => (s > 0 ? x : 100 - x);
      t.push(`<path d="M${X(62)} 44 Q${X(70)} 41 ${X(80)} 42" stroke="#fff" stroke-width="1.6" fill="none" opacity="0.45" stroke-linecap="round"/><path d="M${X(64)} 58 L${X(70)} 48" stroke="#fff" stroke-width="0.8" opacity="0.25"/>`);
    }
    // Steg und Scharniere
    t.push(`<path d="M45 42 Q50 38.6 55 42" stroke="${S.c}" stroke-width="3" fill="none"/><path d="M45 42 Q50 38.6 55 42" stroke="${S.cK}" stroke-width="0.5" fill="none" opacity="0.5"/>`);
    for (const x of [9, 91]) t.push(`<circle cx="${x}" cy="41.5" r="1" fill="${GOLD}"/>`);
    t.push(`<path d="M8 40 Q10 37.6 14 37.6" stroke="#fff" stroke-width="0.7" fill="none" opacity="0.4"/>`);
  },
  // Halskette: Länge 45, Anhänger 1,8 × 2,4; als Tropfen gelegt, Verschluss oben
  halskette(S, t, p) {
    const mf = metallFarbe(S);
    t.push(schatten(50, 86, 24, 2.4, 0.07));
    const pfad = [];
    for (let i = 0; i <= 60; i++) { const a = (i / 60) * Math.PI * 2; pfad.push([50 + Math.sin(a) * 30 * (1 - 0.12 * Math.cos(a)), 46 - Math.cos(a) * 30 + (Math.cos(a) < 0 ? -Math.cos(a) * 8 : 0)]); }
    const d = glatt(pfad, true, 0.5);
    t.push(`<path d="${d}" fill="none" stroke="${GOLD_D}" stroke-width="2"/><path d="${d}" fill="none" stroke="${mf}" stroke-width="1.4" stroke-dasharray="1.4 0.5"/><path d="${d}" fill="none" stroke="${hell(mf, 0.6)}" stroke-width="0.4" stroke-dasharray="0.6 1.3" transform="translate(-0.3 -0.3)"/>`);
    // Verschluss oben
    t.push(`<circle cx="50" cy="16" r="1.8" fill="none" stroke="${GOLD_D}" stroke-width="1"/><rect x="51.6" y="15" width="3.4" height="2" rx="1" fill="${mf}" stroke="${GOLD_D}" stroke-width="0.4"/>`);
    // Anhänger: Öse und Tropfen mit Stein
    const g = metallVerlauf(S, uid(S, 'm'), mf);
    t.push(`<circle cx="50" cy="84.6" r="1.4" fill="none" stroke="${GOLD_D}" stroke-width="0.9"/>`);
    t.push(`<path d="M50 86 C56 90 57.4 98 50 99.6 C42.6 98 44 90 50 86 Z" fill="${g}" stroke="${GOLD_D}" stroke-width="0.5"/>`);
    t.push(`<path d="M50 89 C53.4 91.4 54 96 50 97 C46 96 46.6 91.4 50 89 Z" fill="${p.stein ?? '#7fb4d8'}" stroke="#fff" stroke-width="0.35" opacity="0.95"/><path d="M48.4 91.6 l1.2 -1" stroke="#fff" stroke-width="0.7" opacity="0.8"/>`);
  },
  // Ohrringe (Hänger): Gesamtlänge 4,5, Ohrhaken 1,8, Tropfen 1,6 × 2,2 mit Stein; als Paar nebeneinander
  ohrringe(S, t, p) {
    const mf = metallFarbe(S);
    t.push(schatten(50, 90, 34, 2.6, 0.08));
    for (const [cx, w] of [[34, -6], [66, 6]]) {
      const g = metallVerlauf(S, uid(S, 'o'), mf);
      t.push(`<g transform="rotate(${w} ${cx} 20)">`);
      // Ohrhaken
      t.push(`<path d="M${cx} 40 L${cx} 26 Q${cx} 10 ${cx + 10} 12 Q${cx + 17} 14 ${cx + 15} 26 L${cx + 13} 32" fill="none" stroke="${GOLD_D}" stroke-width="2.4" stroke-linecap="round"/><path d="M${cx} 40 L${cx} 26 Q${cx} 10 ${cx + 10} 12 Q${cx + 17} 14 ${cx + 15} 26 L${cx + 13} 32" fill="none" stroke="${mf}" stroke-width="1.4" stroke-linecap="round"/>`);
      // Öse und Zwischenkugel
      t.push(`<circle cx="${cx}" cy="42" r="2.6" fill="none" stroke="${GOLD_D}" stroke-width="1.6"/><circle cx="${cx}" cy="48.6" r="3.2" fill="${g}" stroke="${GOLD_D}" stroke-width="0.4"/>`);
      // Tropfen mit Fassung und Stein
      t.push(`<path d="M${cx} 52 C${cx + 12} 62 ${cx + 13} 80 ${cx} 84 C${cx - 13} 80 ${cx - 12} 62 ${cx} 52 Z" fill="${g}" stroke="${GOLD_D}" stroke-width="0.6"/>`);
      t.push(`<path d="M${cx} 57 C${cx + 8.6} 64.6 ${cx + 9.4} 77 ${cx} 80 C${cx - 9.4} 77 ${cx - 8.6} 64.6 ${cx} 57 Z" fill="${p.stein ?? '#3f8f7a'}"/>`);
      t.push(`<path d="M${cx} 57 L${cx} 80 M${cx - 8} 70 L${cx + 8} 70 M${cx - 5.6} 63 L${cx + 5.6} 77 M${cx + 5.6} 63 L${cx - 5.6} 77" stroke="#fff" stroke-width="0.35" opacity="0.35"/>`);
      t.push(`<path d="M${cx - 4} 62 Q${cx - 6} 68 ${cx - 5} 73" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.6" stroke-linecap="round"/>`);
      t.push('</g>');
    }
  },
  // Armband (Gliederarmband): Länge 19, Glied 0,8 × 0,6, Karabinerverschluss, Anhänger Herz; als Oval gelegt
  armband(S, t, p) {
    const mf = metallFarbe(S);
    t.push(schatten(50, 84, 38, 3, 0.08));
    const n = 22, glieder = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.25; glieder.push([50 + Math.cos(a) * 34, 50 + Math.sin(a) * 24, a]); }
    glieder.forEach(([x, y, a], i) => {
      if (i === n - 1) return;
      const w = (a * 180) / Math.PI + 90;
      const quer = i % 2 === 1;
      t.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${quer ? 2.6 : 5.6}" ry="${quer ? 4.6 : 3.4}" transform="rotate(${f(w)} ${f(x)} ${f(y)})" fill="none" stroke="${GOLD_D}" stroke-width="2.6"/>`);
      t.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${quer ? 2.6 : 5.6}" ry="${quer ? 4.6 : 3.4}" transform="rotate(${f(w)} ${f(x)} ${f(y)})" fill="none" stroke="${mf}" stroke-width="1.6"/>`);
      t.push(`<ellipse cx="${f(x - 1)}" cy="${f(y - 1.2)}" rx="1.4" ry="0.6" fill="${GOLD_H}" opacity="0.7" transform="rotate(${f(w)} ${f(x)} ${f(y)})"/>`);
    });
    // Karabiner und Ring an der Lücke
    const [xa, ya] = glieder[n - 2], [xb, yb] = glieder[0];
    const g = metallVerlauf(S, uid(S, 'k'), mf);
    t.push(`<g transform="translate(${f((xa + xb) / 2 + 2)} ${f((ya + yb) / 2)}) rotate(70)"><path d="M-6 0 Q-6 -5 0 -5 Q6 -5 6 0 Q6 5 0 5 L-3 5" fill="none" stroke="${GOLD_D}" stroke-width="3"/><path d="M-6 0 Q-6 -5 0 -5 Q6 -5 6 0 Q6 5 0 5 L-3 5" fill="none" stroke="${g}" stroke-width="2"/><rect x="-2" y="3.4" width="3" height="2.6" fill="${mf}"/></g>`);
    t.push(`<circle cx="${f(xb + 1)}" cy="${f(yb - 2)}" r="2.6" fill="none" stroke="${GOLD_D}" stroke-width="1.4"/>`);
    // Herz-Anhänger unten
    const [hx, hy] = glieder[Math.round(n / 4)];
    t.push(`<path d="M${f(hx)} ${f(hy + 4)} l0 2" stroke="${GOLD_D}" stroke-width="1"/><path d="M${f(hx)} ${f(hy + 16)} C${f(hx - 9)} ${f(hy + 10)} ${f(hx - 6)} ${f(hy + 4)} ${f(hx)} ${f(hy + 8)} C${f(hx + 6)} ${f(hy + 4)} ${f(hx + 9)} ${f(hy + 10)} ${f(hx)} ${f(hy + 16)} Z" fill="${g}" stroke="${GOLD_D}" stroke-width="0.6"/>`);
  },
  // Haarreif: Bügelbreite 14, Band 2,5 (Enden verjüngt auf 0,8), oben Knoten; von vorn, Innenseite sichtbar
  haarreif(S, t, p) {
    t.push(schatten(50, 90, 30, 2.6));
    const bahn = [];
    for (let i = 0; i <= 40; i++) { const a = Math.PI * (1.08 - 1.16 * (i / 40)); bahn.push([50 + Math.cos(a) * 34, 58 - Math.sin(a) * 42, Math.sin((i / 40) * Math.PI)]); }
    // Band als Fläche mit verjüngten Enden: außen und innen
    const aussen = bahn.map(([x, y, w]) => [50 + (x - 50) * (1 + 0.1 * (0.25 + w)), 58 + (y - 58) * (1 + 0.08 * (0.25 + w))]);
    const innen = bahn.map(([x, y]) => [x, y]);
    const d = glatt([...aussen, ...[...innen].reverse()], true, 0.3);
    t.push(flaeche(S, d));
    // Innenseite (hinterer Bogen) heller, Zähnchen
    t.push(`<path d="${glatt(innen, false, 0.5)}" stroke="${hell(S.c, 0.35)}" stroke-width="1.4" fill="none" opacity="0.8"/>`);
    for (let i = 4; i <= 36; i += 2) { const [x, y] = innen[i], [x2, y2] = aussen[i]; t.push(linie(`M${f(x)} ${f(y)} L${f(x + (x - x2) * 0.12)} ${f(y + (y - y2) * 0.12)}`, dunkel(S.c, 0.3), 0.45, 0.6)); }
    t.push(`<path d="${glatt(aussen.slice(6, 20), false, 0.5)}" stroke="#fff" stroke-width="1.2" fill="none" opacity="0.25" transform="translate(0.6 1.2)"/>`);
    // Knoten oben
    t.push(flaeche(S, glatt([[39, 9], [50, 13], [61, 9], [64, 17], [61, 25], [50, 21], [39, 25], [36, 17]], true, 0.5), { ton: 0.04 }));
    t.push(flaeche(S, glatt([[45.4, 11.6], [54.6, 11.6], [56, 17], [54.6, 23], [45.4, 23], [44, 17]], true, 0.5), { ton: -0.12 }));
    t.push(linie('M41 12 Q44 17 41 22 M59 12 Q56 17 59 22', dunkel(S.c, 0.35), 0.6, 0.7));
  },
  // Handschuhe (Leder): Länge 24, Handbreite 9,5, Stulpe 6; Paar, rechter liegt vorn, Steppnähte auf dem Handrücken
  handschuhe(S, t, p) {
    t.push(schatten(50, 92, 34, 2.8));
    const hand = [[44, 92, E], [42, 66], [40, 60], [33, 48], [30, 40], [32, 37], [36, 39], [42, 47], [43, 38], [43, 14], [46, 11], [49, 14], [50, 34], [51, 10], [54, 7.6], [57, 10], [57, 34], [58, 12], [61, 10], [64, 13], [63.4, 36], [65, 20], [68, 18.4], [70.6, 21], [69, 46], [67, 66], [66, 92, E]];
    const handschuh = (dx, dy, rot, ton) => {
      const g = [`<g transform="translate(${dx} ${dy}) rotate(${rot} 55 60)">`];
      g.push(flaeche(S, glatt(hand, true, 0.32), { ton }));
      // Fingerzwischenräume
      for (const [x, y] of [[50.5, 34], [57.6, 34.6], [64, 37]]) g.push(linie(`M${x} ${y} L${f(x + 0.2)} ${y + 6}`, dunkel(S.c, 0.4), 0.7, 0.8));
      // Steppnähte auf dem Rücken
      for (const x of [49, 55.5, 61.5]) g.push(`<path d="M${x} 48 L${x + 0.6} 64" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.6" stroke-dasharray="1 0.7" opacity="0.8"/>`);
      // Stulpe mit Gummizug und Schlitz
      g.push(flaeche(S, glatt([[43.4, 72, E], [66.6, 72, E], [66, 92, E], [44, 92, E]], true, 0.2), { ton: ton - 0.06 }));
      g.push(linie('M43.6 74.4 Q55 75.8 66.4 74.4', hell(S.c, 0.3), 0.5, 0.8), linie('M44 90 L66 90', dunkel(S.c, 0.4), 0.8, 0.7));
      g.push(linie('M56 92 L56 84', dunkel(S.c, 0.5), 0.8, 0.9));
      g.push(`<path d="M47 22 Q48 30 47 40" stroke="#fff" stroke-width="1" opacity="${S.glanz ? 0.3 : 0.15}" fill="none"/>`);
      g.push('</g>');
      return g.join('');
    };
    t.push(handschuh(-18, -4, -12, -0.1), handschuh(4, 2, 8, 0));
  },
  // Regenschirm (Stockschirm): Ø 100, acht Segmente, Hakengriff; geöffnet, leicht von oben
  regenschirm(S, t, p) {
    t.push(schatten(50, 92, 30, 2.6));
    // Stock und Griff
    t.push(`<path d="M50 36 L50 82 Q50 92 42 92 Q36 92 36 86" stroke="${p.griff ?? '#6a4630'}" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M50.8 40 L50.8 82" stroke="#fff" stroke-width="0.6" opacity="0.4"/>`);
    // Dach: Kuppel mit Bogenkante
    const rand = [];
    const n = 8;
    for (let i = 0; i <= n; i++) { const x = 6 + (88 * i) / n; rand.push([x, 50 + 3 * Math.sin((i / n) * Math.PI)]); }
    let d = 'M6 50 Q14 18 50 12 Q86 18 94 50';
    for (let i = n - 1; i >= 0; i--) { const [x0, y0] = rand[i + 1], [x1, y1] = rand[i]; d += ` Q${f((x0 + x1) / 2)} ${f(Math.max(y0, y1) - 6)} ${f(x1)} ${f(y1)}`; }
    d += ' Z';
    t.push(flaeche(S, d));
    // Speichenfalten
    for (let i = 1; i < n; i++) { const [x, y] = rand[i]; t.push(linie(`M50 12.4 Q${f(50 + (x - 50) * 0.55)} 20 ${f(x)} ${f(y)}`, dunkel(S.c, 0.3), 0.6, 0.7)); }
    // Segmentschattierung
    for (let i = 0; i < n; i += 2) { const [x0, y0] = rand[i], [x1, y1] = rand[i + 1]; t.push(`<path d="M50 12.4 Q${f(50 + (x0 - 50) * 0.55)} 20 ${f(x0)} ${f(y0)} Q${f((x0 + x1) / 2)} ${f(Math.max(y0, y1) - 6)} ${f(x1)} ${f(y1)} Q${f(50 + (x1 - 50) * 0.55)} 20 50 12.4 Z" fill="#000" opacity="0.06"/>`); }
    for (let i = 0; i <= n; i++) { const [x, y] = rand[i]; t.push(`<circle cx="${f(x)}" cy="${f(y)}" r="0.8" fill="${dunkel(S.c, 0.5)}"/>`); }
    t.push(`<path d="M50 12 L50 6" stroke="${dunkel(S.c, 0.5)}" stroke-width="1.6" stroke-linecap="round"/>`);
    t.push(`<path d="M18 36 Q28 20 44 16" stroke="#fff" stroke-width="2" fill="none" opacity="0.25" stroke-linecap="round"/>`);
  },
  // Seidentuch (Carré): 70 × 70, Rollsaum, Bordüre 6, Muster; als Raute halb gefaltet
  seidentuch(S, t, p) {
    t.push(schatten(50, 90, 36, 2.8));
    const zweit = p.zweit ?? '#c9a24a';
    const quad = [[50, 10, E], [90, 50, E], [50, 90, E], [10, 50, E]];
    t.push(flaeche(S, glatt(quad, true, 0.1)));
    // Bordüre
    t.push(`<path d="M50 16 L84 50 L50 84 L16 50 Z" fill="none" stroke="${zweit}" stroke-width="2.6"/><path d="M50 21 L79 50 L50 79 L21 50 Z" fill="none" stroke="${hell(S.c, 0.5)}" stroke-width="0.8"/>`);
    // Motiv: Ornament in der Mitte und Ketten an der Bordüre
    t.push(`<circle cx="50" cy="50" r="12" fill="none" stroke="${zweit}" stroke-width="1.6"/><circle cx="50" cy="50" r="6" fill="${zweit}" opacity="0.8"/>`);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; t.push(`<ellipse cx="${f(50 + Math.cos(a) * 18)}" cy="${f(50 + Math.sin(a) * 18)}" rx="3.4" ry="1.6" transform="rotate(${f((a * 180) / Math.PI)} ${f(50 + Math.cos(a) * 18)} ${f(50 + Math.sin(a) * 18)})" fill="${hell(S.c, 0.55)}"/>`); }
    for (const [x, y] of [[50, 26], [74, 50], [50, 74], [26, 50]]) t.push(`<circle cx="${x}" cy="${y}" r="2.2" fill="${zweit}"/>`);
    // gefaltete Ecke rechts unten mit Rückseite
    t.push(flaeche(S, glatt([[70, 70, E], [90, 50, E], [74, 74, E]], true, 0.1), { ton: -0.18 }));
    t.push(`<path d="M70 70 L90 50" stroke="${dunkel(S.c, 0.4)}" stroke-width="0.6"/>`);
    // Glanz Seide
    t.push(`<path d="M26 40 Q40 30 52 26" stroke="#fff" stroke-width="3" fill="none" opacity="0.2" stroke-linecap="round"/>`);
    t.push(`<path d="M50 10 L90 50 L50 90 L10 50 Z" fill="none" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.6" stroke-dasharray="0.6 0.5"/>`);
  },
  // Krawatte: Länge 148 (gezeigt gebunden-ähnlich gelegt), Klinge 8 breit, Spitze 90°; Schrägstreifen
  krawatte(S, t, p) {
    t.push(schatten(54, 94, 16, 2.2));
    const zweit = p.zweit ?? (S.c === '#273659' ? '#c8372f' : '#f4f3ef');
    const id = uid(S, 'k');
    S.defs.push(`<pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)"><rect width="7" height="1.6" fill="${zweit}" opacity="0.85"/></pattern>`);
    const klinge = [[45.5, 20, E], [54.5, 20, E], [60.5, 82, E], [50, 93, E], [39.5, 82, E]];
    t.push(flaeche(S, glatt(klinge, true, 0.1)));
    if (p.muster !== 'uni') t.push(`<path d="${glatt(klinge, true, 0.1)}" fill="url(#${id})"/>`);
    t.push(`<path d="${glatt(klinge, true, 0.1)}" fill="url(#${S.id}l)"/>`);
    // Knoten
    const knoten = [[42, 7, E], [58, 7, E], [55.4, 21, E], [44.6, 21, E]];
    t.push(flaeche(S, glatt(knoten, true, 0.3), { ton: -0.08 }));
    if (p.muster !== 'uni') t.push(`<path d="${glatt(knoten, true, 0.3)}" fill="url(#${id})" opacity="0.8"/>`);
    t.push(linie('M44.6 21 Q50 23 55.4 21', dunkel(S.c, 0.5), 0.9, 0.8), linie('M48 9 Q47 15 49 20', dunkel(S.c, 0.3), 0.6, 0.6));
    // Kragenband hinter dem Knoten
    t.push(`<path d="M42 7 Q32 4 28 2 M58 7 Q68 4 72 2" stroke="${dunkel(S.c, 0.2)}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
    t.push(naht('M41 82.6 L50 91.4 L59 82.6', S, 0.7));
    t.push(`<path d="M47 26 L44 80" stroke="#fff" stroke-width="1.6" opacity="0.15"/>`);
  },
  // Fliege: Breite 12, Höhe 6, Knoten 2,5; Halsband dahinter
  fliege(S, t, p) {
    t.push(schatten(50, 76, 36, 2.8));
    t.push(`<path d="M30 44 Q50 34 70 44" stroke="${dunkel(S.c, 0.25)}" stroke-width="3" fill="none"/><rect x="66" y="40.4" width="5" height="4" rx="0.6" fill="#c9ced3" stroke="#8f959c" stroke-width="0.4"/>`);
    const fluegel = (s) => {
      const X = (x) => (s > 0 ? x : 100 - x);
      return glatt([[X(54), 46], [X(70), 34], [X(86), 30], [X(90), 42], [X(88), 52], [X(90), 62], [X(86), 74], [X(70), 70], [X(54), 58]], true, 0.4);
    };
    for (const s of [1, -1]) {
      t.push(flaeche(S, fluegel(s), { ton: s > 0 ? -0.04 : 0.02 }));
      const X = (x) => (s > 0 ? x : 100 - x);
      t.push(linie(`M${X(58)} 49 Q${X(72)} 46 ${X(84)} 44 M${X(58)} 55 Q${X(72)} 58 ${X(84)} 62`, dunkel(S.c, 0.35), 0.6, 0.7));
    }
    t.push(flaeche(S, glatt([[44, 44, E], [56, 44, E], [57, 52], [56, 60, E], [44, 60, E], [43, 52]], true, 0.4), { ton: -0.12 }));
    t.push(linie('M46 46 Q45 52 46 58', dunkel(S.c, 0.4), 0.6, 0.6));
    if (p.muster === 'punkte' || p.muster == null) for (const [x, y] of [[24, 40], [32, 52], [22, 62], [70, 40], [78, 52], [72, 64], [16, 50], [84, 50]]) t.push(`<circle cx="${x}" cy="${y}" r="1.4" fill="${hell(S.c, 0.75)}" opacity="0.9"/>`);
  },
  // Mütze-Schal-Set Kind: Mütze Höhe 17, Schal 120 × 14 gefaltet, Fransen, Sternmotiv
  muetzeschalset(S, t, p) {
    t.push(schatten(50, 92, 40, 3));
    const zweit = p.zweit ?? '#f4f3ef';
    // Schal gefaltet (unten, breit)
    const SS = S;
    t.push(flaeche(SS, glatt([[10, 62, E], [86, 62, E], [86, 84, E], [10, 84, E]], true, 0.2), { ton: -0.06 }));
    for (const y of [69, 76]) t.push(`<rect x="10" y="${y}" width="76" height="2.6" fill="${zweit}" opacity="0.85"/>`);
    t.push(`<path d="M10 73 Q48 75 86 73" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.8" fill="none" opacity="0.6"/>`);
    for (let i = 0; i <= 14; i++) t.push(linie(`M${f(10.6 + i * 1.6)} 84 l0 4.4`, dunkel(S.c, 0.1), 0.9));
    // Mütze oben links mit Ohrenklappen-Andeutung und Bommel
    const kopf = [[24, 58, E], [24, 40], [32, 28], [44, 25], [56, 28], [64, 40], [64, 58, E]];
    t.push(flaeche(S, glatt(kopf, true, 0.45)));
    t.push(`<path d="M24.4 42 Q44 36 63.6 42 L63.8 47 Q44 41 24.2 47 Z" fill="${zweit}" opacity="0.9"/>`);
    for (const x of [32, 40, 48, 56]) t.push(`<path d="M${x} 41 l1.6 -1.6 l1.6 1.6 l-1.6 1.6 Z" fill="${S.c}"/>`);
    buendchen(S, t, 23, 54, 65, 64, { abstand: 2.2 });
    bommel({ ...S, c: zweit, cK: dunkel(zweit, 0.3) }, t, 44, 20, 7);
    // Stern auf dem Schal
    t.push(`<path d="M74 63.6 l1.8 3.6 l4 0.6 l-2.9 2.8 l0.7 4 l-3.6 -1.9 l-3.6 1.9 l0.7 -4 l-2.9 -2.8 l4 -0.6 Z" fill="${zweit}" transform="translate(0 -1)"/>`);
  },
};

export const ACCESSOIRE_ZEICHNER = Object.fromEntries(Object.entries(ACCESSOIRES).map(([k, fn]) => ['q28' + k, fn]));

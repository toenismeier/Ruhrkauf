// Q27: Zeichner für neue Mode-Silhouetten (Damen, Herren, Kinder, Teens). viewBox 0 0 100 100, Mitte x = 50, Licht von links.
// Jeder Zeichner (S, t, p): Stoffkontext S (stoff.js), Teile-Array t, Bildparameter p. Maßzeile je Zeichner im Kommentar.

import { glatt } from './model.js';
import { hell, dunkel, flaeche, materialDefs } from './stoff.js';
import { naht, linie, oberteilFlat, hoseFlat, rockFlat, kleidFlat, jackeFlat } from './flatlay.js';

const f = (n) => Math.round(n * 10) / 10;
const E = 'ecke';
const sp = (pts) => pts.map(([x, y, e]) => [100 - x, y, e]);
const X = (s, x) => (s > 0 ? x : 100 - x);
const beide = (pts) => [...pts, ...sp([...pts].reverse())];
const boden = (t, y = 96, rx = 30) => t.push(`<ellipse cx="50" cy="${y}" rx="${rx}" ry="2.4" fill="#000" opacity="0.07"/>`);
const knopf = (x, y, S, r = 1) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${hell(S.c, 0.35)}" stroke="${S.cK}" stroke-width="0.35"/>`;
const druckknopf = (x, y, S) => `<circle cx="${f(x)}" cy="${f(y)}" r="1" fill="#d9d6cf" stroke="#8d897f" stroke-width="0.35"/><circle cx="${f(x)}" cy="${f(y)}" r="0.35" fill="#8d897f"/>`;
const gruppe = (t, tr, fn) => { t.push(`<g transform="${tr}">`); fn(); t.push('</g>'); };
const rippe = (S, t, d, w = 2.2) => t.push(linie(d, dunkel(S.c, 0.1), w), linie(d, hell(S.c, 0.1), 0.4, 0.6));
function zipLinie(S, t, x0, y0, x1, y1, griff = true) {
  t.push(linie(`M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}`, dunkel(S.c, 0.45), 0.9));
  const n = Math.hypot(x1 - x0, y1 - y0) / 1.4;
  for (let i = 1; i < n; i++) { const u = i / n; t.push(linie(`M${f(x0 + (x1 - x0) * u - 0.7)} ${f(y0 + (y1 - y0) * u)} l1.4 0`, dunkel(S.c, 0.3), 0.35, 0.6)); }
  if (griff) t.push(`<rect x="${f(x0 - 1.1)}" y="${f(y0 + 0.4)}" width="2.2" height="3.4" rx="0.5" fill="#c9c6bf" stroke="#77736b" stroke-width="0.3"/>`);
}

export const ZEICHNER = {
  // Babybody (Gr. 74): Rumpf 0,6 × so breit wie lang, Amerikanerausschnitt (Schulterlagen überlappen), Schrittlasche 12 breit mit 3 Druckknöpfen,
  // Beinausschnitt hoch gerundet mit Rippblende; Kurzarm 0,25 × Rumpflänge, Langarm bis 0,85 × Rumpflänge
  kinderbody(S, t, p) {
    boden(t, 94, 24);
    const lang = p.aermel === 'lang';
    for (const s of [1, -1]) {
      const a = lang ? [[63.5, 15.5], [72, 24], [80, 58, E], [72.5, 61, E], [67, 34]] : [[63.5, 15.5], [75, 22.5], [77.5, 26, E], [70.5, 33, E], [66.5, 31]];
      t.push(flaeche(S, glatt(s > 0 ? a : sp(a), true, 0.35)));
      if (lang) t.push(linie(`M${X(s, 72.8)} 56.4 L${X(s, 79.4)} 53.6`, S.cD, 0.5, 0.6), naht(`M${X(s, 72.6)} 58.6 L${X(s, 79.7)} 55.6`, S, 0.5));
      else t.push(naht(`M${X(s, 70.2)} 31 L${X(s, 76)} 24.8`, S, 0.55));
    }
    const r = [[55.5, 12, E], [63.5, 14.2, E], [66.5, 31], [67.4, 50], [66.8, 64], [63.5, 72], [57, 79.5], [55.8, 86, E], [50, 86.6]];
    const k = glatt([...r.slice(0, -1), [50, 86.6], ...sp([...r.slice(0, -1)].reverse()), [50, 18.5]], true, 0.4);
    t.push(flaeche(S, k));
    // Amerikanerausschnitt: Schulterlagen überlappen
    for (const s of [1, -1]) t.push(flaeche(S, glatt([[X(s, 55.5), 12, E], [X(s, 63.5), 14.2, E], [X(s, 64.6), 18.6, E], [X(s, 58), 17.2]], true, 0.3), { ton: 0.05 }));
    rippe(S, t, 'M44.5 12 Q50 22 55.5 12', 2);
    for (const s of [1, -1]) rippe(S, t, `M${X(s, 66.8)} 64 Q${X(s, 63)} 75 ${X(s, 55.8)} 80.5`, 1.8);
    t.push(flaeche(S, glatt([[44.2, 80, E], [55.8, 80, E], [55.8, 86, E], [50, 86.8], [44.2, 86, E]], true, 0.2), { ton: -0.05 }));
    for (const x of [46.4, 50, 53.6]) t.push(druckknopf(x, 83.2, S));
    t.push(linie('M37 40 Q38 58 40 70', S.cD, 0.6, 0.3), linie('M63 42 Q62 58 60 70', S.cD, 0.6, 0.25));
  },

  // Strampler (Gr. 68): Rumpf 0,42 der Gesamtlänge, Beine bis Fuß mit Fußteil, Druckknopfleiste Mitte und Innenbein, Langarm mit Umschlagbündchen
  strampler(S, t, p) {
    boden(t, 96, 26);
    for (const s of [1, -1]) {
      const a = [[62, 13], [70, 20], [77.5, 47, E], [70.5, 49.5, E], [65, 28]];
      t.push(flaeche(S, glatt(s > 0 ? a : sp(a), true, 0.35)));
      t.push(flaeche(S, glatt(s > 0 ? [[70.6, 45.5, E], [77.2, 43, E], [77.6, 47, E], [70.6, 49.6, E]] : sp([[70.6, 45.5, E], [77.2, 43, E], [77.6, 47, E], [70.6, 49.6, E]]), true, 0.2), { ton: -0.1 }));
    }
    const r = [[55, 10, E], [62, 12, E], [65, 28], [65.5, 46], [65, 56], [64, 80], [64.5, 88], [62, 93.5], [56, 94, E], [54.5, 86], [53.8, 66], [51, 58, E]];
    const k = glatt([...r, [50, 58.5], ...sp([...r].reverse()), [50, 16]], true, 0.35);
    t.push(flaeche(S, k));
    for (const s of [1, -1]) t.push(flaeche(S, glatt([[X(s, 54.6), 85], [X(s, 64.4), 85], [X(s, 64.5), 88], [X(s, 62), 93.5], [X(s, 56), 94, E], [X(s, 54.4), 89]], true, 0.35), { ton: -0.12 }));
    rippe(S, t, 'M45 10 Q50 18 55 10', 1.8);
    t.push(flaeche(S, glatt([[48.4, 15.5, E], [51.6, 15.5, E], [51.6, 58, E], [48.4, 58, E]], true, 0.2), { ton: 0.05 }));
    for (let y = 20; y < 56; y += 6.5) t.push(druckknopf(50, y, S));
    for (const s of [1, -1]) for (const y of [64, 72, 80]) t.push(druckknopf(X(s, 54.6), y, S));
    t.push(linie('M40 30 Q39 42 40 52', S.cD, 0.6, 0.3));
  },

  // Schneeanzug (Kinder Gr. 104): Kapuze mit Fellrand, Reißverschluss vorn, Steppkammern 6 hoch, Bündchen an Arm und Bein, Fußsteg
  schneeanzug(S, t, p) {
    boden(t, 96, 30);
    const fell = materialDefs('offwhite', 'teddy', S.defs);
    t.push(flaeche(S, glatt([[39, 15], [37, 6], [43, 0.8], [50, 0], [57, 0.8], [63, 6], [61, 15]], true, 0.45), { ton: -0.06 }));
    t.push(`<path d="${glatt([[42, 13], [41.5, 6.5], [46, 2.6], [50, 2.2], [54, 2.6], [58.5, 6.5], [58, 13]], true, 0.45)}" fill="${dunkel(S.c, 0.4)}"/>`);
    t.push(`<path d="${glatt([[42, 13], [41.5, 6.5], [46, 2.6], [50, 2.2], [54, 2.6], [58.5, 6.5], [58, 13]], false, 0.45)}" fill="none" stroke="${fell.c}" stroke-width="3.2" stroke-linecap="round"/>`, `<path d="${glatt([[42, 13], [41.5, 6.5], [46, 2.6], [50, 2.2], [54, 2.6], [58.5, 6.5], [58, 13]], false, 0.45)}" fill="none" stroke="url(#${fell.id}t)" stroke-width="3.2"/>`);
    const arme = [1, -1].map((s) => { const a = [[64, 15], [74, 22], [82, 52, E], [73, 55, E], [67, 32]]; return glatt(s > 0 ? a : sp(a), true, 0.4); });
    for (const a of arme) t.push(flaeche(S, a));
    const r = [[57, 13, E], [64, 14.5, E], [67.5, 32], [68.5, 50], [69.5, 72], [70, 88, E], [56, 89, E], [55, 70], [51, 59, E]];
    const k = glatt([...r, [50, 59.5], ...sp([...r].reverse()), [43, 13, E]], true, 0.35);
    t.push(flaeche(S, k));
    S.defs.push(`<clipPath id="${S.id}q"><path d="${k}"/>${arme.map((a) => `<path d="${a}"/>`).join('')}</clipPath>`);
    const l = [];
    for (let y = 21; y < 88; y += 6) l.push(linie(`M14 ${y} Q50 ${y + 1.2} 86 ${y}`, S.cD, 0.7, 0.7), linie(`M14 ${y + 3} Q50 ${y + 4.2} 86 ${y + 3}`, '#fff', 2.4, 0.08));
    t.push(`<g clip-path="url(#${S.id}q)">${l.join('')}</g>`);
    for (const s of [1, -1]) {
      t.push(flaeche(S, glatt(s > 0 ? [[73.3, 51, E], [81.6, 48, E], [82, 52, E], [73, 55, E]] : sp([[73.3, 51, E], [81.6, 48, E], [82, 52, E], [73, 55, E]]), true, 0.2), { ton: -0.14 }));
      t.push(flaeche(S, glatt([[X(s, 55.4), 85, E], [X(s, 69.8), 84.5, E], [X(s, 70), 88.6, E], [X(s, 55.6), 89, E]], true, 0.2), { ton: -0.14 }));
      t.push(linie(`M${X(s, 57)} 89 Q${X(s, 62.5)} 94 ${X(s, 68.5)} 89`, dunkel(S.c, 0.5), 1.1));
    }
    zipLinie(S, t, 50, 13, 50, 59);
  },

  // Baby-Schlafsack (Gr. 70): ärmellos, Schulterweite 0,55 der Bodenweite, unten gerundet, seitlicher Reißverschluss, Druckknöpfe auf den Schultern
  schlafsack(S, t, p) {
    boden(t, 95, 28);
    const r = [[56, 9, E], [63, 9.5, E], [64, 13], [66.5, 24], [69, 27], [73, 46], [75, 70], [72, 86], [62, 93], [50, 94.5]];
    const k = glatt([...r, ...sp([...r].reverse()).slice(1), [50, 15]], true, 0.4);
    t.push(flaeche(S, k));
    for (const s of [1, -1]) { rippe(S, t, `M${X(s, 64)} 13 Q${X(s, 63.5)} 22 ${X(s, 69)} 27`, 1.8); t.push(druckknopf(X(s, 59.5), 10.6, S), druckknopf(X(s, 62.5), 11, S)); }
    rippe(S, t, 'M44 9 Q50 17 56 9', 1.8);
    zipLinie(S, t, 39, 12, 33, 84);
    t.push(linie('M62 30 Q66 55 63 84', S.cD, 0.6, 0.3), linie('M42 30 Q40 60 44 86', S.cD, 0.6, 0.25));
  },

  // Jumpsuit (Gr. 38): ärmellos mit V-Ausschnitt (Tiefe 0,18 der Länge), Bindegürtel in der Taille bei 0,36, weite Beine, Schrittlänge 0,62
  jumpsuit(S, t, p) {
    boden(t, 97, 26);
    const r = [[55.5, 4, E], [62.5, 5.5, E], [61.5, 13], [64, 20], [61.5, 36], [66, 48], [69.5, 72], [73, 95, E], [53.8, 95, E], [52.6, 74], [50.6, 57, E]];
    t.push(flaeche(S, glatt([...r, [50, 57.5], ...sp([...r].reverse()), [50, 22, E]], true, 0.32)));
    t.push(linie('M44.5 4 L50 22 L55.5 4', S.cD, 1), naht('M45.6 6 L50 20 L54.4 6', S, 0.5));
    for (const s of [1, -1]) t.push(linie(`M${X(s, 62.5)} 5.5 Q${X(s, 60)} 12 ${X(s, 64)} 20`, S.cD, 0.8), linie(`M${X(s, 61)} 58 L${X(s, 63)} 93`, S.cD, 0.6, 0.5), linie(`M${X(s, 54)} 40 Q${X(s, 58)} 44 ${X(s, 63.5)} 42`, S.cK, 0.6, 0.6));
    t.push(flaeche(S, glatt([[38.5, 34.5, E], [61.5, 34.5, E], [61.6, 38.2, E], [38.4, 38.2, E]], true, 0.2), { ton: -0.08 }));
    t.push(`<path d="M50 36.4 l-5 -3 l0 6 Z M50 36.4 l5 -3 l0 6 Z" fill="${dunkel(S.c, 0.15)}"/>`, linie('M48.6 37.6 l-3 12 M51.4 37.6 l3.4 11', dunkel(S.c, 0.1), 1.6));
  },

  // Set aus Sakko/Blazer und Hose (Anzug, Hosenanzug): gleicher Stoff, Hose rechts dahinter (0,64), Jacke links davor (0,7)
  anzugset(S, t, p) {
    boden(t, 96, 34);
    gruppe(t, 'translate(37 34) scale(0.65)', () => hoseFlat(S, t, { passform: p.hose ?? 'gerade', bundfalte: true, taschen: true }));
    gruppe(t, 'translate(-1 2) scale(0.72)', () => jackeFlat(S, t, { art: p.art ?? 'sakko' }));
  },

  // Twinset: Kurzarmpulli vorn rechts, Strickjacke dahinter links, gleicher Feinstrick
  twinset(S, t, p) {
    boden(t, 94, 34);
    gruppe(t, 'translate(-2 6) scale(0.7)', () => jackeFlat(S, t, { art: 'strickjacke', laenge: 'normal' }));
    gruppe(t, 'translate(32 26) scale(0.66)', () => oberteilFlat(S, t, { aermel: 'kurz', kragen: 'rund', passform: 'tailliert', rippbund: true, strick: true }));
  },

  // Leggings-Set (Kinder): Shirt links, Leggings rechts, Shirt mit Druck, Leggings uni dunkler
  leggingsset(S, t, p) {
    boden(t, 96, 34);
    const S2 = materialDefs(dunkel(S.c, 0.35), 'baumwolle', S.defs);
    gruppe(t, 'translate(42 30) scale(0.64)', () => hoseFlat(S2, t, { passform: 'leggings', taschen: false }));
    gruppe(t, 'translate(-3 8) scale(0.68)', () => oberteilFlat(S, t, { aermel: 'kurz', kragen: 'rund' }));
  },

  // Kimono/Kaftan: T-Schnitt, Ärmel rechteckig 0,45 × Körperlänge breit, Öffnung 0,3 × Länge tief, Blende 3 breit von Nacken bis Saum, Bindeband
  kimono(S, t, p) {
    boden(t, 96, 30);
    const unten = p.laenge === 'lang' ? 94 : 82;
    for (const s of [1, -1]) {
      const a = [[62, 10, E], [90, 22, E], [86, 46, E], [64, 40, E]];
      t.push(flaeche(S, glatt(s > 0 ? a : sp(a), true, 0.2)));
      t.push(naht(`M${X(s, 88.8)} 24 L${X(s, 85.6)} 43.8`, S, 0.55), linie(`M${X(s, 70)} 16 Q${X(s, 76)} 30 ${X(s, 74)} 42`, S.cD, 0.6, 0.35));
    }
    for (const s of [1, -1]) t.push(flaeche(S, glatt([[X(s, 50.4), 26, E], [X(s, 56), 8.5, E], [X(s, 62), 10, E], [X(s, 64.5), 40], [X(s, 65), unten, E], [X(s, 50.4), unten + 0.6, E]], true, 0.2), { ton: s > 0 ? -0.03 : 0 }));
    const B = materialDefs(dunkel(S.c, 0.25), S.m, S.defs);
    for (const s of [1, -1]) t.push(flaeche(B, glatt([[X(s, 44), 8.5, E], [X(s, 47), 8, E], [X(s, 53.6), 28], [X(s, 53.8), unten, E], [X(s, 50.4), unten + 0.6, E], [X(s, 50.4), 30]], true, 0.3)));
    t.push(linie(`M38 ${48} Q50 ${50.5} 62 ${48}`, dunkel(S.c, 0.3), 2), linie(`M58 49 l4 12 M60 48.6 l6 9`, dunkel(S.c, 0.3), 1.6));
  },

  // Poncho: Rechteck diagonal getragen, Spitze vorn bei 0,92, seitlich bis Ellbogen (±40), Rollkragen, Fransen 4 lang
  poncho(S, t, p) {
    boden(t, 97, 34);
    const r = [[56, 14, E], [62, 16], [80, 42], [90, 58, E], [50, 90, E]];
    const k = glatt([...r, ...sp([...r].reverse()).slice(1)], true, 0.25);
    t.push(flaeche(S, k));
    for (const s of [1, -1]) for (let i = 0; i <= 18; i++) { const u = i / 18, x = 90 - 40 * u, y = 58 + 32 * u; t.push(linie(`M${f(X(s, x))} ${f(y)} l${f(-s * 0.6)} 4.4`, S.cD, 0.7, 0.85)); }
    for (const s of [1, -1]) t.push(linie(`M${X(s, 58)} 18 Q${X(s, 66)} 50 ${X(s, 54)} 84`, S.cD, 0.6, 0.35));
    t.push(flaeche(S, glatt([[43.5, 16, E], [44.2, 6, E], [55.8, 6, E], [56.5, 16, E], [50, 18]], true, 0.3), { ton: -0.08 }));
    for (let x = 45.5; x < 55; x += 1.6) t.push(linie(`M${f(x)} 6.6 l0 9`, S.cD, 0.4, 0.5));
    if (p.muster !== 'karo') for (const y of [46, 52]) t.push(linie(`M${f(50 - (y - 14) * 1.05)} ${y} Q50 ${y + 3} ${f(50 + (y - 14) * 1.05)} ${y}`, hell(S.c, 0.5), 1.6, 0.8));
  },

  // Corsage: Herzausschnitt, 6 Stäbchen, Spitze unten vorn; teens = Schnürung vorn, ohne Träger; mit Träger = Corsagen-Top mit Häkchenleiste
  corsage(S, t, p) {
    boden(t, 92, 24);
    const lang = p.traeger;
    const r = [[50, 28, E], [56, 21.5], [63, 22.5], [66, 26, E], [62.5, 46], [64, lang ? 72 : 66], [58, lang ? 74 : 68.5, E], [50, lang ? 77 : 73, E]];
    t.push(flaeche(S, glatt([...r, ...sp([...r].reverse()).slice(1, -1)], true, 0.3)));
    for (const x of [6, 12]) for (const s of [1, -1]) t.push(linie(`M${X(s, 50 + x)} ${x === 6 ? 24 : 23.6} Q${X(s, 50 + x - 1.4)} 46 ${X(s, 50 + x + 0.6)} ${lang ? 73 : 67}`, S.cD, 0.7, 0.6));
    if (lang) {
      for (const s of [1, -1]) t.push(linie(`M${X(s, 58.5)} 22 L${X(s, 60)} 5`, S.cD, 1.1));
      t.push(linie('M50 28 L50 77', S.cK, 0.6, 0.7)); for (let y = 32; y < 74; y += 4) t.push(`<rect x="49.2" y="${y}" width="1.6" height="1" rx="0.3" fill="#d9d6cf" stroke="#8d897f" stroke-width="0.2"/>`);
    } else {
      t.push(`<path d="M47 30 L47 70 L53 70 L53 30 Z" fill="${dunkel(S.c, 0.35)}" opacity="0.8"/>`);
      for (let y = 32; y < 70; y += 4.6) { t.push(`<circle cx="47" cy="${y}" r="0.7" fill="#d9d6cf"/><circle cx="53" cy="${y}" r="0.7" fill="#d9d6cf"/>`); t.push(linie(`M47 ${y} L53 ${y + 4.6} M53 ${y} L47 ${y + 4.6}`, hell(S.c, 0.7), 0.6)); }
      t.push(linie('M50 70 q-3 4 -5 12 M50 70 q3 4 4.4 11', hell(S.c, 0.7), 0.6));
      const spitze = materialDefs(hell(S.c, 0.1), 'spitze', S.defs);
      t.push(flaeche(spitze, glatt([[50, 28, E], [56, 21.5], [63, 22.5], [66, 26, E], [65.6, 28], [62.6, 25.6], [56, 25], [50, 31.4], [44, 25], [37.4, 25.6], [34.4, 28], [34, 26, E], [37, 22.5], [44, 21.5]], true, 0.3), { ton: 0.08 }));
    }
  },

  // Off-Shoulder-Top: gerade Oberkante mit Gummizug quer über die Schultern (Breite 0,95 × Brustweite × 1,6), Volant 10 tief, kurze Ärmel darunter
  offshoulder(S, t, p) {
    boden(t, 90, 26);
    for (const s of [1, -1]) t.push(flaeche(S, glatt(s > 0 ? [[64, 26], [80, 30], [81.5, 40, E], [70, 42, E], [64, 38]] : sp([[64, 26], [80, 30], [81.5, 40, E], [70, 42, E], [64, 38]]), true, 0.35)));
    const r = [[50, 20, E], [74, 20, E], [65.5, 36], [63, 50], [65.5, 82, E], [50, 83]];
    t.push(flaeche(S, glatt([...r, ...sp([...r].reverse()).slice(1, -1)], true, 0.3)));
    const v = [[50, 19, E], [81, 19, E], [83, 26], [80, 31.5], [74, 30.5], [68, 33], [62, 31], [56, 33.5], [50, 32]];
    t.push(flaeche(S, glatt([...v, ...sp([...v].reverse()).slice(1, -1)], true, 0.35), { ton: 0.06 }));
    for (let x = 21; x < 80; x += 2.2) t.push(linie(`M${f(x)} 19.6 l0.2 2.6`, S.cD, 0.4, 0.6));
    for (const x of [25, 37, 50, 63, 75]) t.push(linie(`M${x} 23 Q${x + 1} 27 ${x - 1} 31`, S.cD, 0.5, 0.45));
    t.push(naht('M35 80 Q50 81 65 80', S, 0.5), linie('M38 40 Q37 60 37 78', S.cD, 0.6, 0.3));
  },

  // Rugbyshirt: Langarm, Polokragen in Weiß (Kontrast), Knopfleiste 3 Knöpfe, Blockstreifen 2,5 cm, Rippbündchen
  rugby(S, t, p) {
    boden(t);
    const kragenS = materialDefs('weiß', 'baumwolle', S.defs);
    oberteilFlat(S, t, { aermel: 'lang', kragen: 'polo', passform: 'gerade', rippbund: true, kragenS, knopfleiste: false });
  },

  // Badeshorts (Herren): Schrittlänge kurz (Seitennaht 40 cm ≙ 40), Gummibund mit Kordel, Seitentaschen, Mesh-Futter nicht sichtbar
  badeshorts(S, t, p) {
    hoseFlat(S, t, { laenge: 'kurz', passform: 'weit', komfortbund: true, taschen: false });
    t.push(linie('M48.6 14 q-1.6 6 -3.6 9 M51.4 14 q1.6 6 3.4 9.4', '#f4f3ef', 0.9), `<circle cx="45" cy="23.4" r="0.8" fill="#f4f3ef"/><circle cx="54.8" cy="23.8" r="0.8" fill="#f4f3ef"/>`);
    for (const s of [1, -1]) t.push(linie(`M${X(s, 68.8)} 19 L${X(s, 70.3)} 30`, S.cK, 0.6, 0.7));
    t.push(`<ellipse cx="50" cy="58" rx="22" ry="1.6" fill="#000" opacity="0.07"/>`);
  },

  // Trainingshose (Teens): Jogger mit Rippbündchen, je zwei Seitenstreifen 1 breit, Kordel
  trackpants(S, t, p) {
    boden(t, 97, 26);
    hoseFlat(S, t, { passform: p.passform ?? 'jogger', taschen: false });
    for (const s of [1, -1]) for (const d of [0, 2.2]) t.push(linie(`M${X(s, 68.5 - d * 0.4)} ${16 + d * 0.4} Q${X(s, 70.6 - d)} 30 ${X(s, 69.2 - d)} ${p.passform === 'jogger' || !p.passform ? 88 : 93}`, '#f4f3ef', 1));
  },

  // Cargorock (Teens): Midi gerade, aufgesetzte Seitentaschen 10 × 13 mit Patte, Gürtelschlaufen
  cargorock(S, t, p) {
    boden(t, 96, 28);
    const hem = rockFlat(S, t, { laenge: p.laenge ?? 'midi', form: 'gerade' }, 16);
    for (const s of [1, -1]) {
      const x = s > 0 ? 59 : 100 - 59 - 10.5, y = 40;
      t.push(flaeche(S, glatt([[x, y, E], [x + 10.5, y, E], [x + 10.8, y + 14, E], [x + 0.2, y + 14, E]], true, 0.2), { ton: -0.05 }), naht(`M${f(x + 1)} ${y + 1} L${f(x + 1)} ${y + 13} M${f(x + 9.6)} ${y + 1} L${f(x + 9.8)} ${y + 13}`, S, 0.5));
      t.push(flaeche(S, glatt([[x - 0.4, y - 0.6, E], [x + 10.9, y - 0.6, E], [x + 10.9, y + 3.6, E], [x - 0.4, y + 3.6, E]], true, 0.2), { ton: -0.1 }), `<circle cx="${f(x + 5.25)}" cy="${y + 2}" r="0.7" fill="${dunkel(S.c, 0.4)}"/>`);
    }
    for (const x of [37, 45, 55, 63]) t.push(`<rect x="${x - 0.8}" y="11.4" width="1.6" height="5.4" rx="0.4" fill="${S.cD}"/>`);
    t.push(naht(`M50 ${hem - 12} L50 ${hem + 1}`, S, 0.6));
  },

  // Tüllrock: drei Lagen Tüll (transparent, je 6 länger), Satinbund 5, Saumweite 2 × Bundweite
  tuellrock(S, t, p) {
    boden(t, 96, 30);
    const hem = { mini: 52, knie: 68, midi: 82 }[p.laenge ?? 'midi'] ?? 82;
    for (const [i, w] of [[0, 33], [1, 30], [2, 27]]) {
      const y = hem - i * 4;
      const r = [[50 + 14.5, 18, E], [50 + 20, 32], [50 + w, y, E], [50 + w * 0.5, y + 1.6], [50, y + 2]];
      t.push(`<path d="${glatt([...r, ...sp([...r].reverse()).slice(1)], true, 0.3)}" fill="${hell(S.c, 0.1 + i * 0.05)}" opacity="${0.55 + i * 0.12}" stroke="${S.cK}" stroke-width="0.4" stroke-opacity="0.4"/>`);
      t.push(`<path d="${glatt([...r, ...sp([...r].reverse()).slice(1)], true, 0.3)}" fill="url(#${S.id}t)" opacity="0.8"/>`);
    }
    for (const i of [-3, -1.5, 0, 1.5, 3]) t.push(linie(`M${50 + i * 3.4} 20 Q${50 + i * 6} ${(20 + hem) / 2} ${50 + i * 8.5} ${hem}`, S.cD, 0.5, 0.35));
    const B = materialDefs(S.c, 'satin', S.defs);
    t.push(flaeche(B, glatt([[35, 13, E], [65, 13, E], [65, 19, E], [35, 19, E]], true, 0.2), { ton: -0.05 }));
  },

  // Lederrock: Mini A-Linie, Reißverschluss vorn 13 lang, Teilungsnähte, Gürtelschlaufen
  lederrock(S, t, p) {
    boden(t, 92, 26);
    const hem = rockFlat(S, t, { laenge: p.laenge ?? 'mini', form: 'a-linie' }, 16);
    zipLinie(S, t, 50, 12, 50, 30);
    for (const s of [1, -1]) t.push(naht(`M${X(s, 57)} 17 L${X(s, 60.5)} ${hem}`, S, 0.55));
    for (const x of [37, 63]) t.push(`<rect x="${x - 0.8}" y="11.4" width="1.6" height="5.4" rx="0.4" fill="${S.cD}"/>`);
  },

  // Paperbag-Hose: Bund gerafft 6 hoch über dem Bundstreifen, Bindegürtel mit Schleife, weite Beine mit Bügelfalte
  paperbag(S, t, p) {
    boden(t, 97, 26);
    hoseFlat(S, t, { passform: p.passform ?? 'weit', bundfalte: true, komfortbund: true });
    t.push(flaeche(S, glatt([[30.5, 10.6, E], [69.5, 10.6, E], [70.6, 7], [70, 2.2, E], [64, 3.4], [57, 2], [50, 3.4], [43, 2], [36, 3.4], [30, 2.2, E], [29.4, 7]], true, 0.3), { ton: 0.05 }));
    for (let x = 32; x < 69; x += 2.4) t.push(linie(`M${f(x)} 3.4 q0.4 3.4 -0.2 6.6`, S.cD, 0.45, 0.55));
    t.push(flaeche(S, glatt([[30.6, 9.6, E], [69.4, 9.6, E], [69.4, 13.6, E], [30.6, 13.6, E]], true, 0.2), { ton: -0.08 }));
    t.push(`<path d="M50 11.6 l-6 -3.6 l0 7.2 Z M50 11.6 l6 -3.6 l0 7.2 Z" fill="${dunkel(S.c, 0.12)}" stroke="${S.cK}" stroke-width="0.3"/>`, linie('M49 13 l-4 14 M51 13 l4.6 13', dunkel(S.c, 0.1), 2));
  },

  // Blusenkleid: Midi A-Linie, Langarm mit Bündchen, Schluppe am Rundhals, gesmokter Taillenbund (4 hoch, Gummifäden)
  blusenkleid(S, t, p) {
    boden(t, 96, 28);
    kleidFlat(S, t, { laenge: p.laenge ?? 'midi', form: 'a-linie', aermel: 'lang', kragen: 'rund' });
    t.push(flaeche(S, glatt([[36, 32, E], [64, 32, E], [64.4, 36.6, E], [35.6, 36.6, E]], true, 0.2), { ton: -0.03 }));
    for (const y of [33, 34.3, 35.6]) t.push(`<path d="M36 ${y} ${Array.from({ length: 14 }, (_, i) => `l1 ${i % 2 ? -0.5 : 0.5} l1 ${i % 2 ? 0.5 : -0.5}`).join(' ')}" stroke="${S.cD}" stroke-width="0.4" fill="none" opacity="0.7"/>`);
    t.push(`<path d="M50 13 l-5.5 -2.8 l0 5.6 Z M50 13 l5.5 -2.8 l0 5.6 Z" fill="${S.cD}"/>`, linie('M49.2 14.4 l-3 9 M50.8 14.4 l3.4 8.4', S.cD, 1.3));
    for (let y = 18; y < 30; y += 4) t.push(knopf(50, y, S, 0.8));
  },

  // Latzkleid (Kinder): Rock A-Linie knielang ab 0,5, Latz 0,3 hoch mit aufgesetzter Tasche, Träger gekreuzt nicht sichtbar, Knöpfe
  latzkleid(S, t, p) {
    boden(t, 95, 28);
    const r = [[50 + 14, 50, E], [50 + 17, 58], [50 + 26, 92, E], [50 + 13, 93.5], [50, 94]];
    t.push(flaeche(S, glatt([...r, ...sp([...r].reverse()).slice(1)], true, 0.3)));
    t.push(flaeche(S, glatt([[38.5, 50.5, E], [39.5, 25, E], [60.5, 25, E], [61.5, 50.5, E]], true, 0.2)));
    t.push(flaeche(S, glatt([[44, 30, E], [56, 30, E], [56, 41, E], [50, 42.5, E], [44, 41, E]], true, 0.2), { ton: 0.05 }), naht('M44.8 31.4 L55.2 31.4', S, 0.5));
    t.push(flaeche(S, glatt([[36, 47, E], [64, 47, E], [64, 52.6, E], [36, 52.6, E]], true, 0.2), { ton: -0.06 }));
    for (const s of [1, -1]) { t.push(linie(`M${X(s, 58)} 25.6 L${X(s, 62)} 4`, S.cD, 3.4)); t.push(knopf(X(s, 58), 27.6, S, 1.4)); }
    for (const i of [-2, 0, 2]) t.push(linie(`M${50 + i * 5} 56 Q${50 + i * 7.5} 74 ${50 + i * 10} 92`, S.cD, 0.6, 0.45));
  },

  // Matschhose (Kinder): Latzhose aus PU, Hosenträger mit Gummi, Fußstege, Reflektorstreifen auf Kniehöhe
  matschhose(S, t, p) {
    boden(t, 97, 26);
    hoseFlat(S, t, { passform: 'gerade', latz: true, taschen: false });
    for (const s of [1, -1]) t.push(`<path d="M${X(s, 54.5)} 70 L${X(s, 69.5)} 70" stroke="#e6e8ea" stroke-width="2.4"/>`, linie(`M${X(s, 54)} 94.5 Q${X(s, 61.5)} 99 ${X(s, 69.6)} 94.5`, dunkel(S.c, 0.5), 1.1));
  },

  // Badeanzug: Träger 2 breit, U-Ausschnitt bis 0,28, Beinausschnitt hoch (bis Hüftknochen), Schritt 8 breit; Kinder mit Volant an der Hüfte
  badeanzug(S, t, p) {
    boden(t, 94, 22);
    const kind = p.rueschen;
    const r = [[50, 30, E], [56.5, 27], [58.6, 8, E], [61, 8, E], [61.5, 20], [66, 33], [62, 52], [65.5, 66], [61, 72], [55, 86], [54, 90, E], [50, 90.4]];
    t.push(flaeche(S, glatt([...r, ...sp([...r].reverse()).slice(1, -1)], true, 0.35)));
    for (const s of [1, -1]) t.push(linie(`M${X(s, 61.5)} 20 Q${X(s, 62.5)} 28 ${X(s, 66)} 33`, S.cD, 0.8), linie(`M${X(s, 65.5)} 66 Q${X(s, 61)} 74 ${X(s, 55)} 86`, S.cD, 0.8));
    t.push(linie('M43.5 27 Q50 34 56.5 27', S.cD, 0.8));
    t.push(linie('M39 40 Q38 55 40 66', S.cD, 0.6, 0.3), linie('M60 44 Q62 55 60 64', S.cD, 0.6, 0.25));
    if (kind) { const v = [[50, 60, E], [66, 58.5], [70, 66], [64, 68], [58, 66.5], [50, 68]]; t.push(flaeche(S, glatt([...v, ...sp([...v].reverse()).slice(1, -1)], true, 0.35), { ton: 0.08 })); }
  },

  // Bikini: Triangel-Oberteil (Körbchen 13 hoch) mit Neckholder und Rückenband, Slip mit seitlichen Bindebändern, beide Teile getrennt
  bikini(S, t, p) {
    boden(t, 92, 24);
    for (const s of [1, -1]) {
      t.push(flaeche(S, glatt([[X(s, 50.8), 37, E], [X(s, 55), 22, E], [X(s, 66.5), 37, E], [X(s, 58), 39]], true, 0.35)));
      t.push(linie(`M${X(s, 55)} 22 L${X(s, 51)} 8`, S.cD, 1), linie(`M${X(s, 66.5)} 37 L${X(s, 82)} 35 M${X(s, 82)} 35 l${s * 3} -2 M${X(s, 82)} 35 l${s * 3.4} 2`, S.cD, 1));
      t.push(linie(`M${X(s, 54.2)} 28 Q${X(s, 57)} 33 ${X(s, 56)} 37`, S.cD, 0.5, 0.5));
    }
    t.push(linie('M49.2 8 Q50 6 50.8 8', S.cD, 1));
    const r = [[50, 58, E], [69, 56.5, E], [64, 67], [56, 77], [54, 84, E], [50, 84.2]];
    t.push(flaeche(S, glatt([...r, ...sp([...r].reverse()).slice(1, -1)], true, 0.35)));
    for (const s of [1, -1]) t.push(linie(`M${X(s, 69)} 56.5 l${s * 5} 5 M${X(s, 69)} 56.5 l${s * 2} 8 M${X(s, 69)} 56.5 l${s * 6} -1`, S.cD, 1));
  },
};

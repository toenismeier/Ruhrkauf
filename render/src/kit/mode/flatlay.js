// Q25: parametrische Flatlays für Bekleidung (viewBox 0 0 100 100, Mitte x = 50, Licht von links).
// Jede Funktion bekommt den Stoffkontext S (stoff.js), das Teile-Array t und die Bildparameter p.

import { glatt } from './model.js';
import { hell, dunkel, flaeche } from './stoff.js';

const f = (n) => Math.round(n * 10) / 10;
const E = 'ecke';
const sp = (pts) => pts.map(([x, y, e]) => [100 - x, y, e]);
const X = (s, x) => (s > 0 ? x : 100 - x);
export const naht = (d, S, o = 0.7) => `<path d="${d}" stroke="${S.denim ? S.naht : S.cD}" stroke-width="0.5" stroke-dasharray="1.2 0.9" fill="none" opacity="${o}"/>`;
export const linie = (d, c, w = 0.7, o = 1) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${o}"/>`;
const knopf = (x, y, S, r = 1.1) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${hell(S.c, 0.35)}" stroke="${S.cK}" stroke-width="0.35"/>`;

// ─────────────────────────────────────────── Oberteile
// p: aermel ohne|traeger|kurz|halb|lang, laenge crop|normal|lang|tunika, passform tailliert|gerade|oversize|boxy,
//    kragen rund|v|carree|hemd|polo|stehkragen|rollkragen|kapuze|wickel, knopfleiste, kaenguru, rippbund, brusttasche, offen (Jacke)
export function oberteilMasse(p) {
  const pf = p.passform ?? 'gerade';
  const Sw = { tailliert: 17.5, gerade: 19.5, oversize: 23.5, boxy: 22.5 }[pf] ?? 19.5;
  const Ww = { tailliert: 14.5, gerade: 18.5, oversize: 23, boxy: 22.5 }[pf] ?? 18.5;
  const Hw = { tailliert: 17.5, gerade: 19, oversize: 23, boxy: 22.5 }[pf] ?? 19;
  const unten = { crop: 50, normal: 84, lang: 89, tunika: 92 }[p.laenge ?? 'normal'] ?? 84;
  const oben = p.laenge === 'crop' ? 18 : 12;
  return { Sw, Ww, Hw: p.laenge === 'tunika' ? Hw + 2.5 : Hw, unten, oben, schY: oben + 4.5, achselY: oben + (pf === 'oversize' || pf === 'boxy' ? 26 : 22) };
}

function aermelPfad(M, p, s) {
  const { Sw, schY, achselY } = M;
  const drop = p.passform === 'oversize' || p.passform === 'boxy' ? 3 : 0;
  const a = [50 + Sw - drop, schY + drop * 0.6];
  const ach = [50 + Sw - 1.2, achselY];
  let pts;
  if (p.aermel === 'kurz') {
    const l = p.passform === 'oversize' || p.passform === 'boxy' ? 15 : 12;
    pts = [a, [a[0] + l * 0.86, a[1] + l * 0.55, E], [ach[0] + l * 0.7, ach[1] + l * 0.2 - 1, E], ach];
  } else if (p.aermel === 'halb') {
    pts = [a, [a[0] + 9, a[1] + 14], [a[0] + 13, a[1] + 28, E], [ach[0] + 6, ach[1] + 16, E], [ach[0] + 1.6, ach[1] + 4], ach];
  } else {
    const cuff = M.unten - (p.laenge === 'crop' ? -14 : 4);
    pts = [a, [a[0] + 8, a[1] + 18], [a[0] + 12.5, cuff - 2, E], [a[0] + 4.6, cuff, E], [ach[0] + 1.2, ach[1] + 14], ach];
  }
  return glatt(s > 0 ? pts : sp(pts), true, 0.35);
}

export function oberteilFlat(S, t, p) {
  const M = oberteilMasse(p);
  const { Sw, Ww, Hw, unten, oben, schY, achselY } = M;
  const kr = p.kragen ?? 'rund';
  const nb = kr === 'carree' ? 9 : kr === 'v' ? 6.5 : kr === 'rollkragen' || kr === 'stehkragen' ? 6 : 6.8;
  const ohne = p.aermel === 'ohne' || p.aermel === 'traeger';
  // Ärmel hinter dem Rumpf
  if (!ohne) for (const s of [1, -1]) {
    t.push(flaeche(S, aermelPfad(M, p, s)));
    if (p.aermel === 'lang' && (p.rippbund || p.strick)) {
      const cuff = M.unten - (p.laenge === 'crop' ? -14 : 4), ax = 50 + Sw - (p.passform === 'oversize' || p.passform === 'boxy' ? 3 : 0);
      t.push(flaeche(S, glatt([[X(s, ax + 12.4), cuff - 6, E], [X(s, ax + 12.6), cuff - 1.8, E], [X(s, ax + 4.6), cuff, E], [X(s, ax + 4.4), cuff - 4.6, E]], true, 0.2), { ton: -0.08 }));
      for (let i = 1; i < 6; i++) t.push(linie(`M${f(X(s, ax + 4.4 + i * 1.35))} ${f(cuff - 4.6 - i * 0.2)} l${s * 0.1} 4.2`, S.cD, 0.4, 0.5));
    }
  }
  // Rumpf
  const r = [];
  if (p.aermel === 'traeger') r.push([50 + nb + 2.5, oben, E], [50 + nb + 4, oben + 1, E], [50 + Sw - 3, achselY - 2]);
  else if (ohne) r.push([50 + nb, oben, E], [50 + nb + 6, oben + 1.2, E], [50 + Sw - 4, achselY - 6], [50 + Sw - 1.6, achselY]);
  else r.push([50 + nb, oben, E], [50 + Sw - (p.passform === 'oversize' || p.passform === 'boxy' ? 3 : 0), schY, E], [50 + Sw - 1.2, achselY, E]);
  if (unten - achselY > 20) r.push([50 + Ww, achselY + (unten - achselY) * 0.45]);
  r.push([50 + Hw, unten, E]);
  const tief = kr === 'v' ? oben + 15 : kr === 'carree' ? oben + 9 : kr === 'wickel' ? oben + 20 : kr === 'traeger' || p.aermel === 'traeger' ? oben + 5 : oben + 5.2;
  const ausschnitt = kr === 'v' || kr === 'wickel' ? [[50, tief, E]] : kr === 'carree' ? [[50 - nb, tief, E], [50 + nb, tief, E]] : kr === 'rollkragen' || kr === 'stehkragen' ? [[50, oben + 2]] : [[50 - nb * 0.55, oben + 3.6], [50, tief], [50 + nb * 0.55, oben + 3.6]];
  const korpus = glatt([...r, [50, unten + 0.8], ...sp([...r].reverse()), ...ausschnitt], true, 0.32);
  t.push(flaeche(S, korpus));
  // Innenseite / Halsausschnitt
  if (kr === 'rund' || kr === 'polo' || kr === 'hemd' || kr === 'kapuze') t.push(`<path d="${glatt([[50 - nb, oben, E], [50 - nb * 0.55, oben - 0.6], [50, oben - 1.2], [50 + nb * 0.55, oben - 0.6], [50 + nb, oben, E], [50 + nb * 0.55, oben + 3.6], [50, tief], [50 - nb * 0.55, oben + 3.6]], true, 0.4)}" fill="${dunkel(S.c, 0.3)}"/>`);
  if (kr === 'rund') t.push(linie(`M${50 - nb} ${oben} Q50 ${f(tief + 3.6)} ${50 + nb} ${oben}`, S.cD, 1.4));
  if (kr === 'v') t.push(linie(`M${50 - nb} ${oben} L50 ${tief} L${50 + nb} ${oben}`, S.cD, 1.3));
  if (kr === 'carree') t.push(linie(`M${50 - nb} ${oben} L${50 - nb} ${tief} L${50 + nb} ${tief} L${50 + nb} ${oben}`, S.cD, 1.1));
  if (kr === 'rollkragen' || kr === 'stehkragen') {
    const h = kr === 'rollkragen' ? 8 : 4.5;
    t.push(flaeche(S, glatt([[50 - nb, oben + 1.2, E], [50 - nb + 0.6, oben - h, E], [50 + nb - 0.6, oben - h, E], [50 + nb, oben + 1.2, E]], true, 0.2), { ton: -0.06 }));
    if (kr === 'rollkragen') for (let i = 1; i < 6; i++) t.push(linie(`M${f(50 - nb + i * nb / 3)} ${oben - h + 0.6} l0 ${h}`, S.cD, 0.4, 0.5));
  }
  if (kr === 'wickel') t.push(linie(`M${50 + nb} ${oben} L${50 - 9} ${f(tief + 10)}`, S.cD, 0.9), linie(`M${50 - nb} ${oben} L50 ${tief}`, S.cD, 0.7, 0.6));
  if (kr === 'hemd' || kr === 'polo') for (const s of [1, -1]) t.push(flaeche(S, glatt([[X(s, 50 + nb), oben - 0.4, E], [X(s, 50 + 0.6), oben + 4.4, E], [X(s, 50 + 3), oben + (kr === 'polo' ? 9 : 11), E], [X(s, 50 + nb + 6), oben + 4.2, E]], true, 0.2), { ton: s > 0 ? -0.04 : 0.06 }));
  if (kr === 'kapuze') {
    t.push(flaeche(S, glatt([[50 - nb - 1, oben + 0.6, E], [50 - nb - 4, oben - 6], [50 - 6, oben - 11], [50 + 6, oben - 11], [50 + nb + 4, oben - 6], [50 + nb + 1, oben + 0.6, E], [50 + 4, oben + 9], [50, oben + 12, E], [50 - 4, oben + 9]], true, 0.4), { ton: -0.05 }));
    t.push(`<path d="${glatt([[50 - 5.5, oben + 0.5], [50, oben - 3], [50 + 5.5, oben + 0.5], [50 + 3, oben + 7], [50, oben + 9.5], [50 - 3, oben + 7]], true, 0.4)}" fill="${dunkel(S.c, 0.35)}"/>`);
    t.push(linie(`M47.6 ${oben + 9} q-0.4 7 0.2 12 M52.4 ${oben + 9} q0.4 7 -0.2 12`, hell(S.c, 0.55), 0.8));
  }
  // Details
  if (p.knopfleiste || kr === 'hemd') {
    const bis = kr === 'polo' ? oben + 14 : unten - 3;
    t.push(linie(`M51.6 ${oben + 4} L51.6 ${bis}`, S.cD, 0.6, 0.8), linie(`M48.4 ${oben + 4} L48.4 ${bis}`, S.cD, 0.6, 0.5));
    for (let y = oben + 7; y < bis - 1; y += kr === 'polo' ? 3.6 : 9.5) t.push(knopf(50, y, S));
  } else if (kr === 'polo') { t.push(linie(`M51.6 ${oben + 4} L51.6 ${oben + 14} L48.4 ${oben + 14} L48.4 ${oben + 4}`, S.cD, 0.6, 0.8)); for (const y of [oben + 7, oben + 11]) t.push(knopf(50, y, S, 0.9)); }
  if (p.brusttasche) t.push(flaeche(S, glatt([[57, oben + 13, E], [65, oben + 13, E], [65, oben + 21, E], [61, oben + 22.5, E], [57, oben + 21, E]], true, 0.2), { ton: 0.04 }), naht(`M57 ${oben + 15.5} L65 ${oben + 15.5}`, S, 0.5));
  if (p.kaenguru) { const y0 = unten - 26; t.push(flaeche(S, glatt([[50 - 13, y0, E], [50 + 13, y0, E], [50 + 16, unten - 7, E], [50 - 16, unten - 7, E]], true, 0.2), { ton: 0.03 })); t.push(linie(`M37 ${y0} Q34.6 ${y0 + 10} 34 ${unten - 7} M63 ${y0} Q65.4 ${y0 + 10} 66 ${unten - 7}`, S.cD, 0.8)); }
  if (p.rippbund && p.laenge !== 'crop') { t.push(flaeche(S, glatt([[50 - Hw, unten - 6, E], [50 + Hw, unten - 6, E], [50 + Hw, unten, E], [50, unten + 0.8], [50 - Hw, unten, E]], true, 0.2), { ton: -0.08 })); for (let x = 50 - Hw + 1.6; x < 50 + Hw; x += 1.6) t.push(linie(`M${f(x)} ${unten - 5.6} l0 5.4`, S.cD, 0.35, 0.45)); }
  else if (!p.strick) t.push(naht(`M${f(50 - Hw + 0.8)} ${unten - 2.2} Q50 ${unten - 1.4} ${f(50 + Hw - 0.8)} ${unten - 2.2}`, S, 0.45));
  if (p.rueschen) for (let x = 50 - Hw + 2; x < 50 + Hw - 1; x += 3) t.push(`<circle cx="${f(x)}" cy="${unten + 0.6}" r="1.6" fill="${S.c}" stroke="${S.cK}" stroke-width="0.3" opacity="0.9"/>`);
  if (p.schleife) t.push(`<path d="M50 ${oben + 5} l-5 -2.6 l0 5.2 Z M50 ${oben + 5} l5 -2.6 l0 5.2 Z" fill="${S.cD}"/>`);
  // Falten
  t.push(linie(`M${50 + Ww - 4} ${achselY + 4} Q${50 + Ww - 2} ${(achselY + unten) / 2} ${50 + Hw - 5} ${unten - 4}`, S.cD, 0.6, 0.35));
  t.push(linie(`M${50 - Ww + 6} ${achselY + 10} Q${50 - Ww + 4} ${(achselY + unten) / 2 + 6} ${50 - Hw + 7} ${unten - 3}`, S.cD, 0.5, 0.25));
  return M;
}

// ─────────────────────────────────────────── Unterteile
// p: laenge kurz|bermuda|cropped|lang, passform skinny|schmal|gerade|weit|baggy|flare|jogger|leggings, cargo, bundfalte, komfortbund, saum offen|umschlag, latz, ripped
export function hoseFlat(S, t, p) {
  const pf = p.passform ?? 'gerade';
  const lang = p.laenge ?? 'lang';
  const bund = p.latz ? 26 : 10, bw = pf === 'leggings' ? 15 : 18.5, hw = pf === 'leggings' ? 16 : pf === 'baggy' ? 22 : 20.5, schritt = lang === 'kurz' ? 38 : 34;
  const hem = { kurz: 50, bermuda: 64, cropped: 80, lang: 94 }[lang] ?? 94;
  const knie = Math.min(hem, 64);
  const halb = { skinny: 5.6, leggings: 4.6, schmal: 7, gerade: 8.6, weit: 12.5, baggy: 13, flare: 12, jogger: 6.2 }[pf] ?? 8.6;
  const knieHalb = pf === 'flare' ? 7.4 : pf === 'skinny' || pf === 'leggings' ? halb + 1.6 : pf === 'jogger' ? 8.6 : halb;
  const mitte = lang === 'kurz' ? 50 + hw / 2 + 1 : 50 + (pf === 'weit' || pf === 'baggy' ? 13.5 : 11.5);
  for (const s of [1, -1]) {
    const aussen = [[50 + bw, bund + 4, E], [50 + hw, bund + 18]];
    if (hem > knie + 4) aussen.push([mitte + knieHalb, knie]);
    aussen.push([mitte + (lang === 'kurz' ? halb * 0.8 + 2.4 : halb), hem, E]);
    const innen = [[Math.max(lang === 'kurz' ? 54 : 51.2, mitte - (lang === 'kurz' ? halb * 0.8 : halb)), hem + (lang === 'kurz' ? -2 : 0), E]];
    if (hem > knie + 4) innen.push([mitte - knieHalb, knie]);
    innen.push([50.6, schritt]);
    const pts = [[50, bund + 4, E], ...aussen, ...innen, [50.2, schritt - 6]];
    t.push(flaeche(S, glatt(s > 0 ? pts : sp(pts), true, 0.32)));
    const xa = aussen.at(-1)[0], xi = innen[0][0], yi = innen[0][1];
    if (pf === 'jogger') { t.push(flaeche(S, glatt([[X(s, xi + 0.2), hem - 5, E], [X(s, xa - 0.2), hem - 5, E], [X(s, xa), hem, E], [X(s, xi), hem, E]], true, 0.2), { ton: -0.08 })); }
    if (p.saum === 'umschlag') t.push(flaeche(S, glatt([[X(s, xi - 0.3), yi - 5, E], [X(s, xa + 0.4), hem - 5, E], [X(s, xa + 0.4), hem + 0.4, E], [X(s, xi - 0.3), yi + 0.4, E]], true, 0.2), { ton: 0.1 }));
    if (p.saum === 'offen') {
      t.push(linie(`M${f(X(s, xi))} ${f(yi - 1.2)} L${f(X(s, xa))} ${f(hem - 1.2)}`, hell(S.c, 0.45), 1.4, 0.85));
      for (let i = 0; i <= 9; i++) { const u = i / 9; t.push(linie(`M${f(X(s, xi + (xa - xi) * u))} ${f(yi + (hem - yi) * u - 0.2)} l${s * 0.2} ${1.3 + (i % 3) * 0.4}`, hell(S.c, 0.55), 0.5)); }
    }
    if (p.cargo) { const y = (bund + 18 + Math.min(hem, 70)) / 2 + 4, x = 50 + hw - 1.5; t.push(flaeche(S, glatt([[X(s, x + 0.6), y - 7, E], [X(s, x - 8), y - 7, E], [X(s, x - 8), y + 7, E], [X(s, x + 0.6), y + 7, E]], true, 0.2), { ton: -0.06 }), linie(`M${f(X(s, x - 8))} ${f(y - 3.6)} L${f(X(s, x + 0.6))} ${f(y - 3.6)}`, S.cK, 0.6, 0.8)); }
    if (p.bundfalte || pf === 'weit' || pf === 'gerade' && !S.denim) t.push(linie(`M${f(X(s, mitte))} ${bund + 9} L${f(X(s, mitte + (pf === 'flare' ? 0 : 0.4)))} ${f(hem - 2)}`, S.cD, 0.6, 0.5));
    if (p.bundfalte) t.push(linie(`M${f(X(s, 50 + 8))} ${bund + 5} l${s * 0.8} 8`, S.cD, 0.6, 0.7));
    // Taschen
    if (S.denim || p.taschen !== false) t.push(linie(`M${f(X(s, 50 + bw - 1.4))} ${bund + 5} Q${f(X(s, 50 + bw - 3))} ${bund + 12} ${f(X(s, 50 + 6.5))} ${bund + 5}`, S.cK, 0.6, 0.6));
    if (S.denim) { t.push(naht(`M${f(X(s, 50 + bw - 2.4))} ${bund + 5} Q${f(X(s, 50 + bw - 4))} ${bund + 13} ${f(X(s, 50 + 6))} ${bund + 5.4}`, S)); t.push(naht(`M${f(X(s, 50 + hw - 1.2))} ${bund + 18} L${f(X(s, xa - 1.2))} ${f(hem - 3)}`, S, 0.55)); }
    if (p.ripped) for (const y of [knie - 6, knie - 2.5]) t.push(linie(`M${f(X(s, mitte - 3))} ${y} l${s * 6} 0.4`, hell(S.c, 0.6), 0.9));
    if (S.denim && lang !== 'kurz') t.push(`<path d="M${f(X(s, mitte - halb + 2))} ${bund + 22} Q${f(X(s, mitte))} ${bund + 30} ${f(X(s, mitte - 1))} ${knie}" stroke="#fff" stroke-width="4" fill="none" opacity="0.08"/>`);
  }
  // Bund
  t.push(flaeche(S, glatt([[50 - bw, bund, E], [50 + bw, bund, E], [50 + bw, bund + 5, E], [50 - bw, bund + 5, E]], true, 0.2), { ton: p.komfortbund || pf === 'jogger' || pf === 'leggings' ? 0.04 : -0.06 }));
  if (p.komfortbund || pf === 'jogger' || pf === 'leggings') {
    for (let x = 50 - bw + 2; x < 50 + bw; x += 2.2) t.push(linie(`M${f(x)} ${bund + 0.6} l0 3.8`, S.cD, 0.35, 0.5));
    if (pf === 'jogger') t.push(linie(`M48 ${bund + 4} q-1 5 -2 7 M52 ${bund + 4} q1 5 2 7`, hell(S.c, 0.6), 0.8));
  } else {
    for (const x of [-bw + 3, -9, 9, bw - 3]) t.push(`<rect x="${f(50 + x - 0.8)}" y="${bund - 0.6}" width="1.6" height="6.2" rx="0.4" fill="${S.cD}"/>`);
    t.push(S.denim ? `<circle cx="50" cy="${bund + 2.5}" r="1.5" fill="#caa34c" stroke="#8f6f2a" stroke-width="0.35"/>` : knopf(50, bund + 2.5, S, 1));
    t.push(linie(`M51.6 ${bund + 5} Q52.2 ${schritt - 9} 54.4 ${schritt - 12}`, S.cD, 0.6, 0.8));
  }
  t.push(linie(`M50 ${schritt - 9} L50.3 ${schritt}`, S.cK, 0.6, 0.6));
  if (p.latz) {
    t.push(flaeche(S, glatt([[50 - 11, bund + 1, E], [50 - 10, bund - 15, E], [50 + 10, bund - 15, E], [50 + 11, bund + 1, E]], true, 0.2)));
    t.push(flaeche(S, glatt([[50 - 6, bund - 11, E], [50 + 6, bund - 11, E], [50 + 6, bund - 4, E], [50 - 6, bund - 4, E]], true, 0.2), { ton: -0.05 }));
    for (const s of [1, -1]) t.push(linie(`M${X(s, 50 + 8.5)} ${bund - 14} L${X(s, 50 + 13)} ${bund - 22}`, S.cD, 2.2), knopf(X(s, 50 + 8.4), bund - 13, S, 1.2));
  }
}

// ─────────────────────────────────────────── Röcke und Kleider
// p: laenge mini|knie|midi|maxi, form a-linie|plissee|bleistift|wickel|glocke|stufen
export function rockFlat(S, t, p, oben = 16) {
  const hem = { mini: oben + 34, knie: oben + 52, midi: oben + 64, maxi: oben + 78 }[p.laenge ?? 'knie'];
  const bw = 15.5;
  const flare = { bleistift: 15, gerade: 18, 'a-linie': 25, plissee: 28, glocke: 31, wickel: 24, stufen: 28 }[p.form ?? 'a-linie'];
  const r = [[50 + bw, oben, E], [50 + bw + 3, oben + 12], [50 + flare, hem, E]];
  t.push(flaeche(S, glatt([...r, [50 + flare * 0.5, hem + 1.6], [50 - flare * 0.5, hem + 1.6], ...sp([...r].reverse())], true, 0.3)));
  if (p.form === 'plissee') for (let i = -8; i <= 8; i++) t.push(linie(`M${f(50 + i * bw / 9)} ${oben + 5} L${f(50 + i * flare / 9)} ${f(hem + 1.2 - Math.abs(i) * 0.08)}`, i % 2 ? S.cD : hell(S.c, 0.16), i % 2 ? 0.7 : 1.1));
  else if (p.form === 'stufen') for (const u of [0.38, 0.7]) { const y = oben + (hem - oben) * u, w = bw + (flare - bw) * u + 1; t.push(linie(`M${f(50 - w)} ${f(y)} Q50 ${f(y + 1.8)} ${f(50 + w)} ${f(y)}`, S.cD, 0.9)); }
  else if (p.form === 'wickel') t.push(linie(`M${50 + bw - 3} ${oben + 4} Q${50 + 6} ${(oben + hem) / 2} ${50 - flare * 0.5} ${hem + 1}`, S.cD, 0.9));
  else if (flare > 20) for (const i of [-2, 0, 2]) t.push(linie(`M${50 + i * 5} ${oben + 9} Q${50 + i * 7.5} ${(oben + hem) / 2} ${50 + i * 9.5} ${hem}`, S.cD, 0.6, 0.45));
  else t.push(naht(`M50 ${hem - 9} L50 ${hem + 1}`, S, 0.6));
  t.push(flaeche(S, glatt([[50 - bw, oben - 4, E], [50 + bw, oben - 4, E], [50 + bw, oben + 1, E], [50 - bw, oben + 1, E]], true, 0.2), { ton: -0.08 }));
  return hem;
}

export function kleidFlat(S, t, p) {
  const oben = 8;
  const taille = oben + 26;
  const rockP = { laenge: p.laenge ?? 'knie', form: p.form ?? 'a-linie' };
  const hem = { mini: taille + 30, knie: taille + 46, midi: taille + 56, maxi: taille + 62 }[rockP.laenge];
  const flare = { bleistift: 15, gerade: 18, etui: 16, 'a-linie': 25, plissee: 28, glocke: 31, wickel: 24, slip: 19, stufen: 28 }[rockP.form] ?? 25;
  // Rock
  const r = [[50 + 13.5, taille, E], [50 + 16.5, taille + 10], [50 + flare, hem, E]];
  t.push(flaeche(S, glatt([...r, [50 + flare * 0.5, hem + 1.6], [50 - flare * 0.5, hem + 1.6], ...sp([...r].reverse())], true, 0.3)));
  if (flare > 20) for (const i of [-2, 0, 2]) t.push(linie(`M${50 + i * 4} ${taille + 6} Q${50 + i * 7} ${(taille + hem) / 2} ${50 + i * 9.5} ${hem}`, S.cD, 0.6, 0.45));
  if (rockP.form === 'plissee') for (let i = -8; i <= 8; i++) t.push(linie(`M${f(50 + i * 13.5 / 9)} ${taille + 3} L${f(50 + i * flare / 9)} ${hem + 1}`, i % 2 ? S.cD : hell(S.c, 0.16), i % 2 ? 0.7 : 1.1));
  if (rockP.form === 'stufen') for (const u of [0.36, 0.68]) { const y = taille + (hem - taille) * u, w = 14 + (flare - 14) * u + 1; t.push(linie(`M${f(50 - w)} ${f(y)} Q50 ${f(y + 1.8)} ${f(50 + w)} ${f(y)}`, S.cD, 0.9)); }
  // Oberteil
  const aermel = p.aermel ?? (rockP.form === 'slip' ? 'traeger' : 'ohne');
  const kr = p.kragen ?? (aermel === 'traeger' ? 'v' : 'rund');
  const Sw = 17, nb = kr === 'carree' ? 8.5 : 6.5;
  if (aermel === 'kurz' || aermel === 'lang' || aermel === 'halb' || aermel === 'puff') for (const s of [1, -1]) {
    const a = [50 + Sw, oben + 4], ach = [50 + Sw - 1.6, oben + 17];
    const pts = aermel === 'lang' ? [a, [a[0] + 7, a[1] + 16], [a[0] + 11, hem - 22, E], [a[0] + 4, hem - 20, E], [ach[0] + 1, ach[1] + 12], ach]
      : aermel === 'halb' ? [a, [a[0] + 8, a[1] + 12], [a[0] + 11, a[1] + 24, E], [ach[0] + 5, ach[1] + 13, E], ach]
      : aermel === 'puff' ? [a, [a[0] + 7, a[1] - 1.5], [a[0] + 10, a[1] + 7], [a[0] + 8, a[1] + 12, E], [ach[0] + 3, ach[1] + 1, E], ach]
      : [a, [a[0] + 9, a[1] + 6.4, E], [ach[0] + 7.6, ach[1] + 1.4, E], ach];
    t.push(flaeche(S, glatt(s > 0 ? pts : sp(pts), true, 0.35)));
  }
  const ro = aermel === 'traeger' ? [[50 + nb + 1.5, oben + 4, E], [50 + 15.5, oben + 15], [50 + 14, taille, E]]
    : aermel === 'ohne' ? [[50 + nb, oben, E], [50 + nb + 5, oben + 0.8, E], [50 + Sw - 3, oben + 11], [50 + Sw - 1.4, oben + 16], [50 + 14, taille, E]]
    : [[50 + nb, oben, E], [50 + Sw, oben + 4, E], [50 + Sw - 1.6, oben + 17, E], [50 + 14, taille, E]];
  const tief = kr === 'v' ? oben + 14 : kr === 'carree' ? oben + 8 : oben + 5;
  const aus = kr === 'v' ? [[50, tief, E]] : kr === 'carree' ? [[50 - nb, tief, E], [50 + nb, tief, E]] : [[50 - nb * 0.55, oben + 3.4], [50, tief], [50 + nb * 0.55, oben + 3.4]];
  t.push(flaeche(S, glatt([...ro, [50, taille + 0.5], ...sp([...ro].reverse()), ...aus], true, 0.3)));
  if (aermel === 'traeger') for (const s of [1, -1]) t.push(linie(`M${X(s, 50 + nb + 2.4)} ${oben + 4.4} L${X(s, 50 + nb + 3.6)} ${oben - 6}`, S.cD, 0.9));
  if (kr === 'rund') t.push(linie(`M${50 - nb} ${oben} Q50 ${tief + 3.4} ${50 + nb} ${oben}`, S.cD, 1.2));
  if (kr === 'v') t.push(linie(`M${50 - nb} ${oben + (aermel === 'traeger' ? 4 : 0)} L50 ${tief} L${50 + nb} ${oben + (aermel === 'traeger' ? 4 : 0)}`, S.cD, 1));
  if (kr === 'hemd') { for (const s of [1, -1]) t.push(flaeche(S, glatt([[X(s, 50 + nb), oben - 0.4, E], [X(s, 50.6), oben + 4.4, E], [X(s, 53), oben + 10, E], [X(s, 50 + nb + 6), oben + 4.2, E]], true, 0.2), { ton: -0.03 })); for (let y = oben + 8; y < hem - 6; y += 8) t.push(knopf(50, y, S, 0.9)); }
  if (p.guertel || rockP.form === 'wickel') t.push(`<rect x="${50 - 15}" y="${taille - 2}" width="30" height="3.6" rx="1" fill="${dunkel(S.c, 0.25)}"/>`);
  else t.push(naht(`M${50 - 14} ${taille} Q50 ${taille + 0.6} ${50 + 14} ${taille}`, S, 0.5));
}

// ─────────────────────────────────────────── Jacken und Mäntel
// p: art blazer|mantel|trench|steppjacke|steppweste|jeansjacke|regenjacke|varsity|overshirt|parka|lederjacke|bomber|strickjacke, laenge kurz|normal|lang|mantel
export function jackeFlat(S, t, p) {
  const art = p.art ?? 'blazer';
  const unten = { kurz: 70, normal: 82, lang: 90, mantel: 95 }[p.laenge ?? ({ mantel: 'mantel', trench: 'mantel', parka: 'lang', steppjacke: 'normal', bomber: 'kurz', jeansjacke: 'kurz', lederjacke: 'kurz', varsity: 'kurz' }[art] ?? 'normal')];
  const oben = 9, Sw = art === 'steppjacke' || art === 'parka' ? 22 : 20, schY = oben + 4, achselY = oben + 22, Hw = art === 'mantel' || art === 'trench' ? 22 : 20.5;
  const ohne = art === 'steppweste';
  const M = { Sw, schY, achselY, unten, oben };
  if (!ohne) for (const s of [1, -1]) {
    t.push(flaeche(S, aermelPfad({ ...M, unten: Math.min(unten, 84) + 2 }, { aermel: 'lang' }, s), { ton: art === 'varsity' ? 0 : -0.02 }));
    if (art === 'bomber' || art === 'varsity' || art === 'steppjacke' || art === 'strickjacke') { const cuff = Math.min(unten, 84) - 2; t.push(flaeche(S, glatt([[X(s, 50 + Sw + 12.4), cuff - 5, E], [X(s, 50 + Sw + 12.6), cuff - 1.8, E], [X(s, 50 + Sw + 4.6), cuff, E], [X(s, 50 + Sw + 4.4), cuff - 4, E]], true, 0.2), { ton: -0.12 })); }
  }
  const halb = (s) => {
    const r = [[50 + 6, oben, E], [50 + Sw, schY, E], [50 + Sw - 1.2, achselY, E], [50 + Hw - 1, (achselY + unten) / 2], [50 + Hw, unten, E], [50 - (art === 'trench' || art === 'mantel' || art === 'blazer' ? 2 : 0.2), unten + 0.6, E], [50 - (art === 'trench' ? 2 : 0.2), oben + (art === 'blazer' || art === 'mantel' || art === 'trench' ? 24 : 6), E]];
    if (ohne) r.splice(1, 2, [50 + 13, oben + 1.2, E], [50 + Sw - 4, achselY - 6], [50 + Sw - 1.6, achselY]);
    return glatt(s > 0 ? r : sp(r), true, 0.3);
  };
  t.push(flaeche(S, halb(-1)), flaeche(S, halb(1), { ton: -0.03 }));
  const clipPfade = [halb(-1), halb(1), ...(ohne ? [] : [1, -1].map((s) => aermelPfad({ ...M, unten: Math.min(unten, 84) + 2 }, { aermel: 'lang' }, s)))];
  // Kragen / Revers
  if (art === 'blazer' || art === 'mantel' || art === 'trench') for (const s of [1, -1]) t.push(flaeche(S, glatt([[X(s, 50 + 6), oben, E], [X(s, 50 + 13), oben + 4, E], [X(s, 50 + 8), oben + 13, E], [X(s, 50 + 10), oben + 15, E], [X(s, 50 + 0.5), oben + 25, E], [X(s, 50 + 3), oben + 6, E]], true, 0.2), { ton: s < 0 ? 0.08 : -0.06 }));
  else if (art === 'jeansjacke' || art === 'overshirt' || art === 'lederjacke') for (const s of [1, -1]) t.push(flaeche(S, glatt([[X(s, 50 + 6), oben - 0.5, E], [X(s, 50 + 13), oben + 3.6, E], [X(s, 50 + 6), oben + 13, E], [X(s, 50 + 1), oben + 5, E]], true, 0.2), { ton: s < 0 ? 0.06 : -0.06 }));
  else if (art === 'regenjacke' || art === 'parka') t.push(flaeche(S, glatt([[50 - 9, oben + 1, E], [50 - 11, oben - 7], [50, oben - 11], [50 + 11, oben - 7], [50 + 9, oben + 1, E], [50, oben + 4]], true, 0.4), { ton: -0.07 }));
  else t.push(flaeche(S, glatt([[50 - 7, oben + 1, E], [50 - 7, oben - 4, E], [50 + 7, oben - 4, E], [50 + 7, oben + 1, E]], true, 0.2), { ton: -0.12 }));
  // Verschluss
  if (art === 'steppjacke' || art === 'steppweste' || art === 'regenjacke' || art === 'parka' || art === 'bomber' || art === 'lederjacke') {
    t.push(linie(`M50 ${oben + 1} L50 ${unten}`, dunkel(S.c, 0.45), 0.9), `<rect x="49.1" y="${oben + 1}" width="1.8" height="3.4" rx="0.4" fill="#c9c6bf"/>`);
  } else if (art === 'trench') { for (const y of [oben + 28, oben + 38, oben + 48]) for (const x of [44, 56]) t.push(knopf(x, y, S, 1.2)); }
  else { const bis = art === 'blazer' ? oben + 46 : unten - 6; for (let y = art === 'blazer' || art === 'mantel' ? oben + 28 : oben + 7; y < bis; y += art === 'blazer' ? 10 : 9.5) t.push(knopf(art === 'strickjacke' ? 50 : 51.2, y, S, 1.2)); }
  // Steppung
  if (art === 'steppjacke' || art === 'steppweste') {
    S.defs.push(`<clipPath id="${S.id}c">${clipPfade.map((d) => `<path d="${d}"/>`).join('')}</clipPath>`);
    const l = [];
    for (let y = oben + 7; y < unten - 2; y += 7) l.push(linie(`M10 ${y} Q50 ${y + 1.4} 90 ${y}`, S.cD, 0.7, 0.7));
    t.push(`<g clip-path="url(#${S.id}c)">${l.join('')}</g>`);
  }
  // Taschen
  if (art === 'jeansjacke' || art === 'overshirt') for (const s of [1, -1]) { t.push(flaeche(S, glatt([[X(s, 54), oben + 14, E], [X(s, 64), oben + 14, E], [X(s, 64), oben + 23, E], [X(s, 59), oben + 25, E], [X(s, 54), oben + 23, E]], true, 0.2), { ton: 0.04 })); t.push(knopf(X(s, 59), oben + 17, S, 0.9)); if (S.denim) t.push(naht(`M${X(s, 50 + 1.5)} ${oben + 30} L${X(s, 50 + Hw - 1)} ${oben + 30}`, S)); }
  else if (art !== 'steppweste') for (const s of [1, -1]) t.push(linie(`M${X(s, 54)} ${unten - 14} L${X(s, 50 + Hw - 4)} ${unten - 15}`, S.cK, 0.8, 0.8));
  if (art === 'trench' || p.guertel) t.push(`<rect x="${50 - Hw - 0.5}" y="${oben + 36}" width="${2 * Hw + 1}" height="4" rx="1" fill="${S.cD}"/>`, `<rect x="44" y="${oben + 35.2}" width="5" height="5.6" rx="0.8" fill="none" stroke="${dunkel(S.c, 0.4)}" stroke-width="0.8"/>`);
  if (art === 'bomber' || art === 'varsity' || art === 'strickjacke') t.push(flaeche(S, glatt([[50 - Hw, unten - 5, E], [50 + Hw, unten - 5, E], [50 + Hw, unten, E], [50 - Hw, unten, E]], true, 0.2), { ton: -0.12 }));
  if (art === 'varsity') t.push(`<text x="36" y="${oben + 22}" font-family="Georgia,serif" font-size="9" font-weight="700" fill="${hell(S.c, 0.75)}">H</text>`);
  if (art === 'lederjacke') t.push(linie(`M${50 + 3} ${oben + 4} L${50 + 16} ${oben + 26}`, S.cK, 0.8, 0.8));
}

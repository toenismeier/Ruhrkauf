// Q38: Oberteile aus dem Referenzsortiment (Wurf 4). Zeichner z:q38 (viewBox 0 0 100 100, Mitte x = 50, Licht von links).
// Bildparameter p.form wählt eine eigene Form (FORMEN); ohne form baut q33flat (Basis oberteil/jacke mit Dessin, Motiv, Q33-Extras)
// und danach die Q38-Details aus p.d (Liste, siehe DETAILS). Unterlagen (Layer, Lagenlook) zeichnet p.unter vor dem Oberteil.
// Zeichenvorlage waren die Kontaktbögen des Referenzsortiments (Schnitt, Proportion); gezeichnet im Hartwig-Stil, ohne Marken.
// Maße in Flatlay-Einheiten (Konfektion Gr. 38 bzw. M, 1 Einheit ≈ 1,2 cm), je Form eine Maßzeile.

import { glatt } from './model.js';
import { hell, dunkel, flaeche, materialDefs } from './stoff.js';
import { oberteilFlat, oberteilMasse, kurzarmGeo, naht, linie } from './flatlay.js';
import { q33flat } from './q33-kleidung.js';
import { dessin } from './q33-dessins.js';
import { motiv } from './q33-motive.js';

const f = (n) => Math.round(n * 10) / 10;
const E = 'ecke';
const sp = (pts) => pts.map(([x, y, e]) => [100 - x, y, e]);
const X = (s, x) => (s > 0 ? x : 100 - x);
const beide = (r) => [...r, ...sp([...r].reverse()).slice(1, -1)];
const boden = (t, y = 96, rx = 30) => t.push(`<ellipse cx="50" cy="${y}" rx="${rx}" ry="2.4" fill="#000" opacity="0.07"/>`);
const knopf = (x, y, S, r = 1) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${hell(S.c, 0.35)}" stroke="${S.cK}" stroke-width="0.35"/>`;
const metallknopf = (x, y, r = 1.1) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="#b9a172" stroke="#6f5f3e" stroke-width="0.35"/><circle cx="${f(x - 0.3)}" cy="${f(y - 0.3)}" r="${f(r * 0.35)}" fill="#efe2bd"/>`;
const blende = (S, d, w = 1.8, c) => linie(d, c ?? dunkel(S.c, 0.12), w) + linie(d, hell(c ?? S.c, 0.14), 0.4, 0.7);
const zweit = (S, farbe, material = 'baumwolle', muster) => materialDefs(farbe, material, S.defs, muster);

// eigene Stoffbilder (Pattern im Stoffkontext): Lochstrick, Nadelstreifen senkrecht, Kunstfell
function muster(S, w, h, inhalt) {
  const id = `${S.id}q38${w}${h}${Math.round(Math.random() * 1e6).toString(36)}`;
  S.defs.push(`<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse">${inhalt}</pattern>`);
  return `url(#${id})`;
}
const STOFF = {
  loch: (S) => muster(S, 4, 4, `<circle cx="1" cy="1" r="0.75" fill="${dunkel(S.c, 0.55)}" opacity="0.85"/><circle cx="3" cy="3" r="0.75" fill="${dunkel(S.c, 0.55)}" opacity="0.85"/><path d="M0 2 H4" stroke="#000" stroke-opacity="0.12" stroke-width="0.4"/>`),
  nadel: (S) => muster(S, 3.2, 4, `<path d="M1.6 0 V4" stroke="${dunkel(S.c, 0.6)}" stroke-width="0.55" opacity="0.8"/>`),
  // Maschenbild grob (V-Maschen 3,2 × 3), deutlich sichtbar auch in 64 px
  masche: (S) => muster(S, 2.4, 2.4, `<path d="M0.2 0.3 L1.2 2.1 L2.2 0.3" stroke="#000" stroke-opacity="0.24" stroke-width="0.5" fill="none"/><path d="M0.5 0.2 L1.2 1.5" stroke="#fff" stroke-opacity="0.2" stroke-width="0.35"/>`),
  // Rippstrick: Längsrippen 1,8 breit
  rippstrick: (S) => muster(S, 1.8, 4, `<path d="M0.9 0 V4" stroke="#000" stroke-opacity="0.32" stroke-width="0.8"/><path d="M0.2 0 V4" stroke="#fff" stroke-opacity="0.18" stroke-width="0.4"/>`),
  // Sweat meliert
  melange: (S) => muster(S, 3, 3, `<circle cx="0.6" cy="0.8" r="0.35" fill="#fff" opacity="0.4"/><circle cx="2.2" cy="2.1" r="0.3" fill="#000" opacity="0.18"/><circle cx="2.4" cy="0.5" r="0.25" fill="#fff" opacity="0.3"/>`),
  // Mesh (Sporteinsatz)
  mesh: (S) => muster(S, 2.2, 2.2, `<circle cx="1.1" cy="1.1" r="0.55" fill="#000" opacity="0.38"/>`),
  fell: (S) => muster(S, 9, 9, [[1, 1, 0], [4.6, 0.4, 1], [7.4, 2, 0], [2.6, 4.4, 1], [6, 5, 0], [0.4, 7, 1], [4, 7.6, 0], [8, 7, 1]].map(([x, y, k]) =>
    `<path d="M${x} ${y} q1.6 1.2 1 3.6 q-0.2 0.8 0.6 1.2" stroke="${k ? '#fff' : '#000'}" stroke-opacity="${k ? 0.45 : 0.16}" stroke-width="0.7" fill="none" stroke-linecap="round"/>`).join('')),
};

// Langarm und Kurzarm wie flatlay.js (Ärmel hinter dem Rumpf), mit Versatz dy für Off-Shoulder
function aermelLang(M, p, s, dy = 0) {
  const { Sw, schY, achselY } = M;
  const drop = p.passform === 'oversize' || p.passform === 'boxy' ? 3 : 0;
  const a = [50 + Sw - drop, schY + drop * 0.6 + dy], ach = [50 + Sw - 1.2, achselY + dy];
  const cuff = (p.cuff ?? M.unten - (p.laenge === 'crop' ? -14 : 4)) + dy, w = p.weit ?? 7.9;
  const pts = [a, [a[0] + 8, a[1] + 18], [a[0] + 12.5, cuff - 2, E], [a[0] + 12.5 - w, cuff, E], [ach[0] + 1.2, ach[1] + 14], ach];
  return { d: glatt(s > 0 ? pts : sp(pts), true, 0.35), a, ach, cuff, au: [a[0] + 12.5, cuff - 2], iu: [a[0] + 12.5 - w, cuff] };
}
// Punkt auf dem Langarm (u = 0 Schulter … 1 Bündchen), außen und innen
function aermelQuer(G, u) {
  const ax = G.a[0] + (G.au[0] - G.a[0]) * u, ay = G.a[1] + (G.au[1] - G.a[1]) * u;
  const ix = G.ach[0] + (G.iu[0] - G.ach[0]) * u, iy = G.ach[1] + (G.iu[1] - G.ach[1]) * u;
  return [[ax, ay], [ix, iy]];
}
function buendchen(S, t, G, s, h = 4.6, S2) {
  const [o1, i1] = aermelQuer(G, 1 - h / Math.max(20, G.cuff - G.a[1]));
  const pts = [[X(s, o1[0]), o1[1], E], [X(s, G.au[0]), G.au[1], E], [X(s, G.iu[0]), G.iu[1], E], [X(s, i1[0]), i1[1], E]];
  t.push(flaeche(S2 ?? S, glatt(pts, true, 0.2), { ton: S2 ? 0 : -0.08 }));
  for (let i = 1; i < 6; i++) { const u = i / 6; t.push(linie(`M${f(X(s, i1[0] + (o1[0] - i1[0]) * u))} ${f(i1[1] + (o1[1] - i1[1]) * u)} L${f(X(s, G.iu[0] + (G.au[0] - G.iu[0]) * u))} ${f(G.iu[1] + (G.au[1] - G.iu[1]) * u)}`, (S2 ?? S).cD, 0.35, 0.5)); }
}
// Querstreifen über den Ärmel bei u (Kontrastband, Sportstreifen)
function aermelBand(t, G, s, u, b, c) {
  const [o1, i1] = aermelQuer(G, u), [o2, i2] = aermelQuer(G, u + b);
  t.push(`<path d="M${f(X(s, o1[0]))} ${f(o1[1])} L${f(X(s, o2[0]))} ${f(o2[1])} L${f(X(s, i2[0]))} ${f(i2[1])} L${f(X(s, i1[0]))} ${f(i1[1])} Z" fill="${c}" opacity="0.95"/>`);
}

// ─────────────────────────────────────────── Details über dem Oberteil (p.d)
const DETAILS = {
  // Ringer: Halsblende 2,2 und Ärmelsaumblende 2,4 in Kontrastfarbe (p.kontrast)
  ringer(S, t, p, M) {
    const c = p.kontrast ?? '#6a4630', nb = 6.8, o = M.oben, tief = o + 5.2;
    t.push(linie(`M${50 - nb} ${o} Q50 ${f(tief + 3.6)} ${50 + nb} ${o}`, c, 2.8), linie(`M${50 - nb + 0.4} ${o - 0.6} Q50 ${f(tief + 2.4)} ${50 + nb - 0.4} ${o - 0.6}`, hell(c, 0.25), 0.5, 0.8));
    const g = kurzarmGeo(M, p), i = 2.4;
    for (const s of [1, -1]) t.push(`<path d="M${f(X(s, g.o[0]))} ${f(g.o[1])} L${f(X(s, g.u[0]))} ${f(g.u[1])} L${f(X(s, g.u[0] - i * g.c))} ${f(g.u[1] - i * g.sn)} L${f(X(s, g.o[0] - i * g.c))} ${f(g.o[1] - i * g.sn)} Z" fill="${c}"/>`);
  },
  // Raglan kurz: schräge Naht vom Hals bis Achsel, Ärmel in Kontraststoff
  raglankurz(S, t, p, M) {
    const S2 = zweit(S, p.kontrast ?? 'schwarz', 'baumwolle'), g = kurzarmGeo(M, p);
    for (const s of [1, -1]) {
      const pts = [[X(s, 55.6), M.oben + 1.4, E], [X(s, g.a[0]), g.a[1]], [X(s, g.o[0]), g.o[1], E], [X(s, g.u[0]), g.u[1], E], [X(s, g.ach[0]), g.ach[1], E]];
      t.push(flaeche(S2, glatt(pts, true, 0.25)));
      t.push(naht(`M${f(X(s, 55.6))} ${M.oben + 2} L${f(X(s, g.ach[0] - 0.4))} ${f(g.ach[1] - 0.6)}`, S, 0.6));
    }
    t.push(linie(`M43.2 ${M.oben} Q50 ${M.oben + 8.8} 56.8 ${M.oben}`, dunkel(p.kontrast === 'weiß' ? '#cfcac0' : '#2a2c30', 0.05), 2.6));
  },
  // Raglan lang (Baseballshirt): Kontrastärmel bis Handgelenk, Naht vom Hals zur Achsel
  raglanlang(S, t, p, M) {
    const S2 = zweit(S, p.kontrast ?? 'rot', 'baumwolle');
    for (const s of [1, -1]) {
      const G = aermelLang(M, p, s);
      const pts = [[55.6, M.oben + 1.4, E], [G.a[0], G.a[1]], [G.a[0] + 8, G.a[1] + 18], [G.au[0], G.au[1], E], [G.iu[0], G.iu[1], E], [G.ach[0] + 1.2, G.ach[1] + 14], [G.ach[0], G.ach[1], E]];
      t.push(flaeche(S2, glatt(s > 0 ? pts : sp(pts), true, 0.3)));
      t.push(naht(`M${f(X(s, 55.6))} ${M.oben + 2} L${f(X(s, G.ach[0] - 0.4))} ${f(G.ach[1] - 0.6)}`, S, 0.6));
    }
    t.push(linie(`M43.2 ${M.oben} Q50 ${M.oben + 8.8} 56.8 ${M.oben}`, zweit(S, p.kontrast ?? 'rot').c, 2.6));
  },
  // lange Knopfleiste (Henley-Longsleeve): 2,6 breit bis Brust, 7 Knöpfe
  henleylang(S, t, p, M) {
    const o = M.oben;
    t.push(flaeche(S, glatt([[48.6, o + 3, E], [51.4, o + 3, E], [51.4, o + 27, E], [48.6, o + 27, E]], true, 0.2), { ton: -0.05 }));
    t.push(naht(`M48.2 ${o + 3} L48.2 ${o + 27.4} L51.8 ${o + 27.4} L51.8 ${o + 3}`, S, 0.55));
    for (let y = o + 5.4; y < o + 26; y += 3.4) t.push(knopf(50, y, S, 0.75));
  },
  // Johnny-Kragen (Strickpolo): offener V-Schlitz ohne Knöpfe, Kragen und Blende in Kontrast
  johnny(S, t, p, M) {
    const o = M.oben, c = p.kontrast ?? '#8a3f2a';
    t.push(`<path d="M47 ${o + 2} L50 ${o + 15} L53 ${o + 2} Z" fill="${dunkel(S.c, 0.32)}"/>`, linie(`M46.6 ${o + 1.6} L50 ${o + 15.6} L53.4 ${o + 1.6}`, c, 1.6));
  },
  // halber Reißverschluss (Polo-Sweat): 15 lang ab Kragen
  halbzip(S, t, p, M) {
    const o = M.oben;
    t.push(`<path d="M49 ${o + 3} L51 ${o + 3} L51 ${o + 18} L49 ${o + 18} Z" fill="${dunkel(S.c, 0.4)}"/>`);
    for (let y = o + 3.6; y < o + 18; y += 1.3) t.push(linie(`M49.3 ${f(y)} l1.4 0`, '#c9c6bf', 0.35, 0.8));
    t.push(`<rect x="48.8" y="${o + 4}" width="2.4" height="3.6" rx="0.5" fill="#d9d6cf" stroke="#77736b" stroke-width="0.3"/>`, linie(`M50 ${o + 7.6} l0 3`, '#9c978d', 0.9));
  },
  // Ärmelstreifen (Polo-Sweat, Sweatjacke): zwei Bänder am Oberarm in p.streifen
  aermelstreifen(S, t, p, M) {
    for (const s of [1, -1]) { const G = aermelLang(M, p, s); aermelBand(t, G, s, 0.42, 0.06, p.streifen ?? '#c8372f'); aermelBand(t, G, s, 0.5, 0.035, '#f4f3ef'); }
  },
  // Brustband (Strickpullover): breites Kontrastband quer über Brust und Ärmel, darunter feine Linie
  brustband(S, t, p, M) {
    const S2 = zweit(S, p.kontrast ?? 'olive', 'strick'), y0 = M.achselY + 4, y1 = y0 + 8;
    const wx = (y) => 50 + (M.Sw - 1.2) + (M.Ww - M.Sw + 1.2) * Math.min(1, (y - M.achselY) / ((M.unten - M.achselY) * 0.45));
    t.push(flaeche(S2, `M${f(100 - wx(y0))} ${y0} L${f(wx(y0))} ${y0} L${f(wx(y1))} ${y1} L${f(100 - wx(y1))} ${y1} Z`));
    t.push(`<path d="M${f(100 - wx(y1 + 2))} ${y1 + 2} L${f(wx(y1 + 2))} ${y1 + 2}" stroke="#f4f3ef" stroke-width="1.4" opacity="0.92"/>`);
    for (const s of [1, -1]) { const G = aermelLang(M, p, s); aermelBand(t, G, s, 0.3, 0.22, S2.c); aermelBand(t, G, s, 0.56, 0.045, '#f4f3ef'); }
  },
  // Schulterknöpfe (Kurzarm-Strick): drei Knöpfe auf der linken Schulter
  schulterknoepfe(S, t, p, M) { for (let i = 0; i < 3; i++) t.push(knopf(57.6 + i * 2.6, M.oben + 1.2 + i * 0.9, S, 0.7)); },
  // Abnäher und Manschetten (Hemdbluse): Brustabnäher 18 lang, Manschette 5 hoch mit Knopf
  abnaeher(S, t, p, M) {
    for (const s of [1, -1]) t.push(linie(`M${X(s, 58)} ${M.achselY + 4} Q${X(s, 57.4)} ${M.achselY + 14} ${X(s, 57.6)} ${M.achselY + 24}`, S.cD, 0.6, 0.55));
    for (const s of [1, -1]) { const G = aermelLang(M, p, s); buendchen(S, t, G, s, 5.4); const [o] = aermelQuer(G, 0.96); t.push(knopf(X(s, o[0] - 2), o[1] + 1, S, 0.7)); }
  },
  // Schlüsselloch am Hals (Spitzenshirt): Tropfen 4 hoch, Knopf im Nacken
  schluesselloch(S, t, p, M) {
    const o = M.oben;
    t.push(`<path d="M50 ${o + 3} Q47.6 ${o + 6} 50 ${o + 9.4} Q52.4 ${o + 6} 50 ${o + 3} Z" fill="${hell(S.c, 0.75)}" stroke="${S.cK}" stroke-width="0.4"/>`, knopf(50, o + 1.4, S, 0.8));
  },
  // Flatlock-Nähte (Sportshirt): Teilungsnähte vorn in heller Doppelnaht
  flatlock(S, t, p, M) {
    for (const s of [1, -1]) {
      const d = `M${X(s, 58)} ${M.oben + 1} Q${X(s, 61)} ${M.achselY + 6} ${X(s, 58.4)} ${M.unten - 1}`;
      t.push(linie(d, hell(S.c, 0.55), 0.5, 0.9), `<path d="${d}" stroke="${hell(S.c, 0.55)}" stroke-width="1.6" stroke-dasharray="0.4 0.8" fill="none" opacity="0.7"/>`);
    }
  },
  // Paspeln (Sweat-Troyer): Kontrastpaspel von der Schulter über den Ärmel und die Seite
  paspel(S, t, p, M) {
    const c = p.kontrast ?? '#c9ced3';
    for (const s of [1, -1]) {
      const G = aermelLang(M, p, s);
      t.push(linie(`M${f(X(s, 56))} ${M.oben + 1.4} L${f(X(s, G.a[0] - 1))} ${f(G.a[1] + 1)} L${f(X(s, G.au[0] - 0.8))} ${f(G.au[1] - 3)}`, c, 0.8, 0.95));
      t.push(linie(`M${f(X(s, M.Sw + 48.4))} ${M.achselY + 2} Q${f(X(s, 50 + M.Ww - 0.8))} ${f((M.achselY + M.unten) / 2)} ${f(X(s, 50 + M.Hw - 1.4))} ${M.unten - 6}`, c, 0.8, 0.95));
    }
  },
  // Wickelschleife (Wickeljacke): Bindeband an der linken Seite, Schleife mit zwei Enden
  wickelschleife(S, t, p, M) {
    const y = M.unten - 10, x = 50 - M.Ww + 1.6;
    t.push(`<path d="M${x} ${y} l-5 -3 l0.6 6 Z M${x} ${y} l5 -2.6 l-0.4 5.6 Z" fill="${dunkel(S.c, 0.12)}" stroke="${S.cK}" stroke-width="0.4"/>`);
    t.push(linie(`M${x - 0.6} ${y + 1} q-2 6 -4 11 M${x + 0.6} ${y + 1} q1 6 2.6 10`, dunkel(S.c, 0.1), 1.8), `<circle cx="${x}" cy="${y}" r="1.4" fill="${dunkel(S.c, 0.2)}"/>`);
  },
  // Knoten vorn (Wickelbluse): Bindebänder in der vorderen Mitte geknotet, Enden 9 lang
  knoten(S, t, p, M) {
    const y = M.unten - 6;
    t.push(`<ellipse cx="50" cy="${y}" rx="2.6" ry="2" fill="${dunkel(S.c, 0.15)}" stroke="${S.cK}" stroke-width="0.4"/>`);
    t.push(flaeche(S, glatt([[49, y + 1, E], [46, y + 11, E], [43.4, y + 10, E], [47.6, y + 0.4, E]], true, 0.2), { ton: -0.06 }), flaeche(S, glatt([[51, y + 1, E], [55.4, y + 9.4, E], [53, y + 11, E], [52.4, y + 0.6, E]], true, 0.2), { ton: -0.1 }));
  },
  // Kreuzträger (Sporttop): zwei Träger über Kreuz sichtbar über dem Ausschnitt
  kreuz(S, t, p, M) { t.push(linie('M41.5 8 L58 24', dunkel(S.c, 0.1), 1.2), linie('M58.5 8 L42 24', dunkel(S.c, 0.18), 1.2)); },
  // Rundsaum (Baseballshirt, Hemdbluse): Saum hinten länger, vorn hochgezogene Seiten
  rundsaum(S, t, p, M) { for (const s of [1, -1]) t.push(`<path d="M${f(X(s, 50 + M.Hw + 0.4))} ${M.unten - 6} Q${f(X(s, 50 + M.Hw - 3))} ${M.unten + 0.2} ${f(X(s, 50 + M.Hw + 0.4))} ${M.unten + 1}" fill="#f3f1ec" stroke="none"/>`, linie(`M${f(X(s, 50 + M.Hw - 0.6))} ${M.unten - 6} Q${f(X(s, 50 + M.Hw - 3.4))} ${M.unten - 0.6} ${f(X(s, 50 + M.Hw - 7))} ${M.unten + 0.4}`, S.cK, 0.6, 0.55)); },
  // Brusttasche mit Patte rechts (Jeanshemd, Jeans-Top)
  pattentasche(S, t, p, M) {
    for (const x of p.zwei ? [35, 57] : [57]) {
      const y = M.oben + 13;
      t.push(flaeche(S, glatt([[x, y, E], [x + 8.4, y, E], [x + 8.4, y + 9, E], [x + 4.2, y + 10.4, E], [x, y + 9, E]], true, 0.2), { ton: 0.03 }), naht(`M${x + 0.8} ${y + 1} L${x + 0.8} ${y + 8.6} L${x + 4.2} ${y + 9.8} L${x + 7.6} ${y + 8.6} L${x + 7.6} ${y + 1}`, S, 0.7));
      t.push(flaeche(S, glatt([[x - 0.3, y - 1, E], [x + 8.7, y - 1, E], [x + 8.7, y + 2.6, E], [x + 4.2, y + 4, E], [x - 0.3, y + 2.6, E]], true, 0.2), { ton: -0.08 }), metallknopf(x + 4.2, y + 2.4, 0.8));
    }
  },
  // Kontrastnähte auf Denim
  denimnaht(S, t, p, M) {
    const kn = (d) => `<path d="${d}" stroke="#e0a040" stroke-width="0.7" stroke-dasharray="1.3 0.8" fill="none"/>`;
    const y0 = M.oben + (p.kragen === 'carree' ? 10 : 4);
    for (const s of [1, -1]) t.push(kn(`M${X(s, 52.4)} ${y0} L${X(s, 52.4)} ${M.unten - 2}`), kn(`M${X(s, 53.4)} ${y0} L${X(s, 53.4)} ${M.unten - 2}`), kn(`M${X(s, 56.5)} ${M.oben + 1} Q${X(s, 62)} ${M.oben + 6} ${X(s, 68)} ${M.oben + 6.6}`), kn(`M${X(s, 59)} ${M.oben + 24} Q${X(s, 58.4)} ${M.oben + 40} ${X(s, 59.6)} ${M.unten - 2}`));
    t.push(`<path d="M44 ${M.oben + 20} Q42 ${M.oben + 40} 45 ${M.unten - 6}" stroke="#fff" stroke-width="5" fill="none" opacity="0.1"/>`);
  },
  // Metallknöpfe vorn statt Stoffknöpfe
  metall(S, t, p, M) { for (let y = M.oben + 7; y < M.unten - 2; y += p.abstand ?? 8) t.push(metallknopf(50, y, 1.05)); },
  // Halskordeln (Strick-Hoodie): zwei Kordeln 14 lang mit Endstück
  kordeln(S, t, p, M) {
    const o = M.oben, c = p.kordel ?? hell(S.c, 0.4);
    t.push(linie(`M47.4 ${o + 8} q-0.6 8 0 15 M52.6 ${o + 8} q0.6 8 0 15`, c, 1), `<rect x="46.5" y="${o + 22.6}" width="1.6" height="2.6" rx="0.4" fill="${dunkel(c, 0.3)}"/><rect x="51.9" y="${o + 22.6}" width="1.6" height="2.6" rx="0.4" fill="${dunkel(c, 0.3)}"/>`);
  },
  // Glockenärmel (Wickelbluse): Trompete am Ärmelsaum, 9 lang, Saumweite 16
  glocke(S, t, p, M) {
    for (const s of [1, -1]) {
      const G = aermelLang(M, p, s), [o1, i1] = aermelQuer(G, 0.72);
      const pts = [[o1[0], o1[1], E], [G.au[0] + 5, G.au[1] + 4, E], [G.iu[0] - 4, G.iu[1] + 6, E], [i1[0], i1[1], E]];
      t.push(flaeche(S, glatt(s > 0 ? pts : sp(pts), true, 0.3), { ton: -0.03 }));
      t.push(linie(`M${f(X(s, (o1[0] + i1[0]) / 2))} ${f((o1[1] + i1[1]) / 2)} L${f(X(s, (G.au[0] + G.iu[0]) / 2 + 0.5))} ${f((G.au[1] + G.iu[1]) / 2 + 5)}`, S.cD, 0.5, 0.5));
    }
  },
  // Kurzarm-Bündchen (Kurzarm-Sweat): Rippbund 2,6 am kurzen Ärmel
  kurzbund(S, t, p, M) {
    const g = kurzarmGeo(M, p), i = p.bundBreit ?? 2.8;
    for (const s of [1, -1]) {
      t.push(flaeche(S, `M${f(X(s, g.o[0]))} ${f(g.o[1])} L${f(X(s, g.u[0]))} ${f(g.u[1])} L${f(X(s, g.u[0] - i * g.c))} ${f(g.u[1] - i * g.sn)} L${f(X(s, g.o[0] - i * g.c))} ${f(g.o[1] - i * g.sn)} Z`, { ton: -0.1 }));
      for (let k = 1; k < 6; k++) { const u = k / 6; t.push(linie(`M${f(X(s, g.o[0] + (g.u[0] - g.o[0]) * u))} ${f(g.o[1] + (g.u[1] - g.o[1]) * u)} l${f(-s * i * g.c)} ${f(-i * g.sn)}`, S.cD, 0.35, 0.5)); }
    }
  },
  // Mesh-Seiteneinsätze (Sportshirt): 6 breit von der Achsel bis zum Saum
  meshseite(S, t, p, M) {
    const S2 = zweit(S, dunkel(S.c, 0.25), 'polyester'); S2.tex = STOFF.mesh(S2);
    for (const s of [1, -1]) {
      const pts = [[50 + M.Sw - 1.4, M.achselY + 1, E], [50 + M.Ww - 0.2, (M.achselY + M.unten) / 2], [50 + M.Hw - 0.2, M.unten - 0.4, E], [50 + M.Hw - 6, M.unten - 0.4, E], [50 + M.Ww - 6, (M.achselY + M.unten) / 2], [50 + M.Sw - 6, M.achselY + 3, E]];
      t.push(flaeche(S2, glatt(s > 0 ? pts : sp(pts), true, 0.3)));
    }
  },
  // Unterbrustband (Sporttop): breites Gummiband 6 in Kontrast
  unterbrust(S, t, p, M) {
    const u = p.unten ?? 60;
    t.push(flaeche(zweit(S, p.kontrast ?? '#2a2c30', 'polyester'), glatt([[33.4, u - 6, E], [66.6, u - 6, E], [66.4, u + 0.8, E], [33.6, u + 0.8, E]], true, 0.2)));
  },
  // V-Einsatz am Halsbündchen (Sweatshirt): Dreieck 5 × 4 in Rippe unter dem Rundhals
  vinsert(S, t, p, M) {
    const o = M.oben;
    t.push(`<path d="M47.4 ${o + 5.4} L50 ${o + 10} L52.6 ${o + 5.4} Z" fill="${dunkel(S.c, 0.12)}" stroke="${S.cK}" stroke-width="0.4"/>`);
    for (const x of [48.6, 50, 51.4]) t.push(linie(`M${x} ${o + 5.8} L${x} ${o + 8 - Math.abs(x - 50)}`, S.cD, 0.35, 0.6));
  },
  // geteilte Kängurutaschen (Sweatjacke) links und rechts des Reißverschlusses
  zipTaschen(S, t, p, M) {
    const y0 = M.unten - 22;
    for (const s of [1, -1]) t.push(linie(`M${X(s, 53)} ${y0} L${X(s, 61)} ${y0 + 2} Q${X(s, 63.4)} ${y0 + 9} ${X(s, 63.6)} ${M.unten - 7}`, S.cK, 0.9, 0.85));
  },
  // Spitzenkante am Saum und an den Ärmeln (Spitzenshirt)
  bogenkante(S, t, p, M) {
    const y = M.unten;
    for (let x = 50 - M.Hw + 1.2; x < 50 + M.Hw - 1; x += 2.6) t.push(`<path d="M${f(x)} ${y - 0.6} q1.3 2.6 2.6 0" fill="${S.c}" stroke="${S.cK}" stroke-width="0.35"/>`);
  },
};

// ─────────────────────────────────────────── eigene Formen (p.form)
// Rumpf aus rechter Hälfte (oben → unten), gespiegelt, mit Ausschnitt (Liste von Punkten von rechts nach links) als Abschluss
const rumpf = (r, ausschnitt) => glatt([...r, ...sp([...r].reverse()), ...ausschnitt], true, 0.32);

const FORMEN = {
  // Tanktop: Träger 3,6 breit, U-Ausschnitt 18 tief, Armloch bis 0,3 der Länge, tailliert, Blenden 1,4 an Ausschnitt und Armloch
  tank(S, t, p) {
    boden(t);
    const o = 9, u = p.unten ?? 84, r = [[57, o, E], [60.6, o, E], [62.4, 20], [67, 31, E], [64.6, Math.min(52, u - 8)], [66.4, u, E], [50, u + 0.8]];
    t.push(flaeche(S, rumpf(r, [[43, o, E], [44, 22], [50, 28.6], [56, 22]])));
    t.push(blende(S, `M43.2 ${o} Q43.6 24 50 28.2 Q56.4 24 56.8 ${o}`, 1.6));
    for (const s of [1, -1]) t.push(blende(S, `M${X(s, 60.6)} ${o} Q${X(s, 62)} 24 ${X(s, 67)} 31`, 1.6));
    t.push(naht(`M34.6 ${u - 2} Q50 ${u - 1} 65.4 ${u - 2}`, S, 0.5), linie(`M38 38 Q37 ${(38 + u) / 2} 36 ${u - 4}`, S.cD, 0.5, 0.25));
  },
  // Ärmelloses Shirt: Schulter angeschnitten bis zum Schulterpunkt (19 ab Mitte), Armloch 20 tief mit Blende, Rundhals 2,2er Rippe, leicht tailliert
  aermellos(S, t, p) {
    boden(t);
    const o = 12, r = [[57, o, E], [69.4, o + 3, E], [68.2, o + 10], [66.6, o + 22, E], [64.2, 52], [66, 84, E], [50, 84.8]];
    t.push(flaeche(S, rumpf(r, [[43, o, E], [45.2, o + 4.4], [50, o + 5.6], [54.8, o + 4.4]])));
    t.push(`<path d="${glatt([[43, o, E], [45.2, o + 4.4], [50, o + 5.6], [54.8, o + 4.4], [57, o, E], [54.8, o - 0.4], [50, o - 1], [45.2, o - 0.4]], true, 0.4)}" fill="${dunkel(S.c, 0.3)}"/>`);
    t.push(blende(S, `M43 ${o} Q50 ${o + 9} 57 ${o}`, 2.4));
    for (const s of [1, -1]) { t.push(blende(S, `M${X(s, 69.2)} ${o + 3.4} Q${X(s, 67)} ${o + 14} ${X(s, 66.6)} ${o + 22}`, 1.6)); t.push(naht(`M${X(s, 57.2)} ${o + 0.6} L${X(s, 69)} ${o + 3.4}`, S, 0.5)); }
    t.push(naht('M34.4 82 Q50 83 65.6 82', S, 0.5), linie('M38 40 Q37 60 36 80', S.cD, 0.5, 0.25));
    if (p.motiv) t.push(motiv(p.motiv, 50, 42, p.motivS ?? 15));
    if (p.raffung) for (const s of [1, -1]) for (let i = 0; i < 6; i++) t.push(linie(`M${X(s, 64.4 - i * 0.1)} ${f(56 + i * 4.2)} q${-s * 4} -0.6 ${-s * 7} -2.6`, S.cD, 0.6, 0.55));
  },
  // Muscle-Shirt: boxy, Schulterbreite 10 ab Hals, Armloch bis Taille (0,55 der Länge) roh geschnitten, Rundhals 2er Rippe
  muscle(S, t, p) {
    boden(t, 96, 32);
    const o = 11, r = [[57, o, E], [68, o + 2.4, E], [66.4, 26], [66.8, 42], [71.4, 53, E], [71.4, 86, E], [50, 86.6]];
    t.push(flaeche(S, rumpf(r, [[43, o, E], [45.2, o + 4.4], [50, o + 6], [54.8, o + 4.4]])));
    t.push(`<path d="${glatt([[43, o, E], [45.2, o + 4.4], [50, o + 6], [54.8, o + 4.4], [57, o, E], [54.8, o - 0.4], [50, o - 1], [45.2, o - 0.4]], true, 0.4)}" fill="${dunkel(S.c, 0.3)}"/>`);
    t.push(blende(S, `M43 ${o} Q50 ${o + 9} 57 ${o}`, 2.4));
    for (const s of [1, -1]) { t.push(linie(`M${X(s, 68)} ${o + 2.8} Q${X(s, 66)} 30 ${X(s, 67.2)} 42 Q${X(s, 68.6)} 49 ${X(s, 71.2)} 53`, hell(S.c, 0.3), 0.9, 0.8)); for (let i = 0; i < 9; i++) t.push(linie(`M${f(X(s, 66.6 + (i > 5 ? (i - 5) * 1.1 : 0)))} ${f(o + 6 + i * 4.4)} l${s * 0.9} 0.2`, hell(S.c, 0.4), 0.4, 0.7)); }
    t.push(naht('M29.4 83.6 Q50 84.6 70.6 83.6', S, 0.5), linie('M40 40 Q39 62 38 82', S.cD, 0.5, 0.25));
  },
  // Body: Langarm, Rumpf tailliert, Beinausschnitt hoch (Seitenlänge 0,75), Schrittsteg 6 breit mit Häkchen, Rundhals
  body(S, t, p) {
    boden(t, 97, 24);
    oberteilFlat(S, t, { aermel: p.aermel ?? 'lang', kragen: p.kragen ?? 'rund', passform: 'tailliert', laenge: 'kurz', cuff: 76 });
    const r = [[50, 68, E], [67, 68, E], [66.6, 73], [61, 82], [55, 89.6], [53.2, 93.6, E], [50, 93.8]];
    const d = glatt([...r, ...sp([...r].reverse()).slice(1, -1)], true, 0.3);
    t.push(flaeche(S, d));
    for (const s of [1, -1]) t.push(blende(S, `M${X(s, 66.8)} 72 Q${X(s, 61)} 84 ${X(s, 53.4)} 93.2`, 1.2));
    t.push(linie('M46.8 92.4 L53.2 92.4', S.cK, 0.5, 0.6), `<rect x="48.4" y="91.2" width="1.2" height="0.8" fill="#d9d6cf"/><rect x="50.6" y="91.2" width="1.2" height="0.8" fill="#d9d6cf"/>`);
    t.push(linie('M40 44 Q38.6 58 41 70', S.cD, 0.5, 0.25));
  },
  // Bustier-Top: Herzausschnitt, Cups mit Bügelnaht (Tiefe 12), 4 Längsnähte, Länge bis Taille (0,6 eines Shirts), Spaghettiträger
  bustier(S, t, p) {
    boden(t, 92, 24);
    const r = [[50, 31, E], [53.6, 24.4], [60, 21.6], [66, 24.4, E], [64.6, 44], [66, 66, E], [50, 66.8]];
    t.push(flaeche(S, glatt([...r, ...sp([...r].reverse()).slice(1, -1)], true, 0.3)));
    for (const s of [1, -1]) {
      t.push(linie(`M${X(s, 60.5)} 22 L${X(s, 61.6)} 4`, S.cD, 0.9), linie(`M${X(s, 60.5)} 22 L${X(s, 61.6)} 4`, hell(S.c, 0.3), 0.3, 0.6));
      t.push(linie(`M${X(s, 50.6)} 34 Q${X(s, 57)} 42 ${X(s, 65.4)} 34`, S.cK, 0.7, 0.8), linie(`M${X(s, 57.6)} 23 Q${X(s, 58.6)} 30 ${X(s, 58)} 38.6`, S.cD, 0.5, 0.55));
      for (const x of [55, 61]) t.push(linie(`M${X(s, x)} 41 Q${X(s, x - 0.6)} 54 ${X(s, x + 0.2)} 66`, S.cD, 0.55, 0.5));
    }
    t.push(`<path d="M49 29.6 Q50 31.6 51 29.6 L50 33 Z" fill="${dunkel(S.c, 0.3)}"/>`, naht('M34.4 64 Q50 65 65.6 64', S, 0.5));
  },
  // One-Shoulder-Top: Ausschnitt diagonal von der linken Schulter zur rechten Achsel, ein Kurzarm links, Raffung an der Seite
  oneshoulder(S, t, p) {
    boden(t, 92, 26);
    t.push(flaeche(S, glatt([[32.6, 13.4, E], [20, 26.6], [23.6, 33.4, E], [34.6, 31.6, E]], true, 0.3)));
    const d = glatt([[39, 11.6, E], [53, 16.6], [66.4, 28.4, E], [64.4, 50], [66, 81, E], [50, 81.8], [34, 81, E], [35.6, 52], [34.4, 31, E], [32.6, 13.6, E]], true, 0.3);
    t.push(flaeche(S, d));
    t.push(`<path d="${glatt([[39.4, 11.8, E], [56, 12.6], [66.2, 28.2, E], [53, 16.6]], true, 0.3)}" fill="${dunkel(S.c, 0.3)}"/>`);
    t.push(blende(S, 'M39.2 12 Q53 16 66.2 28.4', 1.8), linie('M32.8 14 Q35.6 12.2 39.2 12', dunkel(S.c, 0.1), 1.6));
    t.push(naht('M23 31.4 L33.8 30.4', S, 0.5));
    for (let i = 0; i < 5; i++) t.push(linie(`M${f(64.2 - i * 0.15)} ${f(44 + i * 6.4)} q-6 -1.6 -11 -5.6`, S.cD, 0.6, 0.5));
    t.push(naht('M35 79 Q50 80 65 79', S, 0.5));
  },
  // Peplum: Oberteil bis Taille (Taillennaht bei 0,58 der Länge), Schößchen 22 lang, Saumweite 1,7 × Taille, Wellenkante
  peplum(S, t, p) {
    boden(t, 96, 30);
    oberteilFlat(S, t, { aermel: p.aermel ?? 'kurz', kragen: p.kragen ?? 'rund', passform: 'tailliert', laenge: 'kurz', knopfleiste: p.knopfleiste, rueschen: false, cuff: p.aermel === 'lang' ? 74 : undefined });
    const y0 = 58, w0 = 15, y1 = 83, w1 = 26;
    const pts = [[50 - w0, y0, E], [50 + w0, y0, E], [50 + w1, y1 - 2, E]];
    const d = [`M${50 - w0} ${y0} L${50 + w0} ${y0} Q${50 + w1 - 4} ${y1 - 12} ${50 + w1} ${y1 - 2}`];
    for (let i = 0; i < 8; i++) { const xa = 50 + w1 - i * (2 * w1) / 8, xb = xa - w1 / 8, xc = xa - (2 * w1) / 8; d.push(`Q${f(xb)} ${f(y1 + (i % 2 ? -1.6 : 2.4))} ${f(xc)} ${f(y1 - (i % 2 ? 0.4 : 1.4))}`); }
    d.push(`Q${50 - w1 + 4} ${y1 - 12} ${50 - w0} ${y0} Z`);
    t.push(flaeche(S, d.join(' '), { ton: -0.02 }));
    for (const x of [-18, -10, -3, 3, 10, 18]) t.push(linie(`M${50 + x * 0.55} ${y0 + 2} Q${50 + x * 0.8} ${y0 + 12} ${50 + x * 1.18} ${y1 - 1}`, S.cD, 0.55, 0.45));
    t.push(linie(`M${50 - w0} ${y0} L${50 + w0} ${y0}`, S.cK, 0.7, 0.7), naht(`M${50 - w0 + 0.6} ${y0 + 1.4} L${50 + w0 - 0.6} ${y0 + 1.4}`, S, 0.5));
    if (p.knopfleiste) for (const y of [y0 + 5, y0 + 13]) t.push(knopf(50, y, S));
    if (p.smok) for (let y = 30; y < y0 - 1; y += 2.4) t.push(linie(`M${50 - 15.4} ${y} Q50 ${y + 0.6} ${50 + 15.4} ${y}`, S.cD, 0.4, 0.45));
  },
  // Fledermausshirt: Ärmel im Rumpf angeschnitten, Achsel bei 0,65 der Länge, Ärmelsaum am Ellbogen (±36), U-Boot-Ausschnitt 20 breit
  fledermaus(S, t, p) {
    boden(t, 94, 32);
    const r = [[59, 14, E], [84, 30, E], [86.4, 37], [84.6, 43, E], [72, 50], [65, 62], [64.6, 85, E], [50, 85.6]];
    t.push(flaeche(S, rumpf(r, [[41, 14, E], [44.4, 19], [50, 20.4], [55.6, 19]])));
    t.push(`<path d="${glatt([[41, 14, E], [45, 12.4], [50, 11.8], [55, 12.4], [59, 14, E], [55.6, 19], [50, 20.4], [44.4, 19]], true, 0.4)}" fill="${dunkel(S.c, 0.55)}"/>`);
    t.push(linie('M41 14 Q50 25.4 59 14', hell(S.c, 0.12), 2.2), linie('M41.4 13.4 Q50 11 58.6 13.4', dunkel(S.c, 0.2), 1.2));
    for (const s of [1, -1]) { t.push(naht(`M${X(s, 83.4)} 31.6 L${X(s, 84.8)} 42`, S, 0.55)); t.push(linie(`M${X(s, 70)} 24 Q${X(s, 73)} 36 ${X(s, 66)} 52`, S.cD, 0.55, 0.4)); }
    for (let i = 0; i < 4; i++) t.push(linie(`M${f(64.4)} ${f(66 + i * 4.4)} q-3 1 -5 0`, S.cD, 0.5, 0.45));
    t.push(naht('M35.6 83 Q50 84 64.4 83', S, 0.5));
  },
  // Bolero: Rumpf bis unter die Brust (0,35 der Länge), Vorderteile im Bogen offen, Langarm schmal, Rippblende 2 an der Kante
  bolero(S, t, p) {
    boden(t, 94, 30);
    const M = { ...oberteilMasse({ passform: 'tailliert' }), unten: 88 };
    t.push(`<path d="${glatt([[36, 13, E], [64, 13, E], [65.6, 34], [62, 42], [50, 44], [38, 42], [34.4, 34]], true, 0.4)}" fill="${dunkel(S.c, 0.32)}"/>`);
    for (const s of [1, -1]) {
      const G = aermelLang(M, { weit: 7.4 }, s);
      t.push(flaeche(S, G.d));
      if (p.strick) buendchen(S, t, G, s, 6);
      const r = [[56.6, 12, E], [M.Sw + 50, M.schY, E], [M.Sw + 48.8, M.achselY, E], [65.4, 41], [60.6, 45.6, E], [56.6, 38], [55.2, 24]];
      t.push(flaeche(S, glatt(s > 0 ? r : sp(r), true, 0.3)));
      t.push(blende(S, `M${X(s, 56.4)} 12.4 Q${X(s, 54.6)} 30 ${X(s, 60.6)} 45.4 Q${X(s, 64)} 44 ${X(s, 65.4)} 41`, p.strick ? 2.2 : 1.4));
    }
    t.push(linie('M43.6 12.6 Q50 10.6 56.4 12.6', dunkel(S.c, 0.1), 1.6));
  },
  // Strickcape: geschlossene Glocke mit Rollkragen 10 hoch, Saumweite 74 (± 37), Länge bis Hüfte, Armschlitze 18 lang, Rippbund 5, Mittelnaht
  cape(S, t, p) {
    boden(t, 95, 38);
    const r = [[50, 15.6, E], [56.6, 15.6, E], [66, 19], [77, 30], [84, 46], [87.4, 66], [87, 80, E], [70, 82], [50, 83]];
    t.push(flaeche(S, glatt([...r, ...sp([...r].reverse()).slice(1, -1)], true, 0.3)));
    t.push(flaeche(S, glatt([[13, 75, E], [87, 75, E], [87, 80.6, E], [70, 82.6], [50, 83.4], [30, 82.6], [13, 80.6, E]], true, 0.25), { ton: -0.08 }));
    for (let x = 15; x < 86; x += 1.8) t.push(linie(`M${f(x)} ${75.6 + Math.abs(x - 50) * -0.06 + 0.4} l0 ${f(6.4 - Math.abs(x - 50) * 0.05)}`, S.cD, 0.35, 0.45));
    for (const s of [1, -1]) {
      t.push(`<path d="M${X(s, 71.4)} 46 Q${X(s, 72.6)} 56 ${X(s, 72.4)} 64" stroke="${dunkel(S.c, 0.45)}" stroke-width="1.4" fill="none"/>`, linie(`M${X(s, 70.4)} 46 Q${X(s, 71.4)} 56 ${X(s, 71.2)} 64`, S.cD, 0.6, 0.6));
      t.push(linie(`M${X(s, 60)} 22 Q${X(s, 68)} 50 ${X(s, 64)} 74`, S.cD, 0.55, 0.35), linie(`M${X(s, 70)} 30 Q${X(s, 80)} 52 ${X(s, 78)} 74`, S.cD, 0.5, 0.3));
    }
    t.push(naht('M50 19 L50 74.6', S, 0.6));
    t.push(flaeche(S, glatt([[42.6, 18, E], [43.4, 6.6, E], [56.6, 6.6, E], [57.4, 18, E], [50, 19.6]], true, 0.3), { ton: -0.08 }));
    for (let x = 44.8; x < 56; x += 1.6) t.push(linie(`M${f(x)} 7.2 l0 10.4`, S.cD, 0.4, 0.5));
    t.push(linie('M43.4 11.6 Q50 13 56.6 11.6', S.cK, 0.5, 0.5));
  },
  // Weste (Jeansweste, Westentop, Weste, Kunstfellweste): ausschnitt v|rund|kragen|steh, saum spitz|gerade|bund, verschluss knoepfe|zip|verdeckt,
  // Armloch tief (bis 0,4 der Länge), Taille 0,9 × Brust; Vorderteile überlappen 1,2 in der Mitte
  weste(S, t, p) {
    boden(t, 95, 28);
    const aus = p.ausschnitt ?? 'v', saum = p.saum ?? 'gerade', o = 11, unten = p.unten ?? 78;
    if (p.fell) { S.tex = STOFF.fell(S); S.bundS = zweit(S, hell(S.c, 0.05), 'rippe'); }
    if (p.dessin) S.tex = dessin(S, p.dessin);
    t.push(`<path d="${glatt([[42, o + 1], [58, o + 1], [61, unten - 6], [39, unten - 6]], true, 0.3)}" fill="${dunkel(S.c, 0.35)}"/>`);
    const halsY = aus === 'v' ? o + 26 : aus === 'rund' ? o + 7 : o + 3;
    for (const s of [1, -1]) {
      const unterkante = saum === 'spitz' ? [[65, unten - 4, E], [56, unten + 1.6], [50.8, unten + 3.2, E]] : [[65.6, unten, E], [50.8, unten, E]];
      const hals = aus === 'v' ? [[50.8, halsY, E], [55.6, o + 10], [57.4, o, E]] : aus === 'rund' ? [[50.8, halsY, E], [55, o + 5], [57.2, o, E]] : [[50.8, halsY, E], [56.4, o, E]];
      const r = [...hals, [62.6, o + 0.8, E], [61.6, o + 12], [64.4, o + 22], [66.4, o + 25, E], [64.2, o + 42], ...unterkante];
      t.push(flaeche(S, glatt(s > 0 ? r : sp(r), true, 0.3)));
      if (!p.fell) t.push(blende(S, `M${X(s, 62.6)} ${o + 1} Q${X(s, 61.4)} ${o + 14} ${X(s, 66.2)} ${o + 25}`, 1.2));
      if (p.taschen) t.push(`<path d="M${X(s, 54.8)} ${unten - 14} L${X(s, 62)} ${unten - 15}" stroke="${dunkel(S.c, 0.45)}" stroke-width="1.3"/>`, naht(`M${X(s, 54.6)} ${unten - 15.6} L${X(s, 62.2)} ${unten - 16.6} M${X(s, 54.8)} ${unten - 12.6} L${X(s, 62)} ${unten - 13.6}`, S, 0.7));
      if (p.taillennaht) t.push(linie(`M${X(s, 50.8)} ${o + 42} Q${X(s, 58)} ${o + 41} ${X(s, 64.4)} ${o + 42}`, S.cK, 0.6, 0.6), linie(`M${X(s, 57)} ${o + 22} L${X(s, 57.4)} ${o + 41}`, S.cD, 0.5, 0.55));
      if (!p.fell && !p.taillennaht) t.push(linie(`M${X(s, 58)} ${o + 26} Q${X(s, 57.4)} ${o + 36} ${X(s, 58.2)} ${unten - 4}`, S.cD, 0.5, 0.45));
      if (aus === 'kragen') t.push(flaeche(S, glatt([[X(s, 56.6), o - 0.6, E], [X(s, 50.4), o + 4.2, E], [X(s, 52.8), o + 10, E], [X(s, 62), o + 3.6, E]], true, 0.2), { ton: s > 0 ? -0.05 : 0.07 }));
      if (aus === 'steh') t.push(flaeche(S, glatt([[X(s, 50.6), o + 4, E], [X(s, 50.8), o - 5, E], [X(s, 57.6), o - 4, E], [X(s, 57.6), o + 1, E]], true, 0.2), { ton: -0.05 }));
    }
    if (p.fell) {
      for (const s of [1, -1]) for (let i = 0; i < 26; i++) { const u = i / 25, y = o + 1 + (unten - o - 4) * u, x = u < 0.42 ? 62.6 + Math.sin(u * 7.4) * 2 : 64.4 + (u - 0.42) * 2; t.push(`<path d="M${f(X(s, x - 1.6))} ${f(y)} q${s * 3.6} ${0.4} ${s * 3} ${3.6}" stroke="${i % 2 ? hell(S.c, 0.4) : dunkel(S.c, 0.12)}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.9"/>`); }
      for (const s of [1, -1]) for (let i = 0; i < 12; i++) { const y = o + 6 + i * 4.6; t.push(`<path d="M${f(X(s, 51.6))} ${f(y)} q${s * 1.6} 1.2 ${s * 3.4} 3.6" stroke="${hell(S.c, 0.45)}" stroke-width="1.1" fill="none" stroke-linecap="round" opacity="0.85"/>`); }
      for (let x = 37; x < 64; x += 2.2) t.push(`<path d="M${f(x)} ${unten - 0.6} q0.8 1.8 -0.2 3.2" stroke="${hell(S.c, 0.3)}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`);
    }
    if (saum === 'schoss') {
      const y0 = unten, w0 = 15.4, y1 = unten + 12, w1 = 22;
      t.push(flaeche(S, glatt([[50 - w0, y0, E], [50 + w0, y0, E], [50 + w1, y1, E], [50, y1 + 1.2], [50 - w1, y1, E]], true, 0.25), { ton: -0.03 }));
      for (const x of [-14, -6, 6, 14]) t.push(linie(`M${50 + x * 0.9} ${y0 + 1} L${50 + x * 1.3} ${y1}`, S.cD, 0.5, 0.45));
      t.push(linie(`M${50 - w0} ${y0} L${50 + w0} ${y0}`, S.cK, 0.6, 0.7), linie(`M50 ${y0} L50 ${y1 + 1}`, S.cK, 0.5, 0.6));
    }
    if (saum === 'bund') { t.push(flaeche(S.bundS ?? S, glatt([[35, unten - 6, E], [65, unten - 6, E], [65.2, unten + 0.6, E], [34.8, unten + 0.6, E]], true, 0.2), { ton: -0.06 })); for (let x = 36.4; x < 64; x += 1.6) t.push(linie(`M${f(x)} ${unten - 5.6} l0 5.8`, (S.bundS ?? S).cD, 0.35, 0.5)); }
    const v = p.verschluss ?? 'knoepfe';
    if (v === 'zip') { t.push(linie(`M50 ${halsY} L50 ${unten + (saum === 'spitz' ? 3 : 0)}`, '#9c978d', 1)); for (let y = halsY + 1; y < unten; y += 1.4) t.push(linie(`M49.3 ${f(y)} l1.4 0`, '#77736b', 0.35, 0.6)); t.push(`<rect x="48.8" y="${halsY + 1}" width="2.4" height="3.6" rx="0.5" fill="#d9d6cf" stroke="#77736b" stroke-width="0.3"/>`); }
    else if (v === 'verdeckt') t.push(linie(`M51.8 ${halsY + 1} L51.8 ${unten - 1}`, S.cK, 0.6, 0.7));
    else for (let y = halsY + 4; y < unten - 2; y += p.abstand ?? 8) t.push(S.denim ? metallknopf(50, y, 1.1) : knopf(50, y, S, 1.05));
    if (p.guertel) t.push(`<rect x="44" y="${o + 39}" width="12" height="3.6" rx="1.6" fill="none" stroke="#9c978d" stroke-width="1"/>`);
    if (S.denim) for (const s of [1, -1]) {
      const kn = (d) => `<path d="${d}" stroke="#e0a040" stroke-width="0.7" stroke-dasharray="1.3 0.8" fill="none"/>`;
      t.push(kn(`M${X(s, 53.6)} ${halsY + 2} L${X(s, 53.6)} ${unten - 1}`), kn(`M${X(s, 63.4)} ${o + 2} Q${X(s, 62.2)} ${o + 14} ${X(s, 66)} ${o + 23.6}`), kn(`M${X(s, 57.6)} ${o + 14} Q${X(s, 59)} ${o + 30} ${X(s, 58)} ${unten}`));
      t.push(`<path d="M${X(s, 57)} ${o + 18} Q${X(s, 59.6)} ${o + 32} ${X(s, 57)} ${unten - 6}" stroke="#fff" stroke-width="4" fill="none" opacity="0.12"/>`);
    }
  },
  // Off-Shoulder-Pullover: gerader Ausschnitt quer über die Schultern mit Umschlagbund 8 hoch, Fledermausärmel bis Handgelenk mit Rippbündchen 7, Rippbund 10
  offpulli(S, t, p) {
    boden(t, 96, 32);
    for (const s of [1, -1]) {
      const r = [[70, 24], [79, 24.6, E], [84, 36], [86, 58], [86.6, 80, E], [79.4, 81, E], [78.6, 60], [75, 46], [68, 50]];
      t.push(flaeche(S, glatt(s > 0 ? r : sp(r), true, 0.3)));
      const c = [[79.2, 74, E], [86.4, 73.4, E], [86.6, 80, E], [79.4, 81, E]];
      t.push(flaeche(S, glatt(s > 0 ? c : sp(c), true, 0.2), { ton: -0.08 }));
      for (let i = 1; i < 5; i++) t.push(linie(`M${f(X(s, 79.2 + i * 1.45))} ${f(74 - i * 0.12)} l0 6.6`, S.cD, 0.35, 0.5));
      t.push(linie(`M${X(s, 80)} 34 Q${X(s, 81)} 50 ${X(s, 80.4)} 70`, S.cD, 0.5, 0.35));
    }
    const r = [[50, 24, E], [72, 24, E], [70, 36], [66.6, 52], [66, 74, E], [50, 74.6]];
    t.push(flaeche(S, glatt([...r, ...sp([...r].reverse()).slice(1, -1)], true, 0.3)));
    t.push(flaeche(S, glatt([[34, 65, E], [66, 65, E], [66, 74.6, E], [34, 74.6, E]], true, 0.2), { ton: -0.08 }));
    for (let x = 35.6; x < 66; x += 1.6) t.push(linie(`M${f(x)} 65.6 l0 8.6`, S.cD, 0.35, 0.5));
    t.push(flaeche(S, glatt([[19.6, 17.6, E], [80.4, 17.6, E], [81, 27, E], [19, 27, E]], true, 0.2), { ton: 0.05 }));
    for (let x = 21.4; x < 80; x += 1.8) t.push(linie(`M${f(x)} 18.2 l0.1 8.2`, S.cD, 0.35, 0.45));
    t.push(linie('M19.2 26.6 L80.8 26.6', S.cK, 0.6, 0.55));
  },
  // Off-Shoulder-Sweatshirt: oversize, Ausschnitt schräg über eine Schulter (rechts bedeckt, links frei), Rippbündchen und -bund
  offsweat(S, t, p) {
    boden(t, 96, 34);
    const M = oberteilMasse({ passform: 'oversize' });
    for (const s of [1, -1]) { const G = aermelLang(M, { passform: 'oversize', weit: 8.6 }, s, s > 0 ? 0 : 7); t.push(flaeche(S, G.d)); buendchen(S, t, G, s, 5); }
    const r = [[M.Sw + 47, M.schY + 1.8, E], [M.Sw + 48.8, M.achselY, E], [50 + M.Ww, 58], [50 + M.Hw, M.unten, E], [50 - M.Hw, M.unten, E], [50 - M.Ww, 58], [50 - M.Sw - 1.2, M.achselY + 7, E], [50 - M.Sw + 6, M.schY + 9, E], [40, 22], [50, 19.4], [57, 12, E]];
    t.push(flaeche(S, glatt(r, true, 0.32)));
    t.push(blende(S, `M57 12.4 Q48 22.6 ${50 - M.Sw + 6} ${M.schY + 9.4}`, 2.2));
    t.push(flaeche(S, glatt([[50 - M.Hw, M.unten - 6, E], [50 + M.Hw, M.unten - 6, E], [50 + M.Hw, M.unten, E], [50 - M.Hw, M.unten, E]], true, 0.2), { ton: -0.08 }));
    for (let x = 50 - M.Hw + 1.6; x < 50 + M.Hw; x += 1.6) t.push(linie(`M${f(x)} ${M.unten - 5.6} l0 5.4`, S.cD, 0.35, 0.45));
    if (p.motiv) t.push(motiv(p.motiv, 50, 46, 16));
  },
};

// ─────────────────────────────────────────── Zeichner
export function q38(S, t, p) {
  if (p.stoff) S.tex = STOFF[p.stoff](S);
  if (p.loch) S.tex = STOFF.loch(S);
  if (p.nadel) S.tex = STOFF.nadel(S);
  if (p.form) {
    if (p.dessin && p.form !== 'weste') S.tex = dessin(S, p.dessin);
    FORMEN[p.form](S, t, p);
    for (const d of p.d ?? []) DETAILS[d](S, t, p, { ...oberteilMasse(p), oben: 12 });
    return;
  }
  const M = oberteilMasse(p);
  // Unterlage: langes Shirt bzw. Bluse unter dem Oberteil (Layer, Lagenlook)
  if (p.unter) {
    const U = zweit(S, p.unterFarbe ?? 'weiß', p.unterMaterial ?? 'baumwolle');
    if (p.unterDessin) U.tex = dessin(U, p.unterDessin);
    if (p.unter === 'aermel') {
      t.push(`<ellipse cx="50" cy="96" rx="30" ry="2.4" fill="#000" opacity="0.07"/>`);
      for (const s of [1, -1]) { const G = aermelLang(M, { passform: p.passform, weit: 7.4 }, s); t.push(flaeche(U, G.d)); if (p.unterBund) buendchen(U, t, G, s, 4); }
    } else if (p.unter === 'bluse') {
      t.push(`<ellipse cx="50" cy="96" rx="30" ry="2.4" fill="#000" opacity="0.07"/>`);
      oberteilFlat(U, t, { aermel: 'lang', kragen: 'hemd', knopfleiste: true, passform: 'gerade', laenge: 'lang' });
    }
  }
  const schatten = !p.unter;
  const q = { ...p };
  if (p.kragenFarbe) q.kragenS = zweit(S, p.kragenFarbe, S.m);
  if (!schatten) { const tt = []; q33flat(S, tt, q); tt.shift(); t.push(...tt); } else q33flat(S, t, q);
  // Kragenspitzen der Bluse über dem Pullunder
  if (p.unter === 'bluse') { const U = zweit(S, p.unterFarbe ?? 'weiß'); for (const s of [1, -1]) t.push(flaeche(U, glatt([[X(s, 50 + 6.5), M.oben - 0.6, E], [X(s, 50.6), M.oben + 4.4, E], [X(s, 53), M.oben + 11, E], [X(s, 50 + 12.5), M.oben + 4.2, E]], true, 0.2), { ton: s > 0 ? -0.04 : 0.06 })); }
  for (const d of p.d ?? []) DETAILS[d](S, t, p, M);
}

// Zoom wie produkt.js: kurze Formen füllen die Kachel
export function q38zoom(p) {
  if (p.form === 'bustier') return [1.25, 50, 40];
  if (p.form === 'bolero') return [1.08, 50, 50];
  if (p.laenge === 'crop' && !p.form) return [1.28, 50, 36];
  return null;
}

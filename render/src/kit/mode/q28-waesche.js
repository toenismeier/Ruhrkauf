// Q28: Wäsche, Nachtwäsche, Strümpfe als Flatlay (frontal, Licht von links, Stoff aus stoff.js).
// Je Zeichner eine Maßzeile (cm, Damen Gr. 38 / 75B, Herren Gr. 5).

import { glatt } from './model.js';
import { hell, dunkel, flaeche, mische, materialDefs } from './stoff.js';
import { naht, linie, oberteilFlat, hoseFlat } from './flatlay.js';

const f = (n) => Math.round(n * 10) / 10;
const E = 'ecke';
const sp = (pts) => pts.map(([x, y, e]) => [100 - x, y, e]);
const sym = (rechts) => [...rechts, ...sp([...rechts].reverse())];
const schatten = (cx, cy, rx, ry = 2.6, op = 0.08) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#000" opacity="${op}"/>`;
const X = (s, x) => (s > 0 ? x : 100 - x);
let nr = 0;
const uid = (S, k) => `${S.id}${k}${(++nr).toString(36)}`;

// Spitzenkante: Bogenreihe entlang einer Polylinie (Punkte), nach außen gerichtet (Normale links/rechts)
function spitze(t, pts, farbe, r = 1.6, seite = -1) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const l = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(l / (r * 1.8)));
    for (let k = 0; k < n; k++) {
      const a = [x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n], b = [x0 + ((x1 - x0) * (k + 1)) / n, y0 + ((y1 - y0) * (k + 1)) / n];
      const nx = (-(b[1] - a[1]) / l) * n * seite, ny = ((b[0] - a[0]) / l) * n * seite;
      const m = [(a[0] + b[0]) / 2 + nx * r, (a[1] + b[1]) / 2 + ny * r];
      t.push(`<path d="M${f(a[0])} ${f(a[1])} Q${f(m[0])} ${f(m[1])} ${f(b[0])} ${f(b[1])}" fill="${farbe}" stroke="${dunkel(farbe, 0.25)}" stroke-width="0.3"/>`);
    }
  }
}
// Spitzenfläche: Muster aus kleinen Blüten, auf eine Fläche begrenzt
function spitzenFlaeche(S, t, d, farbe) {
  const id = uid(S, 's');
  // Blütenranke: kleine Blüte aus fünf Blättern, versetzt, mit feinem Netzgrund
  S.defs.push(`<pattern id="${id}" width="4.2" height="3.6" patternUnits="userSpaceOnUse"><path d="M0 1.8 L2.1 0 L4.2 1.8 L2.1 3.6 Z" fill="none" stroke="${farbe}" stroke-width="0.18" opacity="0.6"/>${[0, 72, 144, 216, 288].map((w) => `<ellipse cx="2.1" cy="1.25" rx="0.32" ry="0.55" transform="rotate(${w} 2.1 1.8)" fill="${farbe}"/>`).join('')}<circle cx="2.1" cy="1.8" r="0.25" fill="#fff" opacity="0.7"/></pattern>`);
  t.push(`<path d="${d}" fill="url(#${id})" opacity="0.7"/>`);
}
function gummiband(t, S, x0, y0, x1, y1, o = {}) {
  const c = o.farbe ?? dunkel(S.c, 0.12);
  t.push(`<path d="M${x0} ${y0} Q50 ${y0 + (o.bogen ?? 1.4)} ${x1} ${y0} L${x1 - (o.ein ?? 0.4)} ${y1} Q50 ${y1 + (o.bogen ?? 1.4)} ${x0 + (o.ein ?? 0.4)} ${y1} Z" fill="${c}" stroke="${dunkel(c, 0.35)}" stroke-width="0.45"/>`);
  for (let x = x0 + 2; x < x1 - 1; x += 1.6) t.push(linie(`M${f(x)} ${f(y0 + 0.6)} L${f(x)} ${f(y1 - 0.6)}`, dunkel(c, 0.25), 0.35, 0.5));
  if (o.streifen) for (const y of o.streifen) t.push(`<path d="M${x0 + 0.4} ${f(y0 + (y1 - y0) * y)} Q50 ${f(y0 + (y1 - y0) * y + (o.bogen ?? 1.4))} ${x1 - 0.4} ${f(y0 + (y1 - y0) * y)}" stroke="${o.streifenFarbe ?? hell(c, 0.6)}" stroke-width="0.9" fill="none"/>`);
}

export const WAESCHE = {
  // BH (Bügel, Schale mit Spitze): Unterbrustband 70, Körbchenbreite 14, Steg 2, Träger 1 breit mit Schieber
  bh(S, t, p) {
    t.push(schatten(50, 86, 40, 2.6));
    const SP = materialDefs(p.spitze ?? hell(S.c, 0.18), 'baumwolle', S.defs);
    // Träger hinten nach oben, mit Schieber und Ring
    for (const s of [1, -1]) {
      t.push(`<path d="M${X(s, 71)} 35 Q${X(s, 74)} 20 ${X(s, 79)} 8" stroke="${dunkel(S.c, 0.4)}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M${X(s, 71)} 35 Q${X(s, 74)} 20 ${X(s, 79)} 8" stroke="${S.c}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`);
      t.push(`<rect x="${X(s, 74.6) - 1.8}" y="17" width="3.6" height="2" rx="0.5" fill="#d9dcdf" stroke="#8f959c" stroke-width="0.35" transform="rotate(${s * 18} ${X(s, 74.6)} 18)"/>`);
      t.push(`<circle cx="${X(s, 71.4)}" cy="34" r="1.3" fill="none" stroke="#b9bec3" stroke-width="0.7"/>`);
    }
    // Unterbrustband (Seitenteile mit Haken-Ösen-Enden)
    for (const s of [1, -1]) {
      const band = [[X(s, 82), 48, E], [X(s, 97), 52, E], [X(s, 97), 67, E], [X(s, 70), 72, E]];
      t.push(flaeche(S, glatt(band, true, 0.2), { ton: -0.05 }));
      t.push(linie(`M${X(s, 96)} 52.6 L${X(s, 96)} 66.4`, dunkel(S.c, 0.4), 1, 0.7));
      for (const y of [56, 59.6, 63.2]) t.push(`<circle cx="${X(s, 94.6)}" cy="${y}" r="0.6" fill="${dunkel(S.c, 0.5)}"/>`);
      t.push(naht(`M${X(s, 80)} 70 L${X(s, 96)} 65.8`, S, 0.6));
    }
    // Schalen: Oberkante (Ausschnitt) und Bügelbogen
    const id = uid(S, 'r');
    S.defs.push(`<radialGradient id="${id}" cx="0.38" cy="0.4" r="0.7"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/></radialGradient>`);
    for (const s of [1, -1]) {
      const schale = glatt([[X(s, 52), 48, E], [X(s, 58), 41], [X(s, 66), 35], [X(s, 71.4), 33, E], [X(s, 80), 40], [X(s, 84), 48, E], [X(s, 80), 62], [X(s, 70), 71], [X(s, 60), 70], [X(s, 53.6), 60]], true, 0.45);
      t.push(flaeche(S, schale, { ton: s > 0 ? -0.04 : 0.02 }));
      t.push(`<path d="${schale}" fill="url(#${id})"/>`);
      // Spitzenauflage im oberen Teil, Bogenkante
      const spitzD = glatt([[X(s, 52), 48, E], [X(s, 58), 41], [X(s, 66), 35], [X(s, 71.4), 33, E], [X(s, 80), 40], [X(s, 84), 48, E], [X(s, 74), 50], [X(s, 63), 52], [X(s, 55), 51]], true, 0.45);
      spitzenFlaeche(S, t, spitzD, dunkel(S.c, 0.32));
      spitze(t, [[X(s, 84), 48], [X(s, 74), 50.4], [X(s, 63), 52.4], [X(s, 55), 51.4], [X(s, 52), 48.4]], hell(S.c, 0.12), 1.3, s > 0 ? -1 : 1);
      // Bügelkanal und Naht der Schale
      t.push(`<path d="M${X(s, 84)} 48 Q${X(s, 82)} 64 ${X(s, 70)} 71 Q${X(s, 58)} 70 ${X(s, 53.6)} 60 Q${X(s, 52)} 54 ${X(s, 52)} 48" stroke="${dunkel(S.c, 0.38)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`);
      t.push(`<path d="M${X(s, 82.6)} 49 Q${X(s, 80.6)} 63 ${X(s, 70)} 69.4" stroke="${hell(S.c, 0.4)}" stroke-width="0.35" stroke-dasharray="0.7 0.5" fill="none"/>`);
      t.push(`<path d="M${X(s, 62)} 44 Q${X(s, 66)} 40 ${X(s, 72)} 39" stroke="#fff" stroke-width="1.6" fill="none" opacity="0.3" stroke-linecap="round"/>`);
    }
    // Steg mit Schleife
    t.push(flaeche(S, glatt([[47.6, 49, E], [52.4, 49, E], [53.6, 62, E], [46.4, 62, E]], true, 0.2), { ton: -0.1 }));
    t.push(`<path d="M50 52 l-4 -2.6 l0 5.2 Z M50 52 l4 -2.6 l0 5.2 Z" fill="${hell(S.c, 0.25)}" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.4"/><circle cx="50" cy="52" r="1.1" fill="${dunkel(S.c, 0.2)}"/>`);
  },
  // Sport-BH: Unterbrustband 70, Gummiband 5, breite Träger 3, Ringerrücken; kein Bügel, Mesh-Einsatz
  sportbh(S, t, p) {
    t.push(schatten(50, 90, 32, 2.6));
    const form = sym([[50, 34], [58, 31], [62, 22], [64, 12, E], [71, 12, E], [72, 26], [78, 40], [80, 56], [78, 74, E]]);
    t.push(flaeche(S, glatt(form, true, 0.4)));
    // Mesh-Einsatz in der Mitte
    const id = uid(S, 'n');
    S.defs.push(`<pattern id="${id}" width="2" height="2" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.45" fill="${dunkel(S.c, 0.45)}"/></pattern>`);
    t.push(`<path d="M44 38 Q50 36 56 38 L54 54 Q50 56 46 54 Z" fill="url(#${id})" opacity="0.8"/>`);
    // Einfassungen und Nähte
    t.push(linie('M64 12.6 Q60 30 50 34.6 Q40 30 36 12.6', hell(S.c, 0.3), 1.2, 0.7));
    for (const s of [1, -1]) {
      t.push(linie(`M${X(s, 71)} 13 Q${X(s, 72)} 28 ${X(s, 79)} 42`, hell(S.c, 0.3), 1.2, 0.7));
      t.push(naht(`M${X(s, 56)} 40 Q${X(s, 66)} 52 ${X(s, 64)} 62`, S, 0.7));
    }
    gummiband(t, S, 21.6, 62, 78.4, 75, { farbe: p.band ?? dunkel(S.c, 0.55), streifen: [0.35, 0.65], bogen: 0.6 });
  },
  // Slip (Damen, Spitze): Bund 32, Seitenhöhe 7, Zwickel 6; Spitzenbund und Spitzenkante am Beinausschnitt
  slip(S, t, p) {
    t.push(schatten(50, 90, 40, 2.6));
    t.push('<g transform="translate(50 52) scale(1.32) translate(-50 -50)">');
    const form = sym([[50, 24], [70, 23, E], [80, 25, E], [78, 38], [70, 54], [61, 68], [58, 77, E]]);
    const d = glatt(form, true, 0.35);
    t.push(flaeche(S, d));
    // Zwickel
    t.push(`<path d="M42.6 62 Q50 64 57.4 62" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.5" fill="none" stroke-dasharray="0.7 0.5"/>`);
    // Spitzenbund
    const bund = glatt(sym([[50, 24], [70, 23, E], [80, 25, E], [79.6, 32], [70, 31], [50, 32]]), true, 0.4);
    spitzenFlaeche(S, t, bund, dunkel(S.c, 0.3));
    spitze(t, [[20.4, 32.4], [30, 31.2], [50, 32.2], [70, 31.2], [79.6, 32.4]], hell(S.c, 0.1), 1.1, 1);
    // Beinausschnitte mit Spitzenkante
    for (const s of [1, -1]) spitze(t, [[X(s, 76.2), 44], [X(s, 70.6), 53], [X(s, 64.4), 62.6], [X(s, 60.2), 71], [X(s, 58.4), 76.4]], hell(S.c, 0.12), 1.2, s > 0 ? -1 : 1);
    t.push(`<path d="M48 27 l2 1.6 l2 -1.6 l-2 3 Z" fill="${hell(S.c, 0.3)}" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.35"/>`);
    t.push('</g>');
  },
  // Retropants (Herren): Bund 4, Seitenlänge 22, Bein 6; Kontrastbund mit Streifen, Beutelnaht
  unterwaesche(S, t, p) {
    t.push(schatten(50, 86, 34, 2.6));
    const form = sym([[50, 20], [80, 20, E], [81, 46], [82, 72, E], [64, 74, E], [56, 64], [50, 63]]);
    t.push(flaeche(S, glatt(form, true, 0.25)));
    gummiband(t, S, 19, 19, 81, 30, { farbe: p.bund ?? '#2a2c30', streifen: [0.3, 0.7], streifenFarbe: p.streifen ?? '#c8372f', bogen: 0.8 });
    // Beutelnaht vorn
    t.push(naht('M44 31 Q41 46 46 60 Q50 63 54 60 Q59 46 56 31', S, 0.8));
    t.push(linie('M44.4 31 Q41.4 46 46.2 60.2 Q50 63.4 53.8 60.2 Q58.6 46 55.6 31', dunkel(S.c, 0.3), 0.55, 0.7));
    // Beinsäume
    for (const s of [1, -1]) t.push(naht(`M${X(s, 64.2)} 71 L${X(s, 81.6)} 69.2`, S, 0.8), linie(`M${X(s, 81)} 32 L${X(s, 81.6)} 68`, dunkel(S.c, 0.2), 0.5, 0.5));
    t.push(`<path d="M32 36 Q30 52 32 66" stroke="#fff" stroke-width="2" fill="none" opacity="0.1" stroke-linecap="round"/>`);
  },
  // Boxershorts (Webware): Bund 34 mit Gummi, Seitenlänge 33, Beinweite 30; Knopfleiste mit zwei Knöpfen
  boxershorts(S, t, p) {
    t.push(schatten(50, 90, 40, 2.8));
    t.push(flaeche(S, glatt(sym([[50, 26, E], [80, 26, E], [83, 46], [89, 86, E], [56, 88, E], [52, 60]]), true, 0.15)));
    gummiband(t, S, 19, 18, 81, 28, { farbe: p.bund ?? dunkel(S.c, 0.3), streifen: [0.5], bogen: 0.6 });
    // Knopfleiste und Knöpfe
    t.push(linie('M50 28 L50 52', dunkel(S.c, 0.35), 0.7, 0.8), naht('M46 28 L46 50 Q48 54 50 54', S, 0.8));
    for (const y of [36, 45]) t.push(`<circle cx="52.4" cy="${y}" r="1.3" fill="${hell(S.c, 0.55)}" stroke="${dunkel(S.c, 0.4)}" stroke-width="0.35"/>`);
    // Saumnähte, Seitenschlitz
    for (const s of [1, -1]) {
      t.push(naht(`M${X(s, 57)} 84.6 L${X(s, 88)} 82.6`, S, 0.8));
      t.push(linie(`M${X(s, 88.6)} 86 L${X(s, 87)} 78`, dunkel(S.c, 0.4), 0.6, 0.8));
      t.push(linie(`M${X(s, 56)} 62 Q${X(s, 66)} 70 ${X(s, 70)} 86`, dunkel(S.c, 0.2), 0.5, 0.35));
    }
  },
  // Unterhemd (Feinripp, Achselshirt): Länge 66, Brustbreite 46, Träger 3, tiefer Rundausschnitt und Armausschnitt
  unterhemd(S, t, p) {
    t.push(schatten(50, 94, 30, 2.6));
    const form = sym([[50, 36], [58, 33], [61, 22], [62, 8, E], [68, 8, E], [69, 20], [74, 36], [77, 44, E], [76, 70], [78, 92, E]]);
    t.push(`<path d="${glatt(form, true, 0.4)}" fill="none" stroke="${dunkel(S.c, 0.35)}" stroke-width="1.2" opacity="0.6"/>`);
    t.push(flaeche(S, glatt(form, true, 0.4)));
    t.push(`<path d="M30 46 Q28 70 30 88" stroke="#000" stroke-width="5" opacity="0.04" fill="none"/>`);
    // Einfassungen (Bündchenstreifen) an Hals und Armausschnitt
    t.push(linie('M38 8.6 Q38.6 22 42 33 Q50 37.6 58 33 Q61.4 22 62 8.6', hell(S.c, 0.4), 1.6, 0.6), linie('M38 8.6 Q38.6 22 42 33 Q50 37.6 58 33 Q61.4 22 62 8.6', dunkel(S.c, 0.25), 0.4, 0.7));
    for (const s of [1, -1]) t.push(linie(`M${X(s, 68)} 8.6 Q${X(s, 69.4)} 22 ${X(s, 74)} 36 Q${X(s, 76)} 42 ${X(s, 76.6)} 44`, hell(S.c, 0.4), 1.6, 0.6), linie(`M${X(s, 68)} 8.6 Q${X(s, 69.4)} 22 ${X(s, 74)} 36 Q${X(s, 76)} 42 ${X(s, 76.6)} 44`, dunkel(S.c, 0.25), 0.4, 0.7));
    t.push(naht('M22.4 88 Q50 90 77.6 88', S, 0.8));
  },
  // Socken: Schaftlänge 18, Fußlänge 24, Bündchen 4; Ferse und Spitze verstärkt in Kontrastfarbe
  socken(S, t, p) {
    t.push(schatten(54, 92, 34, 2.6));
    const kontrast = p.kontrast ?? dunkel(S.c, 0.25);
    const socke = (dx, dy, ton) => {
      const g = [`<g transform="translate(${dx} ${dy})">`];
      const form = [[22, 6, E], [40, 6, E], [41, 50], [46, 58], [74, 64], [80, 68], [80, 74], [74, 78], [40, 78], [30, 74], [24, 64], [22, 52]];
      const d = glatt(form, true, 0.4);
      g.push(flaeche(S, d, { ton }));
      // Bündchen
      g.push(flaeche(S, glatt([[22, 6, E], [40, 6, E], [40.2, 16, E], [21.8, 16, E]], true, 0.2), { ton: ton - 0.08 }));
      for (let x = 24; x < 40; x += 2) g.push(linie(`M${x} 7 L${x} 15`, dunkel(S.c, 0.3), 0.45, 0.6));
      // Ferse und Spitze
      g.push(`<path d="M22.4 58 Q24 70 34 76 Q40 77.6 44 77.6 L42 64 Q32 64 28 54 Z" fill="${kontrast}" opacity="0.92"/>`);
      g.push(`<path d="M68 63 Q78 64 80 70 Q80 76 72 78 L64 78 Q66 70 68 63 Z" fill="${kontrast}" opacity="0.92"/>`);
      g.push(linie('M28 54 Q32 64 42 64', dunkel(S.c, 0.35), 0.5, 0.6), linie('M68 63 Q66 70 64 78', dunkel(S.c, 0.35), 0.5, 0.6));
      g.push(`<path d="M28 20 Q27 36 29 50" stroke="#fff" stroke-width="1.6" fill="none" opacity="0.14" stroke-linecap="round"/>`);
      g.push('</g>');
      return g.join('');
    };
    t.push(socke(10, 6, -0.12), socke(0, 12, 0));
  },
  // Socken-Set: drei Paar gefaltet und gestaffelt, Banderole aus Karton
  sockenset(S, t, p) {
    t.push(schatten(50, 90, 38, 2.6));
    const farben = p.farben ?? [S.c, hell(S.c, 0.45), dunkel(S.c, 0.3)];
    farben.forEach((c, i) => {
      const SX = materialDefs(c, 'strick', S.defs);
      const dx = 16 + i * 11, dy = 14 + i * 4;
      // gefaltete Socke: Schaft oben, Fußteil umgeschlagen
      t.push(flaeche(SX, glatt([[dx, dy, E], [dx + 26, dy, E], [dx + 27, dy + 60], [dx + 22, dy + 70], [dx + 4, dy + 70], [dx - 1, dy + 60]], true, 0.35), { ton: -0.02 * i }));
      t.push(flaeche(SX, glatt([[dx, dy, E], [dx + 26, dy, E], [dx + 26.2, dy + 9, E], [dx - 0.2, dy + 9, E]], true, 0.2), { ton: -0.1 }));
      for (let x = dx + 2; x < dx + 26; x += 2) t.push(linie(`M${x} ${dy + 1} L${x} ${dy + 8}`, dunkel(c, 0.3), 0.45, 0.6));
      t.push(`<path d="M${dx + 0.4} ${dy + 52} Q${dx + 13} ${dy + 56} ${dx + 26.6} ${dy + 52}" stroke="${dunkel(c, 0.3)}" stroke-width="0.7" fill="none" opacity="0.6"/>`);
      t.push(`<path d="M${dx + 3} ${dy + 60} Q${dx + 13} ${dy + 74} ${dx + 23} ${dy + 60}" fill="${dunkel(c, 0.22)}" opacity="0.8"/>`);
    });
    // Banderole
    t.push(`<path d="M12 46 L76 46 L77 60 L13 60 Z" fill="#f2ede2" stroke="#c9bfae" stroke-width="0.5"/><rect x="18" y="49" width="16" height="8" rx="1" fill="${dunkel(S.c, 0.2)}"/>`);
    t.push(`<path d="M22 53 h8 M40 51 h26 M40 55 h20" stroke="#8d8576" stroke-width="1" />`);
  },
  // Strumpfhose (20 den): Bund 3, Höschenteil 18, Beinlänge 80; transparent, Zwickel und Spitze verstärkt
  strumpfhose(S, t, p) {
    t.push(schatten(50, 96, 34, 2.4));
    const op = p.deckkraft ?? 0.72;
    const id = uid(S, 'v');
    S.defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${S.c}" stop-opacity="${op}"/><stop offset="0.45" stop-color="${hell(S.c, 0.25)}" stop-opacity="${op * 0.75}"/><stop offset="1" stop-color="${S.c}" stop-opacity="${op}"/></linearGradient>`);
    for (const s of [1, -1]) {
      const bein = [[X(s, 51), 30, E], [X(s, 66), 10, E], [X(s, 67), 26], [X(s, 61), 56], [X(s, 59.4), 82], [X(s, 63), 88], [X(s, 70), 92], [X(s, 70), 96, E], [X(s, 58), 96], [X(s, 53.4), 92], [X(s, 52.6), 82], [X(s, 53), 56]];
      const d = glatt(s > 0 ? bein : [...bein].reverse(), true, 0.4);
      t.push(`<path d="${d}" fill="url(#${id})" stroke="${S.cK}" stroke-width="0.5" stroke-opacity="0.6"/>`);
      // verstärkte Spitze
      t.push(`<path d="M${X(s, 70)} 92.4 L${X(s, 70)} 96 L${X(s, 60)} 96 Q${X(s, 62)} 92 ${X(s, 70)} 92.4 Z" fill="${dunkel(S.c, 0.2)}" opacity="${op}"/>`);
      t.push(`<path d="M${X(s, 62.6)} 30 Q${X(s, 60.6)} 54 ${X(s, 57.6)} 80" stroke="#fff" stroke-width="1.2" opacity="0.18" fill="none"/>`);
    }
    // Höschenteil dichter
    t.push(`<path d="M34 10 L66 10 L67 26 L57 32 L50 35 L43 32 L33 26 Z" fill="${S.c}" opacity="${Math.min(1, op + 0.15)}"/>`);
    t.push(`<path d="M46 30 Q50 33 54 30 L52 36 L48 36 Z" fill="${dunkel(S.c, 0.25)}" opacity="0.7"/>`);
    gummiband(t, S, 33.6, 6, 66.4, 11.4, { farbe: dunkel(S.c, 0.15), bogen: 0.5 });
  },
  // Pyjama (Herren/Damen): Oberteil mit Reverskragen und Knopfleiste + lange Hose mit Gummizug, Paspel in Kontrast
  pyjama(S, t, p) {
    t.push(schatten(54, 94, 40, 2.6));
    const top = [], hose = [];
    hoseFlat(S, hose, { passform: 'gerade', komfortbund: true, taschen: false, muster: p.muster });
    oberteilFlat(S, top, { aermel: 'lang', kragen: 'hemd', knopfleiste: true, brusttasche: true, passform: 'gerade', muster: p.muster });
    t.push(`<g transform="translate(33 30) scale(0.68)">${hose.join('')}</g>`);
    t.push(`<g transform="translate(-3 0) scale(0.72)">${top.join('')}</g>`);
  },
  // Nachthemd: Länge 120 (knöchellang), Saumweite 130, 3/4-Ärmel gerade, Knopfleiste 18 mit Rüsche, Spitze an Ausschnitt, Ärmel und Saum
  nachthemd(S, t, p) {
    t.push(schatten(50, 97, 30, 2.2));
    // Ärmel (gerade, 3/4)
    for (const s of [1, -1]) {
      const arm = [[X(s, 61), 6, E], [X(s, 70), 8], [X(s, 80), 30], [X(s, 84), 44, E], [X(s, 75.4), 47, E], [X(s, 68), 26]];
      t.push(flaeche(S, glatt(s > 0 ? arm : [...arm].reverse(), true, 0.35), { ton: -0.05 }));
      spitze(t, [[X(s, 84), 44.6], [X(s, 75.6), 47.6]], p.spitze ?? '#f4f3ef', 1.1, s > 0 ? -1 : 1);
    }
    // Rumpf, nach unten leicht ausgestellt, lang
    const form = sym([[50, 11], [55, 10], [61, 6, E], [67, 9], [68, 26], [70, 50], [74, 75], [77, 95, E]]);
    t.push(flaeche(S, glatt(form, true, 0.35)));
    // weiche Falten
    for (const x of [42, 58, 35, 65]) t.push(linie(`M${x} 40 Q${50 + (x - 50) * 1.15} 68 ${50 + (x - 50) * 1.45} 95`, dunkel(S.c, 0.22), 0.55, 0.45));
    // Passe mit Rüsche
    t.push(`<path d="M33.5 24 Q50 27 66.5 24" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.6" fill="none"/>`);
    spitze(t, [[66.4, 24.4], [58, 26.4], [50, 27], [42, 26.4], [33.6, 24.4]], hell(S.c, 0.25), 1.3, -1);
    // Ausschnitt mit Spitze, Knopfleiste mit 4 Knöpfen
    t.push(`<path d="M39 6.4 Q50 16 61 6.4" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.7" fill="none"/>`);
    spitze(t, [[39, 6.8], [44, 11.2], [50, 12.8], [56, 11.2], [61, 6.8]], p.spitze ?? '#f4f3ef', 1, 1);
    t.push(`<rect x="48.4" y="13" width="3.2" height="22" fill="${hell(S.c, 0.12)}" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.4"/>`);
    for (const y of [16, 21, 26, 31]) t.push(`<circle cx="50" cy="${y}" r="0.95" fill="#f4f3ef" stroke="${dunkel(S.c, 0.35)}" stroke-width="0.3"/>`);
    // Saum mit breiter Spitze
    spitze(t, [[23, 95], [36, 96.2], [50, 96.6], [64, 96.2], [77, 95]], p.spitze ?? '#f4f3ef', 1.6, 1);
    t.push(`<path d="M24 92 Q50 94 76 92" stroke="${hell(S.c, 0.5)}" stroke-width="1.2" fill="none" opacity="0.7"/>`);
  },
  // Bademantel (Frottee): Länge 115, Schalkragen, Ärmel 60 mit Umschlag, Bindegürtel 4, aufgesetzte Taschen
  bademantel(S, t, p) {
    t.push(schatten(50, 96, 38, 2.6));
    for (const s of [1, -1]) {
      const arm = [[X(s, 66), 10, E], [X(s, 78), 14], [X(s, 88), 40], [X(s, 94), 62, E], [X(s, 82), 66, E], [X(s, 74), 40]];
      t.push(flaeche(S, glatt(s > 0 ? arm : [...arm].reverse(), true, 0.35), { ton: -0.06 }));
      t.push(flaeche(S, glatt(s > 0 ? [[X(s, 82), 58, E], [X(s, 93), 54, E], [X(s, 94.6), 62, E], [X(s, 82.6), 66.4, E]] : [[X(s, 82.6), 66.4, E], [X(s, 94.6), 62, E], [X(s, 93), 54, E], [X(s, 82), 58, E]], true, 0.2), { ton: 0.04 }));
    }
    const rumpf = sym([[50, 30], [58, 14], [64, 8, E], [70, 10], [74, 24], [74, 54], [78, 94, E]]);
    t.push(flaeche(S, glatt(rumpf, true, 0.35)));
    // Schalkragen: zwei Bahnen, überkreuzt
    const kragenR = [[64, 8, E], [70, 10], [66, 30], [56, 50], [50, 56, E], [46, 52], [56, 30], [60, 12]];
    const kragenL = sp(kragenR);
    t.push(flaeche(S, glatt(kragenL, true, 0.4), { ton: 0.06 }));
    t.push(flaeche(S, glatt(kragenR, true, 0.4), { ton: 0.1 }));
    t.push(linie('M50 56 L50 94', dunkel(S.c, 0.3), 0.7, 0.6));
    // Gürtel mit Schleife und hängenden Enden
    const gurt = dunkel(S.c, 0.06);
    t.push(`<path d="M26 54 Q50 57 74 54 L74 59 Q50 62 26 59 Z" fill="${gurt}" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.5"/>`);
    t.push(flaeche(S, glatt([[52, 56], [58, 58], [60, 80, E], [55, 80, E], [53, 64]], true, 0.4), { ton: -0.04 }), flaeche(S, glatt([[50, 56], [48, 64], [44, 84, E], [39, 83, E], [44, 60]], true, 0.4), { ton: 0.02 }));
    t.push(`<ellipse cx="51" cy="57.4" rx="3.6" ry="3" fill="${gurt}" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.5"/>`);
    // Taschen
    for (const s of [1, -1]) t.push(naht(`M${X(s, 58)} 64 L${X(s, 70)} 64 L${X(s, 71)} 78 L${X(s, 59)} 78 Z`, S, 0.8), linie(`M${X(s, 58)} 64.8 L${X(s, 70)} 64.8`, dunkel(S.c, 0.3), 0.6, 0.6));
    // Aufhänger
    t.push(`<path d="M47 9.4 Q50 5 53 9.4" stroke="${dunkel(S.c, 0.3)}" stroke-width="0.9" fill="none"/>`);
  },
  // Shapewear (formender Body): Länge 72, Brust 82, Taille 68, Träger 1,2 verstellbar, hoher Beinausschnitt, Formnähte
  shapewear(S, t, p) {
    t.push(schatten(50, 94, 30, 2.4));
    for (const s of [1, -1]) t.push(`<path d="M${X(s, 60)} 26 L${X(s, 63)} 6" stroke="${dunkel(S.c, 0.35)}" stroke-width="2.2" stroke-linecap="round"/><path d="M${X(s, 60)} 26 L${X(s, 63)} 6" stroke="${S.c}" stroke-width="1.4" stroke-linecap="round"/>`);
    const form = sym([[50, 30], [56, 25], [62, 24, E], [70, 30], [72, 42], [66, 56], [68, 70], [72, 76, E], [64, 84], [56, 92, E]]);
    t.push(flaeche(S, glatt(form, true, 0.4)));
    // Brustteil, Formnähte (Princessnähte), Bauchpaneel
    t.push(`<path d="M28 30 Q38 22 50 30 Q62 22 72 30 Q66 40 50 42 Q34 40 28 30 Z" fill="${dunkel(S.c, 0.08)}" opacity="0.8"/>`);
    for (const s of [1, -1]) t.push(naht(`M${X(s, 60)} 40 Q${X(s, 59)} 56 ${X(s, 61)} 72`, S, 0.8), linie(`M${X(s, 60.6)} 40 Q${X(s, 59.6)} 56 ${X(s, 61.6)} 72`, dunkel(S.c, 0.25), 0.5, 0.6));
    t.push(`<path d="M41 46 Q50 44 59 46 L60 70 Q50 74 40 70 Z" fill="${dunkel(S.c, 0.12)}" opacity="0.5"/>`);
    t.push(linie('M33 79 Q42 86 44 92 M67 79 Q58 86 56 92', dunkel(S.c, 0.35), 0.8, 0.8));
    t.push(`<path d="M36 34 Q40 30 44 31" stroke="#fff" stroke-width="1.2" fill="none" opacity="0.3"/>`);
  },
};

export const WAESCHE_ZEICHNER = Object.fromEntries(Object.entries(WAESCHE).map(([k, fn]) => ['q28' + k, fn]));

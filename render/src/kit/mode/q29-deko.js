// Q29: Deko und Wohnen – Leuchte, Spiegel, Laterne, Kerzenhalter, Pflanze, Duftstäbchen, Boxen, Korb, Uhr, Rahmen, Schale.

import { f, E, glatt, hell, dunkel, mische, linie, boden, form, zylinder, glas, maserung, rund, metall, stoff2, flaeche, etikett } from './q29-hilfen.js';

const MESSING = '#b8954f';
const ell = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;
const flamme = (x, y, s = 1) => `<path d="M${x} ${f(y - 6 * s)} Q${f(x - 2.4 * s)} ${f(y - 2 * s)} ${x} ${y} Q${f(x + 2.4 * s)} ${f(y - 2 * s)} ${x} ${f(y - 6 * s)} Z" fill="#f6c453"/><path d="M${x} ${f(y - 3.6 * s)} Q${f(x - 1 * s)} ${f(y - 1.4 * s)} ${x} ${f(y - 0.4 * s)} Q${f(x + 1 * s)} ${f(y - 1.4 * s)} ${x} ${f(y - 3.6 * s)} Z" fill="#fff4cf"/>`;
// Rattan-Geflecht als Muster
function geflecht(S, farbe) {
  const id = 'gf' + Math.random().toString(36).slice(2, 7);
  S.defs.push(`<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${farbe}"/><path d="M0 1 H4 M0 3 H4" stroke="${dunkel(farbe, 0.25)}" stroke-width="0.9"/><path d="M1 0 V1 M3 1 V3 M1 3 V4" stroke="${hell(farbe, 0.25)}" stroke-width="0.9"/></pattern>`);
  return `url(#${id})`;
}

export const DEKO = {
  // Tischleuchte: Keramikfuß bauchig Ø 14, Leinenschirm konisch Ø 30/24, Höhe 45 cm, Licht an.
  // Maß: Schirm : Fuß = 0,45 : 0,55 der Höhe, Schirm unten 2,1-mal Fußbreite.
  tischleuchte(S, t) {
    t.push(boden(50, 90, 22, 2.6));
    t.push(`<ellipse cx="50" cy="40" rx="40" ry="34" fill="#f9e7b8" opacity="0.18"/>`);
    const fuss = 'M44 50 L56 50 Q57 54 62 58 C72 66 70 84 58 88 L42 88 C30 84 28 66 38 58 Q43 54 44 50 Z';
    t.push(form(S, fuss, S.c, { licht: 'rund' }));
    t.push(`<rect x="45" y="47" width="10" height="3" fill="${MESSING}"/>`, linie('M50 47 V40', '#6b6b6b', 0.8));
    const L = stoff2(S, '#efe8da', 'leinen');
    const schirm = 'M32 10 L68 10 L78 42 Q50 46 22 42 Z';
    t.push(flaeche(L, schirm));
    t.push(`<path d="${schirm}" fill="#ffe9b0" opacity="0.25"/>`);
    t.push(`<path d="M22 42 Q50 46 78 42 Q50 48.4 22 42 Z" fill="#f8e2a8"/><ellipse cx="50" cy="10" rx="18" ry="2" fill="${dunkel('#efe8da', 0.1)}"/>`);
    t.push(`<path d="M38 60 Q35 72 40 82" stroke="#fff" stroke-width="2" fill="none" opacity="0.35" stroke-linecap="round"/>`);
  },

  // Wandspiegel rund Ø 60, schmaler Messingrahmen 1 cm, Lederriemen an Wandhaken.
  // Maß: Riemen 0,4 Ø, Spiegel spiegelt Fenster.
  spiegel(S, t) {
    t.push(boden(50, 94, 24, 1.6));
    t.push(`<circle cx="50" cy="8" r="2" fill="#555"/>`, `<path d="M50 8 L26 46 M50 8 L74 46" stroke="#7a4a2e" stroke-width="2.4" stroke-linecap="round"/>`);
    t.push(`<circle cx="50" cy="58" r="35" fill="${S.c}"/><circle cx="50" cy="58" r="35" fill="${metall(S)}"/>`);
    const id = 'sg' + Math.random().toString(36).slice(2, 6);
    S.defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfe8ec"/><stop offset="0.55" stop-color="#b9c8cf"/><stop offset="1" stop-color="#9fb0b8"/></linearGradient>`);
    t.push(`<circle cx="50" cy="58" r="32.6" fill="url(#${id})"/>`);
    t.push(`<path d="M30 40 L48 30 L44 68 L26 76 Z" fill="#fff" opacity="0.35"/><path d="M54 30 L62 27 L58 66 L50 70 Z" fill="#fff" opacity="0.25"/>`);
    t.push(`<path d="M26 72 Q34 80 44 84" stroke="#fff" stroke-width="2" fill="none" opacity="0.4" stroke-linecap="round"/>`);
    for (const x of [26, 74]) t.push(`<circle cx="${x}" cy="46" r="1.4" fill="${MESSING}"/>`);
  },

  // Laterne: Metallgehäuse 20×20×40, vier Glasflächen, Spitzdach, Ringgriff, Stumpenkerze innen.
  // Maß: Dach 1/5 der Höhe, Fuß 1/12.
  laterne(S, t) {
    t.push(boden(50, 90, 26, 2.6));
    const m = S.c;
    t.push(`<circle cx="50" cy="9" r="4.4" fill="none" stroke="${m}" stroke-width="1.6"/>`);
    t.push(form(S, 'M50 13 L72 28 L28 28 Z', m), form(S, 'M26 28 L74 28 L74 32 L26 32 Z', dunkel(m, 0.1)));
    t.push(glas(S, 'M29 32 L71 32 L71 82 L29 82 Z', { deck: 0.25 }));
    // Kerze
    t.push(zylinder(S, 50, 52, 80, 9, 2.4, '#f2ece0'), linie('M50 52 V48', '#333', 0.6), flamme(50, 48, 1.2));
    t.push(`<circle cx="50" cy="44" r="13" fill="#f9d77a" opacity="0.15"/>`);
    for (const x of [29, 50, 71]) t.push(`<rect x="${x - 1}" y="32" width="2" height="50" fill="${m}"/>`);
    t.push(form(S, 'M26 82 L74 82 L74 88 L26 88 Z', m));
    t.push(`<path d="M32 36 L36 78" stroke="#fff" stroke-width="1.4" opacity="0.5"/>`);
  },

  // Kerzenhalter: drei Messingleuchter 30/24/18 cm, gedrechselt, Stabkerzen.
  // Maß: Fuß Ø 0,33 Höhe, Kerze 0,8 Höhe des Leuchters.
  kerzenhalter(S, t) {
    t.push(boden(50, 90, 40, 2.6));
    const kerze = (x, h, farbe) => {
      const yb = 88, yt = yb - h;
      t.push(`<ellipse cx="${x}" cy="${yb}" rx="8" ry="2.2" fill="${dunkel(S.c, 0.3)}"/>`);
      t.push(form(S, `M${x - 8} ${yb} Q${x - 7} ${yb - 4} ${x - 2} ${yb - 5} L${x - 1.6} ${yt + 10} Q${x - 4} ${yt + 6} ${x - 4.4} ${yt + 3} L${x + 4.4} ${yt + 3} Q${x + 4} ${yt + 6} ${x + 1.6} ${yt + 10} L${x + 2} ${yb - 5} Q${x + 7} ${yb - 4} ${x + 8} ${yb} Z`, S.c, { licht: 'metall' }));
      for (const y of [yb - 14, yb - 24]) if (y > yt + 12) t.push(`<ellipse cx="${x}" cy="${y}" rx="3" ry="1.4" fill="${S.c}"/><ellipse cx="${x}" cy="${y}" rx="3" ry="1.4" fill="${metall(S)}"/>`);
      t.push(`<ellipse cx="${x}" cy="${yt + 3}" rx="4.4" ry="1.2" fill="${hell(S.c, 0.3)}"/>`);
      t.push(form(S, `M${x - 1.8} ${yt + 3} L${x - 1.8} ${yt - 22} L${x + 1.8} ${yt - 22} L${x + 1.8} ${yt + 3} Z`, farbe, { licht: 'rund' }));
      t.push(linie(`M${x} ${yt - 22} v-2`, '#333', 0.5), flamme(x, yt - 24, 0.8));
    };
    kerze(26, 34, '#e9dcc0');
    kerze(74, 26, '#c9b08a');
    kerze(50, 44, '#f4f0e8');
  },

  // Pflanze im Übertopf: Steingut-Übertopf Ø 18, Höhe 16, Gummibaum-artige Blätter, Untersetzer.
  // Maß: Topf 1/3, Pflanze 2/3 der Gesamthöhe.
  pflanze(S, t) {
    t.push(boden(50, 90, 26, 2.6));
    const gruen = '#55704a';
    const blatt = (x, y, w, l, ton) => `<g transform="rotate(${w} ${x} ${y})"><path d="M${x} ${y} Q${x - l * 0.35} ${y - l * 0.5} ${x} ${y - l} Q${x + l * 0.35} ${y - l * 0.5} ${x} ${y} Z" fill="${ton}"/><path d="M${x} ${y} L${x} ${y - l * 0.95}" stroke="${hell(ton, 0.3)}" stroke-width="0.5"/></g>`;
    t.push(linie('M50 62 Q48 40 50 22', '#6b5a3c', 1.4), linie('M50 50 Q38 40 32 30', '#6b5a3c', 1), linie('M50 46 Q62 38 68 26', '#6b5a3c', 1));
    for (const [x, y, w, l, k] of [[50, 24, 0, 16, 0], [32, 32, -40, 16, 1], [68, 28, 38, 16, 2], [44, 44, -70, 17, 1], [56, 40, 70, 17, 0], [40, 58, -100, 15, 2], [60, 56, 100, 15, 1], [50, 36, -15, 14, 2], [30, 44, -60, 12, 0], [70, 42, 62, 12, 2]])
      t.push(blatt(x, y, w, l, [gruen, hell(gruen, 0.12), dunkel(gruen, 0.15)][k]));
    const topf = 'M30 60 L70 60 L66 88 L34 88 Z';
    t.push(form(S, topf, S.c, { licht: 'rund' }));
    t.push(`<ellipse cx="50" cy="60" rx="20" ry="3.4" fill="${dunkel(S.c, 0.12)}"/><ellipse cx="50" cy="60.6" rx="17" ry="2.4" fill="#4b3b2c"/>`);
    t.push(`<path d="M30.4 63 L69.6 63" stroke="${hell(S.c, 0.2)}" stroke-width="1"/>`);
  },

  // Duftstäbchen (Diffusor): Glasflakon 100 ml, Holzhalskragen, acht Rattanstäbe gefächert.
  // Maß: Flakon 1/3 der Höhe, Stäbe 2/3, Fächer 30°.
  duftstaebchen(S, t) {
    t.push(boden(50, 90, 18, 2.4));
    for (let i = 0; i < 8; i++) { const a = -16 + i * 4.6; const x = 50 + Math.sin(a * Math.PI / 180) * 64, y = 58 - Math.cos(a * Math.PI / 180) * 54; t.push(linie(`M50 58 L${f(x)} ${f(y)}`, i % 2 ? '#8a6a46' : '#a5845c', 1.1)); }
    const fl = 'M36 62 Q36 56 44 56 L56 56 Q64 56 64 62 L64 84 Q64 89 58 89 L42 89 Q36 89 36 84 Z';
    t.push(`<path d="M37 70 L63 70 L63 84 Q63 88 58 88 L42 88 Q37 88 37 84 Z" fill="${S.c}" opacity="0.7"/>`);
    t.push(glas(S, fl, { deck: 0.3, ton: mische(S.c, '#ffffff', 0.6) }));
    t.push(form(S, 'M45 50 L55 50 L55 56 L45 56 Z', '#b68a5e'));
    t.push(etikett(41, 74, 18, 8, '#f6f1e6', dunkel(S.c, 0.4)));
  },

  // Aufbewahrungsbox: Leinenbezug über Karton 30×20×18, Deckel mit Lederschlaufe, zwei gestapelt.
  // Maß: Deckel 1/6 der Höhe, Kanten gerade, Schlaufe mittig.
  aufbewahrungsbox(S, t) {
    t.push(boden(50, 88, 40, 3));
    const box = (x0, x1, yb, h, tief, ton) => {
      const yt = yb - h;
      t.push(flaeche(S, `M${x0} ${yt} L${x1} ${yt} L${x1} ${yb} L${x0} ${yb} Z`, { ton: ton - 0.06 }));
      t.push(flaeche(S, `M${x1} ${yt} L${x1 + tief} ${yt - tief * 0.7} L${x1 + tief} ${yb - tief * 0.7} L${x1} ${yb} Z`, { ton: ton - 0.2 }));
      // Deckel
      const dh = h / 5;
      t.push(flaeche(S, `M${x0 - 1} ${yt - 1} L${x1 + 1} ${yt - 1} L${x1 + 1} ${yt + dh} L${x0 - 1} ${yt + dh} Z`, { ton: ton + 0.02 }));
      t.push(flaeche(S, `M${x1 + 1} ${yt - 1} L${x1 + 1 + tief} ${yt - 1 - tief * 0.7} L${x1 + 1 + tief} ${yt + dh - tief * 0.7} L${x1 + 1} ${yt + dh} Z`, { ton: ton - 0.14 }));
      t.push(flaeche(S, `M${x0 - 1} ${yt - 1} L${x1 + 1} ${yt - 1} L${x1 + 1 + tief} ${yt - 1 - tief * 0.7} L${x0 - 1 + tief} ${yt - 1 - tief * 0.7} Z`, { ton: ton + 0.12 }));
      const mx = (x0 + x1) / 2;
      t.push(`<path d="M${mx - 4} ${yt + dh} Q${mx} ${yt + dh + 5} ${mx + 4} ${yt + dh}" stroke="#7a4a2e" stroke-width="1.6" fill="none"/><circle cx="${mx - 4}" cy="${yt + dh - 0.6}" r="0.7" fill="${MESSING}"/><circle cx="${mx + 4}" cy="${yt + dh - 0.6}" r="0.7" fill="${MESSING}"/>`);
    };
    box(10, 72, 88, 32, 14, 0);
    box(16, 64, 52, 26, 11, 0.06);
  },

  // Wäschekorb Rattan Ø 40, Höhe 55, zwei Griffe, Leinenbeutel innen mit Umschlag.
  // Maß: Höhe : Ø = 1,35, oben 10 % breiter als unten.
  waeschekorb(S, t) {
    t.push(boden(50, 91, 30, 3));
    const korb = 'M24 26 L76 26 L72 88 Q50 92 28 88 Z';
    t.push(`<path d="${korb}" fill="${geflecht(S, S.c)}"/>`, `<path d="${korb}" fill="${rund(S)}"/>`, `<path d="${korb}" fill="none" stroke="${dunkel(S.c, 0.4)}" stroke-width="0.5" opacity="0.6"/>`);
    for (const y of [40, 64]) t.push(`<path d="M${f(24 + (y - 26) * 0.07)} ${y} Q50 ${y + 3} ${f(76 - (y - 26) * 0.07)} ${y}" stroke="${dunkel(S.c, 0.3)}" stroke-width="2" fill="none" opacity="0.6"/>`);
    for (const s of [-1, 1]) t.push(`<ellipse cx="${50 + s * 19}" cy="34" rx="4" ry="2" fill="#3f342a"/>`);
    // Leinenbeutel mit Umschlag
    const L = stoff2(S, '#ece6d8', 'leinen');
    t.push(flaeche(L, glatt([[22, 26, E], [78, 26, E], [79, 33], [74, 30.6], [64, 33], [52, 30.4], [40, 33.2], [30, 30.6], [21, 33]], true, 0.4)));
    t.push(flaeche(L, glatt([[26, 20], [40, 15], [56, 17], [72, 14], [76, 22], [72, 26, E], [28, 26, E]], true, 0.5), { ton: 0.05 }));
    t.push(`<ellipse cx="50" cy="26" rx="26" ry="3.6" fill="${dunkel('#ece6d8', 0.25)}"/>`);
  },

  // Wanduhr Ø 30, schlanker Holzrahmen, Strichindizes, zwei Zeiger plus Sekunde, 10 nach 10.
  // Maß: Indizes 1/10 Radius, Stundenzeiger 0,5 r, Minutenzeiger 0,8 r.
  wanduhr(S, t) {
    t.push(boden(50, 94, 22, 1.4));
    t.push(`<circle cx="50" cy="52" r="40" fill="${S.c}"/><circle cx="50" cy="52" r="40" fill="${rund(S)}"/>`);
    t.push(`<circle cx="50" cy="52" r="36" fill="#f5f2ec"/><circle cx="50" cy="52" r="36" fill="none" stroke="#000" stroke-opacity="0.08" stroke-width="2"/>`);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r1 = i % 3 ? 31 : 28.6; t.push(linie(`M${f(50 + Math.sin(a) * r1)} ${f(52 - Math.cos(a) * r1)} L${f(50 + Math.sin(a) * 33.6)} ${f(52 - Math.cos(a) * 33.6)}`, '#2a2c30', i % 3 ? 1 : 2)); }
    const z = (deg, l, w, c = '#2a2c30') => linie(`M50 52 L${f(50 + Math.sin(deg * Math.PI / 180) * l)} ${f(52 - Math.cos(deg * Math.PI / 180) * l)}`, c, w);
    t.push(z(305, 18, 2.6), z(60, 28, 1.8), z(160, 30, 0.6, '#c8372f'), `<circle cx="50" cy="52" r="2" fill="#2a2c30"/>`);
    t.push(`<path d="M24 34 Q30 24 42 20" stroke="#fff" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>`);
  },

  // Bilderrahmen-Set: drei Rahmen (30×40, 20×25, 13×18) mit Passepartout, gruppiert, unterschiedliche Motive.
  // Maß: Rahmenleiste 1/14 der Breite, Passepartout 1/7.
  bilderrahmenset(S, t) {
    t.push(boden(50, 90, 42, 2.4));
    const rahmen = (x, y, w, h, motiv) => {
      const l = w / 14, pp = w / 7;
      t.push(`<rect x="${x + 1}" y="${y + 1.4}" width="${w}" height="${h}" fill="#000" opacity="0.1"/>`);
      t.push(form(S, `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`, S.c));
      t.push(`<rect x="${x + l}" y="${y + l}" width="${w - 2 * l}" height="${h - 2 * l}" fill="#f6f3ec"/>`);
      const ix = x + l + pp, iy = y + l + pp, iw = w - 2 * (l + pp), ih = h - 2 * (l + pp);
      t.push(`<rect x="${f(ix)}" y="${f(iy)}" width="${f(iw)}" height="${f(ih)}" fill="${motiv[0]}"/>`);
      if (motiv[1] === 'berg') t.push(`<path d="M${f(ix)} ${f(iy + ih)} L${f(ix + iw * 0.35)} ${f(iy + ih * 0.45)} L${f(ix + iw * 0.55)} ${f(iy + ih * 0.7)} L${f(ix + iw * 0.75)} ${f(iy + ih * 0.35)} L${f(ix + iw)} ${f(iy + ih)} Z" fill="#9fb393"/><circle cx="${f(ix + iw * 0.25)}" cy="${f(iy + ih * 0.25)}" r="${f(iw * 0.08)}" fill="#e7c17a"/>`);
      if (motiv[1] === 'form') t.push(`<circle cx="${f(ix + iw * 0.42)}" cy="${f(iy + ih * 0.55)}" r="${f(iw * 0.28)}" fill="#c0643f"/><rect x="${f(ix + iw * 0.5)}" y="${f(iy + ih * 0.2)}" width="${f(iw * 0.3)}" height="${f(ih * 0.5)}" fill="#273659" opacity="0.8"/>`);
      if (motiv[1] === 'linie') t.push(`<path d="M${f(ix + iw * 0.2)} ${f(iy + ih * 0.8)} Q${f(ix + iw * 0.5)} ${f(iy + ih * 0.1)} ${f(ix + iw * 0.8)} ${f(iy + ih * 0.7)}" stroke="#2a2c30" stroke-width="0.7" fill="none"/>`);
    };
    rahmen(8, 10, 44, 58, ['#dfe6e2', 'berg']);
    rahmen(58, 10, 34, 42, ['#efe2cf', 'form']);
    rahmen(58, 58, 24, 30, ['#f4f1ea', 'linie']);
  },

  // Dekoschale: flache Steingutschale Ø 35 auf Standfuß, gefüllt mit Holzkugeln und Trockenblumen.
  // Maß: Schalenhöhe 1/5 Ø, Fuß 1/3 Ø.
  dekoschale(S, t) {
    t.push(boden(50, 82, 30, 2.6));
    t.push(form(S, 'M40 70 L60 70 L64 82 Q50 85 36 82 Z', dunkel(S.c, 0.08), { licht: 'rund' }));
    const sch = 'M8 46 C10 62 28 72 50 72 C72 72 90 62 92 46 Z';
    t.push(form(S, sch, S.c, { licht: 'rund' }));
    t.push(`<path d="${ell(50, 46, 42, 10)}" fill="${dunkel(S.c, 0.18)}"/>`);
    for (const [x, y, r, c] of [[30, 44, 7, '#b58866'], [44, 42, 8, '#d8c3a0'], [60, 44, 7, '#8a6a46'], [72, 46, 6, '#c9b08a'], [52, 48, 6, '#a77c52'], [36, 49, 5.6, '#e1d2b6']]) t.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${f(r * 0.35)}" fill="#fff" opacity="0.25"/>`);
    t.push(linie('M66 42 Q72 26 80 16', '#8a7a5a', 0.7), linie('M68 42 Q76 32 88 28', '#8a7a5a', 0.7));
    for (const [x, y] of [[80, 16], [88, 28], [76, 24]]) t.push(`<circle cx="${x}" cy="${y}" r="2.6" fill="#e3d2b0"/><circle cx="${x}" cy="${y}" r="1" fill="#c9a26a"/>`);
    t.push(`<path d="M8 46 C10 62 28 72 50 72 C72 72 90 62 92 46" fill="none" stroke="${hell(S.c, 0.25)}" stroke-width="0.8"/>`);
  },
};

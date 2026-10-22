// Produktbilder für Eigenmarken-Artikel im Stil Coffee Inc 2: flache Illustrationen mit Licht von links,
// eingefärbt in der gewählten Farbe, Material als Struktur erkennbar (Strick, Denim, Leder, Glanz, Leinen).
// Reine Funktionen, kein DOM, kein three.js.
//
// produktbildSVG(artikeltyp, farbe, material?, groesse = 160, opt = { hintergrund }) → SVG-String (viewBox 0 0 100 100)
// typKachelSVG(artikeltyp, groesse = 120) → Bild in Standardfarbe auf heller Kachel (Typ-Kacheln im Assistenten)
// ARTIKELTYPEN_BILD, FARBEN_PRODUKT, MATERIALIEN_BILD, STANDARD_MATERIAL, STANDARD_FARBE, KATEGORIE_BILD

import { produktSVG, bildFuer, modelFuerProdukt } from './mode/produkt.js';

export const FARBEN_PRODUKT = {
  'weiß': '#f3f2ee', creme: '#efe4cc', sand: '#d8c39c', beige: '#cdb592', camel: '#b8864e', cognac: '#9a5a2e', braun: '#6a4630',
  grau: '#9a9ea3', anthrazit: '#474c53', schwarz: '#26282c', marine: '#26355e', hellblau: '#a9c8e8', jeansblau: '#4a6f9e',
  petrol: '#1f6b78', 'mintgrün': '#9fd9bf', salbei: '#9fb393', olive: '#757a45', flaschengrün: '#2c5a40', senf: '#cc9f2e',
  gelb: '#f1cf4a', orange: '#e8833a', koralle: '#ec7a6a', rot: '#c8372f', bordeaux: '#76263a', rosa: '#f2b8cc',
  altrosa: '#d29a9c', flieder: '#c4b0dc', lila: '#7a4f9a',
};
export const MATERIALIEN_BILD = ['Baumwolle', 'Bio-Baumwolle', 'Leinen', 'Kaschmir', 'Merino', 'Denim', 'Leder', 'Polyester', 'Seide', 'Viskose'];

// Artikeltyp → [Kategorie, Standardmaterial, Standardfarbe]
const TYPEN = {
  'Jeans-Shorts': ['damen', 'Denim', 'jeansblau'], Kaschmirpullover: ['damen', 'Kaschmir', 'camel'], Strickjacke: ['damen', 'Merino', 'grau'],
  Bluse: ['damen', 'Viskose', 'weiß'], Hemd: ['herren', 'Baumwolle', 'hellblau'], 'T-Shirt': ['herren', 'Baumwolle', 'weiß'],
  Poloshirt: ['herren', 'Baumwolle', 'marine'], Kleid: ['damen', 'Viskose', 'bordeaux'], Rock: ['damen', 'Polyester', 'marine'],
  Chino: ['herren', 'Baumwolle', 'sand'], Jeans: ['herren', 'Denim', 'jeansblau'], Mantel: ['damen', 'Kaschmir', 'camel'],
  Steppjacke: ['herren', 'Polyester', 'marine'], Blazer: ['herren', 'Merino', 'anthrazit'], Sneaker: ['accessoires', 'Leder', 'weiß'],
  Pumps: ['accessoires', 'Leder', 'schwarz'], Stiefel: ['accessoires', 'Leder', 'cognac'], Pyjama: ['waesche', 'Baumwolle', 'hellblau'],
  'Unterwäsche': ['waesche', 'Baumwolle', 'schwarz'], BH: ['waesche', 'Seide', 'altrosa'], Socken: ['waesche', 'Merino', 'anthrazit'],
  Schal: ['accessoires', 'Kaschmir', 'bordeaux'], 'Mütze': ['accessoires', 'Merino', 'senf'], Handtasche: ['accessoires', 'Leder', 'cognac'],
  'Gürtel': ['accessoires', 'Leder', 'braun'], 'Bettwäsche': ['wohnen', 'Leinen', 'salbei'], Handtuch: ['wohnen', 'Baumwolle', 'petrol'],
  Kissen: ['wohnen', 'Leinen', 'senf'], Tasse: ['wohnen', 'Keramik', 'mintgrün'], Vase: ['wohnen', 'Keramik', 'flaschengrün'],
  Lippenstift: ['beauty', 'Kosmetik', 'rot'], Creme: ['beauty', 'Kosmetik', 'rosa'], Parfum: ['beauty', 'Glas', 'flieder'],
  Kinderbody: ['kinder', 'Bio-Baumwolle', 'gelb'], Kinderkleid: ['kinder', 'Baumwolle', 'koralle'], 'Plüschtier': ['spielwaren', 'Polyester', 'camel'],
};
export const ARTIKELTYPEN_BILD = Object.keys(TYPEN);
export const STANDARD_MATERIAL = Object.fromEntries(Object.entries(TYPEN).map(([k, v]) => [k, v[1]]));
export const STANDARD_FARBE = Object.fromEntries(Object.entries(TYPEN).map(([k, v]) => [k, v[2]]));
export const KATEGORIE_BILD = Object.fromEntries(Object.entries(TYPEN).map(([k, v]) => [k, v[0]]));
const STRICK_TYPEN = new Set(['Kaschmirpullover', 'Strickjacke', 'Schal', 'Mütze', 'Socken']);

// ─────────────────────────────────────────── Farbe
function rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex([r, g, b]) { return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
const mische = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
const hell = (c, t) => mische(c, '#ffffff', t);
const dunkel = (c, t) => mische(c, '#000000', t);
const helligkeit = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
export function produktFarbe(farbe) {
  if (FARBEN_PRODUKT[farbe]) return FARBEN_PRODUKT[farbe];
  const k = String(farbe ?? '').toLowerCase().replace('ue', 'ü');
  if (FARBEN_PRODUKT[k]) return FARBEN_PRODUKT[k];
  return /^#[0-9a-f]{3,6}$/i.test(String(farbe ?? '')) ? farbe : null;
}
let zaehler = 0;

// ─────────────────────────────────────────── Zeichenkontext
function kontext(c, material, typ) {
  const id = `pb${(++zaehler).toString(36)}`;
  const hl = helligkeit(c);
  const K = {
    id, c, typ, material,
    cL: hell(c, 0.18), cD: dunkel(c, hl > 0.8 ? 0.1 : 0.2), cK: dunkel(c, hl > 0.8 ? 0.22 : 0.4),
    linie: dunkel(c, hl > 0.8 ? 0.28 : 0.45),
    teile: [], defs: [],
  };
  const m = String(material ?? '').toLowerCase();
  K.strick = STRICK_TYPEN.has(typ) || m === 'kaschmir' || m === 'merino';
  K.denim = m === 'denim';
  K.leder = m === 'leder';
  K.glanz = ['seide', 'polyester', 'viskose'].includes(m);
  K.leinen = m === 'leinen';
  K.hart = ['keramik', 'glas', 'kosmetik'].includes(m) || ['Tasse', 'Vase', 'Lippenstift', 'Creme', 'Parfum'].includes(typ);
  K.bio = m === 'bio-baumwolle';
  // Licht von links
  K.defs.push(`<linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="0.25"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.42" stop-color="#fff" stop-opacity="0"/><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.24"/></linearGradient>`);
  K.defs.push(`<radialGradient id="${id}g" cx="0.32" cy="0.26" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`);
  K.defs.push(`<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.32"/><stop offset="0.42" stop-color="#fff" stop-opacity="0"/><stop offset="0.66" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.76" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  const dl = hl > 0.55 ? '#000' : '#fff';
  if (K.strick) K.defs.push(`<pattern id="${id}m" width="${m === 'kaschmir' ? 2.4 : 3}" height="${m === 'kaschmir' ? 2.2 : 2.7}" patternUnits="userSpaceOnUse"><path d="M0 0 L${m === 'kaschmir' ? 1.2 : 1.5} ${m === 'kaschmir' ? 1.5 : 1.9} L${m === 'kaschmir' ? 2.4 : 3} 0" stroke="#000" stroke-opacity="0.2" stroke-width="0.45" fill="none"/></pattern>`);
  else if (K.denim) K.defs.push(`<pattern id="${id}m" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><path d="M0 0 V1.6" stroke="#fff" stroke-opacity="0.3" stroke-width="0.6"/><circle cx="1.1" cy="0.5" r="0.2" fill="#fff" fill-opacity="0.25"/></pattern>`);
  else if (K.leinen) K.defs.push(`<pattern id="${id}m" width="3.2" height="2.6" patternUnits="userSpaceOnUse"><path d="M0 0.6 H3.2" stroke="#000" stroke-opacity="0.12" stroke-width="0.45"/><path d="M1.8 0 V2.6" stroke="#fff" stroke-opacity="0.15" stroke-width="0.4"/><path d="M0 1.9 H1.4" stroke="${dl}" stroke-opacity="0.14" stroke-width="0.6"/></pattern>`);
  else if (typ === 'Handtuch') K.defs.push(`<pattern id="${id}m" width="1.6" height="1.6" patternUnits="userSpaceOnUse"><circle cx="0.8" cy="0.8" r="0.45" fill="#000" fill-opacity="0.12"/></pattern>`);
  else if (typ === 'Plüschtier') K.defs.push(`<pattern id="${id}m" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><path d="M0.4 0.4 l0.8 0.9 M1.6 1.4 l0.6 0.8" stroke="#000" stroke-opacity="0.14" stroke-width="0.4"/></pattern>`);
  else K.defs.push(`<pattern id="${id}m" width="1.8" height="1.8" patternUnits="userSpaceOnUse"><circle cx="0.9" cy="0.9" r="0.22" fill="#000" fill-opacity="0.06"/></pattern>`);
  // Formen: Grundfarbe, Struktur, Licht, Glanz, Umriss
  K.form = (d, o = {}) => {
    const f = o.farbe ?? c;
    const tr = o.tr ? ` transform="${o.tr}"` : '';
    K.teile.push(`<path d="${d}" fill="${f}"${tr}/>`);
    if (o.muster !== false && !(K.hart && o.muster !== true)) K.teile.push(`<path d="${d}" fill="url(#${id}m)"${tr}/>`);
    if (o.licht !== false) K.teile.push(`<path d="${d}" fill="url(#${id}l)"${tr}/>`);
    if ((K.leder || K.hart) && o.glanz !== false) K.teile.push(`<path d="${d}" fill="url(#${id}g)"${tr}/>`);
    if (K.glanz && o.glanz !== false) K.teile.push(`<path d="${d}" fill="url(#${id}s)"${tr}/>`);
    K.teile.push(`<path d="${d}" fill="none" stroke="${o.linie ?? K.linie}" stroke-width="${o.sw ?? 0.7}" stroke-linejoin="round"${tr}/>`);
  };
  K.flaeche = (d, f, op = 1, tr = '') => K.teile.push(`<path d="${d}" fill="${f}"${op < 1 ? ` opacity="${op}"` : ''}${tr ? ` transform="${tr}"` : ''}/>`);
  K.strich = (d, f, w = 0.6, extra = '') => K.teile.push(`<path d="${d}" fill="none" stroke="${f}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`);
  K.naht = (d) => K.strich(d, K.denim ? '#e0a043' : hell(c, helligkeit(c) > 0.7 ? -0.2 : 0.3), K.denim ? 0.55 : 0.4, ' stroke-dasharray="1.1 0.8"');
  K.kreis = (x, y, r, f, extra = '') => K.teile.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${extra}/>`);
  K.gruppe = (tr, fn) => { K.teile.push(`<g transform="${tr}">`); fn(); K.teile.push('</g>'); };
  K.rippen = (x0, x1, y0, y1, n, f = K.cD) => { for (let i = 1; i < n; i++) { const x = x0 + ((x1 - x0) * i) / n; K.strich(`M${x.toFixed(2)} ${y0} L${x.toFixed(2)} ${y1}`, f, 0.45); } };
  return K;
}

const METALL = '#c9a24a', METALL_D = '#8f6f2a', SILBER = '#c9ced3';

// ─────────────────────────────────────────── Zeichner je Artikeltyp
const Z = {};
Z['T-Shirt'] = (K) => {
  K.form('M36 18 C40 23 60 23 64 18 L78 24 L88 40 L77 46 L71 40 L71 86 C57 88 43 88 29 86 L29 40 L23 46 L12 40 L22 24 Z');
  K.flaeche('M38.5 18.6 C42 21.6 58 21.6 61.5 18.6 C58 16.6 42 16.6 38.5 18.6 Z', K.cK);
  K.strich('M36 18 C40 24.4 60 24.4 64 18', K.cD, 1.6);
  K.strich('M14.4 38.6 L24.6 44.4', K.cD, 0.6); K.strich('M85.6 38.6 L75.4 44.4', K.cD, 0.6);
  K.flaeche('M64 28 L71 40 L71 86 C68.6 86.6 66.2 86.9 64 87 Z', '#000', 0.08);
};
Z.Poloshirt = (K) => {
  K.form('M37 17 L50 22 L63 17 L78 24 L88 40 L77 46 L71 40 L71 86 C57 88 43 88 29 86 L29 40 L23 46 L12 40 L22 24 Z');
  K.form('M47.4 22 L52.6 22 L52.6 44 L47.4 44 Z', { farbe: K.cD, muster: false });
  K.kreis(50, 31, 0.9, K.cL); K.kreis(50, 38, 0.9, K.cL);
  K.form('M37 17 L50 22 L44 32 L33 23 Z', { farbe: K.cL }); K.form('M63 17 L50 22 L56 32 L67 23 Z', { farbe: K.c });
  K.form('M12 40 L22 37 L24.6 41.6 L15 46.6 Z', { farbe: K.cD, muster: false }); K.form('M88 40 L78 37 L75.4 41.6 L85 46.6 Z', { farbe: K.cD, muster: false });
};
const HEMD = 'M37 15 L50 20 L63 15 L76 21 L84 34 L89 76 L80 78 L74 46 L72 88 C58 90 42 90 28 88 L26 46 L20 78 L11 76 L16 34 L24 21 Z';
Z.Hemd = (K) => {
  K.form(HEMD);
  K.flaeche('M26 46 L28 34', K.cD);
  K.strich('M26 46 L27.6 30', K.cD, 0.5); K.strich('M74 46 L72.4 30', K.cD, 0.5);
  K.strich('M50 20 L50 89', K.cD, 0.6); K.strich('M52.6 26 L52.6 89', K.cD, 0.4);
  for (const y of [33, 45, 57, 69, 81]) K.kreis(51.3, y, 0.9, K.cK);
  K.strich('M30 36 L42 36 L42 47 L36 49 L30 47 Z', K.cD, 0.5);
  K.form('M38.4 13.4 C44 11.8 56 11.8 61.6 13.4 L63 15 L50 20 L37 15 Z', { farbe: K.cK, muster: false });
  K.form('M37 15 L50 20 L45.6 29.4 L35.4 21.4 Z', { farbe: K.cL }); K.form('M63 15 L50 20 L54.4 29.4 L64.6 21.4 Z', { farbe: K.c });
  K.form('M11 76 L20 78 L19.4 83.6 L10.4 81.6 Z', { farbe: K.cD }); K.form('M89 76 L80 78 L80.6 83.6 L89.6 81.6 Z', { farbe: K.cD });
};
Z.Bluse = (K) => {
  K.form('M38 16 C44 20 56 20 62 16 L76 22 L86 36 L91 68 L82 71 L74 46 L76 86 C59 90.6 41 90.6 24 86 L26 46 L18 71 L9 68 L14 36 L24 22 Z');
  K.form('M9 68 L18 71 C18.6 73 18 75 17 76.6 L8.6 74 C8 72 8.2 70 9 68 Z', { farbe: K.cD }); K.form('M91 68 L82 71 C81.4 73 82 75 83 76.6 L91.4 74 C92 72 91.8 70 91 68 Z', { farbe: K.cD });
  for (const y of [32, 42, 52, 62, 72, 82]) K.kreis(50, y, 0.85, hell(K.c, 0.5), ` stroke="${K.cD}" stroke-width="0.3"`);
  K.strich('M50 24 L50 88', K.cD, 0.4);
  K.form('M38 16 C38 26 46 29.4 50 22.4 C54 29.4 62 26 62 16 C56 20.4 44 20.4 38 16 Z', { farbe: K.cL });
  K.strich('M30 26 C33 40 32 60 30 80', K.cD, 0.4, ' opacity="0.5"'); K.strich('M70 26 C67 40 68 60 70 80', K.cD, 0.4, ' opacity="0.5"');
};
const PULLI = 'M36 16 C40 22 60 22 64 16 L78 22 L86 36 L90 78 L80 80 L73 46 L73 82 L27 82 L27 46 L20 80 L10 78 L14 36 L22 22 Z';
function pulloverGrund(K) {
  K.form(PULLI);
  K.form('M27 82 L73 82 L73 89 C58 90.6 42 90.6 27 89 Z', { farbe: K.cD }); K.rippen(27, 73, 82.6, 89.4, 24, K.cK);
  K.form('M10 78 L20 80 L19.2 87 L9.6 85 Z', { farbe: K.cD }); K.form('M90 78 L80 80 L80.8 87 L90.4 85 Z', { farbe: K.cD });
  K.strich('M27 46 L28 32', K.cD, 0.5); K.strich('M73 46 L72 32', K.cD, 0.5);
}
Z.Kaschmirpullover = (K) => {
  pulloverGrund(K);
  K.flaeche('M38 15 C42 20.6 58 20.6 62 15 C58 13 42 13 38 15 Z', K.cK);
  K.form('M35 15.4 C40 26 60 26 65 15.4 L62 15 C58 21 42 21 38 15 Z', { farbe: K.cD });
};
Z.Strickjacke = (K) => {
  pulloverGrund(K);
  K.flaeche('M39 15.6 L50 50 L61 15.6 C57 13.6 43 13.6 39 15.6 Z', K.cK);
  K.strich('M38.4 15.4 L50 52 L50 89.6', K.cL, 2.6); K.strich('M61.6 15.4 L51.6 48', K.cD, 2.2);
  for (const y of [56, 64, 72, 80]) K.kreis(52.6, y, 1.2, K.cK);
  K.strich('M31 64 L31 75 L43 75 L43 64', K.cD, 0.5); K.flaeche('M31 63.4 L43 63.4 L43 66.6 L31 66.6 Z', K.cD); K.rippen(31, 43, 63.6, 66.4, 8, K.cK);
  K.strich('M57 64 L57 75 L69 75 L69 64', K.cD, 0.5); K.flaeche('M57 63.4 L69 63.4 L69 66.6 L57 66.6 Z', K.cD); K.rippen(57, 69, 63.6, 66.4, 8, K.cK);
};
Z.Kleid = (K) => {
  K.form('M39 12 L44 12 C45.4 18 54.6 18 56 12 L61 12 L63 22 C66 24 66.6 30 64 36 L63.4 43 L79 86 C62 91.4 38 91.4 21 86 L36.6 43 L36 36 C33.4 30 34 24 37 22 Z');
  K.form('M36.4 42 L63.6 42 L63.4 46.4 L36.6 46.4 Z', { farbe: K.cD });
  for (const [a, b] of [[43, 33], [50, 50], [57, 67], [46.6, 41.4], [53.4, 58.6]]) K.strich(`M${a} 47 L${b} 89.4`, K.cD, 0.45, ' opacity="0.55"');
  K.strich('M44 17 C46 24 54 24 56 17', K.cD, 0.5, ' opacity="0.6"');
  K.flaeche('M63.4 46 L79 86 C76 87 73.4 87.6 71 88 Z', '#000', 0.08);
};
Z.Rock = (K) => {
  K.form('M32 26 L68 26 L81 82 C62 88 38 88 19 82 Z');
  K.form('M31.6 17 L68.4 17 L68 26.4 L32 26.4 Z', { farbe: K.cD });
  K.kreis(64, 21.6, 1.2, K.cK);
  for (const [a, b] of [[40, 32], [50, 50], [60, 68], [45, 41], [55, 59]]) K.strich(`M${a} 27 L${b} 86`, K.cD, 0.5, ' opacity="0.5"');
};
const HOSE = 'M30 14 L70 14 L72 40 L76 90 L58 90 L51.2 38 L48.8 38 L42 90 L24 90 L28 40 Z';
function hosenbund(K, schlaufen = true) {
  K.form('M30 14 L70 14 L70.3 21 L29.7 21 Z', { farbe: K.cD });
  if (schlaufen) for (const x of [35, 50, 65]) K.form(`M${x - 1} 13.4 L${x + 1} 13.4 L${x + 1} 22.6 L${x - 1} 22.6 Z`, { farbe: K.cD, sw: 0.4 });
  K.kreis(50, 17.4, 1.1, K.denim ? METALL : K.cK);
}
Z.Chino = (K) => {
  K.form(HOSE); hosenbund(K);
  K.strich('M50 21 C50 29 49.6 33 47.4 36', K.cD, 0.6);
  K.strich('M31 22 C34 25.6 37 27 40 21.6', K.cD, 0.6); K.strich('M69 22 C66 25.6 63 27 60 21.6', K.cD, 0.6);
  K.strich('M37.6 40 L33 89', K.cD, 0.45, ' opacity="0.5"'); K.strich('M62.4 40 L67 89', K.cD, 0.45, ' opacity="0.5"');
  K.strich('M24.2 86.4 L42.4 86.4', K.cD, 0.45); K.strich('M57.6 86.4 L75.8 86.4', K.cD, 0.45);
  K.flaeche('M58 50 L72 40 L76 90 L66 90 Z', '#000', 0.06);
};
Z.Jeans = (K) => {
  K.form('M30 14 L70 14 L72 40 L74.6 90 L57.6 90 L51.2 38 L48.8 38 L42.4 90 L25.4 90 L28 40 Z'); hosenbund(K);
  K.naht('M50 21 C50.4 29 50 33 47.6 36.4'); K.naht('M48 21 C48.4 28 48 31 46.2 33.6');
  K.naht('M31 22 C33 29 37 31 41.4 21.6'); K.naht('M69 22 C67 29 63 31 58.6 21.6');
  K.naht('M28.6 40 L26 89'); K.naht('M71.4 40 L74 89'); K.naht('M25.4 87 L42.6 87'); K.naht('M57.4 87 L74.8 87');
  K.kreis(31.6, 23, 0.8, METALL); K.kreis(68.4, 23, 0.8, METALL);
  K.flaeche('M57.6 50 L72 40 L74.6 90 L66 90 Z', '#000', 0.07);
  K.strich('M36 50 C39 51 41 50 43 48 M35.6 56 C38 57 40.6 56 42.6 54', '#fff', 0.7, ' opacity="0.25"');
};
Z['Jeans-Shorts'] = (K) => {
  K.form('M28 16 L72 16 L74 38 L79 64 L57 68.6 L51.2 44 L48.8 44 L43 68.6 L21 64 L26 38 Z');
  K.form('M28 16 L72 16 L72.3 23 L27.7 23 Z', { farbe: K.cD });
  for (const x of [34, 50, 66]) K.form(`M${x - 1} 15.4 L${x + 1} 15.4 L${x + 1} 24.6 L${x - 1} 24.6 Z`, { farbe: K.cD, sw: 0.4 });
  K.kreis(50, 19.4, 1.1, K.denim ? METALL : K.cK);
  K.naht('M50 23 C50.4 31 50 35 47.6 38.4'); K.naht('M29 24 C31 31 35 33 39.4 23.6'); K.naht('M71 24 C69 31 65 33 60.6 23.6');
  K.form('M21 64 L43 68.6 L42.4 73 L20.4 68.6 Z', { farbe: K.cL }); K.form('M57 68.6 L79 64 L79.6 68.6 L57.6 73 Z', { farbe: K.cL });
  for (let i = 0; i < 9; i++) { K.strich(`M${21 + i * 2.4} ${68.6 + i * 0.49} l0.2 2.4`, hell(K.c, 0.6), 0.45); K.strich(`M${58 + i * 2.4} ${73 - i * 0.49} l-0.2 2.4`, hell(K.c, 0.6), 0.45); }
};
Z.Mantel = (K) => {
  K.form('M36 10 L50 18 L64 10 L76 16 L84 32 L88 84 L79 85.4 L74 46 L76 92 L24 92 L26 46 L21 85.4 L12 84 L16 32 L24 16 Z');
  K.strich('M56.4 44 L56.4 92', K.cK, 0.7);
  K.form('M36 10 L44.6 31 L40.4 33.4 L50 46 L50 18 Z', { farbe: K.cL }); K.form('M64 10 L55.4 31 L59.6 33.4 L50 46 L50 18 Z', { farbe: K.c });
  K.form('M26 57 L74 57 L74.2 62.6 L25.8 62.6 Z', { farbe: K.cD }); K.form('M44 56 L52 56 L52 63.6 L44 63.6 Z', { farbe: 'none', linie: METALL_D, sw: 1.2, muster: false, licht: false, glanz: false });
  for (const [x, y] of [[46, 50], [60, 50], [46, 70], [60, 70]]) K.kreis(x, y, 1.4, K.cK);
  K.strich('M30 72 L40 72', K.cK, 0.8); K.strich('M64 72 L72 72', K.cK, 0.8);
  K.form('M12 84 L21 85.4 L20.6 88.6 L11.6 87.2 Z', { farbe: K.cD }); K.form('M88 84 L79 85.4 L79.4 88.6 L88.4 87.2 Z', { farbe: K.cD });
};
Z.Blazer = (K) => {
  K.form('M36 12 L50 20 L64 12 L76 18 L84 34 L88 80 L79 81.4 L74 46 L75 84 C66 86 58 86 50 82 C42 86 34 86 25 84 L26 46 L21 81.4 L12 80 L16 34 L24 18 Z');
  K.flaeche('M44 13 L50 20 L56 13 C54 12 46 12 44 13 Z', K.cK);
  K.form('M36 12 L44 32 L40 34.6 L50 56 L50 20 Z', { farbe: K.cL }); K.form('M64 12 L56 32 L60 34.6 L50 56 L50 20 Z', { farbe: K.c });
  K.strich('M50 56 L50 82', K.cK, 0.6);
  K.kreis(52.4, 62, 1.3, K.cK); K.kreis(52.4, 71, 1.3, K.cK);
  K.form('M29 66 L41 65 L41.4 68 L29.4 69 Z', { farbe: K.cD }); K.form('M59 65 L71 66 L70.6 69 L58.6 68 Z', { farbe: K.cD });
  K.strich('M61 40 L69 39.4', K.cK, 0.8);
};
Z.Steppjacke = (K) => {
  const D = 'M34 13 L66 13 L78 20 L86 34 L90 80 L80 82 L74 46 L74 86 C58 89 42 89 26 86 L26 46 L20 82 L10 80 L14 34 L22 20 Z';
  K.form(D);
  K.defs.push(`<clipPath id="${K.id}c"><path d="${D}"/></clipPath>`);
  K.teile.push(`<g clip-path="url(#${K.id}c)">`);
  for (let y = 22; y < 90; y += 9) { K.flaeche(`M0 ${y} H100 V${y + 3.2} H0 Z`, '#fff', 0.13); K.strich(`M0 ${y + 8.6} H100`, K.cK, 0.7); }
  K.teile.push('</g>');
  K.strich('M26 46 L27.4 30', K.cK, 0.6); K.strich('M74 46 L72.6 30', K.cK, 0.6);
  K.form('M33.6 7.6 C42 6 58 6 66.4 7.6 L66 16 C58 17.6 42 17.6 34 16 Z', { farbe: K.cD });
  K.strich('M50 8 L50 87', '#9aa3ab', 1.4); K.strich('M50 8 L50 87', '#5c656d', 0.5, ' stroke-dasharray="0.6 0.6"');
  K.form('M48.8 18 L51.2 18 L51.6 25 L48.4 25 Z', { farbe: SILBER, muster: false, licht: false, linie: '#6d757d', sw: 0.4 });
};
const SNEAKER_OBEN = 'M12 66 C12 56 20 52 30 50 L44 44 C48 40 52 38 56 36 L70 32 C76 31 80 34 82 40 L86 60 L86 68 L12 70 Z';
Z.Sneaker = (K) => {
  K.form('M7.6 68 L90.4 65.6 C91.4 71.6 89.4 76 84 77 L16 78.4 C9.6 78.4 6.8 74 7.6 68 Z', { farbe: '#f6f6f3', linie: '#a8aaa8', muster: false, glanz: false });
  K.strich('M9 72.6 L90.6 70.6', '#c9cac6', 0.8);
  K.form(SNEAKER_OBEN);
  K.form('M12 66 C12 58 18 54 26 52 L28.4 68.6 Z', { farbe: K.cL, sw: 0.5 });
  K.form('M76 33.4 C80 33.8 82 38 83 42 L86 60 L86 67.4 L73.6 67.6 C76 56 76.6 44 76 33.4 Z', { farbe: K.cD, sw: 0.5 });
  const kontrast = helligkeit(K.c) > 0.7 ? '#c9ced3' : hell(K.c, 0.75);
  K.form('M38 62 C50 54 60 48 70.6 45.6 L72.4 51.4 C62 53.6 52 59 42.6 65.6 Z', { farbe: kontrast, muster: false, sw: 0.4 });
  K.form('M55 36.4 C56 30.4 62 27.4 67.4 29.6 L69.4 33.6 Z', { farbe: K.cD, sw: 0.5 });
  for (let i = 0; i < 5; i++) { const x = 42 + i * 4.6, y = 46.4 - i * 2.4; K.strich(`M${x - 1.6} ${y - 2.6} L${x + 1.8} ${y + 2.2}`, '#ffffff', 1.1); K.kreis(x - 1.8, y - 2.8, 0.55, K.cK); K.kreis(x + 2, y + 2.4, 0.55, K.cK); }
  if (!K.leder) K.naht('M14 64 C30 62 60 62 85 61');
};
Z.Pumps = (K) => {
  K.form('M73.6 53 L82.4 53 L81.2 88 L78.4 88 C78.2 74 77 62 73.6 53 Z', { farbe: K.cD });
  K.form('M8 76 C8 70.4 14 67.4 24 66.4 C34 65.4 42 62 50 57 C58 52 66 46.4 74 44.6 L82 44 C84.4 46 84.4 52 82.4 56 C76.4 56 72 58.4 66 62.4 C58 68 48 74 36 77 C26 79.4 12 80 8 76 Z');
  K.flaeche('M33 65 C43 62.6 51 57.6 59 52.6 C65 48.6 72 46.4 80.4 46.4 C74 50 66 55 58 60 C50 64.6 42 66.6 33 65 Z', K.cK);
  K.strich('M8.6 76.6 C14 80 26 79.4 36 77 C48 74 58 68 66 62.4 C72 58.4 76.4 56 82.4 56', '#1d1d1d', 1);
  K.strich('M14 71 C24 69 34 68 44 64', '#fff', 1.2, ' opacity="0.4"');
};
Z.Stiefel = (K) => {
  K.form('M44 10 L72 10 L73.6 54 C74 60 76 64 80 66 C86 68 90 72 90 78 L90 82 L18 82 C16 76 20 70 30 68 C38 66 42 62 43.6 56 Z');
  K.form('M18 82 L90 82 L90 87 L18 87 Z', { farbe: '#3a2a20', muster: false, glanz: false, linie: '#1f1712' });
  K.form('M74 86.6 L90 86.6 L90 91 L76 91 Z', { farbe: '#2b1f17', muster: false, glanz: false, linie: '#1f1712' });
  K.form('M44 10 L72 10 L72.2 15.4 L43.8 15.4 Z', { farbe: K.cD });
  K.strich('M68.6 16 L70.4 60', K.cK, 0.9); K.form('M68.2 18 L70.6 18 L70.6 22.6 L68.2 22.6 Z', { farbe: SILBER, muster: false, licht: false, linie: '#6d757d', sw: 0.3 });
  K.naht('M21 79 C36 78.6 70 78.6 88.6 78.6');
  K.strich('M50 20 C49 34 49 46 48 58', '#fff', 1.6, ' opacity="0.25"');
};
Z.Pyjama = (K) => {
  const pas = helligkeit(K.c) > 0.6 ? '#2a3a5e' : '#f4f2ec';
  K.gruppe('translate(36 34) scale(0.6)', () => { K.form(HOSE); K.form('M30 14 L70 14 L70.3 21 L29.7 21 Z', { farbe: K.cD }); K.strich('M28 40 L24 90', pas, 1.2); K.strich('M72 40 L76 90', pas, 1.2); });
  K.gruppe('translate(2 6) scale(0.7)', () => {
    K.form(HEMD);
    K.strich('M37 15 L50 20 L63 15', pas, 1.4); K.strich('M50 20 L50 89', pas, 1.2); K.strich('M30 36 L42 36', pas, 1.2);
    for (const y of [33, 47, 61, 75]) K.kreis(52.4, y, 1.2, pas);
    K.form('M37 15 L50 20 L45.6 29.4 L35.4 21.4 Z', { farbe: K.cL, linie: pas, sw: 1.2 }); K.form('M63 15 L50 20 L54.4 29.4 L64.6 21.4 Z', { farbe: K.c, linie: pas, sw: 1.2 });
    K.strich('M11 76 L20 78', pas, 1.4); K.strich('M89 76 L80 78', pas, 1.4);
  });
};
Z['Unterwäsche'] = (K) => {
  K.form('M18 30 L82 30 C80 44 70 56 61 72 L39 72 C30 56 20 44 18 30 Z');
  const band = helligkeit(K.c) > 0.6 ? '#3a4150' : '#eceae4';
  K.form('M17 22 L83 22 L82.4 31 L17.6 31 Z', { farbe: band, muster: false });
  K.strich('M17.4 25 L82.6 25 M17.4 28 L82.6 28', helligkeit(band) > 0.5 ? '#c4c1ba' : '#262a33', 0.5);
  K.strich('M39 72 L61 72', K.cK, 1.2); K.strich('M23 42 C30 46 34 54 38 66', K.cD, 0.6); K.strich('M77 42 C70 46 66 54 62 66', K.cD, 0.6);
  K.strich('M45 32 C47 44 47 52 46 60', '#fff', 1.6, ' opacity="0.16"');
};
Z.BH = (K) => {
  K.strich('M23 36 L30 12', K.cD, 1.6); K.strich('M77 36 L70 12', K.cD, 1.6);
  K.form('M12 54 C26 64 40 64 50 57 C60 64 74 64 88 54 L89.4 61 C74 71 60 71 50 64.6 C40 71 26 71 10.6 61 Z', { farbe: K.cD });
  K.form('M19 35 C21 52 30 62 44.6 60 L48.6 41.6 C40 35 30 31 19 35 Z');
  K.form('M81 35 C79 52 70 62 55.4 60 L51.4 41.6 C60 35 70 31 81 35 Z');
  for (let i = 0; i <= 8; i++) { const t = i / 8; K.kreis((19 + t * 29.6).toFixed(1), (35 - Math.sin(t * Math.PI) * 3.4 + t * 6.6).toFixed(1), 1.1, hell(K.c, 0.45)); K.kreis((81 - t * 29.6).toFixed(1), (35 - Math.sin(t * Math.PI) * 3.4 + t * 6.6).toFixed(1), 1.1, hell(K.c, 0.45)); }
  K.kreis(50, 50, 1.6, hell(K.c, 0.5));
};
Z.Socken = (K) => {
  const ferse = helligkeit(K.c) > 0.6 ? dunkel(K.c, 0.35) : hell(K.c, 0.55);
  const socke = (tr, fv) => K.gruppe(tr, () => {
    K.form('M36 10 L58 10 L58 52 C58 56 60 58 64 60 L80 68 C88 72 88 84 80 88 C76 90 72 90 66 88 L40 76 C34 72 34 66 34.6 60 Z', { farbe: fv });
    K.form('M36 10 L58 10 L58 21 L35.6 21 Z', { farbe: dunkel(fv, 0.12) }); K.rippen(36, 58, 10.4, 20.6, 12, dunkel(fv, 0.3));
    K.form('M34.6 62 C34 70 38 74 45 77 L49.6 66.6 C43 64.6 38.6 63 34.6 62 Z', { farbe: ferse });
    K.form('M74 65.4 C84 69 89 80 80 88 C76 90 72 90 68 89 C74 82 76.6 74 74 65.4 Z', { farbe: ferse });
  });
  socke('translate(-12 4)', K.cD);
  socke('translate(6 0)', K.c);
};
Z.Schal = (K) => {
  const streifen = hell(K.c, 0.3);
  K.form('M54 30 C62 40 66 56 68 82 L80 80 C78 56 72 38 62 26 Z', { farbe: K.cD });
  K.form('M30 10 C40 6 60 6 70 10 L72 22 C62 28 56 36 54 46 L58 86 L44 88 L40 48 C38 40 34 30 28 22 Z');
  K.form('M44.6 72 L57.4 70.6 L57.8 74.6 L45 76 Z', { farbe: streifen, sw: 0.3 }); K.form('M68.8 66 L79 64.6 L79.4 68.6 L69.2 70 Z', { farbe: dunkel(streifen, 0.15), sw: 0.3 });
  for (let i = 0; i <= 7; i++) { K.strich(`M${44 + i * 2} ${88 - i * 0.28} l0.2 4.4`, K.cD, 0.8); K.strich(`M${68 + i * 1.7} ${82 - i * 0.28} l0.2 4.4`, K.cK, 0.8); }
  K.strich('M32 14 C44 18 56 18 68 14', K.cD, 0.6, ' opacity="0.6"');
};
Z['Mütze'] = (K) => {
  K.form('M22 64 C20 36 34 22 50 22 C66 22 80 36 78 64 Z');
  K.form('M19.6 60 L80.4 60 C81.4 68 81.4 76 80.4 83 L19.6 83 C18.6 76 18.6 68 19.6 60 Z', { farbe: K.cD }); K.rippen(19.6, 80.4, 60.6, 82.4, 22, K.cK);
  const pp = helligkeit(K.c) > 0.7 ? '#e6e2da' : hell(K.c, 0.25);
  K.form('M50 7 C57 7 61 12 60.6 18 C60.4 24 55.4 27.4 50 27.4 C44.6 27.4 39.6 24 39.4 18 C39 12 43 7 50 7 Z', { farbe: pp, muster: false });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; K.strich(`M${(50 + Math.cos(a) * 6).toFixed(1)} ${(17.4 + Math.sin(a) * 5.6).toFixed(1)} l${(Math.cos(a) * 3).toFixed(1)} ${(Math.sin(a) * 3).toFixed(1)}`, dunkel(pp, 0.15), 0.5); }
};
Z.Handtasche = (K) => {
  K.strich('M33 42 C33 14 67 14 67 42', K.cK, 6.4); K.strich('M33 42 C33 14 67 14 67 42', K.cD, 4.4);
  K.form('M20 40 L80 40 L86 86 C62 90 38 90 14 86 Z');
  K.form('M19.4 39 L80.6 39 L79 60 C62 66.4 38 66.4 21 60 Z', { farbe: K.cD });
  K.naht('M22.6 42 L77.4 42 L76.2 57.6 C62 63 38 63 23.8 57.6 Z');
  K.form('M45.6 59 L54.4 59 L54.4 66 L45.6 66 Z', { farbe: METALL, muster: false, linie: METALL_D, sw: 0.5 });
  K.kreis(33, 41.4, 1.6, METALL); K.kreis(67, 41.4, 1.6, METALL);
};
Z['Gürtel'] = (K) => {
  K.form('M24 60 L84 40 C88 38.6 91 42 89.4 46 L88.6 47.6 L27.4 69 Z');
  K.naht('M26 61.6 L85.4 41.8'); K.naht('M27.6 66.8 L87.6 45.6');
  for (const t of [0.62, 0.7, 0.78, 0.86]) K.kreis((26 + t * 62).toFixed(1), (64.4 - t * 21).toFixed(1), 0.9, '#1f1712');
  K.form('M33 54 L38.6 52 L42 63 L36.4 65 Z', { farbe: K.cD, sw: 0.4 });
  K.strich('M9 50 L26 44.6 L31.6 63 L14.6 68.6 Z', SILBER, 3.4); K.strich('M9 50 L26 44.6 L31.6 63 L14.6 68.6 Z', '#7c858d', 0.6);
  K.strich('M20 56.6 L31 53', '#9aa3ab', 1.8);
};
Z['Bettwäsche'] = (K) => {
  const block = (y, h, f) => {
    K.form(`M14 ${y} L86 ${y} L86 ${y + h} L14 ${y + h} Z`, { farbe: f });
    K.form(`M14 ${y} L24 ${y - 8} L94 ${y - 8} L86 ${y} Z`, { farbe: hell(f, 0.12) });
    K.form(`M86 ${y} L94 ${y - 8} L94 ${y + h - 8} L86 ${y + h} Z`, { farbe: dunkel(f, 0.18) });
    K.strich(`M14 ${y + h / 2} L86 ${y + h / 2}`, dunkel(f, 0.22), 0.6);
  };
  block(64, 20, K.cD);
  block(46, 18, K.c);
  K.form('M26 24 C34 20 70 20 80 24 C84 30 84 36 80 40 C70 44 34 44 26 40 C22 36 22 30 26 24 Z', { farbe: K.cL });
  K.strich('M29 27 C40 25 66 25 77 27', '#fff', 0.8, ' opacity="0.4"');
  K.strich('M28 37.6 C40 40 66 40 78 37.6', dunkel(K.c, 0.25), 0.6);
};
Z.Handtuch = (K) => {
  const band = helligkeit(K.c) > 0.7 ? dunkel(K.c, 0.18) : hell(K.c, 0.5);
  const lage = (y, f) => {
    K.form(`M16 ${y} L78 ${y} C84 ${y} 86 ${y + 3} 86 ${y + 8} C86 ${y + 13} 84 ${y + 16} 78 ${y + 16} L16 ${y + 16} Z`, { farbe: f });
    K.form(`M16 ${y} L26 ${y - 8} L86 ${y - 8} C90 ${y - 8} 92 ${y - 5} 90 ${y - 1} L86 ${y + 2} C84 ${y} 82 ${y} 78 ${y} Z`, { farbe: hell(f, 0.12) });
    K.flaeche(`M58 ${y + 0.3} L64 ${y + 0.3} L64 ${y + 15.7} L58 ${y + 15.7} Z`, band);
    K.flaeche(`M66 ${y + 0.3} L68 ${y + 0.3} L68 ${y + 15.7} L66 ${y + 15.7} Z`, band);
  };
  lage(70, K.cD); lage(52, K.c); lage(34, K.cL);
};
Z.Kissen = (K) => {
  K.defs.push(`<radialGradient id="${K.id}p" cx="0.42" cy="0.42" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/></radialGradient>`);
  const D = 'M16 20 C34 25 66 25 84 20 C79 38 79 62 84 80 C66 75 34 75 16 80 C21 62 21 38 16 20 Z';
  K.form(D, { linie: K.cK, sw: 1.4 });
  K.flaeche(D, `url(#${K.id}p)`);
  K.strich('M50 50 L28 30 M50 50 L72 30 M50 50 L28 70 M50 50 L72 70', K.cD, 0.6, ' opacity="0.6"');
  K.kreis(50, 50, 2.6, K.cD); K.kreis(49.4, 49.4, 1, K.cL);
};
Z.Tasse = (K) => {
  K.form('M66 40 C82 37 87 56 72.6 66 L64.6 68.4 L65.4 62 C76 56.4 76.4 45.6 66.6 47 Z', { farbe: K.cD });
  K.form('M24 30 L68 30 L64.4 82 C64.2 86 60.4 88.4 56 88.4 L36 88.4 C31.6 88.4 27.8 86 27.6 82 Z');
  K.teile.push(`<ellipse cx="46" cy="30" rx="22" ry="6.2" fill="${K.cL}" stroke="${K.linie}" stroke-width="0.7"/>`, `<ellipse cx="46" cy="30.6" rx="19" ry="4.6" fill="${K.cK}"/>`);
  K.flaeche('M31 36 L35 36 L35.6 80 L32 80 Z', '#fff', 0.35);
};
Z.Vase = (K) => {
  K.form('M40.4 12 L59.6 12 L57.6 23 C74 34 78 60 66 82 C62 89 38 89 34 82 C22 60 26 34 42.4 23 Z');
  K.teile.push(`<ellipse cx="50" cy="12" rx="9.6" ry="2.6" fill="${K.cK}" stroke="${K.linie}" stroke-width="0.6"/>`);
  K.flaeche('M35 44 C33 54 34 66 38 74 L40.6 73 C37.6 64 37 54 38.4 45 Z', '#fff', 0.38);
  K.strich('M36 70 C44 72 56 72 64 70', K.cD, 0.6, ' opacity="0.5"');
};
Z.Lippenstift = (K) => {
  K.form('M58 34 L78 34 L78 90 L58 90 Z', { farbe: '#26282c', linie: '#111', muster: false });
  K.flaeche('M58 80 L78 80 L78 84 L58 84 Z', METALL);
  K.form('M33 52 L33 33 C36 28 42 25 47 24 L47 52 Z', { linie: dunkel(K.c, 0.5) });
  K.flaeche('M35 34 L37 31 L37 51 L35 51 Z', '#fff', 0.35);
  K.form('M30 50 L50 50 L50 58 L30 58 Z', { farbe: METALL, muster: false, linie: METALL_D });
  K.form('M30 58 L50 58 L50 90 L30 90 Z', { farbe: '#26282c', linie: '#111', muster: false });
  K.flaeche('M30 64 L50 64 L50 67 L30 67 Z', K.c);
  K.flaeche('M32 60 L34.4 60 L34.4 88 L32 88 Z', '#fff', 0.22); K.flaeche('M60 36 L62.4 36 L62.4 88 L60 88 Z', '#fff', 0.2);
};
Z.Creme = (K) => {
  K.form('M20 50 L80 50 L78 84 C78 88 74 90 70 90 L30 90 C26 90 22 88 22 84 Z');
  K.form('M17.4 36 L82.6 36 L82.6 50 L17.4 50 Z', { farbe: '#f3f1ec', linie: '#a9a6a0' });
  K.teile.push(`<ellipse cx="50" cy="36" rx="32.6" ry="4.6" fill="#ffffff" stroke="#a9a6a0" stroke-width="0.6"/>`);
  K.rippen(17.4, 82.6, 39, 49, 26, '#d6d3cc');
  K.flaeche('M32 62 L68 62 L68 78 L32 78 Z', '#ffffff', 0.9);
  K.strich('M37 67 L63 67', K.cK, 1.6); K.strich('M40 72.4 L60 72.4', '#9a9ea3', 0.8);
  K.flaeche('M24 54 L27.6 54 L27 84 L24.6 84 Z', '#fff', 0.35);
};
Z.Parfum = (K) => {
  K.form('M24 40 L76 40 C80 40 82 42 82 46 L82 86 C82 90 80 92 76 92 L24 92 C20 92 18 90 18 86 L18 46 C18 42 20 40 24 40 Z', { farbe: hell(K.c, 0.55), linie: dunkel(K.c, 0.35) });
  K.form('M22 54 L78 54 L78 85 C78 87.6 76.6 88.4 74 88.4 L26 88.4 C23.4 88.4 22 87.6 22 85 Z', { farbe: K.c, linie: dunkel(K.c, 0.2), sw: 0.4 });
  K.form('M42 31 L58 31 L58 40 L42 40 Z', { farbe: METALL, muster: false, linie: METALL_D });
  K.form('M35 8 L65 8 L65 31 L35 31 Z', { farbe: '#2b2d31', linie: '#111', muster: false });
  K.flaeche('M37 10 L40 10 L40 29 L37 29 Z', '#fff', 0.25);
  K.flaeche('M36 62 L64 62 L64 76 L36 76 Z', '#f8f6f1', 0.92); K.strich('M41 67 L59 67', '#2b2d31', 1.4); K.strich('M44 71.4 L56 71.4', '#9a9ea3', 0.7);
  K.flaeche('M23 44 L27 44 L27 86 L23 86 Z', '#fff', 0.4);
};
Z.Kinderbody = (K) => {
  K.form('M31 14 C37 20.4 63 20.4 69 14 L82 20 L88 34 L78 40 L72 34 L72 62 C72 72 63 79 59.6 86 L40.4 86 C37 79 28 72 28 62 L28 34 L22 40 L12 34 L18 20 Z');
  K.strich('M31 14 C37 22 63 22 69 14', K.cD, 1.8); K.strich('M31 14 C34 19 37 21 40 22', K.cK, 0.6); K.strich('M69 14 C66 19 63 21 60 22', K.cK, 0.6);
  K.form('M40.4 86 L59.6 86 L59.4 90 L40.6 90 Z', { farbe: K.cD });
  for (const x of [44, 50, 56]) K.kreis(x, 88, 1, '#d8dde2', ` stroke="${K.cK}" stroke-width="0.3"`);
  K.strich('M13.6 37 L23 42 M86.4 37 L77 42', K.cD, 1.6);
  if (helligkeit(K.c) > 0.3) K.form('M44 44 C44 40 47 39 50 42 C53 39 56 40 56 44 C56 48 50 52 50 52 C50 52 44 48 44 44 Z', { farbe: hell(K.c, 0.6), muster: false, sw: 0.4 });
};
Z.Kinderkleid = (K) => {
  K.form('M38 16 C42 20 58 20 62 16 L66 21 L64 40 L81 84 C62 90.4 38 90.4 19 84 L36 40 L34 21 Z');
  K.form('M34.4 18 C26 16 21 22 22.4 28 C23.4 32 28 33 34.6 30 Z', { farbe: K.cL }); K.form('M65.6 18 C74 16 79 22 77.6 28 C76.6 32 72 33 65.4 30 Z', { farbe: K.c });
  K.form('M38 16.4 C38.6 24 48 25 50 19.6 C52 25 61.4 24 62 16.4 C57 19.6 43 19.6 38 16.4 Z', { farbe: '#f8f6f1', muster: false });
  const sch = helligkeit(K.c) > 0.6 ? dunkel(K.c, 0.3) : '#f8f6f1';
  K.form('M35.6 39 L64.4 39 L64.8 44 L35.2 44 Z', { farbe: sch, muster: false });
  K.form('M50 41.6 L42 37 L42 47 Z', { farbe: sch, muster: false, sw: 0.4 }); K.form('M50 41.6 L58 37 L58 47 Z', { farbe: sch, muster: false, sw: 0.4 });
  for (const [a, b] of [[43, 30], [50, 50], [57, 70]]) K.strich(`M${a} 45 L${b} 88`, K.cD, 0.5, ' opacity="0.5"');
  K.strich('M20.4 82 C38 87 62 87 79.6 82', '#f8f6f1', 1.4);
};
Z['Plüschtier'] = (K) => {
  const hellT = hell(K.c, 0.45);
  for (const [x, y, rx, ry, rot] of [[30, 64, 7, 11, 30], [70, 64, 7, 11, -30], [38, 86, 9, 7, 0], [62, 86, 9, 7, 0]]) {
    K.teile.push(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="${K.cD}" stroke="${K.linie}" stroke-width="0.6"/>`);
  }
  K.teile.push(`<ellipse cx="38" cy="88" rx="5" ry="3.6" fill="${hellT}"/><ellipse cx="62" cy="88" rx="5" ry="3.6" fill="${hellT}"/>`);
  K.form('M50 50 C63 50 70 60 70 70 C70 82 62 88 50 88 C38 88 30 82 30 70 C30 60 37 50 50 50 Z');
  K.teile.push(`<ellipse cx="50" cy="72" rx="10" ry="11" fill="${hellT}" opacity="0.8"/>`);
  for (const x of [33, 67]) { K.kreis(x, 20, 8, K.cD, ` stroke="${K.linie}" stroke-width="0.6"`); K.kreis(x, 20, 4.4, hellT); }
  K.form('M50 14 C61 14 68 22 68 32 C68 42 60 50 50 50 C40 50 32 42 32 32 C32 22 39 14 50 14 Z');
  K.teile.push(`<ellipse cx="50" cy="38" rx="8" ry="6" fill="${hellT}"/>`);
  K.teile.push(`<ellipse cx="50" cy="35.4" rx="3" ry="2.2" fill="#2a1d18"/>`);
  K.strich('M50 37.6 L50 40.6 M47.6 41.6 C48.6 42.6 51.4 42.6 52.4 41.6', '#2a1d18', 0.7);
  K.kreis(43, 29.6, 1.6, '#1d1716'); K.kreis(57, 29.6, 1.6, '#1d1716'); K.kreis(42.6, 29, 0.5, '#fff'); K.kreis(56.6, 29, 0.5, '#fff');
  const schleife = helligkeit(K.c) > 0.5 ? '#c8372f' : '#f2cf4a';
  K.teile.push(`<path d="M50 51 L41 46 L41 56 Z M50 51 L59 46 L59 56 Z" fill="${schleife}" stroke="${dunkel(schleife, 0.3)}" stroke-width="0.5"/>`); K.kreis(50, 51, 2, dunkel(schleife, 0.15));
};
function paket(K) {
  K.form('M20 38 L50 26 L80 38 L80 74 L50 88 L20 74 Z', { farbe: K.c });
  K.form('M20 38 L50 50 L80 38 L50 26 Z', { farbe: K.cL }); K.form('M50 50 L80 38 L80 74 L50 88 Z', { farbe: K.cD });
  K.strich('M35 32 L65 44 L65 58', '#f1ebdc', 2.4);
}

/** Für Schnittvarianten wird die entsprechende Grundsilhouette eingesetzt.
 * Die Artikelnamen, Materialien, Farben und Preise bleiben eigenständig. */
const bildVorlage = (t) => {
  if (TYPEN[t]) return t;
  if (/Kleid|Tüllrock|Plisseerock|Bleistiftrock/.test(t)) return /rock/i.test(t) ? 'Rock' : 'Kleid';
  if (/Jeans|Leggings|Hose|Culotte|Bermuda|Shorts/.test(t)) return /Jeans/.test(t) ? 'Jeans' : 'Chino';
  if (/Hemd|Bluse|Tunika/.test(t)) return /Hemd/.test(t) ? 'Hemd' : 'Bluse';
  if (/Jacke|Mantel|Trenchcoat|Regenjacke|Blazer|Sakko/.test(t)) return /Blazer|Sakko/.test(t) ? 'Blazer' : 'Steppjacke';
  if (/Pullover|Cardigan|Sweatshirt|Rollkragen/.test(t)) return 'Strickjacke';
  if (/Shirt|Polo/.test(t)) return 'T-Shirt';
  if (/Schuh|Boot|Stiefel|Loafer|Ballerina|Sandale|Slipper|Espadrille|Sneaker/.test(t)) return 'Sneaker';
  if (/Tasche|Rucksack|Shopper|Clutch|Weekender|Portemonnaie|Kartenetui/.test(t)) return 'Handtasche';
  if (/Handschuh|Krawatte|Tuch|Hut/.test(t)) return 'Schal';
  if (/Bett|Decke|Laken|Kopfkissen|Tischdecke/.test(t)) return 'Bettwäsche';
  if (/Tuch|Serviette|Vorleger|Lappen|Schürze|Tischläufer|Tischset/.test(t)) return 'Handtuch';
  if (/Schale|Schüssel|Becher|Dose|Topf/.test(t)) return 'Tasse';
  if (/Korb|Tablett|Kerzenhalter/.test(t)) return 'Vase';
  if (/Lippen|Mascara|Concealer|Rouge|Lidschatten|Nagellack/.test(t)) return 'Lippenstift';
  if (/Creme|Serum|Gel|Lotion/.test(t)) return 'Creme';
  if (/Parfum|Toilette/.test(t)) return 'Parfum';
  return 'T-Shirt';
};

// ─────────────────────────────────────────── Öffentliche Funktionen
// Q25: Produktbilder kommen aus der Silhouetten-Bibliothek (kit/mode). opt.bild überschreibt die Zuordnung über den Namen.
export function produktbildSVG(artikeltyp, farbe, material, groesse = 160, opt = {}) {
  return produktSVG(opt.bild ?? bildFuer(artikeltyp), farbe ?? undefined, material ?? undefined, groesse, opt);
}

// Q25: Model, das den Artikel trägt (Detailansicht). null bei Artikeln ohne Platz am Model (Home, Beauty, Spielwaren).
// opt: { geschlecht: 'damen'|'herren', zielgruppe: 'kinder'|'teens'|'young'|'adults'|'bestager', groesse, bild, hintergrund }
export function modelbildSVG(artikeltyp, farbe, material, opt = {}) {
  return modelFuerProdukt(opt.bild ?? bildFuer(artikeltyp), farbe ?? undefined, material ?? undefined, opt);
}

// Bisherige Zeichner, weiter genutzt für Schuhe, Taschen, Wäsche, Beauty und Spielwaren (zeichner 'alt:' in silhouetten.js)
export function altbildSVG(artikeltyp, farbe, material, groesse = 160, opt = {}) {
  const typ = bildVorlage(artikeltyp);
  const c = produktFarbe(farbe) ?? produktFarbe(STANDARD_FARBE[typ]) ?? '#b8864e';
  const mat = material ?? STANDARD_MATERIAL[typ] ?? 'Baumwolle';
  const K = kontext(c, mat, typ);
  if (typ) Z[typ](K); else paket(K);
  if (K.bio && typ) {
    K.teile.push(`<g transform="translate(84 12)"><circle r="7" fill="#e8f2df" stroke="#5c8a3e" stroke-width="0.8"/><path d="M-3.4 3 C-3.6 -2.6 0.4 -4.4 4 -4 C4.4 0 2.4 3.6 -3.4 3 Z" fill="#6ea04a"/><path d="M-3.4 3 L1.6 -1.6" stroke="#e8f2df" stroke-width="0.6"/></g>`);
  }
  const hg = opt.hintergrund ? `<rect width="100" height="100" fill="${opt.hintergrund}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${groesse}" height="${groesse}"><defs>${K.defs.join('')}</defs>${hg}${K.teile.join('')}</svg>`;
}

export function typKachelSVG(artikeltyp, groesse = 120) {
  const innen = produktbildSVG(artikeltyp, STANDARD_FARBE[artikeltyp], STANDARD_MATERIAL[artikeltyp], 100)
    .replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${groesse}" height="${groesse}"><rect x="1" y="1" width="98" height="98" rx="9" fill="#5a8396" stroke="#a9c7d4" stroke-width="1.6"/><g transform="translate(14 8) scale(0.72)">${innen}</g></svg>`;
}

// Porträts im Stil Coffee Inc 2: flache Brustbilder ohne Gesichtszüge, Kopf in Dreiviertelansicht nach links,
// Licht von links (linke Körperseite heller, rechte dunkler). Reine Funktionen, kein DOM, kein three.js.
//
// portraetSVG(merkmale, groesse = 128, opt = { hintergrund: '#hex' | null }) → SVG-String (viewBox 0 0 100 100)
// zufallsMerkmale(seed) → Merkmale, deterministisch
// Merkmale: { geschlecht 'w'|'m', haar, haarfarbe, brille, kleidungFarbe, hautton 0..5|Name, alter, kleidung?, bart? }
// Alle Personen sind fiktiv. Unbekannte Werte fallen still auf einen Standard zurück.

export const HAUTTOENE = {
  hell: ['#f8d6c8', '#e9bcab'], rosig: ['#f3c6a6', '#e0aa88'], mittel: ['#f2bf8a', '#dca06d'],
  oliv: ['#d39a68', '#bb8150'], braun: ['#a8643c', '#8c4f2c'], dunkel: ['#70412a', '#5a321f'],
};
const HAUT_NAMEN = Object.keys(HAUTTOENE);

export const HAARFARBEN = {
  schwarz: '#1d1a1a', dunkelbraun: '#3a241c', braun: '#6b3a1a', hellbraun: '#9a683a',
  blond: '#dcb35e', rot: '#c25a26', grau: '#9a9895', 'weiß': '#e4e1db',
};

export const KLEIDUNG_FARBEN = {
  marine: '#2a3558', anthrazit: '#3c4148', grau: '#8a9097', schwarz: '#22252a', bordeaux: '#7a2836', petrol: '#1f6470',
  olive: '#6d7442', camel: '#b98a52', beige: '#d9c8aa', hellblau: '#b9d3ec', 'weiß': '#eef4f8', senf: '#c9a13a',
  rosa: '#f4c9e6', mintgrün: '#a8dcc4', grün: '#6fae6a', rot: '#b8423a',
};

export const MERKMAL_WERTE = {
  geschlecht: ['w', 'm'],
  haar: ['kurz', 'seitenscheitel', 'glatze', 'halbglatze', 'locken', 'afro', 'bob', 'lang', 'zopf', 'dutt', 'pony', 'halblang'],
  haarfarbe: Object.keys(HAARFARBEN),
  brille: ['keine', 'rund', 'eckig', 'horn'],
  kleidungFarbe: Object.keys(KLEIDUNG_FARBEN),
  hautton: HAUT_NAMEN,
  kleidung: ['anzug', 'blazer', 'kostuem', 'hemd', 'pullover', 'rollkragen', 'bluse', 'strick'],
  bart: ['keiner', 'drei', 'voll', 'schnauz'],
};

// ─────────────────────────────────────────── Zufall und Farbe
function hash(s) {
  if (typeof s === 'number') return (s * 2654435761) >>> 0;
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function zufall(seed) {
  let a = hash(seed) || 1;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const nimm = (r, l) => l[Math.floor(r() * l.length) % l.length];
function gewichtet(r, paare) { let s = 0; for (const [, g] of paare) s += g; let x = r() * s; for (const [w, g] of paare) { if ((x -= g) <= 0) return w; } return paare[0][0]; }

function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex([r, g, b]) { return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
export function mische(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); }
const hell = (c, t) => mische(c, '#ffffff', t);
const dunkel = (c, t) => mische(c, '#000000', t);
const helligkeit = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

// ─────────────────────────────────────────── Merkmale
export function zufallsMerkmale(seed) {
  const r = zufall('portraet:' + seed);
  const geschlecht = r() < 0.5 ? 'w' : 'm';
  const alter = Math.round(29 + r() * 37);
  const hautton = gewichtet(r, [['hell', 3], ['rosig', 3], ['mittel', 2.2], ['oliv', 1.6], ['braun', 1.3], ['dunkel', 1]]);
  const dunkleHaut = hautton === 'braun' || hautton === 'dunkel';
  let haar = geschlecht === 'w'
    ? gewichtet(r, [['bob', 3], ['lang', 2.5], ['zopf', 1.5], ['dutt', 1.5], ['pony', 1.5], ['halblang', 2], ['kurz', 1], ['locken', 1.2], ['afro', dunkleHaut ? 1.5 : 0.2]])
    : gewichtet(r, [['kurz', 3], ['seitenscheitel', 3], ['halbglatze', alter > 45 ? 2.5 : 0.4], ['glatze', alter > 40 ? 1.2 : 0.4], ['locken', 1], ['afro', dunkleHaut ? 1.2 : 0.1], ['halblang', 0.6]]);
  let haarfarbe;
  if (alter > 58 && r() < 0.65) haarfarbe = r() < 0.4 ? 'weiß' : 'grau';
  else if (alter > 50 && r() < 0.35) haarfarbe = 'grau';
  else if (dunkleHaut || hautton === 'oliv') haarfarbe = gewichtet(r, [['schwarz', 4], ['dunkelbraun', 2]]);
  else haarfarbe = gewichtet(r, [['schwarz', 1], ['dunkelbraun', 2.5], ['braun', 2.5], ['hellbraun', 1.6], ['blond', 1.6], ['rot', 0.7]]);
  const brille = r() < (alter > 50 ? 0.55 : 0.3) ? nimm(r, ['rund', 'eckig', 'horn']) : 'keine';
  const kleidung = geschlecht === 'w'
    ? gewichtet(r, [['kostuem', 2.4], ['blazer', 2.2], ['bluse', 2], ['strick', 1.5], ['pullover', 1], ['rollkragen', 1]])
    : gewichtet(r, [['anzug', 3], ['blazer', 2], ['hemd', 2], ['pullover', 1.2], ['rollkragen', 0.8], ['strick', 0.6]]);
  const businessFarben = ['marine', 'anthrazit', 'grau', 'schwarz', 'marine', 'anthrazit', 'petrol', 'bordeaux', 'camel'];
  const legerFarben = ['hellblau', 'weiß', 'rosa', 'mintgrün', 'beige', 'senf', 'grün', 'bordeaux', 'olive', 'petrol', 'rot', 'camel', 'grau'];
  const kleidungFarbe = ['anzug', 'kostuem', 'blazer'].includes(kleidung) ? nimm(r, businessFarben) : nimm(r, legerFarben);
  const bart = geschlecht === 'm' && r() < 0.3 ? nimm(r, ['drei', 'drei', 'voll', 'schnauz']) : 'keiner';
  return { geschlecht, haar, haarfarbe, brille, kleidungFarbe, hautton, alter, kleidung, bart, seed: hash(seed) % 100000 };
}

function norm(m = {}) {
  const r = zufall('n:' + JSON.stringify(m));
  const geschlecht = m.geschlecht === 'm' || m.geschlecht === 'männlich' ? 'm' : m.geschlecht === 'w' || m.geschlecht === 'weiblich' ? 'w' : (r() < 0.5 ? 'w' : 'm');
  const haar = MERKMAL_WERTE.haar.includes(m.haar) ? m.haar : (geschlecht === 'w' ? 'bob' : 'kurz');
  const haarfarbe = HAARFARBEN[m.haarfarbe] ? m.haarfarbe : (String(m.haarfarbe ?? '').startsWith('#') ? m.haarfarbe : 'braun');
  const brille = MERKMAL_WERTE.brille.includes(m.brille) ? m.brille : (m.brille === true ? 'eckig' : 'keine');
  let hautton = m.hautton;
  if (typeof hautton === 'number') hautton = HAUT_NAMEN[Math.max(0, Math.min(5, Math.round(hautton)))];
  if (!HAUTTOENE[hautton]) hautton = 'rosig';
  const alter = Number.isFinite(m.alter) ? Math.max(20, Math.min(80, m.alter)) : 45;
  let kleidung = MERKMAL_WERTE.kleidung.includes(m.kleidung) ? m.kleidung : null;
  if (!kleidung) kleidung = geschlecht === 'w' ? nimm(r, ['kostuem', 'blazer', 'bluse']) : nimm(r, ['anzug', 'blazer', 'hemd']);
  const kf = m.kleidungFarbe ?? m.kleidungsfarbe;
  const kleidungFarbe = KLEIDUNG_FARBEN[kf] ?? (/^#[0-9a-f]{3,6}$/i.test(String(kf ?? '')) ? kf : KLEIDUNG_FARBEN.marine);
  const bart = MERKMAL_WERTE.bart.includes(m.bart) && geschlecht === 'm' ? m.bart : 'keiner';
  const seed = m.seed ?? hash(JSON.stringify([geschlecht, haar, haarfarbe, hautton, alter, kleidung]));
  return { geschlecht, haar, haarfarbe, brille, hautton, alter, kleidung, kleidungFarbe, bart, seed };
}

// ─────────────────────────────────────────── Formen (viewBox 100 × 100, Gesicht blickt nach links)
const P = (d, f, extra = '') => `<path d="${d}" fill="${f}"${extra}/>`;
const KOPF = 'M42.5 20.5 C47 14.5 59.5 14 63 22 C65 28 64.4 36 61.4 42 C58.8 47 53.6 50.6 48.4 50.6 C45.4 50.6 43.4 49.2 42.6 46.8 L42 43.4 C40.5 43 40 42 40.9 41.2 C40 40.6 40.1 39.5 40.9 39 L40.2 37.6 C39 37.2 37.6 36.6 37.7 35.7 C37.9 34.7 39.3 33 39.9 31.4 C39.8 27.4 40.3 23.6 42.5 20.5 Z';
const HALS = 'M45.2 44 L44.6 58.5 C47.8 61 53.4 61 57 57.6 L56.6 42 Z';
const HALS_SCHATTEN = 'M45.1 46 C48.4 51.6 53.8 51.4 56.7 47.4 L56.6 42 L45.2 43 Z';
const KOERPER = 'M16 100 L17 78 C17.4 67 23 61.6 32 59.4 L44.2 56.2 C48 58.6 53.6 58.6 57.2 55.8 L68.6 59 C77.4 61.4 82 67 82.6 77 L84 100 Z';
const ARM_L = 'M16 100 L17 78 C17.4 70 20.4 64.6 26 62 C24.6 72 24.4 87 25.6 100 Z';
const ARM_R = 'M70.6 60 C77.8 62.4 82 68 82.6 77 L84 100 L72 100 C73 88 72.6 72 70.6 60 Z';

// Haare: hinten (hinter Kopf und Körper), vorne (über dem Gesicht), Strähnen (dunkler)
const HAARE = {
  kurz: {
    vorne: 'M40.4 29.6 C38.8 20 45.6 12.4 54 12.4 C62.4 12.4 66.6 18.6 66 27.2 C65.8 32.6 64.6 36.6 62.8 39.6 L61.2 33.6 C60.4 30.8 58.4 29.8 56.8 30.4 L56.2 33.4 L54.6 26.4 C50 26.6 45 25.4 42 22.6 C41.2 25 40.8 27.4 40.4 29.6 Z',
    straehnen: ['M46 16 C50 15 55 16 58 19', 'M44 20 C48 21 52 21 55 20.6'],
  },
  seitenscheitel: {
    vorne: 'M39.6 30.6 C37.4 22 42.4 12.6 53 11.8 C62.4 11.4 67 17.6 66.2 26.8 C66 32.4 64.8 36.6 63 39.6 L61.2 33.6 C60.4 30.8 58.4 29.8 56.8 30.4 L56.2 33.4 L55 25.6 C51.4 24 47.6 22.6 45.6 20.2 C43.6 22 41.4 26 39.6 30.6 Z',
    straehnen: ['M45.4 19.8 C49 16 55 14.6 61 16.4', 'M48 21.6 C52 19.2 57 18.8 62 20.6'],
    scheitel: 'M45.6 20.2 C48 16.6 53 14.4 59 14.6',
  },
  glatze: { vorne: 'M57.6 31.4 C59.6 29.6 62.6 30 63.8 32.6 C64.2 35 63.8 37.6 62.8 39.6 C60.6 40 58.6 38.6 57.6 36.6 Z', glanz: true, ohrVorn: true },
  halbglatze: {
    vorne: 'M55.6 30.4 C58.6 26.6 63.8 26.2 66 29.6 C67.2 33.6 66.2 38 63.6 41.6 C62 42.4 60.6 42 59.8 40.6 L59.6 33 C58.8 31.6 57.2 31 55.6 31.6 Z',
    straehnen: ['M60.4 29 C62.4 28.4 64.2 29.4 64.8 31.6'],
    ohrVorn: true, glanz: true,
  },
  locken: {
    vorne: 'M40.2 28.6 C38.4 20 44.4 12.6 53 12.4 C61.4 12.2 67 18.4 66.6 27 C66.4 32.6 65 36.8 63 40 L61.2 33.6 C60.4 30.8 58.4 29.8 56.8 30.4 L56 33 L54.6 26.6 C50 26.4 45 25.4 42.4 23 C41.4 24.8 40.8 26.6 40.2 28.6 Z',
    kringel: [[41.2, 25, 2.8], [42.2, 19.4, 3.2], [46, 14.8, 3.4], [52, 12.6, 3.4], [58.2, 12.8, 3.4], [63.4, 15.6, 3.4], [66.6, 20.8, 3.2], [67, 26.8, 3], [65.8, 32.6, 2.8], [63.8, 37.6, 2.4], [48, 20.6, 2.6], [55, 19.4, 2.8], [61, 22.6, 2.6], [46.6, 24.4, 2.2]],
  },
  afro: {
    wolke: [[55, 23, 15.6], [42.6, 19, 6.6], [47.6, 11.4, 7.4], [57.6, 8.8, 7.6], [66.6, 12.6, 7.4], [71, 21.6, 7], [71, 31.6, 6.4], [67.4, 39.2, 5], [40.4, 27, 4.6]],
    vorne: 'M40.4 28.4 C39 22 42.6 16 48 14.6 L60 13.6 C65 15.6 67.4 22 66.8 28 C66.4 33 64.8 37 62.8 40 L61.2 33.6 C60.4 30.8 58.4 29.8 56.8 30.4 L56 33 L54.6 25.6 C50 25.6 45.4 25 42.4 22.8 C41.4 24.6 40.8 26.4 40.4 28.4 Z',
    boegen: [[44, 14, 3], [51, 9, 3.2], [60, 8, 3.2], [67, 13, 3], [70.4, 21, 3], [70.6, 31, 2.8], [66.6, 38.4, 2.4], [56, 18, 3], [63, 24, 3], [48.6, 19.6, 2.6]],
  },
  bob: {
    hinten: 'M41.4 24 C42.4 15 48.4 10.6 55.4 10.6 C64.6 10.6 70.8 18 70.6 30 C70.4 38 69.2 45 66.2 49.6 C62 51.2 58 50.2 55 47.4 Z',
    vorne: 'M39.2 31.4 C36.8 21 43.4 12 53.6 11.8 C63.6 11.6 69.2 18.8 68.6 29 C68.2 37.4 66.4 44.6 63.6 48.6 C60.8 50.2 57 48.8 54.6 46.8 C56.6 42.6 57.4 37 57 31.6 L55.4 25.2 C51 24.4 46.6 23.4 43.6 21.4 C41.6 24.2 40.2 27.6 39.2 31.4 Z',
    straehnen: ['M47 16.6 C54 15.2 61 17.6 64.4 24', 'M58.2 25 C61.6 30.6 62.6 38.6 60.6 46', 'M62.4 23.6 C65.2 30 65.6 38.6 63.8 45.6'],
  },
  pony: {
    hinten: 'M41 24 C42 15 48 10.6 55.4 10.6 C64.6 10.6 71 18 70.8 31 C70.6 39 69.4 45 67 48.6 C63 49.6 59.6 48.4 57 45.6 Z',
    vorne: 'M39.4 29.6 C38.4 19.8 44.6 12 53.8 11.8 C63.4 11.6 69 18.6 68.8 28.6 C68.6 36.4 67.4 43.4 65.6 47.6 C62.4 48.6 59 47.4 56.8 45.2 C57.8 40.6 57.8 36 57 31.6 L56 29 C52 28.4 47.6 28.2 43.8 28.8 C42.2 29.2 40.6 29.4 39.4 29.6 Z',
    straehnen: ['M43.4 28.6 C44.6 24 46 21 48.6 19.4', 'M49 28.2 C50 24 51.6 20.8 54.4 19', 'M60.8 26.6 C63.6 33 64.4 39.8 63.2 46'],
  },
  lang: {
    hinten: 'M40.4 26 C40.4 16 47 10.6 54.4 10.6 C65.4 10.6 71.6 18 71.6 30 C71.6 42 72.4 54 76.4 66 C70.4 70 62.4 70 57.6 66.6 L47.4 66.6 C43.6 68 38.6 67.4 34.6 63.4 C35.6 56 37 48 39.6 40 Z',
    vorne: 'M39.4 30.4 C37.4 20.6 43.6 11.6 53.6 11.4 C63.8 11.2 69.8 18.6 69.4 29 C69 37 68.2 44 67.4 51 C64 51.8 60.4 50.4 57.6 47.8 C58.2 42.4 57.8 36.8 56.8 31.6 L55.4 25 C51 23.6 46.8 22.2 44 20.4 C41.8 23.4 40.4 26.6 39.4 30.4 Z',
    straehnen: ['M47.2 16.4 C54 15 61 17.4 64.6 24', 'M62.6 27 C64.6 34 64.6 41 65 48', 'M68 40 C68.6 50 70.4 58 73.6 65'],
  },
  halblang: {
    hinten: 'M40.4 26 C40.4 16 47 10.6 54.4 10.6 C65.4 10.6 71.2 18 71.2 30 C71.2 40 71.4 48 73.4 55 C68.4 58.4 62.4 58.4 58 55.8 L47.4 55.8 C44.2 56.8 39.6 56.6 36.4 53.4 C38 48 39.6 42 40.4 36 Z',
    vorne: 'M39.6 30 C38 20.2 44 11.6 53.6 11.4 C63.6 11.2 69.4 18.4 69 28.4 C68.8 35 68.2 41.8 67.6 48 C64.2 48.8 60.8 47.6 58.2 45.2 C58.4 40.6 58 36 57 31.6 L55.4 25.4 C51 24.6 46.6 23 43.8 21 C41.8 23.6 40.6 26.6 39.6 30 Z',
    straehnen: ['M46.6 16.6 C53.6 15 60.6 17.4 64.4 24', 'M61.6 27 C63.6 34 64.4 42 64.2 50', 'M68 38 C68.4 45 69.4 50 71.4 54.4'],
  },
  zopf: {
    hinten: 'M62.6 23.6 C70 22.6 75 28 74.4 35 C74 42 75.4 50 79 58.4 C77.4 62.6 72 63.6 69.4 60.4 C68 52 66 44 62.2 36 Z',
    vorne: 'M39.6 30 C38 20.6 44 12 53.6 11.6 C62.6 11.4 67.8 17.6 67.2 26.2 C67 31.6 65.4 36.4 63 39.8 L61.2 33.6 C60.4 30.8 58.4 29.8 56.8 30.4 L56.2 33.4 L55 25.2 C50.8 24.2 46.6 22.8 44 21 C42 23.6 40.6 26.6 39.6 30 Z',
    straehnen: ['M45.4 17.6 C51 14.4 59 14.6 64 20', 'M47 21.8 C53 18.8 60 19.6 65 24', 'M70.6 34 C70.6 42 72.6 50 75.4 57'],
    band: [66.4, 28, 3.6],
  },
  dutt: {
    hinten: 'M60 14.2 C62.6 9.4 69.4 9.4 71.4 14 C73.4 18.6 70.6 23.8 65.6 24 C61.4 24.2 58.6 19 60 14.2 Z',
    vorne: 'M39.6 30 C38 20.6 44 12.4 53.4 12 C62 11.8 67.2 17.6 66.6 26.2 C66.4 31.6 65 36.4 62.8 39.8 L61.2 33.6 C60.4 30.8 58.4 29.8 56.8 30.4 L56.2 33.4 L55 25.2 C50.8 24.2 46.6 22.8 44 21 C42 23.6 40.6 26.6 39.6 30 Z',
    straehnen: ['M45.4 17.6 C51 14.4 59 14.6 64 20', 'M62 13 C65 11.4 68.4 12.4 69.8 15.4'],
  },
};

// ─────────────────────────────────────────── Kleidung
function kleidungSVG(m, r) {
  const c = m.kleidungFarbe, cL = hell(c, 0.14), cR = dunkel(c, 0.2), cK = dunkel(c, 0.32);
  const hellStoff = helligkeit(c) > 0.62;
  const weiss = '#f4f7f9', weissS = '#d9e1e6';
  const unter = hellStoff ? (m.geschlecht === 'w' ? '#2c3442' : '#ffffff') : weiss;
  const out = [];
  const koerper = () => { out.push(P(KOERPER, c), P(ARM_L, cL), P(ARM_R, cR)); out.push(`<path d="M25.6 100 C24.4 87 24.6 72 26 62" stroke="${cR}" stroke-width="0.6" fill="none" opacity="0.5"/>`, `<path d="M72 100 C73 88 72.6 72 70.6 60" stroke="${cK}" stroke-width="0.6" fill="none" opacity="0.6"/>`); };
  const vAusschnitt = (tief, farbe) => out.push(P(`M44.2 56.2 L50.6 ${tief} L57.2 55.8 C53.6 58.6 48 58.6 44.2 56.2 Z`, farbe));
  const revers = (tief, f) => {
    out.push(P(`M44.2 55.4 L37.6 60.4 L41.8 64.6 L39.8 66.6 L50.6 ${tief} Z`, hell(f, 0.1)));
    out.push(P(`M57.2 55 L62.4 59.4 L59.6 63.6 L61.6 65.4 L50.6 ${tief} Z`, dunkel(f, 0.1)));
    out.push(`<path d="M50.6 ${tief} L50.4 100" stroke="${cK}" stroke-width="0.7"/>`);
  };
  const kragenHemd = (f, s) => {
    out.push(P('M44.2 55 L47.6 62.4 L50.6 57.6 L45.6 53.4 Z', f), P('M57.2 54.6 L53.6 62.2 L50.8 57.6 L55.8 53 Z', s));
  };
  const knoepfe = (x, ys, f) => ys.forEach((y) => out.push(`<circle cx="${x}" cy="${y}" r="0.75" fill="${f}"/>`));
  switch (m.kleidung) {
    case 'anzug': {
      koerper();
      vAusschnitt(80, weiss);
      out.push(P('M45 56.6 L50.6 80 L50.6 58.6 Z', weissS));
      const kraw = nimm(r, ['#a8323a', '#2c4e8a', '#5b2a52', '#36673f', '#c58b2a', '#4a4f57']);
      out.push(P('M49.4 58.8 L51.8 58.8 L52.6 75.6 L50.6 79.4 L48.6 75.6 Z', kraw), P('M49 57.6 L52.2 57.6 L51.8 60 L49.4 60 Z', dunkel(kraw, 0.2)));
      kragenHemd(weiss, weissS);
      revers(80, c);
      knoepfe(51.6, [84, 92], cK);
      if (r() < 0.5) out.push(P('M63 70.4 L68.4 69.4 L68.6 71 L63.2 72 Z', hell(c, 0.25)));
      break;
    }
    case 'blazer': case 'kostuem': {
      koerper();
      const tief = m.kleidung === 'kostuem' ? 74 : 78;
      vAusschnitt(tief, unter);
      if (m.kleidung === 'blazer' && m.geschlecht === 'm') kragenHemd(weiss, weissS);
      if (m.kleidung === 'kostuem') out.push(P(`M45.4 56.8 C48 59.8 53.2 59.8 56.4 56.4 L50.6 ${tief} Z`, unter));
      revers(tief, c);
      knoepfe(51.6, [tief + 6, tief + 14].filter((y) => y < 98), cK);
      out.push(P('M62.4 76 L69 75 L69.2 76.4 L62.6 77.4 Z', cR));
      break;
    }
    case 'hemd': {
      koerper();
      kragenHemd(hell(c, 0.3), dunkel(c, 0.05));
      out.push(P('M45.6 56.8 C48 59.4 53 59.4 56 56.4 L50.6 60.6 Z', dunkel(c, 0.12)));
      out.push(`<path d="M50.6 60 L50.4 100" stroke="${cR}" stroke-width="0.6"/>`);
      knoepfe(51.6, [66, 74, 82, 90, 98], cR);
      out.push(P('M30.6 69.4 L39.6 68.6 L40 78.6 C37 79.8 33.6 79.8 31 79 Z', dunkel(c, 0.06)), `<path d="M30.6 69.4 L39.6 68.6" stroke="${cR}" stroke-width="0.6"/>`);
      break;
    }
    case 'pullover': {
      koerper();
      if (r() < 0.6) kragenHemd(weiss, weissS);
      out.push(`<path d="M44.2 56.4 C47.6 61.2 53.8 61 57.2 56" stroke="${cR}" stroke-width="2.2" fill="none"/>`);
      break;
    }
    case 'rollkragen': {
      koerper();
      out.push(P('M44.4 49.6 C48 52.6 53.8 52.4 57 48.6 L57.6 57 C53.8 60 48 60.4 44 57.4 Z', cL));
      for (const x of [46.4, 48.6, 50.8, 53, 55.2]) out.push(`<path d="M${x} ${50.8 + Math.abs(x - 51) * 0.12} L${x} ${58.6 - Math.abs(x - 51) * 0.1}" stroke="${dunkel(c, 0.12)}" stroke-width="0.5"/>`);
      break;
    }
    case 'bluse': {
      koerper();
      out.push(P('M44.2 56.2 L50.6 66 L57.2 55.8 C53.6 58.6 48 58.6 44.2 56.2 Z', HAUTTOENE[m.hautton][0]));
      out.push(P('M43.6 55 C42 58.6 43.6 62.4 47.6 63.2 L50.6 66 L44.6 55.6 Z', hell(c, 0.22)), P('M57.6 54.6 C59.4 58 58 62 54 63 L50.6 66 L56.8 55.4 Z', dunkel(c, 0.06)));
      knoepfe(50.8, [72, 80, 88, 96], dunkel(c, 0.25));
      break;
    }
    case 'strick': default: {
      koerper();
      const top = m.geschlecht === 'm' ? (hellStoff ? '#3a4150' : '#f4f7f9') : hellStoff ? '#3a4150' : nimm(r, ['#f4f7f9', '#aee0e6', '#f3e3c6', '#e9eef2']);
      out.push(P('M44.2 56.2 C48 58.6 53.6 58.6 57.2 55.8 L55 86 L50.4 100 L46.4 100 Z', top));
      out.push(P('M43.2 55.6 L37.8 60.6 L45.6 86 L47 100 L50.4 100 L46.6 86 Z', hell(c, 0.18)));
      out.push(P('M57.6 55.2 L62 59.2 L55.6 86 L52.6 100 L50.6 100 L54.6 86 Z', dunkel(c, 0.06)));
      knoepfe(47.4, [70, 78, 86, 94], dunkel(c, 0.5));
      if (m.geschlecht === 'm') kragenHemd(hellStoff ? '#4a5263' : weiss, hellStoff ? '#3a4150' : weissS);
      break;
    }
  }
  return out.join('');
}

// ─────────────────────────────────────────── Bild
export function portraetSVG(merkmale, groesse = 128, opt = {}) {
  const m = norm(merkmale);
  const r = zufall('p:' + m.seed);
  const [haut, hautS] = HAUTTOENE[m.hautton];
  let hf = HAARFARBEN[m.haarfarbe] ?? m.haarfarbe;
  const hfS = helligkeit(hf) > 0.5 ? dunkel(hf, 0.18) : (helligkeit(hf) < 0.15 ? hell(hf, 0.16) : dunkel(hf, 0.25));
  const H = HAARE[m.haar];
  const teile = [];
  if (opt.hintergrund) teile.push(`<rect width="100" height="100" fill="${opt.hintergrund}"/>`);
  // Haare hinten
  const umriss = ` stroke="${dunkel(hf, 0.35)}" stroke-width="0.6" stroke-linejoin="round"`;
  for (const [x, y, rr] of H.wolke ?? []) teile.push(`<circle cx="${x}" cy="${y}" r="${rr}" fill="${hf}"${umriss}/>`);
  for (const [x, y, rr] of H.wolke ?? []) teile.push(`<circle cx="${x}" cy="${y}" r="${rr - 0.4}" fill="${hf}"/>`);
  if (H.hinten) teile.push(P(H.hinten, dunkel(hf, 0.1), umriss));
  if (m.haar === 'zopf') teile.push(`<circle cx="${H.band[0]}" cy="${H.band[1]}" r="${H.band[2] * 0.5}" fill="${dunkel(hf, 0.4)}"/>`);
  // Körper und Hals
  teile.push(P(HALS, haut), P(HALS_SCHATTEN, hautS));
  teile.push(kleidungSVG(m, r));
  // Kopf
  teile.push(P(KOPF, haut));
  // Kieferschatten (rechte Gesichtshälfte im Schatten)
  teile.push(P('M56.6 42 C58.6 38.6 60 35 60.6 31 L63.4 31 C64.4 36 63 40 61.4 42.6 C59.6 46 57 48.6 53.6 50 C55.6 47.6 56.6 44.6 56.6 42 Z', hautS, ' opacity="0.55"'));
  if (m.alter >= 58) teile.push(`<path d="M44 48.6 C46.6 50.6 50.6 50.8 53.2 49.8" stroke="${hautS}" stroke-width="0.7" fill="none"/>`);
  // Bart
  if (m.bart === 'drei') teile.push(P('M42.4 44 C44 49.6 52 51.4 57.6 45.6 L59.6 38.6 C58 42 55.6 44.4 52 45 C48.6 45.4 45.4 44.8 42.4 44 Z', dunkel(hf, 0.05), ' opacity="0.28"'));
  if (m.bart === 'voll') teile.push(P('M41.6 42 C41.4 47.4 44.6 51.6 49.6 51.6 C54.6 51.6 59 47.6 60.4 39.4 L59.4 36 C58.4 40 56 42.6 52.6 43.4 C49 44 45.6 42.6 44.4 41.4 Z', hf), P('M40.8 40.4 C42.4 39.6 44.4 40 45.6 41.2 C44 42.2 42.2 42 40.8 40.4 Z', hf));
  if (m.bart === 'schnauz') teile.push(P('M40.4 39.6 C42 38.6 44.8 38.8 46.2 40.4 C44.4 41.4 42 41.4 40.4 39.6 Z', hf));
  const ohr = () => teile.push(`<ellipse cx="58.4" cy="35.4" rx="2.5" ry="3.9" fill="${haut}"/>`, `<path d="M58.4 32.6 C60 33.2 60.4 36.6 58.8 38" stroke="${hautS}" stroke-width="0.8" fill="none"/>`);
  if (!H.ohrVorn) ohr();
  // Haare vorne
  if (H.vorne) teile.push(P(H.vorne, hf, H.wolke ? '' : umriss));
  for (const [x, y, rr] of H.boegen ?? []) teile.push(`<path d="M${x - rr} ${y + rr * 0.3} A${rr} ${rr} 0 0 1 ${x + rr * 0.6} ${y - rr * 0.5}" stroke="${hfS}" stroke-width="0.8" fill="none" stroke-linecap="round"/>`);
  for (const [x, y, rr] of H.kringel ?? []) teile.push(`<circle cx="${x}" cy="${y}" r="${rr}" fill="${hf}"/>`, `<path d="M${x - rr * 0.6} ${y + rr * 0.1} A${rr * 0.7} ${rr * 0.7} 0 0 1 ${x + rr * 0.5} ${y - rr * 0.3}" stroke="${hfS}" stroke-width="0.7" fill="none"/>`);
  for (const s of H.straehnen ?? []) teile.push(`<path d="${s}" stroke="${hfS}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`);
  if (H.ohrVorn) ohr();
  if (H.scheitel) teile.push(`<path d="${H.scheitel}" stroke="${hfS}" stroke-width="0.6" fill="none"/>`);
  if (H.glanz) teile.push(`<path d="M46 19 C49 16.4 53.4 15.6 57 16.4" stroke="${hell(haut, 0.45)}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0.8"/>`);
  // Graue Schläfen ab 50 bei dunklem Haar
  if (m.alter >= 50 && !['grau', 'weiß'].includes(m.haarfarbe) && ['kurz', 'seitenscheitel', 'halbglatze', 'locken', 'zopf', 'dutt'].includes(m.haar)) teile.push(P('M56.6 31 C58.4 29.6 60.8 30.4 61.4 33.2 L62.6 39.4 C64 36.6 64.8 33.6 65 30.4 C62.4 26 58.6 26.6 56.6 31 Z', mische(hf, '#c9c7c2', 0.65), ' opacity="0.85"'));
  // Brille
  if (m.brille !== 'keine') {
    const fr = m.brille === 'horn' ? '#3b2418' : m.brille === 'rund' ? '#9a7a3a' : '#2e3440';
    const sw = m.brille === 'horn' ? 1.3 : 0.7;
    const linse = m.brille === 'rund'
      ? `<ellipse cx="45.2" cy="34.2" rx="3.6" ry="3.2"`
      : `<rect x="41.2" y="31.6" width="8" height="5" rx="${m.brille === 'horn' ? 1.4 : 0.9}"`;
    teile.push(`${linse} fill="#eef6fb" fill-opacity="0.55" stroke="${fr}" stroke-width="${sw}"/>`);
    teile.push(`<path d="M37.4 33 L39.4 32.6 L39.4 36.2 L37.6 36" fill="#eef6fb" fill-opacity="0.55" stroke="${fr}" stroke-width="${sw * 0.8}"/>`);
    teile.push(`<path d="M${m.brille === 'rund' ? 48.8 : 49.2} 33.4 L57.6 33.6" stroke="${fr}" stroke-width="${sw * 0.8}" fill="none"/>`);
  }
  // Schmuck
  if (m.geschlecht === 'w') {
    const ohrring = r() < 0.6 && !['lang', 'halblang', 'bob', 'pony'].includes(m.haar);
    if (ohrring) teile.push(`<circle cx="58.4" cy="40" r="1" fill="#e2b13c"/>`, `<circle cx="58.4" cy="41.8" r="0.9" fill="#f0c95a"/>`);
    if (['kostuem', 'bluse', 'rollkragen'].includes(m.kleidung) ? r() < 0.55 : r() < 0.2) {
      const perlen = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12; const x = 45.6 + t * 10.6; const y = 57.4 + Math.sin(t * Math.PI) * 4.4; perlen.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="0.75" fill="#f3e2b8" stroke="#c9a96a" stroke-width="0.2"/>`); }
      if (m.kleidung !== 'rollkragen') teile.push(perlen.join(''));
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${groesse}" height="${groesse}">${teile.join('')}</svg>`;
}

// Einrichtung im 5-m-Raster für die aufgeschnittenen Etagen (Puppenhaus-Ansicht wie in Coffee Inc 2).
//
// Konventionen
// - Eine Zelle liegt auf [x, x+5] × [z, z+5], Boden bei y = o.y (Standard 0). Rückwände sind -x und -z.
// - Möbel werden in einem lokalen Rahmen gebaut: Vorderseite zeigt nach lokal +z (siehe lokal()).
// - Glas: eigene Farbe GLAS, wird über vorbereiten(S, scene) durchsichtig und wirft keinen Schatten.
// - Schrift (Hängeschilder, Preisschilder, Markenschilder) braucht die Szene: vorbereiten(S, scene) setzt S.szene.
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { THREE, rng, waehle, zw, mat, textTextur, textMaterial, dunkler, heller, FARBEN } from './basis.js';

export const RASTER = 5;
export const WANDHOEHE = 4.6;
export const GLAS = '#cfe8f1';
const PI = Math.PI;

// ---------------------------------------------------------------- Grundwerkzeuge
/** Szene für Innenansichten vorbereiten: Glas durchsichtig und schattenfrei, Szene für Schrift merken. */
export function vorbereiten(S, scene) {
  S.szene = scene;
  const g = mat(GLAS);
  g.transparent = true; g.opacity = 0.3; g.depthWrite = false;
  if (scene && !scene.userData.glasFix) {
    scene.userData.glasFix = true;
    scene.onBeforeRender = () => scene.traverse((o) => { if (o.isMesh && o.material === g) o.castShadow = false; });
  }
}

/** Lokaler Rahmen: Ursprung (ox, oy, oz), gedreht um rot. Lokal +z = Vorderseite. */
export function lokal(S, ox, oy, oz, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (lx, lz) => [ox + lx * c + lz * s, oz - lx * s + lz * c];
  return {
    S, rot, oy, P,
    /** Quader, ly = Unterkante. */
    box(w, h, d, lx, ly, lz, f, ry = 0) { const [X, Z] = P(lx, lz); S.box(w, h, d, X, oy + ly + h / 2, Z, f, rot + ry); },
    geo(g, lx, ly, lz, f, ry = 0) { if (rot + ry) g.rotateY(rot + ry); const [X, Z] = P(lx, lz); g.translate(X, oy + ly, Z); S.add(g, f); },
    zyl(rt, rb, h, lx, ly, lz, f, seg = 8) { this.geo(new THREE.CylinderGeometry(rt, rb, h, seg).translate(0, h / 2, 0), lx, ly, lz, f); },
    kugel(rad, lx, ly, lz, f, det = 0) { this.geo(new THREE.IcosahedronGeometry(rad, det), lx, ly, lz, f); },
    sub(lx, lz, ry = 0) { const [X, Z] = P(lx, lz); return lokal(S, X, oy, Z, rot + ry); },
    hoch(dy) { return lokal(S, ox, oy + dy, oz, rot); },
  };
}

const anz = (n, d, f = 0.5) => Math.max(1, Math.floor(n * (d < 0.5 ? f : 1)));
const bunt = (r, pal) => pal[Math.floor(r() * pal.length)];

// Farbwelten
const PAL = {
  damen: ['#d65a6f', '#f2c6d2', '#e8dcc6', '#2b2b2b', '#7d97b8', '#c9483e', '#f4f0ea', '#9b6fb0', '#e9b44c', '#5f8f7a', '#e88a6a'],
  herren: ['#2b3a55', '#3a3f47', '#6b5a48', '#e8e4dc', '#8c9aa6', '#4a5a3e', '#1f2328', '#a67c52', '#d9dee3', '#6d2f3a'],
  kinder: ['#ef5b5b', '#ffc145', '#5bc0eb', '#9bc53d', '#f78fb3', '#7b6cf6', '#ff8c42', '#ffffff'],
  waesche: ['#f4d4dc', '#e8b4c4', '#ffffff', '#2b2b2b', '#c9a3d4', '#f0e2d0', '#b0475f', '#8a2f45'],
  sport: ['#1f6fd1', '#e8403a', '#1f1f1f', '#f2f2f2', '#38b86b', '#ffcc00', '#ff6a2b', '#7a3cd1', '#20b5c9'],
  outdoor: ['#3f6b3a', '#c25b2a', '#e0a33a', '#2f5f8a', '#6d4c3d', '#8a9a5b', '#d14a3a', '#30343a'],
  winter: ['#e8403a', '#1f6fd1', '#ffffff', '#1f1f1f', '#ffcc00', '#20b5c9', '#ff6a2b', '#7a3cd1'],
  beautyMarke: ['#1f1f1f', '#e9a3b8', '#d8b25a', '#f7f3ec', '#b5162b', '#2c4a6e', '#6c8f86', '#3b2a4a'],
  flakon: ['#f2c6d2', '#d8b25a', '#ffffff', '#b5162b', '#9bc6d8', '#2b2b2b', '#e9a3b8', '#c3a6d8'],
  waren: ['#e8403a', '#f2c14e', '#3c8dd9', '#5bb36a', '#f4f0e6', '#e97b3c', '#9b5fc0', '#2f5f8a', '#c9a26b'],
  taschen: ['#5a3b22', '#2b2b2b', '#c9483e', '#e8dcc6', '#2f6f8f', '#8b5a3c', '#d8b25a', '#6b2737'],
  schuhe: ['#2b2b2b', '#8b5a3c', '#e8e4dc', '#c9483e', '#5a3b22', '#2f4a6e', '#d8b25a'],
  geschirr: ['#ffffff', '#f4f0e6', '#9bc6d8', '#2f5f8a', '#e8d6b0', '#d97a5a', '#3f6b5a'],
};

const HOLZ = { hell: '#d8bf98', mittel: '#b98d61', dunkel: '#7b5a40', weiss: '#f6f3ee', schwarz: '#2a2d31', metall: '#9aa3aa', chrom: '#c9d2d8' };

// ---------------------------------------------------------------- Boden
const BODEN = {
  damen: { a: '#e3cfb1', b: '#dcc6a6', m: 'dielen' },
  herren: { a: '#a98463', b: '#9f7a59', m: 'dielen' },
  kinder: { a: '#d8e8f0', b: '#cfe0ea', m: 'karo' },
  waesche: { a: '#efdde2', b: '#e8d3d9', m: 'teppich' },
  beauty: { a: '#f7f4ef', b: '#e9e3da', m: 'karo' },
  accessoires: { a: '#c9a27a', b: '#bf966d', m: 'dielen' },
  wohnen: { a: '#d6c3a3', b: '#cdb999', m: 'dielen' },
  spielwaren: { a: '#f3e6b8', b: '#bfe0f0', m: 'karo' },
  food: { a: '#d6a47c', b: '#c99470', m: 'karo' },
  sport: { a: '#c9cdd1', b: '#bfc4c9', m: 'fliese' },
  sportschuhe: { a: '#cfd2d6', b: '#c3c7cc', m: 'fliese' },
  sporttextil: { a: '#d3d6da', b: '#c8ccd1', m: 'fliese' },
  outdoor: { a: '#b79e78', b: '#ab926d', m: 'dielen' },
  rad: { a: '#a3a9ae', b: '#989ea4', m: 'beton' },
  wintersport: { a: '#e3ecf2', b: '#d5e1ea', m: 'karo' },
  teamsport: { a: '#6fae5c', b: '#67a454', m: 'rasen' },
  offprice: { a: '#bdb8ad', b: '#b2ada2', m: 'fliese' },
  konzession: { a: '#e9e4dc', b: '#ddd6cb', m: 'karo' },
  untermiete: { a: '#d4d0c8', b: '#c9c4bb', m: 'fliese' },
  leer: { a: '#6b6e72', b: '#63666a', m: 'beton' },
  umbau: { a: '#8f8b84', b: '#85817a', m: 'beton' },
  gang: { a: '#efebe4', b: '#e4dfd6', m: 'fliese' },
  kasse: { a: '#efebe4', b: '#e4dfd6', m: 'fliese' },
  lager: { a: '#a7a49d', b: '#9d9a93', m: 'beton' },
};

/** Bodenbelag auf [x, x+w] × [z, z+d] (Oberkante y + 0.06). */
export function boden(S, x, z, w, d, y, typ, dichte = 1) {
  const b = typeof typ === 'string' ? (BODEN[typ] ?? BODEN.gang) : typ;
  S.box(w, 0.05, d, x + w / 2, y + 0.025, z + d / 2, b.a);
  if (dichte < 0.35) return;
  if (b.m === 'dielen') {
    for (let i = 1; i < w / 1.0; i += 2) S.box(1.0, 0.012, d, x + i + 0.5, y + 0.055, z + d / 2, b.b);
  } else if (b.m === 'karo') {
    const k = dichte > 0.6 ? 1.25 : 2.5;
    for (let i = 0; i < w / k - 0.01; i++) for (let j = 0; j < d / k - 0.01; j++) if ((i + j) % 2) S.box(k, 0.012, k, x + (i + 0.5) * k, y + 0.055, z + (j + 0.5) * k, b.b);
  } else if (b.m === 'fliese') {
    for (let i = 1; i < w / 2.5; i++) S.box(0.05, 0.012, d, x + i * 2.5, y + 0.055, z + d / 2, b.b);
    for (let j = 1; j < d / 2.5; j++) S.box(w, 0.012, 0.05, x + w / 2, y + 0.055, z + j * 2.5, b.b);
  } else if (b.m === 'rasen') {
    S.box(w, 0.012, 0.08, x + w / 2, y + 0.055, z + d / 2, '#f2f2ee');
  } else if (b.m === 'beton') {
    S.box(w * 0.35, 0.012, d * 0.3, x + w * 0.3, y + 0.055, z + d * 0.65, b.b);
  } else if (b.m === 'marmor') {
    // große Platten 2,5 m, versetzt hell/dunkel, feine Adern
    for (let i = 0; i < w / 2.5 - 0.01; i++) for (let j = 0; j < d / 2.5 - 0.01; j++) {
      const px = x + (i + 0.5) * 2.5, pz = z + (j + 0.5) * 2.5;
      if ((i + j) % 2) S.box(2.46, 0.012, 2.46, px, y + 0.055, pz, b.b);
      if (dichte > 0.6 && (i * 3 + j) % 4 === 1) S.box(1.7, 0.014, 0.05, px, y + 0.058, pz, b.c ?? dunkler(b.b, 0.05), 0.6);
    }
  } else if (b.m === 'teppich') {
    for (let i = 0; i < w / 2.5 - 0.01; i++) for (let j = 0; j < d / 2.5 - 0.01; j++) if ((i + j) % 2) S.box(2.5, 0.01, 2.5, x + (i + 0.5) * 2.5, y + 0.053, z + (j + 0.5) * 2.5, b.b);
  } else if (b.m === 'parkett') {
    for (let i = 0; i < w / 0.5 - 0.01; i++) if (i % 2) S.box(0.5, 0.012, d, x + (i + 0.5) * 0.5, y + 0.055, z + d / 2, b.b);
    if (dichte > 0.6) for (let i = 0; i < w / 0.5 - 0.01; i++) S.box(0.48, 0.014, 0.03, x + (i + 0.5) * 0.5, y + 0.056, z + ((i * 1.7) % d), b.c ?? dunkler(b.b, 0.06));
  } else if (b.m === 'punkte') {
    // Linoleum mit farbigen Kreisen (Kinderwelt)
    const fs = b.punkte ?? ['#ffd166', '#5bc0eb', '#ef5b5b', '#9bc53d'];
    const k = Math.round((x * 7 + z * 3) / 5);
    S.add(new THREE.CylinderGeometry(1.1, 1.1, 0.012, 14).translate(x + 1.4, y + 0.056, z + 1.5), fs[Math.abs(k) % fs.length]);
    if (dichte > 0.5) S.add(new THREE.CylinderGeometry(0.7, 0.7, 0.012, 12).translate(x + 3.7, y + 0.056, z + 3.6), fs[Math.abs(k + 2) % fs.length]);
  } else if (b.m === 'platten') {
    // Naturstein: Fugen im 2,5-m-Raster und ein Fries am Zellenrand
    for (let i = 1; i < w / 2.5; i++) S.box(0.04, 0.012, d, x + i * 2.5, y + 0.055, z + d / 2, b.b);
    for (let j = 1; j < d / 2.5; j++) S.box(w, 0.012, 0.04, x + w / 2, y + 0.055, z + j * 2.5, b.b);
    if (b.c && dichte > 0.5) { S.box(w, 0.013, 0.22, x + w / 2, y + 0.056, z + 0.11, b.c); S.box(0.22, 0.013, d, x + 0.11, y + 0.056, z + d / 2, b.c); }
  } else if (b.m === 'streifen') {
    S.box(w, 0.012, 0.12, x + w / 2, y + 0.055, z + d * 0.3, b.b);
    if (b.c) S.box(w, 0.012, 0.12, x + w / 2, y + 0.055, z + d * 0.3 + 0.2, b.c);
  }
}

// ---------------------------------------------------------------- Kleidung
/** Hängende Kleidung an einer Stange entlang lokal x von a bis b, Stangenhöhe y. seitlich = Teile quer. */
function kleiderReihe(L, a, b, y, lz, pal, r, d, o = {}) {
  const seitlich = o.seitlich ?? true;
  const hMin = o.hMin ?? 0.65, hMax = o.hMax ?? 1.05;
  const breit = o.breit ?? 0.44;
  if (d < 0.55) { // gruppiert: Farbblöcke statt Einzelteile
    const n = Math.max(1, Math.round((b - a) / 0.5));
    const s = (b - a) / n;
    for (let i = 0; i < n; i++) { const h = zw(r, hMin, hMax); L.box(s * 0.92, h, seitlich ? breit : 0.1, a + s * (i + 0.5), y - h - 0.03, lz, bunt(r, pal)); }
    return;
  }
  const abst = o.abstand ?? 0.12;
  let farbe = bunt(r, pal), h = zw(r, hMin, hMax);
  for (let u = a + abst / 2; u < b - 0.02; u += abst) {
    if (r() < 0.28) { farbe = bunt(r, pal); h = zw(r, hMin, hMax); }
    if (seitlich) L.box(0.065, h, breit, u, y - h - 0.03, lz, farbe);
    else L.box(breit, h, 0.06, u, y - h - 0.03, lz, farbe);
  }
}

/** Gefaltete Stapel auf einer Fläche (lokal, Mitte lx/lz, Größe w×t, Oberfläche y). */
function stapel(L, lx, lz, w, t, y, pal, r, d, n = null) {
  const sx = 0.36, sz = 0.3;
  const nx = Math.max(1, Math.floor(w / (sx + 0.06))), nz = Math.max(1, Math.floor(t / (sz + 0.06)));
  if (d < 0.5) { for (let j = 0; j < nz; j++) L.box(w * 0.92, zw(r, 0.12, 0.3), sz, lx, y, lz - t / 2 + (j + 0.5) * (t / nz), bunt(r, pal)); return; }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const h = zw(r, 0.1, 0.32);
    const px = lx - w / 2 + (i + 0.5) * (w / nx), pz = lz - t / 2 + (j + 0.5) * (t / nz);
    L.box(sx, h, sz, px, y, pz, bunt(r, pal), zw(r, -0.06, 0.06));
  }
}

/** Wandeinheit Kleidung: Rückwandpaneel, Stange(n), Fachboden mit Stapeln, Bildtafel. Länge w entlang lokal x, Rücken bei z = 0. */
function wandKleider(L, w, pal, r, d, o = {}) {
  const panel = o.panel ?? HOLZ.weiss;
  L.box(w, 2.7, 0.1, 0, 0, 0.05, panel);
  L.box(w, 0.1, 0.12, 0, 2.7, 0.06, dunkler(panel, 0.08));
  const zweiReihen = o.zwei ?? r() < 0.5;
  L.box(0.06, 2.4, 0.5, -w / 2 + 0.05, 0, 0.35, HOLZ.chrom);
  L.box(0.06, 2.4, 0.5, w / 2 - 0.05, 0, 0.35, HOLZ.chrom);
  if (zweiReihen) {
    L.box(w - 0.1, 0.04, 0.04, 0, 1.0, 0.35, HOLZ.chrom);
    L.box(w - 0.1, 0.04, 0.04, 0, 1.95, 0.35, HOLZ.chrom);
    kleiderReihe(L, -w / 2 + 0.1, w / 2 - 0.1, 1.95, 0.35, pal, r, d, { hMin: 0.55, hMax: 0.8, breit: o.breit });
    kleiderReihe(L, -w / 2 + 0.1, w / 2 - 0.1, 1.0, 0.35, pal, r, d, { hMin: 0.45, hMax: 0.7, breit: o.breit });
  } else {
    L.box(w - 0.1, 0.04, 0.04, 0, 1.75, 0.35, HOLZ.chrom);
    kleiderReihe(L, -w / 2 + 0.1, w / 2 - 0.1, 1.75, 0.35, pal, r, d, { hMin: o.hMin ?? 0.8, hMax: o.hMax ?? 1.3, breit: o.breit });
  }
  // Fachboden oben mit Stapeln
  L.box(w - 0.1, 0.05, 0.4, 0, 2.2, 0.25, panel === HOLZ.weiss ? HOLZ.hell : HOLZ.weiss);
  stapel(L, 0, 0.25, w - 0.4, 0.32, 2.25, pal, r, d);
  // Bildtafel (Kampagnenbild)
  if (o.bild !== false && d > 0.4) bildtafel(L, 0, 3.15, 0.11, Math.min(2.6, w * 0.6), 1.0, r, pal);
}

/** Kampagnenbild an der Wand: Rahmen, Fläche, stilisierte Figur. */
function bildtafel(L, lx, y, lz, w, h, r, pal) {
  L.box(w, h, 0.05, lx, y, lz, '#f8f6f2');
  L.box(w - 0.12, h - 0.12, 0.03, lx, y + 0.06, lz + 0.03, bunt(r, ['#e9c9b5', '#bcd3df', '#d6c6e0', '#e4d7b8', '#c9dcc4']));
  L.box(w * 0.18, h * 0.62, 0.02, lx - w * 0.15, y + 0.12, lz + 0.05, bunt(r, pal));
  L.box(w * 0.08, w * 0.08, 0.02, lx - w * 0.15, y + 0.12 + h * 0.62, lz + 0.05, '#d9a77f');
  L.box(w * 0.32, 0.08, 0.02, lx + w * 0.18, y + h * 0.3, lz + 0.05, '#ffffff');
}

/** Rundständer mit Teilen ringsum. */
function rundstaender(L, lx, lz, pal, r, d, rad = 0.5) {
  L.zyl(0.3, 0.34, 0.06, lx, 0, lz, HOLZ.chrom, 10);
  L.zyl(0.03, 0.03, 1.4, lx, 0, lz, HOLZ.chrom, 6);
  L.geo(new THREE.TorusGeometry(rad, 0.022, 4, 16).rotateX(PI / 2), lx, 1.32, lz, HOLZ.chrom);
  const n = d < 0.55 ? 6 : 11;
  const farben = [bunt(r, pal), bunt(r, pal), bunt(r, pal)];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI * 2 + 0.3, h = zw(r, 0.7, 0.95);
    L.box(d < 0.55 ? 0.14 : 0.06, h, 0.36, lx + Math.cos(a) * rad, 1.3 - h, lz + Math.sin(a) * rad, farben[Math.floor((i / n) * 3)], -a);
  }
  L.box(0.3, 0.12, 0.3, lx, 1.4, lz, '#f4f2ee');
}
/** Gerader Ständer (Rollständer) entlang lokal x. */
function staender(L, lx, lz, w, pal, r, d, hoch = 1.55) {
  L.box(0.05, hoch, 0.5, lx - w / 2, 0, lz, HOLZ.chrom);
  L.box(0.05, hoch, 0.5, lx + w / 2, 0, lz, HOLZ.chrom);
  L.box(w, 0.04, 0.04, lx, hoch, lz, HOLZ.chrom);
  kleiderReihe(L, lx - w / 2 + 0.05, lx + w / 2 - 0.05, hoch, lz, pal, r, d, { hMin: 0.7, hMax: 1.1 });
}

/** Präsentationstisch mit gefalteter Ware. */
function warenTisch(L, lx, lz, w, t, pal, r, d, farbe = HOLZ.hell, h = 0.82) {
  L.box(w, h - 0.06, t, lx, 0, lz, farbe);
  L.box(w + 0.08, 0.06, t + 0.08, lx, h - 0.06, lz, dunkler(farbe, 0.05));
  stapel(L, lx, lz, w - 0.15, t - 0.12, h, pal, r, d);
}

/** Schaufensterpuppe. typ: damen | herren | kind | waesche | sport. */
export function puppe(L, lx, lz, r, typ = 'damen', pal = PAL.damen, ry = 0) {
  const P = L.sub(lx, lz, ry);
  const koerper = r() < 0.75 ? '#f1eee8' : '#3a3a3c';
  const s = typ === 'kind' ? 0.65 : 1;
  const k1 = bunt(r, pal), k2 = bunt(r, pal);
  P.zyl(0.2 * s, 0.22 * s, 0.05, 0, 0, 0, '#2a2d31', 8);
  P.box(0.03, 0.2 * s, 0.03, 0, 0.05, 0, HOLZ.chrom);
  if (typ === 'waesche') {
    P.box(0.13 * s, 0.85 * s, 0.15 * s, -0.08 * s, 0.25 * s, 0, koerper);
    P.box(0.13 * s, 0.85 * s, 0.15 * s, 0.08 * s, 0.25 * s, 0, koerper);
    P.box(0.34 * s, 0.6 * s, 0.22 * s, 0, 1.1 * s, 0, koerper);
    P.box(0.36 * s, 0.14 * s, 0.24 * s, 0, 1.06 * s, 0, k1);
    P.box(0.36 * s, 0.13 * s, 0.24 * s, 0, 1.45 * s, 0, k1);
  } else if (typ === 'damen' && r() < 0.55) {
    P.box(0.1 * s, 0.6 * s, 0.12 * s, -0.07 * s, 0.25 * s, 0, koerper);
    P.box(0.1 * s, 0.6 * s, 0.12 * s, 0.07 * s, 0.25 * s, 0, koerper);
    P.geo(new THREE.CylinderGeometry(0.17 * s, 0.3 * s, 0.75 * s, 6).translate(0, 0.375 * s, 0), 0, 0.72 * s, 0, k1);
    P.box(0.36 * s, 0.55 * s, 0.22 * s, 0, 1.15 * s, 0, k1);
  } else {
    P.box(0.14 * s, 0.9 * s, 0.16 * s, -0.09 * s, 0.25 * s, 0, k2);
    P.box(0.14 * s, 0.9 * s, 0.16 * s, 0.09 * s, 0.25 * s, 0, k2);
    P.box(typ === 'herren' ? 0.44 * s : 0.38 * s, 0.6 * s, 0.24 * s, 0, 1.12 * s, 0, k1);
    if (typ === 'herren') P.box(0.12 * s, 0.4 * s, 0.02, 0, 1.25 * s, 0.13 * s, '#f4f2ee');
  }
  P.box(0.1 * s, 0.6 * s, 0.11 * s, -0.24 * s, 1.1 * s, 0, typ === 'waesche' ? koerper : k1, 0);
  P.box(0.1 * s, 0.6 * s, 0.11 * s, 0.24 * s, 1.1 * s, 0, typ === 'waesche' ? koerper : k1, 0);
  P.box(0.08 * s, 0.1 * s, 0.08 * s, 0, 1.7 * s, 0, koerper);
  P.geo(new THREE.SphereGeometry(0.12 * s, 8, 6).scale(1, 1.2, 1), 0, 1.92 * s, 0, koerper);
}

/** Podest mit 2–3 Puppen. */
function puppenPodest(L, lx, lz, typ, pal, r, w = 2.2) {
  L.box(w, 0.25, 1.1, lx, 0, lz, HOLZ.weiss);
  L.box(w + 0.06, 0.04, 1.16, lx, 0.25, lz, '#d9d3c9');
  const n = w > 1.8 ? 3 : 2;
  for (let i = 0; i < n; i++) puppe(L.hoch(0.29), lx - w / 2 + (i + 0.5) * (w / n), lz + (i % 2 ? 0.15 : -0.1), r, typ, pal, zw(r, -0.4, 0.4));
}

/** Umkleiden an der Wand (Rücken bei z = 0), n Kabinen entlang x. */
function umkleiden(L, w, n, r, vorhang = '#7b2f3a') {
  const kb = w / n, t = 1.2, h = 2.3;
  L.box(w, h, 0.08, 0, 0, 0.04, '#efe9df');
  for (let i = 0; i <= n; i++) L.box(0.08, h, t, -w / 2 + i * kb, 0, t / 2, '#efe9df');
  L.box(w, 0.12, 0.08, 0, h - 0.12, t, '#d9d1c4');
  for (let i = 0; i < n; i++) {
    const cx = -w / 2 + (i + 0.5) * kb;
    const offen = r() < 0.4;
    L.box(offen ? kb * 0.3 : kb - 0.12, 2.0, 0.05, offen ? cx - kb * 0.32 : cx, 0.15, t - 0.05, vorhang);
    L.box(0.6, 1.4, 0.03, cx, 0.6, 0.1, '#dfe9ee'); // Spiegel
    L.box(0.5, 0.45, 0.3, cx + kb * 0.25, 0, 0.3, HOLZ.mittel); // Hocker
  }
}

/** Standspiegel. */
function standspiegel(L, lx, lz, ry = 0) {
  const P = L.sub(lx, lz, ry);
  P.box(0.7, 0.05, 0.4, 0, 0, 0, '#2a2d31');
  P.box(0.7, 1.9, 0.06, 0, 0.05, 0, '#d8b25a');
  P.box(0.58, 1.75, 0.02, 0, 0.12, 0.035, '#e3edf1');
}

// ---------------------------------------------------------------- Regale und Vitrinen
/** Wandregal: Rücken z = 0, Breite w, Böden, Produkte über Funktion prod(L, lx, y, lz, breite, r). */
function wandRegal(L, w, h, boeden, korpus, prod, r, d, tiefe = 0.5) {
  L.box(w, h, 0.06, 0, 0, 0.03, korpus);
  L.box(0.06, h, tiefe, -w / 2 + 0.03, 0, tiefe / 2, dunkler(korpus, 0.05));
  L.box(0.06, h, tiefe, w / 2 - 0.03, 0, tiefe / 2, dunkler(korpus, 0.05));
  L.box(w, 0.08, tiefe, 0, h - 0.08, tiefe / 2, dunkler(korpus, 0.05));
  L.box(w, 0.25, tiefe, 0, 0, tiefe / 2, dunkler(korpus, 0.12));
  for (let i = 0; i < boeden; i++) {
    const y = 0.25 + (i * (h - 0.4)) / boeden;
    if (i) L.box(w - 0.1, 0.04, tiefe - 0.04, 0, y, tiefe / 2, heller(korpus, 0.04));
    prod(L, 0, y + 0.04, tiefe / 2, w - 0.16, r, d, (h - 0.4) / boeden - 0.08);
  }
}

/** Produktreihe: Kartons/Packungen. */
function prodPackungen(pal) {
  return (L, lx, y, lz, w, r, d, hMax) => {
    if (d < 0.5) { const n = 3; for (let i = 0; i < n; i++) L.box(w / n - 0.04, zw(r, 0.5, 0.85) * hMax, 0.3, lx - w / 2 + (i + 0.5) * (w / n), y, lz, bunt(r, pal)); return; }
    let u = lx - w / 2;
    while (u < lx + w / 2 - 0.12) {
      const b = zw(r, 0.14, 0.32) / Math.min(1, d + 0.1), h = zw(r, 0.45, 0.95) * hMax;
      if (u + b > lx + w / 2) break;
      L.box(b - 0.03, h, 0.3, u + b / 2, y, lz, bunt(r, pal));
      u += b;
    }
  };
}
/** Flaschen (Wein, Flakons). */
function prodFlaschen(pal, rad = 0.04, hoch = 0.32) {
  return (L, lx, y, lz, w, r, d, hMax) => {
    const n = anz(Math.floor(w / (rad * 4.5)), d, 0.4);
    for (let i = 0; i < n; i++) {
      const u = lx - w / 2 + (i + 0.5) * (w / n);
      const h = Math.min(hoch * zw(r, 0.8, 1.1), hMax);
      L.box(rad * 2, h, rad * 2, u, y, lz + (i % 2 ? 0.08 : -0.04), bunt(r, pal));
    }
  };
}
/** Geschirr: Teller-Stapel und Tassen. */
function prodGeschirr(L, lx, y, lz, w, r, d, hMax) {
  const n = anz(Math.floor(w / 0.38), d, 0.5);
  for (let i = 0; i < n; i++) {
    const u = lx - w / 2 + (i + 0.5) * (w / n), f = bunt(r, PAL.geschirr);
    if (i % 3 === 1) { L.zyl(0.07, 0.06, 0.12, u - 0.07, y, lz, f, 6); L.zyl(0.07, 0.06, 0.12, u + 0.09, y, lz + 0.05, f, 6); }
    else L.zyl(0.15, 0.15, Math.min(hMax, zw(r, 0.08, 0.3)), u, y, lz, f, 10);
  }
}
/** Gefaltetes im Regal. */
function prodGefaltet(pal) {
  return (L, lx, y, lz, w, r, d, hMax) => {
    const n = anz(Math.floor(w / 0.42), d, 0.5);
    for (let i = 0; i < n; i++) L.box(0.36, Math.min(hMax, zw(r, 0.15, 0.32)), 0.32, lx - w / 2 + (i + 0.5) * (w / n), y, lz, bunt(r, pal));
  };
}
/** Schuhpaare im Regal. */
function prodSchuhe(pal) {
  return (L, lx, y, lz, w, r, d, hMax) => {
    const n = anz(Math.floor(w / 0.36), d, 0.5);
    for (let i = 0; i < n; i++) {
      const u = lx - w / 2 + (i + 0.5) * (w / n), f = bunt(r, pal), hoch = r() < 0.3;
      L.box(0.1, hoch ? 0.2 : 0.09, 0.27, u - 0.06, y, lz, f, 0.15);
      L.box(0.1, hoch ? 0.2 : 0.09, 0.27, u + 0.07, y, lz, f, 0.15);
    }
  };
}
/** Taschen. */
function prodTaschen(L, lx, y, lz, w, r, d, hMax) {
  const n = Math.max(1, anz(Math.floor(w / 0.45), d, 0.5));
  for (let i = 0; i < n; i++) {
    const u = lx - w / 2 + (i + 0.5) * (w / n), f = bunt(r, PAL.taschen), h = Math.min(hMax * 0.8, zw(r, 0.22, 0.34));
    L.box(0.34, h, 0.16, u, y, lz, f);
    L.box(0.2, 0.06, 0.02, u, y + h, lz, dunkler(f, 0.1));
  }
}

/** Glasvitrine: Sockel, Glaskasten, Inhalt. */
function vitrine(L, lx, lz, w, t, h, sockel, inhalt, r, d) {
  L.box(w, h, t, lx, 0, lz, sockel);
  L.box(w + 0.04, 0.04, t + 0.04, lx, h, lz, '#e8e4dc');
  inhalt(L, lx, h + 0.04, lz, w - 0.2, t - 0.14, r, d);
  L.box(w, 0.42, t, lx, h + 0.04, lz, GLAS);
  L.box(w + 0.04, 0.03, t + 0.04, lx, h + 0.46, lz, HOLZ.chrom);
}

// ---------------------------------------------------------------- Warengruppen: Inseln und Wände
// Jede Insel belegt etwa 3.2 × 3.2 m um den lokalen Ursprung. Wände: Länge w, Rücken bei z = 0.

const MODUL = {
  damen: {
    wand: [
      (L, w, r, d) => wandKleider(L, w, PAL.damen, r, d),
      (L, w, r, d) => wandKleider(L, w, PAL.damen, r, d, { panel: '#e9d6cf', zwei: false }),
      (L, w, r, d) => { umkleiden(L.sub(-w / 4, 0), w / 2, 2, r); wandKleider(L.sub(w / 4, 0), w / 2 - 0.1, PAL.damen, r, d, { bild: false }); },
    ],
    insel: [
      (L, r, d) => { rundstaender(L, -0.9, -0.8, PAL.damen, r, d); rundstaender(L, 0.9, 0.7, PAL.damen, r, d); puppe(L, 0.9, -0.9, r, 'damen', PAL.damen, 0.3); puppe(L, -0.9, 0.9, r, 'damen', PAL.damen, -0.4); },
      (L, r, d) => { staender(L, 0, -0.9, 2.4, PAL.damen, r, d); warenTisch(L, 0, 0.6, 1.8, 0.9, PAL.damen, r, d); puppe(L, 1.3, 0.6, r, 'damen', PAL.damen); },
      (L, r, d) => { puppenPodest(L, 0, -0.5, 'damen', PAL.damen, r, 2.6); rundstaender(L, -0.8, 1.0, PAL.damen, r, d); standspiegel(L, 1.0, 1.0, -0.5); },
      (L, r, d) => { staender(L, -0.7, -0.6, 1.4, PAL.damen, r, d); staender(L, 0.8, 0.4, 1.4, PAL.damen, r, d); warenTisch(L, -0.6, 1.0, 1.2, 0.7, PAL.damen, r, d, HOLZ.weiss); },
    ],
  },
  herren: {
    wand: [
      (L, w, r, d) => wandKleider(L, w, PAL.herren, r, d, { panel: '#6f5442', zwei: true }),
      (L, w, r, d) => { wandRegal(L, w, 2.6, 4, '#7b5a40', prodGefaltet(PAL.herren), r, d); bildtafel(L, 0, 3.1, 0.07, 2.2, 1.0, r, PAL.herren); },
      (L, w, r, d) => { umkleiden(L.sub(-w / 4, 0), w / 2, 2, r, '#2b3a55'); wandKleider(L.sub(w / 4, 0), w / 2 - 0.1, PAL.herren, r, d, { panel: '#6f5442', bild: false }); },
    ],
    insel: [
      (L, r, d) => { staender(L, 0, -1.0, 2.4, PAL.herren.slice(0, 4), r, d, 1.75); warenTisch(L, -0.6, 0.6, 1.4, 0.9, PAL.herren, r, d, HOLZ.dunkel); puppe(L, 1.1, 0.6, r, 'herren', PAL.herren); },
      (L, r, d) => { vitrine(L, 0, -0.6, 2.0, 0.8, 0.85, HOLZ.dunkel, (L2, x, y, z, w, t, r2) => { for (let i = 0; i < 8; i++) L2.box(0.08, 0.02, 0.4, x - w / 2 + (i + 0.5) * (w / 8), y, z, bunt(r2, ['#6d2f3a', '#2b3a55', '#a67c52', '#4a5a3e', '#c9483e'])); }, r, d); puppenPodest(L, 0, 0.9, 'herren', PAL.herren, r, 2.2); },
      (L, r, d) => { rundstaender(L, -0.8, -0.7, PAL.herren, r, d); rundstaender(L, 0.8, 0.8, PAL.herren, r, d); warenTisch(L, 0.8, -0.8, 1.1, 0.7, ['#ffffff', '#d9dee3', '#9bb7d1', '#f2efe8'], r, d, HOLZ.dunkel); },
    ],
  },
  kinder: {
    wand: [
      (L, w, r, d) => wandKleider(L, w, PAL.kinder, r, d, { panel: '#cfe6f2', zwei: true, breit: 0.32 }),
      (L, w, r, d) => { wandRegal(L, w, 2.2, 3, '#f7d26a', prodGefaltet(PAL.kinder), r, d); bildtafel(L, 0, 2.7, 0.07, 2.0, 0.9, r, PAL.kinder); },
    ],
    insel: [
      (L, r, d) => { L.zyl(1.5, 1.5, 0.02, 0, 0, 0, '#ffd166', 16); staender(L, 0, -0.8, 1.8, PAL.kinder, r, d, 1.15); puppe(L, -0.6, 0.6, r, 'kind', PAL.kinder); puppe(L, 0.2, 0.8, r, 'kind', PAL.kinder); warenTisch(L, 0.9, 0.6, 0.9, 0.7, PAL.kinder, r, d, '#ffffff', 0.6); },
      (L, r, d) => { rundstaender(L, -0.8, -0.6, PAL.kinder, r, d, 0.45); rundstaender(L, 0.8, 0.6, PAL.kinder, r, d, 0.45); L.box(1.0, 0.45, 1.0, 0.8, 0, -0.8, '#5bc0eb'); L.box(0.7, 0.3, 0.7, -0.8, 0, 0.8, '#ef5b5b'); },
    ],
  },
  waesche: {
    wand: [
      (L, w, r, d) => { umkleiden(L.sub(-w / 4, 0), w / 2, 2, r, '#b0475f'); wandKleider(L.sub(w / 4, 0), w / 2 - 0.1, PAL.waesche, r, d, { panel: '#f2dfe4', bild: false, hMin: 0.3, hMax: 0.5, zwei: true, breit: 0.3 }); },
      (L, w, r, d) => { wandKleider(L, w, PAL.waesche, r, d, { panel: '#f2dfe4', zwei: true, breit: 0.3 }); },
      (L, w, r, d) => { wandRegal(L, w, 2.4, 4, '#f7eef0', prodPackungen(PAL.waesche), r, d, 0.4); bildtafel(L, 0, 2.9, 0.07, 2.2, 1.0, r, PAL.waesche); },
    ],
    insel: [
      (L, r, d) => { staender(L, -0.6, -0.9, 1.6, PAL.waesche, r, d, 1.3); staender(L, 0.6, 0.1, 1.6, PAL.waesche, r, d, 1.3); puppe(L, -0.9, 0.9, r, 'waesche', PAL.waesche); puppe(L, 1.1, -1.0, r, 'waesche', PAL.waesche); },
      (L, r, d) => { warenTisch(L, 0, -0.6, 2.2, 1.0, PAL.waesche, r, d, '#f7eef0', 0.75); puppe(L, -0.6, 0.9, r, 'waesche', PAL.waesche); puppe(L, 0.6, 0.9, r, 'waesche', PAL.waesche); L.zyl(0.35, 0.35, 0.42, 1.3, 0, 0.6, '#c9a3d4', 10); },
    ],
  },
  beauty: {
    wand: [
      (L, w, r, d) => markenwand(L, w, r, d),
      (L, w, r, d) => { markenwand(L.sub(-w / 4, 0), w / 2 - 0.05, r, d); markenwand(L.sub(w / 4, 0), w / 2 - 0.05, r, d); },
    ],
    insel: [
      (L, r, d) => tresenU(L, 0, 0, r, d),
      (L, r, d) => { vitrine(L, -0.5, -0.5, 1.6, 0.9, 0.95, '#f7f3ec', flakonFlaeche, r, d); spiegelSaeule(L, 1.2, 0.9); schminkplatz(L, -0.6, 1.0, r); },
      (L, r, d) => { flakonTurm(L, -0.8, -0.8, r, d); flakonTurm(L, 0.8, 0.8, r, d); vitrine(L, 0.8, -0.8, 1.0, 0.8, 0.95, '#1f1f1f', flakonFlaeche, r, d); spiegelSaeule(L, -0.9, 0.9); },
    ],
  },
  accessoires: {
    wand: [
      (L, w, r, d) => { wandRegal(L, w, 2.6, 5, '#f4efe7', prodSchuhe(PAL.schuhe), r, d, 0.4); },
      (L, w, r, d) => { wandRegal(L, w, 2.6, 4, '#c79f74', prodTaschen, r, d, 0.45); bildtafel(L, 0, 3.1, 0.07, 2.2, 1.0, r, PAL.taschen); },
    ],
    insel: [
      (L, r, d) => { schuhtisch(L, -0.7, -0.8, r, d); schuhtisch(L, 0.7, 0.7, r, d); pouf(L, 0.9, -0.9); pouf(L, -0.9, 0.9, '#c9a26b'); },
      (L, r, d) => { uhrenvitrine(L, 0, -0.7, r, d); taschenWuerfel(L, -0.6, 0.9, r, d); pouf(L, 1.1, 0.9, '#2f6f8f'); },
      (L, r, d) => { schuhtisch(L, 0, -0.9, r, d, 2.6); L.box(2.2, 0.42, 0.5, 0, 0, 0.5, '#7d8f9c'); L.box(2.2, 0.06, 0.5, 0, 0.42, 0.5, '#6c7d8a'); standspiegel(L, 1.4, 1.1, -0.6); taschenWuerfel(L, -1.0, 1.2, r, d, 1.0); },
    ],
  },
  wohnen: {
    wand: [
      (L, w, r, d) => wandRegal(L, w, 2.4, 4, '#ece6dc', prodGeschirr, r, d, 0.45),
      (L, w, r, d) => { wandRegal(L, w, 2.4, 4, '#b98d61', prodPackungen(['#f4f0e6', '#d8c6a8', '#9bc6d8', '#3f6b5a', '#d97a5a', '#2f5f8a']), r, d, 0.45); },
    ],
    insel: [
      (L, r, d) => sofaInsel(L, r, d),
      (L, r, d) => bettInsel(L, r, d),
      (L, r, d) => { L.box(2.4, 0.74, 1.1, 0, 0, -0.6, '#ece6dc'); L.box(2.48, 0.06, 1.18, 0, 0.74, -0.6, '#d9d1c4'); geschirrAufTisch(L, 0, -0.6, 2.2, 0.9, 0.8, r, d); stehlampe(L, 1.3, 0.9, r); stehlampe(L, -1.3, 0.9, r); L.box(1.4, 0.75, 0.7, 0, 0, 0.9, '#b98d61'); geschirrAufTisch(L, 0, 0.9, 1.2, 0.5, 0.75, r, d); },
    ],
  },
  spielwaren: {
    wand: [
      (L, w, r, d) => wandRegal(L, w, 2.3, 4, '#ffffff', prodPackungen(PAL.kinder), r, d, 0.45),
      (L, w, r, d) => { wandRegal(L, w, 2.3, 4, '#5bc0eb', prodPackungen(PAL.kinder), r, d, 0.45); for (let i = 0; i < 3; i++) teddy(L, -w / 2 + 0.8 + i * (w - 1.6) / 2, 2.32, 0.25, r, 0.8); },
    ],
    insel: [
      (L, r, d) => { gondel(L, 0, -0.5, 2.6, 1.6, '#ffffff', prodPackungen(PAL.kinder), r, d); pluschBerg(L, 0.4, 1.0, r, d); },
      (L, r, d) => spieltisch(L, r, d),
      (L, r, d) => { pluschBerg(L, -0.6, -0.6, r, d); gondel(L, 0.4, 0.9, 2.2, 1.4, '#ffd166', prodPackungen(PAL.kinder), r, d, PI / 2); },
    ],
  },
  food: {
    wand: [
      (L, w, r, d) => weinregal(L, w, r, d),
      (L, w, r, d) => wandRegal(L, w, 2.3, 4, '#7b5a40', prodPackungen(['#c9483e', '#f2c14e', '#5a3b22', '#e8dcc6', '#3f6b3a', '#d97a5a', '#2b2b2b']), r, d, 0.45),
    ],
    insel: [
      (L, r, d) => feinkosttheke(L, r, d),
      (L, r, d) => cafeEcke(L, r, d),
      (L, r, d) => { gondel(L, 0, -0.6, 2.6, 1.3, '#7b5a40', prodFlaschen(['#6d1f2a', '#3a5a2a', '#d8b25a', '#2b2b2b', '#a8452f'], 0.045, 0.34), r, d); obstStand(L, 0, 1.0, r, d); },
    ],
  },
  sport: {
    wand: [
      (L, w, r, d) => wandRegal(L, w, 2.5, 5, '#2a2d31', prodSchuhe(PAL.sport), r, d, 0.4),
      (L, w, r, d) => wandKleider(L, w, PAL.sport, r, d, { panel: '#2a2d31', zwei: true }),
    ],
    insel: [
      (L, r, d) => { staender(L, 0, -0.9, 2.2, PAL.sport, r, d); ballkorb(L, -0.8, 0.8, r, d); puppe(L, 0.6, 0.6, r, 'sport', PAL.sport); },
      (L, r, d) => { schuhtisch(L, 0, -0.6, r, d, 2.4, '#2a2d31', PAL.sport); fahrrad(L, -0.5, 1.0, r, 0); ballkorb(L, 1.1, 1.0, r, d); },
      (L, r, d) => { rundstaender(L, -0.8, -0.8, PAL.sport, r, d); staender(L, 0.6, 0.0, 1.6, PAL.sport, r, d); puppe(L, -0.9, 0.9, r, 'sport', PAL.sport); warenTisch(L, 0.7, 1.1, 1.0, 0.6, PAL.sport, r, d, '#2a2d31'); },
    ],
  },
  // ------------------------- Sporthaus
  sportschuhe: {
    wand: [(L, w, r, d) => schuhwand(L, w, r, d)],
    insel: [
      (L, r, d) => { schuhtisch(L, 0, -0.9, r, d, 2.6, '#2a2d31', PAL.sport); L.box(2.4, 0.45, 0.5, 0, 0, 0.4, '#38b86b'); L.box(2.4, 0.06, 0.5, 0, 0.45, 0.4, '#2f9e5c'); L.box(0.5, 0.25, 0.7, 0, 0, 1.2, '#e8403a'); },
      (L, r, d) => { schuhtisch(L, -0.6, -0.8, r, d, 1.6, '#ffffff', PAL.sport); schuhtisch(L, 0.7, 0.6, r, d, 1.6, '#ffffff', PAL.sport); L.box(1.4, 0.08, 0.5, -0.7, 0, 0.9, '#1f1f1f'); L.box(1.4, 0.012, 0.06, -0.7, 0.08, 0.9, '#ffcc00'); pouf(L, 1.2, -0.8, '#e8403a'); pouf(L, -1.3, 0.2, '#1f6fd1'); },
      (L, r, d) => { gondel(L, 0, -0.4, 2.8, 1.5, '#2a2d31', prodSchuhe(PAL.sport), r, d); L.box(2.4, 0.42, 0.5, 0, 0, 1.0, '#e8403a'); },
    ],
  },
  sporttextil: {
    wand: [(L, w, r, d) => wandKleider(L, w, PAL.sport, r, d, { panel: '#1f6fd1', zwei: true })],
    insel: [
      (L, r, d) => { rundstaender(L, -0.8, -0.8, PAL.sport, r, d); staender(L, 0.6, 0.2, 1.6, PAL.sport, r, d); puppe(L, -0.9, 0.9, r, 'sport', PAL.sport); puppe(L, 1.2, -1.0, r, 'sport', PAL.sport); },
      (L, r, d) => { puppenPodest(L, 0, -0.6, 'sport', PAL.sport, r, 2.6); warenTisch(L, 0, 0.9, 2.0, 0.8, PAL.sport, r, d, '#2a2d31'); },
    ],
  },
  outdoor: {
    wand: [
      (L, w, r, d) => rucksackwand(L, w, r, d),
      (L, w, r, d) => wandKleider(L, w, PAL.outdoor, r, d, { panel: '#7b5a40', zwei: false }),
    ],
    insel: [
      (L, r, d) => { zelt(L, -0.3, -0.3, r, 2.6); L.box(0.8, 0.4, 0.4, 1.3, 0, 1.2, '#7b5a40'); L.kugel(0.35, -1.3, 0.2, 1.2, '#9a9a94'); },
      (L, r, d) => { staender(L, 0, -0.9, 2.2, PAL.outdoor, r, d); puppe(L, -0.8, 0.7, r, 'herren', PAL.outdoor); warenTisch(L, 0.7, 0.8, 1.2, 0.8, PAL.outdoor, r, d, '#7b5a40'); },
      (L, r, d) => { zelt(L, 0.4, 0.2, r, 2.0); rucksackTurm(L, -1.1, -1.0, r, d); },
    ],
  },
  rad: {
    wand: [(L, w, r, d) => radwand(L, w, r, d)],
    insel: [
      (L, r, d) => { for (let i = 0; i < 3; i++) fahrrad(L, 0, -1.1 + i * 1.0, r, 0); },
      (L, r, d) => { L.box(2.6, 0.2, 1.4, 0, 0, -0.4, '#2a2d31'); fahrrad(L, -0.4, -0.6, r, 0, 0.2); fahrrad(L, 0.4, -0.2, r, 0, 0.2); wandRegal(L.sub(0, 0.6), 2.4, 1.2, 2, '#9aa3aa', prodPackungen(PAL.sport), r, d, 0.5); },
    ],
  },
  wintersport: {
    wand: [(L, w, r, d) => skiwand(L, w, r, d)],
    insel: [
      (L, r, d) => { skistaender(L, 0, -0.6, r, d); rundstaender(L, 0.8, 0.9, PAL.winter, r, d); L.box(0.8, 0.5, 0.6, -0.9, 0, 1.0, '#e8f0f5'); helme(L, -0.9, 0.5, 1.0, r); },
      (L, r, d) => { snowboardInsel(L, r, d); puppe(L, 1.1, 1.0, r, 'sport', PAL.winter); },
    ],
  },
  teamsport: {
    wand: [(L, w, r, d) => trikotwand(L, w, r, d)],
    insel: [
      (L, r, d) => { ballkorb(L, -0.8, -0.7, r, d); ballkorb(L, 0.8, -0.7, r, d); tor(L, 0, 0.8); },
      (L, r, d) => { puppenPodest(L, 0, -0.7, 'sport', ['#e8403a', '#ffffff', '#1f6fd1', '#ffcc00'], r, 2.4); ballkorb(L, 0.9, 0.9, r, d); warenTisch(L, -0.6, 0.9, 1.2, 0.7, PAL.sport, r, d, '#ffffff'); },
    ],
  },
};

// ---------- Beauty
function flakonFlaeche(L, x, y, z, w, t, r, d) {
  const nx = d < 0.5 ? 3 : 6, nz = 2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const f = bunt(r, PAL.flakon), h = zw(r, 0.12, 0.24);
    L.box(0.09, h, 0.09, x - w / 2 + (i + 0.5) * (w / nx), y, z - t / 2 + (j + 0.5) * (t / nz), f);
    if (d > 0.7 && (i + j) % 2) L.box(0.05, 0.05, 0.05, x - w / 2 + (i + 0.5) * (w / nx), y + h, z - t / 2 + (j + 0.5) * (t / nz), '#d8b25a');
  }
}
function markenwand(L, w, r, d) {
  const marke = bunt(r, PAL.beautyMarke);
  const hellm = new THREE.Color(marke).getHSL({}).l > 0.6;
  L.box(w, 3.2, 0.12, 0, 0, 0.06, marke);
  L.box(w - 0.3, 0.5, 0.04, 0, 2.6, 0.14, hellm ? '#1f1f1f' : '#f7f3ec'); // Markenband
  L.box(w * 0.4, 0.14, 0.02, 0, 2.78, 0.17, hellm ? '#f7f3ec' : marke);
  for (let i = 0; i < 4; i++) {
    const y = 0.9 + i * 0.42;
    L.box(w - 0.4, 0.03, 0.28, 0, y, 0.26, hellm ? '#ffffff' : '#e9e4dc');
    if (d < 0.5 && i % 2) continue;
    const n = Math.floor((w - 0.6) / 0.18);
    for (let k = 0; k < n; k++) L.box(0.1, zw(r, 0.14, 0.26), 0.1, -w / 2 + 0.4 + k * 0.18, y + 0.03, 0.26, bunt(r, PAL.flakon));
  }
  L.box(w - 0.3, 0.85, 0.5, 0, 0, 0.35, hellm ? '#ffffff' : dunkler(marke, 0.05)); // Unterschrank
  L.box(w - 0.3, 0.04, 0.52, 0, 0.85, 0.35, '#d8b25a');
}
function tresenU(L, lx, lz, r, d) {
  const marke = bunt(r, ['#f7f3ec', '#1f1f1f', '#e9a3b8', '#ffffff']);
  const teile = [[0, -1.1, 2.8, 0.7], [-1.05, 0.15, 0.7, 1.8], [1.05, 0.15, 0.7, 1.8]];
  for (const [dx, dz, ww, dd] of teile) {
    L.box(ww, 0.92, dd, lx + dx, 0, lz + dz, marke);
    L.box(ww + 0.04, 0.04, dd + 0.04, lx + dx, 0.92, lz + dz, '#d8b25a');
    flakonFlaeche(L, lx + dx, 0.96, lz + dz, ww - 0.15, dd - 0.15, r, d);
    L.box(ww, 0.3, dd, lx + dx, 0.96, lz + dz, GLAS);
  }
  // Rückwand mit Spiegel und Markenzeichen im U
  L.box(1.4, 1.9, 0.12, lx, 0, lz - 1.55, marke === '#1f1f1f' ? '#2b2b2b' : '#e9e4dc');
  L.box(0.8, 0.8, 0.03, lx, 1.0, lz - 1.48, '#e3edf1');
  L.box(1.4, 0.12, 0.14, lx, 1.9, lz - 1.55, '#d8b25a');
  figur(L.S, ...L.P(lx, lz - 0.5), (r() * 1e9) | 0, 'beauty', { y: L.oy, ry: L.rot });
}
function flakonTurm(L, lx, lz, r, d) {
  L.zyl(0.45, 0.5, 0.9, lx, 0, lz, '#f7f3ec', 8);
  L.zyl(0.47, 0.47, 0.04, lx, 0.9, lz, '#d8b25a', 8);
  const n = d < 0.5 ? 4 : 8;
  for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2; L.box(0.09, zw(r, 0.14, 0.26), 0.09, lx + Math.cos(a) * 0.3, 0.94, lz + Math.sin(a) * 0.3, bunt(r, PAL.flakon)); }
  L.box(0.14, 0.38, 0.14, lx, 0.94, lz, bunt(r, PAL.flakon));
}
function spiegelSaeule(L, lx, lz) {
  L.box(0.6, 2.6, 0.6, lx, 0, lz, '#e9e4dc');
  L.box(0.5, 1.6, 0.02, lx, 0.6, lz + 0.31, '#e3edf1');
  L.box(0.02, 1.6, 0.5, lx + 0.31, 0.6, lz, '#e3edf1');
}
function schminkplatz(L, lx, lz, r) {
  L.box(1.2, 0.8, 0.5, lx, 0, lz, '#ffffff');
  L.box(0.9, 0.7, 0.04, lx, 1.0, lz - 0.2, '#e3edf1');
  L.box(1.0, 0.05, 0.06, lx, 1.72, lz - 0.2, '#f6e8b0');
  L.zyl(0.2, 0.2, 0.62, lx, 0, lz + 0.55, '#e9a3b8', 8);
  for (let i = 0; i < 4; i++) L.box(0.06, 0.12, 0.06, lx - 0.4 + i * 0.25, 0.8, lz + 0.05, bunt(r, PAL.flakon));
}

// ---------- Schuhe und Accessoires
function schuhtisch(L, lx, lz, r, d, w = 1.6, farbe = '#f4efe7', pal = PAL.schuhe) {
  L.box(w, 0.7, 0.8, lx, 0, lz, farbe);
  L.box(w + 0.05, 0.05, 0.85, lx, 0.7, lz, dunkler(farbe, 0.1));
  const n = anz(Math.floor(w / 0.42), d, 0.5);
  for (let i = 0; i < n; i++) for (const j of [-0.18, 0.18]) {
    if (d < 0.7 && j > 0) continue;
    const u = lx - w / 2 + (i + 0.5) * (w / n), f = bunt(r, pal);
    L.box(0.1, 0.1, 0.26, u - 0.06, 0.75, lz + j, f, 0.3);
    L.box(0.1, 0.1, 0.26, u + 0.07, 0.75, lz + j, f, 0.3);
  }
}
function pouf(L, lx, lz, farbe = '#7d8f9c') { L.zyl(0.32, 0.32, 0.45, lx, 0, lz, farbe, 10); L.zyl(0.28, 0.32, 0.04, lx, 0.45, lz, dunkler(farbe, 0.06), 10); }
function uhrenvitrine(L, lx, lz, r, d) {
  vitrine(L, lx, lz, 2.4, 0.9, 0.95, '#2a2d31', (L2, x, y, z, w, t, r2) => {
    L2.box(w, 0.04, t, x, y, z, '#efe3cf');
    const n = d < 0.5 ? 4 : 9;
    for (let i = 0; i < n; i++) { const u = x - w / 2 + (i + 0.5) * (w / n); L2.box(0.08, 0.12, 0.08, u, y + 0.04, z, '#d8d0bc'); L2.zyl(0.06, 0.06, 0.03, u, y + 0.16, z, bunt(r2, ['#d8b25a', '#c9d2d8', '#2b2b2b', '#e8e4dc']), 8); }
  }, r, d);
  L.box(2.4, 0.5, 0.08, lx, 1.4, lz - 0.5, '#2a2d31');
}
function taschenWuerfel(L, lx, lz, r, d, w = 1.5) {
  const h = 1.6, f = '#e8e2d8';
  L.box(w, h, 0.5, lx, 0, lz, f);
  for (let i = 0; i < 3; i++) {
    const y = 0.1 + i * 0.5;
    L.box(w - 0.08, 0.04, 0.04, lx, y + 0.42, lz + 0.26, '#c9bfae');
    prodTaschen(L, lx, y + 0.04, lz + 0.18, w - 0.2, r, d, 0.4);
  }
}

// ---------- Wohnen
function sofaInsel(L, r, d) {
  const stoff = bunt(r, ['#5f7f8c', '#b5745a', '#7a8a5c', '#9a8fbf', '#d3b48a', '#4b5a6b']);
  L.box(3.0, 0.02, 2.2, 0, 0, 0.1, bunt(r, ['#e6d9c3', '#c9b8a6', '#d8dfe4', '#e2c9b8']));
  L.box(2.4, 0.42, 0.95, 0, 0, -0.75, stoff);
  L.box(2.4, 0.5, 0.25, 0, 0.42, -1.1, dunkler(stoff, 0.04));
  L.box(0.22, 0.25, 0.95, -1.1, 0.42, -0.75, dunkler(stoff, 0.04));
  L.box(0.22, 0.25, 0.95, 1.1, 0.42, -0.75, dunkler(stoff, 0.04));
  for (const x of [-0.6, 0.55]) L.box(0.45, 0.35, 0.14, x, 0.48, -0.88, bunt(r, ['#f2e6d0', '#e9b44c', '#d65a6f', '#ffffff']), zw(r, -0.2, 0.2));
  L.box(1.2, 0.42, 0.6, 0, 0, 0.35, HOLZ.mittel);
  L.box(0.12, 0.2, 0.12, -0.3, 0.42, 0.35, '#3f6b5a');
  L.kugel(0.18, -0.3, 0.72, 0.35, '#6fa860');
  L.box(0.3, 0.05, 0.22, 0.25, 0.42, 0.3, '#f4f0e6');
  L.box(0.8, 0.45, 0.75, 1.1, 0, 0.95, stoff, -0.5);
  L.box(0.8, 0.45, 0.2, 1.25, 0.45, 0.7, dunkler(stoff, 0.04), -0.5);
  stehlampe(L, -1.35, 0.9, r);
}
function bettInsel(L, r, d) {
  const bezug = bunt(r, ['#f4f0e6', '#d8e3ea', '#e9d6cf', '#ffffff']);
  L.box(2.0, 0.45, 2.4, 0, 0, -0.1, HOLZ.mittel);
  L.box(1.9, 0.25, 2.3, 0, 0.45, -0.1, '#ffffff');
  L.box(1.92, 0.08, 1.6, 0, 0.7, 0.25, bezug);
  L.box(2.0, 1.1, 0.12, 0, 0, -1.35, dunkler(HOLZ.mittel, 0.05));
  L.box(0.75, 0.18, 0.45, -0.45, 0.7, -0.95, '#ffffff', 0.05);
  L.box(0.75, 0.18, 0.45, 0.45, 0.7, -0.95, '#ffffff', -0.05);
  L.box(1.92, 0.04, 0.5, 0, 0.78, 0.8, bunt(r, ['#b5745a', '#5f7f8c', '#7a8a5c', '#9a8fbf']));
  for (const x of [-1.35, 1.35]) { L.box(0.5, 0.5, 0.45, x, 0, -1.0, HOLZ.weiss); L.zyl(0.04, 0.06, 0.3, x, 0.5, -1.0, '#2a2d31', 6); L.zyl(0.12, 0.16, 0.18, x, 0.8, -1.0, '#f6e8b0', 8); }
}
function stehlampe(L, lx, lz, r) {
  L.zyl(0.18, 0.2, 0.04, lx, 0, lz, '#2a2d31', 8);
  L.zyl(0.02, 0.02, 1.5, lx, 0.04, lz, '#2a2d31', 4);
  L.zyl(0.16, 0.26, 0.3, lx, 1.5, lz, bunt(r, ['#f6e8b0', '#ffffff', '#e9b44c', '#d8c6a8']), 8);
}
function geschirrAufTisch(L, lx, lz, w, t, y, r, d) {
  const nx = d < 0.5 ? 3 : 5;
  for (let i = 0; i < nx; i++) for (const j of [-0.25, 0.2]) {
    const u = lx - w / 2 + (i + 0.5) * (w / nx), f = bunt(r, PAL.geschirr);
    if ((i + (j > 0)) % 2) L.zyl(0.16, 0.16, zw(r, 0.06, 0.2), u, y, lz + j * t, f, 10);
    else { L.zyl(0.06, 0.05, 0.11, u - 0.08, y, lz + j * t, f, 6); L.zyl(0.06, 0.05, 0.11, u + 0.08, y, lz + j * t + 0.06, f, 6); }
  }
}

// ---------- Spielwaren
function teddy(L, lx, y, lz, r, s = 1) {
  const f = bunt(r, ['#b5835a', '#e9c79a', '#f78fb3', '#ffffff', '#8c6a4f', '#7b6cf6', '#5bc0eb']);
  L.kugel(0.2 * s, lx, y + 0.18 * s, lz, f);
  L.kugel(0.15 * s, lx, y + 0.48 * s, lz + 0.02, f);
  L.kugel(0.06 * s, lx - 0.11 * s, y + 0.6 * s, lz, f);
  L.kugel(0.06 * s, lx + 0.11 * s, y + 0.6 * s, lz, f);
}
function pluschBerg(L, lx, lz, r, d) {
  L.zyl(0.9, 1.0, 0.45, lx, 0, lz, '#ffd166', 10);
  L.zyl(0.92, 0.92, 0.04, lx, 0.45, lz, '#ef5b5b', 10);
  const n = d < 0.5 ? 4 : 8;
  for (let i = 0; i < n; i++) { const a = (i / n) * PI * 2, rr = i < 5 ? 0.55 : 0.15; teddy(L, lx + Math.cos(a) * rr, 0.48 + (i >= 5 ? 0.3 : 0), lz + Math.sin(a) * rr, r, zw(r, 0.75, 1.1)); }
}
function gondel(L, lx, lz, w, h, farbe, prod, r, d, ry = 0) {
  const G = L.sub(lx, lz, ry);
  G.box(w, h, 0.06, 0, 0, 0, farbe);
  G.box(w, 0.08, 0.9, 0, h, 0, dunkler(farbe, 0.1));
  G.box(w, 0.2, 0.9, 0, 0, 0, dunkler(farbe, 0.12));
  const boeden = Math.max(2, Math.round(h / 0.5));
  for (const seite of [1, -1]) {
    const S2 = G.sub(0, 0, seite > 0 ? 0 : PI);
    for (let i = 0; i < boeden; i++) {
      const y = 0.2 + (i * (h - 0.25)) / boeden;
      if (i) S2.box(w - 0.06, 0.03, 0.4, 0, y, 0.23, '#e9e4dc');
      if (d < 0.5 && i % 2) continue;
      prod(S2, 0, y + 0.03, 0.25, w - 0.12, r, d, (h - 0.25) / boeden - 0.06);
    }
  }
  G.box(0.06, h + 0.08, 0.9, -w / 2, 0, 0, dunkler(farbe, 0.15));
  G.box(0.06, h + 0.08, 0.9, w / 2, 0, 0, dunkler(farbe, 0.15));
}
function spieltisch(L, r, d) {
  L.box(2.4, 0.55, 1.6, 0, 0, -0.2, '#5bc0eb');
  L.box(2.5, 0.05, 1.7, 0, 0.55, -0.2, '#ffffff');
  L.box(2.2, 0.02, 1.4, 0, 0.6, -0.2, '#9bc53d');
  L.geo(new THREE.TorusGeometry(0.5, 0.03, 3, 16).rotateX(PI / 2).scale(1.6, 1, 1), 0, 0.63, -0.2, '#7a5d43');
  for (let i = 0; i < 4; i++) L.box(0.22, 0.14, 0.12, -0.6 + i * 0.25, 0.64, 0.3, ['#ef5b5b', '#ffc145', '#5bc0eb', '#9bc53d'][i]);
  for (let i = 0; i < (d < 0.5 ? 4 : 9); i++) L.box(zw(r, 0.15, 0.3), zw(r, 0.1, 0.35), zw(r, 0.15, 0.3), zw(r, -0.9, 0.9), 0.62, zw(r, -0.7, 0.0), bunt(r, PAL.kinder));
  for (const [x, z] of [[-0.7, 0.95], [0.6, 1.0]]) figur(L.S, ...L.P(x, z), (r() * 1e9) | 0, 'kind', { y: L.oy, ry: L.rot + PI });
  L.box(0.6, 0.4, 0.6, 1.3, 0, 1.1, '#ef5b5b');
  teddy(L, 1.3, 0.4, 1.1, r, 0.9);
}

// ---------- Feinkost
function weinregal(L, w, r, d) {
  L.box(w, 2.5, 0.08, 0, 0, 0.04, '#5a3b2a');
  const nx = Math.floor(w / 1.2);
  for (let i = 0; i <= nx; i++) L.box(0.06, 2.4, 0.45, -w / 2 + 0.05 + i * ((w - 0.1) / nx), 0, 0.25, '#7b5a40');
  const reihen = d < 0.5 ? 4 : 6;
  for (let j = 0; j < reihen; j++) {
    const y = 0.15 + j * (2.2 / reihen);
    L.box(w - 0.1, 0.03, 0.42, 0, y, 0.25, '#7b5a40');
    L.box(w - 0.15, 0.09, 0.26, 0, y + 0.04, 0.2, '#3a2420');
    const n = Math.floor((w - 0.2) / (d < 0.5 ? 0.45 : 0.27 / Math.min(1, d + 0.1)));
    for (let k = 0; k < n; k++) L.box(0.085, 0.085, 0.12, -w / 2 + 0.2 + k * ((w - 0.3) / n), y + 0.045, 0.39, bunt(r, ['#4a1a22', '#6d1f2a', '#2f4a22', '#d8b25a', '#e8dcc0']));
  }
  L.box(w, 0.5, 0.04, 0, 2.6, 0.06, '#2a1f1a');
  L.box(1.4, 0.95, 0.6, w / 2 - 1.0, 0, 0.9, '#7b5a40');
  for (let i = 0; i < 6; i++) L.box(0.08, 0.3, 0.08, w / 2 - 1.5 + i * 0.2, 0.95, 0.9, bunt(r, ['#4a1a22', '#6d1f2a', '#2f4a22']));
}
function feinkosttheke(L, r, d) {
  const w = 3.2;
  L.box(w, 0.9, 0.9, 0, 0, -0.2, '#ffffff');
  L.box(w, 0.06, 0.1, 0, 0.2, 0.27, '#d23c32');
  L.box(w, 0.05, 0.95, 0, 0.9, -0.2, '#c9d2d8');
  const waren = ['#e9b44c', '#d97a5a', '#f4e1c0', '#b5162b', '#9bc53d', '#f2c6d2', '#c9a26b', '#ffffff', '#6d1f2a'];
  const n = d < 0.5 ? 5 : 10;
  for (let i = 0; i < n; i++) {
    const u = -w / 2 + 0.2 + (i + 0.5) * ((w - 0.4) / n), f = bunt(r, waren);
    L.box((w - 0.5) / n - 0.05, 0.03, 0.5, u, 0.95, -0.2, '#f4f4f2');
    L.box((w - 0.5) / n - 0.12, zw(r, 0.06, 0.16), 0.38, u, 0.98, -0.2, f);
  }
  L.box(w, 0.06, 0.6, 0, 1.45, -0.35, '#c9d2d8');
  const g = new THREE.BoxGeometry(w, 0.55, 0.04); g.rotateX(-0.45);
  L.geo(g, 0, 1.2, 0.12, GLAS);
  L.box(w, 0.04, 0.04, 0, 1.44, 0.0, '#c9d2d8');
  // Rückseite: Kühlregal und Personal
  L.box(w, 2.0, 0.5, 0, 0, -1.55, '#e9e4dc');
  for (let j = 0; j < 3; j++) for (let k = 0; k < (d < 0.5 ? 4 : 9); k++) L.box(0.25, 0.25, 0.25, -w / 2 + 0.3 + k * 0.33, 0.6 + j * 0.45, -1.28, bunt(r, waren));
  figur(L.S, ...L.P(-0.6, -0.95), (r() * 1e9) | 0, 'theke', { y: L.oy, ry: L.rot });
  figur(L.S, ...L.P(0.9, -0.95), (r() * 1e9) | 0, 'theke', { y: L.oy, ry: L.rot + 0.3 });
}
export function cafeEcke(L, r, d, n = 2) {
  for (const [x, z] of [[-0.85, -0.8], [0.85, 0.8], [0.9, -0.85], [-0.9, 0.85]].slice(0, d < 0.5 ? 2 : 4)) {
    L.zyl(0.4, 0.4, 0.04, x, 0.74, z, '#f4f0ea', 12);
    L.zyl(0.04, 0.04, 0.74, x, 0, z, '#2a2d31', 4);
    L.zyl(0.22, 0.22, 0.03, x, 0, z, '#2a2d31', 8);
    L.zyl(0.05, 0.04, 0.09, x + 0.1, 0.78, z, '#ffffff', 6);
    for (const a of [0, PI]) {
      const cx = x + Math.cos(a) * 0.62, cz = z + Math.sin(a) * 0.62;
      stuhl(L, cx, cz, -a - PI / 2, '#3a4a5a');
      if (r() < 0.55) figur(L.S, ...L.P(cx, cz), (r() * 1e9) | 0, 'kunde', { y: L.oy, ry: L.rot - a - PI / 2, pose: 'sitzen', y: L.oy });
    }
  }
}
/** Stuhl, Sitz schaut nach lokal -x gedreht um ry. */
function stuhl(L, lx, lz, ry, farbe) {
  const P = L.sub(lx, lz, ry);
  P.box(0.45, 0.06, 0.45, 0, 0.42, 0, farbe);
  P.box(0.45, 0.45, 0.06, 0, 0.48, -0.2, farbe);
  P.box(0.04, 0.42, 0.04, -0.2, 0, 0.2, '#2a2d31');
  P.box(0.04, 0.42, 0.04, 0.2, 0, 0.2, '#2a2d31');
  P.box(0.04, 0.42, 0.04, -0.2, 0, -0.2, '#2a2d31');
  P.box(0.04, 0.42, 0.04, 0.2, 0, -0.2, '#2a2d31');
}
function obstStand(L, lx, lz, r, d) {
  const w = 2.4;
  L.box(w, 0.7, 1.0, lx, 0, lz, '#a07b5a');
  const korb = ['#e8403a', '#f2c14e', '#9bc53d', '#ff8c42', '#7b2f5a', '#f4e1c0'];
  for (let i = 0; i < 4; i++) for (const j of [-0.22, 0.22]) {
    const u = lx - w / 2 + (i + 0.5) * (w / 4), f = bunt(r, korb);
    const g = new THREE.BoxGeometry(0.52, 0.2, 0.4); g.rotateX(j > 0 ? 0.25 : 0.1);
    L.geo(g, u, 0.8 + (j < 0 ? 0.12 : 0), lz + j, '#c9a26b');
    L.box(0.46, 0.08, 0.34, u, 0.9 + (j < 0 ? 0.12 : 0), lz + j, f);
  }
}

// ---------- Sporthaus
function schuhwand(L, w, r, d) {
  L.box(w, 3.0, 0.08, 0, 0, 0.04, '#1f1f1f');
  L.box(w, 0.5, 0.04, 0, 3.0, 0.06, '#e8403a');
  const reihen = d < 0.5 ? 3 : 6;
  for (let j = 0; j < reihen; j++) {
    const y = 0.4 + j * (2.4 / reihen);
    const n = Math.floor((w - 0.3) / 0.38);
    L.box(w - 0.3, 0.03, 0.22, 0, y - 0.03, 0.15, '#c9d2d8');
    for (let k = 0; k < n; k++) {
      const u = -w / 2 + 0.3 + k * 0.38, f = bunt(r, PAL.sport);
      L.box(0.28, 0.11, 0.12, u, y, 0.15, f);
      L.box(0.28, 0.03, 0.13, u, y, 0.15, '#ffffff');
    }
  }
  L.box(1.6, 0.42, 0.45, -w / 4, 0, 0.9, '#2a2d31');
  L.box(1.6, 0.06, 0.45, -w / 4, 0.42, 0.9, '#e8403a');
}
function rucksackwand(L, w, r, d) {
  L.box(w, 2.8, 0.08, 0, 0, 0.04, '#7b5a40');
  for (let j = 0; j < 3; j++) {
    const y = 0.4 + j * 0.85;
    L.box(w - 0.2, 0.04, 0.06, 0, y + 0.55, 0.1, '#9aa3aa');
    const n = anz(Math.floor((w - 0.3) / 0.55), d, 0.5);
    for (let k = 0; k < n; k++) {
      const u = -w / 2 + 0.4 + (k + 0.5) * ((w - 0.8) / n), f = bunt(r, PAL.outdoor);
      L.box(0.38, 0.55, 0.22, u, y, 0.2, f);
      L.box(0.3, 0.2, 0.06, u, y + 0.08, 0.33, dunkler(f, 0.08));
    }
  }
}
function rucksackTurm(L, lx, lz, r, d) {
  L.box(0.8, 1.6, 0.8, lx, 0, lz, '#7b5a40');
  for (let j = 0; j < 3; j++) for (const s of [0, 1]) { const f = bunt(r, PAL.outdoor); s ? L.box(0.36, 0.42, 0.18, lx + 0.49, 0.15 + j * 0.5, lz, f) : L.box(0.36, 0.42, 0.18, lx, 0.15 + j * 0.5, lz + 0.49, f); }
}
function zelt(L, lx, lz, r, w = 2.6) {
  const f = bunt(r, ['#e0a33a', '#3f6b3a', '#c25b2a', '#2f5f8a']);
  L.box(w + 0.6, 0.04, w * 0.9, lx, 0, lz, '#8a9a5b');
  const g = new THREE.ConeGeometry(w * 0.72, 1.6, 4, 1); g.rotateY(PI / 4); g.scale(1, 1, 0.72); g.translate(0, 0.8, 0);
  L.geo(g, lx, 0.04, lz, f);
  L.box(0.5, 0.9, 0.04, lx, 0.04, lz + w * 0.33, '#30343a');
  L.box(0.04, 1.7, 0.04, lx, 0.04, lz, '#9aa3aa');
}
function fahrrad(L, lx, lz, r, ry = 0, y = 0) {
  const P = L.sub(lx, lz, ry);
  const f = bunt(r, ['#e8403a', '#1f6fd1', '#1f1f1f', '#38b86b', '#ffcc00', '#f2f2f2', '#7a3cd1']);
  const rad = 0.33;
  for (const x of [-0.52, 0.52]) P.geo(new THREE.TorusGeometry(rad, 0.035, 4, 14), x, y + rad, 0, '#1f1f1f');
  P.geo(new THREE.BoxGeometry(0.75, 0.05, 0.05).rotateZ(-0.15), 0, y + 0.66, 0, f);
  P.geo(new THREE.BoxGeometry(0.7, 0.05, 0.05).rotateZ(0.75), -0.1, y + 0.5, 0, f);
  P.geo(new THREE.BoxGeometry(0.55, 0.05, 0.05).rotateZ(-0.65), 0.3, y + 0.5, 0, f);
  P.box(0.05, 0.42, 0.05, 0.42, y + 0.4, 0, f);
  P.box(0.22, 0.04, 0.1, -0.22, y + 0.82, 0, '#1f1f1f');
  P.box(0.05, 0.05, 0.42, 0.44, y + 0.85, 0, '#1f1f1f');
}
function radwand(L, w, r, d) {
  L.box(w, 3.2, 0.08, 0, 0, 0.04, '#d9dde0');
  L.box(w, 0.06, 0.1, 0, 2.95, 0.08, '#9aa3aa');
  const n = Math.max(1, Math.floor(w / 1.3));
  for (let i = 0; i < n; i++) {
    const u = -w / 2 + (i + 0.5) * (w / n);
    L.box(0.05, 0.05, 0.4, u, 2.3, 0.25, '#2a2d31');
    fahrrad(L, u, 0.35, r, 0, 1.25);
  }
  for (let i = 0; i < (d < 0.5 ? 3 : 6); i++) L.box(0.3, 0.3, 0.3, -w / 2 + 0.4 + i * 0.4, 0, 0.3, bunt(r, PAL.sport));
}
function skiwand(L, w, r, d) {
  L.box(w, 3.0, 0.08, 0, 0, 0.04, '#e8f0f5');
  L.box(w, 0.06, 0.24, 0, 1.8, 0.14, '#9aa3aa');
  const n = anz(Math.floor((w - 0.3) / 0.24), d, 0.5);
  for (let i = 0; i < n; i++) L.box(0.1, 1.75, 0.03, -w / 2 + 0.3 + i * ((w - 0.6) / n), 0.15, 0.12, bunt(r, PAL.winter), 0);
  L.box(w - 0.4, 0.04, 0.35, 0, 2.3, 0.2, '#c9d2d8');
  helme(L, 0, 2.34, 0.2, r, w - 0.6);
}
function helme(L, lx, y, lz, r, w = 0.6) {
  const n = Math.max(1, Math.floor(w / 0.35));
  for (let i = 0; i < n; i++) L.geo(new THREE.SphereGeometry(0.13, 8, 4, 0, PI * 2, 0, PI / 2), lx - w / 2 + (i + 0.5) * (w / n), y, lz, bunt(r, PAL.winter));
}
function skistaender(L, lx, lz, r, d) {
  L.box(2.4, 0.15, 0.6, lx, 0, lz, '#9aa3aa');
  L.box(2.4, 0.06, 0.1, lx, 1.2, lz - 0.2, '#9aa3aa');
  L.box(0.06, 1.2, 0.06, lx - 1.15, 0, lz - 0.2, '#9aa3aa');
  L.box(0.06, 1.2, 0.06, lx + 1.15, 0, lz - 0.2, '#9aa3aa');
  const n = d < 0.5 ? 7 : 14;
  for (let i = 0; i < n; i++) L.geo(new THREE.BoxGeometry(0.09, 1.7, 0.03).rotateX(-0.12), lx - 1.05 + i * (2.1 / (n - 1)), 0.95, lz - 0.05, bunt(r, PAL.winter));
}
function snowboardInsel(L, r, d) {
  L.box(2.6, 0.2, 1.0, 0, 0, -0.8, '#e8f0f5');
  L.box(2.6, 1.8, 0.08, 0, 0.2, -1.25, '#1f6fd1');
  for (let i = 0; i < (d < 0.5 ? 3 : 6); i++) L.geo(new THREE.BoxGeometry(0.28, 1.5, 0.04).rotateX(-0.15), -1.05 + i * 0.42, 0.95, -1.05, bunt(r, PAL.winter));
  rundstaender(L, -0.5, 0.8, PAL.winter, r, d);
}
function trikotwand(L, w, r, d) {
  L.box(w, 3.0, 0.08, 0, 0, 0.04, '#1f1f1f');
  const vereine = [['#e8403a', '#ffffff'], ['#1f6fd1', '#ffffff'], ['#ffcc00', '#1f1f1f'], ['#38b86b', '#ffffff'], ['#ffffff', '#e8403a'], ['#7a3cd1', '#ffcc00']];
  const n = Math.floor(w / 0.75);
  for (let j = 0; j < (d < 0.5 ? 2 : 3); j++) for (let i = 0; i < n; i++) {
    const [a, b] = vereine[(i + j * 2) % vereine.length];
    const u = -w / 2 + (i + 0.5) * (w / n), y = 0.5 + j * 0.85;
    L.box(0.42, 0.55, 0.04, u, y, 0.1, a);
    L.box(0.66, 0.16, 0.04, u, y + 0.4, 0.1, a);
    L.box(0.12, 0.2, 0.02, u, y + 0.25, 0.13, b);
  }
}
function ballkorb(L, lx, lz, r, d) {
  L.box(0.9, 0.55, 0.9, lx, 0, lz, '#c9d2d8');
  L.box(0.8, 0.5, 0.8, lx, 0.06, lz, '#4b5560');
  const n = d < 0.5 ? 4 : 9;
  for (let i = 0; i < n; i++) L.geo(new THREE.IcosahedronGeometry(0.15, 1), lx - 0.27 + (i % 3) * 0.27, 0.62 + (i > 5 ? 0.18 : 0), lz - 0.27 + Math.floor(i / 3) % 3 * 0.27, bunt(r, ['#ffffff', '#ff6a2b', '#ffcc00', '#ffffff', '#e8403a']));
}
function tor(L, lx, lz) {
  L.box(2.4, 0.08, 0.08, lx, 1.3, lz, '#ffffff');
  L.box(0.08, 1.3, 0.08, lx - 1.16, 0, lz, '#ffffff');
  L.box(0.08, 1.3, 0.08, lx + 1.16, 0, lz, '#ffffff');
  L.box(2.4, 1.3, 0.02, lx, 0, lz - 0.6, '#dfe5e8');
}

// ---------------------------------------------------------------- Konzepte
const MARKEN = [
  { name: 'Lindqvist', farbe: '#2c3e50', schrift: '#f4efe6', boden: '#e8e1d6', gruppe: 'damen' },
  { name: 'Casa Orvieto', farbe: '#b5745a', schrift: '#ffffff', boden: '#efe3d2', gruppe: 'wohnen' },
  { name: 'NORDKAMM', farbe: '#1f1f1f', schrift: '#ffffff', boden: '#d9d9d9', gruppe: 'outdoor' },
  { name: 'Maison Belrose', farbe: '#e9c9cf', schrift: '#6b2737', boden: '#f7efe9', gruppe: 'beauty' },
  { name: 'Kordel & Co.', farbe: '#3f6b5a', schrift: '#f4efe6', boden: '#e4ddd0', gruppe: 'herren' },
  { name: 'Pünktchen', farbe: '#ffd166', schrift: '#7b2f5a', boden: '#fdf3d6', gruppe: 'kinder' },
];
export const MIETER = {
  discounter: { name: 'Frischmarkt Kolb', farbe: '#1f5fa8', schrift: '#ffd400' },
  fitness: { name: 'Kraftwerk Fitness', farbe: '#1f1f1f', schrift: '#ff6a2b' },
  arzt: { name: 'Praxis am Markt', farbe: '#e9f1f4', schrift: '#2f6f8f' },
  gastro: { name: 'Café Sole', farbe: '#4f8a5b', schrift: '#fff8e6' },
};
export function marke(seed) { return MARKEN[Math.abs(seed | 0) % MARKEN.length]; }

/** Schrift als Fläche (Textur) im lokalen Rahmen, zeigt nach lokal +z (oder nach oben, wenn liegend). */
function schrift(L, text, lx, ly, lz, hoehe, farbe, hg = null, liegend = false) {
  const scene = L.S.szene; if (!scene) return;
  const { mat, seitenverhaeltnis } = textMaterial(text, farbe, { groesse: 120, hintergrund: hg, versatz: -2 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(hoehe * seitenverhaeltnis, hoehe), mat);
  const [X, Z] = L.P(lx, lz);
  m.position.set(X, L.oy + ly, Z);
  m.rotation.order = 'YXZ';
  m.rotation.y = L.rot;
  if (liegend) m.rotation.x = -PI / 2;
  scene.add(m);
  return m;
}

/** Gelbes Preisschild mit rotem Preis auf Stange. */
function preisschild(L, lx, lz, text, hoch = 1.9) {
  L.box(0.04, hoch, 0.04, lx, 0, lz, '#9aa3aa');
  L.box(0.9, 0.5, 0.04, lx, hoch, lz, '#ffd400');
  schrift(L, text, lx, hoch + 0.25, lz + 0.03, 0.38, '#d4212a');
}
function wuehltisch(L, lx, lz, r, d, w = 2.2) {
  L.box(w, 0.75, 1.1, lx, 0, lz, '#c9d2d8');
  L.box(w, 0.25, 1.1, lx, 0.75, lz, '#9aa3aa');
  L.box(w - 0.1, 0.1, 1.0, lx, 0.8, lz, '#5a636b');
  const n = d < 0.5 ? 6 : 14;
  for (let i = 0; i < n; i++) L.box(zw(r, 0.3, 0.5), zw(r, 0.08, 0.2), zw(r, 0.25, 0.4), lx + zw(r, -w / 2 + 0.3, w / 2 - 0.3), 0.88, lz + zw(r, -0.35, 0.35), bunt(r, PAL.damen.concat(PAL.kinder)), zw(r, -1, 1));
}
function gitterbox(L, lx, lz, r, d) {
  const w = 1.2, t = 1.0, h = 0.95;
  L.box(w, 0.12, t, lx, 0, lz, '#7b5a40');
  const n = d < 0.5 ? 4 : 8;
  for (let i = 0; i < n; i++) L.box(zw(r, 0.3, 0.5), zw(r, 0.2, 0.4), zw(r, 0.3, 0.5), lx + zw(r, -0.35, 0.35), 0.12 + (i > 4 ? 0.35 : 0), lz + zw(r, -0.3, 0.3), bunt(r, PAL.waren), zw(r, -1, 1));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) L.box(0.04, h, 0.04, lx + sx * w / 2, 0.12, lz + sz * t / 2, '#8c959b');
  for (const y of [0.45, h + 0.1]) { L.box(w, 0.03, 0.03, lx, y, lz + t / 2, '#8c959b'); L.box(w, 0.03, 0.03, lx, y, lz - t / 2, '#8c959b'); L.box(0.03, 0.03, t, lx + w / 2, y, lz, '#8c959b'); L.box(0.03, 0.03, t, lx - w / 2, y, lz, '#8c959b'); }
  if (d > 0.6) for (let i = 1; i < 5; i++) { L.box(0.02, h, 0.02, lx - w / 2 + i * w / 5, 0.12, lz + t / 2, '#8c959b'); L.box(0.02, h, 0.02, lx + w / 2, 0.12, lz - t / 2 + i * t / 5, '#8c959b'); }
}
const PREISE = ['−30 %', '−50 %', 'ab 5 €', '−70 %', '9,99 €', 'ab 2 €'];

/** Abdeckplane über einem Möbel. */
function abgedeckt(L, lx, lz, w, h, t, ry = 0) {
  const P = L.sub(lx, lz, ry);
  P.box(w, h, t, 0, 0, 0, '#e6e3dc');
  P.box(w + 0.1, 0.12, t + 0.1, 0, 0, 0, '#d9d5cc');
  P.geo(new THREE.BoxGeometry(w * 0.6, 0.15, t * 0.7).rotateZ(0.1), 0, h, 0, '#ebe8e2');
}
function kartons(L, lx, lz, r, n = 4) {
  for (let i = 0; i < n; i++) {
    const w = zw(r, 0.4, 0.7), h = zw(r, 0.3, 0.55);
    const stapelY = i >= 3 ? 0.5 : 0;
    L.box(w, h, w * zw(r, 0.7, 1), lx + (i % 3) * 0.55 - 0.5, stapelY, lz + (i % 2) * 0.3, bunt(r, ['#c9a26b', '#b8925e', '#d6b27c']), zw(r, -0.3, 0.3));
  }
}
function absperrung(L, a, b, lz) {
  const n = Math.max(1, Math.round((b - a) / 1.6));
  for (let i = 0; i <= n; i++) { const u = a + (i * (b - a)) / n; L.zyl(0.15, 0.17, 0.05, u, 0, lz, '#2a2d31', 6); L.box(0.06, 1.0, 0.06, u, 0, lz, '#e8403a'); }
  const s = (b - a) / 10;
  for (let i = 0; i < 10; i++) L.box(s, 0.07, 0.02, a + (i + 0.5) * s, 0.92, lz, i % 2 ? '#ffffff' : '#e8403a');
}
function bauzaun(L, a, b, lz) {
  const n = Math.max(1, Math.round((b - a) / 2.2));
  const s = (b - a) / n;
  for (let i = 0; i < n; i++) {
    const u = a + (i + 0.5) * s;
    L.box(s - 0.04, 0.05, 0.05, u, 1.95, lz, '#9aa3aa');
    L.box(s - 0.04, 0.05, 0.05, u, 0.15, lz, '#9aa3aa');
    L.box(s - 0.1, 1.75, 0.02, u, 0.2, lz, '#dfe5e8');
    for (let k = 1; k < 5; k++) L.box(0.02, 1.75, 0.03, u - s / 2 + (k * s) / 5, 0.2, lz, '#b9c2c8');
    L.box(s * 0.6, 0.35, 0.03, u, 1.2, lz + 0.02, i % 2 ? '#d23c32' : '#ffffff');
  }
  for (let i = 0; i <= n; i++) { L.box(0.6, 0.14, 0.22, a + i * s, 0, lz, '#c9483e'); L.box(0.05, 2.0, 0.05, a + i * s, 0.1, lz, '#9aa3aa'); }
}
function leiter(L, lx, lz, ry = 0) {
  const P = L.sub(lx, lz, ry);
  P.geo(new THREE.BoxGeometry(0.06, 2.0, 0.06).rotateX(0.25), -0.25, 0.97, 0.24, '#d39a2b');
  P.geo(new THREE.BoxGeometry(0.06, 2.0, 0.06).rotateX(0.25), 0.25, 0.97, 0.24, '#d39a2b');
  P.geo(new THREE.BoxGeometry(0.06, 2.0, 0.06).rotateX(-0.25), -0.25, 0.97, -0.24, '#d39a2b');
  P.geo(new THREE.BoxGeometry(0.06, 2.0, 0.06).rotateX(-0.25), 0.25, 0.97, -0.24, '#d39a2b');
  for (let i = 1; i < 5; i++) P.box(0.5, 0.04, 0.06, 0, i * 0.38, 0.48 - i * 0.095, '#c4891f');
  P.box(0.56, 0.06, 0.2, 0, 1.92, 0, '#c4891f');
}
function material(L, lx, lz, r) {
  for (let i = 0; i < 5; i++) L.box(2.4, 0.04, 1.2, lx, i * 0.045, lz, i % 2 ? '#ebe9e4' : '#e0ddd6'); // Gipskarton
  for (let i = 0; i < 4; i++) L.box(2.6, 0.1, 0.12, lx, 0.25 + Math.floor(i / 2) * 0.1, lz + 0.8 + (i % 2) * 0.14, '#c9a26b');
  L.box(0.8, 0.12, 0.8, lx + 1.6, 0, lz - 0.2, '#7b5a40');
  for (let i = 0; i < 3; i++) L.zyl(0.16, 0.16, 0.36, lx + 1.4 + (i % 2) * 0.35, 0.12, lz - 0.4 + i * 0.22, bunt(r, ['#e8e4dc', '#9aa3aa', '#2f6f8f']), 8);
}
function schutt(L, lx, lz, r, n = 10) {
  for (let i = 0; i < n; i++) L.box(zw(r, 0.15, 0.4), zw(r, 0.1, 0.25), zw(r, 0.15, 0.4), lx + zw(r, -0.6, 0.6), 0, lz + zw(r, -0.5, 0.5), bunt(r, ['#8d8a84', '#a7a49d', '#b9785e', '#6b6e72']), zw(r, 0, 3));
  L.box(1.0, 0.25, 0.9, lx, 0, lz, '#9d9a93');
}
function schubkarre(L, lx, lz, ry = 0) {
  const P = L.sub(lx, lz, ry);
  P.geo(new THREE.CylinderGeometry(0.5, 0.36, 0.4, 4).rotateY(PI / 4).scale(1.2, 1, 0.8), 0, 0.6, 0, '#2f8f5a');
  P.geo(new THREE.TorusGeometry(0.18, 0.06, 4, 10).rotateY(PI / 2), 0.62, 0.2, 0, '#1f1f1f');
  P.box(1.2, 0.04, 0.04, -0.2, 0.5, 0.25, '#2a2d31');
  P.box(1.2, 0.04, 0.04, -0.2, 0.5, -0.25, '#2a2d31');
}

// Untermiete: Fremdmieter-Inventar
const UNTERMIETE = {
  discounter: {
    boden: { a: '#e3e6e8', b: '#d6dade', m: 'fliese' },
    wand: (L, w, r, d) => wandRegal(L, w, 2.2, 5, '#f4f4f2', prodPackungen(PAL.waren), r, d, 0.5),
    insel: [
      (L, r, d) => { gondel(L, 0, -0.9, 3.0, 1.6, '#f4f4f2', prodPackungen(PAL.waren), r, d); gondel(L, 0, 0.9, 3.0, 1.6, '#f4f4f2', prodPackungen(PAL.waren), r, d); },
      (L, r, d) => { for (const z of [-0.9, 0.8]) { L.box(1.8, 0.9, 0.7, 0, 0, z, '#3f4a53'); L.box(0.4, 0.05, 0.7, -0.4, 0.9, z, '#1f1f1f'); L.box(0.3, 0.3, 0.06, 0.6, 0.9, z - 0.2, '#1e2328'); figur(L.S, ...L.P(0.5, z - 0.6), (r() * 1e9) | 0, 'fremd', { y: L.oy, ry: L.rot, farbe: '#1f5fa8' }); } L.box(0.6, 0.9, 0.9, 1.4, 0, 0, '#c9d2d8'); },
      (L, r, d) => { L.box(2.6, 0.9, 1.0, 0, 0, -0.6, '#e9eef2'); for (let i = 0; i < 6; i++) L.box(0.36, 0.2, 0.7, -1.1 + i * 0.44, 0.9, -0.6, bunt(r, ['#9bc53d', '#e8403a', '#f2c14e', '#ff8c42', '#7b2f5a'])); L.box(2.6, 1.9, 0.6, 0, 0, 1.1, '#e3edf1'); for (let j = 0; j < 3; j++) for (let k = 0; k < 6; k++) L.box(0.3, 0.3, 0.06, -1.05 + k * 0.42, 0.3 + j * 0.5, 0.78, bunt(r, ['#ffffff', '#f4e1c0', '#3c8dd9', '#e8403a'])); },
    ],
  },
  fitness: {
    boden: { a: '#3a3f45', b: '#33383d', m: 'fliese' },
    wand: (L, w, r, d) => { L.box(w, 2.4, 0.06, 0, 0.1, 0.03, '#d9e6ec'); L.box(w, 0.1, 0.1, 0, 2.5, 0.05, '#ff6a2b'); for (let i = 0; i < Math.floor(w / 0.6); i++) L.box(0.3, 0.12, 0.3, -w / 2 + 0.4 + i * 0.6, 0, 0.6, '#1f1f1f'); },
    insel: [
      (L, r, d) => { for (const x of [-1.0, 0.1, 1.2]) laufband(L, x, -0.4, r); },
      (L, r, d) => { hantelbank(L, -0.6, -0.6, r); hantelbank(L, 0.8, 0.8, r); L.box(2.6, 0.02, 0.8, 0, 0, 1.4, '#6b2fa8'); },
      (L, r, d) => { for (let i = 0; i < 4; i++) { L.box(0.7, 0.03, 1.6, -1.1 + i * 0.75, 0, 0, bunt(r, ['#6b2fa8', '#20b5c9', '#ff6a2b', '#38b86b'])); if (i % 2 === 0) figur(L.S, ...L.P(-1.1 + i * 0.75, 0), (r() * 1e9) | 0, 'fitness', { y: L.oy, ry: L.rot }); } },
    ],
  },
  arzt: {
    boden: { a: '#e9f1f4', b: '#dbe7ec', m: 'karo' },
    wand: (L, w, r, d) => { for (let i = 0; i < Math.floor(w / 0.6); i++) stuhl(L, -w / 2 + 0.4 + i * 0.6, 0.45, 0, '#2f6f8f'); L.box(w, 1.1, 0.06, 0, 0, 0.03, '#ffffff'); bildtafel(L, 0, 1.6, 0.07, 1.4, 0.9, r, ['#2f6f8f']); for (let i = 0; i < Math.floor(w / 1.2); i++) if (r() < 0.6) figur(L.S, ...L.P(-w / 2 + 0.4 + i * 1.2, 0.45), (r() * 1e9) | 0, 'kunde', { y: L.oy, ry: L.rot, pose: 'sitzen', y: L.oy }); },
    insel: [
      (L, r, d) => { L.box(2.4, 1.1, 0.5, 0, 0, -0.2, '#ffffff'); L.box(0.5, 1.1, 1.4, -0.95, 0, 0.45, '#ffffff'); L.box(2.5, 0.05, 0.6, 0, 1.1, -0.2, '#2f6f8f'); L.box(0.45, 0.3, 0.05, 0.4, 1.15, -0.1, '#1e2328'); L.box(1.6, 0.85, 0.06, 0, 0, 0.06, '#2f6f8f'); figur(L.S, ...L.P(0.3, -0.85), (r() * 1e9) | 0, 'arzt', { y: L.oy, ry: L.rot }); L.box(0.4, 0.6, 0.4, 1.4, 0, 1.0, '#7b5a40'); L.kugel(0.45, 1.4, 1.0, 1.0, '#6fa860'); },
      (L, r, d) => { for (const x of [-0.8, 0.8]) { L.box(1.4, 2.4, 0.08, x, 0, -1.4, '#ffffff'); L.box(0.08, 2.4, 2.4, x - 0.7, 0, -0.2, '#ffffff'); L.box(0.6, 0.65, 1.8, x, 0, -0.4, '#cfe3ea'); L.box(0.6, 0.12, 0.3, x, 0.65, -1.15, '#ffffff'); } },
    ],
  },
  gastro: {
    boden: { a: '#e3cfae', b: '#d9c39f', m: 'dielen' },
    wand: (L, w, r, d) => { L.box(w, 1.05, 0.7, 0, 0, 0.35, '#b98d61'); L.box(w, 0.06, 0.75, 0, 1.05, 0.35, '#f4f0ea'); L.box(w, 2.6, 0.06, 0, 0, 0.03, '#f2e6d0'); L.box(w, 0.5, 0.5, 0, 2.6, 0.25, '#4f8a5b'); for (let i = 0; i < Math.floor(w / 0.5) - 2; i++) { L.zyl(0.12, 0.12, 0.1, -w / 2 + 0.6 + i * 0.5, 1.11, 0.35, bunt(r, ['#f2c6d2', '#5a3b22', '#f2c14e', '#ffffff', '#e8403a']), 8); } L.box(0.5, 0.45, 0.4, w / 2 - 0.6, 1.11, 0.3, '#c9d2d8'); figur(L.S, ...L.P(-0.4, 1.0), (r() * 1e9) | 0, 'theke', { y: L.oy, ry: L.rot + PI }); },
    insel: [
      (L, r, d) => cafeEcke(L, r, 1),
      (L, r, d) => { for (const x of [-0.8, 0.8]) { L.box(0.8, 0.74, 1.6, x, 0, 0, '#7b5a40'); L.box(0.9, 0.04, 1.7, x, 0.74, 0, '#f4f0ea'); for (const z of [-0.5, 0.5]) for (const s of [-1, 1]) { stuhl(L, x + s * 0.6, z, s > 0 ? -PI / 2 : PI / 2, '#3f6b3a'); if (r() < 0.5) figur(L.S, ...L.P(x + s * 0.6, z), (r() * 1e9) | 0, 'kunde', { y: L.oy, ry: L.rot + (s > 0 ? PI / 2 : -PI / 2) + PI, pose: 'sitzen', y: L.oy }); } } },
    ],
  },
};
function laufband(L, lx, lz, r) {
  L.box(0.7, 0.22, 1.8, lx, 0, lz, '#2a2d31');
  L.box(0.56, 0.03, 1.6, lx, 0.22, lz, '#1a1c1f');
  L.box(0.05, 1.2, 0.05, lx - 0.3, 0.2, lz - 0.7, '#9aa3aa');
  L.box(0.05, 1.2, 0.05, lx + 0.3, 0.2, lz - 0.7, '#9aa3aa');
  L.box(0.7, 0.25, 0.25, lx, 1.3, lz - 0.75, '#1f1f1f');
  L.box(0.3, 0.12, 0.02, lx, 1.4, lz - 0.62, '#20b5c9');
  if (r() < 0.6) figur(L.S, ...L.P(lx, lz), (r() * 1e9) | 0, 'fitness', { y: L.oy, ry: L.rot + PI, pose: 'gehen', y: L.oy + 0.25 });
}
function hantelbank(L, lx, lz, r) {
  L.box(0.35, 0.45, 1.3, lx, 0, lz, '#2a2d31');
  L.box(0.35, 0.08, 1.3, lx, 0.45, lz, '#ff6a2b');
  L.box(0.06, 1.3, 0.06, lx - 0.55, 0, lz - 0.5, '#9aa3aa');
  L.box(0.06, 1.3, 0.06, lx + 0.55, 0, lz - 0.5, '#9aa3aa');
  L.geo(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 4).rotateZ(PI / 2), lx, 1.25, lz - 0.5, '#c9d2d8');
  for (const s of [-1, 1]) L.geo(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10).rotateZ(PI / 2), lx + s * 0.75, 1.25, lz - 0.5, '#1f1f1f');
}

/** Aktionsmöbel am Rand eines Gangs (Rücken zur Gangkante, Front zum Laufweg = lokal -z). */
function gangMoebel(L, nachbar, r, d) {
  if (['leer', 'umbau', 'untermiete'].includes(nachbar)) { if (r() < 0.5) { L.box(0.7, 0.7, 0.7, 1.2, 0, 0, '#ece6dc'); L.kugel(0.55, 1.2, 1.15, 0, '#6fa860'); } return; }
  const pal = PAL[nachbar] ?? (nachbar === 'beauty' ? PAL.flakon : nachbar === 'wohnen' ? PAL.geschirr : PAL.waren);
  const mode = ['damen', 'herren', 'kinder', 'waesche', 'sporttextil', 'sport', 'outdoor', 'wintersport', 'teamsport'].includes(nachbar);
  const v = r();
  if (mode && v < 0.45) { L.box(3.0, 0.25, 0.9, 0, 0, 0, HOLZ.weiss); for (let i = 0; i < 3; i++) puppe(L.hoch(0.25), -1.0 + i, zw(r, -0.1, 0.1), r, nachbar === 'herren' ? 'herren' : nachbar === 'kinder' ? 'kind' : nachbar === 'waesche' ? 'waesche' : PAL[nachbar] === PAL.sport ? 'sport' : 'damen', pal, PI + zw(r, -0.5, 0.5)); }
  else if (mode && v < 0.7) staender(L, 0, 0, 2.6, pal, r, d);
  else if (v < 0.85) { warenTisch(L, -0.5, 0, 1.6, 0.8, pal, r, d, r() < 0.3 ? '#d23c32' : waehle(r, [HOLZ.weiss, HOLZ.hell, HOLZ.mittel]), 0.8); L.box(0.8, 0.6, 0.6, 1.2, 0, 0, '#ece6dc'); L.kugel(0.45, 1.2, 1.0, 0, '#5f9a56'); }
  else { L.box(1.8, 0.45, 0.5, -0.4, 0, 0, HOLZ.mittel); L.box(0.7, 0.7, 0.7, 1.2, 0, 0, '#ece6dc'); L.kugel(0.55, 1.2, 1.15, 0, '#6fa860'); L.kugel(0.35, 1.35, 1.65, 0.1, '#7cb369'); }
}

/** Kleines Beimöbel für die freie Ecke einer Zelle. */
function beimoebel(L, gruppe, r, d) {
  const pal = PAL[gruppe] ?? PAL.waren;
  const v = r();
  if (['damen', 'herren', 'kinder', 'waesche', 'sporttextil', 'outdoor'].includes(gruppe)) {
    if (v < 0.5) puppe(L, 0, 0, r, gruppe === 'herren' ? 'herren' : gruppe === 'kinder' ? 'kind' : gruppe === 'waesche' ? 'waesche' : 'damen', pal, zw(r, -1, 1));
    else standspiegel(L, 0, 0, zw(r, -1, 1));
  } else if (gruppe === 'beauty') L.box(0.4, 1.1, 0.4, 0, 0, 0, '#f7f3ec'), L.box(0.12, 0.25, 0.12, 0, 1.1, 0, bunt(r, PAL.flakon));
  else if (gruppe === 'accessoires') pouf(L, 0, 0, bunt(r, ['#7d8f9c', '#c9a26b', '#2f6f8f', '#b5745a']));
  else if (gruppe === 'spielwaren') teddy(L, 0, 0, 0, r, 1.6);
  else if (['sport', 'teamsport', 'sportschuhe'].includes(gruppe)) ballkorb(L, 0, 0, r, d * 0.5);
  else if (gruppe === 'wohnen') stehlampe(L, 0, 0, r);
  else if (gruppe === 'rad') fahrrad(L, 0, 0, r, zw(r, -0.4, 0.4));
  else { L.box(0.6, 0.6, 0.6, 0, 0, 0, '#ece6dc'); L.kugel(0.45, 0, 1.0, 0, '#5f9a56'); }
}

// ---------------------------------------------------------------- Zelle
const WG_NAMEN = {
  damen: 'Damenmode', herren: 'Herrenmode', kinder: 'Kindermode', waesche: 'Wäsche & Dessous', beauty: 'Beauty & Parfümerie',
  accessoires: 'Schuhe & Accessoires', wohnen: 'Wohnen & Haushalt', spielwaren: 'Spielwaren', food: 'Feinkost', sport: 'Sport',
  sportschuhe: 'Sportschuhe', sporttextil: 'Sportbekleidung', outdoor: 'Outdoor', rad: 'Fahrrad', wintersport: 'Wintersport', teamsport: 'Teamsport',
  offprice: 'Rote Preise', leer: 'Fläche frei', umbau: 'Wir bauen für Sie um',
};
export function abteilungsname(gruppe) { return WG_NAMEN[gruppe] ?? gruppe; }
export const WARENGRUPPEN = Object.keys(MODUL);
export const KONZEPTE = ['offprice', 'konzession', 'untermiete', 'leer', 'umbau'];

/**
 * Füllt eine 5×5-m-Zelle.
 * gruppe: Warengruppe, Konzept (offprice | konzession | untermiete | leer | umbau) oder 'gang' | 'kasse'.
 * o: { y = 0, wandX (Wand an -x), wandZ (Wand an -z), basis (Warengruppe unter Konzession/Offprice),
 *      mieter (discounter|fitness|arzt|gastro), marke (Objekt aus MARKEN), index (Zelle in der Zone), boden = true }
 * Rückgabe: { frei: [[x, z], …] } freie Stehplätze für Kundschaft.
 */
export function zelle(S, gruppe, x, z, seed = 1, dichte = 1, o = {}) {
  const r = rng(seed);
  const y = o.y ?? 0;
  const d = Math.max(0.2, Math.min(1, dichte));
  const R = RASTER;
  const frei = [];
  const wx = !!o.wandX, wz = !!o.wandZ;
  // Boden
  let bodenTyp = gruppe;
  if (gruppe === 'konzession') bodenTyp = { a: (o.marke ?? marke(seed)).boden, b: dunkler((o.marke ?? marke(seed)).boden, 0.04), m: 'karo' };
  else if (gruppe === 'untermiete') bodenTyp = UNTERMIETE[o.mieter ?? 'discounter'].boden;
  if (o.boden !== false) boden(S, x, z, R, R, y, bodenTyp, d);
  const yb = y + 0.06;

  // Rahmen für Wand und Insel
  const wandL = (seite, len, off) => seite === 'z'
    ? lokal(S, x + off + len / 2, yb, z + 0.02, 0)
    : lokal(S, x + 0.02, yb, z + R - off - len / 2, PI / 2);
  const wandStuecke = [];
  if (wz) wandStuecke.push(['z', wx ? R - 0.75 : R - 0.1, wx ? 0.75 : 0.05]);
  if (wx) wandStuecke.push(['x', R - 0.1, 0.05]);
  const ix = x + R / 2 + (wx ? 0.45 : 0), iz = z + R / 2 + (wz ? 0.45 : 0);
  const iRot = r() < 0.5 ? 0 : PI / 2;
  const inselL = () => lokal(S, ix, yb, iz, iRot);
  const fr = (fx, fz) => frei.push([x + fx, z + fz]);
  // Freie Plätze: Rand der Zelle ohne Wandseiten
  fr(R - 0.35, R / 2 + zw(r, -1, 1)); fr(R / 2 + zw(r, -1, 1), R - 0.35); fr(R - 0.4, R - 0.4);
  if (!wx) fr(0.4, R / 2 + zw(r, -1, 1)); else fr(1.15, R / 2 + zw(r, -1.5, 1.5));
  if (!wz) fr(R / 2 + zw(r, -1, 1), 0.4); else fr(R / 2 + zw(r, -1.5, 1.5), 1.15);

  if (gruppe === 'gang' || gruppe === 'kasse') {
    frei.length = 0;
    if (gruppe === 'kasse') { kassentresen(S, x + 2.5, z + 2.3, seed, { y: yb, rot: o.rot ?? 0 }); for (let i = 0; i < 3; i++) fr(zw(r, 0.6, 4.4), 4.5); return { frei }; }
    const achse = o.achse; // Laufrichtung 'x' oder 'z', sonst Kreuzung/Fläche
    if (achse && o.moebel !== false) {
      // Laufweg in der Mitte, Bänder an den Seiten mit Aktionsmöbeln
      for (const [seite, nachbar] of [[-1, o.nachbarA], [1, o.nachbarB]]) {
        if (r() > 0.25 + 0.6 * d) continue;
        const L = achse === 'x' ? lokal(S, x + 2.5, yb, z + 2.5 + seite * 1.95, seite < 0 ? PI : 0) : lokal(S, x + 2.5 + seite * 1.95, yb, z + 2.5, seite < 0 ? -PI / 2 : PI / 2);
        gangMoebel(L, nachbar, r, d);
      }
      for (let i = 0; i < 6; i++) achse === 'x' ? fr(zw(r, 0.4, 4.6), zw(r, 1.7, 3.3)) : fr(zw(r, 1.7, 3.3), zw(r, 0.4, 4.6));
    } else {
      for (let i = 0; i < 6; i++) fr(zw(r, 0.6, 4.4), zw(r, 0.6, 4.4));
      if (o.moebel !== false && r() < 0.35 * d) {
        const L = lokal(S, x + 2.5, yb, z + 2.5, iRot);
        L.box(0.8, 0.8, 0.8, 0, 0, 0, '#ece6dc'); L.kugel(0.6, 0, 1.3, 0, '#5f9a56'); L.kugel(0.4, 0.2, 1.8, 0.1, '#6fa860');
      }
    }
    return { frei };
  }

  if (gruppe === 'leer') {
    if (wz) { const L = wandL('z', R - 0.1, 0.05); abgedeckt(L, 0, 0.35, R - 0.6, 2.2, 0.6); }
    if (wx) { const L = wandL('x', R - 0.1, 0.05); abgedeckt(L, wz ? 0.5 : 0, 0.35, wz ? R - 1.6 : R - 0.6, 2.2, 0.6); }
    const L = inselL();
    const v = Math.floor(r() * 3);
    if (v === 0) { abgedeckt(L, -0.6, -0.5, 1.8, 0.9, 1.0, 0.2); kartons(L, 0.9, 0.9, r, 5); }
    else if (v === 1) { abgedeckt(L, 0.4, 0.2, 1.2, 1.6, 0.6, -0.4); abgedeckt(L, -1.0, -0.8, 0.8, 1.1, 0.8); }
    else { kartons(L, -0.5, -0.4, r, 6); L.box(1.2, 0.12, 1.0, 0.8, 0, 0.9, '#b8925e'); }
    if (o.absperrung !== false && (o.index === 0 || r() < 0.25)) absperrung(lokal(S, x + R / 2, yb, z + R - 0.25, 0), -2.2, 2.2, 0);
    return { frei: frei.slice(0, 2) };
  }

  if (gruppe === 'umbau') {
    const L = inselL();
    const v = (o.index ?? Math.floor(r() * 3)) % 3;
    if (v === 0) { material(L, -0.3, -0.6, r); leiter(L, 1.2, 1.0, 0.5); }
    else if (v === 1) { schutt(L, -0.6, -0.4, r, d < 0.5 ? 5 : 10); schubkarre(L, 0.9, 0.9, 0.6); leiter(L, -1.2, 1.1, -0.3); }
    else { L.box(2.6, 2.2, 0.12, 0, 0, -1.2, '#ebe9e4'); for (let i = 0; i < 5; i++) L.box(0.06, 2.6, 0.1, -1.2 + i * 0.6, 0, -1.05, '#c9d2d8'); leiter(L, 0.6, 0.0); L.box(0.6, 0.5, 0.4, -0.9, 0, 0.6, '#d39a2b'); }
    if (wz) { const W = wandL('z', R - 0.1, 0.05); W.box(R - 0.2, 0.6, 0.05, 0, 0.3, 0.06, '#c9c4bb'); W.box(1.2, 1.4, 0.04, -0.8, 1.2, 0.07, '#9aa3aa'); }
    if (wx) { const W = wandL('x', R - 0.1, 0.05); W.box(R - 0.2, 0.6, 0.05, 0, 0.3, 0.06, '#c9c4bb'); }
    if (r() < 0.8) figur(S, x + zw(r, 1, 4), z + zw(r, 1, 4), seed + 7, 'handwerker', { y: yb });
    return { frei: [] };
  }

  if (gruppe === 'untermiete') {
    const typ = UNTERMIETE[o.mieter ?? 'discounter'];
    for (const [s, len, off] of wandStuecke) typ.wand(wandL(s, len, off), len, r, d);
    waehle(r, typ.insel)(inselL(), r, d);
    return { frei };
  }

  if (gruppe === 'offprice') {
    const basis = o.basis ?? 'damen';
    const pal = PAL[basis] ?? PAL.damen;
    for (const [s, len, off] of wandStuecke) {
      const L = wandL(s, len, off);
      if (r() < 0.5) staender(L, 0, 0.4, len - 0.4, pal, r, d, 1.6); else wandRegal(L, len, 2.0, 4, '#c9d2d8', prodPackungen(PAL.waren), r, d, 0.5);
    }
    const L = inselL();
    const v = Math.floor(r() * 3);
    if (v === 0) { wuehltisch(L, 0, -0.7, r, d); gitterbox(L, -0.7, 0.9, r, d); preisschild(L, 0.6, -0.7, waehle(r, PREISE)); }
    else if (v === 1) { gitterbox(L, -0.8, -0.8, r, d); gitterbox(L, 0.7, -0.8, r, d); wuehltisch(L, 0, 0.9, r, d, 2.6); preisschild(L, -0.8, -0.8, waehle(r, PREISE), 1.6); }
    else { staender(L, 0, -0.9, 2.4, pal, r, d); wuehltisch(L, 0, 0.7, r, d); preisschild(L, 1.1, 0.7, waehle(r, PREISE)); }
    return { frei };
  }

  if (gruppe === 'konzession') {
    const m = o.marke ?? marke(seed);
    const basis = o.basis ?? m.gruppe;
    const mod = MODUL[basis] ?? MODUL.damen;
    for (const [s, len, off] of wandStuecke) {
      const L = wandL(s, len, off);
      L.box(len, 3.6, 0.1, 0, 0, 0.05, m.farbe);
      waehle(r, mod.wand)(L.sub(0, 0.1), len - 0.2, r, d);
    }
    waehle(r, mod.insel)(inselL(), r, d);
    return { frei };
  }

  const mod = MODUL[gruppe] ?? MODUL.damen;
  const dw = wx && wz ? d * 0.72 : d;
  for (const [s, len, off] of wandStuecke) waehle(r, mod.wand)(wandL(s, len, off), len, r, dw);
  const n = mod.insel.length;
  mod.insel[((o.index ?? 0) + Math.floor(r() * n)) % n](inselL(), r, d);
  if (r() < 0.55 * d) { beimoebel(lokal(S, x + R - 0.45, yb, z + R - 0.45, 0), gruppe, r, d); frei.splice(2, 1); }
  // Personal in größeren Abteilungen
  if (o.personal ?? r() < 0.18) figur(S, x + zw(r, 1, 4), z + R - 0.6, seed + 3, 'verkauf', { y: yb });
  return { frei };
}

// ---------------------------------------------------------------- Infrastruktur
/** Wand (Putz mit Pilastern und Sockel) an -z (achse 'x', entlang x von a bis b bei z) oder -x (achse 'z'). */
export function rueckwand(S, achse, a, b, pos, y = 0, h = WANDHOEHE, o = {}) {
  const putz = o.putz ?? '#ece4d8', pilaster = o.pilaster ?? '#ddd2c2', sockelF = o.sockel ?? '#cfc5b6';
  const L = achse === 'x' ? lokal(S, (a + b) / 2, y, pos, 0) : lokal(S, pos, y, (a + b) / 2, PI / 2);
  const len = b - a;
  // Für achse 'z' läuft lokal x entlang -z, Vorzeichen spielt für symmetrische Wand keine Rolle
  L.box(len + 0.6, h, 0.6, 0, 0, -0.3, putz);
  L.box(len + 0.6, 0.25, 0.06, 0, 0, 0.02, sockelF);
  L.box(len + 0.6, 0.3, 0.12, 0, h - 0.3, 0.04, '#f6f1e9');
  for (let u = -len / 2 + (o.pilasterVersatz ?? 0); u <= len / 2 + 0.01; u += o.pilasterAbstand ?? 5) L.box(0.7, h - 0.3, 0.22, u, 0, 0.1, pilaster);
}

/** Stütze an Rasterkreuzung. */
export function stuetze(S, x, z, y = 0, h = WANDHOEHE, farbe = '#e6e0d6') {
  S.box(0.7, h, 0.7, x, y + h / 2, z, farbe);
  S.box(0.84, 0.25, 0.84, x, y + 0.125, z, dunkler(farbe, 0.1));
  S.box(0.84, 0.2, 0.84, x, y + h - 0.1, z, heller(farbe, 0.03));
}

/** Rolltreppe entlang x: Fuß bei (x0, z), steigt nach -x um hub über laenge. richtung +1 = auf, -1 = ab (in die Tiefe). */
export function rolltreppe(S, x0, z, laenge, hub, y = 0, d = 1, t0 = 0) {
  const neig = Math.atan2(hub, laenge);
  const lang = wurzelSumme(laenge, hub) * (1 - t0);
  const breit = 1.15;
  const cx = x0 - laenge * (1 + t0) / 2, cy = y + hub * (1 + t0) / 2;
  const schraeg = (w, h, t, dy, dz, f) => { const g = new THREE.BoxGeometry(lang, h, t); g.rotateZ(-neig); g.translate(cx, cy + dy, z + dz); S.add(g, f); };
  schraeg(lang, 0.7, breit + 0.2, -0.45, 0, '#a7b0b6');
  schraeg(lang, 0.06, breit - 0.1, -0.06, 0, '#4b5560');
  const stufen = d < 0.5 ? 6 : 14;
  for (let i = 0; i < stufen; i++) { const t = t0 + (1 - t0) * (i + 0.5) / stufen; S.box(lang / stufen * 0.5, 0.04, breit - 0.15, x0 - t * laenge, y + t * hub - 0.02, z, '#c3cbd1'); }
  for (const s of [-1, 1]) {
    schraeg(lang, 0.9, 0.04, 0.5, s * (breit / 2 + 0.02), GLAS);
    schraeg(lang, 0.1, 0.12, 0.98, s * (breit / 2 + 0.02), '#1f2328');
    schraeg(lang, 0.35, 0.16, -0.05, s * (breit / 2 + 0.06), '#d5dbdf');
  }
  // Kammplatten unten und oben
  if (!t0) { S.box(1.2, 0.03, breit, x0 + 0.5, y + 0.02, z, '#9aa3aa'); S.box(0.8, 1.05, 0.16, x0 + 0.3, y + 0.52, z - breit / 2 - 0.06, '#d5dbdf'); }
  S.box(1.2, 0.03, breit, x0 - laenge - 0.5, y + hub + 0.02, z, '#9aa3aa');
}

/** Rolltreppenkern auf 10 × 10 m ab (x, z): Paar nach oben (hinten) und Paar von unten aus dem Luftraum (vorne). */
export function rolltreppenKern(S, x, z, o = {}) {
  const y = o.y ?? 0, hub = o.hub ?? WANDHOEHE, d = o.dichte ?? 1;
  const auf = o.auf ?? true, ab = o.ab ?? true;
  const lang = hub / Math.tan(0.52);
  const fl = { a: '#ece8e1', b: '#dcd6cc', m: 'fliese' };
  const lx0 = x + 0.9, lx1 = x + 9.3, lz0 = z + 5.5, lz1 = z + 8.7;
  if (ab) {
    // Boden mit Aussparung
    boden(S, x, z, 10, lz0 - z, y, fl, 0.3);
    boden(S, x, lz1, 10, z + 10 - lz1, y, fl, 0.3);
    boden(S, x, lz0, lx0 - x, lz1 - lz0, y, fl, 0.3);
    boden(S, lx1, lz0, x + 10 - lx1, lz1 - lz0, y, fl, 0.3);
    const tief = 1.8, dunkel = '#2b3238';
    S.box(lx1 - lx0, 0.1, lz1 - lz0, (lx0 + lx1) / 2, y - tief, (lz0 + lz1) / 2, '#4d565e');
    S.box(0.1, tief, lz1 - lz0, lx0, y - tief / 2, (lz0 + lz1) / 2, '#3a424a');
    S.box(lx1 - lx0, tief, 0.1, (lx0 + lx1) / 2, y - tief / 2, lz0, '#444d55');
    S.box(0.1, tief, lz1 - lz0, lx1, y - tief / 2, (lz0 + lz1) / 2, dunkel);
    S.box(lx1 - lx0, tief, 0.1, (lx0 + lx1) / 2, y - tief / 2, lz1, dunkel);
    S.box(lx1 - lx0 + 0.2, 0.5, 0.25, (lx0 + lx1) / 2, y - 0.25, lz1, '#d5dbdf');
    S.box(0.25, 0.5, lz1 - lz0, lx1, y - 0.25, (lz0 + lz1) / 2, '#d5dbdf');
    for (const zz of [lz0 + 0.85, lz1 - 0.85]) rolltreppe(S, lx0 + 0.15 + lang, zz, lang, hub, y - hub + 0.06, d, 1 - (tief - 0.2) / hub);
    const gl = (w, t, cx, cz) => { S.box(w, 1.05, t, cx, y + 0.6, cz, GLAS); S.box(w + 0.04, 0.07, t + 0.08, cx, y + 1.15, cz, '#c9d2d8'); S.box(w + 0.04, 0.08, t + 0.08, cx, y + 0.1, cz, '#c9d2d8'); };
    gl(lx1 - lx0 - 1.4, 0.04, (lx0 + lx1) / 2 + 0.7, lz0);
    gl(lx1 - lx0 - 1.4, 0.04, (lx0 + lx1) / 2 + 0.7, lz1);
    gl(0.04, lz1 - lz0, lx1, (lz0 + lz1) / 2);
  } else boden(S, x, z, 10, 10, y, fl, 0.3);
  if (auf) {
    rolltreppe(S, x + 9.3, z + 1.6, lang, hub, y + 0.06, d);
    rolltreppe(S, x + 9.3, z + 3.0, lang, hub, y + 0.06, d);
  }
  for (const [px, pz] of [[x + 0.55, z + 0.6], [x + 0.55, z + 4.6]]) { S.box(0.7, 0.6, 0.7, px, y + 0.36, pz, '#ece6dc'); S.add(new THREE.IcosahedronGeometry(0.55, 0).translate(px, y + 1.15, pz), '#5f9a56'); }
}

/** Aufzug mit Edelstahltüren, Front zeigt nach +z. Belegt ca. 2.6 × 2.6 m ab (x, z). */
export function aufzug(S, x, z, y = 0, h = WANDHOEHE, rot = 0) {
  const L = lokal(S, x + 1.3, y + 0.06, z + 1.3, rot);
  L.box(2.6, h, 2.4, 0, 0, -0.1, '#c9c4bb');
  L.box(2.0, 2.6, 2.0, 0, 0, -0.1, '#3f4a53');
  L.box(1.5, 2.3, 0.06, 0, 0, 1.12, '#c9d2d8');
  L.box(0.04, 2.3, 0.07, 0, 0, 1.13, '#8c959b');
  L.box(1.8, 0.2, 0.08, 0, 2.3, 1.12, '#8c959b');
  L.box(0.5, 0.18, 0.04, 0, 2.6, 1.13, '#1e2328');
  L.box(0.08, 0.16, 0.04, 0.95, 1.1, 1.13, '#e9c46a');
  L.box(2.8, 0.3, 2.6, 0, h - 0.3, -0.1, '#b4ada2');
}

/** Treppenhaus an der Rückwand: Raum w × t mit Treppenläufen und Notausgang-Schild. Front +z. */
export function treppenhaus(S, x, z, w = 5, t = 10, y = 0, h = WANDHOEHE, o = {}) {
  const yb = y + 0.06;
  if (o.wandNX) S.box(0.25, h, t, x + 0.125, y + h / 2, z + t / 2, '#d6cfc3');
  if (o.wandNZ) S.box(w, h, 0.25, x + w / 2, y + h / 2, z + 0.125, '#e0d9cd');
  S.box(w, 0.05, t, x + w / 2, yb - 0.02, z + t / 2, '#b9b4aa');
  const fh = 1.3;
  S.box(0.25, fh, t, x + w - 0.125, y + fh / 2, z + t / 2, '#ddd6ca');
  S.box(w, fh, 0.25, x + w / 2, y + fh / 2, z + t - 0.125, '#e6dfd3');
  S.box(0.3, 2.5, 0.3, x + w - 0.15, y + 1.25, z + t - 0.15, '#cfc6b8');
  S.box(1.1, 2.3, 0.08, x + w - 1.3, yb + 1.15, z + t + 0.0, '#6c7d6f');
  S.box(1.3, 0.2, 0.3, x + w - 1.3, yb + 2.4, z + t - 0.12, '#cfc6b8');
  S.box(0.08, 2.3, 0.3, x + w - 1.95, yb + 1.15, z + t - 0.12, '#cfc6b8');
  S.box(0.5, 0.25, 0.04, x + w - 1.3, yb + 2.75, z + t + 0.02, '#2f9e5c');
  // Läufe
  const lauf = (x0, z0, z1, hoch, abw) => {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const zz = z0 + ((z1 - z0) * (i + 0.5)) / n;
      const hh = hoch ? ((i + 1) / n) * h * 0.5 : ((n - i) / n) * h * 0.5;
      S.box(abw, hh, Math.abs(z1 - z0) / n + 0.01, x0, yb + hh / 2, zz, '#cfc8bc');
    }
  };
  lauf(x + 1.2, z + 2.0, z + t - 2.2, true, 1.6);
  lauf(x + w - 1.6, z + 2.0, z + t - 2.2, false, 1.6);
  S.box(w - 0.5, h * 0.5, 1.8, x + w / 2 - 0.1, yb + h * 0.25, z + 1.15, '#d6cfc3');
  S.box(0.12, 1.0, t - 4.2, x + w / 2 - 0.2, yb + h * 0.5, z + t / 2 - 0.1, '#8c959b');
}

/** Lager hinter der Rückwand: Regale mit Kartons, Tür, Hubwagen. Front +z. */
export function lager(S, x, z, w, t, y = 0, seed = 5, h = WANDHOEHE, d = 1) {
  const r = rng(seed);
  const yb = y + 0.06;
  boden(S, x, z, w, t, y, 'lager', 0.3);
  S.box(w * 0.7 - 0.9, 1.3, 0.2, x + (w * 0.7 - 0.9) / 2, y + 0.65, z + t - 0.1, '#e6dfd3');
  S.box(w * 0.3 - 0.9, 1.3, 0.2, x + w - (w * 0.3 - 0.9) / 2, y + 0.65, z + t - 0.1, '#e6dfd3');
  for (const sx of [-0.9, 0.9]) S.box(0.2, 2.6, 0.24, x + w * 0.7 + sx, y + 1.3, z + t - 0.1, '#cfc6b8');
  S.box(0.2, 1.3, t, x + w - 0.1, y + 0.65, z + t / 2, '#ddd6ca');
  S.box(2.0, 0.3, 0.24, x + w * 0.7, y + 2.6, z + t - 0.1, '#c9483e');
  for (let i = 0; i < 6; i++) S.box(0.28, 2.4, 0.02, x + w * 0.7 - 0.7 + i * 0.28, yb + 1.2, z + t - 0.05, i % 2 ? '#d9dee2' : '#c6ccd1');
  const reihen = Math.max(1, Math.floor((t - 1.4) / 1.6));
  for (let j = 0; j < reihen; j++) {
    const zz = z + 0.5 + j * 1.6;
    for (let k = 0; k < 3; k++) S.box(w - 1.2, 0.05, 0.9, x + w / 2, yb + 0.3 + k * 1.0, zz + 0.45, '#d07a2e');
    for (let k = 0; k <= Math.floor(w / 2.5); k++) S.box(0.07, 2.8, 0.9, x + 0.6 + k * ((w - 1.2) / Math.floor(w / 2.5)), yb + 1.4, zz + 0.45, '#2f5f8a');
    const n = anz(Math.floor((w - 1.4) / 0.6), d, 0.4);
    for (let k = 0; k < 3; k++) for (let i = 0; i < n; i++) if (r() < 0.8) S.box(0.5, zw(r, 0.3, 0.7), 0.6, x + 0.95 + i * ((w - 1.6) / n), yb + 0.33 + k * 1.0 + 0.2, zz + 0.45, bunt(r, ['#c9a26b', '#b8925e', '#d6b27c', '#e8e4dc']));
  }
  S.box(0.7, 0.15, 1.2, x + 1.2, yb + 0.1, z + t - 0.9, '#e0b23c');
  S.box(0.12, 1.0, 0.12, x + 1.2, yb + 0.6, z + t - 0.35, '#2a2d31');
}

/** Kassentresen mit zwei Kassen, Tütenstapel und Personal. Front zeigt nach lokal +z. */
export function kassentresen(S, x, z, seed = 3, o = {}) {
  const r = rng(seed);
  const L = lokal(S, x, o.y ?? 0.06, z, o.rot ?? 0);
  L.box(3.6, 1.0, 0.8, 0, 0, 0, '#3f4a53');
  L.box(3.7, 0.06, 0.9, 0, 1.0, 0, '#f4f0ea');
  L.box(0.8, 1.0, 1.6, 1.4, 0, -1.0, '#3f4a53');
  L.box(0.9, 0.06, 1.7, 1.4, 1.0, -1.0, '#f4f0ea');
  L.box(3.6, 0.3, 0.04, 0, 0.55, 0.42, '#d23c32');
  for (const kx of [-0.9, 0.5]) {
    L.box(0.35, 0.08, 0.3, kx, 1.06, -0.1, '#1e2328');
    L.box(0.32, 0.25, 0.04, kx, 1.14, -0.2, '#2b3640');
    L.box(0.2, 0.08, 0.15, kx + 0.3, 1.06, 0.05, '#9aa3aa');
    figur(S, ...L.P(kx, -0.75), seed + kx * 10, 'kasse', { y: L.oy, ry: L.rot, y: L.oy });
  }
  for (let i = 0; i < 3; i++) L.box(0.32, 0.4, 0.12, -1.55 + i * 0.12, 1.06, -0.15, '#d23c32');
  if (o.schlange !== false) for (let i = 0; i < 2 + Math.floor(r() * 2); i++) figur(S, ...L.P(-0.9 + (i % 2) * 1.4, 0.8 + Math.floor(i / 2) * 0.8), seed + 20 + i, 'kunde', { y: L.oy, ry: L.rot + PI, y: L.oy, pose: 'tasche' });
}

/** Info-Counter (achteckig) mit Personal und Schild. */
export function infoCounter(S, x, z, seed = 4, o = {}) {
  const y = (o.y ?? 0) + 0.06;
  S.add(new THREE.CylinderGeometry(1.3, 1.3, 1.05, 8).translate(x, y + 0.52, z), '#f4f0ea');
  S.add(new THREE.CylinderGeometry(1.36, 1.36, 0.06, 8).translate(x, y + 1.08, z), '#d23c32');
  S.add(new THREE.CylinderGeometry(0.7, 0.7, 1.1, 8).translate(x, y + 0.55, z), '#e9e4dc');
  S.box(0.06, 2.4, 0.06, x, y + 1.6, z, '#9aa3aa');
  S.box(0.4, 0.07, 0.3, x + 0.8, y + 1.1, z + 0.4, '#1e2328');
  figur(S, x - 0.9, z - 0.3, seed, 'info', { y, ry: PI / 4 });
  if (S.szene) haengeschild(S, S.szene, 'Information', x, y + 2.9, z, { farbe: '#d23c32', hoehe: 0.55 });
}

/** Hängeschild mit Abteilungsnamen, Text zeigt nach +z (und optional zusätzlich nach +x). */
export function haengeschild(S, scene, text, x, y, z, o = {}) {
  const hg = o.farbe ?? '#2a3540', schriftF = o.schrift ?? '#ffffff';
  const hoehe = o.hoehe ?? 0.75;
  const { t, seitenverhaeltnis } = textTextur(text, schriftF, 120, hg);
  const breite = hoehe * seitenverhaeltnis;
  const zweiseitig = o.zweiseitig ?? true;
  S.box(breite + 0.12, hoehe + 0.12, 0.12, x, y, z, dunkler(hg, 0.06));
  if (o.seile !== false) { S.box(0.03, 1.2, 0.03, x - breite * 0.35, y + hoehe / 2 + 0.6, z, '#5a636b'); S.box(0.03, 1.2, 0.03, x + breite * 0.35, y + hoehe / 2 + 0.6, z, '#5a636b'); }
  const matT = new THREE.MeshBasicMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: -2 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(breite, hoehe), matT);
  m.position.set(x, y, z + 0.065);
  scene.add(m);
  if (zweiseitig && o.quer) {
    S.box(0.12, hoehe + 0.12, breite + 0.12, x, y, z, dunkler(hg, 0.06));
    const m2 = new THREE.Mesh(new THREE.PlaneGeometry(breite, hoehe), matT);
    m2.rotation.y = PI / 2; m2.position.set(x + 0.065, y, z);
    scene.add(m2);
  }
  return breite;
}

/** Schild an einer Wandfläche (Text nach +z bei achse 'x' bzw. nach +x bei achse 'z'). */
export function wandschild(S, scene, text, achse, u, y, pos, o = {}) {
  const hoehe = o.hoehe ?? 0.8;
  const { mat, seitenverhaeltnis } = textMaterial(text, o.schrift ?? '#ffffff', { groesse: 120, hintergrund: o.farbe ?? null, versatz: -2 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(hoehe * seitenverhaeltnis, hoehe), mat);
  if (achse === 'x') m.position.set(u, y, pos + 0.02);
  else { m.rotation.y = PI / 2; m.position.set(pos + 0.02, y, u); }
  scene.add(m);
  return hoehe * seitenverhaeltnis;
}

/** Shop-in-Shop-Rahmen bzw. Mieterabtrennung: Wände an den Seiten -x/-z (hoch) und +x/+z (niedrig, mit Öffnung). */
export function abtrennung(S, scene, x0, z0, x1, z1, o = {}) {
  const y = o.y ?? 0, h = o.h ?? 3.4;
  const farbe = o.farbe ?? '#e9e4dc';
  const kanten = o.kanten ?? { nx: true, nz: true, px: true, pz: true };
  const niedrig = o.niedrig ?? 1.1;
  if (kanten.nz) S.box(x1 - x0, h, 0.15, (x0 + x1) / 2, y + h / 2, z0 + 0.075, farbe);
  if (kanten.nx) S.box(0.15, h, z1 - z0, x0 + 0.075, y + h / 2, (z0 + z1) / 2, dunkler(farbe, 0.03));
  const oeff = o.oeffnung ?? 3;
  const vorne = (achse, a, b, pos) => {
    const m = (a + b) / 2, l = (b - a - oeff) / 2;
    if (l <= 0.2) return;
    for (const c of [a + l / 2, b - l / 2]) {
      if (achse === 'x') { S.box(l, niedrig, 0.15, c, y + niedrig / 2, pos, farbe); if (o.glas) S.box(l, h - niedrig - 0.4, 0.04, c, y + niedrig + (h - niedrig - 0.4) / 2, pos, GLAS); }
      else { S.box(0.15, niedrig, l, pos, y + niedrig / 2, c, farbe); if (o.glas) S.box(0.04, h - niedrig - 0.4, l, pos, y + niedrig + (h - niedrig - 0.4) / 2, c, GLAS); }
    }
    if (o.glas) { if (achse === 'x') S.box(b - a, 0.12, 0.18, m, y + h - 0.35, pos, farbe); else S.box(0.18, 0.12, b - a, pos, y + h - 0.35, m, farbe); }
  };
  if (kanten.pz) vorne('x', x0, x1, z1 - 0.075);
  if (kanten.px) vorne('z', z0, z1, x1 - 0.075);
  if (o.name && scene) {
    // Schild über der Öffnung, an der hinteren Wand gut sichtbar
    if (kanten.nz) {
      S.box(Math.min(x1 - x0 - 0.6, 4.5), 0.8, 0.08, (x0 + x1) / 2, y + h - 0.6, z0 + 0.19, o.schildFarbe ?? farbe);
      wandschild(S, scene, o.name, 'x', (x0 + x1) / 2, y + h - 0.6, z0 + 0.24, { farbe: o.schildFarbe ?? null, schrift: o.schrift ?? '#1f1f1f', hoehe: 0.6 });
    } else if (kanten.nx) {
      wandschild(S, scene, o.name, 'z', (z0 + z1) / 2, y + h - 0.6, x0 + 0.17, { farbe: o.schildFarbe ?? null, schrift: o.schrift ?? '#1f1f1f', hoehe: 0.6 });
    }
  }
}

// ---------------------------------------------------------------- Figuren
const HAUT = ['#f1c9a5', '#e8b88f', '#d9a77f', '#b98462', '#8d5a3b', '#6b4430'];
const HAAR = ['#2b211b', '#4a3222', '#7a4f2e', '#c9a35a', '#e0c27a', '#1a1a1a', '#8a8a8a', '#b5532f', '#d9d4cc'];
const OBEN = ['#d04a3f', '#2f63b5', '#e8e4dc', '#e0b23c', '#5b8f5a', '#8d5fbf', '#ef8b4c', '#2b2b2b', '#f4f2ee', '#3c7d8f', '#c96f8f', '#7b8a99'];
const UNTEN = ['#2b3a55', '#3a3a3a', '#6b5a48', '#20304a', '#5c6670', '#c9b48f', '#1f1f1f', '#4a5a7a'];
const ROLLEN = {
  verkauf: { oben: '#2a2f38', unten: '#2a2f38', hemd: '#ffffff', tuch: '#d23c32', schild: '#e9c46a' },
  kasse: { oben: '#2a2f38', unten: '#2a2f38', hemd: '#ffffff', tuch: '#d23c32', schild: '#3ab27a' },
  info: { oben: '#d23c32', unten: '#2a2f38', hemd: '#ffffff', tuch: '#ffffff', schild: '#ffffff' },
  leitung: { oben: '#1f2a3a', unten: '#1f2a3a', hemd: '#ffffff', tuch: '#d23c32', schild: '#4f8fe0' },
  beauty: { oben: '#1f1f1f', unten: '#1f1f1f', hemd: '#1f1f1f', tuch: '#d8b25a', schild: '#e9a3b8' },
  theke: { oben: '#f4f4f2', unten: '#2a2f38', hemd: '#f4f4f2', tuch: '#d23c32', schild: '#e9c46a', schuerze: '#d23c32', muetze: '#ffffff' },
  lager: { oben: '#4a5560', unten: '#2a2f38', hemd: '#4a5560', tuch: '#e0b23c', schild: '#e0b23c' },
  security: { oben: '#1a1a1a', unten: '#1a1a1a', hemd: '#1a1a1a', tuch: '#1a1a1a', schild: '#c9d2d8', muetze: '#1a1a1a' },
  handwerker: { oben: '#ef8b2c', unten: '#2f4a6e', hemd: '#ef8b2c', helm: '#f2c14e' },
  arzt: { oben: '#ffffff', unten: '#9bb7c7', hemd: '#9bb7c7' },
  fitness: { oben: '#ff6a2b', unten: '#1f1f1f', hemd: '#ff6a2b' },
};

/**
 * Mensch. rolle: kunde | kind | verkauf | kasse | info | leitung | beauty | theke | lager | security | handwerker | arzt | fitness | fremd
 * o: { y, ry, pose: stehen | gehen | tasche | schauen | telefon | sitzen | tragen, farbe (Oberteil für 'fremd') }
 */
export function figur(S, x, z, seed = 1, rolle = 'kunde', o = {}) {
  const r = rng(Math.floor(seed * 7919) >>> 0);
  const kind = rolle === 'kind';
  const kunde = rolle === 'kunde' || kind;
  const s = kind ? zw(r, 0.55, 0.7) : zw(r, 0.94, 1.06);
  const ry = o.ry ?? r() * PI * 2;
  const L = lokal(S, x, o.y ?? 0.06, z, ry);
  const rol = ROLLEN[rolle] ?? (rolle === 'fremd' ? { oben: o.farbe ?? '#1f5fa8', unten: '#2a2f38', hemd: o.farbe ?? '#1f5fa8', schild: '#ffffff' } : null);
  const haut = bunt(r, HAUT);
  const frau = r() < 0.55;
  const oben = rol ? rol.oben : bunt(r, OBEN);
  const unten = rol ? rol.unten : bunt(r, UNTEN);
  const schuh = bunt(r, ['#1f1f1f', '#3a2a20', '#f2f2f2', '#6b4a32']);
  const pose = o.pose ?? (rol ? (r() < 0.3 ? 'schauen' : 'stehen') : waehle(r, ['stehen', 'gehen', 'gehen', 'tasche', 'tasche', 'schauen', 'telefon', 'tragen']));
  const sitzt = pose === 'sitzen';
  const geht = pose === 'gehen' || pose === 'tasche' || pose === 'tragen';
  const schritt = geht ? zw(r, 0.25, 0.4) : 0;
  const rock = kunde && frau && !kind && r() < 0.35;
  // Glied um Gelenk (Drehpunkt oben) drehen: um x (vor/zurück) und z (seitlich)
  const glied = (w, h, t, gx, gy, gz, ax, f, az = 0, dy = 0) => {
    const g = new THREE.BoxGeometry(w * s, h * s, t * s); g.translate(0, -h * s / 2 + dy * s, 0); if (ax) g.rotateX(ax); if (az) g.rotateZ(az);
    L.geo(g, gx * s, gy * s, gz * s, f);
  };
  const huefte = sitzt ? 0.47 / s : 0.9;
  // Beine
  if (sitzt) {
    for (const sx of [-0.09, 0.09]) {
      L.box(0.15 * s, 0.15 * s, 0.46 * s, sx * s, huefte * s - 0.08 * s, 0.2 * s, unten);
      L.box(0.14 * s, (huefte - 0.04) * s - 0.06, 0.15 * s, sx * s, 0.04, 0.42 * s, unten);
      L.box(0.13 * s, 0.07 * s, 0.25 * s, sx * s, 0, 0.47 * s, schuh);
    }
  } else if (rock) {
    L.geo(new THREE.CylinderGeometry(0.17 * s, 0.27 * s, 0.5 * s, 6).translate(0, -0.25 * s, 0), 0, 0.95 * s, 0, oben === unten ? bunt(r, UNTEN) : unten);
    for (const [sx, a] of [[-0.08, schritt], [0.08, -schritt]]) { glied(0.1, 0.5, 0.11, sx, 0.52, 0, a, haut); glied(0.12, 0.07, 0.24, sx, 0.52, 0, a, schuh, 0, -0.47); }
  } else {
    for (const [sx, a] of [[-0.09, schritt], [0.09, -schritt]]) { glied(0.15, 0.82, 0.17, sx, huefte, 0, a, unten); glied(0.14, 0.08, 0.27, sx, huefte, 0.04, a, schuh, 0, -0.8); }
  }
  const y0 = sitzt ? huefte - 0.9 : 0; // Rumpf-Verschiebung
  // Rumpf (Trapez: Schultern breiter als Taille)
  const rumpf = new THREE.CylinderGeometry(0.29 * s, 0.22 * s, 0.6 * s, 4); rumpf.rotateY(PI / 4); rumpf.scale(1, 1, 0.62);
  L.geo(rumpf, 0, (1.18 + y0) * s, 0, oben);
  if (rol && rol.hemd && rol.hemd !== oben) L.box(0.13 * s, 0.34 * s, 0.02, 0, (1.18 + y0) * s, 0.12 * s, rol.hemd);
  if (rol && rol.tuch) L.box(0.08 * s, 0.2 * s, 0.025, 0, (1.24 + y0) * s, 0.135 * s, rol.tuch);
  if (rol && rol.schild) L.box(0.1 * s, 0.05 * s, 0.025, 0.12 * s, (1.33 + y0) * s, 0.13 * s, rol.schild);
  if (rol && rol.schuerze) L.box(0.36 * s, 0.75 * s, 0.03, 0, (0.55 + y0) * s, 0.13 * s, rol.schuerze);
  if (rolle === 'handwerker') { L.box(0.4 * s, 0.06 * s, 0.03, 0, (1.05 + y0) * s, 0.13 * s, '#e8e8e2'); L.box(0.4 * s, 0.06 * s, 0.03, 0, (1.25 + y0) * s, 0.13 * s, '#e8e8e2'); }
  if (rolle === 'arzt') L.box(0.46 * s, 0.6 * s, 0.24 * s, 0, (0.7 + y0) * s, 0, '#ffffff');
  if (!rol && r() < 0.35) L.box(0.4 * s, 0.1 * s, 0.24 * s, 0, (1.42 + y0) * s, 0, bunt(r, OBEN)); // Kragen/Schal
  // Arme
  const sh = 1.46 + y0;
  let aL = -schritt * 0.8, aR = schritt * 0.8, zL = -0.08, zR = 0.08;
  if (pose === 'schauen') aR = -1.1;
  if (pose === 'telefon') { aR = -2.5; zR = 0.35; }
  if (pose === 'tragen') { aL = -0.9; aR = -0.9; zL = 0; zR = 0; }
  if (sitzt) { aL = -0.9; aR = -0.9; }
  glied(0.1, 0.6, 0.12, -0.26, sh, 0, aL, oben, zL);
  glied(0.1, 0.6, 0.12, 0.26, sh, 0, aR, oben, zR);
  glied(0.08, 0.1, 0.09, -0.26, sh, 0, aL, haut, zL, -0.6);
  glied(0.08, 0.1, 0.09, 0.26, sh, 0, aR, haut, zR, -0.6);
  if (pose === 'telefon') glied(0.06, 0.14, 0.03, 0.26, sh, 0, aR, '#1e2328', zR, -0.62);
  // Kopf und Haare
  L.box(0.09 * s, 0.08 * s, 0.09 * s, 0, (1.48 + y0) * s, 0, haut);
  const kopfY = (1.68 + y0) * s;
  L.geo(new THREE.SphereGeometry(0.125 * s, 8, 6).scale(0.95, 1.12, 1), 0, kopfY, 0, haut);
  const haar = bunt(r, kind ? HAAR.slice(0, 5) : HAAR);
  if (rol && rol.helm) L.geo(new THREE.SphereGeometry(0.15 * s, 8, 4, 0, PI * 2, 0, PI / 2), 0, kopfY + 0.03 * s, 0, rol.helm);
  else if (rol && rol.muetze) L.box(0.25 * s, 0.1 * s, 0.25 * s, 0, kopfY + 0.1 * s, 0, rol.muetze);
  else {
    const stil = frau ? waehle(r, ['lang', 'lang', 'zopf', 'bob', 'kurz']) : waehle(r, ['kurz', 'kurz', 'kurz', 'glatze', 'muetze']);
    if (stil !== 'glatze') L.geo(new THREE.SphereGeometry(0.135 * s, 8, 4, 0, PI * 2, 0, PI * 0.55).scale(1, 1.05, 1.02), 0, kopfY + 0.015 * s, -0.008, stil === 'muetze' ? bunt(r, OBEN) : haar);
    if (stil === 'lang') L.box(0.26 * s, 0.36 * s, 0.09 * s, 0, kopfY - 0.3 * s, -0.08 * s, haar);
    if (stil === 'bob') L.box(0.28 * s, 0.17 * s, 0.24 * s, 0, kopfY - 0.13 * s, -0.025 * s, haar);
    if (stil === 'zopf') L.geo(new THREE.SphereGeometry(0.07 * s, 6, 4), 0, kopfY + 0.08 * s, -0.13 * s, haar);
  }
  // Taschen
  if (kunde && !sitzt) {
    if (pose === 'tasche') {
      const f = r() < 0.6 ? '#d23c32' : bunt(r, ['#f4f2ee', '#c9a26b', '#2b2b2b']);
      L.box(0.3 * s, 0.34 * s, 0.11 * s, -0.31 * s, 0.55 * s, 0, f);
      L.box(0.16 * s, 0.1 * s, 0.02, -0.31 * s, 0.89 * s, 0, dunkler(f, 0.1));
      if (f === '#d23c32') L.box(0.02, 0.1 * s, 0.07 * s, -0.31 * s - 0.155 * s, 0.7 * s, 0, '#ffffff');
    } else if (pose === 'tragen') {
      L.box(0.42 * s, 0.3 * s, 0.32 * s, 0, 0.95 * s, 0.38 * s, bunt(r, ['#c9a26b', '#ffffff', '#d23c32']));
    } else if (!kind && r() < 0.45) {
      if (frau) L.box(0.08 * s, 0.24 * s, 0.26 * s, 0.33 * s, 0.98 * s, 0, bunt(r, PAL.taschen));
      else L.box(0.32 * s, 0.4 * s, 0.14 * s, 0, 1.0 * s, -0.19 * s, bunt(r, ['#2b2b2b', '#3f6b3a', '#2f5f8a', '#c25b2a']));
    }
  }
}

// ---------------------------------------------------------------- Kachel für Katalog und Vorschau
/**
 * Raum aus nx × nz Zellen mit zwei Rückwänden und Kundschaft. Ursprung (0, 0), Boden bei y = 0.
 * gruppe wie bei zelle(); o: { seed, dichte, kunden (Anzahl), name (Schild), wand = true, basis, mieter }
 */
export function raumKachel(S, scene, gruppe, o = {}) {
  vorbereiten(S, scene);
  const nx = o.nx ?? 2, nz = o.nz ?? 2, seed = o.seed ?? 1, d = o.dichte ?? 1;
  const r = rng(seed * 13 + 1);
  const W = nx * RASTER, T = nz * RASTER;
  S.box(W + 0.6, 0.5, T + 0.6, W / 2 - 0.3, -0.25, T / 2 - 0.3, '#3a434b');
  S.box(W, 0.06, T, W / 2, -0.03, T / 2, '#d9d4cb');
  const frei = [];
  const m = gruppe === 'konzession' ? (o.marke ?? marke(seed)) : null;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const res = zelle(S, gruppe, i * RASTER, j * RASTER, seed * 100 + i * 10 + j, d, { wandX: i === 0, wandZ: j === 0, index: i + j * nx, basis: o.basis, mieter: o.mieter, marke: m, personal: i === nx - 1 && j === 0 });
    frei.push(...res.frei);
  }
  rueckwand(S, 'x', 0, W, 0, 0, WANDHOEHE);
  rueckwand(S, 'z', 0, T, 0, 0, WANDHOEHE);
  if (m) abtrennung(S, scene, 0.6, 0.6, W, T, { farbe: m.farbe, name: m.name, schrift: m.schrift, kanten: { nx: false, nz: true, px: true, pz: true }, glas: true, h: 3.8, oeffnung: 3.5 });
  if (gruppe === 'untermiete') {
    const mt = MIETER[o.mieter ?? 'discounter'];
    abtrennung(S, scene, 0.6, 0.6, W, T, { farbe: '#e9e4dc', name: mt.name, schrift: mt.schrift, schildFarbe: mt.farbe, kanten: { nx: false, nz: true, px: true, pz: true }, glas: o.mieter !== 'fitness', h: 3.8, oeffnung: 3 });
  }
  if (gruppe === 'umbau') { const L = lokal(S, 0, 0.06, 0, 0); bauzaun(L, 0.3, W - 0.3, T - 0.3); bauzaun(lokal(S, W - 0.3, 0.06, T / 2, PI / 2), -T / 2 + 0.4, T / 2 - 0.6, 0); }
  const name = o.name ?? (gruppe === 'konzession' || gruppe === 'untermiete' ? null : abteilungsname(gruppe));
  if (name && scene) haengeschild(S, scene, name, W * 0.55, 3.6, T * 0.45, { farbe: gruppe === 'offprice' ? '#ffd400' : '#2a3540', schrift: gruppe === 'offprice' ? '#d4212a' : '#ffffff' });
  const kunden = o.kunden ?? (gruppe === 'leer' || gruppe === 'umbau' ? 0 : Math.round(nx * nz * 1.6));
  for (let k = 0; k < kunden && frei.length; k++) {
    const idx = Math.floor(r() * frei.length);
    const [fx, fz] = frei.splice(idx, 1)[0];
    figur(S, fx, fz, seed * 1000 + k, r() < 0.12 ? 'kind' : 'kunde', { ry: Math.atan2(W / 2 - fx, T / 2 - fz) + zw(r, -0.8, 0.8) });
  }
  return new THREE.Box3(new THREE.Vector3(-0.6, -0.5, -0.6), new THREE.Vector3(W, WANDHOEHE, T));
}

// ---------------------------------------------------------------- Export der Bausteine für abteilung.js
export {
  kleiderReihe, stapel, wandKleider, bildtafel, rundstaender, staender, warenTisch, puppenPodest, umkleiden, standspiegel,
  wandRegal, prodPackungen, prodFlaschen, prodGeschirr, prodGefaltet, prodSchuhe, prodTaschen, vitrine, flakonFlaeche,
  markenwand, flakonTurm, spiegelSaeule, schminkplatz, schuhtisch, pouf, uhrenvitrine, taschenWuerfel, sofaInsel, bettInsel,
  stehlampe, geschirrAufTisch, teddy, pluschBerg, gondel, spieltisch, weinregal, feinkosttheke, stuhl, obstStand, schuhwand,
  rucksackwand, rucksackTurm, zelt, fahrrad, radwand, skiwand, helme, skistaender, snowboardInsel, trikotwand, ballkorb, tor,
  schrift, preisschild, wuehltisch, gitterbox, abgedeckt, kartons, absperrung, bauzaun, leiter, material, schutt, schubkarre,
  laufband, hantelbank, gangMoebel, beimoebel, PAL, HOLZ, BODEN, MARKEN, UNTERMIETE, MODUL, PREISE, anz, bunt,
};

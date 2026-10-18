// Abteilungsflächen für die aufgeschnittenen Warenhausetagen (Coffee-Inc-2-Puppenhaus).
//
// Eine Abteilung ist eine zusammenhängende Fläche aus mehreren 5-m-Zellen (Spuren quer zum Hauptgang). Sie bekommt
// - einen eigenen Boden (Farbwelt), eine Abschlusskante zum Gang und ein Deckenschild in der Abteilungsfarbe,
// - hohe Wandsysteme nur an den hinteren Seiten (-x, -z: Außenwand, Nachbarabteilung, Nebenraum),
// - ein ruhiges Inselraster mit Gängen, eine Vorzone mit niedriger Ware zum Hauptgang, Kasse, Personal.
// Große Abteilungen teilen sich in Shop-in-Shop-Flächen (Damen: Marken, Herren: Anzug/Casual/Schuhe, Kinder: Kiko/Baby/Ranzen).
//
// API
//   flaeche(S, scene, art, Z, o)  Z = { alle: [{i,j}], kante(i,j,di,dj) -> 'wand'|'nachbar'|'gang'|'front'|'schnitt',
//                                      sicht(x,z) -> bool, y }   o = { seed, dichte, eg, kasse, marke, basis, mieter, schild }
//                                 Rückgabe { frei: [[x,z]], belegt: [[x0,z0,x1,z1]], flaeche: m² }
//   abteilungKachel(S, scene, art, o)  Ausschnitt 15 × 15 m mit Rückwänden und Gangstreifen (Katalog)
//   ABT, ABT_NAMEN, abteilungsArt(f), DAMEN_MARKEN, BEAUTY_MARKEN, eigenmarkeAlsMarke(em)
//   Eigenmarken-Shop: o.eigenmarke bzw. f.marke = { eigenmarke: true, name, farbe, anteil } (siehe flaeche, Schritt 0)
import { THREE, rng, zw, waehle, dunkler, heller, textTextur } from './basis.js';
import {
  RASTER, WANDHOEHE, GLAS, lokal, boden, figur, haengeschild, wandschild, kassentresen, rueckwand, vorbereiten, puppe, cafeEcke,
  MIETER,
} from './innen.js';
import * as I from './innen.js';

const R = RASTER, PI = Math.PI;
const { PAL, HOLZ, MODUL, UNTERMIETE, MARKEN, PREISE, anz, bunt } = I;
const WANDARTEN = new Set(['wand', 'nachbar']);
const klemm = (v, a, b) => Math.max(a, Math.min(b, v));

// ================================================================ Marken (fiktiv)
export const BEAUTY_MARKEN = [
  { name: 'MAISON BELROSE', farbe: '#1f1f1f', akzent: '#d8b25a', schrift: '#e2c27a', licht: '#fff4dc' },
  { name: 'Lumière Blanche', farbe: '#f7f3ec', akzent: '#d8b25a', schrift: '#2a2a2a', licht: '#ffffff' },
  { name: 'AURÉLIE', farbe: '#e9c9cf', akzent: '#1f1f1f', schrift: '#6b2737', licht: '#fff0f2' },
  { name: 'NOVA SKIN', farbe: '#ffffff', akzent: '#6c8f86', schrift: '#2c4a5e', licht: '#eef7f5' },
  { name: 'KOBALT', farbe: '#1c2b4a', akzent: '#c9d2d8', schrift: '#ffffff', licht: '#e6eefc' },
  { name: 'Iris Moreau', farbe: '#2b2b2b', akzent: '#b5162b', schrift: '#ffffff', licht: '#fff1f1' },
  { name: 'SOLEIA', farbe: '#f2e3c9', akzent: '#c08a3e', schrift: '#7a4b1e', licht: '#fff8ea' },
];
export const DAMEN_MARKEN = [
  { name: 'Lindqvist', wand: '#2c3e50', kopf: '#2c3e50', schrift: '#f4efe6', boden: { a: '#e8e3da', b: '#dcd5ca', m: 'karo' }, pal: ['#2c3e50', '#f4efe6', '#9fb3c8', '#c9b8a0', '#1f1f1f', '#e8dcc6', '#7d97b8'] },
  { name: 'Marlene Voss', wand: '#b8946c', kopf: '#3b2a20', schrift: '#f2e6d0', boden: { a: '#d9bf98', b: '#cfb38a', m: 'parkett' }, pal: ['#c9a26b', '#f2e6d0', '#3b2a20', '#8b5a3c', '#e8dcc6', '#6b2737', '#d8c3a5'] },
  { name: 'FRIDA', wand: '#f4f4f2', kopf: '#1f1f1f', schrift: '#ffffff', boden: { a: '#c4c6c8', b: '#b8babd', m: 'beton' }, pal: ['#1f1f1f', '#ffffff', '#e8403a', '#f2c14e', '#9a9a9a', '#5bc0eb', '#e88a6a'] },
  { name: 'Côte Bleue', wand: '#e7edf3', kopf: '#1f3f6e', schrift: '#ffffff', boden: { a: '#eef2f5', b: '#dde5ec', m: 'dielen' }, pal: ['#1f3f6e', '#ffffff', '#c9483e', '#9fc1dc', '#f4f0ea', '#2f63b5'] },
  { name: 'Selma Berg', wand: '#ead2d6', kopf: '#8a3b52', schrift: '#fff3f5', boden: { a: '#efdfe2', b: '#e6d2d6', m: 'teppich' }, pal: ['#d65a6f', '#f2c6d2', '#8a3b52', '#f4f0ea', '#c9a3d4', '#e8b4c4'] },
  { name: 'Hartwig Woman', wand: '#efe9e1', kopf: '#d23c32', schrift: '#ffffff', boden: { a: '#d8bb94', b: '#ccad84', m: 'dielen' }, pal: PAL.damen },
];
/** Eigenmarke aus dem Spiel ({ name, farbe }) als Shop-Gestaltung wie DAMEN_MARKEN (Wand, Kopfband, Schrift, Boden, Warenfarben). */
export function eigenmarkeAlsMarke(em) {
  const f = em.farbe ?? '#8a5a7a';
  const hell = new THREE.Color(f).getHSL({}).l > 0.62;
  return {
    eigenmarke: true, name: em.name, kopf: f, schrift: hell ? '#1f1f1f' : '#ffffff', wand: heller(f, 0.42),
    boden: { a: heller(f, 0.5), b: heller(f, 0.44), m: 'dielen' },
    pal: [f, heller(f, 0.22), dunkler(f, 0.12), '#f4f0ea', '#ffffff', heller(f, 0.36), '#2b2b2b'],
  };
}
const HERREN_MARKEN = {
  herren: { name: 'Hartwig Men', kopf: '#1f2a3a', schrift: '#e9d9b5' },
  herren_casual: { name: 'Kordel & Co.', kopf: '#3f6b5a', schrift: '#f4efe6' },
  herren_schuhe: { name: 'Herrenschuhe', kopf: '#4a3324', schrift: '#f2e6d0' },
};

// ================================================================ Kleine Hilfen
function kopfband(ctx, L, w, text, farbe, schriftF, y = 3.25, h = 0.62) {
  L.box(w, h, 0.1, 0, y, 0.06, farbe);
  // Name steht schon im Oberfries darüber: nicht ein zweites Mal ins Kopfband (sonst doppelt und versetzt)
  const fries = !ctx.A?.rahmen && text === (ctx.marke?.name ?? ctx.A?.name);
  if (ctx.scene && text && !fries) I.schrift(L, text, 0, y + h / 2, 0.13, h * 0.6, schriftF);
}
function pflanze(L, lx, lz, gross = 1) {
  L.box(0.62 * gross, 0.6 * gross, 0.62 * gross, lx, 0, lz, '#ece6dc');
  L.kugel(0.5 * gross, lx, 1.05 * gross, lz, '#5f9a56');
  L.kugel(0.34 * gross, lx + 0.15, 1.55 * gross, lz + 0.08, '#6fa860');
}
function teppich(L, w, t, lx, lz, f) { L.box(w, 0.02, t, lx, 0, lz, f); }
function sitzFigur(ctx, L, lx, lz, ry, rolle = 'kunde') {
  figur(ctx.S, ...L.P(lx, lz), (ctx.r() * 1e9) | 0, rolle, { y: L.oy, ry: L.rot + ry, pose: 'sitzen' });
}
function stehFigur(ctx, L, lx, lz, ry, rolle = 'verkauf', pose) {
  figur(ctx.S, ...L.P(lx, lz), (ctx.r() * 1e9) | 0, rolle, { y: L.oy, ry: L.rot + ry, pose });
}
/** Niedriger Präsentationstisch mit Ware (Vorzone, Inseln). */
function niedrigTisch(L, lx, lz, w, t, pal, r, d, farbe = HOLZ.weiss, h = 0.72) { I.warenTisch(L, lx, lz, w, t, pal, r, d, farbe, h); }

// ================================================================ BEAUTY
function beautyCounter(L, r, d, ctx, m) {
  const korpus = m.farbe, akz = m.akzent;
  const dunkel = new THREE.Color(korpus).getHSL({}).l < 0.4;
  // U-Insel: drei Vitrinentresen, offen nach vorne
  for (const [dx, dz, ww, dd] of [[0, -1.05, 3.0, 0.65], [-1.18, 0.2, 0.65, 1.9], [1.18, 0.2, 0.65, 1.9]]) {
    L.box(ww, 0.9, dd, dx, 0, dz, korpus);
    L.box(ww + 0.04, 0.05, dd + 0.04, dx, 0.9, dz, akz);
    I.flakonFlaeche(L, dx, 0.95, dz, ww - 0.15, dd - 0.15, r, d);
    L.box(ww, 0.28, dd, dx, 0.95, dz, GLAS);
    L.box(ww - 0.1, 0.06, 0.04, dx, 0.25, dz + dd / 2 + 0.01, akz);
  }
  // Leuchtrückwand mit Markenname
  L.box(2.6, 2.5, 0.16, 0, 0, -1.55, korpus);
  L.box(2.2, 1.35, 0.03, 0, 0.95, -1.46, m.licht);
  for (let i = 0; i < 3; i++) {
    L.box(2.1, 0.03, 0.2, 0, 1.05 + i * 0.42, -1.38, dunkel ? '#e8e2d6' : '#ffffff');
    if (d > 0.4) for (let k = 0; k < 9; k++) L.box(0.09, zw(r, 0.14, 0.24), 0.09, -0.95 + k * 0.24, 1.08 + i * 0.42, -1.36, bunt(r, PAL.flakon));
  }
  L.box(2.6, 0.5, 0.18, 0, 2.5, -1.55, akz);
  if (ctx.scene) I.schrift(L, m.name, 0, 2.75, -1.45, 0.3, dunkel ? '#1f1f1f' : (m.schrift === '#2a2a2a' ? '#ffffff' : '#ffffff'));
  stehFigur(ctx, L, 0.2, -0.45, 0, 'beauty');
}
function flakonWand(L, w, r, d, ctx, m) {
  const dunkel = new THREE.Color(m.farbe).getHSL({}).l < 0.4;
  L.box(w, 3.0, 0.14, 0, 0, 0.07, m.farbe);
  L.box(w - 0.4, 1.7, 0.03, 0, 0.95, 0.15, m.licht);
  for (let i = 0; i < 4; i++) {
    const y = 1.0 + i * 0.42;
    L.box(w - 0.5, 0.03, 0.28, 0, y, 0.3, dunkel ? '#e8e2d6' : '#ffffff');
    if (d < 0.45 && i % 2) continue;
    const n = Math.floor((w - 0.7) / 0.2);
    for (let k = 0; k < n; k++) L.box(0.1, zw(r, 0.14, 0.26), 0.1, -w / 2 + 0.45 + k * 0.2, y + 0.03, 0.3, bunt(r, PAL.flakon));
  }
  L.box(w - 0.3, 0.88, 0.5, 0, 0, 0.4, dunkel ? '#2b2b2b' : '#ffffff');
  L.box(w - 0.3, 0.04, 0.52, 0, 0.88, 0.4, m.akzent);
  kopfband(ctx, L, w, m.name, m.akzent, dunkel ? '#1f1f1f' : '#ffffff', 3.05, 0.55);
}
function schminkInsel(L, r, d, ctx) {
  L.box(3.0, 0.82, 0.7, 0, 0, -0.6, '#ffffff');
  L.box(3.04, 0.04, 0.74, 0, 0.82, -0.6, '#d8b25a');
  for (const x of [-0.75, 0.75]) {
    L.box(0.8, 0.95, 0.05, x, 0.86, -0.92, '#e3edf1');
    for (let k = 0; k < 5; k++) L.kugel(0.04, x - 0.36 + k * 0.18, 1.86, -0.9, '#fff3c4');
    L.zyl(0.2, 0.2, 0.7, x, 0, 0.05, '#1f1f1f', 8);
    L.zyl(0.22, 0.22, 0.05, x, 0.7, 0.05, '#e9a3b8', 8);
    for (let i = 0; i < 4; i++) L.box(0.06, 0.12, 0.06, x - 0.25 + i * 0.16, 0.86, -0.7, bunt(r, PAL.flakon));
  }
  sitzFigur(ctx, L, -0.75, 0.05, PI);
  stehFigur(ctx, L, -0.15, 0.25, PI * 0.8, 'beauty');
  L.box(2.6, 0.02, 1.2, 0, 0, 0.25, '#e9dfd2');
}
function beautyKasse(L, r, d, ctx) {
  L.box(2.8, 1.0, 0.8, 0, 0, -0.3, '#1f1f1f');
  L.box(2.9, 0.05, 0.9, 0, 1.0, -0.3, '#d8b25a');
  L.box(0.8, 1.0, 1.4, -1.0, 0, 0.6, '#1f1f1f');
  L.box(0.9, 0.05, 1.5, -1.0, 1.0, 0.6, '#d8b25a');
  for (const kx of [0.0, 0.9]) { L.box(0.32, 0.25, 0.04, kx, 1.12, -0.5, '#2b3640'); stehFigur(ctx, L, kx, -1.05, 0, 'beauty'); }
  for (let i = 0; i < 4; i++) L.box(0.3, 0.36, 0.12, -1.05 + (i % 2) * 0.3, 1.05, 0.25 + Math.floor(i / 2) * 0.4, i % 2 ? '#ffffff' : '#1f1f1f');
}
function beautyVorne(L, r, d, ctx) {
  // Aktionsaufbau: großer Deko-Flakon auf Podest
  L.zyl(0.75, 0.75, 0.32, 0, 0, 0, '#ffffff', 12);
  L.zyl(0.78, 0.78, 0.04, 0, 0.32, 0, '#d8b25a', 12);
  const f = bunt(r, ['#f2c6d2', '#d8b25a', '#9bc6d8', '#b5162b', '#c3a6d8']);
  L.box(0.5, 0.75, 0.32, 0, 0.36, 0, f);
  L.box(0.18, 0.16, 0.18, 0, 1.11, 0, '#d8b25a');
  L.box(0.3, 0.22, 0.3, 0, 1.27, 0, '#1f1f1f');
  for (let k = 0; k < 6; k++) { const a = (k / 6) * PI * 2; L.box(0.08, 0.16, 0.08, Math.cos(a) * 0.55, 0.36, Math.sin(a) * 0.55, bunt(r, PAL.flakon)); }
}

// ================================================================ DAMEN
function damenPal(ctx) { return ctx.marke?.pal ?? PAL.damen; }
function damenWand(L, w, r, d, ctx) {
  const m = ctx.marke ?? DAMEN_MARKEN[5];
  I.wandKleider(L, w, damenPal(ctx), r, d, { panel: m.wand, zwei: r() < 0.5, bild: false });
  kopfband(ctx, L, w, m.name, m.kopf, m.schrift);
}
function damenWandFach(L, w, r, d, ctx) {
  const m = ctx.marke ?? DAMEN_MARKEN[5];
  I.wandRegal(L, w, 2.6, 4, m.wand, I.prodGefaltet(damenPal(ctx)), r, d, 0.45);
  kopfband(ctx, L, w, m.name, m.kopf, m.schrift);
}
function damenUmkleiden(L, w, r, d, ctx) { I.umkleiden(L, w, Math.max(2, Math.round(w / 1.2)), r, ctx.marke?.kopf ?? '#7b2f3a'); }
const damenInseln = [
  (L, r, d, ctx) => { const p = damenPal(ctx); I.rundstaender(L, -0.85, -0.6, p, r, d); I.rundstaender(L, 0.85, -0.6, p, r, d); niedrigTisch(L, 0, 0.75, 2.2, 0.8, p, r, d, HOLZ.weiss); },
  (L, r, d, ctx) => { const p = damenPal(ctx); I.staender(L, 0, -0.85, 2.8, p, r, d); I.staender(L, 0, 0.25, 2.8, p, r, d, 1.4); puppe(L, 1.25, 1.05, r, 'damen', p, 0.2); },
  (L, r, d, ctx) => { const p = damenPal(ctx); I.staender(L, -0.6, -0.8, 1.6, p, r, d); I.rundstaender(L, 0.95, -0.7, p, r, d); niedrigTisch(L, -0.4, 0.7, 1.8, 0.8, p, r, d, HOLZ.hell); puppe(L, 1.0, 0.8, r, 'damen', p, -0.3); },
];
function damenVorne(L, r, d, ctx) { I.puppenPodest(L, 0, 0, 'damen', damenPal(ctx), r, 2.6); }

// ================================================================ HERREN
const ANZUG = ['#1f2a3a', '#2b3a55', '#3a3f47', '#4a4f57', '#1f1f1f', '#5a5048', '#2f3b4a'];
const HEMD = ['#ffffff', '#dfe8f2', '#b9cde3', '#f2efe8', '#e9d9de', '#cfd6dc'];
const CASUAL = ['#3f5a7a', '#c9b48f', '#6b5a48', '#4a5a3e', '#e8e4dc', '#2b3a55', '#a8452f', '#7d8f9c'];
function sakko(L, lx, y, lz, f, ry = 0) {
  const P = L.sub(lx, lz, ry);
  P.box(0.46, 0.72, 0.16, 0, y, 0, f);
  P.box(0.12, 0.34, 0.02, 0, y + 0.36, 0.085, '#f4f2ee');
  P.box(0.05, 0.28, 0.02, 0, y + 0.38, 0.095, bunt(L._r ?? Math.random, ['#6d2f3a', '#2b3a55', '#a67c52', '#c9483e']));
  P.box(0.2, 0.06, 0.06, 0, y + 0.72, 0, '#9aa3aa');
}
function anzugWand(L, w, r, d, ctx) {
  L.box(w, 2.9, 0.1, 0, 0, 0.05, '#4e3a2c');
  L.box(w, 0.12, 0.14, 0, 2.9, 0.07, '#3a2a20');
  for (const y of [1.05, 2.05]) {
    L.box(w - 0.2, 0.04, 0.04, 0, y, 0.35, HOLZ.chrom);
    I.kleiderReihe(L, -w / 2 + 0.6, w / 2 - 0.6, y, 0.35, ANZUG, r, d, { hMin: 0.7, hMax: 0.8, breit: 0.5, abstand: 0.11 });
  }
  if (d > 0.45) { L._r = r; sakko(L, -w / 2 + 0.3, 1.25, 0.3, bunt(r, ANZUG)); sakko(L, w / 2 - 0.3, 1.25, 0.3, bunt(r, ANZUG)); }
  L.box(w - 0.2, 0.04, 0.38, 0, 2.3, 0.25, '#6f5442');
  I.stapel(L, 0, 0.25, w - 0.5, 0.3, 2.34, HEMD, r, d);
  const m = HERREN_MARKEN[ctx.art] ?? HERREN_MARKEN.herren;
  kopfband(ctx, L, w, m.name, m.kopf, m.schrift);
}
function hemdenWand(L, w, r, d, ctx) {
  I.wandRegal(L, w, 2.7, 6, '#5a4232', I.prodGefaltet(HEMD), r, d, 0.42);
  const m = HERREN_MARKEN[ctx.art] ?? HERREN_MARKEN.herren;
  kopfband(ctx, L, w, m.name, m.kopf, m.schrift);
}
function casualWand(L, w, r, d, ctx) {
  I.wandKleider(L, w, CASUAL, r, d, { panel: '#7d8a8f', zwei: true, bild: false });
  kopfband(ctx, L, w, 'Kordel & Co.', '#3f6b5a', '#f4efe6');
}
function hemdenTisch(L, lx, lz, w, t, r, d) {
  L.box(w, 0.78, t, lx, 0, lz, '#5a4232');
  L.box(w + 0.06, 0.05, t + 0.06, lx, 0.78, lz, '#3a2a20');
  const nx = Math.max(2, Math.floor(w / 0.42)), nz = Math.max(1, Math.floor(t / 0.36));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (d < 0.5 && (i + j) % 2) continue;
    const px = lx - w / 2 + (i + 0.5) * (w / nx), pz = lz - t / 2 + (j + 0.5) * (t / nz), f = bunt(r, HEMD), h = zw(r, 0.12, 0.26);
    L.box(0.32, h, 0.27, px, 0.83, pz, f);
    if (d > 0.7) L.box(0.12, 0.03, 0.06, px, 0.83 + h, pz + 0.08, '#ffffff');
  }
}
function krawattenVitrine(L, lx, lz, r, d) {
  I.vitrine(L, lx, lz, 1.6, 0.7, 0.9, '#3a2a20', (L2, x, y, z, w, t, r2) => {
    const n = d < 0.5 ? 5 : 10;
    for (let i = 0; i < n; i++) for (const j of [-0.12, 0.12]) L2.zyl(0.06, 0.06, 0.05, x - w / 2 + (i + 0.5) * (w / n), y, z + j, bunt(r2, ['#6d2f3a', '#2b3a55', '#a67c52', '#4a5a3e', '#c9483e', '#d8b25a']), 6);
  }, r, d);
}
function ledersessel(L, lx, lz, ry, f = '#7a4a2e') {
  const P = L.sub(lx, lz, ry);
  P.box(0.85, 0.42, 0.8, 0, 0, 0, f);
  P.box(0.85, 0.5, 0.2, 0, 0.42, -0.3, dunkler(f, 0.05));
  P.box(0.16, 0.22, 0.8, -0.35, 0.42, 0, dunkler(f, 0.04));
  P.box(0.16, 0.22, 0.8, 0.35, 0.42, 0, dunkler(f, 0.04));
}
function sesselGruppe(L, r, d, ctx) {
  teppich(L, 3.0, 2.4, 0, 0, '#6b2f3a');
  ledersessel(L, -0.75, -0.3, 0.35); ledersessel(L, 0.75, -0.3, -0.35);
  L.zyl(0.32, 0.32, 0.5, 0, 0, 0.4, '#3a2a20', 10); L.box(0.3, 0.03, 0.22, 0.05, 0.5, 0.4, '#f4f0ea');
  if (r() < 0.6) sitzFigur(ctx, L, -0.75, -0.3, 0.35);
  I.standspiegel(L, 1.3, 0.9, -0.6);
}
const herrenInseln = [
  (L, r, d, ctx) => { hemdenTisch(L, -0.6, -0.5, 1.8, 1.1, r, d); krawattenVitrine(L, 0.9, 0.85, r, d); puppe(L, -1.2, 1.0, r, 'herren', ANZUG, 0.3); },
  (L, r, d, ctx) => { I.staender(L, 0, -0.8, 2.8, ANZUG, r, d, 1.7); I.staender(L, 0, 0.35, 2.8, HEMD.concat(ANZUG), r, d, 1.4); },
  (L, r, d, ctx) => { I.puppenPodest(L, 0, -0.6, 'herren', ANZUG, r, 2.8); hemdenTisch(L, 0, 0.9, 2.4, 0.8, r, d); },
];
const casualInseln = [
  (L, r, d, ctx) => { niedrigTisch(L, 0, -0.6, 2.6, 1.0, CASUAL, r, d, '#7b6a58'); I.rundstaender(L, -0.9, 0.9, CASUAL, r, d); I.rundstaender(L, 0.9, 0.9, CASUAL, r, d); },
  (L, r, d, ctx) => { I.staender(L, 0, -0.8, 2.6, CASUAL, r, d); puppe(L, -0.9, 0.7, r, 'herren', CASUAL, 0.2); puppe(L, 0.0, 0.8, r, 'herren', CASUAL, -0.2); niedrigTisch(L, 1.0, 0.7, 0.9, 0.8, CASUAL, r, d, '#7b6a58'); },
];
function herrenSchuhWand(L, w, r, d, ctx) {
  I.wandRegal(L, w, 2.6, 5, '#4e3a2c', I.prodSchuhe(['#2b2b2b', '#5a3b22', '#8b5a3c', '#3a2a20', '#6b4a32']), r, d, 0.4);
  kopfband(ctx, L, w, 'Herrenschuhe', '#4a3324', '#f2e6d0');
}
function herrenSchuhInsel(L, r, d, ctx) {
  L.box(2.4, 0.42, 0.55, 0, 0, -0.2, '#6b2f3a'); L.box(2.4, 0.08, 0.55, 0, 0.42, -0.2, '#7a4a2e');
  I.schuhtisch(L, 0, -1.1, r, d, 2.4, '#4e3a2c', ['#2b2b2b', '#5a3b22', '#8b5a3c']);
  fussSpiegel(L, 1.0, 0.75, -0.3);
  if (r() < 0.6) sitzFigur(ctx, L, -0.5, -0.2, PI);
}
function fussSpiegel(L, lx, lz, ry) { const P = L.sub(lx, lz, ry); P.box(0.5, 0.05, 0.25, 0, 0, 0, '#2a2d31'); P.geo(new THREE.BoxGeometry(0.46, 0.5, 0.03).rotateX(-0.25), 0, 0.3, 0, '#e3edf1'); }

// ================================================================ KINDER
function kikoWand(L, w, r, d, ctx) {
  I.wandKleider(L, w, PAL.kinder, r, d, { panel: '#cfe6f2', zwei: true, breit: 0.3, bild: false, hMin: 0.4, hMax: 0.6 });
  kopfband(ctx, L, w, ctx.art === 'baby' ? 'Baby' : 'Kids', ctx.art === 'baby' ? '#7fc8b5' : '#f28c28', '#ffffff');
}
function schulranzenWand(L, w, r, d, ctx) {
  L.box(w, 2.6, 0.08, 0, 0, 0.04, '#f7d26a');
  for (let j = 0; j < 4; j++) {
    const y = 0.25 + j * 0.6;
    L.box(w - 0.2, 0.04, 0.42, 0, y, 0.25, '#ffffff');
    const n = Math.floor((w - 0.4) / (d < 0.5 ? 0.7 : 0.42));
    for (let k = 0; k < n; k++) {
      const u = -w / 2 + 0.4 + k * ((w - 0.6) / n), f = bunt(r, ['#ef5b5b', '#5bc0eb', '#9bc53d', '#7b6cf6', '#ff8c42', '#f78fb3', '#1f6fd1']);
      L.box(0.32, 0.4, 0.22, u, y + 0.04, 0.22, f);
      if (d > 0.6) L.box(0.24, 0.06, 0.02, u, y + 0.2, 0.34, '#f2f2ee');
    }
  }
  kopfband(ctx, L, w, 'Schulranzen', '#1f6fd1', '#ffffff');
}
function kinderwagen(L, lx, lz, r, ry = 0) {
  const P = L.sub(lx, lz, ry);
  const f = bunt(r, ['#7b8a99', '#2b3a55', '#c96f8f', '#5f8f7a', '#e8dcc6', '#2b2b2b']);
  for (const x of [-0.32, 0.32]) for (const z of [-0.25, 0.25]) P.geo(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10).rotateX(PI / 2).rotateY(PI / 2), x, 0.13, z, '#1f1f1f');
  P.box(0.7, 0.05, 0.05, 0, 0.28, 0, '#9aa3aa');
  P.box(0.75, 0.32, 0.46, 0, 0.42, 0, f);
  P.geo(new THREE.SphereGeometry(0.3, 8, 4, 0, PI, 0, PI / 2).rotateY(-PI / 2).scale(1, 1, 1.3), -0.2, 0.74, 0, dunkler(f, 0.05));
  P.box(0.05, 0.55, 0.05, 0.42, 0.55, 0, '#9aa3aa');
  P.box(0.05, 0.05, 0.42, 0.45, 1.08, 0, '#1f1f1f');
}
function babybett(L, lx, lz, r) {
  L.box(1.3, 0.12, 0.7, lx, 0.35, lz, '#ffffff');
  L.box(1.2, 0.1, 0.6, lx, 0.47, lz, bunt(r, ['#d8e8f0', '#f6dfe6', '#e8f4ea']));
  for (let i = 0; i <= 8; i++) { L.box(0.03, 0.55, 0.03, lx - 0.65 + i * 0.1625, 0.35, lz + 0.35, '#ffffff'); }
  for (const s of [-0.65, 0.65]) L.box(0.06, 0.95, 0.7, lx + s, 0, lz, '#ffffff');
  L.box(0.03, 0.8, 0.03, lx + 0.55, 0.9, lz - 0.3, '#d8c6a8');
  for (let k = 0; k < 4; k++) L.kugel(0.06, lx + 0.25 + k * 0.12, 1.45, lz - 0.3 + (k % 2) * 0.12, bunt(r, PAL.kinder));
}
function spielecke(L, r, d, ctx) {
  const farben = ['#ffd166', '#5bc0eb', '#ef5b5b', '#9bc53d'];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) L.box(1.0, 0.06, 1.0, -1.0 + i * 1.0, 0, -0.5 + j * 1.0, farben[(i + j) % 4]);
  L.box(0.9, 0.9, 0.5, -1.0, 0.06, -0.8, '#7b6cf6');
  L.geo(new THREE.BoxGeometry(0.5, 0.05, 1.3).rotateX(0.6), -1.0, 0.55, -0.15, '#ff8c42');
  for (let k = 0; k < (d < 0.5 ? 3 : 7); k++) L.box(0.3, 0.3, 0.3, zw(r, 0.0, 1.2), 0.06 + (k > 4 ? 0.3 : 0), zw(r, -0.7, 0.6), bunt(r, PAL.kinder), zw(r, -0.4, 0.4));
  for (const [x, z] of [[0.3, 0.7], [1.1, -0.2]]) figur(ctx.S, ...L.P(x, z), (r() * 1e9) | 0, 'kind', { y: L.oy + 0.06, ry: L.rot + r() * 6 });
  L.box(1.6, 0.42, 0.4, 0.4, 0, 1.45, '#5bc0eb');
  if (r() < 0.7) sitzFigur(ctx, L, 0.0, 1.45, PI);
}
const kikoInseln = [
  (L, r, d, ctx) => { I.staender(L, -0.6, -0.8, 1.6, PAL.kinder, r, d, 1.15); I.rundstaender(L, 0.9, -0.7, PAL.kinder, r, d, 0.42); niedrigTisch(L, 0, 0.75, 2.4, 0.8, PAL.kinder, r, d, '#ffffff', 0.6); },
  (L, r, d, ctx) => { L.zyl(1.45, 1.45, 0.02, 0, 0, 0, '#ffd166', 16); I.staender(L, 0, -0.75, 2.2, PAL.kinder, r, d, 1.15); puppe(L, -0.7, 0.55, r, 'kind', PAL.kinder); puppe(L, 0.1, 0.75, r, 'kind', PAL.kinder); niedrigTisch(L, 0.95, 0.55, 0.8, 0.7, PAL.kinder, r, d, '#ffffff', 0.55); },
];
const babyInseln = [
  (L, r, d, ctx) => { for (let k = 0; k < 3; k++) kinderwagen(L, -1.0 + k * 1.0, -0.6, r, -PI / 2); babybett(L, 0, 0.8, r); },
  (L, r, d, ctx) => { I.staender(L, 0, -0.8, 2.4, ['#f6dfe6', '#d8e8f0', '#e8f4ea', '#ffffff', '#f7e8b5'], r, d, 1.1); niedrigTisch(L, -0.5, 0.7, 1.6, 0.8, ['#f6dfe6', '#d8e8f0', '#ffffff', '#f7e8b5'], r, d, '#ffffff', 0.6); kinderwagen(L, 1.1, 0.7, r, 0.3); },
];
function kikoVorne(L, r, d, ctx) { L.box(2.4, 0.25, 0.9, 0, 0, 0, '#ffffff'); for (let i = 0; i < 3; i++) puppe(L.hoch(0.25), -0.8 + i * 0.8, 0, r, 'kind', PAL.kinder, zw(r, -0.4, 0.4)); }

// ================================================================ WÄSCHE
const ZART = ['#f4d4dc', '#e8b4c4', '#ffffff', '#2b2b2b', '#c9a3d4', '#f0e2d0', '#b0475f', '#8a2f45', '#d8c3e0'];
function buestenWand(L, w, r, d, ctx) {
  L.box(w, 2.8, 0.08, 0, 0, 0.04, '#f6e6ea');
  for (let j = 0; j < 4; j++) {
    const y = 0.45 + j * 0.58;
    L.box(w - 0.2, 0.05, 0.12, 0, y, 0.12, '#d8b9c2');
    const n = Math.floor((w - 0.4) / (d < 0.5 ? 0.6 : 0.34));
    for (let k = 0; k < n; k++) {
      const u = -w / 2 + 0.35 + k * ((w - 0.5) / n), f = bunt(r, ZART);
      L.box(0.2, 0.3, 0.12, u, y + 0.05, 0.16, '#f1eee8');
      L.box(0.22, 0.09, 0.14, u, y + 0.2, 0.16, f);
      if (d > 0.6) L.box(0.22, 0.07, 0.14, u, y + 0.05, 0.16, f);
    }
  }
  L.box(w - 0.3, 0.3, 0.45, 0, 0, 0.3, '#ffffff');
  kopfband(ctx, L, w, 'Dessous', '#b0475f', '#ffffff');
}
function bademantelWand(L, w, r, d, ctx) {
  L.box(w, 2.8, 0.08, 0, 0, 0.04, '#efe4ec');
  L.box(w - 0.1, 0.04, 0.04, 0, 1.85, 0.35, HOLZ.chrom);
  I.kleiderReihe(L, -w / 2 + 0.15, w / 2 - 0.15, 1.85, 0.35, ['#ffffff', '#f4d4dc', '#d8e8f0', '#c9a3d4', '#f0e2d0'], r, d, { hMin: 1.15, hMax: 1.35, breit: 0.5, abstand: 0.16 });
  L.box(w - 0.1, 0.04, 0.4, 0, 2.25, 0.25, '#ffffff');
  I.stapel(L, 0, 0.25, w - 0.4, 0.3, 2.29, ['#ffffff', '#f4d4dc', '#d8e8f0'], r, d);
  kopfband(ctx, L, w, 'Nachtwäsche', '#c97a96', '#ffffff');
}
function waescheUmkleiden(L, w, r, d, ctx) { I.umkleiden(L, w, Math.max(2, Math.round(w / 1.2)), r, '#b0475f'); }
const waescheInseln = [
  (L, r, d, ctx) => { niedrigTisch(L, -0.5, -0.55, 2.0, 1.0, ZART, r, d, '#f7eef0', 0.75); puppe(L, 1.1, -0.6, r, 'waesche', ZART); I.rundstaender(L, 0.6, 0.9, ZART, r, d, 0.45); puppe(L, -0.9, 0.9, r, 'waesche', ZART); },
  (L, r, d, ctx) => { I.staender(L, 0, -0.85, 2.6, ZART, r, d, 1.3); I.staender(L, 0, 0.3, 2.6, ZART, r, d, 1.3); L.zyl(0.35, 0.35, 0.42, 1.2, 0, 1.1, '#c9a3d4', 10); },
];
function waescheVorne(L, r, d, ctx) { L.box(2.4, 0.25, 0.9, 0, 0, 0, '#f6e6ea'); for (let i = 0; i < 3; i++) puppe(L.hoch(0.25), -0.8 + i * 0.8, 0, r, 'waesche', ZART, zw(r, -0.4, 0.4)); }

// ================================================================ SCHUHE, LEDERWAREN, SCHMUCK, STRUMPF
const SCHUH = ['#2b2b2b', '#8b5a3c', '#e8e4dc', '#c9483e', '#5a3b22', '#2f4a6e', '#d8b25a', '#f2c6d2', '#ffffff'];
function schuhWand(L, w, r, d, ctx) {
  L.box(w, 2.9, 0.1, 0, 0, 0.05, '#f4efe7');
  L.box(w - 0.3, 2.2, 0.03, 0, 0.45, 0.11, '#fffaf0');
  const reihen = d < 0.5 ? 4 : 6;
  for (let j = 0; j < reihen; j++) {
    const y = 0.45 + j * (2.1 / reihen);
    L.box(w - 0.3, 0.03, 0.3, 0, y, 0.25, '#ffffff');
    I.prodSchuhe(SCHUH)(L, 0, y + 0.03, 0.25, w - 0.5, r, d, 0.25);
  }
  kopfband(ctx, L, w, 'Schuhe', '#7a4b2a', '#ffffff', 3.0, 0.55);
}
function sitzbank(L, lx, lz, w, ry = 0, f = '#7d8f9c') { const P = L.sub(lx, lz, ry); P.box(w, 0.4, 0.5, 0, 0, 0, '#e8e2d8'); P.box(w, 0.1, 0.5, 0, 0.4, 0, f); }
const schuhInseln = [
  (L, r, d, ctx) => { I.schuhtisch(L, 0, -0.8, r, d, 2.6, '#f4efe7', SCHUH); sitzbank(L, -0.3, 0.55, 2.0); fussSpiegel(L, 1.2, 0.6, -0.4); if (r() < 0.6) sitzFigur(ctx, L, -0.6, 0.55, PI); },
  (L, r, d, ctx) => { I.schuhtisch(L, -0.6, -0.7, r, d, 1.6, '#e8dcc6', SCHUH); I.schuhtisch(L, 0.7, 0.6, r, d, 1.6, '#e8dcc6', SCHUH); I.pouf(L, 1.0, -0.8, '#c9a26b'); I.pouf(L, -1.0, 0.7, '#7d8f9c'); },
];
function kofferPodest(L, lx, lz, r, d, w = 2.6) {
  L.box(w, 0.18, 1.0, lx, 0, lz, '#2a2d31');
  const n = d < 0.5 ? 3 : 5;
  for (let i = 0; i < n; i++) {
    const u = lx - w / 2 + (i + 0.5) * (w / n), f = bunt(r, ['#c9483e', '#2f6f8f', '#e8e4dc', '#2b2b2b', '#d8b25a', '#9aa3aa', '#3f6b5a']), h = zw(r, 0.55, 0.78);
    L.box(0.42, h, 0.26, u, 0.18, lz, f);
    for (let k = 1; k < 4; k++) L.box(0.02, h - 0.06, 0.27, u - 0.21 + k * 0.105, 0.21, lz, dunkler(f, 0.06));
    L.box(0.04, 0.22, 0.04, u, 0.18 + h, lz, '#2a2d31');
  }
}
function kofferWand(L, w, r, d, ctx) {
  I.wandRegal(L, w, 2.6, 4, '#c79f74', I.prodTaschen, r, d, 0.45);
  kopfband(ctx, L, w, 'Lederwaren', '#5a3b22', '#f2e6d0');
}
const lederInseln = [
  (L, r, d, ctx) => { kofferPodest(L, 0, -0.6, r, d, 2.8); I.taschenWuerfel(L, 0, 0.9, r, d, 1.8); },
  (L, r, d, ctx) => { I.taschenWuerfel(L, -0.8, -0.6, r, d, 1.3); I.taschenWuerfel(L, 0.8, 0.7, r, d, 1.3); kofferPodest(L, 0.6, -0.8, r, d, 1.2); },
];
function schmuckTheke(L, r, d, ctx) {
  const inhalt = (L2, x, y, z, w, t, r2) => {
    L2.box(w, 0.03, t, x, y, z, '#f6f0e2');
    const n = d < 0.5 ? 4 : 8;
    for (let i = 0; i < n; i++) { const u = x - w / 2 + (i + 0.5) * (w / n); L2.box(0.07, 0.05, 0.07, u, y + 0.03, z, '#1f2a3a'); L2.box(0.04, 0.04, 0.04, u, y + 0.08, z, bunt(r2, ['#d8b25a', '#e6e6e6', '#b5162b', '#9bc6d8'])); }
  };
  for (const [dx, dz, ww, dd] of [[0, -1.0, 2.8, 0.7], [-1.1, 0.25, 0.7, 1.6], [1.1, 0.25, 0.7, 1.6]]) {
    L.box(ww, 0.92, dd, dx, 0, dz, '#1f2a3a');
    L.box(ww + 0.04, 0.04, dd + 0.04, dx, 0.92, dz, '#d8b25a');
    inhalt(L, dx, 0.96, dz, ww - 0.2, dd - 0.2, r);
    L.box(ww, 0.3, dd, dx, 0.96, dz, GLAS);
  }
  stehFigur(ctx, L, 0, -0.35, 0, 'beauty');
}
function sonnenbrillenTurm(L, lx, lz, r, d) {
  L.box(0.55, 1.75, 0.55, lx, 0, lz, '#f4f0ea');
  L.box(0.6, 0.06, 0.6, lx, 1.75, lz, '#1f1f1f');
  L.box(0.45, 0.3, 0.02, lx, 1.4, lz + 0.285, '#e3edf1');
  for (let j = 0; j < (d < 0.5 ? 3 : 5); j++) for (const s of [-0.12, 0.12]) {
    L.box(0.2, 0.06, 0.03, lx + s, 0.35 + j * 0.2, lz + 0.29, bunt(r, ['#1f1f1f', '#6b4a32', '#c9483e', '#2f6f8f', '#d8b25a']));
    L.box(0.03, 0.06, 0.2, lx + 0.29, 0.35 + j * 0.2, lz + s, bunt(r, ['#1f1f1f', '#6b4a32', '#c9483e', '#2f6f8f']));
  }
}
function uhrenWand(L, w, r, d, ctx) {
  L.box(w, 2.9, 0.12, 0, 0, 0.06, '#1f2a3a');
  const n = Math.max(1, Math.floor(w / 1.1));
  for (let i = 0; i < n; i++) {
    const u = -w / 2 + (i + 0.5) * (w / n);
    for (const y of [1.0, 1.7]) {
      L.box(0.8, 0.5, 0.25, u, y, 0.2, '#fdf6e6');
      for (let k = 0; k < 3; k++) L.zyl(0.06, 0.06, 0.03, u - 0.22 + k * 0.22, y + 0.2, 0.25, bunt(r, ['#d8b25a', '#c9d2d8', '#2b2b2b']), 8);
      L.box(0.8, 0.5, 0.02, u, y, 0.33, GLAS);
    }
  }
  L.box(w - 0.2, 0.85, 0.5, 0, 0, 0.35, '#141c28');
  kopfband(ctx, L, w, 'Uhren & Schmuck', '#d8b25a', '#1f2a3a', 3.05, 0.55);
}
const schmuckInseln = [
  (L, r, d, ctx) => schmuckTheke(L, r, d, ctx),
  (L, r, d, ctx) => { I.uhrenvitrine(L, 0, -0.7, r, d); sonnenbrillenTurm(L, -1.0, 0.8, r, d); sonnenbrillenTurm(L, 0.2, 0.9, r, d); I.spiegelSaeule(L, 1.2, 0.8); },
];
function strumpfWand(L, w, r, d, ctx) {
  L.box(w, 2.8, 0.08, 0, 0, 0.04, '#efe7f2');
  const reihen = d < 0.5 ? 4 : 7;
  for (let j = 0; j < reihen; j++) {
    const y = 0.35 + j * (2.3 / reihen);
    L.box(w - 0.2, 0.03, 0.06, 0, y + 0.3, 0.1, '#9aa3aa');
    const n = Math.floor((w - 0.3) / 0.22);
    for (let k = 0; k < n; k++) {
      const u = -w / 2 + 0.25 + k * ((w - 0.4) / n), f = bunt(r, ['#e6c9a8', '#2b2b2b', '#1f2a3a', '#d9b48f', '#7a4a6b', '#ffffff', '#c9483e']);
      L.box(0.16, 0.26, 0.04, u, y, 0.14, '#f4f2ee');
      L.box(0.05, 0.22, 0.02, u, y + 0.02, 0.165, f);
    }
  }
  kopfband(ctx, L, w, 'Strumpfwaren', '#8a6aa8', '#ffffff');
}
function strumpfInsel(L, r, d, ctx) {
  for (const x of [-0.9, 0.9]) {
    L.box(0.6, 1.6, 0.6, x, 0, -0.4, '#efe7f2');
    for (let j = 0; j < 4; j++) for (const s of [-0.15, 0.15]) L.box(0.12, 0.26, 0.03, x + s, 0.25 + j * 0.34, -0.08, bunt(r, ['#e6c9a8', '#2b2b2b', '#1f2a3a', '#7a4a6b']));
  }
  niedrigTisch(L, 0, 0.8, 2.2, 0.8, ['#e6c9a8', '#2b2b2b', '#efe7f2', '#7a4a6b'], r, d, '#ffffff', 0.8);
}

// ================================================================ LIVING, HAUSHALT, ELEKTRO
function leuchtenWand(L, w, r, d, ctx) {
  L.box(w, 3.0, 0.08, 0, 0, 0.04, '#e2d6c4');
  const n = Math.max(2, Math.floor(w / 0.75));
  for (let j = 0; j < (d < 0.5 ? 2 : 3); j++) for (let i = 0; i < n; i++) {
    const u = -w / 2 + (i + 0.5) * (w / n), y = 0.6 + j * 0.8;
    L.box(0.6, 0.03, 0.4, u, y, 0.25, '#b98d61');
    L.zyl(0.03, 0.03, 0.25, u, y + 0.03, 0.25, '#7b5a40', 4);
    L.zyl(0.14, 0.26, 0.24, u, y + 0.28, 0.25, bunt(r, ['#e9b44c', '#5f7f5a', '#b5745a', '#3f6b8a', '#f2e6d0']), 8);
  }
  kopfband(ctx, L, w, 'Leuchten', '#5f7f5a', '#ffffff');
}
function heimtexWand(L, w, r, d, ctx) {
  I.wandRegal(L, w, 2.6, 5, '#ece6dc', (L2, lx, y, lz, ww, r2, d2, hMax) => {
    const n = anz(Math.floor(ww / 0.42), d2, 0.5);
    for (let i = 0; i < n; i++) L2.box(0.38, Math.min(hMax, 0.36), 0.14, lx - ww / 2 + (i + 0.5) * (ww / n), y, lz, bunt(r2, ['#b5745a', '#5f7f8c', '#e9b44c', '#7a8a5c', '#d65a6f', '#f2e6d0', '#9a8fbf', '#ffffff']));
  }, r, d, 0.45);
  kopfband(ctx, L, w, 'Heimtextilien', '#5f7f5a', '#ffffff');
}
function moebelWand(L, w, r, d, ctx) {
  L.box(w, 2.8, 0.08, 0, 0, 0.04, '#e2d6c4');
  I.bildtafel(L, 0, 1.4, 0.09, Math.min(2.4, w * 0.6), 1.0, r, ['#5f7f8c', '#b5745a']);
  L.box(Math.min(2.6, w - 0.4), 0.8, 0.45, 0, 0, 0.3, HOLZ.mittel);
  for (let k = 0; k < 3; k++) L.box(0.2, zw(r, 0.2, 0.4), 0.2, -0.6 + k * 0.6, 0.8, 0.3, bunt(r, PAL.geschirr));
  kopfband(ctx, L, w, 'Living', '#5f7f5a', '#ffffff');
}
function lampenTisch(L, r, d, ctx) {
  L.box(2.6, 0.75, 1.2, 0, 0, -0.5, '#ece6dc'); L.box(2.68, 0.05, 1.28, 0, 0.75, -0.5, '#d9d1c4');
  for (let i = 0; i < (d < 0.5 ? 3 : 6); i++) { const x = -1.0 + (i % 3) * 1.0, z = -0.8 + Math.floor(i / 3) * 0.6; L.zyl(0.1, 0.12, 0.05, x, 0.8, z, '#2a2d31', 6); L.zyl(0.02, 0.02, 0.35, x, 0.85, z, '#2a2d31', 4); L.zyl(0.12, 0.22, 0.22, x, 1.2, z, bunt(r, ['#fff3c4', '#ffffff', '#e9b44c', '#d8c6a8']), 8); }
  L.box(1.2, 0.45, 0.6, -0.6, 0, 0.95, '#b98d61'); L.zyl(0.12, 0.16, 0.3, -0.6, 0.45, 0.95, '#fff3c4', 8);
  I.stehlampe(L, 0.6, 0.9, r); I.stehlampe(L, 1.2, 1.1, r);
}
function bettwaescheTisch(L, r, d, ctx) {
  niedrigTisch(L, 0, -0.6, 2.6, 1.1, ['#f4f0e6', '#d8e3ea', '#e9d6cf', '#ffffff', '#b5745a', '#5f7f8c'], r, d, HOLZ.hell, 0.75);
  L.box(1.2, 0.5, 0.8, -0.7, 0, 0.85, '#ffffff'); I.stapel(L, -0.7, 0.85, 1.0, 0.6, 0.5, ['#ffffff', '#f2e6d0', '#d8e3ea'], r, d);
  I.pouf(L, 0.9, 0.9, '#b5745a');
}
/** Pendelleuchten von der Decke (Leuchtenhimmel) über einer Fläche w × t. */
function leuchtenhimmel(L, w, t, r, d, y0 = 2.5) {
  const nx = d < 0.5 ? 2 : 3, nz = 2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x = -w / 2 + (i + 0.5) * (w / nx), z = -t / 2 + (j + 0.5) * (t / nz), y = y0 + ((i + j) % 2) * 0.35;
    L.box(0.02, WANDHOEHE - y - 0.1, 0.02, x, y + 0.25, z, '#2a2d31');
    if ((i + j) % 3 === 0) L.geo(new THREE.SphereGeometry(0.24, 8, 4, 0, PI * 2, 0, PI / 2), x, y, z, bunt(r, ['#e9b44c', '#2a2d31', '#ffffff', '#3f6b5a']));
    else L.zyl(0.1, 0.26, 0.25, x, y, z, bunt(r, ['#fff3c4', '#e9b44c', '#ffffff', '#2a2d31', '#b5745a']), 8);
  }
}
function esstischLiving(L, r, d, ctx) { tischInszenierung(L, r, d, ctx); leuchtenhimmel(L, 2.0, 1.0, r, d, 2.3); }
function teppichstapel(L, lx, lz, r, w = 2.4, t = 1.6) {
  L.box(w, 0.12, t, lx, 0, lz, '#7b5a40');
  for (let k = 0; k < 6; k++) L.box(w - 0.1 - (k % 2) * 0.08, 0.07, t - 0.1 - (k % 3) * 0.06, lx, 0.12 + k * 0.07, lz, bunt(r, ['#b5745a', '#5f7f8c', '#e6d9c3', '#7a8a5c', '#9a3b3b', '#d3b48a', '#3f4a6b']), zw(r, -0.06, 0.06));
}
function kissenInsel(L, r, d, ctx) {
  teppichstapel(L, -0.4, -0.55, r, 2.2, 1.4);
  L.box(1.2, 0.9, 0.6, 0.9, 0, 0.8, '#ece6dc');
  for (let j = 0; j < 2; j++) for (let k = 0; k < 3; k++) L.box(0.36, 0.34, 0.14, 0.55 + k * 0.36, 0.9 + j * 0.32, 0.8, bunt(r, ['#b5745a', '#5f7f8c', '#e9b44c', '#7a8a5c', '#d65a6f', '#f2e6d0', '#9a8fbf']), zw(r, -0.1, 0.1));
  I.pouf(L, -0.9, 0.9, '#7a8a5c');
}
const livingInseln = [
  (L, r, d, ctx) => { I.sofaInsel(L, r, d); leuchtenhimmel(L, 2.4, 1.4, r, d, 2.6); },
  (L, r, d, ctx) => I.bettInsel(L, r, d),
  (L, r, d, ctx) => esstischLiving(L, r, d, ctx),
  (L, r, d, ctx) => kissenInsel(L, r, d, ctx),
  (L, r, d, ctx) => { lampenTisch(L, r, d, ctx); leuchtenhimmel(L, 2.6, 1.2, r, d, 2.7); },
];
function geschirrWand(L, w, r, d, ctx) {
  I.wandRegal(L, w, 2.6, 5, '#f4f2ee', I.prodGeschirr, r, d, 0.45);
  kopfband(ctx, L, w, 'Tisch & Küche', '#3f6b8a', '#ffffff');
}
function kochWand(L, w, r, d, ctx) {
  L.box(w, 2.8, 0.08, 0, 0, 0.04, '#d9dee2');
  for (const y of [1.6, 2.3]) {
    L.box(w - 0.2, 0.04, 0.04, 0, y, 0.12, '#5a636b');
    const n = Math.floor((w - 0.4) / (d < 0.5 ? 0.8 : 0.45));
    for (let k = 0; k < n; k++) { const u = -w / 2 + 0.4 + k * ((w - 0.6) / n); L.geo(new THREE.CylinderGeometry(0.17, 0.15, 0.04, 10).rotateX(PI / 2), u, y - 0.25, 0.14, bunt(r, ['#2a2d31', '#c9d2d8', '#c9483e', '#3f6b8a'])); L.box(0.03, 0.2, 0.03, u, y - 0.1, 0.13, '#2a2d31'); }
  }
  L.box(w - 0.2, 0.9, 0.5, 0, 0, 0.3, '#9aa3aa');
  for (let k = 0; k < Math.floor(w / 0.55); k++) L.zyl(0.18, 0.17, 0.22, -w / 2 + 0.45 + k * 0.55, 0.9, 0.3, bunt(r, ['#c9d2d8', '#2a2d31', '#c9483e', '#e9b44c']), 10);
  kopfband(ctx, L, w, 'Kochen', '#3f6b8a', '#ffffff');
}
function tischInszenierung(L, r, d, ctx) {
  teppich(L, 3.2, 2.6, 0, 0, '#e2d6c4');
  L.box(2.0, 0.72, 1.0, 0, 0, 0, HOLZ.mittel); L.box(2.08, 0.05, 1.08, 0, 0.72, 0, dunkler(HOLZ.mittel, 0.05));
  for (const x of [-0.6, 0, 0.6]) for (const s of [-1, 1]) {
    I.stuhl(L, x, s * 0.75, s > 0 ? PI : 0, '#3a4a5a');
    L.zyl(0.13, 0.13, 0.02, x, 0.77, s * 0.3, '#ffffff', 10);
    L.zyl(0.03, 0.03, 0.14, x + 0.15, 0.77, s * 0.32, GLAS, 6);
  }
  L.zyl(0.05, 0.05, 0.25, 0, 0.77, 0, '#f6e8b0', 6);
}
function topfTurm(L, lx, lz, r, d) {
  L.zyl(0.5, 0.55, 0.35, lx, 0, lz, '#ece6dc', 10);
  for (let j = 0; j < 3; j++) L.zyl(0.32 - j * 0.07, 0.3 - j * 0.07, 0.24, lx, 0.35 + j * 0.24, lz, bunt(r, ['#c9483e', '#2a2d31', '#c9d2d8', '#3f6b8a', '#e9b44c']), 10);
}
const haushaltInseln = [
  (L, r, d, ctx) => tischInszenierung(L, r, d, ctx),
  (L, r, d, ctx) => { I.gondel(L, 0, -0.5, 2.8, 1.4, '#f4f2ee', I.prodGeschirr, r, d); topfTurm(L, -0.9, 1.0, r, d); topfTurm(L, 0.9, 1.0, r, d); },
  (L, r, d, ctx) => { L.box(2.6, 0.78, 1.1, 0, 0, -0.4, '#ece6dc'); L.box(2.68, 0.05, 1.18, 0, 0.78, -0.4, '#c9d2d8'); I.geschirrAufTisch(L, 0, -0.4, 2.4, 0.9, 0.83, r, d); topfTurm(L, 0, 1.0, r, d); },
];
const BILDSCHIRM = ['#6fc3ff', '#8be08f', '#ffb36b', '#c79bff', '#67e3f0', '#ff8a7a', '#ffe17a'];
function tvWand(L, w, r, d, ctx) {
  L.box(w, 3.0, 0.1, 0, 0, 0.05, '#2a2d31');
  const n = Math.max(1, Math.floor(w / 1.45));
  for (let j = 0; j < 2; j++) for (let i = 0; i < n; i++) {
    const u = -w / 2 + (i + 0.5) * (w / n), y = 0.9 + j * 0.95, f = bunt(r, BILDSCHIRM);
    L.box(1.25, 0.74, 0.06, u, y, 0.13, '#111417');
    L.box(1.15, 0.64, 0.02, u, y + 0.05, 0.17, f);
    if (d > 0.5) { L.box(0.5, 0.3, 0.01, u - 0.2, y + 0.12, 0.185, '#ffffff'); L.box(0.4, 0.18, 0.01, u + 0.28, y + 0.36, 0.185, heller(f, 0.12)); }
  }
  L.box(w - 0.2, 0.7, 0.5, 0, 0, 0.35, '#1f1f1f');
  kopfband(ctx, L, w, 'Multimedia', '#20b5c9', '#111417');
}
function kopfhoererWand(L, w, r, d, ctx) {
  L.box(w, 2.8, 0.08, 0, 0, 0.04, '#e9eef2');
  for (let j = 0; j < 4; j++) for (let k = 0; k < Math.floor((w - 0.3) / 0.4); k++) {
    const u = -w / 2 + 0.35 + k * 0.4, y = 0.6 + j * 0.5;
    L.box(0.03, 0.03, 0.2, u, y + 0.3, 0.1, '#9aa3aa');
    L.geo(new THREE.TorusGeometry(0.11, 0.035, 4, 8, PI), u, y + 0.12, 0.2, bunt(r, ['#1f1f1f', '#ffffff', '#e8403a', '#3c8dd9', '#d8b25a']));
  }
  kopfband(ctx, L, w, 'Elektro', '#20b5c9', '#111417');
}
function laptopTisch(L, r, d, ctx) {
  L.box(2.8, 0.85, 1.1, 0, 0, -0.4, '#ffffff'); L.box(2.86, 0.04, 1.16, 0, 0.85, -0.4, '#c9d2d8');
  for (let i = 0; i < (d < 0.5 ? 3 : 5); i++) {
    const x = -1.1 + i * 0.55;
    L.box(0.36, 0.02, 0.26, x, 0.89, -0.3, '#9aa3aa');
    L.geo(new THREE.BoxGeometry(0.36, 0.24, 0.015).rotateX(-0.2).translate(0, 0.12, 0), x, 0.9, -0.45, '#2a2d31');
    L.geo(new THREE.BoxGeometry(0.32, 0.2, 0.01).rotateX(-0.2).translate(0, 0.12, 0.012), x, 0.9, -0.45, bunt(r, BILDSCHIRM));
  }
  I.gondel(L, 0, 1.0, 2.6, 1.3, '#2a2d31', I.prodPackungen(['#ffffff', '#1f1f1f', '#c9d2d8', '#3c8dd9', '#e8403a']), r, d);
}
function kaffeeGondel(L, r, d, ctx) {
  for (const z of [-0.7, 0.7]) {
    L.box(2.8, 0.9, 0.7, 0, 0, z, '#2a2d31'); L.box(2.84, 0.04, 0.74, 0, 0.9, z, '#c9d2d8');
    for (let i = 0; i < 4; i++) { const x = -1.0 + i * 0.66; L.box(0.32, 0.42, 0.4, x, 0.94, z, bunt(r, ['#c9d2d8', '#1f1f1f', '#e8e4dc', '#c9483e'])); L.box(0.18, 0.1, 0.02, x, 1.18, z + 0.21, '#20b5c9'); }
  }
}
function konsolenInsel(L, r, d, ctx) {
  L.box(2.8, 0.7, 0.9, 0, 0, -0.7, '#1f1f1f'); L.box(2.84, 0.04, 0.94, 0, 0.7, -0.7, '#20b5c9');
  for (const x of [-0.75, 0.75]) {
    L.box(1.2, 0.72, 0.06, x, 0.95, -1.05, '#111417'); L.box(1.1, 0.62, 0.02, x, 1.0, -1.01, bunt(r, BILDSCHIRM)); L.box(0.4, 0.25, 0.02, x - 0.2, 1.15, -0.995, '#ffffff');
    L.box(0.35, 0.08, 0.25, x, 0.74, -0.7, '#ffffff'); L.box(0.16, 0.04, 0.1, x - 0.2, 0.74, -0.45, '#2a2d31');
  }
  for (const x of [-0.75, 0.75]) { I.pouf(L, x, 0.5, '#20b5c9'); if (r() < 0.8) figur(ctx.S, ...L.P(x, 0.5), (r() * 1e9) | 0, 'kind', { y: L.oy + 0.2, ry: L.rot + PI, pose: 'sitzen' }); }
  I.gondel(L, 0, 1.3, 2.4, 0.9, '#2a2d31', I.prodPackungen(['#1f1f1f', '#ffffff', '#3c8dd9', '#e8403a', '#5bb36a']), r, d);
}
const elektroInseln = [
  (L, r, d, ctx) => laptopTisch(L, r, d, ctx),
  (L, r, d, ctx) => konsolenInsel(L, r, d, ctx),
  (L, r, d, ctx) => kaffeeGondel(L, r, d, ctx),
];

// ================================================================ SPIELWAREN
const BAUSTEIN = ['#e8403a', '#f2c14e', '#3c8dd9', '#5bb36a', '#ffffff', '#ff8c42'];
function bausteinWelt(L, r, d, ctx) {
  L.box(1.8, 0.6, 1.0, -0.5, 0, 0.3, '#ffffff'); L.box(1.9, 0.05, 1.1, -0.5, 0.6, 0.3, '#f2c14e');
  L.box(1.6, 0.02, 0.8, -0.5, 0.65, 0.3, '#5bb36a');
  for (let i = 0; i < (d < 0.5 ? 6 : 12); i++) L.box(zw(r, 0.12, 0.3), 0.1, zw(r, 0.12, 0.2), zw(r, -1.2, 0.2), 0.67 + (i > 8 ? 0.1 : 0), zw(r, 0.0, 0.6), bunt(r, BAUSTEIN));
  // Großfigur aus Steinen
  for (const [x, z] of [[-1.0, 1.15], [0.1, 1.2]]) figur(ctx.S, ...L.P(x, z), (r() * 1e9) | 0, 'kind', { y: L.oy, ry: L.rot + PI });
}
function spieleWand(L, w, r, d, ctx) {
  I.wandRegal(L, w, 2.4, 5, '#ffffff', (L2, lx, y, lz, ww, r2, d2, hMax) => {
    const n = anz(Math.floor(ww / 0.45), d2, 0.5);
    for (let i = 0; i < n; i++) { const h = Math.min(hMax, zw(r2, 0.08, 0.3)); L2.box(0.4, h, 0.32, lx - ww / 2 + (i + 0.5) * (ww / n), y, lz, bunt(r2, PAL.kinder)); }
  }, r, d, 0.45);
  kopfband(ctx, L, w, 'Spiele & Puzzle', '#e8403a', '#ffffff');
}
function plueschWand(L, w, r, d, ctx) {
  I.wandRegal(L, w, 2.4, 4, '#5bc0eb', I.prodPackungen(PAL.kinder), r, d, 0.45);
  for (let i = 0; i < Math.floor(w / 1.0); i++) I.teddy(L, -w / 2 + 0.6 + i * 1.0, 2.42, 0.25, r, 0.9);
  kopfband(ctx, L, w, 'Spielwaren', '#e8403a', '#ffffff');
}
function modellbahn(L, r, d, ctx) {
  L.box(3.0, 0.8, 2.0, 0, 0, -0.2, '#5a4232');
  L.box(3.0, 0.08, 2.0, 0, 0.8, -0.2, '#8fbf6a');
  L.geo(new THREE.TorusGeometry(0.75, 0.05, 3, 20).rotateX(PI / 2).scale(1.6, 1, 1), 0, 0.9, -0.2, '#4b4b4b');
  for (let k = 0; k < 4; k++) { const a = k * 0.35; L.box(0.28, 0.14, 0.12, Math.cos(a) * 1.2, 0.92, -0.2 + Math.sin(a) * 0.75, k ? '#2f6f8f' : '#c9483e', -a); }
  for (const [x, z] of [[-0.3, -0.5], [0.3, -0.4], [0, 0.0]]) { L.box(0.26, 0.2, 0.22, x, 0.88, z, '#efe4c9'); L.geo(new THREE.ConeGeometry(0.2, 0.14, 4).rotateY(PI / 4), x, 1.15, z, '#b4583f'); }
  for (let k = 0; k < 5; k++) L.geo(new THREE.ConeGeometry(0.1, 0.3, 6), zw(r, -1.3, 1.3), 1.03, zw(r, -1.0, 0.6) * (k % 2 ? 1 : -0.2) - 0.2, '#3f7d46');
  for (const x of [-0.8, 0.4]) figur(ctx.S, ...L.P(x, 1.05), (r() * 1e9) | 0, x < 0 ? 'kind' : 'kunde', { y: L.oy, ry: L.rot + PI, pose: 'schauen' });
}
function pluschTurm(L, lx, lz, r, d) {
  L.zyl(1.0, 1.1, 0.45, lx, 0, lz, '#ffd166', 12); L.zyl(0.7, 0.75, 0.45, lx, 0.45, lz, '#ef5b5b', 12); L.zyl(0.4, 0.45, 0.45, lx, 0.9, lz, '#5bc0eb', 10);
  const n = d < 0.5 ? 6 : 12;
  for (let i = 0; i < n; i++) { const st = i < 6 ? 0 : i < 10 ? 1 : 2, rr = [0.8, 0.55, 0.25][st], a = (i / (st === 0 ? 6 : 4)) * PI * 2 + st; I.teddy(L, lx + Math.cos(a) * rr, 0.45 + st * 0.45, lz + Math.sin(a) * rr, r, zw(r, 0.8, 1.15)); }
  I.teddy(L, lx, 1.35, lz, r, 1.7);
}
function bausteinBurg(L, lx, lz, r) {
  L.box(1.6, 0.3, 1.2, lx, 0, lz, '#ffffff');
  for (const [x, z] of [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]]) for (let k = 0; k < 6; k++) L.box(0.36, 0.22, 0.36, lx + x, 0.3 + k * 0.22, lz + z, BAUSTEIN[(k + (x > 0 ? 1 : 0)) % 4]);
  for (let k = 0; k < 3; k++) { L.box(0.9, 0.22, 0.2, lx, 0.3 + k * 0.22, lz - 0.4, '#e8403a'); L.box(0.9, 0.22, 0.2, lx, 0.3 + k * 0.22, lz + 0.4, '#f2c14e'); }
  for (const x of [-0.6, 0.6]) for (const z of [-0.4, 0.4]) L.geo(new THREE.ConeGeometry(0.28, 0.4, 4).rotateY(PI / 4), lx + x, 1.82, lz + z, '#3c8dd9');
}
function kinderfahrzeug(L, lx, lz, r, ry = 0) {
  const P = L.sub(lx, lz, ry), f = bunt(r, ['#e8403a', '#3c8dd9', '#f2c14e', '#5bb36a', '#f78fb3']);
  P.box(0.7, 0.22, 0.32, 0, 0.12, 0, f); P.box(0.26, 0.2, 0.3, -0.1, 0.34, 0, dunkler(f, 0.05)); P.box(0.04, 0.3, 0.04, 0.28, 0.34, 0, '#2a2d31'); P.box(0.04, 0.04, 0.3, 0.3, 0.64, 0, '#2a2d31');
  for (const x of [-0.25, 0.25]) for (const z of [-0.17, 0.17]) P.geo(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8).rotateX(PI / 2), x, 0.1, z, '#1f1f1f');
}
const spielInseln = [
  (L, r, d, ctx) => { I.gondel(L, 0, -0.5, 2.8, 1.5, '#ffffff', I.prodPackungen(PAL.kinder), r, d); kinderfahrzeug(L, -0.9, 1.0, r, 0.3); kinderfahrzeug(L, 0.1, 1.05, r, -0.2); kinderfahrzeug(L, 1.0, 0.95, r, 0.4); },
  (L, r, d, ctx) => { bausteinWelt(L, r, d, ctx); bausteinBurg(L, 1.0, -0.6, r); },
  (L, r, d, ctx) => pluschTurm(L, 0, 0, r, d),
  (L, r, d, ctx) => modellbahn(L, r, d, ctx),
  (L, r, d, ctx) => I.spieltisch(L, r, d),
];

// ================================================================ FEINKOST
const FRISCH = {
  'Käse': { ware: ['#f2d16b', '#e9b44c', '#f4e1c0', '#fff3c4', '#d9a441'], farbe: '#f2c14e' },
  'Wurst & Fleisch': { ware: ['#b5162b', '#d97a5a', '#f2c6d2', '#a8452f', '#e8a090'], farbe: '#b5162b' },
  'Fisch': { ware: ['#9aa3aa', '#c9d2d8', '#e88a6a', '#f4f4f2', '#6f8696'], farbe: '#2f6f8f', eis: true },
  'Konditorei': { ware: ['#f2c6d2', '#5a3b22', '#ffffff', '#e8403a', '#f2c14e', '#9b5fc0'], farbe: '#c97a96', torte: true },
  'Feinkost': { ware: ['#9bc53d', '#e9b44c', '#d97a5a', '#f4e1c0', '#6d1f2a'], farbe: '#2f5d3a' },
};
function frischeTheke(L, w, r, d, ctx, typ) {
  const T = FRISCH[typ] ?? FRISCH.Feinkost;
  ctx.zaehler.thekeTyp = typ;
  // Rückwand mit Kühlregal, Personal, Theke vorne (Front +z)
  L.box(w, 2.6, 0.5, 0, 0, 0.25, '#e9e4dc');
  for (let j = 0; j < 3; j++) { L.box(w - 0.2, 0.03, 0.3, 0, 0.9 + j * 0.5, 0.55, '#ffffff'); for (let k = 0; k < (d < 0.5 ? 4 : Math.floor(w / 0.32)); k++) L.box(0.22, 0.22, 0.2, -w / 2 + 0.3 + k * ((w - 0.5) / Math.floor(w / 0.32)), 0.93 + j * 0.5, 0.55, bunt(r, T.ware)); }
  if (typ === 'Wurst & Fleisch') for (let k = 0; k < Math.floor(w / 0.5); k++) L.box(0.14, 0.4, 0.14, -w / 2 + 0.3 + k * 0.5, 2.2, 0.62, '#a8452f');
  L.box(w, 0.92, 0.95, 0, 0, 1.75, '#ffffff');
  L.box(w, 0.1, 0.06, 0, 0.25, 2.24, T.farbe);
  L.box(w, 0.04, 1.0, 0, 0.92, 1.75, '#c9d2d8');
  L.box(w - 0.1, T.eis ? 0.08 : 0.03, 0.6, 0, 0.96, 1.7, T.eis ? '#ffffff' : '#f2efe8');
  const n = d < 0.5 ? 5 : Math.floor(w / 0.38);
  if (T.eis) L.box(w - 0.2, 0.08, 0.5, 0, 0.99, 1.7, '#e9f3f7');
  for (let i = 0; i < n; i++) {
    const u = -w / 2 + 0.25 + (i + 0.5) * ((w - 0.5) / n), f = bunt(r, T.ware);
    if (T.torte) { L.zyl(0.14, 0.14, 0.12, u, 0.99, 1.65, f, 10); L.zyl(0.1, 0.1, 0.03, u, 1.11, 1.65, '#ffffff', 8); }
    else if (typ === 'Käse') L.zyl(0.15, 0.15, 0.1, u, 0.99, 1.68, f, 10);
    else if (T.eis) { L.geo(new THREE.BoxGeometry(0.3, 0.06, 0.1).rotateY(0.4), u, 1.05, 1.6, f); L.geo(new THREE.BoxGeometry(0.3, 0.06, 0.1).rotateY(-0.3), u, 1.05, 1.8, bunt(r, T.ware)); }
    else L.box((w - 0.6) / n - 0.06, zw(r, 0.05, 0.12), 0.4, u, 0.99, 1.68, f);
  }
  const g = new THREE.BoxGeometry(w, 0.5, 0.04); g.rotateX(-0.45);
  L.geo(g, 0, 1.2, 2.08, GLAS);
  L.box(w, 0.04, 0.5, 0, 1.42, 1.6, '#c9d2d8');
  for (let k = 0; k < Math.max(1, Math.round(w / 2.4)); k++) stehFigur(ctx, L, -w / 2 + (k + 0.5) * (w / Math.max(1, Math.round(w / 2.4))), 0.85, 0, 'theke');
  // Eis- und Glasaufsatz deutlicher: helle Vitrinenkante und Preisschildchen
  L.box(w, 0.06, 0.08, 0, 1.44, 2.1, '#e8edf0');
  if (d > 0.5) for (let i = 0; i < Math.floor(w / 0.6); i++) L.box(0.12, 0.08, 0.02, -w / 2 + 0.35 + i * 0.6, 1.0, 2.23, '#ffffff');
  kopfband(ctx, L, w, typ, T.farbe, '#ffffff', 2.85, 0.6);
}
function kuehlregal(L, w, r, d, ctx) {
  L.box(w, 2.3, 0.75, 0, 0, 0.38, '#f4f4f2');
  const n = Math.max(1, Math.floor(w / 0.8));
  for (let i = 0; i < n; i++) {
    const u = -w / 2 + (i + 0.5) * (w / n);
    for (let j = 0; j < 4; j++) for (let k = 0; k < (d < 0.5 ? 2 : 3); k++) L.box(0.18, 0.28, 0.06, u - 0.22 + k * 0.22, 0.25 + j * 0.48, 0.74, bunt(r, ['#ffffff', '#3c8dd9', '#f2c14e', '#e8403a', '#9bc53d', '#f4e1c0']));
    L.box(0.74, 2.0, 0.03, u, 0.15, 0.78, GLAS);
    L.box(0.03, 2.0, 0.05, u + 0.38, 0.15, 0.78, '#9aa3aa');
  }
  L.box(w, 0.3, 0.8, 0, 2.3, 0.4, '#2f5d3a');
  if (ctx.scene) I.schrift(L, 'Molkerei & Kühlung', 0, 2.45, 0.81, 0.2, '#ffffff');
}
function weinWand(L, w, r, d, ctx) { I.weinregal(L, w, r, d); kopfband(ctx, L, w, 'Weine & Spirituosen', '#6d1f2a', '#f6e8b0', 2.85, 0.55); }
function obstGemuese(L, r, d, ctx) {
  if (ctx.scene) { L.box(0.04, 1.4, 0.04, 1.35, 0.55, 0, '#9aa3aa'); L.box(1.1, 0.4, 0.05, 1.35, 1.95, 0, '#3fae4a'); I.schrift(L, 'Obst & Gemüse', 1.35, 2.15, 0.03, 0.22, '#ffffff'); }
  const ware = ['#e8403a', '#ffcf3a', '#8fd14f', '#ff8c2a', '#8a2f6a', '#3fae4a', '#ffe9a8', '#d6283a', '#f7a531'];
  for (const z of [-0.65, 0.65]) {
    L.box(2.8, 0.55, 1.0, 0, 0, z, '#8a6a48');
    for (let i = 0; i < 5; i++) for (const s of [-0.24, 0.24]) {
      const g = new THREE.BoxGeometry(0.5, 0.18, 0.42); g.rotateX(z < 0 ? 0.3 : -0.3);
      const u = -1.1 + i * 0.55, hy = 0.6 + (s * (z < 0 ? -1 : 1) > 0 ? 0 : 0.14);
      L.geo(g, u, hy, z + s, '#c9a26b');
      const f = bunt(r, ware); L.box(0.44, 0.08, 0.36, u, hy + 0.08, z + s, f); if (d > 0.6) for (let q = 0; q < 3; q++) L.kugel(0.07, u - 0.13 + q * 0.13, hy + 0.17, z + s + zw(r, -0.08, 0.08), heller(f, 0.04));
    }
  }
}
function probierbar(L, r, d, ctx) {
  L.box(2.8, 1.05, 0.65, 0, 0, -0.7, '#5a3b2a'); L.box(2.9, 0.06, 0.75, 0, 1.05, -0.7, '#2a1f1a');
  for (let i = 0; i < 5; i++) L.box(0.1, 0.32, 0.1, -1.1 + i * 0.5, 1.11, -0.85, bunt(r, ['#4a1a22', '#6d1f2a', '#2f4a22', '#d8b25a']));
  stehFigur(ctx, L, 0, -1.3, 0, 'theke');
  for (let k = 0; k < 4; k++) {
    const x = -1.05 + k * 0.7;
    L.zyl(0.18, 0.18, 0.05, x, 0.75, -0.1, '#2a1f1a', 8); L.zyl(0.03, 0.03, 0.75, x, 0, -0.1, '#9aa3aa', 4);
    if (r() < 0.6) figur(ctx.S, ...L.P(x, -0.1), (r() * 1e9) | 0, 'kunde', { y: L.oy + 0.33, ry: L.rot + PI, pose: 'sitzen' });
  }
  L.box(2.6, 0.02, 1.0, 0, 0, 0.9, '#7b5a40');
}
function kassenBand(L, r, d, ctx) {
  // ein Kassentisch mit Band (Kundenseite +z, Laufrichtung -x)
  L.box(2.2, 0.85, 0.75, 0, 0, 0, '#3f4a53');
  L.box(1.4, 0.03, 0.55, -0.35, 0.86, 0.05, '#1f2328');
  L.box(0.5, 0.06, 0.55, 0.8, 0.86, 0.05, '#c9d2d8');
  L.box(0.3, 0.3, 0.04, 0.6, 0.88, -0.3, '#2b3640');
  L.box(0.04, 1.2, 0.04, 1.05, 0.85, -0.35, '#9aa3aa');
  L.box(0.3, 0.22, 0.04, 1.05, 2.05, -0.35, '#2f5d3a');
  L.box(0.55, 0.45, 0.5, 0.75, 0, -0.65, '#2a2d31');
  figur(ctx.S, ...L.P(0.75, -0.7), (r() * 1e9) | 0, 'kasse', { y: L.oy + 0.0, ry: L.rot, pose: 'sitzen' });
  for (let k = 0; k < 3; k++) L.box(zw(r, 0.15, 0.28), zw(r, 0.1, 0.25), 0.18, -0.8 + k * 0.32, 0.89, 0.05, bunt(r, PAL.waren));
  if (r() < 0.8) figur(ctx.S, ...L.P(-0.3, 0.7), (r() * 1e9) | 0, 'kunde', { y: L.oy, ry: L.rot + PI / 2, pose: 'stehen' });
}
function einkaufswagen(L, lx, lz, ry = 0) {
  const P = L.sub(lx, lz, ry);
  P.box(0.5, 0.4, 0.8, 0, 0.45, 0, '#c9d2d8'); P.box(0.46, 0.36, 0.76, 0, 0.47, 0, '#9aa3aa');
  P.box(0.5, 0.04, 0.04, 0, 0.95, 0.45, '#d23c32');
  for (const x of [-0.2, 0.2]) for (const z of [-0.3, 0.3]) P.box(0.05, 0.4, 0.05, x, 0.05, z, '#5a636b');
}
const THEKEN = ['Käse', 'Wurst & Fleisch', 'Fisch', 'Konditorei'];
function thekenInsel(L, r, d, ctx) {
  frischeTheke(L.sub(0, -1.25), 3.2, r, d, ctx, THEKEN[(ctx.zaehler.theke = (ctx.zaehler.theke ?? -1) + 1) % THEKEN.length]);
  for (let k = 0; k < 2; k++) figur(ctx.S, ...L.P(-0.8 + k * 1.3, 1.45), (r() * 1e9) | 0, 'kunde', { y: L.oy, ry: L.rot + PI, pose: k ? 'schauen' : 'tasche' });
}
const foodInseln = [
  (L, r, d, ctx) => obstGemuese(L, r, d, ctx),
  (L, r, d, ctx) => { I.gondel(L, 0, 0, 3.2, 1.6, '#7b5a40', I.prodPackungen(['#c9483e', '#f2c14e', '#5a3b22', '#e8dcc6', '#3f6b3a', '#d97a5a', '#2b2b2b']), r, d); },
  (L, r, d, ctx) => { I.gondel(L, 0, 0, 3.2, 1.6, '#f4f4f2', I.prodFlaschen(['#6d1f2a', '#3a5a2a', '#d8b25a', '#2b2b2b', '#a8452f', '#e8dcc6'], 0.045, 0.32), r, d); },
];

// ================================================================ RESTAURANT
function freeFlowTheke(L, r, d, ctx, typ = 0) {
  const ware = [['#9bc53d', '#e8403a', '#f2c14e', '#f4e1c0', '#3f7d46'], ['#d97a5a', '#e9b44c', '#a8452f', '#f4e1c0', '#6b4a32'], ['#f2c6d2', '#5a3b22', '#ffffff', '#e8403a', '#f2c14e']][typ % 3];
  L.box(3.0, 0.9, 1.0, 0, 0, -0.2, '#e9e4dc');
  L.box(3.06, 0.05, 1.06, 0, 0.9, -0.2, '#c9d2d8');
  L.box(3.2, 0.04, 0.3, 0, 0.82, 0.45, '#9aa3aa');
  for (let i = 0; i < (d < 0.5 ? 4 : 7); i++) { const u = -1.25 + i * (2.5 / 6); L.box(0.34, 0.08, 0.5, u, 0.95, -0.2, '#ffffff'); L.box(0.3, 0.06, 0.44, u, 1.0, -0.2, bunt(r, ware)); }
  L.box(3.0, 0.04, 0.6, 0, 1.45, -0.25, '#c9d2d8');
  for (let i = 0; i < 5; i++) L.box(0.3, 0.12, 0.3, -1.2 + i * 0.6, 1.5, -0.25, bunt(r, ware));
  for (let k = 0; k < 6; k++) L.box(0.45, 0.03, 0.34, 1.75, 0.9 + k * 0.04, 0.45, k % 2 ? '#d23c32' : '#5a636b');
  const g = new THREE.BoxGeometry(3.0, 0.45, 0.03); g.rotateX(-0.35); L.geo(g, 0, 1.15, 0.12, GLAS);
  L.box(0.04, 0.55, 0.04, -1.45, 0.9, -0.5, '#9aa3aa'); L.box(0.04, 0.55, 0.04, 1.45, 0.9, -0.5, '#9aa3aa');
  stehFigur(ctx, L, zw(ctx.r, -0.8, 0.8), -1.0, 0, 'theke');
  if (ctx.r() < 0.8) figur(ctx.S, ...L.P(zw(ctx.r, -1, 1), 0.95), (ctx.r() * 1e9) | 0, 'kunde', { y: L.oy, ry: L.rot + PI, pose: 'tragen' });
}
function tablettRueckgabe(L, w, r, d, ctx) {
  tablettwagen(L, w / 2 - 0.4, 1.0, r); tablettwagen(L, -w / 2 + 0.4, 1.0, r);
  L.box(w, 2.6, 0.1, 0, 0, 0.05, '#c9c4bb');
  L.box(Math.min(w - 0.4, 2.4), 1.5, 0.6, 0, 0, 0.4, '#9aa3aa');
  for (let j = 0; j < 6; j++) L.box(Math.min(w - 0.6, 2.2), 0.03, 0.45, 0, 0.2 + j * 0.22, 0.42, j % 2 ? '#d23c32' : '#5a636b');
  L.box(1.4, 0.7, 0.05, 0, 1.6, 0.12, '#2a2d31');
  kopfband(ctx, L, w, 'Tablettrückgabe', '#5a636b', '#ffffff', 2.85, 0.45);
}
function restaurantWand(L, w, r, d, ctx) {
  L.box(w, 2.9, 0.1, 0, 0, 0.05, '#8c5a2b');
  I.bildtafel(L, 0, 1.4, 0.11, Math.min(2.6, w * 0.6), 1.1, r, ['#d97a5a', '#9bc53d']);
  L.box(w - 0.2, 0.9, 0.45, 0, 0, 0.3, '#5a3b2a');
  for (let k = 0; k < Math.floor(w / 0.9); k++) { L.box(0.45, 0.45, 0.45, -w / 2 + 0.6 + k * 0.9, 0.9, 0.3, '#ece6dc'); L.kugel(0.32, -w / 2 + 0.6 + k * 0.9, 1.6, 0.3, '#5f9a56'); }
  kopfband(ctx, L, w, 'Hartwig Restaurant', '#8c5a2b', '#ffffff', 3.1, 0.5);
}
function tisch4(L, r, d, ctx, belegt = 0.55) {
  for (const [x, z] of [[-0.8, -0.75], [0.8, -0.75], [-0.8, 0.75], [0.8, 0.75]]) {
    L.box(0.85, 0.74, 0.85, x, 0, z, '#f4f0ea');
    L.box(0.08, 0.7, 0.08, x, 0, z, '#2a2d31');
    for (const s of [-1, 1]) {
      I.stuhl(L, x + s * 0.62, z, s > 0 ? -PI / 2 : PI / 2, '#8c5a2b');
      if (ctx.r() < belegt * d + 0.15) { sitzFigur(ctx, L, x + s * 0.62, z, s > 0 ? -PI / 2 + PI : PI / 2 + PI); L.box(0.4, 0.02, 0.3, x + s * 0.2, 0.74, z, '#d23c32'); L.zyl(0.1, 0.1, 0.04, x + s * 0.2, 0.76, z, '#ffffff', 8); }
    }
  }
}
function restaurantKasse(L, r, d, ctx) {
  L.box(2.6, 1.0, 0.75, 0, 0, -0.5, '#5a3b2a'); L.box(2.7, 0.05, 0.85, 0, 1.0, -0.5, '#f4f0ea');
  for (const x of [-0.7, 0.6]) { L.box(0.32, 0.25, 0.04, x, 1.1, -0.7, '#2b3640'); stehFigur(ctx, L, x, -1.15, 0, 'kasse'); }
  for (let i = 0; i < 2; i++) figur(ctx.S, ...L.P(-0.7 + i * 1.3, 0.35), (r() * 1e9) | 0, 'kunde', { y: L.oy, ry: L.rot + PI, pose: 'tragen' });
  pflanze(L, 1.2, 1.0);
}
function fensterplaetze(L, w, r, d, ctx) {
  L.box(w, 0.05, 0.5, 0, 1.05, -0.3, '#7b5a40');
  L.box(w, 1.05, 0.08, 0, 0, -0.1, '#5a3b2a');
  const n = Math.floor(w / 0.75);
  for (let k = 0; k < n; k++) {
    const x = -w / 2 + (k + 0.5) * (w / n);
    L.zyl(0.18, 0.18, 0.05, x, 0.75, -0.85, '#2a1f1a', 8); L.zyl(0.03, 0.03, 0.75, x, 0, -0.85, '#9aa3aa', 4);
    if (r() < 0.5 * d + 0.2) figur(ctx.S, ...L.P(x, -0.85), (r() * 1e9) | 0, 'kunde', { y: L.oy + 0.33, ry: L.rot, pose: 'sitzen' });
  }
}
function schirmTisch(L, r, d, ctx) {
  L.box(3.2, 0.03, 3.2, 0, 0, 0, '#b98d61');
  L.zyl(0.04, 0.04, 2.4, 0, 0, 0, '#5a636b', 4);
  L.geo(new THREE.ConeGeometry(1.5, 0.45, 8).translate(0, 0.22, 0), 0, 2.2, 0, bunt(r, ['#ffffff', '#d23c32', '#f2e6d0']));
  L.zyl(0.45, 0.45, 0.04, 0, 0.72, 0, '#f4f0ea', 10); L.zyl(0.05, 0.05, 0.72, 0, 0, 0, '#2a2d31', 4);
  for (let k = 0; k < 4; k++) { const a = k * PI / 2 + 0.4; I.stuhl(L, Math.cos(a) * 0.75, Math.sin(a) * 0.75, -a - PI / 2, '#3f6b5a'); if (r() < 0.5) sitzFigur(ctx, L, Math.cos(a) * 0.75, Math.sin(a) * 0.75, -a + PI / 2); }
}
function pflanzentrog(L, lx, lz, w, r) {
  L.box(w, 0.6, 0.5, lx, 0, lz, '#7b5a40');
  for (let k = 0; k < Math.floor(w / 0.55); k++) L.kugel(0.32, lx - w / 2 + 0.3 + k * 0.55, 0.85 + (k % 2) * 0.12, lz, k % 2 ? '#5f9a56' : '#6fa860');
}
function tablettwagen(L, lx, lz, r) {
  L.box(0.6, 1.4, 0.45, lx, 0.1, lz, '#9aa3aa');
  for (let j = 0; j < 5; j++) L.box(0.56, 0.03, 0.42, lx, 0.25 + j * 0.24, lz, j % 2 ? '#d23c32' : '#5a636b');
  for (const x of [-0.25, 0.25]) L.zyl(0.06, 0.06, 0.1, lx + x, 0, lz, '#1f1f1f', 6);
}
function tisch2(L, r, d, ctx) {
  for (const x of [-0.85, 0.85]) {
    L.box(0.85, 0.74, 0.85, x, 0, -0.5, '#f4f0ea'); L.box(0.08, 0.7, 0.08, x, 0, -0.5, '#2a2d31');
    for (const s of [-1, 1]) { I.stuhl(L, x + s * 0.62, -0.5, s > 0 ? -PI / 2 : PI / 2, '#3f6b5a'); if (ctx.r() < 0.45 * d + 0.2) sitzFigur(ctx, L, x + s * 0.62, -0.5, s > 0 ? PI / 2 : -PI / 2); }
  }
  pflanzentrog(L, 0, 0.75, 2.6, r);
}
const restaurantInseln = [
  (L, r, d, ctx) => tisch4(L, r, d, ctx),
  (L, r, d, ctx) => tisch2(L, r, d, ctx),
];

// ================================================================ SPORT (Warenhaus) und Sporthaus
const sportInseln = MODUL.sport.insel;

// ================================================================ KONZEPTE
function offpriceWand(L, w, r, d, ctx) {
  const pal = PAL[ctx.o.basis] ?? PAL.damen;
  L.box(w, 2.4, 0.06, 0, 0, 0.03, '#d9d9d6');
  I.staender(L, 0, 0.4, w - 0.3, pal, r, d, 1.65);
  L.box(w, 0.55, 0.06, 0, 2.6, 0.05, '#ffd400');
  if (ctx.scene) I.schrift(L, waehle(r, ['Rote Preise', 'Bis zu −70 %', 'Restposten']), 0, 2.87, 0.1, 0.4, '#d4212a');
}
const offpriceInseln = [
  (L, r, d, ctx) => { I.wuehltisch(L, -0.2, -0.65, r, d, 2.6); I.wuehltisch(L, -0.2, 0.75, r, d, 2.6); I.preisschild(L, 1.35, 0, waehle(r, PREISE), 1.7); },
  (L, r, d, ctx) => { I.gitterbox(L, -0.8, -0.7, r, d); I.gitterbox(L, 0.7, -0.7, r, d); I.staender(L, 0, 0.8, 2.6, PAL[ctx.o.basis] ?? PAL.damen, r, d, 1.5); I.preisschild(L, -1.3, 0.8, waehle(r, PREISE), 1.9); },
];
function leerWand(L, w, r, d, ctx) { I.abgedeckt(L, 0, 0.4, w - 0.4, 2.0, 0.6); }
const leerInseln = [
  (L, r, d, ctx) => { I.abgedeckt(L, -0.4, -0.3, 2.0, 0.9, 1.0, 0.1); I.kartons(L, 0.9, 0.9, r, 4); },
  (L, r, d, ctx) => { I.kartons(L, -0.6, -0.4, r, 5); },
];
const umbauInseln = [
  (L, r, d, ctx) => { I.material(L, -0.3, -0.5, r); I.leiter(L, 1.2, 1.0, 0.5); figur(ctx.S, ...L.P(0.2, 0.9), (r() * 1e9) | 0, 'handwerker', { y: L.oy }); },
  (L, r, d, ctx) => { I.schutt(L, -0.6, -0.4, r, d < 0.5 ? 5 : 10); I.schubkarre(L, 0.9, 0.9, 0.6); },
  (L, r, d, ctx) => { L.box(2.6, 2.2, 0.12, 0, 0, -1.0, '#ebe9e4'); for (let i = 0; i < 5; i++) L.box(0.06, 2.6, 0.1, -1.2 + i * 0.6, 0, -0.85, '#c9d2d8'); I.leiter(L, 0.6, 0.2); figur(ctx.S, ...L.P(-0.6, 0.6), (r() * 1e9) | 0, 'handwerker', { y: L.oy }); },
];
function umbauWand(L, w, r, d, ctx) { L.box(w - 0.2, 0.6, 0.05, 0, 0.3, 0.06, '#c9c4bb'); L.box(Math.min(1.4, w * 0.3), 1.4, 0.04, -w * 0.2, 1.2, 0.07, '#9aa3aa'); }

// ================================================================ Abteilungsdefinitionen
// boden {a,b,m,c}, schild {farbe, schrift}, wand [fn], insel [fn], pw/pt (Raster), vorne fn, wandExtra [{len, fn, seite}], kasse
const MODE_ROLLE = 'verkauf';
export const ABT = {
  beauty: {
    pal: PAL.flakon, niedrig: 'flaschen', korpus: '#ffffff', name: 'Beauty & Parfümerie', schild: { farbe: '#1f1f1f', schrift: '#e2c27a' },
    boden: { a: '#efe3d0', b: '#e3d3bc', c: '#cdb998', m: 'marmor' }, kante: '#1f1f1f',
    wand: [(L, w, r, d, ctx) => flakonWand(L, w, r, d, ctx, BEAUTY_MARKEN[(ctx.zaehler.wand++ + ctx.basisSeed) % BEAUTY_MARKEN.length])], wl: 3.2,
    insel: [(L, r, d, ctx) => beautyCounter(L, r, d, ctx, BEAUTY_MARKEN[(ctx.zaehler.insel++ + ctx.basisSeed + 3) % BEAUTY_MARKEN.length]), (L, r, d, ctx) => schminkInsel(L, r, d, ctx)],
    wahl: (i, j) => ((i + j) % 3 === 2 ? 1 : 0), iw: 3.4, it: 3.4, gap: 1.3,
    vorne: beautyVorne, kasseFn: beautyKasse, rolle: 'beauty',
  },
  damen: {
    name: 'Damenmode', schild: { farbe: '#a8325e', schrift: '#ffffff' }, boden: { a: '#e3cfb1', b: '#d9c3a2', m: 'dielen' },
    wand: [damenWand, damenWandFach, damenWand], wl: 3.0, insel: damenInseln, wahl: (i, j) => (i + j) % 3,
    vorne: damenVorne, vorneTakt: 0, wandExtra: [{ len: 3.6, fn: damenUmkleiden, seite: 'nx', min: 12 }], teilen: 'marken',
  },
  herren: {
    pal: HEMD, korpus: '#5a4232', name: 'Herrenmode', schild: { farbe: '#1f2a3a', schrift: '#e9d9b5' }, boden: { a: '#6f5440', b: '#62493a', c: '#57402f', m: 'parkett' }, kante: '#2a1f1a',
    wand: [anzugWand, hemdenWand, anzugWand], wl: 3.2, insel: herrenInseln, wahl: (i, j) => (j * 2 + i) % 3,
    vorne: (L, r, d) => I.puppenPodest(L, 0, 0, 'herren', ANZUG, r, 2.6), vorneTakt: 0, wandExtra: [{ len: 3.6, fn: (L, w, r) => I.umkleiden(L, w, 3, r, '#2b3a55'), seite: 'nx', min: 8 }],
    slots: [{ wo: 'vl', fn: sesselGruppe, min: 8 }], teilen: 'herren',
  },
  herren_casual: {
    pal: CASUAL, korpus: '#7d8a8f', name: 'Kordel & Co.', schild: { farbe: '#3f6b5a', schrift: '#f4efe6' }, boden: { a: '#8a9196', b: '#7f868b', m: 'beton' },
    wand: [casualWand], wl: 3.0, insel: casualInseln, vorne: (L, r, d) => I.puppenPodest(L, 0, 0, 'herren', CASUAL, r, 2.6),
  },
  herren_schuhe: {
    pal: ['#2b2b2b', '#5a3b22', '#8b5a3c'], niedrig: 'schuhe', korpus: '#4e3a2c', name: 'Herrenschuhe', schild: { farbe: '#4a3324', schrift: '#f2e6d0' }, boden: { a: '#4f3a2c', b: '#463326', m: 'parkett' },
    wand: [herrenSchuhWand], wl: 2.8, insel: [herrenSchuhInsel], vorne: (L, r, d) => sitzbank(L, 0, 0, 2.2, 0, '#7a4a2e'),
  },
  kinder: {
    pal: PAL.kinder, korpus: '#ffffff', name: 'Kinderwelt', schild: { farbe: '#f28c28', schrift: '#ffffff' }, boden: { a: '#e3f0f6', b: '#d8e8f0', m: 'punkte', punkte: ['#ffd166', '#9fd8ef', '#f7a1a1', '#bfe28a'] },
    wand: [kikoWand], wl: 2.6, insel: kikoInseln, vorne: kikoVorne, vorneTakt: 0, teilen: 'kinder', iw: 3.2, it: 3.0,
  },
  baby: {
    pal: ['#f6dfe6', '#d8e8f0', '#e8f4ea', '#ffffff', '#f7e8b5'], korpus: '#ffffff', name: 'Baby', schild: { farbe: '#7fc8b5', schrift: '#ffffff' }, boden: { a: '#e8f4ea', b: '#dcefe0', m: 'teppich' },
    wand: [kikoWand], wl: 2.6, insel: babyInseln, vorne: (L, r) => { kinderwagen(L, -0.6, 0, r, 0.2); kinderwagen(L, 0.6, 0, r, -0.2); },
  },
  schulranzen: {
    pal: PAL.kinder, niedrig: 'packungen', korpus: '#f7d26a', name: 'Schulranzen & Spielecke', schild: { farbe: '#1f6fd1', schrift: '#ffffff' }, boden: { a: '#fdf3d6', b: '#f6e7b8', m: 'karo' },
    wand: [schulranzenWand], wl: 2.6, insel: [spielecke, kikoInseln[0]], wahl: (i, j) => (i + j) % 2,
  },
  waesche: {
    pal: ZART, korpus: '#f6e6ea', name: 'Wäsche & Dessous', schild: { farbe: '#c97a96', schrift: '#ffffff' }, boden: { a: '#f2e2e6', b: '#ead5db', m: 'teppich' },
    wand: [buestenWand, bademantelWand, buestenWand], wl: 3.0, insel: waescheInseln, vorne: waescheVorne, vorneTakt: 0,
    wandExtra: [{ len: 4.2, fn: waescheUmkleiden, seite: 'nx', min: 6 }],
  },
  accessoires: {
    pal: SCHUH, niedrig: 'schuhe', korpus: '#f4efe7', name: 'Schuhe', schild: { farbe: '#7a4b2a', schrift: '#ffffff' }, boden: { a: '#c49a6c', b: '#b98f62', m: 'parkett' },
    wand: [schuhWand], wl: 3.0, insel: schuhInseln, wahl: (i, j) => (i + j) % 2, vorne: (L, r, d) => I.schuhtisch(L, 0, 0, r, d, 2.4, '#ffffff', SCHUH),
  },
  lederwaren: {
    pal: PAL.taschen, niedrig: 'packungen', korpus: '#c79f74', name: 'Koffer & Lederwaren', schild: { farbe: '#5a3b22', schrift: '#f2e6d0' }, boden: { a: '#8f8a84', b: '#85807a', m: 'platten' },
    wand: [kofferWand], wl: 3.0, insel: lederInseln, vorne: (L, r, d) => kofferPodest(L, 0, 0, r, d, 2.6),
  },
  schmuck: {
    pal: ['#d8b25a', '#c9d2d8', '#1f1f1f'], niedrig: 'packungen', korpus: '#1f2a3a', name: 'Uhren & Schmuck', schild: { farbe: '#1f2a3a', schrift: '#e2c27a' }, boden: { a: '#2c3646', b: '#263040', m: 'teppich' }, kante: '#d8b25a',
    wand: [uhrenWand], wl: 3.0, insel: schmuckInseln, vorne: (L, r, d) => { sonnenbrillenTurm(L, -0.8, 0, r, d); sonnenbrillenTurm(L, 0.8, 0, r, d); }, rolle: 'beauty',
  },
  strumpf: {
    pal: ['#e6c9a8', '#2b2b2b', '#1f2a3a', '#7a4a6b'], niedrig: 'packungen', korpus: '#efe7f2', name: 'Strumpfwaren', schild: { farbe: '#8a6aa8', schrift: '#ffffff' }, boden: { a: '#ece6ef', b: '#e2dae6', m: 'karo' },
    wand: [strumpfWand], wl: 2.8, insel: [strumpfInsel],
  },
  wohnen: {
    pal: ['#b5745a', '#5f7f8c', '#e9b44c', '#7a8a5c', '#f2e6d0'], korpus: '#d8bf98', name: 'Living', schild: { farbe: '#5f7f5a', schrift: '#ffffff' }, boden: { a: '#d6c3a3', b: '#cbb796', m: 'dielen' },
    wand: [moebelWand, leuchtenWand, heimtexWand], wl: 3.4, insel: livingInseln, wahl: (i, j) => (i + 2 * j) % 5, iw: 3.4, it: 3.2,
    vorne: (L, r, d) => { teppichstapel(L, -0.5, 0, r, 2.0, 1.0); I.pouf(L, 1.1, 0, '#5f7f8c'); },
  },
  haushalt: {
    niedrig: 'geschirr', korpus: '#f4f2ee', name: 'Tisch, Küche & Haushalt', schild: { farbe: '#3f6b8a', schrift: '#ffffff' }, boden: { a: '#e7e9ea', b: '#d9dcde', m: 'fliese' },
    wand: [geschirrWand, kochWand], wl: 3.0, insel: haushaltInseln, iw: 3.4, it: 3.2,
    vorne: (L, r, d) => { topfTurm(L, -0.8, 0, r, d); topfTurm(L, 0.8, 0, r, d); },
  },
  elektro: {
    pal: ['#1f1f1f', '#ffffff', '#c9d2d8', '#3c8dd9'], niedrig: 'packungen', korpus: '#2a2d31', name: 'Multimedia & Elektro', schild: { farbe: '#111417', schrift: '#4fd3e6' }, boden: { a: '#4a5058', b: '#40464d', c: '#20b5c9', m: 'streifen' }, kante: '#20b5c9',
    wand: [tvWand, tvWand, kopfhoererWand], wl: 3.0, insel: elektroInseln, wahl: (i, j) => (i + j) % 3,
  },
  spielwaren: {
    pal: PAL.kinder, niedrig: 'packungen', korpus: '#ffffff', name: 'Spielwaren', schild: { farbe: '#e8403a', schrift: '#ffffff' }, boden: { a: '#f6e9b8', b: '#bfe0f0', m: 'karo' },
    wand: [plueschWand, spieleWand], wl: 3.0, insel: spielInseln, wahl: (i, j) => (i + j * 2) % 5, iw: 3.4, it: 3.2,
    vorne: (L, r, d) => { kinderfahrzeug(L, -0.9, 0, r); I.pluschBerg(L, 0.6, 0, r, d); },
  },
  food: {
    niedrig: 'truhe', name: 'Feinkost', schild: { farbe: '#2f5d3a', schrift: '#f6e8b0' }, boden: { a: '#c98c63', b: '#bd8058', m: 'karo' }, kante: '#5a3b2a',
    wand: [(L, w, r, d, ctx) => frischeTheke(L, w, r, d, ctx, ['Käse', 'Wurst & Fleisch', 'Fisch', 'Konditorei', 'Feinkost'][ctx.zaehler.wand++ % 5]), kuehlregal],
    wandNX: [kuehlregal, weinWand], wl: 4.8, wandTiefe: 2.6, insel: [...foodInseln, thekenInsel], iw: 3.2, it: 2.6, gap: 1.5,
    wahl: (i, j, nI, nJ, r, ctx) => (j === 0 && ctx.thekenRaum ? 3 : j === nJ - 1 || (i + j) % 3 === 0 ? 0 : 1 + ((i + j) % 2)),
    kassenzone: true, rolle: 'theke', teilen: 'food',
  },
  wein: {
    pal: ['#4a1a22', '#6d1f2a', '#2f4a22', '#d8b25a'], niedrig: 'flaschen', korpus: '#5a3b2a', name: 'Weinabteilung', schild: { farbe: '#6d1f2a', schrift: '#f6e8b0' }, boden: { a: '#7b5a40', b: '#6f5038', m: 'parkett' },
    wand: [weinWand], wl: 3.6, insel: [probierbar, foodInseln[2]], wahl: (i, j) => (j === 0 ? 0 : 1), iw: 3.2, it: 2.6, rolle: 'theke',
  },
  restaurant: {
    name: 'Restaurant', schild: { farbe: '#8c5a2b', schrift: '#ffffff' }, boden: { a: '#c99a6b', b: '#bd8e60', m: 'parkett' },
    wand: [restaurantWand], wl: 4.0, insel: restaurantInseln, wahl: (i, j) => ((i + j) % 3 === 2 ? 1 : 0), iw: 3.0, it: 2.9, gap: 0.8, niedrig: 'pflanzen',
    wandExtra: [{ len: 3.2, fn: tablettRueckgabe, seite: 'nx', min: 4 }], rolle: 'theke', layout: 'restaurant',
  },
  sport: {
    pal: PAL.sport, korpus: '#2a2d31', name: 'Sport', schild: { farbe: '#1f6fd1', schrift: '#ffffff' }, boden: { a: '#a9b8c8', b: '#e8403a', c: '#ffffff', m: 'streifen' },
    wand: MODUL.sport.wand.map((f) => (L, w, r, d, ctx) => { f(L, w, r, d); kopfband(ctx, L, w, 'Sport', '#1f6fd1', '#ffffff'); }), wl: 3.0, insel: sportInseln,
  },
  offprice: {
    pal: PAL.waren, korpus: '#c9d2d8', name: 'Rote Preise', schild: { farbe: '#ffd400', schrift: '#d4212a' }, boden: { a: '#c4c0b7', b: '#b8b4ab', m: 'fliese' }, kante: '#d4212a',
    wand: [offpriceWand], wl: 3.0, insel: offpriceInseln, iw: 3.2, it: 3.0, gap: 1.3,
    vorne: (L, r, d) => { I.wuehltisch(L, 0, 0, r, d, 2.4); I.preisschild(L, 1.3, 0, waehle(r, PREISE), 1.6); },
  },
  leer: {
    name: 'Fläche frei', schild: { farbe: '#6b6e72', schrift: '#ffffff' }, boden: { a: '#8a8d90', b: '#808386', m: 'beton' },
    wand: [leerWand], niedrigFn: leerWand, wl: 4.5, insel: leerInseln, wahl: (i, j) => ((i * 3 + j) % 4 === 0 ? 0 : (i + j) % 5 === 2 ? 1 : -1), personal: 0, rahmen: 'leer',
  },
  umbau: {
    name: 'Wir bauen für Sie um', schild: { farbe: '#f2c14e', schrift: '#1f1f1f' }, boden: { a: '#9a958d', b: '#8f8a82', m: 'beton' },
    wand: [umbauWand], niedrigFn: umbauWand, wl: 4.5, insel: umbauInseln, wahl: (i, j) => ((i + j) % 2 ? (i + j) % 3 : -1), personal: 0, rahmen: 'umbau',
  },
};
// Sporthaus-Gruppen aus dem bestehenden Modulsatz
const SPORT_FARBE = { sportschuhe: '#e8403a', sporttextil: '#1f6fd1', outdoor: '#3f6b3a', rad: '#2a2d31', wintersport: '#20b5c9', teamsport: '#38b86b' };
for (const g of ['sportschuhe', 'sporttextil', 'outdoor', 'rad', 'wintersport', 'teamsport']) {
  ABT[g] = {
    name: I.abteilungsname ? undefined : g, schild: { farbe: SPORT_FARBE[g], schrift: '#ffffff' }, boden: I.BODEN[g],
    wand: MODUL[g].wand, wl: 3.0, insel: MODUL[g].insel,
  };
}
export const ABT_NAMEN = Object.fromEntries(Object.entries(ABT).map(([k, v]) => [k, v.name]));
ABT_NAMEN.sportschuhe = 'Sportschuhe'; ABT_NAMEN.sporttextil = 'Sportbekleidung'; ABT_NAMEN.outdoor = 'Outdoor'; ABT_NAMEN.rad = 'Fahrrad'; ABT_NAMEN.wintersport = 'Wintersport'; ABT_NAMEN.teamsport = 'Teamsport';
for (const g of Object.keys(SPORT_FARBE)) ABT[g].name = ABT_NAMEN[g];

/** Art einer Fläche aus haeuser.json (Konzept vor Warengruppe; f.art überschreibt). */
export function abteilungsArt(f) {
  if (f.art) return f.art;
  if (f.konzept && !['eigen', 'kommission'].includes(f.konzept)) return f.konzept;
  return f.gruppe;
}

// ================================================================ Teilung in Shop-in-Shop-Flächen
function spaltenGruppen(zellen) {
  const cols = [...new Set(zellen.map((c) => c.i))].sort((a, b) => a - b);
  return cols;
}
function teileNachSpalten(zellen, anteile) {
  // anteile: [{art, marke, w}] → Spalten proportional (mindestens eine je Teil), Reihenfolge links nach rechts
  const cols = spaltenGruppen(zellen);
  if (cols.length < anteile.length) anteile = anteile.slice(0, cols.length);
  const summe = anteile.reduce((s, a) => s + a.w, 0);
  const n = anteile.map((a) => Math.max(1, Math.round((a.w / summe) * cols.length)));
  let diff = cols.length - n.reduce((a, b) => a + b, 0);
  for (let k = 0; diff !== 0 && k < 50; k++) { const idx = diff > 0 ? n.indexOf(Math.min(...n)) : n.indexOf(Math.max(...n)); if (diff < 0 && n[idx] <= 1) break; n[idx] += diff > 0 ? 1 : -1; diff += diff > 0 ? -1 : 1; }
  const teile = []; let p = 0;
  anteile.forEach((a, k) => { const cs = new Set(cols.slice(p, p + n[k])); p += n[k]; teile.push({ ...a, zellen: zellen.filter((c) => cs.has(c.i)) }); });
  return teile.filter((t) => t.zellen.length);
}
function teilen(A, art, zellen, o) {
  const ncol = spaltenGruppen(zellen).length;
  if (typeof A.teilen === 'function') return A.teilen(zellen, o, teileNachSpalten, ncol);
  if (A.teilen === 'marken') {
    if (ncol < 2) return [{ art, marke: DAMEN_MARKEN[(o.basisSeed ?? 0) % DAMEN_MARKEN.length], zellen }];
    const k = Math.max(2, Math.ceil(ncol / 2.2));
    const anteile = [];
    for (let q = 0; q < k; q++) anteile.push({ art, marke: DAMEN_MARKEN[((o.basisSeed ?? 0) + q) % DAMEN_MARKEN.length], w: 1 });
    return teileNachSpalten(zellen, anteile);
  }
  if (A.teilen === 'herren') {
    if (ncol >= 4) return teileNachSpalten(zellen, [{ art: 'herren', w: 5 }, { art: 'herren_casual', w: 3 }, { art: 'herren_schuhe', w: 2 }]);
    if (ncol === 3) return teileNachSpalten(zellen, [{ art: 'herren', w: 1 }, { art: 'herren_casual', w: 1 }, { art: 'herren_schuhe', w: 1 }]);
    if (ncol === 2) return teileNachSpalten(zellen, [{ art: 'herren', w: 1 }, { art: 'herren_schuhe', w: 1 }]);
    return null;
  }
  if (A.teilen === 'kinder') {
    if (ncol >= 4) return teileNachSpalten(zellen, [{ art: 'kinder', w: 5 }, { art: 'baby', w: 3 }, { art: 'schulranzen', w: 2 }]);
    if (ncol === 3) return teileNachSpalten(zellen, [{ art: 'kinder', w: 1 }, { art: 'baby', w: 1 }, { art: 'schulranzen', w: 1 }]);
    if (ncol === 2) return teileNachSpalten(zellen, [{ art: 'kinder', w: 1 }, { art: 'schulranzen', w: 1 }]);
    return null;
  }
  if (A.teilen === 'food') {
    if (ncol >= 4) return teileNachSpalten(zellen, [{ art: 'food', w: 3 }, { art: 'wein', w: 1 }]);
    return null;
  }
  return null;
}

/** Zusammenhangskomponenten (4er-Nachbarschaft). */
function komponenten(zellen) {
  const key = (c) => c.i + ',' + c.j;
  const rest = new Map(zellen.map((c) => [key(c), c]));
  const out = [];
  while (rest.size) {
    const [k0, c0] = rest.entries().next().value; rest.delete(k0);
    const teil = [c0], stapel = [c0];
    while (stapel.length) {
      const c = stapel.pop();
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (c.i + di) + ',' + (c.j + dj); if (rest.has(k)) { const n = rest.get(k); rest.delete(k); teil.push(n); stapel.push(n); } }
    }
    out.push(teil);
  }
  return out.sort((a, b) => b.length - a.length);
}

// ================================================================ Engine
const BAND_N = { wand: 2.0, nachbar: 1.55, gang: 1.0, schnitt: 0.6, front: 1.0 };

/** Niedriger Raumteiler (1,2 m) an inneren Grenzen: verdeckt die Nachbarfläche nicht. Rücken z = 0, Front +z. */
function raumteiler(L, w, r, d, ctx) {
  const A = ctx.A, art = A.niedrig ?? 'stapel', pal = ctx.marke?.pal ?? A.pal ?? PAL.waren;
  if (A.niedrigFn) { A.niedrigFn(L, w, r, d, ctx); return; }
  if (art === 'pflanzen') { L.box(w, 0.75, 0.6, 0, 0, 0.3, '#5a3b2a'); for (let k = 0; k < Math.floor(w / 0.9); k++) L.kugel(0.36, -w / 2 + 0.45 + k * 0.9, 1.0, 0.3, k % 2 ? '#5f9a56' : '#6fa860'); return; }
  if (art === 'truhe') {
    L.box(w, 0.85, 0.9, 0, 0, 0.45, '#f4f4f2'); L.box(w - 0.1, 0.05, 0.8, 0, 0.85, 0.45, GLAS);
    const n = Math.floor(w / (d < 0.5 ? 0.6 : 0.32));
    for (let k = 0; k < n; k++) L.box(0.26, 0.12, 0.6, -w / 2 + 0.3 + k * ((w - 0.4) / n), 0.72, 0.45, bunt(r, ['#ffffff', '#3c8dd9', '#e8403a', '#f2c14e', '#9bc6d8']));
    return;
  }
  const korpus = ctx.marke?.wand ?? A.korpus ?? '#ece6dc';
  L.box(w, 1.1, 0.55, 0, 0, 0.28, korpus);
  L.box(w + 0.04, 0.05, 0.6, 0, 1.1, 0.28, dunkler(korpus, 0.08));
  if (art === 'schuhe') { I.prodSchuhe(pal)(L, 0, 1.15, 0.28, w - 0.3, r, d, 0.2); I.prodSchuhe(pal)(L, 0, 0.55, 0.5, w - 0.3, r, d, 0.2); return; }
  if (art === 'flaschen') { I.prodFlaschen(pal, 0.045, 0.3)(L, 0, 1.15, 0.28, w - 0.3, r, d, 0.32); return; }
  if (art === 'geschirr') { I.prodGeschirr(L, 0, 1.15, 0.28, w - 0.3, r, d, 0.25); return; }
  if (art === 'packungen') { I.prodPackungen(pal)(L, 0, 1.15, 0.28, w - 0.3, r, d, 0.35); return; }
  I.stapel(L, 0, 0.28, w - 0.3, 0.4, 1.15, pal, r, d);
  for (let k = 0; k < Math.floor(w / 0.9); k++) L.box(0.7, 0.4, 0.02, -w / 2 + 0.55 + k * 0.9, 0.35, 0.56, bunt(r, pal));
}
const BAND_P = { wand: 1.0, nachbar: 1.0, gang: 1.25, schnitt: 0.6 };

/**
 * Baut eine Abteilungsfläche. Siehe Kopf der Datei.
 */
export function flaeche(S, scene, art, Z, o = {}) {
  const A = ABT[art] ?? ABT.damen;
  const alle = Z.alle ?? Z.zellen;
  const res = { frei: [], belegt: [], flaeche: alle.length * R * R };
  if (!alle.length) return res;
  const sicht = Z.sicht ?? (() => true);
  const satz = new Set(alle.map((c) => c.i + ',' + c.j));
  const kanteZ = (i, j, di, dj) => (satz.has((i + di) + ',' + (j + dj)) ? 'innen' : Z.kante(i, j, di, dj));
  const basisSeed = Math.abs((o.seed ?? 1) | 0) % 997;

  // 0) Eigenmarken-Shop (Spiel): o.eigenmarke oder f.marke = { eigenmarke: true, name, farbe, anteil } nimmt einen Anteil der
  //    Spalten als eigenen Shop mit Markenboden, Markenfarbe an Wand und Kopfband und eigenem Deckenschild; der Rest bleibt
  //    die normale Abteilung (mit ihrer Shop-in-Shop-Teilung).
  const emWunsch = o.eigenmarke ?? (o.marke?.eigenmarke && !o.marke.kopf ? o.marke : null);
  if (emWunsch && !o.teil && !o.emDrin) {
    const cols = spaltenGruppen(alle);
    const n = cols.length < 2 ? cols.length : klemm(Math.round(cols.length * (emWunsch.anteil ?? 0.3)), 1, cols.length - 1);
    const shopCols = new Set(cols.slice(0, n));   // an der hinteren Wand (-x): dort stehen die hohen Wandsysteme mit Kopfband
    const shop = alle.filter((c) => shopCols.has(c.i)), rest = alle.filter((c) => !shopCols.has(c.i));
    const teilZ = (zellen) => { const ts = new Set(zellen.map((c) => c.i + ',' + c.j)); return { ...Z, alle: zellen, kante: (i, j, di, dj) => { const k = (i + di) + ',' + (j + dj); return satz.has(k) && !ts.has(k) ? 'nachbar' : Z.kante(i, j, di, dj); } }; };
    const ohne = { ...o, marke: o.marke?.eigenmarke ? undefined : o.marke, eigenmarke: undefined, emDrin: true };
    if (rest.length) { const rr = flaeche(S, scene, art, teilZ(rest), ohne); res.frei.push(...rr.frei); res.belegt.push(...rr.belegt); }
    const rr = flaeche(S, scene, art, teilZ(shop), { ...ohne, teil: true, marke: eigenmarkeAlsMarke(emWunsch), name: emWunsch.name, schild: true, kasse: !rest.length, seed: (o.seed ?? 1) * 11 + 977 });
    res.frei.push(...rr.frei); res.belegt.push(...rr.belegt);
    res.eigenmarke = { name: emWunsch.name, zellen: shop.length };
    return res;
  }
  // 1) Shop-in-Shop-Teilung (nur oberste Ebene)
  if (A.teilen && !o.teil) {
    const teile = teilen(A, art, alle, { basisSeed });
    if (teile && teile.length) {
      const kIdx = teile.reduce((b, t, k) => (t.zellen.length > teile[b].zellen.length ? k : b), 0);
      // Hauptschild zuerst vermerken, die Schilder der Teilflächen weichen ihm aus
      if (o.schild !== false) deckenschild(S, scene, A, alle, sicht, Z.y ?? 0, o.name);
      teile.forEach((t, k) => {
        const ts = new Set(t.zellen.map((c) => c.i + ',' + c.j));
        const sub = { ...Z, alle: t.zellen, kante: (i, j, di, dj) => { const n = (i + di) + ',' + (j + dj); return satz.has(n) && !ts.has(n) ? 'nachbar' : Z.kante(i, j, di, dj); } };
        const rr = flaeche(S, scene, t.art, sub, { ...o, teil: true, marke: t.marke, kasse: (o.kasse ?? true) && k === kIdx, seed: (o.seed ?? 1) * 7 + k * 131, schild: t.art !== art });
        res.frei.push(...rr.frei); res.belegt.push(...rr.belegt);
      });
      return res;
    }
  }
  // 2) Mehrere getrennte Teile: einzeln bauen, Kasse im größten
  const komp = komponenten(alle);
  if (komp.length > 1) {
    komp.forEach((t, k) => {
      const rr = flaeche(S, scene, art, { ...Z, alle: t }, { ...o, teil: true, kasse: (o.kasse ?? true) && k === 0, seed: (o.seed ?? 1) + k * 53, schild: o.schild });
      res.frei.push(...rr.frei); res.belegt.push(...rr.belegt);
    });
    return res;
  }

  const r = rng((o.seed ?? 1) * 7919 + 17);
  const d = klemm(o.dichte ?? 1, 0.2, 1);
  const y = Z.y ?? 0, yb = y + 0.06;
  const ctx = { S, scene, r, d, y, yb, A, art, marke: o.marke, o, basisSeed, zaehler: { wand: 0, insel: 0 } };
  const marke = o.marke;

  // Geometrie
  const cols = new Map(), rows = new Map();
  for (const c of alle) {
    const a = cols.get(c.i) ?? { jmin: c.j, jmax: c.j }; a.jmin = Math.min(a.jmin, c.j); a.jmax = Math.max(a.jmax, c.j); cols.set(c.i, a);
    const b = rows.get(c.j) ?? { imin: c.i, imax: c.i }; b.imin = Math.min(b.imin, c.i); b.imax = Math.max(b.imax, c.i); rows.set(c.j, b);
  }
  const ci = [...cols.keys()].sort((a, b) => a - b), rj = [...rows.keys()].sort((a, b) => a - b);
  for (const i of ci) { const a = cols.get(i); a.nz = kanteZ(i, a.jmin, 0, -1); a.pz = kanteZ(i, a.jmax, 0, 1); }
  for (const j of rj) { const b = rows.get(j); b.nx = kanteZ(b.imin, j, -1, 0); b.px = kanteZ(b.imax, j, 1, 0); }
  const bandP = (k) => (k === 'front' ? (o.eg ? 2.6 : 1.4) : (BAND_P[k] ?? 1.0));
  const bandN = (k) => (k === 'wand' ? (A.wandTiefe ?? BAND_N.wand) : (BAND_N[k] ?? 1.0));

  // Boden
  const bodenTyp = marke?.boden ?? A.boden;
  for (const c of alle) if (sicht(c.i * R + 2.5, c.j * R + 2.5)) boden(S, c.i * R, c.j * R, R, R, y, bodenTyp, d);
  const kf = A.kante ?? '#8a8378';
  for (const i of ci) { const a = cols.get(i); if (a.pz === 'gang' && sicht(i * R + 2.5, (a.jmax + 1) * R - 1)) S.box(R, 0.03, 0.12, i * R + 2.5, y + 0.07, (a.jmax + 1) * R - 0.06, kf); if (a.nz === 'gang' && sicht(i * R + 2.5, a.jmin * R + 1)) S.box(R, 0.03, 0.12, i * R + 2.5, y + 0.07, a.jmin * R + 0.06, kf); }
  for (const j of rj) { const b = rows.get(j); if (b.px === 'gang' && sicht((b.imax + 1) * R - 1, j * R + 2.5)) S.box(0.12, 0.03, R, (b.imax + 1) * R - 0.06, y + 0.07, j * R + 2.5, kf); if (b.nx === 'gang' && sicht(b.imin * R + 1, j * R + 2.5)) S.box(0.12, 0.03, R, b.imin * R + 0.06, y + 0.07, j * R + 2.5, kf); }

  // Kantensegmente
  const segmente = (achse) => {
    const out = [];
    if (achse === 'nz' || achse === 'pz') {
      for (const i of ci) {
        const a = cols.get(i), pos = achse === 'nz' ? a.jmin * R : (a.jmax + 1) * R, art2 = a[achse];
        const l = out[out.length - 1];
        if (l && l.pos === pos && l.art === art2 && l.b === i * R) l.b = (i + 1) * R; else out.push({ a: i * R, b: (i + 1) * R, pos, art: art2, achse });
      }
    } else {
      for (const j of rj) {
        const b = rows.get(j), pos = achse === 'nx' ? b.imin * R : (b.imax + 1) * R, art2 = b[achse];
        const l = out[out.length - 1];
        if (l && l.pos === pos && l.art === art2 && l.b === j * R) l.b = (j + 1) * R; else out.push({ a: j * R, b: (j + 1) * R, pos, art: art2, achse });
      }
    }
    return out;
  };
  const segNZ = segmente('nz'), segNX = segmente('nx'), segPZ = segmente('pz'), segPX = segmente('px');
  ctx.thekenRaum = !segNZ.some((sg) => sg.art === 'wand' && sg.b - sg.a >= 8);
  // Kassenzone (Feinkost): längste Gangseite, bevorzugt vorne
  const kassenSeg = A.kassenzone ? [...segPZ, ...segPX, ...segNZ, ...segNX].filter((sg) => sg.art === 'gang' && sg.b - sg.a >= 5).sort((p, q) => (q.b - q.a + (q.achse === 'pz' ? 0.5 : 0)) - (p.b - p.a + (p.achse === 'pz' ? 0.5 : 0)))[0] : null;
  if (kassenSeg) kassenSeg.kasse = true;
  const KZ = 3.0;

  // 3) Wandsysteme (nur -x/-z, nur an Wand/Nachbar)
  const extras = (A.wandExtra ?? []).filter((e) => alle.length >= (e.min ?? 0)).map((e) => ({ ...e, frei: true }));
  const wandFns = (achse) => (achse === 'nx' && A.wandNX ? A.wandNX : A.wand);
  let wandZaehler = 0;
  const wandBauen = (sg) => {
    if (!WANDARTEN.has(sg.art)) return;
    let a = sg.a, b = sg.b;
    if (sg.achse === 'nz') {
      // Ecke: -x-Wand derselben Reihe belegt die ersten 0,75 m
      const rw = rows.get(sg.pos / R);
      if (rw && rw.imin * R === a && WANDARTEN.has(rw.nx)) a += 0.75;
    }
    const tiefe = 0.8;
    const setze = (u0, u1, fn) => {
      const w = u1 - u0, u = (u0 + u1) / 2;
      const L = sg.achse === 'nz' ? lokal(S, u, yb, sg.pos + 0.02, 0) : lokal(S, sg.pos + 0.02, yb, u, PI / 2);
      const cx = sg.achse === 'nz' ? u : sg.pos + 0.4, cz = sg.achse === 'nz' ? sg.pos + 0.4 : u;
      if (sg.achse === 'nz') res.belegt.push([u0, sg.pos, u1, sg.pos + tiefe]); else res.belegt.push([sg.pos, u0, sg.pos + tiefe, u1]);
      if (!sicht(cx, cz)) return;
      fn(L, w - 0.12, r, d, ctx);
      if (sg.art === 'wand' && fn !== raumteiler) oberfries(L, w - 0.12, r, ctx, wandZaehler);
    };
    // Extras (Umkleiden, Rückgabe) am vorderen bzw. rechten Ende
    for (const e of extras) if (e.frei && sg.art === 'wand' && (e.seite === sg.achse || e.seite === 'egal') && b - a >= e.len + 1.5) { setze(b - e.len, b, e.fn); b -= e.len; e.frei = false; }
    const fns = wandFns(sg.achse);
    const n = Math.max(1, Math.round((b - a) / (A.wl ?? 3)));
    const w = (b - a) / n;
    for (let k = 0; k < n; k++) setze(a + k * w, a + (k + 1) * w, sg.art === 'nachbar' ? raumteiler : fns[(wandZaehler++) % fns.length]);
  };
  segNZ.forEach(wandBauen); segNX.forEach(wandBauen);
  // Extras, die keinen Platz an ihrer Seite fanden, an die andere Seite
  for (const e of extras) if (e.frei) { const sg = [...segNZ, ...segNX].filter((s) => s.art === 'wand' && s.b - s.a >= e.len + 1.5)[0]; if (sg) { e.seite = sg.achse; wandBauen({ ...sg, a: sg.b - e.len - 0.01 }); } }

  // 4) Inselraster
  const gap = A.gap ?? 1.25, iw = A.iw ?? 3.0, it = A.it ?? 3.0, pw = iw + gap, pt = it + gap;
  const i0 = ci[0], i1 = ci[ci.length - 1], j0 = rj[0], j1 = rj[rj.length - 1];
  // Kassenzone verbreitert das Band ihrer Seite
  const bandK = (achse, k) => (kassenSeg && kassenSeg.achse === achse ? Math.max(KZ, achse[0] === 'n' ? bandN(k) : bandP(k)) : achse[0] === 'n' ? bandN(k) : bandP(k));
  const bandNx = (b) => bandK('nx', b.nx), bandPx = (b) => bandK('px', b.px), bandNz = (a) => bandK('nz', a.nz), bandPz = (a) => bandK('pz', a.pz);
  const bNX = Math.min(...rj.map((j) => bandNx(rows.get(j)))), bPX = Math.min(...rj.map((j) => bandPx(rows.get(j))));
  const bNZ = Math.min(...ci.map((i) => bandNz(cols.get(i)))), bPZ = Math.min(...ci.map((i) => bandPz(cols.get(i))));
  const X0 = i0 * R + bNX, X1 = (i1 + 1) * R - bPX, Z0 = j0 * R + bNZ, Z1 = (j1 + 1) * R - bPZ;
  // Raster an die verfügbare Länge anpassen: Inselmaß höchstens 10 % größer, mindestens 2,2 m
  const passe = (L, w) => { let n = Math.max(0, Math.round((L + gap) / (w + gap))); let e = n ? Math.min(w * 1.1, (L - (n - 1) * gap) / n) : 0; while (n > 0 && e < 2.2) { n--; e = n ? Math.min(w * 1.1, (L - (n - 1) * gap) / n) : 0; } return [n, e]; };
  const [nI, iwE] = passe(X1 - X0, iw), [nJ, itE] = passe(Z1 - Z0, it);
  const pwE = iwE + gap, ptE = itE + gap;
  const offX = (X1 - X0 - (nI * pwE - gap)) / 2, offZ = (Z1 - Z0 - (nJ * ptE - gap)) / 2;
  const gueltig = (sx0, sz0, sx1, sz1) => {
    for (let i = Math.floor(sx0 / R); i <= Math.floor((sx1 - 1e-6) / R); i++) { const a = cols.get(i); if (!a) return false; if (sz0 < a.jmin * R + bandNz(a) - 0.05 || sz1 > (a.jmax + 1) * R - bandPz(a) + 0.05) return false; }
    for (let j = Math.floor(sz0 / R); j <= Math.floor((sz1 - 1e-6) / R); j++) { const b = rows.get(j); if (!b) return false; if (sx0 < b.imin * R + bandNx(b) - 0.05 || sx1 > (b.imax + 1) * R - bandPx(b) + 0.05) return false; }
    return true;
  };
  const slots = [];
  for (let i = 0; i < nI; i++) for (let j = 0; j < nJ; j++) {
    const cx = X0 + offX + i * pwE + iwE / 2, cz = Z0 + offZ + j * ptE + itE / 2;
    if (gueltig(cx - iwE / 2, cz - itE / 2, cx + iwE / 2, cz + itE / 2)) slots.push({ i, j, cx, cz });
  }
  if (!slots.length && X1 - X0 > 2.6 && Z1 - Z0 > 2.6) slots.push({ i: 0, j: 0, cx: (X0 + X1) / 2, cz: (Z0 + Z1) / 2, klein: true });
  // Sonderplätze: Kasse vorne rechts, weitere laut Definition
  const vergeben = new Map();
  const nimm = (wo) => {
    const frei = slots.filter((s) => !vergeben.has(s));
    if (!frei.length) return null;
    const wert = { vr: (s) => s.cz * 10 + s.cx, vl: (s) => s.cz * 10 - s.cx, hr: (s) => -s.cz * 10 + s.cx, hl: (s) => -s.cz * 10 - s.cx }[wo];
    return frei.reduce((b, s) => (wert(s) > wert(b) ? s : b));
  };
  const kasse = (o.kasse ?? true) && A.personal !== 0 && !['leer', 'umbau', 'untermiete', 'konzession'].includes(art) && !A.kassenzone && slots.length >= (A.layout === 'restaurant' ? 2 : 3);
  if (kasse) { const s = nimm('vr'); if (s) vergeben.set(s, 'kasse'); }
  for (const sp of A.slots ?? []) if (alle.length >= (sp.min ?? 0)) { const s = nimm(sp.wo); if (s) vergeben.set(s, sp.fn); }
  if (A.layout === 'restaurant') {
    // hintere Reihen Free-Flow-Theken, vordere Reihen Tische
    const theken = Math.max(1, Math.round(nJ * 0.4));
    let typ = 0;
    for (const s of slots) if (!vergeben.has(s) && s.j < theken) vergeben.set(s, (L, rr, dd, cc) => freeFlowTheke(L, rr, dd, cc, typ++));
  }
  for (const s of slots) {
    const L = lokal(S, s.cx, yb, s.cz, 0);
    res.belegt.push([s.cx - iw / 2, s.cz - it / 2, s.cx + iw / 2, s.cz + it / 2]);
    const v = vergeben.get(s);
    const fp = [[s.cx + iw / 2 + gap / 2, s.cz + zw(r, -1, 1)], [s.cx + zw(r, -1.2, 1.2), s.cz + it / 2 + gap / 2], [s.cx - iw / 2 - gap / 2, s.cz + zw(r, -1, 1)]];
    for (const p of fp) if (sicht(p[0], p[1])) res.frei.push(p);
    if (!sicht(s.cx, s.cz)) continue;
    if (v === 'kasse') { if (A.kasseFn) A.kasseFn(L, r, d, ctx); else if (A.layout === 'restaurant') restaurantKasse(L, r, d, ctx); else kassentresen(S, s.cx, s.cz - 0.3, (r() * 1e6) | 0, { y: yb }); continue; }
    if (typeof v === 'function') { v(L, r, d, ctx); continue; }
    const n = A.insel.length;
    let idx = A.wahl ? A.wahl(s.i, s.j, nI, nJ, r, ctx) : (s.i + s.j) % n;
    if (idx < 0) continue;
    A.insel[idx % n](L, r, d, ctx);
  }

  // 5) Vorzone zum Gang (niedrige Ware) bzw. Fensterplätze, Kassenzone
  const vorneFn = A.layout === 'restaurant' ? null : A.vorne;
  const vorzone = (sg) => {
    const zumGang = sg.art === 'gang' || (sg.art === 'front' && !o.eg);
    if (!zumGang) return;
    const len = sg.b - sg.a;
    if (sg.kasse) {
      // Kassen quer zur Gangkante, Kunden in der Schlange zum Markt hin
      const n = Math.max(1, Math.floor((len - 1.5) / 2.6));
      const plus = sg.achse[0] === 'p', ach = sg.achse[1];
      for (let k = 0; k < n; k++) {
        const u = sg.a + (len - n * 2.6) / 2 + (k + 0.5) * 2.6;
        const t = plus ? -1.4 : 1.4, rot = ach === 'z' ? (plus ? 0 : PI) : (plus ? PI / 2 : -PI / 2);
        const [cx, cz] = ach === 'z' ? [u, sg.pos + t] : [sg.pos + t, u];
        res.belegt.push([cx - 1.3, cz - 1.3, cx + 1.3, cz + 1.3]);
        if (!sicht(cx, cz)) continue;
        const L = lokal(S, cx, yb, cz, rot + PI / 2);
        kassenBand(L, r, d, ctx);
        for (let q = 0; q < 2; q++) if (r() < 0.75) figur(S, ...L.P(-1.5 - q * 0.7, 0.6), (r() * 1e9) | 0, 'kunde', { y: yb, ry: L.rot + PI / 2, pose: q ? 'tragen' : 'stehen' });
      }
      return;
    }
    if (A.layout === 'restaurant' && sg.art === 'front') {
      for (let u = sg.a + 0.3; u < sg.b - 2; u += 4) { const w = Math.min(3.6, sg.b - u - 0.3); const L = sg.achse === 'pz' ? lokal(S, u + w / 2, yb, sg.pos - 0.2, 0) : lokal(S, sg.pos - 0.2, yb, u + w / 2, PI / 2); if (sicht(...(sg.achse === 'pz' ? [u + w / 2, sg.pos - 0.6] : [sg.pos - 0.6, u + w / 2]))) fensterplaetze(L, w, r, d, ctx); }
      return;
    }
    if (!vorneFn || d < 0.35) return;
    const takt = A.vorneTakt ?? 7.5;
    const n = A.vorneTakt === 0 ? (len >= 4 ? 1 : 0) : Math.max(len >= 4 ? 1 : 0, Math.floor(len / takt));
    for (let k = 0; k < n; k++) {
      const u = A.vorneTakt === 0 ? sg.a + 2.0 : sg.a + (len - n * takt) / 2 + (k + 0.5) * takt;
      const L = sg.achse === 'pz' ? lokal(S, u, yb, sg.pos - 0.75, 0) : lokal(S, sg.pos - 0.75, yb, u, PI / 2);
      const [cx, cz] = sg.achse === 'pz' ? [u, sg.pos - 0.75] : [sg.pos - 0.75, u];
      if (res.belegt.some((b) => cx > b[0] - 1.2 && cx < b[2] + 1.2 && cz > b[1] - 0.5 && cz < b[3] + 0.5)) continue;
      res.belegt.push([cx - 1.3, cz - 0.6, cx + 1.3, cz + 0.6]);
      if (sicht(cx, cz)) vorneFn(L, r, d, ctx);
    }
  };
  segPZ.forEach(vorzone); segPX.forEach(vorzone);
  segNZ.forEach((sg) => sg.kasse && vorzone(sg)); segNX.forEach((sg) => sg.kasse && vorzone(sg));

  // 6) Konzeptrahmen: Leerstand abgeklebt, Umbau mit Bauzaun
  if (A.rahmen) for (const sg0 of [...segPZ, ...segPX, ...segNZ, ...segNX]) {
    const ber = Z.bereich, sg = { ...sg0 };
    if (ber) { const [lo, hi] = sg.achse[1] === 'z' ? [ber[0], ber[2]] : [ber[1], ber[3]]; sg.a = Math.max(sg.a, lo); sg.b = Math.min(sg.b, hi); if (sg.b - sg.a < 1) continue; }
    if (sg.art !== 'gang' && sg.art !== 'nachbar' && !(sg.art === 'front' && A.rahmen === 'umbau')) continue;
    const plus = sg.achse === 'pz' || sg.achse === 'px';
    if (!plus && A.rahmen === 'leer') continue;
    const off = plus ? -0.3 : 0.3;
    const L = sg.achse === 'pz' || sg.achse === 'nz' ? lokal(S, 0, yb, sg.pos + off, 0) : lokal(S, sg.pos + off, yb, 0, PI / 2);
    const [ua, ub] = sg.achse === 'pz' || sg.achse === 'nz' ? [sg.a + 0.3, sg.b - 0.3] : [-(sg.b - 0.3), -(sg.a + 0.3)];
    const mx = sg.achse === 'pz' || sg.achse === 'nz' ? (sg.a + sg.b) / 2 : sg.pos, mz = sg.achse === 'pz' || sg.achse === 'nz' ? sg.pos : (sg.a + sg.b) / 2;
    if (!sicht(mx, mz)) continue;
    if (A.rahmen === 'umbau') I.bauzaun(L, ua, ub, 0);
    else folienwand(L, ua, ub, ctx);
  }

  // 7) Freie Plätze im Wandgang, Personal
  for (const sg of [...segNZ, ...segNX]) for (let u = sg.a + 1; u < sg.b - 0.5; u += 2.2) {
    const p = sg.achse === 'nz' ? [u + zw(r, -0.4, 0.4), sg.pos + (WANDARTEN.has(sg.art) ? 1.45 : 0.5)] : [sg.pos + (WANDARTEN.has(sg.art) ? 1.45 : 0.5), u + zw(r, -0.4, 0.4)];
    if (sicht(p[0], p[1])) res.frei.push(p);
  }
  const nPers = A.personal ?? Math.max(1, Math.round((alle.length * 25) / 160 * d));
  for (let k = 0; k < nPers && res.frei.length; k++) {
    const [fx, fz] = res.frei.splice(Math.floor(r() * res.frei.length), 1)[0];
    figur(S, fx, fz, (r() * 1e9) | 0, A.rolle ?? MODE_ROLLE, { y: yb, ry: r() * PI * 2 });
  }

  // 8) Deckenschild
  if (o.schild !== false) deckenschild(S, scene, A, alle, sicht, y, o.name, marke);
  return res;
}

/** Oberer Abschluss der Warenwand bis unter die Decke: Vorratsfach mit Ware und Kampagnenbild im Wechsel. */
function oberfries(L, w, r, ctx, k) {
  if (ctx.A.rahmen) return;
  // großes Marken- bzw. Abteilungsfarbfeld bis unter die Decke (auch auf 25 % unterscheidbar)
  const feld = ctx.marke?.kopf ?? ctx.A.schild.farbe, sf = ctx.marke?.schrift ?? ctx.A.schild.schrift;
  // vor den Wandpilastern (Tiefe 0,22 m), damit kein Pilaster das Feld und die Schrift schneidet
  L.box(w + 0.12, 0.72, 0.14, 0, 3.86, 0.24, feld);
  if (ctx.scene && k % 2 === 0 && w > 2.4) I.schrift(L, ctx.marke?.name ?? ctx.A.name, 0, 4.22, 0.32, 0.42, sf);
  return;
  const f = ctx.marke?.wand ?? ctx.A.korpus ?? '#ece6dc';
  L.box(w, 0.62, 0.35, 0, 3.92, 0.18, f);
  L.box(w, 0.05, 0.38, 0, 3.92, 0.19, dunkler(f, 0.1));
  if (k % 2 && w > 2.2) { L.box(Math.min(2.4, w - 0.4), 0.5, 0.02, 0, 3.98, 0.36, '#f8f6f2'); L.box(Math.min(2.4, w - 0.4) - 0.1, 0.42, 0.02, 0, 4.02, 0.375, bunt(r, ['#e9c9b5', '#bcd3df', '#d6c6e0', '#e4d7b8', '#c9dcc4'])); L.box(0.25, 0.36, 0.02, -0.4, 4.04, 0.39, bunt(r, ctx.marke?.pal ?? ctx.A.pal ?? PAL.waren)); }
  else if (ctx.d > 0.4) { const n = Math.floor((w - 0.2) / 0.5); for (let q = 0; q < n; q++) L.box(0.42, zw(r, 0.3, 0.5), 0.3, -w / 2 + 0.35 + q * ((w - 0.3) / n), 3.97, 0.2, bunt(r, ctx.marke?.pal ?? ctx.A.pal ?? ['#c9a26b', '#e8dcc6', '#ffffff'])); }
}

function folienwand(L, a, b, ctx) {
  // abgeklebte Fläche: weiße Stellwände mit rotem Band und Hinweis
  const n = Math.max(1, Math.round((b - a) / 2.5)), s = (b - a) / n;
  for (let k = 0; k < n; k++) {
    const u = a + (k + 0.5) * s;
    L.box(s - 0.04, 2.4, 0.06, u, 0, 0, '#f4f2ee');
    L.box(s - 0.04, 0.25, 0.07, u, 1.6, 0, '#d23c32');
    L.box(0.08, 2.4, 0.3, u - s / 2 + 0.04, 0, 0, '#c9c4bb');
  }
  if (ctx.scene && b - a > 4) I.schrift(L, 'Hier entsteht Neues', (a + b) / 2, 1.0, 0.05, 0.36, '#6b6e72');
}

// ---------------------------------------------------------------- Schilder ohne Überdeckung
// Jedes Schild wird im Bildraum der festen Kamera (Azimut 45°, Elevation 30°) als Rechteck vermerkt. In den gescherten
// Koordinaten u = (x - z)/√2, v = 0,866·y - 0,707·z sind Schilder parallel zur x-Achse genau achsparallel.
const SCHILD_RAND = 0.9; // Mindestabstand im Bild (m), damit Schilder auch aus Spielabstand getrennt lesbar bleiben
function schildBox(xa, xb, za, zb, y0, y1) {
  const us = [], vs = [];
  for (const [x, z] of [[xa, za], [xb, za], [xa, zb], [xb, zb]]) for (const y of [y0, y1]) { us.push((x - z) * Math.SQRT1_2); vs.push(0.866 * y - Math.SQRT1_2 * z); }
  return [Math.min(...us), Math.min(...vs), Math.max(...us), Math.max(...vs)];
}
function schilderVon(scene) { return (scene.userData.hartwigSchilder ??= []); }
function ueberdeckung(b, liste) {
  let f = 0;
  for (const q of liste) {
    const du = Math.min(b[2], q[2]) - Math.max(b[0], q[0]) + SCHILD_RAND, dv = Math.min(b[3], q[3]) - Math.max(b[1], q[1]) + SCHILD_RAND;
    if (du > 0 && dv > 0) f += du * dv;
  }
  return f;
}
/** Vermerkt ein Schild (Wand- oder Hängeschild) für spätere Kollisionsprüfungen. */
export function schildVermerken(scene, xa, xb, za, zb, y0, y1) { if (scene) schilderVon(scene).push(schildBox(xa, xb, za, zb, y0, y1)); }
/**
 * Wählt aus Kandidaten [{x, y, z}] den ersten ohne Überdeckung für ein Schild breite × hoehe parallel zu x.
 * Findet sich keiner, wird das Schild stufenweise kleiner (bis 60 %), zuletzt gilt die kleinste Überdeckung.
 * Rückgabe { x, y, z, k } mit k = Verkleinerungsfaktor.
 */
function schildPlatz(scene, kand, breite, hoehe) {
  const liste = schilderVon(scene);
  let best = null, bf = Infinity;
  for (const k of [1, 0.85, 0.72, 0.6]) {
    const bb = breite * k, hh = hoehe * k;
    for (const c of kand) {
      const b = schildBox(c.x - bb / 2 - 0.06, c.x + bb / 2 + 0.06, c.z, c.z, c.y - hh / 2 - 0.06, c.y + hh / 2 + 0.06);
      const f = ueberdeckung(b, liste);
      if (f < bf - 1e-6) { bf = f; best = { ...c, k, box: b }; if (f === 0) break; }
    }
    if (bf === 0) break;
  }
  liste.push(best.box);
  return best;
}
/** Kandidaten: Ausgangslage zuerst, dann seitlich, nach hinten und tiefer gehängt (Abstand nach Schildbreite). */
function schildKandidaten(x, y, z, xa, xb, za, zb, breite) {
  const lo = Math.min(xa + breite / 2 + 0.3, x), hi = Math.max(xb - breite / 2 - 0.3, x), out = [];
  const xs = [x]; for (let d = 0.5; x - d >= lo || x + d <= hi; d += 0.5) { if (x + d <= hi) xs.push(x + d); if (x - d >= lo) xs.push(x - d); }
  const zs = [z]; for (let d = 1.25; z - d >= za + 0.6 || z + d <= zb - 0.6; d += 1.25) { if (z - d >= za + 0.6) zs.push(z - d); if (z + d <= zb - 0.6) zs.push(z + d); }
  for (const yy of [y, y - 0.6]) for (const zz of zs) for (const xx of xs) out.push({ x: xx, y: yy, z: zz });
  return out;
}

/** Hängeschild über dem sichtbaren Teil einer Fläche; Größe nach Breite und Textlänge, ohne andere Schilder zu überdecken. */
function deckenschild(S, scene, A, zellen, sicht, y, name, marke) {
  if (!scene) return;
  const vis = zellen.filter((c) => sicht(c.i * R + 2.5, c.j * R + 2.5));
  if (!vis.length) return;
  const text = name ?? A.name;
  const x0 = Math.min(...vis.map((c) => c.i)) * R, x1 = (Math.max(...vis.map((c) => c.i)) + 1) * R;
  const z0 = Math.min(...vis.map((c) => c.j)) * R, z1 = (Math.max(...vis.map((c) => c.j)) + 1) * R;
  const hg = marke?.eigenmarke ? marke.kopf : A.schild.farbe, sf = marke?.eigenmarke ? marke.schrift : A.schild.schrift;
  const { seitenverhaeltnis } = textTextur(text, sf, 120, hg);
  const hoehe = klemm((x1 - x0 - 1.2) / seitenverhaeltnis, 0.55, 1.15);
  const breite = hoehe * seitenverhaeltnis;
  const sx = klemm((x0 + x1) / 2, x0 + breite / 2 + 0.3, x1 - breite / 2 - 0.3);
  const sz = z0 + (z1 - z0) * 0.55;
  const k = schildPlatz(scene, schildKandidaten(sx, y + 3.75, sz, x0, x1, z0, z1, breite), breite, hoehe);
  haengeschild(S, scene, text, k.x, k.y, k.z, { farbe: hg, schrift: sf, hoehe: hoehe * k.k });
}

// ================================================================ Untermiete und Konzession (Fremdflächen)
/**
 * Fremdfläche mit eigener Gestaltung: Konzession (fremde Marke) oder Untermiete (abgetrennt, Glasfront, Tür).
 * Baut den Inhalt mit dem Modulsatz der Basisgruppe bzw. des Mieters.
 */
/** Obst- und Gemüsestand: gestufte Holzkisten mit bunter Ware, davor ein Waagenpult. */
function obstStand(L, r, d) {
  const WARE = ['#e8403a', '#9bc53d', '#f2c14e', '#ff8c42', '#7b2f5a', '#5f9a3a', '#f4e04d', '#c0392b'];
  for (const [z, y, rot] of [[-0.9, 0, 0], [0.9, 0, PI]]) {
    L.box(2.8, 0.55, 1.2, 0, y, z, '#a77b4f', rot);
    for (let i = 0; i < 4; i++) {
      L.box(0.62, 0.32, 0.5, -1.05 + i * 0.7, 0.55, z - 0.28, '#8d6440');
      L.box(0.56, 0.14, 0.44, -1.05 + i * 0.7, 0.87, z - 0.28, bunt(r, WARE));
      L.box(0.62, 0.32, 0.5, -1.05 + i * 0.7, 0.75, z + 0.25, '#8d6440');
      L.box(0.56, 0.14, 0.44, -1.05 + i * 0.7, 1.07, z + 0.25, bunt(r, WARE));
    }
  }
  L.box(0.8, 1.0, 0.5, 1.9, 0, 0, '#e9eef2'); L.box(0.4, 0.06, 0.35, 1.9, 1.0, 0, '#3f4a53');
}
/** Kühlregal: weißer Schrank mit Glastüren, Milch, Käse und Getränke in Reihen. */
function kuehlWand(L, w, r, d) {
  L.box(w, 2.2, 0.75, 0, 0, 0.38, '#f2f4f5');
  L.box(w - 0.1, 1.7, 0.04, 0, 0.3, 0.77, '#bcd6df');
  for (let j = 0; j < 4; j++) for (let k = 0; k < Math.floor((w - 0.3) / 0.32); k++) L.box(0.22, 0.28, 0.25, -w / 2 + 0.3 + k * 0.32, 0.35 + j * 0.42, 0.55, bunt(r, ['#ffffff', '#f4e1c0', '#3c8dd9', '#e8403a', '#f2c14e', '#9bc53d']));
  for (let u = -w / 2 + 0.8; u < w / 2; u += 0.9) L.box(0.05, 1.7, 0.06, u, 0.3, 0.79, '#9aa3aa');
  L.box(w, 0.3, 0.78, 0, 2.2, 0.39, '#1f5fa8');
}

export function fremdflaeche(S, scene, art, Z, o = {}) {
  const alle = Z.alle ?? Z.zellen;
  const sicht = Z.sicht ?? (() => true);
  const res = { frei: [], belegt: [], flaeche: alle.length * 25 };
  if (!alle.length) return res;
  const satz = new Set(alle.map((c) => c.i + ',' + c.j));
  const kanteZ = (i, j, di, dj) => (satz.has((i + di) + ',' + (j + dj)) ? 'innen' : Z.kante(i, j, di, dj));
  const r = rng((o.seed ?? 1) * 31 + 5);
  const d = klemm(o.dichte ?? 1, 0.2, 1);
  const y = Z.y ?? 0, yb = y + 0.06;
  const unter = art === 'untermiete';
  const mt = unter ? (MIETER[o.mieter] ?? MIETER.discounter) : null;
  const m = unter ? null : (o.marke ?? MARKEN[(o.seed ?? 0) % MARKEN.length]);
  const typ = unter ? UNTERMIETE[o.mieter ?? 'discounter'] : null;
  // Boden
  const bt = unter ? typ.boden : { a: m.boden, b: dunkler(m.boden, 0.04), m: 'karo' };
  for (const c of alle) if (sicht(c.i * R + 2.5, c.j * R + 2.5)) boden(S, c.i * R, c.j * R, R, R, y, bt, d);
  // Inhalt je Zelle (Modulsatz), Fremdflächen bleiben bewusst eigenständig
  const basis = unter ? null : (MODUL[o.basis ?? m.gruppe] ?? MODUL.damen);
  let tuerGesetzt = false, schild = false;
  // Lebensmittel-Discounter: Obst- und Gemüsestände und Kühlregale im Wechsel mit den Trockenregalen
  const frisch = unter && (o.mieter ?? 'discounter') === 'discounter';
  let frischNr = 0, wandNr = 0;
  for (const c of alle) {
    const x = c.i * R, z = c.j * R;
    const wx = WANDARTEN.has(kanteZ(c.i, c.j, -1, 0)) || kanteZ(c.i, c.j, -1, 0) === 'gang';
    const wz = WANDARTEN.has(kanteZ(c.i, c.j, 0, -1)) || kanteZ(c.i, c.j, 0, -1) === 'gang';
    const zentrum = [x + 2.5 + (wx ? 0.45 : 0), z + 2.5 + (wz ? 0.45 : 0)];
    res.belegt.push([x + 0.8, z + 0.8, x + 4.2, z + 4.2]);
    if (!sicht(x + 2.5, z + 2.5)) continue;
    res.frei.push([x + 4.6, z + 2.5 + zw(r, -1, 1)], [x + 2.5 + zw(r, -1, 1), z + 4.6]);
    const L = lokal(S, zentrum[0], yb, zentrum[1], 0);
    if (unter && frisch) (frischNr++ % 2 === 0 ? obstStand : waehle(r, typ.insel))(L, r, d); else if (unter) waehle(r, typ.insel)(L, r, d); else waehle(r, basis.insel)(L, r, d);
    const wand = (seite) => seite === 'z' ? lokal(S, x + 2.5 + (wx ? 0.35 : 0), yb, z + 0.25, 0) : lokal(S, x + 0.25, yb, z + 2.5, PI / 2);
    for (const [seite, ist] of [['z', wz], ['x', wx]]) if (ist) {
      const len = seite === 'z' ? (wx ? R - 0.85 : R - 0.3) : R - 0.3;
      const W = wand(seite);
      if (unter && frisch && wandNr++ % 2 === 0) kuehlWand(W, len, r, d); else if (unter) typ.wand(W, len, r, d); else { W.box(len, 3.6, 0.1, 0, 0, -0.1, m.farbe); waehle(r, basis.wand)(W, len - 0.2, r, d); }
    }
  }
  // Abtrennung: an allen Grenzen zum Warenhaus; vorne Glasfront mit Tür und Schild
  const hoch = 3.6;
  for (const c of alle) {
    const x = c.i * R, z = c.j * R;
    for (const [di, dj] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const k = kanteZ(c.i, c.j, di, dj);
      if (k === 'innen' || k === 'wand' || k === 'schnitt' || (k === 'front')) continue;
      const vorne = di > 0 || dj > 0;
      const pos = dj !== 0 ? (dj > 0 ? z + R - 0.08 : z + 0.08) : (di > 0 ? x + R - 0.08 : x + 0.08);
      const mx = dj !== 0 ? x + 2.5 : pos, mz = dj !== 0 ? pos : z + 2.5;
      if (!sicht(mx, mz)) continue;
      const farbe = unter ? '#e9e4dc' : m.farbe;
      const tuer = vorne && k === 'gang' && !tuerGesetzt;
      if (tuer) tuerGesetzt = true;
      const seg = (a, b) => {
        if (b - a < 0.1) return;
        const lenS = b - a, mid = (a + b) / 2;
        const h0 = vorne ? 1.0 : hoch;
        if (dj !== 0) { S.box(lenS, h0, 0.15, mid, y + h0 / 2, pos, farbe); if (vorne) { S.box(lenS, hoch - 1.4, 0.04, mid, y + 1.0 + (hoch - 1.4) / 2, pos, GLAS); S.box(lenS, 0.4, 0.18, mid, y + hoch - 0.2, pos, farbe); } }
        else { S.box(0.15, h0, lenS, pos, y + h0 / 2, mid, farbe); if (vorne) { S.box(0.04, hoch - 1.4, lenS, pos, y + 1.0 + (hoch - 1.4) / 2, mid, GLAS); S.box(0.18, 0.4, lenS, pos, y + hoch - 0.2, mid, farbe); } }
      };
      const a0 = dj !== 0 ? x : z;
      if (tuer) { seg(a0, a0 + 1.2); seg(a0 + 3.8, a0 + R); if (dj !== 0) S.box(2.6, 0.4, 0.18, a0 + 2.5, y + hoch - 0.2, pos, farbe); else S.box(0.18, 0.4, 2.6, pos, y + hoch - 0.2, a0 + 2.5, farbe); }
      else seg(a0, a0 + R);
      if (vorne && !schild && scene && (k === 'gang')) {
        schild = true;
        const name = unter ? mt.name : m.name, hg = unter ? mt.farbe : m.farbe, sf = unter ? mt.schrift : m.schrift;
        const { seitenverhaeltnis } = textTextur(name, sf, 120, hg);
        const hh = Math.min(0.55, 4.2 / seitenverhaeltnis);
        const sb = hh * seitenverhaeltnis + 0.2;
        if (dj !== 0) schildVermerken(scene, x + 2.5 - sb / 2, x + 2.5 + sb / 2, pos + 0.15, pos + 0.15, y + hoch - 0.3 - hh / 2, y + hoch - 0.1 + hh / 2);
        else schildVermerken(scene, pos + 0.15, pos + 0.15, z + 2.5 - sb / 2, z + 2.5 + sb / 2, y + hoch - 0.3 - hh / 2, y + hoch - 0.1 + hh / 2);
        if (dj !== 0) { S.box(hh * seitenverhaeltnis + 0.2, hh + 0.14, 0.1, x + 2.5, y + hoch - 0.2, pos + 0.12, hg); wandschild(S, scene, name, 'x', x + 2.5, y + hoch - 0.2, pos + 0.15, { schrift: sf, farbe: hg, hoehe: hh }); }
        else { S.box(0.1, hh + 0.14, hh * seitenverhaeltnis + 0.2, pos + 0.12, y + hoch - 0.2, z + 2.5, hg); wandschild(S, scene, name, 'z', z + 2.5, y + hoch - 0.2, pos + 0.15, { schrift: sf, farbe: hg, hoehe: hh }); }
      }
    }
  }
  if (!schild && scene) {
    const c = alle.find((q) => sicht(q.i * R + 2.5, q.j * R + 2.5));
    if (c) {
      const name = unter ? mt.name : m.name, sf = unter ? mt.schrift : m.schrift, hg = unter ? mt.farbe : m.farbe;
      const breite = 0.6 * textTextur(name, sf, 120, hg).seitenverhaeltnis;
      const vis = alle.filter((q) => sicht(q.i * R + 2.5, q.j * R + 2.5));
      const xa = Math.min(...vis.map((q) => q.i)) * R, xb = (Math.max(...vis.map((q) => q.i)) + 1) * R;
      const za = Math.min(...vis.map((q) => q.j)) * R, zb = (Math.max(...vis.map((q) => q.j)) + 1) * R;
      const k = schildPlatz(scene, schildKandidaten(c.i * R + 2.5, y + 3.7, c.j * R + 2.6, xa, xb, za, zb, breite), breite, 0.6);
      haengeschild(S, scene, name, k.x, k.y, k.z, { farbe: hg, schrift: sf, hoehe: 0.6 * k.k });
    }
  }
  return res;
}

// ================================================================ Katalogkachel 15 × 15 m
/**
 * Abteilung als Ausschnitt nx × nz Zellen (Standard 3 × 3) mit Rückwänden -x/-z und Gangstreifen +x/+z.
 * o: { seed, dichte, kunden, basis, mieter, marke }
 */
export function abteilungKachel(S, scene, art, o = {}) {
  vorbereiten(S, scene);
  const nx = o.nx ?? 3, nz = o.nz ?? 3, W = nx * R, T = nz * R, gw = 1.6;
  S.box(W + gw + 0.6, 0.5, T + gw + 0.6, (W + gw) / 2 - 0.3, -0.25, (T + gw) / 2 - 0.3, '#59626a');
  boden(S, 0, T, W + gw, gw, 0, { a: '#f3f0ea', b: '#e2ddd3', m: 'fliese' }, 1);
  boden(S, W, 0, gw, T, 0, { a: '#f3f0ea', b: '#e2ddd3', m: 'fliese' }, 1);
  const zellen = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) zellen.push({ i, j });
  const Z = { alle: zellen, kante: (i, j, di, dj) => (i + di < 0 || j + dj < 0 ? 'wand' : 'gang') };
  const fremd = art === 'konzession' || art === 'untermiete';
  const res = fremd ? fremdflaeche(S, scene, art, Z, o) : flaeche(S, scene, art, Z, { seed: o.seed ?? 1, dichte: o.dichte, basis: o.basis, marke: o.marke, eg: false });
  rueckwand(S, 'x', 0, W + gw, 0, 0, WANDHOEHE);
  rueckwand(S, 'z', 0, T + gw, 0, 0, WANDHOEHE, { putz: '#f1e9dd' });
  const r = rng((o.seed ?? 1) * 101 + 3);
  const n = o.kunden ?? (['leer', 'umbau'].includes(art) ? 1 : Math.round(nx * nz * 1.3));
  // abgeklebte bzw. abgesperrte Flächen: niemand läuft hindurch, höchstens ein Passant auf dem Gang davor
  const zu = ['leer', 'umbau'].includes(art);
  const pool = zu ? [] : res.frei.slice();
  for (let k = 0; k < 3; k++) pool.push([zw(r, 1, W + 1), T + zw(r, 0.5, 1.1)], [W + zw(r, 0.5, 1.1), zw(r, 1, T)]);
  for (let k = 0; k < n && pool.length; k++) {
    const [fx, fz] = pool.splice(Math.floor(r() * pool.length), 1)[0];
    figur(S, fx, fz, (o.seed ?? 1) * 1000 + k, r() < 0.12 ? 'kind' : 'kunde', { ry: Math.atan2(W / 2 - fx, T / 2 - fz) + zw(r, -0.8, 0.8) });
  }
  return new THREE.Box3(new THREE.Vector3(-0.6, -0.5, -0.6), new THREE.Vector3(W + gw, WANDHOEHE, T + gw));
}

export { schirmTisch, pflanzentrog };

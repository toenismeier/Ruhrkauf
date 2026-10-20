// Abteilungen der Hartwig-Sporthäuser im Stil von abteilung.js (eigener Boden, Deckenschild, Warenwände bis unter die
// Decke, Inseln, Vorzone, Kasse). Ersetzt beim Import die Sportgruppen in ABT (sportschuhe, sporttextil, outdoor, rad,
// wintersport, teamsport). Inhalte saisonal gemischt (Herbst/Winter: Skiwand, Jacken, Laufschuhe, Hallenfußball).
//
// export SPORT_MARKEN (fiktive Markenshops, Nordline ist Lieferantenmarke aus der Engine), regalSchwer (Schwerlastregal),
//        einkaufswagen, radMontage, sportFigurSitz, SPORT_ARTEN
import { THREE, rng, zw, waehle, dunkler, heller } from './basis.js';
import { figur, puppe, GLAS, kassentresen } from './innen.js';
import * as I from './innen.js';
import { ABT } from './abteilung.js';

const PI = Math.PI;
const { PAL, HOLZ } = I;
const bunt = (r, p) => p[Math.floor(r() * p.length)];
export const SPORT_ARTEN = ['sportschuhe', 'sporttextil', 'outdoor', 'rad', 'wintersport', 'teamsport'];

// ================================================================ Marken (fiktiv)
export const SPORT_MARKEN = [
  { name: 'Nordline', kopf: '#1d2f4f', schrift: '#ffffff', wand: '#e8ecef', boden: { a: '#dfe3e7', b: '#d2d8de', m: 'dielen' }, pal: ['#1d2f4f', '#2f63b5', '#e8e4dc', '#9fb3c8', '#1f1f1f', '#c9483e', '#ffffff'] },
  { name: 'Sprinta', kopf: '#ff6a2b', schrift: '#ffffff', wand: '#2a2d31', boden: { a: '#555b62', b: '#4b5158', m: 'beton' }, pal: ['#ff6a2b', '#1f1f1f', '#ffffff', '#ffcc00', '#20b5c9', '#7a3cd1'] },
  { name: 'Talgrat', kopf: '#5a3a52', schrift: '#f4efe6', wand: '#d8cfc2', boden: { a: '#cfc6b8', b: '#c4bbad', m: 'dielen' }, pal: ['#5a3a52', '#d1a54a', '#3e5a6e', '#8a6a4a', '#b8b2a2', '#f4efe6'] },
  { name: 'Hartwig Active', kopf: '#d23c32', schrift: '#ffffff', wand: '#f4f3ef', boden: { a: '#e9eaeb', b: '#dcdddf', m: 'fliese' }, pal: ['#d23c32', '#1d2f4f', '#ffffff', '#1f1f1f', '#9aa3aa', '#38b86b'] },
  { name: 'Brandung', kopf: '#1f7f86', schrift: '#ffffff', wand: '#e3f0f1', boden: { a: '#e2eef0', b: '#d4e4e7', m: 'karo' }, pal: ['#1f7f86', '#9ad3d8', '#ffffff', '#f2c14e', '#e8562a', '#2b3a55'] },
];
const SCHUH = ['#f1f1ee', '#e8403a', '#1f1f1f', '#1f6fd1', '#ffcc00', '#38b86b', '#ff6a2b', '#7a3cd1', '#20b5c9', '#ffffff'];
const OUT = ['#3f6b3a', '#c25b2a', '#e0a33a', '#2f5f8a', '#6d4c3d', '#8a9a5b', '#d14a3a', '#30343a', '#9a3b2b'];
const WINTER = ['#e8403a', '#1f6fd1', '#ffffff', '#1f1f1f', '#ffcc00', '#20b5c9', '#ff6a2b', '#7a3cd1', '#2b3a55'];
const VEREINE = [['#e8403a', '#ffffff'], ['#1f6fd1', '#ffffff'], ['#ffcc00', '#1f1f1f'], ['#38b86b', '#ffffff'], ['#ffffff', '#1f1f1f'], ['#7a3cd1', '#ffcc00'], ['#1f1f1f', '#e8403a'], ['#20b5c9', '#1f2a3a']];

// ================================================================ Kleine Hilfen
function kopfband(ctx, L, w, text, farbe, schriftF, y = 3.2, h = 0.6) {
  L.box(w, h, 0.1, 0, y, 0.06, farbe);
  if (ctx.scene && text && w > 1.6) I.schrift(L, text, 0, y + h / 2, 0.13, h * 0.58, schriftF);
}
function sitz(ctx, L, lx, lz, ry, rolle = 'kunde') { figur(ctx.S, ...L.P(lx, lz), (ctx.r() * 1e9) | 0, rolle, { y: L.oy, ry: L.rot + ry, pose: 'sitzen' }); }
function steh(ctx, L, lx, lz, ry, rolle = 'verkauf', pose) { figur(ctx.S, ...L.P(lx, lz), (ctx.r() * 1e9) | 0, rolle, { y: L.oy, ry: L.rot + ry, pose }); }
export function sportFigurSitz(S, L, lx, lz, ry, seed) { figur(S, ...L.P(lx, lz), seed, 'kunde', { y: L.oy, ry: L.rot + ry, pose: 'sitzen' }); }
/** Einzelner Schuh (Seitenansicht entlang lokal x). */
function schuh(L, lx, y, lz, f, s = 1, ry = 0) {
  L.box(0.3 * s, 0.035, 0.11 * s, lx, y, lz, '#ffffff', ry);
  L.box(0.27 * s, 0.08 * s, 0.1 * s, lx - 0.015, y + 0.035, lz, f, ry);
  L.box(0.12 * s, 0.06 * s, 0.1 * s, lx - 0.08 * s, y + 0.1 * s, lz, f, ry);
}
function bank(L, lx, lz, w, ry = 0, f = '#2a2d31', polster = '#e8403a') { const P = L.sub(lx, lz, ry); P.box(w, 0.4, 0.5, 0, 0, 0, f); P.box(w, 0.08, 0.5, 0, 0.4, 0, polster); }
function karton(L, lx, y, lz, f, w = 0.34, h = 0.13) { L.box(w, h, 0.22, lx, y, lz, f); L.box(w + 0.01, 0.025, 0.225, lx, y + h - 0.02, lz, dunkler(f, 0.12)); }
function fels(L, lx, lz, s = 1, f = '#8e8a83') { L.geo(new THREE.IcosahedronGeometry(0.55 * s, 0).scale(1.3, 0.7, 1), lx, 0.28 * s, lz, f); }
function pflanze(L, lx, lz, g = 1) { L.box(0.6 * g, 0.55 * g, 0.6 * g, lx, 0, lz, '#ece6dc'); L.kugel(0.48 * g, lx, 1.0 * g, lz, '#5f9a56'); L.kugel(0.32 * g, lx + 0.14, 1.48 * g, lz + 0.08, '#6fa860'); }
function bildschirm(L, lx, y, lz, w, h, f, ry = 0) { const P = L.sub(lx, lz, ry); P.box(w + 0.08, h + 0.08, 0.06, 0, y, 0, '#1f2328'); P.box(w, h, 0.02, 0, y + 0.04, 0.035, f); }
function helm(L, lx, y, lz, f, s = 1) { L.geo(new THREE.SphereGeometry(0.15 * s, 8, 4, 0, PI * 2, 0, PI / 2).scale(1.15, 1, 1), lx, y, lz, f); }

/** Einkaufswagen (Fachmarkt), Griff zeigt nach lokal -x. */
export function einkaufswagen(L, lx, lz, ry = 0, f = '#c9d2d8') {
  const P = L.sub(lx, lz, ry);
  P.box(0.9, 0.5, 0.55, 0.05, 0.42, 0, f);
  P.box(0.84, 0.44, 0.49, 0.05, 0.46, 0, '#6b7177');
  P.box(0.8, 0.04, 0.5, 0, 0.16, 0, f);
  P.box(0.05, 0.75, 0.05, -0.42, 0.16, 0, f);
  P.box(0.06, 0.06, 0.6, -0.5, 0.95, 0, '#d23c32');
  for (const x of [-0.35, 0.4]) for (const z of [-0.22, 0.22]) P.box(0.1, 0.12, 0.05, x, 0.02, z, '#1f2328');
}

/** Schwerlastregal (Palettenregal) entlang lokal x, Rücken bei z = 0, Tiefe t. Ware unten, Kartons und Paletten oben. */
export function regalSchwer(L, w, h, t, ware, r, d, o = {}) {
  const felder = Math.max(1, Math.round(w / 2.7)), fw = w / felder;
  const ebenen = o.ebenen ?? [0, 1.5, 2.9, h - 0.3].filter((y) => y < h - 0.2);
  const pf = o.pfosten ?? '#2f5f8a', bk = o.balken ?? '#e8762a';
  for (let k = 0; k <= felder; k++) {
    const u = -w / 2 + k * fw;
    L.box(0.09, h, 0.09, u, 0, 0.06, pf);
    L.box(0.09, h, 0.09, u, 0, t - 0.06, pf);
    if (d > 0.5 && !o.band) for (let y = 0.6; y < h - 0.4; y += 1.1) L.box(0.05, 0.05, t - 0.1, u, y, t / 2, pf);
  }
  if (o.band) { L.box(w, 0.06, t, 0, 0, t / 2, pf); L.box(w + 0.04, 0.32, 0.08, 0, h - 0.32, t - 0.04, o.band); L.box(w + 0.04, 0.32, 0.08, 0, h - 0.32, 0.04, o.band); }
  for (const y of ebenen.slice(1)) { L.box(w, 0.12, 0.08, 0, y, t - 0.05, bk); L.box(w, 0.12, 0.08, 0, y, 0.05, bk); L.box(w - 0.1, 0.03, t - 0.1, 0, y + 0.1, t / 2, '#c9c4bb'); }
  for (let k = 0; k < felder; k++) {
    const u = -w / 2 + (k + 0.5) * fw;
    ebenen.forEach((y, e) => {
      const y0 = y + (e ? 0.13 : 0.02), hMax = (ebenen[e + 1] ?? h) - y0 - 0.12;
      if (hMax < 0.25) return;
      if (e >= (o.lagerAb ?? 2)) { // Lagerebene: Palette mit Kartons
        L.box(fw - 0.4, 0.14, t - 0.2, u, y0, t / 2, '#c9a26b');
        if (d < 0.45 && (k + e) % 2) return;
        const n = d < 0.5 ? 1 : 2;
        for (let q = 0; q < n; q++) L.box((fw - 0.5) / n - 0.06, Math.min(hMax - 0.15, zw(r, 0.5, 0.95)), t - 0.3, u - (fw - 0.5) / 2 + (q + 0.5) * ((fw - 0.5) / n), y0 + 0.14, t / 2, bunt(r, ['#c9a26b', '#b8925e', '#d6b27c', '#e8e4dc', '#d23c32']));
        return;
      }
      ware(L, u, y0, t / 2, fw - 0.25, Math.min(hMax, 1.3), e, r, d);
    });
  }
}

/** Hängende Teile an Stange entlang lokal x (gruppierte Farbblöcke bei geringer Dichte). */
function stange(L, a, b, y, lz, pal, r, d, hMin = 0.6, hMax = 0.95) { L.box(b - a, 0.04, 0.04, (a + b) / 2, y, lz, HOLZ.chrom); I.kleiderReihe(L, a + 0.05, b - 0.05, y, lz, pal, r, d, { hMin, hMax }); }

// ================================================================ SPORTSCHUHE
const KATEGORIE = [['Laufen', '#e8403a'], ['Fußball', '#38b86b'], ['Basketball', '#ff6a2b'], ['Tennis', '#ffcc00'], ['Training', '#1f6fd1'], ['Freizeit', '#7a3cd1'], ['Hallenschuhe', '#20b5c9']];
function schuhwandBuehne(L, w, r, d, ctx) {
  const [kat, kf] = KATEGORIE[(ctx.zaehler.wand++ + ctx.basisSeed) % KATEGORIE.length];
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#f6f6f4');
  L.box(w - 0.2, 2.5, 0.03, 0, 0.5, 0.11, '#ffffff');
  L.box(0.05, 2.6, 0.04, -w / 2 + 0.12, 0.45, 0.13, kf); L.box(0.05, 2.6, 0.04, w / 2 - 0.12, 0.45, 0.13, kf);
  const reihen = d < 0.5 ? 3 : 5, n = Math.max(1, Math.floor((w - 0.4) / 0.5));
  for (let j = 0; j < reihen; j++) {
    const y = 0.62 + j * (2.3 / reihen), fam = REIHE[(j + ctx.zaehler.wand + ctx.basisSeed) % REIHE.length];
    L.box(w - 0.4, 0.025, 0.3, 0, y, 0.24, '#d9dde0');
    for (let k = 0; k < n; k++) paar(L, -w / 2 + 0.2 + (k + 0.5) * ((w - 0.4) / n), y + 0.025, 0.24, fam[k % fam.length], d);
  }
  // Sockel mit Kartons
  L.box(w - 0.1, 0.45, 0.55, 0, 0, 0.32, '#2a2d31');
  if (d > 0.4) for (let k = 0; k < Math.floor((w - 0.3) / 0.38); k++) karton(L, -w / 2 + 0.35 + k * 0.38, 0.45, 0.32, bunt(r, ['#e8403a', '#1f6fd1', '#f2f2f2', '#ff6a2b', '#1f1f1f']));
  kopfband(ctx, L, w, kat, kf, '#ffffff');
}
const REIHE = [['#f1f1ee', '#e3e5e7'], ['#1f1f1f', '#2f3338'], ['#e8403a', '#f1f1ee'], ['#1f6fd1', '#f1f1ee'], ['#9aa3aa', '#c9d2d8'], ['#f1f1ee', '#ffcc00']];
/** Schuhpaar: zwei Schuhe nebeneinander, leicht versetzt. */
function paar(L, lx, y, lz, f, d = 1) { schuh(L, lx - 0.02, y, lz - 0.065, f); if (d > 0.45) schuh(L, lx + 0.03, y, lz + 0.065, f); }
function kartonWand(L, w, r, d, ctx) {
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#2a2d31');
  const n = Math.max(1, Math.floor((w - 0.3) / 0.38)), m = d < 0.5 ? 5 : 11;
  for (let j = 0; j < m; j++) { const f = ['#e8762a', '#f2f2f2', '#1f6fd1', '#e8762a', '#1f1f1f'][(j + ctx.basisSeed) % 5]; for (let k = 0; k < n; k++) if (d > 0.5 || (j + k) % 2 === 0) karton(L, -w / 2 + 0.3 + k * 0.38 + (j % 2) * 0.05, 0.1 + j * (2.75 / m), 0.2, f, 0.34, 2.75 / m - 0.03); }
  kopfband(ctx, L, w, 'Alle Größen', '#1f1f1f', '#ffcc00');
}
function laufband(L, r, d, ctx, lx = 0, lz = 0) {
  const P = L.sub(lx, lz, 0);
  P.box(2.1, 0.22, 0.85, 0, 0, 0, '#2a2d31');
  P.box(1.8, 0.03, 0.6, -0.05, 0.22, 0, '#1f1f1f');
  for (const s of [-0.38, 0.38]) { P.box(0.05, 1.0, 0.05, 0.9, 0.22, s, '#9aa3aa'); P.box(0.7, 0.05, 0.05, 0.6, 1.0, s, '#9aa3aa'); }
  P.box(0.12, 0.35, 0.75, 0.95, 1.05, 0, '#2a2d31'); P.box(0.03, 0.26, 0.6, 0.89, 1.1, 0, '#4fd3e6');
  figur(ctx.S, ...P.P(-0.05, 0), (ctx.r() * 1e9) | 0, 'kunde', { y: P.oy + 0.25, ry: P.rot + PI / 2, pose: 'gehen' });
}
function laufanalyse(L, r, d, ctx) {
  L.box(3.4, 0.02, 3.0, 0, 0, 0, '#c4553e');
  for (const z of [-0.6, 0.6]) L.box(3.4, 0.01, 0.06, 0, 0.02, z, '#ffffff');
  laufband(L, r, d, ctx, -0.3, -0.6);
  // Analysepult mit Fußdruckbild
  L.box(0.9, 0.95, 0.55, 1.1, 0, 0.75, '#ffffff'); bildschirm(L, 1.1, 0.95, 0.65, 0.6, 0.38, '#2f63b5');
  L.box(0.12, 0.2, 0.02, 1.0, 1.05, 0.7, '#ffcc00'); L.box(0.12, 0.2, 0.02, 1.2, 1.05, 0.7, '#e8403a');
  // Kamera auf Stativ
  L.box(0.04, 0.9, 0.04, -0.4, 0, 0.6, '#1f1f1f'); L.box(0.18, 0.12, 0.12, -0.4, 0.9, 0.6, '#1f1f1f');
  steh(ctx, L, 0.4, 0.9, PI * 0.9);
  if (ctx.scene) { L.box(1.5, 0.42, 0.05, -0.3, 1.9, -1.3, '#e8403a'); I.schrift(L, 'Laufanalyse', -0.3, 2.11, -1.27, 0.26, '#ffffff'); L.box(0.04, 1.9, 0.04, -0.3, 0, -1.32, '#9aa3aa'); }
}
function anprobeInsel(L, r, d, ctx) {
  bank(L, 0, -0.32, 2.6, 0); bank(L, 0, 0.32, 2.6, PI, '#2a2d31', '#1f6fd1');
  L.box(0.04, 0.5, 2.0, 0, 0.48, 0, '#9aa3aa');
  if (r() < 0.8) sitz(ctx, L, -0.6, -0.4, PI);
  if (r() < 0.6) sitz(ctx, L, 0.7, 0.4, 0);
  for (let k = 0; k < 3; k++) karton(L, -1.0 + k * 0.42, 0, -1.0, bunt(r, ['#e8403a', '#1f6fd1', '#f2f2f2', '#ff6a2b']));
  schuh(L, -0.9, 0, -0.8, bunt(r, SCHUH)); schuh(L, 0.9, 0, 0.85, bunt(r, SCHUH));
  const P = L.sub(1.25, -0.9, -0.5); P.box(0.5, 0.05, 0.25, 0, 0, 0, '#2a2d31'); P.geo(new THREE.BoxGeometry(0.46, 0.5, 0.03).rotateX(-0.25), 0, 0.3, 0, '#e3edf1');
  if (r() < 0.5) steh(ctx, L, 1.2, 0.95, PI);
}
function schuhGondel(L, r, d, ctx) {
  I.gondel(L, 0, -0.55, 2.8, 1.45, '#2a2d31', (L2, lx, y, lz, w, r2, d2) => { const n = Math.max(1, Math.floor(w / 0.42)); for (let k = 0; k < n; k++) schuh(L2, lx - w / 2 + (k + 0.5) * (w / n), y, lz, bunt(r2, SCHUH)); }, r, d);
  L.box(2.4, 0.42, 0.55, 0, 0, 0.95, '#e8403a'); L.box(2.4, 0.04, 0.55, 0, 0.42, 0.95, '#ffffff');
  for (let k = 0; k < 4; k++) schuh(L, -0.9 + k * 0.6, 0.46, 0.95, bunt(r, SCHUH));
}
function neuheitenPodest(L, r, d, ctx) {
  for (let k = 0; k < 3; k++) { L.zyl(1.4 - k * 0.42, 1.4 - k * 0.42, 0.22, 0, k * 0.22, -0.1, k % 2 ? '#2a2d31' : '#ffffff', 16); }
  for (let k = 0; k < 8; k++) { const a = (k / 8) * PI * 2, rr = k % 2 ? 1.15 : 0.75; schuh(L, Math.cos(a) * rr, rr > 1 ? 0.22 : 0.44, -0.1 + Math.sin(a) * rr, bunt(r, SCHUH), 1.1, -a); }
  schuh(L, 0, 0.66, -0.1, '#e8403a', 1.6);
  L.box(0.05, 2.2, 0.05, 1.2, 0, -1.25, '#9aa3aa'); L.box(1.1, 0.7, 0.05, 1.2, 1.8, -1.25, '#1f1f1f');
  if (ctx.scene) I.schrift(L, 'NEU', 1.2, 2.15, -1.22, 0.38, '#ffcc00');
}
function schuhVorne(L, r, d) { L.box(2.4, 0.5, 0.8, 0, 0, 0, '#ffffff'); L.box(2.44, 0.05, 0.84, 0, 0.5, 0, '#e8403a'); for (let k = 0; k < 5; k++) schuh(L, -0.95 + k * 0.48, 0.55, (k % 2) * 0.2 - 0.1, bunt(r, SCHUH)); I.preisschild(L, 1.35, 0, '−20 %', 1.5); }

// ================================================================ SPORTBEKLEIDUNG (Markenshops)
function mPal(ctx) { return ctx.marke?.pal ?? PAL.sport; }
function marken(ctx) { return ctx.marke ?? SPORT_MARKEN[3]; }
function textilWand(L, w, r, d, ctx) {
  const m = marken(ctx);
  I.wandKleider(L, w, mPal(ctx), r, d, { panel: m.wand, zwei: true, bild: false });
  L.box(w - 0.1, 0.04, 0.4, 0, 2.75, 0.25, dunkler(m.wand, 0.1)); I.stapel(L, 0, 0.25, w - 0.4, 0.32, 2.79, mPal(ctx), r, d);
  kopfband(ctx, L, w, m.name, m.kopf, m.schrift);
}
function faltWand(L, w, r, d, ctx) {
  const m = marken(ctx);
  I.wandRegal(L, w, 3.1, 6, m.wand, I.prodGefaltet(mPal(ctx)), r, d, 0.45);
  kopfband(ctx, L, w, m.name, m.kopf, m.schrift);
}
function trikotWand(L, w, r, d, ctx, titel = 'Trikots') {
  L.box(w, 3.2, 0.08, 0, 0, 0.04, '#1f1f1f');
  const n = Math.max(1, Math.floor(w / 0.72));
  for (let j = 0; j < (d < 0.5 ? 2 : 3); j++) for (let i = 0; i < n; i++) {
    const [a, b] = VEREINE[(i + j * 3 + ctx.basisSeed) % VEREINE.length];
    const u = -w / 2 + (i + 0.5) * (w / n), y = 0.35 + j * 0.92;
    L.box(0.42, 0.56, 0.04, u, y, 0.1, a); L.box(0.66, 0.15, 0.04, u, y + 0.41, 0.1, a);
    L.box(0.42, 0.06, 0.045, u, y + 0.25, 0.1, b);
    if (d > 0.6) L.box(0.12, 0.16, 0.02, u, y + 0.05, 0.13, b);
  }
  kopfband(ctx, L, w, titel, '#1f1f1f', '#ffcc00');
}
function fitnessInsel(L, r, d, ctx) {
  // Rack mit Yogamatten, Kurzhanteln, Gymnastikbälle
  L.box(1.6, 1.1, 0.5, -0.6, 0, -0.8, '#2a2d31');
  for (let k = 0; k < 6; k++) L.geo(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 8).rotateX(PI / 2), -1.25 + k * 0.26, 1.2, -0.8, bunt(r, ['#7a3cd1', '#20b5c9', '#e8403a', '#38b86b', '#ffcc00']));
  for (let j = 0; j < 2; j++) for (let k = 0; k < 4; k++) L.box(0.28, 0.1, 0.1, -1.1 + k * 0.33, 0.35 + j * 0.35, -0.5, j ? '#1f6fd1' : '#1f1f1f');
  for (let k = 0; k < 3; k++) L.kugel(0.32, 0.6 + k * 0.5, 0.32, -0.6 + (k % 2) * 0.3, bunt(r, ['#20b5c9', '#ff6a2b', '#7a3cd1']), 1);
  L.box(1.9, 0.02, 0.65, 0, 0, 0.8, '#7a3cd1');
  puppe(L, 1.2, 0.6, r, 'sport', mPal(ctx), -0.3);
}
const textilInseln = [
  (L, r, d, ctx) => { I.rundstaender(L, -0.85, -0.7, mPal(ctx), r, d); I.rundstaender(L, 0.85, -0.7, mPal(ctx), r, d); I.warenTisch(L, 0, 0.8, 2.2, 0.8, mPal(ctx), r, d, marken(ctx).wand); },
  (L, r, d, ctx) => { I.staender(L, 0, -0.85, 2.8, mPal(ctx), r, d); puppe(L, -0.9, 0.6, r, 'sport', mPal(ctx), 0.3); puppe(L, 0, 0.75, r, 'sport', mPal(ctx), -0.2); I.warenTisch(L, 1.0, 0.7, 0.9, 0.8, mPal(ctx), r, d, '#2a2d31'); },
  (L, r, d, ctx) => fitnessInsel(L, r, d, ctx),
];

// ================================================================ OUTDOOR
function rucksackWand(L, w, r, d, ctx) {
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#6d4c3d');
  for (let u = -w / 2 + 0.3; u < w / 2; u += 0.6) L.box(0.04, 3.1, 0.02, u, 0, 0.11, '#5d3f32');
  for (let j = 0; j < 4; j++) {
    const y = 0.25 + j * 0.72;
    L.box(w - 0.2, 0.04, 0.06, 0, y + 0.55, 0.12, '#9aa3aa');
    if (d < 0.45 && j % 2) continue;
    const n = Math.max(1, Math.floor((w - 0.3) / 0.52));
    for (let k = 0; k < n; k++) { const u = -w / 2 + 0.3 + (k + 0.5) * ((w - 0.6) / n), f = bunt(r, OUT), h = zw(r, 0.42, 0.58); L.box(0.36, h, 0.22, u, y + 0.55 - h, 0.22, f); L.box(0.28, 0.16, 0.06, u, y + 0.62 - h, 0.35, dunkler(f, 0.08)); if (d > 0.6) L.box(0.05, 0.3, 0.04, u - 0.12, y + 0.55 - h + 0.15, 0.34, '#1f1f1f'); }
  }
  kopfband(ctx, L, w, 'Rucksäcke', '#3f6b3a', '#f4efe6');
}
function jackenWand(L, w, r, d, ctx) {
  I.wandKleider(L, w, OUT, r, d, { panel: '#4e3a2c', zwei: false, bild: false, hMin: 0.9, hMax: 1.1 });
  L.box(w - 0.1, 0.04, 0.4, 0, 2.75, 0.25, '#7b5a40'); I.stapel(L, 0, 0.25, w - 0.4, 0.32, 2.79, OUT, r, d);
  kopfband(ctx, L, w, waehle(ctx.r, ['Funktionsjacken', 'Fleece', 'Regenjacken']), '#c25b2a', '#ffffff');
}
function schlafsackWand(L, w, r, d, ctx) {
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#b98d61');
  const n = Math.max(1, Math.floor((w - 0.2) / 0.5)), m = d < 0.5 ? 3 : 5;
  for (let j = 0; j <= m; j++) L.box(w - 0.1, 0.04, 0.5, 0, 0.1 + j * (2.9 / m), 0.3, '#8b6a4a');
  for (let k = 0; k <= n; k++) L.box(0.04, 2.9, 0.5, -w / 2 + 0.1 + k * ((w - 0.2) / n), 0.1, 0.3, '#8b6a4a');
  for (let j = 0; j < m; j++) for (let k = 0; k < n; k++) {
    const u = -w / 2 + 0.1 + (k + 0.5) * ((w - 0.2) / n), y = 0.15 + j * (2.9 / m), f = bunt(r, OUT);
    L.geo(new THREE.CylinderGeometry(0.17, 0.17, 0.42, 8).rotateX(PI / 2), u, y + 0.18, 0.3, f);
    if (d > 0.6) L.geo(new THREE.CylinderGeometry(0.175, 0.175, 0.04, 8).rotateX(PI / 2), u, y + 0.18, 0.4, '#1f1f1f');
  }
  kopfband(ctx, L, w, 'Schlafsäcke', '#6d4c3d', '#f4efe6');
}
function wanderschuhWand(L, w, r, d, ctx) {
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#e8e0d2');
  const n = Math.max(1, Math.floor((w - 0.4) / 0.46));
  for (let j = 0; j < (d < 0.5 ? 3 : 5); j++) {
    const y = 0.5 + j * 0.52;
    L.box(w - 0.3, 0.05, 0.32, 0, y, 0.22, '#8b6a4a');
    for (let k = 0; k < n; k++) { const u = -w / 2 + 0.2 + (k + 0.5) * ((w - 0.4) / n), f = bunt(r, ['#6d4c3d', '#5a3b22', '#3f4a3a', '#8a5a3c', '#c25b2a', '#30343a']); L.box(0.3, 0.06, 0.12, u, y + 0.05, 0.22, '#3a2a20'); L.box(0.26, 0.18, 0.11, u - 0.01, y + 0.1, 0.22, f); }
  }
  kopfband(ctx, L, w, 'Wanderschuhe', '#5a3b22', '#f4efe6');
}
/** Aufgebautes Kuppelzelt mit Überzelt, Eingang, Stangenbögen und Abspannleinen. */
function kuppelzelt(L, lx, lz, f, s = 1) {
  const g = new THREE.SphereGeometry(1.0, 10, 5, 0, PI * 2, 0, PI / 2); g.scale(1.3 * s, 0.75 * s, 1.0 * s);
  L.geo(g, lx, 0.05, lz, f);
  const ap = new THREE.SphereGeometry(0.55, 8, 4, 0, PI, 0, PI / 2); ap.rotateY(PI / 2); ap.scale(1.0 * s, 1.1 * s, 1.2 * s);
  L.geo(ap, lx, 0.05, lz + 0.85 * s, dunkler(f, 0.06));
  L.box(0.5 * s, 0.75 * s, 0.04, lx, 0.05, lz + 1.2 * s, '#30343a');
  L.box(0.05, 0.05, 1.9 * s, lx, 0.05 + 0.95 * s, lz, heller(f, 0.12)); L.box(2.4 * s, 0.04, 0.05, lx, 0.05 + 0.93 * s, lz, heller(f, 0.12));
  for (const [dx, dz] of [[-1.9, -1.1], [1.9, -1.1], [-1.9, 1.1], [1.9, 1.1]]) {
    const len = Math.hypot(dx * 0.45, 0.9 * s), lg = new THREE.BoxGeometry(0.02, len, 0.02);
    lg.rotateZ(Math.atan2(dx * 0.45, 0.9 * s) * (dx > 0 ? -1 : -1) * -1); lg.rotateX(dz > 0 ? 0.5 : -0.5);
    L.geo(lg, lx + dx * 0.78 * s, 0.05 + 0.45 * s, lz + dz * 0.78 * s, '#f2f1ec');
    L.box(0.05, 0.12, 0.05, lx + dx * s, 0.05, lz + dz * s, '#9aa3aa');
  }
}
/** Kanu-Rumpf als Geometrie (Länge entlang x, liegt auf y = 0, Oberkante 0,38 m). */
function kanuGeo(len = 4.2, breit = 0.8, hoch = 0.38) {
  const sh = new THREE.Shape(); sh.moveTo(-len / 2, 0); sh.quadraticCurveTo(0, breit * 1.0, len / 2, 0); sh.quadraticCurveTo(0, -breit * 1.0, -len / 2, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: hoch, bevelEnabled: false, curveSegments: 6 }); g.rotateX(-PI / 2); return g;
}
function kanu(L, lx, y, lz, f, len = 4.2, ry = 0, kipp = 0) {
  const g = kanuGeo(len); if (kipp) g.rotateX(kipp); if (ry) g.rotateY(ry); L.geo(g, lx, y, lz, f);
  const i = kanuGeo(len * 0.8, 0.62, 0.05); if (kipp) { i.translate(0, 0.34, 0); i.rotateX(kipp); } else i.translate(0, 0.34, 0); if (ry) i.rotateY(ry); L.geo(i, lx, y, lz, '#3a2a20');
}
/** Kanu an der Wand mit Paddeln und Schwimmwesten. */
function kanuWand(L, w, r, d, ctx) {
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#e8e0d2');
  for (let u = -w / 2 + 0.3; u < w / 2; u += 0.6) L.box(0.04, 3.1, 0.02, u, 0, 0.11, '#d8ccb8');
  kanu(L, 0, 1.7, 0.45, bunt(r, ['#d04a3f', '#e0a33a', '#2f6f8f']), Math.min(4.6, w - 0.5), 0, 1.25);
  for (const s of [-0.35, 0.35]) L.box(0.08, 0.5, 0.35, s * w, 2.0, 0.25, '#5a3b22');
  for (let k = 0; k < 3; k++) { L.box(0.06, 1.5, 0.04, -w / 2 + 0.5 + k * 0.3, 0.2, 0.2, '#b98d61'); L.box(0.2, 0.42, 0.05, -w / 2 + 0.5 + k * 0.3, 0.2, 0.22, '#e0a33a'); }
  for (let k = 0; k < Math.max(1, Math.floor((w - 1.8) / 0.55)); k++) { const u = -w / 2 + 1.6 + k * 0.55; L.box(0.42, 0.5, 0.2, u, 0.6, 0.2, bunt(r, ['#e8403a', '#ffcc00', '#ff6a2b'])); L.box(0.04, 0.04, 0.2, u, 1.1, 0.15, '#9aa3aa'); }
  L.box(w - 0.3, 0.4, 0.5, 0, 0, 0.3, '#7b5a40');
  kopfband(ctx, L, w, 'Wassersport', '#2f6f8f', '#ffffff');
}
function zeltInsel(L, r, d, ctx) {
  L.box(3.4, 0.05, 3.0, 0, 0, 0, '#8a9a5b');
  for (let k = 0; k < (d < 0.5 ? 4 : 10); k++) L.box(0.12, 0.03, 0.1, zw(r, -1.6, 1.6), 0.05, zw(r, -1.4, 1.4), '#7a8a4b');
  kuppelzelt(L, -0.35, -0.3, bunt(r, ['#e0a33a', '#c25b2a', '#3f6b3a', '#2f5f8a']), 1.35);
  for (const s of [0.9, 1.45]) { const P = L.sub(s, 0.95, -0.4); P.box(0.5, 0.05, 0.45, 0, 0.42, 0, bunt(r, ['#2f5f8a', '#c25b2a', '#3f6b3a'])); P.box(0.5, 0.5, 0.05, 0, 0.45, -0.22, bunt(r, ['#2f5f8a', '#c25b2a'])); for (const x of [-0.22, 0.22]) P.box(0.03, 0.45, 0.4, x, 0, 0, '#5a636b'); }
  L.zyl(0.28, 0.28, 0.06, -1.2, 0.05, 1.0, '#6b6458', 8); L.kugel(0.12, -1.2, 0.18, 1.0, '#ff8c42'); L.box(0.5, 0.06, 0.06, -1.2, 0.1, 1.0, '#5a3b22', 0.6);
  L.box(0.5, 0.35, 0.35, 0.6, 0.05, -1.25, '#e8403a'); L.box(0.12, 0.25, 0.12, 0.6, 0.4, -1.25, '#f2c14e');
}
function kanuInsel(L, r, d, ctx) {
  L.box(3.4, 0.03, 2.4, 0, 0, 0, '#3c8a9b');
  for (let k = 0; k < 3; k++) L.box(zw(r, 0.6, 1.4), 0.01, 0.06, zw(r, -1.0, 1.0), 0.035, -0.8 + k * 0.6, '#5aa3b2');
  for (const s of [-1.1, 1.1]) { L.box(0.08, 0.7, 0.9, s, 0, -0.3, '#7b5a40'); L.box(0.12, 0.08, 1.0, s, 0.7, -0.3, '#5a3b22'); }
  kanu(L, 0, 0.78, -0.3, '#d04a3f', 3.3);
  for (const s of [-0.6, 0.6]) L.box(0.06, 0.06, 0.8, s, 0.9, -0.3, '#7b5a40');
  L.box(0.06, 0.06, 1.6, -0.4, 0.06, 0.85, '#b98d61', 0.8); L.box(0.3, 0.04, 0.12, -1.0, 0.06, 1.35, '#e0a33a', 0.8);
  puppe(L, 1.2, 0.8, r, 'herren', ['#e8403a', '#ffcc00', '#2f5f8a'], -0.5);
}
function felsPuppen(L, r, d, ctx) {
  fels(L, -0.6, -0.4, 1.4, '#8e8a83'); fels(L, 0.7, -0.6, 1.0, '#9a948a'); fels(L, 0.2, 0.6, 0.8, '#7f7c77');
  puppe(L.hoch(0.6), -0.6, -0.4, r, 'herren', OUT, 0.4); puppe(L.hoch(0.42), 0.7, -0.6, r, 'damen', OUT, -0.3);
  I.rucksackTurm(L, 1.2, 0.9, r, d);
  I.warenTisch(L, -0.8, 1.0, 1.4, 0.7, OUT, r, d, '#7b5a40');
}
function kocherTisch(L, r, d, ctx) {
  I.warenTisch(L, 0, -0.6, 2.6, 1.0, ['#9aa3aa', '#c9d2d8', '#e8403a', '#3f6b3a'], r, d, '#7b5a40');
  for (let k = 0; k < 3; k++) { L.zyl(0.12, 0.12, 0.18, -0.9 + k * 0.9, 0.82, -0.6, '#9aa3aa', 8); L.zyl(0.16, 0.16, 0.1, -0.9 + k * 0.9, 1.0, -0.6, '#5a636b', 8); }
  I.staender(L, 0, 0.8, 2.6, OUT, r, d);
}
const outdoorInseln = [zeltInsel, felsPuppen, kocherTisch, kanuInsel];

// ================================================================ RAD
const RADF = ['#e8403a', '#1f6fd1', '#1f1f1f', '#38b86b', '#ffcc00', '#f2f2f2', '#7a3cd1', '#20b5c9'];
function radWand(L, w, r, d, ctx) {
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#d9dde0');
  L.box(w, 0.08, 0.12, 0, 1.55, 0.1, '#9aa3aa'); L.box(w, 0.08, 0.12, 0, 2.95, 0.1, '#9aa3aa');
  const n = Math.max(1, Math.floor(w / 1.3));
  for (let i = 0; i < n; i++) {
    const u = -w / 2 + (i + 0.5) * (w / n);
    I.fahrrad(L, u, 0.3, r, 0, 1.75);
    if (d > 0.45) I.fahrrad(L, u, 0.3, r, 0, 0.35);
  }
  kopfband(ctx, L, w, waehle(ctx.r, ['Trekking', 'Mountainbike', 'Rennrad', 'E-Bike', 'Stadtrad']), '#2a2d31', '#ffcc00');
}
function helmWand(L, w, r, d, ctx) {
  I.wandRegal(L, w, 3.1, 5, '#2a2d31', (L2, lx, y, lz, ww, r2) => { const n = Math.max(1, Math.floor(ww / 0.4)); for (let k = 0; k < n; k++) helm(L2, lx - ww / 2 + (k + 0.5) * (ww / n), y, lz, bunt(r2, RADF)); }, r, d, 0.4);
  kopfband(ctx, L, w, 'Helme', '#1f1f1f', '#ffffff');
}
function zubehoerWand(L, w, r, d, ctx) {
  I.wandRegal(L, w, 3.1, 6, '#e8e8e6', I.prodPackungen(['#1f1f1f', '#e8403a', '#ffcc00', '#1f6fd1', '#9aa3aa', '#38b86b']), r, d, 0.4);
  if (d > 0.5) for (let k = 0; k < Math.floor(w / 0.7); k++) L.geo(new THREE.TorusGeometry(0.28, 0.04, 4, 12), -w / 2 + 0.4 + k * 0.7, 2.9, 0.08, '#1f1f1f');
  kopfband(ctx, L, w, 'Zubehör', '#2a2d31', '#ffffff');
}
function radReihe(L, r, d, ctx) {
  L.box(2.8, 0.06, 0.12, 0, 0, -1.25, '#9aa3aa'); L.box(2.8, 0.06, 0.12, 0, 0, 1.25, '#9aa3aa');
  for (let i = 0; i < 4; i++) I.fahrrad(L, 0, -1.2 + i * 0.8, r, 0);
  I.preisschild(L, 1.55, 0, waehle(r, ['ab 499 €', '−15 %', '799 €']), 1.4);
}
function eBikePodest(L, r, d, ctx) {
  L.box(3.0, 0.22, 2.0, 0, 0, -0.3, '#1f1f1f'); L.box(3.04, 0.03, 2.04, 0, 0.22, -0.3, '#20b5c9');
  I.fahrrad(L, -0.6, -0.6, r, 0.3, 0.22); I.fahrrad(L, 0.7, 0.1, r, -0.2, 0.22);
  L.box(0.3, 0.35, 0.15, 1.1, 0.22, -1.0, '#2a2d31');
  if (ctx.scene) { L.box(1.3, 0.45, 0.05, -0.8, 1.6, -1.25, '#20b5c9'); I.schrift(L, 'E-Bike', -0.8, 1.83, -1.22, 0.28, '#ffffff'); L.box(0.04, 1.6, 0.04, -0.8, 0, -1.27, '#9aa3aa'); }
  steh(ctx, L, 0.3, 1.1, PI);
}
/** Montageständer mit eingespanntem Rad. */
export function radMontage(L, lx, lz, r) { L.box(0.6, 0.04, 0.6, lx, 0, lz, '#2a2d31'); L.box(0.06, 1.3, 0.06, lx, 0, lz, '#e8403a'); L.box(0.5, 0.06, 0.06, lx + 0.2, 1.3, lz, '#e8403a'); I.fahrrad(L, lx + 0.1, lz + 0.25, r, 0, 0.55); }
function radWerkstatt(L, w, r, d, ctx) {
  L.box(w, 0.02, 2.4, 0, 0, 1.2, '#7c838a');
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#c9d2d8');
  L.box(w - 0.4, 1.2, 0.04, 0, 1.3, 0.11, '#e6e8ea'); // Lochwand
  if (d > 0.4) for (let k = 0; k < Math.floor((w - 0.6) / 0.25); k++) L.box(0.05, zw(r, 0.2, 0.45), 0.04, -w / 2 + 0.45 + k * 0.25, 1.6 + (k % 3) * 0.3, 0.14, bunt(r, ['#e8403a', '#1f1f1f', '#9aa3aa', '#1f6fd1']));
  L.box(w - 0.4, 0.9, 0.7, 0, 0, 0.45, '#5a636b'); L.box(w - 0.3, 0.06, 0.75, 0, 0.9, 0.45, '#b98d61');
  for (let k = 0; k < Math.min(3, Math.floor(w / 1.6)); k++) radMontage(L, -w / 2 + 1.0 + k * 1.6, 1.7, r);
  for (let k = 0; k < 4; k++) L.geo(new THREE.TorusGeometry(0.32, 0.04, 4, 12), -w / 2 + 0.5 + k * 0.7, 2.55, 0.12, '#1f1f1f');
  steh(ctx, L, -w / 4, 1.2, PI, 'handwerker');
  // Glas-Abtrennung vorne mit Schild
  L.box(w, 1.1, 0.04, 0, 0, 2.4, GLAS); L.box(w, 0.06, 0.08, 0, 1.1, 2.4, '#9aa3aa');
  kopfband(ctx, L, w, 'Radservice', '#e8403a', '#ffffff');
}
const radInseln = [radReihe, eBikePodest, (L, r, d, ctx) => { I.gondel(L, 0, -0.6, 2.8, 1.4, '#2a2d31', I.prodPackungen(['#1f1f1f', '#e8403a', '#ffcc00', '#1f6fd1', '#9aa3aa']), r, d); for (let k = 0; k < 3; k++) helm(L, -0.9 + k * 0.9, 0, 0.8, bunt(r, RADF), 1.3); L.box(2.4, 0.4, 0.5, 0, 0, 0.8, '#1f6fd1'); for (let k = 0; k < 4; k++) helm(L, -0.9 + k * 0.6, 0.4, 0.8, bunt(r, RADF)); }];

// ================================================================ WINTERSPORT
function skiWand(L, w, r, d, ctx) {
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#eef3f6');
  L.box(w, 0.06, 0.26, 0, 1.95, 0.15, '#9aa3aa'); L.box(w, 0.05, 0.26, 0, 0.12, 0.15, '#9aa3aa');
  const n = Math.max(1, Math.floor((w - 0.3) / (d < 0.5 ? 0.36 : 0.2)));
  for (let i = 0; i < n; i++) { const u = -w / 2 + 0.25 + i * ((w - 0.5) / n), f = bunt(r, WINTER); L.box(0.1, 1.85, 0.03, u, 0.17, 0.14, f); if (d > 0.6) L.box(0.1, 0.25, 0.035, u, 1.0, 0.145, '#1f1f1f'); }
  L.box(w - 0.3, 0.04, 0.35, 0, 2.3, 0.2, '#c9d2d8');
  for (let k = 0; k < Math.floor((w - 0.4) / 0.36); k++) helm(L, -w / 2 + 0.38 + k * 0.36, 2.34, 0.2, bunt(r, WINTER));
  kopfband(ctx, L, w, 'Ski', '#20b5c9', '#ffffff');
}
function boardWand(L, w, r, d, ctx) {
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#1f2a3a');
  const n = Math.max(1, Math.floor((w - 0.3) / 0.38));
  for (let i = 0; i < n; i++) { const u = -w / 2 + 0.3 + i * ((w - 0.5) / n); L.geo(new THREE.BoxGeometry(0.28, 1.5, 0.03), u, 1.1, 0.14, bunt(r, WINTER)); if (d > 0.6) L.box(0.2, 0.12, 0.05, u, 1.35, 0.16, '#1f1f1f'); }
  L.box(w - 0.2, 0.04, 0.38, 0, 2.55, 0.22, '#2b3a55');
  for (let k = 0; k < Math.floor((w - 0.4) / 0.34); k++) { L.box(0.22, 0.09, 0.08, -w / 2 + 0.36 + k * 0.34, 2.6, 0.25, '#1f1f1f'); L.box(0.18, 0.06, 0.02, -w / 2 + 0.36 + k * 0.34, 2.62, 0.3, bunt(r, ['#ffcc00', '#ff6a2b', '#20b5c9', '#7a3cd1'])); }
  kopfband(ctx, L, w, 'Snowboard', '#7a3cd1', '#ffffff');
}
function skijackenWand(L, w, r, d, ctx) {
  I.wandKleider(L, w, WINTER, r, d, { panel: '#dfe9f0', zwei: true, bild: false });
  L.box(w - 0.1, 0.04, 0.4, 0, 2.75, 0.25, '#c9d2d8');
  for (let k = 0; k < Math.floor((w - 0.4) / 0.36); k++) L.box(0.26, 0.12, 0.2, -w / 2 + 0.38 + k * 0.36, 2.79, 0.25, bunt(r, WINTER));
  kopfband(ctx, L, w, 'Skibekleidung', '#1f6fd1', '#ffffff');
}
function skischuhAnprobe(L, r, d, ctx) {
  L.box(3.2, 0.02, 2.6, 0, 0, 0, '#2b3a55');
  for (let k = 0; k < 3; k++) {
    const P = L.sub(-1.05 + k * 1.05, -0.65, 0);
    P.box(0.8, 0.5, 0.65, 0, 0, 0, '#1f1f1f'); P.box(0.8, 0.08, 0.65, 0, 0.5, 0, '#20b5c9'); P.box(0.8, 0.8, 0.12, 0, 0.5, -0.27, '#1f1f1f');
    P.box(0.4, 0.22, 0.32, 0, 0, 0.75, '#9aa3aa');
    if (r() < 0.7) sitz(ctx, P, 0, 0.05, 0);
  }
  for (let k = 0; k < 4; k++) { const f = bunt(r, WINTER); L.box(0.18, 0.32, 0.28, -1.2 + k * 0.25, 0.02, 0.85, f); L.box(0.18, 0.08, 0.32, -1.2 + k * 0.25, 0.02, 0.87, '#1f1f1f'); }
  steh(ctx, L, 0.6, 0.6, PI, 'verkauf', 'schauen');
  L.box(0.8, 0.9, 0.5, 1.2, 0, 0.9, '#ffffff'); bildschirm(L, 1.2, 0.95, 0.85, 0.5, 0.3, '#20b5c9');
}
function skiService(L, w, r, d, ctx) {
  L.box(w, 0.02, 2.2, 0, 0, 1.1, '#9aa3aa');
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#e8eef2');
  // Schleifmaschine
  L.box(1.6, 1.1, 0.9, -w / 2 + 1.0, 0, 0.6, '#2f6f8f'); L.box(1.6, 0.25, 0.9, -w / 2 + 1.0, 1.1, 0.6, '#c9d2d8'); L.geo(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 10).rotateX(PI / 2), -w / 2 + 1.0, 1.3, 0.6, '#5a636b');
  // Werkbank mit Ski im Schraubstock
  L.box(1.8, 0.9, 0.6, 0.6, 0, 0.45, '#5a636b'); L.box(1.9, 0.06, 0.65, 0.6, 0.9, 0.45, '#b98d61');
  L.box(1.7, 0.04, 0.1, 0.6, 1.05, 0.45, bunt(r, WINTER)); L.box(0.1, 0.12, 0.2, 0.0, 0.96, 0.45, '#1f1f1f'); L.box(0.1, 0.12, 0.2, 1.2, 0.96, 0.45, '#1f1f1f');
  L.box(0.3, 0.2, 0.2, 0.9, 0.96, 0.25, '#ffcc00');
  // fertige Ski im Ständer
  for (let k = 0; k < Math.floor((w - 3.6) / 0.25); k++) L.box(0.1, 1.7, 0.03, w / 2 - 0.4 - k * 0.25, 0.05, 0.18, bunt(r, WINTER));
  steh(ctx, L, 0.4, 1.2, PI, 'handwerker');
  L.box(w, 1.1, 0.04, 0, 0, 2.2, GLAS); L.box(w, 0.06, 0.08, 0, 1.1, 2.2, '#9aa3aa');
  kopfband(ctx, L, w, 'Skiservice', '#20b5c9', '#ffffff');
}
const winterInseln = [
  skischuhAnprobe,
  (L, r, d, ctx) => { I.skistaender(L, 0, -0.7, r, d); I.rundstaender(L, 0.9, 0.9, WINTER, r, d); L.box(0.8, 0.5, 0.6, -0.9, 0, 1.0, '#e8f0f5'); I.helme(L, -0.9, 0.5, 1.0, r); },
  (L, r, d, ctx) => { I.snowboardInsel(L, r, d); puppe(L, 1.1, 1.0, r, 'sport', WINTER); },
  (L, r, d, ctx) => { I.puppenPodest(L, 0, -0.6, 'sport', WINTER, r, 2.8); I.staender(L, 0, 0.85, 2.6, WINTER, r, d); },
];

// ================================================================ TEAMSPORT
function ballWand(L, w, r, d, ctx) {
  L.box(w, 3.2, 0.1, 0, 0, 0.05, '#2a2d31');
  const n = Math.max(1, Math.floor((w - 0.2) / 0.46)), m = d < 0.5 ? 3 : 5;
  for (let j = 0; j <= m; j++) L.box(w - 0.1, 0.04, 0.45, 0, 0.3 + j * (2.6 / m), 0.27, '#4b5560');
  for (let j = 0; j < m; j++) for (let k = 0; k < n; k++) L.geo(new THREE.IcosahedronGeometry(0.17, 1), -w / 2 + 0.1 + (k + 0.5) * ((w - 0.2) / n), 0.3 + j * (2.6 / m) + 0.21, 0.27, bunt(r, ['#ffffff', '#ffffff', '#ff6a2b', '#ffcc00', '#e8403a', '#1f6fd1']));
  kopfband(ctx, L, w, 'Bälle', '#38b86b', '#ffffff');
}
function stollenWand(L, w, r, d, ctx) {
  I.wandRegal(L, w, 3.1, 6, '#1f1f1f', (L2, lx, y, lz, ww, r2) => { const n = Math.max(1, Math.floor(ww / 0.42)); for (let k = 0; k < n; k++) schuh(L2, lx - ww / 2 + (k + 0.5) * (ww / n), y, lz, bunt(r2, ['#ffcc00', '#e8403a', '#ffffff', '#38b86b', '#20b5c9', '#ff6a2b'])); }, r, d, 0.4);
  kopfband(ctx, L, w, 'Fußballschuhe', '#1f1f1f', '#38b86b');
}
/** Jugendtor 3,2 × 1,9 m mit Netz (Gitterlinien). */
function torGross(L, lx, lz, w = 3.2, h = 1.9) {
  L.box(w, 0.1, 0.1, lx, h, lz, '#ffffff'); for (const s of [-1, 1]) L.box(0.1, h, 0.1, lx + s * (w / 2 - 0.05), 0, lz, '#ffffff');
  L.box(w, 0.04, 0.04, lx, 0, lz - 0.9, '#dfe5e8'); for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(0.04, 0.04, Math.hypot(0.9, h)); g.rotateX(-Math.atan2(h, 0.9) + PI / 2); L.geo(g, lx + s * (w / 2 - 0.05), h / 2, lz - 0.45, '#dfe5e8'); }
  for (let q = 1; q < 8; q++) { const u = lx - w / 2 + q * (w / 8); const g = new THREE.BoxGeometry(0.015, Math.hypot(0.9, h), 0.015); g.rotateX(Math.atan2(0.9, h)); L.geo(g, u, h / 2, lz - 0.45, '#eef2f4'); }
  for (let q = 1; q < 5; q++) L.box(w - 0.1, 0.015, 0.015, lx, h * q / 5, lz - 0.9 * (1 - q / 5), '#eef2f4');
}
function torInsel(L, r, d, ctx) {
  L.box(3.4, 0.015, 0.06, 0, 0.06, 0.6, '#ffffff');
  L.geo(new THREE.TorusGeometry(0.8, 0.03, 3, 18, PI).rotateX(-PI / 2), 0, 0.07, 0.6, '#ffffff');
  torGross(L, 0, -1.0);
  L.geo(new THREE.IcosahedronGeometry(0.15, 1), 0.3, 0.15, 0.2, '#ffffff');
  for (let k = 0; k < 4; k++) L.geo(new THREE.ConeGeometry(0.1, 0.25, 6).translate(0, 0.125, 0), -1.3 + k * 0.5, 0.06, 1.25, '#ff6a2b');
  if (r() < 0.7) figur(ctx.S, ...L.P(-0.5, 0.4), (r() * 1e9) | 0, 'kind', { y: L.oy, ry: L.rot + PI, pose: 'gehen' });
}
function beflockung(L, r, d, ctx) {
  L.box(2.4, 0.9, 0.8, 0, 0, -0.6, '#ffffff'); L.box(2.5, 0.05, 0.85, 0, 0.9, -0.6, '#38b86b');
  L.box(0.8, 0.12, 0.6, -0.5, 0.95, -0.6, '#5a636b'); L.box(0.8, 0.1, 0.6, -0.5, 1.25, -0.7, '#2a2d31', 0); L.box(0.08, 0.35, 0.08, -0.9, 0.95, -0.85, '#2a2d31');
  L.box(0.5, 0.02, 0.6, 0.5, 0.95, -0.6, '#e8403a'); L.box(0.1, 0.18, 0.02, 0.5, 0.97, -0.5, '#ffffff');
  for (let k = 0; k < 4; k++) L.box(0.12, 0.18, 0.02, -1.0 + k * 0.18, 1.0, -0.25, '#1f1f1f');
  steh(ctx, L, 0, -1.3, 0);
  if (r() < 0.8) steh(ctx, L, 0.2, 0.3, PI, 'kunde', 'schauen');
  I.puppenPodest(L, 0, 1.0, 'sport', ['#e8403a', '#ffffff', '#1f6fd1', '#ffcc00'], r, 2.4);
  if (ctx.scene) { L.box(1.6, 0.42, 0.05, 0, 2.0, -1.1, '#38b86b'); I.schrift(L, 'Beflockung', 0, 2.21, -1.07, 0.26, '#ffffff'); for (const s of [-0.7, 0.7]) L.box(0.04, 1.1, 0.04, s, 0.9, -1.1, '#9aa3aa'); }
}
const teamInseln = [
  torInsel,
  (L, r, d, ctx) => { I.ballkorb(L, -0.9, -0.7, r, d); I.ballkorb(L, 0.2, -0.9, r, d); I.puppenPodest(L, 0, 0.7, 'sport', VEREINE.map((v) => v[0]), r, 2.6); },
  (L, r, d, ctx) => { I.staender(L, 0, -0.8, 2.6, VEREINE.map((v) => v[0]), r, d); for (let k = 0; k < 5; k++) L.geo(new THREE.ConeGeometry(0.1, 0.25, 6).translate(0, 0.125, 0), -1.0 + k * 0.5, 0, 0.5, '#ffcc00'); I.ballkorb(L, 1.0, 0.9, r, d); },
];

// ================================================================ Definitionen
const KANTE = '#2a2d31';
Object.assign(ABT, {
  sportschuhe: {
    name: 'Sportschuhe', pal: SCHUH, niedrig: 'schuhe', korpus: '#2a2d31', schild: { farbe: '#e8403a', schrift: '#ffffff' },
    boden: { a: '#3d4248', b: '#363a40', c: '#e8403a', m: 'streifen' }, kante: '#e8403a',
    wand: [schuhwandBuehne, schuhwandBuehne, kartonWand], wl: 3.2, insel: [anprobeInsel, schuhGondel, neuheitenPodest, anprobeInsel], wahl: (i, j) => (i * 2 + j) % 4,
    slots: [{ wo: 'vl', fn: laufanalyse, min: 5 }], vorne: schuhVorne, vorneTakt: 6.5, iw: 3.2, it: 3.0,
  },
  sporttextil: {
    name: 'Sportbekleidung', pal: PAL.sport, korpus: '#e8ecef', schild: { farbe: '#1f6fd1', schrift: '#ffffff' },
    boden: { a: '#dfe2e6', b: '#d2d6db', m: 'fliese' },
    wand: [textilWand, faltWand, textilWand, (L, w, r, d, ctx) => trikotWand(L, w, r, d, ctx, 'Nationaltrikots')], wl: 3.0, insel: textilInseln, wahl: (i, j) => (i + j * 2) % 3,
    vorne: (L, r, d, ctx) => I.puppenPodest(L, 0, 0, 'sport', mPal(ctx), r, 2.6), vorneTakt: 0,
    wandExtra: [{ len: 3.6, fn: (L, w, r, d, ctx) => I.umkleiden(L, w, 3, r, marken(ctx).kopf), seite: 'nx', min: 6 }],
    teilen(zellen, o, teile, ncol) {
      const s = o.basisSeed ?? 0;
      if (ncol < 2) return [{ art: 'sporttextil', marke: SPORT_MARKEN[s % SPORT_MARKEN.length], zellen }];
      const k = Math.min(SPORT_MARKEN.length, Math.max(2, Math.ceil(ncol / 2.4)));
      const an = []; for (let q = 0; q < k; q++) an.push({ art: 'sporttextil', marke: SPORT_MARKEN[(s + q) % SPORT_MARKEN.length], w: 1 });
      return teile(zellen, an);
    },
  },
  outdoor: {
    name: 'Outdoor', pal: OUT, korpus: '#7b5a40', schild: { farbe: '#3f6b3a', schrift: '#f4efe6' },
    boden: { a: '#b79e78', b: '#ab926d', m: 'dielen' }, kante: '#5a3b2a',
    wand: [rucksackWand, kanuWand, jackenWand, schlafsackWand, jackenWand, wanderschuhWand], wl: 3.0, insel: outdoorInseln, wahl: (i, j) => (i + j) % 4, iw: 3.4, it: 3.2,
    vorne: (L, r, d) => { I.rucksackTurm(L, -0.8, 0, r, d); fels(L, 0.6, 0, 0.8); puppe(L.hoch(0.4), 0.6, 0, r, 'herren', OUT, 0.3); }, vorneTakt: 7,
  },
  rad: {
    name: 'Fahrrad', pal: RADF, korpus: '#2a2d31', schild: { farbe: '#2a2d31', schrift: '#ffcc00' },
    boden: { a: '#a3a9ae', b: '#989ea4', m: 'beton' }, kante: '#ffcc00',
    wand: [radWand, helmWand, radWand, zubehoerWand], wl: 3.2, insel: radInseln, wahl: (i, j) => (i + j) % 3, iw: 3.2, it: 3.0,
    wandExtra: [{ len: 5.0, fn: radWerkstatt, seite: 'nx', min: 4 }],
    vorne: (L, r) => { I.fahrrad(L, -0.6, 0, r, 0); I.fahrrad(L, 0.6, 0.1, r, 0); }, vorneTakt: 6,
  },
  wintersport: {
    name: 'Wintersport', pal: WINTER, korpus: '#e8f0f5', schild: { farbe: '#20b5c9', schrift: '#ffffff' },
    boden: { a: '#e6eef3', b: '#d6e2ea', m: 'karo' }, kante: '#20b5c9',
    wand: [skiWand, skijackenWand, boardWand, skiWand], wl: 3.0, insel: winterInseln, wahl: (i, j) => (i + j * 3) % 4, iw: 3.4, it: 3.0,
    wandExtra: [{ len: 4.8, fn: skiService, seite: 'nx', min: 5 }],
    vorne: (L, r, d) => { I.puppenPodest(L, 0, 0, 'sport', WINTER, r, 2.6); }, vorneTakt: 0,
  },
  teamsport: {
    name: 'Teamsport', pal: VEREINE.map((v) => v[0]), korpus: '#1f1f1f', schild: { farbe: '#38b86b', schrift: '#ffffff' },
    boden: { a: '#5fa152', b: '#579849', m: 'rasen' }, kante: '#ffffff',
    wand: [(L, w, r, d, ctx) => trikotWand(L, w, r, d, ctx, 'Vereinstrikots'), ballWand, stollenWand], wl: 3.0, insel: teamInseln, wahl: (i, j) => (i + j) % 3,
    slots: [{ wo: 'hl', fn: beflockung, min: 4 }],
    vorne: (L, r, d) => { I.ballkorb(L, -0.7, 0, r, d); I.ballkorb(L, 0.5, 0, r, d); }, vorneTakt: 6,
  },
});
for (const g of SPORT_ARTEN) ABT[g].kante = ABT[g].kante ?? KANTE;
export const SPORT_NAMEN = Object.fromEntries(SPORT_ARTEN.map((g) => [g, ABT[g].name]));
export const SPORT_BOEDEN = Object.freeze(Object.fromEntries(SPORT_ARTEN.map(g=>[g,ABT[g].boden.a])));
export const SPORT_SCHILDER = Object.freeze(Object.fromEntries(SPORT_ARTEN.map(g=>[g,ABT[g].schild.farbe])));
export { kanu, radWerkstatt, skiService, kuppelzelt, torGross, paar, schuh, laufband, helm, fels, pflanze, bank, karton, bildschirm, VEREINE, WINTER, OUT, SCHUH, RADF };

/** Die A-Haus-Erlebnisfläche benutzt dieselben Geräte wie die regulären Sportabteilungen. */
export function sportErlebnis(L, r, d, art, ctx) {
  if (art === 'laufanalyse') laufanalyse(L, r, d, ctx);
  else fitnessInsel(L, r, d, ctx);
}

/** Schlichte Aktionsware statt Markeninszenierung: Wühltisch, Gitterkörbe und Schuhpaletten.
 * Ein 5 × 5-m-Rasterfeld. index variiert die Möblierung ohne zusätzlichen Zufallsgenerator.
 */
export function sportAbverkauf(L, r, d, index = 0) {
  const f = '#c9c7c1', metall = '#697179', holz = '#b99469';
  L.box(4.8, 0.03, 4.8, 0, 0, 0, '#e5e2dc');
  if (index % 3 === 0) {
    // Gitterkörbe: niedrige Umrandung, sichtbar unsortierte Ware.
    for (const x of [-1.05, 1.05]) {
      L.box(1.75, 0.13, 1.25, x, 0.28, -0.4, '#e6e8e9');
      for (const z of [-1.05, 0.25]) L.box(1.75, 0.45, 0.045, x, 0.25, z, metall);
      for (const dx of [-0.88, 0.88]) L.box(0.045, 0.45, 1.3, x + dx, 0.25, -0.4, metall);
      for (let j = 0; j < (d < 0.5 ? 3 : 6); j++) L.box(0.35, 0.18, 0.32, x + zw(r, -0.55, 0.55), 0.35, -0.4 + zw(r, -0.4, 0.4), j % 3 === 0 ? '#d23c32' : f);
    }
  } else {
    // Zwei Wühltische mit unregelmäßig gestapelten Schuh- und Textilkartons.
    for (const z of [-1.0, 1.0]) {
      L.box(2.95, 0.15, 1.2, 0, 0.73, z, f);
      for (const x of [-1.18, 1.18]) L.box(0.10, 0.73, 0.10, x, 0.0, z, metall);
      for (let i = 0; i < (d < 0.5 ? 4 : 8); i++) {
        const x = -1.2 + (i % 4) * 0.75, zz = z - 0.4 + Math.floor(i / 4) * 0.55;
        karton(L, x, 0.89, zz, i % 3 ? '#e8e7e2' : '#caab80', 0.48, 0.2);
      }
    }
  }
  // Palettenstapel mit den Kartons der vorigen Saison an der Rückkante.
  if (index % 2 === 0) {
    L.box(1.25, 0.14, 0.85, 1.6, 0.02, 1.75, holz);
    for (let k = 0; k < 4; k++) karton(L, 1.15 + (k % 2) * 0.6, 0.16 + Math.floor(k / 2) * 0.26, 1.7, k % 2 ? '#ffffff' : '#c7bba7', 0.58, 0.22);
  }
}

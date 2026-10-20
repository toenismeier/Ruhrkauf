// FUNDUS – eigenständige Off-Price-Marke, nicht Hartwig Outlet.
// Drei Bauformen; der Ladenbau-Workstream ersetzt später den bewusst einfachen Innenraum.
import { THREE, rng, waehle, zw, LOD } from './basis.js';
import { Seite, seitenVon, plakat, passend, parkreihe, mensch, puppe, clamp, technik, KLEID } from './sporthelfer.js';
import { zustandNormal, zustandFlags, zustandsDekor, merke } from './zustaende.js';
import { lokal as innenLokal, puppe as innenPuppe, vorbereiten as innenVorbereiten } from './innen.js';

export const NAME_OUTLET = 'FUNDUS';
export const FARBE_OUTLET = '#8c1d40';
export const FAMILIEN_OUTLET = { 1: 'Retail-Park-Box', 2: 'Zweigeschossiger Fachmarkt', 3: 'Innenstadt-Geschäftshaus' };
const HELL = '#f2f0eb', WAND = '#d7d9da', GLAS = '#cfe8f1', FUGE = '#c1c5c5';
const WAREN = ['#263b53', '#c67e73', '#e0c7a3', '#748d74', '#d8dce0', '#b88b56', '#a7a0ba'];

export function familieOutlet(haus) {
  if (haus.lage === 'b') return 3;
  return Number.parseInt(String(haus.id).replace(/\D/g, ''), 10) % 2 ? 1 : 2;
}

export function masseOutlet(haus) {
  const familie = familieOutlet(haus);
  const n = familie === 3 ? clamp((haus.etagen ?? [0, 1]).filter((e) => e >= 0).length, 2, 3) : familie === 2 ? 2 : 1;
  const A = clamp(haus.grundflaecheQm ?? 1700, 650, 3100);
  const bw = Math.round(clamp(Math.sqrt(A * 1.55), 26, 68) / 2) * 2;
  const bd = Math.round(clamp(A / bw, 19, 55) / 2) * 2;
  const park = familie === 3 ? 0 : 18;
  return { w: bw, d: bd + park, bw, bd, n, H: (familie === 1 ? 7.2 : 5.2 + (n - 1) * 4.25), familie, park };
}

function text(scene, s, inhalt, u, y, t, breite, hoehe, farbe = '#ffffff', bg = null) {
  if (breite < 1) return;
  plakat(scene, s, inhalt, u, y, t, passend(inhalt, breite, hoehe), farbe, bg);
}
function marke(scene, s, H, band) {
  const y = Math.max(3.4, H - (H > 9 ? 3.1 : 2.6));
  s.q(0, s.L, y, y + 1.9, 0.22, 0.55, FARBE_OUTLET);
  text(scene, s, NAME_OUTLET, s.L * 0.53, y + 1.07, 0.61, s.L - 4, 1.38);
  if (band) {
    s.q(0.4, s.L - 0.4, y - 0.77, y - 0.05, 0.26, 0.50, '#f9f5ef');
    text(scene, s, 'Marken. Bis zu 60 % unter dem empfohlenen Preis.', s.L / 2, y - 0.39, 0.54, s.L - 2.5, 0.46, FARBE_OUTLET);
  }
  return { u0: 0.4, u1: s.L - 0.4, y0: y - 0.78, y1: y + 1.94, art: 'logo' };
}

// Lange Bekleidungsreihen statt Wühltischen; durch die beiden großen Glasfronten lesbar.
function wareHinterGlas(S, scene, x, z, w, d, r, n) {
  const breite = Math.min(28, w - 7);
  for (let reihe = 0; reihe < (n > 1 ? 3 : 4); reihe++) {
    const z0 = z + d - 4.5 - reihe * 2.5;
    if (z0 < z + 2) break;
    const links = x + 3;
    const rw = breite;
    S.box(rw, 0.09, 0.10, links + rw / 2, 2.55, z0, '#8d979d');
    for (let u = links; u < links + rw; u += 1.15) {
      if (Math.abs(u - (x + w * 0.52)) < 2) continue; // breiter Hauptgang
      S.box(0.6, 0.74, 0.29, u, 1.95, z0, waehle(r, WAREN));
    }
    for (const u of [links, links + rw]) S.box(0.08, 2.25, 0.08, u, 1.4, z0, '#889299');
    const schild = ['XS', 'S', 'M', 'L', 'XL'][reihe % 5];
    const schildSeite = new Seite(S, links, z0 - 0.05, rw, 0.12, '+z');
    for (const pos of [rw * 0.25, rw * 0.75]) {
      schildSeite.q(pos - 0.7, pos + 0.7, 3.13, 3.67, 0.1, 0.22, '#f5f5f2');
      text(scene, schildSeite, schild, pos, 3.42, 0.27, 1.3, 0.48, FARBE_OUTLET);
    }
  }
  // Schuhe nach Größen, Home-Gondeln, zentrale Kassenzeile und Impulsware.
  for (let k = 0; k < 5; k++) {
    const xx = x + w - 4, zz = z + 5 + 2.2 * k;
    S.box(3.4, 0.07, 1.4, xx, 0.8 + k * 0.22, zz, '#e5e1d9');
    for (let b = 0; b < 3; b++) S.box(0.8, 0.44, 0.55, xx - 1 + b, 1.1 + k * 0.22, zz, waehle(r, WAREN));
  }
  for (let k = 0; k < 3; k++) {
    const xx = x + 3 + k * 2.1, zz = z + 5;
    S.box(1.65, 1.05, 2.5, xx, 0.85, zz, '#e2dfd6');
    for (let j = 0; j < 3; j++) S.box(0.48, 0.38, 0.53, xx + (j - 1) * 0.52, 1.60, zz, waehle(r, WAREN));
  }
  S.box(7, 1.1, 1.45, x + w * 0.53, 0.85, z + d - 6, '#e2e1de');
  for (let k = 0; k < 4; k++) S.box(0.8, 0.32, 0.5, x + w * 0.53 - 2.4 + k * 1.6, 1.55, z + d - 6, '#3d4246');
  for (let k = 0; k < 4; k++) S.box(0.05, 0.95, 0.05, x + w * 0.53 - 3 + k * 1.8, 0.78, z + d - 2.6, '#8c1d40');
}

// Innen-Platzhalter: Rasterbeleuchtung, klare Hauptachse, Größenhinweise und hohe Warendichte.
export function innenOutlet(S, scene, haus, opt = {}) {
  const { w, bd, H } = masseOutlet(haus);
  const x = opt.x ?? 0, z = opt.z ?? 0, r = rng(String(haus.id) + '/innen');
  S.quader(x, 0, z, x + w, 0.30, z + bd, '#e7e6e1');
  for (let ix = x + 2.5; ix < x + w - 2; ix += 5) for (let iz = z + 2.5; iz < z + bd - 2; iz += 5)
    S.box(2.5, 0.08, 0.50, ix, H - 0.4, iz, '#fff6dc');
  wareHinterGlas(S, scene, x, z, w, bd, r, 1);
  // Recycelte Innenbau-Primitive: eigene Gondeln und Markenpuppen in den Abteilungszonen.
  const zStart = z + bd * 0.35;
  for (let k = 0; k < 4; k++) {
    const L = innenLokal(S, x + w - 5.5, 0.32, zStart + k * 3.2);
    L.box(2.8, 1.35, 0.9, 0, 0, 0, '#eeece6');
    L.box(3.0, 0.12, 1.1, 0, 1.25, 0, '#bfc2c0');
    for (let j = 0; j < 4; j++) L.box(0.53, 0.42, 0.6, -1 + j * 0.68, 1.38, 0, waehle(r, WAREN));
  }
  for (let k = 0; k < 3; k++) {
    const L = innenLokal(S, x + 7 + k * 4.7, 0.32, z + 4.7);
    innenPuppe(L, 0, 0, r, k === 2 ? 'kind' : k === 1 ? 'herren' : 'damen', WAREN);
  }
  // Mitarbeiter beim Nachräumen und Rollwagen.
  const mx = x + w - 6, mz = z + bd - 8;
  mensch(S, r, mx, 0.34, mz);
  S.box(1.6, 1.05, 1.0, mx + 1.3, 0.85, mz + 0.5, '#8d969d');
  for (let k = 0; k < 3; k++) S.box(1.4, 0.2, 0.9, mx + 1.3, 0.5 + k * 0.4, mz + 0.5, '#e3ddd2');
  return { hoehe: H, w, d: bd };
}

function glasfront(S, scene, s, H, offen, r, oben = false) {
  const y0 = 0.48, y1 = Math.min(4.55, H - 2.45);
  if (offen) {
    s.q(0.55, s.L - 0.55, y0, y1, -0.01, 0.09, GLAS);
    for (let u = 0.8; u < s.L - 0.5; u += 3.2)
      s.q(u, u + 0.09, y0, y1, 0.10, 0.22, '#d9dce0');
    // Schaufensterpuppen vor Kleiderstangen; Schuhe/Taschen/Home, keine Plakatwand.
    for (let u = 4; u < s.L - 3; u += 7.5) {
      if (Math.abs(u - s.L * 0.52) < 4) continue;
      puppe(s, u, 0.7, -0.55, waehle(r, KLEID), waehle(r, KLEID), 0.85);
      s.q(u - 1.6, u + 1.7, 0.55, 1.0, -1.5, -0.9, '#e1ddd4');
      s.q(u - 1.5, u + 1.5, 1.0, 1.2, -1.5, -0.9, '#b7a6a0');
    }
  } else s.q(0.55, s.L - 0.55, y0, y1, -0.01, 0.10, '#c6c9ca');
  const tuer = s.L * 0.52;
  s.q(tuer - 1.9, tuer + 1.9, 0.40, y1, 0.10, 0.30, '#a9c4cf');
  s.q(tuer - 0.09, tuer + 0.09, 0.40, y1, 0.30, 0.35, '#d6dde1');
  if (oben) {
    const sy = 5.3;
    s.q(0.5, s.L - 0.5, sy, sy + 2.45, 0.02, 0.12, '#80a5b5');
    for (let u = 1; u < s.L - 1; u += 3.4) s.q(u, u + 0.16, sy, sy + 2.45, 0.15, 0.21, '#d9dedf');
    // Angedeutete Rolltreppe hinter der zweigeschossigen Glasfront.
    for (let i = 0; i < 11; i++) s.q(Math.max(0.6, s.L / 2 - 4 + i * 0.68), Math.min(s.L - 0.6, s.L / 2 - 3.5 + i * 0.68), 0.9 + i * 0.46, 1.08 + i * 0.46, -2.2, -1.4, '#c8cdd0');
  }
}

function pylon(S, scene, x, z) {
  S.box(0.28, 7.0, 0.28, x, 3.65, z, '#747c84');
  S.box(5.8, 2.6, 0.70, x, 7.1, z, FARBE_OUTLET);
  const s = new Seite(S, x - 2.9, z - 0.35, 5.8, 0.7, '+z');
  text(scene, s, NAME_OUTLET, 2.9, 7.55, 0.12, 5.3, 1.32);
}

export function outlet(S, scene, haus, opt = {}) {
  const start = S.anzahl, mark = merke(S, scene);
  const m = masseOutlet(haus), x = opt.x ?? 0, z = opt.z ?? 0;
  const r = rng(String(haus.id) + '/outlet/' + String(haus.fassade ?? 0));
  const Z = zustandNormal({ ...opt, status: opt.status ?? haus.status ?? 'offen', seed: haus.id });
  const F = zustandFlags(Z), H = m.H;
  const farbe = haus.lage === 'b' ? '#d6d1cd' : '#e0e1df';
  const { bw, bd } = m;
  // Kein massiver Vollquader: EG-Verkaufsfläche muss hinter der Glasfront sichtbar sein.
  // Hinten und links bleiben geschlossene Wandkörper, rechts und vorn nur Brüstungen/Stützen.
  const fensterOberkante = m.familie === 2 ? 8.05 : 4.95;
  S.quader(x, 0.30, z, x + bw, H, z + 0.35, farbe);
  S.quader(x, 0.30, z, x + 0.35, H, z + bd, farbe);
  S.quader(x, fensterOberkante, z + bd - 0.38, x + bw, H, z + bd, farbe);
  S.quader(x + bw - 0.38, fensterOberkante, z, x + bw, H, z + bd, farbe);
  for (const xx of [x, x + bw - 0.55])
    S.quader(xx, 0.30, z + bd - 0.45, xx + 0.55, fensterOberkante, z + bd, farbe);
  for (const zz of [z, z + bd - 0.55])
    S.quader(x + bw - 0.45, 0.30, zz, x + bw, fensterOberkante, zz + 0.55, farbe);
  S.quader(x + 0.35, H - 0.28, z + 0.35, x + bw - 0.35, H + 0.05, z + bd - 0.35, '#f1f0e9');
  S.quader(x - 0.25, H, z - 0.25, x + bw + 0.25, H + 0.35, z + bd + 0.25, '#a5a7a6');
  // Vier erkennbare Material-/Fensterrastervarianten innerhalb der drei Bauformen.
  const v = (haus.fassade ?? 0) % 4;
  for (let u = x + 3; u < x + bw - 2; u += 5.5 - v * 0.3)
    S.box(0.09, H - 0.9, 0.15, u, (H + 0.3) / 2, z + bd + 0.07, v % 2 ? '#b2b5b6' : FUGE);
  const seiten = seitenVon(S, x, z, bw, bd);
  const deckor = [];
  if (!F.zu) {
    innenVorbereiten(S, scene); // transparentes Schaufensterglas aus dem gemeinsamen Innenbau-Material
    innenOutlet(S, scene, haus, { x, z });
  }
  seiten.forEach((s, i) => {
    glasfront(S, scene, s, H, !F.zu, r, m.familie === 2);
    if (m.familie === 3 && H > 9) {
      for (let et = 1; et < m.n; et++) {
        const y = 5.2 + (et - 1) * 4.25;
        s.q(0.5, s.L - 0.5, y + 0.65, y + 2.2, 0.03, 0.15, v % 2 ? '#c5c9cb' : '#d8d7d2');
        for (let u = 1; u < s.L - 1; u += 4.5) s.q(u, u + 0.12, y + 0.65, y + 2.2, 0.16, 0.2, '#abb1b3');
      }
    }
    // Leuchtband ist formatprägend, selbst im 70er/80er Geschäftshaus.
    deckor.push(marke(scene, s, H, i === 0));
    if (m.familie !== 3 && i === 0) {
      s.q(0, s.L, 4.7, 4.98, 0.22, 2.3, '#d6d6d5'); // Vordach
      for (let u = 3; u < s.L; u += 10) s.q(u - 0.1, u + 0.1, 0.4, 4.8, 2.06, 2.2, '#aeb6bb');
    }
  });
  if (m.park) {
    const pz = z + bd + 1.4;
    S.quader(x + 1, 0.31, pz, x + bw - 1, 0.36, z + m.d - 1, '#92969a');
    parkreihe(S, r, x + 2, x + bw - 3, pz + 2, 5.5, 0.36, 0.85);
    // Einkaufswagenhäuschen in Markenfarbe, klare Retail-Park-Ausprägung.
    S.box(5, 0.22, 3.2, x + bw - 5, 2.45, z + m.d - 3.4, FARBE_OUTLET);
    for (let k = 0; k < 3; k++) S.box(0.08, 2.0, 0.08, x + bw - 7 + k * 2, 1.38, z + m.d - 3.4, '#d7dee3');
    if (opt.pylon !== false) pylon(S, scene, x + 4, z + m.d - 2.3);
  }
  if (!F.zu && opt.passanten !== false) {
    const anz = Z.status === 'neueroeffnung' ? 18 : 10;
    for (let i = 0; i < anz; i++) {
      const xx = x + 3 + r() * (bw - 6), zz = z + bd + 2.0 + r() * (m.park ? 5.0 : 2.2);
      mensch(S, r, xx, 0.32, zz);
      S.box(0.53, 0.75, 0.23, xx + 0.45, 0.73, zz + 0.1, FARBE_OUTLET);
    }
  }
  // Neueröffnung: eigene Ballonfarben direkt am Eingang, zusätzlich zum allgemeinen Overlay.
  if (Z.status === 'neueroeffnung') {
    const bx = x + bw * 0.52, bz = z + bd + 0.7;
    // Schlange mit geordneten Wartepunkten und burgunderroten Absperrbändern.
    for (let i = 0; i < 9; i++) mensch(S, r, bx - 4.5 + i * 1.05, 0.32, bz + 2.6);
    for (const dz of [1.5, 3.7]) {
      S.box(9.5, 0.06, 0.07, bx, 1.02, bz + dz, FARBE_OUTLET);
      for (let j = -2; j <= 2; j++) S.box(0.08, 1.05, 0.08, bx + j * 2.25, 0.63, bz + dz, '#6a6f73');
    }
    for (let i = 0; i < 14; i++) {
      const xx = bx - 3 + (i / 13) * 6, yy = 2.4 + Math.sin((i / 13) * Math.PI) * 2.6;
      const g = new THREE.IcosahedronGeometry(0.47, 1); g.translate(xx, yy, bz);
      S.add(g, i % 3 ? FARBE_OUTLET : '#f8ede4');
    }
  }
  const koerper = {
    x, z, w: bw, d: bd, hoehe: H, egHoehe: 5.2, geschossHoehe: 4.25, n: m.n,
    tRelief: 0.5, raster: 4.5, fensterBand: false,
    seiten: {
      '+z': { u1: bw, sperren: [deckor[0]], abbau: { u: bw * 0.53, y: H - 1.6, t: 0.6 } },
      '+x': { u1: bd, sperren: [deckor[1]], abbau: { u: bd * 0.53, y: H - 1.6, t: 0.6 } },
    },
    eingaenge: [{ seite: '+z', u: bw * 0.52, breite: 3.8, t: 0.3, haupt: true }],
    fensterEG: [{ seite: '+z', a: 0.6, b: bw - 0.6, y0: 0.5, y1: 3.2, t: 0.3 }],
    farbe, baujahr: haus.baujahr, jahr: opt.jahr, flaecheQm: haus.grundflaecheQm * m.n,
    marke: mark, seed: String(haus.id) + '/outlet', planeText: 'HIER ENTSTEHT ' + NAME_OUTLET,
  };
  // Der universelle Offprice-Zustand benennt sonst das Hartwig-interne Outlet.
  // Für FUNDUS bleibt ausschließlich die eigene Marke sichtbar.
  if (Z.hat('offprice')) {
    const sz = new Seite(S, x, z, bw, bd, '+z');
    sz.q(1, Math.min(bw - 1, 15), 1.15, 2.45, 0.35, 0.48, FARBE_OUTLET);
    text(scene, sz, NAME_OUTLET + ' MARKEN', Math.min(bw - 1, 15) / 2 + 0.5, 1.8, 0.56, Math.min(bw - 2, 13), 0.8);
  }
  const dekZ = Z.hat('offprice') ? zustandNormal({ status: 'offen', seed: haus.id }) : Z;
  const dekor = zustandsDekor(S, scene, koerper, dekZ, { pylon: false, passanten: false, logosAbdecken: true, abrissSeite: opt.abrissSeite });
  return { hoehe: Math.max(H + 0.8, dekor.hoehe, m.park ? 9 : 0), w: m.w, d: m.d, familie: m.familie, teile: S.anzahl - start, status: Z.status };
}

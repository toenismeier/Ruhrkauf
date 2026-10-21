// Südbauten: Bayern und Baden-Württemberg als Slot-Generatoren.
// Alle Slots: (S, scene, p) mit p = { x, z, w, d, seed, variante?, front?: '+x'|'+z'|'-x'|'-z', zustand? } -> { hoehe }
// front gibt an, wohin die Straßenseite zeigt (Vorgabe '+z'). Gebaut wird in einem lokalen Rahmen mit Front +z,
// danach dreht der Rahmen-Wrapper alles in die gewünschte Richtung. Detailliert werden immer genau die Seiten,
// die nach der Drehung sichtbar sind (Welt +x und +z), unabhängig davon, ob es Front, Seite oder Rückseite ist.
// zustand: 'gepflegt' (Vorgabe) | 'verwittert' (Farben ausgeblichen) | 'leerstand' (Läden leer, beklebt).
// Typische, eigenständige Vertreter, keine Kopien realer Einzelbauten.
//
// Rahmen-Konzept wie in ostbauten.js: Fassade F mit Ursprung, Laufrichtung u (im Bild von links nach rechts),
// Höhe y und t nach außen (t < 0 im Gebäude).
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { THREE, Sammler, rng, waehle, zw, FARBEN, heller, dunkler, textTextur, textMaterial } from './basis.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { gelaende, rebzeilen as glatteReben } from './gelaende.js';

const PI = Math.PI;

// =====================================================================================
// Rahmen und Grundformen
// =====================================================================================
function R(ox, oz, dx, dz, L) { return { ox, oz, dx, dz, nx: -dz, nz: dx, ry: Math.atan2(-dz, dx), L }; }
function wp(F, u, t) { return [F.ox + F.dx * u + F.nx * t, F.oz + F.dz * u + F.nz * t]; }
function fb(S, F, u0, u1, y0, y1, t0, t1, c) {
  if (u1 - u0 < 1e-3 || y1 - y0 < 1e-3 || t1 - t0 < 1e-3) return;
  const [x, z] = wp(F, (u0 + u1) / 2, (t0 + t1) / 2);
  S.box(u1 - u0, y1 - y0, t1 - t0, x, (y0 + y1) / 2, z, c, F.ry);
}
function fgeo(S, F, g, c) { g.rotateY(F.ry); g.translate(F.ox, 0, F.oz); S.add(g, c); }
function teil(F, u0, u1, t = 0) { const [x, z] = wp(F, u0, t); return R(x, z, F.dx, F.dz, u1 - u0); }
/** Querrahmen: steht bei u, läuft von der Wandflucht (u' = 0) nach hinten, Normale = Laufrichtung von F. t' = u von F. */
function quer(F, T) { const [x, z] = wp(F, 0, 0); return R(x, z, -F.nx, -F.nz, T); }
/** Die vier Seiten eines Rechtecks: v (+z), r (+x), h (-z), l (-x). */
function seiten(x0, z0, w, d) {
  return { v: R(x0, z0 + d, 1, 0, w), r: R(x0 + w, z0 + d, 0, -1, d), h: R(x0 + w, z0, -1, 0, w), l: R(x0, z0, 0, 1, d) };
}
function rechteck(u0, v0, u1, v1) {
  const s = new THREE.Shape();
  s.moveTo(u0, v0); s.lineTo(u1, v0); s.lineTo(u1, v1); s.lineTo(u0, v1); s.lineTo(u0, v0);
  return s;
}
function oeffnung(p, u0, v0, u1, v1, art) {
  p.moveTo(u0, v0); p.lineTo(u1, v0);
  const b = u1 - u0;
  if (art === 'spitz') {
    const vs = v1 - b * 0.866;
    p.lineTo(u1, vs); p.absarc(u0, vs, b, 0, PI / 3, false); p.absarc(u1, vs, b, (2 * PI) / 3, PI, false);
  } else if (art) {
    const vs = v1 - b / 2;
    p.lineTo(u1, vs); p.absarc((u0 + u1) / 2, vs, b / 2, 0, PI, false);
  } else { p.lineTo(u1, v1); p.lineTo(u0, v1); }
  p.lineTo(u0, v0);
  return p;
}
function fform(S, F, shape, t0, t1, c, seg = 6) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t1 - t0, bevelEnabled: false, curveSegments: seg });
  g.translate(0, 0, t0);
  fgeo(S, F, g, c);
}
function fwand(S, F, u0, u1, y0, y1, t0, t1, c, loecher = []) {
  const s = rechteck(u0, y0, u1, y1);
  for (const l of loecher) {
    if (l.kreis) { const p = new THREE.Path(); p.absarc(l.kreis[0], l.kreis[1], l.kreis[2], 0, 2 * PI, true); s.holes.push(p); }
    else s.holes.push(oeffnung(new THREE.Path(), l.u0, l.v0, l.u1, l.v1, l.bogen));
  }
  fform(S, F, s, t0, t1, c);
}
function fpoly(S, F, pkt, t0, t1, c) {
  const s = new THREE.Shape();
  s.moveTo(pkt[0][0], pkt[0][1]);
  for (const [u, v] of pkt.slice(1)) s.lineTo(u, v);
  s.lineTo(pkt[0][0], pkt[0][1]);
  fform(S, F, s, t0, t1, c);
}
/** Bogenöffnung als volle Fläche (z. B. dunkles Kirchenfenster). */
function fbogen(S, F, u, y0, b, h, t0, t1, c, art = true) {
  fform(S, F, oeffnung(new THREE.Shape(), u - b / 2, y0, u + b / 2, y0 + h, art), t0, t1, c, 8);
}
function fscheibe(S, F, u, y, t0, t1, rad, c, seg = 16) {
  const g = new THREE.CylinderGeometry(rad, rad, t1 - t0, seg);
  g.rotateX(PI / 2); g.translate(u, y, (t0 + t1) / 2);
  fgeo(S, F, g, c);
}
/** Schräger Balken im Rahmen von (u0, y0) nach (u1, y1), Stärke b, Tiefe t0..t1. */
function fdiag(S, F, u0, y0, u1, y1, b, t0, t1, c) {
  const L = wurzelSumme(u1 - u0, y1 - y0);
  const g = new THREE.BoxGeometry(L, b, t1 - t0);
  g.rotateZ(Math.atan2(y1 - y0, u1 - u0));
  g.translate((u0 + u1) / 2, (y0 + y1) / 2, (t0 + t1) / 2);
  fgeo(S, F, g, c);
}
// Schrifttexturen und Materialien je (Text, Farbe, Hintergrund) nur einmal (Cache in basis.js textMaterial)
function ftext(scene, F, text, u, y, t, hMax, bMax, farbe, bg = null) {
  const { seitenverhaeltnis: a, mat } = textMaterial(text, farbe, { groesse: 140, hintergrund: bg });
  const h = Math.min(hMax, bMax / a);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * a, h), mat);
  const [x, z] = wp(F, u, t);
  m.rotation.y = F.ry; m.position.set(x, y, z);
  scene.add(m);
  return h * a;
}
function zyl(S, rO, rU, h, x, y0, z, c, seg = 12, offen = false) {
  const g = new THREE.CylinderGeometry(rO, rU, h, seg, 1, offen);
  if (seg === 8 || seg === 4) g.rotateY(PI / seg);
  g.translate(x, y0 + h / 2, z);
  S.add(g, c);
}
function stab(S, a, b, rad, c, seg = 5) {
  const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = v.length();
  const g = new THREE.CylinderGeometry(rad, rad, L, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  S.add(g, c);
}
function boden(S, x0, z0, x1, z1, c, y = 0.3, h = 0.06) { if (x1 - x0 > 0.01 && z1 - z0 > 0.01) S.quader(x0, y, z0, x1, y + h, z1, c); }
/** Konvexer Körper aus Flächen (Punktlisten), Dreiecke werden nach außen gedreht. */
function konvex(faces) {
  const all = faces.flat();
  const c = [0, 1, 2].map((i) => all.reduce((a, p) => a + p[i], 0) / all.length);
  const pos = [];
  for (const f of faces) for (let i = 1; i < f.length - 1; i++) {
    const a = f[0]; let b = f[i], d = f[i + 1];
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const m = [(a[0] + b[0] + d[0]) / 3 - c[0], (a[1] + b[1] + d[1]) / 3 - c[1], (a[2] + b[2] + d[2]) / 3 - c[2]];
    if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) [b, d] = [d, b];
    pos.push(...a, ...b, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
/** Walmdach über [x0,x1]×[z0,z1] in Weltkoordinaten (Pyramide bei Quadrat). */
function walm(S, x0, z0, x1, z1, y, h, c, ue = 0.5, firstMin = 0) {
  x0 -= ue; z0 -= ue; x1 += ue; z1 += ue;
  const L = x1 - x0, T = z1 - z0, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2, yt = y + h;
  const a = [x0, y, z1], b = [x1, y, z1], cc = [x1, y, z0], d = [x0, y, z0];
  let f;
  if (L >= T) {
    const k = Math.min(T / 2, (L - firstMin) / 2);
    const r1 = [x0 + k, yt, zm], r2 = [x1 - k, yt, zm];
    f = [[a, b, r2, r1], [cc, d, r1, r2], [b, cc, r2], [d, a, r1], [a, d, cc, b]];
  } else {
    const k = Math.min(L / 2, (T - firstMin) / 2);
    const r1 = [xm, yt, z0 + k], r2 = [xm, yt, z1 - k];
    f = [[a, b, r2], [b, cc, r1, r2], [cc, d, r1], [d, a, r2, r1], [a, d, cc, b]];
  }
  S.add(konvex(f), c);
}
/** Mansarddach mit Walm: steiler Unterteil (Höhe h1, Einzug k), flacher Oberteil (h2). */
function mansardWalm(S, x0, z0, x1, z1, y, h1, k, h2, c1, c2, ue = 0.4) {
  const A = [[x0 - ue, z0 - ue], [x1 + ue, z0 - ue], [x1 + ue, z1 + ue], [x0 - ue, z1 + ue]];
  const B = [[x0 + k, z0 + k], [x1 - k, z0 + k], [x1 - k, z1 - k], [x0 + k, z1 - k]];
  const f = [];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; f.push([[A[i][0], y, A[i][1]], [A[j][0], y, A[j][1]], [B[j][0], y + h1, B[j][1]], [B[i][0], y + h1, B[i][1]]]); }
  f.push(A.map(([x, z]) => [x, y, z]), B.map(([x, z]) => [x, y + h1, z]));
  S.add(konvex(f), c1);
  walm(S, x0 + k, z0 + k, x1 - k, z1 - k, y + h1, h2, c2, 0);
}
/** Satteldach, First parallel zu F (traufständig), über u0..u1, Tiefe T hinter der Flucht. */
function dachTrauf(S, F, u0, u1, T, y, h, c, wand, o = {}) {
  const ue = o.ue ?? 0.7, us = o.us ?? 0.45, dk = o.dick ?? 0.34;
  const Q = quer(F, T), s = (2 * h) / T, yE = y - ue * s;
  fdiag(S, Q, -ue, yE, T / 2 + 0.05, y + h + 0.05 * s, dk, u0 - us, u1 + us, c);
  fdiag(S, Q, T / 2 - 0.05, y + h + 0.05 * s, T + ue, yE, dk, u0 - us, u1 + us, c);
  fb(S, Q, T / 2 - 0.22, T / 2 + 0.22, y + h + 0.02, y + h + 0.26, u0 - us, u1 + us, dunkler(c, 0.07));
  if (wand) fpoly(S, Q, [[0, y - 0.02], [T, y - 0.02], [T / 2, y + h - 0.25]], u0 + 0.02, u1 - 0.02, wand);
}
/** Satteldach, First quer zu F (giebelständig), über u0..u1, Tiefe t0 (hinten, negativ) bis t1. */
function dachGiebel(S, F, u0, u1, t0, t1, y, h, c, wand, o = {}) {
  const ue = o.ue ?? 0.5, dk = o.dick ?? 0.34, uf = o.uf ?? 0.6, ub = o.ub ?? 0.5;
  const um = (u0 + u1) / 2, B = u1 - u0, s = (2 * h) / B, yE = y - ue * s;
  fdiag(S, F, u0 - ue, yE, um + 0.05, y + h + 0.05 * s, dk, t0 - ub, t1 + uf, c);
  fdiag(S, F, um - 0.05, y + h + 0.05 * s, u1 + ue, yE, dk, t0 - ub, t1 + uf, c);
  fb(S, F, um - 0.22, um + 0.22, y + h + 0.02, y + h + 0.26, t0 - ub, t1 + uf, dunkler(c, 0.07));
  if (wand) fpoly(S, F, [[u0 + 0.02, y - 0.02], [u1 - 0.02, y - 0.02], [um, y + h - 0.25]], t0, t1, wand);
}
/** Gaube auf einem traufständigen Dach (Dachneigung s = Höhe pro Meter Tiefe). */
function gaube(S, F, u, H, s, bw, c, dachF, glas, a = 1.3) {
  const yb = H + s * a;
  fb(S, F, u - bw / 2, u + bw / 2, yb - 0.4, yb + 1.45, -a - 2.4, -a, c);
  fb(S, F, u - bw / 2 + 0.25, u + bw / 2 - 0.25, yb, yb + 1.05, -a - 0.1, -a + 0.04, glas);
  fdiag(S, F, u - bw / 2 - 0.2, yb + 1.3, u, yb + 1.95, 0.16, -a - 2.6, -a + 0.25, dachF);
  fdiag(S, F, u, yb + 1.95, u + bw / 2 + 0.2, yb + 1.3, 0.16, -a - 2.6, -a + 0.25, dachF);
}

// ---------- Sichtbarkeit und Drehung ----------
const DREH = { '+z': 0, '+x': PI / 2, '-z': PI, '-x': -PI / 2 };
/** Ist eine Fläche mit lokaler Normale (nx, nz) nach der Drehung sichtbar? Sichtbar heißt Welt-Normale mit nx + nz > 0. */
function sicht(p, nx, nz) {
  const c = Math.cos(p.dreh ?? 0), s = Math.sin(p.dreh ?? 0);
  return nx * c + nz * s + (-nx * s + nz * c) > 0.05;
}
const sichtF = (p, F) => sicht(p, F.nx, F.nz);

function ausgeblichen(c) {
  const k = new THREE.Color(c), hsl = {};
  k.getHSL(hsl);
  k.setHSL(hsl.h, hsl.s * 0.62, Math.min(0.92, hsl.l * 0.9 + 0.04));
  return '#' + k.getHexString();
}
/**
 * Slot-Wrapper: baut roh(S, scene, p) im lokalen Rahmen mit Front +z und dreht in p.front.
 * min: Nennmaß, kleinere Flächen werden gleichmäßig verkleinert. max: größere Flächen bekommen den Bau in Nennmaß (mittig, an der Front).
 */
function slot(roh, min, max = null, opt = {}) {
  const fn = (S, scene, p) => {
    let front = DREH[p.front] !== undefined ? p.front : '+z';
    // Hang- und Uferstücke: die hohe Seite (lokal hinten) liegt immer kameraabgewandt (Welt -x/-z).
    // Bei Front -x/-z wird deshalb um 180° gewendet; die Straße stößt dann an die verdeckte Stützmauer.
    let gewendet = false;
    if (opt.hang && opt.hang(p) && (front === '-x' || front === '-z')) { front = front === '-x' ? '+x' : '+z'; gewendet = true; }
    const th = DREH[front], quer2 = front === '+x' || front === '-x';
    const W = quer2 ? p.d : p.w, D = quer2 ? p.w : p.d;
    const bw = max ? Math.min(W, max[0]) : W, bd = max ? Math.min(D, max[1]) : D;
    // p.minMass [w, d] (optional, Archetyp-Modul sued.js): kleineres Nennmaß, z. B. für Häuserzeilen in schmalen Stadtparzellen ohne Verkleinerung
    const mn = p.minMass ?? min;
    const nw = Math.max(mn[0], bw), nd = Math.max(mn[1], bd);
    const s = Math.min(1, bw / nw, bd / nd);
    const ox = (W - nw * s) / 2, oz = D - nd * s;
    const T = new Sammler(), inner = new THREE.Group();
    const erg = roh(T, inner, { ...p, x: 0, z: 0, w: nw, d: nd, front, dreh: th });
    const c = Math.cos(th), sn = Math.sin(th);
    const ecken = [[0, 0], [W, 0], [0, D], [W, D]].map(([x, z]) => [x * c + z * sn, -x * sn + z * c]);
    const tx = p.x - Math.min(...ecken.map((e) => e[0])), tz = p.z - Math.min(...ecken.map((e) => e[1]));
    const verw = p.zustand === 'verwittert';
    for (const [farbe, gs] of T.teile) {
      const f = verw ? ausgeblichen(farbe) : farbe;
      for (const g of gs) { if (s < 0.999) g.scale(s, s, s); g.translate(ox, 0, oz); if (th) g.rotateY(th); g.translate(tx, 0, tz); S.add(g, f); }
    }
    inner.scale.setScalar(s); inner.position.set(ox, 0, oz);
    const aussen = new THREE.Group(); aussen.add(inner); aussen.rotation.y = th; aussen.position.set(tx, 0, tz);
    scene.add(aussen);
    return { ...erg, hoehe: erg.hoehe * s, skala: s, teile: T.anzahl, gewendet };
  };
  // Hang- und Uferstücke kennen nur die Fronten +z und +x (siehe oben); Kataloge fragen das über fn.hang ab
  fn.hang = opt.hang ?? null;
  return fn;
}
/** Teilbau mit Versatz (z. B. Häuser auf einer Geländestufe). */
function versetzt(S, scene, dx, dy, dz, fn) {
  const T = new Sammler(), g = new THREE.Group();
  const erg = fn(T, g);
  for (const [farbe, gs] of T.teile) for (const geo of gs) { geo.translate(dx, dy, dz); S.add(geo, farbe); }
  g.position.set(dx, dy, dz); scene.add(g);
  return erg;
}

// ---------- Farben ----------
const PASTELL = ['#f1d79c', '#efc5ae', '#cfe0c0', '#c5d8e6', '#f2e5c2', '#e8c4c4', '#ead9a8', '#d8cde3', '#f4ede0', '#e9bf98', '#bfd9cf', '#f0d0a8'];
const KRAEFTIG = ['#e6b45a', '#dc9878', '#9fc29a', '#8fb5cf', '#e0a19e', '#d8bf6a', '#b8a3cf', '#e49066', '#c9d98f'];
const BIBER = ['#b4583f', '#a85440', '#c26a4a', '#9e4e3a'];
const SCHIEFER = ['#5d6a72', '#56636c', '#626e75'];
const KUPFER = ['#6f9a7d', '#79a487', '#628f73'];
const ZWIEBEL_DUNKEL = ['#4f5a5a', '#5a4b42', '#4d5864'];
const WEISS = '#f4f1ea', ORN = '#fbf8f0', GOLD = '#d8b45a';
const GLAS = '#4f5f6b', GLAS_LADEN = '#5f7787', GLAS_DUNKEL = '#3c4852';
const LADENRAHMEN = ['#3f4a53', '#2f5d4a', '#6b2e35', '#5a4636', '#1f3a5f', '#e9e4da', '#7a2f2f', '#2e4f6b'];
const LAEDEN = ['Bäckerei Huber', 'Metzgerei Brandl', 'Trachten Moser', 'Apotheke am Markt', 'Café Rieder', 'Optik Ostermaier', 'Schuhhaus Gruber',
  'Buchhandlung Zierer', 'Konditorei Wallner', 'Eisdiele Dolomiti', 'Weinstube', 'Hutmacher Pichler', 'Juwelier Steiner', 'Drogerie Lechner',
  'Feinkost Obermaier', 'Blumen Aigner', 'Spielwaren Hölzl', 'Uhren Kastner', 'Lederwaren Rauch', 'Brotzeitstüberl', 'Messerschmied',
  'Bettenhaus Lutz', 'Eisenwaren Schmid', 'Reisebüro Sonnig', 'Dirndl & Loden', 'Kaffeerösterei', 'Papeterie Seitz', 'Weinhandlung Kern'];
const LAEDEN_BW = ['Bäckerei Häberle', 'Metzgerei Kübler', 'Café Ruoff', 'Buchhandlung Osiander', 'Optik Bauder', 'Weinstube Fässle', 'Maultaschen-Manufaktur',
  'Schuhhaus Kächele', 'Apotheke am Markt', 'Bettenhaus Mayer', 'Brezelstüble', 'Feinkost Böhm', 'Spätzlestube', 'Uhren Grieshaber', 'Eisenwaren Schäfer'];
const HOLZ = ['#6b4a32', '#7a5638', '#5e3f2a'], HOLZ_HELL = '#a2754a';
const FW_FRANKEN = ['#8a3b2a', '#7d3526', '#94432e', '#6e3a2c'];
const FW_SCHWABEN = ['#4f3426', '#5b3a2a', '#6e4a2e', '#3f4a52', '#7a3a2a', '#5d6152'];
const ROT_SANDSTEIN = ['#b8705a', '#ad6450', '#c27e64'], GELB_SANDSTEIN = ['#d9b98c', '#cfae80', '#e0c49a'];
const KIES = '#ddd2b6', PFLASTER = '#d2c9b6', PFLASTER2 = '#c8bea9', RASEN = '#9dc283', WIESE = '#a9c98a', WASSER = FARBEN.wasser;
const LAUB = ['#6f9f5c', '#5f9150', '#7aa865'], KASTANIE = ['#5d8f4c', '#679a54', '#548545'], NADEL = ['#4f7d4c', '#466f45', '#5a8a55'];

const hell = (c) => { const k = new THREE.Color(c); return 0.299 * k.r + 0.587 * k.g + 0.114 * k.b > 0.6; };
function achsen(u0, u1, ra, rand = 0.6) {
  const na = Math.max(1, Math.floor((u1 - u0 - 2 * rand) / ra)), off = u0 + (u1 - u0 - na * ra) / 2;
  return Array.from({ length: na }, (_, i) => off + (i + 0.5) * ra);
}
function teileBreite(r, L, bmin, bmax) {
  const out = []; let rest = L;
  while (rest > bmax) { const b = zw(r, bmin, bmax); if (rest - b < bmin) break; out.push(b); rest -= b; }
  if (rest > bmax * 1.4 && out.length === 0) { out.push(rest / 2); rest /= 2; }
  out.push(rest);
  return out;
}

// =====================================================================================
// Bauteile
// =====================================================================================
/** Fenster mit Kreuzstock. o: { t, rahmen, glas, fasche, sims, laeden, verdachung: 'gerade'|'dreieck'|'segment', blumen, kreuz, bogen } */
function fenster(S, F, u, y, fw, fh, o = {}) {
  const t = o.t ?? 0, rah = o.rahmen ?? ORN;
  if (o.fasche) fb(S, F, u - fw / 2 - 0.2, u + fw / 2 + 0.2, y - 0.22, y + fh + 0.22, t, t + 0.03, o.fasche);
  if (o.bogen) fbogen(S, F, u, y, fw, fh, t - 0.12, t + 0.04, o.glas ?? GLAS);
  else fb(S, F, u - fw / 2, u + fw / 2, y, y + fh, t - 0.12, t + 0.04, o.glas ?? GLAS);
  if (o.kreuz !== false && fw > 0.75) {
    fb(S, F, u - 0.045, u + 0.045, y, y + fh * (o.bogen ? 0.8 : 1), t, t + 0.07, rah);
    if (!o.bogen) fb(S, F, u - fw / 2, u + fw / 2, y + fh * 0.66 - 0.04, y + fh * 0.66 + 0.04, t, t + 0.07, rah);
  }
  if (o.sims !== false) fb(S, F, u - fw / 2 - 0.16, u + fw / 2 + 0.16, y - 0.16, y, t, t + 0.2, o.simsF ?? rah);
  if (o.laeden) {
    const lb = fw * 0.52;
    fb(S, F, u - fw / 2 - lb - 0.04, u - fw / 2 - 0.04, y, y + fh, t, t + 0.1, o.laeden);
    fb(S, F, u + fw / 2 + 0.04, u + fw / 2 + lb + 0.04, y, y + fh, t, t + 0.1, o.laeden);
  }
  const oc = o.ornF ?? rah;
  if (o.verdachung === 'gerade') fb(S, F, u - fw / 2 - 0.3, u + fw / 2 + 0.3, y + fh + 0.12, y + fh + 0.34, t, t + 0.26, oc);
  else if (o.verdachung === 'dreieck') fpoly(S, F, [[u - fw / 2 - 0.35, y + fh + 0.14], [u + fw / 2 + 0.35, y + fh + 0.14], [u, y + fh + 0.78]], t, t + 0.22, oc);
  else if (o.verdachung === 'segment') {
    const pk = [[u - fw / 2 - 0.35, y + fh + 0.14]];
    for (let i = 0; i <= 6; i++) { const a = PI - (i / 6) * PI; pk.push([u + Math.cos(a) * (fw / 2 + 0.35), y + fh + 0.3 + Math.sin(a) * 0.38]); }
    pk.push([u + fw / 2 + 0.35, y + fh + 0.14]);
    fpoly(S, F, pk, t, t + 0.22, oc);
  }
  if (o.blumen) {
    fb(S, F, u - fw / 2, u + fw / 2, y - 0.5, y - 0.18, t, t + 0.34, o.kasten ?? '#7a5638');
    fb(S, F, u - fw / 2 + 0.04, u + fw / 2 - 0.04, y - 0.2, y + 0.16, t + 0.03, t + 0.4, o.blumen);
  }
}
/** Lochfassade: Geschosse × Achsen. */
function lochfassade(S, F, u0, u1, y0, n, gh, o = {}) {
  const ra = o.ra ?? 3.0, fw = o.fw ?? 1.25, fh = o.fh ?? Math.min(1.9, gh * 0.58), br = o.br ?? 0.85;
  const us = o.achsen ?? achsen(u0, u1, ra, o.rand ?? 0.5);
  for (let k = 0; k < n; k++) for (const u of us) fenster(S, F, u, y0 + k * gh + br, fw, fh, typeof o.fen === 'function' ? o.fen(k, u) : o);
  return us;
}
/** Ladenzone auf einem Rahmen zwischen u0 und u1, Höhe h. o: { rahmen, leer, name, markise, tuer, namen } */
function laden(S, scene, F, u0, u1, h, r, o = {}) {
  const b = u1 - u0; if (b < 1.8) return;
  const rah = o.rahmen ?? waehle(r, LADENRAHMEN), leer = o.leer;
  fb(S, F, u0, u1, 0.3, 0.72, -0.1, 0.08, rah);
  fb(S, F, u0 + 0.15, u1 - 0.15, 0.72, h - 0.85, -0.25, 0.03, leer ? '#dcd8ce' : GLAS_LADEN);
  fb(S, F, u0, u1, h - 0.85, h - 0.12, -0.1, 0.1, rah);
  const n = Math.max(1, Math.round(b / 2.5));
  for (let i = 0; i <= n; i++) { const u = u0 + 0.12 + ((b - 0.24) * i) / n; fb(S, F, u - 0.09, u + 0.09, 0.72, h - 0.85, -0.1, 0.07, rah); }
  if (o.tuer !== false && b > 3) { const ut = u0 + b * (r() < 0.5 ? 0.2 : 0.8); fb(S, F, ut - 0.55, ut + 0.55, 0.3, h - 1.0, -0.05, 0.06, dunkler(rah, 0.06)); }
  if (leer) {
    // großes Vermietungsschild über die ganze Schaufensterbreite
    const sh = Math.min(h - 1.3, Math.max(1.4, b * 0.2)), ym = 0.72 + (h - 0.85 - 0.72) / 2;
    fb(S, F, u0 + 0.2, u1 - 0.2, ym - sh / 2, ym + sh / 2, 0.03, 0.09, '#c8322a');
    ftext(scene, F, 'ZU VERMIETEN', (u0 + u1) / 2, ym, 0.1, sh * 0.8, b * 0.94, '#ffffff');
  }
  else if (o.name !== false) ftext(scene, F, o.name ?? waehle(r, o.namen ?? LAEDEN), (u0 + u1) / 2, h - 0.49, 0.12, 0.42, b * 0.86, hell(rah) ? '#3a3f44' : '#f7f2e6');
  if (o.markise && !leer) { const g = new THREE.BoxGeometry(b - 0.2, 0.12, 1.5); g.rotateX(0.38); g.translate((u0 + u1) / 2, h - 1.05, 0.72); fgeo(S, F, g, o.markise); }
}
/** Großplane bei Leerstand über die ganze Zeilenfront, auf 25 % lesbar. */
function leerPlane(S, scene, p, F, y, hMax = 5.5) {
  if (p.zustand !== 'leerstand' || !sichtF(p, F)) return;
  const L = F.L * 0.86, h = Math.min(hMax, L / 6.2), u0 = (F.L - L) / 2;
  fb(S, F, u0, u0 + L, y, y + h, 0.25, 0.35, '#c8322a');
  fb(S, F, u0 + 0.25, u0 + L - 0.25, y + 0.25, y + 0.33, 0.35, 0.38, '#f4efe2');
  fb(S, F, u0 + 0.25, u0 + L - 0.25, y + h - 0.33, y + h - 0.25, 0.35, 0.38, '#f4efe2');
  for (const u of [u0 + 0.4, u0 + L - 0.4]) fb(S, F, u - 0.05, u + 0.05, y + h, y + h + 0.8, 0.28, 0.33, '#3b4046');
  ftext(scene, F, 'ZU VERMIETEN', F.L / 2, y + h / 2, 0.4, h * 0.92, L * 0.96, '#ffffff');
}
function haustuer(S, F, u, y, b, h, c, rahmen = ORN, bogen = false) {
  if (bogen) { fbogen(S, F, u, y, b + 0.4, h + 0.3, 0, 0.06, rahmen); fbogen(S, F, u, y, b, h, -0.1, 0.1, c); }
  else { fb(S, F, u - b / 2 - 0.2, u + b / 2 + 0.2, y, y + h + 0.2, 0, 0.06, rahmen); fb(S, F, u - b / 2, u + b / 2, y, y + h, -0.1, 0.1, c); }
}
/** Umriss eines Ziergiebels/Vorschussmauer-Abschlusses über u0..u1 ab y (Höhe hg). */
function giebelUmriss(u0, u1, y, hg, art) {
  const B = u1 - u0, um = (u0 + u1) / 2, P = [];
  if (art === 'spitz') return [[u0, y], [u1, y], [um, y + hg]];
  if (art === 'flach') return [[u0, y], [u1, y], [u1, y + hg], [u0, y + hg]];
  if (art === 'treppe') {
    const n = 4, sw = B / (2 * n + 1), sh = hg / n;
    P.push([u0, y]);
    for (let i = 0; i < n; i++) { P.push([u0 + i * sw, y + (i + 1) * sh], [u0 + (i + 1) * sw, y + (i + 1) * sh]); }
    for (let i = n - 1; i >= 0; i--) { P.push([u1 - (i + 1) * sw, y + (i + 1) * sh], [u1 - i * sw, y + (i + 1) * sh]); }
    P.push([u1, y]);
    return P;
  }
  if (art === 'zinnen') {
    const n = Math.max(3, Math.round(B / 1.6)) | 1, zb = B / n;
    P.push([u0, y]);
    for (let i = 0; i < n; i++) { const hh = i % 2 === 0 ? hg : hg - 0.8; P.push([u0 + i * zb, y + hh], [u0 + (i + 1) * zb, y + hh]); }
    P.push([u1, y]);
    return P;
  }
  if (art === 'aufsatz') {
    const a = B * 0.22, h0 = hg * 0.6;
    P.push([u0, y], [u0, y + h0], [um - a - 0.6, y + h0]);
    for (let i = 0; i <= 8; i++) { const ang = PI - (i / 8) * PI; P.push([um + Math.cos(ang) * a, y + h0 + 0.3 + Math.sin(ang) * (hg - h0 - 0.3)]); }
    P.push([um + a + 0.6, y + h0], [u1, y + h0], [u1, y]);
    return P;
  }
  // geschweift (Barockvolute)
  const L = [];
  for (let i = 0; i <= 4; i++) { const a = (i / 4) * (PI / 2); L.push([0.3 * (1 - Math.cos(a)), 0.4 * Math.sin(a)]); }
  for (let i = 1; i <= 3; i++) { const a = (i / 3) * (PI / 2); L.push([0.3 + 0.06 * Math.sin(a), 0.4 + 0.22 * (1 - Math.cos(a))]); }
  L.push([0.36, 0.8]);
  for (let i = 1; i <= 4; i++) { const a = (i / 4) * (PI / 2); L.push([0.5 - 0.14 * Math.cos(a), 0.8 + 0.2 * Math.sin(a)]); }
  for (const [a, b] of L) P.push([u0 + a * B, y + b * hg]);
  for (let i = L.length - 2; i >= 0; i--) P.push([u1 - L[i][0] * B, y + L[i][1] * hg]);
  return P;
}
/** Zwiebelhaube (Rotationskörper), Unterkante bei y. */
function zwiebel(S, x, y, z, Rr, H, c, seg = 12) {
  const pr = [[0.92, 0], [1.16, 0.14], [1.26, 0.28], [1.18, 0.42], [0.86, 0.56], [0.42, 0.68], [0.2, 0.76], [0.2, 0.84], [0.0, 0.88]];
  const g = new THREE.LatheGeometry(pr.map(([a, b]) => new THREE.Vector2(Math.max(0.001, a * Rr), b * H)), seg);
  g.translate(x, y, z); S.add(g, c);
}
function kreuz(S, x, y, z, h = 1.6, c = GOLD) { S.box(0.14, h, 0.14, x, y + h / 2, z, c); S.box(0.8 * h / 1.6, 0.14, 0.14, x, y + h * 0.66, z, c); }
/** Barocker Turmhelm: Oktogon, Zwiebel, Laterne, kleine Zwiebel, Kugel und Kreuz. b = Turmbreite. */
function zwiebelHelm(S, x, y, z, b, c, wand, o = {}) {
  const r8 = b * 0.46;
  zyl(S, r8, r8, b * 0.22, x, y, z, wand, 8);
  zyl(S, r8 + 0.15, r8 + 0.15, 0.25, x, y + b * 0.22, z, ORN, 8);
  const y1 = y + b * 0.22 + 0.2, H1 = b * (o.hoch ?? 1.15);
  zwiebel(S, x, y1, z, r8 * 0.95, H1, c);
  const yl = y1 + H1 * 0.82, rl = r8 * 0.3, hl = b * 0.34;
  zyl(S, rl, rl, hl, x, yl, z, wand, 8);
  zyl(S, rl * 0.7, rl * 0.7, hl * 0.6, x, yl + hl * 0.2, z, GLAS_DUNKEL, 8);
  const y2 = yl + hl;
  zwiebel(S, x, y2, z, rl * 1.05, b * 0.55, c, 10);
  S.add(new THREE.SphereGeometry(0.32, 8, 6).translate(x, y2 + b * 0.5, z), GOLD);
  kreuz(S, x, y2 + b * 0.52, z, 1.5);
  return y2 + b * 0.52 + 1.5;
}
function baumRund(S, x, z, r, s = 1, farben = LAUB, y0 = 0.3) {
  S.box(0.45 * s, 2.4 * s, 0.45 * s, x, y0 + 1.2 * s, z, FARBEN.stamm);
  const g = new THREE.IcosahedronGeometry(2.3 * s * (0.88 + r() * 0.24), 1);
  g.scale(1, 0.88, 1); g.translate(x, y0 + 3.9 * s, z);
  S.add(g, waehle(r, farben));
}
function kastanie(S, x, z, r, s = 1, y0 = 0.3) {
  S.box(0.55 * s, 3.0 * s, 0.55 * s, x, y0 + 1.5 * s, z, '#6f5640');
  const g = new THREE.IcosahedronGeometry(3.4 * s * (0.9 + r() * 0.2), 1);
  g.scale(1, 0.8, 1); g.translate(x, y0 + 5.0 * s, z);
  S.add(g, waehle(r, KASTANIE));
}
function nadelbaum(S, x, z, r, h = 8, y0 = 0.3) {
  S.box(0.35, 1.2, 0.35, x, y0 + 0.6, z, FARBEN.stamm);
  const g = new THREE.ConeGeometry(h * 0.26, h, 6); g.translate(x, y0 + 0.8 + h / 2, z); S.add(g, waehle(r, NADEL));
}
function busch(S, x, z, r, s = 1, y0 = 0.3) {
  const g = new THREE.IcosahedronGeometry(1.0 * s * (0.8 + r() * 0.4), 0);
  g.scale(1.2, 0.8, 1.2); g.translate(x, y0 + 0.7 * s, z);
  S.add(g, waehle(r, ['#6f9f5c', '#7aa865', '#628f52']));
}
/** Bierbankgarnitur entlang x. */
function garnitur(S, x, z, y0 = 0.3, ry = 0) {
  const c = '#c99a63', d = '#a77a48';
  S.box(2.2, 0.08, 0.62, x, y0 + 0.76, z, c, ry);
  S.box(1.9, 0.7, 0.1, x, y0 + 0.38, z, d, ry);
  const off = 0.62;
  S.box(2.2, 0.06, 0.26, x - Math.sin(ry) * off, y0 + 0.46, z - Math.cos(ry) * off, c, ry);
  S.box(2.2, 0.06, 0.26, x + Math.sin(ry) * off, y0 + 0.46, z + Math.cos(ry) * off, c, ry);
}
function schirm(S, x, z, rad, farbe, y0 = 0.3) {
  S.box(0.1, 2.3, 0.1, x, y0 + 1.15, z, '#e9e6de');
  const g = new THREE.ConeGeometry(rad, 0.6, 8); g.translate(x, y0 + 2.6, z); S.add(g, farbe);
}
function laterne(S, x, z, y0 = 0.3) {
  S.box(0.16, 4.2, 0.16, x, y0 + 2.1, z, '#3b4046');
  S.box(0.5, 0.7, 0.5, x, y0 + 4.5, z, '#f2ead0');
  S.box(0.62, 0.12, 0.62, x, y0 + 4.9, z, '#3b4046');
}
function bank(S, x, z, ry = 0, y0 = 0.3) { S.box(1.8, 0.1, 0.5, x, y0 + 0.45, z, '#9a6e45', ry); S.box(1.8, 0.45, 0.08, x - Math.sin(ry) * 0.25, y0 + 0.75, z - Math.cos(ry) * 0.25, '#9a6e45', ry); S.box(1.5, 0.42, 0.4, x, y0 + 0.2, z, '#4a4f55', ry); }
/** Brunnen: achteckiges Becken mit Säule und Figur (art 'saeule') oder Trog (art 'trog'). */
function brunnen(S, x, z, rad, o = {}) {
  const y = o.y ?? 0.36, st = o.stein ?? '#d6cfc0';
  if (o.art === 'trog') {
    S.box(rad * 2, 0.8, rad, x, y + 0.4, z, HOLZ[0]); S.box(rad * 2 - 0.3, 0.1, rad - 0.3, x, y + 0.72, z, WASSER);
    S.box(0.4, 1.8, 0.4, x - rad + 0.4, y + 0.9, z - rad / 2 - 0.2, HOLZ[1]); S.box(0.1, 0.1, 0.6, x - rad + 0.4, y + 1.6, z - rad / 2 + 0.1, '#7d8288');
    return;
  }
  zyl(S, rad, rad, 0.75, x, y, z, st, 8);
  zyl(S, rad - 0.35, rad - 0.35, 0.77, x, y + 0.01, z, WASSER, 8);
  zyl(S, 0.5, 0.65, 3.8, x, y, z, st, 8);
  zyl(S, 0.9, 0.5, 0.4, x, y + 3.8, z, st, 8);
  if (o.figur !== false) {
    zyl(S, 0.35, 0.4, 1.4, x, y + 4.2, z, o.figurF ?? GOLD, 8);
    S.add(new THREE.SphereGeometry(0.28, 8, 6).translate(x, y + 5.85, z), o.figurF ?? GOLD);
  }
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) stab(S, [x + dx * 0.55, y + 2.4, z + dz * 0.55], [x + dx * 1.4, y + 1.6, z + dz * 1.4], 0.06, '#d0e8ee', 4);
}
function hof(S, r, x0, z0, x1, z1, o = {}) {
  if (x1 - x0 < 2 || z1 - z0 < 2) return;
  boden(S, x0, z0, x1, z1, o.boden ?? PFLASTER2, 0.3, 0.05);
  const A = (x1 - x0) * (z1 - z0);
  if (z1 - z0 > 5) for (let i = 0; i < Math.min(o.baeume ?? 3, Math.floor(A / 90)); i++) baumRund(S, zw(r, x0 + 3, x1 - 3), zw(r, z0 + 2.5, z1 - 2.5), r, zw(r, 0.6, 0.9));
}

// ---------- Kirchenbauteile ----------
function zifferblatt(S, F, u, y, rad, t, c) {
  fscheibe(S, F, u, y, t, t + 0.1, rad + 0.2, ORN, 16);
  fscheibe(S, F, u, y, t + 0.1, t + 0.14, rad, c, 16);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * PI, l = i % 3 === 0 ? rad * 0.26 : rad * 0.14, cu = u + Math.cos(a) * rad * 0.78, cy = y + Math.sin(a) * rad * 0.78; fb(S, F, cu - 0.05, cu + 0.05, cy - l / 2, cy + l / 2, t + 0.14, t + 0.18, GOLD); }
  fb(S, F, u - 0.05, u + 0.05, y, y + rad * 0.72, t + 0.18, t + 0.22, GOLD);
  fb(S, F, u, u + rad * 0.5, y - 0.05, y + 0.05, t + 0.18, t + 0.22, GOLD);
}
/** Schallarkade: Rundbogen mit Mittelsäule und Schalllamellen. */
function schallarkade(S, F, u, y, b, h, orn, holz = '#5a4636') {
  fbogen(S, F, u, y - 0.2, b + 0.5, h + 0.45, 0, 0.06, orn);
  fbogen(S, F, u, y, b, h, -0.2, 0.07, GLAS_DUNKEL);
  fb(S, F, u - 0.09, u + 0.09, y, y + h - b * 0.5, 0.0, 0.12, orn);
  for (let i = 1; i <= 3; i++) fb(S, F, u - b / 2 + 0.05, u + b / 2 - 0.05, y + (i * (h - b * 0.5)) / 4, y + (i * (h - b * 0.5)) / 4 + 0.1, -0.12, -0.02, holz);
  fb(S, F, u - b / 2 - 0.25, u + b / 2 + 0.25, y - 0.25, y - 0.05, 0, 0.22, orn);
}
/** Barockes Rundbogenfenster mit Faschen, Sprossen und Schlussstein. */
function barockFenster(S, F, u, y, b, h, orn) {
  fbogen(S, F, u, y - 0.25, b + 0.6, h + 0.55, 0, 0.05, orn);
  fbogen(S, F, u, y, b, h, -0.1, 0.07, GLAS_DUNKEL);
  fb(S, F, u - 0.04, u + 0.04, y, y + h - b * 0.5, 0.07, 0.1, orn);
  for (const k of [0.33, 0.66]) fb(S, F, u - b / 2, u + b / 2, y + (h - b * 0.5) * k - 0.04, y + (h - b * 0.5) * k + 0.04, 0.07, 0.1, orn);
  fb(S, F, u - 0.22, u + 0.22, y + h - 0.1, y + h + 0.45, 0, 0.14, orn);
  fb(S, F, u - b / 2 - 0.3, u + b / 2 + 0.3, y - 0.42, y - 0.22, 0, 0.18, orn);
}
/** Gotisches Spitzbogenfenster mit Maßwerk (Pfosten, Kämpfer, Okulus). */
function gotFenster(S, F, u, y, b, h, gew, t = 0) {
  fbogen(S, F, u, y - 0.2, b + 0.6, h + 0.4, t, t + 0.05, gew, 'spitz');
  fbogen(S, F, u, y, b, h, t - 0.15, t + 0.06, GLAS_DUNKEL, 'spitz');
  const hs = h - b * 0.9, np = b > 2.0 ? 2 : 1;
  for (let i = 1; i <= np; i++) { const uu = u - b / 2 + (i * b) / (np + 1); fb(S, F, uu - 0.07, uu + 0.07, y, y + hs + b * 0.2, t + 0.06, t + 0.12, gew); }
  fb(S, F, u - b / 2, u + b / 2, y + hs * 0.55, y + hs * 0.55 + 0.1, t + 0.06, t + 0.11, gew);
  fscheibe(S, F, u, y + hs + b * 0.42, t + 0.06, t + 0.1, b * 0.24, gew, 10);
  fscheibe(S, F, u, y + hs + b * 0.42, t + 0.1, t + 0.12, b * 0.14, GLAS_DUNKEL, 10);
}
/** Fiale: Schaft, vier Wimperge angedeutet, Helm, Kreuzblume. */
function fiale(S, x, y, z, h, c) {
  const b = Math.max(0.5, h * 0.14);
  S.box(b, h * 0.42, b, x, y + h * 0.21, z, c);
  S.box(b * 1.3, 0.2, b * 1.3, x, y + h * 0.42, z, heller(c, 0.05));
  const g = new THREE.ConeGeometry(b * 0.72, h * 0.55, 4); g.rotateY(PI / 4); g.translate(x, y + h * 0.42 + h * 0.275, z); S.add(g, c);
  for (const t of [0.55, 0.72]) S.box(b * 0.7 * (1.1 - t), 0.22, b * 0.7 * (1.1 - t) + 0.5, x, y + h * t + 0.1, z, c);
  S.add(new THREE.OctahedronGeometry(b * 0.32, 0).translate(x, y + h + 0.1, z), c);
}
/** Krabben entlang einer Giebelkante (Punkte im Rahmen) und Kreuzblume am First. */
function krabben(S, F, pkt, t, c, abst = 1.8) {
  for (let i = 0; i < pkt.length - 1; i++) {
    const [a0, a1] = pkt[i], [b0, b1] = pkt[i + 1], L = wurzelSumme(b0 - a0, b1 - a1), n = Math.floor(L / abst);
    for (let k = 1; k <= n; k++) { const q = k / (n + 1); fb(S, F, a0 + (b0 - a0) * q - 0.22, a0 + (b0 - a0) * q + 0.22, a1 + (b1 - a1) * q, a1 + (b1 - a1) * q + 0.4, t - 0.2, t + 0.25, c); }
  }
}
/** Dreieckige Dachluke auf einer Dachfläche mit Neigung s (Höhe je Meter Tiefe). */
function dachluke(S, F, u, H, s, dach, a = 2.5, b = 1.1, rahmen = '#e9e4d8') {
  const y = H + s * a;
  fpoly(S, F, [[u - b / 2, y - 0.1], [u + b / 2, y - 0.1], [u, y + b * 0.8]], -a - 1.6, -a, dach);
  fpoly(S, F, [[u - b * 0.4, y], [u + b * 0.4, y], [u, y + b * 0.62]], -a + 0.01, -a + 0.04, rahmen);
  fpoly(S, F, [[u - b * 0.26, y + 0.1], [u + b * 0.26, y + 0.1], [u, y + b * 0.46]], -a + 0.04, -a + 0.07, GLAS_DUNKEL);
}
function marktstand(S, r, x, z, farbe) {
  S.box(3.6, 0.9, 1.8, x, 0.75, z, '#c99a63');
  for (const dx of [-1.7, 1.7]) S.box(0.1, 2.4, 0.1, x + dx, 1.5, z - 0.8, '#7a5638');
  const g = new THREE.BoxGeometry(4.0, 0.12, 2.4); g.rotateX(0.18); g.translate(x, 2.7, z); S.add(g, farbe);
  for (let k = 0; k < 4; k++) S.box(0.7, 0.3, 0.6, x - 1.2 + k * 0.8, 1.35, z, waehle(r, ['#d0453a', '#e8b53c', '#7fae5a', '#e07a3f', '#f4efe2']));
}
function mariensaeule(S, x, z, y0 = 0.3, c = '#d9d1c0') {
  S.box(2.2, 1.2, 2.2, x, y0 + 0.6, z, c); S.box(1.4, 0.8, 1.4, x, y0 + 1.6, z, c);
  zyl(S, 0.35, 0.42, 7.5, x, y0 + 2.0, z, c, 10);
  S.box(0.9, 0.4, 0.9, x, y0 + 9.7, z, c);
  zyl(S, 0.25, 0.35, 1.5, x, y0 + 9.9, z, GOLD, 8);
  S.add(new THREE.SphereGeometry(0.22, 8, 6).translate(x, y0 + 11.6, z), GOLD);
  for (const [dx, dz] of [[1.1, 1.1], [-1.1, 1.1], [1.1, -1.1], [-1.1, -1.1]]) { S.box(0.3, 1.0, 0.3, x + dx, y0 + 1.7, z + dz, c); S.box(0.24, 0.5, 0.24, x + dx, y0 + 2.45, z + dz, GOLD); }
}
/** Friedhof: Gräberreihen mit Kreuzen, Grabsteinen, Bepflanzung, Wegen. */
function friedhof(S, r, x0, z0, x1, z1, frei = () => true) {
  boden(S, x0, z0, x1, z1, '#a9c48f', 0.3, 0.05);
  boden(S, (x0 + x1) / 2 - 0.8, z0, (x0 + x1) / 2 + 0.8, z1, KIES, 0.3, 0.08);
  for (let gx = x0 + 1.6; gx < x1 - 1; gx += 2.5) for (let gz = z0 + 1.8; gz < z1 - 1; gz += 3.1) {
    if (Math.abs(gx - (x0 + x1) / 2) < 1.6 || !frei(gx, gz) || r() < 0.18) continue;
    S.box(1.0, 0.25, 1.8, gx, 0.42, gz, waehle(r, ['#7aa865', '#8fb873', '#c9b48c', '#6f9f5c']));
    if (r() < 0.55) { S.box(0.12, 1.3, 0.12, gx, 0.95, gz - 0.85, '#3b4046'); S.box(0.6, 0.1, 0.1, gx, 1.3, gz - 0.85, '#3b4046'); }
    else S.box(0.8, 1.0, 0.18, gx, 0.85, gz - 0.85, waehle(r, ['#9aa0a5', '#c9c3b6', '#6f757a', '#e3dccd']));
    if (r() < 0.45) S.box(0.5, 0.3, 0.4, gx, 0.6, gz + 0.3, waehle(r, ['#d0453a', '#e8b53c', '#f4efe2']));
  }
}

// =====================================================================================
// 1. Altbayerische Bürgerhäuser (Inn-Salzach-Typ)
// =====================================================================================
const BUERGER_V = ['rosenheim', 'landshut', 'passau', 'wasserburg'];
function buergerHaus(S, scene, r, v, x0, z0, b, T, p, erster, letzter) {
  const wand = v === 'passau' || v === 'wasserburg' ? waehle(r, r() < 0.5 ? KRAEFTIG : PASTELL) : waehle(r, PASTELL);
  const orn = ORN, sockelF = dunkler(wand, 0.14);
  const eg = v === 'passau' ? 4.6 : 4.2, gh = v === 'passau' ? 3.35 : 3.15;
  const n = v === 'passau' ? 3 + (r() < 0.55 ? 1 : 0) : v === 'landshut' ? 2 + (r() < 0.6 ? 1 : 0) : 2 + (r() < 0.55 ? 1 : 0);
  const H = eg + n * gh;
  const arkade = v === 'rosenheim' || (v === 'wasserburg' && r() < 0.45);
  const tA = arkade ? 3.0 : 0;
  const F = seiten(x0, z0, b, T);
  const dachF = waehle(r, BIBER);
  S.quader(x0, 0, z0, x0 + b, eg, z0 + T - tA, wand);
  S.quader(x0, eg, z0, x0 + b, H, z0 + T, wand);
  const laedenF = r() < 0.35 ? waehle(r, ['#3f6b4a', '#6b3a2e', '#3f5a7a']) : null;
  const fen = { rahmen: orn, glas: GLAS, fasche: v === 'passau' ? null : (r() < 0.6 ? orn : dunkler(wand, 0.08)), laeden: v === 'wasserburg' ? laedenF : null, simsF: orn,
    blumen: r() < 0.3 ? '#d0453a' : null };
  const nAx = Math.max(2, Math.round(b / 2.9));
  const us = Array.from({ length: nAx }, (_, i) => (b / nAx) * (i + 0.5));
  const erker = (v === 'wasserburg' || v === 'passau' || v === 'rosenheim') && b > 8 && r() < (v === 'wasserburg' ? 0.6 : 0.35) && n >= 2;
  const leer = p.zustand === 'leerstand';
  // Front
  if (sichtF(p, F.v)) {
    const Fv = F.v;
    if (arkade) {
      const nB = Math.max(2, Math.round(b / 3.6)), bb = b / nB, holes = [];
      for (let i = 0; i < nB; i++) holes.push({ u0: i * bb + 0.5, u1: (i + 1) * bb - 0.5, v0: 0.3, v1: eg - 0.45, bogen: true });
      fwand(S, Fv, 0, b, 0.3, eg, -0.6, 0, wand, holes);
      fb(S, Fv, 0, b, 0.3, 0.75, -0.6, 0.06, sockelF);
      boden(S, x0, z0 + T - tA, x0 + b, z0 + T - 0.6, '#cfc2a8', 0.3, 0.07);
      laden(S, scene, teil(Fv, 0.4, b - 0.4, -tA), 0, b - 0.8, eg - 0.25, r, { leer });
    } else {
      fb(S, Fv, 0, b, 0.3, 0.8, -0.1, 0.1, sockelF);
      if (v === 'passau') for (let k = 1; k < 4; k++) fb(S, Fv, 0, b, 0.3 + k * 1.05, 0.38 + k * 1.05, 0, 0.06, dunkler(wand, 0.1));
      laden(S, scene, Fv, 0.6, b - (b > 9 ? 2.6 : 0.6), eg - 0.35, r, { leer, markise: r() < 0.3 ? waehle(r, FARBEN.markise) : null });
      if (b > 9) haustuer(S, Fv, b - 1.5, 0.3, 1.2, 2.5, waehle(r, HOLZ), orn, true);
    }
    fb(S, Fv, 0, b, eg - 0.08, eg + 0.2, 0, 0.2, orn);
    for (let k = 0; k < n; k++) {
      const y = eg + k * gh + 0.85;
      for (const u of us) {
        if (erker && Math.abs(u - b / 2) < 1.8 && k < n) continue;
        fenster(S, Fv, u, y, 1.15, Math.min(1.8, gh * 0.56), { ...fen, verdachung: v === 'passau' ? (k === 0 ? 'dreieck' : 'gerade') : null });
      }
    }
    if (v === 'passau') { fb(S, Fv, -0.02, 0.45, eg, H, 0, 0.14, orn); fb(S, Fv, b - 0.45, b + 0.02, eg, H, 0, 0.14, orn); }
    if (erker) {
      const e0 = b / 2 - 1.7, e1 = b / 2 + 1.7, te = 0.95, ye0 = eg + 0.7, ye1 = H - (v === 'passau' ? 0.5 : 0.2);
      fb(S, Fv, e0, e1, ye0, ye1, 0, te, wand);
      fpoly(S, teil(Fv, 0, b, 0), [[e0 + 0.4, ye0], [e1 - 0.4, ye0], [b / 2, ye0 - 1.1]], 0, te * 0.8, orn);
      for (let k = 0; k < n; k++) fenster(S, Fv, b / 2, eg + k * gh + 0.9, 1.6, Math.min(1.75, gh * 0.55), { ...fen, t: te, laeden: null });
      fb(S, Fv, e0 - 0.15, e1 + 0.15, ye1, ye1 + 0.25, -0.1, te + 0.2, orn);
      fb(S, Fv, e0, e1, ye1 + 0.25, ye1 + 0.55, -0.1, te + 0.05, dachF);
    }
  }
  // Rück- und Seitenflächen
  const nebenFen = { ...fen, laeden: null, blumen: null, verdachung: null, fasche: v === 'passau' ? null : fen.fasche };
  if (sichtF(p, F.h)) {
    lochfassade(S, F.h, 0, b, eg, n, gh, { ...nebenFen, ra: 3.0, fw: 1.0, fh: 1.5 });
    haustuer(S, F.h, b * 0.3, 0.3, 1.1, 2.3, waehle(r, HOLZ), orn);
    fenster(S, F.h, b * 0.7, 1.4, 1.0, 1.3, nebenFen);
  }
  for (const [k, ok] of [['r', letzter], ['l', erster]]) {
    if (!ok || !sichtF(p, F[k])) continue;
    lochfassade(S, F[k], 0.5, T - 0.5, eg, n, gh, { ...nebenFen, ra: 3.3, fw: 1.0, fh: 1.5 });
    fb(S, F[k], 0, T - tA, 0.3, 0.8, 0, 0.1, sockelF);
    if (arkade) fwand(S, F[k], 0, tA, 0.3, eg, -0.5, 0, wand, [{ u0: 0.5, u1: tA - 0.4, v0: 0.3, v1: eg - 0.45, bogen: true }]);
    for (const u of [T * 0.35, T * 0.7]) fenster(S, F[k], u, 1.3, 1.0, 1.6, { ...nebenFen, laeden: '#5a6168', kreuz: false });
  }
  // Abschluss
  if (v === 'landshut') {
    const hg = b * zw(r, 0.75, 0.95), art = waehle(r, ['geschweift', 'treppe', 'spitz', 'geschweift', 'aufsatz']);
    dachGiebel(S, F.v, 0, b, -T, -0.4, H, hg * 0.95, dachF, wand, { ue: 0.25, uf: 0.0, ub: 0.4 });
    fpoly(S, F.v, giebelUmriss(0, b, H, hg, art), -0.5, 0, wand);
    const kap = giebelUmriss(0, b, H, hg, art);
    if (art !== 'spitz') for (let i = 1; i < kap.length - 1; i++) {
      const [a0, a1] = kap[i], [b0, b1] = kap[i + 1];
      if (Math.abs(a1 - b1) < 0.01 && Math.abs(a0 - b0) > 0.2) fb(S, F.v, Math.min(a0, b0) - 0.1, Math.max(a0, b0) + 0.1, a1 - 0.05, a1 + 0.18, -0.6, 0.14, orn);
    }
    fb(S, F.v, -0.05, b + 0.05, H - 0.15, H + 0.12, 0, 0.22, orn);
    if (sichtF(p, F.v)) {
      for (const u of [b * 0.3, b * 0.7]) fenster(S, F.v, u, H + 0.9, 0.95, 1.4, { ...fen, laeden: null, blumen: null });
      fenster(S, F.v, b / 2, H + hg * 0.52, 0.8, 1.1, { ...fen, laeden: null, blumen: null, kreuz: false });
      if (hg > 7) fscheibe(S, F.v, b / 2, H + hg * 0.78, 0, 0.06, 0.45, GLAS);
    }
    if (sichtF(p, F.h)) fpoly(S, F.h, giebelUmriss(0, b, H, hg * 0.9, 'spitz'), -0.3, 0, dunkler(wand, 0.03));
    return { top: H + hg, H };
  }
  // Vorschussmauer
  const hv = v === 'passau' ? zw(r, 1.6, 2.2) : zw(r, 1.9, 2.8);
  const art = v === 'passau' ? 'flach' : v === 'wasserburg' ? waehle(r, ['zinnen', 'treppe', 'flach', 'aufsatz']) : waehle(r, ['flach', 'flach', 'aufsatz']);
  const top = H + hv;
  const umriss = giebelUmriss(0, b, H, hv, art);
  fpoly(S, F.v, umriss, -0.55, 0, wand);
  if (v === 'passau') {
    fb(S, F.v, -0.1, b + 0.1, H - 0.1, H + 0.3, 0, 0.5, orn);
    for (const u of achsen(0.4, b - 0.4, 0.9, 0)) fb(S, F.v, u - 0.15, u + 0.15, H + 0.3, top - 0.25, -0.1, 0.18, orn);
    fb(S, F.v, -0.05, b + 0.05, top - 0.25, top + 0.05, -0.6, 0.32, orn);
  } else {
    fb(S, F.v, -0.02, b + 0.02, H - 0.2, H + 0.05, 0, 0.16, orn);
    for (let i = 0; i < umriss.length - 1; i++) {
      const [a0, a1] = umriss[i], [b0, b1] = umriss[i + 1];
      if (Math.abs(a1 - b1) < 0.01 && Math.abs(a0 - b0) > 0.2 && a1 > H + 0.5) fb(S, F.v, Math.min(a0, b0) - 0.08, Math.max(a0, b0) + 0.08, a1 - 0.02, a1 + 0.16, -0.65, 0.1, orn);
    }
    if (art === 'aufsatz' && sichtF(p, F.v)) fscheibe(S, F.v, b / 2, H + hv * 0.72, 0, 0.06, 0.38, GLAS);
  }
  // Feuermauern zwischen den Häusern
  const fm = dunkler(wand, 0.04);
  S.quader(x0, H, z0, x0 + 0.45, top - 0.35, z0 + T - 0.3, fm);
  S.quader(x0 - 0.05, top - 0.35, z0, x0 + 0.5, top - 0.2, z0 + T - 0.3, orn);
  if (letzter) { S.quader(x0 + b - 0.45, H, z0, x0 + b, top - 0.35, z0 + T - 0.3, fm); S.quader(x0 + b - 0.5, top - 0.35, z0, x0 + b + 0.05, top - 0.2, z0 + T - 0.3, orn); }
  // Grabendach dahinter
  const nGr = Math.max(1, Math.round(b / 5.2)), bg = b / nGr;
  for (let i = 0; i < nGr; i++) dachGiebel(S, F.v, i * bg + 0.2, (i + 1) * bg - 0.2, -T, -0.6, H, Math.min(hv - 0.45, bg * 0.42), dachF, sichtF(p, F.h) ? dunkler(wand, 0.03) : null, { ue: 0.0, uf: 0, ub: 0.35, dick: 0.25 });
  if (nGr > 1) for (let i = 1; i < nGr; i++) S.quader(x0 + i * bg - 0.3, H, z0, x0 + i * bg + 0.3, H + 0.25, z0 + T - 0.6, '#8f8a82');
  return { top, H };
}
function buergerRoh(S, scene, p) {
  const r = rng(`bb:${p.seed}`);
  const v = p.variante ?? waehle(r, BUERGER_V);
  const { w, d } = p, vz = 2.4, zf = d - vz, T = Math.min(14, zf - 1);
  boden(S, 0, zf, w, d, PFLASTER, 0.3, 0.06);
  hof(S, r, 0, 0, w, zf - T);
  const br = teileBreite(r, w, v === 'passau' ? 8.5 : 7.2, v === 'passau' ? 12 : 10.5);
  let xa = 0, H = 0;
  br.forEach((b, i) => { H = Math.max(H, buergerHaus(S, scene, r, v, xa, zf - T, b, T, p, i === 0, i === br.length - 1).top); xa += b; });
  leerPlane(S, scene, p, R(0, zf + (v === 'passau' ? 0.5 : 0.2), 1, 0, w), 4.6, 4.8);
  return { hoehe: H };
}

// =====================================================================================
// 2. Münchner Innenstadt-Geschäftshäuser
// =====================================================================================
const MUENCHEN_V = ['neorenaissance', 'neubarock', 'wiederaufbau', 'zeile'];
function muenchenHaus(S, scene, r, stil, x0, z0, b, T, p, erster, letzter) {
  const F = seiten(x0, z0, b, T), leer = p.zustand === 'leerstand';
  let wand, orn, dachF, n, eg, gh;
  if (stil === 'neorenaissance') { wand = waehle(r, ['#d9c3a0', '#cdb898', '#e3d2b4', '#c9c2ad', '#bdb79f', '#d8c8b0']); orn = heller(wand, 0.1); dachF = waehle(r, [...SCHIEFER, '#8b939b']); n = 4; eg = 5.2; gh = 3.7; }
  else if (stil === 'neubarock') { wand = waehle(r, ['#efe3c8', '#ecd4c6', '#dfe6d2', '#f1e6d2', '#e9d9b0', '#e2d7e4']); orn = '#fbf8f0'; dachF = waehle(r, [...BIBER, ...SCHIEFER]); n = 4; eg = 5.0; gh = 3.6; }
  else { wand = waehle(r, ['#e9dcc0', '#e2d6c4', '#d8d2c4', '#efe4cc', '#d9c8a8', '#e6dfd2', '#d7dccf']); orn = '#f3efe6'; dachF = waehle(r, BIBER); n = 3 + (r() < 0.6 ? 1 : 0); eg = 4.6; gh = 3.3; }
  const H = eg + n * gh;
  S.quader(x0, 0, z0, x0 + b, H, z0 + T, wand);
  const rust = stil === 'neorenaissance' ? dunkler(wand, 0.1) : wand;
  const ra = stil === 'wiederaufbau' ? 2.6 : 3.2;
  const us = achsen(0, b, ra, 0.6);
  const fbreite = stil === 'wiederaufbau' ? 1.15 : 1.35, fhoehe = stil === 'wiederaufbau' ? 1.55 : 2.05;
  const fenF = (k) => {
    if (stil === 'wiederaufbau') return { rahmen: '#f6f4ee', glas: GLAS, sims: true, simsF: '#c9c3b6', kreuz: r() < 0.3 };
    if (stil === 'neorenaissance') return { rahmen: orn, glas: GLAS, fasche: orn, verdachung: k === 0 ? (r() < 0.5 ? 'dreieck' : 'segment') : k === 1 ? 'gerade' : null, ornF: orn };
    return { rahmen: orn, glas: GLAS, fasche: k < 2 ? orn : null, verdachung: k === 0 ? 'segment' : null, ornF: orn };
  };
  const ladenFront = (Fk, L) => {
    if (stil === 'wiederaufbau') {
      laden(S, scene, Fk, 0.3, L - 0.3, eg - 0.6, r, { leer, rahmen: waehle(r, ['#3f4a53', '#e9e4da', '#5a4636', '#2e4f6b']) });
      fb(S, Fk, -0.05, L + 0.05, eg - 0.65, eg - 0.4, 0, 1.6, '#e8e6e0');
      fb(S, Fk, -0.05, L + 0.05, eg - 0.72, eg - 0.65, 0.2, 1.62, '#3f4a53');
    } else {
      fb(S, Fk, 0, L, 0.3, eg, 0, 0.14, rust);
      const nB = Math.max(1, Math.round(L / 4.2)), bb = L / nB;
      for (let i = 0; i < nB; i++) {
        const u0 = i * bb + 0.55, u1 = (i + 1) * bb - 0.55;
        fbogen(S, Fk, (u0 + u1) / 2, 0.3, u1 - u0 + 0.3, eg - 0.6, 0.0, 0.18, orn);
        laden(S, scene, teil(Fk, u0, u1, 0.18), 0, u1 - u0, eg - 1.2, r, { leer, name: i === 0 ? undefined : false, rahmen: waehle(r, ['#3f4a53', '#2f5d4a', '#6b2e35', '#1f3a5f']), tuer: i === nB - 1 });
      }
      if (stil === 'neorenaissance') for (let k = 1; k < 4; k++) fb(S, Fk, 0, L, 0.3 + k * 1.2, 0.38 + k * 1.2, 0.14, 0.2, dunkler(wand, 0.16));
    }
    fb(S, Fk, -0.05, L + 0.05, eg - 0.05, eg + 0.28, 0, stil === 'wiederaufbau' ? 0.12 : 0.3, orn);
  };
  const obergeschosse = (Fk, L, mitte) => {
    const ua = achsen(0, L, ra, 0.6);
    for (let k = 0; k < n; k++) {
      const y = eg + k * gh + (stil === 'wiederaufbau' ? 0.9 : 0.8);
      for (const u of ua) fenster(S, Fk, u, y, fbreite, Math.min(fhoehe, gh * 0.6), fenF(k));
      if (stil !== 'wiederaufbau' && k < n - 1) fb(S, Fk, -0.05, L + 0.05, eg + (k + 1) * gh - 0.1, eg + (k + 1) * gh + 0.08, 0, 0.14, orn);
    }
    if (stil === 'neubarock' && mitte && L > 10) {
      fb(S, Fk, L / 2 - 2.6, L / 2 + 2.6, eg + gh - 0.05, eg + gh + 0.12, 0, 0.9, orn);
      fb(S, Fk, L / 2 - 2.6, L / 2 + 2.6, eg + gh + 0.12, eg + gh + 1.1, 0.75, 0.85, '#3b4046');
      for (const u of [L / 2 - 2.5, L / 2 + 2.5]) fb(S, Fk, u - 0.15, u + 0.15, eg - 0.1, H - 0.2, 0, 0.3, orn);
    }
    if (stil === 'neorenaissance') { fb(S, Fk, -0.02, 0.55, eg, H, 0, 0.12, heller(wand, 0.04)); fb(S, Fk, L - 0.55, L + 0.02, eg, H, 0, 0.12, heller(wand, 0.04)); }
    // Hauptgesims
    if (stil === 'wiederaufbau') fb(S, Fk, -0.1, L + 0.1, H - 0.2, H + 0.05, 0, 0.35, '#e8e3d8');
    else { fb(S, Fk, -0.15, L + 0.15, H - 0.35, H, 0, 0.55, orn); for (const u of achsen(0, L, 1.1, 0.3)) fb(S, Fk, u - 0.12, u + 0.12, H - 0.75, H - 0.35, 0, 0.35, orn); }
  };
  const erker = stil === 'neubarock' && b > 11 && r() < 0.6;
  if (sichtF(p, F.v)) {
    ladenFront(F.v, b);
    obergeschosse(F.v, b, true);
    if (erker) {
      const e0 = b * 0.18, e1 = e0 + 3.2;
      fb(S, F.v, e0, e1, eg + 0.4, eg + 2 * gh, 0, 1.0, wand);
      for (let k = 0; k < 2; k++) fenster(S, F.v, (e0 + e1) / 2, eg + k * gh + 0.8, 1.6, 2.0, { rahmen: orn, glas: GLAS, t: 1.0 });
      fb(S, F.v, e0 - 0.2, e1 + 0.2, eg + 2 * gh, eg + 2 * gh + 0.3, 0, 1.3, orn);
      fb(S, F.v, e0 + 0.3, e1 - 0.3, eg + 2 * gh + 0.3, eg + 2 * gh + 1.2, 0.6, 1.2, '#3b4046');
    }
  }
  if (sichtF(p, F.h)) lochfassade(S, F.h, 0, b, eg, n, gh, { ra: 3.0, fw: 1.1, fh: 1.5, rahmen: '#f3efe6', glas: GLAS, simsF: '#cfc9bd' });
  if (sichtF(p, F.h)) fb(S, F.h, 0, b, 0.3, eg - 0.3, -0.1, 0.05, dunkler(wand, 0.08));
  for (const [k, ok] of [['r', letzter], ['l', erster]]) {
    if (!ok || !sichtF(p, F[k])) continue;
    if (stil === 'wiederaufbau') { ladenFront(teil(F[k], 0, 7), 7); lochfassade(S, F[k], 0, T, eg, n, gh, { ra: 2.6, fw: 1.1, fh: 1.5, rahmen: '#f6f4ee', glas: GLAS, simsF: '#c9c3b6' }); fb(S, F[k], -0.1, T + 0.1, H - 0.2, H + 0.05, 0, 0.35, '#e8e3d8'); }
    else { ladenFront(teil(F[k], 0, 8.4), 8.4); obergeschosse(F[k], T, false); }
  }
  // Dach
  let top = H;
  if (stil === 'neubarock') {
    const h1 = 3.6, k = 1.1;
    const Q = quer(F.v, T);
    fpoly(S, Q, [[-0.4, H], [T + 0.4, H], [T - k, H + h1], [k, H + h1]], -0.05, b + 0.05, dachF);
    fpoly(S, Q, [[k, H + h1], [T - k, H + h1], [T / 2, H + h1 + 1.6]], -0.05, b + 0.05, dunkler(dachF, 0.06));
    top = H + h1 + 1.6;
    if (sichtF(p, F.v)) for (const u of achsen(0, b, ra, 0.6)) { fb(S, F.v, u - 0.7, u + 0.7, H + 0.4, H + 2.6, -1.4, -0.5, orn); fb(S, F.v, u - 0.45, u + 0.45, H + 0.7, H + 2.1, -0.55, -0.46, GLAS); fbogen(S, F.v, u, H + 2.4, 1.6, 0.8, -1.5, -0.45, dachF); }
    if (b > 10) {
      const gb = Math.min(7.5, b * 0.5), g0 = b / 2 - gb / 2;
      fpoly(S, F.v, giebelUmriss(g0, g0 + gb, H, 5.2, 'geschweift'), -0.5, 0, wand);
      if (sichtF(p, F.v)) { fenster(S, F.v, b / 2, H + 1.0, 1.4, 1.9, { rahmen: orn, glas: GLAS, fasche: orn }); fscheibe(S, F.v, b / 2, H + 3.9, 0, 0.06, 0.45, GLAS); }
      fb(S, F.v, g0 - 0.2, g0 + gb + 0.2, H - 0.05, H + 0.15, 0, 0.6, orn);
      top = Math.max(top, H + 5.2);
    }
  } else {
    const h = stil === 'wiederaufbau' ? T * 0.55 : T * 0.42;
    dachTrauf(S, F.v, 0, b, T, H, h, dachF, wand, { ue: stil === 'wiederaufbau' ? 0.5 : 0.3, us: letzter || erster ? 0.3 : 0.02 });
    top = H + h;
    const s = (2 * h) / T;
    if (sichtF(p, F.v)) {
      if (stil === 'neorenaissance' && b > 13 && r() < 0.7) {
        const gb = 5.6, g0 = b / 2 - gb / 2, hg = 6.2;
        fb(S, F.v, g0, g0 + gb, H, H + hg * 0.55, -2.2, 0, wand);
        fpoly(S, F.v, giebelUmriss(g0, g0 + gb, H, hg, 'geschweift'), -2.2, 0.08, wand);
        fenster(S, F.v, b / 2 - 1.2, H + 0.8, 0.95, 1.7, { rahmen: orn, glas: GLAS, fasche: orn });
        fenster(S, F.v, b / 2 + 1.2, H + 0.8, 0.95, 1.7, { rahmen: orn, glas: GLAS, fasche: orn });
        fscheibe(S, F.v, b / 2, H + hg * 0.68, 0.08, 0.14, 0.4, GLAS);
        for (const u of [g0 + 0.8, b - g0 - 0.8]) gaube(S, F.v, u < b / 2 ? Math.max(1.3, g0 - 1.6) : Math.min(b - 1.3, b - g0 + 1.6), H, s, 1.5, wand, dachF, GLAS);
        top = Math.max(top, H + hg);
      } else {
        const ng = stil === 'wiederaufbau' ? Math.max(1, Math.round(b / 3.4)) : Math.max(1, Math.round(b / 4.2));
        for (let i = 0; i < ng; i++) gaube(S, F.v, ((i + 0.5) * b) / ng, H, s, stil === 'wiederaufbau' ? 1.3 : 1.6, stil === 'wiederaufbau' ? '#ebe7de' : wand, dachF, GLAS, 1.0);
      }
    }
    if (letzter && stil === 'neorenaissance' && sichtF(p, F.r) && r() < 0.7) {
      // Eckerker mit Turmhelm
      const cx = x0 + b - 0.2, cz = z0 + T - 0.2, rr = 2.0;
      zyl(S, rr, rr, H - eg - 0.6, cx, eg + 0.6, cz, wand, 8);
      for (let k = 0; k < n; k++) zyl(S, rr + 0.12, rr + 0.12, 0.18, cx, eg + (k + 1) * gh - 0.1, cz, orn, 8);
      zyl(S, rr * 0.95, rr * 0.95, 2.4, cx, H, cz, wand, 8);
      const g = new THREE.ConeGeometry(rr * 1.15, 6.5, 8); g.rotateY(PI / 8); g.translate(cx, H + 2.4 + 3.25, cz); S.add(g, dachF);
      S.add(new THREE.SphereGeometry(0.3, 6, 5).translate(cx, H + 9.1, cz), GOLD);
      zyl(S, rr * 0.4, rr * 0.8, 0.9, cx, eg - 0.3, cz, orn, 8);
      top = Math.max(top, H + 9.4);
    }
  }
  // Schornsteine
  for (const u of [b * 0.3, b * 0.75]) if (r() < 0.6) S.quader(x0 + u - 0.4, H + 1, z0 + T * 0.4, x0 + u + 0.4, top + 0.5, z0 + T * 0.4 + 0.8, '#b9a89a');
  return { top };
}
function muenchenRoh(S, scene, p) {
  const r = rng(`mu:${p.seed}`);
  const v = p.variante ?? waehle(r, MUENCHEN_V);
  const { w, d } = p, vz = 3.2, zf = d - vz, T = Math.min(17, zf - 1);
  boden(S, 0, zf, w, d, '#d6d0c2', 0.3, 0.06);
  hof(S, r, 0, 0, w, zf - T);
  const br = teileBreite(r, w, 11, 17);
  let xa = 0, H = 0;
  br.forEach((b, i) => {
    const stil = v === 'zeile' ? waehle(r, ['neorenaissance', 'neubarock', 'wiederaufbau', 'wiederaufbau']) : v;
    H = Math.max(H, muenchenHaus(S, scene, r, stil, xa, zf - T, b, T, p, i === 0, i === br.length - 1).top);
    xa += b;
  });
  for (let x = 4; x < w - 2; x += 9) { S.box(0.18, 4.6, 0.18, x, 2.6, d - 0.8, '#3b4046'); S.box(0.9, 0.3, 0.4, x, 4.9, d - 0.8, '#3b4046'); }
  leerPlane(S, scene, p, R(0, zf + 0.5, 1, 0, w), 5.4, 6.0);
  return { hoehe: H };
}

// =====================================================================================
// 3. Barockkirche mit Zwiebelturm
// =====================================================================================
const KIRCHE_V = ['doppelturm', 'wallfahrt', 'dorf', 'stadtpfarr'];
/** Kirchturm mit Lisenen, Uhr, Schallarkaden und Zwiebelhelm. Grundfläche [x0, x0+b] × [z0, z0+b]. */
function kirchturm(S, scene, p, x0, z0, b, H, c) {
  const F = seiten(x0, z0, b, b);
  S.quader(x0, 0, z0, x0 + b, H, z0 + b, c.wand);
  const gs = [H * 0.38, H * 0.68, H - 0.4];
  for (const y of gs) S.quader(x0 - 0.15, y, z0 - 0.15, x0 + b + 0.15, y + 0.35, z0 + b + 0.15, c.orn);
  for (const k of ['v', 'r', 'h', 'l']) {
    if (!sichtF(p, F[k])) continue;
    const Fk = F[k];
    // Ecklisenen mit Kapitellen, Sockel, Felder
    for (const [a, e] of [[0, 0.6], [b - 0.6, b]]) { fb(S, Fk, a, e, 0.3, H, 0, 0.14, c.lisene); for (const y of gs) fb(S, Fk, a - 0.08, e + 0.08, y - 0.45, y, 0, 0.22, c.orn); }
    fb(S, Fk, -0.05, b + 0.05, 0.3, 1.1, 0, 0.16, dunkler(c.wand, 0.1));
    for (let j = 0; j < 2; j++) { const y0 = j === 0 ? 1.6 : gs[0] + 0.7, y1 = j === 0 ? gs[0] - 0.5 : gs[1] - 0.5; fb(S, Fk, 0.9, b - 0.9, y0, y0 + 0.12, 0, 0.06, c.orn); fb(S, Fk, 0.9, b - 0.9, y1 - 0.12, y1, 0, 0.06, c.orn); fb(S, Fk, 0.9, 1.02, y0, y1, 0, 0.06, c.orn); fb(S, Fk, b - 1.02, b - 0.9, y0, y1, 0, 0.06, c.orn); }
    barockFenster(S, Fk, b / 2, gs[0] + 1.6, Math.min(1.0, b * 0.18), 2.2, c.orn);
    fscheibe(S, Fk, b / 2, gs[0] * 0.55, 0, 0.06, 0.6, c.orn); fscheibe(S, Fk, b / 2, gs[0] * 0.55, -0.1, 0.08, 0.42, GLAS_DUNKEL);
    // Schallarkaden und Zifferblatt
    const nS = b > 6 ? 2 : 1, sb = b / (nS + 1), ha = Math.min(3.4, (gs[2] - gs[1]) * 0.5);
    for (let i = 0; i < nS; i++) schallarkade(S, Fk, nS === 1 ? b / 2 : sb * (i + 1), gs[1] + 0.9, Math.min(1.5, b * 0.26), ha, c.orn);
    zifferblatt(S, Fk, b / 2, gs[1] + 0.9 + ha + (gs[2] - gs[1] - ha - 0.9) / 2, Math.min(1.15, b * 0.19, (gs[2] - gs[1] - ha - 1.2) / 2), 0.05, c.uhr);
    // Balustrade auf dem Gesims unter der Glockenstube
    for (let u = 0.3; u < b - 0.2; u += 0.45) fb(S, Fk, u - 0.07, u + 0.07, gs[1] + 0.35, gs[1] + 1.05, 0.25, 0.4, c.orn);
    fb(S, Fk, -0.15, b + 0.15, gs[1] + 1.05, gs[1] + 1.2, 0.2, 0.45, c.orn);
    // Turmhelm-Sockel: Eckvasen
    for (const u of [0.3, b - 0.3]) { const [qx, qz] = wp(Fk, u, 0.1); S.box(0.4, 0.7, 0.4, qx, H + 0.7, qz, c.orn); }
  }
  return zwiebelHelm(S, x0 + b / 2, H + 0.35, z0 + b / 2, b, c.helm, c.wand, { hoch: c.hoch ?? 1.15 });
}
function kirchenFarben(r, v) {
  const wand = v === 'dorf' ? WEISS : waehle(r, [WEISS, '#f3ead6', '#f2e6dc', '#eef0e6']);
  return { wand, orn: ORN, lisene: waehle(r, ['#e8cf8f', '#e6c0a8', '#d8e0c8', '#efe6cf', '#e3c78a']), dach: waehle(r, v === 'dorf' ? BIBER : [...BIBER, ...SCHIEFER]),
    helm: waehle(r, v === 'wallfahrt' ? KUPFER : [...KUPFER, ...ZWIEBEL_DUNKEL, '#b4583f']), uhr: waehle(r, ['#2f4f6f', '#3b4046', '#7a2f2f']) };
}
/** Saalbau (Langhaus) entlang z mit Rundbogenfenstern und Pilastern; Giebel vorn (bei zf). */
function langhaus(S, scene, p, c, x0, x1, zb, zf, Hn, o = {}) {
  const B = x1 - x0, L = zf - zb, F = seiten(x0, zb, B, L);
  S.quader(x0, 0, zb, x1, Hn, zf, c.wand);
  S.quader(x0 - 0.2, Hn - 0.5, zb - 0.2, x1 + 0.2, Hn, zf + 0.2, c.orn);
  const joch = o.joch ?? 5.2;
  for (const k of ['r', 'l']) {
    if (!sichtF(p, F[k])) continue;
    const us = achsen(0, L, joch, o.randFront ?? 0.6);
    for (const u of us) {
      barockFenster(S, F[k], u, Hn * 0.38, 1.7, Hn * 0.42, c.orn);
      if (o.ovale !== false) { fscheibe(S, F[k], u, Hn * 0.2, 0, 0.05, 0.8, c.orn); fscheibe(S, F[k], u, Hn * 0.2, -0.1, 0.07, 0.55, GLAS_DUNKEL); }
    }
    for (let i = 0; i <= us.length; i++) {
      const u = i === 0 ? 0.35 : i === us.length ? L - 0.35 : (us[i - 1] + us[i]) / 2;
      fb(S, F[k], u - 0.4, u + 0.4, 0.3, Hn - 0.5, 0, 0.18, c.lisene);
      fb(S, F[k], u - 0.55, u + 0.55, Hn - 1.1, Hn - 0.5, 0, 0.28, c.orn);
      fb(S, F[k], u - 0.5, u + 0.5, 0.3, 1.2, 0, 0.26, dunkler(c.wand, 0.1));
    }
    fb(S, F[k], 0, L, 0.3, 0.9, 0, 0.12, dunkler(c.wand, 0.08));
    const s2 = (2 * B * (o.neig ?? 0.62)) / B;
    if (o.dach !== false) for (let i = 0; i < us.length; i += 2) { dachluke(S, F[k], us[i], Hn, s2, c.dach, B * 0.15, 1.7); if (B > 12) dachluke(S, F[k], us[i + 1] ?? us[i], Hn, s2, c.dach, B * 0.3, 1.2); }
  }
  if (o.dach !== false) dachGiebel(S, F.v, 0, B, -L, 0, Hn, B * (o.neig ?? 0.62), c.dach, c.wand, { ue: 0.45, uf: 0.3, ub: 0.3 });
  if (o.dachreiter !== false && o.dach !== false) {
    const cx = x0 + B / 2, cz = zb + 3, yr = Hn + B * (o.neig ?? 0.62) - 0.6;
    zyl(S, 0.9, 0.9, 2.2, cx, yr, cz, c.wand, 8); zyl(S, 1.05, 1.05, 0.2, cx, yr + 2.2, cz, c.orn, 8);
    for (let i = 0; i < 8; i += 2) { const a = (i * PI) / 4; if (sicht(p, Math.cos(a), Math.sin(a))) S.box(0.35, 1.2, 0.35, cx + Math.cos(a) * 0.82, yr + 1.1, cz + Math.sin(a) * 0.82, GLAS_DUNKEL); }
    zwiebel(S, cx, yr + 2.4, cz, 0.95, 2.6, c.helm ?? KUPFER[0], 10); kreuz(S, cx, yr + 4.6, cz, 1.0);
  }
  for (const k of ['r', 'l']) if (sichtF(p, F[k]) && L > 20) {
    const u = L * 0.62;
    fb(S, F[k], u - 1.6, u + 1.6, 0.3, 4.2, 0, 1.4, c.wand);
    haustuer(S, teil(F[k], 0, L, 1.4), u, 0.3, 1.4, 2.6, HOLZ[0], c.orn, true);
    dachGiebel(S, teil(F[k], u - 1.6, u + 1.6, 1.4), 0, 3.2, -1.4, 0, 4.2, 1.4, c.dach, c.wand, { ue: 0.2, uf: 0.2, ub: 0 });
  }
  return F;
}
function chorApsis(S, p, c, xm, z1, Bc, Lc, Hc) {
  // Chor: Rechteck z1-Lc..z1, dann halbrunde Apsis nach hinten
  const x0 = xm - Bc / 2, F = seiten(x0, z1 - Lc, Bc, Lc);
  S.quader(x0, 0, z1 - Lc, x0 + Bc, Hc, z1, c.wand);
  const g = new THREE.CylinderGeometry(Bc / 2, Bc / 2, Hc, 10, 1, false, PI / 2, PI); g.translate(xm, Hc / 2, z1 - Lc); S.add(g, c.wand);
  const k = new THREE.ConeGeometry(Bc / 2 + 0.4, Bc * 0.5, 10, 1, false, PI / 2, PI); k.translate(xm, Hc + Bc * 0.25, z1 - Lc); S.add(k, c.dach);
  dachGiebel(S, F.v, 0, Bc, -Lc, 0, Hc, Bc * 0.5, c.dach, null, { ue: 0.4, uf: 0, ub: 0 });
  for (const kk of ['r', 'l']) if (sichtF(p, F[kk])) fbogen(S, F[kk], Lc / 2, Hc * 0.35, 1.5, Hc * 0.45, -0.1, 0.06, GLAS_DUNKEL);
  for (let i = 0; i < 5; i++) {
    const a = PI + (i + 0.5) * (PI / 5), nx = Math.cos(a), nz = Math.sin(a);
    if (!sicht(p, nx, nz)) continue;
    const ax = xm + nx * (Bc / 2), az = z1 - Lc + nz * (Bc / 2);
    const Fa = R(ax - nz * 0.8, az + nx * 0.8, nz, -nx, 1.6);
    fbogen(S, Fa, 0.8, Hc * 0.35, 1.3, Hc * 0.42, -0.1, 0.08, GLAS_DUNKEL);
  }
}
function kircheRoh(S, scene, p) {
  const r = rng(`ki:${p.seed}`);
  const v = p.variante ?? waehle(r, KIRCHE_V);
  const c = kirchenFarben(r, v);
  const { w, d } = p, xm = w / 2;
  let top = 0;
  if (v === 'dorf') {
    // Kirchhof mit Mauer, Gräbern, Linde
    const zf = d - 4, B = 10, L = Math.min(22, d - 14), Hn = 8.5, tb = 5.2;
    boden(S, 0, 0, w, d, '#a9c48f', 0.3, 0.05);
    boden(S, xm - 1.2, zf, xm + 1.2, d, KIES, 0.3, 0.08);
    const mauer = (x0, z0, x1, z1) => { S.quader(x0, 0.3, z0, x1, 1.7, z1, WEISS); S.quader(x0 - 0.1, 1.7, z0 - 0.1, x1 + 0.1, 1.95, z1 + 0.1, waehle(r, BIBER)); };
    mauer(1, d - 1.6, xm - 1.6, d - 1); mauer(xm + 1.6, d - 1.6, w - 1, d - 1); mauer(w - 1.6, 1, w - 1, d - 1); mauer(1, 1, 1.6, d - 1); mauer(1, 1, w - 1, 1.6);
    S.quader(xm - 1.8, 0.3, d - 1.7, xm - 1.4, 2.8, d - 0.9, WEISS); S.quader(xm + 1.4, 0.3, d - 1.7, xm + 1.8, 2.8, d - 0.9, WEISS);
    const zt = zf - tb - 1, zn = zt - L;
    langhaus(S, scene, p, c, xm - B / 2, xm + B / 2, zn, zt, Hn, { joch: 4.6, ovale: false });
    chorApsis(S, p, c, xm, zn + 0.01, B * 0.72, 4, Hn * 0.85);
    top = kirchturm(S, scene, p, xm - tb / 2, zt, tb, 19 + r() * 4, { ...c, hoch: 1.25 });
    const FT = seiten(xm - tb / 2, zt, tb, tb);
    if (sichtF(p, FT.v)) haustuer(S, FT.v, tb / 2, 0.3, 1.6, 2.6, HOLZ[0], c.orn, true);
    // Gräber rund um die Kirche
    friedhof(S, r, 1.8, 1.8, w - 1.8, zf - 1, (gx, gz) => !(Math.abs(gx - xm) < B / 2 + 2.2 && gz > zn - 7) && !(gx > w - 9 && gz < 9));
    // Leichenhaus und Kriegerdenkmal
    const lx = w - 8.5, lz = 2.2;
    S.quader(lx, 0.3, lz, lx + 6, 3.4, lz + 4.5, WEISS);
    dachGiebel(S, R(lx, lz + 4.5, 1, 0, 6), 0, 6, -4.5, 0, 3.4, 2.4, c.dach, WEISS, { ue: 0.3, uf: 0.3, ub: 0.3 });
    const FL = seiten(lx, lz, 6, 4.5);
    if (sichtF(p, FL.v)) { haustuer(S, FL.v, 3, 0.3, 1.4, 2.2, HOLZ[0], c.orn, true); kreuz(S, lx + 3, 6.0, lz + 4.6, 0.9, '#3b4046'); }
    if (sichtF(p, FL.l)) fbogen(S, FL.l, 2.25, 1.4, 0.8, 1.4, -0.1, 0.06, GLAS_DUNKEL);
    S.box(1.6, 0.6, 1.6, xm + B / 2 + 3.5, 0.6, zf - 1.2, '#c9c3b6'); S.box(0.9, 2.2, 0.9, xm + B / 2 + 3.5, 2.0, zf - 1.2, '#c9c3b6'); S.box(0.5, 0.9, 0.5, xm + B / 2 + 3.5, 3.55, zf - 1.2, '#7a8288');
    baumRund(S, w - 6, d - 7, r, 1.25); baumRund(S, 6, zf - 2, r, 1.0);
    for (const x of [xm - 3, xm + 3]) bank(S, x, zf + 1.6, PI);
    return { hoehe: top };
  }
  if (v === 'wallfahrt') {
    // Wallfahrtskirche auf Terrasse: Zentralbau mit Kuppel, Chor, seitlicher Turm, Freitreppe
    const ter = 2.2, zf = d - 8, Rz = Math.min(11, w * 0.22), zc = zf - Rz - 1;
    boden(S, 0, 0, w, d, WIESE, 0.3, 0.05);
    S.quader(4, 0, 4, w - 4, ter, zf + 1, '#d9d1c0');
    S.quader(4.2, ter, 4.2, w - 4.2, ter + 0.08, zf + 0.8, KIES);
    for (let i = 0; i < 7; i++) S.quader(xm - 5 + 0, 0.3 + i * (ter - 0.3) / 7, zf + 1 + (7 - i) * 0.55 - 0.55, xm + 5, 0.3 + (i + 1) * (ter - 0.3) / 7, zf + 1 + (7 - i) * 0.55, '#e3dccd');
    // Umgang mit Arkaden an beiden Seiten, Kreuzwegstationen am Rand
    for (const [x, Fa] of [[4.2, R(8.2, zf + 0.6, 0, -1, zf - 5)], [w - 8.2, R(w - 8.2, 5.6, 0, 1, zf - 5)]]) {
      S.quader(x, ter, 4.6, x + 4, ter + 4.2, zf + 0.6, '#efe9dc');
      if (sichtF(p, Fa)) {
        const nB = Math.floor((zf - 5) / 3.2);
        fwand(S, Fa, 0, zf - 5, ter, ter + 4.2, 0, 0.12, '#f4efe4', Array.from({ length: nB }, (_, i) => ({ u0: i * 3.2 + 0.6, u1: (i + 1) * 3.2 - 0.3, v0: ter, v1: ter + 3.4, bogen: true })));
        fb(S, Fa, 0, zf - 5, ter + 0.1, ter + 3.2, -3.6, -3.5, '#d8cfbd');
      }
      dachTrauf(S, R(x, zf + 0.6, 1, 0, 4), 0, 4, zf - 4, ter + 4.2, 1.2, c.dach, null, { ue: 0.2, us: 0.2 });
      walm(S, x, 4.6, x + 4, zf + 0.6, ter + 4.2, 1.5, c.dach, 0.35);
    }
    for (let i = 0; i < 7; i++) { const sx = 10 + i * ((w - 20) / 6), sz = 1.6; S.box(0.7, 2.0, 0.5, sx, 1.3, sz, '#efe9dc'); S.box(0.9, 0.25, 0.7, sx, 2.4, sz, c.dach); S.box(0.4, 0.5, 0.06, sx, 1.7, sz + 0.27, waehle(r, ['#6f9bc4', '#c9483e', GOLD])); }
    versetzt(S, scene, 0, ter, 0, (T, g) => {
      const Hz = 13;
      zyl(T, Rz, Rz, Hz, xm, 0, zc, c.wand, 8);
      zyl(T, Rz + 0.25, Rz + 0.25, 0.5, xm, Hz - 0.5, zc, c.orn, 8);
      for (let i = 0; i < 8; i++) {
        const a = i * (PI / 4), nx = Math.cos(a), nz = Math.sin(a);
        if (!sicht(p, nx, nz)) continue;
        const kante = 2 * Rz * Math.sin(PI / 8);
        const mx = xm + nx * Rz * Math.cos(PI / 8), mz = zc + nz * Rz * Math.cos(PI / 8);
        const dx = nz, dz = -nx; // Laufrichtung so, dass die Normale nach außen zeigt
        const Fo = R(mx - (dx * kante) / 2, mz - (dz * kante) / 2, dx, dz, kante);
        fbogen(T, Fo, kante / 2, Hz * 0.32, Math.min(2.0, kante * 0.4), Hz * 0.42, -0.1, 0.08, GLAS_DUNKEL);
        fscheibe(T, Fo, kante / 2, Hz * 0.86, -0.1, 0.08, 0.6, GLAS_DUNKEL);
        fbogen(T, Fo, kante / 2, Hz * 0.32 - 0.2, Math.min(2.0, kante * 0.4) + 0.5, Hz * 0.42 + 0.45, 0, 0.05, c.orn);
        fb(T, Fo, -0.05, 0.55, 0.3, Hz - 0.5, 0, 0.15, c.lisene);
      }
      // Tambour, Kuppel, Laterne
      zyl(T, Rz * 0.62, Rz * 0.62, 3.2, xm, Hz, zc, c.wand, 8);
      const kup = new THREE.LatheGeometry([[Rz * 0.68, 0], [Rz * 0.66, Rz * 0.22], [Rz * 0.58, Rz * 0.4], [Rz * 0.42, Rz * 0.55], [Rz * 0.2, Rz * 0.64], [0.001, Rz * 0.66]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
      kup.translate(xm, Hz + 3.2, zc); T.add(kup, c.helm);
      // Kuppelrippen, Tambourfenster, Gesimse
      const prof = [[0.69, 0], [0.67, 0.22], [0.59, 0.4], [0.43, 0.55], [0.21, 0.64]];
      for (let i = 0; i < 8; i++) { const a = (i * PI) / 4 + PI / 8; for (let k = 0; k < prof.length - 1; k++) stab(T, [xm + Math.cos(a) * prof[k][0] * Rz, Hz + 3.2 + prof[k][1] * Rz, zc + Math.sin(a) * prof[k][0] * Rz], [xm + Math.cos(a) * prof[k + 1][0] * Rz, Hz + 3.2 + prof[k + 1][1] * Rz, zc + Math.sin(a) * prof[k + 1][0] * Rz], 0.22, c.orn, 4); }
      zyl(T, Rz * 0.7, Rz * 0.7, 0.3, xm, Hz + 3.0, zc, c.orn, 8);
      for (const { F: Ft, nx, nz, kante } of oktoRahmen(xm, zc, Rz * 0.62 * Math.cos(PI / 8))) { if (!sicht(p, nx, nz)) continue; fscheibe(T, teil(Ft, 0, kante), kante / 2, Hz + 1.6, 0, 0.06, 0.95, c.orn, 12); fscheibe(T, teil(Ft, 0, kante), kante / 2, Hz + 1.6, -0.1, 0.09, 0.68, GLAS_DUNKEL, 12); fb(T, Ft, -0.05, 0.35, Hz, Hz + 3.2, 0, 0.12, c.lisene); }
      for (let i = 0; i < 8; i++) { const a = (i * PI) / 4; if (sicht(p, Math.cos(a), Math.sin(a))) T.box(0.45, 1.3, 0.45, xm + Math.cos(a) * 1.15, Hz + 3.2 + Rz * 0.6 + 1.2, zc + Math.sin(a) * 1.15, GLAS_DUNKEL); }
      const yl = Hz + 3.2 + Rz * 0.6;
      zyl(T, 1.2, 1.2, 2.4, xm, yl, zc, c.wand, 8);
      zwiebel(T, xm, yl + 2.4, zc, 1.25, 3.0, c.helm, 10);
      kreuz(T, xm, yl + 5.0, zc, 1.4);
      // Chor nach hinten
      chorApsis(T, p, c, xm, zc - Rz + 1.5, Rz * 0.8, 6, Hz * 0.85);
      // Vorhalle
      const Fv = seiten(xm - 3.5, zc + Rz - 1, 7, 3.2);
      T.quader(xm - 3.5, 0, zc + Rz - 1, xm + 3.5, 8, zc + Rz + 2.2, c.wand);
      fpoly(T, Fv.v, giebelUmriss(0, 7, 8, 3.6, 'geschweift'), -0.4, 0, c.wand);
      if (sichtF(p, Fv.v)) { haustuer(T, Fv.v, 3.5, 0, 2.0, 3.6, HOLZ[0], c.orn, true); fscheibe(T, Fv.v, 3.5, 6.3, 0, 0.08, 0.7, GLAS_DUNKEL); fb(T, Fv.v, -0.1, 7.1, 7.8, 8.15, 0, 0.3, c.orn); }
      // Turm seitlich hinten
      top = kirchturm(T, g, p, xm + Rz * 0.55, zc - Rz - 1.5, 5.4, 26, { ...c, hoch: 1.2 });
      return null;
    });
    kastanie(S, 8, zf + 4.5, r, 0.8); kastanie(S, w - 8, zf + 4.5, r, 0.8);
    return { hoehe: top + ter };
  }
  // doppelturm / stadtpfarr
  const zf = d - 6, dt = v === 'doppelturm';
  const B = dt ? Math.min(18, w - 16) : Math.min(15, w - 14), L = Math.min(dt ? 36 : 32, d - 22), Hn = dt ? 16 : 14;
  const tb = dt ? 6.4 : 7.2, Ht = dt ? 30 : 34;
  boden(S, 0, zf - 2, w, d, PFLASTER, 0.3, 0.06);
  boden(S, 0, 0, w, zf - 2, PFLASTER2, 0.3, 0.05);
  const x0 = xm - B / 2, x1 = xm + B / 2;
  const zn1 = dt ? zf : zf - tb + 0.5, zn0 = zn1 - L;
  const Fl = langhaus(S, scene, p, c, x0, x1, zn0, zn1, Hn, { randFront: dt ? 0.6 : 0.6 });
  chorApsis(S, p, c, xm, zn0 + 0.01, B * 0.7, 8, Hn * 0.88);
  if (dt) {
    // Fassade mit Volutengiebel zwischen zwei Türmen
    const hg = 8.5;
    fpoly(S, Fl.v, giebelUmriss(tb - 1.2, B - tb + 1.2, Hn, hg, 'geschweift'), -0.5, 0.25, c.wand);
    fb(S, Fl.v, -0.2, B + 0.2, Hn - 0.5, Hn, 0, 0.5, c.orn);
    if (sichtF(p, Fl.v)) {
      haustuer(S, Fl.v, B / 2, 0.3, 2.4, 4.4, HOLZ[0], c.orn, true);
      fpoly(S, Fl.v, [[B / 2 - 2.4, 5.4], [B / 2 + 2.4, 5.4], [B / 2, 6.6]], 0, 0.4, c.orn);
      fbogen(S, Fl.v, B / 2, 8.0, 2.2, 5.0, -0.1, 0.3, GLAS_DUNKEL);
      fscheibe(S, Fl.v, B / 2, Hn + 3.4, 0.25, 0.32, 1.0, GLAS_DUNKEL);
      for (const u of [tb - 0.9, B - tb + 0.9]) fb(S, Fl.v, u - 0.45, u + 0.45, 0.3, Hn, 0, 0.35, c.lisene);
    }
    S.box(0.5, 2.2, 0.5, xm, Hn + hg + 0.6, zf, c.orn); kreuz(S, xm, Hn + hg + 1.7, zf, 1.4);
    if (sichtF(p, Fl.v)) {
      // Figurennischen, Säulenportal, Vasen auf dem Giebel
      for (const u of [B / 2 - 3.3, B / 2 + 3.3]) { fbogen(S, Fl.v, u, 5.6, 1.0, 2.6, -0.1, 0.06, dunkler(c.wand, 0.2)); zyl(S, 0.25, 0.3, 1.9, ...wp(Fl.v, u, 0.1).flatMap((q, i) => (i === 0 ? [q, 5.7] : [q])), c.orn, 6); fb(S, Fl.v, u - 0.7, u + 0.7, 5.4, 5.6, 0, 0.3, c.orn); }
      for (const u of [B / 2 - 1.8, B / 2 + 1.8]) { const [qx, qz] = wp(Fl.v, u, 0.45); zyl(S, 0.32, 0.36, 5.0, qx, 0.3, qz, c.lisene, 10); }
      fb(S, Fl.v, B / 2 - 2.3, B / 2 + 2.3, 5.2, 5.45, 0, 0.7, c.orn);
      const um = giebelUmriss(tb - 1.2, B - tb + 1.2, Hn, hg, 'geschweift');
      for (const i of [3, um.length - 4]) { const [qx, qz] = wp(Fl.v, um[i][0], 0); S.box(0.5, 0.9, 0.5, qx, um[i][1] + 0.45, qz, c.orn); S.add(new THREE.SphereGeometry(0.3, 6, 5).translate(qx, um[i][1] + 1.1, qz), GOLD); }
    }
    top = Math.max(kirchturm(S, scene, p, x0 - tb / 2 + 1.2, zf - tb + 0.6, tb, Ht, c), kirchturm(S, scene, p, x1 - tb / 2 - 1.2, zf - tb + 0.6, tb, Ht, c));
  } else {
    top = kirchturm(S, scene, p, xm - tb / 2, zf - tb + 0.5, tb, Ht, { ...c, hoch: 1.3 });
    const FT = seiten(xm - tb / 2, zf - tb + 0.5, tb, tb);
    if (sichtF(p, FT.v)) haustuer(S, FT.v, tb / 2, 0.3, 2.0, 3.6, HOLZ[0], c.orn, true);
    // Seitenkapelle mit Fenstern
    S.quader(x1, 0, zn0 + L * 0.45, x1 + 4, Hn * 0.55, zn0 + L * 0.7, c.wand);
    walm(S, x1, zn0 + L * 0.45, x1 + 4, zn0 + L * 0.7, Hn * 0.55, 2.6, c.dach, 0.3);
    const Fk = R(x1 + 4, zn0 + L * 0.7, 0, -1, L * 0.25);
    if (sichtF(p, Fk)) barockFenster(S, Fk, L * 0.125, 2.2, 1.2, 3.0, c.orn);
    // Friedhof an der Seite, Mauer mit Ziegelabdeckung
    const fx0 = x1 + 5.5, fx1 = w - 1.5;
    if (fx1 - fx0 > 7) {
      friedhof(S, r, fx0, 2, fx1, zf - 3);
      for (const [a, b2, e, f] of [[fx0 - 0.5, 1.5, fx0, zf - 2.5], [fx0 - 0.5, zf - 3, fx1, zf - 2.5]]) { S.quader(a, 0.3, b2, e, 1.6, f, c.wand); S.quader(a - 0.1, 1.6, b2 - 0.1, e + 0.1, 1.8, f + 0.1, waehle(r, BIBER)); }
    }
  }
  // Sakristei am Chor
  S.quader(x0 - 4, 0, zn0 + 1, x0, 5.2, zn0 + 7, c.wand);
  walm(S, x0 - 4, zn0 + 1, x0, zn0 + 7, 5.2, 2.0, c.dach, 0.3);
  // Vorplatz mit Mariensäule und Bänken
  for (let i = 0; i < 3; i++) zyl(S, 4 + i * 2.6, 4 + i * 2.6, 0.04 + i * 0.002, xm + B * 0.9, 0.31, zf + 0.2, i % 2 ? PFLASTER : PFLASTER2, 24);
  mariensaeule(S, Math.min(w - 4, xm + B * 0.9), zf + 0.4, 0.33);
  for (const x of [xm - B / 2 - 6, xm - B / 2 - 2.5]) bank(S, x, zf + 3.5, PI);
  for (const x of [4, w - 4]) baumRund(S, x, zf + 2, r, 0.9);
  laterne(S, xm - B / 2 - 3, d - 2); laterne(S, xm + B / 2 + 3, d - 2);
  return { hoehe: top };
}

// =====================================================================================
// 4. Wirtshaus, Bräuhaus, Brauerei mit Biergarten
// =====================================================================================
const WIRT_V = ['wirtshaus', 'braeuhaus', 'brauerei'];
const WIRTSNAMEN = ['Gasthof zur Post', 'Wirtshaus am Anger', 'Gasthof Kreuzwirt', 'Zum Schwarzen Adler', 'Gasthof Ochsen', 'Wirtshaus zum Hirschen', 'Gasthof Stern', 'Zum Goldenen Lamm'];
const BRAEU = ['Brauhaus Mayrhofer', 'Bräuhaus Zum Moosbräu', 'Brauhaus Lohwirt', 'Bräustüberl Hollerer'];
function biergarten(S, scene, r, x0, z0, x1, z1, o = {}) {
  boden(S, x0, z0, x1, z1, KIES, 0.3, 0.07);
  const y = 0.37, nx = Math.max(1, Math.floor((x1 - x0 - 2) / 7)), nz = Math.max(1, Math.floor((z1 - z0 - 2) / 6.5));
  const dx = (x1 - x0) / nx, dz = (z1 - z0) / nz;
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const cx = x0 + (i + 0.5) * dx, cz = z0 + (k + 0.5) * dz;
    kastanie(S, cx + zw(r, -0.6, 0.6), cz + zw(r, -0.6, 0.6), r, zw(r, 0.9, 1.1), y);
    garnitur(S, cx - 2.3, cz + 1.5, y); garnitur(S, cx + 2.3, cz - 1.4, y);
    if (r() < 0.5) garnitur(S, cx + 2.3, cz + 1.6, y);
  }
  // Zaun vorn und rechts
  if (o.zaun !== false) {
    S.quader(x0, 0.3, z1 - 0.15, x1, 1.15, z1, '#a2754a');
    S.quader(x1 - 0.15, 0.3, z0, x1, 1.15, z1, '#a2754a');
    for (let x = x0 + 0.5; x < x1; x += 2) S.box(0.14, 1.2, 0.14, x, 0.9, z1 - 0.07, '#7a5638');
  }
  if (o.ausschank !== false) {
    const ax = x1 - 5.5, az = z0 + 1.2;
    S.quader(ax, 0.3, az, ax + 4.5, 2.9, az + 3, '#efe6d2');
    S.quader(ax - 0.4, 2.9, az - 0.4, ax + 4.9, 3.2, az + 3.6, '#7a5638');
    const Fa = seiten(ax, az, 4.5, 3).v;
    fb(S, Fa, 0.4, 4.1, 1.1, 2.4, -0.05, 0.03, GLAS_DUNKEL);
    fb(S, Fa, 0.3, 4.2, 1.05, 1.2, 0, 0.5, '#a2754a');
    ftext(scene, Fa, 'Ausschank', 2.25, 2.68, 0.06, 0.32, 4, '#f7f2e6', '#3f6b4a');
  }
}
function wirtshausRoh(S, scene, p) {
  const r = rng(`wi:${p.seed}`);
  const v = p.variante ?? waehle(r, WIRT_V);
  const { w, d } = p, zf = d - 2.6, leer = p.zustand === 'leerstand';
  boden(S, 0, zf, w, d, PFLASTER, 0.3, 0.06);
  boden(S, 0, 0, w, zf, PFLASTER2, 0.3, 0.05);
  if (v === 'brauerei') {
    // Sudhaus, Schlot, Silos, Lagerkeller, Bräustüberl mit kleinem Biergarten
    const klinker = waehle(r, ['#a8583f', '#b06a52', '#9e5c47']), putz = '#efe6d2', dach = waehle(r, SCHIEFER), kup = waehle(r, KUPFER);
    const sx = 4, sb = 16, st = 14, sH = 17, sz = zf - st;
    S.quader(sx, 0, sz, sx + sb, sH, zf, klinker);
    const Fs = seiten(sx, sz, sb, st);
    for (const k of ['v', 'r', 'h', 'l']) {
      if (!sichtF(p, Fs[k])) continue;
      const L = Fs[k].L;
      for (const u of achsen(0, L, 3.6, 0.8)) { fbogen(S, Fs[k], u, 1.6, 2.0, 5.4, -0.1, 0.06, GLAS); fbogen(S, Fs[k], u, 1.6, 2.4, 5.6, 0, 0.04, putz); fbogen(S, Fs[k], u, 9.0, 2.0, 5.6, -0.1, 0.06, GLAS); fbogen(S, Fs[k], u, 9.0, 2.4, 5.8, 0, 0.04, putz); }
      fb(S, Fs[k], -0.1, L + 0.1, 7.8, 8.2, 0, 0.2, putz);
      fb(S, Fs[k], -0.1, L + 0.1, sH - 0.6, sH, 0, 0.3, putz);
    }
    dachTrauf(S, Fs.v, 0, sb, st, sH, 5.2, dach, klinker, { ue: 0.4, us: 0.4 });
    zyl(S, 2.0, 2.4, 3.2, sx + sb / 2, sH + 2.2, sz + st / 2, kup, 8);
    zwiebel(S, sx + sb / 2, sH + 5.4, sz + st / 2, 1.9, 3.6, kup, 10);
    if (sichtF(p, Fs.v)) ftext(scene, Fs.v, waehle(r, ['Brauerei Weißbräu', 'Brauerei Moosbräu', 'Brauerei Hollerer', 'Klosterbrauerei']), sb / 2, 13.6, 0.1, 1.0, sb * 0.86, '#f4efe2');
    // Schlot
    const kx = sx + sb + 4, kz = sz + 3;
    zyl(S, 1.9, 1.9, 4, kx, 0, kz, klinker, 8);
    zyl(S, 1.0, 1.5, 30, kx, 4, kz, klinker, 12);
    for (const y of [12, 22, 32]) zyl(S, 1.25 - (y - 4) * 0.016, 1.3 - (y - 4) * 0.016, 0.5, kx, y, kz, '#8a4a36', 12);
    zyl(S, 1.12, 1.05, 1.2, kx, 33.6, kz, '#5a3a2e', 12);
    // Malzsilos
    for (let i = 0; i < 2; i++) { zyl(S, 2.2, 2.2, 13, sx + sb + 4 + i * 5, 0.3, sz - 6, '#c9cdd0', 12); const g = new THREE.ConeGeometry(2.25, 1.4, 12); g.translate(sx + sb + 4 + i * 5, 14.0, sz - 6); S.add(g, '#aab0b5'); }
    // Lagerkeller
    const lx = sx + sb + 10, lb = Math.max(10, w - lx - 3), lt = 12, lz = zf - lt;
    if (lb > 8) {
      S.quader(lx, 0, lz, lx + lb, 7, zf, putz);
      const Fl = seiten(lx, lz, lb, lt);
      for (const k of ['v', 'r']) if (sichtF(p, Fl[k])) { lochfassade(S, Fl[k], 0, Fl[k].L, 1.5, 1, 4.5, { ra: 3.2, fw: 1.4, fh: 1.4, rahmen: ORN, glas: GLAS, simsF: '#d8cfbd' }); }
      if (sichtF(p, Fl.v)) { fbogen(S, Fl.v, lb - 3, 0.3, 3.2, 4.2, -0.1, 0.06, '#5a4636'); }
      dachTrauf(S, Fl.v, 0, lb, lt, 7, 3.2, waehle(r, BIBER), putz, { ue: 0.5, us: 0.4 });
      // Fässer
      for (let i = 0; i < 6; i++) { const g = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 10); g.rotateZ(PI / 2); g.translate(lx + 1.5 + i * 1.2, 0.85 + (i % 2) * 0, zf + 1.0); S.add(g, '#8a5a3a'); }
    }
    // Bräustüberl mit Biergarten links vorn
    const bx0 = 0.5, bz1 = sz - 1;
    if (bz1 > 12) biergarten(S, scene, r, bx0, 1, sx + sb + 2, bz1, { zaun: false, ausschank: false });
    // Leergut auf Paletten
    for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) {
      const px = sx + sb + 3 + i * 2.2, pz = sz - 12 + k * 2.4;
      if (px > w - 2 || pz < 1) continue;
      S.box(1.9, 0.15, 1.9, px, 0.38, pz, '#c99a63');
      const hh = 0.5 * (1 + ((i + k) % 3));
      S.box(1.7, hh, 1.7, px, 0.45 + hh / 2, pz, waehle(r, ['#c9483e', '#3f7d56', '#d39a2b', '#2f6f8f']));
    }
    // Lkw
    S.box(2.3, 2.4, 2.4, w - 6, 1.6, d - 1.4 - 1.2, '#2f6f8f'); S.box(4.4, 2.6, 2.4, w - 9.6, 1.7, d - 1.4 - 1.2, '#e8e3d8');
    for (let i = 0; i < 4; i++) S.box(0.9, 0.7, 0.9, w - 11 + i * 1.0, 0.65, d - 0.6, waehle(r, ['#c9483e', '#3f7d56', '#d39a2b']));
    return { hoehe: 34.8 };
  }
  // Wirtshaus oder Bräuhaus
  const brau = v === 'braeuhaus';
  const hb = brau ? Math.min(30, w * 0.55) : Math.min(20, w * 0.48), ht = brau ? 17 : 13, n = brau ? 3 : 2;
  const eg = brau ? 4.6 : 3.8, gh = brau ? 3.6 : 3.1, H = eg + n * gh;
  const wand = brau ? waehle(r, ['#efe6d2', '#f1e2c4', '#e8dcc8', '#f3ede2']) : waehle(r, [WEISS, '#f3ead3', '#f1e6d6', '#f6efdc']);
  const laedenF = waehle(r, ['#3f6b4a', '#2f5d4a', '#6b3a2e', '#466b8a']);
  const dachF = waehle(r, BIBER), hz = zf - ht;
  S.quader(0.5, 0, hz, 0.5 + hb, H, zf, wand);
  const F = seiten(0.5, hz, hb, ht);
  const name = brau ? waehle(r, BRAEU) : waehle(r, WIRTSNAMEN);
  for (const k of ['v', 'r', 'h', 'l']) {
    if (!sichtF(p, F[k])) continue;
    const Fk = F[k], L = Fk.L, front = k === 'v';
    fb(S, Fk, 0, L, 0.3, 0.9, -0.1, 0.12, dunkler(wand, 0.12));
    const us = achsen(0, L, brau ? 3.2 : 2.9, 0.8);
    us.forEach((u, i) => {
      if (front && i === Math.floor(us.length / 2)) { haustuer(S, Fk, u, 0.3, 1.6, 2.7, waehle(r, HOLZ), '#e8dcc0', true); return; }
      fenster(S, Fk, u, 1.2, 1.2, brau ? 2.4 : 1.6, { rahmen: ORN, glas: GLAS, laeden: brau ? null : laedenF, bogen: brau, fasche: '#e8dcc0', simsF: '#e8dcc0' });
    });
    for (let kk = 0; kk < n; kk++) for (const u of us) fenster(S, Fk, u, eg + kk * gh + 0.8, 1.15, 1.6, { rahmen: ORN, glas: GLAS, laeden: laedenF, fasche: brau ? null : '#e8dcc0', blumen: !brau && kk === 0 && r() < 0.8 ? '#d0453a' : null, simsF: '#e8dcc0' });
    fb(S, Fk, -0.05, L + 0.05, eg - 0.1, eg + 0.12, 0, 0.12, '#e8dcc0');
    if (front) {
      ftext(scene, Fk, name, L / 2, eg + n * gh - 0.25 - (brau ? 0 : 0.0) + 0.0, 0.08, brau ? 1.0 : 0.62, L * 0.6, '#5a3a2a');
      // Wirtshausausleger
      const ua = us[Math.floor(us.length / 2)] + 1.6;
      fb(S, Fk, ua - 0.05, ua + 0.05, eg + 0.3, eg + 0.42, 0, 1.6, '#2b2f33');
      fscheibe(S, teil(Fk, ua - 0.8, ua + 0.8, 1.2), 0.8, eg - 0.4, -0.04, 0.04, 0.6, GOLD, 12);
      fb(S, Fk, ua - 0.05, ua + 0.05, eg - 0.4, eg + 0.35, 1.15, 1.25, '#2b2f33');
    }
  }
  if (brau) {
    dachTrauf(S, F.v, 0, hb, ht, H, ht * 0.52, dachF, wand, { ue: 0.6, us: 0.5 });
    if (sichtF(p, F.v)) for (const u of achsen(0, hb, 4.2, 1)) gaube(S, F.v, u, H, (2 * ht * 0.52) / ht, 1.7, wand, dachF, GLAS);
    S.quader(0.5 + hb * 0.4, H + 4, hz + ht / 2 - 0.5, 0.5 + hb * 0.4 + 1, H + ht * 0.52 + 1, hz + ht / 2 + 0.5, '#b9a89a');
  } else if (r() < 0.5) {
    walm(S, 0.5, hz, 0.5 + hb, zf, H, ht * 0.4, dachF, 0.7);
  } else {
    dachTrauf(S, F.v, 0, hb, ht, H, ht * 0.42, dachF, wand, { ue: 0.8, us: 0.7 });
  }
  // Biergarten rechts
  const bx0 = hb + 2.5;
  if (w - bx0 > 10) biergarten(S, scene, r, bx0, 2, w - 0.5, zf - 0.5);
  if (sichtF(p, { nx: 0, nz: 1 })) ftext(scene, R(bx0, zf - 0.3, 1, 0, 10), 'Biergarten', 3.2, 1.75, 0.2, 0.7, 6, '#f7f2e6', '#3f6b4a');
  // Hinterhof mit Bänken
  if (hz > 10) biergarten(S, scene, r, 0.5, 1, hb, hz - 1.5, { zaun: false, ausschank: false });
  void leer;
  return { hoehe: H + ht * 0.55 };
}

// =====================================================================================
// 5. Maibaum mit Zunftzeichen
// =====================================================================================
const MAI_V = ['dorf', 'markt', 'fest'];
function maibaum(S, x, z, H, r, y0 = 0.3) {
  // Stamm weiß mit blauer Spirale
  zyl(S, 0.24, 0.46, H, x, y0, z, '#f3f1ea', 10);
  class Helix extends THREE.Curve {
    getPoint(t) { const y = y0 + 3 + t * (H - 6), rr = 0.47 - 0.22 * ((y - y0) / H) + 0.02, a = t * 2 * PI * 12; return new THREE.Vector3(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr); }
  }
  S.add(new THREE.TubeGeometry(new Helix(), 300, 0.17, 4, false), '#2f6fb0');
  zyl(S, 0.52, 0.52, 3, x, y0, z, '#2f6fb0', 10);
  // Zunftzeichen paarweise
  const zeichen = ['#c9483e', '#3f7d56', '#d39a2b', '#2f6f8f', '#8c3b3b', '#6b4f8f', '#e07a3f'];
  const stufen = Math.floor((H - 12) / 3.2);
  for (let i = 0; i < stufen; i++) {
    const y = y0 + 7 + i * 3.2, rr = 0.47 - 0.22 * ((y - y0) / H);
    const dir = i % 2 === 0 ? [1, 0] : [0, 1];
    for (const sg of [-1, 1]) {
      const ex = x + dir[0] * sg * 2.8, ez = z + dir[1] * sg * 2.8;
      stab(S, [x + dir[0] * sg * rr, y + 0.5, z + dir[1] * sg * rr], [ex, y + 0.5, ez], 0.07, '#3b4046', 4);
      const quer = dir[0] === 0;
      S.box(quer ? 1.9 : 0.1, 1.6, quer ? 0.1 : 1.9, ex, y - 0.4, ez, '#f4efe2');
      S.box(quer ? 1.5 : 0.14, 1.15, quer ? 0.14 : 1.5, ex, y - 0.4, ez, waehle(r, zeichen));
      S.box(quer ? 0.5 : 0.18, 0.6, quer ? 0.18 : 0.5, ex, y + 0.2, ez, '#3b4046');
    }
  }
  // Kranz und Wipfel
  const kr = new THREE.TorusGeometry(1.4, 0.3, 5, 12); kr.rotateX(PI / 2); kr.translate(x, y0 + H - 3.4, z); S.add(kr, '#4f7d4c');
  for (let i = 0; i < 4; i++) { const a = (i / 4) * 2 * PI; S.box(0.08, 1.6, 0.18, x + Math.cos(a) * 1.1, y0 + H - 4.3, z + Math.sin(a) * 1.1, i % 2 ? '#2f6fb0' : '#f3f1ea'); }
  const wf = new THREE.ConeGeometry(1.3, 4.0, 6); wf.translate(x, y0 + H + 1.2, z); S.add(wf, '#4f7d4c');
  // Einfassung
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI; S.box(0.2, 0.9, 0.2, x + Math.cos(a) * 1.4, y0 + 0.45, z + Math.sin(a) * 1.4, i % 2 ? '#2f6fb0' : '#f3f1ea'); }
  zyl(S, 1.45, 1.45, 0.12, x, y0 + 0.82, z, '#f3f1ea', 8, true);
  // Pflasterkreise und Tafel mit den Zünften
  zyl(S, 4.2, 4.2, 0.05, x, y0 + 0.02, z, '#bfb4a0', 20);
  zyl(S, 3.7, 3.7, 0.06, x, y0 + 0.02, z, '#d8cfbd', 20);
  zyl(S, 2.2, 2.2, 0.07, x, y0 + 0.02, z, '#bfb4a0', 16);
  S.box(0.12, 1.6, 0.12, x + 3.0, y0 + 0.8, z + 2.6, '#3b4046'); S.box(1.4, 0.9, 0.08, x + 3.0, y0 + 1.6, z + 2.6, '#f4efe2'); S.box(1.2, 0.18, 0.1, x + 3.0, y0 + 1.85, z + 2.6, '#2f6fb0');
  return H + 3;
}
function maibaumRoh(S, scene, p) {
  const r = rng(`mb:${p.seed}`);
  const v = p.variante ?? waehle(r, MAI_V);
  const { w, d } = p, xm = w / 2, zm = d / 2;
  boden(S, 0, 0, w, d, v === 'dorf' ? KIES : PFLASTER, 0.3, 0.06);
  if (v === 'markt') for (let i = 0; i < 6; i++) boden(S, 0, (i * d) / 6, w, (i * d) / 6 + 0.25, PFLASTER2, 0.36, 0.01);
  // Höhe nach Platztyp, Platzgröße und Nachbarbebauung: Dorf etwa 20 m, Markt etwa 25 m
  const basisH = { dorf: 20, markt: 25, fest: 22 }[v] ?? 22;
  const H = p.nachbarHoehe ? Math.max(16, Math.min(30, p.nachbarHoehe * 1.6)) : basisH * Math.max(0.85, Math.min(1.1, Math.min(w, d) / 28));
  let top = 0;
  // Rahmen des Platzes: Bäume und Beete an den Rändern
  const rand = (x, z, i) => { if (i % 2) { boden(S, x - 1.6, z - 1.0, x + 1.6, z + 1.0, '#8fb873', 0.3, 0.3); for (let k = 0; k < 3; k++) S.box(0.6, 0.3, 0.5, x - 1 + k, 0.75, z, waehle(r, ['#d0453a', '#e8b53c', '#e05a7a', '#f4efe2'])); } else baumRund(S, x, z, r, zw(r, 0.75, 0.95)); };
  if (v !== 'markt') [[2.2, 2.2], [w - 2.2, 2.2], [2.2, d * 0.5], [w * 0.5, 2.2]].forEach(([x, z], i) => rand(x, z, i));
  else [[w * 0.5, 2.2], [2.2, d * 0.5]].forEach(([x, z]) => rand(x, z, 0));
  if (v === 'dorf') {
    top = maibaum(S, xm - w * 0.12, zm - d * 0.08, H, r);
    baumRund(S, xm + w * 0.22, zm + d * 0.1, r, 1.5);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI; S.box(0.4, 0.5, 1.4, xm + w * 0.22 + Math.cos(a) * 2.1, 0.55, zm + d * 0.1 + Math.sin(a) * 2.1, '#9a6e45', -a); }
    brunnen(S, xm + w * 0.15, zm - d * 0.28, 1.6, { art: 'trog' });
    boden(S, 0, 0, w, 2.5, WIESE, 0.3, 0.08);
    for (const x of [2, w - 2]) busch(S, x, 1.5, r, 1.2);
    // Wegweiser und Wegkreuz
    S.box(0.18, 3.2, 0.18, 3, 1.9, d - 3, '#7a5638'); S.box(1.6, 0.18, 0.18, 3, 2.6, d - 3, '#7a5638');
    S.box(0.6, 0.5, 0.3, 3, 2.9, d - 3, '#d0b48a');
  } else if (v === 'markt') {
    brunnen(S, xm + w * 0.12, zm + d * 0.05, Math.min(3.4, w * 0.12), { figurF: waehle(r, [GOLD, '#7aa68a', '#e9e4d8']) });
    top = maibaum(S, xm - w * 0.24, zm - d * 0.22, H, r);
    for (const [x, z] of [[2.5, 2.5], [w - 2.5, 2.5], [w - 2.5, d - 2.5], [2.5, d - 2.5]]) { S.box(1.6, 0.8, 1.6, x, 0.7, z, '#c9c3b6'); busch(S, x, z, r, 1.0, 1.1); }
    for (let i = 0; i < 3; i++) bank(S, xm + w * 0.12 + (i - 1) * 3, zm + d * 0.05 + 5.2, PI);
    for (const x of [w * 0.15, w * 0.85]) laterne(S, x, d - 1.5);
    // Marktstände
    for (let i = 0; i < 2; i++) {
      const sx = xm + w * 0.2 + i * 4.6, sz = d * 0.2;
      S.box(3.6, 0.9, 1.8, sx, 0.75, sz, '#c99a63');
      S.box(0.1, 2.4, 0.1, sx - 1.7, 1.5, sz - 0.8, '#7a5638'); S.box(0.1, 2.4, 0.1, sx + 1.7, 1.5, sz - 0.8, '#7a5638');
      const g = new THREE.BoxGeometry(4.0, 0.12, 2.4); g.rotateX(0.18); g.translate(sx, 2.7, sz); S.add(g, i ? '#c9483e' : '#f2efe6');
      for (let k = 0; k < 4; k++) S.box(0.7, 0.3, 0.6, sx - 1.2 + k * 0.8, 1.35, sz, waehle(r, ['#d0453a', '#e8b53c', '#7fae5a', '#e07a3f']));
    }
  } else {
    top = maibaum(S, xm, zm - d * 0.15, H, r);
    // Festbänke im Kreis um den Maibaum, Musikpavillon, Standl
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI; garnitur(S, xm + Math.cos(a) * 7, zm - d * 0.15 + Math.sin(a) * 7, 0.36, -a + PI / 2); }
    const px = w * 0.18, pz = d * 0.75;
    zyl(S, 3.2, 3.2, 0.8, px, 0.3, pz, '#d9d1c0', 8);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI; S.box(0.18, 2.8, 0.18, px + Math.cos(a) * 2.9, 2.5, pz + Math.sin(a) * 2.9, '#f3f1ea'); }
    const g = new THREE.ConeGeometry(3.7, 2.2, 8); g.rotateY(PI / 8); g.translate(px, 5.0, pz); S.add(g, '#3f6b4a');
    const sx = w * 0.8, sz = d * 0.75;
    S.quader(sx - 2.4, 0.3, sz - 1.6, sx + 2.4, 2.6, sz + 1.6, '#efe6d2');
    const gs = new THREE.BoxGeometry(5.6, 0.14, 4.0); gs.rotateX(0.1); gs.translate(sx, 2.8, sz); S.add(gs, '#2f6fb0');
    ftext(scene, R(sx - 2.4, sz + 1.6, 1, 0, 4.8), 'Brezn · Bier', 2.4, 2.1, 0.05, 0.4, 4.2, '#2f4f6f');
    // Wimpelkette
    for (let i = 0; i < 12; i++) { const t = i / 11; S.box(0.35, 0.45, 0.05, xm - 10 + t * 20, 5.0 - Math.sin(t * PI) * 0.8, zm + d * 0.25, i % 2 ? '#2f6fb0' : '#f3f1ea'); }
    stab(S, [xm - 10, 5.2, zm + d * 0.25], [xm + 10, 5.2, zm + d * 0.25], 0.03, '#3b4046', 4);
    for (const x of [xm - 10, xm + 10]) S.box(0.14, 5.4, 0.14, x, 2.9, zm + d * 0.25, '#7a5638');
  }
  return { hoehe: top };
}

// =====================================================================================
// Fachwerk-Helfer (Franken und Schwaben)
// =====================================================================================
/**
 * Ein Fachwerkgeschoss auf einem Rahmen. us: Fensterachsen. art: 'franken' (Andreaskreuze, Rauten), 'schwaben' (Mann-Figuren, K-Streben).
 * t: Wandflucht dieses Geschosses (Vorkragung).
 */
function fwGeschoss(S, F, u0, u1, y, gh, t, holz, us, fw, fh, art, fen) {
  const bh = 0.22, t1 = t + 0.07;
  fb(S, F, u0, u1, y, y + bh, t, t1 + 0.04, holz);
  fb(S, F, u0, u1, y + gh - bh, y + gh, t, t1, holz);
  const ys = y + 0.95;
  // Pfosten an den Rändern und zwischen den Fenstern
  const pf = [u0 + 0.12, u1 - 0.12];
  for (let i = 0; i < us.length - 1; i++) pf.push((us[i] + us[i + 1]) / 2);
  for (const u of pf) fb(S, F, u - 0.12, u + 0.12, y + bh, y + gh - bh, t, t1, holz);
  for (const u of us) {
    fb(S, F, u - fw / 2 - 0.26, u - fw / 2 - 0.04, y + bh, y + gh - bh, t, t1, holz);
    fb(S, F, u + fw / 2 + 0.04, u + fw / 2 + 0.26, y + bh, y + gh - bh, t, t1, holz);
    fb(S, F, u - fw / 2 - 0.1, u + fw / 2 + 0.1, ys - 0.1, ys + 0.06, t, t1, holz);
    fb(S, F, u - fw / 2 - 0.1, u + fw / 2 + 0.1, ys + fh, ys + fh + 0.16, t, t1, holz);
    fenster(S, F, u, ys + 0.06, fw, fh - 0.06, { ...fen, t, sims: false });
    if (art === 'franken') { fdiag(S, F, u - fw / 2, y + bh, u + fw / 2, ys - 0.1, 0.16, t, t1, holz); fdiag(S, F, u - fw / 2, ys - 0.1, u + fw / 2, y + bh, 0.16, t, t1, holz); }
  }
  // Streben in den Zwischenfeldern
  const felder = [];
  const kanten = [u0 + 0.24, ...us.flatMap((u) => [u - fw / 2 - 0.26, u + fw / 2 + 0.26]), u1 - 0.24].sort((a, b) => a - b);
  for (let i = 0; i < kanten.length - 1; i += 2) if (kanten[i + 1] - kanten[i] > 0.7) felder.push([kanten[i], kanten[i + 1]]);
  for (const [a, b] of felder) {
    const m = (a + b) / 2;
    if (art === 'schwaben') {
      fdiag(S, F, a, y + bh, m, y + gh * 0.62, 0.17, t, t1, holz);
      fdiag(S, F, b, y + bh, m, y + gh * 0.62, 0.17, t, t1, holz);
      if (b - a > 1.3) fb(S, F, m - 0.1, m + 0.1, y + bh, y + gh - bh, t, t1, holz);
    } else {
      fdiag(S, F, a, y + gh * 0.5, m, y + gh - bh, 0.16, t, t1, holz);
      fdiag(S, F, m, y + gh - bh, b, y + gh * 0.5, 0.16, t, t1, holz);
      fdiag(S, F, a, y + gh * 0.5, m, y + bh, 0.16, t, t1, holz);
      fdiag(S, F, m, y + bh, b, y + gh * 0.5, 0.16, t, t1, holz);
    }
  }
}
/** Fachwerkgiebel (Dreieck) mit Stockwerksrähmen und Streben. */
function fwGiebel(S, F, u0, u1, y, hg, t, holz, putz, fen, stufen = 2) {
  const um = (u0 + u1) / 2, B = u1 - u0;
  fpoly(S, F, [[u0, y], [u1, y], [um, y + hg]], t - 0.4, t, putz);
  for (let i = 0; i < stufen; i++) {
    const yy = y + (i * hg) / (stufen + 0.4), k = 1 - (yy - y) / hg, bb = B * k;
    fb(S, F, um - bb / 2 + 0.1, um + bb / 2 - 0.1, yy, yy + 0.2, t, t + 0.08, holz);
    const nf = Math.max(1, Math.round((bb - 1) / 2.6) - (i > 0 ? 0 : 0));
    const hh = hg / (stufen + 0.4);
    for (let j = 0; j < nf; j++) {
      const u = um - ((nf - 1) / 2 - j) * Math.min(2.6, bb / (nf + 0.5));
      if (Math.abs(u - um) + 0.6 > (bb * (1 - hh / (hg * k))) / 2) continue;
      fenster(S, F, u, yy + 0.6, 0.8, Math.min(1.2, hh * 0.55), { ...fen, t, sims: false, laeden: null });
      fb(S, F, u - 0.55, u - 0.37, yy + 0.2, yy + hh - 0.1, t, t + 0.08, holz);
      fb(S, F, u + 0.37, u + 0.55, yy + 0.2, yy + hh - 0.1, t, t + 0.08, holz);
    }
  }
  fb(S, F, um - 0.1, um + 0.1, y, y + hg - 0.3, t, t + 0.08, holz);
  fdiag(S, F, u0 + 0.1, y + 0.1, um, y + hg - 0.15, 0.22, t, t + 0.09, holz);
  fdiag(S, F, um, y + hg - 0.15, u1 - 0.1, y + 0.1, 0.22, t, t + 0.09, holz);
}
/**
 * Fachwerkhaus. o: { art, giebelstaendig, steinEG (Sandsteinsockelgeschoss), steinOG, n, eg, gh, kr (Vorkragung), wand, holz, stein, dach, laden, zwerch, choerlein }
 */
function fachwerkHaus(S, scene, r, p, x0, z0, b, T, o, erster, letzter) {
  const F = seiten(x0, z0, b, T), leer = p.zustand === 'leerstand';
  const { n, eg, gh } = o, kr = o.kr ?? 0.3;
  const H = eg + n * gh + kr * 0; // Vorkragung nur nach vorn
  const fen = { rahmen: ORN, glas: GLAS, laeden: o.laedenF, blumen: o.blumen };
  // Körper je Geschoss mit Vorkragung nach vorn
  S.quader(x0, 0, z0, x0 + b, eg, z0 + T, o.steinEG ? o.stein : o.wand);
  for (let k = 0; k < n; k++) S.quader(x0, eg + k * gh, z0, x0 + b, eg + (k + 1) * gh, z0 + T + kr * (k + 1), o.steinOG && k === 0 ? o.stein : o.wand);
  const tTop = kr * n;
  const us = achsen(0, b, o.ra ?? 2.6, 0.5);
  const istStein = (k) => (k < 0 ? o.steinEG : o.steinOG && k === 0);
  const seite = (Fk, L, front, kVersatz) => {
    // Erdgeschoss
    if (front && o.laden !== false) {
      laden(S, scene, Fk, 0.5, L - (L > 8 ? 2.2 : 0.5), eg - 0.3, r, { leer, namen: o.namen, rahmen: o.steinEG ? waehle(r, ['#3f4a53', '#5a4636', '#2f5d4a']) : undefined });
      if (L > 8) haustuer(S, Fk, L - 1.3, 0.3, 1.1, 2.5, waehle(r, HOLZ), o.steinEG ? heller(o.stein, 0.06) : o.holz, o.steinEG);
      if (!o.steinEG) { fb(S, Fk, 0, L, eg - 0.3, eg, 0, 0.1, o.holz); fb(S, Fk, 0, 0.3, 0.3, eg, 0, 0.1, o.holz); fb(S, Fk, L - 0.3, L, 0.3, eg, 0, 0.1, o.holz); }
    } else {
      for (const u of achsen(0, L, 3.0, 0.6)) fenster(S, Fk, u, 1.3, 1.0, 1.4, { ...fen, laeden: o.steinEG ? null : fen.laeden, rahmen: o.steinEG ? heller(o.stein, 0.08) : ORN });
      if (!front) haustuer(S, Fk, L * 0.5, 0.3, 1.0, 2.2, waehle(r, HOLZ), o.holz);
    }
    if (o.steinEG) { fb(S, Fk, -0.03, L + 0.03, eg - 0.25, eg, 0, 0.15, heller(o.stein, 0.06)); fb(S, Fk, -0.03, L + 0.03, 0.3, 0.8, 0, 0.1, dunkler(o.stein, 0.08)); }
    // Obergeschosse
    const ua = front ? us : achsen(0, L, 2.8, 0.6);
    for (let k = 0; k < n; k++) {
      const y = eg + k * gh, t = front ? kr * (k + 1) : 0;
      if (istStein(k)) {
        for (const u of ua) fenster(S, Fk, u, y + 0.85, 1.15, Math.min(1.7, gh * 0.55), { ...fen, t, rahmen: heller(o.stein, 0.1), fasche: heller(o.stein, 0.05), simsF: heller(o.stein, 0.08) });
        fb(S, Fk, -0.03, L + 0.03, y + gh - 0.2, y + gh, t, t + 0.15, heller(o.stein, 0.06));
      } else fwGeschoss(S, Fk, front ? 0 : (kVersatz ? kr * (k + 1) : 0), L, y, gh, t, o.holz, ua, 1.0, Math.min(1.5, gh * 0.5), o.art, fen);
    }
  };
  if (sichtF(p, F.v)) seite(F.v, b, true, false);
  if (sichtF(p, F.h)) seite(F.h, b, false, false);
  for (const [k, ok] of [['r', letzter], ['l', erster]]) if (ok && sichtF(p, F[k])) {
    seite(F[k], T, false, false);
    // Vorkragungsstirnen
    for (let kk = 0; kk < n; kk++) { const y = eg + kk * gh; const Fs = k === 'r' ? R(x0 + b, z0 + T + kr * (kk + 1), 0, -1, kr * (kk + 1)) : R(x0, z0 + T, 0, 1, kr * (kk + 1)); fb(S, Fs, 0, Fs.L, y, y + gh, 0, 0.06, o.holz); }
  }
  // Dach
  const Td = T + tTop;
  let top;
  if (o.giebelstaendig) {
    const hg = b * (o.neig ?? 1.0);
    dachGiebel(S, F.v, 0, b, -T, tTop, H, hg, o.dach, null, { ue: 0.35, uf: 0.45, ub: 0.4 });
    if (sichtF(p, F.v)) fwGiebel(S, F.v, 0, b, H, hg - 0.15, tTop + 0.0, o.holz, o.wand, fen, hg > 8 ? 3 : 2);
    else fpoly(S, F.v, [[0, H], [b, H], [b / 2, H + hg - 0.2]], -0.4, tTop, o.wand);
    if (sichtF(p, F.h)) fwGiebel(S, F.h, 0, b, H, hg - 0.15, 0, o.holz, o.wand, fen, 2);
    else fpoly(S, F.h, [[0, H], [b, H], [b / 2, H + hg - 0.2]], -0.4, 0, o.wand);
    // Schleppgauben auf den Dachflächen
    for (const [k, ok] of [['r', letzter], ['l', erster]]) if (ok && sichtF(p, F[k])) {
      const s = (2 * hg) / b;
      for (const u of achsen(1, T - 1, 4.2, 0.5)) gaube(S, F[k], u, H, s, 1.6, o.wand, o.dach, GLAS, 1.0);
    }
    S.quader(x0 + b * 0.5 - 0.4, H + hg * 0.5, z0 + T * 0.3, x0 + b * 0.5 + 0.4, H + hg + 0.6, z0 + T * 0.3 + 0.8, '#a8988a');
    top = H + hg;
  } else {
    const hd = Td * (o.neig ?? 0.62);
    dachTrauf(S, teil(F.v, 0, b, tTop), 0, b, Td, H, hd, o.dach, o.wand, { ue: 0.5, us: erster || letzter ? 0.4 : 0.02 });
    const s = (2 * hd) / Td;
    top = H + hd;
    if (sichtF(p, F.v)) {
      const Fd = teil(F.v, 0, b, tTop);
      if (o.zwerch && b > 7) {
        // Zwerchhaus mit Aufzugsluke
        const zb = Math.min(4.4, b * 0.45), z0u = b / 2 - zb / 2, hz = gh * 1.25;
        fb(S, Fd, z0u, z0u + zb, H, H + hz, -2.8, 0, o.wand);
        if (o.art) fwGeschoss(S, Fd, z0u, z0u + zb, H, hz * 0.85, 0, o.holz, [b / 2], 1.0, 1.2, o.art, { ...fen, laeden: null });
        fwGiebel(S, Fd, z0u, z0u + zb, H + hz * 0.85, zb * 0.75, 0, o.holz, o.wand, fen, 1);
        dachGiebel(S, Fd, z0u, z0u + zb, -3.4, 0, H + hz * 0.85, zb * 0.75, o.dach, null, { ue: 0.25, uf: 0.5, ub: 0 });
        fb(S, Fd, b / 2 - 0.12, b / 2 + 0.12, H + hz * 0.85 + zb * 0.5, H + hz * 0.85 + zb * 0.5 + 0.24, 0, 1.6, o.holz);
        top = Math.max(top, H + hz * 0.85 + zb * 0.75);
        for (const u of [z0u - 2.0, z0u + zb + 2.0]) if (u > 1 && u < b - 1) gaube(S, Fd, u, H, s, 1.3, o.wand, o.dach, GLAS, 0.9);
      } else for (const u of achsen(0, b, 3.6, 0.8)) gaube(S, Fd, u, H, s, 1.4, o.wand, o.dach, GLAS, 0.9);
      if (o.choerlein) {
        const cu = us[Math.floor(us.length / 2)], y0 = eg + 0.3, t0 = kr;
        fb(S, F.v, cu - 1.1, cu + 1.1, y0 + 0.9, y0 + gh * 0.95, t0, t0 + 0.9, o.choerleinF ?? o.stein);
        fpoly(S, F.v, [[cu - 1.0, y0 + 0.9], [cu + 1.0, y0 + 0.9], [cu, y0 - 0.5]], t0, t0 + 0.75, o.choerleinF ?? o.stein);
        fenster(S, F.v, cu, y0 + 1.5, 1.4, 1.3, { ...fen, t: t0 + 0.9, laeden: null, sims: false });
        fb(S, F.v, cu - 1.2, cu + 1.2, y0 + gh * 0.95, y0 + gh * 0.95 + 0.2, t0 - 0.1, t0 + 1.05, heller(o.stein, 0.08));
        const g = new THREE.ConeGeometry(1.3, 1.6, 4); g.rotateY(PI / 4); g.translate(cu, y0 + gh * 0.95 + 1.0, t0 + 0.5); fgeo(S, F.v, g, o.dach);
      }
    }
    for (const [k, ok] of [['r', letzter], ['l', erster]]) if (ok && sichtF(p, F[k])) {
      const Fk = k === 'r' ? R(x0 + b, z0 + Td, 0, -1, Td) : R(x0, z0, 0, 1, Td);
      if (o.art) fwGiebel(S, Fk, 0, Td, H, hd - 0.2, 0.01, o.holz, o.wand, fen, 2);
    }
    S.quader(x0 + b * 0.6 - 0.4, H + 1, z0 + Td * 0.4, x0 + b * 0.6 + 0.4, top + 0.6, z0 + Td * 0.4 + 0.8, '#a8988a');
  }
  return { top };
}

// =====================================================================================
// 6. Franken: Fachwerk- und Sandsteinhäuser, Stadtmauer
// =====================================================================================
const FRANKEN_V = ['nuernberg', 'bamberg', 'stadtmauer'];
function frankenZeile(S, scene, r, p, v, x0, zf, w, T) {
  const br = teileBreite(r, w, 7.5, 11);
  let xa = x0, H = 0;
  br.forEach((b, i) => {
    const nb = v === 'nuernberg';
    const stein = nb ? waehle(r, ROT_SANDSTEIN) : waehle(r, GELB_SANDSTEIN);
    const ganzStein = nb && r() < 0.4;
    const o = {
      art: ganzStein ? null : 'franken', n: 2 + (r() < 0.5 ? 1 : 0), eg: 4.0, gh: 3.0, kr: ganzStein ? 0 : 0.28,
      wand: ganzStein ? stein : waehle(r, nb ? ['#f2ead8', '#efe3cc', '#f4efe2', '#ead9c0'] : ['#f2e2b8', '#f1d6c4', '#e8eed8', '#f4efe2', '#efd9a8', '#e6d3c8']),
      holz: waehle(r, FW_FRANKEN), stein, steinEG: true, steinOG: nb && r() < 0.6, dach: waehle(r, BIBER),
      giebelstaendig: v === 'bamberg' ? r() < 0.55 : r() < 0.2, neig: 1.05, zwerch: nb ? r() < 0.7 : r() < 0.3, choerlein: nb && r() < 0.45, laedenF: v === 'bamberg' && r() < 0.5 ? '#3f6b4a' : null,
      blumen: r() < 0.3 ? '#d0453a' : null,
    };
    if (ganzStein) { o.steinOG = true; o.n = 2 + (r() < 0.6 ? 1 : 0); }
    if (ganzStein) {
      // reines Sandsteinhaus: Geschosse als Stein
      o.art = 'franken'; o.steinAlle = true;
    }
    const erg = ganzStein ? sandsteinHaus(S, scene, r, p, xa, zf - T, b, T, o, i === 0, i === br.length - 1) : fachwerkHaus(S, scene, r, p, xa, zf - T, b, T, o, i === 0, i === br.length - 1);
    H = Math.max(H, erg.top); xa += b;
  });
  return H;
}
/** Nürnberger Sandsteinhaus: alle Geschosse Stein, steiles Dach mit Zwerchhaus, Chörlein. */
function sandsteinHaus(S, scene, r, p, x0, z0, b, T, o, erster, letzter) {
  const F = seiten(x0, z0, b, T), leer = p.zustand === 'leerstand';
  const H = o.eg + o.n * o.gh, st = o.stein, hst = heller(st, 0.08);
  S.quader(x0, 0, z0, x0 + b, H, z0 + T, st);
  const fen = { rahmen: ORN, glas: GLAS, fasche: hst, simsF: hst };
  for (const [k, ok] of [['v', true], ['h', true], ['r', letzter], ['l', erster]]) {
    if (!ok || !sichtF(p, F[k])) continue;
    const Fk = F[k], L = Fk.L;
    if (k === 'v') { laden(S, scene, Fk, 0.5, L - 2.2, o.eg - 0.3, r, { leer, rahmen: waehle(r, ['#3f4a53', '#5a4636']) }); haustuer(S, Fk, L - 1.3, 0.3, 1.1, 2.6, waehle(r, HOLZ), hst, true); }
    else for (const u of achsen(0, L, 3.2, 0.6)) fenster(S, Fk, u, 1.4, 0.9, 1.3, fen);
    for (let kk = 0; kk < o.n; kk++) {
      for (const u of achsen(0, L, 2.6, 0.5)) fenster(S, Fk, u, o.eg + kk * o.gh + 0.8, 1.05, 1.6, fen);
      fb(S, Fk, -0.03, L + 0.03, o.eg + kk * o.gh - 0.2, o.eg + kk * o.gh, 0, 0.14, hst);
    }
    for (let i = 0; i < 6; i++) fb(S, Fk, 0, L, 0.3 + i * 0.6, 0.34 + i * 0.6, 0, 0.03, dunkler(st, 0.06));
  }
  const hd = T * 0.68;
  dachTrauf(S, F.v, 0, b, T, H, hd, o.dach, st, { ue: 0.35, us: erster || letzter ? 0.35 : 0.02 });
  let top = H + hd;
  const s = (2 * hd) / T;
  if (sichtF(p, F.v)) {
    const zb = Math.min(4.6, b * 0.5), zu = b / 2 - zb / 2, hz = 3.2;
    fb(S, F.v, zu, zu + zb, H, H + hz, -3, 0, st);
    fpoly(S, F.v, giebelUmriss(zu, zu + zb, H + hz, 3.4, 'treppe'), -3, 0.02, st);
    fb(S, F.v, b / 2 - 0.65, b / 2 + 0.65, H + 0.5, H + 2.6, -0.1, 0.04, '#5a4636');
    fb(S, F.v, b / 2 - 0.12, b / 2 + 0.12, H + hz + 1.4, H + hz + 1.65, 0, 1.4, HOLZ[0]);
    dachGiebel(S, F.v, zu + 0.2, zu + zb - 0.2, -3.6, -0.2, H + hz, 3.0, o.dach, null, { ue: 0, uf: 0, ub: 0 });
    for (const u of [b * 0.15, b * 0.85]) if (b > 9) gaube(S, F.v, u, H, s, 1.1, st, o.dach, GLAS, 0.9);
    for (const u of [b * 0.35, b * 0.65]) gaube(S, F.v, u, H, s, 0.9, st, o.dach, GLAS, 3.3);
    top = Math.max(top, H + hz + 3.4);
    if (o.choerlein) {
      const cu = b * 0.3, y0 = o.eg + 0.4;
      fb(S, F.v, cu - 1.0, cu + 1.0, y0 + 0.8, y0 + o.gh * 0.95, 0, 0.9, hst);
      fpoly(S, F.v, [[cu - 0.95, y0 + 0.8], [cu + 0.95, y0 + 0.8], [cu, y0 - 0.6]], 0, 0.8, hst);
      fenster(S, F.v, cu, y0 + 1.4, 1.3, 1.3, { ...fen, t: 0.9, sims: false });
      const g = new THREE.ConeGeometry(1.25, 1.8, 4); g.rotateY(PI / 4); g.translate(cu, y0 + o.gh * 0.95 + 0.9, 0.45); fgeo(S, F.v, g, o.dach);
    }
  }
  return { top };
}
function stadtmauerRoh(S, scene, p, r) {
  const { w, d } = p, stein = waehle(r, ROT_SANDSTEIN), st2 = dunkler(stein, 0.05), dach = waehle(r, BIBER);
  const zg = d - 9, zm = zg - 2.2, Hm = 8.5;
  // Graben (Grünstreifen tiefer) vorn
  S.quader(0, 0, zg, w, 0.2, d - 1.2, '#93b97a');
  for (let x = 4; x < w; x += 9) baumRund(S, x + zw(r, -1, 1), zg + 3.8, r, 0.8, LAUB, 0.2);
  boden(S, 0, d - 1.2, w, d, PFLASTER, 0.3, 0.06);
  // Mauer
  S.quader(0, 0, zm, w, Hm, zg, stein);
  const Fm = R(0, zg, 1, 0, w);
  if (sichtF(p, Fm)) {
    for (let i = 0; i < 7; i++) fb(S, Fm, 0, w, 0.6 + i * 1.2, 0.66 + i * 1.2, 0, 0.03, st2);
    for (const u of achsen(0, w, 3.2, 1)) fb(S, Fm, u - 0.12, u + 0.12, Hm - 2.2, Hm - 1.0, -0.1, 0.02, GLAS_DUNKEL);
  }
  // Wehrgang mit Dach
  S.quader(0, Hm, zm - 0.2, w, Hm + 1.2, zm + 0.7, stein);
  for (let x = 1; x < w; x += 2.4) S.box(0.24, 2.2, 0.24, x, Hm + 2.1, zm - 1.6, HOLZ[0]);
  S.quader(0, Hm, zm - 2.6, w, Hm + 0.25, zm - 0.2, HOLZ[1]);
  dachTrauf(S, R(0, zm + 0.7, 1, 0, w), 0, w, 3.6, Hm + 3.0, 0.9, dach, null, { ue: 0.3, us: 0 });
  // Türme
  const nT = Math.max(2, Math.round(w / 26));
  let top = 0;
  for (let i = 0; i < nT; i++) {
    const tx = ((i + 0.5) * w) / nT, rund = i % 2 === 1, tor = i === Math.floor(nT / 2) && nT > 2 ? false : i === 0;
    if (tor) {
      const tb = 9, Ht = 24, x0 = tx - tb / 2, z0 = zm - 3;
      S.quader(x0, 0, z0, x0 + tb, Ht, z0 + tb + 1, stein);
      const Ft = seiten(x0, z0, tb, tb + 1);
      for (const k of ['v', 'r', 'h', 'l']) if (sichtF(p, Ft[k])) {
        const L = Ft[k].L;
        if (k === 'v' || k === 'h') { fbogen(S, Ft[k], L / 2, 0.3, 4.2, 6.4, -0.3, 0.05, GLAS_DUNKEL); fbogen(S, Ft[k], L / 2, 0.3, 5.0, 6.9, 0, 0.12, st2); }
        for (const y of [10, 15, 19.5]) for (const u of achsen(0, L, 3.2, 1)) fb(S, Ft[k], u - 0.35, u + 0.35, y, y + 1.4, -0.1, 0.03, GLAS_DUNKEL);
        fb(S, Ft[k], -0.1, L + 0.1, Ht - 0.6, Ht, 0, 0.3, heller(stein, 0.06));
        if (k === 'v') { fscheibe(S, Ft[k], L / 2, Ht - 2.6, 0, 0.1, 1.2, '#f4efe0'); fscheibe(S, Ft[k], L / 2, Ht - 2.6, 0.1, 0.13, 1.0, '#2f4f6f'); }
      }
      walm(S, x0, z0, x0 + tb, z0 + tb + 1, Ht, 9, dach, 0.4, 2);
      for (const [cx, cz] of [[x0, z0 + tb + 1], [x0 + tb, z0 + tb + 1]]) { zyl(S, 1.0, 0.6, 3, cx, Ht - 3, cz, stein, 8); const g = new THREE.ConeGeometry(1.2, 3.4, 8); g.translate(cx, Ht + 1.7, cz); S.add(g, dach); }
      top = Math.max(top, Ht + 9);
      boden(S, x0 + 2, zg, x0 + tb - 2, d, PFLASTER, 0.22, 0.12);
    } else if (rund) {
      const rr = 4.0, Ht = 17 + r() * 4, cz = zm + 0.6;
      zyl(S, rr, rr + 0.3, Ht, tx, 0, cz, stein, 14);
      zyl(S, rr + 0.25, rr + 0.25, 0.4, tx, Ht - 0.4, cz, heller(stein, 0.06), 14);
      for (let j = 0; j < 4; j++) { const a = PI / 4 + (j * PI) / 8, nx = Math.cos(a), nz = Math.sin(a); if (sicht(p, nx, nz)) S.box(0.5, 1.4, 0.5, tx + nx * rr, 9 + (j % 2) * 4, cz + nz * rr, GLAS_DUNKEL); }
      const g = new THREE.ConeGeometry(rr + 0.5, 8.5, 14); g.translate(tx, Ht + 4.25, cz); S.add(g, dach);
      S.add(new THREE.SphereGeometry(0.3, 6, 5).translate(tx, Ht + 8.6, cz), GOLD);
      top = Math.max(top, Ht + 8.8);
    } else {
      const tb = 6.4, Ht = 15 + r() * 4, x0 = tx - tb / 2, z0 = zm - 2.6;
      S.quader(x0, 0, z0, x0 + tb, Ht, z0 + tb, stein);
      const Ft = seiten(x0, z0, tb, tb);
      for (const k of ['v', 'r', 'l', 'h']) if (sichtF(p, Ft[k])) { for (const y of [7, 11.5]) fb(S, Ft[k], tb / 2 - 0.15, tb / 2 + 0.15, y, y + 1.4, -0.1, 0.03, GLAS_DUNKEL); fb(S, Ft[k], -0.08, tb + 0.08, Ht - 0.5, Ht, 0, 0.25, heller(stein, 0.06)); }
      walm(S, x0, z0, x0 + tb, z0 + tb, Ht, 7.5, dach, 0.35);
      top = Math.max(top, Ht + 7.5);
    }
  }
  // Häuser hinter der Mauer
  const zh = zm - 3.4;
  if (zh > 10) {
    const T = Math.min(11, zh - 1);
    const br = teileBreite(r, w, 8, 12);
    let xa = 0;
    br.forEach((b, i) => {
      const o = { art: 'franken', n: 2, eg: 3.6, gh: 2.9, kr: 0.2, wand: waehle(r, ['#f2ead8', '#efe3cc', '#f4efe2']), holz: waehle(r, FW_FRANKEN), stein: waehle(r, ROT_SANDSTEIN), steinEG: true, dach: waehle(r, BIBER), giebelstaendig: r() < 0.4, neig: 1.0, laden: false };
      top = Math.max(top, fachwerkHaus(S, scene, r, { ...p, dreh: p.dreh }, xa, zh - T, b, T, o, i === 0, i === br.length - 1).top);
      xa += b;
    });
  }
  return top;
}
function frankenRoh(S, scene, p) {
  const r = rng(`fr:${p.seed}`);
  const v = p.variante ?? waehle(r, FRANKEN_V);
  const { w, d } = p;
  if (v === 'stadtmauer') return { hoehe: stadtmauerRoh(S, scene, p, r) };
  const zf = d - 2.4, T = Math.min(12.5, zf - 1);
  boden(S, 0, zf, w, d, PFLASTER, 0.3, 0.06);
  hof(S, r, 0, 0, w, zf - T - 1);
  const Hf = frankenZeile(S, scene, r, p, v, 0, zf, w, T);
  leerPlane(S, scene, p, R(0, zf + 1.0, 1, 0, w), 4.3, 4.6);
  return { hoehe: Hf };
}

// =====================================================================================
// 7. Alpen: Bergpanorama und Voralpenhaus
// =====================================================================================
const ALPEN_V = ['panorama', 'voralpenhaus', 'gasthof', 'ortsrand'];
/** Facettierter Berg: Kegel mit Zufallsversatz, Flächen nach Höhe in Fels, Schnee und Almwiese getrennt. */
function berg(S, r, x, z, rad, H, o = {}) {
  const g0 = new THREE.ConeGeometry(rad, H, o.seg ?? 9, 5);
  const pos = g0.getAttribute('position');
  const key = (vx, vy, vz) => `${vx.toFixed(2)},${vy.toFixed(2)},${vz.toFixed(2)}`;
  const versatz = new Map();
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i), k = key(vx, vy, vz);
    if (!versatz.has(k)) {
      const t = (vy + H / 2) / H;
      const j = t > 0.98 ? 0 : rad * 0.2 * (1 - t);
      versatz.set(k, [zw(r, -j, j), t > 0.98 || t < 0.02 ? 0 : zw(r, -H * 0.06, H * 0.06), zw(r, -j, j)]);
    }
    const [ax, ay, az] = versatz.get(k);
    pos.setXYZ(i, vx + ax, vy + ay, vz + az);
  }
  const g = g0.toNonIndexed();
  const P = g.getAttribute('position').array;
  const fels = [], schnee = [], wiese = [];
  const sl = o.schnee ?? 0.62, wl = o.wiese ?? 0.18;
  for (let i = 0; i < P.length; i += 9) {
    const yc = (P[i + 1] + P[i + 4] + P[i + 7]) / 3, t = (yc + H / 2) / H;
    (t > sl ? schnee : t < wl ? wiese : fels).push(...P.slice(i, i + 9));
  }
  for (const [arr, c] of [[fels, o.fels ?? waehle(r, ['#9a9790', '#8f8c86', '#a3a097'])], [schnee, '#f4f6f7'], [wiese, o.wieseF ?? '#86ad6c']]) {
    if (!arr.length) continue;
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); gg.computeVertexNormals();
    gg.translate(x, H / 2 + (o.y ?? 0), z); S.add(gg, c);
  }
}
function bergkette(S, r, x0, z0, x1, z1, Hmax, vorn = 0.72) {
  const w = x1 - x0, d = z1 - z0;
  const n = Math.max(3, Math.round(w / (d * 0.55)));
  let top = 0;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, rad = Math.min(d * 0.48, (w / n) * zw(r, 0.75, 1.0)), H = Hmax * zw(r, 0.55, 1.0) * (i % 2 ? 0.8 : 1);
    berg(S, r, x0 + t * w + zw(r, -2, 2), z0 + d * zw(r, 0.38, 0.5), rad, H, { schnee: zw(r, 0.55, 0.7) });
    top = Math.max(top, H);
  }
  // Vorberge, bewaldet
  for (let i = 0; i < n + 1; i++) {
    const t = i / n, rad = Math.min(d * 0.32, (w / n) * 0.6), H = Hmax * zw(r, 0.22, 0.32);
    berg(S, r, x0 + t * w + zw(r, -3, 3), z0 + d * vorn, rad, H, { schnee: 2, wiese: 0.0, fels: waehle(r, ['#5e8a52', '#56804b', '#64905a']), seg: 7 });
  }
  return top;
}
function voralpenhaus(S, scene, r, p, x0, z0, b, T, o = {}) {
  const F = seiten(x0, z0, b, T);
  const eg = 3.1, og = 2.9, H = eg + og * (o.n ?? 1);
  const putz = waehle(r, [WEISS, '#f3efe4', '#f4ead6']), holz = waehle(r, HOLZ), holzH = HOLZ_HELL;
  const laedenF = waehle(r, ['#3f6b4a', '#2f5d4a', '#6b3a2e', '#466b8a']);
  const holzOG = o.holzOG ?? r() < 0.45;
  const malerei = !holzOG;
  S.quader(x0, 0, z0, x0 + b, eg, z0 + T, putz);
  S.quader(x0, eg, z0, x0 + b, H, z0 + T, holzOG ? holz : putz);
  const blume = waehle(r, ['#d0453a', '#e05a7a', '#d0453a']);
  const fen = { rahmen: ORN, glas: GLAS, laeden: laedenF, simsF: '#efe9dc' };
  const lfarben = ['#d8a64a', '#b85a4a', '#5f8f6a', '#5a7fa8'];
  const lf = waehle(r, lfarben);
  for (const k of ['v', 'r', 'h', 'l']) {
    if (!sichtF(p, F[k])) continue;
    const Fk = F[k], L = Fk.L, front = k === 'v';
    fb(S, Fk, 0, L, 0.3, 0.8, -0.05, 0.1, '#c9c3b6');
    const us = achsen(0, L, 2.8, 0.8);
    us.forEach((u, i) => {
      if ((front && i === 0) || (!front && k === 'r' && i === us.length - 1)) { haustuer(S, Fk, u, 0.3, 1.1, 2.3, holz, malerei ? lf : '#e9e1cf'); return; }
      fenster(S, Fk, u, 1.0, 1.05, 1.3, { ...fen, fasche: malerei ? lf : null });
      if (malerei) fpoly(S, Fk, [[u - 0.9, 2.55], [u + 0.9, 2.55], [u, 2.95]], 0, 0.04, lf);
    });
    for (let kk = 0; kk < (o.n ?? 1); kk++) for (const u of us) {
      fenster(S, Fk, u, eg + kk * og + 0.6, 1.0, 1.25, { ...fen, fasche: malerei ? lf : null, blumen: blume });
      if (malerei) fpoly(S, Fk, [[u - 0.85, eg + kk * og + 2.1], [u + 0.85, eg + kk * og + 2.1], [u, eg + kk * og + 2.5]], 0, 0.04, lf);
    }
    if (malerei && front && us.length >= 2) {
      // Lüftlmalerei: Bildfeld zwischen den Fenstern
      const um = (us[0] + us[1]) / 2;
      fb(S, Fk, um - 0.65, um + 0.65, eg + 0.5, eg + 2.2, 0, 0.03, '#efe2c0');
      fb(S, Fk, um - 0.5, um + 0.5, eg + 0.65, eg + 2.05, 0.02, 0.05, '#6f9bc4');
      fb(S, Fk, um - 0.18, um + 0.18, eg + 0.75, eg + 1.7, 0.04, 0.07, '#c9483e');
      fscheibe(S, Fk, um, eg + 1.85, 0.04, 0.07, 0.17, '#f2d7b0', 8);
      fscheibe(S, Fk, um, eg + 1.85, 0.03, 0.05, 0.28, GOLD, 10);
    }
    if (holzOG) for (let y = eg + 0.3; y < H; y += 0.55) fb(S, Fk, 0, L, y, y + 0.06, 0, 0.04, dunkler(holz, 0.05));
    // Balkon (Laube) über Front und Seiten
    if (front || k === 'r' || k === 'l') {
      const yb = eg + 0.15, tb = 1.3, gl = [];
      for (let u = 0.3; u < L - 0.3; u += 0.55) gl.push({ u0: u + 0.12, u1: u + 0.3, v0: yb + 0.35, v1: yb + 0.85 });
      fb(S, Fk, -0.2, L + 0.2, yb - 0.15, yb, 0, tb, holz);
      fwand(S, Fk, -0.2, L + 0.2, yb, yb + 1.05, tb - 0.08, tb, holzH, gl);
      fb(S, Fk, -0.25, L + 0.25, yb + 1.05, yb + 1.15, tb - 0.15, tb + 0.05, holz);
      for (let u = 0.6; u < L; u += 2.8) fb(S, Fk, u, u + 0.2, yb + 1.15, yb + 1.45, tb - 0.25, tb - 0.02, blume);
      for (let u = 0; u < L; u += 1.4) fb(S, Fk, u, u + 0.12, yb - 0.6, yb - 0.15, 0, tb * 0.9, holz);
    }
  }
  // flaches Satteldach, giebelständig, weiter Überstand
  const hg = b * 0.27;
  dachGiebel(S, F.v, 0, b, -T, 0, H, hg, o.dach ?? waehle(r, ['#7d6a5a', '#6f5f52', '#8b939b', '#a85440']), holz, { ue: 1.3, uf: 1.6, ub: 1.2, dick: 0.4 });
  for (const k of ['v', 'h']) if (sichtF(p, F[k])) {
    const Fk = F[k];
    for (let u = 0.6; u < b; u += 0.6) { const yy = H + Math.min(u, b - u) * (2 * hg / b) - 0.25; if (yy > H + 0.1) fb(S, Fk, u, u + 0.45, H, yy, 0, 0.04, dunkler(holz, 0.04)); }
    fenster(S, Fk, b / 2, H + 0.4, 1.1, 1.2, { ...fen, laeden: laedenF });
    if (k === 'v') {
      const ybg = H + 0.1;
      fb(S, Fk, b * 0.2, b * 0.8, ybg - 0.12, ybg, 0, 1.0, holz);
      fwand(S, Fk, b * 0.2, b * 0.8, ybg, ybg + 0.95, 0.92, 1.0, holzH, Array.from({ length: Math.floor(b * 0.6 / 0.55) }, (_, i) => ({ u0: b * 0.2 + 0.2 + i * 0.55, u1: b * 0.2 + 0.38 + i * 0.55, v0: ybg + 0.3, v1: ybg + 0.75 })));
      for (const sg of [-1, 1]) fb(S, Fk, b / 2 + sg * (b / 2 + 0.6) - 0.15, b / 2 + sg * (b / 2 + 0.6) + 0.15, H - 0.45, H - 0.15, 0, 1.4, holz);
    }
  }
  S.quader(x0 + b * 0.65, H + hg * 0.3, z0 + T * 0.5, x0 + b * 0.65 + 0.8, H + hg + 0.8, z0 + T * 0.5 + 0.8, '#efe9dc');
  return { top: H + hg + 0.8, H };
}
function alpenRoh(S, scene, p) {
  const r = rng(`al:${p.seed}`);
  const v = p.variante ?? waehle(r, ALPEN_V);
  const { w, d } = p;
  if (v === 'panorama') {
    boden(S, 0, 0, w, d, '#9cc27e', 0.3, 0.05);
    const top = bergkette(S, r, 0, 0, w, d * 0.82, Math.min(95, Math.max(40, d * 1.2)));
    for (let i = 0; i < Math.floor(w / 4); i++) nadelbaum(S, zw(r, 1, w - 1), zw(r, d * 0.78, d - 2), r, zw(r, 5, 9));
    return { hoehe: top };
  }
  boden(S, 0, 0, w, d, WIESE, 0.3, 0.05);
  const zf = d - 3;
  boden(S, 0, zf, w, d, '#cfc6b4', 0.3, 0.07);
  let top = 0;
  if (v === 'voralpenhaus') {
    const b = Math.min(14, w - 8), T = Math.min(13, d - 10), x0 = 3, z0 = zf - T - 3;
    top = voralpenhaus(S, scene, r, p, x0, z0, b, T).top;
    // Garten, Zaun, Holzstapel, Bank
    for (let x = 1; x < w - 1; x += 1.2) S.box(0.12, 1.0, 0.12, x, 0.8, zf - 0.4, '#8a6a48');
    S.quader(1, 0.95, zf - 0.45, w - 1, 1.05, zf - 0.35, '#8a6a48');
    S.quader(x0 + b + 1.2, 0.3, z0 + 1, x0 + b + 2.4, 2.2, z0 + T - 1, '#a2754a');
    for (let z = z0 + 1.3; z < z0 + T - 1; z += 0.5) S.box(0.06, 1.9, 0.06, x0 + b + 2.42, 1.25, z, '#7a5638');
    bank(S, x0 + 2, z0 + T + 2.2, 0);
    baumRund(S, w - 4, 4, r, 1.0); baumRund(S, w - 6, zf - 4, r, 0.8, ['#7fae5a']);
    for (let i = 0; i < 4; i++) S.box(1.4, 0.4, 0.8, x0 + b + 4 + (i % 2) * 2, 0.5, 4 + i * 1.6, waehle(r, ['#7aa865', '#d0453a', '#e8b53c']));
  } else if (v === 'gasthof') {
    const b = Math.min(20, w - 6), T = Math.min(14, d - 10), x0 = 2, z0 = zf - T - 2.5;
    const erg = voralpenhaus(S, scene, r, p, x0, z0, b, T, { n: 2, holzOG: false });
    top = erg.top;
    const F = seiten(x0, z0, b, T);
    if (sichtF(p, F.v)) ftext(scene, F.v, waehle(r, ['Alpengasthof Edelweiß', 'Gasthof Almrausch', 'Berggasthof Enzian']), b / 2, 2.75, 0.12, 0.45, b * 0.6, '#5a3a2a');
    if (w - b - 6 > 8) biergarten(S, scene, r, x0 + b + 2, 2, w - 1, zf - 1, { ausschank: false });
  } else {
    // Ortsrand: zwei Häuser vor Bergkulisse
    const zb = d * 0.42;
    top = bergkette(S, r, 0, 0, w, zb, Math.min(60, Math.max(28, d * 0.7)), 0.62);
    const nH = Math.max(1, Math.floor(w / 18));
    for (let i = 0; i < nH; i++) {
      const b = Math.min(13, w / nH - 4), T = Math.min(12, d - zb - 6), x0 = i * (w / nH) + 2;
      top = Math.max(top, voralpenhaus(S, scene, r, p, x0, zf - T - 2, b, T, { n: r() < 0.4 ? 2 : 1 }).top);
    }
    for (let i = 0; i < 6; i++) nadelbaum(S, zw(r, 2, w - 2), zw(r, zb, zb + 4), r, zw(r, 6, 10));
  }
  return { hoehe: top };
}

// =====================================================================================
// 8. Schwäbisch-alemannisches Fachwerk, Marktplatz
// =====================================================================================
const BWFW_V = ['tuebingen', 'esslingen', 'marktplatz'];
const PUTZ_BW = ['#f2e2b8', '#f1d6c4', '#e3ead6', '#f4efe2', '#efd9a8', '#e6d3c8', '#dfe3ea', '#f0e6d0', '#e9cfb0'];
function bwHausO(r, v) {
  const giebel = v === 'esslingen' ? r() < 0.25 : r() < 0.75;
  return {
    art: 'schwaben', n: 2 + (r() < 0.55 ? 1 : 0), eg: 3.7, gh: 2.9, kr: 0.38,
    wand: waehle(r, PUTZ_BW), holz: waehle(r, FW_SCHWABEN), stein: '#d6cdb8', steinEG: r() < 0.3, dach: waehle(r, BIBER),
    giebelstaendig: giebel, neig: giebel ? zw(r, 1.05, 1.25) : 0.72, zwerch: !giebel && r() < 0.6, laedenF: r() < 0.35 ? waehle(r, ['#3f6b4a', '#6b3a2e', '#2f5d7a']) : null,
    blumen: r() < 0.35 ? '#d0453a' : null, namen: LAEDEN_BW, ra: 2.4,
  };
}
function bwZeile(S, scene, r, p, v, x0, zf, w, T, extra = {}) {
  const br = teileBreite(r, w, v === 'esslingen' ? 9 : 7, v === 'esslingen' ? 13 : 10);
  let xa = x0, H = 0;
  br.forEach((b, i) => {
    const o = { ...bwHausO(r, v), ...(extra.o ?? {}) };
    if (extra.rathaus === i) Object.assign(o, { giebelstaendig: true, n: 3, laden: false, wand: '#f3ead6', holz: '#7a3a2a', neig: 1.1, steinEG: true, stein: '#d9cdb4' });
    const erg = fachwerkHaus(S, scene, r, p, xa, zf - T, b, T, o, i === 0, i === br.length - 1);
    if (extra.rathaus === i) {
      const F = seiten(xa, zf - T, b, T), Hh = o.eg + o.n * o.gh;
      if (sichtF(p, F.v)) {
        // Arkaden und Uhr
        const nB = Math.max(2, Math.round(b / 3.2));
        fwand(S, F.v, 0, b, 0.3, o.eg, 0, 0.12, o.stein, Array.from({ length: nB }, (_, k) => ({ u0: (k * b) / nB + 0.4, u1: ((k + 1) * b) / nB - 0.4, v0: 0.3, v1: o.eg - 0.4, bogen: true })));
        fb(S, F.v, 0.3, b - 0.3, 0.3, o.eg - 0.5, -0.8, -0.7, GLAS_DUNKEL);
        ftext(scene, F.v, 'Rathaus', b / 2, o.eg - 0.2, 0.2, 0.42, b * 0.5, '#5a3a2a');
        const yu = Hh + b * 0.45;
        fscheibe(S, F.v, b / 2, yu, o.kr * o.n + 0.1, o.kr * o.n + 0.25, 1.1, '#f4efe0');
        fscheibe(S, F.v, b / 2, yu, o.kr * o.n + 0.25, o.kr * o.n + 0.3, 0.9, '#2f4f6f');
      }
      // Dachreiter
      const cx = xa + b / 2, cz = zf - T * 0.45, yr = Hh + b * 1.1 * 0.6;
      zyl(S, 0.9, 0.9, 2.6, cx, yr, cz, '#f3ead6', 8);
      const g = new THREE.ConeGeometry(1.2, 4.5, 8); g.rotateY(PI / 8); g.translate(cx, yr + 2.6 + 2.25, cz); S.add(g, waehle(r, SCHIEFER));
      S.add(new THREE.SphereGeometry(0.25, 6, 5).translate(cx, yr + 7.2, cz), GOLD);
      H = Math.max(H, yr + 7.4);
    }
    H = Math.max(H, erg.top); xa += b;
  });
  return H;
}
function bwFachwerkRoh(S, scene, p) {
  const r = rng(`bf:${p.seed}`);
  const v = p.variante ?? waehle(r, BWFW_V);
  const { w, d } = p;
  if (v === 'marktplatz') {
    const T = 12, zf = Math.max(T + 2, d * 0.5);
    boden(S, 0, zf, w, d, PFLASTER, 0.3, 0.06);
    for (let i = 1; i < 5; i++) boden(S, (i * w) / 5 - 0.15, zf, (i * w) / 5 + 0.15, d, PFLASTER2, 0.36, 0.01);
    hof(S, r, 0, 0, w, zf - T);
    const H = bwZeile(S, scene, r, p, 'tuebingen', 0, zf, w, T, { rathaus: Math.floor(teileBreite(rng(`bf:${p.seed}:n`), w, 7, 10).length / 2) });
    const bx = w * 0.42, bz = zf + (d - zf) * 0.5;
    brunnen(S, bx, bz, Math.min(3.0, (d - zf) * 0.22), { figurF: waehle(r, ['#c9483e', GOLD, '#2f6f8f']), stein: '#d9cdb4' });
    for (let i = 0; i < 2; i++) {
      const sx = w * 0.72 + i * 5, sz = bz;
      S.box(3.6, 0.9, 1.8, sx, 0.75, sz, '#c99a63');
      const g = new THREE.BoxGeometry(4.0, 0.12, 2.4); g.rotateX(0.18); g.translate(sx, 2.7, sz); S.add(g, i ? '#2f6f8f' : '#f2efe6');
      for (const dx of [-1.7, 1.7]) S.box(0.1, 2.4, 0.1, sx + dx, 1.5, sz - 0.8, '#7a5638');
      for (let k = 0; k < 4; k++) S.box(0.7, 0.3, 0.6, sx - 1.2 + k * 0.8, 1.35, sz, waehle(r, ['#d0453a', '#e8b53c', '#7fae5a', '#e07a3f']));
    }
    for (const x of [3, w - 3]) baumRund(S, x, d - 3, r, 0.9);
    for (let i = 0; i < 3; i++) bank(S, bx - 4 + i * 4, bz + 4.5, PI);
    return { hoehe: H };
  }
  const zf = d - 2.4, T = Math.min(12.5, zf - 1);
  boden(S, 0, zf, w, d, PFLASTER, 0.3, 0.06);
  hof(S, r, 0, 0, w, zf - T - 1);
  const Hb = bwZeile(S, scene, r, p, v, 0, zf, w, T);
  leerPlane(S, scene, p, R(0, zf + 1.2, 1, 0, w), 4.0, 4.6);
  return { hoehe: Hb };
}

// =====================================================================================
// 9. Stuttgart: Kessellage, Stäffele, 50er Geschäftshäuser, Halbhöhenlage
// =====================================================================================
const STUTT_V = ['staeffele', 'geschaeft50', 'halbhoehe', 'kessel'];
const MAUER = ['#cfc6b2', '#c9bfa8', '#d6cdb8'];
/** Geländestufe: Block bis Höhe y, Front an z1 als Stützmauer, oben Rasen. */
function stufe(S, x0, z0, x1, z1, y, mauer, oben = RASEN, p = null) {
  S.quader(x0, 0, z0, x1, y, z1, mauer);
  S.quader(x0, y, z0, x1, y + 0.08, z1, oben);
  S.quader(x0, y - 0.05, z1 - 0.45, x1, y + 0.2, z1 + 0.05, heller(mauer, 0.05));
  if (!p) return;
  const F = seiten(x0, z0, x1 - x0, z1 - z0), fu = dunkler(mauer, 0.07), kap = heller(mauer, 0.05);
  for (const k of ['v', 'r', 'h', 'l']) {
    if (!sichtF(p, F[k])) continue;
    const L = F[k].L;
    for (let yy = 1.1; yy < y - 0.4; yy += 1.1) fb(S, F[k], 0, L, yy, yy + 0.06, 0, 0.03, fu);
    // Stoßfugen versetzt, Mauerabdeckung, Bewuchs
    for (let yy = 0.3, j = 0; yy < y - 0.6; yy += 1.1, j++) for (let u = (j % 2) * 1.6 + 0.8; u < L - 0.3; u += 3.2) fb(S, F[k], u, u + 0.06, yy, Math.min(y - 0.2, yy + 1.1), 0, 0.03, fu);
    if (k !== 'v') fb(S, F[k], -0.05, L + 0.05, y - 0.05, y + 0.2, 0, 0.12, kap);
    if (y > 2) for (let u = 4; u < L - 3; u += 17) { const q = rng(Math.round(u * 7 + y * 13 + (k.charCodeAt(0)))); if (q() < 0.4) continue; const h0 = y * zw(q, 0.55, 0.75); fb(S, F[k], u, u + zw(q, 0.8, 1.8), h0, y - 0.2, 0, 0.1, waehle(q, ['#6f9a52', '#7aa65a', '#5f8f4c'])); }
    if (y > 3.5) for (let u = 5; u < L - 2; u += 13) fb(S, F[k], u - 0.08, u + 0.08, 0.4, 0.7, 0, 0.1, '#3b4046');
  }
}
/** Treppe (Stäffele) vor einer Stützmauer bei zWand: läuft nach -z von yU hinauf auf yO, Breite b. */
function staffel(S, x, b, zWand, yU, yO, stein = '#d8d0bf', maxLauf = 99) {
  const n = Math.max(3, Math.round((yO - yU) / 0.18)), tr = Math.min(0.3, maxLauf / n), zV = zWand + n * tr;
  for (let i = 0; i < n; i++) S.quader(x, yU, zV - (i + 1) * tr, x + b, yU + ((i + 1) * (yO - yU)) / n, zV - i * tr, stein);
  stab(S, [x + b + 0.1, yU + 1.0, zV], [x + b + 0.1, yO + 1.0, zWand], 0.05, '#3b4046', 4);
  for (const k of [0, 0.5, 1]) S.box(0.08, 1.0, 0.08, x + b + 0.1, yU + k * (yO - yU) + 0.5, zV - k * n * tr, '#3b4046');
  return n * tr;
}
/** Treppe entlang +x vor einer Mauer (z0..z1), von yU auf yO. */
function staffelX(S, x0, z0, z1, yU, yO, stein = '#d8d0bf') {
  const n = Math.max(3, Math.round((yO - yU) / 0.18)), tr = 0.3;
  for (let i = 0; i < n; i++) S.quader(x0 + i * tr, yU, z0, x0 + (i + 1) * tr, yU + ((i + 1) * (yO - yU)) / n, z1, stein);
  stab(S, [x0, yU + 1.0, z1 + 0.1], [x0 + n * tr, yO + 1.0, z1 + 0.1], 0.05, '#3b4046', 4);
  for (const k of [0, 0.5, 1]) S.box(0.08, 1.0, 0.08, x0 + k * n * tr, yU + k * (yO - yU) + 0.5, z1 + 0.1, '#3b4046');
  return n * tr;
}
/** Konvexe Hülle aus Punkten. */
function huelle(S, pkt, c) { S.add(new ConvexGeometry(pkt.map(([x, y, z]) => new THREE.Vector3(x, y, z))), c); }
/** Hanghaus / Stadtvilla in Putz mit Walm- oder Satteldach. */
function hanghaus(S, scene, r, p, x0, z0, b, T, o = {}) {
  const F = seiten(x0, z0, b, T);
  const n = o.n ?? 3, eg = 3.2, gh = 3.0, H = eg + (n - 1) * gh;
  const wand = o.wand ?? waehle(r, ['#efe6d2', '#e8dcc8', '#f1e2c4', '#e3e6dc', '#f0d8c4', '#dfe3e6', '#f3ede0']);
  const dachF = o.dach ?? waehle(r, BIBER);
  S.quader(x0, 0, z0, x0 + b, H, z0 + T, wand);
  const fen = { rahmen: ORN, glas: GLAS, laeden: o.laeden ?? (r() < 0.5 ? waehle(r, ['#3f6b4a', '#5a6168', '#2f5d7a']) : null), simsF: '#e9e3d6' };
  for (const k of ['v', 'r', 'h', 'l']) {
    if (!sichtF(p, F[k])) continue;
    const Fk = F[k], L = Fk.L;
    fb(S, Fk, 0, L, 0.3, 1.0, -0.05, 0.1, dunkler(wand, 0.12));
    const us = lochfassade(S, Fk, 0, L, 0.3, n, gh, { ...fen, ra: 2.9, fw: 1.15, fh: 1.55, br: 1.1 });
    if (k === 'v') {
      haustuer(S, Fk, us[0], 0.3, 1.1, 2.3, waehle(r, HOLZ), '#e9e3d6');
      if (o.balkon !== false && us.length >= 2) for (let kk = 1; kk < n; kk++) {
        const u = us[us.length - 1], y = 0.3 + kk * gh;
        fb(S, Fk, u - 1.3, u + 1.3, y - 0.05, y + 0.12, 0, 1.2, '#e9e3d6');
        fb(S, Fk, u - 1.3, u + 1.3, y + 0.12, y + 1.0, 1.1, 1.2, o.gelaender ?? '#3b4046');
      }
    }
    fb(S, Fk, -0.1, L + 0.1, H - 0.25, H, 0, 0.3, '#e9e3d6');
  }
  let top;
  if (o.walm ?? r() < 0.6) { walm(S, x0, z0, x0 + b, z0 + T, H, Math.min(b, T) * 0.42, dachF, 0.6); top = H + Math.min(b, T) * 0.42; }
  else { dachTrauf(S, F.v, 0, b, T, H, T * 0.45, dachF, wand, { ue: 0.6, us: 0.5 }); top = H + T * 0.45; }
  if (sichtF(p, F.v) && b > 8) gaube(S, F.v, b / 2, H, 0.9, 1.6, wand, dachF, GLAS, 1.4);
  S.quader(x0 + b * 0.3, H + 1, z0 + T * 0.5, x0 + b * 0.3 + 0.7, top + 0.4, z0 + T * 0.5 + 0.7, '#b9a89a');
  return { top };
}
/** Reihe von Rebzeilen entlang x auf Höhe y. */
function rebzeilen(S, r, x0, x1, z0, z1, y, abst = 2.0, quer = false) {
  const gr = ['#6f9a4f', '#7aa65a', '#668f48', '#81ad5e'];
  if (!quer) {
    for (let z = z0 + abst / 2; z < z1 - 0.3; z += abst) {
      const f = waehle(r, gr);
      for (let x = x0 + 0.4; x < x1 - 1.5; x += 6.6) {
        const L = Math.min(6.0, x1 - 0.4 - x);
        S.quader(x, y, z - 0.3, x + L, y + 1.35, z + 0.3, f);
        S.box(0.1, 1.8, 0.1, x + L + 0.3, y + 0.9, z, '#7a6650');
      }
    }
  } else {
    for (let x = x0 + abst / 2; x < x1 - 0.3; x += abst) S.quader(x - 0.3, y, z0 + 0.3, x + 0.3, y + 1.3, z1 - 0.3, waehle(r, gr));
  }
}
function weinberghaeuschen(S, x, z, y, r, s = 1) {
  const st = waehle(r, MAUER), b = 3.2 * s;
  S.quader(x - b / 2, y, z - b / 2, x + b / 2, y + 2.8 * s, z + b / 2, st);
  walm(S, x - b / 2, z - b / 2, x + b / 2, z + b / 2, y + 2.8 * s, 1.9 * s, waehle(r, BIBER), 0.3);
  S.quader(x - 0.45, y, z + b / 2, x + 0.45, y + 1.9 * s, z + b / 2 + 0.06, HOLZ[0]);
  S.quader(x + b / 2, y + 1.2, z - 0.35, x + b / 2 + 0.05, y + 1.9, z + 0.35, GLAS_DUNKEL);
}
/** 50er-Jahre-Geschäftshaus. typ: 'raster' | 'loch' | 'band'. */
function fuenfzigerHaus(S, scene, r, p, x0, z0, b, T, typ, erster, letzter) {
  const F = seiten(x0, z0, b, T), leer = p.zustand === 'leerstand';
  const n = 4 + (r() < 0.5 ? 1 : 0), eg = 4.6, gh = 3.2, H = eg + n * gh;
  const wand = waehle(r, ['#f2f0ea', '#e9e6de', '#ece3cf', '#e2e6e3', '#efe9dc']);
  const akz = waehle(r, ['#7fa6b8', '#d9a35a', '#c96a54', '#8fb09a', '#e2c56b', '#6f8fb5']);
  S.quader(x0, 0, z0, x0 + b, H, z0 + T, wand);
  const front = (Fk, L, haupt) => {
    laden(S, scene, Fk, 0.2, L - 0.2, eg - 0.5, r, { leer, namen: LAEDEN_BW, rahmen: waehle(r, ['#3f4a53', '#e9e4da', '#2e4f6b']) });
    fb(S, Fk, -0.3, L + 0.3, eg - 0.6, eg - 0.35, 0, 2.2, '#f4f3ef');
    fb(S, Fk, -0.3, L + 0.3, eg - 0.68, eg - 0.6, 1.9, 2.22, akz);
    if (typ === 'raster') {
      const ns = Math.max(3, Math.round(L / 1.8)), sb = L / ns;
      for (let k = 0; k < n; k++) {
        const y = eg + k * gh;
        fb(S, Fk, 0, L, y, y + 0.25, 0, 0.3, wand);
        for (let i = 0; i < ns; i++) {
          fb(S, Fk, i * sb + 0.08, (i + 1) * sb - 0.08, y + 0.25, y + 1.05, -0.05, 0.08, (i + k) % 3 === 0 ? akz : heller(akz, 0.15));
          fb(S, Fk, i * sb + 0.08, (i + 1) * sb - 0.08, y + 1.05, y + gh, -0.15, 0.02, GLAS_LADEN);
        }
      }
      for (let i = 0; i <= ns; i++) fb(S, Fk, i * sb - 0.08, i * sb + 0.08, eg, H, 0, 0.35, wand);
    } else if (typ === 'band') {
      for (let k = 0; k < n; k++) {
        const y = eg + k * gh;
        fb(S, Fk, 0.4, L - 0.4, y + 0.95, y + gh - 0.5, -0.1, 0.03, GLAS);
        for (let u = 1.4; u < L - 0.6; u += 1.4) fb(S, Fk, u - 0.04, u + 0.04, y + 0.95, y + gh - 0.5, 0, 0.06, '#f4f3ef');
        fb(S, Fk, 0, L, y + 0.85, y + 0.95, 0, 0.25, '#f4f3ef');
      }
      if (haupt) fb(S, Fk, L * 0.08, L * 0.08 + 1.2, eg, H, 0, 0.12, akz);
    } else {
      for (let k = 0; k < n; k++) for (const u of achsen(0, L, 2.3, 0.6)) {
        const y = eg + k * gh + 0.8;
        fb(S, Fk, u - 0.8, u + 0.8, y - 0.12, y + 1.62, 0, 0.12, '#f7f6f2');
        fb(S, Fk, u - 0.66, u + 0.66, y, y + 1.5, -0.1, 0.13, GLAS);
      }
      if (haupt && L > 10) for (let k = 1; k < n; k++) { const y = eg + k * gh; fb(S, Fk, L * 0.62, L * 0.92, y - 0.05, y + 0.1, 0, 1.1, '#f4f3ef'); fb(S, Fk, L * 0.62, L * 0.92, y + 0.1, y + 1.0, 1.0, 1.1, akz); }
    }
    if (haupt) ftext(scene, Fk, waehle(r, ['Kaufhaus Wörner', 'Modehaus Bleyle', 'Schuh-Haug', 'Radio Fischer', 'Möbel Kienzle', 'Sport-Scheck']), L / 2, H - 0.9, 0.4, 0.9, L * 0.7, akz);
  };
  if (sichtF(p, F.v)) front(F.v, b, true);
  if (sichtF(p, F.h)) lochfassade(S, F.h, 0, b, eg, n, gh, { ra: 2.6, fw: 1.2, fh: 1.5, rahmen: '#f4f3ef', glas: GLAS, sims: false });
  for (const [k, ok] of [['r', letzter], ['l', erster]]) if (ok && sichtF(p, F[k])) front(F[k], T, false);
  // Staffelgeschoss mit Flugdach
  const sb = Math.max(6, b * 0.62), st0 = x0 + (b - sb) * (typ === 'band' ? 0.2 : 0.6), sT = T - 5.5;
  S.quader(st0, H, z0 + 2, st0 + sb, H + 2.9, z0 + 2 + sT, '#e2e6e8');
  const Fs = seiten(st0, z0 + 2, sb, sT);
  for (const k of ['v', 'r', 'l']) if (sichtF(p, Fs[k])) { fb(S, Fs[k], 0.2, Fs[k].L - 0.2, H + 0.3, H + 2.6, -0.05, 0.04, GLAS_LADEN); for (let u = 1.2; u < Fs[k].L - 0.5; u += 1.2) fb(S, Fs[k], u - 0.04, u + 0.04, H + 0.3, H + 2.6, 0, 0.07, '#f4f3ef'); }
  S.quader(st0 - 1.0, H + 2.9, z0 + 1.2, st0 + sb + 1.0, H + 3.05, z0 + 2 + sT + 1.4, '#c9cccf');
  for (let u = st0 + 0.5; u < st0 + sb; u += 2.4) S.box(0.1, 1.0, 0.1, u, H + 0.65, z0 + T - 0.3, '#3b4046');
  for (let i = 0; i < 2; i++) S.quader(x0 + 3 + i * 4, H + 0.15, z0 + 3, x0 + 4.5 + i * 4, H + 1.2, z0 + 4.2, '#c9cdd0');
  S.quader(x0, H - 0.1, z0, x0 + b, H + 0.1, z0 + T, '#b9b4aa');
  for (const [a0, b0, a1, b1] of [[x0 - 0.3, z0 + T - 0.1, x0 + b + 0.3, z0 + T + 0.3], [x0 - 0.3, z0 - 0.1, x0 + b + 0.3, z0 + 0.3], [x0 - 0.3, z0, x0 + 0.2, z0 + T], [x0 + b - 0.2, z0, x0 + b + 0.3, z0 + T]]) S.quader(a0, H - 0.1, b0, a1, H + 0.3, b1, '#f4f3ef');
  S.quader(x0, H + 1.1, z0 + T - 0.25, x0 + b, H + 1.16, z0 + T - 0.15, '#3b4046');
  return { top: H + 3.25 };
}
function villa(S, scene, r, p, x0, z0, b, T) {
  const F = seiten(x0, z0, b, T);
  const wand = waehle(r, ['#f1e6c8', '#efe0d6', '#e6eadf', '#f2efe6', '#e9d9c3']), orn = ORN, dachF = waehle(r, [...BIBER, ...SCHIEFER]);
  const eg = 3.8, og = 3.4, H = eg + og;
  S.quader(x0, 0, z0, x0 + b, H, z0 + T, wand);
  const fen = { rahmen: orn, glas: GLAS, fasche: orn, laeden: waehle(r, ['#3f6b4a', '#5a6168']) };
  for (const k of ['v', 'r', 'h', 'l']) {
    if (!sichtF(p, F[k])) continue;
    const Fk = F[k], L = Fk.L;
    fb(S, Fk, 0, L, 0, 1.0, -0.05, 0.12, dunkler(wand, 0.15));
    const us = achsen(0, L, 3.1, 0.8);
    for (const u of us) { fenster(S, Fk, u, 1.4, 1.25, 1.9, { ...fen, verdachung: 'gerade' }); fenster(S, Fk, u, eg + 0.8, 1.2, 1.7, fen); }
    fb(S, Fk, -0.05, L + 0.05, eg - 0.1, eg + 0.15, 0, 0.18, orn);
    fb(S, Fk, -0.2, L + 0.2, H - 0.3, H, 0, 0.4, orn);
    if (k === 'v') {
      // Veranda und Erker
      const u0 = L * 0.12;
      fb(S, Fk, u0, u0 + 4.6, 0.3, 1.0, 0, 2.6, dunkler(wand, 0.12));
      for (const u of [u0 + 0.2, u0 + 4.4]) fb(S, Fk, u - 0.15, u + 0.15, 1.0, eg, 2.2, 2.5, orn);
      fb(S, Fk, u0, u0 + 4.6, eg - 0.1, eg + 0.15, 0, 2.7, orn);
      fb(S, Fk, u0, u0 + 4.6, eg + 0.15, eg + 1.05, 2.5, 2.6, '#3b4046');
      const e0 = L * 0.62;
      fb(S, Fk, e0, e0 + 3.4, 1.0, H + 1.5, 0, 1.2, wand);
      fenster(S, Fk, e0 + 1.7, 1.5, 1.8, 1.9, { ...fen, t: 1.2, laeden: null });
      fenster(S, Fk, e0 + 1.7, eg + 0.8, 1.8, 1.7, { ...fen, t: 1.2, laeden: null });
      dachGiebel(S, teil(Fk, e0, e0 + 3.4, 1.2), 0, 3.4, -3, 0, H + 1.5, 2.6, dachF, wand, { ue: 0.3, uf: 0.3, ub: 0 });
    }
  }
  walm(S, x0, z0, x0 + b, z0 + T, H, Math.min(b, T) * 0.45, dachF, 0.7, 2);
  if (sichtF(p, F.v)) gaube(S, F.v, b * 0.3, H, 0.9, 1.5, wand, dachF, GLAS, 1.5);
  S.quader(x0 + b * 0.4, H + 2, z0 + T * 0.5, x0 + b * 0.4 + 0.8, H + Math.min(b, T) * 0.45 + 1, z0 + T * 0.5 + 0.8, '#b9a89a');
  return { top: H + Math.min(b, T) * 0.45 + 1 };
}
function stuttgartRoh(S, scene, p) {
  const r = rng(`st:${p.seed}`);
  const v = p.variante ?? waehle(r, STUTT_V);
  const { w, d } = p;
  const mauer = waehle(r, MAUER);
  if (v === 'geschaeft50') {
    const zf = d - 4, T = Math.min(16, zf - 1);
    boden(S, 0, zf, w, d, '#d6d0c2', 0.3, 0.06);
    hof(S, r, 0, 0, w, zf - T);
    const br = teileBreite(r, w, 12, 18), typen = ['raster', 'loch', 'band'];
    let xa = 0, H = 0;
    br.forEach((b, i) => { H = Math.max(H, fuenfzigerHaus(S, scene, r, p, xa, zf - T, b, T, typen[(i + p.seed) % 3], i === 0, i === br.length - 1).top); xa += b; });
    leerPlane(S, scene, p, R(0, zf + 2.3, 1, 0, w), 5.0, 6.0);
    for (let x = 5; x < w - 2; x += 10) { S.box(0.14, 5.0, 0.14, x, 2.8, d - 1, '#5a6168'); S.box(1.4, 0.2, 0.3, x + 0.6, 5.3, d - 1, '#5a6168'); }
    return { hoehe: H };
  }
  const zs = d - 4; // Straßenkante
  boden(S, 0, zs, w, d, '#d6d0c2', 0.3, 0.06);
  if (v === 'staeffele' || v === 'kessel') {
    const n = v === 'kessel' ? 5 : 3, hs = v === 'kessel' ? 3.6 : 4.6;
    const dz = (zs - 2) / n;
    let top = 0;
    for (let k = n - 1; k >= 1; k--) stufe(S, 0, 0, w, zs - k * dz, 0.3 + k * hs, mauer, v === 'kessel' && k >= 2 ? '#b8a37a' : RASEN, p);
    const sx = w - 3.4;
    for (let k = 1; k < n; k++) {
      const lauf = staffel(S, sx, 2.4, zs - k * dz, 0.3 + (k - 1) * hs, 0.3 + k * hs, '#ebe6da', dz - 3);
      boden(S, sx - 0.2, zs - k * dz + lauf, sx + 2.6, zs - (k - 1) * dz, '#ebe6da', 0.3 + (k - 1) * hs, 0.1);
      for (let z = zs - k * dz + lauf + 1; z < zs - (k - 1) * dz - 1; z += 1.4) { busch(S, sx - 0.7, z, r, 0.45, 0.3 + (k - 1) * hs); busch(S, sx + 3.1, z, r, 0.45, 0.3 + (k - 1) * hs); }
    }
    boden(S, sx - 0.2, 0, sx + 2.6, zs - (n - 1) * dz, '#ebe6da', 0.3 + (n - 1) * hs, 0.1);
    for (let k = 0; k < n; k++) {
      const y = 0.3 + k * hs, zv = zs - k * dz - (k === 0 ? 0 : 0);
      const reben = v === 'kessel' && k >= 2;
      if (reben) { rebzeilen(S, r, 0, sx - 0.8, zv - dz + 0.5, zv - 0.6, y + 0.08, 2.0); if (k === n - 1) weinberghaeuschen(S, w * 0.3, zv - dz * 0.5, y + 0.08, r); continue; }
      // Häuser auf der Stufe, links der Treppe
      const T = Math.min(11, dz - 5), frei = sx - 2.5, zwei = frei > 22;
      const b = zwei ? Math.min(13, (frei - 3) / 2) : Math.min(14, frei - 1);
      const plaetze = zwei ? [[1.5, b], [1.5 + b + 3 + (k % 2) * 0, b]] : [[1.5 + (k % 2) * Math.max(0, frei - 1 - b), b]];
      for (const [hx, hb] of plaetze) {
        if (hb < 8) continue;
        const z0 = zv - (k === 0 ? 1.5 : 3.0) - T;
        top = Math.max(top, versetzt(S, scene, 0, y - 0.3, 0, (T2, g) => hanghaus(T2, g, r, p, hx, z0, hb, T, { n: k === 0 ? 4 : 3 }).top) + y - 0.3);
        if (k > 0) { baumRund(S, hx + hb + 1.2, zv - 2, r, 0.7, LAUB, y); for (let x = hx; x < hx + hb; x += 1.6) busch(S, x + 0.8, zv - 1.1, r, 0.5, y); }
      }
    }
    return { hoehe: Math.max(top, n * hs) };
  }
  // Halbhöhenlage: Garagen in der Stützmauer, Villa oben
  const yo = 6.0, zm = zs - 4;
  stufe(S, 0, 0, w, zm, yo, mauer, RASEN, p);
  const Fm = R(0, zm, 1, 0, w);
  if (sichtF(p, Fm)) {
    for (let i = 0; i < 2; i++) { const u = 3 + i * 3.6; fb(S, Fm, u, u + 3.0, 0.3, 2.7, -0.1, 0.04, waehle(r, ['#7d8288', '#9a6e45', '#e9e4da'])); for (let y = 0.6; y < 2.6; y += 0.4) fb(S, Fm, u + 0.1, u + 2.9, y, y + 0.05, 0.04, 0.07, '#5a6168'); }
    fb(S, Fm, 0, w, yo + 0.2, yo + 1.2, 0.0, 0.1, '#3b4046');
  }
  staffelX(S, w * 0.62, zm, zm + 1.8, 0.3, yo);
  const T = Math.min(14, zm - 10), b = Math.min(18, w - 14);
  const top = versetzt(S, scene, 0, yo - 0.3, 0, (T2, g) => villa(T2, g, r, p, 4, zm - 7 - T, b, T).top) + yo - 0.3;
  for (let x = 1; x < w - 1; x += 1.4) busch(S, x, zm - 1.2, r, 0.55, yo);
  for (let i = 0; i < 4; i++) baumRund(S, zw(r, b + 6, w - 2), zw(r, 3, zm - 4), r, zw(r, 0.9, 1.2), LAUB, yo);
  nadelbaum(S, 2.5, 3, r, 11, yo);
  boden(S, b + 5, zm - 6, w - 1, zm - 3, '#cfc6b4', yo, 0.1);
  return { hoehe: top };
}

// =====================================================================================
// 10. Barockes Residenzschloss, Fächerstadt, Quadrate
// =====================================================================================
const SCHLOSS_V = ['residenz', 'lustschloss', 'zirkel', 'quadrat'];
function schlossFarben(r) {
  return { wand: waehle(r, ['#f1e6c8', '#efe2d2', '#f2ecdf', '#eadfc6', '#f0dccd']), orn: ORN, lis: waehle(r, ['#e2cf9e', '#ddc8a8', '#e8dcc0', '#d9c39a']), dach: waehle(r, ['#5d6a72', '#56636c', '#a85440']), dach2: '#4d585f', rust: '#e3d8c0' };
}
/** Barockflügel über [x0,x1]×[z0,z1], Mansarddach, Fassaden auf allen sichtbaren Seiten. o: { n, risalit: Seitenschlüssel } */
function barockFluegel(S, scene, p, c, x0, z0, x1, z1, o = {}) {
  const eg = o.eg ?? 5.0, gh = o.gh ?? 4.4, n = o.n ?? 2, H = eg + n * gh;
  const F = seiten(x0, z0, x1 - x0, z1 - z0);
  S.quader(x0, 0, z0, x1, H, z1, c.wand);
  for (const k of ['v', 'r', 'h', 'l']) {
    if (!sichtF(p, F[k])) continue;
    const Fk = F[k], L = Fk.L;
    fb(S, Fk, 0, L, 0.3, eg, 0, 0.1, c.rust);
    for (let i = 1; i < 4; i++) fb(S, Fk, 0, L, 0.3 + i * (eg / 4), 0.36 + i * (eg / 4), 0.1, 0.14, dunkler(c.rust, 0.08));
    const us = achsen(0, L, o.ra ?? 3.4, 0.9);
    for (const u of us) {
      fenster(S, Fk, u, 1.3, 1.3, 2.4, { rahmen: c.orn, glas: GLAS, bogen: true, sims: false, t: 0.1 });
      for (let kk = 0; kk < n; kk++) fenster(S, Fk, u, eg + kk * gh + 0.8, 1.35, kk === 0 ? 2.5 : 2.0, { rahmen: c.orn, glas: GLAS, fasche: c.orn, verdachung: kk === 0 ? (o.risalit === k && Math.abs(u - L / 2) < 6 ? 'dreieck' : 'segment') : null, ornF: c.orn });
    }
    fb(S, Fk, -0.1, L + 0.1, eg - 0.1, eg + 0.2, 0, 0.3, c.orn);
    fb(S, Fk, -0.2, L + 0.2, H - 0.5, H, 0, 0.6, c.orn);
    for (let i = 0; i <= us.length; i += 2) { const u = i === 0 ? 0.3 : i >= us.length ? L - 0.3 : (us[i - 1] + us[i]) / 2; fb(S, Fk, u - 0.35, u + 0.35, eg + 0.2, H - 0.5, 0, 0.2, c.lis); }
    if (o.risalit === k) {
      const rb = Math.min(14, L * 0.36), u0 = L / 2 - rb / 2;
      fb(S, Fk, u0, u0 + rb, 0.3, H, 0, 1.0, c.wand);
      for (const u of achsen(u0, u0 + rb, 3.4, 0.5)) { fenster(S, Fk, u, 1.3, 1.6, 3.0, { rahmen: c.orn, glas: GLAS, bogen: true, sims: false, t: 1.0 }); for (let kk = 0; kk < n; kk++) fenster(S, Fk, u, eg + kk * gh + 0.8, 1.4, kk === 0 ? 2.6 : 2.0, { rahmen: c.orn, glas: GLAS, fasche: c.orn, t: 1.0, verdachung: kk === 0 ? 'dreieck' : null }); }
      for (const u of achsen(u0, u0 + rb, 1.7, 0.2)) fb(S, Fk, u - 0.3, u + 0.3, eg + 0.2, H - 0.5, 1.0, 1.25, c.lis);
      fb(S, Fk, u0 - 0.2, u0 + rb + 0.2, H - 0.6, H, 0.9, 1.6, c.orn);
      fpoly(S, Fk, [[u0 - 0.2, H], [u0 + rb + 0.2, H], [L / 2, H + rb * 0.24]], 0.8, 1.5, c.orn);
      fpoly(S, Fk, [[u0 + 0.6, H + 0.3], [u0 + rb - 0.6, H + 0.3], [L / 2, H + rb * 0.24 - 0.4]], 1.5, 1.55, c.wand);
      fscheibe(S, Fk, L / 2, H + rb * 0.1, 1.55, 1.62, 0.8, c.lis);
      for (const u of [u0, u0 + rb, L / 2]) { zyl(S, 0.3, 0.4, 1.2, ...wp(Fk, u, 1.2).flatMap((q, i) => (i === 0 ? [q, H + (u === L / 2 ? rb * 0.24 : 0)] : [q])), c.orn, 6); }
    }
  }
  const T = Math.min(x1 - x0, z1 - z0), h1 = Math.min(4.2, T * 0.3), k = h1 * 0.38;
  mansardWalm(S, x0, z0, x1, z1, H, h1, k, Math.min(2.4, (T / 2 - k) * 0.4), c.dach, c.dach2, 0.4);
  // Mansardgauben
  for (const kk of ['v', 'r', 'h', 'l']) {
    if (!sichtF(p, F[kk])) continue;
    for (const u of achsen(0, F[kk].L, (o.ra ?? 3.4) * 2, 1.2)) {
      fb(S, F[kk], u - 0.6, u + 0.6, H + 0.3, H + 2.4, -1.6, -0.5, c.orn);
      fb(S, F[kk], u - 0.4, u + 0.4, H + 0.6, H + 2.0, -0.55, -0.46, GLAS);
      fbogen(S, F[kk], u, H + 2.2, 1.5, 0.75, -1.7, -0.4, c.dach);
    }
  }
  return H + h1 + 2.4;
}
function parterre(S, r, x0, z0, x1, z1, o = {}) {
  boden(S, x0, z0, x1, z1, KIES, 0.3, 0.07);
  const nx = o.nx ?? 2, nz = o.nz ?? 2, wx = (x1 - x0) / nx, wz = (z1 - z0) / nz;
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const a = x0 + i * wx + 1.5, b = z0 + k * wz + 1.5, c = x0 + (i + 1) * wx - 1.5, dd = z0 + (k + 1) * wz - 1.5;
    if (c - a < 2 || dd - b < 2) continue;
    boden(S, a, b, c, dd, '#8fbf75', 0.3, 0.12);
    S.quader(a, 0.42, b, c, 0.75, b + 0.4, '#5f8f4c'); S.quader(a, 0.42, dd - 0.4, c, 0.75, dd, '#5f8f4c');
    S.quader(a, 0.42, b, a + 0.4, 0.75, dd, '#5f8f4c'); S.quader(c - 0.4, 0.42, b, c, 0.75, dd, '#5f8f4c');
    boden(S, (a + c) / 2 - 1.2, (b + dd) / 2 - 1.2, (a + c) / 2 + 1.2, (b + dd) / 2 + 1.2, '#d0453a', 0.42, 0.18);
    for (const [x, z] of [[a, b], [c, b], [a, dd], [c, dd]]) { const g = new THREE.ConeGeometry(0.7, 2.4, 6); g.translate(x, 1.5, z); S.add(g, '#4f7d4c'); }
  }
  if (o.becken !== false) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, rr = Math.min(5, (x1 - x0) * 0.1); zyl(S, rr, rr, 0.6, cx, 0.3, cz, '#e3dccd', 20); zyl(S, rr - 0.4, rr - 0.4, 0.62, cx, 0.31, cz, WASSER, 20); zyl(S, 0.1, 0.3, 3.5, cx, 0.9, cz, '#e3f3f5', 6); }
}
function schlossRoh(S, scene, p) {
  const r = rng(`sc:${p.seed}`);
  const v = p.variante ?? waehle(r, SCHLOSS_V);
  const c = schlossFarben(r);
  const { w, d } = p;
  boden(S, 0, 0, w, d, '#d8d1c0', 0.3, 0.05);
  if (v === 'residenz') {
    const xa = w * 0.1, xb = w * 0.9, fl = Math.min(16, w * 0.13), zc0 = 6, zc1 = zc0 + 16, zw1 = d - 18;
    let top = barockFluegel(S, scene, p, c, xa, zc0, xb, zc1, { n: 2, risalit: 'v' });
    for (const [x0, x1] of [[xa, xa + fl], [xb - fl, xb]]) top = Math.max(top, barockFluegel(S, scene, p, c, x0, zc1, x1, zw1, { n: 2 }));
    // Eckpavillons an den Flügelköpfen höher
    for (const [x0, x1] of [[xa - 1, xa + fl + 1], [xb - fl - 1, xb + 1]]) barockFluegel(S, scene, p, c, x0, zw1 - 14, x1, zw1 + 1, { n: 2, eg: 5.4, gh: 4.8, risalit: 'v', ra: 3.6 });
    // Turm über der Mitte
    const tx = w / 2, tz = zc0 + 8, Hb = 5 + 2 * 4.4;
    zyl(S, 4.6, 4.6, 12, tx, Hb, tz, c.wand, 8);
    zyl(S, 4.9, 4.9, 0.5, tx, Hb + 12, tz, c.orn, 8);
    for (const { F: Fo, nx, nz, kante } of oktoRahmen(tx, tz, 4.6 * Math.cos(PI / 8))) { if (!sicht(p, nx, nz)) continue; fbogen(S, Fo, kante / 2, Hb + 3, 1.3, 4.5, -0.1, 0.08, GLAS); fscheibe(S, Fo, kante / 2, Hb + 9.5, 0, 0.1, 0.9, '#f4efe0'); fb(S, Fo, -0.05, 0.4, Hb, Hb + 12, 0, 0.15, c.lis); }
    const kup = new THREE.LatheGeometry([[5.0, 0], [4.8, 1.6], [4.0, 3.2], [2.6, 4.4], [1.2, 5.0], [0.001, 5.2]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
    kup.translate(tx, Hb + 12.5, tz); S.add(kup, waehle(r, KUPFER));
    zyl(S, 1.0, 1.0, 2.6, tx, Hb + 17.4, tz, c.wand, 8);
    zwiebel(S, tx, Hb + 20, tz, 1.1, 2.6, waehle(r, KUPFER), 10);
    S.add(new THREE.SphereGeometry(0.4, 8, 6).translate(tx, Hb + 22.6, tz), GOLD);
    top = Math.max(top, Hb + 23);
    // Ehrenhof
    const hx0 = xa + fl + 2, hx1 = xb - fl - 2;
    parterre(S, r, hx0, zc1 + 4, hx1, zw1 - 2, { nx: 2, nz: 2 });
    boden(S, w / 2 - 3, zc1, w / 2 + 3, d, KIES, 0.3, 0.09);
    // Gitter mit Tor
    const zg = d - 8;
    for (let x = xa + fl + 1; x < xb - fl - 1; x += 0.9) if (Math.abs(x - w / 2) > 3.5) S.box(0.08, 2.4, 0.08, x, 1.5, zg, '#2b2f33');
    S.quader(xa + fl + 1, 2.6, zg - 0.06, w / 2 - 3.5, 2.75, zg + 0.06, '#2b2f33'); S.quader(w / 2 + 3.5, 2.6, zg - 0.06, xb - fl - 1, 2.75, zg + 0.06, '#2b2f33');
    for (const x of [w / 2 - 3.5, w / 2 + 3.5]) { S.box(1.2, 4.2, 1.2, x, 2.4, zg, c.wand); S.box(1.0, 1.0, 1.0, x, 5.0, zg, GOLD); }
    for (const x of [6, w - 6]) for (let z = zc1 + 6; z < d - 4; z += 9) baumRund(S, x, z, r, 0.9);
    return { hoehe: top };
  }
  if (v === 'lustschloss') {
    const b = Math.min(56, w - 16), x0 = (w - b) / 2, z0 = 6, T = 16;
    let top = barockFluegel(S, scene, p, c, x0, z0, x0 + b, z0 + T, { n: 1, eg: 5.2, gh: 4.6 });
    for (const xx of [x0 - 2, x0 + b - 10]) top = Math.max(top, barockFluegel(S, scene, p, c, xx, z0 - 1, xx + 12, z0 + T + 2, { n: 1, eg: 5.6, gh: 5.0, risalit: 'v' }));
    // ovaler Mittelsaal mit Kuppel
    const cx = w / 2, cz = z0 + T, rr = 7.5, Hs = 12.5;
    const g = new THREE.CylinderGeometry(rr, rr, Hs, 16, 1, false, -PI / 2, PI); g.scale(1, 1, 0.75); g.translate(cx, Hs / 2, cz); S.add(g, c.wand);
    zyl(S, rr * 0.8, rr * 0.8, 1.2, cx, Hs, cz - 1.5, c.wand, 12);
    const kup = new THREE.LatheGeometry([[rr * 0.85, 0], [rr * 0.8, 1.8], [rr * 0.6, 3.6], [rr * 0.3, 4.8], [0.001, 5.2]].map(([a, bb]) => new THREE.Vector2(a, bb)), 14);
    kup.translate(cx, Hs + 1.2, cz - 1.5); S.add(kup, waehle(r, KUPFER));
    S.add(new THREE.SphereGeometry(0.5, 8, 6).translate(cx, Hs + 6.6, cz - 1.5), GOLD);
    for (let i = 0; i < 5; i++) {
      const a = -PI / 2 + ((i + 0.5) * PI) / 5, nx = Math.sin(a), nz = Math.cos(a) / 0.75;
      if (!sicht(p, nx, nz)) continue;
      const px = cx + Math.sin(a) * rr, pz = cz + Math.cos(a) * rr * 0.75, L = wurzelSumme(nx, nz);
      const Fo = R(px - (nz / L) * 1.2, pz + (nx / L) * 1.2, nz / L, -nx / L, 2.4);
      fbogen(S, Fo, 1.2, 1.0, 1.6, 4.0, -0.2, 0.1, GLAS); fenster(S, Fo, 1.2, 6.6, 1.4, 2.4, { rahmen: c.orn, glas: GLAS, fasche: c.orn, sims: false });
    }
    top = Math.max(top, Hs + 7);
    parterre(S, r, x0, z0 + T + 9, x0 + b, d - 4, { nx: 4, nz: 2 });
    for (let x = x0; x <= x0 + b; x += b / 6) for (const z of [z0 + T + 7, d - 2]) { const gg = new THREE.ConeGeometry(0.9, 3.4, 6); gg.translate(x, 2.0, z); S.add(gg, '#4f7d4c'); }
    return { hoehe: top };
  }
  if (v === 'zirkel') {
    // konkave Häuserzeile auf einem Kreisbogen (Fächerstadt)
    const T = 12, n = 2, eg = 4.2, gh = 3.6, H = eg + n * gh;
    const Phi = 0.9, Rr = (w - 4) / (2 * Math.sin(Phi / 2)), sag = Rr * (1 - Math.cos(Phi / 2));
    const cx = w / 2, cz = d - 5 + Rr * Math.cos(Phi / 2);
    const m = Math.max(5, Math.round((Rr * Phi) / 9)), dphi = Phi / m, ext = T * Math.tan(dphi / 2) + 0.1;
    boden(S, 0, d - 5 - sag, w, d, PFLASTER, 0.3, 0.06);
    let top = H;
    for (let i = 0; i < m; i++) {
      const a = -Phi / 2 + i * dphi, b2 = a + dphi;
      const Pa = [cx + Rr * Math.sin(a), cz - Rr * Math.cos(a)], Pb = [cx + Rr * Math.sin(b2), cz - Rr * Math.cos(b2)];
      const Ls = wurzelSumme(Pb[0] - Pa[0], Pb[1] - Pa[1]);
      const F = R(Pa[0], Pa[1], (Pb[0] - Pa[0]) / Ls, (Pb[1] - Pa[1]) / Ls, Ls);
      const wand = i % 2 ? c.wand : heller(c.wand, 0.02);
      fb(S, F, -ext, Ls + ext, 0, H, -T, 0, wand);
      if (sichtF(p, F)) {
        fb(S, F, 0, Ls, 0.3, eg, 0, 0.08, c.rust);
        for (const u of achsen(0, Ls, 3.0, 0.4)) { fenster(S, F, u, 1.2, 1.3, 2.2, { rahmen: c.orn, glas: GLAS, bogen: true, sims: false, t: 0.08 }); for (let k = 0; k < n; k++) fenster(S, F, u, eg + k * gh + 0.8, 1.25, 1.9, { rahmen: c.orn, glas: GLAS, fasche: c.orn, verdachung: k === 0 ? 'gerade' : null }); }
        fb(S, F, -ext, Ls + ext, eg - 0.1, eg + 0.15, 0, 0.25, c.orn);
        fb(S, F, -ext, Ls + ext, H - 0.4, H, 0, 0.5, c.orn);
        fb(S, F, 0, 0.6, eg, H - 0.4, 0, 0.15, c.lis);
      }
      const Fr = R(...wp(F, Ls, -T), -F.dx, -F.dz, Ls);
      if (sichtF(p, Fr)) lochfassade(S, Fr, 0, Ls, eg, n, gh, { ra: 3.0, fw: 1.1, fh: 1.6, rahmen: c.orn, glas: GLAS });
      const Q = quer(F, T);
      fpoly(S, Q, [[-0.4, H], [T + 0.4, H], [T - 1.4, H + 3.6], [1.4, H + 3.6]], -ext, Ls + ext, c.dach);
      fpoly(S, Q, [[1.4, H + 3.6], [T - 1.4, H + 3.6], [T / 2, H + 5.0]], -ext, Ls + ext, c.dach2);
      if (sichtF(p, F)) for (const u of achsen(0, Ls, 4.5, 0.6)) { fb(S, F, u - 0.55, u + 0.55, H + 0.3, H + 2.3, -1.5, -0.5, c.orn); fb(S, F, u - 0.35, u + 0.35, H + 0.6, H + 1.9, -0.55, -0.46, GLAS); }
      top = H + 5;
      // Bäume vor der Zeile
      const [bx, bz] = wp(F, Ls / 2, 4.0);
      if (bz < d - 0.5) baumRund(S, bx, bz, r, 0.75);
    }
    hof(S, r, 0, 0, w, Math.max(1, d - 5 - sag - T - 1), { boden: RASEN, baeume: 6 });
    return { hoehe: top };
  }
  // Quadrat: geschlossener Block mit Innenhof
  const T = 13, n = 3, eg = 4.4, gh = 3.5, H = eg + n * gh;
  boden(S, T, T, w - T, d - T, RASEN, 0.3, 0.06);
  for (let i = 0; i < 3; i++) baumRund(S, zw(r, T + 3, w - T - 3), zw(r, T + 3, d - T - 3), r, 0.9);
  const zeilen = [
    [R(0, d, 1, 0, w), w], [R(w, d - T, 0, -1, d - 2 * T), d - 2 * T], [R(w, 0, -1, 0, w), w], [R(0, T, 0, 1, d - 2 * T), d - 2 * T],
  ];
  for (const [F, L] of zeilen) {
    const br = teileBreite(r, L, 9, 13);
    let u = 0;
    br.forEach((b) => {
      const Fh = teil(F, u, u + b), wand = waehle(r, ['#f1e6c8', '#efe2d2', '#f2ecdf', '#e6dccb', '#efe0c0', '#e3e6dc']);
      fb(S, Fh, 0, b, 0, H, -T, 0, wand);
      const innen = R(...wp(Fh, b, -T), -Fh.dx, -Fh.dz, b);
      for (const [Fk, haupt] of [[Fh, true], [innen, false]]) {
        if (!sichtF(p, Fk)) continue;
        if (haupt) { laden(S, scene, Fk, 0.5, b - 0.5, eg - 0.4, r, { leer: p.zustand === 'leerstand', namen: LAEDEN_BW }); fb(S, Fk, -0.03, b + 0.03, eg - 0.1, eg + 0.15, 0, 0.2, ORN); }
        for (let k = 0; k < n; k++) for (const uu of achsen(0, b, 2.9, 0.5)) fenster(S, Fk, uu, eg + k * gh + 0.8, 1.2, 1.9, { rahmen: ORN, glas: GLAS, fasche: haupt ? ORN : null, verdachung: haupt && k === 0 ? 'gerade' : null });
        if (!haupt) for (const uu of achsen(0, b, 2.9, 0.5)) fenster(S, Fk, uu, 1.4, 1.1, 1.6, { rahmen: ORN, glas: GLAS });
        fb(S, Fk, -0.03, b + 0.03, H - 0.35, H, 0, haupt ? 0.45 : 0.2, ORN);
      }
      const Q = quer(Fh, T);
      fpoly(S, Q, [[-0.3, H], [T + 0.3, H], [T - 1.3, H + 3.4], [1.3, H + 3.4]], 0, b, c.dach);
      fpoly(S, Q, [[1.3, H + 3.4], [T - 1.3, H + 3.4], [T / 2, H + 4.6]], 0, b, c.dach2);
      if (sichtF(p, Fh)) for (const uu of achsen(0, b, 4.4, 0.8)) { fb(S, Fh, uu - 0.55, uu + 0.55, H + 0.3, H + 2.2, -1.4, -0.5, ORN); fb(S, Fh, uu - 0.35, uu + 0.35, H + 0.6, H + 1.8, -0.55, -0.46, GLAS); }
      u += b;
    });
  }
  // Eckhäuser mit Walm schließen die Ecken
  for (const [x0, z0] of [[0, 0], [w - T, 0], [0, d - T], [w - T, d - T]]) mansardWalm(S, x0, z0, x0 + T, z0 + T, H, 3.4, 1.3, 1.2, c.dach, c.dach2, 0.3);
  return { hoehe: H + 4.6 };
}

// =====================================================================================
// 11. Rotes Sandstein-Münster
// =====================================================================================
const MUENSTER_V = ['freiburg', 'ulm', 'stadtkirche'];
function pinakel(S, x, y, z, h, c) { S.box(0.7, h * 0.4, 0.7, x, y + h * 0.2, z, c); const g = new THREE.ConeGeometry(0.5, h * 0.6, 4); g.rotateY(PI / 4); g.translate(x, y + h * 0.4 + h * 0.3, z); S.add(g, c); }
/** Oktogonale Seitenrahmen um (cx, cz) mit Inkreisradius ri; Flächen bei Winkeln k·π/4. */
function oktoRahmen(cx, cz, ri) {
  const kante = 2 * ri * Math.tan(PI / 8), out = [];
  for (let i = 0; i < 8; i++) { const a = (i * PI) / 4, nx = Math.cos(a), nz = Math.sin(a); const mx = cx + nx * ri, mz = cz + nz * ri; out.push({ F: R(mx - (nz * kante) / 2, mz + (nx * kante) / 2, nz, -nx, kante), nx, nz, kante }); }
  return out;
}
function maasswerkHelm(S, p, cx, cz, y0, ri, h, st, dunkel) {
  const Rv = ri / Math.cos(PI / 8);
  const g = new THREE.ConeGeometry(Rv * 0.9, h, 8); g.rotateY(PI / 8); g.translate(cx, y0 + h / 2, cz); S.add(g, dunkel);
  const spitze = [cx, y0 + h, cz];
  for (let i = 0; i < 8; i++) {
    const a = (i * PI) / 4 + PI / 8, vx = cx + Math.cos(a) * Rv, vz = cz + Math.sin(a) * Rv;
    stab(S, [vx, y0, vz], spitze, 0.32, st, 4);
    if (sicht(p, Math.cos(a), Math.sin(a))) for (let k = 1; k < 7; k++) { const t = k / 7; S.box(0.55, 0.55, 0.55, vx + (cx - vx) * t + Math.cos(a) * 0.3, y0 + h * t, vz + (cz - vz) * t + Math.sin(a) * 0.3, st); }
  }
  for (let k = 1; k <= 4; k++) { const t = k / 5, rr = Rv * (1 - t) * 0.98; const ring = new THREE.CylinderGeometry(rr, rr, 0.4, 8, 1, true); ring.rotateY(PI / 8); ring.translate(cx, y0 + h * t, cz); S.add(ring, st); }
  // Maßwerk-Andeutung: Rosetten auf sichtbaren Flächen
  for (const { F, nx, nz, kante } of oktoRahmen(cx, cz, ri * 0.88)) {
    if (!sicht(p, nx, nz)) continue;
    for (let k = 0; k < 3; k++) { const t = 0.12 + k * 0.22, sc = 1 - t; fscheibe(S, teil(F, kante / 2 - 0.1, kante / 2 + 0.1, -ri * 0.88 * t), 0.1, y0 + h * t + 1.2, 0, 0.2, Math.max(0.3, kante * sc * 0.28), st, 8); }
  }
  S.add(new THREE.OctahedronGeometry(1.0, 0).translate(cx, y0 + h + 0.6, cz), st);
  S.box(0.3, 2.4, 0.3, cx, y0 + h + 1.6, cz, st); S.box(1.6, 0.3, 0.3, cx, y0 + h + 2.0, cz, st);
}
function muensterRoh(S, scene, p) {
  const r = rng(`ms:${p.seed}`);
  const v = p.variante ?? waehle(r, MUENSTER_V);
  const { w, d } = p, xm = w / 2;
  const st = v === 'ulm' ? '#c48e78' : v === 'freiburg' ? '#a9584a' : '#b5634f', st2 = dunkler(st, 0.07), hst = heller(st, 0.07);
  const dach = v === 'freiburg' ? '#6b5a52' : v === 'ulm' ? '#5d6a72' : waehle(r, BIBER), dunkel = '#3c3434';
  boden(S, 0, 0, w, d, PFLASTER, 0.3, 0.06);
  const halle = v === 'stadtkirche';
  const tb = v === 'ulm' ? 12 : v === 'freiburg' ? 13 : 10, zf = d - 6;
  const Bn = halle ? 0 : 13, Bg = halle ? 24 : 28, Hn = halle ? 18 : 25, Ha = halle ? 18 : 11;
  const L = Math.min(46, d - tb - 30);
  const zt0 = zf - tb, zn1 = zt0 + 1, zn0 = zn1 - L;
  const xg0 = xm - Bg / 2;
  const Fv = R(xg0, zn1, 1, 0, Bg);
  // Langhaus
  S.quader(xg0, 0, zn0, xg0 + Bg, Ha, zn1, st);
  if (!halle) S.quader(xm - Bn / 2, Ha, zn0, xm + Bn / 2, Hn, zn1, st);
  const joch = 6.2, nj = Math.max(3, Math.round(L / joch)), jl = L / nj;
  for (const sg of [1, -1]) {
    const Fa = sg > 0 ? R(xg0 + Bg, zn1, 0, -1, L) : R(xg0, zn0, 0, 1, L);
    const Fo = sg > 0 ? R(xm + Bn / 2, zn1, 0, -1, L) : R(xm - Bn / 2, zn0, 0, 1, L);
    if (!sichtF(p, Fa)) continue;
    for (let i = 0; i < nj; i++) {
      const u = (i + 0.5) * jl;
      gotFenster(S, Fa, u, 2.6, Math.min(3.0, jl * 0.45), Ha - 4.2, hst);
      if (!halle) gotFenster(S, Fo, u, Ha + 2.2, Math.min(2.6, jl * 0.4), Hn - Ha - 3.6, hst);
      // Wimperg über den Seitenschiff-Fenstern mit Krabben
      const wb = Math.min(3.0, jl * 0.45) + 0.8, wy = Ha - 1.0;
      fpoly(S, Fa, [[u - wb / 2, wy], [u + wb / 2, wy], [u, wy + 2.4]], 0, 0.2, hst);
      krabben(S, Fa, [[u - wb / 2, wy], [u, wy + 2.4], [u + wb / 2, wy]], 0.1, hst, 1.1);
    }
    for (let i = 0; i <= nj; i++) {
      const u = Math.min(L - 0.6, Math.max(0.6, i * jl));
      // Strebepfeiler mit Wasserschlägen und Fiale
      fb(S, Fa, u - 0.65, u + 0.65, 0.3, Ha * 0.5, 0, 1.8, st2);
      fb(S, Fa, u - 0.6, u + 0.6, Ha * 0.5, Ha + 1.2, 0, 1.3, st2);
      fb(S, Fa, u - 0.7, u + 0.7, Ha * 0.5 - 0.3, Ha * 0.5, 0, 1.95, hst);
      const [px, pz] = wp(Fa, u, 0.7);
      fiale(S, px, Ha + 1.2, pz, 5.0, st2);
      if (!halle) {
        const [qx, qz] = wp(Fo, u, 0.2), [mx, mz] = wp(Fo, u, 0.9);
        stab(S, [px, Ha + 1.6, pz], [qx, Hn - 4, qz], 0.4, st2, 4);
        stab(S, [px, Ha - 0.6, pz], [qx, Hn - 7.5, qz], 0.3, st2, 4);
        fb(S, Fo, u - 0.45, u + 0.45, Ha, Hn - 1.5, 0, 0.9, st2);
        fiale(S, mx, Hn - 1.5, mz, 3.8, st2);
      }
    }
    fb(S, Fa, 0, L, Ha - 0.5, Ha, 0, 0.4, hst);
    fb(S, Fa, 0, L, 0.3, 1.2, 0, 0.2, st2);
    if (!halle) { fb(S, Fo, 0, L, Hn - 0.5, Hn, 0, 0.4, hst); for (let u = 0.6; u < L; u += 0.9) fb(S, Fo, u - 0.12, u + 0.12, Hn, Hn + 0.8, 0.1, 0.35, hst); }
    // Dachluken auf den sichtbaren Dachflächen
    const Fd = sg > 0 ? R(xm + Bn / 2, zn1, 0, -1, L) : R(xm - Bn / 2, zn0, 0, 1, L);
    if (!halle) for (let i = 0; i < nj; i++) { dachluke(S, Fd, (i + 0.5) * jl, Hn, 1.9, dach, 2.4, 1.2); if (i % 2 === 0) dachluke(S, Fd, (i + 0.5) * jl, Hn, 1.9, dach, 5.0, 0.9); }
    else { const Fh = sg > 0 ? R(xg0 + Bg, zn1, 0, -1, L) : R(xg0, zn0, 0, 1, L); for (let i = 0; i < nj; i++) { dachluke(S, Fh, (i + 0.5) * jl, Ha, 1.5, dach, 3.0, 1.2); dachluke(S, Fh, (i + 0.5) * jl, Ha, 1.5, dach, 7.5, 1.0); } }
  }
  if (halle) dachGiebel(S, Fv, 0, Bg, -L, 0, Ha, Bg * 0.75, dach, st, { ue: 0.4, uf: 0, ub: 0 });
  else {
    fdiag(S, Fv, Bg / 2 - Bn / 2 + 0.1, Ha + 3.4, -0.6, Ha - 0.3, 0.3, -L, 0, dach);
    fdiag(S, Fv, Bg / 2 + Bn / 2 - 0.1, Ha + 3.4, Bg + 0.6, Ha - 0.3, 0.3, -L, 0, dach);
    dachGiebel(S, Fv, Bg / 2 - Bn / 2, Bg / 2 + Bn / 2, -L, 0, Hn, Bn * 0.95, dach, st, { ue: 0.4, uf: 0, ub: 0 });
    if (v === 'freiburg') {
      // glasierte Ziegelbänder im Rautenmuster
      const u0 = Bg / 2 - Bn / 2 - 0.4, um = Bg / 2, hh = Bn * 0.95, y0 = Hn - 0.4 * (2 * hh / Bn);
      for (const [a, b2, f] of [[0.3, 0.36, '#b98a4a'], [0.58, 0.64, '#56705a']]) {
        for (const sg of [-1, 1]) {
          const ua = um + sg * (um - u0) * (1 - a), ub = um + sg * (um - u0) * (1 - b2);
          const ya = y0 + (Hn + hh - y0) * a, yb = y0 + (Hn + hh - y0) * b2;
          for (let i = 0; i < 10; i++) { const t0 = -L + (i * L) / 10 + 0.8, t1 = t0 + L / 10 - 1.6; fdiag(S, Fv, ua, ya + 0.04, ub, yb + 0.04, 0.4, t0, t1, i % 2 ? f : '#7d4a3a'); }
        }
      }
    }
  }
  // Querhaus
  const qz0 = zn0 + 2, qz1 = qz0 + 11, qb = halle ? 0 : 7;
  if (qb) {
    S.quader(xg0 - qb, 0, qz0, xg0 + Bg + qb, Hn, qz1, st);
    for (const sg of [1, -1]) {
      const Fq = sg > 0 ? R(xg0 + Bg + qb, qz1, 0, -1, 11) : R(xg0 - qb, qz0, 0, 1, 11);
      if (!sichtF(p, Fq)) continue;
      fscheibe(S, Fq, 5.5, Hn - 6, 0, 0.12, 3.2, hst, 16); fscheibe(S, Fq, 5.5, Hn - 6, 0.12, 0.2, 2.6, GLAS_DUNKEL, 16);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * PI; fdiag(S, Fq, 5.5 - Math.cos(a) * 2.6, Hn - 6 - Math.sin(a) * 2.6, 5.5 + Math.cos(a) * 2.6, Hn - 6 + Math.sin(a) * 2.6, 0.14, 0.2, 0.28, hst); }
      fscheibe(S, Fq, 5.5, Hn - 6, 0.2, 0.3, 0.7, hst, 10);
      fbogen(S, Fq, 5.5, 0.3, 4.2, 7.2, 0, 0.3, hst, 'spitz'); fbogen(S, Fq, 5.5, 0.3, 3.0, 6, -0.1, 0.35, '#5a3a32', 'spitz');
      gotFenster(S, Fq, 5.5, 8.4, 3.4, Hn - 15.5, hst);
      fpoly(S, Fq, [[-0.2, Hn], [11.2, Hn], [5.5, Hn + 9]], -0.4, 0.15, st);
      krabben(S, Fq, [[-0.2, Hn], [5.5, Hn + 9], [11.2, Hn]], 0.1, hst, 1.6);
      for (let k = 0; k < 3; k++) fbogen(S, Fq, 3.2 + k * 2.3, Hn + 1, 1.2, 4.2 - Math.abs(k - 1) * 0.0 + (k === 1 ? 2.2 : 0), -0.1, 0.2, GLAS_DUNKEL, 'spitz');
      const [gx, gz] = wp(Fq, 5.5, 0); S.add(new THREE.OctahedronGeometry(0.8, 0).translate(gx, Hn + 9.6, gz), hst);
      for (const u of [0.5, 10.5]) { fb(S, Fq, u - 0.6, u + 0.6, 0.3, Hn + 1, 0, 1.2, st2); const [px, pz] = wp(Fq, u, 0.6); fiale(S, px, Hn + 1, pz, 6, st2); }
    }
    dachTrauf(S, R(xg0 - qb, qz1, 1, 0, Bg + 2 * qb), 0, Bg + 2 * qb, 11, Hn, 9, dach, null, { ue: 0.4, us: 0.2 });
    // Vierungsdachreiter
    const g = new THREE.ConeGeometry(1.6, 9, 8); g.rotateY(PI / 8); g.translate(xm, Hn + 9 + 4.5, (qz0 + qz1) / 2); S.add(g, dach);
  }
  // Chor mit Umgang
  const zc = zn0;
  S.quader(xg0, 0, zc - 8, xg0 + Bg, Ha, zc, st);
  const umd = new THREE.ConeGeometry(Bg / 2 + 0.4, 4, 10, 1, false, PI / 2, PI); umd.translate(xm, Ha + 2, zc - 8); S.add(umd, dach);
  const um2 = new THREE.CylinderGeometry(Bg / 2, Bg / 2, Ha, 10, 1, false, PI / 2, PI); um2.translate(xm, Ha / 2, zc - 8); S.add(um2, st);
  if (!halle) {
    const Bc = Bn + 2, Hc = Hn + 1;
    S.quader(xm - Bc / 2, Ha, zc - 8, xm + Bc / 2, Hc, zc, st);
    const ch = new THREE.CylinderGeometry(Bc / 2, Bc / 2, Hc - Ha, 8, 1, false, PI / 2, PI); ch.translate(xm, Ha + (Hc - Ha) / 2, zc - 8); S.add(ch, st);
    const chd = new THREE.ConeGeometry(Bc / 2 + 0.4, Bc * 0.8, 8, 1, false, PI / 2, PI); chd.translate(xm, Hc + Bc * 0.4, zc - 8); S.add(chd, dach);
    dachGiebel(S, R(xm - Bc / 2, zc, 1, 0, Bc), 0, Bc, -8, 0, Hc, Bc * 0.8, dach, null, { ue: 0.3, uf: 0, ub: 0 });
    for (let i = 0; i < 5; i++) { const a = PI + (i + 0.5) * (PI / 5), nx = Math.cos(a), nz = Math.sin(a); if (!sicht(p, nx, nz)) continue; const ax = xm + nx * Bc / 2, az = zc - 8 + nz * Bc / 2; gotFenster(S, R(ax - nz * 1.4, az + nx * 1.4, nz, -nx, 2.8), 1.4, Ha + 1.5, 1.8, Hc - Ha - 3, hst, 0.05);
      const bx = xm + nx * Bg / 2, bz = zc - 8 + nz * Bg / 2; gotFenster(S, R(bx - nz * 1.6, bz + nx * 1.6, nz, -nx, 3.2), 1.6, 2.4, 2.4, Ha - 4.2, hst, 0.05); fiale(S, xm + Math.cos(a - PI / 10) * (Bg / 2 + 0.6), Ha, zc - 8 + Math.sin(a - PI / 10) * (Bg / 2 + 0.6), 4, st2); }
    if (v === 'ulm' || v === 'freiburg') for (const sg of [-1, 1]) {
      const cx = xm + sg * (Bn / 2 + 2.6), cz = zc - 2;
      S.quader(cx - 2.6, 0, cz - 2.6, cx + 2.6, Hn + 8, cz + 2.6, st);
      zyl(S, 2.2, 2.2, 5, cx, Hn + 8, cz, st, 8);
      const g = new THREE.ConeGeometry(2.6, 11, 8); g.rotateY(PI / 8); g.translate(cx, Hn + 13 + 5.5, cz); S.add(g, st2);
      S.add(new THREE.OctahedronGeometry(0.6, 0).translate(cx, Hn + 24.6, cz), st);
    }
  } else {
    dachGiebel(S, R(xg0, zc, 1, 0, Bg), 0, Bg, -8, 0, Ha, Bg * 0.75, dach, null, { ue: 0.4, uf: 0, ub: 0 });
    const chd = new THREE.ConeGeometry(Bg / 2 + 0.4, Bg * 0.75, 10, 1, false, PI / 2, PI); chd.translate(xm, Ha + Bg * 0.375, zc - 8); S.add(chd, dach);
  }
  // Westturm
  const Ht = v === 'ulm' ? 104 : v === 'freiburg' ? 84 : 62;
  const Hq = Ht * (v === 'ulm' ? 0.5 : 0.44), Ho = Hq + Ht * (v === 'stadtkirche' ? 0.14 : 0.18);
  const tx0 = xm - tb / 2;
  S.quader(tx0, 0, zt0, tx0 + tb, Hq, zf, st);
  const Ft = seiten(tx0, zt0, tb, tb);
  for (const k of ['v', 'r', 'l', 'h']) {
    if (!sichtF(p, Ft[k])) continue;
    const Fk = Ft[k];
    for (const u of [0.6, tb - 0.6]) for (let s = 0; s < 3; s++) fb(S, Fk, u - 0.9 + s * 0.15 * (u < 1 ? 1 : -1) * 0, u + 0.9, 0.3, Hq * (0.45 + s * 0.27), 0, 1.6 - s * 0.45, st2);
    if (k === 'v') {
      for (let j = 0; j < 3; j++) fbogen(S, Fk, tb / 2, 0.3, 7.2 - j * 0.8, 11.2 - j * 0.7, 0, 0.9 - j * 0.15, j % 2 ? st2 : hst, 'spitz');
      fbogen(S, Fk, tb / 2, 0.3, 4.6, 8.6, 0.1, 0.95, '#5a3a32', 'spitz');
      fb(S, Fk, tb / 2 - 0.15, tb / 2 + 0.15, 0.3, 5.0, 0.9, 1.1, hst);
      fpoly(S, Fk, [[tb / 2 - 2.3, 5.0], [tb / 2 + 2.3, 5.0], [tb / 2, 7.6]], 0.9, 1.0, st2);
      fpoly(S, Fk, [[tb / 2 - 3.9, 10.8], [tb / 2 + 3.9, 10.8], [tb / 2, 15.6]], 0, 0.9, hst);
      krabben(S, Fk, [[tb / 2 - 3.9, 10.8], [tb / 2, 15.6], [tb / 2 + 3.9, 10.8]], 0.7, hst, 1.2);
      fscheibe(S, Fk, tb / 2, Hq * 0.62, 0, 0.12, 2.0, hst); fscheibe(S, Fk, tb / 2, Hq * 0.62, 0.12, 0.2, 1.6, GLAS_DUNKEL);
      for (let a = 0; a < 6; a++) { const an = (a / 6) * PI; fdiag(S, Fk, tb / 2 - Math.cos(an) * 1.6, Hq * 0.62 - Math.sin(an) * 1.6, tb / 2 + Math.cos(an) * 1.6, Hq * 0.62 + Math.sin(an) * 1.6, 0.12, 0.2, 0.26, hst); }
    } else gotFenster(S, Fk, tb / 2, Hq * 0.42, 2.2, Hq * 0.32, hst);
    // Blendmaßwerk und Galerien am Unterbau
    for (const y of [Hq * 0.36, Hq * 0.8]) { fb(S, Fk, 0.4, tb - 0.4, y, y + 0.35, 0, 0.45, hst); for (let u = 0.8; u < tb - 0.6; u += 0.7) fb(S, Fk, u - 0.08, u + 0.08, y + 0.35, y + 1.2, 0.1, 0.35, hst); fb(S, Fk, 0.4, tb - 0.4, y + 1.2, y + 1.35, 0, 0.4, hst); }
    for (let u = 2.0; u < tb - 1.6; u += 1.5) if (Math.abs(u - tb / 2) > 1.4 || k !== 'v') { fbogen(S, Fk, u, Hq * 0.82 + 1.6, 0.9, Hq * 0.14, -0.05, 0.08, st2, 'spitz'); }
    fscheibe(S, Fk, tb / 2, Hq - 3.2, 0, 0.12, 1.7, '#f2e6c8'); fscheibe(S, Fk, tb / 2, Hq - 3.2, 0.12, 0.17, 1.4, '#2f3a42');
    fb(S, Fk, tb / 2 - 0.08, tb / 2 + 0.08, Hq - 3.2, Hq - 2.0, 0.17, 0.22, GOLD);
    fb(S, Fk, -0.3, tb + 0.3, Hq - 0.8, Hq, 0, 0.5, hst);
  }
  // Galerie mit Pinakeln
  for (const [cx, cz] of [[tx0, zt0], [tx0 + tb, zt0], [tx0, zf], [tx0 + tb, zf]]) fiale(S, cx, Hq, cz, 6, st2);
  const ri = tb * 0.42;
  zyl(S, ri / Math.cos(PI / 8), ri / Math.cos(PI / 8), Ho - Hq, xm, Hq, zt0 + tb / 2, st, 8);
  for (const { F, nx, nz, kante } of oktoRahmen(xm, zt0 + tb / 2, ri)) {
    if (!sicht(p, nx, nz)) continue;
    gotFenster(S, F, kante / 2, Hq + 2.5, kante * 0.5, Ho - Hq - 5, hst);
    for (let j = 1; j <= 3; j++) fb(S, F, kante * 0.27, kante * 0.73, Hq + 2.5 + j * (Ho - Hq - 7) / 4, Hq + 2.6 + j * (Ho - Hq - 7) / 4, -0.12, -0.04, '#5a4636');
    fpoly(S, F, [[0, Ho - 0.5], [kante, Ho - 0.5], [kante / 2, Ho + 3.6]], -0.2, 0.25, st);
  }
  for (let i = 0; i < 8; i++) { const a = (i * PI) / 4 + PI / 8, Rv = ri / Math.cos(PI / 8); fiale(S, xm + Math.cos(a) * Rv, Ho - 1, zt0 + tb / 2 + Math.sin(a) * Rv, 5, st2); }
  if (v === 'stadtkirche') {
    const g = new THREE.ConeGeometry(ri / Math.cos(PI / 8), Ht - Ho, 8); g.rotateY(PI / 8); g.translate(xm, Ho + (Ht - Ho) / 2, zt0 + tb / 2); S.add(g, st2);
    S.box(0.3, 2.2, 0.3, xm, Ht + 1.1, zt0 + tb / 2, GOLD); S.box(1.4, 0.3, 0.3, xm, Ht + 1.5, zt0 + tb / 2, GOLD);
  } else maasswerkHelm(S, p, xm, zt0 + tb / 2, Ho, ri, Ht - Ho, st, dunkel);
  // Fassade beidseits des Turms (Seitenschiff-Stirnen)
  if (sichtF(p, Fv)) for (const [u0, u1] of [[0, Bg / 2 - tb / 2], [Bg / 2 + tb / 2, Bg]]) if (u1 - u0 > 2) { fbogen(S, Fv, (u0 + u1) / 2, 2.6, (u1 - u0) * 0.4, Ha - 4.5, -0.1, 0.06, GLAS_DUNKEL, 'spitz'); }
  // Münsterplatz: Pflasterbänder, Marktstände, Brunnen, Bäume, Laternen
  for (let x = 2; x < w; x += 4) boden(S, x - 0.12, zf, x + 0.12, d, PFLASTER2, 0.36, 0.01);
  const seitenX = [Math.max(2.5, (xg0 - (qb || 0)) / 2), Math.min(w - 2.5, w - (xg0 - (qb || 0)) / 2)];
  for (const [i, sx] of seitenX.entries()) {
    if (Math.min(sx, w - sx) < 2.2) continue;
    for (let z = zn0 + 6, k = 0; z < zt0 - 3 && k < 4; z += 6.5, k++) { const g = new THREE.Group(); void g; marktstand(S, r, sx, z, waehle(r, ['#c9483e', '#f2efe6', '#2f6f8f', '#3f7d56'])); }
    baumRund(S, sx, zf + 1, r, 0.9); laterne(S, sx, zt0 - 1.5);
    if (i === 1) brunnen(S, sx, zn0 - 6 > 4 ? zn0 - 6 : zt0 - 6, 1.8, { stein: hst, figurF: GOLD });
  }
  for (const x of [xm - tb, xm + tb]) bank(S, x, d - 2.4, PI);
  return { hoehe: Ht + 3.4 };
}

// =====================================================================================
// 12. Weinberg: Rebterrassen, Weinberghäuschen, Weingut, Kapelle
// =====================================================================================
const WEIN_V = ['terrassen', 'hang', 'weingut', 'kapelle'];
function weinbergRoh(S, scene, p) {
  const r = rng(`wb:${p.seed}`);
  const v = p.variante ?? waehle(r, WEIN_V);
  const { w, d } = p, mauer = waehle(r, ['#d9cfb4', '#cfc3a5', '#d6c9a8']), erde = '#bda97f';
  boden(S, 0, d - 2, w, d, '#cfc6b4', 0.3, 0.07);
  let top = 0;
  // Glatter Hang (gelaende.js, keine Stufenpyramide): steigt von der Straße (z = z1) nach hinten an, oben ein ebenes
  // Plateau der Tiefe dz für Häuschen oder Kapelle; Reben in Zeilen entlang der Höhenlinien, Trockenmauern und Querwege
  const n = v === 'hang' ? 9 : v === 'kapelle' ? 5 : 6, hs = v === 'hang' ? 1.1 : 2.6, z1 = d - 2.5, dz = z1 / n, Htop = n * hs;
  const glatt = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  // zur sichtbaren Seite (+x) läuft der Hang weich auf Straßenniveau aus: keine offene Geländekante am Slotrand
  const hang = (x, z) => 0.3 + Htop * glatt((z1 - z) / Math.max(1, z1 - dz)) * glatt((w - x) / 9);
  gelaende(S, 0, 0, w, z1, hang, (x, y, z) => (z < dz - 0.5 ? '#9dbb7f' : erde), { schritt: 2 });
  // Sockelmauer an der Straße (Hangfuß)
  S.quader(0, 0.3, z1 - 0.4, w, 1.0, z1 + 0.05, mauer);
  const sx = v === 'hang' ? w * 0.55 : w * zw(r, 0.25, 0.4);
  glatteReben(S, 0, dz, w, z1 - 1, (x, z) => hang(x, z) + 0.02, false, (x, y, z) => Math.abs(x - sx - 0.8) > 1.6 && z > dz + 0.5 && z < z1 - 1.2, { rebe: '#5b7a3c', mauer, weg: '#ddd2b6' });
  // Treppenweg bzw. Fahrweg den Hang hinauf
  for (let z = z1 - 0.6; z > dz - 0.8; z -= 0.9) { const y = hang(sx + 0.7, z); S.quader(sx, y - 0.5, z - 0.5, sx + 1.6, y + 0.12, z + 0.45, v === 'hang' ? '#d8cdb0' : mauer); }
  const yt = 0.3 + Htop;
  if (v === 'kapelle') {
    const kx = Math.min(w * 0.62, w - 15), kz = dz * 0.5, B = 6, L = 9, Hk = 6;
    const c = { wand: WEISS, orn: ORN, lisene: '#efe6cf', dach: waehle(r, BIBER) };
    versetzt(S, scene, 0, yt, 0, (T) => {
      T.quader(kx - B / 2, 0, kz - L / 2, kx + B / 2, Hk, kz + L / 2, c.wand);
      const F = seiten(kx - B / 2, kz - L / 2, B, L);
      dachGiebel(T, F.v, 0, B, -L, 0, Hk, B * 0.7, c.dach, c.wand, { ue: 0.4, uf: 0.4, ub: 0.4 });
      for (const k of ['v', 'r', 'l', 'h']) if (sichtF(p, F[k])) { if (k === 'v') { haustuer(T, F.v, B / 2, 0, 1.4, 2.6, HOLZ[0], ORN, true); fscheibe(T, F.v, B / 2, Hk + 1.6, 0, 0.08, 0.5, GLAS_DUNKEL); } else if (k !== 'h') { fbogen(T, F[k], L * 0.3, 2.0, 1.0, 2.8, -0.1, 0.06, GLAS_DUNKEL); fbogen(T, F[k], L * 0.7, 2.0, 1.0, 2.8, -0.1, 0.06, GLAS_DUNKEL); } }
      T.quader(kx - 0.8, Hk + 2.2, kz + L / 2 - 2.2, kx + 0.8, Hk + 4.6, kz + L / 2 - 0.6, c.wand);
      zwiebel(T, kx, Hk + 4.6, kz + L / 2 - 1.4, 0.9, 2.4, waehle(r, KUPFER), 10);
      kreuz(T, kx, Hk + 6.7, kz + L / 2 - 1.4, 1.0);
      baumRund(T, kx - B / 2 - 4, kz, r, 1.1, LAUB, 0.08);
      baumRund(T, kx + B / 2 + 3.5, kz - 2, r, 0.9, LAUB, 0.08);
      for (let x = 2; x < w - 2; x += 3.5) if (Math.abs(x - kx) > B / 2 + 5) busch(T, x, kz + zw(r, -2, 2), r, 0.8, 0.08);
      return null;
    });
    return { hoehe: yt + Hk + 7 };
  }
  if (v === 'hang') {
    weinberghaeuschen(S, sx + 4, dz * 0.5, yt + 0.08, r);
    const zk = z1 - 2.5 * dz, yk = hang(sx + 1.4, zk);
    S.box(0.3, 3.4, 0.3, sx + 2.4, yk + 1.7, zk, '#7a5638'); S.box(1.6, 0.25, 0.25, sx + 2.4, yk + 2.6, zk, '#7a5638');
    baumRund(S, sx - 3, dz * 0.4, r, 1.3, ['#5f8f4c'], yt);
    return { hoehe: yt + 6 };
  }
  if (v === 'terrassen') {
    weinberghaeuschen(S, w * 0.62, dz * 0.5, yt + 0.08, r);
    baumRund(S, w * 0.15, dz * 0.5, r, 1.0, ['#5f8f4c'], yt + 0.08);
    return { hoehe: yt + 5 };
  }
  // Weingut: Hof mit Wohnhaus, Kelterhaus, Rebhang dahinter
  const zh = d * 0.5;
  {
    const Hh = 6.5, hangW = (x, z) => 0.3 + Hh * glatt((zh - z) / zh) * glatt((w - x) / 9);
    gelaende(S, 0, 0, w, zh, hangW, () => erde, { schritt: 2 });
    glatteReben(S, 0, 0, w, zh - 0.6, (x, z) => hangW(x, z) + 0.02, false, (x, y, z) => z > 0.8 && z < zh - 0.8, { rebe: '#5b7a3c', mauer, weg: '#ddd2b6' });
  }
  boden(S, 0, zh, w, d - 2, PFLASTER2, 0.3, 0.06);
  const T = 11, b = Math.min(16, w * 0.4);
  const o = { ...bwHausO(r, 'tuebingen'), giebelstaendig: false, laden: false, n: 1, eg: 3.8, gh: 3.0, neig: 0.75, steinEG: true, stein: mauer, zwerch: false };
  top = fachwerkHaus(S, scene, r, p, 2, d - 2.5 - T, b, T, o, true, false).top;
  const F = seiten(2, d - 2.5 - T, b, T);
  if (sichtF(p, F.v)) ftext(scene, F.v, waehle(r, ['Weingut Kögel', 'Weingut Hägele', 'Weingut Sonnenhalde', 'Weinbau Rapp']), b / 2, 3.25, 0.12, 0.5, b * 0.7, '#5a3a2a');
  // Kelterhaus mit Tor
  const kx = b + 6, kb = Math.min(16, w - kx - 2), kt = 12, kz = zh + 1;
  if (kb > 8) {
    S.quader(kx, 0, kz, kx + kb, 5.2, kz + kt, mauer);
    const Fk = seiten(kx, kz, kb, kt);
    for (const k of ['v', 'r']) if (sichtF(p, Fk[k])) { fbogen(S, Fk[k], Fk[k].L / 2, 0.3, 3.4, 4.2, -0.1, 0.08, '#6b4a32'); fbogen(S, Fk[k], Fk[k].L / 2, 0.3, 4.0, 4.6, 0, 0.06, heller(mauer, 0.06)); }
    walm(S, kx, kz, kx + kb, kz + kt, 5.2, kt * 0.55, waehle(r, BIBER), 0.5);
    for (let i = 0; i < 5; i++) { const g = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 10); g.rotateX(PI / 2); g.translate(kx + 1 + i * 1.3, 0.9, kz + kt + 1.2); S.add(g, '#8a5a3a'); }
    top = Math.max(top, 5.2 + kt * 0.55);
  }
  // Besen und Hoftor
  S.box(0.12, 2.6, 0.12, 2 + b + 0.6, 3.8, d - 2.5, '#5a3a2a'); stab(S, [2 + b + 0.6, 4.6, d - 2.5], [2 + b + 0.6, 4.6, d - 1.2], 0.06, '#5a3a2a', 4);
  const g = new THREE.ConeGeometry(0.4, 1.2, 6); g.rotateX(PI); g.translate(2 + b + 0.6, 3.9, d - 1.2); S.add(g, '#c9a24a');
  for (let i = 0; i < 3; i++) garnitur(S, kx + 2 + i * 4.5, d - 4.5, 0.36);
  return { hoehe: top };
}

// =====================================================================================
// 13. Flussufer: Brücke, Fischerhäuser, Kai
// =====================================================================================
const FLUSS_V = ['bruecke', 'fischer', 'kai'];
function boot(S, x, z, L, farbe, y = 0.45) {
  S.box(L, 0.55, 1.5, x, y + 0.27, z, farbe);
  S.box(L - 0.4, 0.1, 1.2, x, y + 0.56, z, '#8a6a48');
  huelle(S, [[x + L / 2, y, z - 0.75], [x + L / 2, y, z + 0.75], [x + L / 2, y + 0.55, z - 0.75], [x + L / 2, y + 0.55, z + 0.75], [x + L / 2 + 1.2, y + 0.75, z]], farbe);
}
function flussRoh(S, scene, p) {
  const r = rng(`fl:${p.seed}`);
  const v = p.variante ?? waehle(r, FLUSS_V);
  const { w, d } = p;
  const Y = v === 'fischer' ? 1.6 : v === 'kai' ? 3.6 : 4.2, zq = d * (v === 'fischer' ? 0.6 : 0.55);
  const stein = waehle(r, ['#cfc4ac', '#c9bda3', '#d6cdb8']);
  S.quader(0, 0.05, zq, w, 0.42, d, WASSER);
  // Uferplateau mit Kaimauer, sichtbare Kanten als Stützmauer
  stufe(S, 0, 0, w, zq, Y, stein, PFLASTER, p);
  const Fq = R(0, zq, 1, 0, w);
  if (sichtF(p, Fq)) { for (let y = 0.9; y < Y; y += 0.7) fb(S, Fq, 0, w, y, y + 0.05, 0, 0.03, dunkler(stein, 0.06)); fb(S, Fq, 0, w, 0.42, 0.9, 0, 0.05, '#7f8a6a'); }
  S.quader(0, Y + 0.08, zq - 0.25, w, Y + 1.1, zq, '#d8d0bf');
  let top = Y;
  const hausreihe = (x0, x1, art) => {
    const T = Math.min(12, zq - 9);
    if (x1 - x0 < 8 || T < 6) return;
    versetzt(S, scene, 0, Y - 0.3, 0, (T2, g) => {
      const br = teileBreite(r, x1 - x0, 7, 10);
      let xa = x0;
      br.forEach((b, i) => {
        let erg;
        if (art === 'fachwerk') erg = fachwerkHaus(T2, g, r, p, xa, zq - 6 - T, b, T, { ...bwHausO(r, 'tuebingen'), laden: false, n: 2 }, i === 0, i === br.length - 1);
        else erg = buergerHaus(T2, g, r, art, xa, zq - 6 - T, b, T, p, i === 0, i === br.length - 1);
        top = Math.max(top, erg.top + Y - 0.3); xa += b;
      });
      return null;
    });
  };
  if (v === 'bruecke') {
    const bb = 10, bx = w * 0.5 - bb / 2, Yd = 7.0, Lb = d - zq;
    // Brückenkörper mit Bögen
    const Fs = R(bx + bb, d, 0, -1, Lb);
    const nA = Math.max(2, Math.round(Lb / 12)), sp = Lb / nA, hol = [];
    for (let i = 0; i < nA; i++) hol.push({ u0: i * sp + 1.6, u1: (i + 1) * sp - 1.6, v0: 0.3, v1: Yd - 1.4, bogen: true });
    fwand(S, Fs, 0, Lb, 0.3, Yd, -bb, 0, stein, hol);
    for (let i = 1; i < nA; i++) {
      const z = d - i * sp;
      for (const sg of [-1, 1]) {
        const xr = sg > 0 ? bx + bb : bx, xs = xr + sg * 2.2;
        huelle(S, [[xr - sg * 0.3, 0.3, z - 1.6], [xr - sg * 0.3, 0.3, z + 1.6], [xs, 0.3, z], [xr - sg * 0.3, 4.0, z - 1.6], [xr - sg * 0.3, 4.0, z + 1.6], [xs, 4.0, z], [xr - sg * 0.3, 5.2, z]], dunkler(stein, 0.04));
      }
    }
    S.quader(bx, Yd, zq, bx + bb, Yd + 0.12, d, '#b9b2a4');
    for (const x of [bx - 0.1, bx + bb - 0.5]) S.quader(x, Yd, zq, x + 0.6, Yd + 1.1, d, heller(stein, 0.04));
    fdiag(S, R(bx + bb, zq, 0, -1, 12), -0.2, Yd, 12, Y + 0.08, 0.5, -bb, 0, stein);
    fdiag(S, R(bx + bb, zq, 0, -1, 12), -0.2, Yd + 0.12, 12, Y + 0.2, 0.3, -bb + 0.6, -0.6, '#b9b2a4');
    for (let z = zq + sp / 2; z < d; z += sp) for (const x of [bx - 0.1, bx + bb + 0.1]) laterne(S, x, z, Yd + 1.1);
    // Brückturm am Ufer
    const tz0 = zq - 9, tz1 = zq - 1, Ht = 20;
    S.quader(bx - 1.2, Y, tz0, bx + 0.8, Y + 6.5, tz1, stein); S.quader(bx + bb - 0.8, Y, tz0, bx + bb + 1.2, Y + 6.5, tz1, stein);
    S.quader(bx - 1.2, Y + 6.5, tz0, bx + bb + 1.2, Ht, tz1, stein);
    const Ft = seiten(bx - 1.2, tz0, bb + 2.4, tz1 - tz0);
    for (const k of ['v', 'h', 'r', 'l']) if (sichtF(p, Ft[k])) {
      const L = Ft[k].L;
      if (k === 'v' || k === 'h') fbogen(S, Ft[k], L / 2, Y + 4.0, bb + 0.4, 3.2, -0.1, 0.12, heller(stein, 0.06));
      for (const u of achsen(0, L, 3.6, 1)) fenster(S, Ft[k], u, Y + 9.5, 1.0, 1.6, { rahmen: heller(stein, 0.08), glas: GLAS, sims: false });
      if (k === 'v') { fscheibe(S, Ft[k], L / 2, Ht - 3.5, 0, 0.1, 1.3, '#f4efe0'); fscheibe(S, Ft[k], L / 2, Ht - 3.5, 0.1, 0.13, 1.1, '#2f4f6f'); }
      fb(S, Ft[k], -0.1, L + 0.1, Ht - 0.5, Ht, 0, 0.3, heller(stein, 0.06));
    }
    walm(S, bx - 1.2, tz0, bx + bb + 1.2, tz1, Ht, 8.5, waehle(r, BIBER), 0.5, 3);
    top = Math.max(top, Ht + 8.5);
    hausreihe(1, bx - 4, 'landshut');
    hausreihe(bx + bb + 4, w - 1, 'passau');
    for (let x = 3; x < w; x += 7) if (Math.abs(x - w / 2) > bb) baumRund(S, x, zq - 3, r, 0.75, LAUB, Y);
    boot(S, w * 0.2, zq + 6, 6, '#7a5638'); boot(S, w * 0.78, zq + 9, 5, '#2f6f8f');
    return { hoehe: top };
  }
  if (v === 'fischer') {
    // Fischerhäuser direkt am Wasser mit Holzlauben und Stegen
    const T = 10, br = teileBreite(r, w - 2, 6.5, 9);
    let xa = 1;
    versetzt(S, scene, 0, Y - 0.3, 0, (T2, g) => {
      br.forEach((b, i) => {
        const o = { ...bwHausO(r, 'tuebingen'), laden: false, n: 1 + (r() < 0.6 ? 1 : 0), eg: 3.2, gh: 2.8, giebelstaendig: r() < 0.7, steinEG: true, stein, kr: 0.25 };
        const erg = fachwerkHaus(T2, g, r, p, xa, zq - T + 0.3, b, T - 0.3, o, i === 0, i === br.length - 1);
        top = Math.max(top, erg.top + Y - 0.3);
        const F = seiten(xa, zq - T + 0.3, b, T - 0.3);
        if (sichtF(p, F.v) && r() < 0.7) {
          const y = o.eg + 0.1, tb = 1.4;
          fb(T2, F.v, 0.4, b - 0.4, y - 0.15, y, 0, tb + o.kr, HOLZ[0]);
          fwand(T2, F.v, 0.4, b - 0.4, y, y + 1.0, tb + o.kr - 0.08, tb + o.kr, HOLZ_HELL, Array.from({ length: Math.floor((b - 1) / 0.55) }, (_, k) => ({ u0: 0.6 + k * 0.55, u1: 0.78 + k * 0.55, v0: y + 0.3, v1: y + 0.75 })));
          for (const u of [0.6, b - 0.6]) fb(T2, F.v, u - 0.1, u + 0.1, -Y + 0.4, y, tb + o.kr - 0.3, tb + o.kr - 0.1, HOLZ[0]);
          for (let u = 1.0; u < b - 0.6; u += 2.6) fb(T2, F.v, u, u + 0.2, y + 1.0, y + 1.3, tb + o.kr - 0.2, tb + o.kr, '#d0453a');
        }
        xa += b;
      });
      return null;
    });
    hof(S, r, 0, 0, w, zq - T - 1, { boden: PFLASTER2 });
    // Stege und Zillen
    for (let i = 0; i < 3; i++) {
      const sx = w * (0.2 + i * 0.3);
      S.quader(sx - 0.8, 0.9, zq, sx + 0.8, 1.05, zq + 6, '#a2754a');
      for (const dz of [2, 4, 6]) for (const dx of [-0.7, 0.7]) S.box(0.16, 1.2, 0.16, sx + dx, 0.6, zq + dz - 0.1, '#6b4a32');
      boot(S, sx + 3.2, zq + 4.2, 5.5, waehle(r, ['#7a5638', '#2f5d7a', '#3f6b4a']));
    }
    // kleine Holzbrücke über einen Seitenarm
    S.quader(w - 9, 0, zq - 0.3, w - 5, Y, zq + 0.1, stein);
    return { hoehe: top };
  }
  // Kai mit altem Kran, Promenade, Uferhäusern, Ausflugsschiff
  const kx = w * 0.72, kz = zq - 4.5;
  zyl(S, 3.4, 3.6, 6.5, kx, Y, kz, stein, 12);
  const g = new THREE.ConeGeometry(4.1, 3.4, 12); g.translate(kx, Y + 6.5 + 1.7, kz); S.add(g, waehle(r, BIBER));
  balken0(S, [kx, Y + 6.0, kz + 2.5], [kx + 0.5, Y + 9.5, kz + 8.5], '#6b4a32');
  stab(S, [kx + 0.5, Y + 9.5, kz + 8.5], [kx + 0.5, Y + 3.0, kz + 8.5], 0.05, '#3b4046', 4);
  S.box(0.8, 0.6, 0.8, kx + 0.5, Y + 2.7, kz + 8.5, '#8a5a3a');
  const Fk = R(kx - 1.5, kz + 3.5, 1, 0, 3);
  if (sichtF(p, Fk)) { fbogen(S, Fk, 1.5, Y, 1.4, 2.4, -0.2, 0.1, '#5a4636'); fenster(S, Fk, 1.5, Y + 4.0, 0.8, 1.0, { rahmen: ORN, glas: GLAS, sims: false }); }
  for (let x = 4; x < w - 2; x += 8) if (Math.abs(x - kx) > 6) kastanie(S, x, zq - 3.2, r, 0.75, Y);
  for (let x = 8; x < w - 4; x += 16) if (Math.abs(x - kx) > 6) bank(S, x, zq - 1.2, 0, Y);
  // Treppe zum Wasser
  for (let i = 0; i < 8; i++) S.quader(w * 0.28, 0.42 + (i * (Y - 0.42)) / 8, zq + (7 - i) * 0.45, w * 0.28 + 3, 0.42 + ((i + 1) * (Y - 0.42)) / 8, zq + (8 - i) * 0.45, heller(stein, 0.04));
  hausreihe(1, w - 1, 'passau');
  // Ausflugsschiff
  const sx = w * 0.5, sz = zq + Math.min(7, (d - zq) * 0.45), sl = Math.min(26, w * 0.5);
  S.box(sl, 1.8, 5.0, sx, 1.0, sz, '#f4f3ef');
  S.box(sl, 0.4, 5.06, sx, 0.4, sz, '#2f4f6f');
  huelle(S, [[sx + sl / 2, 0.1, sz - 2.5], [sx + sl / 2, 0.1, sz + 2.5], [sx + sl / 2, 1.9, sz - 2.5], [sx + sl / 2, 1.9, sz + 2.5], [sx + sl / 2 + 3, 1.9, sz], [sx + sl / 2 + 2.2, 0.4, sz]], '#f4f3ef');
  S.box(sl * 0.6, 2.2, 3.8, sx - sl * 0.08, 3.0, sz, GLAS_LADEN);
  S.box(sl * 0.64, 0.3, 4.4, sx - sl * 0.08, 4.25, sz, '#f4f3ef');
  for (let x = sx - sl * 0.36; x < sx + sl * 0.2; x += 1.6) S.box(0.1, 2.2, 0.1, x, 3.0, sz + 1.95, '#f4f3ef');
  S.box(1.2, 1.6, 1.2, sx - sl * 0.3, 5.2, sz, '#c9483e');
  ftext(scene, R(sx - sl / 2, sz + 2.5, 1, 0, sl), waehle(r, ['MS Neckarperle', 'MS Mainfranken', 'MS Donaustrudel']), sl * 0.62, 1.15, 0.05, 0.75, sl * 0.4, '#2f4f6f');
  return { hoehe: Math.max(top, Y + 10) };
}
function balken0(S, a, b, c) { stab(S, a, b, 0.22, c, 4); }


// =====================================================================================
// Slot-Vokabular
// =====================================================================================
export const SUED_VARIANTEN = {
  'slot:bay_buergerhaus': BUERGER_V, 'slot:bay_muenchen': MUENCHEN_V, 'slot:bay_zwiebelkirche': KIRCHE_V, 'slot:bay_wirtshaus': WIRT_V,
  'slot:bay_maibaum': MAI_V, 'slot:franken_fachwerk': FRANKEN_V, 'slot:bay_alpen': ALPEN_V,
  'slot:bw_fachwerk': BWFW_V, 'slot:bw_stuttgart': STUTT_V, 'slot:bw_schloss_barock': SCHLOSS_V, 'slot:bw_muenster': MUENSTER_V,
  'slot:sued_weinberg': WEIN_V, 'slot:sued_fluss': FLUSS_V,
};
export const SUED_SLOTS = {
  'slot:bay_buergerhaus': slot(buergerRoh, [24, 18]),
  'slot:bay_muenchen': slot(muenchenRoh, [26, 22]),
  'slot:bay_zwiebelkirche': (S, scene, p) => {
    const v = p.variante ?? waehle(rng(`ki:${p.seed}`), KIRCHE_V);
    const m = { doppelturm: [[36, 56], [60, 80]], stadtpfarr: [[32, 52], [56, 74]], wallfahrt: [[44, 48], [64, 64]], dorf: [[30, 40], [48, 52]] }[v];
    return slot(kircheRoh, m[0], m[1])(S, scene, { ...p, variante: v });
  },
  'slot:bay_wirtshaus': slot(wirtshausRoh, [40, 30], [70, 50]),
  'slot:bay_maibaum': slot(maibaumRoh, [22, 22], [44, 44]),
  'slot:franken_fachwerk': slot(frankenRoh, [24, 20]),
  'slot:bay_alpen': slot(alpenRoh, [30, 28], null, { hang: (p) => ['panorama', 'ortsrand'].includes(p.variante ?? waehle(rng(`al:${p.seed}`), ALPEN_V)) }),
  'slot:bw_fachwerk': (S, scene, p) => slot(bwFachwerkRoh, (p.variante ?? waehle(rng(`bf:${p.seed}`), BWFW_V)) === 'marktplatz' ? [30, 34] : [24, 20])(S, scene, p),
  'slot:bw_stuttgart': slot(stuttgartRoh, [30, 32], null, { hang: (p) => (p.variante ?? waehle(rng(`st:${p.seed}`), STUTT_V)) !== 'geschaeft50' }),
  'slot:bw_schloss_barock': (S, scene, p) => {
    const v = p.variante ?? waehle(rng(`sc:${p.seed}`), SCHLOSS_V);
    const m = { residenz: [[100, 80], [150, 110]], lustschloss: [[70, 60], [100, 80]], zirkel: [[60, 40], [140, 70]], quadrat: [[50, 50], [90, 90]] }[v];
    return slot(schlossRoh, m[0], m[1])(S, scene, { ...p, variante: v });
  },
  'slot:bw_muenster': slot(muensterRoh, [44, 96], [64, 120]),
  'slot:sued_weinberg': slot(weinbergRoh, [30, 30], null, { hang: () => true }),
  'slot:sued_fluss': slot(flussRoh, [40, 34], null, { hang: () => true }),
};

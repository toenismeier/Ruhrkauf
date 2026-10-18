// Westbauten: Ruhrgebiet, Rheinland und Westfalen als Slot-Generatoren.
// Alle Slots: (S, scene, p) mit p = { x, z, w, d, seed, variante?, front?: '+x'|'+z'|'-x'|'-z', zustand? } -> { hoehe, variante, front, skala }
// Typische Vertreter, keine Kopien realer Einzelbauten. Alle Namen, Vereine und Logos sind erfunden.
//
// Drehung: Jeder Generator baut lokal mit der Straßenfront an +z (Fläche [0, W] × [0, D]) und wird danach um die Hochachse
// in die gewünschte Frontrichtung gedreht. Der Generator bekommt p.sicht = die lokalen Seiten, die nach der Drehung
// zur Kamera zeigen (Welt +x und +z). Genau diese Seiten werden voll detailliert; Fassaden laufen über Rahmen.
//
// Rahmen: Ursprung (ox, oz), Laufrichtung (dx, dz), Normale (nx, nz), Länge L. u läuft von links nach rechts
// (von außen gesehen), y nach oben, t nach außen (t < 0 = im Gebäude).
//
// Boden und Wasser (für die Integration, maschinenlesbar in WEST_META):
// - Alle Slots bringen ihren eigenen Boden mit (Oberkante 0.30 bis 0.38). Eine Gehwegplatte darunter schadet nicht, ist aber unnötig.
// - slot:ruhr_kanal und slot:rhein_promenade bringen zusätzlich eigenes Wasser UNTER Geländeniveau mit
//   (Kanal: p.wasserY, Standard -2.2 wie stadt.js WASSER_Y; Rhein: Standard -4.6, tiefer wegen Kasematten und Treppen).
//   Unter diesen Slots darf KEINE Gehweg- oder Bodenplatte liegen, sonst ist das Wasser verdeckt.
// - Wasserseite: rhein_promenade (alle Varianten) und ruhr_kanal 'hafen' drehen ihre Wasserseite unabhängig von p.front
//   immer zur Kamera (Welt +x oder +z); die Rückgabe enthält dann wasserSeite. Front +z gibt Wasser an +x, Front +x Wasser an +z,
//   Front -z Wasser an +z, Front -x Wasser an +x. ruhr_kanal 'strecke' und 'schleuse' führen das Wasser quer durch die Mitte.
import { THREE, Sammler, rng, waehle, zw, FARBEN, heller, dunkler, textTextur, textMaterial, dachProfil, walmdach } from './basis.js';

const PI = Math.PI;
export const WEST_WASSER_Y = -2.2;

// =====================================================================================
// Rahmen und Grundformen
// =====================================================================================
function R(ox, oz, dx, dz, L, s = '') { return { ox, oz, dx, dz, nx: -dz, nz: dx, ry: Math.atan2(-dz, dx), L, s }; }
/** Die vier Seiten eines Rechtecks als Rahmen. */
function seitenRahmen(x0, z0, w, d) {
  return {
    '+z': R(x0, z0 + d, 1, 0, w, '+z'), '+x': R(x0 + w, z0 + d, 0, -1, d, '+x'),
    '-z': R(x0 + w, z0, -1, 0, w, '-z'), '-x': R(x0, z0, 0, 1, d, '-x'),
  };
}
/** Sichtbare Seiten (nach Drehung) eines Rechtecks als Rahmen. */
function sichtbar(p, x0, z0, w, d) { const a = seitenRahmen(x0, z0, w, d); return (p.sicht ?? ['+z', '+x']).map((s) => a[s]); }
const istSicht = (p, s) => (p.sicht ?? ['+z', '+x']).includes(s);
function wp(F, u, t) { return [F.ox + F.dx * u + F.nx * t, F.oz + F.dz * u + F.nz * t]; }
function fb(S, F, u0, u1, y0, y1, t0, t1, c) {
  const [x, z] = wp(F, (u0 + u1) / 2, (t0 + t1) / 2);
  S.box(Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(t1 - t0), x, (y0 + y1) / 2, z, c, F.ry);
}
function fgeo(S, F, g, c) { g.rotateY(F.ry); g.translate(F.ox, 0, F.oz); S.add(g, c); }
function teil(F, u0, u1, t = 0) { const [x, z] = wp(F, u0, t); return R(x, z, F.dx, F.dz, u1 - u0, F.s); }
function fform(S, F, shape, t0, t1, c, seg = 6) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t1 - t0, bevelEnabled: false, curveSegments: seg });
  g.translate(0, 0, t0);
  fgeo(S, F, g, c);
}
function fpoly(S, F, pkt, t0, t1, c) {
  const s = new THREE.Shape();
  s.moveTo(pkt[0][0], pkt[0][1]);
  for (const [u, v] of pkt.slice(1)) s.lineTo(u, v);
  s.lineTo(pkt[0][0], pkt[0][1]);
  fform(S, F, s, t0, t1, c);
}
/** Fensterform: Rechteck mit Rundbogen ('rund'), Segmentbogen ('segment') oder Spitzbogen ('spitz'). */
function bogenForm(u0, v0, u1, v1, art) {
  const s = new THREE.Shape(), b = u1 - u0;
  s.moveTo(u0, v0); s.lineTo(u1, v0);
  if (art === 'rund') { const vs = v1 - b / 2; s.lineTo(u1, vs); s.absarc((u0 + u1) / 2, vs, b / 2, 0, PI, false); }
  else if (art === 'segment') {
    const st = b * 0.18, vs = v1 - st, rad = (b * b / 4 + st * st) / (2 * st), cy = v1 - rad, a0 = Math.asin((b / 2) / rad);
    s.lineTo(u1, vs); s.absarc((u0 + u1) / 2, cy, rad, PI / 2 - a0, PI / 2 + a0, false);
  } else if (art === 'spitz') { const vs = v1 - b * 0.7; s.lineTo(u1, vs); s.lineTo((u0 + u1) / 2, v1); s.lineTo(u0, vs); }
  else { s.lineTo(u1, v1); s.lineTo(u0, v1); }
  s.lineTo(u0, v0);
  return s;
}
/** Schrift je Text, Farbe und Hintergrund nur einmal (Cache in basis.js textMaterial). */
const textGecacht = (text, farbe, bg) => textMaterial(text, farbe, { groesse: 140, hintergrund: bg });
function ftext(scene, F, text, u, y, t, hMax, bMax, farbe, bg = null) {
  const { mat, seitenverhaeltnis: a } = textGecacht(text, farbe, bg);
  const h = Math.min(hMax, bMax / a);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * a, h), mat);
  const [x, z] = wp(F, u, t);
  m.rotation.y = F.ry; m.position.set(x, y, z);
  scene.add(m);
  return h * a;
}
/** Schrift flach auf einer waagerechten Fläche (z. B. Dach), Leserichtung entlang +x lokal. */
function dachText(scene, text, x, y, z, hMax, bMax, farbe, ry = 0) {
  const { t: tex, seitenverhaeltnis: a } = textGecacht(text, farbe, null);
  const h = Math.min(hMax, bMax / a);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * a, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.rotation.x = -PI / 2; m.rotation.z = ry; m.position.set(x, y, z);
  scene.add(m);
}
function zyl(S, rO, rU, h, x, y0, z, c, seg = 16, offen = false) {
  const g = new THREE.CylinderGeometry(rO, rU, h, seg, 1, offen);
  g.translate(x, y0 + h / 2, z);
  S.add(g, c);
}
function stab(S, a, b, rad, c, seg = 6) {
  const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = v.length();
  if (L < 1e-4) return;
  const g = new THREE.CylinderGeometry(rad, rad, L, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  S.add(g, c);
}
/** Kantiger Balken von a nach b (quadratischer Querschnitt, eine Kante senkrecht). */
function balken(S, a, b, br, ho, c) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const hl = Math.hypot(dx, dz), L = Math.hypot(hl, dy);
  if (L < 1e-4) return;
  const g = new THREE.BoxGeometry(L, ho, br);
  g.rotateZ(Math.atan2(dy, hl)); g.rotateY(Math.atan2(-dz, dx));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  S.add(g, c);
}
function boden(S, x0, z0, x1, z1, c, y = 0.3, h = 0.06) { if (x1 > x0 && z1 > z0) S.quader(x0, y, z0, x1, y + h, z1, c); }
/** Waagerechtes Polygon [[x, z], …] als Prisma zwischen y0 und y1. */
function prisma(S, pts, y0, y1, c) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (const q of pts.slice(1)) s.lineTo(q[0], q[1]);
  s.lineTo(pts[0][0], pts[0][1]);
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(PI / 2); g.translate(0, y1, 0);
  S.add(g, c);
}
function kugel(S, x, y, z, rad, c, det = 0) { const g = new THREE.IcosahedronGeometry(rad, det); g.translate(x, y, z); S.add(g, c); }

// =====================================================================================
// Farben
// =====================================================================================
const RASEN = '#9dc283', RASEN2 = '#a9c98c', WEG = '#d6d0c2', PFLASTER = '#cbc5b8', ASPHALT = '#8d939a', SCHOTTER = '#aaa498';
const GLAS = '#4e5c67', GLAS_HELL = '#6f8696', DUNKEL = '#3e474f', METALL = '#9aa1a7', STAHL = '#5a6168', WEISS = '#f4f2ec';
const BACKSTEIN = ['#9b4f3a', '#a35a43', '#8f4a37', '#a8604a'];
const KLINKER = ['#6e3b30', '#7a4234', '#5f3a34', '#71433a'];
const SCHIEFER = ['#55616a', '#5c6870', '#4d5860'];
const ZIEGELDACH = ['#a9523c', '#b4583f', '#9a4a37'];
const LICHT_ROT = '#ff4d5e', LICHT_BLAU = '#4fc3ff', LICHT_GELB = '#ffd75a';
const AUTOFARBEN = ['#2b2f33', '#a3abb2', '#c84a3c', '#2f5f8f', '#f4f3ef', '#3d6b4f', '#6b7680', '#1f3a5f', '#d9d4c3', '#8c3b3b', '#e0b23a', '#5d4e8c'];
const TAXI = '#efe6c4';

// =====================================================================================
// Drehbarer Slot-Rahmen
// =====================================================================================
const DREH = { '+z': 0, '+x': PI / 2, '-z': PI, '-x': -PI / 2 };
const SICHT = { '+z': ['+z', '+x'], '+x': ['+z', '-x'], '-z': ['-z', '-x'], '-x': ['+x', '-z'] };
/**
 * cfg: { varianten, nenn: { v: [minW, minD, maxW?, maxD?] }, zustaende?, zustandWahl?(r, v), roh(S, scene, q) }
 * Zu kleine Flächen: Bau in Mindestmaß, gleichmäßig verkleinert. Zu große Flächen: Bau in Höchstmaß, mittig.
 */
function slot(name, cfg) {
  return (S, scene, p) => {
    const r = rng(`${name}:${p.seed ?? 1}`);
    const v = cfg.varianten.includes(p.variante) ? p.variante : waehle(r, cfg.varianten);
    let zustand = p.zustand === 'industriekultur' ? 'museum' : p.zustand;
    if (cfg.zustaende && !cfg.zustaende.includes(zustand)) zustand = cfg.zustandWahl ? cfg.zustandWahl(r, v) : waehle(r, cfg.zustaende);
    const frontStrasse = DREH[p.front] !== undefined ? p.front : '+z';
    // Wasser-Slots drehen so, dass die Wasserseite (lokal +z) immer zur Kamera zeigt (Welt +x oder +z)
    const front = cfg.wasserZurKamera?.(v) ? { '+z': '+x', '+x': '+z', '-z': '+z', '-x': '+x' }[frontStrasse] : frontStrasse;
    const quer = front[1] === 'x';
    const W = quer ? p.d : p.w, D = quer ? p.w : p.d;
    const [mw, md, xw = Infinity, xd = Infinity] = cfg.nenn[v];
    const Wb = Math.min(Math.max(W, mw), xw), Db = Math.min(Math.max(D, md), xd);
    const s = Math.min(1, W / Wb, D / Db);
    const T = new Sammler(), grp = new THREE.Group();
    const q = { ...p, x: 0, z: 0, w: Wb, d: Db, variante: v, zustand, sicht: SICHT[front], frontWelt: front };
    const erg = cfg.roh(T, grp, q) ?? {};
    const ox = (W - Wb * s) / 2, oz = (D - Db * s) / 2;
    const th = DREH[front];
    const tw = { '+z': [p.x, p.z], '+x': [p.x, p.z + W], '-z': [p.x + W, p.z + D], '-x': [p.x + D, p.z] }[front];
    const M = new THREE.Matrix4().makeTranslation(tw[0], 0, tw[1])
      .multiply(new THREE.Matrix4().makeRotationY(th))
      .multiply(new THREE.Matrix4().makeTranslation(ox, 0, oz))
      .multiply(new THREE.Matrix4().makeScale(s, s, s));
    for (const [farbe, gs] of T.teile) for (const g of gs) { g.applyMatrix4(M); S.add(g, farbe); }
    grp.applyMatrix4(M); scene.add(grp);
    return { ...erg, hoehe: (erg.hoehe ?? 10) * s, variante: v, zustand, front: frontStrasse, wasserSeite: cfg.wasserZurKamera?.(v) ? front : undefined, skala: s };
  };
}

// =====================================================================================
// Kleinteile: Bäume, Möblierung, Figuren, Fahrzeuge, Schiffe
// =====================================================================================
function baumRund(S, x, z, r, s = 1, y0 = 0.3) {
  S.box(0.4 * s, 2.4 * s, 0.4 * s, x, y0 + 1.2 * s, z, FARBEN.stamm);
  kugel(S, x, y0 + 3.6 * s, z, 2.0 * s * (0.85 + r() * 0.3), waehle(r, FARBEN.baum));
}
function birke(S, x, z, r, s = 1, y0 = 0.3) {
  const h = 4.5 * s * (0.8 + r() * 0.4);
  S.box(0.22 * s, h, 0.22 * s, x, y0 + h / 2, z, '#ecebe4');
  const g = new THREE.IcosahedronGeometry(1.3 * s, 0); g.scale(1, 1.7, 1); g.translate(x, y0 + h * 0.8, z);
  S.add(g, waehle(r, ['#9cc46e', '#a9cc78', '#8fb862']));
}
/** Platane in Kastenform (rheinischer Formschnitt). */
function platane(S, x, z, r, s = 1, y0 = 0.3) {
  S.box(0.5 * s, 3.2 * s, 0.5 * s, x, y0 + 1.6 * s, z, '#b8ad92');
  S.box(3.6 * s, 2.0 * s, 3.6 * s, x, y0 + 4.0 * s, z, waehle(r, ['#6f9f58', '#79a862', '#669650']));
}
function busch(S, x, z, r, s = 1, y0 = 0.3) {
  const g = new THREE.IcosahedronGeometry(1.0 * s * (0.8 + r() * 0.4), 0);
  g.scale(1.2, 0.8, 1.2); g.translate(x, y0 + 0.7 * s, z);
  S.add(g, waehle(r, ['#6f9f5c', '#7aa865', '#628f52']));
}
function hecke(S, x0, z0, x1, z1, h = 1.1, y0 = 0.3, c = '#5f8f4e') { S.quader(x0, y0, z0, x1, y0 + h, z1, c); }
function figur(S, x, z, r, y0 = 0.3) {
  const f = waehle(r, ['#c9483e', '#2f5f8f', '#3f7d56', '#e0b23a', '#3b3f44', '#f4f3ef', '#7a4a8c', '#d97a3a']);
  S.box(0.45, 1.0, 0.35, x, y0 + 0.5 + 0.55, z, f);
  S.box(0.4, 0.55, 0.3, x, y0 + 0.28, z, '#3b4046');
  S.box(0.28, 0.3, 0.28, x, y0 + 1.75, z, '#e2b48c');
}
function figuren(S, r, x0, z0, x1, z1, n, y0 = 0.3) { for (let i = 0; i < n; i++) figur(S, zw(r, x0, x1), zw(r, z0, z1), r, y0); }
function laterne(S, x, z, h = 6, y0 = 0.3, art = 'mast', c = '#4a5056') {
  S.box(0.18, h, 0.18, x, y0 + h / 2, z, c);
  if (art === 'kugel') kugel(S, x, y0 + h + 0.35, z, 0.45, '#f4f1e2', 1);
  else if (art === 'alt') { S.box(0.6, 0.8, 0.6, x, y0 + h + 0.3, z, '#2f3438'); S.box(0.4, 0.5, 0.4, x, y0 + h + 0.3, z, '#f3e6b8'); }
  else S.box(1.2, 0.18, 0.4, x + 0.5, y0 + h, z, c);
}
function bank(S, x, z, ry = 0, y0 = 0.3, c = '#8a6a4a') {
  const g1 = new THREE.BoxGeometry(1.8, 0.12, 0.5); g1.translate(0, 0.45, 0);
  const g2 = new THREE.BoxGeometry(1.8, 0.45, 0.1); g2.translate(0, 0.75, -0.22);
  for (const g of [g1, g2]) { g.rotateY(ry); g.translate(x, y0, z); S.add(g, c); }
}
/** Beton-Pflanzkübel (Sechseck oder Quadrat) mit Busch. */
function pflanzkuebel(S, x, z, r, y0 = 0.3, art = 'sechseck') {
  const g = art === 'sechseck' ? new THREE.CylinderGeometry(1.2, 1.0, 0.8, 6) : new THREE.BoxGeometry(1.9, 0.8, 1.9);
  g.translate(x, y0 + 0.4, z); S.add(g, '#bdb8ad');
  const b = new THREE.CylinderGeometry(1.0, 1.0, 0.1, 6); b.translate(x, y0 + 0.82, z); S.add(b, '#6b5a46');
  busch(S, x, z, r, 0.9, y0 + 0.5);
}
function rauch(S, x, y, z, r, n = 4, s = 1, c = '#eef0f1') {
  for (let i = 0; i < n; i++) kugel(S, x + i * 1.6 * s + zw(r, -0.4, 0.4), y + i * 2.2 * s, z + i * 0.9 * s, (1.4 + i * 0.6) * s, i % 2 ? c : heller(c, 0.02), 0);
}
function gleis(S, x0, z0, x1, z1, y0 = 0.3) {
  const entlangX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  if (entlangX) {
    S.quader(x0, y0, z0 - 1.5, x1, y0 + 0.15, z0 + 1.5, '#9b958a');
    for (const s of [-0.72, 0.72]) S.quader(x0, y0 + 0.15, z0 + s - 0.07, x1, y0 + 0.32, z0 + s + 0.07, '#6b6f73');
  } else {
    S.quader(x0 - 1.5, y0, z0, x0 + 1.5, y0 + 0.15, z1, '#9b958a');
    for (const s of [-0.72, 0.72]) S.quader(x0 + s - 0.07, y0 + 0.15, z0, x0 + s + 0.07, y0 + 0.32, z1, '#6b6f73');
  }
}
/** Kohlenwagen (Selbstentlader), Länge entlang lokaler x-Achse. */
function kohlenwagen(S, x, z, ry, voll = true, farbe = '#5b3a2e', y0 = 0.6) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const box = (L, h, B, off, yc, f) => S.box(L, h, B, x + c * off, y0 + yc, z - s * off, f, ry);
  box(9, 0.6, 2.2, 0, 0.6, '#2b2f33');
  box(9.6, 2.4, 2.9, 0, 2.1, farbe);
  for (const o of [-3.2, 0, 3.2]) box(0.12, 2.5, 3.0, o, 2.1, dunkler(farbe, 0.06));
  if (voll) box(9.2, 0.4, 2.6, 0, 3.4, '#2a2a2c');
}
function lok(S, x, z, ry, farbe = '#c8463c', y0 = 0.6) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const box = (L, h, B, off, yc, f) => S.box(L, h, B, x + c * off, y0 + yc, z - s * off, f, ry);
  box(10, 0.7, 2.4, 0, 0.6, '#2b2f33');
  box(9.4, 2.2, 2.6, 0.6, 2.0, farbe);
  box(2.6, 1.1, 2.7, -3.2, 3.6, farbe);
  box(2.4, 0.6, 2.72, -3.2, 3.5, '#3c4852');
  box(9.6, 0.3, 2.65, 0.4, 1.0, '#f2d24a');
}
/**
 * Westdeutsches Auto/Fahrzeug, Länge entlang lokaler x-Achse (ry dreht).
 * typ: 'pkw', 'kombi', 'kompakt', 'taxi', 'bus', 'gelenkbus', 'lkw', 'transporter', 'stadtbahn'
 */
export function westAuto(S, x, z, ry = 0, typ = 'pkw', farbe = null, y0 = 0.3) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const box = (L, h, B, off, yc, f) => S.box(L, h, B, x + c * off, y0 + yc, z - s * off, f, ry);
  const fz = farbe ?? AUTOFARBEN[Math.floor(Math.abs(x * 7.3 + z * 3.1)) % AUTOFARBEN.length];
  if (typ === 'pkw' || typ === 'kombi' || typ === 'kompakt' || typ === 'taxi') {
    const L = typ === 'kompakt' ? 3.8 : 4.5, f = typ === 'taxi' ? TAXI : fz;
    box(L - 0.6, 0.3, 1.55, 0, 0.2, '#2b2f33');
    box(L, 0.66, 1.72, 0, 0.66, f);
    const kl = typ === 'kombi' ? 2.9 : typ === 'kompakt' ? 2.2 : 2.2, ko = typ === 'kombi' ? -0.5 : -0.2;
    box(kl, 0.55, 1.56, ko, 1.26, '#3c4852');
    box(kl + 0.05, 0.08, 1.6, ko, 1.57, f);
    if (typ === 'taxi') box(0.5, 0.2, 0.8, ko, 1.71, '#f6d24a');
  } else if (typ === 'bus' || typ === 'gelenkbus') {
    const teile = typ === 'gelenkbus' ? [-6.2, 6.2] : [0];
    const f = farbe ?? '#f2f0ea';
    for (const o of teile) {
      box(11.6, 1.2, 2.5, o, 1.0, f);
      box(11.4, 1.1, 2.52, o, 2.15, '#3c4852');
      box(11.5, 0.4, 2.46, o, 2.9, f);
      box(11.62, 0.35, 2.54, o, 0.75, '#d23c32');
    }
    if (typ === 'gelenkbus') box(0.8, 2.6, 2.3, 0, 1.7, '#2b2f33');
    box(0.1, 0.4, 1.8, teile[teile.length - 1] + 5.82, 2.8, '#f6a23a');
  } else if (typ === 'lkw' || typ === 'transporter') {
    if (typ === 'transporter') {
      box(4.6, 0.35, 1.8, 0, 0.25, '#2b2f33'); box(5.0, 1.9, 1.95, 0, 1.3, fz); box(0.08, 0.7, 1.7, 2.52, 1.7, '#3c4852');
    } else {
      box(7.4, 0.5, 2.1, 0, 0.45, '#2b2f33');
      box(2.0, 2.3, 2.4, 2.8, 1.85, fz);
      box(0.1, 0.9, 2.1, 3.82, 2.3, '#3c4852');
      box(5.2, 2.8, 2.5, -1.1, 2.3, '#e9e7e1');
    }
  } else if (typ === 'stadtbahn') {
    for (const o of [-7.2, 7.2]) {
      box(13.6, 0.4, 2.4, o, 0.5, '#2b2f33');
      box(14, 1.4, 2.65, o, 1.4, '#f1ede2');
      box(13.8, 1.1, 2.67, o, 2.6, '#3c4852');
      box(14, 0.55, 2.62, o, 3.42, '#f1ede2');
      box(14.02, 0.3, 2.69, o, 1.9, '#d23c32');
    }
    box(1.6, 0.08, 0.5, 0, 4.3, '#30353a');
  }
}
function parkplatz(S, r, x0, z0, x1, z1, o = {}) {
  boden(S, x0, z0, x1, z1, o.belag ?? ASPHALT, 0.3, 0.05);
  const y = 0.35, quer = (x1 - x0) >= (z1 - z0), dichte = o.dichte ?? 0.75;
  if (quer) {
    const reihen = Math.max(1, Math.floor((z1 - z0) / 6));
    for (let k = 0; k < reihen; k++) {
      const zc = z0 + (k + 0.5) * ((z1 - z0) / reihen);
      for (let xx = x0 + 1.3; xx < x1 - 1.2; xx += 2.6) {
        S.quader(xx - 1.3, y, zc - 2.5, xx - 1.2, y + 0.02, zc + 2.5, '#f2f1ec');
        if (r() < dichte) westAuto(S, xx, zc, PI / 2 + (r() < 0.5 ? 0 : PI), o.taxi ? 'taxi' : waehle(r, ['pkw', 'pkw', 'kombi', 'kompakt']), o.taxi ? null : waehle(r, AUTOFARBEN), y);
      }
    }
  } else {
    const reihen = Math.max(1, Math.floor((x1 - x0) / 6));
    for (let k = 0; k < reihen; k++) {
      const xc = x0 + (k + 0.5) * ((x1 - x0) / reihen);
      for (let zz = z0 + 1.3; zz < z1 - 1.2; zz += 2.6) {
        S.quader(xc - 2.5, y, zz - 1.3, xc + 2.5, y + 0.02, zz - 1.2, '#f2f1ec');
        if (r() < dichte) westAuto(S, xc, zz, r() < 0.5 ? 0 : PI, waehle(r, ['pkw', 'pkw', 'kombi', 'kompakt']), waehle(r, AUTOFARBEN), y);
      }
    }
  }
}
/**
 * Schiff, Länge entlang lokaler x-Achse, Bug bei +x. y = Wasserspiegel.
 * typ: 'binnen' (Motorgüterschiff), 'tanker', 'ausflug' (Fahrgastschiff), 'schub' (Schubboot mit Leichter)
 */
export function westSchiff(S, scene, x, z, y, ry = 0, typ = 'binnen', o = {}) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (u, q) => [x + c * u + s * q, z - s * u + c * q];
  const box = (L, h, B, u, yc, f, q = 0) => { const [px, pz] = P(u, q); S.box(L, h, B, px, y + yc, pz, f, ry); };
  const rumpf = (L, B, h0, h1, f, spitz = 0.18) => {
    const hl = L / 2, sb = L * spitz;
    const pts = [[-hl, -B / 2], [hl - sb, -B / 2], [hl, -B * 0.12], [hl, B * 0.12], [hl - sb, B / 2], [-hl, B / 2]].map(([u, q]) => P(u, q));
    prisma(S, pts, y + h0, y + h1, f);
  };
  const L = o.laenge ?? (typ === 'ausflug' ? 34 : 54), B = o.breite ?? (typ === 'ausflug' ? 7.6 : 8.2);
  if (typ === 'binnen' || typ === 'tanker') {
    const rumpfF = o.rumpf ?? waehle(rng(Math.floor(x * 13 + z)), ['#2b3036', '#1f3a5f', '#3d2f2b', '#2f4f45']);
    rumpf(L, B, -0.6, 1.4, rumpfF);
    rumpf(L - 0.2, B + 0.06, 0.0, 0.25, '#c8463c');
    box(L * 0.8, 0.2, B - 0.2, -L * 0.04, 1.5, '#5a6168');
    if (typ === 'binnen') {
      const lr0 = -L * 0.28, lr1 = L * 0.38, n = 7, lw = (lr1 - lr0) / n;
      box(lr1 - lr0, 1.4, B - 1.4, (lr0 + lr1) / 2, 2.0, dunkler(rumpfF, 0.04));
      if (o.ladung === 'kohle') { box(lr1 - lr0 - 0.6, 0.5, B - 1.8, (lr0 + lr1) / 2, 2.85, '#2a2a2c'); for (let i = 0; i < 3; i++) box(lw * 1.6, 0.7, B - 2.6, lr0 + lw * (1.2 + i * 2.2), 3.2, '#333436'); }
      else if (o.ladung === 'container') {
        const cf = ['#c8463c', '#2f6f8f', '#e0b23a', '#3f7d56', '#7a7f85', '#d97a3a'];
        for (let i = 0; i < n; i++) for (const q of [-1.6, 1.6]) box(lw - 0.3, 2.5, 2.4, lr0 + lw * (i + 0.5), 3.95, cf[(i * 3 + (q > 0 ? 1 : 0)) % cf.length], q);
      } else for (let i = 0; i < n; i++) box(lw - 0.15, 0.35, B - 1.3, lr0 + lw * (i + 0.5), 2.85, i % 2 ? '#5d7f6a' : '#668a74');
    } else {
      box(L * 0.62, 0.9, B - 2.4, L * 0.05, 2.0, '#d4d6d8');
      for (let i = 0; i < 6; i++) box(0.4, 0.7, B - 3, -L * 0.22 + i * L * 0.1, 2.75, '#c8463c');
      stab(S, [P(-L * 0.25, 0)[0], y + 2.6, P(-L * 0.25, 0)[1]], [P(L * 0.34, 0)[0], y + 2.6, P(L * 0.34, 0)[1]], 0.25, '#9aa1a7', 6);
    }
    // Achterschiff: Wohnung, Steuerhaus, Auto an Deck
    const ha = -L / 2 + 5.5;
    box(8.5, 2.4, B - 1.2, ha, 2.7, '#f2f0ea');
    box(8.6, 0.9, B - 1.0, ha, 2.4, '#3c4852');
    box(3.4, 2.0, 3.6, ha + 1.2, 4.9 + (o.hoch ? 1.5 : 0), '#f2f0ea');
    box(3.45, 0.9, 3.65, ha + 1.2, 5.2 + (o.hoch ? 1.5 : 0), '#3c4852');
    box(4.0, 0.2, 4.2, ha + 1.2, 6.0 + (o.hoch ? 1.5 : 0), '#d9d4c8');
    box(1.0, 0.18, 0.18, ha - 3.2, 4.6, '#5a6168');
    const [fx, fz] = P(-L / 2 + 0.5, 0); S.box(0.08, 3.2, 0.08, fx, y + 4.2, fz, '#5a6168'); S.box(0.04, 0.8, 1.2, fx, y + 5.3, fz + 0.6, o.flagge ?? '#d23c32', ry);
    // Auto achtern
    { const [ax, az] = P(-L / 2 + 2.6, B * 0.2); westAuto(S, ax, az, ry + PI / 2, 'kompakt', o.auto ?? '#c84a3c', y + 3.9); }
    box(3.0, 1.0, B - 2.4, L / 2 - 3.5, 2.0, rumpfF);
    if (o.name) {
      const F = R(P(-L / 2 + 10, B / 2 + 0.02)[0], P(-L / 2 + 10, B / 2 + 0.02)[1], c, -s, 10);
      ftext(scene, F, o.name, 5, y + 0.9, 0.03, 0.6, 9, '#f2f0ea');
    }
    return;
  }
  if (typ === 'ausflug') {
    const rf = o.rumpf ?? '#f4f2ec', band = o.band ?? '#1f4f8f';
    rumpf(L, B, -0.6, 1.3, rf, 0.22);
    rumpf(L - 0.1, B + 0.05, 0.9, 1.25, band, 0.22);
    box(L * 0.7, 2.3, B - 0.8, -L * 0.05, 2.45, rf);
    box(L * 0.7 + 0.04, 1.2, B - 0.76, -L * 0.05, 2.5, '#3c4852');
    for (let u = -L * 0.38; u < L * 0.3; u += 1.6) box(0.12, 1.2, B - 0.72, u, 2.5, rf);
    box(L * 0.72, 0.18, B - 0.4, -L * 0.05, 3.7, '#d9d4c8');
    box(L * 0.45, 2.0, B - 1.6, -L * 0.14, 4.7, rf);
    box(L * 0.45 + 0.04, 1.0, B - 1.56, -L * 0.14, 4.8, '#3c4852');
    box(L * 0.5, 0.15, B - 1.2, -L * 0.14, 5.75, '#d9d4c8');
    // Sonnendeck mit Geländer, Steuerhaus
    box(L * 0.5, 0.7, 0.06, -L * 0.14, 6.2, '#e9e7e1', B / 2 - 0.65); box(L * 0.5, 0.7, 0.06, -L * 0.14, 6.2, '#e9e7e1', -B / 2 + 0.65);
    box(3.2, 1.6, 3.6, L * 0.08, 6.6, rf); box(3.25, 0.7, 3.65, L * 0.08, 6.8, '#3c4852');
    box(1.4, 1.6, 1.4, -L * 0.3, 6.5, band); box(1.5, 0.3, 1.5, -L * 0.3, 7.4, '#2b2f33');
    const rs = rng(Math.floor(Math.abs(x * 7 + z * 3)));
    for (let i = 0; i < 10; i++) { const [px, pz] = P(zw(rs, -L * 0.36, L * 0.06), zw(rs, -B / 2 + 1.2, B / 2 - 1.2)); figur(S, px, pz, rs, y + 5.8); }
    for (let i = 0; i < 4; i++) { const [px, pz] = P(L * 0.25 + i * 0.8, zw(rs, -2, 2)); figur(S, px, pz, rs, y + 1.3); }
    if (o.name) {
      const [nx, nz] = P(-L / 2 + 3, B / 2 - 0.35);
      ftext(scene, R(nx, nz, c, -s, L), o.name, L * 0.38, y + 4.75, 0.07, 0.75, L * 0.38, band);
    }
    return;
  }
  // Schubverband: Schubboot + zwei Leichter
  box(14, 1.9, B, -L / 2 + 7, 0.4, '#2b3036');
  box(6, 3.4, B - 2.4, -L / 2 + 6, 3.0, '#e9e7e1'); box(6.05, 1.0, B - 2.3, -L / 2 + 6, 4.0, '#3c4852');
  box(3.6, 1.8, 4, -L / 2 + 6.6, 5.6, '#e9e7e1'); box(3.65, 0.8, 4.05, -L / 2 + 6.6, 5.9, '#3c4852');
  for (let i = 0; i < 2; i++) { const u0 = -L / 2 + 15 + i * ((L - 15) / 2); box((L - 15) / 2 - 0.3, 1.8, B, u0 + (L - 15) / 4, 0.4, '#3b3f44'); box((L - 15) / 2 - 1.6, 0.8, B - 1.4, u0 + (L - 15) / 4, 1.6, '#2a2a2c'); }
}

// =====================================================================================
// Bausteine: Fenster, Dächer, Hallen, Stahlfachwerk, Gerüste
// =====================================================================================
/** Fenster auf Rahmen: art null|'rund'|'segment'|'spitz', o: { glas, rahmen, laibung, sprossen: [nu, nv], tief } */
function fenster(S, F, u, y, b, h, o = {}) {
  const art = o.art ?? null, t = o.t ?? 0;
  if (o.laibung) fform(S, F, bogenForm(u - b / 2 - 0.22, y - 0.12, u + b / 2 + 0.22, y + h + (art ? 0.22 : 0.18), art), t - 0.02, t + 0.07, o.laibung);
  fform(S, F, bogenForm(u - b / 2, y, u + b / 2, y + h, art), t, t + 0.1, o.glas ?? GLAS);
  if (o.sims) fb(S, F, u - b / 2 - 0.3, u + b / 2 + 0.3, y - 0.2, y - 0.04, t - 0.02, t + 0.2, o.sims);
  const [nu, nv] = o.sprossen ?? [0, 0];
  const sc = o.rahmen ?? '#e9e4d8';
  for (let i = 1; i <= nu; i++) { const uu = u - b / 2 + (b * i) / (nu + 1); fb(S, F, uu - 0.05, uu + 0.05, y, y + h - (art === 'rund' ? (b / 2) * (1 - Math.sqrt(Math.max(0, 1 - Math.pow((2 * (uu - u)) / b, 2)))) : 0.02), t + 0.08, t + 0.13, sc); }
  for (let k = 1; k <= nv; k++) { const yy = y + ((h - (art ? b * 0.3 : 0)) * k) / (nv + 1); fb(S, F, u - b / 2, u + b / 2, yy - 0.05, yy + 0.05, t + 0.08, t + 0.13, sc); }
}
/** Satteldach über Rechteck; achse = Firstrichtung. Giebeldreiecke (Wandfarbe) an sichtbaren Stirnseiten. */
function satteldach(S, p, x0, z0, w, d, y, h, achse, dachF, wandF, ue = 0.45, oben = 0.3) {
  const L = achse === 'x' ? w : d, T = achse === 'x' ? d : w;
  const g = dachProfil(L + 2 * ue, T + 2 * ue, h, oben, achse);
  g.translate(x0 + w / 2, y, z0 + d / 2);
  S.add(g, dachF);
  if (wandF) for (const F of sichtbar(p, x0, z0, w, d)) {
    const stirn = achse === 'x' ? F.s[1] === 'x' : F.s[1] === 'z';
    if (stirn) fpoly(S, F, [[0, y], [F.L, y], [F.L / 2 + oben / 2, y + h * (1 - (2 * ue) / (T + 2 * ue)) ], [F.L / 2 - oben / 2, y + h * (1 - (2 * ue) / (T + 2 * ue))]], -0.3, 0.02, wandF);
  }
}
/** Pultdach/Flachdach mit Attika. */
function flachdach(S, x0, z0, w, d, y, attika, kappe, dachF = '#9e9b94', hA = 0.6) {
  S.quader(x0 + 0.3, y, z0 + 0.3, x0 + w - 0.3, y + 0.12, z0 + d - 0.3, dachF);
  if (attika) {
    S.quader(x0 - 0.05, y, z0 - 0.05, x0 + w + 0.05, y + hA, z0 + 0.35, attika); S.quader(x0 - 0.05, y, z0 + d - 0.35, x0 + w + 0.05, y + hA, z0 + d + 0.05, attika);
    S.quader(x0 - 0.05, y, z0, x0 + 0.35, y + hA, z0 + d, attika); S.quader(x0 + w - 0.35, y, z0, x0 + w + 0.05, y + hA, z0 + d, attika);
    if (kappe) S.quader(x0 - 0.1, y + hA, z0 - 0.1, x0 + w + 0.1, y + hA + 0.1, z0 + d + 0.1, kappe);
  }
}
/**
 * Backsteinhalle (Maschinenhaus, Lohnhalle, Kesselhaus). o: { x0, z0, w, d, H, wand, orn, dach, dachH, achse,
 * fenster: { art, b, h, y, raster, zeilen }, lisenen, zustand, r, giebelRund }
 */
function backsteinHalle(S, scene, p, o) {
  const { x0, z0, w, d, H } = o, r = o.r;
  const orn = o.orn ?? '#d9c9a8';
  S.quader(x0, 0, z0, x0 + w, H, z0 + d, o.wand);
  S.quader(x0 - 0.12, 0, z0 - 0.12, x0 + w + 0.12, 1.1, z0 + d + 0.12, o.sockel ?? dunkler(o.wand, 0.07));
  S.quader(x0 - 0.25, H - 0.7, z0 - 0.25, x0 + w + 0.25, H - 0.35, z0 + d + 0.25, orn);
  S.quader(x0 - 0.15, H - 0.35, z0 - 0.15, x0 + w + 0.15, H, z0 + d + 0.15, dunkler(o.wand, 0.04));
  const fo = o.fenster ?? { art: 'rund', b: 2.2, h: H * 0.55, y: 2.2, raster: 4.2 };
  for (const F of sichtbar(p, x0, z0, w, d)) {
    const n = Math.max(1, Math.floor((F.L - 1.2) / fo.raster)), off = (F.L - n * fo.raster) / 2;
    for (let i = 0; i <= n; i++) if (o.lisenen !== false) fb(S, F, off + i * fo.raster - 0.35, off + i * fo.raster + 0.35, 1.1, H - 0.7, 0, 0.22, o.wand);
    for (let i = 0; i < n; i++) {
      const u = off + (i + 0.5) * fo.raster;
      for (let k = 0; k < (fo.zeilen ?? 1); k++) {
        const y = fo.y + k * (fo.h + 1.2);
        let glas = o.glas ?? GLAS;
        if (o.zustand === 'stillgelegt') { const q = r(); glas = q < 0.25 ? '#2a2f33' : q < 0.4 ? '#8a7356' : glas; }
        fenster(S, F, u, y, fo.b, fo.h, { art: fo.art, glas, laibung: orn, sprossen: fo.b > 1.6 ? [2, Math.max(1, Math.round(fo.h / 1.6))] : [1, 2], rahmen: o.sprosse ?? '#d9d4c8' });
      }
    }
    if (o.lichtband) fb(S, F, -0.1, F.L + 0.1, H - 0.38, H - 0.3, 0.22, 0.32, o.lichtband);
  }
  if (o.dachH) {
    if (o.dachForm === 'walm') { const g = walmdach(w + 0.8, d + 0.8, o.dachH); g.translate(x0 + w / 2, H, z0 + d / 2); S.add(g, o.dach); }
    else satteldach(S, p, x0, z0, w, d, H, o.dachH, o.achse ?? 'x', o.dach, o.wand, 0.45, o.oben ?? 0.3);
  } else flachdach(S, x0, z0, w, d, H, null, null, o.dach ?? '#8f8a82');
  if (o.dachreiter) { const cx = x0 + w / 2, cz = z0 + d / 2; S.quader(cx - 1.4, H + o.dachH * 0.6, cz - 1.4, cx + 1.4, H + o.dachH + 2.4, cz + 1.4, o.dachreiter); const g = walmdach(3.4, 3.4, 2.4); g.translate(cx, H + o.dachH + 2.4, cz); S.add(g, o.dach); }
  return H + (o.dachH ?? 0);
}
/** Stahlfachwerk mit Ziegelausfachung (Zollverein-Stil der 20er/30er, hier generisch). */
function stahlfachwerkBau(S, scene, p, o) {
  const { x0, z0, w, d, H } = o, r = o.r;
  S.quader(x0, 0, z0, x0 + w, H, z0 + d, o.ausfachung);
  const st = o.stahl, fr = o.feld ?? 3.6;
  for (const F of sichtbar(p, x0, z0, w, d)) {
    const n = Math.max(1, Math.round(F.L / fr)), du = F.L / n;
    for (let i = 0; i <= n; i++) fb(S, F, i * du - 0.18, i * du + 0.18, 0, H, 0, 0.2, st);
    const nz = Math.max(2, Math.round(H / fr)), dv = H / nz;
    for (let k = 0; k <= nz; k++) fb(S, F, -0.2, F.L + 0.2, k * dv - 0.15, k * dv + 0.15, 0, 0.18, st);
    for (let i = 0; i < n; i++) for (let k = 1; k < nz; k++) {
      const q = hashR(i, k, o.salz ?? 0);
      if (q < (o.fensterAnteil ?? 0.35)) {
        let glas = o.glas ?? '#5d6c76';
        if (o.zustand === 'stillgelegt' && q < 0.1) glas = '#2a2f33';
        fb(S, F, i * du + 0.4, (i + 1) * du - 0.4, k * dv + 0.4, (k + 1) * dv - 0.4, 0, 0.08, glas);
        fb(S, F, i * du + 0.4, (i + 1) * du - 0.4, k * dv + dv / 2 - 0.05, k * dv + dv / 2 + 0.05, 0, 0.12, st);
      }
    }
    if (o.lichtband) { fb(S, F, -0.2, F.L + 0.2, H - 0.25, H - 0.1, 0.18, 0.3, o.lichtband); for (let i = 0; i <= n; i += 2) fb(S, F, i * du - 0.06, i * du + 0.06, 0.3, H, 0.2, 0.28, o.lichtband); }
  }
  flachdach(S, x0, z0, w, d, H, st, null, '#7d7a74', 0.5);
  return H;
}
function hashR(a, b, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 1274126177) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Seilscheibe: Ring, Nabe und Speichen; Achse entlang 'z' (Scheibe steht in der x-y-Ebene) oder 'x'. */
function seilscheibe(S, cx, cy, cz, rad, achse, c) {
  const ring = new THREE.TorusGeometry(rad, 0.22, 4, 18);
  if (achse === 'x') ring.rotateY(PI / 2);
  ring.translate(cx, cy, cz); S.add(ring, c);
  for (let i = 0; i < 3; i++) {
    const g = new THREE.BoxGeometry(2 * rad - 0.2, 0.14, 0.14);
    g.rotateZ((i * PI) / 3); if (achse === 'x') g.rotateY(PI / 2);
    g.translate(cx, cy, cz); S.add(g, c);
  }
  const n = new THREE.CylinderGeometry(0.35, 0.35, 0.8, 8); n.rotateX(PI / 2); if (achse === 'x') n.rotateY(PI / 2); n.translate(cx, cy, cz); S.add(n, '#2f3438');
}
/** Senkrechter Gitterturm (vier Stiele, Riegel, Diagonalen) über [x0,x1]×[z0,z1] von y0 bis y1. */
function gitterturm(S, x0, z0, x1, z1, y0, y1, c, feld = 5, dick = 0.6) {
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) S.box(dick, y1 - y0, dick, x, (y0 + y1) / 2, z, c);
  const n = Math.max(1, Math.round((y1 - y0) / feld)), dy = (y1 - y0) / n;
  for (let k = 0; k <= n; k++) {
    const y = y0 + k * dy;
    S.box(x1 - x0, 0.35, 0.35, (x0 + x1) / 2, y, z0, c); S.box(x1 - x0, 0.35, 0.35, (x0 + x1) / 2, y, z1, c);
    S.box(0.35, 0.35, z1 - z0, x0, y, (z0 + z1) / 2, c); S.box(0.35, 0.35, z1 - z0, x1, y, (z0 + z1) / 2, c);
    if (k < n) {
      const a = k % 2;
      stab(S, [x0, y, a ? z0 : z1], [x1, y + dy, a ? z0 : z1], 0.14, c, 4);
      stab(S, [x1, y, a ? z1 : z0], [x0, y + dy, a ? z1 : z0], 0.14, c, 4);
      stab(S, [a ? x0 : x1, y, z0], [a ? x0 : x1, y + dy, z1], 0.14, c, 4);
      stab(S, [a ? x1 : x0, y, z1], [a ? x1 : x0, y + dy, z0], 0.14, c, 4);
    }
  }
}
/** Schornstein aus Backstein, rund, mit Kopfband. */
function schlot(S, x, z, h, rU, rO, c, o = {}) {
  zyl(S, rO, rU, h, x, 0, z, c, 14);
  zyl(S, rO + 0.3, rO + 0.3, 1.4, x, h - 1.4, z, dunkler(c, 0.12), 14);
  zyl(S, rO + 0.2, rO + 0.2, 0.5, x, h * 0.7, z, dunkler(c, 0.08), 14);
  zyl(S, rU + 0.4, rU + 0.4, 3, x, 0, z, dunkler(c, 0.06), 8);
  if (o.licht) for (let i = 0; i < 2; i++) zyl(S, rO + 0.36 + i * 0.02, rO + 0.36, 0.25, x, h - 3 - i * 6, z, o.licht, 14, true);
}
function zaun(S, x0, z0, x1, z1, y0 = 0.3, h = 1.8, c = '#5a6168') {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 2.5));
  balken(S, [x0, y0 + h, z0], [x1, y0 + h, z1], 0.06, 0.08, c);
  balken(S, [x0, y0 + 0.3, z0], [x1, y0 + 0.3, z1], 0.06, 0.08, c);
  for (let i = 0; i <= n; i++) { const t = i / n; S.box(0.1, h, 0.1, x0 + (x1 - x0) * t, y0 + h / 2, z0 + (z1 - z0) * t, c); }
  const g = new THREE.BoxGeometry(L, h - 0.3, 0.02); g.rotateY(Math.atan2(-(z1 - z0), x1 - x0)); g.translate((x0 + x1) / 2, y0 + 0.15 + h / 2, (z0 + z1) / 2); S.add(g, '#7a8188');
}
/**
 * Halde als gestufter Kegelstumpf: Böschungen (Rasen/Bergematerial) mit umlaufenden Bermenwegen.
 * Gibt die Stufen [{ y0, y1, rb, rt }] zurück (Radien in Einheiten von rx; rz/rx streckt elliptisch).
 */
function haldeStufen(S, cx, cz, rx, rz, H, stufen, farben, wegF, o = {}) {
  const seg = o.seg ?? 10, berme = o.berme ?? 0.07, top = o.top ?? 0.3, y0 = o.y0 ?? 0.3;
  const out = [];
  let rb = 1, y = y0;
  const dh = H / stufen, schwund = (1 - top - berme * (stufen - 1)) / stufen;
  for (let k = 0; k < stufen; k++) {
    const rt = rb - schwund;
    const g = new THREE.CylinderGeometry(rt, rb, dh, seg, 1);
    const jx = 1 + (o.jitter ?? 0.06) * Math.sin(k * 2.3 + 1), jz = 1 + (o.jitter ?? 0.06) * Math.cos(k * 1.7 + 0.5);
    g.rotateY((o.dreh ?? 0.3) + k * 0.21); g.scale(rx * jx, 1, rz * jz); g.translate(cx + k * (o.versatz ?? 0), y + dh / 2, cz);
    S.add(g, farben[k % farben.length]);
    if (wegF && k < stufen - 1) { const wg = new THREE.CylinderGeometry(rt, rt, 0.12, seg, 1); wg.rotateY((o.dreh ?? 0.3) + k * 0.21); wg.scale(rx * jx, 1, rz * jz); wg.translate(cx + k * (o.versatz ?? 0), y + dh + 0.04, cz); S.add(wg, wegF); }
    out.push({ y0: y, y1: y + dh, rb, rt });
    y += dh; rb = rt - berme;
  }
  return out;
}
/** Punkt auf der Halde: Winkel a, Stufe k, Anteil q (0 = Fuß, 1 = Berme oben). */
function haldePunkt(st, cx, cz, rx, rz, k, a, q) {
  const s = st[Math.min(k, st.length - 1)], rr = (s.rb + (s.rt - s.rb) * q) * 0.92;
  return [cx + Math.cos(a) * rr * rx, s.y0 + (s.y1 - s.y0) * q, cz + Math.sin(a) * rr * rz];
}

// =====================================================================================
// Ruhr: Zeche mit Fördergerüst
// =====================================================================================
const ZECHEN = ['Zeche Glückstern', 'Zeche Adolphine', 'Zeche Hermine', 'Zeche Graf Emscherberg', 'Zeche Neue Mathilde', 'Zeche Vereinigte Lerche'];
function industrieFarben(z, r) {
  if (z === 'aktiv') return { stahl: waehle(r, ['#3f6b58', '#4a6b7a', '#3d5f52']), stahl2: '#2c4a3f', ziegel: waehle(r, BACKSTEIN), orn: '#d6c6a4', glas: '#4b5a63', boden: '#8f8a80', halde: ['#3a3a3c', '#333436', '#2c2d2f'], dach: '#5a5f63', licht: null, rasen: null };
  if (z === 'stillgelegt') return { stahl: '#8a5a3e', stahl2: '#764b34', ziegel: '#8f4b39', orn: '#bfae8e', glas: '#4f5a60', boden: '#a8a393', halde: ['#7fa266', '#76995e', '#86aa6c'], dach: '#6b6560', licht: null, rasen: '#9fb57c' };
  return { stahl: '#a8392c', stahl2: '#8c2d24', ziegel: '#a35640', orn: '#e2d3b2', glas: '#5a6d78', boden: '#cdc6b6', halde: ['#8fb873', '#86b06b', '#97bf7b'], dach: '#5c6166', licht: LICHT_ROT, rasen: RASEN };
}
/** Brachflächen, Birken, Pfützen für stillgelegte Anlagen; Rasen und Bänke für Industriekultur. */
function gelaendeZustand(S, r, c, z, felder) {
  for (const [x0, z0, x1, z1] of felder) {
    if (x1 - x0 < 4 || z1 - z0 < 4) continue;
    if (z === 'stillgelegt') {
      boden(S, x0, z0, x1, z1, c.rasen, 0.3, 0.07);
      const n = Math.round(((x1 - x0) * (z1 - z0)) / 45);
      for (let i = 0; i < n; i++) (r() < 0.7 ? birke : busch)(S, zw(r, x0 + 1, x1 - 1), zw(r, z0 + 1, z1 - 1), r, zw(r, 0.7, 1.1));
    } else if (z === 'museum') {
      boden(S, x0, z0, x1, z1, c.rasen, 0.3, 0.07);
      const n = Math.round(((x1 - x0) * (z1 - z0)) / 120);
      for (let i = 0; i < n; i++) birke(S, zw(r, x0 + 1.5, x1 - 1.5), zw(r, z0 + 1.5, z1 - 1.5), r, zw(r, 0.8, 1.1));
    }
  }
}
/** Lichtlinien der Industriekultur entlang einer Strecke. */
function lichtlinie(S, a, b, c = LICHT_ROT) { stab(S, a, b, 0.12, c, 4); }

function foerdergeruest(S, p, sx, sz, Hs, Hg, v, c, r) {
  const st = c.stahl, st2 = c.stahl2;
  const bx = 3.2, bz = 3.6;
  if (v === 'doppelbock') {
    // Bockgerüst: Turm und Streben zu beiden Seiten, zwei Scheibenpaare übereinander
    gitterturm(S, sx - bx, sz - bz, sx + bx, sz + bz, Hs, Hg, st, 5, 0.7);
    for (const sg of [1, -1]) {
      for (const dz of [-1, 1]) balken(S, [sx + sg * bx, Hg - 1, sz + dz * bz], [sx + sg * 14, 0.3, sz + dz * 5], 0.9, 0.9, st);
      for (let k = 1; k < 5; k++) {
        const t = k / 5, xx = sx + sg * (bx + (14 - bx) * t), yy = Hg - 1 - (Hg - 1.3) * t;
        S.box(0.4, 0.4, 2 * (bz + (5 - bz) * t), xx, yy, sz, st2);
        const t2 = (k + 1) / 5, xx2 = sx + sg * (bx + (14 - bx) * t2), yy2 = Hg - 1 - (Hg - 1.3) * t2;
        if (k < 4) stab(S, [xx, yy, sz - (bz + (5 - bz) * t)], [xx2, yy2, sz + (bz + (5 - bz) * t2)], 0.13, st2, 4);
      }
      if (c.licht) for (const dz of [-1, 1]) lichtlinie(S, [sx + sg * bx, Hg - 1, sz + dz * (bz + 0.5)], [sx + sg * 14, 0.6, sz + dz * 5.5], c.licht);
    }
    S.quader(sx - bx - 1, Hg, sz - bz - 1, sx + bx + 1, Hg + 0.5, sz + bz + 1, st2);
    S.quader(sx - bx - 0.6, Hg - 6.5, sz - bz - 0.6, sx + bx + 0.6, Hg - 6.1, sz + bz + 0.6, st2);
    for (const dz of [-2.1, 2.1]) {
      seilscheibe(S, sx, Hg + 3.6, sz + dz, 3.0, 'z', st2);
      seilscheibe(S, sx, Hg - 3.3, sz + dz * 0.95, 2.6, 'z', st2);
      S.box(1.2, 0.8, 0.5, sx, Hg + 0.9, sz + dz, '#2f3438');
    }
    return { seilA: [[sx + 2.6, Hg + 5.2], [sx + 3, Hg + 3.6]], seilB: [[sx - 2.3, Hg - 2.0], [sx - 2.6, Hg - 3.3]] };
  }
  if (v === 'malakow') {
    // Malakowturm: massiver Backsteinturm mit Ecktürmen, Zinnen und Seilscheiben obenauf
    const tw = 6.5, H = Hg, z = c.ziegel, orn = c.orn;
    S.quader(sx - tw, 0, sz - tw, sx + tw, H, sz + tw, z);
    for (const F of sichtbar(p, sx - tw, sz - tw, 2 * tw, 2 * tw)) {
      for (const u of [2.8, F.L / 2, F.L - 2.8]) for (let k = 0; k < 4; k++) {
        let glas = c.glas; if (p.zustand === 'stillgelegt' && hashR(k, Math.round(u), 3) < 0.35) glas = '#2a2f33';
        fenster(S, F, u, 3 + k * 6.4, 1.6, 3.6, { art: 'rund', glas, laibung: orn, sprossen: [1, 2] });
      }
      for (let k = 1; k < 5; k++) fb(S, F, -0.05, F.L + 0.05, k * 6.4 + 0.6, k * 6.4 + 0.9, 0, 0.18, orn);
      for (let u = 0.6; u < F.L - 0.4; u += 1.0) fb(S, F, u, u + 0.5, H - 1.6, H - 1.2, 0, 0.2, orn);
      if (c.licht) fb(S, F, -0.1, F.L + 0.1, H - 0.9, H - 0.75, 0.3, 0.4, c.licht);
    }
    S.quader(sx - tw - 0.3, H - 1.2, sz - tw - 0.3, sx + tw + 0.3, H, sz + tw + 0.3, dunkler(z, 0.04));
    for (let i = 0; i < 8; i++) for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const t = -tw + 0.9 + i * ((2 * tw - 1.8) / 7);
      const x = a ? sx + a * (tw + 0.1) : sx + t, zz = b ? sz + b * (tw + 0.1) : sz + t;
      S.box(a ? 0.6 : 0.8, 1.2, a ? 0.8 : 0.6, x, H + 0.6, zz, z);
    }
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      S.quader(sx + a * tw - 1.4, 0, sz + b * tw - 1.4, sx + a * tw + 1.4, H + 3, sz + b * tw + 1.4, z);
      S.quader(sx + a * tw - 1.6, H + 3, sz + b * tw - 1.6, sx + a * tw + 1.6, H + 3.8, sz + b * tw + 1.6, orn);
      for (const [q, w2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.box(0.6, 0.9, 0.6, sx + a * tw + q * 1.2, H + 4.25, sz + b * tw + w2 * 1.2, z);
    }
    flachdach(S, sx - tw, sz - tw, 2 * tw, 2 * tw, H, null, null, '#6b6560');
    for (const dz of [-2.1, 2.1]) {
      seilscheibe(S, sx, H + 4.2, sz + dz, 3.0, 'z', st2);
      for (const dx of [-1.6, 1.6]) balken(S, [sx + dx * 1.6, H, sz + dz], [sx, H + 4.2, sz + dz], 0.35, 0.35, st);
    }
    return { seilA: [[sx + 2.2, H + 6.3], [sx + 3, H + 4.2]], seilB: null };
  }
  // Strebengerüst: senkrechter Führungsturm, Strebe zum Maschinenhaus
  gitterturm(S, sx - bx, sz - bz, sx + bx, sz + bz, Hs, Hg, st, 5, 0.7);
  for (const dz of [-1, 1]) balken(S, [sx + bx, Hg - 1.2, sz + dz * bz], [sx + 13, 0.3, sz + dz * 4.8], 1.4, 1.4, st);
  for (let k = 1; k < 6; k++) {
    const t = k / 6, xx = sx + bx + (13 - bx) * t, yy = Hg - 1.2 - (Hg - 1.5) * t, zb = bz + (4.8 - bz) * t;
    S.box(0.45, 0.45, 2 * zb, xx, yy, sz, st2);
    if (k < 5) { const t2 = (k + 1) / 6, zb2 = bz + (4.8 - bz) * t2; stab(S, [xx, yy, sz - zb], [sx + bx + (13 - bx) * t2, Hg - 1.2 - (Hg - 1.5) * t2, sz + zb2], 0.14, st2, 4); }
    if (k % 2 === 0) balken(S, [sx + bx, yy + 1.5, sz], [xx, yy, sz], 0.35, 0.35, st2);
  }
  if (c.licht) for (const dz of [-1, 1]) { lichtlinie(S, [sx + bx + 0.5, Hg - 1.2, sz + dz * (bz + 0.6)], [sx + 13.5, 0.6, sz + dz * 5.4], c.licht); lichtlinie(S, [sx - bx - 0.45, Hs, sz + dz * (bz + 0.45)], [sx - bx - 0.45, Hg, sz + dz * (bz + 0.45)], c.licht); }
  S.quader(sx - bx - 1, Hg, sz - bz - 1.2, sx + bx + 1.6, Hg + 0.5, sz + bz + 1.2, st2);
  for (const [a, b] of [[sz - bz - 1.2, sz - bz - 1.1], [sz + bz + 1.1, sz + bz + 1.2]]) S.quader(sx - bx - 1, Hg + 0.5, a, sx + bx + 1.6, Hg + 1.5, b, st2);
  // Seilscheibenstuhl mit Kopfbock
  S.quader(sx - 1.6, Hg + 0.5, sz - bz, sx + 1.6, Hg + 1.4, sz + bz, st2);
  for (const dz of [-2.1, 2.1]) seilscheibe(S, sx, Hg + 4.4, sz + dz, 3.6, 'z', st2);
  balken(S, [sx - 3, Hg + 1.4, sz], [sx, Hg + 8.4, sz], 0.4, 0.4, st);
  balken(S, [sx + 3, Hg + 1.4, sz], [sx, Hg + 8.4, sz], 0.4, 0.4, st);
  S.box(1.4, 0.5, bz * 2 + 1, sx, Hg + 8.4, sz, st2);
  return { seilA: [[sx + 2.4, Hg + 6.6], [sx + 3.2, Hg + 4.4]], seilB: null };
}

function zecheRoh(S, scene, p) {
  const r = rng(`zeche:${p.seed}:${p.variante}:${p.zustand}`);
  const { w: W, d: D, zustand: Z } = p, v = p.variante;
  const c = industrieFarben(Z, r);
  const name = p.name ?? waehle(r, ZECHEN);
  boden(S, 0, 0, W, D, c.boden, 0.3, 0.05);
  const sx = Math.round(W * 0.42), sz = Math.round(D * 0.5);
  const Hs = 12, Hg = v === 'doppelbock' ? 46 : v === 'malakow' ? 30 : 54;
  // Schachthalle unter dem Gerüst
  if (v !== 'malakow') backsteinHalle(S, scene, p, { x0: sx - 8, z0: sz - 7, w: 16, d: 14, H: Hs, wand: c.ziegel, orn: c.orn, dach: c.dach, dachH: 3.5, achse: 'z', r, zustand: Z,
    fenster: { art: 'rund', b: 1.8, h: 4.6, y: 3.6, raster: 3.8 }, glas: c.glas, lichtband: c.licht });
  const g = foerdergeruest(S, p, sx, sz, Hs + 3, Hg, v, c, r);
  // Fördermaschinenhaus(er)
  const mh = (x0, links) => {
    backsteinHalle(S, scene, p, { x0, z0: sz - 8, w: 20, d: 16, H: 13, wand: c.ziegel, orn: c.orn, dach: c.dach, dachH: 4.5, achse: 'x', r, zustand: Z,
      fenster: { art: 'rund', b: 2.4, h: 6.6, y: 2.4, raster: 4.4 }, glas: c.glas, lichtband: c.licht, dachreiter: links ? null : c.ziegel });
    return links ? x0 + 20 : x0;
  };
  const ein = mh(sx + 15, false);
  for (const [a, b] of [g.seilA]) for (const dz of [-2.1, 2.1]) { stab(S, [a[0], a[1], sz + dz], [ein, 14.5, sz + dz], 0.07, '#2b2f33', 4); stab(S, [b[0], b[1], sz + dz], [ein, 12.5, sz + dz], 0.07, '#2b2f33', 4); }
  if (v !== 'malakow') for (const dz of [-2.1, 2.1]) stab(S, [sx - 3.2, Hg + 4.4, sz + dz], [sx - 3.2, Hs + 3.5, sz + dz], 0.07, '#2b2f33', 4);
  if (v === 'doppelbock') {
    const aus = mh(sx - 35, true);
    for (const dz of [-2, 2]) { stab(S, [g.seilB[0][0], g.seilB[0][1], sz + dz], [aus, 14.5, sz + dz], 0.07, '#2b2f33', 4); stab(S, [g.seilB[1][0], g.seilB[1][1], sz + dz], [aus, 12.5, sz + dz], 0.07, '#2b2f33', 4); }
  } else {
    // Waschkaue und Magazin links vom Schacht
    backsteinHalle(S, scene, p, { x0: sx - 30, z0: sz - 6, w: 18, d: 14, H: 9, wand: c.ziegel, orn: c.orn, dach: c.dach, dachH: 4, achse: 'x', r, zustand: Z,
      fenster: { art: 'segment', b: 1.6, h: 2.2, y: 1.8, raster: 3.0, zeilen: 2 }, glas: c.glas });
  }
  // Kohlenwäsche mit Bandbrücke
  const wz1 = sz - 10, wx1 = 4 + 22;
  const Hw = stahlfachwerkBau(S, scene, p, { x0: 4, z0: 3, w: 22, d: wz1 - 3, H: 20, ausfachung: c.ziegel, stahl: c.stahl, r, zustand: Z, salz: p.seed, lichtband: c.licht, fensterAnteil: 0.4 });
  stahlfachwerkBau(S, scene, p, { x0: 8, z0: 6, w: 12, d: wz1 - 9, H: Hw + 5, ausfachung: c.ziegel, stahl: c.stahl, r, zustand: Z, salz: p.seed + 3, fensterAnteil: 0.5 });
  const bA = [wx1 - 1, 16, wz1 - 4], bB = [sx - 8, Hs - 1.5, sz - 3];
  balken(S, bA, bB, 2.6, 2.4, c.stahl2);
  balken(S, [bA[0], bA[1] + 1.25, bA[2]], [bB[0], bB[1] + 1.25, bB[2]], 2.8, 0.2, c.dach);
  for (let i = 1; i < 3; i++) { const t = i / 3, px = bA[0] + (bB[0] - bA[0]) * t, py = bA[1] + (bB[1] - bA[1]) * t, pz = bA[2] + (bB[2] - bA[2]) * t; S.box(0.7, py - 1.2, 0.7, px, (py - 1.2) / 2 + 0.3, pz, c.stahl); }
  // Kesselhaus und Schlot
  backsteinHalle(S, scene, p, { x0: sx - 6, z0: 3, w: 16, d: 11, H: 10, wand: c.ziegel, orn: c.orn, dach: c.dach, dachH: 3, achse: 'x', r, zustand: Z, fenster: { art: 'rund', b: 1.8, h: 4.4, y: 2.2, raster: 3.6 }, glas: c.glas });
  schlot(S, sx + 13, 8, 52, 2.4, 1.5, dunkler(c.ziegel, 0.03), { licht: c.licht });
  if (Z === 'aktiv') rauch(S, sx + 13.5, 54, 8.5, r, 4, 1.1, '#e4e6e8');
  // Halde hinten rechts
  const hx = sx + 15 + 20 + 3, hrx = Math.max(7, (W - hx) / 2 + 4), hcx = W - hrx - 0.5, hrz = Math.max(6, (sz - 10) / 2 + 1);
  if (Z === 'aktiv') {
    const k = new THREE.ConeGeometry(1, 1, 9); k.scale(hrx, 15, hrz); k.translate(hcx, 7.8, hrz - 1); S.add(k, c.halde[0]);
    const k2 = new THREE.ConeGeometry(1, 1, 8); k2.scale(hrx * 0.6, 9, hrz * 0.7); k2.translate(hcx - hrx * 0.7, 4.8, hrz + 1); S.add(k2, c.halde[1]);
    balken(S, [hcx - 2, 15, hrz - 1], [hx - 4, 6, sz - 10], 1.4, 1.2, c.stahl2);
  } else {
    const st = haldeStufen(S, hcx, hrz - 1, hrx, hrz, 13, 3, c.halde, '#cbbf9e', { seg: 9 });
    for (let i = 0; i < 9; i++) { const k = i % 3, a = zw(r, 0, 2 * PI), q = haldePunkt(st, hcx, hrz - 1, hrx, hrz, k, a, zw(r, 0.3, 0.9)); birke(S, q[0], q[2], r, 0.7, q[1]); }
  }
  // Zechenbahn rechts
  const gx = W - 4.5;
  gleis(S, gx, sz - 6, gx, D);
  if (Z === 'aktiv') { for (let i = 0; i < 3; i++) kohlenwagen(S, gx, sz + 1 + i * 10.2, PI / 2, true, waehle(r, ['#5b3a2e', '#4f3a30', '#6b4232'])); lok(S, gx, D - 7, PI / 2, '#c8463c'); }
  else if (Z === 'stillgelegt') kohlenwagen(S, gx, sz + 4, PI / 2, false, '#7a4b34');
  else { kohlenwagen(S, gx, sz + 6, PI / 2, true, '#5b3a2e'); }
  // Lohnhalle mit Uhrtürmchen an der Front
  const lz0 = D - 21, lw = Math.min(28, sx - 4);
  backsteinHalle(S, scene, p, { x0: 4, z0: lz0, w: lw, d: 12, H: 9, wand: c.ziegel, orn: c.orn, dach: c.dach, dachH: 5, achse: 'x', r, zustand: Z, dachreiter: c.ziegel,
    fenster: { art: 'segment', b: 1.6, h: 2.3, y: 1.7, raster: 3.2, zeilen: 2 }, glas: c.glas, lichtband: c.licht });
  if (istSicht(p, '+z')) {
    const F = seitenRahmen(4, lz0, lw, 12)['+z'];
    fb(S, F, lw / 2 - 3, lw / 2 + 3, 0, 11.5, 0, 0.6, c.ziegel);
    fpoly(S, F, [[lw / 2 - 3, 11.5], [lw / 2 + 3, 11.5], [lw / 2, 14]], 0, 0.6, c.ziegel);
    fenster(S, F, lw / 2, 0.3, 2.2, 3.4, { art: 'rund', glas: '#4a3a30', laibung: c.orn, t: 0.6 });
    ftext(scene, F, name, lw / 2, 8.4, 0.62, 0.8, 5.6, '#f4f0e4');
    if (Z === 'museum') { ftext(scene, F, 'Industriemuseum', lw / 2, 5.4, 0.65, 0.55, 5.4, '#ffffff', '#a8392c'); }
  }
  // Tor mit Glückauf-Bogen, Zaun, Vorplatz
  const tx = 4 + lw + 3, tw = 10;
  for (const xx of [tx, tx + tw]) { S.quader(xx - 0.6, 0.3, D - 3.6, xx + 0.6, 4.6, D - 2.4, c.ziegel); S.quader(xx - 0.75, 4.6, D - 3.75, xx + 0.75, 5.0, D - 2.25, c.orn); }
  S.quader(tx - 0.6, 5.0, D - 3.2, tx + tw + 0.6, 7.6, D - 2.8, c.stahl2);
  if (istSicht(p, '+z')) ftext(scene, seitenRahmen(tx, D - 3, tw, 0.2)['+z'], 'Glückauf', tw / 2, 6.3, 0.02, 2.0, tw + 0.6, '#f4f0e4');
  if (istSicht(p, '-z')) ftext(scene, R(tx + tw, D - 3.22, -1, 0, tw, '-z'), 'Glückauf', tw / 2, 6.3, 0, 2.0, tw + 0.6, '#f4f0e4');
  if (Z !== 'museum') { zaun(S, 0.5, D - 3, tx - 0.7, D - 3); zaun(S, tx + tw + 0.7, D - 3, W - 0.5, D - 3); }
  else { boden(S, 0, D - 7, W, D, PFLASTER, 0.3, 0.08); figuren(S, r, 4, D - 7, W - 8, D - 1, 16, 0.38); }
  // Werks- oder Besucherparkplatz vorne rechts
  const px0 = tx + tw + 3, px1 = W - 9;
  if (px1 - px0 > 8) parkplatz(S, r, px0, sz + 10, px1, D - 5, { dichte: Z === 'stillgelegt' ? 0.1 : 0.7 });
  if (Z === 'museum') {
    // Info-Stele, Fahnen, Besucher
    for (let i = 0; i < 3; i++) { S.box(0.15, 7, 0.15, tx + 1 + i * 3, 3.8, D - 5.5, '#d9dcdf'); S.box(0.05, 2.6, 1.0, tx + 1 + i * 3, 5.8, D - 5, ['#a8392c', '#f4f0e4', '#2f3438'][i]); }
    S.box(1.4, 2.4, 0.3, 4 + lw / 2 + 5, 1.5, D - 5, '#2f3438');
    figuren(S, r, sx - 10, sz + 8, sx + 10, sz + 14, 10, 0.35);
  }
  gelaendeZustand(S, r, c, Z, [[4, sz + 9, sx - 10, D - 22], [sx + 10, sz + 9, px0 - 1, D - 6], [W - 30, 0.5, hcx - hrx - 1, sz - 9]]);
  return { hoehe: Hg + 10, name };
}
export const ZECHE_VARIANTEN = ['strebe', 'doppelbock', 'malakow'];
const ruhrZeche = slot('slot:ruhr_zeche', {
  varianten: ZECHE_VARIANTEN, nenn: { strebe: [92, 72, 120, 96], doppelbock: [96, 72, 120, 96], malakow: [92, 72, 120, 96] },
  zustaende: ['aktiv', 'stillgelegt', 'museum'], zustandWahl: (r) => { const q = r(); return q < 0.15 ? 'aktiv' : q < 0.55 ? 'stillgelegt' : 'museum'; },
  roh: zecheRoh,
});

// =====================================================================================
// Ruhr: Kokerei, Hütte mit Hochofen, Gasometer
// =====================================================================================
/** Rohrleitung auf Stützen entlang eines Polygonzugs [[x, z], …] in Höhe y. */
function rohrtrasse(S, pkt, y, rad, c, stuetze) {
  for (let i = 0; i < pkt.length - 1; i++) {
    const [ax, az] = pkt[i], [bx, bz] = pkt[i + 1];
    stab(S, [ax, y, az], [bx, y, bz], rad, c, 8);
    const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 8));
    for (let k = 0; k <= n; k++) { const px = ax + ((bx - ax) * k) / n, pz = az + ((bz - az) * k) / n; S.box(0.4, y - rad - 0.3, 0.4, px, 0.3 + (y - rad - 0.3) / 2, pz, stuetze); }
  }
}
function torpedowagen(S, x, z, ry, glut) {
  const g = new THREE.CapsuleGeometry(1.5, 9, 4, 10); g.rotateZ(PI / 2); g.rotateY(ry); g.translate(x, 2.6, z); S.add(g, '#4a4440');
  const c = Math.cos(ry), s = Math.sin(ry);
  for (const o of [-4.8, 4.8]) S.box(3, 1.2, 2.6, x + c * o, 1.0, z - s * o, '#2b2f33', ry);
  S.box(1.2, 0.5, 1.2, x, 4.2, z, glut ? '#ff8a2a' : '#3b3f44', ry);
}

function kokereiRoh(S, scene, p) {
  const r = rng(`kok:${p.seed}:${p.variante}:${p.zustand}`);
  const { w: W, d: D, zustand: Z } = p, v = p.variante;
  const c = industrieFarben(Z, r);
  boden(S, 0, 0, W, D, c.boden, 0.3, 0.05);
  const rost = Z === 'aktiv' ? '#5d5650' : Z === 'stillgelegt' ? '#7a5038' : '#6b4a3a';
  if (v === 'kokerei') {
    // Koksofenbatterie
    const bx0 = 18, bx1 = Math.min(W - 22, bx0 + 64), bz0 = Math.round(D * 0.36), bz1 = bz0 + 13, Hb = 9;
    S.quader(bx0, 0, bz0, bx1, Hb, bz1, '#7c7068');
    S.quader(bx0 - 0.4, Hb, bz0 - 0.4, bx1 + 0.4, Hb + 0.8, bz1 + 0.4, '#9a938a');
    for (const F of sichtbar(p, bx0, bz0, bx1 - bx0, bz1 - bz0)) {
      const lang = F.L > 20;
      if (lang) {
        for (let u = 0.7; u < F.L; u += 1.45) { fb(S, F, u - 0.16, u + 0.16, 0.3, Hb + 1.4, 0, 0.45, '#2f3438'); fb(S, F, u + 0.24, u + 1.2, 1.2, Hb - 1.0, 0, 0.18, Z === 'aktiv' ? '#4a423e' : rost); }
        fb(S, F, -0.3, F.L + 0.3, Hb - 0.6, Hb - 0.2, 0.2, 0.6, '#3b3f44');
        // Bedienbühne
        fb(S, F, 0, F.L, 4.6, 4.9, 0, 1.8, '#5a6168');
        for (let u = 1; u < F.L; u += 1.2) fb(S, F, u - 0.03, u + 0.03, 4.9, 5.9, 1.7, 1.8, '#5a6168');
        fb(S, F, 0, F.L, 5.85, 5.95, 1.7, 1.8, '#5a6168');
      } else { fb(S, F, 0.5, F.L - 0.5, 0.3, Hb, 0, 0.4, c.ziegel); for (let k = 0; k < 2; k++) fenster(S, F, F.L / 2, 2 + k * 3.5, 1.6, 2.2, { art: 'segment', glas: c.glas, t: 0.4 }); }
    }
    // Steigrohre und Vorlage
    for (let x = bx0 + 1; x < bx1 - 0.5; x += 2.9) { zyl(S, 0.3, 0.3, 2.4, x, Hb + 0.8, bz0 + 2.4, '#3b3f44', 6); S.box(0.7, 0.4, 1.4, x, Hb + 3.2, bz0 + 1.9, '#3b3f44'); }
    stab(S, [bx0, Hb + 3.0, bz0 + 1.3], [bx1 + 2, Hb + 3.0, bz0 + 1.3], 0.9, '#4a4f55', 10);
    // Füllwagen auf der Ofendecke
    S.box(4, 2.6, 9, bx0 + (bx1 - bx0) * 0.6, Hb + 2.1, (bz0 + bz1) / 2 + 1.5, Z === 'museum' ? '#e0b23a' : '#7a7f85');
    for (const zz of [bz0 + 3.5, bz1 - 0.8]) S.quader(bx0, Hb + 0.8, zz - 0.1, bx1, Hb + 1.0, zz + 0.1, '#5a6168');
    // Kohlenturm am linken Ende (Stahlfachwerk)
    const Hk = stahlfachwerkBau(S, scene, p, { x0: 4, z0: bz0 - 2, w: bx0 - 5, d: 17, H: 34, ausfachung: c.ziegel, stahl: c.stahl, r, zustand: Z, salz: p.seed, lichtband: c.licht, fensterAnteil: 0.3 });
    satteldach(S, p, 4, bz0 - 2, bx0 - 5, 17, Hk, 3, 'z', c.dach, c.ziegel);
    balken(S, [10, Hk - 3, bz0 - 2], [W * 0.3, 8, 2], 2.4, 2.2, c.stahl2);
    for (let i = 1; i < 3; i++) { const t = i / 3, px = 10 + (W * 0.3 - 10) * t, py = Hk - 3 + (8 - Hk + 3) * t, pz = bz0 - 2 + (2 - bz0 + 2) * t; S.box(0.8, py - 1, 0.8, px, (py - 1) / 2 + 0.3, pz, c.stahl); }
    // Löschturm rechts
    const lx = bx1 + 6, lz = bz1 + 4;
    S.quader(lx - 3.5, 0, lz - 3.5, lx + 3.5, 30, lz + 3.5, Z === 'museum' ? '#c9c2b4' : '#a8a196');
    for (const F of sichtbar(p, lx - 3.5, lz - 3.5, 7, 7)) { for (let y = 6; y < 30; y += 6) fb(S, F, -0.1, 7.1, y - 0.15, y + 0.15, 0, 0.15, '#8f897e'); fb(S, F, 1, 6, 24, 29, 0, 0.05, '#2f3438'); }
    S.quader(lx - 4, 30, lz - 4, lx + 4, 31, lz + 4, '#8f897e');
    if (Z === 'aktiv') rauch(S, lx, 33, lz, r, 5, 1.6, '#f2f3f4');
    gleis(S, bx0 - 4, bz1 + 4, bx1 + 12, bz1 + 4);
    S.box(10, 3.5, 3.2, bx0 + (bx1 - bx0) * 0.3, 2.6, bz1 + 4, Z === 'aktiv' ? '#5a4b40' : rost);
    // Koksseite: Kokskuchenführungswagen
    S.box(5, 7, 3, bx0 + (bx1 - bx0) * 0.75, 4.0, bz1 + 1.2, Z === 'museum' ? '#e0b23a' : '#6b7178');
    // Nebengewinnung: Behälter und Rohrbrücke hinten
    for (let i = 0; i < 4; i++) zyl(S, 2.6, 2.6, 10 + (i % 2) * 4, bx0 + 14 + i * 7, 0.3, 7, i % 2 ? '#c9cdd1' : '#b7bcc0', 14);
    rohrtrasse(S, [[bx1 + 2, bz0 + 1.3], [bx1 + 2, 12], [bx0 + 8, 12]], 7, 0.8, '#8a8f94', '#6b7178');
    schlot(S, bx0 + (bx1 - bx0) * 0.45, bz0 - 5, 64, 2.8, 1.8, '#a8a196', { licht: c.licht });
    // Kühlturm (Naturzug) hinten rechts
    { const kr = Math.min(7.5, (W - bx1 - 4) / 2), kx = W - kr - 2, kzz = Math.max(kr + 1, Math.min(bz0 - kr - 1, 12)), kh = 30, pts = [];
      for (let i = 0; i <= 8; i++) { const y = (kh * i) / 8, q = (y - kh * 0.72) / (kh * 0.55); pts.push(new THREE.Vector2(kr * 0.62 * Math.sqrt(1 + q * q), y)); }
      const kt = new THREE.LatheGeometry(pts, 18); kt.translate(kx, 0.3, kzz); S.add(kt, Z === 'stillgelegt' ? '#b9b2a4' : '#d6d1c6');
      zyl(S, kr * 0.62 * Math.sqrt(1 + Math.pow(0.28 / 0.55, 2)) + 0.15, kr * 0.62 * Math.sqrt(1 + Math.pow(0.28 / 0.55, 2)) + 0.15, 0.6, kx, kh - 0.3, kzz, '#a8a196', 18, true);
      if (Z === 'aktiv') rauch(S, kx, kh + 3, kzz, r, 3, 2.0, '#f4f5f6');
      if (c.licht) zyl(S, kr * 0.75, kr * 0.75, 0.5, kx, kh * 0.4, kzz, LICHT_BLAU, 18, true); }
    if (Z === 'aktiv') { rauch(S, bx0 + (bx1 - bx0) * 0.45 + 0.6, 66, bz0 - 4.5, r, 3, 1.1, '#d9dcdf'); for (let i = 0; i < 4; i++) kugel(S, bx0 + 8 + i * 14, Hb + 5 + i % 2, bz0 + 4, 1.6, '#e9ebec'); }
    if (c.licht) { stab(S, [bx0, Hb + 0.9, bz1 + 0.5], [bx1, Hb + 0.9, bz1 + 0.5], 0.12, LICHT_ROT, 4); stab(S, [bx1 + 0.5, Hb + 0.9, bz0], [bx1 + 0.5, Hb + 0.9, bz1], 0.12, LICHT_ROT, 4); }
    // Vorplatz
    const vz = bz1 + 8;
    if (Z === 'museum') { boden(S, 2, vz, W - 2, D - 2, PFLASTER, 0.3, 0.08); figuren(S, r, 8, vz + 2, W - 8, D - 4, 20, 0.38); for (let i = 0; i < 6; i++) birke(S, 6 + i * ((W - 12) / 5), D - 4, r, 1); }
    else zaun(S, 1, D - 2, W - 1, D - 2);
    if (D - vz > 14) parkplatz(S, r, W * 0.55, vz + 3, W - 4, D - 4, { dichte: Z === 'stillgelegt' ? 0.05 : 0.6 });
    gelaendeZustand(S, r, c, Z, [[4, vz + 2, W * 0.5, D - 4], [bx1 + 11, 2, W - 2, bz1]]);
    return { hoehe: 66 };
  }
  if (v === 'huette') {
    const hx = Math.round(W * 0.42), hz = Math.round(D * 0.48), Hg = 34;
    // Gestell, Rast, Schacht des Hochofens
    zyl(S, 6.5, 7, 10, hx, 0, hz, rost, 14);
    zyl(S, 5, 6.5, 22, hx, 10, hz, dunkler(rost, 0.04), 14);
    zyl(S, 9.5, 9.5, 0.6, hx, 12, hz, '#4a4f55', 16);
    const ring = new THREE.TorusGeometry(7.6, 0.8, 6, 18); ring.rotateX(PI / 2); ring.translate(hx, 9.5, hz); S.add(ring, '#5d5650');
    for (const y of [20, Hg]) zyl(S, 9, 9, 0.5, hx, y, hz, '#4a4f55', 16);
    gitterturm(S, hx - 8, hz - 8, hx + 8, hz + 8, 0.3, Hg, c.stahl, 6, 0.8);
    // Gichtaufbau, Gichtgasleitungen, Staubsack
    S.quader(hx - 4, Hg + 0.5, hz - 4, hx + 4, Hg + 9, hz + 4, dunkler(rost, 0.02));
    gitterturm(S, hx - 3, hz - 3, hx + 3, hz + 3, Hg + 9, Hg + 18, c.stahl, 4.5, 0.5);
    for (const [dx, dz] of [[-2.5, -2.5], [2.5, 2.5]]) { stab(S, [hx + dx, Hg + 4, hz + dz], [hx + dx, Hg + 16, hz + dz], 0.9, '#6b5a50', 8); }
    const sbx = hx - 18, sbz = hz - 10;
    stab(S, [hx - 2.5, Hg + 16, hz - 2.5], [sbx, Hg + 4, sbz], 1.0, '#6b5a50', 8);
    stab(S, [hx + 2.5, Hg + 16, hz + 2.5], [sbx + 0.5, Hg + 4, sbz + 1], 1.0, '#6b5a50', 8);
    zyl(S, 4, 4, 9, sbx, 18, sbz, '#5d5650', 12); const kg = new THREE.ConeGeometry(4, 6, 12); kg.rotateX(PI); kg.translate(sbx, 15, sbz); S.add(kg, '#5d5650');
    stab(S, [sbx, Hg - 7, sbz], [sbx, Hg + 4, sbz], 0.9, '#6b5a50', 8);
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) S.box(0.6, 12, 0.6, sbx + dx, 6.3, sbz + dz, c.stahl);
    // Winderhitzer (Cowper) in einer Reihe
    const wx0 = hx + 15, wz = hz - 6, n = W - wx0 > 30 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const cx = wx0 + i * 8.2;
      zyl(S, 3.4, 3.6, 30, cx, 0.3, wz, i % 2 ? '#7a7066' : '#6f655c', 14);
      const kp = new THREE.SphereGeometry(3.4, 14, 6, 0, 2 * PI, 0, PI / 2); kp.translate(cx, 30.3, wz); S.add(kp, '#6f655c');
      for (const y of [8, 18, 26]) zyl(S, 3.8, 3.8, 0.3, cx, y, wz, '#4a4f55', 14);
      if (Z === 'museum') zyl(S, 3.62, 3.62, 0.8, cx, 22, wz, i % 2 ? LICHT_BLAU : '#5fe08a', 14, true);
    }
    stab(S, [wx0 - 4, 14, wz + 4.5], [wx0 + (n - 1) * 8.2, 14, wz + 4.5], 1.2, '#5d5650', 10);
    stab(S, [wx0 - 4, 14, wz + 4.5], [hx + 7, 9.5, hz], 1.2, '#5d5650', 10);
    // Schrägaufzug von der Möllerung zur Gicht
    const mx = Math.max(6, hx - 34), mz = hz + 4;
    S.quader(mx - 4, 0, mz - 8, mx + 10, 10, mz + 8, '#a8a196');
    for (const F of sichtbar(p, mx - 4, mz - 8, 14, 16)) for (let u = 2; u < F.L; u += 4) fb(S, F, u - 0.25, u + 0.25, 0.3, 10, 0, 0.3, '#8f897e');
    for (const dz of [-1.6, 1.6]) balken(S, [mx + 8, 10, mz + dz], [hx - 3, Hg + 8, hz + dz * 0.8], 0.7, 0.9, c.stahl);
    for (let k = 1; k < 6; k++) { const t = k / 6, px = mx + 8 + (hx - 3 - mx - 8) * t, py = 10 + (Hg - 2) * t; S.box(0.4, 0.4, 3.6, px, py, mz + (hz - mz) * t, c.stahl2); S.box(0.5, py - 0.3, 0.5, px, py / 2 + 0.15, mz + (hz - mz) * t - 1.6, c.stahl); }
    // Gießhalle vorn
    const gz0 = hz + 8, gz1 = Math.min(D - 14, hz + 22);
    S.quader(hx - 10, 0, gz0, hx + 12, 13, gz1, '#7d7a74');
    for (const F of sichtbar(p, hx - 10, gz0, 22, gz1 - gz0)) { for (let u = 0; u <= F.L; u += 3.6) fb(S, F, u - 0.2, u + 0.2, 0.3, 13, 0, 0.25, c.stahl); fb(S, F, 0, F.L, 9, 11.5, 0, 0.1, c.glas); fb(S, F, 2, 8, 0.3, 6, 0, 0.12, Z === 'aktiv' ? '#ff8a2a' : '#2f3438'); }
    satteldach(S, p, hx - 10, gz0, 22, gz1 - gz0, 13, 3, 'x', c.dach, '#7d7a74');
    S.quader(hx - 3, 16, gz0 - 0.4, hx + 3, 17.5, gz1 - 0.4, '#5d5650');
    gleis(S, 2, gz1 + 3, W - 2, gz1 + 3);
    torpedowagen(S, hx + 20, gz1 + 3, 0, Z === 'aktiv');
    if (Z !== 'museum') torpedowagen(S, hx - 8, gz1 + 3, 0, false);
    schlot(S, wx0 + n * 8.2 + 2, wz + 8, 60, 2.4, 1.6, '#8a8178', { licht: c.licht });
    if (Z === 'aktiv') { rauch(S, hx + 1, Hg + 20, hz, r, 4, 1.4, '#e6e2dc'); rauch(S, wx0 + n * 8.2 + 2.5, 62, wz + 8, r, 3, 1, '#d9dcdf'); }
    if (c.licht) { for (const y of [20.6, Hg + 0.6]) { const t = new THREE.TorusGeometry(9.1, 0.18, 4, 18); t.rotateX(PI / 2); t.translate(hx, y, hz); S.add(t, y > 30 ? LICHT_ROT : LICHT_BLAU); } }
    if (Z === 'museum') {
      // Vorplatz des Landschaftsparks: Besucherzentrum in alter Backsteinhalle, Parkplatz, Baumreihe (keine leere Pflasterfläche)
      boden(S, W * 0.4, gz1 + 6, W - 2, D - 2, PFLASTER, 0.3, 0.08);
      const vz0 = gz1 + 8, vd = Math.min(12, D - 4 - vz0), vw = Math.min(24, W * 0.22), vx = W * 0.42;
      if (vd >= 7) backsteinHalle(S, scene, p, { x0: vx, z0: vz0, w: vw, d: vd, H: 7, wand: c.ziegel, orn: c.orn, dach: c.dach, dachH: 2.4, achse: 'x', r, zustand: Z, fenster: { art: 'rund', b: 1.4, h: 2.6, y: 1.6, raster: 3.2 }, glas: c.glas });
      if (D - 4 - vz0 > 8) parkplatz(S, r, vx + vw + 4, vz0, W - 4, D - 4, { dichte: 0.6 });
      for (let x = W * 0.42; x < W - 3; x += 7) birke(S, x, gz1 + 6.5, r, 0.9);
      figuren(S, r, W * 0.42, gz1 + 6.5, vx + vw + 3, D - 3, 14, 0.38);
    }
    else zaun(S, 1, D - 2, W - 1, D - 2);
    // Fläche hinter den Winderhitzern: Erz- und Kokshalden (aktiv) bzw. Bewuchs (stillgelegt, Museum)
    const ez0 = 3, ez1 = wz - 5, ex0 = hx + 12, ex1 = W - 3;
    if (ez1 - ez0 > 8 && ex1 - ex0 > 10) {
      if (Z === 'aktiv') for (let x = ex0 + 6; x < ex1 - 5; x += 12) { const g = new THREE.ConeGeometry(Math.min(6, (ez1 - ez0) / 2), 5.5, 10); g.scale(1, 1, 0.8); g.translate(x, 0.3 + 2.75, (ez0 + ez1) / 2); S.add(g, x % 24 < 12 ? '#6b4a3a' : '#3b3f44'); }
      else gelaendeZustand(S, r, c, Z, [[ex0, ez0, ex1, ez1]]);
    }
    gelaendeZustand(S, r, c, Z, [[2, 2, mx - 5, D * 0.4], [hx + 14, gz0, W - 3, gz1], [2, gz1 + 6, W * 0.4, D - 3]]);
    return { hoehe: Hg + 20 };
  }
  // Scheibengasometer
  const cx = W * 0.46, cz = D * 0.46, rad = Math.min(W, D) * 0.3, H = Math.min(72, rad * 4.2), n = 20;
  const koerper = Z === 'aktiv' ? '#7c8984' : Z === 'stillgelegt' ? '#857a6c' : '#8a9894';
  const g0 = new THREE.CylinderGeometry(rad, rad, H, n, 1); g0.rotateY(PI / n); g0.translate(cx, H / 2 + 0.3, cz); S.add(g0, koerper);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * PI, px = cx + Math.cos(a) * rad, pz = cz + Math.sin(a) * rad;
    S.box(0.9, H + 0.6, 0.9, px, H / 2 + 0.6, pz, dunkler(koerper, 0.1), -a);
  }
  for (let y = 12; y < H; y += 12) { const t = new THREE.CylinderGeometry(rad + 0.9, rad + 0.9, 0.35, n, 1, true); t.rotateY(PI / n); t.translate(cx, y, cz); S.add(t, '#4a4f55'); }
  const dk = new THREE.ConeGeometry(rad + 0.3, 4.5, n); dk.rotateY(PI / n); dk.translate(cx, H + 0.3 + 2.25, cz); S.add(dk, dunkler(koerper, 0.06));
  zyl(S, 3.4, 3.4, 2.4, cx, H + 4.5, cz, Z === 'museum' ? '#bcd6dc' : '#6b7178', 10);
  const gel = new THREE.CylinderGeometry(rad + 0.4, rad + 0.4, 1.0, n, 1, true); gel.rotateY(PI / n); gel.translate(cx, H + 0.9, cz); S.add(gel, '#3b3f44');
  // Treppenturm außen
  const ta = PI * 0.25, tx = cx + Math.cos(ta) * (rad + 2.6), tz = cz + Math.sin(ta) * (rad + 2.6);
  gitterturm(S, tx - 1.6, tz - 1.6, tx + 1.6, tz + 1.6, 0.3, H + 1, '#5a6168', 4, 0.35);
  for (let y = 12; y <= H; y += 12) stab(S, [tx, y, tz], [cx + Math.cos(ta) * rad, y, cz + Math.sin(ta) * rad], 0.2, '#5a6168', 4);
  // Ventilhaus, Leitungen
  backsteinHalle(S, scene, p, { x0: 4, z0: D - 18, w: 14, d: 10, H: 6, wand: c.ziegel, orn: c.orn, dach: c.dach, dachH: 2.6, achse: 'x', r, zustand: Z, fenster: { art: 'rund', b: 1.4, h: 2.6, y: 1.6, raster: 3.2 }, glas: c.glas });
  rohrtrasse(S, [[18, D - 13], [cx - rad * 0.7, D - 13], [cx - rad * 0.7, cz + rad * 0.72]], 4, 0.9, '#8a8f94', '#6b7178');
  rohrtrasse(S, [[cx + rad + 1, cz], [W - 2, cz]], 5, 0.8, '#8a8f94', '#6b7178');
  // Banner der Ausstellung auf der sichtbaren Seite
  const side = (p.sicht ?? ['+z'])[0], nrm = { '+z': [0, 1], '+x': [1, 0], '-z': [0, -1], '-x': [-1, 0] }[side];
  const bfx = cx + nrm[0] * (rad + 0.5), bfz = cz + nrm[1] * (rad + 0.5);
  const FB = R(bfx - nrm[1] * 8, bfz + nrm[0] * 8, nrm[1], -nrm[0], 16, side);
  if (Z === 'museum') {
    fb(S, FB, 0, 16, H * 0.22, H * 0.8, -1.2, 0.05, '#1f3a5f');
    ftext(scene, FB, 'Ausstellung', 8, H * 0.68, 0.08, 3.0, 15, '#ffffff');
    ftext(scene, FB, 'Das Revier', 8, H * 0.45, 0.08, 5.0, 15, '#ffd75a');
    boden(S, 2, D - 6, W - 2, D - 2, PFLASTER, 0.3, 0.08); figuren(S, r, 4, D - 6, W - 4, D - 2, 14, 0.38);
    parkplatz(S, r, W * 0.62, D - 22, W - 3, D - 8, { dichte: 0.7 });
    for (const y of [24, 48]) { const t = new THREE.CylinderGeometry(rad + 1.0, rad + 1.0, 0.25, n, 1, true); t.rotateY(PI / n); t.translate(cx, y + 0.4, cz); S.add(t, LICHT_BLAU); }
  } else { zaun(S, 1, D - 2, W - 1, D - 2); fb(S, FB, 1, 15, H * 0.82, H * 0.88, -1.0, 0.05, '#e9e7e1'); }
  gelaendeZustand(S, r, c, Z, [[2, 2, cx - rad - 2, D - 20], [cx + rad + 2, 2, W - 2, cz - 2]]);
  return { hoehe: H + 7 };
}
const ruhrKokerei = slot('slot:ruhr_kokerei', {
  varianten: ['kokerei', 'huette', 'gasometer'], nenn: { kokerei: [104, 64, 130, 90], huette: [96, 72, 120, 96], gasometer: [50, 50, 70, 70] },
  zustaende: ['aktiv', 'stillgelegt', 'museum'], zustandWahl: (r) => { const q = r(); return q < 0.2 ? 'aktiv' : q < 0.5 ? 'stillgelegt' : 'museum'; },
  roh: kokereiRoh,
});

// =====================================================================================
// Ruhr: Halde mit Landmarke
// =====================================================================================
function haldeRoh(S, scene, p) {
  const r = rng(`halde:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  boden(S, 0, 0, W, D, '#a9c48c', 0.3, 0.05);
  const cx = W / 2, cz = D / 2 - 2, rx = W / 2 - 4, rz = D / 2 - 6, H = Math.min(32, Math.min(W, D) * zw(r, 0.38, 0.46));
  const gruen = ['#8fb873', '#86ae6a', '#93bb78', '#7ea664'];
  const st = haldeStufen(S, cx, cz, rx, rz, H, r() < 0.5 ? 3 : 4, gruen, '#d2c6a6', { seg: 11, top: 0.32, berme: 0.05, jitter: 0.08 });
  const yTop = st[st.length - 1].y1, rt = st[st.length - 1].rt;
  // Bewuchs auf den Böschungen
  for (let i = 0; i < 26; i++) {
    const k = i % 3, a = zw(r, 0, 2 * PI), q = haldePunkt(st, cx, cz, rx, rz, k, a, zw(r, 0.15, 0.7));
    (r() < 0.6 ? birke : baumRund)(S, q[0], q[2], r, zw(r, 0.6, 0.95), q[1] - 0.3);
  }
  // Gipfelplateau
  const pl = new THREE.CylinderGeometry(rt * 0.95, rt * 0.95, 0.15, 11); pl.rotateY(0.3); pl.scale(rx, 1, rz); pl.translate(cx, yTop + 0.05, cz); S.add(pl, '#c9bf9f');
  const y = yTop + 0.12;
  let hoch = 0;
  if (v === 'pyramide') {
    // Stahlpyramide auf vier Betonstützen, begehbar
    const b = Math.min(rt * rx, rt * rz) * 1.0, st0 = 7, Hp = 22;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) S.box(1.2, st0, 1.2, cx + dx * b / 2, y + st0 / 2, cz + dz * b / 2, '#cfccc6');
    const spitze = [cx, y + st0 + Hp, cz], c = '#d4d8dc';
    const ecken = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dz]) => [cx + dx * b / 2, y + st0, cz + dz * b / 2]);
    for (const e of ecken) stab(S, e, spitze, 0.32, c, 6);
    for (let i = 0; i < 4; i++) stab(S, ecken[i], ecken[(i + 1) % 4], 0.3, c, 6);
    for (const t of [0.33, 0.62]) {
      const ring = ecken.map((e) => [e[0] + (spitze[0] - e[0]) * t, e[1] + (spitze[1] - e[1]) * t, e[2] + (spitze[2] - e[2]) * t]);
      for (let i = 0; i < 4; i++) { stab(S, ring[i], ring[(i + 1) % 4], 0.22, c, 6); stab(S, ecken[i], ring[(i + 1) % 4], 0.14, c, 4); }
      const s = b * (1 - t) * 0.6;
      S.quader(cx - s / 2, ring[0][1] - 0.15, cz - s / 2, cx + s / 2, ring[0][1], cz + s / 2, '#9aa1a7');
    }
    // Treppen im Inneren
    balken(S, [cx - b * 0.3, y + 0.3, cz + b * 0.1], [cx + b * 0.15, y + st0 + Hp * 0.33, cz + b * 0.1], 1.0, 0.3, '#7d858c');
    balken(S, [cx + b * 0.15, y + st0 + Hp * 0.33, cz - b * 0.1], [cx - b * 0.08, y + st0 + Hp * 0.62, cz - b * 0.1], 0.9, 0.3, '#7d858c');
    hoch = st0 + Hp;
  } else if (v === 'bramme') {
    // Stahlbramme, leicht geneigt
    const g = new THREE.BoxGeometry(4.6, 15, 1.4); g.translate(0, 7.5, 0); g.rotateZ(0.08); g.rotateY(0.5); g.translate(cx, y, cz); S.add(g, '#8a4a2e');
    const g2 = new THREE.BoxGeometry(4.7, 0.3, 1.5); g2.translate(0, 15, 0); g2.rotateZ(0.08); g2.rotateY(0.5); g2.translate(cx, y, cz); S.add(g2, '#6e3b26');
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI; S.box(2.2, 0.5, 0.7, cx + Math.cos(a) * 7, y + 0.25, cz + Math.sin(a) * 7, '#cfccc6', -a); }
    hoch = 15;
  } else if (v === 'treppe') {
    // Himmelsleiter aus unregelmäßigen Betonblöcken, die ins Leere führt
    let px = cx - 7, py = y, pz = cz + 1;
    for (let i = 0; i < 16; i++) {
      const bw = zw(r, 2.2, 3.4), bh = zw(r, 0.8, 1.4), bd = zw(r, 2.6, 4.2);
      S.box(bw, py - y + bh, bd, px, y + (py - y + bh) / 2, pz + zw(r, -0.6, 0.6), waehle(r, ['#cfccc6', '#c4c1bb', '#d8d5ce', '#b9b5ae']));
      px += zw(r, 1.0, 1.4); py += bh * 0.7;
    }
    hoch = py - y + 1;
  } else {
    // Gipfelkreuz der Bergleute und Grubenlampe als Skulptur
    S.box(0.8, 12, 0.8, cx, y + 6, cz, '#6b4a32'); S.box(5, 0.8, 0.8, cx, y + 9, cz, '#6b4a32');
    S.box(2.4, 0.3, 2.4, cx, y + 0.15, cz, '#cfccc6');
    const lx = cx + rt * rx * 0.5, lz = cz + rt * rz * 0.3;
    zyl(S, 1.0, 1.4, 1.2, lx, y, lz, '#3b3f44', 10); zyl(S, 1.1, 1.1, 2.0, lx, y + 1.2, lz, '#f3d36b', 10); zyl(S, 0.5, 1.2, 1.0, lx, y + 3.2, lz, '#3b3f44', 10);
    const hk = new THREE.TorusGeometry(0.7, 0.12, 4, 10, PI); hk.translate(lx, y + 4.2, lz); S.add(hk, '#3b3f44');
    for (const a of [0.4, 2.2, 4.0]) bank(S, cx + Math.cos(a) * rt * rx * 0.6, cz + Math.sin(a) * rt * rz * 0.6, -a + PI / 2, y);
    hoch = 12;
  }
  figuren(S, r, cx - 6, cz - 4, cx + 6, cz + 4, 7, y);
  // Fuß: Wanderparkplatz und Infotafel
  if (D - (cz + rz) > 4) {
    parkplatz(S, r, W * 0.62, cz + rz + 0.5, W - 2, D - 1, { dichte: 0.6, belag: SCHOTTER });
    S.box(2.4, 1.6, 0.2, W * 0.5, 1.8, D - 2.5, '#5b4a3a'); S.box(0.15, 1.2, 0.15, W * 0.5 - 1, 0.9, D - 2.5, '#5b4a3a'); S.box(0.15, 1.2, 0.15, W * 0.5 + 1, 0.9, D - 2.5, '#5b4a3a');
  }
  return { hoehe: H + hoch };
}
const ruhrHalde = slot('slot:ruhr_halde', {
  varianten: ['pyramide', 'bramme', 'treppe', 'kreuz'], nenn: { pyramide: [64, 64, 110, 110], bramme: [56, 56, 110, 110], treppe: [56, 56, 110, 110], kreuz: [56, 56, 110, 110] },
  roh: haldeRoh,
});

// =====================================================================================
// Ruhr: Zechensiedlung, Kreuzgrundriss-Kolonie, Gartenstadt
// =====================================================================================
/** Fachwerk im Giebeldreieck (u0..u1, Fuß y, Höhe h) auf Rahmen F. */
function fachwerkGiebel(S, F, u0, u1, y, h, holz, gefach) {
  const b = u1 - u0, um = (u0 + u1) / 2;
  fpoly(S, F, [[u0 + 0.2, y], [u1 - 0.2, y], [um, y + h - 0.3]], 0, 0.06, gefach);
  fb(S, F, u0, u1, y - 0.12, y + 0.12, 0.06, 0.16, holz);
  const n = Math.max(2, Math.round(b / 1.5));
  for (let i = 1; i < n; i++) {
    const u = u0 + (b * i) / n, hh = h * (1 - Math.abs(u - um) / (b / 2)) - 0.4;
    if (hh > 0.5) fb(S, F, u - 0.09, u + 0.09, y, y + hh, 0.06, 0.15, holz);
  }
  const ym = y + h * 0.45, bm = b * 0.55;
  fb(S, F, um - bm / 2, um + bm / 2, ym - 0.09, ym + 0.09, 0.06, 0.15, holz);
  // Streben (Andreaskreuz-Andeutung) und Ortgang
  const g = (a, c) => { const dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy); const gg = new THREE.BoxGeometry(L, 0.16, 0.1); gg.rotateZ(Math.atan2(dy, dx)); gg.translate((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, 0.12); fgeo(S, F, gg, holz); };
  g([u0 + b * 0.18, y], [u0 + b * 0.36, ym]); g([u1 - b * 0.18, y], [u1 - b * 0.36, ym]);
  g([u0, y], [um, y + h]); g([u1, y], [um, y + h]);
  fb(S, F, um - 0.45, um + 0.45, ym + 0.35, ym + 1.25, 0.06, 0.14, GLAS);
}
/** Kleines Sprossenfenster mit weißem Rahmen, optional Klappläden. */
function siedlFenster(S, F, u, y, fw, fh, o = {}) {
  fb(S, F, u - fw / 2 - 0.12, u + fw / 2 + 0.12, y - 0.12, y + fh + 0.12, 0, 0.05, o.rahmen ?? '#f4f2ec');
  fb(S, F, u - fw / 2, u + fw / 2, y, y + fh, 0, 0.08, o.glas ?? GLAS);
  fb(S, F, u - 0.04, u + 0.04, y, y + fh, 0, 0.11, o.rahmen ?? '#f4f2ec');
  fb(S, F, u - fw / 2, u + fw / 2, y + fh * 0.62, y + fh * 0.62 + 0.07, 0, 0.11, o.rahmen ?? '#f4f2ec');
  fb(S, F, u - fw / 2 - 0.2, u + fw / 2 + 0.2, y - 0.2, y - 0.08, 0, 0.18, o.bank ?? '#cfc8b8');
  if (o.laden) for (const sg of [-1, 1]) fb(S, F, u + sg * (fw / 2 + 0.36) - 0.28, u + sg * (fw / 2 + 0.36) + 0.28, y, y + fh, 0, 0.1, o.laden);
}
function haustuer(S, F, u, b, h, farbe, o = {}) {
  if (o.bogen) fform(S, F, bogenForm(u - b / 2 - 0.2, 0.3, u + b / 2 + 0.2, h + 0.35, 'rund'), -0.02, 0.06, o.laibung ?? '#efe9dc');
  fform(S, F, bogenForm(u - b / 2, 0.3, u + b / 2, h, o.bogen ? 'rund' : null), 0, 0.1, farbe);
  if (!o.bogen) fb(S, F, u - b / 2 - 0.3, u + b / 2 + 0.3, h + 0.15, h + 0.3, 0, 0.8, o.vordach ?? '#5a5f63');
  fb(S, F, u - b / 2 - 0.2, u + b / 2 + 0.2, 0.3, 0.5, 0, 0.7, '#bdb8ad');
}
/**
 * Siedlerhaus (Doppelhaus oder Reihenhausgruppe). o: { x0, z0, w, d, eh, dachH, first ('x' traufständig | 'z' giebelständig),
 * wand, oben (Wand OG/Giebel), dach, holz, fachwerk, einheiten, laeden, tuerF, gauben, tuerBogen }
 */
function siedlerHaus(S, scene, p, r, o) {
  const { x0, z0, w, d, eh } = o, H = eh;
  S.quader(x0, 0, z0, x0 + w, H, z0 + d, o.wand);
  S.quader(x0 - 0.06, 0, z0 - 0.06, x0 + w + 0.06, 0.7, z0 + d + 0.06, o.sockel ?? dunkler(o.wand, 0.12));
  if (o.band) S.quader(x0 - 0.08, H - 0.35, z0 - 0.08, x0 + w + 0.08, H - 0.15, z0 + d + 0.08, o.band);
  const n = o.einheiten ?? 2;
  for (const F of sichtbar(p, x0, z0, w, d)) {
    const traufe = o.first === 'x' ? F.s[1] === 'z' : F.s[1] === 'x';
    const vorne = F.s === '+z';
    const eb = F.L / n;
    for (let e = 0; e < n; e++) {
      const a = e * eb, spiegel = e % 2 === 1;
      if (vorne || (F.s === '-z' && o.hinten)) {
        const tu = spiegel ? a + eb - 1.1 : a + 1.1;
        haustuer(S, F, tu, 1.0, 2.4, o.tuerF ?? '#3f6b4f', { bogen: o.tuerBogen, laibung: o.band });
        const fu = spiegel ? a + eb * 0.38 : a + eb * 0.62;
        siedlFenster(S, F, fu, 1.2, 1.2, 1.4, { laden: o.laeden });
        if (eb > 6) siedlFenster(S, F, spiegel ? a + eb * 0.12 + 0.6 : a + eb * 0.88 - 0.6, 1.2, 1.0, 1.4, { laden: o.laeden });
      } else {
        const m = eb > 5 ? 2 : 1;
        for (let k = 0; k < m; k++) siedlFenster(S, F, a + (eb * (k + 0.5)) / m, 1.2, 1.0, 1.3, { laden: o.laeden });
      }
      if (traufe && o.og) for (let k = 0; k < 2; k++) siedlFenster(S, F, a + (eb * (k + 0.5)) / 2, H - 1.75, 0.9, 1.1, { laden: o.laeden });
    }
    // Giebel
    if (!traufe) {
      const T = F.L;
      if (o.fachwerk) fachwerkGiebel(S, F, 0, T, H, o.dachH * (1 - 0.9 / (T + 0.9)), o.holz ?? '#5a3a2a', o.gefach ?? '#f1ebdc');
      else {
        fpoly(S, F, [[0, H], [T, H], [T / 2, H + o.dachH * (1 - 0.9 / (T + 0.9))]], -0.3, 0.02, o.oben ?? o.wand);
        siedlFenster(S, F, T / 2, H + 0.5, 0.9, 1.1, { laden: o.laeden });
        if (o.band) fb(S, F, -0.05, T + 0.05, H - 0.02, H + 0.12, 0, 0.12, o.band);
      }
    }
  }
  const T = o.first === 'x' ? d : w;
  const g = dachProfil((o.first === 'x' ? w : d) + 0.9, T + 0.9, o.dachH, 0.2, o.first);
  g.translate(x0 + w / 2, H, z0 + d / 2); S.add(g, o.dach);
  // Schornsteine auf dem First, Gauben zur Straße
  for (let e = 0; e < n; e++) {
    const cx = o.first === 'x' ? x0 + (w * (e + 0.5)) / n + (e % 2 ? -1.2 : 1.2) : x0 + w / 2 + 0.6;
    const cz = o.first === 'x' ? z0 + d / 2 + 0.6 : z0 + (d * (e + 0.5)) / n;
    S.box(0.7, 1.8, 0.7, cx, H + o.dachH + 0.2, cz, o.schornstein ?? '#8f4a37');
    S.box(0.86, 0.15, 0.86, cx, H + o.dachH + 1.15, cz, '#5a5f63');
  }
  if (o.gauben && o.first === 'x') {
    for (let e = 0; e < n; e++) {
      const gx = x0 + (w * (e + 0.5)) / n, gz = z0 + d - (d / 2) * 0.45, gh = o.dachH * 0.45;
      S.quader(gx - 1.1, H + gh * 0.3, gz - 1.2, gx + 1.1, H + gh * 1.25, gz + 0.3, o.oben ?? o.wand);
      S.quader(gx - 0.7, H + gh * 0.45, gz + 0.3, gx + 0.7, H + gh * 1.1, gz + 0.34, GLAS);
      const gd = dachProfil(1.8, 2.6, 0.7, 0.1, 'z'); gd.translate(gx, H + gh * 1.25, gz - 0.4); S.add(gd, o.dach);
    }
  }
  return H + o.dachH;
}
function stall(S, x0, z0, w, d, c, dach, tauben) {
  S.quader(x0, 0.3, z0, x0 + w, 2.6, z0 + d, c);
  const g = new THREE.BoxGeometry(w + 0.4, 0.15, d + 0.5); g.rotateX(-0.18); g.translate(x0 + w / 2, 2.9, z0 + d / 2); S.add(g, dach);
  S.quader(x0 + w * 0.3, 0.3, z0 + d - 0.02, x0 + w * 0.3 + 0.9, 2.1, z0 + d + 0.04, '#6b4a32');
  if (tauben) {
    // Taubenschlag auf dem Stall: Brieftauben gehören zur Kolonie
    S.quader(x0 + 0.4, 3.0, z0 + 0.4, x0 + 2.4, 4.4, z0 + 2.2, '#efe9dc');
    const t = dachProfil(2.4, 2.2, 0.8, 0.1, 'x'); t.translate(x0 + 1.4, 4.4, z0 + 1.3); S.add(t, '#3b3f44');
    for (let i = 0; i < 3; i++) S.quader(x0 + 0.6 + i * 0.6, 3.4, z0 + 2.2, x0 + 0.9 + i * 0.6, 3.8, z0 + 2.24, '#2f3438');
    S.quader(x0 + 0.4, 3.3, z0 + 2.2, x0 + 2.4, 3.36, z0 + 2.7, '#8a6a4a');
  }
}
/** Nutzgarten mit Beeten, Obstbaum, Wäschespinne, Zaun. */
function nutzgarten(S, r, x0, z0, x1, z1, o = {}) {
  boden(S, x0, z0, x1, z1, RASEN2, 0.3, 0.06);
  const bz0 = z0 + (z1 - z0) * 0.25, bz1 = z0 + (z1 - z0) * 0.65;
  if (o.beete !== false && x1 - x0 > 3) for (let x = x0 + 0.8; x < x1 - 1.2; x += 1.1) S.quader(x, 0.36, bz0, x + 0.7, 0.5, bz1, (Math.floor(x) % 3) ? '#7d9a52' : '#8a6e50');
  if (r() < 0.7) baumRund(S, zw(r, x0 + 1.5, x1 - 1.5), z0 + (z1 - z0) * 0.82, r, 0.65);
  if (r() < 0.5) { const wx = zw(r, x0 + 1.5, x1 - 1.5), wz = z0 + (z1 - z0) * 0.12; S.box(0.08, 1.8, 0.08, wx, 1.2, wz, '#9aa1a7'); S.box(2, 0.05, 0.05, wx, 2.0, wz, '#9aa1a7'); S.box(0.05, 0.05, 2, wx, 2.0, wz, '#9aa1a7'); S.box(0.6, 0.5, 0.03, wx + 0.5, 1.75, wz, waehle(r, ['#f4f3ef', '#7f9fba', '#e9c46a'])); }
  if (o.zaun !== false) S.quader(x1 - 0.04, 0.3, z0, x1 + 0.04, 1.1, z1, '#8a7a62');
}
const SIEDL_FARBEN = {
  backstein: () => ({ wand: waehle(rng(1), BACKSTEIN), oben: '#efe6d2', dach: waehle(rng(2), ['#4f565c', '#5a5450', '#a9523c']) }),
};
function siedlungRoh(S, scene, p) {
  const r = rng(`sied:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  boden(S, 0, 0, W, D, RASEN, 0.3, 0.05);
  // Wohnweg vorn (Gehweg) mit Bäumen
  boden(S, 0, D - 3.2, W, D, PFLASTER, 0.3, 0.08);
  const front = D - 3.2, vorg = v === 'gartenstadt' ? 5 : 4.2;
  let H = 9;
  if (v === 'kreuz') {
    // Kolonie mit Kreuzgrundriss: vier Wohnungen je Haus, Gärten in den Ecken
    const n = Math.max(1, Math.floor((W - 4) / 26)), bw = (W - 4) / n;
    for (let i = 0; i < n; i++) {
      const cx = 2 + bw * (i + 0.5), cz = Math.min(front - vorg - 8, D * 0.55);
      const c = { wand: waehle(r, BACKSTEIN), dach: waehle(r, ['#4f565c', '#5a5450', '#a9523c', '#4a5258']) };
      const fw = waehle(r, [true, false]);
      const arm = { eh: 3.3, dachH: 4.2, wand: c.wand, dach: c.dach, fachwerk: fw, holz: '#4a3326', gefach: '#efe7d6', band: '#e3dccb', einheiten: 2, tuerF: waehle(r, ['#3f6b4f', '#7a2f2f', '#2f4f6f']) };
      H = siedlerHaus(S, scene, p, r, { ...arm, x0: cx - 10, z0: cz - 3.5, w: 20, d: 7, first: 'x' });
      siedlerHaus(S, scene, p, r, { ...arm, x0: cx - 3.5, z0: cz - 10, w: 7, d: 20, first: 'z', einheiten: 2 });
      // vier Eckgärten mit Ställen
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const gx0 = sx < 0 ? cx - bw / 2 + 1 : cx + 4, gx1 = sx < 0 ? cx - 4 : cx + bw / 2 - 1;
        const gz0 = sz < 0 ? Math.max(1, cz - 16) : cz + 4, gz1 = sz < 0 ? cz - 4 : front - 0.5;
        if (gx1 - gx0 > 3 && gz1 - gz0 > 3) {
          nutzgarten(S, r, gx0, gz0, gx1, gz1, { zaun: sx < 0 });
          if (sz < 0) stall(S, sx < 0 ? gx0 + 0.5 : gx1 - 4.5, gz0 + 0.5, 4, 3, c.wand, '#4f565c', r() < 0.4);
          hecke(S, gx0, gz1 - 0.6, gx1, gz1, 0.9);
        }
      }
    }
  } else if (v === 'gartenstadt') {
    // Gartenstadt: Putzhäuser in Gruppen, Klappläden, steile Dächer, Torhaus in der Mitte
    const putz = ['#efe4cc', '#ece0c4', '#f2ead8', '#e8d9b8', '#e9e2d2'];
    const laden = waehle(r, ['#3f6b4f', '#2f5f6f', '#6b2f2f']);
    let x = 2; const gruppen = [];
    while (x < W - 14) { const ein = Math.min(waehle(r, [2, 3, 4]), Math.floor((W - 2 - x) / 6.5)); if (ein < 2) break; gruppen.push([x, ein * 6.5]); x += ein * 6.5 + 2.4; }
    const mitte = Math.floor(gruppen.length / 2);
    gruppen.forEach(([gx, gw], gi) => {
      const zv = front - vorg - (gi % 2 ? 1.2 : 0), hd = 9;
      const c = { wand: waehle(r, putz), dach: waehle(r, ['#a9523c', '#9a4a37', '#b4583f']) };
      H = siedlerHaus(S, scene, p, r, { x0: gx, z0: zv - hd, w: gw, d: hd, eh: 3.4, dachH: 6.2, first: 'x', wand: c.wand, oben: c.wand, dach: c.dach, laeden: laden,
        einheiten: Math.round(gw / 6.5), tuerF: laden, tuerBogen: true, band: '#f6f1e6', gauben: true, sockel: '#b9ab92', schornstein: '#a9523c' });
      if (gi === mitte) {
        // Torbogen-Durchgang zwischen zwei Gruppen
        const tx = gx + gw;
        S.quader(tx, 3.2, zv - hd + 1.5, tx + 2.4, 6.6, zv - 1.5, c.wand);
        for (const F of sichtbar(p, tx, zv - hd + 1.5, 2.4, hd - 3)) if (F.s === '+z') fform(S, F, bogenForm(0.2, 0.3, 2.2, 3.4, 'rund'), -0.1, 0.05, '#e3dccb');
        const td = dachProfil(2.8, hd - 2.4, 2.2, 0.2, 'z'); td.translate(tx + 1.2, 6.6, zv - hd / 2); S.add(td, c.dach);
      }
      for (let k = 0; k < Math.round(gw / 6.5); k++) {
        const ux = gx + k * 6.5;
        boden(S, ux + 2.2, zv, ux + 3.2, front, WEG, 0.3, 0.09);
        hecke(S, ux + 0.1, front - 0.9, ux + 2.1, front - 0.2, 0.9); hecke(S, ux + 3.3, front - 0.9, ux + 6.4, front - 0.2, 0.9);
        nutzgarten(S, r, ux + 0.1, 1, ux + 6.4, zv - hd - 0.5, { beete: r() < 0.6 });
        if (r() < 0.35) busch(S, ux + 4.6, zv + 1.6, r, 0.9);
      }
    });
    for (let xx = 6; xx < W - 4; xx += zw(r, 9, 13)) baumRund(S, xx, D - 1.6, r, 1.05);
  } else {
    // Zechenkolonie: Doppelhäuser, unten Backstein, Giebel mit Fachwerk oder Putz, Ställe und lange Gärten
    const n = Math.max(1, Math.floor((W - 2) / 17)), bw = (W - 2) / n;
    const giebel = r() < 0.6;
    for (let i = 0; i < n; i++) {
      const hw = Math.min(13, bw - 4), hx = 1 + bw * i + (bw - hw) / 2, hd = 8.5, hz = front - vorg - hd;
      const ziegel = waehle(r, BACKSTEIN), putzOben = r() < 0.35;
      const c = { wand: putzOben ? waehle(r, ['#e9e0cc', '#efe6d2']) : ziegel, dach: waehle(r, ['#4f565c', '#5a5450', '#4a5258', '#a9523c']) };
      const first = giebel ? 'z' : 'x';
      H = siedlerHaus(S, scene, p, r, { x0: hx, z0: hz, w: hw, d: hd, eh: 3.3, dachH: giebel ? 5.2 : 4.4, first, wand: c.wand, dach: c.dach, sockel: putzOben ? ziegel : undefined,
        fachwerk: giebel && r() < 0.7, holz: waehle(r, ['#4a3326', '#5a3a2a', '#3b2e26']), gefach: '#f1ebdc', band: putzOben ? '#d9cfb8' : '#e3dccb', gauben: !giebel, einheiten: 2,
        tuerF: waehle(r, ['#3f6b4f', '#7a2f2f', '#2f4f6f', '#6b4a32']), schornstein: ziegel });
      // Anbau (Waschküche) seitlich
      S.quader(hx - 2.6, 0, hz + 1, hx, 2.8, hz + 5, ziegel);
      const ab = new THREE.BoxGeometry(3.0, 0.15, 4.4); ab.rotateZ(0.2); ab.translate(hx - 1.3, 3.0, hz + 3); S.add(ab, c.dach);
      // Vorgärten mit Weg und Zaun
      for (const [a, b] of [[1 + bw * i + 0.3, hx + hw / 2 - 0.2], [hx + hw / 2 + 0.2, 1 + bw * (i + 1) - 0.3]]) {
        boden(S, a, hz + hd, b, front, RASEN2, 0.3, 0.07);
        S.quader(a, 0.3, front - 0.3, b, 1.0, front - 0.2, '#f1efe9');
      }
      boden(S, hx + 0.6, hz + hd, hx + 1.6, front, WEG, 0.3, 0.09); boden(S, hx + hw - 1.6, hz + hd, hx + hw - 0.6, front, WEG, 0.3, 0.09);
      // Gärten hinten, Ställe
      for (const [a, b, sg] of [[1 + bw * i + 0.3, hx + hw / 2, 0], [hx + hw / 2, 1 + bw * (i + 1) - 0.3, 1]]) {
        if (hz - 1 > 6) {
          nutzgarten(S, r, a, 0.5, b, hz - 0.5, { zaun: sg === 0 });
          stall(S, sg ? b - 4.2 : a + 0.4, Math.max(0.8, hz - 6.5), 3.8, 3, ziegel, '#4f565c', r() < 0.3);
        }
      }
      if (r() < 0.6) baumRund(S, 1 + bw * (i + 0.5) + zw(r, -2, 2), D - 1.6, r, 1.0);
    }
  }
  figuren(S, r, 2, D - 3, W - 2, D - 0.5, Math.round(W / 18), 0.38);
  if (W > 40) { westAuto(S, W * 0.3, D - 1.6, 0, 'kombi', waehle(r, AUTOFARBEN), 0.38); }
  return { hoehe: H };
}
const ruhrSiedlung = slot('slot:ruhr_siedlung', {
  varianten: ['kolonie', 'kreuz', 'gartenstadt'], nenn: { kolonie: [34, 30], kreuz: [28, 36], gartenstadt: [30, 26] },
  roh: siedlungRoh,
});

// =====================================================================================
// Gemeinsame Bausteine für Geschäftshäuser
// =====================================================================================
const LAEDEN_RUHR = ['Optik Brinkmann', 'Elektro Kämper', 'Textilhaus Wienand', 'Juwelier Bütefür', 'Café Overbeck', 'Musikhaus Löbbecke', 'Reformhaus Wiethoff',
  'Drogerie Schlüter', 'Spielwaren Kemper', 'Schuhhaus Hülsmann', 'Bäckerei Tenbrink', 'Lederwaren Pöppinghaus', 'Foto Klöckner', 'Uhren Buschmann', 'Modehaus Lohmann',
  'Buchhandlung Overhoff', 'Eiscafé Venezia', 'Handarbeiten Dreckmann', 'Reisebüro Sonnenland', 'Radio Tewes', 'Tabakwaren Schulte', 'Wäsche Böckmann'];
const BLENDEN = ['#c9483e', '#2f5f8f', '#3f7d56', '#e0b23a', '#2b2f33', '#f4f2ec', '#8c3b3b', '#d97a3a', '#1f3a5f', '#6b4f8f'];
function mischListe(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/** Ladenfront der 60er/70er: Schaufenster, Tür, Vordach über dem Laden, Werbeblende darüber. */
function ladenFront(S, scene, F, u0, u1, egH, o = {}) {
  const rahmen = o.rahmen ?? '#c9cdd0', blende = o.blende ?? '#c9483e', tief = o.tief ?? -0.35, yV = egH - 1.15;
  fb(S, F, u0, u1, 0.3, yV, tief - 0.1, tief, o.glas ?? '#6a8494');
  fb(S, F, u0, u1, 0.3, 0.75, tief, tief + 0.1, o.sockel ?? '#3b3f44');
  const n = Math.max(1, Math.round((u1 - u0) / 2.6)), du = (u1 - u0) / n;
  for (let i = 0; i <= n; i++) fb(S, F, u0 + i * du - 0.08, u0 + i * du + 0.08, 0.3, yV, tief, tief + 0.14, rahmen);
  const tu = o.tuer ?? u0 + du * 0.5;
  fb(S, F, tu - 0.75, tu + 0.75, 0.3, 2.5, tief + 0.05, tief + 0.16, '#3c4852');
  if (o.auslage) { const rr = o.auslage; for (let i = 0; i < n; i++) { if (Math.abs(u0 + (i + 0.5) * du - tu) < 0.9) continue; for (let k = 0; k < 2; k++) fb(S, F, u0 + i * du + 0.4, u0 + (i + 1) * du - 0.4, 0.9 + k * 0.75, 1.25 + k * 0.75, tief - 0.5, tief - 0.12, waehle(rr, ['#e9c46a', '#c9483e', '#7f9fba', '#f4f3ef', '#3f7d56', '#d97a3a'])); } }
  if (o.vordach !== false) {
    const vd = o.vordach ?? 1.9;
    fb(S, F, u0 - 0.05, u1 + 0.05, yV, yV + 0.28, 0, vd, o.vordachF ?? '#e9e7e1');
    fb(S, F, u0 - 0.05, u1 + 0.05, yV - 0.04, yV + 0.32, vd - 0.1, vd + 0.02, o.vordachKante ?? blende);
  }
  fb(S, F, u0 + 0.1, u1 - 0.1, yV + 0.36, egH - 0.05, 0, 0.16, blende);
  if (o.name) ftext(scene, F, o.name, (u0 + u1) / 2, (yV + 0.36 + egH - 0.05) / 2, 0.18, 0.6, (u1 - u0) * 0.86, o.schrift ?? (blende === '#f4f2ec' || blende === '#e0b23a' ? '#2b2f33' : '#ffffff'));
}
/**
 * Geschäftshausfassade über dem Erdgeschoss. typ: 'waschbeton' | 'mosaik' | 'kunststoff' | 'raster' | 'waben' | 'band'
 */
function obergeschosse(S, F, typ, y0, n, gh, c, r) {
  const L = F.L, H = y0 + n * gh;
  if (typ === 'waschbeton' || typ === 'band') {
    for (let k = 0; k < n; k++) {
      const y = y0 + k * gh;
      fb(S, F, -0.05, L + 0.05, y, y + 1.05, 0, 0.28, k % 2 && typ === 'band' ? dunkler(c.panel, 0.03) : c.panel);
      fb(S, F, 0, L, y + 1.05, y + gh, -0.25, -0.12, c.glas);
      for (let u = 0.6; u < L - 0.3; u += 1.3) fb(S, F, u - 0.05, u + 0.05, y + 1.05, y + gh, -0.25, -0.05, c.sprosse);
      if (typ === 'waschbeton') fb(S, F, -0.05, L + 0.05, y + 1.0, y + 1.08, 0, 0.32, dunkler(c.panel, 0.08));
    }
  } else if (typ === 'mosaik') {
    const ra = 2.6, na = Math.max(1, Math.floor(L / ra)), off = (L - na * ra) / 2;
    fb(S, F, 0, L, y0, H, -0.2, 0.02, c.panel);
    for (let k = 0; k < n; k++) {
      const y = y0 + k * gh;
      for (let i = 0; i < na; i++) {
        const u = off + i * ra;
        // Brüstung aus Glasmosaik in Feldern
        for (let j = 0; j < 3; j++) fb(S, F, u + 0.15 + j * ((ra - 0.3) / 3), u + 0.15 + (j + 1) * ((ra - 0.3) / 3) - 0.04, y + 0.15, y + 1.05, 0, 0.1, c.mosaik[(i + j + k * 2) % c.mosaik.length]);
        fb(S, F, u + 0.25, u + ra - 0.25, y + 1.25, y + gh - 0.3, 0, 0.06, c.glas);
        fb(S, F, u + ra / 2 - 0.05, u + ra / 2 + 0.05, y + 1.25, y + gh - 0.3, 0, 0.1, c.sprosse);
      }
    }
  } else if (typ === 'kunststoff') {
    const ra = 1.8, na = Math.max(1, Math.floor(L / ra)), off = (L - na * ra) / 2;
    for (let k = 0; k < n; k++) {
      const y = y0 + k * gh;
      for (let i = 0; i < na; i++) {
        const u = off + i * ra;
        fb(S, F, u + 0.04, u + ra - 0.04, y + 0.04, y + gh - 0.04, 0, 0.18, (i + k) % 3 === 0 ? c.akzent : c.panel);
        const s = new THREE.Shape(), a = u + 0.35, b = u + ra - 0.35, v0 = y + 0.9, v1 = y + gh - 0.5, rr = 0.32;
        s.moveTo(a + rr, v0); s.lineTo(b - rr, v0); s.quadraticCurveTo(b, v0, b, v0 + rr); s.lineTo(b, v1 - rr); s.quadraticCurveTo(b, v1, b - rr, v1);
        s.lineTo(a + rr, v1); s.quadraticCurveTo(a, v1, a, v1 - rr); s.lineTo(a, v0 + rr); s.quadraticCurveTo(a, v0, a + rr, v0);
        fform(S, F, s, 0.1, 0.22, c.glas, 3);
      }
    }
  } else if (typ === 'raster') {
    fb(S, F, 0, L, y0, H, -0.35, -0.2, c.glas);
    for (let k = 0; k <= n; k++) fb(S, F, -0.05, L + 0.05, y0 + k * gh - 0.18, y0 + k * gh + 0.18, -0.2, 0.15, c.panel);
    for (let k = 0; k < n; k++) fb(S, F, 0, L, y0 + k * gh + 0.18, y0 + k * gh + 0.95, -0.25, -0.1, c.bruestung ?? dunkler(c.glas, 0.04));
    for (let u = 0; u <= L + 0.01; u += 1.5) fb(S, F, u - 0.1, u + 0.1, y0, H, -0.2, 0.45, c.lisene ?? c.panel);
  } else if (typ === 'waben') {
    // geschlossene Kaufhausfassade mit Rautenkacheln
    fb(S, F, -0.05, L + 0.05, y0, H, -0.1, 0.05, c.panel);
    const s = 1.6, nu = Math.floor(L / s), nv = Math.floor((H - y0 - 0.6) / s), ou = (L - nu * s) / 2, ov = y0 + 0.3 + (H - y0 - 0.6 - nv * s) / 2;
    for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) {
      const cu = ou + (i + 0.5) * s, cv = ov + (k + 0.5) * s, h = s * 0.46;
      fpoly(S, F, [[cu, cv - h], [cu + h, cv], [cu, cv + h], [cu - h, cv]], 0.05, 0.3, (i + k) % 2 ? c.wabe : dunkler(c.wabe, 0.07));
    }
  }
  return H;
}
/** Geschäftshaus: EG Laden(e), Obergeschosse nach Typ, Flachdach mit Attika, optional Dachreklame. */
function geschaeftshaus(S, scene, p, r, o) {
  const { x0, z0, w, d, n } = o, gh = o.gh ?? 3.1, egH = o.egH ?? 4.4;
  const H = egH + n * gh;
  S.quader(x0, 0, z0, x0 + w, H, z0 + d, o.koerper ?? dunkler(o.c.panel, 0.25));
  for (const F of sichtbar(p, x0, z0, w, d)) {
    const vorne = F.s === '+z';
    obergeschosse(S, F, F.L < 8 && o.typ === 'waben' ? 'waschbeton' : o.typ, egH, n, gh, o.c, r);
    if (vorne) {
      const laeden = o.laeden ?? [{ u0: 0.3, u1: w - 0.3, name: o.name, blende: o.blende }];
      for (const l of laeden) ladenFront(S, scene, F, l.u0, l.u1, egH, { name: l.name, blende: l.blende, vordach: o.vordach, auslage: r, rahmen: o.ladenRahmen });
      fb(S, F, -0.02, F.L + 0.02, egH + 0.25, egH + 0.5, 0, 0.3, o.c.panel);
    } else {
      fb(S, F, 0, F.L, 0.3, egH, -0.05, 0.05, o.c.sockel ?? '#bdb8ad');
      if (F.L > 6 && o.seitenLaden) ladenFront(S, scene, F, 0.4, Math.min(F.L - 0.4, 9), egH, { name: o.seitenLaden, blende: o.blende, vordach: 1.4 });
    }
  }
  flachdach(S, x0, z0, w, d, H, o.c.attika ?? '#d9dcdf', '#a9adb0', '#9e9b94', 0.7);
  // Dachaufbauten: Technik, Aufzug
  S.quader(x0 + w * 0.6, H, z0 + d * 0.2, x0 + w * 0.6 + Math.min(5, w * 0.3), H + 2.4, z0 + d * 0.2 + 3.6, '#c9c6bf');
  if (o.dachReklame) {
    const F = seitenRahmen(x0, z0, w, d)['+z'];
    const rb = Math.min(w * 0.8, 16);
    for (const u of [w / 2 - rb / 2 + 0.5, w / 2 + rb / 2 - 0.5]) fb(S, F, u - 0.1, u + 0.1, H, H + 3.4, -2.2, -2.0, '#5a6168');
    fb(S, F, w / 2 - rb / 2, w / 2 + rb / 2, H + 1.2, H + 3.6, -2.25, -1.95, o.dachReklameF ?? '#f4f2ec');
    if (istSicht(p, '+z')) ftext(scene, F, o.dachReklame, w / 2, H + 2.4, -1.93, 1.6, rb - 0.6, o.dachReklameT ?? '#d23c32');
    if (istSicht(p, '-z')) ftext(scene, R(x0 + w, z0 + d - 2.27, -1, 0, w, '-z'), o.dachReklame, w / 2, H + 2.4, 0.0, 1.6, rb - 0.6, o.dachReklameT ?? '#d23c32');
  }
  return H;
}
/** Fußgängerzone der 70er: Verbundpflaster, Pflanzkübel, Bänke, Kugelleuchten, Spielplastik, Brunnen, Litfaßsäule. */
function fussgaengerzone(S, scene, r, x0, z0, x1, z1, o = {}) {
  boden(S, x0, z0, x1, z1, '#cdbfae', 0.3, 0.08);
  for (let x = x0 + 4; x < x1 - 1; x += 8) S.quader(x - 0.3, 0.38, z0, x + 0.3, 0.39, z1, '#a8968a');
  S.quader(x0, 0.38, (z0 + z1) / 2 - 0.4, x1, 0.39, (z0 + z1) / 2 + 0.4, '#b6a596');
  const y = 0.38, L = x1 - x0, zm = (z0 + z1) / 2;
  const stationen = Math.max(1, Math.floor(L / 16));
  for (let i = 0; i < stationen; i++) {
    const cx = x0 + (L * (i + 0.5)) / stationen, art = (i + (o.salz ?? 0)) % 4;
    if (art === 0) { pflanzkuebel(S, cx - 2.4, zm, r, y); pflanzkuebel(S, cx + 2.4, zm, r, y, 'quadrat'); bank(S, cx, zm + 1.6, 0, y); laterne(S, cx, zm - 1.4, 4.2, y, 'kugel'); }
    else if (art === 1) {
      // Spielplastik: Betonschnecke und bunte Kletterbögen
      for (let k = 0; k < 5; k++) { const a = k * 1.1, rr = 2.2 - k * 0.35; S.box(1.0, 0.5 + k * 0.4, 1.0, cx + Math.cos(a) * rr, y + (0.5 + k * 0.4) / 2, zm + Math.sin(a) * rr, '#d4cfc4', -a); }
      for (let k = 0; k < 3; k++) { const t = new THREE.TorusGeometry(1.0, 0.12, 4, 10, PI); t.translate(cx + 3.4 + k * 0.8, y, zm); S.add(t, ['#c9483e', '#e0b23a', '#2f6f8f'][k]); }
    } else if (art === 2) {
      // Waschbetonbrunnen aus gestapelten Würfeln
      S.quader(cx - 2.6, y, zm - 2.0, cx + 2.6, y + 0.6, zm + 2.0, '#c4b9a6');
      S.quader(cx - 2.2, y + 0.1, zm - 1.6, cx + 2.2, y + 0.62, zm + 1.6, FARBEN.wasser);
      for (const [dx, dz, h] of [[-0.8, -0.4, 1.8], [0.6, 0.3, 1.2], [0.1, -0.6, 2.4]]) S.box(1.0, h, 1.0, cx + dx, y + h / 2, zm + dz, '#c4b9a6');
      zyl(S, 0.05, 0.15, 1.2, cx + 0.1, y + 2.4, zm - 0.6, '#e3f3f5', 5);
    } else {
      // Litfaßsäule, Telefonzelle, Fahrradständer
      zyl(S, 0.7, 0.7, 2.8, cx - 2, y, zm, '#e9e4d6', 10);
      for (let k = 0; k < 3; k++) zyl(S, 0.72, 0.72, 0.7, cx - 2, y + 0.4 + k * 0.8, zm, waehle(r, ['#c9483e', '#2f5f8f', '#e0b23a', '#3f7d56', '#f4f2ec']), 10, true);
      const kp = new THREE.SphereGeometry(0.8, 10, 4, 0, 2 * PI, 0, PI / 2); kp.translate(cx - 2, y + 2.8, zm); S.add(kp, '#3f6b4f');
      S.box(1.1, 2.3, 1.1, cx + 1, y + 1.15, zm, '#f2c62e'); S.box(0.95, 1.3, 1.12, cx + 1, y + 1.3, zm, '#5f7787');
      for (let k = 0; k < 5; k++) S.box(0.06, 0.7, 1.4, cx + 3 + k * 0.6, y + 0.4, zm, '#59636b');
    }
  }
  for (let x = x0 + 8; x < x1 - 2; x += 16) { baumRund(S, x, z0 + 1.8, r, 0.9, y); }
  figuren(S, r, x0 + 1, z0 + 0.5, x1 - 1, z1 - 0.5, Math.round(L * (z1 - z0) / 28), y);
}

// =====================================================================================
// Ruhr: Innenstadt der 60er/70er
// =====================================================================================
function wbFarben(r, typ) {
  const glas = waehle(r, ['#4e5c67', '#56636e', '#4b5560']);
  if (typ === 'waschbeton') return { panel: waehle(r, ['#cfc4b0', '#c9bfab', '#d6cdbb', '#c2b7a2']), glas, sprosse: '#d4d6d8', attika: '#d6cdbb' };
  if (typ === 'mosaik') return { panel: '#e9e5dc', glas, sprosse: '#e9e5dc', mosaik: waehle(r, [['#2f6f8f', '#4f9fc9', '#e9e5dc', '#1f4f6f'], ['#3f7d56', '#9cc46e', '#e9e5dc', '#2f5f3f'], ['#d9a23a', '#c9483e', '#efe6d2', '#7a4a3a'], ['#4a7f9f', '#e9e5dc', '#2f3f5f', '#8fb8cf']]) };
  if (typ === 'kunststoff') { const a = waehle(r, ['#d97a3a', '#c9483e', '#e0b23a', '#6b4f3a', '#3f7d56']); return { panel: waehle(r, ['#efe6d2', '#e9e2d0', '#f2ede2']), akzent: a, glas, sprosse: '#e9e5dc' }; }
  if (typ === 'raster') return { panel: waehle(r, ['#e2e0da', '#d9d6cf', '#c8ccd0']), glas: waehle(r, ['#4e6a78', '#5d7480', '#4b5f6a']), sprosse: '#d4d6d8', bruestung: waehle(r, ['#6f8e94', '#8a9aa2', '#5f7a86']) };
  if (typ === 'waben') return { panel: '#e7e2d6', wabe: waehle(r, ['#e9e4d8', '#dcd6c8', '#cfd4d8']), glas, sprosse: '#d4d6d8', attika: '#e7e2d6' };
  return { panel: '#d9d4c8', glas, sprosse: '#d4d6d8' };
}
function innenstadtRoh(S, scene, p) {
  const r = rng(`inn:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  const fz = Math.min(11, Math.max(7, D * 0.32)), bz1 = D - fz, bd = bz1 - 1;
  boden(S, 0, 0, W, bz1, '#9e9b94', 0.3, 0.05);
  const namen = mischListe(LAEDEN_RUHR, r);
  let H = 0;
  if (v === 'kaufhaus') {
    const kw = Math.max(30, W * 0.62), kx = (W - kw) * (r() < 0.5 ? 0.15 : 0.85);
    const kname = p.name ?? waehle(r, ['Kaufhaus Overkamp', 'Kaufhaus Brüning', 'Kaufhaus Tiemann']);
    const c = wbFarben(r, 'waben');
    H = geschaeftshaus(S, scene, p, r, { x0: kx, z0: 1, w: kw, d: bd, n: 4, gh: 3.6, egH: 5.2, typ: 'waben', c, vordach: 3.2,
      laeden: [{ u0: 0.3, u1: kw - 0.3, name: '', blende: '#c9483e' }], koerper: '#d6d1c4', seitenLaden: 'Lebensmittel' });
    if (istSicht(p, '+z')) {
      const F = seitenRahmen(kx, 1, kw, bd)['+z'];
      fb(S, F, kw * 0.12, kw * 0.88, 5.2 + 4 * 3.6 - 4.6, 5.2 + 4 * 3.6 - 0.8, 0.22, 0.45, '#f4f2ec');
      ftext(scene, F, kname, kw / 2, 5.2 + 4 * 3.6 - 2.7, 0.47, 2.8, kw * 0.72, '#c9483e');
      ftext(scene, F, 'Alles unter einem Dach', kw / 2, 4.65, 0.16, 0.6, kw * 0.5, '#ffffff');
    }
    // Nachbarn
    const rest = [[0, kx - 0.2], [kx + kw + 0.2, W]].filter(([a, b]) => b - a > 7);
    rest.forEach(([a, b], i) => {
      const typ = waehle(r, ['waschbeton', 'mosaik', 'kunststoff']);
      geschaeftshaus(S, scene, p, r, { x0: a + 0.2, z0: 1 + bd * 0.3, w: b - a - 0.4, d: bd * 0.7, n: 3 + (i % 2), typ, c: wbFarben(r, typ), name: namen[i], blende: waehle(r, BLENDEN) });
    });
  } else if (v === 'hochhaus') {
    // Ladensockel mit aufgesetzter Wohn- und Büroscheibe
    const c = wbFarben(r, 'waschbeton');
    const n0 = 2, egH = 4.4, gh = 3.1, Hs = egH + (n0 - 1) * gh;
    const laeden = []; const nL = Math.max(2, Math.round(W / 11)), lb = (W - 0.6) / nL;
    for (let i = 0; i < nL; i++) laeden.push({ u0: 0.3 + i * lb + 0.1, u1: 0.3 + (i + 1) * lb - 0.1, name: namen[i], blende: waehle(r, BLENDEN) });
    geschaeftshaus(S, scene, p, r, { x0: 0.5, z0: 1, w: W - 1, d: bd, n: n0 - 1, typ: 'band', c, laeden, vordach: 2.8 });
    const tw = Math.min(W * 0.7, 46), tx = (W - tw) / 2, td = Math.min(13, bd * 0.6), tz = 1 + (bd - td) * 0.4, nt = 12;
    const ct = wbFarben(r, r() < 0.5 ? 'raster' : 'waschbeton');
    S.quader(tx, Hs, tz, tx + tw, Hs + nt * 2.9 + 0.4, tz + td, dunkler(ct.panel, 0.25));
    for (const F of sichtbar(p, tx, tz, tw, td)) {
      if (F.L > 20) {
        obergeschosse(S, F, 'waschbeton', Hs + 0.4, nt, 2.9, ct, r);
        // Balkonbänder mit farbigen Brüstungen
        for (let k = 0; k < nt; k++) for (let u = 1.6; u < F.L - 1; u += 6.2) fb(S, F, u, u + 3.2, Hs + 0.4 + k * 2.9, Hs + 0.4 + k * 2.9 + 1.05, 0.28, 1.4, k % 3 === 0 ? waehle(r, ['#d97a3a', '#2f6f8f', '#3f7d56']) : '#e9e5dc');
      } else {
        fb(S, F, 0, F.L, Hs, Hs + nt * 2.9 + 0.4, 0, 0.2, ct.panel);
        for (let k = 0; k < nt; k++) fb(S, F, F.L / 2 - 0.5, F.L / 2 + 0.5, Hs + 1.4 + k * 2.9, Hs + 2.6 + k * 2.9, 0.2, 0.25, ct.glas);
      }
    }
    H = Hs + nt * 2.9 + 0.4;
    flachdach(S, tx, tz, tw, td, H, '#d9dcdf', '#a9adb0', '#9e9b94', 0.8);
    S.quader(tx + tw * 0.4, H, tz + 2, tx + tw * 0.4 + 6, H + 3, tz + td - 2, '#c9c6bf');
    const rb = Math.min(tw * 0.7, 22), F = seitenRahmen(tx, tz, tw, td)['+z'];
    for (const u of [tw / 2 - rb / 2 + 0.6, tw / 2 + rb / 2 - 0.6]) fb(S, F, u - 0.12, u + 0.12, H, H + 4.2, -1.6, -1.4, '#5a6168');
    fb(S, F, tw / 2 - rb / 2, tw / 2 + rb / 2, H + 1.6, H + 4.4, -1.65, -1.35, '#f4f2ec');
    if (istSicht(p, '+z')) ftext(scene, F, waehle(r, ['Revier-Versicherung', 'Hotel am Markt', 'Revierbank']), tw / 2, H + 3.0, -1.32, 1.8, rb - 0.8, '#1f3a5f');
    if (istSicht(p, '-z')) ftext(scene, seitenRahmen(tx, tz + 1.4, tw, td - 1.4)['-z'], 'Hotel am Markt', tw / 2, H + 3.0, 0.02, 1.8, rb - 0.8, '#1f3a5f');
    H += 4.4;
  } else {
    // Zeile aus drei bis fünf Geschäftshäusern
    let x = 0.2, i = 0;
    const typen = mischListe(['waschbeton', 'mosaik', 'kunststoff', 'raster', 'waschbeton', 'mosaik'], r);
    while (x < W - 6) {
      const bw = Math.min(W - 0.2 - x, i === 0 ? zw(r, 9, 15) : zw(r, 8, 16));
      if (W - 0.2 - x - bw < 6) { /* Rest anhängen */ }
      const bwE = W - 0.2 - x - bw < 6 ? W - 0.2 - x : bw;
      const typ = typen[i % typen.length], c = wbFarben(r, typ), n = 2 + Math.floor(r() * 4);
      const tiefe = bd - (r() < 0.3 ? 2 : 0);
      const h = geschaeftshaus(S, scene, p, r, { x0: x, z0: 1 + (bd - tiefe), w: bwE, d: tiefe, n, typ, c, name: namen[i], blende: waehle(r, BLENDEN),
        dachReklame: n <= 3 && r() < 0.45 ? waehle(r, ['Elektro', 'Möbel', 'Optik', 'Mode', 'Radio · TV']) : null, dachReklameT: waehle(r, ['#d23c32', '#1f4f8f', '#2f6f3f']) });
      H = Math.max(H, h);
      x += bwE; i++;
    }
  }
  fussgaengerzone(S, scene, r, 0, bz1 + 0.1, W, D, { salz: p.seed });
  return { hoehe: H };
}
const ruhrInnenstadt60 = slot('slot:ruhr_innenstadt60', {
  varianten: ['zeile', 'kaufhaus', 'hochhaus'], nenn: { zeile: [30, 26], kaufhaus: [48, 34], hochhaus: [44, 34] },
  roh: innenstadtRoh,
});

// =====================================================================================
// Ruhr: Konzernverwaltung (60er Glas, 70er Turm, 20er Backstein-Expressionismus)
// =====================================================================================
function logoGeruest(S, scene, p, x0, z0, w, y, text, farbe, emblem) {
  const bw = Math.min(w, text.length * 2.2 + 6), x = x0 + (w - bw) / 2, h = 4.2;
  for (const xx of [x + 0.4, x + bw / 2, x + bw - 0.4]) { S.box(0.25, h + 1.2, 0.25, xx, y + (h + 1.2) / 2, z0, '#5a6168'); stab(S, [xx, y, z0 - 2], [xx, y + h, z0], 0.1, '#5a6168', 4); }
  S.quader(x, y + 1.0, z0 - 0.15, x + bw, y + 1.25, z0 + 0.15, '#5a6168'); S.quader(x, y + h + 0.9, z0 - 0.15, x + bw, y + h + 1.15, z0 + 0.15, '#5a6168');
  const F1 = R(x, z0 + 0.2, 1, 0, bw, '+z'), F2 = R(x + bw, z0 - 0.2, -1, 0, bw, '-z');
  for (const F of [F1, F2]) if (istSicht(p, F.s)) {
    ftext(scene, F, text, bw / 2 + (emblem ? 2.4 : 0), y + 1.2 + h / 2, 0.02, h * 0.62, bw - (emblem ? 6.4 : 1.2), farbe);
    if (emblem) { const [ex, ez] = wp(F, 2.6, 0.08); const g = new THREE.TorusGeometry(1.6, 0.4, 6, 20); g.rotateY(F.ry); g.translate(ex, y + 1.2 + h / 2, ez); S.add(g, farbe); const g2 = new THREE.BoxGeometry(0.5, 2.6, 0.2); g2.rotateY(F.ry); g2.translate(ex, y + 1.2 + h / 2, ez); S.add(g2, farbe); }
  }
}
function vorplatzFahnen(S, r, x0, z0, n, farben) { for (let i = 0; i < n; i++) { S.box(0.18, 11, 0.18, x0 + i * 2.6, 5.8, z0, '#d9dcdf'); S.box(0.05, 2.8, 1.5, x0 + i * 2.6, 9.6, z0 + 0.8, farben[i % farben.length]); } }
function bueroRoh(S, scene, p) {
  const r = rng(`buero:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  boden(S, 0, 0, W, D, '#cfccc4', 0.3, 0.06);
  let H;
  if (v === 'glas60') {
    // Scheibenhochhaus mit Vorhangfassade, Stützen im EG, Logo-Gerüst
    const sw = Math.min(W - 10, 56), sx = (W - sw) / 2, sd = 15, sz = Math.max(3, D - sd - 16), n = Math.min(18, 10 + Math.floor(sw / 6)), gh = 3.5, y0 = 5.5;
    const glas = waehle(r, ['#5d7c8a', '#4f6e7c', '#6a8794']), bru = waehle(r, ['#3f6b72', '#2f5560', '#4a6f6a']), alu = '#dfe2e4';
    H = y0 + n * gh;
    S.quader(sx + 1.5, 0, sz + 1.5, sx + sw - 1.5, y0, sz + sd - 1.5, '#3c4852');
    S.quader(sx, y0, sz, sx + sw, H, sz + sd, dunkler(glas, 0.1));
    for (const F of sichtbar(p, sx, sz, sw, sd)) {
      if (F.L > 20) {
        for (let k = 0; k < n; k++) { const y = y0 + k * gh; fb(S, F, 0, F.L, y, y + 1.1, 0, 0.08, bru); fb(S, F, 0, F.L, y + 1.1, y + gh, -0.05, 0.05, glas); fb(S, F, -0.05, F.L + 0.05, y - 0.06, y + 0.06, 0, 0.16, alu); }
        for (let u = 0; u <= F.L + 0.01; u += 1.25) fb(S, F, u - 0.06, u + 0.06, y0, H, 0, 0.22, alu);
        for (let u = 3.5; u < F.L - 1; u += 7) fb(S, F, u - 0.4, u + 0.4, 0, y0, 1.0, 1.8, '#e2e0da');
      } else {
        // geschlossene Stirnseite in Naturstein
        fb(S, F, -0.1, F.L + 0.1, y0, H + 0.6, 0, 0.35, '#d9d2c2');
        for (let k = 0; k < n; k += 1) fb(S, F, F.L / 2 - 0.4, F.L / 2 + 0.4, y0 + k * gh + 1.2, y0 + k * gh + 3.0, 0.35, 0.4, glas);
      }
    }
    flachdach(S, sx, sz, sw, sd, H, '#dfe2e4', null, '#9e9b94', 0.6);
    S.quader(sx + sw * 0.25, H, sz + 3, sx + sw * 0.75, H + 3.6, sz + sd - 3, '#c9cdd0');
    const firma = p.name ?? waehle(r, ['WESTKRAFT', 'EMSCHERGAS', 'LIPPESTROM']);
    logoGeruest(S, scene, p, sx, sz + sd / 2, sw, H + 3.6, firma, '#c9483e', true);
    // Vordach am Eingang, Vorplatz mit Wasserbecken und Fahnen
    S.quader(sx + sw * 0.35, y0 - 0.6, sz + sd - 1.5, sx + sw * 0.65, y0 - 0.2, sz + sd + 4, '#e9e7e1');
    const vz0 = sz + sd + 5, vz1 = D - 1.5;
    if (vz1 - vz0 > 4) {
      boden(S, sx + 2, vz0, sx + sw * 0.55, vz1, '#9ec4cc', 0.3, 0.12);
      S.quader(sx + 2, 0.3, vz0, sx + sw * 0.55, 0.55, vz0 + 0.4, '#d9d2c2');
      S.quader(sx + 2, 0.3, vz1 - 0.4, sx + sw * 0.55, 0.55, vz1, '#d9d2c2');
      boden(S, sx + sw * 0.56, vz0, W - 2, vz1, '#d9d2c2', 0.3, 0.1);
      vorplatzFahnen(S, r, sx + sw * 0.62, vz0 + 1.5, 4, ['#c9483e', '#f4f2ec', '#1f3a5f']);
    }
    parkplatz(S, r, 1, 1, Math.max(4, sx - 1), D - 1, { dichte: 0.7 });
    if (W - sx - sw > 6) parkplatz(S, r, sx + sw + 1, 1, W - 1, D - 1, { dichte: 0.7 });
    figuren(S, r, sx, D - 6, sx + sw, D - 1, 10, 0.4);
    H += 9;
  } else if (v === 'turm70') {
    const tw = Math.min(26, Math.min(W, D) - 12), tx = (W - tw) / 2, tz = Math.max(3, (D - tw) / 2 - 3), n = 22, gh = 3.6, y0 = 7.2;
    const beton = waehle(r, ['#cfcac0', '#c4bfb4', '#d6d1c6']), bronze = waehle(r, ['#6b5a48', '#5a5048', '#4d4a46']);
    // Sockelbau
    S.quader(tx - 8, 0, tz - 4, tx + tw + 8, y0, tz + tw + 6, beton);
    for (const F of sichtbar(p, tx - 8, tz - 4, tw + 16, tw + 10)) { fb(S, F, 1, F.L - 1, 1.2, y0 - 1.2, -0.3, 0.02, bronze); for (let u = 1; u < F.L - 1; u += 3) fb(S, F, u - 0.15, u + 0.15, 1.2, y0 - 1.2, 0, 0.2, beton); }
    flachdach(S, tx - 8, tz - 4, tw + 16, tw + 10, y0, beton, null, '#9e9b94', 0.6);
    H = y0 + n * gh;
    S.quader(tx, y0, tz, tx + tw, H, tz + tw, dunkler(bronze, 0.05));
    for (const F of sichtbar(p, tx, tz, tw, tw)) {
      for (let k = 0; k < n; k++) fb(S, F, 0, F.L, y0 + k * gh, y0 + k * gh + 1.2, 0, 0.3, k === n - 1 ? beton : bronze);
      for (let u = 0; u <= F.L + 0.01; u += 2.6) fb(S, F, u - 0.35, u + 0.35, y0, H, 0, 0.6, beton);
      fb(S, F, -0.1, F.L + 0.1, H - 0.2, H + 2.2, 0, 0.65, beton);
      fb(S, F, -0.1, F.L + 0.1, y0 - 0.1, y0 + 0.4, 0, 0.65, beton);
    }
    flachdach(S, tx, tz, tw, tw, H + 2.2, null, null, '#9e9b94');
    S.quader(tx + 5, H + 2.2, tz + 5, tx + tw - 5, H + 6, tz + tw - 5, beton);
    zyl(S, 0.12, 0.12, 12, tx + tw / 2, H + 6, tz + tw / 2, '#9aa1a7', 4);
    const firma = p.name ?? waehle(r, ['MONTANBANK', 'EMSCHERGLAS', 'WESTKOHLE']);
    for (const F of sichtbar(p, tx, tz, tw, tw)) ftext(scene, F, firma, tw / 2, H + 1.0, 0.68, 1.7, tw * 0.85, '#f4f2ec');
    // Eingangsvordach und Wasserspiel
    for (const F of sichtbar(p, tx - 8, tz - 4, tw + 16, tw + 10)) if (F.s === '+z') { fb(S, F, F.L / 2 - 6, F.L / 2 + 6, y0 - 1.6, y0 - 1.0, 0, 5, '#e9e7e1'); for (const u of [F.L / 2 - 5.5, F.L / 2 + 5.5]) fb(S, F, u - 0.15, u + 0.15, 0.3, y0 - 1.6, 4.6, 4.9, '#5a6168'); }
    const vz = tz + tw + 6;
    if (D - vz > 6) { boden(S, 3, vz + 1, W - 3, D - 1, '#d9d2c2', 0.3, 0.1); zyl(S, 3.4, 3.4, 0.5, W * 0.25, 0.35, (vz + D) / 2, '#cfc8b8', 16); zyl(S, 3.0, 3.0, 0.52, W * 0.25, 0.36, (vz + D) / 2, FARBEN.wasser, 16); vorplatzFahnen(S, r, W * 0.62, vz + 2.5, 5, ['#1f3a5f', '#f4f2ec', '#e0b23a']); figuren(S, r, 4, vz + 1, W - 4, D - 1, 12, 0.4); }
    parkplatz(S, r, 1, 1, W - 1, Math.max(2, tz - 5), { dichte: 0.8 });
    H += 18;
  } else {
    // Backstein-Expressionismus der 20er: Klinkerpfeiler, Zackengesims, Turm mit Uhr
    const bw = Math.min(W - 4, 64), bx = (W - bw) / 2, bd = Math.min(16, D - 12), bz = Math.max(1, D - bd - 8), n = 5, gh = 3.6, y0 = 1.4;
    const kl = waehle(r, KLINKER), kl2 = dunkler(kl, 0.06), gold = '#c9a24a', stein = '#d9cdb4';
    H = y0 + n * gh + 1.2;
    S.quader(bx, 0, bz, bx + bw, H, bz + bd, kl);
    S.quader(bx - 0.15, 0, bz - 0.15, bx + bw + 0.15, y0, bz + bd + 0.15, stein);
    const tw = 12, tH = H + 14;
    for (const F of sichtbar(p, bx, bz, bw, bd)) {
      const ra = 2.4, na = Math.floor(F.L / ra), off = (F.L - na * ra) / 2;
      for (let i = 0; i <= na; i++) {
        const u = off + i * ra;
        fb(S, F, u - 0.4, u + 0.4, y0, H, 0, 0.55, kl2);
        fpoly(S, F, [[u - 0.4, H], [u + 0.4, H], [u, H + 1.6]], 0, 0.55, kl2);
      }
      for (let i = 0; i < na; i++) for (let k = 0; k < n; k++) {
        const u = off + (i + 0.5) * ra, y = y0 + k * gh;
        fb(S, F, u - 0.75, u + 0.75, y + 0.9, y + gh - 0.4, -0.05, 0.05, GLAS);
        fb(S, F, u - 0.05, u + 0.05, y + 0.9, y + gh - 0.4, 0, 0.1, '#e9e4d8');
        fpoly(S, F, [[u - 0.75, y + 0.2], [u, y + 0.75], [u + 0.75, y + 0.2]], 0, 0.2, kl2);
      }
      fb(S, F, -0.1, F.L + 0.1, H - 0.4, H, 0, 0.6, gold);
      if (F.s === '+z' && F.L > 20) {
        const mu = F.L / 2;
        for (let k = 0; k < 4; k++) fform(S, F, bogenForm(mu - 3.4 + k * 0.6, 0.3, mu + 3.4 - k * 0.6, 6.2 - k * 0.5, 'spitz'), 0.6 + (3 - k) * 0.25 - 1, 0.6 + (3 - k) * 0.25, k % 2 ? kl : stein);
        fform(S, F, bogenForm(mu - 1.4, 0.3, mu + 1.4, 4.0, 'spitz'), 0, 1.4, '#3a2e28');
        ftext(scene, F, p.name ?? 'Bergwerksgesellschaft Emscher', mu, y0 + 3 * gh + 0.6, 0.62, 0.9, F.L * 0.5, gold);
      }
    }
    // Turm mit gestufter Krone und Uhr
    const txx = bx + bw / 2 - tw / 2, tzz = bz + bd / 2 - tw / 2 + 2;
    S.quader(txx, H, tzz, txx + tw, tH, tzz + tw - 4, kl);
    for (const F of sichtbar(p, txx, tzz, tw, tw - 4)) {
      for (let u = 1.2; u < F.L; u += 2.0) fb(S, F, u - 0.35, u + 0.35, H, tH, 0, 0.45, kl2);
      for (let k = 0; k < 3; k++) fb(S, F, 0.8, F.L - 0.8, tH - 3 - k * 0.8, tH - 2.4 - k * 0.8, 0.45, 0.6, gold);
      fscheibeW(S, F, F.L / 2, tH - 7, 0.5, 0.7, 1.6, '#f4f0e4');
      fscheibeW(S, F, F.L / 2, tH - 7, 0.7, 0.8, 0.25, '#2f3438');
    }
    for (let k = 0; k < 3; k++) S.quader(txx + 1 + k * 1.2, tH + k * 1.4, tzz + 1 + k * 1.2, txx + tw - 1 - k * 1.2, tH + (k + 1) * 1.4, tzz + tw - 5 - k * 1.2, k % 2 ? gold : kl);
    flachdach(S, bx, bz, bw, bd, H, null, null, '#6b6560');
    // Vorplatz mit Rasen, Bäumen und Laternen
    const vz = bz + bd;
    if (D - vz > 4) {
      boden(S, bx, vz + 1, bx + bw, D - 1, stein, 0.3, 0.08);
      boden(S, bx + 3, vz + 2, bx + bw / 2 - 3, D - 2, RASEN, 0.3, 0.1); boden(S, bx + bw / 2 + 3, vz + 2, bx + bw - 3, D - 2, RASEN, 0.3, 0.1);
      for (const xx of [bx + 5, bx + bw / 2 - 5, bx + bw / 2 + 5, bx + bw - 5]) baumRund(S, xx, (vz + D) / 2, r, 0.9);
      for (const xx of [bx + bw / 2 - 2.6, bx + bw / 2 + 2.6]) laterne(S, xx, vz + 2, 4, 0.38, 'alt');
    }
    if (bz > 8) parkplatz(S, r, 2, 1, W - 2, bz - 1, { dichte: 0.6 });
    H = tH + 4.2;
  }
  return { hoehe: H };
}
function fscheibeW(S, F, u, y, t0, t1, rad, c, seg = 20) {
  const g = new THREE.CylinderGeometry(rad, rad, t1 - t0, seg); g.rotateX(PI / 2); g.translate(u, y, (t0 + t1) / 2); fgeo(S, F, g, c);
}
const ruhrBuero = slot('slot:ruhr_buero', {
  varianten: ['glas60', 'turm70', 'backstein20'], nenn: { glas60: [52, 40, 90, 70], turm70: [42, 46, 70, 70], backstein20: [44, 30, 80, 50] },
  roh: bueroRoh,
});

// =====================================================================================
// Ruhr: Trinkhalle, Imbiss, Ladenzeile mit Wettbüro und Shisha-Bar
// =====================================================================================
function getraenkekisten(S, x, z, r, y0 = 0.38) {
  for (let i = 0; i < 4; i++) for (let k = 0; k < 2 + (i % 2); k++) S.box(0.42, 0.32, 0.32, x + (i % 2) * 0.45, y0 + 0.16 + k * 0.33, z + Math.floor(i / 2) * 0.34, waehle(r, ['#c9483e', '#2f5f8f', '#e0b23a', '#3f7d56']));
}
function leuchtschild(S, scene, F, u, y, t, b, h, text, bg, fg, o = {}) {
  fb(S, F, u - b / 2, u + b / 2, y - h / 2, y + h / 2, t, t + 0.3, bg);
  if (o.rand) { fb(S, F, u - b / 2 - 0.1, u + b / 2 + 0.1, y + h / 2, y + h / 2 + 0.1, t, t + 0.34, o.rand); fb(S, F, u - b / 2 - 0.1, u + b / 2 + 0.1, y - h / 2 - 0.1, y - h / 2, t, t + 0.34, o.rand); }
  ftext(scene, F, text, u, y, t + 0.32, h * 0.7, b * 0.92, fg);
}
export function fahrrad(S, x, z, ry, farbe, y0 = 0.38) {
  const c = Math.cos(ry), sn = Math.sin(ry), P = (u) => [x + c * u, z - sn * u];
  for (const u of [-0.55, 0.55]) { const [px, pz] = P(u); const g = new THREE.TorusGeometry(0.34, 0.05, 3, 10); g.rotateY(ry); g.translate(px, y0 + 0.36, pz); S.add(g, '#2b2f33'); }
  const [ax, az] = P(-0.55), [bx, bz] = P(0.3), [cx2, cz2] = P(0.55);
  balken(S, [ax, y0 + 0.4, az], [bx, y0 + 0.75, bz], 0.06, 0.06, farbe); balken(S, [bx, y0 + 0.75, bz], [cx2, y0 + 0.36, cz2], 0.06, 0.06, farbe);
  const [sx, sz] = P(-0.25); S.box(0.25, 0.06, 0.12, sx, y0 + 0.85, sz, '#2b2f33', ry);
}
function bierzeltgarnitur(S, x, z, ry, y0 = 0.38) {
  const g = new THREE.BoxGeometry(2.2, 0.06, 0.7); g.rotateY(ry); g.translate(x, y0 + 0.76, z); S.add(g, '#a8845a');
  for (const q of [-0.7, 0.7]) { const b = new THREE.BoxGeometry(2.2, 0.06, 0.28); b.translate(0, 0, q); b.rotateY(ry); b.translate(x, y0 + 0.45, z); S.add(b, '#a8845a'); }
  for (const q of [-0.9, 0.9]) { const f = new THREE.BoxGeometry(0.06, 0.74, 1.5); f.translate(q, 0, 0); f.rotateY(ry); f.translate(x, y0 + 0.37, z); S.add(f, '#5a6168'); }
}
/** Werbeaufsteller (Kundenstopper) mit Schrift auf den sichtbaren Seiten. */
function aufsteller(S, scene, p, x, z, text, y0 = 0.38) {
  for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(0.75, 1.15, 0.05); g.rotateX(s * 0.2); g.translate(x, y0 + 0.56, z + s * 0.12); S.add(g, '#f4f2ec'); }
  const Fs = { '+z': R(x - 0.375, z + 0.25, 1, 0, 0.75, '+z'), '-z': R(x + 0.375, z - 0.25, -1, 0, 0.75, '-z') };
  for (const s of ['+z', '-z']) if (istSicht(p, s)) ftext(scene, Fs[s], text, 0.375, y0 + 0.62, 0.0, 0.3, 0.68, '#c9483e');
  if (istSicht(p, '+x') || istSicht(p, '-x')) S.box(0.06, 0.9, 0.5, x + (istSicht(p, '+x') ? 0.39 : -0.39), y0 + 0.5, z, '#c9483e');
}
/** Umfeld kleiner Slots: Sitzgruppe, Fahrräder mit Ständer, Werbeaufsteller, Zeitungsständer, Mülleimer. */
function kioskUmfeld(S, scene, p, r, W, D, y, o) {
  if (o.sitz) { bierzeltgarnitur(S, o.sitz[0], o.sitz[1], 0, y); schirmRund(S, o.sitz[0] + 1.6, o.sitz[1] - 0.2, y, waehle(r, ['#c9483e', '#2f5f8f', '#f4f2ec'])); figur(S, o.sitz[0] - 0.4, o.sitz[1] + 0.75, r, y); figur(S, o.sitz[0] + 0.5, o.sitz[1] - 0.75, r, y); }
  if (o.raeder) { const [rx, rz] = o.raeder; for (let i = 0; i < 4; i++) S.box(0.05, 0.7, 0.05, rx + i * 0.8, y + 0.35, rz - 0.6, '#59636b'); S.box(2.5, 0.05, 0.05, rx + 1.2, y + 0.7, rz - 0.6, '#59636b'); for (let i = 0; i < 3; i++) fahrrad(S, rx + 0.4 + i * 0.8, rz, PI / 2, waehle(r, ['#c9483e', '#2f5f8f', '#3f7d56', '#2b2f33', '#e0b23a']), y); }
  if (o.aufsteller) aufsteller(S, scene, p, o.aufsteller[0], o.aufsteller[1], o.aufsteller[2], y);
  if (o.zeitung) { S.box(0.9, 1.0, 0.4, o.zeitung[0], y + 0.5, o.zeitung[1], '#3b3f44'); for (let k = 0; k < 3; k++) S.box(0.8, 0.04, 0.32, o.zeitung[0], y + 0.25 + k * 0.3, o.zeitung[1] + 0.06, waehle(r, ['#f4f2ec', '#e9e2cf', '#d23c32'])); }
  if (o.muell) { zyl(S, 0.3, 0.27, 0.9, o.muell[0], y, o.muell[1], '#3f6b4f', 8); zyl(S, 0.33, 0.33, 0.08, o.muell[0], y + 0.9, o.muell[1], '#2f3438', 8); }
}
function budeRoh(S, scene, p) {
  const r = rng(`bude:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  boden(S, 0, 0, W, D, PFLASTER, 0.3, 0.08);
  const y = 0.38;
  let H = 4;
  if (v === 'trinkhalle') {
    const kw = Math.min(6.4, W * 0.42), kd = 4.6, kx = W * 0.22, kz = D * 0.3, Hk = 3.2;
    const wand = waehle(r, ['#efe6d2', '#e7ddc6', '#dfe6dc']), trim = waehle(r, ['#3f6b4f', '#2f5f8f', '#8c3b3b']);
    S.quader(kx, 0.3, kz, kx + kw, Hk, kz + kd, wand);
    S.quader(kx - 0.05, 0.3, kz - 0.05, kx + kw + 0.05, 0.8, kz + kd + 0.05, '#8a857b');
    flachdach(S, kx, kz, kw, kd, Hk, trim, null, '#7d7a74', 0.5);
    for (const F of sichtbar(p, kx, kz, kw, kd)) {
      if (F.s === '+z' || F.L > 5.5) {
        // Verkaufsfenster mit Auslage, Klappe, Vordach
        fb(S, F, 0.4, F.L - 0.4, 1.1, 2.6, -0.1, 0.02, '#6f8696');
        for (let k = 0; k < 3; k++) for (let u = 0.6; u < F.L - 0.6; u += 0.42) fb(S, F, u, u + 0.32, 1.25 + k * 0.45, 1.55 + k * 0.45, -0.3, -0.12, waehle(r, ['#e0b23a', '#c9483e', '#f4f2ec', '#2f5f8f', '#3f7d56', '#d97a3a', '#7a4a8c']));
        fb(S, F, 0.3, F.L - 0.3, 1.0, 1.12, 0, 0.6, trim);
        fb(S, F, 0.2, F.L - 0.2, 2.65, 2.75, 0, 1.6, '#e9e7e1');
        fb(S, F, -0.05, F.L + 0.05, Hk - 0.4, Hk + 0.5, 0, 0.12, trim);
        if (F.s === '+z') ftext(scene, F, 'Trinkhalle', F.L / 2, Hk + 0.05, 0.14, 0.62, F.L * 0.8, '#ffffff');
        else ftext(scene, F, 'Kiosk', F.L / 2, Hk + 0.05, 0.14, 0.62, F.L * 0.6, '#ffffff');
      } else {
        fb(S, F, 0.6, 1.6, 0.3, 2.4, 0, 0.08, '#4a5056');
        leuchtschild(S, scene, F, F.L * 0.62, 1.9, 0, 1.6, 1.6, 'Eis', '#f4f2ec', '#2f5f8f', { rand: '#c9483e' });
      }
    }
    // Dachschild
    S.box(0.1, 1.0, 0.1, kx + kw / 2, Hk + 0.8, kz + kd / 2, '#5a6168');
    getraenkekisten(S, kx + kw + 0.6, kz + 0.6, r, y);
    S.box(0.5, 1.1, 0.5, kx - 0.7, y + 0.55, kz + kd + 0.5, '#c9483e');
    zyl(S, 0.45, 0.45, 0.06, kx + kw + 2.2, y + 1.05, kz + kd + 1.8, '#d9dcdf', 10); zyl(S, 0.06, 0.06, 1.05, kx + kw + 2.2, y, kz + kd + 1.8, '#9aa1a7', 4);
    zyl(S, 0.45, 0.45, 0.06, kx - 2, y + 1.05, kz + kd + 2.2, '#d9dcdf', 10); zyl(S, 0.06, 0.06, 1.05, kx - 2, y, kz + kd + 2.2, '#9aa1a7', 4);
    figuren(S, r, kx - 1, kz + kd + 0.8, kx + kw + 2, kz + kd + 3, 5, y);
    baumRund(S, W * 0.82, D * 0.22, r, 1.0, y); bank(S, W * 0.82, D * 0.22 + 2.4, 0, y);
    kioskUmfeld(S, scene, p, r, W, D, y, { sitz: [W * 0.8, D * 0.62], raeder: [1.2, D - 2.4], aufsteller: [kx + kw * 0.3, kz + kd + 1.4, 'Lotto · Toto'], zeitung: [kx + kw + 0.6, kz + kd + 0.6], muell: [W * 0.66, D * 0.5] });
    westAuto(S, W * 0.62, D - 1.3, 0, 'kombi', waehle(r, AUTOFARBEN), y);
    hecke(S, 0.4, 0.4, W - 0.4, 1.3, 1.0, y); pflanzkuebel(S, 1.4, D * 0.5, r, y);
    H = Hk + 1.4;
  } else if (v === 'imbiss') {
    const iw = Math.min(11, W * 0.62), id = 7, ix = 1.5, iz = D * 0.2, Hi = 3.6;
    const wand = waehle(r, ['#f2efe6', '#e9e2cf']), farbe = waehle(r, ['#c9483e', '#e0b23a', '#2f6f8f']);
    S.quader(ix, 0.3, iz, ix + iw, Hi, iz + id, wand);
    flachdach(S, ix, iz, iw, id, Hi, farbe, null, '#7d7a74', 0.7);
    const name = p.name ?? waehle(r, ['Imbiss Zum Pütt', 'Grill-Eck', 'Imbiss Glückauf', 'Pommes-Paradies']);
    for (const F of sichtbar(p, ix, iz, iw, id)) {
      fb(S, F, -0.05, F.L + 0.05, 0.3, 0.9, 0, 0.06, '#a8a196');
      if (F.s === '+z') {
        fb(S, F, 0.6, F.L - 2.2, 1.1, 2.7, -0.1, 0.02, '#6f8696');
        fb(S, F, 0.5, F.L - 2.1, 1.0, 1.15, 0, 0.7, '#c9cdd0');
        fb(S, F, F.L - 1.8, F.L - 0.8, 0.3, 2.4, 0, 0.08, '#3c4852');
        fb(S, F, -0.1, F.L + 0.1, 2.8, 3.0, 0, 1.8, farbe);
        leuchtschild(S, scene, F, F.L / 2, Hi + 1.0, -1.0, Math.min(F.L - 0.5, 8), 1.0, name, farbe, '#ffffff');
        for (const u of [1.5, F.L - 3]) fb(S, F, u - 0.06, u + 0.06, Hi, Hi + 0.6, -1.0, -0.9, '#5a6168');
      } else {
        fb(S, F, 0.6, F.L - 0.6, 1.2, 2.6, -0.1, 0.02, '#6f8696');
        leuchtschild(S, scene, F, F.L / 2, 2.2, 0.05, F.L - 1.2, 0.9, 'Currywurst · Pommes', '#f4f2ec', '#c9483e');
        fb(S, F, 0.4, F.L - 0.4, 2.8, 2.95, 0, 1.0, farbe);
      }
    }
    { const px = ix + iw - 1.6, pz = iz + 1.8; const tg = new THREE.CylinderGeometry(0.9, 0.45, 2.0, 4); tg.rotateY(PI / 4); tg.translate(px, Hi + 1.0, pz); S.add(tg, '#f4f2ec');
      for (let i = 0; i < 7; i++) S.box(0.16, 1.0, 0.16, px - 0.45 + (i % 4) * 0.3, Hi + 2.3, pz - 0.2 + Math.floor(i / 4) * 0.35, '#f2c62e', 0.2 * (i % 3 - 1));
      S.box(0.5, 0.25, 0.5, px + 0.7, Hi + 2.0, pz, '#c9483e'); }
    for (let i = 0; i < 3; i++) { const tx = ix + 1.8 + i * 2.8, tz = iz + id + 2.6; zyl(S, 0.5, 0.5, 0.06, tx, y + 1.08, tz, '#e9e7e1', 10); zyl(S, 0.07, 0.07, 1.08, tx, y, tz, '#9aa1a7', 4); figur(S, tx + 0.6, tz, r, y); }
    S.quader(ix + iw + 0.5, y, iz + 0.4, ix + iw + 1.6, y + 1.2, iz + 1.6, '#3f6b4f'); S.quader(ix + iw + 0.5, y, iz + 1.8, ix + iw + 1.6, y + 1.2, iz + 3.0, '#5a6168');
    zyl(S, 1.4, 1.4, 0.1, W - 3, y + 2.2, D * 0.65, '#c9483e', 8); zyl(S, 0.06, 0.06, 2.2, W - 3, y, D * 0.65, '#9aa1a7', 4); S.box(1.8, 0.7, 0.6, W - 3, y + 0.7, D * 0.65, '#8a6a4a');
    kioskUmfeld(S, scene, p, r, W, D, y, { raeder: [W - 4.2, D - 2.2], aufsteller: [ix + iw * 0.25, iz + id + 1.2, 'Pommes Schranke'], muell: [ix + iw + 1.1, iz + id + 1.0] });
    westAuto(S, W * 0.5, D - 1.3, 0, 'pkw', waehle(r, AUTOFARBEN), y);
    H = Hi + 1.6;
  } else {
    // Nachkriegs-Wohnhaus mit drei Läden: Wettbüro, Shisha-Bar, Döner
    const hw = W - 1, hd = Math.min(12, D - 5), hz = 0.5, eg = 4.0, gh = 2.9, n = 2 + (r() < 0.5 ? 1 : 0);
    const wand = waehle(r, ['#e9dfc8', '#e2d6bd', '#d9d4c3', '#ead9c2', '#d8c9b0']);
    H = eg + n * gh;
    S.quader(0.5, 0, hz, 0.5 + hw, H, hz + hd, wand);
    const laeden = mischListe([['Sportwetten', '#2f7d3f', '#ffffff', '#7fe08a'], ['Shisha Lounge', '#3a2a4a', '#f2a6ff', '#c45cff'], ['Döner Kebab', '#c9483e', '#ffd75a', '#ff8a2a'], ['Handy · Reparatur', '#1f4f8f', '#ffffff', '#4fc3ff'], ['Café Bistro', '#2b2f33', '#ffd75a', '#ffd75a']], r).slice(0, 3);
    laeden.sort((a, b) => (a[0] === 'Sportwetten' ? -1 : 0));
    for (const F of sichtbar(p, 0.5, hz, hw, hd)) {
      const traufe = F.s[1] === 'z';
      for (let k = 0; k < n; k++) {
        const yy = eg + k * gh;
        const na = Math.max(1, Math.floor(F.L / 3.2)), off = (F.L - na * 3.2) / 2;
        for (let i = 0; i < na; i++) {
          const u = off + (i + 0.5) * 3.2;
          fb(S, F, u - 0.65, u + 0.65, yy + 0.8, yy + 2.3, -0.05, 0.05, GLAS);
          fb(S, F, u - 0.75, u + 0.75, yy + 0.7, yy + 0.8, 0, 0.18, '#f4f2ec');
          if (traufe && F.s === '+z' && (i + k) % 3 === 1) {
            fb(S, F, u - 1.3, u + 1.3, yy, yy + 0.15, 0, 1.2, '#cfccc6'); fb(S, F, u - 1.3, u + 1.3, yy + 0.15, yy + 1.0, 1.1, 1.2, '#8a9aa2');
            const [sx2, sz2] = wp(F, u + 0.9, 1.0); const g = new THREE.CylinderGeometry(0.45, 0.3, 0.12, 10); g.rotateX(PI / 2.4); g.rotateY(F.ry); g.translate(sx2, yy + 1.5, sz2); S.add(g, '#e9e7e1');
          }
        }
      }
      if (F.s === '+z') {
        const lb = (F.L - 0.6) / 3;
        laeden.forEach(([text, bg, fg, licht], i) => {
          const u0 = 0.3 + i * lb + 0.15, u1 = 0.3 + (i + 1) * lb - 0.15;
          fb(S, F, u0, u1, 0.3, eg - 1.2, -0.4, -0.3, text.startsWith('Sport') ? '#3c4852' : text.startsWith('Shisha') ? '#2a2230' : '#6f8696');
          fb(S, F, (u0 + u1) / 2 - 0.6, (u0 + u1) / 2 + 0.6, 0.3, 2.5, -0.3, -0.22, '#3c4852');
          leuchtschild(S, scene, F, (u0 + u1) / 2, eg - 0.6, 0.02, u1 - u0, 0.95, text, bg, fg, { rand: licht });
          if (text.startsWith('Shisha')) for (const uu of [u0 + 0.3, u1 - 0.3]) fb(S, F, uu - 0.06, uu + 0.06, 0.6, eg - 1.2, -0.28, -0.16, licht);
        });
      } else fb(S, F, 0.3, F.L - 0.3, 0.3, 1.0, 0, 0.05, '#a8a196');
      if (!traufe) fpoly(S, F, [[0, H], [F.L, H], [F.L / 2, H + 3.2]], -0.3, 0.02, wand);
    }
    satteldach(S, p, 0.5, hz, hw, hd, H, 3.6, 'x', waehle(r, ['#4f565c', '#a9523c', '#5a5450']), wand);
    for (let i = 0; i < 2; i++) S.box(0.6, 1.4, 0.6, 3 + i * (hw - 6), H + 3.2, hz + hd / 2, '#8f4a37');
    // Gehweg mit Stehtischen, Rollern, Sitzgruppe der Shisha-Bar
    const gz = hz + hd;
    for (let i = 0; i < 3; i++) { zyl(S, 0.45, 0.45, 0.06, 2.5 + i * 2.2, y + 1.05, gz + 2.5, '#e9e7e1', 10); zyl(S, 0.06, 0.06, 1.05, 2.5 + i * 2.2, y, gz + 2.5, '#9aa1a7', 4); }
    figuren(S, r, 1, gz + 0.5, W - 1, D - 0.5, 9, y);
    westAuto(S, W * 0.65, D - 1.3, 0, 'pkw', '#2b2f33', y);
    H += 4;
  }
  return { hoehe: H };
}
const ruhrBude = slot('slot:ruhr_bude', {
  varianten: ['trinkhalle', 'imbiss', 'zeile'], nenn: { trinkhalle: [16, 14, 30, 24], imbiss: [18, 14, 30, 24], zeile: [20, 16, 34, 24] },
  roh: budeRoh,
});

// =====================================================================================
// Wasser: Becken, Kaimauern, Böschungen (Wasserspiegel unter Geländeniveau)
// =====================================================================================
const KAI = '#cfc7b6', KAI_DUNKEL = '#a9a193', SPUNDWAND = '#5a5f63';
function wasser(S, x0, z0, x1, z1, WY, c = FARBEN.wasser) { if (x1 > x0 && z1 > z0) S.quader(x0, WY - 1.4, z0, x1, WY, z1, c); }
/** Senkrechte Kaimauer als Streifen (x0..x1, z0..z1) vom Grund bis Geländeniveau. */
function kaimauer(S, x0, z0, x1, z1, WY, c = KAI, oben = 0.36) {
  S.quader(x0, WY - 1.4, z0, x1, oben, z1, c);
  S.quader(Math.min(x0, x1), oben, Math.min(z0, z1), Math.max(x0, x1), oben + 0.12, Math.max(z0, z1), KAI_DUNKEL);
}
/** Geneigte Uferböschung entlang x: von zLand (y 0.3) nach zWasser (y WY). */
function boeschung(S, x0, x1, zLand, zWasser, WY, c = '#9a958a') {
  const dz = zWasser - zLand, dy = WY - 0.3, L = Math.hypot(dz, dy);
  const g = new THREE.BoxGeometry(x1 - x0, 0.6, L);
  g.rotateX(-Math.atan2(dy, Math.abs(dz)) * Math.sign(dz));
  g.translate((x0 + x1) / 2, (0.3 + WY) / 2 - 0.3, (zLand + zWasser) / 2);
  S.add(g, c);
  const g2 = new THREE.BoxGeometry(x1 - x0, 0.2, L * 0.35); g2.rotateX(-Math.atan2(dy, Math.abs(dz)) * Math.sign(dz)); g2.translate((x0 + x1) / 2, WY + Math.abs(dy) * 0.17 - 0.12, zWasser - dz * 0.17); S.add(g2, '#7f7b72');
}
function poller(S, x, z, y = 0.36) { zyl(S, 0.25, 0.3, 0.7, x, y, z, '#3b3f44', 8); }
function pappel(S, x, z, r, s = 1, y0 = 0.3) {
  S.box(0.35 * s, 2.0 * s, 0.35 * s, x, y0 + 1.0 * s, z, FARBEN.stamm);
  const g = new THREE.IcosahedronGeometry(1.4 * s, 0); g.scale(1, 3.2, 1); g.translate(x, y0 + 5.6 * s, z); S.add(g, waehle(r, ['#5f9a56', '#6aa35c', '#58904f']));
}
/** Portal-Wippkran auf Schienen am Kai. Ausleger zeigt nach -z (über das Wasser), Portal entlang x verfahrbar. */
/** Portal-Wippkran auf Schienen am Kai. sg = +1: Ausleger zeigt nach +z (über das Wasser), -1 nach -z. */
function portalkran(S, x, z, r, farbe, dreh = 0, sg = -1) {
  const sp = 7, c = farbe, Z = (a, b) => [Math.min(z + sg * a, z + sg * b), Math.max(z + sg * a, z + sg * b)];
  for (const [dx, dz] of [[-2.4, -sp / 2], [2.4, -sp / 2], [-2.4, sp / 2], [2.4, sp / 2]]) S.box(0.7, 8, 0.7, x + dx, 4.3, z + dz, c);
  S.quader(x - 3, 8, z - sp / 2 - 0.5, x + 3, 9.2, z + sp / 2 + 0.5, c);
  zyl(S, 2.2, 2.2, 0.8, x, 9.2, z, dunkler(c, 0.1), 12);
  { const [a0, a1] = Z(1.6, -2.6); S.quader(x - 1.8, 10, a0, x + 1.8, 13.4, a1, c); }
  { const [a0, a1] = Z(1.62, -0.4); S.quader(x - 1.82, 11.6, a0, x + 1.82, 12.8, a1, '#3c4852'); }
  S.box(1.2, 10, 1.2, x, 15, z - sg * 1.6, c);
  const a = 0.75 + dreh, L = 26, ex = x, ez = z + sg * Math.cos(a) * L, ey = 12 + Math.sin(a) * L * 0.55;
  balken(S, [x, 11.5, z + sg * 0.5], [ex, ey, ez], 0.9, 1.0, c);
  balken(S, [x, 20, z - sg * 1.6], [ex, ey + 0.3, ez - sg * 1], 0.25, 0.25, '#2b2f33');
  S.box(1.6, 1.0, 1.6, ex, ey - 0.8, ez + sg * 0.6, dunkler(c, 0.1));
  stab(S, [ex, ey - 1.2, ez + sg * 0.6], [ex, 3, ez + sg * 0.6], 0.05, '#2b2f33', 4);
  S.box(1.6, 0.8, 1.2, ex, 2.6, ez + sg * 0.6, '#3b3f44');
}

// =====================================================================================
// Ruhr: Kanal mit Hafenbecken, Schleuse, Strecke
// =====================================================================================
function kanalRoh(S, scene, p) {
  const r = rng(`kanal:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante, WY = p.wasserY ?? WEST_WASSER_Y;
  let H = 20;
  if (v === 'hafen') {
    // Hafenbecken auf der Kameraseite (lokal +z), Kai mit Kränen, dahinter Speicher und Silo
    const kz = D - Math.round(D * 0.46);
    wasser(S, 0, kz, W, D, WY);
    kaimauer(S, 0, kz, W, kz + 1, WY);
    boden(S, 0, 0, W, kz, '#bdb6a8', 0.3, 0.06);
    boden(S, 0, kz - 4, W, kz, PFLASTER, 0.3, 0.08);
    for (let x = 3; x < W; x += 8) poller(S, x, kz - 0.6);
    for (const zz of [kz - 1.6, kz - 9.6]) S.quader(0, 0.36, zz - 0.08, W, 0.48, zz + 0.08, '#6b6f73');
    const kf = waehle(r, ['#e0b23a', '#2f6f8f', '#c9483e']);
    const nk = Math.max(1, Math.floor(W / 34));
    for (let i = 0; i < nk; i++) portalkran(S, W * ((i + 0.5) / nk) + zw(r, -3, 3), kz - 5.6, r, kf, zw(r, -0.15, 0.2), 1);
    westSchiff(S, scene, W * 0.35, kz + 6.5, WY, PI, 'binnen', { ladung: 'kohle', laenge: Math.min(56, W * 0.55), name: waehle(r, ['Emscherland', 'Glückauf', 'Ruhrort', 'Sophie']) });
    if (W > 70 && D - kz > 22) westSchiff(S, scene, W * 0.72, kz + 16, WY, 0, 'binnen', { ladung: 'container', laenge: Math.min(50, W * 0.4) });
    // Speicher in Backstein, Silo aus Beton
    const sz0 = 3, sz1 = kz - 13, sw = Math.min(40, W * 0.5);
    if (sz1 - sz0 > 8) {
      backsteinHalle(S, scene, p, { x0: 3, z0: sz0, w: sw, d: sz1 - sz0, H: 14, wand: waehle(r, BACKSTEIN), orn: '#d9c9a8', dach: '#5a5f63', dachH: 4, achse: 'x', r,
        fenster: { art: 'segment', b: 1.4, h: 2.0, y: 1.8, raster: 3.4, zeilen: 3 }, glas: GLAS });
      for (const F of sichtbar(p, 3, sz0, sw, sz1 - sz0)) if (F.L > 20) ftext(scene, F, 'Lagerhaus 3', F.L / 2, 12.6, 0.3, 1.2, F.L * 0.4, '#f4f0e4');
      const six = 3 + sw + 4, siw = Math.min(16, W - six - 12);
      if (siw > 8) {
        const sn = Math.max(2, Math.floor(siw / 5)), sr = siw / sn / 2;
        for (let i = 0; i < sn; i++) for (let k = 0; k < 2; k++) zyl(S, sr, sr, 30, six + sr + i * 2 * sr, 0.3, sz0 + sr + k * 2 * sr, '#d6d1c6', 14);
        S.quader(six, 30.3, sz0, six + siw, 36, sz0 + 4 * sr, '#cfcac0');
        for (const F of sichtbar(p, six, sz0, siw, 4 * sr)) { fb(S, F, 1, F.L - 1, 33, 35, 0, 0.1, GLAS); ftext(scene, F, 'Silo', F.L / 2, 31.4, 0.12, 1.1, F.L * 0.5, '#5a6168'); }
        H = 37;
        balken(S, [six + siw / 2, 33, sz0 + 4 * sr], [six + siw / 2, 12, kz - 6], 1.6, 1.4, '#9aa1a7');
      }
    }
    // Container am Kai, Lkw
    const cf = ['#c8463c', '#2f6f8f', '#e0b23a', '#3f7d56', '#7a7f85', '#d97a3a'];
    for (let i = 0; i < 6; i++) for (let k = 0; k < 1 + (i % 3 === 0 ? 1 : 0); k++) S.box(6, 2.5, 2.4, W - 6, 1.55 + k * 2.55, kz - 12 - i * 2.6, cf[(i * 2 + k) % cf.length]);
    westAuto(S, W * 0.5, kz - 13, 0, 'lkw', '#4f7a8c');
  } else if (v === 'schleuse') {
    // Schleuse mit zwei Kammern, Hubtor zwischen Türmen, Stemmtor oben
    const zc = Math.round(D * 0.45), kb = 12, kb2 = 8, mm = 3, z0 = zc - (kb + kb2 + mm) / 2, ox0 = W * 0.28, ox1 = W * 0.78;
    const WO = WY + 0.6, WU = WY - 1.6;
    // Oberwasser links, Unterwasser rechts
    const zA = z0 - 6, zB = z0 + kb + kb2 + mm + 6;
    wasser(S, 0, zA, ox0, zB, WO); wasser(S, ox1, zA, W, zB, WU);
    boden(S, 0, 0, W, zA - 1, '#a9c48c', 0.3, 0.05); boden(S, 0, zB + 1, W, D, '#a9c48c', 0.3, 0.05);
    kaimauer(S, 0, zA - 1, ox0, zA, WY); kaimauer(S, 0, zB, ox0, zB + 1, WY);
    kaimauer(S, ox1, zA - 1, W, zA, WY - 1); kaimauer(S, ox1, zB, W, zB + 1, WY - 1);
    // Kammern
    wasser(S, ox0, z0, ox1, z0 + kb, WU + 0.2); wasser(S, ox0, z0 + kb + mm, ox1, z0 + kb + mm + kb2, WO);
    S.quader(ox0, WY - 2, zA - 1, ox1, 0.6, z0, '#d6d1c6'); S.quader(ox0, WY - 2, z0 + kb, ox1, 0.6, z0 + kb + mm, '#d6d1c6'); S.quader(ox0, WY - 2, z0 + kb + mm + kb2, ox1, 0.6, zB + 1, '#d6d1c6');
    S.quader(ox0 - 2, WY - 2, z0, ox0, WO + 0.2, z0 + kb, '#bfb9ad');
    for (const zz of [z0 + 0.15, z0 + kb - 0.15, z0 + kb + mm + 0.15, zB - 6.15]) for (let x = ox0 + 3; x < ox1; x += 6) poller(S, x, zz < z0 + 1 ? zz - 0.6 : zz + 0.6, 0.6);
    // Stemmtor am Oberhaupt (große Kammer)
    for (const s of [0, 1]) { const g = new THREE.BoxGeometry(0.6, Math.abs(WO - WU) + 2, kb / 2 + 0.6); g.rotateY(s ? 0.35 : -0.35); g.translate(ox0 + 1.2, (WO + WU) / 2 + 0.6, z0 + (s ? kb * 0.75 : kb * 0.25)); S.add(g, '#4a3a2e'); }
    // Hubtor am Unterhaupt zwischen zwei Betontürmen
    const hx = ox1 - 2, Ht = 18;
    for (const zz of [z0 - 2.5, z0 + kb + mm / 2, zB - 6 + 2.5 - 1]) S.quader(hx - 2, 0.6, zz - 1.6, hx + 2, Ht, zz + 1.6, '#e2ddd2');
    for (const zz of [z0 - 2.5, z0 + kb + mm / 2]) for (const F of sichtbar(p, hx - 2, zz - 1.6, 4, 3.2)) fb(S, F, 1, F.L - 1, Ht - 4, Ht - 1.5, 0, 0.06, GLAS);
    S.quader(hx - 2.2, Ht, z0 - 4.3, hx + 2.2, Ht + 1, zB - 6 + 2.5 + 0.8, '#c9c4b8');
    S.quader(hx - 0.8, 7.5, z0 + 0.2, hx + 0.8, 11.5, z0 + kb - 0.2, '#2f5f8f');
    S.quader(hx - 0.8, 6.5, z0 + kb + mm + 0.2, hx + 0.8, 10, z0 + kb + mm + kb2 - 0.2, '#2f5f8f');
    if (istSicht(p, '+x') || istSicht(p, '+z')) ftext(scene, R(hx + 2.25, z0 + kb + mm / 2 + 1.6, 0, -1, 3.2, '+x'), 'Schleuse', 1.6, Ht - 6, 0.02, 0.9, 3, '#2f3438');
    // Steuerstand mit Glaskanzel
    const sx = ox0 + (ox1 - ox0) * 0.45, sz = zB + 3;
    S.quader(sx - 4, 0.3, sz, sx + 4, 4, sz + 5, '#e2ddd2');
    S.quader(sx - 3.4, 4, sz + 0.4, sx + 3.4, 6.6, sz + 4.6, '#6f8696');
    S.quader(sx - 3.8, 6.6, sz + 0.1, sx + 3.8, 7.0, sz + 4.9, '#5a6168');
    westSchiff(S, scene, (ox0 + ox1) / 2 - 2, z0 + kb / 2, WU + 0.2, 0, 'binnen', { laenge: Math.min(ox1 - ox0 - 8, 52), breite: 8, ladung: r() < 0.5 ? 'container' : 'kohle', name: 'Haldenblick' });
    for (let i = 0; i < 6; i++) pappel(S, 4 + i * ((W - 8) / 5), D - 3, r, 1);
    boden(S, 0, zB + 1, W, zB + 3.6, '#cbbf9e', 0.3, 0.08);
    figuren(S, r, 4, zB + 1.2, W - 4, zB + 3.4, 6, 0.38);
    H = Ht + 2;
  } else {
    // Kanalstrecke: Böschungen, Leinpfade, Pappeln, Bogenbrücke
    const B = Math.min(34, D * 0.48), zc = D * 0.46, zw0 = zc - B / 2, zw1 = zc + B / 2, bo = 3.2;
    wasser(S, 0, zw0 - 0.5, W, zw1 + 0.5, WY);
    boeschung(S, 0, W, zw0 - bo, zw0, WY); boeschung(S, 0, W, zw1 + bo, zw1, WY);
    boden(S, 0, 0, W, zw0 - bo, RASEN, 0.3, 0.05); boden(S, 0, zw1 + bo, W, D, RASEN, 0.3, 0.05);
    for (const [a, b] of [[zw0 - bo - 3.2, zw0 - bo], [zw1 + bo, zw1 + bo + 3.2]]) boden(S, 0, a, W, b, '#cbbf9e', 0.3, 0.09);
    for (let x = 3; x < W; x += 9) { pappel(S, x, zw1 + bo + 5, r, 1.05); if (zw0 - bo - 5 > 1) pappel(S, x + 4, zw0 - bo - 5, r, 1); }
    // Radfahrer und Angler auf dem Leinpfad
    for (let i = 0; i < 4; i++) { const xx = zw(r, 4, W - 4); figur(S, xx, zw1 + bo + 1.6, r, 0.39); S.box(1.6, 0.6, 0.12, xx, 0.75, zw1 + bo + 1.6, '#3b3f44'); }
    for (let i = 0; i < 3; i++) { const xx = zw(r, 4, W * 0.5); figur(S, xx, zw1 + bo + 0.6, r, 0.39); stab(S, [xx, 1.6, zw1 + bo + 0.4], [xx, 2.6, zw1 - 2], 0.03, '#2b2f33', 3); }
    // Bogenbrücke mit Rampen
    const bx = W * 0.66, bb = 9, dy = 4.5;
    S.quader(bx - bb / 2, dy - 0.6, zw0 - bo - 2, bx + bb / 2, dy, zw1 + bo + 2, '#9aa1a7');
    S.quader(bx - bb / 2 + 1, dy, zw0 - bo - 2, bx + bb / 2 - 1, dy + 0.06, zw1 + bo + 2, ASPHALT);
    for (const [a, b] of [[zw0 - bo - 2, 0], [zw1 + bo + 2, D]]) {
      const L = Math.abs(b - a); const g = new THREE.BoxGeometry(bb, 0.6, Math.hypot(L, dy)); g.rotateX(Math.atan2(dy, L) * Math.sign(a - b) * -1); g.translate(bx, dy / 2, (a + b) / 2); S.add(g, '#9aa1a7');
    }
    const bogenF = waehle(r, ['#2f6f8f', '#3f7d56', '#c9483e']);
    for (const dx of [-bb / 2 + 0.3, bb / 2 - 0.3]) {
      const n = 10, sp = zw1 - zw0 + 2 * bo + 4, h = 9;
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n, zz = zw0 - bo - 2 + sp * t, yy = dy + Math.sin(t * PI) * h, q = [bx + dx, yy, zz];
        if (prev) balken(S, prev, q, 0.7, 0.9, bogenF);
        if (i > 0 && i < n) stab(S, [bx + dx, dy, zz], q, 0.08, '#2b2f33', 4);
        prev = q;
      }
    }
    for (let i = 1; i < 5; i++) { const zz = zw0 - bo - 2 + (zw1 - zw0 + 2 * bo + 4) * (i / 5); S.box(bb - 0.6, 0.4, 0.4, bx, dy + Math.sin((i / 5) * PI) * 9, zz, bogenF); }
    westAuto(S, bx + 2, zc - 4, PI / 2, 'pkw', waehle(r, AUTOFARBEN), dy + 0.06);
    westSchiff(S, scene, W * 0.3, zc - 4, WY, 0, 'binnen', { ladung: waehle(r, ['kohle', 'container', 'luken']), laenge: Math.min(56, W * 0.45), name: waehle(r, ['Emscherland', 'Wanne 2', 'Rheinhausen']) });
    if (W > 90) westSchiff(S, scene, W * 0.88, zc + 6, WY, PI, r() < 0.5 ? 'ausflug' : 'tanker', { name: 'MS Emscherblick', laenge: 32 });
    H = dy + 10;
  }
  return { hoehe: H };
}
const ruhrKanal = slot('slot:ruhr_kanal', {
  wasserZurKamera: (v) => v === 'hafen',
  varianten: ['strecke', 'hafen', 'schleuse'], nenn: { strecke: [70, 50], hafen: [70, 56], schleuse: [90, 56] },
  roh: kanalRoh,
});

// =====================================================================================
// Ruhr: Einkaufszentrum am Stadtrand (70er bis 90er)
// =====================================================================================
/** Offenes Parkhaus mit Brüstungsbändern, Stützen, Autos auf dem Oberdeck. */
function parkhaus(S, scene, p, r, x0, z0, w, d, decks, o = {}) {
  const gh = 2.9, H = decks * gh, band = o.band ?? '#d9d6cf', akzent = o.akzent ?? null;
  for (let k = 0; k <= decks; k++) S.quader(x0, k * gh, z0, x0 + w, k * gh + 0.35, z0 + d, '#bdb9b1');
  for (let x = x0 + 0.4; x <= x0 + w - 0.3; x += 7.5) for (const z of [z0 + 0.4, z0 + d - 0.4, z0 + d / 2]) S.box(0.6, H, 0.6, x, H / 2, z, '#a9a59c');
  for (const F of sichtbar(p, x0, z0, w, d)) for (let k = 1; k <= decks; k++) {
    fb(S, F, -0.05, F.L + 0.05, k * gh + 0.35, k * gh + 1.25, 0, 0.12, akzent && k % 2 ? akzent : band);
    if (k < decks) for (let u = 3; u < F.L - 2; u += zw(r, 3, 6)) if (r() < 0.6) { const [ax, az] = wp(F, u, -2.6); westAuto(S, ax, az, F.ry + PI / 2, waehle(r, ['pkw', 'kombi', 'kompakt']), waehle(r, AUTOFARBEN), k * gh + 0.35); }
  }
  fb(S, seitenRahmen(x0, z0, w, d)['+z'], 0, 0.1, 0, 0.1, 0, 0.1, band);
  for (let x = x0 + 2; x < x0 + w - 2; x += 2.7) if (r() < 0.55) westAuto(S, x, z0 + 3 + (r() < 0.5 ? 0 : d - 6), PI / 2, waehle(r, ['pkw', 'kombi', 'kompakt']), waehle(r, AUTOFARBEN), H + 0.35);
  for (let x = x0 + 4; x < x0 + w; x += 14) laterne(S, x, z0 + d / 2, 5, H + 0.35, 'mast');
  return H + 1.3;
}
function ekzRoh(S, scene, p) {
  const r = rng(`ekz:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  boden(S, 0, 0, W, D, ASPHALT, 0.3, 0.05);
  const name = p.name ?? waehle(r, v === '90er' ? ['Kanalpark-Center', 'Haldenblick-Galerie', 'Revier-Arkaden'] : v === '80er' ? ['Marktzentrum Süd', 'Einkaufspark West'] : ['Einkaufszentrum Nord', 'City-Center Ost']);
  const bz0 = 3, bz1 = Math.round(D * 0.62), bw = W - (v === '70er' ? 10 : 34), bx = 5;
  let H;
  if (v === '70er') {
    // Waschbetonklotz mit Parkdeck auf dem Dach und Wendelrampe
    const c = wbFarben(r, 'waschbeton'); H = 12;
    S.quader(bx, 0, bz0, bx + bw, H, bz1, c.panel);
    for (const F of sichtbar(p, bx, bz0, bw, bz1 - bz0)) {
      for (let y = 1.2; y < H; y += 2.6) fb(S, F, -0.05, F.L + 0.05, y, y + 0.35, 0, 0.18, dunkler(c.panel, 0.08));
      for (let u = 4; u < F.L - 2; u += 4.8) fb(S, F, u - 0.12, u + 0.12, 0.3, H, 0, 0.12, dunkler(c.panel, 0.05));
      if (F.s === '+z') {
        const eu = F.L / 2;
        fb(S, F, eu - 9, eu + 9, 0.3, 7.6, 0, 3.4, '#5f7787');
        for (let u = eu - 9; u <= eu + 9.01; u += 2) fb(S, F, u - 0.08, u + 0.08, 0.3, 7.6, 3.3, 3.5, '#d4d6d8');
        fb(S, F, eu - 11, eu + 11, 7.6, 8.4, 0, 5.4, '#e9e7e1'); fb(S, F, eu - 11, eu + 11, 7.5, 8.5, 5.3, 5.5, '#d97a3a');
        ftext(scene, F, name, eu, 10.0, 0.2, 1.6, Math.min(F.L * 0.6, 34), '#d97a3a');
        for (const [u, t] of [[F.L * 0.15, 'Lebensmittel'], [F.L * 0.85, 'Möbel']]) ladenFront(S, scene, F, u - 6, u + 6, 4.6, { name: t, blende: '#2f5f8f', vordach: 1.6 });
      }
    }
    // Dachparkdeck
    S.quader(bx + 0.3, H, bz0 + 0.3, bx + bw - 0.3, H + 0.15, bz1 - 0.3, '#9a9f9f');
    for (const zz of [bz0 + 0.1, bz1 - 0.6]) S.quader(bx, H, zz, bx + bw, H + 1.0, zz + 0.5, c.panel);
    for (const xx of [bx, bx + bw - 0.5]) S.quader(xx, H, bz0, xx + 0.5, H + 1.0, bz1, c.panel);
    for (let k = 0; k < 3; k++) { const zc = bz0 + 5 + k * ((bz1 - bz0 - 10) / 2); for (let x = bx + 3; x < bx + bw - 3; x += 2.6) { S.quader(x - 1.3, H + 0.15, zc - 2.5, x - 1.2, H + 0.17, zc + 2.5, '#f2f1ec'); if (r() < 0.6) westAuto(S, x, zc, PI / 2, waehle(r, ['pkw', 'kombi', 'kompakt']), waehle(r, AUTOFARBEN), H + 0.15); } }
    for (let x = bx + 6; x < bx + bw; x += 16) laterne(S, x, (bz0 + bz1) / 2, 6, H + 0.15);
    // Wendelrampe an der Ecke
    const rx = bx + bw + 0.5 - 6, rz = bz1 + 6;
    zyl(S, 5.4, 5.4, H + 1, rx, 0, rz, '#cfccc6', 18);
    for (let k = 0; k < 4; k++) zyl(S, 5.5, 5.5, 0.4, rx, 1.5 + k * 3, rz, dunkler(c.panel, 0.1), 18, true);
    zyl(S, 5.1, 5.1, 0.2, rx, H + 1, rz, '#9a9f9f', 18);
    H += 2;
  } else if (v === '80er') {
    // Klinker mit grünem Stahl und Glaspyramiden, Parkhaus seitlich
    const kl = waehle(r, ['#9b5a44', '#8f4f3c', '#a8664f']), gruen = '#2f6f5a'; H = 11;
    S.quader(bx, 0, bz0, bx + bw, H, bz1, kl);
    for (const F of sichtbar(p, bx, bz0, bw, bz1 - bz0)) {
      for (let u = 0; u <= F.L + 0.01; u += 6) fb(S, F, u - 0.35, u + 0.35, 0.3, H + 0.6, 0, 0.4, dunkler(kl, 0.06));
      fb(S, F, -0.1, F.L + 0.1, H - 0.4, H + 0.6, 0, 0.45, gruen);
      for (let u = 3; u < F.L - 2; u += 6) fb(S, F, u - 1.8, u + 1.8, 5.5, 8.5, 0, 0.06, '#5f7787');
      if (F.s === '+z') for (const eu of [F.L * 0.25, F.L * 0.72]) {
        fb(S, F, eu - 5, eu + 5, 0.3, 6.5, 0, 4, '#6f8696');
        for (let u = eu - 5; u <= eu + 5.01; u += 1.25) fb(S, F, u - 0.07, u + 0.07, 0.3, 6.5, 3.9, 4.1, gruen);
        const [px, pz] = wp(F, eu, 2); const py = new THREE.ConeGeometry(7.2, 5, 4); py.rotateY(PI / 4 + F.ry); py.translate(px, 6.5 + 2.5, pz); S.add(py, '#8fb3c2');
        const pk = new THREE.ConeGeometry(7.3, 5.05, 4, 1, true); pk.rotateY(PI / 4 + F.ry); pk.translate(px, 6.5 + 2.5, pz);
        ftext(scene, F, name, F.L * 0.5, H - 2.0, 0.42, 1.4, F.L * 0.3, '#f4f0e4');
      }
    }
    // Satteldach-Sheds aus Glas als Oberlichter
    for (let x = bx + 4; x < bx + bw - 4; x += 10) { const g = dachProfil(bz1 - bz0 - 8, 5, 2.2, 0.3, 'z'); g.translate(x, H, (bz0 + bz1) / 2); S.add(g, '#8fb3c2'); }
    flachdach(S, bx, bz0, bw, bz1 - bz0, H, null, null, '#8f8a82');
    const phx = bx + bw + 3;
    H = Math.max(H, parkhaus(S, scene, p, r, phx, bz0, W - phx - 2, bz1 - bz0 + 6, 4, { akzent: gruen }));
  } else {
    // 90er: helle Paneele, gläserne Tonne über der Mall, Eckturm mit Namen, großes Parkhaus
    const panel = '#e4e6e8', blau = '#1f5f9f'; H = 14;
    S.quader(bx, 0, bz0, bx + bw, H, bz1, panel);
    for (const F of sichtbar(p, bx, bz0, bw, bz1 - bz0)) {
      for (let u = 0; u <= F.L + 0.01; u += 3) fb(S, F, u - 0.05, u + 0.05, 0.3, H, 0, 0.1, '#cfd3d6');
      fb(S, F, -0.1, F.L + 0.1, H - 1.6, H, 0, 0.3, blau);
      fb(S, F, -0.1, F.L + 0.1, 4.8, 5.1, 0, 0.3, '#cfd3d6');
      if (F.s === '+z') {
        const eu = F.L * 0.5;
        fb(S, F, eu - 8, eu + 8, 0.3, H + 3, 0, 3, '#7aa2b8');
        for (let u = eu - 8; u <= eu + 8.01; u += 1.6) fb(S, F, u - 0.06, u + 0.06, 0.3, H + 3, 2.9, 3.1, '#e4e6e8');
        fb(S, F, eu - 9, eu + 9, H + 3, H + 3.6, -1, 4, '#e4e6e8');
        for (const [u, t] of [[F.L * 0.18, 'Elektromarkt'], [F.L * 0.82, 'Supermarkt']]) ladenFront(S, scene, F, u - 7, u + 7, 5, { name: t, blende: waehle(r, ['#c9483e', '#e0b23a', '#2f6f3f']), vordach: 1.6 });
      }
    }
    flachdach(S, bx, bz0, bw, bz1 - bz0, H, panel, null, '#a9adb0', 0.6);
    const tg = new THREE.CylinderGeometry(5, 5, bw - 16, 14, 1, false, 0, PI); tg.rotateZ(PI / 2);
    tg.translate(bx + bw / 2, H, (bz0 + bz1) / 2); S.add(tg, '#9cc0cf');
    for (let x = bx + 9; x < bx + bw - 8; x += 4) { const ring = new THREE.TorusGeometry(5.05, 0.12, 4, 12, PI); ring.rotateY(PI / 2); ring.translate(x, H, (bz0 + bz1) / 2); S.add(ring, '#e4e6e8'); }
    // Eckturm mit Namen
    const tx = bx + 2, tz = bz1 - 8, tH = 28;
    S.quader(tx, 0, tz, tx + 8, tH, tz + 8, blau);
    for (const F of sichtbar(p, tx, tz, 8, 8)) { fb(S, F, 0.8, F.L - 0.8, tH - 6, tH - 1, 0, 0.1, '#f4f2ec'); ftext(scene, F, name.split('-')[0], F.L / 2, tH - 3.5, 0.12, 1.6, F.L - 2, blau); fb(S, F, 1, F.L - 1, 2, tH - 8, 0, 0.06, '#7aa2b8'); }
    S.quader(tx - 0.5, tH, tz - 0.5, tx + 8.5, tH + 0.6, tz + 8.5, '#e4e6e8');
    for (const F of sichtbar(p, bx, bz0, bw, bz1 - bz0)) if (F.s === '+z') ftext(scene, F, name, F.L * 0.5, H - 0.8, 0.32, 1.2, F.L * 0.4, '#ffffff');
    const phx = bx + bw + 3;
    H = Math.max(tH + 1, parkhaus(S, scene, p, r, phx, bz0, W - phx - 2, bz1 - bz0 + 10, 5, { akzent: blau }));
    vorplatzFahnen(S, r, bx + bw * 0.3, bz1 + 3, 6, [blau, '#f4f2ec', '#e0b23a']);
  }
  // Großparkplatz mit Bäumen, Einkaufswagen-Häuschen, Bushaltestelle
  const pz0 = bz1 + (v === '70er' ? 13 : 6), pz1 = D - 2;
  if (pz1 - pz0 > 6) {
    parkplatz(S, r, 2, pz0, v === '70er' ? W - 14 : W - 2, pz1, { dichte: 0.65 });
    for (let x = 8; x < W - 8; x += 18) { boden(S, x - 1.5, pz0 - 1.5, x + 1.5, pz0 + 0.1, RASEN, 0.3, 0.12); baumRund(S, x, pz0 - 0.7, r, 0.85, 0.42); }
    S.quader(W * 0.42, 0.35, pz0 - 4.5, W * 0.42 + 6, 2.6, pz0 - 2.5, '#5f7787'); S.quader(W * 0.42 - 0.2, 2.6, pz0 - 4.7, W * 0.42 + 6.2, 2.8, pz0 - 2.3, '#e0b23a');
  }
  figuren(S, r, bx, bz1 + 0.5, bx + bw, bz1 + 4, Math.round(bw / 4), 0.35);
  westAuto(S, W * 0.15, bz1 + 3.5, 0, 'bus', null, 0.35);
  return { hoehe: H };
}
const ruhrEinkaufszentrum = slot('slot:ruhr_einkaufszentrum', {
  varianten: ['70er', '80er', '90er'], nenn: { '70er': [90, 70, 160, 120], '80er': [100, 70, 160, 120], '90er': [110, 76, 160, 120] },
  roh: ekzRoh,
});

// =====================================================================================
// Ruhr: Bahnhofsvorplatz mit Busbahnhof, Taxistand, Empfangsgebäude
// =====================================================================================
function bahnhofRoh(S, scene, p) {
  const r = rng(`bhf:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  boden(S, 0, 0, W, D, PFLASTER, 0.3, 0.06);
  const stadt = p.name ?? 'Hauptbahnhof';
  // Gleise und Bahnsteigdächer hinten
  const gz1 = 11;
  boden(S, 0, 0, W, gz1, '#9b958a', 0.3, 0.08);
  for (const zz of [2, 9]) gleis(S, 0, zz, W, zz);
  S.quader(0, 0.3, 4, W, 1.1, 7, '#cfccc6');
  for (let x = 4; x < W - 2; x += 10) { S.box(0.4, 4, 0.4, x, 3.1, 5.5, '#5a6168'); balken(S, [x, 5, 3], [x, 5.6, 8], 0.3, 0.3, '#5a6168'); }
  S.quader(2, 5.1, 3.2, W - 2, 5.35, 7.8, '#cfd3d6');
  if (r() < 0.7) westAuto(S, W * 0.45, 9, 0, 'stadtbahn', null, 0.6);
  // Empfangsgebäude
  const ez0 = gz1 + 1, ed = Math.min(16, D * 0.28), ez1 = ez0 + ed, ew = Math.min(W - 8, 70), ex = (W - ew) / 2;
  let H;
  if (v === '70er') {
    const beton = waehle(r, ['#cfc9bc', '#c6c0b2']), bronze = '#5d544b'; H = 13.5;
    S.quader(ex, 0, ez0, ex + ew, H, ez1, beton);
    for (const F of sichtbar(p, ex, ez0, ew, ed)) {
      fb(S, F, 0, F.L, 5.2, 8.2, -0.2, 0.02, bronze); fb(S, F, 0, F.L, 9.0, 12.0, -0.2, 0.02, bronze);
      for (let u = 0; u <= F.L + 0.01; u += 1.8) fb(S, F, u - 0.25, u + 0.25, 4.6, H, 0, 0.35, beton);
      fb(S, F, 0, F.L, 0.3, 4.2, -0.4, -0.3, '#5f7787');
      for (let u = 0; u <= F.L + 0.01; u += 3) fb(S, F, u - 0.1, u + 0.1, 0.3, 4.2, -0.3, 0.05, '#cfd3d6');
      if (F.s === '+z') {
        fb(S, F, -2, F.L + 2, 4.2, 4.8, 0, 7, '#e9e7e1'); fb(S, F, -2, F.L + 2, 4.1, 4.9, 6.9, 7.1, '#3b3f44');
        for (let u = 2; u < F.L; u += 9) fb(S, F, u - 0.25, u + 0.25, 0.3, 4.2, 6.2, 6.7, '#5a6168');
        fb(S, F, F.L * 0.25, F.L * 0.75, H, H + 2.6, -0.5, -0.2, '#2f3438');
        ftext(scene, F, stadt, F.L / 2, H + 1.3, -0.18, 1.8, F.L * 0.48, '#ffffff');
      }
    }
    flachdach(S, ex, ez0, ew, ed, H, beton, null, '#9e9b94', 0.6);
  } else if (v === '50er') {
    // 50er: hohe Glashalle mit feinem Raster, schwebendes Dach, Natursteinflügel
    const stein = '#e3dccb'; H = 13;
    S.quader(ex, 0, ez0, ex + ew * 0.25, 8, ez1, stein); S.quader(ex + ew * 0.75, 0, ez0, ex + ew, 8, ez1, stein);
    S.quader(ex + ew * 0.25, 0, ez0 + 1, ex + ew * 0.75, H, ez1 - 1, '#7aa2b8');
    for (const F of sichtbar(p, ex + ew * 0.25, ez0 + 1, ew * 0.5, ed - 2)) { for (let u = 0; u <= F.L + 0.01; u += 1.2) fb(S, F, u - 0.05, u + 0.05, 0.3, H, 0, 0.12, '#f4f2ec'); for (let y = 2.8; y < H; y += 2.6) fb(S, F, 0, F.L, y - 0.05, y + 0.05, 0, 0.12, '#f4f2ec'); }
    for (const F of sichtbar(p, ex, ez0, ew, ed)) for (let u = 1.5; u < F.L * 0.25 - 0.5; u += 2.4) for (const y of [1.5, 4.8]) { fb(S, F, u - 0.7, u + 0.7, y, y + 1.9, -0.02, 0.06, GLAS); fb(S, F, F.L - u - 0.7, F.L - u + 0.7, y, y + 1.9, -0.02, 0.06, GLAS); }
    const g = new THREE.BoxGeometry(ew * 0.6, 0.35, ed + 4); g.rotateX(-0.06); g.translate(ex + ew / 2, H + 0.4, ez0 + ed / 2 + 1); S.add(g, '#bfc3c6');
    flachdach(S, ex, ez0, ew * 0.25, ed, 8, null, null, '#9e9b94'); flachdach(S, ex + ew * 0.75, ez0, ew * 0.25, ed, 8, null, null, '#9e9b94');
    if (istSicht(p, '+z')) { const F = seitenRahmen(ex, ez0, ew, ed)['+z']; ftext(scene, F, stadt, ew / 2, H - 1.2, 0.15, 1.4, ew * 0.4, '#1f3a5f'); fb(S, F, ew / 2 - 8, ew / 2 + 8, 3.6, 3.9, 0, 4, '#f4f2ec'); }
  } else {
    // Empfangsgebäude um 1910: Backstein mit Werkstein, Halle mit Rundbogenfenster, Uhrturm
    const ziegel = waehle(r, BACKSTEIN), stein = '#e3d6bb'; H = 12;
    backsteinHalle(S, scene, p, { x0: ex, z0: ez0, w: ew, d: ed, H: 9, wand: ziegel, orn: stein, dach: waehle(r, SCHIEFER), dachH: 4.5, achse: 'x', r, fenster: { art: 'rund', b: 1.8, h: 4, y: 1.8, raster: 3.6 } });
    const hw = Math.min(20, ew * 0.34), hx = ex + (ew - hw) / 2;
    backsteinHalle(S, scene, p, { x0: hx, z0: ez0 - 1, w: hw, d: ed + 2, H: 15, wand: ziegel, orn: stein, dach: waehle(r, SCHIEFER), dachH: 6, achse: 'z', r, fenster: { art: 'rund', b: 7, h: 10, y: 2.2, raster: hw - 2 }, lisenen: false });
    const tx = hx + hw + 1, tz = ez1 - 6;
    S.quader(tx, 0, tz, tx + 6, 30, tz + 6, ziegel);
    for (const F of sichtbar(p, tx, tz, 6, 6)) { fscheibeW(S, F, 3, 25.5, 0, 0.15, 1.8, '#f4f0e4'); fscheibeW(S, F, 3, 25.5, 0.15, 0.25, 0.25, '#2f3438'); fb(S, F, -0.2, 6.2, 22.8, 23.3, 0, 0.3, stein); fb(S, F, 2.2, 3.8, 5, 18, 0, 0.06, GLAS); }
    const hm = walmdach(6.8, 6.8, 6); hm.translate(tx + 3, 30, tz + 3); S.add(hm, '#6f9a7d');
    if (istSicht(p, '+z')) ftext(scene, seitenRahmen(hx, ez0 - 1, hw, ed + 2)['+z'], stadt, hw / 2, 13.6, 0.3, 1.1, hw * 0.85, '#f4f0e4');
    H = 37;
  }
  // Vorplatz: Taxistand vor dem Gebäude, Busbahnhof mit Bussteigen, Stadtbahn-Abgang
  const vz0 = ez1 + 2;
  S.quader(ex, 0.36, vz0, ex + ew, 0.4, vz0 + 3, ASPHALT);
  for (let i = 0; i < Math.min(6, Math.floor(ew / 6)); i++) westAuto(S, ex + ew * 0.55 + i * 5.2, vz0 + 1.5, 0, 'taxi', null, 0.4);
  if (istSicht(p, '+z')) { S.box(0.12, 2.6, 0.12, ex + ew * 0.53, 1.7, vz0 + 3.3, '#5a6168'); S.box(1.4, 0.7, 0.1, ex + ew * 0.53, 3.0, vz0 + 3.3, '#f2c62e'); ftext(scene, R(ex + ew * 0.53 - 0.7, vz0 + 3.36, 1, 0, 1.4, '+z'), 'TAXI', 0.7, 3.0, 0, 0.5, 1.2, '#2b2f33'); }
  const bz0 = vz0 + 6, bz1 = D - 2;
  if (bz1 - bz0 > 10) {
    boden(S, 2, bz0, W - 2, bz1, ASPHALT, 0.3, 0.08);
    const nI = Math.min(2, Math.max(1, Math.floor((bz1 - bz0) / 11)));   // GESTALTUNG.md: kleiner Busbahnhof, kein Feld aus Bussteigen
    for (let k = 0; k < nI; k++) {
      const iz = bz0 + 3 + k * 11, il = W - 22;
      S.quader(10, 0.38, iz, 10 + il, 0.6, iz + 3, '#d9d4c8');
      for (let x = 12; x < 10 + il - 1; x += 6) S.box(0.25, 3, 0.25, x, 2.1, iz + 1.5, '#5a6168');
      S.quader(10.5, 3.5, iz - 0.3, 10 + il - 0.5, 3.75, iz + 3.3, '#cfd3d6');
      S.quader(10.5, 3.75, iz + 1.3, 10 + il - 0.5, 3.8, iz + 1.7, '#d23c32');
      const nb = Math.max(1, Math.floor(il / 15));
      for (let i = 0; i < nb; i++) if (r() < 0.8) westAuto(S, 18 + i * 15, iz + 5, r() < 0.5 ? 0 : PI, r() < 0.4 ? 'gelenkbus' : 'bus', waehle(r, ['#f2f0ea', '#e0b23a', '#f2f0ea']), 0.38);
      figuren(S, r, 11, iz + 0.3, 10 + il - 1, iz + 2.7, Math.round(il / 5), 0.6);
    }
    // Stadtbahn-Abgang mit Glasdach und U-Schild
    const ux = W - 9, uz = bz0 + 3;
    S.quader(ux - 2, 0.38, uz, ux + 2, 0.5, uz + 7, '#3b3f44');
    const gd = new THREE.BoxGeometry(4.6, 0.15, 7.4); gd.rotateX(0.12); gd.translate(ux, 2.8, uz + 3.5); S.add(gd, '#9cc0cf');
    for (const dx of [-2.2, 2.2]) S.quader(ux + dx - 0.08, 0.38, uz, ux + dx + 0.08, 2.6, uz + 7, '#5a6168');
    S.box(0.15, 3.6, 0.15, ux + 3, 2.1, uz + 7.5, '#5a6168'); S.box(1.2, 1.2, 0.2, ux + 3, 4.2, uz + 7.5, '#1f4f9f');
    ftext(scene, R(ux + 2.4, uz + 7.62, 1, 0, 1.2, '+z'), 'U', 0.6, 4.2, 0, 1.0, 1.0, '#ffffff');
  }
  // Uhr, Fahrradständer, Bäume, Kiosk
  S.box(0.2, 4, 0.2, ex - 2, 2.3, vz0 + 1, '#3b3f44'); fscheibeW(S, R(ex - 2.7, vz0 + 1.1, 1, 0, 1.4, '+z'), 0.7, 4.6, 0, 0.12, 0.6, '#f4f2ec');
  for (let i = 0; i < 8; i++) S.box(0.06, 0.7, 1.6, 3 + i * 0.6, 0.75, vz0 + 2, '#59636b');
  for (let x = 6; x < W - 4; x += 14) baumRund(S, x, D - 1.2, r, 0.9, 0.38);
  figuren(S, r, ex, ez1 + 0.4, ex + ew, vz0, Math.round(ew / 3), 0.36);
  return { hoehe: H };
}
const ruhrBahnhof = slot('slot:ruhr_bahnhof', {
  varianten: ['70er', '50er', 'altbau'], nenn: { '70er': [70, 54, 120, 80], '50er': [70, 54, 120, 80], altbau: [70, 54, 120, 80] },
  roh: bahnhofRoh,
});

// =====================================================================================
// Ruhr: Stadion eines erfundenen Vereins
// =====================================================================================
const VEREINE = [
  { name: 'SV Haldenstern 1921', kurz: 'Haldenstern', farben: ['#1f4f9f', '#f4f2ec'] },
  { name: 'FC Emscherbrück 1907', kurz: 'Emscherbrück', farben: ['#2f7d3f', '#f4f2ec'] },
  { name: 'VfB Haldenberg 1912', kurz: 'Haldenberg', farben: ['#c9302c', '#f4f2ec'] },
  { name: 'TuS Grubenfeld 1911', kurz: 'Grubenfeld', farben: ['#e07a2a', '#2b2f33'] },
];
function spielfeld(S, cx, cz, L, B, y = 0.38) {
  S.quader(cx - L / 2 - 3, 0.3, cz - B / 2 - 3, cx + L / 2 + 3, y, cz + B / 2 + 3, '#6fae5a');
  for (let i = 0; i < 10; i++) if (i % 2) S.quader(cx - L / 2 + (i * L) / 10, y, cz - B / 2, cx - L / 2 + ((i + 1) * L) / 10, y + 0.02, cz + B / 2, '#7bb965');
  const m = '#f4f2ec', t = 0.25, yy = y + 0.03;
  S.quader(cx - L / 2, yy, cz - B / 2, cx + L / 2, yy + 0.02, cz - B / 2 + t, m); S.quader(cx - L / 2, yy, cz + B / 2 - t, cx + L / 2, yy + 0.02, cz + B / 2, m);
  S.quader(cx - L / 2, yy, cz - B / 2, cx - L / 2 + t, yy + 0.02, cz + B / 2, m); S.quader(cx + L / 2 - t, yy, cz - B / 2, cx + L / 2, yy + 0.02, cz + B / 2, m);
  S.quader(cx - t / 2, yy, cz - B / 2, cx + t / 2, yy + 0.02, cz + B / 2, m);
  const ring = new THREE.TorusGeometry(B * 0.13, 0.12, 3, 24); ring.rotateX(PI / 2); ring.translate(cx, yy + 0.02, cz); S.add(ring, m);
  for (const s of [-1, 1]) {
    const x0 = cx + s * L / 2, x1 = cx + s * (L / 2 - L * 0.15), bz = B * 0.4;
    S.quader(Math.min(x0, x1), yy, cz - bz / 2, Math.max(x0, x1), yy + 0.02, cz - bz / 2 + t, m); S.quader(Math.min(x0, x1), yy, cz + bz / 2 - t, Math.max(x0, x1), yy + 0.02, cz + bz / 2, m);
    S.quader(x1 - t / 2, yy, cz - bz / 2, x1 + t / 2, yy + 0.02, cz + bz / 2, m);
    S.quader(x0 + s * 0.1 - 0.1, y, cz - 2, x0 + s * 0.1 + 0.1, y + 2.4, cz - 1.8, m); S.quader(x0 + s * 0.1 - 0.1, y, cz + 1.8, x0 + s * 0.1 + 0.1, y + 2.4, cz + 2, m); S.quader(x0 + s * 0.1 - 0.1, y + 2.3, cz - 2, x0 + s * 0.1 + 0.1, y + 2.5, cz + 2, m);
  }
}
/** Tribüne als Stufenblock entlang eines Rahmens F (u = Länge, t nach außen = vom Feld weg). */
function tribuene(S, F, u0, u1, stufen, tiefe, hoehe, farben, o = {}) {
  const st = tiefe / stufen, sh = hoehe / stufen;
  for (let k = 0; k < stufen; k++) {
    const t0 = k * st, y = (o.y0 ?? 0.38) + k * sh;
    fb(S, F, u0, u1, 0.3, y + sh, t0, t0 + st, o.beton ?? '#c9c6bf');
    if (farben) {
      const n = Math.max(1, Math.round((u1 - u0) / 8)), du = (u1 - u0) / n;
      for (let i = 0; i < n; i++) fb(S, F, u0 + i * du + 0.3, u0 + (i + 1) * du - 0.3, y + sh, y + sh + 0.35, t0 + st * 0.1, t0 + st * 0.7, farben[(i + k + (o.salz ?? 0)) % farben.length]);
    }
  }
  return (o.y0 ?? 0.38) + hoehe;
}
function flutlicht(S, x, z, h, ry, c = '#9aa1a7') {
  gitterturm(S, x - 0.8, z - 0.8, x + 0.8, z + 0.8, 0.3, h, c, 5, 0.3);
  const g = new THREE.BoxGeometry(5, 3.6, 0.6); g.rotateX(0.35); g.rotateY(ry); g.translate(x, h + 1.8, z); S.add(g, '#5a6168');
  const g2 = new THREE.BoxGeometry(4.6, 3.2, 0.2); g2.translate(0, 0, 0.35); g2.rotateX(0.35); g2.rotateY(ry); g2.translate(x, h + 1.8, z); S.add(g2, '#f6f3d8');
}
function stadionRoh(S, scene, p) {
  const r = rng(`stadion:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  const ver = VEREINE.find((q) => q.name === p.name) ?? waehle(r, VEREINE);
  boden(S, 0, 0, W, D, v === 'kampfbahn' ? RASEN : ASPHALT, 0.3, 0.05);
  const cx = W / 2, cz = D / 2 - 2, L = Math.min(76, W - (v === 'kampfbahn' ? 52 : 44)), B = Math.min(48, D - 40);
  const [f1, f2] = ver.farben;
  let H;
  if (v === 'kampfbahn') {
    // Laufbahn, überdachte Haupttribüne, Stehwälle, vier Flutlichtmasten
    // Laufbahn als Ring um den Rasen: zwei Geraden und zwei Halbkreisringe (innen Rasen), Kurvenmitte so gewählt,
    // dass die Spielfeldecken innerhalb der Innenkante liegen; die Stehwälle stehen außerhalb der Kurven.
    const tr = 6.5, ri = B / 2 + 2, rb = ri + tr, LF = L - 4, BF = B - 2;
    const c = Math.max(4, LF / 2 - Math.sqrt(Math.max(0, ri * ri - (BF / 2 + 0.5) ** 2)));
    const BAHN = '#b8553f';
    for (const sz of [-1, 1]) S.quader(cx - c, 0.3, cz + (sz < 0 ? -rb : ri), cx + c, 0.36, cz + (sz < 0 ? -ri : rb), BAHN);
    const ring = (r0, r1, f, y) => { for (const sx of [-1, 1]) { const g = new THREE.RingGeometry(r0, r1, 28, 1, sx > 0 ? -PI / 2 : PI / 2, PI); g.rotateX(-PI / 2); g.translate(cx + sx * c, y, cz); S.add(g, f); } };
    ring(ri, rb, BAHN, 0.36);
    // weiße Bahnlinien und Innenbord
    ring(ri - 0.25, ri, '#f1efe9', 0.37);
    for (const rr of [ri + tr / 3, ri + (2 * tr) / 3]) { ring(rr - 0.06, rr + 0.06, '#e9d6cf', 0.37); for (const sz of [-1, 1]) S.quader(cx - c, 0.36, cz + sz * rr - 0.06, cx + c, 0.37, cz + sz * rr + 0.06, '#e9d6cf'); }
    for (const sz of [-1, 1]) S.quader(cx - c, 0.36, cz + sz * (ri - 0.125) - 0.125, cx + c, 0.37, cz + sz * (ri - 0.125) + 0.125, '#f1efe9');
    spielfeld(S, cx, cz, LF, BF, 0.38);
    // Stehwälle aus Erde mit Stufen: Längsseite +z entlang der Geraden, Kurvenseiten ±x außerhalb des Rings
    const ex = c + rb + 0.5;
    const F = seitenRahmen(cx - ex, cz - rb, 2 * ex, 2 * rb);
    for (const s of ['+z', '+x', '-x']) {
      const G = F[s], n = s === '+z' ? 6 : 4;
      for (let k = 0; k < n; k++) fb(S, G, -2 - k * 0.6, G.L + 2 + k * 0.6, 0.3, 0.9 + k * 0.6, k * 1.0 + 1, k * 1.0 + 2, k % 2 ? '#c9c6bf' : '#d6d3cc');
      fb(S, G, -n + 0, G.L + n, 0.3, 0.9 + n * 0.6, n + 1, n + 3, '#8fb873');
      if (s === '+z') for (let u = 4; u < G.L; u += 9) fb(S, G, u - 0.1, u + 0.1, 4.2, 5.4, 6.5, 6.6, '#5a6168');
    }
    // Haupttribüne hinten (-z) mit Dach auf Stahlträgern (Breite wie das Spielfeld)
    const G = seitenRahmen(cx - L / 2 - 2, cz - rb, L + 4, 2 * rb)['-z'];
    H = tribuene(S, G, 6, G.L - 6, 10, 12, 8, [f1, f2], { salz: 1 });
    fb(S, G, 6, G.L - 6, 0.3, H + 3.5, 12, 13, '#e2ddd2');
    for (let u = 8; u < G.L - 6; u += 8) { const [ax, az] = wp(G, u, 12.5), [bx, bz] = wp(G, u, -1.2); balken(S, [ax, H + 4.5, az], [bx, H + 2.5, bz], 0.4, 0.8, '#3b3f44'); fb(S, G, u - 0.2, u + 0.2, 0.3, H + 2.4, -0.9, -0.5, '#3b3f44'); }
    fb(S, G, 6, G.L - 6, H + 2.4, H + 2.9, -1.5, 13, '#e9e7e1');
    fb(S, G, 6, G.L - 6, H + 2.0, H + 2.9, -1.5, -1.3, f1);
    ftext(scene, R(...wp(G, G.L - 6, -1.55), -G.dx, -G.dz, G.L - 12, '+z'), ver.name, (G.L - 12) / 2, H + 2.45, 0, 0.45, G.L * 0.5, '#ffffff');
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) flutlicht(S, cx + dx * (L / 2 + 8), cz + dz * (rb + 2), 32, Math.atan2(-dx, -dz));
    H = 36;
    // Kassenhäuschen und Parkplatz
    for (const xx of [cx - 10, cx + 10]) { S.quader(xx - 2, 0.3, D - 6, xx + 2, 3, D - 3, '#e2ddd2'); S.quader(xx - 2.2, 3, D - 6.2, xx + 2.2, 3.4, D - 2.8, f1); }
    figuren(S, r, 4, D - 8, W - 4, D - 1, 18, 0.38);
  } else if (v === 'stadion70') {
    // Vier Tribünen, Dächer der Längsseiten an Pylonen abgehängt, Anzeigetafel
    spielfeld(S, cx, cz, L, B, 0.38);
    const F = seitenRahmen(cx - L / 2 - 3, cz - B / 2 - 3, L + 6, B + 6);
    const hoch = 12, tief = 16;
    for (const s of ['+z', '+x', '-z', '-x']) tribuene(S, F[s], s[1] === 'z' ? 0 : 0, F[s].L, 12, tief, hoch, s[1] === 'z' ? [f1, f1, f2] : [f2, f1], { salz: s === '+z' ? 0 : 1 });
    {
      const X0 = cx - L / 2 - 3, X1 = cx + L / 2 + 3, Z0 = cz - B / 2 - 3, Z1 = cz + B / 2 + 3, n = 12, st = tief / n, sh = hoch / n;
      for (const [X, sx] of [[X0, -1], [X1, 1]]) for (const [Zc, sz] of [[Z0, -1], [Z1, 1]]) for (let k = 0; k < n; k++) {
        const y = 0.38 + (k + 1) * sh, a0 = k * st, a1 = (k + 1) * st;
        const q = (x0, x1, z0, z1, c, yy0 = 0.3, yy1 = y) => S.quader(Math.min(X + sx * x0, X + sx * x1), yy0, Math.min(Zc + sz * z0, Zc + sz * z1), Math.max(X + sx * x0, X + sx * x1), yy1, Math.max(Zc + sz * z0, Zc + sz * z1), c);
        q(0, a1, a0, a1, '#c9c6bf'); q(a0, a1, 0, a0, '#c9c6bf');
        q(0.3, a1 - 0.1, a0 + st * 0.1, a0 + st * 0.7, k % 2 ? f2 : f1, y, y + 0.35); q(a0 + st * 0.1, a0 + st * 0.7, 0.3, a0, k % 2 ? f2 : f1, y, y + 0.35);
        if (k === n - 1) { q(0, tief + 0.6, tief, tief + 0.6, '#d6d3cc', 0.3, hoch + 1.6); q(tief, tief + 0.6, 0, tief, '#d6d3cc', 0.3, hoch + 1.6); q(0, tief + 0.6, tief + 0.4, tief + 0.7, f1, hoch - 1, hoch); q(tief + 0.4, tief + 0.7, 0, tief + 0.6, f1, hoch - 1, hoch); }
      }
    }
    for (const s of ['+z', '-z']) {
      const G = F[s];
      fb(S, G, 4, G.L - 4, hoch + 6, hoch + 6.6, -1, tief + 1, '#e9e7e1');
      fb(S, G, 4, G.L - 4, hoch + 5.6, hoch + 6.6, -1.3, -1, f1);
      fb(S, G, 0, G.L, 0.3, hoch + 6, tief, tief + 0.6, '#d6d3cc');
      fb(S, G, 0, G.L, hoch - 1, hoch, tief + 0.6, tief + 0.75, f1);
      for (let u = 3; u < G.L; u += 6) fb(S, G, u - 0.3, u + 0.3, 0.3, hoch + 6, tief + 0.6, tief + 0.9, '#c4c0b8');
      for (let u = 9; u < G.L - 3; u += 18) fb(S, G, u - 1.6, u + 1.6, 0.3, 3.2, tief + 0.6, tief + 0.7, '#3b3f44');
      for (const u of [4, G.L / 2, G.L - 4]) {
        const [px, pz] = wp(G, u, tief + 3); zyl(S, 0.6, 0.9, hoch + 18, px, 0, pz, '#e9e7e1', 8);
        for (const tt of [tief * 0.5, -1]) { const [qx, qz] = wp(G, u, tt); stab(S, [px, hoch + 17, pz], [qx, hoch + 6.6, qz], 0.08, '#3b3f44', 4); }
      }
      const Gi = R(...wp(G, G.L, -1.32), -G.dx, -G.dz, G.L, '');
      ftext(scene, Gi, ver.name, G.L / 2, hoch + 6.1, 0, 0.7, G.L * 0.4, '#ffffff');
      if (istSicht(p, s)) ftext(scene, G, ver.name, G.L / 2, hoch + 3.5, tief + 0.62, 1.6, G.L * 0.5, f1);
    }
    // Anzeigetafel in der Ecke
    const [ax, az] = [cx + L / 2 + 6, cz + B / 2 + 6];
    S.box(0.5, 14, 0.5, ax, 7.3, az, '#5a6168'); const tf = new THREE.BoxGeometry(9, 4.5, 0.6); tf.rotateY(-PI / 4 + PI); tf.translate(ax, 14, az); S.add(tf, '#2b2f33');
    H = hoch + 19;
    parkplatz(S, r, 2, D - 10, W - 2, D - 1, { dichte: 0.8 });
  } else {
    // Arena: geschlossene Schüssel, Membranfassade in Vereinsfarben, Dachring mit Öffnung
    const aw = L + 36, ad = B + 32;
    const ax0 = cx - aw / 2, az0 = cz - ad / 2, Ha = 26;
    spielfeld(S, cx, cz, L, B, 0.38);
    const Fi = seitenRahmen(cx - L / 2 - 3, cz - B / 2 - 3, L + 6, B + 6);
    for (const s of ['+z', '+x', '-z', '-x']) tribuene(S, Fi[s], -(s[1] === 'z' ? 12 : 12), Fi[s].L + 12, 14, s[1] === 'z' ? (ad - B - 6) / 2 - 1.5 : (aw - L - 6) / 2 - 1.5, Ha - 5, [f1, f2, f1], { salz: s === '+z' ? 0 : 1 });
    for (const [x0, z0, x1, z1] of [[ax0, az0, ax0 + aw, az0 + 1.5], [ax0, az0 + ad - 1.5, ax0 + aw, az0 + ad], [ax0, az0, ax0 + 1.5, az0 + ad], [ax0 + aw - 1.5, az0, ax0 + aw, az0 + ad]]) S.quader(x0, 0, z0, x1, Ha, z1, '#d9dcdf');
    for (const F of sichtbar(p, ax0, az0, aw, ad)) {
      for (let k = 0; k < 4; k++) fb(S, F, -0.1, F.L + 0.1, 3 + k * 5.5, 3 + k * 5.5 + 3.6, 0, 0.4, k % 2 ? f1 : heller(f1, 0.08));
      for (let u = 0; u <= F.L; u += 6) fb(S, F, u - 0.25, u + 0.25, 0.3, Ha, 0, 0.6, '#e9e7e1');
      fb(S, F, 0, F.L, 0.3, 3, -0.2, 0.02, '#5f7787');
      if (F.L > 60) ftext(scene, F, `${ver.kurz}-Arena`, F.L / 2, Ha - 4.5, 0.65, 3.2, F.L * 0.55, '#ffffff');
    }
    // Dachring mit Öffnung über dem Feld
    const o0 = 4;
    for (const [x0, z0, x1, z1] of [[ax0 - 1, az0 - 1, ax0 + aw + 1, cz - B / 2 - o0], [ax0 - 1, cz + B / 2 + o0, ax0 + aw + 1, az0 + ad + 1], [ax0 - 1, cz - B / 2 - o0, cx - L / 2 - o0, cz + B / 2 + o0], [cx + L / 2 + o0, cz - B / 2 - o0, ax0 + aw + 1, cz + B / 2 + o0]]) S.quader(x0, Ha, z0, x1, Ha + 2.5, z1, '#eef0f1');
    for (const [x0, x1] of [[cx - L / 2 - o0, cx - L / 2 - o0 + 0.6], [cx + L / 2 + o0 - 0.6, cx + L / 2 + o0]]) S.quader(x0, Ha - 0.6, cz - B / 2 - o0, x1, Ha + 2.5, cz + B / 2 + o0, '#3b3f44');
    H = Ha + 3;
    parkplatz(S, r, 2, D - 9, W - 2, D - 1, { dichte: 0.8 });
    vorplatzFahnen(S, r, cx - 8, az0 + ad + 2, 7, [f1, f2]);
    figuren(S, r, ax0, az0 + ad + 0.5, ax0 + aw, az0 + ad + 5, 30, 0.35);
  }
  return { hoehe: H };
}
const ruhrStadion = slot('slot:ruhr_stadion', {
  varianten: ['kampfbahn', 'stadion70', 'arena'], nenn: { kampfbahn: [124, 96, 170, 130], stadion70: [124, 96, 170, 130], arena: [124, 96, 170, 130] },
  roh: stadionRoh,
});

// =====================================================================================
// Rheinland: Gründerzeitzeile (Köln/Düsseldorf-Typ)
// =====================================================================================
const RHEIN_PUTZ = ['#f4efe4', '#ece4d2', '#efe6d0', '#e3e6e2', '#f0e2d0', '#dfe4e8', '#f2e9da', '#e8e0cf', '#eadfd0', '#e2e8e4'];
const RHEIN_LADEN = ['Kaffeehaus Breuer', 'Weinhaus am Rhein', 'Brauhaus Zur Linde', 'Galerie Pütz', 'Optik Schmitz', 'Buchhandlung Klein', 'Feinkost Mertens', 'Mode Kürten',
  'Confiserie Becker', 'Antiquariat Kremer', 'Juwelier Eschweiler', 'Blumen Nießen', 'Apotheke am Ring', 'Schuhhaus Wingender', 'Café Kreuzer', 'Hutmacher Kaiser'];
/** Wandfeld mit Rundbogen-Öffnungen (Arkade, Kasematten). */
function lochwand(S, F, u0, u1, y0, y1, t0, t1, c, oeffnungen) {
  const s = new THREE.Shape();
  s.moveTo(u0, y0); s.lineTo(u1, y0); s.lineTo(u1, y1); s.lineTo(u0, y1); s.lineTo(u0, y0);
  for (const o of oeffnungen) s.holes.push(bogenForm(o.u0, o.v0, o.u1, o.v1, o.art ?? 'rund'));
  fform(S, F, s, t0, t1, c, 8);
}
function stuckFenster(S, F, u, y, fw, fh, c, k, r, o = {}) {
  fb(S, F, u - fw / 2 - 0.22, u + fw / 2 + 0.22, y - 0.18, y + fh + 0.12, 0, 0.1, c.orn);
  fb(S, F, u - fw / 2, u + fw / 2, y, y + fh, 0.02, 0.14, c.glas);
  fb(S, F, u - 0.04, u + 0.04, y, y + fh, 0.02, 0.17, '#f6f3ec');
  fb(S, F, u - fw / 2, u + fw / 2, y + fh * 0.7, y + fh * 0.7 + 0.07, 0.02, 0.17, '#f6f3ec');
  fb(S, F, u - fw / 2 - 0.35, u + fw / 2 + 0.35, y - 0.32, y - 0.16, 0, 0.26, c.orn);
  const art = o.verdachung ?? 'gerade';
  if (art === 'dreieck') fpoly(S, F, [[u - fw / 2 - 0.4, y + fh + 0.18], [u + fw / 2 + 0.4, y + fh + 0.18], [u, y + fh + 0.85]], 0, 0.28, c.orn);
  else if (art === 'segment') fform(S, F, bogenForm(u - fw / 2 - 0.4, y + fh + 0.12, u + fw / 2 + 0.4, y + fh + 0.7, 'segment'), 0, 0.26, c.orn);
  else if (art === 'gerade') fb(S, F, u - fw / 2 - 0.4, u + fw / 2 + 0.4, y + fh + 0.12, y + fh + 0.34, 0, 0.3, c.orn);
  if (o.bruestung) fb(S, F, u - fw / 2, u + fw / 2, y - 1.0, y - 0.4, 0, 0.12, c.orn);
  if (o.balkon) {
    fb(S, F, u - fw / 2 - 0.6, u + fw / 2 + 0.6, y - 0.3, y - 0.12, 0, 1.0, c.orn);
    fb(S, F, u - fw / 2 - 0.6, u + fw / 2 + 0.6, y + 0.65, y + 0.72, 0.95, 1.0, '#2f3438');
    for (let q = u - fw / 2 - 0.5; q <= u + fw / 2 + 0.55; q += 0.25) fb(S, F, q - 0.02, q + 0.02, y - 0.12, y + 0.7, 0.95, 0.99, '#2f3438');
  }
}
/** Mansarddach über einem Haus der Zeile (First entlang x). */
function mansarde(S, p, x0, z0, w, d, H, dach, c, gauben, r) {
  const unten = dachProfil(w, d + 0.5, 3.4, d - 3.2, 'x'); unten.translate(x0 + w / 2, H, z0 + d / 2); S.add(unten, dach);
  const oben = dachProfil(w, d - 3.2, 1.4, 0.4, 'x'); oben.translate(x0 + w / 2, H + 3.4, z0 + d / 2); S.add(oben, dunkler(dach, 0.04));
  if (gauben) for (const F of sichtbar(p, x0, z0, w, d)) if (F.s[1] === 'z') {
    const n = Math.max(1, Math.round(w / 3.4));
    for (let i = 0; i < n; i++) {
      const u = (w * (i + 0.5)) / n;
      fb(S, F, u - 0.75, u + 0.75, H + 0.6, H + 2.6, -1.2, 0.0, c.orn);
      fform(S, F, bogenForm(u - 0.5, H + 0.8, u + 0.5, H + 2.4, 'rund'), 0, 0.06, c.glas);
      fform(S, F, bogenForm(u - 0.85, H + 2.5, u + 0.85, H + 3.1, 'segment'), -1.2, 0.08, dach);
    }
  }
  return H + 4.8;
}
function gruenderzeitHaus(S, scene, p, r, o) {
  const { x0, z0, w, d, n } = o, egH = o.egH ?? 4.2, gh = o.gh ?? 3.5, H = egH + n * gh;
  const c = { wand: o.wand, orn: o.orn ?? heller(o.wand, 0.04), glas: GLAS, sockel: o.sockel ?? dunkler(o.wand, 0.1) };
  S.quader(x0, 0, z0, x0 + w, H, z0 + d, c.wand);
  const achsen = Math.max(2, Math.round(w / 2.6));
  for (const F of sichtbar(p, x0, z0, w, d)) {
    const front = F.s === '+z' || F.s === '-z';
    if (!front) {
      // Brandwand am Zeilenende: dunklerer Rauputz, Abdruck des früheren Nachbarhauses, Kaminzug, Sockel, Putzflicken
      const bw = dunkler(c.wand, 0.12);
      fb(S, F, 0, F.L, 0.3, H, 0, 0.04, bw);
      const hn = Math.min(H - 1.2, egH + Math.max(1, n - 1) * gh);
      fb(S, F, 0.15, F.L - 0.15, 0.3, hn, 0.04, 0.06, dunkler(c.wand, 0.2));
      for (let y = 1.0 + gh; y < H - 0.4; y += gh) fb(S, F, 0, F.L, y - 0.05, y + 0.05, 0.04, 0.08, dunkler(c.wand, 0.13));
      fb(S, F, -0.03, F.L + 0.03, 0.3, 1.0, 0, 0.12, c.sockel);
      const uk = F.L * zw(r, 0.3, 0.45);
      fb(S, F, uk - 0.6, uk + 0.6, 1.0, H + 2.2, 0, 0.32, dunkler(c.wand, 0.06));
      fb(S, F, uk - 0.72, uk + 0.72, H + 2.2, H + 2.45, -0.1, 0.42, dunkler(c.wand, 0.2));
      for (let i = 0; i < 3; i++) { const u = zw(r, 1, F.L - 3), y = zw(r, 1.5, H - 3); fb(S, F, u, u + zw(r, 1, 2.2), y, y + zw(r, 0.6, 1.4), 0.06, 0.08, i % 2 ? heller(bw, 0.04) : dunkler(bw, 0.05)); }
      continue;
    }
    const strasse = F.s === '+z';
    const ra = F.L / achsen;
    // Erdgeschoss: Rustika oder Laden
    if (strasse && o.laden) {
      ladenFront(S, scene, F, 0.4, F.L - 0.4, egH, { name: o.laden, blende: waehle(r, ['#2b2f33', '#1f3a5f', '#6b2e35', '#f4f2ec', '#3f5f4f']), vordach: false, auslage: r, tief: -0.3 });
      fb(S, F, -0.05, F.L + 0.05, egH - 0.1, egH + 0.25, 0, 0.35, c.orn);
    } else {
      for (let y = 0.9; y < egH - 0.3; y += 0.55) fb(S, F, -0.03, F.L + 0.03, y, y + 0.06, 0, 0.12, dunkler(c.wand, 0.05));
      fb(S, F, -0.05, F.L + 0.05, 0.3, 1.0, 0, 0.14, c.sockel);
      for (let i = 0; i < achsen; i++) {
        const u = (i + 0.5) * ra;
        if (strasse && i === (o.tuerAchse ?? 0)) { fform(S, F, bogenForm(u - 0.75, 0.3, u + 0.75, 3.4, 'rund'), 0, 0.12, '#5a3a2a'); fb(S, F, u - 1, u + 1, 0.3, 0.7, 0, 0.9, '#cfc8b8'); }
        else stuckFenster(S, F, u, 1.6, 1.15, 2.0, c, 0, r, { verdachung: null });
      }
      fb(S, F, -0.05, F.L + 0.05, egH - 0.1, egH + 0.25, 0, 0.3, c.orn);
    }
    // Obergeschosse
    const erker = strasse && o.erker && F.L > 7;
    const eu0 = F.L / 2 - 1.8, eu1 = F.L / 2 + 1.8;
    for (let k = 0; k < n; k++) {
      const y = egH + k * gh + 0.8;
      for (let i = 0; i < achsen; i++) {
        const u = (i + 0.5) * ra;
        if (erker && u > eu0 && u < eu1 && k < n - 1) continue;
        const verd = !strasse ? null : k === 0 ? (i % 2 ? 'dreieck' : 'segment') : k === 1 ? 'gerade' : null;
        stuckFenster(S, F, u, y, 1.15, 2.1, c, k, r, { verdachung: verd, balkon: strasse && o.balkone && k === 0 && (i === 0 || i === achsen - 1), bruestung: strasse && k === n - 1 });
      }
      if (strasse) fb(S, F, -0.04, F.L + 0.04, egH + (k + 1) * gh - 0.18, egH + (k + 1) * gh, 0, 0.2, c.orn);
    }
    if (erker) {
      // Kastenerker über zwei bis drei Geschosse mit Balkon obenauf
      const ey0 = egH + 0.2, ey1 = egH + (n - 1) * gh;
      fb(S, F, eu0, eu1, ey0, ey1, 0, 1.0, c.wand);
      fb(S, F, eu0 - 0.15, eu1 + 0.15, ey0 - 0.4, ey0, 0, 1.15, c.orn);
      for (let k = 0; k < n - 1; k++) {
        const y = egH + k * gh + 0.8;
        for (const u of [eu0 + 0.9, eu1 - 0.9]) { fb(S, F, u - 0.6, u + 0.6, y, y + 2.0, 1.0, 1.08, c.glas); fb(S, F, u - 0.75, u + 0.75, y + 2.05, y + 2.25, 1.0, 1.15, c.orn); }
        fb(S, F, eu0, eu1, y - 0.5, y - 0.3, 1.0, 1.12, c.orn);
      }
      fb(S, F, eu0 - 0.15, eu1 + 0.15, ey1, ey1 + 0.2, 0, 1.2, c.orn);
      fb(S, F, eu0 - 0.1, eu1 + 0.1, ey1 + 0.9, ey1 + 1.0, 1.1, 1.2, '#2f3438');
      for (let q = eu0; q <= eu1; q += 0.3) fb(S, F, q - 0.02, q + 0.02, ey1 + 0.2, ey1 + 0.95, 1.1, 1.18, '#2f3438');
    }
    // Hauptgesims mit Konsolen
    fb(S, F, -0.1, F.L + 0.1, H - 0.5, H, 0, 0.55, c.orn);
    if (strasse) for (let u = 0.4; u < F.L; u += 0.8) fb(S, F, u - 0.12, u + 0.12, H - 0.85, H - 0.5, 0, 0.35, c.orn);
  }
  const top = o.dachForm === 'flach' ? (flachdach(S, x0, z0, w, d, H, c.orn, null), H + 0.6) : mansarde(S, p, x0, z0, w, d, H, o.dach, c, true, r);
  S.box(0.8, 2.4, 1.6, x0 + w - 0.6, top - 0.2, z0 + d / 2, dunkler(c.wand, 0.08));
  if (o.zwerch && istSicht(p, '+z')) {
    const F = seitenRahmen(x0, z0, w, d)['+z'];
    fb(S, F, w / 2 - 1.8, w / 2 + 1.8, H - 0.3, H + 3.2, -1.5, 0.1, c.wand);
    fpoly(S, F, [[w / 2 - 2.1, H + 3.2], [w / 2 + 2.1, H + 3.2], [w / 2, H + 5.0]], -1.5, 0.2, c.orn);
    stuckFenster(S, F, w / 2, H + 0.6, 1.2, 1.9, c, 0, r, { verdachung: null });
    const zd = dachProfil(4.6, 3.6, 1.9, 0.2, 'z'); zd.translate(x0 + w / 2, H + 3.2, z0 + d - 1.4); S.add(zd, o.dach);
  }
  return top;
}
function rheinGruenderzeitRoh(S, scene, p) {
  const r = rng(`rgz:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  boden(S, 0, 0, W, D, '#bdb8ad', 0.3, 0.05);
  boden(S, 0, D - 4, W, D, PFLASTER, 0.3, 0.08);
  const hd = Math.min(15, D - 6), hz = D - 4 - hd;
  const namen = mischListe(RHEIN_LADEN, r);
  const breiten = []; let x = 0;
  while (x < W - 0.5) { let b = zw(r, 7.5, 11.5); if (W - x - b < 6) b = W - x; breiten.push([x, b]); x += b; }
  let H = 0;
  breiten.forEach(([bx, bw], i) => {
    const eck = v === 'eck' && i === breiten.length - 1;
    const wand = waehle(r, RHEIN_PUTZ);
    const h = gruenderzeitHaus(S, scene, p, r, { x0: bx, z0: hz, w: bw, d: hd, n: eck ? 4 : 3 + (r() < 0.55 ? 1 : 0), wand, dach: waehle(r, SCHIEFER), laden: v !== 'wohnen' || eck ? namen[i] : null,
      erker: r() < 0.55 || eck, balkone: r() < 0.5, zwerch: r() < 0.3, tuerAchse: Math.floor(r() * 2) });
    H = Math.max(H, h);
    if (eck) {
      // Eckturm mit Schieferhelm
      const tx = bx + bw - 2.2, tz = hz + hd - 2.2, tr = 2.6, tH = h + 2;
      zyl(S, tr, tr, tH, tx, 0, tz, wand, 8);
      for (let k = 1; k < 5; k++) zyl(S, tr + 0.08, tr + 0.08, 0.25, tx, 4.2 + (k - 1) * 3.5, tz, heller(wand, 0.04), 8, true);
      for (let k = 0; k < 4; k++) for (let a = 0; a < 3; a++) { const ang = PI * 0.0 + a * (PI / 4) + PI * 0.12; const g = new THREE.BoxGeometry(0.1, 2.0, 0.9); g.rotateY(-ang); g.translate(tx + Math.cos(ang) * tr, 5.2 + k * 3.5, tz + Math.sin(ang) * tr); S.add(g, GLAS); }
      const helm = new THREE.ConeGeometry(tr + 0.4, 7, 8); helm.translate(tx, tH + 3.5, tz); S.add(helm, waehle(r, SCHIEFER));
      kugel(S, tx, tH + 7.3, tz, 0.35, '#c9a24a');
      H = Math.max(H, tH + 7.6);
    }
  });
  // Gehweg mit Bäumen und Laternen
  for (let xx = 5; xx < W - 2; xx += 11) { laterne(S, xx, D - 0.8, 4.5, 0.38, 'alt', '#2f3438'); }
  figuren(S, r, 1, D - 3.6, W - 1, D - 0.4, Math.round(W / 5), 0.38);
  if (W > 30) westAuto(S, W * 0.4, D - 1.3, 0, 'pkw', waehle(r, AUTOFARBEN), 0.38);
  // Hof
  if (hz > 4) { boden(S, 1, 1, W - 1, hz - 1, RASEN2, 0.3, 0.07); for (let i = 0; i < Math.round(W / 14); i++) baumRund(S, zw(r, 3, W - 3), zw(r, 2, hz - 2), r, 0.9); }
  return { hoehe: H };
}
const rheinGruenderzeit = slot('slot:rhein_gruenderzeit', {
  varianten: ['wohnen', 'laden', 'eck'], nenn: { wohnen: [16, 20], laden: [16, 20], eck: [18, 20] },
  roh: rheinGruenderzeitRoh,
});

// =====================================================================================
// Rheinland: Wiederaufbau der 50er (Düsseldorfer Eleganz)
// =====================================================================================
function rheinWiederaufbauRoh(S, scene, p) {
  const r = rng(`rwa:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  boden(S, 0, 0, W, D, '#bdb8ad', 0.3, 0.05);
  boden(S, 0, D - 4.5, W, D, '#d9d2c2', 0.3, 0.08);
  const stein = waehle(r, ['#e6dccb', '#e9e1d2', '#dfd6c4']), glas = waehle(r, ['#5f7c8a', '#56717e', '#6a8692']), sprosse = '#f6f4ee';
  const pastell = waehle(r, ['#b9d3d8', '#e8c9a6', '#c9d9b8', '#d8c3d6', '#e6d7a6', '#bcc9df']);
  let H;
  if (v === 'hochhaus') {
    // schlanke Scheibe mit Natursteinstirnen, feinem Raster und schwebendem Dach
    const sw = Math.min(W - 6, 34), sx = (W - sw) / 2, sd = 11, sz = Math.max(2, D - sd - 12), n = 14, gh = 3.3, y0 = 5.2;
    H = y0 + n * gh;
    S.quader(sx + 2, 0, sz + 1.5, sx + sw - 2, y0, sz + sd - 1.5, '#4e5c67');
    S.quader(sx, y0, sz, sx + sw, H, sz + sd, dunkler(glas, 0.08));
    for (const F of sichtbar(p, sx, sz, sw, sd)) {
      if (F.L > 20) {
        fb(S, F, 0, F.L, y0, H, -0.1, 0.02, glas);
        for (let k = 0; k <= n; k++) fb(S, F, -0.05, F.L + 0.05, y0 + k * gh - 0.06, y0 + k * gh + 0.06, 0, 0.18, sprosse);
        for (let k = 0; k < n; k++) fb(S, F, 0, F.L, y0 + k * gh + 0.06, y0 + k * gh + 0.9, -0.05, 0.08, pastell);
        for (let u = 0; u <= F.L + 0.01; u += 1.1) fb(S, F, u - 0.035, u + 0.035, y0, H, 0, 0.16, sprosse);
        for (let u = 3; u < F.L - 1; u += 6) zyl(S, 0.3, 0.3, y0, ...(() => { const [a, b] = wp(F, u, 1.2); return [a, 0, b]; })(), '#e9e7e1', 8);
      } else {
        fb(S, F, -0.15, F.L + 0.15, y0, H + 0.4, 0, 0.3, stein);
        for (let k = 0; k < n; k++) fb(S, F, F.L / 2 - 0.25, F.L / 2 + 0.25, y0 + k * gh + 1.0, y0 + k * gh + 2.8, 0.3, 0.34, glas);
      }
    }
    S.quader(sx + 3, H, sz + 1.5, sx + sw - 3, H + 3, sz + sd - 1.5, '#6f8696');
    S.quader(sx + 1.2, H + 3, sz + 0.6, sx + sw - 1.2, H + 3.25, sz + sd - 0.6, '#b4b8bb'); S.quader(sx + 1.2, H + 2.9, sz + sd - 0.7, sx + sw - 1.2, H + 3.25, sz + sd - 0.5, '#9aa1a7');
    for (const xx of [sx + 4, sx + sw - 4]) S.box(0.15, 3, 0.15, xx, H + 1.5, sz + sd - 1.4, '#9aa1a7');
    // Vorplatz mit Wasserbecken und Pavillon-Vordach
    boden(S, sx, sz + sd + 2, sx + sw * 0.5, D - 5.5, '#9ec4cc', 0.3, 0.12);
    const vd = new THREE.BoxGeometry(14, 0.25, 6); vd.translate(sx + sw * 0.72, 3.6, sz + sd + 3); S.add(vd, '#f6f4ee');
    for (const dx of [-5, 5]) S.box(0.15, 3.3, 0.15, sx + sw * 0.72 + dx, 1.95, sz + sd + 5.5, '#3b3f44');
    if (istSicht(p, '+z')) ftext(scene, seitenRahmen(sx, sz, sw, sd)['+z'], waehle(r, ['Niederrheinische Röhrenwerke', 'Haus Rheinblick', 'Haus der Wirtschaft']), sw / 2, y0 - 1.0, 0.1, 0.7, sw * 0.6, '#2f3438');
    H += 3.4;
    figuren(S, r, 2, D - 4.4, W - 2, D - 0.4, 12, 0.38);
  } else if (v === 'wohnhaus') {
    // 50er Wohnzeile: Putz in Pastell, schlanke Balkone, Treppenhaus-Glasband, flaches Satteldach mit dünnem Ortgang
    const n = 4, gh = 2.95, egH = 3.0, hd = Math.min(12, D - 8), hz = D - 4.5 - hd - 2.5;
    H = egH + n * gh;
    const wand = waehle(r, ['#efe3c8', '#e9e2d4', '#f0dccf', '#dde6dd', '#e6e0ee']);
    S.quader(1, 0, hz, W - 1, H, hz + hd, wand);
    for (const F of sichtbar(p, 1, hz, W - 2, hd)) {
      if (F.L < 14) { fb(S, F, 0, F.L, 0.3, H, 0, 0.04, wand); for (let k = 0; k <= n; k++) fb(S, F, F.L / 2 - 0.5, F.L / 2 + 0.5, 1.4 + k * gh, 2.6 + k * gh, 0, 0.08, glas); continue; }
      const seg = Math.max(1, Math.round(F.L / 14)), sl = F.L / seg;
      for (let s = 0; s < seg; s++) {
        const a = s * sl, tu = a + sl / 2;
        fb(S, F, tu - 0.8, tu + 0.8, 1.0, H - 0.6, -0.02, 0.06, '#9cc0cf');
        for (let y = 1.6; y < H - 0.6; y += 0.6) fb(S, F, tu - 0.8, tu + 0.8, y - 0.03, y + 0.03, 0, 0.09, sprosse);
        fb(S, F, tu - 0.75, tu + 0.75, 0.3, 2.4, 0, 0.08, '#6b4a32');
        fb(S, F, tu - 1.2, tu + 1.2, 2.5, 2.6, 0, 1.2, sprosse);
        for (let k = 0; k < n + 1; k++) {
          const y = k === 0 ? 0.9 : egH + (k - 1) * gh + 0.75;
          for (const u of [a + sl * 0.18, a + sl * 0.82]) { fb(S, F, u - 0.75, u + 0.75, y, y + 1.4, 0, 0.08, glas); fb(S, F, u - 0.8, u + 0.8, y - 0.12, y, 0, 0.16, sprosse); }
          if (k > 0 && F.s === '+z') {
            const bu0 = a + sl * 0.3, bu1 = a + sl * 0.44, bu2 = a + sl * 0.56, bu3 = a + sl * 0.7;
            for (const [b0, b1] of [[bu0, bu1], [bu2, bu3]]) {
              fb(S, F, b0, b1, y - 0.75, y - 0.62, 0, 1.3, sprosse);
              fb(S, F, b0, b1, y - 0.62, y + 0.15, 1.2, 1.28, k % 2 ? pastell : '#f6f4ee');
              fb(S, F, b0, b1, y + 0.18, y + 0.24, 1.22, 1.3, '#3b3f44');
              fb(S, F, b0 + 0.2, b1 - 0.2, y - 0.1, y + 1.7, -0.02, 0.06, glas);
            }
          } else if (k > 0) for (const u of [a + sl * 0.37, a + sl * 0.63]) fb(S, F, u - 0.6, u + 0.6, y, y + 1.3, 0, 0.08, glas);
        }
      }
    }
    const g = dachProfil(W - 1.2, hd + 1.6, 2.4, 0.2, 'x'); g.translate(W / 2, H, hz + hd / 2); S.add(g, waehle(r, ['#7c848c', '#a9523c', '#8b939b']));
    S.quader(0.4, H - 0.05, hz - 0.8, 0.6, H + 2.5, hz + hd + 0.8, '#f6f4ee'); S.quader(W - 0.6, H - 0.05, hz - 0.8, W - 0.4, H + 2.5, hz + hd + 0.8, '#f6f4ee');
    boden(S, 1, hz + hd, W - 1, D - 4.5, RASEN, 0.3, 0.07);
    for (let xx = 5; xx < W - 3; xx += 12) busch(S, xx, hz + hd + 1.8, r, 1.0);
    boden(S, 1, 1, W - 1, hz - 1, RASEN2, 0.3, 0.07);
    for (let i = 0; i < 3; i++) baumRund(S, zw(r, 3, W - 3), zw(r, 2, Math.max(2.5, hz - 2)), r, 0.95);
    H += 2.4;
  } else {
    // Geschäftshaus: Natursteinrahmen um ein feines Fensterraster, Staffelgeschoss mit schwebendem Flugdach
    const n = 4, gh = 3.2, egH = 4.6, hd = Math.min(16, D - 6), hz = D - 4.5 - hd;
    const parts = W > 34 ? [[0.2, W * 0.55], [W * 0.55, W - 0.2]] : [[0.2, W - 0.2]];
    const namen = mischListe(RHEIN_LADEN, r);
    H = 0;
    parts.forEach(([a, b], pi) => {
      const bw = b - a, Hh = egH + n * gh, pst = waehle(r, ['#b9d3d8', '#e8c9a6', '#c9d9b8', '#e6d7a6', '#bcc9df']);
      S.quader(a, 0, hz, b, Hh, hz + hd, stein);
      for (const F of sichtbar(p, a, hz, bw, hd)) {
        if (F.s === '+z' || F.s === '-z') {
          // Rahmen aus Travertin, innen Raster
          fb(S, F, 0.8, F.L - 0.8, egH + 0.3, Hh - 0.5, -0.3, 0.0, glas);
          for (let k = 0; k < n; k++) fb(S, F, 0.8, F.L - 0.8, egH + 0.3 + k * gh, egH + 0.3 + k * gh + 0.9, -0.25, -0.05, pst);
          for (let k = 0; k <= n; k++) fb(S, F, 0.8, F.L - 0.8, egH + 0.3 + k * gh - 0.05, egH + 0.3 + k * gh + 0.05, -0.3, 0.05, sprosse);
          for (let u = 0.8; u <= F.L - 0.79; u += 1.05) fb(S, F, u - 0.03, u + 0.03, egH + 0.3, Hh - 0.5, -0.3, 0.04, sprosse);
          fb(S, F, -0.05, 0.85, 0.3, Hh, 0, 0.25, stein); fb(S, F, F.L - 0.85, F.L + 0.05, 0.3, Hh, 0, 0.25, stein);
          fb(S, F, -0.05, F.L + 0.05, Hh - 0.55, Hh, 0, 0.3, stein);
          if (F.s === '+z') {
            ladenFront(S, scene, F, 1.0, F.L - 1.0, egH, { name: namen[pi], blende: '#2b2f33', vordach: 1.4, vordachF: '#f6f4ee', vordachKante: '#2b2f33', auslage: r, tief: -0.6, rahmen: '#3b3f44' });
            for (let u = 1.0; u <= F.L - 1; u += (F.L - 2) / 4) fb(S, F, u - 0.08, u + 0.08, 0.3, egH - 1.15, -0.6, -0.4, '#2b2f33');
          }
        } else fb(S, F, 0, F.L, 0.3, Hh, 0, 0.05, stein);
      }
      // Staffelgeschoss und Flugdach
      S.quader(a + 1.2, Hh, hz + 1.2, b - 1.2, Hh + 2.9, hz + hd - 2.4, '#7aa2b8');
      for (const F of sichtbar(p, a + 1.2, hz + 1.2, bw - 2.4, hd - 3.6)) for (let u = 0; u <= F.L + 0.01; u += 1.4) fb(S, F, u - 0.04, u + 0.04, Hh, Hh + 2.9, 0, 0.08, sprosse);
      S.quader(a + 0.6, Hh + 2.9, hz + 0.4, b - 0.6, Hh + 3.1, hz + hd - 1.4, '#b4b8bb');
      S.quader(a + 0.6, Hh + 2.75, hz + hd - 1.5, b - 0.6, Hh + 3.1, hz + hd - 1.3, '#9aa1a7');
      flachdach(S, a, hz, bw, hd, Hh, null, null, '#a9adb0');
      S.quader(a + 0.1, Hh, hz + hd - 1.2, b - 0.1, Hh + 1.0, hz + hd - 1.1, '#3b3f44');
      H = Math.max(H, Hh + 3.2);
    });
    figuren(S, r, 1, D - 4.4, W - 1, D - 0.4, Math.round(W / 4), 0.38);
    for (let xx = 6; xx < W - 2; xx += 13) laterne(S, xx, D - 0.9, 5.5, 0.38, 'mast', '#3b3f44');
  }
  return { hoehe: H };
}
const rheinWiederaufbau = slot('slot:rhein_wiederaufbau', {
  varianten: ['geschaeft', 'hochhaus', 'wohnhaus'], nenn: { geschaeft: [18, 20], hochhaus: [38, 32, 70, 60], wohnhaus: [28, 22] },
  roh: rheinWiederaufbauRoh,
});

// =====================================================================================
// Rheinland: Rheinpromenade (Wasser an der Rückseite, Stadt an der Front)
// =====================================================================================
const RHEIN_WASSER_Y = -4.6;
function rheinPromenadeRoh(S, scene, p) {
  // Lokal: Stadtseite z = 0, Wasser an +z (wird immer zur Kamera gedreht)
  const r = rng(`rpr:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante, WY = p.wasserY ?? RHEIN_WASSER_Y;
  const zk = Math.round(D * 0.56); // Kaikante, Wasser von zk bis D
  wasser(S, 0, zk, W, D, WY);
  const stein = '#d9d0bd', stein2 = '#cbbfa8', fuge = '#b9ad95';
  const schiffe = ['MS Rheinländerin', 'MS Loreleyblick', 'MS Siebengebirge', 'MS Stadt Rheinbach'];
  let zo; // Ende der oberen Promenade (Richtung Wasser)
  if (v === 'doppelt') {
    // Obere Promenade, Kasemattenmauer mit Bögen, unterer Werft am Wasser
    const yU = WY + 1.2, zm = zk - 11;
    kaimauer(S, 0, zk, W, zk + 1, WY, stein2, yU);
    S.quader(0, WY - 1.4, zm, W, yU, zk, stein2);
    boden(S, 0, zm, W, zk, '#d6cdb9', yU, 0.08);
    for (let z = zm + 2; z < zk; z += 2) S.quader(0, yU + 0.08, z, W, yU + 0.09, z + 0.12, fuge);
    S.quader(0, WY - 1, zm - 2.5, W, 0.36, zm - 0.5, stein);
    const F = R(0, zm, 1, 0, W, '+z');
    const loecher = []; for (let u = 2.5; u < W - 5; u += 6) loecher.push({ u0: u, v0: yU + 0.08, u1: u + 4.0, v1: yU + 3.6, art: 'rund' });
    lochwand(S, F, 0, W, yU, 0.36, -0.5, 0, stein, loecher);
    for (const l of loecher) {
      fb(S, F, l.u0 + 0.1, l.u1 - 0.1, yU, yU + 3.5, -0.52, -0.48, waehle(r, ['#4a3a2e', '#5f7787', '#3b3f44', '#6b4a32']));
      fform(S, F, bogenForm(l.u0 - 0.35, yU + 0.08, l.u1 + 0.35, l.v1 + 0.4, 'rund'), 0, 0.1, '#e6dfcf');
      fb(S, F, l.u0 + 0.6, l.u1 - 0.6, yU + 2.2, yU + 2.6, 0, 0.14, waehle(r, ['#c9483e', '#1f4f8f', '#3f6b4f', '#2b2f33']));
    }
    fb(S, F, -0.05, W + 0.05, 0.0, 0.45, 0, 0.2, '#e6dfcf');
    // Außengastronomie der Kasematten
    for (let u = 4.5; u < W - 4; u += 6) {
      if (r() < 0.75) { const [sx, sz] = wp(F, u, 3.2); schirmRund(S, sx, sz, yU + 0.08, waehle(r, ['#f4f2ec', '#c9483e', '#2f5f8f', '#e0b23a'])); for (const dx of [-1.2, 1.2]) zyl(S, 0.45, 0.45, 0.06, sx + dx, yU + 0.82, sz + 0.6, '#e9e7e1', 8); }
    }
    figuren(S, r, 1, zm + 1, W - 1, zk - 1, Math.round(W / 3), yU + 0.08);
    // Freitreppen zwischen den Ebenen
    for (const x of [W * 0.25, W * 0.75]) {
      const n = 12, h = (0.36 - yU) / n;
      for (let k = 0; k < n; k++) S.quader(x - 3, yU, zm + 0.1 + (n - 1 - k) * 0.6, x + 3, yU + (k + 1) * h, zm + 0.1 + (n - k) * 0.6, k % 2 ? stein : stein2);
      for (const dx of [-3.3, 3]) S.quader(x + dx, yU, zm, x + dx + 0.3, 1.1, zm + n * 0.6 + 0.1, '#bfb39a');
    }
    zo = zm - 0.5;
  } else if (v === 'treppe') {
    // breite Freitreppe vom Boulevard bis ins Wasser
    const tw = Math.min(W - 12, 44), tx = (W - tw) / 2, n = 12, st = 0.9, zt0 = zk - n * st;
    kaimauer(S, 0, zk, tx, zk + 1, WY, stein2); kaimauer(S, tx + tw, zk, W, zk + 1, WY, stein2);
    boden(S, 0, zt0, tx, zk, '#ddd5c4', 0.3, 0.08); boden(S, tx + tw, zt0, W, zk, '#ddd5c4', 0.3, 0.08);
    const h = (0.36 - WY - 0.4) / n;
    for (let k = 0; k < n; k++) {
      const top = 0.36 - (k + 1) * h, z0 = zt0 + k * st;
      S.quader(tx, WY - 1.4, z0, tx + tw, top, z0 + st, k % 2 ? stein : stein2);
      S.quader(tx, top - 0.05, z0 + st - 0.12, tx + tw, top + 0.02, z0 + st, fuge);
    }
    S.quader(tx, WY - 1.4, zk, tx + tw, WY + 0.2, zk + 1.6, stein2);
    for (const xx of [tx - 0.7, tx + tw]) S.quader(xx, WY - 1.4, zt0, xx + 0.7, 1.2, zk + 1, '#bfb39a');
    for (let i = 0; i < 34; i++) { const k = Math.floor(r() * n); figur(S, zw(r, tx + 1, tx + tw - 1), zt0 + (k + 0.4) * st, r, 0.36 - (k + 1) * h); }
    zo = zt0;
  } else {
    // Schiffsanleger: Ponton mit Brücke, Kartenhäuschen
    kaimauer(S, 0, zk, W, zk + 1, WY, stein2);
    const px = W * 0.4, pz = zk + 11;
    S.quader(px - 15, WY - 0.6, pz - 2.6, px + 15, WY + 0.9, pz + 2.6, '#3b3f44');
    S.quader(px - 14.6, WY + 0.9, pz - 2.3, px + 14.6, WY + 1.0, pz + 2.3, '#9aa1a7');
    S.quader(px - 4, WY + 1, pz - 1.5, px + 4, WY + 3.6, pz + 1.5, '#f4f2ec'); S.quader(px - 4.3, WY + 3.6, pz - 1.8, px + 4.3, WY + 3.9, pz + 1.8, '#1f4f8f');
    for (const F of sichtbar(p, px - 4, pz - 1.5, 8, 3)) if (F.L > 6) { fb(S, F, 0.6, F.L - 0.6, WY + 1.8, WY + 3.0, 0, 0.06, '#6f8696'); ftext(scene, F, 'Rheinschifffahrt', F.L / 2, WY + 4.3, 0.1, 0.55, F.L * 0.9, '#1f4f8f'); }
    const Lb = pz - 2.6 - (zk + 1), dy = 0.36 - (WY + 1);
    const g = new THREE.BoxGeometry(2.6, 0.25, Math.hypot(Lb, dy)); g.rotateX(Math.atan2(dy, Lb)); g.translate(px, (WY + 1 + 0.36) / 2, (pz - 2.6 + zk + 1) / 2); S.add(g, '#9aa1a7');
    for (const dx of [-1.3, 1.3]) balken(S, [px + dx, 1.4, zk + 1], [px + dx, WY + 2.0, pz - 2.6], 0.08, 0.08, '#2f3438');
    for (const xx of [px - 13, px + 13]) zyl(S, 0.5, 0.5, 8, xx, WY - 1, pz + 3.2, '#5a6168', 8);
    westSchiff(S, scene, px + 1, pz + 7.5, WY, 0, 'ausflug', { name: waehle(r, schiffe), laenge: 36 });
    if (W > 70 && D - zk > 34) westSchiff(S, scene, W * 0.78, D - 6, WY, PI, 'binnen', { ladung: 'container', laenge: 50 });
    zo = zk;
    // Kartenhaus an der Promenade
    S.quader(px + 6, 0.36, zk - 5, px + 10, 3, zk - 2, '#f4f2ec'); S.quader(px + 5.7, 3, zk - 5.3, px + 10.3, 3.3, zk - 1.7, '#1f4f8f');
  }
  // Obere Promenade: Pflaster, Geländer, Platanen in Reihen, Bänke, Laternen, Uhrsäule
  boden(S, 0, 0, W, zo, '#ddd5c4', 0.3, 0.08);
  for (let z = 3; z < zo; z += 3) S.quader(0, 0.38, z, W, 0.39, z + 0.1, '#cfc6b3');
  S.quader(0, 1.05, zo - 0.25, W, 1.15, zo, '#2f3438');
  for (let x = 1.2; x < W; x += 2.4) S.box(0.06, 0.8, 0.06, x, 0.76, zo - 0.12, '#2f3438');
  const zp1 = zo - 4, zp2 = Math.max(3, zo - 11);
  for (let x = 4; x < W - 2; x += 8) { platane(S, x, zp1, r, 1.05, 0.38); if (zp1 - zp2 > 4) platane(S, x + 4, zp2, r, 1.0, 0.38); }
  for (let x = 8; x < W - 4; x += 16) { bank(S, x, zo - 2, 0, 0.38, '#3f6b4f'); laterne(S, x + 4, zo - 2.2, 4.6, 0.38, 'alt', '#2f3438'); }
  const ux = W * 0.62, uz = zp2 > 3 ? (zp1 + zp2) / 2 : zp1 - 2;
  zyl(S, 0.5, 0.6, 5.4, ux, 0.38, uz, '#e6dfcf', 10);
  for (let k = 0; k < 6; k++) zyl(S, 0.52, 0.52, 0.2, ux, 1.0 + k * 0.7, uz, k % 2 ? '#1f4f8f' : '#f4f2ec', 10, true);
  zyl(S, 0.9, 0.9, 1.4, ux, 5.8, uz, '#2f3438', 10); zyl(S, 0.92, 0.92, 0.9, ux, 6.05, uz, '#f4f2ec', 10, true);
  kugel(S, ux, 7.5, uz, 0.4, '#c9a24a');
  figuren(S, r, 1, 0.5, W - 1, zo - 0.6, Math.round((W * zo) / 30), 0.38);
  if (v !== 'anleger') westSchiff(S, scene, W * 0.55, Math.min(D - 5, zk + 10), WY, 0, r() < 0.6 ? 'ausflug' : 'binnen', { name: waehle(r, schiffe), laenge: 34, ladung: 'luken' });
  if (v === 'doppelt' && W > 70 && D - zk > 30) westSchiff(S, scene, W * 0.4, D - 6, WY, PI, 'binnen', { laenge: Math.min(54, W * 0.6), ladung: 'kohle', name: 'Niederrhein' });
  return { hoehe: 12 };
}
function schirmRund(S, x, z, y0, farbe) { zyl(S, 0.05, 0.05, 2.4, x, y0, z, '#9aa1a7', 4); const g = new THREE.ConeGeometry(1.6, 0.6, 8); g.translate(x, y0 + 2.5, z); S.add(g, farbe); }
const rheinPromenade = slot('slot:rhein_promenade', {
  wasserZurKamera: () => true,
  varianten: ['doppelt', 'treppe', 'anleger'], nenn: { doppelt: [50, 44], treppe: [50, 44], anleger: [50, 56] },
  roh: rheinPromenadeRoh,
});

// =====================================================================================
// Westfalen: Giebelhäuser mit Bogengang (Prinzipalmarkt-artig, eigenständig)
// =====================================================================================
const SANDSTEIN = ['#e3d3b2', '#dccaa6', '#e6d8bc', '#d8c39c', '#e0cfae'];
function giebelForm(u0, u1, y, G, art) {
  const s = new THREE.Shape(), b = u1 - u0, um = (u0 + u1) / 2;
  s.moveTo(u0, y);
  if (art === 'treppe') {
    const n = 5, sb = b / 2 / n, sh = G / n;
    let u = u0, v = y;
    for (let i = 0; i < n; i++) { s.lineTo(u, v + sh * 0.85); s.lineTo(u + sb, v + sh * 0.85); u += sb; v += sh * 0.85; }
    s.lineTo(um - sb * 0.5, v + sh * 0.6); s.lineTo(um + sb * 0.5, v + sh * 0.6);
    u = um + sb * 0.5 + 0;
    let uu = u1 - (n - 1) * sb - sb, vv = v;
    for (let i = 0; i < n; i++) { s.lineTo(uu + 0, vv); s.lineTo(uu + 0, vv - sh * 0.85); uu += sb; vv -= sh * 0.85; }
    s.lineTo(u1, y);
  } else if (art === 'volute') {
    // Renaissance: zwei Stufen mit Schnecken, Aufsatz mit Bogen
    const h1 = G * 0.42, h2 = G * 0.78, b1 = b * 0.18, b2 = b * 0.34;
    s.lineTo(u0, y + h1 * 0.55); s.absarc(u0 + b1 * 0.5, y + h1 * 0.55, b1 * 0.5, PI, PI / 2, true); s.lineTo(u0 + b1, y + h1);
    s.lineTo(u0 + b1, y + h1 + (h2 - h1) * 0.5); s.absarc(u0 + b2 - b1 * 0.0 - (b2 - b1) * 0.5, y + h1 + (h2 - h1) * 0.5, (b2 - b1) * 0.5, PI, PI / 2, true); s.lineTo(u0 + b2, y + h2);
    s.lineTo(u0 + b2, y + G - (um - u0 - b2)); s.absarc(um, y + G - (um - u0 - b2), um - u0 - b2, PI, 0, true);
    s.lineTo(u1 - b2, y + h2); s.absarc(u1 - b2 + (b2 - b1) * 0.5, y + h1 + (h2 - h1) * 0.5, (b2 - b1) * 0.5, PI / 2, 0, true); s.lineTo(u1 - b1, y + h1 + (h2 - h1) * 0.5);
    s.lineTo(u1 - b1, y + h1); s.absarc(u1 - b1 * 0.5, y + h1 * 0.55, b1 * 0.5, PI / 2, 0, true); s.lineTo(u1, y);
  } else if (art === 'barock') {
    s.lineTo(u0, y + G * 0.25); s.quadraticCurveTo(u0 + b * 0.08, y + G * 0.55, u0 + b * 0.26, y + G * 0.62); s.lineTo(u0 + b * 0.26, y + G * 0.72);
    s.quadraticCurveTo(u0 + b * 0.3, y + G * 0.95, um, y + G); s.quadraticCurveTo(u1 - b * 0.3, y + G * 0.95, u1 - b * 0.26, y + G * 0.72);
    s.lineTo(u1 - b * 0.26, y + G * 0.62); s.quadraticCurveTo(u1 - b * 0.08, y + G * 0.55, u1, y + G * 0.25); s.lineTo(u1, y);
  } else {
    s.lineTo(u0, y + G * 0.1); s.lineTo(um - b * 0.12, y + G * 0.92); s.lineTo(um - b * 0.12, y + G); s.lineTo(um + b * 0.12, y + G); s.lineTo(um + b * 0.12, y + G * 0.92); s.lineTo(u1, y + G * 0.1); s.lineTo(u1, y);
  }
  s.lineTo(u0, y);
  return s;
}
function giebelhausRoh(S, scene, p) {
  const r = rng(`wgh:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  boden(S, 0, 0, W, D, '#bdb8ad', 0.3, 0.05);
  boden(S, 0, D - 4, W, D, '#cfc6b4', 0.3, 0.08);
  const hd = Math.min(18, D - 6), hz = D - 4 - hd, bg = 4.0, egH = 4.8, gh = 3.3;
  const namen = mischListe(['Gaststätte Am Bogen', 'Tuchhaus Lohmann', 'Wäsche Hölscher', 'Juwelier Hesselmann', 'Feinkost Wiggering', 'Bücher Lammersmann', 'Café Domblick',
    'Hut Overmeyer', 'Leder Tenhumberg', 'Porzellan Brüning', 'Optik Kemper', 'Apotheke am Markt'], r);
  const arten = v === 'renaissance' ? ['volute', 'treppe', 'volute'] : v === 'nachkrieg' ? ['schlicht', 'schlicht', 'treppe'] : ['volute', 'treppe', 'barock', 'schlicht', 'volute'];
  let x = 0, i = 0, H = 0;
  while (x < W - 0.5) {
    let b = zw(r, 7.2, 9.6); if (W - x - b < 5.5) b = W - x;
    const stein = waehle(r, SANDSTEIN), orn = heller(stein, 0.05), art = arten[(i + (p.seed % 3)) % arten.length], n = 3;
    const Hh = egH + n * gh, G = Math.min(b * 1.15, 10.5);
    S.quader(x, 0, hz, x + b, Hh, hz + hd - bg, stein);
    S.quader(x, egH, hz + hd - bg, x + b, Hh, hz + hd, stein);
    for (const F of sichtbar(p, x, hz, b, hd)) {
      if (F.s === '+z') {
        // Bogengang: Pfeiler und Rundbögen, Läden dahinter
        const nb = b > 8.4 ? 3 : 2, bw = (b - 0.8) / nb;
        const loecher = []; for (let k = 0; k < nb; k++) loecher.push({ u0: 0.4 + k * bw + 0.35, v0: 0.3, u1: 0.4 + (k + 1) * bw - 0.35, v1: egH - 0.5, art: 'rund' });
        lochwand(S, F, 0, F.L, 0.3, egH, -0.6, 0, stein, loecher);
        fb(S, F, -0.02, F.L + 0.02, egH - 0.25, egH + 0.1, 0, 0.25, orn);
        const Fl = teil(F, 0, F.L, -bg);
        ladenFront(S, scene, Fl, 0.6, F.L - 0.6, egH - 0.4, { name: namen[i % namen.length], blende: waehle(r, ['#2b2f33', '#3f5f4f', '#6b2e35', '#1f3a5f']), vordach: false, auslage: r, tief: -0.2 });
        boden(S, ...(() => { const [a1, b1] = wp(F, 0, -bg), [a2, b2] = wp(F, F.L, 0); return [Math.min(a1, a2), Math.min(b1, b2), Math.max(a1, a2), Math.max(b1, b2)]; })(), '#e6dfcf', 0.3, 0.1);
        // Obergeschosse: Fensterachsen mit Gesimsen
        const na = b > 8.4 ? 3 : 2;
        for (let k = 0; k < n; k++) {
          const y = egH + k * gh + 0.8;
          for (let a = 0; a < na; a++) { const u = (F.L * (a + 0.5)) / na; stuckFenster(S, F, u, y, 1.1, 2.0, { orn, glas: GLAS }, k, r, { verdachung: k === 0 ? 'gerade' : null }); }
          fb(S, F, -0.02, F.L + 0.02, egH + (k + 1) * gh - 0.15, egH + (k + 1) * gh + 0.05, 0, 0.22, orn);
        }
        // Giebel
        fform(S, F, giebelForm(0, F.L, Hh, G, art), -0.2, 0.25, stein, 6);
        for (const [yy, m] of [[Hh + G * 0.08, 3], [Hh + G * 0.48, 2], [Hh + G * 0.78, 1]]) {
          const bb = art === 'schlicht' ? F.L * (1 - (yy - Hh) / G) * 0.8 : F.L * (m === 3 ? 0.9 : m === 2 ? 0.55 : 0.25);
          fb(S, F, F.L / 2 - bb / 2, F.L / 2 + bb / 2, yy - 0.1, yy + 0.06, 0.25, 0.4, orn);
          for (let a = 0; a < m; a++) { const u = F.L / 2 + (a - (m - 1) / 2) * (bb / Math.max(1, m)) * 0.9; if (yy + 2 < Hh + G) fb(S, F, u - 0.45, u + 0.45, yy + 0.4, yy + 1.9, 0.25, 0.33, GLAS); }
        }
        if (art !== 'schlicht') kugel(S, ...(() => { const [a1, b1] = wp(F, F.L / 2, 0.1); return [a1, Hh + G + 0.35, b1]; })(), 0.35, orn);
      } else if (F.s === '-z') {
        // Rückseite zum Hof: verputzter Giebel mit Stufen, Fensterachsen, Hoftür, Anbau
        const rw = dunkler(stein, 0.04), na = b > 8.4 ? 3 : 2;
        fb(S, F, 0, F.L, 0.3, Hh, 0, 0.04, rw);
        for (let k = 0; k < n + 1; k++) for (let a = 0; a < na; a++) {
          const u = (F.L * (a + 0.5)) / na, y = k === 0 ? 1.4 : egH + (k - 1) * gh + 0.8;
          if (k === 0 && a === 0) { fb(S, F, u - 0.6, u + 0.6, 0.3, 2.5, 0, 0.1, '#5a3a2a'); continue; }
          fb(S, F, u - 0.55, u + 0.55, y, y + 1.8, 0, 0.1, GLAS); fb(S, F, u - 0.65, u + 0.65, y - 0.15, y, 0, 0.2, orn);
        }
        for (let k = 1; k <= n; k++) fb(S, F, -0.02, F.L + 0.02, egH + (k - 1) * gh - 0.1, egH + (k - 1) * gh + 0.05, 0, 0.15, orn);
        fform(S, F, giebelForm(0, F.L, Hh, G * 0.66, 'schlicht'), -0.2, 0.1, rw, 4);
        fb(S, F, F.L / 2 - 0.5, F.L / 2 + 0.5, Hh + 1.0, Hh + 2.5, 0.1, 0.16, GLAS);
        if (hz > 6 && i % 2 === 0) { const [ax, az] = wp(F, F.L * 0.7, 0); S.quader(ax - 1.8, 0.3, az - 3.5, ax + 1.8, 3.2, az, waehle(r, SANDSTEIN)); const ag = new THREE.BoxGeometry(4, 0.15, 4); ag.rotateX(-0.2); ag.translate(ax, 3.4, az - 1.8); S.add(ag, '#5a5f63'); }
      } else fb(S, F, 0, F.L, 0.3, Hh, 0, 0.03, dunkler(stein, 0.07));
    }
    const dg = dachProfil(hd - 0.3, b - 0.1, G * 0.68, 0.2, 'z'); dg.translate(x + b / 2, Hh, hz + hd / 2 - 0.2); S.add(dg, waehle(r, ['#4f565c', '#5c6870', '#a9523c']));
    H = Math.max(H, Hh + G);
    x += b; i++;
  }
  figuren(S, r, 1, D - 3.8, W - 1, D - 0.4, Math.round(W / 4), 0.38);
  for (let xx = 4; xx < W - 2; xx += 12) laterne(S, xx, D - 0.8, 4.2, 0.38, 'alt', '#2f3438');
  for (let xx = 9; xx < W - 3; xx += 18) { S.box(1.6, 0.9, 0.6, xx, 0.83, D - 1.8, '#3f6b4f'); }
  return { hoehe: H };
}
const westfGiebelhaus = slot('slot:westf_giebelhaus', {
  varianten: ['markt', 'renaissance', 'nachkrieg'], nenn: { markt: [16, 22], renaissance: [16, 22], nachkrieg: [16, 22] },
  roh: giebelhausRoh,
});

// =====================================================================================
// Bergisches Land: Schieferhaus, Fachwerk grün-weiß-schwarz (Einzelhaus für die Blockrandreihe)
// =====================================================================================
const SCHIEFER_W = ['#3f4851', '#454f59', '#3a434b', '#4b5560', '#424c55'];
const BERG_GRUEN = ['#2f6b45', '#2c6340', '#356f4a', '#2a5e3d'];
const BERG_LAEDEN = ['Bäckerei Mühlinghaus', 'Metzgerei Halbach', 'Kaffeehaus Bredt', 'Schneiderei Keuchen', 'Eisenwaren Hasenclever', 'Apotheke im Tal',
  'Buchhandlung Ibach', 'Weinstube Zur Wupper', 'Optik Schniewind', 'Messerschmiede Kretzer', 'Uhren Platzhoff', 'Blumen Wülfing'];
/** Diagonaler Balken in der Fassadenebene (Fachwerkstrebe). */
function strebe(S, F, u0, y0, u1, y1, t, c, b = 0.22) {
  const L = Math.hypot(u1 - u0, y1 - y0), g = new THREE.BoxGeometry(L, b, 0.12);
  g.rotateZ(Math.atan2(y1 - y0, u1 - u0)); g.translate((u0 + u1) / 2, (y0 + y1) / 2, t + 0.06);
  fgeo(S, F, g, c);
}
/** Weißes Sprossenfenster mit grünen Klappläden. */
function bergFenster(S, F, u, y, fb_, fh, gruen, o = {}) {
  fb(S, F, u - fb_ / 2 - 0.14, u + fb_ / 2 + 0.14, y - 0.14, y + fh + 0.14, 0, 0.08, '#f4f2ec');
  fb(S, F, u - fb_ / 2, u + fb_ / 2, y, y + fh, 0.04, 0.12, o.glas ?? '#4e5c67');
  fb(S, F, u - 0.04, u + 0.04, y, y + fh, 0.04, 0.15, '#f4f2ec');
  fb(S, F, u - fb_ / 2, u + fb_ / 2, y + fh * 0.62, y + fh * 0.62 + 0.07, 0.04, 0.15, '#f4f2ec');
  if (o.laeden !== false) for (const s of [-1, 1]) {
    const a = u + s * (fb_ / 2 + 0.16), e = u + s * (fb_ / 2 + 0.16 + fb_ * 0.5);
    fb(S, F, Math.min(a, e), Math.max(a, e), y - 0.05, y + fh + 0.05, 0.02, 0.12, gruen);
    fb(S, F, Math.min(a, e) + 0.06, Math.max(a, e) - 0.06, y + fh * 0.5 - 0.03, y + fh * 0.5 + 0.03, 0.12, 0.14, dunkler(gruen, 0.08));
  }
  fb(S, F, u - fb_ / 2 - 0.22, u + fb_ / 2 + 0.22, y - 0.24, y - 0.12, 0, 0.18, '#f4f2ec');
}
function bergHausRoh(S, scene, p) {
  const r = rng(`berg:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante, yb = p.sockelY ?? 0;
  const n = Math.max(2, Math.min(4, p.geschosse ?? (W > 11 ? 3 : 2)));
  const laden = !!p.laden, gh = 2.9, egH = laden ? 4.0 : 3.1, y0 = yb + 0.3, ys = y0 + 0.75;
  const Hw = ys + egH + (n - 1) * gh;
  const gruen = waehle(r, BERG_GRUEN), schiefer = waehle(r, SCHIEFER_W), weiss = '#f2f0e9', balkenF = '#2a2b2d';
  const stein = waehle(r, ['#8f8a80', '#9a948a', '#857f76']);
  const traufe = p.traufe ?? (W >= 10.5 && r() < 0.7);
  if (yb > 0.05) S.quader(0, 0, 0, W, y0, D, stein);
  // Bruchsteinsockel, Körper
  S.quader(-0.05, y0, -0.05, W + 0.05, ys, D + 0.05, stein);
  const wand = v === 'fachwerk' ? weiss : v === 'putz' ? waehle(r, ['#f1ede2', '#ece6d6', '#f3efe6']) : schiefer;
  S.quader(0, ys, 0, W, Hw, D, wand);
  if (v === 'putz') S.quader(-0.02, ys + egH, -0.02, W + 0.02, Hw, D + 0.02, schiefer);
  for (const F of sichtbar(p, 0, 0, W, D)) {
    const vorn = F.s === '+z';
    // Eckbretter, Gesimse (weiß), Schieferbänder
    if (v !== 'fachwerk') {
      for (const u of [0, F.L - 0.22]) fb(S, F, u, u + 0.22, ys, Hw, 0, 0.06, '#f4f2ec');
      const yS = v === 'putz' ? ys + egH : ys;
      for (let y = yS + 0.9; y < Hw - 0.3; y += 0.95) fb(S, F, 0.22, F.L - 0.22, y, y + 0.06, 0, 0.025, heller(schiefer, 0.05));
    }
    fb(S, F, -0.04, F.L + 0.04, Hw - 0.25, Hw, 0, 0.2, '#f4f2ec');
    const na = Math.max(1, Math.round(F.L / 2.7));
    for (let k = 0; k < n; k++) {
      const yk = k === 0 ? ys : ys + egH + (k - 1) * gh;
      if (v === 'fachwerk' && k > 0) {
        // Ständer, Riegel, Streben in Schwarz auf weißen Gefachen
        const yt = yk + gh;
        fb(S, F, -0.03, F.L + 0.03, yk - 0.06, yk + 0.2, 0, 0.12, balkenF);
        fb(S, F, -0.03, F.L + 0.03, yk + 0.85, yk + 1.0, 0, 0.12, balkenF);
        for (let a = 0; a <= na; a++) { const u = Math.min(F.L - 0.11, Math.max(0.11, (F.L * a) / na)); fb(S, F, u - 0.11, u + 0.11, yk, yt, 0, 0.12, balkenF); }
        strebe(S, F, 0.2, yk + 0.2, Math.min(1.3, F.L / na - 0.6), yk + 0.85, 0, balkenF);
        strebe(S, F, F.L - 0.2, yk + 0.2, F.L - Math.min(1.3, F.L / na - 0.6), yk + 0.85, 0, balkenF);
        if (k === n - 1) fb(S, F, -0.03, F.L + 0.03, yt - 0.18, yt, 0, 0.12, balkenF);
      }
      for (let a = 0; a < na; a++) {
        const u = (F.L * (a + 0.5)) / na;
        if (k === 0 && vorn && laden) continue;
        if (k === 0 && vorn && a === (na > 2 ? 1 : 0)) {
          // Haustür: grün, weißes Futter, Oberlicht, zwei Stufen
          fb(S, F, u - 0.7, u + 0.7, ys - 0.02, ys + 2.6, 0, 0.1, '#f4f2ec');
          fb(S, F, u - 0.55, u + 0.55, ys, ys + 2.1, 0.06, 0.14, gruen);
          fb(S, F, u - 0.55, u + 0.55, ys + 2.15, ys + 2.5, 0.06, 0.14, '#4e5c67');
          for (let q = 0; q < 2; q++) fb(S, F, u - 0.9 + q * 0.15, u + 0.9 - q * 0.15, y0 + q * 0.22, y0 + (q + 1) * 0.22, 0, 0.7 - q * 0.3, stein);
          continue;
        }
        const yf = yk + (k === 0 ? 0.75 : 0.95);
        if (v === 'fachwerk' && k > 0) bergFenster(S, F, u, yk + 1.05, 0.95, 1.45, gruen, { laeden: F.L / na > 2.4 });
        else bergFenster(S, F, u, yf, 0.95, 1.5, gruen, { laeden: F.L / na > 2.4 });
      }
    }
    if (vorn && laden) {
      ladenFront(S, scene, teil(F, 0, F.L), 0.5, F.L - 0.5, ys + egH - y0 - 0.3, { name: waehle(r, BERG_LAEDEN), blende: gruen, rahmen: '#f4f2ec', vordach: false, auslage: r, tief: -0.1 });
    }
  }
  // Dach: Schiefer, traufständig mit Zwerchgiebel oder giebelständig zur Straße
  const dachF = waehle(r, ['#353c43', '#3b4249', '#30373e']);
  let H;
  if (traufe) {
    const h = D * 0.42;
    satteldach(S, p, 0, 0, W, D, Hw, h, 'x', dachF, schiefer, 0.4, 0.25);
    H = Hw + h;
    if (istSicht(p, '+z') && W >= 9) {
      // Zwerchhaus mit Fenster, Giebel weiß gerahmt
      const zw0 = W / 2 - 2.2, zb = 4.4, zh = 2.6;
      S.quader(zw0, Hw - 0.2, D - 1.6, zw0 + zb, Hw + zh, D, schiefer);
      const g = dachProfil(zb + 0.6, 3.6, 1.9, 0.15, 'z'); g.translate(zw0 + zb / 2, Hw + zh, D - 1.4); S.add(g, dachF);
      const Fz = R(zw0, D, 1, 0, zb, '+z');
      fpoly(S, Fz, [[0, Hw + zh], [zb, Hw + zh], [zb / 2, Hw + zh + 1.6]], 0, 0.05, schiefer);
      bergFenster(S, Fz, zb / 2, Hw + 0.5, 0.9, 1.3, gruen, { laeden: true });
    } else if (W >= 8 && istSicht(p, '+z')) {
      const g = dachProfil(2.2, 2.0, 1.3, 0.1, 'z'); g.translate(W * 0.5, Hw + h * 0.35 + 0.6, D - 1.6); S.add(g, dachF);
      S.quader(W * 0.5 - 1.0, Hw + h * 0.35 - 0.6, D - 2.4, W * 0.5 + 1.0, Hw + h * 0.35 + 0.6, D - 1.2, schiefer);
      fb(S, R(W * 0.5 - 1.0, D - 1.2, 1, 0, 2, '+z'), 0.4, 1.6, Hw + h * 0.35 - 0.4, Hw + h * 0.35 + 0.4, 0, 0.06, '#f4f2ec');
    }
  } else {
    const h = Math.min(W * 0.75, 7.5);
    satteldach(S, p, 0, 0, W, D, Hw, h, 'z', dachF, null, 0.35, 0.2);
    for (const F of sichtbar(p, 0, 0, W, D)) if (F.s === '+z' || F.s === '-z') {
      fpoly(S, F, [[0, Hw], [F.L, Hw], [F.L / 2 + 0.1, Hw + h - 0.2], [F.L / 2 - 0.1, Hw + h - 0.2]], 0, 0.03, v === 'fachwerk' ? weiss : schiefer);
      if (v === 'fachwerk') { strebe(S, F, 0, Hw, F.L / 2, Hw + h - 0.2, 0.03, balkenF); strebe(S, F, F.L, Hw, F.L / 2, Hw + h - 0.2, 0.03, balkenF); fb(S, F, F.L / 2 - 0.1, F.L / 2 + 0.1, Hw, Hw + h - 0.3, 0.03, 0.15, balkenF); }
      else { strebe(S, F, 0, Hw, F.L / 2, Hw + h - 0.15, 0.03, '#f4f2ec', 0.18); strebe(S, F, F.L, Hw, F.L / 2, Hw + h - 0.15, 0.03, '#f4f2ec', 0.18); }
      bergFenster(S, F, F.L / 2, Hw + 0.8, 0.85, 1.25, gruen, { laeden: F.L > 7 });
    }
    H = Hw + h;
  }
  // Schornstein
  const kx = W * zw(r, 0.25, 0.75), kz = D * 0.4;
  S.quader(kx - 0.4, Hw, kz - 0.4, kx + 0.4, H + 0.8, kz + 0.4, '#5a5f63');
  return { hoehe: H, stil: 'bergisch', farbe: wand, geschosse: n };
}
const bergHaus = slot('slot:berg_haus', {
  varianten: ['schiefer', 'fachwerk', 'putz'], nenn: { schiefer: [6, 8], fachwerk: [6, 8], putz: [6, 8] },
  roh: bergHausRoh,
});

// =====================================================================================
// Bergisches Land: Schwebebahn über dem Fluss (Stützen, Fachwerkträger, hängender Wagen, Haltestelle)
// =====================================================================================
const SCHWEBE_F = '#4f7f78', SCHWEBE_D = '#3f6660';
function schwebebahnRoh(S, scene, p) {
  // Lokal: Fluss entlang x (Länge W), quer von z = 0 bis D. p.ueberhang verlängert den Träger über die Brücken.
  const r = rng(`schwebe:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante, ue = p.ueberhang ?? 0;
  const zm = D / 2, yT = 11.4, yO = 13.0;
  const x0 = -ue, x1 = W + ue;
  // Stützen: geneigte Beine von beiden Ufern zum Querriegel (Trapezform)
  const abst = 17;
  const nS = Math.max(1, Math.round(W / abst));
  for (let k = 0; k < nS; k++) {
    const x = (W * (k + 0.5)) / nS;
    for (const s of [-1, 1]) {
      const zf = s < 0 ? 0.6 : D - 0.6, zk = zm + s * 2.6;
      balken(S, [x - 1.3, 0.3, zf], [x - 0.5, yT, zk], 0.8, 0.8, SCHWEBE_F);
      balken(S, [x + 1.3, 0.3, zf], [x + 0.5, yT, zk], 0.8, 0.8, SCHWEBE_F);
      balken(S, [x - 1.0, yT * 0.45, zf + (zk - zf) * 0.45], [x + 1.0, yT * 0.45, zf + (zk - zf) * 0.45], 0.25, 0.25, SCHWEBE_D);
      S.box(3.0, 0.6, 1.4, x, 0.6, zf, '#9a958a');
    }
    S.box(1.6, 0.9, 6.4, x, yT + 0.2, zm, SCHWEBE_F);
  }
  // Fachwerkträger: Ober- und Untergurt, Pfosten, Diagonalen (sichtbare Seite voll)
  for (const s of [-1, 1]) {
    S.quader(x0, yO - 0.5, zm + s * 1.0 - 0.3, x1, yO + 0.2, zm + s * 1.0 + 0.3, SCHWEBE_F);
    S.quader(x0, yT, zm + s * 1.0 - 0.3, x1, yT + 0.6, zm + s * 1.0 + 0.3, SCHWEBE_F);
  }
  const zs = zm + 1.25;
  for (let x = x0 + 1.2, k = 0; x < x1 - 0.6; x += 2.4, k++) {
    S.box(0.22, yO - yT - 0.3, 0.22, x, (yO + yT) / 2, zs, SCHWEBE_D);
    balken(S, [x, k % 2 ? yT + 0.5 : yO - 0.4, zs], [Math.min(x1, x + 2.4), k % 2 ? yO - 0.4 : yT + 0.5, zs], 0.18, 0.2, SCHWEBE_D);
  }
  S.quader(x0, yT - 0.55, zm - 0.3, x1, yT, zm + 0.3, '#3b3f44');
  let H = yO + 0.5;
  // Haltestelle: Bahnsteige beidseits, Dach, Glaswände, Treppe zum Ufer
  if (v === 'station') {
    const L = Math.min(W - 6, 36), xs = (W - L) / 2, yB = 5.6;
    for (const s of [-1, 1]) {
      S.quader(xs, yB - 0.5, zm + s * 2.0 - (s > 0 ? 0 : 2.6), xs + L, yB, zm + s * 2.0 + (s > 0 ? 2.6 : 0), '#bdb8ad');
      S.quader(xs, yB, zm + s * 4.4 - 0.08, xs + L, yB + 1.0, zm + s * 4.4 + 0.08, '#2f3438');
      for (let x = xs + 1; x < xs + L; x += 6) S.box(0.3, yO + 2 - yB, 0.3, x, (yO + 2 + yB) / 2, zm + s * 4.5, SCHWEBE_F);
    }
    S.quader(xs + 0.2, yB + 1.0, zm + 4.45, xs + L - 0.2, yO + 1.4, zm + 4.55, '#a8c8d3');
    const g = dachProfil(L + 1, 10.4, 1.6, 0.4, 'x'); g.translate(W / 2, yO + 1.9, zm); S.add(g, '#5a6a72');
    S.quader(xs - 0.3, yO + 1.5, zm - 5.2, xs + L + 0.3, yO + 1.95, zm + 5.2, SCHWEBE_F);
    const Fn = R(xs + L * 0.3, zm + 5.25, 1, 0, L * 0.4, '+z');
    fb(S, Fn, 0, L * 0.4, yO + 0.2, yO + 1.3, 0, 0.1, '#f4f2ec');
    ftext(scene, Fn, p.name ?? 'Haltestelle Talbrücke', L * 0.2, yO + 0.75, 0.12, 0.8, L * 0.38, '#1f3a5f');
    // Treppenhaus zum Ufer (Kameraseite)
    const tx = xs + L - 6;
    S.quader(tx, 0.3, D - 3.6, tx + 4.4, yB + 3, D - 0.4, '#d6d1c6');
    for (let k = 0; k < 4; k++) S.box(3.4, 1.2, 0.08, tx + 2.2, 1.2 + k * 1.6, D - 0.36, '#a8c8d3');
    S.quader(tx + 0.4, yB - 0.4, zm + 4.6, tx + 4.0, yB, D - 3.6, '#bdb8ad');
    figuren(S, r, xs + 2, zm + 2.2, xs + L - 2, zm + 4.2, 8, yB);
    figuren(S, r, xs + 2, zm - 4.2, xs + L - 2, zm - 2.2, 5, yB);
    H = yO + 3.6;
  }
  // Hängender Wagen: Gehänge, Wagenkasten mit Fensterband, Stirnseiten
  if (W > 22) {
    const L = 16, xc = v === 'station' ? W / 2 : zw(r, Math.min(W - 9, 9), Math.max(9, W - 9));
    const farbe = waehle(r, ['#2f6fb0', '#d9622b', '#d9622b']);
    for (const dx of [-L * 0.3, L * 0.3]) { S.box(0.3, 2.0, 0.3, xc + dx, yT - 1.5, zm, '#3b3f44'); S.box(1.6, 0.5, 0.6, xc + dx, yT - 0.6, zm, '#3b3f44'); }
    const yW = yT - 2.6;
    S.quader(xc - L / 2, yW - 3.0, zm - 1.2, xc + L / 2, yW, zm + 1.2, farbe);
    S.quader(xc - L / 2 + 0.4, yW - 1.7, zm + 1.2, xc + L / 2 - 0.4, yW - 0.5, zm + 1.26, '#2b3640');
    S.quader(xc - L / 2 + 0.4, yW - 2.4, zm + 1.2, xc + L / 2 - 0.4, yW - 2.15, zm + 1.26, '#f4f2ec');
    S.quader(xc - L / 2 - 0.8, yW - 2.8, zm - 1.0, xc - L / 2, yW - 0.3, zm + 1.0, dunkler(farbe, 0.06));
    S.quader(xc + L / 2, yW - 2.8, zm - 1.0, xc + L / 2 + 0.8, yW - 0.3, zm + 1.0, dunkler(farbe, 0.06));
    S.quader(xc + L / 2 + 0.75, yW - 1.8, zm - 0.8, xc + L / 2 + 0.82, yW - 0.6, zm + 0.8, '#2b3640');
    S.quader(xc - L / 2, yW, zm - 1.0, xc + L / 2, yW + 0.25, zm + 1.0, '#cfd3d6');
  }
  return { hoehe: H };
}
const bergSchwebebahn = slot('slot:berg_schwebebahn', {
  varianten: ['strecke', 'station'], nenn: { strecke: [8, 12], station: [30, 14] },
  roh: schwebebahnRoh,
});

// =====================================================================================
// Rheinland: Brauhaus in der Altstadt (schmale Giebelhäuser, Holzfront, Ausleger, Fässer und Stehtische)
// =====================================================================================
const BRAUHAUS = ['Brauhaus Em Pöötzche', 'Brauhaus Zum Fässchen', 'Haus Kümpchen', "Brauerei Op d'r Eck", 'Brauhaus Ahl Kraat', 'Gaststätte Zum Köbes',
  'Brauhaus Am Pützchen', 'Brauerei Zur Lohe', 'Brauhaus Em Stüffje', 'Brauhaus Zum Ölberg'];
const RHEIN_ALTPUTZ = ['#f2ece0', '#efe1c8', '#f0d9cc', '#e8e4d8', '#f3e6c4', '#e6d9c7', '#efe9e0'];
function brauhausRoh(S, scene, p) {
  const r = rng(`brau:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p;
  boden(S, 0, 0, W, D, '#c9c1b2', 0.3, 0.05);
  const hd = Math.min(16, D - 3.5), hz = D - 3.5 - hd, egH = 4.4, gh = 3.2;
  let x = 0, i = 0, H = 0;
  const namen = mischListe(BRAUHAUS, r);
  while (x < W - 0.5) {
    let b = zw(r, 6.4, 8.6); if (W - x - b < 5) b = W - x;
    const brau = i === 0 || r() < 0.4;
    const n = 2 + (r() < 0.6 ? 1 : 0), putz = waehle(r, RHEIN_ALTPUTZ), orn = '#f8f5ee';
    const Hh = egH + n * gh, G = Math.min(b * 0.95, 7.5), art = waehle(r, ['treppe', 'schlicht', 'barock', 'treppe']);
    S.quader(x, 0.3, hz, x + b, Hh, hz + hd, putz);
    for (const F of sichtbar(p, x, hz, b, hd)) {
      if (F.s === '+z') {
        const holz = brau ? waehle(r, ['#4a2f24', '#3d4a2f', '#5a3a28']) : waehle(r, ['#2f3438', '#6b2e35', '#1f3a5f']);
        fb(S, F, 0.15, F.L - 0.15, 0.3, egH - 0.3, 0, 0.16, holz);
        const nf = Math.max(2, Math.round(F.L / 2.2));
        for (let k = 0; k < nf; k++) {
          const u = (F.L * (k + 0.5)) / nf;
          if (k === Math.floor(nf / 2)) { fb(S, F, u - 0.65, u + 0.65, 0.3, 2.7, 0.1, 0.2, '#2b211b'); fform(S, F, bogenForm(u - 0.65, 2.7, u + 0.65, 3.4, 'rund'), 0.12, 0.2, '#e9c46a'); continue; }
          fform(S, F, bogenForm(u - 0.7, 1.1, u + 0.7, egH - 0.8, brau ? 'segment' : null), 0.12, 0.22, brau ? '#e7c27a' : '#5f7787');
          fb(S, F, u - 0.04, u + 0.04, 1.1, egH - 0.85, 0.2, 0.26, holz);
        }
        if (brau) {
          fb(S, F, 0.4, F.L - 0.4, egH - 0.25, egH + 0.55, 0, 0.12, '#f4f2ec');
          ftext(scene, F, namen[i % namen.length], F.L / 2, egH + 0.15, 0.14, 0.55, F.L * 0.9, '#2b211b');
          // Ausleger mit Schild und Laterne
          const [ax, az] = wp(F, 0.6, 0);
          const [nx2, nz2] = [F.nx, F.nz];
          S.box(0.1, 0.1, 0.1, ax, egH + 1.4, az, '#2f3438');
          balken(S, [ax, egH + 1.4, az], [ax + nx2 * 1.6, egH + 1.4, az + nz2 * 1.6], 0.08, 0.08, '#2f3438');
          const sg = new THREE.BoxGeometry(0.06, 0.9, 0.9); sg.rotateY(F.ry); sg.translate(ax + nx2 * 1.1, egH + 0.8, az + nz2 * 1.1); S.add(sg, '#d9a33a');
          S.box(0.35, 0.5, 0.35, ax + nx2 * 1.7, egH + 1.0, az + nz2 * 1.7, '#f3e6b8');
        } else ladenFront(S, scene, teil(F, 0, F.L), 0.3, F.L - 0.3, egH - 0.1, { name: waehle(r, RHEIN_LADEN), blende: holz, vordach: false, auslage: r, tief: -0.05 });
        for (let k = 0; k < n; k++) {
          const y = egH + k * gh + 0.75, na = F.L > 7 ? 3 : 2;
          for (let a = 0; a < na; a++) stuckFenster(S, F, (F.L * (a + 0.5)) / na, y, 1.0, 1.9, { orn, glas: GLAS }, k, r, { verdachung: k === 0 ? 'gerade' : null });
          fb(S, F, -0.02, F.L + 0.02, egH + (k + 1) * gh - 0.12, egH + (k + 1) * gh + 0.05, 0, 0.18, orn);
        }
        fform(S, F, giebelForm(0, F.L, Hh, G, art), -0.2, 0.2, putz, 6);
        fb(S, F, F.L / 2 - 0.45, F.L / 2 + 0.45, Hh + 0.9, Hh + 2.3, 0.2, 0.28, GLAS);
      } else if (F.s === '+x' || F.s === '-x') fb(S, F, 0, F.L, 0.3, Hh, 0, 0.03, dunkler(putz, 0.06));
      else fb(S, F, 0, F.L, 0.3, Hh, 0, 0.03, dunkler(putz, 0.04));
    }
    const dg = dachProfil(hd - 0.2, b - 0.1, G * 0.72, 0.2, 'z'); dg.translate(x + b / 2, Hh, hz + hd / 2); S.add(dg, waehle(r, ['#4f565c', '#5c6870', '#a9523c']));
    // Fässer und Stehtische vor dem Brauhaus
    if (brau) for (let k = 0; k < Math.max(1, Math.floor(b / 2.6)); k++) {
      const fx = x + 1.3 + k * 2.6, fz = D - 1.6;
      zyl(S, 0.42, 0.42, 1.0, fx, 0.38, fz, '#7a5232', 10); zyl(S, 0.45, 0.45, 0.06, fx, 0.6, fz, '#3b3f44', 10); zyl(S, 0.45, 0.45, 0.06, fx, 1.2, fz, '#3b3f44', 10);
      zyl(S, 0.55, 0.55, 0.06, fx, 1.38, fz, '#8a6a4a', 10);
      figur(S, fx + 0.7, fz + 0.3, r, 0.38); if (r() < 0.6) figur(S, fx - 0.6, fz - 0.5, r, 0.38);
    }
    H = Math.max(H, Hh + G);
    x += b; i++;
  }
  boden(S, 0, D - 3.5, W, D, '#d4cbb8', 0.3, 0.08);
  for (let xx = 3; xx < W - 1; xx += 9) laterne(S, xx, D - 0.6, 4.0, 0.38, 'alt', '#2f3438');
  figuren(S, r, 0.5, D - 3.2, W - 0.5, D - 0.4, Math.round(W / 3), 0.38);
  return { hoehe: H };
}
const rheinBrauhaus = slot('slot:rhein_brauhaus', { varianten: ['zeile'], nenn: { zeile: [12, 16] }, roh: brauhausRoh });

// =====================================================================================
// Rheinland: Medienhafen (verformte Bürobauten in Weiß, Klinker und Edelstahl), Kranhaus, Glasbau
// =====================================================================================
function medienhafenRoh(S, scene, p) {
  const r = rng(`medien:${p.seed}:${p.variante}`);
  const { w: W, d: D } = p, v = p.variante;
  boden(S, 0, 0, W, D, '#d6d0c2', 0.3, 0.06);
  for (let x = 2; x < W; x += 4) S.quader(x, 0.36, 0.5, x + 0.08, 0.37, D - 0.5, '#c8c1b1');
  let H = 20;
  if (v === 'gehry') {
    // Drei verformte Häuser nebeneinander: Putz weiß, Klinker rot, Edelstahl. Geschosse leicht verdreht und versetzt.
    const farben = [['#f4f2ec', '#e6e3dc'], ['#a8503a', '#93452f'], ['#c9ced2', '#b3b9be']];
    const bw = (W - 8) / 3;
    for (let k = 0; k < 3; k++) {
      const [f, f2] = farben[k], cx = 3 + k * (bw + 1) + bw / 2, cz = D * 0.48, n = [8, 6, 7][k];
      const bd = Math.min(D - 10, bw * 0.95);
      for (let g = 0; g < n; g++) {
        const t = g / n, dx = Math.sin(t * PI * 1.3 + k) * 1.6, sx = 1 + Math.sin(t * 5 + k) * 0.08;
        S.box(bw * sx, 3.3, bd * (1.04 - t * 0.06), cx + dx, 0.3 + 1.65 + g * 3.3, cz, g % 2 ? f2 : f, Math.sin(t * 4 + k * 2) * 0.09);
        // vorstehende Fensterboxen auf den sichtbaren Seiten
        for (let a = 0; a < 3; a++) {
          const u = (a - 1) * bw * 0.3 + dx + zw(r, -0.6, 0.6);
          S.box(1.5, 1.8, 0.5, cx + u, 0.3 + 1.7 + g * 3.3, cz + bd / 2 + 0.2, '#2f3a43');
          if (a < 2) S.box(0.5, 1.8, 1.5, cx + dx + bw * sx / 2 + 0.2, 0.3 + 1.7 + g * 3.3, cz + (a - 0.5) * bd * 0.4, '#2f3a43');
        }
      }
      H = Math.max(H, 0.3 + n * 3.3);
    }
  } else if (v === 'kranhaus') {
    // Kranhaus: Turm am linken Ende, oben ein langer Ausleger mit drei Geschossen, schräge Stütze am Ende
    const tw = Math.min(16, W * 0.28), td = Math.min(16, D - 8), z0 = (D - td) / 2, Ht = 58, Ha = 16;
    const glas = '#5d7383', band = '#e9e7e2';
    S.quader(2, 0.3, z0, 2 + tw, Ht, z0 + td, glas);
    for (let y = 4; y < Ht - 1; y += 3.4) { S.quader(1.9, y, z0 - 0.1, 2 + tw + 0.1, y + 0.5, z0 + td + 0.1, band); }
    const xa1 = W - 2;
    S.quader(2 + tw, Ht - Ha, z0, xa1, Ht, z0 + td, glas);
    for (let y = Ht - Ha + 0.8; y < Ht; y += 3.4) S.quader(2 + tw, y, z0 - 0.1, xa1 + 0.1, y + 0.5, z0 + td + 0.1, band);
    S.quader(2 + tw, Ht - Ha - 1.2, z0 - 0.3, xa1 + 0.3, Ht - Ha, z0 + td + 0.3, '#c9ccd0');
    S.quader(1.6, Ht, z0 - 0.4, xa1 + 0.4, Ht + 1.0, z0 + td + 0.4, '#c9ccd0');
    // Stützen: rotes Fachwerk unter dem Ausleger
    for (const zz of [z0 + 1, z0 + td - 1]) balken(S, [xa1 - 18, 0.3, zz], [xa1 - 3, Ht - Ha - 1.2, zz], 1.4, 1.4, '#b8433a');
    S.quader(2 + tw, 0.3, z0 + 2, 2 + tw + 10, 6, z0 + td - 2, '#4e5c67');
    H = Ht + 1;
  } else {
    // Glasturm aus zwei gegeneinander versetzten Scheiben mit Fuge, flacher Sockelbau
    const tw = Math.min(30, W - 8), td = Math.min(11, (D - 12) / 2), x0 = (W - tw) / 2, z0 = D / 2 - td - 0.6, Hg = 64;
    S.quader(2, 0.3, D * 0.2, W - 2, 6, D - 6, '#c9d3d9');
    for (const [dz, dx, hh] of [[0, 0, Hg], [td + 1.2, 3, Hg - 6]]) {
      S.quader(x0 + dx, 0.3, z0 + dz, x0 + dx + tw, hh, z0 + dz + td, '#7f98a8');
      for (let y = 4.3; y < hh; y += 3.6) S.quader(x0 + dx - 0.08, y, z0 + dz - 0.08, x0 + dx + tw + 0.08, y + 0.22, z0 + dz + td + 0.08, '#e4e8ea');
      for (let x = x0 + dx + 2; x < x0 + dx + tw; x += 2.5) S.box(0.1, hh - 6, 0.1, x, 6 + (hh - 6) / 2, z0 + dz + td + 0.06, '#e4e8ea');
      S.quader(x0 + dx - 0.3, hh, z0 + dz - 0.3, x0 + dx + tw + 0.3, hh + 1.2, z0 + dz + td + 0.3, '#d9dcdf');
    }
    S.quader(x0 + 1, 0.3, z0 + td, x0 + tw + 2, Hg - 8, z0 + td + 1.2, '#4e5c67');
    H = Hg + 1.2;
  }
  // Uferkante: Poller, Bänke, Leute
  for (let x = 3; x < W - 1; x += 7) poller(S, x, D - 1.2, 0.36);
  for (let x = 8; x < W - 4; x += 16) bank(S, x, D - 3.4, 0, 0.36, '#3b3f44');
  figuren(S, r, 1, D - 4.5, W - 1, D - 1.6, Math.round(W / 4), 0.36);
  return { hoehe: H };
}
const rheinMedienhafen = slot('slot:rhein_medienhafen', {
  varianten: ['gehry', 'kranhaus', 'glas'], nenn: { gehry: [44, 30], kranhaus: [56, 28], glas: [36, 34] },
  roh: medienhafenRoh,
});

// =====================================================================================
// Rheinland: Fernmeldeturm (schlanker Betonschaft, Korb, Antennenmast)
// =====================================================================================
function rheinTurmRoh(S, scene, p) {
  const r = rng(`turm:${p.seed}`);
  const { w: W, d: D } = p, cx = W / 2, cz = D / 2;
  boden(S, 0, 0, W, D, '#d6d0c2', 0.3, 0.06);
  const Hs = 118, beton = '#dcdad4';
  zyl(S, 2.6, 5.2, Hs, cx, 0.3, cz, beton, 20);
  // Kanzel: Unterschale, verglaster Ring, Oberschale
  const yK = Hs * 0.74;
  zyl(S, 7.5, 3.0, 4, cx, yK - 4, cz, beton, 24);
  zyl(S, 7.4, 7.4, 3.6, cx, yK, cz, '#4e5c67', 24);
  zyl(S, 7.9, 7.9, 0.5, cx, yK + 1.7, cz, '#f4f2ec', 24);
  zyl(S, 6.0, 7.9, 2.4, cx, yK + 3.6, cz, beton, 24);
  zyl(S, 5.0, 5.0, 2.2, cx, yK + 6.0, cz, '#4e5c67', 24);
  zyl(S, 3.6, 5.2, 1.4, cx, yK + 8.2, cz, beton, 24);
  // Lichtpunkte am Schaft (Lichtuhr)
  for (let k = 0; k < 14; k++) { const y = 12 + k * 4.6, rad = 5.2 - (2.6 * (y - 0.3)) / Hs; S.box(0.35, 0.35, 0.2, cx + rad * 0.72, y, cz + rad * 0.72, k % 3 ? '#ffd75a' : '#ff4d5e'); }
  // Antennenmast rot-weiß
  for (let k = 0; k < 6; k++) zyl(S, 0.9 - k * 0.1, 1.0 - k * 0.1, 4.5, cx, Hs + k * 4.5, cz, k % 2 ? '#f4f2ec' : '#c9483e', 10);
  // Eingangsbau
  S.quader(cx - 9, 0.3, cz + 4, cx + 9, 4.5, cz + 9, '#e9e7e2');
  S.quader(cx - 8.5, 0.6, cz + 9, cx + 8.5, 3.6, cz + 9.08, '#5f7787');
  figuren(S, r, 1, D - 4, W - 1, D - 1, 8, 0.36);
  return { hoehe: Hs + 27 };
}
const rheinTurm = slot('slot:rhein_turm', { varianten: ['beton'], nenn: { beton: [20, 22] }, roh: rheinTurmRoh });

// =====================================================================================
// Rheinland: Pfalzdom (Oktogon mit Faltkuppel, gotischer Glaschor, Westturm, Kapellenkranz)
// =====================================================================================
function pfalzdomRoh(S, scene, p) {
  const r = rng(`pfalz:${p.seed}`);
  const { w: W, d: D } = p;
  boden(S, 0, 0, W, D, '#ddd3c1', 0.3, 0.06);
  const stein = '#a9a79f', stein2 = '#bdb7a8', dach = '#4f5a62', gold = '#c9a24a';
  const cz = D / 2;
  // Westturm
  const tx = 3, tw = 10, tH = 46;
  S.quader(tx, 0.3, cz - 5, tx + tw, tH, cz + 5, stein2);
  for (const F of sichtbar(p, tx, cz - 5, tw, 10)) for (let k = 0; k < 4; k++) fenster(S, F, F.L / 2, 8 + k * 9, 1.6, 4.2, { art: 'spitz', glas: GLAS, laibung: heller(stein2, 0.05) });
  const sp = new THREE.ConeGeometry(4.2, 12, 4); sp.rotateY(PI / 4); sp.translate(tx + tw / 2, tH + 6, cz); S.add(sp, dach);
  zyl(S, 0.1, 0.1, 3, tx + tw / 2, tH + 12, cz, gold, 4);
  // Oktogon mit sechzehneckigem Umgang und Faltkuppel
  const ox = tx + tw + 12, rO = 11, hO = 22;
  zyl(S, rO + 4.5, rO + 4.5, 12, ox, 0.3, cz, stein, 16);
  const ug = new THREE.ConeGeometry(rO + 5, 3.2, 16); ug.translate(ox, 12.3 + 1.6, cz); S.add(ug, dach);
  zyl(S, rO, rO, hO, ox, 0.3, cz, stein2, 8);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * PI + PI / 8, wx = ox + Math.cos(a) * (rO - 0.2), wz = cz + Math.sin(a) * (rO - 0.2);
    if (Math.cos(a) < -0.2 && Math.sin(a) < -0.2) continue;
    const g = new THREE.BoxGeometry(0.3, 5.5, 2.4); g.rotateY(-a); g.translate(wx, 17, wz); S.add(g, GLAS);
  }
  const ku = new THREE.ConeGeometry(rO + 0.6, 9, 8); ku.translate(ox, hO + 4.5 + 0.3, cz); S.add(ku, dach);
  zyl(S, 1.6, 1.8, 3.4, ox, hO + 9, cz, '#e6dfcf', 8);
  const kk = new THREE.ConeGeometry(2.2, 3.6, 8); kk.translate(ox, hO + 14.2, cz); S.add(kk, dach);
  zyl(S, 0.12, 0.12, 2.6, ox, hO + 16, cz, gold, 4);
  // Gotischer Chor: hohe Glaswände zwischen Strebepfeilern, steiles Dach
  const cx0 = ox + rO - 1, cL = W - cx0 - 4, cd = 14, hC = 30;
  S.quader(cx0, 0.3, cz - cd / 2, cx0 + cL, hC, cz + cd / 2, stein2);
  for (const F of sichtbar(p, cx0, cz - cd / 2, cL, cd)) {
    const n = Math.max(2, Math.round(F.L / 4.2));
    for (let k = 0; k < n; k++) {
      const u = (F.L * (k + 0.5)) / n;
      fform(S, F, bogenForm(u - 1.45, 4, u + 1.45, hC - 3, 'spitz'), 0, 0.12, '#5d7f99');
      for (let q = 1; q < 6; q++) fb(S, F, u - 1.45, u + 1.45, 4 + q * (hC - 9) / 6, 4 + q * (hC - 9) / 6 + 0.12, 0.1, 0.16, '#c9c4b8');
      if (k > 0) fb(S, F, (F.L * k) / n - 0.5, (F.L * k) / n + 0.5, 0.3, hC + 1.5, 0, 0.9, stein);
    }
    fb(S, F, -0.1, F.L + 0.1, hC - 0.6, hC, 0, 0.5, stein);
  }
  const cdach = dachProfil(cL + 0.4, cd + 0.8, 12, 0.2, 'x'); cdach.translate(cx0 + cL / 2, hC, cz); S.add(cdach, dach);
  S.box(0.3, 3.2, 0.3, cx0 + cL - 3, hC + 13.5, cz, gold); S.box(0.3, 0.3, 1.6, cx0 + cL - 3, hC + 14.4, cz, gold);
  // Kapellen am Umgang
  S.quader(ox - 6, 0.3, cz + rO + 3, ox + 6, 9, cz + rO + 8, stein);
  const kd = dachProfil(12.4, 5.4, 3, 0.2, 'x'); kd.translate(ox, 9, cz + rO + 5.5); S.add(kd, dach);
  figuren(S, r, 2, D - 5, W - 2, D - 1, Math.round(W / 3), 0.36);
  return { hoehe: hO + 18 };
}
const westPfalzdom = slot('slot:west_pfalzdom', { varianten: ['dom'], nenn: { dom: [76, 34] }, roh: pfalzdomRoh });


// =====================================================================================
// Ruhr: Brauereiturm (Kühlhausturm einer Brauerei mit Laterne und Leuchtschrift, Gärkeller daneben)
// =====================================================================================
function brauturmRoh(S, scene, p) {
  const r = rng(`brau2:${p.seed}`);
  const { w: W, d: D } = p;
  boden(S, 0, 0, W, D, '#d6d0c2', 0.3, 0.06);
  const tw = Math.min(18, W * 0.5), td = Math.min(18, D - 6), tx = W - tw - 3, tz = 2, Ht = 50;
  const wand = '#c99f78', orn = '#e9dcc4';
  S.quader(tx, 0.3, tz, tx + tw, Ht, tz + td, wand);
  for (const F of sichtbar(p, tx, tz, tw, td)) {
    for (let u = 1.4; u < F.L - 1; u += 3.2) fb(S, F, u - 0.35, u + 0.35, 0.3, Ht - 2, 0, 0.35, orn);
    for (let y = 6; y < Ht - 4; y += 4.4) for (let u = 3; u < F.L - 2; u += 3.2) fb(S, F, u - 0.55, u + 0.55, y, y + 1.6, 0, 0.12, '#3f4a53');
    fb(S, F, -0.1, F.L + 0.1, Ht - 2, Ht, 0, 0.5, orn);
  }
  // Laterne aus Stahl mit Leuchtschrift
  const lh = 9;
  for (const [x, z] of [[tx + 1, tz + 1], [tx + tw - 1, tz + 1], [tx + 1, tz + td - 1], [tx + tw - 1, tz + td - 1]]) S.box(0.5, lh, 0.5, x, Ht + lh / 2, z, '#3b3f44');
  S.quader(tx + 0.6, Ht + lh - 0.6, tz + 0.6, tx + tw - 0.6, Ht + lh, tz + td - 0.6, '#3b3f44');
  S.quader(tx + 1.5, Ht + 0.3, tz + 1.5, tx + tw - 1.5, Ht + lh - 1, tz + td - 1.5, '#e9c46a');
  for (const F of sichtbar(p, tx + 1.5, tz + 1.5, tw - 3, td - 3)) ftext(scene, F, 'BRÄU', F.L / 2, Ht + lh / 2, 0.08, lh * 0.6, F.L * 0.86, '#c9483e');
  // Gärkeller: Backsteinhalle mit Rundbogenfenstern und Schriftzug, davor Biergarten unter Kastanien
  const hw = tx - 4, hd = Math.min(Math.max(16, D * 0.42), 26);
  const bg0 = 2 + hd + 3, bg1 = D - 3, bw = W - 4;
  for (let x = 4; x < bw - 1; x += 5) for (let z = bg0 + 1; z < bg1 - 1; z += 5) {
    if (x > tx - 2 && z < tz + td + 2) continue;
    if (r() < 0.8) bierzeltgarnitur(S, x, z, 0, 0.36);
    if (r() < 0.4) figur(S, x + 0.5, z + 0.8, r, 0.36);
  }
  for (let x = 6; x < bw - 2; x += 10) for (let z = bg0 + 3; z < bg1 - 1; z += 10) { if (x > tx - 4 && z < tz + td + 4) continue; S.box(0.5, 3, 0.5, x, 1.8, z, FARBEN.stamm); kugel(S, x, 5.2, z, 3.0, waehle(r, ['#5a9450', '#4f8a49', '#679e58'])); }
  hecke(S, 2, bg1, W - 2, bg1 + 0.8, 1.0, 0.36);
  if (hw > 10) {
    backsteinHalle(S, scene, p, { x0: 2, z0: 2, w: hw, d: hd, H: 13, wand: waehle(r, BACKSTEIN), orn: '#d9c9a8', dach: '#5a5f63', dachH: 3, achse: 'x', r,
      fenster: { art: 'rund', b: 1.6, h: 2.6, y: 2.0, raster: 3.6, zeilen: 2 }, glas: GLAS });
    for (const F of sichtbar(p, 2, 2, hw, hd)) if (F.s === '+z' && F.L > 16) ftext(scene, F, 'Westfalia-Bräu', F.L / 2, 11.2, 0.3, 1.3, F.L * 0.7, '#f4f0e4');
  }
  figuren(S, r, 1, D - 3, W - 1, D - 0.6, Math.round(W / 4), 0.36);
  return { hoehe: Ht + lh };
}
const ruhrBrauturm = slot('slot:ruhr_brauturm', { varianten: ['turm'], nenn: { turm: [40, 34] }, roh: brauturmRoh });

// @@SLOTS

export const WEST_SLOTS = {
  'slot:ruhr_zeche': ruhrZeche,
  'slot:ruhr_kokerei': ruhrKokerei,
  'slot:ruhr_halde': ruhrHalde,
  'slot:ruhr_siedlung': ruhrSiedlung,
  'slot:ruhr_innenstadt60': ruhrInnenstadt60,
  'slot:ruhr_buero': ruhrBuero,
  'slot:ruhr_bude': ruhrBude,
  'slot:ruhr_kanal': ruhrKanal,
  'slot:ruhr_einkaufszentrum': ruhrEinkaufszentrum,
  'slot:ruhr_bahnhof': ruhrBahnhof,
  'slot:ruhr_stadion': ruhrStadion,
  'slot:rhein_gruenderzeit': rheinGruenderzeit,
  'slot:rhein_wiederaufbau': rheinWiederaufbau,
  'slot:rhein_promenade': rheinPromenade,
  'slot:westf_giebelhaus': westfGiebelhaus,
  'slot:berg_haus': bergHaus,
  'slot:berg_schwebebahn': bergSchwebebahn,
  'slot:rhein_brauhaus': rheinBrauhaus,
  'slot:rhein_medienhafen': rheinMedienhafen,
  'slot:rhein_turm': rheinTurm,
  'slot:west_pfalzdom': westPfalzdom,
  'slot:ruhr_brauturm': ruhrBrauturm,
};

/**
 * Metadaten je Slot für die Integration (bauer.js, stadtplan.js).
 * eigenerBoden: Slot zeichnet seine Fläche selbst. wasser: Slot enthält Wasser unter Geländeniveau (keine Bodenplatte darunter!).
 * wasserY: Standard-Wasserspiegel (über p.wasserY änderbar). wasserZurKamera: Varianten, deren Wasserseite zur Kamera gedreht wird.
 * nenn: Mindestmaß [w, d] bei Front +z je Variante (kleinere Flächen werden verkleinert eingepasst).
 */
export const WEST_META = {
  'slot:ruhr_zeche': { eigenerBoden: true, wasser: false, nenn: { strebe: [92, 72], doppelbock: [96, 72], malakow: [92, 72] }, zustaende: ['aktiv', 'stillgelegt', 'museum'] },
  'slot:ruhr_kokerei': { eigenerBoden: true, wasser: false, nenn: { kokerei: [104, 64], huette: [96, 72], gasometer: [50, 50] }, zustaende: ['aktiv', 'stillgelegt', 'museum'] },
  'slot:ruhr_halde': { eigenerBoden: true, wasser: false, nenn: { pyramide: [64, 64], bramme: [56, 56], treppe: [56, 56], kreuz: [56, 56] } },
  'slot:ruhr_siedlung': { eigenerBoden: true, wasser: false, nenn: { kolonie: [34, 30], kreuz: [28, 36], gartenstadt: [30, 26] } },
  'slot:ruhr_innenstadt60': { eigenerBoden: true, wasser: false, nenn: { zeile: [30, 26], kaufhaus: [48, 34], hochhaus: [44, 34] } },
  'slot:ruhr_buero': { eigenerBoden: true, wasser: false, nenn: { glas60: [52, 40], turm70: [42, 46], backstein20: [44, 30] } },
  'slot:ruhr_bude': { eigenerBoden: true, wasser: false, nenn: { trinkhalle: [16, 14], imbiss: [18, 14], zeile: [20, 16] } },
  'slot:ruhr_kanal': { eigenerBoden: true, wasser: true, wasserY: WEST_WASSER_Y, wasserZurKamera: ['hafen'], nenn: { strecke: [70, 50], hafen: [70, 56], schleuse: [90, 56] } },
  'slot:ruhr_einkaufszentrum': { eigenerBoden: true, wasser: false, nenn: { '70er': [90, 70], '80er': [100, 70], '90er': [110, 76] } },
  'slot:ruhr_bahnhof': { eigenerBoden: true, wasser: false, nenn: { '70er': [70, 54], '50er': [70, 54], altbau: [70, 54] } },
  'slot:ruhr_stadion': { eigenerBoden: true, wasser: false, nenn: { kampfbahn: [124, 96], stadion70: [124, 96], arena: [124, 96] } },
  'slot:rhein_gruenderzeit': { eigenerBoden: true, wasser: false, nenn: { wohnen: [16, 20], laden: [16, 20], eck: [18, 20] } },
  'slot:rhein_wiederaufbau': { eigenerBoden: true, wasser: false, nenn: { geschaeft: [18, 20], hochhaus: [38, 32], wohnhaus: [28, 22] } },
  'slot:rhein_promenade': { eigenerBoden: true, wasser: true, wasserY: RHEIN_WASSER_Y, wasserZurKamera: ['doppelt', 'treppe', 'anleger'], nenn: { doppelt: [50, 44], treppe: [50, 44], anleger: [50, 56] } },
  'slot:westf_giebelhaus': { eigenerBoden: true, wasser: false, nenn: { markt: [16, 22], renaissance: [16, 22], nachkrieg: [16, 22] } },
  // Einzelhaus der Blockrandreihe (kein eigener Boden); p.sockelY hebt das Haus auf einen Bruchsteinsockel (Hanglage), p.laden = Laden im EG
  'slot:berg_haus': { eigenerBoden: false, wasser: false, nenn: { schiefer: [6, 8], fachwerk: [6, 8], putz: [6, 8] } },
  // steht über Wasser (Fluss entlang lokal x, Front +z bzw. +x für Flüsse entlang z), p.ueberhang verlängert den Träger über Brücken
  'slot:berg_schwebebahn': { eigenerBoden: false, wasser: false, nenn: { strecke: [8, 12], station: [30, 14] } },
  'slot:rhein_brauhaus': { eigenerBoden: true, wasser: false, nenn: { zeile: [12, 16] } },
  'slot:rhein_medienhafen': { eigenerBoden: true, wasser: false, nenn: { gehry: [44, 30], kranhaus: [56, 28], glas: [36, 34] } },
  'slot:rhein_turm': { eigenerBoden: true, wasser: false, nenn: { beton: [20, 22] } },
  'slot:west_pfalzdom': { eigenerBoden: true, wasser: false, nenn: { dom: [76, 34] } },
  'slot:ruhr_brauturm': { eigenerBoden: true, wasser: false, nenn: { turm: [40, 34] } },
};

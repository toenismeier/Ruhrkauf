// Gemeinsame Helfer für sporthaus.js und wettbewerber.js (eigene Kopien, warenhaus.js bleibt unberührt).
// Seite: lokales Fassadensystem. u = Lauf entlang der Fassade (u = L ist immer die sichtbare Hausecke),
// y = Höhe, t = Abstand nach außen (t < 0 liegt hinter der Fassadenebene).
import { THREE, waehle, zw, heller, dunkler, textTextur, textMaterial } from './basis.js';

export const GLAS = '#4d6677', GLAS_D = '#2f3d48', GLAS_HELL = '#7d9fb2', LICHT = '#f7e9c8', RAHMEN = '#3a4148', STAHL = '#8f989f';
export const KIES = '#bab8b2', KIES_D = '#a9a7a1';
export const KLEID = ['#d04a3f', '#2f63b5', '#e8e4dc', '#e0b23c', '#5b8f5a', '#8d5fbf', '#ef8b4c', '#2b2b2b', '#f2c6d2', '#7d97b8', '#1f3f6b'];
export const AUTO = ['#d04a3f', '#2f63b5', '#f1f1ee', '#2a2d31', '#e0b23c', '#8c9aa6', '#5b8f5a', '#f1f1ee', '#9aa4ad'];
export const BUNT = ['#e04b3a', '#f2c14e', '#3a7bd5', '#4caf50', '#ff8c42', '#8d5fbf', '#ffffff'];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function spiegeln(g) {
  for (const n of ['position', 'normal']) {
    const a = g.attributes[n]?.array;
    if (!a) continue;
    for (let i = 0; i < a.length; i += 3) { const t = a[i]; a[i] = a[i + 2]; a[i + 2] = t; }
    for (let i = 0; i < a.length; i += 9) for (let k = 0; k < 3; k++) { const t = a[i + 3 + k]; a[i + 3 + k] = a[i + 6 + k]; a[i + 6 + k] = t; }
  }
}
export class Seite {
  constructor(S, x0, z0, w, d, seite) {
    Object.assign(this, { S, x0, z0, w, d, seite });
    this.L = seite === '+z' ? w : d;
    this.ebene = seite === '+z' ? z0 + d : x0 + w;
    this.basis = seite === '+z' ? x0 : z0;
    this.lese = seite === '+z' ? 1 : -1;
  }
  q(u0, u1, y0, y1, t0, t1, f) {
    if (Math.abs(u1 - u0) < 1e-3 || Math.abs(y1 - y0) < 1e-3 || Math.abs(t1 - t0) < 1e-3) return;
    if (this.seite === '+z') this.S.quader(this.basis + u0, y0, this.ebene + t0, this.basis + u1, y1, this.ebene + t1, f);
    else this.S.quader(this.ebene + t0, y0, this.basis + u0, this.ebene + t1, y1, this.basis + u1, f);
  }
  welt(u, t) { return this.seite === '+z' ? [this.basis + u, this.ebene + t] : [this.ebene + t, this.basis + u]; }
  geo(g, f) {
    g = g.index ? g.toNonIndexed() : g;
    for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
    if (this.seite === '+x') spiegeln(g);
    const [x, z] = this.welt(0, 0);
    g.translate(x, 0, z);
    this.S.add(g, f);
  }
  kipp(bu, by, bt, u, y, t, f, rz = 0, rx = 0) {
    const g = new THREE.BoxGeometry(bu, by, bt);
    if (rx) g.rotateX(rx);
    if (rz) g.rotateZ(rz);
    g.translate(u, y, t);
    this.geo(g, f);
  }
  flaeche(mesh, u, y, t, rz = 0) {
    if (this.seite === '+z') { mesh.position.set(this.basis + u, y, this.ebene + t); mesh.rotation.set(0, 0, rz); }
    else { mesh.position.set(this.ebene + t, y, this.basis + u); mesh.rotation.set(0, Math.PI / 2, rz); }
  }
}
export const seitenVon = (S, x0, z0, w, d) => [new Seite(S, x0, z0, w, d, '+z'), new Seite(S, x0, z0, w, d, '+x')];

export function zyl(S, x, y0, z, rad, h, f, seg = 12, oben = rad) {
  const g = new THREE.CylinderGeometry(oben, rad, h, seg);
  g.translate(x, y0 + h / 2, z);
  S.add(g, f);
}
export function viertelzylinder(S, cx, cz, rad, y0, y1, f, seg = 12) {
  const g = new THREE.CylinderGeometry(rad, rad, y1 - y0, seg, 1, false, 0, Math.PI / 2);
  g.translate(cx, (y0 + y1) / 2, cz);
  S.add(g, f);
}
/** Prisma entlang x (x0..x1) mit Querschnitt pts = [[z, y], ...] (gegen den Uhrzeigersinn in z/y), Basis y. */
export function prismaX(S, x0, x1, pts, y, f) {
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) sh.lineTo(p[0], p[1]);
  sh.closePath();
  let g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false });
  g = g.toNonIndexed();
  for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
  spiegeln(g);
  g.translate(x0, y, 0);
  S.add(g, f);
}
/** Pultdach über x0..x1 × z0..z1: vorne (z1) Höhe h0, hinten (z0) Höhe h1. */
export function pult(S, x0, z0, x1, z1, y, h0, h1, f) { prismaX(S, x0, x1, [[z0, 0], [z1, 0], [z1, h0], [z0, h1]], y, f); }

// ---------------------------------------------------------------- Schrift
// Texturen und Materialien aus dem gemeinsamen Cache in basis.js
export function tex(text, farbe, bg = null, schrift) {
  return schrift ? textTextur(text, farbe, 120, bg, schrift, !schrift.includes('Serif')) : textTextur(text, farbe, 120, bg);
}
function texMat(text, farbe, bg, schrift, lit) {
  return textMaterial(text, farbe, { groesse: 120, hintergrund: bg ?? null, alphaTest: 0.45, lit: !!lit, ...(schrift ? { schrift, fett: !schrift.includes('Serif') } : {}) }).mat;
}
export const plakatBreite = (text, ph, schrift) => tex(text, '#000', '#fff', schrift).seitenverhaeltnis * ph;
/** Textfläche an einer Seite. Gibt Breite zurück. o: { schrift, lit, rz } */
export function plakat(scene, s, text, u, y, t, ph, farbe, bg = null, o = {}) {
  const sv = tex(text, farbe, bg, o.schrift).seitenverhaeltnis;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sv * ph, ph), texMat(text, farbe, bg, o.schrift, !!o.lit));
  s.flaeche(m, u, y, t, o.rz ?? 0);
  scene.add(m);
  return sv * ph;
}
/** Schrift auf Breite einpassen: Höhe so, dass Breite ≤ maxB und Höhe ≤ maxH. */
export function passend(text, maxB, maxH, schrift) { return Math.min(maxH, maxB / tex(text, '#000', null, schrift).seitenverhaeltnis); }
/** Text liegend auf dem Boden/Dach (Blick von oben). */
export function bodenText(scene, text, x, y, z, h, farbe, drehung = 0) {
  const sv = tex(text, farbe).seitenverhaeltnis;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sv * h, h), texMat(text, farbe, null, undefined, false));
  m.rotation.set(-Math.PI / 2, 0, drehung);
  m.position.set(x, y, z);
  scene.add(m);
}

// ---------------------------------------------------------------- Figuren und Waren
export function puppe(s, u, y, t, oben, unten, sk = 1) {
  s.q(u - 0.17 * sk, u + 0.17 * sk, y, y + 0.95 * sk, t - 0.1, t + 0.1, unten);
  s.q(u - 0.26 * sk, u + 0.26 * sk, y + 0.95 * sk, y + 1.62 * sk, t - 0.13, t + 0.13, oben);
  s.q(u - 0.11 * sk, u + 0.11 * sk, y + 1.64 * sk, y + 1.92 * sk, t - 0.11, t + 0.11, '#f1ece4');
}
export function mensch(S, r, x, y, z) {
  const c = waehle(r, KLEID);
  S.box(0.42, 0.85, 0.3, x, y + 0.42, z, waehle(r, ['#2b3a55', '#3a3a3a', '#6b5a48', '#20304a']));
  S.box(0.5, 0.7, 0.34, x, y + 1.2, z, c);
  S.box(0.24, 0.26, 0.24, x, y + 1.68, z, '#e8cfb4');
}
export function rad(s, u, y, t, farbe) {
  for (const du of [-0.6, 0.6]) { const g = new THREE.TorusGeometry(0.4, 0.05, 4, 12); g.translate(u + du, y + 0.42, t); s.geo(g, '#2b2b2b'); }
  s.kipp(1.3, 0.09, 0.09, u, y + 0.72, t, farbe, 0.32);
  s.q(u - 0.08, u + 0.08, y + 0.42, y + 1.0, t - 0.04, t + 0.04, '#555555');
}
export function auto(S, r, x, z, y = 0.3, quer = false) {
  const c = waehle(r, AUTO);
  if (quer) { S.box(4.3, 0.9, 1.85, x, y + 0.5, z, c); S.box(2.2, 0.65, 1.65, x - 0.15, y + 1.27, z, '#9bb7c7'); }
  else { S.box(1.85, 0.9, 4.3, x, y + 0.5, z, c); S.box(1.65, 0.65, 2.2, x, y + 1.27, z - 0.15, '#9bb7c7'); }
}
export function busch(S, r, x, y, z, s = 1) {
  const g = new THREE.IcosahedronGeometry(0.9 * s * (0.8 + r() * 0.4), 0);
  g.scale(1, 0.75, 1); g.translate(x, y + 0.6 * s, z);
  S.add(g, waehle(r, ['#6fa860', '#5f9a56', '#7cb369']));
}
export function kuebelbaum(S, r, x, y, z, s = 1) {
  S.box(1.1 * s, 0.7 * s, 1.1 * s, x, y + 0.35 * s, z, '#8b8f93');
  S.box(0.18 * s, 1.4 * s, 0.18 * s, x, y + 1.3 * s, z, '#7a5d43');
  const g = new THREE.IcosahedronGeometry(1.1 * s * (0.85 + r() * 0.3), 0); g.translate(x, y + 2.5 * s, z);
  S.add(g, waehle(r, ['#6fa860', '#5f9a56', '#7cb369']));
}

// ---------------------------------------------------------------- Dach
export function attika(S, x0, z0, w, d, y, h, f, dick = 0.45) {
  S.quader(x0, y, z0, x0 + w, y + 0.15, z0 + d, KIES);
  S.quader(x0, y, z0 + d - dick, x0 + w, y + h, z0 + d, f);
  S.quader(x0 + w - dick, y, z0, x0 + w, y + h, z0 + d, f);
  S.quader(x0, y, z0, x0 + w, y + h, z0 + dick, f);
  S.quader(x0, y, z0, x0 + dick, y + h, z0 + d, f);
  S.quader(x0 - 0.08, y + h, z0 + d - dick - 0.08, x0 + w + 0.08, y + h + 0.1, z0 + d + 0.08, heller(f, 0.04));
  S.quader(x0 + w - dick - 0.08, y + h, z0 - 0.08, x0 + w + 0.08, y + h + 0.1, z0 + d + 0.08, heller(f, 0.04));
}
export function lichtkuppeln(S, x0, z0, x1, z1, y, ax = 6, az = 7, f = '#e8eef0') {
  if (x1 - x0 < 5 || z1 - z0 < 5) return;
  const nx = Math.max(1, Math.floor((x1 - x0 - 1) / ax)), nz = Math.max(1, Math.floor((z1 - z0 - 1) / az));
  const ox = x0 + (x1 - x0 - (nx - 1) * ax) / 2, oz = z0 + (z1 - z0 - (nz - 1) * az) / 2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    S.box(1.8, 0.3, 1.8, ox + i * ax, y + 0.15, oz + j * az, '#d3d0c9');
    S.box(1.35, 0.32, 1.35, ox + i * ax, y + 0.45, oz + j * az, f);
  }
}
export function technik(S, r, x0, z0, x1, z1, y, o = {}) {
  if (x1 - x0 < 5 || z1 - z0 < 5) return;
  const fl = (x1 - x0) * (z1 - z0);
  const anz = Math.min(o.max ?? 6, Math.max(1, Math.round(fl / 260)));
  const belegt = [];
  const f = o.farbe ?? '#c9c6bf';
  for (let v = 0; v < anz * 6 && belegt.length < anz; v++) {
    const typ = belegt.length === 0 ? 'lueftung' : waehle(r, ['lueftung', 'kuehler', 'kuehler', 'rohr', 'kasten']);
    const [bw, bd, bh] = { lueftung: [zw(r, 4, 8), zw(r, 2.5, 4.5), zw(r, 1.8, 2.8)], kuehler: [zw(r, 3.5, 5.5), 2.0, 1.2], rohr: [zw(r, 5, 8), 0.7, 0.7], kasten: [zw(r, 1.8, 3), zw(r, 1.8, 3), zw(r, 1.2, 2)] }[typ];
    if (bw > x1 - x0 - 1.5 || bd > z1 - z0 - 1.5) continue;
    const cx = zw(r, x0 + bw / 2 + 0.7, x1 - bw / 2 - 0.7), cz = zw(r, z0 + bd / 2 + 0.7, z1 - bd / 2 - 0.7);
    if (belegt.some((b) => Math.abs(b[0] - cx) < (b[2] + bw) / 2 + 0.7 && Math.abs(b[1] - cz) < (b[3] + bd) / 2 + 0.7)) continue;
    belegt.push([cx, cz, bw, bd]);
    if (typ === 'rohr') {
      const g = new THREE.CylinderGeometry(0.35, 0.35, bw, 8); g.rotateZ(Math.PI / 2); g.translate(cx, y + 0.8, cz); S.add(g, '#d6d8da');
      S.box(0.3, 0.55, 0.3, cx - bw / 3, y + 0.28, cz, '#9aa0a5'); S.box(0.3, 0.55, 0.3, cx + bw / 3, y + 0.28, cz, '#9aa0a5');
      continue;
    }
    S.box(bw, bh, bd, cx, y + bh / 2, cz, f);
    S.box(bw + 0.2, 0.14, bd + 0.2, cx, y + bh + 0.07, cz, heller(f, 0.05));
    if (typ === 'lueftung') for (let k = 0; k < 3; k++) {
      const yy = y + 0.45 + k * (bh - 0.8) / 2;
      S.box(bw * 0.8, 0.12, 0.08, cx, yy, cz + bd / 2 + 0.04, dunkler(f, 0.14));
      S.box(0.08, 0.12, bd * 0.75, cx + bw / 2 + 0.04, yy, cz, dunkler(f, 0.14));
    }
    if (typ === 'kuehler') for (let k = 0; k < Math.floor(bw / 1.7); k++) zyl(S, cx - bw / 2 + 0.85 + k * 1.7, y + bh, cz, 0.65, 0.16, '#5d646a', 10);
  }
}
export function solar(S, x0, z0, x1, z1, y) {
  for (let z = z0 + 0.5; z + 2 < z1; z += 3.0) for (let x = x0 + 0.5; x + 4 < x1; x += 4.5) {
    const g = new THREE.BoxGeometry(4.1, 0.08, 1.8); g.rotateX(-0.3); g.translate(x + 2.05, y + 0.55, z + 0.95); S.add(g, '#2c4a73');
  }
}
/** Parkplatzreihe: Stellplätze entlang x, Autos nach Zufall. */
export function parkreihe(S, r, x0, x1, z0, tiefe, y, quote = 0.6) {
  for (let x = x0; x + 2.5 <= x1; x += 2.6) {
    S.box(0.12, 0.03, tiefe, x, y + 0.02, z0 + tiefe / 2, '#f2f1ec');
    if (r() < quote) auto(S, r, x + 1.3, z0 + tiefe / 2, y);
  }
}

// ---------------------------------------------------------------- Gerüst (Umbau)
export function geruest(s, u0, u1, yTop, plane = '#eef1f2') {
  const rohr = '#9ca3a8', brett = '#c79a5a', t1 = 0.8, t2 = 1.9;
  const nU = Math.max(2, Math.round((u1 - u0) / 2.6));
  const du = (u1 - u0) / nU;
  for (let i = 0; i <= nU; i++) {
    const u = u0 + i * du;
    s.q(u - 0.06, u + 0.06, 0.3, yTop, t1 - 0.06, t1 + 0.06, rohr);
    s.q(u - 0.06, u + 0.06, 0.3, yTop + 1, t2 - 0.06, t2 + 0.06, rohr);
  }
  let k = 0;
  for (let y = 2.1; y < yTop; y += 2.0, k++) {
    s.q(u0, u1, y - 0.05, y + 0.05, t1 - 0.05, t2 + 0.05, brett);
    s.q(u0, u1, y + 1.0, y + 1.08, t2 - 0.05, t2 + 0.05, rohr);
    if (k % 2 === 0) s.kipp(Math.hypot(du, 2.0), 0.08, 0.08, u0 + du * (0.5 + (k % nU)), y - 1.0, t2 + 0.08, rohr, Math.atan2(2.0, du));
  }
  const p0 = Math.min(yTop - 2, 4.2);
  const bahnen = Math.max(1, Math.round((u1 - u0) / 3.2));
  for (let i = 0; i < bahnen; i++) {
    const a = u0 + (i * (u1 - u0)) / bahnen + 0.05, b = u0 + ((i + 1) * (u1 - u0)) / bahnen - 0.05;
    s.q(a, b, p0, yTop + 0.8, t2 + 0.1, t2 + 0.16, i % 3 === 1 ? '#dfe7e2' : plane);
  }
  return { p0, t: t2 + 0.2 };
}

/** Buchten [a, b] zwischen u0 und u1 im Raster, mit Pfeilerbreite pb. */
export function buchten(u0, u1, raster, pb = 0.3) {
  const len = u1 - u0;
  if (len < 1.5) return [];
  const nb = Math.max(1, Math.round(len / raster)), bw = len / nb;
  return Array.from({ length: nb }, (_, i) => [u0 + i * bw + pb / 2, u0 + (i + 1) * bw - pb / 2]);
}
/** Fassadenhaut zwischen t0 und t1 mit Öffnungen [{a, b, y0, y1}]. */
export function wand(s, u0, u1, y0, y1, t0, t1, oeff, f) {
  const o = oeff.filter((g) => g.b > u0 && g.a < u1).sort((p, q) => p.a - q.a);
  let c = u0;
  for (const g of o) {
    if (g.a > c) s.q(c, g.a, y0, y1, t0, t1, f);
    if (g.y0 > y0) s.q(Math.max(g.a, u0), Math.min(g.b, u1), y0, Math.min(g.y0, y1), t0, t1, f);
    if (g.y1 < y1) s.q(Math.max(g.a, u0), Math.min(g.b, u1), Math.max(g.y1, y0), y1, t0, t1, f);
    c = Math.max(c, g.b);
  }
  if (c < u1) s.q(c, u1, y0, y1, t0, t1, f);
}

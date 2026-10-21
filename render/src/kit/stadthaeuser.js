// Stadthäuser: normale Innenstadtbebauung (Blockrand), sieben Stilfamilien plus Eckhaus-Variante.
// Bildsprache Coffee Inc 2: hell, feingliedrig, Detail aus Geometrie.
//
// Export:
//   stadthaus(S, scene, { x, z, w, d, geschosse, stil, seed, eck, strasse, seite })
//   zufallsStadthaus(S, scene, { x, z, w, d, seed, eck?, strasse?, seite? })
//   haeuserzeile(S, scene, { x, z, laenge, d, seed, eckRechts? })
//   STILE
//
// Fassadenkoordinaten: jede sichtbare Fassade ist ein Rahmen F mit u (von links nach rechts, wie im Bild),
// y (oben) und t (nach außen, 0 = Wandflucht). Damit funktionieren +z, +x und schräge/runde Ecken gleich.
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { THREE, rng, waehle, zw, FARBEN, heller, dunkler, textMaterial } from './basis.js';

export const STILE = ['gruenderzeit', 'jugendstil', 'backstein', 'fachwerk', 'fuenfziger', 'siebziger', 'neubau'];

const RAHMEN = '#f6f3ec';
const ORN = '#f8f5ee';
const METALL = '#3b4046';
const GLAS_LADEN = '#5f7787';
const GELAENDER = '#3b3f44';
const GLAS_GELAENDER = '#a9c3cf';
const KIES = '#b9b4aa';
const TECHNIK = '#c9cdd0';
const MARKISEN = ['#c9483e', '#2f6f8f', '#3f7d56', '#d39a2b', '#6b4f8f', '#8c3b3b', '#e07a3f', '#1f3a5f', '#9b2f4f', '#4f7f8f', '#b8a16b', '#5a8f3c'];
const LADENRAHMEN = ['#3f4a53', '#2f5d4a', '#6b2e35', '#5a4636', '#1f3a5f', '#38424a', '#7a2f2f', '#2e4f6b', '#e9e4da'];
const LADENNAMEN = [
  'Bäckerei Krause', 'Apotheke am Markt', 'Optik Lange', 'Café Fräulein', 'Blumen Hoffmann', 'Metzgerei Brandt',
  'Buchhandlung Seidel', 'Schuhhaus Wendt', 'Reisebüro Sonnenschein', 'Friseur Schnittpunkt', 'Eiscafé Dolce',
  'Juwelier Albrecht', 'Drogerie Körner', 'Kiosk am Eck', 'Feinkost Schäfer', 'Teehaus Löwe', 'Modehaus Engel',
  'Zeitschriften Wolf', 'Pizzeria Bella', 'Spielwaren Kunz', 'Bistro Ecke', 'Uhren Graf', 'Fahrräder Lux',
  'Kaffeerösterei Bohne', 'Weinhandlung Ritter', 'Schreibwaren Haas', 'Hörgeräte Klar', 'Brillen Fuchs',
  'Nähstube Ilse', 'Fotostudio Blitz', 'Imbiss Zur Post', 'Konditorei Sahne', 'Bioladen Grünzeug',
  'Parfümerie Duft', 'Lederwaren Kober', 'Sanitätshaus Vogt', 'Reinigung Blank', 'Tabak Möller',
  'Haushaltswaren Pohl', 'Antiquariat Bücherwurm', 'Goldschmiede Funk', 'Wäsche Winter', 'Hutmacherei Stein',
  'Teppich Kaiser', 'Feinkost Bruns', 'Metzgerei Heller', 'Café Kranz', 'Bäckerei Jansen',
];

/** Seed gut durchmischen (murmur3-Finalizer), damit benachbarte Seeds nicht ähnliche Häuser liefern. */
function mischHash(a, b = 0) {
  let h = (Math.imul(a >>> 0, 0x9e3779b1) ^ Math.imul(b + 0x7f4a7c15, 0x85ebca6b)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function mischen(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ======================================================================
// Geometrie
// ======================================================================

/** Dreiecke -> BufferGeometry mit flachen Normalen, Orientierung nach außen (konvexe Körper). */
function dreieckGeo(tris) {
  let cx = 0, cy = 0, cz = 0, k = 0;
  for (const t of tris) for (const p of t) { cx += p[0]; cy += p[1]; cz += p[2]; k++; }
  cx /= k; cy /= k; cz /= k;
  const pos = [], nor = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), N = new THREE.Vector3();
  for (const [a, b, c] of tris) {
    A.fromArray(a); B.fromArray(b); C.fromArray(c);
    e1.subVectors(B, A); e2.subVectors(C, A); N.crossVectors(e1, e2);
    const len = N.length(); if (len < 1e-7) continue;
    N.divideScalar(len);
    const mx = (a[0] + b[0] + c[0]) / 3 - cx, my = (a[1] + b[1] + c[1]) / 3 - cy, mz = (a[2] + b[2] + c[2]) / 3 - cz;
    let p1 = b, p2 = c;
    if (N.x * mx + N.y * my + N.z * mz < 0) { N.negate(); p1 = c; p2 = b; }
    pos.push(...a, ...p1, ...p2);
    for (let i = 0; i < 3; i++) nor.push(N.x, N.y, N.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

/** Konvexes Polygon [[x,z]...] je Kante um ins[i] nach innen versetzen (negativ = nach außen). */
function versetztRoh(poly, ins) {
  const n = poly.length;
  let cx = 0, cz = 0; for (const p of poly) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
  const lin = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const L = wurzelSumme(dx, dz) || 1; dx /= L; dz /= L;
    let nx = -dz, nz = dx;
    if (nx * (cx - a[0]) + nz * (cz - a[1]) > 0) { nx = -nx; nz = -nz; }
    lin.push([nx, nz, nx * a[0] + nz * a[1] - (ins[i] ?? 0)]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const L1 = lin[(i - 1 + n) % n], L2 = lin[i];
    const det = L1[0] * L2[1] - L1[1] * L2[0];
    if (Math.abs(det) < 1e-9) { out.push([poly[i][0] - L2[0] * (ins[i] ?? 0), poly[i][1] - L2[1] * (ins[i] ?? 0)]); continue; }
    out.push([(L1[2] * L2[1] - L2[2] * L1[1]) / det, (L1[0] * L2[2] - L2[0] * L1[2]) / det]);
  }
  return out;
}
/** Wie versetztRoh, schrumpft die Einzüge aber, falls eine Kante umklappen würde. */
function versetzt(poly, ins) {
  for (let f = 1; f > 0.05; f -= 0.08) {
    const q = versetztRoh(poly, ins.map((v) => (v > 0 ? v * f : v)));
    let ok = true;
    for (let i = 0; i < poly.length && ok; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], c = q[i], d = q[(i + 1) % q.length];
      if ((b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]) < -1e-6) ok = false;
    }
    if (ok) return q;
  }
  return poly.slice();
}

/** Prismoid: Grundpolygon bei y0, Deckpolygon (versetzt um ins) bei y0+h. Körper, Dächer, Walme, Helme. */
function prismoid(poly, y0, h, ins = []) {
  const top = ins.some((v) => v) ? versetzt(poly, ins) : poly;
  const n = poly.length, y1 = y0 + h, tris = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const b0 = [poly[i][0], y0, poly[i][1]], b1 = [poly[j][0], y0, poly[j][1]];
    const t0 = [top[i][0], y1, top[i][1]], t1 = [top[j][0], y1, top[j][1]];
    tris.push([b0, b1, t1], [b0, t1, t0]);
  }
  for (let i = 1; i < n - 1; i++) {
    tris.push([[top[0][0], y1, top[0][1]], [top[i][0], y1, top[i][1]], [top[i + 1][0], y1, top[i + 1][1]]]);
    tris.push([[poly[0][0], y0, poly[0][1]], [poly[i][0], y0, poly[i][1]], [poly[i + 1][0], y0, poly[i + 1][1]]]);
  }
  return dreieckGeo(tris);
}
function nGon(cx, cz, R, seg, start = Math.PI / seg) {
  // Reihenfolge so, dass die Außennormale (-dz, dx) nach außen zeigt
  const p = [];
  for (let j = seg; j > 0; j--) { const th = start + (j * 2 * Math.PI) / seg; p.push([cx + R * Math.cos(th), cz + R * Math.sin(th)]); }
  return p;
}
function rechteck(x0, z0, x1, z1) { return [[x0, z1], [x1, z1], [x1, z0], [x0, z0]]; } // Kanten: +z, +x, -z, -x
function punktIn(poly, r) {
  const w = poly.map(() => r() + 0.15); const s = w.reduce((a, b) => a + b, 0);
  let x = 0, z = 0; poly.forEach((p, i) => { x += (p[0] * w[i]) / s; z += (p[1] * w[i]) / s; });
  return [x, z];
}

// Schrifttexturen werden geteilt (Cache in basis.js): 500 Parzellen sollen nicht 5.000 Texturen erzeugen.
const schriftAusCache = (str, farbe) => textMaterial(str, farbe, { groesse: 96 });

// ======================================================================
// Fassadenrahmen
// ======================================================================
class Fassade {
  constructor(ctx, a, b, info = {}) {
    this.ctx = ctx; this.a = a; this.b = b;
    this.art = info.art; this.label = info.label; this.extL = info.extL; this.extR = info.extR;
    this.eckIndex = info.eckIndex ?? -1; this.eckAnzahl = info.eckAnzahl ?? 0;
    const dx = b[0] - a[0], dz = b[1] - a[1]; this.L = wurzelSumme(dx, dz);
    this.dx = dx / this.L; this.dz = dz / this.L; this.nx = -this.dz; this.nz = this.dx;
    this.m = new THREE.Matrix4().makeRotationY(Math.atan2(-this.dz, this.dx)).setPosition(a[0], 0, a[1]);
  }
  info() { return { art: this.art, label: this.label, extL: this.extL, extR: this.extR, eckIndex: this.eckIndex, eckAnzahl: this.eckAnzahl }; }
  versatz(t) {
    const ox = this.nx * t, oz = this.nz * t;
    return new Fassade(this.ctx, [this.a[0] + ox, this.a[1] + oz], [this.b[0] + ox, this.b[1] + oz], this.info());
  }
  welt(u, t = 0) { return [this.a[0] + this.dx * u + this.nx * t, this.a[1] + this.dz * u + this.nz * t]; }
  spanne(t) { return [this.extL ? -t : 0, this.extR ? this.L + t : this.L]; }
  box(u0, u1, y0, y1, t0, t1, f) {
    const w = u1 - u0, h = y1 - y0, d = t1 - t0;
    if (w <= 1e-3 || h <= 1e-3 || d <= 1e-3) return;
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate((u0 + u1) / 2, (y0 + y1) / 2, (t0 + t1) / 2);
    g.applyMatrix4(this.m); this.ctx.S.add(g, f);
  }
  geo(g, f) { g.applyMatrix4(this.m); this.ctx.S.add(g, f); }
  /** Balken von (ua,ya) nach (ub,yb) in der Fassadenebene. */
  strebe(ua, ya, ub, yb, dick, t1, f) {
    const len = wurzelSumme(ub - ua, yb - ya); if (len < 0.05) return;
    const g = new THREE.BoxGeometry(len, dick, t1);
    g.rotateZ(Math.atan2(yb - ya, ub - ua));
    g.translate((ua + ub) / 2, (ya + yb) / 2, t1 / 2);
    this.geo(g, f);
  }
  /** Profil (Shape in u/y) als Prisma von t0 bis t1. */
  profil(shape, u, y, t0, t1, f, seg = 8) {
    const g = new THREE.ExtrudeGeometry(shape, { depth: t1 - t0, bevelEnabled: false, curveSegments: seg });
    g.translate(u, y, t0); this.geo(g, f);
  }
  text(str, u, y, h, farbe, t, maxB) {
    const { mat: smat, seitenverhaeltnis: sv } = schriftAusCache(str, farbe);
    let hh = h, bw = h * sv;
    if (maxB && bw > maxB) { hh = (h * maxB) / bw; bw = maxB; }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(bw, hh), smat);
    m.position.set(u, y, t); m.updateMatrix(); m.applyMatrix4(this.m);
    this.ctx.scene.add(m);
    return bw;
  }
}

// ======================================================================
// Grundriss und sichtbare Seiten
// ======================================================================
function grundriss(x, z, w, d, form, c) {
  const P = [], K = [];
  P.push([x, z + d]); K.push('+z');
  if (form === 'schraeg') { P.push([x + w - c, z + d]); K.push('ecke'); P.push([x + w, z + d - c]); K.push('+x'); }
  else if (form === 'rund') {
    const k = 4, cx = x + w - c, cz = z + d - c;
    for (let j = 0; j <= k; j++) { const th = (Math.PI / 2) * (1 - j / k); P.push([cx + c * Math.cos(th), cz + c * Math.sin(th)]); K.push(j < k ? 'ecke' : '+x'); }
  } else { P.push([x + w, z + d]); K.push('+x'); }
  P.push([x + w, z]); K.push('-z');
  P.push([x, z]); K.push('-x');
  return { P, K };
}
function artVon(ctx, lb) {
  if (ctx.eck) return lb === '+z' || lb === '+x' ? 'haupt' : lb === 'ecke' ? 'ecke' : null;
  if (lb === ctx.strasse) return 'haupt';
  if ((lb === '+z' || lb === '+x') && ctx.seite === 'frei') return 'neben';
  return null;
}
const sichtbar = (ctx, lb) => !!artVon(ctx, lb);
function dachKante(ctx, lb) {
  if (ctx.eck) return lb === '+z' || lb === '+x' || lb === 'ecke';
  return ctx.strasse === '+z' ? lb === '+z' || lb === '-z' : lb === '+x' || lb === '-x';
}
function fassadenFuer(ctx, P, K) {
  const out = [], m = P.length, eckN = K.filter((k) => k === 'ecke').length;
  let eckI = 0;
  for (let i = 0; i < m; i++) {
    const art = artVon(ctx, K[i]); if (!art) continue;
    out.push(new Fassade(ctx, P[i], P[(i + 1) % m], {
      art, label: K[i], extL: sichtbar(ctx, K[(i - 1 + m) % m]), extR: sichtbar(ctx, K[(i + 1) % m]),
      eckIndex: art === 'ecke' ? eckI++ : -1, eckAnzahl: eckN,
    }));
  }
  return out;
}
function achsen(L, raster, rand) {
  const nutz = Math.max(0.5, L - 2 * rand);
  const k = Math.max(1, Math.round(nutz / raster));
  const s = nutz / k;
  const a = Array.from({ length: k }, (_, i) => rand + s * (i + 0.5));
  a.abstand = s;
  return a;
}
function gesperrt(ctx, F, u) {
  const s = ctx.sperre?.[F.label]; if (!s) return false;
  return s.some(([a, b]) => u > a && u < b);
}

// ======================================================================
// Bauteile
// ======================================================================
/** Fenster mit Rahmen, Faschen, Sohlbank, Verdachung, Sprossen, Läden. yb = Unterkante Glas. */
function fenster(F, u, yb, fw, fh, o = {}) {
  const glas = o.glas ?? FARBEN.fenster, rahmen = o.rahmen ?? RAHMEN, t0 = o.t ?? 0;
  const h2 = fw / 2;
  if (o.faschen) {
    const fb = o.fb ?? 0.16; F.box(u - h2 - fb, u + h2 + fb, yb - (o.sims ? 0.04 : fb), yb + fh + fb, t0 - 0.02, t0 + 0.035, o.faschen);
    if (o.ohren) { F.box(u - h2 - fb - 0.14, u - h2 - fb + 0.01, yb + fh - 0.2, yb + fh + fb, t0 - 0.02, t0 + 0.035, o.faschen); F.box(u + h2 + fb - 0.01, u + h2 + fb + 0.14, yb + fh - 0.2, yb + fh + fb, t0 - 0.02, t0 + 0.035, o.faschen); }
  }
  const rb = o.rb ?? 0.07;
  F.box(u - h2 - rb, u + h2 + rb, yb - rb, yb + fh + rb, t0 - 0.02, t0 + 0.05, rahmen);
  F.box(u - h2 + 0.02, u + h2 - 0.02, yb + 0.02, yb + fh - 0.02, t0 - 0.03, t0 + 0.065, glas);
  if (o.reflex !== false && fh > 0.8) F.box(u - h2 + 0.02, u + h2 - 0.02, yb + fh * (o.kaempfer ?? 0.7), yb + fh - 0.02, t0, t0 + 0.07, heller(glas, 0.07));
  const tk = t0 + 0.085;
  if (o.kreuz !== false) {
    if (fw > 0.75 && o.kreuz !== 'quer') F.box(u - 0.04, u + 0.04, yb, yb + fh, t0, tk, rahmen);
    if (o.kreuz !== 'senkrecht') { const yk = yb + fh * (o.kaempfer ?? 0.7); F.box(u - h2, u + h2, yk - 0.04, yk + 0.04, t0, tk, rahmen); }
  }
  if (o.sprossen) {
    const [sx, sy] = o.sprossen;
    for (let i = 1; i < sx; i++) { const uu = u - h2 + (fw * i) / sx; F.box(uu - 0.025, uu + 0.025, yb, yb + fh, t0, tk, rahmen); }
    for (let j = 1; j < sy; j++) { const yy = yb + (fh * j) / sy; F.box(u - h2, u + h2, yy - 0.025, yy + 0.025, t0, tk, rahmen); }
  }
  if (o.sims) F.box(u - h2 - 0.2, u + h2 + 0.2, yb - 0.2, yb - 0.04, t0 - 0.02, t0 + 0.2, o.sims);
  if (o.laeden) {
    F.box(u - h2 - fw * 0.5 - 0.08, u - h2 - 0.1, yb, yb + fh, t0, t0 + 0.07, o.laeden);
    F.box(u + h2 + 0.1, u + h2 + fw * 0.5 + 0.08, yb, yb + fh, t0, t0 + 0.07, o.laeden);
  }
  if (o.gitter) {
    const yg = yb + Math.min(0.95, fh * 0.4);
    F.box(u - h2, u + h2, yg - 0.05, yg, t0 + 0.1, t0 + 0.15, GELAENDER);
    for (let uu = u - h2 + 0.15; uu < u + h2 - 0.05; uu += 0.22) F.box(uu - 0.018, uu + 0.018, yb, yg, t0 + 0.1, t0 + 0.14, GELAENDER);
  }
  const vf = o.verdFarbe ?? o.sims ?? ORN;
  const yt = yb + fh + (o.faschen ? (o.fb ?? 0.16) : rb) + 0.02;
  if (o.verd === 'gerade' || o.verd === 'dreieck' || o.verd === 'bogen') {
    F.box(u - h2 - 0.3, u + h2 + 0.3, yt, yt + 0.2, t0, t0 + 0.28, vf);
    F.box(u - h2 - 0.18, u + h2 + 0.18, yt - 0.02, yt + 0.04, t0, t0 + 0.12, dunkler(vf, 0.04));
    if (o.verd === 'dreieck') {
      const s = new THREE.Shape(); const b = h2 + 0.32;
      s.moveTo(-b, 0); s.lineTo(b, 0); s.lineTo(0, 0.62); s.closePath();
      F.profil(s, u, yt + 0.2, t0, t0 + 0.26, vf);
    } else if (o.verd === 'bogen') {
      const s = new THREE.Shape(); const b = h2 + 0.32;
      s.moveTo(-b, 0); s.lineTo(b, 0); s.quadraticCurveTo(0, 0.8, -b, 0);
      F.profil(s, u, yt + 0.2, t0, t0 + 0.26, vf);
    }
  } else if (o.verd === 'rund') {
    const s = new THREE.Shape(); const b = h2 + 0.14;
    s.moveTo(-b, 0); s.absarc(0, 0, b, Math.PI, 0, true); s.lineTo(b - 0.16, 0); s.absarc(0, 0, b - 0.16, 0, Math.PI, false); s.closePath();
    F.profil(s, u, yb + fh, t0 - 0.02, t0 + 0.1, vf, 10);
    const g = new THREE.Shape(); g.moveTo(-h2 + 0.02, 0); g.absarc(0, 0, h2 - 0.02, Math.PI, 0, true); g.closePath();
    F.profil(g, u, yb + fh, t0 - 0.03, t0 + 0.065, glas, 10);
  } else if (o.verd === 'sturz') {
    F.box(u - h2 - 0.12, u + h2 + 0.12, yt, yt + 0.28, t0, t0 + 0.12, vf);
    F.box(u - 0.14, u + 0.14, yt - 0.02, yt + 0.34, t0, t0 + 0.16, vf); // Schlussstein
  }
}

function balkon(F, u0, u1, y, tiefe, o = {}) {
  const pl = o.platte ?? ORN;
  F.box(u0, u1, y - 0.18, y, 0, tiefe, pl);
  if (o.konsolen) { F.box(u0 + 0.15, u0 + 0.35, y - 0.6, y - 0.18, 0, tiefe - 0.15, pl); F.box(u1 - 0.35, u1 - 0.15, y - 0.6, y - 0.18, 0, tiefe - 0.15, pl); }
  const hr = 1.0, tf = tiefe - 0.04;
  if (o.art === 'platte') {
    F.box(u0, u1, y + 0.05, y + hr, tf - 0.06, tf, o.farbe ?? GLAS_GELAENDER);
    F.box(u0 + 0.02, u0 + 0.06, y + 0.05, y + hr, 0, tf, o.farbe ?? GLAS_GELAENDER);
    F.box(u1 - 0.06, u1 - 0.02, y + 0.05, y + hr, 0, tf, o.farbe ?? GLAS_GELAENDER);
    F.box(u0, u1, y + hr - 0.04, y + hr + 0.02, tf - 0.08, tf + 0.02, o.handlauf ?? GELAENDER);
    return;
  }
  const gf = o.gitterFarbe ?? GELAENDER;
  F.box(u0, u1, y + hr - 0.05, y + hr, tf - 0.05, tf, gf);
  F.box(u0, u1, y + 0.12, y + 0.16, tf - 0.04, tf, gf);
  F.box(u0, u0 + 0.05, y + hr - 0.05, y + hr, 0, tf, gf); F.box(u1 - 0.05, u1, y + hr - 0.05, y + hr, 0, tf, gf);
  F.box(u0, u0 + 0.04, y, y + hr, tf - 0.04, tf, gf); F.box(u1 - 0.04, u1, y, y + hr, tf - 0.04, tf, gf);
  const sp = o.abstand ?? 0.2;
  for (let uu = u0 + sp; uu < u1 - sp * 0.5; uu += sp) F.box(uu - 0.016, uu + 0.016, y, y + hr, tf - 0.035, tf - 0.005, gf);
  if (o.ornament) for (let uu = u0 + 0.5; uu < u1 - 0.3; uu += 0.6) F.box(uu - 0.12, uu + 0.12, y + 0.42, y + 0.66, tf - 0.04, tf, gf);
}

function markise(F, a, b, y, tiefe, farbe, streifen, tb) {
  const al = 0.42, D = tiefe / Math.cos(al), len = b - a;
  const k = streifen ? Math.max(3, Math.round(len / 0.42)) : 1;
  for (let i = 0; i < k; i++) {
    const g = new THREE.BoxGeometry(len / k, 0.05, D);
    g.rotateX(al); g.translate(a + ((i + 0.5) * len) / k, y - (Math.sin(al) * D) / 2, tb + (Math.cos(al) * D) / 2);
    F.geo(g, streifen && i % 2 ? '#f4efe6' : farbe);
  }
  const yv = y - Math.sin(al) * D;
  F.box(a, b, yv - 0.26, yv + 0.02, tb + tiefe - 0.04, tb + tiefe, farbe);
  F.box(a - 0.02, a + 0.04, yv - 0.05, y, tb, tb + tiefe, '#8a8f94');
  F.box(b - 0.04, b + 0.02, yv - 0.05, y, tb, tb + tiefe, '#8a8f94');
}

function naechsterName(ctx) { if (!ctx.namen.length) ctx.namen = mischen(LADENNAMEN, ctx.r); return ctx.namen.pop(); }

/** Ein Laden zwischen a und b. */
function ladenFront(ctx, F, a, b, egH, o) {
  const r = ctx.r, tb = o.tb ?? 0.1, stil = o.stil ?? 'klassisch';
  const rahmen = o.rahmen ?? waehle(r, stil === 'neu' ? ['#3b4046', '#2b2f33', '#5c6168', '#d9dcdf'] : stil === 'fuenfziger' ? ['#c9cdd0', '#3f4a53', '#2f5d4a', '#b0473c', '#e9e4da'] : LADENRAHMEN);
  const hell = new THREE.Color(rahmen).getHSL({}).l > 0.6;
  const top = stil === 'fuenfziger' ? egH - 0.85 : egH - 0.45;
  const fasz = stil === 'neu' ? 0.7 : stil === 'fuenfziger' ? 0.0 : 0.62;
  const wb = b - a;
  F.box(a, b, 0, top, tb, tb + 0.06, rahmen);
  const tuerLinks = o.tuer === 'links' || (o.tuer == null && r() < 0.5);
  const tw = o.nurTuer ? Math.min(wb - 0.3, 1.4) : 1.15;
  let ga = a + 0.14, gb = b - 0.14;
  const yGlasO = top - fasz - 0.1;
  if (o.tuer !== 'keine') {
    const ta = o.nurTuer ? a + (wb - tw) / 2 : tuerLinks ? a + 0.14 : b - 0.14 - tw;
    F.box(ta, ta + tw, 0.04, Math.min(2.55, yGlasO), tb, tb + 0.1, '#3c4852');
    F.box(ta + 0.08, ta + tw - 0.08, 0.15, Math.min(2.45, yGlasO) - 0.08, tb, tb + 0.115, '#566a79');
    F.box(ta + tw - 0.25, ta + tw - 0.2, 1.0, 1.4, tb, tb + 0.15, '#c8ccd0');
    if (!o.nurTuer) { if (tuerLinks) ga = ta + tw + 0.14; else gb = ta - 0.14; }
    else { ga = gb; }
  }
  const yGlasU = stil === 'neu' ? 0.12 : stil === 'alt' ? 0.75 : 0.5;
  if (gb - ga > 0.5) {
    const k = Math.max(1, Math.round((gb - ga) / (stil === 'neu' ? 2.6 : 2.0)));
    const pw = (gb - ga - (k - 1) * 0.1) / k;
    for (let i = 0; i < k; i++) {
      const p0 = ga + i * (pw + 0.1);
      F.box(p0, p0 + pw, yGlasU, yGlasO, tb, tb + 0.1, GLAS_LADEN);
      if (stil === 'alt') {
        for (let s = 1; s < 3; s++) F.box(p0 + (pw * s) / 3 - 0.025, p0 + (pw * s) / 3 + 0.025, yGlasU, yGlasO, tb, tb + 0.12, rahmen);
        F.box(p0, p0 + pw, yGlasU + (yGlasO - yGlasU) * 0.5 - 0.025, yGlasU + (yGlasO - yGlasU) * 0.5 + 0.025, tb, tb + 0.12, rahmen);
      } else {
        // Auslage: helle Ware hinter dem Glas angedeutet
        const n = Math.max(1, Math.floor(pw / 0.7));
        for (let j = 0; j < n; j++) {
          if (r() < 0.35) continue;
          const uu = p0 + (pw * (j + 0.5)) / n, hh = zw(r, 0.3, 0.8);
          F.box(uu - 0.18, uu + 0.18, yGlasU + 0.02, yGlasU + hh, tb + 0.08, tb + 0.105, waehle(r, ['#e8dcc6', '#d9cbb3', '#f1ece2', '#c9b79c', '#e2c6b5']));
        }
      }
    }
  }
  // Schild
  if (o.schild !== false) {
    const name = o.name ?? naechsterName(ctx);
    const um = (a + b) / 2;
    if (stil === 'fuenfziger') {
      // Leuchtbuchstaben auf dem Vordach
      F.text(name, um, egH - 0.42, 0.42, waehle(r, ['#ffffff', '#f2d16b', '#e8604c', '#1f3a5f']), tb + 1.45, wb - 0.3);
    } else if (stil === 'alt') {
      F.text(name, um, top - fasz / 2 + 0.03, 0.36, '#3b2d24', tb + 0.075, wb - 0.3);
    } else {
      const tafel = r() < 0.45;
      if (tafel) {
        const tf = waehle(r, ['#f4efe6', '#f2d16b', '#ffffff', '#d9e4e8']);
        F.box(a + 0.25, b - 0.25, top - fasz + 0.04, top - 0.06, tb, tb + 0.13, tf);
        F.text(name, um, top - fasz / 2 - 0.01, 0.46, '#2a2f35', tb + 0.135, wb - 0.7);
      } else F.text(name, um, top - fasz / 2 - 0.01, 0.48, o.leucht ? waehle(r, ['#ffe680', '#ff8a6b', '#9fe6ff', '#ffffff']) : hell ? '#2a2f35' : '#ffffff', tb + 0.075, wb - 0.5);
    }
  }
  if (o.markise) markise(F, a + 0.08, b - 0.08, top - fasz - 0.02, 1.35, o.markise, r() < 0.55, tb + 0.06);
  if (o.leucht && stil !== 'alt') {
    // Nasenschild (Leuchtkasten quer zur Fassade)
    const u = tuerLinks ? b - 0.25 : a + 0.25, lf = waehle(r, ['#e8604c', '#2f6f8f', '#f2d16b', '#3f7d56', '#ffffff', '#6b4f8f']);
    F.box(u - 0.07, u + 0.07, egH - 0.1, egH + 1.0, tb, tb + 0.95, lf);
    F.box(u - 0.09, u + 0.09, egH + 0.05, egH + 0.85, tb + 0.12, tb + 0.83, heller(lf, 0.12));
  }
  if (o.ausleger) {
    const u = tuerLinks ? a + 0.3 : b - 0.3, y = egH + 0.35;
    F.box(u - 0.04, u + 0.04, y - 0.04, y + 0.04, tb, tb + 1.0, '#2b2b2b');
    const g = new THREE.CylinderGeometry(0.38, 0.38, 0.06, 14); g.rotateZ(Math.PI / 2);
    g.translate(u, y - 0.45, tb + 0.75); F.geo(g, waehle(r, ['#d39a2b', '#b0473c', '#2f6f8f', '#3f7d56']));
  }
}

function hausTuer(F, a, egH, o) {
  const tb = o.tb ?? 0.1, holz = o.holz ?? '#6b4f3a';
  F.box(a, a + 1.7, 0, Math.min(egH - 0.3, 3.5), tb - 0.02, tb + 0.05, o.portal ?? ORN);
  F.box(a + 0.22, a + 1.48, 0.05, 2.7, tb, tb + 0.08, holz);
  F.box(a + 0.32, a + 0.82, 0.9, 2.5, tb, tb + 0.1, dunkler(holz, 0.05));
  F.box(a + 0.88, a + 1.38, 0.9, 2.5, tb, tb + 0.1, dunkler(holz, 0.05));
  if (egH > 3.6) F.box(a + 0.22, a + 1.48, 2.8, Math.min(egH - 0.45, 3.35), tb, tb + 0.08, FARBEN.fensterHell);
  F.box(a - 0.05, a + 1.75, 0, 0.16, 0, tb + 0.4, '#cfc9be');
}

/** Ladenzone einer Fassade: Hauseingang plus Läden, je nach Stil. */
function ladenzone(ctx, F, egH, o = {}) {
  const r = ctx.r, tb = o.tb ?? 0.1;
  const mark = () => (r() < (o.markisen ?? 0.45) ? waehle(r, MARKISEN) : null);
  if (o.typ === 'arkade' && F.art === 'haupt' && F.L > 7) return arkade(ctx, F, egH, o);
  if (F.art === 'ecke') {
    const mitte = F.eckIndex === Math.floor(F.eckAnzahl / 2);
    ladenFront(ctx, F, 0.08, F.L - 0.08, egH, { ...o, nurTuer: mitte, tuer: mitte ? null : 'keine', schild: mitte && F.L > 1.8, name: ctx.eckName, markise: null, ausleger: false, leucht: false });
    return;
  }
  const u0 = o.u0 ?? 0.35, u1 = o.u1 ?? F.L - 0.35;
  const stuecke = [];
  if (o.hausTuer !== false && F.art === 'haupt' && u1 - u0 > 5.5) {
    const lage = F.L < 12 ? (r() < 0.5 ? 0 : 1) : waehle(r, [0, 1, 0.35, 0.65]);
    const a = clamp(u0 + (u1 - u0 - 1.7) * lage, u0, u1 - 1.7);
    hausTuer(F, a, egH, o);
    if (a - u0 > 1.5) stuecke.push([u0, a - 0.15]);
    if (u1 - a - 1.7 > 1.5) stuecke.push([a + 1.85, u1]);
  } else stuecke.push([u0, u1]);
  for (const [a, b] of stuecke) {
    const k = o.typ === 'band' ? 1 : Math.max(1, Math.round((b - a) / zw(r, 4.5, 7)));
    const sw = (b - a) / k;
    for (let i = 0; i < k; i++) {
      ladenFront(ctx, F, a + i * sw + (i ? 0.1 : 0), a + (i + 1) * sw - (i < k - 1 ? 0.1 : 0), egH, { ...o, markise: o.stil === 'neu' ? null : mark(), ausleger: o.stil === 'alt' && r() < 0.6, leucht: r() < (o.leucht ?? 0) });
    }
  }
}

/** Arkaden / Laubengang: Bögen vor den Läden. */
function arkade(ctx, F, egH, o) {
  const r = ctx.r, tb = o.tb ?? 0.1, wand = o.arkWand ?? ORN;
  const k = Math.max(2, Math.round((F.L - 0.6) / zw(r, 3.2, 4.2))), bw = (F.L - 0.6) / k;
  const tuer = Math.floor(r() * k);
  const ra = bw / 2 - 0.3, ys = egH - 0.35 - ra;
  for (let i = 0; i < k; i++) {
    const a = 0.3 + i * bw, b = a + bw, m = (a + b) / 2;
    if (i === tuer) hausTuer(F, m - 0.85, ys + ra * 0.6, { ...o, tb });
    else ladenFront(ctx, F, a + 0.35, b - 0.35, ys + ra * 0.7, { ...o, tb, schild: false, markise: null, leucht: false });
    F.box(a - 0.02, a + 0.3, 0, ys, tb, tb + 0.65, wand);
    F.box(b - 0.3, b + 0.02, 0, ys, tb, tb + 0.65, wand);
    const sh = new THREE.Shape();
    sh.moveTo(-bw / 2, 0); sh.lineTo(-ra, 0); sh.absarc(0, 0, ra, Math.PI, 0, true); sh.lineTo(bw / 2, 0); sh.lineTo(bw / 2, egH - ys); sh.lineTo(-bw / 2, egH - ys); sh.closePath();
    F.profil(sh, m, ys, tb, tb + 0.65, wand, 10);
    F.box(m - 0.18, m + 0.18, ys + ra - 0.1, ys + ra + 0.25, tb + 0.6, tb + 0.72, dunkler(wand, 0.05));
    if (i !== tuer) {
      const name = naechsterName(ctx);
      F.box(m - 1.0, m + 1.0, ys + ra - 0.95, ys + ra - 0.45, tb + 0.5, tb + 0.55, waehle(r, ['#2f3a40', '#6b2e35', '#2f5d4a', '#f4efe6']));
      F.text(name, m, ys + ra - 0.7, 0.32, '#ffffff', tb + 0.56, 1.85);
    }
  }
  F.box(0, F.L, 0, 0.16, tb, tb + 0.7, dunkler(wand, 0.08));
}

// ---------- Dachdetails ----------
function schornstein(S, x, z, y0, y1, farbe, r) {
  const w = zw(r, 0.55, 0.8), d = zw(r, 0.7, 1.2);
  S.box(w, y1 - y0, d, x, (y0 + y1) / 2, z, farbe);
  S.box(w + 0.16, 0.14, d + 0.16, x, y1, z, '#d8d4cb');
  if (r() < 0.6) S.box(0.16, 0.35, 0.16, x - w * 0.2, y1 + 0.24, z - d * 0.2, '#7a7d80');
  if (r() < 0.4) S.box(0.16, 0.3, 0.16, x + w * 0.2, y1 + 0.2, z + d * 0.2, '#7a7d80');
}
function antenne(S, x, z, y, r) {
  const h = zw(r, 2, 3.2), f = '#5f646b';
  S.box(0.07, h, 0.07, x, y + h / 2, z, f);
  const ry = zw(r, 0, Math.PI);
  for (let i = 0; i < 2; i++) S.box(1.3 - i * 0.4, 0.05, 0.05, x, y + h * (0.7 + i * 0.25), z, f, ry);
  S.box(0.05, 0.05, 0.7, x, y + h * 0.7, z, f, ry);
}
function schuessel(S, x, z, y, r) {
  const g = new THREE.CylinderGeometry(0.42, 0.42, 0.07, 12);
  g.rotateX(Math.PI / 2 - 0.5); g.rotateY(zw(r, -0.4, 1.9)); g.translate(x, y + 0.7, z);
  S.add(g, '#e9ecee'); S.box(0.06, 0.7, 0.06, x, y + 0.35, z, '#8b9096');
}
function dachkram(ctx, poly, yBase, yTop, o = {}) {
  const { S, r } = ctx;
  const n = o.schornsteine ?? 2;
  const farbe = o.kaminFarbe ?? waehle(r, ['#a8664f', '#b9785e', '#cfc6b8', '#9e5c47']);
  for (let i = 0; i < n; i++) { const [x, z] = punktIn(poly, r); schornstein(S, x, z, yBase, yTop + zw(r, 0.9, 1.5), farbe, r); }
  if (r() < (o.antenne ?? 0.5)) { const [x, z] = punktIn(poly, r); antenne(S, x, z, yTop - 0.3, r); }
  if (r() < (o.sat ?? 0.3)) { const [x, z] = punktIn(poly, r); schuessel(S, x, z, yTop - 0.4, r); }
}
/** Flachdach: Kiesfläche, Attika ist Sache der Fassade, dazu Technik. */
function flachdachTechnik(ctx, poly, y, o = {}) {
  const { S, r } = ctx;
  S.add(prismoid(versetzt(poly, poly.map(() => 0.3)), y, 0.08), o.belag ?? KIES);
  const inner = versetzt(poly, poly.map(() => 1.6));
  if (o.aufzug !== false) {
    const [x, z] = punktIn(inner, r); const w = zw(r, 2.2, 3.2), d = zw(r, 2.2, 3.4), h = zw(r, 2.2, 3.0);
    S.box(w, h, d, x, y + h / 2, z, o.aufbauFarbe ?? '#d5d2cb');
    S.box(w + 0.15, 0.15, d + 0.15, x, y + h, z, '#b6b9bc');
    if (r() < 0.5) { S.box(0.7, 0.9, 0.08, x + w * 0.2, y + 1.2, z + d / 2 + 0.03, '#55636f'); }
  }
  let flaeche = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; flaeche += a[0] * b[1] - b[0] * a[1]; }
  flaeche = Math.abs(flaeche) / 2;
  const k = (o.geraete ?? Math.floor(zw(r, 1, 3))) + Math.floor(flaeche / 120);
  // Lüftungsrohre und Dachrinne zur Belebung großer Flächen
  for (let i = 0; i < 2 + Math.floor(flaeche / 100); i++) { const [x, z] = punktIn(inner, r); S.box(0.25, 0.7, 0.25, x, y + 0.35, z, '#9aa0a6'); S.box(0.4, 0.1, 0.4, x, y + 0.72, z, '#7f868c'); }
  if (flaeche > 150 && r() < 0.7) { const [x, z] = punktIn(inner, r); S.box(zw(r, 3, 5), 0.5, 0.6, x, y + 0.35, z, '#d9dcdf'); S.box(0.6, 0.5, zw(r, 3, 5), x + 1.5, y + 0.35, z + 1, '#d9dcdf'); }
  for (let i = 0; i < k; i++) {
    const [x, z] = punktIn(inner, r); const w = zw(r, 0.9, 1.8), d = zw(r, 0.8, 1.4), h = zw(r, 0.6, 1.1);
    S.box(w, h, d, x, y + h / 2, z, TECHNIK);
    S.box(w * 0.7, 0.06, d * 0.7, x, y + h + 0.03, z, '#7f868c');
  }
  if (o.pv) {
    const [x, z] = punktIn(inner, r);
    for (let i = 0; i < o.pv; i++) {
      const g = new THREE.BoxGeometry(3.2, 0.06, 1.0); g.rotateX(-0.45); g.translate(x, y + 0.45, z - 1.5 + i * 1.5);
      S.add(g, '#34506b'); S.box(0.06, 0.4, 0.06, x - 1.4, y + 0.2, z - 1.5 + i * 1.5 - 0.3, '#9aa0a6');
    }
  }
  if (o.gruen) { const [x, z] = punktIn(inner, r); S.box(zw(r, 2, 4), 0.15, zw(r, 2, 4), x, y + 0.12, z, '#9cc58c'); }
  if (r() < (o.antenne ?? 0.4)) { const [x, z] = punktIn(inner, r); antenne(S, x, z, y, r); }
}
/** Attika (Brüstung) an allen Kanten eines Polygons. */
function attika(ctx, poly, y, h, farbe, kappe = '#d9dcdf', dick = 0.3) {
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const F = new Fassade(ctx, poly[i], poly[(i + 1) % n], { extL: true, extR: true });
    F.box(0, F.L, y, y + h, -dick, 0.02, farbe);
    F.box(-0.02, F.L + 0.02, y + h, y + h + 0.08, -dick - 0.04, 0.08, kappe);
  }
}

/** Mansarddach über ctx.P mit Gauben und Kaminen. Rückgabe Firsthöhe. */
function mansarde(ctx, y, o) {
  const { S, P, K, r } = ctx;
  const ins1 = K.map((k) => (dachKante(ctx, k) ? o.a : 0));
  S.add(prismoid(P, y, o.hu, ins1), o.farbeU);
  const P2 = versetzt(P, ins1);
  const ins2 = K.map((k) => (dachKante(ctx, k) ? o.b : 0));
  S.add(prismoid(P2, y + o.hu, o.ho, ins2), o.farbeO);
  const P3 = versetzt(P2, ins2);
  // Dachkante (Blechkante) zwischen den Teilen
  for (const F of fassadenFuer(ctx, P2, K)) if (F.art) F.box(-0.05, F.L + 0.05, y + o.hu - 0.06, y + o.hu + 0.06, -0.05, 0.12, o.kante ?? '#c9cdd0');
  if (o.gauben !== false) for (const F of ctx.fassaden) {
    if (F.art === 'neben') continue;
    const ax = F.art === 'ecke' ? (F.eckIndex === Math.floor(F.eckAnzahl / 2) ? [F.L / 2] : []) : o.achsen?.get(F) ?? achsen(F.L, 3.2, 1.5);
    ax.forEach((u, i) => {
      if (o.jedeZweite && F.art !== 'ecke' && i % 2) return;
      if (gesperrt(ctx, F, u)) return;
      if (ctx.sperreGauben && !ctx.sperreGauben(F)(u)) return;
      const randL = F.extL && ctx.eck ? o.a + 1.2 : 0.9, randR = F.extR && ctx.eck ? o.a + 1.2 : 0.9;
      if (F.art !== 'ecke' && (u < randL || u > F.L - randR)) return;
      gaube(F, u, y, o.hu, o.a, o.gaube);
    });
  }
  dachkram(ctx, P3, y, y + o.hu + o.ho, o.kram);
  return y + o.hu + o.ho;
}
function gaube(F, u, y, hu, a, o = {}) {
  if (o.form === 'keine') return;
  const ochs = o.form === 'ochsenauge', schlepp = o.form === 'schlepp';
  const hb = 0.45, hd = Math.min(ochs ? 1.2 : schlepp ? 1.5 : o.hoehe ?? 1.9, hu * 0.8), bw = ochs ? 1.0 : schlepp ? (o.breite ?? 2.6) : o.breite ?? 1.35;
  if (ochs) {
    const tf = (-a * hb) / hu + 0.04, tbk = (-a * (hb + hd)) / hu - 0.6;
    F.box(u - bw / 2, u + bw / 2, y + hb, y + hb + hd * 0.6, tbk, tf, o.wand ?? ORN);
    const g = new THREE.CylinderGeometry(bw / 2, bw / 2, tf - tbk, 12); g.rotateX(Math.PI / 2); g.translate(u, y + hb + hd * 0.6, (tf + tbk) / 2); F.geo(g, o.wand ?? ORN);
    const gl = new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12); gl.rotateX(Math.PI / 2); gl.translate(u, y + hb + hd * 0.55, tf + 0.02); F.geo(gl, o.glas ?? FARBEN.fenster);
    return;
  }
  const tf = (-a * hb) / hu + 0.04, tbk = (-a * (hb + hd)) / hu - 0.6;
  const wand = o.wand ?? ORN, dach = o.dach ?? '#7c848c';
  F.box(u - bw / 2, u + bw / 2, y + hb, y + hb + hd, tbk, tf, wand);
  F.box(u - bw / 2 + 0.22, u + bw / 2 - 0.22, y + hb + 0.25, y + hb + hd - 0.2, tf - 0.05, tf + 0.03, o.glas ?? FARBEN.fenster);
  F.box(u - 0.03, u + 0.03, y + hb + 0.25, y + hb + hd - 0.2, tf, tf + 0.05, RAHMEN);
  const s = new THREE.Shape(), b = bw / 2 + 0.12;
  if (schlepp) {
    const g = new THREE.BoxGeometry(bw + 0.3, 0.14, (tf - tbk) + 0.4); g.rotateX(0.22); g.translate(u, y + hb + hd + 0.1, (tf + tbk) / 2); F.geo(g, dach);
    F.box(u + 0.02, u + bw / 2 - 0.22, y + hb + 0.25, y + hb + hd - 0.2, tf - 0.05, tf + 0.03, o.glas ?? FARBEN.fenster);
    return;
  }
  if (o.form === 'bogen') { s.moveTo(-b, 0); s.lineTo(b, 0); s.quadraticCurveTo(0, 1.1, -b, 0); }
  else if (o.form === 'flach') { s.moveTo(-b, 0); s.lineTo(b, 0); s.lineTo(b, 0.18); s.lineTo(-b, 0.18); s.closePath(); }
  else { s.moveTo(-b, 0); s.lineTo(b, 0); s.lineTo(0, 0.75); s.closePath(); }
  F.profil(s, u, y + hb + hd, tbk, tf + 0.1, dach);
}

/** Satteldach mit Giebelwänden (Wandfarbe) und Dachplatten. achse = Firstrichtung ('x' oder 'z'). */
function satteldach(ctx, x0, z0, x1, z1, y, h, achse, o = {}) {
  const S = ctx.S, ov = o.ueberstand ?? 0.45, ovG = o.ortgang ?? 0.3, th = 0.22, dach = o.dach, wand = o.wand;
  const poly = rechteck(x0, z0, x1, z1);
  if (achse === 'z') {
    const a = (x1 - x0) / 2;
    if (wand) S.add(prismoid(poly, y, h, [0, a - 0.001, 0, a - 0.001]), wand);
    const al = Math.atan2(h, a), s = (a + ov) / Math.cos(al), zc = (z0 + z1) / 2, lz = z1 - z0 + 2 * ovG;
    for (const sg of [1, -1]) {
      const ex = sg > 0 ? x0 - ov : x1 + ov, ey = y - ov * Math.tan(al);
      const mx = (ex + x0 + a) / 2, my = (ey + y + h) / 2;
      const g = new THREE.BoxGeometry(s, th, lz); g.rotateZ(sg * al);
      g.translate(mx - sg * Math.sin(al) * th / 2, my + Math.cos(al) * th / 2, zc); S.add(g, dach);
    }
    S.box(0.3, 0.2, lz, x0 + a, y + h + 0.12, zc, o.first ?? dunkler(dach, 0.05));
  } else {
    const a = (z1 - z0) / 2;
    if (wand) S.add(prismoid(poly, y, h, [a - 0.001, 0, a - 0.001, 0]), wand);
    const al = Math.atan2(h, a), s = (a + ov) / Math.cos(al), xc = (x0 + x1) / 2, lx = x1 - x0 + 2 * ovG;
    for (const sg of [1, -1]) {
      const ez = sg > 0 ? z1 + ov : z0 - ov, ey = y - ov * Math.tan(al);
      const mz = (ez + z0 + a) / 2, my = (ey + y + h) / 2;
      const g = new THREE.BoxGeometry(lx, th, s); g.rotateX(sg * al);
      g.translate(xc, my + Math.cos(al) * th / 2, mz + sg * Math.sin(al) * th / 2); S.add(g, dach);
    }
    S.box(lx, 0.2, 0.3, xc, y + h + 0.12, z0 + a, o.first ?? dunkler(dach, 0.05));
  }
  return y + h;
}

/** Facettierter Rundkörper (Erker, Turm) mit Fenstern auf den sichtbaren Facetten. */
function rundkoerper(ctx, cx, cz, R, seg, y0, y1, farbe) {
  const poly = nGon(cx, cz, R, seg);
  ctx.S.add(prismoid(poly, y0, y1 - y0), farbe);
  const fac = [];
  for (let j = 0; j < seg; j++) {
    const F = new Fassade(ctx, poly[j], poly[(j + 1) % seg], { art: 'turm', extL: true, extR: true });
    if (F.nx + F.nz > -0.15) fac.push(F);
  }
  return { poly, fac };
}
function helm(ctx, poly, y, h, farbe, spitze = true) {
  const ap = poly.map(() => 0);
  let cx = 0, cz = 0; poly.forEach((p) => { cx += p[0]; cz += p[1]; }); cx /= poly.length; cz /= poly.length;
  const big = poly.map((p) => [cx + (p[0] - cx) * 1.08, cz + (p[1] - cz) * 1.08]);
  const R = wurzelSumme(big[0][0] - cx, big[0][1] - cz) * Math.cos(Math.PI / poly.length);
  ctx.S.add(prismoid(big, y, h, ap.map(() => R - 0.002)), farbe);
  if (spitze) { ctx.S.box(0.1, 1.2, 0.1, cx, y + h + 0.5, cz, '#5f646b'); ctx.S.box(0.22, 0.22, 0.22, cx, y + h + 0.25, cz, '#c9a64a'); }
}
function kuppel(ctx, poly, y, h, farbe) {
  let cx = 0, cz = 0; poly.forEach((p) => { cx += p[0]; cz += p[1]; }); cx /= poly.length; cz /= poly.length;
  const ap = wurzelSumme(poly[0][0] - cx, poly[0][1] - cz) * Math.cos(Math.PI / poly.length);
  const p1 = versetzt(poly, poly.map(() => ap * 0.12));
  ctx.S.add(prismoid(poly, y, h * 0.42, poly.map(() => ap * 0.12)), farbe);
  ctx.S.add(prismoid(p1, y + h * 0.42, h * 0.33, poly.map(() => ap * 0.33)), farbe);
  const p2 = versetzt(p1, poly.map(() => ap * 0.33));
  ctx.S.add(prismoid(p2, y + h * 0.75, h * 0.25, poly.map(() => ap * 0.55 - 0.002)), farbe);
  ctx.S.box(0.5, 0.7, 0.5, cx, y + h + 0.3, cz, ORN);
  ctx.S.box(0.7, 0.12, 0.7, cx, y + h + 0.7, cz, farbe);
  ctx.S.box(0.08, 1.2, 0.08, cx, y + h + 1.3, cz, '#5f646b');
}

// ======================================================================
// Variation: Paletten, Gewichte, Farbwahl
// ======================================================================
const PUTZ = {
  weiss: ['#f3eee4', '#f1eadc', '#ece5d7', '#f4f1ea'],
  sand: ['#e3d3bd', '#dccbb2', '#e6d5bf', '#d9c8ae'],
  sandstein: ['#d8c3a0', '#cdb68f', '#d2bc98', '#c4ad88'],
  ocker: ['#e2c58a', '#d9b56e', '#e8cf95', '#dcbc7c'],
  zartgelb: ['#efe2a8', '#f0e6b8', '#e9d79e', '#f2e9c4'],
  rosa: ['#e9c4b8', '#efd0c6', '#e5b9ad', '#f0d6cc'],
  altrosa: ['#d4a9a0', '#c99a92', '#d8b2a6', '#c7a097'],
  lachs: ['#e8b49a', '#e3a98d', '#ecc0a8'],
  hellgruen: ['#c9d6b5', '#bfd0b0', '#d2dcc0', '#c3d3bc'],
  hellblau: ['#b9cbd8', '#c5d5df', '#aec3d1', '#c9d8e0'],
  grau: ['#cfd3d6', '#c4c8cb', '#d9dbdc', '#bfc3c4'],
  taupe: ['#c9bfb2', '#bfb3a3', '#d1c7ba'],
};
const BACKSTEIN = {
  rot: ['#b9654e', '#c4705a', '#a95a45'], dunkelrot: ['#8f4a3a', '#9a5243', '#843f33'],
  braun: ['#7d5544', '#8a604c', '#6f4b3d'], gelb: ['#d4b483', '#cfae7c', '#dcc092'], bunt: ['#b9785e', '#a8664f', '#c4876a', '#9e5c47'],
};
const DACH = {
  schiefer: ['#5f666e', '#6f7880', '#565d65'], zink: ['#8b939b', '#9aa1a8', '#7c848c'],
  ziegel: ['#b4583f', '#a24e38', '#c06548', '#b8634a'], braun: ['#7a4e3a', '#6b4a3a', '#85584a'],
  kupfer: ['#6f9a7d', '#7aa68a', '#5f8f74'], bitumen: ['#4b4f54', '#55595e', '#5d6166'], engobe: ['#4a4642', '#3f3c3a'],
};
const REGION_TON = {
  Nord: { weiss: 2.5, grau: 1.6, sand: 1.2, ocker: 0.5, lachs: 0.5 },
  Ost: { ocker: 1.8, sand: 1.6, grau: 1.5, zartgelb: 1.3, altrosa: 1.2, sandstein: 1.3 },
  // West (GESTALTUNG.md): gedämpft, Grau, Beige, Taupe; kaum Pastell
  West: { weiss: 1.4, grau: 2.2, sand: 1.8, taupe: 2, sandstein: 1.2, ocker: 0.25, zartgelb: 0.2, rosa: 0.2, altrosa: 0.3, lachs: 0.1, hellgruen: 0.15, hellblau: 0.3 },
  Mitte: { sand: 1.3, rosa: 1.1, ocker: 1.1 },
  Süd: { ocker: 1.8, zartgelb: 1.8, rosa: 1.6, hellgruen: 1.6, altrosa: 1.3, lachs: 1.4, grau: 0.6 },
};
const REGION_DACH = {
  Nord: { ziegel: 1.6, schiefer: 1.2, engobe: 1.4 }, Ost: { schiefer: 1.4, ziegel: 1.2, bitumen: 1.3 },
  West: { schiefer: 2.2, zink: 1.4, bitumen: 1.6, engobe: 1.2, ziegel: 0.3, braun: 0.5, kupfer: 0.4 }, Mitte: { schiefer: 1.3, ziegel: 1.2 }, Süd: { ziegel: 1.8, braun: 1.5, schiefer: 0.6 },
};
/** Dachform aus der Liste des Stils; ctx.dachWunsch (gleiche Dachform je Blockseite, bauer.js) gewinnt, wenn der Stil sie kennt. */
function dachWahl(ctx, r, liste) {
  // ctx.dachRegime 'flach' | 'steil' (Stilprofil, ein Dachregime je Block): Liste darauf einschränken, falls möglich
  if (ctx.dachRegime) { const f = liste.filter(([k]) => (ctx.dachRegime === 'flach') === (k === 'flach')); if (f.length) liste = f; }
  const dt0 = wz(r, liste);
  const dt = ctx.dachWunsch && liste.some(([k]) => k === ctx.dachWunsch) ? ctx.dachWunsch : dt0;
  ctx.dachGewaehlt = dt;
  return dt;
}
function wz(r, liste) {
  let s = 0; for (const [, g] of liste) s += g;
  let t = r() * s;
  for (const [v, g] of liste) { t -= g; if (t <= 0) return v; }
  return liste[liste.length - 1][0];
}
function farbAbstand(a, b) { const A = new THREE.Color(a), B = new THREE.Color(b); return wurzelSumme(A.r - B.r, A.g - B.g, A.b - B.b); }
function ausPalette(ctx, pal, gruppen, ton = {}) {
  const liste = Object.entries(gruppen).filter(([g]) => pal[g]).map(([g, w]) => [g, w * (ton[g] ?? 1)]);
  let f;
  for (let i = 0; i < 10; i++) { f = waehle(ctx.r, pal[wz(ctx.r, liste)]); if (!ctx.vermeide || farbAbstand(f, ctx.vermeide) > 0.12) break; }
  return f;
}
const putz = (ctx, g) => ausPalette(ctx, PUTZ, g, REGION_TON[ctx.region]);
const ziegelstein = (ctx, g) => ausPalette(ctx, BACKSTEIN, g);
const dachfarbe = (ctx, g) => { const v = ctx.vermeide; ctx.vermeide = null; const f = ausPalette(ctx, DACH, g, REGION_DACH[ctx.region]); ctx.vermeide = v; return f; };

// ======================================================================
// Putzbauten – gemeinsames Gerüst (Gründerzeit, Jugendstil, 50er, Barock, Wiederaufbau)
// ======================================================================
function achsenFuer(F, c, ecke) {
  if (ecke) return [F.L / 2];
  if (c.rhythmus === 'gekoppelt' && F.L >= 8.5) {
    const g = achsen(F.L, c.raster * 1.8, c.rand + 0.2), out = [];
    g.forEach((m) => out.push(m - c.fw / 2 - 0.22, m + c.fw / 2 + 0.22));
    out.abstand = c.raster; out.paare = g;
    return out;
  }
  const a = achsen(F.L, c.raster, c.rand);
  return a;
}
function balustrade(F, u0, u1, y, farbe) {
  F.box(u0, u1, y, y + 0.18, -0.25, 0.1, farbe);
  F.box(u0 - 0.03, u1 + 0.03, y + 0.82, y + 0.95, -0.28, 0.13, farbe);
  for (let u = u0 + 0.25; u < u1 - 0.1; u += 0.34) F.box(u - 0.07, u + 0.07, y + 0.18, y + 0.82, -0.18, 0.04, farbe);
  for (let u = u0; u <= u1 + 0.01; u += Math.max(2.5, (u1 - u0) / Math.max(1, Math.round((u1 - u0) / 3.2)))) F.box(u - 0.2, u + 0.2, y, y + 0.95, -0.25, 0.12, farbe);
}
function loggia(F, u0, u1, yF, gh, c) {
  F.box(u0, u1, yF + 0.05, yF + gh - 0.3, -0.02, 0.04, '#4d555c');
  F.box(u0 + 0.35, u1 - 0.35, yF + 0.15, yF + gh - 0.5, 0.0, 0.05, FARBEN.fensterHell);
  F.box(u0, u1, yF + 0.05, yF + 1.05, 0, 0.16, c.loggiaFarbe ?? c.wand);
  F.box(u0 - 0.05, u1 + 0.05, yF + 1.0, yF + 1.1, 0, 0.2, c.orn);
}

function putzbau(ctx, c) {
  const { S, r, n } = ctx;
  const H = c.eg + n * c.gh;
  ctx.H = H;
  S.add(prismoid(ctx.P, 0, H), c.wand);
  ctx.achsenJe = new Map();
  ctx.risalit = new Map();
  for (const F of ctx.fassaden) {
    const [s0, s1] = F.spanne(0.1);
    const haupt = F.art === 'haupt', ecke = F.art === 'ecke';
    F.box(s0, s1, 0, c.eg - 0.05, 0, 0.08, c.sockel);
    if (c.rustika) for (let y = 0.9; y < c.eg - 0.4; y += 0.58) F.box(s0, s1, y, y + 0.06, 0.08, 0.1, dunkler(c.sockel, 0.07));
    F.box(s0, s1, 0, 0.45, 0, 0.12, dunkler(c.sockel, 0.1));
    const ax = achsenFuer(F, c, ecke);
    ctx.achsenJe.set(F, ax);
    if (F.art === 'neben') { for (const u of ax) fenster(F, u, 1.5, c.fw, Math.min(c.eg - 2.6, 1.9), { ...c.fo(1, 0, F), verd: null, t: 0.08 }); }
    else ladenzone(ctx, F, c.eg, { tb: 0.1, stil: c.laden, typ: c.ladenTyp, markisen: c.markisen, leucht: c.leucht, arkWand: c.orn, portal: c.portal });
    if (c.vordach && F.art !== 'neben' && c.ladenTyp !== 'arkade') {
      F.box(s0 + (F.extL ? 0 : 0.2), s1 - (F.extR ? 0 : 0.2), c.eg - 0.78, c.eg - 0.62, 0, 1.6, '#f4f2ee');
      F.box(s0 + (F.extL ? 0 : 0.2), s1 - (F.extR ? 0 : 0.2), c.eg - 0.8, c.eg - 0.6, 1.5, 1.62, c.vordach);
    }
    if (c.gurt) F.box(s0, s1, c.eg - 0.12, c.eg + 0.2, 0, 0.26, c.orn);
    // Mittelrisalit
    let ris = null;
    if (haupt && c.rhythmus === 'risalit' && ax.length >= 5) {
      const m = (ax.length - 1) / 2, k = ax.length >= 7 ? 1.5 : ax.length % 2 ? 0.5 : 1;
      const i0 = Math.ceil(m - k), i1 = Math.floor(m + k);
      const u0 = ax[i0] - ax.abstand / 2 + 0.15, u1 = ax[i1] + ax.abstand / 2 - 0.15;
      ris = { i0, i1, u0, u1, t: 0.32 };
      F.box(u0, u1, c.eg + 0.2, H - 0.05, 0, ris.t, heller(c.wand, 0.02));
      F.box(u0 - 0.05, u0 + 0.5, c.eg + 0.2, H - 0.3, ris.t, ris.t + 0.1, c.orn);
      F.box(u1 - 0.5, u1 + 0.05, c.eg + 0.2, H - 0.3, ris.t, ris.t + 0.1, c.orn);
      ctx.risalit.set(F, { uc: (u0 + u1) / 2, B: u1 - u0 });
    }
    // Erker
    let erk = null;
    if (haupt && c.erker && !ris && !ax.paare && F.L >= 10.5 && n >= 3 && ax.length >= 3) {
      const sp = ax.abstand, mid = (ax.length - 1) / 2;
      const im = c.erkerLage === 'seite' ? Math.max(1, Math.floor(ax.length * 0.25)) : Math.floor(mid);
      const uc = c.erkerLage !== 'seite' && ax.length % 2 === 0 ? (ax[im] + ax[im + 1]) / 2 : ax[im];
      const bw = c.erkerLage !== 'seite' && ax.length % 2 === 0 ? sp + c.fw + 1.0 : Math.min(3.8, sp + 0.6);
      erk = { uc, bw, k0: c.erkerAb ?? 1, k1: c.erkerBisOben ? n : n - 1, td: c.erkerTyp === 'polygon' ? 1.1 : 0.95 };
    }
    // Balkonachsen
    const balk = new Set();
    if (haupt && c.balkone && ax.length >= 2) {
      if (erk) ax.forEach((u, i) => { if (Math.abs(u - erk.uc) > erk.bw / 2 && Math.abs(u - erk.uc) < erk.bw / 2 + ax.abstand * 0.9) balk.add(i); });
      else if (ris) { balk.add(Math.floor((ris.i0 + ris.i1) / 2)); }
      else if (c.balkonMuster === 'alle') ax.forEach((u, i) => { if (i % 2 === (ax.length % 2 ? 0 : 1) || ax.length <= 2) balk.add(i); });
      else if (c.balkonMuster === 'rand') { balk.add(0); balk.add(ax.length - 1); }
      else if (ax.length % 2) balk.add((ax.length - 1) / 2); else { balk.add(0); balk.add(ax.length - 1); }
    }
    // Pilaster / Lisenen
    if (c.pilaster && !ecke) {
      const pf = c.pilasterFarbe ?? c.orn;
      const ya = c.eg + 0.2, yb = H - (c.gesims === 'konsolen' ? 0.75 : 0.3);
      F.box(0.05, 0.6, ya, yb, 0, 0.12, pf);
      F.box(F.L - 0.6, F.L - 0.05, ya, yb, 0, 0.12, pf);
      if (c.pilaster === 'achsen') {
        const mitten = ax.paare ? ax.paare.slice(1).map((m, i) => (m + ax.paare[i]) / 2) : ax.slice(1).map((u, i) => (u + ax[i]) / 2);
        for (const u of mitten) { if (erk && Math.abs(u - erk.uc) < erk.bw / 2 + 0.3) continue; if (ris && u > ris.u0 - 0.3 && u < ris.u1 + 0.3) continue; F.box(u - 0.22, u + 0.22, ya, yb, 0, 0.1, pf); }
      }
    }
    // Geschosse
    for (let k = 1; k <= n; k++) {
      const yF = c.eg + (k - 1) * c.gh;
      const fh = c.fhk ? c.fhk(k) : c.fh;
      if (c.baender && (c.baender === 'alle' || k === 1)) F.box(s0, s1, yF + c.bru - 0.24, yF + c.bru - 0.1, 0, 0.12, c.orn);
      if (c.geschossband && k > 1) F.box(s0, s1, yF - 0.08, yF + 0.08, 0, 0.08, c.orn);
      ax.forEach((u, i) => {
        if (gesperrt(ctx, F, u)) return;
        if (erk && k >= erk.k0 && k <= erk.k1 && Math.abs(u - erk.uc) < erk.bw / 2) return;
        if (c.treppenhaus != null && haupt && i === c.treppenhaus && ax.length >= 4) return;
        const tOff = ris && i >= ris.i0 && i <= ris.i1 ? ris.t : 0;
        const fo = { ...c.fo(k, i, F), t: tOff };
        const fw = ecke ? Math.min(c.fw, F.L - 0.55) : c.fw;
        if (balk.has(i) && (c.balkonGeschosse ?? [1, 2]).includes(k) && k < n + (c.balkonOben ? 1 : 0)) {
          const bart = c.balkon?.art;
          if (bart === 'loggia') { loggia(F, u - fw / 2 - 0.5, u + fw / 2 + 0.5, yF, c.gh, c); return; }
          fenster(F, u, yF + 0.12, fw, Math.min(c.gh - 0.75, fh + c.bru - 0.25), { ...fo, sims: null, verd: fo.verd === 'dreieck' || fo.verd === 'bogen' ? 'gerade' : fo.verd });
          balkon(tOff ? F.versatz(tOff) : F, u - fw / 2 - 0.45, u + fw / 2 + 0.45, yF + 0.12, c.balkonTiefe ?? 0.9, c.balkon ?? { konsolen: true, platte: c.orn });
        } else fenster(F, u, yF + c.bru, fw, fh, fo);
        if (c.felder) F.box(u - fw / 2 - 0.05, u + fw / 2 + 0.05, yF + 0.2, yF + c.bru - 0.26, tOff, tOff + 0.04, c.felder);
      });
    }
    if (c.treppenhaus != null && haupt && ax.length >= 4) {
      const u = ax[c.treppenhaus];
      F.box(u - 0.62, u + 0.62, c.eg + 0.4, H - 0.6, -0.02, 0.05, RAHMEN);
      F.box(u - 0.55, u + 0.55, c.eg + 0.47, H - 0.67, -0.03, 0.065, FARBEN.fensterHell);
      for (let y = c.eg + 0.47 + 0.55; y < H - 0.7; y += 0.55) F.box(u - 0.55, u + 0.55, y - 0.025, y + 0.025, 0, 0.08, RAHMEN);
      F.box(u - 0.02, u + 0.02, c.eg + 0.47, H - 0.67, 0, 0.08, RAHMEN);
    }
    if (c.raster50 && !ecke) {
      for (let k = 1; k <= n; k++) F.box(s0, s1, c.eg + (k - 1) * c.gh - 0.1, c.eg + (k - 1) * c.gh + 0.1, 0, 0.14, c.raster50);
      for (let i = 0; i <= ax.length; i++) { const u = i === 0 ? 0.15 : i === ax.length ? F.L - 0.15 : (ax[i - 1] + ax[i]) / 2; F.box(u - 0.12, u + 0.12, c.eg, H, 0, 0.14, c.raster50); }
    }
    if (erk) erker(ctx, F, erk, c);
    hauptgesims(F, s0, s1, H, c);
  }
  ctx.farbe = c.wand;
  return H;
}
function hauptgesims(F, s0, s1, H, c) {
  const eL = F.extL ? 0.45 : 0, eR = F.extR ? 0.45 : 0;
  if (c.gesims === 'konsolen') {
    F.box(s0, s1, H - 0.78, H - 0.24, 0, 0.06, c.orn);
    for (let u = 0.4; u < F.L - 0.2; u += 0.72) F.box(u - 0.1, u + 0.1, H - 0.5, H - 0.14, 0, 0.32, c.orn);
    F.box(s0 - eL, s1 + eR, H - 0.16, H + 0.12, 0, 0.5, c.orn);
  } else if (c.gesims === 'zahnschnitt') {
    F.box(s0, s1, H - 0.6, H - 0.42, 0, 0.12, c.orn);
    for (let u = 0.2; u < F.L - 0.1; u += 0.32) F.box(u - 0.08, u + 0.08, H - 0.42, H - 0.24, 0, 0.2, c.orn);
    F.box(s0 - eL, s1 + eR, H - 0.24, H + 0.1, 0, 0.42, c.orn);
  } else if (c.gesims === 'einfach') {
    F.box(s0, s1, H - 0.5, H - 0.3, 0, 0.12, c.orn);
    F.box(s0 - eL * 0.9, s1 + eR * 0.9, H - 0.28, H + 0.1, 0, 0.42, c.orn);
  } else if (c.gesims === 'fries') {
    F.box(s0, s1, H - 0.9, H - 0.35, 0, 0.05, c.orn);
    for (let u = 0.3; u < F.L - 0.2; u += 0.55) F.box(u - 0.16, u + 0.16, H - 0.78, H - 0.46, 0.05, 0.08, c.fliese ?? '#5f8f7a');
    F.box(s0 - eL * 0.9, s1 + eR * 0.9, H - 0.32, H + 0.1, 0, 0.55, c.orn);
  } else if (c.gesims === 'hohlkehle') {
    F.box(s0, s1, H - 0.45, H - 0.2, 0, 0.18, c.orn);
    F.box(s0 - eL * 0.6, s1 + eR * 0.6, H - 0.22, H + 0.08, 0, 0.36, c.orn);
  } else F.box(s0 - eL * 0.5, s1 + eR * 0.5, H - 0.12, H + 0.06, 0, 0.3, c.orn);
}

function erker(ctx, F, e, c) {
  const { uc, bw, k0, k1, td } = e;
  const y0 = c.eg + (k0 - 1) * c.gh, y1 = c.eg + k1 * c.gh;
  const uL = uc - bw / 2, uR = uc + bw / 2;
  const wand = heller(c.wand, 0.025);
  let front, seiten, P;
  if (c.erkerTyp === 'polygon') {
    const kk = td * 0.8;
    P = [F.welt(uL, 0), F.welt(uR, 0), F.welt(uR - kk, td), F.welt(uL + kk, td)];
    ctx.S.add(prismoid(P, y0, y1 - y0), wand);
    front = new Fassade(ctx, F.welt(uL + kk, td), F.welt(uR - kk, td), { art: 'erker' });
    seiten = [new Fassade(ctx, F.welt(uR - kk, td), F.welt(uR, 0), { art: 'erker' }), new Fassade(ctx, F.welt(uL, 0), F.welt(uL + kk, td), { art: 'erker' })];
  } else {
    F.box(uL, uR, y0, y1, 0, td, wand);
    P = [F.welt(uL, 0), F.welt(uR, 0), F.welt(uR, td), F.welt(uL, td)];
    front = F.versatz(td);
    seiten = [new Fassade(ctx, F.welt(uR, td), F.welt(uR, 0), { art: 'erker' }), new Fassade(ctx, F.welt(uL, 0), F.welt(uL, td), { art: 'erker' })];
  }
  F.box(uL + 0.15, uR - 0.15, y0 - 0.35, y0, 0, td - 0.1, c.orn);
  F.box(uL + 0.45, uR - 0.45, y0 - 0.7, y0 - 0.35, 0, td - 0.35, c.orn);
  const istVersatz = c.erkerTyp !== 'polygon';
  const fl = istVersatz ? bw : front.L;
  const fronts = fl > 3.4 ? [fl / 2 - fl / 4 - 0.05, fl / 2 + fl / 4 + 0.05] : [fl / 2];
  for (let k = k0; k <= k1; k++) {
    const yF = c.eg + (k - 1) * c.gh, fh = c.fhk ? c.fhk(k) : c.fh;
    const fo = { ...c.fo(k, 1, F), verd: c.erkerVerd ?? 'gerade', t: 0 };
    for (const u of fronts) fenster(front, istVersatz ? uL + u : u, yF + c.bru, Math.min(c.fw, fl / fronts.length - 0.6), fh, fo);
    for (const G of seiten) fenster(G, G.L / 2, yF + c.bru, Math.max(0.35, G.L - 0.45), fh, { ...fo, verd: null, kreuz: 'quer', faschen: null });
    if (k > k0) for (const G of [front, ...seiten]) { const off = G === front && istVersatz ? uL : 0; G.box(off - 0.06, off + (G === front && istVersatz ? bw : G.L) + 0.06, yF - 0.1, yF + 0.08, -0.02, 0.08, c.orn); }
  }
  ctx.S.add(prismoid(P.map((p) => p), y1 - 0.2, 0.2), c.orn);
  if (k1 < ctx.n) {
    if (c.erkerTyp === 'polygon') ctx.S.add(prismoid(P, y1, 0.9), c.orn);
    else balkon(F, uL, uR, y1 + 0.02, td, { platte: c.orn, ornament: true, abstand: 0.22 });
  } else if (c.erkerHelm) {
    if (c.erkerHelm === 'spitz') {
      const cxz = F.welt(uc, td / 2);
      const poly = nGon(cxz[0], cxz[1], Math.min(bw, td * 2.2) / 2, 8);
      ctx.S.add(prismoid(poly, y1, 1.6), c.wand);
      for (const G of rundFacetten(ctx, poly)) fenster(G, G.L / 2, y1 + 0.35, Math.min(0.6, G.L - 0.3), 0.9, { kreuz: 'quer' });
      helm(ctx, poly, y1 + 1.6, 3.4, c.helmFarbe ?? FARBEN.kupfer[0]);
    } else if (c.erkerHelm === 'haube') {
      const m = Math.min(bw, td) / 2 - 0.01;
      ctx.S.add(prismoid(P, y1 + 0.05, 0.7, P.map(() => m * 0.45)), c.helmFarbe ?? '#6f7880');
      ctx.S.add(prismoid(versetzt(P, P.map(() => m * 0.45)), y1 + 0.75, 0.9, P.map(() => m * 0.55 - 0.005)), c.helmFarbe ?? '#6f7880');
    } else { const m = Math.min(bw, td) / 2 - 0.01; ctx.S.add(prismoid(P, y1 + 0.1, 1.6, P.map(() => m)), c.helmFarbe ?? '#7c848c'); }
  }
}
function rundFacetten(ctx, poly) {
  const out = [];
  for (let j = 0; j < poly.length; j++) {
    const G = new Fassade(ctx, poly[j], poly[(j + 1) % poly.length], { art: 'turm' });
    if (G.nx + G.nz > -0.15) out.push(G);
  }
  return out;
}

// ---------- Eckturm ----------
function eckturm(ctx, c, yRoof, hoehe, art = 'kuppel') {
  const { x, z, w, d, cEck: ce, form } = ctx;
  let cx, cz, R;
  if (form === 'rund') { cx = x + w - ce; cz = z + d - ce; R = ce * 0.98; }
  else { R = ce * 0.78; const ap = R * Math.cos(Math.PI / 8); const mx = x + w - ce / 2, mz = z + d - ce / 2; cx = mx - ap * Math.SQRT1_2; cz = mz - ap * Math.SQRT1_2; }
  const y0 = ctx.H, y1 = yRoof + 0.6;
  const { poly, fac } = rundkoerper(ctx, cx, cz, R, 8, y0, y1, c.wand);
  for (const G of fac) {
    fenster(G, G.L / 2, y0 + 0.9, Math.min(0.9, G.L - 0.5), Math.min(1.9, y1 - y0 - 1.6), { faschen: c.orn, verd: 'rund', kreuz: 'senkrecht' });
    G.box(-0.03, G.L + 0.03, y1 - 0.4, y1, 0, 0.3, c.orn);
  }
  ctx.S.add(prismoid(nGon(cx, cz, R * 1.1, 8), y1, 0.2), c.orn);
  if (art === 'helm') helm(ctx, nGon(cx, cz, R * 1.02, 8), y1 + 0.2, hoehe * 1.5, c.kuppel);
  else if (art === 'zelt') { const p = nGon(cx, cz, R * 1.05, 8); ctx.S.add(prismoid(p, y1 + 0.2, hoehe * 0.7, p.map(() => R * 0.97)), c.kuppel); }
  else kuppel(ctx, nGon(cx, cz, R * 1.02, 8), y1 + 0.2, hoehe, c.kuppel);
}

// ======================================================================
// Dächer (generisch)
// ======================================================================
function giebelFenster(F, y, hg, o = {}) {
  const L = F.L, m = L / 2;
  const breite = (yy) => (L / 2) * (1 - (yy - y) / hg);
  const n1 = L > 11 ? 3 : L > 7.5 ? 2 : 1;
  const fh = Math.min(1.4, hg * 0.28), yb = y + 0.7;
  for (let i = 0; i < n1; i++) {
    const u = m + (i - (n1 - 1) / 2) * 1.9;
    if (Math.abs(u - m) + 0.6 < breite(yb + fh)) fenster(F, u, yb, o.fw ?? 0.95, fh, { kreuz: 'senkrecht', sims: o.sims, faschen: o.faschen, rahmen: o.rahmen, t: o.t ?? 0 });
  }
  if (hg > 4.2) { const y2 = y + hg * 0.52; if (breite(y2 + 1) > 0.7) fenster(F, m, y2, 0.7, Math.min(1.0, hg * 0.2), { kreuz: false, rahmen: o.rahmen, t: o.t ?? 0, faschen: o.faschen }); }
}
/** Zwerchhaus: Fassade wächst über die Traufe, oben ein Giebel (dreieck | rund | stufen | volute). */
function zwerchhaus(ctx, F, uc, B, H, o) {
  const hz = o.hz ?? 2.9, tief = o.tiefe ?? 2.5, wand = o.wand, dach = o.dach, orn = o.orn ?? ORN;
  F.box(uc - B / 2, uc + B / 2, H, H + hz, -tief, 0.02, wand);
  const nf = B > 4.2 ? 2 : 1;
  if (hz > 1.8) for (let i = 0; i < nf; i++) fenster(F, uc + (i - (nf - 1) / 2) * (B / 2), H + 0.7, Math.min(1.2, B / nf - 0.8), hz - 1.4, { ...(o.fo ?? {}), verd: null, t: 0.02 });
  F.box(uc - B / 2 - 0.1, uc + B / 2 + 0.1, H + hz - 0.1, H + hz + 0.12, -tief, 0.25, orn);
  const y = H + hz + 0.12;
  if (o.form === 'volute' || o.form === 'geschwungen') { zwerchgiebel(ctx, F, uc, B, y, Math.min(B * 0.85, 4.5), { wand, orn }, dach, o.form); return y + B * 0.85; }
  if (o.form === 'stufen') {
    const k = 3, G = B * 0.55;
    for (let i = 0; i < k; i++) { const w2 = B * (1 - i / k) / 2; F.box(uc - w2, uc + w2, y + (i * G) / k, y + ((i + 1) * G) / k, -0.5, 0.02, wand); F.box(uc - w2 - 0.05, uc + w2 + 0.05, y + ((i + 1) * G) / k, y + ((i + 1) * G) / k + 0.12, -0.55, 0.08, orn); }
    const pr = [F.welt(uc - B / 2, -0.4), F.welt(uc + B / 2, -0.4), F.welt(uc + B / 2, -tief), F.welt(uc - B / 2, -tief)];
    ctx.S.add(prismoid(pr, y - 0.1, G * 0.85, [0, B / 2 - 0.01, 0, B / 2 - 0.01]), dach);
    return y + G;
  }
  const hg = o.form === 'rund' ? B / 2 : B * 0.48;
  const s = new THREE.Shape();
  if (o.form === 'rund') { s.moveTo(-B / 2, 0); s.absarc(0, 0, B / 2, Math.PI, 0, true); s.closePath(); }
  else { s.moveTo(-B / 2, 0); s.lineTo(B / 2, 0); s.lineTo(0, hg); s.closePath(); }
  F.profil(s, uc, y, -tief - 0.5, 0.02, wand, 12);
  // Dachhaut leicht größer und dahinter
  const s2 = new THREE.Shape(), B2 = B / 2 + 0.25;
  if (o.form === 'rund') { s2.moveTo(-B2, 0); s2.absarc(0, 0, B2, Math.PI, 0, true); s2.closePath(); }
  else { s2.moveTo(-B2, 0); s2.lineTo(B2, 0); s2.lineTo(0, hg * (B2 / (B / 2))); s2.closePath(); }
  F.profil(s2, uc, y - 0.12 - 0.25 * (hg / (B / 2)) + 0.12, -tief - 0.6, -0.08, dach, 12);
  F.box(uc - B / 2 - 0.15, uc + B / 2 + 0.15, y - 0.06, y + 0.06, -0.1, 0.18, orn);
  if (hg > 1.6) fenster(F, uc, y + 0.35, 0.6, Math.min(0.9, hg * 0.4), { kreuz: false, verd: o.form === 'rund' ? 'rund' : null, t: 0.02 });
  return y + hg;
}

function dach(ctx, H, o) {
  const { S, r, P, K } = ctx;
  const strZ = ctx.strasse === '+z';
  let typ = o.typ;
  const span = strZ ? ctx.w : ctx.d, tiefe = strZ ? ctx.d : ctx.w;
  if (ctx.eck && typ === 'giebel') typ = 'sattel';
  if (ctx.eck && typ === 'sattel' && ctx.form !== 'gerade') typ = 'walm';
  if (typ === 'giebel' && span > 16) typ = 'sattel';
  if (typ === 'zelt' && Math.abs(ctx.w - ctx.d) > 5) typ = 'walm';
  const y = H + 0.12, farbe = o.farbe;
  const gb = o.gaube ?? {};
  const gaubenAuf = (hu, a, F, nur) => {
    if (!gb.form || gb.form === 'keine') return;
    const ax = ctx.achsenJe?.get(F) ?? achsen(F.L, 3.2, 1.5);
    const list = ax.paare ?? ax;
    list.forEach((u, i) => {
      if (gb.jedeZweite && i % 2) return;
      if (gesperrt(ctx, F, u)) return;
      if (nur && !nur(u)) return;
      if (u < 1.4 || u > F.L - 1.4) return;
      gaube(F, u, y, hu, a, { wand: gb.wand, dach: dunkler(farbe, 0.04), form: gb.form, breite: ax.paare ? 2.4 : undefined });
    });
  };
  const zwerche = (hu, a) => {
    if (!o.zwerch) return 0;
    let top = 0;
    for (const F of ctx.fassaden) {
      if (F.art !== 'haupt' || F.L < 8) continue;
      const ri = ctx.risalit?.get(F);
      const uc = ri ? ri.uc : o.zwerch.uc ?? F.L / 2, B = ri ? ri.B : clamp(o.zwerch.B ?? F.L * 0.3, 3.2, 6.5);
      top = Math.max(top, zwerchhaus(ctx, F, uc, B, H, { ...o.zwerch, tiefe: ((o.zwerch.hz ?? 2.9) + 0.8) * (a / hu) + 0.6, dach: farbe }));
    }
    return top;
  };
  if (typ === 'mansarde') {
    const hu = o.hu ?? zw(r, 3.0, 3.6);
    const zw0 = o.zwerch ? (F) => { const ri = ctx.risalit?.get(F); const uc = ri ? ri.uc : o.zwerch.uc ?? F.L / 2; const B = ri ? ri.B : clamp(o.zwerch.B ?? F.L * 0.3, 3.2, 6.5); return (u) => Math.abs(u - uc) > B / 2 + 0.6; } : null;
    if (zw0) ctx.sperreGauben = zw0;
    const top = mansarde(ctx, y, {
      a: o.a ?? 0.9, hu, b: o.b ?? 2.0, ho: o.ho ?? 0.9, farbeU: farbe, farbeO: o.farbe2 ?? heller(farbe, 0.07), kante: o.kante,
      achsen: ctx.achsenJe, jedeZweite: gb.jedeZweite, gauben: !!gb.form && gb.form !== 'keine', gaube: { wand: gb.wand, dach: dunkler(farbe, 0.04), form: gb.form },
      kram: o.kram,
    });
    ctx.sperreGauben = null;
    return Math.max(top, zwerche(hu, o.a ?? 0.9));
  }
  if (typ === 'sattel' || typ === 'giebel') {
    const quer = typ === 'giebel';
    const achse = ctx.eck ? 'x' : (strZ !== quer ? 'x' : 'z');
    const spanDach = achse === 'x' ? ctx.d : ctx.w;
    const hz = clamp(spanDach * (o.neigung ?? zw(r, 0.42, 0.62)) * (quer ? 1.25 : 1), 2.8, quer ? 10 : 7.5);
    satteldach(ctx, ctx.x, ctx.z, ctx.x + ctx.w, ctx.z + ctx.d, y, hz, achse, { dach: farbe, wand: o.wand, ueberstand: o.ueberstand ?? 0.45, ortgang: quer ? 0.25 : sichtbar(ctx, achse === 'x' ? '+x' : '+z') ? 0.3 : 0.02 });
    const gLabel = achse === 'z' ? '+z' : '+x', tLabel = achse === 'z' ? '+x' : '+z';
    for (const F of ctx.fassaden) {
      if (F.label === gLabel && o.giebelDeko !== false) giebelFenster(F, y, hz, o.giebel ?? {});
      if (F.label === tLabel && F.art === 'haupt') {
        const zw0 = o.zwerch && ctx.fassaden.includes(F) ? (() => { const ri = ctx.risalit?.get(F); const uc = ri ? ri.uc : o.zwerch.uc ?? F.L / 2; const B = ri ? ri.B : clamp(o.zwerch.B ?? F.L * 0.3, 3.2, 6.5); return (u) => Math.abs(u - uc) > B / 2 + 0.8; })() : null;
        gaubenAuf(hz, spanDach / 2, F, zw0);
      }
    }
    const zt = achse === 'z' ? 0 : zwerche(hz, spanDach / 2);
    const first = achse === 'x' ? [[ctx.x + 1.5, ctx.z + ctx.d / 2], [ctx.x + ctx.w - 1.5, ctx.z + ctx.d / 2]] : [[ctx.x + ctx.w / 2, ctx.z + 1.5], [ctx.x + ctx.w / 2, ctx.z + ctx.d - 1.5]];
    dachkram(ctx, first, y + hz * 0.3, y + hz, o.kram);
    return Math.max(y + hz, zt);
  }
  if (typ === 'walm' || typ === 'zelt') {
    const ov = o.ueberstand ?? 0.4;
    const Pov = versetzt(P, K.map((k) => (sichtbar(ctx, k) || dachKante(ctx, k) ? -ov : 0)));
    S.add(prismoid(Pov, y - 0.02, 0.14), o.traufe ?? '#f2f0ea');
    let ins, hz;
    if (typ === 'zelt') { const m = Math.min(ctx.w, ctx.d) / 2 + ov - 0.01; ins = K.map(() => m); hz = clamp(Math.min(ctx.w, ctx.d) * (o.neigung ?? 0.42), 3, 7); }
    else {
      const s = ctx.eck ? Math.min(ctx.w, ctx.d) * 0.46 : tiefe / 2 + ov - 0.01;
      ins = K.map((k) => (dachKante(ctx, k) ? s : sichtbar(ctx, k) ? Math.min(3.5, tiefe * 0.38) : 0));
      hz = clamp(tiefe * (o.neigung ?? zw(r, 0.3, 0.45)), 2.2, 6.5);
    }
    S.add(prismoid(Pov, y + 0.12, hz, ins), farbe);
    for (const F of ctx.fassaden) if (F.art === 'haupt') gaubenAuf(hz, ins[K.indexOf(F.label)] ?? tiefe / 2, F, (u) => u > 2.6 && u < F.L - 2.6);
    const zt = zwerche(hz, tiefe / 2);
    dachkram(ctx, versetzt(Pov, ins.map((v) => v * 0.85)), y, y + hz, o.kram);
    return Math.max(y + hz, zt);
  }
  if (typ === 'staffel') {
    const P2 = versetzt(P, K.map((k) => (sichtbar(ctx, k) ? 2.2 : 0)));
    attika(ctx, P, H, 1.0, o.attika ?? o.wand, '#d9dcdf');
    S.add(prismoid(P2, H, o.gh ?? 3.0), o.wand);
    for (const F of fassadenFuer(ctx, P2, K)) achsen(F.L, 2.8, 1.0).forEach((u) => fenster(F, u, H + 0.3, 1.8, 2.1, { kreuz: 'senkrecht', rahmen: o.rahmen ?? RAHMEN }));
    const P3 = versetzt(P2, K.map((k) => (sichtbar(ctx, k) ? -0.5 : 0)));
    S.add(prismoid(P3, H + (o.gh ?? 3.0), 0.25), o.platte ?? '#f2f2ef');
    flachdachTechnik(ctx, P2, H + (o.gh ?? 3.0) + 0.25, { geraete: 1, antenne: 0.4 });
    return H + (o.gh ?? 3.0) + 2;
  }
  // flach
  if (o.balustrade) for (const F of ctx.fassaden) { const [s0, s1] = F.spanne(0.1); balustrade(F, s0, s1, H + 0.12, o.attika ?? ORN); }
  else attika(ctx, P, H, o.attikaH ?? 0.7, o.attika ?? o.wand, '#d9dcdf');
  flachdachTechnik(ctx, P, H + 0.1, { geraete: o.geraete ?? 1, antenne: 0.6, aufbauFarbe: o.wand });
  return H + 2.5;
}

// ======================================================================
// 1. Gründerzeit / Historismus
// ======================================================================
function gruenderzeit(ctx) {
  const { r } = ctx;
  const klinker = r() < ({ Nord: 0.3, Ost: 0.22 }[ctx.region] ?? 0.07);
  const wand = klinker ? ziegelstein(ctx, { rot: 2, gelb: 1.5, dunkelrot: 1, braun: 0.6 }) : putz(ctx, { weiss: 3, sand: 3, sandstein: 1.2, ocker: 1.3, zartgelb: 0.9, rosa: 1, altrosa: 0.9, hellgruen: 0.7, hellblau: 0.9, grau: 1.5, taupe: 0.8, lachs: 0.4 });
  const ornArt = klinker ? 'stein' : wz(r, [['weiss', 4], ['ton', 3], ['kontrast', 1.5]]);
  const orn = ornArt === 'stein' ? waehle(r, ['#e8dfcf', '#efe8da', '#d8c3a0']) : ornArt === 'weiss' ? ORN : ornArt === 'ton' ? heller(wand, 0.07) : waehle(r, ['#d8c3a0', dunkler(wand, 0.1), '#e8e0d0']);
  const sockel = wz(r, [[dunkler(wand, 0.07), 3], ['#d9c4a8', 1.5], ['#9a9690', 1], [wand, 1], ['#cfc0a8', 1]]);
  const gh = zw(r, 3.45, 3.9);
  const muster = waehle(r, [['dreieck', 'gerade', 'sturz', 'keine'], ['bogen', 'gerade', 'gerade', 'keine'], ['gerade', 'gerade', 'gerade', 'gerade'], ['sturz', 'sturz', 'sturz', 'keine'], ['dreieck', 'dreieck', 'gerade', 'rund'], ['bogen', 'sturz', 'keine', 'rund']]);
  const alternieren = r() < 0.4;
  const rhythmus = wz(r, [['gleich', 5], ['gekoppelt', 2], ['risalit', 2.2]]);
  const kreuz = wz(r, [[true, 4], ['senkrecht', 2], ['quer', 1]]);
  const c = {
    eg: zw(r, 4.2, 5.0), gh, wand, orn, sockel, rustika: r() < 0.6, gurt: r() < 0.85,
    raster: zw(r, 2.7, 3.5), rand: zw(r, 1.1, 1.7), fw: zw(r, 1.05, 1.35), bru: 0.95, fh: gh - 1.75, rhythmus,
    fhk: (k) => (k === 1 ? gh - 1.55 : k === ctx.n ? gh - 1.95 : gh - 1.75),
    fo: (k, i) => {
      let v = muster[Math.min(k - 1, 3)];
      if (k === ctx.n && ctx.n > 2) v = muster[3];
      if (alternieren && k === 1 && i % 2) v = v === 'dreieck' ? 'bogen' : v === 'bogen' ? 'dreieck' : v;
      return { faschen: orn, sims: orn, verd: v, kreuz, glas: ctx.glas };
    },
    erker: r() < 0.55, erkerTyp: r() < 0.45 ? 'polygon' : 'kasten', erkerBisOben: r() < 0.35, erkerHelm: waehle(r, ['zelt', 'haube', 'spitz']), helmFarbe: dachfarbe(ctx, { schiefer: 2, kupfer: 1, zink: 1 }), balkone: r() < 0.7,
    balkon: wz(r, [[{ konsolen: true, platte: orn, ornament: true }, 4], [{ konsolen: true, platte: orn, art: 'platte', farbe: orn, handlauf: orn }, 1.5], [{ art: 'loggia' }, 0.8]]),
    balkonMuster: wz(r, [['mitte', 3], ['rand', 2], ['alle', 1]]), balkonGeschosse: waehle(r, [[1, 2], [1, 2, 3], [2, 3], [1, 3]]),
    pilaster: wz(r, [['achsen', 2], ['ecken', 3], [null, 1.5]]), baender: wz(r, [['eins', 3], ['alle', 2], [null, 1]]), geschossband: r() < 0.3,
    gesims: wz(r, [['konsolen', 3], ['zahnschnitt', 2], ['einfach', 1.5], ['hohlkehle', 1]]),
    laden: 'klassisch', ladenTyp: wz(r, [['einzeln', 6], ['band', 1.5], ['arkade', ctx.region === 'Süd' ? 1.2 : 0.35]]), markisen: zw(r, 0.2, 0.7), leucht: 0.12,
  };
  if (ctx.eck) ctx.eckName = waehle(r, ['Apotheke am Markt', 'Café Kranz', 'Juwelier Albrecht', 'Konditorei Sahne', 'Weinhandlung Ritter']);
  const H = putzbau(ctx, c);
  const dt = ctx.eck ? dachWahl(ctx, r, [['mansarde', 4], ['walm', 1.5], ['flach', 1]]) : dachWahl(ctx, r, [['mansarde', 4], ['sattel', 2.4], ['walm', 1.2], ['flach', 0.6], ['zelt', 0.3]]);
  const df = dt === 'mansarde' ? dachfarbe(ctx, { schiefer: 3, zink: 2, kupfer: 0.25 }) : dt === 'flach' ? KIES : dachfarbe(ctx, { ziegel: 3, schiefer: 2, braun: 1.2, engobe: 0.8 });
  const zwerch = (dt === 'mansarde' || dt === 'sattel') && (rhythmus === 'risalit' ? r() < 0.75 : r() < 0.3) ? { form: wz(r, [['dreieck', 3], ['rund', 1.5], ['stufen', klinker ? 2 : 0.2]]), wand, orn, hz: gh * 0.85, fo: c.fo(2, 0) } : null;
  const top = dach(ctx, H, {
    typ: dt, farbe: df, wand, balustrade: dt === 'flach' && r() < 0.7, attika: orn,
    gaube: { form: wz(r, [['dreieck', 3], ['bogen', 2.5], ['flach', 1], ['ochsenauge', 0.8], ['keine', 0.8]]), wand: orn, jedeZweite: r() < 0.35 },
    zwerch, kram: { schornsteine: 2 + (ctx.w > 18 ? 1 : 0) + (r() < 0.4 ? 1 : 0), antenne: 0.5, sat: 0.3 },
  });
  if (ctx.eck && ctx.turm) eckturm(ctx, { wand, orn, kuppel: dachfarbe(ctx, { kupfer: 2, schiefer: 2, zink: 1 }) }, top, zw(r, 3.0, 4.4), wz(r, [['kuppel', 3], ['helm', 1.5], ['zelt', 1]]));
  return top;
}

// ======================================================================
// 2. Jugendstil
// ======================================================================
function jugendstil(ctx) {
  const { r, S } = ctx;
  const wand = putz(ctx, { ocker: 1.5, zartgelb: 1.4, rosa: 1.4, altrosa: 1.2, hellgruen: 1.5, hellblau: 1.5, lachs: 1, weiss: 1.2, sand: 0.8, grau: 0.5 });
  const orn = r() < 0.6 ? ORN : heller(wand, 0.1);
  const akzent = waehle(r, ['#5f8f7a', '#c9a64a', '#7a9cb5', '#b9786b', '#8fae8a', '#d7b56d', '#8a6f9f', '#5f7f9f', '#c47f5a']);
  const sockel = waehle(r, ['#d9c4a8', '#cdbb9f', dunkler(wand, 0.08), '#8f8a84']);
  const gh = zw(r, 3.45, 3.8);
  const giebelForm = wz(r, [['geschwungen', 3], ['rund', 1.5], ['spitz', 1]]);
  const mitGiebel = !ctx.eck || r() < 0.5;
  const erkerSeite = r() < 0.55;
  const verd1 = waehle(r, ['rund', 'bogen', 'keine']);
  const c = {
    eg: zw(r, 4.3, 4.8), gh, wand, orn, sockel, rustika: r() < 0.3, gurt: true,
    raster: zw(r, 2.6, 3.3), rand: 1.3, fw: zw(r, 1.1, 1.4), bru: 0.95, fh: gh - 1.85, rhythmus: r() < 0.25 ? 'gekoppelt' : 'gleich',
    fhk: (k) => (k === ctx.n ? gh - 2.1 : gh - 1.85),
    fo: (k) => ({ faschen: orn, fb: 0.13, sims: orn, verd: k === 1 || k === ctx.n ? verd1 : 'gerade', kaempfer: 0.72, sprossen: k % 2 && r() < 0.7 ? [1, 1] : null, glas: ctx.glas }),
    felder: r() < 0.75 ? akzent : null, erker: r() < 0.85, erkerTyp: r() < 0.5 ? 'polygon' : 'kasten', erkerLage: erkerSeite ? 'seite' : 'mitte', erkerBisOben: erkerSeite || r() < 0.4,
    erkerHelm: waehle(r, ['spitz', 'spitz', 'haube']), helmFarbe: dachfarbe(ctx, { kupfer: 3, schiefer: 1.5 }), erkerVerd: 'keine',
    balkone: r() < 0.6, balkon: { platte: orn, ornament: true, gitterFarbe: waehle(r, ['#2f3a3a', '#3b3f44', '#2f4a3a']) }, balkonMuster: waehle(r, ['mitte', 'rand']),
    pilaster: 'ecken', pilasterFarbe: heller(akzent, 0.15), baender: 'eins', geschossband: r() < 0.5, gesims: wz(r, [['fries', 3], ['hohlkehle', 1.5], ['einfach', 1]]), fliese: akzent,
    laden: 'klassisch', ladenTyp: wz(r, [['einzeln', 5], ['band', 1]]), markisen: 0.5, leucht: 0.08,
  };
  if (ctx.eck) { ctx.eckName = null; const R = 1.9; ctx.sperre = { '+z': [[ctx.w - R - 1.0, ctx.w + 1]], '+x': [[-1, R + 1.0]] }; }
  const H = putzbau(ctx, c);
  const dt = dachWahl(ctx, r, [['mansarde', 2.2], ['sattel', 2], ['walm', 1.4], ['zelt', 0.6]]);
  const dachF = dachfarbe(ctx, { ziegel: 3, schiefer: 2, braun: 1.2, engobe: 1, kupfer: 0.3 });
  const top = dach(ctx, H, {
    typ: dt, farbe: dachF, wand, a: 1.4, hu: zw(r, 3.6, 4.2), b: 2.2, ho: 1.2, kante: orn, neigung: zw(r, 0.55, 0.7),
    gaube: { form: wz(r, [['bogen', 3], ['ochsenauge', 1.5], ['dreieck', 1]]), wand: orn, jedeZweite: true },
    kram: { schornsteine: 2 + (ctx.w > 18 ? 1 : 0), antenne: 0.4, sat: 0.2 },
  });
  if (mitGiebel) for (const F of ctx.fassaden) {
    if (F.art !== 'haupt' || F.L < 9) continue;
    const ax = ctx.achsenJe.get(F);
    const uc = erkerSeite ? ax[ax.length - 1 - Math.max(1, Math.floor(ax.length * 0.25))] : F.L / 2;
    if (ctx.eck && F.label === '+z' && uc > F.L - 4.5) continue;
    const B = clamp(erkerSeite ? F.L * 0.32 : F.L * 0.42, 4.2, 8.5), G = Math.min(top - H + 1.6, B * 0.95);
    zwerchgiebel(ctx, F, uc, B, H, G, c, dachF, giebelForm);
  }
  if (ctx.eck) {
    const R = 1.9, cx = ctx.x + ctx.w - R * 0.3, cz = ctx.z + ctx.d - R * 0.3;
    const y0 = c.eg + 0.25, y1 = top + 0.4;
    const { poly, fac } = rundkoerper(ctx, cx, cz, R, 10, y0, y1, c.wand);
    S.add(prismoid(nGon(cx, cz, R * 0.5, 10), y0 - 1.1, 1.1, Array(10).fill(-R * 0.48)), c.orn);
    for (const G of fac) {
      for (let k = 1; k <= ctx.n; k++) { const yF = c.eg + (k - 1) * c.gh; fenster(G, G.L / 2, yF + c.bru, Math.min(0.85, G.L - 0.35), c.fh, { kreuz: 'quer', verd: null }); G.box(-0.02, G.L + 0.02, yF + c.bru - 0.25, yF + c.bru - 0.08, 0, 0.1, c.orn); }
      fenster(G, G.L / 2, H + 0.6, Math.min(0.7, G.L - 0.4), Math.max(0.8, y1 - H - 1.5), { kreuz: 'quer', verd: 'rund' });
      G.box(-0.03, G.L + 0.03, H - 0.4, H + 0.12, 0, 0.4, c.orn);
      G.box(-0.03, G.L + 0.03, y1 - 0.3, y1, 0, 0.3, c.orn);
    }
    const ht = r();
    if (ht < 0.6) helm(ctx, poly, y1, zw(r, 4.5, 6), c.helmFarbe);
    else kuppel(ctx, nGon(cx, cz, R * 1.04, 10), y1, zw(r, 2.6, 3.4), c.helmFarbe);
    return y1 + 5;
  }
  return top;
}
function zwerchgiebel(ctx, F, uc, B, y, G, c, dachF, form = 'geschwungen') {
  const hb = B / 2;
  const kontur = (sx, sy) => {
    const s = new THREE.Shape();
    s.moveTo(-hb * sx, 0);
    if (form === 'rund') { s.lineTo(-hb * sx, G * 0.45 * sy); s.absarc(0, G * 0.45 * sy, hb * sx, Math.PI, 0, true); s.lineTo(hb * sx, 0); s.closePath(); return s; }
    if (form === 'spitz') { s.lineTo(-hb * sx, G * 0.25 * sy); s.quadraticCurveTo(-hb * 0.35 * sx, G * 0.5 * sy, 0, G * sy); s.quadraticCurveTo(hb * 0.35 * sx, G * 0.5 * sy, hb * sx, G * 0.25 * sy); s.lineTo(hb * sx, 0); s.closePath(); return s; }
    if (form === 'volute') {
      s.lineTo(-hb * sx, G * 0.1 * sy);
      s.quadraticCurveTo(-hb * 0.6 * sx, G * 0.1 * sy, -hb * 0.6 * sx, G * 0.45 * sy);
      s.lineTo(-hb * 0.6 * sx, G * 0.52 * sy);
      s.quadraticCurveTo(-hb * 0.3 * sx, G * 0.52 * sy, -hb * 0.3 * sx, G * 0.8 * sy);
      s.quadraticCurveTo(0, G * 1.05 * sy, hb * 0.3 * sx, G * 0.8 * sy);
      s.quadraticCurveTo(hb * 0.3 * sx, G * 0.52 * sy, hb * 0.6 * sx, G * 0.52 * sy);
      s.lineTo(hb * 0.6 * sx, G * 0.45 * sy);
      s.quadraticCurveTo(hb * 0.6 * sx, G * 0.1 * sy, hb * sx, G * 0.1 * sy);
      s.lineTo(hb * sx, 0); s.closePath(); return s;
    }
    s.lineTo(-hb * sx, G * 0.22 * sy);
    s.bezierCurveTo(-hb * sx, G * 0.48 * sy, -hb * 0.38 * sx, G * 0.42 * sy, -hb * 0.4 * sx, G * 0.66 * sy);
    s.bezierCurveTo(-hb * 0.42 * sx, G * 0.92 * sy, -hb * 0.12 * sx, G * sy, 0, G * sy);
    s.bezierCurveTo(hb * 0.12 * sx, G * sy, hb * 0.42 * sx, G * 0.92 * sy, hb * 0.4 * sx, G * 0.66 * sy);
    s.bezierCurveTo(hb * 0.38 * sx, G * 0.42 * sy, hb * sx, G * 0.48 * sy, hb * sx, G * 0.22 * sy);
    s.lineTo(hb * sx, 0); s.closePath();
    return s;
  };
  const tief = 4.0;
  const poly = [F.welt(uc - hb * 0.9, -0.3), F.welt(uc + hb * 0.9, -0.3), F.welt(uc + hb * 0.9, -tief), F.welt(uc - hb * 0.9, -tief)];
  ctx.S.add(prismoid(poly, y + 0.1, G * 0.8, [0, hb * 0.9 - 0.01, 0, hb * 0.9 - 0.01]), dachF);
  F.profil(kontur(1.06, 1.06), uc, y, -0.42, 0.06, c.orn, 10);
  F.profil(kontur(1, 1), uc, y, -0.36, 0.14, c.wand, 10);
  const ring = new THREE.CylinderGeometry(0.62, 0.62, 0.08, 16); ring.rotateX(Math.PI / 2); ring.translate(uc, y + G * 0.62, 0.17); F.geo(ring, c.orn);
  const gl = new THREE.CylinderGeometry(0.46, 0.46, 0.08, 16); gl.rotateX(Math.PI / 2); gl.translate(uc, y + G * 0.62, 0.2); F.geo(gl, FARBEN.fenster);
  if (B > 5) for (const s of [-1, 1]) fenster(F, uc + s * hb * 0.42, y + 0.55, 0.8, Math.min(1.5, G * 0.3), { t: 0.14, kreuz: 'quer', verd: 'rund', verdFarbe: c.orn });
  else fenster(F, uc, y + 0.55, 1.0, Math.min(1.4, G * 0.3), { t: 0.14, verd: null });
  if (form === 'volute') for (const s of [-1, 1]) { const p = F.welt(uc + s * hb * 0.95, 0); ctx.S.box(0.3, 0.45, 0.3, p[0], y + G * 0.1 + 0.22, p[1], c.orn); const q = F.welt(uc + s * hb * 0.55, 0); ctx.S.box(0.26, 0.4, 0.26, q[0], y + G * 0.52 + 0.2, q[1], c.orn); }
  ctx.S.box(0.08, 1.0, 0.08, ...pt3(F.welt(uc, -0.1), y + G + 0.5), '#5f646b');
}
const pt3 = (p, y) => [p[0], y, p[1]];

// ======================================================================
// 3. Norddeutscher Backstein / Kontorhaus
// ======================================================================
function backstein(ctx) {
  const { S, r, n } = ctx;
  const eg = zw(r, 4.3, 4.7), gh = zw(r, 3.3, 3.7);
  const stein = ziegelstein(ctx, { rot: 3, dunkelrot: 2, braun: 1.5, gelb: 1, bunt: 1.2 });
  const lisArt = wz(r, [['hell', 3], ['dunkel', 2], ['glasiert', 1], ['gleich', 1]]);
  const hell = lisArt === 'hell' ? heller(stein, 0.05) : lisArt === 'dunkel' ? dunkler(stein, 0.07) : lisArt === 'glasiert' ? '#5a3a40' : stein;
  const dunkel = dunkler(stein, 0.06);
  const natur = waehle(r, ['#e8dfcf', '#efe8da', '#ddd3c2', '#cfc6b4']);
  const egF = waehle(r, ['#6f6a66', natur, '#8a817a', '#4f4c4a', stein]);
  const variante = ctx.eck ? wz(r, [['staffel', 3], ['kupferwalm', 1.2], ['flach', 1]]) : wz(r, [['giebel', ctx.w <= 17 ? 1.4 : 0.3], ['staffel', 1.6], ['flach', 1], ['kupferwalm', 1.2], ['trauf', 1.6]]);
  const nStaffel = variante === 'staffel' ? (n >= 5 ? 2 : 1) : 0;
  const nVoll = n - nStaffel;
  const H = eg + nVoll * gh;
  ctx.H = H; ctx.farbe = stein;
  S.add(prismoid(ctx.P, 0, H), stein);
  if (ctx.eck) ctx.eckName = waehle(r, ['Kaffeerösterei Bohne', 'Teehaus Löwe', 'Weinhandlung Ritter', 'Feinkost Bruns']);
  const rahmen = wz(r, [['#f4f1ea', 4], ['#2f5d4a', 1], ['#3b4046', 1], ['#e8dcc0', 1]]);
  const fenOpt = { rahmen, sprossen: [waehle(r, [2, 3, 1]), waehle(r, [2, 1, 3])], kreuz: false, rb: 0.08, glas: ctx.glas };
  const deko = wz(r, [['quadrat', 2], ['raute', 2], ['keine', 1]]);
  const raster = zw(r, 2.3, 3.1), fwEx = zw(r, 0.8, 1.1);
  const backsteinGeschosse = (F, y0, k, ax, top) => {
    const [s0, s1] = F.spanne(0.1);
    const sp = ax.abstand;
    const piers = [];
    for (let i = 0; i <= ax.length; i++) piers.push(i === 0 ? ax[0] - sp / 2 : i === ax.length ? ax[ax.length - 1] + sp / 2 : (ax[i - 1] + ax[i]) / 2);
    if (F.art !== 'ecke') for (const u of piers) { F.box(u - 0.32, u + 0.32, y0, top - 0.55, 0, 0.26, hell); F.box(u - 0.36, u + 0.36, top - 0.75, top - 0.55, 0, 0.32, natur); }
    for (let kk = 0; kk < k; kk++) {
      const yF = y0 + kk * gh;
      ax.forEach((u) => {
        const fw = F.art === 'ecke' ? Math.min(F.L - 0.6, 1.4) : sp - fwEx;
        F.box(u - fw / 2 - 0.05, u + fw / 2 + 0.05, yF + 0.15, yF + 0.95, 0, 0.07, dunkel);
        if (deko === 'quadrat') F.box(u - 0.25, u + 0.25, yF + 0.4, yF + 0.7, 0.07, 0.1, natur);
        else if (deko === 'raute') { const g = new THREE.BoxGeometry(0.36, 0.36, 0.04); g.rotateZ(Math.PI / 4); g.translate(u, yF + 0.55, 0.09); F.geo(g, natur); }
        fenster(F, u, yF + 1.0, fw, gh - 1.35, { ...fenOpt, sims: natur });
      });
    }
    F.box(s0, s1, top - 0.55, top, 0, 0.36, natur);
    F.box(s0 - (F.extL ? 0.3 : 0), s1 + (F.extR ? 0.3 : 0), top, top + 0.12, 0, 0.45, '#cfc9be');
  };
  for (const F of ctx.fassaden) {
    const [s0, s1] = F.spanne(0.1);
    F.box(s0, s1, 0, eg, 0, 0.1, egF);
    const ax = F.art === 'ecke' ? [F.L / 2] : achsen(F.L, raster, 0.75);
    if (F.art === 'neben') ax.forEach((u) => fenster(F, u, 1.5, ax.abstand - 1.1, eg - 2.5, { ...fenOpt, t: 0.1 }));
    else ladenzone(ctx, F, eg - 0.2, { tb: 0.12, stil: 'klassisch', typ: r() < 0.25 ? 'band' : 'einzeln', markisen: 0.3, portal: natur, holz: '#4b3a30', leucht: 0.1 });
    F.box(s0, s1, eg - 0.2, eg + 0.25, 0, 0.32, natur);
    backsteinGeschosse(F, eg + 0.25, nVoll, ax, H);
  }
  let top = H + 0.12;
  if (variante === 'giebel') {
    const strZ = ctx.strasse === '+z';
    const span = strZ ? ctx.w : ctx.d;
    const G = clamp(span * 0.62, 4.5, 10);
    const dachF = dachfarbe(ctx, { ziegel: 2, engobe: 1.5, schiefer: 1, bitumen: 0.3 });
    satteldach(ctx, ctx.x, ctx.z, ctx.x + ctx.w, ctx.z + ctx.d, H, G - 0.9, strZ ? 'z' : 'x', { dach: dachF, wand: stein, ueberstand: 0.15, ortgang: 0.05 });
    for (const F of ctx.fassaden) if (F.art === 'haupt') treppengiebel(F, H, G, stein, natur, r);
    top = H + G;
    dachkram(ctx, rechteck(ctx.x + ctx.w * 0.45, ctx.z + 2, ctx.x + ctx.w * 0.55, ctx.z + ctx.d - 2), H, H + G - 1.2, { schornsteine: 2, kaminFarbe: dunkel, antenne: 0.3 });
  } else if (variante === 'trauf') {
    ctx.achsenJe = new Map(ctx.fassaden.map((F) => [F, achsen(F.L, raster, 0.75)]));
    top = dach(ctx, H, { typ: 'sattel', farbe: dachfarbe(ctx, { ziegel: 2, engobe: 2, schiefer: 1 }), wand: stein, neigung: zw(r, 0.5, 0.65), ueberstand: 0.25,
      zwerch: { form: wz(r, [['stufen', 3], ['dreieck', 1]]), wand: stein, orn: natur, hz: gh, B: clamp(ctx.w * 0.35, 3.5, 6), fo: { rahmen, kreuz: false, sprossen: [2, 2] } },
      gaube: { form: wz(r, [['flach', 1], ['dreieck', 1], ['keine', 1]]), wand: natur, jedeZweite: true }, giebel: { rahmen }, kram: { schornsteine: 2, kaminFarbe: dunkel } });
  } else if (variante === 'kupferwalm') {
    ctx.achsenJe = new Map(ctx.fassaden.map((F) => [F, F.art === 'ecke' ? [F.L / 2] : achsen(F.L, raster, 0.75)]));
    top = dach(ctx, H, { typ: 'walm', farbe: dachfarbe(ctx, { kupfer: 3, schiefer: 1 }), neigung: zw(r, 0.45, 0.6), ueberstand: 0.3, traufe: natur, gaube: { form: 'flach', wand: natur, jedeZweite: true }, kram: { schornsteine: 1, kaminFarbe: dunkel } });
  } else {
    let P = ctx.P, y = H + 0.12;
    for (let s = 0; s < nStaffel; s++) {
      const P2 = versetzt(P, ctx.K.map((k) => (sichtbar(ctx, k) ? 1.8 : 0)));
      attika(ctx, P, y, 0.9, stein, natur);
      S.add(prismoid(P2, y, gh), stein);
      for (const F of fassadenFuer(ctx, P2, ctx.K)) backsteinGeschosse(F, y, 1, F.art === 'ecke' ? [F.L / 2] : achsen(F.L, raster, 0.75), y + gh);
      P = P2; y += gh + 0.12;
    }
    attika(ctx, P, y, 0.6, stein, natur);
    flachdachTechnik(ctx, P, y, { aufbauFarbe: stein, geraete: 2 });
    top = y + 3;
  }
  return top;
}
function treppengiebel(F, y, G, stein, natur, r) {
  const k = clamp(Math.round(F.L / 2.4), 4, 7);
  const L = F.L;
  for (let i = 0; i < k; i++) {
    const w = L * (1 - i / k) - (i ? 0.3 : 0), y0 = y + (i * G) / k, y1 = y + ((i + 1) * G) / k;
    F.box(L / 2 - w / 2, L / 2 + w / 2, y0, y1, -0.5, 0.18, stein);
    F.box(L / 2 - w / 2 - 0.06, L / 2 + w / 2 + 0.06, y1, y1 + 0.14, -0.55, 0.24, natur);
    if (i < k - 2) {
      const nf = Math.max(1, Math.floor((w - 1.5) / 1.6));
      for (let j = 0; j < nf; j++) { const u = L / 2 - ((nf - 1) * 1.6) / 2 + j * 1.6; fenster(F, u, y0 + 0.45, 0.75, Math.min(1.3, G / k - 0.75), { t: 0.18, rahmen: '#f4f1ea', kreuz: 'senkrecht' }); }
    }
    if (i === 0) for (let j = 1; j < 4; j++) F.box(L * (j / 4) - 0.18, L * (j / 4) + 0.18, y0, y1, 0.18, 0.26, heller(stein, 0.04));
  }
  F.box(L / 2 - 0.05, L / 2 + 0.05, y + G + 0.14, y + G + 1.0, -0.2, -0.1, '#5f646b');
}

// ======================================================================
// 4. Fachwerk / Altstadt
// ======================================================================
function fachwerk(ctx) {
  ctx.n = Math.min(ctx.n, 5); // höher wird Fachwerk weder plausibel noch budgettauglich
  const { S, r, n } = ctx;
  const art = wz(r, [['klassisch', 5], ['verschiefert', ctx.region === 'West' || ctx.region === 'Mitte' ? 1.6 : 0.5], ['zier', 1.5]]);
  const eg = zw(r, 3.1, 3.5), gh = zw(r, 2.7, 2.95), vk = art === 'verschiefert' ? zw(r, 0.0, 0.15) : zw(r, 0.2, 0.42);
  const wand = art === 'verschiefert' ? waehle(r, ['#4b5057', '#565b62', '#454a51']) : putz(ctx, { weiss: 4, zartgelb: 1, rosa: 0.8, hellblau: 0.5, ocker: 0.6, sand: 1, hellgruen: 0.4 });
  const holz = waehle(r, art === 'zier' ? ['#8a4b32', '#7a3a2a', '#5b4031', '#9a5a3a'] : ['#5b4031', '#6e4430', '#4a3b33', '#7a4a33', '#3d3633', '#8a4b32', '#2f2b29']);
  const steinEG = art === 'verschiefert' ? waehle(r, ['#f1eadc', '#e8dfcf']) : waehle(r, ['#d9c4a8', '#e3d3bd', '#cdbb9f', '#e8dfcf', wand]);
  const laeden = art === 'verschiefert' ? waehle(r, ['#2f6b4a', '#3f7d56']) : r() < 0.45 ? waehle(r, ['#3f7d56', '#2f6f8f', '#8c3b3b', '#d39a2b', '#5a6e8a', '#6b4f3a']) : null;
  const spanStr = ctx.strasse === '+z' ? ctx.w : ctx.d;
  const giebel = ctx.eck ? false : spanStr <= 14 ? r() < 0.6 : r() < 0.15;
  ctx.farbe = wand;
  if (ctx.eck) ctx.eckName = waehle(r, ['Bäckerei Krause', 'Café Fräulein', 'Metzgerei Brandt', 'Bäckerei Jansen']);
  S.add(prismoid(ctx.P, 0, eg), steinEG);
  for (const F of ctx.fassaden) {
    const [s0, s1] = F.spanne(0.1);
    F.box(s0, s1, 0, 0.5, 0, 0.12, dunkler(steinEG, 0.1));
    if (F.art === 'neben') achsen(F.L, 2.6, 1).forEach((u) => fenster(F, u, 1.2, 0.95, 1.3, { sprossen: [2, 3], kreuz: false }));
    else ladenzone(ctx, F, eg + 0.3, { tb: 0.06, stil: 'alt', markisen: 0.25, holz, rahmen: art === 'verschiefert' ? '#2f6b4a' : holz });
  }
  let P = ctx.P, y = eg, alte = ctx.fassaden;
  for (let k = 1; k <= n; k++) {
    const Pn = vk > 0.05 ? versetzt(P, ctx.K.map((lb) => (sichtbar(ctx, lb) ? -vk : 0))) : P;
    S.add(prismoid(Pn, y, gh), wand);
    if (vk > 0.05) for (const F of alte) for (let u = 0.25; u < F.L - 0.1; u += 0.62) F.box(u - 0.09, u + 0.09, y - 0.24, y, 0, vk + 0.02, holz);
    const neu = fassadenFuer(ctx, Pn, ctx.K);
    for (const F of neu) {
      if (art === 'verschiefert') {
        const [s0, s1] = F.spanne(0.06);
        for (let yy = y + 0.3; yy < y + gh; yy += 0.45) F.box(s0, s1, yy - 0.03, yy, 0, 0.04, dunkler(wand, 0.04));
        (F.art === 'ecke' ? [F.L / 2] : achsen(F.L, 2.3, 1.0)).forEach((u) => fenster(F, u, y + 0.8, 0.95, Math.min(1.35, gh - 1.2), { sprossen: [2, 3], kreuz: false, laeden, faschen: '#f6f3ec', fb: 0.14, t: 0.04 }));
      } else fachwerkGeschoss(F, y, gh, holz, laeden, r, k, art === 'zier');
    }
    P = Pn; y += gh; alte = neu;
  }
  const H = y;
  ctx.H = H;
  for (const F of alte) { const [s0, s1] = F.spanne(0.12); F.box(s0, s1, H - 0.02, H + 0.14, 0, 0.14, art === 'verschiefert' ? '#f6f3ec' : holz); }
  const xs = P.map((p) => p[0]), zs = P.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const strZ = ctx.strasse === '+z';
  const achse = ctx.eck ? 'x' : giebel ? (strZ ? 'z' : 'x') : strZ ? 'x' : 'z';
  const span = achse === 'z' ? x1 - x0 : z1 - z0;
  const hg = clamp(span * (giebel ? zw(r, 0.7, 0.85) : zw(r, 0.55, 0.68)), 3.5, 9.5);
  const dachF = art === 'verschiefert' ? dachfarbe(ctx, { schiefer: 3 }) : dachfarbe(ctx, { ziegel: 3, braun: 1.5, schiefer: 1, engobe: 0.6 });
  satteldach(ctx, x0, z0, x1, z1, H + 0.12, hg, achse, { dach: dachF, wand, ueberstand: 0.55, ortgang: 0.45 });
  const gLabel = achse === 'z' ? '+z' : '+x';
  for (const F of alte) if (F.label === gLabel) {
    if (art === 'verschiefert') giebelFenster(F, H + 0.12, hg, { faschen: '#f6f3ec', t: 0.02 });
    else giebelFachwerk(F, H + 0.12, hg, holz, laeden, r);
  }
  const tLabel = achse === 'z' ? '+x' : '+z';
  const zwerch = !giebel && r() < 0.45;
  for (const F of alte) if (F.label === tLabel && F.L > 7) {
    const a = span / 2, al = Math.atan2(hg, a);
    if (zwerch && F.art === 'haupt') {
      const B = clamp(F.L * 0.3, 3.2, 5);
      F.box(F.L / 2 - B / 2, F.L / 2 + B / 2, H, H + gh, -2.2, 0.02, wand);
      if (art !== 'verschiefert') fachwerkGeschoss(new Fassade(ctx, F.welt(F.L / 2 - B / 2, 0.02), F.welt(F.L / 2 + B / 2, 0.02), { art: 'zwerch', extL: false, extR: false }), H, gh, holz, laeden, r, 2, false);
      else fenster(F, F.L / 2, H + 0.8, 0.95, 1.3, { sprossen: [2, 3], kreuz: false, laeden, t: 0.04 });
      zwerchhaus(ctx, F, F.L / 2, B, H + gh - 2.9, { hz: 0.01, tiefe: 2.2, wand, dach: dachF, orn: holz, form: 'dreieck' });
    }
    achsen(F.L, 4.2, 2.2).forEach((u) => {
      if (zwerch && Math.abs(u - F.L / 2) < 3) return;
      const tf = -1.0, ys = H + 0.12 + 1.0 * Math.tan(al);
      F.box(u - 0.8, u + 0.8, ys - 0.4, ys + 1.3, -2.8, tf, wand);
      F.box(u - 0.45, u + 0.45, ys - 0.1, ys + 0.95, tf - 0.05, tf + 0.03, FARBEN.fenster);
      F.box(u - 0.03, u + 0.03, ys - 0.1, ys + 0.95, tf, tf + 0.06, RAHMEN);
      const g = new THREE.BoxGeometry(1.9, 0.14, 2.6); g.rotateX(0.32); g.translate(u, ys + 1.42, -2.0 + 0.1); F.geo(g, dachF);
    });
  }
  const mitte = achse === 'z' ? [[x0 + (x1 - x0) / 2, z0 + 2], [x0 + (x1 - x0) / 2, z1 - 3]] : [[x0 + 2, z0 + (z1 - z0) / 2], [x1 - 3, z0 + (z1 - z0) / 2]];
  dachkram(ctx, mitte, H + hg * 0.4, H + hg, { schornsteine: 1 + (r() < 0.5 ? 1 : 0), antenne: 0.4, sat: 0.2 });
  return H + hg;
}
function fachwerkGeschoss(F, y0, h, holz, laeden, r, k, zier = false) {
  const [s0, s1] = F.spanne(0.1);
  const T = 0.07, B = 0.2;
  F.box(s0, s1, y0, y0 + B, 0, T, holz);
  F.box(s0, s1, y0 + h - B, y0 + h, 0, T, holz);
  const ax = F.art === 'ecke' ? [F.L / 2] : achsen(F.L, zier ? zw(r, 1.9, 2.2) : zw(r, 2.1, 2.6), 1.0);
  const fw = 0.95, fh = Math.min(1.3, h - 1.2), yb = y0 + 0.8;
  F.box(s0, s1, yb - 0.18, yb - 0.04, 0, T, holz);
  F.box(s0, s1, yb + fh + 0.04, yb + fh + 0.18, 0, T, holz);
  const posten = [0.12, F.L - 0.12];
  ax.forEach((u) => { posten.push(u - fw / 2 - 0.13, u + fw / 2 + 0.13); });
  posten.sort((a, b) => a - b);
  for (const u of posten) F.box(u - 0.1, u + 0.1, y0, y0 + h, 0, T, holz);
  ax.forEach((u, i) => {
    const a = u - fw / 2 - 0.03, b = u + fw / 2 + 0.03, ya = y0 + B, yc = yb - 0.18;
    if (zier || (i + k) % 2) { F.strebe(a, ya, b, yc, 0.12, T, holz); F.strebe(a, yc, b, ya, 0.12, T, holz); }
    else { const m = (a + b) / 2, ym = (ya + yc) / 2; F.strebe(a, ym, m, yc, 0.1, T, holz); F.strebe(m, yc, b, ym, 0.1, T, holz); F.strebe(b, ym, m, ya, 0.1, T, holz); F.strebe(m, ya, a, ym, 0.1, T, holz); }
    fenster(F, u, yb, fw, fh, { sprossen: [2, 3], kreuz: false, laeden, rb: 0.06, sims: null });
  });
  for (let i = 0; i < posten.length - 1; i++) {
    const a = posten[i] + 0.1, b = posten[i + 1] - 0.1;
    if (b - a < 0.5) continue;
    if (ax.some((u) => u > a && u < b)) continue;
    if (b - a > 1.3) { const m = (a + b) / 2; F.box(m - 0.09, m + 0.09, y0, y0 + h, 0, T, holz); F.strebe(a, y0 + B, m, y0 + h * 0.62, 0.13, T, holz); F.strebe(b, y0 + B, m, y0 + h * 0.62, 0.13, T, holz); }
    else F.strebe(a, y0 + B, b, y0 + h - B, 0.13, T, holz);
  }
}
function giebelFachwerk(F, y, hg, holz, laeden, r) {
  const L = F.L, T = 0.07, m = L / 2;
  const breite = (yy) => Math.max(0, (L / 2) * (1 - (yy - y) / hg));
  const ebenen = [y + 0.05];
  if (hg > 4.5) ebenen.push(y + hg * 0.48);
  if (hg > 7.5) ebenen.push(y + hg * 0.76);
  for (const ye of ebenen) { const b = breite(ye + 0.18) - 0.15; if (b > 0.3) F.box(m - b, m + b, ye, ye + 0.18, 0, T, holz); }
  ebenen.forEach((ye, i) => {
    const ytop = i + 1 < ebenen.length ? ebenen[i + 1] : y + hg;
    const nf = i === 0 ? (L > 9 ? 2 : 1) : 1;
    const fh = Math.min(1.2, (ytop - ye) * 0.45), yb = ye + 0.6;
    const us = nf === 2 ? [m - 1.3, m + 1.3] : [m];
    for (const u of us) {
      if (Math.abs(u - m) + 0.7 > breite(yb + fh)) continue;
      fenster(F, u, yb, i ? 0.6 : 0.85, fh, { sprossen: [2, 2], kreuz: false, laeden: i ? null : laeden, rb: 0.06 });
    }
    const b0 = breite(ye) - 0.2, b1 = breite(Math.min(ytop, ye + (ytop - ye) * 0.85)) - 0.2;
    if (b0 > 1.6) { F.strebe(m - b0, ye + 0.15, m - Math.max(b1, 0.7), ye + (ytop - ye) * 0.8, 0.12, T, holz); F.strebe(m + b0, ye + 0.15, m + Math.max(b1, 0.7), ye + (ytop - ye) * 0.8, 0.12, T, holz); }
  });
  F.box(m - 0.09, m + 0.09, y, y + hg, 0, T, holz);
  for (let du = 1.15; du < L / 2 - 0.4; du += 1.15) for (const sg of [-1, 1]) {
    const u = m + sg * du, yt = y + hg * (1 - du / (L / 2)) - 0.15;
    if (yt - y < 0.5) continue;
    F.box(u - 0.08, u + 0.08, y + 0.1, yt, 0, T * 0.9, holz);
  }
  F.strebe(0.3, y + 0.2, m, y + hg - 0.3, 0.16, T * 1.1, holz);
  F.strebe(L - 0.3, y + 0.2, m, y + hg - 0.3, 0.16, T * 1.1, holz);
  F.box(m - 0.1, m + 0.1, y + hg - 0.6, y + hg + 0.3, 0.05, 0.25, holz);
}

// ======================================================================
// 5. Nachkriegsmoderne 50er
// ======================================================================
function fuenfziger(ctx) {
  const { r } = ctx;
  const wand = putz(ctx, { zartgelb: 2, rosa: 1.4, hellgruen: 1.4, hellblau: 1.4, weiss: 1.4, sand: 1.4, ocker: 1, lachs: 0.8, grau: 1.2, altrosa: 0.6 });
  const gh = zw(r, 2.9, 3.1);
  const raster = r() < 0.25;
  const bart = wz(r, [['platte', 3], ['gitter', 1.5], ['loggia', 1], [null, 1.5]]);
  const bFarbe = waehle(r, ['#f4f2ee', '#e8604c', '#f2d16b', '#7fa9c4', '#9cc58c', '#c9cdd0', '#d97a5a', '#3f7d9a']);
  const format = wz(r, [['hoch', 3], ['quer', 2], ['quadrat', 1.5]]);
  const fw = format === 'quer' ? zw(r, 1.6, 1.9) : format === 'quadrat' ? 1.35 : zw(r, 1.1, 1.3), fh = format === 'quer' ? 1.25 : format === 'quadrat' ? 1.35 : zw(r, 1.45, 1.6);
  const rahmenF = wz(r, [[RAHMEN, 5], ['#3f4a53', 1], ['#7a4a33', 0.7], ['#2f5d4a', 0.5]]);
  const faschen = wz(r, [[null, 3], [RAHMEN, 1.5], [dunkler(wand, 0.08), 1]]);
  const c = {
    eg: zw(r, 3.9, 4.3), gh, wand, orn: RAHMEN, sockel: dunkler(wand, 0.05), rustika: false, gurt: r() < 0.25,
    raster: format === 'quer' ? zw(r, 2.8, 3.2) : zw(r, 2.3, 2.8), rand: 1.0, fw, bru: 0.95, fh, rhythmus: r() < 0.2 ? 'gekoppelt' : 'gleich',
    fo: () => ({ faschen, fb: 0.1, kreuz: format === 'quer' ? 'senkrecht' : 'senkrecht', sprossen: format === 'quer' ? [3, 1] : null, sims: RAHMEN, rahmen: rahmenF, rb: 0.08, glas: ctx.glas ?? '#5a6b78' }),
    erker: false, balkone: !!bart && !raster, balkonMuster: wz(r, [['alle', 3], ['mitte', 1], ['rand', 1.2]]), balkonGeschosse: [1, 2, 3, 4, 5, 6, 7], balkonTiefe: 1.15,
    balkon: bart === 'gitter' ? { gitterFarbe: '#3b3f44', abstand: 0.12, platte: '#f4f2ee' } : bart === 'loggia' ? { art: 'loggia' } : { art: 'platte', platte: '#f4f2ee', farbe: bFarbe, handlauf: '#8a8f94' }, loggiaFarbe: bFarbe,
    treppenhaus: r() < 0.55 ? 1 : null, raster50: raster ? '#f4f2ee' : null,
    pilaster: null, baender: null, gesims: 'duenn', laden: 'fuenfziger', ladenTyp: r() < 0.3 ? 'band' : 'einzeln', markisen: 0.3, leucht: 0.35,
    vordach: r() < 0.75 ? waehle(r, ['#e8604c', '#3f4a53', '#2f6f8f', '#f2d16b', '#c9cdd0', '#3f7d56', '#ffffff']) : null,
  };
  if (!c.vordach) c.laden = 'klassisch';
  if (ctx.eck) ctx.eckName = waehle(r, ['Eiscafé Dolce', 'Café Fräulein', 'Kiosk am Eck', 'Reisebüro Sonnenschein']);
  const H = putzbau(ctx, c);
  const dt = ctx.eck ? dachWahl(ctx, r, [['walm', 3], ['flach', 1]]) : dachWahl(ctx, r, [['walm', 3], ['sattel', 2], ['flach', 1.2], ['zelt', 0.5]]);
  const df = dachfarbe(ctx, { ziegel: 2, zink: 1.2, schiefer: 1, braun: 0.8, bitumen: 0.5 });
  return dach(ctx, H, { typ: dt, farbe: dt === 'flach' ? KIES : df, wand, neigung: dt === 'sattel' ? zw(r, 0.35, 0.5) : zw(r, 0.22, 0.32), ueberstand: 0.55, attikaH: 0.4, attika: RAHMEN, gaube: { form: r() < 0.35 ? 'schlepp' : 'keine', wand }, kram: { schornsteine: 1 + (ctx.w > 15 ? 1 : 0), antenne: 0.7, sat: 0.3, kaminFarbe: '#cfc6b8' } });
}

// ======================================================================
// 6. 70er Wohn-/Geschäftshaus
// ======================================================================
function siebziger(ctx) {
  const { S, r, n } = ctx;
  const eg = zw(r, 4.3, 4.7), gh = zw(r, 2.95, 3.15);
  const platte = waehle(r, ['#cfc8ba', '#bfb6a5', '#8b6f55', '#c98b4f', '#e4e1da', '#a39e94', '#d8cdb8', '#7f8a8f', '#b07a52', '#9aa58f', '#c9b28d']);
  const profil = waehle(r, ['#3a3f44', '#6b5a45', '#55504a', '#d8dadc', '#8a5a2f']);
  const glas = waehle(r, ['#4b6272', '#55636f', '#5a7080', '#625a55', '#6b5f48']);
  const beton = '#c9c5bd';
  const jal = waehle(r, ['#e8e2d2', '#c9b28d', '#d9dcdf', '#e07a3f']);
  const variante = wz(r, [['band', 3], ['raster', 1.5], ['kassette', 1.5], ['eternit', 1]]);
  const eternit = '#4f555c';
  const arkade = r() < 0.45;
  const staffel = n >= 5 && r() < 0.35;
  const nVoll = staffel ? n - 1 : n;
  const H = eg + nVoll * gh;
  ctx.H = H; ctx.farbe = platte;
  const insA = ctx.K.map((k) => (sichtbar(ctx, k) ? 1.8 : 0));
  const Peg = arkade ? versetzt(ctx.P, insA) : ctx.P;
  S.add(prismoid(Peg, 0, eg), '#55595e');
  S.add(prismoid(ctx.P, eg, H - eg), dunkler(platte, 0.2));
  if (ctx.eck) ctx.eckName = waehle(r, ['Reisebüro Sonnenschein', 'Imbiss Zur Post', 'Fotostudio Blitz', 'Drogerie Körner']);
  const egF = arkade ? fassadenFuer(ctx, Peg, ctx.K) : ctx.fassaden;
  for (const F of egF) {
    if (F.art === 'neben') { F.box(0, F.L, 0, eg, 0, 0.1, platte); continue; }
    F.box(0, F.L, 0, eg, 0, 0.05, '#4a4f55');
    ladenzone(ctx, F, eg - (arkade ? 0.2 : 0.9), { tb: 0.06, stil: 'neu', typ: r() < 0.4 ? 'band' : 'einzeln', hausTuer: true, markisen: 0, holz: '#4a4f55', portal: '#8a8f94', leucht: 0.45 });
  }
  const baender = (F, y0, k, top) => {
    const [s0, s1] = F.spanne(0.3);
    if (variante === 'kassette' || variante === 'eternit') {
      const ax = F.art === 'ecke' ? Object.assign([F.L / 2], { abstand: F.L }) : achsen(F.L, variante === 'kassette' ? 1.9 : 2.4, 0.6);
      for (let kk = 0; kk < k; kk++) {
        const yF = y0 + kk * gh;
        if (variante === 'eternit') { F.box(s0, s1, yF - 0.02, yF + gh, 0, 0.12, eternit); for (let yy = yF + 0.35; yy < yF + gh; yy += 0.35) F.box(s0, s1, yy - 0.02, yy, 0.12, 0.13, dunkler(eternit, 0.04)); }
        ax.forEach((u) => {
          if (variante === 'kassette') {
            const b2 = ax.abstand / 2 - 0.04;
            F.box(u - b2, u + b2, yF + 0.02, yF + gh - 0.02, 0, 0.5, platte);
            F.box(u - b2 + 0.28, u + b2 - 0.28, yF + 0.75, yF + gh - 0.4, 0.3, 0.52, dunkler(platte, 0.25));
            F.box(u - b2 + 0.32, u + b2 - 0.32, yF + 0.8, yF + gh - 0.45, 0.48, 0.54, glas);
          } else fenster(F, u, yF + 0.9, 1.6, 1.45, { kreuz: 'senkrecht', t: 0.13, rahmen: '#f4f2ee', glas });
        });
      }
      F.box(s0, s1, top - 0.4, top + 0.9, 0, variante === 'kassette' ? 0.55 : 0.3, platte);
      F.box(s0 - 0.02, s1 + 0.02, top + 0.9, top + 1.0, -0.05, 0.6, '#d9dcdf');
      return;
    }
    for (let kk = 0; kk < k; kk++) {
      const yF = y0 + kk * gh;
      const pb = 2.5, np = Math.max(1, Math.round((s1 - s0) / pb)), pw = (s1 - s0) / np;
      for (let i = 0; i < np; i++) F.box(s0 + i * pw + 0.03, s0 + (i + 1) * pw - 0.03, yF - (kk || !arkade ? 0.4 : 0.6), yF + 1.0, 0, 0.3, platte);
      const ya = yF + 1.0, yb = yF + gh - 0.4;
      F.box(s0 + 0.1, s1 - 0.1, ya, yb, -0.02, 0.12, glas);
      const st = variante === 'raster' ? 1.25 : 1.3;
      for (let u = 0.6; u < F.L - 0.3; u += st) {
        if (variante === 'raster') F.box(u - 0.09, u + 0.09, ya, yb, 0, 0.45, platte);
        else F.box(u - 0.04, u + 0.04, ya, yb, 0.1, 0.15, profil);
      }
      F.box(s0 + 0.1, s1 - 0.1, ya - 0.04, ya + 0.04, 0.1, 0.15, profil);
      for (let u = 0.6; u < F.L - 1.3; u += 1.3) if (r() < 0.07) F.box(u + 0.05, u + 1.25, yb - zw(r, 0.5, 1.0), yb, 0.13, 0.16, jal);
    }
    F.box(s0, s1, top - 0.4, top + 0.9, 0, 0.3, platte);
    F.box(s0 - 0.02, s1 + 0.02, top + 0.9, top + 1.0, -0.05, 0.36, '#d9dcdf');
  };
  for (const F of ctx.fassaden) {
    baender(F, eg, nVoll, H);
    if (arkade && F.art !== 'neben') {
      F.box(0, F.L, eg - 0.6, eg + 0.0, 0, 0.3, platte);
      const k = Math.max(1, Math.round(F.L / 5));
      for (let i = 0; i <= k; i++) { const u = clamp((F.L * i) / k, 0.3, F.L - 0.3); if (F.art === 'ecke' && i % k) continue; F.box(u - 0.25, u + 0.25, 0, eg - 0.6, -0.5, 0, beton); }
    }
    if (!arkade && F.art !== 'neben') F.box(F.spanne(0.3)[0], F.spanne(0.3)[1], eg - 0.95, eg - 0.35, 0, 0.6, waehle(r, ['#4a3b33', '#3f4a53', '#7a2f2f', platte]));
    if (F.art !== 'ecke' && !F.extL) F.box(0, 0.45, eg, H + 0.9, 0, 0.34, heller(platte, 0.04));
  }
  let P = ctx.P, y = H + 0.9;
  if (staffel) {
    const P2 = versetzt(P, ctx.K.map((k) => (sichtbar(ctx, k) ? 2.4 : 0)));
    S.add(prismoid(P2, H, gh + 0.4), dunkler(platte, 0.2));
    for (const F of fassadenFuer(ctx, P2, ctx.K)) {
      F.box(0, F.L, H + 0.9, H + gh - 0.1, -0.02, 0.1, glas);
      for (let u = 0.6; u < F.L - 0.3; u += 1.3) F.box(u - 0.04, u + 0.04, H + 0.9, H + gh - 0.1, 0.1, 0.15, profil);
      F.box(-0.02, F.L + 0.02, H + gh - 0.1, H + gh + 0.4, 0, 0.3, platte);
    }
    y = H + gh + 0.4; P = P2; ctx.HWand = y;
  }
  flachdachTechnik(ctx, P, staffel ? y : H, { aufbauFarbe: heller(platte, 0.04), geraete: 2 + Math.floor(r() * 3), antenne: 0.7 });
  // Dachreklame
  if (ctx.cluster === 'metropole' ? r() < 0.4 : r() < 0.12) {
    const F = ctx.fassaden.find((f) => f.art === 'haupt'); if (F) {
      const name = waehle(r, ['Möbel Kunz', 'Elektro Lux', 'Mode Engel', 'Reisen Sonne', 'Sport Wendt']);
      const lf = waehle(r, ['#e8604c', '#ffffff', '#f2d16b', '#2f6f8f']);
      F.box(F.L * 0.2, F.L * 0.2 + 0.08, y, y + 2.2, -1.2, -1.1, '#5f646b'); F.box(F.L * 0.8 - 0.08, F.L * 0.8, y, y + 2.2, -1.2, -1.1, '#5f646b');
      F.text(name, F.L / 2, y + 1.5, 1.1, lf, -1.05, F.L * 0.65);
    }
  }
  return y + 3;
}

// ======================================================================
// 7. Neubau 2000er+
// ======================================================================
function neubau(ctx) {
  const { S, r, n } = ctx;
  const eg = zw(r, 4.5, 4.9), gh = zw(r, 3.15, 3.35);
  const variante = wz(r, [['platten', 3], ['glas', 0.8], ['weiss', 1.6], ['holz', 0.9], ['klinker', ctx.region === 'Nord' ? 1.8 : 0.7]]);
  const palette = {
    platten: waehle(r, [['#4a4f55', '#5a6067'], ['#9aa0a6', '#8b9198'], ['#eceeee', '#dfe2e3'], ['#d8d0c2', '#cbc2b2'], ['#6b6f63', '#7a7e72'], ['#b9a68c', '#a99880']]),
    glas: [waehle(r, ['#e9ebec', '#cfd4d8', '#4a4f55']), '#dfe2e3'], weiss: [waehle(r, ['#f2f2ef', '#ebe8e1', '#e6e8e8']), '#e8e8e4'],
    holz: [waehle(r, ['#b08a62', '#9c7a56', '#c49e74']), '#3b4046'], klinker: [ziegelstein(ctx, { dunkelrot: 2, braun: 2, rot: 1, gelb: 1 }), '#3b4046'],
  }[variante];
  const [pf, pf2] = palette;
  const rahmen = variante === 'platten' && pf === '#4a4f55' ? '#2b2f33' : variante === 'holz' ? '#3b4046' : '#3b4046';
  const glas = waehle(r, ['#6f8a9c', '#647f91', '#7a95a6']);
  const staffel = n >= 3 && r() < 0.75;
  const nVoll = staffel ? n - 1 : n;
  const H = eg + nVoll * gh;
  ctx.H = H; ctx.farbe = pf;
  S.add(prismoid(ctx.P, 0, H), variante === 'glas' ? '#6b8597' : dunkler(pf, 0.06));
  if (ctx.eck) ctx.eckName = waehle(r, ['Optik Lange', 'Hörgeräte Klar', 'Brillen Fuchs', 'Bioladen Grünzeug']);
  const versatzMuster = variante === 'weiss' || r() < 0.4;
  const loggien = variante !== 'glas' && r() < 0.35;
  const geschosse = (F, y0, k) => {
    const [s0, s1] = F.spanne(0.15);
    if (variante === 'glas') {
      F.box(s0 + 0.1, s1 - 0.1, y0, y0 + k * gh, 0, 0.05, glas);
      for (let u = 0.75; u < F.L - 0.3; u += 1.5) F.box(u - 0.035, u + 0.035, y0, y0 + k * gh, 0.05, 0.14, pf2);
      for (let kk = 0; kk <= k; kk++) F.box(s0, s1, y0 + kk * gh - 0.3, y0 + kk * gh + 0.12, 0, 0.18, pf);
      if (F.art !== 'ecke') { F.box(0, 0.5, y0, y0 + k * gh, 0, 0.2, pf); F.box(F.L - 0.5, F.L, y0, y0 + k * gh, 0, 0.2, pf); }
      return;
    }
    const fwBasis = variante === 'weiss' ? null : zw(r, 1.6, 2.3);
    const ax = F.art === 'ecke' ? [F.L / 2] : achsen(F.L, zw(r, 2.6, 3.1), 1.0);
    const logIdx = loggien && ax.length >= 3 ? (r() < 0.5 ? 0 : ax.length - 1) : -1;
    for (let kk = 0; kk < k; kk++) {
      const yF = y0 + kk * gh;
      F.box(s0, s1, yF - 0.2, yF + 0.3, 0, 0.16, pf);
      const fenst = ax.map((u, i) => {
        const fw = F.art === 'ecke' ? Math.min(1.6, F.L - 0.6) : variante === 'weiss' ? waehle(r, [1.0, 1.4, 2.2, 2.6]) : i === logIdx ? 2.4 : fwBasis;
        const du = versatzMuster && F.art !== 'ecke' && i !== logIdx ? (kk % 2 ? 0.45 : -0.45) * (i % 2 ? 1 : -1) : 0;
        return [clamp(u + du, fw / 2 + 0.4, F.L - fw / 2 - 0.4), fw, i === logIdx];
      });
      let last = s0;
      for (const [u, fw] of fenst) { if (u - fw / 2 - 0.12 > last) F.box(last + 0.02, u - fw / 2 - 0.12, yF + 0.3, yF + gh - 0.2, 0, 0.16, kk % 2 && variante === 'platten' ? pf2 : pf); last = u + fw / 2 + 0.12; }
      if (s1 > last) F.box(last + 0.02, s1, yF + 0.3, yF + gh - 0.2, 0, 0.16, kk % 2 && variante === 'platten' ? pf2 : pf);
      for (const [u, fw, log] of fenst) {
        if (log) { F.box(u - fw / 2 - 0.12, u + fw / 2 + 0.12, yF + 0.3, yF + gh - 0.2, -0.02, 0.04, '#4d555c'); F.box(u - fw / 2 + 0.3, u + fw / 2 - 0.3, yF + 0.4, yF + gh - 0.35, 0.0, 0.05, glas); F.box(u - fw / 2 - 0.12, u + fw / 2 + 0.12, yF + 0.3, yF + 1.3, 0.1, 0.16, GLAS_GELAENDER); continue; }
        F.box(u - fw / 2 - 0.12, u + fw / 2 + 0.12, yF + 0.3, yF + gh - 0.2, 0, 0.22, rahmen);
        F.box(u - fw / 2 - 0.05, u + fw / 2 + 0.05, yF + 0.33, yF + gh - 0.25, 0.15, 0.24, glas);
        if (fw > 1.5) F.box(u - 0.03, u + 0.03, yF + 0.33, yF + gh - 0.25, 0.2, 0.26, rahmen);
        if (r() < 0.6) F.box(u - fw / 2, u + fw / 2, yF + 0.33, yF + 1.2, 0.26, 0.3, GLAS_GELAENDER);
        else if (r() < 0.3) F.box(u - fw / 2, u + fw / 2, yF + gh - 0.25 - zw(r, 0.3, 1.2), yF + gh - 0.25, 0.24, 0.27, '#e1e3e4');
      }
      if (variante === 'holz') for (let u = s0 + 0.15; u < s1; u += 0.3) if (!fenst.some(([fu, fw]) => Math.abs(u - fu) < fw / 2 + 0.15)) F.box(u - 0.05, u + 0.05, yF + 0.3, yF + gh - 0.2, 0.16, 0.2, dunkler(pf, 0.06));
    }
  };
  for (const F of ctx.fassaden) {
    const [s0, s1] = F.spanne(0.15);
    if (F.art === 'neben') { F.box(s0, s1, 0, eg, 0, 0.16, pf); achsen(F.L, 3, 1.2).forEach((u) => fenster(F, u, 1.0, 1.6, eg - 2.0, { rahmen, glas, kreuz: false, t: 0.16 })); }
    else {
      F.box(s0, s1, 0, eg, 0, 0.04, '#2b2f33');
      ladenzone(ctx, F, eg + 0.2, { tb: 0.05, stil: 'neu', typ: r() < 0.4 ? 'band' : 'einzeln', markisen: 0, holz: '#3b4046', portal: pf, leucht: 0.2 });
      F.box(s0, s1, eg - 0.3, eg + 0.25, 0, 0.3, pf);
    }
    geschosse(F, eg + 0.25, nVoll);
    F.box(s0, s1, H, H + 0.7, 0, 0.18, pf);
    F.box(s0 - 0.02, s1 + 0.02, H + 0.7, H + 0.78, -0.05, 0.22, '#c9cdd0');
  }
  let P = ctx.P, y = H + 0.05;
  if (staffel) {
    const P2 = versetzt(P, ctx.K.map((k) => (sichtbar(ctx, k) ? 2.4 : 0)));
    S.add(prismoid(P, H, 0.06), '#b9b4aa');
    S.add(prismoid(P2, H, gh), '#6b8597');
    for (const F of fassadenFuer(ctx, P2, ctx.K)) {
      for (let u = 0.6; u < F.L - 0.2; u += 1.5) F.box(u - 0.04, u + 0.04, H, H + gh, 0, 0.1, '#d9dcdf');
      F.box(0, F.L, H + 0.05, H + gh, -0.02, 0.04, glas);
    }
    for (const F of ctx.fassaden) { const [s0, s1] = F.spanne(0.1); F.box(s0, s1, H + 0.7, H + 1.25, -0.1, -0.05, GLAS_GELAENDER); F.box(s0, s1, H + 1.2, H + 1.26, -0.12, -0.03, '#8a8f94'); }
    const P3 = versetzt(P2, ctx.K.map((k) => (sichtbar(ctx, k) ? -0.7 : 0)));
    S.add(prismoid(P3, H + gh, 0.3), pf === '#4a4f55' ? '#4a4f55' : '#f2f2ef');
    y = H + gh + 0.3; P = P2; ctx.HWand = y;
    if (r() < 0.6) { for (let i = 0; i < 2; i++) { const [x, z] = punktIn(versetzt(ctx.P, ctx.K.map((k) => (sichtbar(ctx, k) ? 0.8 : 0))), r); S.box(0.8, 0.6, 0.8, x, H + 0.35, z, '#9c8f7f'); S.add(new THREE.IcosahedronGeometry(0.55, 0).translate(x, H + 1.0, z), FARBEN.baum[0]); } }
  }
  flachdachTechnik(ctx, P, y, { pv: r() < 0.6 ? 3 : 0, gruen: r() < 0.5, aufbauFarbe: pf2, antenne: 0.1 });
  return y + 2.5;
}

// ======================================================================
// 8. Barock (Bürgerhaus, Süddeutschland / Dresden)
// ======================================================================
function barock(ctx) {
  const { r } = ctx;
  const dresden = ctx.region === 'Ost' ? r() < 0.55 : r() < 0.15;
  const wand = dresden ? waehle(r, PUTZ.sandstein) : putz(ctx, { ocker: 2.5, zartgelb: 2, rosa: 2, altrosa: 1.2, hellgruen: 1.6, hellblau: 1.2, lachs: 1, weiss: 0.8 });
  const orn = dresden ? dunkler(wand, 0.06) : waehle(r, [ORN, ORN, '#efe7d6', heller(wand, 0.1)]);
  const gh = zw(r, 3.2, 3.5);
  const strZ = ctx.strasse === '+z';
  const span = strZ ? ctx.w : ctx.d;
  const giebel = !ctx.eck && span <= 15 && r() < 0.45;
  const vorschuss = !giebel && !ctx.eck && r() < (ctx.region === 'Süd' ? 0.45 : 0.15);
  const verd = waehle(r, [['sturz', 'bogen', 'sturz'], ['bogen', 'gerade', 'sturz'], ['gerade', 'sturz', 'sturz'], ['dreieck', 'sturz', 'keine']]);
  const c = {
    eg: zw(r, 3.8, 4.3), gh, wand, orn, sockel: dresden ? dunkler(wand, 0.1) : waehle(r, ['#d8c3a0', dunkler(wand, 0.08), '#cfc0a8']), rustika: r() < 0.6, gurt: true,
    raster: zw(r, 2.5, 3.0), rand: zw(r, 1.0, 1.5), fw: zw(r, 1.0, 1.2), bru: 0.9, fh: gh - 1.55, rhythmus: wz(r, [['risalit', ctx.w >= 14 ? 3 : 0.2], ['gleich', 2]]),
    fhk: (k) => (k === 1 ? gh - 1.4 : gh - 1.6),
    fo: (k) => ({ faschen: orn, fb: 0.17, ohren: true, sims: orn, verd: verd[Math.min(k - 1, 2)], kreuz: true, sprossen: [2, 3], glas: ctx.glas }),
    felder: r() < 0.6 ? orn : null, erker: !giebel && r() < 0.35, erkerTyp: 'polygon', erkerAb: 1, erkerBisOben: false,
    balkone: r() < 0.3, balkon: { platte: orn, ornament: true, gitterFarbe: '#2f3a3a', konsolen: true }, balkonGeschosse: [1],
    pilaster: wz(r, [['achsen', 2], ['ecken', 2]]), baender: 'alle', geschossband: true, gesims: wz(r, [['hohlkehle', 3], ['konsolen', 1]]),
    laden: 'klassisch', ladenTyp: wz(r, [['einzeln', 3], ['arkade', ctx.region === 'Süd' ? 2 : 0.5]]), markisen: 0.5, leucht: 0.05, portal: orn,
  };
  if (ctx.eck) ctx.eckName = waehle(r, ['Apotheke am Markt', 'Konditorei Sahne', 'Goldschmiede Funk']);
  const H = putzbau(ctx, c);
  const dachF = dachfarbe(ctx, { ziegel: 3, braun: 2, schiefer: dresden ? 2 : 0.6, kupfer: 0.2 });
  if (giebel) {
    const G = clamp(span * 0.85, 5, 11);
    const achse = strZ ? 'z' : 'x';
    satteldach(ctx, ctx.x, ctx.z, ctx.x + ctx.w, ctx.z + ctx.d - (strZ ? 0.0 : 0), H + 0.12, G * 0.62, achse, { dach: dachF, wand, ueberstand: 0.35, ortgang: 0.02 });
    const gf = wz(r, [['volute', 2], ['geschweift', 1.5], ['dreieck', 1]]);
    for (const F of ctx.fassaden) if (F.art === 'haupt') {
      if (gf === 'volute') zwerchgiebelVoll(ctx, F, H + 0.12, G, c, r);
      else if (gf === 'geschweift') zwerchgiebel(ctx, F, F.L / 2, F.L - 0.1, H + 0.12, G * 0.95, c, dachF, 'geschwungen');
      else { const sh = new THREE.Shape(); sh.moveTo(-F.L / 2, 0); sh.lineTo(F.L / 2, 0); sh.lineTo(0, G * 0.62); sh.closePath(); F.profil(sh, F.L / 2, H + 0.12, -0.3, 0.12, wand); F.box(0, F.L, H + 0.05, H + 0.3, 0, 0.35, orn); giebelFenster(F, H + 0.12, G * 0.62, { faschen: orn, t: 0.12 }); }
    }
    dachkram(ctx, achse === 'z' ? [[ctx.x + ctx.w / 2, ctx.z + 2], [ctx.x + ctx.w / 2, ctx.z + ctx.d - 3]] : [[ctx.x + 2, ctx.z + ctx.d / 2], [ctx.x + ctx.w - 3, ctx.z + ctx.d / 2]], H + 1, H + G * 0.62, { schornsteine: 2 });
    return H + G;
  }
  if (vorschuss) {
    // Inn-Salzach-Stil: Vorschussmauer verdeckt das Dach
    const hv = zw(r, 2.0, 3.0);
    for (const F of ctx.fassaden) {
      const [s0, s1] = F.spanne(0.1);
      F.box(s0, s1, H, H + hv, -0.5, 0.05, wand);
      F.box(s0 - 0.05, s1 + 0.05, H + hv, H + hv + 0.18, -0.55, 0.15, orn);
      if (r() < 0.6) { const sh = new THREE.Shape(); const b = Math.min(3, F.L * 0.2); sh.moveTo(-b, 0); sh.lineTo(b, 0); sh.quadraticCurveTo(0, 1.4, -b, 0); F.profil(sh, F.L / 2, H + hv + 0.18, -0.5, 0.1, wand); }
      achsen(F.L, 3, 1.5).forEach((u) => fenster(F, u, H + 0.5, 0.7, 0.7, { faschen: orn, kreuz: false, t: 0.05 }));
    }
    ctx.S.add(prismoid(ctx.P, H + 0.1, hv - 0.6, ctx.K.map((k) => (dachKante(ctx, k) ? ctx.d / 4 : 0))), dachF);
    return H + hv + 1;
  }
  const dt = dachWahl(ctx, r, [['mansarde', 3], ['sattel', 2], ['walm', 1.2]]);
  return dach(ctx, H, {
    typ: dt, farbe: dachF, wand, a: 1.3, hu: zw(r, 3.4, 4.2), b: 2.2, ho: 1.1, neigung: zw(r, 0.55, 0.7),
    gaube: { form: wz(r, [['bogen', 2], ['ochsenauge', 2], ['dreieck', 1]]), wand: orn, jedeZweite: r() < 0.5 },
    zwerch: r() < 0.7 ? { form: 'volute', wand, orn, hz: gh * 0.9, fo: c.fo(2) } : null, kram: { schornsteine: 2 },
  });
}
/** Volutengiebel über die ganze Straßenbreite. */
function zwerchgiebelVoll(ctx, F, y, G, c, r) {
  const L = F.L - 0.1, hb = L / 2;
  const form = (sx, sy) => {
    const s = new THREE.Shape();
    s.moveTo(-hb * sx, 0); s.lineTo(-hb * sx, G * 0.1 * sy);
    s.quadraticCurveTo(-hb * 0.62 * sx, G * 0.1 * sy, -hb * 0.62 * sx, G * 0.42 * sy);
    s.lineTo(-hb * 0.62 * sx, G * 0.5 * sy);
    s.quadraticCurveTo(-hb * 0.3 * sx, G * 0.5 * sy, -hb * 0.3 * sx, G * 0.78 * sy);
    s.quadraticCurveTo(0, G * 1.02 * sy, hb * 0.3 * sx, G * 0.78 * sy);
    s.quadraticCurveTo(hb * 0.3 * sx, G * 0.5 * sy, hb * 0.62 * sx, G * 0.5 * sy);
    s.lineTo(hb * 0.62 * sx, G * 0.42 * sy);
    s.quadraticCurveTo(hb * 0.62 * sx, G * 0.1 * sy, hb * sx, G * 0.1 * sy);
    s.lineTo(hb * sx, 0); s.closePath();
    return s;
  };
  F.profil(form(1.03, 1.03), F.L / 2, y, -0.5, 0.08, c.orn, 10);
  F.profil(form(1, 1), F.L / 2, y, -0.45, 0.16, c.wand, 10);
  F.box(F.L / 2 - hb * 0.62 - 0.1, F.L / 2 + hb * 0.62 + 0.1, y + G * 0.46 - 0.08, y + G * 0.46 + 0.08, -0.4, 0.26, c.orn);
  for (const s of [-1, 1]) { fenster(F, F.L / 2 + s * hb * 0.36, y + 0.55, 0.85, Math.min(1.5, G * 0.24), { t: 0.16, faschen: c.orn, ohren: true, verd: 'bogen', verdFarbe: c.orn, kreuz: true }); }
  fenster(F, F.L / 2, y + G * 0.5 + 0.3, 0.75, Math.min(1.1, G * 0.16), { t: 0.16, faschen: c.orn, kreuz: false, verd: 'rund', verdFarbe: c.orn });
  for (const s of [-1, 1]) { const p = F.welt(F.L / 2 + s * hb * 0.92, 0); ctx.S.box(0.32, 0.55, 0.32, p[0], y + G * 0.1 + 0.27, p[1], c.orn); const q = F.welt(F.L / 2 + s * hb * 0.55, 0); ctx.S.box(0.28, 0.5, 0.28, q[0], y + G * 0.5 + 0.25, q[1], c.orn); }
  const g = new THREE.SphereGeometry(0.28, 8, 6); const p = F.welt(F.L / 2, 0); g.translate(p[0], y + G * 1.0 + 0.3, p[1]); ctx.S.add(g, c.orn);
}

// ======================================================================
// 9. DDR-Plattenbau (WBS 70)
// ======================================================================
function ddr_platte(ctx) {
  const { S, r, n } = ctx;
  const saniert = r() < 0.6;
  const platte = saniert ? putz(ctx, { weiss: 3, zartgelb: 1.5, hellblau: 1, sand: 1.5, hellgruen: 0.8, rosa: 0.8, grau: 1 }) : waehle(r, ['#cfc8ba', '#bdb7aa', '#c6c2b8', '#b8b3a8']);
  const akzent = saniert ? waehle(r, ['#e07a3f', '#3f7d9a', '#7fae5a', '#c9483e', '#f2c14e', '#6b4f8f', '#2f6f8f']) : waehle(r, ['#c98b4f', '#8b6f55', '#a39e94']);
  const fuge = dunkler(platte, 0.12);
  const gh = 2.8, eg = 2.8;
  const strZ = ctx.strasse === '+z';
  const tiefe = strZ ? ctx.d : ctx.w;
  const pavillon = !ctx.eck && tiefe >= 13 && r() < 0.35;
  const ladenEG = !pavillon && r() < 0.45;
  const raster = waehle(r, [2.4, 3.0, 3.0, 3.6]), loggiaTakt = waehle(r, [0, 3, 4, 2]);
  const egH = ladenEG ? 3.6 : eg;
  const H = egH + n * gh;
  ctx.H = H; ctx.farbe = platte;
  let P = ctx.P;
  if (pavillon) {
    // Pavillon an der Straße, Scheibe dahinter
    const pt = 5.5;
    const Ppav = strZ ? rechteck(ctx.x, ctx.z + ctx.d - pt, ctx.x + ctx.w, ctx.z + ctx.d) : rechteck(ctx.x + ctx.w - pt, ctx.z, ctx.x + ctx.w, ctx.z + ctx.d);
    P = versetzt(P, ctx.K.map((k) => (k === ctx.strasse ? pt : 0)));
    S.add(prismoid(Ppav, 0, 3.8), '#e9e6de');
    const Fp = fassadenFuer(ctx, Ppav, ['+z', '+x', '-z', '-x']);
    for (const F of Fp) {
      F.box(0, F.L, 3.0, 3.8, 0, 0.35, akzent);
      F.box(-0.02, F.L + 0.02, 3.8, 3.95, -0.05, 0.45, '#e9e6de');
      if (F.art === 'haupt') {
        ladenzone(ctx, F, 3.0 + 0.45, { tb: 0.05, stil: 'neu', typ: 'band', hausTuer: false, markisen: 0, schild: false });
        F.text(waehle(r, ['Kaufhalle', 'Gaststätte Freundschaft', 'Blumen Ilse', 'Friseur Chic', 'Kaufhalle am Ring']), F.L / 2, 3.4, 0.55, '#ffffff', 0.37, F.L * 0.8);
      } else achsen(F.L, 2.4, 0.8).forEach((u) => F.box(u - 0.9, u + 0.9, 0.6, 2.7, 0, 0.06, GLAS_LADEN));
    }
    flachdachTechnik(ctx, Ppav, 3.95, { aufzug: false, geraete: 2, antenne: 0 });
  }
  S.add(prismoid(P, 0, H), fuge);
  const frames = fassadenFuer(ctx, P, ctx.K);
  for (const F of frames) {
    const [s0, s1] = F.spanne(0.1);
    if (F.art === 'neben') {
      // Giebelwand ohne Fenster mit Giebelgestaltung
      for (let k = 0; k < n + 1; k++) F.box(s0, s1, (k ? egH + (k - 1) * gh : 0) + 0.03, (k ? egH + k * gh : egH) - 0.03, 0, 0.18, platte);
      const muster = r();
      if (muster < 0.5) for (let i = 0; i < 4; i++) F.box(F.L * 0.15 + i * F.L * 0.18, F.L * 0.15 + i * F.L * 0.18 + F.L * 0.1, egH + 0.5 + i * 1.2, H - 0.8, 0.18, 0.21, i % 2 ? akzent : heller(akzent, 0.15));
      else for (let i = 0; i < 3; i++) F.box(F.L * 0.1, F.L * 0.9, egH + (n * gh) * (0.2 + i * 0.25), egH + (n * gh) * (0.2 + i * 0.25) + 0.8, 0.18, 0.21, i === 1 ? akzent : heller(akzent, 0.12));
      continue;
    }
    const ax = achsen(F.L, raster, 0.15);
    const lg = new Set();
    if (F.art === 'haupt' && ax.length >= 3 && loggiaTakt) { for (let i = 1; i < ax.length; i += loggiaTakt) lg.add(i); }
    const tr = ax.length >= 4 ? Math.floor(ax.length / 2) - (lg.has(Math.floor(ax.length / 2)) ? 1 : 0) : -1;
    // Erdgeschoss
    if (ladenEG && F.art !== 'neben') {
      F.box(s0, s1, egH - 0.7, egH, 0, 0.35, akzent);
      ladenzone(ctx, F, egH - 0.6, { tb: 0.05, stil: 'neu', typ: 'band', markisen: 0, leucht: 0.3 });
    } else {
      F.box(s0, s1, 0, egH - 0.03, 0, 0.18, dunkler(platte, 0.05));
      ax.forEach((u, i) => {
        if (i === tr) { F.box(u - 0.9, u + 0.9, 0, 2.4, 0.18, 0.24, '#5a6570'); F.box(u - 1.2, u + 1.2, 2.5, 2.65, 0, 1.4, '#e9e6de'); }
        else fenster(F, u, 0.9, 1.5, 1.4, { kreuz: 'senkrecht', t: 0.18, rahmen: RAHMEN });
      });
    }
    for (let k = 1; k <= n; k++) {
      const yF = egH + (k - 1) * gh;
      ax.forEach((u, i) => {
        const a = u - ax.abstand / 2 + 0.03, b = u + ax.abstand / 2 - 0.03;
        if (lg.has(i)) {
          F.box(a, b, yF + 0.03, yF + gh - 0.03, -0.02, 0.05, '#4d555c');
          F.box(a + 0.3, b - 0.3, yF + 0.15, yF + gh - 0.35, 0.0, 0.06, FARBEN.fensterHell);
          F.box(a, b, yF + 0.05, yF + 1.0, 0, 0.22, saniert ? akzent : waehle(r, ['#d8cdb8', '#c98b4f', '#a39e94']));
          F.box(a - 0.03, a + 0.12, yF, yF + gh, 0, 0.26, platte); F.box(b - 0.12, b + 0.03, yF, yF + gh, 0, 0.26, platte);
          F.box(a, b, yF + gh - 0.18, yF + gh, 0, 0.26, platte);
          return;
        }
        F.box(a, b, yF + 0.03, yF + gh - 0.03, 0, 0.18, platte);
        if (i === tr) { fenster(F, u, yF + 1.4, 0.9, 0.9, { kreuz: false, t: 0.18, glas: FARBEN.fensterHell }); return; }
        const doppelt = ax.abstand > 2.8 && (i + k) % 3 !== 0;
        fenster(F, u, yF + 0.85, doppelt ? 1.8 : 1.4, 1.45, { kreuz: 'senkrecht', t: 0.18, rahmen: saniert ? RAHMEN : '#d9d6cf', reflex: true });
      });
      if (saniert && F.art === 'haupt' && ax.length >= 5) { const i = Math.floor(ax.length * 0.75); const u = ax[i]; if (!lg.has(i)) F.box(u - ax.abstand / 2 + 0.03, u + ax.abstand / 2 - 0.03, yF + 0.03, yF + 0.75, 0.18, 0.2, akzent); }
    }
    F.box(s0, s1, H, H + 0.6, 0, 0.2, platte);
    F.box(s0 - 0.02, s1 + 0.02, H + 0.6, H + 0.7, -0.05, 0.25, '#d9dcdf');
  }
  flachdachTechnik(ctx, P, H, { aufbauFarbe: platte, geraete: 1, antenne: 0.8, belag: '#a9a59c' });
  return H + 3;
}

// ======================================================================
// 10. Bauhaus / Klassische Moderne
// ======================================================================
function bauhaus(ctx) {
  const { S, r, n } = ctx;
  const wand = r() < 0.65 ? waehle(r, ['#f4f3ef', '#efeee9', '#e9e8e3', '#f1ede4', '#e6e6e2']) : waehle(r, ['#f1e7c9', '#dfe6ea', '#efe1dc', '#e3e9dc', '#ece3d3']);
  const akzent = waehle(r, ['#2f5f9f', '#c0392b', '#e0b22f', '#3b4046', '#2f6f5a']);
  const eg = zw(r, 3.6, 4.0), gh = zw(r, 2.9, 3.1);
  const H = eg + n * gh;
  ctx.H = H; ctx.farbe = wand;
  S.add(prismoid(ctx.P, 0, H), wand);
  const variante = wz(r, [['band', 3], ['loch', 1.5]]);
  const sockelB = waehle(r, ['#5a5c5f', akzent, '#8a8478', '#3b4046']);
  const turmVor = r() < 0.5, turmFarbe = r() < 0.5 ? wand : waehle(r, [akzent, '#d9d6cf', '#b9654e']);
  const sprosse = waehle(r, ['#2b2f33', '#2b2f33', '#f4f3ef', '#7a2f2f', '#2f4f6f']);
  const treppe = r() < 0.6;
  for (const F of ctx.fassaden) {
    const [s0, s1] = F.spanne(0.12);
    F.box(s0, s1, 0, 0.6, 0, 0.1, sockelB);
    if (F.art === 'neben') achsen(F.L, 3, 1.2).forEach((u) => F.box(u - 0.9, u + 0.9, 1.4, eg - 0.9, -0.02, 0.05, FARBEN.fenster));
    else ladenzone(ctx, F, eg - 0.2, { tb: 0.06, stil: 'neu', typ: r() < 0.6 ? 'band' : 'einzeln', markisen: 0.25, holz: akzent, leucht: 0.15 });
    const trU = treppe && F.art === 'haupt' && F.L > 10 ? (r() < 0.5 ? 1.6 : F.L - 1.6) : null;
    for (let k = 1; k <= n; k++) {
      const yF = eg + (k - 1) * gh;
      if (variante === 'band' || F.art === 'ecke') {
        const a = (F.extL ? -0.12 : 0.6), b = F.L - (F.extR ? -0.12 : 0.6);
        const ua = trU != null && trU < F.L / 2 ? trU + 1.0 : a, ub = trU != null && trU > F.L / 2 ? trU - 1.0 : b;
        F.box(ua, ub, yF + 0.95, yF + 2.25, -0.02, 0.05, FARBEN.fenster);
        for (let u = ua + 0.05; u <= ub; u += 1.05) F.box(u - 0.025, u + 0.025, yF + 0.95, yF + 2.25, 0, 0.07, sprosse);
        F.box(ua, ub, yF + 1.75, yF + 1.79, 0, 0.07, sprosse);
        F.box(ua, ub, yF + 0.88, yF + 0.95, 0, 0.12, '#d9d8d2');
      } else {
        achsen(F.L, 2.6, 1.0).forEach((u) => { if (trU != null && Math.abs(u - trU) < 1.4) return; F.box(u - 0.8, u + 0.8, yF + 0.95, yF + 2.2, -0.02, 0.05, FARBEN.fenster); F.box(u - 0.02, u + 0.02, yF + 0.95, yF + 2.2, 0, 0.07, sprosse); F.box(u - 0.8, u + 0.8, yF + 1.7, yF + 1.74, 0, 0.07, sprosse); });
      }
    }
    if (trU != null) {
      if (turmVor) F.box(trU - 1.1, trU + 1.1, 0, H + 1.2, 0, 0.9, turmFarbe);
      const tv = turmVor ? 0.9 : 0;
      F.box(trU - 0.65, trU + 0.65, eg + 0.3, H - 0.5, tv - 0.02, tv + 0.06, FARBEN.fensterHell);
      for (let y = eg + 0.3; y < H - 0.5; y += 0.6) F.box(trU - 0.65, trU + 0.65, y - 0.02, y + 0.02, tv, tv + 0.08, sprosse);
    }
    // Balkone mit Rohrgeländer an der Ecke
    if (F.art === 'haupt' && r() < 0.6) {
      const ua = F.extR ? F.L - 3.2 : F.L - 3.4, ub = F.extR ? F.L + 0.0 : F.L - 0.6;
      for (let k = 1; k <= n; k++) {
        const yF = eg + (k - 1) * gh;
        F.box(ua, ub, yF - 0.12, yF + 0.05, 0, 1.3, '#f6f5f1');
        F.box(ua, ub, yF + 0.95, yF + 1.0, 1.24, 1.3, akzent === '#3b4046' ? '#3b4046' : '#4a4f55');
        F.box(ua, ub, yF + 0.55, yF + 0.59, 1.25, 1.29, '#4a4f55');
      }
    }
    F.box(s0, s1, H - 0.05, H + 0.25, 0, 0.12, wand);
  }
  // auskragende Dachplatte, ggf. Staffelgeschoss mit Dachterrasse
  const Pov = versetzt(ctx.P, ctx.K.map((k) => (sichtbar(ctx, k) ? -0.5 : 0)));
  S.add(prismoid(Pov, H + 0.25, 0.22), '#f6f5f1');
  if (r() < 0.3) {
    const P2 = versetzt(ctx.P, ctx.K.map((k) => (sichtbar(ctx, k) ? zw(r, 2.5, 4) : 0)));
    S.add(prismoid(P2, H + 0.47, gh), wand);
    for (const F of fassadenFuer(ctx, P2, ctx.K)) { F.box(0.4, F.L * 0.7, H + 1.3, H + gh - 0.2, -0.02, 0.05, FARBEN.fenster); for (let u = 0.45; u < F.L * 0.7; u += 1.05) F.box(u - 0.025, u + 0.025, H + 1.3, H + gh - 0.2, 0, 0.07, sprosse); }
    S.add(prismoid(versetzt(P2, ctx.K.map((k) => (sichtbar(ctx, k) ? -0.6 : 0))), H + 0.47 + gh, 0.2), '#f6f5f1');
    for (const F of ctx.fassaden) { const [s0, s1] = F.spanne(0.1); F.box(s0, s1, H + 1.4, H + 1.45, -0.1, -0.05, '#4a4f55'); F.box(s0, s1, H + 0.95, H + 0.99, -0.1, -0.05, '#4a4f55'); }
    flachdachTechnik(ctx, P2, H + 0.67 + gh, { geraete: 1, antenne: 0.3, aufzug: false });
    return H + gh + 2;
  }
  flachdachTechnik(ctx, ctx.P, H + 0.47, { geraete: 1, antenne: 0.3, aufbauFarbe: wand });
  if (r() < 0.5) { const F = ctx.fassaden.find((f) => f.art === 'haupt'); if (F) F.box(F.L * 0.3, F.L * 0.3 + 3.5, H + 0.47, H + 2.9, -4, -1.2, wand); }
  return H + 3;
}

// ======================================================================
// 11. Wiederaufbau (schlichte 50er-Zeile, Satteldach)
// ======================================================================
function wiederaufbau(ctx) {
  const { r } = ctx;
  const wand = putz(ctx, { sand: 2, zartgelb: 1.5, ocker: 1.2, grau: 1.6, weiss: 1.5, rosa: 1, hellgruen: 0.8, hellblau: 0.6, taupe: 1, altrosa: 0.6 });
  const gh = zw(r, 2.85, 3.05);
  const faschenF = wz(r, [[null, 2], [heller(wand, 0.07), 2], [RAHMEN, 1], [dunkler(wand, 0.07), 1]]);
  const c = {
    eg: zw(r, 3.6, 4.1), gh, wand, orn: wz(r, [[heller(wand, 0.06), 2], [RAHMEN, 1]]), sockel: waehle(r, [dunkler(wand, 0.06), '#b9b4aa', '#9a9690']), rustika: false, gurt: r() < 0.4,
    raster: zw(r, 2.2, 2.8), rand: zw(r, 0.9, 1.4), fw: zw(r, 1.0, 1.25), bru: 0.95, fh: zw(r, 1.35, 1.55), rhythmus: r() < 0.15 ? 'gekoppelt' : 'gleich',
    fo: () => ({ faschen: faschenF, fb: 0.12, kreuz: wz(r, [['senkrecht', 3], [true, 1]]), sims: r() < 0.5 ? '#d9d6cf' : null, rahmen: RAHMEN, rb: 0.07, glas: ctx.glas }),
    erker: false, balkone: r() < 0.2, balkon: { gitterFarbe: '#3b3f44', abstand: 0.14, platte: '#e9e6de' }, balkonMuster: 'mitte', balkonGeschosse: [1, 2],
    treppenhaus: r() < 0.3 ? 1 : null, pilaster: null, baender: null, gesims: r() < 0.5 ? 'duenn' : 'hohlkehle',
    laden: r() < 0.3 ? 'fuenfziger' : 'klassisch', ladenTyp: 'einzeln', markisen: 0.45, leucht: 0.2, vordach: null,
  };
  if (c.laden === 'fuenfziger') c.vordach = waehle(r, ['#c9cdd0', '#3f4a53', '#e8604c', '#f4f2ee']);
  if (ctx.eck) ctx.eckName = waehle(r, ['Bäckerei Jansen', 'Kiosk am Eck', 'Metzgerei Heller']);
  const H = putzbau(ctx, c);
  const df = dachfarbe(ctx, { ziegel: 3, braun: 2, schiefer: 1.2, engobe: 1, bitumen: 0.4 });
  return dach(ctx, H, {
    typ: ctx.eck ? 'walm' : wz(r, [['sattel', 4], ['walm', 2], ['zelt', 0.5]]), farbe: df, wand, neigung: zw(r, 0.45, 0.62), ueberstand: 0.4,
    gaube: { form: wz(r, [['schlepp', 2], ['dreieck', 1.5], ['keine', 2]]), wand, jedeZweite: true },
    kram: { schornsteine: 1 + (r() < 0.6 ? 1 : 0), antenne: 0.7, sat: 0.4, kaminFarbe: waehle(r, ['#a8664f', '#cfc6b8']) },
  });
}

// ======================================================================
// Hauptfunktionen
// ======================================================================
const BAU = { gruenderzeit, jugendstil, backstein, fachwerk, fuenfziger, siebziger, neubau, barock, ddr_platte, bauhaus, wiederaufbau };
STILE.push('barock', 'ddr_platte', 'bauhaus', 'wiederaufbau');
const ECK = {
  gruenderzeit: (r) => ({ form: r() < 0.55 ? 'schraeg' : r() < 0.6 ? 'rund' : 'gerade', turm: r() < 0.65 }),
  jugendstil: () => ({ form: 'gerade', turm: true }),
  backstein: (r) => ({ form: r() < 0.6 ? 'rund' : 'schraeg', turm: false }),
  fachwerk: () => ({ form: 'gerade', turm: false }),
  fuenfziger: (r) => ({ form: r() < 0.7 ? 'rund' : 'gerade', turm: false }),
  siebziger: (r) => ({ form: r() < 0.5 ? 'schraeg' : 'gerade', turm: false }),
  neubau: (r) => ({ form: r() < 0.3 ? 'schraeg' : 'gerade', turm: false }),
  barock: () => ({ form: 'gerade', turm: false }),
  ddr_platte: () => ({ form: 'gerade', turm: false }),
  bauhaus: (r) => ({ form: r() < 0.55 ? 'rund' : 'gerade', turm: false }),
  wiederaufbau: () => ({ form: 'gerade', turm: false }),
};

/**
 * Brandwand an der zweiten sichtbaren Seite eines angebauten Hauses (seite 'nachbar'): Ist der Nachbar niedriger, liegt
 * die Wand über ihm frei. Sie bekommt dann Putz in einer hellen Mischung aus Fassadenfarbe und Kalkputz statt des
 * dunklen Rohbaukörpers (GESTALTUNG.md 6: keine schwarzen oder kistigen Seitenwände).
 */
function brandwand(ctx) {
  const { S, x, z, w, d } = ctx;
  const H = ctx.HWand ?? ctx.H;
  if (!H) return;
  const c = new THREE.Color(ctx.farbe ?? '#d8d0c2').lerp(new THREE.Color('#ddd6c9'), 0.55);
  const f = '#' + c.getHexString();
  if (ctx.strasse === '+z') S.quader(x + w - 0.02, 0.3, z + 0.02, x + w + 0.04, H, z + d - 0.02, f);
  else S.quader(x + 0.02, 0.3, z + d - 0.02, x + w - 0.02, H, z + d + 0.04, f);
}

/**
 * Ein Stadthaus auf [x, x+w] × [z, z+d].
 * stil: siehe STILE. geschosse: Obergeschosse (2–7), Erdgeschoss kommt dazu.
 * eck: false | true | { form: 'gerade'|'schraeg'|'rund', turm } · strasse: '+z' | '+x' · seite: 'frei' | 'nachbar'
 * region: 'Nord'|'Ost'|'West'|'Mitte'|'Süd' (färbt Paletten) · cluster · vermeideFarbe: Fassadenfarbe des Nachbarn
 * Rückgabe { hoehe, stil, geschosse, teile, farbe }.
 */
export function stadthaus(S, scene, p = {}) {
  const stil = BAU[p.stil] ? p.stil : 'gruenderzeit';
  const x = p.x ?? 0, z = p.z ?? 0, w = p.w ?? 16, d = p.d ?? 13;
  const n = clamp(Math.round(p.geschosse ?? 4), 1, 8);
  const seed = p.seed ?? 1;
  const sz = typeof seed === 'string' ? [...seed].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) : seed;
  const r = rng(mischHash(sz, STILE.indexOf(stil)));
  for (let i = 0; i < 3; i++) r();
  let eck = !!p.eck, form = 'gerade', turm = false;
  if (eck) { const def = ECK[stil](r); form = p.eck.form ?? def.form; turm = p.eck.turm ?? def.turm; }
  const cEck = clamp(Math.min(w, d) * 0.24, 2.4, 4.4);
  const { P, K } = grundriss(x, z, w, d, eck ? form : 'gerade', cEck);
  const ctx = { S, scene, r, x, z, w, d, n, stil, eck, form, turm, cEck, P, K, strasse: p.strasse === '+x' ? '+x' : '+z', seite: p.seite ?? 'frei', region: p.region ?? 'Mitte', cluster: p.cluster ?? 'grossstadt', vermeide: p.vermeideFarbe ?? null, dachWunsch: p.dachWunsch ?? null, dachRegime: p.dachRegime ?? null };
  ctx.glas = waehle(r, [FARBEN.fenster, FARBEN.fenster, '#5a6b78', '#4f5f6c', '#5d6a72']);
  ctx.namen = mischen(LADENNAMEN, r);
  ctx.fassaden = fassadenFuer(ctx, P, K);
  const vorher = S.anzahl;
  const hoehe = BAU[stil](ctx);
  if (ctx.seite === 'nachbar' && !eck) brandwand(ctx);
  return { hoehe, stil, geschosse: n, teile: S.anzahl - vorher, farbe: ctx.farbe ?? null, dach: ctx.dachGewaehlt ?? null };
}

const PROFIL = {
  Nord: { backstein: 3.2, gruenderzeit: 2, fuenfziger: 2, wiederaufbau: 1.6, siebziger: 1.2, neubau: 1.6, jugendstil: 0.7, bauhaus: 0.9, fachwerk: 0.4, barock: 0.1, ddr_platte: 0.05 },
  Ost: { gruenderzeit: 3.2, ddr_platte: 2.6, jugendstil: 1.6, wiederaufbau: 1, neubau: 1.2, barock: 0.7, fuenfziger: 0.6, backstein: 0.5, bauhaus: 0.5, siebziger: 0.3, fachwerk: 0.4 },
  West: { fuenfziger: 3, siebziger: 2.3, wiederaufbau: 2.2, neubau: 1.6, gruenderzeit: 1.5, backstein: 0.6, jugendstil: 0.5, bauhaus: 0.5, fachwerk: 0.4, barock: 0.15, ddr_platte: 0 },
  Mitte: { gruenderzeit: 2.1, fuenfziger: 2, wiederaufbau: 1.7, fachwerk: 1.3, siebziger: 1.2, neubau: 1.3, jugendstil: 0.9, barock: 0.5, backstein: 0.5, bauhaus: 0.4, ddr_platte: 0.1 },
  Süd: { gruenderzeit: 2.6, barock: 1.7, jugendstil: 1.6, fuenfziger: 1.6, wiederaufbau: 1.3, neubau: 1.3, siebziger: 0.9, fachwerk: 0.6, bauhaus: 0.3, backstein: 0.1, ddr_platte: 0 },
};
const CLUSTER = {
  metropole: { neubau: 1.9, siebziger: 1.3, bauhaus: 1.3, fachwerk: 0.25, wiederaufbau: 0.7, barock: 0.8 },
  grossstadt: {},
  mittelstadt: { fachwerk: 2.6, wiederaufbau: 1.7, barock: 1.3, neubau: 0.6, siebziger: 0.7, ddr_platte: 0.7, bauhaus: 0.5, backstein: 0.8 },
};
const GESCHOSSE = {
  gruenderzeit: [3, 5], jugendstil: [3, 5], backstein: [4, 7], fachwerk: [2, 4], fuenfziger: [3, 6], siebziger: [4, 7], neubau: [4, 7],
  barock: [2, 4], ddr_platte: [4, 7], bauhaus: [3, 5], wiederaufbau: [2, 4],
};
/** Gewichte je Stil (Summe 1) für eine Region und Stadtgröße. */
export function stilProfil(region = 'Mitte', cluster = 'grossstadt') {
  const basis = PROFIL[region] ?? PROFIL.Mitte, mod = CLUSTER[cluster] ?? {};
  const out = {}; let s = 0;
  for (const st of STILE) { out[st] = (basis[st] ?? 0) * (mod[st] ?? 1); s += out[st]; }
  for (const st of STILE) out[st] = out[st] / s;
  return out;
}
/**
 * Stil und Geschosse nach Region und Stadtgröße.
 * nachbar = { stil, farbe, geschosse } des linken Nachbarn: gleicher Stil wird selten, gleiche Farbe vermieden.
 */
export function zufallsStadthaus(S, scene, p = {}) {
  const r = rng(mischHash(typeof p.seed === 'number' ? p.seed : 1, 4711));
  const prof = stilProfil(p.region ?? 'Mitte', p.cluster ?? 'grossstadt');
  const liste = Object.entries(prof).map(([st, g]) => {
    let w = g;
    if (p.nachbar?.stil === st) w *= 0.2;
    if (st === 'fachwerk' && (p.w ?? 16) > 18) w *= 0.3;
    if (st === 'ddr_platte' && (p.w ?? 16) < 14) w *= 0.3;
    if (st === 'barock' && (p.w ?? 16) > 22) w *= 0.4;
    return [st, w];
  });
  const stil0 = wz(r, liste);
  const stil = p.stilWunsch && GESCHOSSE[p.stilWunsch] && BAU[p.stilWunsch] ? p.stilWunsch : stil0;   // bauer.js: ein Bautyp je Blockseite
  let [a, b] = GESCHOSSE[stil];
  if (p.cluster === 'metropole') { a += 1; b += 1; } else if (p.cluster === 'mittelstadt') { b -= 1; }
  let g = Math.round(a + (b - a) * (r() * 0.6 + r() * 0.4));
  if (p.nachbar?.geschosse && r() < 0.35) g = p.nachbar.geschosse + waehle(r, [-2, -1, 1, 2]);
  g = clamp(g, Math.max(2, a - 1), Math.min(7, b));
  if (p.harmonisiere) g = p.harmonisiere(g);   // bauer.js: Traufhöhe des Blocks (GESTALTUNG.md)
  return stadthaus(S, scene, { ...p, stil, geschosse: clamp(g, 2, 7), vermeideFarbe: p.nachbar?.farbe ?? p.vermeideFarbe });
}

/** Häuserzeile entlang +z-Straße: Parzellen nach `breiten`, innen Brandwände, rechts frei oder Eckhaus. */
export function haeuserzeile(S, scene, p = {}) {
  const r = rng(mischHash(typeof p.seed === 'number' ? p.seed : 1, 815));
  const x0 = p.x ?? 0, z = p.z ?? 0, d = p.d ?? 13, laenge = p.laenge ?? 70;
  const [bmin, bmax] = p.breiten ?? [9, 20];
  const parz = [];
  if (p.anzahl) {
    const g = Array.from({ length: p.anzahl }, () => zw(r, 0.65, 1.45)), sg = g.reduce((u, v) => u + v, 0);
    let rest = laenge;
    g.forEach((v, i) => { const w = i === p.anzahl - 1 ? rest : Math.max(8, Math.round((v / sg) * laenge)); parz.push(w); rest -= w; });
    if (parz[parz.length - 1] < 8) { const fehl = 8 - parz[parz.length - 1]; parz[parz.length - 1] = 8; const i = parz.indexOf(Math.max(...parz)); parz[i] -= fehl; }
  }
  else {
    let rest = laenge;
    while (rest > 0) { let w = Math.round(zw(r, bmin, bmax)); if (rest - w < bmin) w = rest; if (w > 30) w = rest / 2; parz.push(w); rest -= w; }
  }
  let x = x0, hoehe = 0, teile = 0, nachbar = null;
  const haeuser = [];
  parz.forEach((w, i) => {
    const letzte = i === parz.length - 1;
    const q = { x, z, w, d: d + (r() < 0.3 ? -1 : 0), seed: (p.seed ?? 1) * 100 + i, seite: letzte ? 'frei' : 'nachbar', eck: letzte && p.eckRechts ? true : false, region: p.region, cluster: p.cluster };
    const h = p.stile
      ? stadthaus(S, scene, { ...q, stil: p.stile[i % p.stile.length], geschosse: p.geschosse?.[i % p.geschosse.length] ?? 4, vermeideFarbe: nachbar?.farbe })
      : zufallsStadthaus(S, scene, { ...q, nachbar });
    nachbar = { stil: h.stil, farbe: h.farbe, geschosse: h.geschosse };
    haeuser.push(h); hoehe = Math.max(hoehe, h.hoehe); teile += h.teile; x += w;
  });
  return { hoehe, teile, haeuser };
}

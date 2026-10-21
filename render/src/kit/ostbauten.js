// Ostbauten: DDR- und Ostblock-Architektur als Slot-Generatoren.
// Alle Slots: (S, scene, p) mit p = { x, z, w, d, seed, variante?, region?, zustand?, name? } -> { hoehe }
// Sichtbar: +z (links im Bild) und +x (rechts im Bild) plus Dach. Typische Vertreter, keine Kopien realer Einzelbauten.
//
// Rahmen-Konzept: Eine Fassade ist ein Rahmen F mit Ursprung (ox, oz), Laufrichtung (dx, dz), Normale (nx, nz) und Länge L.
// Koordinaten auf dem Rahmen: u entlang der Fassade, y Höhe, t nach außen (t < 0 = im Gebäude).
// +z-Seite eines Rechtecks: RZ(), +x-Seite: RX(). Gedrehte Rahmen erlauben abgewinkelte und gekrümmte Zeilen.
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { THREE, Sammler, rng, waehle, zw, FARBEN, heller, dunkler, baum, textTextur, textMaterial, dachProfil, walmdach } from './basis.js';
import { skaliert } from './sonderbauten.js';

const PI = Math.PI;

// =====================================================================================
// Rahmen und Grundformen
// =====================================================================================
function R(ox, oz, dx, dz, L) { return { ox, oz, dx, dz, nx: -dz, nz: dx, ry: Math.atan2(-dz, dx), L }; }
const RZ = (x0, z0, w, d) => R(x0, z0 + d, 1, 0, w);
const RX = (x0, z0, w, d) => R(x0 + w, z0 + d, 0, -1, d);
function wp(F, u, t) { return [F.ox + F.dx * u + F.nx * t, F.oz + F.dz * u + F.nz * t]; }
/** Quader im Rahmen: u0..u1, y0..y1, t0..t1. */
function fb(S, F, u0, u1, y0, y1, t0, t1, c) {
  const [x, z] = wp(F, (u0 + u1) / 2, (t0 + t1) / 2);
  S.box(Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(t1 - t0), x, (y0 + y1) / 2, z, c, F.ry);
}
/** Geometrie in Rahmenkoordinaten (x = u, y, z = t) in die Welt setzen. */
function fgeo(S, F, g, c) { g.rotateY(F.ry); g.translate(F.ox, 0, F.oz); S.add(g, c); }
/** Stirnseite am Ende u = L (Normale = Laufrichtung), läuft von vorn nach hinten. */
function endeRechts(F, T) { const [x, z] = wp(F, F.L, 0); return R(x, z, -F.nx, -F.nz, T); }
/** Stirnseite am Anfang u = 0 (Normale = -Laufrichtung), läuft von hinten nach vorn. */
function endeLinks(F, T) { const [x, z] = wp(F, 0, -T); return R(x, z, F.nx, F.nz, T); }
/** Teilrahmen: Stück u0..u1 eines Rahmens, um t versetzt. */
function teil(F, u0, u1, t = 0) { const [x, z] = wp(F, u0, t); return R(x, z, F.dx, F.dz, u1 - u0); }
/** Rückseite eines Frontrahmens bei Tiefe T (läuft entgegengesetzt, Normale nach hinten). */
function rueckseite(F, T) { const [x, z] = wp(F, F.L, -T); return R(x, z, -F.dx, -F.dz, F.L); }

// =====================================================================================
// Ausrichtung: Bauten in alle vier Richtungen
// =====================================================================================
// Jeder Generator baut im lokalen Rahmen mit Front nach +z. p.front ('+z' | '+x' | '-x' | '-z', oder Liste mit
// genau einem Eintrag, wie sie der Stadtplan setzt) bzw. p.drehung (0 … 3 Vierteldrehungen) dreht den fertigen Bau.
// Der Generator bekommt p.sichtbar: die lokalen Seiten, die nach dem Drehen zur Kamera (+x, +z) zeigen, und
// detailliert genau diese (Front, Hofseite mit Loggien und Eingängen, Giebel links oder rechts).
const DREHUNG = { '+z': 0, '+x': PI / 2, '-z': PI, '-x': -PI / 2 };
const SICHTBAR = { '+z': ['+z', '+x'], '+x': ['+z', '-x'], '-z': ['-z', '-x'], '-x': ['+x', '-z'] };
export function ausrichtungVon(p) {
  if (p.drehung !== undefined) return ['+z', '+x', '-z', '-x'][((p.drehung % 4) + 4) % 4];
  const f = Array.isArray(p.front) ? (p.front.length === 1 ? p.front[0] : '+z') : p.front;
  return DREHUNG[f] !== undefined ? f : '+z';
}
/** Wickelt einen Generator so, dass er in jede Richtung gebaut werden kann (siehe oben). */
export function gedreht(bau) {
  return (S, scene, p) => {
    const f = ausrichtungVon(p);
    if (f === '+z') return bau(S, scene, { ...p, sichtbar: p.sichtbar ?? SICHTBAR['+z'] });
    const quer = f === '+x' || f === '-x';
    const lw = quer ? p.d : p.w, ld = quer ? p.w : p.d;
    const T = new Sammler(), grp = new THREE.Group();
    const erg = bau(T, grp, { ...p, x: 0, z: 0, w: lw, d: ld, sichtbar: SICHTBAR[f], ausrichtung: f });
    const th = DREHUNG[f], c = Math.cos(th), sn = Math.sin(th);
    let mx = Infinity, mz = Infinity;
    for (const [u, v] of [[0, 0], [lw, 0], [0, ld], [lw, ld]]) { mx = Math.min(mx, u * c + v * sn); mz = Math.min(mz, -u * sn + v * c); }
    const ox = p.x - mx, oz = p.z - mz;
    for (const [farbe, gs] of T.teile) for (const g of gs) { g.rotateY(th); g.translate(ox, 0, oz); S.add(g, farbe); }
    grp.rotation.y = th; grp.position.set(ox, 0, oz); scene.add(grp);
    return erg;
  };
}
/** Rahmen der vier Seiten eines Rechtecks, Normale jeweils nach außen. Rundum läuft jede Seite auf die nächste zu: +z → +x → -z → -x. */
const SEITE_RAHMEN = {
  '+z': (x0, z0, w, d) => R(x0, z0 + d, 1, 0, w),
  '+x': (x0, z0, w, d) => R(x0 + w, z0 + d, 0, -1, d),
  '-z': (x0, z0, w, d) => R(x0 + w, z0, -1, 0, w),
  '-x': (x0, z0, w, d) => R(x0, z0, 0, 1, d),
};
const RUNDUM = ['+z', '+x', '-z', '-x'];
const naechsteSeite = (s) => RUNDUM[(RUNDUM.indexOf(s) + 1) % 4], vorigeSeite = (s) => RUNDUM[(RUNDUM.indexOf(s) + 3) % 4];
const sicht = (p) => { const s = p.sichtbar ?? SICHTBAR['+z']; return { vorn: s.includes('+z'), rechts: s.includes('+x'), links: s.includes('-x'), hinten: s.includes('-z') }; };

function rechteck(u0, v0, u1, v1) {
  const s = new THREE.Shape();
  s.moveTo(u0, v0); s.lineTo(u1, v0); s.lineTo(u1, v1); s.lineTo(u0, v1); s.lineTo(u0, v0);
  return s;
}
function oeffnung(p, u0, v0, u1, v1, art) {
  p.moveTo(u0, v0); p.lineTo(u1, v0);
  const b = u1 - u0;
  if (art === 'kreis') { p = p; }
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
/** Extrudierte Form im Rahmen (u, y), Dicke t0..t1. */
function fform(S, F, shape, t0, t1, c, seg = 6) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: t1 - t0, bevelEnabled: false, curveSegments: seg });
  g.translate(0, 0, t0);
  fgeo(S, F, g, c);
}
/** Lochwand als Polygon mit Löchern (nur für kleine, freistehende Löcher wie Formsteinmuster). */
function fwandPoly(S, F, u0, u1, y0, y1, t0, t1, c, loecher = []) {
  const s = rechteck(u0, y0, u1, y1);
  for (const l of loecher) {
    if (l.kreis) { const p = new THREE.Path(); p.absarc(l.kreis[0], l.kreis[1], l.kreis[2], 0, 2 * PI, true); s.holes.push(p); }
    else s.holes.push(oeffnung(new THREE.Path(), l.u0, l.v0, l.u1, l.v1, l.bogen));
  }
  fform(S, F, s, t0, t1, c);
}
/**
 * Lochwand: eine Fläche mit Öffnungen [{u0,u1,v0,v1,bogen}] oder Kreisen [{kreis:[u,v,r]}].
 * Rechteck- und Bogenöffnungen werden als Raster aus Pfeilern und Brüstungen gebaut (keine Triangulierung mit Löchern,
 * damit überlappende oder randnahe Öffnungen die Fläche nicht zerreißen); Bögen bekommen Zwickel.
 */
function fwand(S, F, u0, u1, y0, y1, t0, t1, c, loecher = []) {
  const kreise = loecher.filter((l) => l.kreis);
  if (kreise.length) return fwandPoly(S, F, u0, u1, y0, y1, t0, t1, c, loecher);
  const H = loecher.map((l) => ({ ...l, u0: Math.max(u0, l.u0), u1: Math.min(u1, l.u1), v0: Math.max(y0, l.v0), v1: Math.min(y1, l.v1) })).filter((l) => l.u1 - l.u0 > 0.01 && l.v1 - l.v0 > 0.01);
  const U = [...new Set([u0, u1, ...H.flatMap((l) => [l.u0, l.u1])].map((u) => Math.round(u * 1000) / 1000))].sort((x, y) => x - y);
  let lauf = null;
  const ausgeben = () => { if (lauf) for (const [a, b] of lauf.iv) fb(S, F, lauf.a, lauf.b, a, b, t0, t1, c); };
  for (let i = 0; i < U.length - 1; i++) {
    const a = U[i], b = U[i + 1];
    if (b - a < 0.001) continue;
    const akt = H.filter((l) => l.u0 <= a + 0.0005 && l.u1 >= b - 0.0005).map((l) => [l.v0, l.v1]).sort((x, y) => x[0] - y[0]);
    const iv = []; let v = y0;
    for (const [h0, h1] of akt) { if (h0 > v + 0.001) iv.push([v, h0]); v = Math.max(v, h1); }
    if (y1 > v + 0.001) iv.push([v, y1]);
    const key = iv.map((x) => x.map((y) => y.toFixed(3)).join('-')).join('|');
    if (lauf && lauf.key === key && Math.abs(lauf.b - a) < 0.001) { lauf.b = b; continue; }
    ausgeben(); lauf = { a, b, key, iv };
  }
  ausgeben();
  // Zwickel über Bogenöffnungen
  for (const l of H) {
    if (!l.bogen) continue;
    const b = l.u1 - l.u0, um = (l.u0 + l.u1) / 2;
    const L = new THREE.Shape(), Rr = new THREE.Shape();
    if (l.bogen === 'spitz') {
      const vs = l.v1 - b * 0.866;
      L.moveTo(l.u0, vs); L.absarc(l.u1, vs, b, PI, (2 * PI) / 3, true); L.lineTo(l.u0, l.v1); L.lineTo(l.u0, vs);
      Rr.moveTo(l.u1, vs); Rr.lineTo(l.u1, l.v1); Rr.lineTo(um, l.v1); Rr.absarc(l.u0, vs, b, PI / 3, 0, true);
    } else {
      const vs = l.v1 - b / 2;
      L.moveTo(l.u0, vs); L.absarc(um, vs, b / 2, PI, PI / 2, true); L.lineTo(l.u0, l.v1); L.lineTo(l.u0, vs);
      Rr.moveTo(l.u1, vs); Rr.lineTo(l.u1, l.v1); Rr.lineTo(um, l.v1); Rr.absarc(um, vs, b / 2, PI / 2, 0, true);
    }
    fform(S, F, L, t0, t1, c); fform(S, F, Rr, t0, t1, c);
  }
}
/** Polygon (u, y)-Punkte als extrudierte Fläche. */
function fpoly(S, F, pkt, t0, t1, c) {
  const s = new THREE.Shape();
  s.moveTo(pkt[0][0], pkt[0][1]);
  for (const [u, v] of pkt.slice(1)) s.lineTo(u, v);
  s.lineTo(pkt[0][0], pkt[0][1]);
  fform(S, F, s, t0, t1, c);
}
/** Kreisscheibe auf der Fassade. */
function fscheibe(S, F, u, y, t0, t1, rad, c, seg = 20) {
  const g = new THREE.CylinderGeometry(rad, rad, t1 - t0, seg);
  g.rotateX(PI / 2); g.translate(u, y, (t0 + t1) / 2);
  fgeo(S, F, g, c);
}
/** Schrift auf einem Rahmen (Höhe und Breite begrenzt). Gibt die Breite zurück. */
function ftext(scene, F, text, u, y, t, hMax, bMax, farbe, bg = null) {
  const { mat, seitenverhaeltnis: a } = textMaterial(text, farbe, { groesse: 140, hintergrund: bg });
  const h = Math.min(hMax, bMax / a);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * a, h), mat);
  const [x, z] = wp(F, u, t);
  m.rotation.y = F.ry; m.position.set(x, y, z);
  scene.add(m);
  return h * a;
}
function zyl(S, rO, rU, h, x, y0, z, c, seg = 16, offen = false) {
  const g = new THREE.CylinderGeometry(rO, rU, h, seg, 1, offen);
  g.translate(x, y0 + h / 2, z);
  S.add(g, c);
}
function stab(S, a, b, rad, c, seg = 6) {
  const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = v.length();
  const g = new THREE.CylinderGeometry(rad, rad, L, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  S.add(g, c);
}
/** Geneigter Balken von a nach b (Breite quer, Höhe senkrecht). */
function balken(S, a, b, br, ho, c) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const hl = wurzelSumme(dx, dz), L = wurzelSumme(hl, dy);
  const g = new THREE.BoxGeometry(L, ho, br);
  g.rotateZ(Math.atan2(dy, hl)); g.rotateY(Math.atan2(-dz, dx));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  S.add(g, c);
}
function boden(S, x0, z0, x1, z1, c, y = 0.3, h = 0.06) { if (x1 > x0 && z1 > z0) S.quader(x0, y, z0, x1, y + h, z1, c); }
function hash(a, b, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 1274126177) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
/** Bilineare Fläche (z. B. HP-Schale) aus vier Eckpunkten, zweiseitig, mit Dicke. */
function bilinear(S, a, b, c, d, farbe, n = 10, dicke = 0.3, unten = null) {
  const pos = [];
  const P = (s, t) => [0, 1, 2].map((i) => (1 - s) * (1 - t) * a[i] + s * (1 - t) * b[i] + s * t * c[i] + (1 - s) * t * d[i]);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const p00 = P(i / n, j / n), p10 = P((i + 1) / n, j / n), p11 = P((i + 1) / n, (j + 1) / n), p01 = P(i / n, (j + 1) / n);
    pos.push(...p00, ...p10, ...p11, ...p00, ...p11, ...p01);
  }
  const oben = new THREE.BufferGeometry();
  oben.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  oben.computeVertexNormals();
  // Normalen nach oben ausrichten
  const nrm = oben.getAttribute('normal');
  let sy = 0; for (let i = 0; i < nrm.count; i++) sy += nrm.getY(i);
  if (sy < 0) { for (let i = 0; i < pos.length; i += 9) { for (let k = 0; k < 3; k++) { const t = pos[i + 3 + k]; pos[i + 3 + k] = pos[i + 6 + k]; pos[i + 6 + k] = t; } } oben.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); oben.computeVertexNormals(); }
  S.add(oben, farbe);
  const pu = pos.slice();
  for (let i = 0; i < pu.length; i += 9) for (let k = 0; k < 3; k++) { const t = pu[i + 3 + k]; pu[i + 3 + k] = pu[i + 6 + k]; pu[i + 6 + k] = t; }
  for (let i = 1; i < pu.length; i += 3) pu[i] -= dicke;
  const u = new THREE.BufferGeometry();
  u.setAttribute('position', new THREE.Float32BufferAttribute(pu, 3));
  u.computeVertexNormals();
  S.add(u, unten ?? dunkler(farbe, 0.08));
}

// ---------- Farben ----------
const RASEN = '#9dc283', RASEN2 = '#a6c88a', WEG = '#d6d0c2', PFLASTER = '#cbc5b8', ASPHALT = '#8d939a', TRAMPEL = '#cbb88e';
const GLAS = '#4e5c67', GLAS_HELL = '#6f8696', GLAS_GRUEN = '#5d8c8f', DUNKEL = '#3e474f', METALL = '#9aa1a7', STAHL = '#5a6168';
const MOSAIK_FARBEN = [['#d9482e', '#f0b23a', '#2f6fa8', '#f4efe2', '#3b8a5a', '#1e2c44'], ['#c43a2c', '#e8c547', '#4f9fc9', '#efe8d8', '#7a4a8c', '#2a3a2e'], ['#e46b2e', '#f6d36b', '#2c7c8c', '#f2ece0', '#b8322a', '#26384f']];

// =====================================================================================
// Fahrzeuge (generische DDR-Typen)
// =====================================================================================
export const OST_AUTOFARBEN = ['#e8e3cf', '#9fb7a8', '#c9b98c', '#7f9fba', '#d9d4c3', '#b5523f', '#e3c35e', '#8aa36b', '#f2efe6', '#6e8090', '#c7865a', '#a7b4b9', '#7d9a6a', '#d8c9a4'];
const WESTAUTOS = ['#2b2f33', '#a3abb2', '#c84a3c', '#2f5f8f', '#f4f3ef', '#3d6b4f', '#6b7680', '#1f3a5f'];
/**
 * Fahrzeug, Länge entlang der lokalen x-Achse (ry dreht um die Hochachse).
 * typ: 'kleinwagen' (Trabant-Typ), 'limousine' (Wartburg-Typ), 'kombi', 'lkw' (W50-Typ), 'bus' (Ikarus-Typ),
 *      'tram' (Tatra-Typ, ein Wagen), 'tram2' (Großzug, zwei Wagen), 'modern' (Nachwendeauto)
 */
export function ostFahrzeug(S, x, z, typ = 'kleinwagen', ry = 0, farbe = null, y0 = 0.3) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (off, q = 0) => [x + c * off + s * q, z - s * off + c * q];
  const box = (L, h, B, off, yc, f, q = 0) => { const [px, pz] = P(off, q); S.box(L, h, B, px, y0 + yc, pz, f, ry); };
  const fz = farbe ?? OST_AUTOFARBEN[Math.floor((Math.abs(x * 7.3 + z * 3.1)) % OST_AUTOFARBEN.length)];
  if (typ === 'kleinwagen') {
    box(3.1, 0.3, 1.36, 0, 0.2, '#2b2f33');
    box(3.5, 0.6, 1.5, 0, 0.62, fz);
    box(1.75, 0.5, 1.36, -0.2, 1.17, '#3c4852');
    box(1.8, 0.09, 1.42, -0.2, 1.45, (Math.abs(x + z) | 0) % 3 === 0 ? '#f2efe6' : fz);
  } else if (typ === 'limousine' || typ === 'kombi' || typ === 'modern') {
    const L = typ === 'modern' ? 4.2 : 4.4;
    box(L - 0.5, 0.32, 1.5, 0, 0.2, '#2b2f33');
    box(L, 0.66, 1.66, 0, 0.66, fz);
    const kl = typ === 'kombi' ? 2.9 : 2.1, ko = typ === 'kombi' ? -0.55 : -0.15;
    box(kl, 0.56, 1.5, ko, 1.27, '#3c4852');
    box(kl + 0.05, 0.09, 1.56, ko, 1.58, fz);
  } else if (typ === 'lkw') {
    box(6.6, 0.5, 2.0, 0, 0.45, '#2b2f33');
    box(1.9, 2.1, 2.3, 2.45, 1.75, fz ?? '#4f7a8c');
    box(0.12, 0.8, 2.0, 3.42, 2.1, '#3c4852');
    box(4.4, 2.4, 2.4, -0.85, 2.2, '#7d8a6a');
  } else if (typ === 'bus') {
    const f = farbe ?? '#d9672f';
    box(11.4, 1.3, 2.5, 0, 1.0, f);
    box(11.2, 1.05, 2.52, 0, 2.15, '#3c4852');
    box(11.3, 0.45, 2.46, 0, 2.9, '#f1ede2');
    box(0.1, 1.2, 2.2, 5.72, 2.1, '#2f3a42');
  } else if (typ === 'tram' || typ === 'tram2') {
    const wagen = typ === 'tram2' ? [7.6, -7.6] : [0];
    const unten = farbe ?? '#efe2b8', band = '#c8463c';
    for (const o of wagen) {
      const L = 14.6;
      box(L - 1.6, 0.25, 2.2, o, 0.45, '#2b2f33');
      box(L - 1.8, 1.25, 2.4, o, 1.2, unten);
      box(L - 1.9, 0.26, 2.44, o, 1.2, band);
      box(L - 2.2, 1.0, 2.38, o, 2.32, '#3c4852');
      box(L - 2.0, 0.5, 2.36, o, 3.07, unten);
      for (const e of [-1, 1]) {
        box(0.9, 2.7, 2.1, o + e * (L / 2 - 0.45), 1.95, unten);
        box(0.3, 0.95, 1.9, o + e * (L / 2 - 0.12), 2.35, '#2f3a42');
      }
      box(1.6, 0.08, 0.5, o + 1.5, 4.05, '#30353a');
      const [ax, az] = P(o + 0.6), [bx, bz] = P(o + 1.5);
      stab(S, [ax, y0 + 3.35, az], [bx, y0 + 4.05, bz], 0.05, '#30353a', 4);
    }
  }
}

// =====================================================================================
// Wohnumfeld
// =====================================================================================
function busch(S, x, z, r, s = 1) {
  const g = new THREE.IcosahedronGeometry(1.0 * s * (0.8 + r() * 0.4), 0);
  g.scale(1.2, 0.8, 1.2); g.translate(x, 0.3 + 0.7 * s, z);
  S.add(g, waehle(r, ['#6f9f5c', '#7aa865', '#628f52']));
}
function laterne(S, x, z, h = 7, y0 = 0.3, kopf = 'peitsche') {
  S.box(0.2, h, 0.2, x, y0 + h / 2, z, '#5d656c');
  if (kopf === 'peitsche') S.box(1.6, 0.2, 0.35, x + 0.7, y0 + h, z, '#5d656c');
  else S.box(0.6, 0.5, 0.6, x, y0 + h + 0.25, z, '#e9e4d2');
}
function brunnen(S, x, z, rad, o = {}) {
  const y = o.y ?? 0.36;
  zyl(S, rad, rad, 0.6, x, y, z, o.rand ?? '#d9d4c8', 24);
  zyl(S, rad - 0.4, rad - 0.4, 0.62, x, y + 0.02, z, FARBEN.wasser, 24);
  const n = o.duesen ?? 5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * PI, rr = i === 0 ? 0 : rad * 0.45;
    const h = i === 0 ? (o.hoch ?? 3.2) : 1.6;
    zyl(S, 0.08, 0.22, h, x + (i === 0 ? 0 : Math.cos(a) * rr), y + 0.6, z + (i === 0 ? 0 : Math.sin(a) * rr), '#e3f3f5', 6);
    if (i === 0 && o.schale) { zyl(S, 1.4, 0.4, 0.4, x, y + 1.6, z, o.rand ?? '#d9d4c8', 16); }
  }
}
/** Hof/Grünfläche hinter Wohnblöcken: Rasen, Bäume, Wäscheplatz, Sandkasten, Teppichstange. */
function hofGruen(S, r, x0, z0, x1, z1, o = {}) {
  if (x1 - x0 < 3 || z1 - z0 < 3) return;
  boden(S, x0, z0, x1, z1, o.rasen ?? RASEN, 0.3, 0.07);
  const A = (x1 - x0) * (z1 - z0), belegt = [...(o.belegt ?? [])], y = 0.37;
  const frei = (x, z, rad) => belegt.every(([bx, bz, br]) => wurzelSumme(bx - x, bz - z) > br + rad);
  const platz = (rad) => { for (let i = 0; i < 30; i++) { const x = zw(r, x0 + rad + 1, x1 - rad - 1), z = zw(r, z0 + rad + 1, z1 - rad - 1); if (frei(x, z, rad)) { belegt.push([x, z, rad]); return [x, z]; } } return null; };
  // Wege
  if (o.weg !== false && z1 - z0 > 10) { const wz = zw(r, z0 + 4, z1 - 4); boden(S, x0, wz - 0.9, x1, wz + 0.9, WEG, 0.3, 0.09); belegt.push(...Array.from({ length: Math.ceil((x1 - x0) / 4) }, (_, i) => [x0 + i * 4, wz, 1.2])); }
  if (A > 400 && o.spiel !== false) {
    const q = platz(4);
    if (q) {
      S.quader(q[0] - 2.6, y, q[1] - 2.6, q[0] + 2.6, y + 0.35, q[1] + 2.6, '#c9b48c');
      S.quader(q[0] - 2.2, y, q[1] - 2.2, q[0] + 2.2, y + 0.38, q[1] + 2.2, '#e8d9a8');
      const kx = q[0] + 3.2;
      for (const dz of [-1, 1]) stab(S, [kx, y, q[1] + dz * 1.2], [kx + 0.9, y + 2.6, q[1] + dz * 0.4], 0.07, '#c9483e', 4);
      S.box(1.4, 0.12, 2.6, kx + 0.6, y + 2.2, q[1], '#2f6f8f');
    }
  }
  if (A > 260 && o.waesche !== false) {
    const q = platz(3);
    if (q) {
      for (const dx of [-2.2, 2.2]) { S.box(0.12, 2.4, 0.12, q[0] + dx, y + 1.2, q[1], STAHL); S.box(0.1, 0.1, 2.2, q[0] + dx, y + 2.35, q[1], STAHL); }
      const farben = ['#f4f3ef', '#7f9fba', '#e9c46a', '#f4f3ef'];
      for (let i = 0; i < 3; i++) S.box(0.7, 0.8, 0.04, q[0] - 1.2 + i * 1.2, y + 1.9, q[1] + (i % 2 ? 0.7 : -0.7), farben[i]);
    }
  }
  if (A > 500 && o.teppich !== false) {
    const q = platz(1.5);
    if (q) { S.box(0.1, 1.8, 0.1, q[0] - 1.2, y + 0.9, q[1], STAHL); S.box(0.1, 1.8, 0.1, q[0] + 1.2, y + 0.9, q[1], STAHL); S.box(2.5, 0.1, 0.1, q[0], y + 1.75, q[1], STAHL); }
  }
  const nb = Math.min(o.maxBaeume ?? 14, Math.floor(A / (o.dichte ?? 150)));
  for (let i = 0, v = 0; i < nb && v < 90; v++) {
    const q = platz(2.4);
    if (!q) continue;
    if (r() < 0.25) busch(S, q[0], q[1], r, 1.2); else baum(S, q[0], q[1], r, zw(r, 0.8, 1.25));
    i++;
  }
}
/** Parkende Autos in einer Reihe entlang x (z = Mitte der Reihe). modern: Anteil Nachwendeautos. */
function parkreihe(S, r, x0, x1, z, o = {}) {
  const mod = o.modern ?? 0, dichte = o.dichte ?? 0.7, quer = o.quer ?? false;
  const schritt = quer ? 2.6 : 5.0;
  for (let x = x0 + schritt / 2; x < x1 - schritt / 2; x += schritt) {
    if (r() > dichte) continue;
    const typ = r() < mod ? 'modern' : waehle(r, ['kleinwagen', 'kleinwagen', 'kleinwagen', 'limousine', 'kombi']);
    const f = typ === 'modern' ? waehle(r, WESTAUTOS) : waehle(r, OST_AUTOFARBEN);
    ostFahrzeug(S, x, z, typ, quer ? PI / 2 : (r() < 0.5 ? 0 : PI), f, o.y ?? 0.3);
  }
}
/** Parkreihe entlang z (x = Mitte). */
function parkreiheZ(S, r, z0, z1, x, o = {}) {
  const mod = o.modern ?? 0, dichte = o.dichte ?? 0.7, quer = o.quer ?? true, schritt = quer ? 2.6 : 5.0;
  for (let z = z0 + schritt / 2; z < z1 - schritt / 2; z += schritt) {
    if (r() > dichte) continue;
    const typ = r() < mod ? 'modern' : waehle(r, ['kleinwagen', 'kleinwagen', 'limousine', 'kombi']);
    ostFahrzeug(S, x, z, typ, quer ? 0 : PI / 2, typ === 'modern' ? waehle(r, WESTAUTOS) : waehle(r, OST_AUTOFARBEN), o.y ?? 0.3);
  }
}
/** Antenne (Dachantenne der 70er/80er). */
function antenne(S, x, y, z, r) {
  const h = zw(r, 2.2, 3.6);
  S.box(0.08, h, 0.08, x, y + h / 2, z, '#596066');
  S.box(1.6, 0.06, 0.06, x, y + h - 0.2, z, '#596066');
  S.box(0.06, 0.06, 1.2, x, y + h - 0.7, z, '#596066');
}
/** Abstraktes Wandmosaik (Kunst am Bau) aus Kacheln: Sonne, Wellen, Bänder. */
function mosaik(S, F, u0, u1, y0, y1, t, r, o = {}) {
  const pal = o.palette ?? waehle(r, MOSAIK_FARBEN);
  const nu = o.nu ?? Math.max(6, Math.round((u1 - u0) / 1.6)), nv = o.nv ?? Math.max(4, Math.round((y1 - y0) / 1.6));
  const bu = (u1 - u0) / nu, bv = (y1 - y0) / nv;
  fb(S, F, u0 - 0.3, u1 + 0.3, y0 - 0.3, y1 + 0.3, t - 0.05, t + 0.06, o.rahmen ?? '#efe9dc');
  const su = zw(r, 0.25, 0.75) * nu, sv = zw(r, 0.55, 0.8) * nv, sr = Math.min(nu, nv) * zw(r, 0.22, 0.32);
  const wf = zw(r, 0.5, 1.1), ph = r() * 6, motiv = o.motiv ?? waehle(r, ['sonne', 'bänder', 'figur']);
  for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) {
    const dx = i + 0.5 - su, dy = k + 0.5 - sv, dist = wurzelSumme(dx, dy);
    let ci;
    if (motiv === 'sonne' && dist < sr) ci = dist < sr * 0.55 ? 1 : 0;
    else if (motiv === 'sonne' && dist < sr * 1.5 && Math.floor(Math.atan2(dy, dx) * 4 / PI + 8) % 2 === 0) ci = 1;
    else if (motiv === 'figur' && Math.abs(dx) < 1.2 && k < nv * 0.75) ci = k > nv * 0.6 ? 0 : 5;
    else if (motiv === 'figur' && Math.abs(dx + 0.5 * (k - nv * 0.45)) < 0.8 && k > nv * 0.35 && k < nv * 0.6) ci = 5;
    else {
      const w = Math.sin(i * wf + ph) * nv * 0.12 + nv * 0.3;
      ci = k < w ? 2 : k < w + 1.2 ? 3 : (i + k) % 7 === 0 ? 4 : (Math.floor((i + k * 0.5) / 3) % 2 ? 3 : 5);
      if (motiv === 'bänder') ci = [2, 3, 0, 3, 5, 1][Math.floor((i * 0.6 + k) / 1.5) % 6];
    }
    fb(S, F, u0 + i * bu + 0.06, u0 + (i + 1) * bu - 0.06, y0 + k * bv + 0.06, y0 + (k + 1) * bv - 0.06, t, t + 0.12, pal[ci]);
  }
}
/** Betonformsteinwand: Fläche mit Lochmuster (Kreise oder Rauten). */
function formsteinwand(S, F, u0, u1, y0, y1, t0, t1, farbe, art = 'kreis') {
  const L = [], st = 0.8;
  const nu = Math.floor((u1 - u0) / st), nv = Math.floor((y1 - y0) / st);
  const ou = u0 + (u1 - u0 - nu * st) / 2, ov = y0 + (y1 - y0 - nv * st) / 2;
  for (let i = 0; i < nu; i++) for (let k = 0; k < nv; k++) {
    const cu = ou + (i + 0.5) * st, cv = ov + (k + 0.5) * st;
    if (art === 'kreis') L.push({ kreis: [cu, cv, 0.27] });
    else if (art === 'raute') { L.push({ u0: cu - 0.22, u1: cu + 0.22, v0: cv - 0.22, v1: cv + 0.22 }); }
    else L.push({ u0: cu - 0.28, u1: cu - 0.04, v0: cv - 0.28, v1: cv + 0.28 }, { u0: cu + 0.04, u1: cu + 0.28, v0: cv - 0.28, v1: cv + 0.28 });
  }
  fwandPoly(S, F, u0, u1, y0, y1, t0, t1, farbe, L);
}

// =====================================================================================
// Plattenbau
// =====================================================================================
function plattenFarben(r, zustand) {
  if (zustand === 'saniert') {
    const basis = waehle(r, ['#f1e6c4', '#ecd9c6', '#dfe8d6', '#d8e3ea', '#f3dccf', '#efeee8', '#f2e9d6', '#e6e0ee']);
    const akzent = waehle(r, ['#e07a3f', '#3f7d9a', '#7fae5a', '#c9483e', '#e8b53c', '#6b5a9a', '#2f8f8a', '#d0603f']);
    return {
      saniert: true, panel: [basis, dunkler(basis, 0.018)], body: dunkler(basis, 0.3), glas: '#46596a', rahmen: '#fbfbf8', slab: '#ecebe6',
      bruest: [akzent, heller(akzent, 0.1)], akzent, akzent2: heller(akzent, 0.18), sockel: waehle(r, [dunkler(akzent, 0.12), '#7d8288', '#8c7d6e']),
      dach: '#9a9893', attika: '#d8d9da', blech: '#c4c8cb', tuer: '#3f4a53', loggiaGlas: '#6b8597',
    };
  }
  const beton = waehle(r, [
    ['#c3beb3', '#b8b3a8', '#cac4b8', '#afaa9f', '#bfb9ad'],
    ['#bdb4a2', '#b1a896', '#c5bcaa', '#a99f8d', '#b8af9d'],
    ['#c9c7c0', '#bdbab2', '#d0cdc5', '#b3b0a8', '#c4c1b9'],
  ]);
  return {
    saniert: false, panel: beton, body: '#605d58', glas: '#4c5862', rahmen: '#d9d3c5', slab: '#a7a297',
    bruest: [waehle(r, ['#b98a52', '#9c8b72', '#d2cbbd', '#8d9a8a', '#a7794f', '#c2a77a'])], akzent: '#a7794f', akzent2: beton[0],
    sockel: '#8a857b', dach: '#8a8780', attika: '#aca79b', blech: '#9ca1a4', tuer: '#6b4c36', loggiaGlas: '#56636e',
  };
}
/** Spaltenfolge über die Länge L aus einem Sektionsmuster [[typ, breite], …] mit Endfeldern. */
function spalten(L, muster, rand = 3.0) {
  const summe = muster.reduce((a, m) => a + m[1], 0);
  const innen = Math.max(summe * 0.6, L - 2 * rand);
  const n = Math.max(1, Math.round(innen / summe));
  const k = (L - 2 * rand) / (n * summe);
  const out = [];
  let u = 0;
  const push = (typ, b) => { out.push({ typ, u0: u, u1: u + b, b }); u += b; };
  if (rand > 0) push('F', rand);
  for (let i = 0; i < n; i++) for (const [typ, b] of muster) push(typ, b * k);
  if (rand > 0) push('F', rand);
  return out;
}
function pFenster(S, F, u, y, fw, fh, fa, tv, sprosse = true) {
  fb(S, F, u - fw / 2 - 0.13, u + fw / 2 + 0.13, y - 0.13, y + fh + 0.13, tv, tv + 0.035, fa.rahmen);
  fb(S, F, u - fw / 2, u + fw / 2, y, y + fh, tv, tv + 0.06, fa.glas);
  if (sprosse && fw > 1.1) fb(S, F, u - 0.045, u + 0.045, y, y + fh, tv, tv + 0.075, fa.rahmen);
}
/**
 * Plattenfassade auf einem Rahmen. o: { n, gh, y0, fa, cols, baender (P2), balkone (saniert), durchgang [u0,u1], eingang, treppeFarbig }
 * Platten sitzen t ∈ [-1.2, 0.15], Fugen sind Lücken (dunkler Kern).
 */
function plattenFront(S, F, o) {
  const { n, fa, cols } = o, gh = o.gh ?? 2.8, y0 = o.y0 ?? 1.1;
  const L = F.L, H = y0 + n * gh, ti = -1.2, tv = 0.15, j = o.fuge ?? 0.24, fh = o.fh ?? 1.45;
  const dg = o.durchgang;
  if (dg) {
    fb(S, F, 0, dg[0], 0, y0, ti, 0.24, fa.sockel); fb(S, F, dg[1], L, 0, y0, ti, 0.24, fa.sockel);
    fb(S, F, dg[0], dg[1], 0.3, y0 + gh, -o.T + 0.5, ti, '#3a4148');
    for (let u = dg[0]; u <= dg[1] + 0.01; u += (dg[1] - dg[0]) / 2) fb(S, F, u - 0.35, u + 0.35, 0, y0 + gh, -0.6, 0.1, fa.panel[0]);
  } else if (!o.laden) fb(S, F, 0, L, 0, y0, ti, 0.24, fa.sockel);
  cols.forEach((c, ci) => {
    for (let k = 0; k < n; k++) {
      const y = y0 + k * gh;
      if (dg && k === 0 && c.u1 > dg[0] + 0.01 && c.u0 < dg[1] - 0.01) continue;
      if (c.typ === 'L') {
        fb(S, F, c.u0, c.u1, y, y + 0.2, ti, tv, fa.slab);
        fb(S, F, c.u0 + 0.06, c.u1 - 0.06, y + 0.2, y + 1.15, -0.02, tv, fa.bruest[(k + ci) % fa.bruest.length]);
        fb(S, F, c.u0 + 0.45, c.u1 - 0.45, y + 1.15, y + gh - 0.3, ti - 0.02, ti + 0.05, fa.loggiaGlas);
        if (k === n - 1) fb(S, F, c.u0, c.u1, y + gh - 0.22, y + gh, ti, tv, fa.panel[0]);
        continue;
      }
      const ton = c.typ === 'T' && fa.saniert && o.treppeFarbig ? fa.akzent2 : fa.panel[hash(ci, k, o.salz ?? 0) % fa.panel.length];
      fb(S, F, c.u0 + j / 2, c.u1 - j / 2, y + j / 2, y + gh - j / 2, ti, tv, ton);
      const u = (c.u0 + c.u1) / 2;
      if (c.typ === 'T') {
        if (k === 0 && o.eingang !== false) {
          fb(S, F, u - 0.75, u + 0.75, 0.3, 2.45, tv, tv + 0.08, fa.tuer);
          fb(S, F, u - 1.4, u + 1.4, 2.55, 2.75, tv, 1.8, fa.slab);
          fb(S, F, u - 1.0, u + 1.0, 0.3, 0.5, 0.2, 1.6, PFLASTER);
        } else pFenster(S, F, u, y + gh * 0.5 - 0.1, 0.9, 1.0, fa, tv, false);
        continue;
      }
      if (c.typ === 'B') continue;
      const nf = c.b < 2.2 ? 0 : c.b < 4.6 ? 1 : 2;
      for (let i = 0; i < nf; i++) {
        const uu = c.u0 + (c.b * (i + 0.5)) / nf, fw = nf === 1 ? Math.min(o.fw ?? 1.5, c.b - 1.0) : (o.fw2 ?? 1.4);
        pFenster(S, F, uu, y + 0.85, fw, fh, fa, tv);
      }
    }
  });
  // Fugenraster: dunkle Fugenlinien zwischen den Platten
  if (o.fugenLinien !== false) {
    const fg = o.fugeFarbe ?? dunkler(fa.panel[0], fa.saniert ? 0.08 : 0.15);
    for (let k = 1; k < n; k++) fb(S, F, 0, L, y0 + k * gh - 0.07, y0 + k * gh + 0.07, tv, tv + 0.025, fg);
    fb(S, F, 0, L, y0 - 0.06, y0 + 0.06, tv, tv + 0.025, fg);
    for (let i = 1; i < cols.length; i++) fb(S, F, cols[i].u0 - 0.07, cols[i].u0 + 0.07, y0, H, tv, tv + 0.025, fg);
  }
  // P2: durchgehende Balkonbänder
  if (o.baender) {
    const laeufe = [];
    let a = null;
    for (const c of cols) { if (c.typ === 'T') { if (a) laeufe.push(a); a = null; } else a = a ? { u0: a.u0, u1: c.u1 } : { u0: c.u0, u1: c.u1 }; }
    if (a) laeufe.push(a);
    for (const lf of laeufe) {
      if (lf.u1 - lf.u0 < 3) continue;
      for (let k = 1; k < n; k++) {
        const y = y0 + k * gh;
        fb(S, F, lf.u0 + 0.15, lf.u1 - 0.15, y - 0.02, y + 0.16, tv, 1.45, fa.slab);
        fb(S, F, lf.u0 + 0.15, lf.u1 - 0.15, y + 0.16, y + 1.0, 1.3, 1.45, fa.bruest[k % fa.bruest.length]);
        fb(S, F, lf.u0 + 0.15, lf.u0 + 0.3, y + 0.16, y + gh - 0.02, tv, 1.45, fa.panel[0]);
        fb(S, F, lf.u1 - 0.3, lf.u1 - 0.15, y + 0.16, y + gh - 0.02, tv, 1.45, fa.panel[0]);
      }
    }
  }
  // Sanierung: vorgestellte Balkontürme
  if (o.balkone) {
    cols.forEach((c, ci) => {
      if (c.typ !== 'F' || c.b < 4.6 || (ci + (o.salz ?? 0)) % 2) return;
      for (let k = 1; k < n; k++) {
        const y = y0 + k * gh;
        fb(S, F, c.u0 + 0.5, c.u1 - 0.5, y - 0.05, y + 0.14, tv, 1.7, '#efeeea');
        fb(S, F, c.u0 + 0.5, c.u1 - 0.5, y + 0.14, y + 1.0, 1.6, 1.7, k % 2 ? fa.akzent : heller(fa.akzent, 0.1));
      }
      fb(S, F, c.u0 + 0.5, c.u0 + 0.68, 0.3, H - gh + 1.0, 1.55, 1.72, '#8f969c');
      fb(S, F, c.u1 - 0.68, c.u1 - 0.5, 0.3, H - gh + 1.0, 1.55, 1.72, '#8f969c');
    });
  }
  fb(S, F, -0.02, L + 0.02, H, H + 0.55, ti, 0.2, fa.attika);
  fb(S, F, -0.05, L + 0.05, H + 0.55, H + 0.65, ti, 0.26, fa.blech);
  return H;
}
/** Giebelwand eines Plattenbaus (Stirnseite, fensterlos). */
function plattenGiebel(S, F, o) {
  const { n, fa, r } = o, gh = o.gh ?? 2.8, y0 = o.y0 ?? 1.1;
  const L = F.L, H = y0 + n * gh, j = 0.17;
  const nc = Math.max(2, Math.round(L / 3.0)), b = (L + 0.15) / nc;
  fb(S, F, -0.15, L, 0, y0, -0.3, 0.24, fa.sockel);
  for (let k = 0; k < n; k++) for (let i = 0; i < nc; i++) {
    const ton = fa.panel[hash(i + 31, k, 5) % fa.panel.length];
    fb(S, F, -0.15 + i * b + j / 2, -0.15 + (i + 1) * b - j / 2, y0 + k * gh + j / 2, y0 + (k + 1) * gh - j / 2, -0.3, 0.12, ton);
  }
  const fg = dunkler(fa.panel[0], fa.saniert ? 0.08 : 0.15);
  for (let k = 1; k < n; k++) fb(S, F, -0.15, L, y0 + k * gh - 0.07, y0 + k * gh + 0.07, 0.12, 0.145, fg);
  for (let i = 1; i < nc; i++) fb(S, F, -0.15 + i * b - 0.07, -0.15 + i * b + 0.07, y0, H, 0.12, 0.145, fg);
  const art = o.art ?? (fa.saniert ? waehle(r, ['band', 'stufen', 'feld']) : waehle(r, ['rippen', 'glatt', 'fenster']));
  if (art === 'rippen') for (const f of [0.22, 0.5, 0.78]) fb(S, F, L * f - 0.25, L * f + 0.25, y0, H, 0.12, 0.32, fa.panel[1]);
  else if (art === 'fenster') { const u = L / 2; for (let k = 0; k < n; k++) pFenster(S, F, u, y0 + k * gh + 1.0, 0.7, 0.9, fa, 0.12, false); }
  else if (art === 'band') { fb(S, F, L * 0.62, L * 0.8, y0, H, 0.12, 0.17, fa.akzent); fb(S, F, L * 0.8, L * 0.86, y0, H, 0.12, 0.17, fa.akzent2); }
  else if (art === 'stufen') { for (let k = 1; k < n; k += 2) fb(S, F, L * 0.12, L * (0.2 + 0.6 * (k / n)), y0 + k * gh + 0.3, y0 + (k + 1) * gh - 0.3, 0.12, 0.17, k % 4 === 1 ? fa.akzent : fa.akzent2); }
  else if (art === 'feld') { fb(S, F, L * 0.15, L * 0.85, y0 + gh, H - gh * 0.6, 0.12, 0.16, fa.akzent2); fb(S, F, L * 0.3, L * 0.7, y0 + gh * 2, H - gh * 1.6, 0.16, 0.2, fa.akzent); }
  fb(S, F, -0.15, L + 0.05, H, H + 0.55, -0.3, 0.2, fa.attika);
  fb(S, F, -0.18, L + 0.05, H + 0.55, H + 0.65, -0.3, 0.26, fa.blech);
}
/**
 * Plattenblock hinter einem Frontrahmen. o: plattenFront-Optionen + { giebel: {links, rechts}, aufzug, aufsatz, antennen, ext }
 */
function plattenBlock(S, F, T, o) {
  const { fa, r } = o, L = F.L, ti = -1.2, ext = o.ext ?? 0;
  const H = (o.y0 ?? 1.1) + o.n * (o.gh ?? 2.8);
  const eL = o.giebel?.links ? 0 : ext, eR = o.giebel?.rechts ? 0 : ext;
  const tb = o.rueck ? -T + 1.2 : -T;   // mit Hofseite sitzen deren Platten im hinteren Streifen
  fb(S, F, -eL, L + eR, o.laden ? o.y0 : 0, H, tb, ti, fa.body);
  fb(S, F, -eL, L + eR, H - 0.02, H + 0.12, -T, ti + 0.01, fa.dach);
  if (!o.rueck) fb(S, F, -eL, L + eR, H, H + 0.55, -T, -T + 0.25, fa.attika);
  if (o.vorn !== false) plattenFront(S, F, { ...o, T });
  else { fb(S, F, -eL, L + eR, 0, H, ti, ti + 0.3, fa.panel[0]); fb(S, F, -eL, L + eR, H, H + 0.55, ti, 0.2, fa.attika); }
  if (o.rueck) {
    // Hofseite: Loggien statt Treppenhäuser, keine Hauseingänge, Durchgang gespiegelt
    const FR = rueckseite(F, T);
    const colsR = o.cols.map((c, i) => ({ typ: c.typ === 'T' ? 'F' : c.typ === 'F' && c.b >= 4.6 && i % 2 === 1 ? 'L' : c.typ, u0: L - c.u1, u1: L - c.u0, b: c.b })).reverse();
    plattenFront(S, FR, { ...o, T, cols: colsR, eingang: false, baender: o.baender, balkone: o.balkone && !o.baender, durchgang: o.durchgang ? [L - o.durchgang[1], L - o.durchgang[0]] : null, salz: (o.salz ?? 0) + 3, laden: false });
    if (o.laden) fb(S, FR, 0, L, 0, o.y0, -1.2, 0.2, fa.sockel);
  }
  if (o.giebel?.rechts) plattenGiebel(S, endeRechts(F, T), o);
  if (o.giebel?.links) plattenGiebel(S, endeLinks(F, T), { ...o, art: o.artLinks });
  // Dach
  const yd = H + 0.12;
  if (fa.saniert && o.aufsatz) {
    const g = dachProfil(L - 0.4, T - 0.6, o.aufsatz === 'flach' ? 1.6 : 2.6, 0.4, 'x');
    g.translate(L / 2, H + 0.6, -T / 2);
    fgeo(S, F, g, o.aufsatzFarbe ?? waehle(r, ['#8e5a48', '#7a7f85', '#9a5444']));
    return H + 3.2;
  }
  for (const c of o.cols) {
    if (c.typ !== 'T') continue;
    if (o.aufzug) { fb(S, F, c.u0 - 0.8, c.u1 + 0.8, yd, yd + 2.9, -T * 0.66, -T * 0.28, fa.attika); fb(S, F, c.u0 - 0.9, c.u1 + 0.9, yd + 2.9, yd + 3.05, -T * 0.68, -T * 0.26, fa.blech); }
    else fb(S, F, c.u0 - 0.1, c.u1 + 0.1, yd, yd + 1.3, -T * 0.55, -T * 0.3, fa.attika);
  }
  if (!fa.saniert && o.antennen !== false) {
    const na = Math.max(2, Math.round(L / 7));
    for (let i = 0; i < na; i++) { const u = zw(r, 1.5, L - 1.5), t = -zw(r, 2, T - 2); const [x, z] = wp(F, u, t); antenne(S, x, yd, z, r); }
  } else if (fa.saniert && r() < 0.6) {
    for (let i = 0; i < Math.round(L / 20); i++) { const u = zw(r, 2, L - 2); const [x, z] = wp(F, u, -T + 1.5); S.box(0.9, 0.9, 0.12, x, yd + 1.0, z, '#e9ebec', F.ry); }
  }
  return H + (o.aufzug ? 3.2 : 1.4);
}
/** Großblockbau Q3A/QX (50er/60er): Lochfassade mit Blockfugen, flaches Satteldach. */
function qBlock(S, F, T, o) {
  const { fa, r, n } = o, L = F.L, gh = 2.85, y0 = 0.9, H = y0 + n * gh;
  const wand = o.wand, fuge = dunkler(wand, 0.09);
  fb(S, F, 0, L, 0, H, o.rueck ? -T + 0.35 : -T, -0.35, GLAS);
  if (o.rueck) {
    // Hofseite: Lochfassade ohne Eingänge, Treppenhausfenster halbgeschossig versetzt, kleine Balkone
    const FR = rueckseite(F, T), raster = 3.0, na = Math.max(3, Math.round(L / raster)), rb = L / na, Lr = [];
    for (let i = 0; i < na; i++) for (let k = 0; k < n; k++) {
      const u = (i + 0.5) * rb, y = y0 + k * gh, tr = (na - 1 - i) % (o.sektion ?? 5) === 2;
      Lr.push(tr ? { u0: u - 0.45, u1: u + 0.45, v0: y + 1.5, v1: y + 2.4 } : { u0: u - 0.65, u1: u + 0.65, v0: y + 0.9, v1: y + 2.35 });
    }
    fwand(S, FR, 0, L, 0, H, -0.35, 0, wand, Lr);
    for (let k = 0; k < n; k++) { const y = y0 + k * gh; fb(S, FR, 0, L, y + 0.85, y + 0.93, 0, 0.03, fuge); }
    for (let i = 0; i <= na; i++) fb(S, FR, i * rb - 0.04, i * rb + 0.04, y0, H, 0, 0.03, fuge);
    fb(S, FR, 0, L, 0, y0, -0.35, 0.12, fa.sockel);
    for (let i = 1; i < na - 1; i += 2) { const u = (i + 0.5) * rb; for (let k = 1; k < n; k++) { const y = y0 + k * gh; fb(S, FR, u - 1.1, u + 1.1, y - 0.05, y + 0.12, 0, 1.2, '#ecebe6'); fb(S, FR, u - 1.1, u + 1.1, y + 0.12, y + 1.0, 1.1, 1.2, fa.saniert ? fa.akzent : '#5a6168'); } }
    for (const l of Lr) if (l.u1 - l.u0 > 1.1) fb(S, FR, l.u0 - 0.08, l.u1 + 0.08, l.v0 - 0.12, l.v0, 0, 0.16, '#e9e5da');
  }
  const raster = 3.0, na = Math.max(3, Math.round(L / raster)), rb = L / na;
  const tr = new Set(); for (let i = 2; i < na - 1; i += o.sektion ?? 5) tr.add(i);
  const loecher = [];
  for (let i = 0; i < na; i++) {
    const u = (i + 0.5) * rb;
    for (let k = 0; k < n; k++) {
      const y = y0 + k * gh;
      if (tr.has(i)) { if (k === 0) loecher.push({ u0: u - 0.7, u1: u + 0.7, v0: 0.3, v1: 2.5 }); else loecher.push({ u0: u - 0.5, u1: u + 0.5, v0: y - 0.5, v1: y + 0.6 }); }
      else loecher.push({ u0: u - 0.65, u1: u + 0.65, v0: y + 0.9, v1: y + 2.35 });
    }
  }
  fwand(S, F, 0, L, 0, H, -0.35, 0, wand, loecher);
  // Blockfugen: Brüstungs- und Sturzfugen, senkrechte Fugen
  for (let k = 0; k < n; k++) { const y = y0 + k * gh; fb(S, F, 0, L, y + 0.85, y + 0.93, 0, 0.03, fuge); fb(S, F, 0, L, y + 2.4, y + 2.48, 0, 0.03, fuge); }
  for (let i = 0; i <= na; i++) fb(S, F, i * rb - 0.04, i * rb + 0.04, y0, H, 0, 0.03, fuge);
  fb(S, F, 0, L, 0, y0, -0.35, 0.12, fa.sockel);
  for (const l of loecher) { if (l.v0 < 1) continue; const u = (l.u0 + l.u1) / 2; fb(S, F, l.u0 - 0.08, l.u1 + 0.08, l.v0 - 0.12, l.v0, 0, 0.16, '#e9e5da'); if (l.u1 - l.u0 > 1.1) fb(S, F, u - 0.04, u + 0.04, l.v0, l.v1, -0.2, -0.12, fa.rahmen); }
  for (const i of tr) { const u = (i + 0.5) * rb; fb(S, F, u - 1.2, u + 1.2, 2.6, 2.8, 0, 1.4, fa.slab); }
  // kleine Balkone (saniert: neue Stahlbalkone)
  if (o.balkone) for (let i = 1; i < na - 1; i += 3) { if (tr.has(i)) continue; const u = (i + 0.5) * rb; for (let k = 1; k < n; k++) { const y = y0 + k * gh; fb(S, F, u - 1.1, u + 1.1, y - 0.05, y + 0.12, 0, 1.2, '#ecebe6'); fb(S, F, u - 1.1, u + 1.1, y + 0.12, y + 1.0, 1.1, 1.2, fa.saniert ? fa.akzent : '#5a6168'); } }
  // Satteldach
  const dh = o.dachH ?? 2.6;
  fb(S, F, -0.3, L + 0.3, H, H + 0.25, -T - 0.3, 0.35, dunkler(wand, 0.05));
  const g = dachProfil(L + 0.6, T + 0.9, dh, 0.25, 'x');
  g.translate(L / 2, H + 0.25, -T / 2 + 0.05);
  fgeo(S, F, g, o.dach);
  // Giebel (rechts immer, links wenn sichtbar)
  for (const G of [o.rechts !== false ? endeRechts(F, T) : null, o.links ? endeLinks(F, T) : null]) {
    if (!G) continue;
    fb(S, G, -0.1, T + 0.1, 0, H + 0.25, -0.3, 0.02, wand);
    fpoly(S, G, [[-0.1, H + 0.25], [T + 0.1, H + 0.25], [T / 2, H + 0.25 + dh * 0.95]], -0.2, 0.05, wand);
    for (let k = 0; k < n; k++) { const y = y0 + k * gh; fb(S, G, T / 2 - 0.5, T / 2 + 0.5, y + 1.2, y + 2.2, 0, 0.06, GLAS); fb(S, G, T / 2 - 0.6, T / 2 + 0.6, y + 1.1, y + 1.2, 0, 0.14, '#e9e5da'); }
    fb(S, G, T / 2 - 0.4, T / 2 + 0.4, H + 1.0, H + 1.8, 0, 0.08, GLAS);
    fb(S, G, 0, T, 0, y0, -0.3, 0.12, fa.sockel);
  }
  for (let i = 0; i < Math.round(L / 9); i++) { const u = zw(r, 2, L - 2), [x, z] = wp(F, u, -T * 0.5); S.box(0.7, 1.4, 0.7, x, H + dh * 0.85, z, '#8a6a5a'); if (!fa.saniert) antenne(S, x, H + dh * 0.85 + 0.7, z, r); }
  return H + dh;
}
/** Punkthochhaus (PH-Typ) oder Würfelhaus: quadratisch, Eckloggien. */
function punkthaus(S, x0, z0, a, b, o) {
  const { n, fa, r } = o, gh = 2.8, y0 = 1.1, H = y0 + n * gh;
  // o.sichtbar: Seiten mit Plattenfassade (Standard +z, +x); die Eckloggien sitzen an der gemeinsamen Ecke beider Seiten
  const vis = o.sichtbar ?? ['+z', '+x'];
  const ein = (s) => (vis.includes(s) ? 1.2 : 0);
  const bx0 = x0 + ein('-x'), bx1 = x0 + a - ein('+x'), bz0 = z0 + ein('-z'), bz1 = z0 + b - ein('+z');
  S.quader(bx0, 0, bz0, bx1, H, bz1, fa.body);
  S.quader(bx0, H - 0.02, bz0, bx1, H + 0.12, bz1, fa.dach);
  const mitte = (L, ende) => {
    const innen = L - 3.6, nc = Math.max(2, Math.round(innen / 3.6)), bb = innen / nc, out = [];
    let u = ende === 'links' ? 3.6 : 0;
    if (ende === 'links') out.push({ typ: 'L', u0: 0, u1: 3.6, b: 3.6 });
    for (let i = 0; i < nc; i++) { out.push({ typ: i === Math.floor(nc / 2) && o.treppe === ende ? 'T' : 'F', u0: u, u1: u + bb, b: bb }); u += bb; }
    if (ende === 'rechts') out.push({ typ: 'L', u0: u, u1: u + 3.6, b: 3.6 });
    return out;
  };
  for (const s of vis) {
    const ende = vis.includes(naechsteSeite(s)) ? 'rechts' : 'links', laengs = s[1] === 'z';
    const cols = mitte(laengs ? a : b, ende);
    if (ende === 'rechts') cols.forEach((c) => { if (c.typ === 'F' && c.b > 3.5 && o.breit) c.b = 4.8; });
    plattenFront(S, SEITE_RAHMEN[s](x0, z0, a, b), { ...o, cols, eingang: true, T: laengs ? b : a });
  }
  // Attika der abgewandten Seiten
  const ATT = { '-x': [x0, z0, x0 + 0.25, z0 + b], '-z': [x0, z0, x0 + a, z0 + 0.25], '+x': [x0 + a - 0.25, z0, x0 + a, z0 + b], '+z': [x0, z0 + b - 0.25, x0 + a, z0 + b] };
  for (const s of ['-x', '-z', '+x', '+z']) if (!vis.includes(s)) { const [ax, az, bx, bz] = ATT[s]; S.quader(ax, H, az, bx, H + 0.55, bz, fa.attika); }
  // Dachaufbau
  const yd = H + 0.12, cx = x0 + a * 0.45, cz = z0 + b * 0.45;
  if (n >= 10) {
    S.quader(cx - 4, yd, cz - 3, cx + 4, yd + 3.4, cz + 3, fa.attika);
    S.quader(cx - 4.2, yd + 3.4, cz - 3.2, cx + 4.2, yd + 3.6, cz + 3.2, fa.blech);
    if (fa.saniert) { S.box(0.1, 0.1, 0.1, cx, yd, cz, fa.attika); }
  } else S.quader(cx - 2, yd, cz - 1.5, cx + 2, yd + 1.4, cz + 1.5, fa.attika);
  if (!fa.saniert) for (let i = 0; i < 5; i++) antenne(S, x0 + zw(r, 2, a - 3), yd, z0 + zw(r, 2, b - 3), r);
  return H + (n >= 10 ? 3.6 : 1.4);
}

const MUSTER = {
  wbs70: [['F', 6.0], ['L', 3.6], ['T', 2.4]],
  wbs70b: [['F', 6.0], ['L', 3.6], ['F', 2.4], ['T', 2.4]],
  p2: [['F', 3.6], ['F', 3.6], ['F', 3.6], ['T', 2.4]],
  scheibe: [['F', 3.6], ['L', 3.6], ['L', 3.6], ['F', 3.6], ['T', 2.4]],
};
export const PLATTE_VARIANTEN = ['wbs70_6', 'wbs70_11', 'p2', 'q3a', 'ph16', 'scheibe', 'wuerfel', 'winkel', 'kurve'];
const PLATTE_MIN = { wbs70_6: [30, 19], wbs70_11: [36, 20], p2: [32, 19], q3a: [28, 17], ph16: [32, 32], scheibe: [56, 20], wuerfel: [26, 26], winkel: [52, 46], kurve: [70, 44] };

function platteWohnRoh(S, scene, p) {
  const r = rng(`pw:${p.seed}`);
  const v = p.variante ?? waehle(r, PLATTE_VARIANTEN);
  const zustand = p.zustand ?? (r() < 0.55 ? 'saniert' : 'unsaniert');
  const fa = plattenFarben(r, zustand);
  const { x: x0, z: z0, w, d } = p;
  const sv = 5, T = 12;
  const zf = z0 + d - sv;
  const mod = fa.saniert ? 0.6 : 0.05;
  let H = 0;
  // Vorzone: Gehweg, Parkstreifen
  const vorne = (xa, xb) => {
    boden(S, xa, zf, xb, zf + 2.2, WEG, 0.3, 0.08);
    boden(S, xa, zf + 2.2, xb, z0 + d, ASPHALT, 0.3, 0.05);
    parkreihe(S, r, xa + 1, xb - 1, zf + 3.6, { modern: mod, dichte: 0.55 });
  };
  const base = { fa, r, salz: p.seed % 7 };
  if (v === 'ph16' || v === 'wuerfel') {
    const a = v === 'ph16' ? 22 : 17.5, n = v === 'ph16' ? 16 : 6;
    const px = x0 + w - a - sv, pz = zf - a;
    hofGruen(S, r, x0, z0, x0 + w, zf, { belegt: Array.from({ length: 4 }, (_, i) => [px + a / 2 - i * (v === 'ph16' ? a + 14 : a + 9), pz + a / 2, a * 0.75]) });
    boden(S, px - 1.5, pz, x0 + w, zf, PFLASTER, 0.3, 0.09);
    vorne(x0, x0 + w);
    if (fa.saniert && r() < 0.5 && v === 'wuerfel') fa.aufsatzFarbe = '#8e5a48';
    const abst = v === 'ph16' ? a + 14 : a + 9;
    const anz = Math.max(1, Math.min(v === 'ph16' ? 3 : 4, Math.floor((w - sv - 2) / abst) + ((w - sv - 2) % abst >= a ? 1 : 0)));
    for (let i = 0; i < anz; i++) {
      const qx = px - i * abst;
      if (qx < x0 + 1) break;
      const hh = punkthaus(S, qx, pz, a, a, { ...base, n, treppe: 'links', breit: v === 'wuerfel', salz: i, sichtbar: p.sichtbar });
      H = Math.max(H, hh);
      if (v === 'wuerfel' && fa.saniert && i % 2 === 0) { const g = walmdach(a + 0.4, a + 0.4, 2.6); g.translate(qx + a / 2 - 0.4, hh - 1.4 + 0.1, pz + a / 2 - 0.4); S.add(g, '#8e5a48'); H = Math.max(H, hh + 1.5); }
      if (i > 0) boden(S, qx - 1.5, pz, qx + a + 1.5, zf, PFLASTER, 0.3, 0.09);
    }
    return { hoehe: H };
  }
  if (v === 'winkel') {
    const xf = x0 + w - sv;
    hofGruen(S, r, x0, z0, xf - T, zf - T);
    boden(S, xf, z0, x0 + w, zf, WEG, 0.3, 0.08);
    vorne(x0, x0 + w);
    const n = 5 + (r() < 0.5 ? 1 : 0);
    const FA = R(x0 + 3, zf, 1, 0, xf - T - x0 - 3);
    const FB = R(xf, zf, 0, -1, zf - z0 - 3);
    const o = { ...base, n, aufsatz: fa.saniert && r() < 0.4, balkone: fa.saniert, treppeFarbig: fa.saniert };
    // Zur Kamera: Straßenfronten (vorn, rechts) oder Hofseiten des Winkels (hinten, links), Giebel an den freien Enden
    const sk = sicht(p);
    H = plattenBlock(S, FA, T, { ...o, cols: spalten(FA.L, MUSTER.wbs70), vorn: sk.vorn, rueck: sk.hinten, giebel: { links: sk.links } });
    H = Math.max(H, plattenBlock(S, FB, T, { ...o, cols: spalten(FB.L, MUSTER.wbs70b), vorn: sk.rechts, rueck: sk.links, giebel: { links: sk.vorn, rechts: sk.hinten }, salz: 4 }));
    if (sk.hinten || sk.links) wohnweg(S, r, x0 + 3, z0 + 3, xf - T, zf - T, sk);
    return { hoehe: H };
  }
  if (v === 'kurve') {
    const n = 5 + (r() < 0.5 ? 1 : 0), Phi = zw(r, 0.7, 0.95);
    const span = w - 12, Rr = span / (2 * Math.sin(Phi / 2));
    const m = Math.max(4, Math.round((Rr * Phi) / 12)), dphi = Phi / m;
    const cx = x0 + w / 2, cz = zf + Rr * Math.cos(Phi / 2);
    const sag = Rr * (1 - Math.cos(Phi / 2));
    hofGruen(S, r, x0, z0, x0 + w, zf - sag - T + 1, { maxBaeume: 10 });
    boden(S, x0, zf - sag - T + 1, x0 + w, zf, RASEN2, 0.3, 0.07);
    vorne(x0, x0 + w);
    const ext = T * Math.tan(dphi / 2) + 0.1;
    const o = { ...base, n, aufsatz: false, balkone: fa.saniert, treppeFarbig: fa.saniert };
    const sk = sicht(p);
    for (let i = 0; i < m; i++) {
      const a = -Phi / 2 + i * dphi, b = a + dphi;
      const Pa = [cx + Rr * Math.sin(a), cz - Rr * Math.cos(a)], Pb = [cx + Rr * Math.sin(b), cz - Rr * Math.cos(b)];
      const Ls = wurzelSumme(Pb[0] - Pa[0], Pb[1] - Pa[1]);
      const F = R(Pa[0], Pa[1], (Pb[0] - Pa[0]) / Ls, (Pb[1] - Pa[1]) / Ls, Ls);
      const cols = spalten(Ls, MUSTER.wbs70, 0);
      H = plattenBlock(S, F, T, { ...o, cols, ext, salz: i, vorn: sk.vorn, rueck: sk.hinten, giebel: { rechts: i === m - 1 && sk.rechts, links: i === 0 && sk.links } });
    }
    if (sk.hinten) wohnweg(S, r, x0 + 2, z0 + 2, x0 + w - 2, zf - sag - T - 1, sk);
    return { hoehe: H };
  }
  // gerade Zeilen
  const cfg = {
    wbs70_6: { n: 5 + (r() < 0.6 ? 1 : 0), muster: r() < 0.5 ? MUSTER.wbs70 : MUSTER.wbs70b },
    wbs70_11: { n: 11, muster: MUSTER.wbs70, aufzug: true },
    p2: { n: 5 + (r() < 0.5 ? 1 : 0), muster: MUSTER.p2, baender: true },
    scheibe: { n: 11, muster: MUSTER.scheibe, aufzug: true, durchgang: true },
    q3a: { n: 4 + (r() < 0.4 ? 1 : 0) },
  }[v] ?? { n: 6, muster: MUSTER.wbs70 };
  const Tz = v === 'q3a' ? 10.5 : T;
  const sk = sicht(p);
  hofGruen(S, r, x0, z0, x0 + w, zf - Tz, { weg: !sk.hinten });
  if (sk.hinten && zf - Tz - z0 > 4) {
    // Hofseite: Wohnweg mit Hauseingangsflächen zu den Loggien, Bänke, Wäscheplatz
    boden(S, x0 + 1, zf - Tz - 3.2, x0 + w - 1, zf - Tz - 1.2, WEG, 0.3, 0.1);
    for (let u = x0 + 8; u < x0 + w - 6; u += 16) { S.box(1.8, 0.45, 0.55, u, 0.62, zf - Tz - 3.8, '#8a6a4a'); }
  }
  vorne(x0, x0 + w);
  // lange Zeilen in Blöcke ≤ 90 m teilen
  const Lges = w - 6, nb = Math.max(1, Math.ceil(Lges / 90)), gap = nb > 1 ? 10 : 0, Lb = (Lges - gap * (nb - 1)) / nb;
  for (let bI = 0; bI < nb; bI++) {
    const ua = x0 + 3 + bI * (Lb + gap);
    const F = R(ua, zf, 1, 0, Lb);
    if (v === 'q3a') {
      const wand = fa.saniert ? waehle(r, ['#efe0b8', '#e9d2bf', '#dfe6cf', '#f1e9d8']) : waehle(r, ['#cfc4ac', '#c9bfa8', '#d3cab4', '#c1b9a6']);
      H = qBlock(S, F, Tz, { ...base, n: cfg.n, wand, dach: fa.saniert ? waehle(r, ['#9a5444', '#7a7f85']) : waehle(r, ['#8f9396', '#7f8488', '#8a6a5a']), balkone: fa.saniert || r() < 0.4, sektion: 5, rueck: sk.hinten, links: sk.links, rechts: sk.rechts });
      continue;
    }
    const cols = spalten(Lb, cfg.muster);
    const dgU = cfg.durchgang ? (() => { const c = cols[Math.floor(cols.length / 2)]; const c2 = cols[Math.floor(cols.length / 2) + 1]; return [c.u0, c2 ? c2.u1 : c.u1]; })() : null;
    H = plattenBlock(S, F, T, { ...base, n: cfg.n, cols, baender: cfg.baender, aufzug: cfg.aufzug, durchgang: dgU, salz: bI + (p.seed % 5),
      balkone: fa.saniert && !cfg.baender && cfg.n < 9, treppeFarbig: fa.saniert, aufsatz: fa.saniert && cfg.n < 9 && r() < 0.45,
      giebel: { rechts: sk.rechts, links: sk.links }, rueck: sk.hinten, vorn: sk.vorn });
  }
  return { hoehe: H };
}
/** Hofseite zur Kamera: Wohnweg mit Bänken vor den Loggien, Teppichstange (für Winkel und Kurve). */
function wohnweg(S, r, x0, z0, x1, z1, sk) {
  if (x1 - x0 < 8 || z1 - z0 < 6) return;
  if (sk.hinten) { boden(S, x0 + 1, z1 - 2.4, x1 - 1, z1 - 0.4, WEG, 0.3, 0.1); for (let u = x0 + 6; u < x1 - 4; u += 15) S.box(1.8, 0.45, 0.55, u, 0.62, z1 - 3.0, '#8a6a4a'); }
  if (sk.links) { boden(S, x1 - 2.4, z0 + 1, x1 - 0.4, z1 - 1, WEG, 0.3, 0.1); for (let u = z0 + 6; u < z1 - 4; u += 15) S.box(0.55, 0.45, 1.8, x1 - 3.0, 0.62, u, '#8a6a4a'); }
  void r;
}
function platteWohnLokal(S, scene, p) {
  const v = p.variante;
  const [mw, md] = PLATTE_MIN[v] ?? [36, 26];
  if (p.w >= mw && p.d >= md) return platteWohnRoh(S, scene, p);
  return skaliert(S, scene, p, Math.max(mw, p.w), Math.max(md, p.d), platteWohnRoh);
}
const platteWohnGedreht = gedreht(platteWohnLokal);
/**
 * Wohnplatte. Alle Varianten lassen sich mit p.front ('+z' | '+x' | '-z' | '-x') in alle vier Richtungen bauen:
 * Zeilen, Punkthochhaus und Würfelhaus, Winkel und Kurve. Die Seiten zur Kamera sind jeweils voll detailliert
 * (Straßenfront mit Eingängen, Hofseite mit Loggien, Giebel an freien Enden).
 */
function platteWohn(S, scene, p) {
  const r = rng(`pw:${p.seed}`);
  const v = p.variante ?? waehle(r, PLATTE_VARIANTEN);
  return platteWohnGedreht(S, scene, { ...p, variante: v });
}

// =====================================================================================
// Magistrale: Nationale Tradition (50er, "Zuckerbäcker")
// =====================================================================================
const MAG = {
  berlin: { wand: '#eee4cd', orn: '#f9f5ec', sockel: '#cbb894', dach: '#9b968d', egH: 5.4, gh: 3.15, n: [6, 7], ra: 3.3 },
  rostock: { wand: '#a9583f', orn: '#efe8da', sockel: '#94503b', dach: '#a24c39', egH: 4.8, gh: 3.1, n: [4, 5], ra: 3.0 },
  dresden: { wand: '#dcc69c', orn: '#efe3c6', sockel: '#c2a97d', dach: '#7c4b3e', egH: 5.0, gh: 3.2, n: [5, 5], ra: 3.2 },
};
const LAEDEN = ['Buchhandlung', 'Café', 'Uhren · Schmuck', 'Feinkost', 'Damenmode', 'Foto · Optik', 'Blumen', 'Schuhe', 'Möbel', 'Spielwaren', 'Konditorei', 'Herrenmode', 'Bücherstube', 'Textilien'];
/** Achsen gleichmäßig über [u0, u1]. */
function achsen(u0, u1, ra, rand = 0.6) {
  const na = Math.max(1, Math.floor((u1 - u0 - 2 * rand) / ra)), off = u0 + (u1 - u0 - na * ra) / 2;
  return Array.from({ length: na }, (_, i) => off + (i + 0.5) * ra);
}
function balustrade(S, F, u0, u1, y0, y1, t0, t1, farbe, schritt = 0.32) {
  const L = [];
  for (let u = u0 + schritt * 0.75; u < u1 - schritt * 0.5; u += schritt) L.push({ u0: u - schritt * 0.28, u1: u + schritt * 0.28, v0: y0 + 0.18, v1: y1 - 0.16, bogen: false });
  fwand(S, F, u0, u1, y0, y1, t0, t1, farbe, L);
}
/** Obergeschossfassade der Magistrale auf einem Rahmen (Bereich u0..u1). */
function magFassade(S, scene, F, c, r, o) {
  const { egH, gh, n, ra, wand, orn } = c, H = egH + n * gh;
  const u0 = o.u0 ?? 0, u1 = o.u1 ?? F.L;
  const ax = achsen(u0, u1, ra, 0.8);
  const balkon = (i, k) => c.balkone && k >= 2 && k <= n - 2 && i % 4 === 2 && i > 0 && i < ax.length - 1;
  const loecher = [];
  ax.forEach((u, i) => {
    for (let k = 0; k < n; k++) {
      const y = egH + k * gh, fw = c.fw ?? 0.72;
      if (k === 0) loecher.push({ u0: u - fw, u1: u + fw, v0: y + 0.75, v1: y + 2.05, bogen: c.bogenMezz });
      else loecher.push({ u0: u - fw, u1: u + fw, v0: balkon(i, k) ? y + 0.25 : y + 0.95, v1: y + 2.6, bogen: c.bogenOben && k === n - 1 });
    }
  });
  fwand(S, F, u0, u1, egH, H, -0.4, 0, wand, loecher);
  // Fensterbänke, Verdachungen
  ax.forEach((u, i) => {
    for (let k = 0; k < n; k++) {
      const y = egH + k * gh, fw = c.fw ?? 0.72;
      if (c.faschen) { fb(S, F, u - fw - 0.22, u - fw, y + (k ? 0.85 : 0.65), y + (k ? 2.7 : 2.15), 0, 0.08, c.faschen); fb(S, F, u + fw, u + fw + 0.22, y + (k ? 0.85 : 0.65), y + (k ? 2.7 : 2.15), 0, 0.08, c.faschen); }
      if (!balkon(i, k)) fb(S, F, u - fw - 0.18, u + fw + 0.18, y + (k ? 0.82 : 0.62), y + (k ? 0.95 : 0.75), 0, 0.22, orn);
      if (k >= 1 && k <= 2) fb(S, F, u - fw - 0.25, u + fw + 0.25, y + 2.65, y + 2.9, 0, 0.3, orn);
      if (k === 1 && c.dreieck) fpoly(S, F, [[u - fw - 0.25, y + 2.9], [u + fw + 0.25, y + 2.9], [u, y + 3.05]], 0, 0.25, orn);
      if (balkon(i, k)) {
        fb(S, F, u - 1.25, u + 1.25, y + 0.05, y + 0.27, 0, 1.15, orn);
        balustrade(S, F, u - 1.2, u + 1.2, y + 0.27, y + 1.25, 0.95, 1.1, orn);
      }
    }
  });
  // Lisenen (Kolossalordnung) über den oberen Geschossen
  if (c.lisenen) for (let i = 0; i <= ax.length; i += 2) {
    const u = i < ax.length ? ax[i] - ra / 2 : ax[ax.length - 1] + ra / 2;
    fb(S, F, u - 0.42, u + 0.42, egH + gh + 0.1, H - 0.5, 0, 0.42, orn);
    fb(S, F, u - 0.58, u + 0.58, H - 0.85, H - 0.4, 0, 0.6, orn);
    fb(S, F, u - 0.55, u + 0.55, egH + gh + 0.1, egH + gh + 0.45, 0, 0.5, orn);
  }
  // Gesimse
  fb(S, F, u0, u1, egH - 0.15, egH + 0.3, -0.4, 0.5, orn);
  fb(S, F, u0, u1, egH + gh - 0.08, egH + gh + 0.14, -0.4, 0.25, orn);
  if (c.kranz !== false) {
    fb(S, F, u0 - 0.6, u1 + 0.6, H, H + 0.7, -0.4, 0.95, orn);
    for (let u = u0 + 0.8; u < u1 - 0.4; u += 1.65) fb(S, F, u - 0.13, u + 0.13, H - 0.45, H, 0, 0.75, orn);
  }
  return { H, ax };
}
/** Arkade im Erdgeschoss: Pfeiler oder Bogenwand, dahinter Läden. */
function magArkade(S, scene, F, c, r, o) {
  const { egH, ra, sockel } = c, A = o.A ?? 3.4;
  const u0 = o.u0 ?? 0, u1 = o.u1 ?? F.L;
  const ax = achsen(u0, u1, ra, 0.8);
  boden(S, ...(() => { const [ax0, az0] = wp(F, u0, -A), [ax1, az1] = wp(F, u1, 0); return [Math.min(ax0, ax1), Math.min(az0, az1), Math.max(ax0, ax1), Math.max(az0, az1)]; })(), PFLASTER, 0.3, 0.07);
  if (c.arkade === 'bogen') {
    const L = [];
    for (let i = 0; i < ax.length; i++) { const b = ra * 0.66; L.push({ u0: ax[i] - b / 2, u1: ax[i] + b / 2, v0: 0.3, v1: egH - 0.55, bogen: true }); }
    fwand(S, F, u0, u1, 0, egH - 0.15, -0.7, 0, sockel, L);
    if (c.rustika) for (let y = 0.9; y < egH - 0.6; y += 0.9) fb(S, F, u0, u1, y - 0.04, y + 0.04, 0, 0.03, dunkler(sockel, 0.08));
  } else {
    for (let i = 0; i <= ax.length; i++) {
      const u = i < ax.length ? ax[i] - ra / 2 : ax[ax.length - 1] + ra / 2;
      fb(S, F, u - 0.5, u + 0.5, 0.3, egH - 0.15, -0.95, 0, sockel);
      fb(S, F, u - 0.62, u + 0.62, 0.3, 0.75, -1.05, 0.1, dunkler(sockel, 0.08));
      fb(S, F, u - 0.62, u + 0.62, egH - 0.85, egH - 0.6, -1.05, 0.1, c.orn);
    }
    fb(S, F, u0, u1, egH - 0.6, egH - 0.15, -0.95, 0.02, c.orn);
  }
  // Ladenfronten hinter der Arkade
  const FL = teil(F, u0, u1, -A);
  for (let i = 0; i < ax.length; i++) {
    const u = ax[i] - u0;
    fb(S, FL, u - ra / 2 + 0.25, u + ra / 2 - 0.25, 0.3, egH - 1.1, 0, 0.06, GLAS_HELL);
    fb(S, FL, u - 0.06, u + 0.06, 0.3, egH - 1.1, 0, 0.12, STAHL);
    fb(S, FL, u - ra / 2 + 0.2, u + ra / 2 - 0.2, egH - 1.1, egH - 0.6, 0, 0.1, '#3a3f44');
  }
  for (let i = 1; i < ax.length - 1; i += 3) ftext(scene, FL, LAEDEN[hash(i, o.salz ?? 1) % LAEDEN.length], ax[i] - u0, egH - 0.85, 0.12, 0.42, ra * 2.6, '#f2e7c9');
}
/** Eckturm der Magistrale. xa, za: Grundriss-Ecke, tw: Kantenlänge. */
function magTurm(S, scene, xa, za, tw, c, r, o) {
  const { egH, gh, orn, wand } = c;
  const H = o.H, Ht = H + o.extra * gh;
  S.quader(xa + 0.4, egH, za + 0.4, xa + tw - 0.4, Ht, za + tw - 0.4, GLAS);
  for (const F of [RZ(xa, za, tw, tw), RX(xa, za, tw, tw)]) {
    const ax = achsen(0, tw, tw / 3, 0.9);
    const L = [];
    for (let k = 0; k < o.n + o.extra; k++) { const y = egH + k * gh; for (const u of ax) L.push({ u0: u - 0.68, u1: u + 0.68, v0: y + 0.9, v1: y + 2.6, bogen: k >= o.n }); }
    fwand(S, F, 0, tw, egH, Ht, -0.4, 0, wand, L);
    for (const l of L) fb(S, F, l.u0 - 0.15, l.u1 + 0.15, l.v0 - 0.12, l.v0, 0, 0.22, orn);
    fb(S, F, -0.1, 0.8, egH, Ht, 0, 0.3, orn); fb(S, F, tw - 0.8, tw + 0.1, egH, Ht, 0, 0.3, orn);
    fb(S, F, -0.3, tw + 0.3, egH - 0.15, egH + 0.3, -0.4, 0.55, orn);
    fb(S, F, -0.6, tw + 0.6, H, H + 0.7, -0.4, 1.0, orn);
    fb(S, F, -0.3, tw + 0.3, Ht - 2 * gh, Ht - 2 * gh + 0.4, -0.4, 0.6, orn);
    balustrade(S, F, -0.6, tw + 0.6, H + 0.7, H + 1.8, 0.4, 0.7, orn, 0.45);
  }
  S.quader(xa - 0.7, Ht, za - 0.7, xa + tw + 0.7, Ht + 0.8, za + tw + 0.7, orn);
  // zweite Stufe: offene Pfeilerhalle
  const t2 = tw * 0.64, xb = xa + (tw - t2) / 2, zb = za + (tw - t2) / 2, h2 = 4.6, y2 = Ht + 0.8;
  S.quader(xb + 1.0, y2, zb + 1.0, xb + t2 - 1.0, y2 + h2, zb + t2 - 1.0, GLAS);
  for (let i = 0; i <= 3; i++) {
    const s = (i / 3) * (t2 - 0.7) + 0.35;
    S.box(0.7, h2, 0.7, xb + s, y2 + h2 / 2, zb + t2 - 0.35, orn);
    S.box(0.7, h2, 0.7, xb + t2 - 0.35, y2 + h2 / 2, zb + s, orn);
  }
  balustrade(S, RZ(xb, zb, t2, t2), 0, t2, y2, y2 + 1.0, -0.1, 0.12, orn, 0.4);
  balustrade(S, RX(xb, zb, t2, t2), 0, t2, y2, y2 + 1.0, -0.1, 0.12, orn, 0.4);
  S.quader(xb - 0.4, y2 + h2, zb - 0.4, xb + t2 + 0.4, y2 + h2 + 0.6, zb + t2 + 0.4, orn);
  const cx = xa + tw / 2, cz = za + tw / 2, y3 = y2 + h2 + 0.6;
  if (o.helm === 'kuppel') {
    zyl(S, t2 * 0.32, t2 * 0.32, 2.6, cx, y3, cz, wand, 8);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI + PI / 8; S.box(0.35, 2.6, 0.35, cx + Math.cos(a) * t2 * 0.33, y3 + 1.3, cz + Math.sin(a) * t2 * 0.33, orn); }
    const g = new THREE.SphereGeometry(t2 * 0.36, 12, 6, 0, 2 * PI, 0, PI / 2); g.scale(1, 1.25, 1); g.translate(cx, y3 + 2.6, cz); S.add(g, c.helmFarbe ?? '#7aa68a');
    zyl(S, 0.08, 0.22, 4.5, cx, y3 + 2.6 + t2 * 0.42, cz, '#d8b45a', 6);
    return y3 + 2.6 + t2 * 0.42 + 4.5;
  }
  const g = walmdach(t2 + 0.6, t2 + 0.6, 3.4); g.translate(cx, y3, cz); S.add(g, c.helmFarbe ?? '#7aa68a');
  zyl(S, 0.1, 0.25, 5, cx, y3 + 3.2, cz, '#d8b45a', 6);
  return y3 + 8.2;
}
function treppenGiebel(S, F, u0, u1, y, h, wand, orn, stufen = 4) {
  const b = u1 - u0, st = h / (stufen + 1), dx = b / (2 * (stufen + 1));
  const pk = [[u0, y], [u1, y]];
  for (let s = 0; s <= stufen; s++) { pk.push([u1 - s * dx, y + (s + 1) * st]); pk.push([u1 - (s + 1) * dx, y + (s + 1) * st]); }
  for (let s = stufen; s >= 0; s--) { pk.push([u0 + (s + 1) * dx, y + (s + 1) * st]); pk.push([u0 + s * dx, y + (s + 1) * st]); }
  // doppelte Punkte am First entfernen
  const sauber = pk.filter((q, i) => i === 0 || wurzelSumme(q[0] - pk[i - 1][0], q[1] - pk[i - 1][1]) > 0.01);
  fpoly(S, F, sauber, -0.5, 0.15, wand);
  const m = (u0 + u1) / 2;
  for (const f of [-0.28, 0, 0.28]) { const hh = h * (f === 0 ? 0.62 : 0.42); fb(S, F, m + f * b - 0.32, m + f * b + 0.32, y + 0.6, y + 0.6 + hh, 0.15, 0.2, orn); }
  fscheibe(S, F, m, y + h * 0.78, 0.15, 0.22, 0.45, GLAS, 12);
  for (let s = 0; s <= stufen; s++) { fb(S, F, u1 - s * dx - 0.4, u1 - s * dx + 0.05, y + (s + 1) * st, y + (s + 1) * st + 0.15, -0.5, 0.25, orn); fb(S, F, u0 + s * dx - 0.05, u0 + s * dx + 0.4, y + (s + 1) * st, y + (s + 1) * st + 0.15, -0.5, 0.25, orn); }
}
function gauben(S, F, u0, u1, H, T, dh, c, ra) {
  const neig = dh / (T / 2);
  for (const u of achsen(u0, u1, ra * 2, 1.5)) {
    const tf = -1.4, yb = H + -tf * neig;
    fb(S, F, u - 0.85, u + 0.85, H, yb + 1.7, -3.8, tf, c.wand);
    fb(S, F, u - 0.45, u + 0.45, yb + 0.25, yb + 1.35, tf, tf + 0.05, GLAS);
    fb(S, F, u - 1.05, u + 1.05, yb + 1.7, yb + 1.92, -3.9, tf + 0.25, c.dach);
  }
}
/**
 * Hofseite der Magistrale: schlichter Putz, gleiche Achsen, Treppenhäuser mit halbgeschossig versetzten Fenstern und
 * Hauseingängen mit Vordach, einfache Stahlbalkone, Sockel, schmale Gesimse.
 */
function magHof(S, scene, F, c, r, o = {}) {
  const { egH, gh, n, ra } = c, H = egH + n * gh, L = F.L;
  const wand = c.hofWand ?? dunkler(c.wand, 0.03), orn = c.orn;
  const ax = achsen(0.4, L - 0.4, ra, 0.6);
  const tr = (i) => i % 6 === 3;
  const balkon = (i, k) => k >= 1 && k <= n - 1 && (i % 6 === 1 || i % 6 === 5) && i > 0 && i < ax.length - 1;
  const loecher = [];
  ax.forEach((u, i) => {
    if (tr(i)) {
      loecher.push({ u0: u - 0.8, u1: u + 0.8, v0: 0.3, v1: 2.7, bogen: !!c.bogenOben });
      for (let k = 0; k < n + 1; k++) { const y = egH - gh * 0.5 + k * gh; if (y + 2 < H - 0.4 && y > 3) loecher.push({ u0: u - 0.5, u1: u + 0.5, v0: y + 0.6, v1: y + 1.8 }); }
      return;
    }
    loecher.push({ u0: u - 0.6, u1: u + 0.6, v0: 1.6, v1: egH - 0.9 });
    for (let k = 0; k < n; k++) { const y = egH + k * gh; loecher.push({ u0: u - 0.62, u1: u + 0.62, v0: balkon(i, k) ? y + 0.25 : y + 0.95, v1: y + 2.45 }); }
  });
  fwand(S, F, 0, L, 0, H, -0.4, 0, wand, loecher);
  ax.forEach((u, i) => {
    if (tr(i)) {
      fb(S, F, u - 1.3, u + 1.3, 2.85, 3.05, 0, 1.4, orn);
      fb(S, F, u - 0.75, u + 0.75, 0.3, 2.6, -0.3, -0.22, '#6b4c36');
      fb(S, F, u - 1.0, u + 1.0, 0.3, 0.5, 0, 1.2, PFLASTER);
      return;
    }
    for (let k = 0; k < n; k++) {
      const y = egH + k * gh;
      if (!balkon(i, k)) fb(S, F, u - 0.75, u + 0.75, y + 0.82, y + 0.95, 0, 0.18, orn);
      else {
        fb(S, F, u - 1.2, u + 1.2, y + 0.05, y + 0.25, 0, 1.25, '#d9d4c8');
        fb(S, F, u - 1.2, u + 1.2, y + 1.15, y + 1.22, 1.15, 1.25, STAHL);
        for (const du of [-1.15, -0.4, 0.4, 1.15]) fb(S, F, u + du - 0.03, u + du + 0.03, y + 0.25, y + 1.15, 1.17, 1.22, STAHL);
      }
    }
  });
  fb(S, F, -0.05, L + 0.05, 0, 0.9, -0.4, 0.12, c.sockel);
  fb(S, F, -0.05, L + 0.05, egH - 0.12, egH + 0.12, -0.4, 0.2, orn);
  fb(S, F, -0.3, L + 0.3, H - 0.05, H + 0.45, -0.4, 0.5, orn);
  if (o.schild) ftext(scene, F, o.schild, ax[0] + 2, egH - 0.5, 0.05, 0.38, 6, '#5a4a3a');
  return H;
}
function magistraleRoh(S, scene, p) {
  const r = rng(`mg:${p.seed}`);
  const v = p.variante ?? ({ Nord: 'rostock', Mitte: 'dresden', Süd: 'dresden', Ost: 'berlin' }[p.region] ?? waehle(r, ['berlin', 'rostock', 'dresden']));
  const c = { ...MAG[v] };
  c.n = c.n[0] + (r() < 0.5 ? 0 : c.n[1] - c.n[0]);
  if (v === 'berlin') Object.assign(c, { lisenen: true, balkone: true, arkade: 'pfeiler', dreieck: r() < 0.5 });
  if (v === 'rostock') Object.assign(c, { arkade: 'bogen', faschen: c.orn, kranz: false, fw: 0.6 });
  if (v === 'dresden') Object.assign(c, { arkade: 'bogen', rustika: true, balkone: r() < 0.5, bogenOben: true, dreieck: true });
  const { x: x0, z: z0, w, d } = p;
  const sk = sicht(p), gedrehtGebaut = !(sk.vorn && sk.rechts);
  const T = Math.min(15, d), zA = z0 + d - T;
  const fluegel = d >= T + 10 && !gedrehtGebaut;
  const H = c.egH + c.n * c.gh;
  const A = 3.4;
  // Kern (mit sichtbarer Hofseite bzw. linker Stirn sitzt deren Fassade bündig auf dem Kern)
  const kz0 = sk.hinten ? zA + 0.4 : zA, kx0 = sk.links ? x0 + 0.4 : x0;
  S.quader(sk.links ? x0 + A : x0, 0, kz0, x0 + w - A, c.egH, z0 + d - A, GLAS);
  S.quader(kx0, c.egH, kz0, x0 + w - 0.4, H, z0 + d - 0.4, GLAS);
  S.quader(x0, H - 0.05, zA, x0 + w - 0.4, H + 0.1, z0 + d - 0.4, c.dach);
  if (gedrehtGebaut && d > T + 3) hofGruen(S, r, x0, z0, x0 + w, zA - 0.5, { maxBaeume: 6, weg: false });
  const FR = sk.hinten ? R(x0 + w - 0.4, zA, -1, 0, w - 0.4) : null, FL = sk.links ? R(x0, zA, 0, 1, T - 0.4) : null;
  if (FR) magHof(S, scene, FR, c, r, { schild: r() < 0.5 ? waehle(r, ['Hausgemeinschaft', 'Wäscherei', 'Hof 2']) : null });
  if (fluegel) {
    S.quader(x0 + w - T, 0, z0, x0 + w - A, c.egH, zA, GLAS);
    S.quader(x0 + w - T, c.egH, z0, x0 + w - 0.4, H, zA, GLAS);
    S.quader(x0 + w - T, H - 0.05, z0, x0 + w - 0.4, H + 0.1, zA, c.dach);
    hofGruen(S, r, x0, z0, x0 + w - T, zA, { spiel: false, waesche: false, maxBaeume: 6 });
  }
  const FZ = RZ(x0, z0, w, d), FX = fluegel ? RX(x0, z0, w, d) : R(x0 + w, z0 + d, 0, -1, T);
  const turm = !gedrehtGebaut && (v === 'berlin' || (v === 'dresden' && r() < 0.0));
  const tw = 10;
  const zonenZ = turm ? { u0: 0, u1: w - tw + 0.2 } : {}, zonenX = turm ? { u0: tw - 0.2, u1: FX.L } : {};
  let top = H + 1;
  const fassaden = [[FZ, zonenZ, sk.vorn], [FX, zonenX, sk.rechts], [FL, {}, !!FL]].filter(([F, , an]) => F && an);
  for (const [F, z] of fassaden) {
    magArkade(S, scene, F, c, r, { A, salz: p.seed + F.L });
    magFassade(S, scene, F, c, r, z);
  }
  const traufe = [...fassaden.map(([F, z]) => [F, z]), ...(FR ? [[FR, {}]] : [])];
  if (turm) {
    top = Math.max(top, magTurm(S, scene, x0 + w - tw + 0.6, z0 + d - tw + 0.6, tw, c, r, { H, n: c.n, extra: 5, helm: r() < 0.5 ? 'kuppel' : 'pyramide' }));
    if (w > 85) top = Math.max(top, magTurm(S, scene, x0 + 2, z0 + d - tw + 0.6, tw, c, r, { H, n: c.n, extra: 5, helm: 'kuppel' }));
  }
  // Dach
  if (v === 'berlin') {
    for (const [F, z] of traufe) balustrade(S, F, z.u0 ?? 0, z.u1 ?? F.L, H + (F === FR ? 0.45 : 0.7), H + (F === FR ? 1.4 : 1.9), 0.15, 0.45, c.orn, 0.5);
    S.quader(x0 + w * 0.3, H, zA + 3, x0 + w * 0.3 + 6, H + 2.2, zA + 7, '#cfc8b8');
  } else if (v === 'rostock') {
    const dh = 6.5;
    const g = dachProfil(w - 0.2, T + 0.8, dh, 0.3, 'x'); g.translate(x0 + w / 2 - 0.1, H, zA + T / 2); S.add(g, c.dach);
    if (fluegel) { const g2 = dachProfil(d - T, T + 0.8, dh, 0.3, 'z'); g2.translate(x0 + w - T / 2, H, z0 + (d - T) / 2); S.add(g2, c.dach); }
    for (const F of traufe.map(([F]) => F).filter((F) => F !== FL)) {
      fb(S, F, -0.3, F.L + 0.3, H - 0.1, H + 0.25, -0.4, 0.35, c.orn);
      if (F === FR) continue;
      const bay = c.ra * 3, nb = Math.floor((F.L - 2) / bay), off = (F.L - nb * bay) / 2;
      for (let i = 0; i < nb; i++) if ((i + (F === FX ? 1 : 0)) % 2 === 0 || F.L < 20) treppenGiebel(S, F, off + i * bay + 0.3, off + (i + 1) * bay - 0.3, H + 0.25, zw(r, 6.5, 8), c.wand, c.orn, 3 + (i % 2));
    }
    if (!fluegel && sk.rechts) treppenGiebel(S, endeRechts(FZ, T), 0.2, T - 0.2, H + 0.25, dh, c.wand, c.orn, 4);
    if (FL) treppenGiebel(S, endeLinks(FZ, T), 0.2, T - 0.2, H + 0.25, dh, c.wand, c.orn, 4);
    if (FR) gauben(S, FR, 2, w - 2, H, T, dh, c, c.ra);
    top = H + 8.5;
  } else {
    const dh = 7.0;
    const g = dachProfil(w - T / 2, T + 0.8, dh, 0.3, 'x'); g.translate(x0 + (w - T / 2) / 2, H + 0.7, zA + T / 2); S.add(g, c.dach);
    const pyr = walmdach(T + 0.8, T + 0.8, dh); pyr.translate(x0 + w - T / 2, H + 0.7, zA + T / 2); S.add(pyr, c.dach);
    if (fluegel) { const g2 = dachProfil(d - T, T + 0.8, dh, 0.3, 'z'); g2.translate(x0 + w - T / 2, H + 0.7, z0 + (d - T) / 2); S.add(g2, c.dach); }
    if (sk.vorn) gauben(S, FZ, 2, w - T, H + 0.7, T, dh, c, c.ra);
    if (fluegel) gauben(S, FX, T, d - 2, H + 0.7, T, dh, c, c.ra);
    if (FR) { fb(S, FR, -0.3, FR.L + 0.3, H, H + 0.7, -0.6, 0.6, c.orn); gauben(S, FR, T * 0.6, FR.L - 2, H + 0.7, T, dh, c, c.ra); }
    if (FL) fb(S, FL, -0.3, FL.L + 0.3, H, H + 0.7, -0.6, 0.6, c.orn);
    // Mittelrisalit mit Dreiecksgiebel
    if (!sk.vorn) return { hoehe: H + 8 };
    const rb = c.ra * 5, ur0 = w * 0.42 - rb / 2, ur1 = ur0 + rb, FRis = teil(FZ, ur0, ur1, 0.9);
    fb(S, FZ, ur0, ur1, c.egH + 0.3, H, 0, 0.5, GLAS);
    const ax = achsen(0, rb, c.ra, 0.4), L = [];
    for (let k = 0; k < c.n; k++) for (const u of ax) L.push({ u0: u - 0.7, u1: u + 0.7, v0: c.egH + k * c.gh + 0.9, v1: c.egH + k * c.gh + 2.6, bogen: k === 0 });
    fwand(S, FRis, 0, rb, c.egH + 0.3, H, -0.4, 0, c.wand, L);
    fb(S, FZ, ur0, ur0 + 0.5, c.egH + 0.3, H, 0, 0.9, c.wand); fb(S, FZ, ur1 - 0.5, ur1, c.egH + 0.3, H, 0, 0.9, c.wand);
    for (const l of L) fb(S, FRis, l.u0 - 0.2, l.u1 + 0.2, l.v0 - 0.12, l.v0, 0, 0.22, c.orn);
    for (let i = 0; i <= ax.length; i += 1) { const u = i < ax.length ? ax[i] - c.ra / 2 : rb - 0.3; if (i === 0) continue; fb(S, FRis, u - 0.25, u + 0.25, c.egH + c.gh, H - 0.4, 0, 0.25, c.orn); }
    fb(S, FRis, -0.4, rb + 0.4, H, H + 0.7, -1.0, 0.6, c.orn);
    fpoly(S, FRis, [[-0.3, H + 0.7], [rb + 0.3, H + 0.7], [rb / 2, H + 4.4]], -3, 0.2, c.wand);
    fpoly(S, FRis, [[-0.6, H + 0.6], [rb + 0.6, H + 0.6], [rb / 2, H + 4.75], [rb / 2, H + 4.45], [rb - 0.2, H + 0.95], [0.2, H + 0.95], [rb / 2, H + 4.45], [rb / 2, H + 4.75]], -0.2, 0.45, c.orn);
    fscheibe(S, FRis, rb / 2, H + 2.2, 0.2, 0.3, 0.7, GLAS, 14);
    top = H + 8;
  }
  return { hoehe: top };
}
function magistraleLokal(S, scene, p) {
  if (p.w >= 40 && p.d >= 15) return magistraleRoh(S, scene, p);
  return skaliert(S, scene, p, Math.max(40, p.w), Math.max(15, p.d), magistraleRoh);
}
/** Magistrale (50er). p.front dreht den Bau; die zur Kamera zeigende Hofseite bekommt Eingänge, Balkone, Treppenhäuser. */
const magistrale = gedreht(magistraleLokal);

// =====================================================================================
// Bandfassade (Interhotel, Zentrum, Schule): Brüstungsbänder + Fensterbänder + Lisenen
// =====================================================================================
function bandFassade(S, F, o) {
  const { n, gh, y0 } = o, L = F.L, H = y0 + n * gh;
  fb(S, F, 0, L, y0, H, -1.0, -0.1, o.glas ?? GLAS);
  for (let k = 0; k < n; k++) {
    const y = y0 + k * gh;
    fb(S, F, -0.05, L + 0.05, y, y + (o.bru ?? 1.0), -0.3, 0.2, k % 2 && o.bruest2 ? o.bruest2 : o.bruest);
    if (o.sims) fb(S, F, -0.05, L + 0.05, y + (o.bru ?? 1.0), y + (o.bru ?? 1.0) + 0.08, -0.1, 0.3, o.sims);
  }
  fb(S, F, -0.05, L + 0.05, H, H + 0.8, -0.3, 0.25, o.bruest);
  const ra = o.raster ?? 3.0, nr = Math.max(1, Math.round(L / ra));
  for (let i = 0; i <= nr; i++) { const u = (i * L) / nr; fb(S, F, u - (o.rb ?? 0.12), u + (o.rb ?? 0.12), y0, H, -0.1, o.rt ?? 0.12, o.rippe ?? o.bruest); }
  return H;
}
/** Laden-Pavillon (Flachbau, 1 bis 2 Geschosse) mit Glasfront, Blende, Kragdach, Schildern. o.sichtbar: Seiten mit Glasfront (Standard +z, +x). */
function ladenpavillon(S, scene, x0, z0, w, d, r, o = {}) {
  const g = o.geschosse ?? 1, eh = 4.2, H = eh * g + 0.4;
  const blende = o.blende ?? '#e9e6de', wand = o.wand ?? '#d9d4c8';
  const vis = o.sichtbar ?? ['+z', '+x'], ein = (q) => (vis.includes(q) ? 1.6 : 0);
  S.quader(x0 + ein('-x'), 0, z0 + ein('-z'), x0 + w - ein('+x'), H, z0 + d - ein('+z'), wand);
  for (const F of vis.map((q) => SEITE_RAHMEN[q](x0, z0, w, d))) {
    const L = F.L;
    fb(S, F, 0, L, 0.3, eh - 0.6, -1.6, -1.5, GLAS_HELL);
    for (let u = 1.6; u < L - 0.5; u += 2.0) fb(S, F, u - 0.05, u + 0.05, 0.3, eh - 0.6, -1.6, -1.4, STAHL);
    fb(S, F, 0, L, eh - 0.6, eh, -1.6, -0.2, '#3a3f44');
    if (o.stuetzen !== false) for (let u = 0.3; u < L; u += 6) fb(S, F, u - 0.2, u + 0.2, 0.3, eh, -0.4, 0, '#d9d6cf');
    if (g > 1) {
      if (o.mosaik && F.L > 14) { fb(S, F, 0, L, eh, H - 0.4, -1.6, -0.05, wand); mosaik(S, F, 1.5, L - 1.5, eh + 0.6, H - 1.2, 0, r, { nv: 4 }); }
      else { for (let u = 0; u < L - 0.1; u += 3) fb(S, F, u + 0.05, Math.min(L, u + 3) - 0.05, eh, H - 0.4, -1.6, -0.05, (u / 3) % 2 ? blende : dunkler(blende, 0.04)); }
    }
    fb(S, F, -0.6, L + 0.6, H - 0.4, H + 0.2, -1.6, 1.2, blende);
    fb(S, F, -0.6, L + 0.6, H + 0.2, H + 0.32, -1.6, 1.25, '#c9cdd0');
    const namen = o.namen ?? [];
    const nn = Math.min(namen.length, Math.max(1, Math.floor(L / 12)));
    for (let i = 0; i < nn; i++) ftext(scene, F, namen[(i + (F.dx === 0 ? 2 : 0)) % namen.length], ((i + 0.5) * L) / nn, H - 0.1, 1.27, 0.5, L / nn - 2, o.schrift ?? '#c8463c');
  }
  S.quader(x0 + 3, H + 0.2, z0 + 3, x0 + 7, H + 1.4, z0 + 6, '#c9cdd0');
  return H + 1.4;
}
const ZENTRUM_LAEDEN = ['Mode für Sie', 'Gaststätte', 'Spielwaren', 'Schuhhaus', 'Uhren · Schmuck', 'Café', 'Haushaltwaren', 'Bücher', 'Sportartikel', 'Blumen', 'Delikatessen', 'Foto · Kino'];

// =====================================================================================
// Plattenbau Zentrum
// =====================================================================================
function platteZentrumRoh(S, scene, p) {
  const r = rng(`pz:${p.seed}`);
  const v = p.variante ?? waehle(r, ['prager', 'arkade', 'ensemble']);
  const zustand = p.zustand ?? (r() < 0.5 ? 'saniert' : 'unsaniert');
  const fa = plattenFarben(r, zustand);
  const { x: x0, z: z0, w, d } = p;
  const namen = [...ZENTRUM_LAEDEN].sort((a, b) => hash(a.length, p.seed) % 7 - hash(b.length, p.seed) % 7);
  boden(S, x0, z0, x0 + w, z0 + d, PFLASTER, 0.3, 0.07);
  let top = 0;
  if (v === 'prager') {
    const T = 14, zf = z0 + Math.max(T + 4, d * 0.42), L = w - 10;
    const F = R(x0 + 4, zf, 1, 0, L);
    const cols = spalten(L, [['F', 3.6], ['F', 3.6], ['F', 3.6], ['F', 3.6], ['T', 2.4]]);
    const mitte = cols[Math.floor(cols.length / 2)];
    // Zur Kamera: Ladenseite (vorn) oder Hofseite mit Loggien (hinten), Giebel mit Wandbild an der sichtbaren Stirn
    const sk = sicht(p);
    top = plattenBlock(S, F, T, { fa, r, n: 12, cols, baender: true, aufzug: true, durchgang: [mitte.u0 - 4, mitte.u1 + 4], giebel: { rechts: sk.rechts, links: sk.links }, art: 'glatt', salz: 2, treppeFarbig: fa.saniert, vorn: sk.vorn, rueck: sk.hinten });
    const G = sk.rechts ? endeRechts(F, T) : endeLinks(F, T), Hs = 1.1 + 12 * 2.8;
    mosaik(S, G, 1.5, T - 1.5, Hs * 0.35, Hs - 3, 0.12, r, { motiv: 'sonne' });
    // Ladenpavillon vor der Scheibe
    const px0 = x0 + w * 0.38, pz0 = zf + 7;
    if (z0 + d - 5 - pz0 > 8) top = Math.max(top, ladenpavillon(S, scene, px0, pz0, x0 + w - 5 - px0, z0 + d - 5 - pz0, r, { geschosse: 2, namen, mosaik: true, sichtbar: p.sichtbar }));
    // Platz mit Brunnen
    const bx = x0 + w * 0.2, bz = zf + (z0 + d - zf) / 2 + 1;
    brunnen(S, bx, bz, Math.min(6, (z0 + d - zf) / 3), { duesen: 7, hoch: 4 });
    brunnen(S, bx + 13, bz + 2, 3, { duesen: 4 });
    for (let i = 0; i < 4; i++) { S.box(2.2, 0.45, 0.6, bx - 6 + i * 4.5, 0.6, z0 + d - 3, '#8a6a4a'); }
    for (const lx of [x0 + 6, x0 + w * 0.32]) laterne(S, lx, z0 + d - 2, 7, 0.36, 'kugel');
    for (let i = 0; i < 3; i++) { const bxx = x0 + 6 + i * 8; S.quader(bxx, 0.36, zf + 2, bxx + 5, 0.9, zf + 4.2, '#bdb7aa'); S.quader(bxx + 0.3, 0.9, zf + 2.3, bxx + 4.7, 1.0, zf + 3.9, '#d9734a'); }
    formsteinwand(S, R(x0 + 3, zf + 5.5, 1, 0, 10), 0, 10, 0.36, 2.8, -0.15, 0.15, '#d8d3c6', 'kreis');
    if (sk.hinten) {
      // Hofseite: Wohnweg, Parkreihe und Bäume zwischen Scheibe und hinterer Straße
      const zh = zf - T - 1.2;
      boden(S, x0 + 3, zh - 2.4, x0 + w - 3, zh - 0.4, WEG, 0.3, 0.1);
      if (zh - z0 > 9) { boden(S, x0 + 3, z0 + 1, x0 + w - 3, z0 + 6, ASPHALT, 0.3, 0.06); parkreihe(S, r, x0 + 4, x0 + w - 4, z0 + 3.5, { modern: fa.saniert ? 0.6 : 0.05, dichte: 0.6 }); }
      for (let u = x0 + 8; u < x0 + w - 6; u += 11) if (zh - z0 > 12) baum(S, u, zh - 4.5, r, 0.9);
    }
  } else if (v === 'arkade') {
    const T = 12, zf = z0 + d - 4, L = w - 8;
    const F = R(x0 + 2, zf, 1, 0, L);
    const cols = spalten(L, MUSTER.wbs70b);
    const sk = sicht(p);
    top = plattenBlock(S, F, T, { fa, r, n: p.geschosse && p.geschosse > 5 ? Math.min(14, p.geschosse) : 5, cols, y0: 4.6, laden: true, eingang: false, giebel: { rechts: sk.rechts, links: sk.links }, art: fa.saniert ? 'feld' : 'rippen', balkone: false, salz: 1, rueck: sk.hinten, aufzug: (p.geschosse ?? 5) > 8 });
    // Arkade: Pfeiler, Ladenfront zurückgesetzt
    fb(S, F, 0, L, 0, 4.6, -T, -3.6, '#3f4a53');
    fb(S, F, 0, L, 0.3, 3.6, -3.62, -3.5, GLAS_HELL);
    for (let u = 3; u < L; u += 6) { fb(S, F, u - 0.06, u + 0.06, 0.3, 3.6, -3.5, -3.4, STAHL); }
    fb(S, F, 0, L, 3.6, 4.6, -3.6, -3.3, '#2f353a');
    for (const c of cols) if (c.typ !== 'L') fb(S, F, c.u1 - 0.35, c.u1 + 0.35, 0.3, 4.6, -0.8, 0, fa.panel[0]);
    fb(S, F, 0, L, 4.0, 4.6, -1.2, 0.2, fa.attika);
    for (let i = 0; i < Math.floor(L / 12); i++) ftext(scene, teil(F, 0, L, -3.3), namen[i % namen.length], 6 + i * 12, 4.1, 0.05, 0.5, 9, '#f4e9c8');
    boden(S, x0, zf - 3.6, x0 + w, z0 + d, PFLASTER, 0.3, 0.09);
    // Formsteinwand vor dem Giebel und Wandbild
    const G = endeRechts(F, T);
    formsteinwand(S, teil(G, 0.5, T - 0.5, 2.2), 0, T - 1, 0.36, 4.0, -0.15, 0.15, '#dcd6c8', waehle(r, ['kreis', 'raute', 'schlitz']));
    mosaik(S, G, 1.5, T - 1.5, 6.5, top - 3, 0.12, r, { motiv: 'bänder' });
    for (let i = 0; i < 4; i++) { const bx = x0 + 6 + i * (w - 12) / 3; S.quader(bx - 1.5, 0.36, z0 + d - 2.4, bx + 1.5, 0.9, z0 + d - 1.2, '#bdb7aa'); busch(S, bx, z0 + d - 1.8, r, 0.8); }
    hofGruen(S, r, x0, z0, x0 + w, zf - T, { spiel: false, waesche: false, maxBaeume: 5 });
    if (sk.links) { const GL = endeLinks(F, T); mosaik(S, GL, 1.5, T - 1.5, 6.5, top - 3, 0.12, r, { motiv: 'sonne' }); }
  } else if (v === 'luecke') {
    // Plattenbau in der Altbaulücke (80er): fünf Geschosse auf Ladensockel, Giebel als Brandwand, Mansard-Aufsatz
    const T = Math.min(12, d - 1), zf = z0 + d, L = w - 0.4, sk = sicht(p);
    const F = R(x0 + 0.2, zf, 1, 0, L);
    const cols = spalten(L, [['F', 3.6], ['L', 3.0], ['F', 3.6]], 0.6);
    const n = p.geschosse ?? 5;
    top = plattenBlock(S, F, T, { fa, r, n, cols, y0: 4.2, laden: true, eingang: false, giebel: { rechts: sk.rechts, links: sk.links }, art: 'glatt', balkone: false, salz: 4, rueck: sk.hinten, aufsatz: fa.saniert ? 'flach' : false });
    fb(S, F, 0, L, 0, 4.2, -T, -2.0, '#3f4a53');
    fb(S, F, 0.3, L - 0.3, 0.3, 3.4, -2.02, -1.9, GLAS_HELL);
    for (let u = 2.4; u < L - 1; u += 4.8) fb(S, F, u - 0.06, u + 0.06, 0.3, 3.4, -1.9, -1.8, STAHL);
    fb(S, F, 0, L, 3.4, 4.2, -2.0, 0.25, fa.attika);
    ftext(scene, F, namen[0], L / 2, 3.8, 0.27, 0.5, L * 0.7, '#c8463c');
    if (d > T + 2) hofGruen(S, r, x0, z0, x0 + w, zf - T, { spiel: false, waesche: false, teppich: false, weg: false, maxBaeume: 2 });
  } else {
    // Ensemble: Hochhaus + Ladenpavillon + Brunnen
    const a = 20, px = x0 + w - a - 6, pz = z0 + 4;
    top = punkthaus(S, px, pz, a, a, { fa, r, n: 17, treppe: 'links', sichtbar: p.sichtbar });
    const pz0 = pz + a + 6, pw = w - 10;
    if (z0 + d - 4 - pz0 > 7) ladenpavillon(S, scene, x0 + 4, pz0, Math.min(pw * 0.6, 34), z0 + d - 4 - pz0, r, { geschosse: 2, namen, mosaik: true, blende: '#efe9dc', sichtbar: p.sichtbar });
    brunnen(S, x0 + w - 12, z0 + d - 10, 4.5, { duesen: 6, hoch: 3.6, schale: true });
    formsteinwand(S, R(x0 + 4, pz + a - 2, 1, 0, 14), 0, 14, 0.36, 3.2, -0.15, 0.15, '#d8d3c6', 'raute');
    for (let i = 0; i < 4; i++) baum(S, x0 + 6 + i * 7, pz + 6, r, 1);
    laterne(S, x0 + w - 4, z0 + d - 3, 7, 0.36, 'kugel');
  }
  return { hoehe: top };
}
const ZENTRUM_MIN = { prager: [70, 46], arkade: [30, 22], ensemble: [50, 48], luecke: [12, 12] };
function platteZentrumLokal(S, scene, p) {
  const min = ZENTRUM_MIN[p.variante];
  if (p.w >= min[0] && p.d >= min[1]) return platteZentrumRoh(S, scene, p);
  return skaliert(S, scene, p, Math.max(min[0], p.w), Math.max(min[1], p.d), platteZentrumRoh);
}
const platteZentrumGedreht = gedreht(platteZentrumLokal);
/** 70er-Zentrum. Alle Varianten (Prager Zeile, Arkade, Ensemble, Lückenbau) lassen sich mit p.front in alle vier Richtungen drehen. */
function platteZentrum(S, scene, p) {
  const v = p.variante ?? waehle(rng(`pz:${p.seed}`), ['prager', 'arkade', 'ensemble']);
  return platteZentrumGedreht(S, scene, { ...p, variante: v });
}

// =====================================================================================
// Kulturhaus / Kulturpalast / Stadthalle
// =====================================================================================
function freitreppe(S, F, u0, u1, hoehe, stufen, tiefe, farbe) {
  for (let i = 0; i < stufen; i++) fb(S, F, u0, u1, 0, hoehe * (stufen - i) / stufen + 0.3, 0, tiefe * (i + 1) / stufen, i % 2 ? farbe : dunkler(farbe, 0.03));
}
function kulturRoh(S, scene, p) {
  const r = rng(`kh:${p.seed}`);
  const v = p.variante ?? waehle(r, ['palast', 'stadthalle', 'kulturhaus50']);
  const { x: x0, z: z0, w, d } = p;
  boden(S, x0, z0, x0 + w, z0 + d, PFLASTER, 0.3, 0.07);
  if (v === 'palast') {
    const bw = Math.min(w - 8, 76), bd = Math.min(d - 14, 46), bx = x0 + (w - bw) / 2, bz = z0 + 4, H = 15, pl = 1.5;
    S.quader(bx - 3, 0, bz - 2, bx + bw + 3, pl, bz + bd + 4, '#d8d2c4');
    const FP = RZ(bx - 3, bz - 2, bw + 6, bd + 6);
    freitreppe(S, FP, 4, bw + 2, pl, 5, 4, '#d8d2c4');
    S.quader(bx, pl, bz, bx + bw - 1, H, bz + bd - 1, '#33404a');
    const FZ = RZ(bx, bz, bw, bd), FX = RX(bx, bz, bw, bd);
    fb(S, FZ, 0, bw, pl, H - 1.4, -1.0, -0.9, GLAS_HELL);
    for (let u = 0; u <= bw + 0.01; u += bw / Math.round(bw / 1.8)) fb(S, FZ, u - 0.1, u + 0.1, pl, H - 1.4, -1.0, 0.25, '#eeeeea');
    fb(S, FZ, 0, bw, 7.6, 7.85, -1.0, 0.1, '#eeeeea');
    // geschlossene Seitenwand mit großem Wandbild
    fb(S, FX, 0, bd, pl, H, -1.0, 0, '#e6e1d4');
    mosaik(S, FX, 3, bd - 3, pl + 1.5, H - 2.2, 0, r, { motiv: waehle(r, ['sonne', 'figur']) });
    // Kragdach mit Kupferrand
    S.quader(bx - 3.5, H - 1.4, bz - 0.5, bx + bw + 3.5, H - 0.4, bz + bd + 3.5, '#f1efe9');
    S.quader(bx - 3.6, H - 0.4, bz - 0.6, bx + bw + 3.6, H + 0.6, bz + bd + 3.6, '#6f9a7d');
    S.quader(bx - 2.6, H + 0.6, bz + 0.4, bx + bw + 2.6, H + 0.75, bz + bd + 2.6, '#a9a59c');
    for (let u = 3; u < bw; u += 6) fb(S, FZ, u - 0.18, u + 0.18, pl, H - 1.4, 2.6, 3.0, '#eeeeea');
    // Bühnenhaus
    S.quader(bx + bw * 0.35, H + 0.6, bz + 4, bx + bw * 0.72, H + 9, bz + bd * 0.62, '#e6e1d4');
    S.quader(bx + bw * 0.35 - 0.3, H + 9, bz + 3.7, bx + bw * 0.72 + 0.3, H + 9.6, bz + bd * 0.62 + 0.3, '#6f9a7d');
    const FB = RZ(bx + bw * 0.35, bz + 4, bw * 0.37, bd * 0.62 - 4);
    ftext(scene, teil(FZ, 0, bw, 3.62), p.name ?? 'Kulturpalast', bw / 2, H + 0.1, 0.05, 0.8, bw * 0.5, '#f4f1e8');
    for (let i = 0; i < 6; i++) { const fx = x0 + 6 + i * (w - 12) / 5; S.box(0.15, 9, 0.15, fx, 4.8, z0 + d - 2.5, '#d9dcdf'); S.box(1.6, 1.0, 0.05, fx + 0.85, 8.4, z0 + d - 2.5, ['#c8463c', '#2f6fa8', '#e8c547'][i % 3]); }
    brunnen(S, x0 + w * 0.2, z0 + d - 7, 3.5, { duesen: 5 });
    return { hoehe: H + 9.6 };
  }
  if (v === 'stadthalle') {
    const bw = Math.min(w - 8, 64), bd = Math.min(d - 10, 46), bx = x0 + (w - bw) / 2, bz = z0 + 3;
    const fd = 12, Hh = 18, Hf = 8.5;
    // Halle mit Faltwerkdach
    const hz1 = bz + bd - fd;
    S.quader(bx + 2, 0, bz, bx + bw - 2, Hh, hz1, '#d6d0c2');
    const FH = RZ(bx + 2, bz, bw - 4, hz1 - bz);
    for (let u = 0; u < FH.L; u += 3) fb(S, FH, u + 0.06, Math.min(FH.L, u + 3) - 0.06, Hf, Hh, 0, 0.12, (u / 3) % 2 ? '#d6d0c2' : '#ccc5b5');
    const FHX = RX(bx + 2, bz, bw - 4, hz1 - bz);
    for (let u = 0; u < FHX.L; u += 3) fb(S, FHX, u + 0.06, Math.min(FHX.L, u + 3) - 0.06, 0.3, Hh, 0, 0.12, (u / 3) % 2 ? '#cfc8b8' : '#c4bdac');
    mosaik(S, FHX, 4, FHX.L - 4, 3, Hh - 4, 0.12, r, { motiv: 'bänder', nv: 6 });
    const nz = Math.round(FH.L / 6), zb = FH.L / nz, pk = [[0, Hh]];
    for (let i = 0; i < nz; i++) { pk.push([(i + 0.5) * zb, Hh + 3.2]); pk.push([(i + 1) * zb, Hh]); }
    pk.push([FH.L, Hh - 0.6]); pk.push([0, Hh - 0.6]);
    fpoly(S, FH, pk, -(hz1 - bz), 0.4, '#e9e6de');
    // Foyer verglast
    S.quader(bx, 0, hz1 - 1, bx + bw - 1, Hf, bz + bd - 1, '#33404a');
    S.quader(bx, Hf - 0.05, hz1 - 1, bx + bw - 1, Hf + 0.25, bz + bd - 1, '#b9b5ab');
    const FF = RZ(bx, hz1 - 1, bw, fd + 1), FFX = RX(bx, hz1 - 1, bw, fd + 1);
    for (const F of [FF, FFX]) {
      fb(S, F, 0, F.L, 0.3, Hf - 1, -1, -0.92, GLAS_HELL);
      for (let u = 0; u <= F.L + 0.01; u += F.L / Math.round(F.L / 2.4)) fb(S, F, u - 0.07, u + 0.07, 0.3, Hf - 1, -1, -0.8, '#d9dcdf');
      fb(S, F, 0, F.L, 4.3, 4.45, -1, -0.8, '#d9dcdf');
      fb(S, F, -2.5, F.L + 0.5, Hf - 1, Hf + 0.2, -1, 2.5, '#f1efe9');
    }
    ftext(scene, FF, p.name ?? 'Stadthalle', bw * 0.5, Hf - 0.4, 2.55, 0.9, bw * 0.4, '#c8463c');
    freitreppe(S, R(bx + bw * 0.25, bz + bd, 1, 0, bw * 0.5), 0, bw * 0.5, 0.6, 3, 2.4, '#d8d2c4');
    for (let i = 0; i < 5; i++) { const fx = bx + 4 + i * 3.2; S.box(0.15, 10, 0.15, fx, 5.3, z0 + d - 2, '#d9dcdf'); S.box(0.05, 2.6, 1.0, fx + 0.1, 8.7, z0 + d - 2.55, ['#e8c547', '#2f6fa8', '#c8463c', '#3b8a5a', '#f4efe2'][i]); }
    parkreiheZ(S, r, z0 + 3, z0 + d - 4, x0 + w - 2.5, { dichte: 0.6 });
    return { hoehe: Hh + 3.2 };
  }
  // Kulturhaus der 50er: Säulenportikus, Seitenflügel, Dachreiter
  const putz = waehle(r, ['#efe0b8', '#ead8b4', '#e6dcc4']), orn = '#f8f2e2', dach = waehle(r, ['#9a5444', '#7d8a8f']);
  const mb = 22, md = 20, fw = Math.min((w - mb - 8) / 2, 22), fd = 13, cx = x0 + w / 2, zf = z0 + d - 9;
  const H1 = 9.6, Hm = 13.5;
  for (const s of [-1, 1]) {
    const fx0 = s < 0 ? cx - mb / 2 - fw : cx + mb / 2, fz0 = zf - fd - 2;
    S.quader(fx0, 0, fz0, fx0 + fw - (s > 0 ? 0.4 : 0), H1, fz0 + fd - 0.4, GLAS);
    S.quader(fx0, H1 - 0.05, fz0, fx0 + fw - 0.2, H1 + 0.1, fz0 + fd - 0.2, '#a9a59c');
    const F = RZ(fx0, fz0, fw, fd), L = [];
    for (const u of achsen(0, fw, 3.2, 0.8)) for (let k = 0; k < 2; k++) L.push({ u0: u - 0.75, u1: u + 0.75, v0: 1.2 + k * 4.2, v1: 3.5 + k * 4.2, bogen: k === 0 });
    fwand(S, F, 0, fw, 0, H1, -0.4, 0, putz, L);
    for (const l of L) fb(S, F, l.u0 - 0.15, l.u1 + 0.15, l.v0 - 0.12, l.v0, 0, 0.22, orn);
    fb(S, F, -0.3, fw + 0.3, 0, 0.9, -0.4, 0.2, '#c9bb9e'); fb(S, F, -0.5, fw + 0.5, H1, H1 + 0.6, -0.4, 0.7, orn);
    if (s > 0) {
      const FX = RX(fx0, fz0, fw, fd), L2 = [];
      for (const u of achsen(0, fd, 3.2, 0.8)) for (let k = 0; k < 2; k++) L2.push({ u0: u - 0.75, u1: u + 0.75, v0: 1.2 + k * 4.2, v1: 3.5 + k * 4.2, bogen: k === 0 });
      fwand(S, FX, 0, fd, 0, H1, -0.4, 0, putz, L2);
      fb(S, FX, -0.3, fd + 0.3, 0, 0.9, -0.4, 0.2, '#c9bb9e'); fb(S, FX, -0.5, fd + 0.5, H1, H1 + 0.6, -0.4, 0.7, orn);
    }
    const g = walmdach(fw + 1.2, fd + 1.2, 4); g.translate(fx0 + fw / 2, H1 + 0.6, fz0 + fd / 2); S.add(g, dach);
  }
  // Mittelbau
  const mx0 = cx - mb / 2, mz0 = zf - md;
  S.quader(mx0, 0, mz0, mx0 + mb, Hm, zf, putz);
  const FM = RZ(mx0, mz0, mb, md);
  fb(S, FM, 1.5, mb - 1.5, 0.3, Hm - 2.4, -0.2, 0.05, GLAS);
  for (const u of achsen(1.5, mb - 1.5, 3.4, 0.2)) fb(S, FM, u - 0.12, u + 0.12, 0.3, Hm - 2.4, -0.2, 0.15, orn);
  // Portikus mit sechs Säulen und Dreiecksgiebel
  const pt = 6.5, pl = 1.6;
  S.quader(mx0 - 0.5, 0, zf, mx0 + mb + 0.5, pl, zf + pt + 2, '#d9d2c2');
  freitreppe(S, R(mx0 - 0.5, zf + pt, 1, 0, mb + 1), 0, mb + 1, pl, 5, 2.4, '#d9d2c2');
  for (let i = 0; i < 6; i++) { const u = mx0 + 1.5 + (i * (mb - 3)) / 5; zyl(S, 0.55, 0.62, Hm - pl - 1.6, u, pl, zf + pt - 1, orn, 12); S.box(1.5, 0.4, 1.5, u, Hm - 1.8, zf + pt - 1, orn); }
  S.quader(mx0 - 0.4, Hm - 1.6, zf - 0.5, mx0 + mb + 0.4, Hm, zf + pt, orn);
  const FG = R(mx0 - 0.4, zf + pt, 1, 0, mb + 0.8);
  fpoly(S, FG, [[0, Hm], [mb + 0.8, Hm], [(mb + 0.8) / 2, Hm + 4.2]], -pt - md + 1, 0, putz);
  fpoly(S, FG, [[-0.3, Hm - 0.1], [mb + 1.1, Hm - 0.1], [(mb + 0.8) / 2, Hm + 4.5]], -0.6, 0.2, orn);
  fpoly(S, FG, [[1.2, Hm + 0.5], [mb - 0.4, Hm + 0.5], [(mb + 0.8) / 2, Hm + 3.5]], -0.5, 0.25, putz);
  fscheibe(S, FG, (mb + 0.8) / 2, Hm + 1.7, 0.2, 0.35, 0.9, '#d8b45a', 16);
  ftext(scene, FG, p.name ?? 'Haus der Kultur', (mb + 0.8) / 2, Hm - 0.8, 0.05, 0.75, mb * 0.8, '#7a5a2e');
  const gd = dachProfil(md + pt - 1, mb + 0.8, 4.2, 0.2, 'z'); gd.translate(cx, Hm, mz0 + (md + pt - 1) / 2); S.add(gd, dach);
  // Dachreiter
  const dy = Hm + 4.2;
  S.quader(cx - 2, dy - 1.5, mz0 + 6, cx + 2, dy + 3.5, mz0 + 10, putz);
  for (const [sx, sz] of [[-1.6, 2], [1.6, 2], [-1.6, -2], [1.6, -2]]) S.box(0.4, 3.0, 0.4, cx + sx, dy + 5, mz0 + 8 + sz, orn);
  S.quader(cx - 2.2, dy + 6.5, mz0 + 5.8, cx + 2.2, dy + 7, mz0 + 10.2, orn);
  const k = walmdach(4.4, 4.4, 2.6); k.translate(cx, dy + 7, mz0 + 8); S.add(k, '#7aa68a');
  zyl(S, 0.05, 0.12, 2.5, cx, dy + 9.4, mz0 + 8, '#d8b45a', 6);
  for (let i = 0; i < 2; i++) baum(S, x0 + 4 + i * (w - 8), z0 + d - 4, r, 1.1);
  hofGruen(S, r, x0, z0, x0 + w, mz0 - 1, { spiel: false, waesche: false, teppich: false, weg: false, maxBaeume: 6 });
  return { hoehe: dy + 12 };
}
function kulturhaus(S, scene, p) {
  const v = p.variante ?? waehle(rng(`kh:${p.seed}`), ['palast', 'stadthalle', 'kulturhaus50']);
  const min = { palast: [64, 50], stadthalle: [54, 44], kulturhaus50: [50, 38] }[v];
  if (p.w >= min[0] && p.d >= min[1]) return kulturRoh(S, scene, { ...p, variante: v });
  return skaliert(S, scene, { ...p, variante: v }, Math.max(min[0], p.w), Math.max(min[1], p.d), kulturRoh);
}

// =====================================================================================
// Dominanten: Fernsehturm, Fernmeldeturm, Uni-Hochhaus, Interhotel
// =====================================================================================
function antennenSpitze(S, x, y, z, h, r0 = 0.9) {
  const n = 6;
  for (let i = 0; i < n; i++) zyl(S, r0 * (1 - (i + 1) / (n + 1.5)), r0 * (1 - i / (n + 1.5)), h / n, x, y + (i * h) / n, z, i % 2 ? '#f2f1ec' : '#c8463c', 8);
}
function dominanteRoh(S, scene, p) {
  const r = rng(`dm:${p.seed}`);
  const v = p.variante ?? waehle(r, ['fernsehturm', 'kanzel', 'uni', 'interhotel']);
  const { x: x0, z: z0, w, d } = p;
  const cx = x0 + w / 2, cz = z0 + d / 2;
  boden(S, x0, z0, x0 + w, z0 + d, PFLASTER, 0.3, 0.07);
  const beton = '#dcd9d1';
  if (v === 'fernsehturm') {
    const hs = 128, rk = 12;
    zyl(S, 2.8, 5.6, hs, cx, 0, cz, beton, 20);
    // Fußbau: gefaltete Pavillondächer im Kreis
    zyl(S, 15, 15, 5.5, cx, 0, cz, GLAS_HELL, 16);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * 2 * PI, ax = cx + Math.cos(a) * 12, az = cz + Math.sin(a) * 12;
      const g = new THREE.ConeGeometry(6.6, 3.2, 3); g.rotateZ(PI); g.rotateY(-a); g.translate(ax, 7.1, az); S.add(g, '#f1efe9');
      S.box(0.5, 5.5, 0.5, cx + Math.cos(a) * 15, 3, cz + Math.sin(a) * 15, '#eeeeea');
    }
    zyl(S, 9, 9, 1.4, cx, 5.5, cz, '#f1efe9', 16);
    // Kugel, leicht abgeflacht, mit Fensterband
    const yk = hs + rk * 0.55;
    const kg = new THREE.SphereGeometry(rk, 18, 12); kg.scale(1, 0.93, 1); kg.translate(cx, yk, cz); S.add(kg, '#c9cfd4');
    const band = new THREE.SphereGeometry(rk + 0.12, 18, 3, 0, 2 * PI, PI * 0.44, PI * 0.12); band.scale(1, 0.93, 1); band.translate(cx, yk, cz); S.add(band, '#34424d');
    for (const t of [0.3, 0.62, 0.72]) { const rr = Math.sin(t * PI) * (rk + 0.15), yy = Math.cos(t * PI) * rk * 0.93; zyl(S, rr, rr, 0.25, cx, yk + yy, cz, '#e9ecee', 18, true); }
    zyl(S, 4.2, 6, 3, cx, hs - 5, cz, beton, 16);
    zyl(S, 2.0, 2.4, 22, cx, yk + rk * 0.8, cz, beton, 12);
    antennenSpitze(S, cx, yk + rk * 0.8 + 22, cz, 32, 1.4);
    for (let i = 0; i < 6; i++) baum(S, x0 + 3 + r() * (w - 6), z0 + d - 3 - r() * 4, r, 1);
    return { hoehe: yk + rk + 54 };
  }
  if (v === 'kanzel') {
    const hs = 96;
    zyl(S, 2.2, 4.2, hs, cx, 0, cz, beton, 16);
    zyl(S, 7, 3.0, 4, cx, hs - 4, cz, beton, 16);
    zyl(S, 9, 9, 3.4, cx, hs, cz, '#34424d', 20);
    for (let i = 0; i < 20; i++) { const a = (i / 20) * 2 * PI; S.box(0.25, 3.4, 0.4, cx + Math.cos(a) * 9.05, hs + 1.7, cz + Math.sin(a) * 9.05, '#e9ecee', -a); }
    zyl(S, 10.5, 9.2, 1.2, cx, hs + 3.4, cz, '#eeeeea', 20);
    zyl(S, 7.5, 7.5, 3.0, cx, hs + 4.6, cz, '#d9dcdf', 16);
    zyl(S, 8.5, 7.5, 0.8, cx, hs + 7.6, cz, '#eeeeea', 16);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI + 0.3; const g = new THREE.CylinderGeometry(1.4, 1.4, 1.2, 12); g.rotateZ(PI / 2); g.rotateY(-a); g.translate(cx + Math.cos(a) * 6.5, hs + 10, cz + Math.sin(a) * 6.5); S.add(g, '#f2f1ec'); }
    zyl(S, 1.4, 1.8, 8, cx, hs + 8.4, cz, beton, 10);
    antennenSpitze(S, cx, hs + 16.4, cz, 26, 1.0);
    S.quader(cx - 9, 0, cz + 6, cx + 9, 4.5, cz + 14, '#e6e1d4');
    const FB = RZ(cx - 9, cz + 6, 18, 8); fb(S, FB, 1, 17, 0.3, 3.4, -0.1, 0.06, GLAS_HELL); fb(S, FB, -0.5, 18.5, 4.5, 5.0, -8, 0.8, '#f1efe9');
    for (let i = 0; i < 5; i++) baum(S, x0 + 3 + r() * (w - 6), z0 + 3 + r() * 6, r, 1);
    return { hoehe: hs + 43 };
  }
  if (v === 'uni' || v === 'rund') {
    const n = 26, gh = 3.6, y0 = 9, Ht = y0 + n * gh;
    // Sockelbau
    const sw = Math.min(w - 6, 56), sd = Math.min(d - 6, 40), sx = x0 + (w - sw) / 2, sz = z0 + 3;
    S.quader(sx, 0, sz, sx + sw - 0.6, y0, sz + sd - 0.6, '#33404a');
    S.quader(sx, y0 - 0.05, sz, sx + sw - 0.6, y0 + 0.3, sz + sd - 0.6, '#b3afa5');
    for (const F of [RZ(sx, sz, sw, sd), RX(sx, sz, sw, sd)]) {
      fb(S, F, 0, F.L, 0.3, y0 - 1.6, -0.6, -0.5, GLAS_HELL);
      for (let u = 0; u <= F.L; u += F.L / Math.round(F.L / 3)) fb(S, F, u - 0.15, u + 0.15, 0.3, y0 - 1.6, -0.6, 0.2, '#e3e0d8');
      fb(S, F, -0.3, F.L + 0.3, y0 - 1.6, y0, -0.6, 0.4, '#e3e0d8');
    }
    if (v === 'rund') {
      const rr = 13, tx = sx + sw * 0.55, tz = sz + sd * 0.45;
      zyl(S, rr - 0.6, rr - 0.6, Ht - y0, tx, y0, tz, '#3d4a55', 24);
      for (let i = 0; i < 36; i++) { const a = (i / 36) * 2 * PI; S.box(0.35, Ht - y0, 0.6, tx + Math.cos(a) * rr, (y0 + Ht) / 2, tz + Math.sin(a) * rr, '#e6e3db', -a); }
      for (let k = 0; k <= n; k += 2) zyl(S, rr + 0.1, rr + 0.1, 0.35, tx, y0 + k * gh, tz, '#e6e3db', 24, true);
      zyl(S, rr + 2.5, rr + 1, 2.2, tx, Ht, tz, '#e6e3db', 24);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * PI; S.box(0.9, 7, 0.9, tx + Math.cos(a) * (rr + 1.6), Ht + 5.7, tz + Math.sin(a) * (rr + 1.6), '#e6e3db'); }
      zyl(S, rr + 2.5, rr + 2.5, 1.0, tx, Ht + 9.2, tz, '#e6e3db', 24, true);
      zyl(S, rr - 2, rr - 2, 6, tx, Ht + 2.2, tz, '#3d4a55', 20);
      antennenSpitze(S, tx, Ht + 8.2, tz, 16, 0.6);
      return { hoehe: Ht + 24 };
    }
    const tw = Math.min(34, sw - 10), td = 20, tx = sx + (sw - tw) / 2, tz = sz + (sd - td) / 2;
    S.quader(tx, y0, tz, tx + tw - 0.4, Ht, tz + td - 0.4, '#3d4a55');
    for (const F of [RZ(tx, tz, tw, td), RX(tx, tz, tw, td)]) {
      const nr = Math.round(F.L / 1.6);
      for (let i = 0; i <= nr; i++) { const u = (i * F.L) / nr; fb(S, F, u - 0.18, u + 0.18, y0, Ht - 2 * gh, -0.4, 0.45, i % 4 === 0 ? '#f0ede6' : '#e2ded5'); }
      for (let k = 0; k < n - 2; k++) fb(S, F, 0, F.L, y0 + k * gh, y0 + k * gh + 0.9, -0.4, 0.25, '#d9d5cb');
      fb(S, F, -0.6, F.L + 0.6, Ht - 2 * gh, Ht - 2 * gh + 0.8, -0.4, 0.9, '#f0ede6');
      fb(S, F, 1.4, F.L - 1.4, Ht - 2 * gh + 0.8, Ht, -1.6, -1.5, GLAS_HELL);
      // Krone: hohe offene Rahmen
      fb(S, F, -0.6, 1.0, Ht - 2 * gh, Ht + 9, -1.0, 0.6, '#f0ede6');
      fb(S, F, F.L - 1.0, F.L + 0.6, Ht - 2 * gh, Ht + 9, -1.0, 0.6, '#f0ede6');
      for (let i = 1; i < 4; i++) fb(S, F, (i * F.L) / 4 - 0.4, (i * F.L) / 4 + 0.4, Ht, Ht + 9, -1.0, 0.3, '#f0ede6');
      fb(S, F, -0.8, F.L + 0.8, Ht + 9, Ht + 10.4, -1.2, 0.8, '#f0ede6');
    }
    S.quader(tx, Ht + 9, tz, tx + 0.8, Ht + 10.4, tz + td, '#f0ede6');
    S.quader(tx, Ht + 9, tz, tx + tw, Ht + 10.4, tz + 0.8, '#f0ede6');
    S.quader(tx + 1, Ht, tz + 1, tx + tw - 2, Ht + 0.2, tz + td - 2, '#9a9893');
    S.quader(tx + tw * 0.3, Ht, tz + td * 0.3, tx + tw * 0.6, Ht + 4, tz + td * 0.6, '#e2ded5');
    antennenSpitze(S, tx + tw * 0.45, Ht + 4, tz + td * 0.45, 14, 0.5);
    for (let i = 0; i < 6; i++) baum(S, x0 + 3 + (i * (w - 6)) / 5, z0 + d - 2.5, r, 1);
    return { hoehe: Ht + 18 };
  }
  // Interhotel-Scheibe
  const name = p.name ?? `Hotel Stadt ${waehle(r, ['Lindenau', 'Seeberg', 'Neuburg', 'Altenwerda', 'Grünau', 'Bergen'])}`;
  const pw = w - 6, pd = Math.min(d - 10, 32), px = x0 + 3, pz = z0 + 3, Hp = 8.4;
  S.quader(px, 0, pz, px + pw - 1, Hp, pz + pd - 1, '#33404a');
  S.quader(px, Hp - 0.05, pz, px + pw - 1, Hp + 0.3, pz + pd - 1, '#b3afa5');
  for (let i = 0; i < 8; i++) S.box(1.2, 0.6, 1.2, px + pw * 0.75 + (i % 4) * 2.4, Hp + 0.6, pz + 4 + Math.floor(i / 4) * 3, '#d9dcdf');
  for (const F of [RZ(px, pz, pw, pd), RX(px, pz, pw, pd)]) {
    fb(S, F, 0, F.L, 0.3, 4.2, -1, -0.9, GLAS_HELL);
    for (let u = 0; u <= F.L + 0.01; u += F.L / Math.round(F.L / 2.5)) fb(S, F, u - 0.06, u + 0.06, 0.3, 4.2, -1, -0.8, '#c9cdd0');
    for (let u = 0; u < F.L; u += 3) fb(S, F, u + 0.05, Math.min(F.L, u + 3) - 0.05, 4.2, Hp, -1, 0.05, (u / 3) % 2 ? '#e6dfcf' : '#dcd4c2');
    fb(S, F, -0.5, F.L + 0.5, Hp, Hp + 0.6, -1, 0.6, '#f1efe9');
  }
  const FPZ = RZ(px, pz, pw, pd);
  fb(S, FPZ, pw * 0.15, pw * 0.45, 3.8, 4.2, 0, 6, '#f1efe9');
  for (const u of [pw * 0.16, pw * 0.44]) fb(S, FPZ, u - 0.15, u + 0.15, 0.3, 3.8, 5.6, 5.9, STAHL);
  ftext(scene, FPZ, name, pw * 0.62, 6.2, 0.1, 2.2, pw * 0.6, '#b8322a');
  const n = 18, gh = 2.9, sw = Math.min(pw - 8, 58), st = 14.5, sxx = px + 2, szz = pz + (pd - st) / 2 - 2;
  S.quader(sxx, Hp, szz, sxx + sw - 1, Hp + n * gh, szz + st - 1, '#2f3a44');
  const FS = RZ(sxx, szz, sw, st);
  const Hs = bandFassade(S, FS, { n, gh, y0: Hp + 0.6, bruest: '#e9e2cf', bruest2: '#e9e2cf', rippe: '#d8cdb0', raster: 3.0, rb: 0.16, rt: 0.35, sims: '#b9a57a' });
  const FG = endeRechts(FS, st);
  fb(S, FG, -0.3, st, Hp + 0.6, Hs + 0.8, -0.3, 0.25, '#ded6c2');
  for (let u = 1.2; u < st - 0.5; u += 1.6) fb(S, FG, u - 0.3, u + 0.3, Hp + 0.6, Hs + 0.8, 0.25, 0.4, '#e9e2cf');
  for (let k = 0; k < n; k++) fb(S, FG, st / 2 - 0.8, st / 2 + 0.8, Hp + 0.6 + k * gh + 1.1, Hp + 0.6 + k * gh + 2.3, 0.25, 0.45, GLAS);
  S.quader(sxx, Hs + 0.8, szz, sxx + sw, Hs + 0.95, szz + st, '#9a9893');
  // Technikaufbau am rechten Scheibenende, damit er im Bild nicht hinter der Leuchtschrift liegt
  S.quader(sxx + sw * 0.84, Hs + 0.8, szz + 3, sxx + sw * 0.97, Hs + 4, szz + st - 3, '#e6dfcf');
  // Leuchtschrift auf dem Dach
  const FT = teil(FS, 0, sw, -1.4);
  const bt = ftext(scene, FT, name.toUpperCase(), sw * 0.42, Hs + 4.6, 0.3, 3.2, sw * 0.72, '#ff6a50');
  for (let u = sw * 0.42 - bt / 2 + 1; u <= sw * 0.42 + bt / 2; u += 4) fb(S, FT, u - 0.08, u + 0.08, Hs + 0.8, Hs + 6.4, -0.2, 0.0, STAHL);
  fb(S, FT, sw * 0.42 - bt / 2, sw * 0.42 + bt / 2, Hs + 2.9, Hs + 3.0, -0.2, 0, STAHL);
  // Vorfahrt mit Bus und Wolga-Typ
  ostFahrzeug(S, px + pw * 0.3, z0 + d - 3.5, 'bus', 0, '#e7a33a');
  ostFahrzeug(S, px + pw * 0.62, z0 + d - 3.5, 'limousine', 0, '#2b2f33');
  ostFahrzeug(S, px + pw * 0.72, z0 + d - 3.5, 'limousine', 0, '#efe9dc');
  // Fahnen an der Seitenfront (+x), damit sie nicht vor dem Hotelnamen am Flachbau stehen
  for (let i = 0; i < 6; i++) { const fz = pz + 2 + i * 2.5; S.box(0.12, 8, 0.12, px + pw + 1.0, 4.3, fz, '#d9dcdf'); S.box(0.05, 0.9, 1.4, px + pw + 1.0, 7.6, fz + 0.75, ['#c8463c', '#2f6fa8', '#e8c547', '#3b8a5a', '#f4efe2', '#7a4a8c'][i]); }
  return { hoehe: Hs + 7 };
}
function dominante(S, scene, p) {
  const v = p.variante ?? waehle(rng(`dm:${p.seed}`), ['fernsehturm', 'kanzel', 'uni', 'interhotel']);
  const min = { fernsehturm: [34, 34], kanzel: [26, 26], uni: [44, 36], rund: [40, 36], interhotel: [56, 36] }[v] ?? [40, 36];
  if (p.w >= min[0] && p.d >= min[1]) return dominanteRoh(S, scene, { ...p, variante: v });
  return skaliert(S, scene, { ...p, variante: v }, Math.max(min[0], p.w), Math.max(min[1], p.d), dominanteRoh);
}

// =====================================================================================
// Pavillons der 60er/70er
// =====================================================================================
function schirm(S, x, z, rad, farbe) {
  S.box(0.1, 2.4, 0.1, x, 1.5, z, '#e9e6de');
  const g = new THREE.ConeGeometry(rad, 0.7, 8); g.translate(x, 2.9, z); S.add(g, farbe);
}
function plastik(S, x, z, r) {
  S.box(1.6, 0.8, 1.6, x, 0.8, z, '#cfc8b8');
  for (let i = 0; i < 3; i++) { const g = new THREE.TorusGeometry(0.9 - i * 0.15, 0.18, 6, 14); g.rotateY(i * 0.9); g.translate(x, 2.2 + i * 1.1, z); S.add(g, '#b08d57'); }
}
const GASTNAMEN = ['Gaststätte Kranich', 'Gaststätte Seeblick', 'Gaststätte Möwe', 'Gaststätte Stadtpark', 'Gaststätte Am Teich'];
function pavillonRoh(S, scene, p) {
  const r = rng(`pv:${p.seed}`);
  const v = p.variante ?? waehle(r, ['hp', 'faltdach', 'eisbar', 'brunnen']);
  const { x: x0, z: z0, w, d } = p;
  boden(S, x0, z0, x0 + w, z0 + d, PFLASTER, 0.3, 0.07);
  if (v === 'hp') {
    hofGruen(S, r, x0, z0, x0 + w, z0 + 5, { spiel: false, waesche: false, teppich: false, weg: false, maxBaeume: 4 });
    const a = Math.min(w - 10, d - 10, 26), xa = x0 + (w - a) / 2 - 1, za = z0 + (d - a) / 2 - 1, xb = xa + a, zb = za + a;
    const cx = (xa + xb) / 2, cz = (za + zb) / 2, lo = 3.6, hi = zw(r, 8.5, 9.5), m = 5.2;
    // Vier hyperbolische Paraboloide: Ecken hochgezogen, Kantenmitten auf Stützen
    const h = (x, z) => { const s = Math.abs(x - cx) / (a / 2), t = Math.abs(z - cz) / (a / 2); return (1 - s) * (1 - t) * m + s * (1 - t) * lo + s * t * hi + (1 - s) * t * lo; };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const C = [cx, m, cz], Ex = [cx + sx * a / 2, lo, cz], O = [cx + sx * a / 2, hi, cz + sz * a / 2], Ez = [cx, lo, cz + sz * a / 2];
      bilinear(S, C, Ex, O, Ez, '#f3f1ec', 8, 0.25, '#dcd8ce');
      stab(S, Ex, O, 0.2, '#e9e6de', 6); stab(S, Ez, O, 0.2, '#e9e6de', 6);
    }
    for (const [ex, ez] of [[cx + a / 2, cz], [cx - a / 2, cz], [cx, cz + a / 2], [cx, cz - a / 2]]) S.box(0.8, lo, 0.8, ex, lo / 2, ez, '#d6d1c4');
    // Glaswände unter der Schale, in Abschnitten der Schalenhöhe folgend
    const e = a * 0.36, xi0 = cx - e, xi1 = cx + e, zi0 = cz - e, zi1 = cz + e;
    S.quader(xi0, 0.3, zi0, xi1, 0.5, zi1, '#d9d4c8');
    const wand = (pa, pb, farbe) => {
      for (const [q0, q1] of [[0, 0.5], [0.5, 1]]) {
        const A = [pa[0] + (pb[0] - pa[0]) * q0, pa[1] + (pb[1] - pa[1]) * q0], B = [pa[0] + (pb[0] - pa[0]) * q1, pa[1] + (pb[1] - pa[1]) * q1];
        const L = wurzelSumme(B[0] - A[0], B[1] - A[1]), F = R(A[0], A[1], (B[0] - A[0]) / L, (B[1] - A[1]) / L, L);
        const ya = h(A[0], A[1]) - 0.35, yb = h(B[0], B[1]) - 0.35;
        fpoly(S, F, [[0, 0.5], [L, 0.5], [L, yb], [0, ya]], -0.08, 0, farbe);
        const n = Math.max(1, Math.round(L / 1.8));
        for (let i = 1; i < n; i++) { const u = (i * L) / n; fb(S, F, u - 0.06, u + 0.06, 0.5, ya + (yb - ya) * (i / n), -0.1, 0.05, '#e9e6de'); }
      }
    };
    wand([xi0, zi1], [xi1, zi1], GLAS_HELL);
    wand([xi1, zi1], [xi1, zi0], GLAS_HELL);
    wand([xi1, zi0], [xi0, zi0], GLAS);
    wand([xi0, zi0], [xi0, zi1], GLAS);
    // Terrasse, Schild
    for (let i = 0; i < 4; i++) schirm(S, x0 + 4 + i * 4, z0 + d - 3.2, 1.5, ['#c8463c', '#f4efe2', '#2f6fa8', '#e8c547'][i % 4]);
    const FS = R(xb - 12, z0 + d - 1.2, 1, 0, 11);
    fb(S, FS, 0, 11, 0.3, 1.5, -0.4, 0, '#d8d3c6');
    ftext(scene, FS, p.name ?? waehle(r, GASTNAMEN), 5.5, 1.0, 0.05, 0.75, 10.5, '#b8322a');
    return { hoehe: hi + 0.5 };
  }
  if (v === 'faltdach') {
    const pw = Math.min(w - 8, 18), pd = Math.min(d - 9, 11), px = x0 + 3, pz = z0 + 3, H = 3.8;
    S.quader(px + 0.3, 0.3, pz + 0.3, px + pw - 0.3, H, pz + pd - 0.3, '#3a4650');
    for (const F of [RZ(px, pz, pw, pd), RX(px, pz, pw, pd)]) {
      fb(S, F, 0, F.L, 0.3, H, -0.35, -0.28, GLAS_HELL);
      for (let u = 0; u <= F.L + 0.01; u += F.L / Math.round(F.L / 1.8)) fb(S, F, u - 0.05, u + 0.05, 0.3, H, -0.35, -0.2, '#e9e6de');
      fb(S, F, 0, F.L, 0.3, 0.9, -0.35, -0.15, '#d9d4c8');
    }
    const FZ = RZ(px - 1, pz - 1, pw + 2, pd + 2), nz = Math.round((pw + 2) / 3), zb = (pw + 2) / nz;
    const pk = [[0, H]];
    for (let i = 0; i < nz; i++) { pk.push([(i + 0.5) * zb, H + 1.5]); pk.push([(i + 1) * zb, H]); }
    pk.push([pw + 2, H - 0.25]); for (let i = nz - 1; i >= 0; i--) { pk.push([(i + 0.5) * zb, H + 1.25]); pk.push([i * zb, H - 0.25]); }
    fpoly(S, FZ, pk, -(pd + 2), 0, '#f3f1ec');
    ftext(scene, RZ(px, pz, pw, pd), 'Blumen', pw / 2, H - 0.5, 1.05, 0.7, pw * 0.6, '#3b8a5a');
    for (let i = 0; i < 6; i++) { const bx = px + 1.5 + i * 2.2; S.box(1.6, 0.7, 0.9, bx, 0.65, pz + pd + 1.2, '#8a6a4a'); for (let k = 0; k < 3; k++) S.box(0.4, 0.35, 0.4, bx - 0.5 + k * 0.5, 1.15, pz + pd + 1.2, ['#e46b8a', '#f2c14e', '#e8604c', '#b06bc4'][(i + k) % 4]); }
    // Zeitungskiosk
    const kx = x0 + w - 9, kz = z0 + d - 8;
    S.quader(kx, 0.3, kz, kx + 5, 3, kz + 4, '#e9e6de');
    fb(S, RZ(kx, kz, 5, 4), 0.4, 4.6, 1.0, 2.5, 0, 0.06, GLAS_HELL);
    S.quader(kx - 0.6, 3, kz - 0.6, kx + 5.6, 3.35, kz + 4.8, '#c8463c');
    ftext(scene, RZ(kx, kz, 5, 4), 'Zeitungen', 2.5, 2.75, 0.85, 0.35, 4.6, '#2a3a4a');
    brunnen(S, x0 + w - 7, pz + 4, 2.6, { duesen: 4 });
    for (let i = 0; i < 2; i++) baum(S, x0 + w - 4 - i * 6, z0 + 3, r, 1);
    return { hoehe: H + 1.6 };
  }
  if (v === 'eisbar') {
    const uw = Math.min(w - 10, 20), ud = Math.min(d - 11, 14), ux = x0 + 4, uz = z0 + 3, h1 = 3.9, h2 = 3.6;
    S.quader(ux + 1.5, 0.3, uz + 1.5, ux + uw - 1.5, h1, uz + ud - 1.5, '#3a4650');
    for (const F of [RZ(ux + 1.5, uz + 1.5, uw - 3, ud - 3), RX(ux + 1.5, uz + 1.5, uw - 3, ud - 3)]) {
      fb(S, F, 0, F.L, 0.3, h1, 0, 0.06, GLAS_HELL);
      for (let u = 0; u <= F.L + 0.01; u += F.L / Math.round(F.L / 1.6)) fb(S, F, u - 0.05, u + 0.05, 0.3, h1, 0, 0.12, '#e9e6de');
    }
    S.quader(ux, h1, uz, ux + uw, h1 + 0.5, uz + ud, '#f3f1ec');
    S.quader(ux + 0.2, h1 + 0.5, uz + 0.2, ux + uw - 0.2, h1 + h2, uz + ud - 0.2, '#3a4650');
    for (const F of [RZ(ux, uz, uw, ud), RX(ux, uz, uw, ud)]) {
      fb(S, F, 0.2, F.L - 0.2, h1 + 0.5, h1 + 1.3, -0.2, 0.0, '#e9cfa0');
      fb(S, F, 0.2, F.L - 0.2, h1 + 1.3, h1 + h2 - 0.2, -0.2, -0.12, GLAS_GRUEN);
      for (let u = 0.2; u <= F.L - 0.19; u += (F.L - 0.4) / Math.round((F.L - 0.4) / 1.4)) fb(S, F, u - 0.04, u + 0.04, h1 + 1.3, h1 + h2 - 0.2, -0.2, -0.05, '#f3f1ec');
    }
    S.quader(ux - 0.5, h1 + h2, uz - 0.5, ux + uw + 0.5, h1 + h2 + 0.35, uz + ud + 0.5, '#f3f1ec');
    // Leuchtschrift auf dem Dach
    const FT = teil(RZ(ux, uz, uw, ud), 0, uw, -ud * 0.4);
    const bt = ftext(scene, FT, p.name ?? 'Milch · Mokka · Eis', uw / 2, h1 + h2 + 1.6, 0.1, 1.3, uw * 0.95, '#e8467a');
    for (let u = uw / 2 - bt / 2 + 0.5; u < uw / 2 + bt / 2; u += 3) fb(S, FT, u - 0.06, u + 0.06, h1 + h2 + 0.35, h1 + h2 + 2.3, -0.15, 0, STAHL);
    // Terrasse
    for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) { const tx = ux + 2 + i * 4.2, tz = uz + ud + 2 + k * 3.5; schirm(S, tx, tz, 1.4, ['#f4efe2', '#e8467a', '#2f9fb0'][(i + k) % 3]); S.box(0.9, 0.7, 0.9, tx, 0.7, tz, '#e9e6de'); }
    brunnen(S, x0 + w - 6, z0 + 6, 3, { duesen: 5 });
    for (let i = 0; i < 3; i++) baum(S, x0 + w - 4, z0 + 12 + i * 5, r, 1);
    return { hoehe: h1 + h2 + 2.4 };
  }
  // Brunnenpavillon: Gaststätte mit Formsteinwand, großer Brunnen, Plastik
  const gw = Math.min(w - 12, 24), gd = 11, gx = x0 + 3, gz = z0 + 3, H = 4.4;
  S.quader(gx, 0.3, gz, gx + gw - 0.6, H, gz + gd - 0.6, '#3a4650');
  S.quader(gx - 0.8, H - 0.05, gz - 0.8, gx + gw + 0.4, H + 0.12, gz + gd + 0.8, '#b3afa5');
  const FZ = RZ(gx, gz, gw, gd), FX = RX(gx, gz, gw, gd);
  fb(S, FZ, 0, gw * 0.62, 0.3, H - 0.6, -0.6, -0.5, GLAS_HELL);
  for (let u = 0; u <= gw * 0.62; u += 2) fb(S, FZ, u - 0.05, u + 0.05, 0.3, H - 0.6, -0.6, -0.4, '#e9e6de');
  formsteinwand(S, FZ, gw * 0.62, gw, 0.3, H - 0.6, -0.6, -0.2, '#e3ddcf', waehle(r, ['kreis', 'raute', 'schlitz']));
  formsteinwand(S, FX, 0, gd, 0.3, H - 0.6, -0.6, -0.2, '#e3ddcf', 'kreis');
  fb(S, FZ, -0.8, gw + 0.4, H - 0.6, H, -0.6, 1.4, '#f3f1ec'); fb(S, FX, -1.4, gd + 0.8, H - 0.6, H, -0.6, 1.4, '#f3f1ec');
  fb(S, FZ, -0.8, gw + 0.4, H, H + 0.15, -0.6, 1.45, '#c8463c');
  ftext(scene, FZ, p.name ?? waehle(r, GASTNAMEN), gw * 0.35, H - 0.3, 1.47, 0.45, gw * 0.6, '#b8322a');
  const bx = x0 + w * 0.62, bz = z0 + d * 0.62, br = Math.min(w, d) * 0.22;
  brunnen(S, bx, bz, br, { duesen: 9, hoch: 4.5, schale: true });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI; S.box(1.8, 0.45, 0.6, bx + Math.cos(a) * (br + 2.2), 0.6, bz + Math.sin(a) * (br + 2.2), '#8a6a4a', -a + PI / 2); }
  plastik(S, x0 + w - 4, z0 + 5, r);
  for (let i = 0; i < 3; i++) baum(S, x0 + 4 + i * 6, z0 + d - 3, r, 1);
  for (const lx of [x0 + w * 0.4, x0 + w - 3]) laterne(S, lx, z0 + d - 2, 5, 0.36, 'kugel');
  return { hoehe: H + 4.5 };
}
function pavillon(S, scene, p) {
  const v = p.variante ?? waehle(rng(`pv:${p.seed}`), ['hp', 'faltdach', 'eisbar', 'brunnen']);
  const min = { hp: [28, 28], faltdach: [24, 20], eisbar: [28, 26], brunnen: [32, 28] }[v];
  if (p.w >= min[0] && p.d >= min[1]) return pavillonRoh(S, scene, { ...p, variante: v });
  return skaliert(S, scene, { ...p, variante: v }, Math.max(min[0], p.w), Math.max(min[1], p.d), pavillonRoh);
}

// =====================================================================================
// Kaufhalle (Typenbau), auch als Discounter der 90er
// =====================================================================================
function kaufhalleRoh(S, scene, p) {
  const r = rng(`kf:${p.seed}`);
  const v = p.variante ?? waehle(r, ['typ', 'waschbeton', 'discounter']);
  const { x: x0, z: z0, w, d } = p;
  const bw = Math.min(w - 10, 46), bd = Math.min(d - 18, 30), bx = x0 + 3, bz = z0 + 3, H = 5.4;
  boden(S, x0, z0, x0 + w, z0 + d, '#a9a69f', 0.3, 0.05);
  const disc = v === 'discounter';
  const wand = v === 'waschbeton' ? '#bdb29c' : disc ? '#efeee8' : '#e3e0d6';
  S.quader(bx, 0, bz, bx + bw - 0.6, H, bz + bd - 0.6, wand);
  S.quader(bx, H - 0.05, bz, bx + bw - 0.6, H + 0.15, bz + bd - 0.6, '#9e9b94');
  const FZ = RZ(bx, bz, bw, bd), FX = RX(bx, bz, bw, bd);
  // Front: Glasband, Brüstung, Blende
  const blende = disc ? '#3f8a78' : v === 'waschbeton' ? '#c8bea8' : '#f4f3ef';
  fb(S, FZ, 1, bw - 1, 0.9, 3.5, -0.6, -0.5, GLAS_HELL);
  for (let u = 1; u <= bw - 0.99; u += (bw - 2) / Math.round((bw - 2) / 1.5)) fb(S, FZ, u - 0.05, u + 0.05, 0.9, 3.5, -0.6, -0.4, disc ? '#9aa1a7' : '#e9e6de');
  if (v === 'waschbeton') for (let u = 0; u < bw; u += 3) { fb(S, FZ, u + 0.06, Math.min(bw, u + 3) - 0.06, 0.3, 0.9, -0.6, 0.1, (u / 3) % 2 ? '#b9ae98' : '#b0a58e'); fb(S, FZ, u + 0.06, Math.min(bw, u + 3) - 0.06, 3.5, H + 0.6, -0.6, 0.1, (u / 3) % 2 ? '#c4b9a3' : '#bbb09a'); }
  else {
    fb(S, FZ, 0, bw, 0.3, 0.9, -0.6, 0.05, disc ? '#2f5e52' : '#c9c5ba');
    fb(S, FZ, -0.3, bw + 0.3, 3.5, H + 0.6, -0.6, 0.35, blende);
    if (!disc) for (let u = 0.25; u < bw; u += 0.5) fb(S, FZ, u - 0.06, u + 0.06, 3.6, H + 0.5, 0.35, 0.45, '#e2e1db');
  }
  const ex = bw * 0.18;
  fb(S, FZ, ex - 2, ex + 2, 0.3, 2.6, -0.4, -0.3, '#5a6570');
  fb(S, FZ, ex - 3.2, ex + 3.2, 3.0, 3.3, -0.6, 3.0, disc ? '#2f5e52' : '#f4f3ef');
  if (disc) {
    S.box(0.1, 0.1, 0.1, bx, 0, bz, wand);
    fb(S, FZ, ex - 3, ex + 3, 0.3, 3.0, 0.2, 3.0, '#3a4650');
    fb(S, FZ, ex - 2.9, ex + 2.9, 0.4, 2.9, 2.95, 3.05, GLAS_HELL);
    ftext(scene, FZ, 'Kaufmarkt Elster', bw * 0.58, 4.5, 0.5, 1.4, bw * 0.6, '#ffffff');
    fb(S, FZ, bw * 0.3, bw * 0.5, 1.2, 3.0, -0.4, -0.35, '#e8463c');
    ftext(scene, FZ, 'Neueröffnung!', bw * 0.4, 2.1, -0.33, 0.6, bw * 0.19, '#ffffff');
  } else if (v === 'waschbeton') {
    const FT = teil(FZ, 0, bw, -3);
    const bt = ftext(scene, FT, 'Kaufhalle', bw / 2, H + 1.9, 0.1, 2.0, bw * 0.6, '#e33b2e');
    for (let u = bw / 2 - bt / 2 + 0.6; u < bw / 2 + bt / 2; u += 3.5) fb(S, FT, u - 0.07, u + 0.07, H + 0.15, H + 2.9, -0.2, 0, STAHL);
  } else ftext(scene, FZ, 'KAUFHALLE', bw * 0.58, 4.5, 0.5, 1.3, bw * 0.62, '#c8302a');
  // Einkaufswagen-Unterstand
  const ux = bx + bw * 0.34;
  S.quader(ux, 2.5, bz + bd + 0.6, ux + 6, 2.65, bz + bd + 2.6, disc ? '#2f5e52' : '#9aa1a7');
  for (let i = 0; i < 5; i++) S.box(1.0, 0.9, 0.6, ux + 0.8 + i * 1.1, 0.8, bz + bd + 1.6, disc ? '#b8bfc4' : '#c9483e');
  // Seite: Anlieferung mit Rampe
  fb(S, FX, bd * 0.2, bd * 0.75, 0, 1.3, -0.6, 4, '#bdb7aa');
  fb(S, FX, bd * 0.2, bd * 0.75, 3.6, 3.85, -0.6, 4.4, '#9aa1a7');
  for (const u of [bd * 0.35, bd * 0.6]) fb(S, FX, u - 1.6, u + 1.6, 1.3, 3.5, -0.6, -0.5, '#7d8590');
  for (let i = 0; i < 6; i++) { const [cx, cz] = wp(FX, bd * 0.24 + (i % 3) * 1.0, 1.0 + Math.floor(i / 3) * 1.1); S.box(0.8, 0.9, 0.8, cx, 1.75, cz, ['#e3b23c', '#3d6b4f', '#c84a3c'][i % 3]); }
  const [lx, lz] = wp(FX, bd * 0.5, 7.5);
  ostFahrzeug(S, lx, lz, disc ? 'lkw' : 'lkw', PI / 2, disc ? '#f4f3ef' : '#4f7a8c');
  // Dach je Variante verschieden: Typenbau mit Sheddach-Streifen, Waschbeton mit Kiesdach und großem Lüfterkasten,
  // Discounter mit hellem Blechdach und Werbepylon. Freiflächen ebenfalls je Variante (Parkplatz, Grünstreifen, Fahrradständer)
  if (v === 'typ') {
    for (let k = 0; k < 5; k++) { const z1 = bz + 2 + k * ((bd - 4) / 5); S.quader(bx + 2, H + 0.15, z1, bx + bw - 3, H + 1.1, z1 + 1.2, '#d6d8d4'); S.quader(bx + 2, H + 0.15, z1 + 1.2, bx + bw - 3, H + 1.1, z1 + 1.32, '#8fb3c2'); }
  } else if (v === 'waschbeton') {
    S.quader(bx + 0.4, H + 0.15, bz + 0.4, bx + bw - 1, H + 0.22, bz + bd - 1, '#a7a294');
    S.quader(bx + bw * 0.3, H + 0.15, bz + 3, bx + bw * 0.62, H + 2.6, bz + 9, '#9c968a');
    for (let i = 0; i < 4; i++) zyl(S, 0.6, 0.6, 1.4, bx + bw * 0.34 + i * 2.6, H + 2.6, bz + 6, '#7d8288', 10);
  } else {
    S.quader(bx + 0.3, H + 0.15, bz + 0.3, bx + bw - 0.9, H + 0.3, bz + bd - 0.9, '#d9dbd8');
    for (let i = 0; i < 6; i++) S.box(2.2, 0.35, 1.2, bx + bw * (0.15 + i * 0.14), H + 0.5, bz + bd * 0.45, '#f1f2f0');
    S.quader(bx + bw * 0.75, H + 0.15, bz + 2, bx + bw * 0.75 + 4, H + 1.6, bz + 5, '#bfc3c6');
  }
  // Freifläche vor der Halle
  const pz = bz + bd + 4;
  if (v === 'waschbeton') {
    // Vorplatz mit Pflaster, Grünstreifen und Bäumen, kleiner Parkplatz nur rechts
    boden(S, x0, pz, x0 + w, z0 + d, '#cfc8ba', 0.3, 0.07);
    boden(S, x0 + 2, pz + 2.5, x0 + w * 0.55, pz + 6, '#9dbb83', 0.3, 0.1);
    for (let x = x0 + 5; x < x0 + w * 0.55; x += 7) baum(S, x, pz + 4.2, r, 0.9);
    boden(S, x0 + w * 0.6, pz, x0 + w, z0 + d, ASPHALT, 0.3, 0.08);
    parkreihe(S, r, x0 + w * 0.6 + 1, x0 + w - 2, pz + 3, { quer: true, modern: 0.03, dichte: 0.7, y: 0.38 });
    for (let i = 0; i < 6; i++) S.box(0.08, 0.8, 1.6, x0 + w * 0.35 + i * 0.8, 0.75, pz + 1.0, '#7d848b');
  } else {
    boden(S, x0, pz, x0 + w, z0 + d, ASPHALT, 0.3, 0.07);
    for (let x = x0 + 2; x < x0 + w - 2; x += 2.6) S.box(0.12, 0.03, 4.2, x, 0.39, pz + 3, FARBEN.markierung);
    parkreihe(S, r, x0 + 2, x0 + w - 2, pz + 3, { quer: true, modern: disc ? 0.8 : 0.03, dichte: disc ? 0.85 : 0.4, y: 0.37 });
    if (disc) { // Werbepylon an der Einfahrt
      const px = x0 + w - 4, pz2 = z0 + d - 3;
      S.quader(px - 0.6, 0.3, pz2 - 0.3, px + 0.6, 8.5, pz2 + 0.3, '#2f5e52');
      S.quader(px - 1.6, 6.0, pz2 - 0.35, px + 1.6, 8.6, pz2 + 0.35, '#3f8a78');
    } else for (let i = 0; i < 3; i++) baum(S, x0 + w - 3, z0 + 6 + i * 6, r, 0.9);
  }
  return { hoehe: H + 3 };
}
function kaufhalle(S, scene, p) {
  if (p.w >= 40 && p.d >= 36) return kaufhalleRoh(S, scene, p);
  return skaliert(S, scene, p, Math.max(40, p.w), Math.max(36, p.d), kaufhalleRoh);
}

// =====================================================================================
// Heizwerk mit Schornstein und Fernwärmeleitung auf Stelzen
// =====================================================================================
function fernwaerme(S, punkte, y, o = {}) {
  const farbe = o.farbe ?? '#c9cdd0', rr = o.r ?? 0.45;
  for (let i = 0; i < punkte.length - 1; i++) {
    const [ax, az] = punkte[i], [bx, bz] = punkte[i + 1];
    const L = wurzelSumme(bx - ax, bz - az), nx = -(bz - az) / L, nz = (bx - ax) / L;
    for (const s of [-0.6, 0.6]) stab(S, [ax + nx * s, y, az + nz * s], [bx + nx * s, y, bz + nz * s], rr, farbe, 8);
    const n = Math.max(1, Math.round(L / 7));
    for (let k = 0; k <= n; k++) {
      const px = ax + ((bx - ax) * k) / n, pz = az + ((bz - az) * k) / n;
      S.box(0.3, y - 0.3, 0.3, px, 0.3 + (y - 0.3) / 2 - 0.4, pz, '#8a8f94');
      S.box(Math.abs(nx) * 2.4 + 0.3, 0.25, Math.abs(nz) * 2.4 + 0.3, px, y - rr - 0.15, pz, '#8a8f94');
    }
  }
}
/** Dehnungsbogen: U-förmig hochgezogene Leitung (über einen Weg). */
function dehnbogen(S, x, z, laenge, y, hoch, achse = 'x') {
  const P = (u, h) => (achse === 'x' ? [x + u, h, z] : [x, h, z + u]);
  for (const s of [-0.6, 0.6]) {
    const Q = (u, h) => { const q = P(u, h); if (achse === 'x') q[2] += s; else q[0] += s; return q; };
    stab(S, Q(0, y), Q(0, y + hoch), 0.45, '#c9cdd0', 8); stab(S, Q(0, y + hoch), Q(laenge, y + hoch), 0.45, '#c9cdd0', 8); stab(S, Q(laenge, y + hoch), Q(laenge, y), 0.45, '#c9cdd0', 8);
  }
  for (const u of [0, laenge]) { const q = P(u, 0); S.box(0.5, y + hoch, 0.5, q[0], (y + hoch) / 2 + 0.3, q[2], '#8a8f94'); }
}
function schornstein(S, x, z, h, rU, rO, farbe, o = {}) {
  zyl(S, rO, rU, h, x, 0, z, farbe, 16);
  zyl(S, rO + 0.25, rO + 0.25, 1.0, x, h - 1.0, z, dunkler(farbe, 0.15), 16);
  if (o.ringe) for (let i = 0; i < 3; i++) zyl(S, rO + 0.06 + i * 0.03, rO + 0.06 + i * 0.03, 2.4, x, h - 3.4 - i * 4.8, z, i % 2 ? '#f2f1ec' : '#c8463c', 16, true);
  if (o.leiter) S.box(0.5, h - 4, 0.15, x + rO + 0.15, h / 2, z, '#59636b');
}
function heizwerkRoh(S, scene, p) {
  const r = rng(`hw:${p.seed}`);
  const v = p.variante ?? waehle(r, ['kohle', 'gas', 'umformer']);
  const { x: x0, z: z0, w, d } = p;
  boden(S, x0, z0, x0 + w, z0 + d, '#b3afa5', 0.3, 0.05);
  const ziegel = '#a8664f';
  if (v === 'kohle') {
    const kw = Math.min(30, w * 0.45), kd = 20, kx = x0 + 4, kz = z0 + 4, Hk = 18;
    S.quader(kx, 0, kz, kx + kw, Hk, kz + kd, ziegel);
    for (const F of [RZ(kx, kz, kw, kd), RX(kx, kz, kw, kd)]) {
      for (const u of achsen(0, F.L, 4, 1.2)) { fb(S, F, u - 1.0, u + 1.0, 2, Hk - 3, 0, 0.06, '#56636c'); for (let y = 4; y < Hk - 3; y += 2.5) fb(S, F, u - 1.0, u + 1.0, y - 0.05, y + 0.05, 0, 0.1, '#d9d4c8'); fb(S, F, u - 1.4, u - 1.0, 0.3, Hk, 0, 0.3, '#9e5c47'); }
      fb(S, F, -0.2, F.L + 0.2, Hk - 1.2, Hk, -0.2, 0.3, '#9e5c47');
    }
    const g = dachProfil(kw + 0.6, kd + 0.6, 3, 2.5, 'x'); g.translate(kx + kw / 2, Hk, kz + kd / 2); S.add(g, '#7d8287');
    S.quader(kx + kw * 0.3, Hk + 3, kz + kd * 0.4, kx + kw * 0.7, Hk + 5, kz + kd * 0.6, '#9aa1a7');
    // Bunkerhaus und Förderband
    const bxx = kx + kw + 2, bzz = kz + 2, Hb = 26;
    S.quader(bxx, 0, bzz, bxx + 10, Hb, bzz + 12, '#c7c3b8');
    for (const F of [RZ(bxx, bzz, 10, 12), RX(bxx, bzz, 10, 12)]) for (let y = 3; y < Hb; y += 3) fb(S, F, -0.05, F.L + 0.05, y - 0.06, y + 0.06, 0, 0.05, '#aaa69c');
    fb(S, RX(bxx, bzz, 10, 12), 3, 9, Hb - 5, Hb - 2, 0, 0.06, '#56636c');
    const fx = x0 + w - 6, fzz = z0 + d - 10;
    balken(S, [fx, 1.2, fzz], [bxx + 9, Hb - 3, bzz + 10], 2.2, 2.0, '#9aa1a7');
    balken(S, [fx, 2.3, fzz], [bxx + 9, Hb - 1.9, bzz + 10], 2.4, 0.15, '#7d8287');
    for (let i = 1; i < 4; i++) { const t = i / 4, px = fx + (bxx + 9 - fx) * t, pz = fzz + (bzz + 10 - fzz) * t, py = 1.2 + (Hb - 4.2) * t; S.box(0.5, py, 0.5, px, py / 2 + 0.3, pz, '#7d8287'); }
    // Kohlehalde
    const hg = new THREE.ConeGeometry(7, 5, 7); hg.scale(1.3, 1, 1); hg.translate(fx - 4, 2.8, fzz + 1); S.add(hg, '#2e2f31');
    const hg2 = new THREE.ConeGeometry(5, 3.5, 6); hg2.translate(fx - 12, 2.05, fzz + 4); S.add(hg2, '#353638');
    schornstein(S, kx + kw * 0.5, kz + 2 + kd + 4 < z0 + d - 12 ? kz + kd + 4 : kz - 0.5 + 3, 80, 3.6, 2.2, ziegel, { leiter: true });
    fernwaerme(S, [[x0 + 2, z0 + d - 2.5], [x0 + w - 18, z0 + d - 2.5]], 3.2);
    dehnbogen(S, x0 + w - 18, z0 + d - 2.5, 8, 3.2, 4.5);
    fernwaerme(S, [[x0 + w - 10, z0 + d - 2.5], [x0 + w - 2, z0 + d - 2.5]], 3.2);
    ostFahrzeug(S, x0 + w - 14, z0 + d - 18, 'lkw', 0.4, '#5d7a5a');
    return { hoehe: 80 };
  }
  if (v === 'gas') {
    const hw = Math.min(w - 16, 36), hd = Math.min(d - 14, 24), hx = x0 + 4, hz = z0 + 4, H = 14;
    S.quader(hx, 0, hz, hx + hw, H, hz + hd, '#e9ebec');
    for (const F of [RZ(hx, hz, hw, hd), RX(hx, hz, hw, hd)]) {
      for (let u = 0.4; u < F.L; u += 0.8) fb(S, F, u - 0.08, u + 0.08, 0.3, H, 0, 0.12, '#dadddf');
      fb(S, F, 0, F.L, H - 3.2, H - 1.4, 0, 0.16, '#2f6f8f');
      for (const u of achsen(0, F.L, 6, 1)) fb(S, F, u - 1.6, u + 1.6, 0.3, 4.2, 0, 0.2, '#9aa1a7');
    }
    S.quader(hx, H, hz, hx + hw, H + 0.2, hz + hd, '#a9adb0');
    // drei Stahlschornsteine im Gittergerüst
    const sx = hx + hw + 5, sz = hz + hd * 0.5;
    for (let i = 0; i < 3; i++) zyl(S, 0.9, 0.9, 55, sx + (i - 1) * 2.6, 0, sz, '#9aa1a7', 10);
    for (let y = 6; y < 55; y += 8) { S.quader(sx - 4.2, y, sz - 1.4, sx + 4.2, y + 0.3, sz + 1.4, '#c8463c'); }
    for (const [ax, az] of [[-4.2, -1.4], [4.2, -1.4], [-4.2, 1.4], [4.2, 1.4]]) S.box(0.35, 55, 0.35, sx + ax, 27.5, sz + az, '#c8463c');
    for (let y = 6; y < 50; y += 8) { stab(S, [sx - 4.2, y, sz + 1.4], [sx + 4.2, y + 8, sz + 1.4], 0.12, '#c8463c', 4); }
    for (let i = 0; i < 3; i++) { stab(S, [hx + hw, 8 - i * 1.2, sz - 1 + i], [sx + (i - 1) * 2.6, 8 - i * 1.2, sz - 1 + i], 0.6, '#9aa1a7', 8); }
    // Gastanks und Leitung
    for (let i = 0; i < 2; i++) { const g = new THREE.CapsuleGeometry(1.6, 7, 4, 10); g.rotateZ(PI / 2); g.translate(x0 + 8 + i * 10, 2.4, z0 + d - 7); S.add(g, '#f2f1ec'); for (const k of [-2.5, 2.5]) S.box(0.6, 1.2, 2.6, x0 + 8 + i * 10 + k, 0.9, z0 + d - 7, '#8a8f94'); }
    fernwaerme(S, [[x0 + w - 3, z0 + 2], [x0 + w - 3, z0 + d - 3], [x0 + 2, z0 + d - 3]], 3.0);
    ftext(scene, RZ(hx, hz, hw, hd), 'Heizwerk', hw / 2, H - 2.3, 0.2, 1.2, hw * 0.5, '#ffffff');
    return { hoehe: 56 };
  }
  // Umformerstation mit Rohrbrücke
  const uw = 16, ud = 12, ux = x0 + 4, uz = z0 + 4, H = 7;
  S.quader(ux, 0, uz, ux + uw, H, uz + ud, '#cfc8b8');
  for (const F of [RZ(ux, uz, uw, ud), RX(ux, uz, uw, ud)]) {
    for (let u = 0; u < F.L; u += 3) fb(S, F, u + 0.06, Math.min(F.L, u + 3) - 0.06, 0.3, H - 0.6, 0, 0.12, (u / 3) % 2 ? '#cfc8b8' : '#c6bfae');
    fb(S, F, 0.5, F.L - 0.5, H - 2.2, H - 1.2, 0.12, 0.18, '#56636c');
    fb(S, F, -0.1, F.L + 0.1, H - 0.6, H, -0.1, 0.25, '#e3ded1');
  }
  fb(S, RZ(ux, uz, uw, ud), 2, 5, 0.3, 3.4, 0.12, 0.2, '#6b7680');
  S.quader(ux + 0.4, H, uz + 0.4, ux + uw - 0.4, H + 0.15, uz + ud - 0.4, '#9e9b94');
  fernwaerme(S, [[x0 + 2, z0 + d - 4], [x0 + w * 0.45, z0 + d - 4]], 4.0);
  dehnbogen(S, x0 + w * 0.45, z0 + d - 4, 9, 4.0, 5.5);
  fernwaerme(S, [[x0 + w * 0.45 + 9, z0 + d - 4], [x0 + w - 4, z0 + d - 4], [x0 + w - 4, z0 + 2]], 4.0);
  fernwaerme(S, [[ux + uw, uz + ud * 0.5], [x0 + w - 4, uz + ud * 0.5]], 4.0, { r: 0.35 });
  hofGruen(S, r, ux + uw + 2, z0 + 2, x0 + w - 7, z0 + d - 7, { spiel: false, waesche: false, teppich: false, weg: false, rasen: '#a9c08a', maxBaeume: 4 });
  ftext(scene, RZ(ux, uz, uw, ud), 'Fernwärme', uw / 2, H - 1.7, 0.2, 0.6, uw * 0.6, '#ffffff');
  return { hoehe: H + 5 };
}
function heizwerk(S, scene, p) {
  const v = p.variante ?? waehle(rng(`hw:${p.seed}`), ['kohle', 'gas', 'umformer']);
  const min = { kohle: [60, 48], gas: [50, 40], umformer: [40, 30] }[v];
  if (p.w >= min[0] && p.d >= min[1]) return heizwerkRoh(S, scene, { ...p, variante: v });
  return skaliert(S, scene, { ...p, variante: v }, Math.max(min[0], p.w), Math.max(min[1], p.d), heizwerkRoh);
}

// =====================================================================================
// Typenschule (Erfurter Typ) mit Turnhalle, Winkelbau, Kinderkombination
// =====================================================================================
function schulTrakt(S, scene, F, T, o) {
  const { n, r } = o, gh = 3.3, y0 = 0.9, L = F.L, H = y0 + n * gh;
  fb(S, F, 0, L, 0, H, -T, -1.0, '#cfc8b8');
  fb(S, F, 0, L, H - 0.02, H + 0.12, -T, -0.95, '#9e9b94');
  fb(S, F, 0, L, H, H + 0.6, -T, -T + 0.25, '#e3ded1');
  const farben = o.farben;
  for (let k = 0; k < n; k++) {
    const y = y0 + k * gh;
    for (let u = 0; u < L; u += 3.6) fb(S, F, u + 0.06, Math.min(L, u + 3.6) - 0.06, y + 0.06, y + 1.05, -0.3, 0.18, farben[(k + (o.salz ?? 0)) % farben.length]);
    fb(S, F, 0, L, y + 1.05, y + gh, -1.0, -0.9, GLAS_HELL);
    for (let u = 0; u <= L + 0.01; u += 1.2) fb(S, F, u - 0.05, u + 0.05, y + 1.05, y + gh, -1.0, -0.82, '#f2f1ec');
    fb(S, F, 0, L, y + 2.45, y + 2.52, -1.0, -0.82, '#f2f1ec');
  }
  for (let u = 0; u <= L + 0.01; u += 7.2) fb(S, F, u - 0.15, u + 0.15, y0, H, -0.3, 0.25, '#e3ded1');
  fb(S, F, 0, L, 0, y0, -1.0, 0.25, '#9a958c');
  fb(S, F, -0.1, L + 0.1, H, H + 0.6, -1.0, 0.25, '#e3ded1');
  const G = endeRechts(F, T);
  if (o.giebel !== false) {
    fb(S, G, -0.3, T, 0, H + 0.6, -0.2, 0.15, '#d6d0c2');
    for (let k = 0; k < n; k++) fb(S, G, T / 2 - 0.6, T / 2 + 0.6, y0 + k * gh + 1.2, y0 + k * gh + 2.6, 0.15, 0.2, GLAS);
    mosaik(S, G, 1.5, T * 0.4, y0 + 1.5, H - 1.5, 0.15, r, { motiv: 'figur', nu: 4 });
  }
  // Treppenhaus vor der Front
  const tu = L * (o.treppe ?? 0.3);
  fb(S, F, tu - 2.2, tu + 2.2, 0, H + 1.4, -0.3, 2.0, '#e3ded1');
  fb(S, F, tu - 0.8, tu + 0.8, 1.2, H - 0.5, 1.9, 2.06, GLAS_HELL);
  fb(S, F, tu - 1.3, tu + 1.3, 0.3, 2.5, 1.95, 2.08, '#5a6570');
  fb(S, F, tu - 2.6, tu + 2.6, 2.6, 2.85, 0, 4, '#f2f1ec');
  if (o.name) ftext(scene, F, o.name, tu, H + 0.6, 2.1, 0.6, 4.2, '#2a3a4a');
  return H + 1.4;
}
function turnhalle(S, scene, x0, z0, w, d, r) {
  const H = 8;
  S.quader(x0, 0, z0, x0 + w, H, z0 + d, '#d6d0c2');
  for (const F of [RZ(x0, z0, w, d), RX(x0, z0, w, d)]) {
    for (let u = 0; u < F.L; u += 3) fb(S, F, u + 0.06, Math.min(F.L, u + 3) - 0.06, 0.3, H - 2.6, 0, 0.12, (u / 3) % 2 ? '#d6d0c2' : '#cdc6b6');
    fb(S, F, 0, F.L, H - 2.6, H - 0.6, -0.1, 0.06, GLAS_HELL);
    for (let u = 0; u <= F.L; u += 1.5) fb(S, F, u - 0.06, u + 0.06, H - 2.6, H - 0.6, 0, 0.12, '#f2f1ec');
    fb(S, F, -0.5, F.L + 0.5, H - 0.6, H + 0.2, -0.2, 0.6, '#f2f1ec');
  }
  S.quader(x0 + 0.4, H, z0 + 0.4, x0 + w - 0.4, H + 0.15, z0 + d - 0.4, '#9e9b94');
  return H;
}
function schulhof(S, r, x0, z0, x1, z1) {
  boden(S, x0, z0, x1, z1, '#9a9fa4', 0.3, 0.08);
  const y = 0.39;
  // Hüpfkästchen und Spielfeld-Markierung
  for (let i = 0; i < 6; i++) S.box(1, 0.02, 1, x0 + 3 + (i % 2) * 1.1, y, z0 + 3 + Math.floor(i / 2) * 1.1, ['#e8c547', '#f4f3ef', '#c8463c'][i % 3]);
  if (x1 - x0 > 24) { S.quader(x0 + 10, y, z0 + 2, x0 + 24, y + 0.02, z0 + 2.15, '#f4f3ef'); S.quader(x0 + 10, y, z1 - 2.15, x0 + 24, y + 0.02, z1 - 2, '#f4f3ef'); }
  // Tischtennisplatten aus Beton
  for (let i = 0; i < 2; i++) { const tx = x1 - 5 - i * 5, tz = z0 + (z1 - z0) / 2; S.box(0.8, 0.7, 1.2, tx, y + 0.35, tz, '#a9a49a'); S.box(2.7, 0.12, 1.5, tx, y + 0.76, tz, '#3f7d56'); S.box(0.05, 0.2, 1.5, tx, y + 0.92, tz, '#f4f3ef'); }
  // Fahnenmast
  S.box(0.15, 10, 0.15, x0 + 2, y + 5, z1 - 2, '#d9dcdf');
  S.box(0.05, 1.1, 1.8, x0 + 2, y + 9.2, z1 - 1.05, '#2f6fa8');
  // Fahrradständer
  for (let i = 0; i < 6; i++) S.box(0.06, 0.7, 1.6, x0 + 6 + i * 0.6, y + 0.4, z1 - 1.5, '#59636b');
}
function schuleRoh(S, scene, p) {
  const r = rng(`sc:${p.seed}`);
  const v = p.variante ?? waehle(r, ['erfurt', 'winkel', 'kita']);
  const { x: x0, z: z0, w, d } = p;
  boden(S, x0, z0, x0 + w, z0 + d, RASEN, 0.3, 0.06);
  const farben = waehle(r, [['#e07a3f', '#e8b53c', '#3f7d9a', '#7fae5a'], ['#c9483e', '#e9e5da', '#2f6f8f', '#e9e5da'], ['#b9ae98', '#c4b9a3', '#b9ae98', '#c4b9a3'], ['#3f8f7a', '#e8c547', '#e07a3f', '#5a7fae']]);
  const name = p.name ?? `${1 + Math.floor(r() * 12)}. Oberschule`;
  if (v === 'kita') {
    const H = 7.4, bw = Math.min(w - 16, 40), bx = x0 + 4, bz = z0 + 6;
    // H-förmig: zwei Flügel, Mittelbau
    for (const [fx, fz, fw, fd] of [[bx, bz, 14, 26], [bx + bw - 14, bz, 14, 26], [bx + 14, bz + 8, bw - 28, 10]]) {
      S.quader(fx, 0, fz, fx + fw, H, fz + fd, '#e9e5da');
      for (const F of [RZ(fx, fz, fw, fd), RX(fx, fz, fw, fd)]) for (let k = 0; k < 2; k++) {
        const y = 0.6 + k * 3.3;
        for (let u = 0; u < F.L; u += 2.4) fb(S, F, u + 0.05, Math.min(F.L, u + 2.4) - 0.05, y, y + 0.9, -0.1, 0.16, farben[Math.floor(u / 2.4 + k) % farben.length]);
        fb(S, F, 0.3, F.L - 0.3, y + 0.9, y + 2.7, -0.1, 0.06, GLAS_HELL);
        for (let u = 0.3; u <= F.L - 0.29; u += 1.2) fb(S, F, u - 0.04, u + 0.04, y + 0.9, y + 2.7, 0, 0.1, '#f2f1ec');
      }
      S.quader(fx - 0.4, H, fz - 0.4, fx + fw + 0.4, H + 0.5, fz + fd + 0.4, '#f2f1ec');
    }
    ftext(scene, RZ(bx + 14, bz + 8, bw - 28, 10), 'Kinderkrippe und Kindergarten', (bw - 28) / 2, H - 0.3, 0.2, 0.55, bw - 30, '#c8463c');
    // Spielgarten mit Zaun
    const gz0 = bz + 26 + 2;
    for (let i = 0; i < 3; i++) { const sx = x0 + 8 + i * 12, sz = gz0 + 5; S.quader(sx - 2.4, 0.36, sz - 2.4, sx + 2.4, 0.7, sz + 2.4, '#c9b48c'); S.quader(sx - 2, 0.36, sz - 2, sx + 2, 0.74, sz + 2, '#e8d9a8'); }
    stab(S, [x0 + w - 10, 0.4, gz0 + 4], [x0 + w - 6, 2.4, gz0 + 4], 0.3, '#e8c547', 6);
    S.box(1.2, 2.4, 1.2, x0 + w - 5.4, 1.5, gz0 + 4, '#c8463c');
    S.quader(x0 + 1, 0.36, z0 + d - 1.2, x0 + w - 1, 1.4, z0 + d - 1.1, '#6b8a5a');
    S.quader(x0 + w - 1.2, 0.36, z0 + 1, x0 + w - 1.1, 1.4, z0 + d - 1, '#6b8a5a');
    hofGruen(S, r, x0 + bw + 6, z0 + 2, x0 + w - 2, gz0, { waesche: false, teppich: false, weg: false, maxBaeume: 4 });
    return { hoehe: H + 0.5 };
  }
  if (v === 'winkel') {
    const T = 13, zf = z0 + d - 18, xf = x0 + w - 6;
    schulhof(S, r, x0 + 2, zf + 1, x0 + w - 2, z0 + d - 2);
    const FA = R(x0 + 4, zf, 1, 0, xf - T - x0 - 4), FB = R(xf, zf, 0, -1, zf - z0 - 4);
    let H = schulTrakt(S, scene, FA, T, { n: 4, r, farben, giebel: false, name, treppe: 0.35 });
    H = Math.max(H, schulTrakt(S, scene, FB, T, { n: 4, r, farben, salz: 1, giebel: false, treppe: 0.55 }));
    fb(S, endeLinks(FB, T), 0, T, 0, 0.9 + 4 * 3.3 + 0.6, -0.2, 0.15, '#d6d0c2');
    turnhalle(S, scene, x0 + 4, z0 + 4, Math.min(30, xf - T - x0 - 8), zf - T - z0 - 6, r);
    return { hoehe: H };
  }
  // Erfurter Typ: Klassentrakt, Verbinder, Turnhalle
  const T = 13, zf = z0 + Math.min(d - 18, Math.max(T + 4, d * 0.55)), L = Math.min(w - 34, 64);
  schulhof(S, r, x0 + 2, zf + 1, x0 + w - 2, z0 + d - 2);
  const F = R(x0 + 4, zf, 1, 0, L);
  const H = schulTrakt(S, scene, F, T, { n: 4, r, farben, name, treppe: 0.3 });
  const tx = x0 + 4 + L + 8, tw = Math.min(x0 + w - 3 - tx, 20), td = 30;
  turnhalle(S, scene, tx, zf - td + 2, tw, td, r);
  S.quader(x0 + 4 + L, 0, zf - 8, tx, 3.6, zf - 4, '#e3ded1');
  fb(S, R(x0 + 4 + L, zf - 4, 1, 0, 8), 0.3, 7.7, 0.8, 3.0, 0, 0.06, GLAS_HELL);
  hofGruen(S, r, x0 + 2, z0 + 2, x0 + 4 + L, zf - T - 1, { spiel: false, waesche: false, teppich: false, maxBaeume: 6 });
  return { hoehe: H };
}
function schule(S, scene, p) {
  const v = p.variante ?? waehle(rng(`sc:${p.seed}`), ['erfurt', 'winkel', 'kita']);
  const min = { erfurt: [80, 52], winkel: [60, 54], kita: [52, 46] }[v];
  if (p.w >= min[0] && p.d >= min[1]) return schuleRoh(S, scene, { ...p, variante: v });
  return skaliert(S, scene, { ...p, variante: v }, Math.max(min[0], p.w), Math.max(min[1], p.d), schuleRoh);
}

// =====================================================================================
// Nachwendebauten der 90er
// =====================================================================================
function wendebauRoh(S, scene, p) {
  const r = rng(`wb:${p.seed}`);
  const v = p.variante ?? waehle(r, ['bullauge', 'passage', 'sparkasse']);
  const { x: x0, z: z0, w, d } = p;
  boden(S, x0, z0, x0 + w, z0 + d, '#d3cfc6', 0.3, 0.07);
  if (v === 'bullauge') {
    const bw = Math.min(w - 4, 36), bd = Math.min(d - 4, 24), bx = x0 + 2, bz = z0 + 2, n = 6, gh = 3.4, y0 = 4.2, H = y0 + n * gh;
    const glas = '#5f9fb0', alu = '#eef0f1', granit = '#b07a6a';
    const rr = 6;
    S.quader(bx, 0, bz, bx + bw - rr, H, bz + bd, '#3d5a66');
    S.quader(bx, 0, bz, bx + bw, H, bz + bd - rr, '#3d5a66');
    zyl(S, rr, rr, H, bx + bw - rr, 0, bz + bd - rr, '#3d5a66', 20);
    const FZ = R(bx, bz + bd, 1, 0, bw - rr), FX = R(bx + bw, bz + bd - rr, 0, -1, bd - rr);
    for (const F of [FZ, FX]) {
      fb(S, F, 0, F.L, 0.3, y0, -0.2, 0.15, granit);
      fb(S, F, 0, F.L, y0, H, -0.1, 0.02, glas);
      for (let u = 0; u <= F.L + 0.01; u += 1.5) fb(S, F, u - 0.06, u + 0.06, y0, H, 0, 0.15, alu);
      for (let k = 0; k <= n; k++) fb(S, F, 0, F.L, y0 + k * gh - 0.08, y0 + k * gh + 0.08, 0, 0.15, alu);
      fb(S, F, 0.6, F.L - 0.6, 0.6, y0 - 0.6, 0.15, 0.2, GLAS);
    }
    zyl(S, rr + 0.05, rr + 0.05, H - y0, bx + bw - rr, y0, bz + bd - rr, glas, 20);
    for (let k = 0; k <= n; k++) zyl(S, rr + 0.15, rr + 0.15, 0.16, bx + bw - rr, y0 + k * gh - 0.08, bz + bd - rr, alu, 20, true);
    zyl(S, rr + 0.1, rr + 0.1, y0 - 0.3, bx + bw - rr, 0.3, bz + bd - rr, granit, 20);
    // Treppenturm mit Bullaugen
    const tu = FZ.L * 0.28;
    fb(S, FZ, tu - 2.2, tu + 2.2, 0, H + 2.4, -0.2, 1.4, '#e9e4dc');
    for (let k = 0; k < n + 1; k++) fscheibe(S, FZ, tu, y0 + k * gh - 1.2, 1.35, 1.5, 0.75, GLAS, 16);
    for (let k = 0; k < n + 1; k++) fscheibe(S, FZ, tu, y0 + k * gh - 1.2, 1.3, 1.45, 0.95, alu, 16);
    // Glaspyramide, Vordach, Fahnen
    const g = walmdach(12, 10, 5); g.translate(bx + bw * 0.45, H, bz + bd * 0.45); S.add(g, '#7fb3c2');
    // Dachrand folgt der Rundung: zwei Rechtecke plus Viertelscheibe
    S.quader(bx + 0.5, H, bz + 0.5, bx + bw - rr, H + 0.6, bz + bd - 1, '#e9e4dc');
    S.quader(bx + bw - rr - 0.01, H, bz + 0.5, bx + bw - 1, H + 0.6, bz + bd - rr, '#e9e4dc');
    zyl(S, rr - 1, rr - 1, 0.6, bx + bw - rr, H, bz + bd - rr, '#e9e4dc', 20);
    fb(S, FZ, FZ.L * 0.55, FZ.L * 0.9, y0 - 0.2, y0 + 0.1, 0, 3.0, alu);
    ftext(scene, FZ, p.name ?? 'Bürocenter am Ring', FZ.L * 0.72, y0 - 0.9, 0.25, 0.7, FZ.L * 0.4, '#1f3a5f');
    for (let i = 0; i < 3; i++) { const fx = x0 + w - 3 - i * 2.4; S.box(0.12, 9, 0.12, fx, 4.8, z0 + d - 1, '#d9dcdf'); S.box(0.05, 2.4, 1.2, fx + 0.06, 8.1, z0 + d - 0.35, ['#1f3a5f', '#c8463c', '#f4f3ef'][i]); }
    return { hoehe: H + 5.5 };
  }
  if (v === 'passage') {
    const bw = Math.min(w - 4, 54), bd = Math.min(d - 4, 32), bx = x0 + 2, bz = z0 + 2, n = 2, gh = 3.8, eg = 4.6, H = eg + n * gh;
    const stein = waehle(r, ['#d9b9a4', '#e3cfb6', '#cfb4a2']), orn = '#f3ece0';
    S.quader(bx, 0, bz, bx + bw - 0.3, H, bz + bd - 0.3, GLAS);
    S.quader(bx + 0.2, H, bz + 0.2, bx + bw - 0.2, H + 0.25, bz + bd - 0.2, '#a9a59c');
    const mitte = bw * 0.5, pb = 9;
    for (const F of [RZ(bx, bz, bw, bd), RX(bx, bz, bw, bd)]) {
      const L = [];
      const ax = achsen(0, F.L, 4.2, 0.6);
      for (const u of ax) {
        if (F.dz === 0 && Math.abs(u - mitte) < pb / 2 + 2.4) continue;
        L.push({ u0: u - 1.6, u1: u + 1.6, v0: 0.4, v1: eg - 0.8, bogen: false });
        for (let k = 0; k < n; k++) L.push({ u0: u - 0.9, u1: u + 0.9, v0: eg + k * gh + 0.8, v1: eg + k * gh + 3.0, bogen: k === n - 1 });
      }
      if (F.dz === 0) L.push({ u0: mitte - pb / 2, u1: mitte + pb / 2, v0: 0.3, v1: H - 1.2, bogen: true });
      fwand(S, F, 0, F.L, 0, H, -0.4, 0, stein, L);
      for (let y = 1; y < eg; y += 1) fb(S, F, 0, F.L, y - 0.03, y + 0.03, 0, 0.03, dunkler(stein, 0.06));
      fb(S, F, -0.2, F.L + 0.2, eg - 0.3, eg, -0.4, 0.35, orn);
      fb(S, F, -0.4, F.L + 0.4, H, H + 0.6, -0.4, 0.6, orn);
      for (const u of ax) { if (F.dz === 0 && Math.abs(u - mitte) < pb / 2 + 2.4) continue; fb(S, F, u - 1.8, u + 1.8, eg - 1.1, eg - 0.7, 0, 1.2, waehle(r, ['#2f6f8f', '#3f7d56', '#8c3b3b', '#d39a2b'])); }
    }
    // Glastonne über der Passage
    const g = new THREE.CylinderGeometry(pb / 2, pb / 2, bd + 1.5, 16, 1, false, 0, PI); g.rotateX(PI / 2); g.rotateZ(PI / 2); g.translate(bx + mitte, H + 0.2, bz + bd / 2 + 0.6); S.add(g, '#9fc3cf');
    for (let i = 0; i <= 6; i++) { const t = bz + 0.2 + (i * (bd + 1)) / 6; const ring = new THREE.TorusGeometry(pb / 2 + 0.05, 0.12, 4, 16, PI); ring.translate(bx + mitte, H + 0.2, t); S.add(ring, '#e9ecee'); }
    const FZ = RZ(bx, bz, bw, bd);
    ftext(scene, FZ, p.name ?? 'Markt-Passage', mitte, H - 0.6, 0.65, 1.0, pb * 2.2, '#1f3a5f');
    fb(S, FZ, mitte - pb / 2, mitte + pb / 2, 0.3, H - 1.2, -0.29, -0.2, GLAS_HELL);
    for (let i = 0; i < 4; i++) { const fx = x0 + 4 + i * 2.5; S.box(0.12, 9, 0.12, fx, 4.8, z0 + d - 1, '#d9dcdf'); S.box(0.05, 2.4, 1.2, fx + 0.06, 8.1, z0 + d - 0.35, ['#e8c547', '#c8463c', '#2f6fa8', '#3b8a5a'][i]); }
    for (let i = 0; i < 4; i++) baum(S, bx + bw * 0.62 + i * 5, z0 + d - 1.2, r, 0.8);
    return { hoehe: H + pb / 2 };
  }
  // Bank-Neubau der 90er (fiktive Lindenbank)
  const bw = Math.min(w - 4, 32), bd = Math.min(d - 4, 22), bx = x0 + 2, bz = z0 + 2, n = 3, gh = 3.5, eg = 4.4, H = eg + n * gh;
  const stein = waehle(r, ['#e6dccb', '#d9cbb5']), rot = '#2f6a5a';
  // Glaskörper hinter der Lochfassade zurückgesetzt (sonst liegt die Wandaußenseite in derselben Ebene und flimmert)
  S.quader(bx, 0, bz, bx + bw - 0.6, eg, bz + bd - 0.6, GLAS);
  S.quader(bx, eg, bz, bx + bw - 0.3, H, bz + bd - 0.3, GLAS);
  S.quader(bx + 0.2, H, bz + 0.2, bx + bw - 0.2, H + 0.3, bz + bd - 0.2, '#a9a59c');
  for (const F of [RZ(bx, bz, bw, bd), RX(bx, bz, bw, bd)]) {
    const L = [];
    for (const u of achsen(0, F.L, 3.0, 0.8)) for (let k = 0; k < n; k++) L.push({ u0: u - 0.85, u1: u + 0.85, v0: eg + k * gh + 0.7, v1: eg + k * gh + 2.9 });
    fwand(S, F, 0, F.L, eg, H, -0.4, 0, stein, L);
    fb(S, F, 0, F.L, 0, eg, -0.6, -0.5, GLAS_HELL);
    for (let u = 0; u <= F.L; u += 2) fb(S, F, u - 0.15, u + 0.15, 0.3, eg, -0.5, 0.1, '#8b8f93');
    fb(S, F, -0.2, F.L + 0.2, eg - 0.4, eg, -0.5, 0.3, '#8b8f93');
    fb(S, F, -0.3, F.L + 0.3, H, H + 0.5, -0.4, 0.4, stein);
  }
  // postmoderner Glasgiebel und Eckerker
  const FZ = RZ(bx, bz, bw, bd);
  fpoly(S, FZ, [[bw * 0.25, H + 0.5], [bw * 0.75, H + 0.5], [bw * 0.5, H + 5]], -bd + 1, 0, '#9fc3cf');
  fpoly(S, FZ, [[bw * 0.23, H + 0.4], [bw * 0.77, H + 0.4], [bw * 0.5, H + 5.3], [bw * 0.5, H + 4.8], [bw * 0.7, H + 0.8], [bw * 0.3, H + 0.8], [bw * 0.5, H + 4.8], [bw * 0.5, H + 5.3]], 0, 0.2, '#f3f1ec');
  S.quader(bx + bw - 4, eg, bz + bd - 4, bx + bw + 0.8, H, bz + bd + 0.8, '#9fc3cf');
  for (let k = 0; k <= n; k++) S.quader(bx + bw - 4.05, eg + k * gh - 0.1, bz + bd - 4.05, bx + bw + 0.85, eg + k * gh + 0.1, bz + bd + 0.85, '#f3f1ec');
  fb(S, FZ, bw * 0.12, bw * 0.12 + 6.5, eg - 0.2, eg + 1.6, 0, 0.35, rot);
  ftext(scene, FZ, 'Lindenbank', bw * 0.12 + 3.25, eg + 0.7, 0.38, 1.1, 6, '#ffffff');
  ftext(scene, FZ, 'Geldautomat', bw * 0.55, 2.6, 0.15, 0.4, 4, rot);
  parkreihe(S, r, x0 + 2, x0 + w - 2, z0 + d - 1.4, { modern: 0.9, dichte: 0.5 });
  return { hoehe: H + 5.3 };
}
function wendebau(S, scene, p) {
  const v = p.variante ?? waehle(rng(`wb:${p.seed}`), ['bullauge', 'passage', 'sparkasse']);
  const min = { bullauge: [30, 24], passage: [40, 28], sparkasse: [26, 22] }[v];
  if (p.w >= min[0] && p.d >= min[1]) return wendebauRoh(S, scene, { ...p, variante: v });
  return skaliert(S, scene, { ...p, variante: v }, Math.max(min[0], p.w), Math.max(min[1], p.d), wendebauRoh);
}

// =====================================================================================
// Gründerzeit-Altbau Ost: unsaniert, leer, saniert
// =====================================================================================
function altFassade(S, scene, F, c, r, o) {
  const { n, eg, gh, wand, orn, zustand } = c, L = F.L, H = eg + n * gh;
  const ax = achsen(0, L, c.ra, 0.7);
  const L2 = [];
  ax.forEach((u, i) => {
    L2.push(i === Math.floor(ax.length / 2) && o.haupt ? { u0: u - 0.9, u1: u + 0.9, v0: 0.3, v1: 3.3, bogen: true } : { u0: u - 1.0, u1: u + 1.0, v0: 0.9, v1: eg - 0.6, bogen: false });
    for (let k = 0; k < n; k++) L2.push({ u0: u - 0.62, u1: u + 0.62, v0: eg + k * gh + 0.9, v1: eg + k * gh + 3.0, bogen: k === 0 && c.bogen });
  });
  fwand(S, F, 0, L, 0, H, -0.45, 0, wand, L2);
  // Fensterfüllung je nach Zustand
  ax.forEach((u, i) => {
    for (let k = -1; k < n; k++) {
      const y = k < 0 ? 0.9 : eg + k * gh + 0.9, hh = k < 0 ? eg - 1.5 : 2.1, b = k < 0 ? 2.0 : 1.24;
      const h = hash(i, k, o.salz ?? 0) % 100;
      if (zustand === 'leer' && (k < 0 || h < 45)) { fb(S, F, u - b / 2 + 0.05, u + b / 2 - 0.05, y, y + hh - 0.05, -0.3, -0.22, '#8a6a4a'); fb(S, F, u - b / 2, u + b / 2, y + hh * 0.45, y + hh * 0.55, -0.22, -0.16, '#7a5a3e'); }
      else if (zustand === 'leer' && h < 70) fb(S, F, u - b / 2 + 0.1, u + b / 2 - 0.1, y + hh * 0.5, y + hh - 0.1, -0.35, -0.3, '#262b30');
      else if (k >= 0) { fb(S, F, u - 0.04, u + 0.04, y, y + hh, -0.35, -0.28, zustand === 'saniert' ? '#ffffff' : '#d4cfc4'); fb(S, F, u - b / 2, u + b / 2, y + hh * 0.66, y + hh * 0.66 + 0.07, -0.35, -0.28, zustand === 'saniert' ? '#ffffff' : '#d4cfc4'); }
      // Stuck: Verdachungen, Bänke (unsaniert teils abgefallen)
      if (k >= 0) {
        const fehlt = zustand !== 'saniert' && h % 3 === 0;
        fb(S, F, u - 0.8, u + 0.8, y - 0.14, y, 0, 0.2, fehlt ? dunkler(wand, 0.04) : orn);
        if (!fehlt && k <= 1) fb(S, F, u - 0.85, u + 0.85, y + hh + 0.1, y + hh + 0.35, 0, 0.28, orn);
        if (!fehlt && k === 1) fpoly(S, F, [[u - 0.85, y + hh + 0.35], [u + 0.85, y + hh + 0.35], [u, y + hh + 0.8]], 0, 0.22, orn);
      }
    }
  });
  // Balkone: saniert mit Gitter, unsaniert nur Konsolenstümpfe
  if (o.haupt) for (const i of [1, ax.length - 2]) {
    if (i < 0 || i >= ax.length) continue;
    const u = ax[i];
    for (let k = 1; k < n; k++) {
      const y = eg + k * gh + 0.75;
      if (zustand === 'saniert') { fb(S, F, u - 1.2, u + 1.2, y - 0.2, y, 0, 1.2, orn); fb(S, F, u - 1.2, u + 1.2, y + 0.9, y + 0.98, 1.1, 1.2, '#2b2f33'); for (let s = -1; s <= 1; s += 0.5) fb(S, F, u + s * 1.1 - 0.03, u + s * 1.1 + 0.03, y, y + 0.95, 1.1, 1.18, '#2b2f33'); }
      else { fb(S, F, u - 1.0, u - 0.8, y - 0.5, y, 0, 0.7, dunkler(wand, 0.1)); fb(S, F, u + 0.8, u + 1.0, y - 0.5, y, 0, 0.7, dunkler(wand, 0.1)); }
    }
  }
  // Gesimse
  fb(S, F, -0.05, L + 0.05, 0, 0.9, -0.45, 0.15, c.sockel);
  fb(S, F, -0.1, L + 0.1, eg - 0.25, eg + 0.1, -0.45, 0.35, orn);
  fb(S, F, -0.3, L + 0.3, H - 0.1, H + 0.6, -0.45, 0.7, orn);
  for (let u = 0.6; u < L; u += 1.2) fb(S, F, u - 0.1, u + 0.1, H - 0.45, H - 0.1, 0, 0.55, orn);
  // Putzschäden und Ziegelflecken
  if (zustand !== 'saniert') {
    const nf = Math.round(L * n * 0.25);
    for (let i = 0; i < nf; i++) {
      const u = zw(r, 0.3, L - 1.5), y = zw(r, 1.2, H - 1.5), bb = zw(r, 0.6, 2.2), hh = zw(r, 0.5, 1.8);
      fb(S, F, u, u + bb, y, y + hh, 0, 0.04, r() < 0.3 ? '#9e6550' : r() < 0.5 ? dunkler(wand, 0.06) : heller(wand, 0.04));
    }
    // Einschusslöcher-Andeutung
    for (let i = 0; i < Math.round(L * 0.8); i++) { const u = zw(r, 0.5, L - 0.5), y = zw(r, eg, eg + 2 * gh); fb(S, F, u - 0.07, u + 0.07, y - 0.07, y + 0.07, 0, 0.03, '#6f6a62'); }
  }
  // Laden im Erdgeschoss
  if (o.haupt && zustand === 'saniert') {
    for (let i = 0; i < ax.length; i++) if (i !== Math.floor(ax.length / 2) && i % 2 === 0) markiseF(S, F, ax[i] - 1.1, ax[i] + 1.1, eg - 0.5, waehle(r, ['#c9483e', '#2f6f8f', '#3f7d56', '#d39a2b']));
    ftext(scene, F, waehle(r, ['Café Rosengarten', 'Buchladen', 'Bäckerei', 'Blumenstube', 'Weinhandlung']), ax[0] + 1.5, eg - 0.15, 0.4, 0.4, 5, '#2a3a4a');
  } else if (o.haupt && zustand === 'leer') {
    ftext(scene, F, 'Zu vermieten', ax[ax.length - 1], 2.0, 0.05, 0.4, 2.0, '#c8302a', '#f4f1e8');
    for (let i = 0; i < 5; i++) fb(S, F, zw(r, 0.5, L - 2), zw(r, 0.5, L - 2) + zw(r, 0.6, 1.6), 0.9, 0.9 + zw(r, 0.4, 1.4), 0.15, 0.18, waehle(r, ['#c8463c', '#2f6fa8', '#e8c547', '#3b8a5a']));
  }
  return H;
}
function markiseF(S, F, u0, u1, y, farbe) {
  const g = new THREE.BoxGeometry(u1 - u0, 0.12, 1.5);
  g.rotateX(0.35); g.translate((u0 + u1) / 2, y, 0.75);
  fgeo(S, F, g, farbe);
}
function brandwand(S, scene, F, H, r, o = {}) {
  const L = F.L, wand = o.wand ?? '#9b958b';
  fb(S, F, 0, L, 0, H, -0.4, 0, wand);
  // Abdruck des abgerissenen Nachbarhauses
  const hN = H * zw(r, 0.55, 0.8);
  fpoly(S, F, [[0.4, 0.3], [L - 0.4, 0.3], [L - 0.4, hN], [L / 2, hN + zw(r, 2.5, 4)], [0.4, hN]], 0, 0.04, dunkler(wand, 0.07));
  // Tapeten- und Fliesenreste der früheren Räume
  const nE = Math.max(2, Math.floor(hN / 3.3));
  for (let k = 1; k < nE; k++) for (let i = 0; i < 3; i++) {
    if (r() < 0.45) continue;
    const u0 = 0.8 + i * (L - 1.6) / 3, b = (L - 1.6) / 3 - 0.4;
    fb(S, F, u0, u0 + b * zw(r, 0.5, 1), k * 3.3 + 0.6, k * 3.3 + zw(r, 1.6, 2.8), 0.04, 0.07, waehle(r, ['#c9b7a0', '#a9b8a8', '#c4a7a7', '#b8b49a', '#9fb0bf', '#d6d0c0']));
  }
  for (let k = 1; k < nE; k++) fb(S, F, 0.4, L - 0.4, k * 3.3 - 0.12, k * 3.3 + 0.12, 0.04, 0.08, dunkler(wand, 0.12));
  fb(S, F, L * 0.62, L * 0.62 + 0.8, 0.3, H, 0.04, 0.08, dunkler(wand, 0.1));
  // verblasste Reklame
  if (o.reklame !== false) {
    const t = waehle(r, ['Kaffee-Rösterei Lindner', 'Kohlen · Briketts · Koks', 'Seifenfabrik Hartmann', 'Möbelhaus Ebert']);
    fb(S, F, L * 0.15, L * 0.85, H - 4.6, H - 1.4, 0.04, 0.06, '#b5ad9c');
    ftext(scene, F, t, L / 2, H - 3.0, 0.1, 1.2, L * 0.66, '#d8cfba');
  }
}
function altbauRoh(S, scene, p) {
  const r = rng(`ab:${p.seed}`);
  const zustand = p.zustand ?? waehle(r, ['unsaniert', 'unsaniert', 'leer', 'saniert']);
  const eck = p.variante === 'eck';
  const { x: x0, z: z0, w, d } = p;
  const n = p.geschosse ?? (4 + (r() < 0.3 ? 1 : r() < 0.25 ? -1 : 0)), eg = 4.2, gh = zw(r, 3.3, 3.55), H = eg + n * gh, T = Math.min(d, 15);
  const wand = zustand === 'saniert' ? waehle(r, ['#e9c46a', '#e6b8a2', '#c9d6b5', '#b9cbd8', '#f1e2c0', '#d9a68e', '#efd8c0']) : zustand === 'leer' ? waehle(r, ['#8f8a81', '#99938a']) : waehle(r, ['#a39e94', '#9d978c', '#aaa498', '#a49d8e']);
  const c = { n, eg, gh, wand, orn: zustand === 'saniert' ? '#fbf7ee' : heller(wand, 0.05), sockel: zustand === 'saniert' ? dunkler(wand, 0.15) : dunkler(wand, 0.1), zustand, ra: 3.1, bogen: r() < 0.5 };
  const zb = z0 + d - T;
  S.quader(x0, 0, zb, x0 + w - 0.45, H, z0 + d - 0.45, GLAS);
  const FZ = RZ(x0, z0, w, d), FX = R(x0 + w, z0 + d, 0, -1, T);
  altFassade(S, scene, FZ, c, r, { haupt: true, salz: 1 });
  if (eck) altFassade(S, scene, FX, c, r, { haupt: false, salz: 2 });
  else brandwand(S, scene, FX, H + 2, r, { wand: zustand === 'saniert' ? dunkler(wand, 0.03) : dunkler(wand, 0.03), reklame: zustand !== 'saniert' || r() < 0.3 });
  // Dach
  const dh = 4.2, dach = zustand === 'saniert' ? '#b4583f' : zustand === 'leer' ? '#575a5d' : '#64676a';
  const g = dachProfil(w, T + 0.6, dh, 0.4, 'x'); g.translate(x0 + w / 2, H + 0.6, zb + T / 2); S.add(g, dach);
  if (eck) { const pyr = walmdach(T + 0.6, T + 0.6, dh); pyr.translate(x0 + w - T / 2, H + 0.6, zb + T / 2); S.add(pyr, dach); }
  else fpoly(S, endeRechts(FZ, T), [[-0.3, H + 0.6], [T + 0.3, H + 0.6], [T / 2, H + 0.6 + dh]], -0.4, 0.02, dunkler(wand, 0.03));
  const neig = Math.atan2(dh, T / 2);
  const aufDach = (u, s, bb, tt, farbe) => { const gg = new THREE.BoxGeometry(bb, 0.08, tt); gg.rotateX(neig); gg.translate(x0 + u, H + 0.6 + s * dh + 0.06, z0 + d - s * T / 2); S.add(gg, farbe); };
  if (zustand !== 'saniert') for (let i = 0; i < (zustand === 'leer' ? 7 : 4); i++) aufDach(zw(r, 1.5, w - 2), zw(r, 0.15, 0.75), zw(r, 0.8, 2.2), zw(r, 0.6, 1.6), zustand === 'leer' ? '#2a2c2f' : waehle(r, ['#4c4f53', '#7d7f80', '#2a2c2f']));
  // Gauben, Schornsteine
  const ng = Math.floor(w / 6);
  for (let i = 0; i < ng; i++) {
    const u = ((i + 0.5) * w) / ng, s = 0.35, yb = H + 0.6 + s * dh, zf = z0 + d - s * T / 2;
    S.quader(x0 + u - 0.8, H + 0.6, zf - 2, x0 + u + 0.8, yb + 1.5, zf, zustand === 'saniert' ? '#efe9dc' : '#7d7f80');
    S.box(1.0, 1.0, 0.1, x0 + u, yb + 0.7, zf + 0.02, zustand === 'leer' ? '#262b30' : GLAS);
    S.quader(x0 + u - 1.0, yb + 1.5, zf - 2.2, x0 + u + 1.0, yb + 1.7, zf + 0.2, dach);
  }
  for (const u of [w * 0.25, w * 0.7]) S.quader(x0 + u - 0.5, H + 2, zb + T * 0.45, x0 + u + 0.5, H + dh + 2, zb + T * 0.45 + 1.0, zustand === 'saniert' ? '#b9654e' : '#7a6a60');
  if (zustand === 'unsaniert') for (let i = 0; i < 3; i++) antenne(S, x0 + zw(r, 2, w - 2), H + dh, zb + T / 2, r);
  if (zustand === 'leer') { const bx = x0 + w * zw(r, 0.2, 0.8); const bg = new THREE.IcosahedronGeometry(0.8, 0); bg.translate(bx, H + 1.4, z0 + d + 0.3); S.add(bg, '#6f9f5c'); S.box(0.12, 0.8, 0.12, bx, H + 0.8, z0 + d + 0.3, '#e9e6de'); }
  boden(S, x0, zb + T, x0 + w, z0 + d, WEG, 0.3, 0.06);
  if (d > T + 3) hofGruen(S, r, x0, z0, x0 + w, zb, { spiel: false, teppich: zustand !== 'saniert', maxBaeume: 3, rasen: zustand === 'saniert' ? RASEN : '#a8b98a' });
  return { hoehe: H + dh + 2 };
}
function altbau(S, scene, p) {
  if (p.w > 34 && p.d >= 12) {
    // breite Slots: Zeile aus mehreren Häusern, Eckhaus bzw. Brandwand nur am +x-Ende
    const r = rng(`abz:${p.seed}`), teile = [];
    let rest = p.w;
    while (rest > 34) { const b = Math.round(zw(r, 15, 22)); teile.push(b); rest -= b; }
    teile.push(rest);
    let x = p.x, H = 0;
    teile.forEach((b, i) => {
      const letzt = i === teile.length - 1;
      const zst = p.zustand && r() < 0.6 ? p.zustand : waehle(r, ['unsaniert', 'unsaniert', 'leer', 'saniert']);
      H = Math.max(H, altbauRoh(S, scene, { ...p, x, w: b, seed: p.seed * 31 + i, zustand: zst, variante: letzt ? p.variante : 'zeile' }).hoehe);
      x += b;
    });
    return { hoehe: H };
  }
  if (p.w >= 14 && p.d >= 12) return altbauRoh(S, scene, p);
  return skaliert(S, scene, p, Math.max(14, p.w), Math.max(12, p.d), altbauRoh);
}

// =====================================================================================
// Brache: Kriegs- oder Abrisslücke
// =====================================================================================
function plakatwand(S, scene, x, z, b, h, text, farbe, ry = 0) {
  const F = R(x, z, Math.cos(ry), -Math.sin(ry), b);
  for (const u of [b * 0.2, b * 0.8]) fb(S, F, u - 0.12, u + 0.12, 0.3, 2.2, -0.3, -0.06, '#59636b');
  fb(S, F, -0.1, b + 0.1, 2.2, 2.2 + h, -0.12, 0, '#3f474e');
  fb(S, F, 0.1, b - 0.1, 2.3, 2.1 + h, 0, 0.04, farbe);
  const sc = scene;
  ftext(sc, F, text, b / 2, 2.2 + h / 2, 0.06, h * 0.32, b * 0.86, '#ffffff');
}
function bracheRoh(S, scene, p) {
  const r = rng(`br:${p.seed}`);
  const v = p.variante ?? waehle(r, ['wiese', 'parkplatz', 'kiosk', 'bauzaun']);
  const { x: x0, z: z0, w, d } = p;
  const Hn = p.nachbarHoehe ?? zw(r, 17, 21);
  // Brandwände nur dort, wo wirklich ein Nachbarhaus steht (p.brandwand / p.brandwandHinten setzt der Stadtplan)
  const links = p.brandwand ?? true, hinten = p.brandwandHinten ?? false;
  if (links) { brandwand(S, scene, R(x0 + 0.4, z0 + d, 0, -1, d), Hn, r, { wand: waehle(r, ['#9b958b', '#a39c90', '#8f8a81']), reklame: r() < 0.6 }); S.quader(x0, 0, z0, x0 + 0.4, Hn + 0.3, z0 + d, '#8f8a81'); }
  if (hinten) { brandwand(S, scene, R(x0 + 0.4, z0 + 0.4, 1, 0, w - 0.4), Hn * zw(r, 0.85, 1.05), r, { reklame: false }); S.quader(x0, 0, z0, x0 + w, Hn * 0.9, z0 + 0.4, '#8f8a81'); }
  const xi = x0 + 0.8, zi = z0 + 0.8;
  if (v === 'parkplatz') {
    boden(S, xi, zi, x0 + w, z0 + d, '#a59e8e', 0.3, 0.06);
    for (let i = 0; i < 40; i++) S.box(zw(r, 0.4, 1.6), 0.03, zw(r, 0.4, 1.6), zw(r, xi + 1, x0 + w - 1), 0.37, zw(r, zi + 1, z0 + d - 1), waehle(r, ['#8f897b', '#b8b2a2', '#7f8a6a']));
    parkreihe(S, r, xi + 1, x0 + w - 1, zi + 3, { quer: true, modern: 0.25, dichte: 0.75 });
    parkreihe(S, r, xi + 1, x0 + w - 6, z0 + d - 4, { quer: true, modern: 0.25, dichte: 0.6 });
    const [px, pz] = [x0 + w - 3, z0 + d - 2];
    S.box(1.2, 2.2, 1.0, px, 1.4, pz, '#e9e6de'); S.box(1.4, 0.2, 1.2, px, 2.6, pz, '#2f6fa8');
    plakatwand(S, scene, x0 + w - 1.2, z0 + d - 2, Math.min(9, d - 4), 3, 'Parken 1 DM / Std.', '#2f6fa8', PI / 2);
    for (let i = 0; i < 4; i++) busch(S, xi + 1 + r() * 3, zi + 7 + r() * (d - 10), r, 0.9);
    return { hoehe: Hn };
  }
  boden(S, xi, zi, x0 + w, z0 + d, '#a8b98a', 0.3, 0.06);
  // Trampelpfade
  for (let i = 0; i < 2; i++) {
    const a = [xi + r() * 3, z0 + d - 0.5], b = [x0 + w - 0.5, zi + 3 + r() * (d - 8)];
    const L = wurzelSumme(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
    S.box(L, 0.05, 1.0, (a[0] + b[0]) / 2, 0.39, (a[1] + b[1]) / 2, TRAMPEL, ang);
  }
  for (let i = 0; i < 14; i++) busch(S, zw(r, xi + 1, x0 + w - 1), zw(r, zi + 1, z0 + d - 1), r, zw(r, 0.5, 1.1));
  for (let i = 0; i < 3; i++) { const bx = zw(r, xi + 2, x0 + w - 3), bz = zw(r, zi + 2, zi + 7); S.box(0.25, 3.5, 0.25, bx, 2.0, bz, '#e9e6de'); const g = new THREE.IcosahedronGeometry(1.6, 0); g.scale(0.8, 1.4, 0.8); g.translate(bx, 4.4, bz); S.add(g, '#8fbf6a'); }
  if (v === 'kiosk') {
    const kx = x0 + w - 8, kz = z0 + d - 7;
    S.quader(kx, 0.3, kz, kx + 5.5, 3.0, kz + 4, '#f2efe6');
    fb(S, RZ(kx, kz, 5.5, 4), 0.5, 5.0, 1.2, 2.4, 0, 0.06, GLAS_HELL);
    fb(S, RZ(kx, kz, 5.5, 4), 0.4, 5.1, 1.1, 1.2, 0, 0.6, '#d8d3c6');
    S.quader(kx - 0.5, 3.0, kz - 0.4, kx + 6, 3.3, kz + 5.2, '#c8463c');
    ftext(scene, RZ(kx, kz, 5.5, 4), 'Imbiss · Bratwurst', 2.75, 2.75, 1.25, 0.32, 5.2, '#ffffff', '#c8463c');
    for (let i = 0; i < 2; i++) { S.box(0.7, 1.1, 0.7, kx + 1.2 + i * 2.6, 0.85, kz + 6, '#e9e6de'); schirm(S, kx + 1.2 + i * 2.6, kz + 6, 1.2, '#e8c547'); }
  }
  if (v === 'bauzaun') {
    // Bauzaun nur an der Straßenkante (+z, +x), luftiges Gitter mit Lücken, kein geschlossenes Band
    const zaun = (x, z, quer) => { S.box(quer ? 0.04 : 3.2, 1.9, quer ? 3.2 : 0.04, x, 1.25, z, '#dfe3e6'); S.box(quer ? 0.5 : 0.1, 0.25, quer ? 0.1 : 0.5, x - (quer ? 0 : 1.6), 0.42, z - (quer ? 1.6 : 0), '#e8c547'); };
    for (let x = xi + 1.6; x < x0 + w - 1.6; x += 3.4) if (Math.abs(x - (xi + 8)) > 3) zaun(x, z0 + d - 0.6, false);
    for (let z = zi + 1.6; z < z0 + d - 2; z += 3.4) zaun(x0 + w - 0.6, z, true);
    plakatwand(S, scene, xi + 12, z0 + d - 1.6, Math.min(10, w - 16), 3.0, 'Hier entstehen Wohn- und Geschäftshaus', '#2f6fa8');
    S.box(0.6, 18, 0.6, x0 + w - 6, 9.3, zi + 5, '#e8c547');
    S.box(14, 0.6, 0.6, x0 + w - 9, 18.3, zi + 5, '#e8c547');
    S.box(3, 2.4, 2.4, x0 + w - 4, 1.5, zi + 9, '#e9e6de');
    for (let i = 0; i < 4; i++) S.box(2.4, 0.4, 1.2, xi + 3 + i * 0.3, 0.55 + i * 0.4, zi + 4, '#c9c3b6');
  } else {
    plakatwand(S, scene, xi + 2, z0 + d - 1.2, Math.min(8, w - 8), 3, waehle(r, ['Neue Zeiten. Neues Wohnen.', 'Jetzt Bausparen!', 'Die Zukunft beginnt hier', 'Möbel-Mitnahmemarkt']), waehle(r, ['#c8463c', '#2f6fa8', '#3b8a5a']));
  }
  // parkende Kleinwagen am Rand
  if (v !== 'bauzaun') { ostFahrzeug(S, x0 + w - 3, zi + 4, 'kleinwagen', PI / 2 + 0.2, waehle(r, OST_AUTOFARBEN)); ostFahrzeug(S, x0 + w - 3.4, zi + 8.2, 'limousine', PI / 2 - 0.1, waehle(r, OST_AUTOFARBEN)); }
  return { hoehe: Hn };
}
function brache(S, scene, p) {
  if (p.w >= 16 && p.d >= 14) return bracheRoh(S, scene, p);
  return skaliert(S, scene, p, Math.max(16, p.w), Math.max(14, p.d), bracheRoh);
}

// =====================================================================================
// Messehaus: großes, dichtes Geschäftshaus 1900 bis 1930 mit Passage (Leipziger Typ, kein Einzelbau kopiert)
// =====================================================================================
const MESSE_NAMEN = ['Messehof', 'Handelshof', 'Musterhaus', 'Städtisches Kaufhaus', 'Messepalast', 'Specks Hof', 'Zentralmessehaus', 'Passage am Markt', 'Ringmessehaus', 'Hansahaus'];
const MESSE_FIRMEN = ['Musterlager', 'Spielwaren', 'Porzellan', 'Glas · Keramik', 'Uhren', 'Optik', 'Lederwaren', 'Messeamt', 'Bürobedarf', 'Pelze'];
function messeFassade(S, scene, F, c, r, o) {
  const { n, gh, eg, stein, orn, pfeiler } = c, L = F.L, H = eg + n * gh;
  const ra = c.ra, na = Math.max(2, Math.round(L / ra)), rb = L / na;
  const pmitte = o.passage ? Math.floor(na / 2) : -1;
  // Korpus der Fassade: Glas dahinter, Brüstungsfelder, Pfeiler durchgehend (Pfeilerfassade)
  fb(S, F, 0, L, eg, H, -0.6, -0.45, GLAS);
  for (let i = 0; i < na; i++) {
    const u0 = i * rb, u1 = (i + 1) * rb;
    for (let k = 0; k < n; k++) {
      const y = eg + k * gh;
      fb(S, F, u0 + 0.3, u1 - 0.3, y, y + 1.0, -0.5, -0.2, c.bruest);
      if (rb > 3.4) fb(S, F, (u0 + u1) / 2 - 0.08, (u0 + u1) / 2 + 0.08, y + 1.0, y + gh, -0.45, -0.3, orn);
      fb(S, F, u0 + 0.3, u1 - 0.3, y + gh - 0.18, y + gh, -0.5, -0.25, orn);
    }
  }
  for (let i = 0; i <= na; i++) {
    const u = i * rb, br = i === 0 || i === na ? 0.9 : 0.55;
    fb(S, F, u - br, u + br, eg - 0.4, H - 0.3, -0.6, pfeiler, stein);
    fb(S, F, u - br - 0.15, u + br + 0.15, H - 1.6, H - 0.3, -0.6, pfeiler + 0.15, orn);
  }
  // Ausstellungsgeschosse: Erdgeschoss und Zwischengeschoss mit großen Schaufenstern
  fb(S, F, 0, L, 0, eg, -1.4, -1.3, GLAS_HELL);
  for (let i = 0; i <= na; i++) fb(S, F, i * rb - 0.6, i * rb + 0.6, 0, eg, -1.4, 0.2, stein);
  for (let i = 0; i < na; i++) { if (i === pmitte) continue; fb(S, F, i * rb + 0.6, (i + 1) * rb - 0.6, eg * 0.55, eg * 0.55 + 0.25, -1.3, -1.1, STAHL); fb(S, F, (i + 0.5) * rb - 0.05, (i + 0.5) * rb + 0.05, 0.3, eg, -1.3, -1.15, STAHL); }
  fb(S, F, -0.4, L + 0.4, eg - 0.5, eg, -1.4, 0.6, orn);
  fb(S, F, 0, L, 0, 0.6, -1.4, 0.3, dunkler(stein, 0.12));
  // Passage: hoher Bogen über zwei Geschosse, dunkle Tiefe, Glasdach-Ahnung, Name darüber
  if (pmitte >= 0) {
    const u0 = pmitte * rb + 0.6, u1 = (pmitte + 1) * rb - 0.6, hp = eg + gh * 0.9;
    fb(S, F, u0, u1, 0.3, hp, -6, -1.35, '#2b3036');
    fwand(S, F, u0 - 0.4, u1 + 0.4, 0.3, hp + 1.2, -0.1, 0.35, stein, [{ u0, u1, v0: 0.3, v1: hp, bogen: true }]);
    fb(S, F, u0, u1, 0.3, 0.42, -6, 0.4, '#e3dccb');
    ftext(scene, F, c.name.toUpperCase(), (u0 + u1) / 2, hp + 0.7, 0.4, 0.55, (u1 - u0) + 4, '#7a5a2e');
  }
  // Firmenschilder an den Pfeilern und über den Läden
  for (let i = 1; i < na; i += 2) if (i !== pmitte && i + 1 !== pmitte) ftext(scene, F, MESSE_FIRMEN[hash(i, o.salz ?? 0) % MESSE_FIRMEN.length], (i + 0.5) * rb, eg - 0.25, 0.62, 0.36, rb * 0.9, '#f2e7c9', '#3a3f44');
  // Traufe
  fb(S, F, -0.6, L + 0.6, H - 0.3, H + 0.5, -0.6, 1.0, orn);
  return H;
}
function messehausRoh(S, scene, p) {
  const r = rng(`mh:${p.seed}`);
  const { x: x0, z: z0, w, d } = p;
  const stein = waehle(r, ['#d9cdb4', '#cfc2a6', '#e2d6bf', '#d6c3a3', '#c9bba0']);
  const c = {
    n: p.geschosse ?? (5 + Math.floor(r() * 2.6)), gh: 3.7, eg: 6.4, stein, orn: heller(stein, 0.06), bruest: dunkler(stein, 0.06),
    pfeiler: zw(r, 0.45, 0.8), ra: zw(r, 4.4, 5.6), name: p.name ?? waehle(r, MESSE_NAMEN),
  };
  const H = c.eg + c.n * c.gh, T = Math.min(d, 22);
  const zb = z0 + d - T;
  S.quader(x0, 0, zb, x0 + w - 0.6, H, z0 + d - 0.6, GLAS);
  const FZ = RZ(x0, z0, w, d), FX = R(x0 + w, z0 + d, 0, -1, T);
  messeFassade(S, scene, FZ, c, r, { passage: w >= 18, salz: 1 });
  const eck = p.ecke ? p.ecke.includes('+x') : p.variante === 'eck';
  if (eck) messeFassade(S, scene, FX, c, r, { passage: false, salz: 2 });
  else {
    // Seitenwand zum Nachbarn: Putz mit Gesimsen, oben einige Fenster über dem Nachbardach
    fb(S, FX, 0, T, 0, H, -0.6, -0.1, dunkler(stein, 0.04));
    for (let k = 0; k <= c.n; k++) fb(S, FX, 0, T, c.eg + k * c.gh - 0.12, c.eg + k * c.gh + 0.1, -0.1, 0.05, dunkler(stein, 0.1));
    for (const u of achsen(0, T, 3.4, 1.2)) for (let k = c.n - 2; k < c.n; k++) fb(S, FX, u - 0.6, u + 0.6, c.eg + k * c.gh + 0.9, c.eg + k * c.gh + 2.6, -0.1, 0.02, GLAS);
  }
  // Dach: Mansarde mit Gauben (Kaiserzeit) oder Flachdach mit Staffelgeschoss (20er), an der Ecke Kuppel
  const dh = 5.2, flach = r() < 0.4;
  if (flach) {
    S.quader(x0, H + 0.5, zb, x0 + w - 0.6, H + 0.75, z0 + d - 0.6, '#9a9893');
    S.quader(x0 + 1.5, H + 0.5, zb + 1, x0 + w - 2.4, H + 4.2, z0 + d - 3, c.orn);
    for (const u of achsen(2, w - 3, 2.6, 0.6)) S.box(1.6, 1.8, 0.1, x0 + u, H + 2.4, z0 + d - 2.95, GLAS);
    S.quader(x0 + 1.2, H + 4.2, zb + 0.7, x0 + w - 2.1, H + 4.6, z0 + d - 2.7, heller(c.orn, 0.04));
    return { hoehe: H + 4.6 };
  }
  const g = dachProfil(w - 0.6, T + 0.4, dh, T * 0.45, 'x'); g.translate(x0 + (w - 0.6) / 2, H + 0.5, zb + T / 2); S.add(g, waehle(r, ['#5d6a72', '#56636c', '#7a7f85', '#a24e38', '#6f9a7d']));
  for (const u of achsen(1, w - 2, c.ra * 2, 1)) {
    const zf = z0 + d - 1.8;
    S.quader(x0 + u - 1.0, H + 0.5, zf - 2.2, x0 + u + 1.0, H + 3.3, zf, c.orn);
    S.box(1.2, 1.5, 0.1, x0 + u, H + 1.9, zf + 0.02, GLAS);
  }
  let top = H + dh + 0.5;
  if (eck && w >= 24) {
    const cx = x0 + w - 7, cz = z0 + d - 7;
    zyl(S, 5.2, 5.6, 4.5, cx, H + 0.5, cz, c.orn, 12);
    const kg = new THREE.SphereGeometry(5.2, 14, 7, 0, 2 * PI, 0, PI / 2); kg.scale(1, 1.2, 1); kg.translate(cx, H + 5, cz); S.add(kg, '#6f9a7d');
    zyl(S, 0.1, 0.3, 4, cx, H + 11.2, cz, '#d8b45a', 6);
    top = H + 15.2;
  }
  // Hof hinter dem Haus (Durchgang führt dorthin)
  if (d > T + 3) boden(S, x0, z0, x0 + w, zb, '#d6cfc0', 0.3, 0.07);
  return { hoehe: top };
}
function messehaus(S, scene, p) {
  if (p.w >= 16 && p.d >= 16) return messehausRoh(S, scene, p);
  return skaliert(S, scene, p, Math.max(16, p.w), Math.max(16, p.d), messehausRoh);
}

// =====================================================================================
// Kleine Bauten in großen Slots: Bau auf seine natürliche Größe, Rest als gestalteter Platz
// =====================================================================================
/** Platzgestaltung für Restflächen: Plattenbelag mit Fugen, Baumreihe, Bänke, Leuchten, Brunnen oder Pflanzbeete. */
function platzRest(S, r, P, o = {}) {
  if (P.w < 3 || P.d < 3) return;
  boden(S, P.x, P.z, P.x + P.w, P.z + P.d, o.belag ?? '#d9d3c6', 0.3, 0.08);
  for (let x = P.x + 3; x < P.x + P.w - 0.5; x += 3) S.box(0.08, 0.02, P.d - 0.4, x, 0.39, P.z + P.d / 2, '#c9c2b3');
  for (let z = P.z + 3; z < P.z + P.d - 0.5; z += 3) S.box(P.w - 0.4, 0.02, 0.08, P.x + P.w / 2, 0.39, z, '#c9c2b3');
  const A = P.w * P.d;
  const lang = P.w >= P.d;
  // Baumreihe an der langen sichtbaren Kante, Bänke dazwischen
  const nb = Math.floor((lang ? P.w : P.d) / 8);
  for (let i = 0; i < nb; i++) {
    const u = (i + 0.5) * (lang ? P.w : P.d) / nb;
    const [bx, bz] = lang ? [P.x + u, P.z + P.d - 2.2] : [P.x + P.w - 2.2, P.z + u];
    if (Math.min(P.w, P.d) >= 6) { S.box(1.6, 0.12, 1.6, bx, 0.42, bz, '#8a7a62'); baum(S, bx, bz, r, zw(r, 0.8, 1.0)); }
    if (i % 2 && Math.min(P.w, P.d) >= 9) { const [qx, qz] = lang ? [bx, bz - 3] : [bx - 3, bz]; S.box(lang ? 2.0 : 0.55, 0.45, lang ? 0.55 : 2.0, qx, 0.62, qz, '#8a6a4a'); }
  }
  if (A > 420 && Math.min(P.w, P.d) > 16) brunnen(S, P.x + P.w * 0.45, P.z + P.d * 0.45, Math.min(5, Math.min(P.w, P.d) * 0.22), { duesen: 5, y: 0.38 });
  else if (A > 160 && Math.min(P.w, P.d) > 8) {
    const bx = P.x + P.w / 2, bz = P.z + P.d / 2;
    S.quader(bx - 3, 0.38, bz - 1.5, bx + 3, 0.9, bz + 1.5, '#bdb7aa');
    for (let k = 0; k < 5; k++) S.box(0.9, 0.5, 0.9, bx - 2.4 + k * 1.2, 1.1, bz, ['#e46b8a', '#f2c14e', '#7aa865', '#e8604c', '#b06bc4'][k]);
  }
  if (A > 200) laterne(S, P.x + 1.2, P.z + P.d - 1.2, 6, 0.38, 'kugel');
}
/**
 * Baut bau auf höchstens nat = [w, d] (vorn rechts im Slot, zur Kamera), der Rest des Slots wird Platz (platzRest).
 * Für Pavillon, Wendebau, Dominante und Kulturhaus, damit große Slots keine verlorenen Mini-Bauten zeigen.
 */
function eingefasst(bau, natVon) {
  return (S, scene, p) => {
    const [nw, nd] = natVon(p);
    if (p.w <= nw * 1.25 && p.d <= nd * 1.25) return bau(S, scene, p);
    const w = Math.min(p.w, nw), d = Math.min(p.d, nd);
    const r = rng(`ef:${p.seed}`);
    // Bau mittig auf der Breite, hinten in der Tiefe: der Platz liegt davor (sichtbar)
    const x = p.x + Math.round((p.w - w) * 0.5), z = p.z + Math.min(p.d - d, Math.max(0, (p.d - d) * 0.35));
    const erg = bau(S, scene, { ...p, x, z, w, d });
    if (z + d < p.z + p.d - 1) platzRest(S, r, { x: p.x, z: z + d, w: p.w, d: p.z + p.d - z - d });
    if (z > p.z + 1) platzRest(S, r, { x: p.x, z: p.z, w: p.w, d: z - p.z }, { belag: '#d3cdbf' });
    if (x > p.x + 1) platzRest(S, r, { x: p.x, z, w: x - p.x, d }, { belag: '#d3cdbf' });
    if (x + w < p.x + p.w - 1) platzRest(S, r, { x: x + w, z, w: p.x + p.w - x - w, d });
    return erg;
  };
}
const NAT_PAVILLON = { hp: [36, 36], faltdach: [30, 26], eisbar: [32, 30], brunnen: [38, 34] };
const NAT_WENDEBAU = { bullauge: [40, 30], passage: [58, 36], sparkasse: [36, 28] };
const NAT_DOMINANTE = { fernsehturm: [48, 48], kanzel: [36, 34], uni: [62, 46], rund: [56, 46], interhotel: [72, 46] };
const NAT_KULTUR = { palast: [88, 64], stadthalle: [74, 58], kulturhaus50: [78, 52] };
const varVon = (praefix, liste) => (p) => p.variante ?? waehle(rng(`${praefix}:${p.seed}`), liste);
const pavillonE = eingefasst(pavillon, (p) => NAT_PAVILLON[varVon('pv', ['hp', 'faltdach', 'eisbar', 'brunnen'])(p)] ?? [34, 30]);
const wendebauE = eingefasst(wendebau, (p) => NAT_WENDEBAU[varVon('wb', ['bullauge', 'passage', 'sparkasse'])(p)] ?? [40, 30]);
const dominanteE = eingefasst(dominante, (p) => NAT_DOMINANTE[varVon('dm', ['fernsehturm', 'kanzel', 'uni', 'interhotel'])(p)] ?? [56, 46]);
const kulturhausE = eingefasst(kulturhaus, (p) => NAT_KULTUR[varVon('kh', ['palast', 'stadthalle', 'kulturhaus50'])(p)] ?? [80, 56]);

// =====================================================================================
// Platzhalter (werden ersetzt)
// =====================================================================================
function platzhalter(farbe, h) {
  return (S, scene, p) => { S.quader(p.x, 0, p.z, p.x + p.w, h, p.z + p.d, farbe); return { hoehe: h }; };
}

export const OST_SLOTS = {
  'slot:magistrale': magistrale,
  'slot:platte_wohn': platteWohn,
  'slot:platte_zentrum': platteZentrum,
  'slot:kulturhaus': kulturhausE,
  'slot:dominante': dominanteE,
  'slot:pavillon': pavillonE,
  'slot:kaufhalle': kaufhalle,
  'slot:heizwerk': heizwerk,
  'slot:schule': schule,
  'slot:wendebau': wendebauE,
  'slot:messehaus': messehaus,
  'slot:altbau_unsaniert': altbau,
  'slot:brache': brache,
};

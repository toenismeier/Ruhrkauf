// Mittebauten: typische Bauten der Region Mitte (Hessen, Rheinland-Pfalz, Saarland, Südniedersachsen) als Slot-Generatoren.
// Alle Slots: (S, scene, p) mit p = { x, z, w, d, seed, variante?, front?: '+x'|'+z'|'-x'|'-z', zustand? } -> { hoehe }
// Eigenständige Vertreter, keine Kopien realer Einzelbauten. Fiktive Namen und Logos.
//
// Drehung: Jeder Generator baut lokal mit Hauptfront nach +z in [0, w] × [0, d]. Der Rahmen `slot()` dreht das Ergebnis
// in die gewünschte Richtung. Detailliert werden immer genau die lokalen Seiten, die nach der Drehung zur Kamera zeigen
// (Welt +x und +z), daher sind alle vier Ausrichtungen voll detailliert, ohne Budget für verdeckte Seiten zu verbrauchen.
//
// Rahmen-Konzept wie in ostbauten.js: Fassade F mit Ursprung (ox, oz), Laufrichtung (dx, dz), Normale (nx, nz), Länge L.
// u entlang der Fassade, y Höhe, t nach außen.
import { THREE, Sammler, rng, waehle, zw, FARBEN, heller, dunkler, baum, textTextur, textMaterial, dachProfil, walmdach } from './basis.js';
import { ostFahrzeug } from './ostbauten.js';
import { kirche } from './sonderbauten.js';
import { gelaende, rebzeilen } from './gelaende.js';

const PI = Math.PI;

// =====================================================================================
// Rahmen und Grundformen
// =====================================================================================
function R(ox, oz, dx, dz, L) { return { ox, oz, dx, dz, nx: -dz, nz: dx, ry: Math.atan2(-dz, dx), L }; }
function wp(F, u, t) { return [F.ox + F.dx * u + F.nx * t, F.oz + F.dz * u + F.nz * t]; }
function fb(S, F, u0, u1, y0, y1, t0, t1, c) {
  const [x, z] = wp(F, (u0 + u1) / 2, (t0 + t1) / 2);
  S.box(Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(t1 - t0), x, (y0 + y1) / 2, z, c, F.ry);
}
function fgeo(S, F, g, c) { g.rotateY(F.ry); g.translate(F.ox, 0, F.oz); S.add(g, c); }
function teil(F, u0, u1, t = 0) { const [x, z] = wp(F, u0, t); return R(x, z, F.dx, F.dz, u1 - u0); }
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
/** Lochwand: Fläche mit Öffnungen [{u0,u1,v0,v1,bogen}] oder Kreisen [{kreis:[u,v,r]}]. Ein Teil. */
function fwand(S, F, u0, u1, y0, y1, t0, t1, c, loecher = []) {
  const s = rechteck(u0, y0, u1, y1);
  for (const l of loecher) {
    if (l.kreis) { const p = new THREE.Path(); p.absarc(l.kreis[0], l.kreis[1], l.kreis[2], 0, 2 * PI, true); s.holes.push(p); }
    else s.holes.push(oeffnung(new THREE.Path(), l.u0, l.v0, l.u1, l.v1, l.bogen));
  }
  fform(S, F, s, t0, t1, c);
}
/** Lochfassade: dunkle Glasebene plus Wandhaut mit Öffnungen. Zwei Teile für beliebig viele Fenster. */
function lochwand(S, F, u0, u1, y0, y1, farbe, loecher, o = {}) {
  fb(S, F, u0 + 0.02, u1 - 0.02, y0 + 0.02, y1 - 0.02, 0, o.glasT ?? 0.04, o.glas ?? GLAS);
  fwand(S, F, u0, u1, y0, y1, 0, o.dick ?? 0.35, farbe, loecher);
}
function fpoly(S, F, pkt, t0, t1, c) {
  const s = new THREE.Shape();
  s.moveTo(pkt[0][0], pkt[0][1]);
  for (const [u, v] of pkt.slice(1)) s.lineTo(u, v);
  s.lineTo(pkt[0][0], pkt[0][1]);
  fform(S, F, s, t0, t1, c);
}
function fscheibe(S, F, u, y, t0, t1, rad, c, seg = 20) {
  const g = new THREE.CylinderGeometry(rad, rad, t1 - t0, seg);
  g.rotateX(PI / 2); g.translate(u, y, (t0 + t1) / 2);
  fgeo(S, F, g, c);
}
/** Schräger Balken in der Fassadenebene von (u0, y0) nach (u1, y1). */
function fstrebe(S, F, u0, y0, u1, y1, br, t0, t1, c) {
  const L = Math.hypot(u1 - u0, y1 - y0);
  const g = new THREE.BoxGeometry(L, br, t1 - t0);
  g.rotateZ(Math.atan2(y1 - y0, u1 - u0));
  g.translate((u0 + u1) / 2, (y0 + y1) / 2, (t0 + t1) / 2);
  fgeo(S, F, g, c);
}
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
function balken(S, a, b, br, ho, c) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const hl = Math.hypot(dx, dz), L = Math.hypot(hl, dy);
  const g = new THREE.BoxGeometry(L, ho, br);
  g.rotateZ(Math.atan2(dy, hl)); g.rotateY(Math.atan2(-dz, dx));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  S.add(g, c);
}
function mischen(arr, r) { const a = arr.slice(); mischenIn(a, r); return a; }
function mischenIn(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }
function boden(S, x0, z0, x1, z1, c, y = 0.3, h = 0.06) { if (x1 > x0 && z1 > z0) S.quader(x0, y, z0, x1, y + h, z1, c); }
/** Grundriss-Prisma: Punkte [[x, z], …] von y0 bis y0 + h. */
function prisma(S, pts, y0, h, c) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], -pts[0][1]);
  for (const [x, z] of pts.slice(1)) s.lineTo(x, -z);
  s.lineTo(pts[0][0], -pts[0][1]);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
  g.rotateX(-PI / 2); g.translate(0, y0, 0);
  S.add(g, c);
}
/** Kantenrahmen eines Grundrisses (Reihenfolge wie Rechteck: +z-Seite in +x-Richtung, dann +x-Seite in -z-Richtung …). */
function kanten(pts) {
  return pts.map((a, i) => { const b = pts[(i + 1) % pts.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return R(a[0], a[1], (b[0] - a[0]) / L, (b[1] - a[1]) / L, L); });
}
/** Gleichmäßige Achsen im Bereich u0..u1 mit Abstand ra. */
function achsen(u0, u1, ra, rand = 0.6) {
  const n = Math.max(1, Math.floor((u1 - u0 - 2 * rand) / ra));
  const st = (u1 - u0 - 2 * rand) / n;
  return Array.from({ length: n }, (_, i) => u0 + rand + st * (i + 0.5));
}

// ---------- Sichtbarkeit ----------
/** Zeigt die lokale Normale (nx, nz) zur Kamera? p.blick ist die Kamerarichtung im lokalen System. */
function sieht(p, nx, nz) { const b = p.blick ?? [1, 1]; return nx * b[0] + nz * b[1] > 0.05; }
const sichtF = (p, F) => sieht(p, F.nx, F.nz);
/** Alle vier Seitenrahmen eines Rechtecks. */
function vierSeiten(x0, z0, w, d) {
  return {
    '+z': R(x0, z0 + d, 1, 0, w), '+x': R(x0 + w, z0 + d, 0, -1, d),
    '-z': R(x0 + w, z0, -1, 0, w), '-x': R(x0, z0, 0, 1, d),
  };
}
/** Sichtbare Seitenrahmen eines Rechtecks als [[schlüssel, F], …]. nur: optionale Auswahl der Seiten. */
function seiten(p, x0, z0, w, d, nur = null) {
  return Object.entries(vierSeiten(x0, z0, w, d)).filter(([k, F]) => (!nur || nur.includes(k)) && sichtF(p, F));
}

// ---------- Dächer ----------
/** Satteldach über Rechteck. achse: Firstrichtung 'x' oder 'z'. Giebeldreiecke in Wandfarbe, Dachflächen als Platten. */
function satteldach(S, x0, z0, x1, z1, y, hg, achse, dachF, wandF, ue = 0.45) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const lang = achse === 'x' ? x1 - x0 : z1 - z0, quer = achse === 'x' ? z1 - z0 : x1 - x0;
  const g = dachProfil(lang, quer, hg, 0.02, achse); g.translate(cx, y, cz); S.add(g, wandF);
  const a = Math.atan2(hg, quer / 2), sl = Math.hypot(quer / 2, hg) + ue;
  for (const s of [-1, 1]) {
    const pl = new THREE.BoxGeometry(lang + 2 * ue * 0.6, 0.24, sl);
    pl.rotateX(s * a);
    const off = (sl / 2) - 0.05;
    pl.translate(0, y + hg - Math.sin(a) * off + 0.13, s * Math.cos(a) * off);
    if (achse === 'z') pl.rotateY(PI / 2);
    pl.translate(cx, 0, cz);
    S.add(pl, dachF);
  }
  S.add(new THREE.BoxGeometry(achse === 'x' ? lang + ue : 0.36, 0.3, achse === 'x' ? 0.36 : lang + ue).translate(cx, y + hg + 0.2, cz), dunkler(dachF, 0.05));
}
function walm(S, x0, z0, x1, z1, y, h, c) { const g = walmdach(x1 - x0, z1 - z0, h); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); S.add(g, c); }

// ---------- Farben ----------
const PFLASTER = '#cfc8ba', PLATZ = '#d9d3c6', WEG = '#d6d0c2', RASEN = '#9dc283', RASEN2 = '#a9cb8c', KIES = '#d8cfb8';
const GLAS = '#4e5c67', GLAS_HELL = '#6f8696', DUNKEL = '#3e474f', METALL = '#9aa1a7', STAHL = '#5a6168', WEISS = '#f6f3ec';
const SCHIEFER = '#4f565e', SCHIEFER2 = '#5b626a', ZIEGEL = '#b4583f', ZIEGEL2 = '#a24e38', KUPFER = '#6f9a7d';
const ROTSTEIN = ['#b0574a', '#a8513f', '#b9634f', '#9f4d40'];
const AUTOS = ['#2b2f33', '#a3abb2', '#c84a3c', '#2f5f8f', '#f4f3ef', '#3d6b4f', '#6b7680', '#1f3a5f', '#e3c35e'];

// ---------- Umfeld ----------
function baumAuf(S, x, y, z, r, s = 1) {
  S.box(0.5 * s, 2.2 * s, 0.5 * s, x, y + 1.0 * s, z, FARBEN.stamm);
  const g = new THREE.IcosahedronGeometry(2.1 * s * (0.85 + r() * 0.3), 0); g.translate(x, y + 3.3 * s, z); S.add(g, waehle(r, FARBEN.baum));
}
function busch(S, x, z, r, s = 1) {
  const g = new THREE.IcosahedronGeometry(1.0 * s * (0.8 + r() * 0.4), 0);
  g.scale(1.2, 0.8, 1.2); g.translate(x, 0.3 + 0.7 * s, z);
  S.add(g, waehle(r, ['#6f9f5c', '#7aa865', '#628f52']));
}
function laterne(S, x, z, h = 4.5, y0 = 0.3) {
  S.box(0.18, h, 0.18, x, y0 + h / 2, z, '#3f464c');
  S.box(0.5, 0.6, 0.5, x, y0 + h + 0.2, z, '#f1ead2');
  S.box(0.62, 0.12, 0.62, x, y0 + h + 0.55, z, '#3f464c');
}
function brunnenRund(S, x, z, rad, o = {}) {
  const y = o.y ?? 0.36;
  zyl(S, rad, rad, 0.7, x, y, z, o.rand ?? '#d9d4c8', 24);
  zyl(S, rad - 0.35, rad - 0.35, 0.72, x, y + 0.02, z, FARBEN.wasser, 24);
  zyl(S, 0.35, 0.5, o.saeule ?? 2.2, x, y + 0.7, z, o.rand ?? '#d9d4c8', 10);
  if (o.schale !== false) zyl(S, rad * 0.4, 0.3, 0.4, x, y + (o.saeule ?? 2.2) * 0.65, z, o.rand ?? '#d9d4c8', 14);
  if (o.figur) { zyl(S, 0.25, 0.32, 1.6, x, y + 0.7 + (o.saeule ?? 2.2), z, o.figur, 8); S.add(new THREE.SphereGeometry(0.28, 8, 6).translate(x, y + 2.6 + (o.saeule ?? 2.2), z), o.figur); }
  else zyl(S, 0.06, 0.2, 1.4, x, y + 0.7 + (o.saeule ?? 2.2), z, '#e3f3f5', 6);
}
function autoReihe(S, r, x0, x1, z, ry = 0, dichte = 0.7) {
  for (let x = x0 + 2.5; x < x1 - 2.5; x += 5) if (r() < dichte) ostFahrzeug(S, x, z, 'modern', ry + (r() < 0.5 ? 0 : PI), waehle(r, AUTOS));
}
function autoReiheZ(S, r, z0, z1, x, dichte = 0.7) {
  for (let z = z0 + 1.3; z < z1 - 1.3; z += 2.6) if (r() < dichte) ostFahrzeug(S, x, z, 'modern', 0, waehle(r, AUTOS));
}
function baumreihe(S, r, x0, x1, z, ab = 7, s = 1) { for (let x = x0 + ab / 2; x < x1; x += ab) baum(S, x, z, r, s * zw(r, 0.9, 1.1)); }
function baumreiheZ(S, r, z0, z1, x, ab = 7, s = 1) { for (let z = z0 + ab / 2; z < z1; z += ab) baum(S, x, z, r, s * zw(r, 0.9, 1.1)); }
function bank(S, x, z, quer = false) { S.box(quer ? 0.6 : 1.8, 0.12, quer ? 1.8 : 0.6, x, 0.8, z, '#8a6a4a'); S.box(quer ? 0.5 : 1.6, 0.45, quer ? 1.6 : 0.5, x, 0.55, z, '#4a4f55'); }

/** Fenster mit Rahmen, optional Kreuz und Läden. */
function fenster(S, F, u, y, fw, fh, o = {}) {
  const t = o.t ?? 0;
  if (o.rahmen !== null) fb(S, F, u - fw / 2 - 0.12, u + fw / 2 + 0.12, y - 0.12, y + fh + 0.12, t, t + 0.05, o.rahmen ?? WEISS);
  fb(S, F, u - fw / 2, u + fw / 2, y, y + fh, t, t + 0.07, o.glas ?? GLAS);
  if (o.kreuz) { fb(S, F, u - 0.04, u + 0.04, y, y + fh, t, t + 0.1, o.rahmen ?? WEISS); fb(S, F, u - fw / 2, u + fw / 2, y + fh * 0.62, y + fh * 0.62 + 0.08, t, t + 0.1, o.rahmen ?? WEISS); }
  if (o.laeden) for (const s of [-1, 1]) fb(S, F, u + s * (fw / 2 + 0.14), u + s * (fw / 2 + 0.14 + fw * 0.48), y, y + fh, t, t + 0.09, o.laeden);
  if (o.sims) fb(S, F, u - fw / 2 - 0.25, u + fw / 2 + 0.25, y - 0.2, y - 0.04, t, t + 0.22, o.sims);
}
/** Logo je Bank aus eigener Grundform (Säulen, Tor, Stufen, Wellenbalken, Monogramm) auf heller Tafel, Schriftzug daneben. */
function logo(S, scene, F, u, y, t, h, farbe, text, schrift = '#ffffff', bg = null) {
  const bank = BANKEN.find((b) => b[1] === farbe), form = bank?.[2] ?? 'saeulen';
  const q = h / 2, t1 = t + 0.2, t2 = t + 0.28, P = '#f3f1ec';
  fb(S, F, u - q * 1.15, u + q * 1.15, y - q * 0.85, y + q * 0.85, t, t1, P);
  const b = (u0, u1, y0, y1) => fb(S, F, u + u0 * q, u + u1 * q, y + y0 * q, y + y1 * q, t1, t2, farbe);
  if (form === 'saeulen') { b(-0.85, 0.85, -0.65, -0.48); b(-0.85, 0.85, 0.42, 0.62); for (const m of [-0.6, 0, 0.6]) b(m - 0.13, m + 0.13, -0.48, 0.42); }
  else if (form === 'tor') { b(-0.8, -0.45, -0.65, 0.35); b(0.45, 0.8, -0.65, 0.35); b(-0.95, 0.95, 0.35, 0.65); }
  else if (form === 'stufen') { b(-0.95, 0.95, -0.65, -0.3); b(-0.6, 0.6, -0.3, 0.05); b(-0.25, 0.25, 0.05, 0.6); }
  else if (form === 'wellen') { b(-0.95, 0.25, 0.3, 0.6); b(-0.6, 0.6, -0.15, 0.15); b(-0.25, 0.95, -0.6, -0.3); }
  else ftext(scene, F, (bank?.[0] ?? 'B').split(' ').pop()[0], u, y, t2, h * 0.75, h * 0.9, farbe, null);
  if (text) { const u0 = u + h * 0.75, bw = Math.min(text.length * h * 0.45, F.L - u0 - 0.6); if (bw > 2) ftext(scene, F, text, u0 + bw / 2, y, t + 0.12, h * 0.55, bw, schrift, bg); }
}

// =====================================================================================
// Slot-Rahmen: Variante, Maße, Drehung
// =====================================================================================
const WINKEL = { '+z': 0, '+x': PI / 2, '-z': PI, '-x': -PI / 2 };
/**
 * name: Kürzel für den Seed, varianten: Liste, masse: { variante: { min: [w, d], max: [w, d] } }, bau(S, scene, p).
 * Lokal wird mit Front +z gebaut. Zu kleine Flächen werden gleichmäßig verkleinert, zu große mit Pflaster aufgefüllt.
 */
function slot(name, varianten, masse, bau) {
  return (S, scene, p) => {
    const v = varianten.includes(p.variante) ? p.variante : waehle(rng(`${name}:${p.seed ?? 1}`), varianten);
    const front = WINKEL[p.front] !== undefined ? p.front : '+z', th = WINKEL[front];
    const quer = front === '+x' || front === '-x';
    const LW = quer ? p.d : p.w, LD = quer ? p.w : p.d;
    const m = masse[v] ?? masse.alle;
    const s = Math.min(1, LW / m.min[0], LD / m.min[1]);
    const nw = Math.min(Math.max(LW / s, m.min[0]), m.max[0]), nd = Math.min(Math.max(LD / s, m.min[1]), m.max[1]);
    const c = Math.cos(th), sn = Math.sin(th);
    const T = new Sammler(), innen = new THREE.Group(), aussen = new THREE.Group();
    const erg = bau(T, innen, { ...p, x: 0, z: 0, w: nw, d: nd, variante: v, front: '+z', blick: [c - sn, sn + c], skala: s });
    const cx = p.x + p.w / 2, cz = p.z + p.d / 2;
    for (const [farbe, gs] of T.teile) for (const g of gs) {
      g.translate(-nw / 2, -0.3, -nd / 2); g.scale(s, s, s); g.rotateY(th); g.translate(cx, 0.3, cz);
      S.add(g, farbe);
    }
    // Restfläche (größerer Slot als Bau) mit Pflaster schließen
    if (nw * s < LW - 0.5 || nd * s < LD - 0.5) S.quader(p.x, 0.3, p.z, p.x + p.w, 0.34, p.z + p.d, PFLASTER);
    innen.position.set(-nw / 2, -0.3, -nd / 2);
    aussen.add(innen); aussen.scale.setScalar(s); aussen.rotation.y = th; aussen.position.set(cx, 0.3, cz);
    scene.add(aussen);
    return { ...erg, hoehe: (erg.hoehe ?? 10) * s, variante: v, skala: s };
  };
}

// =====================================================================================
// 1. Skyline: Bankenhochhäuser (Frankfurt-Typ)
// =====================================================================================
const BANKEN = [
  ['Mainufer Bank', '#2f7468', 'tor'], ['Taunus Kredit', '#6d5a2e', 'stufen'], ['Römer & Cie.', '#7a2f45', 'saeulen'], ['Nidda Finanz', '#3d5f7a', 'wellen'],
  ['Bankhaus Feldberg', '#4f6b3a', 'monogramm'], ['Kaiserhof Invest', '#5a3f6f', 'monogramm'],
];
/** Sockelbau (Podium) mit Eingangsvordach, verglast. */
function podium(S, scene, p, x0, z0, w, d, h, o = {}) {
  const stein = o.stein ?? '#d7d2c8';
  S.quader(x0, 0, z0, x0 + w, h, z0 + d, GLAS_HELL);
  S.quader(x0 - 0.3, h, z0 - 0.3, x0 + w + 0.3, h + 1.0, z0 + d + 0.3, stein);
  S.quader(x0 + 1, h + 1.0, z0 + 1, x0 + w - 1, h + 1.2, z0 + d - 1, '#b9b6ae');
  for (const [k, F] of seiten(p, x0, z0, w, d)) {
    for (const u of achsen(0, F.L, 3.0, 0)) fb(S, F, u - 0.15, u + 0.15, 0.3, h, 0, 0.25, stein);
    fb(S, F, 0, F.L, h * 0.5 - 0.1, h * 0.5 + 0.1, 0, 0.2, stein);
    if (k === '+z') {
      fb(S, F, F.L / 2 - 6, F.L / 2 + 6, 4.2, 4.6, 0, 4.5, '#e9e7e2');
      for (const s of [-1, 1]) fb(S, F, F.L / 2 + s * 5.6 - 0.15, F.L / 2 + s * 5.6 + 0.15, 0.3, 4.2, 4.2, 4.5, METALL);
      fb(S, F, F.L / 2 - 2.5, F.L / 2 + 2.5, 0.3, 3.6, 0, 0.12, DUNKEL);
    }
  }
}
/** Gerade Wandkante eines Turms: Geschossbänder und Lisenen. */
function turmKante(S, F, y0, y1, gh, o) {
  const band = o.band, alle = o.bandAlle ?? 1;
  for (let y = y0 + gh, i = 1; y < y1 - 0.5; y += gh, i++) if (i % alle === 0) fb(S, F, -0.05, F.L + 0.05, y - (o.bandH ?? 0.28), y, 0, o.bandT ?? 0.1, band);
  if (o.lisene) for (const u of achsen(0, F.L, o.lisene, o.liseneRand ?? 0)) fb(S, F, u - (o.liseneB ?? 0.18), u + (o.liseneB ?? 0.18), y0, y1, 0, o.liseneT ?? 0.15, o.liseneF ?? band);
}
/** 70er-Rasterturm: dunkles Glas, weiße oder bronzene Brüstungsbänder, Lisenenraster, Technikgeschoss. */
function turmRaster(S, scene, p, r, cx, cz, o = {}) {
  const a = o.a ?? 28, b = o.b ?? 24, n = o.n ?? 34, gh = 3.6, pod = 8;
  const pal = o.pal ?? waehle(r, ['weiss', 'bronze']);
  const glas = pal === 'weiss' ? '#3f4c57' : '#4a4a45', band = pal === 'weiss' ? '#ecebe6' : '#7a6650', fin = pal === 'weiss' ? '#e2e1dc' : '#6b5a48';
  const x0 = cx - a / 2, z0 = cz - b / 2, H = pod + n * gh;
  if (o.podium !== false) podium(S, scene, p, x0 - 6, z0 - 4, a + 12, b + 10, pod - 1, { stein: pal === 'weiss' ? '#e3e1db' : '#c9b9a3' });
  // Fase an den Ecken: Achteck mit kurzen Schrägen
  const f = 2.2, pts = [[x0 + f, z0 + b], [x0 + a - f, z0 + b], [x0 + a, z0 + b - f], [x0 + a, z0 + f], [x0 + a - f, z0], [x0 + f, z0], [x0, z0 + f], [x0, z0 + b - f]];
  prisma(S, pts, 0, H, glas);
  for (const F of kanten(pts)) {
    if (!sichtF(p, F)) continue;
    if (F.L > 4) {
      for (let y = pod + gh, i = 0; y < H - 2 * gh; y += gh, i++) fb(S, F, 0, F.L, y - 1.0, y, 0, 0.35, band);
      for (const u of achsen(0, F.L, 3.0, 0.2)) fb(S, F, u - 0.2, u + 0.2, pod, H - 2 * gh, 0, 0.55, fin);
    } else for (let y = pod + gh; y < H - 2 * gh; y += gh) fb(S, F, 0, F.L, y - 1.0, y, 0, 0.35, band);
    fb(S, F, -0.05, F.L + 0.05, H - 2 * gh, H, 0, 0.4, band);
  }
  // Dachaufbau: Technik, Antenne
  S.quader(cx - a * 0.3, H, cz - b * 0.3, cx + a * 0.3, H + 4.5, cz + b * 0.3, band);
  S.quader(cx - a * 0.32, H + 4.5, cz - b * 0.32, cx + a * 0.32, H + 4.9, cz + b * 0.32, dunkler(band, 0.1));
  zyl(S, 0.3, 0.5, 16, cx + a * 0.15, H + 4.9, cz, '#d9dcdf', 6);
  const [name, farbe] = o.bank ?? waehle(r, BANKEN);
  for (const [k, F] of seiten(p, x0, z0, a, b)) logo(S, scene, teil(F, f, F.L - f), (F.L - 2 * f) / 2, H - gh, 0.45, 4.2, farbe, null);
  // Name groß am Sockeldach (am Turmkopf wäre er im Katalogmaßstab unlesbar)
  if (o.podium !== false) for (const [k, F] of seiten(p, x0 - 6, z0 - 4, a + 12, b + 10)) ftext(scene, F, name, F.L / 2, pod - 1.9, 0.42, 1.6, F.L * 0.7, '#ffffff', farbe);
  return H + 21;
}
/** Glas-Zwilling: zwei ungleich hohe Glastürme mit hellen Eckpfeilern und gestaffeltem Kopf auf gemeinsamem Sockel. */
function turmZwilling(S, scene, p, r, cx, cz, o = {}) {
  const n = o.n ?? 40, gh = 3.75, pod = 9, H = pod + n * gh, a = o.a ?? 17, b = o.b ?? 26, sp = o.abstand ?? 6;
  const glas = ['#80928a', '#768a83'], linie = '#c3cbc4', stein = '#e2ded4';
  const [name, farbe] = o.bank ?? BANKEN[0];
  if (o.podium !== false) podium(S, scene, p, cx - a - sp / 2 - 4, cz - b / 2 - 4, 2 * a + sp + 8, b + 8, pod - 1, { stein: '#dcdcd8' });
  const turm = (x0, z0, ht, i) => {
    const st = 3 * gh, e = 1.6, Hs = ht - st;
    S.quader(x0, 0, z0, x0 + a, Hs, z0 + b, glas[i]);
    S.quader(x0 + e, Hs, z0 + e, x0 + a - e, ht, z0 + b - e, glas[i]);
    for (const [k, F] of seiten(p, x0, z0, a, b)) {
      for (let y = pod + gh; y < Hs - 1; y += gh) fb(S, F, 0, F.L, y - 0.22, y, 0, 0.08, linie);
      for (const u of achsen(1.2, F.L - 1.2, 3.0, 0)) fb(S, F, u - 0.07, u + 0.07, pod, Hs, 0, 0.12, dunkler(glas[i], 0.12));
      fb(S, F, -0.05, 1.2, pod - 1, Hs + 0.6, 0, 0.35, stein); fb(S, F, F.L - 1.2, F.L + 0.05, pod - 1, Hs + 0.6, 0, 0.35, stein);
      fb(S, F, -0.05, F.L + 0.05, Hs, Hs + 0.6, 0, 0.35, stein);
    }
    for (const [k, F] of seiten(p, x0 + e, z0 + e, a - 2 * e, b - 2 * e)) { for (let y = Hs + gh; y < ht; y += gh) fb(S, F, 0, F.L, y - 0.22, y, 0, 0.08, linie); fb(S, F, -0.05, F.L + 0.05, ht - 0.5, ht, 0, 0.3, stein); }
    S.quader(x0 + 4, ht, z0 + 5, x0 + a - 4, ht + 2.6, z0 + b - 5, '#c9cdd0');
  };
  const H2 = pod + Math.round(n * 0.74) * gh;
  turm(cx - sp / 2 - a, cz - b / 2, H, 0);
  turm(cx + sp / 2, cz - b / 2, H2, 1);
  // Verbindungsbau zwischen den Türmen
  S.quader(cx - sp / 2 - 0.1, pod, cz - b * 0.3, cx + sp / 2 + 0.1, pod + 3 * gh, cz + b * 0.3, GLAS_HELL);
  for (let y = pod + gh; y <= pod + 3 * gh; y += gh) S.quader(cx - sp / 2, y - 0.3, cz - b * 0.3 - 0.05, cx + sp / 2, y, cz + b * 0.3 + 0.05, stein);
  // Logo am Kopf des hohen Turms und am Sockel
  for (const [k, F] of seiten(p, cx - sp / 2 - a, cz - b / 2, a, b, ['+z', '-z'])) logo(S, scene, F, F.L / 2, H - 3 * gh - 3, 0.36, 4, farbe, null);
  for (const [k, F] of seiten(p, cx + sp / 2, cz - b / 2, a, b, ['+x', '-x'])) logo(S, scene, F, F.L / 2, H2 - 3 * gh - 3, 0.36, 4, farbe, null);
  for (const [k, F] of seiten(p, cx - a - sp / 2 - 4, cz - b / 2 - 4, 2 * a + sp + 8, b + 8, ['+z', '-z'])) ftext(scene, F, name, F.L / 2, pod - 2.8, 0.42, 1.6, 26, '#ffffff', farbe);
  return H + 3;
}
/** Kronenturm: heller Steinschaft mit Fasen, verglaster Rundkopf, gestufte flache Krone mit Laterne. */
function turmKrone(S, scene, p, r, cx, cz, o = {}) {
  const a = o.a ?? 30, n = o.n ?? 50, gh = 3.8, pod = 10, Hs = pod + n * gh;
  const stein = o.stein ?? waehle(r, ['#cfc8b8', '#bfc2bd', '#d6cdb6']), glas = '#3e4d5a', hell = heller(stein, 0.08);
  const x0 = cx - a / 2, z0 = cz - a / 2, f = 4.5;
  if (o.podium !== false) podium(S, scene, p, x0 - 5, z0 - 5, a + 10, a + 10, pod - 2, { stein: hell });
  const pts = [[x0 + f, z0 + a], [x0 + a - f, z0 + a], [x0 + a, z0 + a - f], [x0 + a, z0 + f], [x0 + a - f, z0], [x0 + f, z0], [x0, z0 + f], [x0, z0 + a - f]];
  prisma(S, pts, 0, Hs, glas);
  // Erschließungskern als niedriger Anbau an der lokalen -x-Seite: macht die Ausrichtung sichtbar (Front -z zeigt ihn rechts)
  if (o.kern !== false) {
    const kb = 9, kt = a * 0.5, kx0 = x0 - kb + 1, kz0 = cz - kt / 2, Hk2 = Hs * 0.62;
    S.quader(kx0, 0, kz0, kx0 + kb, Hk2, kz0 + kt, hell);
    for (const [k, F] of seiten(p, kx0, kz0, kb, kt)) {
      for (const u of achsen(0, F.L, 2.6, 0.8)) fb(S, F, u - 0.5, u + 0.5, pod, Hk2 - 2, 0, 0.05, glas);
      for (let y = pod + 4 * gh; y < Hk2 - 2; y += 4 * gh) fb(S, F, 0, F.L, y - 0.4, y, 0, 0.2, stein);
      fb(S, F, -0.1, F.L + 0.1, Hk2 - 1.2, Hk2, 0, 0.25, stein);
    }
    S.quader(kx0 + 2, Hk2, kz0 + 2, kx0 + kb - 2, Hk2 + 2.5, kz0 + kt - 2, '#c9cdd0');
  }
  for (const F of kanten(pts)) {
    if (!sichtF(p, F)) continue;
    if (F.L > 10) {
      // breite Steinpfeiler, schmale Fensterschlitze; Mittelrisalit
      for (const u of achsen(0, F.L, 2.6, 0.4)) fb(S, F, u - 0.85, u + 0.85, pod - 2, Hs, 0, 0.4, stein);
      fb(S, F, F.L / 2 - 2.2, F.L / 2 + 2.2, pod - 2, Hs, 0, 0.9, hell);
      for (let y = pod + 4 * gh; y < Hs - 1; y += 4 * gh) fb(S, F, 0, F.L, y - 0.5, y, 0, 0.5, hell);
    } else {
      fb(S, F, 0.3, F.L - 0.3, pod - 2, Hs, 0, 0.3, stein);
      for (let y = pod + gh * 2; y < Hs - 1; y += gh * 2) fb(S, F, 1, F.L - 1, y - 1.8, y - 0.3, 0.3, 0.36, glas);
    }
  }
  // Rundkopf und Krone
  const rr = a * 0.42, Hk = Hs + 14;
  zyl(S, a * 0.5, a * 0.52, 2, cx, Hs, cz, hell, 8);
  zyl(S, rr, rr, 12, cx, Hs + 2, cz, glas, 24);
  for (let y = Hs + 4; y < Hs + 14; y += 3) zyl(S, rr + 0.15, rr + 0.15, 0.4, cx, y, cz, hell, 24);
  for (let i = 0; i < 16; i++) { const w = (i / 16) * 2 * PI; const nx = Math.cos(w), nz = Math.sin(w); if (sieht(p, nx, nz)) S.box(0.5, 12, 0.5, cx + nx * (rr + 0.1), Hs + 8, cz + nz * (rr + 0.1), hell, -w); }
  // gestufte Krone: drei flache Ringe, Laterne, kurzer Mast
  zyl(S, rr + 1.0, rr + 1.0, 1.4, cx, Hk, cz, stein, 24);
  zyl(S, rr * 0.78, rr * 0.82, 3.2, cx, Hk + 1.4, cz, hell, 24);
  zyl(S, rr * 0.8, rr * 0.8, 0.5, cx, Hk + 4.6, cz, stein, 24);
  zyl(S, rr * 0.5, rr * 0.54, 3.0, cx, Hk + 5.1, cz, glas, 16);
  zyl(S, rr * 0.56, rr * 0.56, 0.6, cx, Hk + 8.1, cz, stein, 16);
  zyl(S, 0.12, 0.35, 9, cx, Hk + 8.7, cz, '#d9dcdf', 6);
  const [name, farbe] = o.bank ?? BANKEN[2];
  for (const [k, F] of seiten(p, x0 - 5, z0 - 5, a + 10, a + 10)) if (k === '+z' || k === '+x' || k === '-z' || k === '-x') ftext(scene, F, name, F.L / 2, pod - 3.5, 0.42, 1.5, 24, '#ffffff', farbe);
  for (const [k, F] of seiten(p, x0, z0, a, a)) logo(S, scene, teil(F, f, a - f, 0.9), (a - 2 * f) / 2, Hs - 4, 0.0, 3.6, farbe, null);
  return Hk + 18;
}
/** Abgerundeter Turm: Glaszylinder mit Ringbändern an einem steinernen Kernturm, Helikopterring und Mast. */
function turmRund(S, scene, p, r, cx, cz, o = {}) {
  const rr = o.rad ?? 14, n = o.n ?? 52, gh = 3.6, pod = 7, H = pod + n * gh;
  const glas = waehle(r, ['#5f8f9a', '#5d7f99', '#6a8fa6']), ring = '#c9d6dc', stein = '#d6d0c4';
  const kb = 16, kd = 20, kx0 = cx - rr * 0.2 - kb, kz0 = cz - kd / 2, Hk = H * 0.86;
  if (o.podium !== false) podium(S, scene, p, cx - rr - kb - 2, cz - rr - 4, 2 * rr + kb + 8, 2 * rr + 8, pod - 1, { stein });
  // Kernturm
  S.quader(kx0, 0, kz0, kx0 + kb, Hk, kz0 + kd, stein);
  for (const [k, F] of seiten(p, kx0, kz0, kb, kd)) {
    for (const u of achsen(0, F.L, 2.4, 0.8)) fb(S, F, u - 0.55, u + 0.55, pod, Hk - 3, 0, 0.05, GLAS);
    for (let y = pod + 2 * gh; y < Hk - 3; y += 2 * gh) fb(S, F, 0, F.L, y - 0.3, y, 0, 0.12, heller(stein, 0.05));
    fb(S, F, -0.1, F.L + 0.1, Hk - 3, Hk, 0, 0.2, heller(stein, 0.05));
  }
  // Glaszylinder
  zyl(S, rr, rr, H, cx, 0, cz, glas, 32);
  for (let y = pod + gh; y < H - 1; y += gh) zyl(S, rr + 0.12, rr + 0.12, 0.26, cx, y, cz, ring, 32);
  for (let i = 0; i < 24; i++) { const w = (i / 24) * 2 * PI, nx = Math.cos(w), nz = Math.sin(w); if (sieht(p, nx, nz)) S.box(0.18, H - pod, 0.18, cx + nx * (rr + 0.1), pod + (H - pod) / 2, cz + nz * (rr + 0.1), dunkler(glas, 0.1), -w); }
  zyl(S, rr + 0.4, rr + 0.4, 2.5, cx, H, cz, ring, 32);
  zyl(S, rr * 0.7, rr * 0.7, 0.3, cx, H + 2.5, cz, '#8d939a', 24);
  zyl(S, rr * 0.55, rr * 0.55, 0.32, cx, H + 2.52, cz, '#e8e5dc', 24);
  zyl(S, rr * 0.48, rr * 0.48, 0.34, cx, H + 2.54, cz, '#8d939a', 24);
  // Mast rot-weiß
  for (let i = 0; i < 6; i++) zyl(S, 0.45 - i * 0.05, 0.5 - i * 0.05, 4, cx - rr * 0.5, H + 2.5 + i * 4, cz + rr * 0.3, i % 2 ? '#f2f1ec' : '#c8463c', 8);
  const [name, farbe] = o.bank ?? BANKEN[1];
  for (const [k, F] of seiten(p, kx0, kz0, kb, kd, ['+z', '-z', '-x'])) logo(S, scene, F, F.L / 2 - (k === '-x' ? 0 : 3), Hk - 1.5, 0.2, 2.4, farbe, null);
  for (const [k, F] of seiten(p, cx - rr - kb - 2, cz - rr - 4, 2 * rr + kb + 8, 2 * rr + 8)) ftext(scene, F, name, F.L / 2, pod - 2.8, 0.42, 1.4, 22, '#ffffff', farbe);
  return H + 27;
}
function platzUmfeld(S, r, p, frei) {
  const { x: x0, z: z0, w, d } = p;
  boden(S, x0, z0, x0 + w, z0 + d, PLATZ, 0.3, 0.07);
  // Baumraster am Rand, Bänke
  for (let x = x0 + 4; x < x0 + w - 2; x += 8) for (const z of [z0 + d - 3, z0 + 3]) if (frei(x, z)) { baum(S, x, z, r, 0.95); }
  for (let z = z0 + 11; z < z0 + d - 8; z += 8) for (const x of [x0 + w - 3, x0 + 3]) if (frei(x, z)) baum(S, x, z, r, 0.95);
}
function skylineRoh(S, scene, p) {
  const r = rng(`sky:${p.seed}`), v = p.variante, { x: x0, z: z0, w, d } = p;
  const bank = BANKEN[Math.floor(r() * BANKEN.length)];
  const cx = x0 + w / 2, cz = z0 + d / 2;
  if (v === 'ensemble') {
    boden(S, x0, z0, x0 + w, z0 + d, PLATZ, 0.3, 0.07);
    const h1 = turmKrone(S, scene, p, r, x0 + 22, z0 + 21, { a: 24, n: 44, bank: BANKEN[2], podium: false, kern: false });
    const h2 = turmRund(S, scene, p, r, x0 + w - 16, z0 + 19, { rad: 11, n: 40, bank: BANKEN[1], podium: false });
    const h3 = turmRaster(S, scene, p, r, x0 + w * 0.5, z0 + d - 17, { a: 26, b: 18, n: 24, bank: BANKEN[3], podium: false });
    podium(S, scene, p, x0 + 6, z0 + 6, w - 12, 16, 6, { stein: '#dedad2' });
    brunnenRund(S, x0 + 12, z0 + d - 8, 3.2);
    for (let x = x0 + 4; x < x0 + w - 2; x += 8) baum(S, x, z0 + d - 2.5, r, 0.9);
    return { hoehe: Math.max(h1, h2, h3) };
  }
  const R0 = { raster: 26, zwilling: 30, krone: 26, rund: 26 }[v];
  platzUmfeld(S, r, p, (x, z) => Math.abs(x - cx) > R0 || Math.abs(z - cz) > R0 - 4);
  let h;
  if (v === 'raster') h = turmRaster(S, scene, p, r, cx, cz - 1, { bank, n: 30 + Math.floor(r() * 8) });
  else if (v === 'zwilling') h = turmZwilling(S, scene, p, r, cx, cz, { bank, versatz: r() < 0.5 ? 0 : 7.5 });
  else if (v === 'krone') h = turmKrone(S, scene, p, r, cx, cz, { bank });
  else h = turmRund(S, scene, p, r, cx + 6, cz, { bank });
  brunnenRund(S, x0 + 7, z0 + d - 8, 2.6, { schale: false });
  return { hoehe: h };
}

// =====================================================================================
// 2. Hessisches Fachwerk
// =====================================================================================
const HOLZ = ['#7a2e24', '#5b4031', '#6e4430', '#3d3633', '#8a4b32', '#4a3b33', '#6a2f2a'];
const GEFACH = ['#f4efe2', '#efe6d0', '#f2e7c9', '#ece2d2', '#f3ead9', '#e9dcc0'];
const LAEDEN = ['#3f7d56', '#2f6f8f', '#8c3b3b', '#d39a2b', '#5a6e8a', '#2f6b4a'];
/**
 * Ein Fachwerkgeschoss auf einem Rahmen. art: 'mann' (Mann-Figuren), 'zier' (Andreaskreuze, Feuerböcke).
 * Fenster in Achsen, Posten an den Fensterseiten, Mann-Figuren in den Feldern dazwischen.
 */
function fwGeschoss(S, F, y0, h, o) {
  const { holz, art } = o, T = 0.08, B = 0.2, L = F.L;
  fb(S, F, 0, L, y0, y0 + B, 0, T, holz);
  fb(S, F, 0, L, y0 + h - B, y0 + h, 0, T, holz);
  const fw = o.fw ?? 0.9, fh = Math.min(1.3, h - 1.25), yb = y0 + 0.85;
  const ax = o.achsen ?? achsen(0, L, o.ra ?? 2.3, 0.9);
  fb(S, F, 0, L, yb - 0.17, yb - 0.03, 0, T, holz);
  fb(S, F, 0, L, yb + fh + 0.03, yb + fh + 0.17, 0, T, holz);
  const posten = [0.11, L - 0.11];
  for (const u of ax) posten.push(u - fw / 2 - 0.12, u + fw / 2 + 0.12);
  posten.sort((a, b) => a - b);
  for (const u of posten) fb(S, F, u - 0.1, u + 0.1, y0, y0 + h, 0, T, holz);
  ax.forEach((u, i) => {
    const a = u - fw / 2 - 0.02, b = u + fw / 2 + 0.02, ya = y0 + B, yc = yb - 0.17;
    if (art === 'zier') { fstrebe(S, F, a, ya, b, yc, 0.11, 0, T, holz); fstrebe(S, F, a, yc, b, ya, 0.11, 0, T, holz); }
    else if ((i + o.k) % 2 === 0) { const m = (a + b) / 2; fstrebe(S, F, a, ya, m, yc, 0.1, 0, T, holz); fstrebe(S, F, m, yc, b, ya, 0.1, 0, T, holz); }
    fenster(S, F, u, yb, fw, fh, { kreuz: true, laeden: o.laeden, rahmen: WEISS, t: 0.02 });
  });
  // Felder ohne Fenster: Mann-Figur (Ständer, zwei Fußstreben, zwei Kopfwinkel) oder einfache Strebe
  for (let i = 0; i < posten.length - 1; i++) {
    const a = posten[i] + 0.1, b = posten[i + 1] - 0.1;
    if (b - a < 0.45 || ax.some((u) => u > a && u < b)) continue;
    if (b - a > 1.3) {
      const m = (a + b) / 2, ym = y0 + h * 0.62;
      fb(S, F, m - 0.1, m + 0.1, y0, y0 + h, 0, T, holz);
      fstrebe(S, F, a + 0.05, y0 + B, m, ym, 0.15, 0, T * 1.05, holz);
      fstrebe(S, F, b - 0.05, y0 + B, m, ym, 0.15, 0, T * 1.05, holz);
      fstrebe(S, F, m, y0 + h * 0.74, Math.max(a + 0.1, m - 0.55), y0 + h - B, 0.11, 0, T * 1.05, holz);
      fstrebe(S, F, m, y0 + h * 0.74, Math.min(b - 0.1, m + 0.55), y0 + h - B, 0.11, 0, T * 1.05, holz);
      if (art === 'zier' && b - a > 1.7) { fstrebe(S, F, a, y0 + h - B, m - 0.1, y0 + h * 0.8, 0.08, 0, T, holz); fstrebe(S, F, b, y0 + h - B, m + 0.1, y0 + h * 0.8, 0.08, 0, T, holz); }
    } else fstrebe(S, F, a, y0 + B, b, y0 + h - B, 0.13, 0, T, holz);
  }
}
/** Fachwerkgiebel (Dreieck über u 0..L ab y, Höhe hg). schiefer: verschiefert mit Fenstern. */
function fwGiebel(S, F, y, hg, o) {
  const L = F.L, m = L / 2, T = 0.08, { holz } = o;
  const breite = (yy) => Math.max(0, (L / 2) * (1 - (yy - y) / hg));
  if (o.schiefer) {
    fpoly(S, F, [[0.05, y], [L - 0.05, y], [m, y + hg - 0.1]], 0, 0.1, SCHIEFER);
    for (let yy = y + 0.6; yy < y + hg - 0.8; yy += 0.7) { const b = breite(yy) - 0.1; fb(S, F, m - b, m + b, yy, yy + 0.05, 0.1, 0.13, SCHIEFER2); }
    const us = L > 7 ? [m - 1.2, m + 1.2] : [m];
    for (const u of us) fenster(S, F, u, y + 0.7, 0.75, 1.15, { kreuz: true, laeden: o.laeden, t: 0.1 });
    fenster(S, F, m, y + hg * 0.52, 0.55, 0.8, { t: 0.1 });
    fb(S, F, -0.2, L + 0.2, y - 0.12, y + 0.06, 0, 0.16, WEISS);
    return;
  }
  fb(S, F, 0.2, L - 0.2, y, y + 0.18, 0, T, holz);
  const y2 = y + hg * 0.5;
  fb(S, F, m - breite(y2) + 0.25, m + breite(y2) - 0.25, y2, y2 + 0.16, 0, T, holz);
  fb(S, F, m - 0.09, m + 0.09, y, y + hg - 0.2, 0, T, holz);
  for (const s of [-1, 1]) {
    const u = m + s * L * 0.22;
    fb(S, F, u - 0.08, u + 0.08, y, y2, 0, T, holz);
    fstrebe(S, F, m + s * (L / 2 - 0.4), y + 0.2, m + s * 0.4, y2 - 0.05, 0.13, 0, T, holz);
  }
  fstrebe(S, F, 0.25, y + 0.15, m, y + hg - 0.25, 0.18, 0, T * 1.2, holz);
  fstrebe(S, F, L - 0.25, y + 0.15, m, y + hg - 0.25, 0.18, 0, T * 1.2, holz);
  const us = L > 7 ? [m - L * 0.32, m + L * 0.32 ] : [];
  for (const u of us) if (breite(y + 1.6) > Math.abs(u - m) + 0.6) fenster(S, F, u, y + 0.5, 0.7, 1.0, { kreuz: true, t: 0.02 });
  fenster(S, F, m - 0.55, y + 0.5, 0.6, 1.0, { t: 0.02 }); fenster(S, F, m + 0.55, y + 0.5, 0.6, 1.0, { t: 0.02 });
  if (hg > 4) fenster(S, F, m, y2 + 0.5, 0.5, 0.75, { t: 0.02 });
}
/** Erdgeschoss eines Altstadthauses: Laden oder Hauseingang mit Sandsteinsockel. */
function egZone(S, scene, F, eg, o, r) {
  const L = F.L;
  fb(S, F, -0.02, L + 0.02, 0, 0.55, 0, 0.12, dunkler(o.stein, 0.12));
  if (o.laden) {
    const lb = Math.min(L - 1.6, 5.5), u0 = (L - lb) / 2;
    fb(S, F, u0, u0 + lb, 0.4, eg - 0.7, 0, 0.06, GLAS_HELL);
    fb(S, F, u0 - 0.15, u0 + lb + 0.15, eg - 0.7, eg - 0.45, 0, 0.12, o.laden);
    for (const u of [u0, u0 + lb / 2, u0 + lb]) fb(S, F, u - 0.07, u + 0.07, 0.4, eg - 0.7, 0, 0.1, o.laden);
    if (o.name) ftext(scene, F, o.name, L / 2, eg - 0.2, 0.14, 0.42, L - 0.8, '#3a2a20');
    if (o.markise) { const g = new THREE.BoxGeometry(lb + 0.4, 0.12, 1.4); g.rotateX(0.38); g.translate(L / 2, eg - 0.75, 0.6); fgeo(S, F, g, o.markise); }
  } else {
    fenster(S, F, L * 0.28, 1.0, 0.9, 1.3, { kreuz: true, sims: dunkler(o.stein, 0.06) });
    fb(S, F, L * 0.68 - 0.6, L * 0.68 + 0.6, 0.3, 2.5, 0, 0.08, waehle(r, ['#6b4c36', '#3f5a4a', '#5a3a2e']));
    fwand(S, F, L * 0.68 - 0.9, L * 0.68 + 0.9, 0.3, 2.9, 0, 0.14, dunkler(o.stein, 0.05), [{ u0: L * 0.68 - 0.6, u1: L * 0.68 + 0.6, v0: 0.29, v1: 2.75, bogen: true }]);
  }
}
const LADEN_ALT = ['Bäckerei Hessler', 'Apfelwein Stube', 'Buchhandlung Lahn', 'Konditorei Weck', 'Eisenwaren Rau', 'Weinhaus Ohm', 'Metzgerei Fink', 'Café Rosenhof', 'Antiquitäten Kuhl', 'Goldschmiede Kraft', 'Töpferei Eder', 'Drogerie Hain'];
/**
 * Fachwerkhaus, lokal [x0, x0+b] × [z0, z0+t], Front +z. Stockwerke kragen zur Straße (+z) und zum Hof (-z) aus.
 * o: { n, giebel (true: Giebel zur Straße), art, schiefer ('giebel' | 'ganz' | null), frei: Seiten ohne Nachbar }
 */
export function fwHaus(S, scene, p, r, x0, z0, b, t, o = {}) {
  const n = o.n ?? 2 + Math.floor(r() * 2), eg = o.eg ?? zw(r, 3.0, 3.4), gh = o.gh ?? zw(r, 2.6, 2.85), vk = o.vk ?? zw(r, 0.25, 0.45);
  const holz = o.holz ?? waehle(r, HOLZ), wand = o.wand ?? waehle(r, GEFACH), stein = o.stein ?? waehle(r, ['#d9c4a8', '#cdb79a', '#c9a58c', '#e3d3bd']);
  const art = o.art ?? (r() < 0.35 ? 'zier' : 'mann'), schiefer = o.schiefer ?? (r() < 0.35 ? 'giebel' : null);
  const laeden = o.fensterLaeden ?? (r() < 0.5 ? waehle(r, LAEDEN) : null), dachF = o.dach ?? (schiefer || r() < 0.4 ? SCHIEFER : waehle(r, [ZIEGEL, ZIEGEL2, '#9a4a36']));
  const frei = o.frei ?? [];
  const sicht = (k) => k === '+z' || k === '-z' || frei.includes(k);
  // Erdgeschoss
  S.quader(x0, 0, z0, x0 + b, eg, z0 + t, stein);
  for (const [k, F] of seiten(p, x0, z0, b, t)) if (sicht(k)) egZone(S, scene, F, eg, { stein, laden: k === '+z' && o.laden ? o.laden : null, name: o.name, markise: o.markise }, r);
  let y = eg, e = 0;
  for (let k = 1; k <= n; k++) {
    e = k * vk;
    const za = z0 - e, zb = z0 + t + e, ganz = schiefer === 'ganz' && k > 1;
    S.quader(x0, y, za, x0 + b, y + gh, zb, ganz ? SCHIEFER : wand);
    for (const [kk, F] of seiten(p, x0, za, b, zb - za)) {
      if (!sicht(kk)) continue;
      // Knaggen unter der Auskragung
      if (kk === '+z' || kk === '-z') { for (const u of achsen(0, F.L, 1.2, 0.2)) fstrebe(S, F, u, y - 0.6, u, y, 0.16, -vk, 0.02, holz); fb(S, F, 0, F.L, y - 0.08, y + 0.04, -vk, 0.06, holz); }
      if (ganz) {
        for (let yy = y + 0.4; yy < y + gh; yy += 0.55) fb(S, F, 0, F.L, yy, yy + 0.05, 0, 0.04, SCHIEFER2);
        for (const u of achsen(0, F.L, 2.3, 0.9)) fenster(S, F, u, y + 0.8, 0.9, 1.25, { kreuz: true, laeden, t: 0.04 });
        fb(S, F, -0.05, F.L + 0.05, y + gh - 0.15, y + gh, 0, 0.12, WEISS);
      } else fwGeschoss(S, F, y, gh, { holz, art, laeden, k });
    }
    y += gh;
  }
  const H = y, za = z0 - e, zb = z0 + t + e;
  const giebel = o.giebel ?? b <= 10;
  // Brandwände, die über Nachbarn hinausragen könnten: verschiefert (liegen sonst im Nachbarn)
  for (const [k, F] of seiten(p, x0, za, b, zb - za, ['+x', '-x'])) if (!frei.includes(k)) fb(S, F, e, F.L - e, eg, H, 0, 0.04, SCHIEFER);
  if (giebel) {
    const hg = b * zw(r, 0.75, 0.9);
    satteldach(S, x0, za, x0 + b, zb, H, hg, 'z', dachF, schiefer ? SCHIEFER : wand, 0.5);
    for (const [k, F] of seiten(p, x0, za, b, zb - za, ['+z', '-z'])) fwGiebel(S, F, H, hg, { holz, schiefer: !!schiefer, laeden });
    // Aufzugsgaube für Lasten am Giebel nur gelegentlich
    return H + hg;
  }
  const hg = (zb - za) * zw(r, 0.62, 0.75);
  satteldach(S, x0, za, x0 + b, zb, H, hg, 'x', dachF, wand, 0.5);
  for (const [k, F] of seiten(p, x0, za, b, zb - za, ['+x', '-x'])) {
    if (frei.includes(k)) fwGiebel(S, F, H, hg, { holz, schiefer: !!schiefer, laeden });
    else fpoly(S, F, [[0.1, H], [F.L - 0.1, H], [F.L / 2, H + hg - 0.15]], 0, 0.05, SCHIEFER);
  }
  // Zwerchhaus zur Straße
  if (o.zwerch !== false && b > 9) {
    const zb2 = 3.6, u = x0 + b / 2;
    for (const [k, F] of seiten(p, x0, za, b, zb - za, ['+z', '-z'])) {
      const uF = k === '+z' ? u - x0 : x0 + b - u;
      fb(S, F, uF - zb2 / 2, uF + zb2 / 2, H, H + gh, -2.6, 0, wand);
      const FZ = teil(F, uF - zb2 / 2, uF + zb2 / 2);
      fwGeschoss(S, FZ, H, gh, { holz, art, laeden: null, k: 0, achsen: [zb2 / 2] });
      const hz = zb2 * 0.8;
      fpoly(S, FZ, [[0, H + gh], [zb2, H + gh], [zb2 / 2, H + gh + hz]], -3.2, 0, wand);
      fstrebe(S, FZ, -0.3, H + gh - 0.2, zb2 / 2, H + gh + hz + 0.1, 0.25, -3.4, 0.25, dachF);
      fstrebe(S, FZ, zb2 + 0.3, H + gh - 0.2, zb2 / 2, H + gh + hz + 0.1, 0.25, -3.4, 0.25, dachF);
      fenster(S, FZ, zb2 / 2, H + gh + 0.3, 0.5, 0.8, { t: 0.02 });
    }
  }
  // Schornstein
  S.quader(x0 + b * 0.7, H + hg * 0.5, z0 + t / 2 - 0.4, x0 + b * 0.7 + 0.8, H + hg + 1.0, z0 + t / 2 + 0.4, '#a46a52');
  return H + hg;
}
/** Treppengiebelhaus aus Stein (Römerberg-artige Rekonstruktion, eigenständig). */
function steinGiebelHaus(S, scene, p, r, x0, z0, b, t, o) {
  const n = o.n ?? 3, eg = 4.4, gh = 3.4, H = eg + n * gh, wand = o.wand, orn = o.orn ?? '#efe3cc';
  S.quader(x0, 0, z0, x0 + b, H, z0 + t, wand);
  for (const [k, F] of seiten(p, x0, z0, b, t, ['+z', '-z'])) {
    // EG Arkade mit drei Rundbögen
    const nb = Math.max(2, Math.round(b / 3.4)), bb = F.L / nb, L = [];
    for (let i = 0; i < nb; i++) L.push({ u0: i * bb + 0.45, u1: (i + 1) * bb - 0.45, v0: 0.3, v1: eg - 0.4, bogen: true });
    lochwand(S, F, 0, F.L, 0, eg, o.stein ?? '#c9a58c', L, { glas: '#5a4f48', dick: 0.4 });
    fb(S, F, -0.1, F.L + 0.1, eg, eg + 0.35, 0, 0.45, orn);
    // Obergeschosse: gekuppelte Fenster
    const L2 = [];
    for (let k2 = 0; k2 < n; k2++) for (const u of achsen(0, F.L, 2.0, 0.5)) L2.push({ u0: u - 0.55, u1: u + 0.55, v0: eg + 0.9 + k2 * gh, v1: eg + 0.9 + k2 * gh + 1.9, bogen: k2 === n - 1 ? true : null });
    lochwand(S, F, 0, F.L, eg + 0.35, H, wand, L2, { dick: 0.2 });
    for (let k2 = 1; k2 < n; k2++) fb(S, F, -0.05, F.L + 0.05, eg + k2 * gh, eg + k2 * gh + 0.2, 0, 0.3, orn);
    if (o.balkon && k === '+z') {
      fb(S, F, F.L * 0.2, F.L * 0.8, eg + 0.35, eg + 0.6, 0, 1.2, orn);
      for (let u = F.L * 0.2 + 0.2; u < F.L * 0.8; u += 0.35) fb(S, F, u - 0.05, u + 0.05, eg + 0.6, eg + 1.5, 1.05, 1.15, '#3b3f44');
      fb(S, F, F.L * 0.2, F.L * 0.8, eg + 1.45, eg + 1.55, 0.95, 1.2, '#3b3f44');
    }
    if (o.uhr && k === '+z') { fscheibe(S, F, F.L / 2, H - 1.2, 0.2, 0.3, 0.75, '#f6f1e2'); fscheibe(S, F, F.L / 2, H - 1.2, 0.3, 0.34, 0.6, '#2b3036'); }
    // Treppengiebel
    const st = 5, hg = b * 0.95, sb = (b / 2) / (st + 0.5);
    for (let i = 0; i < st; i++) {
      const u0 = i * sb, u1 = F.L - i * sb, yy = H + i * (hg / st);
      fb(S, F, u0, u1, yy, yy + hg / st, -t / 2 + 0.6 - 0.001 * i, 0.15, wand);
      fb(S, F, u0 - 0.1, u0 + sb + 0.05, yy + hg / st - 0.2, yy + hg / st, -0.4, 0.3, orn);
      fb(S, F, u1 - sb - 0.05, u1 + 0.1, yy + hg / st - 0.2, yy + hg / st, -0.4, 0.3, orn);
    }
    fb(S, F, F.L / 2 - sb * 0.5, F.L / 2 + sb * 0.5, H + hg, H + hg + 1.0, -0.4, 0.3, orn);
    lochwand(S, teil(F, 0, F.L, 0.15), F.L / 2 - 1.4, F.L / 2 + 1.4, H + 1.0, H + 3.4, wand, [{ u0: F.L / 2 - 1.0, u1: F.L / 2 - 0.15, v0: H + 1.2, v1: H + 3.0, bogen: true }, { u0: F.L / 2 + 0.15, u1: F.L / 2 + 1.0, v0: H + 1.2, v1: H + 3.0, bogen: true }], { dick: 0.12 });
  }
  const hg = b * 0.95;
  satteldach(S, x0 + 0.2, z0 + 0.3, x0 + b - 0.2, z0 + t - 0.3, H, hg * 0.92, 'z', SCHIEFER, wand, 0.2);
  for (const [k, F] of seiten(p, x0, z0, b, t, ['+x', '-x'])) if (o.frei?.includes(k)) {
    for (const u of achsen(0, F.L, 2.4, 0.8)) for (let k2 = 0; k2 < n; k2++) fenster(S, F, u, eg + 0.9 + k2 * gh, 1.0, 1.8, { kreuz: true });
  }
  return H + hg;
}
/** Fachwerk-Rathaus mit Steinhalle und Erkertürmchen an den Ecken (eigenständig). */
function fwRathaus(S, scene, p, r, x0, z0, b, t) {
  const holz = '#6a2f2a', wand = '#f4efe2', stein = '#c9a58c', eg = 4.2, gh = 2.9, n = 2, vk = 0.4;
  S.quader(x0, 0, z0, x0 + b, eg, z0 + t, stein);
  for (const [k, F] of seiten(p, x0, z0, b, t)) {
    const nb = Math.max(2, Math.round(F.L / 3.6)), bb = F.L / nb, L = [];
    for (let i = 0; i < nb; i++) L.push({ u0: i * bb + 0.5, u1: (i + 1) * bb - 0.5, v0: 0.3, v1: eg - 0.5, bogen: 'spitz' });
    lochwand(S, F, 0, F.L, 0, eg, stein, L, { glas: '#4a403a', dick: 0.5 });
  }
  let y = eg;
  for (let k = 1; k <= n; k++) {
    const e = k * vk;
    S.quader(x0 - e, y, z0 - e, x0 + b + e, y + gh, z0 + t + e, wand);
    for (const [kk, F] of seiten(p, x0 - e, z0 - e, b + 2 * e, t + 2 * e)) {
      for (const u of achsen(0, F.L, 1.0, 0.3)) fstrebe(S, F, u, y - 0.6, u, y, 0.18, -vk, 0.02, holz);
      fwGeschoss(S, F, y, gh, { holz, art: k === 2 ? 'zier' : 'mann', laeden: null, k, ra: 2.1 });
    }
    y += gh;
  }
  const e = n * vk, H = y, hg = (t + 2 * e) * 0.95;
  satteldach(S, x0 - e, z0 - e, x0 + b + e, z0 + t + e, H, hg, 'x', SCHIEFER, wand, 0.5);
  for (const [k, F] of seiten(p, x0 - e, z0 - e, b + 2 * e, t + 2 * e, ['+x', '-x'])) fwGiebel(S, F, H, hg, { holz });
  // Erkertürmchen an den Ecken der Straßenseite
  for (const s of [0, 1]) {
    const ex = s ? x0 + b + e : x0 - e, ez = z0 + t + e, rr = 1.3;
    zyl(S, rr, rr, gh * 2 + 0.5, ex, eg + 0.2, ez, wand, 8);
    for (let i = 0; i < 8; i++) { const w = (i / 8) * 2 * PI; if (sieht(p, Math.cos(w), Math.sin(w))) { S.box(0.18, gh * 2 + 0.5, 0.18, ex + Math.cos(w) * rr, eg + 0.2 + gh + 0.25, ez + Math.sin(w) * rr, holz); } }
    for (let k = 0; k < 2; k++) zyl(S, rr + 0.06, rr + 0.06, 0.2, ex, eg + 0.2 + k * gh + gh * 0.4, ez, GLAS, 8);
    const g = new THREE.ConeGeometry(rr + 0.4, 5.5, 8); g.translate(ex, eg + 0.7 + gh * 2 + 2.75, ez); S.add(g, SCHIEFER);
    zyl(S, 0.04, 0.1, 1.4, ex, eg + 0.7 + gh * 2 + 5.4, ez, '#d8b45a', 4);
    zyl(S, rr * 0.9, 0.2, 1.6, ex, eg - 1.4, ez, stein, 8);
  }
  // Dachreiter mit Glocke
  const cx = x0 + b / 2, cz = z0 + t / 2;
  S.quader(cx - 1.1, H + hg - 1, cz - 1.1, cx + 1.1, H + hg + 2.4, cz + 1.1, SCHIEFER);
  for (const [k, F] of seiten(p, cx - 1.1, cz - 1.1, 2.2, 2.2)) fwand(S, F, 0.2, 2.0, H + hg + 0.4, H + hg + 2.2, 0, 0.06, SCHIEFER2, [{ u0: 0.5, u1: 1.7, v0: H + hg + 0.6, v1: H + hg + 2.0, bogen: true }]);
  const g = new THREE.ConeGeometry(1.7, 5, 8); g.translate(cx, H + hg + 4.9, cz); S.add(g, SCHIEFER);
  zyl(S, 0.04, 0.12, 1.6, cx, H + hg + 7.3, cz, '#d8b45a', 4);
  return H + hg + 9;
}
function marktbrunnen(S, x, z, r) {
  zyl(S, 2.6, 2.6, 0.9, x, 0.36, z, '#b9a285', 8);
  zyl(S, 2.3, 2.3, 0.92, x, 0.38, z, FARBEN.wasser, 8);
  zyl(S, 0.35, 0.45, 3.6, x, 1.2, z, '#c9b291', 8);
  zyl(S, 0.5, 0.5, 0.3, x, 4.8, z, '#c9b291', 8);
  zyl(S, 0.22, 0.3, 1.6, x, 5.1, z, '#d8b45a', 6);
  S.add(new THREE.SphereGeometry(0.26, 8, 6).translate(x, 6.9, z), '#d8b45a');
}
function marktstand(S, x, z, r) {
  const f = waehle(r, ['#c9483e', '#2f6f8f', '#3f7d56', '#e8b53c', '#f2efe6']);
  S.box(3, 0.9, 1.8, x, 0.75, z, '#a98a62');
  for (const dx of [-1.4, 1.4]) S.box(0.1, 2.4, 0.1, x + dx, 1.5, z - 0.8, '#5a4636');
  const g = new THREE.BoxGeometry(3.4, 0.1, 2.4); g.rotateX(-0.2); g.translate(x, 2.7, z); S.add(g, f);
  for (let i = 0; i < 3; i++) S.box(0.8, 0.3, 0.6, x - 1 + i, 1.35, z + 0.3, waehle(r, ['#e07a3f', '#7fae5a', '#c8463c', '#e8c547']));
}
function fachwerkRoh(S, scene, p) {
  const r = rng(`fw:${p.seed}`), v = p.variante, { x: x0, z: z0, w, d } = p;
  boden(S, x0, z0, x0 + w, z0 + d, PFLASTER, 0.3, 0.07);
  let hmax = 0;
  const namen = mischen(LADEN_ALT, r);
  if (v === 'zeile' || v === 'roemer') {
    // Häuserzeile entlang x mit Platz davor
    const t = Math.min(13, d - 9), zt = z0 + 2;
    const breiten = [];
    let rest = w;
    while (rest > 0.5) { let bb = zw(r, 6.5, 10); if (rest - bb < 6) bb = rest; breiten.push(bb); rest -= bb; }
    if (v === 'roemer') {
      // drei Steingiebelhäuser in der Mitte, Fachwerk links und rechts
      const sb = Math.min(9.5, (w - 18) / 3), mitte = x0 + (w - 3 * sb) / 2;
      const steinFarben = ['#c98d7a', '#e3c2a2', '#d4a48a'];
      for (let i = 0; i < 3; i++) hmax = Math.max(hmax, steinGiebelHaus(S, scene, p, r, mitte + i * sb, zt, sb, t, { wand: steinFarben[i], n: 3, balkon: i === 1, uhr: i === 1, frei: i === 0 ? ['-x'] : i === 2 ? ['+x'] : [] }));
      let xl = mitte, xr = mitte + 3 * sb;
      while (xl - x0 > 6) { const bb = Math.min(xl - x0, zw(r, 6.5, 8.5)); const b2 = xl - x0 - bb < 5 ? xl - x0 : bb; hmax = Math.max(hmax, fwHaus(S, scene, p, r, xl - b2, zt + 0.5, b2, t - 1, { n: 3, vk: 0.5, schiefer: r() < 0.5 ? 'giebel' : null, laden: waehle(r, LAEDEN), name: namen.pop(), giebel: true, frei: xl - b2 - x0 < 0.5 ? ['-x'] : [] })); xl -= b2; }
      while (x0 + w - xr > 6) { const bb = Math.min(x0 + w - xr, zw(r, 6.5, 8.5)); const b2 = x0 + w - xr - bb < 5 ? x0 + w - xr : bb; hmax = Math.max(hmax, fwHaus(S, scene, p, r, xr, zt + 0.5, b2, t - 1, { n: 3, vk: 0.5, schiefer: r() < 0.5 ? 'giebel' : 'ganz', laden: waehle(r, LAEDEN), name: namen.pop(), giebel: true, frei: xr + b2 > x0 + w - 0.5 ? ['+x'] : [] })); xr += b2; }
      marktbrunnen(S, x0 + w / 2, z0 + d - 4.5, r);
      for (let i = 0; i < 4; i++) marktstand(S, x0 + 5 + i * (w - 10) / 3 + (i > 1 ? 2 : -2), z0 + d - 3.3, r);
      return { hoehe: hmax };
    }
    let x = x0;
    breiten.forEach((bb, i) => {
      const giebel = bb < 9 ? r() < 0.75 : r() < 0.2;
      const frei = [];
      if (i === 0) frei.push('-x');
      if (i === breiten.length - 1) frei.push('+x');
      const hz = fwHaus(S, scene, p, r, x, zt, bb, t, { giebel, frei, laden: r() < 0.6 ? waehle(r, LAEDEN) : null, name: namen.pop(), markise: r() < 0.3 ? waehle(r, ['#c9483e', '#3f7d56', '#2f6f8f']) : null });
      hmax = Math.max(hmax, hz); x += bb;
    });
    for (let i = 0; i < 3; i++) laterne(S, x0 + 4 + i * (w - 8) / 2, z0 + d - 2);
    for (let i = 0; i < 2; i++) bank(S, x0 + w * (0.3 + i * 0.4), z0 + d - 3.5);
    return { hoehe: hmax };
  }
  if (v === 'rathaus') {
    const b = Math.min(w - 12, 22), t = Math.min(d - 12, 13);
    const rx = x0 + 3, rz = z0 + 3;
    hmax = fwRathaus(S, scene, p, r, rx, rz, b, t);
    // Nachbarhaus rechts, Platz mit Brunnen
    hmax = Math.max(hmax, fwHaus(S, scene, p, r, rx + b + 2.5, rz, w - b - 8.5, t, { giebel: true, n: 2, schiefer: 'ganz', frei: ['+x', '-x'], laden: waehle(r, LAEDEN), name: namen.pop() }));
    marktbrunnen(S, x0 + w * 0.35, z0 + d - 5, r);
    baum(S, x0 + w - 4, z0 + d - 4, r, 1.1);
    for (let i = 0; i < 2; i++) marktstand(S, x0 + w * 0.6 + i * 4.5, z0 + d - 4.5, r);
    return { hoehe: hmax };
  }
  // Marktplatz in L-Form: Zeile hinten (Front +z) und Zeile links (Front +x)
  const t = 12;
  let x = x0 + t;
  const xs = [];
  while (x < x0 + w - 5) { let bb = zw(r, 6.5, 9); if (x0 + w - x - bb < 6) bb = x0 + w - x; xs.push([x, bb]); x += bb; }
  xs.forEach(([xx, bb], i) => { hmax = Math.max(hmax, fwHaus(S, scene, p, r, xx, z0 + 1, bb, t, { giebel: r() < 0.7, frei: i === xs.length - 1 ? ['+x'] : [], laden: r() < 0.5 ? waehle(r, LAEDEN) : null, name: namen.pop() })); });
  // linke Zeile: Häuser mit Front +x lokal gebaut über eigenen gedrehten Blick
  let z = z0 + 1 + t + 0.5;
  while (z < z0 + d - 6) {
    let bb = zw(r, 6.5, 9); if (z0 + d - z - bb < 6) bb = z0 + d - z - 0.5;
    const pp = { ...p, blick: [-(p.blick ?? [1, 1])[1], (p.blick ?? [1, 1])[0]] };
    // Haus in einer Untergruppe, um 90° gedreht: lokale Front +z zeigt nach +x
    const T = new Sammler(), grp = new THREE.Group();
    const hz = fwHaus(T, grp, pp, r, 0, 0, bb, t, { giebel: r() < 0.7, frei: z + bb > z0 + d - 7 ? ['-x'] : [], laden: r() < 0.5 ? waehle(r, LAEDEN) : null, name: namen.pop() });
    for (const [farbe, gs] of T.teile) for (const g of gs) { g.rotateY(PI / 2); g.translate(x0 + 1, 0, z + bb); S.add(g, farbe); }
    grp.rotation.y = PI / 2; grp.position.set(x0 + 1, 0, z + bb); scene.add(grp);
    hmax = Math.max(hmax, hz); z += bb;
  }
  marktbrunnen(S, x0 + t + (w - t) * 0.45, z0 + t + (d - t) * 0.5, r);
  for (let i = 0; i < 3; i++) marktstand(S, x0 + t + 6 + i * 5, z0 + d - 4, r);
  baum(S, x0 + w - 5, z0 + d - 5, r, 1.15);
  return { hoehe: hmax };
}


// =====================================================================================
// Gemeinsame Bauteile: Säulen, Portikus, Kuppel, Unterbau mit Drehung
// =====================================================================================
function saeule(S, x, y0, z, h, rad, c, kap = null) {
  S.box(rad * 2.6, 0.35, rad * 2.6, x, y0 + 0.17, z, kap ?? c);
  zyl(S, rad * 0.9, rad, h - 0.75, x, y0 + 0.35, z, c, 10);
  S.box(rad * 2.5, 0.4, rad * 2.5, x, y0 + h - 0.2, z, kap ?? c);
}
/** Säulenreihe entlang eines Rahmens bei Abstand t vor der Wand. */
function saeulenreihe(S, F, u0, u1, n, y0, h, t, rad, c, kap) {
  for (let i = 0; i < n; i++) { const u = u0 + (n === 1 ? 0 : (i * (u1 - u0)) / (n - 1)); const [x, z] = wp(F, u, t); saeule(S, x, y0, z, h, rad, c, kap); }
}
/** Dreiecksgiebel (Tympanon) mit Gesims auf einem Rahmen. */
function dreiecksgiebel(S, F, u0, u1, y, h, t0, t1, wand, orn) {
  const m = (u0 + u1) / 2;
  fpoly(S, F, [[u0, y], [u1, y], [m, y + h]], t0, t1, wand);
  fstrebe(S, F, u0 - 0.3, y - 0.05, m, y + h + 0.15, 0.4, t0, t1 + 0.2, orn);
  fstrebe(S, F, u1 + 0.3, y - 0.05, m, y + h + 0.15, 0.4, t0, t1 + 0.2, orn);
  fb(S, F, u0 - 0.4, u1 + 0.4, y - 0.4, y, t0, t1 + 0.25, orn);
}
/** Flache Kuppel mit Tambour und Laterne. */
function kuppel(S, x, y, z, rad, o = {}) {
  const tamb = o.tambour ?? rad * 0.5;
  if (tamb > 0) { zyl(S, rad, rad, tamb, x, y, z, o.wand ?? '#ece4d2', 16); zyl(S, rad + 0.3, rad + 0.3, 0.5, x, y + tamb - 0.5, z, o.orn ?? WEISS, 16); }
  const g = new THREE.SphereGeometry(rad, 18, 8, 0, 2 * PI, 0, PI / 2); g.scale(1, o.hoch ?? 0.75, 1); g.translate(x, y + tamb, z); S.add(g, o.dach ?? KUPFER);
  const yl = y + tamb + rad * (o.hoch ?? 0.75);
  zyl(S, rad * 0.16, rad * 0.16, rad * 0.35, x, yl - 0.2, z, o.orn ?? WEISS, 8);
  const k = new THREE.ConeGeometry(rad * 0.2, rad * 0.3, 8); k.translate(x, yl + rad * 0.3, z); S.add(k, o.dach ?? KUPFER);
  zyl(S, 0.05, 0.12, 1.4, x, yl + rad * 0.45, z, '#d8b45a', 4);
  return yl + rad * 0.45 + 1.4;
}
/**
 * Unterbau mit eigener Drehung: fn(S2, scene2, p2) baut lokal mit Front +z in [0, b] × [0, t];
 * front: Richtung der Front im übergeordneten System, Ecke (ox, oz) = Ecke des Grundrisses im übergeordneten System.
 */
function unterbau(S, scene, p, front, ox, oz, b, t, fn) {
  const th = WINKEL[front];
  const bl = p.blick ?? [1, 1], c = Math.cos(th), sn = Math.sin(th);
  const pp = { ...p, blick: [bl[0] * c - bl[1] * sn, bl[0] * sn + bl[1] * c] };
  const T = new Sammler(), grp = new THREE.Group();
  const erg = fn(T, grp, pp);
  const quer = front === '+x' || front === '-x', W = quer ? t : b, D = quer ? b : t;
  // Mittelpunkt des lokalen Grundrisses auf den Mittelpunkt des Zielrechtecks legen
  const cx = ox + W / 2, cz = oz + D / 2;
  for (const [farbe, gs] of T.teile) for (const g of gs) { g.translate(-b / 2, 0, -t / 2); g.rotateY(th); g.translate(cx, 0, cz); S.add(g, farbe); }
  const inner = new THREE.Group(); inner.position.set(-b / 2, 0, -t / 2); inner.add(grp);
  const outer = new THREE.Group(); outer.rotation.y = th; outer.position.set(cx, 0, cz); outer.add(inner); scene.add(outer);
  return erg;
}

// =====================================================================================
// 3. Kurstadt: Kurhaus, Kolonnaden, Wandelhalle, Brunnentempel, Villen (Wiesbaden-Typ)
// =====================================================================================
const KUR_PUTZ = ['#f1e9d8', '#efe4cc', '#ece6da', '#f3ecdc'];
/** Klassizistischer Flügel mit Rundbogenfenstern, Pilastern und Attika. */
function kurFluegel(S, scene, p, x0, z0, b, t, H, o) {
  const { wand, orn } = o;
  S.quader(x0, 0, z0, x0 + b, H, z0 + t, wand);
  for (const [k, F] of seiten(p, x0, z0, b, t)) {
    const ax = achsen(0, F.L, o.ra ?? 4.0, 1.2), L = [];
    for (const u of ax) { L.push({ u0: u - 0.9, u1: u + 0.9, v0: 1.6, v1: H * 0.5, bogen: true }); L.push({ u0: u - 0.7, u1: u + 0.7, v0: H * 0.5 + 1.4, v1: H - 2.4 }); }
    lochwand(S, F, 0, F.L, 0.3, H - 1.6, wand, L, { dick: 0.25 });
    fb(S, F, -0.1, F.L + 0.1, 0.3, 1.3, 0, 0.4, dunkler(wand, 0.1));
    fb(S, F, -0.1, F.L + 0.1, H * 0.5 + 0.4, H * 0.5 + 0.8, 0, 0.45, orn);
    for (const u of ax) { fb(S, F, u - 2.0 - 0.3, u - 2.0 + 0.3, 1.3, H - 1.6, 0, 0.4, orn); fb(S, F, u - 1.1, u + 1.1, H * 0.5 + 1.2, H * 0.5 + 1.4, 0.25, 0.4, orn); }
    fb(S, F, -0.4, F.L + 0.4, H - 1.6, H - 0.9, 0, 0.7, orn);
    fb(S, F, -0.2, F.L + 0.2, H - 0.9, H + 0.6, -0.2, 0.15, wand);
    for (const u of achsen(0, F.L, 1.0, 0.4)) fb(S, F, u - 0.12, u + 0.12, H - 0.9, H + 0.3, 0.1, 0.3, orn);
  }
  S.quader(x0 + 0.5, H, z0 + 0.5, x0 + b - 0.5, H + 0.25, z0 + t - 0.5, '#a9a59c');
  if (o.dach) walm(S, x0 + 1, z0 + 1, x0 + b - 1, z0 + t - 1, H + 0.25, o.dach, SCHIEFER);
}
function kolonnade(S, scene, p, r, x0, z0, b, t, seite, o) {
  // seite: Richtung der Säulenfront ('+x' oder '-x'), Kolonnade läuft entlang z
  const H = 7.5, wand = o.wand, orn = o.orn;
  const xw = seite === '+x' ? x0 : x0 + b - 2.5;
  S.quader(xw, 0, z0, xw + 2.5, H, z0 + t, wand);
  S.quader(x0 - 0.3, H, z0 - 0.3, x0 + b + 0.3, H + 1.2, z0 + t + 0.3, orn);
  S.quader(x0, 0.3, z0, x0 + b, 0.5, z0 + t, '#9a9282');
  const xs = seite === '+x' ? x0 + b - 0.9 : x0 + 0.9;
  // Schattenfuge unter dem Gebälk: dunkle Unterseite und Laibung zur Säulenreihe
  S.quader(seite === '+x' ? xw + 2.5 : x0, H - 0.6, z0 + 0.3, seite === '+x' ? x0 + b - 0.2 : xw, H - 0.05, z0 + t - 0.3, '#8f8778');
  const n = Math.max(3, Math.round(t / 3.6));
  for (let i = 0; i <= n; i++) saeule(S, xs, 0.5, z0 + 0.9 + (i * (t - 1.8)) / n, H - 0.5, 0.42, WEISS, orn);
  // Läden/Schaufenster in der Rückwand
  const FR = vierSeiten(xw, z0, 2.5, t)[seite];
  if (sichtF(p, FR)) {
    const L = achsen(0, t, 3.6, 0.5).map((u) => ({ u0: u - 1.2, u1: u + 1.2, v0: 0.5, v1: 4.6, bogen: true }));
    lochwand(S, FR, 0, t, 0.3, H, '#8a826f', L, { glas: '#3e4850', dick: 0.2 });
    for (const l of L) fb(S, FR, l.u0 - 0.2, l.u1 + 0.2, 0.3, 0.6, 0, 0.3, '#857d6e');
    for (const u of achsen(0, t, 3.6, 0.5)) { const [lx, lz] = wp(FR, u + 1.8, 1.3); S.box(0.3, 0.5, 0.3, lx, H - 1.2, lz, '#f1ead2'); }
  }
  const FA = vierSeiten(xw, z0, 2.5, t)[seite === '+x' ? '-x' : '+x'];
  if (sichtF(p, FA)) for (const u of achsen(0, t, 3.6, 0.5)) fenster(S, FA, u, 2.2, 1.2, 2.4, { rahmen: orn });
  for (const [k, F] of seiten(p, x0, z0, b, t, ['+z', '-z'])) fb(S, F, 0, F.L, H, H + 1.2, 0.3, 0.45, orn);
}
function blumenbeet(S, r, x0, z0, x1, z1) {
  boden(S, x0, z0, x1, z1, '#7fae5a', 0.36, 0.08);
  const f = waehle(r, ['#e05a5a', '#e8c547', '#c86ab0', '#f2efe6', '#e88a3c']);
  boden(S, x0 + 0.5, z0 + 0.5, x1 - 0.5, z1 - 0.5, f, 0.36, 0.14);
}
function brunnenTempel(S, x, z, rr, o) {
  zyl(S, rr + 1.6, rr + 1.8, 0.5, x, 0.3, z, '#d8d0c0', 16);
  zyl(S, rr + 1.0, rr + 1.2, 0.5, x, 0.8, z, '#e2dccf', 16);
  for (let i = 0; i < 8; i++) { const w = (i / 8) * 2 * PI; saeule(S, x + Math.cos(w) * rr, 1.3, z + Math.sin(w) * rr, 6, 0.32, WEISS, o.orn); }
  zyl(S, rr + 0.6, rr + 0.6, 1.0, x, 7.3, z, o.orn, 16);
  const g = new THREE.SphereGeometry(rr + 0.5, 16, 6, 0, 2 * PI, 0, PI / 2); g.scale(1, 0.6, 1); g.translate(x, 8.3, z); S.add(g, KUPFER);
  zyl(S, 0.15, 0.3, 1.2, x, 8.3 + (rr + 0.5) * 0.6, z, '#d8b45a', 6);
  zyl(S, rr * 0.55, rr * 0.6, 1.0, x, 1.3, z, '#cfc6b4', 12);
  zyl(S, rr * 0.45, rr * 0.45, 1.02, x, 1.32, z, FARBEN.wasser, 12);
  return 11;
}
/** Gründerzeitvilla mit Eckturm, Risalit, Veranda. Lokal [x0, x0+b] × [z0, z0+t], Front +z. */
function villa(S, scene, p, r, x0, z0, b, t, o = {}) {
  const wand = o.wand ?? waehle(r, ['#f1e6cf', '#ead7c0', '#e9e2d4', '#f0dcc8', '#e2d9c3', '#dfe3e0']), orn = o.orn ?? WEISS, stein = waehle(r, ['#c9b292', '#d4c1a3', '#b9a283']);
  const gh = 3.8, n = 2, H = 1.2 + n * gh, dach = waehle(r, [SCHIEFER, '#5d646b']);
  S.quader(x0, 0, z0, x0 + b, 1.2, z0 + t, stein);
  S.quader(x0 + 0.1, 1.2, z0 + 0.1, x0 + b - 0.1, H, z0 + t - 0.1, wand);
  const risB = Math.min(5.5, b * 0.35), risU = waehle(r, [b * 0.62, b * 0.38]);
  for (const [k, F] of seiten(p, x0, z0, b, t)) {
    for (let kk = 0; kk < n; kk++) for (const u of achsen(0, F.L, 2.8, 0.9)) {
      if (k === '+z' && Math.abs(u - risU) < risB / 2 + 0.6) continue;
      const y = 1.2 + kk * gh + 0.9;
      fenster(S, F, u, y, 1.05, 2.1, { kreuz: true, rahmen: orn, sims: orn });
      if (kk === 0) dreiecksgiebel(S, F, u - 0.8, u + 0.8, y + 2.35, 0.5, 0, 0.14, orn, orn);
      else fb(S, F, u - 0.75, u + 0.75, y + 2.3, y + 2.55, 0, 0.2, orn);
    }
    fb(S, F, -0.1, F.L + 0.1, 1.2 + gh - 0.15, 1.2 + gh + 0.15, 0, 0.25, orn);
    fb(S, F, -0.3, F.L + 0.3, H - 0.5, H, 0, 0.55, orn);
    // Eckquaderung
    for (let y = 1.4; y < H - 0.6; y += 0.9) for (const u of [0.35, F.L - 0.35]) fb(S, F, u - (y % 1.8 < 0.9 ? 0.55 : 0.35), u + (y % 1.8 < 0.9 ? 0.55 : 0.35), y, y + 0.6, 0, 0.12, stein);
  }
  walm(S, x0 - 0.3, z0 - 0.3, x0 + b + 0.3, z0 + t + 0.3, H, Math.min(b, t) * 0.38, dach);
  // Mittelrisalit mit Giebel nach vorn
  const rx0 = x0 + risU - risB / 2;
  S.quader(rx0, 1.2, z0 + t - 1, rx0 + risB, H + 0.5, z0 + t + 1.2, wand);
  for (const [k, F] of seiten(p, rx0, z0 + t - 1, risB, 2.2, ['+z'])) {
    fenster(S, F, risB / 2, 2.0, 1.6, 2.4, { kreuz: true, rahmen: orn });
    fb(S, F, 0.4, risB - 0.4, 1.2 + gh - 0.1, 1.2 + gh + 0.25, 0, 1.1, orn);
    for (let u = 0.6; u < risB - 0.5; u += 0.35) fb(S, F, u - 0.05, u + 0.05, 1.2 + gh + 0.25, 1.2 + gh + 1.1, 0.95, 1.05, '#3b3f44');
    fb(S, F, 0.4, risB - 0.4, 1.2 + gh + 1.05, 1.2 + gh + 1.15, 0.9, 1.1, '#3b3f44');
    fenster(S, F, risB / 2, 1.2 + gh + 0.9, 1.2, 2.1, { kreuz: true, rahmen: orn });
    dreiecksgiebel(S, F, -0.2, risB + 0.2, H + 0.5, 2.6, -1.5, 0.12, wand, orn);
    fscheibe(S, F, risB / 2, H + 1.5, 0.12, 0.2, 0.5, GLAS);
  }
  const gd = dachProfil(3.0, risB + 0.4, 2.6, 0.05, 'z'); gd.translate(rx0 + risB / 2, H + 0.5, z0 + t - 0.6); S.add(gd, dach);
  // Eckturm
  const ts = 4.2, tx0 = o.turmLinks ? x0 - 1.2 : x0 + b - ts + 1.2, tz0 = z0 + t - ts + 1.2, Ht = H + 4.2;
  S.quader(tx0, 0, tz0, tx0 + ts, Ht, tz0 + ts, wand);
  for (const [k, F] of seiten(p, tx0, tz0, ts, ts)) {
    for (let kk = 0; kk < n; kk++) fenster(S, F, ts / 2, 1.2 + kk * gh + 0.9, 1.0, 2.1, { kreuz: true, rahmen: orn, sims: orn });
    fwand(S, F, 0, ts, H, Ht - 0.6, 0, 0.1, wand, [{ u0: ts / 2 - 0.9, u1: ts / 2 - 0.15, v0: H + 0.6, v1: Ht - 1.0, bogen: true }, { u0: ts / 2 + 0.15, u1: ts / 2 + 0.9, v0: H + 0.6, v1: Ht - 1.0, bogen: true }]);
    fb(S, F, ts / 2 - 1, ts / 2 + 1, H + 0.6, Ht - 1.0, -0.2, -0.1, GLAS);
    fb(S, F, -0.3, ts + 0.3, Ht - 0.6, Ht, 0, 0.4, orn);
  }
  const helm = waehle(r, ['spitz', 'zwiebel', 'pyramide']);
  if (helm === 'zwiebel') { const g = new THREE.SphereGeometry(ts * 0.52, 10, 8); g.scale(1, 1.15, 1); g.translate(tx0 + ts / 2, Ht + 1.5, tz0 + ts / 2); S.add(g, KUPFER); const k = new THREE.ConeGeometry(0.5, 3, 8); k.translate(tx0 + ts / 2, Ht + 4.6, tz0 + ts / 2); S.add(k, KUPFER); }
  else { const g = new THREE.ConeGeometry(ts * 0.75, helm === 'spitz' ? 7 : 3.6, 4); g.rotateY(PI / 4); g.translate(tx0 + ts / 2, Ht + (helm === 'spitz' ? 3.5 : 1.8), tz0 + ts / 2); S.add(g, dach); }
  zyl(S, 0.04, 0.1, 1.6, tx0 + ts / 2, Ht + (helm === 'spitz' ? 7 : 5.5), tz0 + ts / 2, '#d8b45a', 4);
  // Veranda / Wintergarten seitlich
  const vx0 = o.turmLinks ? x0 + b : x0 - 3.6;
  S.quader(vx0, 0.3, z0 + 2, vx0 + 3.6, 1.0, z0 + t - 3, stein);
  S.quader(vx0 + 0.2, 1.0, z0 + 2.2, vx0 + 3.4, 4.0, z0 + t - 3.2, GLAS_HELL);
  for (const [k, F] of seiten(p, vx0 + 0.2, z0 + 2.2, 3.2, t - 5.4)) for (const u of achsen(0, F.L, 1.0, 0)) fb(S, F, u - 0.06, u + 0.06, 1.0, 4.0, 0, 0.08, WEISS);
  S.quader(vx0, 4.0, z0 + 2, vx0 + 3.6, 4.3, z0 + t - 3, WEISS);
  return Ht + 7;
}
function zaun(S, p, x0, z0, x1, z1, farbe = '#3b3f44') {
  // Gartenmauer mit Gitter, nur entlang sichtbarer Kanten
  for (const [k, F] of seiten(p, x0, z0, x1 - x0, z1 - z0)) {
    fb(S, F, 0, F.L, 0.3, 0.9, -0.3, 0, '#d8d0c0');
    for (let u = 0.3; u < F.L; u += 0.6) fb(S, F, u - 0.03, u + 0.03, 0.9, 2.0, -0.18, -0.12, farbe);
    fb(S, F, 0, F.L, 1.9, 2.0, -0.2, -0.1, farbe);
    for (const u of achsen(0, F.L, 6, 0)) fb(S, F, u - 0.3, u + 0.3, 0.3, 2.2, -0.45, 0.15, '#e2dccf');
  }
}
function kurstadtRoh(S, scene, p) {
  const r = rng(`kur:${p.seed}`), v = p.variante, { x: x0, z: z0, w, d } = p;
  const wand = waehle(r, KUR_PUTZ), orn = WEISS;
  boden(S, x0, z0, x0 + w, z0 + d, KIES, 0.3, 0.07);
  if (v === 'kurhaus') {
    const mb = 34, md = 22, mz0 = z0 + 4, cx = x0 + w / 2, Hm = 17, fbw = Math.min(26, (w - mb - 6) / 2), fd = 17, Hf = 12.5;
    // Flügel
    for (const s of [-1, 1]) kurFluegel(S, scene, p, s < 0 ? cx - mb / 2 - fbw : cx + mb / 2, mz0 + 2, fbw, fd, Hf, { wand, orn, ra: 4.2 });
    // Mittelbau mit Kuppel
    kurFluegel(S, scene, p, cx - mb / 2, mz0, mb, md, Hm, { wand, orn, ra: 4.6 });
    const hk = kuppel(S, cx, Hm + 0.25, mz0 + md / 2, 9, { tambour: 3.5, wand, orn, hoch: 0.6 });
    // Portikus mit sechs Säulen und Attika-Inschrift
    const pt = 7, FP = R(cx - 13, mz0 + md + pt, 1, 0, 26);
    S.quader(cx - 14, 0.3, mz0 + md, cx + 14, 1.4, mz0 + md + pt + 1.5, '#e2dccf');
    for (let i = 0; i < 4; i++) S.quader(cx - 13 + i * 0.4 - 0.2, 0.3, mz0 + md + pt + 1.5 + i * 0.6, cx + 13 - i * 0.4 + 0.2, 1.4 - i * 0.28, mz0 + md + pt + 2.1 + i * 0.6, '#e2dccf');
    saeulenreihe(S, FP, 0.8, 25.2, 6, 1.4, Hm - 4.2, -1.0, 0.68, WEISS, orn);
    S.quader(cx - 13.5, Hm - 2.8, mz0 + md - 0.5, cx + 13.5, Hm - 2.0, mz0 + md + pt + 0.2, orn);
    S.quader(cx - 13.5, Hm - 2.0, mz0 + md - 0.5, cx + 13.5, Hm + 1.6, mz0 + md + pt, wand);
    S.quader(cx - 13.8, Hm + 1.6, mz0 + md - 0.5, cx + 13.8, Hm + 2.1, mz0 + md + pt + 0.3, orn);
    if (sichtF(p, FP)) ftext(scene, FP, 'KURHAUS', 13, Hm - 0.2, 0.04, 2.2, 18, '#7a6a4a');
    for (const u of [2, 13, 24]) { const [sx, sz] = wp(FP, u, -0.8); zyl(S, 0.4, 0.5, 2.4, sx, Hm + 2.1, sz, WEISS, 8); S.add(new THREE.SphereGeometry(0.42, 8, 6).translate(sx, Hm + 4.9, sz), WEISS); }
    // Kolonnaden links und rechts
    const kz0 = mz0 + md + 4, kt = d - (kz0 - z0) - 4, kb = 8;
    kolonnade(S, scene, p, r, x0 + 3, kz0, kb, kt, '+x', { wand, orn });
    kolonnade(S, scene, p, r, x0 + w - 3 - kb, kz0, kb, kt, '-x', { wand, orn });
    // Kurpark: Rasenparterre mit Wegekreuz, Bassin mit Fontäne in der Kreuzung, je Feld Rundbeet und Baumgruppe,
    // Bänke an den Wegen, Musikpavillon im vorderen rechten Feld (keine ungegliederte Rasenfläche über 26 m)
    const gx0 = x0 + 3 + kb + 4, gx1 = x0 + w - 3 - kb - 4, gz0 = kz0 + 9, gz1 = z0 + d - 3;
    const mx = (gx0 + gx1) / 2, mz = (gz0 + gz1) / 2, wb = 3.6;
    boden(S, gx0, gz0, gx1, gz1, RASEN, 0.3, 0.08);
    // Wege: Mittelachse, Querachse, Umgang
    boden(S, mx - wb / 2, gz0, mx + wb / 2, gz1, WEG, 0.3, 0.1);
    boden(S, gx0, mz - wb / 2, gx1, mz + wb / 2, WEG, 0.3, 0.1);
    for (const [a0, a1, b0, b1] of [[gx0, gx1, gz0, gz0 + 2.4], [gx0, gx1, gz1 - 2.4, gz1], [gx0, gx0 + 2.4, gz0, gz1], [gx1 - 2.4, gx1, gz0, gz1]]) boden(S, a0, b0, a1, b1, WEG, 0.3, 0.1);
    // Bassin in der Wegekreuzung
    const rb = Math.min(6.5, (gz1 - gz0) * 0.2);
    zyl(S, rb + 1.4, rb + 1.4, 0.12, mx, 0.4, mz, WEG, 28);
    zyl(S, rb + 0.5, rb + 0.5, 0.55, mx, 0.4, mz, '#e2dccf', 28); zyl(S, rb, rb, 0.57, mx, 0.42, mz, FARBEN.wasser, 28);
    zyl(S, 0.9, 1.1, 1.2, mx, 0.9, mz, '#e2dccf', 12);
    for (let i = 0; i < 9; i++) { const a = (i / 8) * 2 * PI, rr = i ? rb * 0.55 : 0; zyl(S, 0.1, 0.35, i ? 2.6 : 7, mx + Math.cos(a) * rr, i ? 0.9 : 2.1, mz + Math.sin(a) * rr, '#e3f3f5', 6); }
    // vier Felder
    const felder = [[gx0 + 2.4, mx - wb / 2, gz0 + 2.4, mz - wb / 2], [mx + wb / 2, gx1 - 2.4, gz0 + 2.4, mz - wb / 2], [gx0 + 2.4, mx - wb / 2, mz + wb / 2, gz1 - 2.4], [mx + wb / 2, gx1 - 2.4, mz + wb / 2, gz1 - 2.4]];
    felder.forEach(([a0, a1, b0, b1], i) => {
      boden(S, a0 + 1.2, b0 + 1.2, a1 - 1.2, b1 - 1.2, RASEN2, 0.3, 0.1);
      const fx = (a0 + a1) / 2, fz = (b0 + b1) / 2, aussen = i % 2 ? a1 - 4 : a0 + 4, tief = i < 2 ? b0 + 4 : b1 - 4;
      if (i === 3) {
        // Musikpavillon: achteckiger Sockel, acht Säulen, Kupferdach
        const px = fx + (a1 - a0) * 0.12, pz = fz;
        zyl(S, 4.2, 4.4, 0.9, px, 0.3, pz, '#e2dccf', 8);
        for (let k = 0; k < 8; k++) { const a = (k / 8) * 2 * PI + PI / 8; zyl(S, 0.16, 0.18, 3.2, px + Math.cos(a) * 3.6, 1.2, pz + Math.sin(a) * 3.6, WEISS, 6); }
        zyl(S, 4.1, 4.1, 0.45, px, 4.4, pz, WEISS, 8);
        const g = new THREE.ConeGeometry(4.6, 2.6, 8, 1); g.rotateY(PI / 8); g.translate(px, 4.85 + 1.3, pz); S.add(g, KUPFER);
        zyl(S, 0.05, 0.12, 1.2, px, 7.4, pz, '#c9a24a', 6);
        for (const db of [-6.5, 6.5]) bank(S, px + db, pz + 5.2);
      } else {
        // Rundbeet mit Blumenring
        zyl(S, 3.2, 3.2, 0.12, fx, 0.36, fz, '#7fae5a', 20);
        zyl(S, 2.4, 2.4, 0.18, fx, 0.36, fz, waehle(r, ['#e05a5a', '#e8c547', '#c86ab0', '#e88a3c']), 20);
        zyl(S, 1.2, 1.2, 0.22, fx, 0.36, fz, '#f2efe6', 16);
      }
      // Baumgruppe an der Außenecke des Felds
      for (const [dx, dz] of [[0, 0], [i % 2 ? -3.2 : 3.2, 0.6], [0.8, i < 2 ? 3.0 : -3.0]]) baum(S, aussen + dx, tief + dz, r, zw(r, 0.85, 1.1));
      // schmale Beete an den Wegkanten
      blumenbeet(S, r, i % 2 ? a0 + 0.4 : a1 - 1.6, b0 + 2, i % 2 ? a0 + 1.6 : a1 - 0.4, b1 - 2);
    });
    // Bänke an der Mittelachse und Querachse
    for (const z of [gz0 + 6, gz1 - 6]) for (const sx of [-1, 1]) bank(S, mx + sx * (wb / 2 + 0.5), z, true);
    for (const x of [gx0 + 7, gx1 - 7]) for (const sz of [-1, 1]) bank(S, x, mz + sz * (wb / 2 + 0.5));
    for (let x = gx0; x <= gx1; x += (gx1 - gx0) / 5) baum(S, x, gz0 - 4, r, 0.9);
    autoReihe(S, r, cx - 12, cx + 12, gz0 - 1.6, 0, 0.5);
    return { hoehe: hk };
  }
  if (v === 'wandelhalle') {
    // Wandelhalle hinten, Mittelpavillon, Brunnentempel vorn links, Musikpavillon rechts
    const hz0 = z0 + 4, ht = 12, hb = w - 10, hx0 = x0 + 5, H = 9.5;
    S.quader(hx0, 0, hz0, hx0 + hb, H, hz0 + ht, wand);
    for (const [k, F] of seiten(p, hx0, hz0, hb, ht)) {
      const L = achsen(0, F.L, 4.2, 1.0).map((u) => ({ u0: u - 1.5, u1: u + 1.5, v0: 1.2, v1: H - 1.6, bogen: true }));
      lochwand(S, F, 0, F.L, 0.3, H - 0.9, wand, L, { glas: GLAS_HELL, dick: 0.3 });
      for (const l of L) { fb(S, F, (l.u0 + l.u1) / 2 - 0.06, (l.u0 + l.u1) / 2 + 0.06, 1.2, H - 2.6, 0.02, 0.1, WEISS); fb(S, F, l.u0, l.u1, 5.0, 5.12, 0.02, 0.1, WEISS); }
      for (const l of L) fb(S, F, l.u1 + 0.2, l.u1 + 0.65, 0.3, H - 0.9, 0, 0.45, orn);
      fb(S, F, -0.3, F.L + 0.3, H - 0.9, H, 0, 0.6, orn);
    }
    const gd = dachProfil(hb, ht, 3.2, 1.0, 'x'); gd.translate(hx0 + hb / 2, H, hz0 + ht / 2); S.add(gd, KUPFER);
    S.quader(hx0 + 2, H + 3.2, hz0 + ht / 2 - 0.5, hx0 + hb - 2, H + 3.9, hz0 + ht / 2 + 0.5, GLAS_HELL);
    const cx = hx0 + hb / 2, pb = 14;
    S.quader(cx - pb / 2, 0, hz0 - 1, cx + pb / 2, H + 4, hz0 + ht + 1.5, wand);
    for (const [k, F] of seiten(p, cx - pb / 2, hz0 - 1, pb, ht + 2.5)) {
      lochwand(S, F, 0, F.L, 0.3, H + 3, wand, [{ u0: F.L / 2 - 3, u1: F.L / 2 + 3, v0: 0.3, v1: H + 1.5, bogen: true }], { glas: GLAS_HELL });
      for (let u = F.L / 2 - 2.4; u < F.L / 2 + 2.5; u += 1.2) fb(S, F, u - 0.05, u + 0.05, 0.3, H + 0.5, 0.02, 0.1, WEISS);
      fb(S, F, -0.4, F.L + 0.4, H + 3, H + 4, 0, 0.6, orn);
      for (const u of [0.6, F.L - 0.6]) fb(S, F, u - 0.6, u + 0.6, 0.3, H + 3, 0, 0.5, orn);
    }
    const hk = kuppel(S, cx, H + 4, hz0 + ht / 2 + 0.25, 6, { tambour: 2, wand, orn, hoch: 0.9 });
    const tx = x0 + w * 0.25, tz = z0 + d - 12;
    brunnenTempel(S, tx, tz, 3.6, { orn });
    // Musikpavillon
    const mx = x0 + w * 0.75, mz = z0 + d - 12;
    zyl(S, 5, 5.2, 1.2, mx, 0.3, mz, '#d8d0c0', 8);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI; S.box(0.25, 4.2, 0.25, mx + Math.cos(a) * 4.5, 3.6, mz + Math.sin(a) * 4.5, '#e9e6de'); }
    const g = new THREE.ConeGeometry(6, 3.2, 8); g.translate(mx, 7.3, mz); S.add(g, '#5f8f78');
    zyl(S, 0.1, 0.3, 1.5, mx, 8.8, mz, '#d8b45a', 6);
    for (let i = 0; i < 12; i++) S.box(1.5, 0.6, 0.5, mx - 5 + (i % 4) * 2.2, 0.6, mz + 7 + Math.floor(i / 4) * 1.4, '#3f6f5a');
    // Park
    boden(S, x0 + 3, hz0 + ht + 6, x0 + w - 3, z0 + d - 3, RASEN, 0.3, 0.08);
    boden(S, cx - 2, hz0 + ht + 1, cx + 2, z0 + d, KIES, 0.3, 0.11);
    // Wegekreuz, Umgang und Rundbeete gliedern den Rasen (keine leere Fläche über 26 m)
    const pz0 = hz0 + ht + 6, pz1 = z0 + d - 3, pzm = (pz0 + pz1) / 2;
    boden(S, x0 + 3, pzm - 1.4, x0 + w - 3, pzm + 1.4, KIES, 0.3, 0.11);
    boden(S, x0 + 3, pz0, x0 + w - 3, pz0 + 2, KIES, 0.3, 0.11);
    for (const xs of [x0 + 3, x0 + w - 5]) boden(S, xs, pz0, xs + 2, pz1, KIES, 0.3, 0.11);
    for (const fx of [(x0 + 5 + cx - 2) / 2, (cx + 2 + x0 + w - 5) / 2]) for (const fz of [(pz0 + 2 + pzm - 1.4) / 2, (pzm + 1.4 + pz1) / 2]) {
      if (Math.hypot(fx - tx, fz - tz) < 9 || Math.hypot(fx - mx, fz - mz) < 11) { blumenbeet(S, r, fx - 5, fz - 0.8, fx + 5, fz + 0.8); continue; }
      zyl(S, 3.4, 3.4, 0.12, fx, 0.36, fz, '#7fae5a', 20); zyl(S, 2.5, 2.5, 0.18, fx, 0.36, fz, waehle(r, ['#e05a5a', '#e8c547', '#c86ab0', '#e88a3c']), 20); zyl(S, 1.1, 1.1, 0.22, fx, 0.36, fz, '#f2efe6', 16);
    }
    for (const xs of [x0 + 6, cx - 7, cx + 7, x0 + w - 6]) bank(S, xs, pzm + 2.0);
    for (let i = 0; i < 10; i++) { const bx = zw(r, x0 + 5, x0 + w - 5), bz = zw(r, hz0 + ht + 8, z0 + d - 5); if (Math.hypot(bx - tx, bz - tz) > 8 && Math.hypot(bx - mx, bz - mz) > 10 && Math.abs(bx - cx) > 4) baum(S, bx, bz, r, zw(r, 1.0, 1.35)); }
    for (let i = 0; i < 4; i++) bank(S, cx + (i % 2 ? 3 : -3), hz0 + ht + 5 + i * 4, true);
    return { hoehe: hk };
  }
  // Villen der Gründerzeit in Gärten
  boden(S, x0, z0, x0 + w, z0 + d, RASEN, 0.3, 0.08);
  const n = w > 60 ? 3 : 2, bb = (w - 4) / n;
  let hmax = 0;
  for (let i = 0; i < n; i++) {
    const gx0 = x0 + 2 + i * bb, vb = Math.min(15, bb - 9), vt = Math.min(13, d - 18);
    const vx = gx0 + (bb - vb) / 2 + (i % 2 ? 1.5 : -0.5), vz = z0 + 5;
    hmax = Math.max(hmax, villa(S, scene, p, r, vx, vz, vb, vt, { turmLinks: i % 2 === 1 }));
    boden(S, vx + vb / 2 - 1.5, vz + vt + 1.2, vx + vb / 2 + 1.5, z0 + d - 1, KIES, 0.3, 0.1);
    zaun(S, p, gx0 + 0.5, z0 + 1, gx0 + bb - 0.5, z0 + d - 1);
    for (let k = 0; k < 4; k++) { const tx = gx0 + (k % 2 ? bb - 3 : 3), tz = z0 + d - 6 - Math.floor(k / 2) * (d * 0.5); baum(S, tx, tz, r, zw(r, 1.1, 1.5)); }
    for (let k = 0; k < 3; k++) busch(S, gx0 + zw(r, 2, bb - 2), z0 + d - zw(r, 2.5, 5), r, 1.1);
  }
  return { hoehe: hmax };
}

// =====================================================================================
// 4. Romanischer Dom aus rotem Sandstein (Mainz/Worms/Speyer-Typ, eigenständig)
// =====================================================================================
/** Rundbogenfries knapp unter y entlang eines Rahmens. */
function bogenfries(S, F, u0, u1, y, c, b = 0.9) {
  const n = Math.max(1, Math.round((u1 - u0) / b)), bb = (u1 - u0) / n, L = [];
  for (let i = 0; i < n; i++) L.push({ u0: u0 + i * bb + 0.1, u1: u0 + (i + 1) * bb - 0.1, v0: y - 0.75, v1: y - 0.12, bogen: true });
  fwand(S, F, u0, u1, y - 0.65, y, 0, 0.18, c, L);
}
/** Zwerggalerie: dunkle Laibung, Arkade mit kleinen Bögen. */
function zwerggalerie(S, F, u0, u1, y0, h, c) {
  fb(S, F, u0, u1, y0, y0 + h, -0.4, 0.02, '#3d3532');
  const n = Math.max(2, Math.round((u1 - u0) / 1.1)), bb = (u1 - u0) / n, L = [];
  for (let i = 0; i < n; i++) L.push({ u0: u0 + i * bb + 0.15, u1: u0 + (i + 1) * bb - 0.15, v0: y0 + 0.4, v1: y0 + h - 0.3, bogen: true });
  fwand(S, F, u0, u1, y0, y0 + h, 0, 0.25, c, L);
  fb(S, F, u0 - 0.1, u1 + 0.1, y0, y0 + 0.4, 0, 0.45, heller(c, 0.05));
}
/** Romanische Wand: Lisenen, Rundbogenfenster, Fries. */
function romWand(S, F, u0, u1, y0, y1, c, o = {}) {
  const ax = achsen(u0, u1, o.ra ?? 4.5, 0.8), L = [];
  for (const u of ax) L.push({ u0: u - (o.fw ?? 0.8), u1: u + (o.fw ?? 0.8), v0: y0 + (o.fy ?? (y1 - y0) * 0.35), v1: y1 - (o.oben ?? 1.6), bogen: true });
  lochwand(S, F, u0, u1, y0, y1, c, L, { glas: '#3d3a3c', dick: 0.4 });
  for (let i = 0; i <= ax.length; i++) { const u = i === 0 ? u0 + 0.3 : i === ax.length ? u1 - 0.3 : (ax[i - 1] + ax[i]) / 2; fb(S, F, u - 0.35, u + 0.35, y0, y1 - 0.65, 0.4, 0.65, dunkler(c, 0.03)); }
  bogenfries(S, teil(F, 0, F.L, 0.4), u0, u1, y1, dunkler(c, 0.03));
  fb(S, F, u0 - 0.2, u1 + 0.2, y1 - 0.05, y1 + 0.35, 0, 0.75, heller(c, 0.06));
}
/** Romanischer Turm: quadratisch mit Schallarkaden oder rund mit Ringfriesen. Helm: 'raute' | 'pyramide' | 'kegel' | 'stufen'. */
function romTurm(S, p, cx, cz, a, H, o) {
  const c = o.stein, hell = heller(c, 0.06), dach = o.dach;
  const x0 = cx - a / 2, z0 = cz - a / 2;
  if (o.rund) {
    zyl(S, a / 2, a / 2, H, cx, 0, cz, c, 16);
    for (let y = H * 0.25; y < H - 1; y += H * 0.18) zyl(S, a / 2 + 0.15, a / 2 + 0.15, 0.45, cx, y, cz, hell, 16);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 6; i++) { const w = (i / 6) * 2 * PI + k * 0.5; if (sieht(p, Math.cos(w), Math.sin(w))) S.box(0.12, 1.3, 0.6, cx + Math.cos(w) * (a / 2 + 0.02), H * (0.33 + k * 0.18), cz + Math.sin(w) * (a / 2 + 0.02), '#3d3a3c', -w); }
    const g = new THREE.ConeGeometry(a / 2 + 0.4, a * 1.8, 16); g.translate(cx, H + a * 0.9, cz); S.add(g, dach);
    zyl(S, 0.04, 0.1, 1.6, cx, H + a * 1.8, cz, '#d8b45a', 4);
    return H + a * 1.8 + 1.6;
  }
  if (o.acht) {
    zyl(S, a / 2, a / 2, H, cx, 0, cz, c, 8);
    zyl(S, a / 2 + 0.2, a / 2 + 0.2, 0.5, cx, H - 0.5, cz, hell, 8);
    for (let i = 0; i < 8; i++) {
      const w = (i / 8) * 2 * PI + PI / 8, nx = Math.cos(w), nz = Math.sin(w);
      if (!sieht(p, nx, nz)) continue;
      const sl = a * Math.tan(PI / 8), rr = (a / 2) * Math.cos(PI / 8);
      const F = R(cx + nx * rr + nz * sl / 2, cz + nz * rr - nx * sl / 2, -nz, nx, sl);
      lochwand(S, F, 0.2, sl - 0.2, o.y0 ?? H - 6, H - 0.6, c, [{ u0: sl / 2 - 0.9, u1: sl / 2 - 0.1, v0: H - 4.6, v1: H - 1.4, bogen: true }, { u0: sl / 2 + 0.1, u1: sl / 2 + 0.9, v0: H - 4.6, v1: H - 1.4, bogen: true }], { glas: '#3d3a3c', dick: 0.25 });
    }
    const g = new THREE.ConeGeometry(a / 2 + 0.5, o.helmH ?? a * 0.9, 8); g.rotateY(PI / 8); g.translate(cx, H + (o.helmH ?? a * 0.9) / 2, cz); S.add(g, dach);
    zyl(S, 0.05, 0.12, 2, cx, H + (o.helmH ?? a * 0.9), cz, '#d8b45a', 4);
    return H + (o.helmH ?? a * 0.9) + 2;
  }
  S.quader(x0, 0, z0, x0 + a, H, z0 + a, c);
  const geschosse = o.geschosse ?? 5, gh = (H - 4) / geschosse;
  for (const [k, F] of seiten(p, x0, z0, a, a)) {
    fb(S, F, -0.05, 0.6, 0, H, 0, 0.3, dunkler(c, 0.03)); fb(S, F, a - 0.6, a + 0.05, 0, H, 0, 0.3, dunkler(c, 0.03));
    for (let i = 1; i <= geschosse; i++) bogenfries(S, teil(F, 0.6, a - 0.6, 0.1), 0, a - 1.2, 4 + i * gh, hell, 0.8);
    const L = [];
    for (let i = 1; i < geschosse; i++) {
      const y = 4 + i * gh, oben = i >= geschosse - 2;
      const m = oben ? 2 : 1;
      for (let j = 0; j < m; j++) { const u = m === 1 ? a / 2 : a / 2 + (j - 0.5) * (a * 0.38); L.push({ u0: u - (oben ? 0.7 : 0.35), u1: u + (oben ? 0.7 : 0.35), v0: y + 0.6, v1: y + gh - 1.0, bogen: true }); }
    }
    lochwand(S, teil(F, 0.6, a - 0.6), 0, a - 1.2, 4, H - 0.8, c, L.map((l) => ({ ...l, u0: l.u0 - 0.6, u1: l.u1 - 0.6 })), { glas: '#3d3a3c', dick: 0.2 });
    if (o.giebel) { fpoly(S, F, [[0, H], [a, H], [a / 2, H + a * 0.55]], -a + 0.01, 0, c); }
  }
  const helm = o.helm ?? 'raute';
  if (helm === 'raute') {
    // Rautendach: vier Giebel mit über Eck gestellter Pyramide
    for (const [k, F] of seiten(p, x0, z0, a, a)) fpoly(S, F, [[0, H], [a, H], [a / 2, H + a * 0.6]], -0.3, 0, c);
    const g = new THREE.ConeGeometry(a * 0.72, a * 1.6, 4); g.translate(cx, H + a * 0.8, cz); S.add(g, dach);
    zyl(S, 0.05, 0.12, 2, cx, H + a * 1.6, cz, '#d8b45a', 4);
    return H + a * 1.6 + 2;
  }
  if (helm === 'stufen') {
    // gestufter Aufsatz (Mainzer Art): Achteck, Galerie, Laterne, Spitzhelm
    zyl(S, a * 0.45, a * 0.5, 7, cx, H, cz, c, 8);
    zyl(S, a * 0.52, a * 0.52, 0.6, cx, H + 7, cz, hell, 8);
    zyl(S, a * 0.34, a * 0.38, 6, cx, H + 7.6, cz, c, 8);
    const g = new THREE.SphereGeometry(a * 0.38, 8, 6, 0, 2 * PI, 0, PI / 2); g.scale(1, 0.8, 1); g.translate(cx, H + 13.6, cz); S.add(g, dach);
    zyl(S, a * 0.14, a * 0.14, 3, cx, H + 13.6 + a * 0.28, cz, hell, 8);
    const k = new THREE.ConeGeometry(a * 0.2, a * 1.0, 8); k.translate(cx, H + 16.6 + a * 0.28 + a * 0.5, cz); S.add(k, dach);
    zyl(S, 0.05, 0.12, 2, cx, H + 16.6 + a * 1.28, cz, '#d8b45a', 4);
    return H + 18.6 + a * 1.28;
  }
  const g = new THREE.ConeGeometry(a * 0.72, a * (helm === 'kegel' ? 2.2 : 1.3), 4); g.rotateY(PI / 4); g.translate(cx, H + a * (helm === 'kegel' ? 1.1 : 0.65), cz); S.add(g, dach);
  zyl(S, 0.05, 0.12, 2, cx, H + a * (helm === 'kegel' ? 2.2 : 1.3), cz, '#d8b45a', 4);
  return H + a * 1.3 + 2;
}
/** Halbrunde Apsis an einem Ende, Richtung s (+1: +x, -1: -x). */
function apsis(S, p, x, cz, rad, H, s, c, dach) {
  const t0 = s > 0 ? 0 : PI;
  const g = new THREE.CylinderGeometry(rad, rad, H, 12, 1, false, t0, PI); g.translate(x, H / 2, cz); S.add(g, c);
  const zg = new THREE.CylinderGeometry(rad + 0.05, rad + 0.05, 1.8, 12, 1, false, t0, PI); zg.translate(x, H - 1.6, cz); S.add(zg, '#3d3532');
  const zr = new THREE.CylinderGeometry(rad + 0.3, rad + 0.3, 0.4, 12, 1, false, t0, PI); zr.translate(x, H - 2.7, cz); S.add(zr, heller(c, 0.06));
  for (let i = 0; i <= 12; i++) {
    const w = t0 + (i / 12) * PI, nx = Math.sin(w), nz = Math.cos(w);
    if (!sieht(p, nx, nz)) continue;
    S.box(0.3, 1.8, 0.3, x + nx * (rad + 0.15), H - 1.6, cz + nz * (rad + 0.15), heller(c, 0.06));
    if (i % 3 === 1) S.box(0.5, H * 0.35, 1.0, x + nx * (rad + 0.02), H * 0.45, cz + nz * (rad + 0.02), '#3d3a3c', Math.atan2(-nz, nx) + PI / 2);
    if (i % 3 === 0) S.box(0.6, H - 3, 0.6, x + nx * (rad + 0.2), (H - 3) / 2, cz + nz * (rad + 0.2), dunkler(c, 0.03));
  }
  const k = new THREE.ConeGeometry(rad + 0.4, rad * 0.7, 12, 1, false, t0, PI); k.translate(x, H + rad * 0.35, cz); S.add(k, dach);
  const deckel = new THREE.BoxGeometry(0.4, rad * 0.7, 2 * rad + 0.8); deckel.translate(x, H + rad * 0.35, cz);
}
function domRoh(S, scene, p) {
  const r = rng(`dom:${p.seed}`), v = p.variante, { x: x0, z: z0, w, d } = p;
  const c = waehle(r, ROTSTEIN), hell = heller(c, 0.06), dach = waehle(r, [SCHIEFER, '#5d646b', KUPFER]);
  boden(S, x0, z0, x0 + w, z0 + d, PLATZ, 0.3, 0.07);
  const cz = z0 + d / 2 - 3, ms = 14, sb = 7, Hm = 26, Hs = 13;
  // Langhaus x-Bereich
  const ex = v === 'kaiserdom' ? 16 : 18;
  const lx0 = x0 + ex, lx1 = x0 + w - ex;
  // Mittelschiff
  S.quader(lx0, 0, cz - ms / 2, lx1, Hm, cz + ms / 2, c);
  for (const [k, F] of seiten(p, lx0, cz - ms / 2, lx1 - lx0, ms, ['+z', '-z'])) {
    romWand(S, F, 0, F.L, Hs + 2, Hm - 2.4, c, { ra: 5, fw: 0.9, fy: 2.2, oben: 1.4 });
    if (v === 'kaiserdom') zwerggalerie(S, F, 0, F.L, Hm - 2.4, 2.4, c); else fb(S, F, -0.2, F.L + 0.2, Hm - 2.4, Hm, 0, 0.3, c);
  }
  satteldach(S, lx0, cz - ms / 2 - 0.4, lx1, cz + ms / 2 + 0.4, Hm, 7.5, 'x', dach, c, 0.3);
  // Seitenschiffe mit Pultdach
  for (const s of [-1, 1]) {
    const zA = s > 0 ? cz + ms / 2 : cz - ms / 2 - sb;
    S.quader(lx0 + 1, 0, zA, lx1 - 1, Hs, zA + sb, c);
    for (const [k, F] of seiten(p, lx0 + 1, zA, lx1 - lx0 - 2, sb, [s > 0 ? '+z' : '-z'])) {
      romWand(S, F, 0, F.L, 0.3, Hs, c, { ra: 5, fw: 0.75, fy: 4.2, oben: 2.0 });
      fb(S, F, -0.1, F.L + 0.1, 0.3, 1.2, 0, 0.8, dunkler(c, 0.05));
      if (k === '+z') {
        // Portal mit Stufen
        const u = F.L * (v === 'kaiserdom' ? 0.3 : 0.5);
        fwand(S, F, u - 2.6, u + 2.6, 0.3, 6.4, 0, 1.0, hell, [{ u0: u - 1.6, u1: u + 1.6, v0: 0.29, v1: 5.6, bogen: true }]);
        fb(S, F, u - 1.6, u + 1.6, 0.3, 4.0, 0.05, 0.12, '#5a3a2e');
        fpoly(S, F, [[u - 3.0, 6.4], [u + 3.0, 6.4], [u, 8.4]], -0.2, 1.1, hell);
        for (let i = 0; i < 3; i++) fb(S, F, u - 3.2 - i * 0.3, u + 3.2 + i * 0.3, 0.3, 0.7 - i * 0.2, 1.0, 1.6 + i * 0.6, '#cfc6b4');
      }
    }
    const g = new THREE.BoxGeometry(lx1 - lx0 - 1.4, 0.3, sb + 1.2); g.rotateX(s * 0.32); g.translate((lx0 + lx1) / 2, Hs + 1.1, zA + sb / 2 + s * 0.4); S.add(g, dach);
  }
  // Querhaus und Vierungsturm (Ostseite +x)
  const qx0 = lx1 - 16, qb = 16, qz0 = cz - ms / 2 - sb - 4, qd = ms + 2 * sb + 8;
  let hmax = Hm + 8;
  if (v !== 'doppelchor') {
    S.quader(qx0, 0, qz0, qx0 + qb, Hm, qz0 + qd, c);
    for (const [k, F] of seiten(p, qx0, qz0, qb, qd)) {
      if (k === '+z' || k === '-z') { romWand(S, F, 0, F.L, 0.3, Hm - 2.4, c, { ra: 5.5, fw: 1.0, fy: 8, oben: 3 }); fpoly(S, F, [[0, Hm - 0.5], [F.L, Hm - 0.5], [F.L / 2, Hm + 6.5]], -0.5, 0.4, c); fscheibe(S, F, F.L / 2, Hm + 1.8, 0.4, 0.6, 1.4, '#3d3a3c', 16); bogenfries(S, teil(F, 0, F.L, 0.4), 0, F.L, Hm - 0.5, hell); }
      else romWand(S, F, 0, F.L, Hs + 1, Hm - 0.5, c, { ra: 5, fw: 0.8, fy: 2.5 });
    }
    satteldach(S, qx0 - 0.3, qz0, qx0 + qb + 0.3, qz0 + qd, Hm - 0.5, 7, 'z', dach, c, 0.3);
    hmax = Math.max(hmax, romTurm(S, p, qx0 + qb / 2, cz, 13, Hm + 9, { stein: c, dach, acht: true, helmH: v === 'kaiserdom' ? 10 : 9, y0: Hm + 2 }));
  }
  // Enden: Apsis, Flankentürme, Westbau
  const ende = (s, art) => {
    const xe = s > 0 ? lx1 : lx0;
    if (art === 'apsis' || art === 'doppel') {
      S.quader(s > 0 ? xe : xe - 6, 0, cz - ms / 2, s > 0 ? xe + 6 : xe, Hm - 1, cz + ms / 2, c);
      for (const [k, F] of seiten(p, s > 0 ? xe : xe - 6, cz - ms / 2, 6, ms, ['+z', '-z'])) romWand(S, F, 0, F.L, 6, Hm - 1, c, { ra: 4, fw: 0.8, fy: 4 });
      satteldach(S, s > 0 ? xe : xe - 6, cz - ms / 2 - 0.3, s > 0 ? xe + 6 : xe, cz + ms / 2 + 0.3, Hm - 1, 7, 'x', dach, c, 0.3);
      apsis(S, p, xe + s * 6, cz, ms / 2 - 0.5, Hm - 6, s, c, dach);
      const ta = art === 'doppel' ? 6.5 : 8.5, th = art === 'doppel' ? 36 : 44;
      for (const sz of [-1, 1]) hmax = Math.max(hmax, romTurm(S, p, xe + s * 1.5, cz + sz * (ms / 2 + ta / 2 + 0.3), ta, th, { stein: c, dach, rund: art === 'doppel', helm: 'raute', geschosse: 6 }));
      if (art === 'doppel') hmax = Math.max(hmax, romTurm(S, p, xe - s * 6, cz, 12, Hm + 8, { stein: c, dach, acht: true, helmH: 12, y0: Hm + 1 }));
    } else if (art === 'westbau') {
      // massiger Westbau mit Mittelturm und zwei Treppentürmen
      const wb = 14, wx0 = s > 0 ? xe : xe - wb;
      S.quader(wx0, 0, cz - ms / 2 - sb, wx0 + wb, Hm + 4, cz + ms / 2 + sb, c);
      for (const [k, F] of seiten(p, wx0, cz - ms / 2 - sb, wb, ms + 2 * sb)) {
        romWand(S, F, 0, F.L, 0.3, Hm + 4, c, { ra: 6, fw: 1.1, fy: 9, oben: 3 });
        if ((k === '-x' && s < 0) || (k === '+x' && s > 0)) {
          fwand(S, F, F.L / 2 - 3.6, F.L / 2 + 3.6, 0.3, 9, 0, 1.4, hell, [{ u0: F.L / 2 - 2.2, u1: F.L / 2 + 2.2, v0: 0.29, v1: 8, bogen: true }]);
          fb(S, F, F.L / 2 - 2.2, F.L / 2 + 2.2, 0.3, 5.5, 0.05, 0.12, '#5a3a2e');
          fscheibe(S, F, F.L / 2, Hm - 2, 0.4, 0.6, 2.4, '#3d3a3c', 18);
          fscheibe(S, F, F.L / 2, Hm - 2, 0.6, 0.7, 2.6, hell, 18);
          fscheibe(S, F, F.L / 2, Hm - 2, 0.7, 0.75, 2.2, '#3d3a3c', 18);
        }
      }
      S.quader(wx0 - 0.2, Hm + 4, cz - ms / 2 - sb - 0.2, wx0 + wb + 0.2, Hm + 4.6, cz + ms / 2 + sb + 0.2, hell);
      hmax = Math.max(hmax, romTurm(S, p, wx0 + wb / 2, cz, 12, Hm + 22, { stein: c, dach, helm: v === 'westturm' ? 'stufen' : 'raute', geschosse: 7 }));
      for (const sz of [-1, 1]) hmax = Math.max(hmax, romTurm(S, p, wx0 + wb / 2 + s * 3, cz + sz * (ms / 2 + sb + 2.6), 5, Hm + 12, { stein: c, dach, rund: true }));
    }
  };
  if (v === 'kaiserdom') { ende(1, 'apsis'); ende(-1, 'westbau'); }
  else if (v === 'doppelchor') { ende(1, 'doppel'); ende(-1, 'doppel'); }
  else { ende(1, 'apsis'); ende(-1, 'westbau'); }
  // Domplatz: Bäume, Marktstände, Brunnen
  baumreihe(S, r, x0 + 4, x0 + w * 0.45, z0 + d - 3, 8, 1.0);
  if (v === 'westturm') for (let i = 0; i < 5; i++) marktstand(S, x0 + w * 0.5 + i * 4.6, z0 + d - 5, r);
  else brunnenRund(S, x0 + w * 0.7, z0 + d - 6, 3, { figur: '#8a8f8a' });
  for (let i = 0; i < 4; i++) laterne(S, x0 + w * 0.48 + i * 8, z0 + d - 2);
  return { hoehe: hmax };
}

// =====================================================================================
// 5. Wiederaufbau der 50er (Kassel-Typ): Treppenstraße, Geschäftshäuser, Platz
// =====================================================================================
const PASTELL = ['#e9d79e', '#d9b9a4', '#c9d6b5', '#b9cbd8', '#e5c2b5', '#f0e6cf', '#d8d2c2', '#e2cfa8'];
const LADEN50 = ['Moden Kessler', 'Schuhhaus Brede', 'Radio Lindner', 'Café Lohmann', 'Juwelier Sauer', 'Foto Krämer', 'Strümpfe Weidner', 'Lederwaren Fuhr', 'Bücherstube Holl', 'Eiscafé Venezia', 'Drogerie Albers', 'Tabak Henkel', 'Optik Brill', 'Uhren Engel', 'Schallplatten Ton', 'Konditorei Lenz'];
/**
 * 50er-Geschäftshaus: Laden-EG mit Vordach, Rasterfassade mit Kachelfeldern, Flugdach. strasse: Liste der Ladenseiten.
 */
function bau50(S, scene, p, r, x0, z0, b, t, o) {
  const n = o.n ?? 3, eg = 4.2, gh = 3.1, H = eg + n * gh, y0 = o.y0 ?? 0;
  const putz = o.putz ?? waehle(r, PASTELL), raster = o.raster ?? waehle(r, ['#f2efe6', '#e7e3d8', '#cfcac0']), kachel = o.kachel ?? waehle(r, ['#7fa3b8', '#d98a6a', '#e8c547', '#8fb58a', '#c9d6dc', '#b5523f']);
  const art = o.art ?? waehle(r, ['raster', 'band', 'lochputz']);
  S.quader(x0, y0, z0, x0 + b, y0 + H, z0 + t, putz);
  for (const [k, F] of seiten(p, x0, z0, b, t)) {
    const laden = o.strasse.includes(k);
    if (laden) {
      fb(S, F, 0.2, F.L - 0.2, y0 + 0.3, y0 + eg - 0.6, 0, 0.05, GLAS_HELL);
      for (const u of achsen(0, F.L, 3.2, 0)) fb(S, F, u - 0.08, u + 0.08, y0 + 0.3, y0 + eg - 0.6, 0, 0.12, '#3b4046');
      fb(S, F, 0, F.L, y0 + 0.3, y0 + 0.7, 0, 0.12, '#d8d2c4');
      fb(S, F, -0.3, F.L + 0.3, y0 + eg - 0.6, y0 + eg - 0.35, 0, 2.6, '#f4f2ec');
      fb(S, F, -0.3, F.L + 0.3, y0 + eg - 0.75, y0 + eg - 0.6, 2.4, 2.6, o.akzent ?? '#c9483e');
      const name = o.namen?.pop();
      if (name) ftext(scene, F, name, F.L / 2, y0 + eg - 0.05, 0.12, 0.6, F.L * 0.75, '#2a3036');
    } else {
      fb(S, F, 0, F.L, y0, y0 + eg, 0, 0.05, dunkler(putz, 0.05));
      for (const u of achsen(0, F.L, 3.2, 0.8)) fenster(S, F, u, y0 + 1.4, 1.6, 1.8, { rahmen: WEISS });
    }
    const yo = y0 + eg;
    if (art === 'raster') {
      fb(S, F, 0.1, F.L - 0.1, yo, H + y0 - 0.4, 0, 0.04, GLAS);
      const ax = achsen(0, F.L, 2.0, 0);
      for (let i = 0; i < n; i++) {
        const y = yo + i * gh;
        fb(S, F, 0, F.L, y, y + 0.22, 0, 0.3, raster);
        for (let j = 0; j < ax.length; j++) if ((i + j) % 3 === 0) fb(S, F, ax[j] - 0.92, ax[j] + 0.92, y + 0.22, y + 1.0, 0, 0.12, kachel);
      }
      for (const u of [0, ...ax.map((u) => u + 1.0)]) fb(S, F, u - 0.11, u + 0.11, yo, H + y0 - 0.4, 0, 0.3, raster);
    } else if (art === 'band') {
      for (let i = 0; i < n; i++) { const y = yo + i * gh; fb(S, F, 0.3, F.L - 0.3, y + 1.0, y + 2.4, 0, 0.05, GLAS); for (const u of achsen(0.3, F.L - 0.3, 1.4, 0)) fb(S, F, u - 0.05, u + 0.05, y + 1.0, y + 2.4, 0, 0.09, WEISS); fb(S, F, -0.05, F.L + 0.05, y + 0.9, y + 1.0, 0, 0.2, raster); }
    } else {
      for (let i = 0; i < n; i++) for (const u of achsen(0, F.L, 2.6, 0.7)) fenster(S, F, u, yo + i * gh + 0.9, 1.3, 1.6, { rahmen: raster, sims: null });
      if (F.L > 10 && o.mosaik !== false && r() < 0.5) { const u = F.L * 0.82; fb(S, F, u - 1.2, u + 1.2, yo + 0.5, yo + n * gh - 0.5, 0, 0.12, kachel); fb(S, F, u - 0.9, u + 0.9, yo + 0.9, yo + n * gh - 0.9, 0.12, 0.16, heller(kachel, 0.15)); }
    }
  }
  // Flugdach mit dünner Kante
  S.quader(x0 - 0.5, y0 + H - 0.4, z0 - 0.5, x0 + b + 0.5, y0 + H, z0 + t + 0.5, '#f4f2ec');
  S.quader(x0 + 0.5, y0 + H, z0 + 0.5, x0 + b - 0.5, y0 + H + 0.1, z0 + t - 0.5, '#a9a59c');
  if (o.staffel) {
    S.quader(x0 + 1.5, y0 + H, z0 + 1.5, x0 + b - 1.5, y0 + H + 2.8, z0 + t - 2.5, raster);
    for (const [k, F] of seiten(p, x0 + 1.5, z0 + 1.5, b - 3, t - 4)) fb(S, F, 0.4, F.L - 0.4, y0 + H + 0.6, y0 + H + 2.4, 0, 0.05, GLAS);
    S.quader(x0 + 1, y0 + H + 2.8, z0 + 1, x0 + b - 1, y0 + H + 3.1, z0 + t - 2, '#f4f2ec');
  }
  return y0 + H + (o.staffel ? 3.1 : 0);
}
function lampe50(S, x, z, y0 = 0.3) {
  S.box(0.12, 4.2, 0.12, x, y0 + 2.1, z, '#3f464c');
  S.box(1.6, 0.08, 0.08, x, y0 + 4.2, z, '#3f464c');
  for (const s of [-1, 1]) zyl(S, 0.25, 0.1, 0.4, x + s * 0.75, y0 + 3.8, z, '#f1ead2', 8);
}
function pflanzkuebel(S, r, x, z, y0 = 0.3, baumJa = true) {
  S.box(2.4, 0.7, 2.4, x, y0 + 0.35, z, '#c9c3b6');
  S.box(2.0, 0.1, 2.0, x, y0 + 0.72, z, '#6f9f5c');
  if (baumJa) baum(S, x, z, r, 0.75);
}
function kioskPilz(S, x, z, y0 = 0.3, farbe = '#e8c547') {
  zyl(S, 1.6, 1.6, 2.6, x, y0, z, '#f2efe6', 12);
  zyl(S, 1.5, 1.5, 1.2, x, y0 + 1.0, z, GLAS_HELL, 12);
  zyl(S, 3.4, 0.6, 0.9, x, y0 + 2.6, z, farbe, 16);
  zyl(S, 3.45, 3.45, 0.2, x, y0 + 3.4, z, '#f4f2ec', 16);
}
function wiederaufbauRoh(S, scene, p) {
  const r = rng(`wa:${p.seed}`), v = p.variante, { x: x0, z: z0, w, d } = p;
  const namen = mischen(LADEN50, r);
  boden(S, x0, z0, x0 + w, z0 + d, '#d4cdbf', 0.3, 0.07);
  let hmax = 0;
  if (v === 'treppenstrasse') {
    // Fußgängerstraße entlang z, steigt nach hinten in Terrassen
    const sb = 21, sx0 = x0 + (w - sb) / 2, sx1 = sx0 + sb, stufen = 4, tl = d / stufen;
    for (let i = 0; i < stufen; i++) {
      const zA = z0 + d - (i + 1) * tl, h = i * 0.9;
      if (i > 0) S.quader(sx0, 0.3, zA, sx1, 0.37 + h, zA + tl, '#d9d3c6');
      if (i > 0) for (let k = 0; k < 4; k++) S.quader(sx0, 0.3, zA + tl - k * 0.45 - 0.45, sx1, 0.37 + h - (k + 1) * 0.18, zA + tl - k * 0.45, '#cfc8ba');
      // Mittelstreifen: Kübel, Lampen, Bänke, Kiosk
      const zm = zA + tl / 2;
      if (i === 1) kioskPilz(S, sx0 + sb / 2, zm, 0.37 + h, waehle(r, ['#e8c547', '#c9483e', '#2f8f8a']));
      else { pflanzkuebel(S, r, sx0 + sb / 2 - 3, zm, 0.37 + h); pflanzkuebel(S, r, sx0 + sb / 2 + 3, zm - 3, 0.37 + h, false); bank(S, sx0 + sb / 2 + 3, zm + 1.5); }
      lampe50(S, sx0 + sb / 2, zA + 1.5, 0.37 + h);
    }
    // Häuserzeilen links (Laden +x) und rechts (Laden -x)
    for (const seite of [-1, 1]) {
      const bx0 = seite < 0 ? x0 + 1 : sx1, bb = seite < 0 ? sx0 - x0 - 1 : x0 + w - sx1 - 1;
      let z = z0;
      let i = 0;
      while (z < z0 + d - 4) {
        let t = zw(r, 11, 16); if (z0 + d - z - t < 8) t = z0 + d - z;
        const stufe = Math.min(stufen - 1, Math.floor((z0 + d - (z + t / 2)) / tl));
        const hz = bau50(S, scene, p, r, bx0, z, bb, t - 0.3, { strasse: [seite < 0 ? '+x' : '-x'], n: 1 + (i % 2) + (r() < 0.35 ? 1 : 0), y0: stufe * 0.9, namen, staffel: r() < 0.35, akzent: waehle(r, FARBEN.markise) });
        hmax = Math.max(hmax, hz); z += t; i++;
      }
    }
    return { hoehe: hmax };
  }
  if (v === 'geschaeftshaus') {
    // Eckhaus mit runder Ecke und Arkade, daneben zwei Ladenpavillons
    const b = Math.min(w - 16, 34), t = Math.min(d - 8, 18), gx0 = x0 + 2, gz0 = z0 + 2, eg = 4.6, gh = 3.2, n = 4, H = eg + n * gh;
    const putz = waehle(r, ['#efe6cf', '#e9e3d6', '#e2cfa8']), raster = '#f4f2ec', kachel = waehle(r, ['#7fa3b8', '#d98a6a', '#8fb58a']);
    const rr = 6;
    S.quader(gx0, 0, gz0, gx0 + b - rr, H, gz0 + t, putz);
    S.quader(gx0 + b - rr, 0, gz0, gx0 + b, H, gz0 + t - rr, putz);
    zyl(S, rr, rr, H, gx0 + b - rr, 0, gz0 + t - rr, putz, 20);
    for (const [k, F] of [['+z', R(gx0, gz0 + t, 1, 0, b - rr)], ['+x', R(gx0 + b, gz0 + t - rr, 0, -1, t - rr)]]) {
      if (!sichtF(p, F)) continue;
      fb(S, F, 0, F.L, 0.3, eg - 0.4, -2.2, -2.15, GLAS_HELL);
      for (const u of achsen(0, F.L, 3.4, 0)) fb(S, F, u - 0.3, u + 0.3, 0.3, eg, -2.2, 0, raster);
      fb(S, F, 0, F.L, eg - 0.6, eg, -2.2, 0.05, raster);
      fb(S, F, 0.1, F.L - 0.1, eg, H - 0.4, 0, 0.04, GLAS);
      const ax = achsen(0, F.L, 1.8, 0);
      for (let i = 0; i < n; i++) { const y = eg + i * gh; fb(S, F, 0, F.L, y, y + 0.25, 0, 0.3, raster); for (let j = 0; j < ax.length; j++) fb(S, F, ax[j] - 0.82, ax[j] + 0.82, y + 0.25, y + 1.0, 0, 0.1, (i + j) % 4 === 0 ? kachel : putz); }
      for (const u of [0, ...ax.map((u) => u + 0.9)]) fb(S, F, u - 0.1, u + 0.1, eg, H - 0.4, 0, 0.3, raster);
      ftext(scene, F, namen.pop(), F.L / 2, eg - 0.3, 0.1, 0.5, F.L * 0.6, '#2a3036');
    }
    // Rückseiten (sichtbar bei gedrehter Front): schlichtes Fensterraster
    for (const [k, F] of seiten(p, gx0, gz0, b, t, ['-x', '-z'])) {
      fb(S, F, 0, F.L, 0, eg, 0, 0.05, dunkler(putz, 0.06));
      for (const u of achsen(0, F.L, 3.4, 1)) { fb(S, F, u - 1.2, u + 1.2, 0.3, 3.0, 0, 0.08, GLAS_HELL); for (let i = 0; i < n; i++) fenster(S, F, u, eg + i * gh + 0.9, 1.6, 1.6, { rahmen: raster }); }
      for (let i = 1; i <= n; i++) fb(S, F, -0.05, F.L + 0.05, eg + i * gh - 0.15, eg + i * gh, 0, 0.15, raster);
    }
    // runde Ecke: Fensterbänder
    for (let i = 0; i < n; i++) { zyl(S, rr + 0.05, rr + 0.05, 1.5, gx0 + b - rr, eg + i * gh + 1.0, gz0 + t - rr, GLAS, 20); zyl(S, rr + 0.25, rr + 0.25, 0.25, gx0 + b - rr, eg + i * gh, gz0 + t - rr, raster, 20); }
    zyl(S, rr - 2.2, rr - 2.2, eg - 0.4, gx0 + b - rr, 0.3, gz0 + t - rr, GLAS_HELL, 16);
    for (let i = 0; i < 6; i++) { const a = (i / 5) * PI / 2; zyl(S, 0.3, 0.3, eg - 0.3, gx0 + b - rr + Math.sin(a) * (rr - 0.4), 0.3, gz0 + t - rr + Math.cos(a) * (rr - 0.4), raster, 8); }
    zyl(S, rr + 0.6, rr + 0.6, 0.4, gx0 + b - rr, H - 0.4, gz0 + t - rr, raster, 20);
    S.quader(gx0 - 0.6, H - 0.4, gz0 - 0.6, gx0 + b - rr, H, gz0 + t + 0.6, raster);
    S.quader(gx0 + b - rr, H - 0.4, gz0 - 0.6, gx0 + b + 0.6, H, gz0 + t - rr, raster);
    // Staffelgeschoss mit Flugdach
    S.quader(gx0 + 2, H, gz0 + 2, gx0 + b - 8, H + 3, gz0 + t - 3, raster);
    for (const [k, F] of seiten(p, gx0 + 2, gz0 + 2, b - 10, t - 5)) fb(S, F, 0.3, F.L - 0.3, H + 0.4, H + 2.6, 0, 0.05, GLAS);
    const g = new THREE.BoxGeometry(b - 6, 0.25, t - 2); g.rotateX(-0.08); g.translate(gx0 + b / 2 - 3, H + 3.4, gz0 + t / 2 - 0.5); S.add(g, '#f4f2ec');
    hmax = H + 3.6;
    // Ladenpavillons dahinter rechts
    const px0 = gx0 + b + 3;
    if (x0 + w - px0 > 8) {
      hmax = Math.max(hmax, bau50(S, scene, p, r, px0, gz0, x0 + w - px0 - 2, 12, { strasse: ['+z', '+x'], n: 1, namen, art: 'lochputz', mosaik: false }));
      bau50(S, scene, p, r, px0, gz0 + 14, x0 + w - px0 - 2, Math.max(6, d - 18), { strasse: ['+z', '+x'], n: 0, namen, akzent: '#2f8f8a' });
    }
    for (let i = 0; i < 3; i++) lampe50(S, gx0 + 4 + i * 11, z0 + d - 1.6);
    autoReihe(S, r, x0 + 2, x0 + w * 0.6, z0 + d - 0.2, 0, 0.0);
    return { hoehe: hmax };
  }
  // Platz: L-förmige Randbebauung, Nierenbecken, Kiosk, Pavillon
  const t = 13;
  hmax = bau50(S, scene, p, r, x0 + 1, z0 + 1, w - 2, t, { strasse: ['+z'], n: 4, namen, staffel: true, art: 'raster' });
  hmax = Math.max(hmax, unterbau(S, scene, p, '+x', x0 + 1, z0 + t + 3, d - t - 4, 12, (S2, sc2, p2) => bau50(S2, sc2, p2, r, 0, 0, d - t - 4, 12, { strasse: ['+z'], n: 2, namen, art: 'band' })));
  const cx = x0 + 13 + (w - 13) / 2, cz = z0 + t + (d - t) / 2;
  const g = new THREE.CylinderGeometry(1, 1, 0.5, 24); g.scale(7, 1, 4); g.translate(cx, 0.55, cz); S.add(g, '#e2dccf');
  const g2 = new THREE.CylinderGeometry(1, 1, 0.52, 24); g2.scale(6.4, 1, 3.4); g2.translate(cx, 0.57, cz); S.add(g2, FARBEN.wasser);
  const g3 = new THREE.CylinderGeometry(1, 1, 0.6, 16); g3.scale(3.5, 1, 2.5); g3.translate(cx + 5, 0.55, cz + 2.4); S.add(g3, '#e2dccf');
  for (let i = 0; i < 3; i++) zyl(S, 0.08, 0.25, 2.2 - i * 0.5, cx - 2 + i * 2, 0.8, cz, '#e3f3f5', 6);
  kioskPilz(S, x0 + w - 8, z0 + d - 8, 0.3, '#c9483e');
  for (let i = 0; i < 4; i++) pflanzkuebel(S, r, x0 + 18 + i * 8, z0 + t + 4, 0.3, i % 2 === 0);
  for (let i = 0; i < 3; i++) lampe50(S, cx - 10 + i * 10, z0 + d - 3);
  return { hoehe: hmax };
}


// =====================================================================================
// 6. Universität: Alte Uni (Neugotik), Betonuni der 70er, klassizistische Aula
// =====================================================================================
/** Neugotische Wand: Spitzbogenfenster in zwei Reihen, Strebepfeiler, Traufgesims. */
function gotWand(S, F, u0, u1, y0, y1, c, o = {}) {
  const ax = achsen(u0, u1, o.ra ?? 3.6, 0.8), L = [], reihen = o.reihen ?? 2, hr = (y1 - y0 - 1.2) / reihen;
  for (const u of ax) for (let k = 0; k < reihen; k++) L.push({ u0: u - (o.fw ?? 0.75), u1: u + (o.fw ?? 0.75), v0: y0 + 1.0 + k * hr, v1: y0 + (k + 1) * hr - 0.2, bogen: 'spitz' });
  lochwand(S, F, u0, u1, y0, y1, c, L, { glas: '#3e4650', dick: 0.3 });
  const hell = heller(c, 0.07);
  for (const l of L) { const m = (l.u0 + l.u1) / 2; fb(S, F, m - 0.06, m + 0.06, l.v0, l.v1 - (l.u1 - l.u0) * 0.5, 0.04, 0.2, hell); fb(S, F, l.u0, l.u1, l.v0 + (l.v1 - l.v0) * 0.55, l.v0 + (l.v1 - l.v0) * 0.55 + 0.1, 0.04, 0.2, hell); fb(S, F, l.u0 - 0.15, l.u1 + 0.15, l.v0 - 0.15, l.v0, 0, 0.35, hell); }
  for (let i = 0; i <= ax.length; i++) {
    const u = i === 0 ? u0 + 0.3 : i === ax.length ? u1 - 0.3 : (ax[i - 1] + ax[i]) / 2;
    fb(S, F, u - 0.3, u + 0.3, y0, y1 - 1.2, 0.3, 0.9, c); fb(S, F, u - 0.3, u + 0.3, y1 - 1.2, y1 - 0.4, 0.3, 0.6, c);
    if (o.fialen) { const [x, z] = wp(F, u, 0.55); const g = new THREE.ConeGeometry(0.35, 2.2, 4); g.translate(x, y1 + 1.1, z); S.add(g, hell); }
  }
  for (let k = 1; k < reihen; k++) fb(S, F, u0, u1, y0 + k * hr - 0.1, y0 + k * hr + 0.15, 0, 0.4, hell);
  fb(S, F, u0 - 0.2, u1 + 0.2, y1 - 0.4, y1, 0, 0.6, hell);
}
function universitaetRoh(S, scene, p) {
  const r = rng(`uni:${p.seed}`), v = p.variante, { x: x0, z: z0, w, d } = p;
  boden(S, x0, z0, x0 + w, z0 + d, PFLASTER, 0.3, 0.07);
  if (v === 'alte_uni') {
    const c = waehle(r, ['#b5735e', '#c9b89a', '#bf8a6e']), hell = heller(c, 0.07), dach = SCHIEFER;
    const mx0 = x0 + 3, mz0 = z0 + 4, mb = w - 24, mt = 14, H = 15;
    S.quader(mx0, 0, mz0, mx0 + mb, H, mz0 + mt, c);
    for (const [k, F] of seiten(p, mx0, mz0, mb, mt, ['+z', '-z', '-x'])) gotWand(S, F, 0, F.L, 0.3, H, c, { ra: 3.4, fialen: true });
    satteldach(S, mx0, mz0 - 0.3, mx0 + mb, mz0 + mt + 0.3, H, 8, 'x', dach, c, 0.3);
    // Zwerchgiebel zur Front
    for (const [k, F] of seiten(p, mx0, mz0, mb, mt, ['+z', '-z'])) for (const u of achsen(0, F.L, 11, 3)) {
      fb(S, F, u - 2.6, u + 2.6, H - 0.4, H + 3.4, -3, 0.35, c);
      fpoly(S, F, [[u - 2.6, H + 3.4], [u + 2.6, H + 3.4], [u, H + 7.2]], -3, 0.35, c);
      fstrebe(S, F, u - 2.9, H + 3.2, u + 0.1, H + 7.4, 0.35, -3.2, 0.5, hell); fstrebe(S, F, u + 2.9, H + 3.2, u - 0.1, H + 7.4, 0.35, -3.2, 0.5, hell);
      lochwand(S, teil(F, 0, F.L, 0.35), u - 1.6, u + 1.6, H + 0.2, H + 3.2, c, [{ u0: u - 1.1, u1: u - 0.15, v0: H + 0.5, v1: H + 2.9, bogen: 'spitz' }, { u0: u + 0.15, u1: u + 1.1, v0: H + 0.5, v1: H + 2.9, bogen: 'spitz' }], { dick: 0.1 });
      const g = new THREE.ConeGeometry(0.3, 1.8, 4); const [gx, gz] = wp(F, u, 0.2); g.translate(gx, H + 8, gz); S.add(g, hell);
    }
    // Aula-Flügel nach vorn mit Maßwerkfenstern und Giebel
    const ab = 16, ax0 = mx0 + mb, az0 = mz0, at = d - 9, Ha = 17;
    S.quader(ax0, 0, az0, ax0 + ab, Ha, az0 + at, c);
    for (const [k, F] of seiten(p, ax0, az0, ab, at)) {
      if (k === '+x' || k === '-x') gotWand(S, F, 0, F.L, 0.3, Ha, c, { ra: 4.4, reihen: 1, fw: 1.2, fialen: true });
      else {
        lochwand(S, F, 0, F.L, 0.3, Ha, c, [{ u0: F.L / 2 - 3, u1: F.L / 2 + 3, v0: 6, v1: Ha - 1.4, bogen: 'spitz' }, { u0: F.L / 2 - 1.5, u1: F.L / 2 + 1.5, v0: 0.3, v1: 4.2, bogen: 'spitz' }], { glas: '#3e4650' });
        for (const du of [-1.5, 0, 1.5]) fb(S, F, F.L / 2 + du - 0.1, F.L / 2 + du + 0.1, 6, Ha - 3.5, 0.02, 0.15, hell);
        fscheibe(S, F, F.L / 2, Ha - 3.3, 0.05, 0.18, 1.3, hell, 12);
        fpoly(S, F, [[0, Ha], [F.L, Ha], [F.L / 2, Ha + 10]], -1, 0.3, c);
        lochwand(S, teil(F, 0, F.L, 0.3), F.L / 2 - 1.8, F.L / 2 + 1.8, Ha + 1, Ha + 5, c, [{ u0: F.L / 2 - 1.2, u1: F.L / 2 + 1.2, v0: Ha + 1.3, v1: Ha + 4.6, bogen: 'spitz' }], { dick: 0.1 });
        for (const u of [0.3, F.L - 0.3]) { fb(S, F, u - 0.6, u + 0.6, 0, Ha + 1, 0, 0.9, c); const [gx, gz] = wp(F, u, 0.45); const g = new THREE.ConeGeometry(0.6, 4, 4); g.translate(gx, Ha + 3, gz); S.add(g, hell); }
        const g = new THREE.ConeGeometry(0.35, 2.4, 4); const [gx, gz] = wp(F, F.L / 2, 0.15); g.translate(gx, Ha + 11.2, gz); S.add(g, hell);
      }
    }
    satteldach(S, ax0 - 0.3, az0, ax0 + ab + 0.3, az0 + at, Ha, 10, 'z', dach, c, 0.3);
    // Turm im Winkel
    const ts = 7.5, tx0 = ax0 - ts - 1, tz0 = mz0 + mt - 2, Ht = 34;
    S.quader(tx0, 0, tz0, tx0 + ts, Ht, tz0 + ts, c);
    for (const [k, F] of seiten(p, tx0, tz0, ts, ts)) {
      lochwand(S, F, 0, ts, 0.3, Ht - 1, c, [{ u0: ts / 2 - 1.2, u1: ts / 2 + 1.2, v0: 0.3, v1: 4.2, bogen: 'spitz' }, { u0: ts / 2 - 0.5, u1: ts / 2 + 0.5, v0: 8, v1: 11, bogen: 'spitz' }, { u0: ts / 2 - 0.5, u1: ts / 2 + 0.5, v0: 14, v1: 17, bogen: 'spitz' }, { u0: ts / 2 - 1.8, u1: ts / 2 - 0.2, v0: Ht - 8, v1: Ht - 2.5, bogen: 'spitz' }, { u0: ts / 2 + 0.2, u1: ts / 2 + 1.8, v0: Ht - 8, v1: Ht - 2.5, bogen: 'spitz' }], { glas: '#3e4650' });
      fscheibe(S, F, ts / 2, Ht - 11, 0.35, 0.45, 1.2, '#f6f1e2'); fscheibe(S, F, ts / 2, Ht - 11, 0.45, 0.5, 1.0, '#2b3036');
      for (const y of [6.5, 19, Ht - 1]) fb(S, F, -0.2, ts + 0.2, y, y + 0.5, 0, 0.5, hell);
    }
    for (const [sx, sz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const g = new THREE.ConeGeometry(0.6, 4, 4); g.translate(tx0 + sx * ts, Ht + 1.6, tz0 + sz * ts); S.add(g, hell); }
    const g = new THREE.ConeGeometry(ts * 0.62, 16, 8); g.rotateY(PI / 8); g.translate(tx0 + ts / 2, Ht + 8, tz0 + ts / 2); S.add(g, dach);
    zyl(S, 0.05, 0.14, 2.4, tx0 + ts / 2, Ht + 16, tz0 + ts / 2, '#d8b45a', 4);
    // Vorplatz: Treppe, Bäume, Denkmal
    S.quader(x0 + 8, 0.3, mz0 + mt, ax0 - ts - 2, 0.9, mz0 + mt + 3, '#cfc6b4');
    boden(S, x0 + 3, mz0 + mt + 6, ax0 - ts - 3, z0 + d - 3, RASEN, 0.3, 0.08);
    for (let i = 0; i < 3; i++) baum(S, x0 + 7 + i * 9, z0 + d - 5, r, 1.15);
    S.box(1.6, 2.2, 1.6, x0 + w * 0.42, 1.4, z0 + d - 9, '#d8d0c0'); zyl(S, 0.35, 0.45, 2.2, x0 + w * 0.42, 2.5, z0 + d - 9, '#6f7d78', 8); S.add(new THREE.SphereGeometry(0.4, 8, 6).translate(x0 + w * 0.42, 5.0, z0 + d - 9), '#6f7d78');
    // Gauben auf dem Hauptdach, Dachreiter, Fahrräder, Laternen, Hecken
    for (const [k, F] of seiten(p, mx0, mz0 - 0.3, mb, mt + 0.6, ['+z', '-z'])) {
      const zw2 = achsen(0, F.L, 11, 3);
      for (const u of achsen(0, F.L, 4.2, 2)) {
        if (zw2.some((q) => Math.abs(q - u) < 4.2)) continue;
        fb(S, F, u - 0.7, u + 0.7, H + 0.9, H + 2.7, -3.0, -1.0, c);
        fb(S, F, u - 0.4, u + 0.4, H + 1.1, H + 2.4, -1.05, -0.95, '#3e4650');
        fpoly(S, teil(F, u - 0.85, u + 0.85, -1.0), [[0, H + 2.7], [1.7, H + 2.7], [0.85, H + 3.6]], -2.4, 0.1, dach);
      }
    }
    const fx = mx0 + mb * 0.3; S.quader(fx - 0.9, H + 7.4, mz0 + mt / 2 - 0.9, fx + 0.9, H + 10, mz0 + mt / 2 + 0.9, hell);
    const fl = new THREE.ConeGeometry(1.2, 5, 8); fl.translate(fx, H + 12.5, mz0 + mt / 2); S.add(fl, dach);
    fahrradReihe(S, r, x0 + 6, x0 + 20, mz0 + mt + 4.5, true);
    fahrradReihe(S, r, x0 + 22, ax0 - ts - 4, mz0 + mt + 4.5, true);
    for (let i = 0; i < 4; i++) laterne(S, x0 + 5 + i * 9, z0 + d - 1.8);
    for (let i = 0; i < 3; i++) bank(S, x0 + 9 + i * 9, mz0 + mt + 7.5);
    S.quader(x0 + 3, 0.3, mz0 + mt + 5.6, ax0 - ts - 3, 1.2, mz0 + mt + 6.2, '#5f8f52');
    return { hoehe: Ht + 18 };
  }
  if (v === 'betonuni') {
    const be = waehle(r, ['#b9b5ad', '#c2bdb2', '#aeaaa1']), hell = heller(be, 0.06), dk = '#3a434b';
    // Hochhausscheibe mit Betonlisenen
    const hx0 = x0 + 4, hz0 = z0 + 4, hb = 34, ht = 14, n = 14, gh = 3.4, Hh = 4 + n * gh;
    S.quader(hx0, 0, hz0, hx0 + hb, Hh, hz0 + ht, dk);
    for (const [k, F] of seiten(p, hx0, hz0, hb, ht)) {
      const lang = F.L > 20;
      for (let i = 0; i <= n; i++) fb(S, F, 0, F.L, 4 + i * gh - 0.9, 4 + i * gh, 0, 0.45, be);
      for (const u of achsen(0, F.L, lang ? 1.7 : 2.2, 0)) fb(S, F, u - 0.2, u + 0.2, 4, Hh - 2, 0, 0.7, be);
      fb(S, F, -0.1, F.L + 0.1, 0, 4, -1.5, -1.45, GLAS_HELL);
      for (const u of achsen(0, F.L, 4.5, 0)) fb(S, F, u - 0.4, u + 0.4, 0, 4, -1.5, 0.3, be);
      fb(S, F, -0.2, F.L + 0.2, Hh - 2, Hh, 0, 0.75, be);
    }
    S.quader(hx0 + 4, Hh, hz0 + 3, hx0 + 14, Hh + 4, hz0 + ht - 3, be);
    // Terrassenbau vorne rechts: drei Stufen nach hinten zurückgesetzt
    const tx0 = x0 + 14, tz0 = z0 + 26, tb = w - 18, tt = d - 34;
    for (let k = 0; k < 3; k++) {
      const zA = tz0, zB = tz0 + tt - k * 4.5, xA = tx0 + k * 3, y = k * 3.8;
      S.quader(xA, y, zA, tx0 + tb, y + 3.8, zB, dk);
      for (const [kk, F] of seiten(p, xA, zA, tx0 + tb - xA, zB - zA)) {
        fb(S, F, -0.1, F.L + 0.1, y + 2.6, y + 3.8, 0, 0.4, be);
        fb(S, F, -0.1, F.L + 0.1, y + 3.8, y + 4.3, 0, 0.6, k === 2 ? be : '#7a9a5a');
        for (const u of achsen(0, F.L, 3.6, 0)) fb(S, F, u - 0.15, u + 0.15, y, y + 2.6, 0, 0.3, be);
      }
    }
    S.quader(tx0 + 6, 11.4, tz0, tx0 + tb, 11.8, tz0 + tt - 9, be);
    // Hörsaalbau: Achteck mit Faltdachkante
    const cx = x0 + w - 16, cz = z0 + 12, ra = 10, pts = [];
    for (let i = 0; i < 8; i++) { const a = -PI / 8 - (i * PI) / 4 + PI / 2; pts.push([cx + Math.cos(a) * ra, cz + Math.sin(a) * ra]); }
    prisma(S, pts, 0, 10, be);
    for (const F of kanten(pts)) if (sichtF(p, F)) { fb(S, F, 0.3, F.L - 0.3, 0.3, 3.2, 0, 0.05, GLAS_HELL); for (const u of achsen(0, F.L, 1.4, 0)) fb(S, F, u - 0.15, u + 0.15, 3.2, 10, 0, 0.3, hell); fb(S, F, -0.1, F.L + 0.1, 9.2, 10.2, 0, 0.5, hell); }
    zyl(S, ra * 0.55, ra * 0.7, 2.5, cx, 10, cz, hell, 8);
    ftext(scene, R(cx - 4, cz + ra * 0.93 + 0.1, 1, 0, 8), 'Hörsaalzentrum', 4, 8.4, 0.5, 0.7, 7.5, '#2a3036');
    // Fußgängerbrücke Hochhaus zu Terrassenbau
    S.quader(hx0 + hb - 2, 7, hz0 + ht, hx0 + hb + 2, 10, tz0, be);
    for (const [k, F] of seiten(p, hx0 + hb - 2, hz0 + ht, 4, tz0 - hz0 - ht, ['+x', '-x'])) fb(S, F, 0, F.L, 8, 9.5, 0, 0.05, GLAS);
    for (const z of [hz0 + ht + 3, tz0 - 3]) S.box(0.8, 7, 0.8, hx0 + hb, 3.65, z, be);
    // Platz: Betonkübel, Fahrräder, Bäume
    for (let i = 0; i < 5; i++) pflanzkuebel(S, r, x0 + 6 + i * 3.2, z0 + d - 4, 0.3, i % 2 === 0);
    for (let i = 0; i < 10; i++) { const bx = x0 + 6 + i * 0.8; S.box(0.08, 1.0, 1.6, bx, 0.8, hz0 + ht + 4, '#2f3a42'); }
    baumreiheZ(S, r, tz0, z0 + d - 4, x0 + 5, 7, 1.0);
    // Fluchttreppenturm, Dachtechnik, Dachgeländer
    S.quader(hx0 + 2, 0, hz0 + ht, hx0 + 6.5, Hh + 2, hz0 + ht + 4, be);
    for (const [k, F] of seiten(p, hx0 + 2, hz0 + ht, 4.5, 4)) for (let y = 3; y < Hh; y += 3.4) fb(S, F, F.L / 2 - 0.25, F.L / 2 + 0.25, y, y + 2.2, 0, 0.05, dk);
    for (let i = 0; i < 3; i++) S.quader(hx0 + 17 + i * 5, Hh, hz0 + 3, hx0 + 20 + i * 5, Hh + 2.2, hz0 + 7, '#c9cdd0');
    for (let i = 0; i < 3; i++) zyl(S, 0.8, 0.8, 0.6, hx0 + 18.5 + i * 5, Hh + 2.2, hz0 + 5, '#5d656c', 10);
    zyl(S, 0.15, 0.2, 9, hx0 + 30, Hh, hz0 + 10, '#d9dcdf', 6);
    gelaender(S, [hx0 + 0.3, hz0 + ht - 0.3], [hx0 + hb - 0.3, hz0 + ht - 0.3], Hh, '#7d858c', 2.2);
    gelaender(S, [hx0 + hb - 0.3, hz0 + ht - 0.3], [hx0 + hb - 0.3, hz0 + 0.3], Hh, '#7d858c', 2.2);
    // Pflanztröge auf den Terrassen
    for (let k = 0; k < 3; k++) { const zB = tz0 + tt - k * 4.5, y = k * 3.8 + 4.3; for (let x = tx0 + k * 3 + 2; x < tx0 + tb - 1; x += 4.5) buschAuf(S, x, y, zB - 0.6, r, 0.7); }
    // Oberlichter Hörsaal, Vordach, Plastik, Fahrräder, Leuchten, Stele
    for (let i = 0; i < 4; i++) { const a = (i / 4) * 2 * PI + PI / 4, g = new THREE.ConeGeometry(1.3, 1.4, 4); g.rotateY(PI / 4); g.translate(cx + Math.cos(a) * 3.6, 12.5 + 0.7, cz + Math.sin(a) * 3.6); S.add(g, '#9fb4c0'); }
    S.quader(hx0 + 10, 4, hz0 + ht, hx0 + 24, 4.4, hz0 + ht + 5, hell);
    for (const x of [hx0 + 11, hx0 + 23]) S.box(0.4, 3.7, 0.4, x, 2.15, hz0 + ht + 4.6, be);
    const px = x0 + w * 0.5, pz = z0 + d - 7;
    S.box(2.4, 1.2, 2.4, px, 0.9, pz, be); S.box(1.2, 4.5, 1.2, px - 0.4, 3.75, pz, hell, 0.4); S.box(2.8, 0.9, 0.9, px + 0.5, 6.2, pz, '#c8463c', -0.3);
    fahrradReihe(S, r, x0 + 12, x0 + 30, hz0 + ht + 8, true);
    fahrradReihe(S, r, tx0 + 4, tx0 + 20, z0 + d - 2, true);
    for (let i = 0; i < 5; i++) { const lx = x0 + 10 + i * 9; S.box(0.18, 5.5, 0.18, lx, 3.05, z0 + d - 9, '#3f464c'); S.box(1.2, 0.3, 0.5, lx + 0.4, 5.9, z0 + d - 9, '#e9e6de'); }
    const FS = R(x0 + 6, hz0 + ht + 10.2, 1, 0, 3); S.quader(x0 + 6, 0.3, hz0 + ht + 9.8, x0 + 9, 4.3, hz0 + ht + 10.2, '#2f6f8f');
    if (sichtF(p, FS)) ftext(scene, FS, 'Universität', 1.5, 3.4, 0.02, 0.5, 2.8, '#ffffff');
    for (let i = 0; i < 4; i++) bank(S, x0 + 34 + i * 6, z0 + d - 5);
    return { hoehe: Hh + 4 };
  }
  // Klassizistische Aula
  const putz = waehle(r, ['#ead7a2', '#ecdcae', '#e6cf9a']), orn = WEISS;
  const ab = Math.min(30, w - 18), at = 18, ax0 = x0 + (w - ab) / 2, az0 = z0 + 4, H = 13;
  S.quader(ax0, 0, az0, ax0 + ab, H, az0 + at, putz);
  for (const [k, F] of seiten(p, ax0, az0, ab, at)) {
    const L = achsen(0, F.L, 3.6, 1.0).map((u) => ({ u0: u - 0.85, u1: u + 0.85, v0: 3.2, v1: H - 2.2, bogen: true }));
    lochwand(S, F, 0, F.L, 0.3, H - 1.2, putz, L, { dick: 0.25 });
    for (const u of achsen(0, F.L, 3.6, 1.0)) { fb(S, F, u - 1.9, u - 1.5, 1.6, H - 1.2, 0, 0.35, orn); fb(S, F, u - 0.85, u + 0.85, 2.9, 3.15, 0, 0.35, orn); }
    fb(S, F, -0.1, F.L + 0.1, 0.3, 1.6, 0, 0.4, '#d8cba8');
    fb(S, F, -0.3, F.L + 0.3, H - 1.2, H, 0, 0.6, orn);
  }
  walm(S, ax0 - 0.3, az0 - 0.3, ax0 + ab + 0.3, az0 + at + 0.3, H, 5, SCHIEFER);
  const F = R(ax0 + ab / 2 - 8, az0 + at + 5.5, 1, 0, 16);
  S.quader(ax0 + ab / 2 - 8.5, 0.3, az0 + at, ax0 + ab / 2 + 8.5, 1.6, az0 + at + 6.5, '#e2dccf');
  for (let i = 0; i < 3; i++) S.quader(ax0 + ab / 2 - 8.5, 0.3, az0 + at + 6.5 + i * 0.5, ax0 + ab / 2 + 8.5, 1.3 - i * 0.4, az0 + at + 7 + i * 0.5, '#e2dccf');
  saeulenreihe(S, F, 1, 15, 4, 1.6, H - 2.8, -0.6, 0.6, WEISS, orn);
  S.quader(ax0 + ab / 2 - 8.3, H - 1.2, az0 + at - 0.5, ax0 + ab / 2 + 8.3, H, az0 + at + 5.8, orn);
  dreiecksgiebel(S, F, -0.3, 16.3, H, 3.8, -6.4, 0.2, putz, orn);
  if (sichtF(p, F)) ftext(scene, F, 'Aula', 8, H - 0.6, 0.35, 0.8, 6, '#7a6a4a');
  const g = dachProfil(6.2, 16.6, 3.8, 0.1, 'z'); g.translate(ax0 + ab / 2, H, az0 + at + 2.8); S.add(g, SCHIEFER);
  // Seitenbauten
  for (const s of [-1, 1]) {
    const bx0 = s < 0 ? x0 + 2 : ax0 + ab + 3, bb = s < 0 ? ax0 - x0 - 5 : x0 + w - ax0 - ab - 5;
    if (bb < 5) continue;
    S.quader(bx0, 0, az0 + 2, bx0 + bb, 8, az0 + at - 2, putz);
    for (const [k, F2] of seiten(p, bx0, az0 + 2, bb, at - 4)) { for (let kk = 0; kk < 2; kk++) for (const u of achsen(0, F2.L, 3, 0.8)) fenster(S, F2, u, 1.2 + kk * 3.6, 1.1, 1.9, { kreuz: true, rahmen: orn, sims: orn }); fb(S, F2, -0.2, F2.L + 0.2, 7.5, 8, 0, 0.4, orn); }
    walm(S, bx0 - 0.2, az0 + 1.8, bx0 + bb + 0.2, az0 + at - 1.8, 8, 3.4, SCHIEFER);
  }
  boden(S, x0 + 3, az0 + at + 9, x0 + w - 3, z0 + d - 2, RASEN, 0.3, 0.08);
  boden(S, ax0 + ab / 2 - 2, az0 + at + 8, ax0 + ab / 2 + 2, z0 + d, KIES, 0.3, 0.11);
  for (const s of [-1, 1]) baum(S, ax0 + ab / 2 + s * 10, z0 + d - 5, r, 1.2);
  // Akroterien, Balustrade, Fahnen, Laternen, Hecken, Fahrräder, Bänke
  for (const [u, hh] of [[-0.3, 0], [16.3, 0], [8, 3.8]]) { const [sx, sz] = wp(F, u, -0.2); zyl(S, 0.3, 0.4, 1.6, sx, H + hh, sz, WEISS, 8); S.add(new THREE.SphereGeometry(0.35, 8, 6).translate(sx, H + hh + 1.9, sz), WEISS); }
  for (const [k, F2] of seiten(p, ax0, az0, ab, at)) { for (let u = 0.4; u < F2.L - 0.3; u += 0.5) fb(S, F2, u - 0.08, u + 0.08, H, H + 0.8, 0.1, 0.3, orn); fb(S, F2, 0, F2.L, H + 0.8, H + 1.0, 0, 0.4, orn); }
  for (const s of [-1, 1]) { const fx = ax0 + ab / 2 + s * 6, fz = az0 + at + 8.5; S.box(0.12, 9, 0.12, fx, 4.8, fz, '#d9dcdf'); S.box(0.05, 1.3, 2.2, fx, 8.4, fz + 1.1, s < 0 ? '#c8463c' : '#e8c547'); }
  for (let i = 0; i < 4; i++) laterne(S, ax0 + ab / 2 + (i < 2 ? -3.2 : 3.2), az0 + at + 11 + (i % 2) * 6);
  for (const s of [-1, 1]) S.quader(ax0 + ab / 2 + s * 2.6 - (s < 0 ? 8 : 0), 0.3, z0 + d - 2.6, ax0 + ab / 2 + s * 2.6 + (s > 0 ? 8 : 0), 1.1, z0 + d - 2, '#5f8f52');
  fahrradReihe(S, r, x0 + 4, ax0 - 2, az0 + at + 6, true);
  for (let i = 0; i < 2; i++) bank(S, ax0 + ab / 2 + (i ? 5 : -5), z0 + d - 7);
  return { hoehe: H + 5 };
}

// =====================================================================================
// 7. Römische Bauten (Trier-Typ, eigenständig): Stadttor, Thermenruine, Palastbasilika, Amphitheater
// =====================================================================================
const ROEM_DUNKEL = ['#575049', '#4f4943', '#5e5750'];
/** Unregelmäßige Ruinenkrone entlang eines Rahmens. */
function ruinenKrone(S, F, u0, u1, y, r, c, t0, t1, hmax = 2.2) {
  for (let u = u0; u < u1 - 0.1;) { const b = Math.min(u1 - u, zw(r, 0.9, 2.4)), h = zw(r, 0, hmax); if (h > 0.3) fb(S, F, u, u + b, y, y + h, t0, t1, c); u += b; }
}
/** Ellipsen-Ringsektor als Prisma (Winkel a0..a1). */
function ringSektor(S, cx, cz, ri, ro, a0, a1, y0, h, c, n = 20) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push([cx + Math.cos(a) * ro[0], cz + Math.sin(a) * ro[1]]); }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n; pts.push([cx + Math.cos(a) * ri[0], cz + Math.sin(a) * ri[1]]); }
  prisma(S, pts, y0, h, c);
}
function roemischRoh(S, scene, p) {
  const r = rng(`roem:${p.seed}`), v = p.variante, { x: x0, z: z0, w, d } = p;
  boden(S, x0, z0, x0 + w, z0 + d, RASEN, 0.3, 0.07);
  if (v === 'tor') {
    const c = waehle(r, ROEM_DUNKEL), hell = heller(c, 0.07), dk = '#2a2724';
    const cx = x0 + w / 2, cz = z0 + d / 2 - 2, B = 32, T = 10, ze = [7.5, 5.2, 5.2, 4.6];
    const H = ze.reduce((a, b) => a + b, 0);
    // Weg durch das Tor
    boden(S, cx - 4.5, z0, cx + 4.5, z0 + d, PFLASTER, 0.3, 0.09);
    const ex = 4.5, tr = 5.6;
    // Hauptkörper
    S.quader(cx - B / 2, 0, cz - T / 2, cx + B / 2, H - 2.5, cz + T / 2, c);
    S.quader(cx - B / 2, H - 2.5, cz - T / 2, cx + 3, H, cz + T / 2, c);
    const arkaden = (F, u0, u1, geschosse, durchgang) => {
      const L = [];
      let y = 0;
      geschosse.forEach((gh, k) => {
        if (k === 0 && durchgang) for (const u of durchgang) L.push({ u0: u - 1.9, u1: u + 1.9, v0: 0.29, v1: gh - 0.8, bogen: true });
        else if (k > 0) for (const u of achsen(u0, u1, 2.9, 0.4)) L.push({ u0: u - 0.85, u1: u + 0.85, v0: y + 0.7, v1: y + gh - 0.6, bogen: true });
        y += gh;
      });
      return L;
    };
    // Rückseite (-z) und Seiten: Arkaden über die ganze Breite
    for (const [k, F] of seiten(p, cx - B / 2, cz - T / 2, B, T, ['-z', '-x', '+x'])) {
      const geschosse = k === '-z' ? ze : ze.slice(0, 3);
      const L = arkaden(F, 0, F.L, geschosse, k === '-z' ? [F.L / 2 - 2.4, F.L / 2 + 2.4] : null);
      lochwand(S, F, 0, F.L, 0, H - 2.5, c, L, { glas: dk, dick: 0.6 });
      let y = 0;
      for (const gh of geschosse) { y += gh; fb(S, F, -0.1, F.L + 0.1, y - 0.5, y, 0, 0.9, hell); }
      for (const u of achsen(0, F.L, 2.9, 0.4)) fb(S, F, u + 1.15, u + 1.6, ze[0], H - 3, 0.6, 0.95, c);
    }
    // Front: Mittelteil zurückgesetzt mit zwei Durchgängen, halbrunde Türme
    const FM = R(cx - ex, cz + T / 2, 1, 0, 2 * ex);
    if (sichtF(p, FM)) {
      lochwand(S, FM, 0, 2 * ex, 0, H - 2.5, c, arkaden(FM, 0, 2 * ex, ze.slice(0, 3), [2 * ex / 2 - 2.4, 2 * ex / 2 + 2.4]), { glas: dk, dick: 0.6 });
      let y = 0; for (const gh of ze.slice(0, 3)) { y += gh; fb(S, FM, -0.1, 2 * ex + 0.1, y - 0.5, y, 0, 0.9, hell); }
    }
    for (const s of [-1, 1]) {
      const tx = cx + s * (ex + tr), Ht = s < 0 ? H : H - 2.5;
      const g = new THREE.CylinderGeometry(tr, tr, Ht, 14, 1, false, -PI / 2, PI); g.translate(tx, Ht / 2, cz + T / 2); S.add(g, c);
      let y = 0;
      ze.forEach((gh, k) => {
        y += gh; if (y > Ht + 0.1) return;
        const ring = new THREE.CylinderGeometry(tr + 0.35, tr + 0.35, 0.5, 14, 1, false, -PI / 2, PI); ring.translate(tx, y - 0.25, cz + T / 2); S.add(ring, hell);
        if (k === 0) return;
        for (let i = 0; i < 7; i++) {
          const a = -PI / 2 + ((i + 0.5) / 7) * PI, nx = Math.sin(a), nz = Math.cos(a);
          if (!sieht(p, nx, nz)) continue;
          const F = R(tx + nx * (tr + 0.02) + nz * 0.9, cz + T / 2 + nz * (tr + 0.02) - nx * 0.9, -nz, nx, 1.8);
          fwand(S, F, 0, 1.8, y - gh + 0.5, y - 0.5, 0, 0.12, hell, [{ u0: 0.35, u1: 1.45, v0: y - gh + 0.7, v1: y - 0.7, bogen: true }]);
          fb(S, F, 0.36, 1.44, y - gh + 0.7, y - 1.0, 0, 0.06, dk);
        }
      });
      if (s > 0) ruinenKrone(S, R(tx - tr, cz + T / 2, 1, 0, 2 * tr), 0.5, 2 * tr - 0.5, Ht, r, c, -4, 0, 1.8);
    }
    ruinenKrone(S, R(cx + 3, cz + T / 2 - 0.2, 1, 0, B / 2 - 3), 0, B / 2 - 3, H - 2.5, r, c, -T + 0.4, 0, 1.6);
    // Verwitterung: hellere und dunklere Quader
    for (const [k, F] of seiten(p, cx - B / 2, cz - T / 2, B, T, ['-z', '-x', '+x'])) for (let i = 0; i < 10; i++) { const u = zw(r, 0.5, F.L - 1.5), y = zw(r, 1, H - 4); fb(S, F, u, u + zw(r, 0.6, 1.4), y, y + 0.55, 0.6, 0.66, r() < 0.5 ? hell : dunkler(c, 0.05)); }
    // Mauerreste, Wiese, Info
    for (const s of [-1, 1]) { const mx = s < 0 ? x0 + 1 : cx + B / 2 + 1; const mb = s < 0 ? cx - B / 2 - x0 - 2 : x0 + w - cx - B / 2 - 2; S.quader(mx, 0, cz - 1.2, mx + mb, 2.2, cz + 1.2, c); ruinenKrone(S, R(mx, cz + 1.2, 1, 0, mb), 0, mb, 2.2, r, c, -2.4, 0, 1.4); }
    S.box(1.6, 1.0, 0.1, cx + 7, 1.0, z0 + d - 3, '#3f5a4a'); S.box(0.1, 0.8, 0.1, cx + 7, 0.6, z0 + d - 3, '#3b3f44');
    for (let i = 0; i < 4; i++) baum(S, x0 + 4 + i * (w - 8) / 3, z0 + d - 3 - (i % 2) * 2, r, 1.0);
    // Restaurierung: Gerüst mit Netz an der Ostflanke, Bauzaun, Container, Steinlager
    const FX = vierSeiten(cx - B / 2, cz - T / 2, B, T)['+x'];
    if (sichtF(p, FX)) geruest(S, FX, 0.3, T - 0.3, 0.3, H - 3, { netz: null });
    const FB = vierSeiten(cx - B / 2, cz - T / 2, B, T)['-z'];
    if (sichtF(p, FB)) geruest(S, FB, 1, 9, 0.3, 14, {});
    for (let z = cz - T / 2 - 1; z < cz + T / 2 + 1; z += 3.4) S.box(0.06, 2, 3.3, cx + B / 2 + 2.6, 1.3, z + 1.7, '#c9cdd0');
    S.quader(cx + B / 2 + 3.5, 0.3, cz - T / 2 - 4, cx + B / 2 + 6, 2.9, cz - T / 2 + 2, '#e8c547');
    S.quader(cx + B / 2 + 3.5, 0.3, cz - T / 2 + 2.3, cx + B / 2 + 6, 2.9, cz - T / 2 + 5, '#e9e6de');
    steinbloecke(S, r, cx + 6, z0 + 2, 8, hell);
    // Ausgrabung vor dem Tor: Grube mit Fundamenten, Bohlen, Geländer, Tafel
    const gx0 = x0 + 3, gz0 = cz + T / 2 + 6.5, gx1 = cx - 6.5, gz1 = gz0 + 6;
    S.quader(gx0, 0.25, gz0, gx1, 0.4, gz1, '#8a7258');
    for (let i = 0; i < 4; i++) S.quader(gx0 + 0.8 + i * 3.4, 0.4, gz0 + 0.8, gx0 + 1.6 + i * 3.4, 1.0, gz1 - 0.8, '#b8ad98');
    S.quader(gx0 + 0.8, 0.4, gz0 + 2.6, gx1 - 0.8, 0.9, gz0 + 3.3, '#b8ad98');
    for (const zz of [gz0, gz1]) S.quader(gx0, 0.4, zz - 0.15, gx1, 0.55, zz + 0.15, '#9a7a52');
    gelaenderRing(S, gx0 - 0.5, gz0 - 0.5, gx1 + 0.5, gz1 + 0.5, 0.3, '#d9dcdf', 1.8);
    infotafel(S, gx1 + 1.5, gz1 + 1, 0);
    for (let i = 0; i < 3; i++) laterne(S, cx + (i % 2 ? 5.5 : -5.5), z0 + d - 4 - i * 5);
    return { hoehe: H + 2 };
  }
  if (v === 'thermen') {
    const c = '#d8cdb8', ziegel = '#b06a4f', dk = '#3d3833';
    const cx = x0 + w / 2, wz = z0 + 16, H = 22;
    // Grundmauern und unterirdische Gänge
    boden(S, x0 + 3, z0 + 18, x0 + w - 3, z0 + d - 4, '#cfc0a0', 0.3, 0.08);
    for (let i = 0; i < 9; i++) { const lx = zw(r, x0 + 5, x0 + w - 14), lz = zw(r, z0 + 26, z0 + d - 8), lw = zw(r, 5, 12), quer = r() < 0.5; S.quader(lx, 0.3, lz, lx + (quer ? lw : 1.0), zw(r, 0.8, 1.8), lz + (quer ? 1.0 : lw * 0.7), c); }
    S.quader(x0 + 8, 0.3, z0 + d - 12, x0 + w - 8, 0.4, z0 + d - 10, dk);
    // Hauptwand mit großen Bogenöffnungen
    const mw = Math.min(w - 8, 56), mx0 = cx - mw / 2;
    S.quader(mx0, 0, wz - 1.4, mx0 + mw, 0.6, wz, c);
    const FW = R(mx0, wz, 1, 0, mw);
    const L = []; for (const u of achsen(0, mw, 6, 1)) { if (Math.abs(u - mw / 2) < 13.5) continue; L.push({ u0: u - 1.8, u1: u + 1.8, v0: 2, v1: 10, bogen: true }, { u0: u - 1.5, u1: u + 1.5, v0: 12.5, v1: 19, bogen: true }); }
    fwand(S, FW, 0, mw, 0, H, -1.4, 0, c, L);
    for (const y of [11, 20]) fb(S, FW, -0.1, mw + 0.1, y, y + 0.7, -1.5, 0.1, ziegel);
    ruinenKrone(S, FW, 0, mw, H, r, c, -1.4, 0, 2.5);
    // Halbrunde Apsis (Caldarium) nach vorn aus Segmenten
    const ra = 13, n = 11;
    for (let i = 0; i < n; i++) {
      const a0 = PI - (i * PI) / n, a1 = PI - ((i + 1) * PI) / n;
      const p0 = [cx + Math.cos(a0) * ra, wz + Math.sin(a0) * ra], p1 = [cx + Math.cos(a1) * ra, wz + Math.sin(a1) * ra];
      const L2 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), F = R(p0[0], p0[1], (p1[0] - p0[0]) / L2, (p1[1] - p0[1]) / L2, L2);
      const Hi = H - (i > 6 ? 4 + (i - 6) * 3 : 0);
      const loch = [{ u0: L2 / 2 - 1.2, u1: L2 / 2 + 1.2, v0: 2.5, v1: 10, bogen: true }];
      if (Hi > 17) loch.push({ u0: L2 / 2 - 1.0, u1: L2 / 2 + 1.0, v0: 12.5, v1: 18, bogen: true });
      fwand(S, F, -0.05, L2 + 0.05, 0, Hi, -1.2, 0, c, loch);
      fb(S, F, -0.05, L2 + 0.05, 11, 11.7, -1.3, 0.1, ziegel);
      if (Hi > 20.5) fb(S, F, -0.05, L2 + 0.05, 20, 20.7, -1.3, 0.1, ziegel);
      ruinenKrone(S, F, 0, L2, Hi, r, c, -1.2, 0, 1.6);
    }
    // kleine Seitenapsiden
    for (const s of [-1, 1]) {
      const ax = cx + s * Math.min(22, mw / 2 - 5), rs = 5;
      for (let i = 0; i < 5; i++) {
        const a0 = PI - (i * PI) / 5, a1 = PI - ((i + 1) * PI) / 5;
        const p0 = [ax + Math.cos(a0) * rs, wz + Math.sin(a0) * rs], p1 = [ax + Math.cos(a1) * rs, wz + Math.sin(a1) * rs];
        const L2 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), F = R(p0[0], p0[1], (p1[0] - p0[0]) / L2, (p1[1] - p0[1]) / L2, L2);
        fwand(S, F, -0.05, L2 + 0.05, 0, 9, -1.0, 0, c, [{ u0: L2 / 2 - 0.7, u1: L2 / 2 + 0.7, v0: 2.5, v1: 6.5, bogen: true }]);
        fb(S, F, -0.05, L2 + 0.05, 7.2, 7.8, -1.1, 0.1, ziegel);
        ruinenKrone(S, F, 0, L2, 9, r, c, -1.0, 0, 1.5);
      }
    }
    // Besucherweg, Bäume
    boden(S, x0 + 2, z0 + d - 4, x0 + w - 2, z0 + d - 2, KIES, 0.3, 0.1);
    for (let i = 0; i < 5; i++) baum(S, x0 + 4 + i * (w - 8) / 4, z0 + 5, r, 1.1);
    for (let i = 0; i < 3; i++) bank(S, x0 + 12 + i * 18, z0 + d - 5);
    // Hypokaustum in der Apsis: abgesenkter Boden mit Pfeilerchen und Resten der Estrichplatte
    S.quader(cx - 8, 0.25, wz + 1, cx + 8, 0.4, wz + 9, '#8a7a64');
    for (let i = 0; i < 9; i++) for (let k = 0; k < 4; k++) S.box(0.45, 0.9, 0.45, cx - 7.2 + i * 1.8, 0.85, wz + 2 + k * 1.9, '#b06a4f');
    S.quader(cx + 1.8, 1.3, wz + 1, cx + 8, 1.5, wz + 5, '#d2c6ae');
    // Mosaikfeld
    const mfx = x0 + 8, mfz = z0 + 30, mpal = ['#e9e1cf', '#b06a4f', '#3f5a6a', '#c9a24a', '#2f2a28'];
    for (let i = 0; i < 8; i++) for (let k = 0; k < 5; k++) S.box(0.95, 0.06, 0.95, mfx + i, 0.41, mfz + k, mpal[(i * 3 + k * 2 + (i === k ? 2 : 0)) % 5]);
    S.quader(mfx - 0.4, 0.3, mfz - 0.4, mfx + 7.9, 0.39, mfz + 4.9, '#9a8f80');
    // Säulenstümpfe, liegende Trommeln
    for (let i = 0; i < 6; i++) { const sx = x0 + 48 + (i % 3) * 4, sz = z0 + 32 + Math.floor(i / 3) * 6; zyl(S, 0.5, 0.55, zw(r, 1.0, 3.8), sx, 0.3, sz, c, 10); S.box(1.4, 0.4, 1.4, sx, 0.5, sz, c); }
    for (let i = 0; i < 3; i++) { const g = new THREE.CylinderGeometry(0.5, 0.5, 1.6, 10); g.rotateZ(PI / 2); g.rotateY(zw(r, 0, PI)); g.translate(x0 + 50 + i * 3, 0.8, z0 + 41); S.add(g, c); }
    // Grabungsschnitt mit Bohlen, Zelt, Steinlager
    const sx0 = x0 + 22, sz0 = z0 + 34;
    S.quader(sx0, 0.25, sz0, sx0 + 12, 0.4, sz0 + 7, '#8a7258');
    for (const zz of [sz0, sz0 + 7]) S.quader(sx0, 0.4, zz - 0.12, sx0 + 12, 0.6, zz + 0.12, '#9a7a52');
    for (const xx of [sx0, sx0 + 12]) S.quader(xx - 0.12, 0.4, sz0, xx + 0.12, 0.6, sz0 + 7, '#9a7a52');
    for (const [px2, pz2] of [[sx0 + 1, sz0 + 1], [sx0 + 7, sz0 + 1], [sx0 + 1, sz0 + 6], [sx0 + 7, sz0 + 6]]) S.box(0.12, 2.6, 0.12, px2, 1.6, pz2, '#e9e6de');
    const zelt = new THREE.BoxGeometry(6.6, 0.08, 6); zelt.rotateZ(0.08); zelt.translate(sx0 + 4, 2.9, sz0 + 3.5); S.add(zelt, '#f2efe6');
    steinbloecke(S, r, x0 + 4, z0 + 42, 8, c);
    // Gerüst an der Hauptwand, Besuchersteg mit Geländer, Tafeln
    if (sichtF(p, FW)) geruest(S, FW, 1.5, 11.5, 0.3, H - 2, {});
    S.quader(x0 + 3, 0.3, z0 + d - 9, x0 + w - 3, 0.9, z0 + d - 7, '#a9875e');
    gelaender(S, [x0 + 3, z0 + d - 9], [x0 + w - 3, z0 + d - 9], 0.9, '#5d656c', 2.2);
    gelaender(S, [x0 + 3, z0 + d - 7], [x0 + w - 3, z0 + d - 7], 0.9, '#5d656c', 2.2);
    for (let i = 0; i < 3; i++) infotafel(S, x0 + 14 + i * 20, z0 + d - 10.2, 0);
    return { hoehe: H + 2.5 };
  }
  if (v === 'basilika') {
    const zg = waehle(r, ['#9c5240', '#a35a44', '#93503f']), hell = heller(zg, 0.06), dk = '#2f2a28';
    const bb = 26, bt = 46, bx0 = x0 + w - bb - 6, bz0 = z0 + 10, H = 30;
    S.quader(bx0, 0, bz0, bx0 + bb, H, bz0 + bt, zg);
    for (const [k, F] of seiten(p, bx0, bz0, bb, bt)) {
      const joch = k === '+x' || k === '-x' ? 5.1 : 6.2, ax = achsen(0, F.L, joch, 0.6), L = [], B = [];
      for (const u of ax) { L.push({ u0: u - 1.0, u1: u + 1.0, v0: 4, v1: 13, bogen: true }, { u0: u - 1.0, u1: u + 1.0, v0: 16, v1: 25.5, bogen: true }); B.push({ u0: u - 1.9, u1: u + 1.9, v0: 1.4, v1: H - 1.8, bogen: true }); }
      lochwand(S, F, 0, F.L, 0, H, zg, L, { glas: dk, dick: 0.5 });
      fwand(S, teil(F, 0, F.L, 0.5), 0, F.L, 0, H - 0.6, 0, 0.7, hell, B);
      fb(S, F, -0.2, F.L + 0.2, H - 0.6, H, 0, 1.4, hell);
      if (k === '+z') { S.quader(bx0 + 5, 0, bz0 + bt, bx0 + bb - 5, 8, bz0 + bt + 5, zg); for (const [k2, F2] of seiten(p, bx0 + 5, bz0 + bt, bb - 10, 5, ['+z', '+x'])) lochwand(S, F2, 0, F2.L, 0, 8, zg, achsen(0, F2.L, 3.2, 0.5).map((u) => ({ u0: u - 1, u1: u + 1, v0: 0.29, v1: 6, bogen: true })), { glas: dk }); }
    }
    satteldach(S, bx0 - 0.3, bz0, bx0 + bb + 0.3, bz0 + bt, H, 4.5, 'z', '#6d7276', zg, 0.4);
    const ap = new THREE.CylinderGeometry(9, 9, H - 2, 12, 1, false, PI / 2, PI); ap.translate(bx0 + bb / 2, (H - 2) / 2, bz0); S.add(ap, zg);
    const ak = new THREE.ConeGeometry(9.4, 4, 12, 1, false, PI / 2, PI); ak.translate(bx0 + bb / 2, H, bz0); S.add(ak, '#6d7276');
    // barocker Palastflügel in Rosa mit Parterre
    const pw = 18, px0 = x0 + 3, pz0 = z0 + 6, pt = Math.min(48, d - 14), Hp = 15, rosa = waehle(r, ['#e6aca2', '#e9b8a8', '#e3a596']);
    S.quader(px0, 0, pz0, px0 + pw, Hp, pz0 + pt, rosa);
    for (const [k, F] of seiten(p, px0, pz0, pw, pt)) {
      for (let kk = 0; kk < 3; kk++) for (const u of achsen(0, F.L, 3.0, 1.2)) fenster(S, F, u, 1.2 + kk * 4.5, 1.2, kk === 1 ? 2.8 : 2.2, { kreuz: true, rahmen: WEISS, sims: WEISS });
      for (const u of achsen(0, F.L, 9, 0)) fb(S, F, u - 0.4, u + 0.4, 0.3, Hp - 0.8, 0, 0.3, WEISS);
      fb(S, F, -0.2, F.L + 0.2, Hp - 0.8, Hp, 0, 0.5, WEISS);
      if (k === '+x') { fb(S, F, F.L / 2 - 5, F.L / 2 + 5, 0, Hp + 1.5, 0, 1.0, rosa); dreiecksgiebel(S, F, F.L / 2 - 5.3, F.L / 2 + 5.3, Hp + 1.5, 3, 0, 1.1, rosa, WEISS); }
    }
    S.add(dachProfil(pt, pw, 4.5, pw * 0.45, 'z').translate(px0 + pw / 2, Hp, pz0 + pt / 2), '#5d646b');
    const gx0 = px0 + pw + 3, gx1 = bx0 - 3;
    if (gx1 - gx0 > 6) for (let i = 0; i < 3; i++) { const gz = pz0 + 6 + i * (pt - 10) / 3; boden(S, gx0, gz, gx1, gz + (pt - 16) / 3, '#7fae5a', 0.3, 0.1); boden(S, gx0 + 1.5, gz + 1.5, gx1 - 1.5, gz + (pt - 16) / 3 - 1.5, '#e8b3c0', 0.3, 0.14); for (const bx of [gx0, gx1]) zyl(S, 0.6, 0.8, 2.2, bx, 0.3, gz, '#4f8f4f', 8); }
    boden(S, x0 + 2, z0 + d - 5, x0 + w - 2, z0 + d - 2, KIES, 0.3, 0.1);
    for (let i = 0; i < 5; i++) baum(S, x0 + 4 + i * (w - 8) / 4, z0 + d - 3.5, r, 0.9);
    // Vorplatz: Pflasterbänder, Leuchten, Bänke, Fahrräder, Tafel; Palais-Dachgauben
    for (let i = 0; i < 4; i++) S.quader(bx0, 0.3, bz0 + bt + 6 + i * 2, bx0 + bb, 0.39, bz0 + bt + 6.4 + i * 2, '#b9b1a1');
    for (let i = 0; i < 4; i++) laterne(S, bx0 + 2 + i * (bb - 4) / 3, bz0 + bt + 14);
    for (let i = 0; i < 3; i++) bank(S, bx0 + 5 + i * 8, bz0 + bt + 12);
    fahrradReihe(S, r, bx0 - 6, bx0 - 1, bz0 + bt + 4, false);
    infotafel(S, bx0 + bb + 2, bz0 + bt + 6, PI / 2);
    for (const [k, F] of seiten(p, px0, pz0, pw, pt, ['+x', '-x'])) for (const u of achsen(0, F.L, 6, 2)) { fb(S, F, u - 0.6, u + 0.6, Hp + 0.4, Hp + 2.2, -2.4, -0.6, rosa); fb(S, F, u - 0.35, u + 0.35, Hp + 0.6, Hp + 1.9, -0.65, -0.55, GLAS); fpoly(S, teil(F, u - 0.75, u + 0.75, -0.6), [[0, Hp + 2.2], [1.5, Hp + 2.2], [0.75, Hp + 2.9]], -1.8, 0.1, '#5d646b'); }
    return { hoehe: H + 4.5 };
  }
  // Amphitheater
  const cx = x0 + w / 2, cz = z0 + d / 2, ar = [14, 9], spalt = 0.22, stein = '#cfc4ad';
  boden(S, cx - ar[0], cz - ar[1], cx + ar[0], cz + ar[1], '#d9c9a3', 0.3, 0.1);
  const stufen = 4, oR = [Math.min(w / 2 - 3, 31), Math.min(d / 2 - 3, 24)];
  for (let k = 0; k < stufen; k++) {
    const f = k / stufen, ri = [ar[0] + (oR[0] - ar[0]) * f, ar[1] + (oR[1] - ar[1]) * f];
    const farbe = k === 0 ? stein : k % 2 ? '#9cbf7e' : '#a7c78a', h = 3.2 + k * 2.4;
    for (const [a0, a1] of [[spalt, PI - spalt], [PI + spalt, 2 * PI - spalt]]) ringSektor(S, cx, cz, ri, oR, a0, a1, 0, h, farbe, 22);
    if (k > 0) for (const [a0, a1] of [[spalt, PI - spalt], [PI + spalt, 2 * PI - spalt]]) ringSektor(S, cx, cz, ri, [ri[0] + 0.5, ri[1] + 0.5], a0, a1, h - 0.01, 0.2, stein, 22);
  }
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * 2 * PI; if (Math.abs(Math.sin(a)) < Math.sin(spalt) + 0.12) continue;
    const pa = [cx + Math.cos(a) * (ar[0] + 1), 3.4, cz + Math.sin(a) * (ar[1] + 1)], pb = [cx + Math.cos(a) * (oR[0] - 1.5), 3.2 + (stufen - 1) * 2.4 + 0.2, cz + Math.sin(a) * (oR[1] - 1.5)];
    balken(S, pa, pb, 1.6, 0.5, stein);
  }
  ringSektor(S, cx, cz, ar, [ar[0] + 0.8, ar[1] + 0.8], spalt, PI - spalt, 3.2, 0.6, '#b9ae97', 22);
  ringSektor(S, cx, cz, ar, [ar[0] + 0.8, ar[1] + 0.8], PI + spalt, 2 * PI - spalt, 3.2, 0.6, '#b9ae97', 22);
  // Kammern in der Arenamauer (sichtbare Innenseite)
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * 2 * PI; if (Math.abs(Math.sin(a)) < Math.sin(spalt) + 0.08) continue;
    const nx = -Math.cos(a) / ar[0], nz = -Math.sin(a) / ar[1];
    if (!sieht(p, nx, nz)) continue;
    S.box(1.4, 2.0, 1.4, cx + Math.cos(a) * (ar[0] + 0.5), 1.3, cz + Math.sin(a) * (ar[1] + 0.5), '#3d3833', -a);
  }
  // Zugänge in Längsachse mit Mauerwangen
  for (const s of [-1, 1]) for (const sz of [-1, 1]) S.quader(Math.min(cx + s * ar[0], cx + s * (oR[0] + 2)), 0, cz + sz * (Math.sin(spalt) * ar[1] + 0.3) - 0.5, Math.max(cx + s * ar[0], cx + s * (oR[0] + 2)), 3.2, cz + sz * (Math.sin(spalt) * ar[1] + 0.3) + 0.5, stein);
  boden(S, x0, cz - 2.2, x0 + w, cz + 2.2, KIES, 0.3, 0.12);
  for (let i = 0; i < 8; i++) { const a = zw(r, 0, 2 * PI); if (Math.abs(Math.sin(a)) < 0.3) continue; baum(S, cx + Math.cos(a) * (oR[0] - 3), cz + Math.sin(a) * (oR[1] - 3), r, 0.9); }
  for (let i = 0; i < 4; i++) baum(S, x0 + 3 + i * 5, z0 + d - 3, r, 1.0);
  // Arenakeller: kreuzförmige Grube mit Pfeilern und Bohlenresten
  S.quader(cx - 10, 0.3, cz - 1.3, cx + 10, 0.43, cz + 1.3, '#3d3833');
  S.quader(cx - 1.3, 0.3, cz - 6.5, cx + 1.3, 0.43, cz + 6.5, '#3d3833');
  for (let i = -4; i <= 4; i++) if (i) S.box(0.5, 0.8, 0.5, cx + i * 2.2, 0.75, cz + 1.0, '#b9ae97');
  for (let i = 0; i < 5; i++) S.box(2.4, 0.1, 0.35, cx - 9 + i * 0.5, 0.5, cz - 0.6 + i * 0.4, '#9a7a52');
  // Geländer an der Arenakante und am oberen Rundweg
  const ring = (rx, rz, y, n, c) => { for (let i = 0; i < n; i++) { const a0 = (i / n) * 2 * PI, a1 = ((i + 1) / n) * 2 * PI; if (Math.abs(Math.sin(a0)) < Math.sin(spalt) + 0.05 || Math.abs(Math.sin(a1)) < Math.sin(spalt) + 0.05) continue; const pa = [cx + Math.cos(a0) * rx, cz + Math.sin(a0) * rz], pb = [cx + Math.cos(a1) * rx, cz + Math.sin(a1) * rz]; S.box(0.1, 1.1, 0.1, pa[0], y + 0.55, pa[1], c); balken(S, [pa[0], y + 1.1, pa[1]], [pb[0], y + 1.1, pb[1]], 0.08, 0.08, c); } };
  ring(ar[0] + 0.4, ar[1] + 0.4, 3.8, 36, '#5d656c');
  ring(oR[0] - 0.6, oR[1] - 0.6, 3.2 + (stufen - 1) * 2.4 + 0.2, 44, '#5d656c');
  // Torbau am Ostzugang, Kasse, Steinlager, Tafeln, Leuchten
  const tx = cx + oR[0] - 1, F = R(tx + 3, cz + 4, 0, -1, 8);
  S.quader(tx, 0, cz - 4, tx + 3, 6, cz + 4, stein);
  fwand(S, F, 0, 8, 0, 6, 0, 0.4, heller(stein, 0.05), [{ u0: 2.2, u1: 5.8, v0: -0.1, v1: 4.6, bogen: true }]);
  S.quader(tx - 0.3, 6, cz - 4.3, tx + 3.3, 6.5, cz + 4.3, heller(stein, 0.05));
  S.quader(x0 + w - 8, 0.3, cz + 6, x0 + w - 4, 3, cz + 9, '#e9e6de'); S.quader(x0 + w - 8.3, 3, cz + 5.7, x0 + w - 3.7, 3.3, cz + 9.3, '#3f5a4a');
  steinbloecke(S, r, x0 + 4, z0 + 4, 8, stein);
  for (let i = 0; i < 3; i++) infotafel(S, x0 + 8 + i * 6, cz + 3, 0);
  for (let i = 0; i < 4; i++) laterne(S, x0 + 6 + i * 8, cz - 3);
  return { hoehe: 3.2 + (stufen - 1) * 2.4 + 6 };
}

// =====================================================================================
// 8. Industrie am Fluss: Chemie (Ludwigshafen-artig), Tanklager, Hüttenwerk (Saar-Typ), Industriedenkmal
// =====================================================================================
function tank(S, x, z, rad, h, c = '#e6e8e8') {
  zyl(S, rad, rad, h, x, 0.3, z, c, 20);
  const g = new THREE.ConeGeometry(rad + 0.15, rad * 0.25, 20); g.translate(x, h + 0.3 + rad * 0.125, z); S.add(g, dunkler(c, 0.06));
  zyl(S, rad + 0.12, rad + 0.12, 0.3, x, h * 0.5, z, dunkler(c, 0.1), 20);
  const seg = 7;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * PI * 1.4 - PI * 0.2, a1 = ((i + 1) / seg) * PI * 1.4 - PI * 0.2, rr = rad + 0.6;
    balken(S, [x + Math.cos(a0) * rr, 0.3 + (i * h) / seg, z + Math.sin(a0) * rr], [x + Math.cos(a1) * rr, 0.3 + ((i + 1) * h) / seg, z + Math.sin(a1) * rr], 0.8, 0.12, '#c8463c');
  }
  const ring = new THREE.CylinderGeometry(rad + 0.05, rad + 0.05, 1.0, 20, 1, true); ring.translate(x, h + 0.8, z); S.add(ring, '#e8c547');
}
function kugeltank(S, x, z, rad, c = '#eef0ef') {
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI; S.box(0.4, rad + 1, 0.4, x + Math.cos(a) * rad * 0.85, 0.3 + (rad + 1) / 2, z + Math.sin(a) * rad * 0.85, '#7d858c'); }
  S.add(new THREE.SphereGeometry(rad, 18, 12).translate(x, rad * 1.6 + 0.3, z), c);
  zyl(S, rad * 1.02, rad * 1.02, 0.25, x, rad * 1.6 + 0.2, z, '#9aa1a7', 18);
}
function kolonne(S, x, z, rad, h, c = '#cfd3d6') {
  zyl(S, rad, rad, h, x, 0.3, z, c, 12);
  for (let y = 8; y < h; y += 8) { zyl(S, rad + 1.0, rad + 1.0, 0.25, x, y, z, '#e8c547', 12); }
  S.add(new THREE.SphereGeometry(rad, 12, 6, 0, 2 * PI, 0, PI / 2).translate(x, h + 0.3, z), c);
  S.box(0.6, h, 0.6, x + rad + 0.4, 0.3 + h / 2, z, '#e8c547');
}
function kuehlturm(S, x, z, rad, h, c = '#d6d3cc') {
  const pk = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, rr = rad * (0.62 + 0.38 * Math.pow((t - 0.72) / 0.72, 2)); pk.push(new THREE.Vector2(Math.max(rr, rad * 0.62), t * h)); }
  const g = new THREE.LatheGeometry(pk.reverse(), 28); g.translate(x, 0.3, z); S.add(g, c);
  zyl(S, rad * 0.66, rad * 0.66, 0.2, x, h - 1.2, z, '#4a4f55', 20);
  for (let i = 0; i < 14; i++) { const a = (i / 14) * 2 * PI; S.box(0.6, 3, 0.6, x + Math.cos(a) * rad * 0.98, 1.8, z + Math.sin(a) * rad * 0.98, '#9a978f'); }
}
/** Rohrbrücke entlang x oder z mit Stahlportalen und mehreren Rohren. */
function rohrbruecke(S, a0, a1, q, y, achse, farben = ['#9aa1a7', '#e8c547', '#c8463c', '#5f8f6a', '#e6e8e8']) {
  const br = 4, L = a1 - a0;
  for (let u = a0 + 1; u <= a1; u += 8) {
    if (achse === 'x') { for (const s of [-1, 1]) S.box(0.4, y, 0.4, u, 0.3 + y / 2, q + s * br / 2, '#5d656c'); S.box(0.4, 0.5, br + 0.6, u, y + 0.3, q, '#5d656c'); }
    else { for (const s of [-1, 1]) S.box(0.4, y, 0.4, q + s * br / 2, 0.3 + y / 2, u, '#5d656c'); S.box(br + 0.6, 0.5, 0.4, q, y + 0.3, u, '#5d656c'); }
  }
  farben.forEach((f, i) => {
    const off = -br / 2 + 0.4 + (i * (br - 0.8)) / (farben.length - 1), rr = i === 0 ? 0.55 : 0.32;
    if (achse === 'x') stab(S, [a0, y + 0.55 + rr, q + off], [a1, y + 0.55 + rr, q + off], rr, f, 8);
    else stab(S, [q + off, y + 0.55 + rr, a0], [q + off, y + 0.55 + rr, a1], rr, f, 8);
  });
}
/** Backsteinhalle mit Sheddach entlang x. */
function shedhalle(S, scene, p, x0, z0, b, t, H, o = {}) {
  const zg = o.ziegel ?? '#a8664f', hell = '#e4d8c4';
  S.quader(x0, 0, z0, x0 + b, H, z0 + t, zg);
  for (const [k, F] of seiten(p, x0, z0, b, t)) {
    lochwand(S, F, 0, F.L, 0.3, H - 0.6, zg, achsen(0, F.L, 4.2, 0.8).map((u) => ({ u0: u - 1.3, u1: u + 1.3, v0: 1.6, v1: H - 1.6, bogen: true })), { glas: '#5d6f7a', dick: 0.3 });
    fb(S, F, -0.1, F.L + 0.1, H - 0.6, H, 0, 0.4, hell);
    for (const u of achsen(0, F.L, 4.2, 0.8)) fb(S, F, u + 1.75, u + 2.35, 0.3, H - 0.6, 0, 0.45, dunkler(zg, 0.05));
  }
  const n = Math.max(2, Math.round(t / 6)), sb = t / n;
  for (let i = 0; i < n; i++) {
    const F = R(x0, z0 + (i + 1) * sb, 1, 0, b);
    fpoly(S, R(x0 + b, z0 + i * sb, -1, 0, b), [[0, 0], [0, 0], [0, 0]], 0, 0.01, zg);
    const g = new THREE.BoxGeometry(b, 0.3, sb * 1.05); g.rotateX(-0.42); g.translate(x0 + b / 2, H + 1.2, z0 + i * sb + sb / 2); S.add(g, '#7d848a');
    S.quader(x0 + 0.1, H, z0 + (i + 1) * sb - 0.3, x0 + b - 0.1, H + 2.6, z0 + (i + 1) * sb, '#9fb4c0');
  }
}
function schlot(S, x, z, h, rU, rO, c, ringe = '#e9e3d8') {
  zyl(S, rO, rU, h, x, 0.3, z, c, 12);
  for (const f of [0.7, 0.92]) zyl(S, rU + (rO - rU) * f + 0.15, rU + (rO - rU) * f + 0.15, 1.0, x, h * f, z, ringe, 12);
}
function schiff(S, x, z, L, farbe = '#2f3a44') {
  S.quader(x, 0.05, z - 5, x + L, 2.6, z + 5, farbe);
  S.quader(x + L - 0.1, 0.05, z - 3.5, x + L + 4, 2.6, z + 3.5, farbe);
  S.quader(x, 2.6, z - 5, x + L, 2.9, z + 5, '#c8463c');
  S.quader(x + 1, 2.9, z - 4, x + 9, 9, z + 4, '#f2efe6');
  S.quader(x + 1.5, 7.2, z - 4.05, x + 8.5, 8, z + 4.05, GLAS);
  S.box(1.2, 4, 1.2, x + 6, 11, z, '#e3c35e');
  for (let i = 0; i < 4; i++) S.quader(x + 12 + i * (L - 14) / 4, 2.9, z - 2.5, x + 11 + (i + 1) * (L - 14) / 4, 3.6, z + 2.5, '#5d656c');
  stab(S, [x + 11, 4, z], [x + L - 1, 4, z], 0.3, '#9aa1a7');
}
function fluss(S, p, x0, z0, w, d, uferZ) {
  S.quader(x0, 0, uferZ, x0 + w, 0.28, z0 + d, FARBEN.wasser);
  S.quader(x0, 0, uferZ - 1.2, x0 + w, 0.62, uferZ, '#b9b1a1');
  S.quader(x0, 0.62, uferZ - 1.2, x0 + w, 0.75, uferZ - 0.2, '#d4cdbd');
}
/** Hochofen mit Gerüst, Gichtbühne, Staubsack und Winderhitzern. */
function hochofen(S, p, r, x, z, o) {
  const c = o.stahl, rost = o.rost, H = 34;
  // Gießhalle
  S.quader(x - 11, 0, z - 6, x + 11, 9, z + 8, o.halle);
  S.add(dachProfil(22, 14, 3, 0.3, 'x').translate(x, 9, z + 1), dunkler(o.halle, 0.12));
  for (const [k, F] of seiten(p, x - 11, z - 6, 22, 14)) for (const u of achsen(0, F.L, 3.2, 0.5)) fb(S, F, u - 0.8, u + 0.8, 4, 8, 0, 0.05, '#3a3634');
  // Ofen und Gerüst
  zyl(S, 4.2, 5.4, 18, x, 9, z, rost, 14);
  zyl(S, 3.2, 4.2, 8, x, 27, z, rost, 14);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) S.box(0.8, H, 0.8, x + sx * 6, 0.3 + H / 2, z + sz * 6, c);
  for (let y = 12; y <= H; y += 7.5) { S.quader(x - 6.6, y, z - 6.6, x + 6.6, y + 0.4, z + 6.6, c); }
  S.quader(x - 4, H, z - 4, x + 4, H + 5, z + 4, c);
  S.quader(x - 4.5, H + 5, z - 4.5, x + 4.5, H + 5.6, z + 4.5, dunkler(c, 0.05));
  // Gasabzugsrohre und Staubsack
  for (const s of [-1, 1]) stab(S, [x + s * 2, H + 5, z], [x + s * 2, H + 10, z], 0.9, rost, 8);
  stab(S, [x - 2, H + 10, z], [x + 2, H + 10, z], 0.9, rost, 8);
  const sx = x + 14;
  zyl(S, 3.6, 3.6, 10, sx, 14, z, rost, 12);
  const g = new THREE.ConeGeometry(3.6, 6, 12); g.rotateX(PI); g.translate(sx, 11, z); S.add(g, rost);
  for (let i = 0; i < 3; i++) S.box(0.6, 11, 0.6, sx + Math.cos(i * 2.1) * 3, 5.8, z + Math.sin(i * 2.1) * 3, c);
  stab(S, [x + 2, H + 10, z], [sx, 24, z], 1.0, rost, 8);
  // Winderhitzer (Cowper) in einer Reihe hinter dem Ofen
  const cz = z - 15;
  for (let i = 0; i < 3; i++) {
    const cx2 = x - 9 + i * 9;
    zyl(S, 3.6, 3.6, 28, cx2, 0.3, cz, o.cowper, 16);
    S.add(new THREE.SphereGeometry(3.6, 14, 8, 0, 2 * PI, 0, PI / 2).translate(cx2, 28.3, cz), o.cowper);
    for (const y of [8, 18]) zyl(S, 3.75, 3.75, 0.4, cx2, y, cz, c, 16);
  }
  stab(S, [x - 12, 22, cz + 4.5], [sx + 2, 22, cz + 4.5], 1.4, rost, 10);
  stab(S, [sx, 14, z], [sx, 22, cz + 4.5], 1.1, rost, 8);
  for (let xx = x - 10; xx <= sx; xx += 8) S.box(0.6, 22, 0.6, xx, 11.3, cz + 4.5, c);
  // Schrägaufzug von vorn auf die Gicht
  const a = [x - 4, 2, z + 26], b = [x - 1, H + 3, z + 3];
  for (const s of [-1, 1]) balken(S, [a[0] + s * 1.6, a[1], a[2]], [b[0] + s * 1.6, b[1], b[2]], 0.5, 0.8, c);
  for (let i = 1; i < 8; i++) { const t = i / 8; S.box(3.6, 0.3, 0.4, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, c); S.box(0.3, (b[1] - a[1]) * t, 0.3, a[0] + (b[0] - a[0]) * t - 1.6, 0.3 + (b[1] - a[1]) * t / 2, a[2] + (b[2] - a[2]) * t, c); }
  return H + 11;
}
function industrieRoh(S, scene, p) {
  const r = rng(`ind:${p.seed}`), v = p.variante, { x: x0, z: z0, w, d } = p;
  const ufer = z0 + d - 14;
  boden(S, x0, z0, x0 + w, ufer - 1.2, '#c4c0b6', 0.3, 0.06);
  fluss(S, p, x0, z0, w, d, ufer);
  let hmax = 0;
  if (v === 'chemie' || v === 'tanklager') {
    const tl = v === 'tanklager';
    // Rohrbrücken als Rückgrat
    rohrbruecke(S, x0 + 4, x0 + w - 4, ufer - 10, 6, 'x');
    rohrbruecke(S, z0 + 6, ufer - 12, x0 + w * 0.48, 6, 'z');
    if (!tl) rohrbruecke(S, z0 + 6, ufer - 12, x0 + w * 0.78, 9, 'z', ['#9aa1a7', '#e6e8e8', '#e8c547']);
    // Tankfeld links
    const tx1 = x0 + w * 0.46;
    for (let i = 0; i < (tl ? 4 : 3); i++) for (let k = 0; k < 2; k++) {
      const rad = tl ? 6.5 : 5.2, tx = x0 + 10 + i * (rad * 2 + 3), tz = z0 + 12 + k * (rad * 2 + 4);
      if (tx + rad > tx1) continue;
      tank(S, tx, tz, rad, zw(r, 8, 13), r() < 0.2 ? '#d9dcd8' : '#e6e8e8');
      S.quader(tx - rad - 1.2, 0.3, tz - rad - 1.2, tx + rad + 1.2, 1.2, tz - rad - 0.8, '#b9b5ad');
      S.quader(tx - rad - 1.2, 0.3, tz + rad + 0.8, tx + rad + 1.2, 1.2, tz + rad + 1.2, '#b9b5ad');
    }
    if (tl) {
      for (let i = 0; i < 3; i++) kugeltank(S, x0 + w * 0.56 + i * 12, z0 + 14, 5);
      for (let i = 0; i < 3; i++) tank(S, x0 + w * 0.56 + i * 14, z0 + 34, 6, 14);
      // Gleis mit Kesselwagen und Verladestation
      const gz = ufer - 20;
      S.quader(x0 + 2, 0.3, gz - 1.5, x0 + w - 2, 0.45, gz + 1.5, '#9a8f80');
      for (const s of [-0.75, 0.75]) S.quader(x0 + 2, 0.45, gz + s - 0.07, x0 + w - 2, 0.6, gz + s + 0.07, '#6a6e72');
      for (let i = 0; i < 8; i++) { const kx = x0 + 10 + i * 13; S.quader(kx - 5.5, 0.8, gz - 1.3, kx + 5.5, 1.4, gz + 1.3, '#3b4046'); stab(S, [kx - 5, 2.8, gz], [kx + 5, 2.8, gz], 1.4, i % 3 ? '#e6e8e8' : '#c9cdd0', 12); }
      S.quader(x0 + w * 0.5, 0.3, gz - 4, x0 + w * 0.5 + 0.6, 9, gz - 3.4, '#5d656c');
      S.quader(x0 + w * 0.5 - 6, 8.5, gz - 4, x0 + w * 0.5 + 6, 9, gz + 2, '#e8c547');
      hmax = 18;
    } else {
      // Kolonnen, Kühltürme, Shedhalle, Fackel, Verwaltung
      for (let i = 0; i < 4; i++) kolonne(S, x0 + w * 0.56 + i * 5.5, z0 + 14 + (i % 2) * 6, 1.4 + (i % 2) * 0.6, 28 + i * 6);
      kuehlturm(S, x0 + w * 0.88, z0 + 18, 11, 38);
      kuehlturm(S, x0 + w * 0.66, z0 + 40, 9, 30);
      shedhalle(S, scene, p, x0 + 6, ufer - 34, 40, 18, 9);
      schlot(S, x0 + 50, ufer - 26, 52, 2.4, 1.6, '#a8664f');
      zyl(S, 0.4, 0.5, 40, x0 + w - 8, 0.3, z0 + 6, '#c8463c', 6);
      const fl = new THREE.ConeGeometry(1.2, 4, 6); fl.translate(x0 + w - 8, 42.3, z0 + 6); S.add(fl, '#f0a03a');
      // Verwaltungsbau mit Werksname
      const vx0 = x0 + w * 0.58, vz0 = ufer - 28, vb = 30, vt = 12;
      S.quader(vx0, 0, vz0, vx0 + vb, 14, vz0 + vt, '#e9e3d6');
      for (const [k, F] of seiten(p, vx0, vz0, vb, vt)) { for (let i = 0; i < 3; i++) fb(S, F, 0.5, F.L - 0.5, 2 + i * 4, 4.2 + i * 4, 0, 0.05, GLAS); fb(S, F, -0.1, F.L + 0.1, 13.4, 14, 0, 0.3, '#c9c3b6'); if (k === '+z') { const tb = Math.min(F.L - 3, 26), u0 = (F.L - tb) / 2; fb(S, F, u0, u0 + tb, 14.0, 17.2, -0.5, -0.3, '#2f5e52'); for (const u of [u0 + 1.5, u0 + tb - 1.5]) fb(S, F, u - 0.12, u + 0.12, 13.6, 14.0, -0.5, -0.3, '#4a4f55'); ftext(scene, F, 'Chemiewerk Rheinau', F.L / 2, 15.6, -0.25, 2.3, tb - 1.2, '#ffffff'); } }
      for (let i = 0; i < 2; i++) S.quader(vx0 + 1 + i * 26, 14, vz0 + vt - 1, vx0 + 3 + i * 26, 18.6, vz0 + vt, '#c9c3b6');
      hmax = 52;
    }
    // Hafen: Kaimauer, Kran, Schiff
    schiff(S, x0 + 20, ufer + 7, 60, tl ? '#3d5a3f' : '#2f3a44');
    for (let i = 0; i < 3; i++) { const kx = x0 + w * 0.7 + i * 12; S.box(0.5, 10, 0.5, kx, 5.3, ufer - 2.5, '#e8c547'); balken(S, [kx, 10, ufer - 2.5], [kx + 5, 12, ufer + 5], 0.5, 0.6, '#e8c547'); }
    // Sammelleitung zum Tankfeld mit Abzweigen
    stab(S, [x0 + 5, 2.2, z0 + 19.5], [x0 + 66, 2.2, z0 + 19.5], 0.35, '#9aa1a7', 8);
    stab(S, [x0 + 66, 2.2, z0 + 19.5], [x0 + 66, 6.9, z0 + 19.5], 0.35, '#9aa1a7', 8);
    for (let i = 0; i < 3; i++) for (const s2 of [-1, 1]) { const tx = x0 + 10 + i * (tl ? 16 : 13.4); if (tx > x0 + w * 0.46 - 5) continue; stab(S, [tx, 2.2, z0 + 19.5], [tx, 1.0, z0 + 19.5 + s2 * 2.2], 0.25, '#c8463c', 6); }
    // Werkstraßen, Parkplatz, Pforte, Umspannwerk
    boden(S, x0 + 4, z0 + 47.5, x0 + w * 0.76, z0 + 51, '#8d939a', 0.3, 0.09);
    for (let x = x0 + 6; x < x0 + w * 0.76 - 2; x += 6) S.quader(x, 0.39, z0 + 49.15, x + 3, 0.41, z0 + 49.35, '#f2f1ec');
    autoReihe(S, r, x0 + w * 0.58, x0 + w * 0.8, ufer - 13.5, 0, 0.75);
    S.quader(x0 + w - 26, 0.3, ufer - 24, x0 + w - 18, 3.6, ufer - 18, '#e9e3d6');
    for (const [k, F] of seiten(p, x0 + w - 26, ufer - 24, 8, 6)) fb(S, F, 0.6, F.L - 0.6, 1.4, 2.8, 0, 0.05, GLAS);
    S.quader(x0 + w - 26.5, 3.6, ufer - 24.5, x0 + w - 17.5, 3.9, ufer - 17.5, '#c8463c');
    S.box(6, 0.15, 0.15, x0 + w - 21, 1.3, ufer - 15.5, '#c8463c');
    const ux0 = x0 + w - 14, uz0 = ufer - 30;
    for (let i = 0; i < 3; i++) { S.quader(ux0 + i * 3.5, 0.3, uz0, ux0 + i * 3.5 + 2.4, 3.2, uz0 + 3, '#7d858c'); for (let k = 0; k < 3; k++) zyl(S, 0.15, 0.25, 1.4, ux0 + i * 3.5 + 0.6 + k * 0.6, 3.2, uz0 + 1.5, '#c9a36a', 6); }
    for (const [a, b] of [[[ux0 - 1, uz0 - 1], [ux0 + 11, uz0 - 1]], [[ux0 + 11, uz0 - 1], [ux0 + 11, uz0 + 4.5]], [[ux0 + 11, uz0 + 4.5], [ux0 - 1, uz0 + 4.5]], [[ux0 - 1, uz0 + 4.5], [ux0 - 1, uz0 - 1]]]) gelaender(S, a, b, 0.3, '#9aa1a7', 1.8);
    if (tl) {
      anlage(S, r, x0 + w - 28, z0 + 6, 22, 14, 2, {});
      S.quader(x0 + w - 30, 6, ufer - 30, x0 + w - 16, 6.3, ufer - 46, '#e8c547');
      S.quader(x0 + w - 30, 6, ufer - 46, x0 + w - 16, 6.3, ufer - 30, '#e8c547');
      for (const [xx, zz] of [[x0 + w - 29.5, ufer - 45.5], [x0 + w - 16.5, ufer - 45.5], [x0 + w - 29.5, ufer - 30.5], [x0 + w - 16.5, ufer - 30.5]]) S.box(0.3, 5.7, 0.3, xx, 3.15, zz, '#5d656c');
      for (let i = 0; i < 3; i++) tankwagen(S, x0 + w - 23, ufer - 43 + i * 4.6, 0);
      ziegelbau(S, p, x0 + w - 48, ufer - 46, 14, 10, 7.5, '#a8664f', {});
      for (let i = 0; i < 3; i++) leiter(S, x0 + w * 0.56 + i * 14 + 6.1, z0 + 34, 0.3, 14, PI / 2);
      hmax = Math.max(hmax, 18);
    } else {
      anlage(S, r, x0 + w - 28, z0 + 33, 22, 18, 3, {});
      anlage(S, r, x0 + 46, z0 + 6, 18, 16, 3, {});
      for (let i = 0; i < 4; i++) leiter(S, x0 + w * 0.56 + i * 5.5 - (1.4 + (i % 2) * 0.6) - 0.3, z0 + 14 + (i % 2) * 6, 0.3, 28 + i * 6, 0);
      // Zellenkühler
      for (let i = 0; i < 6; i++) { const zx = x0 + 6 + i * 6; S.quader(zx, 0.3, z0 + 38, zx + 5.6, 6, z0 + 45, '#c9cdd0'); zyl(S, 2.2, 2.4, 1.6, zx + 2.8, 6, z0 + 41.5, '#7d858c', 14); zyl(S, 2.0, 2.0, 0.2, zx + 2.8, 7.5, z0 + 41.5, '#3b4046', 14); for (const [k, F] of seiten(p, zx, z0 + 38, 5.6, 7, ['+z', '-z'])) for (const u of [1.2, 2.8, 4.4]) fb(S, F, u - 0.5, u + 0.5, 1.0, 5.0, 0, 0.05, '#7d858c'); }
      ziegelbau(S, p, x0 + 70, ufer - 34, 9, 10, 11, '#a8664f', {});
      gelaender(S, [x0 + 81, ufer - 28], [x0 + 111, ufer - 28], 14, '#9aa1a7', 2.0);
      hmax = Math.max(hmax, 52);
    }
    return { hoehe: hmax };
  }
  // Hüttenwerk (aktiv) oder Industriedenkmal
  const denkmal = v === 'denkmal';
  const o = denkmal ? { stahl: '#6b4a3a', rost: '#8a5a3c', halle: '#7a5040', cowper: '#7a4e36' } : { stahl: '#4f5358', rost: '#6d6258', halle: '#8a6a58', cowper: '#5d6268' };
  hmax = hochofen(S, p, r, x0 + 32, z0 + 34, o);
  hmax = Math.max(hmax, hochofen(S, p, r, x0 + 78, z0 + 34, o));
  // Gebläsehalle aus Backstein
  const gx0 = x0 + w - 36, gz0 = z0 + 8, gb = 30, gt = 16, Hg = 14, zg = denkmal ? '#9a5a44' : '#a8664f';
  S.quader(gx0, 0, gz0, gx0 + gb, Hg, gz0 + gt, zg);
  for (const [k, F] of seiten(p, gx0, gz0, gb, gt)) lochwand(S, F, 0, F.L, 0.3, Hg, zg, achsen(0, F.L, 4, 0.8).map((u) => ({ u0: u - 1.2, u1: u + 1.2, v0: 2, v1: Hg - 2, bogen: true })), { glas: '#4d5a62' });
  satteldach(S, gx0, gz0, gx0 + gb, gz0 + gt, Hg, 4, 'x', '#6d7276', zg, 0.4);
  for (let i = 0; i < 2; i++) schlot(S, gx0 + 6 + i * 18, gz0 + gt + 6, 46, 2.2, 1.5, zg, denkmal ? '#c9b9a0' : '#e9e3d8');
  // Möllerhalle / Erzbunker entlang der Rückseite
  S.quader(x0 + 6, 0, z0 + 2, x0 + 100, 8, z0 + 10, o.stahl);
  for (let x = x0 + 8; x < x0 + 100; x += 6) S.quader(x, 8, z0 + 3, x + 4.6, 10.5, z0 + 9, dunkler(o.rost, 0.05));
  // Gichtgashauptleitung über das Gelände
  stab(S, [x0 + 4, 16, z0 + 22], [x0 + w - 4, 16, z0 + 22], 1.6, o.rost, 10);
  for (let x = x0 + 8; x < x0 + w - 4; x += 10) S.box(0.6, 16, 0.6, x, 8.3, z0 + 22, o.stahl);
  // Kai mit Schiff, Gleis
  schiff(S, x0 + 50, ufer + 7, 50, '#4a3f36');
  S.quader(x0 + 2, 0.3, ufer - 6, x0 + w - 2, 0.45, ufer - 3, '#9a8f80');
  for (let i = 0; i < 6; i++) { const wx = x0 + 10 + i * 11; S.quader(wx - 4.5, 0.8, ufer - 5.8, wx + 4.5, 3.4, ufer - 3.2, denkmal ? '#7a4e36' : '#3b4046'); }
  if (denkmal) {
    for (let i = 0; i < 26; i++) busch(S, zw(r, x0 + 4, x0 + w - 4), zw(r, z0 + 12, ufer - 8), r, zw(r, 0.8, 1.6));
    for (let i = 0; i < 8; i++) baum(S, zw(r, x0 + 4, x0 + w - 40), zw(r, ufer - 18, ufer - 8), r, zw(r, 0.9, 1.2));
    // Besuchersteg in Signalfarbe
    balken(S, [x0 + 10, 1, ufer - 10], [x0 + 26, 20, z0 + 34], 1.4, 0.3, '#e8c547');
    S.quader(x0 + 24, 19.8, z0 + 26, x0 + 40, 20.2, z0 + 28, '#e8c547');
    const FS = R(x0 + 4, ufer - 1.4, 1, 0, 30);
    S.quader(x0 + 4, 0.3, ufer - 1.6, x0 + 34, 3.4, ufer - 1.2, '#3f4a53');
    ftext(scene, FS, 'Industriedenkmal Hütte Saarwald', 15, 1.9, 0.02, 1.4, 28, '#f2efe6');
  } else {
    // Dampfwolken über den Öfen
    for (const x of [x0 + 32, x0 + 78]) for (let i = 0; i < 3; i++) { const g = new THREE.IcosahedronGeometry(3 + i, 0); g.translate(x + i * 2.5, 50 + i * 3.5, z0 + 34 - i); S.add(g, '#f2f2f0'); }
  }
  // Plattformgeländer, Steigleitern an den Winderhitzern
  for (const hx of [x0 + 32, x0 + 78]) {
    for (let y = 12; y <= 34; y += 7.5) gelaender(S, [hx - 6.6, z0 + 40.6], [hx + 6.6, z0 + 40.6], y + 0.4, denkmal ? '#c9a24a' : '#e8c547', 1.65);
    for (let i = 0; i < 3; i++) leiter(S, hx - 9 + i * 9 + 3.7, z0 + 19, 0.3, 28, 0, o.stahl, 1.4);
  }
  // Gasometer (Scheibengasbehälter)
  const gx = x0 + 120, gz = z0 + 52, gr = 10.5, gH = 34;
  zyl(S, gr, gr, gH, gx, 0.3, gz, denkmal ? '#7a6a5a' : '#6f777e', 16);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * PI + PI / 16, nx = Math.cos(a), nz = Math.sin(a); if (sieht(p, nx, nz)) S.box(0.5, gH, 0.5, gx + nx * (gr + 0.2), 0.3 + gH / 2, gz + nz * (gr + 0.2), o.stahl); }
  for (const y of [gH * 0.33, gH * 0.66]) zyl(S, gr + 0.4, gr + 0.4, 0.5, gx, y, gz, o.stahl, 16);
  const gd = new THREE.ConeGeometry(gr + 0.3, 3, 16); gd.translate(gx, gH + 1.8, gz); S.add(gd, dunkler(o.rost, 0.05));
  const gring = new THREE.CylinderGeometry(gr + 0.05, gr + 0.05, 1.0, 16, 1, true); gring.translate(gx, gH + 0.8, gz); S.add(gring, o.stahl);
  for (let i = 0; i < 8; i++) { const a0 = PI * 0.15 + (i / 8) * PI * 0.7, a1 = PI * 0.15 + ((i + 1) / 8) * PI * 0.7, rr = gr + 0.9; balken(S, [gx + Math.cos(a0) * rr, 0.3 + (i * gH) / 8, gz + Math.sin(a0) * rr], [gx + Math.cos(a1) * rr, 0.3 + ((i + 1) * gH) / 8, gz + Math.sin(a1) * rr], 0.9, 0.15, o.stahl); }
  // Erzhalden mit Portalkran, Bandbrücke zum Bunker
  const halden = ['#7a4a3a', '#3a3634', '#8a6a4a', '#6b5a50', '#3a3634'];
  for (let i = 0; i < 5; i++) { const g = new THREE.ConeGeometry(5.2, 5.5, 7); g.translate(x0 + 10 + i * 11, 3.05, z0 + 70); S.add(g, halden[i]); }
  for (const xx of [x0 + 5, x0 + 63]) for (const zz of [z0 + 64, z0 + 76]) S.box(0.6, 12, 0.6, xx, 6.3, zz, o.stahl);
  S.quader(x0 + 4, 12, z0 + 63.5, x0 + 64, 13.2, z0 + 64.5, o.stahl); S.quader(x0 + 4, 12, z0 + 75.5, x0 + 64, 13.2, z0 + 76.5, o.stahl);
  S.quader(x0 + 30, 13.2, z0 + 63.5, x0 + 33, 15, z0 + 76.5, denkmal ? '#9a6a3a' : '#e8c547');
  balken(S, [x0 + 94, 3, z0 + 74], [x0 + 94, 12.5, z0 + 11], 3, 3, denkmal ? '#7a6a5a' : '#8d939a');
  for (let z = z0 + 18; z < z0 + 72; z += 11) { const yy = 3 + ((z0 + 74 - z) / 63) * 9.5; S.box(0.5, yy, 0.5, x0 + 92.8, 0.3 + yy / 2, z, o.stahl); S.box(0.5, yy, 0.5, x0 + 95.2, 0.3 + yy / 2, z, o.stahl); }
  // Verwaltung mit Werksnamen, Schlackenwagen
  ziegelbau(S, p, x0 + 102, z0 + 66, 32, 10, 11, denkmal ? '#9a5a44' : '#a8664f', {});
  for (const [k, F] of seiten(p, x0 + 102, z0 + 66, 32, 10, ['+z'])) ftext(scene, F, denkmal ? 'Besucherzentrum' : 'Saarwald Hütte', 16, 11.9, 0.2, 1.4, 22, denkmal ? '#e8c547' : '#f2efe6', denkmal ? null : '#5a3a2e');
  for (let i = 0; i < 4; i++) { const sx = x0 + 74 + i * 6; S.quader(sx - 2, 0.6, ufer - 5.6, sx + 2, 1.4, ufer - 3.4, '#3b4046'); const g = new THREE.CylinderGeometry(1.5, 1.0, 1.8, 10); g.translate(sx, 2.3, ufer - 4.5); S.add(g, denkmal ? '#6b4a3a' : '#4a4440'); }
  if (!denkmal) {
    // GESTALTUNG.md: Werkshof nicht leer: Walzwerkhallen mit Sheddach und Werksgleis davor
    for (const [hz0, hz1] of [[z0 + 20, z0 + 36], [z0 + 40, z0 + 54]]) {
      S.quader(x0 + 42, 0.3, hz0, x0 + 88, 9.5, hz1, '#8e8a82');
      for (let u = x0 + 43; u < x0 + 87; u += 3.6) { S.quader(u, 9.5, hz0 + 0.5, u + 2.6, 11, hz1 - 0.5, '#6f6a63'); S.quader(u + 2.6, 9.5, hz0 + 0.5, u + 3.0, 11, hz1 - 0.5, '#b9c4c9'); }
      for (let u = x0 + 46; u < x0 + 86; u += 6) S.box(3, 4, 0.1, u, 2.3, hz1 + 0.05, '#4c5359');
      S.quader(x0 + 42, 0.3, hz1 + 0.6, x0 + 88, 0.45, hz1 + 2.4, '#6d6860');
    }
  }
  if (denkmal) {
    for (let i = 0; i < 10; i++) { const bx = zw(r, x0 + 4, x0 + 100), bz = zw(r, z0 + 12, z0 + 30); S.box(0.3, 3, 0.3, bx, 1.8, bz, '#efe9dc'); const g = new THREE.IcosahedronGeometry(1.4, 0); g.scale(0.8, 1.3, 0.8); g.translate(bx, 4.4, bz); S.add(g, '#a8c86a'); }
    for (let x = x0 + 8; x < x0 + 98; x += 7) S.quader(x, 10.5, z0 + 3.5, x + zw(r, 2, 4), 11.2, z0 + 8.5, '#7fae5a');
    for (let i = 0; i < 4; i++) infotafel(S, x0 + 12 + i * 22, z0 + 58, 0, '#e8c547');
    gelaender(S, [x0 + 24, z0 + 26], [x0 + 40, z0 + 26], 20.2, '#e8c547', 1.6); gelaender(S, [x0 + 24, z0 + 28], [x0 + 40, z0 + 28], 20.2, '#e8c547', 1.6);
  }
  return { hoehe: hmax + 8 };
}

// =====================================================================================
// 9. Weinort an Rhein oder Mosel mit Weinbergen und Burgruine
// =====================================================================================
function winzerhaus(S, scene, p, r, x0, z0, b, t, o = {}) {
  const n = o.n ?? 2, eg = 3.2, gh = 2.9, H = eg + n * gh, wand = o.wand ?? waehle(r, ['#f1e6cf', '#efd9b8', '#e9e2d4', '#f0dcc8', '#e8d6a8', '#f3ece0']);
  const stein = waehle(r, ['#c9b292', '#b9a283', '#a89a88']), laeden = waehle(r, LAEDEN);
  S.quader(x0, 0, z0, x0 + b, H, z0 + t, wand);
  for (const [k, F] of seiten(p, x0, z0, b, t)) {
    const frei = k === '+z' || k === '-z' || o.frei?.includes(k);
    if (!frei) { fb(S, F, 0, F.L, eg, H, 0, 0.04, SCHIEFER); continue; }
    fb(S, F, -0.02, F.L + 0.02, 0, 0.7, 0, 0.12, stein);
    const ax = achsen(0, F.L, 2.5, 0.9);
    ax.forEach((u, i) => {
      if (i === 0 && k === '+z') { fwand(S, F, u - 1.1, u + 1.1, 0.3, 2.8, 0, 0.18, stein, [{ u0: u - 0.8, u1: u + 0.8, v0: 0.29, v1: 2.5, bogen: true }]); fb(S, F, u - 0.8, u + 0.8, 0.3, 2.0, 0.02, 0.08, '#5a3a2e'); }
      else fenster(S, F, u, 1.1, 0.9, 1.3, { kreuz: true, laeden, sims: stein });
      for (let kk = 0; kk < n; kk++) fenster(S, F, u, eg + kk * gh + 0.75, 0.9, 1.35, { kreuz: true, laeden, sims: WEISS });
    });
    fb(S, F, -0.1, F.L + 0.1, H - 0.25, H, 0, 0.3, WEISS);
    if (k === '+z' && o.schild) { const [sx, sz] = wp(F, F.L - 1.0, 0.8); S.box(0.08, 0.08, 1.5, sx, eg + 0.4, sz - 0.4, '#3b3f44'); ftext(scene, F, o.schild, F.L / 2 + 0.6, eg - 0.3, 0.06, 0.5, F.L * 0.7, '#5a2a24'); }
  }
  const hg = t * 0.62;
  satteldach(S, x0, z0 - 0.2, x0 + b, z0 + t + 0.2, H, hg, 'x', SCHIEFER, wand, 0.4);
  for (const [k, F] of seiten(p, x0, z0, b, t, ['+x', '-x'])) {
    if (o.frei?.includes(k)) { fpoly(S, F, [[0.1, H], [F.L - 0.1, H], [F.L / 2, H + hg - 0.15]], 0, 0.05, SCHIEFER); fenster(S, F, F.L / 2, H + 0.6, 0.7, 1.0, { t: 0.05 }); }
    else fpoly(S, F, [[0.1, H], [F.L - 0.1, H], [F.L / 2, H + hg - 0.15]], 0, 0.05, SCHIEFER);
  }
  // Gauben
  for (const [k, F] of seiten(p, x0, z0 - 0.2, b, t + 0.4, ['+z', '-z'])) for (const u of achsen(0, F.L, 3.6, 1.6)) {
    const ys = H + 0.9;
    fb(S, F, u - 0.7, u + 0.7, ys - 0.5, ys + 1.2, -2.4, -0.7, wand);
    fb(S, F, u - 0.4, u + 0.4, ys - 0.2, ys + 0.9, -0.75, -0.65, GLAS);
    const g = new THREE.BoxGeometry(1.7, 0.12, 2.2); g.rotateX(0.35); g.translate(u, ys + 1.45, -1.5); fgeo(S, F, g, SCHIEFER);
  }
  return H + hg;
}
/** Kirche mit Spitzturm (Dorfkirche). */
function dorfkirche(S, p, r, x0, z0, b, t) {
  const wand = '#efe8da', H = 9;
  S.quader(x0, 0, z0, x0 + b, H, z0 + t, wand);
  for (const [k, F] of seiten(p, x0, z0, b, t)) { lochwand(S, F, 0, F.L, 0.3, H, wand, achsen(0, F.L, 3.6, 1.0).map((u) => ({ u0: u - 0.6, u1: u + 0.6, v0: 2.5, v1: 7.2, bogen: 'spitz' })), { dick: 0.2 }); fb(S, F, -0.05, F.L + 0.05, 0.3, 0.9, 0, 0.15, '#c9b292'); }
  satteldach(S, x0, z0 - 0.3, x0 + b, z0 + t + 0.3, H, 6, 'x', SCHIEFER, wand, 0.3);
  const ts = 4.6, tx0 = x0 + b - 1, tz0 = z0 + (t - ts) / 2, Ht = 19;
  S.quader(tx0, 0, tz0, tx0 + ts, Ht, tz0 + ts, wand);
  for (const [k, F] of seiten(p, tx0, tz0, ts, ts)) { lochwand(S, F, 0, ts, Ht - 4, Ht, wand, [{ u0: ts / 2 - 0.6, u1: ts / 2 + 0.6, v0: Ht - 3.5, v1: Ht - 0.6, bogen: 'spitz' }], { dick: 0.15 }); fscheibe(S, F, ts / 2, Ht - 5.2, 0, 0.12, 0.7, '#2b3036'); fb(S, F, ts / 2 - 0.45, ts / 2 + 0.45, 1.5, 4.0, 0, 0.08, GLAS); }
  const g = new THREE.ConeGeometry(ts * 0.72, 13, 8); g.rotateY(PI / 8); g.translate(tx0 + ts / 2, Ht + 6.5, tz0 + ts / 2); S.add(g, SCHIEFER);
  zyl(S, 0.04, 0.1, 1.6, tx0 + ts / 2, Ht + 13, tz0 + ts / 2, '#d8b45a', 4);
  return Ht + 14.6;
}
/** Burgruine: Bergfried, Ringmauer mit Zinnenresten, Palas mit Fensterhöhlen. */
function burgruine(S, p, r, cx, cz, y0, o = {}) {
  const c = o.stein ?? '#b8ab95', hell = heller(c, 0.06);
  // Bergfried
  const rund = o.rund ?? r() < 0.5, Hb = 20;
  if (rund) { zyl(S, 3.4, 3.6, Hb, cx, y0, cz, c, 14); for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI; S.box(1.0, zw(r, 0.6, 1.8), 1.0, cx + Math.cos(a) * 3.2, y0 + Hb + 0.5, cz + Math.sin(a) * 3.2, c, -a); } }
  else { S.quader(cx - 3.2, y0, cz - 3.2, cx + 3.2, y0 + Hb, cz + 3.2, c); for (const [k, F] of seiten(p, cx - 3.2, cz - 3.2, 6.4, 6.4)) { ruinenKrone(S, F, 0, 6.4, y0 + Hb, r, c, -0.8, 0, 1.6); fb(S, F, 2.8, 3.6, y0 + 12, y0 + 13.6, 0, 0.05, '#2f2a28'); } }
  // Ringmauer
  const mb = 22, mt = 14, mx0 = cx - 5, mz0 = cz - 4;
  for (const [k, F] of Object.entries(vierSeiten(mx0, mz0, mb, mt))) {
    const h = k === '-z' ? 7 : 5;
    fb(S, F, 0, F.L, y0, y0 + h, -1.2, 0, c);
    if (sichtF(p, F)) { ruinenKrone(S, F, 0, F.L, y0 + h, r, c, -1.2, 0, 1.4); for (const u of achsen(0, F.L, 6, 1)) fb(S, F, u - 0.15, u + 0.15, y0 + 1.5, y0 + 2.5, 0, 0.05, '#2f2a28'); }
  }
  // Palas mit Fensterhöhlen
  const FP = R(mx0 + 9, mz0 + mt - 3, 1, 0, 12);
  fwand(S, FP, 0, 12, y0, y0 + 11, -1.0, 0, c, [{ u0: 1.5, u1: 3, v0: y0 + 2, v1: y0 + 4.5, bogen: true }, { u0: 5, u1: 6.5, v0: y0 + 2, v1: y0 + 4.5, bogen: true }, { u0: 8.5, u1: 10, v0: y0 + 2, v1: y0 + 4.5, bogen: true }, { u0: 2, u1: 4.2, v0: y0 + 6.5, v1: y0 + 9.5, bogen: true }, { u0: 7.4, u1: 9.6, v0: y0 + 6.5, v1: y0 + 9.5, bogen: true }]);
  ruinenKrone(S, FP, 0, 12, y0 + 11, r, c, -1.0, 0, 2.4);
  fb(S, FP, -0.1, 12.1, y0 + 5.6, y0 + 5.9, 0, 0.25, hell);
  const fahne = o.fahne ?? true;
  if (fahne) { S.box(0.1, 4, 0.1, cx, y0 + Hb + 2.5, cz, '#3b3f44'); S.box(0.05, 1.0, 1.6, cx, y0 + Hb + 3.9, cz + 0.8, '#c8463c'); }
  return y0 + Hb + 5;
}
function weinortRoh(S, scene, p) {
  const r = rng(`wein:${p.seed}`), v = p.variante, { x: x0, z: z0, w, d } = p;
  const mosel = v === 'mosel', hof = v === 'winzerhof';
  const ufer = hof ? z0 + d : z0 + d - 12, prom = hof ? z0 + d - 3 : ufer - 8, ht = 13, hz0 = prom - ht - 1;
  boden(S, x0, z0, x0 + w, ufer, PFLASTER, 0.3, 0.07);
  if (!hof) {
    fluss(S, p, x0, z0, w, d, ufer);
    boden(S, x0, prom, x0 + w, ufer - 1.2, '#d6d0c2', 0.3, 0.1);
    baumreihe(S, r, x0 + 2, x0 + w - 2, prom + 3.5, 9, 0.95);
    for (let i = 0; i < 3; i++) bank(S, x0 + 8 + i * 26, prom + 5.5);
    // Ausflugsschiff
    S.quader(x0 + w * 0.4, 0.05, ufer + 3, x0 + w * 0.4 + 28, 1.9, ufer + 8.5, '#f2efe6');
    S.quader(x0 + w * 0.4 + 3, 1.9, ufer + 3.6, x0 + w * 0.4 + 24, 4.2, ufer + 7.9, GLAS_HELL);
    S.quader(x0 + w * 0.4 + 2.6, 4.2, ufer + 3.3, x0 + w * 0.4 + 24.4, 4.5, ufer + 8.2, '#2f6f8f');
  }
  // Weinberg als glatter Hang (gelaende.js): steigt von der Häuserzeile zur Kuppe mit dem Burgplateau, flacht zu den
  // Seiten weich ab; Reben in Zeilen den Höhenlinien entlang, Querwege und Trockenmauern (keine Stufenpyramide)
  const nT = mosel ? 8 : 6, plateau = z0 + 22, hangZ1 = hof ? z0 + d - 36 : hz0 - 4, tt = (hangZ1 - plateau) / (nT - 1), dh = mosel ? 5.2 : 3.8;
  const erde = mosel ? '#8b8178' : '#b9a77c', mauer = mosel ? '#6c6662' : '#c2b49b', rebe = mosel ? '#5e8f4a' : '#6f9a4f';
  const Htop = nT * dh, glatt = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const hang = (x, z) => {
    const t = glatt((hangZ1 - z) / Math.max(1, hangZ1 - plateau));
    // zu den Seiten und nach hinten weich auf Straßenniveau auslaufen (keine Geländekante am Slotrand)
    const rand = glatt(Math.min(x - x0, x0 + w - x) / 22) * glatt((z - z0) / 10);
    return 0.3 + Htop * t * rand;
  };
  gelaende(S, x0, z0, x0 + w, hangZ1 + 0.5, hang, (x, y, z) => (z < plateau - 2 && y > Htop * 0.8 ? '#9dc283' : erde), { schritt: 4 });
  rebzeilen(S, x0, z0, x0 + w, hangZ1, (x, z) => hang(x, z) + 0.02, false, (x, y, z) => y > 1.2 && z > plateau + 3 && z < hangZ1 - 1.5, { rebe, mauer, weg: '#ddd2b6' });
  // Treppenweg den Hang hinauf und Weinbergshäuschen auf halber Höhe
  const xp = x0 + w * 0.32;
  for (let z = hangZ1 - 1; z > plateau; z -= 1.6) { const y = hang(xp + 0.8, z); S.quader(xp, y - 0.4, z - 0.9, xp + 1.6, y + 0.12, z + 0.7, '#e2dccf'); }
  const whx = x0 + w * 0.62, whz = (hangZ1 + plateau) / 2, why = hang(whx + 1.6, whz + 1);
  S.quader(whx, why - 1.2, whz - 2, whx + 3.2, why + 3, whz + 1, '#efe8da');
  walm(S, whx - 0.3, whz - 2.3, whx + 3.5, whz + 1.3, why + 3, 1.8, mosel ? SCHIEFER : ZIEGEL);
  if (mosel) {
    // Lagenname als große Tafel am Hang
    const zL = hangZ1 - 2 * tt, yL = hang(x0 + w * 0.7, zL), FL = R(x0, zL, 1, 0, w);
    if (sichtF(p, FL)) { fb(S, FL, w * 0.7 - 9, w * 0.7 + 9, yL + 0.6, yL + 4.4, -0.3, -0.1, '#f2efe6'); for (const u of [w * 0.7 - 7, w * 0.7 + 7]) fb(S, FL, u - 0.15, u + 0.15, yL - 1, yL + 0.6, -0.3, -0.1, '#3b3f44'); ftext(scene, FL, 'KESSELBERG', w * 0.7, yL + 2.5, 0.0, 3.0, 16.5, '#5a2a24'); }
  }
  // Burgruine oben
  const hmaxBurg = burgruine(S, p, r, x0 + w * (mosel ? 0.62 : 0.3), z0 + 12, Htop + 0.3, { stein: mosel ? '#8f8a84' : '#b8ab95', rund: !mosel });
  for (let i = 0; i < 6; i++) { const bx = zw(r, x0 + 8, x0 + w - 8), bz = zw(r, z0 + 10, plateau - 2); if (Math.abs(bx - (x0 + w * (mosel ? 0.62 : 0.3)) - 6) > 14) baumAuf(S, bx, hang(bx, bz), bz, r, zw(r, 0.9, 1.2)); }
  let hmax = hmaxBurg;
  if (hof) {
    // Winzerhof: U-förmige Hofanlage mit Torbogen und Fässern
    const hx0 = x0 + w * 0.2, hb = w * 0.6, hzv = z0 + d - 32, hd = 26;
    hmax = Math.max(hmax, winzerhaus(S, scene, p, r, hx0, hzv, hb, 11, { n: 2, schild: 'Weingut Kellerhals', frei: ['+x', '-x'] }));
    for (const s of [0, 1]) hmax = Math.max(hmax, unterbau(S, scene, p, s ? '-x' : '+x', s ? hx0 + hb - 10 : hx0, hzv + 11.5, hd - 15, 10, (S2, sc2, p2) => fwHaus(S2, sc2, p2, r, 0, 0, hd - 15, 10, { giebel: false, n: 1, zwerch: false, frei: ['+x', '-x'] })));
    const F = R(hx0 + 10, hzv + hd, 1, 0, hb - 20);
    fwand(S, F, 0, hb - 20, 0, 4.2, -0.6, 0, '#c9b292', [{ u0: (hb - 20) / 2 - 1.8, u1: (hb - 20) / 2 + 1.8, v0: -0.1, v1: 3.6, bogen: true }]);
    if (sichtF(p, F)) ftext(scene, F, 'Weingut Kellerhals', (hb - 20) / 2, 3.95, 0.05, 0.36, 6, '#5a2a24');
    for (let i = 0; i < 5; i++) { const g = new THREE.CylinderGeometry(0.6, 0.6, 1.5, 10); g.rotateZ(PI / 2); g.translate(hx0 + 13 + i * 1.5, 0.95, hzv + 14 + (i % 2) * 1.4); S.add(g, '#8a5a3a'); }
    S.box(2.6, 0.9, 1.2, hx0 + hb / 2, 0.75, hzv + 18, '#8a6a4a'); schirmWein(S, hx0 + hb / 2, hzv + 18);
    // Rebzeilen auf ebenem Grund links und rechts
    for (const [a, b] of [[x0 + 2, hx0 - 2], [hx0 + hb + 2, x0 + w - 2]]) for (let z = hzv; z < z0 + d - 3; z += 2.2) S.quader(a, 0.3, z - 0.3, b, 1.3, z + 0.3, rebe);
    return { hoehe: hmax };
  }
  // Häuserzeile am Ufer mit Kirche
  const namen = ['Weinstube Rebstock', 'Straußwirtschaft', 'Hotel Zur Krone', 'Weinhaus Lay', 'Café am Ufer', 'Winzerstube', 'Gasthaus Anker'].map((x) => x); mischenIn(namen, r);
  let x = x0 + 1, i = 0;
  const kircheBei = Math.floor(zw(r, 0.35, 0.6) * w);
  while (x < x0 + w - 6) {
    if (Math.abs(x - x0 - kircheBei) < 4 && i > 0) { hmax = Math.max(hmax, dorfkirche(S, p, r, x, hz0, 14, ht - 2)); x += 20; i++; continue; }
    let b = zw(r, 7, 10.5); if (x0 + w - x - b < 6) b = x0 + w - 1 - x;
    const frei = []; if (i === 0) frei.push('-x'); if (x + b > x0 + w - 1.5) frei.push('+x');
    let hh;
    if (!mosel && r() < 0.45) hh = fwHaus(S, scene, p, r, x, hz0, b, ht, { giebel: r() < 0.5, frei, laden: null, n: 2, schiefer: r() < 0.4 ? 'giebel' : null });
    else hh = winzerhaus(S, scene, p, r, x, hz0, b, ht, { n: mosel ? 2 + (r() < 0.4 ? 1 : 0) : 2, frei, schild: r() < 0.5 ? namen.pop() : null });
    hmax = Math.max(hmax, hh); x += b; i++;
  }
  return { hoehe: hmax };
}
function schirmWein(S, x, z) { S.box(0.12, 2.6, 0.12, x, 1.6, z, '#5a4636'); zyl(S, 2.2, 0.2, 0.7, x, 2.6, z, '#f2efe6', 8); }

// =====================================================================================
// 10. Kopfbahnhof mit Hallen (Frankfurt-artig, eigenständig)
// =====================================================================================
/** Segmentbogen-Querschnitt (Ring) als Form: Spannweite B, Kämpferhöhe y0, Stich f, Dicke dk. */
function bogenForm(B, y0, f, dk) {
  const R0 = (B * B / 4 + f * f) / (2 * f), cy = y0 + f - R0, a = Math.asin((B / 2) / R0);
  const s = new THREE.Shape();
  const n = 18;
  for (let i = 0; i <= n; i++) { const w = PI / 2 + a - (2 * a * i) / n; const px = Math.cos(w) * (R0 + dk), py = cy + Math.sin(w) * (R0 + dk); if (i === 0) s.moveTo(px, py); else s.lineTo(px, py); }
  for (let i = n; i >= 0; i--) { const w = PI / 2 + a - (2 * a * i) / n; s.lineTo(Math.cos(w) * R0, cy + Math.sin(w) * R0); }
  return { s, R0, cy, a };
}
/** Bahnsteighalle entlang z (Gleise laufen nach -z), mittig bei cx, von z0 bis z1. */
function halle(S, p, cx, z0, z1, B, y0, f, o) {
  const L = z1 - z0, { s, R0, cy, a } = bogenForm(B, y0, f, 0.35);
  const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false, curveSegments: 4 }); g.translate(cx, 0, z0); S.add(g, o.dach);
  // Oberlicht entlang des Scheitels
  const ol = bogenForm(B * 0.36, y0 + f - (B * 0.36 / 2) ** 2 / (2 * R0) - 0.05, (B * 0.36 / 2) ** 2 / (2 * R0) + 0.05, 0.12);
  const g2 = new THREE.ExtrudeGeometry(ol.s, { depth: L - 2, bevelEnabled: false }); g2.translate(cx, 0.32, z0 + 1); S.add(g2, o.licht);
  // Binder
  for (let z = z0 + 0.4; z <= z1; z += o.binder ?? 10) {
    const b = bogenForm(B + 0.2, y0, f + 0.1, 0.7);
    const gb = new THREE.ExtrudeGeometry(b.s, { depth: 0.5, bevelEnabled: false, curveSegments: 4 }); gb.translate(cx, 0, z - 0.25); S.add(gb, o.binderF);
  }
  // Stützenreihen an den Kämpfern
  for (let z = z0 + 0.4; z <= z1; z += o.binder ?? 10) for (const sx of [-1, 1]) S.box(0.8, y0, 0.8, cx + sx * B / 2, y0 / 2, z, o.binderF);
  S.quader(cx - B / 2 - 0.4, y0 - 0.8, z0, cx - B / 2 + 0.4, y0, z1, o.binderF);
  S.quader(cx + B / 2 - 0.4, y0 - 0.8, z0, cx + B / 2 + 0.4, y0, z1, o.binderF);
  // Hallenschürzen (Giebel) vorn und hinten: verglast mit Sprossen
  for (const [zz, nz] of [[z1, 1], [z0, -1]]) {
    if (!sieht(p, 0, nz)) continue;
    const sh = new THREE.Shape();
    const n = 14;
    for (let i = 0; i <= n; i++) { const w = PI / 2 + a - (2 * a * i) / n; const px = Math.cos(w) * R0, py = cy + Math.sin(w) * R0; if (i === 0) sh.moveTo(px, py); else sh.lineTo(px, py); }
    sh.lineTo(B / 2, y0 + 1.2); sh.lineTo(-B / 2, y0 + 1.2);
    const gs = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }); gs.translate(cx, 0, zz - (nz > 0 ? 0.6 : -0.4)); S.add(gs, o.glas);
    const F = R(cx - B / 2, zz + (nz > 0 ? -0.3 : 0.3), nz > 0 ? 1 : -1, 0, B);
    for (let k = 1; k < 8; k++) { const u = (B * k) / 8, xx = u - B / 2, yt = cy + Math.sqrt(Math.max(0, R0 * R0 - xx * xx)); fb(S, F, (nz > 0 ? u : B - u) - 0.1, (nz > 0 ? u : B - u) + 0.1, y0 + 1.2, yt - 0.2, 0, 0.12, o.binderF); }
    fb(S, F, 0, B, y0 + 1.0, y0 + 1.4, 0, 0.3, o.binderF);
    fb(S, F, 0, B, y0 + f * 0.55, y0 + f * 0.55 + 0.2, 0, 0.12, o.binderF);
  }
}
function zug(S, x, z0, wagen, art) {
  const L = 25;
  for (let i = 0; i < wagen; i++) {
    const zz = z0 + i * (L + 0.6);
    const f = art === 'fern' ? '#f2f1ec' : '#c8463c';
    S.quader(x - 1.45, 1.1, zz, x + 1.45, 4.2, zz + L, f);
    S.quader(x - 1.47, 2.6, zz + 1, x + 1.47, 3.5, zz + L - 1, '#3c4852');
    S.quader(x - 1.47, 1.5, zz, x + 1.47, 1.8, zz + L, art === 'fern' ? '#c8463c' : '#f2f1ec');
    S.quader(x - 1.2, 0.5, zz + 2, x + 1.2, 1.1, zz + L - 2, '#30353a');
  }
  const g = new THREE.SphereGeometry(1.45, 10, 6, 0, 2 * PI, 0, PI / 2); g.rotateX(-PI / 2); g.scale(1, 1.05, 2.4); g.translate(x, 2.65, z0); S.add(g, art === 'fern' ? '#f2f1ec' : '#c8463c');
}
function empfangAlt(S, scene, p, r, x0, z0, b, t, H, o) {
  const st = o.stein, orn = o.orn, dach = o.dach, cx = x0 + b / 2;
  // Flügel
  S.quader(x0, 0, z0, x0 + b, H, z0 + t, st);
  for (const [k, F] of seiten(p, x0, z0, b, t)) {
    const L = []; for (const u of achsen(0, F.L, 4.2, 1)) { if (k === '+z' && Math.abs(u - (F.L / 2)) < 15) continue; L.push({ u0: u - 1.3, u1: u + 1.3, v0: 1.4, v1: H * 0.5 - 0.6, bogen: true }, { u0: u - 1.0, u1: u + 1.0, v0: H * 0.5 + 0.8, v1: H - 2.4 }); }
    lochwand(S, F, 0, F.L, 0.3, H - 1.4, st, L, { dick: 0.3 });
    fb(S, F, -0.1, F.L + 0.1, 0.3, 1.2, 0, 0.45, dunkler(st, 0.08));
    fb(S, F, -0.1, F.L + 0.1, H * 0.5 - 0.1, H * 0.5 + 0.3, 0, 0.45, orn);
    fb(S, F, -0.4, F.L + 0.4, H - 1.4, H - 0.5, 0, 0.7, orn);
    for (const u of achsen(0, F.L, 4.2, 1)) fb(S, F, u + 1.8, u + 2.4, 1.2, H - 1.4, 0, 0.45, orn);
  }
  S.add(dachProfil(b, t, 3.5, t * 0.45, 'x').translate(cx, H, z0 + t / 2), dach);
  // Mittelbau mit großem Bogenfenster, Uhr und Figurengruppe
  const mb = 30, mz1 = z0 + t + 2, Hm = H + 9;
  S.quader(cx - mb / 2, 0, z0 - 2, cx + mb / 2, Hm, mz1, st);
  for (const [k, F] of seiten(p, cx - mb / 2, z0 - 2, mb, mz1 - z0 + 2)) {
    if (k === '+z' || k === '-z') {
      lochwand(S, F, 0, F.L, 0.3, Hm - 2, st, [{ u0: 5.5, u1: F.L - 5.5, v0: 6.5, v1: Hm - 3, bogen: true }, { u0: 7, u1: 11, v0: 0.3, v1: 5.2, bogen: true }, { u0: 13, u1: 17, v0: 0.3, v1: 5.2, bogen: true }, { u0: 19, u1: 23, v0: 0.3, v1: 5.2, bogen: true }], { glas: GLAS_HELL, dick: 0.6 });
      for (let u = 7.5; u < F.L - 6; u += 2.4) fb(S, F, u - 0.08, u + 0.08, 6.5, Hm - 4, 0.02, 0.15, '#4a525a');
      fb(S, F, 5.5, F.L - 5.5, 12, 12.2, 0.02, 0.15, '#4a525a');
      for (const u of [1.8, F.L - 1.8]) fb(S, F, u - 1.5, u + 1.5, 0, Hm - 2, 0, 0.9, orn);
      fb(S, F, -0.5, F.L + 0.5, Hm - 2, Hm, 0, 1.0, orn);
      if (k === '+z') {
        fscheibe(S, F, F.L / 2, Hm + 2.6, 0.2, 0.4, 1.8, '#f6f1e2', 20); fscheibe(S, F, F.L / 2, Hm + 2.6, 0.4, 0.45, 1.5, '#2b3036', 16);
        ftext(scene, F, o.name ?? 'Hauptbahnhof', F.L / 2, 5.9, 1.0, 0.95, 18, '#3a3a36');
      }
      fpoly(S, F, [[2, Hm], [F.L - 2, Hm], [F.L - 6, Hm + 5], [6, Hm + 5]], -2, 0.3, st);
    } else fb(S, F, 0, F.L, Hm * 0.5, Hm * 0.5 + 0.4, 0, 0.3, orn);
  }
  // Figurengruppe: Träger mit Weltkugel
  const fz = mz1 - 1.5;
  S.box(3.6, 1.4, 2.4, cx, Hm + 5.7, fz, orn);
  zyl(S, 0.6, 0.8, 3.2, cx, Hm + 6.4, fz, '#6f7d78', 8);
  S.add(new THREE.SphereGeometry(2.0, 12, 8).translate(cx, Hm + 11.2, fz), '#6f8f86');
  for (const s of [-1, 1]) { zyl(S, 0.45, 0.6, 2.4, cx + s * 1.3, Hm + 6.4, fz, '#6f7d78', 8); }
  // Eckpavillons mit Kuppelhauben
  for (const s of [-1, 1]) {
    const px0 = s < 0 ? x0 - 2 : x0 + b - 10, pw = 12;
    S.quader(px0, 0, z0 - 1, px0 + pw, H + 4, z0 + t + 1.5, st);
    for (const [k, F] of seiten(p, px0, z0 - 1, pw, t + 2.5)) {
      lochwand(S, F, 0, F.L, 0.3, H + 3, st, achsen(0, F.L, 4, 1.4).map((u) => ({ u0: u - 1, u1: u + 1, v0: 2, v1: H + 1, bogen: true })), { dick: 0.3 });
      for (const u of [0.6, F.L - 0.6]) fb(S, F, u - 0.6, u + 0.6, 0, H + 3, 0, 0.6, orn);
      fb(S, F, -0.3, F.L + 0.3, H + 3, H + 4, 0, 0.7, orn);
    }
    walm(S, px0 - 0.2, z0 - 1.2, px0 + pw + 0.2, z0 + t + 1.7, H + 4, 5, dach);
    zyl(S, 0.5, 0.8, 2.5, px0 + pw / 2, H + 8.5, z0 + t / 2, dach, 8);
  }
  return Hm + 13;
}
function empfang50(S, scene, p, r, x0, z0, b, t, H, o) {
  const be = '#e9e6de', cx = x0 + b / 2;
  S.quader(x0, 0, z0, x0 + b, H, z0 + t, GLAS_HELL);
  for (const [k, F] of seiten(p, x0, z0, b, t)) {
    for (const u of achsen(0, F.L, 2.4, 0)) fb(S, F, u - 0.08, u + 0.08, 0.3, H, 0, 0.15, '#f2f1ec');
    for (const y of [4.2, 8.4]) fb(S, F, 0, F.L, y, y + 0.2, 0, 0.15, '#f2f1ec');
    if (k === '+z') ftext(scene, F, o.name ?? 'Hauptbahnhof', F.L / 2, H + 1.4, 3.0, 1.5, 30, '#2a3036');
  }
  S.quader(x0 - 1, H, z0 - 1, x0 + b + 1, H + 0.6, z0 + t + 4, be);
  S.quader(x0 + 6, 4.6, z0 + t, x0 + b - 6, 5.0, z0 + t + 7, be);
  for (let x = x0 + 8; x < x0 + b - 6; x += 10) S.box(0.3, 4.3, 0.3, x, 2.45, z0 + t + 6.5, '#3b4046');
  // Seitenflügel aus Naturstein mit Fensterband, Uhrenscheibe als Turm
  for (const s of [-1, 1]) {
    const fx0 = s < 0 ? x0 - 14 : x0 + b, fb2 = 14;
    S.quader(fx0, 0, z0 + 1, fx0 + fb2, H + 3, z0 + t - 1, '#d9d2c2');
    for (const [k, F] of seiten(p, fx0, z0 + 1, fb2, t - 2)) for (let i = 0; i < 3; i++) fb(S, F, 0.6, F.L - 0.6, 1.5 + i * 3.6, 3.4 + i * 3.6, 0, 0.05, GLAS);
    S.quader(fx0 - 0.4, H + 3, z0 + 0.6, fx0 + fb2 + 0.4, H + 3.4, z0 + t - 0.6, be);
  }
  const ux = x0 + b + 4;
  S.quader(ux, 0, z0 + t + 1, ux + 3, H + 16, z0 + t + 2.4, be);
  const FU = R(ux, z0 + t + 2.4, 1, 0, 3);
  fscheibe(S, FU, 1.5, H + 13.5, 0, 0.15, 1.3, '#f6f1e2'); fscheibe(S, FU, 1.5, H + 13.5, 0.15, 0.2, 1.05, '#2b3036');
  return H + 16;
}
function bahnhofRoh(S, scene, p) {
  const r = rng(`bf:${p.seed}`), v = p.variante, { x: x0, z: z0, w, d } = p;
  boden(S, x0, z0, x0 + w, z0 + d, '#c9c3b6', 0.3, 0.06);
  const et = v === 'nachkrieg' ? 16 : 20, ez1 = z0 + d - 8, ez0 = ez1 - et, hz1 = ez0 - 0.5, hz0 = z0 + 26;
  const hallen = v === 'gross' ? [[0.5, 34], [0.24, 26], [0.76, 26], [0.06, 18], [0.94, 18]] : v === 'drei' ? [[0.5, 32], [0.2, 28], [0.8, 28]] : [[0.32, 30], [0.68, 30]];
  const o = { dach: '#6f8291', licht: '#b9d0db', binderF: '#4a525a', glas: '#8fb0c0', binder: 10 };
  // Gleisfeld vor den Hallen und darunter
  const gleisA = x0 + 4, gleisB = x0 + w - 4;
  for (let x = gleisA + 3; x < gleisB - 2; x += 5.2) {
    S.quader(x - 1.4, 0.3, z0, x + 1.4, 0.42, hz1, '#9a8f80');
    for (const s of [-0.72, 0.72]) S.quader(x + s - 0.07, 0.42, z0, x + s + 0.07, 0.56, hz1, '#6a6e72');
  }
  // Bahnsteige mit Dächern im Vorfeld
  for (let x = gleisA + 5.6; x < gleisB - 4; x += 10.4) {
    S.quader(x - 1.6, 0.3, z0 + 8, x + 1.6, 1.1, hz1, '#d8d4cb');
    S.quader(x - 2.2, 4.6, z0 + 10, x + 2.2, 4.9, hz0, '#e9e6de');
    for (let z = z0 + 12; z < hz0; z += 8) S.box(0.25, 3.6, 0.25, x, 2.9, z, '#4a525a');
  }
  // Oberleitungsmasten
  for (let z = z0 + 4; z < hz0; z += 12) { S.box(0.4, 8, 0.4, gleisA, 4.3, z, '#5d656c'); S.box(0.4, 8, 0.4, gleisB, 4.3, z, '#5d656c'); S.quader(gleisA, 8.1, z - 0.15, gleisB, 8.4, z + 0.15, '#5d656c'); }
  // Züge
  zug(S, gleisA + 3 + 5.2 * 2, z0 + 2, 3, 'fern');
  zug(S, gleisA + 3 + 5.2 * 7, z0 + 10, 2, 'regio');
  if (w > 120) zug(S, gleisA + 3 + 5.2 * 13, z0 + 6, 3, 'fern');
  // Hallen
  let hmax = 0;
  for (const [f, B] of hallen) {
    const cx = x0 + 4 + f * (w - 8), y0 = v === 'nachkrieg' ? 9 : 10, st = B * (v === 'nachkrieg' ? 0.25 : 0.42);
    halle(S, p, cx, hz0, hz1, B - 0.6, y0, st, o);
    hmax = Math.max(hmax, y0 + st);
  }
  // Seitenwände der Halle aus Stein
  for (const s of [-1, 1]) { const xa = s < 0 ? x0 + 2 : x0 + w - 3.4; S.quader(xa, 0, hz0, xa + 1.4, 9.4, hz1, '#cdbb9e'); for (const [k, F] of seiten(p, xa, hz0, 1.4, hz1 - hz0, ['+x', '-x'])) lochwand(S, F, 0, F.L, 0.3, 9.4, '#cdbb9e', achsen(0, F.L, 5, 1).map((u) => ({ u0: u - 1.4, u1: u + 1.4, v0: 1.5, v1: 7.5, bogen: true })), { glas: '#3e4650', dick: 0.25 }); }
  // Empfangsgebäude
  const ex0 = x0 + 4, eb = w - 8;
  if (v === 'nachkrieg') hmax = Math.max(hmax, empfang50(S, scene, p, r, ex0 + 16, ez0, eb - 32, et, 12, {}));
  else hmax = Math.max(hmax, empfangAlt(S, scene, p, r, ex0 + 4, ez0, eb - 8, et, v === 'gross' ? 16 : 14, { stein: waehle(r, ['#d8c6a5', '#cdbb9e', '#d9cdb5']), orn: '#efe6d2', dach: v === 'gross' ? KUPFER : SCHIEFER }));
  // Vorplatz: Taxen, Bäume, Tramhaltestelle
  boden(S, x0, ez1, x0 + w, z0 + d, '#d6d0c2', 0.3, 0.1);
  for (let x = x0 + 10; x < x0 + w * 0.4; x += 5) ostFahrzeug(S, x, ez1 + 4.5, 'modern', 0, '#efd25c');
  baumreihe(S, r, x0 + w * 0.6, x0 + w - 4, ez1 + 5, 9, 0.9);
  return { hoehe: hmax };
}


// =====================================================================================
// Detailhelfer: Geländer, Leitern, Gerüste, Prozessanlagen, Fahrräder
// =====================================================================================
function gelaender(S, a, b, y, c = '#e8c547', ab = 1.6) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / ab));
  for (let i = 0; i <= n; i++) { const t = i / n; S.box(0.08, 1.1, 0.08, a[0] + (b[0] - a[0]) * t, y + 0.55, a[1] + (b[1] - a[1]) * t, c); }
  balken(S, [a[0], y + 1.1, a[1]], [b[0], y + 1.1, b[1]], 0.08, 0.08, c);
  balken(S, [a[0], y + 0.55, a[1]], [b[0], y + 0.55, b[1]], 0.06, 0.06, c);
}
/** Geländer um ein Rechteck (alle vier Kanten, die hinteren sind von oben sichtbar). */
function gelaenderRing(S, x0, z0, x1, z1, y, c = '#e8c547', ab = 1.6) {
  gelaender(S, [x0, z1], [x1, z1], y, c, ab); gelaender(S, [x1, z1], [x1, z0], y, c, ab);
  gelaender(S, [x1, z0], [x0, z0], y, c, ab); gelaender(S, [x0, z0], [x0, z1], y, c, ab);
}
/** Steigleiter: zwei Holme und Sprossen, quer zur Richtung ry. */
function leiter(S, x, z, y0, h, ry = 0, c = '#e8c547', ab = 1.2) {
  const qx = Math.sin(ry) * 0.25, qz = Math.cos(ry) * 0.25;
  for (const s of [-1, 1]) S.box(0.07, h, 0.07, x + s * qx, y0 + h / 2, z + s * qz, c);
  for (let y = y0 + 0.6; y < y0 + h; y += ab) S.box(0.06, 0.06, 0.55, x, y, z, c, ry);
}
/** Baugerüst vor einer Fassade: Ständer, Beläge, Seitenschutz, Diagonalen. */
function geruest(S, F, u0, u1, y0, y1, o = {}) {
  const st = o.stahl ?? '#9aa1a7', holz = o.holz ?? '#c9a36a', t0 = o.t ?? 0.3, t1 = t0 + 1.2;
  const n = Math.max(1, Math.round((u1 - u0) / 2.5)), fb2 = (u1 - u0) / n;
  for (let i = 0; i <= n; i++) for (const t of [t0, t1]) fb(S, F, u0 + i * fb2 - 0.05, u0 + i * fb2 + 0.05, y0, y1, t, t + 0.1, st);
  let k = 0;
  for (let y = y0 + 2; y <= y1 + 0.01; y += 2, k++) {
    fb(S, F, u0, u1, y - 0.06, y, t0, t1 + 0.1, holz);
    fb(S, F, u0, u1, y + 1.0, y + 1.06, t1, t1 + 0.1, st);
    for (let i = k % 2; i < n; i += 2) fstrebe(S, F, u0 + i * fb2, y - 2, u0 + (i + 1) * fb2, y, 0.06, t1, t1 + 0.08, st);
  }
  if (o.netz) fb(S, F, u0, u1, y0 + 2, y1, t1 + 0.12, t1 + 0.14, o.netz);
}
/** Prozessanlage: Stahlgerüst mit Gitterrostebenen, Geländern, Behältern, Wärmetauschern und Rohren. */
function anlage(S, r, x0, z0, b, t, ebenen = 3, o = {}) {
  const st = '#5d656c', rost = '#8d939a', gel = o.gel ?? '#e8c547', gh = 6, H = ebenen * gh;
  const nx = Math.max(1, Math.round(b / 6)), nz = Math.max(1, Math.round(t / 6));
  for (let i = 0; i <= nx; i++) for (let k = 0; k <= nz; k++) S.box(0.4, H, 0.4, x0 + (i * b) / nx, 0.3 + H / 2, z0 + (k * t) / nz, st);
  for (let e = 1; e <= ebenen; e++) {
    const y = 0.3 + e * gh, kurz = e === ebenen ? 0.55 : 1;
    S.quader(x0 - 0.3, y - 0.18, z0 - 0.3, x0 + b * kurz + 0.3, y, z0 + t + 0.3, rost);
    gelaenderRing(S, x0 - 0.3, z0 - 0.3, x0 + b * kurz + 0.3, z0 + t + 0.3, y, gel, 2.0);
    // Behälter auf der Ebene
    for (let j = 0; j < 2; j++) {
      const ex = x0 + zw(r, 2.5, b * kurz - 2.5), ez = z0 + zw(r, 2.5, t - 2.5);
      if (r() < 0.5) { stab(S, [ex - 2.5, y + 1.3, ez], [ex + 2.5, y + 1.3, ez], 1.1, waehle(r, ['#e6e8e8', '#cfd3d6', '#c9cdd0']), 12); S.box(0.5, 0.8, 1.6, ex - 1.6, y + 0.4, ez, st); S.box(0.5, 0.8, 1.6, ex + 1.6, y + 0.4, ez, st); }
      else zyl(S, 1.0, 1.0, zw(r, 2.5, 4.5), ex, y, ez, waehle(r, ['#e6e8e8', '#d9dcd8', '#b9c4cb']), 10);
    }
    if (e < ebenen) { const sx = x0 + b - 1.2; balken(S, [sx, y - gh + 0.2, z0 + 0.8], [sx, y, z0 + t * 0.6], 0.9, 0.12, gel); }
  }
  // senkrechte Rohre und Pumpen
  const farben = ['#9aa1a7', '#c8463c', '#5f8f6a', '#e6e8e8', '#2f6f8f'];
  for (let i = 0; i < 6; i++) { const px = x0 + zw(r, 0.8, b - 0.8), pz = z0 + (i % 2 ? t + 0.6 : -0.6); stab(S, [px, 0.3, pz], [px, H - zw(r, 0, 5), pz], 0.22, waehle(r, farben), 6); }
  for (let i = 0; i < 4; i++) { const pz = z0 + zw(r, 0.5, t - 0.5); stab(S, [x0 - 0.6, 0.3 + gh * (1 + (i % ebenen)) - 0.6, pz], [x0 + b + 0.6, 0.3 + gh * (1 + (i % ebenen)) - 0.6, pz], 0.25, waehle(r, farben), 6); }
  for (let i = 0; i < 3; i++) { const px = x0 + 1.5 + i * 2.5; S.box(1.2, 0.9, 0.8, px, 0.75, z0 + t + 2, '#2f6f8f'); S.box(0.5, 0.5, 0.5, px + 0.7, 0.55, z0 + t + 2, '#5d656c'); }
  return H;
}
function fahrrad(S, x, z, ry, c) {
  const qx = Math.cos(ry) * 0.55, qz = -Math.sin(ry) * 0.55;
  for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(0.34, 0.34, 0.05, 10); g.rotateX(PI / 2); g.rotateY(ry); g.translate(x + s * qx, 0.64, z + s * qz); S.add(g, '#2b2f33'); }
  S.box(1.0, 0.1, 0.06, x, 0.85, z, c, ry);
}
function fahrradReihe(S, r, x0, x1, z, quer = true) {
  S.quader(x0, 0.3, z - 0.05, x1, 0.95, z + 0.05, '#7d858c');
  for (let x = x0 + 0.4; x < x1; x += 0.75) if (r() < 0.75) fahrrad(S, x, z, quer ? PI / 2 : 0, waehle(r, ['#c8463c', '#2f6f8f', '#2b2f33', '#e8c547', '#3d6b4f', '#a3abb2']));
}
function buschAuf(S, x, y, z, r, s = 1) {
  const g = new THREE.IcosahedronGeometry(s * (0.8 + r() * 0.4), 0); g.scale(1.2, 0.8, 1.2); g.translate(x, y + 0.6 * s, z);
  S.add(g, waehle(r, ['#6f9f5c', '#7aa865', '#628f52']));
}
function infotafel(S, x, z, ry = 0, c = '#3f5a4a') { S.box(1.8, 1.1, 0.12, x, 1.4, z, c, ry); S.box(0.12, 0.9, 0.12, x, 0.75, z, '#3b3f44', ry); }
function steinbloecke(S, r, x, z, n, c) { for (let i = 0; i < n; i++) S.box(zw(r, 0.8, 1.8), zw(r, 0.5, 1.0), zw(r, 0.6, 1.2), x + (i % 4) * 2.1, 0.3 + 0.4 + Math.floor(i / 4) * 0.9, z + (i % 2) * 0.4, i % 3 ? c : dunkler(c, 0.06), zw(r, -0.2, 0.2)); }
function ziegelbau(S, p, x0, z0, b, t, H, zg = '#a8664f', o = {}) {
  S.quader(x0, 0, z0, x0 + b, H, z0 + t, zg);
  const n = Math.max(1, Math.round((H - 1) / 3.6));
  for (const [k, F] of seiten(p, x0, z0, b, t)) {
    const L = []; for (let i = 0; i < n; i++) for (const u of achsen(0, F.L, 2.8, 0.8)) L.push({ u0: u - 0.7, u1: u + 0.7, v0: 1.0 + i * 3.6, v1: 2.9 + i * 3.6, bogen: o.bogen ?? true });
    lochwand(S, F, 0, F.L, 0.3, H - 0.5, zg, L, { glas: '#5d6f7a', dick: 0.25 });
    fb(S, F, -0.1, F.L + 0.1, H - 0.5, H, 0, 0.35, '#e4d8c4');
  }
  if (o.dach !== false) S.quader(x0 + 0.3, H, z0 + 0.3, x0 + b - 0.3, H + 0.2, z0 + t - 0.3, '#8d939a');
}
function tankwagen(S, x, z, ry = 0) {
  ostFahrzeug(S, x, z, 'lkw', ry, '#e6e8e8');
  const c = Math.cos(ry), sn = Math.sin(ry);
  stab(S, [x - c * 3, 2.6, z + sn * 3], [x + c * 1.4, 2.6, z - sn * 1.4], 1.1, '#e6e8e8', 10);
}

// =====================================================================================
// 11. Oberstadt auf dem Plateau: Fachwerk-Blockrand, im Blockinneren Schloss (Marburg-Typ) oder Dom (Wetzlar-Typ)
// =====================================================================================
/** Baut fn in einen eigenen Sammler und hebt alles um dy an (Häuser auf Terrassen). */
function angehoben(S, scene, dy, fn) {
  const T = new Sammler(), g = new THREE.Group();
  const e = fn(T, g);
  for (const [farbe, gs] of T.teile) for (const geo of gs) { geo.translate(0, dy, 0); S.add(geo, farbe); }
  g.position.y = dy; scene.add(g);
  return e;
}
/** Landgrafenschloss: heller Palas mit steilem Schieferdach, Kapellenflügel, Rundturm und Torturm. */
function hangSchloss(S, p, r, x0, z0, b, t, y) {
  const putz = '#ece4d3', stein = '#c9b9a0', dach = SCHIEFER;
  const pb = Math.min(58, b * 0.72), pt = 13, px = x0 + (b - pb) / 2 - 4, pz = z0 + 3, H = 15;
  S.quader(px, y, pz, px + pb, y + H, pz + pt, putz);
  S.quader(px - 0.2, y, pz - 0.2, px + pb + 0.2, y + 2.2, pz + pt + 0.2, stein);
  for (const [k, F] of seiten(p, px, pz, pb, pt)) {
    for (const u of achsen(0, F.L, 3.4, 1.2)) { fenster(S, F, u, y + 4.2, 1.2, 2.4, { kreuz: true, rahmen: stein }); fenster(S, F, u, y + 9.4, 1.2, 2.4, { kreuz: true, rahmen: stein }); }
    fb(S, F, -0.1, F.L + 0.1, y + 7.6, y + 7.9, 0, 0.2, stein);
    for (const u of [0.3, F.L - 0.3]) fb(S, F, u - 0.5, u + 0.5, y, y + H, 0, 0.1, stein);
  }
  satteldach(S, px, pz, px + pb, pz + pt, y + H, 10, 'x', dach, putz, 0.4);
  // Zwerchhäuser mit Treppengiebeln zur Stadt
  for (const u of [pb * 0.25, pb * 0.6]) {
    const zx = px + u, F = R(zx - 3, pz + pt, 1, 0, 6);
    S.quader(zx - 3, y + H, pz + pt - 3, zx + 3, y + H + 4.5, pz + pt, putz);
    fpoly(S, F, [[0, y + H + 4.5], [6, y + H + 4.5], [5, y + H + 6], [4, y + H + 6], [4, y + H + 7.4], [2, y + H + 7.4], [2, y + H + 6], [1, y + H + 6]], -3, 0, putz);
    fenster(S, F, 3, y + H + 1.4, 1.1, 2.0, { kreuz: true, rahmen: stein });
  }
  // Kapellenflügel quer (+x), gotische Fenster, Dachreiter
  const kx = px + pb, kb = 12, kt = Math.min(t - 6, 26);
  S.quader(kx, y, pz, kx + kb, y + H + 2, pz + kt, stein);
  for (const [k, F] of seiten(p, kx, pz, kb, kt, ['+x', '+z'])) for (const u of achsen(0, F.L, 4.2, 1.4)) fb(S, F, u - 0.7, u + 0.7, y + 4, y + H - 1, 0, 0.06, GLAS);
  satteldach(S, kx, pz, kx + kb, pz + kt, y + H + 2, 8, 'z', dach, stein, 0.4);
  S.box(1.2, 6, 1.2, kx + kb / 2, y + H + 13, pz + kt * 0.5, dach); zyl(S, 0, 0.9, 4, kx + kb / 2, y + H + 16, pz + kt * 0.5, KUPFER, 8);
  // Rundturm an der Ecke und Torturm vorn links
  const tx = px - 2, tz = pz + pt - 1;
  zyl(S, 3.6, 3.8, H + 12, tx, y, tz, stein, 16); zyl(S, 0, 4.4, 9, tx, y + H + 12, tz, dach, 16);
  S.quader(px + pb * 0.42 - 3, y, pz + pt, px + pb * 0.42 + 3, y + H + 8, pz + pt + 6, putz);
  for (const [k, F] of seiten(p, px + pb * 0.42 - 3, pz + pt, 6, 6)) { fb(S, F, 1.8, 4.2, y, y + 4.2, 0, 0.08, '#4a3b33'); fenster(S, F, 3, y + H + 2, 1.0, 2.2, { rahmen: stein }); }
  walm(S, px + pb * 0.42 - 3.3, pz + pt - 0.3, px + pb * 0.42 + 3.3, pz + pt + 6.3, y + H + 8, 8, dach);
  S.box(0.1, 3.4, 0.1, tx, y + H + 22.5, tz, '#3b3f44'); S.box(0.05, 1.0, 1.7, tx, y + H + 23.4, tz + 0.85, '#c8463c');
  // Schlossgarten auf dem Plateau
  for (let i = 0; i < 4; i++) baumAuf(S, x0 + 4 + i * 6, y, z0 + t - 4, r, 0.8);
  return y + H + 26;
}
function oberstadtRoh(S, scene, p) {
  // Oberstadt auf ebenem Plateau (GESTALTUNG.md 2: keine Hangterrassen in der Stadt): geschlossener Blockrand aus
  // Fachwerkhäusern an der Front (+z) und an der Seite (+x), dahinter im Blockinneren Schloss oder Dom mit Platz und Bäumen
  const r = rng(`ob:${p.seed}`), v = p.variante, { x: x0, z: z0, w, d } = p;
  boden(S, x0, z0, x0 + w, z0 + d, PFLASTER, 0.3, 0.06);
  const tf = 11, zF = z0 + d - 1 - tf, xS = x0 + w - 1 - tf;
  let hmax = 0;
  // Frontzeile: Häuser bündig aneinander, das letzte ist das Eckhaus zur +x-Seite
  let x = x0 + 1;
  while (x < x0 + w - 1 - 0.5) {
    let b = zw(r, 8, 11.5);
    if (x0 + w - 1 - x - b < 6.5) b = x0 + w - 1 - x;
    const frei = []; if (x === x0 + 1) frei.push('-x'); if (x + b >= x0 + w - 1.01) frei.push('+x');
    hmax = Math.max(hmax, fwHaus(S, scene, p, r, x, zF, b, tf, { n: 2 + (r() < 0.35 ? 1 : 0), giebel: r() < 0.5, frei, zwerch: false, laden: r() < 0.4 ? waehle(r, LAEDEN) : null }));
    x += b;
  }
  // Seitenzeile an +x: Häuser mit Front nach +x, bündig bis an die Frontzeile
  let z = z0 + 1;
  while (z < zF - 0.5) {
    let b = zw(r, 8, 11.5);
    if (zF - z - b < 6.5) b = zF - z;
    const zz = z, bb = b, erst = z === z0 + 1;
    hmax = Math.max(hmax, unterbau(S, scene, p, '+x', xS, zz, bb, tf, (T2, g2, p2) => fwHaus(T2, g2, p2, r, 0, 0, bb, tf, { n: 2, giebel: r() < 0.5, frei: erst ? ['+x'] : [], zwerch: false })));
    z += b;
  }
  // Blockinneres: Schloss oder Dom auf dem Plateau, davor ein kleiner Platz mit Bäumen
  const ia = x0 + 2, ib = xS - 2, ja = z0 + 2, jb = zF - 2;
  if (v === 'dom') {
    const kw = Math.min(54, ib - ia - 6), kd = Math.min(22, jb - ja - 10);
    const e = kirche(S, scene, { x: ia + (ib - ia - kw) / 2, z: ja + 2, w: kw, d: kd, seed: p.seed, stil: 'hallenkirche', typ: 'stadt', stein: '#b9634f', dach: SCHIEFER, turm: 'west', region: 'Mitte' });
    hmax = Math.max(hmax, e?.hoehe ?? 30);
    for (let i = 0; i < 5; i++) baum(S, ia + 4 + i * ((ib - ia - 8) / 4), jb - 3, r, 0.85);
  } else {
    hmax = Math.max(hmax, hangSchloss(S, p, r, ia, ja, ib - ia, jb - ja, 0.3));
  }
  // Platz vor Schloss bzw. Dom: Brunnen, Baumreihe, Bänke und Marktstände (keine leere Pflasterfläche)
  const pz0 = jb - Math.min(22, (jb - ja) * 0.45), pzm = (pz0 + jb) / 2, pxm = (ia + ib) / 2;
  boden(S, ia + 2, pz0, ib - 2, jb - 1, PLATZ, 0.3, 0.08);
  brunnenRund(S, pxm, pzm, 3.2, { rand: '#c9b9a0' });
  for (let x = ia + 6; x < ib - 4; x += 8) if (Math.abs(x - pxm) > 6) baum(S, x, jb - 3, r, 0.9);
  for (let x = ia + 8; x < ib - 6; x += 12) if (Math.abs(x - pxm) > 8) bank(S, x, pzm + 4.5);
  for (let i = 0; i < 3; i++) { const sx = pxm + 12 + i * 5.5; if (sx > ib - 4) break; S.box(3.6, 0.9, 2.2, sx, 0.75, pzm - 2, '#e9e2d0'); S.box(4.0, 0.2, 2.6, sx, 2.6, pzm - 2, ['#c9483e', '#3f7d56', '#d39a2b'][i]); for (const dx of [-1.8, 1.8]) S.box(0.08, 2.3, 0.08, sx + dx, 1.45, pzm - 2.9, '#5a5f64'); }
  return { hoehe: hmax };
}

/** Einzelnes hessisches Fachwerkhaus als Stadthaus (Parzelle der Blockrandbebauung). p.geschosse: Obergeschosse, p.laden, p.eck. */
function fwStadthausRoh(S, scene, p) {
  const r = rng(`fwh:${p.seed ?? 1}`);
  const n = Math.max(1, Math.min(3, p.geschosse ?? 2));
  const h = fwHaus(S, scene, p, r, 0, 0, p.w, p.d, {
    n, giebel: p.w <= 11 ? r() < 0.75 : r() < 0.2, frei: p.eck ? ['+x', '-x'] : [], zwerch: p.w > 11 && r() < 0.6,
    laden: p.laden || r() < 0.3 ? waehle(r, LAEDEN) : null, name: p.laden && r() < 0.7 ? waehle(r, LADEN_ALT) : null,
    markise: p.laden && r() < 0.35 ? waehle(r, ['#c9483e', '#3f7d56', '#2f6f8f', '#d39a2b']) : null,
  });
  return { hoehe: h, stil: 'fachwerk', geschosse: n };
}

// =====================================================================================
// Export
// =====================================================================================
export const MITTE_VARIANTEN = {
  'slot:mitte_skyline': ['raster', 'zwilling', 'krone', 'rund', 'ensemble'],
  'slot:mitte_fachwerk': ['zeile', 'roemer', 'rathaus', 'platz'],
  'slot:mitte_kurstadt': ['kurhaus', 'wandelhalle', 'villen'],
  'slot:mitte_dom_rot': ['kaiserdom', 'doppelchor', 'westturm'],
  'slot:mitte_wiederaufbau': ['treppenstrasse', 'geschaeftshaus', 'platz'],
  'slot:mitte_universitaet': ['alte_uni', 'betonuni', 'aula'],
  'slot:mitte_roemisch': ['tor', 'thermen', 'basilika', 'amphitheater'],
  'slot:mitte_industrie': ['chemie', 'tanklager', 'huette', 'denkmal'],
  'slot:mitte_weinort': ['rhein', 'mosel', 'winzerhof'],
  'slot:mitte_bahnhof': ['gross', 'drei', 'nachkrieg'],
  'slot:mitte_oberstadt': ['schloss', 'dom'],
};
/** Bauer für einzelne Stadthäuser der Region Mitte (für Stilprofile): { fachwerk(S, scene, p) } mit p.front als Ausrichtung. */
export const MITTE_HAUS = {
  fachwerk: slot('fwh', ['haus'], { haus: { min: [5, 7], max: [80, 60] } }, fwStadthausRoh),
};
export const MITTE_SLOTS = {
  'slot:mitte_skyline': slot('sky', MITTE_VARIANTEN['slot:mitte_skyline'], {
    raster: { min: [44, 40], max: [60, 56] }, zwilling: { min: [54, 42], max: [70, 56] }, krone: { min: [44, 44], max: [60, 60] },
    rund: { min: [52, 40], max: [64, 56] }, ensemble: { min: [90, 72], max: [110, 90] },
  }, skylineRoh),
  'slot:mitte_fachwerk': slot('fw', MITTE_VARIANTEN['slot:mitte_fachwerk'], {
    zeile: { min: [40, 22], max: [60, 30] }, roemer: { min: [50, 26], max: [64, 32] }, rathaus: { min: [40, 28], max: [50, 36] }, platz: { min: [48, 44], max: [60, 54] },
  }, fachwerkRoh),
  'slot:mitte_kurstadt': slot('kur', MITTE_VARIANTEN['slot:mitte_kurstadt'], {
    kurhaus: { min: [96, 76], max: [120, 96] }, wandelhalle: { min: [76, 52], max: [100, 64] }, villen: { min: [64, 40], max: [96, 52] },
  }, kurstadtRoh),
  'slot:mitte_dom_rot': slot('dom', MITTE_VARIANTEN['slot:mitte_dom_rot'], {
    kaiserdom: { min: [110, 60], max: [130, 72] }, doppelchor: { min: [104, 56], max: [124, 70] }, westturm: { min: [110, 60], max: [130, 72] },
  }, domRoh),
  'slot:mitte_wiederaufbau': slot('wa', MITTE_VARIANTEN['slot:mitte_wiederaufbau'], {
    treppenstrasse: { min: [48, 60], max: [60, 90] }, geschaeftshaus: { min: [52, 28], max: [70, 36] }, platz: { min: [52, 44], max: [70, 60] },
  }, wiederaufbauRoh),
  'slot:mitte_universitaet': slot('uni', MITTE_VARIANTEN['slot:mitte_universitaet'], {
    alte_uni: { min: [60, 40], max: [76, 50] }, betonuni: { min: [84, 60], max: [100, 76] }, aula: { min: [50, 40], max: [64, 50] },
  }, universitaetRoh),
  'slot:mitte_roemisch': slot('roem', MITTE_VARIANTEN['slot:mitte_roemisch'], {
    tor: { min: [44, 30], max: [60, 40] }, thermen: { min: [66, 50], max: [84, 60] }, basilika: { min: [70, 64], max: [84, 72] }, amphitheater: { min: [64, 52], max: [72, 58] },
  }, roemischRoh),
  'slot:mitte_industrie': slot('ind', MITTE_VARIANTEN['slot:mitte_industrie'], {
    alle: { min: [130, 96], max: [160, 110] },
  }, industrieRoh),
  // Der Hang liegt immer auf der kameraabgewandten Seite (Welt -x oder -z): Front -z wird zu +x, Front -x zu +z
  'slot:mitte_weinort': ((f) => (S, scene, p) => f(S, scene, { ...p, front: { '-z': '+x', '-x': '+z' }[p.front] ?? p.front }))(slot('wein', MITTE_VARIANTEN['slot:mitte_weinort'], {
    rhein: { min: [80, 76], max: [100, 90] }, mosel: { min: [76, 84], max: [96, 96] }, winzerhof: { min: [70, 72], max: [90, 84] },
  }, weinortRoh)),
  'slot:mitte_bahnhof': slot('bf', MITTE_VARIANTEN['slot:mitte_bahnhof'], {
    gross: { min: [170, 130], max: [190, 150] }, drei: { min: [120, 110], max: [140, 130] }, nachkrieg: { min: [100, 100], max: [130, 120] },
  }, bahnhofRoh),
  // Wie beim Weinort liegt der Hang immer kameraabgewandt: Front -z wird zu +x, Front -x zu +z
  'slot:mitte_oberstadt': ((f) => (S, scene, p) => f(S, scene, { ...p, front: { '-z': '+x', '-x': '+z' }[p.front] ?? p.front }))(slot('ob', MITTE_VARIANTEN['slot:mitte_oberstadt'], {
    schloss: { min: [86, 80], max: [120, 100] }, dom: { min: [86, 80], max: [120, 100] },
  }, oberstadtRoh)),
};

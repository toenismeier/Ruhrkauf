// Nordbauten: norddeutsche Architektur (Backsteingotik, Hanse, Klinkerexpressionismus, Wiederaufbau, Küste) als Slot-Generatoren.
// Alle Slots: (S, scene, p) mit p = { x, z, w, d, seed, variante?, front?: '+x'|'+z'|'-x'|'-z', zustand? } -> { hoehe }
// Typische, eigenständige Vertreter, keine Kopien realer Einzelbauten.
//
// Drehung: Jeder Bau entsteht in einem lokalen Rahmen [0, W] × [0, D] mit der Front (Straße, Wasser) an lokal +z.
// gedreht() dreht ihn auf die gewünschte Front und setzt ihn in [x, x+w] × [z, z+d]. Welche lokalen Seiten danach
// zur Kamera zeigen, beantwortet p.sieht(nx, nz); genau diese Seiten werden voll detailliert.
//
// Rahmen-Konzept wie in ostbauten.js: Fassade = Rahmen F mit Ursprung, Laufrichtung, Normale und Länge L.
// Koordinaten auf dem Rahmen: u entlang der Fassade, y Höhe, t nach außen (t < 0 = im Gebäude).
import { THREE, FARBEN, Sammler, rng, waehle, zw, heller, dunkler, textTextur, textMaterial, dachProfil, walmdach, LOD } from './basis.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
/** Rahmen der vier Seiten eines Rechtecks, jeweils von außen gesehen von links nach rechts. */
function seiten(x0, z0, x1, z1) {
  return { '+z': R(x0, z1, 1, 0, x1 - x0), '+x': R(x1, z1, 0, -1, z1 - z0), '-z': R(x1, z0, -1, 0, x1 - x0), '-x': R(x0, z0, 0, 1, z1 - z0) };
}
/** Rahmen der Kanten eines Polygons (Reihenfolge wie rechteck(): Normale (-dz, dx) zeigt nach außen). */
function kanten(poly) {
  return poly.map((a, i) => { const b = poly[(i + 1) % poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]); return R(a[0], a[1], (b[0] - a[0]) / L, (b[1] - a[1]) / L, L); });
}
const rechteck = (x0, z0, x1, z1) => [[x0, z1], [x1, z1], [x1, z0], [x0, z0]];
function einruecken(poly, s) {
  const n = poly.length, L = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l;
    L.push([a[0] + dz * s, a[1] - dx * s, dx, dz]);
  }
  return L.map((l, i) => {
    const m = L[(i + n - 1) % n], det = m[2] * l[3] - m[3] * l[2];
    if (Math.abs(det) < 1e-6) return [l[0], l[1]];
    const t = ((l[0] - m[0]) * l[3] - (l[1] - m[1]) * l[2]) / det;
    return [m[0] + m[2] * t, m[1] + m[3] * t];
  });
}
function prisma(S, poly, y0, y1, c, loecher = []) {
  const s = new THREE.Shape();
  poly.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  for (const h of loecher) { const q = new THREE.Path(); h.forEach(([x, z], i) => (i ? q.lineTo(x, -z) : q.moveTo(x, -z))); s.holes.push(q); }
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(-PI / 2); g.translate(0, y0, 0);
  S.add(g, c);
}
/** Dreiecke [[a,b,c], ...] als flach schattierte Hülle, Normalen zeigen von mitte weg. */
function huelle(S, tris, mitte, c) {
  const pos = [];
  for (const [a, b, d] of tris) {
    const n = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a)).cross(new THREE.Vector3().subVectors(new THREE.Vector3(...d), new THREE.Vector3(...a)));
    const m = [(a[0] + b[0] + d[0]) / 3 - mitte[0], (a[1] + b[1] + d[1]) / 3 - mitte[1], (a[2] + b[2] + d[2]) / 3 - mitte[2]];
    if (n.x * m[0] + n.y * m[1] + n.z * m[2] < 0) pos.push(...a, ...d, ...b); else pos.push(...a, ...b, ...d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  S.add(g, c);
}
/** Walm- oder Krüppelwalmdach über [x0,x1] × [z0,z1], First entlang z (achse 'z') oder x. kv/kh: Walmtiefe vorn (+) / hinten, kw: Anteil Krüppelwalm vorn (0 = voller Walm, 1 = Giebel). */
function walm(S, x0, z0, x1, z1, y0, h, c, o = {}) {
  const achse = o.achse ?? 'z';
  // lokal: Breite b quer, Länge l entlang First
  const P = achse === 'z' ? (q, l, y) => [q, y, l] : (q, l, y) => [l, y, q];
  const [q0, q1, l0, l1] = achse === 'z' ? [x0, x1, z0, z1] : [z0, z1, x0, x1];
  const qm = (q0 + q1) / 2, yT = y0 + h, kv = o.kv ?? (q1 - q0) / 2, kh = o.kh ?? (q1 - q0) / 2;
  const A = P(q0, l1, y0), B = P(q1, l1, y0), C = P(q1, l0, y0), Dd = P(q0, l0, y0);
  const RF = P(qm, l1 - kv, yT), RB = P(qm, l0 + kh, yT);
  const tris = [];
  const kw = o.kw ?? 0, kwh = o.kwh ?? 0;
  if (kw > 0) {
    const PL = P(q0 + kw * (qm - q0), l1, y0 + kw * h), PR = P(q1 - kw * (q1 - qm), l1, y0 + kw * h);
    tris.push([A, PL, RF], [A, RF, RB], [B, RF, PR], [B, RB, RF], [PL, PR, RF]);
    if (o.giebel !== false) tris.push([A, B, PR], [A, PR, PL]);
  } else tris.push([A, RF, RB], [B, RB, RF], [A, B, RF]);
  if (kwh > 0) {
    const QL = P(q0 + kwh * (qm - q0), l0, y0 + kwh * h), QR = P(q1 - kwh * (q1 - qm), l0, y0 + kwh * h);
    tris.push([Dd, RB, QL], [C, QR, RB], [QL, RB, QR], [A, RB, Dd], [B, C, RB]);
    if (o.giebel !== false) tris.push([Dd, C, QR], [Dd, QR, QL]);
  } else tris.push([A, RB, Dd], [B, C, RB], [C, Dd, RB]);
  huelle(S, tris, achse === 'z' ? [qm, y0 - 0.01, (l0 + l1) / 2] : [(l0 + l1) / 2, y0 - 0.01, qm], c);
}
function zyl(S, rO, rU, h, x, y0, z, c, seg = 16, offen = false) {
  const g = new THREE.CylinderGeometry(rO, rU, h, seg, 1, offen);
  g.translate(x, y0 + h / 2, z);
  S.add(g, c);
}
function kegel(S, r, h, x, y0, z, c, seg = 8, rot = PI / 8) {
  const g = new THREE.ConeGeometry(r, h, seg); g.rotateY(rot); g.translate(x, y0 + h / 2, z); S.add(g, c);
}
function stab(S, a, b, rad, c, seg = 6) {
  const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const g = new THREE.CylinderGeometry(rad, rad, v.length(), seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()));
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
/** Balken im Rahmen von (u0,y0) nach (u1,y1), Tiefe t0..t1. */
function fbalken(S, F, u0, y0, u1, y1, br, t0, t1, c) {
  const L = Math.hypot(u1 - u0, y1 - y0);
  const g = new THREE.BoxGeometry(L, br, t1 - t0);
  g.rotateZ(Math.atan2(y1 - y0, u1 - u0)); g.translate((u0 + u1) / 2, (y0 + y1) / 2, (t0 + t1) / 2);
  fgeo(S, F, g, c);
}
function boden(S, x0, z0, x1, z1, c, y = 0.3, h = 0.06) { if (x1 > x0 + 0.01 && z1 > z0 + 0.01) S.quader(x0, y, z0, x1, y + h, z1, c); }
function hash(a, b, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 1274126177) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
function achsen(u0, u1, ra, rand = 0.6) {
  const na = Math.max(1, Math.floor((u1 - u0 - 2 * rand) / ra + 0.15)), off = u0 + (u1 - u0 - na * ra) / 2;
  return Array.from({ length: na }, (_, i) => off + (i + 0.5) * ra);
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
function fscheibe(S, F, u, y, t0, t1, rad, c, seg = 16) {
  const g = new THREE.CylinderGeometry(rad, rad, t1 - t0, seg);
  g.rotateX(PI / 2); g.translate(u, y, (t0 + t1) / 2);
  fgeo(S, F, g, c);
}

// ---------- Flächen mit Öffnungen ----------
/** Umriss einer Öffnung in einen Pfad: rechteckig, Rundbogen ('rund'), Spitzbogen ('spitz'), Segment ('segment') oder Kreis. */
function pfad(P, l, e = 0) {
  if (l.kreis) { P.absarc(l.kreis[0], l.kreis[1], l.kreis[2] + e, 0, 2 * PI, true); return P; }
  const u0 = l.u0 - e, u1 = l.u1 + e, v0 = l.v0 - e, v1 = l.v1 + e, b = u1 - u0;
  P.moveTo(u0, v0); P.lineTo(u1, v0);
  if (l.art === 'spitz' && v1 - v0 > b * 0.9) {
    const vs = v1 - b * 0.866;
    P.lineTo(u1, vs); P.absarc(u0, vs, b, 0, PI / 3, false); P.absarc(u1, vs, b, (2 * PI) / 3, PI, false);
  } else if (l.art === 'rund' && v1 - v0 > b * 0.55) {
    const vs = v1 - b / 2;
    P.lineTo(u1, vs); P.absarc((u0 + u1) / 2, vs, b / 2, 0, PI, false);
  } else if (l.art === 'segment') {
    const vs = v1 - b * 0.15, rr = (b * b / 4 + (b * 0.15) ** 2) / (2 * b * 0.15), a0 = Math.asin(b / 2 / rr);
    P.lineTo(u1, vs); P.absarc((u0 + u1) / 2, v1 - rr, rr, PI / 2 - a0, PI / 2 + a0, false);
  } else { P.lineTo(u1, v1); P.lineTo(u0, v1); }
  P.lineTo(u0, v0);
  return P;
}
function kaempfer(l) { const b = l.u1 - l.u0; return l.art === 'spitz' ? l.v1 - b * 0.866 : l.art === 'rund' ? l.v1 - b / 2 : l.art === 'segment' ? l.v1 - b * 0.15 : l.v1; }
function formen(S, F, shapes, t0, t1, c, seg = 6) {
  if (!shapes.length) return;
  const g = new THREE.ExtrudeGeometry(shapes, { depth: t1 - t0, bevelEnabled: false, curveSegments: seg });
  g.translate(0, 0, t0);
  fgeo(S, F, g, c);
}
function umrissForm(umr) {
  const s = new THREE.Shape();
  if (typeof umr[0] === 'number') { const [u0, v0, u1, v1] = umr; s.moveTo(u0, v0); s.lineTo(u1, v0); s.lineTo(u1, v1); s.lineTo(u0, v1); s.lineTo(u0, v0); return s; }
  umr.forEach(([u, v], i) => (i ? s.lineTo(u, v) : s.moveTo(u, v)));
  s.lineTo(umr[0][0], umr[0][1]);
  return s;
}
const rform = (u0, v0, u1, v1) => umrissForm([u0, v0, u1, v1]);
/**
 * Wand mit Öffnungen. umr: [u0, v0, u1, v1] oder Polygon [[u, v], ...].
 * oeff: [{ u0, v0, u1, v1, art?, kreis?, typ: 'fenster'|'nische'|'tuer'|'offen'|'laden', fuell?, sprosse? }]
 * o: { tw (Wandstärke), rahmen (Fensterrahmenfarbe), glas, nische, tuer, bank, sprosse }
 */
/** Rechteckige Wand mit rechteckigen Öffnungen als Bänder aus Quadern (ein Teil), statt Triangulierung mit Löchern. */
/**
 * Rechteckwand mit vielen Öffnungen als Streifen: zwischen den Fensterreihen (und -achsen) geschnitten, damit die
 * Triangulierung je Form nur wenige Löcher hat (Laufzeit wächst sonst quadratisch mit der Lochzahl). Gleiche Fläche.
 */
function wandStreifen(umr, oeff) {
  const ausd = (l, ach) => (l.kreis ? [l.kreis[ach] - l.kreis[2], l.kreis[ach] + l.kreis[2]] : ach === 0 ? [l.u0, l.u1] : [l.v0, l.v1]);
  const schnitte = (liste, a, b, ach) => {
    const iv = liste.map((l) => ausd(l, ach)).sort((p, q) => p[0] - q[0]);
    const cut = [];
    let ende = -Infinity;
    for (const [c, d] of iv) { if (ende > -Infinity && c > ende + 0.02) cut.push((ende + c) / 2); ende = Math.max(ende, d); }
    return [a, ...cut.filter((x) => x > a + 0.01 && x < b - 0.01), b];
  };
  const formenListe = [];
  const [U0, V0, U1, V1] = umr;
  const vs = schnitte(oeff, V0, V1, 1);
  for (let k = 0; k + 1 < vs.length; k++) {
    const a = vs[k], b = vs[k + 1], m = (a + b) / 2;
    const reihe = oeff.filter((l) => { const [c, d] = ausd(l, 1); return c < b && d > a && (c + d) / 2 > a - 0.001 && (c + d) / 2 <= b + 0.001; });
    void m;
    const us = reihe.length > 6 ? schnitte(reihe, U0, U1, 0) : [U0, U1];
    for (let q = 0; q + 1 < us.length; q++) {
      const s = umrissForm([us[q], a, us[q + 1], b]);
      for (const l of reihe) { const [c, d] = ausd(l, 0); if ((c + d) / 2 > us[q] && (c + d) / 2 < us[q + 1]) s.holes.push(pfad(new THREE.Path(), l)); }
      formenListe.push(s);
    }
  }
  return formenListe;
}
function rasterWand(S, F, umr, oeff, t0, t1, farbe) {
  const [U0, V0, U1, V1] = umr;
  const vs = [...new Set([V0, V1, ...oeff.flatMap((l) => [l.v0, l.v1]).filter((v) => v > V0 && v < V1)])].sort((a, b) => a - b);
  const gs = [];
  const box = (u0, v0, u1, v1) => { if (u1 - u0 < 0.005 || v1 - v0 < 0.005) return; const g = new THREE.BoxGeometry(u1 - u0, v1 - v0, t1 - t0).toNonIndexed(); g.deleteAttribute('uv'); g.translate((u0 + u1) / 2, (v0 + v1) / 2, (t0 + t1) / 2); gs.push(g); };
  for (let k = 0; k + 1 < vs.length; k++) {
    const a = vs[k], b = vs[k + 1], m = (a + b) / 2;
    const weg = oeff.filter((l) => l.v0 <= m && l.v1 >= m).map((l) => [Math.max(U0, l.u0), Math.min(U1, l.u1)]).sort((p, q) => p[0] - q[0]);
    let u = U0;
    for (const [c, d] of weg) { if (c > u) box(u, a, c, b); u = Math.max(u, d); }
    if (U1 > u) box(u, a, U1, b);
  }
  if (gs.length) fgeo(S, F, mergeGeometries(gs), farbe);
}
function lochwand(S, F, umr, oeff, farbe, o = {}) {
  const tw = o.tw ?? 0.4;
  if (typeof umr[0] === 'number' && oeff.length >= 3 && oeff.every((l) => !l.kreis && !l.art)) rasterWand(S, F, umr, oeff, -tw, o.t1 ?? 0, farbe);
  else if (typeof umr[0] === 'number' && oeff.length > 8) formen(S, F, wandStreifen(umr, oeff), -tw, o.t1 ?? 0, farbe, o.seg ?? 6);
  else {
    const s = umrissForm(umr);
    for (const l of oeff) s.holes.push(pfad(new THREE.Path(), l));
    formen(S, F, [s], -tw, o.t1 ?? 0, farbe, o.seg ?? 6);
  }
  const fuell = new Map(), ringe = [], sprossen = [], baenke = [];
  const add = (c, tief, sh) => { const k = c + '|' + tief; if (!fuell.has(k)) fuell.set(k, { c, tief, s: [] }); fuell.get(k).s.push(sh); };
  for (const l of oeff) {
    if (l.typ === 'offen') continue;
    const tief = l.tief ?? (l.typ === 'nische' ? 0.2 : 0.26);
    const c = l.fuell ?? (l.typ === 'nische' ? o.nische ?? dunkler(farbe, 0.08) : l.typ === 'tuer' ? o.tuer ?? '#3a4a3c' : o.glas ?? GLAS);
    add(c, tief, pfad(new THREE.Shape(), l, 0.07));
    const rahmen = l.rahmen ?? o.rahmen;
    // Rahmen und Sprossen nur in der Nahstufe (LOD 'fern' in basis.js)
    if ((l.typ === 'fenster' || l.typ === 'laden') && rahmen && LOD.stufe !== 'fern') {
      const k = l.kreis ? 0.09 : Math.min(0.12, (l.u1 - l.u0) * 0.12);
      const ring = pfad(new THREE.Shape(), l, 0);
      ring.holes.push(pfad(new THREE.Path(), l.kreis ? { kreis: [l.kreis[0], l.kreis[1], l.kreis[2] - k] } : { ...l, u0: l.u0 + k, u1: l.u1 - k, v0: l.v0 + k, v1: l.v1 - k }));
      ringe.push([rahmen, tief, ring]);
      const sp = l.sprosse ?? o.sprosse ?? true;
      if (sp && !l.kreis) {
        const b = l.u1 - l.u0, um = (l.u0 + l.u1) / 2, vk = kaempfer(l);
        const nv = l.typ === 'laden' ? Math.max(1, Math.round(b / 1.4) - 1) : b > 1.7 ? 2 : 1;
        for (let i = 1; i <= nv; i++) { const u = l.u0 + (b * i) / (nv + 1); sprossen.push([rahmen, tief, rform(u - 0.035, l.v0 + 0.05, u + 0.035, (l.art ? l.v1 : l.v1) - 0.08)]); }
        if (l.typ !== 'laden') { const v = l.art ? vk : l.v0 + (l.v1 - l.v0) * 0.66; sprossen.push([rahmen, tief, rform(l.u0 + 0.05, v - 0.035, l.u1 - 0.05, v + 0.035)]); }
        else sprossen.push([rahmen, tief, rform(l.u0 + 0.05, l.v1 - 0.6, l.u1 - 0.05, l.v1 - 0.53)]);
        void um;
      }
    }
    if (o.bank && l.typ === 'fenster' && !l.kreis && l.bank !== false) baenke.push(rform(l.u0 - 0.1, l.v0 - 0.14, l.u1 + 0.1, l.v0));
  }
  for (const { c, tief, s: sh } of fuell.values()) formen(S, F, sh, -tief - 0.06, -tief, c, o.seg ?? 6);
  const gr = new Map();
  for (const [c, tief, sh] of [...ringe, ...sprossen]) { const k = c + '|' + tief; if (!gr.has(k)) gr.set(k, { c, tief, s: [] }); gr.get(k).s.push(sh); }
  for (const { c, tief, s: sh } of gr.values()) formen(S, F, sh, -tief, -tief + 0.07, c, Math.min(4, o.seg ?? 6));
  if (baenke.length) formen(S, F, baenke, -0.05, 0.14, o.bank);
}
/** Mehrere Rechtecke/Polygone als ein Teil auf der Fassade (Bänder, Lisenen, Zierrat). */
function platten(S, F, liste, t0, t1, c) { formen(S, F, liste.map((q) => (q.length === 4 && typeof q[0] === 'number' ? rform(...q) : umrissForm(q))), t0, t1, c); }
const fenster = (u, v, b, h, art = null, x = {}) => ({ u0: u - b / 2, u1: u + b / 2, v0: v, v1: v + h, art, typ: 'fenster', ...x });

// ---------- Farben ----------
const GLAS = '#4b5a66', GLAS_HELL = '#6d8595', WEISS = '#f7f5ef', DUNKEL = '#3a3f44', STAHL = '#5a6168', METALL = '#9aa1a7';
/** Wasserspiegel in Hafen und Fleet: Gelände bleibt auf Gehweghöhe, nur das Becken ist abgesenkt. */
const YW = -1.1;
const PFLASTER = '#cbc5b8', WEG = '#d6d0c2', RASEN = '#9dc283', RASEN2 = '#a9c98c', SAND = '#ecdcb0', WASSER = FARBEN.wasser, WASSER_TIEF = '#2f6f7d';   // zentrale Wasserfarbe (basis.js FARBEN.wasser)
const GRANIT = '#aaa69d', GRANIT_D = '#8f8b83', SANDSTEIN = '#e3d6bb';
const NF = {
  backstein: ['#9a4632', '#a4503a', '#8e4130', '#a95a40'],
  hell: ['#b8683f', '#ae5f3d', '#c07449', '#b46a45'],
  dunkel: ['#7a3528', '#6f3125', '#84392b'],
  klinker: ['#6b3427', '#74392a', '#5f2e23', '#7e402d'],
  rotklinker: ['#8a3d2d', '#93432f', '#7f3829', '#9a4a33'],
  gelbklinker: ['#c9a678', '#c29d6c', '#d0b083', '#bf9a6a'],
  pastell: ['#f0dfa8', '#ebcabd', '#cfe1d2', '#d3e1ec', '#f3eee2', '#eed6a8', '#e6c8d4', '#dbe6c2'],
  ziegel: ['#a9472f', '#b5553a', '#9c4330'],
  dunkelziegel: ['#55443f', '#5d4a43', '#4b3d39'],
  kupfer: ['#6fa58a', '#79ae94', '#68a084'],
  schiefer: ['#56616a', '#5e6870', '#4f5960'],
  reet: ['#a68e63', '#9c865d', '#b0986c'],
  tuer: ['#2f5243', '#5c2f2a', '#2f405c', '#4b3a2d', '#7a2e2e'],
  markise: ['#c9483e', '#2f6f8f', '#3f7d56', '#d39a2b', '#1f3a5f', '#8c3b3b'],
};
const LADEN_NORD = ['Marzipan & Café', 'Buchhandlung', 'Kunsthandwerk', 'Weinhandlung', 'Antiquariat', 'Fischhaus', 'Teehandel', 'Goldschmiede', 'Bernstein', 'Bäckerei', 'Seemannsladen', 'Galerie', 'Kaffeerösterei', 'Brillen', 'Konditorei'];

// =====================================================================================
// Drehung: Front an lokal +z, in die gewünschte Richtung gedreht
// =====================================================================================
const WINKEL = { '+z': 0, '+x': PI / 2, '-z': PI, '-x': -PI / 2 };
/** Baut lokal in [0, W] × [0, D] (Größe w × d, um dx/dz versetzt); zu kleine Flächen in Nennmaß und verkleinert. */
function lokalBauen(bau, q, w, d, dx, dz, min) {
  const T = new Sammler(), grp = new THREE.Group();
  let erg;
  if (w >= min[0] - 1e-6 && d >= min[1] - 1e-6) erg = bau(T, grp, { ...q, w, d });
  else {
    // zu kleiner Slot: in Nennmaß bauen und gleichmäßig verkleinern; Boden bleibt auf Gehweghöhe
    const nw = Math.max(min[0], w), nd = Math.max(min[1], d), sk = Math.min(w / nw, d / nd);
    const T2 = new Sammler(), g2 = new THREE.Group();
    erg = bau(T2, g2, { ...q, w: nw, d: nd });
    const ox0 = (w - nw * sk) / 2, oz0 = (d - nd * sk) / 2, oy = 0.3 * (1 - sk);
    for (const [farbe, gs] of T2.teile) for (const g of gs) { g.scale(sk, sk, sk); g.translate(ox0, oy, oz0); T.add(g, farbe); }
    g2.scale.setScalar(sk); g2.position.set(ox0, oy, oz0); grp.add(g2);
    if (erg.wasser) erg.wasser = erg.wasser.map((v, i) => v * sk + (i % 2 ? oz0 : ox0));
    erg = { ...erg, hoehe: erg.hoehe * sk, skala: sk };
  }
  if (dx || dz) {
    for (const gs of T.teile.values()) for (const g of gs) g.translate(dx, 0, dz);
    grp.position.x += dx; grp.position.z += dz;
    if (erg.wasser) erg.wasser = erg.wasser.map((v, i) => v + (i % 2 ? dz : dx));
  }
  return { T, grp, erg };
}
function ausdehnung(T, grp) {
  const box = new THREE.Box3();
  for (const gs of T.teile.values()) for (const g of gs) { g.computeBoundingBox(); box.union(g.boundingBox); }
  grp.updateMatrixWorld(true);
  const bg = new THREE.Box3().setFromObject(grp);
  if (!bg.isEmpty()) box.union(bg);
  return box;
}
const RAND_TOLERANZ = 0.5;
/** Zur Front (Straße) dürfen Vordächer, Beischläge, Treppen und Utluchten weiter in den Gehweg ragen. */
const FRONT_TOLERANZ = 2.0;
function gedreht(S, scene, p, bau, min = [0, 0]) {
  const front = WINKEL[p.front] !== undefined ? p.front : '+z';
  const a = WINKEL[front], quer = front[1] === 'x';
  const W = quer ? p.d : p.w, D = quer ? p.w : p.d;
  const c = Math.round(Math.cos(a)), s = Math.round(Math.sin(a));
  const sieht = (nx, nz) => nx * c + nz * s + (-nx * s + nz * c) > 0.05;
  const q = { ...p, x: 0, z: 0, front, sieht };
  // Vorbauten (Vordächer, Treppen, Utluchten) dürfen höchstens RAND_TOLERANZ über den Slot ragen: sonst Baukörper einrücken
  let l = 0, rr = 0, h = 0, v = 0, bau1;
  for (let i = 0; i < 3; i++) {
    bau1 = lokalBauen(bau, q, W - l - rr, D - h - v, l, h, min);
    const bx = ausdehnung(bau1.T, bau1.grp), m = RAND_TOLERANZ - 0.08;
    const dl = Math.max(0, -bx.min.x - m), dr = Math.max(0, bx.max.x - W - m), dh = Math.max(0, -bx.min.z - m), dv = Math.max(0, bx.max.z - D - (FRONT_TOLERANZ - 0.08));
    if (dl + dr + dh + dv < 0.01 || W - l - rr - dl - dr < 4 || D - h - v - dh - dv < 4) break;
    l += dl; rr += dr; h += dh; v += dv;
  }
  const { T, grp, erg } = bau1;
  const ecken = [[0, 0], [W, 0], [0, D], [W, D]].map(([x, z]) => [x * c + z * s, -x * s + z * c]);
  const ox = p.x - Math.min(...ecken.map((e) => e[0])), oz = p.z - Math.min(...ecken.map((e) => e[1]));
  for (const [farbe, gs] of T.teile) for (const g of gs) { if (a) g.rotateY(a); g.translate(ox, 0, oz); S.add(g, farbe); }
  const huelleGrp = new THREE.Group(); huelleGrp.add(grp); huelleGrp.rotation.y = a; huelleGrp.position.set(ox, 0, oz); scene.add(huelleGrp);
  if (erg.wasser) {
    const [x0, z0, x1, z1] = erg.wasser, pk = [[x0, z0], [x1, z1]].map(([x, z]) => [x * c + z * s + ox, -x * s + z * c + oz]);
    erg.wasser = [Math.min(pk[0][0], pk[1][0]), Math.min(pk[0][1], pk[1][1]), Math.max(pk[0][0], pk[1][0]), Math.max(pk[0][1], pk[1][1])];
  }
  return erg;
}
const sieht = (p, F) => p.sieht(F.nx, F.nz);

// ---------- kleine Ausstattung ----------
function baumN(S, r, x, z, s = 1, art = 'laub') {
  S.box(0.45 * s, 2.4 * s, 0.45 * s, x, 1.5 * s, z, '#7a5d43');
  if (art === 'kegel') { kegel(S, 1.6 * s, 5 * s, x, 2.2 * s, z, waehle(r, ['#4f8a52', '#5a9658']), 7); return; }
  const g = new THREE.IcosahedronGeometry(2.0 * s * (0.85 + r() * 0.3), 0); g.translate(x, 3.9 * s, z);
  S.add(g, waehle(r, ['#6fa860', '#5f9a56', '#7cb369', '#679f5a']));
}
function busch(S, r, x, z, s = 1) { const g = new THREE.IcosahedronGeometry(0.8 * s, 0); g.scale(1, 0.75, 1); g.translate(x, 0.3 + 0.55 * s, z); S.add(g, waehle(r, ['#6a9f58', '#5d9450', '#78ad62'])); }
function laterne(S, x, z, h = 4.5, y0 = 0.3) { S.box(0.16, h, 0.16, x, y0 + h / 2, z, '#2f3a40'); S.box(0.5, 0.55, 0.5, x, y0 + h + 0.2, z, '#f2ead0'); S.box(0.62, 0.12, 0.62, x, y0 + h + 0.52, z, '#2f3a40'); }
function bank(S, x, z, ry = 0, y0 = 0.3) { S.box(1.8, 0.1, 0.5, x, y0 + 0.45, z, '#8a6a4a', ry); S.box(1.8, 0.45, 0.08, x - Math.sin(ry) * 0.25, y0 + 0.75, z - Math.cos(ry) * 0.25, '#8a6a4a', ry); S.box(1.6, 0.45, 0.4, x, y0 + 0.22, z, '#3a3f44', ry); }
function poller(S, x, z, y0) { zyl(S, 0.22, 0.28, 0.6, x, y0, z, '#2e3236', 8); zyl(S, 0.34, 0.34, 0.1, x, y0 + 0.6, z, '#2e3236', 8); }
function fahne(S, x, z, y0, h, farbe) { S.box(0.1, h, 0.1, x, y0 + h / 2, z, '#e8e6e0'); S.box(0.05, 0.9, 1.4, x, y0 + h - 0.6, z + 0.72, farbe); }

// =====================================================================================
// 1. Hanseatische Giebelhäuser als Häuserzeile
// =====================================================================================
const GIEBEL_POOL = {
  luebeck: ['treppe', 'treppe', 'fialen', 'volute', 'trauf', 'treppe', 'dreieck'],
  stralsund: ['fialen', 'fialen', 'treppe', 'volute', 'trauf', 'fialen'],
  lueneburg: ['rund', 'rund', 'treppe', 'volute', 'rund', 'trauf'],
  pastell: ['volute', 'dreieck', 'trauf', 'volute', 'dreieck', 'treppe'],
};
/** Umriss des Giebels über der Traufe (H) als Punktliste von rechts (bw, H) nach links (0, H). */
function giebelUmriss(typ, bw, H, G, m) {
  const c = bw / 2, pk = [[bw, H]];
  if (typ === 'treppe' || typ === 'fialen' || typ === 'rund') {
    const n = 2 * m + 1, cw = bw / n, st = G / (m + 1);
    for (let j = n - 1; j >= 0; j--) {
      const y = H + (Math.min(j, n - 1 - j) + 1) * st;
      if (typ === 'rund') {
        const rr = cw / 2;
        pk.push([(j + 1) * cw, y - rr]);
        for (let s = 0; s <= 6; s++) { const a = (s / 6) * PI; pk.push([j * cw + rr + Math.cos(a) * rr, y - rr + Math.sin(a) * rr]); }
      } else { pk.push([(j + 1) * cw, y]); pk.push([j * cw, y]); }
    }
  } else if (typ === 'volute') {
    const h1 = bw * 0.31, h2 = bw * 0.17, y1 = H + G * 0.42, y2 = H + G * 0.74, halb = [];
    const bogen = (px, py, qx, qy) => { for (let s = 1; s <= 6; s++) { const t = (s / 6) * (PI / 2); halb.push([qx + (px - qx) * Math.cos(t), py + (qy - py) * Math.sin(t)]); } };
    halb.push([bw, H + 0.3]);
    bogen(bw, H + 0.3, c + h1, y1);
    halb.push([c + h1, y1 + 0.8]);
    bogen(c + h1, y1 + 0.8, c + h2, y2);
    halb.push([c + h2, y2 + 0.9], [c + h2 + 0.35, y2 + 0.9]);
    pk.push(...halb, [c, H + G], ...halb.slice().reverse().map(([u, v]) => [bw - u, v]));
  } else if (typ === 'dreieck') pk.push([c, H + G]);
  pk.push([0, H]);
  return pk.filter((q, i) => i === 0 || Math.hypot(q[0] - pk[i - 1][0], q[1] - pk[i - 1][1]) > 0.01);
}
function giebelHaus(S, scene, p, r, o) {
  const { a, b, T, D, typ, wand, orn, dach, n, eg, gh } = o;
  const bw = b - a, H = eg + n * gh, c = bw / 2;
  const putz = o.putz;
  const FF = R(a, D, 1, 0, bw);
  const traufe = typ === 'trauf';
  const m = bw < 7.2 ? 2 : bw < 9.6 ? 3 : 4;
  const G = traufe ? 0 : typ === 'dreieck' ? bw * zw(r, 0.55, 0.7) : bw * zw(r, 0.95, 1.2);
  const Gr = typ === 'dreieck' ? G : typ === 'volute' ? G * 0.66 : (G * (2 * m + 1)) / (2 * m + 2) * 0.93;
  const zR = D - T, zH = sieht(p, R(b, zR, -1, 0, bw)) ? zR + 0.4 : zR;
  const links = o.erster && sieht(p, R(a, zR, 0, 1, T)), rechts = o.letzter && sieht(p, R(b, D, 0, -1, T));
  // Kern
  S.quader(a + (links ? 0.4 : 0), 0, zH, b - (rechts ? 0.4 : 0), H, D - 0.4, wand);
  // ---- Front ----
  const umr = [[0, 0], [bw, 0], ...(traufe ? (() => { const zb = Math.min(bw * 0.5, 4.2); o.zwerch = zb; return [[bw, H], [c + zb / 2, H], [c + zb / 2, H + 2.7], [c, H + 4.3], [c - zb / 2, H + 2.7], [c - zb / 2, H]]; })() : giebelUmriss(typ, bw, H, G, m)), [0, H]].filter((q, i, arr) => i === 0 || Math.hypot(q[0] - arr[i - 1][0], q[1] - arr[i - 1][1]) > 0.01);
  const oe = [];
  const na = Math.max(2, Math.min(4, Math.floor((bw - 0.6) / 2.05))), ax = achsen(0, bw, (bw - 0.8) / na, 0.4);
  const fb_ = putz ? 1.15 : 1.05, fh = 1.85;
  const art = putz ? null : o.bogen;
  const ut = o.utlucht != null ? Math.min(ax.length - 1, o.utlucht) : -1;
  // Erdgeschoss: Diele mit Portal, Laden oder hohe Fenster
  const tAx = o.laden ? (ax.length > 2 ? ax.length - 1 : 0) : Math.floor(ax.length / 2) - (ax.length % 2 ? 0 : 1) * (r() < 0.5 ? 1 : 0);
  ax.forEach((u, i) => {
    if (i === ut) return;
    if (i === tAx) oe.push({ u0: u - 0.8, u1: u + 0.8, v0: 0.3, v1: 3.2, art: putz ? 'rund' : 'spitz', typ: 'tuer', fuell: o.tuer });
    else if (o.laden) oe.push({ u0: u - Math.min(1.2, (bw / na) / 2 - 0.2), u1: u + Math.min(1.2, (bw / na) / 2 - 0.2), v0: 0.7, v1: eg - 0.9, typ: 'laden', fuell: GLAS_HELL });
    else oe.push(fenster(u, 1.0, fb_, eg - 1.8, art));
  });
  for (let k = 0; k < n; k++) for (const u of ax) oe.push(fenster(u, eg + k * gh + 0.65, fb_, fh, art));
  // Giebelöffnungen
  const nischen = [];
  if (typ === 'treppe' || typ === 'fialen' || typ === 'rund') {
    const nc = 2 * m + 1, cw = bw / nc, st = G / (m + 1);
    for (let j = 0; j < nc; j++) {
      const lv = Math.min(j, nc - 1 - j) + 1, top = H + lv * st - (typ === 'rund' ? cw / 2 + 0.25 : 0.55), rand = Math.min(0.32, cw * 0.2);
      const u0 = j * cw + rand, u1 = (j + 1) * cw - rand;
      let y = H + 0.55;
      if (u1 - u0 < 0.35 || top - y < 1.2) continue;
      const zentral = Math.abs(j - m) <= (m >= 3 ? 1 : 0) && u1 - u0 > 0.7;
      // Fenster in den unteren Giebelgeschossen (mittlere Spalten), darüber Blendnische
      if (zentral) for (let k = 0; k < 2 && y + 2.0 < top - 0.8; k++) { const fwj = Math.min(fb_, u1 - u0 - 0.1); oe.push(fenster((u0 + u1) / 2, y + 0.1, fwj, 1.6, null)); y += 2.6; }
      if (j === m && top - y > 3.2) { oe.push({ u0: (u0 + u1) / 2 - 0.55, u1: (u0 + u1) / 2 + 0.55, v0: top - 2.4, v1: top - 0.9, typ: 'tuer', fuell: o.tuer }); o.luke = [(u0 + u1) / 2, top - 0.9]; nischen.push({ u0, u1, v0: y, v1: top - 2.7 }); }
      else nischen.push({ u0, u1, v0: y, v1: top });
    }
    for (const q of nischen) if (q.v1 - q.v0 > 1.0) oe.push({ ...q, art: o.nischenArt, typ: 'nische', fuell: o.nischenFarbe });
  } else if (typ === 'volute') {
    const y1 = H + G * 0.42, y2 = H + G * 0.74;
    oe.push(fenster(c, H + 0.7, 1.05, 1.7, 'rund'));
    if (bw > 6.5) { oe.push(fenster(c - bw * 0.22, H + 0.7, 0.9, 1.5)); oe.push(fenster(c + bw * 0.22, H + 0.7, 0.9, 1.5)); }
    if (y2 - y1 > 2.2) oe.push(fenster(c, y1 + 0.9, 0.9, 1.4, 'rund'));
    oe.push({ kreis: [c, y2 + 0.4 + (H + G - y2 - 0.4) * 0.28, 0.42], typ: 'fenster' });
  } else if (typ === 'dreieck') {
    oe.push(fenster(c, H + 0.6, 1.0, 1.6)); if (bw > 7) { oe.push(fenster(c - 2.0, H + 0.6, 0.85, 1.3)); oe.push(fenster(c + 2.0, H + 0.6, 0.85, 1.3)); }
    if (G > 4.2) oe.push({ kreis: [c, H + G * 0.68, 0.4], typ: 'fenster' });
  } else if (traufe) oe.push(fenster(c, H + 0.55, Math.min(1.6, o.zwerch - 1.2), 1.6));
  lochwand(S, FF, umr, oe, wand, { rahmen: WEISS, bank: putz ? orn : null, nische: o.nischenFarbe, tuer: o.tuer });
  // Gliederung der Front
  if (putz) {
    platten(S, FF, [[-0.05, 0, 0.35, H + 0.1], [bw - 0.35, 0, bw + 0.05, H + 0.1], [-0.12, eg - 0.2, bw + 0.12, eg + 0.1], [-0.2, H - 0.15, bw + 0.2, H + 0.3]], 0, 0.14, orn);
    if (typ === 'volute') { const y1 = H + G * 0.42, y2 = H + G * 0.74; platten(S, FF, [[c - bw * 0.31 - 0.15, y1 - 0.1, c + bw * 0.31 + 0.15, y1 + 0.12], [c - bw * 0.17 - 0.15, y2 - 0.1, c + bw * 0.17 + 0.15, y2 + 0.12]], 0, 0.18, orn); for (const s of [-1, 1]) fscheibe(S, FF, c + s * (bw * 0.31 + 0.05), y1 + 0.42, 0, 0.22, 0.3, orn, 10); }
    if (typ === 'dreieck') { const sh = umrissForm([[-0.3, H - 0.05], [bw + 0.3, H - 0.05], [c, H + G + 0.32]]); sh.holes.push((() => { const q = new THREE.Path(); q.moveTo(0.5, H + 0.25); q.lineTo(bw - 0.5, H + 0.25); q.lineTo(c, H + G - 0.25); q.lineTo(0.5, H + 0.25); return q; })()); formen(S, FF, [sh], 0, 0.16, orn); }
  } else {
    // glasierte Schichten und Sockel
    const bd = [[0, 0, bw, 0.55]];
    for (let k = 1; k <= n; k++) bd.push([0, eg + (k - 1) * gh + 0.25, bw, eg + (k - 1) * gh + 0.4]);
    platten(S, FF, bd, 0, 0.05, o.band);
    if (typ === 'treppe' || typ === 'fialen') {
      const nc = 2 * m + 1, cw = bw / nc, st = G / (m + 1), deck = [];
      for (let j = 0; j < nc; j++) { const y = H + (Math.min(j, nc - 1 - j) + 1) * st; deck.push([j * cw - 0.06, y, (j + 1) * cw + 0.06, y + 0.16]); }
      platten(S, FF, deck, -0.45, 0.16, o.deck);
      if (typ === 'fialen') {
        const fl = [];
        for (let j = 0; j <= nc; j++) {
          const yl = j > 0 ? H + (Math.min(j - 1, nc - j) + 1) * st : H, yr = j < nc ? H + (Math.min(j, nc - 1 - j) + 1) * st : H;
          const top = Math.max(yl, yr) + 1.3, u = Math.min(bw - 0.25, Math.max(0.25, j * cw));
          fl.push([u - 0.24, H - 0.4, u + 0.24, top]);
          const g = new THREE.ConeGeometry(0.36, 1.0, 4); g.rotateY(PI / 4); g.translate(u, top + 0.5, 0.02); fgeo(S, FF, g, o.deck);
        }
        platten(S, FF, fl, -0.3, 0.22, wand);
      }
    }
    if (typ === 'rund') {
      // Taustäbe an den Stufenkanten
      const nc = 2 * m + 1, cw = bw / nc, st = G / (m + 1), ts = [];
      for (let j = 1; j < nc; j++) { const yt = H + Math.min(Math.min(j - 1, nc - j), Math.min(j, nc - 1 - j)) * st + st; ts.push([j * cw - 0.1, H + 0.2, j * cw + 0.1, yt - 0.05]); }
      platten(S, FF, ts, 0, 0.12, o.deck);
    }
  }
  if (o.luke) { const [u, y] = o.luke; fb(S, FF, u - 0.12, u + 0.12, y + 0.3, y + 0.55, 0, 1.3, '#4a3a2e'); fb(S, FF, u - 0.03, u + 0.03, y - 1.6, y + 0.3, 1.2, 1.26, '#2b2f33'); }
  // Utlucht
  if (ut >= 0) {
    const u0 = ax[ut] - 1.3, u1 = ax[ut] + 1.3, hU = o.utluchtHoch ? eg + gh - 0.2 : eg - 0.1, tU = 1.1;
    const FU = teil(FF, u0, u1, tU);
    S.quader(...(() => { const [x0, z0] = wp(FF, u0 + 0.1, 0), [x1, z1] = wp(FF, u1 - 0.1, tU - 0.3); return [Math.min(x0, x1), 0, Math.min(z0, z1), Math.max(x0, x1), hU, Math.max(z0, z1)]; })(), wand);
    const uo = [];
    for (let y = 1.0; y + 1.9 < hU; y += eg - 0.3) { uo.push(fenster(0.7, y, 0.8, Math.min(1.9, hU - y - 0.5), null)); uo.push(fenster(1.9, y, 0.8, Math.min(1.9, hU - y - 0.5), null)); }
    lochwand(S, FU, [0, 0, 2.6, hU], uo, putz ? wand : wand, { rahmen: WEISS, tw: 0.3 });
    for (const s of [0, 1]) { const uu = s ? u1 : u0; fb(S, FF, uu - 0.15, uu + 0.15, 0, hU, 0, tU, putz ? orn : wand); }
    fb(S, FF, u0 - 0.2, u1 + 0.2, hU, hU + 0.3, 0, tU + 0.2, putz ? orn : o.deck);
    const gg = new THREE.BoxGeometry(2.9, 0.1, 1.2); gg.rotateX(0.5); gg.translate(ax[ut], hU + 0.6, tU * 0.45); fgeo(S, FF, gg, dach);
    fb(S, FF, u0 + 0.1, u1 - 0.1, 0, 0.6, 0, tU + 0.05, GRANIT_D);
  }
  // Laden: Schild
  if (o.laden) ftext(scene, FF, o.ladenName, c, eg - 0.48, 0.06, 0.42, bw - 1.2, putz ? '#2a3a4a' : '#f4ead2');
  // ---- Dach ----
  if (traufe) {
    const dh = T * 0.42, g = dachProfil(bw + 0.02, T + 0.5, dh, 0.25, 'x'); g.translate(a + c, H, zR + T / 2 - 0.2); S.add(g, dach);
    const zb = o.zwerch, gz = dachProfil(3.2, zb + 0.5, 1.75, 0.12, 'z'); gz.translate(a + c, H + 2.7, D - 1.75); S.add(gz, dach);
    for (const [F, uu] of [[R(a, zR, 0, 1, T), 0], [R(b, D, 0, -1, T), 0]]) { void uu; fpolyR(S, F, [[0.1, H], [T - 0.1, H], [T / 2, H + dh - 0.35]], -0.45, -0.05, wand); }
    const FRt = R(b, zR, -1, 0, bw);
    if (sieht(p, FRt)) { const ro = []; for (let k = 0; k < n; k++) for (const u of achsen(0, bw, 2.4, 0.5)) ro.push(fenster(u, eg + k * gh + 0.7, 1.0, 1.7)); for (const u of achsen(0, bw, 2.4, 0.5)) ro.push(fenster(u, 1.1, 1.0, 1.9)); lochwand(S, FRt, [0, 0, bw, H], ro, dunkler(wand, 0.02), { rahmen: WEISS }); }
    // Gauben
    if (bw > 7) for (const s of [-1, 1]) { const ug = c + s * bw * 0.3, yb = H + 0.9, zg = D - 0.4 - 0.9 / Math.tan(Math.atan2(dh, T / 2 + 0.25)) - 0.4; S.quader(a + ug - 0.6, yb - 0.6, zg - 1.4, a + ug + 0.6, yb + 1.4, zg, WEISS); S.box(0.8, 1.0, 0.08, a + ug, yb + 0.5, zg + 0.02, GLAS); S.quader(a + ug - 0.8, yb + 1.4, zg - 1.6, a + ug + 0.8, yb + 1.6, zg + 0.2, dach); }
  } else {
    const L = D - 0.35 - (zR - 0.25), g = dachProfil(L, bw + 0.12, Gr, 0.12, 'z'); g.translate(a + c, H, (D - 0.35 + zR - 0.25) / 2); S.add(g, dach);
    // Rückgiebel (nur wenn sichtbar detailliert)
    const FR = R(b, zR, -1, 0, bw);
    if (sieht(p, FR)) {
      const ro = [];
      for (let k = 0; k < n; k++) for (const u of achsen(0, bw, 2.4, 0.5)) ro.push(fenster(u, eg + k * gh + 0.7, 1.0, 1.7));
      for (const u of achsen(0, bw, 2.4, 0.5)) ro.push(fenster(u, 1.1, 1.0, 1.9));
      ro.push(fenster(c, H + 0.6, 0.9, 1.4));
      lochwand(S, FR, [[0, 0], [bw, 0], [bw, H], [c, H + Gr + 0.1], [0, H]], ro, dunkler(wand, 0.02), { rahmen: WEISS });
    }
  }
  // Schornsteine
  const sch = putz ? dunkler(wand, 0.25) : dunkler(wand, 0.08);
  if (!traufe) { const zs = D - T * zw(r, 0.45, 0.7); S.quader(a + c + 0.6, H + Gr * 0.4, zs, a + c + 1.4, H + Gr + 0.9, zs + 0.8, sch); S.quader(a + c + 0.5, H + Gr + 0.9, zs - 0.1, a + c + 1.5, H + Gr + 1.1, zs + 0.9, '#4a4440'); }
  else { const dh = T * 0.42; S.quader(a + bw * 0.25, H + dh * 0.5, zR + T / 2 - 1.2, a + bw * 0.25 + 0.8, H + dh + 1.0, zR + T / 2 - 0.4, sch); }
  // Beischlag (Steinpodest mit Wangen) vor der Dielentür
  if (!putz && !o.laden && ut !== tAx) { const u = ax[tAx]; fb(S, FF, u - 1.6, u + 1.6, 0, 0.55, 0, 1.6, GRANIT); fb(S, FF, u - 1.7, u - 1.4, 0, 1.2, 0, 1.6, GRANIT_D); fb(S, FF, u + 1.4, u + 1.7, 0, 1.2, 0, 1.6, GRANIT_D); }
  else if (putz && ut !== tAx) { const u = ax[tAx]; fb(S, FF, u - 1.1, u + 1.1, 0, 0.35, 0, 0.9, GRANIT); fb(S, FF, u - 1.2, u + 1.2, 3.55, 3.75, 0, 0.6, orn); }
  // ---- Stirnseiten am Zeilenende ----
  for (const [F, an] of [[R(a, zR, 0, 1, T), links], [R(b, D, 0, -1, T), rechts]]) {
    if (!an) continue;
    const so = [];
    const hS = traufe ? [[0, 0], [T, 0], [T, H], [T / 2, H + T * 0.42 - 0.2], [0, H]] : [0, 0, T, H];
    for (let k = 0; k < n; k++) for (const u of achsen(1.0, T - 1.0, 3.2, 0.3)) if ((hash(k, Math.round(u * 10), o.salz) % 3) !== 0) so.push(fenster(u, eg + k * gh + 0.7, 1.0, 1.7, art));
    if (traufe) so.push(fenster(T / 2, H + 0.6, 0.9, 1.5));
    lochwand(S, F, hS, so, dunkler(wand, 0.03), { rahmen: WEISS, bank: putz ? orn : null });
    if (!putz) platten(S, F, [[0, 0, T, 0.55]], 0, 0.05, o.band);
  }
  return traufe ? H + T * 0.42 : H + G + (typ === 'fialen' ? 2.3 : 0);
}
function fpolyR(S, F, pk, t0, t1, c) { formen(S, F, [umrissForm(pk)], t0, t1, c); }

function giebelZeileRoh(S, scene, p) {
  const r = rng(`ngh:${p.seed}`);
  const v = GIEBEL_POOL[p.variante] ? p.variante : waehle(r, Object.keys(GIEBEL_POOL));
  const W = p.w, D = p.d;
  const teile = [];
  let rest = W;
  while (rest > 13) { const b = Math.min(rest - 6.5, Math.round(zw(r, 6.4, 10.6) * 2) / 2); teile.push(b); rest -= b; }
  if (rest > 11) teile.push(rest / 2, rest / 2); else teile.push(rest);
  const T = Math.min(D, zw(r, 12.5, 15));
  let x = 0, H = 0, vorher = null;
  const pool = GIEBEL_POOL[v];
  const salz = Math.floor(r() * 1000);
  teile.forEach((b, i) => {
    let typ = waehle(r, pool);
    if (typ === vorher) typ = waehle(r, pool);
    if (b < 6.5 && typ === 'trauf') typ = 'treppe';
    vorher = typ;
    const putz = v === 'pastell' ? typ !== 'treppe' || r() < 0.4 : typ === 'volute' || (typ === 'trauf' && r() < 0.6) || (typ === 'dreieck' && r() < 0.8);
    const stein = v === 'lueneburg' ? waehle(r, NF.hell) : v === 'stralsund' ? waehle(r, [...NF.backstein, ...NF.dunkel]) : waehle(r, NF.backstein);
    const wand = putz ? waehle(r, NF.pastell) : stein;
    const n = v === 'lueneburg' ? 2 + Math.floor(r() * 2) : 2 + Math.floor(r() * 3);
    const laden = r() < (p.laden ?? (v === 'pastell' ? 0.45 : 0.35));
    const nischenFarbe = v === 'stralsund' || (v === 'luebeck' && r() < 0.35) ? '#eee8db' : dunkler(stein, 0.12);
    H = Math.max(H, giebelHaus(S, scene, p, r, {
      a: x, b: x + b, T: T + (r() < 0.3 ? -1 : 0), D, typ, wand, orn: WEISS, putz,
      dach: putz && r() < 0.35 ? waehle(r, NF.schiefer) : v === 'luebeck' && r() < 0.35 ? waehle(r, NF.dunkelziegel) : waehle(r, NF.ziegel),
      n, eg: 4.2, gh: 3.0, erster: i === 0, letzter: i === teile.length - 1, laden, ladenName: LADEN_NORD[(salz + i * 7) % LADEN_NORD.length],
      tuer: waehle(r, NF.tuer), band: v === 'lueneburg' ? dunkler(stein, 0.1) : '#4a2c25', deck: v === 'lueneburg' ? '#efe9dc' : r() < 0.5 ? '#e9e3d6' : dunkler(stein, 0.05),
      nischenFarbe, nischenArt: v === 'lueneburg' ? 'rund' : r() < 0.7 ? 'spitz' : 'rund', bogen: v === 'lueneburg' || r() < 0.3 ? 'segment' : null,
      utlucht: (v === 'lueneburg' ? r() < 0.6 : r() < 0.2) && !laden ? Math.floor(r() * 2) * 9 : null, utluchtHoch: r() < 0.5, salz: salz + i,
    }));
    x += b;
  });
  // Hof hinter der Zeile
  if (D - T > 2) {
    boden(S, 0, 0, W, D - T, PFLASTER, 0.3, 0.05);
    const hr = rng(`ngh-hof:${p.seed}`);
    for (let i = 0; i < Math.min(5, Math.floor(W / 10)); i++) if (D - T > 5) baumN(S, hr, zw(hr, 2, W - 2), zw(hr, 1.8, D - T - 2), 0.8);
  }
  return { hoehe: H };
}
function nordGiebelhaus(S, scene, p) { return gedreht(S, scene, p, giebelZeileRoh, [7, 11]); }

// =====================================================================================
// Gemeinsame Bausteine
// =====================================================================================
/** Umriss einer Front [0, L] × [0, H] mit aufgesetzten Giebeln [{ u0, u1, typ, G, m }] (u0 < u1, nicht überlappend). */
function frontUmriss(L, H, giebel = []) {
  const pk = [[0, 0], [L, 0], [L, H]];
  for (const g of giebel.slice().sort((a, b) => b.u0 - a.u0)) {
    const bw = g.u1 - g.u0;
    const gp = giebelUmriss(g.typ, bw, H, g.G, g.m ?? (bw < 7.2 ? 2 : bw < 9.6 ? 3 : 4));
    for (const [u, v] of gp) pk.push([g.u0 + u, v]);
  }
  pk.push([0, H]);
  return pk.filter((q, i) => i === 0 || Math.hypot(q[0] - pk[i - 1][0], q[1] - pk[i - 1][1]) > 0.01);
}
/** Dachhöhe, die sicher hinter einem Treppengiebel der Höhe G mit m Stufen bleibt. */
const dachUnterGiebel = (G, m) => ((G * (2 * m + 1)) / (2 * m + 2)) * 0.93;
/** Blendnischen in die Spalten eines Treppengiebels (für lochwand). */
function giebelNischen(u0, bw, H, G, m, art, fuell, mitFenster = false) {
  const nc = 2 * m + 1, cw = bw / nc, st = G / (m + 1), oe = [];
  for (let j = 0; j < nc; j++) {
    const top = H + (Math.min(j, nc - 1 - j) + 1) * st - 0.6, rand = Math.min(0.32, cw * 0.2);
    const a = u0 + j * cw + rand, b = u0 + (j + 1) * cw - rand;
    let y = H + 0.6;
    if (b - a < 0.35 || top - y < 1.2) continue;
    if (mitFenster && j === m && top - y > 3.5) { oe.push(fenster((a + b) / 2, y, Math.min(1.0, b - a - 0.1), 1.6)); y += 2.2; }
    if (top - y > 1.0) oe.push({ u0: a, u1: b, v0: y, v1: top, art, typ: 'nische', fuell });
  }
  return oe;
}
/** Abdeckplatten auf den Stufen eines Treppengiebels. */
function giebelDeckel(S, F, u0, bw, H, G, m, c) {
  const nc = 2 * m + 1, cw = bw / nc, st = G / (m + 1), deck = [];
  for (let j = 0; j < nc; j++) { const y = H + (Math.min(j, nc - 1 - j) + 1) * st; deck.push([u0 + j * cw - 0.06, y, u0 + (j + 1) * cw + 0.06, y + 0.16]); }
  platten(S, F, deck, -0.45, 0.16, c);
}
/** Fensterraster als Öffnungsliste. */
function raster(u0, u1, ra, y0, n, gh, b, h, art = null, rand = 0.5, sockel = 0.75, x = {}) {
  const oe = [];
  for (let k = 0; k < n; k++) for (const u of achsen(u0, u1, ra, rand)) oe.push(fenster(u, y0 + k * gh + sockel, b, h, art, x));
  return oe;
}
/** Körper mit Kern und Fassaden: fass(F, seite) wird nur für sichtbare Seiten gerufen. Kern weicht dort 0,4 m zurück. */
function koerper(S, p, x0, z0, x1, z1, y0, y1, kern, fass, tw = 0.4) {
  const sz = seiten(x0, z0, x1, z1), vis = {};
  for (const k of Object.keys(sz)) vis[k] = sieht(p, sz[k]);
  S.quader(x0 + (vis['-x'] ? tw : 0), y0, z0 + (vis['-z'] ? tw : 0), x1 - (vis['+x'] ? tw : 0), y1, z1 - (vis['+z'] ? tw : 0), kern);
  for (const k of Object.keys(sz)) if (vis[k]) fass(sz[k], k);
  return { sz, vis };
}
/** Punkt im Rahmen als Weltpunkt [x, y, z]. */
function P3(F, u, y, t) { const [x, z] = wp(F, u, t); return [x, y, z]; }
function markiseF(S, F, u0, u1, y, farbe, tiefe = 1.5, neig = 0.38) {
  const g = new THREE.BoxGeometry(u1 - u0, 0.1, tiefe); g.rotateX(neig); g.translate((u0 + u1) / 2, y, tiefe / 2); fgeo(S, F, g, farbe);
}
function streifenMarkise(S, F, u0, u1, y, f1, f2 = '#f4f1ea', n = 6, tiefe = 1.5) {
  const b = (u1 - u0) / n;
  for (let i = 0; i < n; i++) markiseF(S, F, u0 + i * b, u0 + (i + 1) * b, y, i % 2 ? f2 : f1, tiefe);
}
function schirm(S, x, z, y0, rad, farbe) { S.box(0.08, 2.3, 0.08, x, y0 + 1.15, z, '#e8e6e0'); const g = new THREE.ConeGeometry(rad, 0.6, 8); g.translate(x, y0 + 2.4, z); S.add(g, farbe); }
function tisch(S, x, z, y0) { zyl(S, 0.45, 0.45, 0.06, x, y0 + 0.72, z, '#e9e6de', 8); S.box(0.08, 0.72, 0.08, x, y0 + 0.36, z, '#3a3f44'); }

// ---------- Boote (Länge entlang u des Rahmens, Bug bei +u) ----------
function rumpf(S, F, L, B, y0, y1, c, spitz = 0.24, heck = 0.85) {
  const s = new THREE.Shape();
  s.moveTo(-L / 2, (-B / 2) * heck); s.lineTo(L / 2 - L * spitz, -B / 2); s.lineTo(L / 2, 0); s.lineTo(L / 2 - L * spitz, B / 2); s.lineTo(-L / 2, (B / 2) * heck); s.lineTo(-L / 2, (-B / 2) * heck);
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(-PI / 2); g.translate(0, y0, 0);
  fgeo(S, F, g, c);
}
/** Boot: 'barkasse' | 'dampfer' | 'kutter' | 'frachter'. x, z = Mitte, ry = Drehung um die Hochachse. */
function boot(S, scene, x, z, typ, ry = 0, farbe = null, y0 = 0.36, name = null) {
  const F = R(x, z, Math.cos(ry), -Math.sin(ry), 0);
  if (typ === 'barkasse') {
    const L = 13, B = 3.6;
    rumpf(S, F, L, B, y0 - 0.3, y0 + 0.25, '#b8352c');
    rumpf(S, F, L + 0.1, B + 0.1, y0 + 0.25, y0 + 1.0, farbe ?? '#2d3338');
    rumpf(S, F, L - 0.6, B - 0.5, y0 + 1.0, y0 + 1.06, '#a07a52');
    fb(S, F, -4.6, 2.4, y0 + 1.0, y0 + 2.1, -1.25, 1.25, '#efe9dc');
    fb(S, F, -4.4, 2.2, y0 + 1.4, y0 + 1.95, -1.3, 1.3, GLAS);
    fb(S, F, -4.9, 2.7, y0 + 2.1, y0 + 2.25, -1.5, 1.5, '#a05a3a');
    fb(S, F, 2.4, 3.6, y0 + 1.0, y0 + 2.6, -0.7, 0.7, '#efe9dc');
    fb(S, F, 2.45, 3.55, y0 + 1.9, y0 + 2.4, -0.75, 0.75, GLAS);
    fb(S, F, -6.2, -5.2, y0 + 1.0, y0 + 2.2, -0.04, 0.04, '#2b2f33');
    fb(S, F, -6.25, -5.25, y0 + 1.6, y0 + 2.2, 0.04, 0.9, waehle(rng(Math.round(x * 7 + z)), ['#d23c32', '#2f6f8f', '#f2f1ec']));
    return;
  }
  if (typ === 'kutter') {
    const L = 15, B = 4.6, c = farbe ?? '#2f6f8f';
    rumpf(S, F, L, B, y0 - 0.3, y0 + 0.3, '#b8352c', 0.3);
    rumpf(S, F, L + 0.1, B + 0.1, y0 + 0.3, y0 + 1.6, c, 0.3);
    rumpf(S, F, L - 0.5, B - 0.5, y0 + 1.6, y0 + 1.66, '#9a8d78', 0.3);
    fb(S, F, -6, -2.6, y0 + 1.6, y0 + 4.0, -1.3, 1.3, '#f2efe6');
    fb(S, F, -5.95, -2.65, y0 + 3.0, y0 + 3.7, -1.35, 1.35, GLAS);
    fb(S, F, -6.2, -2.4, y0 + 4.0, y0 + 4.2, -1.5, 1.5, c);
    stab(S, P3(F, 1.5, y0 + 1.6, 0), P3(F, 1.5, y0 + 9, 0), 0.12, '#e8e6e0');
    stab(S, P3(F, 1.5, y0 + 4, 0), P3(F, 6.5, y0 + 2.4, 0), 0.08, '#e8e6e0');
    stab(S, P3(F, 1.5, y0 + 8.6, 0), P3(F, 7.3, y0 + 1.8, 0), 0.03, '#3a3f44');
    stab(S, P3(F, 1.5, y0 + 8.6, 0), P3(F, -6, y0 + 4.2, 0), 0.03, '#3a3f44');
    fb(S, F, -1.5, 1.0, y0 + 1.66, y0 + 2.3, -1.0, 1.0, '#c9a24a');
    return;
  }
  if (typ === 'dampfer') {
    const L = 30, B = 7, c = farbe ?? '#1f3a5f';
    rumpf(S, F, L, B, y0 - 0.3, y0 + 0.5, c, 0.22, 0.9);
    rumpf(S, F, L + 0.1, B + 0.1, y0 + 0.5, y0 + 2.1, '#f6f4ee', 0.22, 0.9);
    rumpf(S, F, L - 0.6, B - 0.5, y0 + 2.1, y0 + 2.16, '#b08a62', 0.22, 0.9);
    fb(S, F, -13, 7.5, y0 + 2.16, y0 + 4.5, -2.9, 2.9, '#f6f4ee');
    fb(S, F, -12.8, 7.3, y0 + 3.0, y0 + 4.1, -2.95, 2.95, GLAS);
    fb(S, F, -13.4, 8.0, y0 + 4.5, y0 + 4.7, -3.3, 3.3, '#e9e6de');
    fb(S, F, -13.4, 8.0, y0 + 4.7, y0 + 5.6, 3.2, 3.3, '#e9e6de');
    fb(S, F, -13.4, 8.0, y0 + 4.7, y0 + 5.6, -3.3, -3.2, '#e9e6de');
    fb(S, F, -6, 4.5, y0 + 4.7, y0 + 6.6, -2.2, 2.2, '#f6f4ee');
    fb(S, F, -5.8, 4.3, y0 + 5.3, y0 + 6.2, -2.25, 2.25, GLAS);
    fb(S, F, 4.5, 7.0, y0 + 4.7, y0 + 7.4, -1.6, 1.6, '#f6f4ee');
    fb(S, F, 4.55, 7.05, y0 + 6.4, y0 + 7.1, -1.65, 1.65, GLAS);
    fb(S, F, -6.2, 4.7, y0 + 6.6, y0 + 6.8, -2.6, 2.6, '#e9e6de');
    const [fx, fz] = wp(F, -1, 0);
    zyl(S, 0.9, 1.0, 3.2, fx, y0 + 6.8, fz, farbe ?? '#d23c32', 12); zyl(S, 0.92, 0.92, 0.7, fx, y0 + 9.6, fz, '#2b2f33', 12);
    for (let i = 0; i < 4; i++) { const [sx, sz] = wp(F, -10 + i * 4.5, 0); S.box(1.2, 0.5, 1.2, sx, y0 + 7.0 + 0.0 * i, sz, '#f2f1ec'); }
    stab(S, P3(F, 8, y0 + 7.4, 0), P3(F, 8, y0 + 11, 0), 0.08, '#e8e6e0');
    if (name) { const Fs = teil(F, -13, 8, 3.35); ftext(scene, Fs, name, 10.5, y0 + 5.15, 0.02, 0.55, 12, '#1f3a5f'); }
    return;
  }
  // Frachter
  const L = 58, B = 11, c = farbe ?? '#2a3a4a';
  rumpf(S, F, L, B, y0 - 0.3, y0 + 1.2, '#a6342b', 0.16, 0.95);
  rumpf(S, F, L + 0.1, B + 0.1, y0 + 1.2, y0 + 5.2, c, 0.16, 0.95);
  rumpf(S, F, L - 1, B - 0.8, y0 + 5.2, y0 + 5.3, '#7d6a58', 0.16, 0.95);
  fb(S, F, -28, -17, y0 + 5.3, y0 + 13.5, -4.6, 4.6, '#f2efe6');
  fb(S, F, -27.8, -17.2, y0 + 12.2, y0 + 13.2, -4.65, 4.65, GLAS);
  for (let k = 0; k < 2; k++) fb(S, F, -27.8, -17.2, y0 + 7.3 + k * 2.2, y0 + 8.0 + k * 2.2, -4.65, 4.65, GLAS_HELL);
  fb(S, F, -18.5, -17, y0 + 13.5, y0 + 13.7, -5.6, 5.6, '#f2efe6');
  const [fx, fz] = wp(F, -24, 0); S.quader(fx - 1.4, y0 + 13.5, fz - 1.4, fx + 1.4, y0 + 17.5, fz + 1.4, '#d23c32'); S.quader(fx - 1.45, y0 + 16.8, fz - 1.45, fx + 1.45, y0 + 17.6, fz + 1.45, '#2b2f33');
  const kc = ['#c9483e', '#2f6f8f', '#3f7d56', '#d39a2b', '#e9e6de', '#6b4f8f'];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) if (hash(i, j, k + Math.round(x)) % 4) fb(S, F, -13 + i * 6.4, -13 + i * 6.4 + 6.0, y0 + 5.3 + k * 2.6, y0 + 5.3 + (k + 1) * 2.6 - 0.05, -3.9 + j * 2.6, -3.9 + j * 2.6 + 2.5, kc[hash(i, j, k) % kc.length]);
  stab(S, P3(F, 24, y0 + 5.3, 0), P3(F, 24, y0 + 12, 0), 0.2, '#e8e6e0');
}
/** Wippkran (Portalkran) an der Kaikante. Rahmen-Ursprung = Kranmitte an der Kante, t zeigt zum Wasser. */
function wippkran(S, F0, u, yK, farbe, ausleger = 16, winkel = 0.62) {
  const F = teil(F0, u, u, 0);
  for (const uu of [-2.7, 2.7]) for (const tt of [-3.2, 1.2]) fb(S, F, uu - 0.25, uu + 0.25, yK, yK + 6, tt - 0.25, tt + 0.25, farbe);
  for (const tt of [-3.2, 1.2]) fbalken(S, F, -2.7, yK + 1.5, 2.7, yK + 5.5, 0.25, tt - 0.1, tt + 0.1, farbe);
  fb(S, F, -3.1, 3.1, yK + 6, yK + 6.6, -3.6, 1.6, farbe);
  fb(S, F, -1.9, 1.9, yK + 6.6, yK + 10, -3.4, 0.9, farbe);
  fb(S, F, -1.85, 1.85, yK + 8.2, yK + 9.4, 0.9, 0.96, GLAS);
  fb(S, F, 1.9, 1.96, yK + 8.2, yK + 9.4, -2.6, 0.6, GLAS);
  fb(S, F, -2.0, 2.0, yK + 10, yK + 10.3, -3.6, 1.1, dunkler(farbe, 0.12));
  fb(S, F, -1.2, 1.2, yK + 8.6, yK + 10.8, -5.2, -3.4, '#3a3f44');
  const tipY = yK + 8.4 + Math.sin(winkel) * ausleger, tipT = 0.6 + Math.cos(winkel) * ausleger;
  for (const s of [-0.5, 0.5]) balken(S, P3(F, s, yK + 8.4, 0.6), P3(F, s * 0.3, tipY, tipT), 0.28, 0.5, farbe);
  balken(S, P3(F, 0, yK + 10.3, -1.2), P3(F, 0, yK + 15.5, -0.4), 0.3, 0.3, farbe);
  balken(S, P3(F, 0, yK + 15.5, -0.4), P3(F, 0, tipY + 0.3, tipT * 0.6), 0.12, 0.12, '#3a3f44');
  stab(S, P3(F, 0, tipY, tipT), P3(F, 0, yK + 2.5, tipT), 0.04, '#2b2f33', 4);
  fb(S, F, -0.3, 0.3, yK + 2.0, yK + 2.6, tipT - 0.3, tipT + 0.3, '#e2b83b');
  return tipT;
}
/** Abgesenktes Wasserbecken [x0, x1] × [z0, z1] mit Kaimauern an den Slotkanten (Abschluss zu Nachbarn). */
function becken(S, x0, z0, x1, z1, W, D, wellen = 0, r = null) {
  S.quader(x0, YW - 0.6, z0, x1, YW, z1, WASSER);
  const m = 0.5;
  if (x0 < 0.01) S.quader(0, YW - 0.6, z0, m, 0.36, z1, GRANIT);
  if (x1 > W - 0.01) S.quader(W - m, YW - 0.6, z0, W, 0.36, z1, GRANIT);
  if (z1 > D - 0.01) S.quader(x0, YW - 0.6, D - m, x1, 0.36, D, GRANIT);
  if (z0 < 0.01) S.quader(x0, YW - 0.6, 0, x1, 0.36, m, GRANIT);
  for (let i = 0; i < wellen; i++) S.box(zw(r, 1.5, 3.5), 0.03, 0.15, zw(r, x0 + 2, x1 - 2), YW + 0.02, zw(r, z0 + 2, z1 - 1.5), '#7fc4d6');
}
function kaikante(S, F, L, yK, o = {}) {
  fb(S, F, 0, L, yK - 0.05, yK + 0.12, -1.2, 0.15, o.kante ?? '#c9c4b8');
  for (let u = 3; u < L - 1; u += o.poller ?? 7) { const [x, z] = wp(F, u, -0.6); poller(S, x, z, yK + 0.12); }
  for (let u = 6; u < L - 3; u += 21) { fb(S, F, u - 0.25, u + 0.25, YW, yK, 0.1, 0.2, '#6d6f70'); for (let y = YW + 0.4; y < yK; y += 0.4) fb(S, F, u - 0.25, u + 0.25, y, y + 0.06, 0.15, 0.35, '#6d6f70'); }
  if (o.rettung) for (let u = 12; u < L - 3; u += 26) { fb(S, F, u - 0.06, u + 0.06, yK, yK + 1.6, -0.9, -0.8, '#e8e6e0'); fscheibe(S, F, u, yK + 1.2, -0.8, -0.65, 0.42, '#d9482e', 12); }
}

// =====================================================================================
// 2. Kontorhaus der 1920er (Klinkerexpressionismus)
// =====================================================================================
const KONTOR_NAMEN = ['Hanse-Kontor', 'Kontorhaus Elbblick', 'Reederhaus', 'Kaffee-Kontor', 'Seefahrerhaus', 'Nordstern-Haus', 'Kontorhaus Möwe', 'Kompass-Haus'];
const KONTOR_LAEDEN = ['Tabakwaren', 'Schiffsausrüster', 'Kaffee-Import', 'Reisebüro', 'Notariat', 'Feinkost', 'Café Kontor', 'Buchhandlung', 'Uhren', 'Bank', 'Apotheke'];
function pfeilerWand(S, scene, F, o) {
  const L = F.L, nb = Math.max(1, Math.round(L / o.ra)), ra = L / nb, y0 = o.y0, H = y0 + o.n * o.gh, att = o.attika ?? 1.0;
  const oe = [];
  for (let k = 0; k < o.n; k++) for (let i = 0; i < nb; i++) oe.push({ u0: i * ra + 0.36, u1: (i + 1) * ra - 0.36, v0: y0 + k * o.gh + 0.9, v1: y0 + (k + 1) * o.gh - 0.32, typ: 'fenster', sprosse: true });
  lochwand(S, F, [0, y0, L, H + att], oe, o.stein, { rahmen: WEISS });
  const pf = [], ak = [], spitzen = [], raute = [], baender = [];
  for (let i = 0; i <= nb; i++) {
    const u = Math.min(L - 0.24, Math.max(0.24, i * ra)), top = H + att + (o.spitz ? 0.3 : 0.15);
    (o.akzentAlle && i % o.akzentAlle === 0 ? ak : pf).push([u - 0.24, y0, u + 0.24, top]);
    if (o.spitz) spitzen.push([[u - 0.24, top], [u + 0.24, top], [u, top + 1.1]]);
  }
  platten(S, F, pf, 0, 0.34, o.pfeiler);
  if (ak.length) platten(S, F, ak, 0, 0.4, o.akzent);
  if (spitzen.length) platten(S, F, spitzen, 0, 0.34, o.spitzFarbe ?? o.pfeiler);
  for (let k = 0; k < o.n; k++) {
    if (o.baender) baender.push([-0.05, y0 + k * o.gh + 0.05, L + 0.05, y0 + k * o.gh + 0.55]);
    else baender.push([0, y0 + k * o.gh + 0.02, L, y0 + k * o.gh + 0.14]);
    for (let i = 0; i < nb; i++) if ((i + k) % 2 === 0) { const uc = (i + 0.5) * ra, vc = y0 + k * o.gh + (o.baender ? 0.3 : 0.5); raute.push([[uc, vc - 0.24], [uc + 0.34, vc], [uc, vc + 0.24], [uc - 0.34, vc]]); }
  }
  platten(S, F, baender, 0, o.baender ? 0.38 : 0.1, o.baender ? o.akzent : dunkler(o.stein, 0.05));
  platten(S, F, raute, 0, o.baender ? 0.42 : 0.07, o.zier);
  // Staffelkante in Gold bzw. Kupfer
  platten(S, F, [[-0.12, H + att - 0.22, L + 0.12, H + att + 0.12]], -0.4, 0.45, o.kappe);
  return H + att;
}
function kontorEG(S, scene, F, o) {
  const L = F.L, nb = Math.max(1, Math.round(L / 5.6)), ra = L / nb, oe = [];
  const pi = o.portal ? Math.floor(nb / 2) : -1;
  for (let i = 0; i < nb; i++) {
    if (i === pi) oe.push({ u0: i * ra + 1.2, u1: (i + 1) * ra - 1.2, v0: 0.3, v1: o.eg - 0.2, art: 'spitz', typ: 'tuer', fuell: '#3d3328' });
    else oe.push({ u0: i * ra + 0.5, u1: (i + 1) * ra - 0.5, v0: 0.65, v1: o.eg - 1.1, typ: 'laden', fuell: GLAS_HELL });
  }
  lochwand(S, F, [0, 0, L, o.eg], oe, o.stein, { rahmen: '#2f3a40' });
  platten(S, F, [[-0.05, o.eg - 0.3, L + 0.05, o.eg + 0.05]], 0, 0.36, o.gold);
  platten(S, F, [[0, 0, L, 0.65]], 0, 0.06, GRANIT_D);
  if (pi >= 0) {
    // Portal mit gestuftem Gewände aus Zierklinker und Zickzackfries
    const u0 = pi * ra + 1.2, u1 = (pi + 1) * ra - 1.2, um = (u0 + u1) / 2, b = u1 - u0;
    for (let s = 1; s <= 3; s++) {
      const e = s * 0.32, ring = umrissForm([[u0 - e, 0.3], [u1 + e, 0.3], [u1 + e, o.eg - 0.2 - b * 0.866 + e * 0.6], [um, o.eg - 0.2 + e * 1.1], [u0 - e, o.eg - 0.2 - b * 0.866 + e * 0.6]]);
      ring.holes.push((() => { const q = new THREE.Path(); const e2 = e - 0.32; q.moveTo(u0 - e2, 0.3); q.lineTo(u1 + e2, 0.3); q.lineTo(u1 + e2, o.eg - 0.2 - b * 0.866 + e2 * 0.6); q.lineTo(um, o.eg - 0.2 + e2 * 1.1); q.lineTo(u0 - e2, o.eg - 0.2 - b * 0.866 + e2 * 0.6); q.lineTo(u0 - e2, 0.3); return q; })());
      formen(S, F, [ring], 0, 0.12 + s * 0.08, s % 2 ? o.zier : o.gold);
    }
    const zz = []; for (let u = u0 - 1.4; u < u1 + 1.3; u += 0.5) zz.push([[u, o.eg + 0.08], [u + 0.5, o.eg + 0.08], [u + 0.25, o.eg + 0.5]]);
    platten(S, F, zz, 0, 0.3, o.gold);
    fb(S, F, um - 0.05, um + 0.05, 0.3, o.eg - 1.6, -0.3, -0.18, '#c9a24a');
    fb(S, F, u0 - 1.3, u1 + 1.3, 0.3, 0.45, 0, 0.5, GRANIT);
  }
  for (let i = 0; i < nb; i++) if (i !== pi && hash(i, o.salz) % 2 === 0) ftext(scene, F, KONTOR_LAEDEN[hash(i, o.salz, 3) % KONTOR_LAEDEN.length], (i + 0.5) * ra, o.eg - 0.72, 0.05, 0.36, ra - 1.4, '#f4ead2');
  for (let i = 0; i < nb; i++) if (i !== pi && hash(i, o.salz, 9) % 3 === 0) markiseF(S, F, i * ra + 0.5, (i + 1) * ra - 0.5, o.eg - 1.15, waehle(rng(o.salz + i), NF.markise), 0.45, 0.5);
}
const KONTOR_STIL = {
  spitz: { stein: ['#5e2d26', '#58291f', '#64302a'], akzent: '#d8c7a3', akzentAlle: 3, zier: '#c9a24a', kappe: '#c9a24a', spitz: true, baender: false, spitzFarbe: '#c9a24a' },
  block: { stein: ['#8a3d2d', '#93432f', '#7f3829'], akzent: '#e6dcc6', akzentAlle: 0, zier: '#c9a24a', kappe: '#6fa58a', spitz: false, baender: true },
  turm: { stein: ['#a3724a', '#9a6b45', '#ab7b52'], akzent: '#6b3a28', akzentAlle: 2, zier: '#e6dcc6', kappe: '#6fa58a', spitz: true, baender: false, spitzFarbe: '#e6dcc6' },
};
function kontorRoh(S, scene, p) {
  const r = rng(`nkh:${p.seed}`);
  const v = KONTOR_STIL[p.variante] ? p.variante : waehle(r, Object.keys(KONTOR_STIL));
  const W = p.w, D = p.d, st0 = KONTOR_STIL[v];
  const stein = waehle(r, st0.stein), gold = '#c9a24a', kupf = waehle(r, NF.kupfer);
  const o = { ...st0, stein, pfeiler: heller(stein, 0.035), gold, ra: 1.85 };
  const eg = 5.2, gh = 3.4, n = v === 'turm' ? 6 : 6 + Math.floor(r() * 2), st = v === 'turm' ? 1 : 3;
  let poly;
  if (v === 'spitz') { const k = Math.min(W * 0.4, D * 0.38), a = Math.min(D * 0.5, W * 0.32); poly = [[0, D - a], [W, D], [W - k, 0], [0, 0]]; }
  else if (v === 'block') { const f = Math.min(9, W * 0.18, D * 0.25); poly = [[0, D], [W - f, D], [W, D - f], [W, 0], [0, 0]]; }
  else poly = rechteck(0, 0, W, D);
  const hof = v !== 'spitz' && W > 34 && D > 30 ? rechteck(W * 0.3, D * 0.28, W * 0.66, D * 0.6) : null;
  const H0 = eg + n * gh;
  const name = KONTOR_NAMEN[(p.seed * 3) % KONTOR_NAMEN.length];
  let top = 0;
  for (let s = 0; s <= st; s++) {
    const pl = s === 0 ? poly : einruecken(poly, s * 2.4);
    const yb = s === 0 ? 0 : H0 + (s - 1) * gh, yt = s === 0 ? H0 : H0 + s * gh;
    prisma(S, einruecken(pl, 0.4), yb, yt, dunkler(stein, 0.06), s === 0 && hof ? [hof] : []);
    prisma(S, einruecken(pl, 0.4), yt, yt + 0.12, s === st ? '#5f666c' : '#9aa0a3', s === 0 && hof ? [hof] : []);
    kanten(pl).forEach((F, i) => {
      if (!sieht(p, F) || F.L < 1) return;
      if (s === 0) { kontorEG(S, scene, F, { eg, stein, gold, zier: o.akzent, portal: F.L > 20 && i === 0, salz: p.seed * 10 + i }); top = Math.max(top, pfeilerWand(S, scene, F, { ...o, y0: eg, n, gh })); if (i === 0 && F.L > 24) ftext(scene, F, name, F.L / 2, H0 + 0.48, 0.47, 0.62, F.L * 0.5, '#2a1a14'); }
      else top = Math.max(top, pfeilerWand(S, scene, F, { ...o, y0: yb, n: 1, gh, attika: 0.9, akzentAlle: o.akzentAlle ? o.akzentAlle : 0 }));
    });
  }
  const yTop = H0 + st * gh + 0.12;
  if (v === 'spitz') {
    // Schiffsbug: Keil an der spitzen Ecke, über alle Staffeln hochgezogen
    const [tx, tz] = poly[1], e0 = [poly[0][0] - tx, poly[0][1] - tz], e1 = [poly[2][0] - tx, poly[2][1] - tz];
    const n0 = Math.hypot(...e0), n1 = Math.hypot(...e1), lk = 3.2;
    const keil = [[tx, tz], [tx + (e1[0] / n1) * lk, tz + (e1[1] / n1) * lk], [tx + (e0[0] / n0) * lk, tz + (e0[1] / n0) * lk]];
    const yK = yTop + 4.5;
    prisma(S, keil, 0, yK, o.pfeiler);
    prisma(S, einruecken(keil.slice().reverse(), 0).slice().reverse(), yK, yK + 0.3, gold);
    const steven = [[tx, tz], [tx + (e1[0] / n1) * 0.6, tz + (e1[1] / n1) * 0.6], [tx + (e0[0] / n0) * 0.6, tz + (e0[1] / n0) * 0.6]];
    prisma(S, steven, 0.3, yK + 2.2, o.akzent);
    for (let y = eg + gh; y < yK - 1; y += gh) prisma(S, keil, y - 0.15, y + 0.1, gold);
    // Belvedere mit Kupferdach
    const pl = einruecken(poly, st * 2.4 + 3), cx = pl.reduce((a, q) => a + q[0], 0) / pl.length, cz = pl.reduce((a, q) => a + q[1], 0) / pl.length;
    S.quader(cx - 3, yTop, cz - 2.5, cx + 3, yTop + 3.2, cz + 2.5, o.pfeiler);
    for (let i = 0; i < 4; i++) S.box(0.9, 1.8, 0.1, cx - 2.2 + i * 1.45, yTop + 1.8, cz + 2.52, GLAS);
    const g = walmdach(7, 6, 2.6); g.translate(cx, yTop + 3.2, cz); S.add(g, kupf);
    fahne(S, cx, cz, yTop + 5.8, 3, '#d23c32');
    top = Math.max(top, yK + 2.2, yTop + 9);
  } else if (v === 'block') {
    // Laterne aus Glas mit Kupferdach über dem Treppenhaus, Wasserturm-Aufbau
    const pl = einruecken(poly, st * 2.4 + 3), cx = pl.reduce((a, q) => a + q[0], 0) / pl.length, cz = pl.reduce((a, q) => a + q[1], 0) / pl.length;
    zyl(S, 3.4, 3.4, 0.6, cx, yTop, cz, o.akzent, 12);
    zyl(S, 3.0, 3.0, 3.2, cx, yTop + 0.6, cz, GLAS_HELL, 12);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * PI; S.box(0.22, 3.2, 0.22, cx + Math.cos(a) * 3.05, yTop + 2.2, cz + Math.sin(a) * 3.05, o.akzent); }
    const g = new THREE.SphereGeometry(3.4, 14, 6, 0, 2 * PI, 0, PI / 2); g.scale(1, 0.75, 1); g.translate(cx, yTop + 3.8, cz); S.add(g, kupf);
    zyl(S, 0.06, 0.14, 2.2, cx, yTop + 6.3, cz, gold, 6);
    S.quader(cx - 9, yTop, cz - 1.5, cx - 6, yTop + 2.4, cz + 1.5, '#8a9095');
    top = Math.max(top, yTop + 8.5);
  }
  if (v === 'turm') {
    const tw = Math.min(15, W * 0.3, D * 0.45), x0 = W - tw, z0 = D - tw, nt = 6, Ht = H0 + nt * gh;
    const sq = rechteck(x0, z0, W, D);
    prisma(S, einruecken(sq, 0.4), H0, Ht, dunkler(stein, 0.06));
    kanten(sq).forEach((F) => { if (sieht(p, F)) pfeilerWand(S, scene, F, { ...o, y0: H0 + 0.01, n: nt, gh, attika: 1.2 }); });
    const sq2 = einruecken(sq, 2.0), y2 = Ht + 1.2;
    prisma(S, einruecken(sq2, 0.4), y2, y2 + gh, dunkler(stein, 0.06));
    kanten(sq2).forEach((F) => { if (sieht(p, F)) pfeilerWand(S, scene, F, { ...o, y0: y2, n: 1, gh, attika: 0.8, spitz: false }); });
    const cxT = x0 + tw / 2, czT = z0 + tw / 2, y3 = y2 + gh + 0.8, rk = (tw - 4) * 0.5;
    zyl(S, rk * 0.92, rk * 0.92, 1.6, cxT, y3, czT, o.zier, 16);
    const g = new THREE.SphereGeometry(rk * 0.9, 16, 8, 0, 2 * PI, 0, PI / 2); g.scale(1, 1.15, 1); g.translate(cxT, y3 + 1.6, czT); S.add(g, kupf);
    zyl(S, 0.7, 0.8, 2.4, cxT, y3 + 1.6 + rk * 1.0, czT, kupf, 8);
    kegel(S, 0.9, 2.0, cxT, y3 + 4.0 + rk * 1.0, czT, kupf, 8);
    zyl(S, 0.05, 0.12, 3, cxT, y3 + 6 + rk, czT, gold, 6);
    top = Math.max(top, y3 + 9 + rk);
  }
  return { hoehe: top };
}
function nordKontorhaus(S, scene, p) { return gedreht(S, scene, p, kontorRoh, [36, 26]); }

// =====================================================================================
// 3. Speicher am Fleet
// =====================================================================================
function windenErker(S, F, u, y, holz, dachF) {
  fb(S, F, u - 1.05, u + 1.05, y, y + 2.3, 0, 1.4, holz);
  fb(S, F, u - 0.85, u + 0.85, y + 0.5, y + 1.5, 1.4, 1.46, '#2b2f33');
  const g = dachProfil(1.9, 2.5, 1.1, 0.12, 'z'); g.translate(u, y + 2.3, 0.75); fgeo(S, F, g, dachF);
  fb(S, F, u - 0.12, u + 0.12, y - 0.3, y, 0, 1.7, '#3a3f44');
  fb(S, F, u - 0.03, u + 0.03, y - 4.2, y - 0.3, 1.55, 1.6, '#2b2f33');
  fb(S, F, u - 0.25, u + 0.25, y - 4.5, y - 4.2, 1.35, 1.8, '#3a3f44');
}
function speicherRoh(S, scene, p) {
  const r = rng(`nsp:${p.seed}`);
  const v = ['speicherstadt', 'giebel', 'schlicht'].includes(p.variante) ? p.variante : waehle(r, ['speicherstadt', 'giebel', 'schlicht']);
  const um = p.zustand === 'umgenutzt';
  const W = p.w, D = p.d, Wc = Math.min(14, Math.max(8, D * 0.3)), zF = D - Wc, T = Math.min(zF, 22), zB = zF - T;
  const stein = v === 'giebel' ? waehle(r, NF.backstein) : waehle(r, [...NF.backstein, ...NF.dunkel]);
  const kupf = waehle(r, NF.kupfer), holz = um ? '#3f4a52' : waehle(r, ['#2f5243', '#3d4f45', '#5a3a2c']);
  const glas = um ? GLAS_HELL : GLAS, rahm = um ? '#3a3f44' : '#ece6da';
  // Fleet mit Gegenkai
  becken(S, 0, zF, W, D - 1.8, W, D, 0, r);
  S.quader(0, YW - 0.6, D - 1.8, W, 0.3, D, GRANIT);
  boden(S, 0, D - 1.8, W, D, '#c9c3b6', 0.3, 0.05);
  kaikante(S, R(W, D - 1.8, -1, 0, W), W, 0.36, { poller: 9, kante: '#c4bfb3' });
  for (let u = 1; u < W; u += 2.2) S.box(0.06, 1.0, 0.06, u, 0.9, D - 0.3, '#2b2f33');
  S.box(W, 0.06, 0.06, W / 2, 1.4, D - 0.3, '#2b2f33');
  S.quader(0.4, YW - 0.6, zF - 0.5, W - 0.4, 0.4, zF + 0.15, GRANIT);
  if (zB > 0.5) boden(S, 0, 0, W, zB, PFLASTER, 0.3, 0.05);
  const sock = 2.6, gh = 3.0, n = v === 'schlicht' ? 5 : 5 + Math.floor(r() * 2), H = sock + n * gh;
  let top = H;
  const FF = R(0, zF, 1, 0, W), FX = R(W, zF, 0, -1, T), FXm = R(0, zB, 0, 1, T), FR = R(W, zB, -1, 0, W);
  const vis = { f: sieht(p, FF), x: sieht(p, FX), xm: sieht(p, FXm), r: sieht(p, FR) };
  // Ladeachsen
  const nl = Math.max(1, Math.round(W / 17)), luken = Array.from({ length: nl }, (_, i) => ((i + 0.5) * W) / nl);
  const nahLuke = (u) => luken.some((l) => Math.abs(l - u) < 1.6);
  const fensterArt = v === 'schlicht' ? 'segment' : 'rund';
  const fassade = (F, L, lad, giebel = []) => {
    const oe = [];
    for (let k = 0; k < n; k++) for (const u of achsen(0, L, 2.6, 0.7)) if (!lad || !nahLuke(u)) oe.push(fenster(u, sock + k * gh + 0.8, um ? 1.3 : 1.05, 1.6, fensterArt));
    if (lad) for (const u of luken) for (let k = 0; k < n; k++) oe.push({ u0: u - 0.75, u1: u + 0.75, v0: sock + k * gh + 0.3, v1: sock + k * gh + 2.5, typ: um ? 'fenster' : 'tuer', fuell: um ? GLAS_HELL : holz, art: 'segment', sprosse: false });
    for (const u of achsen(0, L, 2.6, 0.7)) if (!lad || !nahLuke(u)) oe.push(fenster(u, 1.0, 0.9, 0.9, null));
    if (lad) for (const u of luken) oe.push({ u0: u - 0.9, u1: u + 0.9, v0: 0.36, v1: sock - 0.2, typ: 'tuer', fuell: holz });
    for (const g of giebel) if (g.typ !== 'dreieck') oe.push(...giebelNischen(g.u0, g.u1 - g.u0, H, g.G, g.m, 'spitz', dunkler(stein, 0.12), true)); else oe.push(fenster((g.u0 + g.u1) / 2, H + 0.6, 0.9, 1.5, 'rund'));
    lochwand(S, F, giebel.length ? frontUmriss(L, H, giebel) : [0, 0, L, H], oe, stein, { rahmen: rahm, glas, tuer: holz });
    platten(S, F, [[0, 0.3, L, sock]], 0, 0.18, GRANIT);
    const bd = [];
    for (let k = 1; k < n; k++) bd.push([0, sock + k * gh + 0.12, L, sock + k * gh + 0.3]);
    platten(S, F, bd, 0, 0.06, dunkler(stein, 0.14));
    platten(S, F, [[-0.05, H - 0.9, L + 0.05, H - 0.45], [-0.15, H - 0.2, L + 0.15, H + 0.12]], 0, 0.2, v === 'speicherstadt' ? '#c98a63' : dunkler(stein, 0.1));
    for (const g of giebel) if (g.typ !== 'dreieck') giebelDeckel(S, F, g.u0, g.u1 - g.u0, H, g.G, g.m, '#d9d3c8');
  };
  // Kern
  S.quader(vis.xm ? 0.4 : 0, 0.3, vis.r ? zB + 0.4 : zB, W - (vis.x ? 0.4 : 0), H, zF - 0.4, dunkler(stein, 0.06));
  if (v === 'giebel') {
    // Reihe giebelständiger Speicher, je eine Ladeachse in der Mitte
    const k = Math.max(2, Math.round(W / 13)), gw = W / k;
    luken.length = 0; for (let i = 0; i < k; i++) luken.push((i + 0.5) * gw);
    const G = gw * zw(r, 0.75, 0.95), typ = r() < 0.5 ? 'treppe' : 'dreieck', m = gw < 9.6 ? 3 : 4;
    const gl = luken.map((u) => ({ u0: u - gw / 2 + 0.02, u1: u + gw / 2 - 0.02, typ, G, m }));
    if (vis.f) fassade(FF, W, true, gl);
    for (const u of luken) {
      const Gr = typ === 'treppe' ? dachUnterGiebel(G, m) : G;
      const g = dachProfil(T - 0.2, gw + 0.1, Gr, 0.12, 'z'); g.translate(u, H, zB + T / 2 - 0.2); S.add(g, waehle(r, [...NF.ziegel, ...NF.dunkelziegel]));
      if (vis.f) windenErker(S, FF, u, H + G * 0.55, holz, waehle(r, NF.ziegel));
    }
    top = H + G + 1;
  } else if (v === 'schlicht') {
    if (vis.f) fassade(FF, W, true);
    S.quader(0.4, H, zB + 0.4, W - 0.4, H + 0.15, zF - 0.4, '#6f7479');
    if (vis.f) { platten(S, FF, [[0, H, W, H + 1.1]], -0.4, 0, stein); fb(S, FF, 0, W, sock + gh - 0.15, sock + gh + 0.05, 0, 2.2, '#5a6168'); for (const u of luken) windenErker(S, FF, u, H - 0.2, holz, '#5a6168'); }
    S.quader(W * 0.3, H, zB + T * 0.4, W * 0.3 + 6, H + 3.5, zB + T * 0.4 + 5, stein);
    S.quader(W * 0.3 - 0.2, H + 3.5, zB + T * 0.4 - 0.2, W * 0.3 + 6.2, H + 3.8, zB + T * 0.4 + 5.2, '#5a6168');
    top = H + 4;
  } else {
    // Speicherstadt: Kupferdach, Zwerchgiebel über den Ladeachsen, Ecktürmchen
    const G = 7.2, m = 2;
    const gl = luken.map((u) => ({ u0: u - 4, u1: u + 4, typ: 'fialen', G, m }));
    if (vis.f) fassade(FF, W, true, gl);
    const dh = T * 0.36, g = dachProfil(W - 0.4, T + 0.6, dh, 0.3, 'x'); g.translate(W / 2, H, zB + T / 2 - 0.1); S.add(g, kupf);
    for (const u of luken) {
      const gz = dachProfil(T / 2, 8.1, dachUnterGiebel(G, m), 0.15, 'z'); gz.translate(u, H, zF - T / 4 - 0.3); S.add(gz, kupf);
      if (vis.f) {
        windenErker(S, FF, u, H + 1.9, holz, kupf);
        const fl = [];
        for (let j = 0; j <= 5; j++) { const uu = u - 4 + Math.min(7.76, Math.max(0.24, j * 1.6)), yl = j > 0 ? H + (Math.min(j - 1, 5 - j) + 1) * (G / 3) : H, yr = j < 5 ? H + (Math.min(j, 4 - j) + 1) * (G / 3) : H; fl.push([uu - 0.22, H - 0.5, uu + 0.22, Math.max(yl, yr) + 1.2]); const gg = new THREE.ConeGeometry(0.34, 0.9, 4); gg.rotateY(PI / 4); gg.translate(uu, Math.max(yl, yr) + 1.65, 0.02); fgeo(S, FF, gg, kupf); }
        platten(S, FF, fl, -0.3, 0.22, stein);
      }
    }
    for (const [cx, ok] of [[0.9, vis.xm || vis.f], [W - 0.9, vis.x || vis.f]]) {
      if (!ok || W < 26) continue;
      zyl(S, 1.7, 1.7, 9, cx, H - 5, zF - 0.9, stein, 8);
      zyl(S, 1.85, 1.85, 0.35, cx, H - 0.2, zF - 0.9, '#c98a63', 8);
      zyl(S, 1.7, 0.4, 1.5, cx, H - 6.5, zF - 0.9, stein, 8);
      kegel(S, 1.95, 6.5, cx, H + 4, zF - 0.9, kupf, 8);
      zyl(S, 0.04, 0.1, 1.6, cx, H + 10.5, zF - 0.9, '#c9a24a', 6);
    }
    top = H + Math.max(dh, G + 2.5);
  }
  // Stirnseiten und Straßenseite
  const dhS = v === 'speicherstadt' ? T * 0.36 : 0;
  for (const [F, an] of [[FX, vis.x], [FXm, vis.xm]]) {
    if (!an) continue;
    if (v === 'speicherstadt') { const m = 3, G = dhS / ((2 * m + 1) / (2 * m + 2) * 0.93) + 0.2; const gl = [{ u0: 0, u1: T, typ: 'treppe', G, m }]; const oe = raster(0.5, T - 0.5, 2.6, sock, n, gh, 1.05, 1.6, 'rund'); oe.push(...giebelNischen(0, T, H, G, m, 'spitz', dunkler(stein, 0.12), true)); lochwand(S, F, frontUmriss(T, H, gl), oe, stein, { rahmen: rahm, glas }); giebelDeckel(S, F, 0, T, H, G, m, '#d9d3c8'); }
    else { const oe = raster(0.5, T - 0.5, 2.8, sock, n, gh, 1.0, 1.55, fensterArt); lochwand(S, F, v === 'schlicht' ? [0, 0, T, H + 1.1] : [0, 0, T, H], oe, stein, { rahmen: rahm, glas }); }
    platten(S, F, [[0, 0.3, T, sock]], 0, 0.18, GRANIT);
    platten(S, F, [[-0.1, H - 0.2, T + 0.1, H + 0.12]], 0, 0.2, dunkler(stein, 0.1));
  }
  if (vis.r) {
    const oe = raster(0.5, W - 0.5, 2.8, sock, n, gh, 1.0, 1.55, fensterArt);
    for (const u of luken) oe.push({ u0: u - 1.2, u1: u + 1.2, v0: 1.4, v1: 4.2, typ: 'tuer', fuell: holz, art: 'segment' });
    lochwand(S, FR, v === 'schlicht' ? [0, 0, W, H + 1.1] : [0, 0, W, H], oe.filter((q) => !(q.v0 < 4.3 && luken.some((l) => Math.abs(l - (q.u0 + q.u1) / 2) < 2))), stein, { rahmen: rahm, glas });
    fb(S, FR, 0, W, 0.3, 1.4, 0, 1.6, GRANIT);
    fb(S, FR, 0, W, 4.6, 4.8, 0, 2.2, '#5a6168');
  }
  // Umnutzung: Balkone, Dachterrassen, Café-Ponton, Schriftzug
  if (um) {
    if (vis.f) for (const u of luken) for (let k = 1; k < n; k++) { fb(S, FF, u - 1.0, u + 1.0, sock + k * gh + 0.15, sock + k * gh + 0.3, 0, 1.1, '#3a3f44'); fb(S, FF, u - 1.0, u + 1.0, sock + k * gh + 0.3, sock + k * gh + 1.3, 1.02, 1.1, '#a9c3cf'); }
    if (v !== 'giebel') for (let i = 0; i < Math.floor(W / 14); i++) { const x = 5 + i * 14; S.quader(x, H + (v === 'schlicht' ? 0.15 : 0), zB + T * 0.2, x + 5, H + 2.8 + (v === 'schlicht' ? 0.15 : dhS * 0.35), zB + T * 0.55, GLAS_HELL); S.quader(x - 0.2, H + 2.8 + (v === 'schlicht' ? 0.15 : dhS * 0.35), zB + T * 0.2 - 0.2, x + 5.2, H + 3.0 + (v === 'schlicht' ? 0.15 : dhS * 0.35), zB + T * 0.55 + 0.2, '#e9e6de'); }
    const px0 = Math.min(W - 4, W * 0.55), px1 = Math.min(W - 1, px0 + 16);
    S.quader(px0, YW - 0.2, zF + 0.2, px1, YW + 0.45, zF + 5.5, '#a07a52');
    for (let x = px0 + 2; x < px1 - 1; x += 3.6) { tisch(S, x, zF + 3.2, YW + 0.45); schirm(S, x, zF + 3.2, YW + 0.45, 1.4, waehle(r, ['#f4f1ea', '#c9483e', '#2f6f8f'])); }
    if (vis.f) ftext(scene, FF, v === 'schlicht' ? 'Speicher-Museum' : waehle(r, ['Lofts am Fleet', 'Speicher-Café', 'Hotel Speicher']), W * 0.5, sock + gh * 0.5 + 0.2, 0.25, 1.1, W * 0.45, '#f4ead2');
  } else if (W > 24) boot(S, scene, W * 0.3, zF + Wc * 0.45, 'barkasse', 0.0, null, YW + 0.06);
  return { hoehe: top, wasser: [0, zF, W, D - 1.8] };
}
function nordSpeicher(S, scene, p) { return gedreht(S, scene, p, speicherRoh, [24, 26]); }

// =====================================================================================
// 4. Wiederaufbau der 50er (Kiel/Hannover-Typ)
// =====================================================================================
const WA_LAEDEN = ['Textilhaus Möller', 'Radio Krüger', 'Konditorei Witt', 'Schuhhaus Brandt', 'Eisdiele Venezia', 'Lichtspiele', 'Lederwaren', 'Foto Hansen', 'Möbel Petersen', 'Drogerie', 'Optik Claußen', 'Bettenhaus'];
function rasterFassade(S, scene, F, o) {
  const L = F.L, nb = Math.max(1, Math.round(L / o.ra)), ra = L / nb, H = o.y0 + o.n * o.gh, oe = [];
  for (let k = 0; k < o.n; k++) for (let i = 0; i < nb; i++) {
    const u = (i + 0.5) * ra, y = o.y0 + k * o.gh;
    if (o.balkon && i % 3 === 1 && k > 0) oe.push({ u0: u - ra / 2 + 0.35, u1: u + ra / 2 - 0.35, v0: y + 0.25, v1: y + o.gh - 0.4, typ: 'fenster', sprosse: true });
    else oe.push({ u0: u - ra / 2 + 0.45, u1: u + ra / 2 - 0.45, v0: y + 1.0, v1: y + o.gh - 0.4, typ: 'fenster' });
  }
  lochwand(S, F, [0, o.y0, L, H + (o.attika ?? 0.25)], oe, o.klinker, { rahmen: WEISS, bank: o.raster });
  const gl = [];
  for (let i = 0; i <= nb; i++) { const u = Math.min(L - 0.15, Math.max(0.15, i * ra)); gl.push([u - 0.15, o.y0, u + 0.15, H + (o.attika ?? 0.25)]); }
  for (let k = 0; k <= o.n; k++) gl.push([-0.05, o.y0 + k * o.gh - 0.12, L + 0.05, o.y0 + k * o.gh + 0.1]);
  platten(S, F, gl, 0, 0.12, o.raster);
  if (o.balkon) for (let k = 1; k < o.n; k++) for (let i = 1; i < nb; i += 3) { const u = (i + 0.5) * ra, y = o.y0 + k * o.gh; fb(S, F, u - ra / 2 + 0.2, u + ra / 2 - 0.2, y + 0.05, y + 0.22, 0, 1.2, o.raster); fb(S, F, u - ra / 2 + 0.2, u + ra / 2 - 0.2, y + 0.22, y + 1.1, 1.12, 1.2, o.bruest); }
  return H;
}
function ladenEG(S, scene, F, o) {
  const L = F.L, nb = Math.max(1, Math.round(L / 4.2)), ra = L / nb, oe = [];
  for (let i = 0; i < nb; i++) {
    const u0 = i * ra + 0.2, u1 = (i + 1) * ra - 0.2;
    if (i % 4 === 2) { oe.push({ u0: u0 + 0.6, u1: u0 + 1.8, v0: 0.3, v1: 2.6, typ: 'tuer', fuell: '#5f7787' }); oe.push({ u0: u0 + 2.1, u1: u1, v0: 0.6, v1: o.eg - 1.0, typ: 'laden', fuell: GLAS_HELL }); }
    else oe.push({ u0, u1, v0: 0.6, v1: o.eg - 1.0, typ: 'laden', fuell: GLAS_HELL });
  }
  lochwand(S, F, [0, 0, L, o.eg], oe, o.wand, { rahmen: '#2f3a40', tw: 0.4 });
  for (let i = 0; i <= nb; i++) fb(S, F, i * ra - 0.15, i * ra + 0.15, 0.3, o.eg, 0, 0.14, o.raster);
  platten(S, F, [[0, 0, L, 0.6]], 0, 0.05, '#7d8287');
  // Vordach mit Schriftblende
  fb(S, F, -0.2, L + 0.2, o.eg - 0.55, o.eg - 0.35, 0, 1.8, WEISS);
  fb(S, F, -0.2, L + 0.2, o.eg - 0.7, o.eg - 0.3, 1.7, 1.85, o.akzent);
  for (let i = 0; i < nb; i += 2) ftext(scene, teil(F, 0, L, 1.86), WA_LAEDEN[(o.salz + i) % WA_LAEDEN.length], (i + (i + 2 <= nb ? 1 : 0.5)) * ra, o.eg - 0.02, 0.0, 0.5, Math.min(2, nb - i) * ra - 0.8, o.schrift);
}
function wiederaufbauRoh(S, scene, p) {
  const r = rng(`nwa:${p.seed}`);
  const v = ['kiel', 'hannover', 'laubengang', 'geschaeft'].includes(p.variante) ? p.variante : waehle(r, ['kiel', 'hannover', 'laubengang', 'geschaeft']);
  const W = p.w, D = v === 'laubengang' ? p.d - 1.8 : p.d, T = Math.min(D, v === 'geschaeft' ? 18 : 13), z0 = D - T;
  const klinker = v === 'hannover' ? waehle(r, NF.gelbklinker) : waehle(r, NF.rotklinker);
  const rast = v === 'hannover' ? '#f1ede4' : '#e7e2d6', akzent = waehle(r, ['#2f6f8f', '#c9483e', '#3f7d56', '#1f3a5f', '#d39a2b']);
  const laden = v !== 'laubengang';
  const eg = laden ? 4.6 : 0.6, gh = 2.95, n = v === 'geschaeft' ? 2 : v === 'kiel' ? 4 + Math.floor(r() * 2) : v === 'hannover' ? 5 : 4;
  const H = eg + n * gh;
  let top = H;
  const o = { y0: eg, n, gh, ra: v === 'geschaeft' ? 4.2 : 3.1, klinker, raster: rast, bruest: v === 'hannover' ? '#d9cfb6' : akzent, balkon: v === 'hannover' };
  koerper(S, p, 0, z0, W, D, 0, H, dunkler(klinker, 0.08), (F, s) => {
    const front = s === '+z';
    if (laden && (front || r() < 0.0)) ladenEG(S, scene, F, { eg, wand: rast, raster: rast, akzent, schrift: v === 'geschaeft' ? '#c9483e' : '#1f3a5f', salz: p.seed * 3 });
    else if (laden) lochwand(S, F, [0, 0, F.L, eg], achsen(0, F.L, 3.1, 0.6).map((u) => fenster(u, 1.2, 1.8, 2.2)), klinker, { rahmen: WEISS });
    if (v === 'laubengang' && (front || s === '-z')) {
      const oe = [];
      for (let k = 0; k < n; k++) for (const [j, u] of achsen(0, F.L, 3.6, 0.5).entries()) { const y = eg + k * gh; oe.push(j % 2 ? fenster(u, y + 1.0, 1.6, 1.4) : { u0: u - 0.5, u1: u + 0.5, v0: y + 0.05, v1: y + 2.2, typ: 'tuer', fuell: waehle(rng(k * 31 + j), ['#c9483e', '#2f6f8f', '#e2b83b', '#3f7d56']) }); }
      lochwand(S, F, [0, 0, F.L, H + 0.3], oe, klinker, { rahmen: WEISS });
      for (let k = 1; k <= n; k++) {
        const y = eg + (k - 1) * gh;
        fb(S, F, -0.3, F.L + 0.3, y - 0.2, y + 0.02, 0, 1.7, rast);
        const FL = teil(F, -0.3, F.L + 0.3, 1.62), st = [];
        for (let u = 0.1; u < FL.L; u += 0.16) st.push([u - 0.025, y + 0.02, u + 0.025, y + 1.0]);
        platten(S, FL, st, -0.04, 0.04, '#3a3f44');
        fb(S, F, -0.3, F.L + 0.3, y + 1.0, y + 1.08, 1.5, 1.72, '#3a3f44');
        for (let i = 0; i < Math.floor(F.L / 3.6); i++) if (i % 3 === 1) fb(S, F, i * 3.6 + 0.3, i * 3.6 + 3.3, y + 0.3, y + 0.95, 1.6, 1.66, waehle(rng(k * 7 + i), ['#f2d27a', '#a9c3cf', '#e8a490']));
      }
      fb(S, F, -0.3, F.L + 0.3, H - 0.2, H + 0.05, 0, 1.7, rast);
      for (let u = 0; u <= F.L; u += 3.6 * 3) fb(S, F, u - 0.12, u + 0.12, 0.3, H, 1.5, 1.74, rast);
    } else rasterFassade(S, scene, F, { ...o, attika: v === 'kiel' ? 0.25 : 0.6 });
    if (front && v === 'geschaeft') ftext(scene, F, WA_LAEDEN[(p.seed * 5) % WA_LAEDEN.length], F.L / 2, H + 1.6, 0.4, 1.4, F.L * 0.7, '#c9483e');
  });
  // Dach
  if (v === 'kiel' || (v === 'laubengang' && r() < 0.5)) { walm(S, -0.4, z0 - 0.4, W + 0.4, D + 0.4, H + 0.25, Math.min(3.2, T * 0.22), waehle(r, NF.ziegel), { achse: 'x', kv: T * 0.5 + 0.4, kh: T * 0.5 + 0.4 }); S.quader(-0.4, H + 0.05, z0 - 0.4, W + 0.4, H + 0.25, D + 0.4, WEISS); top = H + 3.4; }
  else {
    S.quader(0.4, H, z0 + 0.4, W - 0.4, H + 0.3, D - 0.4, '#8a9095');
    if (v === 'hannover') { S.quader(1.8, H + 0.3, z0 + 2.2, W - 1.8, H + 3.0, D - 2.2, GLAS_HELL); S.quader(1.2, H + 3.0, z0 + 1.4, W - 1.2, H + 3.25, D - 1.0, WEISS); S.quader(1.5, H + 3.25, z0 + 1.7, W - 1.5, H + 3.3, D - 1.3, '#8a9095'); for (let x = 2; x < W - 1.5; x += 3.1) S.box(0.2, 2.7, 0.2, x, H + 1.65, D - 2.0, WEISS); top = H + 3.3; }
    if (v === 'geschaeft') { S.quader(-0.3, H + 0.3, z0 - 0.3, W + 0.3, H + 0.55, D + 0.3, WEISS); S.quader(0.2, H + 0.55, z0 + 0.2, W - 0.2, H + 0.6, D - 0.2, '#8a9095'); S.quader(W * 0.4, H + 0.6, z0 + T * 0.3, W * 0.4 + 4, H + 2.4, z0 + T * 0.3 + 3, '#c9cdd0'); for (let x = W * 0.25; x < W * 0.8; x += W * 0.25) S.box(0.15, 2.4, 0.15, x, H + 1.7, D - 1.2, '#3a3f44'); top = H + 3; }
    if (v === 'laubengang') { S.quader(-0.3, H + 0.3, z0 - 0.5, W + 0.3, H + 0.5, D + 1.9, WEISS); S.quader(0.1, H + 0.5, z0 - 0.1, W - 0.1, H + 0.55, D + 1.5, '#8a9095'); for (let x = 5; x < W - 4; x += 9) S.quader(x, H + 0.55, z0 + 3, x + 1.2, H + 1.6, z0 + 4.2, '#c9cdd0'); top = H + 0.5; }
  }
  if (v === 'laubengang') { const sx = W - 3.5; S.quader(sx, 0, D - 0.2, sx + 3.0, H + 1.6, D + 1.7 - 0.01, rast); S.quader(sx + 0.3, 0.6, D + 1.7 - 0.02, sx + 2.7, H + 1.2, D + 1.71, GLAS_HELL); }
  if (z0 > 2) { boden(S, 0, 0, W, z0, RASEN, 0.3, 0.05); for (let i = 0; i < Math.floor(W / 12); i++) baumN(S, r, 4 + i * 12 + zw(r, -1, 1), Math.max(2, z0 * 0.45), 0.9); }
  return { hoehe: top };
}
function nordWiederaufbau(S, scene, p) { return gedreht(S, scene, p, wiederaufbauRoh, [16, 11]); }

// =====================================================================================
// 5. Rotklinker-Reihen- und Mietshäuser (Schumacher-Typ, Bremer Haus, Siedlung)
// =====================================================================================
function hecke(S, x0, z0, x1, z1, c = '#5d9450') { S.quader(x0, 0.3, z0, x1, 1.25, z1, c); }
function zaun(S, F, u0, u1, t, c = '#f2efe6', h = 1.0) {
  fb(S, F, u0, u1, 0.3 + h - 0.12, 0.3 + h, t - 0.05, t + 0.05, c);
  fb(S, F, u0, u1, 0.3 + h * 0.35, 0.3 + h * 0.35 + 0.1, t - 0.05, t + 0.05, c);
  const st = [];
  for (let u = u0 + 0.1; u < u1; u += 0.22) st.push([u - 0.04, 0.3, u + 0.04, 0.3 + h + 0.08]);
  platten(S, teil(F, 0, F.L, t), st, -0.03, 0.03, c);
}
function schumacherRoh(S, scene, p, r) {
  const W = p.w, D = p.d, T = Math.min(D - 1, 12.5), vor = Math.min(3, D - T), zv = D - vor, z0 = zv - T;
  const stein = waehle(r, NF.rotklinker), band = dunkler(stein, 0.06), n = 3 + Math.floor(r() * 2), sock = 1.1, gh = 2.9, H = sock + n * gh;
  const flach = r() < 0.5;
  const ne = Math.max(1, Math.round(W / 16)), eing = Array.from({ length: ne }, (_, i) => ((i + 0.5) * W) / ne);
  const fass = (F, s) => {
    const L = F.L, front = s === '+z' || s === '-z', oe = [], logg = [];
    const ax = achsen(0, L, 2.7, 0.6);
    const amEing = (u) => front && s === '+z' && eing.some((e) => Math.abs(e - u) < 1.6);
    ax.forEach((u, i) => {
      if (amEing(u)) return;
      for (let k = 0; k < n; k++) {
        const y = sock + k * gh;
        if (front && i % 5 === 2 && k < n - (flach ? 0 : 0)) { oe.push({ u0: u - 1.1, u1: u + 1.1, v0: y + 0.25, v1: y + 2.35, typ: 'nische', fuell: dunkler(stein, 0.16), tief: 1.1 }); logg.push([u, y]); }
        else oe.push(fenster(u, y + 0.75, 1.15, 1.5));
      }
      oe.push(fenster(u, 0.45, 0.8, 0.45, null, { sprosse: false }));
    });
    if (front && s === '+z') for (const e of eing) {
      oe.push({ u0: e - 0.75, u1: e + 0.75, v0: 0.3, v1: 3.0, art: 'rund', typ: 'tuer', fuell: waehle(r, NF.tuer) });
      for (let k = 0; k < n; k++) oe.push(fenster(e, sock + k * gh + 2.0, 0.6, 1.6, null, { sprosse: false }));
    }
    lochwand(S, F, flach ? [0, 0, L, H + 0.9] : [0, 0, L, H], oe, stein, { rahmen: WEISS, bank: band });
    const bd = [[0, 0, L, 0.35]];
    for (let k = 1; k <= n; k++) bd.push([0, sock + k * gh - 0.18, L, sock + k * gh - 0.04]);
    platten(S, F, bd, 0, 0.1, band);
    for (const [u, y] of logg) { fb(S, F, u - 1.1, u + 1.1, y + 0.2, y + 0.32, -1.1, 0.12, WEISS); fb(S, F, u - 1.1, u + 1.1, y + 1.0, y + 1.1, -0.05, 0.08, '#3a3f44'); }
    if (front && s === '+z') for (const e of eing) { platten(S, F, [[e - 1.05, 0.3, e - 0.75, 3.3], [e + 0.75, 0.3, e + 1.05, 3.3], [e - 1.05, 3.0, e + 1.05, 3.3]], 0, 0.16, '#d9cdb5'); fb(S, F, e - 1.2, e + 1.2, 0.3, 0.45, 0, 1.2, GRANIT); }
    if (flach) platten(S, F, [[-0.1, H + 0.75, L + 0.1, H + 0.95]], -0.4, 0.15, band);
    if (front && s === '+z') for (const e of eing) { platten(S, F, [[e - 1.9, 0.35, e - 1.3, H + (flach ? 1.5 : 0.6)], [e + 1.3, 0.35, e + 1.9, H + (flach ? 1.5 : 0.6)]], 0, 0.32, dunkler(stein, 0.03)); if (flach) fpolyF(S, F, [[e - 1.9, H + 1.5], [e + 1.9, H + 1.5], [e, H + 2.6]], -0.4, 0.3, stein); }
  };
  koerper(S, p, 0, z0, W, zv, 0, H, dunkler(stein, 0.08), fass);
  let top = H + 1;
  if (flach) S.quader(0.4, H, z0 + 0.4, W - 0.4, H + 0.15, zv - 0.4, '#7c8288');
  else {
    const dh = T * 0.42;
    walm(S, -0.4, z0 - 0.4, W + 0.4, zv + 0.4, H, dh, waehle(r, NF.ziegel), { achse: 'x', kv: T / 2 + 0.4, kh: T / 2 + 0.4 });
    for (let x = 4; x < W - 3; x += 5.4) { S.quader(x - 0.7, H + 0.4, zv - 2.6, x + 0.7, H + 2.1, zv - 1.2, '#efe9dc'); S.box(0.9, 0.9, 0.06, x, H + 1.3, zv - 1.18, GLAS); S.quader(x - 0.85, H + 2.1, zv - 2.8, x + 0.85, H + 2.25, zv - 1.0, '#8c3b2b'); }
    for (let x = 8; x < W - 4; x += 16) S.quader(x, H + dh * 0.5, z0 + T / 2 - 0.5, x + 0.9, H + dh + 0.8, z0 + T / 2 + 0.4, band);
    top = H + dh;
  }
  if (vor > 1) { boden(S, 0, zv, W, D, RASEN2, 0.3, 0.05); hecke(S, 0, D - 0.7, W, D - 0.1); for (const e of eing) boden(S, e - 0.8, zv, e + 0.8, D, WEG, 0.3, 0.08); }
  if (z0 > 2) { boden(S, 0, 0, W, z0, RASEN, 0.3, 0.05); for (let i = 0; i < Math.floor(W / 11); i++) baumN(S, r, 5 + i * 11, z0 / 2, 0.9); }
  return { hoehe: top };
}
function bremerRoh(S, scene, p, r) {
  const W = p.w, D = p.d, vor = Math.min(3.6, D * 0.3), zv = D - vor, T = Math.min(zv, 12), z0 = zv - T;
  const teile = []; let rest = W;
  while (rest > 9.5) { const b = Math.min(rest - 5.6, zw(r, 5.8, 7.4)); teile.push(b); rest -= b; }
  teile.push(rest);
  let x = 0, top = 0;
  const salz = Math.floor(r() * 100);
  teile.forEach((b, i) => {
    const wand = waehle(r, [...NF.pastell, '#f3efe6', '#f3efe6']), orn = WEISS, n = 1 + (r() < 0.6 ? 1 : 0);
    const sout = 1.8, eg = 3.5, gh = 3.2, H = sout + eg + (n - 1) * gh + (n > 1 ? 0 : 0), Ha = H + 1.3;
    const FF = R(x, zv, 1, 0, b), ax = [b / 6, b / 2, (5 * b) / 6], tA = i % 2 ? 0 : 2, eA = tA === 0 ? 2 : 0;
    const erst = i === 0, letzt = i === teile.length - 1;
    const sz = seiten(x, z0, x + b, zv), visL = erst && sieht(p, sz['-x']), visR = letzt && sieht(p, sz['+x']), visB = sieht(p, sz['-z']);
    S.quader(x + (visL ? 0.4 : 0), 0, z0 + (visB ? 0.4 : 0), x + b - (visR ? 0.4 : 0), Ha, zv - 0.4, dunkler(wand, 0.1));
    const oe = [];
    ax.forEach((u, j) => {
      if (j !== tA) oe.push(fenster(u, 0.55, 0.9, 0.75, null, { sprosse: false }));
      if (j === tA) oe.push({ u0: u - 0.6, u1: u + 0.6, v0: sout, v1: sout + 3.0, art: 'rund', typ: 'tuer', fuell: waehle(r, NF.tuer) });
      else if (j !== eA) oe.push(fenster(u, sout + 0.7, 1.05, 2.1, 'segment'));
      for (let k = 1; k < n; k++) if (j !== eA) oe.push(fenster(u, sout + eg + (k - 1) * gh + 0.6, 1.0, 1.9, 'segment'));
      oe.push(fenster(u, H + 0.35, 0.8, 0.65, null, { sprosse: false }));
    });
    lochwand(S, FF, [0, 0, b, Ha], oe, wand, { rahmen: WEISS, bank: orn });
    // Zierrat: Sockel, Gesimse, Verdachungen
    const z = [[0, 0, b, sout - 0.1], [-0.05, sout + eg - 0.25, b + 0.05, sout + eg], [-0.25, H, b + 0.25, H + 0.25], [-0.35, Ha - 0.05, b + 0.35, Ha + 0.25]];
    ax.forEach((u, j) => { if (j !== eA && j !== tA) z.push([u - 0.75, sout + 2.95, u + 0.75, sout + 3.15]); });
    platten(S, FF, z.slice(1), 0, 0.2, orn);
    platten(S, FF, [z[0]], 0, 0.08, dunkler(wand, 0.18));
    // Erker über zwei Geschosse
    const ue = ax[eA], hE = n > 1 ? sout + eg + gh - 0.2 : sout + eg - 0.1, FE = teil(FF, ue - 1.05, ue + 1.05, 0.85);
    S.quader(...(() => { const [ax0, az0] = wp(FF, ue - 0.95, 0), [ax1, az1] = wp(FF, ue + 0.95, 0.75); return [Math.min(ax0, ax1), sout - 0.3, Math.min(az0, az1), Math.max(ax0, ax1), hE, Math.max(az0, az1)]; })(), wand);
    const eo = [fenster(1.05, sout + 0.6, 1.3, 2.0)]; if (n > 1) eo.push(fenster(1.05, sout + eg + 0.5, 1.3, 1.8));
    lochwand(S, FE, [0, sout - 0.3, 2.1, hE], eo, wand, { rahmen: WEISS, tw: 0.3 });
    fb(S, FF, ue - 1.2, ue + 1.2, hE, hE + 0.2, 0, 1.05, orn);
    fb(S, FF, ue - 1.15, ue + 1.15, hE + 0.2, hE + 1.0, 0.95, 1.03, '#2b2f33');
    fb(S, FF, ue - 1.1, ue + 1.1, sout - 0.6, sout - 0.3, 0, 0.9, orn);
    // Vortreppe mit Geländer
    const ut = ax[tA];
    for (let s = 0; s < 6; s++) { const y = 0.3 + (s + 1) * 0.25; fb(S, FF, ut - 0.75, ut + 0.75, 0.3, y, 0, 2.5 - s * 0.38, GRANIT); }
    fb(S, FF, ut - 0.85, ut + 0.85, sout - 0.15, sout, 0, 0.9, GRANIT_D);
    for (const s of [-1, 1]) balken(S, P3(FF, ut + s * 0.82, 1.25, 2.4), P3(FF, ut + s * 0.82, sout + 0.95, 0.3), 0.05, 0.06, '#2b2f33');
    // Dach mit kleinem Zwerchgiebel
    const g = dachProfil(b + 0.02, T + 0.4, 3.2, 0.2, 'x'); g.translate(x + b / 2, Ha + 0.2, z0 + T / 2 - 0.2); S.add(g, waehle(r, NF.schiefer));
    if (r() < 0.5) { fpolyF(S, FF, [[ue - 1.2, Ha + 0.25], [ue + 1.2, Ha + 0.25], [ue, Ha + 2.4]], -1.5, 0.1, wand); fb(S, FF, ue - 0.4, ue + 0.4, Ha + 0.6, Ha + 1.5, 0.1, 0.14, GLAS); }
    S.quader(x + b * 0.7, Ha + 1, z0 + T * 0.4, x + b * 0.7 + 0.7, Ha + 4.2, z0 + T * 0.4 + 0.7, dunkler(wand, 0.25));
    if (visL || visR) { const F = visL ? sz['-x'] : sz['+x']; lochwand(S, F, [[0, 0], [T, 0], [T, Ha + 0.2], [T / 2 + 0.2, Ha + 3.2], [T / 2 - 0.2, Ha + 3.2], [0, Ha + 0.2]], raster(1, T - 1, 3.2, sout, n, gh, 1.0, 1.7), dunkler(wand, 0.03), { rahmen: WEISS }); }
    if (visB) lochwand(S, sz['-z'], [0, 0, b, Ha], raster(0, b, b / 2, sout, n, gh, 1.1, 1.8), dunkler(wand, 0.05), { rahmen: WEISS });
    // Vorgarten
    boden(S, x, zv, x + b, D, RASEN2, 0.3, 0.05);
    zaun(S, R(x, D - 0.3, 1, 0, b), 0, b, 0, '#2b2f33', 0.9);
    busch(S, r, x + ax[eA], zv + 1.5, 1.1); busch(S, r, x + (ax[1] ?? b / 2), zv + 2.4, 0.8);
    if (salz % 2 === 0 && i % 3 === 1) baumN(S, r, x + b / 2, zv + 1.8, 0.7);
    top = Math.max(top, Ha + 3.4);
    x += b;
  });
  if (z0 > 1.5) boden(S, 0, 0, W, z0, RASEN, 0.3, 0.05);
  return { hoehe: top };
}
function fpolyF(S, F, pk, t0, t1, c) { formen(S, F, [umrissForm(pk)], t0, t1, c); }
function siedlungRoh(S, scene, p, r) {
  const W = p.w, D = p.d, vor = Math.min(4.5, D * 0.35), zv = D - vor, T = Math.min(zv, 9.5), z0 = zv - T;
  const stein = waehle(r, [...NF.rotklinker, ...NF.backstein]), nh = Math.max(1, Math.round(W / 6.2)), b = W / nh, H = 0.4 + 2 * 2.8, dh = 4.8;
  const dach = waehle(r, NF.ziegel);
  koerper(S, p, 0, z0, W, zv, 0, H, dunkler(stein, 0.08), (F, s) => {
    const oe = [], L = F.L;
    if (s === '+z') for (let i = 0; i < nh; i++) { const u0 = i * b, sp = i % 2, ut = u0 + (sp ? b - 1.3 : 1.3), uf = u0 + (sp ? 2.0 : b - 2.0); oe.push({ u0: ut - 0.55, u1: ut + 0.55, v0: 0.3, v1: 2.5, typ: 'tuer', fuell: waehle(rng(i + p.seed), NF.tuer) }); oe.push(fenster(uf, 0.95, 1.5, 1.3)); oe.push(fenster(ut, 3.6, 0.9, 1.2)); oe.push(fenster(uf, 3.5, 1.3, 1.3)); }
    else if (s === '-z') oe.push(...raster(0, L, 3.1, 0.4, 2, 2.8, 1.2, 1.3));
    else oe.push(fenster(L / 2, 3.5, 0.9, 1.2));
    lochwand(S, F, s[1] === 'x' ? [[0, 0], [L, 0], [L, H], [L / 2, H + dh - 0.3], [0, H]] : [0, 0, L, H], oe, stein, { rahmen: WEISS, bank: dunkler(stein, 0.1) });
    platten(S, F, [[0, 0, L, 0.4], [0, 2.95, L, 3.08]], 0, 0.08, dunkler(stein, 0.1));
    if (s === '+z') for (let i = 0; i < nh; i++) { const ut = i * b + (i % 2 ? b - 1.3 : 1.3); fb(S, F, ut - 0.9, ut + 0.9, 2.65, 2.78, 0, 1.0, WEISS); fb(S, F, ut - 0.7, ut + 0.7, 0.3, 0.5, 0, 0.9, GRANIT); }
  });
  const g = dachProfil(W + 0.4, T + 1.0, dh, 0.15, 'x'); g.translate(W / 2, H, z0 + T / 2); S.add(g, dach);
  const neig = Math.atan2(dh, T / 2 + 0.5);
  for (let i = 0; i < nh; i++) {
    const xc = (i + 0.5) * b, zf = zv - 2.6;
    S.quader(xc - 1.5, H + 2.4, zf - 1.8, xc + 1.5, H + 4.0, zf, '#efe9dc');
    S.box(2.4, 0.8, 0.06, xc, H + 3.4, zf + 0.03, GLAS);
    const gg = new THREE.BoxGeometry(3.4, 0.12, 2.4); gg.rotateX(neig * 0.35); gg.translate(xc, H + 4.1, zf - 0.9); S.add(gg, dach);
    if (i % 2 === 0) S.quader(xc + b / 2 - 0.4, H + dh * 0.6, z0 + T / 2 - 0.3, xc + b / 2 + 0.4, H + dh + 0.7, z0 + T / 2 + 0.5, dunkler(stein, 0.1));
    boden(S, i * b, zv, (i + 1) * b, D, i % 2 ? RASEN : RASEN2, 0.3, 0.05);
    const ut = i * b + (i % 2 ? b - 1.3 : 1.3);
    boden(S, ut - 0.6, zv, ut + 0.6, D, WEG, 0.3, 0.08);
    hecke(S, i * b + 0.2, D - 0.8, ut - 0.8, D - 0.15); hecke(S, ut + 0.8, D - 0.8, (i + 1) * b - 0.2, D - 0.15);
    busch(S, r, i * b + (i % 2 ? 1.5 : b - 1.5), zv + 1.6, 0.9);
  }
  if (z0 > 1.5) { boden(S, 0, 0, W, z0, RASEN, 0.3, 0.05); for (let i = 0; i < nh; i += 2) baumN(S, r, (i + 0.5) * b, z0 * 0.5, 0.7); }
  return { hoehe: H + dh };
}
function reihenhausRoh(S, scene, p) {
  const r = rng(`nrh:${p.seed}`);
  const v = ['schumacher', 'bremer', 'siedlung'].includes(p.variante) ? p.variante : waehle(r, ['schumacher', 'bremer', 'siedlung']);
  return (v === 'bremer' ? bremerRoh : v === 'siedlung' ? siedlungRoh : schumacherRoh)(S, scene, p, r);
}
function nordReihenhaus(S, scene, p) { return gedreht(S, scene, p, reihenhausRoh, [12, 12]); }

// =====================================================================================
// 6. Backsteingotische Kirche
// =====================================================================================
function kirchWand(S, F, L, Hw, o) {
  const nb = Math.max(1, Math.round(L / o.joch)), j = L / nb, oe = [];
  for (let i = 0; i < nb; i++) { const u = (i + 0.5) * j, b = Math.min(o.fb ?? 2.6, j - 2.0); if (b > 0.8 && Hw - o.fo - 2.2 > 2) oe.push({ u0: u - b / 2, u1: u + b / 2, v0: o.fu, v1: Hw - o.fo, art: 'spitz', typ: 'fenster' }); }
  lochwand(S, F, o.umr ?? [0, 0, L, Hw], [...oe, ...(o.extra ?? [])], o.stein, { rahmen: '#d9d3c8', glas: o.glas ?? '#536676' });
  platten(S, F, [[0, 0, L, 1.1]], 0, 0.12, o.sockel);
  if (o.fries !== false) platten(S, F, [[0, Hw - 1.1, L, Hw - 0.5]], 0, 0.08, o.putz);
  if (o.pfeiler !== false) for (let i = 0; i <= nb; i++) {
    const u = Math.min(L - 0.6, Math.max(0.6, i * j));
    fb(S, F, u - 0.6, u + 0.6, 0, Hw * 0.62, 0, 1.4, o.stein);
    fb(S, F, u - 0.55, u + 0.55, Hw * 0.62, Hw - 1.0, 0, 0.8, o.stein);
    fbalken(S, F, u - 0.6, Hw * 0.62 + 0.3, u + 0.6, Hw * 0.62 + 0.3, 0.6, 0.6, 1.45, dunkler(o.stein, 0.06));
  }
}
function turm(S, scene, p, x0, z0, tw, Ht, o) {
  const sz = seiten(x0, z0, x0 + tw, z0 + tw);
  S.quader(x0 + 0.4, 0, z0 + 0.4, x0 + tw - 0.4, Ht, z0 + tw - 0.4, dunkler(o.stein, 0.06));
  const zonen = Math.max(1, Math.floor((Ht - 12) / 7.5)), zh = (Ht - 12) / zonen;
  for (const [s, F] of Object.entries(sz)) {
    if (!sieht(p, F)) continue;
    const oe = [];
    if (s === '+z' && o.portal) oe.push({ u0: tw / 2 - tw * 0.18, u1: tw / 2 + tw * 0.18, v0: 0.3, v1: Math.min(8, Ht * 0.18), art: 'spitz', typ: 'tuer', fuell: '#4a3326' });
    const nn = tw > 9 ? 3 : 2, nw = tw / nn;
    for (let z = 0; z < zonen; z++) {
      const y0 = 10 + z * zh, letzte = z === zonen - 1;
      for (let i = 0; i < nn; i++) {
        const u = (i + 0.5) * nw, b = Math.min(nw - 1.0, 2.4);
        if (letzte) oe.push({ u0: u - b / 2, u1: u + b / 2, v0: y0 + 0.6, v1: y0 + zh - 0.6, art: 'spitz', typ: 'fenster', fuell: '#2e3236' });
        else oe.push({ u0: u - b / 2, u1: u + b / 2, v0: y0 + 0.6, v1: y0 + zh - 0.6, art: 'spitz', typ: 'nische', fuell: o.putz });
      }
    }
    if (zonen === 0 || Ht < 22) oe.push({ u0: tw / 2 - 0.5, u1: tw / 2 + 0.5, v0: Ht - 4.5, v1: Ht - 1.2, art: 'spitz', typ: 'fenster', fuell: '#2e3236' });
    lochwand(S, F, [0, 0, tw, Ht], oe, o.stein, { rahmen: '#d9d3c8', nische: o.putz });
    const bd = [[0, 0, tw, 1.2]];
    for (let z = 0; z <= zonen; z++) bd.push([-0.1, 10 + z * zh - 0.3, tw + 0.1, 10 + z * zh + 0.1]);
    platten(S, F, bd, 0, 0.18, o.sockel);
    platten(S, F, [[-0.15, 0, 0.55, Ht], [tw - 0.55, 0, tw + 0.15, Ht]], 0, 0.3, o.stein);
    if (s === '+z' && o.portal) { const b = tw * 0.18; platten(S, F, [[tw / 2 - b - 0.6, 0.3, tw / 2 - b, Math.min(8, Ht * 0.18) - 1], [tw / 2 + b, 0.3, tw / 2 + b + 0.6, Math.min(8, Ht * 0.18) - 1]], 0, 0.35, o.sockel); }
    if (o.uhr && zonen > 1) fscheibe(S, F, tw / 2, 10 + (zonen - 1) * zh - 1.3, 0, 0.2, Math.min(1.5, tw * 0.13), '#f2efe6', 20);
    if (o.wimperg) { fpolyF(S, F, [[0.2, Ht], [tw - 0.2, Ht], [tw / 2, Ht + o.wimperg]], -0.4, 0.05, o.stein); fb(S, F, tw / 2 - 0.4, tw / 2 + 0.4, Ht + 0.6, Ht + o.wimperg * 0.55, 0.05, 0.1, '#2e3236'); }
  }
  const cx = x0 + tw / 2, cz = z0 + tw / 2;
  if (o.helm === 'ruine') {
    // ausgebrannter Turmstumpf: Mauerkrone mit Ausbrüchen, kein Helm
    const sr = rng(`nki-tr:${p.seed}`);
    for (let k = 0; k < 7; k++) { const a = zw(sr, 0.8, tw - 2.2), b = Math.min(tw - 0.4, a + zw(sr, 1.2, 3)), h = zw(sr, 0.6, 2.6); for (const [u0, u1, w0, w1] of [[a, b, 0.4, 1.3], [a, b, tw - 1.3, tw - 0.4]]) S.quader(x0 + u0, Ht, z0 + w0, x0 + u1, Ht + h, z0 + w1, o.stein); S.quader(x0 + 0.4, Ht, z0 + a, x0 + 1.3, Ht + h * 0.8, z0 + b, o.stein); S.quader(x0 + tw - 1.3, Ht, z0 + a, x0 + tw - 0.4, Ht + h * 0.7, z0 + b, o.stein); }
    return Ht + 2.6;
  }
  if (o.helm === 'nadel') {
    if (o.wimperg) for (const [sx, sz2] of [[0, 0], [1, 0], [0, 1], [1, 1]]) kegel(S, 0.6, 4.5, x0 + 0.5 + sx * (tw - 1), Ht, z0 + 0.5 + sz2 * (tw - 1), o.kupfer, 6);
    kegel(S, tw * 0.5, o.hs, cx, Ht + (o.wimperg ? 0.3 : 0), cz, o.kupfer, 8);
    zyl(S, 0.06, 0.18, 2.4, cx, Ht + o.hs, cz, '#c9a24a', 6);
    S.box(1.2, 0.1, 0.1, cx, Ht + o.hs + 1.8, cz, '#c9a24a');
    return Ht + o.hs + 2.4;
  }
  if (o.helm === 'sattel') { const g = dachProfil(tw + 0.4, tw + 0.4, o.hs, 0.1, 'x'); g.translate(cx, Ht, cz); S.add(g, o.dach); for (const F of [sz['+x'], sz['-x']]) if (sieht(p, F)) fpolyF(S, F, [[0, Ht], [tw, Ht], [tw / 2, Ht + o.hs]], -0.4, 0, o.stein); return Ht + o.hs; }
  const g = walmdach(tw + 0.6, tw + 0.6, o.hs); g.translate(cx, Ht, cz); S.add(g, o.dach);
  zyl(S, 0.05, 0.12, 2, cx, Ht + o.hs - 0.1, cz, '#c9a24a', 6);
  return Ht + o.hs + 2;
}
function kircheRoh(S, scene, p) {
  const r = rng(`nki:${p.seed}`);
  const ruine = p.zustand === 'ruine';   // Kriegsruine als Mahnmal: Mauern ohne Dächer, Turmstumpf, Rasen im Schiff
  const v = ruine ? 'hallen' : ['marien', 'hallen', 'doppelturm', 'dorf'].includes(p.variante) ? p.variante : waehle(r, ['marien', 'hallen', 'doppelturm', 'dorf']);
  const W = p.w, D = p.d, dorf = v === 'dorf', basilika = v === 'marien' || v === 'doppelturm';
  const stein = waehle(r, [...NF.backstein, ...NF.dunkel]), putz = '#ece6da', kupfer = waehle(r, NF.kupfer);
  const dach = v === 'marien' ? kupfer : waehle(r, NF.ziegel), sockel = dorf ? '#9d978c' : GRANIT_D;
  const o = { stein, putz, sockel, joch: dorf ? 5 : 6.5, fu: dorf ? 2.2 : 3.2, fo: dorf ? 1.6 : 2.6, glas: ruine ? '#2c3034' : undefined };
  const cx = W / 2, Wn = dorf ? Math.min(W * 0.55, 11) : W * 0.86, x0 = cx - Wn / 2, x1 = cx + Wn / 2;
  const Wm = basilika ? Wn * 0.42 : Wn, Hn = dorf ? 7.5 : basilika ? 13 : 19, Hm = basilika ? (v === 'marien' ? 30 : 27) : Hn;
  const tw = dorf ? Math.min(7.5, W * 0.42) : v === 'doppelturm' ? Math.min(10.5, Wn * 0.32) : Math.min(13, W * 0.38);
  const zT = D - tw, zC = Wm / 2 + (dorf ? 2 : 3), Lsch = zT + 0.4 - zC;
  // Kirchplatz
  boden(S, 0, 0, W, D, dorf || ruine ? RASEN : PFLASTER, 0.3, 0.05);
  // Langhaus
  const xm0 = cx - Wm / 2, xm1 = cx + Wm / 2, hR = Wm * (dorf ? 0.75 : 0.62);
  if (basilika) {
    for (const [a, b, sx] of [[x0, xm0, -1], [xm1, x1, 1]]) {
      S.quader(a + (sx < 0 ? 0.4 : 0), 0, zC, b - (sx > 0 ? 0.4 : 0), Hn, zT, dunkler(stein, 0.06));
      const F = sx > 0 ? R(x1, zT, 0, -1, zT - zC) : R(x0, zC, 0, 1, zT - zC);
      if (sieht(p, F)) kirchWand(S, F, F.L, Hn, o);
      const yA = Hn + 4.2, hi = sx > 0 ? [xm1, x1 + 0.4] : [x0 - 0.4, xm0];
      huelle(S, [[[hi[0], sx > 0 ? yA : Hn, zC], [hi[1], sx > 0 ? Hn : yA, zC], [hi[1], sx > 0 ? Hn : yA, zT]], [[hi[0], sx > 0 ? yA : Hn, zC], [hi[1], sx > 0 ? Hn : yA, zT], [hi[0], sx > 0 ? yA : Hn, zT]]], [cx, 0, (zC + zT) / 2], dach === kupfer ? dunkler(kupfer, 0.02) : dach);
      // Strebebögen
      if (sieht(p, F)) for (let i = 1; i < Math.round(F.L / o.joch); i++) { const z = sx > 0 ? zT - i * (F.L / Math.round(F.L / o.joch)) : zC + i * (F.L / Math.round(F.L / o.joch)); balken(S, [sx > 0 ? x1 - 0.2 : x0 + 0.2, Hn + 1.5, z], [sx > 0 ? xm1 + 0.2 : xm0 - 0.2, Hm - 4, z], 0.7, 0.8, stein); S.box(1.1, 3.2, 1.1, sx > 0 ? x1 - 0.2 : x0 + 0.2, Hn + 1.4, z, stein); }
    }
  }
  if (!ruine) S.quader(xm0 + 0.4, 0, zC, xm1 - 0.4, Hm, zT, dunkler(stein, 0.06));
  for (const F of [R(xm1, zT, 0, -1, Lsch - 0.4), R(xm0, zC, 0, 1, Lsch - 0.4)]) if (sieht(p, F)) {
    if (basilika) { const y0 = Hn + 4.2; const nb = Math.max(1, Math.round(F.L / o.joch)), j = F.L / nb, oe = []; for (let i = 0; i < nb; i++) oe.push({ u0: (i + 0.5) * j - 1.1, u1: (i + 0.5) * j + 1.1, v0: y0 + 1.5, v1: Hm - 2.2, art: 'spitz', typ: 'fenster' }); lochwand(S, F, [0, y0 - 0.5, F.L, Hm], oe, stein, { rahmen: '#d9d3c8', glas: '#536676' }); platten(S, F, [[0, Hm - 1.1, F.L, Hm - 0.5]], 0, 0.08, putz); }
    else kirchWand(S, F, F.L, Hn, o);
  }
  if (!ruine) { const g = dachProfil(Lsch, Wm + 0.8, hR, 0.2, 'z'); g.translate(cx, Hm, zC + Lsch / 2); S.add(g, dach); }
  // Chor (5/8-Schluss) mit Kegeldach
  const ra = Wm / 2, chor = [];
  for (let k = 0; k <= 4; k++) { const a = (k * PI) / 4; chor.push([cx + ra * Math.cos(a), zC - ra * Math.sin(a)]); }
  if (ruine) {
    // Schiff und Chor als hohle Mauerschale, Mauerkronen unregelmäßig ausgebrochen, Rasen und Bäume im Innern
    const aussen = [[cx - ra + 0.4, zT], [cx + ra - 0.4, zT], ...chor.map(([x, z]) => [x + (cx - x) * 0.04, z + (zC - z) * 0.04])];
    const innen = einruecken(aussen, 1.0);
    prisma(S, aussen, 0, Hm, dunkler(stein, 0.06), [innen]);
    boden(S, cx - ra + 1.5, zC, cx + ra - 1.5, zT - 1, RASEN2, 0.32, 0.05);
    const sr = rng(`nki-ru:${p.seed}`);
    for (const F of kanten(aussen)) for (let u = 0.5; u < F.L - 1; u += zw(sr, 2.5, 5)) { const b = Math.min(F.L - 0.2, u + zw(sr, 1, 3)); if (sr() < 0.45) fb(S, F, u, b, Hm, Hm + zw(sr, 0.5, 2.2), -1.0, 0, stein); }
    for (let k = 0; k < 3; k++) baumN(S, sr, cx + zw(sr, -ra * 0.5, ra * 0.5), zw(sr, zC + 2, zT - 3), 0.9);
    for (let k = 0; k < 6; k++) S.box(zw(sr, 0.8, 1.6), 0.5, zw(sr, 0.6, 1.2), cx + zw(sr, -ra + 2, ra - 2), 0.55, zw(sr, zC, zT - 2), dunkler(stein, 0.1), sr());
  } else prisma(S, [[cx - ra, zC + 0.5], ...chor.slice().reverse().map(([x, z]) => [x, z]), [cx + ra, zC + 0.5]].map(([x, z]) => [x + (cx - x) * 0.04, z + (zC - z) * 0.04]), 0, Hm, dunkler(stein, 0.06));
  const tris = [];
  for (let k = 0; k < 4; k++) {
    const [ax, az] = chor[k], [bx, bz] = chor[k + 1], L = Math.hypot(bx - ax, bz - az);
    const F = R(ax, az, (bx - ax) / L, (bz - az) / L, L);
    if (sieht(p, F)) kirchWand(S, F, L, Hm, { ...o, joch: L + 1, pfeiler: false, fb: Math.min(2.6, L - 1.4), fries: true });
    tris.push([[ax + (ax - cx) * 0.06, Hm, az + (az - zC) * 0.06], [bx + (bx - cx) * 0.06, Hm, bz + (bz - zC) * 0.06], [cx, Hm + hR, zC]]);
    const a = (k * PI) / 4;
    if (k > 0) S.box(1.8, Hm * 0.7, 1.1, cx + (ra + 0.6) * Math.cos(a), Hm * 0.35, zC - (ra + 0.6) * Math.sin(a), stein, a);
  }
  if (!ruine) huelle(S, tris, [cx, Hm - 1, zC], dach);
  // Westfront neben dem Turm (Giebel der Halle)
  const FW = R(x0, zT + 0.4, 1, 0, Wn);
  if (sieht(p, FW) && !basilika) {
    const m = 4, G = hR / (((2 * m + 1) / (2 * m + 2)) * 0.93) + 0.3;
    const oe = giebelNischen(0, Wn, Hn, G, m, 'spitz', putz);
    oe.push({ u0: Wn * 0.12, u1: Wn * 0.12 + 2.2, v0: o.fu, v1: Hn - 2.5, art: 'spitz', typ: 'fenster' }, { u0: Wn * 0.88 - 2.2, u1: Wn * 0.88, v0: o.fu, v1: Hn - 2.5, art: 'spitz', typ: 'fenster' });
    if (dorf) { lochwand(S, FW, [[0, 0], [Wn, 0], [Wn, Hn], [Wn / 2, Hn + hR + 0.3], [0, Hn]], oe.filter((q) => q.typ === 'fenster'), stein, { rahmen: '#d9d3c8', glas: '#536676' }); }
    else { lochwand(S, FW, frontUmriss(Wn, Hn, [{ u0: 0, u1: Wn, typ: 'treppe', G, m }]), oe, stein, { rahmen: '#d9d3c8', glas: '#536676', nische: putz }); giebelDeckel(S, FW, 0, Wn, Hn, G, m, '#d9d3c8'); }
  }
  if (basilika && sieht(p, FW)) {
    for (const [a, b] of [[0, xm0 - x0], [xm1 - x0, Wn]]) { const F = teil(FW, a, b); lochwand(S, F, [[0, 0], [F.L, 0], ...(a === 0 ? [[F.L, Hn + 4.2], [0, Hn]] : [[F.L, Hn], [0, Hn + 4.2]])], [{ u0: F.L / 2 - 1.2, u1: F.L / 2 + 1.2, v0: o.fu, v1: Hn - 2.2, art: 'spitz', typ: 'fenster' }], stein, { rahmen: '#d9d3c8', glas: '#536676' }); }
  }
  // Türme
  let top = Hm + hR;
  if (v === 'doppelturm') {
    for (const xt of [x0 - 0.5, x1 + 0.5 - tw]) top = Math.max(top, turm(S, scene, p, xt, zT, tw, Hm + 16, { ...o, kupfer, dach, helm: 'nadel', hs: 24, wimperg: 3.5, portal: true, uhr: xt > cx }));
    const FM = R(x0 - 0.5 + tw, D - 0.6, 1, 0, x1 + 0.5 - tw - (x0 - 0.5 + tw));
    S.quader(FM.ox, 0, zT + 0.4, FM.ox + FM.L, Hm + 2, D - 1.0, dunkler(stein, 0.06));
    if (sieht(p, FM)) { const L = FM.L; lochwand(S, FM, [[0, 0], [L, 0], [L, Hm + 2], [L / 2, Hm + 2 + L * 0.45], [0, Hm + 2]], [{ u0: L / 2 - 1.8, u1: L / 2 + 1.8, v0: 0.3, v1: 9, art: 'spitz', typ: 'tuer', fuell: '#4a3326' }, { kreis: [L / 2, Hm - 5, Math.min(4, L * 0.3)], typ: 'fenster' }, { u0: L / 2 - 2.0, u1: L / 2 + 2.0, v0: 12, v1: Hm - 10, art: 'spitz', typ: 'fenster' }], stein, { rahmen: '#d9d3c8', glas: '#536676' }); }
  } else {
    const Ht = dorf ? 14 : ruine ? Hm + 12 : v === 'marien' ? Hm + 20 : Hm + 22;
    top = Math.max(top, turm(S, scene, p, cx - tw / 2, zT, tw, Ht, { ...o, kupfer, dach, helm: ruine ? 'ruine' : dorf ? (r() < 0.5 ? 'sattel' : 'walm') : 'nadel', hs: dorf ? 6 : v === 'marien' ? 42 : 34, wimperg: dorf || ruine ? 0 : 4.5, portal: true, uhr: !ruine }));
  }
  // Umgebung
  if (dorf) {
    const FZ = R(0, D - 0.2, 1, 0, W), FX = R(W - 0.2, D, 0, -1, D);
    for (const F of [FZ, FX, R(W, 0.2, -1, 0, W), R(0.2, 0, 0, 1, D)]) fb(S, F, 0, F.L, 0.3, 1.2, -0.5, 0, '#a39d92');
    const sr = rng(`nki-st:${p.seed}`);
    for (let i = 0; i < 18; i++) { const x = zw(sr, 1.2, W - 1.2), z = zw(sr, 1.2, D - 1.2); if (x > x0 - 1 && x < x1 + 1 && z < D - 0.5) continue; S.box(0.7, 0.9, 0.15, x, 0.75, z, waehle(sr, ['#8f8b83', '#a9a59c', '#6f6d68'])); }
    for (let i = 0; i < 4; i++) baumN(S, sr, i % 2 ? W - 2.2 : 2.2, 3 + i * (D - 6) / 3, 1.1);
  } else {
    const sr = rng(`nki-b:${p.seed}`);
    if (x0 > 4) for (let z = 5; z < D - 4; z += 9) { baumN(S, sr, x0 / 2, z, 1.0); baumN(S, sr, W - x0 / 2, z, 1.0); }
  }
  return { hoehe: top };
}
const KIRCHE_MIN = { marien: [38, 72], hallen: [32, 62], doppelturm: [38, 72], dorf: [18, 32] };
function nordKirche(S, scene, p) {
  const v = KIRCHE_MIN[p.variante] ? p.variante : waehle(rng(`nki:${p.seed}`), Object.keys(KIRCHE_MIN));
  return gedreht(S, scene, { ...p, variante: v }, kircheRoh, KIRCHE_MIN[v]);
}

// =====================================================================================
// 7. Backstein-Rathaus mit Schaugiebel und Laube
// =====================================================================================
function rathausRoh(S, scene, p) {
  const r = rng(`nrt:${p.seed}`);
  const v = ['schauwand', 'laube', 'renaissance'].includes(p.variante) ? p.variante : waehle(r, ['schauwand', 'laube', 'renaissance']);
  const W = p.w, D = p.d, T = Math.min(D - 2, 18), z0 = D - T;
  const stein = waehle(r, [...NF.backstein, ...NF.dunkel]), putz = '#ece6da', kupfer = waehle(r, NF.kupfer), dach = waehle(r, [...NF.ziegel, NF.dunkelziegel[0]]);
  const FF = R(0, D, 1, 0, W), FX = R(W, D, 0, -1, T), FXm = R(0, z0, 0, 1, T), FR = R(W, z0, -1, 0, W);
  const vis = { f: sieht(p, FF), x: sieht(p, FX), xm: sieht(p, FXm), r: sieht(p, FR) };
  const eg = 6.2, H = v === 'laube' ? 11 : 12.5, dh = T * 0.55, m = 3, Gend = dh / (((2 * m + 1) / (2 * m + 2)) * 0.93) + 0.3;
  // Laube auch auf der Rückseite, wenn die Front kameraabgewandt liegt (Front -x/-z): sonst sieht man nur Giebel und Langseite
  const rueckLaube = v === 'laube' && !vis.f && vis.r;
  S.quader(vis.xm ? 0.4 : 0, 0, rueckLaube ? z0 + 3.4 : vis.r ? z0 + 0.4 : z0, W - (vis.x ? 0.4 : 0), H, D - (v === 'laube' ? 3.4 : 0.4), dunkler(stein, 0.06));
  const g = dachProfil(W - 0.6, T + 0.6, dh, 0.25, 'x'); g.translate(W / 2, H, z0 + T / 2); S.add(g, dach);
  let top = H + dh;
  const na = Math.max(3, Math.round(W / 4.6)), ja = W / na, glas = '#536676';
  const laube = [], obere = [];
  for (let i = 0; i < na; i++) { const u = (i + 0.5) * ja; laube.push({ u0: u - ja * 0.34, u1: u + ja * 0.34, v0: 0.3, v1: eg - 0.6, art: 'spitz', typ: 'nische', fuell: '#5a4038', tief: 3.0 }); obere.push({ u0: u - 0.85, u1: u + 0.85, v0: eg + 1.0, v1: H - 1.3, art: v === 'renaissance' ? null : 'spitz', typ: 'fenster' }); }
  if (v === 'schauwand' && vis.f) {
    const Hs = H + dh + 1.2, k = Math.max(4, Math.min(8, Math.round(W / 7))), tw = 2.1, us = Array.from({ length: k }, (_, i) => tw / 2 + (i * (W - tw)) / (k - 1));
    const pk = [[0, 0], [W, 0]];
    for (let i = k - 1; i >= 0; i--) {
      pk.push([us[i] + tw / 2, Hs + 4.8], [us[i] - tw / 2, Hs + 4.8]);
      if (i > 0) { const a = us[i - 1] + tw / 2, b = us[i] - tw / 2; pk.push([b, Hs], [(a + b) / 2, Hs + 2.8], [a, Hs]); }
    }
    const oe = [...laube, ...obere];
    for (let i = 0; i < k - 1; i++) {
      const a = us[i] + tw / 2, b = us[i + 1] - tw / 2, c = (a + b) / 2, bb = b - a;
      oe.push({ kreis: [c, Hs - 2.0, Math.min(1.6, bb * 0.3)], typ: 'offen' });
      if (bb > 3.2) { oe.push({ u0: a + 0.5, u1: c - 0.35, v0: H + 0.8, v1: Hs - 4.2, art: 'spitz', typ: 'nische', fuell: putz }); oe.push({ u0: c + 0.35, u1: b - 0.5, v0: H + 0.8, v1: Hs - 4.2, art: 'spitz', typ: 'nische', fuell: putz }); }
    }
    for (const u of us) oe.push({ u0: u - 0.45, u1: u + 0.45, v0: H + 0.8, v1: Hs + 3.6, art: 'spitz', typ: 'nische', fuell: putz });
    lochwand(S, FF, pk, oe, stein, { rahmen: '#d9d3c8', glas, seg: 10 });
    for (const u of us) { kegel(S, 1.15, 4.6, u, Hs + 4.8, D - 0.2, kupfer, 8); zyl(S, 0.04, 0.1, 1.3, u, Hs + 9.4, D - 0.2, '#c9a24a', 6); }
    const wap = ['#d23c32', '#f2efe6', '#c9a24a'];
    for (let i = 0; i < k - 1; i++) { const c = (us[i] + us[i + 1]) / 2; fscheibe(S, FF, c, H + (Hs - H) * 0.42, 0, 0.18, 0.62, wap[i % 3], 12); }
    platten(S, FF, [[0, eg - 0.4, W, eg + 0.05], [0, H - 0.3, W, H + 0.1], [0, 0, W, 0.8]], 0, 0.15, putz);
    top = Math.max(top, Hs + 10.7);
  } else if (vis.f) {
    // Front mit Zwerchgiebeln (Treppe bzw. Volute)
    const ng = Math.max(1, Math.min(3, Math.floor(W / 14))), gb = Math.min(9, W / ng - 3), gl = [];
    for (let i = 0; i < ng; i++) { const u = ((i + 0.5) * W) / ng; gl.push({ u0: u - gb / 2, u1: u + gb / 2, typ: v === 'renaissance' ? 'volute' : 'fialen', G: gb * 0.95, m: 2 }); }
    const oe = [...(v === 'laube' ? laube : []), ...obere];
    if (v === 'renaissance') { for (let i = 0; i < na; i++) { const u = (i + 0.5) * ja; if (i === Math.floor(na / 2)) oe.push({ u0: u - 1.0, u1: u + 1.0, v0: 0.3, v1: 4.2, art: 'rund', typ: 'tuer', fuell: '#4a3326' }); else oe.push(fenster(u, 1.4, 1.5, 3.2)); } }
    for (const q of gl) { const c = (q.u0 + q.u1) / 2; if (q.typ === 'volute') { oe.push(fenster(c, H + 0.8, 1.3, 2.0)); oe.push({ kreis: [c, H + q.G * 0.82, 0.45], typ: 'fenster' }); } else oe.push(...giebelNischen(q.u0, gb, H, q.G, 2, 'spitz', putz, true)); }
    lochwand(S, FF, frontUmriss(W, H, gl), oe, stein, { rahmen: v === 'renaissance' ? WEISS : '#d9d3c8', glas, nische: putz, bank: v === 'renaissance' ? SANDSTEIN : null });
    const bd = [[0, 0, W, 0.8], [0, eg - 0.4, W, eg + 0.05], [0, H - 0.3, W, H + 0.1]];
    if (v === 'renaissance') { for (let y = 1.6; y < H - 0.5; y += 1.6) bd.push([0, y, W, y + 0.35]); for (const q of gl) { const c = (q.u0 + q.u1) / 2; bd.push([c - gb * 0.31 - 0.15, H + q.G * 0.42 - 0.1, c + gb * 0.31 + 0.15, H + q.G * 0.42 + 0.15]); } }
    platten(S, FF, bd, 0, 0.12, v === 'renaissance' ? SANDSTEIN : putz);
    for (const q of gl) {
      const c = (q.u0 + q.u1) / 2, Gr = q.typ === 'volute' ? q.G * 0.66 : dachUnterGiebel(q.G, 2);
      const gz = dachProfil(T * 0.45, gb + 0.2, Gr, 0.1, 'z'); gz.translate(c, H, D - 0.4 - T * 0.225); S.add(gz, dach);
      if (q.typ === 'fialen') { giebelDeckel(S, FF, q.u0, gb, H, q.G, 2, '#d9d3c8'); const nc = 5, cw = gb / nc, st = q.G / 3; for (let j = 0; j <= nc; j++) { const yl = j > 0 ? H + (Math.min(j - 1, nc - j) + 1) * st : H, yr = j < nc ? H + (Math.min(j, nc - 1 - j) + 1) * st : H, uu = q.u0 + Math.min(gb - 0.25, Math.max(0.25, j * cw)); fb(S, FF, uu - 0.24, uu + 0.24, H - 0.4, Math.max(yl, yr) + 1.3, -0.3, 0.22, stein); kegel(S, 0.36, 1.0, ...(() => { const [x, z] = wp(FF, uu, 0); return [x, Math.max(yl, yr) + 1.3, z]; })(), kupfer, 4, PI / 4); } }
      else { for (const s of [-1, 1]) fscheibe(S, FF, c + s * (gb * 0.31 + 0.05), H + q.G * 0.42 + 0.45, 0, 0.22, 0.32, SANDSTEIN, 10); }
      top = Math.max(top, H + q.G + 2.3);
    }
    if (v === 'laube') fb(S, FF, 0, W, eg - 0.4, eg, -3.4, 0, dunkler(stein, 0.1));
    if (v === 'renaissance') {
      // Utlucht in Sandstein und Treppenturm
      const u0 = Math.max(1, ja * 0.6), u1 = u0 + 4.0, FU2 = teil(FF, u0, u1, 1.3);
      fb(S, FF, u0, u1, 0, H - 0.6, 0, 1.0, dunkler(SANDSTEIN, 0.15));
      lochwand(S, FU2, [0, 0, 4.0, H - 0.6], [fenster(2.0, 1.4, 2.6, 3.0), fenster(2.0, eg + 0.6, 2.6, 3.4)], SANDSTEIN, { rahmen: WEISS, tw: 0.3 });
      fb(S, FF, u0 - 0.3, u1 + 0.3, H - 0.6, H - 0.2, 0, 1.6, SANDSTEIN);
      fb(S, FF, u0 - 0.2, u1 + 0.2, H - 0.2, H + 0.7, 1.35, 1.5, SANDSTEIN);
      const [tx, tz] = wp(FF, W - 2.6, -0.6);
      zyl(S, 2.4, 2.4, H + 7, tx, 0, tz, stein, 8);
      for (let y = 2.5; y < H + 6; y += 3.2) S.box(0.7, 1.3, 0.2, tx + 1.75, y, tz + 1.75, GLAS, PI / 4);
      for (let y = 1.6; y < H + 6; y += 1.6) zyl(S, 2.46, 2.46, 0.3, tx, y, tz, SANDSTEIN, 8);
      kegel(S, 2.9, 3.0, tx, H + 7, tz, kupfer, 8); zyl(S, 0.9, 0.9, 1.6, tx, H + 10, tz, kupfer, 8); kegel(S, 1.1, 3.0, tx, H + 11.6, tz, kupfer, 8);
      top = Math.max(top, H + 15);
      fb(S, FF, W / 2 - 2.6, W / 2 + 2.6, 0, 0.6, 0, 2.2, GRANIT);
    }
  }
  if (v === 'laube' && vis.f) S.quader(0.4, 0.3, D - 3.4, W - 0.4, 0.36, D - 0.4, '#bcb5a7');
  // Stirnseiten mit Treppengiebel
  for (const [F, an] of [[FX, vis.x], [FXm, vis.xm]]) {
    if (!an) continue;
    const oe = [...giebelNischen(0, T, H, Gend, m, 'spitz', putz, true)];
    for (const u of achsen(0, T, 3.4, 0.8)) { oe.push({ u0: u - 0.75, u1: u + 0.75, v0: eg + 1.0, v1: H - 1.3, art: 'spitz', typ: 'fenster' }); oe.push({ u0: u - 0.75, u1: u + 0.75, v0: 1.2, v1: eg - 1.0, art: 'spitz', typ: 'fenster' }); }
    lochwand(S, F, frontUmriss(T, H, [{ u0: 0, u1: T, typ: 'treppe', G: Gend, m }]), oe, stein, { rahmen: '#d9d3c8', glas, nische: putz });
    giebelDeckel(S, F, 0, T, H, Gend, m, '#d9d3c8');
    platten(S, F, [[0, 0, T, 0.8], [0, eg - 0.4, T, eg + 0.05]], 0, 0.12, putz);
    top = Math.max(top, H + Gend);
  }
  if (rueckLaube) {
    lochwand(S, FR, [0, 0, W, H], [...laube, ...obere], stein, { rahmen: '#d9d3c8', glas, nische: putz });
    platten(S, FR, [[0, 0, W, 0.8], [0, eg - 0.4, W, eg + 0.05], [0, H - 0.3, W, H + 0.1]], 0, 0.12, putz);
    fb(S, FR, 0, W, eg - 0.4, eg, -3.4, 0, dunkler(stein, 0.1));
    S.quader(0.4, 0.3, z0 + 0.4, W - 0.4, 0.36, z0 + 3.4, '#bcb5a7');
  } else if (vis.r) lochwand(S, FR, [0, 0, W, H], raster(0, W, 3.6, 0, 2, eg, 1.4, 2.6, 'spitz', 0.8, 1.2), dunkler(stein, 0.03), { rahmen: '#d9d3c8', glas });
  // Dachreiter
  const dx = W * 0.5, dz = z0 + T / 2;
  if (v !== 'renaissance' || W > 30) { zyl(S, 1.3, 1.3, 3.4, dx, H + dh - 0.8, dz, '#efe9dc', 8); zyl(S, 1.45, 1.45, 0.3, dx, H + dh + 2.6, dz, kupfer, 8); kegel(S, 1.5, 6, dx, H + dh + 2.9, dz, kupfer, 8); zyl(S, 0.04, 0.1, 1.5, dx, H + dh + 8.9, dz, '#c9a24a', 6); top = Math.max(top, H + dh + 10.4); }
  if (z0 > 1) { boden(S, 0, 0, W, z0, PFLASTER, 0.3, 0.05); baumN(S, r, 3, z0 / 2, 0.8); baumN(S, r, W - 3, z0 / 2, 0.8); }
  return { hoehe: top };
}
function nordRathaus(S, scene, p) { return gedreht(S, scene, p, rathausRoh, [30, 20]); }

// =====================================================================================
// 8. Hafenkante
// =====================================================================================
function bude(S, scene, F, u, y0, farbe, text) {
  fb(S, F, u - 2.2, u + 2.2, y0, y0 + 2.7, -3.0, 0, '#f3efe6');
  fb(S, F, u - 1.8, u + 1.8, y0 + 1.05, y0 + 2.15, 0, 0.05, GLAS_HELL);
  fb(S, F, u - 1.95, u + 1.95, y0 + 0.95, y0 + 1.08, 0, 0.55, '#d8d3c6');
  streifenMarkise(S, F, u - 2.3, u + 2.3, y0 + 2.35, farbe, '#f4f1ea', 6, 1.4);
  fb(S, F, u - 2.4, u + 2.4, y0 + 2.7, y0 + 2.9, -3.2, 0.15, farbe);
  fb(S, F, u - 2.2, u + 2.2, y0 + 2.9, y0 + 3.75, -0.12, 0.06, farbe);
  ftext(scene, F, text, u, y0 + 3.32, 0.08, 0.55, 4.2, '#ffffff');
  for (const s of [-1, 1]) { const [x, z] = wp(F, u + s * 1.4, 2.4); tisch(S, x, z, y0); }
}
function schuppen(S, scene, p, x0, z0, x1, z1, y0, o) {
  const H = o.h ?? 8, wand = o.wand, dh = (z1 - z0) * 0.14;
  koerper(S, p, x0, z0, x1, z1, y0, y0 + H, dunkler(wand, 0.1), (F, s) => {
    const L = F.L, oe = [];
    if (s[1] === 'z') for (const u of achsen(0, L, 7, 1)) { oe.push({ u0: u - 2.2, u1: u + 2.2, v0: y0 + 0.02, v1: y0 + 4.6, typ: 'tuer', fuell: o.tor }); oe.push({ u0: u - 2.2, u1: u + 2.2, v0: y0 + 5.4, v1: y0 + 6.6, typ: 'fenster', sprosse: true }); }
    else oe.push({ u0: L / 2 - 2.4, u1: L / 2 + 2.4, v0: y0 + 0.02, v1: y0 + 5, typ: 'tuer', fuell: o.tor });
    lochwand(S, F, s[1] === 'x' ? [[0, y0], [L, y0], [L, y0 + H], [L / 2, y0 + H + dh - 0.15], [0, y0 + H]] : [0, y0, L, y0 + H], oe, wand, { rahmen: WEISS });
    const rp = []; for (let u = 0.3; u < L; u += 0.6) rp.push([u - 0.05, y0 + 0.2, u + 0.05, y0 + H - 0.1]);
    platten(S, F, rp, 0, 0.06, dunkler(wand, 0.05));
    if (s[1] === 'z') { fb(S, F, -0.3, L + 0.3, y0 + 4.8, y0 + 5.0, 0, 2.0, '#5a6168'); if (o.nr) ftext(scene, F, o.nr, L / 2, y0 + H - 0.7, 0.08, 0.9, L * 0.4, '#f4f1ea'); }
  });
  const g = dachProfil(x1 - x0 + 0.6, z1 - z0 + 0.8, dh, 0.2, 'x'); g.translate((x0 + x1) / 2, y0 + H, (z0 + z1) / 2); S.add(g, o.dach);
  return y0 + H + dh;
}
function leuchtturm(S, x, z, y0, h, rU, rO, f1, f2) {
  const nb = 6;
  for (let i = 0; i < nb; i++) { const a = rU + ((rO - rU) * i) / nb, b = rU + ((rO - rU) * (i + 1)) / nb; zyl(S, b, a, h / nb, x, y0 + (i * h) / nb, z, i % 2 ? f2 : f1, 16); }
  zyl(S, rO + 0.9, rO + 0.9, 0.35, x, y0 + h, z, '#2e3236', 16);
  zyl(S, rO + 0.85, rO + 0.85, 0.9, x, y0 + h + 0.35, z, '#2e3236', 16, true);
  zyl(S, rO * 0.72, rO * 0.72, 2.0, x, y0 + h + 0.35, z, '#f3e6a4', 12);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI; S.box(0.12, 2.0, 0.12, x + Math.cos(a) * rO * 0.74, y0 + h + 1.35, z + Math.sin(a) * rO * 0.74, '#2e3236'); }
  kegel(S, rO * 0.95, 1.7, x, y0 + h + 2.35, z, f1, 12);
  zyl(S, 0.08, 0.14, 1.0, x, y0 + h + 4.0, z, '#2e3236', 6);
  for (let k = 1; k < 4; k++) { const y = y0 + (k * h) / 4 + 0.5, rr = rU + ((rO - rU) * k) / 4; S.box(0.6, 1.0, 0.15, x + rr * 0.72, y, z + rr * 0.72, '#2e3236', -PI / 4); }
  S.box(1.1, 2.2, 0.2, x + rU * 0.71, y0 + 1.1, z + rU * 0.71, '#2f5243', -PI / 4);
  return y0 + h + 5;
}
function hafenRoh(S, scene, p) {
  const r = rng(`nhf:${p.seed}`);
  const v = ['kai', 'anleger', 'leuchtturm', 'fischmarkt'].includes(p.variante) ? p.variante : waehle(r, ['kai', 'anleger', 'leuchtturm', 'fischmarkt']);
  const W = p.w, D = p.d, Wa = v === 'leuchtturm' ? D * 0.62 : D * 0.44, zK = D - Wa, yK = 0.3;
  becken(S, 0, zK, W, D, W, D, Math.floor(W / 6), r);
  let top = 8;
  const FK = R(0, zK, 1, 0, W);
  if (v !== 'leuchtturm') {
    S.quader(0, YW - 0.6, zK - 0.8, W, yK, zK, GRANIT);
    boden(S, 0, 0, W, zK, '#c9c3b6', yK, 0.05);
    kaikante(S, FK, W, yK + 0.05, { rettung: true });
    platten(S, FK, (() => { const q = []; for (let u = 0.5; u < W - 0.5; u += 1.4) q.push([u + 0.05, YW + 0.05, Math.min(W - 0.5, u + 1.35), yK - 0.05]); return q; })(), 0, 0.04, GRANIT_D);
  }
  if (v === 'kai') {
    for (const t of [-1.0, -6.2]) fb(S, FK, 0, W, yK + 0.05, yK + 0.14, t - 0.1, t + 0.1, '#5a6168');
    const zs = Math.max(2, zK - 9 - 16);
    top = Math.max(top, schuppen(S, scene, p, 3, zs, W - 3, zK - 9.5, yK, { wand: waehle(r, ['#c9cfc9', '#b8c4c0', '#a9583f']), tor: waehle(r, ['#2f5243', '#3f4a52', '#7a2e2e']), dach: '#7d848a', nr: `Schuppen ${10 + (p.seed % 70)}` }));
    const nk = Math.max(1, Math.min(3, Math.floor(W / 28))), kf = waehle(r, ['#c8463c', '#e2b83b', '#2f6f8f']);
    for (let i = 0; i < nk; i++) top = Math.max(top, yK + 8.4 + Math.sin(0.62) * Math.min(16, Wa - 2) + 1);
    for (let i = 0; i < nk; i++) wippkran(S, FK, ((i + 0.5) * W) / nk + zw(r, -3, 3), yK + 0.1, kf, Math.min(16, Wa - 2) / Math.cos(0.62) * 0.95, 0.62);
    if (W > 44 && Wa > 11) { const T2 = new Sammler(); boot(T2, scene, 0, 0, 'frachter', 0, waehle(r, ['#2a3a4a', '#3f5a3f', '#5a2f2a']), 0); const sk = Math.min(0.68, (W - 8) / 58); for (const [c, gs] of T2.teile) for (const g of gs) { g.scale(sk, sk, sk); g.translate(W / 2, YW + 0.06, zK + 6.2 * sk + 1.2); S.add(g, c); } }
    else boot(S, scene, W * 0.6, zK + 3.5, 'barkasse', 0.0, null, YW + 0.06);
    for (let i = 0; i < 6; i++) { const x = zw(r, 4, W - 4), z = zK - zw(r, 2.5, 7.5); S.box(2.4, 1.4, 1.6, x, yK + 0.75, z, waehle(r, ['#a07a52', '#8a6a4a', '#b5895c'])); }
  } else if (v === 'anleger') {
    // Pontons mit Brücken und Abfertigungshäuschen
    const zP = zK + 4.5, pL = W - 8;
    const yP = YW + 0.7; S.quader(4, YW - 0.2, zP, 4 + pL, yP - 0.1, zP + 5.5, '#6f6a62'); S.quader(4, yP - 0.1, zP, 4 + pL, yP, zP + 5.5, '#b8a88e');
    for (const xb of [10, W - 12]) { balken(S, [xb, yK + 0.2, zK - 0.5], [xb, yP + 0.1, zP + 0.5], 2.6, 0.3, '#5a6168'); for (const s of [-1.3, 1.3]) balken(S, [xb + s, yK + 1.2, zK - 0.5], [xb + s, yP + 1.1, zP + 0.5], 0.08, 0.08, '#2b2f33'); }
    for (const xh of [W * 0.3, W * 0.7]) { S.quader(xh - 3, yP, zP + 0.8, xh + 3, yP + 3, zP + 4.4, '#efe9dc'); S.quader(xh - 2.8, yP + 0.8, zP + 4.4, xh + 2.8, yP + 2.3, zP + 4.45, GLAS_HELL); const g = walmdach(7, 4.6, 2.2); g.translate(xh, yP + 3, zP + 2.6); S.add(g, waehle(r, NF.kupfer)); zyl(S, 0.05, 0.1, 1.6, xh, yP + 5, zP + 2.6, '#c9a24a', 6); }
    for (let x = 6; x < 4 + pL; x += 2.4) S.box(0.06, 1.0, 0.06, x, yP + 0.5, zP + 5.45, '#2b2f33');
    S.box(pL, 0.06, 0.06, 4 + pL / 2, yP + 1.0, zP + 5.45, '#2b2f33');
    if (Wa > 16) boot(S, scene, W * 0.5, zP + 9.5, 'dampfer', 0, waehle(r, ['#1f3a5f', '#2f6f8f', '#8c3b3b']), YW + 0.06, waehle(r, ['Möwe', 'Seestern', 'Hanseat', 'Elbkind']));
    boot(S, scene, Math.min(W - 8, W * 0.85), zP - 1.8, 'barkasse', PI, null, YW + 0.06);
    bude(S, scene, R(W - 16, zK - 3.5, 1, 0, 8), 4, yK, '#2f6f8f', 'Fischbrötchen');
    for (let i = 0; i < Math.floor(W / 14); i++) { laterne(S, 6 + i * 14, zK - 2, 4.5, yK); bank(S, 9 + i * 14, zK - 3.2, 0, yK); }
    const ax0 = W * 0.12, ax1 = W * 0.88, az1 = zK - 6, az0 = Math.max(1.5, az1 - 9), stn = '#e3d6bb';
    koerper(S, p, ax0, az0, ax1, az1, yK, yK + 7, dunkler(stn, 0.12), (F, s2) => {
      const oe = []; for (const u of achsen(0, F.L, 4.2, 0.6)) oe.push({ u0: u - 1.5, u1: u + 1.5, v0: yK + 0.05, v1: yK + 4.6, art: 'rund', typ: s2 === '+z' ? 'nische' : 'fenster', fuell: '#6b5a4a', tief: 1.8 }, fenster(u, yK + 5.2, 1.6, 1.2, 'rund'));
      lochwand(S, F, [0, yK, F.L, yK + 7.6], oe, stn, { rahmen: WEISS });
      platten(S, F, [[0, yK, F.L, yK + 0.5], [-0.1, yK + 4.9, F.L + 0.1, yK + 5.1], [-0.2, yK + 7.3, F.L + 0.2, yK + 7.7]], 0, 0.16, dunkler(stn, 0.08));
      if (s2 === '+z') ftext(scene, F, 'Landungsbrücken', F.L / 2, yK + 6.4, 0.2, 0.7, F.L * 0.4, '#5a4a3a');
    });
    S.quader(ax0 + 0.4, yK + 7, az0 + 0.4, ax1 - 0.4, yK + 7.15, az1 - 0.4, '#8a9095');
    for (const [tx, kk] of [[ax0 + 3, 0], [ax1 - 3, 1], [(ax0 + ax1) / 2, 2]]) {
      const th = kk === 2 ? 15 : 11;
      S.quader(tx - 2.6, yK, az1 - 5.4, tx + 2.6, yK + th, az1 + 0.2, stn);
      for (const F of seitenListe(p, tx - 2.6, az1 - 5.4, tx + 2.6, az1 + 0.2)) { lochwand(S, F.F, [0, yK + 7.7, 5.2, yK + th], [fenster(2.6, yK + th - 3.4, 1.2, 2.2, 'rund')], stn, { rahmen: WEISS }); if (kk === 2) fscheibe(S, F.F, 2.6, yK + 9.6, 0, 0.15, 1.0, '#f2efe6', 16); }
      const g = new THREE.SphereGeometry(2.7, 12, 6, 0, 2 * PI, 0, PI / 2); g.scale(1, 1.3, 1); g.translate(tx, yK + th, az1 - 2.6); S.add(g, waehle(r, NF.kupfer));
      zyl(S, 0.05, 0.12, 2, tx, yK + th + 3.4, az1 - 2.6, '#c9a24a', 6);
      top = Math.max(top, yK + th + 5.5);
    }
    top = Math.max(top, 12);
  } else if (v === 'leuchtturm') {
    // Mole mit Leuchtturm am Kopf, Kutterhafen dahinter
    S.quader(0, YW - 0.6, zK - 0.8, W, yK, zK, GRANIT); boden(S, 0, 0, W, zK, PFLASTER, yK, 0.05);
    kaikante(S, FK, W * 0.55, yK + 0.05);
    const mx = W * 0.62, mb = 5;
    S.quader(mx, YW - 0.6, zK - 0.1, mx + mb, yK, D - 3, GRANIT); boden(S, mx, zK, mx + mb, D - 3, '#c9c3b6', yK, 0.05);
    for (let z = zK + 2; z < D - 6; z += 3) { S.box(1.2, 0.8, 1.0, mx - 0.5, YW + 0.2, z + zw(r, -0.5, 0.5), waehle(r, ['#8f8b83', '#9d998f'])); S.box(1.1, 0.7, 1.0, mx + mb + 0.5, YW + 0.15, z + zw(r, -0.5, 0.5), waehle(r, ['#8f8b83', '#9d998f'])); }
    zyl(S, 3.4, 3.7, yK - YW + 0.6, mx + mb / 2, YW - 0.6, D - 4, GRANIT, 16); zyl(S, 3.5, 3.5, 0.1, mx + mb / 2, yK, D - 4, '#c9c3b6', 16);
    const rot = r() < 0.5;
    top = Math.max(top, leuchtturm(S, mx + mb / 2, D - 4, yK + 0.1, 15, 2.4, 1.6, rot ? '#d23c32' : '#2f6f8f', '#f4f1ea'));
    for (let i = 0; i < 3; i++) boot(S, scene, 9 + i * 7, zK + 6 + (i % 2) * 2, 'kutter', PI / 2 + zw(r, -0.1, 0.1), waehle(r, ['#2f6f8f', '#3f7d56', '#c9483e', '#e2b83b']), YW + 0.06);
    bude(S, scene, R(4, zK - 3.2, 1, 0, 8), 4, yK, '#c9483e', 'Fischbrötchen');
    for (let x = 14; x < W * 0.55; x += 9) bank(S, x, zK - 2.4, 0, yK);
    const nh = Math.max(2, Math.floor(W * 0.55 / 8.5));
    for (let i = 0; i < nh; i++) {
      const hx = 3 + i * 8.5, hz0 = 2, hz1 = Math.min(zK - 6, hz0 + 7), wf = waehle(r, ['#c9483e', '#2f6f8f', '#e2b83b', '#3f7d56', '#f2efe6']), hw = 5.5;
      koerper(S, p, hx, hz0, hx + hw, hz1, yK, yK + 3, dunkler(wf, 0.1), (F, s2) => { const st = []; for (let u = 0.15; u < F.L; u += 0.3) st.push([u - 0.03, yK + 0.1, u + 0.03, yK + 2.9]); lochwand(S, F, s2[1] === 'z' ? [[0, yK], [F.L, yK], [F.L, yK + 3], [F.L / 2, yK + 5.2], [0, yK + 3]] : [0, yK, F.L, yK + 3], [s2 === '+z' ? { u0: F.L / 2 - 0.6, u1: F.L / 2 + 0.6, v0: yK + 0.05, v1: yK + 2.2, typ: 'tuer', fuell: '#3a3f44' } : fenster(F.L / 2, yK + 1.0, 0.9, 0.9)], wf, { rahmen: WEISS }); platten(S, F, st, 0, 0.04, dunkler(wf, 0.06)); });
      const g = dachProfil(hz1 - hz0 + 0.6, hw + 0.6, 2.2, 0.1, 'z'); g.translate(hx + hw / 2, yK + 3, (hz0 + hz1) / 2); S.add(g, waehle(r, ['#4f5960', '#a9472f', '#6b6f72']));
    }
    for (let x = 4; x < W * 0.5; x += 3.5) { S.box(0.14, 2.6, 0.14, x, yK + 1.3, zK - 5, '#7a5d43'); if (x + 3.5 < W * 0.5) S.box(3.5, 0.04, 0.04, x + 1.75, yK + 2.2, zK - 5, '#3a3f44'); }
  } else {
    // Fischmarkt: Auktionshalle in Backstein, Stände mit Markisen
    const stein = waehle(r, NF.backstein), hx0 = 4, hx1 = W - 4, hz0 = 2, hz1 = Math.max(hz0 + 12, zK - 10), H = 9;
    koerper(S, p, hx0, hz0, hx1, hz1, yK, yK + H, dunkler(stein, 0.08), (F, s) => {
      const L = F.L, oe = [];
      for (const u of achsen(0, L, 5.5, 0.8)) oe.push({ u0: u - 1.8, u1: u + 1.8, v0: yK + 1.0, v1: yK + H - 1.2, art: 'rund', typ: 'fenster', sprosse: true });
      lochwand(S, F, s[1] === 'x' ? [[0, yK], [L, yK], [L, yK + H], [L / 2, yK + H + 4.5], [0, yK + H]] : [0, yK, L, yK + H], oe, stein, { rahmen: WEISS });
      platten(S, F, [[0, yK, L, yK + 0.8], [-0.1, yK + H - 0.4, L + 0.1, yK + H + 0.05]], 0, 0.15, '#e3d6bb');
      if (s === '+z') ftext(scene, F, 'Fischauktionshalle', L / 2, yK + H - 0.75, 0.2, 0.6, L * 0.5, '#f4ead2');
    });
    const g = dachProfil(hx1 - hx0 + 0.6, hz1 - hz0 + 0.8, 4.5, 0.2, 'x'); g.translate((hx0 + hx1) / 2, yK + H, (hz0 + hz1) / 2); S.add(g, waehle(r, NF.schiefer));
    S.quader(W / 2 - 4, yK + H + 3.5, (hz0 + hz1) / 2 - 2.5, W / 2 + 4, yK + H + 6.5, (hz0 + hz1) / 2 + 2.5, GLAS_HELL);
    const g2 = dachProfil(8.6, 5.6, 2, 0.1, 'x'); g2.translate(W / 2, yK + H + 6.5, (hz0 + hz1) / 2); S.add(g2, waehle(r, NF.kupfer));
    const nst = Math.floor((W - 8) / 6.5);
    for (let i = 0; i < nst; i++) { const F = R(5 + i * 6.5, zK - 3.2, 1, 0, 5); bude(S, scene, F, 2.5, yK, waehle(r, NF.markise), waehle(r, ['Fisch', 'Aal', 'Krabben', 'Matjes', 'Räucherfisch', 'Obst'])); }
    for (let i = 0; i < 2; i++) boot(S, scene, W * (0.3 + i * 0.4), zK + 5, 'kutter', 0, waehle(r, ['#2f6f8f', '#3f7d56', '#c9483e']), YW + 0.06);
    top = Math.max(top, yK + H + 9);
  }
  return { hoehe: top, wasser: [0, zK, W, D] };
}
function nordHafen(S, scene, p) { return gedreht(S, scene, p, hafenRoh, [32, 30]); }

// =====================================================================================
// 9. Windmühle
// =====================================================================================
function fluegel(S, F, y, nab, laenge, phi, holz, gitter) {
  for (let k = 0; k < 4; k++) {
    const a = phi + (k * PI) / 2, ca = Math.cos(a), sa = Math.sin(a), qa = -sa, qb = ca;
    const U = (s, q) => nab[0] + ca * s + qa * q, Y = (s, q) => y + sa * s + qb * q;
    fbalken(S, F, U(-0.4, 0), Y(-0.4, 0), U(laenge, 0), Y(laenge, 0), 0.28, -0.15, 0.15, holz);
    for (const q of [0.25, 1.9]) fbalken(S, F, U(laenge * 0.2, q), Y(laenge * 0.2, q), U(laenge, q), Y(laenge, q), 0.09, -0.06, 0.06, gitter);
    for (let s = laenge * 0.2; s <= laenge + 0.01; s += (laenge * 0.8) / 7) fbalken(S, F, U(s, 0), Y(s, 0), U(s, 1.9), Y(s, 1.9), 0.08, -0.06, 0.06, gitter);
  }
  fscheibe(S, F, nab[0], y, -0.4, 0.3, 0.55, holz, 10);
}
function muehleRoh(S, scene, p) {
  const r = rng(`nwm:${p.seed}`);
  const v = ['galerie', 'erd', 'bock'].includes(p.variante) ? p.variante : waehle(r, ['galerie', 'erd', 'bock']);
  const W = p.w, D = p.d, cx = W / 2, cz = D * 0.48;
  boden(S, 0, 0, W, D, RASEN, 0.3, 0.05);
  const holz = '#6b5640', gitter = '#e9e3d6', reet = waehle(r, NF.reet), phi = zw(r, 0.1, 0.7);
  let top = 0;
  const vorn = p.sieht(0, 1) ? 1 : -1;
  if (v === 'bock') {
    const by = 3.2, bh = 7, bw = 5, bd = 4.2;
    for (const [dx, dz] of [[-2.2, 0], [2.2, 0], [0, -2.2], [0, 2.2]]) balken(S, [cx + dx, 0.3, cz + dz], [cx, by - 0.5, cz], 0.35, 0.35, holz);
    S.box(0.8, by, 0.8, cx, by / 2, cz, holz);
    S.quader(cx - bw / 2, by, cz - bd / 2, cx + bw / 2, by + bh, cz + bd / 2, waehle(r, ['#8a6a4a', '#7a5d43', '#9b7b55']));
    const brett = [];
    const FZ = R(cx - bw / 2, cz + bd / 2, 1, 0, bw);
    for (let u = 0.25; u < bw; u += 0.5) brett.push([u - 0.03, by + 0.1, u + 0.03, by + bh - 0.1]);
    platten(S, FZ, brett, 0, 0.04, '#5a4532');
    fb(S, FZ, bw / 2 - 0.5, bw / 2 + 0.5, by + 2, by + 3.2, 0, 0.05, '#2b2f33');
    const g = dachProfil(bd + 0.6, bw + 0.6, 2.2, 0.2, 'z'); g.translate(cx, by + bh, cz); S.add(g, '#6a6e72');
    balken(S, [cx, by + 1.2, cz - bd / 2], [cx, 0.6, cz - bd / 2 - 7], 0.3, 0.3, holz);
    balken(S, [cx - 0.6, by, cz - bd / 2], [cx - 0.6, 0.3, cz - bd / 2 - 3.5], 1.2, 0.12, '#8a6a4a');
    fluegel(S, R(cx, cz + bd / 2 + 0.6, 1, 0, 0), by + bh - 1.4, [0], 9.5, phi, holz, gitter);
    top = by + bh + 11;
  } else {
    const galerie = v === 'galerie';
    const yS = galerie ? 7.5 : 0.3, hT = galerie ? 13 : 13.5, rU = galerie ? 4.5 : 5.4, rO = 2.7;
    if (galerie) {
      const stein = waehle(r, NF.backstein);
      zyl(S, 5.0, 5.5, 7.2, cx, 0.3, cz, stein, 8);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI + PI / 8; if (Math.cos(a) + Math.sin(a) < 0.2) continue; S.box(0.2, 1.3, 0.9, cx + Math.cos(a) * 5.15, i % 2 ? 4.8 : 2.0, cz + Math.sin(a) * 5.15, i % 3 ? GLAS : '#2f5243', -a); }
      zyl(S, 7.2, 7.2, 0.3, cx, 7.2, cz, '#7a5d43', 16);
      zyl(S, 7.1, 7.1, 1.0, cx, 7.5, cz, '#5a4532', 16, true);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * PI; S.box(0.12, 1.0, 0.12, cx + Math.cos(a) * 7.1, 8.0, cz + Math.sin(a) * 7.1, '#5a4532'); }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI; balken(S, [cx + Math.cos(a) * 5.2, 5.0, cz + Math.sin(a) * 5.2], [cx + Math.cos(a) * 6.9, 7.2, cz + Math.sin(a) * 6.9], 0.2, 0.2, '#5a4532'); }
    }
    zyl(S, rO, rU, hT, cx, yS, cz, galerie ? reet : reet, 8);
    for (let i = 0; i < 3; i++) zyl(S, rO + (rU - rO) * (1 - (i + 1) / 4) + 0.06, rO + (rU - rO) * (1 - (i + 1) / 4) + 0.06, 0.18, cx, yS + (hT * (i + 1)) / 4, cz, dunkler(reet, 0.08), 8);
    if (!galerie) S.box(1.4, 2.4, 0.3, cx, 1.5, cz + vorn * (rU - 0.25), '#2f5243');
    const yk = yS + hT;
    zyl(S, rO + 0.25, rO + 0.25, 0.4, cx, yk, cz, '#e9e3d6', 12);
    const kap = dachProfil(6.6, 5.6, 2.6, 0.5, 'z'); kap.translate(cx, yk + 0.4, cz); S.add(kap, '#e9e3d6');
    // Windrose
    if (galerie) { balken(S, [cx, yk + 1, cz - 3], [cx, yk + 1.8, cz - 5.5], 0.15, 0.15, holz); for (let i = 0; i < 6; i++) { const a = (i / 6) * 2 * PI; balken(S, [cx, yk + 2.2, cz - 5.5], [cx + Math.cos(a) * 1.4, yk + 2.2 + Math.sin(a) * 1.4, cz - 5.5], 0.5, 0.06, '#e9e3d6'); } }
    else balken(S, [cx, yk + 0.5, cz - 3], [cx, 0.6, cz - 11], 0.3, 0.3, holz);
    const la = galerie ? 11 : 12.2;
    fluegel(S, R(cx, cz + 3.6, 1, 0, 0), yk + 1.3, [0], la, phi, holz, gitter);
    top = yk + 1.3 + la;
  }
  // Umgebung: Müllerhaus, Weg, Zaun, Schafe
  const mx = W < 34 ? null : (vorn > 0 ? 2 : W - 12);
  if (mx !== null && D > 26) { S.quader(mx, 0, 2, mx + 10, 3.4, 9, waehle(r, NF.backstein)); const g = dachProfil(10.4, 7.8, 3.6, 0.15, 'x'); g.translate(mx + 5, 3.4, 5.5); S.add(g, waehle(r, NF.ziegel)); for (const s of seitenListe(p, mx, 2, mx + 10, 9)) lochwand(S, s.F, [0, 0, s.F.L, 3.4], achsen(0, s.F.L, 2.6, 0.6).map((u, i) => (i === 1 && s.k === '+z' ? { u0: u - 0.5, u1: u + 0.5, v0: 0.3, v1: 2.4, typ: 'tuer', fuell: '#2f5243' } : fenster(u, 1.0, 0.9, 1.2))), waehle(r, NF.backstein), { rahmen: WEISS }); }
  boden(S, cx - 1.1, cz, cx + 1.1, D, '#cbb88e', 0.3, 0.08);
  for (const F of [R(0.3, D - 0.3, 1, 0, W - 0.6), R(W - 0.3, D - 0.3, 0, -1, D - 0.6)]) if (sieht(p, F)) for (let u = 0.5; u < F.L; u += 2.5) { const [x, z] = wp(F, u, 0); S.box(0.15, 1.1, 0.15, x, 0.85, z, '#7a5d43'); if (u + 2.5 < F.L) { const [x2, z2] = wp(F, u + 2.5, 0); balken(S, [x, 1.1, z], [x2, 1.1, z2], 0.08, 0.08, '#7a5d43'); balken(S, [x, 0.7, z], [x2, 0.7, z2], 0.08, 0.08, '#7a5d43'); } }
  for (let i = 0; i < 5; i++) { const sx = zw(r, 2, W - 2), sz = zw(r, D * 0.75, D - 2); if (Math.abs(sx - cx) < 2) continue; S.box(1.3, 0.8, 0.8, sx, 0.9, sz, '#f2efe6'); S.box(0.45, 0.45, 0.45, sx + 0.75, 1.15, sz, '#3a3f44'); }
  for (let i = 0; i < 3; i++) baumN(S, r, i % 2 ? zw(r, 2, 6) : W - zw(r, 2, 6), zw(r, 3, D * 0.5), 0.9);
  return { hoehe: top };
}
function seitenListe(p, x0, z0, x1, z1) { const sz = seiten(x0, z0, x1, z1); return Object.entries(sz).filter(([, F]) => sieht(p, F)).map(([k, F]) => ({ k, F })); }
function nordWindmuehle(S, scene, p) { return gedreht(S, scene, p, muehleRoh, [24, 24]); }

// =====================================================================================
// 10. Niederdeutsches Hallenhaus (Reetdach) und Friesenhaus
// =====================================================================================
function fachwerk(S, F, L, y0, y1, holz, o = {}) {
  const st = [], ri = [];
  for (let u = 0; u <= L + 0.01; u += o.raster ?? 1.25) st.push([Math.min(L - 0.11, Math.max(0.11, u)) - 0.11, y0, Math.min(L - 0.11, Math.max(0.11, u)) + 0.11, y1]);
  for (const y of o.riegel ?? []) ri.push([0, y - 0.1, L, y + 0.1]);
  ri.push([0, y0, L, y0 + 0.22], [0, y1 - 0.22, L, y1]);
  platten(S, F, [...st, ...ri], 0, 0.1, holz);
  if (o.streben) for (let u = 0; u + (o.raster ?? 1.25) <= L; u += (o.raster ?? 1.25) * 3) fbalken(S, F, u + 0.1, y0 + 0.2, u + (o.raster ?? 1.25) - 0.1, y1 - 0.2, 0.16, 0, 0.1, holz);
}
function bauernhausRoh(S, scene, p) {
  const r = rng(`nbh:${p.seed}`);
  const v = ['fachhalle', 'backstein', 'friesen', 'hof'].includes(p.variante) ? p.variante : waehle(r, ['fachhalle', 'backstein', 'friesen', 'hof']);
  const W = p.w, D = p.d, reet = waehle(r, NF.reet), holz = '#4a3526', stein = waehle(r, NF.backstein), first = '#6b5a45';
  boden(S, 0, 0, W, D, RASEN, 0.3, 0.05);
  let top = 0;
  if (v === 'friesen') {
    // traufständig, weiß geschlämmt, Frontgiebel über der Tür, Walmdach
    const L = Math.min(W - 4, 24), B = Math.min(D - 6, 9), x0 = (W - L) / 2, z1 = D - 4, z0 = z1 - B, hw = 3.0, dh = B * 0.85, wand = '#f2eee5';
    koerper(S, p, x0, z0, x0 + L, z1, 0, hw, dunkler(wand, 0.1), (F, s) => {
      const oe = [];
      for (const [i, u] of achsen(0, F.L, 2.4, 0.8).entries()) oe.push(s === '+z' && i === Math.floor(F.L / 2.4 / 2) ? { u0: u - 0.6, u1: u + 0.6, v0: 0.3, v1: 2.4, typ: 'tuer', fuell: '#2f6f8f' } : fenster(u, 0.9, 1.1, 1.3, null, { rahmen: WEISS }));
      lochwand(S, F, [0, 0, F.L, hw], oe, wand, { rahmen: '#3f7d56', bank: WEISS });
      platten(S, F, [[0, 0, F.L, 0.4]], 0, 0.06, '#a6a197');
    });
    walm(S, x0 - 0.7, z0 - 0.7, x0 + L + 0.7, z1 + 0.7, hw - 0.3, dh, reet, { achse: 'x', kv: B / 2 + 0.7, kh: B / 2 + 0.7 });
    const FF = R(x0, z1, 1, 0, L);
    const uc = achsen(0, L, 2.4, 0.8)[Math.floor(L / 2.4 / 2)], gb = 3.4;
    lochwand(S, teil(FF, uc - gb / 2, uc + gb / 2, 0.3), [[0, 0], [gb, 0], [gb, hw + 1.0], [gb / 2, hw + 4.2], [0, hw + 1.0]], [fenster(gb / 2, hw + 0.9, 0.9, 1.1, null, { rahmen: WEISS })], wand, { rahmen: '#3f7d56', tw: 0.7 });
    const gz = dachProfil(3.4, gb + 0.6, 3.3, 0.1, 'z'); gz.translate(x0 + uc, hw + 1.0, z1 - 1.3); S.add(gz, reet);
    S.quader(x0 + L * 0.3, hw + dh - 1.6, (z0 + z1) / 2 - 0.4, x0 + L * 0.3 + 0.8, hw + dh + 0.6, (z0 + z1) / 2 + 0.4, '#f2eee5');
    S.quader(x0 + L * 0.2, hw + dh - 0.45, (z0 + z1) / 2 - 0.25, x0 + L * 0.8, hw + dh - 0.15, (z0 + z1) / 2 + 0.25, first);
    // Steinwall (Friesenwall) mit Rosen
    for (const F of [R(0.3, D - 0.6, 1, 0, W - 0.6)]) { fb(S, F, 0, F.L, 0.3, 1.1, -0.4, 0.4, '#9d978c'); for (let uu = 1; uu < F.L; uu += 2.2) busch(S, r, ...wp(F, uu, -0.2), 0.6); }
    for (let i = 0; i < 2; i++) baumN(S, r, i ? W - 3 : 3, z0 - 2, 1.2);
    top = hw + dh;
  } else {
    const B = Math.min(W * (v === 'hof' ? 0.5 : 0.72), 15), Lh = Math.min(D - 5, 30), xh = v === 'hof' ? 2 : (W - B) / 2, zf = D - 3.5, zb = zf - Lh;
    const hw = 3.1, dh = B * 0.78, kw = 0.55, fach = v !== 'backstein', fuell = v === 'backstein' ? stein : r() < 0.6 ? waehle(r, NF.backstein) : '#efe9dc';
    const y0 = hw - 0.35;
    const sz = seiten(xh, zb, xh + B, zf);
    S.quader(xh + 0.3, 0, zb + 0.3, xh + B - 0.3, hw, zf - 0.3, dunkler(fuell, 0.08));
    walm(S, xh - 0.7, zb - 0.7, xh + B + 0.7, zf + 0.6, y0, dh, reet, { achse: 'z', kv: 2.2, kh: B / 2 + 0.7, kw, giebel: false });
    // Giebel vorn: Fachwerk mit Grotdör
    const FF = sz['+z'];
    const ys = (u) => y0 + (dh * (Math.min(u, B - u) + 0.7)) / (B / 2 + 0.7) - 0.25, yk = y0 + kw * dh - 0.2;
    const uk = (B / 2 + 0.7) * kw - 0.7;
    const gum = [[0, 0], [B, 0], [B, ys(B)], [B - uk, yk], [uk, yk], [0, ys(0)]];
    const door = { u0: B / 2 - 1.8, u1: B / 2 + 1.8, v0: 0.3, v1: 4.4, art: 'segment', typ: 'tuer', fuell: waehle(r, ['#3c5a46', '#7a4a2e', '#3f4f5a']) };
    lochwand(S, FF, gum, [door, fenster(B / 2 - 3.6, 1.0, 1.0, 1.2), fenster(B / 2 + 3.6, 1.0, 1.0, 1.2), { u0: B / 2 - 0.5, u1: B / 2 + 0.5, v0: yk - 1.4, v1: yk - 0.3, typ: 'tuer', fuell: '#2b2f33' }], fach ? fuell : stein, { rahmen: WEISS, tw: 0.3 });
    if (fach || true) {
      const FG = teil(FF, 0, B, 0.02), bal = [];
      for (const u of [0.15, B / 2 - 2.05, B / 2 + 2.05, B - 0.15]) bal.push([u - 0.15, 0.3, u + 0.15, Math.min(ys(u), yk)]);
      if (fach) for (const u of [1.3, 2.6, B - 2.6, B - 1.3]) bal.push([u - 0.11, 0.3, u + 0.11, Math.min(ys(u), yk) - 0.1]);
      bal.push([0, hw - 0.12, B, hw + 0.1], [0, 4.5, B, 4.75], [0.6, hw + 2.2, B - 0.6, hw + 2.4], [0, 0.3, B, 0.55]);
      platten(S, FG, bal, 0, 0.1, holz);
      if (fach) { fbalken(S, FG, 0.3, 2.0, 1.2, hw - 0.2, 0.15, 0, 0.1, holz); fbalken(S, FG, B - 0.3, 2.0, B - 1.2, hw - 0.2, 0.15, 0, 0.1, holz); }
      fb(S, FF, B / 2 - 1.8, B / 2 + 1.8, 4.5, 4.75, 0.1, 0.16, '#3a2a1e');
      ftext(scene, FF, `Anno ${1720 + (p.seed * 37) % 160}`, B / 2, 4.62, 0.17, 0.2, 3.2, '#f2e7c9');
      fb(S, FF, B / 2 - 0.04, B / 2 + 0.04, 0.4, 4.3, 0.1, 0.14, '#e9e3d6');
      // Pferdeköpfe am First
      const yF = y0 + dh, uF = B / 2;
      const [px, pz] = wp(FF, uF, -2.2 + 0.6);
      const FP = R(px - B / 2, pz, 1, 0, B);
      fbalken(S, FP, uF - 1.6, yF - 1.4, uF + 0.9, yF + 0.6, 0.25, 0, 0.12, '#e9e3d6');
      fbalken(S, FP, uF + 1.6, yF - 1.4, uF - 0.9, yF + 0.6, 0.25, 0, 0.12, '#e9e3d6');
    }
    // Längsseiten (Kübbungen) und Rückseite
    for (const k of ['+x', '-x', '-z']) {
      const F = sz[k];
      if (!sieht(p, F)) continue;
      const L = F.L, oe = [];
      if (k !== '-z') { for (const [i, u] of achsen(0.5, L - 0.5, 2.5, 0.3).entries()) oe.push(i === 3 ? { u0: u - 0.7, u1: u + 0.7, v0: 0.3, v1: 2.4, typ: 'tuer', fuell: '#3c5a46' } : (u < L * 0.45 ? fenster(u, 1.0, 0.9, 1.1) : fenster(u, 1.4, 0.7, 0.6, null, { sprosse: false }))); }
      else for (const u of achsen(0, L, 2.6, 0.8)) oe.push(fenster(u, 0.9, 1.0, 1.3));
      lochwand(S, F, [0, 0, L, hw], oe, fuell, { rahmen: WEISS, tw: 0.3 });
      if (fach) fachwerk(S, teil(F, 0, L, 0.02), L, 0.3, hw, holz, { riegel: [1.6], streben: k !== '-z' });
      else platten(S, F, [[0, 0, L, 0.5]], 0, 0.06, dunkler(stein, 0.1));
    }
    S.quader(xh + B / 2 - 0.55, y0 + dh - 0.45, zb + B / 2, xh + B / 2 + 0.55, y0 + dh + 0.12, zf - 1.6, first);
    for (const sx of [-1, 1]) {
      const F = sx > 0 ? sz['+x'] : sz['-x'];
      if (!sieht(p, F)) continue;
      const neig = Math.atan2(dh, B / 2 + 0.7);
      for (let i = 0; i < Math.floor(Lh / 9); i++) {
        // Fledermausgaube: flache Welle im Reet über einem liegenden Fenster
        const zc = zb + 6 + i * 9, q = 0.4, xr = xh + B / 2 + sx * (B / 2 + 0.7) * (1 - q), yr = y0 + dh * q;
        const g = new THREE.CylinderGeometry(1.0, 1.0, 2.8, 12, 1, false, 0, PI);
        g.rotateX(PI / 2); g.scale(0.42, 1, 1);
        g.rotateZ(sx > 0 ? PI / 2 - neig : PI / 2 + neig); g.translate(xr, yr, zc); S.add(g, heller(reet, 0.03));
        const nx = sx * Math.sin(neig), ny = Math.cos(neig);
        S.box(0.08, 0.42, 1.5, xr + nx * 0.18 + sx * 0.25, yr + ny * 0.18 - 0.25, zc, '#2b2f33');
        S.box(0.06, 0.06, 1.55, xr + nx * 0.18 + sx * 0.27, yr + ny * 0.18 - 0.25, zc, WEISS);
      }
    }
    S.quader(xh + B / 2 - 0.5, y0 + dh * 0.7, zb + Lh * 0.25, xh + B / 2 + 0.5, y0 + dh + 1.0, zb + Lh * 0.25 + 1.0, dunkler(stein, 0.05));
    top = y0 + dh + 1;
    // Hofbaum (Eiche) und Misthaufen/Wagen
    baumN(S, r, v === 'hof' ? xh + B + 3 : Math.max(2.5, xh - 3), zf + 1.2, 1.3);
    if (v === 'hof') {
      // Scheune, Heuballen, Zaun
      const sx0 = xh + B + 6, sx1 = W - 2, szb = 3, szf = Math.min(zf - 6, szb + 14);
      if (sx1 - sx0 > 6) {
        koerper(S, p, sx0, szb, sx1, szf, 0, 4.5, '#4a3a2c', (F, s) => { const st = []; for (let u = 0.2; u < F.L; u += 0.45) st.push([u - 0.04, 0.3, u + 0.04, 4.4]); lochwand(S, F, [0, 0, F.L, 4.5], s[1] === 'z' ? [{ u0: F.L / 2 - 1.8, u1: F.L / 2 + 1.8, v0: 0.3, v1: 3.8, typ: 'tuer', fuell: '#2e2620' }] : [], '#5b4636'); platten(S, F, st, 0, 0.05, '#4a3a2c'); });
        const gs = dachProfil(szf - szb + 0.8, sx1 - sx0 + 0.8, (sx1 - sx0) * 0.55, 0.15, 'z'); gs.translate((sx0 + sx1) / 2, 4.5, (szb + szf) / 2); S.add(gs, r() < 0.5 ? reet : waehle(r, NF.ziegel));
      }
      for (let i = 0; i < 5; i++) { const g = new THREE.CylinderGeometry(0.8, 0.8, 1.2, 10); g.rotateZ(PI / 2); g.translate(xh + B + 3 + (i % 3) * 1.4, 1.1 + Math.floor(i / 3) * 1.5, zb + 3); S.add(g, '#d9c27a'); }
      for (let x = 1; x < W - 1; x += 2.4) { S.box(0.14, 1.1, 0.14, x, 0.85, D - 0.5, '#e9e3d6'); }
      S.box(W - 2, 0.1, 0.08, W / 2, 1.2, D - 0.5, '#e9e3d6'); S.box(W - 2, 0.1, 0.08, W / 2, 0.7, D - 0.5, '#e9e3d6');
    }
    boden(S, xh + B / 2 - 2.2, zf, xh + B / 2 + 2.2, D, '#cbb88e', 0.3, 0.08);
  }
  return { hoehe: top };
}
function nordBauernhaus(S, scene, p) { const v = ['fachhalle', 'backstein', 'friesen', 'hof'].includes(p.variante) ? p.variante : waehle(rng(`nbh:${p.seed}`), ['fachhalle', 'backstein', 'friesen', 'hof']); return gedreht(S, scene, { ...p, variante: v }, bauernhausRoh, v === 'friesen' ? [22, 16] : v === 'hof' ? [34, 30] : [18, 26]); }

// =====================================================================================
// 11. Strandpromenade im Seebad (weiße Bäderarchitektur)
// =====================================================================================
const VILLEN = ['Villa Seeblick', 'Haus Möwe', 'Villa Strandperle', 'Pension Meeresrauschen', 'Haus Ostseegruß', 'Villa Dünenruh', 'Haus Seestern', 'Villa Bernstein', 'Pension Strandgut'];
function veranda(S, F, u0, u1, y0, n, gh, t, holz, o = {}) {
  for (let k = 0; k < n; k++) {
    const y = y0 + k * gh;
    fb(S, F, u0, u1, y - 0.15, y + 0.05, 0, t, WEISS);
    const FL = teil(F, u0, u1, t - 0.06), L = u1 - u0, lo = [];
    for (let u = 0.35; u < L - 0.2; u += 0.42) lo.push({ u0: u - 0.13, u1: u + 0.13, v0: y + 0.25, v1: y + 0.75, art: 'rund', typ: 'offen' });
    lochwand(S, FL, [0, y + 0.05, L, y + 1.0], lo, holz, { tw: 0.06, t1: 0.0 });
    for (const u of [u0 + 0.1, (u0 + u1) / 2, u1 - 0.1]) fb(S, F, u - 0.09, u + 0.09, y + 0.05, y + gh - 0.15, t - 0.2, t - 0.02, holz);
    const z = []; for (let u = u0 + 0.5; u < u1 - 0.3; u += 0.5) z.push([[u - 0.25, y + gh - 0.15], [u + 0.25, y + gh - 0.15], [u, y + gh - 0.55]]);
    platten(S, teil(F, 0, F.L, t - 0.1), z.map((q) => q.map(([a, b]) => [a, b])), -0.04, 0.04, holz);
  }
  fb(S, F, u0 - 0.15, u1 + 0.15, y0 + n * gh - 0.15, y0 + n * gh + 0.05, 0, t + 0.2, WEISS);
  if (o.dach) { const g = new THREE.BoxGeometry(u1 - u0 + 0.6, 0.12, t + 0.6); g.rotateX(0.35); g.translate((u0 + u1) / 2, y0 + n * gh + 0.25, (t + 0.6) / 2 - 0.2); fgeo(S, F, g, o.dach); }
}
function villa(S, scene, p, r, x0, z0, x1, z1, o) {
  const wand = o.wand, n = o.n, eg = 0.9, gh = 3.2, H = eg + n * gh, holz = o.holz, dach = o.dach, L = x1 - x0, T = z1 - z0;
  const vis = koerper(S, p, x0, z0, x1, z1, 0, H, dunkler(wand, 0.08), (F, s) => {
    const oe = [], front = s === '+z';
    for (let k = 0; k < n; k++) for (const [i, u] of achsen(0, F.L, 2.4, 0.6).entries()) oe.push(front && k === 0 && i === 1 ? { u0: u - 0.65, u1: u + 0.65, v0: eg, v1: eg + 2.6, typ: 'tuer', fuell: GLAS_HELL, art: 'segment' } : fenster(u, eg + k * gh + 0.55, 1.1, 2.0, 'segment'));
    lochwand(S, F, [0, 0, F.L, H], oe, wand, { rahmen: WEISS, bank: WEISS });
    const bd = [[0, 0, F.L, eg]]; for (let k = 1; k < n; k++) bd.push([-0.05, eg + k * gh - 0.1, F.L + 0.05, eg + k * gh + 0.08]);
    bd.push([-0.25, H - 0.3, F.L + 0.25, H + 0.05]);
    platten(S, F, bd, 0, 0.15, WEISS);
    for (let u = 0.3; u < F.L; u += 0.6) fb(S, F, u - 0.08, u + 0.08, H - 0.55, H - 0.3, 0, 0.3, WEISS);
    if (front) { const vb = Math.min(F.L * 0.62, F.L - 2), u0 = (F.L - vb) / 2 + (o.turm ? -F.L * 0.12 : 0); veranda(S, F, Math.max(0.3, u0), Math.max(0.3, u0) + vb, eg, n, gh, 2.0, holz, { dach }); fb(S, F, Math.max(0.3, u0), Math.max(0.3, u0) + vb, 0, eg, 0, 2.0, WEISS); for (let s2 = 0; s2 < 3; s2++) fb(S, F, F.L / 2 - 1, F.L / 2 + 1, 0.3, 0.3 + (s2 + 1) * 0.2, 2.0, 2.0 + (3 - s2) * 0.35, GRANIT); ftext(scene, F, o.name, F.L / 2, H - 0.75, 0.32, 0.42, F.L * 0.6, '#2f5f8f'); }
  });
  // Dach: Walm mit Zwerchgiebel und Zierbrettern
  const dh = Math.min(L, T) * 0.42;
  walm(S, x0 - 0.5, z0 - 0.5, x1 + 0.5, z1 + 0.5, H, dh, dach, { achse: 'x', kv: T / 2 + 0.5, kh: T / 2 + 0.5 });
  const FF = R(x0, z1, 1, 0, L);
  if (vis.vis['+z']) {
    const gb = Math.min(5, L * 0.4), uc = L / 2 + (o.turm ? L * 0.15 : 0);
    fpolyF(S, teil(FF, uc - gb / 2, uc + gb / 2, 0), [[0, H], [gb, H], [gb / 2, H + gb * 0.7]], -2.5, 0.1, wand);
    fb(S, FF, uc - 0.6, uc + 0.6, H + 0.4, H + 1.8, 0.1, 0.14, GLAS);
    fbalken(S, FF, uc - gb / 2 - 0.3, H - 0.1, uc, H + gb * 0.7 + 0.2, 0.25, 0.1, 0.3, holz);
    fbalken(S, FF, uc + gb / 2 + 0.3, H - 0.1, uc, H + gb * 0.7 + 0.2, 0.25, 0.1, 0.3, holz);
    fb(S, FF, uc - 0.08, uc + 0.08, H + gb * 0.45, H + gb * 0.7 + 1.0, 0.12, 0.3, holz);
    const gz = dachProfil(3, gb + 0.6, gb * 0.7, 0.1, 'z'); gz.translate(x0 + uc, H, z1 - 1.4); S.add(gz, dach);
  }
  let top = H + dh;
  if (o.turm) {
    const tx = x1 - 1.6, tz = z1 - 1.0;
    zyl(S, 2.0, 2.0, H + 3.2, tx, 0, tz, wand, 8);
    for (let k = 0; k < n + 1; k++) S.box(0.8, 1.6, 0.15, tx + 1.45, eg + k * gh + 1.4, tz + 1.45, GLAS, -PI / 4);
    zyl(S, 2.15, 2.15, 0.25, tx, H, tz, WEISS, 8);
    kegel(S, 2.4, 4.5, tx, H + 3.2, tz, dach, 8); zyl(S, 0.04, 0.1, 1.2, tx, H + 7.7, tz, '#c9a24a', 6);
    top = Math.max(top, H + 8.9);
  }
  S.quader(x0 + L * 0.3, H + dh * 0.4, (z0 + z1) / 2, x0 + L * 0.3 + 0.7, H + dh + 0.8, (z0 + z1) / 2 + 0.7, '#c9c4b8');
  return top;
}
function strandkorb(S, x, z, y0, farbe, ry = 0) {
  const F = R(x, z, Math.cos(ry), -Math.sin(ry), 0);
  fb(S, F, -0.7, 0.7, y0, y0 + 0.75, -0.55, 0.55, '#e3d3a8');
  fb(S, F, -0.7, 0.7, y0 + 0.75, y0 + 1.6, -0.55, -0.25, '#e3d3a8');
  fb(S, F, -0.75, 0.75, y0 + 1.2, y0 + 1.75, -0.6, 0.15, farbe);
  for (const s of [-1, 1]) fb(S, F, s * 0.7 - 0.06, s * 0.7 + 0.06, y0 + 0.75, y0 + 1.25, -0.55, 0.3, '#e3d3a8');
  fb(S, F, -0.72, 0.72, y0 + 1.42, y0 + 1.55, -0.62, 0.17, '#f4f1ea');
}
function strandRoh(S, scene, p) {
  const r = rng(`nst:${p.seed}`);
  const v = ['villen', 'kurhaus', 'seebruecke'].includes(p.variante) ? p.variante : waehle(r, ['villen', 'kurhaus', 'seebruecke']);
  const W = p.w, D = p.d, Dv = Math.min(D * 0.46, 22), zP = Dv + 1, zS = zP + 6, zW = D - Math.max(4, D * 0.16);
  // Bänder: Promenade, Strand, Meer
  boden(S, 0, 0, W, Dv + 1, RASEN2, 0.3, 0.05);
  boden(S, 0, zP, W, zS, '#d9d2c2', 0.3, 0.1);
  S.quader(0, 0.3, zS - 0.4, W, 0.7, zS, '#e9e6de');
  boden(S, 0, zS, W, zW, SAND, 0.3, 0.06);
  S.quader(0, 0.3, zW, W, 0.38, D, WASSER);
  const wasserR = [0, zW, W, D];
  for (let i = 0; i < Math.floor(W / 4); i++) S.box(zw(r, 1.5, 4), 0.04, 0.25, zw(r, 1, W - 1), 0.4, zW + zw(r, 0.3, 1.2), '#f4f7f6');
  for (let x = 4; x < W - 2; x += 12) { laterne(S, x, zS - 1.0, 4.2, 0.4); bank(S, x + 6, zS - 1.2, PI, 0.4); }
  // Bebauung
  let top = 6;
  if (v === 'kurhaus') {
    const L = Math.min(W - 6, 70), x0 = (W - L) / 2, z0 = 2, z1 = Dv - 1, H = 0.9 + 3 * 3.6, wand = '#f6f4ee';
    koerper(S, p, x0, z0, x0 + L, z1, 0, H, '#d9d6cf', (F, s) => {
      const oe = raster(0, F.L, 3.0, 0.9, 3, 3.6, 1.4, 2.4, 'rund', 0.8, 0.5);
      lochwand(S, F, [0, 0, F.L, H + 1.2], oe, wand, { rahmen: WEISS, bank: WEISS });
      platten(S, F, [[0, 0, F.L, 0.9], [-0.2, H - 0.3, F.L + 0.2, H + 0.1], [-0.1, 0.9 + 3.6 - 0.15, F.L + 0.1, 0.9 + 3.6 + 0.1]], 0, 0.2, '#e9e3d6');
      if (s === '+z') {
        const pb = Math.min(18, F.L * 0.3), u0 = F.L / 2 - pb / 2;
        for (let i = 0; i <= 6; i++) zyl(S, 0.45, 0.5, 9.5, ...(() => { const [x, z] = wp(F, u0 + (i * pb) / 6, 2.4); return [x, 0.9, z]; })(), WEISS, 10);
        fb(S, F, u0 - 0.8, u0 + pb + 0.8, 10.4, 11.4, 0, 3.2, WEISS);
        fpolyF(S, teil(F, u0 - 0.8, u0 + pb + 0.8, 3.0), [[0, 11.4], [pb + 1.6, 11.4], [pb / 2 + 0.8, 14.2]], -0.4, 0.1, WEISS);
        fb(S, F, u0 - 1, u0 + pb + 1, 0.3, 0.9, 0, 4, '#e9e3d6');
        ftext(scene, F, 'Kurhaus', F.L / 2, H + 0.55, 0.3, 0.9, F.L * 0.3, '#2f5f8f');
        veranda(S, F, 1.5, u0 - 2, 0.9, 2, 3.6, 2.2, '#f6f4ee', { dach: waehle(r, NF.schiefer) });
        veranda(S, F, u0 + pb + 2, F.L - 1.5, 0.9, 2, 3.6, 2.2, '#f6f4ee', { dach: waehle(r, NF.schiefer) });
      }
    });
    const dachF = waehle(r, NF.schiefer);
    walm(S, x0 - 0.5, z0 - 0.5, x0 + L + 0.5, z1 + 0.5, H + 1.2, 4.5, dachF, { achse: 'x', kv: (z1 - z0) / 2 + 0.5, kh: (z1 - z0) / 2 + 0.5 });
    const cx = W / 2, cz = (z0 + z1) / 2;
    zyl(S, 4.2, 4.2, 3, cx, H + 1.2, cz, wand, 12);
    const g = new THREE.SphereGeometry(4.4, 16, 8, 0, 2 * PI, 0, PI / 2); g.scale(1, 0.9, 1); g.translate(cx, H + 4.2, cz); S.add(g, waehle(r, NF.kupfer));
    zyl(S, 0.06, 0.06, 4, cx, H + 8.1, cz, '#e8e6e0', 6); S.box(0.05, 0.9, 1.5, cx, H + 11.4, cz + 0.78, '#2f6f8f');
    for (let x = 6; x < W - 4; x += 5) { tisch(S, x, zP + 2.5, 0.4); schirm(S, x, zP + 2.5, 0.4, 1.3, waehle(r, ['#f4f1ea', '#2f6f8f', '#c9483e'])); }
    top = H + 12;
  } else {
    const nvil = Math.max(1, Math.floor(W / 19)), bv = W / nvil;
    const dachN = r() < 0.5 ? NF.schiefer : NF.ziegel;
    for (let i = 0; i < nvil; i++) {
      if (v === 'seebruecke' && nvil > 2 && i === Math.floor(nvil / 2)) continue;
      const L = Math.min(bv - 3, 16), x0 = i * bv + (bv - L) / 2, z1 = Dv - 2.5, z0 = Math.max(1, z1 - 13);
      top = Math.max(top, villa(S, scene, p, r, x0, z0, x0 + L, z1, { wand: r() < 0.7 ? '#f7f5ef' : waehle(r, ['#f3e8cf', '#e3edf1', '#f1e1df']), n: 2 + Math.floor(r() * 2), holz: r() < 0.6 ? '#f7f5ef' : waehle(r, ['#cfe0e6', '#d9e7d2']), dach: waehle(r, dachN), turm: r() < 0.45, name: VILLEN[(p.seed + i * 3) % VILLEN.length] }));
      zaun(S, R(i * bv + 0.5, Dv + 0.6, 1, 0, bv - 1), 0, bv - 1, 0, WEISS, 0.9);
      busch(S, r, i * bv + 2, Dv - 1, 0.9); busch(S, r, (i + 1) * bv - 2, Dv - 1.2, 1.0);
    }
    if (v === 'seebruecke') {
      const sx = W / 2, sb = 5;
      for (let z = zS; z < D - 6; z += 3) for (const s of [-1, 1]) S.box(0.3, 1.8, 0.3, sx + s * (sb / 2 - 0.3), 0.6 + 0.5, z, '#7a5d43');
      S.quader(sx - sb / 2, 1.6, zS - 0.5, sx + sb / 2, 1.85, D - 6, '#b08a62');
      for (const s of [-1, 1]) { S.box(0.08, 0.08, D - 6 - zS, sx + s * (sb / 2 - 0.05), 2.85, (zS + D - 6) / 2, WEISS); for (let z = zS; z < D - 6; z += 1.5) S.box(0.08, 1.0, 0.08, sx + s * (sb / 2 - 0.05), 2.35, z, WEISS); }
      const pr = 6.2, pz = D - pr - 0.5;
      zyl(S, pr, pr, 0.3, sx, 1.6, pz, '#b08a62', 16);
      zyl(S, pr - 1.5, pr - 1.5, 3.2, sx, 1.9, pz, '#f6f4ee', 12);
      zyl(S, pr - 1.45, pr - 1.45, 1.6, sx, 2.7, pz, GLAS_HELL, 12);
      const g = new THREE.ConeGeometry(pr - 0.5, 2.6, 12); g.translate(sx, 5.1 + 1.3, pz); S.add(g, waehle(r, NF.kupfer));
      zyl(S, 0.06, 0.06, 3, sx, 7.7, pz, '#e8e6e0', 6);
      boden(S, sx - 3, Dv + 1, sx + 3, zS, '#d9d2c2', 0.3, 0.12);
      top = Math.max(top, 10);
    }
  }
  // Strand: Strandkörbe, Rettungsturm, Dünengras
  const kf = ['#2f6f8f', '#c9483e', '#3f7d56', '#e2b83b', '#1f3a5f', '#e07a3f'];
  for (let z = zS + 2.5; z < zW - 2; z += 3.4) for (let x = 3 + ((z * 7) % 3); x < W - 2; x += 3.2) {
    if (v === 'seebruecke' && Math.abs(x - W / 2) < 4.5) continue;
    if (hash(Math.round(x * 10), Math.round(z * 10), p.seed) % 5 < 2) continue;
    strandkorb(S, x, z, 0.36, kf[hash(Math.round(x), Math.round(z)) % kf.length], 0);
  }
  if (W > 30) { const tx = v === 'seebruecke' ? W * 0.2 : W * 0.5, tz = zW - 3; for (const [a, b] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) S.box(0.18, 3.2, 0.18, tx + a, 1.95, tz + b, WEISS); S.quader(tx - 1.3, 3.5, tz - 1.3, tx + 1.3, 5.6, tz + 1.3, '#d9482e'); S.box(2.62, 0.7, 2.62, tx, 4.9, tz, GLAS_HELL); S.quader(tx - 1.5, 5.6, tz - 1.5, tx + 1.5, 5.8, tz + 1.5, WEISS); fahne(S, tx, tz, 5.8, 2.5, '#e2b83b'); }
  for (let i = 0; i < Math.floor(W / 5); i++) { const g = new THREE.ConeGeometry(0.5, 0.9, 5); g.translate(zw(r, 1, W - 1), 0.8, zS + zw(r, 0.4, 1.4)); S.add(g, '#a8b46a'); }
  return { hoehe: top, wasser: wasserR };
}
function nordStrandpromenade(S, scene, p) { return gedreht(S, scene, p, strandRoh, [36, 44]); }

// =====================================================================================
// Slot-Tabelle
// =====================================================================================
export const NORD_SLOTS = {
  'slot:nord_giebelhaus': nordGiebelhaus,
  'slot:nord_kontorhaus': nordKontorhaus,
  'slot:nord_speicher': nordSpeicher,
  'slot:nord_wiederaufbau': nordWiederaufbau,
  'slot:nord_reihenhaus': nordReihenhaus,
  'slot:nord_kirche': nordKirche,
  'slot:nord_rathaus': nordRathaus,
  'slot:nord_hafen': nordHafen,
  'slot:nord_windmuehle': nordWindmuehle,
  'slot:nord_bauernhaus': nordBauernhaus,
  'slot:nord_strandpromenade': nordStrandpromenade,
};
/** Varianten je Slot (p.variante); unbekannte oder fehlende Varianten wählt der Slot per Seed. */
export const NORD_VARIANTEN = {
  'slot:nord_giebelhaus': Object.keys(GIEBEL_POOL),
  'slot:nord_kontorhaus': Object.keys(KONTOR_STIL),
  'slot:nord_speicher': ['speicherstadt', 'giebel', 'schlicht'],
  'slot:nord_wiederaufbau': ['kiel', 'hannover', 'laubengang', 'geschaeft'],
  'slot:nord_reihenhaus': ['schumacher', 'bremer', 'siedlung'],
  'slot:nord_kirche': Object.keys(KIRCHE_MIN),
  'slot:nord_rathaus': ['schauwand', 'laube', 'renaissance'],
  'slot:nord_hafen': ['kai', 'anleger', 'leuchtturm', 'fischmarkt'],
  'slot:nord_windmuehle': ['galerie', 'erd', 'bock'],
  'slot:nord_bauernhaus': ['fachhalle', 'backstein', 'friesen', 'hof'],
  'slot:nord_strandpromenade': ['villen', 'kurhaus', 'seebruecke'],
};
/**
 * Integrationshinweise je Slot.
 * eigenesWasser: Slot bringt Wasser mit (Rückgabe erg.wasser = [x0, z0, x1, z1] in Weltkoordinaten).
 * wasserSeite: 'front' = das Wasser liegt an der Front (p.front muss zum Wasser bzw. zur Küste zeigen).
 * wasserAbgesenkt: Wasserspiegel liegt bei wasserHoehe unter Gehweghöhe; unter erg.wasser keinen Gehweg/Boden zeichnen.
 * Gelände aller Slots liegt auf Gehweghöhe (y = 0,3); nichts ragt mehr als randToleranz über den Slot, an der Front
 * (Gehweg) höchstens frontToleranz (Vordächer, Beischläge, Utluchten).
 */
export const NORD_META = Object.fromEntries(Object.keys(NORD_SLOTS).map((k) => [k, {
  eigenesWasser: ['slot:nord_speicher', 'slot:nord_hafen', 'slot:nord_strandpromenade'].includes(k),
  wasserSeite: ['slot:nord_speicher', 'slot:nord_hafen', 'slot:nord_strandpromenade'].includes(k) ? 'front' : null,
  wasserAbgesenkt: ['slot:nord_speicher', 'slot:nord_hafen'].includes(k),
  wasserHoehe: ['slot:nord_speicher', 'slot:nord_hafen'].includes(k) ? YW : k === 'slot:nord_strandpromenade' ? 0.38 : null,
  randToleranz: RAND_TOLERANZ,
  frontToleranz: FRONT_TOLERANZ,
  varianten: NORD_VARIANTEN[k],
}]));
/** Zustände: 'umgenutzt' für slot:nord_speicher, 'ruine' (Kriegsruine als Mahnmal) für slot:nord_kirche. */
export const NORD_ZUSTAENDE = { 'slot:nord_speicher': ['umgenutzt'], 'slot:nord_kirche': ['ruine'] };
// interne Helfer für Folgeabschnitte
export const _intern = { R, wp, fb, fgeo, teil, seiten, kanten, rechteck, einruecken, prisma, huelle, walm, zyl, kegel, stab, balken, fbalken, boden, lochwand, platten, fenster, formen, umrissForm, ftext, fscheibe, achsen, hash, Sammler };

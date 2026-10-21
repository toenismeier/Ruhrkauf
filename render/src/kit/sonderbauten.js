// Sonderbauten der Innenstadt: Einkaufszentrum, Parkhaus, Kirche/Dom, Rathaus, Hauptbahnhof, Bürohochhaus,
// Discounter/Drogerie, Fachmarktzentrum, Konkurrenz-Warenhäuser, Theater/Oper/Museum, Markthalle, Tankstelle, Hotel.
// Alle Funktionen: name(S, scene, { x, z, w, d, seed, ... }) -> { hoehe, teile }
// Sichtbar: +z (links im Bild) und +x (rechts im Bild). Eingänge, Schilder und Uhren sitzen dort.
import { THREE, Sammler, rng, mische, waehle, zw, FARBEN, heller, dunkler, fensterRaster, gesims, markise, baum, schild, textTextur, dachProfil, walmdach } from './basis.js';

const PI = Math.PI;

// =====================================================================================
// Hilfsfunktionen
// =====================================================================================
function zyl(S, rO, rU, h, x, y0, z, farbe, seg = 16, offen = false) {
  const g = new THREE.CylinderGeometry(rO, rU, h, seg, 1, offen);
  g.translate(x, y0 + h / 2, z);
  S.add(g, farbe);
}
function haube(S, r, x, y0, z, farbe, hoehe = 1, seg = 16) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg / 2), 0, 2 * PI, 0, PI / 2);
  g.scale(1, hoehe, 1);
  g.translate(x, y0, z);
  S.add(g, farbe);
}
function drehform(S, profil, x, y0, z, farbe, seg = 12) {
  const g = new THREE.LatheGeometry(profil.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  g.translate(x, y0, z);
  S.add(g, farbe);
}
function spitze(S, r, h, x, y0, z, farbe, seg = 8) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.rotateY(PI / seg);
  g.translate(x, y0 + h / 2, z);
  S.add(g, farbe);
}
function pyramide(S, w, d, h, x, y0, z, farbe) {
  const g = walmdach(w, d, h);
  g.translate(x, y0, z);
  S.add(g, farbe);
}
function satteldach(S, x0, z0, w, d, y, h, farbe, achse = 'x', oben = 0.25) {
  const g = dachProfil(achse === 'x' ? w : d, achse === 'x' ? d : w, h, oben, achse);
  g.translate(x0 + w / 2, y, z0 + d / 2);
  S.add(g, farbe);
}
/** Geometrie mit Normale +z am Ursprung gebaut -> an Fassade setzen. */
function aufSeite(g, seite, u, y, f) {
  if (seite === '+x') { g.rotateY(PI / 2); g.translate(f, y, u); }
  else g.translate(u, y, f);
  return g;
}
/** Extrudierte Form (Koordinaten u = Laufrichtung absolut, v = Höhe) vor einer Fassade, Dicke nach innen. */
function flaeche(S, seite, shape, f, tiefe, farbe) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: tiefe, bevelEnabled: false, curveSegments: 7 });
  if (seite === '+z') g.translate(0, 0, f - tiefe);
  else { g.rotateY(-PI / 2); g.translate(f, 0, 0); }
  S.add(g, farbe);
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
function rechteck(u0, v0, u1, v1) {
  const s = new THREE.Shape();
  s.moveTo(u0, v0); s.lineTo(u1, v0); s.lineTo(u1, v1); s.lineTo(u0, v1); s.lineTo(u0, v0);
  return s;
}
/** Wand mit Öffnungen [{u0,u1,v0,v1,bogen}] – eine Geometrie für eine ganze Fassade. */
function lochwand(S, seite, u0, u1, y0, y1, f, tiefe, farbe, loecher = []) {
  const s = rechteck(u0, y0, u1, y1);
  for (const l of loecher) s.holes.push(oeffnung(new THREE.Path(), l.u0, l.v0, l.u1, l.v1, l.bogen));
  flaeche(S, seite, s, f, tiefe, farbe);
}
/** Flache Form (Bogenfenster, Tür) als Platte auf der Fassade. */
function platte(S, seite, u0, v0, u1, v1, f, farbe, art = null, dicke = 0.15) {
  flaeche(S, seite, oeffnung(new THREE.Shape(), u0, v0, u1, v1, art), f + dicke, dicke, farbe);
}
function rasterLoecher(u0, u1, o) {
  const L = u1 - u0, rand = o.rand ?? 0.6;
  const n = Math.max(1, Math.floor((L - 2 * rand) / o.raster));
  const off = (L - n * o.raster) / 2, out = [];
  for (let k = 0; k < o.geschosse; k++) {
    const v0 = o.y0 + k * o.gh + (o.bruestung ?? (o.gh - o.fh) * 0.55);
    for (let i = 0; i < n; i++) {
      if (o.ohne && o.ohne(i, k, n)) continue;
      const c = u0 + off + o.raster * (i + 0.5);
      out.push({ u0: c - o.fw / 2, u1: c + o.fw / 2, v0, v1: v0 + o.fh, bogen: typeof o.bogen === 'function' ? o.bogen(k) : o.bogen });
    }
  }
  return out;
}
/** Baukörper: dunkler Kern + Lochfassaden auf +z und +x. o wie rasterLoecher, plus tiefe, innen, seiten. */
function lochBlock(S, x0, z0, w, d, y0, y1, farbe, o) {
  const t = o.tiefe ?? 0.5;
  S.quader(x0, y0, z0, x0 + w - t * 0.5, y1, z0 + d - t * 0.5, o.innen ?? FARBEN.fenster);
  for (const seite of o.seiten ?? ['+z', '+x']) {
    const u0 = seite === '+z' ? x0 : z0, L = seite === '+z' ? w : d, f = seite === '+z' ? z0 + d : x0 + w;
    const lo = rasterLoecher(u0, u0 + L, { y0, ...o, ohne: o.ohne ? (i, k, n) => o.ohne(i, k, n, seite) : null });
    lochwand(S, seite, u0, u0 + L, y0, y1, f, t, farbe, lo);
  }
  // Deckel, damit der dunkle Kern oben nicht durchscheint
  S.quader(x0, y1 - 0.05, z0, x0 + w, y1 + 0.02, z0 + d, o.deckel ?? farbe);
}
/** Fensterbänke als Boxen (für historische Fassaden). */
function baenke(S, seite, loecher, f, farbe) {
  for (const l of loecher) {
    const u = (l.u0 + l.u1) / 2, b = l.u1 - l.u0 + 0.35;
    if (seite === '+z') S.box(b, 0.16, 0.3, u, l.v0 - 0.08, f + 0.12, farbe);
    else S.box(0.3, 0.16, b, f + 0.12, l.v0 - 0.08, u, farbe);
  }
}
function uhr(S, seite, u, y, f, rad, o = {}) {
  const z = o.zeiger ?? '#1e2429';
  const teile = [
    [new THREE.CylinderGeometry(rad, rad, 0.3, 22).rotateX(PI / 2).translate(0, 0, 0.15), o.rahmen ?? '#2f3b44'],
    [new THREE.CylinderGeometry(rad * 0.84, rad * 0.84, 0.3, 22).rotateX(PI / 2).translate(0, 0, 0.22), o.blatt ?? '#f7f2e6'],
    [new THREE.BoxGeometry(rad * 0.1, rad * 0.7, 0.1).translate(0, rad * 0.3, 0.42), z],
    [new THREE.BoxGeometry(rad * 0.48, rad * 0.13, 0.1).rotateZ(-0.5).translate(rad * 0.19, rad * 0.1, 0.44), z],
  ];
  for (const [g, c] of teile) S.add(aufSeite(g, seite, u, y, f), c);
}
function rosette(S, seite, u, y, f, rad, stein, glas = '#46596a') {
  S.add(aufSeite(new THREE.CylinderGeometry(rad * 1.12, rad * 1.12, 0.3, 24).rotateX(PI / 2).translate(0, 0, 0.12), seite, u, y, f), heller(stein, 0.05));
  S.add(aufSeite(new THREE.CylinderGeometry(rad, rad, 0.3, 24).rotateX(PI / 2).translate(0, 0, 0.2), seite, u, y, f), glas);
  for (let i = 0; i < 4; i++) S.add(aufSeite(new THREE.BoxGeometry(0.22, rad * 1.95, 0.12).rotateZ((i * PI) / 4).translate(0, 0, 0.38), seite, u, y, f), stein);
  S.add(aufSeite(new THREE.CylinderGeometry(rad * 0.3, rad * 0.3, 0.3, 14).rotateX(PI / 2).translate(0, 0, 0.32), seite, u, y, f), stein);
}
function saeule(S, x, y0, z, h, rad, farbe) {
  zyl(S, rad, rad * 1.08, h - 0.8, x, y0 + 0.4, z, farbe, 10);
  S.box(rad * 2.6, 0.4, rad * 2.6, x, y0 + 0.2, z, farbe);
  S.box(rad * 2.8, 0.42, rad * 2.8, x, y0 + h - 0.21, z, farbe);
}
function kreuz(S, x, y, z, s = 1, farbe = '#d8b45a') {
  S.box(0.25 * s, 2.2 * s, 0.25 * s, x, y + 1.1 * s, z, farbe);
  S.box(0.25 * s, 0.25 * s, 1.2 * s, x, y + 1.45 * s, z, farbe);
  S.box(1.2 * s, 0.25 * s, 0.25 * s, x, y + 1.45 * s, z, farbe);
}
/** Schild mit Höhen- und Breitengrenze. */
function schildPasst(scene, text, seite, u, y, f, hMax, bMax, farbe, bg = null) {
  const { seitenverhaeltnis } = textTextur(text, farbe, 140, bg);
  const h = Math.min(hMax, bMax / seitenverhaeltnis);
  return schild(scene, text, seite, u, y, f, h, farbe, bg);
}
const AUTOFARBEN = ['#f4f3ef', '#2b2f33', '#a3abb2', '#c84a3c', '#2f5f8f', '#d9cfb4', '#3d6b4f', '#e3b23c', '#f4f3ef', '#6b7680'];
/** Auto: Länge 4,4 entlang der Achse (ry = 0: entlang x). */
function auto(S, x, z, ry, farbe, y0 = 0.3) {
  const c = Math.cos(ry), s = Math.sin(ry);
  S.box(4.3, 0.75, 1.8, x, y0 + 0.62, z, farbe, ry);
  S.box(2.3, 0.62, 1.6, x - 0.25 * c, y0 + 1.3, z + 0.25 * s, '#3c4852', ry);
  S.box(2.1, 0.1, 1.62, x - 0.25 * c, y0 + 1.63, z + 0.25 * s, farbe, ry);
}
function bus(S, x, z, ry, farbe, y0 = 0.3) {
  S.box(12, 2.6, 2.5, x, y0 + 1.75, z, farbe, ry);
  S.box(11.4, 1.0, 2.56, x, y0 + 2.2, z, '#3c4852', ry);
  S.box(11, 0.3, 2.2, x, y0 + 3.15, z, heller(farbe, 0.06), ry);
}
function laterne(S, x, z, h = 6, y0 = 0.3) {
  S.box(0.22, h, 0.22, x, y0 + h / 2, z, '#59636b');
  S.box(1.1, 0.25, 0.5, x, y0 + h, z, '#59636b');
}
/**
 * Parkplatz: Reihen entlang x, Stellplätze 2,6 m, Autos quer (entlang z).
 * o: { y, dichte, baeume, belag, laternen }
 */
function parkplatz(S, x0, z0, w, d, r, o = {}) {
  const y = o.y ?? 0.3;
  S.quader(x0, y, z0, x0 + w, y + 0.06, z0 + d, o.belag ?? '#858b92');
  const tiefe = 5, gasse = 6.4, br = 2.6, yt = y + 0.06;
  const reihen = [];
  let zz = z0 + 0.5, modul = 0;
  while (zz + 2 * tiefe + gasse <= z0 + d - 0.3) { reihen.push(zz, zz + tiefe + gasse); zz += 2 * tiefe + gasse; modul++; if (zz + 0.01 < z0 + d) zz += 0; }
  if (zz + tiefe <= z0 + d - 0.3 && reihen.length === 0) reihen.push(zz);
  const n = Math.floor((w - 1) / br), off = (w - n * br) / 2;
  reihen.forEach((rz, ri) => {
    for (let i = 0; i <= n; i++) S.box(0.14, 0.03, tiefe * 0.85, x0 + off + i * br, yt + 0.015, rz + tiefe / 2, FARBEN.markierung);
    for (let i = 0; i < n; i++) {
      if (o.baeume && (i === 0 || i === n - 1) && ri % 2 === 0) continue;
      if (r() < (o.dichte ?? 0.6)) auto(S, x0 + off + (i + 0.5) * br, rz + tiefe / 2 + (r() - 0.5) * 0.3, PI / 2, waehle(r, AUTOFARBEN), yt);
    }
    if (o.baeume && ri % 2 === 0) {
      for (const i of [0, n - 1]) {
        S.box(br, 0.25, tiefe * 2 - 0.4, x0 + off + (i + 0.5) * br, yt + 0.12, rz + tiefe, FARBEN.rasen);
        baum(S, x0 + off + (i + 0.5) * br, rz + tiefe, r, 0.8);
      }
    }
  });
  if (o.laternen !== false) for (let k = 0; k < reihen.length; k += 2) {
    const lz = reihen[k] + tiefe;
    for (let lx = x0 + 10; lx < x0 + w - 5; lx += 22) laterne(S, lx, lz, 6, yt);
  }
}
function belag(S, x0, z0, x1, z1, farbe, y = 0.3, h = 0.06) { S.quader(x0, y, z0, x1, y + h, z1, farbe); }

// =====================================================================================
// 1. Einkaufszentrum
// =====================================================================================
const MIETER = [
  ['Bijou', '#b0457a'], ['Café Mokka', '#6b4a33'], ['Schuhwerk', '#2f3b44'], ['Elektro Funke', '#2b5fa8'], ['Buchinsel', '#3f7d56'],
  ['Spielkiste', '#d39a2b'], ['Optik Klarsicht', '#1f7a8c'], ['Brillo', '#8c3b3b'], ['Frischmarkt', '#4f8a3c'], ['Tee & Co', '#7a5a2e'],
  ['Kinowelt', '#232a31'], ['Juwelier Haas', '#6b4f8f'],
];
export function einkaufszentrum(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const w = p.w ?? 76, d = p.d ?? 58;
  const variante = p.variante ?? waehle(r, ['rotunde', 'portal']);
  const G = p.geschosse ?? 3, eg = 6, gh = 5, H = eg + (G - 1) * gh;
  const name = p.name ?? waehle(r, ['Stadtgalerie', 'Löwen-Arkaden', 'Forum am Markt', 'Brückenpassage', 'City-Center']);
  const haut = p.farbe ?? waehle(r, ['#ebe6dc', '#e1e5e8', '#e9dfcf']);
  const akzent = p.akzent ?? waehle(r, ['#c98a3a', '#4f7fa8', '#6f8f4f', '#a8574a', '#5b6f86']);
  const glas = '#8fb2c4';
  const mieter = mische(r, MIETER);
  let mi = 0;
  const R = 10, ecke = 2 * R - 2;
  // Körper (bei Rotunde L-Form, damit die Ecke frei bleibt)
  const koerper = variante === 'rotunde'
    ? [[x, z, w - ecke, d], [x + w - ecke, z, ecke, d - ecke]]
    : [[x, z, w, d]];
  for (const [bx, bz, bw, bd] of koerper) {
    // EG zurückgesetzt, dunkle Schaufensterzone
    S.quader(bx, 0, bz, bx + bw - 1.2, eg, bz + bd - 1.2, '#4b5965');
    // Obergeschosse als geschlossene Hülle
    S.quader(bx, eg, bz, bx + bw, H, bz + bd, haut);
    // Fugenbänder
    for (let k = 1; k < G; k++) S.quader(bx - 0.1, eg + k * gh - 0.25, bz - 0.1, bx + bw + 0.1, eg + k * gh, bz + bd + 0.1, dunkler(haut, 0.06));
    S.quader(bx - 0.15, H - 2.2, bz - 0.15, bx + bw + 0.15, H + 0.4, bz + bd + 0.15, akzent);
    S.quader(bx + 0.5, H + 0.4, bz + 0.5, bx + bw - 0.5, H + 0.5, bz + bd - 0.5, '#b9bec2');
    // Pfeiler im EG + Vordach
    for (const seite of ['+z', '+x']) {
      const u0 = seite === '+z' ? bx : bz, L = seite === '+z' ? bw : bd;
      const n = Math.max(1, Math.round(L / 7.5));
      for (let i = 0; i <= n; i++) {
        const u = u0 + 0.4 + (i * (L - 0.8)) / n;
        if (seite === '+z') S.box(0.8, eg, 0.8, u, eg / 2, bz + bd - 0.4, haut);
        else S.box(0.8, eg, 0.8, bx + bw - 0.4, eg / 2, u, haut);
      }
      if (seite === '+z') S.quader(bx, eg - 0.7, bz + bd - 1, bx + bw, eg - 0.3, bz + bd + 2.2, '#f4f2ee');
      else S.quader(bx + bw - 1, eg - 0.7, bz, bx + bw + 2.2, eg - 0.3, bz + bd, '#f4f2ee');
      // Fensterbänder in den OG
      for (let k = 1; k < G; k++) {
        const y0 = eg + (k - 1) * gh + 1.3, y1 = y0 + 2.2;
        const fl = Math.min(L - 6, L * 0.55), fu = u0 + (L - fl) * (seite === '+z' ? 0.25 : 0.75);
        if (seite === '+z') S.quader(fu, y0, bz + bd, fu + fl, y1, bz + bd + 0.12, glas);
        else S.quader(bx + bw, y0, fu, bx + bw + 0.12, y1, fu + fl, glas);
      }
      // Mieterschilder
      const ns = Math.max(1, Math.floor(L / 16));
      for (let i = 0; i < ns; i++) {
        const [t, c] = mieter[mi++ % mieter.length];
        const u = u0 + ((i + 0.5) * L) / ns;
        const f = seite === '+z' ? bz + bd : bx + bw;
        schildPasst(scene, t, seite, u, eg + 1.5, f - 0.1, 1.5, L / ns - 3, '#ffffff', c);
      }
    }
  }
  // Glasdach/Atrium als Mall-Achse entlang x
  const az0 = z + d * 0.5 - 6, aw = w * (variante === 'rotunde' ? 0.62 : 0.78), ax0 = x + 5;
  const Hd = H + 0.5;
  S.quader(ax0 - 0.5, Hd, az0 - 0.5, ax0 + aw + 0.5, Hd + 1.2, az0 + 12.5, haut);
  satteldach(S, ax0, az0, aw, 12, Hd + 1.2, 4, glas, 'x', 0.8);
  for (let u = ax0 + 1; u <= ax0 + aw - 0.5; u += 3.2) {
    const g = dachProfil(0.22, 12.25, 4.08, 0.8, 'x'); g.translate(u, Hd + 1.18, az0 + 6); S.add(g, '#f4f4f2');
  }
  S.box(aw + 0.4, 0.25, 1.0, ax0 + aw / 2, Hd + 5.3, az0 + 6, '#f4f4f2');
  // Parkdeck auf dem hinteren Dachteil
  const pz0 = z + 1, pz1 = az0 - 2.5;
  if (p.parkdeck !== false && pz1 - pz0 > 12) {
    const px1 = x + w - (variante === 'rotunde' ? 2 : 2);
    parkplatz(S, x + 1.5, pz0, px1 - x - 1.5, pz1 - pz0, r, { y: Hd, dichte: 0.55, laternen: true });
    S.quader(x + 1, Hd, pz1, px1, Hd + 1.1, pz1 + 0.4, '#d9d6cf');
    // Rampenhaus mit Einfahrt
    S.quader(x + 2, Hd, pz0 + 1, x + 14, Hd + 3.8, pz0 + 8, '#cfcac0');
    S.quader(x + 3, Hd + 0.05, pz0 + 8, x + 13, Hd + 2.6, pz0 + 8.1, '#3a434b');
    schild(scene, 'P', '+x', pz0 + 4.5, Hd + 2.4, x + 14, 2.2, '#ffffff', '#2a62b8');
  }
  // Eingang
  if (variante === 'rotunde') {
    const cx = x + w - R + 1.5, cz = z + d - R + 1.5;
    zyl(S, R, R, H + 2, cx, 0, cz, glas, 28);
    for (let k = 1; k <= G; k++) zyl(S, R + 0.25, R + 0.25, 0.45, cx, eg + (k - 1) * gh - 0.4, cz, '#f4f2ee', 28);
    zyl(S, R + 1.6, R + 1.6, 1.2, cx, H + 2, cz, akzent, 28);
    haube(S, R - 0.5, cx, H + 3.2, cz, glas, 0.55, 20);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI;
      const g = new THREE.TorusGeometry(R - 0.45, 0.14, 3, 12, PI); g.scale(1, 0.55, 1); g.rotateY(a); g.translate(cx, H + 3.2, cz); S.add(g, '#f4f4f2');
    }
    zyl(S, R + 3.5, R + 3.5, 0.45, cx, eg - 0.6, cz, '#f4f2ee', 28);
    schildPasst(scene, name, '+z', x + (w - ecke) / 2, H - 0.9, z + d - 0.05, 2.0, w - ecke - 6, '#ffffff', null);
    schildPasst(scene, name, '+x', z + (d - ecke) / 2, H - 0.9, x + w - 0.05, 2.0, d - ecke - 6, '#ffffff', null);
  } else {
    const pb = 18, pu = x + w * 0.55;
    S.quader(pu - pb / 2, 0, z + d - 2, pu + pb / 2, H + 5, z + d + 1.5, akzent);
    S.quader(pu - pb / 2 + 2, 0, z + d - 1.8, pu + pb / 2 - 2, H + 1.5, z + d + 1.6, glas);
    for (let u = pu - pb / 2 + 4.5; u < pu + pb / 2 - 2; u += 2.8) S.box(0.25, H + 1.5, 0.3, u, (H + 1.5) / 2, z + d + 1.6, '#f4f4f2');
    for (let k = 1; k <= G; k++) S.box(pb - 4, 0.3, 0.3, pu, eg + (k - 1) * gh - 0.4, z + d + 1.62, '#f4f4f2');
    S.quader(pu - pb / 2 - 2, eg - 0.8, z + d, pu + pb / 2 + 2, eg - 0.2, z + d + 5, '#f4f2ee');
    schildPasst(scene, name, '+z', pu, H + 3.3, z + d + 1.5, 2.4, pb - 1, '#ffffff', null);
    schildPasst(scene, name, '+x', z + d * 0.45, H - 0.9, x + w - 0.05, 2.0, d - 12, '#ffffff', null);
  }
  // Bäume und Fahnen am Vorplatz
  for (let u = x + 6; u < x + w - 24; u += 11) baum(S, u, z + d + 4.5, r, 0.9);
  return { hoehe: H + 6, teile: S.anzahl };
}

// =====================================================================================
// 2. Parkhaus
// =====================================================================================
export function parkhaus(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const w = p.w ?? 34, d = p.d ?? 42;
  const variante = p.variante ?? waehle(r, ['offen', 'lamellen', 'spirale']);
  const G = p.geschosse ?? 5, gh = 3.0;
  const beton = p.farbe ?? waehle(r, ['#d4d0c7', '#cbc7bf', '#d9d4ca']);
  const brF = variante === 'offen' ? waehle(r, ['#e9e6df', '#e3c46a', '#7fb0c9', '#e2e4e6']) : '#e6e3dc';
  const lamF = waehle(r, ['#b9925f', '#9aa7b0', '#7d8a72']);
  // Spirale braucht eine Ecke
  const sp = variante === 'spirale' ? 15 : 0;
  const mx1 = x + w - sp;
  const H = G * gh;
  // Innenkern (dunkel), Fahrgassen sichtbar über einen 5,5 m tiefen Randstreifen
  S.quader(x, 0, z, mx1 - 5.5, H, z + d - 5.5, '#5d666e');
  for (let e = 0; e <= G; e++) {
    const yb = e * gh;
    if (e > 0) S.quader(x, yb - 0.4, z, mx1, yb, z + d, beton);
    if (e === G) break;
    // Fahrbahnboden der Ebene (hell)
    S.quader(x, yb, z, mx1, yb + 0.05, z + d, '#9aa0a6');
    // Brüstungen
    const b0 = yb + (e === 0 ? 0 : 0), b1 = yb + 1.15;
    if (e > 0 || variante !== 'offen') {
      S.quader(x, b0, z + d - 0.3, mx1, b1, z + d, brF);
      S.quader(mx1 - 0.3, b0, z, mx1, b1, z + d, brF);
    }
    // Stützen
    for (let u = x + 0.3; u < mx1; u += 7.5) S.box(0.5, gh - 0.4, 0.5, u + 0.25, yb + (gh - 0.4) / 2, z + d - 0.25, beton);
    for (let u = z + 0.3; u < z + d; u += 7.5) S.box(0.5, gh - 0.4, 0.5, mx1 - 0.25, yb + (gh - 0.4) / 2, u + 0.25, beton);
    // Autos am Rand
    for (let u = x + 1.8; u < mx1 - 6; u += 2.6) if (r() < 0.62) auto(S, u, z + d - 3.1, PI / 2, waehle(r, AUTOFARBEN), yb + 0.05);
    for (let u = z + 1.8; u < z + d - 6; u += 2.6) if (r() < 0.62) auto(S, mx1 - 3.1, u, 0, waehle(r, AUTOFARBEN), yb + 0.05);
  }
  // Oberdeck: Markierungen, Autos, Laternen
  const yd = H;
  S.quader(x, yd, z + d - 0.3, mx1, yd + 1.1, z + d, brF);
  S.quader(mx1 - 0.3, yd, z, mx1, yd + 1.1, z + d, brF);
  parkplatz(S, x + 1, z + 1, mx1 - x - 9, d - 2, r, { y: yd, dichte: 0.4, belag: '#8d939a' });
  // Rampe auf dem Oberdeck (bei offen/lamellen)
  if (variante !== 'spirale') {
    const g = new THREE.BoxGeometry(5, 0.4, 20); g.rotateX(-0.14); g.translate(mx1 - 4.5, yd - 1.2, z + d * 0.45); S.add(g, beton);
    S.quader(mx1 - 7.2, yd, z + d * 0.45 - 10, mx1 - 6.9, yd + 1.0, z + d * 0.45 + 10, brF);
  }
  // Lamellen vor der Fassade
  if (variante === 'lamellen') {
    for (let u = x + 0.6; u < mx1 - 0.2; u += 0.9) S.box(0.18, H - 0.6, 0.5, u, 0.3 + (H - 0.6) / 2 + 0.6, z + d + 0.3, lamF);
    for (let u = z + 0.6; u < z + d - 0.2; u += 0.9) S.box(0.5, H - 0.6, 0.18, mx1 + 0.3, 0.3 + (H - 0.6) / 2 + 0.6, u, lamF);
    S.quader(x, H - 0.4, z + d, mx1 + 0.6, H + 0.4, z + d + 0.6, beton);
    S.quader(mx1, H - 0.4, z, mx1 + 0.6, H + 0.4, z + d + 0.6, beton);
  }
  // Treppenhaus mit P-Schild
  const tx0 = mx1 - 6, tz0 = z + 2;
  S.quader(tx0, 0, tz0, mx1 + (variante === 'lamellen' ? 0.6 : 0), H + 4, tz0 + 6, '#3f6f9a');
  S.quader(mx1 + (variante === 'lamellen' ? 0.6 : 0), 1, tz0 + 1.5, mx1 + (variante === 'lamellen' ? 0.75 : 0.15), H + 3, tz0 + 4.5, '#8fb2c4');
  schild(scene, 'P', '+x', tz0 + 3, H + 6.5, mx1 + 0.2, 4, '#ffffff', '#2a62b8');
  S.quader(tx0 + 1, H + 4, tz0 + 1, mx1 - 0.5, H + 8.6, tz0 + 5, '#2a62b8');
  // Einfahrt
  const ez = z + d * 0.62;
  S.quader(mx1 - 0.1, 0.3, ez - 3.5, mx1 + 0.2, 2.6, ez + 3.5, '#2b3237');
  schildPasst(scene, 'Einfahrt', '+x', ez, 3.3, mx1 + (variante === 'lamellen' ? 0.6 : 0), 0.9, 7, '#ffffff', '#2a62b8');
  // Spiralrampe
  if (variante === 'spirale') {
    const cx = x + w - 7.5, cz = z + d - 7.5;
    zyl(S, 2.2, 2.2, H + 1.5, cx, 0, cz, beton, 14);
    zyl(S, 6.7, 6.7, H, cx, 0, cz, '#5d666e', 24);
    const n = G * 2;
    for (let i = 1; i <= n; i++) {
      const y = (i * H) / n;
      const g = new THREE.CylinderGeometry(7, 7, 0.35, 28); g.rotateX(0.07 * (i % 2 ? 1 : -1)); g.rotateZ(0.07); g.translate(cx, y, cz); S.add(g, dunkler(beton, 0.06));
      const b = new THREE.CylinderGeometry(7.1, 7.1, 0.9, 28, 1, true); b.rotateX(0.07 * (i % 2 ? 1 : -1)); b.rotateZ(0.07); b.translate(cx, y + 0.55, cz); S.add(b, brF);
    }
    schild(scene, 'P', '+z', cx, H + 4, cz + 2.2, 3, '#ffffff', '#2a62b8');
    zyl(S, 0.3, 0.3, 4, cx, H + 1.5, cz, '#59636b', 6);
    // Kassenhäuschen und Bäume in der freien Ecke
    S.quader(x + w - 9, 0, z + 4, x + w - 4, 3, z + 8, '#e9e6df');
    baum(S, x + w - 6, z + 14, r, 0.9); baum(S, x + w - 4, z + 20, r, 0.8);
  }
  return { hoehe: H + 8.6, teile: S.anzahl };
}

// =====================================================================================
// 3. Kirchen: acht Familien über `stil`, Variation über seed, Auswahl über `region`
// =====================================================================================
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function sbox(S, seite, u0, u1, y0, y1, f0, f1, farbe) {
  if (seite === '+z') S.quader(u0, y0, f0, u1, y1, f1, farbe); else S.quader(f0, y0, u0, f1, y1, u1, farbe);
}
function volutenForm(u0, u1, y, h) {
  const s = new THREE.Shape(), b = u1 - u0, um = (u0 + u1) / 2, q = b * 0.2;
  s.moveTo(u0, y); s.lineTo(u1, y);
  s.quadraticCurveTo(u1 - b * 0.02, y + h * 0.5, um + q, y + h * 0.52);
  s.lineTo(um + q, y + h * 0.8); s.lineTo(um, y + h); s.lineTo(um - q, y + h * 0.8); s.lineTo(um - q, y + h * 0.52);
  s.quadraticCurveTo(u0 + b * 0.02, y + h * 0.5, u0, y);
  return s;
}
/** Giebel an einer sichtbaren Seite: 'glatt' | 'treppe' | 'volute'; o.blenden für Backstein-Blendnischen. */
function giebel(S, seite, u0, u1, y, h, f, farbe, art = 'glatt', o = {}) {
  const um = (u0 + u1) / 2;
  if (art === 'treppe') {
    const n = o.stufen ?? 5;
    for (let i = 0; i < n; i++) {
      const b = (u1 - u0) * (1 - i / n), y0 = y + (i * h) / n, y1 = y0 + h / n + 0.7;
      sbox(S, seite, um - b / 2, um + b / 2, y0, y1, f - 0.8, f + 0.1, farbe);
      sbox(S, seite, um - b / 2, um - b / 2 + 0.6, y1, y1 + 0.9, f - 0.7, f + 0.12, o.hell ?? farbe);
      sbox(S, seite, um + b / 2 - 0.6, um + b / 2, y1, y1 + 0.9, f - 0.7, f + 0.12, o.hell ?? farbe);
    }
  } else if (art === 'volute') {
    flaeche(S, seite, volutenForm(u0, u1, y, h), f + 0.1, 0.8, farbe);
    sbox(S, seite, u0 - 0.2, u1 + 0.2, y - 0.25, y + 0.25, f - 0.6, f + 0.3, o.hell ?? farbe);
    sbox(S, seite, um - (u1 - u0) * 0.22, um + (u1 - u0) * 0.22, y + h * 0.5, y + h * 0.56, f - 0.6, f + 0.3, o.hell ?? farbe);
  } else {
    const s = new THREE.Shape(); s.moveTo(u0, y); s.lineTo(u1, y); s.lineTo(um, y + h); s.lineTo(u0, y);
    flaeche(S, seite, s, f + 0.05, 0.6, farbe);
  }
  if (o.blenden) {
    const n = 5, bb = (u1 - u0) / (n + 1);
    for (let k = 0; k < n; k++) {
      const uc = u0 + (k + 1) * bb, hk = h * (1 - Math.abs(uc - um) / ((u1 - u0) / 2)) * 0.82;
      if (hk < bb * 0.9 + 0.8) continue;
      platte(S, seite, uc - bb * 0.28, y + 0.6, uc + bb * 0.28, y + 0.4 + hk, f + 0.12, o.blendF ?? '#ece6da', 'spitz', 0.08);
    }
  }
}
function kugelFahne(S, x, y, z, s = 1) {
  S.add(new THREE.SphereGeometry(0.45 * s, 8, 6).translate(x, y + 0.5 * s, z), '#d8b45a');
  S.box(0.12 * s, 2.4 * s, 0.12 * s, x, y + 1.6 * s, z, '#3a3f44');
  S.box(0.06, 0.8 * s, 1.3 * s, x, y + 2.3 * s, z + 0.7 * s, '#c9483e');
}
function turmHelm(S, art, cx, y, cz, t, farbe, stein, abschluss = 'kreuz') {
  const kreuzOderKugel = abschluss === 'kugel' ? kugelFahne : kreuz;
  const a = t * 0.5;
  switch (art) {
    case 'zwiebel':
      drehform(S, [[0, 0], [a * 1.05, 0], [a * 1.05, 0.6], [a * 1.15, 1.6], [a * 1.0, 3.2], [a * 0.55, 4.6], [a * 0.26, 5.4], [a * 0.22, 5.8], [0, 5.8]], cx, y, cz, farbe, 12);
      zyl(S, a * 0.32, a * 0.32, 2.4, cx, y + 5.8, cz, stein, 8);
      drehform(S, [[0, 0], [a * 0.42, 0], [a * 0.48, 0.6], [a * 0.3, 1.5], [a * 0.06, 2.2], [0, 2.4]], cx, y + 8.2, cz, farbe, 10);
      spitze(S, 0.18, 2.2, cx, y + 10.5, cz, farbe, 6);
      kreuzOderKugel(S, cx, y + 12.3, cz, 0.8);
      return y + 14;
    case 'welsch':
      drehform(S, [[0, 0], [a * 1.1, 0], [a * 1.05, 0.9], [a * 0.62, 2.8], [a * 0.3, 3.7], [0, 3.8]], cx, y, cz, farbe, 12);
      zyl(S, a * 0.34, a * 0.34, 2.8, cx, y + 3.6, cz, stein, 8);
      drehform(S, [[0, 0], [a * 0.5, 0], [a * 0.42, 0.9], [a * 0.15, 1.9], [0, 2.1]], cx, y + 6.4, cz, farbe, 10);
      spitze(S, 0.15, 2.4, cx, y + 8.4, cz, farbe, 6);
      kreuzOderKugel(S, cx, y + 10.6, cz, 0.7);
      return y + 12.5;
    case 'pyramide':
      pyramide(S, t + 0.8, t + 0.8, t * 1.2, cx, y, cz, farbe);
      spitze(S, t * 0.2, t * 1.4, cx, y + t * 1.1, cz, farbe, 8);
      kreuzOderKugel(S, cx, y + t * 2.45, cz, 0.8);
      return y + t * 2.45 + 2;
    case 'pyramideFlach':
      pyramide(S, t + 0.8, t + 0.8, t * 0.75, cx, y, cz, farbe);
      kreuzOderKugel(S, cx, y + t * 0.72, cz, 0.7);
      return y + t * 0.75 + 2;
    case 'sattel': {
      const h = t * 1.0;
      satteldach(S, cx - t / 2 - 0.3, cz - t / 2 - 0.3, t + 0.6, t + 0.6, y, h, farbe, 'x', 0);
      const s = new THREE.Shape(); s.moveTo(cz - t / 2, y); s.lineTo(cz + t / 2, y); s.lineTo(cz, y + h - 0.35); s.lineTo(cz - t / 2, y);
      flaeche(S, '+x', s, cx + t / 2 + 0.45, 0.6, stein);
      platte(S, '+x', cz - 0.5, y + 0.6, cz + 0.5, y + h * 0.55, cx + t / 2 + 0.45, '#3f4c58', true, 0.08);
      kreuzOderKugel(S, cx + t / 2, y + h - 0.4, cz, 0.6);
      return y + h + 1.5;
    }
    case 'kuppel':
      zyl(S, a * 0.85, a * 0.85, a * 0.8, cx, y, cz, stein, 12);
      haube(S, a * 0.9, cx, y + a * 0.8, cz, farbe, 1.0, 14);
      zyl(S, a * 0.22, a * 0.22, 1.6, cx, y + a * 1.65, cz, stein, 8);
      kreuzOderKugel(S, cx, y + a * 1.65 + 1.6, cz, 0.6);
      return y + a * 1.65 + 3.8;
    case 'flach':
      S.box(t + 0.6, 0.5, t + 0.6, cx, y + 0.25, cz, stein);
      kreuzOderKugel(S, cx, y + 0.5, cz, 1.4, '#e9e7e2');
      return y + 3.6;
    case 'spitzhoch': {
      const h = t * 3.5;
      spitze(S, t * 0.6, h, cx, y, cz, farbe, 8);
      for (const [dx, dz] of [[1, 0], [0, 1]]) {
        const g = dachProfil(1.4, 1.8, 1.4, 0, dx ? 'x' : 'z'); g.translate(cx + dx * t * 0.42, y + h * 0.18, cz + dz * t * 0.42); S.add(g, farbe);
      }
      S.add(new THREE.SphereGeometry(0.5, 8, 6).translate(cx, y + h, cz), '#d8b45a');
      kreuzOderKugel(S, cx, y + h + 0.3, cz, 0.8);
      return y + h + 2.5;
    }
    default: {
      const h = t * 2.8;
      spitze(S, t * 0.6, h, cx, y, cz, farbe, 8);
      for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        S.box(1.1, 1.6, 1.1, cx + dx * (t / 2 - 0.55), y + 0.8, cz + dz * (t / 2 - 0.55), stein);
        spitze(S, 0.7, 3.4, cx + dx * (t / 2 - 0.55), y + 1.6, cz + dz * (t / 2 - 0.55), farbe, 6);
      }
      kreuzOderKugel(S, cx, y + h - 0.3, cz, 0.9);
      return y + h + 2;
    }
  }
}
function turm(S, x0, z0, t, Ht, stein, o = {}) {
  const sH = o.hell ?? heller(stein, 0.04);
  S.quader(x0, 0, z0, x0 + t, Ht, z0 + t, stein);
  if (o.lisenen !== false) {
    S.quader(x0 + t - 0.9, 0, z0 + t - 0.9, x0 + t + 0.3, Ht, z0 + t + 0.3, sH);
    S.quader(x0 + t - 0.9, 0, z0 - 0.3, x0 + t + 0.3, Ht, z0 + 0.9, sH);
    S.quader(x0 - 0.3, 0, z0 + t - 0.9, x0 + 0.9, Ht, z0 + t + 0.3, sH);
  }
  const stufen = o.stufen ?? [0.3, 0.58, 0.82];
  for (const s of stufen) gesims(S, x0, z0, t, t, Ht * s, 0.45, 0.35, sH);
  gesims(S, x0, z0, t, t, Ht - 0.3, 0.7, 0.5, sH);
  const glas = '#3f4c58', bog = o.bogen ?? true;
  for (const seite of ['+z', '+x']) {
    const f = seite === '+z' ? z0 + t : x0 + t, u0 = seite === '+z' ? x0 : z0, uc = u0 + t / 2;
    const b = t * 0.18, y0 = Ht * 0.84, y1 = Ht - 1.3;
    if (o.schall === 'breit') platte(S, seite, uc - b * 1.5, y0, uc + b * 1.5, y1, f, glas, bog);
    else { platte(S, seite, uc - b * 1.25, y0, uc - b * 0.25, y1, f, glas, bog); platte(S, seite, uc + b * 0.25, y0, uc + b * 1.25, y1, f, glas, bog); }
    if (o.romanisch) {
      for (const yy of [Ht * 0.62, Ht * 0.43]) { platte(S, seite, uc - b * 1.1, yy, uc - b * 0.2, yy + Ht * 0.1, f, glas, true); platte(S, seite, uc + b * 0.2, yy, uc + b * 1.1, yy + Ht * 0.1, f, glas, true); }
    } else platte(S, seite, uc - 0.6, Ht * 0.4, uc + 0.6, Ht * 0.52, f, glas, bog);
    if (o.blenden) for (const s of [-1, 1]) platte(S, seite, uc + s * t * 0.3 - t * 0.08, Ht * 0.32, uc + s * t * 0.3 + t * 0.08, Ht * 0.56, f, o.blendF ?? '#ece6da', 'spitz', 0.08);
    if (o.uhr !== false) uhr(S, seite, uc, Ht * 0.7, f, Math.min(t * 0.26, 2.6));
  }
  if (o.portal) platte(S, '+x', z0 + t / 2 - Math.min(1.8, t * 0.2), 0.3, z0 + t / 2 + Math.min(1.8, t * 0.2), Math.min(6.5, Ht * 0.18), x0 + t, '#4a3a2e', bog, 0.2);
}
function halbrund(S, xc, cz, rad, h, farbe, seg, y0 = 0) {
  const g = new THREE.CylinderGeometry(rad, rad, h, seg, 1, false, PI, PI); g.translate(xc, y0 + h / 2, cz); S.add(g, farbe);
}
function halbkegel(S, xc, cz, rad, h, y0, farbe, seg) {
  const g = new THREE.ConeGeometry(rad, h, seg, 1, false, PI, PI); g.translate(xc, y0 + h / 2, cz); S.add(g, farbe);
}

/** Universeller Langhausbau: Basilika, Halle oder Saal mit Türmen, Querhaus, Chor. */
function langhausKirche(S, scene, p, c) {
  const { x, z } = p, w = p.w, d = p.d;
  const st = c.stein, sH = c.hell, glas = c.glas ?? '#435666', dach = c.dach, bog = c.bogen;
  let tB = 0;
  if (c.turm === 'west' || c.turm === 'seitlich') tB = clamp(d * 0.45, 5, c.turmMax ?? 11);
  if (c.turm === 'doppel') tB = clamp(d * 0.32, 4.5, 10);
  const tT = c.turm === 'west' || c.turm === 'doppel' ? tB : 0;
  let zA = z + 0.8, zB = z + d - 0.8;
  if (c.turm === 'seitlich') zB = z + d - tB * 0.6;
  const cz = (zA + zB) / 2, band = zB - zA;
  const nb = c.schiff === 'halle' ? band : c.schiff === 'saal' ? Math.min(band, Math.max(6, band * (c.saalB ?? 0.72))) : Math.max(6, band * 0.44);
  const sb = c.schiff === 'basilika' ? (band - nb) / 2 : 0;
  const nz0 = cz - nb / 2, nz1 = cz + nb / 2, az0 = nz0 - sb, az1 = nz1 + sb;
  const rc = c.chor === 'gerade' ? 0 : nb * 0.45;
  const nx0 = x + rc + 0.3, fx = x + w - tT, nx1 = fx + (tT ? 0.4 : 0);
  const L = nx1 - nx0;
  const Hn = c.Hn, Hs = c.schiff === 'basilika' ? c.Hs : Hn;
  const dachH = nb * (c.dachH ?? 0.8);
  const quer = c.quer && c.schiff !== 'halle' && L > 22;
  const qb = Math.min(nb + 1, L * 0.24), qx0 = nx0 + L * 0.14, qx1 = qx0 + qb;
  const inQ = (u) => quer && u > qx0 - 1.2 && u < qx1 + 1.2;
  const nJ = Math.max(2, Math.round(L / (c.joch ?? 5.6))), jb = L / nJ;
  const fw = Math.min(c.fensterB ?? 2.4, jb * 0.45);
  const fenster = (y0, y1) => {
    const lo = [];
    if (y1 - y0 < fw * 1.2) return lo;
    for (let i = 0; i < nJ; i++) { const u = nx0 + (i + 0.5) * jb; if (inQ(u) || u > nx1 - 1.2) continue; lo.push({ u0: u - fw / 2, u1: u + fw / 2, v0: y0, v1: y1, bogen: bog }); }
    return lo;
  };
  // Außenwand (Seitenschiff oder Halle/Saal)
  S.quader(nx0, 0, az0, nx1, Hs, az1 - 0.3, '#46525d');
  lochwand(S, '+z', nx0, nx1, -0.3, Hs, az1, 0.6, st, fenster(Hs * (c.fu ?? 0.22), Hs - (c.fo ?? Math.max(1.6, Hs * 0.14))));
  gesims(S, nx0, az0, L, az1 - az0, Hs, 0.45, 0.3, sH);
  for (let i = 0; i <= nJ; i++) {
    const u = nx0 + i * jb;
    if (inQ(u) || u > nx1 - 0.5) continue;
    if (c.strebe) { S.box(1.0, Hs * 0.78, 1.3, u, Hs * 0.39, az1 + 0.6, sH); S.box(0.8, 1.8, 0.8, u, Hs * 0.78 + 0.9, az1 + 0.4, sH); }
    else if (c.lisenen) S.box(0.7, Hs, 0.3, u, Hs / 2, az1 + 0.12, sH);
  }
  if (c.schiff === 'basilika') {
    const ang = Math.atan((c.pult ?? 3.5) / sb), hyp = Math.hypot(sb, c.pult ?? 3.5) + 1;
    for (const s of [1, -1]) { const g = new THREE.BoxGeometry(L, 0.45, hyp); g.rotateX(ang * s); g.translate(nx0 + L / 2, Hs + (c.pult ?? 3.5) / 2 + 0.2, cz + s * (nb / 2 + sb / 2)); S.add(g, dach); }
    S.quader(nx0, Hs, nz0, nx1, Hn, nz1 - 0.3, '#46525d');
    lochwand(S, '+z', nx0, nx1, Hs, Hn, nz1, 0.5, st, fenster(Hs + (c.pult ?? 3.5) + 0.8, Hn - 1.2));
    gesims(S, nx0, nz0, L, nb, Hn, 0.5, 0.35, sH);
    if (c.strebe) for (let i = 0; i <= nJ; i++) {
      const u = nx0 + i * jb; if (inQ(u) || u > nx1 - 0.5) continue;
      const g = new THREE.BoxGeometry(0.7, 0.7, sb + 1.2); g.rotateX(-0.6); g.translate(u, Hs + (Hn - Hs) * 0.45, nz1 + sb / 2 + 0.3); S.add(g, sH);
    }
  }
  satteldach(S, nx0 - 0.3, nz0 - 0.8, L + (tT ? 0 : 0.6), nb + 1.6, Hn, dachH, dach, 'x', 0.2);
  // Front (+x)
  S.quader(nx1 - 0.6, 0, az0, nx1 + 0.06, Hs, az1, st);
  if (c.schiff === 'basilika') S.quader(nx1 - 0.6, Hs, nz0, nx1 + 0.06, Hn, nz1, st);
  if (c.turm === 'doppel') {
    const fz0 = zA + tB, fz1 = zB - tB, fH = Hn + (c.giebel === 'volute' ? 1 : 0);
    S.quader(fx - 0.5, 0, fz0, x + w - 0.6, fH, fz1, st);
    const gh = c.giebel === 'volute' ? (fz1 - fz0) * 0.75 : Math.min(dachH, (fz1 - fz0) * 0.7);
    giebel(S, '+x', fz0 + 0.1, fz1 - 0.1, fH, gh, x + w - 0.6, st, c.giebel, { hell: sH, blenden: c.blenden, blendF: c.blendF });
    platte(S, '+x', cz - Math.min(2, (fz1 - fz0) * 0.22), 0.3, cz + Math.min(2, (fz1 - fz0) * 0.22), Math.min(7, Hn * 0.38), x + w - 0.6, '#4a3a2e', bog, 0.25);
    if (c.rose) rosette(S, '+x', cz, Hn * 0.66, x + w - 0.6, Math.min((fz1 - fz0) * 0.32, 4), sH, glas);
    else platte(S, '+x', cz - 1.1, Hn * 0.5, cz + 1.1, Hn * 0.85, x + w - 0.6, glas, bog);
    if (c.giebel === 'volute') uhr(S, '+x', cz, fH + gh * 0.68, x + w - 0.5, 1.2);
  } else if (c.turm !== 'west') {
    giebel(S, '+x', nz0 - 0.4, nz1 + 0.4, Hn, c.giebel === 'volute' ? nb * 0.8 : dachH, nx1 + 0.3, st, c.giebel, { hell: sH, blenden: c.blenden, blendF: c.blendF });
    platte(S, '+x', cz - Math.min(1.8, nb * 0.15), 0.3, cz + Math.min(1.8, nb * 0.15), Math.min(6, Hn * 0.4), nx1, '#4a3a2e', bog, 0.25);
    if (c.rose) rosette(S, '+x', cz, Hn * 0.68, nx1, Math.min(nb * 0.22, 3.6), sH, glas);
    else if (c.rundfenster) { S.add(aufSeite(new THREE.CylinderGeometry(nb * 0.12, nb * 0.12, 0.3, 16).rotateX(PI / 2), '+x', cz, Hn * 0.72, nx1 + 0.15), glas); }
    else platte(S, '+x', cz - 1.0, Hn * 0.5, cz + 1.0, Hn * 0.86, nx1, glas, bog);
  } else {
    giebel(S, '+x', nz0 - 0.4, nz1 + 0.4, Hn, dachH, nx1 - 0.1, st, 'glatt', {});
  }
  // Chor
  if (c.chor !== 'gerade') {
    const seg = c.chor === 'rund' ? 14 : 6, hc = (c.schiff === 'basilika' ? Hn : Hn) * 0.9;
    halbrund(S, nx0, cz, rc, hc, st, seg);
    halbkegel(S, nx0, cz, rc + 0.5, dachH * 0.72, hc, dach, seg);
    if (c.schiff === 'basilika' && c.umgang) { halbrund(S, nx0, cz, rc + sb * 0.8, Hs, st, seg); halbkegel(S, nx0, cz, rc + sb * 0.8 + 0.5, 3, Hs, dach, seg); }
  }
  // Querhaus
  let top = Hn + dachH;
  if (quer) {
    const qz0 = z + 0.3, qz1 = c.turm === 'seitlich' ? zB : z + d - 0.3;
    S.quader(qx0, 0, qz0, qx1, Hn, qz1, st);
    gesims(S, qx0, qz0, qb, qz1 - qz0, Hn, 0.5, 0.3, sH);
    const hq = dachH * (qb + 0.8) / (nb + 1.6);
    satteldach(S, qx0 - 0.4, qz0 - 0.3, qb + 0.8, qz1 - qz0 + 0.6, Hn, hq, dach, 'z', 0.2);
    giebel(S, '+z', qx0 - 0.1, qx1 + 0.1, Hn, c.giebel === 'volute' ? qb * 0.75 : hq, qz1 + 0.35, st, c.giebel, { hell: sH, blenden: c.blenden, blendF: c.blendF });
    const qm = (qx0 + qx1) / 2;
    if (c.rose) rosette(S, '+z', qm, Hn * 0.62, qz1, Math.min(qb * 0.3, Hn * 0.2), sH, glas);
    else platte(S, '+z', qm - qb * 0.15, Hn * 0.4, qm + qb * 0.15, Hn * 0.85, qz1, glas, bog);
    platte(S, '+z', qm - 1.4, 0.3, qm + 1.4, Math.min(5.5, Hn * 0.3), qz1, '#4a3a2e', bog, 0.25);
    if (c.vierung) {
      const rv = Math.min(qb, nb) * 0.38, hv = dachH + Hn * 0.3;
      zyl(S, rv, rv, hv, qm, Hn, cz, st, 8);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI + PI / 8; if (Math.cos(a) < -0.3 || Math.sin(a) < -0.3) continue; S.box(0.8, hv * 0.22, 0.3, qm + Math.cos(a) * (rv * 0.93), Hn + hv * 0.8, cz + Math.sin(a) * (rv * 0.93), '#3f4c58', -a - PI / 2); }
      zyl(S, rv + 0.35, rv + 0.35, 0.4, qm, Hn + hv, cz, sH, 8);
      if (c.vierungHelm === 'spitz') { spitze(S, rv + 0.2, rv * 3, qm, Hn + hv + 0.4, cz, c.helmF, 8); top = Math.max(top, Hn + hv + rv * 3); }
      else { spitze(S, rv + 0.4, rv * 1.1, qm, Hn + hv + 0.4, cz, c.helmF, 8); top = Math.max(top, Hn + hv + rv * 1.1); }
    }
  } else if (c.turm !== 'seitlich' && c.turm !== 'frei') {
    platte(S, '+z', nx0 + L * 0.5 - 1.3, 0.3, nx0 + L * 0.5 + 1.3, Math.min(4.8, Hs * 0.6), az1, '#4a3a2e', bog, 0.25);
  }
  // Dachreiter
  if (c.turm === 'dachreiter' || c.dachreiter) {
    const ux = quer ? (qx0 + qx1) / 2 : nx0 + L * 0.72, b = clamp(nb * 0.2, 1.6, 2.8), y0 = Hn + dachH * 0.55, y1 = Hn + dachH + 3;
    S.box(b, y1 - y0, b, ux, (y0 + y1) / 2, cz, c.dachreiterF ?? sH);
    platte(S, '+z', ux - b * 0.25, y1 - 2.4, ux + b * 0.25, y1 - 0.5, cz + b / 2, '#3f4c58', bog, 0.06);
    platte(S, '+x', cz - b * 0.25, y1 - 2.4, cz + b * 0.25, y1 - 0.5, ux + b / 2, '#3f4c58', bog, 0.06);
    if (c.helm === 'zwiebel' || c.helm === 'welsch') top = Math.max(top, turmHelm(S, 'welsch', ux, y1, cz, b * 1.2, c.helmF, sH));
    else { spitze(S, b * 0.62, b * 3.2, ux, y1, cz, c.helmF, 8); kreuz(S, ux, y1 + b * 3.1, cz, 0.6); top = Math.max(top, y1 + b * 3.2 + 1.5); }
  }
  // Türme
  const tOpt = { bogen: bog, hell: sH, blenden: c.blenden, blendF: c.blendF, romanisch: c.romanischTurm, schall: c.schall, stufen: c.stufen };
  if (c.turm === 'west') {
    const tx0 = x + w - tB, tz0 = cz - tB / 2;
    turm(S, tx0, tz0, tB, c.Ht, st, { ...tOpt, portal: true });
    top = Math.max(top, turmHelm(S, c.helm, tx0 + tB / 2, c.Ht + 0.4, tz0 + tB / 2, tB, c.helmF, sH));
  } else if (c.turm === 'doppel') {
    for (const [tz0, mitUhr] of [[zA, false], [zB - tB, c.uhr !== false]]) {
      turm(S, x + w - tB, tz0, tB, c.Ht, st, { ...tOpt, uhr: mitUhr, portal: false });
      top = Math.max(top, turmHelm(S, c.helm, x + w - tB / 2, c.Ht + 0.4, tz0 + tB / 2, tB, c.helmF, sH));
    }
  } else if (c.turm === 'seitlich') {
    const tx0 = x + w - tB - (c.seitlichVersatz ?? 0), tz0 = z + d - tB;
    turm(S, tx0, tz0, tB, c.Ht, st, { ...tOpt, portal: false });
    platte(S, '+z', tx0 + tB / 2 - 1.3, 0.3, tx0 + tB / 2 + 1.3, 4.8, tz0 + tB, '#4a3a2e', bog, 0.2);
    top = Math.max(top, turmHelm(S, c.helm, tx0 + tB / 2, c.Ht + 0.4, tz0 + tB / 2, tB, c.helmF, sH));
  }
  return top;
}

/** Klassizistische Kirche: Portikus auf +z, Kuppel. form 'kreuz' | 'rotunde'. */
function klassizistischeKirche(S, scene, p, c) {
  const { x, z, w, d } = p, r = c.r, st = c.stein, sH = c.hell, kup = c.helmF;
  const pt = clamp(d * 0.2, 3, 5.5), bz1 = z + d - pt;
  let top;
  if (c.form === 'rotunde') {
    const R = Math.min((bz1 - z) / 2 - 0.3, w * 0.3), cx = x + w / 2, cz = z + (bz1 - z) / 2 + 0.3;
    const H = clamp(R * 1.05, 9, 16);
    zyl(S, R, R, H, cx, 0, cz, st, 28);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * PI; if (Math.cos(a) < -0.25 && Math.sin(a) < -0.25) continue; S.box(1.3, H * 0.42, 0.3, cx + Math.cos(a) * (R + 0.05), H * 0.5, cz + Math.sin(a) * (R + 0.05), '#46525d', -a - PI / 2); }
    zyl(S, R + 0.5, R + 0.5, 0.9, cx, H, cz, sH, 28);
    drehform(S, [[R + 0.3, 0], [R * 0.66, R * 0.22], [0, R * 0.22]], cx, H + 0.9, cz, c.dach, 28);
    const Rt = R * 0.62, Ht = R * 0.4, y0 = H + 0.9 + R * 0.18;
    zyl(S, Rt, Rt, Ht, cx, y0, cz, st, 20);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * PI; if (Math.cos(a) < -0.25 && Math.sin(a) < -0.25) continue; S.box(0.9, Ht * 0.55, 0.3, cx + Math.cos(a) * (Rt + 0.05), y0 + Ht * 0.5, cz + Math.sin(a) * (Rt + 0.05), '#46525d', -a - PI / 2); }
    zyl(S, Rt + 0.4, Rt + 0.4, 0.5, cx, y0 + Ht, cz, sH, 20);
    haube(S, Rt + 0.1, cx, y0 + Ht + 0.5, cz, kup, c.kuppelHoch ? 1.15 : 0.85, 20);
    const yl = y0 + Ht + 0.5 + (Rt + 0.1) * (c.kuppelHoch ? 1.15 : 0.85);
    zyl(S, 1.0, 1.0, 2.2, cx, yl - 0.3, cz, sH, 8); haube(S, 1.2, cx, yl + 1.9, cz, kup, 1.1, 8); kreuz(S, cx, yl + 3.2, cz, 0.7);
    top = yl + 5.5;
    portikus(S, scene, cx - R * 0.62, cx + R * 0.62, cz + R - 1.2, H, pt - 1.4, st, c.saeulen ?? 6, { dach: c.dach });
  } else {
    const bx0 = x + 0.8, bx1 = x + w - 0.8, H = clamp(d * 0.62, 10, 15), cx = (bx0 + bx1) / 2, cz = (z + 1 + bz1) / 2;
    lochBlock(S, bx0, z + 1, bx1 - bx0, bz1 - z - 1, 0, H, st, { y0: 1.2, geschosse: 1, gh: H - 1.2, raster: 5, fw: 2.0, fh: H * 0.5, bruestung: H * 0.2, bogen: true, tiefe: 0.6 });
    for (let u = bx0 + 0.2; u <= bx1; u += (bx1 - bx0) / 6) S.box(0.8, H, 0.3, u, H / 2, bz1 + 0.15, sH);
    gesims(S, bx0, z + 1, bx1 - bx0, bz1 - z - 1, H, 1.0, 0.5, sH);
    S.quader(bx0 + 0.2, H + 0.5, z + 1.2, bx1 - 0.2, H + 1.6, bz1 - 0.2, sH);
    satteldach(S, bx0 + 0.6, z + 1.6, bx1 - bx0 - 1.2, bz1 - z - 2.2, H + 1.6, 2.4, c.dach, 'x', (bz1 - z) * 0.3);
    const R = clamp(Math.min(d * 0.3, w * 0.17), 4, 9), y0 = H + 1.6;
    zyl(S, R, R, R * 0.7, cx, y0, cz, st, 20);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * PI; if (Math.cos(a) < -0.25 && Math.sin(a) < -0.25) continue; S.box(0.9, R * 0.38, 0.3, cx + Math.cos(a) * (R + 0.05), y0 + R * 0.35, cz + Math.sin(a) * (R + 0.05), '#46525d', -a - PI / 2); }
    zyl(S, R + 0.4, R + 0.4, 0.5, cx, y0 + R * 0.7, cz, sH, 20);
    const kh = c.kuppelHoch ? 1.15 : 0.9;
    haube(S, R + 0.1, cx, y0 + R * 0.7 + 0.5, cz, kup, kh, 20);
    const yl = y0 + R * 0.7 + 0.5 + (R + 0.1) * kh;
    zyl(S, 0.9, 0.9, 2, cx, yl - 0.3, cz, sH, 8); haube(S, 1.1, cx, yl + 1.7, cz, kup, 1.1, 8); kreuz(S, cx, yl + 2.9, cz, 0.7);
    top = yl + 5;
    const pb = clamp(w * 0.42, 9, 22);
    portikus(S, scene, cx - pb / 2, cx + pb / 2, bz1, H, pt - 2.6, st, pb > 15 ? 6 : 4, { dach: c.dach });
    if (c.tuerme) for (const tz of [z + 1.2]) {
      const t = 4.5, tx0 = bx1 - t;
      S.quader(tx0, 0, tz, bx1 + 0.3, H + 9, tz + t, st);
      gesims(S, tx0, tz, t + 0.3, t, H + 9, 0.6, 0.4, sH);
      for (const seite of ['+z', '+x']) { const f = seite === '+z' ? tz + t : bx1 + 0.3, uc = seite === '+z' ? tx0 + t / 2 : tz + t / 2; platte(S, seite, uc - 0.8, H + 3.5, uc + 0.8, H + 8, f, '#46525d', true); }
      top = Math.max(top, turmHelm(S, 'kuppel', tx0 + t / 2 + 0.15, H + 9.3, tz + t / 2, t, kup, sH));
    }
  }
  return top;
}

/** Nachkriegsmoderne: Zelt-, Faltwerk- oder Kubusbau mit freistehendem Glockenturm. */
function nachkriegsKirche(S, scene, p, c) {
  const { x, z, w, d } = p, r = c.r, st = c.stein, bunt = c.glasBunt;
  const ct = clamp(d * 0.18, 2.8, 4.2), Hc = clamp(w * 0.62, 18, 34);
  const bx0 = x + 0.5, bx1 = x + w - ct - 3.5, bz0 = z + 0.8, bz1 = z + d - 0.8, bw = bx1 - bx0, bd = bz1 - bz0;
  let top;
  if (c.form === 'zelt') {
    S.quader(bx0, 0, bz0, bx1, 3.6, bz1, st);
    S.quader(bx0 + 1, 0.4, bz1, bx1 - 1, 3.0, bz1 + 0.05, bunt);
    const hz = Math.min(bw, bd) * 1.05;
    pyramide(S, bw + 1.4, bd + 1.4, hz, (bx0 + bx1) / 2, 3.6, (bz0 + bz1) / 2, c.dach);
    // farbiges Lichtband im Dach auf der +x-Flanke
    const g = new THREE.BoxGeometry(0.5, hz * 0.8, 1.6); g.rotateZ(Math.atan((bw / 2) / hz)); g.translate(bx1 - bw * 0.22, 3.6 + hz * 0.42, (bz0 + bz1) / 2); S.add(g, bunt);
    kreuz(S, (bx0 + bx1) / 2, 3.6 + hz - 0.4, (bz0 + bz1) / 2, 1.3, '#e9e7e2');
    top = 3.6 + hz + 3;
  } else if (c.form === 'falt') {
    const H = clamp(d * 0.45, 7, 10);
    S.quader(bx0, 0, bz0, bx1 - 0.3, H, bz1 - 0.3, bunt);
    const lo = []; for (let u = bx0 + 1.2; u < bx1 - 1; u += 1.5) lo.push({ u0: u, u1: u + 0.55, v0: 1.2, v1: H - 1.0 });
    lochwand(S, '+z', bx0, bx1, -0.3, H, bz1, 0.5, st, lo);
    lochwand(S, '+x', bz0, bz1, -0.3, H, bx1, 0.5, st, [{ u0: (bz0 + bz1) / 2 - 0.5, u1: (bz0 + bz1) / 2 + 0.5, v0: 1, v1: H - 1 }, { u0: (bz0 + bz1) / 2 - 2.4, u1: (bz0 + bz1) / 2 - 0.9, v0: H * 0.62, v1: H * 0.62 + 0.9 }, { u0: (bz0 + bz1) / 2 + 0.9, u1: (bz0 + bz1) / 2 + 2.4, v0: H * 0.62, v1: H * 0.62 + 0.9 }]);
    const n = Math.max(3, Math.round(bw / 4)), fb = bw / n;
    for (let i = 0; i < n; i++) { const g = dachProfil(bd + 1.2, fb, 2.6, 0, 'z'); g.translate(bx0 + (i + 0.5) * fb, H, (bz0 + bz1) / 2); S.add(g, c.dach); }
    top = H + 2.6;
  } else {
    const H = clamp(d * 0.6, 9, 14);
    S.quader(bx0, 0, bz0, bx1, H, bz1, st);
    S.quader(bx0 - 0.2, H, bz0 - 0.2, bx1 + 0.2, H + 0.6, bz1 + 0.2, heller(st, 0.04));
    const mz = (bz0 + bz1) / 2;
    S.quader(bx1, 1.2, mz - 0.5, bx1 + 0.06, H - 1.2, mz + 0.5, bunt);
    S.quader(bx1, H * 0.62, mz - 2.6, bx1 + 0.06, H * 0.62 + 1.0, mz + 2.6, bunt);
    for (let u = bx0 + 2; u < bx1 - 1; u += 3) S.quader(u, 0.8, bz1, u + 0.4, H - 0.8, bz1 + 0.06, bunt);
    S.quader(bx1 - 4, 0.3, bz1, bx1 - 1, 3.2, bz1 + 0.08, '#3a3f44');
    top = H + 0.6;
  }
  // Campanile
  const tx = x + w - ct / 2 - 0.5, tz = z + d - ct / 2 - 1.5;
  const turmF = c.turmF ?? st;
  if (c.campanile === 'scheibe') {
    S.quader(tx - ct / 2, 0, tz - 0.6, tx + ct / 2, Hc, tz + 0.6, turmF);
    for (let k = 0; k < 3; k++) S.quader(tx - ct * 0.32, Hc - 6 + k * 1.6, tz + 0.6, tx + ct * 0.32, Hc - 5 + k * 1.6, tz + 0.65, '#3a3f44');
  } else {
    for (const s of [-1, 1]) S.box(0.7, Hc, 0.7, tx + s * (ct / 2 - 0.35), Hc / 2, tz - ct / 2 + 0.35, turmF), S.box(0.7, Hc, 0.7, tx + s * (ct / 2 - 0.35), Hc / 2, tz + ct / 2 - 0.35, turmF);
    for (let y = 6; y < Hc; y += 6) S.box(ct, 0.5, ct, tx, y, tz, turmF);
    S.box(ct, 0.6, ct, tx, Hc, tz, turmF);
    S.box(ct * 0.4, 1.4, ct * 0.4, tx, Hc - 3.4, tz, '#5a4a32');
  }
  kreuz(S, tx, Hc + 0.3, tz, 1.3, c.kreuzF ?? '#2f3338');
  S.quader(bx1, 0.3, tz - 0.25, tx - ct / 2, 2.0, tz + 0.25, st);
  return Math.max(top, Hc + 3.2);
}

/** Neugotischer Doppelturm-Dom (Nennmaß 86×38, kleinere Flächen werden skaliert). */
function domNeugotik(S, scene, p, c) {
  const { x, z, w, d } = p, r = c.r;
  const stein = c.stein, sH = heller(stein, 0.05), dachF = c.dach, helmF = c.helmF, glas = '#435666';
  const t = 11, Ht = c.Ht ?? zw(r, 50, 62), spH = c.spitzeH ?? zw(r, 26, 34);
  const ax1 = x + w - t, cz = z + d / 2, nb = 14, nz0 = cz - nb / 2, nz1 = cz + nb / 2;
  const Hn = 30, Hs = 15, nx0 = x + 12, nx1 = ax1 + 0.5, sz0 = z + 3, sz1 = z + d - 3;
  S.quader(nx0, 0, sz0, nx1, Hs, sz1 - 0.3, '#4a5560');
  const L = nx1 - nx0, nBay = Math.floor(L / 6.5), bay = L / nBay;
  const qx0 = x + (w - t) * (c.querPos ?? 0.36), qx1 = qx0 + nb;
  const ohneQ = (u) => u > qx0 - 1.5 && u < qx1 + 1.5;
  const loS = [], loO = [];
  for (let i = 0; i < nBay; i++) {
    const u = nx0 + (i + 0.5) * bay; if (ohneQ(u)) continue;
    loS.push({ u0: u - 1.4, u1: u + 1.4, v0: 3.5, v1: Hs - 2, bogen: 'spitz' });
    loO.push({ u0: u - 1.3, u1: u + 1.3, v0: Hs + 4.2, v1: Hn - 2, bogen: 'spitz' });
  }
  lochwand(S, '+z', nx0, nx1, -0.3, Hs, sz1, 0.6, stein, loS);
  gesims(S, nx0, sz0, L, sz1 - sz0, Hs, 0.5, 0.3, sH);
  const sb = sz1 - nz1, ang = Math.atan(4 / sb), hyp = Math.hypot(sb, 4) + 1;
  for (const s of [1, -1]) { const g = new THREE.BoxGeometry(L, 0.5, hyp); g.rotateX(ang * s); g.translate(nx0 + L / 2, Hs + 2.1, cz + s * (nb / 2 + sb / 2)); S.add(g, dachF); }
  S.quader(nx0, Hs, nz0, nx1, Hn, nz1 - 0.3, '#4a5560');
  lochwand(S, '+z', nx0, nx1, Hs, Hn, nz1, 0.6, stein, loO);
  gesims(S, nx0, nz0, L, nb, Hn, 0.6, 0.4, sH);
  satteldach(S, nx0 - 0.3, nz0 - 1, L + 0.8, nb + 2, Hn, 12, dachF, 'x', 0.2);
  for (let i = 0; i <= nBay; i++) {
    const u = nx0 + i * bay; if (u > qx0 - 1 && u < qx1 + 1) continue;
    S.box(1.4, Hs + 4, 2.2, u, (Hs + 4) / 2, sz1 + 1.0, sH);
    spitze(S, 0.8, 3.2, u, Hs + 4, sz1 + 1.0, sH, 4);
    const g = new THREE.BoxGeometry(0.8, 0.8, sb + 1.4); g.rotateX(-0.62); g.translate(u, Hs + 6.5, nz1 + sb / 2 + 0.3); S.add(g, sH);
  }
  halbrund(S, nx0, cz, nb / 2, Hn, stein, 12); halbkegel(S, nx0, cz, nb / 2 + 0.8, 10, Hn, dachF, 12);
  halbrund(S, nx0, cz, d / 2 - 3, Hs, stein, 14); halbkegel(S, nx0, cz, d / 2 - 2.4, 4.5, Hs, dachF, 14);
  S.quader(qx0, 0, z, qx1, Hn, z + d, stein);
  gesims(S, qx0, z, nb, d, Hn, 0.6, 0.4, sH);
  satteldach(S, qx0 - 1, z - 0.3, nb + 2, d + 0.6, Hn, 12, dachF, 'z', 0.2);
  { const s = new THREE.Shape(); s.moveTo(qx0 + 0.3, Hn); s.lineTo(qx1 - 0.3, Hn); s.lineTo((qx0 + qx1) / 2, Hn + 11.5); s.lineTo(qx0 + 0.3, Hn); flaeche(S, '+z', s, z + d + 0.32, 0.6, stein); }
  rosette(S, '+z', (qx0 + qx1) / 2, Hn - 7, z + d, 4.2, sH, glas);
  platte(S, '+z', qx0 + 3.5, 0.3, qx1 - 3.5, 12, z + d, '#4a3a2e', 'spitz', 0.3);
  platte(S, '+z', qx0 + 2.5, Hn + 1.5, qx1 - 2.5, Hn + 8, z + d + 0.32, glas, 'spitz');
  for (const u of [qx0 - 0.5, qx1 + 0.5]) { S.box(1.6, Hn + 2, 1.6, u, (Hn + 2) / 2, z + d - 0.2, sH); spitze(S, 1.0, 5, u, Hn + 2, z + d - 0.2, sH, 4); }
  if (c.vierungsturm !== false) {
    zyl(S, 5.2, 5.6, 8, (qx0 + qx1) / 2, Hn + 8, cz, stein, 8);
    spitze(S, 5.4, c.vierungH ?? 16, (qx0 + qx1) / 2, Hn + 16, cz, helmF === stein ? dachF : helmF, 8);
  } else {
    S.box(2.4, 6, 2.4, (qx0 + qx1) / 2, Hn + 12, cz, sH); spitze(S, 1.7, 9, (qx0 + qx1) / 2, Hn + 15, cz, helmF === stein ? dachF : helmF, 8);
  }
  const fz0 = z + 1, fz1 = z + d - 1;
  turm(S, ax1, fz0, t, Ht, stein, { uhr: false, bogen: 'spitz', stufen: [0.27, 0.5, 0.74] });
  turm(S, ax1, fz1 - t, t, Ht, stein, { uhr: false, bogen: 'spitz', stufen: [0.27, 0.5, 0.74] });
  S.quader(ax1, 0, fz0 + t, x + w - 1, Hn + 4, fz1 - t, stein);
  { const s = new THREE.Shape(); s.moveTo(fz0 + t, Hn + 4); s.lineTo(fz1 - t, Hn + 4); s.lineTo(cz, Hn + 13); s.lineTo(fz0 + t, Hn + 4); flaeche(S, '+x', s, x + w - 1, 0.8, stein); }
  rosette(S, '+x', cz, Hn - 6, x + w - 1, 4.4, sH, glas);
  platte(S, '+x', cz - 3.6, 0.3, cz + 3.6, 14, x + w - 1, '#4a3a2e', 'spitz', 0.4);
  for (const zz of [fz0 + t / 2, fz1 - t / 2]) {
    platte(S, '+x', zz - 1.8, 0.3, zz + 1.8, 9, x + w, '#4a3a2e', 'spitz', 0.3);
    platte(S, '+x', zz - 1.4, Ht * 0.53, zz + 1.4, Ht * 0.72, x + w, glas, 'spitz');
    platte(S, '+x', zz - 1.4, Ht * 0.3, zz + 1.4, Ht * 0.46, x + w, glas, 'spitz');
    platte(S, '+z', ax1 + t / 2 - 1.4, Ht * 0.53, ax1 + t / 2 + 1.4, Ht * 0.72, zz + t / 2, glas, 'spitz');
    platte(S, '+z', ax1 + t / 2 - 1.4, Ht * 0.3, ax1 + t / 2 + 1.4, Ht * 0.46, zz + t / 2, glas, 'spitz');
  }
  uhr(S, '+x', cz, Hn + 7.8, x + w - 1, 2.2);
  for (const zz of [fz0 + t / 2, fz1 - t / 2]) {
    const cx = ax1 + t / 2;
    zyl(S, t * 0.46, t * 0.5, 7, cx, Ht, zz, stein, 8);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI + PI / 8; spitze(S, 0.5, 3, cx + Math.cos(a) * t * 0.5, Ht + 7, zz + Math.sin(a) * t * 0.5, sH, 4); }
    spitze(S, t * 0.46, spH, cx, Ht + 7, zz, helmF, 8);
    S.add(new THREE.SphereGeometry(0.8, 8, 6).translate(cx, Ht + 7 + spH - 0.6, zz), '#d8b45a');
    kreuz(S, cx, Ht + 7 + spH - 0.2, zz, 1.1);
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) spitze(S, 0.9, 6, cx + dx * (t / 2 - 0.2), Ht, zz + dz * (t / 2 - 0.2), sH, 4);
  }
  return Ht + 7 + spH + 3;
}

/** Baut in Nennmaß und skaliert gleichmäßig in die Fläche (Mitte der Fläche). */
export function skaliert(S, scene, p, natW, natD, bau) {
  const s = Math.min(1, p.w / natW, p.d / natD);
  if (s >= 0.999) return bau(S, scene, p);
  const T = new Sammler(), grp = new THREE.Group();
  const erg = bau(T, grp, { ...p, x: 0, z: 0, w: natW, d: natD });
  const ox = p.x + (p.w - natW * s) / 2, oz = p.z + (p.d - natD * s) / 2;
  for (const [farbe, gs] of T.teile) for (const g of gs) { g.scale(s, s, s); g.translate(ox, 0, oz); S.add(g, farbe); }
  grp.scale.setScalar(s); grp.position.set(ox, 0, oz); scene.add(grp);
  return { ...erg, hoehe: erg.hoehe * s, skala: s };
}

export const KIRCHEN_STILE = ['romanisch', 'hallenkirche', 'backsteingotik', 'barock', 'klassizismus', 'neugotik', 'nachkrieg', 'kapelle'];
export const REGION_KIRCHEN = {
  nord: ['backsteingotik', 'backsteingotik', 'backsteingotik', 'hallenkirche', 'nachkrieg', 'kapelle', 'klassizismus'],
  sued: ['barock', 'barock', 'barock', 'romanisch', 'hallenkirche', 'nachkrieg', 'kapelle'],
  west: ['romanisch', 'romanisch', 'hallenkirche', 'neugotik', 'klassizismus', 'nachkrieg', 'barock'],
  ost: ['backsteingotik', 'backsteingotik', 'hallenkirche', 'klassizismus', 'barock', 'nachkrieg'],
  mitte: ['hallenkirche', 'hallenkirche', 'romanisch', 'barock', 'klassizismus', 'nachkrieg', 'kapelle'],
};
const ST = {
  sandstein: ['#e3d3bd', '#d9c4a8', '#e6d5bf', '#dccbb2'],
  grau: ['#cfc9bd', '#c9c4b8', '#d6d0c4', '#bfb8ab'],
  rot: ['#b98a72', '#b07a63', '#c09078'],
  backstein: ['#a8583f', '#b06a52', '#9e5c47', '#b9785e', '#a14f3a'],
  putz: ['#f1e6c8', '#efe0d6', '#f2efe6', '#e9dcc1', '#f0e2c0', '#e6eadf'],
  beton: ['#cfccc6', '#c4c2bd', '#d6d3cc', '#bdb9b1'],
  weiss: ['#f2efe6', '#efe9dd', '#ece8e0'],
};
const SCHIEFER = ['#56636c', '#5d6a72', '#4f5a62'], ZIEGEL = ['#b4583f', '#a24e38', '#c06548'], KUPFER = ['#6f9a7d', '#7aa68a', '#5f8c72'];

function kirchenKonfig(stil, r, p) {
  const k = clamp(p.d / 22, 0.62, 1.3);
  const c = { r };
  switch (stil) {
    case 'romanisch': Object.assign(c, {
      schiff: r() < 0.72 ? 'basilika' : 'saal', bogen: true, quer: r() < 0.7, vierung: r() < 0.8, chor: 'rund', umgang: false,
      turm: waehle(r, ['doppel', 'west', 'doppel', 'west', 'keiner']), helm: waehle(r, ['pyramideFlach', 'sattel', 'pyramide', 'sattel']),
      stein: waehle(r, [...ST.grau, ...ST.sandstein, '#c8b79a']), dach: waehle(r, [...SCHIEFER, ...ZIEGEL]), Hn: 17 * k, Hs: 9 * k, dachH: 0.55,
      lisenen: true, fu: 0.48, fo: 1.5, fensterB: 1.3, joch: 4.8, giebel: 'glatt', rundfenster: true, romanischTurm: true, vierungHelm: waehle(r, ['pyramide', 'pyramide', 'spitz']),
    }); c.Ht = c.Hn + zw(r, 12, 18) * k;
      if (c.turm === 'keiner' && !(c.quer && c.vierung)) c.turm = 'doppel';
      break;
    case 'hallenkirche': Object.assign(c, {
      schiff: 'halle', bogen: 'spitz', quer: false, chor: 'eckig', turm: waehle(r, ['west', 'west', 'seitlich', 'dachreiter']),
      helm: waehle(r, ['spitz', 'spitz', 'welsch', 'pyramide']), stein: waehle(r, [...ST.sandstein, ...ST.grau]), dach: waehle(r, [...SCHIEFER, ...ZIEGEL, ...KUPFER]),
      Hn: zw(r, 14, 18) * k, dachH: zw(r, 0.75, 0.95), strebe: true, giebel: 'glatt', rose: r() < 0.3, joch: zw(r, 5.2, 6.4),
    }); c.Ht = c.Hn * zw(r, 2.1, 2.6); break;
    case 'backsteingotik': Object.assign(c, {
      schiff: r() < 0.55 ? 'halle' : 'basilika', bogen: 'spitz', quer: r() < 0.4, vierung: false, chor: 'eckig', turm: waehle(r, ['west', 'west', 'doppel', 'seitlich']),
      helm: waehle(r, ['spitzhoch', 'spitzhoch', 'spitz', 'welsch', 'pyramide']), stein: waehle(r, ST.backstein), dach: waehle(r, [...KUPFER, ...SCHIEFER, ...ZIEGEL]),
      Hn: zw(r, 15, 20) * k, Hs: 10 * k, dachH: zw(r, 0.8, 1.0), strebe: r() < 0.6, giebel: 'treppe', blenden: true, blendF: '#ece6da', joch: zw(r, 5, 6), stufen: [0.25, 0.5, 0.75],
    }); c.hell = dunkler(c.stein, 0.05); c.Ht = c.Hn * zw(r, 2.0, 2.5); break;
    case 'barock': Object.assign(c, {
      schiff: 'saal', saalB: 0.8, bogen: true, quer: r() < 0.35, chor: 'rund', turm: waehle(r, ['west', 'west', 'doppel', 'west', 'doppel', 'seitlich']),
      helm: waehle(r, ['zwiebel', 'zwiebel', 'welsch']), stein: waehle(r, ST.putz), dach: waehle(r, [...ZIEGEL, ...SCHIEFER]), Hn: zw(r, 13, 16) * k, dachH: 0.6,
      lisenen: true, giebel: 'volute', fu: 0.22, fo: 2.4, fensterB: 2.2, joch: 5.4, turmMax: 9, schall: 'breit', stufen: [0.36, 0.7],
    }); c.hell = '#f7f4ee'; c.helmF = waehle(r, [...KUPFER, '#4f5a62']); c.Ht = c.Hn * zw(r, 1.6, 1.95); break;
    case 'klassizismus': Object.assign(c, {
      form: waehle(r, ['kreuz', 'rotunde', 'kreuz']), stein: waehle(r, [...ST.sandstein, ...ST.weiss]), dach: waehle(r, SCHIEFER), kuppelHoch: r() < 0.5, tuerme: r() < 0.4, saeulen: waehle(r, [4, 6]),
    }); c.hell = heller(c.stein, 0.05); break;
    case 'nachkrieg': Object.assign(c, {
      form: waehle(r, ['zelt', 'falt', 'kubus']), stein: waehle(r, [...ST.beton, '#9e5c47', '#e9e7e2']), dach: waehle(r, ['#8f969c', ...SCHIEFER, '#6f9a7d']),
      glasBunt: waehle(r, ['#3f6fae', '#b8434b', '#d9a33a', '#4a8f8a']), campanile: waehle(r, ['rahmen', 'scheibe']), kreuzF: waehle(r, ['#2f3338', '#d8b45a', '#e9e7e2']),
    }); c.turmF = waehle(r, [c.stein, '#d6d3cc']); break;
    case 'kapelle': Object.assign(c, {
      schiff: 'saal', saalB: 1, bogen: r() < 0.7 ? true : 'spitz', quer: false, chor: waehle(r, ['rund', 'eckig', 'gerade']), turm: waehle(r, ['dachreiter', 'dachreiter', 'west']),
      helm: waehle(r, ['spitz', 'zwiebel', 'pyramide', 'spitzhoch']), stein: waehle(r, [...ST.weiss, ...ST.sandstein, '#b06a52']), dach: waehle(r, [...ZIEGEL, ...SCHIEFER]),
      Hn: zw(r, 7, 9), dachH: 0.85, giebel: 'glatt', turmMax: 5.5, fu: 0.3, fensterB: 1.4, joch: 4.2, lisenen: false,
    }); c.Ht = c.Hn * 2.0; break;
    default: // neugotik
      Object.assign(c, { stein: waehle(r, ['#cdbfa6', '#b98a72', '#c9c4b8', '#d6c8ae', '#a9a196']), dach: waehle(r, SCHIEFER), vierungsturm: r() < 0.65, querPos: zw(r, 0.3, 0.42), vierungH: zw(r, 12, 20) });
      c.helmF = waehle(r, [...KUPFER, c.stein, '#4f5a62']);
  }
  c.hell = c.hell ?? heller(c.stein, 0.05);
  c.helmF = c.helmF ?? (c.dach && KUPFER.includes(c.dach) ? c.dach : waehle(r, [...KUPFER, ...SCHIEFER]));
  // Überschreibungen (rückwärtskompatibel)
  if (p.stein) { c.stein = p.stein; c.hell = stil === 'barock' ? '#f7f4ee' : stil === 'backsteingotik' ? dunkler(p.stein, 0.05) : heller(p.stein, 0.05); }
  if (p.dach) c.dach = p.dach;
  if (p.helmFarbe) c.helmF = p.helmFarbe;
  if (p.helm) c.helm = p.helm;
  if (p.turm) c.turm = p.turm;
  if (p.turmHoehe) c.Ht = p.turmHoehe;
  if (p.quer !== undefined) c.quer = p.quer;
  if (p.chor) c.chor = p.chor;
  if (p.form) c.form = p.form;
  return c;
}

/**
 * Kirche. p: { x, z, w, d, seed, stil?, region?, typ? ('stadt' | 'dom'), helm?, turm?, quer?, chor?, form?, stein?, dach?, helmFarbe?, turmHoehe? }
 * stil: romanisch | hallenkirche | backsteingotik | barock | klassizismus | neugotik | nachkrieg | kapelle
 */
export function kirche(S, scene, p) {
  const seed = p.seed ?? 1, r = rng(`kirche:${seed}`);
  const dom = p.typ === 'dom';
  const w = p.w ?? (dom ? 86 : 46), d = p.d ?? (dom ? 38 : 20);
  let stil = p.stil;
  if (!stil) stil = dom ? waehle(r, ['neugotik', 'neugotik', 'romanisch', 'backsteingotik']) : waehle(r, REGION_KIRCHEN[p.region] ?? KIRCHEN_STILE);
  const c = kirchenKonfig(stil, r, { ...p, w, d });
  const q = { ...p, w, d };
  let top;
  if (stil === 'neugotik') {
    const e = skaliert(S, scene, q, Math.max(86, w * 0), 38, (S2, sc2, pp) => ({ hoehe: domNeugotik(S2, sc2, pp, c) }));
    return { hoehe: e.hoehe, teile: S.anzahl, stil };
  }
  if (stil === 'klassizismus') top = klassizistischeKirche(S, scene, q, c);
  else if (stil === 'nachkrieg') top = nachkriegsKirche(S, scene, q, c);
  else if (stil === 'kapelle') {
    const kw = Math.min(w, zw(r, 18, 26)), kd = Math.min(d, zw(r, 9, 12));
    top = langhausKirche(S, scene, { ...q, x: q.x + w - kw - (w - kw) * 0.3, z: q.z + (d - kd) / 2, w: kw, d: kd }, c);
  } else {
    if (dom) { c.Hn *= 1.25; c.Hs = (c.Hs ?? 9) * 1.25; c.Ht *= 1.2; c.quer = true; }
    top = langhausKirche(S, scene, q, c);
  }
  return { hoehe: top, teile: S.anzahl, stil };
}

// =====================================================================================
// 4. Rathaus
// =====================================================================================
function rathausHistorisch(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const stil = p.stil ?? waehle(r, ['backstein', 'sandstein']);
  const w = p.w ?? 44, d = p.d ?? 24;
  const back = stil === 'backstein';
  const wand = p.farbe ?? (back ? waehle(r, ['#b06a52', '#a8664f', '#b9785e']) : waehle(r, ['#e3d3bd', '#ece5d7', '#e6d5bf']));
  const hell = back ? '#ece5d7' : heller(wand, 0.05), dachF = back ? waehle(r, ['#5d6a72', '#4f5a62']) : waehle(r, ['#6f9a7d', '#5d6a72']);
  const helmF = waehle(r, ['#6f9a7d', '#7aa68a']);
  const G = p.geschosse ?? waehle(r, [2, 3, 3, 4]), eg = 6, gh = 4.4, H = eg + G * gh;
  const ar = 4.0; // Arkadentiefe
  const t = 9, tu0 = x + (back ? waehle(r, [w - t - 4, w * 0.3, w - t - 4]) : waehle(r, [(w - t) / 2, (w - t) / 2, w * 0.25])), tz0 = z + d - t + 1.5;
  const bog = back ? 'spitz' : true;
  // EG zurückgesetzt hinter Arkaden
  S.quader(x, 0, z, x + w, eg, z + d - ar, dunkler(wand, 0.1));
  for (let u = x + 3; u < x + w - 2; u += 4.5) platte(S, '+z', u - 0.9, 0.3, u + 0.9, 3.6, z + d - ar, '#55636f', true, 0.1);
  // Arkadenwand
  const segs = [[x, tu0], [tu0 + t, x + w]];
  for (const [a, b] of segs) {
    if (b - a < 3) continue;
    const n = Math.max(1, Math.round((b - a) / 4.6)), bw = (b - a) / n, lo = [];
    for (let i = 0; i < n; i++) { const c = a + (i + 0.5) * bw; lo.push({ u0: c - bw * 0.36, u1: c + bw * 0.36, v0: 0.31, v1: eg - 0.6, bogen: bog }); }
    lochwand(S, '+z', a, b, -0.3, eg, z + d, 0.8, back ? hell : wand, lo);
  }
  S.quader(x, eg - 0.3, z + d - ar, x + w, eg, z + d, back ? hell : wand);
  // +x-Seite EG
  { const lo = rasterLoecher(z, z + d - ar, { y0: 0, geschosse: 1, gh: eg, raster: 4, fw: 1.8, fh: 3.6, bruestung: 1.1, bogen: bog });
    lochwand(S, '+x', z, z + d - ar, -0.3, eg, x + w, 0.6, back ? hell : wand, lo); }
  // Obergeschosse
  const ob = { y0: eg, geschosse: G, gh, raster: 3.6, fw: 1.6, fh: 2.7, bogen: back ? (k) => (k === 0 ? 'spitz' : false) : (k) => k === 0, tiefe: 0.6 };
  lochBlock(S, x, z, w, d, eg, H, wand, ob);
  for (const seite of ['+z', '+x']) {
    const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d, f = seite === '+z' ? z + d : x + w;
    baenke(S, seite, rasterLoecher(u0, u0 + L, { y0: eg, ...ob }), f, hell);
  }
  for (let k = 0; k <= G; k++) gesims(S, x, z, w, d, eg + k * gh, k === G ? 0.8 : 0.35, k === G ? 0.5 : 0.18, hell);
  // Dach mit Gauben
  const hr = back ? d * 0.75 : d * 0.45;
  satteldach(S, x - 0.4, z - 0.4, w + 0.8, d + 0.8, H + 0.4, hr, dachF, 'x', back ? 0.1 : d * 0.2);
  const nG = Math.floor(w / 6.5);
  for (let i = 0; i < nG; i++) {
    const u = x + 3.5 + (i * (w - 7)) / Math.max(1, nG - 1);
    if (Math.abs(u - (tu0 + t / 2)) < t / 2 + 1.5) continue;
    const gz = z + d - (hr > 10 ? 3.6 : 3.0);
    S.quader(u - 1.1, H + 0.6, gz - 2, u + 1.1, H + 3.2, gz, hell);
    S.quader(u - 0.65, H + 0.9, gz, u + 0.65, H + 2.7, gz + 0.06, '#55636f');
    const g = dachProfil(2.6, 2.8, 1.3, 0, 'z'); g.translate(u, H + 3.2, gz - 1.2); S.add(g, dachF);
  }
  // Treppengiebel (+x) bei Backstein
  if (back) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const b = d + 0.8 - (i * (d + 0.8)) / n, y0 = H + 0.4 + (i * hr) / n;
      S.quader(x + w - 0.8, y0, z + d / 2 - b / 2, x + w + 0.4, y0 + hr / n + 0.6, z + d / 2 + b / 2, wand);
      S.quader(x + w - 0.8, y0 + hr / n + 0.6, z + d / 2 - b / 2, x + w + 0.5, y0 + hr / n + 0.9, z + d / 2 - b / 2 + 1.0, hell);
      S.quader(x + w - 0.8, y0 + hr / n + 0.6, z + d / 2 + b / 2 - 1.0, x + w + 0.5, y0 + hr / n + 0.9, z + d / 2 + b / 2, hell);
      if (i < n - 1) platte(S, '+x', z + d / 2 - 0.6, y0 + 0.6, z + d / 2 + 0.6, y0 + hr / n, x + w + 0.4, '#55636f', 'spitz');
    }
  }
  // Turm
  const Ht = p.turmHoehe ?? (back ? H + 22 : H + 18);
  S.quader(tu0, 0, tz0, tu0 + t, Ht, tz0 + t, wand);
  for (const yy of [eg, H, Ht - 8]) gesims(S, tu0, tz0, t, t, yy, 0.6, 0.35, hell);
  platte(S, '+z', tu0 + 2, 0.3, tu0 + t - 2, eg - 0.6, tz0 + t, '#4a3a2e', bog, 0.2);
  for (const seite of ['+z', '+x']) {
    const f = seite === '+z' ? tz0 + t : tu0 + t, uc = seite === '+z' ? tu0 + t / 2 : tz0 + t / 2;
    for (let k = 0; k < G; k++) platte(S, seite, uc - 0.9, eg + k * gh + 0.9, uc + 0.9, eg + k * gh + 3.5, f, '#55636f', bog);
    uhr(S, seite, uc, Ht - 4.2, f, 2.4, { rahmen: back ? '#d8b45a' : '#2f3b44' });
    platte(S, seite, uc - 1.5, H + 1.5, uc + 1.5, Ht - 8.6, f, '#55636f', bog);
  }
  gesims(S, tu0, tz0, t, t, Ht, 0.8, 0.6, hell);
  let top;
  if (back) {
    for (const [dx, dz] of [[0, 0], [t, 0], [0, t], [t, t]]) { zyl(S, 0.9, 0.9, 4, tu0 + dx, Ht, tz0 + dz, wand, 8); spitze(S, 1.1, 4, tu0 + dx, Ht + 4, tz0 + dz, dachF, 8); }
    spitze(S, t * 0.62, t * 2.2, tu0 + t / 2, Ht, tz0 + t / 2, dachF, 8);
    top = Ht + t * 2.2;
  } else {
    pyramide(S, t + 1, t + 1, 2.4, tu0 + t / 2, Ht + 0.4, tz0 + t / 2, helmF);
    zyl(S, t * 0.3, t * 0.3, 4, tu0 + t / 2, Ht + 2.6, tz0 + t / 2, hell, 8);
    top = turmHelm(S, r() < 0.5 ? 'zwiebel' : 'welsch', tu0 + t / 2, Ht + 6.4, tz0 + t / 2, t * 0.7, helmF, hell, 'kugel');
  }
  schildPasst(scene, 'Rathaus', '+z', tu0 + t / 2, eg + 0.6, tz0 + t, 1.0, t - 1, back ? '#ffffff' : '#3a2e24');
  // Marktplatz davor
  belag(S, x - 5, z + d + 0.5, x + w + 5, z + d + 5.5, '#e2ddd2');
  return { hoehe: top, teile: S.anzahl };
}

// =====================================================================================
// 5. Hauptbahnhof
// =====================================================================================
function tonnenHalle(S, x0, x1, cz, rad, hv, y0, dach, glas) {
  const len = x1 - x0, cx = (x0 + x1) / 2, sy = hv / rad;
  { const g = new THREE.CylinderGeometry(rad, rad, len, 30, 1, true, 0, PI); g.rotateZ(PI / 2); g.scale(1, sy, 1); g.translate(cx, y0, cz); S.add(g, dach); }
  { const g = new THREE.CylinderGeometry(rad + 0.1, rad + 0.1, len - 1, 10, 1, true, PI / 2 - 0.36, 0.72); g.rotateZ(PI / 2); g.scale(1, sy, 1); g.translate(cx, y0, cz); S.add(g, glas); }
  for (let u = x0 + 0.4; u <= x1; u += 7) {
    const g = new THREE.TorusGeometry(rad + 0.15, 0.28, 4, 22, PI); g.rotateY(PI / 2); g.scale(1, sy, 1); g.translate(u, y0, cz); S.add(g, '#e8ecee');
  }
  // Giebel (+x und -x)
  const s = new THREE.Shape();
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * PI; const pu = cz + rad * Math.cos(a), pv = y0 + hv * Math.sin(a); i ? s.lineTo(pu, pv) : s.moveTo(pu, pv); }
  s.lineTo(cz + rad, y0);
  flaeche(S, '+x', s, x1 + 0.3, 0.3, '#6f8e9f');
  flaeche(S, '+x', s, x0 + 0.3, 0.3, '#6f8e9f');
  for (let du = -rad + 2.5; du < rad - 1; du += 3) {
    const hh = hv * Math.sqrt(1 - (du / rad) ** 2);
    S.box(0.3, hh, 0.3, x1 + 0.4, y0 + hh / 2, cz + du, '#e8ecee');
  }
  for (const f of [0.35, 0.7]) { const bb = 2 * rad * Math.sqrt(1 - f * f); S.box(0.3, 0.3, bb, x1 + 0.42, y0 + hv * f, cz, '#e8ecee'); }
  { const g = new THREE.TorusGeometry(rad, 0.5, 4, 22, PI); g.rotateY(PI / 2); g.scale(1, sy, 1); g.translate(x1 + 0.3, y0, cz); S.add(g, '#e8ecee'); }
}
function zug(S, x0, x1, zc, y0, farbe, streifen) {
  const L = x1 - x0;
  S.quader(x0, y0 + 0.5, zc - 1.45, x1 - 3, y0 + 4.1, zc + 1.45, farbe);
  S.quader(x1 - 3, y0 + 0.5, zc - 1.45, x1 - 1, y0 + 3.4, zc + 1.45, farbe);
  S.quader(x1 - 1, y0 + 0.5, zc - 1.2, x1, y0 + 2.4, zc + 1.2, farbe);
  S.quader(x1 - 3, y0 + 3.0, zc - 1.3, x1 - 1.6, y0 + 3.9, zc + 1.3, '#2f3b44');
  S.quader(x0, y0 + 2.5, zc - 1.47, x1 - 3, y0 + 3.3, zc + 1.47, '#3c4852');
  S.quader(x0, y0 + 1.1, zc - 1.48, x1 - 1, y0 + 1.5, zc + 1.48, streifen);
  for (let u = x0 + 26; u < x1 - 4; u += 26) S.quader(u - 0.4, y0 + 0.5, zc - 1.5, u + 0.4, y0 + 4.1, zc + 1.5, '#59636b');
}
export function hauptbahnhof(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const w = p.w ?? 136, d = p.d ?? 98;
  const hallen = p.hallen ?? waehle(r, [1, 2, 3]);
  const stein = p.stein ?? waehle(r, ['#e3d3bd', '#d9c4a8', '#cdbfa6', '#e8dfcf']);
  const hell = heller(stein, 0.05), dachF = waehle(r, ['#5d6a72', '#6f9a7d']);
  const kupfer = '#6f9a7d';
  const nur = !!p.nurEmpfang;
  const vp = nur ? 0 : 22, bt = nur ? d : 22; // Vorplatz- und Gebäudetiefe
  const zf = z + d - vp; // Front des Empfangsgebäudes
  const zb = zf - bt; // Rückseite = Hallenfront
  const hx0 = x + 2, hx1 = nur ? x + w + 2 : x + w - 26;
  if (!nur) {
  // Gleisfeld (offener Teil an +x)
  S.quader(hx1, 0.36, z, x + w, 0.45, zb, '#a39b8f');
  const muster = [];
  const span = zb - z - 4;
  const folge = ['G', 'B', 'G', 'G', 'B', 'G', 'G', 'B', 'G'];
  const breiten = { G: 4.6, B: 8 };
  const summe = folge.reduce((a, c) => a + breiten[c], 0), sk = span / summe;
  let zz = z + 2;
  for (const c of folge) { muster.push({ c, z0: zz, z1: zz + breiten[c] * sk }); zz += breiten[c] * sk; }
  for (const m of muster) {
    const zc = (m.z0 + m.z1) / 2;
    if (m.c === 'G') {
      S.quader(hx1, 0.45, zc - 1.4, x + w, 0.55, zc + 1.4, '#7d766c');
      S.quader(hx1, 0.55, zc - 0.8, x + w, 0.7, zc - 0.65, '#c9cccf');
      S.quader(hx1, 0.55, zc + 0.65, x + w, 0.7, zc + 0.8, '#c9cccf');
    } else {
      S.quader(hx1, 0.3, m.z0 + 0.4, x + w - 3, 1.3, m.z1 - 0.4, '#dcd7cd');
      S.quader(hx1, 1.3, m.z0 + 0.6, hx1 + 0.4, 1.32, m.z1 - 0.6, '#ffffff');
      S.quader(hx1, 4.4, m.z0 + 0.2, x + w - 6, 4.8, m.z1 - 0.2, '#e8ecee');
      for (let u = hx1 + 4; u < x + w - 6; u += 8) S.box(0.35, 3.1, 0.35, u, 2.85, zc, '#59636b');
    }
  }
  // Züge
  const gleise = muster.filter((m) => m.c === 'G');
  const zf1 = waehle(r, ['#f2f2ef', '#e9e6df']);
  zug(S, hx1 - 30, x + w - 8, (gleise[1].z0 + gleise[1].z1) / 2, 0.55, zf1, '#2f6f8f');
  zug(S, hx1 - 30, hx1 + 12, (gleise[4].z0 + gleise[4].z1) / 2, 0.55, '#e3b23c', '#3c4852');
  // Hallen
  const hb = (zb - z) / hallen;
  for (let i = 0; i < hallen; i++) {
    const cz = z + hb * (i + 0.5), rad = hb / 2 - 0.3;
    const y0 = hallen === 1 ? 3 : 6, hv = hallen === 1 ? rad * 0.82 : rad * 1.05;
    S.quader(hx0, 0, cz - rad - 0.3, hx1, y0, cz - rad + 0.3, stein);
    S.quader(hx0, 0, cz + rad - 0.3, hx1, y0, cz + rad + 0.3, stein);
    tonnenHalle(S, hx0, hx1, cz, rad, hv, y0, '#8f9aa3', '#a9c6d3');
  }
  }
  // Empfangsgebäude
  const bx0 = x + 6, bx1 = hx1 - 2, bL = bx1 - bx0;
  const mb = Math.min(34, bL * 0.3), mx0 = bx0 + bL * 0.45 - mb / 2, mx1 = mx0 + mb; // Mittelhalle
  const pav = 14;
  const fl = { geschosse: 3, gh: 4.4, raster: 3.4, fw: 1.6, fh: 2.6, bogen: (k) => k === 0, tiefe: 0.6, y0: 1.5 };
  const Hf = 1.5 + 3 * 4.4;
  // Flügel
  for (const [a, b] of [[bx0 + pav, mx0], [mx1, bx1 - pav]]) {
    lochBlock(S, a, zb, b - a, bt - 2, 0, Hf, stein, { ...fl, seiten: ['+z'] });
    satteldach(S, a, zb, b - a, bt - 2, Hf, 4.5, dachF, 'x', 4);
    gesims(S, a, zb, b - a, bt - 2, Hf, 0.6, 0.35, hell);
    gesims(S, a, zb, b - a, bt - 2, 1.5, 0.4, 0.15, hell);
  }
  // Eckpavillons
  for (const a of [bx0, bx1 - pav]) {
    lochBlock(S, a, zb, pav, bt, 0, Hf + 4.4, stein, { ...fl, geschosse: 4, raster: 3.3 });
    gesims(S, a, zb, pav, bt, Hf + 4.4, 0.7, 0.45, hell);
    pyramide(S, pav + 0.6, bt + 0.6, 6, a + pav / 2, Hf + 4.7, zb + bt / 2, dachF);
  }
  // Mittelhalle mit großem Bogenfenster
  const Hm = 27;
  S.quader(mx0, 0, zb, mx1, Hm, zf - 0.4, '#4a5763');
  const bogen = { u0: mx0 + 5, u1: mx1 - 5, v0: 4.5, v1: Hm - 3.5, bogen: true };
  const tueren = [0, 1, 2].map((i) => ({ u0: mx0 + 6 + i * ((mb - 12) / 3) + 0.8, u1: mx0 + 6 + (i + 1) * ((mb - 12) / 3) - 0.8, v0: 0.31, v1: 3.6, bogen: false }));
  lochwand(S, '+z', mx0, mx1, -0.3, Hm, zf + 0.6, 1.0, stein, [bogen, ...tueren]);
  for (let u = bogen.u0 + 2.4; u < bogen.u1 - 0.5; u += 2.4) {
    const du = u - (bogen.u0 + bogen.u1) / 2, rr = (bogen.u1 - bogen.u0) / 2;
    const hh = bogen.v1 - rr - bogen.v0 + Math.sqrt(Math.max(0, rr * rr - du * du));
    S.box(0.25, hh, 0.25, u, bogen.v0 + hh / 2, zf - 0.2, '#e8ecee');
  }
  for (let v = bogen.v0 + 3; v < bogen.v1 - 3; v += 3.2) S.box(bogen.u1 - bogen.u0, 0.25, 0.25, (bogen.u0 + bogen.u1) / 2, v, zf - 0.2, '#e8ecee');
  gesims(S, mx0, zb, mb, bt + 0.6, Hm, 0.9, 0.5, hell);
  { const g = new THREE.CylinderGeometry(mb / 2, mb / 2, bt, 24, 1, false, PI / 2, PI); g.rotateX(PI / 2); g.scale(1, 0.35, 1); g.translate((mx0 + mx1) / 2, Hm + 0.4, zb + bt / 2 + 0.3); S.add(g, kupfer); }
  for (const u of [mx0 + 1.2, mx1 - 1.2]) { S.box(2.4, Hm + 3, 2.4, u, (Hm + 3) / 2, zf + 0.3, hell); pyramide(S, 2.8, 2.8, 3, u, Hm + 3, zf + 0.3, kupfer); }
  schildPasst(scene, 'Hauptbahnhof', '+z', (mx0 + mx1) / 2, Hm - 1.6, zf + 0.6, 2.6, mb - 4, '#ffffff', '#24435e');
  // Vordach vor dem Haupteingang
  S.quader(mx0 + 3, 4.0, zf + 0.6, mx1 - 3, 4.5, zf + 5, '#e8ecee');
  // Uhrturm an der +x-Ecke
  const ut = 10, ux0 = bx1 - pav + 2, uz0 = zf - ut - 1.5;
  const Hu = p.turmHoehe ?? (nur ? 42 : 52);
  S.quader(ux0, 0, uz0, ux0 + ut, Hu, uz0 + ut, stein);
  for (const yy of [Hf + 4.4, Hu - 10]) gesims(S, ux0, uz0, ut, ut, yy, 0.7, 0.4, hell);
  for (const seite of ['+z', '+x']) {
    const f = seite === '+z' ? uz0 + ut : ux0 + ut, uc = seite === '+z' ? ux0 + ut / 2 : uz0 + ut / 2;
    uhr(S, seite, uc, Hu - 5.2, f, 3.2);
    platte(S, seite, uc - 1.3, Hf + 6, uc + 1.3, Hu - 12, f, '#4a5763', true);
  }
  gesims(S, ux0, uz0, ut, ut, Hu, 0.9, 0.6, hell);
  pyramide(S, ut + 1.2, ut + 1.2, 3, ux0 + ut / 2, Hu + 0.45, uz0 + ut / 2, kupfer);
  zyl(S, 2.2, 2.2, 3.4, ux0 + ut / 2, Hu + 3, uz0 + ut / 2, hell, 8);
  haube(S, 2.6, ux0 + ut / 2, Hu + 6.4, uz0 + ut / 2, kupfer, 1.3, 10);
  spitze(S, 0.2, 3.5, ux0 + ut / 2, Hu + 9.6, uz0 + ut / 2, '#d8b45a', 6);
  if (nur) return { hoehe: Hu + 13, teile: S.anzahl };
  // Vorplatz
  belag(S, x, zf, hx1 + 4, z + d - 0.5, '#e6e1d6');
  for (let u = x + 4; u < hx1; u += 6) S.quader(u, 0.36, zf + 1, u + 0.15, 0.38, z + d - 1.5, '#d6d0c3');
  for (let i = 0; i < 5; i++) auto(S, bx0 + pav + 6 + i * 5, zf + 9, 0, '#efe3b0', 0.36);
  bus(S, mx1 + 22, zf + 15, 0, waehle(r, ['#e3b23c', '#2f6f8f', '#3f7d56']), 0.36);
  for (let u = x + 8; u < hx1 - 2; u += 13) baum(S, u, z + d - 3.5, r, 0.9);
  // Bahnhofsuhr auf Mast
  const uu = mx0 - 6, uz = zf + 12;
  S.box(0.35, 5, 0.35, uu, 2.8, uz, '#3c4852');
  uhr(S, '+z', uu, 5.8, uz + 0.2, 1.0);
  uhr(S, '+x', uz, 5.8, uu + 0.2, 1.0);
  return { hoehe: Hu + 13, teile: S.anzahl };
}

// =====================================================================================
// 6. Bürohochhaus
// =====================================================================================
export function buerohochhaus(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const w = p.w ?? 26, d = p.d ?? 24;
  const G = p.geschosse ?? Math.round(zw(r, 12, 30));
  const variante = p.variante ?? waehle(r, ['glas', 'raster', 'band', 'rund', 'stufen']);
  const name = p.name ?? waehle(r, ['Hollenbach Bank', 'Talwerk Versicherung', 'Weserland Energie', 'Kessler Immobilien', 'Lindqvist AG', 'Brandtner & Co']);
  const gh = 3.7, H0 = 8;
  const glasF = p.glas ?? waehle(r, ['#5f87a3', '#6c9a96', '#4f6f86', '#7d8f9c']);
  const stein = p.farbe ?? waehle(r, ['#e6e2da', '#d6d9db', '#e3d6c4', '#c9ccce']);
  const pfosten = '#d5dfe5';
  // Sockelbau
  lochBlock(S, x, z, w, d, 0, H0, stein, { y0: 0, geschosse: 2, gh: 4, raster: 4, fw: 3.2, fh: 2.9, bruestung: 0.6, tiefe: 0.5, innen: '#4b5965' });
  gesims(S, x, z, w, d, H0, 0.5, 0.3, heller(stein, 0.04));
  const e = 2.2, tx0 = x + e, tz0 = z + e, tw = w - 2 * e, td = d - 2 * e;
  const Ht = H0 + G * gh;
  let top = Ht, schildFarbe = '#ffffff', sx0 = tx0, sz0 = tz0, sw = tw, sd = td;
  const glasTurm = (x0, z0, ww, dd, y0, n) => {
    S.quader(x0, y0, z0, x0 + ww, y0 + n * gh, z0 + dd, glasF);
    for (let k = 0; k <= n; k++) S.quader(x0 - 0.06, y0 + k * gh - 0.18, z0 - 0.06, x0 + ww + 0.06, y0 + k * gh + 0.1, z0 + dd + 0.06, pfosten);
    for (let u = x0 + 1.6; u < x0 + ww - 0.4; u += 1.6) S.box(0.14, n * gh, 0.14, u, y0 + (n * gh) / 2, z0 + dd + 0.04, pfosten);
    for (let u = z0 + 1.6; u < z0 + dd - 0.4; u += 1.6) S.box(0.14, n * gh, 0.14, x0 + ww + 0.04, y0 + (n * gh) / 2, u, pfosten);
  };
  if (variante === 'glas') {
    glasTurm(tx0, tz0, tw, td, H0, G);
    const krone = waehle(r, ['schraeg', 'flach', 'spitze']);
    S.quader(tx0 + 1, Ht, tz0 + 1, tx0 + tw - 1, Ht + 3, tz0 + td - 1, '#c9d1d6');
    if (krone === 'schraeg') { satteldach(S, tx0, tz0, tw, td, Ht, 7, glasF, 'z', 0); top = Ht + 7; }
    else if (krone === 'spitze') { zyl(S, 0.35, 0.6, 16, tx0 + tw / 2, Ht + 3, tz0 + td / 2, '#d5dfe5', 6); top = Ht + 19; }
    else top = Ht + 3;
  } else if (variante === 'raster') {
    lochBlock(S, tx0, tz0, tw, td, H0, Ht, stein, { y0: H0, geschosse: G, gh, raster: 2.4, fw: 1.55, fh: 2.3, tiefe: 0.55, innen: glasF });
    for (let u = tx0; u <= tx0 + tw + 0.01; u += tw / 4) S.box(0.6, G * gh, 0.5, u, H0 + (G * gh) / 2, tz0 + td + 0.2, heller(stein, 0.04));
    S.quader(tx0 - 0.3, Ht, tz0 - 0.3, tx0 + tw + 0.3, Ht + 1.2, tz0 + td + 0.3, heller(stein, 0.04));
    S.quader(tx0 + 2, Ht + 1.2, tz0 + 2, tx0 + tw - 4, Ht + 4, tz0 + td - 3, '#bfc5c9');
    schildFarbe = '#2f3b44'; top = Ht + 4;
  } else if (variante === 'band') {
    S.quader(tx0 + 0.3, H0, tz0 + 0.3, tx0 + tw - 0.3, Ht, tz0 + td - 0.3, glasF);
    for (let k = 0; k < G; k++) S.quader(tx0 - 0.2, H0 + k * gh, tz0 - 0.2, tx0 + tw + 0.2, H0 + k * gh + 1.25, tz0 + td + 0.2, stein);
    S.quader(tx0 - 0.2, Ht, tz0 - 0.2, tx0 + tw + 0.2, Ht + 1.6, tz0 + td + 0.2, stein);
    S.quader(tx0 + 3, Ht + 1.6, tz0 + 3, tx0 + tw - 3, Ht + 4.5, tz0 + td - 3, '#bfc5c9');
    top = Ht + 4.5;
  } else if (variante === 'rund') {
    const R = Math.min(tw, td) / 2 + 0.6, cx = tx0 + tw / 2, cz = tz0 + td / 2;
    zyl(S, R, R, G * gh, cx, H0, cz, glasF, 32);
    for (let k = 0; k <= G; k++) zyl(S, R + 0.12, R + 0.12, 0.3, cx, H0 + k * gh - 0.15, cz, pfosten, 32);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * PI; S.box(0.14, G * gh, 0.14, cx + Math.cos(a) * (R + 0.05), H0 + (G * gh) / 2, cz + Math.sin(a) * (R + 0.05), pfosten); }
    zyl(S, R - 1.5, R - 1.2, 3.5, cx, Ht, cz, '#c9d1d6', 24);
    zyl(S, R + 0.4, R + 0.4, 0.6, cx, Ht, cz, pfosten, 32);
    top = Ht + 3.5;
    sx0 = cx - R * 0.7; sz0 = cz - R * 0.7; sw = R * 1.4; sd = R * 1.4;
  } else {
    // stufen: drei Staffeln
    const n1 = Math.ceil(G * 0.5), n2 = Math.ceil(G * 0.3), n3 = G - n1 - n2;
    glasTurm(tx0, tz0, tw, td, H0, n1);
    const y2 = H0 + n1 * gh;
    S.quader(tx0, y2 - 0.1, tz0, tx0 + tw, y2 + 0.4, tz0 + td, stein);
    glasTurm(tx0 + 2.5, tz0 + 2.5, tw - 5, td - 5, y2 + 0.4, n2);
    const y3 = y2 + 0.4 + n2 * gh;
    S.quader(tx0 + 2.5, y3 - 0.1, tz0 + 2.5, tx0 + tw - 2.5, y3 + 0.4, tz0 + td - 2.5, stein);
    glasTurm(tx0 + 5, tz0 + 5, tw - 10, td - 10, y3 + 0.4, Math.max(1, n3));
    top = y3 + 0.4 + Math.max(1, n3) * gh;
    zyl(S, 0.3, 0.5, 12, tx0 + tw / 2, top, tz0 + td / 2, '#d5dfe5', 6);
    sx0 = tx0 + 5; sz0 = tz0 + 5; sw = tw - 10; sd = td - 10;
    const yS = top - 2;
    schildPasst(scene, name, '+z', sx0 + sw / 2, yS, sz0 + sd, 1.6, sw - 1, '#ffffff');
    schildPasst(scene, name, '+x', sz0 + sd / 2, yS, sx0 + sw, 1.6, sd - 1, '#ffffff');
    top += 12;
  }
  if (variante !== 'stufen') {
    const yS = variante === 'rund' ? Ht - 2.2 : Ht - 2.0;
    const fz = variante === 'rund' ? sz0 + sd + 0.9 : sz0 + sd, fx = variante === 'rund' ? sx0 + sw + 0.9 : sx0 + sw;
    schildPasst(scene, name, '+z', sx0 + sw / 2, yS, fz, 2.0, sw - 1.5, schildFarbe);
    schildPasst(scene, name, '+x', sz0 + sd / 2, yS, fx, 2.0, sd - 1.5, schildFarbe);
  }
  // Eingang
  S.quader(x + w * 0.3, 3.8, z + d, x + w * 0.7, 4.3, z + d + 3.5, '#e8ecee');
  return { hoehe: top, teile: S.anzahl };
}

// =====================================================================================
// 7. Discounter / Drogerie
// =====================================================================================
export const MARKEN = {
  preisfuchs: { name: 'Preisfuchs', farbe: '#e8742a', zweit: '#2d3a46', text: '#ffffff', stil: 'discounter' },
  sparkorb: { name: 'Sparkorb', farbe: '#3d8b4f', zweit: '#f2c23a', text: '#ffffff', stil: 'discounter' },
  rossberg: { name: 'Rossberg Drogerie', farbe: '#1f8f8a', zweit: '#ffffff', text: '#ffffff', stil: 'drogerie' },
  lindgruen: { name: 'Lindgrün Drogerie', farbe: '#7a4f9a', zweit: '#ffffff', text: '#ffffff', stil: 'drogerie' },
};
export function discounter(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const m = typeof p.marke === 'object' ? p.marke : MARKEN[p.marke ?? 'preisfuchs'];
  const drog = m.stil === 'drogerie';
  const w = p.w ?? (drog ? 38 : 50), d = p.d ?? (drog ? 46 : 50);
  const bt = drog ? 18 : 24, H = drog ? 6 : 6.8;
  const bx0 = x + 1, bx1 = x + w - 1, bz0 = z + 1, bz1 = z + 1 + bt;
  const wandF = drog ? '#f1efea' : waehle(r, ['#eceae4', '#e2e4e5']);
  S.quader(bx0, 0, bz0, bx1, H, bz1, wandF);
  // Fassadenpaneele
  for (let u = bx0 + 3; u < bx1 - 1; u += 3) S.box(0.08, H - 2, 0.06, u, (H - 2) / 2 + 0.3, bz1 + 0.03, dunkler(wandF, 0.05));
  // Glasfront
  const gl0 = drog ? bx0 + 4 : bx1 - 18, gl1 = bx1 - (drog ? 4 : 1.2);
  S.quader(gl0, 0.3, bz1, gl1, H - 1.9, bz1 + 0.15, '#56707f');
  for (let u = gl0 + 2.2; u < gl1; u += 2.2) S.box(0.15, H - 2.2, 0.2, u, (H - 1.6) / 2, bz1 + 0.18, '#e8ecee');
  S.quader(gl0 + (gl1 - gl0) / 2 - 2, 0.3, bz1 + 0.15, gl0 + (gl1 - gl0) / 2 + 2, 3, bz1 + 0.25, '#3c4852');
  // Blende in Markenfarbe
  S.quader(bx0 - 0.2, H - 1.9, bz0, bx1 + 0.2, H + 0.4, bz1 + 0.3, m.farbe);
  S.quader(bx0 - 0.2, H + 0.4, bz0, bx1 + 0.2, H + 0.65, bz1 + 0.3, m.zweit);
  if (drog) { S.quader(gl0 - 0.8, 0.3, bz1, gl0, H - 1.9, bz1 + 0.6, m.farbe); S.quader(gl1, 0.3, bz1, gl1 + 0.8, H - 1.9, bz1 + 0.6, m.farbe); }
  schildPasst(scene, m.name, '+z', drog ? (gl0 + gl1) / 2 : bx0 + (gl0 - bx0) / 2 + 4, H - 0.75, bz1 + 0.3, 1.5, drog ? gl1 - gl0 : gl0 - bx0 - 2, m.text);
  schildPasst(scene, m.name, '+x', (bz0 + bz1) / 2, H - 0.75, bx1 + 0.2, 1.5, bt - 2, m.text);
  // Vordach
  const v0 = drog ? (gl0 + gl1) / 2 - 4 : gl0 - 1, v1 = drog ? (gl0 + gl1) / 2 + 4 : gl1 + 0.5;
  S.quader(v0, H - 2.4, bz1, v1, H - 2.0, bz1 + (drog ? 2.6 : 4.2), drog ? m.farbe : '#f4f4f2');
  if (!drog) for (const u of [v0 + 0.5, gl1]) S.box(0.3, H - 2.7, 0.3, u, (H - 2.4) / 2 + 0.15, bz1 + 3.9, '#9aa3ab');
  // Dach
  S.quader(bx0 + 0.3, H + 0.65, bz0 + 0.3, bx1 - 0.3, H + 0.75, bz1 - 0.3, '#b9bec2');
  S.quader(bx0 + 4, H + 0.7, bz0 + 4, bx0 + 9, H + 2.2, bz0 + 8, '#c9cdd0');
  S.quader(bx0 + 11, H + 0.7, bz0 + 4, bx0 + 14, H + 1.8, bz0 + 7, '#c9cdd0');
  if (!drog) { S.quader(bx0 + 1, H + 0.7, bz0 + 2, bx0 + 16, H + 0.95, bz0 + bt - 3, '#3c4a5c'); for (let u = bz0 + 3.5; u < bz0 + bt - 3; u += 2.2) S.quader(bx0 + 1, H + 0.96, u - 0.05, bx0 + 16, H + 1.0, u + 0.05, '#7d8b98'); }
  // Einkaufswagen-Unterstand
  const ez = bz1 + 6;
  S.quader(gl1 - 9, 0.3, ez, gl1 - 3, 2.4, ez + 2.5, '#d6dadd');
  S.quader(gl1 - 9.3, 2.4, ez - 0.3, gl1 - 2.7, 2.7, ez + 2.8, m.farbe);
  for (let i = 0; i < 4; i++) S.box(0.9, 0.9, 2.0, gl1 - 8.3 + i * 1.3, 1.0, ez + 1.2, '#a3abb2');
  // Parkplatz
  const pz0 = bz1 + 9.5;
  if (z + d - pz0 > 6) parkplatz(S, x + 1, pz0, gl1 - 10 - x, z + d - pz0 - 0.5, r, { dichte: 0.55, baeume: !drog });
  // Pylon
  const px = x + w - 2.5, pz = z + d - 2.5, ph = drog ? 7 : 9;
  S.box(0.6, ph, 0.6, px, ph / 2, pz, '#9aa3ab');
  S.quader(px - 2, ph - 3.5, pz - 2, px + 2, ph, pz + 2, m.farbe);
  S.quader(px - 2, ph, pz - 2, px + 2, ph + 0.35, pz + 2, m.zweit);
  schildPasst(scene, m.name, '+z', px, ph - 1.75, pz + 2, 1.2, 3.8, m.text);
  schildPasst(scene, m.name, '+x', pz, ph - 1.75, px + 2, 1.2, 3.8, m.text);
  return { hoehe: Math.max(H + 2.2, ph), teile: S.anzahl };
}

// =====================================================================================
// 8. Fachmarktzentrum
// =====================================================================================
export const FACHMAERKTE = [
  { name: 'Baumarkt Hammerl', farbe: '#d9822b', wand: '#e9e6df', garten: true },
  { name: 'Möbel Kranz', farbe: '#7a3b2e', wand: '#ece5d7' },
  { name: 'Elektro Funke', farbe: '#2b5fa8', wand: '#e2e4e6' },
  { name: 'Tierwelt', farbe: '#5a9a3c', wand: '#eceae4' },
  { name: 'Schuh-Depot', farbe: '#8a2f6a', wand: '#ece8e4' },
  { name: 'Getränkeland', farbe: '#1f7a8c', wand: '#e6e8e6' },
  { name: 'Textil Kober', farbe: '#b8434b', wand: '#efe9df' },
  { name: 'Preisfuchs', farbe: '#e8742a', wand: '#eceae4' },
];
export function fachmarktzentrum(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const w = p.w ?? 120, d = p.d ?? 84;
  const n = p.anzahl ?? Math.round(zw(r, 3, 5.4));
  const mieter = p.mieter ?? mische(r, FACHMAERKTE).slice(0, n);
  const name = p.name ?? waehle(r, ['Fachmarktzentrum Am Kreuz', 'Gewerbepark Süd', 'Einkaufspark Ost', 'Handelshof West']);
  const bt = 30;
  const gewichte = mieter.map((mm) => (mm.garten ? 1.6 : 0.8 + r() * 0.6));
  const summe = gewichte.reduce((a, b) => a + b, 0);
  let u = x + 1;
  let hMax = 0;
  mieter.forEach((mm, i) => {
    const bw = ((w - 2) * gewichte[i]) / summe;
    const H = mm.garten ? 10 : zw(r, 7, 9.5);
    hMax = Math.max(hMax, H);
    const ub = mm.garten ? bw * 0.68 : bw;
    S.quader(u, 0, z + 1, u + ub - 0.3, H, z + 1 + bt, mm.wand);
    // Blende
    S.quader(u - 0.1, H - 2.4, z + 1 + bt - 0.1, u + ub - 0.2, H + 0.6, z + 1 + bt + 0.3, mm.farbe);
    schildPasst(scene, mm.name, '+z', u + ub / 2, H - 0.9, z + 1 + bt + 0.3, 1.8, ub - 3, '#ffffff');
    // Eingang
    S.quader(u + ub / 2 - 3, 0.3, z + bt + 1, u + ub / 2 + 3, 4.2, z + bt + 1.15, '#56707f');
    // Dachaufbauten
    S.quader(u + 0.2, H, z + 1.2, u + ub - 0.5, H + 0.1, z + bt + 0.8, '#b9bec2');
    S.quader(u + 3, H, z + 6, u + 7, H + 1.4, z + 10, '#c9cdd0');
    for (let q = z + 5; q < z + bt - 2; q += 6) S.quader(u + 2, H + 0.1, q, u + ub - 3, H + 0.5, q + 1.4, '#a9c6d3');
    if (i === mieter.length - 1) {
      S.quader(u + ub - 0.5, H - 2.4, z + 1, u + ub - 0.1, H + 0.6, z + 1 + bt + 0.3, mm.farbe);
      schildPasst(scene, mm.name, '+x', z + 1 + bt / 2, H - 0.9, u + ub - 0.1, 1.8, bt - 4, '#ffffff');
    }
    if (mm.garten) {
      // Gartencenter: Glashaus + Zaun
      const g0 = u + ub, g1 = u + bw - 0.5;
      S.quader(g0, 0, z + 1, g1, 3.2, z + 1 + bt * 0.55, '#a9c6d3');
      satteldach(S, g0, z + 1, g1 - g0, bt * 0.55, 3.2, 1.6, '#c7dce5', 'z', 0);
      for (let q = g0 + 2; q < g1; q += 2.5) S.box(0.12, 3.2, 0.12, q, 1.6, z + 1 + bt * 0.55 + 0.05, '#ffffff');
      S.quader(g0, 0.3, z + 1 + bt * 0.55 + 0.5, g1, 2, z + 1 + bt * 0.55 + 0.62, '#59636b');
      S.quader(g1 - 0.12, 0.3, z + 1 + bt * 0.55 + 0.5, g1, 2, z + 1 + bt, '#59636b');
      for (let q = g0 + 2; q < g1 - 1; q += 3) baum(S, q, z + 1 + bt * 0.8, r, 0.45);
    }
    u += bw;
  });
  // Durchgehendes Vordach
  S.quader(x + 1, 4.4, z + bt + 1, x + w - 1, 4.8, z + bt + 5, '#f4f4f2');
  for (let q = x + 4; q < x + w - 1; q += 8) S.box(0.35, 4.1, 0.35, q, 2.35, z + bt + 4.6, '#9aa3ab');
  // Parkplatz
  const pz0 = z + bt + 9;
  parkplatz(S, x + 2, pz0, w - 12, z + d - pz0 - 1, r, { dichte: 0.58, baeume: true });
  // Pylon mit allen Logos
  const px = x + w - 4, pz = z + d - 4, ph = 15;
  S.box(1.2, ph, 0.9, px, ph / 2, pz, '#59636b');
  S.quader(px - 2.8, ph - 2.6, pz - 0.6, px + 2.8, ph + 0.4, pz + 0.6, '#2f3b44');
  schildPasst(scene, name.split(' ').slice(-2).join(' '), '+z', px, ph - 1.1, pz + 0.6, 1.0, 5.2, '#ffffff');
  mieter.slice(0, 4).forEach((mm, i) => {
    const y = ph - 3.6 - i * 2.2;
    S.quader(px - 2.6, y - 0.95, pz - 0.5, px + 2.6, y + 0.95, pz + 0.5, mm.farbe);
    schildPasst(scene, mm.name, '+z', px, y, pz + 0.5, 0.9, 4.8, '#ffffff');
  });
  return { hoehe: Math.max(hMax + 1.4, ph + 0.4), teile: S.anzahl };
}

// =====================================================================================
// 9. Konkurrenz-Warenhäuser und Modehäuser
// =====================================================================================
export const KONKURRENZ = {
  kaufstadt: { name: 'Kaufstadt', farbe: '#2a5ba8' },
  brenner: { name: 'Modehaus Brenner', farbe: '#2f6b4a' },
  primo: { name: 'PRIMO MODA', farbe: '#1c1f23' },
  ostermann: { name: 'Ostermann', farbe: '#1f6f78' },
  zentra: { name: 'Zentra', farbe: '#1f3f73' },
  lederer: { name: 'Lederer', farbe: '#22252a' },
  kaufring: { name: 'Kaufring', farbe: '#3a7d44' },
};
function konkurrenzAlt(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const marke = p.marke ?? 'kaufstadt';
  const m = KONKURRENZ[marke];
  if (marke === 'kaufstadt' || marke === 'ostermann') {
    // Nachkriegs-Warenhaus mit Kachel-/Wabenfassade
    const w = p.w ?? 52, d = p.d ?? 40, G = p.geschosse ?? 4, eg = 6, gh = 4.6, H = eg + G * gh;
    const kachel = marke === 'kaufstadt' ? '#eef0f1' : '#e9e3d6', fuge = marke === 'kaufstadt' ? '#c3cbd2' : '#cfc6b5';
    S.quader(x, 0, z, x + w - 1.4, eg, z + d - 1.4, '#4b5965');
    S.quader(x, eg, z, x + w, H, z + d, fuge);
    const k = 2.0;
    for (const seite of ['+z', '+x']) {
      const L = seite === '+z' ? w : d, u0 = seite === '+z' ? x : z, f = seite === '+z' ? z + d : x + w;
      const nu = Math.floor(L / k), nv = Math.floor((H - eg - 1.2) / k), off = (L - nu * k) / 2;
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
        const u = u0 + off + (i + 0.5) * k, y = eg + 0.4 + (j + 0.5) * k;
        const tief = (i + j) % 2 ? 0.45 : 0.25;
        if (marke === 'ostermann') {
          if (seite === '+z') S.box(1.2, 1.7, tief, u, y, f + tief / 2, kachel);
          else S.box(tief, 1.7, 1.2, f + tief / 2, y, u, kachel);
        } else {
          const g = new THREE.CylinderGeometry(k * 0.52, k * 0.52, tief, 6); g.rotateX(PI / 2); g.rotateZ(PI / 6);
          S.add(aufSeite(g, seite, u + (j % 2 ? k / 2 : 0) * 0 , y, f + tief / 2), kachel);
        }
      }
      // Fensterband unter dem Dach
      if (seite === '+z') S.quader(x, H - 1.2, z + d, x + w, H - 0.3, z + d + 0.1, '#56707f');
      else S.quader(x + w, H - 1.2, z, x + w + 0.1, H - 0.3, z + d, '#56707f');
    }
    // Blaue Vordachkante + Schaufenster
    S.quader(x - 0.3, eg - 1.4, z + d - 1.6, x + w + 0.3, eg - 0.3, z + d + 2.5, m.farbe);
    S.quader(x + w - 1.6, eg - 1.4, z - 0.3, x + w + 2.5, eg - 0.3, z + d + 2.5, m.farbe);
    for (let u = x + 4; u < x + w - 2; u += 8) S.box(0.6, eg - 1.4, 0.6, u, (eg - 1.4) / 2, z + d - 1.0, '#e9ebec');
    for (let u = z + 4; u < z + d - 2; u += 8) S.box(0.6, eg - 1.4, 0.6, x + w - 1.0, (eg - 1.4) / 2, u, '#e9ebec');
    gesims(S, x, z, w, d, H, 0.6, 0.3, '#f4f4f2');
    // Logo groß auf beiden Seiten, weißer Grund
    const yL = eg + (H - eg) * 0.62;
    S.quader(x + w * 0.2, yL - 2.6, z + d + 0.4, x + w * 0.8, yL + 2.6, z + d + 0.55, '#ffffff');
    S.quader(x + w + 0.4, yL - 2.6, z + d * 0.18, x + w + 0.55, yL + 2.6, z + d * 0.82, '#ffffff');
    schildPasst(scene, m.name, '+z', x + w / 2, yL, z + d + 0.3, 3.8, w * 0.56, m.farbe);
    schildPasst(scene, m.name, '+x', z + d / 2, yL, x + w + 0.3, 3.8, d * 0.6, m.farbe);
    // Dach: Technik + Logowürfel
    S.quader(x + 0.6, H + 0.3, z + 0.6, x + w - 0.6, H + 0.4, z + d - 0.6, '#b9bec2');
    parkplatz(S, x + 2, z + 2, w - 14, d - 4, r, { y: H + 0.4, dichte: 0.5 });
    S.quader(x + w - 11, H + 0.4, z + 2, x + w - 3, H + 3.6, z + 12, '#c9cdd0');
    S.quader(x + w - 9, H, z + d - 9, x + w - 3, H + 6, z + d - 3, m.farbe);
    schild(scene, m.name[0], '+z', x + w - 6, H + 3, z + d - 3.3, 4.5, '#ffffff');
    schild(scene, m.name[0], '+x', z + d - 6, H + 3, x + w - 3.3, 4.5, '#ffffff');
    return { hoehe: H + 6, teile: S.anzahl };
  }
  if (marke === 'brenner') {
    // Gründerzeit-Modehaus mit Eckturm, grünen Markisen
    const w = p.w ?? 32, d = p.d ?? 26, G = p.geschosse ?? 3, eg = 6, gh = 4.2, H = eg + G * gh;
    const stein = p.farbe ?? waehle(r, ['#e3d3bd', '#e8dcc6', '#ece5d7']), hell = heller(stein, 0.05);
    const ob = { y0: eg, geschosse: G, gh, raster: 3.4, fw: 1.5, fh: 2.6, bogen: (k) => k === G - 1, tiefe: 0.6 };
    lochBlock(S, x, z, w, d, eg, H, stein, ob);
    for (const seite of ['+z', '+x']) {
      const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d, f = seite === '+z' ? z + d : x + w;
      baenke(S, seite, rasterLoecher(u0, u0 + L, ob), f, hell);
      const lo = rasterLoecher(u0, u0 + L - (seite === '+z' ? 6 : 6), { y0: 0, geschosse: 1, gh: eg, raster: 5.2, fw: 4.0, fh: 4.4, bruestung: 0.6, bogen: true });
      S.quader(seite === '+z' ? x : x, 0, seite === '+z' ? z : z, x + w - 0.3, eg, z + d - 0.3, '#56636e');
      lochwand(S, seite, u0, u0 + L, -0.3, eg, f, 0.6, hell, lo);
      for (const l of lo) markise(S, x, z, w, d, seite, eg - 1.2, l.u0, l.u1 - l.u0, m.farbe);
      // Pilaster
      for (let i = 0; i <= Math.floor(L / 6.8); i++) {
        const u = u0 + 0.4 + i * 6.8;
        if (u > u0 + L - 5) break;
        if (seite === '+z') S.box(0.8, H - eg, 0.4, u, eg + (H - eg) / 2, f + 0.2, hell);
        else S.box(0.4, H - eg, 0.8, f + 0.2, eg + (H - eg) / 2, u, hell);
      }
      // Schild auf grüner Blende
      const f2 = f + 0.35;
      if (seite === '+z') S.quader(u0 + 2, eg + 0.1, f, u0 + L - 7, eg + 1.5, f2, m.farbe); else S.quader(f, eg + 0.1, u0 + 2, f2, eg + 1.5, u0 + L - 7, m.farbe);
      schildPasst(scene, m.name, seite, u0 + (L - 5) / 2, eg + 0.8, f2 - 0.3, 1.1, L - 11, '#f3ead2');
    }
    gesims(S, x, z, w, d, eg, 0.5, 0.25, hell);
    gesims(S, x, z, w, d, H, 0.9, 0.5, hell);
    // Mansarddach
    satteldach(S, x, z, w, d, H + 0.45, 5, '#56636c', 'x', d * 0.55);
    for (let u = x + 3; u < x + w - 7; u += 4.2) {
      S.quader(u - 0.9, H + 0.8, z + d - 2.0, u + 0.9, H + 3.6, z + d - 1.2, hell);
      S.quader(u - 0.55, H + 1.1, z + d - 1.2, u + 0.55, H + 3.0, z + d - 1.1, '#56636e');
    }
    // Eckturm mit Kuppel
    const cx = x + w - 3.2, cz = z + d - 3.2, Rt = 4.2;
    zyl(S, Rt, Rt, H + 3, cx, 0, cz, stein, 16);
    for (let k = 0; k < G; k++) zyl(S, Rt + 0.05, Rt + 0.05, 2.6, cx, eg + k * gh + 0.9, cz, '#55636f', 16);
    for (let k = 0; k <= G; k++) zyl(S, Rt + 0.25, Rt + 0.25, 0.4, cx, eg + k * gh, cz, hell, 16);
    zyl(S, Rt + 0.4, Rt + 0.4, 0.6, cx, H + 3, cz, hell, 16);
    drehform(S, [[0, 0], [Rt + 0.2, 0], [Rt, 1.8], [Rt * 0.7, 4.2], [Rt * 0.25, 5.6], [0.4, 6.2], [0, 6.2]], cx, H + 3.6, cz, FARBEN.kupfer[0], 16);
    spitze(S, 0.2, 3, cx, H + 9.8, cz, '#d8b45a', 6);
    zyl(S, Rt + 0.1, Rt + 0.1, 6.1, cx, -0.1, cz, '#56636e', 16);
    zyl(S, Rt + 0.3, Rt + 0.3, 1.4, cx, eg - 1.2, cz, m.farbe, 16);
    return { hoehe: H + 13, teile: S.anzahl };
  }
  // primo: schwarzer Glaskubus mit hellen Schaufenstern
  const w = p.w ?? 34, d = p.d ?? 26, H = p.hoehe ?? 21;
  const schwarz = m.farbe, hellInnen = '#f1e9da';
  S.quader(x, 0, z, x + w, H, z + d, schwarz);
  // zweigeschossige Schaufenster
  const sch = 8.6;
  S.quader(x + 1.2, 0.3, z + d - 0.2, x + w - 1.2, sch, z + d + 0.05, hellInnen);
  S.quader(x + w - 0.2, 0.3, z + 1.2, x + w + 0.05, sch, z + d - 1.2, hellInnen);
  for (let u = x + 1.2; u <= x + w - 1.1; u += (w - 2.4) / 5) S.box(0.3, sch - 0.3, 0.3, u, (sch + 0.3) / 2, z + d + 0.1, schwarz);
  for (let u = z + 1.2; u <= z + d - 1.1; u += (d - 2.4) / 4) S.box(0.3, sch - 0.3, 0.3, x + w + 0.1, (sch + 0.3) / 2, u, schwarz);
  S.box(w - 2.4, 0.3, 0.3, x + w / 2, 4.4, z + d + 0.1, schwarz);
  S.box(0.3, 0.3, d - 2.4, x + w + 0.1, 4.4, z + d / 2, schwarz);
  // Figuren im Schaufenster
  for (let u = x + 3; u < x + w - 2; u += 3.4) { S.box(0.6, 1.7, 0.5, u, 1.25, z + d - 0.05, '#c9c2b5'); S.box(0.35, 0.35, 0.35, u, 2.3, z + d - 0.05, '#c9c2b5'); }
  // vertikale Schlitzfenster unregelmäßig
  for (const seite of ['+z', '+x']) {
    const L = seite === '+z' ? w : d, u0 = seite === '+z' ? x : z, f = seite === '+z' ? z + d : x + w;
    for (let u = u0 + 1.5; u < u0 + L - 1.5; u += 1.6) {
      if (r() < 0.45) continue;
      const y0 = sch + 1 + r() * 2, y1 = H - 3.5 - r() * 2;
      if (seite === '+z') S.quader(u, y0, f, u + 0.6, y1, f + 0.08, '#6b7680'); else S.quader(f, y0, u, f + 0.08, y1, u + 0.6, '#6b7680');
    }
  }
  // Auskragende Kante und Schriftzug
  S.quader(x - 0.2, H - 2.6, z - 0.2, x + w + 1.2, H + 0.3, z + d + 1.2, '#2a2e33');
  S.quader(x + 0.6, H + 0.3, z + 0.6, x + w + 0.4, H + 0.4, z + d + 0.4, '#3c4248');
  schildPasst(scene, m.name, '+z', x + w / 2, H - 1.3, z + d + 1.2, 1.8, w - 4, '#ffffff');
  schildPasst(scene, m.name, '+x', z + d / 2, H - 1.3, x + w + 1.2, 1.8, d - 4, '#ffffff');
  S.quader(x + 4, H + 0.4, z + 4, x + 12, H + 2.4, z + 10, '#2f3338');
  return { hoehe: H + 2.4, teile: S.anzahl };
}

// =====================================================================================
// 10. Theater / Oper / Museum, Markthalle
// =====================================================================================
function portikus(S, scene, u0, u1, f, H, tiefe, stein, n, o = {}) {
  const hell = heller(stein, 0.05);
  // Stufen
  for (let i = 0; i < 3; i++) S.quader(u0 - 1 + i * 0.3, 0.3 + i * 0.35, f - 0.5, u1 + 1 - i * 0.3, 0.3 + (i + 1) * 0.35, f + tiefe + 2.4 - i * 0.8, hell);
  const y0 = 1.35, hS = H - y0 - 2.2;
  for (let i = 0; i < n; i++) {
    const u = u0 + 0.8 + (i * (u1 - u0 - 1.6)) / (n - 1);
    saeule(S, u, y0, f + tiefe, hS, 0.62, hell);
  }
  S.quader(u0, y0 + hS, f, u1, y0 + hS + 2.2, f + tiefe + 0.8, stein);
  S.quader(u0 - 0.2, y0 + hS + 2.0, f, u1 + 0.2, y0 + hS + 2.4, f + tiefe + 1.0, hell);
  // Giebeldreieck
  const s = new THREE.Shape(); const yg = y0 + hS + 2.4, hg = (u1 - u0) * 0.2;
  s.moveTo(u0 - 0.2, yg); s.lineTo(u1 + 0.2, yg); s.lineTo((u0 + u1) / 2, yg + hg); s.lineTo(u0 - 0.2, yg);
  flaeche(S, '+z', s, f + tiefe + 1.0, tiefe + 1.0, hell);
  const s2 = new THREE.Shape(); s2.moveTo(u0 + 1.5, yg + 0.5); s2.lineTo(u1 - 1.5, yg + 0.5); s2.lineTo((u0 + u1) / 2, yg + hg - 0.7); s2.lineTo(u0 + 1.5, yg + 0.5);
  flaeche(S, '+z', s2, f + tiefe + 0.95, 0.2, stein);
  // Dachschräge über dem Giebel
  const g = dachProfil(tiefe + 1.6, u1 - u0 + 1.0, hg + 0.3, 0, 'z'); g.translate((u0 + u1) / 2, yg - 0.1, f + (tiefe + 1.0) / 2 - 0.2); S.add(g, o.dach ?? '#5d6a72');
  if (o.name) schildPasst(scene, o.name, '+z', (u0 + u1) / 2, y0 + hS + 1.1, f + tiefe + 0.8, 1.2, u1 - u0 - 3, '#3a2e24');
  return yg + hg;
}
function kulturbauKlassisch(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const art = p.art ?? waehle(r, ['theater', 'oper', 'museum']);
  const stein = p.farbe ?? waehle(r, ['#ece5d7', '#e3d3bd', '#e8dfcf', '#dcd2c2']);
  const hell = heller(stein, 0.05);
  const kupfer = FARBEN.kupfer[0], dachF = '#5d6a72';
  if (art === 'museum') {
    const w = p.w ?? 64, d = p.d ?? 32, H = 15;
    const name = p.name ?? 'Kunstmuseum';
    const ob = { y0: 1.4, geschosse: 2, gh: 6.4, raster: 5, fw: 2, fh: 4.0, bogen: (k) => k === 1, tiefe: 0.6, innen: '#55636f' };
    lochBlock(S, x, z, w, d - 5, 0, H, stein, ob);
    gesims(S, x, z, w, d - 5, 1.4, 0.5, 0.2, hell); gesims(S, x, z, w, d - 5, H, 1.0, 0.5, hell); gesims(S, x, z, w, d - 5, 7.8, 0.4, 0.2, hell);
    S.quader(x + 0.5, H + 0.5, z + 0.5, x + w - 0.5, H + 1.8, z + d - 5.5, hell);
    const pu0 = x + w / 2 - 12, pu1 = x + w / 2 + 12;
    const top = portikus(S, scene, pu0, pu1, z + d - 5, H + 1.8, 3.8, stein, 8, { name, dach: dachF });
    // Kuppel auf Tambour
    const cx = x + w / 2, cz = z + (d - 5) / 2;
    zyl(S, 8, 8, 6, cx, H + 1.8, cz, stein, 20);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 2 * PI; S.box(1.0, 3.2, 1.0, cx + Math.cos(a) * 8, H + 4.6, cz + Math.sin(a) * 8, '#55636f', -a); }
    zyl(S, 8.5, 8.5, 0.7, cx, H + 7.8, cz, hell, 20);
    haube(S, 8, cx, H + 8.5, cz, kupfer, 0.85, 20);
    zyl(S, 1.4, 1.4, 2.6, cx, H + 15, cz, hell, 8);
    haube(S, 1.6, cx, H + 17.6, cz, kupfer, 1, 8);
    belag(S, x - 5, z + d - 1, x + w + 5, z + d + 6, '#e2ddd2');
    return { hoehe: Math.max(top, H + 19.5), teile: S.anzahl };
  }
  if (art === 'theater') {
    const w = p.w ?? 40, d = p.d ?? 46, H = 16;
    const name = p.name ?? 'Stadttheater';
    const ob = { y0: 1.4, geschosse: 3, gh: 4.8, raster: 3.6, fw: 1.6, fh: 2.8, bogen: (k) => k === 1, tiefe: 0.6 };
    lochBlock(S, x, z, w, d - 6, 0, H, stein, ob);
    for (const seite of ['+z', '+x']) { const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d - 6, f = seite === '+z' ? z + d - 6 : x + w; baenke(S, seite, rasterLoecher(u0, u0 + L, ob), f, hell); }
    gesims(S, x, z, w, d - 6, H, 1.0, 0.5, hell); gesims(S, x, z, w, d - 6, 6.2, 0.4, 0.2, hell);
    satteldach(S, x, z, w, d - 6, H + 0.5, 3, dachF, 'x', (d - 6) * 0.6);
    // Bühnenturm
    S.quader(x + 6, H, z + 2, x + w - 6, H + 13, z + 16, stein);
    gesims(S, x + 6, z + 2, w - 12, 14, H + 13, 0.8, 0.4, hell);
    satteldach(S, x + 6, z + 2, w - 12, 14, H + 13.4, 3.5, kupfer, 'x', 2);
    const top = portikus(S, scene, x + w / 2 - 11, x + w / 2 + 11, z + d - 6, H, 4.2, stein, 6, { name, dach: kupfer });
    // Figuren auf dem Giebel
    spitze(S, 0.6, 2.2, x + w / 2, top - 0.2, z + d - 1, hell, 6);
    belag(S, x - 5, z + d - 1, x + w + 5, z + d + 6, '#e2ddd2');
    return { hoehe: H + 17, teile: S.anzahl };
  }
  // Oper: Bogenloggia, Zuschauerrundbau, Bühnenturm mit Kupferdach
  const w = p.w ?? 58, d = p.d ?? 50, H = 18;
  const name = p.name ?? 'Opernhaus';
  const ob = { y0: 1.4, geschosse: 3, gh: 5.4, raster: 4.2, fw: 2.0, fh: 3.4, bogen: true, tiefe: 0.7 };
  lochBlock(S, x, z, w, d - 8, 0, H, stein, ob);
  gesims(S, x, z, w, d - 8, H, 1.2, 0.6, hell); gesims(S, x, z, w, d - 8, 6.8, 0.5, 0.25, hell);
  S.quader(x, H + 0.6, z, x + w, H + 1.8, z + d - 8, hell);
  // Loggia-Vorbau
  const lu0 = x + 10, lu1 = x + w - 10, lf = z + d - 8, n = 7, bw = (lu1 - lu0) / n;
  const lo = []; for (let i = 0; i < n; i++) { const c = lu0 + (i + 0.5) * bw; lo.push({ u0: c - bw * 0.34, u1: c + bw * 0.34, v0: 1.6, v1: 6.4, bogen: true }); lo.push({ u0: c - bw * 0.3, u1: c + bw * 0.3, v0: 8.2, v1: 14.4, bogen: true }); }
  S.quader(lu0, 0, lf, lu1, H + 1, lf + 4.5, '#4f5c66');
  lochwand(S, '+z', lu0, lu1, -0.3, H + 1, lf + 6, 1.4, hell, lo);
  for (let i = 0; i < 3; i++) S.quader(lu0 - 1 + i * 0.3, 0.3 + i * 0.35, lf + 5, lu1 + 1 - i * 0.3, 0.65 + i * 0.35, lf + 8 - i * 0.8, hell);
  S.quader(lu0 - 0.3, H + 1, lf, lu1 + 0.3, H + 2.4, lf + 6.3, stein);
  schildPasst(scene, name, '+z', (lu0 + lu1) / 2, H - 0.8, lf + 6, 1.8, lu1 - lu0 - 6, '#3a2e24');
  // Statuen auf der Attika
  for (let i = 0; i <= n; i++) { const u = lu0 + i * bw; S.box(0.7, 2.2, 0.7, u, H + 3.5, lf + 5.6, hell); }
  // Zuschauerhaus: flache Kupferkuppel
  const cx = x + w / 2, cz = z + (d - 8) * 0.55;
  zyl(S, 15, 15, 4, cx, H + 1.8, cz, stein, 24);
  haube(S, 15.4, cx, H + 5.8, cz, kupfer, 0.42, 24);
  zyl(S, 1.8, 1.8, 2.2, cx, H + 12, cz, hell, 8);
  haube(S, 2, cx, H + 14.2, cz, kupfer, 1, 8);
  // Bühnenturm
  S.quader(x + 12, H, z + 1, x + w - 12, H + 18, z + 12, stein);
  gesims(S, x + 12, z + 1, w - 24, 11, H + 18, 0.8, 0.4, hell);
  satteldach(S, x + 12, z + 1, w - 24, 11, H + 18.4, 4, kupfer, 'x', 1);
  // Figur oben
  S.box(1, 2.6, 1, x + w / 2, H + 23.6, z + 6.5, '#d8b45a');
  belag(S, x - 5, z + d - 1, x + w + 5, z + d + 6, '#e2ddd2');
  return { hoehe: H + 25, teile: S.anzahl };
}

function markthalleAlt(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const variante = p.variante ?? waehle(r, ['backstein', 'eisen']);
  const w = p.w ?? 54, d = p.d ?? 30;
  const dt = d - 8; // Halle, davor Marktstände
  const back = variante === 'backstein';
  const wand = back ? waehle(r, ['#b06a52', '#a8664f', '#b9785e']) : '#e3d3bd';
  const hell = back ? '#ece5d7' : '#f1eadc';
  const Hw = 11;
  const lo = (u0, L) => { const n = Math.floor(L / 5.4), b = L / n, o = []; for (let i = 0; i < n; i++) { const c = u0 + (i + 0.5) * b; o.push({ u0: c - b * 0.32, u1: c + b * 0.32, v0: 1.4, v1: Hw - 1.4, bogen: true }); } return o; };
  S.quader(x, 0, z, x + w - 0.3, Hw, z + dt - 0.3, '#4f5c66');
  lochwand(S, '+z', x, x + w, -0.3, Hw, z + dt, 0.6, wand, lo(x, w));
  lochwand(S, '+x', z, z + dt, -0.3, Hw, x + w, 0.6, wand, lo(z, dt).filter((l, i, a) => i !== Math.floor(a.length / 2)));
  gesims(S, x, z, w, dt, Hw, 0.6, 0.35, hell);
  for (let u = x; u <= x + w; u += w / 10) S.box(0.9, Hw, 0.5, u, Hw / 2, z + dt + 0.2, hell);
  // Giebel +x mit Fächerfenster
  const hr = dt * 0.42;
  const sg = new THREE.Shape(); sg.moveTo(z - 0.2, Hw); sg.lineTo(z + dt + 0.2, Hw); sg.lineTo(z + dt / 2, Hw + hr); sg.lineTo(z - 0.2, Hw);
  flaeche(S, '+x', sg, x + w + 0.2, 0.8, wand);
  platte(S, '+x', z + dt / 2 - 4.5, Hw - 6.2, z + dt / 2 + 4.5, Hw + hr * 0.62, x + w + 0.2, '#56707f', true);
  for (let i = -3; i <= 3; i++) S.box(0.2, 0.2, 0.2, x + w + 0.45, Hw + hr * 0.2 + Math.abs(i) * 0, z + dt / 2 + i * 1.2, hell);
  platte(S, '+x', z + dt / 2 - 2.4, 0.3, z + dt / 2 + 2.4, 5.6, x + w, '#4a3a2e', true, 0.25);
  schildPasst(scene, 'Markthalle', '+x', z + dt / 2, Hw + 0.9, x + w + 0.25, 1.3, dt * 0.35, back ? '#ffffff' : '#3a2e24', null);
  // Dach mit Oberlichtaufsatz
  if (back) {
    satteldach(S, x - 0.4, z - 0.4, w + 0.4, dt + 0.8, Hw, hr, '#5d6a72', 'x', 0.2);
    S.quader(x + 4, Hw + hr - 1.6, z + dt / 2 - 3, x + w - 6, Hw + hr + 1.8, z + dt / 2 + 3, '#8fb2c4');
    for (let u = x + 5; u < x + w - 6; u += 2.4) S.box(0.2, 3.4, 6.1, u, Hw + hr + 0.1, z + dt / 2, hell);
    satteldach(S, x + 3.6, z + dt / 2 - 3.6, w - 9.2, 7.2, Hw + hr + 1.8, 2, '#5d6a72', 'x', 0.2);
  } else {
    const g = new THREE.CylinderGeometry(dt / 2, dt / 2, w + 0.2, 26, 1, true, 0, PI); g.rotateZ(PI / 2); g.scale(1, hr / (dt / 2), 1); g.translate(x + w / 2 - 0.2, Hw, z + dt / 2); S.add(g, '#a9c6d3');
    for (let u = x + 0.5; u <= x + w; u += 4.5) { const t = new THREE.TorusGeometry(dt / 2 + 0.1, 0.22, 4, 20, PI); t.rotateY(PI / 2); t.scale(1, hr / (dt / 2), 1); t.translate(u, Hw, z + dt / 2); S.add(t, '#56636c'); }
  }
  // Marktstände
  const farben = ['#c9483e', '#2f6f8f', '#3f7d56', '#d39a2b', '#ffffff'];
  for (let u = x + 3; u < x + w - 4; u += 6.5) {
    const zz = z + dt + 3.5;
    S.quader(u, 0.3, zz - 1.2, u + 4.4, 1.3, zz + 1.2, '#b88a5a');
    for (let q = 0; q < 3; q++) S.box(1.1, 0.35, 1.8, u + 0.8 + q * 1.4, 1.5, zz, waehle(r, ['#d9533e', '#e8b33a', '#7cb24f', '#e07f2e', '#8e4a8c']));
    for (const [a, b] of [[u + 0.1, zz - 1.1], [u + 4.3, zz - 1.1], [u + 0.1, zz + 1.1], [u + 4.3, zz + 1.1]]) S.box(0.12, 2.6, 0.12, a, 1.6, b, '#59636b');
    const g = dachProfil(4.8, 3.0, 0.9, 0, 'x'); g.translate(u + 2.2, 2.9, zz); S.add(g, waehle(r, farben));
  }
  belag(S, x - 2, z + dt, x + w + 2, z + d, '#e2ddd2');
  return { hoehe: Hw + hr + 2, teile: S.anzahl };
}

// =====================================================================================
// 11. Tankstelle, Hotel
// =====================================================================================
export const TANKMARKEN = {
  flink: { name: 'Zackig', farbe: '#f2b705', zweit: '#2d3a46', text: '#2d3a46' },
  nordtank: { name: 'Nordtank', farbe: '#1d6fb8', zweit: '#ffffff', text: '#ffffff' },
  ventura: { name: 'Ventura', farbe: '#2f8f4e', zweit: '#f2c23a', text: '#ffffff' },
};
export function tankstelle(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const m = typeof p.marke === 'object' ? p.marke : TANKMARKEN[p.marke ?? 'flink'];
  const w = p.w ?? 38, d = p.d ?? 34;
  belag(S, x, z, x + w, z + d, '#9aa0a6');
  // Shop
  const sx0 = x + 2, sx1 = x + 22, sz0 = z + 1.5, sz1 = z + 10, Hs = 4.4;
  S.quader(sx0, 0, sz0, sx1, Hs, sz1, '#eef0f1');
  S.quader(sx0 + 2, 0.36, sz1, sx1 - 1, Hs - 1.2, sz1 + 0.12, '#56707f');
  for (let u = sx0 + 4; u < sx1 - 1; u += 2.4) S.box(0.14, Hs - 1.6, 0.18, u, (Hs - 0.9) / 2 + 0.2, sz1 + 0.13, '#e8ecee');
  S.quader(sx0 - 0.2, Hs - 1.2, sz0, sx1 + 0.2, Hs + 0.3, sz1 + 0.25, m.farbe);
  S.quader(sx0 + 0.3, Hs + 0.3, sz0 + 0.3, sx1 - 0.3, Hs + 0.4, sz1 - 0.1, '#b9bec2');
  schildPasst(scene, `${m.name} Shop`, '+z', (sx0 + sx1) / 2, Hs - 0.45, sz1 + 0.25, 0.95, sx1 - sx0 - 4, m.text);
  // Dach
  const cx0 = x + 3, cx1 = x + 26, cz0 = z + 14, cz1 = z + 29, Hc = 5.6;
  S.quader(cx0, Hc, cz0, cx1, Hc + 1.3, cz1, '#dfe2e4');
  for (let q = cx0 + 3; q < cx1 - 1; q += 4) S.quader(q, Hc + 1.3, cz0 + 1, q + 0.25, Hc + 1.36, cz1 - 1, '#c9cdd0');
  // Markenkopf auf der Dachkante
  S.quader((cx0 + cx1) / 2 - 4, Hc + 1.1, cz1 - 1.6, (cx0 + cx1) / 2 + 4, Hc + 3.4, cz1 + 0.2, m.farbe);
  schildPasst(scene, m.name, '+z', (cx0 + cx1) / 2, Hc + 2.25, cz1 + 0.2, 1.6, 7.4, m.text);
  S.quader(cx0 - 0.1, Hc + 0.1, cz0 - 0.1, cx1 + 0.1, Hc + 0.9, cz1 + 0.1, m.farbe);
  S.quader(cx0 - 0.12, Hc + 0.9, cz0 - 0.12, cx1 + 0.12, Hc + 1.1, cz1 + 0.12, m.zweit);
  S.quader(cx0 + 0.5, Hc - 0.05, cz0 + 0.5, cx1 - 0.5, Hc, cz1 - 0.5, '#fbfaf6');

  schildPasst(scene, m.name, '+x', (cz0 + cz1) / 2, Hc + 0.5, cx1, 0.8, 8, m.text);
  // Zapfinseln
  for (let i = 0; i < 3; i++) {
    const ix = cx0 + 4 + i * 7.5, iz = (cz0 + cz1) / 2;
    S.quader(ix - 0.9, 0.3, iz - 4, ix + 0.9, 0.55, iz + 4, '#d8d4cb');
    for (const dz of [-2, 2]) { S.box(0.9, 1.8, 1.3, ix, 1.45, iz + dz, '#f4f4f2'); S.box(0.95, 0.4, 1.35, ix, 2.2, iz + dz, m.farbe); }
    S.box(0.45, Hc - 0.3, 0.45, ix, Hc / 2 + 0.15, iz, '#c9cdd0');
    if (r() < 0.75) auto(S, ix + 2.7, iz + (r() - 0.5) * 3, PI / 2, waehle(r, AUTOFARBEN), 0.36);
    if (r() < 0.5) auto(S, ix - 2.7, iz + (r() - 0.5) * 3, PI / 2, waehle(r, AUTOFARBEN), 0.36);
  }
  // Waschanlage
  const wx0 = x + w - 9, wx1 = x + w - 1.5;
  S.quader(wx0, 0, z + 2, wx1, 4.5, z + 16, '#e8ecee');
  S.quader(wx0 - 0.1, 3.4, z + 2, wx1 + 0.1, 4.5, z + 16.1, m.farbe);
  S.quader(wx0 + 0.3, 4.5, z + 2.3, wx1 - 0.3, 4.6, z + 15.8, '#b9bec2');
  S.quader(wx0 + 1.5, 0.36, z + 16, wx1 - 1.5, 3.2, z + 16.1, '#3c4852');
  schildPasst(scene, 'Waschanlage', '+x', z + 9, 3.95, wx1 + 0.1, 0.8, 12, m.text);
  // Preismast
  const px = x + w - 3, pz = z + d - 3, ph = 8.5;
  S.box(0.5, ph, 0.5, px, ph / 2, pz, '#59636b');
  S.quader(px - 1.8, ph - 6.2, pz - 0.5, px + 1.8, ph, pz + 0.5, '#2d3a46');
  S.quader(px - 1.8, ph - 1.6, pz - 0.55, px + 1.8, ph + 0.2, pz + 0.55, m.farbe);
  schildPasst(scene, m.name, '+z', px, ph - 0.7, pz + 0.55, 0.9, 3.2, m.text);
  const preise = [['Super', zw(r, 1.71, 1.89)], ['Diesel', zw(r, 1.59, 1.75)], ['E10', zw(r, 1.65, 1.83)]];
  preise.forEach(([t, v], i) => schildPasst(scene, `${t} ${v.toFixed(2).replace('.', ',')}`, '+z', px, ph - 2.4 - i * 1.25, pz + 0.5, 0.75, 3.3, '#f4f1e6'));
  return { hoehe: ph + 0.2, teile: S.anzahl };
}

function hotelAlt(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const stil = p.stil ?? waehle(r, ['modern', 'grand']);
  const G = p.geschosse ?? Math.round(zw(r, 8, 10.4));
  const name = p.name ?? waehle(r, ['Hotel Lindenhof', 'Hotel Am Stadtpark', 'Hotel Fürstenhof', 'Hotel Zur Post', 'Hotel Rheinblick']);
  if (stil === 'modern') {
    const w = p.w ?? 36, d = p.d ?? 16, eg = 5, gh = 3.2, H = eg + G * gh;
    const wand = p.farbe ?? waehle(r, ['#f1efea', '#e6e8e9', '#ece4d6']);
    const ak = p.akzent ?? waehle(r, ['#2f6f8f', '#c98a3a', '#3f7d56', '#6b4f8f']);
    S.quader(x, 0, z, x + w - 0.6, eg, z + d - 0.6, '#56707f');
    for (let u = x + 1; u < x + w; u += 3) S.box(0.3, eg - 0.3, 0.3, u, eg / 2, z + d - 0.4, '#e8ecee');
    const ob = { y0: eg, geschosse: G, gh, raster: 3.0, fw: 1.7, fh: 2.1, tiefe: 0.5 };
    lochBlock(S, x, z, w, d, eg, H, wand, ob);
    // farbige Paneele neben jedem zweiten Fenster
    for (const seite of ['+z', '+x']) {
      const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d, f = seite === '+z' ? z + d : x + w;
      for (const l of rasterLoecher(u0, u0 + L, ob)) {
        if (Math.round((l.u0 - u0) / 3) % 3 !== 1) continue;
        if (seite === '+z') S.quader(l.u0 - 0.2, l.v0 - 0.75, f, l.u1 + 0.2, l.v0 - 0.05, f + 0.12, ak);
        else S.quader(f, l.v0 - 0.75, l.u0 - 0.2, f + 0.12, l.v0 - 0.05, l.u1 + 0.2, ak);
      }
    }
    S.quader(x - 0.2, H, z - 0.2, x + w + 0.2, H + 0.8, z + d + 0.2, heller(wand, 0.03));
    S.quader(x + 4, H + 0.8, z + 3, x + 12, H + 3.4, z + d - 4, '#c9cdd0');
    // Dachschriftzug auf Gestell
    S.quader(x + w * 0.15, H + 0.8, z + d - 1.4, x + w * 0.85, H + 1.2, z + d - 1.0, '#59636b');
    schildPasst(scene, name, '+z', x + w / 2, H + 2.5, z + d - 1.6, 2.4, w * 0.75, ak === '#c98a3a' ? '#c98a3a' : ak);
    schildPasst(scene, name, '+x', z + d / 2, H - 1.4, x + w, 1.2, d - 2, '#ffffff', ak);
    // Vordach + Fahnen
    S.quader(x + w * 0.35, eg - 0.9, z + d, x + w * 0.65, eg - 0.4, z + d + 4.5, '#e8ecee');
    for (const u of [x + w * 0.35 + 0.3, x + w * 0.65 - 0.3]) S.box(0.25, eg - 1.2, 0.25, u, (eg - 0.6) / 2, z + d + 4.2, '#9aa3ab');
    for (let i = 0; i < 3; i++) { const u = x + w * 0.72 + i * 2.2; S.box(0.16, 8, 0.16, u, 4.3, z + d + 3, '#c9cdd0'); S.box(0.06, 2.4, 1.3, u, 7.0, z + d + 3.7, waehle(r, [ak, '#ffffff', '#3c4852'])); }
    return { hoehe: H + 3.7, teile: S.anzahl };
  }
  // Grandhotel
  const w = p.w ?? 42, d = p.d ?? 22, eg = 5.5, gh = 3.6, Gm = 2, Gn = Math.max(4, G - Gm - 1), H = eg + Gn * gh;
  const stein = p.farbe ?? waehle(r, ['#efe6d6', '#e8dfcf', '#e3d3bd']);
  const hell = heller(stein, 0.05);
  // Rustika-Sockel
  const loE = (u0, L) => rasterLoecher(u0, u0 + L, { y0: 0, geschosse: 1, gh: eg, raster: 4.2, fw: 2.2, fh: 3.6, bruestung: 0.8, bogen: true });
  S.quader(x, 0, z, x + w - 0.4, eg, z + d - 0.4, '#55636f');
  lochwand(S, '+z', x, x + w, -0.3, eg, z + d, 0.7, dunkler(stein, 0.04), loE(x, w));
  lochwand(S, '+x', z, z + d, -0.3, eg, x + w, 0.7, dunkler(stein, 0.04), loE(z, d));
  for (let y = 1.2; y < eg; y += 1.1) gesims(S, x, z, w, d, y, 0.12, 0.05, dunkler(stein, 0.08));
  const ob = { y0: eg, geschosse: Gn, gh, raster: 3.5, fw: 1.4, fh: 2.3, tiefe: 0.6, bogen: (k) => k === 0 };
  lochBlock(S, x, z, w, d, eg, H, stein, ob);
  for (const seite of ['+z', '+x']) {
    const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d, f = seite === '+z' ? z + d : x + w;
    const lo = rasterLoecher(u0, u0 + L, ob);
    baenke(S, seite, lo, f, hell);
    // schmiedeeiserne Balkone im 1. OG und 4. OG
    for (const l of lo) {
      const k = Math.round((l.v0 - eg) / gh);
      if (k !== 0 && k !== 3) continue;
      const u = (l.u0 + l.u1) / 2;
      if (seite === '+z') { S.box(2.2, 0.25, 0.9, u, l.v0 - 0.12, f + 0.45, hell); S.box(2.2, 0.55, 0.06, u, l.v0 + 0.3, f + 0.88, '#6b7680'); }
      else { S.box(0.9, 0.25, 2.2, f + 0.45, l.v0 - 0.12, u, hell); S.box(0.06, 0.55, 2.2, f + 0.88, l.v0 + 0.3, u, '#6b7680'); }
    }
  }
  gesims(S, x, z, w, d, eg, 0.6, 0.35, hell);
  gesims(S, x, z, w, d, H, 1.0, 0.55, hell);
  // Mansarde mit Gauben
  const hm = Gm * gh;
  satteldach(S, x, z, w, d, H + 0.5, hm, '#56636c', 'x', d * 0.58);
  for (let k = 0; k < Gm; k++) {
    const zz = z + d - 1.2 - k * 2.0, yy = H + 1.0 + k * gh;
    for (let u = x + 3; u < x + w - 2; u += 3.5) {
      S.quader(u - 0.8, yy, zz - 1.4, u + 0.8, yy + 2.3, zz, hell);
      S.quader(u - 0.5, yy + 0.25, zz, u + 0.5, yy + 1.9, zz + 0.05, '#55636f');
    }
  }
  // Eckpavillons mit Kuppeln
  const pv = 7;
  for (const [px0, pz0] of [[x + w - pv, z + d - pv], [x, z + d - pv]]) {
    S.quader(px0 - 0.3, H, pz0 - 0.3, px0 + pv + 0.3, H + hm * 0.75, pz0 + pv + 0.3, stein);
    for (const seite of ['+z', '+x']) { const f = seite === '+z' ? pz0 + pv + 0.3 : px0 + pv + 0.3, uc = seite === '+z' ? px0 + pv / 2 : pz0 + pv / 2; platte(S, seite, uc - 1, H + 1.2, uc + 1, H + hm * 0.75 - 1.2, f, '#55636f', true); }
    gesims(S, px0 - 0.3, pz0 - 0.3, pv + 0.6, pv + 0.6, H + hm * 0.75, 0.6, 0.4, hell);
    drehform(S, [[0, 0], [pv * 0.72, 0], [pv * 0.62, 2.2], [pv * 0.36, 4.4], [0.4, 5.6], [0, 5.8]], px0 + pv / 2, H + hm * 0.75 + 0.3, pz0 + pv / 2, '#56636c', 4);
    spitze(S, 0.16, 2.2, px0 + pv / 2, H + hm * 0.75 + 6, pz0 + pv / 2, '#d8b45a', 6);
  }
  // Schriftzug und Vordach
  schildPasst(scene, name, '+z', x + w / 2, eg + 0.1, z + d + 0.3, 1.0, w * 0.5, '#f3ead2', '#2f3b44');
  S.quader(x + w / 2 - 6, eg - 1.4, z + d, x + w / 2 + 6, eg - 0.9, z + d + 4, '#2f3b44');
  S.quader(x + w / 2 - 6, eg - 0.9, z + d + 3.8, x + w / 2 + 6, eg - 0.6, z + d + 4, '#d8b45a');
  schildPasst(scene, name, '+x', z + d / 2 - 2, eg + 0.1, x + w + 0.3, 1.0, d - pv - 4, '#f3ead2', '#2f3b44');
  return { hoehe: H + hm * 0.75 + 8, teile: S.anzahl };
}

// =====================================================================================
// 12. Fernmeldeturm (Zusatz-Landmarke)
// =====================================================================================
export function fernmeldeturm(S, scene, p) {
  const { x, z, seed = 1 } = p;
  const r = rng(seed);
  const w = p.w ?? 34, d = p.d ?? 34;
  const variante = p.variante ?? waehle(r, ['korb', 'teller']);
  const Hs = p.hoehe ?? zw(r, 120, 160); // Schaft bis Korb
  const beton = p.farbe ?? waehle(r, ['#e4e2dc', '#d9d7d1', '#e8e4da']);
  const cx = x + w / 2, cz = z + d / 2;
  // Sockelbau
  lochBlock(S, x + 3, z + 3, w - 6, d - 6, 0, 6, beton, { y0: 0, geschosse: 1, gh: 6, raster: 4, fw: 3, fh: 3.6, bruestung: 1.2, innen: '#56707f' });
  // Schaft mit Fuß
  drehform(S, [[0, 0], [7.5, 0], [5.6, 4], [4.2, 14], [3.5, 40], [2.7, Hs], [0, Hs]], cx, 6, cz, beton, 20);
  let y = 6 + Hs;
  if (variante === 'korb') {
    drehform(S, [[0, 0], [2.6, 0], [8.5, 6], [10.5, 9], [10.5, 9.4], [0, 9.4]], cx, y - 9, cz, beton, 24);
    zyl(S, 10.6, 10.6, 3.2, cx, y + 0.4, cz, '#56707f', 24);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * 2 * PI; S.box(0.2, 3.2, 0.2, cx + Math.cos(a) * 10.65, y + 2, cz + Math.sin(a) * 10.65, '#f4f4f2'); }
    zyl(S, 11.2, 11.2, 0.6, cx, y + 3.6, cz, beton, 24);
    zyl(S, 10.4, 10.4, 3, cx, y + 4.2, cz, '#6f8696', 24);
    drehform(S, [[11.0, 0], [11.0, 0.5], [7, 2.6], [3, 3.2], [0, 3.2]], cx, y + 7.2, cz, beton, 24);
    y += 10.4;
  } else {
    for (const [rr, dy] of [[9, 0], [12, 5], [8, 10.5]]) {
      zyl(S, rr, rr * 0.8, 1.6, cx, y + dy, cz, beton, 24);
      zyl(S, rr - 0.4, rr - 0.4, 2.6, cx, y + dy + 1.6, cz, '#56707f', 24);
      zyl(S, rr + 0.2, rr + 0.2, 0.5, cx, y + dy + 4.2, cz, beton, 24);
    }
    y += 15.2;
  }
  // Antennenträger rot-weiß
  zyl(S, 1.8, 2.0, 14, cx, y, cz, beton, 12);
  y += 14;
  for (let i = 0; i < 6; i++) zyl(S, 0.9 - i * 0.08, 0.95 - i * 0.08, 5, cx, y + i * 5, cz, i % 2 ? '#f4f4f2' : '#c9483e', 8);
  y += 30;
  // Plätzchen mit Bäumen
  for (const [a, b] of [[x + 2, z + d - 1], [x + w - 1, z + 2], [x + w - 1, z + d - 1]]) baum(S, a, b, r, 0.9);
  return { hoehe: y, teile: S.anzahl };
}

// =====================================================================================
// 4b. Rathaus-Varianten
// =====================================================================================
export const RATHAUS_STILE = ['backstein', 'renaissance', 'neugotik', 'barock', 'hochhaus', 'sandstein'];
export const REGION_RATHAUS = {
  nord: ['backstein', 'backstein', 'renaissance', 'hochhaus', 'neugotik'],
  sued: ['barock', 'renaissance', 'neugotik', 'neugotik', 'hochhaus'],
  west: ['sandstein', 'neugotik', 'barock', 'hochhaus', 'renaissance'],
  ost: ['backstein', 'renaissance', 'barock', 'hochhaus'],
  mitte: ['renaissance', 'sandstein', 'barock', 'hochhaus', 'neugotik'],
};
const RATHAUS_NENN = { backstein: [44, 24], sandstein: [44, 24], renaissance: [38, 20], neugotik: [44, 24], barock: [40, 22], hochhaus: [44, 30] };
/** Rathaus. p: { x, z, w, d, seed, stil?, region? }; stil siehe RATHAUS_STILE. */
export function rathaus(S, scene, p) {
  const r = rng(`rathaus:${p.seed ?? 1}`);
  const stil = p.stil ?? waehle(r, REGION_RATHAUS[p.region] ?? RATHAUS_STILE);
  const [nw, nd] = RATHAUS_NENN[stil] ?? [44, 24];
  const q = { ...p, w: p.w ?? nw, d: p.d ?? nd };
  const bau = { backstein: rathausHistorisch, sandstein: rathausHistorisch, renaissance: rathausRenaissance, neugotik: rathausNeugotik, barock: rathausBarock, hochhaus: rathausHochhaus }[stil];
  const e = skaliert(S, scene, q, Math.min(q.w, nw) < nw * 0.75 ? nw * 0.75 : Math.min(q.w, nw), Math.min(q.d, nd) < nd * 0.7 ? nd * 0.7 : Math.min(q.d, nd),
    (S2, sc2, pp) => bau(S2, sc2, { ...pp, stil, seed: p.seed }));
  return { hoehe: e.hoehe, teile: S.anzahl, stil };
}
function verdachung(S, seite, loecher, f, farbe) {
  for (const l of loecher) {
    const u = (l.u0 + l.u1) / 2, b = l.u1 - l.u0 + 0.5;
    if (seite === '+z') S.box(b, 0.22, 0.3, u, l.v1 + 0.2, f + 0.12, farbe); else S.box(0.3, 0.22, b, f + 0.12, l.v1 + 0.2, u, farbe);
  }
}
function erker(S, u, y0, y1, f, rad, farbe, glas, dachF, seite = '+z') {
  const mk = (h, rr, yy, c) => { const g = new THREE.CylinderGeometry(rr, rr, h, 6, 1, false, -PI / 2, PI); g.translate(0, yy + h / 2, 0); if (seite === '+x') g.rotateY(PI / 2); g.translate(seite === '+z' ? u : f, 0, seite === '+z' ? f : u); S.add(g, c); };
  mk(y1 - y0, rad, y0, farbe);
  const n = Math.max(1, Math.round((y1 - y0) / 3.8));
  for (let k = 0; k < n; k++) mk(1.9, rad + 0.04, y0 + 0.7 + k * ((y1 - y0) / n), glas);
  const kg = new THREE.ConeGeometry(rad, 1.6, 6, 1, false, -PI / 2, PI); kg.rotateX(PI); kg.translate(0, y0 - 0.8, 0); if (seite === '+x') kg.rotateY(PI / 2); kg.translate(seite === '+z' ? u : f, 0, seite === '+z' ? f : u); S.add(kg, farbe);
  const dg = new THREE.ConeGeometry(rad + 0.3, 2.6, 6, 1, false, -PI / 2, PI); dg.translate(0, y1 + 1.3, 0); if (seite === '+x') dg.rotateY(PI / 2); dg.translate(seite === '+z' ? u : f, 0, seite === '+z' ? f : u); S.add(dg, dachF);
}
function rathausRenaissance(S, scene, p) {
  const { x, z, w, d } = p, r = rng(`rr:${p.seed}`);
  const wand = waehle(r, ['#e9d79e', '#e6d5bf', '#d9b9a4', '#efe6d6', '#cfd6c0']), hell = '#f4efe4', zier = waehle(r, ['#b99a74', '#a9805f', '#c4a57e']);
  const dachF = waehle(r, ['#b4583f', '#a24e38', '#56636c']), glas = '#55636f';
  const G = 3, eg = 5.5, gh = 4.0, H = eg + G * gh;
  const loE = { y0: 0, geschosse: 1, gh: eg, raster: 4.4, fw: 2.4, fh: 3.8, bruestung: 0.6, bogen: true, tiefe: 0.6, innen: '#4f5c66' };
  lochBlock(S, x, z, w, d, 0, eg, zier, loE);
  const ob = { y0: eg, geschosse: G, gh, raster: 3.2, fw: 1.4, fh: 2.3, tiefe: 0.5 };
  lochBlock(S, x, z, w, d, eg, H, wand, ob);
  for (const seite of ['+z', '+x']) {
    const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d, f = seite === '+z' ? z + d : x + w;
    const lo = rasterLoecher(u0, u0 + L, ob);
    baenke(S, seite, lo, f, hell); verdachung(S, seite, lo, f, hell);
  }
  for (let k = 0; k <= G; k++) gesims(S, x, z, w, d, eg + k * gh, k === G ? 0.7 : 0.3, k === G ? 0.45 : 0.15, hell);
  // Eckquader
  for (let y = 0.3; y < H - 0.5; y += 1.2) { const a = (Math.round(y / 1.2) % 2) ? 1.6 : 1.0; S.quader(x + w - a, y, z + d - 0.1, x + w + 0.12, y + 0.6, z + d + 0.12, hell); S.quader(x + w - 0.1, y, z + d - a, x + w + 0.12, y + 0.6, z + d + 0.12, hell); }
  const hr = d * 0.72;
  satteldach(S, x - 0.3, z - 0.3, w + 0.6, d + 0.6, H + 0.35, hr, dachF, 'x', 0.1);
  // Zwerchhäuser mit Volutengiebel
  const nZ = w > 30 ? waehle(r, [2, 3, 3, 4]) : waehle(r, [1, 2]), zb = Math.min(6.5, w / (nZ + 1.4));
  for (let i = 0; i < nZ; i++) {
    const u = x + ((i + 0.6) * w) / (nZ + 0.2);
    S.quader(u - zb / 2, H, z + d - 5, u + zb / 2, H + 4.2, z + d, wand);
    platte(S, '+z', u - 0.75, H + 0.8, u + 0.75, H + 3.4, z + d, glas, false);
    giebel(S, '+z', u - zb / 2, u + zb / 2, H + 4.2, 5.2, z + d, wand, 'volute', { hell });
    platte(S, '+z', u - 0.5, H + 5.3, u + 0.5, H + 7.0, z + d + 0.1, glas, true);
    const g = dachProfil(6, zb, 2.6, 0, 'z'); g.translate(u, H + 4.2, z + d - 3.4); S.add(g, dachF);
  }
  // Erker auf +z und Eckerker
  const eu = x + w * waehle(r, [0.36, 0.5, 0.2]);
  if (r() < 0.75) erker(S, eu, eg + 0.9, H - 0.3, z + d, 1.7, wand, glas, dachF);
  if (r() < 0.5) erker(S, z + d * 0.7, eg + 0.9, H - 0.3, x + w, 1.5, wand, glas, dachF, '+x');
  zyl(S, 1.7, 1.7, H - eg + 0.6, x + w + 0.2, eg + 0.8, z + d + 0.2, wand, 10);
  for (let k = 0; k < G; k++) zyl(S, 1.74, 1.74, 1.9, x + w + 0.2, eg + 1.6 + k * gh, z + d + 0.2, glas, 10);
  spitze(S, 2.0, 4.2, x + w + 0.2, H + 1.4, z + d + 0.2, dachF, 10);
  { const g = new THREE.ConeGeometry(1.7, 1.8, 10); g.rotateX(PI); g.translate(x + w + 0.2, eg - 0.1, z + d + 0.2); S.add(g, wand); }
  // Treppenturm an +x
  const mitTurm = r() < 0.7, tz = z + d * 0.45, tx = x + w - 2.6;
  if (mitTurm) zyl(S, 2.6, 2.6, H + 6, tx, 0, tz, wand, 8);
  if (mitTurm) for (let k = 0; k < 4; k++) S.box(0.3, 1.6, 0.8, tx + 2.55, 3 + k * 4.2, tz, glas);
  if (mitTurm) gesims(S, tx - 2.6, tz - 2.6, 5.2, 5.2, H + 6, 0.5, 0.2, hell);
  const top = !mitTurm ? H + hr : turmHelm(S, 'welsch', tx, H + 6.3, tz, 5.4, waehle(r, ['#6f9a7d', '#56636c']), hell, 'kugel');
  platte(S, '+z', x + w * 0.62 - 1.4, 0.3, x + w * 0.62 + 1.4, 4.2, z + d, '#4a3a2e', true, 0.25);
  schildPasst(scene, 'Rathaus', '+z', x + w * 0.62, eg - 0.6, z + d + 0.1, 0.9, 6, '#3a2e24');
  return { hoehe: Math.max(top, H + hr), teile: S.anzahl };
}
function rathausNeugotik(S, scene, p) {
  const { x, z, w, d } = p, r = rng(`rn:${p.seed}`);
  const back = r() < 0.3;
  const stein = back ? waehle(r, ['#b06a52', '#a8664f']) : waehle(r, ['#cfc6b4', '#d6cdb9', '#c9bfae', '#ddd2bd']);
  const hell = back ? '#e3d6c0' : heller(stein, 0.06), dachF = waehle(r, ['#4f5a62', '#56636c']), glas = '#55636f';
  const G = waehle(r, [3, 3, 4]), eg = 5, gh = 4.3, H = eg + G * gh;
  const ob = { y0: 0.6, geschosse: G + 1, gh: (H - 0.6) / (G + 1), raster: 3.4, fw: 1.5, fh: 2.8, bogen: 'spitz', tiefe: 0.6 };
  lochBlock(S, x, z, w, d, 0, H, stein, ob);
  for (const seite of ['+z', '+x']) { const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d, f = seite === '+z' ? z + d : x + w; baenke(S, seite, rasterLoecher(u0, u0 + L, ob), f, hell); }
  for (let k = 1; k <= G + 1; k++) gesims(S, x, z, w, d, 0.6 + k * ob.gh - 0.1, k === G + 1 ? 0.7 : 0.25, k === G + 1 ? 0.4 : 0.12, hell);
  const hr = d * 0.8;
  satteldach(S, x - 0.3, z - 0.3, w + 0.6, d + 0.6, H + 0.4, hr, dachF, 'x', 0.1);
  for (let u = x + 3; u < x + w - 2; u += 4.4) { S.quader(u - 0.7, H + 1, z + d - 3.2, u + 0.7, H + 2.8, z + d - 2.4, hell); const g = dachProfil(1.6, 1.8, 1.3, 0, 'z'); g.translate(u, H + 2.8, z + d - 3.0); S.add(g, dachF); }
  // Fialen an der Traufe
  for (let u = x + 1; u <= x + w; u += 5.5) spitze(S, 0.4, 2.6, u, H + 0.5, z + d - 0.2, hell, 4);
  for (let u = z + 1; u <= z + d; u += 5.5) spitze(S, 0.4, 2.6, x + w - 0.2, H + 0.5, u, hell, 4);
  // Ziergiebel an den Enden der +z-Front
  for (const u of [x + 5, x + w - 5]) {
    S.quader(u - 3.5, H, z + d - 1.5, u + 3.5, H + 1, z + d, stein);
    giebel(S, '+z', u - 3.5, u + 3.5, H + 1, 7, z + d, stein, 'glatt');
    platte(S, '+z', u - 1, H + 1.6, u + 1, H + 5.6, z + d + 0.05, glas, 'spitz');
    for (const s of [-1, 1]) spitze(S, 0.5, 3, u + s * 3.5, H + 1, z + d - 0.3, hell, 4);
    spitze(S, 0.4, 2.2, u, H + 7.6, z + d - 0.3, hell, 4);
  }
  // Mittelturm
  const t = clamp(w * 0.22, 7, 10), tx0 = x + waehle(r, [w / 2 - t / 2, w / 2 - t / 2, w - t - 6, w * 0.22]), tz0 = z + d - t + 0.8;
  const Ht = p.turmHoehe ?? H + clamp(w * 0.75, 22, 36);
  S.quader(tx0, 0, tz0, tx0 + t, Ht, tz0 + t, stein);
  for (const yy of [H, Ht - 9]) gesims(S, tx0, tz0, t, t, yy, 0.6, 0.35, hell);
  S.quader(tx0 - 0.8, Ht - 9.4, tz0 - 0.8, tx0 + t + 0.8, Ht - 9.0, tz0 + t + 0.8, hell);
  for (const seite of ['+z', '+x']) {
    const f = seite === '+z' ? tz0 + t : tx0 + t, uc = seite === '+z' ? tx0 + t / 2 : tz0 + t / 2;
    platte(S, seite, uc - 1.0, H + 1.5, uc + 1.0, Ht - 11, f, glas, 'spitz');
    uhr(S, seite, uc, Ht - 4.8, f, Math.min(t * 0.3, 2.6), { rahmen: '#d8b45a' });
    platte(S, seite, uc - 1.6, 0.3, uc + 1.6, 5, f, '#4a3a2e', 'spitz', 0.25);
  }
  gesims(S, tx0, tz0, t, t, Ht, 0.8, 0.5, hell);
  // Umgang unter dem Helm
  S.quader(tx0 - 1, Ht + 0.4, tz0 - 1, tx0 + t + 1, Ht + 0.8, tz0 + t + 1, hell);
  for (let u = tx0 - 0.8; u <= tx0 + t + 0.8; u += 1.1) { S.box(0.2, 1.1, 0.2, u, Ht + 1.35, tz0 + t + 0.9, hell); S.box(0.2, 1.1, 0.2, tx0 + t + 0.9, Ht + 1.35, tz0 - 0.8 + (u - tx0 + 0.8), hell); }
  const top = turmHelm(S, waehle(r, ['spitz', 'pyramide', 'spitz']), tx0 + t / 2, Ht + 0.8, tz0 + t / 2, t * 0.9, dachF, hell, 'kugel');
  schildPasst(scene, 'Rathaus', '+z', tx0 + t / 2, 5.8, tz0 + t, 0.9, t - 1, back ? '#ffffff' : '#3a2e24');
  return { hoehe: top, teile: S.anzahl };
}
function rathausBarock(S, scene, p) {
  const { x, z, w, d } = p, r = rng(`rb:${p.seed}`);
  const wand = waehle(r, ['#f1e6c8', '#efe0d6', '#e9dcc1', '#f2d9b6', '#e3e8dc']), hell = '#f7f4ee', dachF = waehle(r, ['#56636c', '#b4583f', '#4f5a62']), glas = '#55636f';
  const eg = 5, gh = 4.8, G = waehle(r, [2, 2, 3]), H = eg + G * gh, rv = 1.2;
  const rw = clamp(w * 0.34, 9, 15), cx = x + w / 2;
  const loE = { y0: 0, geschosse: 1, gh: eg, raster: 3.6, fw: 1.6, fh: 2.8, bruestung: 1.0, bogen: true, tiefe: 0.6 };
  const ob = { y0: eg, geschosse: G, gh, raster: 3.6, fw: 1.6, fh: 3.0, tiefe: 0.6, bogen: (k) => k === 0 };
  lochBlock(S, x, z, w, d - rv, 0, eg, wand, loE);
  lochBlock(S, x, z, w, d - rv, eg, H, wand, ob);
  for (const seite of ['+z', '+x']) { const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d - rv, f = seite === '+z' ? z + d - rv : x + w; const lo = rasterLoecher(u0, u0 + L, ob); baenke(S, seite, lo, f, hell); verdachung(S, seite, lo, f, hell); }
  for (let u = x + 0.2; u <= x + w; u += (w - 0.4) / Math.max(4, Math.round(w / 7))) S.box(0.7, H, 0.25, u, H / 2, z + d - rv + 0.12, hell);
  gesims(S, x, z, w, d - rv, eg, 0.4, 0.2, hell); gesims(S, x, z, w, d - rv, H, 0.8, 0.5, hell);
  satteldach(S, x, z, w, d - rv, H + 0.4, 5.2, dachF, 'x', (d - rv) * 0.5);
  for (let u = x + 2.5; u < x + w - 1.5; u += 3.6) { if (Math.abs(u - cx) < rw / 2 + 0.5) continue; S.quader(u - 0.7, H + 1, z + d - rv - 2.4, u + 0.7, H + 2.9, z + d - rv - 1.6, hell); }
  // Mittelrisalit mit Dreiecksgiebel und Uhr
  const lo = [];
  for (let k = 0; k < G; k++) for (const i of [-1, 0, 1]) lo.push({ u0: cx + i * rw * 0.3 - 0.85, u1: cx + i * rw * 0.3 + 0.85, v0: eg + k * gh + 0.9, v1: eg + k * gh + 4.0, bogen: k === 0 });
  lo.push({ u0: cx - 1.6, u1: cx + 1.6, v0: 0.31, v1: 4.2, bogen: true });
  S.quader(cx - rw / 2, 0, z + d - rv - 0.5, cx + rw / 2, H + 1, z + d - 0.6, '#4f5c66');
  lochwand(S, '+z', cx - rw / 2, cx + rw / 2, -0.3, H + 1, z + d, 0.6, wand, lo);
  for (const s of [-1, 1]) S.box(0.8, H + 1, 0.3, cx + s * (rw / 2 - 0.4), (H + 1) / 2, z + d + 0.1, hell);
  S.quader(cx - rw / 2 - 0.2, H + 0.6, z + d - rv - 0.5, cx + rw / 2 + 0.2, H + 1.4, z + d + 0.3, hell);
  const hg = rw * 0.26;
  giebel(S, '+z', cx - rw / 2 - 0.2, cx + rw / 2 + 0.2, H + 1.4, hg, z + d + 0.3, hell, 'glatt');
  { const g = dachProfil(rv + 4, rw + 0.6, hg, 0, 'z'); g.translate(cx, H + 1.4, z + d - rv - 1.5); S.add(g, dachF); }
  uhr(S, '+z', cx, H + 1.4 + hg * 0.42, z + d + 0.35, Math.min(1.4, hg * 0.35));
  S.quader(cx - 2.4, eg - 0.1, z + d, cx + 2.4, eg + 0.15, z + d + 1.4, hell);
  S.quader(cx - 2.4, eg + 0.15, z + d + 1.3, cx + 2.4, eg + 1.0, z + d + 1.4, '#3a4148');
  schildPasst(scene, 'Rathaus', '+z', cx, eg - 0.55, z + d + 0.1, 0.8, rw * 0.5, '#3a2e24');
  // Dachreiter mit welscher Haube
  const dz = z + (d - rv) / 2;
  S.box(3, 3.2, 3, cx, H + 5.2 + 1.2, dz, hell);
  zyl(S, 1.5, 1.5, 3, cx, H + 7.8, dz, hell, 8);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * 2 * PI; S.box(0.6, 1.6, 0.3, cx + Math.cos(a) * 1.5, H + 9.3, dz + Math.sin(a) * 1.5, glas, -a - PI / 2); }
  const top = turmHelm(S, 'welsch', cx, H + 10.8, dz, 3.4, waehle(r, ['#6f9a7d', '#56636c']), hell, 'kugel');
  return { hoehe: top, teile: S.anzahl };
}
function rathausHochhaus(S, scene, p) {
  const { x, z, w, d } = p, r = rng(`rh:${p.seed}`);
  const beton = waehle(r, ['#d4d1ca', '#c9c6be', '#dcd6c8', '#b9785e']), alu = waehle(r, ['#c9d1d6', '#d8b45a', '#3a3f44']), glas = waehle(r, ['#56707f', '#4f6676', '#6a7f8c']);
  const G = Math.round(zw(r, 9, 14)), gh = 3.4;
  const tw = clamp(w * zw(r, 0.38, 0.55), 12, 24), td = clamp(d * 0.42, 10, 14), tx0 = r() < 0.5 ? x + 1 : x + w - tw - 1, tz0 = z + 0.5, Ht = 4 + G * gh;
  // Turm
  lochBlock(S, tx0, tz0, tw, td, 0, Ht, beton, { y0: 4, geschosse: G, gh, raster: 1.8, fw: 1.2, fh: 1.9, tiefe: 0.4, innen: glas });
  for (let u = tx0 + 0.9; u < tx0 + tw; u += 3.6) S.box(0.25, Ht - 4, 0.6, u, 4 + (Ht - 4) / 2, tz0 + td + 0.3, alu);
  for (let u = tz0 + 0.9; u < tz0 + td; u += 3.6) S.box(0.6, Ht - 4, 0.25, tx0 + tw + 0.3, 4 + (Ht - 4) / 2, u, alu);
  S.quader(tx0 + 1, 0, tz0 + 1, tx0 + tw - 1, 4, tz0 + td - 1, glas);
  for (let u = tx0 + 1.5; u < tx0 + tw - 1; u += 4) S.box(0.6, 4, 0.6, u, 2, tz0 + td - 0.3, beton);
  S.quader(tx0 - 0.3, Ht, tz0 - 0.3, tx0 + tw + 0.3, Ht + 1.2, tz0 + td + 0.3, heller(beton, 0.04));
  S.quader(tx0 + 2, Ht + 1.2, tz0 + 2, tx0 + tw * 0.6, Ht + 4, tz0 + td - 2, '#bfc5c9');
  schildPasst(scene, 'Rathaus', '+z', tx0 + tw / 2, Ht + 0.6, tz0 + td + 0.3, 1.0, tw - 2, '#2f3b44');
  uhr(S, '+x', tz0 + td / 2, Ht - 2.6, tx0 + tw + 0.3, 1.6, { rahmen: '#2f3b44' });
  // Ratssaalflügel mit Faltdach vor dem Turm
  const fx0 = x + 1, fz0 = z + td + 2, fH = 8;
  const fw = w - 2, fd = d - td - 2.5;
  if (fd > 5) {
    S.quader(fx0 + 1, 0, fz0, fx0 + fw - 1, 3.6, fz0 + fd - 1.2, glas);
    for (let u = fx0 + 2; u < fx0 + fw - 1; u += 4.5) S.box(0.5, 3.6, 0.5, u, 1.8, fz0 + fd - 0.8, beton);
    S.quader(fx0, 3.6, fz0, fx0 + fw, fH, fz0 + fd, waehle(r, ['#e9e4d8', '#b9785e', '#dfe3e6']));
    S.quader(fx0 + 1, 5.2, fz0 + fd, fx0 + fw - 1, 6.6, fz0 + fd + 0.08, glas);
    const n = Math.max(3, Math.round(fw / 4.5)), b = fw / n;
    if (r() < 0.6) for (let i = 0; i < n; i++) { const g = dachProfil(fd + 0.8, b, 2.4, 0, 'z'); g.translate(fx0 + (i + 0.5) * b, fH, fz0 + fd / 2); S.add(g, '#6f9a7d'); }
    else { S.quader(fx0 - 1, fH, fz0 - 1, fx0 + fw + 1, fH + 0.6, fz0 + fd + 1.5, '#f4f4f2'); S.quader(fx0 + 3, fH + 0.6, fz0 + 2, fx0 + 8, fH + 2, fz0 + 5, '#bfc5c9'); }
    // Mosaik-Wand
    S.quader(fx0 + fw, 3.8, fz0 + 1, fx0 + fw + 0.08, fH - 0.4, fz0 + fd - 1, '#3f6fae');
    S.quader(fx0 + fw + 0.08, 4.6, fz0 + 2, fx0 + fw + 0.12, 6.4, fz0 + fd * 0.45, '#d9a33a');
  }
  return { hoehe: Ht + 4, teile: S.anzahl };
}

// =====================================================================================
// 13. Schloss / Residenz
// =====================================================================================
export function schloss(S, scene, p) {
  const { x, z, seed = 1 } = p, r = rng(`schloss:${seed}`);
  const w = p.w ?? 120, d = p.d ?? 100;
  const wand = waehle(r, ['#ecd9a0', '#f1ece2', '#e9cfc3', '#e3d3bd', '#e6e2c8']), hell = '#f7f4ee', dachF = waehle(r, ['#56636c', '#6f9a7d', '#4f5a62']);
  const mitte = p.mitte ?? waehle(r, ['kuppel', 'giebel', 'turm']);
  const G = 3, gh = 4.6, H = 1.2 + G * gh, cd = 16, ww = 14;
  const wl = clamp(d * zw(r, 0.25, 0.4), 16, 40);
  const ob = { y0: 1.2, geschosse: G, gh, raster: 3.4, fw: 1.5, fh: 2.8, tiefe: 0.6, bogen: (k) => k === 1 };
  const bloecke = [[x + 3, z + 2, w - 6, cd, 'x'], [x + 3, z + 2 + cd, ww, wl, 'z'], [x + w - 3 - ww, z + 2 + cd, ww, wl, 'z']];
  for (const [bx, bz, bw, bd, achse] of bloecke) {
    lochBlock(S, bx, bz, bw, bd, 0, H, wand, ob);
    for (const seite of ['+z', '+x']) { const u0 = seite === '+z' ? bx : bz, L = seite === '+z' ? bw : bd, f = seite === '+z' ? bz + bd : bx + bw; const lo = rasterLoecher(u0, u0 + L, ob); baenke(S, seite, lo, f, hell); verdachung(S, seite, lo.filter((l) => l.v0 > 1.2 + gh && l.v0 < 1.2 + 2 * gh), f, hell); }
    gesims(S, bx, bz, bw, bd, 1.2, 0.4, 0.2, hell); gesims(S, bx, bz, bw, bd, 1.2 + gh, 0.3, 0.15, hell); gesims(S, bx, bz, bw, bd, H, 0.9, 0.5, hell);
    satteldach(S, bx, bz, bw, bd, H + 0.45, 5.5, dachF, achse, (achse === 'x' ? bd : bw) * 0.5);
  }
  // Mittelrisalit
  const cx = x + w / 2, rw = clamp(w * 0.2, 14, 26), rz = z + 2 + cd;
  S.quader(cx - rw / 2, 0, rz - 1, cx + rw / 2, H + 2, rz + 2, wand);
  for (let i = 0; i < 6; i++) { const u = cx - rw / 2 + 1 + (i * (rw - 2)) / 5; saeule(S, u, 1.2, rz + 2.6, H - 0.4, 0.5, hell); }
  for (const k of [0, 1, 2]) for (let i = 0; i < 5; i++) { const u = cx - rw / 2 + 1 + ((i + 0.5) * (rw - 2)) / 5; platte(S, '+z', u - 0.8, 1.6 + k * gh, u + 0.8, 1.6 + k * gh + 3.0, rz + 2, '#55636f', k === 1 || k === 0); }
  S.quader(cx - rw / 2 - 0.3, H - 0.6, rz - 1, cx + rw / 2 + 0.3, H + 2, rz + 3.3, hell);
  let top = H + 8;
  if (mitte === 'giebel') {
    giebel(S, '+z', cx - rw / 2 - 0.3, cx + rw / 2 + 0.3, H + 2, rw * 0.24, rz + 3.3, hell, 'glatt');
    const g = dachProfil(5, rw + 1, rw * 0.24, 0, 'z'); g.translate(cx, H + 2, rz + 0.8); S.add(g, dachF);
    uhr(S, '+z', cx, H + 2 + rw * 0.09, rz + 3.35, 1.4);
    for (const s of [-1, -0.33, 0.33, 1]) S.box(0.8, 2.2, 0.8, cx + s * rw * 0.48, H + 3.1, rz + 3, hell);
    top = H + 2 + rw * 0.24 + 2;
  } else if (mitte === 'kuppel') {
    pyramide(S, rw, cd + 2, 3, cx, H + 2, z + 2 + cd / 2 + 1, dachF);
    zyl(S, rw * 0.3, rw * 0.3, 3.5, cx, H + 3, z + 2 + cd / 2 + 1, wand, 16);
    haube(S, rw * 0.32, cx, H + 6.5, z + 2 + cd / 2 + 1, '#6f9a7d', 1.0, 16);
    zyl(S, 0.9, 0.9, 2.2, cx, H + 6.5 + rw * 0.32, z + 2 + cd / 2 + 1, hell, 8);
    haube(S, 1.1, cx, H + 8.7 + rw * 0.32, z + 2 + cd / 2 + 1, '#6f9a7d', 1.2, 8);
    top = H + 10 + rw * 0.32;
  } else {
    const tz = z + 2 + cd / 2 + 1;
    S.box(6, 8, 6, cx, H + 6, tz, wand); gesims(S, cx - 3, tz - 3, 6, 6, H + 10, 0.5, 0.3, hell);
    uhr(S, '+z', cx, H + 7, tz + 3, 1.6); uhr(S, '+x', tz, H + 7, cx + 3, 1.6);
    top = turmHelm(S, 'welsch', cx, H + 10.3, tz, 6, '#6f9a7d', hell, 'kugel');
  }
  // Ehrenhof
  const hz0 = rz + 3.5, hz1 = z + 2 + cd + wl;
  belag(S, x + 3 + ww, hz0, x + w - 3 - ww, hz1, '#e6dcc6');
  const mz = (hz0 + hz1) / 2;
  zyl(S, 3.2, 3.2, 0.7, cx, 0.36, mz, '#d6cdb9', 16); zyl(S, 2.8, 2.8, 0.1, cx, 1.0, mz, FARBEN.wasser, 16); zyl(S, 0.3, 0.2, 2.2, cx, 1.0, mz, '#d6cdb9', 6);
  // Gitter mit Torpfeilern
  for (let u = x + 3 + ww; u < x + w - 3 - ww; u += 1.2) if (Math.abs(u - cx) > 3) S.box(0.08, 2.2, 0.08, u, 1.4, hz1 + 0.3, '#2f3b44');
  S.quader(x + 3 + ww, 2.4, hz1 + 0.25, x + w - 3 - ww, 2.5, hz1 + 0.35, '#2f3b44');
  for (const u of [cx - 3, cx + 3]) { S.box(1.2, 3.6, 1.2, u, 2.1, hz1 + 0.3, hell); S.add(new THREE.SphereGeometry(0.55, 8, 6).translate(u, 4.4, hz1 + 0.3), hell); }
  // Barockgarten
  const gz0 = hz1 + 2, gz1 = z + d - 1, gx0 = x + 3, gx1 = x + w - 3;
  if (gz1 - gz0 > 10) {
    belag(S, gx0, gz0, gx1, gz1, '#e9e2d0');
    const nx = 4, ny = 2, pw = (gx1 - gx0 - (nx + 1) * 3) / nx, pd = (gz1 - gz0 - (ny + 1) * 3) / ny;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const px = gx0 + 3 + i * (pw + 3), pz = gz0 + 3 + j * (pd + 3);
      S.quader(px, 0.36, pz, px + pw, 0.5, pz + pd, FARBEN.rasen);
      S.quader(px, 0.36, pz, px + pw, 1.1, pz + 0.6, '#4f8a4a'); S.quader(px, 0.36, pz + pd - 0.6, px + pw, 1.1, pz + pd, '#4f8a4a');
      S.quader(px, 0.36, pz, px + 0.6, 1.1, pz + pd, '#4f8a4a'); S.quader(px + pw - 0.6, 0.36, pz, px + pw, 1.1, pz + pd, '#4f8a4a');
      S.quader(px + pw * 0.3, 0.36, pz + pd * 0.3, px + pw * 0.7, 0.9, pz + pd * 0.7, '#5f9a56');
      for (const [a, b] of [[px, pz], [px + pw, pz], [px, pz + pd], [px + pw, pz + pd]]) spitze(S, 0.7, 2.6, a, 0.4, b, '#3f7d46', 6);
    }
    zyl(S, 4.5, 4.5, 0.6, cx, 0.36, (gz0 + gz1) / 2, '#d6cdb9', 18); zyl(S, 4.0, 4.0, 0.1, cx, 0.9, (gz0 + gz1) / 2, FARBEN.wasser, 18);
    zyl(S, 0.25, 0.15, 3.5, cx, 0.9, (gz0 + gz1) / 2, '#e8f4f6', 6);
    for (let u = gx0 + 2; u < gx1; u += 7) { baum(S, u, gz1 - 0.5, r, 0.85); }
  }
  return { hoehe: top, teile: S.anzahl };
}

// =====================================================================================
// 14. Stadttor, Stadtmauerturm
// =====================================================================================
function zinnen(S, seite, u0, u1, y, f, farbe, b = 0.9) {
  for (let u = u0 + b / 2; u < u1 - b / 2; u += b * 2) sbox(S, seite, u, u + b, y, y + 1.0, f - 0.7, f, farbe);
}
export function stadttor(S, scene, p) {
  const { x, z, seed = 1 } = p, r = rng(`tor:${seed}`);
  const art = p.art ?? waehle(r, ['turm', 'doppel', 'barock']);
  const w = p.w ?? 20, d = p.d ?? 12;
  const back = r() < 0.5;
  const stein = p.stein ?? (back ? waehle(r, ['#a8583f', '#b06a52', '#9e5c47']) : waehle(r, ['#cfc6b4', '#c9bfae', '#d9c4a8', '#bfae96']));
  const hell = back ? '#e3d6c0' : heller(stein, 0.05), dachF = waehle(r, ['#56636c', '#b4583f', '#6f9a7d']), dunkel = '#3a3f44';
  if (art === 'barock') {
    const st = waehle(r, ['#e3d3bd', '#ece5d7', '#d9c4a8']), hl = heller(st, 0.05), H = clamp(w * 0.75, 12, 18);
    const lo = [{ u0: x + w / 2 - w * 0.17, u1: x + w / 2 + w * 0.17, v0: 0.31, v1: H * 0.66, bogen: true }];
    for (const s of [-1, 1]) lo.push({ u0: x + w / 2 + s * w * 0.33 - w * 0.08, u1: x + w / 2 + s * w * 0.33 + w * 0.08, v0: 0.31, v1: H * 0.42, bogen: true });
    const sh = rechteck(x, -0.3, x + w, H); for (const l of lo) sh.holes.push(oeffnung(new THREE.Path(), l.u0, l.v0, l.u1, l.v1, l.bogen));
    flaeche(S, '+z', sh, z + d * 0.7, d * 0.4, st);
    for (const s of [-1, -0.5, 0.5, 1]) saeule(S, x + w / 2 + s * w * 0.46, 0.3, z + d * 0.7 + 0.7, H - 0.3, 0.45, hl);
    S.quader(x - 0.3, H, z + d * 0.3 - 0.3, x + w + 0.3, H + 1.0, z + d * 0.7 + 1.3, hl);
    S.quader(x + 0.5, H + 1, z + d * 0.3, x + w - 0.5, H + 4.2, z + d * 0.7 + 0.4, st);
    schildPasst(scene, waehle(r, ['Neues Tor', 'Siegestor', 'Königstor', 'Friedenstor']), '+z', x + w / 2, H + 2.6, z + d * 0.7 + 0.4, 1.2, w * 0.7, '#3a2e24');
    // Figurengruppe
    const fy = H + 4.2, fz = z + d / 2, br = '#5f8a78';
    S.box(2.6, 1.2, 1.8, x + w / 2, fy + 0.8, fz, br);
    for (const s of [-1.5, -0.5, 0.5, 1.5]) { S.box(0.7, 1.4, 2.4, x + w / 2 + s * 0.9, fy + 1.6, fz + 1.8, br); S.box(0.5, 1.0, 0.6, x + w / 2 + s * 0.9, fy + 2.6, fz + 3.0, br); }
    S.box(0.7, 2.6, 0.7, x + w / 2, fy + 2.6, fz, br);
    return { hoehe: fy + 4, teile: S.anzahl };
  }
  // Mauerstücke links/rechts
  const mz0 = z + d * 0.3, mz1 = z + d * 0.7, mh = 8;
  if (art === 'doppel') {
    const R = clamp(d * 0.32, 3, 5), cz = z + d / 2, H = clamp(w * 1.0, 14, 22), mb = w - 4 * R;
    for (const u of [x + R, x + w - R]) {
      zyl(S, R, R, H, u, 0, cz, stein, 16);
      zyl(S, R + 0.4, R + 0.4, 0.6, u, H, cz, hell, 16);
      spitze(S, R + 0.6, R * 2.2, u, H + 0.6, cz, dachF, 16);
      for (let k = 1; k < 4; k++) S.box(0.5, 1.4, 0.3, u, k * H * 0.22, cz + R, dunkel);
    }
    const bx0 = x + 2 * R - 0.5, bx1 = x + w - 2 * R + 0.5, Hm = H * 0.92;
    S.quader(bx0, 0, cz - R * 0.9, bx1, Hm, cz + R * 0.9 - 0.4, '#2d3236');
    lochwand(S, '+z', bx0, bx1, -0.3, Hm, cz + R * 0.9, 0.8, stein, [{ u0: (bx0 + bx1) / 2 - Math.min(2.4, mb * 0.3 + 1), u1: (bx0 + bx1) / 2 + Math.min(2.4, mb * 0.3 + 1), v0: 0.31, v1: 6, bogen: back ? 'spitz' : true }]);
    for (let k = 1; k <= 2; k++) platte(S, '+z', (bx0 + bx1) / 2 - 0.6, 6 + k * 3.2, (bx0 + bx1) / 2 + 0.6, 6 + k * 3.2 + 1.8, cz + R * 0.9, dunkel, true);
    giebel(S, '+z', bx0, bx1, Hm, (bx1 - bx0) * 0.8, cz + R * 0.9, stein, back ? 'treppe' : 'glatt', { hell, blenden: back });
    satteldach(S, bx0, cz - R * 0.9, bx1 - bx0, R * 1.8, Hm, (bx1 - bx0) * 0.8 - 0.4, dachF, 'z', 0);
    return { hoehe: H + R * 2.8, teile: S.anzahl };
  }
  const t = clamp(Math.min(w * 0.5, d), 7, 10), tx0 = x + w / 2 - t / 2, tz0 = z + (d - t) / 2, H = clamp(t * 2.6, 18, 26);
  for (const [a, b] of [[x, tx0], [tx0 + t, x + w]]) {
    if (b - a < 1) continue;
    S.quader(a, 0, mz0, b, mh, mz1, stein); zinnen(S, '+z', a, b, mh, mz1, stein);
  }
  S.quader(tx0, 0, tz0, tx0 + t - 0.4, H, tz0 + t - 0.4, '#2d3236');
  lochwand(S, '+z', tx0, tx0 + t, -0.3, H, tz0 + t, 0.8, stein, [{ u0: tx0 + t * 0.28, u1: tx0 + t * 0.72, v0: 0.31, v1: t * 0.75, bogen: back ? 'spitz' : true }, ...[0.45, 0.66].map((f) => ({ u0: tx0 + t / 2 - 0.5, u1: tx0 + t / 2 + 0.5, v0: H * f, v1: H * f + 1.8, bogen: true }))]);
  lochwand(S, '+x', tz0, tz0 + t, -0.3, H, tx0 + t, 0.8, stein, [0.3, 0.5, 0.7].map((f) => ({ u0: tz0 + t / 2 - 0.4, u1: tz0 + t / 2 + 0.4, v0: H * f, v1: H * f + 1.5, bogen: true })));
  S.quader(tx0, H - 0.05, tz0, tx0 + t, H + 0.02, tz0 + t, stein);
  const helm = waehle(r, ['zinnen', 'pyramide', 'spitz', 'sattel']);
  let top;
  if (helm === 'zinnen') {
    S.quader(tx0 - 0.5, H, tz0 - 0.5, tx0 + t + 0.5, H + 1.0, tz0 + t + 0.5, hell);
    zinnen(S, '+z', tx0 - 0.5, tx0 + t + 0.5, H + 1.0, tz0 + t + 0.5, stein); zinnen(S, '+x', tz0 - 0.5, tz0 + t + 0.5, H + 1.0, tx0 + t + 0.5, stein);
    S.box(2.4, 3, 2.4, tx0 + t * 0.35, H + 2.5, tz0 + t * 0.35, stein); pyramide(S, 3, 3, 2.4, tx0 + t * 0.35, H + 4, tz0 + t * 0.35, dachF);
    top = H + 6.5;
  } else top = turmHelm(S, helm, tx0 + t / 2, H, tz0 + t / 2, t, dachF, stein, 'kugel');
  if (back) for (const s of [-1, 1]) platte(S, '+z', tx0 + t / 2 + s * t * 0.3 - 0.4, H * 0.42, tx0 + t / 2 + s * t * 0.3 + 0.4, H * 0.82, tz0 + t, '#ece6da', 'spitz', 0.08);
  return { hoehe: top, teile: S.anzahl };
}
export function stadtmauerturm(S, scene, p) {
  const { x, z, seed = 1 } = p, r = rng(`mauer:${seed}`);
  const art = p.art ?? waehle(r, ['rund', 'eckig', 'schale']);
  const w = p.w ?? 20, d = p.d ?? 10;
  const stein = p.stein ?? waehle(r, ['#a8583f', '#b9a58a', '#c9bfae', '#9e8e78', '#b06a52']), dachF = waehle(r, ['#b4583f', '#56636c', '#a24e38']), dunkel = '#3a3f44';
  const mz0 = z + 0.5, mz1 = z + 2.5, mh = 7;
  S.quader(x, 0, mz0, x + w, mh, mz1, stein); zinnen(S, '+z', x, x + w, mh, mz1, stein);
  S.quader(x, mh - 1.2, mz0 - 1.6, x + w, mh - 0.9, mz0, '#7d6a52');
  const cx = x + w / 2, R = clamp(d * 0.42, 3, 5), cz = mz1 + R - 1, H = zw(r, 14, 20);
  if (art === 'eckig') {
    const t = R * 1.8;
    S.quader(cx - t / 2, 0, cz - t / 2, cx + t / 2, H, cz + t / 2, stein);
    for (const seite of ['+z', '+x']) { const f = seite === '+z' ? cz + t / 2 : cx + t / 2, uc = seite === '+z' ? cx : cz; for (const k of [0.3, 0.55, 0.8]) S.add(aufSeite(new THREE.BoxGeometry(0.35, 1.3, 0.1), seite, uc, H * k, f + 0.05), dunkel); }
    pyramide(S, t + 0.8, t + 0.8, t * 1.1, cx, H, cz, dachF);
    return { hoehe: H + t * 1.1, teile: S.anzahl };
  }
  if (art === 'schale') {
    const g = new THREE.CylinderGeometry(R, R, H, 14, 1, false, -PI / 2, PI); g.translate(cx, H / 2, mz1); S.add(g, stein);
    for (let i = 0; i < 7; i++) { const a = -PI / 2 + ((i + 0.5) / 7) * PI; S.box(0.9, 1, 0.9, cx + Math.sin(a) * (R - 0.4), H + 0.5, mz1 + Math.cos(a) * (R - 0.4), stein); }
    for (const k of [0.35, 0.65]) S.box(0.35, 1.3, 0.2, cx, H * k, mz1 + R, dunkel);
    return { hoehe: H + 1, teile: S.anzahl };
  }
  zyl(S, R, R * 1.06, H, cx, 0, cz, stein, 18);
  for (const k of [0.3, 0.55, 0.8]) { S.box(0.35, 1.3, 0.2, cx, H * k, cz + R, dunkel); S.box(0.2, 1.3, 0.35, cx + R, H * k - 1.5, cz, dunkel); }
  if (r() < 0.5) {
    zyl(S, R + 0.6, R + 0.4, 1.4, cx, H, cz, stein, 18);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 2 * PI; S.box(0.9, 1, 0.9, cx + Math.cos(a) * (R + 0.2), H + 1.9, cz + Math.sin(a) * (R + 0.2), stein); }
    spitze(S, R * 0.8, R * 1.6, cx, H + 1.4, cz, dachF, 14);
    return { hoehe: H + 1.4 + R * 1.6, teile: S.anzahl };
  }
  spitze(S, R + 0.5, R * 2.4, cx, H, cz, dachF, 18);
  return { hoehe: H + R * 2.4, teile: S.anzahl };
}

// =====================================================================================
// 15. Denkmal, Wasserturm, Brücke
// =====================================================================================
export function denkmal(S, scene, p) {
  const { x, z, seed = 1 } = p, r = rng(`denkmal:${seed}`);
  const art = p.art ?? waehle(r, ['saeule', 'reiter', 'obelisk']);
  const w = p.w ?? 16, d = p.d ?? 16, cx = x + w / 2, cz = z + d / 2;
  const stein = waehle(r, ['#d6cdb9', '#c9c4b8', '#b9b0a2']), bronze = waehle(r, ['#5f8a78', '#6b8f7f', '#7a6a4f']), gold = '#d8b45a';
  const s = clamp(Math.min(w, d) / 16, 0.6, 1.4);
  for (let i = 0; i < 3; i++) S.box((w - 2 - i * 1.6), 0.35, (d - 2 - i * 1.6), cx, 0.3 + i * 0.35 + 0.175, cz, i % 2 ? heller(stein, 0.04) : stein);
  const y0 = 1.35;
  if (art === 'saeule') {
    S.box(3.4 * s, 4 * s, 3.4 * s, cx, y0 + 2 * s, cz, stein);
    S.box(3.8 * s, 0.5 * s, 3.8 * s, cx, y0 + 4.2 * s, cz, heller(stein, 0.05));
    const h = 18 * s;
    zyl(S, 0.9 * s, 1.0 * s, h, cx, y0 + 4.4 * s, cz, heller(stein, 0.03), 12);
    for (let k = 1; k < 5; k++) zyl(S, 1.05 * s, 1.05 * s, 0.25, cx, y0 + 4.4 * s + (k * h) / 5, cz, stein, 12);
    S.box(2.4 * s, 0.6 * s, 2.4 * s, cx, y0 + 4.4 * s + h + 0.3 * s, cz, stein);
    const fy = y0 + 4.4 * s + h + 0.6 * s, fc = r() < 0.5 ? gold : bronze;
    S.box(0.9 * s, 2.2 * s, 0.7 * s, cx, fy + 1.1 * s, cz, fc);
    S.add(new THREE.SphereGeometry(0.42 * s, 8, 6).translate(cx, fy + 2.5 * s, cz), fc);
    const g = new THREE.BoxGeometry(0.25 * s, 1.6 * s, 0.25 * s); g.rotateZ(-0.5); g.translate(cx + 0.7 * s, fy + 2.6 * s, cz); S.add(g, fc);
    for (const sx of [-1, 1]) { const f = new THREE.BoxGeometry(0.1, 1.6 * s, 1.2 * s); f.rotateX(sx * 0.4); f.translate(cx - 0.3 * s, fy + 1.9 * s, cz + sx * 0.7 * s); S.add(f, fc); }
    return { hoehe: fy + 3.4 * s, teile: S.anzahl };
  }
  if (art === 'obelisk') {
    S.box(3.2 * s, 3 * s, 3.2 * s, cx, y0 + 1.5 * s, cz, stein);
    const h = 16 * s, gr = waehle(r, ['#a59d93', '#b9785e', '#8f8a84']);
    const g = new THREE.CylinderGeometry(0.75 * s * Math.SQRT2, 1.15 * s * Math.SQRT2, h, 4); g.rotateY(PI / 4); g.translate(cx, y0 + 3 * s + h / 2, cz); S.add(g, gr);
    const pg = new THREE.ConeGeometry(0.75 * s * Math.SQRT2, 1.4 * s, 4); pg.rotateY(PI / 4); pg.translate(cx, y0 + 3 * s + h + 0.7 * s, cz); S.add(pg, gold);
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { S.box(0.4, 1.2, 0.4, cx + dx * (w / 2 - 2.2), y0 + 0.6, cz + dz * (d / 2 - 2.2), '#3a3f44'); S.add(new THREE.SphereGeometry(0.35, 6, 4).translate(cx + dx * (w / 2 - 2.2), y0 + 1.4, cz + dz * (d / 2 - 2.2)), '#f2eedd'); }
    return { hoehe: y0 + 3 * s + h + 1.4 * s, teile: S.anzahl };
  }
  // Reiterstandbild
  S.box(6.5 * s, 4 * s, 3.2 * s, cx, y0 + 2 * s, cz, stein);
  S.box(7 * s, 0.4 * s, 3.6 * s, cx, y0 + 4.2 * s, cz, heller(stein, 0.05));
  schildPasst(scene, waehle(r, ['Dem Stifter', 'Dem Landesvater', 'Dem Gründer']), '+z', cx, y0 + 2 * s, cz + 1.6 * s, 0.5 * s, 5 * s, '#d8b45a');
  const hy = y0 + 4.4 * s;
  S.box(3.2 * s, 1.3 * s, 1.1 * s, cx, hy + 2.2 * s, cz, bronze);
  for (const [dx, dz, up] of [[1.2, 0.35, 1], [1.2, -0.35, 0], [-1.2, 0.35, 0], [-1.2, -0.35, 0]]) {
    if (up) { const g = new THREE.BoxGeometry(0.3 * s, 1.5 * s, 0.3 * s); g.rotateZ(1.0); g.translate(cx + (dx + 0.5) * s, hy + 2.0 * s, cz + dz * s); S.add(g, bronze); }
    else S.box(0.3 * s, 1.6 * s, 0.3 * s, cx + dx * s, hy + 0.8 * s, cz + dz * s, bronze);
  }
  { const g = new THREE.BoxGeometry(0.6 * s, 1.6 * s, 0.6 * s); g.rotateZ(-0.6); g.translate(cx + 1.9 * s, hy + 3.1 * s, cz); S.add(g, bronze); }
  S.box(1.1 * s, 0.5 * s, 0.5 * s, cx + 2.5 * s, hy + 3.7 * s, cz, bronze);
  { const g = new THREE.BoxGeometry(0.25 * s, 1.3 * s, 0.25 * s); g.rotateZ(0.5); g.translate(cx - 1.8 * s, hy + 1.8 * s, cz); S.add(g, bronze); }
  S.box(0.7 * s, 1.5 * s, 0.6 * s, cx - 0.1 * s, hy + 3.5 * s, cz, bronze);
  S.add(new THREE.SphereGeometry(0.33 * s, 8, 6).translate(cx - 0.05 * s, hy + 4.6 * s, cz), bronze);
  S.box(0.75 * s, 0.15 * s, 0.75 * s, cx - 0.05 * s, hy + 4.95 * s, cz, bronze);
  return { hoehe: hy + 5.2 * s, teile: S.anzahl };
}
export function wasserturm(S, scene, p) {
  const { x, z, seed = 1 } = p, r = rng(`wasser:${seed}`);
  const art = p.art ?? waehle(r, ['backstein', 'pilz', 'stein']);
  const w = p.w ?? 18, d = p.d ?? 18, cx = x + w / 2, cz = z + d / 2;
  const R = clamp(Math.min(w, d) * 0.3, 3.5, 6.5);
  if (art === 'pilz') {
    const b = waehle(r, ['#e2e0da', '#d6d3cc']), H = zw(r, 26, 34);
    zyl(S, R * 0.38, R * 0.45, H, cx, 0, cz, b, 14);
    { const g = new THREE.CylinderGeometry(R * 1.45, R * 0.4, R * 1.1, 24); g.translate(cx, H + R * 0.55, cz); S.add(g, b); }
    zyl(S, R * 1.47, R * 1.47, R * 0.55, cx, H + R * 1.1, cz, waehle(r, ['#56707f', '#3f6fae']), 24);
    zyl(S, R * 1.5, R * 1.5, 0.5, cx, H + R * 1.65, cz, b, 24);
    zyl(S, R * 0.3, R * 0.3, 2.2, cx, H + R * 1.65 + 0.5, cz, b, 8);
    S.quader(cx - 2, 0, cz + R * 0.3, cx + 2, 3, cz + R * 0.3 + 2.4, b);
    return { hoehe: H + R * 1.65 + 2.7, teile: S.anzahl };
  }
  if (art === 'stein') {
    const st = waehle(r, ['#cfc6b4', '#d9c4a8', '#c9bfae']), H = zw(r, 22, 28);
    zyl(S, R * 0.95, R * 1.1, H, cx, 0, cz, st, 16);
    for (const k of [0.25, 0.5, 0.75]) { S.box(0.9, 2, 0.3, cx, H * k, cz + R, '#3f4c58'); zyl(S, R * 1.06 - k * 0.15 + 0.15, R * 1.06 - k * 0.15 + 0.15, 0.4, cx, H * k - 1.6, cz, heller(st, 0.05), 16); }
    zyl(S, R * 1.5, R * 1.0, 2.5, cx, H, cz, heller(st, 0.05), 16);
    zyl(S, R * 1.5, R * 1.5, 6, cx, H + 2.5, cz, '#f1ece2', 16);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 2 * PI; if (Math.cos(a) < -0.3 && Math.sin(a) < -0.3) continue; S.box(0.8, 2.2, 0.3, cx + Math.cos(a) * R * 1.52, H + 5.5, cz + Math.sin(a) * R * 1.52, '#3f4c58', -a - PI / 2); }
    haube(S, R * 1.55, cx, H + 8.5, cz, '#6f9a7d', 0.75, 18);
    zyl(S, 0.8, 0.8, 2.5, cx, H + 8.5 + R * 1.15, cz, '#f1ece2', 8); haube(S, 1, cx, H + 11 + R * 1.15, cz, '#6f9a7d', 1.2, 8);
    return { hoehe: H + 12.5 + R * 1.15, teile: S.anzahl };
  }
  const bs = waehle(r, ['#a8583f', '#b06a52', '#9e5c47']), H = zw(r, 22, 30), dachF = waehle(r, ['#56636c', '#6f9a7d']);
  { const g = new THREE.CylinderGeometry(R * 0.95, R * 1.05, H, 8); g.rotateY(PI / 8); g.translate(cx, H / 2, cz); S.add(g, bs); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI; S.box(0.7, H, 0.7, cx + Math.cos(a) * R, H / 2, cz + Math.sin(a) * R, dunkler(bs, 0.04)); }
  for (const k of [0.2, 0.42, 0.64]) { S.box(0.8, 2.2, 0.3, cx, H * k, cz + R * 0.96, '#3f4c58'); S.box(0.3, 2.2, 0.8, cx + R * 0.96, H * k + 1.5, cz, '#3f4c58'); }
  { const g = new THREE.CylinderGeometry(R * 1.55, R * 1.0, 2.2, 8); g.rotateY(PI / 8); g.translate(cx, H + 1.1, cz); S.add(g, bs); }
  { const g = new THREE.CylinderGeometry(R * 1.55, R * 1.55, 6.5, 8); g.rotateY(PI / 8); g.translate(cx, H + 5.45, cz); S.add(g, waehle(r, ['#e9e2d0', '#6b7680', bs])); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 2 * PI + PI / 8; if (Math.cos(a) < -0.3 && Math.sin(a) < -0.3) continue; S.box(1.2, 1.6, 0.3, cx + Math.cos(a) * R * 1.45, H + 5.4, cz + Math.sin(a) * R * 1.45, '#3f4c58', -a - PI / 2); }
  { const g = new THREE.ConeGeometry(R * 1.75, R * 1.6, 8); g.rotateY(PI / 8); g.translate(cx, H + 8.7 + R * 0.8, cz); S.add(g, dachF); }
  zyl(S, 0.9, 0.9, 2.4, cx, H + 8.7 + R * 1.5, cz, '#e9e2d0', 8); spitze(S, 1.1, 2.6, cx, H + 11.1 + R * 1.5, cz, dachF, 8);
  return { hoehe: H + 13.7 + R * 1.5, teile: S.anzahl };
}
/** Brücke entlang x über [x, x+w], Breite d. art 'stein' | 'stahl'; wasser: true legt Wasser darunter. */
export function bruecke(S, scene, p) {
  const { x, z, seed = 1 } = p, r = rng(`bruecke:${seed}`);
  const art = p.art ?? waehle(r, ['stein', 'stahl']);
  const w = p.w ?? 90, d = p.d ?? 14, Hd = p.hoehe ?? 8;
  if (p.wasser !== false) S.quader(x - 4, -0.6, z - 10, x + w + 4, 0.1, z + d + 10, FARBEN.wasser);
  const deck = (y) => {
    S.quader(x, y - 0.2, z + 2.2, x + w, y + 0.05, z + d - 2.2, FARBEN.asphalt);
    S.quader(x, y - 0.2, z, x + w, y + 0.25, z + 2.2, FARBEN.gehweg); S.quader(x, y - 0.2, z + d - 2.2, x + w, y + 0.25, z + d, FARBEN.gehweg);
    for (let u = x + 4; u < x + w; u += 8) S.box(0.6, 0.06, 0.2, u, y + 0.08, z + d / 2, FARBEN.markierung);
  };
  if (art === 'stein') {
    const st = waehle(r, ['#cfc6b4', '#c9bfae', '#b9a58a', '#d6cdb9']), hl = heller(st, 0.05);
    const n = Math.max(2, Math.round(w / 18)), sp = w / n, lo = [];
    for (let i = 0; i < n; i++) { const u = x + (i + 0.5) * sp, b = sp * 0.78; lo.push({ u0: u - b / 2, u1: u + b / 2, v0: -1, v1: Math.min(Hd - 1.2, -1 + b * 0.5 + 1.5), bogen: true }); }
    const sh = rechteck(x - 2, -0.5, x + w + 2, Hd - 0.2);
    for (const l of lo) sh.holes.push(oeffnung(new THREE.Path(), l.u0, Math.max(l.v0, -0.4), l.u1, l.v1, true));
    flaeche(S, '+z', sh, z + d, d, st);
    for (let i = 1; i < n; i++) { const u = x + i * sp; const g = new THREE.ConeGeometry(1.6, Hd * 0.45, 3); g.rotateY(PI); g.translate(u, Hd * 0.22, z + d + 0.8); S.add(g, st); S.box(1.4, 0.4, 0.8, u, Hd - 0.6, z + d + 0.3, hl); }
    deck(Hd);
    for (const zz of [z + 0.3, z + d - 0.3]) { S.quader(x - 2, Hd, zz - 0.3, x + w + 2, Hd + 1.1, zz + 0.3, hl); }
    for (let u = x + sp; u < x + w; u += sp) for (const zz of [z + 0.3, z + d - 0.3]) { S.box(0.25, 4, 0.25, u, Hd + 2, zz, '#3a3f44'); S.box(1.0, 0.4, 0.4, u, Hd + 4, zz, '#3a3f44'); }
    return { hoehe: Hd + 4.5, teile: S.anzahl };
  }
  const stahl = waehle(r, ['#5f7f6f', '#6b7a86', '#7d8a92', '#3f6f8f']);
  // Widerlager
  for (const [a, b] of [[x - 2, x + 4], [x + w - 4, x + w + 2]]) S.quader(a, 0, z - 0.5, b, Hd, z + d + 0.5, '#bfb8ab');
  if (w > 80) S.quader(x + w / 2 - 2, 0, z - 0.5, x + w / 2 + 2, Hd - 1.2, z + d + 0.5, '#bfb8ab');
  S.quader(x, Hd - 1.4, z, x + w, Hd - 0.2, z + d, stahl);
  deck(Hd);
  const th = clamp(w * 0.11, 6, 10), feld = 6, n = Math.round(w / feld), fb = w / n;
  for (const zz of [z + 0.6, z + d - 0.6]) {
    S.quader(x, Hd + th - 0.5, zz - 0.35, x + w, Hd + th, zz + 0.35, stahl);
    S.quader(x, Hd, zz - 0.35, x + w, Hd + 0.6, zz + 0.35, stahl);
    for (let i = 0; i <= n; i++) S.box(0.4, th, 0.5, x + i * fb, Hd + th / 2, zz, stahl);
    for (let i = 0; i < n; i++) { const g = new THREE.BoxGeometry(Math.hypot(fb, th) + 0.2, 0.35, 0.4); g.rotateZ((i < n / 2 ? 1 : -1) * Math.atan(th / fb)); g.translate(x + (i + 0.5) * fb, Hd + th / 2, zz); S.add(g, stahl); }
  }
  for (let i = 0; i <= n; i += 2) S.box(0.4, 0.4, d - 1.2, x + i * fb, Hd + th - 0.25, z + d / 2, stahl);
  for (const u of [x + 0.5, x + w - 0.5]) { S.box(0.6, 1.6, d - 1, u, Hd + th - 1.2, z + d / 2, stahl); }
  return { hoehe: Hd + th, teile: S.anzahl };
}

// =====================================================================================
// 16. Weitere Varianten: Theater/Museum modern, Markthalle Beton, Hotel, Konkurrenz
// =====================================================================================
function theaterModern(S, scene, p) {
  const { x, z } = p, r = rng(`thm:${p.seed}`);
  const w = p.w ?? 48, d = p.d ?? 40, name = p.name ?? waehle(r, ['Schauspielhaus', 'Stadttheater', 'Kammerspiele']);
  const platten = waehle(r, ['#e9e4d8', '#dcd6c8', '#d4d1ca']), glas = '#7f9fb0', weiss = '#f4f4f2';
  const fd = 10, Hf = 9;
  S.quader(x + 1, 0, z + d - fd, x + w - 1, Hf, z + d - 0.5, glas);
  for (let u = x + 2; u < x + w - 1; u += 2) S.box(0.15, Hf, 0.2, u, Hf / 2, z + d - 0.4, weiss);
  for (let u = z + d - fd + 1.5; u < z + d; u += 2) S.box(0.2, Hf, 0.15, x + w - 0.9, Hf / 2, u, weiss);
  S.quader(x + 1, Hf * 0.5 - 0.2, z + d - fd, x + w - 1, Hf * 0.5 + 0.2, z + d - 0.3, weiss);
  S.quader(x - 1, Hf, z + d - fd - 1, x + w + 1, Hf + 0.6, z + d + 2.5, weiss);
  for (let u = x + 1.5; u < x + w - 1; u += 3.2) S.box(0.9, 1.4, 0.06, u, Hf * 0.75, z + d - 0.48, waehle(r, ['#d9533e', '#e8b33a', '#3f6fae', '#7cb24f']));
  const hz1 = z + d - fd;
  S.quader(x + 2, 0, z + 2, x + w - 2, 15, hz1, platten);
  for (let u = x + 4; u < x + w - 2; u += 2.4) S.box(0.3, 15, 0.2, u, 7.5, hz1 + 0.05, dunkler(platten, 0.05));
  S.quader(x + w * 0.25, 15, z + 3, x + w * 0.75, 28, z + 3 + (hz1 - z) * 0.55, weiss);
  for (let u = x + w * 0.25 + 1.5; u < x + w * 0.75; u += 2.5) S.box(0.4, 13, 0.3, u, 21.5, z + 3 + (hz1 - z) * 0.55 + 0.1, '#dfe2e4');
  schildPasst(scene, name, '+z', x + w / 2, 25.5, z + 3 + (hz1 - z) * 0.55 + 0.3, 2.0, w * 0.48, '#2f3b44');
  schildPasst(scene, name, '+z', x + w / 2, Hf + 1.6, z + d + 2.5, 1.1, w * 0.5, '#2f3b44');
  return { hoehe: 28, teile: S.anzahl };
}
function museumModern(S, scene, p) {
  const { x, z } = p, r = rng(`mum:${p.seed}`);
  const w = p.w ?? 54, d = p.d ?? 32, name = p.name ?? waehle(r, ['Kunsthalle', 'Museum am Fluss', 'Forum für Kunst']);
  const weiss = waehle(r, ['#f2f1ec', '#e9e7e1', '#d9d4c8']), dunkel = '#3a3f44';
  S.quader(x + 1, 0, z + 1, x + w * 0.62, 12, z + d - 6, weiss);
  S.quader(x + w * 0.35, 6, z + d * 0.25, x + w - 1, 17, z + d - 1, weiss);
  S.quader(x + w * 0.62, 0.3, z + d * 0.25, x + w - 2, 6, z + d - 2, '#7f9fb0');
  S.box(0.8, 5.7, 0.8, x + w - 3, 3.15, z + d - 3, weiss);
  S.quader(x + w * 0.38, 13, z + d - 1, x + w - 4, 13.6, z + d - 0.92, dunkel);
  S.quader(x + w - 1, 8, z + d * 0.3, x + w - 0.92, 15.5, z + d * 0.3 + 0.6, dunkel);
  S.quader(x + 3, 3, z + d - 6, x + 3.6, 11, z + d - 5.92, dunkel);
  schildPasst(scene, name, '+z', x + w * 0.68, 15.2, z + d - 1, 1.6, w * 0.55, '#2f3b44');
  const bf = waehle(r, ['#c9483e', '#2f6f8f', '#e3b23c']);
  for (const u of [x + w * 0.42, x + w * 0.5]) S.quader(u, 7, z + d - 0.9, u + 2.2, 12.5, z + d - 0.8, bf);
  S.quader(x + w - 0.95, 1, z + d * 0.4, x + w - 0.85, 5.2, z + d * 0.4 + 2.2, bf);
  belag(S, x, z + d - 6, x + w * 0.35, z + d, '#e2ddd2');
  for (let u = x + 2; u < x + w * 0.33; u += 3) S.box(0.5, 0.5, 0.5, u, 0.6, z + d - 0.8, '#bfb8ab');
  // Skulptur
  const sx = x + w * 0.25, sz = z + d - 3, rot = waehle(r, ['#c9483e', '#e3b23c', '#2f6f8f']);
  for (let i = 0; i < 3; i++) { const g = new THREE.BoxGeometry(0.6, 4, 0.6); g.rotateZ(-0.5 + i * 0.5); g.rotateX(0.3 * (i - 1)); g.translate(sx + i * 0.8, 2.4, sz); S.add(g, rot); }
  return { hoehe: 17, teile: S.anzahl };
}
function museumBackstein(S, scene, p) {
  const { x, z } = p, r = rng(`mub:${p.seed}`);
  const w = p.w ?? 56, d = p.d ?? 28, name = p.name ?? waehle(r, ['Landesmuseum', 'Stadtmuseum', 'Naturkundemuseum']);
  const bs = waehle(r, ['#a8583f', '#b06a52']), hell = '#e3d6c0', dachF = waehle(r, ['#56636c', '#6f9a7d']);
  const H = 15, ob = { y0: 1.2, geschosse: 2, gh: 6.6, raster: 4, fw: 2.2, fh: 4.0, bogen: true, tiefe: 0.7 };
  lochBlock(S, x, z, w, d, 0, H, bs, ob);
  for (const seite of ['+z', '+x']) { const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d, f = seite === '+z' ? z + d : x + w; baenke(S, seite, rasterLoecher(u0, u0 + L, ob), f, hell); }
  gesims(S, x, z, w, d, 1.2, 0.5, 0.2, hell); gesims(S, x, z, w, d, 7.8, 0.4, 0.2, hell); gesims(S, x, z, w, d, H, 0.9, 0.5, hell);
  satteldach(S, x, z, w, d, H + 0.45, 6, dachF, 'x', d * 0.4);
  const t = 10, tx0 = x + w / 2 - t / 2, tz0 = z + d - t + 1, Ht = 30;
  S.quader(tx0, 0, tz0, tx0 + t, Ht, tz0 + t, bs);
  for (const yy of [H, Ht]) gesims(S, tx0, tz0, t, t, yy, 0.7, 0.4, hell);
  for (const seite of ['+z', '+x']) { const f = seite === '+z' ? tz0 + t : tx0 + t, uc = seite === '+z' ? tx0 + t / 2 : tz0 + t / 2; platte(S, seite, uc - 2, 0.3, uc + 2, 6.5, f, '#4a3a2e', true, 0.25); platte(S, seite, uc - 1.6, H + 2, uc + 1.6, Ht - 2, f, '#55636f', true); }
  giebel(S, '+z', tx0, tx0 + t, Ht, 5, tz0 + t, bs, 'treppe', { hell, stufen: 4 });
  pyramide(S, t, t, 6, tx0 + t / 2, Ht + 0.3, tz0 + t / 2, dachF);
  schildPasst(scene, name, '+z', tx0 + t / 2, 8.2, tz0 + t, 0.9, t - 1, '#ffffff');
  return { hoehe: Ht + 6.3, teile: S.anzahl };
}
function markthalleBeton(S, scene, p) {
  const { x, z } = p, r = rng(`mhb:${p.seed}`);
  const w = p.w ?? 54, d = p.d ?? 30, dt = d - 6;
  const beton = waehle(r, ['#d6d3cc', '#cfccc6', '#e2e0da']), glas = '#7f9fb0';
  S.quader(x, 0, z, x + w, 6, z + dt, beton);
  S.quader(x + 1, 0.3, z + dt, x + w - 1, 4.6, z + dt + 0.06, glas);
  const n = Math.max(3, Math.round(w / 10)), b = w / n, hv = b * 0.45;
  for (let i = 0; i < n; i++) {
    const cx = x + (i + 0.5) * b;
    const g = new THREE.CylinderGeometry(b / 2, b / 2, dt + 1, 18, 1, false, PI / 2, PI); g.rotateX(PI / 2); g.scale(1, hv / (b / 2), 1); g.translate(cx, 6, z + dt / 2); S.add(g, beton);
    const s = new THREE.Shape(); for (let k = 0; k <= 16; k++) { const a = (k / 16) * PI; const pu = cx + (b / 2 - 0.5) * Math.cos(a), pv = 6 + (hv - 0.4) * Math.sin(a); k ? s.lineTo(pu, pv) : s.moveTo(pu, pv); } s.lineTo(cx + b / 2 - 0.5, 6);
    flaeche(S, '+z', s, z + dt + 0.55, 0.3, glas);
    for (let q = -2; q <= 2; q++) S.box(0.15, (hv - 0.4) * Math.sqrt(1 - (q / 2.6) ** 2), 0.12, cx + q * b * 0.18, 6 + (hv - 0.4) * Math.sqrt(1 - (q / 2.6) ** 2) / 2, z + dt + 0.6, '#f4f4f2');
  }
  schildPasst(scene, 'Großmarkthalle', '+x', z + dt / 2, 4.2, x + w, 1.2, dt * 0.6, '#2f3b44');
  schildPasst(scene, 'Markthalle', '+z', x + b / 2, 5.3, z + dt + 0.1, 0.8, b - 1, '#2f3b44');
  for (let u = x + 3; u < x + w - 4; u += 7) { const zz = z + dt + 3; S.quader(u, 0.3, zz - 1, u + 4, 1.2, zz + 1, '#b88a5a'); const g = dachProfil(4.4, 2.6, 0.8, 0, 'x'); g.translate(u + 2, 2.6, zz); S.add(g, waehle(r, ['#c9483e', '#2f6f8f', '#3f7d56', '#d39a2b'])); for (const a of [u + 0.1, u + 3.9]) S.box(0.12, 2.3, 0.12, a, 1.45, zz + 1, '#59636b'); }
  return { hoehe: 6 + hv, teile: S.anzahl };
}
function hotelTurm(S, scene, p) {
  const { x, z } = p, r = rng(`hoteltu:${p.seed}`);
  const w = p.w ?? 30, d = p.d ?? 24, G = p.geschosse ?? Math.round(zw(r, 14, 20)), gh = 3.1;
  const name = p.name ?? waehle(r, ['Hotel Panorama', 'Hotel Kontinental', 'Hotel Rheinturm', 'Parkhotel']);
  const wand = waehle(r, ['#efece4', '#e3e6e8', '#e6dccb']), ak = p.akzent ?? waehle(r, ['#2f6f8f', '#c98a3a', '#6b4f8f']);
  lochBlock(S, x, z, w, d, 0, 7, wand, { y0: 0, geschosse: 1, gh: 7, raster: 4, fw: 3.2, fh: 5.4, bruestung: 0.4, innen: '#56707f' });
  S.quader(x - 0.2, 7, z - 0.2, x + w + 0.2, 7.6, z + d + 0.2, ak);
  const tw = w * 0.72, td = d * 0.62, tx0 = x + (w - tw) / 2, tz0 = z + 1, Ht = 7.6 + G * gh;
  lochBlock(S, tx0, tz0, tw, td, 7.6, Ht, wand, { y0: 7.6, geschosse: G, gh, raster: 2.6, fw: 1.9, fh: 2.0, tiefe: 0.4 });
  for (let k = 0; k < G; k++) S.quader(tx0 - 0.1, 7.6 + k * gh, tz0 + td, tx0 + tw + 0.1, 7.6 + k * gh + 0.25, tz0 + td + 1.4, '#f6f6f3');
  for (let k = 0; k < G; k++) S.quader(tx0 - 0.1, 7.6 + k * gh + 0.25, tz0 + td + 1.32, tx0 + tw + 0.1, 7.6 + k * gh + 1.2, tz0 + td + 1.4, ak);
  S.quader(tx0 - 0.3, Ht, tz0 - 0.3, tx0 + tw + 0.3, Ht + 1.2, tz0 + td + 1.6, ak);
  S.quader(tx0 + 2, Ht + 1.2, tz0 + 2, tx0 + tw - 2, Ht + 2.6, tz0 + td - 2, '#c9cdd0');
  schildPasst(scene, name, '+z', tx0 + tw / 2, Ht + 4, tz0 + td + 1.2, 2.6, tw * 0.95, ak);
  S.quader(tx0 + tw * 0.1, Ht + 1.2, tz0 + td + 0.9, tx0 + tw * 0.9, Ht + 1.6, tz0 + td + 1.2, '#59636b');
  schildPasst(scene, name, '+x', z + d / 2, 4.8, x + w, 1.0, d - 2, '#ffffff', ak);
  return { hoehe: Ht + 5.5, teile: S.anzahl };
}
function hotelFuenfziger(S, scene, p) {
  const { x, z } = p, r = rng(`hotel50:${p.seed}`);
  const w = p.w ?? 40, d = p.d ?? 15, G = p.geschosse ?? Math.round(zw(r, 8, 10.4)), gh = 3.1, eg = 5;
  const name = p.name ?? waehle(r, ['Hotel Europa', 'Hotel Kurfürst', 'Hotel Am Ring', 'Hotel Bahnhof']);
  const wand = waehle(r, ['#f2efe6', '#ece6d6']), pastell = waehle(r, [['#9ec3d6', '#e7c96b'], ['#e2a9a1', '#a9c9a4'], ['#b7c4d6', '#e8d6a4']]);
  S.quader(x, 0, z, x + w - 0.6, eg, z + d - 0.6, '#56707f');
  for (let u = x + 1; u < x + w; u += 4) S.box(0.5, eg, 0.5, u, eg / 2, z + d - 0.4, '#e8ecee');
  const H = eg + G * gh;
  const ob = { y0: eg, geschosse: G, gh, raster: 2.8, fw: 1.6, fh: 1.9, tiefe: 0.35 };
  lochBlock(S, x, z, w, d, eg, H, wand, ob);
  for (const l of rasterLoecher(x, x + w, ob)) { const i = Math.round((l.u0 - x) / 2.8); S.quader(l.u0 - 0.6, l.v0 - 0.8, z + d, l.u1 + 0.6, l.v0 - 0.08, z + d + 0.1, pastell[(i + Math.round(l.v0 / gh)) % 2]); }
  for (let k = 0; k < G; k++) { const y = eg + k * gh; S.quader(x + w * 0.62, y - 0.05, z + d, x + w - 1, y + 0.15, z + d + 1.3, '#f4f4f2'); S.quader(x + w * 0.62, y + 0.15, z + d + 1.25, x + w - 1, y + 1.05, z + d + 1.3, '#59636b'); }
  S.quader(x - 1.5, H + 1.6, z - 1, x + w + 1.5, H + 2.0, z + d + 1.5, '#f4f4f2');
  for (const [a, b] of [[x + 3, z + 3], [x + w - 3, z + 3], [x + 3, z + d - 3], [x + w - 3, z + d - 3]]) S.box(0.3, 1.6, 0.3, a, H + 0.8, b, '#9aa3ab');
  S.quader(x + 4, H, z + 2, x + w - 6, H + 1.6, z + d - 3, '#9ab7c4');
  schildPasst(scene, name, '+z', x + w * 0.35, H + 3.3, z + d + 1.2, 2.2, w * 0.55, '#c9483e');
  S.quader(x + 2, eg - 1, z + d, x + w * 0.4, eg - 0.6, z + d + 3.5, '#f4f4f2');
  return { hoehe: H + 4.5, teile: S.anzahl };
}
function konkurrenzZentra(S, scene, p) {
  const { x, z } = p, r = rng(`zentra:${p.seed}`);
  const w = p.w ?? 46, d = p.d ?? 36, G = 5, eg = 5.5, gh = 3.8, H = eg + (G - 1) * gh;
  const weiss = '#f2f0ea', navy = KONKURRENZ.zentra.farbe, band = '#45525c', R = Math.min(12, d * 0.35);
  S.quader(x, 0, z, x + w - R, H, z + d, weiss); S.quader(x + w - R, 0, z, x + w, H, z + d - R, weiss);
  const ec = new THREE.CylinderGeometry(R, R, H, 16, 1, false, 0, PI / 2); ec.translate(x + w - R, H / 2, z + d - R); S.add(ec, weiss);
  for (let k = 0; k < G; k++) {
    const y0 = k === 0 ? 0.3 : eg + (k - 1) * gh + 1.0, y1 = k === 0 ? eg - 1.0 : y0 + 1.9, c = k === 0 ? '#56707f' : band;
    S.quader(x + 1, y0, z + d, x + w - R, y1, z + d + 0.12, c); S.quader(x + w, y0, z + 1, x + w + 0.12, y1, z + d - R, c);
    const g = new THREE.CylinderGeometry(R + 0.1, R + 0.1, y1 - y0, 16, 1, true, 0, PI / 2); g.translate(x + w - R, (y0 + y1) / 2, z + d - R); S.add(g, c);
  }
  const vd = new THREE.CylinderGeometry(R + 2.4, R + 2.4, 0.5, 16, 1, false, 0, PI / 2); vd.translate(x + w - R, eg - 0.6, z + d - R); S.add(vd, navy);
  S.quader(x, eg - 0.85, z + d, x + w - R, eg - 0.35, z + d + 2.4, navy); S.quader(x + w, eg - 0.85, z, x + w + 2.4, eg - 0.35, z + d - R, navy);
  // Treppenturm mit Namen
  const sx = x + w * 0.3;
  S.quader(sx - 3, 0, z + d - 4, sx + 3, H + 7, z + d + 0.5, weiss);
  for (let y = 2; y < H + 5; y += 1.4) S.quader(sx - 0.6, y, z + d + 0.5, sx + 0.6, y + 0.8, z + d + 0.58, band);
  S.quader(sx - 3.2, H + 3, z + d + 0.5, sx + 3.2, H + 7, z + d + 0.65, navy);
  schildPasst(scene, 'ZENTRA', '+z', sx, H + 5, z + d + 0.5, 2.2, 5.6, '#ffffff');
  schildPasst(scene, 'Zentra Kaufhaus', '+x', z + (d - R) / 2, H - 1.5, x + w, 1.6, d - R - 3, navy);
  gesims(S, x, z, w - R, d, H, 0.5, 0.2, '#e3e0d8');
  return { hoehe: H + 7, teile: S.anzahl };
}
function konkurrenzLederer(S, scene, p) {
  const { x, z } = p, r = rng(`lederer:${p.seed}`);
  const w = p.w ?? 30, d = p.d ?? 24, G = 3, eg = 6.5, gh = 4.2, H = eg + G * gh;
  const stein = waehle(r, ['#e8e2d6', '#ece8e0']), schwarz = '#22252a', gold = '#c8a24a';
  const loE = { y0: 0, geschosse: 1, gh: eg, raster: 5.4, fw: 4.2, fh: 5.0, bruestung: 0.5, bogen: true, tiefe: 0.8, innen: '#efe6d4' };
  lochBlock(S, x, z, w, d, 0, eg, schwarz, loE);
  for (const seite of ['+z', '+x']) { const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d, f = seite === '+z' ? z + d : x + w; for (const l of rasterLoecher(u0, u0 + L, loE)) sbox(S, seite, l.u0 - 0.2, l.u1 + 0.2, l.v1 + 0.1, l.v1 + 0.35, f, f + 0.15, gold); }
  const ob = { y0: eg, geschosse: G, gh, raster: 3.4, fw: 1.7, fh: 3.0, tiefe: 0.6 };
  lochBlock(S, x, z, w, d, eg, H, stein, ob);
  for (const seite of ['+z', '+x']) { const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d, f = seite === '+z' ? z + d : x + w; const lo = rasterLoecher(u0, u0 + L, ob); baenke(S, seite, lo, f, '#ffffff'); verdachung(S, seite, lo, f, '#ffffff'); }
  S.quader(x - 0.2, eg, z - 0.2, x + w + 0.2, eg + 1.4, z + d + 0.2, schwarz);
  schildPasst(scene, 'LEDERER', '+z', x + w / 2, eg + 0.7, z + d + 0.2, 1.1, w * 0.6, gold);
  schildPasst(scene, 'LEDERER', '+x', z + d / 2, eg + 0.7, x + w + 0.2, 1.1, d * 0.6, gold);
  gesims(S, x, z, w, d, H, 0.8, 0.45, '#ffffff');
  for (let u = x + 0.5; u < x + w; u += 1.2) S.box(0.4, 1.1, 0.4, u, H + 0.95, z + d - 0.2, '#ffffff');
  for (let u = z + 0.5; u < z + d; u += 1.2) S.box(0.4, 1.1, 0.4, x + w - 0.2, H + 0.95, u, '#ffffff');
  S.quader(x - 0.1, H + 1.5, z - 0.1, x + w + 0.1, H + 1.8, z + d + 0.1, '#ffffff');
  S.quader(x + 0.3, H + 0.4, z + 0.3, x + w - 0.3, H + 0.5, z + d - 0.3, '#b9bec2');
  for (const seite of ['+z', '+x']) { const u0 = seite === '+z' ? x : z, L = seite === '+z' ? w : d, f = seite === '+z' ? z + d : x + w; for (const l of rasterLoecher(u0, u0 + L, loE)) markise(S, x, z, w, d, seite, eg - 0.4, l.u0, l.u1 - l.u0, schwarz); }
  return { hoehe: H + 1.8, teile: S.anzahl };
}
function konkurrenzKaufring(S, scene, p) {
  const { x, z } = p, r = rng(`kaufring:${p.seed}`);
  const w = p.w ?? 50, d = p.d ?? 40, G = 4, eg = 5.5, gh = 4.4, H = eg + (G - 1) * gh;
  const gruen = KONKURRENZ.kaufring.farbe, glas = '#6f8e9f', wand = '#e6e2d6';
  S.quader(x, 0, z, x + w - 1.2, eg, z + d - 1.2, '#4b5965');
  S.quader(x, eg, z, x + w, H, z + d, wand);
  S.quader(x + 0.5, eg, z + d, x + w - 0.5, H - 0.6, z + d + 0.15, glas);
  for (let u = x + 1; u < x + w; u += 1.8) S.box(0.14, H - eg - 0.6, 0.2, u, (H + eg - 0.6) / 2, z + d + 0.18, '#e8ecee');
  for (let k = 1; k < G; k++) S.quader(x + 0.5, eg + k * gh - 0.25, z + d + 0.1, x + w - 0.5, eg + k * gh, z + d + 0.3, '#e8ecee');
  // Mosaik auf +x
  const farben = ['#3a7d44', '#e3b23c', '#2f6f8f', '#c9483e', '#f2f1ec'];
  for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) if (r() < 0.6) { const u = z + 3 + i * ((d - 6) / 7), y = eg + 1 + j * ((H - eg - 2) / 4); S.quader(x + w, y, u, x + w + 0.1, y + (H - eg - 2) / 4 - 0.3, u + (d - 6) / 7 - 0.3, waehle(r, farben)); }
  S.quader(x - 0.5, eg - 0.9, z + d - 1.5, x + w + 0.5, eg - 0.3, z + d + 3, gruen);
  S.quader(x + w - 1.5, eg - 0.9, z - 0.5, x + w + 3, eg - 0.3, z + d + 3, gruen);
  // Staffelgeschoss mit Dachrestaurant
  S.quader(x + 4, H, z + 4, x + w - 6, H + 3.6, z + d - 6, glas);
  S.quader(x + 3, H + 3.6, z + 3, x + w - 5, H + 4.0, z + d - 5, '#f4f4f2');
  S.quader(x + w * 0.2, H + 0.2, z + d - 0.4, x + w * 0.8, H + 3.4, z + d - 0.2, gruen);
  schildPasst(scene, 'Kaufring', '+z', x + w / 2, H + 1.8, z + d - 0.2, 2.4, w * 0.56, '#ffffff');
  schildPasst(scene, 'Kaufring', '+x', z + d / 2, eg + 0.5, x + w + 0.1, 0.0001 + 1.4, d * 0.4, '#ffffff', gruen);
  return { hoehe: H + 4, teile: S.anzahl };
}

// =====================================================================================
// 17. Slot-Vokabular der Stadt
// =====================================================================================
/**
 * Passt einen Generator in eine Stadtfläche: zu kleine Flächen werden in Nennmaß gebaut und skaliert,
 * zu große Flächen bekommen den Bau in Nennmaß mittig.
 */
function eingepasst(fn, min, max) {
  return (S, scene, p) => {
    const w = p.w, d = p.d;
    if (w >= min[0] && d >= min[1]) {
      const bw = Math.min(w, max[0]), bd = Math.min(d, max[1]);
      return fn(S, scene, { ...p, x: p.x + (w - bw) / 2, z: p.z + (d - bd) / 2, w: bw, d: bd });
    }
    const nw = Math.max(min[0], w), nd = Math.max(min[1], d);
    return skaliert(S, scene, p, nw, nd, (S2, sc2, pp) => fn(S2, sc2, pp));
  };
}
const nachSeed = (p, liste) => waehle(rng(`slot:${p.seed}:${p.id ?? ''}`), liste);
export const SLOTS = {
  'slot:kirche': (S, scene, p) => kirche(S, scene, { ...p, typ: p.typ ?? (p.w * p.d > 3000 ? 'dom' : 'stadt') }),
  'slot:rathaus': (S, scene, p) => rathaus(S, scene, p),
  'slot:schloss': eingepasst(schloss, [70, 56], [160, 130]),
  'slot:theater': (S, scene, p) => { const v = p.variante ?? nachSeed(p, ['klassisch', 'oper', 'modern']); return eingepasst(kulturbau, v === 'oper' ? [50, 44] : [36, 36], [70, 60])(S, scene, { ...p, art: v === 'oper' ? 'oper' : 'theater', variante: v === 'modern' ? 'modern' : 'klassisch' }); },
  'slot:museum': (S, scene, p) => eingepasst(kulturbau, [44, 26], [80, 40])(S, scene, { ...p, art: 'museum', variante: p.variante ?? nachSeed(p, ['klassisch', 'modern', 'backstein']) }),
  'slot:tor': (S, scene, p) => (p.art === 'mauerturm' ? eingepasst(stadtmauerturm, [12, 8], [26, 14]) : eingepasst(stadttor, [12, 10], [26, 18]))(S, scene, p),
  'slot:denkmal': eingepasst(denkmal, [8, 8], [24, 24]),
  'slot:markthalle': (S, scene, p) => eingepasst(markthalle, [34, 22], [80, 40])(S, scene, { ...p, variante: p.variante ?? nachSeed(p, ['backstein', 'eisen', 'beton']) }),
  'slot:hochhaus': eingepasst((S, scene, p) => buerohochhaus(S, scene, { ...p, geschosse: p.geschosse ?? 14 + Math.floor(rng(p.seed)() * 12) }), [16, 16], [40, 36]),
  'slot:hotel': (S, scene, p) => eingepasst(hotel, [24, 14], [50, 30])(S, scene, { ...p, stil: p.stil ?? nachSeed(p, ['modern', 'grand', 'turm', 'fuenfziger']) }),
  'slot:parkhaus': eingepasst(parkhaus, [24, 30], [60, 60]),
  'slot:konkurrenz': (S, scene, p) => eingepasst(konkurrenz, [28, 22], [60, 46])(S, scene, { ...p, marke: p.marke ?? nachSeed(p, Object.keys(KONKURRENZ)) }),
  'slot:mall': eingepasst(einkaufszentrum, [50, 40], [120, 90]),
  'slot:bahnhof': (S, scene, p) => (p.d < 60 ? eingepasst(empfangsgebaeude, [50, 18], [140, 30]) : eingepasst(hauptbahnhof, [100, 80], [180, 120]))(S, scene, p),
  'slot:wasserturm': eingepasst(wasserturm, [10, 10], [24, 24]),
  'slot:tankstelle': eingepasst(tankstelle, [30, 26], [44, 40]),
  'slot:discounter': (S, scene, p) => eingepasst(discounter, [34, 40], [60, 60])(S, scene, { ...p, marke: p.marke ?? nachSeed(p, Object.keys(MARKEN)) }),
};

// ---------- Verteiler (rückwärtskompatibel) ----------
/** Theater/Oper/Museum. art: 'theater' | 'oper' | 'museum'; variante: 'klassisch' | 'modern' (Theater, Museum) | 'backstein' (Museum). */
export function kulturbau(S, scene, p) {
  const r = rng(p.seed ?? 1);
  const art = p.art ?? waehle(r, ['theater', 'oper', 'museum']);
  if (art === 'theater' && p.variante === 'modern') return theaterModern(S, scene, p);
  if (art === 'museum' && p.variante === 'modern') return museumModern(S, scene, p);
  if (art === 'museum' && p.variante === 'backstein') return museumBackstein(S, scene, p);
  return kulturbauKlassisch(S, scene, { ...p, art });
}
/** Markthalle. variante: 'backstein' | 'eisen' | 'beton'. */
export function markthalle(S, scene, p) {
  return p.variante === 'beton' ? markthalleBeton(S, scene, p) : markthalleAlt(S, scene, p);
}
/** Hotel. stil: 'modern' | 'grand' | 'turm' | 'fuenfziger'. */
export function hotel(S, scene, p) {
  if (p.stil === 'turm') return hotelTurm(S, scene, p);
  if (p.stil === 'fuenfziger') return hotelFuenfziger(S, scene, p);
  return hotelAlt(S, scene, p);
}
/** Konkurrenz. marke: kaufstadt | ostermann | brenner | primo | zentra | lederer | kaufring. */
export function konkurrenz(S, scene, p) {
  if (p.marke === 'zentra') return konkurrenzZentra(S, scene, p);
  if (p.marke === 'lederer') return konkurrenzLederer(S, scene, p);
  if (p.marke === 'kaufring') return konkurrenzKaufring(S, scene, p);
  return konkurrenzAlt(S, scene, p);
}
/** Nur das Empfangsgebäude des Hauptbahnhofs (für flache Stadtslots, Front +z). */
export function empfangsgebaeude(S, scene, p) { return hauptbahnhof(S, scene, { ...p, nurEmpfang: true, w: p.w ?? 96, d: p.d ?? 24 }); }

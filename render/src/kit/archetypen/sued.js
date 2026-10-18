// Archetyp-Modul Süd: süddeutsche Stadttypen (Bayern, Baden-Württemberg) über die Plugin-Registry.
// Registriert sich beim Import (siehe archetypen/README.md und die Dokumentation oben in stadtplan.js).
//
// Typen: muenchen (Residenzmetropole), altbayern (Inn-Salzach- und Donaustädte), franken (Sandstein, Fachwerk, Burg),
// schwaben (Fachwerk, Neckar, Münster), stuttgart (Kessel), faecher_quadrate (Karlsruhe, Mannheim),
// oberrhein_bodensee (Freiburg, Konstanz, Heidelberg), alpenrand (Kempten, Rosenheim).
//
// Gemeinsames Vorgehen:
//   E.sued = Typname, E.stadt = Stadtkennung (aus extra.stadt), E.viertel wie üblich.
//   Hänge, Berge und Burgberge liegen immer am kameraabgewandten Rand (Reihe j = 0 bzw. Spalte i = 0, also -z/-x),
//   damit nichts davor Liegendes verdeckt wird (Fläche 'kulisse', 'burgberg').
//   Blockränder werden tiefer parzelliert und danach zu regionalen Häuserzeilen aus suedbauten.js zusammengelegt
//   (Bürgerhäuser, Münchner Geschäftshäuser, fränkisches und schwäbisches Fachwerk), auch rund um die Hartwig-Häuser.
//   Eigene Flächen: kulisse, burgberg, suedmarkt, suedkirche, residenz, faecher; eigene Slots: sued_kiesbank,
//   sued_berg, sued_burg, sued_turm, sued_pyramide.
import { registriereArchetyp, PLAN_HILFE as H } from '../stadtplan.js';
import { registriereSlots, registriereStilProfil } from '../bauer.js';
import { bergHoehe, gelaende, rebzeilen } from '../gelaende.js';
import { SUED_SLOTS } from '../suedbauten.js';
import { THREE, rng, waehle, zw, heller, dunkler, dachProfil } from '../basis.js';

const { nimm, fixiere, frei, zelleFrei, wasserSpalte, klemm, wahlGewichtet, neueParzelle, mergeRand, parzellenVon, freiePosition, ueberlappt } = H;
const PI = Math.PI;

// ====================================================================================
// Eigene Bauten (Slots): Kiesbank, Berg, Burg, Turm, Pyramide
// ====================================================================================
const KIES = '#ddd3bc', KIES_NASS = '#c7bda5', FELS = '#a69d8e', ROTSTEIN = '#b8705a', GELBSTEIN = '#d6b98e';
const WIESE = ['#93bd76', '#8bb56f', '#9cc27e'], LAUBF = ['#6f9f5c', '#5f9150', '#7aa865', '#689a57'], NADELF = ['#4f7d4c', '#466f45', '#5a8a55'];
const DACHROT = ['#b4583f', '#a85440', '#c26a4a'];

function ellipse(S, x, z, a, b, y0, h, c, ry = 0) {
  const g = new THREE.CylinderGeometry(1, 1, h, 14);
  g.scale(a, 1, b); if (ry) g.rotateY(ry); g.translate(x, y0 + h / 2, z);
  S.add(g, c);
}
function laubbaum(S, x, y, z, r, s = 1) {
  S.box(0.45 * s, 2.0 * s, 0.45 * s, x, y + 1.0 * s, z, '#6b5040');
  const g = new THREE.IcosahedronGeometry(2.0 * s * zw(r, 0.85, 1.15), 0);
  g.translate(x, y + 3.3 * s, z); S.add(g, waehle(r, LAUBF));
}
function nadelbaum(S, x, y, z, r, s = 1) {
  S.box(0.4 * s, 1.4 * s, 0.4 * s, x, y + 0.7 * s, z, '#5e4636');
  const h = 6.5 * s * zw(r, 0.85, 1.2), g = new THREE.ConeGeometry(1.9 * s, h, 7);
  g.translate(x, y + 1.2 * s + h / 2, z); S.add(g, waehle(r, NADELF));
}

/** Kiesbank im Fluss (Isar, Inn, Iller): flache Inseln aus Kies mit nassem Rand, Weiden, Treibholz, Badende. */
function kiesbank(S, scene, p) {
  const r = rng(`kb:${p.seed}`);
  const { x, z, w, d } = p, entlangX = w >= d, L = entlangX ? w : d, B = entlangX ? d : w;
  const y0 = -2.25;
  const n = Math.max(2, Math.round(L / 22));
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n * L + zw(r, -3, 3), a = L / n * zw(r, 0.55, 0.75), b = B / 2 * zw(r, 0.55, 0.95);
    const cx = entlangX ? x + u : x + w / 2 + zw(r, -0.15, 0.15) * w, cz = entlangX ? z + d / 2 + zw(r, -0.15, 0.15) * d : z + u;
    const [ax, bz] = entlangX ? [a, b] : [b, a];
    ellipse(S, cx, cz, ax + 0.9, bz + 0.9, y0, 0.32, KIES_NASS);
    ellipse(S, cx, cz, ax, bz, y0, 0.55, KIES);
    if (r() < 0.7) ellipse(S, cx + zw(r, -0.3, 0.3) * ax, cz + zw(r, -0.3, 0.3) * bz, ax * 0.35, bz * 0.3, y0, 0.62, '#e6dcc6');
    // Weidengebüsch am oberen Ende, Treibholz, Badende mit Handtüchern
    for (let q = 0; q < 3; q++) if (r() < 0.6) { const g = new THREE.IcosahedronGeometry(zw(r, 1.2, 2.0), 0); g.scale(1, 0.8, 1); g.translate(cx - ax * 0.6 + q * 1.8, y0 + 1.4, cz - bz * 0.4); S.add(g, waehle(r, ['#8fae6a', '#9cb877', '#7f9f5e'])); }
    if (r() < 0.6) S.box(3.2, 0.3, 0.35, cx + ax * 0.3, y0 + 0.7, cz + bz * 0.2, '#8a7a66', zw(r, 0, PI));
    for (let q = 0; q < Math.round(a / 4); q++) {
      const px = cx + zw(r, -0.6, 0.6) * ax, pz = cz + zw(r, -0.6, 0.6) * bz;
      S.box(0.9, 0.04, 1.8, px, y0 + 0.58, pz, waehle(r, ['#d0453a', '#e8b53c', '#2f6fb0', '#f4efe2', '#7fae5a']), zw(r, 0, PI));
      if (r() < 0.6) S.box(0.4, 0.3, 1.5, px + 0.1, y0 + 0.75, pz, waehle(r, ['#e2b99a', '#c99a7a']), zw(r, 0, PI));
    }
    if (r() < 0.35) { S.box(0.5, 0.5, 0.5, cx, y0 + 0.8, cz, '#7a7a7a'); for (let q = 0; q < 3; q++) S.box(0.12, 0.6, 0.12, cx + 0.4 - q * 0.4, y0 + 1.1, cz + 0.6, '#5a4636'); }
  }
  void scene;
  return { hoehe: 2 };
}

/**
 * Hügel als glatter Hang (GESTALTUNG.md 2, B5: keine Stufenpyramiden), die hohe Seite kameraabgewandt (-x/-z).
 * Mit o.berg (Bergprofil plan.berge, stadtrand.js) folgt die Höhe dem durchgehenden Kulissenhang am Kartenrand, sodass
 * benachbarte Parzellen und der Berg im Stadtrandgürtel nahtlos anschließen; sonst ein einzelner weicher Hügel.
 * Rückgabe: Plateau { x0, z0, x1, z1, y } (eben, für Burg und Turm) und hoehe(x, z).
 * o: { berg, hoehe, plateau (Anteil), wiese, wald (0 … 1), nadel (Anteil), reben (Rebzeilen am Hang) }
 */
function huegel(S, r, x0, z0, x1, z1, o = {}) {
  const pa = o.plateau ?? 0.6, Hm = o.hoehe ?? 18;
  const glatt = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  let h, P;
  if (o.berg) {
    h = (x, z) => 0.3 + bergHoehe(o.berg, x, z);
    const So = o.berg.seiten['-z'], Sl = o.berg.seiten['-x'];
    const pz1 = So ? Math.max(z0 + 4, Math.min(z1, So.kante + (So.front - So.kante) * 0.3)) : z1;
    const px1 = Sl && !So ? Math.max(x0 + 4, Math.min(x1, Sl.kante + (Sl.front - Sl.kante) * 0.3)) : x1;
    P = { x0, z0, x1: px1, z1: pz1 };
    P.y = h((P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2);
  } else {
    // einzelner Hügel: steigt von den sichtbaren Kanten (+x, +z) weich zum Plateau an der Rückseite
    // runde Kuppe: Plateau hinten (Burg, Turm), ringsum ein weicher Hang bis an den Rand
    const px1 = x0 + (x1 - x0) * pa, pz1 = z0 + (z1 - z0) * pa;
    const cx = (x0 + px1) / 2, cz = (z0 + pz1) / 2, hx = (px1 - x0) / 2, hz = (pz1 - z0) / 2;
    const ramp = Math.max(8, Math.min(x1 - px1, z1 - pz1));
    h = (x, z) => { const e = Math.hypot(Math.max(0, Math.abs(x - cx) - hx), Math.max(0, Math.abs(z - cz) - hz)); return 0.3 + Hm * glatt(1 - e / ramp); };
    P = { x0, z0, x1: px1, z1: pz1, y: 0.3 + Hm };
  }
  const wiese = o.wiese ?? waehle(r, WIESE);
  const rebe = '#5b7a3c';
  const quer = o.berg && o.berg.seiten['-x'] && !o.berg.seiten['-z'];
  gelaende(S, x0, z0, x1, z1, h, (x, y) => (o.reben && y > 2 && y < P.y - 1 ? '#b3a978' : wiese), { schritt: 4 });
  if (o.reben) rebzeilen(S, x0, z0, x1, z1, (x, z) => h(x, z) + 0.02, quer, (x, y) => y > 2.2 && y < P.y - 1.5, { rebe });
  // Bäume am Hang und auf der Kuppe
  const n = Math.round(((x1 - x0) * (z1 - z0)) / 30 * (o.wald ?? 0.7));
  for (let q = 0; q < n; q++) {
    const tx = zw(r, x0 + 1, x1 - 1), tz = zw(r, z0 + 1, z1 - 1);
    if (o.plateauFrei && tx > P.x0 && tx < P.x1 && tz > P.z0 && tz < P.z1) continue;
    const y = h(tx, tz);
    if (o.reben && y < P.y - 1) continue;
    (r() < (o.nadel ?? 0.4) ? nadelbaum : laubbaum)(S, tx, y - 0.1, tz, r, zw(r, 0.75, 1.05));
  }
  P.hoehe = h;
  return P;
}

/** Bewaldeter Berg (Schwarzwald, Achalm, Schlossberg): Stufenhügel mit Mischwald, dahinter eine zweite Kuppe. */
function berg(S, scene, p) {
  const r = rng(`sb:${p.seed}`);
  const { x, z, w, d } = p, v = p.variante ?? 'wald';
  S.quader(x, 0, z, x + w, 0.3, z + d, waehle(r, WIESE));
  const Hm = Math.min(46, Math.max(16, Math.min(w, d) * zw(r, 0.38, 0.5)));
  const P = huegel(S, r, x, z, x + w, z + d, { berg: p.berg, hoehe: Hm, plateau: 0.55, wald: v === 'wiese' ? 0.25 : 1.1, nadel: v === 'wald' || v === 'alpen' ? 0.75 : 0.3 });
  // Kuppe: dichter Nadelwald auf dem Plateau, einzelne Lichtung
  const nb = Math.round(((P.x1 - P.x0) * (P.z1 - P.z0)) / 60);
  for (let q = 0; q < nb; q++) { const tx = zw(r, P.x0 + 1, P.x1 - 1), tz = zw(r, P.z0 + 1, P.z1 - 1); (r() < 0.7 ? nadelbaum : laubbaum)(S, tx, P.hoehe(tx, tz) - 0.1, tz, r, zw(r, 0.9, 1.25)); }
  if (v === 'wiese' && r() < 0.8) { S.quader(P.x0 + 4, P.y, P.z0 + 4, P.x0 + 9, P.y + 3.4, P.z0 + 8, '#efe6d2'); S.add(dachProfil(5.6, 4.8, 2.6, 0.2, 'x').translate(P.x0 + 6.5, P.y + 3.4, P.z0 + 6), '#7a5638'); }
  void scene;
  return { hoehe: P.y + 9 };
}

/**
 * Hang im Kessel bzw. am Fluss: glatter Rebhang mit Rebzeilen, oben Wald. variante 'wein' | 'kessel' | 'haeuser'
 * (ohne Reben). Hohe Seite kameraabgewandt.
 */
function hang(S, scene, p) {
  const r = rng(`ha:${p.seed}`);
  const { x, z, w, d } = p, v = p.variante ?? 'kessel';
  S.quader(x, 0, z, x + w, 0.3, z + d, '#9cc27e');
  const Hm = Math.min(p.niedrig ? 22 : 52, Math.max(p.niedrig ? 14 : 26, Math.min(w, d) * zw(r, 0.5, 0.62)));
  // glatter Rebhang (Kessel: Reben und Wald im Wechsel), oben Wald; keine Terrassen mit Häusern (GESTALTUNG.md 2)
  const P = huegel(S, r, x, z, x + w, z + d, { berg: p.berg, hoehe: Hm, plateau: 0.42, wald: v === 'wein' ? 0.9 : 1.1, nadel: 0.4, wiese: '#8fb873', reben: v !== 'haeuser' });
  void scene;
  return { hoehe: P.y + 8 };
}

/** Fenster als dunkle Kästchen auf der +z- bzw. +x-Fläche eines Quaders. */
function fensterReihe(S, x0, z0, x1, z1, y0, y1, seite, ab, fw, fh, c = '#3f4850', bogen = false) {
  const L = seite === '+z' ? x1 - x0 : z1 - z0, n = Math.max(1, Math.floor(L / ab));
  const rand = (L - n * ab) / 2;
  for (let k = 0; k < n; k++) for (let y = y0; y + fh <= y1 + 0.01; y += (y1 - y0) / Math.max(1, Math.round((y1 - y0) / (fh * 2.1)))) {
    const u = (seite === '+z' ? x0 : z0) + rand + ab * (k + 0.5);
    if (seite === '+z') S.box(fw, fh, 0.12, u, y + fh / 2, z1 + 0.04, c); else S.box(0.12, fh, fw, x1 + 0.04, y + fh / 2, u, c);
    if (bogen) { const g = new THREE.CylinderGeometry(fw / 2, fw / 2, 0.12, 8, 1, false, 0, PI); if (seite === '+z') { g.rotateX(PI / 2); g.rotateZ(PI / 2); g.translate(u, y + fh, z1 + 0.04); } else { g.rotateZ(PI / 2); g.rotateY(0); g.translate(x1 + 0.04, y + fh, u); } S.add(g, c); }
  }
}
function satteldach(S, x0, z0, x1, z1, y, h, c, achse) {
  const L = achse === 'x' ? x1 - x0 : z1 - z0, T = achse === 'x' ? z1 - z0 : x1 - x0;
  S.add(dachProfil(L + 0.6, T + 0.8, h, 0.25, achse).translate((x0 + x1) / 2, y, (z0 + z1) / 2), c);
}
function zinnen(S, x0, z0, x1, z1, y, c) {
  for (let x = x0 + 0.6; x < x1 - 0.3; x += 1.6) S.box(0.8, 0.9, 0.9, x, y + 0.45, z1 - 0.45, c);
  for (let z = z0 + 0.6; z < z1 - 0.3; z += 1.6) S.box(0.9, 0.9, 0.8, x1 - 0.45, y + 0.45, z, c);
}
function rundturm(S, x, y, z, rad, h, wand, dach, o = {}) {
  const g = new THREE.CylinderGeometry(rad, rad * 1.05, h, 14); g.translate(x, y + h / 2, z); S.add(g, wand);
  if (o.offen) { const k = new THREE.CylinderGeometry(rad + 0.3, rad + 0.3, 0.8, 14, 1, true); k.translate(x, y + h, z); S.add(k, heller(wand, 0.05)); return y + h + 0.4; }
  if (o.kuppel) { const k = new THREE.SphereGeometry(rad + 0.2, 12, 6, 0, 2 * PI, 0, PI / 2); k.translate(x, y + h, z); S.add(k, dach); return y + h + rad; }
  const kh = o.helm ?? rad * 2.4, k = new THREE.ConeGeometry(rad + 0.6, kh, 14); k.translate(x, y + h + kh / 2, z); S.add(k, dach);
  for (let a = 0.2; a < PI / 2; a += 0.55) S.box(0.5, 1.4, 0.5, x + Math.cos(a) * rad, y + h * 0.7, z + Math.sin(a) * rad, '#3f4850');
  return y + h + kh;
}

/**
 * Burg auf dem Berg: 'kaiserburg' (Sandsteinfelsen, Palas, Rund- und Vierecktürme), 'festung' (Bastionen, Vierflügelschloss,
 * runder Bergfried), 'ruine' (Schlossruine aus rotem Sandstein, dachlose Flügel, gesprengter Turm, ein Palast mit Dach).
 */
function burg(S, scene, p) {
  const r = rng(`bu:${p.seed}`);
  const { x, z, w, d } = p, v = p.variante ?? 'kaiserburg';
  S.quader(x, 0, z, x + w, 0.3, z + d, waehle(r, WIESE));
  const stein = v === 'ruine' ? '#a8584a' : v === 'kaiserburg' ? '#c79a78' : '#e9e2d2';
  const fels = v === 'ruine' ? '#9a5546' : v === 'kaiserburg' ? '#b88c6c' : '#b5ad98';
  const Hm = Math.min(v === 'festung' ? 18 : 16, Math.max(10, Math.min(w, d) * 0.22));   // flacher, weicher Burghügel (B5)
  void fels;
  const P = huegel(S, r, x, z, x + w, z + d, { berg: p.berg, hoehe: Hm, plateau: v === 'festung' ? 0.6 : 0.58, wald: 0.6, nadel: 0.25, wiese: v === 'ruine' ? '#7fa765' : undefined,
    plateauFrei: true });
  const y = P.y, X0 = P.x0 + 2, Z0 = P.z0 + 2, X1 = P.x1 - 1, Z1 = P.z1 - 1, W = X1 - X0, D = Z1 - Z0;
  let top = y;
  const dach = waehle(r, DACHROT), glas = '#3f4850';
  if (v === 'kaiserburg') {
    // Ringmauer an den sichtbaren Kanten mit Zinnen, Palas hinten, Kaiserstallung links, Rundturm, Viereckturm an der Ecke
    S.quader(X0, y, Z1 - 1.2, X1, y + 6, Z1, stein); S.quader(X1 - 1.2, y, Z0, X1, y + 6, Z1, stein);
    zinnen(S, X0, Z0, X1, Z1, y + 6, stein);
    S.box(3.4, 4.2, 0.3, X0 + W * 0.42, y + 2.1, Z1 + 0.05, '#4a3c32');
    const pz1 = Z0 + Math.min(14, D * 0.4);
    S.quader(X0 + 2, y, Z0, X0 + W * 0.66, y + 13, pz1, stein);
    fensterReihe(S, X0 + 2, Z0, X0 + W * 0.66, pz1, y + 3, y + 11, '+z', 3.2, 1.3, 2.2, glas, true);
    satteldach(S, X0 + 2, Z0, X0 + W * 0.66, pz1, y + 13, 8, dach, 'x');
    for (let k = 1; k < 4; k++) S.box(1.4, 1.6, 1.4, X0 + 2 + (W * 0.64 - 2) * k / 4, y + 16, (Z0 + pz1) / 2 + 1.6, dach);
    S.quader(X0, y, pz1 + 3, X0 + Math.min(12, W * 0.3), y + 10, Z1 - 3, stein);
    fensterReihe(S, X0, pz1 + 3, X0 + Math.min(12, W * 0.3), Z1 - 3, y + 2, y + 9, '+x', 2.8, 0.9, 1.4, glas);
    satteldach(S, X0, pz1 + 3, X0 + Math.min(12, W * 0.3), Z1 - 3, y + 10, 9, dach, 'z');
    top = Math.max(top, rundturm(S, X0 + W * 0.78, y, Z0 + D * 0.32, 4.2, 24, stein, '#5d4a40', { helm: 9 }));
    S.quader(X1 - 9, y, Z1 - 9, X1 - 1, y + 19, Z1 - 1, stein);
    fensterReihe(S, X1 - 9, Z1 - 9, X1 - 1, Z1 - 1, y + 8, y + 17, '+z', 2.6, 0.7, 1.4, glas);
    fensterReihe(S, X1 - 9, Z1 - 9, X1 - 1, Z1 - 1, y + 8, y + 17, '+x', 2.6, 0.7, 1.4, glas);
    S.add(new THREE.ConeGeometry(6.2, 7, 4).rotateY(PI / 4).translate(X1 - 5, y + 22.5, Z1 - 5), dach);
    top = Math.max(top, y + 26);
    S.quader(X0 + W * 0.36, y, Z0 + D * 0.45, X0 + W * 0.6, y + 0.12, Z1 - 2, '#d9cdb4');
    for (let q = 0; q < 3; q++) laubbaum(S, X0 + W * zw(r, 0.4, 0.6), y, Z0 + D * zw(r, 0.5, 0.8), r, 0.9);
  } else if (v === 'festung') {
    // Bastionen vorn, Vierflügelschloss, Bergfried im Hof, Kirchlein, Torbau mit Haube
    const wand = '#f0ebdf', bast = '#d9cfba';
    S.quader(X0 - 1, y - 6, Z1 - 3, X1 + 1, y + 4, Z1 + 1, bast); S.quader(X1 - 3, y - 6, Z0 - 1, X1 + 1, y + 4, Z1 + 1, bast);
    for (const [bx, bz] of [[X1 - 2, Z1 - 2], [X0 + W * 0.35, Z1 - 1], [X1 - 1, Z0 + D * 0.35]]) S.box(8, 10, 8, bx, y - 1, bz, bast, PI / 4);
    S.quader(X0 - 1, y + 4, Z1 - 0.5, X1 + 1, y + 4.8, Z1 + 1, heller(bast, 0.05)); S.quader(X1 - 0.5, y + 4, Z0 - 1, X1 + 1, y + 4.8, Z1 + 1, heller(bast, 0.05));
    const sx0 = X0 + 3, sz0 = Z0 + 2, sx1 = X0 + W * 0.78, sz1 = Z0 + D * 0.8, fl = Math.min(11, (sx1 - sx0) * 0.3), Hs = 14;
    for (const [a0, b0, a1, b1, ach] of [[sx0, sz0, sx1, sz0 + fl, 'x'], [sx0, sz1 - fl, sx1, sz1, 'x'], [sx0, sz0 + fl, sx0 + fl, sz1 - fl, 'z'], [sx1 - fl, sz0 + fl, sx1, sz1 - fl, 'z']]) {
      S.quader(a0, y, b0, a1, y + Hs, b1, wand);
      if (ach === 'x') fensterReihe(S, a0, b0, a1, b1, y + 2, y + Hs - 1.5, '+z', 3.0, 1.1, 1.8, glas);
      else fensterReihe(S, a0, b0, a1, b1, y + 2, y + Hs - 1.5, '+x', 3.0, 1.1, 1.8, glas);
      satteldach(S, a0, b0, a1, b1, y + Hs, 6, dach, ach);
    }
    S.quader(sx0 + fl, y, sz0 + fl, sx1 - fl, y + 0.12, sz1 - fl, '#d9cdb4');
    top = Math.max(top, rundturm(S, (sx0 + sx1) / 2 - 2, y, (sz0 + sz1) / 2 - 1, 4.4, 26, wand, waehle(r, ['#6f9a7d', '#5d4a40']), { kuppel: r() < 0.5 }));
    // Torbau mit Zwiebelhaube an der sichtbaren Ecke
    const tx = X1 - 7, tz = Z1 - 7;
    S.quader(tx - 3.5, y, tz - 3.5, tx + 3.5, y + 18, tz + 3.5, wand);
    fensterReihe(S, tx - 3.5, tz - 3.5, tx + 3.5, tz + 3.5, y + 8, y + 16, '+z', 2.4, 0.8, 1.4, glas);
    S.box(3.0, 4.2, 0.3, tx, y + 2.1, tz + 3.6, '#4a3c32');
    const zw1 = new THREE.SphereGeometry(3.2, 10, 8); zw1.scale(1, 1.2, 1); zw1.translate(tx, y + 20.6, tz); S.add(zw1, '#6f9a7d');
    S.add(new THREE.ConeGeometry(0.9, 3.4, 8).translate(tx, y + 25, tz), '#6f9a7d');
    top = Math.max(top, y + 27);
  } else {
    // Ruine: dachlose Flügel im U, Fensterhöhlen, gesprengter Rundturm, ein Palast mit Dach und Zwerchgiebeln
    const Hf = 17, dk = 1.4;
    const fluegel = [[X0, Z0, X0 + W * 0.75, Z0 + 12], [X0, Z0 + 12, X0 + 12, Z0 + D * 0.85]];
    for (const [a0, b0, a1, b1] of fluegel) {
      for (const [q0, r0, q1, r1] of [[a0, b0, a1, b0 + dk], [a0, b1 - dk, a1, b1], [a0, b0, a0 + dk, b1], [a1 - dk, b0, a1, b1]]) S.quader(q0, y, r0, q1, y + Hf - (r() < 0.4 ? zw(r, 2, 6) : 0), r1, stein);
      fensterReihe(S, a0, b0, a1, b1, y + 2, y + Hf - 2, '+z', 3.2, 1.6, 2.6, '#4a2f2a', true);
      fensterReihe(S, a0, b0, a1, b1, y + 2, y + Hf - 2, '+x', 3.2, 1.6, 2.6, '#4a2f2a', true);
      S.quader(a0 + dk, y, b0 + dk, a1 - dk, y + 0.15, b1 - dk, '#8fae6a');
      // Giebelstümpfe
      for (let u = a0 + 3; u < a1 - 3; u += 9) S.box(3.4, 3.2, dk, u, y + Hf + 1.6, b1 - dk / 2, stein);
    }
    // Palast mit Dach (Friedrichsbau-artig): vier Geschosse, Statuennischen, zwei Zwerchgiebel
    const fx0 = X0 + W * 0.36, fz0 = Z0 + 12, fx1 = X0 + W * 0.72, fz1 = fz0 + 13;
    S.quader(fx0, y, fz0, fx1, y + 19, fz1, stein);
    fensterReihe(S, fx0, fz0, fx1, fz1, y + 1.5, y + 18, '+z', 3.0, 1.4, 2.4, glas);
    for (let k = 1; k < 4; k++) S.quader(fx0 - 0.2, y + k * 4.7, fz1 - 0.1, fx1 + 0.2, y + k * 4.7 + 0.5, fz1 + 0.35, heller(stein, 0.06));
    satteldach(S, fx0, fz0, fx1, fz1, y + 19, 9, '#5d6a72', 'x');
    for (const u of [fx0 + (fx1 - fx0) * 0.3, fx0 + (fx1 - fx0) * 0.7]) S.add(new THREE.ConeGeometry(3.2, 5, 4).rotateY(PI / 4).scale(1, 1, 0.4).translate(u, y + 21.5, fz1 - 0.6), stein);
    // Gesprengter Turm: halber Zylinder mit Trümmerblock, Dicker Turm offen
    const hz = new THREE.CylinderGeometry(6.5, 6.8, 13, 14, 1, false, PI * 0.15, PI * 1.1); hz.translate(X1 - 7, y + 6.5, Z1 - 8); S.add(hz, stein);
    S.box(5, 3.6, 4, X1 - 3, y + 1.6, Z1 - 3, dunkler(stein, 0.05), 0.5);
    top = Math.max(top, rundturm(S, X0 + 7, y, Z1 - 6, 6.5, 15, stein, stein, { offen: true }));
    top = Math.max(top, y + 30);
    for (let q = 0; q < 6; q++) laubbaum(S, zw(r, X0 + 14, X1 - 2), y, zw(r, Z0 + D * 0.65, Z1 - 1), r, 1.0);
  }
  void scene;
  return { hoehe: top };
}

/** Turm auf bewaldetem Hügel: Fernmeldeturm aus Beton mit Korb (Stuttgart). */
function turm(S, scene, p) {
  const r = rng(`tu:${p.seed}`);
  const { x, z, w, d } = p;
  S.quader(x, 0, z, x + w, 0.3, z + d, waehle(r, WIESE));
  const P = huegel(S, r, x, z, x + w, z + d, { berg: p.berg, hoehe: Math.min(30, Math.min(w, d) * 0.4), plateau: 0.55, wald: 1.2, nadel: 0.3 });
  const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2, y = P.y;
  const H = 120, schaft = new THREE.CylinderGeometry(2.0, 4.2, H, 16); schaft.translate(cx, y + H / 2, cz); S.add(schaft, '#d9d6cf');
  const korb = new THREE.CylinderGeometry(5.6, 4.0, 9, 16); korb.translate(cx, y + H + 1, cz); S.add(korb, '#cfccc4');
  for (let k = 0; k < 3; k++) { const ring = new THREE.CylinderGeometry(5.7, 5.7, 0.9, 16); ring.translate(cx, y + H - 1.6 + k * 2.6, cz); S.add(ring, '#3f4850'); }
  const ant = new THREE.CylinderGeometry(0.7, 1.2, 38, 8); ant.translate(cx, y + H + 24, cz); S.add(ant, '#e9e7e2');
  for (let k = 0; k < 3; k++) S.box(1.6, 3, 1.6, cx, y + H + 12 + k * 9, cz, k % 2 ? '#d23c32' : '#f1f1ee');
  for (let q = 0; q < 10; q++) { const tx = zw(r, P.x0 + 1, P.x1 - 1), tz = zw(r, P.z0 + 1, P.z1 - 1); if (Math.hypot(tx - cx, tz - cz) > 7) nadelbaum(S, tx, P.hoehe(tx, tz) - 0.1, tz, r, 1.0); }
  void scene;
  return { hoehe: y + H + 44 };
}

function alpenFern(S, scene, p) {
  // Voralpenland vor der Bergkette: flache Wiesen, Waldstücke und Baumgruppen. Die Alpen selbst stehen als glatter
  // Hang im Stadtrandgürtel dahinter (stadtrand.js BERG.alpen_fern, gelaende.js), nicht als Kegel neben der Bebauung.
  const r = rng(`af:${p.seed}`);
  const { x, z, w, d } = p;
  S.quader(x, 0, z, x + w, 0.46, z + d, '#9cc27e');   // über der Grundstücksplatte
  // Wiesenstreifen in zwei Grüntönen
  for (let u = x; u < x + w - 4; ) { const l = zw(r, 28, 60), e = Math.min(x + w, u + l); if (r() < 0.5) S.quader(u + 0.5, 0.46, z + 0.5, e - 0.5, 0.49, z + d * zw(r, 0.45, 0.7), '#a9c98a'); u = e; }
  // Waldsaum hinten (zum Gebirge), Baumgruppen vorne
  for (let k = 0; k < (w * d) / 70; k++) {
    const tz = z + d * Math.pow(r(), 1.8) * 0.85;
    nadelbaum(S, zw(r, x + 1, x + w - 1), 0.46, Math.max(z + 1, tz), r, zw(r, 0.8, 1.2));
  }
  for (let k = 0; k < w / 40; k++) { const gx = zw(r, x + 8, x + w - 8), gz = zw(r, z + d * 0.55, z + d - 8); for (let q = 0; q < 5; q++) nadelbaum(S, gx + zw(r, -6, 6), 0.46, gz + zw(r, -5, 5), r, zw(r, 0.8, 1.1)); }
  void scene;
  return { hoehe: 12 };
}

/** Sandsteinpyramide auf Sockel (Karlsruher Marktplatz). */
function pyramide(S, scene, p) {
  const { x, z, w, d } = p, cx = x + w / 2, cz = z + d / 2, s = Math.min(w, d) - 1;
  S.quader(cx - s / 2, 0.3, cz - s / 2, cx + s / 2, 1.1, cz + s / 2, '#cbb894');
  S.add(new THREE.ConeGeometry(s * 0.52, s * 1.05, 4).rotateY(PI / 4).translate(cx, 1.1 + s * 0.525, cz), '#c9a27a');
  for (const [dx, dz] of [[-1, 1], [1, 1], [1, -1]]) S.box(0.3, 1.2, 0.3, cx + dx * (s / 2 + 1), 0.9, cz + dz * (s / 2 + 1), '#3b4046');
  void scene;
  return { hoehe: 1.1 + s * 1.05 };
}

// ====================================================================================
// Slot-Vokabular aus suedbauten.js: Front als Zeichenkette, Freiburger Bächle vor der Hausreihe
// ====================================================================================
const SICHT = ['+z', '+x'];
function frontVon(f) {
  if (typeof f === 'string') return f;
  if (!Array.isArray(f) || !f.length) return '+z';
  if (f.length === 1) return f[0];
  return f.find((s) => s === '+z') ?? f.find((s) => s === '+x') ?? f[0];
}
function baechle(S, p) {
  const s = frontVon(p.front);
  if (!SICHT.includes(s)) return;
  const st = '#bdb3a0', wa = '#5aa9c0';
  if (s === '+z') { const z = p.z + p.d - 0.95; S.quader(p.x + 0.4, 0.3, z - 0.35, p.x + p.w - 0.4, 0.4, z + 0.35, st); S.quader(p.x + 0.5, 0.36, z - 0.2, p.x + p.w - 0.5, 0.42, z + 0.2, wa); }
  else { const x = p.x + p.w - 0.95; S.quader(x - 0.35, 0.3, p.z + 0.4, x + 0.35, 0.4, p.z + p.d - 0.4, st); S.quader(x - 0.2, 0.36, p.z + 0.5, x + 0.2, 0.42, p.z + p.d - 0.5, wa); }
}
const SLOTS = {};
for (const [typ, f] of Object.entries(SUED_SLOTS)) SLOTS[typ] = (S, scene, p) => {
  const e = f(S, scene, { ...p, front: frontVon(p.front) });
  if (p.baechle) baechle(S, p);
  return e;
};
Object.assign(SLOTS, { 'slot:sued_hang': hang, 'slot:sued_alpen': alpenFern, 'slot:sued_kiesbank': kiesbank, 'slot:sued_berg': berg, 'slot:sued_burg': burg, 'slot:sued_turm': turm, 'slot:sued_pyramide': pyramide });
registriereSlots(SLOTS);

// ====================================================================================
// Häuserzeilen: welche Zeile aus suedbauten.js je Typ und Viertel
// ====================================================================================
const M = 'slot:bay_muenchen', BU = 'slot:bay_buergerhaus', FR = 'slot:franken_fachwerk', BW = 'slot:bw_fachwerk', ST = 'slot:bw_stuttgart';
const BU_V = ['rosenheim', 'landshut', 'passau', 'wasserburg'];
const gruppe = (v) => (v === 'altstadt' || v === 'barock' ? 'alt' : v === 'zentrum' ? 'zentrum' : v === 'gruenderzeit' || v === 'bahnhofsviertel' ? 'gruen' : 'rand');
/** Gewichtete Zeilenwahl [typ, variante, gewicht]; variante '*' = zufällig, 'bv'/'fv'/'sv' = Stadtvariante. */
const ZEILEN = {
  muenchen: { alt: [[M, 'neorenaissance', 2], [M, 'neubarock', 2], [M, 'wiederaufbau', 2], [BU, 'rosenheim', 1], [BU, 'wasserburg', 0.8]],
    zentrum: [[M, 'neorenaissance', 2.5], [M, 'neubarock', 2], [M, 'zeile', 2], [M, 'wiederaufbau', 1.5]],
    gruen: [[M, 'neorenaissance', 3], [M, 'neubarock', 2.5], [M, 'zeile', 1]], rand: [[M, 'wiederaufbau', 1.5], [M, 'zeile', 0.5]] },
  altbayern: { alt: [[BU, 'bv', 5], [BU, '*', 1.5]], zentrum: [[BU, 'bv', 3], [M, 'wiederaufbau', 1], [M, 'neubarock', 1]],
    gruen: [[M, 'neorenaissance', 1.5], [M, 'neubarock', 1.5], [BU, 'bv', 1]], rand: [[M, 'wiederaufbau', 1], [BU, '*', 0.5]] },
  franken: { alt: [[FR, 'fv', 4], [FR, 'fv2', 1.5], [BU, 'wasserburg', 0.3]], zentrum: [[FR, 'fv', 2], [M, 'wiederaufbau', 2], [M, 'neorenaissance', 1]],
    gruen: [[M, 'neorenaissance', 2], [M, 'zeile', 1], [FR, 'fv', 0.6]], rand: [[M, 'wiederaufbau', 1]] },
  franken_barock: { alt: [[BU, 'wasserburg', 2], [M, 'neubarock', 2.5], [FR, 'nuernberg', 1.5], [BU, 'rosenheim', 0.6]], zentrum: [[M, 'neubarock', 2], [M, 'wiederaufbau', 1.5], [FR, 'nuernberg', 1]],
    gruen: [[M, 'neorenaissance', 2], [M, 'neubarock', 1.5]], rand: [[M, 'wiederaufbau', 1]] },
  schwaben: { alt: [[BW, 'sv', 4], [BW, 'sv2', 2]], zentrum: [[BW, 'sv', 2], [M, 'wiederaufbau', 2]],
    gruen: [[M, 'neorenaissance', 1.5], [M, 'wiederaufbau', 1]], rand: [[M, 'wiederaufbau', 1]] },
  schwaben_barock: { alt: [[M, 'neubarock', 3], [BU, 'wasserburg', 2], [BW, 'tuebingen', 0.6]], zentrum: [[M, 'neubarock', 2], [M, 'wiederaufbau', 1.5]],
    gruen: [[M, 'neorenaissance', 1.5], [M, 'neubarock', 1]], rand: [[M, 'wiederaufbau', 1]] },
  stuttgart: { alt: [[BW, 'esslingen', 1], [M, 'wiederaufbau', 2]], zentrum: [[M, 'wiederaufbau', 3], [M, 'neorenaissance', 1]],
    gruen: [[M, 'neorenaissance', 2.5], [M, 'neubarock', 2]], rand: [[M, 'wiederaufbau', 1]] },
  faecher_quadrate: { alt: [[M, 'neubarock', 3], [BU, 'wasserburg', 1.5], [M, 'neorenaissance', 1]], zentrum: [[M, 'neorenaissance', 2], [M, 'wiederaufbau', 2.5], [M, 'zeile', 1]],
    gruen: [[M, 'neorenaissance', 2.5], [M, 'neubarock', 1.5]], rand: [[M, 'wiederaufbau', 1]] },
  oberrhein_bodensee: { alt: [[BU, 'wasserburg', 2.5], [BU, 'rosenheim', 1.5], [BW, 'tuebingen', 1.2], [M, 'neubarock', 1]], zentrum: [[M, 'neubarock', 2], [M, 'wiederaufbau', 1.5], [BU, 'wasserburg', 1.5]],
    gruen: [[M, 'neorenaissance', 2], [M, 'neubarock', 2]], rand: [[M, 'wiederaufbau', 1]] },
  alpenrand: { alt: [[BU, 'bv', 4], [BU, '*', 1.5]], zentrum: [[BU, 'bv', 2], [M, 'wiederaufbau', 1.5]],
    gruen: [[M, 'neorenaissance', 1], [BU, 'wasserburg', 1]], rand: [[BU, '*', 1]] },
};
/** Anteil der Blöcke je Viertelgruppe, deren Ränder zu Regionalzeilen werden (Rest: Süd-Stadthäuser über das Stilprofil). */
const ZEILEN_P = { alt: 1, zentrum: 1, gruen: 0.9, rand: 0.7 };
function zeilenTabelle(E) {
  if (E.sued === 'franken' && E.barockStadt) return ZEILEN.franken_barock;
  if (E.sued === 'schwaben' && E.barockStadt) return ZEILEN.schwaben_barock;
  return ZEILEN[E.sued] ?? ZEILEN.altbayern;
}
function zeileWahl(E, v, rb) {
  const tab = zeilenTabelle(E)[gruppe(v)];
  const [typ, va] = wahlGewichtet(rb, tab.map((z) => [z, z[2]]));
  const varianten = { bv: E.bv ?? 'rosenheim', fv: E.fv ?? 'nuernberg', fv2: E.fv === 'bamberg' ? 'nuernberg' : 'bamberg', sv: E.sv ?? 'tuebingen', sv2: E.sv === 'esslingen' ? 'tuebingen' : 'esslingen' };
  return [typ, va === '*' ? waehle(rb, BU_V) : varianten[va] ?? va];
}
/** Stadthaus-Parzellen der Blockränder in Regionalzeilen umwandeln (Front bleibt, auch umgedrehte Platzfronten). */
function zeilenUmwandeln(ctx, E, b, v) {
  const { rb } = ctx;
  for (const p of parzellenVon(ctx)) {
    let front = p.front;
    if (p.typ === 'eck') {
      // Eckhäuser: meist ebenfalls als Zeilenkopf (sichtbare Seiten sind immer detailliert), sonst Süd-Stadthaus mit zwei Fronten
      if (rb() > 0.92 || p.w < 14 || p.d < 12) continue;
      front = [p.front.find((s) => s === '+z') ?? p.front.find((s) => s === '+x') ?? p.front[0]];
    } else if (p.typ !== 'stadthaus' || !['+z', '-z', '+x', '-x'].includes(p.seite)) continue;
    const ax = front[0][1];
    const L = ax === 'z' ? p.w : p.d, T = ax === 'z' ? p.d : p.w;
    if (L < 14 || T < 11) continue;
    const [typ, variante] = zeileWahl(E, v, rb);
    Object.assign(p, { typ, sonder: typ.slice(5), variante, front, stil: null, leer: false, landmarke: false, minMass: [14, 12], ...(E.baechle && gruppe(v) !== 'rand' ? { baechle: true } : {}) });
  }
}
const ZEILEN_TIEFE = { muenchen: [22, 24], franken: [20, 22], schwaben: [20, 22], stuttgart: [21, 23], faecher_quadrate: [21, 23] };
const tiefeVon = (E) => ZEILEN_TIEFE[E.sued] ?? [18, 21];

// ====================================================================================
// Flächen
// ====================================================================================
const UM = { '-z': '+z', '-x': '+x', '+z': '-z', '+x': '-x' };
const gerade = (v) => Math.round(v / 2) * 2;

/** Kulisse am kameraabgewandten Rand: Alpen, Voralpen, Wald, Weinberg, Kessel (Stuttgart), Halbhöhe; optional Burg oder Turm. */
function kulisseParzelliere(ctx, E, b) {
  const { rb } = ctx;
  const oben = b.lage !== 'links';
  const L = oben ? b.w : b.d, T = oben ? b.d : b.w;
  const st = [];
  for (let u = 0; L - u > 1;) { let l = zw(rb, 46, 78); if (L - u - l < 42) l = L - u; st.push([u, l]); u += l; }
  const nimmPos = (f) => (f === undefined ? -1 : st.findIndex(([u, l]) => u + l >= f * L));
  const iBurg = b.burg ? nimmPos(b.burgPos ?? 0.5) : -1, iTurm = b.turm ? nimmPos(b.turmPos ?? 0.7) : -1;
  const front = [oben ? '+z' : '+x'];
  st.forEach(([u, l], k) => {
    const R = oben ? { x: b.x + u, z: b.z, w: l, d: T } : { x: b.x, z: b.z + u, w: T, d: l };   // lückenlos, der Hang läuft durch
    let typ, variante;
    if (k === iBurg) { typ = 'slot:sued_burg'; variante = b.burg; }
    else if (k === iTurm) { typ = 'slot:sued_turm'; variante = 'fernmeldeturm'; }
    else switch (b.inhalt) {
      case 'alpen': typ = 'slot:sued_berg'; variante = 'alpen'; break;   // glatter Hang, die Gipfel stehen im Stadtrandgürtel
      case 'alpen_fern': typ = 'slot:sued_alpen'; variante = 'fern'; break;
      case 'voralpen': [typ, variante] = waehle(rb, [['slot:sued_berg', 'wiese'], ['slot:sued_berg', 'wald'], ['slot:sued_berg', 'wiese'], ['slot:sued_berg', 'wald']]); break;
      case 'wein': [typ, variante] = waehle(rb, [['slot:sued_hang', 'wein'], ['slot:sued_hang', 'wein'], ['slot:sued_hang', 'wein'], ['slot:sued_weinberg', 'kapelle']]); break;
      case 'kessel': [typ, variante] = waehle(rb, [['slot:sued_hang', 'kessel'], ['slot:sued_hang', 'kessel'], ['slot:sued_hang', 'haeuser'], ['slot:sued_hang', 'wein']]); break;
      case 'halbhoehe': [typ, variante] = waehle(rb, [['slot:sued_hang', 'haeuser'], ['slot:sued_hang', 'kessel']]); break;
      default: typ = 'slot:sued_berg'; variante = rb() < 0.75 ? 'wald' : 'wiese';
    }
    neueParzelle(ctx, typ, R.x, R.z, R.w, R.d, front, 'frei', { klasse: 1, landmarke: false, variante, ...(b.inhalt === 'halbhoehe' ? { niedrig: true } : {}) });
  });
}
function bodenGruen(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  S.quader(b.x, 0, b.z, b.x + b.w, 0.3, b.z + b.d, b.boden ?? '#93bd76');
  for (let k = 0, n = Math.round((b.w + b.d) / 12); k < n; k++) {
    const x = B.zw(r, b.x + 1, b.x + b.w - 1), z = B.zw(r, b.z + 1, b.z + b.d - 1);
    if (!teile.some((p) => B.imRechteck(x, z, p, 1.5))) B.baumSetzen(I, waehle(r, ['nadel', 'linde', 'nadel']), x, 0.3, z, r, 0.9);
  }
}

/** Burgberg in einer Stadtzelle (Nürnberger Kaiserburg, Festung Marienberg). */
function burgbergParzelliere(ctx, E, b) {
  neueParzelle(ctx, 'slot:sued_burg', b.x + 1, b.z + 1, b.w - 2, b.d - 2, ['+z'], 'frei', { klasse: 1, landmarke: false, variante: b.variante ?? 'kaiserburg' });
}

/**
 * Markt: form 'strasse' (Straßenmarkt Altbayern), 'platz' (mit Brunnen), 'viktualien' (Stände, Maibaum, Biergarten),
 * 'bw' (Fachwerk-Marktplatz mit Rathaus). Ränder als Regionalzeilen mit Front zum Platz.
 */
function marktParzelliere(ctx, E, b) {
  const { rb } = ctx;
  const seiten = b.seiten ?? ['-z', '-x'];
  ctx.T = { ...ctx.T, tiefe: tiefeVon(E) };
  ctx.parz = E.typ === 'mittelstadt' ? [16, 30] : [20, 34];
  const frontUm = {}; for (const s of seiten) frontUm[s] = UM[s];
  const t = H.parzelliere(ctx, seiten, [], frontUm);
  b.platz = { x: b.x + t['-x'], z: b.z + t['-z'], w: b.w - t['-x'] - t['+x'], d: b.d - t['-z'] - t['+z'] };
  if (b.form === 'bw' || b.rathaus) mergeRand(ctx, 'slot:rathaus', [20, 34], 18, [seiten.includes('-z') ? '-z' : seiten[0]], { landmarke: true, strasse: ['platz'] });
  zeilenUmwandeln(ctx, E, b, b.form === 'viktualien' ? 'zentrum' : 'altstadt');
  const P = b.platz;
  const frei = (w, d, wo) => {
    const x = wo === 'links' ? P.x + 2 : wo === 'mitte' ? P.x + (P.w - w) / 2 : P.x + P.w - w - 3;
    const z = wo === 'mitte' ? P.z + (P.d - d) / 2 : P.z + 2;
    return w <= P.w - 4 && d <= P.d - 3 ? { x, z, w, d } : null;
  };
  if (b.biergarten) { const q = frei(Math.min(48, P.w * 0.45), Math.min(34, P.d - 6), 'links'); if (q) neueParzelle(ctx, 'slot:bay_wirtshaus', q.x, q.z, q.w, q.d, ['+z'], 'frei', { klasse: 3, landmarke: false, variante: 'wirtshaus' }); }
  if (b.maibaum) { const s = Math.min(26, P.d - 4, P.w * 0.4); const q = frei(s, s, 'rechts'); if (q && s >= 18) neueParzelle(ctx, 'slot:bay_maibaum', q.x, q.z, q.w, q.d, ['+z'], 'frei', { klasse: 2, landmarke: false, variante: 'markt' }); }
  if (b.pyramide) { const q = frei(9, 9, 'mitte'); if (q) neueParzelle(ctx, 'slot:sued_pyramide', q.x, q.z, q.w, q.d, ['+z'], 'frei', { klasse: 2, landmarke: false }); }
  void rb;
}
function marktstand(S, x, z, y, farbe, r) {
  S.box(3.2, 0.9, 1.8, x, y + 0.45, z, '#c99a63');
  for (let k = 0; k < 4; k++) S.box(0.6, 0.3, 0.6, x - 1.1 + k * 0.75, y + 1.05, z, waehle(r, ['#d0453a', '#e8b53c', '#7fae5a', '#e07a3f', '#f4efe2']));
  for (const dx of [-1.5, 1.5]) S.box(0.1, 2.5, 0.1, x + dx, y + 1.25, z - 0.85, '#7a5638');
  const g = new THREE.BoxGeometry(3.8, 0.12, 2.4); g.rotateX(0.2); g.translate(x, y + 2.6, z); S.add(g, farbe);
}
/** Gotischer Brunnen (Schöner Brunnen): achteckiges Becken, Turmspitze mit Gold. */
function gotBrunnen(S, x, z, y) {
  S.add(new THREE.CylinderGeometry(4.0, 4.2, 0.9, 8).translate(x, y + 0.45, z), '#b9ad98');
  S.add(new THREE.CylinderGeometry(3.5, 3.5, 0.92, 8).translate(x, y + 0.42, z), '#5cc0cc');
  for (let k = 0; k < 4; k++) { const rr = 1.6 - k * 0.32; S.add(new THREE.CylinderGeometry(rr * 0.8, rr, 3, 8).translate(x, y + 2.4 + k * 3, z), k % 2 ? '#d8b45a' : '#cfc3a8'); }
  S.add(new THREE.ConeGeometry(0.6, 5, 8).translate(x, y + 16, z), '#d8b45a');
  for (const [dx, dz] of [[4.6, 0], [0, 4.6], [-4.6, 0], [0, -4.6]]) S.box(0.12, 1.2, 0.12, x + dx, y + 0.9, z + dz, '#3b4046');
}
function mariensaeule(S, x, z, y) {
  S.quader(x - 2.2, y, z - 2.2, x + 2.2, y + 1.6, z + 2.2, '#d9d1c0');
  S.add(new THREE.CylinderGeometry(0.55, 0.65, 10, 10).translate(x, y + 6.6, z), '#d4ccbb');
  S.add(new THREE.CylinderGeometry(0.9, 0.6, 0.8, 10).translate(x, y + 12, z), '#d8b45a');
  S.box(0.6, 1.8, 0.6, x, y + 13.3, z, '#d8b45a');
  for (const [dx, dz] of [[2.2, 2.2], [-2.2, 2.2], [2.2, -2.2]]) S.box(0.5, 2.2, 0.5, x + dx, y + 2.7, z + dz, '#d8b45a');
}
function marktBoden(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const P = b.platz ?? b, y = 0.34;
  B.pflasterFlaeche(ctx, P, y, b.form === 'strasse' ? '#e2d8c4' : '#ded5c2', 4.5);
  const hinder = teile.filter((p) => p.seite === 'frei');
  const frei = (x, z, rad) => !hinder.some((p) => B.imRechteck(x, z, p, rad)) && x > P.x + 2 && x < P.x + P.w - 2 && z > P.z + 2 && z < P.z + P.d - 2;
  const cx = P.x + P.w * 0.5, cz = P.z + P.d * 0.55;
  if (b.brunnen === 'gotisch' && frei(cx, cz, 5)) gotBrunnen(S, cx, cz, y);
  else if (b.saeule && frei(cx, cz, 3)) mariensaeule(S, cx, cz, y);
  else if (frei(cx, cz, 5)) B.brunnen(S, cx, cz, y, 0.9);
  // Stände: Straßenmarkt in zwei Reihen, Viktualienmarkt dicht, sonst ein paar
  const n = b.form === 'viktualien' ? 22 : b.form === 'strasse' ? 12 : 6;
  const farben = ['#f2efe6', '#2f6f8f', '#d0453a', '#3f7d56', '#e8b53c'];
  for (let k = 0, v = 0; k < n * 3 && v < n; k++) {
    const x = B.zw(r, P.x + 4, P.x + P.w - 4), z = b.form === 'strasse' ? (k % 2 ? P.z + P.d * 0.3 : P.z + P.d * 0.72) : B.zw(r, P.z + 4, P.z + P.d - 4);
    if (!frei(x, z, 3) || Math.hypot(x - cx, z - cz) < 7) continue;
    marktstand(S, x, z, y, waehle(r, farben), r); v++;
  }
  // GESTALTUNG.md: große Plätze nie leer: Baumraster um den Mittelpunkt
  if (b.form !== 'viktualien' && P.w * P.d > 1200) for (let x = P.x + 5; x < P.x + P.w - 4; x += 8) for (let z = P.z + 5; z < P.z + P.d - 4; z += 8) {
    if (Math.hypot(x - cx, z - cz) < 11 || !frei(x, z, 3)) continue;
    B.baumSetzen(I, 'kugel', x, y, z, r, 0.75);
  }
  // Bäume am offenen Rand, Bänke, viele Leute
  for (let x = P.x + 5; x < P.x + P.w - 4; x += 10) if (frei(x, P.z + P.d - 3, 2.5)) B.baumSetzen(I, b.form === 'strasse' ? 'linde' : 'kastanie', x, y, P.z + P.d - 3, r, 0.8);
  for (let i = 0, m = Math.round((P.w * P.d) / 40 * ctx.dichte); i < m; i++) { const x = B.zw(r, P.x + 1, P.x + P.w - 1), z = B.zw(r, P.z + 1, P.z + P.d - 1); if (frei(x, z, 0.6) || x < P.x + 2) B.figur(I, x, y, z, r); }
}

/** Kirchplatz mit regionaler Kirche: Zwiebelturm, Münster, Sandstein- oder Backsteingotik, romanischer Dom, Barock. */
const KIRCH_ART = {
  gotik: { stil: 'hallenkirche', stein: '#c8b79a', turm: 'west' },
  sandstein: { stil: 'hallenkirche', stein: ROTSTEIN, turm: 'doppel', helm: 'spitz' },
  backstein: { stil: 'backsteingotik', turm: 'west', helm: 'spitzhoch' },
  romanisch: { stil: 'romanisch', turm: 'doppel', stein: GELBSTEIN },
  dom: { stil: 'neugotik' },
  barock: { stil: 'barock', helm: 'zwiebel' },
};
function kirchParzelliere(ctx, E, b) {
  const seiten = b.seiten ?? ['-z', '-x'];
  ctx.T = { ...ctx.T, tiefe: tiefeVon(E) };
  ctx.parz = E.typ === 'mittelstadt' ? [16, 30] : [20, 34];
  const frontUm = {}; for (const s of seiten) frontUm[s] = UM[s];
  const t = H.parzelliere(ctx, seiten, [], frontUm);
  b.platz = { x: b.x + t['-x'], z: b.z + t['-z'], w: b.w - t['-x'] - t['+x'], d: b.d - t['-z'] - t['+z'] };
  zeilenUmwandeln(ctx, E, b, 'altstadt');
  const P = b.platz, art = b.kirchArt ?? 'zwiebel';
  if (art === 'zwiebel') {
    const v = b.variante ?? 'stadtpfarr';
    const mx = { doppelturm: [60, 80], stadtpfarr: [56, 74], wallfahrt: [64, 64], dorf: [48, 52] }[v];
    const W = Math.min(P.w - 6, mx[0]), D = Math.min(P.d - 5, mx[1]);
    neueParzelle(ctx, 'slot:bay_zwiebelkirche', P.x + (P.w - W) / 2, P.z + 2, W, D, ['+z'], 'frei', { klasse: 5, landmarke: true, variante: v });
  } else if (art === 'muenster') {
    const W = Math.min(P.w - 6, 64), D = Math.min(P.d - 4, 120);
    neueParzelle(ctx, 'slot:bw_muenster', P.x + (P.w - W) / 2, P.z + 2, W, D, ['+z'], 'frei', { klasse: 5, landmarke: true, variante: b.variante ?? 'freiburg' });
  } else {
    const k = KIRCH_ART[art] ?? KIRCH_ART.gotik, dom = art === 'dom' || art === 'romanisch';
    const aw = P.w - 8, ad = P.d - 8;
    const L = Math.min(dom ? 90 : 56, aw * 0.9), Bk = Math.min(dom ? 36 : 24, ad * 0.62);
    neueParzelle(ctx, 'slot:kirche', P.x + 4 + (aw - L) * 0.4, P.z + 3 + (ad - Bk) * 0.3, L, Bk, ['+z', '+x'], 'frei', { klasse: 5, landmarke: true, dom, ...k, ...(b.turmHoehe ? { turmHoehe: b.turmHoehe } : {}), ...(b.turm ? { turm: b.turm } : {}), ...(b.stein ? { stein: b.stein } : {}) });
  }
}
function kirchBoden(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const P = b.platz ?? b, y = 0.34;
  B.pflasterFlaeche(ctx, P, y, '#e2dacb', 5);
  const hinder = teile.filter((p) => p.seite === 'frei');
  const frei = (x, z, rad) => !hinder.some((p) => B.imRechteck(x, z, p, rad));
  const offen = ['+z', '+x', '-z', '-x'].filter((s) => !(b.seiten ?? ['-z', '-x']).includes(s));
  for (const s of offen) {
    if (s[1] === 'z') { const z0 = s === '+z' ? P.z + P.d - 3 : P.z + 3; for (let x = P.x + 4; x < P.x + P.w - 3; x += 9) if (frei(x, z0, 2.5)) B.baumSetzen(I, 'kastanie', x, y, z0, r, 0.85); }
    else { const x0 = s === '+x' ? P.x + P.w - 3 : P.x + 3; for (let z = P.z + 4; z < P.z + P.d - 3; z += 9) if (frei(x0, z, 2.5)) B.baumSetzen(I, 'kastanie', x0, y, z, r, 0.85); }
  }
  // GESTALTUNG.md: freie Platzfläche um die Kirche mit lockerem Baumraster
  if (P.w * P.d > 1600) for (let x = P.x + 6; x < P.x + P.w - 5; x += 9) for (let z = P.z + 6; z < P.z + P.d - 5; z += 9) if (frei(x, z, 6)) B.baumSetzen(I, 'linde', x, y, z, r, 0.8);
  if (b.markt) for (let k = 0, v = 0; k < 60 && v < 14; k++) {
    const x = B.zw(r, P.x + 3, P.x + P.w - 3), z = B.zw(r, P.z + 3, P.z + P.d - 3);
    if (!frei(x, z, 3)) continue;
    marktstand(S, x, z, y, waehle(r, ['#f2efe6', '#d0453a', '#3f7d56', '#e8b53c']), r); v++;
  }
  for (let i = 0, n = Math.round((P.w * P.d) / 60 * ctx.dichte); i < n; i++) { const x = B.zw(r, P.x + 1, P.x + P.w - 1), z = B.zw(r, P.z + 1, P.z + P.d - 1); if (frei(x, z, 0.8)) B.figur(I, x, y, z, r); }
}

/** Barockschloss mit Garten (Residenz Würzburg, Neues Schloss Stuttgart, Karlsruhe, Mannheim, Ludwigsburg, München). */
function residenzParzelliere(ctx, E, b) {
  neueParzelle(ctx, 'slot:bw_schloss_barock', b.x + 3, b.z + 3, b.w - 6, b.d - 6, ['+z'], 'frei', { klasse: 5, landmarke: true, variante: b.variante ?? 'residenz' });
}
function residenzBoden(ctx, b, r, teile, B) {
  const { S, I } = ctx;
  const y = 0.36;   // über der Gehwegplatte (YG 0.32), sonst Z-Fighting
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, '#a7c98b');
  const frei = (x, z, rad) => !teile.some((p) => B.imRechteck(x, z, p, rad));
  // Kieswege an den Rändern, Baumreihen, Beete
  S.quader(b.x + 1, y, b.z + b.d - 4.5, b.x + b.w - 1, y + 0.05, b.z + b.d - 1.5, '#e3dccb');
  S.quader(b.x + b.w - 4.5, y, b.z + 1, b.x + b.w - 1.5, y + 0.05, b.z + b.d - 1, '#e3dccb');
  for (let x = b.x + 5; x < b.x + b.w - 3; x += 8) if (frei(x, b.z + b.d - 6.5, 2)) B.baumSetzen(I, 'kugel', x, y, b.z + b.d - 6.5, r, 0.7);
  for (let z = b.z + 5; z < b.z + b.d - 3; z += 8) if (frei(b.x + b.w - 6.5, z, 2)) B.baumSetzen(I, 'kugel', b.x + b.w - 6.5, y, z, r, 0.7);
  for (let k = 0, n = Math.round((b.w * b.d) / 260); k < n; k++) {
    const x = B.zw(r, b.x + 3, b.x + b.w - 8), z = B.zw(r, b.z + 3, b.z + b.d - 8);
    if (frei(x, z, 3)) B.baumSetzen(I, waehle(r, ['linde', 'kastanie', 'platane']), x, y, z, r, 0.9);
  }
  for (let i = 0, n = Math.round((b.w + b.d) / 6 * ctx.dichte); i < n; i++) B.figur(I, B.zw(r, b.x + 1, b.x + b.w - 1), y + 0.05, b.z + b.d - B.zw(r, 1.5, 4.5), r);
}

/** Karlsruher Fächer: 32 Strahlen vom Schlossturm durch Hardtwald, Schlossgarten und Schlossplatz. */
function faecherBoden(ctx, b, r, teile, B) {
  const { S, I, plan } = ctx;
  const y = 0.36;   // über der Gehwegplatte (YG 0.32), sonst Z-Fighting
  const res = plan.bloecke.find((q) => q.art === 'residenz');
  const C = res ? { x: res.x + res.w / 2, z: res.z + Math.min(24, res.d * 0.3) } : { x: plan.breite / 2, z: b.z + b.d };
  const teil = b.teil ?? 'garten';
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, teil === 'wald' ? '#6f9a5a' : '#93bd76');   // Schlossplatz: Rasen zwischen gepflasterten Strahlen
  const strahlen = [];
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * 2 * PI + PI / 32, dx = Math.cos(a), dz = Math.sin(a);
    // Strahl gegen das Rechteck schneiden (Liang-Barsky)
    let t0 = 0, t1 = 2000;
    for (const [p, q] of [[-dx, C.x - b.x], [dx, b.x + b.w - C.x], [-dz, C.z - b.z], [dz, b.z + b.d - C.z]]) {
      if (Math.abs(p) < 1e-9) { if (q < 0) { t0 = 1; t1 = 0; } continue; }
      const t = q / p; if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    }
    if (t1 - t0 < 4) continue;
    strahlen.push({ dx, dz, t0, t1 });
    // Nahe am Schloss laufen die Strahlen zusammen: dort nur jeder zweite, schmale Wege, damit Rasen sichtbar bleibt
    if (teil !== 'wald' && k % 2 && t1 < 160) continue;
    const L = t1 - t0, mx = C.x + dx * (t0 + L / 2), mz = C.z + dz * (t0 + L / 2);
    S.box(L, 0.06, teil === 'wald' ? 6.5 : 2.6, mx, y + 0.03, mz, teil === 'platz' ? '#d9d0bd' : '#efe8d6', -a);
    if (teil !== 'wald') for (let t = t0 + 5; t < t1 - 3; t += 12) for (const s of [-2.6, 2.6]) {
      const x = C.x + dx * t - dz * s, z = C.z + dz * t + dx * s;
      if (!teile.some((p) => B.imRechteck(x, z, p, 2))) B.baumSetzen(I, teil === 'platz' ? 'kugel' : 'linde', x, y, z, r, 0.75);
    }
  }
  const naheStrahl = (x, z) => strahlen.some(({ dx, dz }) => { const vx = x - C.x, vz = z - C.z, t = vx * dx + vz * dz; return t > 0 && Math.abs(vx * dz - vz * dx) < (teil === 'wald' ? 5 : 3.8); });
  const n = Math.round((b.w * b.d) / (teil === 'wald' ? 34 : teil === 'platz' ? 160 : 400));
  for (let k = 0; k < n; k++) {
    const x = B.zw(r, b.x + 1.5, b.x + b.w - 1.5), z = B.zw(r, b.z + 1.5, b.z + b.d - 1.5);
    if (naheStrahl(x, z) || teile.some((p) => B.imRechteck(x, z, p, 2))) continue;
    B.baumSetzen(I, teil === 'wald' ? waehle(r, ['nadel', 'linde', 'kastanie', 'nadel']) : 'linde', x, y, z, r, zw(r, 0.85, 1.1));
  }
  for (let i = 0, m = Math.round((b.w + b.d) / (teil === 'wald' ? 30 : 5) * ctx.dichte); i < m; i++) {
    const s = waehle(r, strahlen); if (!s) break;
    const t = zw(r, s.t0, s.t1); B.figur(I, C.x + s.dx * t, y + 0.06, C.z + s.dz * t, r);
  }
}

// ====================================================================================
// Entwürfe
// ====================================================================================
function suedGrund(E, typ, o = {}) {
  E.sued = typ;
  E.stadt = E.o.stadt ?? null;
  E.landmarkVerbot = new Set(['slot:kirche', 'slot:schloss', ...(E.typ === 'metropole' ? [] : ['slot:hochhaus']), ...(o.verbot ?? [])]);
  E.marktVariante = 'keiner';
  E.umriss = o.umriss ?? 'voll';
  E.wirtsMax = o.wirts ?? 0;
}
/** Blockmaße: unregel 0 = gleichmäßiges Raster, 1 = stark wechselnde Altstadtmaße. */
function raster(E, unregel) {
  const { r } = E;
  if (unregel <= 0.05) {
    const w = E.spalten[0], d = E.reihen[0];
    E.spalten = E.spalten.map(() => gerade(w * zw(r, 0.95, 1.05)));
    E.reihen = E.reihen.map(() => gerade(d * zw(r, 0.95, 1.05)));
    for (let k = 0; k <= E.nx; k++) fixiere(E, k);
    return;
  }
  E.spalten = E.spalten.map((w) => gerade(w * zw(r, 1 - 0.42 * unregel, 1 + 0.22 * unregel)));
  E.reihen = E.reihen.map((d) => gerade(d * zw(r, 1 - 0.38 * unregel, 1 + 0.2 * unregel)));
}
function kulisseOben(E, inhalt, extra = {}, tiefe = [96, 116]) {
  E.reihen[0] = gerade(zw(E.r, ...tiefe));
  for (let k = 0; k <= E.nx; k++) fixiere(E, k, 0, 0);
  return nimm(E, { art: 'kulisse', i0: 0, i1: E.nx - 1, j0: 0, j1: 0, lage: 'oben', inhalt, ...extra });
}
function kulisseLinks(E, inhalt, extra = {}, breite = [72, 90], j0 = 1) {
  E.spalten[0] = gerade(zw(E.r, ...breite));
  fixiere(E, 0); fixiere(E, 1);
  return nimm(E, { art: 'kulisse', i0: 0, i1: 0, j0, j1: E.nz - 1, lage: 'links', inhalt, ...extra });
}
function gross(E, i, j, w, d) { if (i >= 0 && i < E.nx) E.spalten[i] = Math.max(E.spalten[i], w); if (j >= 0 && j < E.nz) E.reihen[j] = Math.max(E.reihen[j], d); }
function flussQuer(E, j, extra = {}) {
  E.reihen[j] = gerade(zw(E.r, ...E.T.wasserB) * (extra.faktor ?? 1));
  for (let k = 0; k <= E.nx; k++) fixiere(E, k, j, j);
  return nimm(E, { art: 'wasser', form: 'fluss', i0: 0, i1: E.nx - 1, j0: j, j1: j, quer: true, brueckeP: extra.brueckeP ?? 0.45, kies: !!extra.kies });
}
function flussSpalte(E, i, j0, extra = {}) {
  const f = wasserSpalte(E, i, j0, E.nz - 1, extra.kanal ? 'kanal' : 'fluss');
  if (extra.breite) E.spalten[i] = gerade(zw(E.r, ...extra.breite));
  f.kies = !!extra.kies;
  return f;
}
function nimmWennFrei(E, f) { return frei(E, f.i0, f.i1, f.j0, f.j1) ? nimm(E, f) : null; }
function kernViertel(E, kern, rad) {
  return (i, j) => {
    if (kern(i, j)) return 'altstadt';
    const dd = Math.hypot(i - E.zentrum.i, j - E.zentrum.j);
    return dd < rad ? 'gruenderzeit' : 'rand';
  };
}

/** München: Alpen am Horizont, Isar mit Kiesbänken, Residenz und Hofgarten, Ludwig- und Maximilianstraße, Frauenkirche, Viktualienmarkt. */
function muenchen(E) {
  const { r } = E;
  raster(E, 0.15);
  suedGrund(E, 'muenchen', { wirts: 3 });
  const nx = E.nx, nz = E.nz;
  kulisseOben(E, 'alpen_fern', {}, [124, 140]);
  const iI = nx - 3;
  flussSpalte(E, iI, 1, { kies: true, breite: [66, 78] });
  const c = Math.max(2, Math.floor(nx / 2) - 1);
  gross(E, c, 2, 104, 94);
  nimm(E, { art: 'residenz', i0: c, i1: c, j0: 2, j1: 2, variante: 'quadrat' });
  nimm(E, { art: 'park', i0: c + 1, i1: c + 1, j0: 2, j1: 2, garten: true });
  nimmWennFrei(E, { art: 'park', i0: iI - 1, i1: iI - 1, j0: 1, j1: 3, biergarten: true });
  E.zTyp[c] = 'boulevard'; fixiere(E, c);
  E.xTyp[3] = 'boulevard'; E.tram.push('x3');
  const ja = 4;
  gross(E, c - 1, ja, 86, 98);
  nimm(E, { art: 'suedkirche', i0: c - 1, i1: c - 1, j0: ja, j1: ja, kirchArt: 'zwiebel', variante: 'doppelturm', seiten: ['-z', '-x'] });
  nimm(E, { art: 'suedmarkt', i0: c + 1, i1: c + 1, j0: ja + 1, j1: ja + 1, form: 'viktualien', maibaum: true, biergarten: true, seiten: ['-x', '-z'] });
  E.zentrum = { i: c + 0.3, j: ja + 0.2 };
  const kern = (i, j) => i < iI && Math.hypot(i - c, (j - ja - 0.3) * 1.1) < 2.0;
  E.versatz = (k, j) => (kern(k - 0.5, j) ? 10 : 0);
  E.einschub = (i, j) => (kern(i, j) ? 0.3 : 0);
  E.durchgang = 0.3;
  E.viertel = (i, j) => {
    if (kern(i, j)) return 'altstadt';
    const dd = Math.hypot(i - c, j - ja);
    return dd < (i > iI ? 4.6 : 3.9) ? 'gruenderzeit' : 'nachkrieg';
  };
  E.landmarken.push('slot:bahnhof');
  void r;
}

/** Altbayern: breiter Straßenmarkt mit Maibaum und Mariensäule, pastellfarbene Bürgerhäuser, Zwiebel- oder Backsteinkirche, Fluss. */
function altbayern(E) {
  const { r } = E;
  const st = E.o.stadt;
  if (st === 'passau') return passau(E);
  raster(E, 0.45);
  suedGrund(E, 'altbayern', { wirts: 2 });
  E.bv = { landshut: 'landshut', regensburg: 'wasserburg', ingolstadt: 'rosenheim', augsburg: 'landshut' }[st] ?? waehle(r, BU_V);
  const nx = E.nx, nz = E.nz, c = klemm(Math.floor(nx / 2) - 1, 1, nx - 3);
  let jM = klemm(Math.floor(nz / 2) - 1, 2, nz - 3);
  if (st === 'landshut') { kulisseOben(E, 'wald', { burg: 'kaiserburg', burgPos: 0.55 }, [96, 112]); flussQuer(E, nz - 1, { kies: true }); }
  else if (st === 'regensburg') { flussQuer(E, 1, { brueckeP: 0.25 }); jM = klemm(jM + 1, 3, nz - 2); }
  else if (st === 'ingolstadt') flussQuer(E, nz - 1, { kies: true });
  else if (st === 'augsburg') flussSpalte(E, nx - 1, 0, { kies: true });
  else kulisseOben(E, 'wald', {}, [80, 96]);
  const i0 = klemm(c - 1, 0, nx - 3);
  if (st !== 'regensburg') {
    E.reihen[jM] = gerade(zw(r, 50, 58));
    for (let i = i0; i <= i0 + 2; i++) E.spalten[i] = Math.max(E.spalten[i], 58);
    nimm(E, { art: 'suedmarkt', i0, i1: i0 + 2, j0: jM, j1: jM, form: 'strasse', maibaum: true, saeule: st !== 'augsburg', rathaus: st === 'augsburg', seiten: ['-z', '-x'] });
    for (let k = i0; k <= i0 + 3; k++) fixiere(E, k, jM, jM);
  } else { gross(E, c, jM, 62, 58); nimm(E, { art: 'suedmarkt', i0: c, i1: c, j0: jM, j1: jM, form: 'platz', seiten: ['-z', '-x'] }); }
  const kir = { landshut: { kirchArt: 'backstein', turmHoehe: 96 }, regensburg: { kirchArt: 'dom' }, ingolstadt: { kirchArt: 'backstein', turm: 'doppel' }, augsburg: { kirchArt: 'zwiebel', variante: 'stadtpfarr' } }[st] ?? { kirchArt: 'zwiebel', variante: 'stadtpfarr' };
  const ki = st === 'regensburg' ? c + 1 : klemm(i0 + 1, 0, nx - 1), kj = jM - 1;
  gross(E, ki, kj, kir.kirchArt === 'dom' ? 110 : 76, kir.kirchArt === 'zwiebel' ? 92 : 70);
  nimmWennFrei(E, { art: 'suedkirche', i0: ki, i1: ki, j0: kj, j1: kj, seiten: ['-z', '-x'], ...kir });
  E.zentrum = { i: c + 0.5, j: jM + 0.7 };
  const zc = { ...E.zentrum };
  const kern = (i, j) => Math.hypot(i - zc.i, (j - zc.j) * 0.95) < 2.1;
  E.versatz = (k, j) => (kern(k - 0.5, j) ? 14 : 5);
  E.einschub = (i, j) => (kern(i, j) ? 0.35 : 0.08);
  E.durchgang = 0.35;
  E.viertel = kernViertel(E, kern, 3.4);
  if (st === 'augsburg' || st === 'regensburg') E.landmarken.push('slot:rathaus');
}
/** Passau: Altstadt auf der Halbinsel zwischen Donau und Inn, Dreiflüsseeck, Veste Oberhaus über der Donau, Dom mit grünen Hauben. */
function passau(E) {
  const { r } = E;
  raster(E, 0.3);
  suedGrund(E, 'altbayern', { wirts: 1 });
  E.bv = 'passau';
  const nx = E.nx, nz = E.nz;
  kulisseOben(E, 'wald', { burg: 'festung', burgPos: 0.42 }, [96, 110]);
  const jD = 1, jI = Math.min(4, nz - 2);
  flussQuer(E, jD, { brueckeP: 0.35 });
  flussQuer(E, jI, { brueckeP: 0.35, kies: true, faktor: 0.9 });
  nimm(E, { art: 'wasser', form: 'fluss', i0: nx - 1, i1: nx - 1, j0: jD + 1, j1: jI - 1, quer: true, keineBruecke: true });
  for (let k = 0; k <= nx; k++) fixiere(E, k);
  gross(E, 2, 2, 74, 92);
  nimm(E, { art: 'suedkirche', i0: 2, i1: 2, j0: 2, j1: 2, kirchArt: 'zwiebel', variante: 'doppelturm', seiten: ['-z', '-x'] });
  nimmWennFrei(E, { art: 'suedmarkt', i0: 3, i1: 3, j0: 2, j1: 2, form: 'platz', seiten: ['-z', '-x'] });
  E.zentrum = { i: 2.2, j: jI - 1 };
  E.viertel = (i, j) => (j > jD && j < jI && i < nx - 1 ? 'altstadt' : j > jI ? 'gruenderzeit' : 'rand');
  E.versatz = (k, j) => (j > jD && j < jI ? 10 : 4);
  E.einschub = (i, j) => (j > jD && j < jI ? 0.3 : 0);
  void r;
}

/** Franken: Sandstein und Fachwerk, Stadtmauer mit Türmen, Burg auf dem Hügel, Residenz, Weinberge am Main. */
function franken(E) {
  const st = E.o.stadt;
  suedGrund(E, 'franken', { wirts: st === 'bamberg' ? 3 : 2 });
  E.fv = st === 'bamberg' || st === 'erlangen' ? 'bamberg' : 'nuernberg';
  E.barockStadt = ['wuerzburg', 'bayreuth', 'erlangen'].includes(st);
  if (st === 'nuernberg') return nuernberg(E);
  if (st === 'wuerzburg') return wuerzburg(E);
  if (st === 'bamberg') return bamberg(E);
  const { r } = E;
  const nx = E.nx, nz = E.nz, c = klemm(Math.floor(nx / 2) - 1, 1, nx - 3);
  raster(E, st === 'erlangen' ? 0 : st === 'fuerth' ? 0.15 : 0.35);
  if (st === 'fuerth') {
    flussSpalte(E, 0, 0, {});
    gross(E, c, c - 1, 72, 70);
    nimm(E, { art: 'suedkirche', i0: c, i1: c, j0: c - 1, j1: c - 1, kirchArt: 'sandstein', turm: 'west', seiten: ['-z', '-x'] });
    nimm(E, { art: 'suedmarkt', i0: c + 1, i1: c + 1, j0: c, j1: c, form: 'platz', seiten: ['-z', '-x'] });
    E.landmarken.push('slot:rathaus');
    E.zentrum = { i: c + 0.5, j: c + 0.6 };
  } else if (st === 'erlangen') {
    gross(E, c, 1, 100, 84);
    nimm(E, { art: 'residenz', i0: c, i1: c, j0: 1, j1: 1, variante: 'lustschloss' });
    nimm(E, { art: 'park', i0: c + 1, i1: c + 1, j0: 0, j1: 1, garten: true });
    nimm(E, { art: 'suedmarkt', i0: c, i1: c, j0: 2, j1: 2, form: 'platz', seiten: ['-x'] });
    gross(E, c - 1, 3, 70, 66);
    nimm(E, { art: 'suedkirche', i0: c - 1, i1: c - 1, j0: 3, j1: 3, kirchArt: 'barock', seiten: ['-z', '-x'] });
    E.zentrum = { i: c + 0.4, j: 3 };
  } else {   // Bayreuth
    kulisseOben(E, 'wald', {}, [80, 94]);
    gross(E, c, 2, 100, 84);
    nimm(E, { art: 'residenz', i0: c, i1: c, j0: 2, j1: 2, variante: 'lustschloss' });
    nimm(E, { art: 'park', i0: c, i1: c + 1, j0: 1, j1: 1, garten: true });
    const jM = 3; E.reihen[jM] = gerade(zw(r, 50, 56));
    const i0 = klemm(c - 1, 0, nx - 3);
    nimm(E, { art: 'suedmarkt', i0, i1: i0 + 2, j0: jM, j1: jM, form: 'strasse', seiten: ['-z', '-x'] });
    gross(E, c + 1, 2, 72, 70);
    nimmWennFrei(E, { art: 'suedkirche', i0: c + 1, i1: c + 1, j0: 2, j1: 2, kirchArt: 'sandstein', turm: 'doppel', seiten: ['-z', '-x'] });
    E.landmarken.push('slot:theater');
    E.zentrum = { i: c + 0.5, j: jM + 0.7 };
  }
  const zc = { ...E.zentrum };
  const kern = (i, j) => Math.hypot(i - zc.i, j - zc.j) < 1.9;
  E.versatz = (k, j) => (kern(k - 0.5, j) && st !== 'erlangen' ? 12 : 0);
  E.einschub = (i, j) => (kern(i, j) && st !== 'erlangen' ? 0.3 : 0);
  E.viertel = (i, j) => (kern(i, j) ? (E.barockStadt ? 'barock' : 'altstadt') : Math.hypot(i - zc.i, j - zc.j) < 3.6 ? 'gruenderzeit' : 'rand');
}
function nuernberg(E) {
  raster(E, 0.4);
  const nx = E.nx, nz = E.nz, c = klemm(Math.floor(nx / 2) - 1, 2, nx - 3);
  E.reihen[0] = gerade(zw(E.r, 100, 112));
  E.spalten[c - 1] = Math.max(E.spalten[c - 1], 64); E.spalten[c] = Math.max(E.spalten[c], 64);
  nimm(E, { art: 'burgberg', i0: c - 1, i1: c, j0: 0, j1: 0, variante: 'kaiserburg' });
  const K = { i0: 1, i1: nx - 2, j0: 1, j1: nz - 3 };
  E.zTyp[K.i0] = 'ring'; E.zTyp[K.i1 + 1] = 'ring'; E.xTyp[K.j1 + 1] = 'ring';
  for (const k of [K.i0, K.i1 + 1]) fixiere(E, k);
  E.tram.push('z' + K.i0);
  const jP = 3;
  flussQuer(E, jP, { brueckeP: 0.6, faktor: 0.85 });
  gross(E, c - 1, 1, 70, 76);
  nimm(E, { art: 'suedkirche', i0: c - 1, i1: c - 1, j0: 1, j1: 1, kirchArt: 'sandstein', seiten: ['-z', '-x'] });
  gross(E, c, 2, 66, 60);
  nimm(E, { art: 'suedmarkt', i0: c, i1: c, j0: 2, j1: 2, form: 'platz', brunnen: 'gotisch', seiten: ['-z', '-x'] });
  gross(E, c + 1, 4, 72, 72);
  nimm(E, { art: 'suedkirche', i0: c + 1, i1: c + 1, j0: 4, j1: 4, kirchArt: 'sandstein', seiten: ['-z', '-x'] });
  E.mauer = K;
  E.zentrum = { i: c + 0.3, j: 4.6 };
  const imK = (i, j) => i >= K.i0 && i <= K.i1 && j >= K.j0 && j <= K.j1;
  E.versatz = (k, j) => (imK(k - 0.5, j) && k > K.i0 && k <= K.i1 ? 12 : 0);
  E.einschub = (i, j) => (imK(i, j) ? 0.3 : 0);
  E.durchgang = 0.35;
  E.viertel = (i, j) => (imK(i, j) ? 'altstadt' : Math.hypot(i - E.zentrum.i, j - E.zentrum.j) < 4.6 ? 'gruenderzeit' : 'rand');
  E.landmarken.push('slot:bahnhof');
}
function wuerzburg(E) {
  raster(E, 0.35);
  const nx = E.nx, nz = E.nz, iM = 2;
  kulisseLinks(E, 'wein', {}, [70, 84], 0);
  flussSpalte(E, iM, 0, {});
  E.spalten[1] = Math.max(E.spalten[1], 92);
  gross(E, 1, 1, 92, 70); gross(E, 1, 2, 92, 70);
  nimm(E, { art: 'burgberg', i0: 1, i1: 1, j0: 1, j1: 2, variante: 'festung' });
  const iR = nx - 3;
  gross(E, iR, 2, 92, 104); gross(E, iR + 1, 2, 80, 104);
  nimm(E, { art: 'residenz', i0: iR, i1: iR + 1, j0: 2, j1: 2, variante: 'residenz' });
  nimm(E, { art: 'park', i0: iR, i1: iR + 1, j0: 1, j1: 1, garten: true });
  gross(E, iM + 2, 3, 104, 84);
  nimm(E, { art: 'suedkirche', i0: iM + 2, i1: iM + 2, j0: 3, j1: 3, kirchArt: 'romanisch', seiten: ['-z', '-x'] });
  nimmWennFrei(E, { art: 'suedmarkt', i0: iM + 1, i1: iM + 1, j0: 4, j1: 4, form: 'platz', seiten: ['-z', '-x'] });
  E.zentrum = { i: iM + 2, j: 4.4 };
  const kern = (i, j) => i > iM && Math.hypot(i - iM - 2, j - 3.8) < 2.0;
  E.versatz = (k, j) => (kern(k - 0.5, j) ? 10 : 0);
  E.einschub = (i, j) => (kern(i, j) ? 0.25 : 0);
  E.viertel = (i, j) => (kern(i, j) ? 'barock' : i < iM ? 'altstadt' : Math.hypot(i - iM - 2, j - 4) < 3.8 ? 'gruenderzeit' : 'rand');
  void nz;
}
function bamberg(E) {
  raster(E, 0.45);
  const nx = E.nx, nz = E.nz;
  kulisseOben(E, 'wald', {}, [84, 98]);
  const iA = 2;
  flussSpalte(E, iA, 1, {});
  E.spalten[iA + 1] = gerade(zw(E.r, 60, 74));
  flussSpalte(E, iA + 2, 1, { kanal: true });
  for (let k = 0; k <= nx; k++) fixiere(E, k);
  gross(E, 1, 1, 100, 84);
  nimm(E, { art: 'suedkirche', i0: 1, i1: 1, j0: 1, j1: 1, kirchArt: 'romanisch', seiten: ['-z', '-x'] });
  gross(E, iA + 1, 2, 66, 60);
  nimm(E, { art: 'suedmarkt', i0: iA + 1, i1: iA + 1, j0: 2, j1: 2, form: 'platz', seiten: ['-z', '-x'] });
  E.zentrum = { i: iA + 1, j: 3 };
  E.viertel = (i, j) => (i < iA ? 'barock' : i === iA + 1 ? 'altstadt' : Math.hypot(i - iA - 1, j - 3) < 3 ? 'gruenderzeit' : 'rand');
  E.versatz = (k, j) => 6 * (j > 0 ? 1 : 0);
  void nz;
}

/** Schwaben: Fachwerk, steile Dächer, Marktplatz mit Rathaus und Brunnen, Neckar oder Donau, Münster in Ulm. */
function schwaben(E) {
  const { r } = E;
  const st = E.o.stadt;
  suedGrund(E, 'schwaben');
  E.sv = st === 'esslingen' || st === 'ulm' ? 'esslingen' : 'tuebingen';
  E.barockStadt = st === 'ludwigsburg';
  E.nachkrieg = ['heilbronn', 'pforzheim', 'ulm', 'reutlingen'].includes(st);
  const nx = E.nx, nz = E.nz, c = klemm(Math.floor(nx / 2) - 1, 1, nx - 3);
  raster(E, st === 'ludwigsburg' ? 0 : st === 'pforzheim' || st === 'heilbronn' ? 0.25 : 0.55);
  let kirche = { kirchArt: 'gotik' }, ki = c + 1, kj = 2, mi = c, mj = 3;
  if (st === 'tuebingen') { kulisseOben(E, 'wald', { burg: 'festung', burgPos: 0.35 }, [96, 110]); flussQuer(E, nz - 1, { faktor: 0.8 }); }
  else if (st === 'esslingen') { kulisseOben(E, 'wein', { burg: 'kaiserburg', burgPos: 0.62 }, [96, 110]); flussSpalte(E, nx - 1, 1, { kanal: true }); kirche = { kirchArt: 'gotik', turm: 'doppel' }; }
  else if (st === 'reutlingen') { kulisseOben(E, 'wald', {}, [96, 110]); kirche = { kirchArt: 'gotik', turmHoehe: 72 }; }
  else if (st === 'ulm') { flussQuer(E, nz - 1, {}); kirche = { kirchArt: 'muenster', variante: 'ulm' }; ki = c; kj = 2; mi = c + 1; mj = 3; }
  else if (st === 'heilbronn') { kulisseOben(E, 'wein', {}, [96, 110]); flussSpalte(E, 1, 1, {}); kirche = { kirchArt: 'gotik', turm: 'west' }; ki = c + 1; kj = 3; mi = c + 1; mj = 4; }
  else if (st === 'pforzheim') { kulisseOben(E, 'wald', {}, [96, 112]); flussQuer(E, nz - 1, { faktor: 0.75 }); }
  else if (st === 'ludwigsburg') {
    gross(E, c, 0, 100, 100); gross(E, c + 1, 0, 80, 100);
    nimm(E, { art: 'residenz', i0: c, i1: c + 1, j0: 0, j1: 0, variante: 'residenz' });
    nimm(E, { art: 'park', i0: c + 2, i1: Math.min(nx - 1, c + 3), j0: 0, j1: 1, garten: true });
    kirche = { kirchArt: 'barock' }; ki = c - 1; kj = 2; mi = c; mj = 2;
    gross(E, c + 1, 2, 70, 66);
    nimmWennFrei(E, { art: 'suedkirche', i0: c + 1, i1: c + 1, j0: 2, j1: 2, kirchArt: 'barock', seiten: ['-z', '-x'] });
  }
  const muenster = kirche.kirchArt === 'muenster';
  gross(E, ki, kj, muenster ? 96 : 74, muenster ? 136 : 70);
  nimmWennFrei(E, { art: 'suedkirche', i0: ki, i1: ki, j0: kj, j1: kj, seiten: muenster ? ['-z', '-x', '+x'] : ['-z', '-x'], ...kirche });
  gross(E, mi, mj, 60, 56);
  nimmWennFrei(E, { art: 'suedmarkt', i0: mi, i1: mi, j0: mj, j1: mj, form: st === 'ludwigsburg' ? 'platz' : 'bw', seiten: ['-z', '-x'] });
  E.zentrum = { i: mi + 0.4, j: mj + 0.6 };
  const zc = { ...E.zentrum };
  const kern = (i, j) => Math.hypot(i - zc.i, (j - zc.j) * 0.9) < (E.T.idx === 2 ? 1.9 : 2.3);
  const regel = st === 'ludwigsburg';
  E.versatz = (k, j) => (regel ? 0 : kern(k - 0.5, j) ? 16 : 6);
  E.einschub = (i, j) => (regel ? 0 : kern(i, j) ? 0.4 : 0.1);
  E.durchgang = 0.4;
  E.viertel = (i, j) => (kern(i, j) ? (regel ? 'barock' : E.nachkrieg && Math.hypot(i - zc.i, j - zc.j) > 1.2 ? 'zentrum' : 'altstadt') : Math.hypot(i - zc.i, j - zc.j) < 3.4 ? 'gruenderzeit' : 'rand');
  void r;
}

/** Stuttgart: Kessel mit Hängen, Weinbergen und Stäffele, Halbhöhenlage, Neues Schloss am Schlossplatz, Königstraße, Fernmeldeturm. */
function stuttgart(E) {
  raster(E, 0.2);
  suedGrund(E, 'stuttgart');
  E.nachkrieg = true;
  const nx = E.nx, nz = E.nz;
  kulisseOben(E, 'kessel', { turm: true, turmPos: 0.72 }, [104, 118]);
  kulisseLinks(E, 'kessel', {}, [84, 98], 1);
  // B5: keine Hangterrassen mit Häusern innerhalb der Stadt (Halbhöhenlage): diese Zellen sind normale Blöcke auf einer
  // Ebene, der Kessel steigt nur am Kartenrand und im Stadtrandgürtel an
  E.reihen[1] = Math.max(E.reihen[1], 74); E.spalten[1] = Math.max(E.spalten[1], 80);
  const c = Math.min(nx - 4, 5);
  gross(E, c, 3, 112, 100);
  nimm(E, { art: 'residenz', i0: c, i1: c, j0: 3, j1: 3, variante: 'residenz' });
  nimm(E, { art: 'park', i0: c, i1: c, j0: 4, j1: 4, garten: true });
  nimmWennFrei(E, { art: 'park', i0: c + 1, i1: c + 1, j0: 2, j1: 4 });
  gross(E, c - 2, 4, 74, 70);
  nimmWennFrei(E, { art: 'suedkirche', i0: c - 2, i1: c - 2, j0: 4, j1: 4, kirchArt: 'gotik', turm: 'doppel', seiten: ['-z', '-x'] });
  flussSpalte(E, nx - 1, 1, {});
  E.landmarken.push('slot:bahnhof');
  E.zentrum = { i: c - 1, j: 5 };
  E.viertel = (i, j) => { const dd = Math.hypot(i - c + 1, j - 5); return dd < 1.6 ? 'zentrum' : dd < 2.2 ? 'altstadt' : dd < 4.4 ? 'gruenderzeit' : 'nachkrieg'; };
  E.versatz = (k, j) => (j >= 2 ? 6 : 0);
}

/** Karlsruhe (Fächerstadt mit Schloss als Mittelpunkt) und Mannheim (Quadrate, Barockschloss, Wasserturm). */
function faecherQuadrate(E) {
  const st = E.o.stadt;
  suedGrund(E, 'faecher_quadrate');
  E.nachkrieg = st === 'mannheim';
  const nx = E.nx, nz = E.nz;
  raster(E, 0);
  if (st === 'mannheim') {
    const w = gerade(zw(E.r, 64, 70));
    E.spalten = E.spalten.map(() => w); E.reihen = E.reihen.map(() => w);
    flussSpalte(E, 0, 0, {});
    E.reihen[0] = gerade(zw(E.r, 96, 106));
    const iS = 2;
    nimm(E, { art: 'residenz', i0: iS, i1: iS + 2, j0: 0, j1: 0, variante: 'residenz' });
    nimm(E, { art: 'park', i0: 1, i1: 1, j0: 0, j1: 0, garten: true });
    nimmWennFrei(E, { art: 'park', i0: iS + 3, i1: nx - 1, j0: 0, j1: 0, garten: true });
    E.zTyp[1] = 'ring'; E.zTyp[nx] = 'ring'; E.xTyp[1] = 'ring';
    E.tram.push('z1');
    nimm(E, { art: 'suedkirche', i0: iS, i1: iS, j0: 1, j1: 1, kirchArt: 'barock', seiten: ['-z', '-x'] });
    nimmWennFrei(E, { art: 'park', i0: nx - 2, i1: nx - 2, j0: Math.floor(nz / 2), j1: Math.floor(nz / 2), garten: true });
    E.landmarken.push('slot:wasserturm');
    E.zentrum = { i: (nx - 1) / 2 + 0.3, j: (nz - 1) / 2 };
    E.viertel = (i, j) => (j === 1 && i >= iS && i <= iS + 2 ? 'barock' : Math.hypot(i - E.zentrum.i, j - E.zentrum.j) < 1.6 ? 'zentrum' : 'gruenderzeit');
    E.quadrate = true;
    return;
  }
  // Karlsruhe
  const c = klemm(Math.floor(nx / 2) - 1, 2, nx - 3);
  E.reihen[0] = gerade(zw(E.r, 92, 104));
  nimm(E, { art: 'faecher', i0: 0, i1: nx - 1, j0: 0, j1: 0, teil: 'wald' });
  E.reihen[1] = gerade(zw(E.r, 96, 106));
  E.spalten[c] = Math.max(E.spalten[c], 86); E.spalten[c + 1] = Math.max(E.spalten[c + 1], 86);
  nimm(E, { art: 'residenz', i0: c, i1: c + 1, j0: 1, j1: 1, variante: 'residenz' });
  nimm(E, { art: 'faecher', i0: 0, i1: c - 1, j0: 1, j1: 1, teil: 'garten' });
  nimm(E, { art: 'faecher', i0: c + 2, i1: nx - 1, j0: 1, j1: 1, teil: 'garten' });
  E.reihen[2] = gerade(zw(E.r, 64, 72));
  nimm(E, { art: 'faecher', i0: c, i1: c + 1, j0: 2, j1: 2, teil: 'platz' });
  nimm(E, { art: 'faecher', i0: c - 1, i1: c - 1, j0: 2, j1: 2, teil: 'garten' });
  nimm(E, { art: 'faecher', i0: c + 2, i1: c + 2, j0: 2, j1: 2, teil: 'garten' });
  E.zTyp[c + 1] = 'boulevard';
  gross(E, c, 4, 64, 60);
  nimm(E, { art: 'suedmarkt', i0: c, i1: c, j0: 4, j1: 4, form: 'platz', pyramide: true, seiten: ['-z', '-x'] });
  gross(E, c + 1, 4, 70, 60);
  nimmWennFrei(E, { art: 'suedkirche', i0: c + 1, i1: c + 1, j0: 4, j1: 4, kirchArt: 'barock', seiten: ['-z', '+x'] });
  // Einkaufslage (Kaiserstraße) zwei Reihen unter dem Schlossplatz: dazwischen liegt der Fächer
  E.zentrum = { i: c + 0.5, j: 4.4 };
  E.viertel = (i, j) => (j <= 4 && Math.abs(i - c - 0.5) < 2.2 ? 'barock' : Math.hypot(i - c - 0.5, j - 4) < 3.8 ? 'gruenderzeit' : 'rand');
  // Fächerstraßen: acht der 32 Strahlen vom Schlossturm (gleiche Winkel wie im Schlossgarten) laufen durch die Innenstadt
  E.diagonalen = ({ bloecke }) => {
    const res = bloecke.find((q) => q.art === 'residenz');
    if (!res) return [];
    const C = { x: res.x + res.w / 2, z: res.z + Math.min(24, res.d * 0.3) };
    const zStart = Math.max(...bloecke.filter((q) => q.art === 'faecher' || q.art === 'residenz').map((q) => q.z + q.d));
    return [3, 6, 9, 12].map((k) => {   // vier Hauptstrahlen in die Stadt; mehr zerschneiden die Blöcke zu Restflächen
      const winkel = ((2 * k + 1) * Math.PI) / 32, dz = Math.sin(winkel);
      return { C, winkel, t0: (zStart - C.z) / dz, t1: (zStart - C.z) / dz + (E.typ === 'mittelstadt' ? 380 : 560), breite: 16, gehweg: 4.5 };
    });
  };
}

/** Oberrhein und Bodensee: Freiburg (rotes Münster, Bächle, Schwarzwald), Konstanz (See), Heidelberg (Schlossruine am Hang, Neckar). */
function oberrheinBodensee(E) {
  const st = E.o.stadt;
  suedGrund(E, 'oberrhein_bodensee', { umriss: st === 'konstanz' ? 'diagonal' : 'voll' });
  const nx = E.nx, nz = E.nz, c = klemm(Math.floor(nx / 2) - 1, 1, nx - 3);
  if (st === 'heidelberg') {
    raster(E, 0.3);
    E.barockStadt = true;
    kulisseOben(E, 'wald', { burg: 'ruine', burgPos: 0.58 }, [104, 120]);
    E.reihen[1] = gerade(zw(E.r, 50, 58)); E.reihen[2] = gerade(zw(E.r, 70, 76));
    flussQuer(E, 3, { brueckeP: 0.3 });
    gross(E, c, 2, 76, 72);
    nimm(E, { art: 'suedkirche', i0: c, i1: c, j0: 2, j1: 2, kirchArt: 'sandstein', turm: 'west', seiten: ['-z', '-x'] });
    nimm(E, { art: 'suedmarkt', i0: c + 1, i1: c + 1, j0: 2, j1: 2, form: 'platz', seiten: ['-z', '-x'] });
    E.zentrum = { i: c - 0.6, j: 1.4 };
    E.viertel = (i, j) => (j === 1 || j === 2 ? 'altstadt' : j > 3 && Math.abs(i - c) < 3 ? 'gruenderzeit' : 'rand');
    E.versatz = (k, j) => (j === 1 || j === 2 ? 10 : 0);
    E.einschub = (i, j) => (j === 1 || j === 2 ? 0.35 : 0);
    return;
  }
  if (st === 'konstanz') {
    raster(E, 0.45);
    flussQuer(E, 0, { brueckeP: 0.4 });
    nimm(E, { art: 'wasser', form: 'see', i0: nx - 1, i1: nx - 1, j0: 1, j1: nz - 1 });
    gross(E, c, 2, 74, 72);
    nimm(E, { art: 'suedkirche', i0: c, i1: c, j0: 2, j1: 2, kirchArt: 'gotik', turm: 'west', seiten: ['-z', '-x'] });
    nimm(E, { art: 'suedmarkt', i0: c + 1, i1: c + 1, j0: 3, j1: 3, form: 'platz', seiten: ['-z', '-x'] });
    E.landmarken.push('slot:markthalle');
    E.zentrum = { i: c + 0.6, j: 3.1 };
    const zc = { ...E.zentrum };
    const kern = (i, j) => Math.hypot(i - zc.i, j - zc.j) < 1.9;
    E.versatz = (k, j) => (kern(k - 0.5, j) ? 14 : 4);
    E.einschub = (i, j) => (kern(i, j) ? 0.35 : 0);
    E.viertel = kernViertel(E, kern, 3.2);
    return;
  }
  // Freiburg
  raster(E, 0.4);
  kulisseOben(E, 'wald', {}, [100, 116]);
  kulisseLinks(E, 'wald', {}, [74, 90], 1);
  const jm = 3;
  gross(E, c, jm, 98, 136);
  nimm(E, { art: 'suedkirche', i0: c, i1: c, j0: jm, j1: jm, kirchArt: 'muenster', variante: 'freiburg', markt: true, seiten: ['-z', '-x', '+x'] });
  E.landmarken.push('slot:tor');
  E.baechle = true;
  E.zentrum = { i: c + 0.5, j: jm + 0.7 };
  const zc = { ...E.zentrum };
  const kern = (i, j) => Math.hypot(i - zc.i, j - zc.j) < 2.0;
  E.versatz = (k, j) => (kern(k - 0.5, j) ? 12 : 4);
  E.einschub = (i, j) => (kern(i, j) ? 0.3 : 0);
  E.viertel = kernViertel(E, kern, 3.8);
}

/** Alpenrand: Kempten, Rosenheim: Bergkette ganz nah, Voralpenhäuser am Ortsrand, Fluss mit Kiesbänken, Zwiebelkirche, Maibaum. */
function alpenrand(E) {
  const { r } = E;
  const st = E.o.stadt;
  raster(E, 0.4);
  suedGrund(E, 'alpenrand', { wirts: 2 });
  E.bv = st === 'rosenheim' ? 'rosenheim' : 'wasserburg';
  E.voralpenRand = true;
  const nx = E.nx, nz = E.nz;
  kulisseOben(E, 'alpen', {}, [120, 136]);
  kulisseLinks(E, 'voralpen', {}, [78, 92], 1);
  flussSpalte(E, nx - 2, 1, { kies: true });
  const c = 2;
  if (st === 'rosenheim') {
    const jM = 3; E.reihen[jM] = gerade(zw(r, 50, 56));
    nimm(E, { art: 'suedmarkt', i0: 1, i1: 3, j0: jM, j1: jM, form: 'strasse', maibaum: true, saeule: true, seiten: ['-z', '-x'] });
    gross(E, c, 2, 74, 90);
    nimm(E, { art: 'suedkirche', i0: c, i1: c, j0: 2, j1: 2, kirchArt: 'zwiebel', variante: 'stadtpfarr', seiten: ['-z', '-x'] });
    E.zentrum = { i: 2.2, j: jM + 0.7 };
  } else {
    gross(E, c, 2, 76, 94);
    nimm(E, { art: 'suedkirche', i0: c, i1: c, j0: 2, j1: 2, kirchArt: 'zwiebel', variante: 'doppelturm', seiten: ['-z', '-x'] });
    gross(E, c + 1, 2, 100, 94);
    nimm(E, { art: 'residenz', i0: c + 1, i1: c + 1, j0: 2, j1: 2, variante: 'quadrat' });
    nimm(E, { art: 'suedmarkt', i0: c, i1: c, j0: 3, j1: 3, form: 'platz', maibaum: true, seiten: ['-z', '-x'] });
    E.zentrum = { i: c + 0.4, j: 3.6 };
  }
  const zc = { ...E.zentrum };
  const kern = (i, j) => Math.hypot(i - zc.i, j - zc.j) < 1.8;
  E.versatz = (k, j) => (kern(k - 0.5, j) ? 12 : 4);
  E.einschub = (i, j) => (kern(i, j) ? 0.3 : 0);
  E.viertel = kernViertel(E, kern, 2.7);
}

// ====================================================================================
// Parzellierung der bebauten Blöcke
// ====================================================================================
const BAYRISCH = new Set(['muenchen', 'altbayern', 'franken', 'alpenrand']);
function parzellierung(ctx, E, b) {
  const { rb } = ctx;
  const v = b.viertel, slots = ctx.einkaufSlots.length;
  const einkauf = slots > 0 || !!E.einkaufKern?.(b.i0, b.j0);
  if (E.voralpenRand && !einkauf && (v === 'rand' || v === 'nachkrieg') && b.w >= 62 && b.d >= 58 && Math.hypot(b.i0 - E.zentrum.i, b.j0 - E.zentrum.j) > 3.2) { voralpenBlock(ctx, E, b); return true; }   // frei stehende Häuser nur am Ortsrand, nicht im Zentrumsbild
  b.zeilen = einkauf || rb() < ZEILEN_P[gruppe(v)];
  if (b.zeilen) {
    ctx.T = { ...ctx.T, tiefe: tiefeVon(E) };
    ctx.parz = E.typ === 'mittelstadt' ? [18, 32] : [22, 40];
  }
  return false;
}
/** Voralpenhäuser frei stehend mit Garten (Alpenrand, Ortsrand). */
function voralpenBlock(ctx, E, b) {
  const { rb } = ctx;
  const m = 2, na = Math.max(1, Math.floor((b.w - 2 * m) / 32)), nc = Math.max(1, Math.floor((b.d - 2 * m) / 30));
  const cw = (b.w - 2 * m) / na, cd = (b.d - 2 * m) / nc;
  for (let a = 0; a < na; a++) for (let c = 0; c < nc; c++) {
    if (rb() < 0.12 && !(c === nc - 1)) continue;
    const front = c === nc - 1 ? ['+z'] : a === na - 1 ? ['+x'] : [rb() < 0.5 ? '+z' : '+x'];
    neueParzelle(ctx, 'slot:bay_alpen', b.x + m + a * cw + 1, b.z + m + c * cd + 1, cw - 2, cd - 2, front, 'frei', { klasse: 2, landmarke: false, variante: rb() < 0.78 ? 'voralpenhaus' : 'gasthof' });
  }
  b.voralpen = true;
  b.hof = { x: b.x + 1, z: b.z + 1, w: b.w - 2, d: b.d - 2, art: 'gruen' };
  b.tiefen = { '+z': 0, '-z': 0, '+x': 0, '-x': 0 };
}
function nachbearbeitung(ctx, E, b) {
  const { rb } = ctx;
  if (b.voralpen) return;
  const v = b.viertel, slots = H.slotsImBlock(ctx).length;
  // Stadtmauer mit Türmen an den Außenkanten der Nürnberger Altstadt
  const K = E.mauer;
  if (K && b.i0 >= K.i0 && b.i0 <= K.i1 && b.j0 >= K.j0 && b.j0 <= K.j1) {
    const seiten = [];
    if (b.j0 === K.j1) seiten.push('+z');
    if (b.i0 === K.i1) seiten.push('+x');
    if (b.i0 === K.i0) seiten.push('-x');
    if (b.j0 === K.j0) seiten.push('-z');
    for (const s of seiten) for (let k = 0; k < 3; k++) if (!mergeRand(ctx, FR, [26, 96], 24, [s], { variante: 'stadtmauer', landmarke: false })) break;
  }
  // Wirtshaus mit Biergarten bzw. Bräuhaus
  if (BAYRISCH.has(E.sued) && (E.wirtsN ?? 0) < (E.wirtsMax ?? 0) && !slots && gruppe(v) !== 'rand' && rb() < 0.3) {
    const variante = E.sued === 'muenchen' && !E.wirtsN ? 'braeuhaus' : waehle(rb, ['wirtshaus', 'wirtshaus', 'braeuhaus', E.sued === 'franken' ? 'brauerei' : 'wirtshaus']);
    if (mergeRand(ctx, 'slot:bay_wirtshaus', [40, 72], 30, ['+z', '+x'], { variante, landmarke: false })) E.wirtsN = (E.wirtsN ?? 0) + 1;
  }
  // Geschäftshäuser der 50er (Wiederaufbaustädte)
  if (E.nachkrieg && b.zeilen && (gruppe(v) === 'zentrum' || (slots && gruppe(v) !== 'alt')) && rb() < 0.55) mergeRand(ctx, ST, [30, 64], 32, ['+z', '+x', '-z'], { variante: 'geschaeft50', landmarke: false });
  // Maibaum auf einem Eckplatz an der Einkaufslage (Altbayern, München, Alpenrand)
  if (['muenchen', 'altbayern', 'alpenrand'].includes(E.sued) && !E.maibaumEinkauf && !slots && E.einkaufKern?.(b.i0, b.j0)) {
    const p = parzellenVon(ctx).find((q) => q.typ === 'eck' && q.ecke === '+x+z' && q.w >= 17 && q.d >= 17);
    if (p) { Object.assign(p, { typ: 'slot:bay_maibaum', sonder: 'bay_maibaum', variante: 'markt', stil: null, landmarke: false, front: ['+z'], seite: 'frei' }); E.maibaumEinkauf = true; }
  }
  if (b.zeilen) zeilenUmwandeln(ctx, E, b, v);
}

/** Einmal nach allen Blöcken: Kiesbänke in Isar, Inn, Iller und Donau; Biergarten im Englischen Garten. */
function nachPlan(E, _H, g) {
  const { bloecke, parzellen, T, typ, strassen } = g;
  const ctxVon = (b, rb) => ({ T, rb, b, parzellen, region: E.region, typ });
  for (const b of bloecke) {
    if (b.art !== 'wasser' || !b.kies) continue;
    const rb = rng(b.seed + 515);
    const quer = !!b.quer, L0 = quer ? b.x : b.z, L1 = quer ? b.x + b.w : b.z + b.d;
    // Brücken und Straßen über dem Fluss aussparen
    const weg = strassen.filter((s) => s.achse === (quer ? 'z' : 'x') && s.von < (quer ? b.z + b.d : b.x + b.w) && s.bis > (quer ? b.z : b.x)).map((s) => [s.mitte - s.breite / 2 - 6, s.mitte + s.breite / 2 + 6]);
    let seite = rb() < 0.5;
    for (const [a, e] of H.intervalleMinus(L0 + 4, L1 - 4, weg)) {
      if (e - a < 34) continue;
      const len = (e - a) * zw(rb, 0.55, 0.8), u = a + (e - a - len) * zw(rb, 0.2, 0.8);
      const B = (quer ? b.d : b.w), bw = B * zw(rb, 0.26, 0.36), off = seite ? 3 : B - bw - 3;
      if (quer) neueParzelle(ctxVon(b, rb), 'slot:sued_kiesbank', u, b.z + off, len, bw, ['+z'], 'frei', { klasse: 1, landmarke: false });
      else neueParzelle(ctxVon(b, rb), 'slot:sued_kiesbank', b.x + off, u, bw, len, ['+z'], 'frei', { klasse: 1, landmarke: false });
      seite = !seite;
    }
  }
  for (const b of bloecke) {
    if (b.art !== 'park' || !b.biergarten) continue;
    const rb = rng(b.seed + 616);
    const q = freiePosition({ x: b.x + 6, z: b.z + 6, w: b.w - 12, d: b.d - 12 }, b.parzellen.map((id) => parzellen.find((p) => p.id === id)).filter(Boolean), 48, 34, 3, rb, true);
    if (q) neueParzelle(ctxVon(b, rb), 'slot:bay_wirtshaus', q.x, q.z, q.w, q.d, ['+z'], 'frei', { klasse: 3, landmarke: false, variante: 'wirtshaus' });
  }
}

// ====================================================================================
// Stilprofil der übrigen Stadthäuser, Eckhäuser und Hofhäuser
// ====================================================================================
const STILE = {
  muenchen: { alt: { gruenderzeit: 2, barock: 2, jugendstil: 1, wiederaufbau: 1.4 }, zentrum: { gruenderzeit: 2.5, jugendstil: 1.5, wiederaufbau: 1.2, fuenfziger: 0.8, neubau: 0.6 },
    gruen: { gruenderzeit: 3.5, jugendstil: 2.2, barock: 0.4 }, rand: { fuenfziger: 1.6, wiederaufbau: 1.2, neubau: 1.2, siebziger: 0.8, gruenderzeit: 0.8 } },
  altbayern: { alt: { barock: 3.2, gruenderzeit: 1, wiederaufbau: 1 }, zentrum: { barock: 2, gruenderzeit: 1.5, wiederaufbau: 1.2, fuenfziger: 0.6 },
    gruen: { gruenderzeit: 2.4, jugendstil: 1, barock: 0.8 }, rand: { fuenfziger: 1.5, wiederaufbau: 1.2, neubau: 1, siebziger: 0.5 } },
  franken: { alt: { fachwerk: 2, barock: 1.2, wiederaufbau: 1.4, gruenderzeit: 0.8 }, zentrum: { wiederaufbau: 2, gruenderzeit: 1.4, fuenfziger: 1, fachwerk: 0.6 },
    gruen: { gruenderzeit: 3, jugendstil: 1.4 }, rand: { fuenfziger: 1.4, wiederaufbau: 1, neubau: 1, siebziger: 0.6 } },
  schwaben: { alt: { fachwerk: 3, barock: 1, gruenderzeit: 0.6 }, zentrum: { fuenfziger: 1.6, wiederaufbau: 1.4, fachwerk: 1, neubau: 0.8 },
    gruen: { gruenderzeit: 2.6, jugendstil: 1.2, fuenfziger: 0.6 }, rand: { fuenfziger: 1.4, neubau: 1.2, siebziger: 0.7, wiederaufbau: 0.8 } },
  stuttgart: { alt: { fachwerk: 1, wiederaufbau: 2, fuenfziger: 1.4 }, zentrum: { fuenfziger: 2.4, neubau: 1.6, siebziger: 0.8, gruenderzeit: 0.8 },
    gruen: { gruenderzeit: 3, jugendstil: 1.6, fuenfziger: 0.6 }, rand: { fuenfziger: 1.4, neubau: 1.2, siebziger: 0.8, gruenderzeit: 0.5 } },
  faecher_quadrate: { alt: { barock: 2.6, gruenderzeit: 1.6, wiederaufbau: 1 }, zentrum: { gruenderzeit: 1.6, fuenfziger: 1.8, wiederaufbau: 1.4, neubau: 0.8 },
    gruen: { gruenderzeit: 3, jugendstil: 1.4 }, rand: { fuenfziger: 1.4, neubau: 1.2, siebziger: 0.7 } },
  oberrhein_bodensee: { alt: { barock: 2.4, fachwerk: 1.2, gruenderzeit: 1 }, zentrum: { barock: 1.4, gruenderzeit: 1.4, wiederaufbau: 1.2, fuenfziger: 0.6 },
    gruen: { gruenderzeit: 2.6, jugendstil: 1.8 }, rand: { fuenfziger: 1.2, neubau: 1.2, siebziger: 0.5, gruenderzeit: 0.6 } },
  alpenrand: { alt: { barock: 3, gruenderzeit: 0.8 }, zentrum: { barock: 2, gruenderzeit: 1.2, fuenfziger: 0.7 }, gruen: { gruenderzeit: 2, barock: 1.2 }, rand: { fuenfziger: 1, barock: 1, neubau: 0.8 } },
};
const GESCHOSSE = { gruenderzeit: [3, 5], jugendstil: [3, 5], barock: [3, 4], fachwerk: [2, 3], fuenfziger: [3, 6], siebziger: [4, 7], neubau: [4, 6], wiederaufbau: [3, 5] };
function suedStil(p, nachbar) {
  const r = rng(((p.seed ?? 1) * 2654435761 + 4111) >>> 0);
  const tab = STILE[p.suedTyp] ?? STILE.altbayern;
  const basis = tab[gruppe(p.viertel)] ?? tab.alt;
  const liste = Object.entries(basis).map(([st, g]) => {
    let w = g;
    if (nachbar?.stil === st) w *= 0.35;
    if (st === 'fachwerk' && p.w > 18 && p.d > 18) w *= 0.2;
    if (p.typ === 'hofhaus' && st !== 'fachwerk') w *= 0.6;
    return [st, w];
  });
  const stil = wahlGewichtet(r, liste);
  let [a, b] = GESCHOSSE[stil] ?? [3, 5];
  if (p.cluster === 'metropole') { a += 1; b += 1; } else if (p.cluster === 'mittelstadt') b -= 1;
  if (p.typ === 'hofhaus') b = Math.min(b, 3);
  let g = Math.round(a + (b - a) * r());
  if (nachbar?.geschosse && r() < 0.4) g = nachbar.geschosse + waehle(r, [-1, 0, 1]);
  return { stil, geschosse: klemm(g, 2, 7), region: 'Süd' };
}
registriereStilProfil('sued', (p, nachbar) => suedStil(p, nachbar));
function parzelleMarkieren(p, bl, E) {
  p.stilProfil = 'sued'; p.suedTyp = E.sued; p.suedStadt = E.stadt;
}

// ====================================================================================
// Registrierung
// ====================================================================================
const GEMEINSAM = {
  gewicht: [0, 0, 0], parzellierung, nachbearbeitung, nachPlan, parzelleMarkieren,
  flaechen: {
    kulisse: { parzelliere: kulisseParzelliere, boden: bodenGruen },
    burgberg: { parzelliere: burgbergParzelliere, boden: bodenGruen },
    suedmarkt: { parzelliere: marktParzelliere, boden: marktBoden },
    suedkirche: { parzelliere: kirchParzelliere, boden: kirchBoden },
    residenz: { parzelliere: residenzParzelliere, boden: residenzBoden },
    faecher: { boden: faecherBoden },
  },
};
registriereArchetyp('muenchen', { ...GEMEINSAM, name: 'Residenzmetropole', entwurf: muenchen, staedte: { München: { stadt: 'muenchen' } } });
registriereArchetyp('altbayern', { ...GEMEINSAM, name: 'Altbayerische Marktstadt', entwurf: altbayern,
  staedte: { Landshut: { stadt: 'landshut' }, Passau: { stadt: 'passau' }, Regensburg: { stadt: 'regensburg' }, Ingolstadt: { stadt: 'ingolstadt' }, Augsburg: { stadt: 'augsburg' } } });
registriereArchetyp('franken', { ...GEMEINSAM, name: 'Fränkische Stadt', entwurf: franken,
  staedte: { Nürnberg: { stadt: 'nuernberg' }, Fürth: { stadt: 'fuerth' }, Bamberg: { stadt: 'bamberg' }, Erlangen: { stadt: 'erlangen' }, Würzburg: { stadt: 'wuerzburg' }, Bayreuth: { stadt: 'bayreuth' } } });
registriereArchetyp('schwaben', { ...GEMEINSAM, name: 'Schwäbische Stadt', entwurf: schwaben,
  staedte: { Tübingen: { stadt: 'tuebingen' }, Esslingen: { stadt: 'esslingen' }, Reutlingen: { stadt: 'reutlingen' }, Ulm: { stadt: 'ulm' }, Heilbronn: { stadt: 'heilbronn' }, Ludwigsburg: { stadt: 'ludwigsburg' }, Pforzheim: { stadt: 'pforzheim' } } });
registriereArchetyp('stuttgart', { ...GEMEINSAM, name: 'Kesselstadt', entwurf: stuttgart, staedte: { Stuttgart: { stadt: 'stuttgart' } } });
registriereArchetyp('faecher_quadrate', { ...GEMEINSAM, name: 'Planstadt Fächer und Quadrate', entwurf: faecherQuadrate, staedte: { Karlsruhe: { stadt: 'karlsruhe' }, Mannheim: { stadt: 'mannheim' } } });
registriereArchetyp('oberrhein_bodensee', { ...GEMEINSAM, name: 'Oberrhein und Bodensee', entwurf: oberrheinBodensee,
  staedte: { Freiburg: { stadt: 'freiburg' }, Konstanz: { stadt: 'konstanz', umland: 'see', seeArt: 'binnen' }, Heidelberg: { stadt: 'heidelberg' } } });
registriereArchetyp('alpenrand', { ...GEMEINSAM, name: 'Alpenrand', entwurf: alpenrand, staedte: { Kempten: { stadt: 'kempten' }, Rosenheim: { stadt: 'rosenheim' } } });

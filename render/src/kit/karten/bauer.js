// Q01 Essen: Geometrie direkt aus OpenStreetMap, nicht aus synthetischen Rasterstraßen.
// Koordinaten und Maßstab bleiben Meter. Geometrie wird pro Farbe über den Kit-Sammler gebündelt.
import { THREE, rng, FARBEN, LOD } from '../basis.js';
import { viertelEssen } from './essen.js';
import { wahrzeichenEssen } from '../wahrzeichen/essen.js';

const dicht = (x, z, cx, cz, d) => Math.hypot(x - cx, z - cz) <= d;
const mitte = (a) => a.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map(v => v / Math.max(1, a.length));
const rect = (a) => {
  if (!a?.length) return null;
  const xx = a.map(p => p[0]), zz = a.map(p => p[1]);
  const x = Math.min(...xx), z = Math.min(...zz);
  return { x, z, w: Math.max(...xx) - x, d: Math.max(...zz) - z };
};
const farbHaus = {
  kern: ['#e3d6be', '#e7dfd1', '#ddd6c9'],
  gruenderzeit: ['#d8c6b2', '#e1d5c4', '#c6b39f', '#d6c4b3'],
  zechensiedlung: ['#b16c56', '#c08067', '#d1b7a0'],
  nachkrieg: ['#d4d8d8', '#dbd5ce', '#ccc5bc'],
  vorort: ['#eee3d5', '#e6ddd1', '#d7c7ae'],
  gewerbe: ['#b6bdc1', '#c4c5c2'],
};
const flaechenFarben = { park: '#83b379', wald: '#679665', wiese: '#91bb80', sport: '#80b89b', platz: '#dcd5c8',
  kern: '#d4c9b9', wohnen: '#a7c395', friedhof: '#8da97b', bahn: '#a9a39a', industrie: '#b2b1a8',
  parkplatz: '#b6b6b0', kleingarten: '#87ad73', brache: '#a8b994', baustelle: '#bfb7ab' };
const strassenFarben = { haupt: '#858b91', neben: '#999fa3', wohn: '#a5a9aa', fuss: '#ded4c3' };
const gleisFarbe = { fern: '#7b7772', tram: '#8b8580', stadtbahn: '#86827b', u: '#797776' };
function linie(S, a, b, breite, y, farbe, hoehe = .13) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  if (len < 1) return;
  S.box(len, hoehe, breite, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, farbe, Math.atan2(-dz, dx));
}
function polygon(S, punkte, farbe, y = .04) {
  if (!punkte || punkte.length < 3) return;
  const p = [], schritt = Math.max(1, Math.ceil(punkte.length / 110));
  for (let i = 0; i < punkte.length; i += schritt) {
    const x = Math.round(punkte[i][0] * 2) / 2, z = Math.round(punkte[i][1] * 2) / 2;
    if (!p.length || Math.hypot(p[p.length - 1][0] - x, p[p.length - 1][1] - z) > 2) p.push([x, z]);
  }
  if (p.length < 3) return;
  const shape = new THREE.Shape();
  shape.moveTo(p[0][0], -p[0][1]);
  for (let i = 1; i < p.length; i++) shape.lineTo(p[i][0], -p[i][1]);
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  S.add(g, farbe);
}
function baueFlaechen(S, k, r) {
  // Erst Grundflächen, dann Wege, Gleise und Gebäude. Kein rechteckiger Platzhalter für einen See.
  S.quader(0, -.45, 0, k.radius * 2, -.12, k.radius * 2, '#b0bf9e');
  for (const f of k.flaechen) {
    const b = rect(f.umriss);
    if (!b || b.w * b.d < 45 || b.w > k.radius * 2 || b.d > k.radius * 2) continue;
    if (f.art === 'parkplatz' && b.w * b.d < 350) continue;
    if (f.art === 'wiese' && b.w * b.d < 1000) continue;
    if (f.art === 'platz' && b.w * b.d < 150) continue;
    const farbe = flaechenFarben[f.art] ?? '#a6be9c';
    polygon(S, f.umriss, farbe);
    if (f.art === 'kleingarten') {
      // Verschiedene Laubengrößen, unregelmäßige Parzellen und offene Ecken.
      const lauben = ['#b87c5d', '#e4cfab', '#8eab87', '#d1d1c5', '#9aafa9', '#c6a17b'];
      const laenge = Math.max(3, Math.floor(Math.sqrt(b.w * b.d) / 18));
      for (let i = 0; i < laenge; i++) {
        const xx = b.x + 5 + r() * Math.max(1, b.w - 11), zz = b.z + 5 + r() * Math.max(1, b.d - 11);
        const w = 3.5 + r() * 5, d = 3.5 + r() * 4;
        if (xx + w < b.x + b.w && zz + d < b.z + b.d) {
          S.box(w, 2.3 + r() * 1.5, d, xx, 1.5, zz, lauben[i % lauben.length], r() * .2);
          if (i % 3 === 0) S.box(w + .8, .3, d + .8, xx, 3.5, zz, '#71634e');
        }
      }
    }
  }
  for (const w of k.wasser) polygon(S, w.umriss, FARBEN.wasser, -.08);
  // Der OSM-Ausschnitt enthält keine Ackerschläge; wenige Handflächen am Rand
  // bilden einen gestalteten Übergang, ausdrücklich nicht als echte OSM-Daten ausgewiesen.
  for (let i = 0; i < 7; i++) {
    const x = 200 + i * (28 + r() * 9), z = 110 + r() * 20;
    S.box(17 + r() * 13, .06, 38 + r() * 28, x, .01, z, ['#b6b46d','#bea86a','#91a66d','#a7bb80'][i % 4], .03 * (i % 3));
  }
}
function baueStrassen(S, k) {
  for (const s of k.strassen) {
    const breite = s.klasse === 'haupt' ? 15 : s.klasse === 'neben' ? 10 : s.klasse === 'fuss' ? 7 : 6.2;
    const farbe = strassenFarben[s.klasse] ?? strassenFarben.wohn;
    for (let i = 1; i < s.punkte.length; i++) {
      const a = s.punkte[i - 1], b = s.punkte[i];
      if (s.tunnel) continue;  // unterirdische Verkehrswege nicht an der Oberfläche einzeichnen
      linie(S, a, b, breite + (s.klasse === 'fuss' ? 0 : 3), .13, FARBEN.gehweg, .14);
      linie(S, a, b, breite, .23, farbe, .12);
    }
  }
}
function baueGleise(S, k, r) {
  let draehte = 0, schienen = 0, zuege = 0;
  const stationen = k.bahnsteige.filter(p => /Essen Hbf|Essen Hauptbahnhof/.test(p.name ?? '') && p.flaeche);
  for (const p of k.bahnsteige) {
    if (!p.flaeche || p.punkte.length < 3) continue;
    const b = rect(p.punkte);
    if (!b || b.w * b.d < 5) continue;
    polygon(S, p.punkte, '#c6c4bb', .68);
  }
  const kandidaten = [];
  for (const g of k.gleise) {
    if (g.tunnel || g.punkte.length < 2) continue;
    const art = g.art === 'fern' ? 'fern' : g.art === 'u' ? 'u' : 'tram';
    for (let i = 1; i < g.punkte.length; i++) {
      const a = g.punkte[i - 1], b = g.punkte[i];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < 1.8) continue;
      linie(S, a, b, art === 'fern' ? 3.4 : 2.5, .35, gleisFarbe[g.art] ?? '#85817c', .17);
      const nx = -dz / len * .72, nz = dx / len * .72;
      linie(S, [a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], .14, .48, '#cbd0d2', .2);
      linie(S, [a[0] - nx, a[1] - nz], [b[0] - nx, b[1] - nz], .14, .48, '#cbd0d2', .2);
      schienen++;
      // Keine Oberleitung bei diesellastigen oder nicht elektrifizierten Abschnitten.
      if (g.oberleitung) { linie(S, a, b, .075, 6.25, '#555a5c', .075); draehte++; }
      if (art === 'fern' && len >= 70 && stationen.length) {
        const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const naeheste = Math.min(...stationen.map(p => {
          const c = mitte(p.punkte); return Math.hypot(m[0] - c[0], m[1] - c[1]);
        }));
        if (naeheste < 85) kandidaten.push({ a, b, len, naeheste, gleis: g });
      }
      if (art === 'fern' && len > 35 && dicht(a[0], a[1], k.radius + 180, k.radius + 410, 430) && LOD.stufe !== 'fern') {
        const n = Math.floor(len / 11);
        for (let u = 0; u < n; u++) {
          const t = (u + .5) / n, x = a[0] + t * dx, z = a[1] + t * dz;
          S.box(2.75, .13, .32, x, .35, z, '#776c61', Math.atan2(-dz, dx) + Math.PI / 2);
        }
      }
    }
  }
  // Stationäre Züge stehen nur auf den aus der Karte verifizierten Bahnsteiggleisen.
  kandidaten.sort((a, b) => a.naeheste - b.naeheste || b.len - a.len);
  const belegt = new Set();
  for (const c of kandidaten) {
    if (zuege === 3) break;
    const m = mitte([c.a, c.b]);
    if ([...belegt].some(p => Math.hypot(p[0] - m[0], p[1] - m[1]) < 9)) continue;
    const wagen = Math.min(4, Math.floor((c.len - 12) / 26.5));
    if (wagen < 2) continue;
    belegt.add(m);
    const dx = (c.b[0] - c.a[0]) / c.len, dz = (c.b[1] - c.a[1]) / c.len;
    const start = (c.len - wagen * 26.5) / 2;
    for (let i = 0; i < wagen; i++) {
      const u = start + i * 26.5 + 13.25;
      const x = c.a[0] + dx * u, z = c.a[1] + dz * u, winkel = Math.atan2(-dz, dx);
      S.box(25.3, 3.8, 2.8, x, 2.7, z, '#e7e9e7', winkel);
      S.box(24, 1.05, 2.89, x, 3.25, z, '#567281', winkel);
      S.box(25.3, .22, 2.85, x, 4.72, z, '#b83f3b', winkel);
    }
    zuege++;
  }
  return { schienen, draehte, zuege };
}
function baueBebauung(S, plan, r) {
  const k = plan.karte;
  const slots = plan.parzellen.filter(p => p.standort || p.typ === 'slot:hq');
  let gezeichnet = 0;
  for (let i = 0; i < k.bebauung.length; i++) {
    const b = k.bebauung[i];
    if (b.parzelle) continue;
    const q = rect(b.umriss);
    if (!q || q.w < 2 || q.d < 2 || q.w * q.d < 21 || q.w * q.d > 45000) continue;
    const cx = q.x + q.w / 2, cz = q.z + q.d / 2, m = k.radius;
    if (slots.some(p => cx > p.x - 2 && cx < p.x + p.w + 2 && cz > p.z - 2 && cz < p.z + p.d + 2)) continue;
    const landmark = k.wahrzeichen.some(w => Math.hypot(w.pos[0] - cx, w.pos[1] - cz) < (w.id === 'essen-limbecker' ? 110 : 35));
    if (landmark) continue;
    const viertel = viertelEssen(cx - m, cz - m);
    const farben = farbHaus[viertel] ?? farbHaus.nachkrieg;
    const farbe = farben[Math.floor(r() * farben.length)];
    const hoehe = Math.max(4, Math.min(39, b.h ?? (viertel === 'kern' ? 19 : viertel === 'gewerbe' ? 9 : 12 + r() * 10)));
    S.quader(q.x, .25, q.z, q.x + q.w, hoehe, q.z + q.d, farbe);
    if (q.w > 5 && q.d > 5) S.quader(q.x + .6, hoehe, q.z + .6, q.x + q.w - .6, hoehe + .35, q.z + q.d - .6,
      viertel === 'zechensiedlung' ? '#7d6c61' : viertel === 'kern' ? '#727a80' : '#898c87');
    gezeichnet++;
  }
  return gezeichnet;
}
/** Zweiter, OSM-gestützter Grafikweg. Form des Ergebnisses wie baueStadt(). */
export function baueKartenStadt(S, scene, plan, bauer, o = {}) {
  const k = plan.karte, r = rng(plan.seed + 7141);
  const t0 = S.anzahl;
  baueFlaechen(S, k, r);
  baueStrassen(S, k);
  const gleise = baueGleise(S, k, r);
  const vorHaeusern = S.anzahl;
  const anzahlBebauung = baueBebauung(S, plan, r);
  wahrzeichenEssen(S, scene, k);
  const hoehen = new Map();
  let maxH = 110;
  if (!o.ohneHaeuser && bauer) for (const p of plan.parzellen) {
    if (p.typ === 'slot:bahnhof') continue; // Empfangsgebäude ist das OSM-Wahrzeichen
    const f = bauer[p.typ] ?? (p.typ.startsWith('slot:') ? bauer.slot : bauer.stadthaus);
    const e = f ? f(S, scene, p) ?? {} : {};
    const h = e.hoehe ?? 14;
    hoehen.set(p.id, h); maxH = Math.max(maxH, h);
  }
  return { box: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(plan.breite, maxH, plan.tiefe)),
    hoehen, teileStrasse: vorHaeusern - t0, teileHaeuser: S.anzahl - vorHaeusern,
    instanzen: 0, drawCallsInstanzen: 0, kartenStatistik: { ...gleise, bebauung: anzahlBebauung } };
}

// Pilot Kartenweg (25.10.2026): echter Stadtausschnitt aus Kartendaten statt Kit-Raster.
// Straßen: osm2streets (Apache-2.0) aus OpenStreetMap. Gleise, Flächen, Bäume: OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL).
// Gebäude: amtliches 3D-Gebäudemodell LoD2 NRW (Geobasis NRW, dl-de/zero-2-0) mit echten Dachflächen.
// Koordinaten wie render/karten/essen.json: x Ost, z Süd, Meter; y Höhe über Gelände (Stadt auf einer Ebene).
import { THREE, FARBEN, rng, waehle, baum, heller } from '../basis.js';

const BLICK = new THREE.Vector3(Math.SQRT1_2 * Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), Math.SQRT1_2 * Math.cos(Math.PI / 6));
const BODEN = {
  gehweg: FARBEN.gehweg, platz: '#cbc4b7', fahrbahn: '#7b8188', rad: '#a98a7c', markierung: FARBEN.markierung,
  gruen: FARBEN.rasen, wasser: FARBEN.wasser, parkplatz: '#9ba1a7', bahnsteig: '#cfc9bd', schotter: '#a39b8e', schiene: '#5b5550',
};
const HOEHE = { wasser: -0.15, gruen: 0.04, platz: 0.03, parkplatz: 0.05, fahrbahn: 0.07, rad: 0.08, markierung: 0.1, bahnsteig: 0.55, schotter: 0.12 };

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const bboxVon = (pts) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };
const imBild = (pts, f) => { const [a, b, c, d] = bboxVon(pts); return c >= f[0] && a <= f[2] && d >= f[1] && b <= f[3]; };

function imPolygon(x, z, ring) {
  let drin = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) drin = !drin;
  }
  return drin;
}

/** Ebene Bodenfläche (Polygon in x/z) auf Höhe y, Normale nach oben. */
function bodenFlaeche(S, umriss, y, farbe) {
  const pts = umriss.length > 1 && umriss[0][0] === umriss.at(-1)[0] && umriss[0][1] === umriss.at(-1)[1] ? umriss.slice(0, -1) : umriss;
  if (pts.length < 3) return;
  const v2 = pts.map((p) => new THREE.Vector2(p[0], p[1]));
  const tri = THREE.ShapeUtils.triangulateShape(v2, []);
  if (!tri.length) return;
  const P = new Float32Array(tri.length * 9), N = new Float32Array(tri.length * 9);
  let o = 0;
  for (const [a, b, c] of tri) {
    // Umlauf so, dass die Normale nach oben zeigt
    const [A, B, C] = [pts[a], pts[b], pts[c]];
    const ny = (B[1] - A[1]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[1] - A[1]);
    const reihe = ny >= 0 ? [A, B, C] : [A, C, B];
    for (const q of reihe) { P[o] = q[0]; P[o + 1] = y; P[o + 2] = q[1]; N[o + 1] = 1; o += 3; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  S.add(g, farbe);
}

/** Ebenes 3D-Polygon (LoD2-Fläche) triangulieren, Normale nach außen (zum Bezugspunkt weg) bzw. Dach nach oben. */
function raumFlaeche(S, ring, farbe, innen, dach) {
  let pts = ring;
  if (pts.length > 1 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1] && pts[0][2] === pts.at(-1)[2]) pts = pts.slice(0, -1);
  if (pts.length < 3) return null;
  // Newell-Normale (Punkte: [x, z, y])
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const ax = a[0], ay = a[2], az = a[1], bx = b[0], by = b[2], bz = b[1];
    nx += (ay - by) * (az + bz); ny += (az - bz) * (ax + bx); nz += (ax - bx) * (ay + by);
  }
  const l = Math.hypot(nx, ny, nz); if (l < 1e-6) return null;
  nx /= l; ny /= l; nz /= l;
  const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
  const proj = ay >= ax && ay >= az ? (p) => new THREE.Vector2(p[0], p[1]) : ax >= az ? (p) => new THREE.Vector2(p[1], p[2]) : (p) => new THREE.Vector2(p[0], p[2]);
  const tri = THREE.ShapeUtils.triangulateShape(pts.map(proj), []);
  if (!tri.length) return null;
  // Ausrichtung festlegen
  let cx = 0, cy = 0, cz = 0; for (const p of pts) { cx += p[0]; cy += p[2]; cz += p[1]; } cx /= pts.length; cy /= pts.length; cz /= pts.length;
  let flip = false;
  if (dach) flip = ny < 0;
  else if (innen) flip = nx * (cx - innen[0]) + nz * (cz - innen[1]) < 0;
  if (flip) { nx = -nx; ny = -ny; nz = -nz; }
  const P = new Float32Array(tri.length * 9), N = new Float32Array(tri.length * 9);
  let o = 0;
  for (const t of tri) {
    const q = t.map((i) => pts[i]);
    // Umlauf an die gewünschte Normale anpassen
    const ux = q[1][0] - q[0][0], uy = q[1][2] - q[0][2], uz = q[1][1] - q[0][1];
    const vx = q[2][0] - q[0][0], vy = q[2][2] - q[0][2], vz = q[2][1] - q[0][1];
    const tx = uy * vz - uz * vy, ty = uz * vx - ux * vz, tz = ux * vy - uy * vx;
    const reihe = tx * nx + ty * ny + tz * nz >= 0 ? q : [q[0], q[2], q[1]];
    for (const p of reihe) { P[o] = p[0]; P[o + 1] = p[2]; P[o + 2] = p[1]; N[o] = nx; N[o + 1] = ny; N[o + 2] = nz; o += 3; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  S.add(g, farbe);
  return { n: [nx, ny, nz], c: [cx, cy, cz] };
}

/** Gebäudeart aus der ALKIS-Funktion (LoD2 NRW). */
export function gebaeudeArt(fkt = '') {
  if (fkt.startsWith('51009_')) return 'dach';          // Überdachung, Bahnsteigdach, Carport
  if (fkt.startsWith('53001_')) return 'bruecke';
  if (fkt.startsWith('51002_') || fkt.startsWith('51001_')) return 'bauwerk';
  const k = fkt.split('_')[1] ?? '';
  if (k === '2460' || k === '2461' || k === '2462') return 'parkhaus';
  if (k === '3040' || k === '3041' || k === '3042' || k === '3043') return 'kirche';
  if (k.startsWith('10') || k === '1010' || k === '1000') return 'wohnen';
  if (k.startsWith('11') || k.startsWith('12')) return 'gemischt';
  if (k.startsWith('2')) return 'gewerbe';
  if (k.startsWith('3')) return 'oeffentlich';
  return 'gewerbe';
}

/** Fassadenfarbe und Dachfarbe je Gebäude (Westen: gedämpft, Backstein und Ziegel selten). */
function gestalt(g) {
  const r = rng(hash(g.id ?? String(g.boden[0][0])));
  const hoch = g.h > 32;
  const fassade = hoch ? waehle(r, FARBEN.fassadeKuehl) : r() < 0.14 ? waehle(r, FARBEN.backstein) : waehle(r, r() < 0.55 ? FARBEN.fassadeHell : r() < 0.6 ? FARBEN.fassadeWarm : FARBEN.fassadeKuehl);
  const flach = g.dach === '1000' || g.dach === '9999';
  const dach = flach ? waehle(r, ['#a9a59d', '#b3aea5', '#9fa19f']) : r() < 0.12 ? waehle(r, FARBEN.ziegel) : waehle(r, ['#6f767d', '#7c848c', '#68707a', '#8b939b']);
  const art = gebaeudeArt(g.fkt);
  return { r, fassade: art === 'kirche' ? waehle(r, ['#cdbfa6', '#bfb39c', '#a99c88']) : art === 'parkhaus' ? '#b7b5b0' : fassade, dach: art === 'kirche' ? waehle(r, ['#5d666e', '#6f9a7d']) : dach, hoch, flach, art };
}

/** Fenster auf einer sichtbaren Wand: Raster nach Geschossen, Erdgeschoss als Ladenzone im Kern. */
function fenster(S, ring, info, g, gs, kern) {
  if (Math.abs(info.n[1]) > 0.15) return 0;
  const sicht = info.n[0] * BLICK.x + info.n[2] * BLICK.z;
  if (sicht <= 0.05) return 0;
  // waagerechte Unterkante der Wand
  const unten = ring.filter((p) => p[2] < 0.6);
  if (unten.length < 2) return 0;
  let a = unten[0], b = unten[1], best = 0;
  for (let i = 0; i < unten.length; i++) for (let j = i + 1; j < unten.length; j++) { const d = Math.hypot(unten[i][0] - unten[j][0], unten[i][1] - unten[j][1]); if (d > best) { best = d; a = unten[i]; b = unten[j]; } }
  const L = best; if (L < 2.4) return 0;
  const oben = Math.min(Math.max(...ring.map((p) => p[2])), g.traufe > 2 ? g.traufe : g.h);
  if (oben < 3) return 0;
  const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
  const ry = Math.atan2(-uz, ux);
  const off = 0.06, nx = info.n[0], nz = info.n[2];
  const art = gs.art;
  if (art === 'bauwerk') return 0;
  if (art === 'parkhaus') {
    let t = 0;
    for (let y = 2.9; y < oben - 0.5; y += 2.9) { S.box(L - 0.8, 1.1, 0.12, (a[0] + b[0]) / 2 + nx * off, y - 1.0, (a[1] + b[1]) / 2 + nz * off, '#4a5157', ry); t++; }
    return t;
  }
  const eg = kern && g.h > 7 && (art === 'gewerbe' || art === 'gemischt') ? 4.2 : 0;
  const gh = art === 'kirche' ? 7 : gs.hoch ? 3.6 : 3.2;
  const geschosse = Math.floor((oben - eg - 0.8) / gh);
  const raster = art === 'kirche' ? 4.5 : gs.hoch ? 2.2 : 3.1, fw = art === 'kirche' ? 1.4 : gs.hoch ? 1.7 : 1.3, fh = art === 'kirche' ? 4.5 : gs.hoch ? 2.4 : 1.75;
  const n = Math.max(1, Math.floor((L - 0.8) / raster));
  const rand = (L - n * raster) / 2;
  const fFarbe = gs.hoch ? FARBEN.glas : FARBEN.fenster;
  let teile = 0;
  if (eg) {
    // Ladenzone: dunkles Schaufensterband mit hellem Gesims
    const mx = (a[0] + b[0]) / 2 + nx * off, mz = (a[1] + b[1]) / 2 + nz * off;
    S.box(L - 0.6, 3.0, 0.12, mx, 1.7, mz, FARBEN.laden, ry);
    S.box(L, 0.35, 0.3, mx + nx * 0.1, eg - 0.3, mz + nz * 0.1, heller(gs.fassade, 0.04), ry);
    teile += 2;
  }
  for (let k = 0; k < geschosse; k++) {
    const y = eg + k * gh + gh * 0.55;
    if (y + fh / 2 > oben - 0.4) break;
    for (let i = 0; i < n; i++) {
      const u = rand + raster * (i + 0.5);
      const x = a[0] + ux * u + nx * off, z = a[1] + uz * u + nz * off;
      S.box(fw, fh, 0.12, x, y, z, fFarbe, ry);
      teile++;
    }
  }
  return teile;
}

function gleis(S, punkte, art) {
  const breit = art === 'tram' ? 2.4 : 3.4, spur = 1.435;
  for (let i = 1; i < punkte.length; i++) {
    const [ax, az] = punkte[i - 1], [bx, bz] = punkte[i];
    const L = Math.hypot(bx - ax, bz - az); if (L < 0.3) continue;
    const ry = Math.atan2(-(bz - az), bx - ax), mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const qx = -(bz - az) / L, qz = (bx - ax) / L;
    if (art !== 'tram') S.box(L + 0.4, 0.24, breit, mx, HOEHE.schotter, mz, BODEN.schotter, ry);
    for (const s of [-1, 1]) S.box(L + 0.05, 0.16, 0.14, mx + qx * s * spur / 2, art === 'tram' ? 0.12 : 0.3, mz + qz * s * spur / 2, BODEN.schiene, ry);
  }
}

/**
 * Baut den Kartenausschnitt (nur Teile im Fenster f = [x0, z0, x1, z1]) in den Sammler.
 * Rückgabe: Zähler je Bauteil.
 */
export function baueKartenPilot(S, scene, daten, f, o = {}) {
  const z = { boden: 0, gebaeude: 0, fenster: 0, baeume: 0, gleise: 0 };
  const kern = o.kern ?? ((x, zz) => Math.hypot(x - 85, zz - 90) < 520);
  bodenFlaeche(S, [[f[0], f[1]], [f[2], f[1]], [f[2], f[3]], [f[0], f[3]]], 0, BODEN.gehweg);
  for (const fl of daten.flaechen) {
    if (!imBild(fl.umriss, f)) continue;
    const art = fl.art === 'bahngelaende' ? 'schotter' : fl.art;
    if (art === 'bahnsteig') continue;
    bodenFlaeche(S, fl.umriss, HOEHE[art] ?? 0.03, BODEN[art] ?? BODEN.platz); z.boden++;
  }
  const st = daten.strassen;
  for (const p of st.fahrbahn) if (imBild(p, f)) { bodenFlaeche(S, p, HOEHE.fahrbahn, BODEN.fahrbahn); z.boden++; }
  for (const p of st.rad) if (imBild(p, f)) { bodenFlaeche(S, p, HOEHE.rad, BODEN.rad); z.boden++; }
  for (const p of st.markierung) if (imBild(p, f)) { bodenFlaeche(S, p, HOEHE.markierung, BODEN.markierung); z.boden++; }
  for (const p of st.mittellinie) if (imBild(p, f)) { bodenFlaeche(S, p, HOEHE.markierung, BODEN.markierung); z.boden++; }
  for (const g of daten.gleise) if (imBild(g.punkte, f)) { gleis(S, g.punkte, g.art); z.gleise++; }
  // Bahnsteige als Platte
  for (const fl of daten.flaechen) {
    if (fl.art !== 'bahnsteig' || !imBild(fl.umriss, f)) continue;
    bodenFlaeche(S, fl.umriss, HOEHE.bahnsteig, BODEN.bahnsteig);
  }
  const r = rng(77);
  // Grünflächen bekommen Bäume (rund einer je 260 m², Raster mit Versatz), Parks wirken sonst leer
  for (const fl of daten.flaechen) {
    if (fl.art !== 'gruen' || !imBild(fl.umriss, f)) continue;
    const [a, b, c, d] = bboxVon(fl.umriss);
    const v2 = fl.umriss.map((p) => new THREE.Vector2(p[0], p[1]));
    const rr = rng(hash(String(a) + ',' + String(b)));
    for (let x = a + 8; x < c - 4; x += 16) for (let zz = b + 8; zz < d - 4; zz += 16) {
      const px = x + (rr() - 0.5) * 9, pz = zz + (rr() - 0.5) * 9;
      if (px < f[0] || px > f[2] || pz < f[1] || pz > f[3] || (o.drin && !o.drin(px, pz))) continue;
      if (rr() < 0.75 && imPolygon(px, pz, fl.umriss)) { baum(S, px, pz, rr, 1.1 + rr() * 0.4); z.baeume++; }
    }
  }
  for (const [x, zz] of daten.baeume) if (x > f[0] && x < f[2] && zz > f[1] && zz < f[3]) { baum(S, x, zz, r, 1.15); z.baeume++; }
  for (const g of daten.gebaeude) {
    if (!imBild(g.boden[0], f)) continue;
    if (o.drin) { const [a0, b0, c0, d0] = bboxVon(g.boden[0]); if (!o.drin((a0 + c0) / 2, (b0 + d0) / 2, Math.max(c0 - a0, d0 - b0) / 2 + g.h)) continue; }
    const gs = gestalt(g);
    const [a, b, c, d] = bboxVon(g.boden[0]);
    const innen = [(a + c) / 2, (b + d) / 2];
    const istKern = kern(innen[0], innen[1]);
    if (gs.art === 'dach' || gs.art === 'bruecke') {
      // Dachplatte auf Stützen (Bahnsteigdach, Vordach) bzw. Brückendeck ohne Wände
      const farbe = gs.art === 'bruecke' ? '#8a8f94' : '#a7adb2';
      for (const dr of g.dachf) {
        raumFlaeche(S, dr, farbe, null, true);
      }
      if (gs.art === 'dach' && g.dachf.length) {
        const ring = g.boden[0];
        const lang = Math.hypot(c - a, d - b);
        const schritt = Math.max(12, lang / 8);
        let weg = 0;
        for (let i = 1; i < ring.length; i++) {
          const [px, pz] = ring[i - 1], [qx, qz] = ring[i]; const l = Math.hypot(qx - px, qz - pz);
          for (let t = (schritt - weg) % schritt; t < l; t += schritt) { const u = t / l; S.box(0.35, g.traufe || g.h, 0.35, px + (qx - px) * u, (g.traufe || g.h) / 2, pz + (qz - pz) * u, '#6b7278'); }
          weg = (weg + l) % schritt;
        }
      }
      z.gebaeude++;
      continue;
    }
    for (const w of g.waende) {
      const info = raumFlaeche(S, w, gs.fassade, innen, false);
      if (info && o.fenster !== false) z.fenster += fenster(S, w, info, g, gs, istKern);
    }
    for (const dr of g.dachf) raumFlaeche(S, dr, gs.dach, null, true);
    if (gs.flach && g.h > 6) {
      // Dachaufbauten: Technikaufbau und Lüfter auf großen Flachdächern (innerhalb des Grundrisses)
      const ring = g.boden[0], fl = (c - a) * (d - b);
      if (fl > 180) {
        const anz = Math.min(4, 1 + Math.floor(fl / 900));
        for (let k = 0; k < anz; k++) {
          const px = a + (c - a) * (0.25 + gs.r() * 0.5), pz = b + (d - b) * (0.25 + gs.r() * 0.5);
          if (!imPolygon(px, pz, ring)) continue;
          const w = 2.5 + gs.r() * 4, t = 2 + gs.r() * 3, hh = 1.4 + gs.r() * 1.6;
          S.box(w, hh, t, px, g.h + hh / 2, pz, k % 2 ? '#c9c6bf' : '#9da2a6');
        }
      }
    }
    z.gebaeude++;
  }
  return z;
}

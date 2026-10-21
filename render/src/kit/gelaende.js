// Gelände als glatte Fläche (Heightfield): Berge, Hänge, Weinberge. Ersetzt die früheren Stufenpyramiden
// (GESTALTUNG.md 2: in der Stadt alles auf einer Ebene, Berge nur als natürliche Hänge am Kartenrand).
//
//   bergHoehe(B, x, z) → Höhe in m aus dem Bergprofil plan.berge (stadtrand.js bergProfil), 0 außerhalb
//   gelaende(S, x0, z0, x1, z1, hoehe(x, z), farbe(x, y, z, steigung), o?) baut die Fläche aus Dreiecken, gruppiert nach
//     Farbe (ein Sammler-Teil je Farbe). o: { schritt = 6 (m), y0 = Sockel bis zu dieser Höhe hinab }
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { THREE } from './basis.js';

const glatt = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** Weiche Hügelkette (deterministisch): Summe einiger Sinuswellen, Werte etwa −1 … 1. */
function welle(seed, u) {
  const a = (seed % 97) * 0.13, b = (seed % 53) * 0.21;
  return 0.55 * Math.sin(u / 97 + a) + 0.3 * Math.sin(u / 41 + b) + 0.15 * Math.sin(u / 17 + a * 2);
}

/**
 * Höhe aus dem Bergprofil. B = { seed, R, seiten: { '-z' | '-x': { kante, front, H0, Hr } } }:
 * innen (Kulisse in der Karte) steigt der Hang von front (Höhe 0) bis 65 % der Strecke zur kante auf H0 und bleibt dort
 * eben (Plateau für Burg und Turm); außen (Stadtrandgürtel) steigt er weiter um Hr bis zum Gürtelrand, mit Kämmen.
 */
export function bergHoehe(B, x, z) {
  if (!B) return 0;
  let h = 0;
  for (const [s, P] of Object.entries(B.seiten)) {
    const q = s === '-z' ? z : x, u = s === '-z' ? x : z;   // q quer zur Kante (wächst zur Stadt), u entlang
    // seitlich der Kulisse (Gürtelecken) beginnt der Berg an der Kartenkante bei 0 und läuft weich aus
    const aus = Math.max(0, (P.u0 ?? -1e9) - u, u - (P.u1 ?? 1e9)), w = glatt(1 - aus / 80);
    const kante = P.kante * w, front = P.front * w, H0 = P.H0 * w;
    if (q >= front) continue;
    let y;
    if (q >= kante) {
      const t = front > kante ? (front - q) / (front - kante) : 1;
      y = H0 * glatt(t / 0.65);
    } else {
      const d = kante - q, f = glatt(Math.min(1, d / (B.R * 0.85)));
      y = H0 + P.Hr * f * (1 + 0.28 * welle(B.seed + (s === '-z' ? 0 : 7), u + d * 0.3)) + Math.min(1, d / 60) * P.Hr * 0.05 * welle(B.seed + 3, u * 2.3 - d);
    }
    h = Math.max(h, y);
  }
  // ebene Plateaus (Burg am Hang): innen genau y, am Rand 18 m weicher Übergang
  for (const Q of B.plateaus ?? []) {
    const e = wurzelSumme(Math.max(0, Q.x0 - x, x - Q.x1), Math.max(0, Q.z0 - z, z - Q.z1));
    if (e < 18) { const w = glatt(1 - e / 18); h = h * (1 - w) + Q.y * w; }
  }
  return h;
}

/** Glatte Geländefläche über [x0, x1] × [z0, z1]. */
export function gelaende(S, x0, z0, x1, z1, hoehe, farbe, o = {}) {
  const st = o.schritt ?? 6;
  const nx = Math.max(1, Math.ceil((x1 - x0) / st)), nz = Math.max(1, Math.ceil((z1 - z0) / st));
  const dx = (x1 - x0) / nx, dz = (z1 - z0) / nz;
  const H = [];
  for (let i = 0; i <= nx; i++) { H.push([]); for (let j = 0; j <= nz; j++) H[i].push(hoehe(x0 + i * dx, z0 + j * dz)); }
  // Weiche Normalen aus dem Höhenfeld (zentrale Differenzen je Gitterpunkt): keine sichtbaren Dreiecksfacetten
  const N = (i, j) => {
    const ia = Math.max(0, i - 1), ib = Math.min(nx, i + 1), ja = Math.max(0, j - 1), jb = Math.min(nz, j + 1);
    const gx = (H[ib][j] - H[ia][j]) / ((ib - ia) * dx), gz = (H[i][jb] - H[i][ja]) / ((jb - ja) * dz), L = wurzelSumme(gx, 1, gz);
    return [-gx / L, 1 / L, -gz / L];
  };
  const gruppen = new Map();
  const tri = (a, b, c) => {
    const yc = (a[1] + b[1] + c[1]) / 3;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nxx = uy * vz - uz * vy, nyy = uz * vx - ux * vz, nzz = ux * vy - uy * vx, L = wurzelSumme(nxx, nyy, nzz) || 1;
    const f = farbe((a[0] + b[0] + c[0]) / 3, yc, (a[2] + b[2] + c[2]) / 3, 1 - Math.abs(nyy) / L);
    if (!gruppen.has(f)) gruppen.set(f, { p: [], n: [] });
    const G = gruppen.get(f);
    for (const q of [a, b, c]) { G.p.push(q[0], q[1], q[2]); G.n.push(...N(q[3], q[4])); }
  };
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const p00 = [x0 + i * dx, H[i][j], z0 + j * dz, i, j], p10 = [x0 + (i + 1) * dx, H[i + 1][j], z0 + j * dz, i + 1, j];
    const p01 = [x0 + i * dx, H[i][j + 1], z0 + (j + 1) * dz, i, j + 1], p11 = [x0 + (i + 1) * dx, H[i + 1][j + 1], z0 + (j + 1) * dz, i + 1, j + 1];
    // Gegen den Uhrzeigersinn von oben (Normale nach +y)
    tri(p00, p01, p11); tri(p00, p11, p10);
  }
  for (const [f, G] of gruppen) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(G.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(G.n, 3));
    S.add(g, f);
  }
  return H;
}

/**
 * Rebzeilen am Hang als eigene, dem Hang folgende Bänder (keine eingefärbten Geländedreiecke, kein Aliasing):
 * schmale dunkelgrüne Reihen alle 3,6 m entlang der leicht gekrümmten Höhenlinien, Querwege alle 64 m, eine
 * Weinbergmauer alle 44 m. quer = true: Reihen laufen entlang z (Hang steigt in −x), sonst entlang x (Hang steigt in −z).
 * imWeinberg(x, y, z) entscheidet, wo Reben stehen.
 */
export function rebzeilen(S, x0, z0, x1, z1, hoehe, quer, imWeinberg, farben = {}) {
  const U0 = quer ? z0 : x0, U1 = quer ? z1 : x1, Q0 = quer ? x0 : z0, Q1 = quer ? x1 : z1;
  const welt = (u, q) => (quer ? [q, u] : [u, q]);
  const kr = (u) => 7 * Math.sin(u / 85);
  const reben = [], wege = [], mauern = [];
  const band = (ziel, u0, u1, q, breite, hoch, schritt = 6) => {
    for (let u = u0; u < u1 - 0.1; u += schritt) {
      const ua = u, ub = Math.min(u1, u + schritt);
      const qa = q + kr(ua), qb = q + kr(ub);
      const [ax, az] = welt(ua, qa), [bx, bz] = welt(ub, qb);
      const ya = hoehe(ax, az), yb = hoehe(bx, bz);
      if (!imWeinberg(ax, ya, az) || !imWeinberg(bx, yb, bz)) continue;
      const h2 = breite / 2;
      const p = (uu, qq, y) => { const [x, z] = welt(uu, qq); return [x, y, z]; };
      const A0 = p(ua, qa - h2, ya + hoch), A1 = p(ua, qa + h2, ya + hoch), B0 = p(ub, qb - h2, yb + hoch), B1 = p(ub, qb + h2, yb + hoch);
      const AF = p(ua, qa + h2, ya - 0.2), BF = p(ub, qb + h2, yb - 0.2);
      // Deckfläche und sichtbare Flanke (zur Kamera, +q)
      const quad = (a, b, c, d) => { ziel.push(...a, ...b, ...c, ...a, ...c, ...d); };
      if (quer) { quad(A0, B0, B1, A1); quad(A1, B1, BF, AF); } else { quad(A0, A1, B1, B0); quad(A1, AF, BF, B1); }
    }
  };
  for (let q = Q0 + 2; q < Q1 - 1; q += 3.6) band(reben, U0, U1, q, 1.1, 1.0);
  for (let q = Q0 + 20; q < Q1 - 10; q += 44) band(mauern, U0, U1, q, 0.9, 0.7);
  // Querwege: Bänder quer zu den Reihen (entlang q), flach auf dem Boden
  for (let u = U0 + 30; u < U1 - 10; u += 64) for (let q = Q0; q < Q1 - 0.1; q += 6) {
    const qa = q, qb = Math.min(Q1, q + 6);
    const [ax, az] = welt(u + kr(u) * 0, qa), [bx, bz] = welt(u, qb);
    const ya = hoehe(ax, az), yb = hoehe(bx, bz);
    if (!imWeinberg(ax, ya, az) || !imWeinberg(bx, yb, bz)) continue;
    const p = (uu, qq, y) => { const [x, z] = welt(uu, qq); return [x, y + 0.08, z]; };
    const a = p(u - 1.4, qa, ya), b = p(u + 1.4, qa, ya), c = p(u + 1.4, qb, yb), d = p(u - 1.4, qb, yb);
    if (quer) wege.push(...a, ...b, ...c, ...a, ...c, ...d); else wege.push(...a, ...c, ...b, ...a, ...d, ...c);
  }
  for (const [arr, f] of [[reben, farben.rebe ?? '#5b7a3c'], [mauern, farben.mauer ?? '#cfc6b2'], [wege, farben.weg ?? '#ddd2b6']]) {
    if (!arr.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    S.add(g, f);
  }
}

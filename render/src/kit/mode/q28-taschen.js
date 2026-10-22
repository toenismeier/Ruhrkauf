// Q28: Taschen in Dreiviertelansicht (Vorderseite links, Schmalseite rechts), Raum-Hilfe aus q28-raum.js.
// Maße (Breite × Höhe × Tiefe in cm, nach Konfektion):
//   Handtasche 32 × 24 × 14 (oben 0,86 der Bodenbreite, zwei Henkel, Fallhöhe 10), Crossbody 22 × 16 × 6 (Riemen 120),
//   Clutch 28 × 15 × 3, Shopper 40 × 36 × 16 (Henkel lang, Fallhöhe 24), Weekender 52 × 30 × 26 (Walze),
//   Reisetasche mit Rollen 60 × 34 × 32 (Teleskopgriff), Portemonnaie 19 × 10 × 2,5, Kartenetui 10 × 7 × 1,
//   Gürteltasche 26 × 13 × 7 (Bananenform), Kinderrucksack 24 × 30 × 11, Mini-Bag 17 × 13 × 7 (Kettenriemen).

import { materialDefs, hell, dunkel, mische } from './stoff.js';
import { kamera, netz, projiziere, koerper, polylinie, flaecheP, glatt3, bodenschatten } from './q28-raum.js';

const f = (n) => Math.round(n * 100) / 100;
const lerp = (a, b, t) => a + (b - a) * t;
const glatt01 = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const METALL = '#c9a24a', METALL_D = '#8f6f2a', SILBER = '#c9ced3';

// Abgerundetes Rechteck als Ring (x = Tiefe, y = Breite), n Punkte
function ring(a, b, r, z, n = 32, dx = 0) {
  const pts = [];
  r = Math.min(r, a * 0.98, b * 0.98);
  const ecken = [[b - r, a - r, 0], [-(b - r), a - r, 1], [-(b - r), -(a - r), 2], [b - r, -(a - r), 3]];
  const proE = n / 4;
  for (const [cx, cy, k] of ecken) for (let i = 0; i < proE; i++) {
    const w = (k * Math.PI) / 2 + (i / proE) * (Math.PI / 2);
    pts.push([dx + cx + r * Math.cos(w), cy + r * Math.sin(w), z]);
  }
  return pts;
}

// Kasten aus Ringen: profil(t) → { a, b, r, dx }, t 0 (Boden) … 1 (Oberkante)
function kasten(h, profil, stufen = 10, n = 32) {
  const ringe = [];
  for (let k = 0; k <= stufen; k++) { const t = k / stufen, q = profil(t); ringe.push(ring(q.a, q.b, q.r, (q.z ?? t) * h, n, q.dx ?? 0)); }
  return ringe;
}

function einpassen(punkte, box, kam = {}) {
  const probe = kamera({ ...kam, mass: 1, x0: 0, y0: 0 });
  const q = punkte.map(probe.P);
  const minX = Math.min(...q.map((v) => v[0])), maxX = Math.max(...q.map((v) => v[0]));
  const minY = Math.min(...q.map((v) => v[1])), maxY = Math.max(...q.map((v) => v[1]));
  const mass = Math.min(box.b / (maxX - minX), box.h / (maxY - minY));
  return kamera({ ...kam, mass, x0: box.x - ((minX + maxX) / 2) * mass, y0: box.y - ((minY + maxY) / 2) * mass });
}

// Henkel/Riemen als Röhre: dunkle Kante, Farbe, Glanzlinie, Steppung
function riemen(K, pts, S, w = 2.2, o = {}) {
  const g = [];
  g.push(polylinie(K, pts, dunkel(S.c, 0.45), w + 0.9));
  g.push(polylinie(K, pts, o.farbe ?? S.c, w));
  g.push(polylinie(K, pts, '#fff', w * 0.25, { op: S.glanz ? 0.35 : 0.18 }));
  if (o.naht !== false && w >= 1.6) g.push(polylinie(K, pts, hell(S.c, 0.4), 0.3, { dash: '0.7 0.6', op: 0.7 }));
  return g.join('');
}
function kette(K, pts, w = 1.2) {
  const q = pts.map(K.P);
  const d = 'M' + q.map((v) => `${f(v[0])} ${f(v[1])}`).join(' L');
  return `<path d="${d}" fill="none" stroke="${METALL_D}" stroke-width="${w + 0.6}" stroke-dasharray="1.6 0.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${METALL}" stroke-width="${w}" stroke-dasharray="1.2 0.8" stroke-linecap="round"/>`;
}
const bogen = (a, b, hoehe, n = 16, seit = 0) => {
  const r = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    r.push([lerp(a[0], b[0], t) + seit * Math.sin(t * Math.PI), lerp(a[1], b[1], t), lerp(a[2], b[2], t) + hoehe * Math.sin(t * Math.PI)]);
  }
  return r;
};
function metall(K, p3, w = 2.4, h = 1.6, farbe = METALL) {
  const [x, y] = K.P(p3);
  return `<rect x="${f(x - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="0.4" fill="${farbe}" stroke="${dunkel(farbe, 0.35)}" stroke-width="0.35"/><rect x="${f(x - w / 2 + 0.3)}" y="${f(y - h / 2 + 0.3)}" width="${f(w * 0.4)}" height="${f(h * 0.3)}" fill="#fff" opacity="0.5"/>`;
}
function reissv(K, pts, S) {
  return polylinie(K, pts, dunkel(S.c, 0.5), 1.1, { op: 0.9 }) + polylinie(K, pts, SILBER, 0.45, { dash: '0.4 0.4' });
}

// Fläche auf einer Kastenseite: Vorderseite (x = +b): u quer (−1 … 1), v hoch (0 … 1)
function vorne(ringe, u, v) {
  const k = Math.max(0, Math.min(ringe.length - 1, v * (ringe.length - 1)));
  const i0 = Math.floor(k), i1 = Math.min(ringe.length - 1, i0 + 1), t = k - i0;
  const auf = (r) => {
    // Punkt der Vorderseite: Ringpunkte mit größtem x, nach y sortiert
    const ys = r.map((p) => p[1]);
    const a = Math.max(...ys), b = Math.max(...r.map((p) => p[0]));
    return [b, u * a * 0.92, r[0][2]];
  };
  const A = auf(ringe[i0]), B = auf(ringe[i1]);
  return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];
}
function seite(ringe, w, v) {
  const k = Math.max(0, Math.min(ringe.length - 1, v * (ringe.length - 1)));
  const i0 = Math.floor(k), i1 = Math.min(ringe.length - 1, i0 + 1), t = k - i0;
  const auf = (r) => { const a = Math.max(...r.map((p) => p[1])), b = Math.max(...r.map((p) => p[0])); return [w * b * 0.9, a, r[0][2]]; };
  const A = auf(ringe[i0]), B = auf(ringe[i1]);
  return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];
}

function rumpf(K, S, ringe, o = {}) {
  const v = netz(ringe, { zu: true, innen: (i) => [0, 0, ringe[i][0][2]] });
  // Deckel oben (geschlossen)
  const top = ringe.at(-1);
  const g = [koerper(S, projiziere(K, v), { kw: o.kw ?? 1.1 })];
  if (o.deckel !== false) g.push(flaecheP(K, top, hell(S.c, 0.1), { stroke: dunkel(S.c, 0.4), w: 0.5 }));
  return g.join('');
}

const TASCHEN = {
  handtasche(S, t, p) {
    const h = 0.75, ringe = kasten(h, (u) => ({ a: lerp(0.5, 0.43, u), b: lerp(0.22, 0.16, u), r: 0.07, z: u }), 10);
    const pts = [...ringe.flat(), [0, 0, h + 0.42]];
    const K = einpassen(pts, { x: 50, y: 50, b: 80, h: 80 }, { az: 30, el: 18 });
    const g = [bodenschatten(...K.P([0, 0, 0]), 38, 3.4)];
    // hinterer Henkel
    const hk = (x) => bogen([x, -0.25, h], [x, 0.25, h], 0.38, 18);
    g.push(riemen(K, hk(-0.08), S, 2.4));
    g.push(rumpf(K, S, ringe));
    // Reißverschluss oben
    g.push(reissv(K, [[0, -0.4, h + 0.001], [0, 0.4, h + 0.001]], S));
    // Kanten-Paspel unten und an der Seite
    g.push(polylinie(K, ringe[0].slice(0, 17), dunkel(S.c, 0.3), 0.6, { op: 0.6 }));
    g.push(polylinie(K, ringe.map((r) => r[0]), hell(S.c, 0.3), 0.35, { dash: '0.7 0.6', op: 0.8 }));
    // Vortasche mit Klappe und Drehverschluss
    const kl = [vorne(ringe, -0.82, 1), vorne(ringe, 0.82, 1), vorne(ringe, 0.82, 0.55), vorne(ringe, 0, 0.42), vorne(ringe, -0.82, 0.55)].map(([x, y, z]) => [x + 0.008, y, z]);
    g.push(flaecheP(K, glatt3([kl[0], kl[1], kl[2], kl[3], kl[4], kl[0]], 1), dunkel(S.c, 0.08), { stroke: dunkel(S.c, 0.45), w: 0.6 }));
    g.push(polylinie(K, [kl[4], kl[3], kl[2]].map(([x, y, z]) => [x, y * 0.95, z + 0.03]), hell(S.c, 0.35), 0.35, { dash: '0.7 0.6' }));
    g.push(metall(K, vorne(ringe, 0, 0.5).map((v, i) => (i === 0 ? v + 0.01 : v)), 3.2, 2.2));
    // vorderer Henkel
    g.push(riemen(K, hk(0.08), S, 2.4));
    for (const y of [-0.25, 0.25]) for (const x of [-0.08, 0.08]) g.push(metall(K, [x, y, h + 0.02], 1.6, 1.2));
    // Füße
    for (const [x, y] of [[0.15, -0.38], [0.15, 0.38]]) { const [a, b] = K.P([x, y, 0]); g.push(`<ellipse cx="${f(a)}" cy="${f(b + 0.6)}" rx="1.1" ry="0.6" fill="${METALL_D}"/>`); }
    t.push(...g);
  },
  crossbody(S, t, p) {
    // kompakte Umhängetasche: Fronttasche mit Reißverschluss, langer schmaler Gurt mit Schieber
    const h = 0.62, ringe = kasten(h, (u) => ({ a: 0.46, b: 0.15, r: 0.1, z: u }), 6);
    const oben = h + 1.9;
    const K = einpassen([...ringe.flat(), [0, 0, oben]], { x: 50, y: 50, b: 74, h: 86 }, { az: 30, el: 16 });
    const g = [bodenschatten(...K.P([0, 0, 0]), 28, 3)];
    const gurt = glatt3([[0, -0.47, h - 0.1], [-0.02, -0.5, h + 0.9], [-0.04, -0.3, oben], [-0.04, 0.3, oben], [-0.02, 0.5, h + 0.9], [0, 0.47, h - 0.1]], 3);
    const SG = materialDefs(p.gurt ?? dunkel(S.c, 0.1), 'polyester', S.defs);
    g.push(riemen(K, gurt, SG, 1.2, { naht: false }));
    g.push(rumpf(K, S, ringe));
    // Ösen an den Seiten
    for (const y of [-0.47, 0.47]) g.push(metall(K, [0, y, h - 0.08], 1.4, 2.4, SILBER));
    // Schieber am Gurt
    const sch = gurt[Math.round(gurt.length * 0.72)];
    g.push(metall(K, sch, 2.6, 1.6, SILBER));
    // Hauptreißverschluss oben, Fronttasche mit Reißverschluss
    g.push(reissv(K, [[0, -0.36, h + 0.002], [0, 0.36, h + 0.002]], S));
    const ft = [vorne(ringe, -0.8, 0.78), vorne(ringe, 0.8, 0.78), vorne(ringe, 0.8, 0.12), vorne(ringe, -0.8, 0.12)].map(([x, y, z]) => [x + 0.012, y, z]);
    g.push(flaecheP(K, glatt3([...ft, ft[0]], 1), dunkel(S.c, 0.06), { stroke: dunkel(S.c, 0.45), w: 0.5 }));
    g.push(reissv(K, [ft[0], ft[1]].map(([x, y, z]) => [x + 0.002, y * 0.9, z - 0.06]), S));
    g.push(metall(K, [ft[1][0] + 0.004, ft[1][1] * 0.8, ft[1][2] - 0.1], 1.2, 2.6, SILBER));
    t.push(...g);
  },
  clutch(S, t, p) {
    const h = 0.52, ringe = kasten(h, (u) => ({ a: 0.5, b: lerp(0.05, 0.035, u), r: 0.03, z: u }), 6);
    const K = einpassen(ringe.flat(), { x: 50, y: 52, b: 86, h: 60 }, { az: 26, el: 20 });
    const g = [bodenschatten(...K.P([0, 0, 0]), 40, 3)];
    g.push(rumpf(K, S, ringe));
    // Umschlag mit Spitze (Kuvertform)
    const kl = [vorne(ringe, -1, 1), vorne(ringe, 1, 1), vorne(ringe, 1, 0.62), vorne(ringe, 0, 0.3), vorne(ringe, -1, 0.62)].map(([x, y, z]) => [x + 0.008, y * 1.05, z]);
    g.push(flaecheP(K, kl, hell(S.c, 0.05), { stroke: dunkel(S.c, 0.45), w: 0.6 }));
    g.push(polylinie(K, [kl[4], kl[3], kl[2]].map(([x, y, z]) => [x + 0.004, y * 0.93, z + 0.04]), hell(S.c, 0.4), 0.35, { dash: '0.7 0.6' }));
    g.push(metall(K, vorne(ringe, 0, 0.36).map((v, i) => (i === 0 ? v + 0.012 : v)), 3.6, 2.2));
    t.push(...g);
  },
  shopper(S, t, p) {
    const h = 0.9, ringe = kasten(h, (u) => ({ a: lerp(0.44, 0.52, u), b: lerp(0.16, 0.12, u), r: 0.05, z: u }), 10);
    const K = einpassen([...ringe.flat(), [0, 0, h + 0.62]], { x: 50, y: 50, b: 76, h: 84 }, { az: 30, el: 18 });
    const g = [bodenschatten(...K.P([0, 0, 0]), 34, 3.2)];
    // Innenraum (offen oben)
    const top = ringe.at(-1);
    g.push(riemen(K, bogen([-0.12, -0.24, h - 0.02], [-0.12, 0.24, h - 0.02], 0.6, 18), S, 2));
    g.push(rumpf(K, S, ringe, { deckel: false }));
    g.push(flaecheP(K, top, dunkel(S.c, 0.45)));
    g.push(flaecheP(K, top.map(([x, y, z]) => [x * 0.9 - 0.01, y * 0.96, z - 0.06]).slice(8, 24), dunkel(S.c, 0.25), { op: 0.7 }));
    g.push(polylinie(K, top, dunkel(S.c, 0.3), 0.8, { zu: true }));
    g.push(polylinie(K, top.map(([x, y, z]) => [x, y, z - 0.05]).slice(0, 9).concat(top.slice(25).map(([x, y, z]) => [x, y, z - 0.05])), hell(S.c, 0.35), 0.35, { dash: '0.7 0.6' }));
    // Seitenfalte
    g.push(polylinie(K, [seite(ringe, 0, 1), seite(ringe, 0, 0.12)], dunkel(S.c, 0.3), 0.7, { op: 0.6 }));
    g.push(riemen(K, bogen([0.12, -0.24, h - 0.02], [0.12, 0.24, h - 0.02], 0.6, 18), S, 2));
    for (const y of [-0.24, 0.24]) g.push(flaecheP(K, [[0.13, y - 0.035, h - 0.12], [0.13, y + 0.035, h - 0.12], [0.13, y + 0.035, h + 0.005], [0.13, y - 0.035, h + 0.005]], dunkel(S.c, 0.15), { stroke: dunkel(S.c, 0.45), w: 0.4 }));
    t.push(...g);
  },
  weekender(S, t, p) {
    // Walze: Querschnitte entlang der Länge (y), Boden flach
    const L = 1, rq = 0.27, ringe = [];
    for (let k = 0; k <= 12; k++) {
      const y = -L / 2 + (L * k) / 12, e = 1 - 0.1 * Math.pow((2 * k) / 12 - 1, 4);
      const r = [];
      for (let j = 0; j < 28; j++) { const w = (j / 28) * Math.PI * 2; const x = Math.cos(w) * rq * e, z = Math.max(0, Math.sin(w) * rq * e * 1.08 + rq * 0.86); r.push([x, y, z]); }
      ringe.push(r);
    }
    const K = einpassen([...ringe.flat(), [0, 0, 0.95]], { x: 50, y: 52, b: 86, h: 78 }, { az: 34, el: 20 });
    const g = [bodenschatten(...K.P([0, 0, 0]), 40, 3.4)];
    g.push(riemen(K, bogen([-0.06, -0.16, 0.58], [-0.06, 0.16, 0.58], 0.3, 14), S, 2.2, { farbe: p.besatz ?? '#6a4630' }));
    g.push(koerper(S, projiziere(K, netz(ringe, { zu: true, innen: (i) => [0, ringe[i][0][1], 0.25] }))));
    // Stirnseiten (Ende rechts sichtbar) mit Lederbesatz
    const ende = ringe.at(-1);
    const SB = materialDefs(p.besatz ?? '#6a4630', 'leder', S.defs);
    g.push(flaecheP(K, ende, dunkel(S.c, 0.08), { stroke: dunkel(S.c, 0.45), w: 0.6 }));
    g.push(flaecheP(K, ende.map(([x, y, z]) => [x * 0.55, y + 0.002, (z - 0.25) * 0.55 + 0.25]), SB.c, { stroke: dunkel(SB.c, 0.4), w: 0.5 }));
    // Bodenstreifen und Ecken aus Leder
    g.push(polylinie(K, ringe.map((r) => r[21]), SB.c, 2.2));
    // Reißverschluss über den Scheitel
    g.push(reissv(K, ringe.map((r) => r[7]).slice(1, -1), S));
    const zz = ringe[3][7]; g.push(metall(K, zz, 1.6, 2.8, SILBER));
    // Lederriemen um den Körper
    for (const k of [3, 9]) { const v = ringe[k].slice(22, 28).concat(ringe[k].slice(0, 8)); g.push(polylinie(K, v, dunkel(SB.c, 0.3), 2.6), polylinie(K, v, SB.c, 1.9)); }
    g.push(riemen(K, bogen([0.06, -0.16, 0.58], [0.06, 0.16, 0.58], 0.3, 14), S, 2.2, { farbe: SB.c }));
    t.push(...g);
  },
  reisetasche(S, t, p) {
    // Rollenreisetasche: weicher Kasten, Teleskopgriff hinten, zwei Rollen, Tragegriff oben
    const h = 0.6, ringe = kasten(h, (u) => ({ a: 0.6, b: lerp(0.28, 0.24, u), r: lerp(0.06, 0.14, u), z: u }), 10, 36);
    const K = einpassen([...ringe.flat(), [-0.28, 0.5, h + 0.55]], { x: 50, y: 52, b: 84, h: 80 }, { az: 32, el: 20 });
    const g = [bodenschatten(...K.P([0, 0, 0]), 40, 3.4)];
    // Teleskopgriff (hinten rechts)
    for (const x of [-0.27, -0.27]) for (const y of [0.42, 0.56]) g.push(polylinie(K, [[x, y, h - 0.05], [x, y, h + 0.48]], '#5c6066', 1.4), polylinie(K, [[x, y, h - 0.05], [x, y, h + 0.48]], '#a9aeb4', 0.6));
    g.push(polylinie(K, [[-0.27, 0.4, h + 0.5], [-0.27, 0.58, h + 0.5]], '#2a2c30', 2.6));
    g.push(rumpf(K, S, ringe));
    // Rollen unter der rechten Seite
    for (const x of [-0.18, 0.18]) { const [a, b] = K.P([x, 0.56, 0]); g.push(`<circle cx="${f(a)}" cy="${f(b)}" r="2.6" fill="#2a2c30"/><circle cx="${f(a)}" cy="${f(b)}" r="1" fill="#7f858c"/>`); }
    // Reißverschluss rundum (Deckelnaht) und Fronttasche
    g.push(reissv(K, ringe[8].slice(0, 19), S));
    const ft = [vorne(ringe, -0.8, 0.72), vorne(ringe, 0.8, 0.72), vorne(ringe, 0.8, 0.14), vorne(ringe, -0.8, 0.14)].map(([x, y, z]) => [x + 0.02, y, z]);
    g.push(flaecheP(K, glatt3([...ft, ft[0]], 1), dunkel(S.c, 0.06), { stroke: dunkel(S.c, 0.45), w: 0.6 }));
    g.push(reissv(K, [ft[0], ft[1]].map(([x, y, z]) => [x, y * 0.9, z - 0.06]), S));
    // Tragegriff oben
    g.push(riemen(K, bogen([0, -0.16, h], [0, 0.16, h], 0.08, 10), materialDefs('#2a2c30', 'polyester', S.defs), 2.2, { naht: false }));
    // Kantenschutz unten
    g.push(polylinie(K, ringe[0].slice(0, 19), dunkel(S.c, 0.5), 1.4));
    t.push(...g);
  },
  portemonnaie(S, t, p) {
    // Geldbörse zum Klappen: Lasche mit Druckknopf, Geldschein schaut oben heraus, Münzfach gewölbt
    const h = 0.62, ringe = kasten(h, (u) => ({ a: 0.5, b: 0.09 * (1 - 0.3 * u), r: 0.06, z: u }), 6);
    const K = einpassen([...ringe.flat(), [0, -0.1, h + 0.22]], { x: 50, y: 54, b: 80, h: 70 }, { az: 24, el: 24 });
    const g = [bodenschatten(...K.P([0, 0, 0]), 36, 3)];
    // Geldschein (neutral, ohne echte Währung)
    const schein = [[0.0, -0.42, h - 0.1], [0.0, 0.3, h - 0.1], [0.0, 0.3, h + 0.2], [0.0, -0.42, h + 0.2]];
    g.push(flaecheP(K, schein, '#b9d3b0', { stroke: '#7d9a73', w: 0.4 }));
    g.push(polylinie(K, [[0.001, -0.36, h + 0.05], [0.001, 0.24, h + 0.05]], '#7d9a73', 0.5), polylinie(K, [[0.001, 0.1, h + 0.13], [0.001, 0.2, h + 0.13]], '#7d9a73', 1.4));
    g.push(rumpf(K, S, ringe));
    // Lasche über die Front mit Druckknopf
    const la = [];
    for (let i = 0; i <= 12; i++) { const u = 0.3 + 0.62 * i / 12; la.push(vorne(ringe, u, 1)); }
    for (let i = 12; i >= 0; i--) { const u = 0.3 + 0.62 * i / 12; la.push(vorne(ringe, u, 0.42 + 0.06 * Math.sin((i / 12) * Math.PI))); }
    g.push(flaecheP(K, la.map(([x, y, z]) => [x + 0.015, y, z]), S.c, { stroke: dunkel(S.c, 0.5), w: 0.6 }));
    g.push(flaecheP(K, la.map(([x, y, z]) => [x + 0.015, y, z]), '#fff', { op: 0.06 }));
    g.push(polylinie(K, la.slice(13).map(([x, y, z]) => [x + 0.016, y * 0.97, z + 0.035]), hell(S.c, 0.4), 0.35, { dash: '0.7 0.6' }));
    const [kx, ky] = K.P(vorne(ringe, 0.62, 0.55).map((v, i) => (i === 0 ? v + 0.02 : v)));
    g.push(`<circle cx="${f(kx)}" cy="${f(ky)}" r="2.2" fill="${METALL}" stroke="${METALL_D}" stroke-width="0.5"/><circle cx="${f(kx - 0.6)}" cy="${f(ky - 0.6)}" r="0.7" fill="#fff" opacity="0.6"/>`);
    // Rahmennaht auf der Front und Kante
    g.push(polylinie(K, [vorne(ringe, -0.9, 0.9), vorne(ringe, 0.26, 0.9), vorne(ringe, 0.26, 0.1), vorne(ringe, -0.9, 0.1)].map(([x, y, z]) => [x + 0.004, y, z]), hell(S.c, 0.35), 0.35, { zu: true, dash: '0.7 0.6' }));
    t.push(...g);
  },
  kartenetui(S, t, p) {
    // flaches Etui kaum größer als eine Karte (10 × 7 zu Karte 8,6 × 5,4): zwei Karten ragen oben heraus, Daumenausschnitt
    const h = 0.6, ringe = kasten(h, (u) => ({ a: 0.5, b: 0.022, r: 0.05, z: u }), 4);
    const K = einpassen([...ringe.flat(), [0, -0.4, h + 0.5]], { x: 50, y: 54, b: 70, h: 82 }, { az: 16, el: 18 });
    const g = [bodenschatten(...K.P([0, 0, 0]), 30, 2.6)];
    const karte = (dy, dz, w, farbe, chip) => {
      const c = Math.cos((w * Math.PI) / 180), sn = Math.sin((w * Math.PI) / 180);
      const P = (u, v) => [0.0, dy + u * c - v * sn, h - 0.32 + dz + u * sn + v * c];
      const pts = [P(-0.43, 0), P(0.43, 0), P(0.43, 0.54), P(-0.43, 0.54)];
      let svg = flaecheP(K, pts, farbe, { stroke: dunkel(farbe, 0.4), w: 0.45 });
      svg += polylinie(K, [P(-0.43, 0.42), P(0.43, 0.42)], dunkel(farbe, 0.25), 1.4, { op: 0.6 });
      if (chip) svg += flaecheP(K, [P(-0.32, 0.2), P(-0.18, 0.2), P(-0.18, 0.31), P(-0.32, 0.31)], '#d9b65a', { stroke: '#9c7d2e', w: 0.3 });
      return svg;
    };
    g.push(karte(-0.06, 0.26, -8, '#3f6fa8', true), karte(0.08, 0.14, 6, '#c8372f', true));
    g.push(rumpf(K, S, ringe));
    // Daumenausschnitt oben Mitte und Steppung rundum
    const [a, b] = K.P(vorne(ringe, 0, 1));
    g.push(`<path d="M${f(a - 6)} ${f(b)} q6 6.4 12 0 Z" fill="#3f6fa8" stroke="${dunkel(S.c, 0.5)}" stroke-width="0.5"/>`);
    g.push(polylinie(K, [vorne(ringe, -0.94, 0.94), vorne(ringe, 0.94, 0.94), vorne(ringe, 0.94, 0.06), vorne(ringe, -0.94, 0.06)].map(([x, y, z]) => [x + 0.004, y, z]), hell(S.c, 0.4), 0.35, { zu: true, dash: '0.7 0.6' }));
    // Kartenfach vorn (eine Kante)
    g.push(polylinie(K, [vorne(ringe, -0.96, 0.46), vorne(ringe, 0.96, 0.46)].map(([x, y, z]) => [x + 0.005, y, z]), dunkel(S.c, 0.45), 0.8));
    g.push(flaecheP(K, [vorne(ringe, -0.7, 0.46), vorne(ringe, 0.7, 0.46), vorne(ringe, 0.7, 0.52), vorne(ringe, -0.7, 0.52)].map(([x, y, z]) => [x + 0.004, y, z]), '#e9dcc0', { stroke: '#b9ab8f', w: 0.3 }));
    t.push(...g);
  },
  guerteltasche(S, t, p) {
    // Bananenform: Ringe entlang der Breite, Querschnitt oval, Enden hochgezogen; Gurt seitlich an den Enden
    const ringe = [], halb = 0.62;
    for (let k = 0; k <= 16; k++) {
      const u = -1 + (2 * k) / 16, y = u * halb, q = Math.sqrt(Math.max(0.1, 1 - Math.pow(Math.abs(u), 2.6)));
      const hb = 0.2 * q, tb = 0.17 * q, zc = 0.3 + 0.13 * u * u;
      const r = [];
      for (let j = 0; j < 24; j++) { const w = (j / 24) * Math.PI * 2; r.push([Math.cos(w) * tb, y, zc + Math.sin(w) * hb - (Math.sin(w) < 0 ? 0.05 * q : 0)]); }
      ringe.push(r);
    }
    const K = einpassen([...ringe.flat(), [0, -1.05, 0.44], [0, 1.05, 0.44]], { x: 50, y: 52, b: 94, h: 66 }, { az: 22, el: 18 });
    const g = [bodenschatten(...K.P([0, 0, 0.08]), 40, 3)];
    const SG = materialDefs(p.gurt ?? '#2a2c30', 'polyester', S.defs);
    // Gurt: links und rechts aus den Enden heraus, leicht nach hinten
    g.push(riemen(K, [[0, -0.58, 0.42], [-0.04, -0.8, 0.44], [-0.08, -1.05, 0.45]], SG, 3.4, { naht: false }));
    g.push(riemen(K, [[0, 0.58, 0.42], [-0.04, 0.8, 0.44], [-0.08, 1.05, 0.45]], SG, 3.4, { naht: false }));
    g.push(koerper(S, projiziere(K, netz(ringe, { zu: true, innen: (i) => [0, ringe[i][0][1], 0.3] }))));
    // Hauptreißverschluss oben über die Länge, Fronttasche mit zweitem Reißverschluss
    g.push(reissv(K, ringe.map((r) => r[4]).slice(1, -1), S));
    g.push(metall(K, ringe[11][4], 1.4, 2.8, SILBER));
    g.push(reissv(K, ringe.slice(4, 13).map((r) => r[1]).map(([x, y, z]) => [x + 0.005, y, z]), S));
    g.push(metall(K, ringe[5][1], 1.4, 2.6, SILBER));
    g.push(polylinie(K, ringe.map((r) => r[22]).slice(2, -2), dunkel(S.c, 0.3), 0.45, { dash: '0.7 0.6', op: 0.7 }));
    // Steckschnalle rechts am Gurt
    const [sa, sb] = K.P([-0.06, 0.9, 0.445]);
    g.push(`<path d="M${f(sa - 4.6)} ${f(sb - 2.8)} L${f(sa + 1)} ${f(sb - 2.8)} L${f(sa + 3.6)} ${f(sb)} L${f(sa + 1)} ${f(sb + 2.8)} L${f(sa - 4.6)} ${f(sb + 2.8)} Z" fill="#2a2c30" stroke="#a2a6ab" stroke-width="0.5"/><path d="M${f(sa - 3)} ${f(sb - 1.2)} L${f(sa)} ${f(sb - 1.2)} M${f(sa - 3)} ${f(sb + 1.2)} L${f(sa)} ${f(sb + 1.2)}" stroke="#a2a6ab" stroke-width="0.6"/>`);
    t.push(...g);
  },
  kinderrucksack(S, t, p) {
    const h = 1, ringe = kasten(h, (u) => ({ a: lerp(0.38, 0.33, u) * (u > 0.8 ? Math.sqrt(1 - Math.pow((u - 0.8) / 0.2, 2) * 0.6) : 1), b: 0.17, r: 0.12, z: u }), 12);
    const K = einpassen([...ringe.flat(), [0, 0, h + 0.18]], { x: 50, y: 52, b: 72, h: 84 }, { az: 28, el: 16 });
    const g = [bodenschatten(...K.P([0, 0, 0]), 30, 3)];
    g.push(riemen(K, bogen([-0.05, -0.1, h - 0.02], [-0.05, 0.1, h - 0.02], 0.12, 10), S, 1.8));
    // Bärenohren oben
    for (const y of [-0.2, 0.2]) {
      const m = [0.04, y, h - 0.02], o = [];
      for (let i = 0; i <= 12; i++) { const a = Math.PI * (i / 12); o.push([m[0], m[1] + Math.cos(a) * 0.12, m[2] + Math.sin(a) * 0.14]); }
      g.push(flaecheP(K, o, dunkel(S.c, 0.12), { stroke: dunkel(S.c, 0.45), w: 0.5 }));
      g.push(flaecheP(K, o.map(([x, yy, z]) => [x + 0.01, m[1] + (yy - m[1]) * 0.55, m[2] + (z - m[2]) * 0.55]), p.zweit ?? '#f1cf4a'));
    }
    g.push(rumpf(K, S, ringe, { deckel: false }));
    g.push(flaecheP(K, ringe.at(-1), hell(S.c, 0.08)));
    // Fronttasche in Zweitfarbe, Reflektorstreifen
    const SF = materialDefs(p.zweit ?? '#f1cf4a', 'polyester', S.defs);
    const ft = [];
    for (let i = 0; i <= 12; i++) { const u = -0.82 + 1.64 * i / 12; ft.push(vorne(ringe, u, 0.52 + 0.08 * Math.cos(u * Math.PI / 2))); }
    ft.push(vorne(ringe, 0.82, 0.08), vorne(ringe, -0.82, 0.08));
    g.push(flaecheP(K, ft.map(([x, y, z]) => [x + 0.03, y, z]), SF.c, { stroke: dunkel(SF.c, 0.4), w: 0.6 }));
    g.push(reissv(K, ft.slice(1, 12).map(([x, y, z]) => [x + 0.032, y * 0.95, z - 0.04]), SF));
    g.push(flaecheP(K, [vorne(ringe, -0.5, 0.2), vorne(ringe, 0.5, 0.2), vorne(ringe, 0.5, 0.15), vorne(ringe, -0.5, 0.15)].map(([x, y, z]) => [x + 0.035, y, z]), '#dfe3e6', { stroke: '#a9aeb4', w: 0.3 }));
    // Gesicht auf der Fronttasche (Augen, Schnauze)
    for (const u of [-0.32, 0.32]) { const [ax, ay] = K.P(vorne(ringe, u, 0.38).map((v, i) => (i === 0 ? v + 0.04 : v))); g.push(`<circle cx="${f(ax)}" cy="${f(ay)}" r="1.5" fill="#2a2c30"/><circle cx="${f(ax - 0.4)}" cy="${f(ay - 0.5)}" r="0.45" fill="#fff"/>`); }
    { const [nx, ny] = K.P(vorne(ringe, 0, 0.3).map((v, i) => (i === 0 ? v + 0.04 : v))); g.push(`<ellipse cx="${f(nx)}" cy="${f(ny)}" rx="3.6" ry="2.6" fill="${hell(p.zweit ?? '#f1cf4a', 0.5)}"/><ellipse cx="${f(nx)}" cy="${f(ny - 0.8)}" rx="1.3" ry="0.9" fill="#2a2c30"/>`); }
    // Hauptreißverschluss als Bogen
    g.push(reissv(K, ringe.slice(5).map((r) => r[2]).concat(ringe.at(-1).slice(2, 7).reverse().slice(0, 1)), S));
    // Seitentasche mit Netz
    const st = [seite(ringe, -0.7, 0.35), seite(ringe, 0.7, 0.35), seite(ringe, 0.7, 0.04), seite(ringe, -0.7, 0.04)].map(([x, y, z]) => [x, y + 0.02, z]);
    g.push(flaecheP(K, st, dunkel(S.c, 0.2), { stroke: dunkel(S.c, 0.45), w: 0.5 }));
    for (let i = 1; i < 5; i++) g.push(polylinie(K, [[lerp(st[0][0], st[1][0], i / 5), st[0][1] + 0.002, st[0][2]], [lerp(st[3][0], st[2][0], i / 5), st[0][1] + 0.002, st[3][2]]], dunkel(S.c, 0.4), 0.3));
    // Schultergurt sichtbar rechts
    g.push(riemen(K, glatt3([[-0.12, 0.2, h - 0.08], [-0.2, 0.36, h * 0.6], [-0.16, 0.3, 0.06]], 2), materialDefs(dunkel(S.c, 0.2), 'polyester', S.defs), 2.4, { naht: false }));
    t.push(...g);
  },
  minibag(S, t, p) {
    const h = 0.72, ringe = kasten(h, (u) => ({ a: lerp(0.5, 0.42, u), b: 0.2, r: 0.08, z: u }), 8);
    const K = einpassen([...ringe.flat(), [0, 0, h + 1.45]], { x: 50, y: 50, b: 70, h: 86 }, { az: 30, el: 18 });
    const g = [bodenschatten(...K.P([0, 0, 0]), 30, 3)];
    // Kettenriemen hinten
    g.push(kette(K, glatt3([[0, -0.44, h - 0.04], [-0.04, -0.46, h + 0.9], [-0.04, -0.2, h + 1.45], [-0.04, 0.2, h + 1.45], [-0.04, 0.46, h + 0.9], [0, 0.44, h - 0.04]], 3), 1.1));
    g.push(rumpf(K, S, ringe));
    // Steppung (Rauten) auf der Front: Diagonalen im u-v-Feld, auf die Fläche beschnitten
    for (let k = -6; k <= 6; k++) for (const r of [1, -1]) {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const v = i / 12, u = k * 0.3 + r * (v - 0.5) * 1.2; if (u >= -1 && u <= 1) pts.push(vorne(ringe, u, v * 0.98 + 0.01)); }
      if (pts.length > 1) g.push(polylinie(K, pts.map(([x, y, z]) => [x + 0.004, y, z]), dunkel(S.c, 0.25), 0.45, { op: 0.75 }));
    }
    // Klappe mit Schloss
    const kl = [vorne(ringe, -1, 1), vorne(ringe, 1, 1), vorne(ringe, 1, 0.58), vorne(ringe, -1, 0.58)].map(([x, y, z]) => [x + 0.012, y * 1.02, z]);
    g.push(flaecheP(K, kl, S.c, { stroke: dunkel(S.c, 0.45), w: 0.6 }));
    g.push(flaecheP(K, kl, '#fff', { op: 0.06 }));
    g.push(metall(K, vorne(ringe, 0, 0.6).map((v, i) => (i === 0 ? v + 0.02 : v)), 4, 2.4));
    // kurzer Henkel oben
    g.push(riemen(K, bogen([0.02, -0.14, h], [0.02, 0.14, h], 0.16, 12), S, 1.8));
    t.push(...g);
  },
};

export const TASCHEN_ZEICHNER = Object.fromEntries(Object.entries(TASCHEN).map(([k, fn]) => ['q28' + k, fn]));

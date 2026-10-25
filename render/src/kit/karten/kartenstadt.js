// Kartenstadt: Stadt aus echten Kartendaten statt aus dem Kit-Raster (Pilot Essen, 25.10.2026).
// Straßen osm2streets (Apache-2.0) aus OpenStreetMap, Gleise/Flächen/Bäume OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL),
// Gebäude 3D-Gebäudemodell LoD2 NRW (Geobasis NRW, dl-de/zero-2-0). Daten: render/karten/<stadt>-spiel.json
// (Dezimeter, Plan-Koordinaten: x Ost, z Süd, Ursprung so verschoben, dass alles positiv ist).
// Spielhäuser (Hartwig, Sport, Volkskauf, FUNDUS, Wettbewerber, HQ) bauen die bekannten Kit-Bauer auf Bauplätzen,
// die echte Gebäude ersetzen. Wände der übrigen Gebäude entstehen zur Laufzeit aus den Außenkanten der LoD2-Dachflächen.
import { THREE, FARBEN, rng, waehle, baum, heller } from '../basis.js';
import { bauerFuer, dachFlaechenBeimBau } from '../stadt.js';
import { hqMasse } from '../hq.js';
import { ESSEN_KARTE } from './essen.js';
import essenDaten from '../../../karten/essen-spiel.json';

const KARTEN = { Essen: { roh: essenDaten, def: ESSEN_KARTE } };
export const istKartenstadt = (name) => !!KARTEN[name];

const BLICK = new THREE.Vector3(Math.SQRT1_2 * Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), Math.SQRT1_2 * Math.cos(Math.PI / 6));
const BODEN = {
  umland: '#cfc9bc', gehweg: FARBEN.gehweg, platz: '#cbc4b7', fahrbahn: '#7b8188', rad: '#a98a7c', markierung: FARBEN.markierung,
  gruen: FARBEN.rasen, wasser: FARBEN.wasser, parkplatz: '#9ba1a7', bahnsteig: '#cfc9bd', schotter: '#a39b8e', schiene: '#5b5550',
};
const HOEHE = { umland: -0.02, gehweg: 0, wasser: -0.15, gruen: 0.04, platz: 0.03, parkplatz: 0.05, fahrbahn: 0.07, rad: 0.08, markierung: 0.1, bahnsteig: 0.55, schotter: 0.12 };
const FL_ART = { 1: 'gruen', 2: 'wasser', 3: 'platz', 4: 'parkplatz', 5: 'bahnsteig', 6: 'schotter' };
const GL_ART = { 1: 'rail', 2: 'light_rail', 3: 'tram' };
const NETZ_TYP = { 1: 'haupt', 2: 'neben', 3: 'fussgaenger' };
const ZELLE = 120;

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const paare = (a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i] / 10, a[i + 1] / 10]); return o; };
const tripel = (a) => { const o = []; for (let i = 0; i < a.length; i += 3) o.push([a[i] / 10, a[i + 1] / 10, a[i + 2] / 10]); return o; };
const bboxVon = (pts) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };
function imPolygon(x, z, ring) {
  let drin = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) drin = !drin;
  }
  return drin;
}
const offen = (pts) => (pts.length > 1 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1] ? pts.slice(0, -1) : pts);

/** Daten einmal entpacken (je Stadt zwischengespeichert). */
const CACHE = new Map();
export function kartenDaten(name) {
  if (CACHE.has(name)) return CACHE.get(name);
  const k = KARTEN[name]; if (!k) return null;
  const d = k.roh;
  const gebaeude = d.gebaeude.map((g, i) => {
    const boden = tripel(g.b), dach = g.r.map(tripel);
    const [a, b, c, e] = bboxVon(boden.length ? boden : dach.flat());
    return { i, id: g.id || 'g' + i, fkt: g.f, dachTyp: g.d, h: g.h / 10, traufe: g.t / 10, boden, dach, bbox: [a, b, c, e], mx: (a + c) / 2, mz: (b + e) / 2, flaeche: (c - a) * (e - b) };
  });
  const r = {
    name, def: k.def, breite: d.breite, tiefe: d.tiefe, ursprung: d.ursprung, lizenz: d.lizenz,
    fahrbahn: d.fahrbahn.map(paare), rad: d.rad.map(paare), markierung: d.markierung.map(paare),
    flaechen: d.flaechen.map(([a, p]) => ({ art: FL_ART[a], umriss: paare(p) })),
    gleise: d.gleise.map(([a, p]) => ({ art: GL_ART[a], punkte: paare(p) })),
    baeume: paare(d.baeume), gebaeude,
    netz: (d.netz ?? []).map(([typ, breite, spuren, einbahn, a, b, p]) => ({ typ: NETZ_TYP[typ], breite: breite / 10, spuren, einbahn: !!einbahn, a, b, punkte: paare(p) })),
  };
  CACHE.set(name, r);
  return r;
}

/** Gebäudeart aus der ALKIS-Funktion (LoD2 NRW). */
export function gebaeudeArt(fkt = '') {
  if (fkt.startsWith('51009_')) return 'dach';
  if (fkt.startsWith('53001_')) return 'bruecke';
  if (fkt.startsWith('51002_') || fkt.startsWith('51001_')) return 'bauwerk';
  const k = fkt.split('_')[1] ?? '';
  if (k === '2460' || k === '2461' || k === '2462') return 'parkhaus';
  if (k === '3040' || k === '3041' || k === '3042' || k === '3043') return 'kirche';
  if (k.startsWith('10')) return 'wohnen';
  if (k.startsWith('11') || k.startsWith('12')) return 'gemischt';
  if (k.startsWith('2')) return 'gewerbe';
  if (k.startsWith('3')) return 'oeffentlich';
  return 'gewerbe';
}

// ─────────────────────────────────────────── Plan
/**
 * Plan für eine Kartenstadt. Gleiche Felder wie stadtplan(), soweit Spiel und Kit sie lesen: parzellen (nur
 * Spielhäuser, HQ, Bahnhof), standorte, einkaufslage, kameraGrenze, breite/tiefe; Straßen und Blöcke bleiben leer.
 */
export function kartenplan(name, eintrag, hqJson = null) {
  const K = kartenDaten(name), def = K.def;
  const [ox, oz] = K.ursprung, ins = ([x, z]) => [x + ox, z + oz];
  const parzellen = [], standorte = [], belegt = [];
  const frei = (R) => belegt.every((q) => R.x + R.w + 6 < q.x || q.x + q.w + 6 < R.x || R.z + R.d + 6 < q.z || q.z + q.d + 6 < R.z);
  // Bauplatz: großes echtes Gebäude nahe dem Zielpunkt, Parzelle W × D auf dessen Mitte (achsparallel wie alle Kit-Bauten).
  // Bewertung: Abstand zum Ziel plus Strafe, wenn hohe echte Gebäude davor (zur Kamera hin) das Spielhaus verdecken.
  const S2 = Math.SQRT2, COS = Math.cos(Math.PI / 6), SIN = Math.sin(Math.PI / 6);
  const bild = (x, z, y) => [(x - z) / S2, y * COS - ((x + z) / S2) * SIN];   // Bildschirmkoordinaten der festen Iso-Kamera
  const bildRechteck = (a, b, c, d, h) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, z] of [[a, b], [c, b], [c, d], [a, d]]) for (const y of [0, h]) { const [u, v] = bild(x, z, y); x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
    return [x0, y0, x1, y1];
  };
  const ueberlapp = (A, B) => Math.max(0, Math.min(A[2], B[2]) - Math.max(A[0], B[0])) * Math.max(0, Math.min(A[3], B[3]) - Math.max(A[1], B[1]));
  const verdeckung = (R) => {
    const H = 22, haus = bildRechteck(R.x, R.z, R.x + R.w, R.z + R.d, H), f = (haus[2] - haus[0]) * (haus[3] - haus[1]);
    const tiefe = R.x + R.w / 2 + R.z + R.d / 2;
    let v = 0;
    for (const g of K.gebaeude) {
      if (g.h < 10 || g.mx + g.mz <= tiefe) continue;
      if (g.mx > R.x - 3 && g.mx < R.x + R.w + 3 && g.mz > R.z - 3 && g.mz < R.z + R.d + 3) continue;
      const [a, b, c, d] = g.bbox;
      if (c < R.x - 250 || a > R.x + R.w + 250 || d < R.z - 250 || b > R.z + R.d + 250) continue;
      v += ueberlapp(haus, bildRechteck(a, b, c, d, g.h)) / f;
    }
    return Math.min(1, v);
  };
  // Wahrzeichen (Rathaus, Hauptbahnhof, Münster, Marktkirche, Limbecker Platz, Grillo, Alte Synagoge) bleiben stehen
  const schutz = (def.wahrzeichen ?? []).map(ins);
  const geschuetzt = (g) => schutz.some(([x, z]) => x > g.bbox[0] - 30 && x < g.bbox[2] + 30 && z > g.bbox[1] - 30 && z < g.bbox[3] + 30);
  const bauplatz = (ziel, W, D) => {
    const [tx, tz] = ins(ziel);
    const kandidaten = K.gebaeude.filter((g) => !['dach', 'bruecke', 'bauwerk', 'kirche'].includes(gebaeudeArt(g.fkt)) && !g.fkt.endsWith('_3091') && !geschuetzt(g)
      && g.flaeche > W * D * 0.45 && Math.hypot(g.mx - tx, g.mz - tz) < 320);
    let best = null;
    for (const g of kandidaten) {
      const R = { x: Math.round(g.mx - W / 2), z: Math.round(g.mz - D / 2), w: W, d: D };
      if (!frei(R)) continue;
      const wert = Math.hypot(g.mx - tx, g.mz - tz) + 400 * verdeckung(R);
      if (!best || wert < best.wert) best = { R, wert };
    }
    if (best) return best.R;
    for (let ring = 0; ring < 12; ring++) for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, R = { x: Math.round(tx + Math.cos(a) * ring * 25 - W / 2), z: Math.round(tz + Math.sin(a) * ring * 25 - D / 2), w: W, d: D };
      if (frei(R)) return R;
    }
    return { x: Math.round(tx - W / 2), z: Math.round(tz - D / 2), w: W, d: D };
  };
  const ROLLE = { premium: 'slot:premium', warenhaus: 'slot:warenhaus', sport: 'slot:sport', wettbewerber: 'slot:wettbewerber', wettbewerber_reserve: 'slot:wettbewerber_reserve', schwester: 'slot:schwester', outlet: 'slot:outlet' };
  const zaehler = {};
  const neueParzelle = (id, typ, R, standort, lage) => {
    const p = { id, typ, block: 'karte', x: R.x, z: R.z, w: R.w, d: R.d, seed: hash(id), ecke: 'block', front: ['+x', '+z'], seite: 'ecke', strasse: [],
      region: eintrag.region, cluster: eintrag.typ, viertel: 'kern', lage, nachbar: null, karte: true, ...(standort ? { standort } : {}) };
    parzellen.push(p); belegt.push(R);
    return p;
  };
  for (const st of eintrag.standorte) {
    const lage = st.lage === 'stadtteil' ? 'b' : st.lage;
    const liste = def.standorte[st.lage] ?? def.standorte.b;
    const nr = zaehler[st.lage] = (zaehler[st.lage] ?? -1) + 1;
    const W = Math.round(st.w ?? 50), D = Math.round(st.d ?? 40);
    const R = bauplatz(liste[nr % liste.length], W, D);
    const typ = ROLLE[st.rolle] ?? 'slot:warenhaus';
    const p = neueParzelle('k-' + st.id, typ, R, st, lage);
    standorte.push({ ...st, lage, parzelle: p.id, typ, block: 'karte' });
  }
  // Zentrale: Gebäude in dieser Stadt und offene Angebote auf eigene Bauplätze
  if (hqJson) {
    let n = 0;
    const eintraege = [...(hqJson.gebaeude ?? []).filter((g) => g.stadt === name).map((g) => ({ g, angebot: false })),
      ...(hqJson.angebote ?? []).filter((a) => a.stadt === name).map((g) => ({ g, angebot: true }))];
    for (const e of eintraege) {
      const m = hqMasse(e.g), ziel = def.hq[n++ % def.hq.length];
      const R = bauplatz(ziel, Math.round(m.w), Math.round(m.d));
      const standort = { id: e.g.id, rolle: 'hq', art: 'hq', lage: 'b', w: m.w, d: m.d, hq: e.g, angebot: e.angebot };
      const p = neueParzelle('hq-' + e.g.id, 'slot:hq', R, standort, 'b');
      p.sonder = 'hq';
      standorte.push({ ...standort, parzelle: p.id, typ: 'slot:hq', block: 'karte' });
    }
  }
  // Bahnhof (nur für Pin und Reise; gebaut wird das echte Empfangsgebäude aus den Kartendaten)
  const [bx, bz] = ins(def.bahnhof);
  parzellen.push({ id: 'k-bahnhof', typ: 'slot:bahnhof', block: 'karte', x: bx - 30, z: bz - 20, w: 60, d: 40, seed: 1, karte: true, leer: true });
  const [ex, ez] = ins(def.einkauf), [sx, sz] = ins(def.start);
  // Wege, die über einen Bauplatz samt Vorplatz führen, entfallen (sonst fahren Autos über den Vorplatz)
  const aufPlatz = (x, z) => parzellen.some((p) => !p.leer && x > p.x - 2 && x < p.x + p.w + 14 && z > p.z - 2 && z < p.z + p.d + 14);
  const { strassen, kreuzungen } = strassennetz(K, aufPlatz);
  const G = def.kameraGrenze;
  return {
    seed: eintrag.seed, typ: eintrag.typ, region: eintrag.region, archetyp: eintrag.archetyp, karte: name,
    breite: K.breite, tiefe: K.tiefe, nx: 0, nz: 0,
    strassen, kreuzungen, bloecke: [], umland: [], diagonalen: [], zwickel: [], parzellen, standorte,
    slots: parzellen.filter((p) => p.typ.startsWith('slot:')), landmarken: [],
    einkaufslage: { xF: ex, zF: ez, x0: ex - 120, x1: ex + 120, z0: ez - 200, z1: ez + 200 },
    einkaufslagen: [], nebenzentren: [],
    // Start auf dem ersten 1a-Haus (wie in den Rasterstädten auf der Einkaufslage), sonst am festen Startpunkt
    start: (() => { const q = parzellen.find((p) => p.standort?.lage === '1a' && p.typ === 'slot:warenhaus'); return q ? [q.x + q.w / 2, q.z + q.d / 2] : [sx, sz]; })(),
    kameraGrenze: { x0: G[0] + ox, z0: G[1] + oz, x1: G[2] + ox, z1: G[3] + oz, sicht: def.sicht },
  };
}

/**
 * Straßennetz für Verkehr und Figuren (leben.js): jedes gerade Stück einer OSM-Kante ist ein Straßenstück mit achse 'r'
 * (Ursprung, Richtung, Normale), Knoten an den Enden und Knickpunkten verbinden die Stücke wie Kreuzungen im Rasterplan.
 * Gezeichnet werden die Straßen aus den osm2streets-Flächen; dieses Netz trägt nur Wege.
 */
function strassennetz(K, aufPlatz = () => false) {
  const strassen = [], kreuzungen = [], knoten = new Map();
  const knotenBei = (schl, x, z) => { let k = knoten.get(schl); if (!k) { k = { x, z, arme: {} }; knoten.set(schl, k); kreuzungen.push(k); } return k; };
  K.netz.forEach((kante, ki) => {
    const pts = kante.punkte;
    let vorher = knotenBei('k' + kante.a, pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az);
      if (L < 0.5) continue;
      if (aufPlatz((ax + bx) / 2, (az + bz) / 2) || aufPlatz(ax, az) || aufPlatz(bx, bz)) { vorher = i === pts.length - 1 ? knotenBei('k' + kante.b, bx, bz) : knotenBei('z' + ki + '-' + i, bx, bz); continue; }
      const ux = (bx - ax) / L, uz = (bz - az) / L;
      const s = { id: 'n' + ki + '-' + i, achse: 'r', ax, az, ux, uz, nx: -uz, nz: ux, von: 0, bis: L, mitte: 0,
        typ: kante.typ, breite: kante.breite, gehweg: kante.typ === 'fussgaenger' ? 0 : 3.5, mittel: 0, einbahn: kante.einbahn };
      strassen.push(s);
      vorher.arme[s.id] = s;
      vorher = i === pts.length - 1 ? knotenBei('k' + kante.b, bx, bz) : knotenBei('z' + ki + '-' + i, bx, bz);
      vorher.arme[s.id] = s;
    }
  });
  return { strassen, kreuzungen };
}

// ─────────────────────────────────────────── Geometrie
/** Puffer je Farbe und Raumzelle; am Ende eine Geometrie je Eintrag (wenige, große Teile für den KompaktSammler). */
class Puffer {
  constructor() { this.m = new Map(); }
  tri(farbe, x, z, P, N) {
    const k = farbe + '|' + Math.floor(x / ZELLE) + '|' + Math.floor(z / ZELLE);
    let e = this.m.get(k); if (!e) this.m.set(k, e = { farbe, p: [], n: [] });
    for (const v of P) e.p.push(v); for (const v of N) e.n.push(v);
  }
  abgeben(S) {
    for (const e of this.m.values()) {
      if (!e.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(e.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(e.n, 3));
      S.add(g, e.farbe);
    }
    this.m.clear();
  }
}

function boden(B, umriss, y, farbe) {
  const pts = offen(umriss);
  if (pts.length < 3) return;
  const tri = THREE.ShapeUtils.triangulateShape(pts.map((p) => new THREE.Vector2(p[0], p[1])), []);
  if (!tri.length) return;
  const P = [], N = [];
  for (const [a, b, c] of tri) {
    const A = pts[a], Bp = pts[b], C = pts[c];
    const ny = (Bp[1] - A[1]) * (C[0] - A[0]) - (Bp[0] - A[0]) * (C[1] - A[1]);
    for (const q of ny >= 0 ? [A, Bp, C] : [A, C, Bp]) { P.push(q[0], y, q[1]); N.push(0, 1, 0); }
  }
  B.tri(farbe, pts[0][0], pts[0][1], P, N);
}

/** Dachfläche (eben, 3D, Punkte [x, z, y]) mit Normale nach oben. */
function dachflaeche(B, ring, farbe) {
  let pts = ring;
  if (pts.length > 1 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1] && pts[0][2] === pts.at(-1)[2]) pts = pts.slice(0, -1);
  if (pts.length < 3) return;
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    nx += (a[2] - b[2]) * (a[1] + b[1]); ny += (a[1] - b[1]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[2] + b[2]);
  }
  const l = Math.hypot(nx, ny, nz); if (l < 1e-6) return;
  nx /= l; ny /= l; nz /= l;
  if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
  const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
  const proj = ay >= ax && ay >= az ? (p) => new THREE.Vector2(p[0], p[1]) : ax >= az ? (p) => new THREE.Vector2(p[1], p[2]) : (p) => new THREE.Vector2(p[0], p[2]);
  const tri = THREE.ShapeUtils.triangulateShape(pts.map(proj), []);
  const P = [], N = [];
  for (const t of tri) {
    const q = t.map((i) => pts[i]);
    const ux = q[1][0] - q[0][0], uy = q[1][2] - q[0][2], uz = q[1][1] - q[0][1];
    const vx = q[2][0] - q[0][0], vy = q[2][2] - q[0][2], vz = q[2][1] - q[0][1];
    const tx = uy * vz - uz * vy, ty = uz * vx - ux * vz, tz = ux * vy - uy * vx;
    for (const p of tx * nx + ty * ny + tz * nz >= 0 ? q : [q[0], q[2], q[1]]) { P.push(p[0], p[2], p[1]); N.push(nx, ny, nz); }
  }
  B.tri(farbe, pts[0][0], pts[0][1], P, N);
}

/** Senkrechtes Rechteck: Grundlinie a→b (x, z), von y0 bis y1, Normale (nx, nz); nur Vorderseite. */
function wandQuad(B, farbe, ax, az, bx, bz, y0a, y1a, y0b, y1b, nx, nz) {
  // Umlauf so, dass die Normale nach (nx, 0, nz) zeigt
  const ex = bx - ax, ez = bz - az;
  const vorn = ez * nx - ex * nz < 0; // Kreuzprodukt (e × up) zeigt nach außen?
  const A = [ax, y0a, az], Bv = [bx, y0b, bz], C = [bx, y1b, bz], D = [ax, y1a, az];
  const reihe = vorn ? [A, Bv, C, A, C, D] : [A, C, Bv, A, D, C];
  const P = [], N = [];
  for (const p of reihe) { P.push(p[0], p[1], p[2]); N.push(nx, 0, nz); }
  B.tri(farbe, ax, az, P, N);
}

function gestalt(g) {
  const r = rng(hash(g.id));
  const art = gebaeudeArt(g.fkt), hoch = g.h > 32;
  let fassade = hoch ? waehle(r, FARBEN.fassadeKuehl) : r() < 0.14 ? waehle(r, FARBEN.backstein) : waehle(r, r() < 0.55 ? FARBEN.fassadeHell : r() < 0.6 ? FARBEN.fassadeWarm : FARBEN.fassadeKuehl);
  const flach = g.dachTyp === '1000' || g.dachTyp === '9999';
  let dach = flach ? waehle(r, ['#a9a59d', '#b3aea5', '#9fa19f']) : r() < 0.12 ? waehle(r, FARBEN.ziegel) : waehle(r, ['#6f767d', '#7c848c', '#68707a', '#8b939b']);
  if (art === 'kirche') { fassade = waehle(r, ['#cdbfa6', '#bfb39c', '#a99c88']); dach = waehle(r, ['#5d666e', '#6f9a7d']); }
  if (art === 'parkhaus') fassade = '#b7b5b0';
  return { r, art, hoch, flach, fassade, dach };
}

/** Fenster als flache Rechtecke auf einer sichtbaren Wand (Grundlinie a→b, Oberkante oben), Ladenzone im Kern. */
function fensterAufWand(B, g, gs, ax, az, bx, bz, oben, nx, nz, kern) {
  const L = Math.hypot(bx - ax, bz - az);
  if (L < 2.4 || oben < 3 || gs.art === 'bauwerk') return;
  const ux = (bx - ax) / L, uz = (bz - az) / L, o = 0.08;
  const quad = (farbe, u0, u1, y0, y1) => wandQuad(B, farbe, ax + ux * u0 + nx * o, az + uz * u0 + nz * o, ax + ux * u1 + nx * o, az + uz * u1 + nz * o, y0, y1, y0, y1, nx, nz);
  if (gs.art === 'parkhaus') { for (let y = 2.9; y < oben - 0.5; y += 2.9) quad('#4a5157', 0.4, L - 0.4, y - 1.55, y - 0.45); return; }
  const eg = kern && g.h > 7 && (gs.art === 'gewerbe' || gs.art === 'gemischt') ? 4.2 : 0;
  const kirche = gs.art === 'kirche';
  const gh = kirche ? 7 : gs.hoch ? 3.6 : 3.2;
  const raster = kirche ? 4.5 : gs.hoch ? 2.2 : 3.1, fw = kirche ? 1.4 : gs.hoch ? 1.7 : 1.3, fh = kirche ? 4.5 : gs.hoch ? 2.4 : 1.75;
  const n = Math.max(1, Math.floor((L - 0.8) / raster)), rand = (L - n * raster) / 2;
  const farbe = gs.hoch ? FARBEN.glas : FARBEN.fenster;
  if (eg) { quad(FARBEN.laden, 0.3, L - 0.3, 0.2, 3.2); quad(heller(gs.fassade, 0.06), 0, L, eg - 0.5, eg - 0.15); }
  for (let k = 0; ; k++) {
    const y = eg + k * gh + gh * 0.55;
    if (y + fh / 2 > oben - 0.4) break;
    for (let i = 0; i < n; i++) { const u = rand + raster * (i + 0.5); quad(farbe, u - fw / 2, u + fw / 2, y - fh / 2, y + fh / 2); }
  }
}

/** Ein LoD2-Gebäude: Dachflächen, Wände aus den Außenkanten der Dachflächen, Fenster auf den sichtbaren Wänden. */
function gebaeudeBauen(B, S, g, kern) {
  const gs = gestalt(g);
  if (gs.art === 'dach' || gs.art === 'bruecke') {
    const farbe = gs.art === 'bruecke' ? '#8a8f94' : '#a7adb2';
    for (const dr of g.dach) dachflaeche(B, dr, farbe);
    if (gs.art === 'dach' && g.boden.length > 2) {
      const ring = g.boden, h = g.traufe || g.h, schritt = Math.max(12, Math.hypot(g.bbox[2] - g.bbox[0], g.bbox[3] - g.bbox[1]) / 8);
      let weg = 0;
      for (let i = 1; i < ring.length; i++) {
        const [px, pz] = ring[i - 1], [qx, qz] = ring[i], l = Math.hypot(qx - px, qz - pz);
        for (let t = (schritt - weg) % schritt; t < l; t += schritt) { const u = t / l; S.box(0.35, h, 0.35, px + (qx - px) * u, h / 2, pz + (qz - pz) * u, '#6b7278'); }
        weg = (weg + l) % schritt;
      }
    }
    return;
  }
  // Außenkanten: Kanten der Dachpolygone, die in keinem zweiten Dachpolygon desselben Gebäudes vorkommen
  const schl = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10) + ',' + Math.round(p[2] * 10);
  const zahl = new Map(), kanten = [];
  for (const dr of g.dach) {
    const pts = offen(dr);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const k = [schl(a), schl(b)].sort().join('|');
      zahl.set(k, (zahl.get(k) ?? 0) + 1);
      kanten.push([k, a, b]);
    }
    dachflaeche(B, dr, gs.dach);
  }
  const mx = g.mx, mz = g.mz;
  for (const [k, a, b] of kanten) {
    if (zahl.get(k) > 1) continue;
    const ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez);
    if (L < 0.3) continue;
    let nx = ez / L, nz = -ex / L;
    // nach außen: weg vom Gebäudeschwerpunkt (Mitte der Kante)
    if (nx * ((a[0] + b[0]) / 2 - mx) + nz * ((a[1] + b[1]) / 2 - mz) < 0) { nx = -nx; nz = -nz; }
    if (nx * BLICK.x + nz * BLICK.z <= 0.02) continue; // Rückseiten sieht die feste Kamera nie
    wandQuad(B, gs.fassade, a[0], a[1], b[0], b[1], 0, a[2], 0, b[2], nx, nz);
    fensterAufWand(B, g, gs, a[0], a[1], b[0], b[1], Math.min(a[2], b[2], g.traufe > 2 ? g.traufe : g.h), nx, nz, kern);
  }
  // Dachaufbauten auf großen Flachdächern
  if (gs.flach && g.h > 6 && g.flaeche > 180 && g.boden.length > 2) {
    const [a, b, c, d] = g.bbox, anz = Math.min(4, 1 + Math.floor(g.flaeche / 900));
    for (let k = 0; k < anz; k++) {
      const px = a + (c - a) * (0.25 + gs.r() * 0.5), pz = b + (d - b) * (0.25 + gs.r() * 0.5);
      if (!imPolygon(px, pz, g.boden)) continue;
      const w = 2.5 + gs.r() * 4, t = 2 + gs.r() * 3, hh = 1.4 + gs.r() * 1.6;
      S.box(w, hh, t, px, g.h + hh / 2, pz, k % 2 ? '#c9c6bf' : '#9da2a6');
    }
  }
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
 * Baut die Kartenstadt in den Sammler und ruft für Spielhäuser/HQ die Kit-Bauer (wie baueStadt).
 * Rückgabe wie baueStadt: { box, hoehen, dachFlaechen, teileStrasse, teileHaeuser, instanzen, drawCallsInstanzen }.
 */
export function baueKartenstadt(S, scene, plan, bauer, o = {}) {
  const K = kartenDaten(plan.karte), def = K.def;
  const [ox, oz] = K.ursprung, [kx, kz] = [def.kern[0] + ox, def.kern[1] + oz];
  const kern = (x, z) => Math.hypot(x - kx, z - kz) < def.kern[2];
  const B = new Puffer();
  const t0 = S.anzahl;
  // Umland bis weit über den Kartenrand, damit die Kamera nie ins Leere sieht
  boden(B, [[-1200, -1200], [K.breite + 1200, -1200], [K.breite + 1200, K.tiefe + 1200], [-1200, K.tiefe + 1200]], HOEHE.umland, BODEN.umland);
  boden(B, [[0, 0], [K.breite, 0], [K.breite, K.tiefe], [0, K.tiefe]], HOEHE.gehweg, BODEN.gehweg);
  for (const fl of K.flaechen) if (fl.art !== 'bahnsteig') boden(B, fl.umriss, HOEHE[fl.art] ?? 0.03, BODEN[fl.art] ?? BODEN.platz);
  for (const p of K.fahrbahn) boden(B, p, HOEHE.fahrbahn, BODEN.fahrbahn);
  for (const p of K.rad) boden(B, p, HOEHE.rad, BODEN.rad);
  for (const p of K.markierung) boden(B, p, HOEHE.markierung, BODEN.markierung);
  for (const fl of K.flaechen) if (fl.art === 'bahnsteig') boden(B, fl.umriss, HOEHE.bahnsteig, BODEN.bahnsteig);
  for (const g of K.gleise) gleis(S, g.punkte, g.art);
  // Bäume: OSM-Einzelbäume und lockere Bepflanzung der Grünflächen
  const r = rng(77);
  for (const [x, z] of K.baeume) baum(S, x, z, r, 1.15);
  for (const fl of K.flaechen) {
    if (fl.art !== 'gruen') continue;
    const [a, b, c, d] = bboxVon(fl.umriss), rr = rng(hash(a + ',' + b));
    for (let x = a + 8; x < c - 4; x += 16) for (let z = b + 8; z < d - 4; z += 16) {
      const px = x + (rr() - 0.5) * 9, pz = z + (rr() - 0.5) * 9;
      if (rr() < 0.75 && imPolygon(px, pz, fl.umriss)) baum(S, px, pz, rr, 1.1 + rr() * 0.4);
    }
  }
  const t1 = S.anzahl;
  // Bauplätze der Spielhäuser freiräumen: echte Gebäude, deren Mitte auf einer Parzelle liegt, entfallen
  const platz = plan.parzellen.filter((p) => !p.leer);
  // Echte Gebäude entfallen, wenn ihre Mitte auf der Parzelle liegt oder mehr als ein Viertel ihrer Fläche darauf
  const frei = (g) => !platz.some((p) => {
    // Vorplatz, Parkplatz und Vordächer der Kit-Bauten liegen zur Kamera hin (+x, +z): dort 14 m Rand freihalten
    const x0 = p.x - 3, z0 = p.z - 3, x1 = p.x + p.w + 14, z1 = p.z + p.d + 14;
    if (g.mx > x0 && g.mx < x1 && g.mz > z0 && g.mz < z1) return true;
    const [a, b, c, d] = g.bbox, ux = Math.max(0, Math.min(c, x1) - Math.max(a, x0)), uz = Math.max(0, Math.min(d, z1) - Math.max(b, z0));
    if (ux * uz > 0.25 * Math.max(1, (c - a) * (d - b))) return true;
    // Durchdringung mit dem Kit-Baukörper selbst: schon kleine Überlappung sieht man als Haus im Haus
    const kx = Math.min(c, p.x + p.w) - Math.max(a, p.x), kz = Math.min(d, p.z + p.d) - Math.max(b, p.z);
    return kx > 1.5 && kz > 1.5 && kx * kz > 0.04 * Math.max(1, (c - a) * (d - b));
  });
  for (const g of K.gebaeude) if (frei(g)) gebaeudeBauen(B, S, g, kern(g.mx, g.mz));
  B.abgeben(S);
  const hoehen = new Map(), dachFlaechen = [];
  let maxH = 20;
  if (!o.ohneHaeuser) for (const p of plan.parzellen) {
    if (p.leer) { hoehen.set(p.id, 20); continue; }
    const { ergebnis, dachFlaechen: dach } = dachFlaechenBeimBau(S, p, () => bauerFuer(bauer, p.typ)(S, scene, p));
    dachFlaechen.push(...dach);
    const h = ergebnis?.hoehe ?? 12;
    hoehen.set(p.id, h); maxH = Math.max(maxH, h);
  }
  return {
    box: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(plan.breite, maxH, plan.tiefe)),
    hoehen, dachFlaechen, teileStrasse: t1 - t0, teileHaeuser: S.anzahl - t1, instanzen: 0, drawCallsInstanzen: 0,
  };
}

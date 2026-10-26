// Kartenstadt: Stadt aus echten Kartendaten statt aus dem Kit-Raster (Pilot Essen, 25.10.2026).
// Straßen osm2streets (Apache-2.0) aus OpenStreetMap, Gleise/Flächen/Bäume OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL),
// Gebäude 3D-Gebäudemodell LoD2 NRW (Geobasis NRW, dl-de/zero-2-0). Daten: render/karten/<stadt>-spiel.json
// (Dezimeter, Plan-Koordinaten: x Ost, z Süd, Ursprung so verschoben, dass alles positiv ist).
// Spielhäuser (Hartwig, Sport, Volkskauf, FUNDUS, Wettbewerber, HQ) bauen die bekannten Kit-Bauer auf Bauplätzen,
// die echte Gebäude ersetzen. Wände der übrigen Gebäude entstehen zur Laufzeit aus den Außenkanten der LoD2-Dachflächen.
import { THREE, FARBEN, rng, waehle, baum, heller, vertexMat } from '../basis.js';
import { bauerFuer, dachFlaechenBeimBau, Instanzer, baumSetzen } from '../stadt.js';
import { hqMasse } from '../hq.js';
import { masseOutlet } from '../outlet.js';
import { ESSEN_KARTE } from './essen.js';
import essenDaten from '../../../karten/essen-spiel.json';

const KARTEN = { Essen: { roh: essenDaten, def: ESSEN_KARTE } };
export const istKartenstadt = (name) => !!KARTEN[name];
/** Kartenstil: 'coffee' (abstrahiert, Standard) oder 'karte' (kartentreu). Einstellung, gespeichert im Gerät. */
export const KARTENSTILE = { coffee: 'Coffee (vereinfacht)', karte: 'Kartentreu' };
let stilGesetzt = null;
export function kartenStil() {
  if (stilGesetzt) return stilGesetzt;
  try { const q = new URLSearchParams(globalThis.location?.search ?? '').get('kartenstil'); if (q && KARTENSTILE[q]) return q; } catch { /* kein Browser */ }
  try { const v = globalThis.localStorage?.getItem('ruhrkauf.kartenstil'); if (v && KARTENSTILE[v]) return v; } catch { /* privat */ }
  return 'coffee';
}
export function setzeKartenStil(v) { if (!KARTENSTILE[v]) return; if (stilGesetzt && stilGesetzt !== v) for (const k of [...CACHE.keys()]) if (!k.endsWith('|' + v)) CACHE.delete(k);   // Speicher der anderen Variante freigeben (iPhone)
  stilGesetzt = v; try { globalThis.localStorage?.setItem('ruhrkauf.kartenstil', v); } catch { /* privat */ } }

const BLICK = new THREE.Vector3(Math.SQRT1_2 * Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), Math.SQRT1_2 * Math.cos(Math.PI / 6));
// Bodenschichten (Reihenfolge und Namen wie kartenstadt-bauen.py FARBE): Farbe und Höhe über Gelände
const BODEN = {
  tunnel: '#3c4148', garten: '#a3b78f', haltestelle: '#d7d2c7', fusszone: '#e3dccc',
  weg: '#e2d6bd', linie: '#f4f2ea', ufer: '#d9d2bf', rasen2: '#8bbd7c',
  umland: '#cdc6b6', pflaster: '#d6cdb9', gehweg: '#ebe8e1', bord: '#bdb7ac', fahrbahn: '#646a73', parkstreifen: '#8b9097', rad: '#b0897a', markierung: FARBEN.markierung,
  gruen: '#9dbb88', hof: '#a3b78f', hofkern: '#d6d2c9', wasser: FARBEN.wasser, platz: '#d9d2c3', parkplatz: '#969ba2', bahnsteig: '#cfc9bd', schotter: '#a39b8e', schiene: '#5b5550',
  gewerbe: '#c4bfb5', schulhof: '#d0c3ad', sport: '#7fb36b', kleingarten: '#9fc27f',
};
// Coffee-Abstraktion: hellere, wärmere Flächen und Pastellfassaden wie in Aufbauspielen; Kartentreue bleibt bei den gedeckten Tönen
const COFFEE = {
  boden: { pflaster: '#f2e7cf', gehweg: '#fbf7ee', bord: '#d9cdb6', fahrbahn: '#596474', hofkern: '#efe2c9', platz: '#f4e9d2', gruen: '#98cf78', garten: '#acd48f',
    hof: '#acd48f', rasen2: '#8ac46c', sport: '#82bf66', kleingarten: '#a4cf86', fusszone: '#f7ecd6', umland: '#e6dcc4', parkplatz: '#8f9aab', gewerbe: '#e6dcc8', schulhof: '#f0dfc0',
    weg: '#f6e6c2', markierung: '#fff6dc', linie: '#ffffff', wasser: '#5fb7e0', ufer: '#e9dcbc', bahnsteig: '#e3d8c4', schotter: '#c9bfae' },
  fassade: ['#f2e6cf', '#eedccb', '#e1e8df', '#e0e5ea', '#f1e7c9', '#ead8cc', '#ebe5d8', '#dde6e8', '#efe0cb', '#e6ece2', '#ecd6bf', '#e6e0d6'],
  steil: ['#c9654b', '#b65a47', '#d07a55', '#5f6b7a', '#6c7987'], flach: ['#c9c2b6', '#bfc7cb', '#cbbfb6', '#c4c9bd', '#bcc1c9'],
  hoch: ['#d6e2ea', '#e6dccb', '#dfe7e0', '#e2dcd4', '#dadfe8'], bau: ['#e4ded2', '#dcd8cf'],
};
let PAL = null;   // gesetzt in baueKartenstadt je Kartenstil
const bodenFarbe = (art) => PAL?.boden[art] ?? BODEN[art];
// Jede Schicht auf eigener Höhe (gleiche Höhen flackern ineinander)
const HOEHE = { tunnel: 0.076, garten: 0.012, haltestelle: 0.13, fusszone: 0.118, weg: 0.047, linie: 0.049, ufer: 0.05, rasen2: 0.037, umland: -0.03, pflaster: 0, hofkern: 0.008, hof: 0.012, gewerbe: 0.016, schulhof: 0.02, kleingarten: 0.024, sport: 0.028, gruen: 0.035, platz: 0.04,
  parkplatz: 0.045, wasser: 0.052, schotter: 0.06, fahrbahn: 0.07, parkstreifen: 0.074, rad: 0.08, markierung: 0.1, gehweg: 0.12, bord: 0.14, bahnsteig: 0.55 };
const GL_ART = { 1: 'rail', 2: 'light_rail', 3: 'tram' };
const NETZ_TYP = { 1: 'haupt', 2: 'neben', 3: 'fussgaenger' };
const ZELLE = 300;   // Raumzellen der Kartengeometrie: wenige Draw Calls auch bei weitestem Zoom

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const paare = (a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i] / 10, a[i + 1] / 10]); return o; };
/** base64 → Uint16Array (Little Endian wie numpy '<u2'). */
function u16(b64) {
  if (!b64) return new Uint16Array(0);
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Uint16Array(u8.buffer);
}
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

const RASTER = (() => { const o = []; for (let dx = -420; dx <= 420; dx += 4) for (let dz = -420; dz <= 420; dz += 4) { const ab = Math.hypot(dx, dz); if (ab <= 420) o.push([dx, dz, ab]); } return o.sort((a, b) => a[2] - b[2]); })();

/** Daten einmal entpacken (je Stadt zwischengespeichert). */
const CACHE = new Map();
export function kartenDaten(name, stil = kartenStil()) {
  const ck = name + '|' + stil;
  if (CACHE.has(ck)) return CACHE.get(ck);
  const k = KARTEN[name]; if (!k) return null;
  const d = k.roh, v = d.varianten?.[stil] ?? d.varianten?.coffee;
  const GP = u16(d.gp), GI = u16(d.gi);
  const punkte3 = (off, n) => { const o = []; for (let j = 0; j < n; j++) { const q = (off + j) * 3; o.push([GP[q] / 10, GP[q + 1] / 10, GP[q + 2] / 10]); } return o; };
  // Gebäude: [Funktion, Dachform, Höhe, Traufe, Bodenring (Versatz, Anzahl), je Dachfläche (Versatz, Anzahl, Indexversatz, Indexanzahl)]
  const gebaeude = d.gebaeude.map((e, i) => {
    const boden = punkte3(e[4], e[5]), dach = [], dachIdx = [];
    for (let j = 6; j < e.length; j += 4) { dach.push(punkte3(e[j], e[j + 1])); dachIdx.push(GI.subarray(e[j + 2], e[j + 2] + e[j + 3])); }
    const [a, b, c, f] = bboxVon(boden.length ? boden : dach.flat());
    return { i, id: 'g' + i, fkt: d.fkt[e[0]] ?? '', dachTyp: String(e[1]), h: e[2] / 10, traufe: e[3] / 10, boden, dach, dachIdx, bbox: [a, b, c, f], mx: (a + c) / 2, mz: (b + f) / 2, flaeche: (c - a) * (f - b) };
  });
  const BP = u16(d.bp), BI = u16(d.bi);
  // Deko: Art je Eintrag (Byte), Winkel (Byte), Lage (Uint16-Paare in Dezimetern)
  const bytes = (b64) => { const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary'); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const deko = v.deko ? { typ: bytes(v.deko.typ), w: bytes(v.deko.w), p: u16(v.deko.p), arten: v.deko.arten } : null;
  const r = {
    name, stil, def: k.def, breite: d.breite, tiefe: d.tiefe, ursprung: d.ursprung, lizenz: d.lizenz,
    bebaubar: (d.bebaubar ?? []).map((ringe) => ringe.map(paare)),
    // Bahnhof: Dachmodule [x, z, Richtung x, Richtung z, Länge, Breite] als Ring (für Abstandsregeln) und als Modul (zum Zeichnen)
    dachModule: (d.daecher ?? []).filter((m) => m.length === 6),
    daecher: (d.daecher ?? []).filter((m) => m.length === 6).map(([x, z, ux, uz, L, Bq]) => { const a = L / 2, b = Bq / 2, qx = -uz, qz = ux;
      return [[x - ux * a - qx * b, z - uz * a - qz * b], [x + ux * a - qx * b, z + uz * a - qz * b], [x + ux * a + qx * b, z + uz * a + qz * b], [x - ux * a + qx * b, z - uz * a + qz * b]]; }),
    bahnsteige: (d.bahnsteige ?? []).map((f) => { const r = []; for (let i = 0; i + 1 < f.length; i += 2) r.push([f[i], f[i + 1]]); return r; }),
    zuege: d.zuege ?? [],
    parkautos: d.parkautos?.[stil] ?? [],
    boden: v.boden.map(([f, po, pn, io, inn]) => ({ art: d.farben[f], p: BP.subarray(po * 2, (po + pn) * 2), i: BI.subarray(io, io + inn) })),
    gleise: d.gleise.map(([a, p]) => ({ art: GL_ART[a], punkte: paare(p) })),
    deko, gebaeude,
    // Netz: [Typ, Bandbreite dm, Einbahn, Knoten a, Knoten b, Punkte, Spuren (Versatz links dm, Richtung)…]
    netz: (d.netz ?? []).map(([typ, breite, einbahn, a, b, p, sp, fs = 15, mund = 0]) => {
      const spuren = []; for (let i = 0; i + 1 < (sp ?? []).length; i += 2) spuren.push({ links: sp[i] / 10, dir: sp[i + 1] });
      // Gehwegseiten, die neben der Fahrbahn dieser Variante liegen ([links, rechts] = Versatz −/+)
      const o = stil === 'coffee' ? 2 : 0, fussSeiten = [!!(fs & (1 << o)), !!(fs & (2 << o))];
      return { typ: NETZ_TYP[typ], breite: breite / 10, einbahn: !!einbahn, a, b, punkte: paare(p), spuren, fussSeiten, mund };
    }),
  };
  r.aufFahrbahn = fahrbahnMaske(r);
  CACHE.set(ck, r);
  return r;
}

/** Rastermaske (1,5 m) der Fahrbahnen, Parkstreifen und Gleise: Passanten gehen dort nicht längs. */
function fahrbahnMaske(K) {
  const Z = 1.0, W = Math.ceil((K.breite + 400) / Z), H = Math.ceil((K.tiefe + 400) / Z), M = new Uint8Array(W * H);
  const zelle = (x, z) => { const i = Math.floor(x / Z), j = Math.floor(z / Z); return i >= 0 && j >= 0 && i < W && j < H ? j * W + i : -1; };
  for (const st of K.boden) {
    if (st.art !== 'fahrbahn' && st.art !== 'parkstreifen') continue;
    const p = st.p, idx = st.i;
    for (let t = 0; t < idx.length; t += 3) {
      const ax = p[idx[t] * 2] / 10, az = p[idx[t] * 2 + 1] / 10, bx = p[idx[t + 1] * 2] / 10, bz = p[idx[t + 1] * 2 + 1] / 10, cx = p[idx[t + 2] * 2] / 10, cz = p[idx[t + 2] * 2 + 1] / 10;
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-6) continue;
      for (let i = Math.floor(Math.min(ax, bx, cx) / Z); i <= Math.floor(Math.max(ax, bx, cx) / Z); i++) for (let j = Math.floor(Math.min(az, bz, cz) / Z); j <= Math.floor(Math.max(az, bz, cz) / Z); j++) {
        const x = (i + 0.5) * Z, z = (j + 0.5) * Z, l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
        if (l1 >= -0.05 && l2 >= -0.05 && l1 + l2 <= 1.05) { const k = zelle(x, z); if (k >= 0) M[k] = 1; }
      }
    }
  }
  for (const g of K.gleise) for (let n = 1; n < g.punkte.length; n++) {
    const [x0, z0] = g.punkte[n - 1], [x1, z1] = g.punkte[n], L = Math.hypot(x1 - x0, z1 - z0);
    for (let u = 0; u <= L; u += 0.75) for (const q of [-1.2, 0, 1.2]) { const x = x0 + (x1 - x0) * u / (L || 1) - (z1 - z0) / (L || 1) * q, z = z0 + (z1 - z0) * u / (L || 1) + (x1 - x0) / (L || 1) * q; const k = zelle(x, z); if (k >= 0) M[k] = 1; }
  }
  return (x, z) => { const k = zelle(x, z); return k >= 0 && M[k] === 1; };
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
  const stil = kartenStil();
  const K = kartenDaten(name, stil), def = K.def;
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
    const tiefe = R.x + R.w / 2 + R.z + R.d / 2 - 20;
    let v = 0;
    for (const g of K.gebaeude) {
      if (g.h < 10 || g.mx + g.mz <= tiefe) continue;
      if (g.mx > R.x - 3 && g.mx < R.x + R.w + 3 && g.mz > R.z - 3 && g.mz < R.z + R.d + 3) continue;
      const [a, b, c, d] = g.bbox;
      if (c < R.x - 250 || a > R.x + R.w + 250 || d < R.z - 250 || b > R.z + R.d + 250) continue;
      const u = ueberlapp(haus, bildRechteck(a, b, c, d, g.h)) / f;
      if (u > 0.1 && g.h > 18) return 9;   // ein hohes Haus vor dem Laden verdeckt ihn spürbar: Bauplatz ausscheiden
      v += u;
    }
    // Bereits gesetzte Spielhäuser (z. B. zweites HQ-Hochhaus) dürfen den Laden ebenso wenig verdecken
    for (const q of belegt) {
      if (q.x + q.w / 2 + q.z + q.d / 2 <= tiefe) continue;
      const u = ueberlapp(haus, bildRechteck(q.x, q.z, q.x + q.w, q.z + q.d, 45)) / f;
      if (u > 0.1) return 9;
    }
    // … und das neue Haus darf kein bereits gesetztes verdecken
    const neu = bildRechteck(R.x, R.z, R.x + R.w, R.z + R.d, 45);
    for (const q of belegt) {
      if (q.x + q.w / 2 + q.z + q.d / 2 >= tiefe + 20) continue;
      const r = bildRechteck(q.x, q.z, q.x + q.w, q.z + q.d, 22);
      if (ueberlapp(r, neu) / ((r[2] - r[0]) * (r[3] - r[1])) > 0.1) return 9;
    }
    return Math.min(1, v);
  };
  // Wahrzeichen (Rathaus, Hauptbahnhof, Münster, Marktkirche, Limbecker Platz, Grillo, Alte Synagoge) bleiben stehen
  const schutz = (def.wahrzeichen ?? []).map(ins);
  const geschuetzt = (g) => schutz.some(([x, z]) => x > g.bbox[0] - 30 && x < g.bbox[2] + 30 && z > g.bbox[1] - 30 && z < g.bbox[3] + 30);
  // Bebaubare Flächen (ohne Straßen samt Gehweg, Gleise, Bahnsteige, Wasser, Parks; berechnet in kartenstadt-bauen.py)
  const bau = K.bebaubar.map((ringe) => ({ ringe, bb: bboxVon(ringe[0]) }));
  const GZ = 50, gitter = new Map();
  bau.forEach((f, i) => { for (let gx = Math.floor(f.bb[0] / GZ); gx <= Math.floor(f.bb[2] / GZ); gx++) for (let gz = Math.floor(f.bb[1] / GZ); gz <= Math.floor(f.bb[3] / GZ); gz++) { const k = gx * 10000 + gz; if (!gitter.has(k)) gitter.set(k, []); gitter.get(k).push(i); } });
  const aufBauflaeche = (x, z) => (gitter.get(Math.floor(x / GZ) * 10000 + Math.floor(z / GZ)) ?? []).some((i) => { const f = bau[i]; return x >= f.bb[0] && x <= f.bb[2] && z >= f.bb[1] && z <= f.bb[3] && imPolygon(x, z, f.ringe[0]) && !f.ringe.slice(1).some((l) => imPolygon(x, z, l)); });
  /** Rechteck liegt vollständig auf bebaubarer Fläche: Kanten alle 4 m und ein Innenraster prüfen. */
  const passt = (R) => {
    for (let u = 0; u <= R.w; u += Math.min(4, R.w)) { if (!aufBauflaeche(R.x + u, R.z) || !aufBauflaeche(R.x + u, R.z + R.d)) return false; }
    for (let v = 0; v <= R.d; v += Math.min(4, R.d)) { if (!aufBauflaeche(R.x, R.z + v) || !aufBauflaeche(R.x + R.w, R.z + v)) return false; }
    for (let u = R.w / 4; u < R.w; u += R.w / 4) for (let v = R.d / 4; v < R.d; v += R.d / 4) if (!aufBauflaeche(R.x + u, R.z + v)) return false;
    return true;
  };
  const schuetztWahrzeichen = (R) => schutz.some(([x, z]) => x > R.x - 25 && x < R.x + R.w + 25 && z > R.z - 25 && z < R.z + R.d + 25);
  // Große oder hohe echte Gebäude (Einkaufszentren, Hochhäuser) werden nie abgerissen: das Spielhaus darf nicht in ihnen stehen
  const NZ = 60, hausGitter = new Map(), schienenGitter = new Map();
  const eintragen = (M, a, b, c, d, w) => { for (let gx = Math.floor(a / NZ); gx <= Math.floor(c / NZ); gx++) for (let gz = Math.floor(b / NZ); gz <= Math.floor(d / NZ); gz++) { const k = gx * 10000 + gz; if (!M.has(k)) M.set(k, []); M.get(k).push(w); } };
  for (const g of K.gebaeude) if (gebaeudeArt(g.fkt) !== 'dach') eintragen(hausGitter, ...g.bbox, g);
  // Bahnsteigdächer zählen wie Gleise (der Laden darf nicht unter oder an die Dachplatten rücken)
  for (const ring of K.daecher) for (let i = 1; i < ring.length; i++) {
    const [x0, z0] = ring[i - 1], [x1, z1] = ring[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 4));
    for (let j = 0; j <= n; j++) { const x = x0 + (x1 - x0) * j / n, z = z0 + (z1 - z0) * j / n; eintragen(schienenGitter, x, z, x, z, [x, z]); }
  }
  for (const gl of K.gleise) if (gl.art !== 'tram') for (let i = 1; i < gl.punkte.length; i++) {
    const [x0, z0] = gl.punkte[i - 1], [x1, z1] = gl.punkte[i], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 4));
    for (let j = 0; j <= n; j++) { const x = x0 + (x1 - x0) * j / n, z = z0 + (z1 - z0) * j / n; eintragen(schienenGitter, x, z, x, z, [x, z]); }
  }
  const imUmkreis = (M, R, rand) => { const out = new Set();
    for (let gx = Math.floor((R.x - rand) / NZ); gx <= Math.floor((R.x + R.w + rand) / NZ); gx++) for (let gz = Math.floor((R.z - rand) / NZ); gz <= Math.floor((R.z + R.d + rand) / NZ); gz++) for (const w of M.get(gx * 10000 + gz) ?? []) out.add(w);
    return out; };
  const zuGross = (g, R) => g.flaeche > Math.max(3500, 2.5 * R.w * R.d) || g.h > 30 || geschuetzt(g);
  const stecktInGrossbau = (R) => { for (const g of imUmkreis(hausGitter, R, 0)) {
    const [a, b, c, d] = g.bbox, ux = Math.min(c, R.x + R.w + 1) - Math.max(a, R.x - 1), uz = Math.min(d, R.z + R.d + 1) - Math.max(b, R.z - 1);
    if (ux > 0.3 && uz > 0.3 && (zuGross(g, R) || (g.flaeche > 300 && ux * uz < 0.5 * g.flaeche))) return true; } return false; };
  // (Nachbargebäude werden nie angeschnitten: ein Spielhaus ersetzt nur Gebäude, die zur Hälfte auf seiner Parzelle stehen, oder Kleinbauten)
  // Gleise halten 30 m Abstand zum Spielhaus (keine Schienen, die in den Laden laufen)
  const amGleis = (R) => { for (const [x, z] of imUmkreis(schienenGitter, R, 30)) if (x > R.x - 30 && x < R.x + R.w + 30 && z > R.z - 30 && z < R.z + R.d + 30) return true; return false; };
  const bauplatz = (ziel, W, D) => {
    const [tx, tz] = ins(ziel);
    let best = null, weich = null;
    // Raster um den Zielpunkt (4 m, nach Abstand sortiert), bis 420 m; erst Lage, dann Sicht auf das Haus
    for (const [dx, dz, ab] of RASTER) {
      if (best && ab > best.wert) break;
      const R = { x: Math.round(tx + dx - W / 2), z: Math.round(tz + dz - D / 2), w: W, d: D };
      if (!frei(R) || schuetztWahrzeichen(R) || !passt(R) || amGleis(R) || stecktInGrossbau(R)) continue;
      const vd = verdeckung(R);
      if (vd > 1) { const w2 = ab + 2000; if (!weich || w2 < weich.wert) weich = { R, wert: w2 }; continue; }
      const wert = ab + 900 * vd;
      if (!best || wert < best.wert) best = { R, wert };
    }
    if (best) return best.R;
    if (weich) return weich.R;   // nur verdeckte Plätze: der nächste davon, Verdecker räumt baueKartenstadt (Vorplatz)
    (globalThis.kartenNotplatz ??= []).push(ziel);
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
    // FUNDUS steht in Kartenstädten als Innenstadt-Geschäftshaus an einer Nebenlage, nicht als Fachmarkt auf der Brache
    const fundus = st.rolle === 'outlet' && def.standorte.fundus;
    const schluessel = fundus ? 'fundus' : st.lage;
    const liste = def.standorte[schluessel] ?? def.standorte.b;
    const nr = zaehler[schluessel] = (zaehler[schluessel] ?? -1) + 1;
    const mo = fundus ? masseOutlet({ ...st, lage: 'b' }) : null;
    const W = Math.round(mo?.w ?? st.w ?? 50), D = Math.round(mo?.d ?? st.d ?? 40);
    const R = bauplatz(liste[nr % liste.length], W, D);
    const typ = ROLLE[st.rolle] ?? 'slot:warenhaus';
    const p = neueParzelle('k-' + st.id, typ, R, st, lage);
    if (fundus) p.grafikLage = 'b';
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
  // Wege, die über einen Bauplatz führen, entfallen
  const aufPlatz = (x, z) => parzellen.some((p) => !p.leer && x > p.x - 1 && x < p.x + p.w + 1 && z > p.z - 1 && z < p.z + p.d + 1);
  const { strassen, kreuzungen } = strassennetz(K, aufPlatz);
  const G = def.kameraGrenze;
  const plan = {
    seed: eintrag.seed, typ: eintrag.typ, region: eintrag.region, archetyp: eintrag.archetyp, karte: name, stil,
    breite: K.breite, tiefe: K.tiefe, nx: 0, nz: 0,
    strassen, kreuzungen, bloecke: [], umland: [], diagonalen: [], zwickel: [], parzellen, standorte,
    slots: parzellen.filter((p) => p.typ.startsWith('slot:')), landmarken: [],
    einkaufslage: { xF: ex, zF: ez, x0: ex - 120, x1: ex + 120, z0: ez - 200, z1: ez + 200 },
    einkaufslagen: [], nebenzentren: [],
    // Start auf dem ersten 1a-Haus (wie in den Rasterstädten auf der Einkaufslage), sonst am festen Startpunkt
    start: (() => { const q = parzellen.find((p) => p.standort?.lage === '1a' && p.typ === 'slot:warenhaus'); return q ? [q.x + q.w / 2, q.z + q.d / 2] : [sx, sz]; })(),
    kameraGrenze: { x0: G[0] + ox, z0: G[1] + oz, x1: G[2] + ox, z1: G[3] + oz, sicht: def.sicht },
  };
  // Fahrbahnmaske nicht aufzählbar: Pläne werden gespeichert und geklont, Funktionen gehören nicht hinein
  Object.defineProperty(plan, 'aufFahrbahn', { value: K.aufFahrbahn, enumerable: false });
  return plan;
}

/**
 * Straßennetz für Verkehr und Figuren (leben.js): je OSM-Kante ein Straßenstück als Polylinie (achse 'p') mit den echten
 * Fahrspuren aus osm2streets (Versatz von der Bandmitte, Richtung). Knoten nur an Kreuzungen und Enden.
 * Teile über einem Bauplatz entfallen; die Kante wird dort getrennt.
 */
function strassennetz(K, aufPlatz = () => false) {
  const strassen = [], kreuzungen = [], knoten = new Map();
  const knotenBei = (schl, x, z) => { let k = knoten.get(schl); if (!k) { k = { x, z, arme: {} }; knoten.set(schl, k); kreuzungen.push(k); } return k; };
  K.netz.forEach((kante, ki) => {
    // Kante an Bauplätzen in zusammenhängende Läufe teilen
    const laeufe = [];
    let lauf = [];
    for (const p of kante.punkte) { if (aufPlatz(p[0], p[1])) { if (lauf.length > 1) laeufe.push(lauf); lauf = []; } else lauf.push(p); }
    if (lauf.length > 1) laeufe.push(lauf);
    laeufe.forEach((pts, li) => {
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = cum.at(-1);
      if (L < 4) return;
      // Knoten an echten Enden behalten die OSM-Knotennummer (verbindet Kanten), getrennte Enden bekommen eigene
      const anfang = li === 0 && pts[0] === kante.punkte[0] ? 'k' + kante.a : 'e' + ki + '-' + li + 'a';
      const ende = li === laeufe.length - 1 && pts.at(-1) === kante.punkte.at(-1) ? 'k' + kante.b : 'e' + ki + '-' + li + 'b';
      const s = { id: 'n' + ki + '-' + li, achse: 'p', pts, cum, von: 0, bis: L, mitte: 0,
        typ: kante.typ, breite: kante.typ === 'fussgaenger' ? 12 : kante.breite + 2 * 3.0, fahrbahn: kante.breite,
        gehweg: kante.typ === 'fussgaenger' ? 0 : 3.0, mittel: 0, einbahn: kante.einbahn, spurenKarte: kante.spuren, fussSeiten: kante.fussSeiten };
      strassen.push(s);
      knotenBei(anfang, pts[0][0], pts[0][1]).arme[s.id] = s;
      knotenBei(ende, pts.at(-1)[0], pts.at(-1)[1]).arme[s.id] = s;
    });
  });
  return { strassen, kreuzungen };
}

// ─────────────────────────────────────────── Geometrie
/** Puffer je Farbe und Raumzelle; am Ende eine Geometrie je Eintrag (wenige, große Teile für den KompaktSammler). */
class Puffer {
  constructor() { this.m = new Map(); }
  tri(farbe, x, z, P, N) {
    const k = farbe + '|' + Math.floor(x / ZELLE) + '|' + Math.floor(z / ZELLE);
    let e = this.m.get(k); if (!e) this.m.set(k, e = { farbe, p: [], n: [], len: 0 });
    e.p.push(P); e.n.push(N); e.len += P.length;
  }
  /** Direkt als Meshes mit Vertexfarben je Raumzelle in die Szene (wie KompaktSammler.bauen, ohne dessen Kopie und Prüfung). */
  bauen(scene) {
    const zellen = new Map(), c = new THREE.Color();
    for (const [k, e] of this.m) {
      if (!e.len) continue;
      const zk = k.slice(k.indexOf('|') + 1);
      let z = zellen.get(zk); if (!z) zellen.set(zk, z = { len: 0, teile: [] });
      z.len += e.len; z.teile.push(e);
    }
    for (const z of zellen.values()) {
      const P = new Float32Array(z.len), N = new Float32Array(z.len), C = new Float32Array(z.len);
      let o = 0;
      for (const e of z.teile) {
        c.set(e.farbe);
        const start = o;
        for (let i = 0; i < e.p.length; i++) { P.set(e.p[i], o); N.set(e.n[i], o); o += e.p[i].length; }
        for (let i = start; i < o; i += 3) { C[i] = c.r; C[i + 1] = c.g; C[i + 2] = c.b; }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      g.setAttribute('color', new THREE.BufferAttribute(C, 3));
      const m = new THREE.Mesh(g, vertexMat()); m.castShadow = true; m.receiveShadow = true; m.userData.karte = true;
      scene.add(m);
    }
    this.m.clear();
  }
  abgeben(S) {
    for (const e of this.m.values()) {
      if (!e.len) continue;
      const P = new Float32Array(e.len), N = new Float32Array(e.len);
      let o = 0;
      for (let i = 0; i < e.p.length; i++) { P.set(e.p[i], o); N.set(e.n[i], o); o += e.p[i].length; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      S.add(g, e.farbe);
    }
    this.m.clear();
  }
}

/** Baum aus einer einmal gebauten Vorlage (Stamm + Krone wie basis.baum), direkt in den Puffer: kein Geometrieobjekt je Baum. */
let BAUM_VORLAGE = null;
function baumSchnell(B, x, z, r, s = 1) {
  if (!BAUM_VORLAGE) {
    const stamm = new THREE.BoxGeometry(0.5, 2.2, 0.5).toNonIndexed(); stamm.translate(0, 1.3, 0);
    const krone = new THREE.IcosahedronGeometry(2.1, 0).toNonIndexed(); krone.translate(0, 3.6, 0);
    BAUM_VORLAGE = [stamm, krone].map((g) => ({ p: g.attributes.position.array, n: g.attributes.normal.array }));
  }
  const k = s * (0.85 + r() * 0.3), krone = waehle(r, FARBEN.baum);
  const st = BAUM_VORLAGE[0], kr = BAUM_VORLAGE[1];
  const P1 = new Array(st.p.length), P2 = new Array(kr.p.length);
  for (let i = 0; i < st.p.length; i += 3) { P1[i] = x + st.p[i] * s; P1[i + 1] = st.p[i + 1] * s; P1[i + 2] = z + st.p[i + 2] * s; }
  for (let i = 0; i < kr.p.length; i += 3) { P2[i] = x + kr.p[i] * k; P2[i + 1] = (kr.p[i + 1] - 3.6) * k + 3.6 * s; P2[i + 2] = z + kr.p[i + 2] * k; }
  B.tri(FARBEN.stamm, x, z, P1, st.n);
  B.tri(krone, x, z, P2, kr.n);
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

/** Fertig triangulierte Bodenschicht (kartenstadt-bauen.py): Punkte in Dezimetern, Indizes je Stück. */
function bodenStueck(B, st) {
  const y = HOEHE[st.art] ?? 0.03, farbe = bodenFarbe(st.art) ?? bodenFarbe('pflaster'), p = st.p, idx = st.i;
  if (!idx.length) return;
  const P = new Array(idx.length * 3), N = new Array(idx.length * 3);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 2, b = idx[t + 1] * 2, c = idx[t + 2] * 2;
    const ax = p[a] / 10, az = p[a + 1] / 10, bx = p[b] / 10, bz = p[b + 1] / 10, cx = p[c] / 10, cz = p[c + 1] / 10;
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const q = ny >= 0 ? [ax, az, bx, bz, cx, cz] : [ax, az, cx, cz, bx, bz];
    for (let k = 0; k < 3; k++) { const o = (t + k) * 3; P[o] = q[k * 2]; P[o + 1] = y; P[o + 2] = q[k * 2 + 1]; N[o] = 0; N[o + 1] = 1; N[o + 2] = 0; }
  }
  B.tri(farbe, p[0] / 10, p[1] / 10, P, N);
}

/** Dachfläche (eben, 3D, Punkte [x, z, y]) mit Normale nach oben; idx: vorberechnete Dreiecke (sonst triangulieren). */
function dachflaeche(B, ring, farbe, vorIdx = null) {
  let pts = ring;
  // Vorberechnete Indizes beziehen sich auf den gespeicherten (offenen) Ring: dann nichts abschneiden
  if (!vorIdx && pts.length > 1 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1] && pts[0][2] === pts.at(-1)[2]) pts = pts.slice(0, -1);
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
  let tri;
  if (vorIdx) { tri = []; for (let i = 0; i + 2 < vorIdx.length; i += 3) tri.push([vorIdx[i], vorIdx[i + 1], vorIdx[i + 2]]); }
  else {
    const proj = ay >= ax && ay >= az ? (p) => new THREE.Vector2(p[0], p[1]) : ax >= az ? (p) => new THREE.Vector2(p[1], p[2]) : (p) => new THREE.Vector2(p[0], p[2]);
    tri = THREE.ShapeUtils.triangulateShape(pts.map(proj), []);
  }
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
  if (art === 'bauwerk') fassade = '#b9b6ae';
  // Altbau: Steildach, Wohn- oder Mischnutzung, nicht hoch (Gründerzeit, Vorkriegsbestand)
  const altbau = !flach && !hoch && ['wohnen', 'gemischt'].includes(art) && g.h < 24;
  if (altbau && r() < 0.8) fassade = waehle(r, ALTBAU_FARBEN);
  if (PAL && art !== 'kirche') {
    fassade = waehle(r, hoch ? PAL.hoch : ['parkhaus', 'bauwerk'].includes(art) ? PAL.bau : PAL.fassade);
    dach = waehle(r, flach ? PAL.flach : PAL.steil);
  }
  return { r, art, hoch, flach, fassade, dach, altbau };
}

/** Quader entlang einer Wand (u = Wandrichtung, n = Außennormale), Mitte (cx, cy, cz), Maße w (entlang u), h, d (entlang n). */
function wandBox(B, farbe, cx, cy, cz, w, h, d, ux, uz, nx, nz) {
  const ecke = (su, sy, sn) => [cx + ux * su * w / 2 + nx * sn * d / 2, cy + sy * h / 2, cz + uz * su * w / 2 + nz * sn * d / 2];
  const P = [], N = [];
  const flaeche = (a, b, c, e, n) => { for (const q of [a, b, c, a, c, e]) { P.push(q[0], q[1], q[2]); N.push(n[0], n[1], n[2]); } };
  // vorne (+n), oben, Seiten ±u; Rückseite und Boden sieht die feste Kamera nie
  flaeche(ecke(-1, -1, 1), ecke(1, -1, 1), ecke(1, 1, 1), ecke(-1, 1, 1), [nx, 0, nz]);
  flaeche(ecke(-1, 1, 1), ecke(1, 1, 1), ecke(1, 1, -1), ecke(-1, 1, -1), [0, 1, 0]);
  flaeche(ecke(1, -1, 1), ecke(1, -1, -1), ecke(1, 1, -1), ecke(1, 1, 1), [ux, 0, uz]);
  flaeche(ecke(-1, -1, -1), ecke(-1, -1, 1), ecke(-1, 1, 1), ecke(-1, 1, -1), [-ux, 0, -uz]);
  // Umlauf je Fläche an die Normale anpassen (wandQuad-Logik): Dreiecke mit falscher Richtung umdrehen
  for (let t = 0; t < P.length; t += 9) {
    const e1 = [P[t + 3] - P[t], P[t + 4] - P[t + 1], P[t + 5] - P[t + 2]], e2 = [P[t + 6] - P[t], P[t + 7] - P[t + 1], P[t + 8] - P[t + 2]];
    const c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (c[0] * N[t] + c[1] * N[t + 1] + c[2] * N[t + 2] < 0) for (let k = 0; k < 3; k++) { const x = P[t + 3 + k]; P[t + 3 + k] = P[t + 6 + k]; P[t + 6 + k] = x; }
  }
  B.tri(farbe, cx, cz, P, N);
}

const ALTBAU_FARBEN = ['#ecdfc8', '#e6d3b3', '#dfe3e0', '#e9d6c4', '#d9c9ad', '#e8e1d2', '#d6dcd8', '#e3cfb6', '#cfd8d0', '#efe6d3'];
const NACHKRIEG_FARBEN = ['#e4e1d9', '#d9d6cd', '#e2dccf', '#cfd3d2', '#e6e0d2', '#d8d2c4'];
const dunkel = (c, um) => '#' + new THREE.Color(c).offsetHSL(0, 0, -um).getHexString();

/**
 * Fassade einer sichtbaren Wand: Hausabschnitte mit eigener Farbe (Parzellen der Blockrandbebauung), Sockel bzw. Ladenzone,
 * Geschossgesims, Fenster mit Faschen (Altbau), Bandfenster (Hochhaus), Balkone (Nachkrieg), Traufgesims.
 * Grundlinie a→b, Wandhöhe oben (Traufe), Außennormale (nx, nz).
 */
function fassadeAufWand(B, g, gs, ax, az, bx, bz, ya, yb, nx, nz, kern, detail) {
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L, uz = (bz - az) / L, o = 0.06;
  const P = (u) => [ax + ux * u, az + uz * u];
  const oben = Math.min(ya, yb, g.traufe > 2 ? g.traufe : g.h);
  const quad = (farbe, u0, u1, y0, y1, ab = o) => { const [x0, z0] = P(u0), [x1, z1] = P(u1); wandQuad(B, farbe, x0 + nx * ab, z0 + nz * ab, x1 + nx * ab, z1 + nz * ab, y0, y1, y0, y1, nx, nz); };
  const box = (farbe, u0, u1, y0, y1, tiefe) => { const [cx, cz] = P((u0 + u1) / 2); wandBox(B, farbe, cx + nx * tiefe / 2, (y0 + y1) / 2, cz + nz * tiefe / 2, u1 - u0, y1 - y0, tiefe, ux, uz, nx, nz); };
  // Hausabschnitte: Altbau- und Wohnzeilen werden in Parzellen von 9 bis 16 m geteilt, jede mit eigener Farbe
  const zeile = !gs.hoch && ['wohnen', 'gemischt', 'gewerbe'].includes(gs.art) && L > 13 && g.h < 30;
  const abschnitte = [];
  if (zeile) {
    const r = rng(hash(g.id + ':' + Math.round(ax) + ':' + Math.round(az)));
    let u = 0;
    while (u < L - 0.5) { let w = 9 + r() * 7; if (L - (u + w) < 7) w = L - u; abschnitte.push([u, u + w, waehle(r, PAL ? (gs.hoch ? PAL.hoch : PAL.fassade) : gs.altbau ? ALTBAU_FARBEN : NACHKRIEG_FARBEN)]); u += w; }
  } else abschnitte.push([0, L, gs.fassade]);
  // Wandflächen (dachseitig schräge Oberkante bei Giebeln)
  for (const [u0, u1, farbe] of abschnitte) {
    const [x0, z0] = P(u0), [x1, z1] = P(u1), t0 = u0 / L, t1 = u1 / L;
    wandQuad(B, farbe, x0, z0, x1, z1, 0, ya + (yb - ya) * t0, 0, ya + (yb - ya) * t1, nx, nz);
  }
  if (!detail || L < 2.4 || oben < 3 || gs.art === 'bauwerk') return;
  if (gs.art === 'parkhaus') {
    for (let y = 2.9; y < oben - 0.5; y += 2.9) { quad('#4a5157', 0.4, L - 0.4, y - 1.6, y - 0.45); box('#c9c7c1', 0, L, y - 0.45, y - 0.2, 0.25); }
    return;
  }
  const laden = kern && g.h > 7 && (gs.art === 'gewerbe' || gs.art === 'gemischt');
  const eg = laden ? 4.4 : 0;
  const kirche = gs.art === 'kirche';
  for (const [u0, u1, farbe] of abschnitte) {
    const w = u1 - u0;
    // Sockel bzw. Ladenzone mit Schaufenstern, Kragplatte und Geschossgesims
    if (laden) {
      quad(dunkel(farbe, 0.08), u0, u1, 0, eg, o * 0.5);
      const fenster = Math.max(1, Math.round(w / 4.5)), fb = w / fenster;
      for (let i = 0; i < fenster; i++) quad(i % 3 === 1 ? '#2f3a43' : FARBEN.laden, u0 + i * fb + 0.35, u0 + (i + 1) * fb - 0.35, 0.25, 3.3);
      box(heller(farbe, 0.05), u0, u1, eg - 0.35, eg, 0.35);
    } else if (!gs.hoch) quad(dunkel(farbe, 0.12), u0, u1, 0, 0.8, o * 0.5);
    if (gs.altbau && !laden && oben > 7) box(heller(farbe, 0.04), u0, u1, 3.6, 3.85, 0.18);
    // Fenster
    if (gs.hoch) {
      // Hochhaus: durchgehende Fensterbänder je Geschoss
      for (let y = eg + 1.2; y + 1.3 < oben - 0.6; y += 3.6) quad(FARBEN.glas, u0 + 0.5, u1 - 0.5, y, y + 2.1);
      continue;
    }
    const gh = kirche ? 7 : 3.3, raster = kirche ? 4.5 : gs.altbau ? 2.9 : 3.2;
    const fw = kirche ? 1.4 : gs.altbau ? 1.15 : 1.45, fh = kirche ? 4.5 : gs.altbau ? 1.9 : 1.5;
    const n = Math.max(1, Math.floor((w - 0.8) / raster)), rand = (w - n * raster) / 2;
    const fasche = heller(farbe, 0.07), balkon = !gs.altbau && gs.art === 'wohnen' && g.h > 8 && g.h < 25;
    for (let k = 0; ; k++) {
      const y = (eg || 0) + k * gh + gh * 0.55;
      if (y + fh / 2 > oben - 0.5) break;
      for (let i = 0; i < n; i++) {
        const u = u0 + rand + raster * (i + 0.5);
        if (gs.altbau && !kirche) quad(fasche, u - fw / 2 - 0.22, u + fw / 2 + 0.22, y - fh / 2 - 0.25, y + fh / 2 + 0.3, o * 0.6);
        quad(kirche ? '#4f5d68' : FARBEN.fenster, u - fw / 2, u + fw / 2, y - fh / 2, y + fh / 2);
        if (balkon && k >= 1 && i % 3 === 1) box(heller(farbe, 0.08), u - 1.3, u + 1.3, y - fh / 2 - 0.45, y - fh / 2 + 0.55, 1.2);
      }
    }
  }
  // Traufgesims über die ganze Wand (gibt jedem Haus eine klare Oberkante)
  if (!kirche && Math.abs(ya - yb) < 0.3) box(gs.hoch ? '#9ea6ad' : heller(abschnitte[0][2], 0.06), 0, L, oben - (gs.altbau ? 0.55 : 0.35), oben, gs.altbau ? 0.38 : 0.2);
}

/** Satteldächer: Gauben auf den zur Kamera geneigten Flächen, Schornsteine am First. */
function dachdetails(B, g, gs) {
  if (gs.flach || gs.hoch || gs.art === 'kirche') return;
  let first = null;
  g.dach.forEach((dr) => {
    const pts = offen(dr);
    if (pts.length < 3) return;
    for (const p of pts) if (!first || p[2] > first[2]) first = p;
    // Flächennormale
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; nx += (a[2] - b[2]) * (a[1] + b[1]); ny += (a[1] - b[1]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[2] + b[2]); }
    const l = Math.hypot(nx, ny, nz); if (!l) return;
    nx /= l; ny /= l; nz /= l; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    if (ny > 0.92 || ny < 0.35 || nx * BLICK.x + nz * BLICK.z < 0.1) return;
    // Traufkante: die zwei tiefsten Punkte
    const s = [...pts].sort((p, q) => p[2] - q[2]), [a, b] = s, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 8) return;
    const hl = Math.hypot(nx, nz), hx = nx / hl, hz = nz / hl, ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    const anz = Math.min(4, Math.floor(L / 6)), r = rng(hash(g.id + ':g' + Math.round(a[0])));
    if (r() < 0.35) return;
    const tief = 1.6, ysoll = (a[2] + b[2]) / 2 + 0.9;
    for (let i = 0; i < anz; i++) {
      const u = (L / anz) * (i + 0.5), cx = a[0] + ux * u - hx * (tief + 0.6), cz = a[1] + uz * u - hz * (tief + 0.6);
      wandBox(B, '#d9d4c8', cx, ysoll + 0.8, cz, 1.8, 1.6, tief, ux, uz, hx, hz);
      wandQuad(B, FARBEN.fenster, cx + hx * (tief / 2 + 0.02) - ux * 0.5, cz + hz * (tief / 2 + 0.02) - uz * 0.5, cx + hx * (tief / 2 + 0.02) + ux * 0.5, cz + hz * (tief / 2 + 0.02) + uz * 0.5, ysoll + 0.25, ysoll + 1.35, ysoll + 0.25, ysoll + 1.35, hx, hz);
    }
  });
  if (first && g.flaeche > 60) {
    const r = rng(hash(g.id + ':s'));
    const zahl = 1 + (g.flaeche > 400 ? 1 : 0);
    for (let i = 0; i < zahl; i++) {
      const x = first[0] + (r() - 0.5) * 6, z = first[1] + (r() - 0.5) * 6;
      wandBox(B, r() < 0.5 ? '#9c5d48' : '#8a8a86', x, first[2] + 0.4, z, 0.7, 2.0, 0.7, 1, 0, 0, 1);
    }
  }
}

/** Ein LoD2-Gebäude: Dachflächen, Wände aus den Außenkanten der Dachflächen, Fenster auf den sichtbaren Wänden. */
/** Douglas-Peucker für offene Ringe (2D). */
function vereinfache(pts, tol) {
  if (pts.length < 4) return pts;
  const dp = (a, b) => { let m = -1, mi = 0; const [ax, az] = pts[a], [bx, bz] = pts[b], L = Math.hypot(bx - ax, bz - az) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (az - pts[i][1]) - (ax - pts[i][0]) * (bz - az)) / L; if (d > m) { m = d; mi = i; } }
    return m > tol ? [...dp(a, mi).slice(0, -1), ...dp(mi, b)] : [pts[a], pts[b]]; };
  // am weitesten vom ersten Punkt entfernten Punkt teilen, damit der Ring geschlossen vereinfacht wird
  let w = 0, wi = 1; pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > w) { w = d; wi = i; } });
  const r = [...dp(0, wi).slice(0, -1), ...dp(wi, pts.length - 1)];
  return r.length >= 3 ? r : pts;
}
/**
 * Coffee-Abstraktion eines echten Gebäudes: Grundriss geglättet (1,5 m), Flachdach auf einer Höhe statt LoD2-Dachlandschaft.
 * Gründerzeit-Altbauten mit Steildach behalten ihr Dach (das prägt das Stadtbild).
 */
function abstrahiert(g) {
  const gs = gestalt(g);
  // Nur Flachdachbauten werden vereinfacht; Steildächer bleiben echt (sonst stehen Kisten neben Giebeln und wirken wie zwei Spiele)
  if (!gs.flach || !g.boden || g.boden.length < 3) return g;
  const ring = vereinfache(offen(g.boden).map((p) => [p[0], p[1]]), 1.5);
  if (ring.length < 3) return g;
  const h = Math.max(3, Math.round(g.h / 3) * 3);   // auf Geschosse gerundet
  return { ...g, dach: [ring.map(([x, z]) => [x, z, h])], dachIdx: null, boden: ring.map(([x, z]) => [x, z, 0]), h, traufe: h, dachTyp: '1000' };
}

function gebaeudeBauen(B, S, g, kern, detail = true) {
  const gs = gestalt(g);
  if (gs.art === 'dach' || gs.art === 'bruecke') {
    const farbe = gs.art === 'bruecke' ? '#8a8f94' : '#a7adb2';
    g.dach.forEach((dr, j) => dachflaeche(B, dr, farbe, g.dachIdx?.[j]));
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
  g.dach.forEach((dr, j) => {
    const pts = offen(dr);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const k = [schl(a), schl(b)].sort().join('|');
      zahl.set(k, (zahl.get(k) ?? 0) + 1);
      kanten.push([k, a, b]);
    }
    dachflaeche(B, dr, gs.dach, g.dachIdx?.[j]);
  });
  // Außen = die Seite der Kante, auf der kein Dach liegt (Probe neben der Kantenmitte; gilt auch für L-, U- und Hofgebäude)
  const dach2d = g.dach.map((dr) => offen(dr).map((p) => [p[0], p[1]]));
  const unterDach = (x, z) => dach2d.some((r) => imPolygon(x, z, r)) || (g.boden.length > 2 && imPolygon(x, z, g.boden));
  for (const [k, a, b] of kanten) {
    if (zahl.get(k) > 1) continue;
    const ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez);
    if (L < 0.3) continue;
    let nx = ez / L, nz = -ex / L;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    if (unterDach(mx + nx * 0.4, mz + nz * 0.4) && !unterDach(mx - nx * 0.4, mz - nz * 0.4)) { nx = -nx; nz = -nz; }
    if (nx * BLICK.x + nz * BLICK.z <= 0.02) continue; // Rückseiten sieht die feste Kamera nie
    fassadeAufWand(B, g, gs, a[0], a[1], b[0], b[1], a[2], b[2], nx, nz, kern, detail);
  }
  if (detail) dachdetails(B, g, gs);
  // Dachaufbauten auf großen Flachdächern
  if ((gs.flach || (g.traufe && g.h - g.traufe < 1.5)) && g.h > 6 && g.flaeche > 180 && g.boden.length > 2) {
    const [a, b, c, d] = g.bbox, anz = Math.min(4, 1 + Math.floor(g.flaeche / 900));
    // Große Dächer (Kaufhäuser, Hallen): je Gebäude eine eigene Gestaltung, damit nicht jedes Großdach gleich aussieht
    if (g.flaeche > 1500) {
      const r = gs.r, lang = c - a > d - b;
      const arten = g.flaeche > 8000 ? [1, 4, 2, 3] : [[1, 2, 3, 4][Math.floor(r() * 4)]];   // sehr große Dächer: Solarfeld, Oberlichter und Technik zusammen
      let solarFeld = null;   // [x0, z0, x1, z1] des Solarfelds; Oberlichter sparen es aus
      for (const art of arten) {
      // Prüfung gegen die Dachfläche selbst (Grundriss und Dach weichen bei LoD2 teils ab)
      const dr = (g.dach.length ? g.dach.reduce((m, q) => (q.length > m.length ? q : m)) : g.boden).map((p) => [p[0], p[1]]);
      const drin = (x, z) => imPolygon(x, z, dr) || imPolygon(x, z, g.boden);
      const innen = (px, pz, m) => drin(px, pz) && drin(px + m, pz + m) && drin(px - m, pz - m) && drin(px + m, pz - m) && drin(px - m, pz + m);
      const [ca, cb] = [(a + c) / 2, (b + d) / 2];
      if (art === 4 && g.flaeche > 20000) {   // Riesendach: Dachfelder in zwei Grautönen (Bauabschnitte) und Technikgeräte im Raster
        // unregelmäßige Bauabschnitte (Streifen verschiedener Breite) statt Kachelraster, Technik frei verteilt
        let u = lang ? a + 6 : b + 6; const ende = lang ? c - 6 : d - 6;
        while (u < ende) {
          const w = 18 + r() * 34, ton = ['#b4b8bb', '#c3c6c8', '#bcbfbf', '#aeb3b6'][Math.floor(r() * 4)];
          for (let v = (lang ? b : a) + 6; v < (lang ? d : c) - 6; v += 6) {
            const px = lang ? u + Math.min(w, ende - u) / 2 : v, pz = lang ? v : u + Math.min(w, ende - u) / 2;
            if (innen(px, pz, 4)) S.box(lang ? Math.min(w, ende - u) : 6.05, 0.06, lang ? 6.05 : Math.min(w, ende - u), px, g.h + 0.04, pz, ton);
          }
          u += w;
        }
        // Attika (dunkler Dachrand) und Technikgruppen: Lüftungsblöcke in Gruppen, damit das Dach lebendig wirkt
        const ring = offen(dr.length > 2 ? dr : g.boden);
        for (let i = 0; i < ring.length; i++) { const p0 = ring[i], p1 = ring[(i + 1) % ring.length], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); if (L < 1) continue;
          S.box(L, 0.7, 0.5, (p0[0] + p1[0]) / 2, g.h + 0.35, (p0[1] + p1[1]) / 2, '#9ea3a6', Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0])); }
        for (let k = 0; k < Math.floor(g.flaeche / 2500); k++) {
          const gx = a + (c - a) * (0.1 + r() * 0.8), gz = b + (d - b) * (0.1 + r() * 0.8);
          if (!innen(gx, gz, 8) || (solarFeld && gx > solarFeld[0] - 8 && gx < solarFeld[2] + 8 && gz > solarFeld[1] - 8 && gz < solarFeld[3] + 8)) continue;
          S.box(7, 2.2, 4.5, gx, g.h + 1.1, gz, '#a7adb1');
          for (let j = 0; j < 3; j++) S.box(1.5, 0.9, 1.5, gx - 2.5 + j * 2.5, g.h + 2.65, gz, '#7d858b');
          S.box(3, 0.8, 0.8, gx + 5.5, g.h + 0.4, gz + 2.5, '#c9cdd0');
        }
        for (let k = 0; k < Math.floor(g.flaeche / 900); k++) {
          const px = a + (c - a) * (0.08 + r() * 0.84), pz = b + (d - b) * (0.08 + r() * 0.84);
          if (!innen(px, pz, 3) || (solarFeld && px > solarFeld[0] - 4 && px < solarFeld[2] + 4 && pz > solarFeld[1] - 4 && pz < solarFeld[3] + 4)) continue;
          const t = r(); if (t < 0.5) S.box(2 + r() * 3, 1.2 + r(), 1.6 + r() * 2, px, g.h + 0.7, pz, '#8f969c'); else S.box(1.6, 1.4, 1.6, px, g.h + 0.7, pz, '#d9dcde');
        }
      }
      if (art === 4) {            // Lichtbänder (Einkaufszentrum): zwei, drei durchgehende Glasstreifen entlang der langen Achse
        const n = 2 + Math.floor(r() * 2), quer = lang ? d - b : c - a;
        for (let k = 1; k <= n; k++) {
          const v = (lang ? b : a) + quer * k / (n + 1);
          for (let u = (lang ? a : b) + 6; u < (lang ? c : d) - 6; u += 3) {
            const px = lang ? u : v, pz = lang ? v : u;
            if (!innen(px, pz, 3)) continue;
            if (solarFeld && px > solarFeld[0] - 3 && px < solarFeld[2] + 3 && pz > solarFeld[1] - 3 && pz < solarFeld[3] + 3) continue;
            S.box(lang ? 3.05 : 3.2, 0.9, lang ? 3.2 : 3.05, px, g.h + 0.45, pz, '#a9cbd9');
          }
        }
        continue;
      }
      if (art === 2 && arten.length > 1) {   // Gründach-Inseln auf großem Dach (nicht flächig)
        for (let k = 0; k < 5; k++) { const px = a + (c - a) * (0.15 + r() * 0.7), pz = b + (d - b) * (0.15 + r() * 0.7);
          if (!innen(px, pz, 7) || (solarFeld && px > solarFeld[0] - 8 && px < solarFeld[2] + 8 && pz > solarFeld[1] - 8 && pz < solarFeld[3] + 8)) continue;
          S.box(12, 0.15, 10, px, g.h + 0.1, pz, '#97ba74'); for (let j = 0; j < 3; j++) S.box(1.6, 0.9, 1.6, px - 4 + j * 4, g.h + 0.6, pz + (j % 2 ? 2 : -2), '#6f9a58'); }
        continue;
      }
      if (art === 0) {            // Sheddach-Oberlichter in Reihen, nur im Mittelteil
        const sv = 8 + r() * 5;
        for (let u = (lang ? a : b) + 8; u < (lang ? c : d) - 8; u += sv) for (let v = (lang ? b : a) + 8; v < (lang ? d : c) - 8; v += 14) {
          const px = lang ? u : v, pz = lang ? v : u; if (!innen(px, pz, 5)) continue;
          if (solarFeld && px > solarFeld[0] - 4 && px < solarFeld[2] + 4 && pz > solarFeld[1] - 4 && pz < solarFeld[3] + 4) continue;
          S.box(lang ? 2 : 9, 0.9, lang ? 9 : 2, px, g.h + 0.45, pz, '#dfe6ea');
        }
      } else if (art === 1) {     // ein großes Solarfeld in einer Dachhälfte
        const x0 = r() < 0.5 ? a : ca, z0 = r() < 0.5 ? b : cb; solarFeld = [x0, z0, x0 + (c - a) / 2, z0 + (d - b) / 2];
        for (let px = x0 + 5; px < x0 + (c - a) / 2 - 3; px += 4.2) for (let pz = z0 + 5; pz < z0 + (d - b) / 2 - 3; pz += 2.6) if (innen(px, pz, 3)) S.box(3.8, 0.25, 2.1, px, g.h + 0.35, pz, '#36495a');
      } else if (art === 2) {     // Gründach mit Kiesrand
        for (let px = a + 6; px < c - 6; px += 6) for (let pz = b + 6; pz < d - 6; pz += 6) if (innen(px, pz, 4)) S.box(6.05, 0.12, 6.05, px, g.h + 0.08, pz, '#97ba74');
        for (let k = 0; k < 6; k++) { const px = a + (c - a) * (0.2 + r() * 0.6), pz = b + (d - b) * (0.2 + r() * 0.6); if (innen(px, pz, 3)) S.box(2.2, 0.5, 2.2, px, g.h + 0.35, pz, '#6f9a58'); }
      } else {                    // Technikaufbau mit Lüftern und Treppenhauskopf
        const tw = 8 + r() * 8, tt = 6 + r() * 6;
        if (innen(ca, cb, 8)) { S.box(tw, 3, tt, ca, g.h + 1.5, cb, '#c3c0b8'); for (let k = 0; k < 4; k++) S.box(1.6, 1.2, 1.6, ca - tw / 2 + 2 + k * (tw - 4) / 3, g.h + 3.6, cb, '#8f969c'); }
        const sx = a + (c - a) * 0.2, sz = b + (d - b) * 0.75; if (innen(sx, sz, 3)) S.box(4, 3.2, 4, sx, g.h + 1.6, sz, '#b9b5ad');
      }
      }
    }
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
    // Straßenbahn: flaches Bett knapp unter Fahrbahnhöhe (auf Straßen verdeckt, im Grünen und im Betriebshof sichtbar)
    if (art === 'tram') S.box(L + 0.4, 0.06, 2.9, mx, 0.026, mz, '#9b958a', ry);
    else S.box(L + 0.4, 0.24, breit, mx, HOEHE.schotter, mz, bodenFarbe('schotter'), ry);
    for (const s of [-1, 1]) S.box(L + 0.05, 0.16, 0.14, mx + qx * s * spur / 2, art === 'tram' ? 0.12 : 0.3, mz + qz * s * spur / 2, PAL ? '#8a8279' : BODEN.schiene, ry);
  }
}

/** Deko aus den Kartendaten setzen: Baumarten mit Kit-Prototypen, Hecken als niedrige Büsche, Möbel, Gartenlauben. */
function dekoSetzen(I, B, deko, aufSpielhaus = () => false) {
  const r = rng(91), n = deko.typ.length, art = deko.arten;
  for (let i = 0; i < n; i++) {
    const a = art[deko.typ[i] - 1], x = deko.p[i * 2] / 10, z = deko.p[i * 2 + 1] / 10, w = (deko.w[i] / 255) * Math.PI * 2;
    if (aufSpielhaus(x, z)) continue;
    if (a === 'linde' || a === 'platane' || a === 'kastanie' || a === 'birke' || a === 'nadel' || a === 'pappel') baumSetzen(I, a, x, 0, z, r, 0.85 + r() * 0.35);
    else if (a === 'strassenbaum') baumSetzen(I, r() < 0.55 ? 'platane' : 'linde', x, 0.12, z, r, 0.9 + r() * 0.2, true);
    else if (a === 'busch') I.setze('busch', x, 0.03, z, w, 0.8 + r() * 0.6, [waehle(r, ['#6aa35c', '#7cb369', '#5f9a56', '#88bd70'])]);
    else if (a === 'hecke') I.setze('busch', x, 0.03, z, w, [0.9, 0.6, 0.9], ['#4f8a49']);
    else if (a === 'laube') laube(B, x, z, w, r);
    else if (a === 'laterne' || a === 'altlaterne') I.setze(a, x, 0.12, z, w, 1);
    else I.setze(a, x, 0.12, z, w, 1, a === 'litfass' ? [waehle(r, ['#d8cfb8', '#e6dcc4']), waehle(r, ['#c9483e', '#2f6f8f', '#d39a2b']), waehle(r, ['#3f7d56', '#6b4f8f', '#e8e2d2'])] : null);
  }
}

/** Bahnsteigdach: Dachplatte auf 5 m über dem Bahnsteig, Stützen in der Mitte der Längsachse. */
function bahnsteigdach(B, ring) {
  const pts = offen(ring); if (pts.length < 3) return;
  const y = 5.0, farbe = PAL ? '#c9d6dc' : '#c3c8cc';
  dachflaeche(B, pts.map((p) => [p[0], p[1], y]), farbe);
  // Stirnseite der Platte (sichtbare Kanten)
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez);
    if (L < 0.5) continue;
    let nx = ez / L, nz = -ex / L;
    if (imPolygon((a[0] + b[0]) / 2 + nx * 0.3, (a[1] + b[1]) / 2 + nz * 0.3, pts)) { nx = -nx; nz = -nz; }
    if (nx * BLICK.x + nz * BLICK.z > 0.02) wandQuad(B, '#8d949a', a[0], a[1], b[0], b[1], y - 0.45, y, y - 0.45, y, nx, nz);
  }
  // Stützen entlang der langen Achse
  const [x0, z0, x1, z1] = bboxVon(pts), lang = x1 - x0 > z1 - z0;
  const mitte = lang ? (z0 + z1) / 2 : (x0 + x1) / 2, von = lang ? x0 : z0, bis = lang ? x1 : z1;
  for (let u = von + 4; u < bis - 2; u += 10) {
    const x = lang ? u : mitte, z = lang ? mitte : u;
    if (imPolygon(x, z, pts)) wandBox(B, '#6b7278', x, (y + 0.55) / 2, z, 0.35, y - 0.55, 0.35, 1, 0, 0, 1);
  }
}

/** Erhöhter Bahnsteig (0,76 m) mit sichtbarer Kante und weißer Sicherheitslinie. */
function bahnsteig(B, ring) {
  const pts = offen(ring); if (pts.length < 3) return;
  const y = 0.76;
  dachflaeche(B, pts.map((p) => [p[0], p[1], y]), PAL ? '#c9c4bb' : '#bdb8ae');
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ex = b[0] - a[0], ez = b[1] - a[1], L = Math.hypot(ex, ez);
    if (L < 0.3) continue;
    let nx = ez / L, nz = -ex / L;
    if (imPolygon((a[0] + b[0]) / 2 + nx * 0.3, (a[1] + b[1]) / 2 + nz * 0.3, pts)) { nx = -nx; nz = -nz; }
    if (nx * BLICK.x + nz * BLICK.z > 0.02) wandQuad(B, '#8f8a80', a[0], a[1], b[0], b[1], 0, y, 0, y, nx, nz);
    // Sicherheitslinie 0,8 m innen an langen Kanten
    if (L > 8) { const ix = -nx * 0.8, iz = -nz * 0.8, qx = -nx * 0.95, qz = -nz * 0.95;
      dachflaeche(B, [[a[0] + ix, a[1] + iz, y + 0.01], [b[0] + ix, b[1] + iz, y + 0.01], [b[0] + qx, b[1] + qz, y + 0.01], [a[0] + qx, a[1] + qz, y + 0.01]], '#f4f1ea'); }
  }
}
/** Bahnsteigdach als Modul: Platte 4,5 m über dem Bahnsteig, Stützen in der Achse alle 10 m, dunkle Traufkante. */
function dachModul(B, [x, z, ux, uz, L, Bq]) {
  const y = 0.76 + 4.5, qx = -uz, qz = ux, a = L / 2, b = Bq / 2;
  const P = (s, t, h) => [x + ux * s * a + qx * t * b, z + uz * s * a + qz * t * b, h];
  const farbe = PAL ? '#b9cbd3' : '#b7bcc0';
  dachflaeche(B, [P(-1, -1, y), P(1, -1, y), P(1, 1, y), P(-1, 1, y)], farbe);
  for (const [s0, t0, s1, t1, nx, nz] of [[-1, -1, 1, -1, -qx, -qz], [1, 1, -1, 1, qx, qz], [1, -1, 1, 1, ux, uz], [-1, 1, -1, -1, -ux, -uz]]) {
    if (nx * BLICK.x + nz * BLICK.z <= 0.02) continue;
    const p0 = P(s0, t0, 0), p1 = P(s1, t1, 0);
    wandQuad(B, '#6f777e', p0[0], p0[1], p1[0], p1[1], y - 0.35, y, y - 0.35, y, nx, nz);
  }
  for (let u = -a + 3; u <= a - 3; u += 10) wandBox(B, '#5f666c', x + ux * u, (0.76 + y) / 2, z + uz * u, 0.3, y - 0.76, 0.3, ux, uz, qx, qz);
}
/** Abgestellter Zugwagen (26 m): Typ 0 Regionalzug rot/weiß, Typ 1 S-Bahn rot; Endwagen mit abgeschrägter Front. */
function zugwagen(B, [x, z, w, typ, ende]) {
  const ux = Math.cos(w), uz = -Math.sin(w), L = 25.6, H = 3.6, Bq = 2.9, y0 = 0.6;
  let qx = -uz, qz = ux; if (qx * BLICK.x + qz * BLICK.z < 0) { qx = -qx; qz = -qz; }   // Langseite zur Kamera
  const koerper = typ === 0 ? '#f1eee8' : '#d3352c', band = typ === 0 ? '#d3352c' : '#f1eee8';
  wandBox(B, koerper, x, y0 + H / 2, z, L, H, Bq, ux, uz, qx, qz);
  wandBox(B, '#2f3a44', x, y0 + H * 0.62, z, L - 1.2, 0.9, Bq + 0.04, ux, uz, qx, qz);   // Fensterband
  wandBox(B, band, x, y0 + 0.55, z, L, 0.35, Bq + 0.05, ux, uz, qx, qz);
  wandBox(B, '#9aa1a6', x, y0 + H + 0.12, z, L - 2, 0.24, Bq - 0.6, ux, uz, qx, qz);   // Dach
  if (ende) { const s = ende === 1 ? -1 : 1; wandBox(B, '#2f3a44', x + ux * s * (L / 2 - 0.2), y0 + H * 0.66, z + uz * s * (L / 2 - 0.2), 0.5, 1.1, Bq - 0.4, ux, uz, qx, qz); }
}
const PARKFARBEN = ['#c9483e', '#2f6f8f', '#e6e2d9', '#3c4148', '#8a9199', '#d39a2b', '#3f7d56', '#6b4f8f'];
/** Geparktes Auto auf einem Stellplatz. */
function parkauto(B, x, z, w, f) {
  const ux = Math.cos(w), uz = -Math.sin(w);
  let qx = -uz, qz = ux; if (qx * BLICK.x + qz * BLICK.z < 0) { qx = -qx; qz = -qz; }
  wandBox(B, PARKFARBEN[f % PARKFARBEN.length], x, 0.75, z, 3.9, 1.2, 1.7, ux, uz, qx, qz);
  wandBox(B, '#718d9d', x, 1.6, z, 2.0, 0.55, 1.55, ux, uz, qx, qz);
}

/** Gartenlaube: kleines Holzhaus mit Satteldach. */
function laube(B, x, z, w, r) {
  const ux = Math.cos(w), uz = -Math.sin(w), nx = -uz, nz = ux;
  const farbe = waehle(r, ['#9c7a55', '#7f6a4f', '#b39b72', '#6f8a6a', '#c9b48c']);
  wandBox(B, farbe, x, 1.1, z, 3.2, 2.2, 2.6, ux, uz, nx, nz);
  wandBox(B, waehle(r, ['#7c4a3a', '#5d666e', '#4f5a52']), x, 2.35, z, 3.6, 0.3, 3.0, ux, uz, nx, nz);
  wandQuad(B, FARBEN.fenster, x + nx * 1.32 - ux * 0.7, z + nz * 1.32 - uz * 0.7, x + nx * 1.32 + ux * 0.1, z + nz * 1.32 + uz * 0.1, 1.0, 1.7, 1.0, 1.7, nx, nz);
}

/**
 * Baut die Kartenstadt in den Sammler und ruft für Spielhäuser/HQ die Kit-Bauer (wie baueStadt).
 * Rückgabe wie baueStadt: { box, hoehen, dachFlaechen, teileStrasse, teileHaeuser, instanzen, drawCallsInstanzen }.
 */
export function baueKartenstadt(S, scene, plan, bauer, o = {}) {
  const K = kartenDaten(plan.karte, plan.stil), def = K.def;
  PAL = K.stil === 'coffee' ? COFFEE : null;
  const [ox, oz] = K.ursprung, [kx, kz] = [def.kern[0] + ox, def.kern[1] + oz];
  const kern = (x, z) => Math.hypot(x - kx, z - kz) < def.kern[2];
  const B = new Puffer();
  const t0 = S.anzahl, z0 = performance.now(); const zeit = {};
  // Umland bis weit über den Kartenrand, damit die Kamera nie ins Leere sieht
  boden(B, [[-1200, -1200], [K.breite + 1200, -1200], [K.breite + 1200, K.tiefe + 1200], [-1200, K.tiefe + 1200]], HOEHE.umland, bodenFarbe('umland'));
  boden(B, [[0, 0], [K.breite, 0], [K.breite, K.tiefe], [0, K.tiefe]], HOEHE.pflaster, bodenFarbe('pflaster'));
  for (const st of K.boden) bodenStueck(B, st);
  for (const g of K.gleise) gleis(S, g.punkte, g.art);
  // Bäume, Hecken, Straßenmöbel und Lauben (vorberechnet in kartenstadt-bauen.py) als Instanzen wie in den Rasterstädten
  const I = scene ? new Instanzer() : null;
  const aufSpielhaus = (x, z) => plan.parzellen.some((p) => !p.leer && x > p.x - 1.5 && x < p.x + p.w + 1.5 && z > p.z - 1.5 && z < p.z + p.d + 1.5);
  // Gleisnähe (Raster 2 m): Bäume mit Kronen über Gleisen und Bahnsteigen entfallen
  const GZ2 = 2, gleisNah = new Set();
  for (const g of K.gleise) for (let i = 1; i < g.punkte.length; i++) {
    const [x0, z0] = g.punkte[i - 1], [x1, z1] = g.punkte[i], L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 1);
    for (let j = 0; j <= n; j++) { const x = x0 + (x1 - x0) * j / n, z = z0 + (z1 - z0) * j / n;
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) gleisNah.add((Math.floor(x / GZ2) + dx) * 100000 + Math.floor(z / GZ2) + dz); }
  }
  const amGleisBaum = (x, z) => gleisNah.has(Math.floor(x / GZ2) * 100000 + Math.floor(z / GZ2));
  if (I && K.deko) dekoSetzen(I, B, K.deko, (x, z) => aufSpielhaus(x, z) || amGleisBaum(x, z));
  const t1 = S.anzahl; zeit.boden = performance.now() - z0;
  // Bauplätze der Spielhäuser freiräumen: echte Gebäude, deren Mitte auf einer Parzelle liegt, entfallen
  const platz = plan.parzellen.filter((p) => !p.leer);
  // Echte Gebäude entfallen nur, wenn sie auf dem Bauplatz stehen (Mitte darauf oder mehr als 15 % ihrer Fläche)
  // Sichtachse: Gebäude bis 30 m Höhe, die vor einem Spielhaus (zur Kamera hin, bis 60 m) mehr als 6 % seiner Ansicht verdecken, entfallen (Vorplatz)
  const S2 = Math.SQRT2, COS = Math.cos(Math.PI / 6), SIN = Math.sin(Math.PI / 6);
  const bild = (x, z, y) => [(x - z) / S2, y * COS - ((x + z) / S2) * SIN];
  const rechteck = (a, b, c, d, h) => { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, z] of [[a, b], [c, b], [c, d], [a, d]]) for (const y of [0, h]) { const [u, v] = bild(x, z, y); x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); }
    return [x0, y0, x1, y1]; };
  const ansicht = platz.map((p) => ({ p, r: rechteck(p.x, p.z, p.x + p.w, p.z + p.d, 20), tiefe: p.x + p.w / 2 + p.z + p.d / 2 - 20 }));   // auch seitlich vorn stehende Häuser
  const schutzB = (def.wahrzeichen ?? []).map(([x, z]) => [x + ox, z + oz]);
  const wahrzeichen = (g) => schutzB.some(([x, z]) => x > g.bbox[0] - 30 && x < g.bbox[2] + 30 && z > g.bbox[1] - 30 && z < g.bbox[3] + 30);
  const verdecktLaden = (g) => g.h <= 60 && !wahrzeichen(g) && ansicht.some(({ p, r, tiefe }) => {
    if (g.mx + g.mz <= tiefe || Math.hypot(g.mx - p.x - p.w / 2, g.mz - p.z - p.d / 2) > 90 + Math.max(p.w, p.d) / 2) return false;
    const q = rechteck(...g.bbox, g.h), f = (r[2] - r[0]) * (r[3] - r[1]);
    return Math.max(0, Math.min(r[2], q[2]) - Math.max(r[0], q[0])) * Math.max(0, Math.min(r[3], q[3]) - Math.max(r[1], q[1])) > 0.03 * f;
  });
  const vorplatz = [];
  const frei = (g) => !verdecktLaden(g) && !platz.some((p) => {
    if (g.mx > p.x - 1 && g.mx < p.x + p.w + 1 && g.mz > p.z - 1 && g.mz < p.z + p.d + 1) return true;
    const [a, b, c, d] = g.bbox, ux = Math.max(0, Math.min(c, p.x + p.w + 1) - Math.max(a, p.x - 1)), uz = Math.max(0, Math.min(d, p.z + p.d + 1) - Math.max(b, p.z - 1));
    // Jedes Gebäude, das die Parzelle (mit 1 m Rand) berührt, entfällt; große Nachbarn schließt die Bauplatzsuche vorher aus
    return ux > 0.3 && uz > 0.3;
  });
  const [dx, dz, dr] = [def.detail?.[0] ?? def.kern[0], def.detail?.[1] ?? def.kern[1], def.detail?.[2] ?? 900];
  const coffee = K.stil === 'coffee';
  for (const g of K.gebaeude) {
    const art = gebaeudeArt(g.fkt);
    if (art === 'dach' || art === 'bruecke') continue;
    if ((g.flaeche < 400 || g.h < 7) && amGleisBaum(g.mx, g.mz)) continue;   // Häuschen zwischen Gleisen (Stellwerksbuden, Schuppen) entfallen             // LoD2-Überdachungen (ersetzt durch Bahnsteigdächer) und Brückenplatten (Straßen und Gleise liegen flach)
    { const m = Math.min(g.bbox[2] - g.bbox[0], g.bbox[3] - g.bbox[1]); if ((m < 3 && g.h > 8) || (m < 6 && g.h > 12 && g.h > 3 * m)) continue; }   // Masten, Stelen, Treppentürme   // Masten, Stelen, Werbepylone: wirken als schwebende Scheiben
    if (coffee && (art === 'bauwerk' || g.flaeche < 50 || g.h < 2.5)) continue;   // Coffee: keine Kleinbauten, Masten, Schuppen
    if (frei(g)) gebaeudeBauen(B, S, coffee ? abstrahiert(g) : g, kern(g.mx, g.mz), Math.hypot(g.mx - (dx + ox), g.mz - (dz + oz)) < dr);
    else if (I && !aufSpielhaus(g.mx, g.mz)) vorplatz.push(g);   // vor oder neben dem Laden entfernt: Vorplatz
  }
  // Vorplätze vor den Läden (dort entfernte Gebäude): Baumraster mit Bänken statt leerer Fläche
  { const rv = rng(4711);
    for (const g of vorplatz) {
      const [a, b, c, d] = g.bbox;
      for (let x = a + 4; x < c - 2; x += 9) for (let z = b + 4; z < d - 2; z += 9) {
        if (aufSpielhaus(x, z) || amGleisBaum(x, z)) continue;
        // nur auf der Grundfläche des entfernten Gebäudes, nie auf Fahrbahn, Gleis oder Bahnsteig
        if (g.boden.length > 2 && !imPolygon(x, z, g.boden)) continue;
        if ([[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]].some(([u, v]) => K.aufFahrbahn(x + u, z + v))) continue;
        if (K.bahnsteige.some((r) => imPolygon(x, z, r))) continue;
        if (rv() < 0.65) baumSetzen(I, rv() < 0.5 ? 'platane' : 'linde', x, 0, z, rv, 0.85 + rv() * 0.3);
        else I.setze('bank', x, 0.12, z, rv() < 0.5 ? 0 : Math.PI / 2, 1);
      }
    } }
  const nahLaden = (x, z) => platz.some((p) => x > p.x - 4 && x < p.x + p.w + 4 && z > p.z - 4 && z < p.z + p.d + 4);
  // Vorplatz aus Pflaster rund um jedes Spielhaus (8 m): Kunden gehen nicht über Rasen zum Eingang
  for (const p of platz) boden(B, [[p.x - 8, p.z - 8], [p.x + p.w + 8, p.z - 8], [p.x + p.w + 8, p.z + p.d + 8], [p.x - 8, p.z + p.d + 8]], HOEHE.platz + 0.004, bodenFarbe('platz'));
  for (const ring of K.bahnsteige) bahnsteig(B, ring);
  // Tunnelportale: Straße taucht in eine Unterführung ab (Stützwände, Portalbalken), statt stumpf zu enden
  for (const k of K.netz) for (const [bit, i0, i1] of [[1, 0, 1], [2, -1, -2]]) {
    if (!(k.mund & bit) || k.punkte.length < 2) continue;
    const pe = k.punkte.at(i0), pn = k.punkte.at(i1), L = Math.hypot(pn[0] - pe[0], pn[1] - pe[1]); if (L < 1) continue;
    const ux = (pe[0] - pn[0]) / L, uz = (pe[1] - pn[1]) / L, qx = -uz, qz = ux, w = Math.max(5, k.breite) / 2 + 0.4;
    for (const sgn of [-1, 1]) wandBox(B, '#b9b4aa', pe[0] - ux * 5 + qx * sgn * w, 0.6, pe[1] - uz * 5 + qz * sgn * w, 10, 1.2, 0.6, ux, uz, qx, qz);
    wandBox(B, '#a8a399', pe[0], 2.0, pe[1], 0.9, 1.4, 2 * w + 0.6, ux, uz, qx, qz);
    wandBox(B, '#2b2f34', pe[0] + ux * 0.5, 0.65, pe[1] + uz * 0.5, 0.3, 1.3, 2 * w - 0.4, ux, uz, qx, qz);
  }
  K.dachModule.forEach((m, i) => { if (!K.daecher[i].some(([x, z]) => nahLaden(x, z))) dachModul(B, m); });
  for (const z of K.zuege) zugwagen(B, z);
  if (I) for (const [x, z, w, f] of K.parkautos) if (!nahLaden(x, z) && !amGleisBaum(x, z)) parkauto(B, x, z, w, f);
  zeit.gebaeude = performance.now() - z0 - zeit.boden; if (scene) { B.bauen(scene); I?.bauen(scene); } else B.abgeben(S); zeit.abgeben = performance.now() - z0 - zeit.boden - zeit.gebaeude;
  const hoehen = new Map(), dachFlaechen = [];
  let maxH = 20;
  if (!o.ohneHaeuser) for (const p of plan.parzellen) {
    if (p.leer) { hoehen.set(p.id, 20); continue; }
    const { ergebnis, dachFlaechen: dach } = dachFlaechenBeimBau(S, p, () => bauerFuer(bauer, p.typ)(S, scene, p));
    dachFlaechen.push(...dach);
    const h = ergebnis?.hoehe ?? 12;
    hoehen.set(p.id, h); maxH = Math.max(maxH, h);
  }
  zeit.haeuser = performance.now() - z0 - zeit.boden - zeit.gebaeude - zeit.abgeben;
  if (typeof window !== 'undefined') window.kartenZeit = zeit;
  return {
    box: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(plan.breite, maxH, plan.tiefe)),
    hoehen, dachFlaechen, teileStrasse: t1 - t0, teileHaeuser: S.anzahl - t1, instanzen: 0, drawCallsInstanzen: 0,
  };
}

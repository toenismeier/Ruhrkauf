// Stadtgerüst für Turnaround-Tycoon: Straßenraster, Blöcke, Parzellen, Straßenraum, Verkehr und Kartenmarker.
// Bildsprache Coffee Inc 2. Koordinaten wie basis.js: Meter, y oben, sichtbar sind +x (rechts) und +z (links).
//
// Ablauf:   const plan = stadtplan(seed, { blockeX, blockeZ, typ });          // reine Daten
//           const erg  = baueStadt(S, scene, plan, bauer);                     // Geometrie
//           setzeMarker(scene, plan, erg, [{ parzelle: 'p12', art: 'hartwig' }]);
//
// bauer: { stadthaus(S, scene, p), eck(...), 'slot:warenhaus'(...), 'slot:kirche'(...), ... } → { hoehe }
// Fehlt ein Eintrag, greift: exakter Typ → 'slot' (für slot:*) → stadthaus → Platzhalter.
import { THREE, rng, waehle, zw, FARBEN, mat, heller, dunkler, fensterRaster, gesims, markise, dachProfil, marker, textTextur, schild, baum, LOD } from './basis.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bergHoehe, gelaende, rebzeilen } from './gelaende.js';

// ====================================================================================
// Konstanten
// ====================================================================================
export const YG = 0.32;          // Oberkante Gehweg
export const WASSER_Y = -2.2;    // Wasserspiegel
const F = {
  asphalt: FARBEN.asphalt, kopfstein: '#a39b8f', bord: '#bdb8ad', gehweg: FARBEN.gehweg, pflaster: '#e4ddcf', pflasterMitte: '#d6ccba', fuge: '#cfc5b2',
  markierung: FARBEN.markierung, rasen: FARBEN.rasen, hof: '#9dc68f', weg: '#e8dec6', kies: '#bdb4a5', schotter: '#958e83',
  schwelle: '#6e5a48', schiene: '#a7adb3', metall: '#6b7177', dunkel: '#2c3136', holz: '#8a6a4a', glas: '#3f5260', glasHell: '#a8c8d3',
  kai: '#cfc7b6', stein: '#d6cfc1', licht: '#fff3c4', wasser: FARBEN.wasser, gruen: '#2f4a3c', stamm: FARBEN.stamm,
};
const AUTOFARBEN = ['#d04a3f', '#2f63b5', '#f1f1ee', '#2a2d31', '#e0b23c', '#8c9aa6', '#5b8f5a', '#c9ccd0', '#7a2f35', '#3b4f6b', '#f1f1ee', '#2a2d31'];
const OBERTEIL = ['#d04a3f', '#2f63b5', '#e8e4dc', '#e0b23c', '#5b8f5a', '#8d5fbf', '#ef8b4c', '#2b2b2b', '#4aa3b5', '#f4f4f2', '#b23a5a'];
const HOSE = ['#2b3a55', '#3a3a3a', '#6b5a48', '#20304a', '#8a8f96', '#4d3b2f'];
const HAUT = ['#f1c9a5', '#e6b38f', '#d9a77f', '#a8714f', '#7a4f36'];
const HAAR = ['#2b211b', '#5a3b22', '#c9a35a', '#1a1a1a', '#8a8a8a', '#a0522d'];
// Ost-Städte: gedeckte Pastelltöne kleiner Zweitakter neben heutigen Autos
const AUTOFARBEN_OST = ['#e8e2c8', '#9fb8b4', '#c9b98c', '#b9c6a0', '#d9cfb4', '#7f97a8', '#c46b4c', '#e0c46a', '#a7b9c9', '#efe9dc'];
let ostVerkehr = false;
const KRONE = { birke: ['#8fbf6c', '#9cc779', '#86b866'], linde: ['#6fa860', '#78b067', '#679e58'], kastanie: ['#5a9450', '#4f8a49'], platane: ['#86b86a', '#7cb369'], pappel: ['#6aa35c', '#5f9a56'], nadel: ['#3f7a4f', '#4a8758'], kugel: ['#7cb369', '#88bd70'], busch: ['#6aa35c', '#7cb369', '#b9d58f'] };

const klemm = (v, a, b) => Math.max(a, Math.min(b, v));
const ganz = (r) => Math.floor(r() * 1e9);

// ====================================================================================
// 1. STADTPLAN (reine Daten, siehe stadtplan.js)
// ====================================================================================
export { stadtplan, rasterPlan, LINIEN, TYPEN, REGIONEN, VIERTEL, ARCHETYPEN, LANDMARKEN, registriereArchetyp } from './stadtplan.js';
import { TYPEN, intervalleMinus, wahlGewichtet, FLAECHEN } from './stadtplan.js';
import './archetypen/index.js';   // registrierte Archetypen (Ost u. a.) und ihre Slot-Bauer

/** Box3 um einen Zellbereich (Nennraster, für Kamera-Ausschnitte). */
export function ausschnitt(plan, i0, j0, i1, j1, hoehe = 25) {
  i0 = klemm(i0, 0, plan.nx - 1); i1 = klemm(i1, 0, plan.nx - 1); j0 = klemm(j0, 0, plan.nz - 1); j1 = klemm(j1, 0, plan.nz - 1);
  const x0 = plan.spalten.x[i0], x1 = plan.spalten.x[i1] + plan.spalten.w[i1];
  const z0 = plan.reihen.z[j0], z1 = plan.reihen.z[j1] + plan.reihen.d[j1];
  return new THREE.Box3(new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, hoehe, z1));
}

// ====================================================================================
// 2. INSTANZER (InstancedMesh für massenhaft wiederholte Props)
// ====================================================================================
const B = (w, h, d, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); return g.translate(x, y, z); };
const C = (rt, rb, h, seg, x = 0, y = 0, z = 0) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
const K = (r, x, y, z, sx = 1, sy = 1, sz = 1, det = 1) => new THREE.IcosahedronGeometry(r, det).scale(sx, sy, sz).translate(x, y, z);
let _weiss = null;
const weiss = () => (_weiss ??= new THREE.MeshLambertMaterial({ color: '#ffffff' }));

/**
 * Sammelt Instanzen je Prop-Typ. Ein Prop besteht aus Teilen [Geometrie, Farbe | Slotnummer].
 * Teile mit Slotnummer bekommen die Farbe je Instanz (setColorAt). Ein Teil = ein Draw Call für alle Instanzen.
 */
export class Instanzer {
  constructor() { this.protos = new Map(); this.n = 0; definiereProps(this); }
  def(name, teile, schatten = true) {
    const gr = new Map();
    for (const [g0, f] of teile) {
      const g = g0.index ? g0.toNonIndexed() : g0;
      for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a);
      const k = typeof f === 'number' ? '§' + f : f.toLowerCase();
      if (!gr.has(k)) gr.set(k, []);
      gr.get(k).push(g);
    }
    this.protos.set(name, { teile: [...gr].map(([k, gs]) => ({ k, geo: mergeGeometries(gs) })), schatten, inst: [] });
  }
  /** s: Zahl oder [sx, sy, sz]; farben: Array für die Slots 0, 1, 2 … */
  setze(name, x, y, z, ry = 0, s = 1, farben = null) {
    if (LOD.stufe === 'fern' && FERN_WEG.has(name)) return;
    const p = this.protos.get(name);
    if (!p) throw new Error('Prop fehlt: ' + name);
    p.inst.push([x, y, z, ry, s, farben]);
    this.n++;
  }
  bauen(scene) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), achse = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    let calls = 0;
    for (const [art, p] of this.protos) {
      if (!p.inst.length) continue;
      for (const t of p.teile) {
        const variabel = t.k[0] === '§';
        const slot = variabel ? +t.k.slice(1) : -1;
        const im = new THREE.InstancedMesh(t.geo, variabel ? weiss() : mat(t.k), p.inst.length);
        // N06: Nur Metadaten für den Wechsel von Laub und Kleidung; keine zusätzliche Geometrie.
        if (['linde', 'kastanie', 'platane', 'birke', 'pappel', 'kugel'].includes(art) || art.startsWith('figur')) {
          im.userData.jahreszeitArt = art;
          im.userData.jahreszeitSlot = slot;
        }
        p.inst.forEach(([x, y, z, ry, s, f], i) => {
          q.setFromAxisAngle(achse, ry); v.set(x, y, z);
          if (Array.isArray(s)) sc.set(s[0], s[1], s[2]); else sc.set(s, s, s);
          m4.compose(v, q, sc);
          im.setMatrixAt(i, m4);
          if (variabel) im.setColorAt(i, col.set(f?.[slot] ?? '#ff00ff'));
        });
        im.castShadow = p.schatten; im.receiveShadow = true;
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        scene.add(im);
        calls++;
      }
    }
    return calls;
  }
}

function definiereProps(I) {
  const glas = F.glas, rad = '#24272b', vl = '#f6f3dc', rl = '#b8352d';
  const raeder = (W, r, xs) => xs.map((x) => [B(r * 2, r * 2, W + 0.08, x, r, 0), rad]);
  const lichter = (L, y, z) => [[B(0.06, 0.18, 0.32, L / 2 + 0.01, y, z), vl], [B(0.06, 0.18, 0.32, L / 2 + 0.01, y, -z), vl], [B(0.06, 0.16, 0.32, -L / 2 - 0.01, y, z), rl], [B(0.06, 0.16, 0.32, -L / 2 - 0.01, y, -z), rl]];
  // ---- Fahrzeuge (Länge entlang x, Front bei +x) ----
  I.def('kleinwagen', [[B(3.6, 0.72, 1.66, 0, 0.64, 0), 0], [B(2.0, 0.58, 1.52, -0.15, 1.28, 0), glas], [B(1.9, 0.1, 1.56, -0.2, 1.62, 0), 0], ...raeder(1.66, 0.3, [1.15, -1.15]), ...lichter(3.6, 0.8, 0.55)]);
  I.def('limousine', [[B(4.7, 0.68, 1.8, 0, 0.64, 0), 0], [B(2.5, 0.55, 1.64, -0.3, 1.25, 0), glas], [B(2.3, 0.1, 1.68, -0.35, 1.57, 0), 0], ...raeder(1.8, 0.33, [1.5, -1.5]), ...lichter(4.7, 0.78, 0.62)]);
  I.def('kombi', [[B(4.8, 0.7, 1.82, 0, 0.65, 0), 0], [B(3.2, 0.55, 1.66, -0.6, 1.27, 0), glas], [B(3.1, 0.1, 1.7, -0.65, 1.59, 0), 0], [B(2.8, 0.06, 0.06, -0.65, 1.67, 0.75), F.metall], [B(2.8, 0.06, 0.06, -0.65, 1.67, -0.75), F.metall], ...raeder(1.82, 0.33, [1.55, -1.5]), ...lichter(4.8, 0.8, 0.62)]);
  I.def('taxi', [[B(4.7, 0.68, 1.8, 0, 0.64, 0), '#efe7c6'], [B(2.5, 0.55, 1.64, -0.3, 1.25, 0), glas], [B(2.3, 0.1, 1.68, -0.35, 1.57, 0), '#efe7c6'], [B(0.6, 0.24, 0.3, -0.3, 1.74, 0), '#f2d33a'], ...raeder(1.8, 0.33, [1.5, -1.5]), ...lichter(4.7, 0.78, 0.62)]);
  I.def('lieferwagen', [[B(5.6, 0.9, 2.0, 0, 0.8, 0), 0], [B(4.1, 1.6, 2.0, -0.75, 2.05, 0), 0], [B(1.0, 0.8, 1.92, 1.85, 1.65, 0), glas], [B(1.1, 0.1, 1.96, 1.8, 2.1, 0), 0], ...raeder(2.0, 0.36, [1.9, -1.9]), ...lichter(5.6, 0.95, 0.7)]);
  I.def('bus', [[B(12, 1.25, 2.55, 0, 1.0, 0), 0], [B(11.7, 1.15, 2.5, 0, 2.2, 0), glas], [B(12, 0.5, 2.55, 0, 3.0, 0), 0], [B(3, 0.35, 1.7, -2.5, 3.42, 0), '#c9ccd0'], [B(0.08, 1.6, 2.35, 6.0, 2.15, 0), glas], [B(0.06, 0.3, 1.8, 6.04, 3.0, 0), '#f0b429'], ...raeder(2.55, 0.5, [3.7, -3.4]), ...lichter(12, 0.7, 0.9)]);
  const tram = [];
  for (const x of [-10.1, 0, 10.1]) tram.push([B(9.8, 1.05, 2.4, x, 0.95, 0), 0], [B(9.6, 1.15, 2.36, x, 2.05, 0), glas], [B(9.8, 0.55, 2.4, x, 2.9, 0), '#f2ede2'], [B(9.2, 0.25, 2.0, x, 3.3, 0), '#a4aaaf'], [B(2.4, 0.5, 2.0, x, 0.25, 0), F.dunkel]);
  tram.push([B(0.5, 2.6, 2.1, 5.05, 1.8, 0), F.dunkel], [B(0.5, 2.6, 2.1, -5.05, 1.8, 0), F.dunkel], [B(0.1, 1.1, 0.1, 0, 4.0, 0), F.dunkel], [B(1.6, 0.08, 0.4, 0, 4.55, 0), F.dunkel], [B(0.06, 0.3, 1.6, 15.02, 2.85, 0), '#f0b429']);
  I.def('strassenbahn', tram);
  // Tatra-artiger Zweiwagenzug (generisch): kurze Kastenwagen, Farbband unten (Slot 0), cremefarbenes Dach
  const tat = [];
  for (const x of [-7.3, 7.3]) {
    tat.push([B(14.0, 1.1, 2.4, x, 0.95, 0), 0], [B(13.4, 1.15, 2.36, x, 2.05, 0), glas], [B(14.0, 0.62, 2.42, x, 2.92, 0), '#efe6c8'], [B(13.0, 0.2, 2.1, x, 3.33, 0), '#cfd3d6']);
    tat.push([B(0.7, 2.4, 2.2, x + 6.85, 1.85, 0), 0], [B(0.7, 2.4, 2.2, x - 6.85, 1.85, 0), 0], [B(0.5, 0.06, 2.36, x, 1.52, 0), '#efe6c8']);
    for (const dx of [-3.4, 3.4]) tat.push([B(0.18, 1.0, 1.1, x + dx, 2.0, 1.19), '#3a3f44']);
    tat.push([B(2.6, 0.45, 2.0, x + 4, 0.25, 0), F.dunkel], [B(2.6, 0.45, 2.0, x - 4, 0.25, 0), F.dunkel], [B(0.08, 0.9, 0.08, x, 3.85, 0), F.dunkel], [B(1.4, 0.08, 0.36, x, 4.3, 0), F.dunkel]);
  }
  tat.push([B(0.06, 0.32, 1.4, 14.32, 2.7, 0), '#f0b429'], [B(0.6, 2.2, 1.6, 0, 1.6, 0), F.dunkel]);
  I.def('tatra', tat);
  I.def('zugwagen', [[B(26, 3.0, 2.9, 0, 2.2, 0), 0], [B(26.06, 0.5, 2.96, 0, 1.3, 0), '#c8322b'], [B(24, 0.85, 2.96, 0, 2.75, 0), glas], [B(25, 0.3, 2.3, 0, 3.85, 0), '#9aa0a6'], [B(3, 0.8, 2.4, 9, 0.45, 0), F.dunkel], [B(3, 0.8, 2.4, -9, 0.45, 0), F.dunkel]]);
  I.def('schiff', [[B(16, 1.4, 4.4, 0, 0, 0), '#f3f1ea'], [B(3.1, 1.4, 3.1, 8, 0, 0, Math.PI / 4), '#f3f1ea'], [B(16.1, 0.3, 4.46, 0, 0.35, 0), 0], [B(10, 1.5, 3.6, -1, 1.45, 0), glas], [B(11, 0.15, 4.0, -1, 2.25, 0), '#f3f1ea'], [B(1.2, 0.8, 1.2, -4, 2.7, 0), 0]]);
  // ---- Bäume (Krone = Slot 0) ----
  const st = F.stamm;
  I.def('linde', [[B(0.42, 3.0, 0.42, 0, 1.5, 0), st], [K(2.3, 0, 4.9, 0, 1, 1.05, 1), 0], [K(1.6, 0.9, 5.9, -0.6, 1, 1, 1, 0), 0]]);
  I.def('kastanie', [[B(0.55, 3.0, 0.55, 0, 1.5, 0), st], [K(2.9, 0, 5.4, 0, 1.15, 0.92, 1.15), 0], [K(1.9, -0.8, 6.6, 0.6, 1, 1, 1, 0), 0]]);
  I.def('platane', [[B(0.5, 3.8, 0.5, 0, 1.9, 0), '#a39a83'], [K(3.0, 0, 6.3, 0, 1.3, 0.72, 1.3), 0], [K(2.0, 1.3, 6.9, 0.8, 1.1, 0.8, 1.1, 0), 0]]);
  I.def('birke', [[B(0.28, 3.4, 0.28, 0, 1.7, 0), '#ece9e2'], [B(0.3, 0.12, 0.3, 0, 1.5, 0), '#3a3a3a'], [B(0.3, 0.12, 0.3, 0, 2.6, 0), '#3a3a3a'], [K(1.5, 0, 4.9, 0, 1, 1.6, 1), 0], [K(1.0, 0.5, 6.1, -0.3, 1, 1.3, 1, 0), 0]]);
  I.def('pappel', [[B(0.4, 2.2, 0.4, 0, 1.1, 0), st], [K(1.5, 0, 6.0, 0, 1, 3.0, 1), 0]]);
  I.def('nadel', [[B(0.4, 1.6, 0.4, 0, 0.8, 0), st], [C(0, 2.5, 3.8, 7, 0, 3.3, 0), 0], [C(0, 1.9, 3.2, 7, 0, 5.3, 0), 0], [C(0, 1.2, 2.6, 7, 0, 7.1, 0), 0]]);
  I.def('kugel', [[B(0.3, 2.4, 0.3, 0, 1.2, 0), st], [K(1.35, 0, 3.25, 0), 0]]);
  I.def('busch', [[K(1.0, 0, 0.6, 0, 1.5, 0.75, 1.5), 0]]);
  I.def('baumscheibe', [[B(1.8, 0.05, 1.8, 0, 0.025, 0), '#8a7a62'], [B(1.4, 0.06, 1.4, 0, 0.03, 0), '#6f6150']], false);
  // ---- Licht, Signale, Masten ----
  const m = '#5d646b';
  I.def('laterne', [[C(0.08, 0.12, 7, 6, 0, 3.5, 0), m], [B(1.4, 0.1, 0.1, 0.65, 6.95, 0), m], [B(0.8, 0.2, 0.36, 1.3, 6.86, 0), '#3c4248'], [B(0.62, 0.05, 0.26, 1.3, 6.74, 0), F.licht]]);
  I.def('doppellaterne', [[C(0.1, 0.14, 8, 6, 0, 4, 0), m], [B(2.8, 0.1, 0.1, 0, 7.95, 0), m], [B(0.8, 0.2, 0.36, 1.3, 7.86, 0), '#3c4248'], [B(0.8, 0.2, 0.36, -1.3, 7.86, 0), '#3c4248'], [B(0.62, 0.05, 0.26, 1.3, 7.74, 0), F.licht], [B(0.62, 0.05, 0.26, -1.3, 7.74, 0), F.licht]]);
  const ag = '#2f3b35';
  I.def('altlaterne', [[C(0.2, 0.24, 0.6, 8, 0, 0.3, 0), ag], [C(0.06, 0.09, 3.4, 6, 0, 2.3, 0), ag], [C(0.34, 0.2, 0.62, 6, 0, 4.3, 0), F.licht], [C(0.06, 0.44, 0.36, 6, 0, 4.79, 0), ag], [C(0.05, 0.05, 0.3, 4, 0, 5.1, 0), ag]]);
  const signal = (x, y) => [[B(0.34, 1.0, 0.34, x, y, 0), F.dunkel], [B(0.42, 0.22, 0.22, x, y + 0.3, 0), '#e04a3a'], [B(0.22, 0.22, 0.42, x, y + 0.3, 0), '#e04a3a'], [B(0.42, 0.22, 0.22, x, y, 0), '#f0b429'], [B(0.22, 0.22, 0.42, x, y, 0), '#f0b429'], [B(0.42, 0.22, 0.22, x, y - 0.3, 0), '#3fbf6a'], [B(0.22, 0.22, 0.42, x, y - 0.3, 0), '#3fbf6a']];
  I.def('ampel', [[C(0.07, 0.07, 3.3, 6, 0, 1.65, 0), '#3a3f44'], ...signal(0, 3.1)]);
  I.def('ampelausleger', [[C(0.1, 0.13, 5.9, 6, 0, 2.95, 0), '#3a3f44'], [B(6, 0.16, 0.16, 3, 5.7, 0), '#3a3f44'], ...signal(5.6, 5.0), ...signal(0, 3.0)]);
  I.def('olmast', [[C(0.12, 0.16, 7.4, 6, 0, 3.7, 0), F.metall], [B(0.14, 0.14, 4.6, 0, 6.9, 0), F.metall], [B(0.1, 0.5, 0.1, 0, 6.6, 1.6), F.dunkel], [B(0.1, 0.5, 0.1, 0, 6.6, -1.6), F.dunkel]]);
  I.def('olmastSeite', [[C(0.12, 0.16, 7.4, 6, 0, 3.7, 0), F.metall], [B(0.14, 0.14, 6.0, 0, 6.9, 3.0), F.metall]]);
  // ---- Möbel ----
  I.def('bank', [[B(1.8, 0.08, 0.55, 0, 0.46, 0), F.holz], [B(1.8, 0.42, 0.07, 0, 0.8, -0.25), F.holz], [B(0.08, 0.46, 0.5, 0.8, 0.23, 0), F.metall], [B(0.08, 0.46, 0.5, -0.8, 0.23, 0), F.metall]]);
  I.def('poller', [[C(0.13, 0.13, 0.9, 6, 0, 0.45, 0), '#5c6268'], [C(0.14, 0.14, 0.12, 6, 0, 0.72, 0), '#f2f1ec']]);
  I.def('litfass', [[C(0.72, 0.72, 0.3, 10, 0, 0.15, 0), F.gruen], [C(0.62, 0.62, 2.6, 10, 0, 1.6, 0), 0], [C(0.64, 0.64, 0.8, 10, 0, 1.1, 0), 1], [C(0.64, 0.64, 0.7, 10, 0, 2.3, 0), 2], [C(0.1, 0.78, 0.5, 10, 0, 3.15, 0), F.gruen], [K(0.18, 0, 3.45, 0, 1, 1, 1, 0), F.gruen]]);
  I.def('muelleimer', [[C(0.26, 0.22, 0.85, 8, 0, 0.43, 0), '#d0702f'], [C(0.28, 0.28, 0.06, 8, 0, 0.88, 0), F.dunkel]]);
  const fr = [];
  for (const x of [-1.5, -0.5, 0.5, 1.5]) fr.push([B(0.06, 0.8, 0.06, x, 0.4, 0.3), F.metall], [B(0.06, 0.8, 0.06, x, 0.4, -0.3), F.metall], [B(0.06, 0.06, 0.66, x, 0.8, 0), F.metall]);
  for (const [x, s] of [[-1.3, 0], [-0.3, 1], [1.7, 2]]) {
    fr.push([B(0.05, 0.32, 1.0, x, 0.62, 0), s], [B(0.08, 0.06, 0.25, x, 0.88, -0.3), F.dunkel], [B(0.5, 0.05, 0.05, x, 0.96, 0.42), F.dunkel]);
    for (const z of [0.48, -0.48]) fr.push([new THREE.CylinderGeometry(0.33, 0.33, 0.04, 10).rotateZ(Math.PI / 2).translate(x, 0.33, z), rad]);
  }
  I.def('fahrradstaender', fr);
  I.def('kuebel', [[B(1.0, 0.6, 1.0, 0, 0.3, 0), '#b9b0a2'], [K(0.62, 0, 0.95, 0, 1.2, 0.7, 1.2), 0]]);
  const schildH = new THREE.CylinderGeometry(0.32, 0.32, 0.06, 14).rotateZ(Math.PI / 2).rotateY(-Math.PI / 4).translate(2.6, 2.75, 0.75);
  const schildH2 = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10).rotateZ(Math.PI / 2).rotateY(-Math.PI / 4).translate(2.6, 2.75, 0.75);
  I.def('haltestelle', [[B(0.08, 2.4, 0.08, 2.0, 1.2, 0.7), F.metall], [B(0.08, 2.4, 0.08, -2.0, 1.2, 0.7), F.metall], [B(0.08, 2.4, 0.08, 2.0, 1.2, -0.7), F.metall], [B(0.08, 2.4, 0.08, -2.0, 1.2, -0.7), F.metall],
    [B(4.5, 0.14, 1.8, 0, 2.45, 0), '#4f5960'], [B(4.1, 1.9, 0.05, 0, 1.3, -0.72), F.glasHell], [B(0.05, 1.9, 1.3, -2.0, 1.3, -0.05), F.glasHell], [B(2.2, 0.08, 0.42, 0, 0.46, -0.42), F.holz],
    [C(0.05, 0.05, 2.8, 6, 2.6, 1.4, 0.75), F.metall], [schildH, '#f2c230'], [schildH2, '#2f8a4e']]);
  const ms = [[B(3.0, 0.9, 1.8, 0, 0.45, 0), '#b88f62'], [B(2.8, 0.22, 1.5, 0, 1.0, 0), 1]];
  for (const x of [-1.45, 1.45]) for (const z of [-0.85, 0.85]) ms.push([B(0.08, 2.4, 0.08, x, 1.2, z), '#e9e5dc']);
  for (let i = 0; i < 6; i++) for (const sgn of [1, -1]) {
    const g = new THREE.BoxGeometry(0.55, 0.08, 1.25).rotateX(sgn * 0.35).translate(-1.375 + i * 0.55, 2.5, sgn * 0.56);
    ms.push([g, i % 2 ? '#f6f3ec' : 0]);
  }
  I.def('marktstand', ms);
  I.def('pfosten', [[B(0.08, 1.05, 0.08, 0, 0.52, 0), '#4a5056']]);
  I.def('schirm', [[C(0.04, 0.04, 2.3, 4, 0, 1.15, 0), '#e9e5dc'], [C(0.05, 1.6, 0.5, 8, 0, 2.4, 0), 0], [B(0.8, 0.75, 0.8, 0, 0.38, 0), '#f3efe8']]);
  // ---- Markierungen (Einheitsquader, per Skalierung) ----
  I.def('strich', [[B(1, 0.04, 1, 0, 0.02, 0), F.markierung]], false);
  I.def('fuge', [[B(1, 0.02, 1, 0, 0.01, 0), F.fuge]], false);
  I.def('fugeDunkel', [[B(1, 0.02, 1, 0, 0.01, 0), '#8c857a']], false);
  I.def('schwelle', [[B(0.3, 0.12, 2.6, 0, 0.06, 0), F.schwelle]], false);
  // ---- Figuren (schauen nach +x). Slots: 0 Oberteil, 1 Hose, 2 Haut, 3 Haar, 4 Tasche ----
  const fig = (gehend, tasche) => {
    const a = gehend ? 0.16 : 0;
    const t = [[B(0.2, 0.82, 0.22, a, 0.41, 0.12), 1], [B(0.2, 0.82, 0.22, -a, 0.41, -0.12), 1], [B(0.3, 0.66, 0.52, 0, 1.17, 0), 0],
      [B(0.16, 0.6, 0.14, -a, 1.15, 0.34), 0], [B(0.16, 0.6, 0.14, a, 1.15, -0.34), 0], [B(0.28, 0.3, 0.28, 0, 1.7, 0), 2], [B(0.31, 0.11, 0.31, -0.02, 1.88, 0), 3]];
    if (tasche) t.push([B(0.32, 0.36, 0.12, -a, 0.82, 0.45), 4]);
    return t;
  };
  I.def('figur', fig(false, false));
  I.def('figurGehend', fig(true, false));
  I.def('figurTasche', fig(true, true));
  // ---- Stadtrand (stadtrand.js): Vorort-, Gewerbe- und Hofbauten. Front = lokale +z-Seite, Slot 0 Wand, Slot 1 Dach ----
  const gl = F.glas, hell = '#f2efe8', tuer = '#5b4334';
  const fz = (w, h, x, y, z) => [B(w, h, 0.1, x, y, z), gl];
  const fx = (w, h, x, y, z) => [B(0.1, h, w, x, y, z), gl];
  // Einfamilienhaus 9 × 8 m, zwei Geschosse, Satteldach mit Schornstein
  const efh = [[B(9, 0.5, 8, 0, 0.25, 0), '#b9b0a2'], [B(8.8, 5.6, 7.8, 0, 3.0, 0), 0], [dachProfil(9.8, 8.9, 3.4, 0.2, 'x').translate(0, 5.8, 0), 1],
    [B(0.6, 1.8, 0.6, 2.2, 8.0, -1.2), '#8a5a45'], [B(1.1, 2.1, 0.1, 0, 1.55, 3.92), tuer], [B(1.8, 0.15, 1.2, 0, 2.75, 4.4), hell], fz(1.0, 1.0, 0, 4.4, 3.92)];
  for (const x of [-2.6, 2.6]) efh.push(fz(1.3, 1.25, x, 1.9, 3.92), fz(1.3, 1.25, x, 4.4, 3.92), fz(1.3, 1.25, x, 1.9, -3.92), fz(1.3, 1.25, x, 4.4, -3.92));
  for (const z of [-1.8, 1.8]) for (const y of [1.9, 4.4]) efh.push(fx(1.3, 1.25, 4.42, y, z), fx(1.3, 1.25, -4.42, y, z));
  I.def('efh', efh);
  // Bungalow 11 × 9 m, ein Geschoss, flaches Walmdach
  const bung = [[B(11, 0.4, 9, 0, 0.2, 0), '#b9b0a2'], [B(10.8, 3.0, 8.8, 0, 1.9, 0), 0], [walmPyramide(Math.SQRT1_2, 1).scale(11.8, 1.7, 9.8).translate(0, 3.4, 0), 1],
    [B(3.6, 2.0, 0.1, 2.6, 1.6, 4.42), gl], [B(1.1, 2.1, 0.1, -1.8, 1.45, 4.42), tuer], fz(1.6, 1.1, -3.9, 1.9, 4.42), fx(1.6, 1.1, 5.42, 1.9, 0), fx(1.6, 1.1, -5.42, 1.9, 0), fz(2.4, 1.1, 0, 1.9, -4.42)];
  I.def('bungalow', bung);
  // Reihenhaus-Einheit 6 × 10 m: aneinandergereiht entsteht eine geschlossene Zeile mit durchlaufendem First
  const rh = [[B(6, 6.0, 10, 0, 3.0, 0), 0], [dachProfil(6.02, 10.9, 3.4, 0.2, 'x').translate(0, 6.0, 0), 1], [B(1.0, 2.1, 0.1, -1.6, 1.4, 5.02), tuer], [B(1.6, 0.15, 1.3, -1.6, 2.65, 5.6), hell],
    [B(0.12, 6.0, 10.04, 2.97, 3.0, 0), '#d6cfc2'], [B(1.2, 1.0, 1.0, 1.4, 7.4, 1.4), 1], [B(1.0, 0.8, 0.1, 1.4, 7.4, 1.92), gl]];
  for (const y of [1.8, 4.3]) rh.push(fz(1.5, 1.3, 1.2, y, 5.02), fz(1.5, 1.3, -1.4, y, -5.02), fz(1.5, 1.3, 1.4, y, -5.02));
  rh.push(fz(1.2, 1.3, -1.6, 4.3, 5.02));
  I.def('reihenhaus', rh);
  // Mehrfamilien-Zeile 24 × 12 m, Erdgeschoss und zwei Obergeschosse, flaches Satteldach, Balkone zur Straße
  const mf = [[B(24, 0.6, 12, 0, 0.3, 0), '#b9b0a2'], [B(23.8, 9.0, 11.8, 0, 5.0, 0), 0], [dachProfil(24.6, 12.8, 2.6, 0.3, 'x').translate(0, 9.5, 0), 1], [B(24.1, 0.3, 12.1, 0, 9.5, 0), hell]];
  for (let x = -10; x <= 10; x += 4) for (const y of [2.1, 5.1, 8.0]) {
    mf.push(fz(1.6, 1.4, x, y, 5.92), fz(1.4, 1.4, x, y, -5.92));
    if (y > 3 && (x === -6 || x === 6 || x === -2 || x === 2)) mf.push([B(2.4, 0.18, 1.2, x, y - 0.9, 6.5), hell], [B(2.4, 0.9, 0.08, x, y - 0.4, 7.08), '#e8e4dc']);
  }
  for (const x of [-8, 8]) mf.push([B(1.4, 2.4, 0.1, x, 1.8, 5.92), tuer], [B(2.2, 0.15, 1.2, x, 3.2, 6.4), '#cfd3d6']);
  for (const z of [-3, 3]) for (const y of [2.1, 5.1, 8.0]) mf.push(fx(1.3, 1.3, 11.92, y, z), fx(1.3, 1.3, -11.92, y, z));
  I.def('zeile', mf);
  // Gewerbehalle 30 × 18 × 8 m: Flachdach, Lichtband, Rolltore, Akzentband (Slot 1)
  const ha = [[B(30, 8, 18, 0, 4, 0), 0], [B(30.4, 0.5, 18.4, 0, 8.25, 0), '#8c8984'], [B(30.06, 0.7, 18.06, 0, 7.2, 0), 1], [B(28, 1.0, 0.1, 0, 5.6, 9.03), gl], [B(0.1, 1.0, 16, 15.03, 5.6, 0), gl], [B(0.1, 1.0, 16, -15.03, 5.6, 0), gl],
    [B(4.2, 0.9, 3, 9, 8.95, -2), '#b6b2aa'], [B(2.4, 2.6, 0.1, -11, 1.3, 9.03), gl]];
  for (const x of [-4, 1.5, 7]) ha.push([B(4.2, 4.4, 0.1, x, 2.2, 9.04), '#c9ccd0'], [B(4.4, 0.2, 0.12, x, 4.5, 9.05), '#5d646b']);
  I.def('halle', ha);
  // Scheune 18 × 12 m mit hohem Satteldach und Tor
  I.def('scheune', [[B(18, 6, 12, 0, 3, 0), 0], [dachProfil(18.8, 13, 5.2, 0.2, 'x').translate(0, 6, 0), 1], [B(4.2, 4.6, 0.1, 0, 2.3, 6.03), tuer], [B(0.1, 1.2, 1.2, 9.03, 4.5, 0), gl], [B(0.1, 1.2, 1.2, -9.03, 4.5, 0), gl]]);
  // Dorfkirche 30 × 11 m: Schiff mit Satteldach (Slot 0 Wand, Slot 1 Dach), Westturm mit Spitzhelm
  const dk = [[B(22, 9, 11, 3, 4.5, 0), 0], [dachProfil(22.6, 12, 6.5, 0.2, 'x').translate(3, 9, 0), 1], [B(6, 20, 6, -11, 10, 0), 0],
    [walmPyramide(Math.SQRT1_2, 1).scale(6.6, 9, 6.6).translate(-11, 20, 0), 1], [B(1.4, 2.6, 0.1, -11, 1.3, 3.03), tuer], [B(1.2, 1.4, 0.1, -11, 15, 3.03), F.dunkel], [B(0.1, 1.4, 1.2, -7.97, 15, 0), F.dunkel]];
  for (let x = -4; x <= 12; x += 4) dk.push([B(1.1, 3.4, 0.1, x, 5, 5.53), gl], [B(1.1, 3.4, 0.1, x, 5, -5.53), gl]);
  I.def('dorfkirche', dk);
  // Tankstelle: Dach auf Stützen (Slot 0), Zapfsäulen, Shop mit Glasfront
  const ts = [[B(16, 0.9, 10, 0, 5.3, 0), 0], [B(16.1, 0.3, 10.1, 0, 4.85, 0), '#f2f1ec'], [B(10, 3.6, 7, 0, 1.8, -9.5), '#e9e5dc'], [B(9, 2.4, 0.1, 0, 1.6, -5.98), gl], [B(10.2, 0.4, 7.2, 0, 3.8, -9.5), 0], [B(0.8, 5.2, 0.8, 0, 7.6, 6), 0]];
  for (const x of [-4.5, 4.5]) ts.push([B(0.5, 4.8, 0.5, x, 2.4, 0), '#d9dcdf'], [B(1.0, 1.6, 0.6, x, 0.8, 1.6), '#5d646b'], [B(1.0, 1.6, 0.6, x, 0.8, -1.6), '#5d646b']);
  I.def('tankstelle', ts);
  // Garage 3,4 × 6 m
  I.def('garage', [[B(3.4, 2.6, 6, 0, 1.3, 0), 0], [B(3.6, 0.2, 6.2, 0, 2.7, 0), '#7c7f82'], [B(2.6, 2.1, 0.1, 0, 1.05, 3.02), '#d9dcdf']]);
}

/** LOD 'fern': Figuren, Straßenmöbel, Masten und Fugen entfallen (Bäume, Fahrzeuge, Markierungen bleiben). */
const FERN_WEG = new Set(['figur', 'figurGehend', 'figurTasche', 'poller', 'muelleimer', 'fahrradstaender', 'bank', 'kuebel', 'schirm', 'fuge', 'fugeDunkel',
  'pfosten', 'schwelle', 'baumscheibe', 'litfass', 'laterne', 'doppellaterne', 'altlaterne', 'ampel', 'ampelausleger', 'olmast', 'olmastSeite', 'haltestelle', 'marktstand']);
const figurFarben = (r) => [waehle(r, OBERTEIL), waehle(r, HOSE), waehle(r, HAUT), waehle(r, HAAR), waehle(r, ['#c9483e', '#e8dcc6', '#2b2b2b', '#d39a2b', '#ffffff'])];
/** Figur setzen (y = Bodenhöhe). */
export function figur(I, x, y, z, r, ry = null) {
  I.setze(waehle(r, ['figur', 'figurGehend', 'figurGehend', 'figurTasche']), x, y, z, ry ?? r() * Math.PI * 2, 1.15, figurFarben(r));
}
export function baumSetzen(I, art, x, y, z, r, s = 1, scheibe = false) {
  I.setze(art, x, y, z, r() * Math.PI * 2, s * zw(r, 0.88, 1.1), [waehle(r, KRONE[art] ?? KRONE.linde)]);
  if (scheibe) I.setze('baumscheibe', x, y, z, 0, 1);
}
const AUTOTYPEN = [['kleinwagen', 0.24], ['limousine', 0.3], ['kombi', 0.22], ['lieferwagen', 0.1], ['taxi', 0.06]];
export function auto(I, x, y, z, ry, r, art = null) {
  const ost = ostVerkehr && !art && r() < 0.3;
  const a = ost ? 'kleinwagen' : art ?? wahlGewichtet(r, AUTOTYPEN);
  I.setze(a, x, y, z, ry, 1, [ost ? waehle(r, AUTOFARBEN_OST) : a === 'lieferwagen' ? waehle(r, ['#f1f1ee', '#f1f1ee', '#d9dcdf', '#e0b23c']) : waehle(r, AUTOFARBEN)]);
  return a === 'lieferwagen' ? 5.6 : a === 'kleinwagen' ? 3.6 : 4.8;
}
/** Drehwinkel, damit die lokale +x-Achse in Weltrichtung (dx, dz) zeigt. */
export const richtung = (dx, dz) => Math.atan2(-dz, dx);

// ====================================================================================
// 3. STADT BAUEN
// ====================================================================================
/**
 * Setzt Straßenraum und ruft für jede Parzelle den Bauer auf.
 * Rückgabe: { box, hoehen: Map(parzellenId → Höhe), teileStrasse, teileHaeuser, instanzen, drawCallsInstanzen }
 * o: { dichte (Faktor Fußgänger/Verkehr), instanzer (eigener Instanzer, dann baut der Aufrufer), ohneHaeuser }
 */
export function baueStadt(S, scene, plan, bauer = platzhalterBauer, o = {}) {
  const I = o.instanzer ?? new Instanzer();
  const ctx = { S, I, scene, plan, r: rng(plan.seed * 31 + 5), dichte: TYPEN[plan.typ].dichte * (o.dichte ?? 1), typ: plan.typ, proBlock: new Map(), ost: !!plan.ddr };
  ostVerkehr = !!plan.ddr;
  for (const p of plan.parzellen) { if (!ctx.proBlock.has(p.block)) ctx.proBlock.set(p.block, []); ctx.proBlock.get(p.block).push(p); }
  const t0 = S.anzahl;
  for (const s of plan.strassen) (s.bruecke ? baueBruecke : baueSegment)(ctx, s);
  for (const k of plan.kreuzungen) baueKreuzung(ctx, k);
  for (const b of plan.bloecke) baueBlock(ctx, b);
  // Stadtrandgürtel (plan.aussen, stadtrand.js): Wasser der Karte und des Gürtels gemeinsam, damit Ufer und Kaimauern
  // über die Kartenkante durchlaufen. o.aussenring === 0 schaltet den Gürtel ab (Kataloge mit Einzelausschnitten).
  const ring = plan.aussen && o.aussenring !== 0;
  baueWasserAlle(ctx, [...plan.bloecke.filter((b) => b.art === 'wasser'), ...(ring ? plan.aussen.wasser : [])]);
  if (ring) baueStadtrand(ctx);
  else {
    for (const u of plan.umland ?? []) baueUmland(ctx, u);
    baueAussenring(ctx, o.aussenring ?? 420);
  }
  if (plan.diagonalen?.length || plan.zwickel?.length) baueDiagonalen(ctx);
  const t1 = S.anzahl;
  const hoehen = new Map();
  let maxH = 20;
  if (!o.ohneHaeuser) for (const p of plan.parzellen) {
    const f = bauerFuer(bauer, p.typ);
    const e = f(S, scene, p) ?? {};
    // Slots mit eigenem Wasser (erg.wasser = [x0, z0, x1, z1]) je Block merken, für FLAECHEN[art].nachBau
    if (e.wasser) { if (!ctx.slotWasser) ctx.slotWasser = new Map(); if (!ctx.slotWasser.has(p.block)) ctx.slotWasser.set(p.block, []); ctx.slotWasser.get(p.block).push(e.wasser); }
    const h = e.hoehe ?? 12;
    hoehen.set(p.id, h);
    maxH = Math.max(maxH, h);
  }
  // Bauten im Stadtrandgürtel (Burg am Berg, plan.aussen.bauten)
  if (plan.aussen && o.aussenring !== 0 && !o.ohneHaeuser) for (const q of plan.aussen.bauten ?? []) { const e = bauerFuer(bauer, q.typ)(S, scene, q) ?? {}; hoehen.set(q.id, e.hoehe ?? 12); }
  // Flächen, die ihren Boden erst nach den Slots bauen (Aussparungen unter abgesenktem Slot-Wasser)
  for (const b of plan.bloecke) FLAECHEN[b.art]?.nachBau?.(ctx, b, ctx.slotWasser?.get(b.id) ?? [], BODEN_HILFE);
  ostVerkehr = false;
  const calls = o.instanzer ? 0 : I.bauen(scene);
  return {
    box: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(plan.breite, maxH, plan.tiefe)),
    hoehen, teileStrasse: t1 - t0, teileHaeuser: S.anzahl - t1, instanzen: I.n, drawCallsInstanzen: calls,
  };
}

// In Etappen aufgebaute Szene für ICE-Reise. Sonstige Aufrufer nutzen unverändert baueStadt().
export async function baueStadtGestuft(S, scene, plan, bauer = platzhalterBauer, o = {}) {
  // Maximal rund 9 ms JS-Arbeit am Stück: Übergang bleibt auch beim Stadtaufbau animiert.
  let letzterFrame = performance.now();
  const bildFreigeben = async () => {
    if (performance.now() - letzterFrame >= 9) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      letzterFrame = performance.now();
    }
  };
  const I = o.instanzer ?? new Instanzer();
  const ctx = { S, I, scene, plan, r: rng(plan.seed * 31 + 5), dichte: TYPEN[plan.typ].dichte * (o.dichte ?? 1), typ: plan.typ, proBlock: new Map(), ost: !!plan.ddr };
  ostVerkehr = !!plan.ddr;
  for (const p of plan.parzellen) { if (!ctx.proBlock.has(p.block)) ctx.proBlock.set(p.block, []); ctx.proBlock.get(p.block).push(p); }
  const t0 = S.anzahl;
  for (const s of plan.strassen) { (s.bruecke ? baueBruecke : baueSegment)(ctx, s); await bildFreigeben(); }
  for (const k of plan.kreuzungen) { baueKreuzung(ctx, k); await bildFreigeben(); }
  for (const b of plan.bloecke) { baueBlock(ctx, b); await bildFreigeben(); }
  // Stadtrandgürtel (plan.aussen, stadtrand.js): Wasser der Karte und des Gürtels gemeinsam, damit Ufer und Kaimauern
  // über die Kartenkante durchlaufen. o.aussenring === 0 schaltet den Gürtel ab (Kataloge mit Einzelausschnitten).
  const ring = plan.aussen && o.aussenring !== 0;
  baueWasserAlle(ctx, [...plan.bloecke.filter((b) => b.art === 'wasser'), ...(ring ? plan.aussen.wasser : [])]);
  if (ring) baueStadtrand(ctx);
  else {
    for (const u of plan.umland ?? []) baueUmland(ctx, u);
    baueAussenring(ctx, o.aussenring ?? 420);
  }
  if (plan.diagonalen?.length || plan.zwickel?.length) baueDiagonalen(ctx);
  const t1 = S.anzahl;
  const hoehen = new Map();
  let maxH = 20;
  if (!o.ohneHaeuser) for (const p of plan.parzellen) {
    const f = bauerFuer(bauer, p.typ);
    const e = f(S, scene, p) ?? {};
    // Slots mit eigenem Wasser (erg.wasser = [x0, z0, x1, z1]) je Block merken, für FLAECHEN[art].nachBau
    if (e.wasser) { if (!ctx.slotWasser) ctx.slotWasser = new Map(); if (!ctx.slotWasser.has(p.block)) ctx.slotWasser.set(p.block, []); ctx.slotWasser.get(p.block).push(e.wasser); }
    const h = e.hoehe ?? 12;
    hoehen.set(p.id, h);
    maxH = Math.max(maxH, h);
    await bildFreigeben();
  }
  // Bauten im Stadtrandgürtel (Burg am Berg, plan.aussen.bauten)
  if (plan.aussen && o.aussenring !== 0 && !o.ohneHaeuser) for (const q of plan.aussen.bauten ?? []) { const e = bauerFuer(bauer, q.typ)(S, scene, q) ?? {}; hoehen.set(q.id, e.hoehe ?? 12); await bildFreigeben(); }
  // Flächen, die ihren Boden erst nach den Slots bauen (Aussparungen unter abgesenktem Slot-Wasser)
  for (const b of plan.bloecke) { FLAECHEN[b.art]?.nachBau?.(ctx, b, ctx.slotWasser?.get(b.id) ?? [], BODEN_HILFE); await bildFreigeben(); }
  ostVerkehr = false;
  const calls = o.instanzer ? 0 : I.bauen(scene);
  return {
    box: new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(plan.breite, maxH, plan.tiefe)),
    hoehen, teileStrasse: t1 - t0, teileHaeuser: S.anzahl - t1, instanzen: I.n, drawCallsInstanzen: calls,
  };
}


export function bauerFuer(bauer, typ) {
  // Rückwärtskompatibel: Rathaus und Hochhaus hießen früher slot:sonder (mit p.sonder)
  if (!bauer[typ] && (typ === 'slot:rathaus' || typ === 'slot:hochhaus') && bauer['slot:sonder']) return bauer['slot:sonder'];
  return bauer[typ] ?? (typ.startsWith('slot:') ? bauer.slot : null) ?? platzhalterBauer[typ] ?? bauer.stadthaus ?? platzhalterBauer.stadthaus;
}

// ---- Hilfen im Straßenkoordinatensystem (u entlang, v quer zur Mittellinie) ----
function rahmen(s) {
  const z = s.achse === 'z';
  return {
    w: (u, v) => (z ? [s.mitte + v, u] : [u, s.mitte + v]),
    quader: (S, u0, u1, v0, v1, y0, y1, f) => (z ? S.quader(s.mitte + v0, y0, u0, s.mitte + v1, y1, u1, f) : S.quader(u0, y0, s.mitte + v0, u1, y1, s.mitte + v1, f)),
    ru: z ? -Math.PI / 2 : 0,      // Drehung, damit Prop-x entlang +u zeigt
    dv: (sg) => (z ? [sg, 0] : [0, sg]),
  };
}

/** Strich (Markierung) mit Mittelpunkt, Länge entlang u und Breite. */
function strich(I, R, u, v, laenge, breite, y = 0) {
  const [x, z] = R.w(u, v);
  I.setze('strich', x, y, z, R.ru, [laenge, 1, breite]);
}

function fahrstreifen(s) {
  // Liste der Fahrstreifen: { v, dir (+1 = in +u-Richtung) }
  const fb = s.breite - 2 * s.gehweg;
  // Rechtsverkehr: auf z-Linien fährt +u (= +z) auf der −x-Seite, auf x-Linien fährt +u (= +x) auf der +z-Seite
  const plusSeite = s.achse === 'z' ? -1 : 1;
  if (s.typ === 'haupt') {
    const h = (s.mittel || 6) / 2;
    const a = h + (fb / 2 - h) / 4, c = h + ((fb / 2 - h) * 3) / 4;
    return [{ v: plusSeite * a, dir: 1 }, { v: plusSeite * c, dir: 1 }, { v: -plusSeite * a, dir: -1 }, { v: -plusSeite * c, dir: -1 }];
  }
  const p = s.parken;
  const lo = -fb / 2 + (p < 0 ? 2.2 : 0), hi = fb / 2 - (p > 0 ? 2.2 : 0);
  const m = (lo + hi) / 2, q = (hi - lo) / 4;
  return [{ v: m + plusSeite * q, dir: 1 }, { v: m - plusSeite * q, dir: -1 }];
}

function baueSegment(ctx, s) {
  const { S, I, r } = ctx;
  const R = rahmen(s);
  const B2 = s.breite / 2, g = s.gehweg, fb = s.breite - 2 * g;
  const L = s.bis - s.von;
  const pflaster = s.belag === 'pflaster';
  R.quader(S, s.von, s.bis, -B2, B2, -0.6, 0, pflaster ? F.kopfstein : F.asphalt);
  if (pflaster) for (let u = s.von + 1.5; u < s.bis - 1; u += 2.2) { const [x, z] = R.w(u, 0); I.setze('fugeDunkel', x, 0, z, R.ru, [0.14, 1, fb - 0.4]); }
  if (s.typ === 'fussgaenger') { fussgaengerzone(ctx, s, R); return; }
  // --- Mittelstreifen / Gleise ---
  if (s.mittelstreifen && s.leitwand) {
    // Schnellweg (s.leitwand, gesetzt von Archetyp-Modulen): Betonleitwand statt Grünstreifen, zwei Spuren je Richtung
    R.quader(S, s.von + 1, s.bis - 1, -0.5, 0.5, 0, 0.95, '#cfccc4');
    R.quader(S, s.von + 1, s.bis - 1, -0.6, 0.6, 0, 0.2, '#b9b5ac');
    for (const sg of [-1, 1]) {
      for (let u = s.von + 7; u < s.bis - 7; u += 9) strich(I, R, u, sg * (fb / 4 + 0.4), 4, 0.15);
      strich(I, R, (s.von + s.bis) / 2, sg * (fb / 2 - 0.3), L - 2, 0.15);
      strich(I, R, (s.von + s.bis) / 2, sg * 1.1, L - 2, 0.15);
    }
  } else if (s.mittelstreifen) {
    const m0 = s.von + 5.2, m1 = s.bis - 5.2, h = (s.mittel || 6) / 2;
    if (s.tram) {
      R.quader(S, m0, m1, -h, h, 0, 0.12, '#8fbd7c');
      R.quader(S, m0, m1, -h, -h + 0.25, 0, 0.22, F.bord);
      R.quader(S, m0, m1, h - 0.25, h, 0, 0.22, F.bord);
      gleise(ctx, R, s.von, s.bis);
      for (let u = s.von + 9; u < s.bis - 7; u += 30) { const [x, z] = R.w(u, 0); I.setze('olmast', x, 0.12, z, R.ru + Math.PI / 2); }
      if (h >= 4) for (const sg of [-1, 1]) for (let u = m0 + 5; u < m1 - 2; u += 11) { const [x, z] = R.w(u, sg * (h - 1.1)); baumSetzen(I, s.baumart, x, 0.12, z, r, 0.85); }
    } else {
      R.quader(S, m0, m1, -h, h, 0, 0.24, F.bord);
      R.quader(S, m0 + 0.3, m1 - 0.3, -h + 0.3, h - 0.3, 0.24, 0.3, F.rasen);
      if (h >= 4) {
        R.quader(S, m0 + 0.3, m1 - 0.3, -1.2, 1.2, 0.3, 0.33, F.weg);
        for (const sg of [-1, 1]) for (let u = m0 + 4; u < m1 - 2; u += 9) { const [x, z] = R.w(u, sg * (h - 1.6)); baumSetzen(I, s.baumart, x, 0.3, z, r, 0.9); }
        for (let u = m0 + 9; u < m1 - 2; u += 18) { const [x, z] = R.w(u, 1.6); I.setze('bank', x, 0.33, z, R.ru); }
      } else for (let u = m0 + 4; u < m1 - 2; u += 10) { const [x, z] = R.w(u, 0); baumSetzen(I, s.baumart === 'kastanie' ? 'kastanie' : 'platane', x, 0.3, z, r); }
      for (let u = m0 + 9; u < m1 - 2; u += 30) { const [x, z] = R.w(u, h >= 4 ? -0.4 : 0); I.setze('doppellaterne', x, 0.3, z, R.ru + Math.PI / 2); }
    }
    // Leitlinien
    for (const sg of [-1, 1]) {
      strich(I, R, (m0 + m1) / 2, sg * (h + 0.35), m1 - m0, 0.18);
      const vm = sg * (h + (fb / 2 - h) / 2);
      for (let u = s.von + 7; u < s.bis - 7; u += 8) strich(I, R, u, vm, 3, 0.15);
      strich(I, R, (s.von + s.bis) / 2, sg * (fb / 2 - 0.3), L - 2, 0.15);
    }
  } else if (s.typ === 'neben' && fb - 2.2 >= 5.5 && !pflaster) {
    const m = s.parken > 0 ? -1.1 : 1.1;
    for (let u = s.von + 6; u < s.bis - 6; u += 7) strich(I, R, u, m, 2.6, 0.15);
    // Parkbuchten-Trennstriche
    for (let u = s.von + 7; u < s.bis - 7; u += 5.6) strich(I, R, u, s.parken * (fb / 2 - 1.1), 0.12, 2.0);
  }
  // --- Magistrale: breite Gehwege mit Rasenstreifen und Baumreihe zur Fahrbahn ---
  if (s.art === 'magistrale' && g >= 6) for (const sg of [-1, 1]) {
    const v0 = sg * (B2 - g + 0.4), v1 = sg * (B2 - g + 3.4);
    R.quader(S, s.von + 2, s.bis - 2, Math.min(v0, v1), Math.max(v0, v1), YG, YG + 0.06, F.rasen);
    for (let u = s.von + 6; u < s.bis - 4; u += 9) { const [x, z] = R.w(u, sg * (B2 - g + 1.9)); baumSetzen(I, s.baumart === 'platane' ? 'linde' : s.baumart, x, YG + 0.06, z, r, 0.9); }
  }
  // --- Gehwege: Laternen, Bäume, Mülleimer, Figuren ---
  for (const sg of [-1, 1]) {
    const kante = sg * (B2 - g);           // Bordsteinkante
    const [dx, dz] = R.dv(-sg);            // zur Fahrbahn
    const versatz = sg < 0 ? 0 : 13;
    for (let u = s.von + 7 + versatz; u < s.bis - 5; u += 26) {
      const [x, z] = R.w(u, kante + sg * 0.45);
      I.setze(ctx.typ === 'mittelstadt' && s.typ !== 'haupt' ? 'altlaterne' : 'laterne', x, YG, z, ctx.typ === 'mittelstadt' && s.typ !== 'haupt' ? 0 : richtung(dx, dz));
      if (r() < 0.3) { const [x2, z2] = R.w(u + 1.2, kante + sg * 0.5); I.setze('muelleimer', x2, YG, z2, 0); }
    }
    const baeume = g >= 2.7 && s.art !== 'magistrale' && (s.typ === 'haupt' || (s.baeume && (sg === s.parken || s.typ !== 'neben')));
    if (baeume) for (let u = s.von + 13 + versatz / 2; u < s.bis - 6; u += 12) {
      const [x, z] = R.w(u, kante + sg * 1.1);
      baumSetzen(I, s.baumart, x, YG, z, r, s.typ === 'haupt' ? 0.95 : 0.8, true);
    }
    const n = Math.round((L / 10) * 0.9 * ctx.dichte * (s.typ === 'haupt' ? 1.4 : 1) * zw(r, 0.5, 1.3));
    for (let i = 0; i < n; i++) {
      const u = zw(r, s.von + 1, s.bis - 1);
      const [x, z] = R.w(u, sg * (B2 - zw(r, 0.4, g - 0.4)));
      figur(I, x, YG, z, r, R.ru + (r() < 0.5 ? 0 : Math.PI) + zw(r, -0.3, 0.3));
    }
  }
  // --- Verkehr ---
  verkehrAufSegment(ctx, s, R, s.von + 7, s.bis - 7, 0);
  // Bushaltestelle an Hauptstraßen
  if (s.typ === 'haupt' && L > 50 && r() < 0.45) {
    const sg = r() < 0.5 ? -1 : 1;
    const u = s.von + L * zw(r, 0.35, 0.6);
    const [x, z] = R.w(u, sg * (B2 - g + 1.2));
    const [dx, dz] = R.dv(-sg);  // Rückwand zum Haus, offen zur Straße
    I.setze('haltestelle', x, YG, z, richtung(dz, -dx));
    const spur = fahrstreifen(s).filter((f) => Math.sign(f.v) === sg).sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0];
    const [bx, bz] = R.w(u - 2, spur.v);
    I.setze('bus', bx, 0, bz, R.ru + (spur.dir > 0 ? 0 : Math.PI), 1, [waehle(r, ['#f1c232', '#e9eef0', '#d04a3f', '#2f63b5'])]);
  }
}

function gleise(ctx, R, u0, u1, y = 0) {
  for (const t of [-1.6, 1.6]) for (const sp of [-0.72, 0.72]) R.quader(ctx.S, u0, u1, t + sp - 0.06, t + sp + 0.06, y, y + 0.18, F.schiene);
  for (const t of [-1.6, 1.6]) R.quader(ctx.S, u0, u1, t - 0.04, t + 0.04, 6.4, 6.48, F.dunkel);
}

/** Fahrende und parkende Autos, Straßenbahn auf einem Abschnitt. */
function verkehrAufSegment(ctx, s, R, u0, u1, y) {
  const { I, r } = ctx;
  const fb = s.breite - 2 * s.gehweg;
  if (u1 - u0 < 6) return;
  for (const f of fahrstreifen(s)) {
    let u = u0 + zw(r, 0, 12);
    while (u < u1 - 3) {
      if (r() < 0.55 * ctx.dichte) {
        const [x, z] = R.w(u, f.v);
        const l = auto(I, x, y, z, R.ru + (f.dir > 0 ? 0 : Math.PI), r);
        u += l + zw(r, 3, 10);
      } else u += zw(r, 8, 22);
    }
  }
  if (s.parken && !s.bruecke && s.typ !== 'haupt') {
    const v = s.parken * (fb / 2 - 1.1);
    for (let u = u0 + 3.5; u < u1 - 2; u += 5.6) if (r() < 0.72) { const [x, z] = R.w(u, v); auto(I, x, y, z, R.ru + (r() < 0.5 ? 0 : Math.PI), r); }
  }
  const nTram = s.tram && u1 - u0 > 36 ? (s.art === 'magistrale' ? (r() < 0.7 ? 2 : 1) : r() < 0.6 ? 1 : 0) : 0;
  for (let k = 0; k < nTram; k++) {
    const t = (k === 0 ? r() < 0.5 : true) ? -1.6 : 1.6;
    const tt = k === 1 ? 1.6 : t;
    const plus = (s.achse === 'z' ? -1 : 1) * Math.sign(tt) > 0;
    const [x, z] = R.w(zw(r, u0 + 16, u1 - 16), tt);
    if (ctx.ost) I.setze('tatra', x, 0.06, z, R.ru + (plus ? 0 : Math.PI), 1, [waehle(r, ['#e2b33a', '#d8642f', '#c8322b', '#e9d9a0'])]);
    else I.setze('strassenbahn', x, 0.06, z, R.ru + (plus ? 0 : Math.PI), 1, [waehle(r, ['#c8322b', '#2f6f8f', '#3f7d56'])]);
  }
}

function fussgaengerzone(ctx, s, R) {
  const { S, I, r } = ctx;
  const B2 = s.breite / 2, g = s.gehweg;
  R.quader(S, s.von, s.bis, -B2 + g, B2 - g, -0.6, 0.29, F.pflaster);
  R.quader(S, s.von + 1, s.bis - 1, -1.6, 1.6, 0.29, 0.3, F.pflasterMitte);
  for (let u = s.von + 1.5; u < s.bis - 1; u += 3) { const [x, z] = R.w(u, 0); I.setze('fuge', x, 0.29, z, R.ru, [0.12, 1, s.breite - 2 * g - 0.2]); }
  let k = 0;
  const fbz = s.breite - 2 * g;
  if (fbz >= 22) {
    // Haupteinkaufsstraße: zwei versetzte Baumreihen mit Bänken, Mittelband mit Pflanzkübeln, Kiosken, Brunnen
    const vb = fbz * 0.27;
    R.quader(S, s.von + 1, s.bis - 1, -vb - 1.6, -vb + 1.6, 0.29, 0.305, F.pflasterMitte);
    R.quader(S, s.von + 1, s.bis - 1, vb - 1.6, vb + 1.6, 0.29, 0.305, F.pflasterMitte);
    // GESTALTUNG.md: lockere Baumreihen (20 m), kein Baumraster
    for (const sg of [-1, 1]) for (let u = s.von + 8 + (sg > 0 ? 10 : 0); u < s.bis - 6; u += 20, k++) {
      const [x, z] = R.w(u, sg * vb);
      baumSetzen(I, k % 3 === 2 ? 'kugel' : waehle(r, ['linde', 'platane']), x, 0.3, z, r, 0.9, true);
      const [bx, bz] = R.w(u + 3.6, sg * vb);
      I.setze('bank', bx, 0.3, bz, R.ru + (sg > 0 ? 0 : Math.PI));
    }
    const L = s.bis - s.von;
    for (let u = s.von + 14; u < s.bis - 10; u += 28) {
      const art = r();
      const [x, z] = R.w(u, 0);
      if (art < 0.25 && L > 50) brunnen(S, x, z, 0.3, 0.6);
      else if (art < 0.55) { R.quader(S, u - 1.8, u + 1.8, -1.6, 1.6, 0.3, 2.9, waehle(r, ['#2f6f8f', '#3f7d56', '#8c3b3b'])); R.quader(S, u - 2.4, u + 2.4, -2.2, 2.2, 2.9, 3.2, '#e9e5dc'); }
      else for (const du of [-2.4, 0, 2.4]) { const [kx, kz] = R.w(u + du, 0); I.setze('kuebel', kx, 0.3, kz, 0, 1, [waehle(r, ['#d96a8a', '#e0b23c', '#7cb369'])]); }
    }
  } else for (let u = s.von + 10; u < s.bis - 8; u += 22, k++) {
    const [x, z] = R.w(u, 0);
    baumSetzen(I, k % 2 ? 'kugel' : 'linde', x, 0.3, z, r, 0.85, true);
    const [bx, bz] = R.w(u + 4, 0);
    I.setze('bank', bx, 0.3, bz, R.ru + (k % 2 ? 0 : Math.PI));
    if (k % 2 === 0) { const [kx, kz] = R.w(u + 8, 0.9); I.setze('kuebel', kx, 0.3, kz, 0, 1, [waehle(r, ['#d96a8a', '#e0b23c', '#7cb369'])]); }
  }
  for (const sg of [-1, 1]) for (let u = s.von + 5 + (sg > 0 ? 9 : 0); u < s.bis - 4; u += 18) { const [x, z] = R.w(u, sg * (B2 - g - 0.6)); I.setze('altlaterne', x, 0.3, z, 0); }
  if (s.bis - s.von > 40) {
    const vl = fbz >= 22 ? fbz * 0.27 + 3.4 : 2.6;   // breite Zone: neben der Baumreihe, nicht im Mittelband
    const [x, z] = R.w(s.von + (s.bis - s.von) * 0.62, vl);
    I.setze('litfass', x, 0.3, z, 0, 1, [waehle(r, OBERTEIL), waehle(r, OBERTEIL), waehle(r, OBERTEIL)]);
    const [fx, fz] = R.w(s.von + (s.bis - s.von) * 0.3, -vl - 0.2);
    I.setze('fahrradstaender', fx, 0.3, fz, R.ru, 1, [waehle(r, AUTOFARBEN), waehle(r, AUTOFARBEN), waehle(r, AUTOFARBEN)]);
  }
  // Außengastronomie an einer Seite
  for (let u = s.von + 6; u < s.bis - 6; u += 22) if (r() < 0.6) {
    const sg = r() < 0.5 ? -1 : 1;
    for (let i = 0; i < 3; i++) { const [x, z] = R.w(u + i * 2.6, sg * (B2 - g - 2.4)); I.setze('schirm', x, 0.3, z, 0, 1, [waehle(r, FARBEN.markise)]); }
  }
  const n = Math.round(((s.bis - s.von) * s.breite) / 40 * ctx.dichte);
  for (let i = 0; i < n; i++) { const [x, z] = R.w(zw(r, s.von + 1, s.bis - 1), zw(r, -B2 + 0.5, B2 - 0.5)); figur(I, x, 0.3, z, r, R.ru + (r() < 0.5 ? 0 : Math.PI) + zw(r, -0.5, 0.5)); }
}

function baueBruecke(ctx, s) {
  const { S, I, r } = ctx;
  const R = rahmen(s);
  const B2 = s.breite / 2, g = s.gehweg;
  const L = s.bis - s.von;
  // Echte Brücke statt Damm: dünnes Deck auf Widerlagern (bei langen Brücken Pfeiler), darunter läuft das Wasser
  // sichtbar durch; Schattenkante auf dem Wasser, Geländer aus Pfosten und Handlauf über einer niedrigen Brüstung.
  const H = 0;                                      // Deck bündig mit der Straße, keine Kante am Brückenkopf
  const GR = Math.min(WASSER_Y - 1.2, -6.2);        // Gründung bis unter jeden Wasserspiegel (Rhein 4,6 m)
  const DU = -0.4;                                  // Unterkante Deck (lichte Höhe über dem Wasser 1,8 m)
  const WL = Math.min(1.6, L * 0.08);               // Widerlager an beiden Enden
  R.quader(S, s.von, s.bis, -B2, B2, DU, -0.1, '#b9b1a2');
  R.quader(S, s.von, s.bis, -B2 - 0.12, -B2 + 0.25, DU - 0.08, H, '#9c958a');   // Randbalken, dunkel abgesetzt
  R.quader(S, s.von, s.bis, B2 - 0.25, B2 + 0.12, DU - 0.08, H, '#9c958a');
  for (const [u0, u1] of [[s.von, s.von + WL], [s.bis - WL, s.bis]]) R.quader(S, u0, u1, -B2, B2, GR, DU, F.stein);
  if (L > 34) {
    const np = Math.round(L / 26) - 1;
    for (let k = 1; k <= np; k++) { const u = s.von + (k * L) / (np + 1); R.quader(S, u - 0.9, u + 0.9, -B2 + 1, B2 - 1, GR, DU, F.stein); }
  }
  // Schatten auf dem Wasser: unter dem Deck und eine Kante zur lichtabgewandten Seite (+x bzw. −z)
  const sv = s.achse === 'x' ? [-B2 - 2.2, B2] : [-B2, B2 + 2.2];
  R.quader(S, s.von + WL, s.bis - WL, sv[0], sv[1], WASSER_Y + 0.01, WASSER_Y + 0.03, '#24555f');
  R.quader(S, s.von, s.bis, -B2, B2, -0.1, H, '#c9c1b2');
  R.quader(S, s.von, s.bis, -B2 + g, B2 - g, H - 0.01, H + 0.01, F.asphalt);
  for (const sg of [-1, 1]) {
    R.quader(S, s.von, s.bis, sg > 0 ? B2 - g : -B2, sg > 0 ? B2 : -B2 + g, H, YG + H, F.gehweg);
    R.quader(S, s.von, s.bis, sg > 0 ? B2 - 0.4 : -B2, sg > 0 ? B2 : -B2 + 0.4, YG + H, YG + H + 0.12, F.stein);   // Bordkante, Geländer darüber durchsichtig
    R.quader(S, s.von, s.bis, sg * (B2 - 0.2) - 0.05, sg * (B2 - 0.2) + 0.05, YG + H + 1.0, YG + H + 1.1, '#4a5056');   // Handlauf
    for (let u = s.von + 0.6; u < s.bis - 0.3; u += 2.0) { const [x, z] = R.w(u, sg * (B2 - 0.2)); I.setze('pfosten', x, YG + H + 0.05, z, 0); }
    for (let u = s.von + 6; u < s.bis - 3; u += 14) { const [x, z] = R.w(u, sg * (B2 - 0.25)); I.setze('altlaterne', x, YG + H + 0.12, z, 0, 0.8); }
    for (let i = 0, nn = Math.round(L / 14 * ctx.dichte); i < nn; i++) { const [x, z] = R.w(zw(r, s.von + 1, s.bis - 1), sg * (B2 - zw(r, 0.8, g - 0.3))); figur(I, x, YG + H, z, r, R.ru + (r() < 0.5 ? 0 : Math.PI)); }
  }
  if (s.typ === 'haupt') strich(I, R, (s.von + s.bis) / 2, 0, L, 0.3, H + 0.01);
  else for (let u = s.von + 3; u < s.bis - 2; u += 7) strich(I, R, u, 0, 2.6, 0.15, H + 0.01);
  const s2 = { ...s, parken: 0, typ: s.typ === 'haupt' ? 'haupt' : 'neben', tram: false };
  if (s.typ === 'haupt') { for (const f of fahrstreifen(s2)) for (let u = s.von + zw(r, 2, 10); u < s.bis - 4; u += zw(r, 9, 20)) { const [x, z] = R.w(u, f.v); auto(I, x, H, z, R.ru + (f.dir > 0 ? 0 : Math.PI), r); } }
  else { const fb = s.breite - 2 * g; for (const sg of [-1, 1]) for (let u = s.von + zw(r, 2, 10); u < s.bis - 4; u += zw(r, 10, 24)) { const v = sg * fb / 4; const plus = (s.achse === 'z' ? -1 : 1) * sg > 0; const [x, z] = R.w(u, v); auto(I, x, H, z, R.ru + (plus ? 0 : Math.PI), r); } }
}

function baueKreuzung(ctx, k) {
  const { S, I, r } = ctx;
  const x0 = k.x - k.bx / 2, x1 = k.x + k.bx / 2, z0 = k.z - k.bz / 2, z1 = k.z + k.bz / 2;
  const alleArme = Object.values(k.arme).filter(Boolean);
  const kopf = alleArme.length && alleArme.every((a) => a.belag === 'pflaster' || a.typ === 'fussgaenger');
  S.quader(x0, -0.6, z0, x1, k.gepflastert ? 0.29 : 0, z1, k.gepflastert ? F.pflaster : kopf ? F.kopfstein : F.asphalt);
  const az = k.arme['-z'] ?? k.arme['+z'], ax = k.arme['-x'] ?? k.arme['+x'];
  // Großer Platz, wo sich zwei Haupteinkaufsstraßen kreuzen: Brunnen, Baumkranz, Bänke, Leute
  if (k.gepflastert && k.bx >= 28 && k.bz >= 28) {
    brunnen(S, k.x, k.z, 0.29, 1.1);
    const rx = k.bx / 2 - 5, rz = k.bz / 2 - 5;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { baumSetzen(I, 'platane', k.x + sx * rx, 0.29, k.z + sz * rz, r, 1.0, true); I.setze('bank', k.x + sx * (rx - 3.2), 0.29, k.z + sz * rz, 0); }
    for (const [dx, dz, ry] of [[-7.5, 0, Math.PI / 2], [7.5, 0, -Math.PI / 2], [0, 7.5, Math.PI], [0, -7.5, 0]]) I.setze('bank', k.x + dx, 0.29, k.z + dz, ry);
    for (let i = 0; i < (k.bx * k.bz) / 30 * ctx.dichte; i++) { const x = k.x + zw(r, -k.bx / 2 + 1, k.bx / 2 - 1), z = k.z + zw(r, -k.bz / 2 + 1, k.bz / 2 - 1); if (Math.hypot(x - k.x, z - k.z) > 6) figur(I, x, 0.29, z, r); }
    return;
  }
  // Gleise und Fahrdraht durch die Kreuzung
  if ((k.arme['-z']?.tram || k.arme['+z']?.tram)) gleise(ctx, rahmen({ achse: 'z', mitte: k.x }), z0, z1);
  if ((k.arme['-x']?.tram || k.arme['+x']?.tram)) gleise(ctx, rahmen({ achse: 'x', mitte: k.z }), x0, x1);
  // Zebrastreifen, Haltelinien, Poller an Fußgängerzonen
  for (const [seite, arm] of Object.entries(k.arme)) {
    if (!arm) continue;
    const zArm = seite[1] === 'z', sg = seite[0] === '+' ? 1 : -1;
    const e = zArm ? k.bz / 2 : k.bx / 2;
    const R = rahmen({ achse: zArm ? 'z' : 'x', mitte: zArm ? k.x : k.z });
    const mitteU = zArm ? k.z : k.x;
    const fb = arm.breite - 2 * arm.gehweg;
    if (arm.typ === 'fussgaenger') {
      if (!k.gepflastert) for (let v = -fb / 2 + 0.8; v <= fb / 2 - 0.7; v += 1.6) { const [x, z] = R.w(mitteU + sg * (e + 0.6), v); I.setze('poller', x, 0.29, z, 0); }
      continue;
    }
    if (arm.bruecke) continue;
    if (k.zebra) for (let v = -fb / 2 + 0.6; v <= fb / 2 - 0.5; v += 1.0) strich(I, R, mitteU + sg * (e + 2.4), v, 3.2, 0.5);
    if (k.zebra || k.ampel) {
      // eingehende Hälfte: Fahrtrichtung −sg; rechte Seite davon
      const rechts = zArm ? sg : -sg;
      const h = arm.mittelstreifen ? (arm.mittel || 6) / 2 : 0;
      strich(I, R, mitteU + sg * (e + 4.9), rechts * (h + (fb / 2 - h) / 2), 0.45, fb / 2 - h);
    }
  }
  // Ampeln an den Ecken
  if (k.ampel) {
    let n = 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const arm = k.arme[sz > 0 ? '+z' : '-z'];
      if (!arm) continue;
      const x = k.x + sx * (k.bx / 2 - k.gx + 0.55), z = k.z + sz * (k.bz / 2 + 1.0);
      const haupt = arm.typ === 'haupt' || (ax && ax.typ === 'haupt');
      if (haupt && n++ % 2 === 0) I.setze('ampelausleger', x, YG, z, richtung(-sx, 0));
      else I.setze('ampel', x, YG, z, 0);
    }
  }
  // Litfaßsäule an manchen Ecken
  if (!k.gepflastert && az && ax && r() < 0.18) {
    const sx = r() < 0.5 ? -1 : 1, sz = r() < 0.5 ? -1 : 1;
    if (k.arme[sz > 0 ? '+z' : '-z'] && k.arme[sx > 0 ? '+x' : '-x']) I.setze('litfass', k.x + sx * (k.bx / 2 + 1.0), YG, k.z + sz * (k.bz / 2 + 1.0), 0, 1, [waehle(r, OBERTEIL), waehle(r, OBERTEIL), waehle(r, OBERTEIL)]);
  }
  // ein paar Autos auf der Kreuzung (abbiegend)
  if (!k.gepflastert && r() < 0.35 * ctx.dichte && az && ax) auto(I, k.x + zw(r, -2, 2), 0, k.z + zw(r, -2, 2), r() * Math.PI * 2, r);
}

// ---- Diagonale Straßen (plan.diagonalen) und Zwickel (plan.zwickel), siehe stadtplan.js diagonaleSchneiden ----
function polyPlatte(S, P, yTop, dicke, farbe) {
  const sh = new THREE.Shape();
  P.forEach(([x, z], i) => (i ? sh.lineTo(x, z) : sh.moveTo(x, z)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: dicke, bevelEnabled: false });
  g.rotateX(Math.PI / 2); g.translate(0, yTop, 0);
  S.add(g, farbe);
}
function baueDiagonalen(ctx) {
  const { S, I, plan } = ctx;
  const r = rng(plan.seed * 17 + 3);
  const Y = 0.41;
  // Straßenraum aller übrigen Props unter den Diagonalen räumen (Bäume, Laternen, Markierungen, parkende Autos)
  const D = plan.diagonalen ?? [];
  const aufDiag = (x, z, rand = 0.3) => D.some((d) => { const vx = x - d.C.x, vz = z - d.C.z, t = vx * d.dx + vz * d.dz; return t > d.t0 - 1 && t < d.t1 + 1 && Math.abs(vx * d.dz - vz * d.dx) < d.breite / 2 + rand; });
  for (const p of I.protos.values()) p.inst = p.inst.filter(([x, , z]) => !aufDiag(x, z));
  I.n = [...I.protos.values()].reduce((a, p) => a + p.inst.length, 0);
  const land = plan.bloecke.filter((b) => b.art !== 'wasser');
  const imBlock = (x, z) => land.some((b) => x > b.x - 3 && x < b.x + b.w + 3 && z > b.z - 3 && z < b.z + b.d + 3);
  for (const d of D) {
    const ry = richtung(d.dx, d.dz), B2 = d.breite / 2, g = d.gehweg;
    const pkt = (t, v) => [d.C.x + d.dx * t - d.dz * v, d.C.z + d.dz * t + d.dx * v];
    // Abschnitte über Blöcken (auf Gehweghöhe) und über Straßen (auf der Fahrbahn)
    const stuecke = [];
    let a = d.t0, art = imBlock(...pkt(d.t0, 0));
    for (let t = d.t0 + 0.5; t < d.t1; t += 0.5) {
      const neu = imBlock(...pkt(t, 0));
      if (neu !== art) { stuecke.push([a, t, art]); a = t; art = neu; }
    }
    stuecke.push([a, d.t1, art]);
    for (const [u0, u1, hoch] of stuecke) {
      const L = u1 - u0; if (L < 0.2) continue;
      const [mx, mz] = pkt((u0 + u1) / 2, 0);
      if (hoch) {
        S.box(L, 1.0, d.breite, mx, Y - 0.5 - 0.01, mz, F.bord, ry);
        S.box(L, 0.04, d.breite - 0.4, mx, Y - 0.02, mz, F.pflaster, ry);
        S.box(L, 0.06, d.breite - 2 * g, mx, Y + 0.0, mz, F.asphalt, ry);
      } else S.box(L, 0.05, d.breite, mx, 0.025, mz, F.asphalt, ry);
      for (let t = u0 + 2; t < u1 - 2; t += 7) { const [x, z] = pkt(t, 0); I.setze('strich', x, (hoch ? Y + 0.03 : 0.05), z, ry, [3, 1, 0.15]); }
      if (!hoch) continue;
      for (const sg of [-1, 1]) {
        if (d.baeume) for (let t = u0 + 5; t < u1 - 4; t += 11) { const [x, z] = pkt(t, sg * (B2 - g / 2)); baumSetzen(I, 'linde', x, Y, z, r, 0.8, true); }
        for (let t = u0 + 9; t < u1 - 4; t += 24) { const [x, z] = pkt(t, sg * (B2 - 0.4)); I.setze('altlaterne', x, Y, z, 0); }
        for (let i = 0, n = Math.round((L / 12) * ctx.dichte); i < n; i++) { const [x, z] = pkt(zw(r, u0 + 1, u1 - 1), sg * (B2 - zw(r, 0.3, g - 0.3))); figur(I, x, Y, z, r, ry + (r() < 0.5 ? 0 : Math.PI)); }
        for (let t = u0 + zw(r, 3, 12); t < u1 - 5; t += zw(r, 10, 26)) { const [x, z] = pkt(t, sg * (B2 - g) / 2); auto(I, x, Y + 0.03, z, ry + (sg > 0 ? 0 : Math.PI), r); }
      }
    }
  }
  for (const zk of plan.zwickel ?? []) {
    const P = zk.poly;
    polyPlatte(S, P, Y - 0.02, 1.0, F.bord);
    const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cz = P.reduce((a, p) => a + p[1], 0) / P.length;
    const k = 0.82, inn = P.map(([x, z]) => [cx + (x - cx) * k, cz + (z - cz) * k]);
    polyPlatte(S, inn, Y + 0.03, 0.06, zk.art === 'pflaster' ? F.pflaster : F.rasen);
    const fl = Math.abs(P.reduce((a, p, i) => { const q = P[(i + 1) % P.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
    if (fl > 30 && !aufDiag(cx, cz, 2)) baumSetzen(I, zk.art === 'pflaster' ? 'kugel' : waehle(r, ['linde', 'kastanie', 'kugel']), cx, Y + 0.03, cz, r, fl > 120 ? 1 : 0.8, zk.art === 'pflaster');
    else if (fl > 8) I.setze('busch', cx, Y + 0.03, cz, 0, 0.8, [waehle(r, KRONE.busch)]);
  }
}

// ---- Blöcke und Sonderflächen ----
function platte(S, x0, z0, x1, z1, rad, yTop, dicke, farbe) {
  const s = new THREE.Shape();
  const r = Math.min(rad, (x1 - x0) / 2 - 0.01, (z1 - z0) / 2 - 0.01);
  s.moveTo(x0 + r, z0); s.lineTo(x1 - r, z0); s.quadraticCurveTo(x1, z0, x1, z0 + r); s.lineTo(x1, z1 - r); s.quadraticCurveTo(x1, z1, x1 - r, z1);
  s.lineTo(x0 + r, z1); s.quadraticCurveTo(x0, z1, x0, z1 - r); s.lineTo(x0, z0 + r); s.quadraticCurveTo(x0, z0, x0 + r, z0);
  const g = new THREE.ExtrudeGeometry(s, { depth: dicke, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(Math.PI / 2);
  g.translate(0, yTop, 0);
  S.add(g, farbe);
}
function ellipsenRing(S, cx, cz, rx, rz, breite, y0, y1, farbe) {
  const s = new THREE.Shape(); s.absellipse(0, 0, rx + breite, rz + breite, 0, Math.PI * 2, false);
  const h = new THREE.Path(); h.absellipse(0, 0, rx, rz, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 20 });
  g.rotateX(Math.PI / 2); g.translate(cx, y1, cz);
  S.add(g, farbe);
}
function ellipse(S, cx, cz, rx, rz, y0, y1, farbe) {
  const g = new THREE.CylinderGeometry(1, 1, y1 - y0, 24); g.scale(rx, 1, rz); g.translate(cx, (y0 + y1) / 2, cz); S.add(g, farbe);
}

function gehwegPlatte(ctx, b) {
  const e = { '-x': b.rand['-x'].gehweg, '+x': b.rand['+x'].gehweg, '-z': b.rand['-z'].gehweg, '+z': b.rand['+z'].gehweg };
  const x0 = b.x - e['-x'], x1 = b.x + b.w + e['+x'], z0 = b.z - e['-z'], z1 = b.z + b.d + e['+z'];
  platte(ctx.S, x0, z0, x1, z1, 3, 0.3, 0.9, F.bord);
  platte(ctx.S, x0 + 0.3, z0 + 0.3, x1 - 0.3, z1 - 0.3, 2.7, YG, 0.05, F.gehweg);
}

function baueBlock(ctx, b) {
  const { S, I } = ctx;
  const r = rng(b.seed + 99);
  if (b.art === 'wasser') return;   // gemeinsam in baueWasserAlle
  if (!FLAECHEN[b.art]?.ohneGehwegPlatte) gehwegPlatte(ctx, b);   // ohneGehwegPlatte: Fläche baut Gehweg und Boden selbst (nachBau)
  const teile = ctx.proBlock.get(b.id) ?? [];
  if (b.art === 'bebaut' || b.art === 'warenhaus') {
    baueHof(ctx, b, r, teile);
    if (b.art === 'warenhaus') {
      for (const p of teile.filter((q) => EINKAUF_SLOTS.has(q.typ))) for (const s of p.front) {
        if (s !== '+z' && s !== '+x') continue;
        const g = b.rand[s].gehweg;
        if (s === '+z') {
          I.setze('fahrradstaender', p.x + 6, YG, b.z + b.d + g * 0.5, 0, 1, [waehle(r, AUTOFARBEN), waehle(r, AUTOFARBEN), waehle(r, AUTOFARBEN)]);
          for (let i = 0; i < 18 * ctx.dichte; i++) figur(I, zw(r, p.x, p.x + p.w), YG, b.z + b.d + zw(r, 0.3, g - 0.3), r);
        } else for (let i = 0; i < 12 * ctx.dichte; i++) figur(I, b.x + b.w + zw(r, 0.3, g - 0.3), YG, zw(r, p.z, p.z + p.d), r);
      }
    }
    return;
  }
  const hinder = teile.filter((p) => p.seite === 'frei');
  if (FLAECHEN[b.art]?.boden) { FLAECHEN[b.art].boden(ctx, b, r, teile, BODEN_HILFE); return; }
  if (b.art === 'markt') { baueMarkt(ctx, b, r, hinder); return; }
  if (b.art === 'kirche' || b.art === 'domplatz') { baueKirchplatz(ctx, b, r, teile); return; }
  if (b.art === 'platz') { baueKleinerPlatz(ctx, b, r, hinder); return; }
  if (b.art === 'park') { (b.garten ? baueGarten : bauePark)(ctx, b, r, hinder); return; }
  if (b.art === 'gruenguertel') { baueGruenguertel(ctx, b, r, hinder); return; }
  if (b.art === 'schloss') { baueSchlossplatz(ctx, b, r, hinder); return; }
  if (b.art === 'kleingarten') { baueKleingarten(ctx, b, r, hinder); return; }
  if (b.art === 'parkplatz') { S.quader(b.x, 0, b.z, b.x + b.w, 0.33, b.z + b.d, '#9a9fa4'); baueParkplatz(ctx, { x: b.x + 2, z: b.z + 2, w: b.w - 4, d: b.d - 4 }, 0.33, r); return; }
  if (b.art === 'gewerbe') { S.quader(b.x, 0, b.z, b.x + b.w, 0.33, b.z + b.d, '#9a9fa4'); if (b.parkplatz) baueParkplatz(ctx, b.parkplatz, 0.33, r); return; }
  if (b.art === 'bahn') { baueBahn(ctx, b, r); return; }
  if (b.art === 'mall') { S.quader(b.x, 0, b.z, b.x + b.w, 0.34, b.z + b.d, F.pflaster); }
  if (b.art === 'center' || b.art === 'fachmarkt') { baueCenterFlaeche(ctx, b, r, teile); }
}

/**
 * Hilfen für registrierte Flächen-Böden (FLAECHEN[art].boden(ctx, b, r, teile, B)): ctx = { S, I, scene, plan, dichte, typ, ost }.
 * B: F (Farben), YG, baumSetzen, figur, auto, brunnen, pflasterFlaeche, baueParkplatz, imRechteck, zw, waehle, richtung.
 */
const BODEN_HILFE = {
  F, YG, zw, waehle, richtung: (dx, dz) => richtung(dx, dz),
  baumSetzen: (...a) => baumSetzen(...a), figur: (...a) => figur(...a), auto: (...a) => auto(...a), brunnen: (...a) => brunnen(...a),
  pflasterFlaeche: (...a) => pflasterFlaeche(...a), baueParkplatz: (...a) => baueParkplatz(...a), imRechteck: (...a) => imRechteck(...a),
};

const EINKAUF_SLOTS = new Set(['slot:warenhaus', 'slot:premium', 'slot:sport', 'slot:wettbewerber', 'slot:outlet']);

/** Einkaufszentrum / Fachmarktlage: Asphaltfläche, Vorplatz am Eingang, Parkplatz mit Baumreihen, Leute. */
function baueCenterFlaeche(ctx, b, r, teile) {
  const { S, I } = ctx;
  const y = 0.33;
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, '#9a9fa4');
  const bau = teile.filter((p) => p.seite === 'frei');
  // Vorplatz (Pflaster) vor den Gebäuden, dann Parkplatz
  const zv = Math.max(...bau.map((p) => p.z + p.d), b.z + 10);
  pflasterFlaeche(ctx, { x: b.x + 1.5, z: zv, w: b.w - 3, d: 7 }, y + 0.02, '#e2dacb', 3.5);
  for (let x = b.x + 6; x < b.x + b.w - 4; x += 11) { baumSetzen(I, 'kugel', x, y + 0.02, zv + 5.2, r, 0.75, true); I.setze('bank', x + 3, y + 0.02, zv + 5.2, Math.PI); }
  for (let i = 0; i < (b.w / 4) * ctx.dichte; i++) figur(I, zw(r, b.x + 2, b.x + b.w - 2), y + 0.02, zw(r, zv + 0.5, zv + 6.5), r);
  if (b.parkplatz) { const P = { ...b.parkplatz, z: zv + 8.5, d: b.z + b.d - zv - 10.5 }; if (P.d > 6) baueParkplatz(ctx, P, y, r); }
  // Einkaufswagen-Häuschen und Pylon an der Einfahrt
  S.quader(b.x + b.w - 9, y, b.z + b.d - 6, b.x + b.w - 3, y + 2.4, b.z + b.d - 3.5, '#c9ccd0');
  S.quader(b.x + b.w - 9.2, y + 2.4, b.z + b.d - 6.2, b.x + b.w - 2.8, y + 2.6, b.z + b.d - 3.3, '#5c6268');
  S.quader(b.x + 2.5, y, b.z + b.d - 3.4, b.x + 3.3, y + 9, b.z + b.d - 2.6, '#5c6268');
  S.quader(b.x + 1.4, y + 6, b.z + b.d - 3.6, b.x + 4.4, y + 9.4, b.z + b.d - 2.4, b.art === 'center' ? '#e9e5dc' : '#d8dde1');
}

const imRechteck = (x, z, p, rad = 0) => x > p.x - rad && x < p.x + p.w + rad && z > p.z - rad && z < p.z + p.d + rad;

function baueHof(ctx, b, r, teile) {
  const { S, I } = ctx;
  const h = b.hof;
  if (!h || h.w <= 4 || h.d <= 4) return;
  const art = h.art ?? 'gruen';
  // GESTALTUNG.md: Hof ohne Rasen, neutrales Hofpflaster (dunkler als die Fußgängerzone, damit der Hof hinter den Bauten zurücktritt)
  const farbe = { gruen: F.hof, kies: F.kies, parkplatz: '#a3a7ab', spielplatz: F.hof, pflaster: '#cbc4b7' }[art] ?? F.hof;
  S.quader(h.x - 1, 0, h.z - 1, h.x + h.w + 1, 0.36, h.z + h.d + 1, farbe);
  // Slots (Warenhäuser) ragen tiefer als die Randbebauung in den Hof: ebenfalls Hindernis
  const hinder = teile.filter((p) => p.seite === 'hof' || p.seite === 'frei' || p.typ.startsWith('slot:'));
  const frei = (x, z, rad) => !hinder.some((p) => imRechteck(x, z, p, rad));
  const y = 0.36;
  if (art === 'parkplatz' && h.w > 12 && h.d > 12) { baueParkplatz(ctx, { x: h.x + 1, z: h.z + 1, w: h.w - 2, d: h.d - 2 }, y, r, hinder); return; }
  if (art === 'spielplatz' && h.w > 14 && h.d > 12) {
    const cx = h.x + h.w / 2, cz = h.z + h.d / 2;
    if (frei(cx, cz, 5)) {
      S.quader(cx - 4.5, y, cz - 3.5, cx + 4.5, y + 0.08, cz + 3.5, '#ead8a6');
      S.box(0.7, 2.0, 0.7, cx - 2.5, y + 1.0, cz - 1.5, '#d04a3f'); S.box(0.6, 0.12, 3.2, cx - 2.5, y + 1.1, cz + 0.2, '#e0b23c');
      S.box(2.8, 0.14, 0.14, cx + 2.2, y + 2.1, cz + 1, '#2f63b5'); S.box(0.14, 2.1, 0.14, cx + 0.8, y + 1.05, cz + 1, '#2f63b5'); S.box(0.14, 2.1, 0.14, cx + 3.6, y + 1.05, cz + 1, '#2f63b5');
      for (let i = 0; i < 4 * ctx.dichte; i++) figur(ctx.I, zw(r, cx - 4, cx + 4), y, zw(r, cz - 3, cz + 3), r);
    }
  }
  const n = b.hof.belegt ? 1 : Math.min(art === 'pflaster' ? 2 : 6, Math.floor((h.w * h.d) / 260) + (r() < 0.5 ? 1 : 0));
  const arten = ctx.plan.baumarten ?? ['linde', 'kastanie'];
  for (let i = 0; i < n; i++) {
    const x = zw(r, h.x + 2.5, h.x + h.w - 2.5), z = zw(r, h.z + 2.5, h.z + h.d - 2.5);
    if (frei(x, z, 2.5)) baumSetzen(I, waehle(r, [...arten, 'kugel', 'nadel']), x, y, z, r, zw(r, 0.7, 1.0), art === 'pflaster');
  }
  if (art === 'gruen') for (let i = 0; i < n; i++) { const x = zw(r, h.x + 1.5, h.x + h.w - 1.5), z = zw(r, h.z + 1.5, h.z + h.d - 1.5); if (frei(x, z, 1.5)) I.setze('busch', x, y, z, 0, zw(r, 0.7, 1.2), [waehle(r, KRONE.busch)]); }
  if (art === 'kies' && h.w > 14 && h.d > 10) for (let x = h.x + 3; x < h.x + h.w - 3; x += 3) if (r() < 0.6 && frei(x, h.z + 3.5, 2)) auto(I, x, y, h.z + 3.5, Math.PI / 2, r);
  if (art === 'pflaster') for (let i = 0; i < 1 * ctx.dichte; i++) { const x = zw(r, h.x + 1, h.x + h.w - 1), z = zw(r, h.z + 1, h.z + h.d - 1); if (frei(x, z, 0.5)) figur(I, x, y, z, r); }
}

/** Parkplatz mit Stellplatzmarkierung, Autos und Baumreihe. */
function baueParkplatz(ctx, P, y, r, hinder = []) {
  const { I } = ctx;
  const quer = P.w >= P.d;
  const lang = quer ? P.w : P.d, kurz = quer ? P.d : P.w;
  const reihen = Math.max(1, Math.floor((kurz + 1) / 11.5));
  for (let q = 0; q < reihen; q++) for (const seite of [0, 1]) {
    const v = q * 11.5 + (seite ? 8.5 : 2.5);
    if (v > kurz - 1) continue;
    for (let u = 1.5; u < lang - 1.5; u += 2.6) {
      const [x, z] = quer ? [P.x + u, P.z + v] : [P.x + v, P.z + u];
      if (hinder.some((p) => imRechteck(x, z, p, 1.5))) continue;
      I.setze('strich', quer ? x - 1.3 : x, y, quer ? z : z - 1.3, quer ? 0 : Math.PI / 2, [0.12, 1, 4.6]);
      if (r() < 0.68) auto(I, x, y, z, (quer ? Math.PI / 2 : 0) + (r() < 0.5 ? 0 : Math.PI), r);
    }
    if (seite === 1 && q < reihen - 1) for (let u = 6; u < lang - 4; u += 13) { const [x, z] = quer ? [P.x + u, P.z + q * 11.5 + 11.3] : [P.x + q * 11.5 + 11.3, P.z + u]; baumSetzen(I, waehle(r, ctx.plan.baumarten ?? ['linde']), x, y, z, r, 0.7, true); }
  }
}

function pflasterFlaeche(ctx, P, y, farbe, raster = 4) {
  const { S, I } = ctx;
  S.quader(P.x, 0, P.z, P.x + P.w, y, P.z + P.d, farbe);
  for (let x = P.x + raster; x < P.x + P.w - 0.5; x += raster) I.setze('fuge', x, y, P.z + P.d / 2, 0, [0.1, 1, P.d - 0.4]);
  for (let z = P.z + raster; z < P.z + P.d - 0.5; z += raster) I.setze('fuge', P.x + P.w / 2, y, z, 0, [P.w - 0.4, 1, 0.1]);
}

export function brunnen(S, x, z, y, gross = 1) {
  const g = gross;
  S.add(new THREE.CylinderGeometry(4.2 * g, 4.4 * g, 0.8, 8).translate(x, y + 0.4, z), F.stein);
  S.add(new THREE.CylinderGeometry(3.7 * g, 3.7 * g, 0.82, 8).translate(x, y + 0.36, z), '#5cc0cc');
  S.add(new THREE.CylinderGeometry(0.5 * g, 0.7 * g, 2.6 * g, 8).translate(x, y + 1.3 * g, z), F.stein);
  S.add(new THREE.CylinderGeometry(1.5 * g, 0.4 * g, 0.5 * g, 8).translate(x, y + 2.6 * g, z), F.stein);
  S.add(new THREE.CylinderGeometry(1.3 * g, 1.3 * g, 0.12, 8).translate(x, y + 2.84 * g, z), '#7fd0d9');
  S.add(new THREE.CylinderGeometry(0.15 * g, 0.3 * g, 1.6 * g, 6).translate(x, y + 3.6 * g, z), '#7aa68a');
  S.add(new THREE.SphereGeometry(0.4 * g, 8, 6).translate(x, y + 4.5 * g, z), '#7aa68a');
}

/** Offene Seiten eines Platzes (die nicht bebaut sind). */
const offeneSeiten = (b) => ['+z', '+x', '-z', '-x'].filter((s) => !(b.seiten ?? ['-z', '-x']).includes(s));

function platzRand(ctx, b, P, y, r, art = 'linde', abstand = 9) {
  const { I } = ctx;
  for (const s of offeneSeiten(b)) {
    if (s[1] === 'z') { const z = s === '+z' ? P.z + P.d - 2.6 : P.z + 2.6; for (let x = P.x + 4; x < P.x + P.w - 2; x += abstand) baumSetzen(I, art, x, y, z, r, 0.85, true); }
    else { const x = s === '+x' ? P.x + P.w - 2.6 : P.x + 2.6; for (let z = P.z + 4; z < P.z + P.d - 2; z += abstand) baumSetzen(I, art, x, y, z, r, 0.85, true); }
  }
}

/** GESTALTUNG.md: große Plätze nie als leere Fläche, sondern mit lockerem Baumraster (Abstand zum Mittelpunkt und zu Bauten). */
function baumraster(ctx, P, y, r, hinder, cx, cz, frei0 = 9, ab = 8) {
  if (P.w * P.d < 1200) return;
  for (let x = P.x + 5; x < P.x + P.w - 4; x += ab) for (let z = P.z + 5; z < P.z + P.d - 4; z += ab) {
    if (Math.hypot(x - cx, z - cz) < frei0 || hinder.some((p) => imRechteck(x, z, p, 3.5))) continue;
    baumSetzen(ctx.I, 'kugel', x, y, z, r, 0.75, true);
  }
}

function baueMarkt(ctx, b, r, hinder) {
  const { S, I } = ctx;
  const P = b.platz;
  const y = 0.34;
  pflasterFlaeche(ctx, P, y, waehle(r, ['#e9e1d1', '#e4dccb', '#ece6da']));
  const cx = P.x + P.w * 0.5, cz = P.z + P.d * 0.5;
  const denkmalMitte = hinder.some((p) => imRechteck(cx, cz, p, 6));
  if (!denkmalMitte) brunnen(S, cx, cz, y, P.w < 40 ? 0.8 : 1);
  const frei = (x, z, rad) => !hinder.some((p) => imRechteck(x, z, p, rad)) && Math.hypot(x - cx, z - cz) > 7;
  // Marktstände: Reihen quer zur längeren Seite
  const quer = P.w >= P.d;
  const lang = quer ? P.w : P.d, kurz = quer ? P.d : P.w;
  const reihen = kurz > 34 ? [5, kurz - 9] : [5];
  if (kurz > 60) reihen.splice(1, 0, kurz / 2 - 2);
  for (const v of reihen) for (let u = 5; u < lang - 6; u += 4.2) {
    const [x, z] = quer ? [P.x + u, P.z + v] : [P.x + v, P.z + u];
    if (!frei(x, z, 2.5) || r() > 0.82) continue;
    I.setze('marktstand', x, y, z, (quer ? 0 : Math.PI / 2) + (v > kurz / 2 ? Math.PI : 0), 1, [waehle(r, FARBEN.markise), waehle(r, ['#d9493a', '#e0b23c', '#7cb369', '#f2e6c8', '#c46a2f', '#8d5fbf'])]);
  }
  platzRand(ctx, b, P, y, r, waehle(r, ctx.plan.baumarten ?? ['linde']));
  if (P.w * P.d > 3000) baumraster(ctx, P, y, r, hinder, cx, cz, 12, 10);   // lange Märkte nicht leer
  if (!denkmalMitte) for (const [dx, dz, ry] of [[-6, 0, Math.PI / 2], [6, 0, -Math.PI / 2], [0, 6, Math.PI], [0, -6, 0]]) I.setze('bank', cx + dx, y, cz + dz, ry);
  for (const [x, z] of [[P.x + 2, P.z + 2], [P.x + P.w - 2, P.z + 2], [P.x + 2, P.z + P.d - 2], [P.x + P.w - 2, P.z + P.d - 2]]) I.setze('altlaterne', x, y, z, 0);
  I.setze('litfass', P.x + P.w - 4, y, P.z + P.d - 6, 0, 1, [waehle(r, OBERTEIL), waehle(r, OBERTEIL), waehle(r, OBERTEIL)]);
  const n = Math.round((P.w * P.d) / 60 * ctx.dichte);
  for (let i = 0; i < n; i++) {
    const x = zw(r, P.x + 1, P.x + P.w - 1), z = zw(r, P.z + 1, P.z + P.d - 1);
    if (!denkmalMitte && Math.hypot(x - cx, z - cz) < 4.6) continue;
    if (hinder.some((p) => imRechteck(x, z, p, 0.4))) continue;
    figur(I, x, y, z, r);
  }
}

function baueKleinerPlatz(ctx, b, r, hinder) {
  const { S, I } = ctx;
  const P = b.platz ?? b, y = 0.34;
  pflasterFlaeche(ctx, P, y, waehle(r, ['#e6dfd2', '#ddd5c6', '#e9e3d6']), 3);
  const cx = P.x + P.w / 2, cz = P.z + P.d / 2;
  const mitteFrei = !hinder.some((p) => imRechteck(cx, cz, p, 5));
  const variante = r();
  if (mitteFrei && variante < 0.4) brunnen(S, cx, cz, y, 0.7);
  else if (mitteFrei) { S.quader(cx - 6, y, cz - 6, cx + 6, y + 0.06, cz + 6, F.rasen); for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) baumSetzen(I, waehle(r, ctx.plan.baumarten ?? ['linde']), cx + dx, y + 0.06, cz + dz, r, 0.9); }
  platzRand(ctx, b, P, y, r, 'kugel', 8);
  baumraster(ctx, P, y, r, hinder, cx, cz);
  if (variante > 0.7) for (let x = P.x + 5; x < P.x + P.w - 5; x += 4.2) if (r() < 0.6 && !hinder.some((p) => imRechteck(x, P.z + 5, p, 2.5))) I.setze('marktstand', x, y, P.z + 5, 0, 1, [waehle(r, FARBEN.markise), waehle(r, ['#d9493a', '#e0b23c', '#7cb369'])]);
  for (let i = 0; i < 8; i++) I.setze('bank', P.x + zw(r, 3, P.w - 3), y, P.z + zw(r, 3, P.d - 3), Math.floor(r() * 4) * Math.PI / 2);
  for (let i = 0, n = Math.round((P.w * P.d) / 45 * ctx.dichte); i < n; i++) { const x = zw(r, P.x + 1, P.x + P.w - 1), z = zw(r, P.z + 1, P.z + P.d - 1); if (!hinder.some((p) => imRechteck(x, z, p, 0.4))) figur(I, x, y, z, r); }
}

function baueKirchplatz(ctx, b, r, teile) {
  const { S, I } = ctx;
  const P = b.platz, y = 0.34;
  pflasterFlaeche(ctx, P, y, b.art === 'domplatz' ? '#ddd3c1' : '#e4dccc', 5);
  const k = teile.find((p) => p.typ === 'slot:kirche');
  const hinder = teile.filter((p) => p.seite === 'frei');
  for (const s of offeneSeiten(b)) {
    if (s[1] === 'z') { const z0 = s === '+z' ? P.z + P.d - 6 : P.z + 1.5; S.quader(P.x + 1, y, z0, P.x + P.w - 1, y + 0.04, z0 + 4.5, F.rasen); for (let x = P.x + 4; x < P.x + P.w - 4; x += 8) if (!hinder.some((p) => imRechteck(x, z0 + 2.2, p, 2))) baumSetzen(I, b.art === 'domplatz' ? 'platane' : 'kastanie', x, y + 0.04, z0 + 2.2, r, 0.8); }
    else { const x0 = s === '+x' ? P.x + P.w - 6 : P.x + 1.5; S.quader(x0, y, P.z + 1, x0 + 4.5, y + 0.04, P.z + P.d - 1, F.rasen); for (let z = P.z + 4; z < P.z + P.d - 4; z += 8) if (!hinder.some((p) => imRechteck(x0 + 2.2, z, p, 2))) baumSetzen(I, b.art === 'domplatz' ? 'platane' : 'kastanie', x0 + 2.2, y + 0.04, z, r, 0.8); }
  }
  if (k) for (let x = k.x + 4; x < k.x + k.w - 2; x += 7) I.setze('bank', x, y, k.z + k.d + 3, Math.PI);
  // C3: Domplatte als offene Steinfläche (nur Baumreihen an den offenen Seiten), kein dichtes Baumraster
  if (b.art !== 'domplatz') baumraster(ctx, P, y, r, hinder, P.x + P.w / 2, P.z + P.d / 2, 0, 9);
  for (let i = 0, n = Math.round((P.w * P.d) / (b.art === 'domplatz' ? 40 : 70) * ctx.dichte); i < n; i++) {
    const x = zw(r, P.x + 1, P.x + P.w - 1), z = zw(r, P.z + 1, P.z + P.d - 1);
    if (teile.some((p) => p.seite === 'frei' && imRechteck(x, z, p, 1))) continue;
    figur(I, x, y, z, r);
  }
}

function baueGruenguertel(ctx, b, r, hinder) {
  const { S, I } = ctx;
  const y = 0.36;
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, F.rasen);
  const entlangZ = (b.achse ?? (b.d > b.w ? 'z' : 'x')) === 'z';
  const lang = entlangZ ? b.d : b.w, kurz = entlangZ ? b.w : b.d;
  const W = (u, v) => (entlangZ ? [b.x + v, b.z + u] : [b.x + u, b.z + v]);
  // geschwungener Weg aus kurzen versetzten Stücken, Wallgraben als Teich
  const graben = r() < 0.45 && lang > 50;
  let v = kurz * zw(r, 0.35, 0.65);
  for (let u = 0; u < lang; u += 6) {
    v = klemm(v + zw(r, -1.2, 1.2), 3, kurz - 3);
    const [x, z] = W(u + 3, v);
    S.box(entlangZ ? 3 : 6.4, 0.05, entlangZ ? 6.4 : 3, x, y + 0.025, z, F.weg);
    if (u % 18 === 0 && u > 4 && u < lang - 6) { const [bx, bz] = W(u + 3, v + 2.4); I.setze('bank', bx, y, bz, entlangZ ? Math.PI / 2 : Math.PI); }
  }
  if (graben) {
    const vw = v < kurz / 2 ? kurz * 0.75 : kurz * 0.25;
    const [gx, gz] = W(lang / 2, vw);
    const rl = lang * 0.32, rk = Math.min(kurz * 0.18, 5);
    ellipse(S, gx, gz, entlangZ ? rk : rl, entlangZ ? rl : rk, y - 0.6, y - 0.25, F.wasser);
    ellipsenRing(S, gx, gz, entlangZ ? rk : rl, entlangZ ? rl : rk, 0.7, y - 0.3, y + 0.15, F.stein);
  }
  // Baumreihen an beiden Rändern, dazwischen lockere Gruppen
  const arten = ctx.plan.baumarten ?? ['linde', 'kastanie'];
  const art = waehle(r, arten);
  for (const vv of [2.2, kurz - 2.2]) for (let u = 4; u < lang - 2; u += 8) { const [x, z] = W(u, vv); if (!hinder.some((p) => imRechteck(x, z, p, 2.5))) baumSetzen(I, art, x, y, z, r, 0.85); }
  // GESTALTUNG.md: Grünflächen dicht bepflanzt (Baumhaine wie in der Vorlage), keine leeren Rasenflächen
  for (let i = 0, nb = Math.max(lang / 10, (lang * kurz) / 110); i < nb; i++) {
    const u = zw(r, 4, lang - 4), vv = zw(r, 5, kurz - 5);
    if (Math.abs(vv - v) < 3) continue;
    const [x, z] = W(u, vv);
    if (hinder.some((p) => imRechteck(x, z, p, 3))) continue;
    if (graben) { const [gx, gz] = W(lang / 2, v < kurz / 2 ? kurz * 0.75 : kurz * 0.25); if (Math.abs((entlangZ ? z - gz : x - gx)) < lang * 0.36 && Math.abs((entlangZ ? x - gx : z - gz)) < 7) continue; }
    baumSetzen(I, waehle(r, [...arten, 'nadel', 'pappel']), x, y, z, r, zw(r, 0.75, 1.05));
  }
  for (let i = 0, n = Math.round(lang / 9 * ctx.dichte); i < n; i++) { const [x, z] = W(zw(r, 1, lang - 1), v + zw(r, -1, 1)); figur(I, x, y + 0.05, z, r); }
}

function baueSchlossplatz(ctx, b, r, hinder) {
  const { S, I } = ctx;
  const y = 0.34;
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, F.rasen);
  const E = b.ehrenhof ?? { x: b.x + b.w * 0.2, z: b.z + b.d * 0.4, w: b.w * 0.6, d: b.d * 0.55 };
  pflasterFlaeche(ctx, E, y + 0.01, '#e8dfcc', 6);
  // Parterre: vier Rasenfelder mit Hecken, Mittelbrunnen
  const cx = E.x + E.w / 2, cz = E.z + E.d / 2;
  const fw = E.w * 0.36, fd = E.d * 0.34;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x0 = cx + (sx > 0 ? 3 : -3 - fw), z0 = cz + (sz > 0 ? 3 : -3 - fd);
    S.quader(x0, y, z0, x0 + fw, y + 0.06, z0 + fd, '#8cbf7a');
    for (let u = 0; u <= fw; u += 2.2) { I.setze('busch', x0 + u, y + 0.06, z0, 0, [0.7, 0.55, 0.7], ['#4f8a49']); I.setze('busch', x0 + u, y + 0.06, z0 + fd, 0, [0.7, 0.55, 0.7], ['#4f8a49']); }
    for (let u = 2.2; u < fd; u += 2.2) { I.setze('busch', x0, y + 0.06, z0 + u, 0, [0.7, 0.55, 0.7], ['#4f8a49']); I.setze('busch', x0 + fw, y + 0.06, z0 + u, 0, [0.7, 0.55, 0.7], ['#4f8a49']); }
    I.setze('kuebel', x0 + fw / 2, y + 0.06, z0 + fd / 2, 0, 1, [waehle(r, ['#d96a8a', '#e0b23c', '#f2e6c8'])]);
  }
  if (!hinder.some((p) => imRechteck(cx, cz, p, 5))) brunnen(S, cx, cz, y, 0.9);
  // Alleen an den Seiten
  for (const x of [b.x + 4, b.x + b.w - 4]) for (let z = b.z + 6; z < b.z + b.d - 3; z += 8) baumSetzen(I, 'kastanie', x, y, z, r, 0.8);
  for (let x = E.x; x < E.x + E.w; x += 8) baumSetzen(I, 'kugel', x, y, b.z + b.d - 2.5, r, 0.8, true);
  for (let i = 0, n = Math.round((E.w * E.d) / 60 * ctx.dichte); i < n; i++) { const x = zw(r, E.x + 1, E.x + E.w - 1), z = zw(r, E.z + 1, E.z + E.d - 1); if (Math.abs(x - cx) < 3 || Math.abs(z - cz) < 3) figur(I, x, y, z, r); }
}

function baueGarten(ctx, b, r, hinder) {
  // Schlossgarten: barocke Wegachsen, Rasenkarrees, Heckenkanten, Bassin
  const { S, I } = ctx;
  const y = 0.36;
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, '#8fc27f');
  const cx = b.x + b.w / 2, cz = b.z + b.d / 2;
  S.quader(cx - 1.8, y, b.z + 2, cx + 1.8, y + 0.05, b.z + b.d - 2, F.weg);
  S.quader(b.x + 2, y, cz - 1.8, b.x + b.w - 2, y + 0.05, cz + 1.8, F.weg);
  ellipse(S, cx, cz, 9, 9, y, y + 0.05, F.weg);
  ellipse(S, cx, cz, 5.5, 5.5, y - 0.3, y + 0.02, F.wasser);
  ellipsenRing(S, cx, cz, 5.5, 5.5, 0.6, y - 0.2, y + 0.35, F.stein);
  for (const z of [b.z + 5, b.z + b.d - 5]) for (let x = b.x + 4; x < b.x + b.w - 3; x += 2.4) I.setze('busch', x, y, z, 0, [0.8, 0.6, 0.8], ['#4f8a49']);
  for (const x of [cx - 4, cx + 4]) for (let z = b.z + 8; z < b.z + b.d - 8; z += 7) if (Math.abs(z - cz) > 10) baumSetzen(I, 'kugel', x, y, z, r, 0.8);
  for (const x of [b.x + 3, b.x + b.w - 3]) for (let z = b.z + 6; z < b.z + b.d - 4; z += 7) baumSetzen(I, 'linde', x, y, z, r, 0.85);
  for (const z of [b.z + 2.5, b.z + b.d - 2.5]) for (let x = b.x + 8; x < b.x + b.w - 6; x += 7) baumSetzen(I, 'linde', x, y, z, r, 0.8);
  // B6: Rasenkarrees als Parterre mit Heckenrahmen und Blumenbändern statt leerer Wiese
  for (const [qx0, qx1] of [[b.x + 6, cx - 3], [cx + 3, b.x + b.w - 6]]) for (const [qz0, qz1] of [[b.z + 7, cz - 3], [cz + 3, b.z + b.d - 7]]) {
    if (qx1 - qx0 < 10 || qz1 - qz0 < 10) continue;
    const a0 = qx0 + 2, a1 = qx1 - 2, c0 = qz0 + 2, c1 = qz1 - 2;
    for (let x = a0; x < a1; x += 2.2) { I.setze('busch', x, y, c0, 0, [0.55, 0.45, 0.55], ['#4f8a49']); I.setze('busch', x, y, c1, 0, [0.55, 0.45, 0.55], ['#4f8a49']); }
    for (let z = c0 + 2.2; z < c1 - 1; z += 2.2) { I.setze('busch', a0, y, z, 0, [0.55, 0.45, 0.55], ['#4f8a49']); I.setze('busch', a1, y, z, 0, [0.55, 0.45, 0.55], ['#4f8a49']); }
    const f = waehle(r, ['#c9586a', '#e0b23c', '#b56fb0', '#e7894a']);
    for (let z = c0 + 3; z < c1 - 2; z += 4) S.quader(a0 + 2.5, y, z, a1 - 2.5, y + 0.14, z + 1.4, f);
    if (qx1 - qx0 > 26 && qz1 - qz0 > 22) baumSetzen(I, 'kugel', (qx0 + qx1) / 2, y, (qz0 + qz1) / 2, r, 0.9);
  }
  for (let i = 0; i < (b.w * b.d) / 500; i++) { const x = zw(r, b.x + 8, b.x + b.w - 8), z = zw(r, b.z + 8, b.z + b.d - 8); if (Math.abs(x - cx) > 6 && Math.abs(z - cz) > 6 && !hinder.some((p) => imRechteck(x, z, p, 3))) I.setze('kuebel', x, y, z, 0, 1, [waehle(r, ['#d96a8a', '#e0b23c'])]); }
  for (let i = 0, n = Math.round((b.w + b.d) / 8 * ctx.dichte); i < n; i++) { const t = r(); const x = t < 0.5 ? cx + zw(r, -1.5, 1.5) : zw(r, b.x + 3, b.x + b.w - 3), z = t < 0.5 ? zw(r, b.z + 3, b.z + b.d - 3) : cz + zw(r, -1.5, 1.5); figur(I, x, y + 0.05, z, r); }
}

function baueKleingarten(ctx, b, r, hinder) {
  const { S, I } = ctx;
  const y = 0.36;
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, '#a3c98f');
  const pw = zw(r, 9, 12), pd = zw(r, 12, 15);
  const weg = 2.4;
  for (let z = b.z + 2; z + pd < b.z + b.d - 1; z += 2 * pd + weg) {
    S.quader(b.x + 1, y, z + pd, b.x + b.w - 1, y + 0.04, z + pd + weg, F.weg);
    for (const zz of [z, z + pd + weg]) for (let x = b.x + 2; x + pw < b.x + b.w - 1; x += pw) {
      if (zz + pd > b.z + b.d - 1) continue;
      const cx = x + pw / 2, cz = zz + pd / 2;
      if (hinder.some((p) => imRechteck(cx, cz, p, 3))) continue;
      S.quader(x + 0.4, y, zz + 0.4, x + pw - 0.4, y + 0.05, zz + pd - 0.4, waehle(r, ['#9cc58a', '#b2d39b', '#93bd7f']));
      for (let k = 0; k < 3; k++) S.quader(x + 1, y + 0.05, zz + 1.5 + k * 1.6, x + pw * 0.45, y + 0.12, zz + 2.3 + k * 1.6, waehle(r, ['#8a6a4a', '#7a9f55', '#c5a36a']));
      const hf = waehle(r, ['#c9a77c', '#8fa9b5', '#d9c49a', '#b56b4f', '#e8e4dc', '#7c9a6a']);
      S.quader(x + pw - 3.6, y, zz + pd - 4.4, x + pw - 0.9, y + 2.1, zz + pd - 1.6, hf);
      S.add(dachProfil(3.1, 3.2, 0.9, 0.1, 'x').translate(x + pw - 2.25, y + 2.1, zz + pd - 3.0), waehle(r, ['#b4583f', '#56636c', '#6f6a5c']));
      if (r() < 0.6) baumSetzen(I, waehle(r, ['kugel', 'busch', 'linde']), x + 2, y, zz + pd - 2, r, 0.6);
      for (let u = 0; u < pw; u += 2.4) I.setze('busch', x + u, y, zz + 0.3, 0, [0.55, 0.5, 0.55], ['#5f9a56']);
    }
  }
  for (let i = 0; i < 6 * ctx.dichte; i++) figur(I, zw(r, b.x + 2, b.x + b.w - 2), y, zw(r, b.z + 2, b.z + b.d - 2), r);
}

// ====================================================================================
// Stadtrandgürtel (plan.aussen aus stadtrand.js): Straßen, Vororte, Gewerbe, Felder, Wald, Küste
// ====================================================================================
const VORORT_WAND = ['#efe9dc', '#e8dfcc', '#f1ede4', '#e2d6c0', '#d9cdb6', '#e6e1d6', '#d8c8ae', '#cdbfa6', '#e9e4da'];
const VORORT_KLINKER = ['#a8664f', '#9e5c47', '#b9785e', '#8f5a48', '#c4876a'];
const VORORT_DACH = ['#9a4e3a', '#8a463a', '#6f6a64', '#5d6268', '#a65a40', '#7b5b4a', '#4f5459'];
const ZEILE_WAND = ['#e9e4d6', '#e2dccd', '#d6dbd9', '#ebe2cf', '#d9d0bc', '#cfd6d4'];
const FELDER = ['#d4c27c', '#c9b26a', '#b8c97a', '#e0cf8f', '#9fc078', '#c7a66a', '#b59a72', '#d9c98c', '#a9c47e'];
const WIESE = ['#a9cf8f', '#a3c98a', '#b0d395'];

/** Rechteck minus Löcher (alle achsparallel) → Liste von Rechtecken [x0, z0, x1, z1]. */
function rechteckMinus(R0, loecher) {
  let teile = [R0];
  for (const [hx0, hz0, hx1, hz1] of loecher) {
    const neu = [];
    for (const [x0, z0, x1, z1] of teile) {
      if (hx1 <= x0 || hx0 >= x1 || hz1 <= z0 || hz0 >= z1) { neu.push([x0, z0, x1, z1]); continue; }
      if (hz0 > z0) neu.push([x0, z0, x1, hz0]);
      if (hz1 < z1) neu.push([x0, hz1, x1, z1]);
      const a = Math.max(z0, hz0), e = Math.min(z1, hz1);
      if (hx0 > x0) neu.push([x0, a, hx0, e]);
      if (hx1 < x1) neu.push([hx1, a, x1, e]);
    }
    teile = neu;
  }
  return teile.filter(([x0, z0, x1, z1]) => x1 - x0 > 0.01 && z1 - z0 > 0.01);
}

function baueStadtrand(ctx) {
  const { S, plan } = ctx;
  const A = plan.aussen, R = A.R, W = plan.breite, T = plan.tiefe;
  // Weniger Verkehr und Leute als in der Stadt
  const rc = { ...ctx, dichte: ctx.dichte * 0.35, r: rng(plan.seed * 41 + 9) };
  // Grund: Wiese unter dem ganzen Gürtel, ausgespart unter dem Wasser
  const loecher = A.wasser.map((w) => [w.x, w.z, w.x + w.w, w.z + w.d]);
  for (const ring of [[-R, -R, W + R, 0], [-R, T, W + R, T + R], [-R, 0, 0, T], [W, 0, W + R, T]]) for (const [x0, z0, x1, z1] of rechteckMinus(ring, loecher)) S.quader(x0, -0.6, z0, x1, -0.08, z1, '#a7cb8f');
  if (plan.berge) baueBerge(rc, plan.berge);
  for (const s of A.strassen) (s.bruecke ? baueBruecke : baueSegment)(rc, s);
  for (const k of A.kreuzungen) baueKreuzung(rc, k);
  for (const g of A.gruen) baueGruenstreifen(rc, g);
  for (const b of A.bloecke) {
    const r = rng(b.seed + 5);
    if (b.zone === 'dicht' || b.zone === 'siedlung' || b.zone === 'gewerbe' || b.zone === 'sonder') baueVorortBlock(rc, b, r);
    else if (b.zone === 'kleingarten') { gehwegPlatte(rc, b); baueKleingarten(rc, b, r, []); }
    else if (b.zone === 'hof') baueHofstelle(rc, b, r);
    else if (b.zone === 'wald') baueWald(rc, b, r);
    else baueFeld(rc, b, r);
  }
}

/**
 * Berge im Stadtrandgürtel (plan.berge, stadtrand.js): glatte Hänge, die die Kulisse am Kartenrand fortsetzen (B5).
 * Wald mit Lichtungen, Rebhänge mit Zeilen, Alpen mit Fels und Schnee über der Baumgrenze.
 */
function baueBerge(ctx, B) {
  const { S, I, plan } = ctx;
  const R = plan.aussen.R, W = plan.breite, T = plan.tiefe;
  const r = rng(plan.seed * 59 + 11);
  const h = (x, z) => bergHoehe(B, x, z) - 0.06;
  const So = B.seiten['-z'], Sl = B.seiten['-x'];
  const flaechen = [];
  if (So) { flaechen.push([-R, -R, W + R, 0, So]); if (So.kante > 0.5) flaechen.push([0, 0, W, So.kante, So]); }
  if (Sl) { flaechen.push([-R, So ? 0 : -R, 0, T + R, Sl]); if (Sl.kante > 0.5) flaechen.push([0, So ? So.kante : 0, Sl.kante, T, Sl]); }
  for (const [x0, z0, x1, z1, P] of flaechen) {
    const alpen = /alpen/.test(P.inhalt), reben = P.inhalt === 'wein' || P.inhalt === 'kessel';
    const baumgrenze = P.H0 + P.Hr * (alpen ? 0.45 : 2);
    const farbe = (x, y, z, steil) => {
      if (alpen && (y > P.H0 + P.Hr * 0.78)) return '#eef2f6';
      if (alpen && (y > baumgrenze || steil > 0.62)) return y > baumgrenze + 20 ? '#9aa1ab' : '#8f978f';
      if (reben && y > 1 && y < P.H0 + P.Hr * 0.45) return y > P.H0 + P.Hr * 0.25 ? '#bdb384' : '#b3a978';   // heller Erdgrund, Reben als eigene Zeilen
      return Math.sin(x * 0.011 + z * 0.007) + Math.sin(z * 0.017 - x * 0.004) > 1.25 ? '#93bd76' : '#6f9f5c';
    };
    gelaende(S, x0, z0, x1, z1, h, farbe, { schritt: 6 });
    if (reben) rebzeilen(S, x0, z0, x1, z1, (x, z) => h(x, z) + 0.02, P === Sl, (x, y) => y > 1.2 && y < P.H0 + P.Hr * 0.45 - 1);
    // Bäume (Instanzen) auf dem Hang, nicht auf Lichtungen, Reben und über der Baumgrenze
    for (let x = x0 + 4; x < x1 - 2; x += 8.5) for (let z = z0 + 4; z < z1 - 2; z += 8.5) {
      const tx = x + zw(r, -3, 3), tz = z + zw(r, -3, 3), y = h(tx, tz);
      if (y > baumgrenze || (reben && y < P.H0 + P.Hr * 0.45 && y > 1)) continue;
      if (Math.sin(tx * 0.011 + tz * 0.007) + Math.sin(tz * 0.017 - tx * 0.004) > 1.25) continue;
      baumSetzen(I, r() < (alpen ? 0.8 : 0.5) ? 'nadel' : waehle(r, ['linde', 'kastanie', 'birke']), tx, y, tz, r, zw(r, 0.9, 1.3));
    }
  }
}

/** Grünstreifen zwischen Stadtrandstraße und Vorort: Rasen mit Bordstein und Baumreihe. */
function baueGruenstreifen(ctx, g) {
  const { S, I, r, plan } = ctx;
  // zur Stadt hin über den äußeren Gehwegstreifen der Randstraße
  const e = 4.4;
  let x0 = g.x, z0 = g.z, x1 = g.x + g.w, z1 = g.z + g.d;
  if (g.seite === '-x') x1 += e; else if (g.seite === '+x') x0 -= e; else if (g.seite === '-z') z1 += e; else z0 -= e;
  platte(S, x0, z0, x1, z1, 0.6, 0.3, 0.9, F.bord);
  S.quader(x0 + 0.3, 0.3, z0 + 0.3, x1 - 0.3, 0.36, z1 - 0.3, F.rasen);
  const lang = g.achse === 'z' ? z1 - z0 : x1 - x0;
  for (let u = 6; u < lang - 4; u += 11) {
    const [x, z] = g.achse === 'z' ? [(x0 + x1) / 2, z0 + u] : [x0 + u, (z0 + z1) / 2];
    baumSetzen(I, waehle(r, plan.baumarten ?? ['linde']), x, 0.36, z, r, zw(r, 0.8, 1.05));
  }
}

/** Vorortblock nach der Belegung aus stadtrand.js (bauten, flaechen, hecken, baeume). */
function baueVorortBlock(ctx, b, r) {
  const { S, I } = ctx;
  const gew = b.zone === 'gewerbe';
  gehwegPlatte(ctx, b);
  S.quader(b.x, 0, b.z, b.x + b.w, 0.34, b.z + b.d, gew ? '#a2a6aa' : F.rasen);
  const y = 0.34;
  for (const f of b.flaechen ?? []) {
    if (f.art === 'weg') S.quader(f.x, y, f.z, f.x + f.w, y + 0.04, f.z + f.d, '#d3cbbb');
    else if (f.art === 'hof') S.quader(f.x, y, f.z, f.x + f.w, y + 0.03, f.z + f.d, gew ? '#8f959b' : '#c4bcae');
    else if (f.art === 'sportplatz') {
      S.quader(f.x, y, f.z, f.x + f.w, y + 0.03, f.z + f.d, '#b8574a');
      S.quader(f.x + 4, y + 0.03, f.z + 4, f.x + f.w - 4, y + 0.05, f.z + f.d - 4, '#6fae5a');
      S.quader(f.x + f.w / 2 - 0.1, y + 0.05, f.z + 4, f.x + f.w / 2 + 0.1, y + 0.06, f.z + f.d - 4, '#f2f1ec');
      for (const zz of [f.z + 4, f.z + f.d - 4.2]) S.quader(f.x + 4, y + 0.05, zz, f.x + f.w - 4, y + 0.06, zz + 0.2, '#f2f1ec');
      for (const xx of [f.x + 4, f.x + f.w - 4.2]) S.quader(xx, y + 0.05, f.z + 4, xx + 0.2, y + 0.06, f.z + f.d - 4, '#f2f1ec');
    }
    else { S.quader(f.x, y, f.z, f.x + f.w, y + 0.03, f.z + f.d, '#9a9fa4'); baueParkplatz(ctx, f, y + 0.03, r); }
  }
  for (const [x0, z0, x1, z1] of b.hecken ?? []) {
    const lang = Math.max(x1 - x0, z1 - z0), ax = x1 - x0 >= z1 - z0;
    for (let u = 0.8; u < lang - 0.4; u += 2.2) I.setze('busch', ax ? x0 + u : (x0 + x1) / 2, y, ax ? (z0 + z1) / 2 : z0 + u, 0, [0.55, 0.55, 0.55], ['#5f9a56']);
  }
  const klinker = r() < 0.3;
  let wand = waehle(r, klinker ? VORORT_KLINKER : VORORT_WAND), dach = waehle(r, VORORT_DACH);
  for (const q of b.bauten ?? []) {
    let f;
    if (q.art === 'reihenhaus') { if (r() < 0.3) wand = waehle(r, klinker ? VORORT_KLINKER : VORORT_WAND); f = [wand, dach]; }
    else if (q.art === 'zeile') f = [waehle(r, ZEILE_WAND), dach];
    else if (q.art === 'halle') f = [waehle(r, ['#d9dcdf', '#cfd3d6', '#e4e1da', '#b9bec2', '#d8cdb8']), waehle(r, ['#2f6f8f', '#c8322b', '#3f7d56', '#e0b23c', '#5d646b', '#2b3a55'])];
    else if (q.art === 'scheune') f = [waehle(r, ['#8a5a45', '#a8664f', '#7a6a58', '#c9bfae']), waehle(r, ['#6f6a64', '#9a4e3a', '#5d6268'])];
    else if (q.art === 'garage') f = [waehle(r, ['#e2ddd2', '#d6d0c4', '#cfc9bd'])];
    else if (q.art === 'dorfkirche') f = [waehle(r, ['#e9e3d6', '#d9cdb6', '#b9785e']), waehle(r, ['#5d6268', '#9a4e3a', '#6f9a7d'])];
    else if (q.art === 'tankstelle') f = [waehle(r, ['#2f6f8f', '#c8322b', '#3f7d56', '#e0b23c'])];
    else f = [r() < 0.25 ? waehle(r, VORORT_KLINKER) : waehle(r, VORORT_WAND), waehle(r, VORORT_DACH)];
    I.setze(q.art, q.x, y, q.z, q.ry, q.s ?? 1, f);
  }
  for (const [x, z, art] of b.baeume ?? []) baumSetzen(I, art, x, y, z, r, zw(r, 0.65, 0.95));
}

/** Acker und Wiesen: Schläge in wechselnder Richtung und Frucht, Hecken und Pappelreihen an den Rändern. */
function baueFeld(ctx, b, r) {
  const { S, I } = ctx;
  const quer = r() < 0.5;
  const L = quer ? b.d : b.w;
  const n = L > 70 ? 1 + Math.floor(r() * 3) : 1;
  let a = 0;
  for (let k = 0; k < n; k++) {
    const len = k === n - 1 ? L - a : L * zw(r, 0.25, 0.55);
    const x0 = quer ? b.x : b.x + a, z0 = quer ? b.z + a : b.z, w = quer ? b.w : len, d = quer ? len : b.d;
    a += len;
    if (w < 3 || d < 3) continue;
    const wiese = r() < 0.3;
    S.quader(x0 + 0.6, -0.08, z0 + 0.6, x0 + w - 0.6, 0.0, z0 + d - 0.6, wiese ? waehle(r, WIESE) : waehle(r, FELDER));
    if (!wiese) {
      const furchenX = r() < 0.5, ab = zw(r, 1.8, 3.2);
      if (furchenX) for (let q = z0 + 1.6; q < z0 + d - 1; q += ab) I.setze('fugeDunkel', x0 + w / 2, 0.0, q, 0, [w - 1.6, 1, 0.22]);
      else for (let q = x0 + 1.6; q < x0 + w - 1; q += ab) I.setze('fugeDunkel', q, 0.0, z0 + d / 2, 0, [0.22, 1, d - 1.6]);
    } else for (let i = 0; i < (w * d) / 900; i++) baumSetzen(I, waehle(r, ['linde', 'kastanie']), x0 + zw(r, 4, w - 4), -0.05, z0 + zw(r, 4, d - 4), r, zw(r, 0.9, 1.2));
  }
  // Hecke oder Pappelreihe an einer Seite
  const h = waehle(r, ['-x', '+x', '-z', '+z', null]);
  if (h) {
    const pap = r() < 0.4;
    const entlangX = h[1] === 'z', len = entlangX ? b.w : b.d;
    for (let u = 2; u < len - 2; u += pap ? 8 : 3.2) {
      const x = entlangX ? b.x + u : h === '+x' ? b.x + b.w - 1 : b.x + 1, z = entlangX ? (h === '+z' ? b.z + b.d - 1 : b.z + 1) : b.z + u;
      if (pap) baumSetzen(I, 'pappel', x, -0.05, z, r, 0.9); else I.setze('busch', x, -0.05, z, 0, [1, 0.9, 1], [waehle(r, KRONE.busch)]);
    }
  }
}

/** Bauernhof: Felder, darin Hofplatz mit Wohnhaus, Scheune und Hofbäumen (Belegung aus stadtrand.js). */
function baueHofstelle(ctx, b, r) {
  const { S, I } = ctx;
  baueFeld(ctx, b, r);
  for (const f of b.flaechen ?? []) S.quader(f.x, 0.0, f.z, f.x + f.w, 0.06, f.z + f.d, '#cfc4ae');
  for (const q of b.bauten ?? []) I.setze(q.art, q.x, 0.06, q.z, q.ry, 1, q.art === 'scheune' ? [waehle(r, ['#8a5a45', '#a8664f', '#7a6a58', '#c9bfae']), waehle(r, ['#6f6a64', '#9a4e3a', '#5d6268'])] : [waehle(r, ['#efe9dc', '#e2d6c0', '#a8664f']), waehle(r, VORORT_DACH)]);
  for (const [x, z, art] of b.baeume ?? []) baumSetzen(I, art, x, 0.06, z, r, zw(r, 0.9, 1.2));
}

/** Wald: dunkler Waldboden, dichte Misch- und Nadelbäume, aufgelockerter Rand. */
function baueWald(ctx, b, r) {
  const { S, I } = ctx;
  S.quader(b.x + 0.5, -0.08, b.z + 0.5, b.x + b.w - 0.5, 0.02, b.z + b.d - 0.5, '#7fae6c');
  const n = Math.round((b.w * b.d) / 70);
  const nadel = zw(r, 0.3, 0.8);
  for (let i = 0; i < n; i++) {
    const x = b.x + zw(r, 1.5, b.w - 1.5), z = b.z + zw(r, 1.5, b.d - 1.5);
    baumSetzen(I, r() < nadel ? 'nadel' : waehle(r, ['linde', 'kastanie', 'birke', 'linde']), x, 0.02, z, r, zw(r, 0.9, 1.35));
  }
}

/** Naturufer eines Binnensees (Waldseite): Sandstreifen und Böschung statt Kaimauer. */
function naturUfer(ctx, b, sd) {
  const { S } = ctx;
  const X0 = b.x, X1 = b.x + b.w, Z0 = b.z, Z1 = b.z + b.d;
  if (sd.s === '-x') S.quader(X0 - 0.5, WASSER_Y - 1.2, Z0, X0 + 5, -0.1, Z1, '#d9cfa6');
  else if (sd.s === '+x') S.quader(X1 - 5, WASSER_Y - 1.2, Z0, X1 + 0.5, -0.1, Z1, '#d9cfa6');
  else if (sd.s === '-z') S.quader(X0, WASSER_Y - 1.2, Z0 - 0.5, X1, -0.1, Z0 + 5, '#d9cfa6');
  else S.quader(X0, WASSER_Y - 1.2, Z1 - 5, X1, -0.1, Z1 + 0.5, '#d9cfa6');
}

/** Küste: Molen mit Leuchtfeuer und Segelboote vor der Stadt. */
function kuestenWasser(ctx, b, r) {
  const { S, I, plan } = ctx;
  const W = plan.breite, T = plan.tiefe;
  const k = plan.aussen.kueste;
  const entlangZ = k[1] === 'x';
  const n = b.binnen ? 0 : 2;
  for (let i = 0; i < n; i++) {
    const u = entlangZ ? T * (0.3 + 0.4 * i) : W * (0.3 + 0.4 * i);
    const len = zw(r, 70, 130);
    const dir = k[0] === '-' ? -1 : 1, kante = (k === '-x' || k === '-z' ? 0 : entlangZ ? W : T) + dir * (plan.aussen.kuesteAb ?? 0);
    const a = kante, e = kante + dir * len;
    if (entlangZ) S.quader(Math.min(a, e), WASSER_Y - 1.2, u - 3, Math.max(a, e), 1.0, u + 3, F.kai);
    else S.quader(u - 3, WASSER_Y - 1.2, Math.min(a, e), u + 3, 1.0, Math.max(a, e), F.kai);
    const [lx, lz] = entlangZ ? [e, u] : [u, e];
    S.quader(lx - 1.4, 1.0, lz - 1.4, lx + 1.4, 9, lz + 1.4, '#f2f1ec');
    S.quader(lx - 1.5, 4, lz - 1.5, lx + 1.5, 5.6, lz + 1.5, '#c8322b');
    S.quader(lx - 1.0, 9, lz - 1.0, lx + 1.0, 10.6, lz + 1.0, '#3f5260');
  }
  // Segelboote nahe der Küste
  for (let i = 0; i < (b.binnen ? 6 : 10); i++) {
    const x = zw(r, b.x + 10, b.x + b.w - 10), z = zw(r, b.z + 10, b.z + b.d - 10);
    I.setze('schiff', x, WASSER_Y + 0.5, z, r() * Math.PI * 2, 0.45, [waehle(r, ['#f3f1ea', '#2f6f8f', '#c9483e'])]);
  }
}

/** Umland: Wiesen, Äcker, Waldstücke rund um die Stadt. */
/**
 * GESTALTUNG.md: nie ein Kartenrand im Bild. Rings um die Karte liegt Umland (Felder, Wald) bzw. bei Seestädten Wasser,
 * damit Nahausschnitte am Stadtrand nicht in den Hintergrund kippen.
 */
function baueAussenring(ctx, R) {
  if (!R) return;
  const { S, plan } = ctx;
  const B = plan.breite, T = plan.tiefe;
  const ringe = [[-R, -R, B + R, 0], [-R, T, B + R, T + R], [-R, 0, 0, T], [B, 0, B + R, T]];
  if (plan.umlandArt === 'see') {
    for (const [x0, z0, x1, z1] of ringe) { S.quader(x0, WASSER_Y - 1.5, z0, x1, WASSER_Y - 0.6, z1, '#2f6f7d'); S.quader(x0, WASSER_Y - 0.62, z0, x1, WASSER_Y, z1, F.wasser ?? '#3c8a9b'); }
    return;
  }
  let k = 0;
  for (const [x0, z0, x1, z1] of ringe) baueUmland(ctx, { x: x0, z: z0, w: x1 - x0, d: z1 - z0, seed: plan.seed * 13 + 7 + k++ });
}

function baueUmland(ctx, u) {
  const { S, I } = ctx;
  const r = rng(u.seed);
  S.quader(u.x, -0.6, u.z, u.x + u.w, -0.05, u.z + u.d, '#a7cb8f');
  const n = Math.max(1, Math.round((u.w * u.d) / 2600));
  for (let i = 0; i < n; i++) {
    const w = zw(r, 20, Math.min(60, u.w - 4)), d = zw(r, 16, Math.min(50, u.d - 4));
    if (w < 8 || d < 8) continue;
    const x = u.x + zw(r, 2, u.w - w - 2), z = u.z + zw(r, 2, u.d - d - 2);
    const art = r();
    if (art < 0.55) {
      const f = waehle(r, ['#d4c27c', '#c9b26a', '#b8c97a', '#e0cf8f', '#9fc078']);
      S.quader(x, -0.05, z, x + w, 0.0, z + d, f);
      for (let q = 2; q < (w > d ? d : w); q += 2.2) I.setze('fugeDunkel', w > d ? x + w / 2 : x + q, 0.0, w > d ? z + q : z + d / 2, 0, w > d ? [w - 1, 1, 0.25] : [0.25, 1, d - 1]);
    } else if (art < 0.85) {
      for (let k = 0; k < (w * d) / 60; k++) baumSetzen(I, waehle(r, ['nadel', 'nadel', 'linde', 'kastanie']), x + zw(r, 0, w), -0.05, z + zw(r, 0, d), r, zw(r, 0.8, 1.15));
    } else for (let k = 0; k < w / 9; k++) baumSetzen(I, 'pappel', x + k * 9, -0.05, z + d / 2, r, 0.9);
  }
}

function baueWasserAlle(ctx, liste) {
  const { S, I, plan } = ctx;
  // Kartenrand bzw. Gürtelrand: dort keine Kaimauer (das Wasser läuft aus dem Bild)
  const RR = plan.aussen ? plan.aussen.R : 0;
  const randX0 = 0.5 - RR, randX1 = plan.breite + RR - 0.5, randZ0 = 0.5 - RR, randZ1 = plan.tiefe + RR - 0.5;
  const alleStrassen = plan.aussen ? [...plan.strassen, ...plan.aussen.strassen] : plan.strassen;
  for (const b of liste) {
    const r = rng(b.seed + 7);
    const X0 = b.x, X1 = b.x + b.w, Z0 = b.z, Z1 = b.z + b.d;
    S.quader(X0, WASSER_Y - 1.2, Z0, X1, WASSER_Y, Z1, F.wasser);
    const seiten = [
      { s: '-x', fix: X0, a: Z0, e: Z1, aussen: X0 - 0.4, entlang: 'z', amRand: X0 < randX0 },
      { s: '+x', fix: X1, a: Z0, e: Z1, aussen: X1 + 0.4, entlang: 'z', amRand: X1 > randX1 },
      { s: '-z', fix: Z0, a: X0, e: X1, aussen: Z0 - 0.4, entlang: 'x', amRand: Z0 < randZ0 },
      { s: '+z', fix: Z1, a: X0, e: X1, aussen: Z1 + 0.4, entlang: 'x', amRand: Z1 > randZ1 },
    ];
    for (const sd of seiten) {
      if (sd.amRand) continue;
      if (b.naturufer === sd.s) { naturUfer(ctx, b, sd); continue; }
      // von anderen Wasserflächen überdeckte Abschnitte
      const weg = [];
      for (const q of liste) {
        if (q === b) continue;
        const enthaelt = sd.entlang === 'z' ? q.x < sd.aussen && q.x + q.w > sd.aussen : q.z < sd.aussen && q.z + q.d > sd.aussen;
        if (enthaelt) weg.push(sd.entlang === 'z' ? [q.z, q.z + q.d] : [q.x, q.x + q.w]);
      }
      const innen = sd.s[0] === '-' ? 1 : -1;
      for (const [a, e] of intervalleMinus(sd.a, sd.e, weg)) {
        if (e - a < 0.5) continue;
        if (sd.entlang === 'z') S.quader(sd.s === '-x' ? X0 : X1 - 1, WASSER_Y - 1.2, a, sd.s === '-x' ? X0 + 1 : X1, 0.35, e, F.kai);
        else S.quader(a, WASSER_Y - 1.2, sd.s === '-z' ? Z0 : Z1 - 1, e, 0.35, sd.s === '-z' ? Z0 + 1 : Z1, F.kai);
        // Geländer
        const gp = sd.fix + innen * 0.5;
        if (sd.entlang === 'z') { S.quader(gp - 0.05, 1.0, a + 0.4, gp + 0.05, 1.1, e - 0.4, '#4a5056'); for (let z = a + 0.6; z < e - 0.4; z += 2.4) I.setze('pfosten', gp, 0.35, z, 0); }
        else { S.quader(a + 0.4, 1.0, gp - 0.05, e - 0.4, 1.1, gp + 0.05, '#4a5056'); for (let x = a + 0.6; x < e - 0.4; x += 2.4) I.setze('pfosten', x, 0.35, gp, 0); }
      }
      // Kai-Gehweg dort, wo eine Straße am Wasser entlangführt
      for (const s of alleStrassen) {
        if (s.bruecke || s.achse !== sd.entlang) continue;
        const kante = s.mitte + (sd.s[0] === '-' ? s.breite / 2 : -s.breite / 2);
        if (Math.abs(kante - sd.fix) > 0.8) continue;
        const a = Math.max(sd.a, s.von), e = Math.min(sd.e, s.bis);
        if (e - a < 2) continue;
        const g = s.gehweg, au = sd.s[0] === '-' ? -1 : 1;   // nach außen
        const q0 = sd.fix + au * g, q1 = sd.fix;
        if (sd.entlang === 'z') { platte(S, Math.min(q0, q1), a, Math.max(q0, q1), e, 0.6, 0.3, 0.9, F.bord); platte(S, Math.min(q0, q1) + (au > 0 ? 0 : 0.3), a + 0.3, Math.max(q0, q1) - (au > 0 ? 0.3 : 0), e - 0.3, 0.4, YG, 0.05, F.gehweg); }
        else { platte(S, a, Math.min(q0, q1), e, Math.max(q0, q1), 0.6, 0.3, 0.9, F.bord); platte(S, a + 0.3, Math.min(q0, q1) + (au > 0 ? 0 : 0.3), e - 0.3, Math.max(q0, q1) - (au > 0 ? 0.3 : 0), 0.4, YG, 0.05, F.gehweg); }
        const mq = (q0 + q1) / 2;
        for (let u = a + 7; u < e - 5; u += 14) { const [x, z] = sd.entlang === 'z' ? [mq, u] : [u, mq]; baumSetzen(I, waehle(r, plan.baumarten ?? ['platane']), x, YG, z, r, 0.75, true); }
        for (let i = 0, n = Math.round((e - a) / 12 * ctx.dichte); i < n; i++) { const u = zw(r, a + 0.5, e - 0.5), q = sd.fix + au * zw(r, 0.4, g - 0.4); const [x, z] = sd.entlang === 'z' ? [q, u] : [u, q]; figur(I, x, YG, z, r, sd.entlang === 'z' ? (r() < 0.5 ? -1 : 1) * Math.PI / 2 : (r() < 0.5 ? 0 : Math.PI)); }
      }
    }
    // Schiffe
    const lang = Math.max(b.w, b.d), kurz = Math.min(b.w, b.d), entlangZ = b.d >= b.w;
    const n = b.keineSchiffe ? 0 : b.kueste ? Math.round(lang / 260) + 2 : b.form === 'fluss' ? Math.round(lang / 220) + 1 : b.form === 'see' ? (r() < 0.4 ? 1 : 0) : (r() < 0.5 ? 1 : 0);
    if (b.kueste) kuestenWasser(ctx, b, r);
    const bruecken = alleStrassen.filter((s) => s.bruecke && (entlangZ ? s.achse === 'x' : s.achse === 'z') && (entlangZ ? s.von >= X0 - 1 && s.bis <= X1 + 1 && s.mitte > Z0 && s.mitte < Z1 : s.von >= Z0 - 1 && s.bis <= Z1 + 1 && s.mitte > X0 && s.mitte < X1));
    for (let i = 0; i < n && kurz > 14 && lang > 60; i++) {
      const u = zw(r, (entlangZ ? Z0 : X0) + 20, (entlangZ ? Z1 : X1) - 20);
      if (bruecken.some((s) => Math.abs(s.mitte - u) < s.breite / 2 + 12)) continue;
      const v = kurz > 30 ? zw(r, 6, kurz - 6) : kurz / 2;
      const [x, z] = entlangZ ? [X0 + v, u] : [u, Z0 + v];
      I.setze('schiff', x, WASSER_Y + 0.5, z, (entlangZ ? Math.PI / 2 : 0) + (r() < 0.5 ? 0 : Math.PI), kurz < 32 ? 0.7 : 1, [waehle(r, ['#2f6f8f', '#c9483e', '#3f7d56'])]);
    }
  }
}

function bauePark(ctx, b, r, hinder = []) {
  const { S, I } = ctx;
  const y = 0.36;
  const x0 = b.x, z0 = b.z, x1 = b.x + b.w, z1 = b.z + b.d, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  S.quader(x0, 0, z0, x1, y, z1, F.rasen);
  // Ringweg
  const ri = 5;
  const ring = new THREE.Shape();
  const rr = (s, a0, b0, a1, b1, rad, loch) => {
    const p = loch ? new THREE.Path() : s;
    p.moveTo(a0 + rad, b0); p.lineTo(a1 - rad, b0); p.quadraticCurveTo(a1, b0, a1, b0 + rad); p.lineTo(a1, b1 - rad); p.quadraticCurveTo(a1, b1, a1 - rad, b1);
    p.lineTo(a0 + rad, b1); p.quadraticCurveTo(a0, b1, a0, b1 - rad); p.lineTo(a0, b0 + rad); p.quadraticCurveTo(a0, b0, a0 + rad, b0);
    if (loch) s.holes.push(p);
  };
  rr(ring, x0 + ri, z0 + ri, x1 - ri, z1 - ri, 8, false);
  rr(ring, x0 + ri + 3, z0 + ri + 3, x1 - ri - 3, z1 - ri - 3, 6, true);
  const rg = new THREE.ExtrudeGeometry(ring, { depth: 0.05, bevelEnabled: false, curveSegments: 6 });
  rg.rotateX(Math.PI / 2); rg.translate(0, y + 0.05, 0); S.add(rg, F.weg);
  // Diagonalwege und Mittelrondell
  const diagonalen = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]];
  for (const [ex, ez] of diagonalen) {
    const len = Math.hypot(cx - ex, cz - ez) - 3;
    S.box(len, 0.05, 3, (ex + cx) / 2, y + 0.025, (ez + cz) / 2, F.weg, Math.atan2(-(cz - ez), cx - ex));
  }
  ellipse(S, cx, cz, 7, 7, y, y + 0.06, F.weg);
  if (!hinder.some((p) => imRechteck(cx, cz, p, 4))) { ellipse(S, cx, cz, 3.5, 3.5, y, y + 0.5, '#c9b98f'); baumSetzen(I, 'busch', cx, y + 0.5, cz, r, 1.2); }
  // Teich in einem Viertel
  const sg = b.teich?.seite ?? 1;
  const tx = cx + sg * b.w * 0.22, tz = cz + b.d * 0.2;
  const trx = Math.min(b.w * 0.16, 14), trz = Math.min(b.d * 0.12, 10);
  ellipse(S, tx, tz, trx, trz, y - 0.6, y - 0.25, F.wasser);
  ellipsenRing(S, tx, tz, trx, trz, 0.9, y - 0.3, y + 0.2, F.stein);
  // Spielplatz im gegenüberliegenden Viertel
  const sx = cx - sg * b.w * 0.22, sz = cz - b.d * 0.22;
  S.quader(sx - 5, y, sz - 4, sx + 5, y + 0.1, sz + 4, '#ead8a6');
  S.box(0.8, 2.2, 0.8, sx - 2.5, y + 1.1, sz - 1.5, '#d04a3f'); S.box(0.7, 0.12, 3.6, sx - 2.5, y + 1.2, sz + 0.2, '#e0b23c', 0);
  S.box(3.2, 0.15, 0.15, sx + 2.4, y + 2.3, sz + 1, '#2f63b5'); S.box(0.15, 2.3, 0.15, sx + 0.9, y + 1.15, sz + 1, '#2f63b5'); S.box(0.15, 2.3, 0.15, sx + 3.9, y + 1.15, sz + 1, '#2f63b5');
  // Bäume, frei von Wegen, Teich und Spielplatz
  const aufWeg = (x, z) => {
    const ix = x - x0, iz = z - z0;
    const ringD = Math.min(Math.abs(ix - ri - 1.5), Math.abs(b.w - ix - ri - 1.5), Math.abs(iz - ri - 1.5), Math.abs(b.d - iz - ri - 1.5));
    if (ringD < 3 && ix > ri - 1 && ix < b.w - ri + 1 && iz > ri - 1 && iz < b.d - ri + 1) return true;
    for (const [ex, ez] of diagonalen) {
      const dx = cx - ex, dz = cz - ez, l2 = dx * dx + dz * dz;
      const t = klemm(((x - ex) * dx + (z - ez) * dz) / l2, 0, 1);
      if (Math.hypot(x - ex - t * dx, z - ez - t * dz) < 3.2) return true;
    }
    if (Math.hypot(x - cx, z - cz) < 9) return true;
    if (((x - tx) / (trx + 3)) ** 2 + ((z - tz) / (trz + 3)) ** 2 < 1) return true;
    if (Math.abs(x - sx) < 7 && Math.abs(z - sz) < 6) return true;
    if (hinder.some((p) => imRechteck(x, z, p, 3))) return true;
    return false;
  };
  const n = Math.round((b.w * b.d) / 110);
  const arten = ctx.plan.baumarten ?? ['linde', 'kastanie'];
  for (let i = 0; i < n * (b.spielplatz ? 1.5 : 3) && i < 600; i++) {
    const x = zw(r, x0 + 1.5, x1 - 1.5), z = zw(r, z0 + 1.5, z1 - 1.5);
    if (aufWeg(x, z)) continue;
    const rand = Math.min(x - x0, x1 - x, z - z0, z1 - z) < 4;
    baumSetzen(I, rand ? waehle(r, [...arten, 'pappel']) : waehle(r, [...arten, 'nadel', 'nadel']), x, y, z, r, zw(r, 0.75, 1.1));
    if (i % 3 === 0 && r() < 0.5) I.setze('busch', x + 2, y, z + 1, 0, zw(r, 0.6, 1), [waehle(r, KRONE.busch)]);
  }
  // Bänke am Ring, Laternen, Leute
  for (let x = x0 + ri + 10; x < x1 - ri - 8; x += 16) I.setze('bank', x, y, z1 - ri + 0.9, Math.PI);
  for (let z = z0 + ri + 10; z < z1 - ri - 8; z += 16) I.setze('bank', x1 - ri + 0.9, y, z, Math.PI / 2);
  for (const [x, z] of [[x0 + ri + 1.5, z0 + ri + 1.5], [x1 - ri - 1.5, z0 + ri + 1.5], [x0 + ri + 1.5, z1 - ri - 1.5], [x1 - ri - 1.5, z1 - ri - 1.5]]) I.setze('altlaterne', x, y, z, 0);
  for (let i = 0, nf = Math.round((b.w + b.d) / 6 * ctx.dichte); i < nf; i++) {
    const t = r();
    let x, z;
    if (t < 0.5) { const [ex, ez] = waehle(r, diagonalen); const u = zw(r, 0.15, 0.85); x = ex + (cx - ex) * u; z = ez + (cz - ez) * u; }
    else if (t < 0.75) { x = zw(r, x0 + ri + 1, x1 - ri - 1); z = r() < 0.5 ? z0 + ri + 1.5 : z1 - ri - 1.5; }
    else { z = zw(r, z0 + ri + 1, z1 - ri - 1); x = r() < 0.5 ? x0 + ri + 1.5 : x1 - ri - 1.5; }
    figur(I, x, y + 0.05, z, r);
  }
}

/** Gleise entlang z: dieselbe Anlage wie entlang x, gebaut in einem an der Diagonale x = z gespiegelten Rahmen. */
function baueBahnZ(ctx, b, r) {
  const { S, I } = ctx;
  const SW = { quader: (x0, y0, z0, x1, y1, z1, f) => S.quader(z0, y0, x0, z1, y1, x1, f), box: (w, h, d, x, y, z, f, ry = 0) => S.box(d, h, w, z, y, x, f, ry), add: (g, f) => S.add(g, f) };
  const IW = { setze: (name, x, y, z, ry = 0, s = 1, farben = null) => I.setze(name, z, y, x, Math.PI / 2 - ry, s, farben) };
  const bh = ctx.plan.parzellen.find((p) => p.block === b.id && p.typ === 'slot:bahnhof');
  const gl = b.gleise;
  const vp = b.vorplatz;
  const b2 = { ...b, x: b.z, z: b.x, w: b.d, d: b.w, achse: 'x', gleise: gl && { z0: gl.x0, z1: gl.x1, achse: 'x' }, _bh: bh ? { x: bh.z, z: bh.x, w: bh.d, d: bh.w } : null, vorplatz: vp ? { x: vp.z, z: vp.x, w: vp.d, d: vp.w } : null, bahnParken: (b.bahnParken ?? []).map((q) => ({ x: q.z, z: q.x, w: q.d, d: q.w })) };
  baueBahn({ ...ctx, S: SW, I: IW }, b2, r);
}
function baueBahn(ctx, b, r) {
  if (b.achse === 'z') { baueBahnZ(ctx, b, r); return; }
  const { S, I } = ctx;
  const y = 0.36;   // über der Gehwegplatte, sonst verdeckt das Beige das Gleisbett
  S.quader(b.x, 0, b.z, b.x + b.w, y, b.z + b.d, '#a29d93');   // Gleisvorfeld grau statt hellem Kies (liest sich sonst als leerer Platz)
  if (b.oben) S.quader(b.x, 0, b.z, b.x + b.w, 1.6, b.z + 0.5, '#bdb5a8');
  else S.quader(b.x, 0, b.z + b.d - 0.5, b.x + b.w, 1.6, b.z + b.d, '#bdb5a8');
  const bh = b._bh !== undefined ? b._bh : ctx.plan.parzellen.find((p) => p.block === b.id && p.typ === 'slot:bahnhof');
  const gl = b.gleise ?? { z0: b.z + 4, z1: b.z + b.d - 3 };
  // Bahnhofsvorplatz zur Stadt (GESTALTUNG.md 3): Pflaster, Baumreihe, Taxistand, zwei Bussteige
  const V = b.vorplatz;
  if (V && V.d > 3) {
    S.quader(V.x, 0, V.z, V.x + V.w, y + 0.02, V.z + V.d, '#ddd5c4');
    const vorn = b.oben ? V.z + V.d - 3 : V.z + 3;
    const tz0 = bh ? (b.oben ? bh.z + bh.d : V.z) : V.z, tz1 = bh ? (b.oben ? V.z + V.d : bh.z) : V.z + V.d;   // Platz vor dem Gebäude
    void tz0; void tz1;
    for (let x = V.x + 6; x < V.x + V.w - 4; x += 11) { if (bh && x > bh.x - 2 && x < bh.x + bh.w + 2 && V.d < 14) continue; baumSetzen(I, 'linde', x, y + 0.02, vorn, r, 0.85, true); }
    if (V.d >= 9 && bh) {
      const tz = b.oben ? Math.min(V.z + V.d - 4, bh.z + bh.d + 5) : Math.max(V.z + 4, bh.z - 5);
      for (let k = 0; k < 4; k++) auto(I, bh.x + bh.w + 6 + k * 5.2, y + 0.02, tz, 0, r, 'taxi');
      for (const dx of [-14, -30]) { const bx = bh.x + dx; if (bx > V.x + 6) { S.quader(bx - 6, y + 0.02, tz - 1.4, bx + 6, y + 0.18, tz + 1.4, '#cfc8bb'); I.setze('haltestelle', bx, y + 0.18, tz, b.oben ? Math.PI : 0); } }
    }
    for (let i = 0; i < (V.w * V.d) / 70 * ctx.dichte; i++) figur(I, zw(r, V.x + 1, V.x + V.w - 1), y + 0.02, zw(r, V.z + 1, V.z + V.d - 1), r);
  }
  // P+R-Parkplätze seitlich des Vorplatzes (stadtplan.js vorplatzKuerzen)
  for (const P of b.bahnParken ?? []) { S.quader(P.x, 0, P.z, P.x + P.w, y + 0.02, P.z + P.d, '#9a9fa4'); if (P.w > 8 && P.d > 8) baueParkplatz(ctx, { x: P.x + 1, z: P.z + 1, w: P.w - 2, d: P.d - 2 }, y + 0.02, r); }
  // Muster: Gleis, Bahnsteig, Gleis, Gleis, Bahnsteig, Gleis …
  // Gleisband ohne Empfangsgebäude (b.ohneBahnhof): nur Gleise, kein Bahnsteig über die ganze Kartenbreite
  const muster = b.ohneBahnhof ? ['g'] : ['g', 's', 'g', 'g', 's', 'g', 'g', 'g'];
  let z = gl.z0, i = 0;
  const gleisZ = [];
  while (z < gl.z1 - 4) {
    const m = muster[i % muster.length];
    if (m === 'g') { gleisZ.push(z + 2.25); z += 4.5; }
    else {
      if (z + 6 > gl.z1 - 4) break;
      if (bh && b.oben && z + 6 > bh.z - 3) { z += 6; i++; continue; }   // Bahnsteige nur hinter dem Empfangsgebäude
      const bx0 = bh ? bh.x - 10 : b.x + 10, bx1 = bh ? bh.x + bh.w + 10 : b.x + b.w - 10;
      S.quader(bx0, 0, z + 0.2, bx1, 1.0, z + 5.8, '#cfc8bb');
      S.quader(bx0, 1.0, z + 0.2, bx1, 1.04, z + 0.6, '#f2f1ec');
      S.quader(bx0, 1.0, z + 5.4, bx1, 1.04, z + 5.8, '#f2f1ec');
      S.quader(bx0 + 6, 4.0, z + 1.0, bx1 - 6, 4.25, z + 5.0, '#e9e5dc');
      for (let x = bx0 + 8; x < bx1 - 6; x += 12) S.box(0.3, 3.0, 0.3, x, 2.5, z + 3, F.metall);
      for (let k = 0; k < (bx1 - bx0) / 8 * ctx.dichte; k++) figur(I, zw(r, bx0 + 1, bx1 - 1), 1.0, zw(r, z + 1, z + 5), r);
      z += 6;
    }
    i++;
  }
  const xa = b.x + 1.5, xb = b.x + b.w - 1.5;
  // Gleisabschnitte: neben einem Empfangsgebäude, das in den Gleisbereich ragt (Kopfbahnhof oben), unterbrochen
  const abschnitte = (gz) => (bh && b.oben && gz > bh.z - 3 && gz < bh.z + bh.d + 3 ? [[xa, bh.x - 3], [bh.x + bh.w + 3, xb]].filter(([a, e]) => e - a > 8) : [[xa, xb]]);
  for (const gz of gleisZ) for (const [ga, gb] of abschnitte(gz)) {
    S.quader(ga, y, gz - 1.6, gb, y + 0.15, gz + 1.6, F.schotter);
    for (let x = ga + 0.5; x < gb; x += 1.1) I.setze('schwelle', x, y + 0.15, gz, 0);
    for (const sp of [-0.72, 0.72]) S.quader(ga, y + 0.2, gz + sp - 0.06, gb, y + 0.36, gz + sp + 0.06, F.schiene);
    S.quader(ga, 6.3, gz - 0.04, gb, 6.38, gz + 0.04, F.dunkel);
  }
  if (gleisZ.length) for (let x = xa + 10; x < xb - 5; x += 45) I.setze('olmastSeite', x, y, gleisZ[0] - 2.4, 0, [1, 1, Math.max(1, (gleisZ[gleisZ.length - 1] - gleisZ[0] + 4) / 6)]);
  // Züge
  const zuege = Math.min(gleisZ.length, 2 + (r() < 0.5 ? 1 : 0));
  const frei = [...gleisZ].sort(() => r() - 0.5).slice(0, zuege);
  for (const gz of frei) {
    const wagen = Math.floor(zw(r, 3, 6.9));
    const [ga, gb] = abschnitte(gz).sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0] ?? [xa, xb];
    if (gb - ga < 40) continue;
    let x = zw(r, ga + 6, Math.max(ga + 7, gb - wagen * 26.5 - 2));
    const xEnde = gb;
    const farbe = waehle(r, ['#f1f1ee', '#e9eef0', '#d8dde1']);
    for (let w = 0; w < wagen && x < xEnde - 13; w++, x += 26.5) I.setze('zugwagen', x + 13, y + 0.36, gz, 0, 1, [farbe]);
  }
}

// ====================================================================================
// 4. KARTENMARKER
// ====================================================================================
export const MARKER = {
  hartwig: { farbe: '#d23c32', zeichen: 'H' },
  hartwigSport: { farbe: '#1d8a6b', zeichen: 'S' },
  premium: { farbe: '#b8955a', zeichen: '♛' },
  wettbewerber: { farbe: '#7b858e', zeichen: 'W' },
  modehaus: { farbe: '#6b4f8f', zeichen: 'M' },
  outlet: { farbe: '#d39a2b', zeichen: 'O' },
  bank: { farbe: '#3f7d56', zeichen: '€' },
  immobilie: { farbe: '#56636e', zeichen: 'I' },
};

/** Marker über einem Punkt oder einer Parzelle. ort: { x, z, hoehe } oder Parzelle (dann hoehe aus o.hoehe). */
export function kartenMarker(scene, ort, art = 'hartwig', o = {}) {
  const m = MARKER[art] ?? { farbe: o.farbe ?? '#56636e', zeichen: o.zeichen ?? '?' };
  const x = ort.w ? ort.x + ort.w / 2 : ort.x, z = ort.d ? ort.z + ort.d / 2 : ort.z;
  const h = o.hoehe ?? ort.hoehe ?? 20;
  marker(scene, x, h + (o.abstand ?? 4), z, o.farbe ?? m.farbe, o.zeichen ?? m.zeichen, o.groesse ?? 10);
}

let _vermietTextur = null;
/** „Zu vermieten“-Schild am Stiel, wie das For-Lease-Schild in Coffee Inc. */
export function zuVermieten(scene, x, y, z, groesse = 8) {
  if (!_vermietTextur) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 320;
    const k = c.getContext('2d');
    k.fillStyle = 'rgba(0,0,0,0.25)'; k.beginPath(); k.ellipse(128, 306, 34, 9, 0, 0, Math.PI * 2); k.fill();
    k.fillStyle = '#39424a';
    k.beginPath(); k.moveTo(128, 300); k.lineTo(96, 226); k.lineTo(160, 226); k.closePath(); k.fill();
    rundRechteck(k, 18, 18, 220, 214, 36); k.fill();
    k.fillStyle = '#d23c32'; rundRechteck(k, 40, 40, 176, 170, 18); k.fill();
    k.strokeStyle = '#ffffff'; k.lineWidth = 6; rundRechteck(k, 52, 52, 152, 146, 12); k.stroke();
    const t1 = textTextur('ZU', '#ffffff', 80).t.image, t2 = textTextur('VERMIETEN', '#ffffff', 80).t.image;
    k.drawImage(t1, 128 - 52, 66, 104, 104 * t1.height / t1.width);
    const b2 = 130;
    k.drawImage(t2, 128 - b2 / 2, 140, b2, b2 * t2.height / t2.width);
    _vermietTextur = new THREE.CanvasTexture(c);
    _vermietTextur.colorSpace = THREE.SRGBColorSpace;
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: _vermietTextur, depthTest: false }));
  sp.center.set(0.5, 0); sp.scale.set(groesse * 0.8, groesse, 1); sp.position.set(x, y, z); sp.renderOrder = 20;
  scene.add(sp);
  return sp;
}
function rundRechteck(k, x, y, w, h, r) {
  k.beginPath(); k.moveTo(x + r, y); k.arcTo(x + w, y, x + w, y + h, r); k.arcTo(x + w, y + h, x, y + h, r); k.arcTo(x, y + h, x, y, r); k.arcTo(x, y, x + w, y, r); k.closePath();
}

/** Marker-Liste für alle Standorte eines Plans: Hartwig rot (H), Hartwig Sport grün (S), Wettbewerber grau (W). */
export function standortMarker(plan, groesse) {
  const art = { premium: 'premium', warenhaus: 'hartwig', sport: 'hartwigSport', wettbewerber: 'wettbewerber', outlet: 'wettbewerber' };
  return (plan.standorte ?? []).map((st) => ({ parzelle: st.parzelle, art: art[st.rolle] ?? 'hartwig', groesse: st.rolle === 'wettbewerber' ? (groesse ?? 10) * 0.8 : groesse }));
}

/**
 * Setzt Marker für eine Liste [{ parzelle: id, art } | { x, z, hoehe, art }].
 * liste = 'standorte' markiert alle plan.standorte (siehe standortMarker), o.groesse gilt dann für alle.
 * o.leerstand = true setzt zusätzlich „Zu vermieten“ über alle Parzellen mit leer: true.
 */
export function setzeMarker(scene, plan, ergebnis, liste = [], o = {}) {
  const pz = new Map(plan.parzellen.map((p) => [p.id, p]));
  for (const p of plan.aussen?.bauten ?? []) if (p.typ === 'slot:outlet') pz.set(p.id, p);
  if (liste === 'standorte') liste = standortMarker(plan, o.markerGroesse);
  for (const e of liste) {
    if (e.parzelle) { const p = pz.get(e.parzelle); if (p) kartenMarker(scene, p, e.art, { hoehe: ergebnis?.hoehen?.get(p.id) ?? 20, groesse: e.groesse }); }
    else kartenMarker(scene, e, e.art, { groesse: e.groesse });
  }
  if (o.leerstand) for (const p of plan.parzellen) if (p.leer) zuVermieten(scene, p.x + p.w / 2, (ergebnis?.hoehen?.get(p.id) ?? 15) + 3, p.z + p.d / 2, o.groesse ?? 8);
}

// ====================================================================================
// 5. PLATZHALTER-BAUER (schlicht, nur zum Testen des Gerüsts)
// ====================================================================================
function laden(S, p, seite, eg, r, farbe) {
  const { x, z, w, d } = p;
  if (seite === '+z') {
    S.box(w - 1.0, eg - 1.3, 0.16, x + w / 2, (eg - 1.3) / 2 + 0.5, z + d + 0.04, farbe);
    S.box(w - 0.6, 0.35, 0.3, x + w / 2, eg - 0.6, z + d + 0.1, heller(farbe, 0.4));
    if (r() < 0.5) markise(S, x, z, w, d, '+z', eg - 1.1, x + 0.6, w - 1.2, waehle(r, FARBEN.markise));
  } else {
    S.box(0.16, eg - 1.3, d - 1.0, x + w + 0.04, (eg - 1.3) / 2 + 0.5, z + d / 2, farbe);
    S.box(0.3, 0.35, d - 0.6, x + w + 0.1, eg - 0.6, z + d / 2, heller(farbe, 0.4));
    if (r() < 0.5) markise(S, x, z, w, d, '+x', eg - 1.1, z + 0.6, d - 1.2, waehle(r, FARBEN.markise));
  }
}

function platzhalterHaus(S, scene, p, eck = false) {
  const r = rng(p.seed);
  const st = p.stil ?? 'gruenderzeit';
  const fw = st === 'fachwerk';
  const g = p.geschosse, gh = fw ? 2.9 : 3.35, eg = fw ? 3.4 : 4.2;
  const H = eg + g * gh;
  const { x, z, w, d } = p;
  const f = st === 'nachkrieg' ? waehle(r, [...FARBEN.fassadeKuehl, ...FARBEN.fassadeWarm, ...FARBEN.putzBunt]) : st === 'modern' ? waehle(r, ['#d9dde0', '#c9cfd4', '#e6e3dc', '#bfc7cc'])
    : fw ? waehle(r, ['#f1ebdf', '#efe3cf', '#f3eee4']) : waehle(r, [...FARBEN.fassadeHell, ...FARBEN.fassadeHell, ...FARBEN.backstein.slice(0, 2), ...FARBEN.fassadeWarm]);
  const hell = heller(f, 0.06);
  S.quader(x, 0, z, x + w, H, z + d, f);
  const sicht = ['+z', '+x'];
  for (const s of sicht) if (p.front.includes(s)) laden(S, p, s, eg, r, st === 'modern' ? F.glas : FARBEN.laden);
  gesims(S, x, z, w, d, eg, 0.3, 0.12, hell);
  if (st === 'modern') {
    for (let k = 0; k < g; k++) {
      const y = eg + k * gh + gh * 0.55;
      S.box(w - 0.8, gh * 0.55, 0.12, x + w / 2, y, z + d + 0.03, FARBEN.glas);
      S.box(0.12, gh * 0.55, d - 0.8, x + w + 0.03, y, z + d / 2, FARBEN.glas);
    }
  } else {
    const o = fw ? { raster: 2.3, fw: 1.0, fh: 1.4 } : st === 'nachkrieg' ? { raster: 2.6, fw: 1.5, fh: 1.4 } : { raster: 3.1, sims: hell, rahmen: g > 3 ? hell : null };
    fensterRaster(S, x, z, w, d, '+z', { y0: eg, geschosse: g, gh, ...o });
    fensterRaster(S, x, z, w, d, '+x', { y0: eg, geschosse: g, gh, ...o });
  }
  if (fw) {
    const braun = '#6b4630';
    for (const s of sicht) {
      const len = s === '+z' ? w : d, start = s === '+z' ? x : z;
      const n = Math.max(1, Math.floor(len / 2.3)), rnd = (len - n * 2.3) / 2;
      for (let i = 0; i <= n; i++) {
        const u = start + rnd + 2.3 * i;
        if (s === '+z') S.box(0.22, H - eg, 0.1, u, eg + (H - eg) / 2, z + d + 0.07, braun); else S.box(0.1, H - eg, 0.22, x + w + 0.07, eg + (H - eg) / 2, u, braun);
      }
      for (let k = 0; k <= g; k++) {
        const y = eg + k * gh;
        if (s === '+z') S.box(w, 0.24, 0.12, x + w / 2, y, z + d + 0.08, braun); else S.box(0.12, 0.24, d, x + w + 0.08, y, z + d / 2, braun);
      }
    }
  }
  let dh = 0;
  const achse0 = p.seite === '+x' || p.seite === '-x' ? 'z' : p.seite === 'ecke' ? (w >= d ? 'x' : 'z') : 'x';
  if (fw) {
    const giebel = w < 10 && r() < 0.6;
    const achse = giebel ? (achse0 === 'x' ? 'z' : 'x') : achse0;
    const len = achse === 'x' ? w : d, tief = achse === 'x' ? d : w;
    dh = tief * 0.62;
    const dg = dachProfil(len + 0.3, tief + 0.6, dh, 0.15, achse); dg.translate(x + w / 2, H, z + d / 2); S.add(dg, waehle(r, FARBEN.ziegel));
  } else if (st === 'gruenderzeit') {
    gesims(S, x, z, w, d, H, 0.45, 0.32, hell);
    if (r() < 0.6) {
      const len = achse0 === 'x' ? w : d, tief = achse0 === 'x' ? d : w;
      dh = 2.8;
      const dg = dachProfil(len - 0.2, tief - 0.2, dh, tief * 0.45, achse0); dg.translate(x + w / 2, H + 0.2, z + d / 2); S.add(dg, waehle(r, FARBEN.dach));
      if (len > 8) for (let u = 2.5; u < len - 2; u += 3.4) {
        if (achse0 === 'x') S.box(1.1, 1.3, 1.2, x + u, H + 1.3, z + d - 1.4, hell); else S.box(1.2, 1.3, 1.1, x + w - 1.4, H + 1.3, z + u, hell);
      }
    } else { S.box(w - 0.6, 0.4, d - 0.6, x + w / 2, H + 0.3, z + d / 2, '#b9b4ab'); dh = 0.5; }
    if (r() < 0.6) S.box(0.7, 1.6, 0.7, x + zw(r, 1, w - 1), H + 1.4, z + zw(r, 1, d - 1), FARBEN.backstein[1]);
  } else {
    gesims(S, x, z, w, d, H, 0.35, 0.18, hell);
    S.box(w - 0.5, 0.3, d - 0.5, x + w / 2, H + 0.25, z + d / 2, '#a9a49b');
    if (r() < 0.4 && w > 8 && d > 8) { S.box(w * 0.5, 2.6, d * 0.5, x + w * 0.45, H + 1.5, z + d * 0.45, f); dh = 2.8; }
    if (r() < 0.6) S.box(1.8, 1.2, 1.8, x + zw(r, 2, w - 2), H + 0.9, z + zw(r, 2, d - 2), '#bdb8ae');
  }
  if (eck && p.front.includes('+z') && p.front.includes('+x') && st === 'gruenderzeit') {
    S.quader(x + w - 3.2, eg + 0.6, z + d - 3.2, x + w + 0.7, H, z + d + 0.7, hell);
    fensterRaster(S, x + w - 3.2, z + d - 3.2, 3.9, 3.9, '+z', { y0: eg, geschosse: g, gh, raster: 3.0 });
    fensterRaster(S, x + w - 3.2, z + d - 3.2, 3.9, 3.9, '+x', { y0: eg, geschosse: g, gh, raster: 3.0 });
    S.add(new THREE.SphereGeometry(2.1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(x + w - 1.25, H + 0.1, z + d - 1.25), waehle(r, FARBEN.kupfer));
    dh = Math.max(dh, 2.2);
  }
  return { hoehe: H + dh };
}

function phWarenhaus(S, scene, p) {
  const { x, z, w, d } = p;
  const eg = 5.5, gh = 4.5, g = 4, H = eg + g * gh;
  S.quader(x + 0.4, 0, z + 0.4, x + w - 0.4, eg, z + d - 0.4, '#3e505c');
  S.quader(x, eg, z, x + w, H, z + d, '#efe7d6');
  for (let u = x; u <= x + w + 0.1; u += 6) S.box(0.8, eg, 0.8, Math.min(u, x + w - 0.4), eg / 2, z + d - 0.4, '#e3dccd');
  for (let u = z; u <= z + d + 0.1; u += 6) S.box(0.8, eg, 0.8, x + w - 0.4, eg / 2, Math.min(u, z + d - 0.4), '#e3dccd');
  S.box(w + 3, 0.6, 3, x + w / 2 + 1.5, eg - 0.3, z + d + 1.4, '#f4f1ea');
  S.box(3, 0.6, d + 3, x + w + 1.4, eg - 0.3, z + d / 2 + 1.5, '#f4f1ea');
  for (let k = 0; k < g; k++) {
    const y = eg + k * gh + gh * 0.5;
    S.box(w - 4, 1.6, 0.14, x + w / 2, y, z + d + 0.04, FARBEN.glas);
    S.box(0.14, 1.6, d - 4, x + w + 0.04, y, z + d / 2, FARBEN.glas);
  }
  S.box(w + 0.6, 1.4, d + 0.6, x + w / 2, H + 0.3, z + d / 2, FARBEN.marke);
  S.box(w - 8, 3, d - 8, x + w / 2 - 4, H + 2.4, z + d / 2 - 4, '#b2ab9e');
  schild(scene, 'HARTWIG', '+z', x + w / 2, H - 4, z + d, 4.5, FARBEN.marke);
  schild(scene, 'HARTWIG', '+x', z + d / 2, H - 4, x + w, 4.0, FARBEN.marke);
  return { hoehe: H + 4 };
}
function phMall(S, scene, p) {
  const { x, z, w, d } = p;
  const H = 16;
  S.quader(x + 2, 0, z + 2, x + w - 2, H, z + d - 2, '#e2e5e7');
  S.quader(x + 2, 0.3, z + d - 2.2, x + w - 2, 5, z + d - 1.8, FARBEN.glas);
  S.quader(x + w - 2.2, 0.3, z + 2, x + w - 1.8, 5, z + d - 2, FARBEN.glas);
  S.quader(x + w * 0.35, H, z + d * 0.3, x + w * 0.65, H + 4, z + d * 0.7, F.glasHell);
  S.quader(x + 3, H, z + 3, x + w - 3, H + 0.2, z + d - 3, '#a9adb1');
  for (let u = x + 6; u < x + w - 6; u += 2.6) S.box(0.12, 0.05, 4.5, u, H + 0.25, z + 6, '#f2f1ec');
  S.box(w - 4, 1.2, 0.3, x + w / 2, 6, z + d - 1.8, '#2f6f8f');
  return { hoehe: H + 4 };
}
function phBahnhof(S, scene, p) {
  const { x, z, w, d } = p;
  S.quader(x, 0, z, x + w, 9, z + d, '#e6d5bf');
  fensterRaster(S, x, z, w, d, '+z', { y0: 1, geschosse: 2, gh: 4, raster: 4, fh: 2.6, farbe: FARBEN.glas });
  const g = new THREE.CylinderGeometry(d * 0.5, d * 0.5, w * 0.7, 16, 1, false, 0, Math.PI);
  g.rotateZ(Math.PI / 2); g.scale(1, 0.55, 1); g.translate(x + w / 2, 9, z + d / 2);
  S.add(g, F.glasHell);
  S.quader(x + w * 0.85 - 4, 0, z + d * 0.5 - 4, x + w * 0.85 + 4, 28, z + d * 0.5 + 4, '#dcc9ae');
  S.add(walmPyramide(5.5, 5).translate(x + w * 0.85, 28, z + d * 0.5), FARBEN.kupfer[0]);
  S.add(new THREE.CylinderGeometry(1.6, 1.6, 0.2, 16).rotateX(Math.PI / 2).translate(x + w * 0.85, 23, z + d * 0.5 + 4.05), '#f4f1ea');
  return { hoehe: 34 };
}
function walmPyramide(r, h) { const g = new THREE.ConeGeometry(r, h, 4); g.rotateY(Math.PI / 4); g.translate(0, h / 2, 0); return g; }
function phKirche(S, scene, p) {
  const { x, z, w, d } = p;
  const H = 15, tb = Math.min(9, d * 0.45);
  const stein = '#c9a98e';
  S.quader(x + tb, 0, z, x + w - d * 0.4, H, z + d, stein);
  const dg = dachProfil(w - tb - d * 0.4, d + 0.6, d * 0.62, 0.2, 'x'); dg.translate(x + tb + (w - tb - d * 0.4) / 2, H, z + d / 2); S.add(dg, '#7c6a5c');
  const ap = new THREE.CylinderGeometry(d * 0.4, d * 0.4, H * 0.85, 12, 1, false, 0, Math.PI); ap.translate(x + w - d * 0.4, H * 0.425, z + d / 2); S.add(ap, stein);
  for (let u = x + tb + 3; u < x + w - d * 0.5; u += 4.5) S.box(1.4, 6, 0.14, u, 7, z + d + 0.03, '#5e7383');
  S.quader(x, 0, z + d / 2 - tb / 2, x + tb, 36, z + d / 2 + tb / 2, stein);
  for (let k = 0; k < 3; k++) S.box(1.2, 3.2, 0.14, x + tb / 2, 20 + k * 6, z + d / 2 + tb / 2 + 0.03, '#5e7383');
  S.add(walmPyramide(tb * 0.72, 18).translate(x + tb / 2, 36, z + d / 2), FARBEN.kupfer[0]);
  S.box(0.3, 2.6, 0.3, x + tb / 2, 55, z + d / 2, '#c9a24a');
  return { hoehe: 56 };
}
function phSonder(S, scene, p) {
  const { x, z, w, d } = p;
  const r = rng(p.seed);
  if (p.sonder === 'hochhaus') {
    const g = p.geschosse ?? 16, gh = 3.6, H = 5 + g * gh;
    const f = waehle(r, ['#cfd6dc', '#bfc8cf', '#dde1e4', '#e4dccd']);
    S.quader(x + 0.5, 0, z + 0.5, x + w - 0.5, H, z + d - 0.5, f);
    for (let k = 0; k < g; k++) {
      const y = 5 + k * gh + gh * 0.5;
      S.box(w - 1.6, gh * 0.55, 0.12, x + w / 2, y, z + d - 0.47, FARBEN.glas);
      S.box(0.12, gh * 0.55, d - 1.6, x + w - 0.47, y, z + d / 2, FARBEN.glas);
    }
    S.quader(x + 0.3, 0, z + d - 0.7, x + w - 0.3, 4.5, z + d - 0.3, FARBEN.glas);
    S.quader(x + w * 0.25, H, z + d * 0.25, x + w * 0.75, H + 3, z + d * 0.75, '#a9a49b');
    return { hoehe: H + 3 };
  }
  // Rathaus
  const H = 17;
  S.quader(x, 0, z, x + w, H, z + d, '#e3d3bd');
  gesims(S, x, z, w, d, H, 0.5, 0.35, '#efe4d2');
  fensterRaster(S, x, z, w, d, '+z', { y0: 4.5, geschosse: 3, gh: 4, raster: 3.2, sims: '#efe4d2', rahmen: '#efe4d2' });
  fensterRaster(S, x, z, w, d, '+x', { y0: 4.5, geschosse: 3, gh: 4, raster: 3.2, sims: '#efe4d2' });
  S.box(w * 0.4, 4.0, 0.3, x + w / 2, 2.1, z + d + 0.1, '#7b5b3f');
  const dg = dachProfil(w - 0.2, d - 0.2, 6, 0.3, 'x'); dg.translate(x + w / 2, H + 0.2, z + d / 2); S.add(dg, waehle(r, FARBEN.ziegel));
  S.quader(x + w / 2 - 3, H, z + d / 2 - 3, x + w / 2 + 3, H + 14, z + d / 2 + 3, '#e3d3bd');
  S.add(walmPyramide(4.2, 9).translate(x + w / 2, H + 14, z + d / 2), FARBEN.kupfer[1]);
  S.add(new THREE.CylinderGeometry(1.4, 1.4, 0.2, 16).rotateX(Math.PI / 2).translate(x + w / 2, H + 10, z + d / 2 + 3.05), '#f4f1ea');
  return { hoehe: H + 23 };
}

// ---- Platzhalter für Landmarken und Sonderparzellen (schlicht, unterscheidbar) ----
function korpus(S, p, H, farbe, rand = 0.4) { S.quader(p.x + rand, 0, p.z + rand, p.x + p.w - rand, H, p.z + p.d - rand, farbe); }
function fensterBand(S, p, y0, n, gh, farbe = FARBEN.glas, rand = 1.4) {
  for (let k = 0; k < n; k++) { const y = y0 + k * gh + gh * 0.5; S.box(p.w - 2 * rand, gh * 0.5, 0.12, p.x + p.w / 2, y, p.z + p.d - 0.35, farbe); S.box(0.12, gh * 0.5, p.d - 2 * rand, p.x + p.w - 0.35, y, p.z + p.d / 2, farbe); }
}
function phSchloss(S, scene, p) {
  const r = rng(p.seed), f = waehle(r, ['#efe3c8', '#f1e9d8', '#e9d6b4', '#f3efe6']), H = 16;
  korpus(S, p, H, f, 0);
  fensterRaster(S, p.x, p.z, p.w, p.d, '+z', { y0: 1.5, geschosse: 3, gh: 4.6, raster: 3.4, fh: 2.6, sims: '#ffffff', rahmen: '#ffffff' });
  fensterRaster(S, p.x, p.z, p.w, p.d, '+x', { y0: 1.5, geschosse: 3, gh: 4.6, raster: 3.4, fh: 2.6, sims: '#ffffff' });
  const dg = dachProfil(p.w, p.d, 5, p.d * 0.45, 'x'); dg.translate(p.x + p.w / 2, H, p.z + p.d / 2); S.add(dg, '#6f7f8a');
  const rw = Math.min(26, p.w * 0.22);
  S.quader(p.x + p.w / 2 - rw / 2, 0, p.z + p.d - 2, p.x + p.w / 2 + rw / 2, H + 3, p.z + p.d + 2.5, heller(f, 0.04));
  for (let u = -rw / 2 + 2; u <= rw / 2 - 2; u += 3.3) S.box(1.0, 9, 1.0, p.x + p.w / 2 + u, 4.5, p.z + p.d + 3.1, '#ffffff');
  S.add(new THREE.SphereGeometry(6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(p.x + p.w / 2, H + 3, p.z + p.d / 2 + 1), FARBEN.kupfer[0]);
  for (const sx of [0, 1]) S.quader(p.x + (sx ? p.w - 14 : 0), 0, p.z - 0.5, p.x + (sx ? p.w : 14), H + 2, p.z + p.d + 1, heller(f, 0.02));
  return { hoehe: H + 9 };
}
function phTheater(S, scene, p) {
  const r = rng(p.seed), f = waehle(r, ['#e8dcc4', '#ded2bd', '#ece4d3']), H = 15;
  korpus(S, p, H, f);
  S.quader(p.x + p.w * 0.3, H, p.z + p.d * 0.15, p.x + p.w * 0.85, H + 9, p.z + p.d * 0.75, dunkler(f, 0.05));
  const sp = Math.min(p.w - 4, 18);
  S.quader(p.x + p.w / 2 - sp / 2, 0.3, p.z + p.d - 0.4, p.x + p.w / 2 + sp / 2, 1.0, p.z + p.d + 3.5, '#d8d0c0');
  for (let u = -sp / 2 + 1; u <= sp / 2 - 1; u += 2.6) S.box(0.9, 9, 0.9, p.x + p.w / 2 + u, 5.5, p.z + p.d + 2.8, '#ffffff');
  const g = dachProfil(sp + 1, 4.5, 3, 0.2, 'x'); g.translate(p.x + p.w / 2, 10, p.z + p.d + 2.2); S.add(g, f);
  fensterBand(S, p, 4, 2, 4.5, '#5e7383', 2.5);
  return { hoehe: H + 9 };
}
function phMuseum(S, scene, p) {
  const r = rng(p.seed), f = waehle(r, ['#e6dcc8', '#dcd6cc', '#efe9de']), H = 13;
  korpus(S, p, H, f);
  for (let u = p.x + 2; u < p.x + p.w - 1; u += 2.8) S.box(0.8, H - 2, 0.8, u, (H - 2) / 2 + 0.5, p.z + p.d + 0.3, '#ffffff');
  gesims(S, p.x, p.z, p.w, p.d, H, 0.8, 0.5, '#ffffff');
  S.add(new THREE.SphereGeometry(Math.min(p.w, p.d) * 0.22, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(p.x + p.w / 2, H + 0.4, p.z + p.d / 2), FARBEN.kupfer[1]);
  return { hoehe: H + Math.min(p.w, p.d) * 0.22 };
}
function phTor(S, scene, p) {
  const stein = '#b98a6e', H = 18, cx = p.x + p.w / 2, cz = p.z + p.d / 2;
  S.quader(p.x, 0, p.z, p.x + p.w * 0.32, H, p.z + p.d, stein);
  S.quader(p.x + p.w * 0.68, 0, p.z, p.x + p.w, H, p.z + p.d, stein);
  S.quader(p.x, 6, p.z, p.x + p.w, H, p.z + p.d, stein);
  S.add(new THREE.CylinderGeometry(p.w * 0.18, p.w * 0.18, p.d + 0.2, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(cx, 6, cz), '#3c3530');
  for (let u = p.x + 0.8; u < p.x + p.w; u += 1.8) S.box(1.0, 1.2, p.d + 0.3, u, H + 0.6, cz, stein);
  S.add(walmPyramide(p.w * 0.45, 7).translate(cx, H + 1.2, cz), FARBEN.ziegel[0]);
  return { hoehe: H + 8 };
}
function phDenkmal(S, scene, p) {
  const cx = p.x + p.w / 2, cz = p.z + p.d / 2, s = Math.min(p.w, p.d);
  S.box(s * 0.8, 0.6, s * 0.8, cx, 0.6, cz, '#d6cfc1');
  S.box(s * 0.4, 3.2, s * 0.4, cx, 2.5, cz, '#cfc7b6');
  S.box(0.9, 2.2, 0.7, cx, 5.2, cz, '#6f9a7d'); S.box(0.5, 0.5, 0.5, cx, 6.6, cz, '#6f9a7d');
  return { hoehe: 7 };
}
function phMarkthalle(S, scene, p) {
  const H = 9;
  korpus(S, p, H, '#c4876a');
  const g = new THREE.CylinderGeometry(p.d * 0.45, p.d * 0.45, p.w - 1, 14, 1, false, 0, Math.PI); g.rotateZ(Math.PI / 2); g.scale(1, 0.55, 1); g.translate(p.x + p.w / 2, H, p.z + p.d / 2);
  S.add(g, F.glasHell);
  for (let u = p.x + 2; u < p.x + p.w - 1; u += 4) S.box(2.4, 5, 0.14, u + 1, 3.5, p.z + p.d - 0.33, '#5e7383');
  return { hoehe: H + p.d * 0.25 };
}
function phHotel(S, scene, p) {
  const r = rng(p.seed), g = Math.round(zw(r, 7, 12)), H = 5 + g * 3.2;
  korpus(S, p, H, waehle(r, ['#e2e5e7', '#e8dfcf', '#cfd6dc']));
  fensterBand(S, p, 5, g, 3.2);
  S.box(p.w * 0.5, 0.4, 3, p.x + p.w / 2, 4.2, p.z + p.d + 1.2, '#2f3b44');
  S.box(p.w * 0.45, 1.6, 0.3, p.x + p.w / 2, H - 1.5, p.z + p.d + 0.1, '#c9a24a');
  return { hoehe: H + 1 };
}
function phParkhaus(S, scene, p) {
  const n = 5;
  for (let k = 0; k < n; k++) {
    S.quader(p.x + 0.3, k * 3, p.z + 0.3, p.x + p.w - 0.3, k * 3 + 0.5, p.z + p.d - 0.3, '#c9ccd0');
    S.quader(p.x + 1, k * 3 + 0.5, p.z + 1, p.x + p.w - 1, k * 3 + 3, p.z + p.d - 1, '#4a5258');
    S.quader(p.x + 0.3, k * 3 + 0.5, p.z + p.d - 0.6, p.x + p.w - 0.3, k * 3 + 1.4, p.z + p.d - 0.3, '#b9bdc1');
    S.quader(p.x + p.w - 0.6, k * 3 + 0.5, p.z + 0.3, p.x + p.w - 0.3, k * 3 + 1.4, p.z + p.d - 0.3, '#b9bdc1');
  }
  S.quader(p.x + 0.3, n * 3, p.z + 0.3, p.x + p.w - 0.3, n * 3 + 0.4, p.z + p.d - 0.3, '#c9ccd0');
  S.box(3, 2.4, 0.3, p.x + p.w - 3, n * 3 - 1.5, p.z + p.d, '#2f63b5');
  return { hoehe: n * 3 + 0.4 };
}
function phKonkurrenz(S, scene, p) {
  const H = 20;
  korpus(S, p, H, '#e6e8ea', 0.3);
  S.quader(p.x + 0.4, 0.3, p.z + 0.4, p.x + p.w - 0.4, 5, p.z + p.d - 0.4, '#3e505c');
  fensterBand(S, p, 6, 3, 4.5);
  S.box(p.w + 0.6, 1.2, p.d + 0.6, p.x + p.w / 2, H + 0.2, p.z + p.d / 2, '#2f5f8f');
  return { hoehe: H + 1 };
}
function phWasserturm(S, scene, p) {
  const cx = p.x + p.w / 2, cz = p.z + p.d / 2, rr = Math.min(p.w, p.d) / 2;
  S.add(new THREE.CylinderGeometry(rr * 0.55, rr * 0.7, 24, 12).translate(cx, 12, cz), '#b9785e');
  S.add(new THREE.CylinderGeometry(rr, rr * 0.9, 7, 12).translate(cx, 27, cz), '#c4876a');
  S.add(new THREE.ConeGeometry(rr * 1.05, 4, 12).translate(cx, 32.5, cz), FARBEN.kupfer[0]);
  return { hoehe: 35 };
}
function phTankstelle(S, scene, p) {
  S.quader(p.x, 0, p.z, p.x + p.w, 0.34, p.z + p.d, '#a3a7ab');
  const cx = p.x + p.w * 0.6, cz = p.z + p.d * 0.6;
  S.box(p.w * 0.55, 0.6, p.d * 0.45, cx, 5.2, cz, '#f2f1ec');
  S.box(p.w * 0.55 + 0.1, 0.3, p.d * 0.45 + 0.1, cx, 4.8, cz, '#3f7d56');
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) S.box(0.3, 4.8, 0.3, cx + dx * p.w * 0.2, 2.6, cz + dz * p.d * 0.15, '#c9ccd0');
  for (const dx of [-1, 1]) S.box(0.6, 1.6, 1.0, cx + dx * p.w * 0.12, 1.1, cz, '#3f7d56');
  S.quader(p.x + 1, 0.3, p.z + 1, p.x + p.w * 0.35, 3.8, p.z + p.d * 0.4, '#e8e4dc');
  S.box(0.4, 7, 0.4, p.x + p.w - 1.5, 3.8, p.z + p.d - 1.5, '#c9ccd0'); S.box(1.8, 1.8, 0.4, p.x + p.w - 1.5, 7.6, p.z + p.d - 1.5, '#3f7d56');
  return { hoehe: 8.5 };
}
function phDiscounter(S, scene, p) {
  korpus(S, p, 6.5, '#e2e0dc', 0.3);
  S.box(p.w - 0.4, 1.2, p.d - 0.4, p.x + p.w / 2, 6.1, p.z + p.d / 2, '#d36b2a');
  S.quader(p.x + p.w * 0.6, 0.3, p.z + p.d - 0.5, p.x + p.w - 2, 4, p.z + p.d - 0.2, FARBEN.glas);
  return { hoehe: 7 };
}
function phLuecke(S, scene, p) {
  const r = rng(p.seed);
  S.quader(p.x, 0, p.z, p.x + p.w, 0.38, p.z + p.d, waehle(r, ['#b9b19f', '#a9bf8f', '#c2b9a5']));
  for (let i = 0; i < 4; i++) S.box(zw(r, 0.6, 1.4), 0.4, zw(r, 0.6, 1.4), p.x + zw(r, 1, p.w - 1), 0.5, p.z + zw(r, 1, p.d - 1), '#7f9c62');
  if (p.front.includes('+z') && p.w > 6) { S.box(0.2, 2.4, 0.2, p.x + 1.5, 1.4, p.z + p.d - 0.6, '#5c6268'); S.box(0.2, 2.4, 0.2, p.x + p.w - 1.5, 1.4, p.z + p.d - 0.6, '#5c6268'); S.box(p.w - 2.4, 2.2, 0.15, p.x + p.w / 2, 3.6, p.z + p.d - 0.6, waehle(r, ['#e0b23c', '#2f6f8f', '#c9483e'])); }
  return { hoehe: 1 };
}
function phBaustelle(S, scene, p) {
  const r = rng(p.seed);
  S.quader(p.x, 0, p.z, p.x + p.w, 0.36, p.z + p.d, '#b49a7a');
  S.quader(p.x + 1.5, -0.8, p.z + 1.5, p.x + p.w - 1.5, 0.38, p.z + p.d - 1.5, '#8f7759');
  for (const [x0, z0, x1, z1] of [[p.x, p.z + p.d - 0.2, p.x + p.w, p.z + p.d], [p.x + p.w - 0.2, p.z, p.x + p.w, p.z + p.d]]) S.quader(x0, 0.3, z0, x1, 2.2, z1, '#f2f1ec');
  const H = 4 + p.geschosse * 3.3, cx = p.x + p.w * 0.3, cz = p.z + p.d * 0.4;
  S.box(0.8, H + 6, 0.8, cx, (H + 6) / 2, cz, '#e0b23c');
  S.box(Math.max(14, p.w), 0.6, 0.6, cx + Math.max(14, p.w) * 0.3, H + 6, cz, '#e0b23c');
  S.box(2, 1.2, 1.2, cx - 2, H + 6, cz, '#5c6268');
  if (r() < 0.6) S.quader(p.x + 2, 0.38, p.z + 2, p.x + p.w - 2, 0.38 + 3.3 * Math.max(1, Math.floor(p.geschosse / 2)), p.z + p.d - 2, '#b9b4ab');
  return { hoehe: H + 6 };
}
function phParkplatzParzelle(S, scene, p) {
  S.quader(p.x, 0, p.z, p.x + p.w, 0.34, p.z + p.d, '#a3a7ab');
  const r = rng(p.seed);
  const quer = p.w >= p.d;
  for (let u = 1.3; u < (quer ? p.w : p.d) - 1; u += 2.6) {
    if (quer) S.box(0.12, 0.02, 4.4, p.x + u, 0.35, p.z + 3, F.markierung); else S.box(4.4, 0.02, 0.12, p.x + 3, 0.35, p.z + u, F.markierung);
    if (r() < 0.6) { const c = waehle(r, AUTOFARBEN); if (quer) { S.box(1.7, 0.9, 4.2, p.x + u + 1.3, 0.85, p.z + 3, c); S.box(1.5, 0.6, 2.2, p.x + u + 1.3, 1.6, p.z + 3, F.glas); } else { S.box(4.2, 0.9, 1.7, p.x + 3, 0.85, p.z + u + 1.3, c); S.box(2.2, 0.6, 1.5, p.x + 3, 1.6, p.z + u + 1.3, F.glas); } }
  }
  return { hoehe: 1 };
}
function phPlatzParzelle(S, scene, p) {
  const r = rng(p.seed);
  S.quader(p.x, 0, p.z, p.x + p.w, 0.36, p.z + p.d, '#e4ddcf');
  baum(S, p.x + p.w / 2, p.z + p.d / 2, r, 1.1);
  S.box(1.8, 0.45, 0.5, p.x + p.w / 2 + 2.5, 0.6, p.z + p.d / 2, F.holz);
  return { hoehe: 6 };
}
function phDurchgang(S, scene, p) {
  S.quader(p.x, 0, p.z, p.x + p.w, 0.36, p.z + p.d, '#d6ccba');
  const H = 4 + (p.geschosse ?? 3) * 3.3;
  if (p.seite === '+z' || p.seite === '-z') S.quader(p.x, 4.2, p.z, p.x + p.w, H, p.z + p.d, '#e8dfcf');
  else S.quader(p.x, 4.2, p.z, p.x + p.w, H, p.z + p.d, '#e8dfcf');
  return { hoehe: H };
}

export const platzhalterBauer = {
  stadthaus: (S, scene, p) => platzhalterHaus(S, scene, p, false),
  eck: (S, scene, p) => platzhalterHaus(S, scene, p, true),
  'slot:warenhaus': phWarenhaus,
  'slot:sport': phWarenhaus,
  'slot:wettbewerber': phKonkurrenz,
  'slot:outlet': phKonkurrenz,
  'slot:mall': phMall,
  'slot:bahnhof': phBahnhof,
  'slot:kirche': phKirche,
  'slot:sonder': phSonder,
  'slot:rathaus': phSonder,
  'slot:hochhaus': phSonder,
  'slot:schloss': phSchloss,
  'slot:theater': phTheater,
  'slot:museum': phMuseum,
  'slot:tor': phTor,
  'slot:denkmal': phDenkmal,
  'slot:markthalle': phMarkthalle,
  'slot:hotel': phHotel,
  'slot:parkhaus': phParkhaus,
  'slot:konkurrenz': phKonkurrenz,
  'slot:wasserturm': phWasserturm,
  'slot:tankstelle': phTankstelle,
  'slot:discounter': phDiscounter,
  luecke: phLuecke,
  baustelle: phBaustelle,
  parkplatz: phParkplatzParzelle,
  platz: phPlatzParzelle,
  durchgang: phDurchgang,
};

/** Debug-Bauer: Parzellen als flache Farbfelder nach Typ (für Datenprüfung). */
export const parzellenBauer = (() => {
  const farbe = { stadthaus: '#e8dfcf', eck: '#c9a98e', hofhaus: '#bfb6a6', luecke: '#a9bf8f', baustelle: '#b49a7a', parkplatz: '#a3a7ab', platz: '#f2ece0', durchgang: '#d6ccba',
    'slot:warenhaus': '#d23c32', 'slot:sport': '#1d8a6b', 'slot:wettbewerber': '#7b858e', 'slot:outlet': '#8c1d40', 'slot:mall': '#2f6f8f', 'slot:bahnhof': '#d39a2b', 'slot:kirche': '#6b4f8f', 'slot:sonder': '#3f7d56', 'slot:rathaus': '#3f7d56', 'slot:hochhaus': '#4a6f8f',
    'slot:schloss': '#e0b23c', 'slot:theater': '#8d3b5a', 'slot:museum': '#8d5fbf', 'slot:tor': '#7a4f36', 'slot:denkmal': '#6f9a7d', 'slot:markthalle': '#c4876a', 'slot:hotel': '#4aa3b5',
    'slot:parkhaus': '#6b7177', 'slot:konkurrenz': '#2f5f8f', 'slot:wasserturm': '#b9785e', 'slot:tankstelle': '#3fbf6a', 'slot:discounter': '#d36b2a' };
  const f = (S, scene, p) => {
    const h = 1 + p.hoehenklasse * 1.2;
    S.quader(p.x + 0.3, 0, p.z + 0.3, p.x + p.w - 0.3, h, p.z + p.d - 0.3, farbe[p.typ] ?? '#999999');
    for (const s of p.front) {
      if (s === '+z') S.quader(p.x + 0.3, h, p.z + p.d - 1.2, p.x + p.w - 0.3, h + 0.2, p.z + p.d - 0.3, '#2c3136');
      if (s === '+x') S.quader(p.x + p.w - 1.2, h, p.z + 0.3, p.x + p.w - 0.3, h + 0.2, p.z + p.d - 0.3, '#2c3136');
      if (s === '-z') S.quader(p.x + 0.3, h, p.z + 0.3, p.x + p.w - 0.3, h + 0.2, p.z + 1.2, '#2c3136');
      if (s === '-x') S.quader(p.x + 0.3, h, p.z + 0.3, p.x + 1.2, h + 0.2, p.z + p.d - 0.3, '#2c3136');
    }
    return { hoehe: h };
  };
  const flach = (S, scene, p) => { S.quader(p.x + 0.3, 0, p.z + 0.3, p.x + p.w - 0.3, 0.6, p.z + p.d - 0.3, farbe[p.typ] ?? '#999999'); return { hoehe: 1 }; };
  return { stadthaus: f, eck: f, slot: f, hofhaus: f, luecke: flach, baustelle: flach, parkplatz: flach, platz: flach, durchgang: flach };
})();

export { dunkler };

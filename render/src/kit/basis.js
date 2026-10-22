// Grundbausteine für alle Generatoren. Bildsprache: Coffee Inc 2 (isometrisch, flach schattiert, Detail aus Geometrie).
//
// KONVENTIONEN (für alle Module verbindlich)
// - Einheit Meter. y = oben. Feste Kamera von +x/+z schräg oben (Azimut 45°, Elevation 30°).
// - Sichtbar sind IMMER nur die Seiten +x (rechte Bildseite) und +z (linke Bildseite) sowie das Dach.
//   Diese beiden Seiten werden voll detailliert, -x und -z bleiben glatt.
// - Licht kommt von links: +z-Seiten hell, +x-Seiten etwas dunkler. Keine Texturen außer Schrift.
// - Ein Gebäude steht auf dem Rechteck [x, x+w] × [z, z+d], Boden y = 0 (Gehweg ist y = 0.3).
// - Alle Geometrie geht über den Sammler S (S.box, S.add) und wird am Ende pro Farbe zusammengeführt.
// - Zufall nur über rng(seed). Gleicher Seed = gleiches Gebäude.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export { THREE };

/**
 * Deterministisches Mischen (Fisher-Yates). Ersetzt `sort(() => r() - 0.5)`: dort hängt die Zahl der
 * Zufallszüge vom Sortieralgorithmus der JS-Engine ab, sodass dieselbe Stadt in Chrome-Versionen
 * oder Safari (iPhone) anders aussah.
 */
export function mische(r, liste) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function rng(seed) {
  let s = (typeof seed === 'string' ? [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) : seed) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const waehle = (r, arr) => arr[Math.floor(r() * arr.length)];
export const zw = (r, a, b) => a + (b - a) * r();

// ---------- Farbwelt ----------
export const FARBEN = {
  fassadeHell: ['#f3eee4', '#ece5d7', '#efe6d6', '#f1eadc', '#e8dfcf', '#e4dccd'],
  fassadeKuehl: ['#dde1e4', '#d3d9de', '#cfd6dc', '#e2e5e7'],
  fassadeWarm: ['#e3d3bd', '#dccbb2', '#e6d5bf', '#d9c4a8'],
  backstein: ['#b9785e', '#a8664f', '#c4876a', '#9e5c47'],
  putzBunt: ['#e9d79e', '#d9b9a4', '#c9d6b5', '#b9cbd8', '#e5c2b5'],
  dach: ['#8b939b', '#9aa1a8', '#7c848c', '#a8a097', '#b4aa9c'],
  ziegel: ['#b4583f', '#a24e38', '#c06548'],
  kupfer: ['#6f9a7d', '#7aa68a'],
  fenster: '#55636f',
  fensterHell: '#6f8696',
  glas: '#4b6272',
  laden: '#3f4a53',
  markise: ['#c9483e', '#2f6f8f', '#3f7d56', '#d39a2b', '#6b4f8f', '#8c3b3b'],
  gehweg: '#d8d4cb',
  asphalt: '#8d939a',
  markierung: '#f2f1ec',
  wasser: '#3c8a9b',   // GESTALTUNG.md: ruhiges, dunkleres Stadtwasser
  rasen: '#94c486',
  baum: ['#6fa860', '#5f9a56', '#7cb369'],
  stamm: '#7a5d43',
  marke: '#d23c32', // Hartwig-Rot
};

export function heller(c, um = 0.05) { return '#' + new THREE.Color(c).offsetHSL(0, 0, um).getHexString(); }
export function dunkler(c, um = 0.06) { return '#' + new THREE.Color(c).offsetHSL(0, 0, -um).getHexString(); }

// ---------- Material ----------
const cache = new Map();
export function mat(c) {
  const k = typeof c === 'string' ? c.toLowerCase() : '#' + c.getHexString();
  if (!cache.has(k)) cache.set(k, new THREE.MeshLambertMaterial({ color: k }));
  return cache.get(k);
}

// ---------- Detailstufen (LOD) ----------
// LOD.stufe: 'nah' (Detailansicht) | 'mittel' (sichtbarer Stadtbereich) | 'fern' (Bildrand/Übersicht). In 'fern' verwerfen alle Sammler
// Kleinteile (zwei Kanten unter LOD.duenn m und keine über LOD.lang m: Fensterbänke, Rahmen, Sprossen, Geländer,
// Masten), der Instanzer in stadt.js lässt Figuren und Straßenmöbel weg, Schrift wird höchstens LOD.schrift px groß und
// Schilder unter LOD.schildMin m Höhe entfallen (entferneKleineSchilder). setzeLod(stufe) stellt alles um.
export const LOD = { stufe: 'nah', duenn: 0.3, lang: 6, schrift: 24, schildMin: 1.4 };
export function setzeLod(stufe) {
  LOD.stufe = stufe;
  SCHRIFT_LOD.maxGroesse = stufe === 'nah' ? Infinity : LOD.schrift;
}
/** true, wenn ein Teil in der Stufe 'fern' wegfällt (Maße aus der Bounding-Box). */
function kleinteil(g) {
  if (!g.boundingBox) g.computeBoundingBox();
  const b = g.boundingBox, m = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].sort((a, c) => a - c);
  return m[1] < LOD.duenn && m[2] < LOD.lang;
}
/** Entfernt in 'fern' Schriftflächen unter LOD.schildMin Höhe aus der Szene (nach dem Bau aufrufen). */
export function entferneKleineSchilder(scene) {
  if (LOD.stufe === 'nah') return 0;
  const weg = [];
  scene.traverse((o) => { const pp = o.isMesh && !o.isInstancedMesh && o.geometry?.parameters; if (pp && pp.height !== undefined && pp.width !== undefined && o.material?.map && Math.min(pp.width, pp.height) * Math.max(o.scale.x, o.scale.y) < LOD.schildMin) weg.push(o); });
  for (const o of weg) { o.parent.remove(o); o.geometry.dispose(); }
  return weg.length;
}

// ---------- Sammler ----------
export class Sammler {
  constructor() { this.teile = new Map(); this.anzahl = 0; }
  /** Quader mit Mittelpunkt (x, y, z). ry dreht um die Hochachse. */
  box(w, h, d, x, y, z, farbe, ry = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    this.add(g, farbe);
  }
  /** Quader von Ecke (x0,y0,z0) bis (x1,y1,z1). Praktisch für Fassaden. */
  quader(x0, y0, z0, x1, y1, z1, farbe) {
    this.box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, farbe);
  }
  add(g, farbe) {
    if (LOD.stufe !== 'nah' && kleinteil(g)) { this.anzahl++; this.verworfen = (this.verworfen ?? 0) + 1; return; }
    const k = (typeof farbe === 'string' ? farbe : '#' + farbe.getHexString()).toLowerCase();
    if (!this.teile.has(k)) this.teile.set(k, []);
    const gg = g.index ? g.toNonIndexed() : g;
    for (const a of Object.keys(gg.attributes)) if (a !== 'position' && a !== 'normal') gg.deleteAttribute(a);
    this.teile.get(k).push(gg);
    this.anzahl++;
  }
  bauen(scene, schatten = true) {
    for (const [k, gs] of this.teile) {
      const m = new THREE.Mesh(mergeGeometries(gs), mat(k));
      m.castShadow = schatten; m.receiveShadow = true;
      scene.add(m);
    }
  }
}

// Feste Kamera (Azimut 45°, Elevation 30°) und feste Sonne (basis.sonneAuf): Ein Dreieck ist nötig, wenn die Kamera seine
// Vorderseite sieht oder wenn es im Schattenpass gezeichnet wird (three.js rendert dort die vom Licht abgewandten Seiten).
const BLICK = new THREE.Vector3(Math.SQRT1_2 * Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), Math.SQRT1_2 * Math.cos(Math.PI / 6));
const LICHT = new THREE.Vector3(-40, 120, 90).normalize();
/** LOD 'fern': Dreiecke weglassen, die weder die Kamera sieht noch einen Schatten werfen (zum Beispiel alle −x-Seiten). */
function sichtbareDreiecke(P, N) {
  let n = 0;
  const behalt = new Uint8Array(P.length / 9);
  for (let t = 0, i = 0; i < P.length; i += 9, t++) {
    const ax = P[i + 3] - P[i], ay = P[i + 4] - P[i + 1], az = P[i + 5] - P[i + 2], bx = P[i + 6] - P[i], by = P[i + 7] - P[i + 1], bz = P[i + 8] - P[i + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const v = nx * BLICK.x + ny * BLICK.y + nz * BLICK.z, l = nx * LICHT.x + ny * LICHT.y + nz * LICHT.z;
    if (v > 1e-9 || l < -1e-9) { behalt[t] = 1; n++; }
  }
  if (n === behalt.length) return [P, N];
  const P2 = new Float32Array(n * 9), N2 = new Float32Array(n * 9);
  for (let t = 0, o = 0; t < behalt.length; t++) if (behalt[t]) { P2.set(P.subarray(t * 9, t * 9 + 9), o); N2.set(N.subarray(t * 9, t * 9 + 9), o); o += 9; }
  return [P2, N2];
}

/**
 * Sparsamer Sammler für ganze Städte: kopiert jedes Teil sofort in Puffer je Farbe und verwirft das Teil. Spitzenspeicher
 * rund die Hälfte des Sammlers (der alle Teile hält und beim Zusammenführen ein zweites Mal kopiert). Gleiche API.
 * In LOD 'fern' entfallen Kleinteile wie beim Sammler.
 */
export class KompaktSammler {
  constructor() { this.teile = new Map(); this.anzahl = 0; this.puffer = new Map(); this.verworfen = 0; }
  box(w, h, d, x, y, z, farbe, ry = 0) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); this.add(g, farbe); }
  quader(x0, y0, z0, x1, y1, z1, farbe) { this.box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, farbe); }
  add(g, farbe) {
    this.anzahl++;
    if (LOD.stufe !== 'nah' && kleinteil(g)) { this.verworfen++; return; }
    const k = (typeof farbe === 'string' ? farbe : '#' + farbe.getHexString()).toLowerCase();
    const gg = g.index ? g.toNonIndexed() : g;
    if (!gg.attributes.normal) gg.computeVertexNormals();
    if (this.statistik) { const t = g.type + (g.parameters?.shapes && [].concat(g.parameters.shapes).some((q) => q.holes?.length) ? '+loch' : ''), e = this.statistik.get(t) ?? [0, 0]; e[0]++; e[1] += gg.attributes.position.count / 3; this.statistik.set(t, e); }
    if (!this.puffer.has(k)) this.puffer.set(k, { p: [], n: [], len: 0 });
    const b = this.puffer.get(k);
    let P = gg.attributes.position.array, N = gg.attributes.normal.array;
    if (LOD.stufe !== 'nah') [P, N] = sichtbareDreiecke(P, N);
    if (!P.length) return;
    b.p.push(P); b.n.push(N); b.len += P.length;
  }
  bauen(scene, schatten = true) {
    for (const [k, b] of this.puffer) {
      const P = new Float32Array(b.len), N = new Float32Array(b.len);
      let o = 0;
      for (let i = 0; i < b.p.length; i++) { P.set(b.p[i], o); N.set(b.n[i], o); o += b.p[i].length; b.p[i] = b.n[i] = null; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      const m = new THREE.Mesh(g, mat(k)); m.castShadow = schatten; m.receiveShadow = true; scene.add(m);
    }
    this.puffer.clear();
  }
}

// ---------- Formen ----------
/** Satteldach/Mansarde: Trapez-Querschnitt (tiefe unten, oben oben), entlang der Achse 'x' oder 'z'. */
export function dachProfil(laenge, tiefe, hoehe, oben, achse = 'x') {
  const s = new THREE.Shape();
  s.moveTo(-tiefe / 2, 0); s.lineTo(tiefe / 2, 0); s.lineTo(oben / 2, hoehe); s.lineTo(-oben / 2, hoehe); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: laenge, bevelEnabled: false });
  g.translate(0, 0, -laenge / 2);
  if (achse === 'x') g.rotateY(Math.PI / 2);
  return g;
}

/** Walmdach/Pyramide über Rechteck w×d, Spitze bei hoehe (oben = Firstlänge-Anteil). */
export function walmdach(w, d, hoehe) {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  g.rotateY(Math.PI / 4);
  g.scale(w, hoehe, d);
  g.translate(0, hoehe / 2, 0);
  return g;
}

/**
 * Fensterraster auf einer sichtbaren Seite.
 * seite: '+z' (Fassade bei z = z0+d, läuft entlang x) oder '+x' (Fassade bei x = x0+w, läuft entlang z)
 * opts: { von, bis (Laufkoordinate), y0, geschosse, gh, raster, fw, fh, farbe, rahmen, sims, tiefe }
 */
export function fensterRaster(S, x0, z0, w, d, seite, o) {
  const raster = o.raster ?? 3.1;
  const fw = o.fw ?? 1.35, fh = o.fh ?? 1.9;
  const farbe = o.farbe ?? FARBEN.fenster;
  const lauf0 = seite === '+z' ? x0 : z0;
  const laenge = seite === '+z' ? w : d;
  const von = o.von ?? lauf0, bis = o.bis ?? lauf0 + laenge;
  const n = Math.max(1, Math.floor((bis - von) / raster));
  const rand = (bis - von - n * raster) / 2;
  for (let k = 0; k < o.geschosse; k++) {
    const y = o.y0 + k * o.gh + o.gh * 0.55;
    for (let i = 0; i < n; i++) {
      const u = von + rand + raster * (i + 0.5);
      if (seite === '+z') {
        const z = z0 + d;
        S.box(fw, fh, 0.12, u, y, z + 0.02, farbe);
        if (o.sims) S.box(fw + 0.3, 0.16, 0.25, u, y - fh / 2 - 0.1, z + 0.05, o.sims);
        if (o.rahmen) S.box(fw + 0.2, 0.14, 0.18, u, y + fh / 2 + 0.12, z + 0.04, o.rahmen);
      } else {
        const x = x0 + w;
        S.box(0.12, fh, fw, x + 0.02, y, u, farbe);
        if (o.sims) S.box(0.25, 0.16, fw + 0.3, x + 0.05, y - fh / 2 - 0.1, u, o.sims);
        if (o.rahmen) S.box(0.18, 0.14, fw + 0.2, x + 0.04, y + fh / 2 + 0.12, u, o.rahmen);
      }
    }
  }
}

/** Waagerechtes Gesims rund um ein Rechteck (nur sichtbare Seiten nötig, wir machen es umlaufend). */
export function gesims(S, x0, z0, w, d, y, hoehe, ueberstand, farbe) {
  S.box(w + 2 * ueberstand, hoehe, d + 2 * ueberstand, x0 + w / 2, y, z0 + d / 2, farbe);
}

/** Markise vor der +z- oder +x-Seite. */
export function markise(S, x0, z0, w, d, seite, y, von, laenge, farbe) {
  const g = new THREE.BoxGeometry(seite === '+z' ? laenge : 1.6, 0.15, seite === '+z' ? 1.6 : laenge);
  if (seite === '+z') { g.rotateX(0.35); g.translate(von + laenge / 2, y, z0 + d + 0.7); }
  else { g.rotateZ(-0.35); g.translate(x0 + w + 0.7, y, von + laenge / 2); }
  S.add(g, farbe);
}

export function baum(S, x, z, r, s = 1) {
  S.box(0.5 * s, 2.2 * s, 0.5 * s, x, 1.3 * s, z, FARBEN.stamm);
  const g = new THREE.IcosahedronGeometry(2.1 * s * (0.85 + r() * 0.3), 0);
  g.translate(x, 3.6 * s, z);
  S.add(g, waehle(r, FARBEN.baum));
}

// ---------- Schrift (für Logos und Schilder) ----------
// Alle Module holen Schrift über textTextur()/textMaterial(): gleicher Text, Farbe, Größe, Hintergrund und Schrift
// teilen sich eine Leinwand-Textur (und ein Material). Ganze Städte hätten sonst Tausende Texturen im Speicher.
// SCHRIFT_LOD.maxGroesse begrenzt die Schriftgröße in Pixeln (LOD 'fern': lesbar ist dort ohnehin nichts); das
// Seitenverhältnis und damit die Schildgröße bleiben gleich. Der Cache leert sich selbst ab SCHRIFT_LOD.maxPixel.
export const SCHRIFT_LOD = { maxGroesse: Infinity, maxPixel: 96e6 };
const TEXT_CACHE = new Map(), TEXTMAT_CACHE = new Map();
let textPixel = 0;
export function schriftCacheLeeren() { TEXT_CACHE.clear(); TEXTMAT_CACHE.clear(); textPixel = 0; }
export function textTextur(text, farbe, groesse = 120, hintergrund = null, schrift = '"DejaVu Sans", Arial', fett = true) {
  const g = Math.max(8, Math.min(groesse, SCHRIFT_LOD.maxGroesse));
  const k = `${text}|${farbe}|${g}|${hintergrund}|${schrift}|${fett}`;
  const alt = TEXT_CACHE.get(k);
  if (alt) return alt;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `${fett ? 'bold ' : ''}${g}px ${schrift}`;
  ctx.font = font;
  c.width = Math.ceil(ctx.measureText(text).width + g * 0.8);
  c.height = Math.ceil(g * 1.5);
  const kk = c.getContext('2d');
  if (hintergrund) { kk.fillStyle = hintergrund; kk.fillRect(0, 0, c.width, c.height); }
  kk.font = font; kk.fillStyle = farbe; kk.textAlign = 'center'; kk.textBaseline = 'middle';
  kk.fillText(text, c.width / 2, c.height / 2 + g * 0.05);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if ((textPixel += c.width * c.height) > SCHRIFT_LOD.maxPixel) schriftCacheLeeren();
  const e = { t, seitenverhaeltnis: c.width / c.height };
  TEXT_CACHE.set(k, e);
  return e;
}
/**
 * Geteiltes Material für eine Schrift. o: { groesse = 140, hintergrund, schrift, fett, lit (Lambert statt Basic),
 * alphaTest (statt transparent, ohne Hintergrund), versatz (polygonOffsetFactor) }. Rückgabe { mat, seitenverhaeltnis, t }.
 */
export function textMaterial(text, farbe, o = {}) {
  const tt = textTextur(text, farbe, o.groesse ?? 140, o.hintergrund ?? null, o.schrift, o.fett ?? true);
  const k = `${text}|${farbe}|${o.groesse ?? 140}|${o.hintergrund ?? null}|${o.schrift}|${o.fett ?? true}|${o.lit ?? false}|${o.alphaTest ?? 0}|${o.versatz ?? 0}|${SCHRIFT_LOD.maxGroesse}`;
  let m = TEXTMAT_CACHE.get(k);
  if (!m || m.map !== tt.t) {
    const opt = o.hintergrund ? { map: tt.t } : o.alphaTest ? { map: tt.t, alphaTest: o.alphaTest } : { map: tt.t, transparent: true };
    if (o.versatz) Object.assign(opt, { polygonOffset: true, polygonOffsetFactor: o.versatz });
    m = o.lit ? new THREE.MeshLambertMaterial(opt) : new THREE.MeshBasicMaterial(opt);
    TEXTMAT_CACHE.set(k, m);
  }
  return { mat: m, seitenverhaeltnis: tt.seitenverhaeltnis, t: tt.t };
}

/**
 * Schild/Logo als Fläche an einer sichtbaren Seite. hoehe in Metern, Breite folgt aus dem Text.
 * seite '+z': Mittelpunkt (u, y) auf der Fassade z = zFassade; '+x' entsprechend.
 */
export function schild(scene, text, seite, u, y, fassade, hoehe, farbe, hintergrund = null) {
  const { mat: m0, seitenverhaeltnis } = textMaterial(text, farbe, { groesse: 140, hintergrund });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(hoehe * seitenverhaeltnis, hoehe), m0);
  if (seite === '+z') m.position.set(u, y, fassade + 0.35);
  else { m.rotation.y = Math.PI / 2; m.position.set(fassade + 0.35, y, u); }
  scene.add(m);
  return m;
}

/** Kartenmarker wie in Coffee Inc (Pin mit Buchstabe), schwebt über einem Punkt. */
export function marker(scene, x, y, z, farbe, zeichen, groesse = 9) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const k = c.getContext('2d');
  k.fillStyle = 'rgba(0,0,0,0.25)'; k.beginPath(); k.ellipse(128, 306, 40, 10, 0, 0, Math.PI * 2); k.fill();
  k.fillStyle = farbe; k.beginPath(); k.moveTo(128, 300); k.lineTo(70, 190); k.arc(128, 128, 100, Math.PI * 0.82, Math.PI * 0.18); k.closePath(); k.fill();
  k.fillStyle = '#ffffff'; k.beginPath(); k.arc(128, 128, 74, 0, Math.PI * 2); k.fill();
  k.fillStyle = farbe; k.font = 'bold 110px "DejaVu Sans", Arial'; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillText(zeichen, 128, 134);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  sp.center.set(0.5, 0); sp.scale.set(groesse * 0.8, groesse, 1); sp.position.set(x, y, z); sp.renderOrder = 20;
  scene.add(sp);
}

// ---------- Szene, Licht, Kamera ----------
export function neueSzene(hintergrund = '#4fb6c2') {
  const s = new THREE.Scene();
  s.background = new THREE.Color(hintergrund);
  s.add(new THREE.HemisphereLight(0xffffff, 0xa59f93, 1.7));
  const sonne = new THREE.DirectionalLight(0xfffaf0, 2.1);
  sonne.position.set(-40, 120, 90);
  sonne.castShadow = true;
  sonne.shadow.mapSize.set(4096, 4096);
  Object.assign(sonne.shadow.camera, { left: -320, right: 320, top: 320, bottom: -320, near: 1, far: 900 });
  sonne.shadow.bias = -0.0005;
  sonne.shadow.normalBias = 0.4;
  s.add(sonne);
  s.add(sonne.target);
  s.userData.sonne = sonne;
  return s;
}

/** Sonne und Schattenkamera auf einen Ausschnitt (Mittelpunkt, Radius) einstellen. */
export function sonneAuf(scene, mitte, radius) {
  const sonne = scene.userData.sonne;
  sonne.position.set(mitte.x - 40, mitte.y + 120, mitte.z + 90);
  sonne.target.position.copy(mitte);
  Object.assign(sonne.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius });
  sonne.shadow.camera.updateProjectionMatrix();
}

export function isoKamera(breite, hoehe, halbeHoehe, ziel) {
  const a = breite / hoehe;
  const c = new THREE.OrthographicCamera(-halbeHoehe * a, halbeHoehe * a, halbeHoehe, -halbeHoehe, -3000, 3000);
  const el = (30 * Math.PI) / 180, dist = 800;
  c.position.set(ziel.x + dist * Math.cos(el) * Math.SQRT1_2, ziel.y + dist * Math.sin(el), ziel.z + dist * Math.cos(el) * Math.SQRT1_2);
  c.lookAt(ziel);
  c.updateProjectionMatrix();
  return c;
}

/** Kamera so einstellen, dass eine Box (Weltkoordinaten) ins Bild passt. */
export function kameraFuer(breite, hoehe, box, rand = 1.12) {
  const mitte = box.getCenter(new THREE.Vector3());
  const tmp = isoKamera(breite, hoehe, 10, mitte);
  tmp.updateMatrixWorld();
  const ecken = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) ecken.push(new THREE.Vector3(x, y, z).applyMatrix4(tmp.matrixWorldInverse));
  const xs = ecken.map((v) => v.x), ys = ecken.map((v) => v.y);
  const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
  const a = breite / hoehe;
  const halb = (Math.max(bh, bw / a) / 2) * rand;
  // Bildmitte auf die Mitte der projizierten Box legen
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const kam = isoKamera(breite, hoehe, halb, mitte);
  kam.updateMatrixWorld();
  const rechts = new THREE.Vector3().setFromMatrixColumn(kam.matrixWorld, 0);
  const hoch = new THREE.Vector3().setFromMatrixColumn(kam.matrixWorld, 1);
  kam.position.addScaledVector(rechts, cx).addScaledVector(hoch, cy);
  kam.updateMatrixWorld();
  return kam;
}

let _renderer = null;
export function renderer(breite, hoehe) {
  if (!_renderer) {
    const canvas = document.createElement('canvas');
    _renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    _renderer.setPixelRatio(1);
    _renderer.outputColorSpace = THREE.SRGBColorSpace;
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.PCFShadowMap;
  }
  _renderer.setSize(breite, hoehe, false);
  return _renderer;
}

/** Bodenplatte unter einem Katalogeintrag: Asphalt mit Gehweg. */
export function sockel(S, x0, z0, w, d, rand = 6) {
  S.box(w + 2 * rand + 8, 0.2, d + 2 * rand + 8, x0 + w / 2, -0.1, z0 + d / 2, FARBEN.asphalt);
  S.box(w + 2 * rand, 0.3, d + 2 * rand, x0 + w / 2, 0.15, z0 + d / 2, FARBEN.gehweg);
}

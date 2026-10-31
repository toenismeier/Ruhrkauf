// Stadtmenschen als vorgerenderte Figuren (Quaternius-Figuren, CC0, gebacken mit render/scripts/menschen/).
// Ein Draw Call für alle Figuren einer Gruppe: Viereck je Figur, immer zur Iso-Kamera gedreht,
// Bild je Blickrichtung (8, davon 3 gespiegelt) und Animationsbild. Farben je Figur über sechs Regionen.
// Statisch gesetzte Figuren (Stadtaufbau) laufen über menschenSammler(), bewegte (leben.js) über menschenGruppe().
import { THREE, rng } from './basis.js';
import { ATLAS_INDEX as IX, ATLAS_WEBP } from './menschen-atlas.js';

const PI = Math.PI;
// Darstellungsgröße: wie die bisherigen Stadtfiguren etwas über Lebensgröße, damit sie in der Iso-Ansicht lesbar bleiben.
export const GROESSE = 1.5;
export const KOERPER = IX.koerper.map((k) => k.id);
const KOERPER_NR = Object.fromEntries(KOERPER.map((k, i) => [k, i]));
const ERWACHSEN = KOERPER.filter((k) => !k.startsWith('kind'));
const KINDER = KOERPER.filter((k) => k.startsWith('kind'));

// Gedämpfte Alltagsfarben (Herbst/Winter-tauglich); Sommer tauscht jahreszeit.js die Oberteile.
export const PALETTE = {
  oben: ['#2f3d52', '#55606b', '#8c7b65', '#c8b89c', '#e8e2d6', '#6b2f36', '#4f5d45', '#2b2b2e', '#a5462f', '#7a8fa3', '#d0a04a', '#5a4a6b', '#9c3c3c', '#3f6f74'],
  unten: ['#2c3a55', '#3b4c6b', '#24272d', '#4a4d52', '#6f604e', '#a69a84', '#3e4434', '#556b8a'],
  haut: ['#f1d0b4', '#ecc4a2', '#e3b590', '#f4d8c2', '#d9a47e', '#c08a64', '#8d5c3e'],
  haar: ['#e3cc93', '#cbb07a', '#a88a5c', '#7a5a3c', '#4e3726', '#2e231c', '#b4b0a8', '#8e8a84', '#d8d4cc'],
  schuhe: ['#2a2624', '#3b3330', '#ecebe6', '#6b4a32', '#1f2226'],
};
const HAUT_GEWICHT = [5, 5, 4, 3, 2, 1, 1];

let textur = null;
const wartende = new Set();
let geladen = false;
function atlasTextur() {
  if (textur) return textur;
  const img = typeof Image !== 'undefined' ? new Image() : null;
  textur = new THREE.Texture(img);
  textur.flipY = false;
  textur.generateMipmaps = false;
  textur.minFilter = THREE.LinearFilter; textur.magFilter = THREE.LinearFilter;
  textur.colorSpace = THREE.NoColorSpace;
  textur.premultiplyAlpha = false;
  if (img) {
    img.onload = () => { geladen = true; textur.needsUpdate = true; if (material) material.uniforms.uBereit.value = 1; for (const f of wartende) f(); wartende.clear(); };
    img.src = ATLAS_WEBP;
  }
  return textur;
}
/** Promise: Atlas geladen (für Prüfbilder vor dem Rendern abwarten). */
export function menschenBereit() {
  atlasTextur();
  return geladen ? Promise.resolve() : new Promise((res) => wartende.add(res));
}
/** Rückruf, sobald der Atlas da ist (Spiel zeichnet dann einmal neu). */
export function nachLaden(fn) { atlasTextur(); if (geladen) fn(); else wartende.add(fn); }

const VS = `
attribute vec3 iPos;
attribute vec4 iAnim;     // x Startbild der Animation, y Bilder je Richtung, z Bilder/s, w Phase
attribute vec2 iWinkel;   // x Gierwinkel (Spiel), y Maßstab
attribute vec3 iOben; attribute vec3 iUnten; attribute vec3 iHaut; attribute vec3 iHaar; attribute vec3 iSchuh; attribute vec3 iTasche;
uniform float uZeit;
uniform vec3 uRechts; uniform vec3 uOben; uniform vec3 uZurKamera;
varying vec2 vUv; varying vec4 vRahmen;
varying vec3 vOben; varying vec3 vUnten; varying vec3 vHaut; varying vec3 vHaar; varying vec3 vSchuh; varying vec3 vTasche;
const float SP = ${IX.spalten}.0, FW = ${IX.fw}.0, FH = ${IX.fh}.0, AW = ${IX.breite}.0, AH = ${IX.hoehe}.0;
const float OH = ${IX.orthoH.toFixed(4)}, FUSS = ${IX.fussY}.0, GROESSE = ${GROESSE.toFixed(3)};
void main() {
  float rel = iWinkel.x + ${(PI / 4).toFixed(6)};
  float d = mod(floor(rel / ${(PI / 4).toFixed(6)} + 0.5), 8.0);
  float spiegel = d > 4.5 ? 1.0 : 0.0;
  float dd = spiegel > 0.5 ? 8.0 - d : d;
  float bild = mod(floor(uZeit * iAnim.z + iAnim.w), iAnim.y);
  float idx = iAnim.x + dd * iAnim.y + bild;
  float spalte = mod(idx, SP), zeile = floor(idx / SP);
  float u = spiegel > 0.5 ? 1.0 - uv.x : uv.x;
  vec2 px = vec2(spalte * FW + u * FW, zeile * FH + (1.0 - uv.y) * FH);
  vUv = px / vec2(AW, AH);
  vRahmen = vec4((spalte * FW + 0.5) / AW, (zeile * FH + 0.5) / AH, (spalte * FW + FW - 0.5) / AW, (zeile * FH + FH - 0.5) / AH);
  float s = iWinkel.y * GROESSE;
  vec3 p = iPos + uRechts * ((uv.x - 0.5) * OH * FW / FH * s) + uOben * ((uv.y * FH - FUSS) / FH * OH * s) + uZurKamera * (0.45 * s);
  vOben = iOben; vUnten = iUnten; vHaut = iHaut; vHaar = iHaar; vSchuh = iSchuh; vTasche = iTasche;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FS = `
uniform sampler2D uAtlas; uniform float uHell; uniform float uBereit;
varying vec2 vUv; varying vec4 vRahmen;
varying vec3 vOben; varying vec3 vUnten; varying vec3 vHaut; varying vec3 vHaar; varying vec3 vSchuh; varying vec3 vTasche;
void main() {
  if (uBereit < 0.5) discard;
  vec2 uv = clamp(vUv, vRahmen.xy, vRahmen.zw);
  vec4 a = texture2D(uAtlas, uv);
  if (a.a < 0.5) discard;
  vec4 b = texture2D(uAtlas, uv + vec2(0.5, 0.0));
  float t = max(0.0, 1.0 - a.g - a.b - b.r - b.g - b.b);
  vec3 c = a.g * vOben + a.b * vUnten + b.r * vHaut + b.g * vHaar + b.b * vSchuh + t * vTasche;
  gl_FragColor = vec4(c * a.r * uHell, 1.0);
}`;

const VS_SCHATTEN = `
attribute vec3 iPos; attribute vec2 iWinkel;
varying vec2 vQ;
const float GROESSE = ${GROESSE.toFixed(3)};
void main() {
  float s = iWinkel.y * GROESSE;
  vQ = uv * 2.0 - 1.0;
  // flach auf dem Boden, leicht in Schattenrichtung der Sonne (Licht aus -x, +z) versetzt
  vec3 p = iPos + vec3(0.03, 0.03, 0.0) + vec3((uv.x - 0.5) * 0.95 * s + 0.12 * s, 0.0, (uv.y - 0.5) * 0.7 * s - 0.22 * s);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;
const FS_SCHATTEN = `
uniform float uBereit;
varying vec2 vQ;
void main() {
  if (uBereit < 0.5) discard;
  float r = dot(vQ, vQ);
  if (r > 1.0) discard;
  gl_FragColor = vec4(0.18, 0.16, 0.14, 0.32 * (1.0 - smoothstep(0.35, 1.0, r)));
}`;
let schattenMaterial = null;
function schattenMat() {
  if (schattenMaterial) return schattenMaterial;
  schattenMaterial = new THREE.ShaderMaterial({ uniforms: { uBereit: menschenMaterial().uniforms.uBereit },
    vertexShader: VS_SCHATTEN, fragmentShader: FS_SCHATTEN, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  return schattenMaterial;
}
let material = null;
const RECHTS = new THREE.Vector3(), OBEN = new THREE.Vector3(), ZUR = new THREE.Vector3();
{ // Iso-Kamera (basis.isoKamera): Elevation 30°, Blick aus (+x, +z)
  const el = 30 * PI / 180;
  ZUR.set(Math.cos(el) * Math.SQRT1_2, Math.sin(el), Math.cos(el) * Math.SQRT1_2);
  RECHTS.set(Math.SQRT1_2, 0, -Math.SQRT1_2);
  OBEN.set(0, 1, 0).addScaledVector(ZUR, -Math.sin(el)).normalize();   // Bild-Hochachse der Kamera
}
export function menschenMaterial() {
  if (material) return material;
  material = new THREE.ShaderMaterial({
    uniforms: { uAtlas: { value: atlasTextur() }, uZeit: { value: 0 }, uHell: { value: 1.0 }, uBereit: { value: geladen ? 1 : 0 },
      uRechts: { value: RECHTS }, uOben: { value: OBEN }, uZurKamera: { value: ZUR } },
    vertexShader: VS, fragmentShader: FS,
  });
  return material;
}
/** Animationszeit (Sekunden) für alle Figuren; leben.js schaltet sie weiter. */
export function menschenZeit(t) { if (material) material.uniforms.uZeit.value = t; }

const srgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const waehle = (r, l) => l[Math.floor(r() * l.length)];
function gewichtet(r, l, g) { let s = g.reduce((a, b) => a + b, 0) * r(); for (let i = 0; i < l.length; i++) if ((s -= g[i]) <= 0) return l[i]; return l.at(-1); }

/** Erscheinung einer Figur aus einem Zufallsstrom: Körper und Farben. */
export function erscheinung(r, o = {}) {
  const koerper = o.koerper ?? (r() < (o.kinder ?? 0.08) ? waehle(r, KINDER) : waehle(r, ERWACHSEN));
  const alt = koerper === 'mann_bart' || r() < 0.18;
  return {
    koerper,
    oben: o.oben ?? waehle(r, PALETTE.oben),
    unten: o.unten ?? waehle(r, PALETTE.unten),
    haut: gewichtet(r, PALETTE.haut, HAUT_GEWICHT),
    haar: alt && !koerper.startsWith('kind') ? waehle(r, PALETTE.haar.slice(6)) : waehle(r, PALETTE.haar.slice(0, 6)),
    schuhe: waehle(r, PALETTE.schuhe),
    tasche: o.tasche ?? '#c9483e',
  };
}

const ANIM = { gehen: [8, 7.5], gehen_tasche: [8, 7.5], stehen: [2, 0.6], reden: [2, 1.3] };
function animWerte(koerper, anim, phase, tempo = 1) {
  const k = IX.koerper[KOERPER_NR[koerper] ?? 0];
  const [n, fps] = ANIM[anim] ?? ANIM.stehen;
  return [k.start[anim] ?? k.start.stehen, n, fps * tempo, phase];
}

/** Gruppe mit fester Kapazität; Werte je Figur per setze(i, …), danach fertig(n). */
export function menschenGruppe(max, name = 'menschen') {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const attr = {};
  for (const [n, g] of [['iPos', 3], ['iAnim', 4], ['iWinkel', 2], ['iOben', 3], ['iUnten', 3], ['iHaut', 3], ['iHaar', 3], ['iSchuh', 3], ['iTasche', 3]]) {
    attr[n] = new THREE.InstancedBufferAttribute(new Float32Array(max * g), g);
    attr[n].setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute(n, attr[n]);
  }
  geo.instanceCount = 0;
  const mesh = new THREE.Mesh(geo, menschenMaterial());
  mesh.name = name; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.userData.menschen = true; mesh.userData.diagArt = 'menschen';
  // Weicher Bodenschatten je Figur (zweiter Draw Call, gleiche Instanzdaten)
  const schatten = new THREE.Mesh(geo, schattenMat());
  schatten.name = name + ':schatten'; schatten.frustumCulled = false; schatten.renderOrder = 1;
  schatten.userData.diagArt = 'menschen';
  mesh.add(schatten);
  const farbe = (a, i, hex) => { const c = srgb(hex); a.array[i * 3] = c[0]; a.array[i * 3 + 1] = c[1]; a.array[i * 3 + 2] = c[2]; };
  return {
    mesh, max,
    /** e: erscheinung(); anim: gehen | gehen_tasche | stehen | reden */
    setze(i, x, y, z, winkel, e, anim, phase = 0, s = 1, tempo = 1) {
      attr.iPos.array.set([x, y, z], i * 3);
      attr.iAnim.array.set(animWerte(e.koerper, anim, phase, tempo), i * 4);
      attr.iWinkel.array.set([winkel, s], i * 2);
      farbe(attr.iOben, i, e.oben); farbe(attr.iUnten, i, e.unten); farbe(attr.iHaut, i, e.haut);
      farbe(attr.iHaar, i, e.haar); farbe(attr.iSchuh, i, e.schuhe); farbe(attr.iTasche, i, e.tasche);
    },
    fertig(n) {
      geo.instanceCount = n;
      for (const a of Object.values(attr)) { a.needsUpdate = true; a.clearUpdateRanges?.(); }
    },
    oberteile: attr.iOben,
    dispose() { geo.dispose(); },
  };
}

/** Statische Figuren beim Stadtaufbau sammeln und am Ende in wenigen Gruppen (räumliche Kacheln) bauen. */
export class MenschenSammler {
  constructor() { this.liste = []; }
  /** Figur an (x, y, z); winkel = Spiel-Gierwinkel (Blick nach +x bei 0). o: { anim, koerper, oben, tasche, kinder, r } */
  setze(x, y, z, winkel, r, o = {}) {
    const e = erscheinung(r, o);
    const anim = o.anim ?? (r() < 0.22 ? 'reden' : r() < 0.55 ? 'gehen' : r() < 0.7 ? 'gehen_tasche' : 'stehen');
    this.liste.push([x, y, z, winkel, e, anim, r() * 8]);
  }
  get anzahl() { return this.liste.length; }
  bauen(scene, kachel = 240) {
    if (!this.liste.length) return 0;
    const gruppen = new Map();
    for (const f of this.liste) {
      const k = Math.floor(f[0] / kachel) + ':' + Math.floor(f[2] / kachel);
      if (!gruppen.has(k)) gruppen.set(k, []);
      gruppen.get(k).push(f);
    }
    let calls = 0;
    for (const liste of gruppen.values()) {
      const g = menschenGruppe(liste.length, 'menschen:stadt');
      // Gehende Figuren am Stadtaufbau „gehen auf der Stelle“ nicht: statisch heißt Standbild aus dem Gang.
      liste.forEach(([x, y, z, w, e, anim, ph], i) => g.setze(i, x, y, z, w, e, anim, Math.floor(ph), 1, anim.startsWith('gehen') ? 0 : 1));
      g.fertig(liste.length);
      const box = new THREE.Box3();
      for (const [x, y, z] of liste) box.expandByPoint(new THREE.Vector3(x, y, z));
      box.expandByScalar(3);
      g.mesh.geometry.boundingBox = box;
      g.mesh.geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
      g.mesh.frustumCulled = true; g.mesh.children[0].frustumCulled = true;
      g.mesh.userData.jahreszeitArt = 'menschen';
      scene.add(g.mesh);
      calls++;
    }
    this.liste = [];
    return calls;
  }
}

let aktiv = false;
/** Spiel schaltet die Figuren ein; Kataloge und alte Prüfbilder behalten ohne Aufruf die Klötzchen. */
export function menschenAn(an = true) { aktiv = !!an; if (aktiv) atlasTextur(); }
export const menschenAktiv = () => aktiv;
/** Figuren-Sammler, der an einem Geometrie-Sammler (basis.Sammler/KompaktSammler) hängt und mit ihm gebaut wird. */
export function menschenFuer(S) {
  if (!S._menschen) {
    const m = new MenschenSammler();
    S._menschen = m;
    (S.nachBauen ??= []).push((ziel) => { S._menschen = null; return m.bauen(ziel); });
  }
  // Gedrehte Parzelle (drehung.js): Figuren um die Parzellenmitte mitdrehen
  const d = S._drehung;
  if (d) { const m = S._menschen, e = d.M.elements;
    return { setze: (x, y, z, winkel, r, o) => m.setze(e[0] * x + e[8] * z + e[12], y, e[2] * x + e[10] * z + e[14], winkel + d.p.rot, r, o), get anzahl() { return m.anzahl; } }; }
  return S._menschen;
}

/** Zufallsstrom für Prüfungen ohne Spiel. */
export const menschenRng = (seed) => rng(seed);

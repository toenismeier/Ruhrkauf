// Pilot E51: Schaufenster mit Raum dahinter (three-fenestra, Interior Mapping), Glas trüb vor und sauber nach einer Fassadenerneuerung.
// Eine InstancedMesh je Haus (ein Draw Call). Der Raumatlas wird im Stil des Baukastens auf ein Canvas gezeichnet (keine Fremdbilder).
// Nur im Spiel aktiv (fensterPilotAn), Kataloge und Fingerabdrücke bleiben unverändert, solange nicht ausdrücklich eingeschaltet.
import { THREE, rng } from './basis.js';
import { InteriorMappingMaterial } from 'three-fenestra';

let aktiv = false;
export const fensterPilotAn = (an = true) => { aktiv = !!an; };
export const fensterPilotAktiv = () => aktiv;

let atlas = null, schmutz = null;
/** 4 × 4 Ladenräume flach gezeichnet: Rückwand mit Regalen und Ware, Boden, Decke mit Lichtband. */
function raumAtlas() {
  if (atlas) return atlas;
  const N = 4, Z = 128, c = document.createElement('canvas'); c.width = c.height = N * Z;
  const g = c.getContext('2d'), r = rng(4711);
  const WAND = ['#efe9df', '#e6e0d6', '#f4f0ea', '#e9e3d8'], BODEN = ['#d6c3a3', '#cbb796', '#e8e1d4', '#c4b8a4'];
  const WARE = ['#d65a6f', '#7d97b8', '#e9b44c', '#5f8f7a', '#2b2b2b', '#c9483e', '#9b6fb0', '#f2c6d2', '#5f7f8c', '#b5745a'];
  for (let i = 0; i < N * N; i++) {
    const x0 = (i % N) * Z, y0 = Math.floor(i / N) * Z;
    // Decke (oben), Rückwand (Mitte), Boden (unten) – der Shader nimmt die Zellmitte als Rückwand
    g.fillStyle = '#f7f5f0'; g.fillRect(x0, y0, Z, Z);
    g.fillStyle = WAND[i % 4]; g.fillRect(x0 + Z * 0.17, y0 + Z * 0.17, Z * 0.66, Z * 0.66);
    g.fillStyle = BODEN[(i * 3) % 4]; g.fillRect(x0, y0 + Z * 0.83, Z, Z * 0.17);
    g.fillStyle = '#fffbe8'; g.fillRect(x0 + Z * 0.3, y0 + Z * 0.05, Z * 0.4, Z * 0.06);
    // Regale mit Ware an der Rückwand
    for (let k = 0; k < 3; k++) {
      const y = y0 + Z * (0.3 + k * 0.17);
      g.fillStyle = '#b98d61'; g.fillRect(x0 + Z * 0.2, y + Z * 0.11, Z * 0.6, Z * 0.02);
      for (let u = 0; u < 7; u++) { g.fillStyle = WARE[Math.floor(r() * WARE.length)]; g.fillRect(x0 + Z * (0.22 + u * 0.083), y, Z * 0.06, Z * 0.11); }
    }
    // Kleiderständer vorn im Raum
    if (i % 3 === 0) { g.fillStyle = '#9aa3aa'; g.fillRect(x0 + Z * 0.1, y0 + Z * 0.62, Z * 0.25, Z * 0.015); for (let u = 0; u < 5; u++) { g.fillStyle = WARE[(i + u) % WARE.length]; g.fillRect(x0 + Z * (0.11 + u * 0.048), y0 + Z * 0.635, Z * 0.035, Z * 0.15); } }
  }
  atlas = new THREE.CanvasTexture(c); atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.wrapS = atlas.wrapT = THREE.ClampToEdgeWrapping;
  return atlas;
}
/** Grauwert-Rauschen für Schmutz und Schlieren auf dem Glas. */
function schmutzTextur() {
  if (schmutz) return schmutz;
  const Z = 128, c = document.createElement('canvas'); c.width = c.height = Z;
  const g = c.getContext('2d'), r = rng(815), img = g.createImageData(Z, Z);
  for (let i = 0; i < Z * Z; i++) { const v = 110 + r() * 60 + (i % Z < 20 || i / Z > Z - 25 ? 60 : 0); img.data.set([v, v, v, 255], i * 4); }
  g.putImageData(img, 0, 0);
  schmutz = new THREE.CanvasTexture(c); schmutz.wrapS = schmutz.wrapT = THREE.RepeatWrapping;
  return schmutz;
}

/** Schaufenster eines Hauses: fenster = [{ seite: '+z'|'+x', a, b, y0, y1, t }] in Fassadenkoordinaten, k = { x, z, w, d } Baukörper.
 *  sauber: Glas nach Fassadenerneuerung. Gibt die InstancedMesh zurück (oder null). */
export function schaufensterInnen(scene, k, fenster, { sauber = true, seed = 1 } = {}) {
  // Lange Fensterbänder in Einzelfenster von rund 2,5 m teilen, sonst zieht sich ein Raum über das ganze Band.
  const liste = (fenster ?? []).filter((f) => f.b - f.a > 0.8 && f.y1 - f.y0 > 0.8).flatMap((f) => {
    const n = Math.max(1, Math.round((f.b - f.a) / 2.5)), w = (f.b - f.a) / n;
    return Array.from({ length: n }, (_, i) => ({ ...f, a: f.a + i * w, b: f.a + (i + 1) * w }));
  });
  if (!scene || !liste.length) return null;
  const mw = liste.reduce((a, f) => a + (f.b - f.a), 0) / liste.length, mh = liste.reduce((a, f) => a + (f.y1 - f.y0), 0) / liste.length;
  const mat = new InteriorMappingMaterial({
    backAtlas: raumAtlas(), backAtlasCols: 4, backAtlasRows: 4, depth: 1.4, backScale: 0.62,
    planeSize: new THREE.Vector2(mw, mh), instanced: true, roughness: sauber ? 0.12 : 0.6, metalness: 0,
    interiorEmissive: sauber ? new THREE.Color(0.95, 0.9, 0.82) : new THREE.Color(0.38, 0.37, 0.36),
    glassDirtMap: schmutzTextur(), glassDirtStrength: sauber ? 0.1 : 1.0, glassSmudgeStrength: sauber ? 0 : 0.22,
    glassFresnelStrength: sauber ? 0.35 : 0.1,
  });
  const geo = new THREE.PlaneGeometry(1, 1);
  const n = liste.length, ids = new Float32Array(n * 3), lods = new Float32Array(n).fill(1), fades = new Float32Array(n).fill(1);
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const r = rng(seed);
  liste.forEach((f, i) => {
    const u = (f.a + f.b) / 2, y = (f.y0 + f.y1) / 2, t = (f.t ?? 0.5) + 0.03;
    if (f.seite === '+z') { p.set(k.x + u, y, k.z + k.d + t); q.identity(); }
    else { p.set(k.x + k.w + t, y, k.z + u); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); }
    s.set(f.b - f.a - 0.12, f.y1 - f.y0 - 0.08, 1);
    mesh.setMatrixAt(i, m.compose(p, q, s));
    ids.set([Math.floor(r() * 1000), i, seed % 97], i * 3);
  });
  geo.setAttribute('instanceWindowId', new THREE.InstancedBufferAttribute(ids, 3));
  geo.setAttribute('instanceLod', new THREE.InstancedBufferAttribute(lods, 1));
  geo.setAttribute('instanceFade', new THREE.InstancedBufferAttribute(fades, 1));
  mesh.userData.fensterPilot = true;
  mesh.frustumCulled = false;
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
}

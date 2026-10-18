// Probe im Stil von Coffee Inc 2: isometrische Stadt mit Blockrandbebauung und aufgeschnittenes Haus.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import haus from '../haus.json';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Material: flach schattiert, linke Seite hell, rechte dunkler ----------
const cache = new Map();
function mat(c) {
  const k = typeof c === 'string' ? c : c.getHexString();
  if (!cache.has(k)) cache.set(k, new THREE.MeshLambertMaterial({ color: c }));
  return cache.get(k);
}

function szene(canvas, w, h, hintergrund) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(w, h, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
  const s = new THREE.Scene();
  s.background = new THREE.Color(hintergrund);
  s.add(new THREE.HemisphereLight(0xffffff, 0xa59f93, 1.7));
  const sonne = new THREE.DirectionalLight(0xfffaf0, 2.1);
  sonne.position.set(-40, 120, 90); // trifft die linke Bildseite (+z) voll, die rechte (+x) kaum
  sonne.castShadow = true;
  sonne.shadow.mapSize.set(4096, 4096);
  Object.assign(sonne.shadow.camera, { left: -320, right: 320, top: 320, bottom: -320, near: 1, far: 700 });
  sonne.shadow.bias = -0.0005;
  sonne.shadow.normalBias = 0.4;
  s.add(sonne);
  return { r, s, sonne };
}

function kamera(w, h, halb, ziel) {
  const a = w / h;
  const c = new THREE.OrthographicCamera(-halb * a, halb * a, halb, -halb, -2000, 2000);
  const el = (30 * Math.PI) / 180;
  const d = 600;
  c.position.set(ziel.x + d * Math.cos(el) * Math.SQRT1_2, ziel.y + d * Math.sin(el), ziel.z + d * Math.cos(el) * Math.SQRT1_2);
  c.lookAt(ziel);
  return c;
}

// Sammelt Geometrien je Farbe und führt sie zusammen (wenige Draw Calls, viel Detail)
class Sammler {
  constructor() { this.teile = new Map(); }
  box(w, h, d, x, y, z, farbe, ry = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    this.add(g, farbe);
  }
  add(g, farbe) {
    const k = typeof farbe === 'string' ? farbe : '#' + farbe.getHexString();
    if (!this.teile.has(k)) this.teile.set(k, []);
    this.teile.get(k).push(g.index ? g.toNonIndexed() : g);
  }
  bauen(scene, schatten = true) {
    for (const [k, gs] of this.teile) {
      const m = new THREE.Mesh(mergeGeometries(gs), mat(k));
      m.castShadow = schatten; m.receiveShadow = true;
      scene.add(m);
    }
  }
}

function prisma(laenge, tiefe, hoehe, oben) {
  // Mansarddach: Trapez-Querschnitt entlang x
  const s = new THREE.Shape();
  s.moveTo(-tiefe / 2, 0); s.lineTo(tiefe / 2, 0); s.lineTo(oben / 2, hoehe); s.lineTo(-oben / 2, hoehe); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: laenge, bevelEnabled: false });
  g.translate(0, 0, -laenge / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

const FASSADEN = ['#f3eee4', '#ece5d7', '#e4dccd', '#efe6d6', '#dde1e4', '#e8dfcf', '#f1eadc', '#d9d1c4', '#e3d3bd', '#d3d9de', '#c99a7e'];
const DAECHER = ['#8b939b', '#9aa1a8', '#7c848c', '#a8a097', '#b4aa9c'];
const MARKISEN = ['#c9483e', '#2f6f8f', '#3f7d56', '#d39a2b', '#6b4f8f', '#8c3b3b'];

/** Ein Altbau mit Fensterraster auf den beiden sichtbaren Seiten (+x und +z). */
function altbau(S, x0, z0, w, d, geschosse, r, ausrichtung) {
  const gh = 3.4;
  const eg = 4.2;
  const H = eg + geschosse * gh;
  const fassade = FASSADEN[Math.floor(r() * FASSADEN.length)];
  const hell = new THREE.Color(fassade).offsetHSL(0, 0, 0.05);
  const cx = x0 + w / 2, cz = z0 + d / 2;
  S.box(w, H, d, cx, H / 2, cz, fassade);
  // Gesimse
  S.box(w + 0.5, 0.45, d + 0.5, cx, H - 0.1, cz, '#' + hell.getHexString());
  S.box(w + 0.25, 0.3, d + 0.25, cx, eg, cz, '#' + hell.getHexString());
  // Dach
  if (r() < 0.45) {
    const g = prisma(w - 0.2, d - 0.2, 2.6, d * 0.45);
    if (ausrichtung === 'z') g.rotateY(Math.PI / 2);
    g.translate(cx, H + 0.15, cz);
    S.add(g, DAECHER[Math.floor(r() * DAECHER.length)]);
  } else {
    S.box(w - 0.6, 0.5, d - 0.6, cx, H + 0.3, cz, '#b9b4ab');
    if (r() < 0.7) S.box(1.6 + r() * 2, 1.4, 1.6 + r() * 2, x0 + 2 + r() * (w - 4), H + 1.0, z0 + 2 + r() * (d - 4), '#a7a29a');
  }
  // Fenster auf +z (linke Bildseite) und +x (rechte Bildseite)
  const fenster = '#55636f';
  const raster = 3.1;
  for (let k = 0; k < geschosse; k++) {
    const y = eg + k * gh + gh * 0.55;
    for (let u = x0 + raster / 2 + 0.4; u < x0 + w - 0.8; u += raster) {
      S.box(1.35, 1.9, 0.12, u, y, z0 + d + 0.02, fenster);
      S.box(1.6, 0.16, 0.25, u, y - 1.05, z0 + d + 0.05, '#' + hell.getHexString());
    }
    for (let u = z0 + raster / 2 + 0.4; u < z0 + d - 0.8; u += raster) {
      S.box(0.12, 1.9, 1.35, x0 + w + 0.02, y, u, fenster);
      S.box(0.25, 0.16, 1.6, x0 + w + 0.05, y - 1.05, u, '#' + hell.getHexString());
    }
  }
  // Ladenzone im EG mit Markisen
  const laden = '#3f4a53';
  S.box(w - 1.2, 2.8, 0.12, cx, 1.7, z0 + d + 0.03, laden);
  S.box(0.12, 2.8, d - 1.2, x0 + w + 0.03, 1.7, cz, laden);
  if (r() < 0.5) {
    const m = MARKISEN[Math.floor(r() * MARKISEN.length)];
    const g = new THREE.BoxGeometry(w - 1.5, 0.15, 1.6); g.rotateX(0.35); g.translate(cx, 3.4, z0 + d + 0.7); S.add(g, m);
  }
  return H;
}

/** Ein Block mit Blockrandbebauung: Parzellen rundherum, Hof innen. */
function block(S, x0, z0, bw, bd, r, ausnahme) {
  const tiefe = 13;
  // Gehweg-Sockel
  S.box(bw + 6, 0.3, bd + 6, x0 + bw / 2, 0.15, z0 + bd / 2, '#d8d4cb');
  // Hof
  S.box(bw - 2 * tiefe, 0.35, bd - 2 * tiefe, x0 + bw / 2, 0.2, z0 + bd / 2, '#9cc58f');
  if (ausnahme) return;
  const geschosse = () => 3 + Math.floor(r() * 3);
  // Seiten entlang x (vorne +z und hinten -z), über die volle Länge
  for (const zSeite of [z0, z0 + bd - tiefe]) {
    let x = x0;
    while (x < x0 + bw - 6) {
      const w = Math.min(x0 + bw - x, 12 + r() * 12);
      altbau(S, x, zSeite, w, tiefe, geschosse(), r, 'x');
      x += w;
    }
  }
  // Seiten entlang z (links -x und rechts +x), zwischen den Ecken
  for (const xSeite of [x0, x0 + bw - tiefe]) {
    let z = z0 + tiefe;
    while (z < z0 + bd - tiefe - 6) {
      const d = Math.min(z0 + bd - tiefe - z, 12 + r() * 12);
      altbau(S, xSeite, z, tiefe, d, geschosse(), r, 'z');
      z += d;
    }
  }
  // Hofbäume
  for (let i = 0; i < 3; i++) baum(S, x0 + tiefe + 3 + r() * (bw - 2 * tiefe - 6), z0 + tiefe + 3 + r() * (bd - 2 * tiefe - 6), r);
}

function baum(S, x, z, r, s = 1) {
  S.box(0.5 * s, 2.2 * s, 0.5 * s, x, 1.3 * s, z, '#7a5d43');
  const g = new THREE.IcosahedronGeometry(2.1 * s * (0.85 + r() * 0.3), 0);
  g.translate(x, 3.6 * s, z);
  S.add(g, ['#6fa860', '#5f9a56', '#7cb369'][Math.floor(r() * 3)]);
}

function auto(S, x, z, r, quer) {
  const farbe = ['#d04a3f', '#2f63b5', '#f1f1ee', '#2a2d31', '#e0b23c', '#8c9aa6', '#5b8f5a'][Math.floor(r() * 7)];
  const ry = quer ? Math.PI / 2 : 0;
  S.box(4.4, 1.0, 1.9, x, 0.85, z, farbe, ry);
  S.box(2.3, 0.75, 1.7, x + (quer ? 0 : -0.2), 1.7, z + (quer ? -0.2 : 0), '#9bb7c7', ry);
}

function textTex(text, farbe, groesse = 120, fett = true, hg = null, breite = null) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `${fett ? 'bold ' : ''}${groesse}px "DejaVu Sans", Arial`;
  ctx.font = font;
  const w = breite ?? Math.ceil(ctx.measureText(text).width + groesse * 0.8);
  c.width = w; c.height = Math.ceil(groesse * 1.5);
  const k = c.getContext('2d');
  if (hg) { k.fillStyle = hg; k.fillRect(0, 0, c.width, c.height); }
  k.font = font; k.fillStyle = farbe; k.textAlign = 'center'; k.textBaseline = 'middle';
  k.fillText(text, c.width / 2, c.height / 2 + groesse * 0.05);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return { t, w: c.width, h: c.height };
}

/** Kartenmarker wie in Coffee Inc: Pin mit Logo, schwebt über dem Haus. */
function marker(scene, x, y, z, farbe, buchstabe, groesse = 9) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 320;
  const k = c.getContext('2d');
  k.fillStyle = 'rgba(0,0,0,0.25)';
  k.beginPath(); k.ellipse(128, 306, 40, 10, 0, 0, Math.PI * 2); k.fill();
  k.fillStyle = farbe;
  k.beginPath(); k.moveTo(128, 300); k.lineTo(70, 190); k.arc(128, 128, 100, Math.PI * 0.82, Math.PI * 0.18); k.closePath(); k.fill();
  k.fillStyle = '#ffffff';
  k.beginPath(); k.arc(128, 128, 74, 0, Math.PI * 2); k.fill();
  k.fillStyle = farbe; k.font = 'bold 110px "DejaVu Sans", Arial'; k.textAlign = 'center'; k.textBaseline = 'middle';
  k.fillText(buchstabe, 128, 134);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  sp.center.set(0.5, 0);
  sp.scale.set(groesse * 0.8, groesse, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 20;
  scene.add(sp);
}

// ---------- Das Warenhaus selbst (Kachelfassade der 70er) ----------
const GF = haus.grundflaecheQm;
const WB = Math.round(Math.sqrt(GF * 1.5) / 5) * 5;
const WT = Math.round(GF / WB / 5) * 5;
const OBEN = haus.etagen.filter((e) => e >= 0).length;

function warenhaus(S, scene, cx, cz) {
  const eg = 5.5, gh = 4.5;
  const H = eg + (OBEN - 1) * gh + 1;
  const x0 = cx - WB / 2, z0 = cz - WT / 2;
  // EG: Glas mit Pfeilern
  S.box(WB - 0.8, eg, WT - 0.8, cx, eg / 2 + 0.3, cz, '#3e505c');
  for (let x = x0; x <= x0 + WB + 0.1; x += 5) S.box(0.8, eg, 0.8, x, eg / 2 + 0.3, z0 + WT - 0.4, '#e3dccd');
  for (let z = z0; z <= z0 + WT + 0.1; z += 5) S.box(0.8, eg, 0.8, x0 + WB - 0.4, eg / 2 + 0.3, z, '#e3dccd');
  // Vordach
  S.box(WB + 4, 0.7, 3.4, cx + 2, 4.9, z0 + WT + 1.5, '#f4f1ea');
  S.box(3.4, 0.7, WT + 2, x0 + WB + 1.5, 4.9, cz, '#f4f1ea');
  // Korpus und Kachelrelief
  const fassH = H - eg;
  S.box(WB, fassH, WT, cx, eg + 0.3 + fassH / 2, cz, '#efe4c9');
  const k = 1.6;
  for (let y = eg + 0.3 + k / 2 + 0.2; y < H - k / 2; y += k) {
    for (let x = x0 + k / 2; x < x0 + WB - k / 4; x += k) S.box(k * 0.82, k * 0.82, 0.3, x, y, z0 + WT + 0.1, '#e1d1aa');
    for (let z = z0 + k / 2; z < z0 + WT - k / 4; z += k) S.box(0.3, k * 0.82, k * 0.82, x0 + WB + 0.1, y, z, '#d9c79d');
  }
  // Fensterband oben, Attika, Technik
  S.box(WB * 0.5, 2.2, 0.35, cx - WB * 0.15, H - 2.0, z0 + WT + 0.2, '#4b5d6a');
  S.box(WB + 0.8, 1.0, 0.8, cx, H + 0.8, z0 + WT, '#d6cbb3');
  S.box(0.8, 1.0, WT + 0.8, x0 + WB, H + 0.8, cz, '#d6cbb3');
  S.box(WB, 0.4, WT, cx, H + 0.4, cz, '#bdb6a9');
  S.box(14, 4, 10, cx - WB / 4, H + 2.4, cz - WT / 6, '#b2ab9e');
  S.box(8, 3, 8, cx + WB / 5, H + 1.9, cz - WT / 4, '#a9a294');
  // Schaufensterauslagen
  const r = rng(3);
  for (let x = x0 + 2.5; x < x0 + WB - 2; x += 5) S.box(2.6, 1.8, 1, x, 1.4, z0 + WT - 1.3, ['#e9a3b8', '#c9a26b', '#7d97b8', '#f2c14e', '#ffffff'][Math.floor(r() * 5)]);
  // Logo
  const logo = textTex('HARTWIG', '#d23c32', 160);
  const lm = new THREE.MeshBasicMaterial({ map: logo.t, transparent: true });
  const breite = 30;
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(breite, (breite * logo.h) / logo.w), lm);
  p1.position.set(cx - WB * 0.1, H - 7, z0 + WT + 0.45); scene.add(p1);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(breite * 0.8, (breite * 0.8 * logo.h) / logo.w), lm);
  p2.rotation.y = Math.PI / 2; p2.position.set(x0 + WB + 0.45, H - 7, cz); scene.add(p2);
  return H;
}

// ---------- Stadtansicht ----------
function stadt(canvas, w, h) {
  const { r: renderer, s: scene } = szene(canvas, w, h, '#4fb6c2');
  const S = new THREE.Group();
  const sam = new Sammler();
  const r = rng(11);
  const STRASSE = 18;
  const nx = 7, nz = 8;
  const bws = [], bds = [];
  for (let i = 0; i < nx; i++) bws.push(64 + Math.floor(r() * 4) * 8);
  for (let j = 0; j < nz; j++) bds.push(56 + Math.floor(r() * 4) * 8);
  const gesamtX = bws.reduce((a, b) => a + b, 0) + STRASSE * (nx + 1);
  const gesamtZ = bds.reduce((a, b) => a + b, 0) + STRASSE * (nz + 1);
  const ox = -gesamtX / 2, oz = -gesamtZ / 2;
  // Asphalt
  sam.box(gesamtX, 0.2, gesamtZ, 0, 0, 0, '#8d939a');
  // Wasser: ein Kanal quer durch die Stadt (Spalte 5 ist Wasser)
  const wasserI = 5;
  const kaufI = 3, kaufJ = 4, parkI = 1, parkJ = 2;
  let x = ox + STRASSE;
  const blockPos = [];
  for (let i = 0; i < nx; i++) {
    let z = oz + STRASSE;
    for (let j = 0; j < nz; j++) {
      blockPos.push({ i, j, x, z, bw: bws[i], bd: bds[j] });
      z += bds[j] + STRASSE;
    }
    x += bws[i] + STRASSE;
  }
  for (const b of blockPos) {
    if (b.i === wasserI) {
      sam.box(b.bw + STRASSE - 2, 0.25, b.bd + STRASSE + 2, b.x + b.bw / 2, 0.05, b.z + b.bd / 2, '#45b3c1');
      continue;
    }
    if (b.i === kaufI && b.j === kaufJ) {
      sam.box(b.bw + 6, 0.3, b.bd + 6, b.x + b.bw / 2, 0.15, b.z + b.bd / 2, '#ddd8ce');
      // Rest des Blocks mit Altbauten an der hinteren Kante
      const H = warenhaus(sam, scene, b.x + b.bw - WB / 2 - 2, b.z + b.bd - WT / 2 - 2);
      marker(scene, b.x + b.bw - WB / 2, H + 6, b.z + b.bd - WT / 2, '#d23c32', 'H', 14);
      for (let xx = b.x; xx < b.x + b.bw - WB - 4; xx += 14) altbau(sam, xx, b.z, Math.min(14, b.x + b.bw - WB - 4 - xx), b.bd, 3 + Math.floor(r() * 2), r, 'z');
      continue;
    }
    if (b.i === parkI && b.j === parkJ) {
      sam.box(b.bw + 6, 0.3, b.bd + 6, b.x + b.bw / 2, 0.15, b.z + b.bd / 2, '#d8d4cb');
      sam.box(b.bw, 0.4, b.bd, b.x + b.bw / 2, 0.25, b.z + b.bd / 2, '#94c486');
      sam.box(b.bw * 0.9, 0.45, 3, b.x + b.bw / 2, 0.3, b.z + b.bd / 2, '#e6dcc4');
      sam.box(3, 0.45, b.bd * 0.9, b.x + b.bw / 2, 0.3, b.z + b.bd / 2, '#e6dcc4');
      for (let k = 0; k < 26; k++) baum(sam, b.x + 3 + r() * (b.bw - 6), b.z + 3 + r() * (b.bd - 6), r, 1.2);
      // Brunnen
      sam.add(new THREE.CylinderGeometry(4, 4, 0.8, 16).translate(b.x + b.bw / 2, 0.6, b.z + b.bd / 2), '#cfc7b6');
      sam.add(new THREE.CylinderGeometry(3.2, 3.2, 0.85, 16).translate(b.x + b.bw / 2, 0.65, b.z + b.bd / 2), '#5cc0cc');
      continue;
    }
    block(sam, b.x, b.z, b.bw, b.bd, r, false);
  }
  // Kirche mit Doppelturm als Landmarke in Block (2,6)
  const kb = blockPos.find((b) => b.i === 2 && b.j === 6);
  if (kb) {
    const kx = kb.x + kb.bw / 2, kz = kb.z + kb.bd / 2;
    sam.box(22, 18, 44, kx, 9, kz, '#b98a6e');
    const dach = prisma(44, 22, 10, 1); dach.rotateY(Math.PI / 2); dach.translate(kx, 18, kz); sam.add(dach, '#7c6a5c');
    for (const dx of [-6, 6]) {
      sam.box(9, 46, 9, kx + dx, 23, kz + 26, '#b98a6e');
      sam.add(new THREE.SphereGeometry(5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(kx + dx, 46, kz + 26), '#6f9a7d');
      sam.add(new THREE.ConeGeometry(1, 5, 8).translate(kx + dx, 52, kz + 26), '#6f9a7d');
    }
  }
  // Straßen: Mittellinien, Zebrastreifen, Bäume, Autos
  let cx = ox;
  const linienX = [], linienZ = [];
  for (let i = 0; i <= nx; i++) { linienX.push(cx + STRASSE / 2); if (i < nx) cx += STRASSE + bws[i]; }
  let cz = oz;
  for (let j = 0; j <= nz; j++) { linienZ.push(cz + STRASSE / 2); if (j < nz) cz += STRASSE + bds[j]; }
  for (const lx of linienX) for (let z = oz; z < oz + gesamtZ; z += 7) sam.box(0.35, 0.05, 3, lx, 0.12, z, '#f2f1ec');
  for (const lz of linienZ) for (let xx = ox; xx < ox + gesamtX; xx += 7) sam.box(3, 0.05, 0.35, xx, 0.12, lz, '#f2f1ec');
  for (const lx of linienX) for (const lz of linienZ) {
    for (let k = -3; k <= 3; k++) sam.box(1.0, 0.06, 4, lx + k * 1.8, 0.13, lz + STRASSE / 2 + 2.5, '#f6f5f0');
    for (let k = -3; k <= 3; k++) sam.box(4, 0.06, 1.0, lx + STRASSE / 2 + 2.5, 0.13, lz + k * 1.8, '#f6f5f0');
  }
  for (const lz of linienZ) for (let xx = ox + 10; xx < ox + gesamtX - 10; xx += 13) if (r() < 0.55) baum(sam, xx, lz + STRASSE / 2 - 1.6, r, 0.9);
  for (let k = 0; k < 70; k++) {
    if (r() < 0.5) auto(sam, linienX[Math.floor(r() * linienX.length)] + (r() < 0.5 ? -2.5 : 2.5), oz + r() * gesamtZ, r, true);
    else auto(sam, ox + r() * gesamtX, linienZ[Math.floor(r() * linienZ.length)] + (r() < 0.5 ? -2.5 : 2.5), r, false);
  }
  // Brücken über den Kanal
  const wb = blockPos.find((b) => b.i === wasserI);
  for (const lz of linienZ) sam.box(bws[wasserI] + STRASSE + 4, 1.2, STRASSE - 2, wb.x + bws[wasserI] / 2, 0.6, lz, '#b9b4aa');
  sam.bauen(scene);
  void S;
  // Wettbewerber-Marker und Leerstands-Schild
  const kon = blockPos.find((b) => b.i === 4 && b.j === 2);
  marker(scene, kon.x + 10, 26, kon.z + kon.bd - 6, '#2f6f8f', 'K', 10);
  const leer = blockPos.find((b) => b.i === 2 && b.j === 3);
  marker(scene, leer.x + leer.bw - 6, 24, leer.z + 8, '#6b7a86', '€', 9);
  const ziel = new THREE.Vector3(blockPos.find((b) => b.i === kaufI && b.j === kaufJ).x + 20, 0, blockPos.find((b) => b.i === kaufI && b.j === kaufJ).z + 30);
  renderer.render(scene, kamera(w, h, 150, ziel));
}

// ---------- Hausansicht: aufgeschnittene Ecke des Erdgeschosses ----------
function figur(S, x, z, r, personal = false) {
  const haut = ['#f1c9a5', '#d9a77f', '#a8714f', '#7a4f36'][Math.floor(r() * 4)];
  const oben = personal ? '#1f2328' : ['#d04a3f', '#2f63b5', '#e8e4dc', '#e0b23c', '#5b8f5a', '#8d5fbf', '#ef8b4c', '#2b2b2b'][Math.floor(r() * 8)];
  const hose = personal ? '#1f2328' : ['#2b3a55', '#3a3a3a', '#6b5a48', '#20304a'][Math.floor(r() * 4)];
  const haar = ['#2b211b', '#5a3b22', '#c9a35a', '#1a1a1a', '#8a8a8a'][Math.floor(r() * 5)];
  const ry = r() * Math.PI * 2;
  const teil = (g, c) => { g.rotateY(ry); g.translate(x, 0, z); S.add(g, c); };
  teil(new THREE.BoxGeometry(0.22, 0.85, 0.22).translate(-0.13, 0.43, 0), hose);
  teil(new THREE.BoxGeometry(0.22, 0.85, 0.22).translate(0.13, 0.43, 0), hose);
  teil(new THREE.BoxGeometry(0.56, 0.7, 0.3).translate(0, 1.2, 0), oben);
  teil(new THREE.BoxGeometry(0.15, 0.62, 0.17).translate(-0.37, 1.18, 0), oben);
  teil(new THREE.BoxGeometry(0.15, 0.62, 0.17).translate(0.37, 1.18, 0), oben);
  teil(new THREE.BoxGeometry(0.3, 0.32, 0.3).translate(0, 1.75, 0), haut);
  teil(new THREE.BoxGeometry(0.33, 0.12, 0.33).translate(0, 1.95, -0.02), haar);
  if (personal) teil(new THREE.BoxGeometry(0.3, 0.32, 0.31).translate(0, 1.25, 0.01), '#f4f4f2');
}

function innen(canvas, w, h) {
  const { r: renderer, s: scene, sonne } = szene(canvas, w, h, '#26313a');
  sonne.position.set(-30, 90, 60);
  Object.assign(sonne.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60 });
  const sam = new Sammler();
  const r = rng(7);
  const B = 34, T = 26; // Ausschnitt der Ecke
  const x0 = -B / 2, z0 = -T / 2;
  const WH = 5.0;
  // Straße und Gehweg vor dem Haus
  sam.box(B + 40, 0.2, T + 40, 6, -0.1, 6, '#8d939a');
  sam.box(B + 9, 0.3, T + 9, 2.5, 0.05, 2.5, '#d8d4cb');
  for (let k = -12; k < 30; k += 7) sam.box(3, 0.05, 0.3, k, 0.06, T / 2 + 12, '#f2f1ec');
  for (let k = -12; k < 30; k += 7) sam.box(0.3, 0.05, 3, B / 2 + 12, 0.06, k, '#f2f1ec');
  auto(sam, 6, T / 2 + 9.5, r, false);
  auto(sam, B / 2 + 9.5, -6, r, true);
  baum(sam, -10, T / 2 + 6.5, r, 1);
  baum(sam, B / 2 + 6.5, 9, r, 1);
  // Boden: Beauty in Marmor, Accessoires in Holz, Gang in Terrazzo
  sam.box(B, 0.3, T, 0, 0.25, 0, '#ece8e1');
  const beautyX = 4; // Grenze
  for (let x = x0; x < beautyX - 0.1; x += 2) for (let z = z0 + 6; z < z0 + T; z += 2) sam.box(1.96, 0.04, 1.96, x + 1, 0.42, z + 1, ((x + z) / 2) % 2 === 0 ? '#f6f2ec' : '#efe9e1');
  for (let x = beautyX + 3; x < x0 + B; x += 0.9) sam.box(0.86, 0.04, T - 1, x + 0.45, 0.42, 0.5, x % 1.8 < 0.9 ? '#c79f74' : '#bf956a');
  // Rückwände (aufgeschnitten): Putz mit Pilastern und Markenwänden
  sam.box(B + 0.6, WH, 0.6, 0, WH / 2 + 0.3, z0 - 0.3, '#e7ddd0');
  sam.box(0.6, WH, T + 0.6, x0 - 0.3, WH / 2 + 0.3, 0, '#efe6da');
  for (let x = x0 + 4; x < x0 + B; x += 6) sam.box(0.8, WH, 0.3, x, WH / 2 + 0.3, z0 + 0.15, '#d9cdbd');
  for (let z = z0 + 4; z < z0 + T; z += 6) sam.box(0.3, WH, 0.8, x0 + 0.15, WH / 2 + 0.3, z, '#e2d7c8');
  // Markenwände Beauty an der linken Rückwand
  const marken = ['#e9a3b8', '#1f1f1f', '#d8b25a', '#f4f0ea', '#b5162b'];
  for (let i = 0; i < 4; i++) {
    const z = z0 + 6 + i * 5;
    sam.box(0.4, 3.2, 4.2, x0 + 0.6, 2.0, z + 2.5, marken[i % marken.length]);
    for (let reihe = 0; reihe < 3; reihe++) for (let k = 0; k < 6; k++) sam.box(0.3, 0.32, 0.22, x0 + 1.0, 1.0 + reihe * 0.85, z + 0.9 + k * 0.62, ['#ffffff', '#f2c6d2', '#c9a26b', '#7d97b8', '#2b2b2b'][Math.floor(r() * 5)]);
  }
  // Taschenregal an der hinteren Rückwand
  for (let x = beautyX + 4; x < x0 + B - 2; x += 5) {
    sam.box(4.4, 3.2, 0.6, x + 2.2, 1.9, z0 + 0.6, '#b98d61');
    for (let reihe = 0; reihe < 3; reihe++) for (let k = 0; k < 4; k++) sam.box(0.8, 0.55, 0.35, x + 0.6 + k * 1.05, 0.95 + reihe * 0.95, z0 + 0.95, ['#5a3b22', '#2b2b2b', '#c9483e', '#e8dcc6', '#2f6f8f'][Math.floor(r() * 5)]);
  }
  // Beauty-Tresen: U-Form, weiß mit Glas
  const tresen = (cx, cz) => {
    for (const [dx, dz, ww, dd] of [[0, -1.6, 4.2, 0.9], [-1.65, 0, 0.9, 3.3], [1.65, 0, 0.9, 3.3]]) {
      sam.box(ww, 1.0, dd, cx + dx, 0.95, cz + dz, '#fbfaf7');
      sam.box(ww - 0.1, 0.06, dd - 0.1, cx + dx, 1.48, cz + dz, '#cfe6ee');
      for (let k = 0; k < 4; k++) sam.box(0.18, 0.28, 0.18, cx + dx + (ww > 1 ? -1.4 + k * 0.9 : 0), 1.65, cz + dz + (ww > 1 ? 0 : -1.2 + k * 0.8), ['#f2c6d2', '#d8b25a', '#ffffff', '#b5162b'][k]);
    }
    figur(sam, cx, cz - 0.3, r, true);
  };
  tresen(x0 + 7, z0 + 10);
  tresen(x0 + 7, z0 + 19);
  tresen(x0 + 15, z0 + 14);
  // Schuhtische und Poufs
  for (const [cx, cz] of [[beautyX + 7, z0 + 7], [beautyX + 13, z0 + 7], [beautyX + 7, z0 + 14], [beautyX + 13, z0 + 14], [beautyX + 7, z0 + 21], [beautyX + 19, z0 + 18]]) {
    sam.box(3.0, 0.8, 1.4, cx, 0.8, cz, '#f3efe8');
    sam.box(2.8, 0.05, 1.2, cx, 1.22, cz, '#d9cfc2');
    for (let k = 0; k < 4; k++) {
      const g = new THREE.BoxGeometry(0.55, 0.22, 0.24); g.rotateY(0.3); g.translate(cx - 1.0 + k * 0.65, 1.36, cz + (k % 2 ? 0.25 : -0.25));
      sam.add(g, ['#2b2b2b', '#8b5a3c', '#e8e4dc', '#c9483e'][k]);
    }
  }
  for (const [cx, cz] of [[beautyX + 10, z0 + 10.5], [beautyX + 10, z0 + 17.5], [beautyX + 16, z0 + 10.5]]) sam.add(new THREE.CylinderGeometry(0.45, 0.45, 0.5, 12).translate(cx, 0.65, cz), '#7d8f9c');
  // Spiegelstützen
  for (const [cx, cz] of [[beautyX + 1.5, z0 + 10.5], [beautyX + 1.5, z0 + 20.5], [beautyX + 17, z0 + 4]]) sam.box(0.9, WH, 0.9, cx, WH / 2 + 0.3, cz, '#c9d7dd');
  // Rolltreppen
  const rx = beautyX + 20, rz = z0 + 11;
  for (const dx of [0, 2.6]) {
    const g = new THREE.BoxGeometry(1.8, 0.6, 11); g.rotateX(-0.38); g.translate(rx + dx, 2.4, rz); sam.add(g, '#8c959b');
    for (const s of [-1.0, 1.0]) { const b = new THREE.BoxGeometry(0.15, 1.0, 11); b.rotateX(-0.38); b.translate(rx + dx + s, 3.1, rz); sam.add(b, '#d0e6ee'); }
  }
  // Kasse
  sam.box(4.5, 1.05, 1.2, beautyX + 16, 0.95, z0 + 22, '#3f4a53');
  sam.box(0.6, 0.45, 0.4, beautyX + 15, 1.7, z0 + 22, '#1e2328');
  figur(sam, beautyX + 16, z0 + 21.2, r, true);
  // Schaufensterfront vorne (niedrig, damit der Blick frei bleibt)
  sam.box(B, 0.6, 0.4, 0, 0.6, T / 2, '#3f4a53');
  sam.box(0.4, 0.6, T, B / 2, 0.6, 0, '#3f4a53');
  for (let x = x0; x <= x0 + B + 0.1; x += 5) sam.box(0.5, 1.4, 0.5, x, 0.95, T / 2, '#e3dccd');
  // Kundschaft
  for (let k = 0; k < 26; k++) figur(sam, x0 + 3 + r() * (B - 6), z0 + 3 + r() * (T - 6), r);
  for (let k = 0; k < 7; k++) figur(sam, x0 + r() * B, T / 2 + 2 + r() * 2.5, r);
  sam.bauen(scene);
  // Abteilungsschilder
  for (const [text, x, z] of [['BEAUTY', x0 + 10, z0 + 3], ['SCHUHE & ACCESSOIRES', beautyX + 11, z0 + 3]]) {
    const t = textTex(text, '#ffffff', 90, true, '#1f2a33');
    const m = new THREE.Mesh(new THREE.PlaneGeometry(text.length * 0.55 + 1.5, 1.4), new THREE.MeshBasicMaterial({ map: t.t }));
    m.position.set(x, WH + 0.2, z);
    scene.add(m);
  }
  renderer.render(scene, kamera(w, h, 15.5, new THREE.Vector3(2.5, 1.5, -1)));
}

const W = 780;
stadt(document.getElementById('stadt'), W, 1688);
innen(document.getElementById('innen'), W, 760);
window.fertig = true;

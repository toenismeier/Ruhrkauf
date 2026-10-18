import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import haus from '../haus.json';

// ---------- Hilfen ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedVon = (id) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

function rauschen(ctx, w, h, basis, staerke, r) {
  ctx.fillStyle = basis; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h * 0.06; i++) {
    const g = Math.floor(r() * staerke);
    ctx.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${g / 255})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

// ---------- Stile ----------
const STILE = {
  lowpoly: {
    name: 'Low-Poly',
    bg: ['#cfe8f3', '#f4f1e8'],
    mat: (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o }),
    licht: { sonne: 2.6, himmel: 1.3, sonnePos: [60, 110, 70], schatten: 1024 },
    farben: { fassade: '#efe3c8', kachel: '#e4d3ae', sockel: '#5b6770', glas: '#7fb3c9', dach: '#b9b4a8', strasse: '#a3a8ad', gehweg: '#e3dfd6', baum: '#6fbf73', stamm: '#8a6a4d', logo: '#d6453d', boden: '#f2ede4', gang: '#e7e1d6', nachbar: ['#d9cdbd', '#c3cfd6', '#e2d7b8'] },
    texturen: false, diorama: false,
  },
  diorama: {
    name: 'Miniatur-Diorama',
    bg: ['#2b2420', '#4a3a2e'],
    mat: (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o }),
    licht: { sonne: 3.4, himmel: 0.7, sonnePos: [-70, 70, 90], schatten: 2048 },
    farben: { fassade: '#f0dcb4', kachel: '#e2c58f', sockel: '#3f4a52', glas: '#9fd0e0', dach: '#a89c88', strasse: '#5f646a', gehweg: '#cfc4b0', baum: '#5aa95e', stamm: '#7a5236', logo: '#e2392f', boden: '#efe4d2', gang: '#e2d6c1', nachbar: ['#d9a77c', '#9fb6c4', '#e3cf8f'] },
    texturen: false, diorama: true,
  },
  detail: {
    name: 'Detailliert mit Texturen',
    bg: ['#a9c6d8', '#e6e4dc'],
    mat: (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.02, ...o }),
    licht: { sonne: 2.4, himmel: 0.55, sonnePos: [70, 120, 50], schatten: 2048 },
    farben: { fassade: '#ffffff', kachel: '#ffffff', sockel: '#3c434a', glas: '#5d7f92', dach: '#9a978f', strasse: '#ffffff', gehweg: '#ffffff', baum: '#4f8f4f', stamm: '#5e4632', logo: '#c8322b', boden: '#ffffff', gang: '#ffffff', nachbar: ['#ffffff', '#ffffff', '#ffffff'] },
    texturen: true, diorama: false,
  },
};

const GRUPPEN_FARBE = {
  beauty: '#e9a3b8', accessoires: '#c9a26b', damen: '#c98bb9', herren: '#7d97b8', kinder: '#f2c14e', waesche: '#d8b4d8',
  wohnen: '#9fbf8f', spielwaren: '#ef8b4c', food: '#d9c36a', sport: '#6cb8a4',
};
const GRUPPEN_NAME = { beauty: 'Beauty', accessoires: 'Schuhe & Accessoires', damen: 'Damen', herren: 'Herren', kinder: 'Kinder', waesche: 'Wäsche', wohnen: 'Wohnen', spielwaren: 'Spielwaren', food: 'Feinkost', sport: 'Sport' };
const MOEBEL = { beauty: 'vitrine', accessoires: 'tisch', damen: 'staender', herren: 'staender', kinder: 'staender', waesche: 'staender', wohnen: 'regal', spielwaren: 'regal', food: 'regal', sport: 'staender' };

// ---------- Szene ----------
let UMGEBUNG = null;
const spiegel = (o) => (UMGEBUNG ? { envMap: UMGEBUNG, envMapIntensity: 0.9, ...o } : o);
function basisSzene(stil, canvas, breite, hoehe) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(breite, hoehe, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = stil.diorama || stil.texturen ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = stil.texturen ? 0.95 : 1;
  const scene = new THREE.Scene();
  scene.background = canvasTex(4, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, stil.bg[0]); g.addColorStop(1, stil.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  if (stil.texturen) {
    const pm = new THREE.PMREMGenerator(renderer);
    UMGEBUNG = pm.fromScene(new RoomEnvironment(), 0.04).texture; // nur für Glas und Metall
  }
  scene.add(new THREE.HemisphereLight(0xffffff, stil.diorama ? 0x6b4f3a : 0xb8b0a0, stil.licht.himmel));
  const sonne = new THREE.DirectionalLight(stil.diorama ? 0xffe2b8 : 0xffffff, stil.licht.sonne);
  sonne.position.set(...stil.licht.sonnePos);
  sonne.castShadow = true;
  sonne.shadow.mapSize.set(stil.licht.schatten, stil.licht.schatten);
  const sc = sonne.shadow.camera;
  sc.left = -110; sc.right = 110; sc.top = 110; sc.bottom = -110; sc.near = 1; sc.far = 400;
  sonne.shadow.bias = -0.0004;
  sonne.shadow.normalBias = 0.3;
  scene.add(sonne);
  return { renderer, scene };
}

function isoKamera(breite, hoehe, groesse, ziel) {
  const a = breite / hoehe;
  const cam = new THREE.OrthographicCamera(-groesse * a, groesse * a, groesse, -groesse, -500, 1000);
  const az = Math.PI / 4, el = (32 * Math.PI) / 180;
  cam.position.set(ziel.x + Math.sin(az) * Math.cos(el) * 200, ziel.y + Math.sin(el) * 200, ziel.z + Math.cos(az) * Math.cos(el) * 200);
  cam.lookAt(ziel);
  return cam;
}

function bauer(scene) {
  return (geo, mat, x, y, z, opts = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (opts.rot) m.rotation.set(...opts.rot);
    m.castShadow = opts.schatten !== false;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
}

function textTextur(text, farbe, hintergrund, breite = 1024, hoehe = 256, schrift = 'bold 170px "DejaVu Sans", Arial') {
  return canvasTex(breite, hoehe, (ctx, w, h) => {
    if (hintergrund) { ctx.fillStyle = hintergrund; ctx.fillRect(0, 0, w, h); } else ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = farbe;
    ctx.font = schrift;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 8);
  });
}

function label(scene, text, x, y, z, skala = 1) {
  const fs = 84;
  const mess = document.createElement('canvas').getContext('2d');
  mess.font = `bold ${fs}px "DejaVu Sans", Arial`;
  const tw = mess.measureText(text).width;
  const cw = Math.ceil(tw + 120), ch = 160;
  const pille = canvasTex(cw, ch, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255,255,255,0.93)';
    ctx.beginPath(); ctx.roundRect(4, 20, w - 8, h - 40, 60); ctx.fill();
    ctx.fillStyle = '#2a2a2a'; ctx.font = `bold ${fs}px "DejaVu Sans", Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 4);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pille, depthTest: false, transparent: true }));
  const hh = 3.1 * skala;
  sp.scale.set((hh * cw) / ch, hh, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 10;
  scene.add(sp);
}

// ---------- Maße aus den Engine-Daten ----------
const GF = haus.grundflaecheQm;
const B = Math.round(Math.sqrt(GF * 1.5) / 5) * 5; // Breite auf 5-m-Raster
const T = Math.round(GF / B / 5) * 5; // Tiefe
const OBEN = haus.etagen.filter((e) => e >= 0).length;
const EH = 4.5; // Geschosshöhe
const H = OBEN * EH + 1.2;

// ---------- Außenansicht ----------
function aussen(stil, canvas, breite, hoehe) {
  const { renderer, scene } = basisSzene(stil, canvas, breite, hoehe);
  const add = bauer(scene);
  const F = stil.farben;
  const r = rng(seedVon(haus.id));
  const T_ = stil.texturen ? texturen() : null;

  // Untergrund
  if (stil.diorama) {
    const holz = stil.mat('#6b4a32', { roughness: 0.6 });
    add(new THREE.BoxGeometry(170, 6, 150), holz, 0, -3.2, 5);
    add(new THREE.BoxGeometry(166, 0.4, 146), stil.mat('#3b3f44'), 0, -0.1, 5, { schatten: false });
  }
  const strasseMat = T_ ? new THREE.MeshStandardMaterial({ map: T_.asphalt, roughness: 0.95 }) : stil.mat(F.strasse);
  const gehwegMat = T_ ? new THREE.MeshStandardMaterial({ map: T_.pflaster, roughness: 0.9 }) : stil.mat(F.gehweg);
  add(new THREE.BoxGeometry(stil.diorama ? 166 : 400, 0.2, stil.diorama ? 146 : 400), strasseMat, 0, 0, 5, { schatten: false });
  add(new THREE.BoxGeometry(B + 16, 0.35, T + 16), gehwegMat, 0, 0.2, 0, { schatten: false });
  // Zebrastreifen
  const weiss = stil.mat('#f4f4f0');
  for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(1.2, 0.05, 6), weiss, -12 + i * 2.4, 0.13, T / 2 + 14, { schatten: false });

  // Bordstein, Fahrbahnmarkierung, Laternen (Diorama und Detail)
  if (stil.texturen || stil.diorama) {
    const bord = stil.mat('#9c9a94');
    add(new THREE.BoxGeometry(B + 16.4, 0.45, 0.4), bord, 0, 0.22, T / 2 + 8);
    add(new THREE.BoxGeometry(0.4, 0.45, T + 16.4), bord, B / 2 + 8, 0.22, 0);
    for (let x = -80; x < 80; x += 6) add(new THREE.BoxGeometry(3, 0.04, 0.25), weiss, x, 0.12, T / 2 + 14 + (Math.abs(x + 1) < 10 ? 100 : 0), { schatten: false });
    for (let z = -60; z < 60; z += 6) add(new THREE.BoxGeometry(0.25, 0.04, 3), weiss, B / 2 + 15, 0.12, z, { schatten: false });
    const mast = stil.mat('#3d4246');
    for (let x = -B / 2 + 9; x < B / 2; x += 16) { add(new THREE.CylinderGeometry(0.12, 0.15, 6, 8), mast, x, 3.2, T / 2 + 7.4); add(new THREE.BoxGeometry(1.4, 0.25, 0.5), mast, x, 6.2, T / 2 + 7.0); }
    for (let z = -T / 2 + 9; z < T / 2; z += 16) { add(new THREE.CylinderGeometry(0.12, 0.15, 6, 8), mast, B / 2 + 7.4, 3.2, z); add(new THREE.BoxGeometry(0.5, 0.25, 1.4), mast, B / 2 + 7.0, 6.2, z); }
  }
  if (stil.texturen) {
    // Geschossbänder und Sprossen im Schaufenster
    const band = stil.mat('#a9a296');
    for (let y = 5.85 + EH; y < H - 1; y += EH) {
      add(new THREE.BoxGeometry(B + 0.3, 0.35, 0.3), band, 0, y, T / 2 + 0.1);
      add(new THREE.BoxGeometry(0.3, 0.35, T + 0.3), band, B / 2 + 0.1, y, 0);
    }
    const sprosse = stil.mat('#2a3136');
    for (let x = -B / 2 + 2.5; x < B / 2; x += 2.5) add(new THREE.BoxGeometry(0.12, 4.0, 0.12), sprosse, x, 2.4, T / 2 - 0.45);
    for (let z = -T / 2 + 2.5; z < T / 2; z += 2.5) add(new THREE.BoxGeometry(0.12, 4.0, 0.12), sprosse, B / 2 - 0.45, 2.4, z);
    // Fahrradständer und Bänke
    for (let i = 0; i < 6; i++) add(new THREE.TorusGeometry(0.4, 0.05, 6, 12, Math.PI), stil.mat('#7c858c'), 14 + i * 0.9, 0.55, T / 2 + 4.2);
    for (const x of [-20, 22]) add(new THREE.BoxGeometry(2.2, 0.45, 0.6), stil.mat('#8a6a4d', { map: T_.holz }), x, 0.55, T / 2 + 4.5);
  }

  // Nachbarbebauung (links und hinten)
  const nachbarn = [[-B / 2 - 26, 0, 30, T + 4, 18], [0, -T / 2 - 22, B + 20, 22, 21], [B / 2 + 24, -T / 2 - 8, 26, 34, 15]];
  nachbarn.forEach(([x, z, w, d, hh], i) => {
    const m = T_ ? new THREE.MeshStandardMaterial({ map: T_.putz[i % 3], roughness: 0.9 }) : stil.mat(F.nachbar[i % 3]);
    add(new THREE.BoxGeometry(w, hh, d), m, x, hh / 2, z);
    add(new THREE.BoxGeometry(w + 0.6, 0.6, d + 0.6), stil.mat('#8f8a80'), x, hh, z);
    // Fensterreihen
    const fm = stil.mat(F.glas, T_ ? spiegel({ metalness: 0.6, roughness: 0.15 }) : {});
    for (let y = 4; y < hh - 2; y += 3.4) for (let k = -w / 2 + 3; k < w / 2 - 2; k += 3.2) {
      if (x > B / 2) add(new THREE.BoxGeometry(0.15, 1.8, 1.4), fm, x - w / 2 - 0.05, y, z + (k * d) / w, { schatten: false });
      else add(new THREE.BoxGeometry(1.4, 1.8, 0.15), fm, x + k, y, z + d / 2 + 0.05, { schatten: false });
    }
  });

  // Sockel / EG
  const sockelH = 5.5;
  const glasMat = T_ ? new THREE.MeshStandardMaterial(spiegel({ color: '#3a5868', metalness: 0.85, roughness: 0.08 })) : stil.mat(F.glas, stil.diorama ? { roughness: 0.25 } : {});
  add(new THREE.BoxGeometry(B - 1, sockelH, T - 1), glasMat, 0, sockelH / 2 + 0.35, 0);
  const pfeilerMat = stil.mat(F.sockel);
  for (let x = -B / 2; x <= B / 2 + 0.1; x += 5) add(new THREE.BoxGeometry(0.7, sockelH, 0.7), pfeilerMat, x, sockelH / 2 + 0.35, T / 2 - 0.3);
  for (let z = -T / 2; z <= T / 2 + 0.1; z += 5) add(new THREE.BoxGeometry(0.7, sockelH, 0.7), pfeilerMat, B / 2 - 0.3, sockelH / 2 + 0.35, z);
  // Vordach
  const vordachMat = stil.mat(stil.texturen ? '#d9d9d6' : '#f5f3ee');
  add(new THREE.BoxGeometry(B + 5, 0.6, 3.2), vordachMat, 1.2, 4.6, T / 2 + 1.4);
  add(new THREE.BoxGeometry(3.2, 0.6, T + 2), vordachMat, B / 2 + 1.4, 4.6, 0);
  // Eingänge
  const tuerMat = stil.mat('#2f3b42', T_ ? spiegel({ metalness: 0.7, roughness: 0.2 }) : {});
  add(new THREE.BoxGeometry(10, 3.4, 0.4), tuerMat, -2, 2.1, T / 2 + 0.1);
  add(new THREE.BoxGeometry(0.4, 3.4, 8), tuerMat, B / 2 + 0.1, 2.1, 4);
  // Schaufensterauslagen (bunte Blöcke hinter dem Glas)
  for (let x = -B / 2 + 2.5; x < B / 2 - 2; x += 5) {
    if (Math.abs(x + 2) < 6) continue;
    add(new THREE.BoxGeometry(2.2, 1.6, 0.8), stil.mat(['#e9a3b8', '#c9a26b', '#7d97b8', '#f2c14e'][Math.floor(r() * 4)]), x, 1.3, T / 2 - 1.2, { schatten: false });
  }

  // Obergeschosse: geschlossene Kachelfassade der 70er
  const fassH = H - sockelH;
  const fassMat = T_ ? new THREE.MeshStandardMaterial({ map: T_.kachel(B, fassH), roughness: 0.6 }) : stil.mat(F.fassade);
  const fassMatS = T_ ? new THREE.MeshStandardMaterial({ map: T_.kachel(T, fassH), roughness: 0.6 }) : fassMat;
  const korpus = new THREE.Mesh(new THREE.BoxGeometry(B, fassH, T), [fassMatS, fassMatS, stil.mat(F.dach), stil.mat(F.dach), fassMat, fassMat]);
  korpus.position.set(0, sockelH + 0.35 + fassH / 2, 0);
  korpus.castShadow = korpus.receiveShadow = true;
  scene.add(korpus);
  if (!stil.texturen) {
    // Kacheln als Relief (Instancing)
    const k = 1.5;
    const geo = new THREE.BoxGeometry(k * 0.86, k * 0.86, 0.25);
    const n = Math.floor(B / k) * Math.floor(fassH / k) + Math.floor(T / k) * Math.floor(fassH / k);
    const inst = new THREE.InstancedMesh(geo, stil.mat(F.kachel), n);
    const m = new THREE.Matrix4();
    let i = 0;
    for (let y = sockelH + 0.35 + k / 2 + 0.3; y < H - k / 2; y += k) {
      for (let x = -B / 2 + k / 2; x < B / 2 - k / 4; x += k) { m.makeTranslation(x, y, T / 2 + 0.1); inst.setMatrixAt(i++, m); }
      for (let z = -T / 2 + k / 2; z < T / 2 - k / 4; z += k) { m.makeRotationY(Math.PI / 2); m.setPosition(B / 2 + 0.1, y, z); inst.setMatrixAt(i++, m); }
    }
    inst.count = i;
    inst.castShadow = true; inst.receiveShadow = true;
    scene.add(inst);
  }
  // Fensterband im obersten Geschoss (Restaurant)
  add(new THREE.BoxGeometry(B * 0.55, 2.2, 0.3), glasMat, -B * 0.18, H - 2.2, T / 2 + 0.2);
  // Dach: Attika, Technik, Werbeturm
  const attika = stil.mat(stil.texturen ? '#b9b5ab' : '#d8cfbd');
  add(new THREE.BoxGeometry(B + 0.8, 1.0, 0.8), attika, 0, H + 0.85, T / 2);
  add(new THREE.BoxGeometry(B + 0.8, 1.0, 0.8), attika, 0, H + 0.85, -T / 2);
  add(new THREE.BoxGeometry(0.8, 1.0, T), attika, B / 2, H + 0.85, 0);
  add(new THREE.BoxGeometry(0.8, 1.0, T), attika, -B / 2, H + 0.85, 0);
  const technik = stil.mat(stil.texturen ? '#8c8c88' : '#bdb7aa');
  add(new THREE.BoxGeometry(14, 4, 10), technik, -B / 4, H + 2.4, -T / 6);
  add(new THREE.BoxGeometry(8, 3, 8), technik, B / 5, H + 1.9, -T / 4);
  for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(1, 1, 1.4, stil.texturen ? 24 : 8), stil.mat('#9ea3a6'), B / 5 - 2.5 + (i % 2) * 5, H + 4.1, -T / 4 - 2 + Math.floor(i / 2) * 4);
  // Logo an der Front und am Eck
  const logo = textTextur('HARTWIG', F.logo, null);
  const logoMat = new THREE.MeshBasicMaterial({ map: logo, transparent: true });
  const lf = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), logoMat);
  lf.position.set(-B * 0.12, H - 7.5, T / 2 + 0.3); scene.add(lf);
  const ls = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), logoMat);
  ls.rotation.y = Math.PI / 2; ls.position.set(B / 2 + 0.3, H - 7.5, 0); scene.add(ls);

  // Bäume, Laternen, Autos, Menschen
  const baumKrone = stil.mat(F.baum);
  const stamm = stil.mat(F.stamm);
  const baeume = [];
  for (let x = -B / 2 + 4; x < B / 2; x += 11) baeume.push([x, T / 2 + 6.5]);
  for (let z = -T / 2 + 6; z < T / 2; z += 11) baeume.push([B / 2 + 6.5, z]);
  for (const [x, z] of baeume) {
    add(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), stamm, x, 1.8, z);
    const krone = stil.diorama ? new THREE.SphereGeometry(2.3, 10, 8) : stil.texturen ? new THREE.IcosahedronGeometry(2.4, 2) : new THREE.IcosahedronGeometry(2.4, 0);
    add(krone, baumKrone, x, 4.6, z);
  }
  const autoFarben = ['#d6453d', '#3d6fd6', '#f2f2f2', '#2b2b2b', '#e0b43a'];
  const autos = [[-30, T / 2 + 12, 0], [5, T / 2 + 16, 0], [28, T / 2 + 12, 0], [B / 2 + 13, -10, 1], [B / 2 + 17, 12, 1]];
  for (const [x, z, rot] of autos) {
    const g = new THREE.Group();
    const lack = stil.mat(autoFarben[Math.floor(r() * autoFarben.length)], T_ ? spiegel({ metalness: 0.5, roughness: 0.3 }) : {});
    const k1 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, 1.9), lack); k1.position.y = 0.8;
    const k2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.7), stil.mat('#9bc3d6', T_ ? spiegel({ metalness: 0.8, roughness: 0.1 }) : {})); k2.position.set(-0.2, 1.6, 0);
    for (const m of [k1, k2]) { m.castShadow = true; g.add(m); }
    if (stil.texturen) for (const [dx, dz] of [[1.4, 0.95], [-1.4, 0.95], [1.4, -0.95], [-1.4, -0.95]]) {
      const rad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16), stil.mat('#1e1e1e')); rad.rotation.x = Math.PI / 2; rad.position.set(dx, 0.4, dz); g.add(rad);
    }
    g.position.set(x, 0.1, z); g.rotation.y = rot ? Math.PI / 2 : 0;
    scene.add(g);
  }
  menschen(scene, stil, r, 26, () => {
    const seite = r() < 0.6;
    return seite ? [-B / 2 + r() * B, T / 2 + 2 + r() * 6] : [B / 2 + 2 + r() * 6, -T / 2 + r() * T];
  }, 0.35);

  const cam = isoKamera(breite, hoehe, stil.diorama ? 50 : 54, new THREE.Vector3(2, 8, 2));
  zeichne(renderer, scene, cam, stil, breite, hoehe);
}

function menschen(scene, stil, r, n, pos, y0) {
  const farben = ['#d6453d', '#3d6fd6', '#f2c14e', '#6cb8a4', '#8d5fbf', '#ef8b4c', '#2b2b2b', '#f0f0f0'];
  for (let i = 0; i < n; i++) {
    const [x, z] = pos(i);
    const koerper = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 1.25, stil.texturen ? 12 : 6), stil.mat(farben[Math.floor(r() * farben.length)]));
    koerper.position.set(x, y0 + 0.62, z);
    const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.24, stil.texturen ? 12 : 6, stil.texturen ? 10 : 4), stil.mat('#e8c1a0'));
    kopf.position.set(x, y0 + 1.48, z);
    for (const m of [koerper, kopf]) { m.castShadow = true; scene.add(m); }
  }
}

// ---------- Innenansicht: EG im Kachelraster ----------
function innen(stil, canvas, breite, hoehe, etage = 0) {
  const { renderer, scene } = basisSzene(stil, canvas, breite, hoehe);
  const add = bauer(scene);
  const F = stil.farben;
  const r = rng(seedVon(haus.id) + etage);
  const T_ = stil.texturen ? texturen() : null;
  const K = 5;
  const nx = B / K, nz = T / K;

  if (stil.diorama) add(new THREE.BoxGeometry(B + 14, 4, T + 14), stil.mat('#6b4a32', { roughness: 0.6 }), 0, -2.4, 0);
  // Bodenplatte
  const bodenMat = T_ ? new THREE.MeshStandardMaterial({ map: T_.terrazzo(B, T), roughness: 0.35 }) : stil.mat(F.boden);
  add(new THREE.BoxGeometry(B + 1, 0.8, T + 1), bodenMat, 0, -0.4, 0, { schatten: false });
  // Raster
  const linien = [];
  for (let i = 0; i <= nx; i++) linien.push(-B / 2 + i * K, 0.02, -T / 2, -B / 2 + i * K, 0.02, T / 2);
  for (let j = 0; j <= nz; j++) linien.push(-B / 2, 0.02, -T / 2 + j * K, B / 2, 0.02, -T / 2 + j * K);
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(linien, 3));
  scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: stil.diorama ? '#b9a88c' : '#c9c2b6', transparent: true, opacity: 0.7 })));

  // Zellen klassifizieren
  const zellen = [];
  const cx0 = Math.floor(nx / 2) - 1, cz0 = Math.floor(nz / 2) - 1;
  const kern = (i, j) => i >= cx0 && i < cx0 + 2 && j >= cz0 && j < cz0 + 3;
  const gang = (i, j) => (i >= cx0 - 1 && i <= cx0 + 2 && j >= cz0 - 1 && j <= cz0 + 3) || (i >= cx0 && i < cx0 + 2 && j > cz0 + 2);
  const service = (i, j) => j === 0 && (i <= 2 || i >= nx - 3);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const typ = kern(i, j) ? 'kern' : service(i, j) ? 'service' : gang(i, j) ? 'gang' : 'verkauf';
    zellen.push({ i, j, typ, x: -B / 2 + (i + 0.5) * K, z: -T / 2 + (j + 0.5) * K });
  }
  // Verkaufszellen nach Winkel um den Kern sortieren, Start am Eingang, dann Sektoren je Sortiment
  const kx = -B / 2 + (cx0 + 1) * K, kz = -T / 2 + (cz0 + 1.5) * K;
  const verkauf = zellen.filter((c) => c.typ === 'verkauf').map((c) => ({ ...c, w: (Math.atan2(c.x - kx, c.z - kz) + Math.PI * 2 + 0.3) % (Math.PI * 2) }));
  verkauf.sort((a, b) => a.w - b.w);
  const fl = haus.flaechen.filter((f) => f.etage === etage);
  const gesamt = fl.reduce((a, f) => a + f.qm, 0);
  let idx = 0;
  const zonen = fl.map((f, n) => {
    const anz = n === fl.length - 1 ? verkauf.length - idx : Math.round((f.qm / gesamt) * verkauf.length);
    const z = { f, zellen: verkauf.slice(idx, idx + anz) };
    idx += anz;
    return z;
  });

  // Zonenböden und Möbel
  for (const zone of zonen) {
    const farbe = new THREE.Color(GRUPPEN_FARBE[zone.f.gruppe] ?? '#cccccc');
    const boden = farbe.clone().lerp(new THREE.Color(stil.diorama ? '#efe4d2' : '#ffffff'), 0.62);
    const bm = T_ ? new THREE.MeshStandardMaterial({ color: boden, map: T_.parkett, roughness: 0.55 }) : stil.mat(boden);
    for (const c of zone.zellen) add(new THREE.BoxGeometry(K - 0.06, 0.06, K - 0.06), bm, c.x, 0.03, c.z, { schatten: false });
    moebel(scene, stil, zone, farbe, r, T_);
    // Label über dem Schwerpunkt
    const sx = zone.zellen.reduce((a, c) => a + c.x, 0) / zone.zellen.length;
    const sz = zone.zellen.reduce((a, c) => a + c.z, 0) / zone.zellen.length;
    label(scene, `${GRUPPEN_NAME[zone.f.gruppe]} · ${zone.f.qm.toLocaleString('de-DE')} qm`, sx, 9, sz, 1.05);
  }
  // Gang
  const gm = T_ ? new THREE.MeshStandardMaterial({ map: T_.terrazzo(K, K), roughness: 0.3 }) : stil.mat(F.gang);
  for (const c of zellen.filter((c) => c.typ === 'gang')) add(new THREE.BoxGeometry(K, 0.04, K), gm, c.x, 0.02, c.z, { schatten: false });
  // Service: Lager und Treppenhäuser
  const serviceMat = stil.mat(stil.texturen ? '#8e9296' : '#b8b2a6');
  for (const c of zellen.filter((c) => c.typ === 'service')) add(new THREE.BoxGeometry(K - 0.2, EH, K - 0.2), serviceMat, c.x, EH / 2, c.z);
  // Rolltreppenkern
  const rx = kx, rz = kz;
  const stufen = stil.mat(stil.texturen ? '#6f7579' : '#9aa4aa', T_ ? spiegel({ metalness: 0.6, roughness: 0.35 }) : {});
  const balu = new THREE.MeshStandardMaterial({ color: '#cfe8f0', transparent: true, opacity: 0.45, roughness: 0.1 });
  for (const dx of [-2.2, 2.2]) {
    const lauf = add(new THREE.BoxGeometry(1.6, 0.5, 13), stufen, rx + dx, EH / 2, rz, { rot: [dx < 0 ? -0.34 : 0.34, 0, 0] });
    void lauf;
    for (const s of [-0.95, 0.95]) add(new THREE.BoxGeometry(0.12, 1.1, 13), balu, rx + dx + s, EH / 2 + 0.8, rz, { rot: [dx < 0 ? -0.34 : 0.34, 0, 0], schatten: false });
  }
  add(new THREE.BoxGeometry(2.4, EH, 2.4), stil.mat('#d0cbc0'), rx, EH / 2, rz - 6.5);
  add(new THREE.BoxGeometry(2.4, EH, 2.4), stil.mat('#d0cbc0'), rx, EH / 2, rz + 6.5);
  // Stützen alle 10 m
  const stuetze = stil.mat(stil.texturen ? '#cfcac0' : '#e3ddd1');
  for (let x = -B / 2 + 10; x < B / 2; x += 10) for (let z = -T / 2 + 10; z < T / 2; z += 10) {
    if (Math.abs(x - rx) < 6 && Math.abs(z - rz) < 9) continue;
    add(new THREE.BoxGeometry(0.7, EH, 0.7), stuetze, x, EH / 2, z);
  }
  // Wände hinten (aufgeschnitten), vorne Brüstung mit Glas
  const wand = T_ ? new THREE.MeshStandardMaterial({ map: T_.putzInnen, roughness: 0.9 }) : stil.mat(stil.diorama ? '#e8dcc6' : '#f0ebe1');
  add(new THREE.BoxGeometry(B + 1, EH, 0.5), wand, 0, EH / 2, -T / 2 - 0.25);
  add(new THREE.BoxGeometry(0.5, EH, T + 1), wand, -B / 2 - 0.25, EH / 2, 0);
  const glas = new THREE.MeshStandardMaterial({ color: '#bfe1ec', transparent: true, opacity: 0.35, roughness: 0.05 });
  add(new THREE.BoxGeometry(B, 1.1, 0.25), glas, 0, 0.55, T / 2, { schatten: false });
  add(new THREE.BoxGeometry(0.25, 1.1, T), glas, B / 2, 0.55, 0, { schatten: false });
  // Eingang markieren
  add(new THREE.BoxGeometry(10, 0.08, 2), stil.mat('#3a3f44'), -2, 0.05, T / 2 - 1, { schatten: false });
  // Kassen je Zone
  const kasse = stil.mat('#4a4f55');
  for (const zone of zonen) {
    const c = zone.zellen.find((x) => zellen.some((g) => g.typ === 'gang' && Math.abs(g.x - x.x) + Math.abs(g.z - x.z) <= K + 0.1)) ?? zone.zellen[0];
    if (c) { add(new THREE.BoxGeometry(2.8, 1.0, 1.0), kasse, c.x, 0.5, c.z + 1.4); add(new THREE.BoxGeometry(0.5, 0.4, 0.4), stil.mat('#222'), c.x - 0.6, 1.2, c.z + 1.4); }
  }
  // Menschen: Kunden in Gängen und Zonen, Personal dunkel
  const plaetze = zellen.filter((c) => c.typ === 'gang' || c.typ === 'verkauf');
  menschen(scene, stil, r, 46, () => { const c = plaetze[Math.floor(r() * plaetze.length)]; return [c.x + (r() - 0.5) * 3.6, c.z + (r() - 0.5) * 3.6]; }, 0.06);

  label(scene, 'Rolltreppen', rx, 7.2, rz, 0.8);
  const cam = isoKamera(breite, hoehe, stil.diorama ? 33 : 35, new THREE.Vector3(4, 4, -2));
  zeichne(renderer, scene, cam, stil, breite, hoehe);
}

function moebel(scene, stil, zone, farbe, r, T_) {
  const typ = MOEBEL[zone.f.gruppe] ?? 'regal';
  const holz = stil.mat(T_ ? '#ffffff' : '#c9b08c', T_ ? { map: T_.holz, roughness: 0.6 } : {});
  const weiss = stil.mat('#f7f5f0');
  const akzent = stil.mat(farbe);
  const add = bauer(scene);
  const glas = new THREE.MeshStandardMaterial({ color: '#d8eef5', transparent: true, opacity: 0.5, roughness: 0.05 });
  for (const c of zone.zellen) {
    const v = r();
    if (typ === 'vitrine') {
      for (const [dx, dz] of [[-1.2, -1], [1.2, 1]]) {
        add(new THREE.BoxGeometry(1.6, 0.9, 1.0), weiss, c.x + dx, 0.45, c.z + dz);
        add(new THREE.BoxGeometry(1.6, 0.35, 1.0), glas, c.x + dx, 1.08, c.z + dz, { schatten: false });
        add(new THREE.BoxGeometry(1.2, 0.18, 0.6), akzent, c.x + dx, 0.99, c.z + dz, { schatten: false });
      }
      if (v < 0.35) add(new THREE.CylinderGeometry(0.35, 0.35, 1.9, stil.texturen ? 16 : 6), akzent, c.x, 0.95, c.z);
    } else if (typ === 'tisch') {
      const quer = v < 0.5;
      add(new THREE.BoxGeometry(quer ? 1.4 : 2.6, 0.75, quer ? 2.6 : 1.4), holz, c.x - 0.6, 0.38, c.z);
      for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.42, 0.22, 0.26), stil.mat(['#3b3b3b', '#8b5a3c', '#e8e4dc', farbe.getStyle()][k]), c.x - 1.5 + k * 0.6, 0.86, c.z + (k % 2 ? 0.3 : -0.3), { schatten: false });
      if (v < 0.5) add(new THREE.BoxGeometry(0.6, 2.0, 3.4), holz, c.x + 1.8, 1.0, c.z);
    } else if (typ === 'staender') {
      for (const dz of [-1.1, 1.1]) {
        add(new THREE.BoxGeometry(3.2, 0.08, 0.08), stil.mat('#7a7a7a'), c.x, 1.55, c.z + dz, { schatten: false });
        for (let k = 0; k < 7; k++) add(new THREE.BoxGeometry(0.34, 1.1, 0.55), stil.mat(new THREE.Color(farbe).offsetHSL((r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.25)), c.x - 1.45 + k * 0.48, 0.98, c.z + dz);
      }
    } else {
      for (const dx of [-1.3, 1.3]) {
        add(new THREE.BoxGeometry(0.8, 1.9, 4.0), holz, c.x + dx, 0.95, c.z);
        add(new THREE.BoxGeometry(0.9, 0.3, 3.6), akzent, c.x + dx, 1.3, c.z, { schatten: false });
      }
    }
  }
}

// ---------- Prozedurale Texturen für den Detailstil ----------
let _tex;
function texturen() {
  if (_tex) return _tex;
  const r = rng(99);
  _tex = {
    asphalt: canvasTex(512, 512, (ctx, w, h) => rauschen(ctx, w, h, '#5c6064', 40, r), [24, 24]),
    pflaster: canvasTex(256, 256, (ctx, w, h) => {
      rauschen(ctx, w, h, '#c9c4ba', 25, r);
      ctx.strokeStyle = 'rgba(80,75,70,0.45)'; ctx.lineWidth = 2;
      for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(w, i * 32); ctx.stroke(); }
    }, [14, 12]),
    putz: ['#d9c3a5', '#b4c2cc', '#ddd0a6'].map((c) => canvasTex(256, 256, (ctx, w, h) => {
      rauschen(ctx, w, h, c, 22, r);
    }, [3, 3])),
    putzInnen: canvasTex(256, 256, (ctx, w, h) => rauschen(ctx, w, h, '#ece6da', 12, r), [6, 2]),
    holz: canvasTex(256, 64, (ctx, w, h) => {
      ctx.fillStyle = '#b8936a'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { ctx.strokeStyle = `rgba(90,60,30,${0.1 + r() * 0.2})`; ctx.beginPath(); const y = r() * h; ctx.moveTo(0, y); ctx.bezierCurveTo(w / 3, y + r() * 6 - 3, (2 * w) / 3, y + r() * 6 - 3, w, y); ctx.stroke(); }
    }),
    parkett: canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      for (let y = 0; y < h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); for (let x = (y / 16) % 2 ? 0 : 40; x < w; x += 80) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); } }
    }, [1, 1]),
    terrazzo: (bx, bz) => canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#e9e5dc'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 3500; i++) { ctx.fillStyle = ['#cfc8bb', '#b8b0a2', '#f7f4ee', '#d9cdb8', '#a59c8e'][Math.floor(r() * 5)]; ctx.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 4); }
      ctx.strokeStyle = 'rgba(120,110,100,0.25)';
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo((i * w) / 4, 0); ctx.lineTo((i * w) / 4, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, (i * h) / 4); ctx.lineTo(w, (i * h) / 4); ctx.stroke(); }
    }, [bx / 10, bz / 10]),
    kachel: (laenge, hoch) => canvasTex(512, 512, (ctx, w, h) => {
      // Waben-/Kachelfassade mit Fugen und Regenspuren
      ctx.fillStyle = '#d8c8a6'; ctx.fillRect(0, 0, w, h);
      const n = 8, s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const g = ctx.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
        g.addColorStop(0, '#efe4ca'); g.addColorStop(1, '#cdb98f');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.roundRect(i * s + 4, j * s + 4, s - 8, s - 8, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
      }
      for (let i = 0; i < 26; i++) { const x = r() * w; const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(60,55,45,0)'); g.addColorStop(1, `rgba(60,55,45,${0.08 + r() * 0.12})`); ctx.fillStyle = g; ctx.fillRect(x, r() * h * 0.5, 3 + r() * 10, h); }
    }, [laenge / 12, hoch / 12]),
  };
  return _tex;
}

// ---------- Rendern ----------
function zeichne(renderer, scene, cam, stil, breite, hoehe) {
  if (!stil.diorama) { renderer.render(scene, cam); return; }
  const comp = new EffectComposer(renderer);
  comp.setSize(breite, hoehe);
  comp.addPass(new RenderPass(scene, cam));
  const hp = new ShaderPass(HorizontalTiltShiftShader); hp.uniforms.h.value = 2.2 / breite; hp.uniforms.r.value = 0.52;
  const vp = new ShaderPass(VerticalTiltShiftShader); vp.uniforms.v.value = 2.2 / hoehe; vp.uniforms.r.value = 0.52;
  comp.addPass(hp); comp.addPass(vp);
  comp.addPass(new OutputPass());
  comp.render();
}

const p = new URLSearchParams(location.search);
const stil = STILE[p.get('stil') ?? 'lowpoly'];
document.getElementById('titel').textContent = stil.name;
document.getElementById('unter').textContent = `${haus.name.replace(' City-Center', '')} · Baujahr ${haus.baujahr} · ${OBEN} Geschosse + UG · ${B} × ${T} m Grundfläche`;
const W = 720;
aussen(stil, document.getElementById('a'), W, 760);
innen(stil, document.getElementById('i'), W, 700, 0);
window.fertig = true;

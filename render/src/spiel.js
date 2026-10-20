// Browser-Prototyp: Engine (TypeScript aus /home/claude/turnaround/src, von esbuild gebündelt) + Grafik-Baukasten.
// Eine Stadt, Woche weiter, Cockpit, Hausdetail mit Innenansicht (Eigenmarken-Shops), Zentrale (HQ) mit Aktionen und
// Etagenschnitt, Einkauf-Panel (ui/einkauf.js, ui/eigenmarken.js), Vorstand, Marketing und Produktentwicklung (ui/vorstand.js,
// ui/marketing.js, ui/produkte.js) über den Menüknopf, Karte wie Coffee Inc (ui/karte.js), Kacheln mit Detailstufen.
// Steuerung für Prüfskripte: window.spiel = { s, neuesSpiel, stadt, woche, bot, oeffneHaus, oeffneHq, schliessePanel, kamera,
//   fokusHaeuser, tippPunkt, teileStand, kachelnRuhig, kachelnPause, messung, oeffneEinkauf, einkauf, pruefeEinkauf, hausEtage, innenbild,
//   vorstand, marketing, produkte (je .pruefe()), oeffneVorstand, oeffneMarketing, oeffneProdukte, karte { messen, randPixel, info } }
import * as E from '../../engine/src/index';
import { botTief } from '../../engine/scripts/bot';
import { THREE, Sammler, KompaktSammler, setzeLod, entferneKleineSchilder, neueSzene, isoKamera, kameraFuer, sonneAuf, rng, waehle, FARBEN, dachProfil, dunkler } from './kit/basis.js';
import { echterBauer } from './kit/bauer.js';
import { etage } from './kit/grundriss.js';
import { RASTER } from './kit/innen.js';
import { hqEtage, hqEinplanen, angebotMarker, ABTEILUNGEN as HQ_ABT } from './kit/hq.js';
import { stadtplan, baueStadt, setzeMarker, bauerFuer } from './kit/stadt.js';
import { STADTLISTE } from './kit/staedte.js';
import { nahMitte } from './kit/stadtrand.js';
import { stadtEintragAusSpiel, spielBauer } from './kit/bruecke.js';
import { STATUS_TITEL } from './kit/zustaende.js';
import { geld, fmt, esc } from './ui/format.js';
import { quelle } from './ui/quelle.js';
import { einkaufModul } from './ui/einkauf.js';
import { karteSteuerung, klemmen, bildecken, erweitert } from './ui/karte.js';
import { vorstandModul } from './ui/vorstand.js';
import { posteingangModul } from './ui/posteingang.js';
import { statistikModul } from './ui/statistik.js';
import { marketingModul } from './ui/marketing.js';
import { produkteModul } from './ui/produkte.js';
import { laden, speichern } from './ui/speicher.js';
import { messen as performanceMessen } from './ui/diagnose.js';
import { reiseModul } from './ui/reise.js';
import { wochenberichtModul } from './ui/wochenbericht.js';

const param = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const messung = { stadtMs: [], wocheMs: [], neuBauMs: [], renderMs: [], kachelMs: [] };
let speicherTimer = null;
let speicherWarnung = false;
const neuerPostUi = () => ({ gelesen: [], reiter: 'handeln', warnen: true, wochenbericht: 'voll', reiseZuletzt: [] });
let postUi = neuerPostUi();
let streifenTimer = null;
function speicherFehler(e) {
  console.error('Spielstand konnte nicht gespeichert werden:', e);
  if (!speicherWarnung) meldung('Speichern fehlgeschlagen: ' + e.message, false);
  speicherWarnung = true;
}
function automatischSpeichern() {
  if (!s) return;
  clearTimeout(speicherTimer);
  speicherTimer = setTimeout(() => {
    speichern(s, stadtName, postUi).then(() => { speicherWarnung = false; }).catch(speicherFehler);
  }, 350);
}
async function sofortSpeichern() {
  if (!s) throw new Error('Noch kein Spiel gestartet.');
  clearTimeout(speicherTimer);
  await speichern(s, stadtName, postUi);
  speicherWarnung = false;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && s) {
    // iOS kann Hintergrund-Tabs beenden: ausstehende Aenderungen sofort schreiben.
    clearTimeout(speicherTimer);
    speichern(s, stadtName, postUi).catch((e) => console.error('Autosave bei App-Wechsel:', e));
  }
});

// ─────────────────────────────────────────── Zahlen
const etageName = (e) => (e === -1 ? 'Untergeschoss' : e === 0 ? 'Erdgeschoss' : `${e}. Obergeschoss`);
const KONZEPT = { eigen: 'Eigenfläche', kommission: 'Kommission', konzession: 'Konzession', untermiete: 'Untermiete', offprice: 'Outlet', leer: 'Leerfläche' };
const STATUS_HAUS = { offen: 'Offen', schliessung_verhandlung: 'Schließung in Verhandlung', raeumung: 'Räumungsverkauf', geschlossen: 'Geschlossen', verkauft: 'Verkauft' };

// ─────────────────────────────────────────── Szene und Kamera
const canvas = $('karte');
// Sparsames Profil fuer kleine Touch-Geraete: weniger Framebuffer-Pixel, kein teurer Schattenpass.
// Fuer A/B-Vergleiche kann ?grafik=hoch bzw. ?grafik=sparsam gesetzt werden.
const touchMobil = (navigator.maxTouchPoints > 0 && window.innerWidth <= 650) || /iPhone|iPod|Android/i.test(navigator.userAgent);
const sparsam = param.get('grafik') === 'sparsam' || (touchMobil && param.get('grafik') !== 'hoch');
const ren = new THREE.WebGLRenderer({ canvas, antialias: !sparsam, preserveDrawingBuffer: true });
ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, sparsam ? 1.25 : 2));
ren.outputColorSpace = THREE.SRGBColorSpace;
ren.shadowMap.enabled = !sparsam;
ren.shadowMap.type = THREE.PCFShadowMap;

const K = { x: 0, z: 0, halb: 70, min: 22, max: 240, G: null };
let scene = null, cam = null, wurzel = null, plan = null, sb = null, s = null, stadtName = null;
let offenesHaus = null, offenesHq = null, offenerWettbewerber = null;
let angebotPins = [], wettbewerbPins = [], wettbewerbPinTimer = null;
let bahnhofPin = null, bahnhofOrt = null, reise = null, wochenbericht = null;
const WB_FARBEN = { modehaus: '#795846', fastfashion: '#292b39', premium: '#9e773e',
  offprice: '#d62867', textildiscounter: '#2565b5', elektronik: '#d34532', leer_ehemals: '#777d80' };
const WB_ART = { modehaus: 'Modehaus', fastfashion: 'Fast Fashion', premium: 'Premium',
  offprice: 'Offprice', textildiscounter: 'Textildiscounter', elektronik: 'Elektronik', leer_ehemals: 'Leerstehendes Kaufhaus' };
const WB_STATUS = { offen: 'Geöffnet', eroeffnung: 'Neueröffnung', raeumung: 'Räumungsverkauf', geschlossen: 'Geschlossen' };


function groesse() { return [canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight]; }
function kameraSetzen() {
  if (!scene) return;
  const [w, h] = groesse();
  klemmen(K, w / h);
  ren.setSize(w, h, false);
  cam = isoKamera(w, h, K.halb, new THREE.Vector3(K.x, 0, K.z));
  cam.updateMatrixWorld();
  const sonne = scene.userData.sonne, r = K.halb * 2.4;
  sonne.position.set(K.x - 40, 120, K.z + 90);
  sonne.target.position.set(K.x, 0, K.z);
  Object.assign(sonne.shadow.camera, { left: -r, right: r, top: r, bottom: -r });
  sonne.shadow.camera.updateProjectionMatrix();
  zeichnen();
  kachelnPlanen();
}
let geplant = false;
function zeichnen() {
  if (geplant) return;
  geplant = true;
  requestAnimationFrame(() => { geplant = false; const t = performance.now(); ren.render(scene, cam); messung.renderMs.push(Math.round(performance.now() - t)); });
}
function jetztZeichnen() { const t = performance.now(); ren.render(scene, cam); return Math.round(performance.now() - t); }

// Bodenpunkt unter einem Bildschirmpunkt (orthografisch: Strahl parallel zur Blickrichtung)
const ray = new THREE.Raycaster(), boden = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function aufBoden(px, py) {
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1), cam);
  const p = new THREE.Vector3();
  return ray.ray.intersectPlane(boden, p) ? p : null;
}
function hausUnter(px, py) {
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1), cam);
  if (bahnhofPin && ray.intersectObject(bahnhofPin, false).length) return 'bahn:hauptbahnhof';
  const wp = wettbewerbPins.length ? ray.intersectObjects(wettbewerbPins, false)[0] : null;
  if (wp?.object.userData.wbId) return 'wb:' + wp.object.userData.wbId;
  const ap = angebotPins.length ? ray.intersectObjects(angebotPins, false)[0] : null;
  if (ap?.object.userData.angebotId) return 'angebot:' + ap.object.userData.angebotId;
  const t = ray.intersectObject(wurzel, true)[0];
  const u = t?.object.userData;
  return u?.hausId ?? (u?.wbId ? 'wb:' + u.wbId : (u?.hqId ? 'hq:' + u.hqId : null));
}

/** Kamera so setzen, dass alle Hartwig-Häuser der Stadt im freien Kartenbereich (zwischen Cockpit und unterer Leiste) liegen. */
function fokusHaeuser() {
  const b = new THREE.Box3();
  for (const x of sb.haeuser.values()) if (x.gruppe) b.union(new THREE.Box3().setFromObject(x.gruppe));
  if (b.isEmpty()) return;
  const m = b.getCenter(new THREE.Vector3());
  const [w, h] = groesse(), oben = 330, unten = h - 130;
  K.x = m.x; K.z = m.z; K.halb = 100; kameraSetzen();
  for (let i = 0; i < 3; i++) {
    const ecken = [];
    for (const xx of [b.min.x, b.max.x]) for (const yy of [b.min.y, b.max.y]) for (const zz of [b.min.z, b.max.z]) ecken.push(new THREE.Vector3(xx, yy, zz).project(cam));
    const x0 = Math.min(...ecken.map((q) => q.x)), x1 = Math.max(...ecken.map((q) => q.x)), y0 = Math.min(...ecken.map((q) => q.y)), y1 = Math.max(...ecken.map((q) => q.y));
    const bw = (x1 - x0) / 2 * w, bh = (y1 - y0) / 2 * h;   // Pixel
    const f = Math.max(bw / (w * 0.88), bh / ((unten - oben) * 0.9));
    const px = ((x0 + x1) / 2 + 1) / 2 * w, py = (1 - (y0 + y1) / 2) / 2 * h;
    const r = canvas.getBoundingClientRect();
    const a = aufBoden(r.left + px, r.top + py), c = aufBoden(r.left + w / 2, r.top + (oben + unten) / 2);
    if (a && c) { K.x += a.x - c.x; K.z += a.z - c.z; }
    K.halb = Math.min(140, Math.max(40, K.halb * f));
    kameraSetzen();
  }
}

/** Bildschirmpunkt (clientX/Y) auf einem Haus, an dem ein Antippen dieses Haus trifft (für Prüfskripte). */
function tippPunkt(id) {
  const x = sb?.haeuser.get(id);
  if (!x?.gruppe) return null;
  const b = new THREE.Box3().setFromObject(x.gruppe.updateWorldMatrix(true, true) ?? x.gruppe), r = canvas.getBoundingClientRect();
  const kand = [];
  for (let i = 1; i < 6; i++) for (let j = 1; j < 6; j++) kand.push(new THREE.Vector3(b.min.x + (b.max.x - b.min.x) * i / 6, b.min.y + (b.max.y - b.min.y) * 0.5, b.min.z + (b.max.z - b.min.z) * j / 6));
  for (const v of kand) {
    v.project(cam);
    const px = r.left + (v.x + 1) / 2 * r.width, py = r.top + (1 - v.y) / 2 * r.height;
    if (px > 10 && px < r.width - 10 && py > 160 && py < r.height - 120 && hausUnter(px, py) === id) return { x: px, y: py };
  }
  return null;
}

// Verschieben, Wischen mit Trägheit, Pinch-Zoom, Mausrad, Antippen (ui/karte.js)
const steuerung = karteSteuerung({ canvas, K, setzen: () => kameraSetzen(), aufBoden, tippen: (e) => { const id = hausUnter(e.clientX, e.clientY); if (id === 'bahn:hauptbahnhof') reise?.oeffne(); else if (id?.startsWith('angebot:')) oeffneModul(po, 'handeln', id.slice(8)); else if (id?.startsWith('hq:')) oeffneHq(id.slice(3)); else if (id?.startsWith('wb:')) oeffneWettbewerber(id.slice(3)); else if (id) oeffneHaus(id); } });
window.addEventListener('resize', kameraSetzen);

// ─────────────────────────────────────────── Stadt bauen
function raeumeSzene() {
  if (!scene) return;
  angebotPins = []; bahnhofPin = null; bahnhofOrt = null;
  clearInterval(wettbewerbPinTimer); wettbewerbPinTimer = null;
  for (const p of wettbewerbPins) { scene.remove(p); p.material?.map?.dispose(); p.material?.dispose(); }
  wettbewerbPins = [];
  const texs = new Set();
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) if (m.map && o.isSprite) { texs.add(m.map); m.dispose(); }
    if (o.isInstancedMesh && o.dispose) o.dispose();
  });
  for (const t of texs) t.dispose();
  scene.userData.sonne?.shadow?.map?.dispose();
  ren.renderLists.dispose();
}

function angebotsPinsAktualisieren() {
  if (!scene || !sb || !s) return;
  for (const p of angebotPins) { scene.remove(p); p.material?.dispose(); }
  angebotPins = [];
  for (const a of E.posteingang(s).handeln.filter((x) => x.art === 'angebot')) {
    for (const id of a.bezug?.hausIds ?? []) {
      const h = sb.haeuser.get(id);
      if (!h?.p) continue;
      const p = h.p;
      const pin = angebotMarker(scene, p.x + p.w / 2, Math.max(20, (h.e?.hoehe ?? 30) + 3), p.z + p.d / 2, 8);
      pin.userData.angebotId = a.id;
      angebotPins.push(pin);
    }
  }
}
/** Engine-Wettbewerber als klickbare, farbkodierte Pins. Ohne Eingriff in den Stadtplan. */
function wettbewerbPinsAktualisieren() {
  if (!scene || !sb || !s) return;
  clearInterval(wettbewerbPinTimer); wettbewerbPinTimer = null;
  for (const p of wettbewerbPins) { scene.remove(p); p.material?.map?.dispose(); p.material?.dispose(); }
  wettbewerbPins = [];
  const liste = E.wettbewerbFuerGrafik(s, stadtName);
  for (const w of liste) {
    let x = sb.wettbewerber.get(w.id);
    if (!x && w.inHartwigGebaeude && w.status !== 'geschlossen') x = sb.haeuser.get(w.inHartwigGebaeude);
    if (!x?.p) continue;
    const p = x.p;
    const c = document.createElement('canvas'); c.width = 96; c.height = 96;
    const g = c.getContext('2d'), farbe = WB_FARBEN[w.art] ?? '#67717b';
    g.beginPath(); g.arc(48, 48, 34, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
    g.beginPath(); g.arc(48, 48, 29, 0, Math.PI * 2); g.fillStyle = farbe; g.fill();
    if (w.rabatt > 0) {
      g.fillStyle = '#fff'; g.font = 'bold 38px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('%', 48, 49);
    } else {
      g.fillStyle = '#fff'; g.beginPath(); g.arc(48, 48, 8, 0, Math.PI * 2); g.fill();
    }
    const neu = w.status === 'eroeffnung' && s.woche - (w.seit ?? 0) < 4;
    if (neu) { g.strokeStyle = '#f3c951'; g.lineWidth = 6; g.beginPath(); g.arc(48, 48, 40, 0, Math.PI * 2); g.stroke(); }
    const pin = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
    pin.position.set(p.x + p.w / 2, Math.max(20, (x.e?.hoehe ?? 28) + 5), p.z + p.d / 2);
    pin.scale.set(10.5, 10.5, 1); pin.userData.wbId = w.id; pin.userData.puls = neu; pin.renderOrder = 30;
    scene.add(pin); wettbewerbPins.push(pin);
  }
  const puls = wettbewerbPins.filter((p) => p.userData.puls);
  if (puls.length) wettbewerbPinTimer = setInterval(() => {
    const t = performance.now() * 0.007;
    for (const p of puls) { const k = 10.5 + 2 * (1 + Math.sin(t)); p.scale.set(k, k, 1); }
    zeichnen();
  }, 260);
}

/** Eigener Bahnhofs-Pin auf dem vorhandenen Gleisband; keine Änderungen am Stadtplan-Generator. */
function bahnhofPinErstellen() {
  const p = plan.parzellen.find((q) => q.typ === 'slot:bahnhof') ??
    plan.bloecke?.find((b) => b.art === 'bahn' && !b.ohneBahnhof);
  if (!p) return;
  const x = p.x + p.w / 2, z = p.z + p.d / 2;
  bahnhofOrt = { x, z };
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#28465a'; g.beginPath(); g.arc(64, 61, 49, 0, Math.PI * 2); g.fill();
  g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 63px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('🚆', 64, 59);
  bahnhofPin = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  bahnhofPin.position.set(x, 42, z); bahnhofPin.scale.set(15, 15, 1); bahnhofPin.renderOrder = 35;
  scene.add(bahnhofPin);
}
function bahnhofBildpunkt() {
  if (!bahnhofPin || !cam) return null;
  const v = bahnhofPin.position.clone().project(cam), r = canvas.getBoundingClientRect();
  return { x: r.left + (v.x + 1) * r.width / 2, y: r.top + (1 - v.y) * r.height / 2 };
}
function bahnhofFokussieren() {
  if (!bahnhofOrt) return;
  K.x = bahnhofOrt.x; K.z = bahnhofOrt.z; K.halb = 63; kameraSetzen();
}

function baueStadtAusSpiel(name) {
  const t0 = performance.now();
  raeumeSzene();
  stadtName = name;
  const hqJson = hqGrafik();
  const d = stadtEintragAusSpiel(s, name);
  hqIdsStadt = hqIdsIn(hqJson, name);
  plan = stadtplan(d.seed, { typ: d.typ, archetyp: d.archetyp, region: d.region, strassenFaktor: 1.6, ...d.extra, standorte: d.standorte });
  if (hqJson) hqEinplanen(plan, hqJson, name);
  scene = neueSzene('#4fb6c2');
  scene.userData.sonne.shadow.mapSize.set(2048, 2048);
  wurzel = new THREE.Group();
  sb = spielBauer(s, { getrennt: true, wurzel, stadt: name, merk: merk(), hausLod: 'nah', hq: hqGrafik });
  // Grundgerüst: Straßen, Blöcke, Wasser, Stadtrandgürtel, Sonderbauten und Hartwig; normale Stadthäuser kommen als Kacheln
  const T = new KompaktSammler();
  const offen = [];
  const zahl = new Map();
  for (const p of plan.parzellen) zahl.set(p.typ, (zahl.get(p.typ) ?? 0) + 1);
  // In Kacheln: normale Stadthäuser und Hausreihen der Regionen (Slot-Typen, die mindestens fünfmal vorkommen), nicht
  // aber Standorte, weit sichtbare Landmarken und Slots mit eigenem Wasser
  const kachelTyp = (p) => !p.standort && !IMMER_GRUND.has(p.typ) && (HAUSTYPEN.has(p.typ) || (p.typ.startsWith('slot:') && zahl.get(p.typ) >= 5));
  const grund = new Proxy(sb.bauer, { get(z, typ) {
    const f = bauerFuer(z, typ);
    return (S, sc, p) => { if (!kachelTyp(p)) return f(S, sc, p); if (!p.leer) offen.push(p); return { hoehe: klotzHoehe(p) }; };
  } });
  setzeLod('fern');
  let e;
  try { e = baueStadt(T, scene, plan, grund); T.bauen(scene); entferneKleineSchilder(scene); } finally { setzeLod('nah'); }
  scene.add(wurzel);
  KA.teileGrund = T.anzahl;
  kachelnAnlegen(offen);
  // Pins: Hartwig, Sport, Wettbewerber und Zentrale wie im Katalog; freie Bürogebäude mit Schlüssel-Pin
  const pins = { warenhaus: 'hartwig', sport: 'hartwigSport', hq: 'hartwig' };
  setzeMarker(scene, plan, e, plan.standorte.filter((q) => !q.angebot && pins[q.rolle]).map((q) => ({ parzelle: q.parzelle, art: pins[q.rolle], groesse: 9 })));
  for (const q of plan.standorte.filter((x) => x.angebot)) { const pz = plan.parzellen.find((x) => x.id === q.parzelle); if (pz) angebotMarker(scene, pz.x + pz.w / 2, (e.hoehen.get(pz.id) ?? 30) + 2, pz.z + pz.d / 2, 9); }
  angebotsPinsAktualisieren();
  wettbewerbPinsAktualisieren();
  bahnhofPinErstellen();
  K.G = plan.kameraGrenze ?? { x0: 0, z0: 0, x1: plan.breite, z1: plan.tiefe };
  const nm = nahMitte(plan, 'einkauf', 62);
  K.x = nm.x; K.z = nm.z; K.halb = param.has('zoom') ? Number(param.get('zoom')) : 60;
  K._G = null;
  kameraSetzen();
  kachelnSichtbarBauen();
  const ms = Math.round(performance.now() - t0);
  messung.stadtMs.push({ stadt: name, ms, ...teileStand(), haeuser: sb.haeuser.size, kacheln: KA.liste.length });
  $('stadtname').textContent = name;
  return ms;
}
// ─────────────────────────────────────────── Kacheln (Detailstufen für das iPhone)
// Normale Stadthäuser werden je Kachel (ganze Blöcke, KACHEL m Raster) gebaut. Sichtbare Kacheln in voller Stufe ('fern'
// wie bisher), alle anderen als Klötzchen (Baukörper mit Dach in Fassaden- und Dachfarbe). Im Leerlauf werden Kacheln nahe
// der Kamera nachgebaut, bis BUDGET Teile erreicht sind; ferne volle Kacheln fallen dann auf Klötzchen zurück.
// Ganze Blöcke je Kachel und ein frischer Bauer je Kachel: Traufhöhe und Reihenstil je Block bleiben wie beim Bau der ganzen Stadt.
const KACHEL = 110, BUDGET = 112000, VOLL_MAX_ZOOM = 340;
const KA = { liste: [], teileGrund: 0, laeuft: false };
const HAUSTYPEN = new Set(['stadthaus', 'eck', 'hofhaus']);
const IMMER_GRUND = new Set(['slot:warenhaus', 'slot:premium', 'slot:sport', 'slot:wettbewerber', 'slot:hq', 'slot:dominante', 'slot:kirche', 'slot:hochhaus', 'slot:rathaus', 'slot:heizwerk', 'slot:dom', 'slot:fernsehturm', 'slot:wasserturm', 'slot:nord_kirche', 'slot:nord_kontorhaus', 'slot:nord_speicher', 'slot:nord_hafen', 'slot:center_passage']);
function klotzHoehe(p) { const g = p.hofbau ? 2 : p.typ === 'hofhaus' ? Math.max(2, (p.geschosse ?? 4) - 1) : p.geschosse ?? 4; return 4.2 + g * 3.3; }
function kachelnAnlegen(parzellen) {
  for (const k of KA.liste) entsorge(k);
  KA.liste = [];
  const bl = new Map(plan.bloecke.map((b) => [b.id, b]));
  const m = new Map();
  for (const p of parzellen) {
    const b = bl.get(p.block), cx = b ? b.x + b.w / 2 : p.x, cz = b ? b.z + b.d / 2 : p.z;
    const key = `${Math.floor(cx / KACHEL)}:${Math.floor(cz / KACHEL)}`;
    if (!m.has(key)) m.set(key, { key, parz: [], box: new THREE.Box3(), stufe: null, gruppe: null, teile: 0 });
    const k = m.get(key);
    k.parz.push(p);
    k.box.expandByPoint(new THREE.Vector3(p.x, 0, p.z)).expandByPoint(new THREE.Vector3(p.x + p.w, klotzHoehe(p) + 4, p.z + p.d));
  }
  KA.liste = [...m.values()];
  for (const k of KA.liste) klotzBauen(k);
}
function entsorge(k) { if (!k.gruppe) return; k.gruppe.parent?.remove(k.gruppe); k.gruppe.traverse((o) => o.geometry?.dispose()); k.gruppe = null; }
function klotzBauen(k) {
  entsorge(k);
  const S = new KompaktSammler(), g = new THREE.Group();
  for (const p of k.parz) {
    const r = rng(((p.seed ?? 1) * 13 + 7) >>> 0), H = klotzHoehe(p);
    const f = waehle(r, [...FARBEN.fassadeHell, ...FARBEN.fassadeHell, ...FARBEN.fassadeWarm, ...FARBEN.fassadeKuehl, ...FARBEN.backstein.slice(0, 2), ...FARBEN.putzBunt]);
    S.quader(p.x, 0, p.z, p.x + p.w, H, p.z + p.d, f);
    S.quader(p.x - 0.1, 4.0, p.z - 0.1, p.x + p.w + 0.1, 4.4, p.z + p.d + 0.1, dunkler(f, 0.08));
    const steil = !p.hofbau && p.typ !== 'hofhaus' && (p.geschosse ?? 4) <= 5 && r() < 0.75;
    if (steil) {
      const ax = p.w >= p.d ? 'x' : 'z', L = Math.max(p.w, p.d), T2 = Math.min(p.w, p.d);
      const dg = dachProfil(L, T2 + 0.4, Math.min(5, T2 * 0.4), 0.4, ax);
      dg.translate(p.x + p.w / 2, H, p.z + p.d / 2);
      S.add(dg, waehle(r, [...FARBEN.dach, ...FARBEN.ziegel]));
    } else S.quader(p.x + 0.3, H, p.z + 0.3, p.x + p.w - 0.3, H + 0.4, p.z + p.d - 0.3, waehle(r, FARBEN.dach));
  }
  S.bauen(g);
  scene.add(g);
  Object.assign(k, { gruppe: g, stufe: 'klotz', teile: S.anzahl });
}
function vollBauen(k) {
  const t0 = performance.now();
  const S = new KompaktSammler(), g = new THREE.Group(), b = echterBauer();
  setzeLod('fern');
  try { for (const p of k.parz) bauerFuer(b, p.typ)(S, g, p); S.bauen(g); entferneKleineSchilder(g); } finally { setzeLod('nah'); }
  entsorge(k);
  scene.add(g);
  Object.assign(k, { gruppe: g, stufe: 'voll', teile: S.anzahl });
  return performance.now() - t0;
}
function sichtbar(k, rand = 1.15) {
  const b = k.box; let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
  const v = new THREE.Vector3();
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { v.set(x, y, z).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
  return x1 > -rand && x0 < rand && y1 > -rand && y0 < rand;
}
const abstand = (k) => { const c = k.box.getCenter(new THREE.Vector3()); return Math.hypot(c.x - K.x, c.z - K.z); };
function teileStand() {
  let voll = 0, klotz = 0, nv = 0;
  for (const k of KA.liste) if (k.stufe === 'voll') { voll += k.teile; nv++; } else klotz += k.teile;
  const haeuser = [...(sb?.haeuser.values() ?? [])].reduce((a, x) => a + (x.e?.teile ?? 0), 0);
  const hq = [...(sb?.hqs?.values() ?? [])].reduce((a, x) => a + (x.teile ?? 0), 0);
  return { teile: KA.teileGrund + voll + klotz + haeuser + hq, teileGrund: KA.teileGrund, teileVoll: voll, teileKlotz: klotz, teileHartwig: haeuser, teileHq: hq, kachelnVoll: nv };
}
/** Nächste Kachel, die voll gebaut werden soll (sichtbar zuerst, dann nach Abstand), solange das Budget reicht. */
function naechsteKachel() {
  if (K.halb > VOLL_MAX_ZOOM) return null;
  const st = teileStand();
  const kand = KA.liste.filter((k) => k.stufe !== 'voll').map((k) => ({ k, s: sichtbar(k), d: abstand(k) })).sort((a, b) => (b.s - a.s) || (a.d - b.d));
  const n = kand[0];
  if (!n) return null;
  const schaetzung = n.k.parz.length * 380;
  if (st.teile + schaetzung <= BUDGET) return n.k;
  if (!n.s) return null;
  // sichtbare Kachel braucht Platz: fernste unsichtbare volle Kachel zurückstufen
  const weg = KA.liste.filter((k) => k.stufe === 'voll' && !sichtbar(k, 1.4)).sort((a, b) => abstand(b) - abstand(a))[0];
  if (!weg) return null;
  klotzBauen(weg);
  return n.k;
}
/** Sichtbare Kacheln sofort voll bauen (beim Stadtaufbau). */
function kachelnSichtbarBauen() {
  if (K.halb > VOLL_MAX_ZOOM) return;
  for (const k of KA.liste.filter((q) => q.stufe !== 'voll' && sichtbar(q, 1.05)).sort((a, b) => abstand(a) - abstand(b))) {
    if (teileStand().teile + k.parz.length * 380 > BUDGET) break;
    vollBauen(k);
  }
  zeichnen();
}
/** Im Leerlauf weiterbauen: je Schritt eine Kachel, dann neu zeichnen. */
function kachelnPlanen() {
  if (KA.laeuft || KA.pause || !KA.liste.length) return;
  KA.laeuft = true;
  const schritt = () => {
    const k = naechsteKachel();
    if (!k) { KA.laeuft = false; window.kachelnRuhig = true; return; }
    window.kachelnRuhig = false;
    messung.kachelMs.push(Math.round(vollBauen(k)));
    zeichnen();
    setTimeout(schritt, 16);
  };
  window.kachelnRuhig = false;
  setTimeout(schritt, 30);
}

const hqGrafik = () => (typeof E.hqFuerGrafik === 'function' ? E.hqFuerGrafik(s) : null);
const hqIdsIn = (j, name) => [...(j?.gebaeude ?? []), ...(j?.angebote ?? [])].filter((g) => g.stadt === name).map((g) => g.id).sort().join(',');
let hqIdsStadt = '';
/** Nach Woche oder Aktion: geänderte Häuser einzeln neu bauen; kommt ein Bürogebäude dazu oder fällt weg, die Stadt neu bauen. */
function grafikNachziehen() {
  if (hqIdsIn(hqGrafik(), stadtName) !== hqIdsStadt) {
    const k = { x: K.x, z: K.z, halb: K.halb };
    baueStadtAusSpiel(stadtName);
    Object.assign(K, k); kameraSetzen();
    return ['stadt'];
  }
  const geaendert = sb.aktualisiere();
  for (const id of geaendert) sb.neuBauen(id);
  wettbewerbPinsAktualisieren();
  if (geaendert.length) zeichnen();
  return geaendert;
}
const MERK = new Map();
function merk() { return MERK; }

// ─────────────────────────────────────────── Cockpit
function cockpitZeigen() {
  const c = E.cockpit(s);
  const kachel = (titel, wert, ton = '') => `<div class="kz ${ton}"><span>${titel}</span><b>${wert}</b></div>`;
  $('cockpit').innerHTML = [
    kachel('Cash', geld(c.cash), c.cash < 0 ? 'rot' : ''),
    kachel('Kreditrahmen frei', geld(c.kreditFrei), c.kreditFrei < 2e7 ? 'rot' : ''),
    kachel('EBITDA 13 Wochen', s.historie.length ? geld(c.ebitda13) : 'noch offen', !s.historie.length ? '' : c.ebitda13 < 0 ? 'rot' : 'gruen'),
    kachel('Umsatz Woche', s.historie.length ? geld(c.umsatzWoche) : 'noch offen'),
    kachel('Vertrauen', `${c.vertrauen} / 100`, c.vertrauen < 35 ? 'rot' : ''),
    kachel('Image', `${c.image} / 100`, c.image < 35 ? 'rot' : ''),
  ].join('');
  $('kw').textContent = `KW ${c.kw} / ${c.jahr}`;
  $('phase').textContent = c.phase === 'insolvenz' ? 'Insolvenzverfahren' : c.phase === 'zerschlagen' ? 'Zerschlagen' : '';
  $('phase').style.display = c.phase === 'regulaer' ? 'none' : '';
}

// ─────────────────────────────────────────── Woche weiter
function woche(mitBot = false) {
  if (s.phase === 'zerschlagen') return null;
  const davor = E.posteingang(s);
  const t0 = performance.now();
  if (mitBot) botSchritt(s);
  E.wocheAbspielen(s);
  const t1 = performance.now();
  const geaendert = grafikNachziehen();
  const t2 = performance.now();
  cockpitZeigen();
  if (offenesHaus) oeffneHaus(offenesHaus);
  else if (offenerWettbewerber) oeffneWettbewerber(offenerWettbewerber);
  else if (offenesHq) oeffneHq(offenesHq === true ? undefined : offenesHq);
  else for (const m of module()) if (m.aktiv()) m.neuZeichnen();
  ek.badge(); menueBadge();
  angebotsPinsAktualisieren();
  const danach = E.posteingang(s), alte = new Set(davor.handeln.map((x) => x.id)), meldungenVorher = new Set(davor.meldungen.map((x) => x.id));
  const neu = danach.handeln.filter((x) => !alte.has(x.id));
  const neueMeldungen = danach.meldungen.filter((x) => !meldungenVorher.has(x.id)).length;
  const text = 'KW ' + ((s.woche % 52) + 1) + ': ' +
    neu.filter((x) => x.art === 'angebot').length + ' neue Angebote, ' +
    neu.filter((x) => x.art === 'entscheidung').length + ' Entscheidungen, ' + neueMeldungen + ' Meldungen';
  const streifen = $('wochenstreifen');
  streifen.textContent = text;
  streifen.classList.toggle('an', mitBot);
  clearTimeout(streifenTimer);
  if (mitBot) streifenTimer = setTimeout(() => streifen.classList.remove('an'), 6000);
  zeichnen();
  const m = { woche: s.woche, engineMs: Math.round(t1 - t0), neuBauMs: Math.round(t2 - t1), neu: geaendert };
  messung.wocheMs.push(m);
  automatischSpeichern();
  return m;
}

/** Bot-Strategie C aus scripts/bot.ts (Schutzschirm, tiefe Sanierung) plus zwei Rabattaktionen, damit Aktionen sichtbar werden. */
function botSchritt(st) {
  botTief(st);
  if (st.woche === 24) E.fuehreAus(st, { typ: 'aktion', name: 'Sommer-Sale', rabatt: 0.2, wochen: 3, scope: { typ: 'alle' } });
  if (st.woche === 50) E.fuehreAus(st, { typ: 'aktion', name: 'Winterschlussverkauf', rabatt: 0.3, wochen: 3, scope: { typ: 'alle' } });
}

// ─────────────────────────────────────────── Panels
let st = null;
const module = () => [ek, vs, mk, pr, po, st].filter(Boolean);
function panel(titel, unter, html, klasse = '') {
  for (const m of module()) m.zu();
  menueZu();
  $('panel').classList.toggle('gross', klasse === 'gross');
  $('ptitel').textContent = titel;
  $('punter').textContent = unter;
  $('pinhalt').innerHTML = html;
  $('panel').classList.add('offen');
  document.body.classList.add('panel-offen');
}
function schliessePanel() { for (const m of module()) m.zu(); $('panel').classList.remove('offen'); document.body.classList.remove('panel-offen'); offenesHaus = null; offenesHq = null; offenerWettbewerber = null; }
/** Haus in den freien Kartenstreifen über dem Panel schieben (nur beim ersten Öffnen). */
function hausZeigen(id) {
  const x = sb?.haeuser.get(id);
  if (!x?.gruppe) return;
  x.gruppe.updateWorldMatrix(true, true);
  x.gruppe.updateWorldMatrix(true, true);
  const b = new THREE.Box3().setFromObject(x.gruppe), m = b.getCenter(new THREE.Vector3());
  const r = canvas.getBoundingClientRect(), oben = 70, unten = r.height * 0.38;
  const ziel = (oben + unten) / 2;
  const v = m.clone().project(cam), py = (1 - v.y) / 2 * r.height, px = (v.x + 1) / 2 * r.width;
  const a = aufBoden(r.left + px, r.top + py), c = aufBoden(r.left + r.width / 2, r.top + ziel);
  if (!a || !c) return;
  // passenden Zoom: Haus soll in den Streifen passen
  const hoehe = (unten - oben) * 0.9;
  const ecken = [];
  for (const xx of [b.min.x, b.max.x]) for (const yy of [b.min.y, b.max.y]) for (const zz of [b.min.z, b.max.z]) ecken.push(new THREE.Vector3(xx, yy, zz).project(cam));
  const hy = (Math.max(...ecken.map((q) => q.y)) - Math.min(...ecken.map((q) => q.y))) / 2 * r.height;
  if (hy > hoehe) K.halb *= hy / hoehe;
  K.x += a.x - c.x; K.z += a.z - c.z;
  kameraSetzen();
}
$('pzu').addEventListener('click', schliessePanel);

let hausEtageWahl = null, letztesInnenbild = null;
window.hausKlick = (art, id, nr) => {
  if (art === 'zu') { hausEtageWahl = null; oeffneHaus(offenesHaus); return; }
  hausEtageWahl = { id, nr: Number(nr) }; oeffneHaus(id); $('pinhalt').scrollTop = 0;
};
const AKTION_NAME = { sale: 'Sale', jubilaeum: 'Jubiläum', weihnachten: 'Weihnachten', blackfriday: 'Black Friday' };
window.premiumTun = (was, id) => {
  const a = was === 'schutz' ? { typ: 'premiumSchuetzen', an: s.premiumSchuetzen === false }
    : was === 'investieren' ? { typ: 'premiumInvestition', haus: id, betrag: 10_000_000 }
      : was === 'verhandeln' ? { typ: 'angebotVerhandeln', angebot: id, haeuser: [] }
        : was === 'verkaufen' ? { typ: 'angebotAnnehmen', angebot: id } : null;
  if (!a) return;
  const r = E.fuehreAus(s, a);
  meldung(r.text, r.ok);
  if (r.ok) { grafikNachziehen(); nachAktion(); if (offenesHaus) oeffneHaus(offenesHaus); }
};
function oeffneHaus(id) {
  const d = E.hausDetail(s, id);
  if (!d) return;
  const neu = offenesHaus !== id;
  offenesHaus = id; offenesHq = null; offenerWettbewerber = null;
  const h = d.haus, k = h.kpi;
  const z = sb.zustand(id);
  const bild = z ? [z.status, ...z.zusatz].filter((q) => q !== 'offen').map((q) => (q === 'aktion' && z.aktion ? `Aktion ${AKTION_NAME[z.aktion]}` : STATUS_TITEL[q])).join(' · ') : '';
  const qm = h.flaechen.reduce((a, f) => a + f.qm, 0);
  const zahl = (t, w, ton = '') => `<div class="kz ${ton}"><span>${t}</span><b>${w}</b></div>`;
  let html = `<div class="chips"><span class="chip ${h.status === 'offen' ? '' : 'warn'}">${STATUS_HAUS[h.status] ?? h.status}</span>${bild ? `<span class="chip">${bild}</span>` : ''}<span class="chip grau">${h.lage === '1a' ? '1a-Lage' : h.lage === 'b' ? 'B-Lage' : h.lage === 'center' ? 'Center' : 'Stadtrand'}</span></div>`;
  html += `<div class="raster">${zahl('Umsatz Woche', geld(k?.umsatz ?? 0))}${zahl('Deckungsbeitrag', geld(k?.db ?? 0), (k?.db ?? 0) < 0 ? 'rot' : 'gruen')}${zahl('Verkaufsfläche', fmt.format(qm) + ' qm')}${zahl('Substanz', Math.round(h.substanz) + ' / 100', h.substanz < 35 ? 'rot' : '')}</div>`;
  html += st?.hausGrafik(id) ?? '';
  if (h.klasse === 'premium') {
    const p = E.premiumUebersicht(s).find((q) => q.id === id);
    html += `<div class="karte"><div class="khead">Kronjuwel · Premiumsegment</div><div class="raster">${zahl('Premium-Image', Math.round(p?.image ?? 80) + ' / 100')}${zahl('Immobilien- & Marktwert', geld(p?.marktwert ?? 0))}${zahl('EBITDA-Marge (DB)', ((p?.marge ?? 0)*100).toFixed(1).replace('.', ',') + ' %')}${zahl('Aktionsschutz', p?.schutz ? 'Aktiv' : 'Aus')}</div>`;
    if (h.premiumEigentuemer) html += `<div class="zeile">Eigentümer: ${h.premiumEigentuemer}</div>`;
    else if (h.status === 'offen') html += `<div class="zeile"><button class="mini" onclick="premiumTun('schutz','${id}')">${p?.schutz ? 'Rabatt-Schutz aufheben' : 'Rabatt-Schutz aktivieren'}</button> <button class="mini" onclick="premiumTun('investieren','${id}')">10 Mio. € investieren</button></div>`;
    const an = s.angebote.find((a) => a.status === 'offen' && a.typ === 'premiumVerkauf' && a.wunschHaeuser?.includes(id));
    if (an) html += `<div class="zeile">Angebot: ${an.premiumKaeuferTyp || 'Investor'} · ${geld(an.kaufpreis ?? 0)} <button class="mini" onclick="premiumTun('verhandeln','${an.id}')">Nachverhandeln</button> <button class="mini" onclick="premiumTun('verkaufen','${an.id}')">Verkaufen</button></div>`;
    html += '</div>';
  }
  const shops = EQ.shops(s, h);
  if (hausEtageWahl?.id === id) {
    const b = innenBild(h, hausEtageWahl.nr);
    letztesInnenbild = { id, nr: hausEtageWahl.nr, shops: h.flaechen.filter((f) => f.etage === hausEtageWahl.nr && shops[f.gruppe] && ['eigen', 'kommission'].includes(f.konzept)).map((f) => shops[f.gruppe].name), teile: b.res?.anzahl };
    html += `<div class="karte haus3d"><img src="${b.url}" alt=""><div class="zeile"><span class="was"><b>${etageName(hausEtageWahl.nr)}</b> <i>Innenansicht</i></span><button class="mini" onclick="hausKlick('zu')">Schließen</button></div></div>`;
    if (b.nah) html += `<div class="karte haus3d"><img src="${b.nah}" alt=""><div class="zeile"><span class="dot" style="background:${b.shop.farbe}"></span><span class="was"><b>Eigenmarken-Shop ${b.shop.name}</b> <i>${Math.round(b.shop.anteil * 100)} % der Fläche</i></span></div></div>`;
  }
  for (const e of [...d.etagen].reverse()) {
    html += `<div class="karte"><div class="khead">${etageName(e.etage)}<button class="mini" onclick="hausKlick('etage','${id}',${e.etage})">Ansehen</button></div>`;
    if (!e.flaechen.length) html += '<div class="zeile grau">keine Fläche</div>';
    for (const f of e.flaechen) {
      const was = f.konzept === 'untermiete' ? (f.mieter ?? 'Untermieter') : f.konzept === 'leer' ? 'Leerfläche' : (f.gruppe ?? KONZEPT[f.konzept]);
      const art = f.konzept === 'eigen' || f.konzept === 'leer' || f.konzept === 'untermiete' ? (f.konzept === 'untermiete' ? 'Untermiete' : '') : KONZEPT[f.konzept];
      const umbau = f.umbauBis !== undefined && f.umbauBis > s.woche ? `<em>Umbau bis KW ${(f.umbauBis % 52) + 1}</em>` : '';
      const raw = h.flaechen.find((q) => q.id === f.id);
      const em = raw && shops[raw.gruppe] && ['eigen', 'kommission'].includes(raw.konzept) && !umbau ? `<em style="color:${shops[raw.gruppe].farbe}">Eigenmarken-Shop ${shops[raw.gruppe].name}</em>` : '';
      html += `<div class="zeile"><span class="dot k-${f.konzept}"></span><span class="was">${was}${art ? ` <i>${art}</i>` : ''}${umbau}${em}</span><span class="qm">${fmt.format(f.qm)} qm</span><span class="uq">${f.umsatzQm ? fmt.format(Math.round(f.umsatzQm)) + ' €/qm' : ''}</span></div>`;
    }
    html += '</div>';
  }
  html += '<div class="karte"><div class="khead">Konkurrenz in der Stadt</div>';
  if (!d.wettbewerber?.length) html += '<div class="zeile">Keine Wettbewerber in dieser Stadt</div>';
  for (const w of d.wettbewerber ?? []) {
    const wirkung = Object.entries(w.wirkung ?? {}).filter(([, v]) => v < 0)
      .sort((a, b) => a[1] - b[1]).slice(0, 3).map(([g, v]) => esc(E.GRUPPEN[g]?.name ?? g) + ' ' + v.toFixed(2) + ' %').join(' · ');
    html += '<button class="zeile wbdirekt" data-wb-id="' + esc(w.id) + '"><span class="was"><b>' +
      esc(w.name) + '</b> <i>' + esc(WB_ART[w.art] ?? w.art) + ' · ' + esc(WB_STATUS[w.status] ?? w.status) + '</i>' +
      (wirkung ? '<small>' + wirkung + '</small>' : '') + '</span><span>→</span></button>';
  }
  html += '</div>';
  panel(h.name, `${h.stadt} · ${h.klasse === 'premium' ? 'Premiumhaus' : h.format === 'sport' ? 'Sporthaus' : 'Warenhaus'} · Baujahr ${h.baujahr}`, html);
  if (neu) hausZeigen(id);
}

/** Lesendes Konkurrenzdetail aus den offiziellen Engine-Abfragen. */
function oeffneWettbewerber(id) {
  const w = E.wettbewerbFuerGrafik(s, stadtName).find((q) => q.id === id);
  const u = E.wettbewerbUebersicht(s, stadtName).find((q) => q.id === id);
  if (!w || !u) return;
  const neu = offenerWettbewerber !== id;
  offenerWettbewerber = id; offenesHaus = null; offenesHq = null;
  const start = w.seit === 0 ? 'Seit Spielbeginn' : 'Seit KW ' + ((w.seit % 52) + 1) + ' / Jahr ' + (Math.floor(w.seit / 52) + 1);
  const wirkung = Object.entries(u.wirkung ?? {}).sort((a, b) => a[1] - b[1]);
  let html = '<div class="chips"><span class="chip">' + esc(WB_ART[w.art] ?? w.art) + '</span><span class="chip">' +
    esc(WB_STATUS[w.status] ?? w.status) + '</span></div>';
  html += '<div class="karte"><div class="zeile"><span>Standort</span><b>' + esc(stadtName) + '</b></div>' +
    '<div class="zeile"><span>Status seit</span><b>' + esc(start) + '</b></div>' +
    '<div class="zeile"><span>Grundfläche</span><b>' + fmt.format(w.grundflaecheQm) + ' m²</b></div>' +
    '<div class="zeile"><span>Wettbewerbsstärke</span><b>' + Math.round(u.staerke * 100) + ' / 100</b></div>' +
    '<div class="zeile"><span>Aktuelle Aktion</span><b>' +
    (w.status === 'raeumung' ? 'Räumungsverkauf bis 70 %' : w.rabatt ? Math.round(w.rabatt * 100) + ' % Rabatt' : w.status === 'eroeffnung' ? 'Neueröffnung' : 'Keine') +
    '</b></div>' + (w.inHartwigGebaeude ? '<div class="zeile">Nachnutzung eines ehemaligen Hartwig-Standorts</div>' : '') + '</div>';
  html += '<div class="karte"><div class="khead">Wirkung auf Hartwig nach Warengruppe</div>' +
    wirkung.map(([g, v]) => '<div class="zeile"><span>' + esc(E.GRUPPEN[g]?.name ?? g) + '</span><b>' + Number(v).toFixed(2) + ' %</b></div>').join('') + '</div>';
  panel(w.name, esc(stadtName) + ' · ' + esc(WB_ART[w.art] ?? w.art), html);
  if (neu) {
    const x = sb.wettbewerber.get(id) ?? (w.inHartwigGebaeude ? sb.haeuser.get(w.inHartwigGebaeude) : null);
    if (x?.p) {
      K.x = x.p.x + x.p.w / 2; K.z = x.p.z + x.p.d / 2; kameraSetzen();
    }
  }
}
$('pinhalt').addEventListener('click', (e) => {
  const el = e.target.closest('[data-wb-id]');
  if (el) oeffneWettbewerber(el.dataset.wbId);
});

// ─────────────────────────────────────────── Zentrale (HQ)
const STUFE_FARBE = ['#c9c4bb', '#e0b23c', '#2f8f5b', '#2f63b5'];
let hqEtageWahl = null;   // { g: Gebäude-Id, nr } für den 3D-Schnitt
let hqRen = null;
/** Etagenschnitt aus hq.js als Bild (eigener kleiner Renderer, damit die Karte unberührt bleibt). */
function schnittBild(baue, w = 720, h = 420) {
  if (!hqRen) {
    hqRen = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: !sparsam, preserveDrawingBuffer: true });
    hqRen.setPixelRatio(1); hqRen.outputColorSpace = THREE.SRGBColorSpace; hqRen.shadowMap.enabled = !sparsam; hqRen.shadowMap.type = THREE.PCFShadowMap;
  }
  hqRen.setSize(w, h, false);
  const sc = neueSzene('#26313a');
  sc.userData.sonne.shadow.mapSize.set(2048, 2048);
  const S = new Sammler();
  const res = baue(S, sc);
  S.bauen(sc);
  const box = res?.box ?? new THREE.Box3().setFromObject(sc);
  sonneAuf(sc, box.getCenter(new THREE.Vector3()), box.getSize(new THREE.Vector3()).length() * 0.8 + 10);
  hqRen.render(sc, kameraFuer(w, h, box, 1.05));
  const url = hqRen.domElement.toDataURL('image/png');
  sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  sc.userData.sonne.shadow.map?.dispose();
  hqRen.renderLists.dispose();
  return { url, res };
}
function etagenBild(g, nr) { return schnittBild((S, sc) => hqEtage(S, sc, g, nr, {})).url; }
/** Innenraum einer Hausetage (grundriss.js) mit Eigenmarken-Shops: f.marke = { eigenmarke, name, farbe, anteil } je Fläche. */
function innenBild(h, nr) {
  const shops = EQ.shops(s, h);
  const haus = { ...h, flaechen: h.flaechen.map((f) => (shops[f.gruppe] && ['eigen', 'kommission'].includes(f.konzept) && !(f.umbauBis > s.woche) ? { ...f, marke: { eigenmarke: true, ...shops[f.gruppe] } } : f)) };
  const voll = schnittBild((S, sc) => etage(S, sc, haus, nr, {}), 720, 500);
  // Nahansicht des ersten Eigenmarken-Shops (gleiche Spaltenregel wie abteilung.js flaeche, Schritt 0)
  const z = voll.res?.zonen?.find((q) => q.flaeche?.marke?.eigenmarke);
  if (z) {
    const cols = [...new Set(z.zellen.map((c) => c.i))].sort((a, b) => a - b);
    const n = cols.length < 2 ? cols.length : Math.min(cols.length - 1, Math.max(1, Math.round(cols.length * (z.flaeche.marke.anteil ?? 0.3))));
    const sc = new Set(cols.slice(0, n)), zl = z.zellen.filter((c) => sc.has(c.i));
    const cx = (zl.reduce((a, c) => a + c.i, 0) / zl.length + 0.5) * RASTER, cz = (zl.reduce((a, c) => a + c.j, 0) / zl.length + 0.5) * RASTER;
    voll.nah = schnittBild((S, sc2) => etage(S, sc2, haus, nr, { ausschnitt: { x: cx - 15, z: cz - 12.5, w: 30, d: 25 } }), 720, 500).url;
    voll.shop = z.flaeche.marke;
  }
  return voll;
}
function hqTun(aktion) {
  const r = E.fuehreAus(s, aktion);
  meldung(r.text, r.ok);
  grafikNachziehen();
  cockpitZeigen();
  automatischSpeichern();
  oeffneHq(offenesHq === true ? undefined : offenesHq, true);
}
let meldungTimer = null;
function meldung(text, ok = true) {
  const m = $('meldung');
  m.textContent = text; m.className = ok ? 'an' : 'an rot';
  clearTimeout(meldungTimer); meldungTimer = setTimeout(() => { m.className = ''; }, 3500);
}
window.hqKlick = (art, a, b, c) => {
  if (art === 'mieten') { const an = E.hqUebersicht(s).angebote.find((q) => q.id === a); hqTun({ typ: 'hqMieten', angebot: a, etagen: an.etagen.map((e) => e.nr) }); }
  if (art === 'kuendigenE') hqTun({ typ: 'hqEtageKuendigen', gebaeude: a, etage: Number(b) });
  if (art === 'kuendigenG') hqTun({ typ: 'hqGebaeudeKuendigen', gebaeude: a });
  if (art === 'stufe') hqTun({ typ: 'abteilungStufe', abteilung: a, stufe: Number(b) });
  if (art === 'setzen') { const [g, nr] = String(b).split('|'); hqTun({ typ: 'abteilungSetzen', abteilung: a, gebaeude: g, etage: Number(nr) }); }
  if (art === 'etage') { hqEtageWahl = { g: a, nr: Number(b) }; oeffneHq(offenesHq === true ? undefined : offenesHq, true); }
};
function oeffneHq(gebaeudeId, bleiben = false) {
  if (typeof E.hqUebersicht !== 'function') return;
  offenesHaus = null; offenesHq = gebaeudeId ?? true;
  const u = E.hqUebersicht(s), j = hqGrafik();
  const zahl = (t, w, ton = '') => `<div class="kz ${ton}"><span>${t}</span><b>${w}</b></div>`;
  const pz = (x) => `${Math.round((x ?? 0) * 100)} %`;
  const knopf = (text, args, art = '') => `<button class="mini ${art}" onclick="hqKlick(${args.map((x) => `'${x}'`).join(',')})">${text}</button>`;
  let html = `<div class="raster">${zahl('Kosten Zentrale je Woche', geld(u.kostenWoche), u.kostenWoche > u.kostenStart ? 'rot' : '')}${zahl('Beschäftigte', fmt.format(Math.round(u.fte)) + ' FTE')}${zahl('davon Büromiete', geld((u.kosten?.miete ?? 0) + (u.kosten?.nebenkosten ?? 0)))}${zahl('Restmiete alter Büros', geld(u.restmieteWoche ?? 0), u.restmieteWoche > 0 ? 'rot' : '')}</div>`;
  // 3D-Schnitt der gewählten Etage (Standard: erste belegte Etage des gewählten bzw. ersten Gebäudes)
  const gs = u.gebaeude ?? [];
  const gWahl = gs.find((g) => g.id === hqEtageWahl?.g) ?? gs.find((g) => g.id === gebaeudeId) ?? gs[0];
  if (gWahl) {
    const nr = hqEtageWahl?.g === gWahl.id ? hqEtageWahl.nr : (gWahl.etagen.find((e) => e.abteilungen.length) ?? gWahl.etagen[0]).nr;
    const gj = j?.gebaeude?.find((q) => q.id === gWahl.id);
    if (gj) {
      const e = gWahl.etagen.find((q) => q.nr === nr);
      html += `<div class="karte schnitt"><img src="${etagenBild(gj, nr)}" alt=""><div class="zeile"><span class="was"><b>${gWahl.name}</b> <i>${nr === 0 ? 'Erdgeschoss' : `${nr}. Etage`} · ${(e?.abteilungen ?? []).map((a) => a.name).join(', ') || (e?.gemietet ? 'gemietet, frei' : 'nicht gemietet')}</i></span></div></div>`;
    }
  }
  const ziele = [];
  for (const g of gs) for (const e of g.etagen) if (e.gemietet) ziele.push({ v: `${g.id}|${e.nr}`, t: `${g.name.replace('Hartwig-', '')}, ${e.nr === 0 ? 'EG' : e.nr + '. Etage'} (${fmt.format(e.qm - e.belegtQm)} qm frei)` });
  for (const g of [...gs].sort((a, b) => (a.id === gebaeudeId ? -1 : b.id === gebaeudeId ? 1 : 0))) {
    html += `<div class="karte"><div class="khead">${g.name}<small>${g.stadt} · ${fmt.format(g.qmGemietet)} qm gemietet · ${pz(g.auslastung)} belegt · ${geld(g.kostenWoche)} je Woche</small>${gs.length > 1 ? knopf('Kündigen', ['kuendigenG', g.id], 'rot') : ''}</div>`;
    for (const e of [...(g.etagen ?? [])].sort((x, y) => y.nr - x.nr)) {
      const ab = (e.abteilungen ?? []).map((a) => a.name).join(', ');
      const gewaehlt = gWahl?.id === g.id && (hqEtageWahl?.g === g.id ? hqEtageWahl.nr === e.nr : false);
      html += `<div class="zeile klickbar ${e.gemietet ? '' : 'grau'} ${gewaehlt ? 'gewaehlt' : ''}" onclick="hqKlick('etage','${g.id}','${e.nr}')"><span class="dot ${e.gemietet ? (ab ? 'k-eigen' : 'k-untermiete') : 'k-leer'}"></span><span class="was">${e.nr === 0 ? 'Erdgeschoss' : `${e.nr}. Etage`}${ab ? ` <i>${ab}</i>` : e.gemietet ? ' <i>gemietet, frei</i>' : ' <i>nicht gemietet</i>'}</span><span class="qm">${fmt.format(e.qm)} qm</span><span class="uq">${e.gemietet ? pz(e.auslastung) : ''}</span>${e.gemietet && !ab ? knopf('Kündigen', ['kuendigenE', g.id, e.nr], 'rot') : ''}</div>`;
    }
    html += '</div>';
  }
  if (u.abteilungen?.length) {
    html += '<div class="karte"><div class="khead">Abteilungen</div>';
    for (const a of u.abteilungen) {
      const um = a.umzugBis !== undefined && a.umzugBis > s.woche ? ` · Umzug bis KW ${(a.umzugBis % 52) + 1}` : '';
      const ort = a.gebaeudeId ? `${a.gebaeudeId}|${a.etage}` : '';
      const wahl = `<select class="ort" onchange="hqKlick('setzen','${a.id}',this.value)">${ort ? '' : '<option selected>ohne Platz</option>'}${ziele.map((z) => `<option value="${z.v}"${z.v === ort ? ' selected' : ''}>${z.t}</option>`).join('')}</select>`;
      html += `<div class="abt"><div class="zeile"><span class="dot" style="background:${HQ_ABT[a.id]?.farbe ?? STUFE_FARBE[a.stufe]}"></span><span class="was"><b>${a.name}</b> <i>${fmt.format(Math.round(a.fte))} von ${fmt.format(a.sollFte)} FTE · ${geld(a.kostenWoche)} je Woche${um}</i><em class="wirk">${a.wirkung ?? ''}</em></span><span class="stufe">${knopf('−', ['stufe', a.id, a.stufe - 1])}<b>${a.stufe}</b>${knopf('+', ['stufe', a.id, a.stufe + 1])}</span></div><div class="zeile unter">${wahl}</div></div>`;
    }
    html += '</div>';
  }
  if (u.angebote?.length) {
    html += '<div class="karte"><div class="khead">Freie Bürogebäude</div>';
    for (const a of u.angebote) {
      const qm = a.etagen.reduce((x, e) => x + e.qm, 0), k = a.etagen.reduce((x, e) => x + e.kostenWoche, 0);
      html += `<div class="zeile"><span class="dot k-leer"></span><span class="was">${a.name} <i>${a.stadt} · ${a.etagen.length} Etagen · ${fmt.format(qm)} qm · ${geld(k)} je Woche · Frist KW ${(a.frist % 52) + 1}</i></span>${knopf('Mieten', ['mieten', a.id], 'gruen')}</div>`;
    }
    html += '</div>';
  }
  const weitere = (u.staedte ?? []).filter((q) => q !== u.sitz);
  const sc = $('pinhalt').scrollTop;
  panel('Zentrale', `Sitz ${u.sitz}${weitere.length ? ` · auch in ${weitere.join(', ')}` : ''} · ${gs.length} Gebäude`, html);
  if (bleiben) $('pinhalt').scrollTop = sc;
}

// ─────────────────────────────────────────── Einkauf und Eigenmarken (ui/einkauf.js, ui/eigenmarken.js)
const EQ = quelle(E);
let ek = null;
ek = einkaufModul({ E, q: EQ, s: () => s, panel, meldung, nachAktion: () => { cockpitZeigen(); ek.badge(); menueBadge(); automatischSpeichern(); } });
function oeffneEinkauf(seite = 'uebersicht', arg) { offenesHaus = null; offenesHq = null; ek.oeffne(seite, arg); }
$('einkauf').addEventListener('click', () => oeffneEinkauf());
// ─────────────────────────────────────────── Vorstand, Marketing, Produktentwicklung (ui/vorstand.js, marketing.js, produkte.js)
let vs = null, mk = null, pr = null, po = null;
const nachAktion = () => { cockpitZeigen(); ek.badge(); menueBadge(); angebotsPinsAktualisieren(); zeichnen(); automatischSpeichern(); };
vs = vorstandModul({ E, s: () => s, panel, meldung, nachAktion });
mk = marketingModul({ E, s: () => s, panel, meldung, nachAktion });
pr = produkteModul({ E, s: () => s, panel, meldung, nachAktion });
po = posteingangModul({
  E, s: () => s, panel, meldung, nachAktion, zustand: () => postUi, nachZustand: automatischSpeichern,
  springe: (bezug) => {
    if (bezug.modul && !bezug.hausIds?.length && !bezug.stadt) {
      if (bezug.modul === 'einkauf') return oeffneEinkauf();
      if (bezug.modul === 'vorstand') return oeffneModul(vs);
      if (bezug.modul === 'marketing') return oeffneModul(mk);
      if (bezug.modul === 'produkte') return oeffneModul(pr);
      if (bezug.modul === 'zentrale') return oeffneHq();
    }
    if (bezug.stadt && bezug.stadt !== stadtName) {
      wahl.value = bezug.stadt;
      baueStadtAusSpiel(bezug.stadt);
    }
    const hausId = bezug.hausIds?.find((id) => sb?.haeuser.has(id));
    if (bezug.wettbewerberId) oeffneWettbewerber(bezug.wettbewerberId);
    else if (hausId) oeffneHaus(hausId);
    else if (bezug.modul === 'einkauf') oeffneEinkauf();
    else if (bezug.modul === 'vorstand') oeffneModul(vs);
    else if (bezug.modul === 'marketing') oeffneModul(mk);
    else if (bezug.modul === 'produkte') oeffneModul(pr);
    else if (bezug.modul === 'zentrale') oeffneHq();
    else schliessePanel();
  },
});

st = statistikModul({ E, s: () => s, panel, oeffneHaus });
// ─────────────────────────────────────────── Reise & Wochenabschluss
reise = reiseModul({
  stadt: () => stadtName,
  staedte: () => STADTLISTE.filter((d) => s?.haeuser.some((h) => h.stadt === d.name)).map((d) => {
    const hs = s.haeuser.filter((h) => h.stadt === d.name && h.status !== 'geschlossen');
    const zahl = (rolle) => d.standorte.filter((p) => p.rolle === rolle).length;
    const formate = [['Hartwig', hs.filter((h) => h.format === 'warenhaus').length], ['Volkskauf', zahl('schwester')], ['Sport', hs.filter((h) => h.format === 'sport').length], ['FUNDUS', zahl('outlet')]];
    return { name: d.name, region: d.region, umsatz: hs.reduce((sum, h) => sum + (h.kpi?.umsatz ?? 0), 0),
      formate: formate.filter((p) => p[1]).map((p) => p[0] + ' ' + p[1]).join(' · ') };
  }),
  pinPunkt: bahnhofBildpunkt,
  zuletzt: () => postUi.reiseZuletzt ?? [],
  besucht: (namen) => { postUi.reiseZuletzt = namen; },
  bauen: (name) => { schliessePanel(); baueStadtAusSpiel(name); wahl.value = name; },
  bahnhofFokussieren,
  fertig: () => automatischSpeichern(),
  fehler: (e) => { console.error('Bahnreise fehlgeschlagen:', e); meldung('Stadtwechsel fehlgeschlagen', false); },
});
wochenbericht = wochenberichtModul({
  modus: () => postUi.wochenbericht ?? 'voll', warnen: () => postUi.warnen,
  cockpit: () => E.cockpit(s), posteingang: () => E.posteingang(s),
  historie: () => s.historie, wocheNr: () => s.woche,
  woche: () => woche(false), sperren: () => { $('weiter').disabled = true; },
  entsperren: () => { $('weiter').disabled = false; },
  oeffneVorgang: (id) => oeffneModul(po, 'handeln', id),
  fehler: (e) => { console.error('Wochenabschluss fehlgeschlagen:', e); meldung('Woche konnte nicht abgeschlossen werden', false); },
});
$('stadt-reise').addEventListener('click', () => { schliessePanel(); menueZu(); reise.oeffne(); });
$('wochenbericht-modus').addEventListener('change', (e) => { postUi.wochenbericht = e.target.value; automatischSpeichern(); });

const oeffneModul = (m, ...a) => { offenesHaus = null; offenesHq = null; m.oeffne(...a); };
$('vorstand').addEventListener('click', () => oeffneModul(vs));
$('marketing').addEventListener('click', () => oeffneModul(mk));
$('produkte').addEventListener('click', () => oeffneModul(pr));
$('statistik').addEventListener('click', () => oeffneModul(st));
$('posteingang').addEventListener('click', () => oeffneModul(po));
$('postdirekt').addEventListener('click', () => oeffneModul(po));
$('wochenstreifen').addEventListener('click', () => { $('wochenstreifen').classList.remove('an'); oeffneModul(po); });
$('postwarnung').addEventListener('change', (e) => { postUi.warnen = e.target.checked; automatischSpeichern(); });
// Menü wie Coffee Inc: Knopf unten rechts öffnet die Kacheln Zentrale, Einkauf, Vorstand, Marketing, Produkte
function menueZu() { $('menue').classList.remove('offen'); $('menueknopf').classList.remove('an'); }
$('menueknopf').addEventListener('click', () => { const o = !$('menue').classList.contains('offen'); if (o) { schliessePanel(); } $('menue').classList.toggle('offen', o); $('menueknopf').classList.toggle('an', o); });
$('menue').addEventListener('click', (e) => { if (e.target === $('menue')) menueZu(); });
function menueBadge() {
  const n = (s ? E.freigaben(s).anzahl : 0), v = vs?.badge() ?? 0, b = $('menuebadge');
  const p = po?.badge() ?? 0;
  b.textContent = n + p; b.style.display = n + p ? '' : 'none';
  const vb = $('vsbadge'); vb.textContent = v; vb.style.display = v ? '' : 'none';
}
$('spiel-speichern').addEventListener('click', async () => {
  menueZu();
  try { await sofortSpeichern(); meldung('Spielstand auf diesem Gerät gespeichert.'); }
  catch (e) { speicherFehler(e); }
});
async function diagnoseZeigen() {
  if (!s || !scene) return;
  menueZu();
  panel('Performance', 'Messung direkt auf diesem Gerät', '<div class="karte"><div class="zeile">Bis zu 90 Frames werden aktiv gerendert …</div></div>', 'gross');
  const vorher = KA.pause;
  KA.pause = true;
  try {
    const d = await performanceMessen({ renderer: ren, scene: () => scene, camera: () => cam,
      info: () => ({ stadt: stadtName, woche: s.woche, teile: teileStand().teile, bild: canvas.width + ' × ' + canvas.height, grafikprofil: sparsam ? 'sparsam' : 'hoch' }) });
    const zeile = (name, wert) => `<div class="zeile"><span class="was">${name}</span><b>${wert}</b></div>`;
    const html = '<div class="karte"><div class="khead">' + d.frames + ' gerenderte Frames auf diesem Gerät</div>' +
      zeile('Geschätzte Bildrate', d.fps + ' FPS') +
      zeile('Framezeit, 95. Perzentil', d.frameP95Ms + ' ms') +
      zeile('Renderaufruf, 95. Perzentil', d.renderP95Ms + ' ms') +
      zeile('Frames über 33 ms', d.frameUeber33ms + ' / ' + (d.frames - 1)) +
      zeile('Draw Calls', d.drawCalls) +
      zeile('Dreiecke', fmt.format(d.dreiecke)) +
      zeile('Geometrien / Texturen', d.geometrien + ' / ' + d.texturen) +
      zeile('Teile der Stadt', fmt.format(d.teile)) +
      zeile('Canvas', d.bild) +
      zeile('Pixelratio', d.pixelRatio) +
      zeile('Grafikprofil', d.grafikprofil) +
      '</div><div class="leise">Messung unter laufender Karte, kein GPU-Profiler. Bei Rucklern echte Hardware und Safari-Version dokumentieren.</div>';
    panel('Performance', d.stadt + ' · KW ' + (d.woche + 1), html, 'gross');
    window.spiel.letzteDiagnose = d;
  } catch (e) {
    panel('Performance', 'Messung fehlgeschlagen', '<div class="karte"><div class="zeile">' + e.message + '</div></div>', 'gross');
  } finally {
    KA.pause = vorher;
    if (!KA.pause) kachelnPlanen();
  }
}
$('performance').addEventListener('click', diagnoseZeigen);

// ─────────────────────────────────────────── Start
// Schwierigkeit: Engine-Konstante SCHWIERIGKEITEN, sonst Ersatz mit denselben Ids
const SCHWIERIGKEITEN = Array.isArray(E.SCHWIERIGKEITEN) && E.SCHWIERIGKEITEN.length ? E.SCHWIERIGKEITEN : [
  { id: 'leicht', name: 'Leicht', beschreibung: 'Mehr Liquidität, geduldige Banken und Lieferanten.' },
  { id: 'mittel', name: 'Mittel', beschreibung: 'Die Ausgangslage wie kalibriert.' },
  { id: 'schwer', name: 'Schwer', beschreibung: 'Knappe Kasse, nervöse Gläubiger, wenig Zeit.' },
];
let schwierigkeitId = 'mittel';
function neuesSpiel(seed = 1, stadt = 'Essen', schwierigkeit = schwierigkeitId) {
  schwierigkeitId = SCHWIERIGKEITEN.some((x) => x.id === schwierigkeit) ? schwierigkeit : 'mittel';
  s = E.neuesSpiel(seed, { schwierigkeit: schwierigkeitId });
  postUi = neuerPostUi(); $('postwarnung').checked = true; $('wochenbericht-modus').value = postUi.wochenbericht;
  $('stufe').textContent = SCHWIERIGKEITEN.find((x) => x.id === schwierigkeitId)?.name ?? schwierigkeitId;
  MERK.clear();
  EQ.freigaben(s);
  cockpitZeigen();
  baueStadtAusSpiel(stadt);
  ek.badge(); menueBadge();
  window.spiel.s = s;
  automatischSpeichern();
  return s;
}

const wahl = $('stadtwahl');
wahl.innerHTML = STADTLISTE.map((q) => `<option${q.name === 'Essen' ? ' selected' : ''}>${q.name}</option>`).join('');
wahl.addEventListener('change', () => { reise?.zu(); schliessePanel(); menueZu(); $('lade').classList.add('an'); setTimeout(() => { baueStadtAusSpiel(wahl.value); automatischSpeichern(); $('lade').classList.remove('an'); }, 30); });
$('weiter').addEventListener('click', () => {
  if ($('weiter').disabled) return;
  if ($('bot').checked) {
    $('weiter').disabled = true;
    setTimeout(() => { try { woche(true); } finally { $('weiter').disabled = false; } }, 10);
  } else wochenbericht.oeffne();
});
if (typeof E.hqUebersicht === 'function') $('hq').addEventListener('click', () => oeffneHq()); else $('hq').style.display = 'none';

window.spiel = { neuesSpiel, speichern: sofortSpeichern, statistik: st, oeffneStatistik: (...a) => oeffneModul(st, ...a), posteingang: po, oeffnePosteingang: (...a) => oeffneModul(po, ...a), performanceMessen: diagnoseZeigen, oeffneEinkauf, vorstand: vs, marketing: mk, produkte: pr, oeffneVorstand: (...a) => oeffneModul(vs, ...a), oeffneMarketing: (...a) => oeffneModul(mk, ...a), oeffneProdukte: (...a) => oeffneModul(pr, ...a), kachelnPause: (an) => { KA.pause = an; if (!an) kachelnPlanen(); }, hausEtage: (id, nr) => window.hausKlick('etage', id, nr), get innenbild() { return letztesInnenbild; }, get einkauf() { return ek; }, EQ, pruefeEinkauf: () => ek.pruefe(),
  oeffneWettbewerber,
  reise, wochenbericht, bahnhofFokussieren, bahnhofBildpunkt,
  pruefeWettbewerber: () => {
    const soll = E.wettbewerbFuerGrafik(s, stadtName);
    const gezeigt = new Set([...sb.wettbewerber.keys(), ...soll.filter((w) => w.inHartwigGebaeude && w.status !== 'geschlossen' && sb.haeuser.has(w.inHartwigGebaeude)).map((w) => w.id)]);
    const pinIds = new Set(wettbewerbPins.map((p) => p.userData.wbId));
    const fehler = soll.filter((w) => w.status !== 'geschlossen' && !gezeigt.has(w.id)).map((w) => 'Fehlt: ' + w.id);
    for (const id of gezeigt) if (!pinIds.has(id)) fehler.push('Pin fehlt: ' + id);
    return { stadt: stadtName, woche: s.woche, quelle: soll.length, dargestellt: gezeigt.size, pins: pinIds.size, fehler };
  }, stadt: (n) => { wahl.value = n; return baueStadtAusSpiel(n); }, woche, bot: botSchritt, oeffneHaus, schliessePanel, oeffneHq, messung, jetztZeichnen,
  /** Prüfung für spiel-render.js: angezeigte Werte (Cockpit, offenes HQ-Panel) gegen cockpit() und hqUebersicht(). */
  pruefeAnzeigen: () => {
    const fehler = [], c = E.cockpit(s);
    const kz = (wurzel) => new Map([...wurzel.querySelectorAll('.kz')].map((k) => [k.querySelector('span').textContent, k.querySelector('b').textContent]));
    const ck = kz($('cockpit'));
    const soll = { Cash: geld(c.cash), 'Kreditrahmen frei': geld(c.kreditFrei), Vertrauen: `${c.vertrauen} / 100`, Image: `${c.image} / 100` };
    if (s.historie.length) Object.assign(soll, { 'EBITDA 13 Wochen': geld(c.ebitda13), 'Umsatz Woche': geld(c.umsatzWoche) });
    for (const [k, v] of Object.entries(soll)) if (ck.get(k) !== v) fehler.push(`Cockpit ${k}: ${ck.get(k)} statt ${v}`);
    if ($('kw').textContent !== `KW ${c.kw} / ${c.jahr}`) fehler.push(`KW: ${$('kw').textContent}`);
    if (offenesHq && typeof E.hqUebersicht === 'function') {
      const u = E.hqUebersicht(s), hk = kz($('pinhalt'));
      const sollHq = { 'Kosten Zentrale je Woche': geld(u.kostenWoche), 'Beschäftigte': fmt.format(Math.round(u.fte)) + ' FTE' };
      for (const [k, v] of Object.entries(sollHq)) if (hk.get(k) !== v) fehler.push(`HQ ${k}: ${hk.get(k)} statt ${v}`);
    }
    return { woche: s.woche, kw: c.kw, jahr: c.jahr, cockpit: c, hq: typeof E.hqUebersicht === 'function' ? { kostenWoche: E.hqUebersicht(s).kostenWoche, fte: E.hqUebersicht(s).fte } : null, fehler };
  },
  teileStand: () => teileStand(), kachelInfo: () => KA.liste.filter((k) => k.stufe !== 'voll' && sichtbar(k, 1.0)).map((k) => `${k.key}:${k.parz.length}`).join(' '), kachelnRuhig: () => !KA.laeuft,
  karte: {
    /** Messwerte der Kartengrenze: Zoomgrenzen, Bildbreite, Anteil an der Stadtbreite, Bildecken gegen G plus Gürtel. */
    messen: () => {
      const [w, h] = groesse(), a = w / h, G = K.G, E = erweitert(G), ecken = bildecken(K, a);
      const drin = ecken.every((p) => p.x >= E.x0 - 0.01 && p.x <= E.x1 + 0.01 && p.z >= E.z0 - 0.01 && p.z <= E.z1 + 0.01);
      const bildbreite = 2 * K.halb * a;
      return { stadt: stadtName, G, E, halb: K.halb, min: K.min, max: K.max, zoom: K.zoom, mitte: { x: K.x, z: K.z }, mitteInG: K.x >= G.x0 && K.x <= G.x1 && K.z >= G.z0 && K.z <= G.z1, bildbreite, anteilBreite: bildbreite / (G.x1 - G.x0), anteilProjiziert: bildbreite / ((G.x1 - G.x0 + G.z1 - G.z0) / Math.SQRT2), ecken, eckenInE: drin };
    },
    /** Hintergrund magenta, rendern, Pixel zählen, die kein Boden decken (Kartenrand sichtbar). */
    randPixel: () => {
      const alt = scene.background; scene.background = new THREE.Color('#ff00ff');
      ren.render(scene, cam);
      const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
      const g = c.getContext('2d'); g.drawImage(canvas, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 235 && d[i + 1] < 25 && d[i + 2] > 235) n++;
      scene.background = alt; ren.render(scene, cam);
      return { randPixel: n, pixel: c.width * c.height };
    },
    get laeuft() { return steuerung.laeuft; }, get info() { return steuerung.info; },
  },
  kamera: (o) => { Object.assign(K, o); kameraSetzen(); }, tippPunkt, fokusHaeuser, THREE, get K() { return K; }, get sb() { return sb; }, E };
// ─────────────────────────────────────────── Startbildschirm (Startstadt, Schwierigkeit, Seed); mit URL-Parametern direkt ins Spiel
const startWahl = { stadt: param.get('stadt') ?? 'Essen', schwierigkeit: param.get('schwierigkeit') ?? 'mittel', seed: Number(param.get('seed') ?? 1) };
function startZeigen() {
  $('startstadt').innerHTML = STADTLISTE.map((q) => `<option${q.name === startWahl.stadt ? ' selected' : ''}>${q.name}</option>`).join('');
  $('startstufen').innerHTML = SCHWIERIGKEITEN.map((x) => `<button class="stufe-karte ${x.id === startWahl.schwierigkeit ? 'an' : ''}" data-v="${x.id}"><span class="sterne-stufe">${'●'.repeat(1 + SCHWIERIGKEITEN.indexOf(x))}${'○'.repeat(SCHWIERIGKEITEN.length - 1 - SCHWIERIGKEITEN.indexOf(x))}</span><b>${x.name}</b><small>${x.beschreibung}</small></button>`).join('');
  $('startseed').value = startWahl.seed;
  $('start').classList.add('an');
  $('lade').classList.remove('an');
  laden().then((datensatz) => {
    const b = $('fortsetzen');
    b.hidden = !datensatz;
    if (datensatz) b.textContent = `Fortsetzen · KW ${datensatz.spiel.woche % 52 + 1} / ${datensatz.spiel.startJahr + Math.floor(datensatz.spiel.woche / 52)}`;
    $('speicherhinweis').textContent = '';
  }).catch((e) => { $('fortsetzen').hidden = true; $('speicherhinweis').textContent = e.message; });
}
$('startstufen').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; startWahl.schwierigkeit = b.dataset.v; startZeigen(); });
$('startstadt').addEventListener('change', (e) => { startWahl.stadt = e.target.value; });
$('startseed').addEventListener('change', (e) => { startWahl.seed = Math.max(1, Math.round(Number(e.target.value) || 1)); });
function spielStarten() {
  $('start').classList.remove('an');
  $('lade').classList.add('an');
  setTimeout(() => {
    wahl.value = startWahl.stadt;
    neuesSpiel(startWahl.seed, startWahl.stadt, startWahl.schwierigkeit);
    $('lade').classList.remove('an');
    window.bereit = true;
  }, 30);
}
$('startknopf').addEventListener('click', spielStarten);
async function spielFortsetzen() {
  const b = $('fortsetzen');
  b.disabled = true;
  try {
    const d = await laden();
    if (!d) throw new Error('Kein Spielstand vorhanden.');
    clearTimeout(speicherTimer);
    s = d.spiel;
    postUi = { ...neuerPostUi(), ...(d.ui ?? {}) };
    if (!Array.isArray(postUi.gelesen)) postUi.gelesen = [];
    $('postwarnung').checked = postUi.warnen;
    $('wochenbericht-modus').value = ['voll', 'kurz', 'aus'].includes(postUi.wochenbericht) ? postUi.wochenbericht : 'voll';
    schwierigkeitId = s.schwierigkeit ?? 'mittel';
    $('stufe').textContent = SCHWIERIGKEITEN.find((x) => x.id === schwierigkeitId)?.name ?? schwierigkeitId;
    MERK.clear();
    schliessePanel();
    wahl.value = STADTLISTE.some((x) => x.name === d.stadt) ? d.stadt : 'Essen';
    $('start').classList.remove('an');
    $('lade').classList.add('an');
    // Kartenaufbau erst nach dem Zeichnen des Ladebildschirms.
    await new Promise((resolve) => setTimeout(resolve, 30));
    cockpitZeigen();
    baueStadtAusSpiel(wahl.value);
    ek.badge(); menueBadge();
    window.spiel.s = s;
    window.bereit = true;
    $('lade').classList.remove('an');
    meldung('Spielstand fortgesetzt.');
  } catch (e) {
    $('lade').classList.remove('an');
    $('start').classList.add('an');
    $('speicherhinweis').textContent = e.message;
  } finally {
    b.disabled = false;
  }
}
$('fortsetzen').addEventListener('click', spielFortsetzen);
window.spiel.fortsetzen = spielFortsetzen;
window.spiel.startZeigen = startZeigen;
window.spiel.SCHWIERIGKEITEN = SCHWIERIGKEITEN;
Object.defineProperty(window.spiel, 'schwierigkeit', { get: () => schwierigkeitId });
setTimeout(() => {
  if (param.has('stadt') || param.has('schwierigkeit') || param.has('seed')) spielStarten();
  else startZeigen();
}, 20);

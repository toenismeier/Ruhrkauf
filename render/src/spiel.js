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
import { warenhaus } from './kit/warenhaus.js';
import { stadtplan, baueStadt, baueStadtGestuft, setzeMarker, bauerFuer, dachFlaechenBeimBau } from './kit/stadt.js';
import { STADTLISTE } from './kit/staedte.js';
import { nahMitte } from './kit/stadtrand.js';
import { lebenModul } from './kit/leben.js';
import { stadtEintragAusSpiel, spielBauer } from './kit/bruecke.js';
import { hausDachpunkt, dachpunkt, baueHauspin, pinGroessen } from './kit/hauspins.js';
import { jahreszeitenStadt, jahreszeit } from './kit/jahreszeit.js';
import { STATUS_TITEL } from './kit/zustaende.js';
import { geld, fmt, esc } from './ui/format.js';
import { quelle } from './ui/quelle.js';
import { einkaufModul } from './ui/einkauf.js';
import { karteSteuerung, klemmen, bildecken, erweitert } from './ui/karte.js';
import { vorstandModul } from './ui/vorstand.js';
// O01 Organisation
import { organisationModul } from './ui/organisation.js';
import { zentraleAbteilungHtml } from './ui/zentrale-abteilungen.js';
import { posteingangModul } from './ui/posteingang.js';
import { zeitungModul } from './ui/zeitung.js';
import { statistikModul } from './ui/statistik.js';
import { marketingModul } from './ui/marketing.js';
import { umbauModul } from './ui/umbau.js';
import { produkteModul } from './ui/produkte.js';
import { laden, speichern, speicherDiagnose } from './ui/speicher.js';
import { portfolioModul } from './ui/portfolio.js';
import { appModul } from './ui/app.js';
import { messen as performanceMessen } from './ui/diagnose.js';
import { reiseModul } from './ui/reise.js';
import { wochenberichtModul } from './ui/wochenbericht.js';
import { ecommerceModul } from './ui/ecommerce.js';
import { chronikModul } from './ui/chronik.js';
import { hausbesuchModul } from './ui/hausbesuch.js';
import { szenarienModul } from './ui/szenarien.js';
import { tonModul } from './ui/ton.js';
import { einfuehrungModul } from './ui/einfuehrung.js';
import { erfolgeModul } from './ui/erfolge.js';
import { spielendeModul } from './ui/spielende.js';
import { werkzeugeModul } from './ui/werkzeuge.js';
import { einstellung, einstellungenModul, aktiviereBarrierefreiheit } from './ui/einstellungen.js';
// O02 Umsatztreiber
import { reportingModul, hausTreiberZeile } from './ui/reporting.js';
// O03 IT
import { itModul } from './ui/it.js';
import { planungModul } from './ui/planung.js';
// O07 Haus
import { hausSteckbrief, hausBeobachtungHtml, hausReportingHtml, hausStatischHtml } from './ui/haus.js';
// O04 Personal
import { personalModul } from './ui/personaleinsatz.js';

const param = new URLSearchParams(location.search);
// Test- und Entwicklungssteuerung ist außerhalb von ?dev=1 unsichtbar.
if (param.get('dev') === '1') document.querySelector('.botwahl')?.style.setProperty('display', 'flex');
const $ = (id) => document.getElementById(id);
const messung = { stadtMs: [], wocheMs: [], neuBauMs: [], renderMs: [], kachelMs: [] };
let speicherTimer = null;
let speicherWarnung = false;
const neuerPostUi = () => ({ gelesen: [], reiter: 'handeln', reiseZuletzt: [] });
let postUi = neuerPostUi();
let streifenTimer = null;
function speicherFehler(e) {
  console.error('Spielstand konnte nicht gespeichert werden:', e, JSON.stringify(speicherDiagnose()));
  if (!speicherWarnung) meldung('Speichern fehlgeschlagen: ' + e.message, false);
  speicherWarnung = true;
}
// Kleiner JPEG-Kartenausschnitt als Vorschau (kein PNG im IndexedDB-Spielstand).
function speicherVorschau() {
  try {
    if (!scene || !canvas.width || !canvas.height) return null;
    const c = document.createElement('canvas');
    c.width = 240; c.height = 136;
    c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.62);
  } catch (e) { console.warn('Kartenvorschau nicht verfügbar:', e); return null; }
}
function automatischSpeichern() {
  clearTimeout(speicherTimer);
  if (!s || !einstellung('autospeichern')) return;
  speicherTimer = setTimeout(() => {
    speichern(s, stadtName, postUi, 'autosave', '', speicherVorschau()).then(() => { speicherWarnung = false; }).catch(speicherFehler);
  }, 350);
}
async function sofortSpeichern() {
  if (!s) throw new Error('Noch kein Spiel gestartet.');
  clearTimeout(speicherTimer);
  await speichern(s, stadtName, postUi, 'autosave', '', speicherVorschau());
  speicherWarnung = false;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && s && einstellung('autospeichern')) {
    // iOS kann Hintergrund-Tabs beenden: ausstehende Aenderungen sofort schreiben.
    clearTimeout(speicherTimer);
    speichern(s, stadtName, postUi, 'autosave', '', speicherVorschau()).catch(speicherFehler);
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
// Q10: Nur eine bewusste Hausauswahl setzt dieses Kameraziel. Gesten lösen es wieder.
let kameraZiel = null;
let jahreszeiten = null;
let offenesHaus = null, offenesHq = null, offenerWettbewerber = null;
let angebotPins = [], wettbewerbPins = [], wettbewerbPinTimer = null;
let hausPins = [];
let bahnhofPin = null, bahnhofOrt = null, reise = null, wochenbericht = null;
const WB_FARBEN = { modehaus: '#795846', fastfashion: '#292b39', premium: '#9e773e',
  offprice: '#d62867', textildiscounter: '#2565b5', elektronik: '#d34532', leer_ehemals: '#777d80' };
const WB_ART = { modehaus: 'Modehaus', fastfashion: 'Fast Fashion', premium: 'Premium',
  offprice: 'Offprice', textildiscounter: 'Textildiscounter', elektronik: 'Elektronik', leer_ehemals: 'Leerstehendes Kaufhaus' };
const WB_STATUS = { offen: 'Geöffnet', eroeffnung: 'Neueröffnung', raeumung: 'Räumungsverkauf', geschlossen: 'Geschlossen' };


function groesse() { return [canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight]; }
/** Geometrischer Bezug des gewählten Hauses, unabhängig vom Kachelnachladen. */
function hausKameraPunkt(id) {
  const haus = sb?.haeuser.get(id), gruppe = haus?.gruppe;
  if (gruppe) {
    gruppe.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(gruppe);
    if (!box.isEmpty()) {
      // setzeMarker/kartenMarker: Parzellenmitte, Bauhöhe + 4 m (Mitte des Hauspins).
      const p = haus.p;
      if (p) return new THREE.Vector3(p.x + p.w / 2, (haus.e?.hoehe ?? box.max.y) + 4, p.z + p.d / 2);
      return box.getCenter(new THREE.Vector3());
    }
  }
  const box = sb?.statischeHaeuser.get(id)?.bounds;
  return box && !box.isEmpty() ? box.getCenter(new THREE.Vector3()) : null;
}
/** Mitte der sichtbaren Kartenfläche oberhalb des Hausdetails, nicht des vom Sheet verdeckten Canvas. */
function hausFokusPixel(w, h) {
  const frei = Math.max(140, h - Math.min($('panel').offsetHeight || h * 0.62, h * 0.62));
  const oben = Math.min(70, frei * 0.35);
  return { x: w / 2, y: (oben + frei - 12) / 2 };
}
function hausKameraMessung() {
  if (!kameraZiel || !cam || kameraZiel.stadt !== stadtName) return null;
  const punkt = hausKameraPunkt(kameraZiel.id) ?? kameraZiel.punkt;
  const [w, h] = groesse(), ziel = hausFokusPixel(w, h), v = punkt.clone().project(cam);
  const pin = { x: (v.x + 1) * w / 2, y: (1 - v.y) * h / 2 };
  return { id: kameraZiel.id, stadt: stadtName, ziel, pin,
    abweichungPx: Math.hypot(pin.x - ziel.x, pin.y - ziel.y),
    mitte: { x: K.x, z: K.z }, halb: K.halb };
}
function kameraSetzen() {
  if (!scene) return;
  const [w, h] = groesse(), aspekt = w / h;
  klemmen(K, aspekt);
  ren.setSize(w, h, false);
  cam = isoKamera(w, h, K.halb, new THREE.Vector3(K.x, 0, K.z));
  cam.updateMatrixWorld();
  // Nicht beim Kachelbau oder beim Wochenabschluss auf die Stadtmitte zurückspringen.
  // Nach Resize oder Neuaufbau denselben Hauspunkt in die freie Kartenfläche projizieren.
  if (kameraZiel && kameraZiel.stadt === stadtName && kameraZiel.id === offenesHaus) {
    const punkt = hausKameraPunkt(kameraZiel.id) ?? kameraZiel.punkt;
    kameraZiel.punkt = punkt.clone();
    const v = punkt.clone().project(cam), ziel = hausFokusPixel(w, h), r = canvas.getBoundingClientRect();
    const ist = aufBoden(r.left + (v.x + 1) * w / 2, r.top + (1 - v.y) * h / 2);
    const soll = aufBoden(r.left + ziel.x, r.top + ziel.y);
    if (ist && soll) {
      K.x += ist.x - soll.x;
      K.z += ist.z - soll.z;
      klemmen(K, aspekt);
      cam = isoKamera(w, h, K.halb, new THREE.Vector3(K.x, 0, K.z));
      cam.updateMatrixWorld();
    }
  }
  const sonne = scene.userData.sonne, r = K.halb * 2.4;
  sonne.position.set(K.x - 40, 120, K.z + 90);
  sonne.target.position.set(K.x, 0, K.z);
  Object.assign(sonne.shadow.camera, { left: -r, right: r, top: r, bottom: -r });
  sonne.shadow.camera.updateProjectionMatrix();
  leben.kamera();
  pinGroessen(hausPins, K.halb, h);
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

// N07: eigenes Animationsmodul, keine Engine-Mutation. Einstellungen via N13 nachrüstbar.
const leben = lebenModul({ canvas, scene: () => scene, camera: () => cam, K: () => K, spiel: () => s,
  zeichnen, sparsam });
const lebenEinstellung = param.get('leben') ?? (() => { try { return localStorage.getItem('ruhrkauf.leben'); } catch { return null; } })();
if (['aus', 'wenig', 'voll'].includes(lebenEinstellung)) leben.setzen(lebenEinstellung);
$('leben-modus').value = leben.modus;
$('leben-modus').addEventListener('change', (e) => {
  const vorher = leben.modus;
  leben.setzen(e.target.value);
  try { localStorage.setItem('ruhrkauf.leben', leben.modus); } catch { /* Privater Browsermodus */ }
  // Beim Abschalten bleibt der statische Verkehr aus dem ursprünglichen Stadtplan sichtbar.
  if ((vorher === 'aus') !== (leben.modus === 'aus') && s && scene) {
    const kameraAlt = { x: K.x, z: K.z, halb: K.halb };
    baueStadtAusSpiel(stadtName);
    Object.assign(K, kameraAlt);
    kameraSetzen();
  }
});

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
  const hp = hausPins.length ? ray.intersectObjects(hausPins.map((x) => x.pin), false)[0] : null;
  if (hp?.object.userData.hausId) return hp.object.userData.hausId;
  const t = ray.intersectObject(wurzel, true)[0];
  // FUNDUS und Volkskauf behalten die gemeinsame, leistungsfähige Stadtgeometrie.
  // Per Ray-Box-Schnitt sind ihre eigentlichen Hausvolumen trotzdem antippbar.
  let statisch = null, distanz = t?.distance ?? Infinity;
  for (const [id, eintrag] of sb?.statischeHaeuser ?? []) {
    const treffer = ray.ray.intersectBox(eintrag.bounds, new THREE.Vector3());
    if (treffer) {
      const d = treffer.distanceTo(ray.ray.origin);
      if (d < distanz) { distanz = d; statisch = id; }
    }
  }
  if (statisch) return statisch;
  const u = t?.object.userData;
  return u?.hausId ?? (u?.wbId ? 'wb:' + u.wbId : (u?.hqId ? 'hq:' + u.hqId : null));
}

/** Kamera so setzen, dass alle Hartwig-Häuser der Stadt im freien Kartenbereich (zwischen Cockpit und unterer Leiste) liegen. */
function fokusHaeuser() {
  kameraZiel = null; // bewusstes Fokussieren des gesamten Portfolios
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
const steuerung = karteSteuerung({ canvas, K, setzen: () => kameraSetzen(), aufBoden,
  interaktion: () => { kameraZiel = null; },
  tippen: (e) => { const id = hausUnter(e.clientX, e.clientY); if (id === 'bahn:hauptbahnhof') reise?.oeffne(); else if (id?.startsWith('angebot:')) oeffneModul(po, 'handeln', id.slice(8)); else if (id?.startsWith('hq:')) oeffneHq(id.slice(3)); else if (id?.startsWith('wb:')) oeffneWettbewerber(id.slice(3)); else if (id) oeffneHaus(id); } });
window.addEventListener('resize', kameraSetzen);

// ─────────────────────────────────────────── Stadt bauen
function raeumeSzene() {
  leben.zu();
  if (!scene) return;
  jahreszeiten?.aufraeumen();
  jahreszeiten = null;
  angebotPins = []; hausPins = []; bahnhofPin = null; bahnhofOrt = null;
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

/** Einheitlicher Satz Hauspins auch für die reinen Datenhäuser Volkskauf und FUNDUS. */
function hausPinsAktualisieren() {
  if (!scene || !sb || !s) return;
  for (const { pin, namensschild } of hausPins) for (const obj of [pin, namensschild]) {
    if (!obj) continue;
    scene.remove(obj); obj.material?.map?.dispose(); obj.material?.dispose();
  }
  hausPins = [];
  for (const [id, eintrag] of sb.haeuser) {
    const haus = s.haeuser.find((h) => h.id === id);
    if (!haus) continue;
    const pin = baueHauspin(scene, haus, eintrag, sb.zustand(id));
    if (pin) hausPins.push(pin);
  }
  for (const { haus, ...eintrag } of sb.statischeHaeuser.values()) {
    const pin = baueHauspin(scene, haus, eintrag, null);
    if (pin) hausPins.push(pin);
  }
  pinGroessen(hausPins, K.halb, canvas.clientHeight || window.innerHeight);
}

function angebotsPinsAktualisieren() {
  if (!scene || !sb || !s) return;
  for (const p of angebotPins) { scene.remove(p); p.material?.dispose(); }
  angebotPins = [];
  for (const a of E.posteingang(s).handeln.filter((x) => x.art === 'angebot')) {
    for (const id of a.bezug?.hausIds ?? []) {
      const h = sb.haeuser.get(id);
      if (!h?.p) continue;
      const dach = hausDachpunkt(h, s.haeuser.find((e) => e.id === id));
      if (!dach) continue;
      const pin = angebotMarker(scene, dach.x, dach.y + 2, dach.z, 8);
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
    const dach = dachpunkt(p, { w: x.e?.w ?? p.w, d: x.e?.d ?? p.d }, x.e?.hoehe ?? 28);
    if (!dach) continue;
    pin.position.set(dach.x, dach.y + 3, dach.z);
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
  kameraZiel = null; // bewusste Reiseaktion
  K.x = bahnhofOrt.x; K.z = bahnhofOrt.z; K.halb = 63; kameraSetzen();
}

function stadtchipSetzen(name) {
  $('stadtname').textContent = name;
  // Lange Namen (Mönchengladbach) ohne Umbruch: Schrift stufenweise verkleinern.
  $('stadtname').style.fontSize = name.length > 13 ? '11px' : name.length > 10 ? '12.5px' : '';
  const region = E.stadtRegion(name) ?? s.haeuser.find((h) => h.stadt === name)?.region;
  $('stadtcluster').textContent = region ? 'Region ' + region : '';
}
/** Die separat gerenderten Häuser liegen nicht im Stadt-Sammler. */
function getrennteSchneedachFlaechen() {
  return [
    ...[...sb.haeuser.entries()].map(([id, x]) => ['haus:' + id, x.dachFlaechen]),
    ...[...sb.hqs.entries()].map(([id, x]) => ['hq:' + id, x.dachFlaechen]),
    ...[...sb.wbSlots.values()].map((x) => ['wb:' + (x.p.standort?.id ?? x.p.id), x.dachFlaechen]),
  ];
}
function baueStadtAusSpiel(name) {
  const t0 = performance.now();
  // Ein Neuaufbau derselben Stadt (z. B. neue HQ-Fläche) ist kein Stadtwechsel.
  const kameraVorher = scene && stadtName === name ? { x: K.x, z: K.z, halb: K.halb } : null;
  if (stadtName !== name) kameraZiel = null;
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
  sb = spielBauer(s, { getrennt: true, wurzel, stadt: name, merk: merk(), hausLod: 'nah', hq: hqGrafik,
    dachFlaechenAktualisieren: (id, dach) => jahreszeiten?.registriereDachflaechen(id, dach) });
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
  try { e = baueStadt(T, scene, plan, grund, { keineStandAutos: leben.modus !== 'aus' }); T.bauen(scene); entferneKleineSchilder(scene); } finally { setzeLod('nah'); }
  jahreszeiten = jahreszeitenStadt(scene, plan, e.hoehen, s, true, e.dachFlaechen);
  jahreszeiten.registriereDachflaechenMehrfach(getrennteSchneedachFlaechen());
  scene.add(wurzel);
  KA.teileGrund = T.anzahl;
  kachelnAnlegen(offen);
  // HQ behält seinen bisherigen Marker. Alle Hausformate erhalten dachgenaue Q22-Pins.
  setzeMarker(scene, plan, e, plan.standorte.filter((q) => !q.angebot && q.rolle === 'hq')
    .map((q) => ({ parzelle: q.parzelle, art: 'hartwig', groesse: 10 })));
  hausPinsAktualisieren();
  for (const q of plan.standorte.filter((x) => x.angebot)) { const pz = plan.parzellen.find((x) => x.id === q.parzelle); if (pz) angebotMarker(scene, pz.x + pz.w / 2, (e.hoehen.get(pz.id) ?? 30) + 2, pz.z + pz.d / 2, 9); }
  angebotsPinsAktualisieren();
  wettbewerbPinsAktualisieren();
  bahnhofPinErstellen();
  K.G = plan.kameraGrenze ?? { x0: 0, z0: 0, x1: plan.breite, z1: plan.tiefe };
  const nm = nahMitte(plan, 'einkauf', 62);
  if (kameraVorher) Object.assign(K, kameraVorher);
  else { K.x = nm.x; K.z = nm.z; K.halb = param.has('zoom') ? Number(param.get('zoom')) : 60; }
  K._G = null;
  kameraSetzen();
  leben.stadt(plan);
  kachelnSichtbarBauen();
  const ms = Math.round(performance.now() - t0);
  messung.stadtMs.push({ stadt: name, ms, ...teileStand(), haeuser: sb.haeuser.size, kacheln: KA.liste.length });
  stadtchipSetzen(name);
  stadtChipsZeigen();
  return ms;
}
// Für Bahnreisen wird derselbe Szenenaufbau in Animationsbilder aufgeteilt; Detailkacheln folgen bei Ankunft.
async function baueStadtAusSpielReise(name) {
  const t0 = performance.now();
  kameraZiel = null; // Ankunft in einer anderen Stadt
  KA.pause = true;
  raeumeSzene();
  stadtName = name;
  const hqJson = hqGrafik();
  const d = stadtEintragAusSpiel(s, name);
  hqIdsStadt = hqIdsIn(hqJson, name);
  plan = stadtplan(d.seed, { typ: d.typ, archetyp: d.archetyp, region: d.region, strassenFaktor: 1.6, ...d.extra, standorte: d.standorte });
  if (hqJson) hqEinplanen(plan, hqJson, name);
  await new Promise((r) => requestAnimationFrame(r));
  scene = neueSzene('#4fb6c2');
  scene.userData.sonne.shadow.mapSize.set(2048, 2048);
  wurzel = new THREE.Group();
  sb = spielBauer(s, { getrennt: true, wurzel, stadt: name, merk: merk(), hausLod: 'nah', hq: hqGrafik,
    dachFlaechenAktualisieren: (id, dach) => jahreszeiten?.registriereDachflaechen(id, dach) });
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
  try { e = await baueStadtGestuft(T, scene, plan, grund); T.bauen(scene); entferneKleineSchilder(scene); } finally { setzeLod('nah'); }
  scene.add(wurzel);
  KA.teileGrund = T.anzahl;
  kachelnAnlegen(offen, true);
  await kachelnKloetzeBauen();
  jahreszeiten = jahreszeitenStadt(scene, plan, e.hoehen, s, true, e.dachFlaechen);
  jahreszeiten.registriereDachflaechenMehrfach([...getrennteSchneedachFlaechen(), ...KA.liste.map((k) => [k.key, k.dachFlaechen])]);
  // HQ behält seinen bisherigen Marker. Alle Hausformate erhalten dachgenaue Q22-Pins.
  setzeMarker(scene, plan, e, plan.standorte.filter((q) => !q.angebot && q.rolle === 'hq')
    .map((q) => ({ parzelle: q.parzelle, art: 'hartwig', groesse: 10 })));
  hausPinsAktualisieren();
  for (const q of plan.standorte.filter((x) => x.angebot)) { const pz = plan.parzellen.find((x) => x.id === q.parzelle); if (pz) angebotMarker(scene, pz.x + pz.w / 2, (e.hoehen.get(pz.id) ?? 30) + 2, pz.z + pz.d / 2, 9); }
  angebotsPinsAktualisieren();
  wettbewerbPinsAktualisieren();
  bahnhofPinErstellen();
  K.G = plan.kameraGrenze ?? { x0: 0, z0: 0, x1: plan.breite, z1: plan.tiefe };
  const nm = nahMitte(plan, 'einkauf', 62);
  K.x = nm.x; K.z = nm.z; K.halb = param.has('zoom') ? Number(param.get('zoom')) : 60;
  K._G = null;
  kameraSetzen();
  // Details werden erst nach dem ICE-Ankunftsbild über kachelnPlanen aufgebaut.
  zeichnen();
  const ms = Math.round(performance.now() - t0);
  messung.stadtMs.push({ stadt: name, ms, ...teileStand(), haeuser: sb.haeuser.size, kacheln: KA.liste.length });
  stadtchipSetzen(name);
  return ms;
}

// ─────────────────────────────────────────── Kacheln (Detailstufen für das iPhone)
// Normale Stadthäuser werden je Kachel (ganze Blöcke, KACHEL m Raster) gebaut. Sichtbare Kacheln in voller Stufe ('fern'
// wie bisher), alle anderen als Klötzchen (Baukörper mit Dach in Fassaden- und Dachfarbe). Im Leerlauf werden Kacheln nahe
// der Kamera nachgebaut, bis BUDGET Teile erreicht sind; ferne volle Kacheln fallen dann auf Klötzchen zurück.
// Ganze Blöcke je Kachel und ein frischer Bauer je Kachel: Traufhöhe und Reihenstil je Block bleiben wie beim Bau der ganzen Stadt.
const KACHEL = 110, BUDGET = 112000, VOLL_MAX_ZOOM = 340;
const KA = { liste: [], teileGrund: 0, laeuft: false, generation: 0, pause: false };
const HAUSTYPEN = new Set(['stadthaus', 'eck', 'hofhaus']);
const IMMER_GRUND = new Set(['slot:warenhaus', 'slot:premium', 'slot:sport', 'slot:wettbewerber', 'slot:hq', 'slot:dominante', 'slot:kirche', 'slot:hochhaus', 'slot:rathaus', 'slot:heizwerk', 'slot:dom', 'slot:fernsehturm', 'slot:wasserturm', 'slot:nord_kirche', 'slot:nord_kontorhaus', 'slot:nord_speicher', 'slot:nord_hafen', 'slot:center_passage']);
function klotzHoehe(p) { const g = p.hofbau ? 2 : p.typ === 'hofhaus' ? Math.max(2, (p.geschosse ?? 4) - 1) : p.geschosse ?? 4; return 4.2 + g * 3.3; }
function kachelnAnlegen(parzellen, gestuft = false) {
  ++KA.generation;
  KA.laeuft = false;
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
  if (!gestuft) {
    for (const k of KA.liste) klotzBauen(k, true);
    jahreszeiten?.registriereDachflaechenMehrfach(KA.liste.map((k) => [k.key, k.dachFlaechen]));
  }
}
async function kachelnKloetzeBauen() {
  let t = performance.now();
  for (const k of KA.liste) {
    klotzBauen(k);
    if (performance.now() - t >= 9) {
      await new Promise((r) => requestAnimationFrame(r));
      t = performance.now();
    }
  }
}
function entsorge(k) { if (!k.gruppe) return; k.gruppe.parent?.remove(k.gruppe); k.gruppe.traverse((o) => o.geometry?.dispose()); k.gruppe = null; }
function klotzBauen(k, gesammelt = false) {
  entsorge(k);
  const S = new KompaktSammler(), g = new THREE.Group(), dachFlaechen = [];
  for (const p of k.parz) {
    const { dachFlaechen: dach } = dachFlaechenBeimBau(S, p, () => {
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
    return { hoehe: H + 5 };
    });
    dachFlaechen.push(...dach);
  }
  S.bauen(g);
  scene.add(g);
  Object.assign(k, { gruppe: g, stufe: 'klotz', teile: S.anzahl, dachFlaechen });
  if (!gesammelt) jahreszeiten?.registriereDachflaechen(k.key, dachFlaechen);
}
/**
 * Fernbild: Hinterhäuser und hofseitige Nebengebäude dichter Blöcke werden
 * als einfache Baukörper gerendert. Außenliegende Straßenfassaden sowie
 * Hartwig-Standorte/Slots gehen weiter durch den unveränderten Hausbauer.
 * Die Parzellen und ihre Standortdaten werden nicht verändert.
 */
function fernHofBau(S, p) {
  const r = rng(((p.seed ?? 1) * 13 + 7) >>> 0), H = klotzHoehe(p);
  const f = waehle(r, [...FARBEN.fassadeHell, ...FARBEN.fassadeHell,
    ...FARBEN.fassadeWarm, ...FARBEN.fassadeKuehl,
    ...FARBEN.backstein.slice(0, 2), ...FARBEN.putzBunt]);
  S.quader(p.x, 0, p.z, p.x + p.w, H, p.z + p.d, f);
  // Eine durchgehende Dachplatte wahrt die Silhouette im winzigen Randbild.
  S.quader(p.x - 0.1, H - 0.1, p.z - 0.1,
    p.x + p.w + 0.1, H + 0.35, p.z + p.d + 0.1, dunkler(f, 0.08));
  return { hoehe: H + 0.35 };
}

function vollBauen(k, detail = detailFuer(k)) {
  const t0 = performance.now();
  const S = new KompaktSammler(), g = new THREE.Group(), b = echterBauer(), dachFlaechen = [];
  // Nur Rückseiten/Höfe dichter Blöcke am Bildrand, nie Geschäftsfronten,
  // Premiumhäuser, Standorte oder auffällige Solitärbauten vereinfachen.
  const anzahlBlock = new Map();
  for (const p of k.parz) anzahlBlock.set(p.block, (anzahlBlock.get(p.block) ?? 0) + 1);
  setzeLod(detail);
  try {
    for (const p of k.parz) {
      const hof = p.hofbau || p.typ === 'hofhaus';
      const fernHof = detail === 'fern' && !p.standort && hof
        && (anzahlBlock.get(p.block) ?? 0) >= 3;
      const { dachFlaechen: dach } = dachFlaechenBeimBau(S, p, () =>
        fernHof ? fernHofBau(S, p) : bauerFuer(b, p.typ)(S, g, p));
      dachFlaechen.push(...dach);
    }
    S.bauen(g); entferneKleineSchilder(g);
  } finally { setzeLod('nah'); }
  entsorge(k);
  scene.add(g);
  Object.assign(k, { gruppe: g, stufe: 'voll', detail, teile: S.anzahl, dachFlaechen });
  jahreszeiten?.registriereDachflaechen(k.key, dachFlaechen);
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
function detailFuer(k) {
  // Die Detailstufe hängt nur von Kamera und Kachel ab, nicht vom Häuserbestand.
  // Am Bildrand bleiben Kleinteile in 'fern' reduziert; im sichtbaren Kern
  // entspricht 'mittel' der bisherigen Fernansicht. Nur bei engem Zoom
  // werden unmittelbar zentrale Kacheln in 'nah' aufgebaut.
  if (K.halb <= 34 && sichtbar(k, 0.55)) return 'nah';
  return sichtbar(k, 0.92) ? 'mittel' : 'fern';
}
/** Nächste Kachel, die voll gebaut werden soll (sichtbar zuerst, dann nach Abstand), solange das Budget reicht. */
function naechsteKachel() {
  if (K.halb > VOLL_MAX_ZOOM) return null;
  const st = teileStand();
  // Unsichtbare Kacheln bleiben als einfache Baukörper stehen, statt im
  // Leerlauf die gesamte Stadt zu verfeinern. Sichtbare alte Kacheln
  // wechseln bei Kamerabewegung bedarfsgerecht zwischen den drei LODs.
  const kand = KA.liste.filter((k) => sichtbar(k, 1.08) &&
    (k.stufe !== 'voll' || k.detail !== detailFuer(k)))
    .map((k) => ({ k, d: abstand(k) })).sort((a, b) => a.d - b.d);
  const n = kand[0];
  if (!n) return null;
  const schaetzung = n.k.stufe === 'voll' ? 0 : n.k.parz.length * 380;
  if (st.teile + schaetzung <= BUDGET) return n.k;
  // sichtbare Kachel braucht Platz: fernste unsichtbare volle Kachel zurückstufen
  const weg = KA.liste.filter((k) => k.stufe === 'voll' && !sichtbar(k, 1.4)).sort((a, b) => abstand(b) - abstand(a))[0];
  if (!weg) return null;
  klotzBauen(weg);
  return n.k;
}
/** Sichtbare Kacheln sofort voll bauen (beim Stadtaufbau). */
function kachelnSichtbarBauen() {
  if (K.halb > VOLL_MAX_ZOOM) return;
  for (const k of KA.liste.filter((q) => sichtbar(q, 1.05) &&
    (q.stufe !== 'voll' || q.detail !== detailFuer(q))).sort((a, b) => abstand(a) - abstand(b))) {
    if (teileStand().teile + (k.stufe === 'voll' ? 0 : k.parz.length * 380) > BUDGET) break;
    vollBauen(k);
  }
  zeichnen();
}
/** Im Leerlauf weiterbauen: je Schritt eine Kachel, dann neu zeichnen. */
function kachelnPlanen() {
  if (KA.laeuft || KA.pause || !KA.liste.length) return;
  KA.laeuft = true;
  const generation = KA.generation;
  const schritt = () => {
    if (generation !== KA.generation) return; // veralteter Timer einer verlassenen Stadt
    if (KA.pause) { KA.laeuft = false; return; }
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
    baueStadtAusSpiel(stadtName); // bewahrt Kamera und Hausziel selbst
    return ['stadt'];
  }
  const geaendert = sb.aktualisiere();
  for (const id of geaendert) sb.neuBauen(id);
  // Keine Kacheln oder Stadtteile neu bauen: Farben und saisonale Gruppen umschalten.
  jahreszeiten?.aktualisiere(s);
  wettbewerbPinsAktualisieren();
  hausPinsAktualisieren();
  if (geaendert.length) zeichnen();
  return geaendert;
}
let cockpitFormat = 'alle';
const MERK = new Map();
function merk() { return MERK; }

// ─────────────────────────────────────────── Cockpit
/** Schnelle Stadtnavigation über alle eigenen Häuser und die Konkurrenz. */
function stadtChipsZeigen() {
  if (!s || !stadtName) return;
  const hs = E.portfolio(s).filter((h) => h.stadt === stadtName);
  const konkurrenz = E.wettbewerbFuerGrafik(s, stadtName).filter((w) => w.status !== 'geschlossen');
  $('stadt-chips').innerHTML = hs.map((h) => '<button class="' + h.formatKey +
    '" data-stadthaus="' + esc(h.id) + '" title="' + esc(h.name) + '">' +
    esc(h.name) + '</button>').join('') +
    konkurrenz.map((w) => '<button data-stadtwb="' + esc(w.id) + '" title="Wettbewerber: ' +
    esc(w.name) + '">Konkurrenz: ' + esc(w.name) + '</button>').join('');
}
$('stadt-chips').addEventListener('click', (e) => {
  const h = e.target.closest('[data-stadthaus]'), w = e.target.closest('[data-stadtwb]');
  if (h) oeffneHaus(h.dataset.stadthaus);
  else if (w) oeffneWettbewerber(w.dataset.stadtwb);
});
/** Orte ohne bereits neu erzeugte Render-JSON bleiben über die Portfolio-Daten nutzbar. */
function portfolioStadtOeffnen(name, id) {
  if (STADTLISTE.some((stadt) => stadt.name === name)) {
    wahl.value = name;
    baueStadtAusSpiel(name);
    if (id) oeffneHaus(id);
    else schliessePanel();
    return;
  }
  const hs = E.portfolio(s).filter((h) => h.stadt === name);
  const konkurrenz = E.wettbewerbFuerGrafik(s, name).filter((w) => w.status !== 'geschlossen');
  panel(name, 'Standortnetz · Stadtgrafik nach vollständigem Haus-Export', '<div class="karte">' +
    hs.map((h) => '<div class="zeile"><span class="was"><b>' + esc(h.name) + '</b><i>' +
      esc(h.formatKey) + ' · ' + esc(h.status) + '</i></span><b>' + geld(h.umsatz) + '</b></div>').join('') +
    '</div><div class="karte"><div class="khead">Wettbewerber der Stadt</div>' +
    konkurrenz.map((w) => '<div class="zeile"><span>' + esc(w.name) + '</span></div>').join('') +
    '</div>');
}

function cockpitZeigen() {
  const c = E.cockpit(s);
  const kachel = (titel, wert, ton = '') => `<div class="kz ${ton}"><span>${titel}</span><b>${wert}</b></div>`;
  // Formatfilter ohne zusätzliche Zeilen: das Cockpit darf auf dem iPhone nicht wachsen
  // (es überdeckt sonst die Karte). Auswahl im Titel der Umsatz-Kachel.
  const FORMATNAME = { alle: 'Alle', warenhaus: 'Hartwig', sport: 'Sport', schwester: 'Volkskauf', outlet: 'FUNDUS' };
  const fx = cockpitFormat === 'alle' ? null : c.formate.find((x) => x.format === cockpitFormat);
  const auswahl = '<select class="kzwahl" data-cockpit-format aria-label="Format">' + Object.entries(FORMATNAME)
    .filter(([id]) => id === 'alle' || c.formate.some((x) => x.format === id && x.haeuser))
    .map(([id, name]) => '<option value="' + id + '"' + (id === cockpitFormat ? ' selected' : '') + '>' + name + '</option>').join('') + '</select>';
  $('cockpit').innerHTML = [
    kachel('Cash', c.geldUnbegrenzt ? 'unbegrenzt' : geld(c.cash), !c.geldUnbegrenzt && c.cash < 0 ? 'rot' : ''),
    kachel('Kreditrahmen frei', c.geldUnbegrenzt ? 'unbegrenzt' : geld(c.kreditFrei), !c.geldUnbegrenzt && c.kreditFrei < 2e7 ? 'rot' : ''),
    fx ? kachel('EBITDA ' + FORMATNAME[cockpitFormat], s.historie.length ? geld(fx.ebitda) : 'noch offen', !s.historie.length ? '' : fx.ebitda < 0 ? 'rot' : 'gruen')
      : kachel('EBITDA 13 Wochen', s.historie.length ? geld(c.ebitda13) : 'noch offen', !s.historie.length ? '' : c.ebitda13 < 0 ? 'rot' : 'gruen'),
    kachel('Umsatz · ' + auswahl, s.historie.length ? geld(fx ? fx.umsatz : c.umsatzWoche) : 'noch offen'),
    kachel('Vertrauen', `${c.vertrauen} / 100`, c.vertrauen < 35 ? 'rot' : ''),
    kachel('Image', `${c.image} / 100`, c.image < 35 ? 'rot' : ''),
  ].join('');
  $('cockpit').querySelector('[data-cockpit-format]')?.addEventListener('change', (e) => { cockpitFormat = e.target.value; cockpitZeigen(); });
  // O07 Haus: Ausnahme-Kachel im Cockpit.
  const ausnahmen = E.hausBeobachtung(s, 30).length;
  $('hausbeobachtung').textContent = ausnahmen ? ausnahmen + ' Häuser beobachten →' : 'Hausbetrieb: keine Ausnahmen';
  $('kw').textContent = `KW ${c.kw} / ${c.jahr}`;
  $('phase').textContent = [c.phase === 'insolvenz' ? 'Insolvenzverfahren' : c.phase === 'zerschlagen' ? 'Zerschlagen' : '', s.testGenutzt ? 'Testspiel' : ''].filter(Boolean).join(' · ');
  $('phase').style.display = c.phase === 'regulaer' && !s.testGenutzt ? 'none' : '';
}

// ─────────────────────────────────────────── Woche weiter
function woche(mitBot = false, test = false) {
  if (s.ende || s.phase === 'zerschlagen') { spielende?.anzeigen(); return null; }
  const davor = E.posteingang(s);
  const t0 = performance.now();
  const erfolgeDavor = new Set(Object.keys(s.erfolge ?? {}));
  if (mitBot) botSchritt(s);
  const ankommendeOrders = (s.bestellungen ?? []).filter((b) => b.ankunft === s.woche + 1).length;
  if (test) {
    const ergebnis = E.fuehreAus(s, { typ: 'testWoche' });
    if (!ergebnis.ok) { meldung(ergebnis.text, false); return null; }
  } else E.wocheAbspielen(s);
  er?.nachWoche(erfolgeDavor);
  const t1 = performance.now();
  const geaendert = grafikNachziehen();
  leben.woche(ankommendeOrders);
  const t2 = performance.now();
  cockpitZeigen();
  stadtChipsZeigen();
  szenarienUI.aktualisieren();
  if (offenesHaus) oeffneHaus(offenesHaus);
  else if (offenerWettbewerber) oeffneWettbewerber(offenerWettbewerber);
  else if (offenesHq) oeffneHq(offenesHq === true ? undefined : offenesHq);
  else for (const m of module()) if (m.aktiv?.()) (m.neuZeichnen ?? m.oeffne)?.();
  ek.badge(); menueBadge();
  angebotsPinsAktualisieren();
  const danach = E.posteingang(s), alte = new Set(davor.handeln.map((x) => x.id)), meldungenVorher = new Set(davor.meldungen.map((x) => x.id));
  const neu = danach.handeln.filter((x) => !alte.has(x.id));
  const neueMeldungen = danach.meldungen.filter((x) => !meldungenVorher.has(x.id)).length;
  const text = 'KW ' + ((s.woche % 52) + 1) + ': ' +
    neu.filter((x) => x.art === 'angebot').length + ' neue Angebote, ' +
    neu.filter((x) => x.art === 'entscheidung').length + ' Entscheidungen, ' + neueMeldungen + ' Meldungen';
  const streifen = $('wochenstreifen');
  streifen.textContent = mitBot ? text : '';
  streifen.classList.toggle('an', mitBot);
  streifen.hidden = !mitBot;
  clearTimeout(streifenTimer);
  if (mitBot) streifenTimer = setTimeout(() => streifen.classList.remove('an'), 6000);
  zeichnen();
  const m = { woche: s.woche, engineMs: Math.round(t1 - t0), neuBauMs: Math.round(t2 - t1), neu: geaendert };
  messung.wocheMs.push(m);
  automatischSpeichern();
  if ($('spiel-ruhestand')) $('spiel-ruhestand').hidden = s.woche < 260 || !!s.ende || s.szenario?.id === 'sandkasten';
  if (s.ende) setTimeout(() => { wochenbericht?.zu(); spielende?.anzeigen(); }, 0);
  return m;
}

/** Bot-Strategie C aus scripts/bot.ts (Schutzschirm, tiefe Sanierung) plus zwei Rabattaktionen, damit Aktionen sichtbar werden. */
function botSchritt(st) {
  botTief(st);
  if (st.woche === 24) E.fuehreAus(st, { typ: 'aktion', name: 'Sommer-Sale', rabatt: 0.2, wochen: 3, scope: { typ: 'alle' } });
  if (st.woche === 50) E.fuehreAus(st, { typ: 'aktion', name: 'Winterschlussverkauf', rabatt: 0.3, wochen: 3, scope: { typ: 'alle' } });
}

// ─────────────────────────────────────────── Panels
let pp = null;
let vorherigerFokus = null;
let wk = null;
let st = null;
let ch = null;
const module = () => [ek, vs, mk, pr, po, org, rg, itM, pl, um, pe, es, wk, st, er, ton, zt, ch, ec, pp].filter(Boolean);
function panel(titel, unter, html, klasse = '') {
  for (const m of module()) m.zu();
  menueZu();
  $('panel').classList.toggle('gross', klasse === 'gross');
  $('panel').classList.toggle('hausdetail', klasse === 'hausdetail');
  $('ptitel').textContent = titel;
  $('punter').textContent = unter;
  $('pinhalt').innerHTML = html;
  const neu = !$('panel').classList.contains('offen');
  if (neu) vorherigerFokus = document.activeElement;
  $('panel').inert = false;
  $('panel').removeAttribute('aria-hidden');
  $('panel').classList.add('offen');
  document.body.classList.add('panel-offen');
  if (neu) $('ptitel').focus({ preventScroll: true });
}
function schliessePanel() { kameraZiel = null; for (const m of module()) m.zu(); $('panel').classList.remove('offen'); $('panel').inert = true; $('panel').setAttribute('aria-hidden', 'true'); document.body.classList.remove('panel-offen'); offenesHaus = null; offenesHq = null; hqAbteilung = null; hqEtageWahl = null; offenerWettbewerber = null; if (vorherigerFokus?.isConnected) vorherigerFokus.focus({ preventScroll: true }); vorherigerFokus = null; }
const szenarienUI = szenarienModul({ E, spiel: () => s, wahl: () => startWahl, panel, meldung, stufenAktualisieren: zeichneStufen, nachAktion: () => { cockpitZeigen(); szenarienUI.aktualisieren(); automatischSpeichern(); } });
/** Q10: Neues Haus bewusst fokussieren; spätere Renderläufe erhalten das Ziel. */
function hausZeigen(id) {
  const punkt = hausKameraPunkt(id);
  if (!punkt) return;
  steuerung.stopp(); // auslaufende Wischträgheit darf die Hausauswahl nicht überschreiben
  K.halb = Math.min(K.halb, 65);
  kameraZiel = { id, stadt: stadtName, punkt: punkt.clone() };
  kameraSetzen();
  // Das gesamte Gebäude muss in den sichtbaren Streifen über dem Sheet passen.
  const x = sb?.haeuser.get(id);
  const b = x?.gruppe ? new THREE.Box3().setFromObject(x.gruppe) : sb?.statischeHaeuser.get(id)?.bounds;
  if (b && !b.isEmpty()) {
    const [w, h] = groesse(), frei = hausFokusPixel(w, h).y * 2 - 70 + 12;
    const ecken = [];
    for (const xx of [b.min.x, b.max.x]) for (const yy of [b.min.y, b.max.y])
      for (const zz of [b.min.z, b.max.z]) ecken.push(new THREE.Vector3(xx, yy, zz).project(cam));
    const breite = (Math.max(...ecken.map(v => v.x)) - Math.min(...ecken.map(v => v.x))) * w / 2;
    const hoehe = (Math.max(...ecken.map(v => v.y)) - Math.min(...ecken.map(v => v.y))) * h / 2;
    const faktor = Math.max(breite / (w * 0.85), hoehe / (Math.max(70, frei - 70) * 0.85));
    if (faktor > 1.01) { K.halb *= faktor; kameraSetzen(); }
  }
}
$('pzu').addEventListener('click', schliessePanel);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('panel').classList.contains('offen')) schliessePanel(); });

// O07 Haus
let hausReiter = 'ueberblick';
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
window.formateTun=(typ,wert)=>{
  const aktion=typ==='schwesterUmflaggen'?{typ,haus:wert}:typ==='altwareOutlet'?{typ,quote:Number(wert)/100}:typ==='offpriceZukauf'?{typ,budget:Math.round(Number(wert))}:{typ:'outletEroeffnen',stadt:wert};
  const r=E.fuehreAus(s,aktion);meldung(r.text,r.ok);
  if(r.ok){grafikNachziehen();nachAktion();if(offenesHaus)oeffneHaus(offenesHaus);}
};
window.filialProgramm = (programm) => {
  const r = E.fuehreAus(s, { typ: 'filialProgramm', programm });
  meldung(r.text, r.ok);
  if (r.ok) { nachAktion(); if (offenesHaus) oeffneHaus(offenesHaus); }
};
function oeffneHaus(id) {
  const d = E.hausDetail(s, id);
  if (!d) {
    // Bis zur Integration in die Engine sind FUNDUS und Volkskauf Kataloghäuser.
    // Ihre anklickbaren Gruppen öffnen dieselbe Sheet-Hülle mit passenden Reitern,
    // ohne nicht vorhandene Kennzahlen oder Entscheidungen vorzutäuschen.
    const statisch = sb?.statischeHaeuser.get(id);
    if (!statisch) return;
    const neu = offenesHaus !== id;
    if (neu) hausReiter = 'ueberblick';
    offenesHaus = id; offenesHq = null; offenerWettbewerber = null;
    const h = statisch.haus;
    panel(h.name, h.stadt + ' · ' + (h.format === 'outlet' ? 'FUNDUS' : 'Volkskauf') +
      ' · Baujahr ' + h.baujahr, hausStatischHtml(h, hausReiter), 'hausdetail');
    if (neu) hausZeigen(id);
    return;
  }
  const neu = offenesHaus !== id;
  if (neu) hausReiter = 'ueberblick';
  // O07 Haus
  d.betrieb = E.hausUebersicht(s, id);
  offenesHaus = id; offenesHq = null; offenerWettbewerber = null;
  const h = d.haus, k = h.kpi;
  const z = sb.zustand(id);
  const bild = z ? [z.status, ...z.zusatz].filter((q) => q !== 'offen').map((q) => (q === 'aktion' && z.aktion ? `Aktion ${AKTION_NAME[z.aktion]}` : STATUS_TITEL[q])).join(' · ') : '';
  const qm = h.flaechen.reduce((a, f) => a + f.qm, 0);
  const zahl = (t, w, ton = '') => `<div class="kz ${ton}"><span>${t}</span><b>${w}</b></div>`;
  let html = `<div class="chips"><span class="chip ${h.status === 'offen' ? '' : 'warn'}">${STATUS_HAUS[h.status] ?? h.status}</span>${h.klasse === 'premium' ? '<span class="chip" style="background:#fbefd2;color:#6d4b18;border:1px solid #c4a06a;font-weight:700">♛ Premium</span>' : ''}${bild ? `<span class="chip">${bild}</span>` : ''}<span class="chip grau">${h.lage === '1a' ? '1a-Lage' : h.lage === 'b' ? 'B-Lage' : h.lage === 'center' ? 'Center' : h.lage === 'stadtteil' ? 'Stadtteilzentrum' : 'Stadtrand'}</span></div>`;
  html += `<div class="raster">${zahl('Umsatz Woche', geld(k?.umsatz ?? 0))}${zahl('Deckungsbeitrag', geld(k?.db ?? 0), (k?.db ?? 0) < 0 ? 'rot' : 'gruen')}${zahl('Verkaufsfläche', fmt.format(qm) + ' qm')}${zahl('Substanz', Math.round(h.substanz) + ' / 100', h.substanz < 35 ? 'rot' : '')}</div>`;
  html += st?.hausGrafik(id) ?? '';
  // O02: ausschließlich Engine-Werte, auch bei geschlossenen Häusern oder fehlendem Vorjahr.
  html += hausTreiberZeile(E, s, id);
  // O08 Umbau: Bau-Reiter mit Etagenstatus, Fristen und Umbauplanung.
  html += um?.hausKarte(id) ?? '';
  if(h.format==='schwester'){
    const f=E.schwesterUebersicht(s);
    html += '<div class="karte"><div class="khead">Volkskauf · Regionalführung</div><div class="raster">'+zahl('Häuser',fmt.format(f.haeuser))+zahl('EBITDA',geld(f.ebitda))+zahl('Umbauten',fmt.format(f.umbauten))+'</div>';
    if(h.status==='offen')html += '<button class="mini" onclick="formateTun(\'schwesterUmflaggen\',\''+id+'\')">Zu Hartwig umflaggen</button>';
    html+='</div>';
  }
  if(h.format==='outlet'){
    const f=E.outletUebersicht(s);
    html += '<div class="karte"><div class="khead">FUNDUS · Off-Price-Markenposten</div><div class="raster">'+zahl('Bestand EK',geld(f.poolWert))+zahl('Markenposten',geld(f.markenposten))+zahl('Konzern-Altware',geld(f.altware))+zahl('Reichweite',f.reichweite.toFixed(1).replace('.',',')+' Wo.')+'</div>';
    html += '<button class="mini" onclick="formateTun(\'altwareOutlet\',80)">Altwarequote 80 %</button></div>';
  }
  if (h.klasse === 'premium') {
    const p = E.premiumUebersicht(s).find((q) => q.id === id);
    html += `<div class="karte"><div class="khead">Kronjuwel · Premiumsegment</div><div class="raster">${zahl('Premium-Image', Math.round(p?.image ?? 80) + ' / 100')}${zahl('Immobilien- & Marktwert', geld(p?.marktwert ?? 0))}${zahl('EBITDA-Marge (DB)', ((p?.marge ?? 0)*100).toFixed(1).replace('.', ',') + ' %')}${zahl('Aktionsschutz', p?.schutz ? 'Aktiv' : 'Aus')}</div>`;
    if (h.premiumEigentuemer) html += `<div class="zeile">Eigentümer: ${h.premiumEigentuemer}</div>`;
    else if (h.status === 'offen') html += `<div class="zeile"><button class="mini" onclick="premiumTun('schutz','${id}')">${p?.schutz ? 'Rabatt-Schutz aufheben' : 'Rabatt-Schutz aktivieren'}</button> <button class="mini" onclick="premiumTun('investieren','${id}')">10 Mio. € investieren</button></div>`;
    const an = s.angebote.find((a) => a.status === 'offen' && a.typ === 'premiumVerkauf' && a.wunschHaeuser?.includes(id));
    if (an) html += `<div class="zeile">Angebot: ${an.premiumKaeuferTyp || 'Investor'} · ${geld(an.kaufpreis ?? 0)} <button class="mini" onclick="premiumTun('verhandeln','${an.id}')">Nachverhandeln</button> <button class="mini" onclick="premiumTun('verkaufen','${an.id}')">Verkaufen</button></div>`;
    html += '</div>';
  }
  // Tatsächlich gebuchte GuV, ohne Zentrale, als eigener Block im Haus-Reiter.
  if (d.guv) {
    const g = d.guv;
    const kosten = new Set(E.GUV_KOSTEN);
    html += '<div class="karte"><div class="khead">Filial-GuV · aktuelle Woche (ohne Zentrale)</div>';
    for (const p of E.REFERENZ_FILIAL_GUV) {
      const betrag = g[p.id] ?? 0;
      const sign = kosten.has(p.id) || p.id === 'wareneinsatz' || p.id === 'opex' ? -1 : 1;
      const wert = sign * betrag;
      const quote = g.umsatz ? (100 * wert / g.umsatz).toFixed(1).replace('.', ',') + ' %' : '–';
      html += `<div class="zeile"><span class="was">${p.name} <i>Referenz ${String(p.ist).replace('.', ',')} %</i></span><span class="qm">${geld(wert)}</span><span class="uq">${quote}</span></div>`;
    }
    html += '<div class="zeile grau">Referenzdifferenz: Einzel-OPEX −44,6 %, Total OPEX laut Vorgabe −42,4 %. Keine Ausgleichsbuchung.</div></div>';
  }
  html += '<div class="karte"><div class="khead">Sanierungsprogramme · gesamtes Filialnetz</div>';
  for (const [programm, def] of Object.entries(E.FILIAL_PROGRAMME)) {
    const stand = d.programme?.[programm];
    const status = stand ? s.woche < stand.wirksamAb ? 'Anlaufphase bis Woche ' + (stand.wirksamAb + 1) : 'Wirksam' : '';
    html += `<div class="zeile"><span class="was"><b>${def.name}</b> <i>${status || def.vorlauf + ' Wochen Vorlauf'} · ${def.nebenwirkung}</i></span>${stand ? '' : `<button class="mini" onclick="filialProgramm('${programm}')">Starten</button>`}</div>`;
  }
  html += '</div>';
  // O09: zusätzliche Logistik im Haussteckbrief.
  if (d.ecommerce && h.format === 'warenhaus') {
    const x = d.ecommerce;
    html += '<div class="karte"><div class="khead">Online und Filiallogistik</div><div class="raster">' +
      zahl('Abholungen', fmt.format(x.abholungen)) + zahl('Versand aus dem Haus', fmt.format(x.versand)) +
      zahl('Retouren im Haus', fmt.format(x.retouren)) + zahl('Instore-Logistik', x.instoreStunden.toFixed(1).replace('.', ',') + ' Std.') +
      '</div><div class="zeile">Abholstation: ' + (x.station ? 'vorhanden' : 'nicht vorhanden') +
      ' · Ship-from-Store: ' + (x.versandAn ? 'aktiv' : 'aus') + '</div></div>';
  }
  const shops = EQ.shops(s, h);
  if (hausEtageWahl?.id === id) {
    const b = innenBild(h, hausEtageWahl.nr);
    letztesInnenbild = { id, nr: hausEtageWahl.nr, shops: h.flaechen.filter((f) => f.etage === hausEtageWahl.nr && shops[f.gruppe] && ['eigen', 'kommission'].includes(f.konzept)).map((f) => shops[f.gruppe].name), teile: b.res?.anzahl };
    html += `<div class="karte haus3d"><img src="${b.url}" alt=""><div class="zeile"><span class="was"><b>${etageName(hausEtageWahl.nr)}</b> <i>Innenansicht</i></span><button class="mini" onclick="hausKlick('zu')">Schließen</button></div></div>`;
    if (b.nah) html += `<div class="karte haus3d"><img src="${b.nah}" alt=""><div class="zeile"><span class="dot" style="background:${b.shop.farbe}"></span><span class="was"><b>Eigenmarken-Shop ${b.shop.name}</b> <i>${Math.round(b.shop.anteil * 100)} % der Fläche</i></span></div></div>`;
  }
  html += '<div class="karte"><button type="button" class="mini" data-hausbesuch="' + esc(id) + '">Haus besuchen</button></div>';
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
  // O07 Haus: alter Etagen- und Konkurrenzinhalt bleibt im Reiter Überblick.
  html = hausSteckbrief(d, html, hausReiter, s.woche);
  // O04 Personal: Wochentagsplanung im Reiter Personal des Hausdetails.
  if (hausReiter === 'personal' && pe) html += pe.hausBlock(id);
  // O05 Ware
  if (hausReiter === 'ware' && d.waren) html += `<div class="karte"><div class="khead">Ware · ${esc(d.waren.hauscluster)}</div><div class="raster">${zahl('Warenverfügbarkeit', (d.waren.verfuegbarkeit * 100).toFixed(1) + ' %')}${zahl('Altwareanteil', (d.waren.altwareanteil * 100).toFixed(1) + ' %')}${zahl('Inventurdifferenz', d.waren.inventur ? geld(d.waren.inventur.differenz) : 'Noch offen')}${zahl('Flächenproduktivität', geld(d.waren.flaechenproduktivitaet) + '/qm')}</div></div>`;
  panel(h.name, `${h.stadt} · ${h.klasse === 'premium' ? 'Premiumhaus' : h.format === 'sport' ? 'Sporthaus' : h.format === 'schwester' ? 'Volkskauf' : h.format === 'outlet' ? 'FUNDUS' : 'Warenhaus'} · Baujahr ${h.baujahr}`, html, 'hausdetail');
  if (neu) hausZeigen(id);
}

// O07 Haus: einheitlicher Aktionspfad über die Engine, keine UI-seitige Berechnung.
window.hausReiterWahl = (reiter) => { hausReiter = reiter; if (offenesHaus) oeffneHaus(offenesHaus); };
window.hausTun = (art, id, key, wert) => {
  const h = s.haeuser.find((x) => x.id === id);
  if (!h) return;
  const b = E.hausUebersicht(s, id);
  const a = art === 'foerdern' ? { typ: 'hausLeitungFoerdern', haus:id, staerke:key }
    : art === 'ersetzen' ? { typ:'hausLeitungErsetzen', haus:id, kandidat:key }
    : art === 'praemie' ? { typ:'hausHaltepraemie', haus:id, betrag:10000 }
    : art === 'befoerdern' ? { typ:'hausLeitungBefordern', haus:id }
    : art === 'service' ? { typ:'hausServiceSetzen', haus:id, service:key, an:wert }
    : art === 'kosten' ? { typ:'hausKostenSetzen', haus:id, posten:key, faktor:Math.round(((b?.kosten?.[key]??1)+wert)*100)/100 }
    : art === 'gastro' ? { typ:'hausGastronomie', haus:id, modus:key }
    : art === 'massnahme' ? { typ:'hausMassnahme', haus:id, massnahme:key }
    : art === 'standard' ? { typ:'hausStandardSetzen', cluster:b.hauscluster, feld:key, wert:Math.max(1,Math.min(3,b.standard[key]+wert)) }
    : art === 'stunden' ? { typ:'hausStandardSetzen', cluster:b.hauscluster, feld:key, wert:Math.max(7,Math.min(22,b.standard.oeffnung[key]+wert)) }
    : art === 'clusterservice' ? { typ:'hausClusterServiceSetzen', cluster:b.hauscluster, service:key, an:wert }
    : art === 'sonntag' ? { typ:'hausSonntag', stadt:h.stadt, woche:s.woche+2 }
    : null;
  if (!a) return;
  const ergebnis = E.fuehreAus(s, a);
  meldung(ergebnis.text, ergebnis.ok);
  if (ergebnis.ok) { grafikNachziehen(); nachAktion(); if (offenesHaus) oeffneHaus(offenesHaus); }
};
window.hausSpringen = (id) => {
  const h = s.haeuser.find(x => x.id === id);
  if (!h) return;
  if (stadtName !== h.stadt) { baueStadtAusSpiel(h.stadt); wahl.value=h.stadt; }
  oeffneHaus(id);
};
function oeffneBeobachtung() {
  offenesHaus = null; offenesHq = null;
  panel('Beobachtungsliste','Ausnahmen im Filialnetz',hausBeobachtungHtml(E.hausBeobachtung(s,30)));
}
function oeffneHausReporting() {
  offenesHaus = null; offenesHq = null;
  panel('Reporting','Wochenkommentare und Mystery Shopping',hausReportingHtml(E.hausKommentareDerWoche(s),E.hausKundenRanking(s)));
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
let hqAbteilung = null; // Q15: gewählte Seite der Fachabteilung
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
const fassadenChronik = new Map();
function fassadeChronik(familie) {
  if (!fassadenChronik.has(familie)) {
    const haus = { id: `chronik-${familie}`, baujahr: [0, 1902, 1930, 1954, 1974, 1995][familie], lage: '1a', grundflaecheQm: 850, etagen: [0, 1, 2, 3], fassade: familie, status: 'offen', substanz: 90 };
    const bild = schnittBild((S, sc) => warenhaus(S, sc, haus, { familie, passanten: false, vorplatz: false }), 400, 240).url;
    fassadenChronik.set(familie, bild);
  }
  return fassadenChronik.get(familie);
}
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
let letzteMeldung = { text: '', zeit: 0 };
function meldungSchliessen() {
  clearTimeout(meldungTimer);
  $('meldung').className = '';
}
$('meldung').addEventListener('click', meldungSchliessen);
function meldung(text, ok = true) {
  const m = $('meldung'), jetzt = Date.now();
  if (text === letzteMeldung.text && jetzt - letzteMeldung.zeit < 5000) return;
  letzteMeldung = { text, zeit: jetzt };
  m.textContent = text;
  m.className = ok ? 'an' : 'an rot';
  clearTimeout(meldungTimer);
  meldungTimer = setTimeout(meldungSchliessen, ok ? 2500 : 4000);
}
function oeffneHqAbteilung(id) {
  hqAbteilung = id;
  hqEtageWahl = null;
  oeffneHq();
}
window.hqKlick = (art, a, b, c) => {
  if (art === 'uebersicht') { hqAbteilung = null; hqEtageWahl = null; return oeffneHq(); }
  if (art === 'abteilung') return oeffneHqAbteilung(a);
  if (art === 'abteilungEtage') {
    hqAbteilung = a;
    hqEtageWahl = { g: b, nr: Number(c) };
    return oeffneHq(undefined, true);
  }
  if (art === 'fte') return hqTun({ typ: 'abteilungFte', abteilung: a, fte: Number(b) });
  if (art === 'gehalt') return hqTun({ typ: 'abteilungGehalt', abteilung: a, faktor: Number(b) / 100 });
  if (art === 'aufgabe') return hqTun({ typ: 'delegation', bereich: a, aufgabe: b, an: c === 'true' });
  if (art === 'organisation') { offenesHq = null; return oeffneModul(org); }
  if (art === 'mieten') { const an = E.hqUebersicht(s).angebote.find((q) => q.id === a); hqTun({ typ: 'hqMieten', angebot: a, etagen: an.etagen.map((e) => e.nr) }); }
  if (art === 'kuendigenE') hqTun({ typ: 'hqEtageKuendigen', gebaeude: a, etage: Number(b) });
  if (art === 'archiv') hqTun({ typ: 'hqArchivSetzen', gebaeude: a, etage: Number(b), aktiv: c === 'true' });
  if (art === 'archivOeffnen') oeffneModul(ch);
  if (art === 'kuendigenG') hqTun({ typ: 'hqGebaeudeKuendigen', gebaeude: a });
  if (art === 'stufe') hqTun({ typ: 'abteilungStufe', abteilung: a, stufe: Number(b) });
  if (art === 'setzen') { const [g, nr] = String(b).split('|'); hqTun({ typ: 'abteilungSetzen', abteilung: a, gebaeude: g, etage: Number(nr) }); }
  if (art === 'etage') { hqEtageWahl = { g: a, nr: Number(b) }; oeffneHq(offenesHq === true ? undefined : offenesHq, true); }
};
function oeffneHq(gebaeudeId, bleiben = false) {
  if (typeof E.hqUebersicht !== 'function') return;
  offenesHaus = null; offenesHq = gebaeudeId ?? true;
  const u = E.hqUebersicht(s), j = hqGrafik();
  if (hqAbteilung && u.abteilungen.some((a) => a.id === hqAbteilung)) {
    const r = zentraleAbteilungHtml(u, j, E.organisationUebersicht(s), hqAbteilung, hqEtageWahl);
    const sc = $('pinhalt').scrollTop;
    panel(r.titel, r.unter, r.html, 'gross');
    if (bleiben) $('pinhalt').scrollTop = sc;
    return;
  }
  const zahl = (t, w, ton = '') => `<div class="kz ${ton}"><span>${t}</span><b>${w}</b></div>`;
  const pz = (x) => `${Math.round((x ?? 0) * 100)} %`;
  const knopf = (text, args, art = '') => `<button class="mini ${art}" onclick="event.stopPropagation();hqKlick(${args.map((x) => `'${x}'`).join(',')})">${text}</button>`;
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
      html += `<div class="zeile klickbar ${e.gemietet ? '' : 'grau'} ${gewaehlt ? 'gewaehlt' : ''}" onclick="hqKlick('${e.archiv ? 'archivOeffnen' : 'etage'}','${g.id}','${e.nr}')"><span class="dot ${e.archiv ? 'k-eigen' : e.gemietet ? (ab ? 'k-eigen' : 'k-untermiete') : 'k-leer'}"></span><span class="was">${e.nr === 0 ? 'Erdgeschoss' : `${e.nr}. Etage`}${ab ? ` <i>${ab}</i>` : e.gemietet ? ' <i>gemietet, frei</i>' : ' <i>nicht gemietet</i>'}${e.archiv ? ' <b>Archiv</b>' : ''}</span><span class="qm">${fmt.format(e.qm)} qm</span><span class="uq">${e.gemietet ? pz(e.auslastung) : ''}</span>${e.gemietet ? knopf(e.archiv ? 'Auflösen' : 'Archiv einrichten', ['archiv', g.id, e.nr, !e.archiv], e.archiv ? 'rot' : 'gruen') : ''}${e.archiv ? knopf('Chronik ansehen', ['archivOeffnen']) : ''}${e.gemietet && !ab && !e.archiv ? knopf('Kündigen', ['kuendigenE', g.id, e.nr], 'rot') : ''}</div>`;
    }
    html += '</div>';
  }
  if (u.abteilungen?.length) {
    html += '<div class="karte"><div class="khead">Abteilungen</div>';
    for (const a of u.abteilungen) {
      const um = a.umzugBis !== undefined && a.umzugBis > s.woche ? ` · Umzug bis KW ${(a.umzugBis % 52) + 1}` : '';
      const ort = a.gebaeudeId ? `${a.gebaeudeId}|${a.etage}` : '';
      const wahl = `<select class="ort" onchange="hqKlick('setzen','${a.id}',this.value)">${ort ? '' : '<option selected>ohne Platz</option>'}${ziele.map((z) => `<option value="${z.v}"${z.v === ort ? ' selected' : ''}>${z.t}</option>`).join('')}</select>`;
      html += `<div class="abt"><div class="zeile"><span class="dot" style="background:${HQ_ABT[a.id]?.farbe ?? STUFE_FARBE[a.stufe]}"></span><span class="was"><b>${a.name}</b> <i>${fmt.format(Math.round(a.fte))} von ${fmt.format(a.sollFte)} FTE · ${geld(a.kostenWoche)} je Woche${um}</i><em class="wirk">${a.wirkung ?? ''}</em></span><span class="stufe">${knopf('Öffnen', ['abteilung', a.id])}${knopf('−', ['stufe', a.id, a.stufe - 1])}<b>${a.stufe}</b>${knopf('+', ['stufe', a.id, a.stufe + 1])}</span></div><div class="zeile unter">${wahl}</div></div>`;
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
let es = null;
es = einstellungenModul({ panel });
aktiviereBarrierefreiheit();
let ek = null;
ek = einkaufModul({ E, q: EQ, s: () => s, panel, meldung, nachAktion: () => { cockpitZeigen(); ek.badge(); menueBadge(); automatischSpeichern(); } });
function oeffneEinkauf(seite = 'uebersicht', arg) { offenesHaus = null; offenesHq = null; ek.oeffne(seite, arg); }
$('einkauf').addEventListener('click', () => oeffneEinkauf());
const hb = hausbesuchModul({ E, s: () => s, stadtName: () => stadtName, oeffneEinkauf, erstHaus: () => offenesHaus || s?.haeuser.find((h) => h.stadt === stadtName && h.status === 'offen')?.id, menueZu });
// ─────────────────────────────────────────── Vorstand, Marketing, Produktentwicklung (ui/vorstand.js, marketing.js, produkte.js)
let vs = null, mk = null, pr = null, po = null, org = null, rg = null, itM = null, pl = null, um = null, pe = null, spielende = null, er = null, zt = null, ec = null;
const nachAktion = () => { cockpitZeigen(); stadtChipsZeigen(); ek.badge(); menueBadge(); angebotsPinsAktualisieren(); hausPinsAktualisieren(); zeichnen(); automatischSpeichern(); if (s.ende) setTimeout(() => spielende?.anzeigen(), 0); };
vs = vorstandModul({ E, s: () => s, panel, meldung, nachAktion });
org = organisationModul({ E, s: () => s, panel, meldung, nachAktion, oeffneAbteilung: oeffneHqAbteilung,
  oeffneHaus: (id) => oeffneHaus(id), oeffnePortfolio: () => oeffneModul(pp, 'liste') });
// O03 IT
itM = itModul({ E, s: () => s, panel, meldung, nachAktion });
mk = marketingModul({ E, s: () => s, stadt: () => stadtName, panel, meldung, nachAktion, neueEigenmarke: () => oeffneEinkauf('gruenden') });
pr = produkteModul({ E, s: () => s, panel, meldung, nachAktion, neueEigenmarke: () => oeffneEinkauf('gruenden') });
// O09 E-Commerce
ec = ecommerceModul({ E, s: () => s, panel, meldung, nachAktion: () => { nachAktion(); grafikNachziehen(); }, oeffneItProdukt: id => itM.oeffne('produkte',id) });
er = erfolgeModul({ E, s: () => s, panel });
// O06 Planung: eigenständiger Assistent und Forecast.
pl = planungModul({ E, s: () => s, panel, meldung, nachAktion });
um = umbauModul({ E, s:()=>s, panel, meldung, nachAktion:()=>{ grafikNachziehen(); nachAktion(); }, hausOeffnen: oeffneHaus });
// O04 Personal
pe = personalModul({ E, s: () => s, panel, meldung, nachAktion, oeffneHaus });
po = posteingangModul({
  E, s: () => s, panel, meldung, nachAktion, zustand: () => postUi, nachZustand: automatischSpeichern,
  springe: (bezug) => {
    if (bezug.modul && !bezug.hausIds?.length && !bezug.stadt) {
      if (bezug.modul === 'einkauf') return oeffneEinkauf();
      if (bezug.modul === 'vorstand') return oeffneModul(vs);
      if (bezug.modul === 'organisation') return oeffneModul(org);
      if (bezug.modul === 'it') return oeffneModul(itM);
      if (bezug.modul === 'marketing') return oeffneModul(mk);
      if (bezug.modul === 'ecommerce') return oeffneModul(ec);
      if (bezug.modul === 'produkte') return oeffneModul(pr);
      if (bezug.modul === 'planung') return oeffneModul(pl);
      if (bezug.modul === 'personal') return oeffneModul(pe);
      if (bezug.modul === 'zentrale') return oeffneHq();
      if (bezug.modul === 'umbau') return oeffneModul(um);
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
    else if (bezug.modul === 'organisation') oeffneModul(org);
    else if (bezug.modul === 'it') oeffneModul(itM);
    else if (bezug.modul === 'marketing') oeffneModul(mk);
    else if (bezug.modul === 'ecommerce') oeffneModul(ec);
    else if (bezug.modul === 'produkte') oeffneModul(pr);
    else if (bezug.modul === 'planung') oeffneModul(pl);
    else if (bezug.modul === 'personal') oeffneModul(pe);
    else if (bezug.modul === 'zentrale') oeffneHq();
    else if (bezug.modul === 'umbau') oeffneModul(um);
    else schliessePanel();
  },
});

// ─────────────────────────────────────────── Handelsbote
zt = zeitungModul({ E, s: () => s, panel, meldung, nachAktion });
$('zeitung').addEventListener('click', () => oeffneModul(zt));

// ─────────────────────────────────────────── Spielende
spielende = spielendeModul({
  E, s: () => s,
  neuesSpiel: () => { schliessePanel(); menueZu(); startZeigen(); },
  fortgesetzt: () => { cockpitZeigen(); $('spiel-ruhestand').hidden = s.woche < 260 || s.szenario?.id === 'sandkasten'; automatischSpeichern(); },
  fehler: (text) => meldung(text, false),
});
$('spiel-bestenliste').addEventListener('click', () => { menueZu(); spielende.bestenliste(); });
$('spiel-ruhestand').addEventListener('click', () => {
  menueZu();
  const r = E.fuehreAus(s, { typ: 'ruhestand' });
  if (!r.ok) meldung(r.text, false);
  else { automatischSpeichern(); spielende.anzeigen(); }
});

st = statistikModul({ E, s: () => s, panel, oeffneHaus });
// O02 Umsatztreiber: klickbarer Portfolio-Bericht und Beobachtungsliste.
rg = reportingModul({ E, s: () => s, panel, inhalt: $('pinhalt'), hausOeffnen: (id) => {
  const h = s.haeuser.find((x) => x.id === id);
  if (h && h.stadt !== stadtName) { wahl.value = h.stadt; baueStadtAusSpiel(h.stadt); }
  oeffneHaus(id);
} });
$('reporting').addEventListener('click', () => oeffneModul(rg));

// ─────────────────────────────────────────── Reise & Wochenabschluss
reise = reiseModul({
  stadt: () => stadtName,
  staedte: () => STADTLISTE.filter((d) => s?.haeuser.some((h) => h.stadt === d.name)).map((d) => {
    const hs = s.haeuser.filter((h) => h.stadt === d.name && h.status !== 'geschlossen');
    const zahl = (rolle) => d.standorte.filter((p) => p.rolle === rolle).length;
    const formate = [['Hartwig', hs.filter((h) => h.format === 'warenhaus').length], ['Volkskauf', hs.filter((h) => h.format === 'schwester').length], ['Sport', hs.filter((h) => h.format === 'sport').length], ['FUNDUS', hs.filter((h) => h.format === 'outlet').length]];
    return { name: d.name, region: d.region, archetyp: d.archetyp, hauscluster: hs[0]?.hauscluster, groesse: hs.length, umsatz: hs.reduce((sum, h) => sum + (h.kpi?.umsatz ?? 0), 0),
      formate: formate.filter((p) => p[1]).map(([name, anzahl]) => ({ name, anzahl })) };
  }),
  pinPunkt: bahnhofBildpunkt,
  zuletzt: () => postUi.reiseZuletzt ?? [],
  besucht: (namen) => { postUi.reiseZuletzt = namen; },
  bauen: async (name) => { schliessePanel(); await baueStadtAusSpielReise(name); wahl.value = name; },
  vorschau: () => {
    if (!scene || !cam) return null;
    jetztZeichnen();
    const quelle = ren.domElement, c = document.createElement('canvas'); c.width = c.height = 96;
    const a = Math.min(quelle.width, quelle.height) * 0.54;
    try {
      c.getContext('2d').drawImage(quelle, (quelle.width - a) / 2, (quelle.height - a) / 2, a, a, 0, 0, 96, 96);
      return c.toDataURL('image/jpeg', .72);
    } catch (_) { return null; }
  },
  bahnhofFokussieren,
  fertig: () => { KA.pause = false; kachelnPlanen(); automatischSpeichern(); },
  fehler: (e) => { KA.pause = false; console.error('Bahnreise fehlgeschlagen:', e); meldung('Stadtwechsel fehlgeschlagen', false); },
});
wochenbericht = wochenberichtModul({
  modus: () => einstellung('wochenbericht'), warnen: () => einstellung('warnung'),
  cockpit: () => E.cockpit(s), posteingang: () => E.posteingang(s),
  historie: () => s.historie, wocheNr: () => s.woche,
  zeitung: () => E.zeitungAktuelle(s), oeffneZeitung: () => oeffneModul(zt),
  erfolge: () => E.erfolgeUebersicht(s).filter(x => Object.prototype.hasOwnProperty.call(x, 'freigeschaltet') && x.freigeschaltet === s.woche),
  kapitalfluss: () => E.kapitalfluss(s),
  person: (ressort) => s?.vorstand?.ressorts?.[ressort]?.person,
  woche: () => woche(false), sperren: () => { $('weiter').disabled = true; },
  entsperren: () => { $('weiter').disabled = false; },
  oeffneVorgang: (id) => oeffneModul(po, 'handeln', id),
  fehler: (e) => { console.error('Wochenabschluss fehlgeschlagen:', e); meldung('Woche konnte nicht abgeschlossen werden', false); },
});
// ─────────────────────────────────────────── N14: verborgene Testwerkzeuge
async function testStandLaden(d) {
  clearTimeout(speicherTimer);
  s = structuredClone(d.spiel);
  s.testGenutzt = true;
  postUi = { ...neuerPostUi(), ...(d.ui ?? {}) };
  if (!Array.isArray(postUi.gelesen)) postUi.gelesen = [];
  // Warnung und Wochenberichtsmodus liegen seit N13 in den Einstellungen (geräteweit).
  schwierigkeitId = s.schwierigkeit ?? 'mittel';
  $('stufe').textContent = SCHWIERIGKEITEN.find((x) => x.id === schwierigkeitId)?.name ?? schwierigkeitId;
  MERK.clear();
  schliessePanel();
  const ziel = STADTLISTE.some((x) => x.name === d.stadt) ? d.stadt : 'Essen';
  wahl.value = ziel;
  cockpitZeigen();
  baueStadtAusSpiel(ziel);
  ek.badge(); menueBadge();
  window.spiel.s = s;
  automatischSpeichern();
  wk.oeffne();
}
wk = werkzeugeModul({
  E, s: () => s, ui: () => postUi, stadt: () => stadtName, panel, meldung,
  nachAktion: () => {
    schwierigkeitId = s.schwierigkeit ?? 'mittel';
    $('stufe').textContent = SCHWIERIGKEITEN.find((x) => x.id === schwierigkeitId)?.name ?? schwierigkeitId;
    nachAktion();
  },
  teileStand, messung, renderFrame: jetztZeichnen, testWoche: (bot) => woche(bot, true), standLaden: testStandLaden,
});
$('stadt-reise').addEventListener('click', () => { schliessePanel(); menueZu(); reise.oeffne(); });
window.addEventListener('einstellung', (e) => {
  if (e.detail.schluessel === 'autospeichern' && !e.detail.wert) clearTimeout(speicherTimer);
  if (e.detail.schluessel === 'zahlen' && s) cockpitZeigen();
});

const oeffneModul = (m, ...a) => { offenesHaus = null; offenesHq = null; m.oeffne(...a); };
pp = portfolioModul({ E, s: () => s, panel, meldung, nachAktion,
  sprungStadt: (name) => portfolioStadtOeffnen(name),
  sprungHaus: (id) => {
    const h = s.haeuser.find((x) => x.id === id);
    if (h) portfolioStadtOeffnen(h.stadt, id);
  },
});
$('deutschland').addEventListener('click', () => oeffneModul(pp, 'karte'));
$('deutschland-direkt').addEventListener('click', () => oeffneModul(pp, 'karte'));
$('haeuser').addEventListener('click', () => oeffneModul(pp, 'liste'));
$('cockpit').addEventListener('click', (e) => {
  const b = e.target.closest('[data-format]');
  if (b) { pp.filterSetzen(b.dataset.format); oeffneModul(pp, 'liste'); }
});
$('vorstand').addEventListener('click', () => oeffneModul(vs));
$('organisation').addEventListener('click', () => oeffneModul(org));
// O03 IT
$('it').addEventListener('click', () => oeffneModul(itM));
$('marketing').addEventListener('click', () => oeffneModul(mk));
$('online').addEventListener('click', () => oeffneModul(ec));
$('modernisierung').addEventListener('click', () => oeffneModul(um));
$('produkte').addEventListener('click', () => oeffneModul(pr));
ch = chronikModul({ E, s: () => s, panel, bild: fassadeChronik });
$('chronik').addEventListener('click', () => oeffneModul(ch));
$('statistik').addEventListener('click', () => oeffneModul(st));
$('planung').addEventListener('click', () => oeffneModul(pl));
// O04 Personal
$('personaleinsatz').addEventListener('click', () => oeffneModul(pe));
$('posteingang').addEventListener('click', () => oeffneModul(po));
$('erfolge').addEventListener('click', () => oeffneModul(er));
// O07 Haus
$('beobachtung').addEventListener('click', oeffneBeobachtung);
$('haus-reporting').addEventListener('click', oeffneHausReporting);
$('hausbeobachtung').addEventListener('click', oeffneBeobachtung);
$('postdirekt').addEventListener('click', () => oeffneModul(po));
$('wochenstreifen').addEventListener('click', () => { $('wochenstreifen').classList.remove('an'); oeffneModul(po); });
$('einstellungen').addEventListener('click', () => oeffneModul(es));
// Menü wie Coffee Inc: Knopf unten rechts öffnet die Kacheln Zentrale, Einkauf, Vorstand, Marketing, Produkte
function menueZu() { $('menue').classList.remove('offen'); $('menue').inert = true; $('menueknopf').classList.remove('an'); }
$('menueknopf').addEventListener('click', () => { const o = !$('menue').classList.contains('offen'); if (o) { schliessePanel(); } $('menue').classList.toggle('offen', o); $('menue').inert = !o; $('menueknopf').classList.toggle('an', o); });
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
const app = appModul({
  panel, meldung,
  aktuell: () => s ? { spiel: s, stadt: stadtName, ui: postUi, bild: speicherVorschau } : null,
  ladenInSpiel: (platz) => spielFortsetzen(platz),
  vorNeuladen: () => s ? sofortSpeichern() : Promise.resolve()
});
$('app-oeffnen').addEventListener('click', () => { menueZu(); app.oeffne(); });
app.updatesAktivieren();
async function diagnoseZeigen() {
  if (!s || !scene) return;
  menueZu();
  panel('Performance', 'Messung direkt auf diesem Gerät', '<div class="karte"><div class="zeile">Bis zu 90 Frames werden aktiv gerendert …</div></div>', 'gross');
  const vorher = KA.pause, vorherLeben = leben.modus;
  KA.pause = true;
  leben.pause(true);
  try {
    const daten = { renderer: ren, scene: () => scene, camera: () => cam, anzahl: 45,
      info: () => ({ stadt: stadtName, woche: s.woche, teile: teileStand().teile, bild: canvas.width + ' × ' + canvas.height, grafikprofil: sparsam ? 'sparsam' : 'hoch' }) };
    leben.setzen('aus');
    const ohne = await performanceMessen(daten);
    leben.setzen(vorherLeben);
    const d = await performanceMessen({ ...daten, vorBild: vorherLeben === 'aus' ? undefined : () => leben.schritt(1 / 30, false) });
    d.vergleich = { ohneFps: ohne.fps, mitFps: d.fps, ohneRenderMs: ohne.renderMittelMs, mitRenderMs: d.renderMittelMs };
    const zeile = (name, wert) => `<div class="zeile"><span class="was">${name}</span><b>${wert}</b></div>`;
    const html = '<div class="karte"><div class="khead">' + d.frames + ' gerenderte Frames auf diesem Gerät</div>' +
      zeile('Bildrate ohne Leben', ohne.fps + ' FPS') +
      zeile('Bildrate mit Leben (' + vorherLeben + ')', d.fps + ' FPS') +
      zeile('Leben: Aktualisierung je Bild', d.updateMittelMs + ' ms (Ziel höchstens 2 ms)') +
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
    leben.setzen(vorherLeben);
    leben.pause(false);
    KA.pause = vorher;
    if (!KA.pause) kachelnPlanen();
  }
}
$('performance').addEventListener('click', diagnoseZeigen);

const ton = tonModul({ panel, spiel: () => s, ebitda13: () => s ? E.cockpit(s).ebitda13 : 0, zoom: () => K.halb });
$('ton').addEventListener('click', () => oeffneModul(ton));

// ─────────────────────────────────────────── Start
// Schwierigkeit: Engine-Konstante SCHWIERIGKEITEN, sonst Ersatz mit denselben Ids
const SCHWIERIGKEITEN = Array.isArray(E.SCHWIERIGKEITEN) && E.SCHWIERIGKEITEN.length ? E.SCHWIERIGKEITEN : [
  { id: 'leicht', name: 'Leicht', beschreibung: 'Mehr Liquidität, geduldige Banken und Lieferanten.' },
  { id: 'mittel', name: 'Mittel', beschreibung: 'Die Ausgangslage wie kalibriert.' },
  { id: 'schwer', name: 'Schwer', beschreibung: 'Knappe Kasse, nervöse Gläubiger, wenig Zeit.' },
];
let schwierigkeitId = 'mittel';
function neuesSpiel(seed = 1, stadt = 'Essen', schwierigkeit = schwierigkeitId, szenario = 'standard', startMonat = 1) {
  spielende?.zu(); $('spiel-ruhestand').hidden = true;
  // Sandkasten bietet keine Stufenwahl, auch bei einem Direktstart per URL.
  schwierigkeitId = szenario === 'sandkasten' ? 'mittel' : SCHWIERIGKEITEN.some((x) => x.id === schwierigkeit) ? schwierigkeit : 'mittel';
  s = E.neuesSpiel(seed, { ...E.szenarioKonfiguration(szenario, schwierigkeitId), schwierigkeit: schwierigkeitId, startMonat: Number(startMonat) });
  postUi = neuerPostUi();
  $('stufe').textContent = SCHWIERIGKEITEN.find((x) => x.id === schwierigkeitId)?.name ?? schwierigkeitId;
  MERK.clear();
  EQ.freigaben(s);
  cockpitZeigen();
  szenarienUI.aktualisieren();
  baueStadtAusSpiel(stadt);
  ek.badge(); menueBadge();
  window.spiel.s = s;
  wk?.nachStart();
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

window.spiel = { speicherDiagnose, meldung, ecommerce: ec, oeffneEcommerce: (...a) => oeffneModul(ec, ...a), chronik: () => E.chronikUebersicht(s), oeffneChronik: () => oeffneModul(ch), personaleinsatz: pe, oeffnePersonaleinsatz: (...a) => oeffneModul(pe, ...a), neuesSpiel, speichern: sofortSpeichern, portfolio: pp, oeffnePortfolio: (seite = 'liste') => oeffneModul(pp, seite), erfolge: er, oeffneErfolge: () => oeffneModul(er), statistik: st, oeffneStatistik: (...a) => oeffneModul(st, ...a), werkzeuge: wk, oeffneWerkzeuge: () => wk.oeffne(), einstellungen: es, oeffneEinstellungen: () => oeffneModul(es), planung: pl, oeffnePlanung: (...a) => oeffneModul(pl, ...a), it: itM, oeffneIt: (...a) => oeffneModul(itM, ...a), reporting: rg, oeffneReporting: () => oeffneModul(rg), posteingang: po, oeffnePosteingang: (...a) => oeffneModul(po, ...a), performanceMessen: diagnoseZeigen, ton, oeffneEinkauf, vorstand: vs, organisation: org, marketing: mk, produkte: pr, oeffneVorstand: (...a) => oeffneModul(vs, ...a), oeffneOrganisation: (...a) => oeffneModul(org, ...a), oeffneMarketing: (...a) => oeffneModul(mk, ...a), oeffneProdukte: (...a) => oeffneModul(pr, ...a), kachelnPause: (an) => { KA.pause = an; if (!an) kachelnPlanen(); }, hausEtage: (id, nr) => window.hausKlick('etage', id, nr), get innenbild() { return letztesInnenbild; }, get einkauf() { return ek; }, EQ, pruefeEinkauf: () => ek.pruefe(),
  oeffneWettbewerber,
  kameraHaus: hausKameraMessung, // lesender Pixelabgleich für den Mobil-Smoketest
  leben,
  reise, wochenbericht, hausbesuch: hb, oeffneHausbesuch: (id) => hb.oeffne(id), szenarien: szenarienUI, zeitung: zt, oeffneZeitung: (...a) => oeffneModul(zt, ...a), spielende, zeigeSpielende: () => spielende.anzeigen(), bahnhofFokussieren, bahnhofBildpunkt,
  // O07 Haus: lesende Abnahmefunktion; gleiches Engine-Objekt wie die Oberfläche.
  oeffneBeobachtung, oeffneHausReporting, oeffneHausReiter: (id, reiter) => { oeffneHaus(id); hausReiter = reiter; oeffneHaus(id); },
  pruefeHaus: (id) => { const d=E.hausUebersicht(s,id); hausReiter='ueberblick'; oeffneHaus(id); const text=$('pinhalt').textContent; const fehler=[];
    if (!text.includes(String(d.kundenScore))) fehler.push('Kundenscore fehlt');
    for (const [reiter,wort] of [['leitung',d.leitungsdaten.name],['kosten','Betriebskosten'],['kommentare','Wochenkommentierung']]) {
      hausReiter=reiter; oeffneHaus(id); if (!$('pinhalt').textContent.includes(wort)) fehler.push(reiter+' nicht korrekt');
    }
    hausReiter='ueberblick'; oeffneHaus(id);
    return { id, score:d.kundenScore, reiter:7, fehler }; },
  hauspinListe: () => hausPins.map(({ pin }) => ({ ...pin.userData })),
  pruefeHauspins: () => {
    // Die Sollposition wird aus dem eigenen Hausgrundriss, der Slot-Ecke und
    // der tatsächlich gebauten Höhe abgeleitet. Messung in CSS-Pixeln (iPhone).
    const fehler = [], liste = [...sb.haeuser.entries()].map(([id, eintrag]) =>
      ({ id, eintrag, haus: s.haeuser.find((h) => h.id === id) }))
      .concat([...sb.statischeHaeuser.entries()].map(([id, { haus, ...eintrag }]) =>
        ({ id, eintrag, haus })));
    const [w, h] = groesse(), pinMap = new Map(hausPins.map(({ pin, namensschild }) =>
      [pin.userData.hausId, { pin, namensschild }]));
    let maxAbstandPx = 0;
    for (const { id, eintrag, haus } of liste) {
      const pin = pinMap.get(id);
      if (!pin) { fehler.push('Pin fehlt: ' + id); continue; }
      const dach = hausDachpunkt(eintrag, haus);
      if (!dach) { fehler.push('Dachdaten fehlen: ' + id); continue; }
      const aktuell = pin.pin.position.clone().project(cam);
      const soll = new THREE.Vector3(dach.x, dach.y, dach.z).project(cam);
      const abstand = Math.hypot((aktuell.x - soll.x) * w / 2, (aktuell.y - soll.y) * h / 2);
      maxAbstandPx = Math.max(maxAbstandPx, abstand);
      if (abstand > 8) fehler.push(id + ': ' + abstand.toFixed(2) + ' px von Dachmitte entfernt');
      if (haus?.klasse === 'premium' && (!pin.namensschild || pin.pin.userData.format !== 'premium'))
        fehler.push(id + ': Premiumpin oder Namensschild fehlt');
    }
    if (pinMap.size !== liste.length) fehler.push('Anzahl Pins ' + pinMap.size + ', Häuser ' + liste.length);
    return { stadt: stadtName, geprueft: liste.length, maxAbstandPx: +maxAbstandPx.toFixed(3), fehler };
  },
  pruefeWettbewerber: () => {
    const soll = E.wettbewerbFuerGrafik(s, stadtName);
    const gezeigt = new Set([...sb.wettbewerber.keys(), ...soll.filter((w) => w.inHartwigGebaeude && w.status !== 'geschlossen' && sb.haeuser.has(w.inHartwigGebaeude)).map((w) => w.id)]);
    const pinIds = new Set(wettbewerbPins.map((p) => p.userData.wbId));
    const fehler = soll.filter((w) => w.status !== 'geschlossen' && !gezeigt.has(w.id)).map((w) => 'Fehlt: ' + w.id);
    for (const id of gezeigt) if (!pinIds.has(id)) fehler.push('Pin fehlt: ' + id);
    return { stadt: stadtName, woche: s.woche, quelle: soll.length, dargestellt: gezeigt.size, pins: pinIds.size, fehler };
  }, jahreszeit: () => jahreszeit(s), stadt: (n) => { wahl.value = n; return baueStadtAusSpiel(n); }, woche, bot: botSchritt, aktion: (a) => { const r = E.fuehreAus(s, a); nachAktion(); return r; }, oeffneHaus, schliessePanel, oeffneHq, oeffneHqAbteilung, messung, jetztZeichnen,
  /** Prüfung für spiel-render.js: angezeigte Werte (Cockpit, offenes HQ-Panel) gegen cockpit() und hqUebersicht(). */
  pruefeAnzeigen: () => {
    const fehler = [], c = E.cockpit(s);
    // Titel ohne eingebettete Auswahl (Formatfilter im Cockpit).
    const titel = (sp) => [...sp.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s*·\s*$/, '').trim();
    const kz = (wurzel) => new Map([...wurzel.querySelectorAll('.kz')].map((k) => [titel(k.querySelector('span')), k.querySelector('b').textContent]));
    const ck = kz($('cockpit'));
    const soll = { Cash: c.geldUnbegrenzt ? 'unbegrenzt' : geld(c.cash), 'Kreditrahmen frei': c.geldUnbegrenzt ? 'unbegrenzt' : geld(c.kreditFrei), Vertrauen: `${c.vertrauen} / 100`, Image: `${c.image} / 100` };
    if (s.historie.length) Object.assign(soll, { 'EBITDA 13 Wochen': geld(c.ebitda13), Umsatz: geld(c.umsatzWoche) });
    for (const [k, v] of Object.entries(soll)) if (ck.get(k) !== v) fehler.push(`Cockpit ${k}: ${ck.get(k)} statt ${v}`);
    if ($('kw').textContent !== `KW ${c.kw} / ${c.jahr}`) fehler.push(`KW: ${$('kw').textContent}`);
    // O02 Umsatztreiber: Browseranzeige gegen Engine und Brückensumme.
    if (offenesHaus) {
      const d = E.hausTreiber(s, offenesHaus);
      const el = $('pinhalt').querySelector('.o02-haus');
      if (d && el) {
        for (const [schluessel, sollWert] of Object.entries({ umsatz: d.aktuell.umsatz, frequenz: d.aktuell.frequenz, kaufquote: d.aktuell.kaufquote, bon: d.aktuell.bon }))
          if (Number(el.dataset['o02' + schluessel.charAt(0).toUpperCase() + schluessel.slice(1)]) !== sollWert) fehler.push('O02 ' + schluessel + ': Hausanzeige ungleich Engine');
        const br = el.querySelector('.o02-bruecke');
        if (br && Number(br.dataset.o02Summe) !== Number(br.dataset.o02Diff)) fehler.push('O02 Brücke summiert nicht exakt');
      } else if (d) fehler.push('O02 Haus-Treiberzeile fehlt');
    }
    if (rg?.aktiv?.() && !rg.pruefe()) fehler.push('O02 Reporting-Brücke summiert nicht exakt');
    if (offenesHq && hqAbteilung && typeof E.hqUebersicht === 'function') {
      const a = E.hqUebersicht(s).abteilungen.find((x) => x.id === hqAbteilung);
      const fte = $('pinhalt').querySelector('[data-q15-fte]'), gehalt = $('pinhalt').querySelector('[data-q15-gehalt]');
      if (!a || Number(fte?.dataset.q15Fte) !== a.fte || Number(gehalt?.dataset.q15Gehalt) !== a.gehaltFaktor)
        fehler.push('Q15: Abteilungswerte nicht identisch mit der Engine');
    } else if (offenesHq && typeof E.hqUebersicht === 'function') {
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
  kamera: (o) => { kameraZiel = null; steuerung.stopp(); Object.assign(K, o); kameraSetzen(); }, tippPunkt, fokusHaeuser, THREE, get K() { return K; }, get sb() { return sb; }, E };
// N04: eigenständige UI-Registrierung. Kein Eingriff in die Engine oder andere Module.
const einfuehrung = einfuehrungModul();
window.spiel.einfuehrung = einfuehrung;
// ─────────────────────────────────────────── Startbildschirm (Startstadt, Schwierigkeit, Seed); mit URL-Parametern direkt ins Spiel
const startWahl = { stadt: param.get('stadt') ?? 'Essen', schwierigkeit: param.get('schwierigkeit') ?? 'mittel', szenario: param.get('szenario') ?? 'standard', seed: Number(param.get('seed') ?? 1), startMonat: [1,4,7,10].includes(Number(param.get('monat'))) ? Number(param.get('monat')) : 1 };
function zeichneStufen() {
  const stufen = E.schwierigkeitenFuerSzenario?.(startWahl.szenario) ??
    (startWahl.szenario === 'sandkasten' ? [] : SCHWIERIGKEITEN);
  const stufenWahl = $('startstufen');
  stufenWahl.hidden = stufen.length === 0;
  stufenWahl.previousElementSibling.hidden = stufen.length === 0;
  if (!stufen.length) startWahl.schwierigkeit = 'mittel';
  stufenWahl.innerHTML = stufen.map((x, index) =>
    `<button class="stufe-karte ${x.id === startWahl.schwierigkeit ? 'an' : ''}" data-v="${x.id}"><span class="sterne-stufe">${'●'.repeat(index + 1)}${'○'.repeat(stufen.length - index - 1)}</span><b>${x.name}</b><small>${esc(x.beschreibung)}</small></button>`
  ).join('');
}
function startZeigen() {
  $('startstadt').innerHTML = STADTLISTE.map((q) => `<option${q.name === startWahl.stadt ? ' selected' : ''}>${q.name}</option>`).join('');
  $('startseed').value = startWahl.seed;
  $('startmonat').value = startWahl.startMonat;
  szenarienUI.zeichneStart();
  $('start').classList.add('an');
  $('lade').classList.remove('an');
  app.startAktualisieren();
  laden().then((datensatz) => {
    const b = $('fortsetzen');
    b.hidden = !datensatz;
    if (datensatz) b.textContent = `Fortsetzen · KW ${datensatz.spiel.woche % 52 + 1} / ${datensatz.spiel.startJahr + Math.floor(datensatz.spiel.woche / 52)}`;
    $('speicherhinweis').textContent = '';
  }).catch((e) => { $('fortsetzen').hidden = true; $('speicherhinweis').textContent = e.message; });
}
$('startstufen').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; startWahl.schwierigkeit = b.dataset.v; startZeigen(); });
$('startstadt').addEventListener('change', (e) => { startWahl.stadt = e.target.value; });
$('startmonat').addEventListener('change', (e) => { startWahl.startMonat = Number(e.target.value); });
$('startseed').addEventListener('change', (e) => { startWahl.seed = Math.max(1, Math.round(Number(e.target.value) || 1)); });
// Q02: Das Ladebild muss tatsächlich gezeichnet sein, bevor die synchrone Stadterzeugung beginnt.
const q02Bildwechsel = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const q02Start = { phase: 'bereit', zeit: 0, grundkacheln: 0 };
async function spielStarten() {
  $('start').classList.remove('an');
  $('lade').classList.add('an');
  window.bereit = false;
  q02Start.phase = 'ladebild'; q02Start.zeit = performance.now();
  try {
    await q02Bildwechsel();
    q02Start.phase = 'grundaufbau';
    wahl.value = startWahl.stadt;
    neuesSpiel(startWahl.seed, startWahl.stadt, startWahl.schwierigkeit, startWahl.szenario, startWahl.startMonat);
    q02Start.phase = 'grundkacheln'; q02Start.grundkacheln = KA.liste.filter((k) => k.gruppe).length;
    // Das erste sichtbare Bild zeigt Plan, Grundkacheln und alle bereits gebauten mittigen Details.
    await q02Bildwechsel();
    q02Start.phase = 'sichtbar';
    $('lade').classList.remove('an');
    window.bereit = true;
    einfuehrung.spielStart();
    kachelnPlanen();
  } catch (e) {
    $('lade').classList.remove('an');
    $('start').classList.add('an');
    q02Start.phase = 'fehler';
    throw e;
  }
}
$('startknopf').addEventListener('click', spielStarten);
async function spielFortsetzen(platz = 'autosave') {
  const b = $('fortsetzen');
  b.disabled = true;
  try {
    const d = await laden(platz);
    if (!d) throw new Error('Kein Spielstand vorhanden.');
    clearTimeout(speicherTimer);
    s = d.spiel;
    // O01: ältere Spielstände ohne Organisationsmodell einmalig migrieren.
    if (!s.organisation) E.bildeHauscluster(s);
    // O04: alte Spielstände ohne Personalplanung deterministisch migrieren.
    if (!s.personaleinsatz || s.haeuser.some((h) => !h.personaleinsatz)) E.initialisierePersonaleinsatz(s);
    postUi = { gelesen: d.ui?.gelesen ?? [], reiter: d.ui?.reiter ?? 'handeln', reiseZuletzt: d.ui?.reiseZuletzt ?? [] };
    if (!Array.isArray(postUi.gelesen)) postUi.gelesen = [];
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
    szenarienUI.aktualisieren();
    baueStadtAusSpiel(wahl.value);
    ek.badge(); menueBadge();
    window.spiel.s = s;
    wk?.nachStart();
    window.bereit = true;
    $('lade').classList.remove('an');
    einfuehrung.spielStart(true);
    $('spiel-ruhestand').hidden = s.woche < 260 || !!s.ende || s.szenario?.id === 'sandkasten';
    if (s.ende || s.phase === 'zerschlagen') spielende.anzeigen();
    else meldung('Spielstand fortgesetzt.');
    return true;
  } catch (e) {
    $('lade').classList.remove('an');
    $('start').classList.add('an');
    $('speicherhinweis').textContent = e.message;
    meldung('Laden fehlgeschlagen: ' + e.message, false);
    return false;
  } finally {
    b.disabled = false;
  }
}
$('fortsetzen').addEventListener('click', () => spielFortsetzen());
window.spiel.fortsetzen = spielFortsetzen;
window.spiel.app = app;
window.spiel.startZeigen = startZeigen;
window.spiel.q02Start = q02Start;
window.spiel.SCHWIERIGKEITEN = SCHWIERIGKEITEN;
Object.defineProperty(window.spiel, 'schwierigkeit', { get: () => schwierigkeitId });
setTimeout(() => {
  if (param.has('stadt') || param.has('schwierigkeit') || param.has('seed') || param.has('szenario')) spielStarten();
  else startZeigen();
}, 20);

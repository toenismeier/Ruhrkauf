// Pilot Kartenweg Essen: echter Ausschnitt aus osm2streets + OpenStreetMap + LoD2 NRW, Spielansicht (Hochformat).
// Rendern: cd render && node render-katalog.js pilot-osm-essen
import { THREE, kameraFuer } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { baueKartenPilot } from '../kit/karten/pilot-osm.js';
import daten from '../../karten/pilot/essen-kern.json';

const ANSICHTEN = [
  { titel: 'Hauptbahnhof mit Gleisharfe', pos: [185, 355], zoom: 150 },
  { titel: 'Kettwiger Straße', pos: [85, 90], zoom: 110 },
  { titel: 'Markt, Marktkirche, Limbecker Straße', pos: [40, -170], zoom: 110 },
  { titel: 'Münster', pos: [135, -105], zoom: 75 },
  { titel: 'Rathaus (Hochhaus)', pos: [275, -355], zoom: 120 },
  { titel: 'Limbecker Platz', pos: [-410, -374], zoom: 150 },
  { titel: 'Spielzoom Kettwiger Straße', pos: [70, 160], zoom: 62 },
  { titel: 'Ganzer Pilotausschnitt', pos: [85, 90], zoom: 560 },
];

const KACHEL = [720, 1280], RAND = 1.06;
/** Bodenfenster [x0, z0, x1, z1], das die Spielkamera bei y = 0 sieht (plus Rand für hohe Häuser am Bildrand). */
function sichtFenster(box) {
  const cam = kameraFuer(KACHEL[0], KACHEL[1], box, RAND);
  cam.updateMatrixWorld();
  const vorne = new THREE.Vector3(0, 0, -1).transformDirection(cam.matrixWorld);
  const pts = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const o = new THREE.Vector3(sx, sy, 0).unproject(cam);
    const t = -o.y / vorne.y;
    pts.push(o.clone().addScaledVector(vorne, t));
  }
  const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
  // Sichtviereck als Prädikat: Punkt (mit Radius) liegt im konvexen Viereck oder höchstens r davor
  const q = pts.map((p) => [p.x, p.z]);
  let flaeche = 0; for (let i = 0; i < 4; i++) { const [ax, az] = q[i], [bx, bz] = q[(i + 1) % 4]; flaeche += ax * bz - bx * az; }
  const sg = Math.sign(flaeche);
  const drin = (x, z, r = 0) => q.every(([ax, az], i) => { const [bx, bz] = q[(i + 1) % 4]; const l = Math.hypot(bx - ax, bz - az); return sg * ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / l >= -r - 8; });
  return { f: [Math.min(...xs) - 20, Math.min(...zs) - 20, Math.max(...xs) + 60, Math.max(...zs) + 60], drin };
}
const eintraege = ANSICHTEN.map((v) => ({
  titel: 'Essen Pilot · ' + v.titel, unter: '',
  bau(S, scene) {
    const t0 = performance.now();
    const [x, z] = v.pos, r = v.zoom;
    const box = new THREE.Box3(new THREE.Vector3(x - r, 0, z - r), new THREE.Vector3(x + r, 25, z + r));
    const { f, drin } = sichtFenster(box);
    const z1 = baueKartenPilot(S, scene, daten, f, { fenster: r < 300, drin });
    let dreiecke = 0;
    for (const gs of S.teile.values()) for (const g of gs) dreiecke += g.attributes.position.count / 3;
    this.unter = `${z1.gebaeude} Gebäude · ${Math.round(dreiecke / 1000)} Tsd. Dreiecke · ${S.teile.size} Farben · ${Math.round(performance.now() - t0)} ms · OSM ODbL, LoD2 NRW`;
    console.log('LEER ' + v.titel + ' | ' + this.unter);
    return box;
  },
}));
window.addEventListener('load', () => setTimeout(() =>
  zeigeKatalog(eintraege, { titel: 'Pilot Kartenweg Essen: osm2streets + OSM + LoD2 NRW', spalten: 4, kachel: KACHEL, rand: RAND }), 20));

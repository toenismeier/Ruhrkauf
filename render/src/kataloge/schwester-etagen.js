// Drei Schnitte aus derselben grundriss.js – mit kette:'schwester', keine Kopie.
import { THREE, setzeLod } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { etage } from '../kit/grundriss.js';
import { NAME_SCHWESTER } from '../kit/schwesterhaus.js';
import hauser from '../../haeuser-schwester.json';

const pruef = [
  { haus: hauser[0], nr: 0, titel: 'Erdgeschoss · Schaufenster, kleine Abteilungen' },
  { haus: hauser[1], nr: 1, titel: '1. OG · dezentraler Kassenpunkt' },
  { haus: hauser[2], nr: -1, titel: 'Untergeschoss · Lager und Anlieferung' },
];
setTimeout(() => {
  setzeLod('nah');
  zeigeKatalog(pruef.map(({ haus, nr, titel }) => ({
    titel,
    unter: haus.id + ' ' + haus.stadt + (nr < 0 ? ' · UG' : ' · ' + nr + '. Etage'),
    bau(S, scene) {
      const o = etage(S, scene, haus, nr, { dichte: 0.55, kunden: nr < 0 ? 0 : 8, budget: 16000 });
      return o.box ?? new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(45, 6, 35));
    },
  })), { titel: NAME_SCHWESTER + ' – Etagen', spalten: 3, kachel: [640, 520], rand: 1.08 });
}, 30);

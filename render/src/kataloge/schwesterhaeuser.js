// Alle 24 Schwester-Häuser sowie sechs Zustände je Familie.
import { THREE, sockel, setzeLod } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { schwesterhaus, masseSchwester, familieSchwester, NAME_SCHWESTER, FAMILIEN_SCHWESTER } from '../kit/schwesterhaus.js';
import hauser from '../../haeuser-schwester.json';

const ZUSTAENDE = [
  ['umbau', 'Umbau'], ['raeumung', 'Räumung'], ['leer', 'Leer'],
  ['geschlossen', 'Geschlossen'], ['untermiete', 'Untermieter EG + OG'], ['verfall', 'Patina'],
];
const eintraege = hauser.map((haus) => ({
  titel: haus.id + ' ' + haus.stadt,
  unter: FAMILIEN_SCHWESTER[familieSchwester(haus)] + ' · ' + haus.baujahr,
  bau(S, scene) {
    const o = schwesterhaus(S, scene, haus, { x: 0, z: 0, passanten: false });
    sockel(S, 0, 0, o.w, o.d, 3);
    return new THREE.Box3(new THREE.Vector3(-3, 0, -3), new THREE.Vector3(o.w + 3, o.hoehe, o.d + 3));
  }
}));
for (const familie of [1, 2, 3]) {
  const haus = hauser.find((q) => familieSchwester(q) === familie);
  for (const [status, name] of ZUSTAENDE) eintraege.push({
    titel: NAME_SCHWESTER + ' F' + familie + ': ' + name,
    unter: FAMILIEN_SCHWESTER[familie],
    bau(S, scene) {
      const o = schwesterhaus(S, scene, { ...haus, substanz: status === 'verfall' ? 15 : 48 }, { x: 0, z: 0, familie, status, passanten: false });
      sockel(S, 0, 0, o.w, o.d, 4);
      return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(o.w + 4, o.hoehe, o.d + 4));
    },
  });
}
setTimeout(() => {
  setzeLod('nah');
  zeigeKatalog(eintraege, { titel: NAME_SCHWESTER + ' – Nachkriegs-Warenhäuser', spalten: 6, kachel: [350, 340], rand: 1.18 });
}, 30);

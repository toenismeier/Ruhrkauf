// Kleine 6er-Stichprobe für visuelle Qualitätskontrolle und Vergleich der drei Familien.
import { THREE, sockel, setzeLod } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { schwesterhaus, NAME_SCHWESTER, FAMILIEN_SCHWESTER } from '../kit/schwesterhaus.js';
import hauser from '../../haeuser-schwester.json';

const eintraege = [];
for (const fam of [1, 2, 3]) {
  const h = hauser[fam - 1];
  for (const alt of [false, true]) {
    eintraege.push({
      titel: FAMILIEN_SCHWESTER[fam],
      unter: (alt ? 'abgenutzt' : 'normal') + ' · ' + NAME_SCHWESTER,
      bau(S, scene) {
        const e = schwesterhaus(S, scene, { ...h, substanz: alt ? 22 : 60 }, { familie: fam, x: 0, z: 0, passanten: false });
        sockel(S, 0, 0, e.w, e.d, 3);
        return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(e.w + 4, e.hoehe, e.d + 4));
      }
    });
  }
}
setTimeout(() => { setzeLod('nah'); zeigeKatalog(eintraege, {titel: NAME_SCHWESTER + ' – Fassadenstichprobe', spalten: 3, kachel: [400, 380], rand: 1.12}); }, 30);

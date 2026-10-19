// 24 Fernstufen – erkennt Performance-/LOD-Fehler in denselben Hausgeneratoren.
import { THREE, sockel, setzeLod } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { schwesterhaus, NAME_SCHWESTER } from '../kit/schwesterhaus.js';
import hauser from '../../haeuser-schwester.json';

setTimeout(() => {
  setzeLod('fern');
  zeigeKatalog(hauser.map((h) => ({
    titel: h.id + ' ' + h.stadt,
    unter: 'LOD fern · ' + h.baujahr,
    bau(S, scene) {
      const e = schwesterhaus(S, scene, h, { passanten: false });
      if (e.teile > 8000) throw new Error('Teilebudget: ' + h.id + ' ' + e.teile);
      sockel(S, 0, 0, e.w, e.d, 3);
      return new THREE.Box3(new THREE.Vector3(-3, 0, -3),
        new THREE.Vector3(e.w + 3, e.hoehe + 1, e.d + 3));
    }
  })), { titel: NAME_SCHWESTER + ' – 24 Häuser / LOD fern', spalten: 8, kachel: [250, 260], rand: 1.18 });
}, 30);

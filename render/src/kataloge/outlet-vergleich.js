// Gleiche Kachelabmessung: seriöser Marken-Off-Price versus die drei preisgetriebenen Wettbewerber.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { outlet, NAME_OUTLET } from '../kit/outlet.js';
import { wettbewerber, NAMEN } from '../kit/wettbewerber.js';
import ha from '../../haeuser-outlet.json';
const muster = [ha[0], ha[1], ha[14]];
const eintraege = [
  ...muster.map((h) => ({
    titel: NAME_OUTLET + ' ' + h.stadt, unter: 'Marken-Off-Price · eigene Kette',
    bau(S, scene) {
      const e = outlet(S, scene, h, { x: 0, z: 0 });
      sockel(S, 0, 0, e.w, e.d, 4);
      return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(e.w + 4, e.hoehe, e.d + 4));
    },
  })),
  ...NAMEN.offprice.slice(0, 3).map((name, i) => ({
    titel: name, unter: 'Billig-Wettbewerber · Fremdkette',
    bau(S, scene) {
      const w = 43 + i * 6, d = 35;
      const e = wettbewerber(S, scene, { x: 0, z: 0, w, d, seed: i + 31, art: 'offprice', name, form: i, region: 'west' });
      sockel(S, 0, 0, w, d, 4);
      return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(w + 4, e.hoehe, d + 4));
    },
  })),
];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'FUNDUS – Abgrenzung zu Kaufkiste, Wühlwerk, Resteparadies', spalten: 3, kachel: [640, 520] }), 20));

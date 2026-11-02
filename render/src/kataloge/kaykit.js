// KayKit Furniture Bits (CC0) im flachen Stil: alle umgewandelten Modelle, Standardfarben und eine Stoffvariante.
import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { vorbereiten, lokal } from '../kit/innen.js';
import { kaykit, KAYKIT_MODELLE } from '../kit/moebel/kaykit.js';
const e = KAYKIT_MODELLE.map((name) => ({
  titel: name, hintergrund: '#26313a',
  bau(S, scene) {
    vorbereiten(S, scene);
    S.box(5, 0.1, 4, 0, -0.05, 0, '#e9e1d4');
    const L = lokal(S, 0, 0, 0, 0);
    kaykit(L, name, -0.9, 0, 0);
    kaykit(L, name, 1.2, 0, 0, 0, { farben: { stoff: '#b5745a', kissen: '#5f7f8c', holz: '#7b5a40' } });
    return new THREE.Box3(new THREE.Vector3(-2.6, -0.2, -2), new THREE.Vector3(2.6, 2.2, 2));
  },
}));
zeigeKatalog(e, { titel: 'KayKit Wohnmöbel (CC0)', spalten: 6, kachel: [360, 280] });

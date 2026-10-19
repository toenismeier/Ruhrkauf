// Direktvergleich in einheitlichem Maßstab: pro Zeile eine Volkskauf-Familie neben Hartwig F3 und F4.
import { THREE, sockel, setzeLod } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { schwesterhaus, masseSchwester, NAME_SCHWESTER, FAMILIEN_SCHWESTER } from '../kit/schwesterhaus.js';
import { warenhaus, masse as masseHartwig } from '../kit/warenhaus.js';
import hauser from '../../haeuser-schwester.json';
import hartwig from '../../haeuser.json';

const eintraege = [];
for (const familie of [1, 2, 3]) {
  const w = hauser[familie - 1];
  const h = hartwig.filter((q) => q.stadt === w.stadt && q.format === 'warenhaus')
    .sort((a, b) => b.grundflaecheQm - a.grundflaecheQm)[0];
  if (!h) throw new Error('Vergleichshaus fehlt: ' + w.stadt);
  const wm = masseSchwester(w), hm3 = masseHartwig(h), hm4 = masseHartwig(h);
  // Die gemeinsame Bounding Box ist ueber alle drei Kacheln dieser Zeile identisch.
  // So ist Volkskauf tatsaechlich kleiner, statt automatisch auf dieselbe Bildgroesse gezoomt.
  const W = Math.max(wm.w, hm3.w, hm4.w) + 12, D = Math.max(wm.d, hm3.d, hm4.d) + 12;
  const makeBox = () => new THREE.Box3(new THREE.Vector3(-6, -1, -6),
    new THREE.Vector3(W, 43, D));
  eintraege.push({
    titel: NAME_SCHWESTER + ' F' + familie,
    unter: FAMILIEN_SCHWESTER[familie] + ' · ' + w.stadt,
    bau(S, scene) {
      schwesterhaus(S, scene, w, { familie, passanten: false });
      sockel(S, 0, 0, wm.w, wm.d, 4);
      return makeBox();
    }
  });
  for (const fam of [3, 4]) eintraege.push({
    titel: 'Hartwig F' + fam,
    unter: (fam === 3 ? 'Nachkrieg' : 'Kachelfassade') + ' · ' + h.stadt,
    bau(S, scene) {
      const o = warenhaus(S, scene, h, { familie: fam, passanten: false, vorplatz: false });
      sockel(S, 0, 0, o.w, o.d, 4);
      return makeBox();
    }
  });
}
setTimeout(() => {
  setzeLod('nah');
  zeigeKatalog(eintraege, { titel: NAME_SCHWESTER + ' – Hartwig F3/F4 · gleicher Maßstab', spalten: 3,
    kachel: [500, 450], rand: 1.06 });
}, 30);

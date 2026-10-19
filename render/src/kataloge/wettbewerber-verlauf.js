// Ein und derselbe Engine-Spielstand zu drei Zeitpunkten. Die identische
// Engine-Projektion wird auch vom echten Stadtbild verwendet.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { wettbewerber } from '../kit/wettbewerber.js';
import { neuesSpiel, wettbewerbFuerGrafik, wocheAbspielen } from '../../../engine/src/index';
import { botTief } from '../../../engine/scripts/bot';

const s = neuesSpiel(1);
const zeiten = [0, 30, 104], bilder = [];
for (let i = 0; i <= 104; i++) {
  if (zeiten.includes(i)) {
    const liste = ['Essen', 'Berlin'].flatMap((stadt) =>
      wettbewerbFuerGrafik(s, stadt).slice(0, 4).map((w) => ({ ...w, stadt, woche: i })));
    bilder.push(...liste);
  }
  if (i < 104 && s.phase !== 'zerschlagen') { botTief(s); wocheAbspielen(s); }
}
const eintraege = bilder.map((w, i) => ({
  titel: w.name + ' · ' + w.stadt,
  bau(S, scene) {
    const b = wettbewerber(S, scene, {
      x: 0, z: 0, w: 48, d: 36, seed: 41 + i,
      name: w.name, art: w.art, form: w.form, region: w.stadt === 'Berlin' ? 'ost' : 'west',
      zustand: { status: w.status, rabatt: w.rabatt },
    });
    sockel(S, 0, 0, 48, 36, 4);
    this.unter = 'W' + w.woche + ' · ' + w.status + ' · ' +
      (w.rabatt ? Math.round(w.rabatt * 100) + ' % · ' : '') + w.id;
    return new THREE.Box3(new THREE.Vector3(-5, 0, -5),
      new THREE.Vector3(53, b.hoehe + 3, 43));
  },
}));
setTimeout(() => zeigeKatalog(eintraege, {
  titel: 'Wettbewerber · Engine-Verlauf Wochen 0 / 30 / 104',
  spalten: 4, kachel: [560, 435],
}), 50);

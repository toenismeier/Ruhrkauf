// Gemeinsame Helfer für die Zustands-Kataloge.
import { sockel, THREE } from '../kit/basis.js';
import { warenhaus, FAMILIEN } from '../kit/warenhaus.js';

const EGW = ['beauty', 'accessoires', 'damen', 'food'];
export function haus(id, baujahr, etagen, qm, fassade, extra = {}) {
  const flaechen = EGW.map((g, i) => ({ etage: 0, qm: 400 - i * 50, konzept: 'eigen', gruppe: g }));
  for (let e = 1; e < etagen; e++) flaechen.push({ etage: e, qm: 800, konzept: 'eigen', gruppe: 'damen' });
  return { id, name: id, format: 'warenhaus', lage: '1a', grundflaecheQm: qm, etagen: [-1, ...Array.from({ length: etagen }, (_, i) => i)], baujahr, fassade, substanz: 70, status: 'offen', flaechen, ...extra };
}
let letzteSonne = null;
/** Kachel mit einem oder mehreren Häusern nebeneinander: haeuser = [[haus, opt], …] */
export function eintrag(titel, haeuser, unter = '') {
  return {
    titel, unter,
    bau(S, scene) {
      if (letzteSonne?.shadow.map) { letzteSonne.shadow.map.dispose(); letzteSonne.shadow.map = null; }
      letzteSonne = scene.userData.sonne;
      let x = 0, H = 0, D = 0;
      const info = [];
      for (const [h, opt] of haeuser) {
        const erg = warenhaus(S, scene, h, { x, z: 0, jahr: 2026, ...opt });
        info.push(`F${erg.familie} ${FAMILIEN[erg.familie]} · ${erg.teile} Teile`);
        H = Math.max(H, erg.hoehe); D = Math.max(D, erg.d);
        x += erg.w + 10;
      }
      const W = x - 10;
      sockel(S, 0, 0, W, D, 5);
      this.unter = [unter, info.join(' | ')].filter(Boolean).join(' · ');
      return new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(W + 5, H, D + 5));
    },
  };
}

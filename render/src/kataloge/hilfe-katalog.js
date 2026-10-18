import { sockel, THREE } from '../kit/basis.js';
import * as SB from '../kit/sonderbauten.js';

export function baueEintraegeL(liste) {
  return liste.map(([titel, fn, par, budget]) => ({
    titel,
    bau(S, scene) {
      const p = { x: 0, z: 0, ...par };
      const erg = (fn.startsWith('slot:') ? SB.SLOTS[fn] : SB[fn])(S, scene, p);
      const teile = S.anzahl;
      const b = new THREE.Box3();
      for (const gs of S.teile.values()) for (const g of gs) { g.computeBoundingBox(); b.union(g.boundingBox); }
      sockel(S, Math.min(b.min.x, 0), Math.min(b.min.z, 0), Math.max(b.max.x, p.w ?? 0) - Math.min(b.min.x, 0), Math.max(b.max.z, p.d ?? 0) - Math.min(b.min.z, 0), 3);
      S.anzahl = teile;
      this.unter = `${fn}(${erg.stil ? erg.stil : ''}) · ${teile} T. / ${budget} · ${erg.hoehe.toFixed(0)} m${teile > budget ? ' · ÜBER BUDGET' : ''}`;
      return null;
    },
  }));
}

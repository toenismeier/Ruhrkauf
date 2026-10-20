// Nahkamera direkt über der FUNDUS-Parzelle (Innenstadt oder Außenring).
import { THREE, setzeLod } from '../kit/basis.js';
import { stadtplan, baueStadt, setzeMarker } from '../kit/stadt.js';
import { echterBauer } from '../kit/bauer.js';
import { NAME_OUTLET } from '../kit/outlet.js';
import { stadtDaten } from '../kit/staedte.js';
import { ausschnittBauer, schneideAus, sichtFilter } from './_standorte-staedte.js';

export function outletLagenEintrag(name, zoom = 75) {
  return {
    titel: NAME_OUTLET + ' ' + name,
    unter: '',
    bau(S, scene) {
      const st = stadtDaten(name);
      const plan = stadtplan(st.seed, {
        typ: st.typ, archetyp: st.archetyp, region: st.region,
        strassenFaktor: 1.6, ...st.extra, standorte: st.standorte,
      });
      const lage = st.standorte.find((h) => h.rolle === 'outlet');
      if (!lage) throw new Error('FUNDUS nicht in Stadt ' + name);
      const parzellen = [...plan.parzellen, ...(plan.aussen?.bauten ?? [])];
      const p = parzellen.find((q) => q.standort?.id === lage.id);
      if (!p) throw new Error('FUNDUS-Parzelle fehlt: ' + lage.id);
      const x = p.x + p.w / 2, z = p.z + p.d / 2;
      const box = new THREE.Box3(
        new THREE.Vector3(x - zoom, 0, z - zoom),
        new THREE.Vector3(x + zoom, 25, z + zoom),
      );
      const bauer = ausschnittBauer(plan, echterBauer(), box, { kachel: [720, 1280] });
      setzeLod('nah');
      try {
        const result = baueStadt(S, scene, plan, bauer);
        schneideAus(S, scene, sichtFilter(box, { kachel: [720, 1280] }));
        setzeMarker(scene, plan, result, [{ parzelle: p.id, art: 'wettbewerber', groesse: 11 }]);
      } finally { setzeLod('nah'); }
      this.unter = lage.id + ' · ' + lage.lage + ' · ' + lage.grundflaecheQm + ' m²';
      return box;
    },
  };
}

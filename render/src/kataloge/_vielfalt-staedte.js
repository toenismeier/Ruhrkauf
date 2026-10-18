// Gemeinsame Städteliste für stadtvielfalt.js (Hochformat, Kartenansicht) und stadtvielfalt-uebersicht.js (ganze Stadt).
import { THREE } from '../kit/basis.js';
import { stadtplan, baueStadt, platzhalterBauer, parzellenBauer, setzeMarker, ausschnitt, ARCHETYPEN } from '../kit/stadt.js';

export const STAEDTE = [
  ['Wesselhaven', 31, 'grossstadt', 'raster', 'nord', { umriss: 'oval', umland: 'see' }],
  ['Altenstein', 32, 'mittelstadt', 'altstadt', 'mitte'],
  ['Hanseringen', 33, 'grossstadt', 'ring', 'nord'],
  ['Isarbrück', 34, 'grossstadt', 'flussknick', 'sued'],
  ['Oderwerth', 35, 'grossstadt', 'zweiarme', 'ost'],
  ['Rheinhaven', 36, 'metropole', 'bahnhof', 'west'],
  ['Domhagen', 37, 'grossstadt', 'dom', 'west'],
  ['Karlsau', 38, 'mittelstadt', 'residenz', 'sued'],
];

/** zoom: 0 = ganze Stadt, sonst halbe Kantenlänge des Ausschnitts in Metern um das Zentrum. */
export function stadtEintrag([name, seed, typ, archetyp, region, extra = {}], zoom, bauer = platzhalterBauer) {
  return {
    titel: `${name} · ${ARCHETYPEN[archetyp].name}`, unter: '',
    bau(S, scene) {
      const t0 = performance.now();
      const plan = stadtplan(seed, { typ, archetyp, region, strassenFaktor: 1.6, ...extra });
      const e = baueStadt(S, scene, plan, bauer === 'parzellen' ? parzellenBauer : bauer);
      const wh = plan.slots.find((p) => p.typ === 'slot:warenhaus');
      setzeMarker(scene, plan, e, wh ? [{ parzelle: wh.id, art: 'hartwig', groesse: zoom ? 10 : 18 }] : [], { leerstand: !!zoom });
      const lm = [...new Set(plan.landmarken.map((id) => plan.parzellen.find((p) => p.id === id)?.typ.slice(5)).filter(Boolean))];
      this.unter = `${typ} · ${region} · Umriss ${plan.umriss} · Markt ${plan.marktVariante} · ${lm.join(', ')} · ${Math.round(performance.now() - t0)} ms`;
      if (!zoom) return e.box;
      const wb = plan.bloecke.find((b) => b.art === 'warenhaus');
      const m = wb ? new THREE.Vector3(wb.x + wb.w / 2, 0, wb.z + wb.d / 2) : ausschnitt(plan, plan.kern.i, plan.kern.j, plan.kern.i, plan.kern.j).getCenter(new THREE.Vector3());
      return new THREE.Box3(new THREE.Vector3(m.x - zoom, 0, m.z - zoom), new THREE.Vector3(m.x + zoom, 25, m.z + zoom));
    },
  };
}

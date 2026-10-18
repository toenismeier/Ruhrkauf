// Komplette Stadtkarten mit allen echten Generatoren (iPhone-Hochformat).
import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { stadtplan, baueStadt, ausschnitt, setzeMarker } from '../kit/stadt.js';
import { echterBauer } from '../kit/bauer.js';

function karte(titel, typ, seed, zoom, opt = {}) {
  return {
    titel, unter: '',
    bau(S, scene) {
      const t0 = performance.now();
      const plan = stadtplan(seed, { typ, blockeX: opt.nx ?? 6, blockeZ: opt.nz ?? 8, strassenFaktor: 1.6 });
      const e = baueStadt(S, scene, plan, echterBauer(opt));
      const wh = plan.slots.find((p) => p.typ === 'slot:warenhaus');
      const marker = [{ parzelle: wh.id, art: 'hartwig' }];
      const andere = plan.parzellen.filter((p) => p.typ === 'eck' && p.hoehenklasse >= 4);
      ['wettbewerber', 'modehaus', 'bank'].forEach((a, i) => { const p = andere[(i * 7 + 3) % andere.length]; if (p) marker.push({ parzelle: p.id, art: a }); });
      setzeMarker(scene, plan, e, marker, { leerstand: true });
      this.unter = `${plan.bloecke.length} Blöcke · ${plan.parzellen.length} Parzellen · ${wh.haus ? wh.haus.name + ' (' + wh.haus.baujahr + ')' : ''} · Teile ${e.teileStrasse + e.teileHaeuser} · ${Math.round(performance.now() - t0)} ms`;
      if (!zoom) return e.box;
      const { i, j } = plan.kern;
      const b = ausschnitt(plan, i - 1, j, i, j, 20);
      const m = b.getCenter(new THREE.Vector3()), h = zoom * 60;
      return new THREE.Box3(new THREE.Vector3(m.x - h, 0, m.z - h), new THREE.Vector3(m.x + h, 25, m.z + h));
    },
  };
}

const eintraege = [
  karte('Metropole', 'metropole', 21, 1.25),
  karte('Großstadt', 'grossstadt', 22, 1.15),
  karte('Mittelstadt', 'mittelstadt', 23, 0.95),
  karte('Großstadt, Räumungsverkauf', 'grossstadt', 25, 0.7, { status: 'raeumung' }),
];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Stadtkarten mit allen Generatoren', spalten: 4, kachel: [900, 1600] }), 20));

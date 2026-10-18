// Komplette Stadtausschnitte im iPhone-Hochformat (Platzhalter-Bauer für die Häuser).
import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { stadtplan, baueStadt, platzhalterBauer, ausschnitt, setzeMarker } from '../kit/stadt.js';

function stadt(titel, typ, seed, nx, nz, zoom = 1, strassenFaktor = 1) {
  return {
    titel, unter: '',
    bau(S, scene) {
      const t0 = performance.now();
      const plan = stadtplan(seed, { typ, blockeX: nx, blockeZ: nz, strassenFaktor });
      const e = baueStadt(S, scene, plan, platzhalterBauer);
      const wh = plan.slots.find((p) => p.typ === 'slot:warenhaus');
      const marker = [{ parzelle: wh.id, art: 'hartwig' }];
      const andere = plan.parzellen.filter((p) => p.typ === 'eck' && p.hoehenklasse >= 4);
      ['wettbewerber', 'modehaus', 'bank', 'outlet'].forEach((a, i) => { const p = andere[(i * 7 + 3) % andere.length]; if (p) marker.push({ parzelle: p.id, art: a }); });
      setzeMarker(scene, plan, e, marker, { leerstand: true });
      let tris = 0, calls = 0, itris = 0;
      scene.traverse((o) => { if (o.isMesh) { calls++; const t = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); tris += t; if (o.isInstancedMesh) itris += t; } });
      let stris = 0; for (const gs of S.teile.values()) for (const g of gs) stris += g.attributes.position.count / 3;
      tris += stris;
      this.unter = `${plan.bloecke.length} Blöcke · ${plan.parzellen.length} Parzellen · Teile ${e.teileStrasse}+${e.teileHaeuser} · ${e.instanzen} Inst. · ${calls} Draw Calls · ${(tris / 1e6).toFixed(2)} Mio. Dreiecke (Props ${(itris / 1e6).toFixed(2)}) · ${Math.round(performance.now() - t0)} ms`;
      if (zoom === 0) return e.box;
      const { i, j } = plan.kern;
      const b = ausschnitt(plan, i - 1, j, i, j, 20);
      const m = b.getCenter(new THREE.Vector3()), h = zoom * 60;
      return new THREE.Box3(new THREE.Vector3(m.x - h, 0, m.z - h), new THREE.Vector3(m.x + h, 20, m.z + h));
    },
  };
}

const eintraege = [
  stadt('Metropole', 'metropole', 21, 6, 8, 1.2),
  stadt('Großstadt', 'grossstadt', 22, 6, 8, 1.1),
  stadt('Mittelstadt', 'mittelstadt', 23, 6, 8, 0.9),
  stadt('Großstadt, Straßen × 1,6 (Spielmaßstab)', 'grossstadt', 22, 6, 8, 1.2, 1.6),
  stadt('Großstadt, 8 × 8 Blöcke (Gesamtkarte)', 'grossstadt', 24, 8, 8, 0),
];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Stadtausschnitte', spalten: 5, kachel: [900, 1600] }), 20));

// Nahansicht der Plattenbaugebiete (WBS 70): Zeilen in beiden Richtungen, Höfe, Winkel, Kaufhalle, Schule, Kita.
// Statt Math.hypot: IEEE-genaue Wurzel, damit Schwellenvergleiche in allen JS-Engines gleich ausfallen.
const wurzelSumme = (...v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { stadtplan, baueStadt } from '../kit/stadt.js';
import { stadtDaten } from '../kit/staedte.js';
import { echterBauer } from '../kit/bauer.js';
function eintrag(name, nr = 0, zoom = 90) {
  const s = stadtDaten(name);
  return {
    titel: `${name} · Plattenbaugebiet ${nr + 1}`, unter: '',
    bau(S, scene) {
      const plan = stadtplan(s.seed, { typ: s.typ, archetyp: s.archetyp, region: s.region, strassenFaktor: 1.6, ...s.extra, standorte: s.standorte });
      baueStadt(S, scene, plan, echterBauer());
      const pl = plan.bloecke.filter((b) => b.art === 'platte');
      // Gebiet mit den meisten Plattenblöcken in der Nähe
      const wert = (b) => pl.filter((q) => wurzelSumme(q.x - b.x, q.z - b.z) < 260).length;
      pl.sort((a, b) => wert(b) - wert(a) || a.x - b.x);
      const b = pl[Math.min(nr * 7, pl.length - 1)];
      this.unter = `${pl.length} Plattenblöcke · Layouts ${[...new Set(pl.map((q) => q.layout))].join(', ')}`;
      const m = new THREE.Vector3(b.x + b.w / 2, 0, b.z + b.d / 2);
      return new THREE.Box3(new THREE.Vector3(m.x - zoom, 0, m.z - zoom), new THREE.Vector3(m.x + zoom, 25, m.z + zoom));
    },
  };
}
const eintraege = [eintrag('Halle', 0), eintrag('Magdeburg', 0), eintrag('Leipzig', 0), eintrag('Rostock', 0)];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Plattenbaugebiete nah', spalten: 2, kachel: [900, 900] }), 20));

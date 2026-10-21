// Q01 Phase 1, genau acht vom Auftrag vorgegebene Abnahmebilder.
// Rendern: cd render && node render-katalog.js karte-essen
// Die Bilder werden von Claude lokal erzeugt und auf dem iPhone beurteilt.
import essen from '../../karten/essen.json';
import { THREE, setzeLod } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { planAusKarte } from '../kit/stadtplan.js';
import { baueStadt } from '../kit/stadt.js';
import { echterBauer } from '../kit/bauer.js';
import { stadtDaten } from '../kit/staedte.js';
import { ESSEN_ANSICHTEN } from '../kit/karten/essen.js';

const stadt = stadtDaten('Essen');
const eintraege = ESSEN_ANSICHTEN.map(v => ({
  titel: 'Essen · ' + v.titel,
  unter: 'OSM, © OpenStreetMap-Mitwirkende, ODbL · ' + v.id,
  bau(S, scene) {
    const zeit = performance.now();
    const plan = planAusKarte(essen, { seed: stadt.seed, typ: stadt.typ, standorte: stadt.standorte });
    const [x, z] = [v.pos[0] + essen.radius_m, v.pos[1] + essen.radius_m];
    setzeLod('nah');
    const e = baueStadt(S, scene, plan, echterBauer(), { sicht: { x, z, radius: v.zoom * 2.2 } });
    const h = v.id === 'rathaus' ? 120 : 65;
    this.unter = v.id + ' · ' + (e.kartenStatistik?.zuege ?? 0) + ' Züge · ' +
      Math.round(performance.now() - zeit) + ' ms · OSM (ODbL)';
    return new THREE.Box3(new THREE.Vector3(x - v.zoom, 0, z - v.zoom),
      new THREE.Vector3(x + v.zoom, h, z + v.zoom));
  },
}));
window.addEventListener('load', () => setTimeout(() =>
  zeigeKatalog(eintraege, { titel: 'Q01 Essen: acht Kartendaten-Ansichten', spalten: 2, kachel: [720, 1280], rand: 1.06 }), 20));

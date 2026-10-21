// Reisemotiv (ruhr) für den Stadtwechsel: Iso-Stadtausschnitt ohne Marker. Erzeugt mit reise-motive.sh, Kopf und Beschriftung werden abgeschnitten.
import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { stadtplan, baueStadt } from '../kit/stadt.js';
import { echterBauer } from '../kit/bauer.js';

const [name, seed, typ, archetyp, region, extra = {}] = ['Rheinhaven', 36, 'metropole', 'bahnhof', 'west'];
const eintrag = {
  titel: name, unter: '',
  bau(S, scene) {
    const plan = stadtplan(seed, { typ, archetyp, region, strassenFaktor: 1.6, ...extra });
    baueStadt(S, scene, plan, echterBauer());
    const m = new THREE.Vector3(plan.kern ? 0 : 0, 0, 0);
    const wb = plan.bloecke.find((b) => b.art === 'warenhaus') ?? plan.bloecke[Math.floor(plan.bloecke.length / 2)];
    m.set(wb.x + wb.w / 2, 0, wb.z + wb.d / 2);
    const h = 105;
    return new THREE.Box3(new THREE.Vector3(m.x - h, 0, m.z - h), new THREE.Vector3(m.x + h, 30, m.z + h));
  },
};
window.addEventListener('load', () => setTimeout(() => zeigeKatalog([eintrag], { titel: '', spalten: 1, kachel: [1400, 2100] }), 20));

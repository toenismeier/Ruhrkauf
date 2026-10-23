// Q36: einzelne Häuser groß (Abnahme Schriftzug/Dach). Auswahl über window.Q36_IDS oder Standard.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { warenhaus } from '../kit/warenhaus.js';
import haupt from '../../haeuser.json';
const ids = (new URLSearchParams(location.search).get('ids') ?? 'W045,W001').split(',');
const eintraege = ids.map((id) => haupt.find((h) => h.id === id)).filter(Boolean).map((h) => ({
  titel: h.id + ' · ' + h.stadt, unter: 'Fassade ' + h.fassade + ' · ' + h.lage + ' · ' + h.baujahr,
  bau(S, scene) {
    const erg = warenhaus(S, scene, h, { x: 0, z: 0, passanten: false });
    sockel(S, 0, 0, erg.w, erg.d, 4);
    return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(erg.w + 4, erg.hoehe, erg.d + 4));
  },
}));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Q36 Häuser', spalten: 2, kachel: [1100, 900] }), 20));

// Gemeinsamer, paginierter Sichtatlas (höchstens 60 Kacheln je Seite).
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { warenhaus } from '../kit/warenhaus.js';
import { sporthaus } from '../kit/sporthaus.js';
import { schwesterhaus } from '../kit/schwesterhaus.js';
import { outlet } from '../kit/outlet.js';
import haupt from '../../haeuser.json';
import volkskauf from '../../haeuser-schwester.json';
import fundus from '../../haeuser-outlet.json';
const FORMATE = {
  hartwig: { daten: haupt.filter((h) => h.format === 'warenhaus' && h.klasse !== 'premium'), bau: warenhaus, seiten: 6 },
  premium: { daten: haupt.filter((h) => h.klasse === 'premium'), bau: warenhaus, seiten: 1 },
  volkskauf: { daten: volkskauf, bau: schwesterhaus, seiten: 2 },
  sport: { daten: haupt.filter((h) => h.format === 'sport'), bau: sporthaus, seiten: 1 },
  fundus: { daten: fundus, bau: outlet, seiten: 2 },
};
export function zeigeHausSeite(format, seite = 1) {
  const spec = FORMATE[format];
  if (!spec || seite < 1 || seite > spec.seiten) throw new Error('Ungültige Hauskatalogseite: ' + format + '/' + seite);
  let letzteSonne;
  const auswahl = spec.daten.slice((seite - 1) * 60, seite * 60);
  const eintraege = auswahl.map((h) => ({
    titel: h.id + ' · ' + h.stadt,
    unter: (h.hausklasse ?? h.klasse ?? h.lage) + ' · Fassade ' + h.fassade + ' · ' + h.grundflaecheQm + ' m²',
    bau(S, scene) {
      if (letzteSonne?.shadow?.map) { letzteSonne.shadow.map.dispose(); letzteSonne.shadow.map = null; }
      letzteSonne = scene.userData.sonne;
      const erg = spec.bau(S, scene, h, { x: 0, z: 0, passanten: false });
      const w = erg.w ?? erg.bw, d = erg.d ?? erg.bd, hoehe = erg.hoehe ?? erg.H;
      if (![w, d, hoehe].every(Number.isFinite)) throw new Error('Maße fehlen für ' + h.id);
      sockel(S, 0, 0, w, d, 4);
      return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(w + 4, hoehe, d + 4));
    },
  }));
  window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege,
    { titel: format.toUpperCase() + ' · ' + (auswahl.length ? ((seite - 1) * 60 + 1) + '–' + (seite * 60 - (60 - auswahl.length)) : '0') + ' / ' + spec.daten.length,
      spalten: 6, kachel: [370, 370] }), 20));
}

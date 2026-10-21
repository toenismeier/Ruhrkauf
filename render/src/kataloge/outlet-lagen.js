// Standort-Nahansichten: die Kamera zielt auf den tatsächlichen FUNDUS-Slot.
import { zeigeKatalog } from '../kit/katalog.js';
import { outletLagenEintrag } from './_outlet-staedte.js';
import outlets from '../../haeuser-outlet.json';

// Die ursprünglichen sechs Musterstädte sind im 66er-Netz nicht alle
// FUNDUS-Standorte. Je drei echte Rand- und Innenstadtlagen zeigen.
const beispiele = [
  ...outlets.filter((h) => h.lage === 'rand').slice(0, 3),
  ...outlets.filter((h) => h.lage === 'b').slice(0, 3),
];
const eintraege = beispiele.map((h) => outletLagenEintrag(h.stadt, h.lage === 'rand' ? 76 : 68));
window.addEventListener('load', () =>
  setTimeout(() => zeigeKatalog(eintraege, {
    titel: 'FUNDUS – Innenstadtlagen und Fachmarktstandorte im Außenring',
    spalten: 3, kachel: [720, 1280],
  }), 20));

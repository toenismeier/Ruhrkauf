// Standort-Nahansichten: die Kamera zielt auf den tatsächlichen FUNDUS-Slot.
import { zeigeKatalog } from '../kit/katalog.js';
import { outletLagenEintrag } from './_outlet-staedte.js';

const eintraege = [
  outletLagenEintrag('Düsseldorf', 68),
  outletLagenEintrag('Köln', 68),
  outletLagenEintrag('Berlin', 68),
  outletLagenEintrag('Essen', 76),
  outletLagenEintrag('Dortmund', 76),
  outletLagenEintrag('Duisburg', 76),
];
window.addEventListener('load', () =>
  setTimeout(() => zeigeKatalog(eintraege, {
    titel: 'FUNDUS – Innenstadtlagen und Fachmarktstandorte im Außenring',
    spalten: 3, kachel: [720, 1280],
  }), 20));

// Nahansicht der Einkaufslage in Süd-Städten (Teil 2): Bamberg, Würzburg, Kempten, Augsburg, Esslingen, Ulm. Teil 1: sued-nah.js.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
const eintraege = [['Bamberg', 62], ['Würzburg', 70], ['Kempten', 64], ['Augsburg', 72], ['Esslingen', 62], ['Ulm', 70]].map(([n, z]) => standortEintrag(n, 'einkauf', z));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Süd-Städte nah: Zentrum und Einkaufslage (2/2)', spalten: 3, kachel: [720, 1280] }), 20));

// Nahansicht der Einkaufslage in Städten der Mitte: Frankfurt, Wiesbaden, Mainz, Marburg, Kassel, Trier, Saarbrücken.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
const eintraege = [['Frankfurt', 86], ['Wiesbaden', 88], ['Mainz', 90], ['Marburg', 64], ['Kassel', 80], ['Trier', 100], ['Saarbrücken', 72]].map(([n, z]) => standortEintrag(n, 'einkauf', z));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Mitte nah: Zentrum und Einkaufslage', spalten: 4, kachel: [720, 1280] }), 20));

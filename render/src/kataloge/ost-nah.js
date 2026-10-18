// Nahansicht der Einkaufslage in Ost-Städten: Berlin (Ost-Kern), Dresden, Leipzig, Magdeburg, Görlitz, Rostock.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
const eintraege = [['Berlin', 80], ['Dresden', 70], ['Leipzig', 70], ['Magdeburg', 70], ['Görlitz', 62], ['Rostock', 66]].map(([n, z]) => standortEintrag(n, 'einkauf', z));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Ost-Städte nah: Zentrum und Einkaufslage', spalten: 3, kachel: [720, 1280] }), 20));

// Nahansicht der Einkaufslage in Nord-Städten: Hamburg, Bremen, Lübeck, Kiel, Hannover, Flensburg.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
const eintraege = [['Hamburg', 84], ['Bremen', 70], ['Lübeck', 66], ['Kiel', 70], ['Hannover', 70], ['Flensburg', 62]].map(([n, z]) => standortEintrag(n, 'einkauf', z));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Nord-Städte nah: Zentrum und Einkaufslage', spalten: 3, kachel: [720, 1280] }), 20));

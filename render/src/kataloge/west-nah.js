// Nahansicht der Einkaufslage in West-Städten: Ruhrgebiet (Essen, Dortmund, Duisburg, Gelsenkirchen), Rheinland (Köln, Düsseldorf),
// Westfalen (Münster) und Bergisches Land (Wuppertal).
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
const eintraege = [['Essen', 80], ['Dortmund', 80], ['Duisburg', 80], ['Gelsenkirchen', 80], ['Köln', 84], ['Düsseldorf', 88], ['Münster', 76], ['Wuppertal', 80]]
  .map(([n, z]) => standortEintrag(n, 'einkauf', z));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'West-Städte nah: Zentrum und Einkaufslage', spalten: 4, kachel: [720, 1280] }), 20));

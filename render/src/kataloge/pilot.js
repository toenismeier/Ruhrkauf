// Pilot Gestaltung (GESTALTUNG.md): Essen, Duisburg, Gelsenkirchen in der Nahansicht der Einkaufslage, gleiche Zoomstufe wie west-nah.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
const eintraege = [['Essen', 80], ['Duisburg', 80], ['Gelsenkirchen', 80]].map(([n, z]) => standortEintrag(n, 'einkauf', z));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Pilot Gestaltung: Ruhrgebiet nah', spalten: 3, kachel: [720, 1280] }), 20));

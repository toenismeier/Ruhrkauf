// Nahansicht der Einkaufslage in Süd-Städten (Teil 1): München, Nürnberg, Stuttgart, Karlsruhe, Freiburg, Passau.
// Teil 2 (Bamberg, Würzburg, Kempten, Augsburg, Esslingen, Ulm): sued-nah-b.js. Sechs Kacheln je Blatt, damit das Rendern unter zehn Minuten bleibt.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
const eintraege = [['München', 100], ['Nürnberg', 72], ['Stuttgart', 96], ['Karlsruhe', 80], ['Freiburg', 72], ['Passau', 64]].map(([n, z]) => standortEintrag(n, 'einkauf', z));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Süd-Städte nah: Zentrum und Einkaufslage (1/2)', spalten: 3, kachel: [720, 1280] }), 20));

// West-Städte ganz, mit allen Standorten (Hartwig rot, Hartwig Sport grün, Wettbewerber grau).
// Querformatige Kacheln, weil eine isometrische Stadt etwa doppelt so breit wie hoch erscheint; so füllt die Stadt die Kachel.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag, STADT_KACHEL } from './_standorte-staedte.js';
const eintraege = ['Essen', 'Duisburg', 'Oberhausen', 'Marl', 'Köln', 'Düsseldorf', 'Münster', 'Wuppertal']
  .map((n) => standortEintrag(n, 'stadt'));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'West-Städte: ganze Stadt', spalten: 2, kachel: STADT_KACHEL, rand: 1.0 }), 20));

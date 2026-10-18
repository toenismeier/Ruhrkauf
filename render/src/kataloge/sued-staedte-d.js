// Süd-Städte ganz (Teil 4 von 4, weitere: sued-staedte, sued-staedte-b, sued-staedte-c), mit allen Standorten (Hartwig rot, Hartwig Sport grün,
// Wettbewerber grau). Vier Städte je Blatt, damit das Rendern unter zehn Minuten bleibt.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag, STADT_KACHEL } from './_standorte-staedte.js';
const NAMEN = ['Mannheim', 'Freiburg', 'Heidelberg', 'Konstanz'];
const eintraege = NAMEN.map((n) => standortEintrag(n, 'stadt'));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Süd-Städte: ganze Stadt (4/4)', spalten: 2, kachel: STADT_KACHEL, rand: 1.0 }), 20));

// Süd-Städte ganz (Teil 2 von 4, weitere: sued-staedte, sued-staedte-c, sued-staedte-d), mit allen Standorten (Hartwig rot, Hartwig Sport grün,
// Wettbewerber grau). Vier Städte je Blatt, damit das Rendern unter zehn Minuten bleibt.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag, STADT_KACHEL } from './_standorte-staedte.js';
const NAMEN = ['Nürnberg', 'Würzburg', 'Bamberg', 'Rosenheim'];
const eintraege = NAMEN.map((n) => standortEintrag(n, 'stadt'));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Süd-Städte: ganze Stadt (2/4)', spalten: 2, kachel: STADT_KACHEL, rand: 1.0 }), 20));

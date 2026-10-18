// Süd-Städte ganz (Teil 1 von 4, weitere: sued-staedte-b, sued-staedte-c, sued-staedte-d), mit allen Standorten (Hartwig rot, Hartwig Sport grün,
// Wettbewerber grau). Vier Städte je Blatt, damit das Rendern unter zehn Minuten bleibt.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag, STADT_KACHEL } from './_standorte-staedte.js';
const NAMEN = ['München', 'Passau', 'Landshut', 'Kempten'];
const eintraege = NAMEN.map((n) => standortEintrag(n, 'stadt'));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Süd-Städte: ganze Stadt (1/4)', spalten: 2, kachel: STADT_KACHEL, rand: 1.0 }), 20));

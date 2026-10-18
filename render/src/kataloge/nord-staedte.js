// Nord-Städte ganz, mit allen Standorten (Hartwig rot, Hartwig Sport grün, Wettbewerber grau): je Typ mehrere Städte.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag, STADT_KACHEL } from './_standorte-staedte.js';
// Zweites Blatt (Bremerhaven, Lüneburg, Braunschweig, Hildesheim, Celle, Osnabrück): nord-staedte2.js
const NAMEN = ['Hamburg', 'Bremen', 'Lübeck', 'Kiel', 'Hannover', 'Flensburg'];
const eintraege = NAMEN.map((n) => standortEintrag(n, 'stadt'));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Nord-Städte: ganze Stadt', spalten: 2, kachel: STADT_KACHEL, rand: 1.0 }), 20));

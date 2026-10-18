// Nord-Städte ganz, zweites Blatt: Bremerhaven, Lüneburg, Braunschweig, Hildesheim, Celle, Osnabrück.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag, STADT_KACHEL } from './_standorte-staedte.js';
const NAMEN = ['Bremerhaven', 'Lüneburg', 'Braunschweig', 'Hildesheim', 'Celle', 'Osnabrück'];
const eintraege = NAMEN.map((n) => standortEintrag(n, 'stadt'));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Nord-Städte: ganze Stadt (2)', spalten: 2, kachel: STADT_KACHEL, rand: 1.0 }), 20));

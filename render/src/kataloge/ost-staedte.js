// Sechs Städte der ehemaligen DDR ganz, mit allen Standorten (Hartwig rot, Hartwig Sport grün, Wettbewerber grau).
// Querformat-Kacheln mit stadtRahmen(): die Stadt füllt die Kachel.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag, STADT_KACHEL } from './_standorte-staedte.js';
const eintraege = ['Berlin', 'Dresden', 'Leipzig', 'Magdeburg', 'Görlitz', 'Rostock'].map((n) => standortEintrag(n, 'stadt'));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Ost-Städte: ganze Stadt', spalten: 2, kachel: STADT_KACHEL, rand: 1.03 }), 20));

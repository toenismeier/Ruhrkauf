// Gemeinsam für mitte-staedte.js, mitte-staedte-2.js und mitte-frankfurt.js: ganze Städte der Mitte im Querformat,
// die Stadt füllt die Kachel. Gebaut über standortEintrag() (Detailstufe 'fern', sparsamer Sammler, siehe KIT.md).
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag, STADT_KACHEL } from './_standorte-staedte.js';

export function zeigeMitteStaedte(namen, titel, spalten = 2) {
  const eintraege = namen.map((n) => standortEintrag(n, 'stadt'));
  window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel, spalten, kachel: STADT_KACHEL, rand: 1.0 }), 20));
}

// Acht Städte im Vergleich, Kartenansicht im iPhone-Hochformat um das Warenhaus (Platzhalter-Bauer).
import { zeigeKatalog } from '../kit/katalog.js';
import { STAEDTE, stadtEintrag } from './_vielfalt-staedte.js';

const eintraege = STAEDTE.map((s) => stadtEintrag(s, 95));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Stadtvielfalt: acht Städte (Kartenansicht)', spalten: 4, kachel: [700, 1240] }), 20));

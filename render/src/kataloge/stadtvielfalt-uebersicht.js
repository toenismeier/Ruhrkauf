// Acht Städte im Vergleich, ganze Grundrisse (Parzellen-Bauer: Farbe = Parzellentyp).
import { zeigeKatalog } from '../kit/katalog.js';
import { STAEDTE, stadtEintrag } from './_vielfalt-staedte.js';

const eintraege = STAEDTE.map((s) => stadtEintrag(s, 0, 'parzellen'));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Stadtvielfalt: Grundrisse', spalten: 4, kachel: [900, 620], rand: 1.02 }), 20));

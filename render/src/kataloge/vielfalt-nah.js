// Nahansicht (Spielzoom) von vier Städten mit allen echten Generatoren.
import { zeigeKatalog } from '../kit/katalog.js';
import { STAEDTE, stadtEintrag } from './_vielfalt-staedte.js';
import { echterBauer } from '../kit/bauer.js';
const eintraege = [STAEDTE[0], STAEDTE[1], STAEDTE[4], STAEDTE[7]].map((s) => stadtEintrag(s, 62, echterBauer()));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Spielzoom: vier Städte', spalten: 4, kachel: [720, 1280] }), 20));

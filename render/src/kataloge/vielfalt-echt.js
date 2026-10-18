// Acht verschiedene Städte mit allen echten Generatoren (Hochformat, Kartenansicht um das Warenhaus).
import { zeigeKatalog } from '../kit/katalog.js';
import { STAEDTE, stadtEintrag } from './_vielfalt-staedte.js';
import { echterBauer } from '../kit/bauer.js';
const eintraege = STAEDTE.map((s) => stadtEintrag(s, s[2] === 'metropole' ? 150 : s[2] === 'mittelstadt' ? 105 : 130, echterBauer()));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Acht Städte mit allen Generatoren', spalten: 4, kachel: [720, 1280] }), 20));

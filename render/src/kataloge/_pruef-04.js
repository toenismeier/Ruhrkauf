import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Essen", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Essen", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.136, 0.571] }), standortEintrag("Essen", 'einkauf', 62, null, ' · P3 west_kanal', { punkt: [0.236, 0.933] }), standortEintrag("Gelsenkirchen", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Gelsenkirchen", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.661, 0.166] }), standortEintrag("Gelsenkirchen", 'einkauf', 62, null, ' · P3 west_kanal', { punkt: [0.245, 0.939] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 04: Essen / Gelsenkirchen', spalten: 3, kachel: [720, 1280] }), 20));

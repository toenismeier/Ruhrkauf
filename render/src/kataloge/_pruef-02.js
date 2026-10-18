import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("M\u00fcnchen", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("M\u00fcnchen", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.945, 0.466] }), standortEintrag("M\u00fcnchen", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.78, 0.57] }), standortEintrag("K\u00f6ln", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("K\u00f6ln", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.041, 0.511] }), standortEintrag("K\u00f6ln", 'einkauf', 62, null, ' · P3 west_medienhafen', { punkt: [0.134, 0.739] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 02: München / Köln', spalten: 3, kachel: [720, 1280] }), 20));

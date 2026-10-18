import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Frankfurt", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Frankfurt", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.942, 0.944] }), standortEintrag("Frankfurt", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.5, 0.852] }), standortEintrag("Stuttgart", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Stuttgart", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.678, 0.179] }), standortEintrag("Stuttgart", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.97, 0.572] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 03: Frankfurt / Stuttgart', spalten: 3, kachel: [720, 1280] }), 20));

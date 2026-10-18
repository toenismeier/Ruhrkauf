import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("N\u00fcrnberg", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("N\u00fcrnberg", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.799, 0.246] }), standortEintrag("N\u00fcrnberg", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.5, 0.453] }), standortEintrag("Regensburg", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Regensburg", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.066, 0.674] }), standortEintrag("Regensburg", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.5, 0.17] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 17: Nürnberg / Regensburg', spalten: 3, kachel: [720, 1280] }), 20));

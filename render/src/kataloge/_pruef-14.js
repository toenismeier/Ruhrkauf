import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Kassel", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Kassel", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.214, 0.437] }), standortEintrag("Kassel", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.966, 0.5] }), standortEintrag("Marburg", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Marburg", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.313, 0.589] }), standortEintrag("Marburg", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.949, 0.5] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 14: Kassel / Marburg', spalten: 3, kachel: [720, 1280] }), 20));

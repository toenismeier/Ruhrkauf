import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Leipzig", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Leipzig", 'einkauf', 62, null, ' · P2 Wohnen (platte)', { punkt: [0.824, 0.189] }), standortEintrag("Leipzig", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.137, 0.5] }), standortEintrag("Chemnitz", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Chemnitz", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.294, 0.298] }), standortEintrag("Chemnitz", 'einkauf', 62, null, ' · P3 gewerbe', { punkt: [0.929, 0.298] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 12: Leipzig / Chemnitz', spalten: 3, kachel: [720, 1280] }), 20));

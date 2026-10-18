import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("L\u00fcbeck", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("L\u00fcbeck", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.412, 0.078] }), standortEintrag("L\u00fcbeck", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.162, 0.5] }), standortEintrag("L\u00fcneburg", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("L\u00fcneburg", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.869, 0.624] }), standortEintrag("L\u00fcneburg", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.719, 0.5] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 08: Lübeck / Lüneburg', spalten: 3, kachel: [720, 1280] }), 20));

import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("L\u00fcdenscheid", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("L\u00fcdenscheid", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.371, 0.769] }), standortEintrag("L\u00fcdenscheid", 'einkauf', 62, null, ' · P3 ecke', { punkt: [0.85, 0.15] }), standortEintrag("D\u00fcren", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("D\u00fcren", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.598, 0.902] }), standortEintrag("D\u00fcren", 'einkauf', 62, null, ' · P3 ecke', { punkt: [0.85, 0.15] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 07: Lüdenscheid / Düren', spalten: 3, kachel: [720, 1280] }), 20));

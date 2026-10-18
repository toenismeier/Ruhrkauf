import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("G\u00fctersloh", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("G\u00fctersloh", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.572, 0.886] }), standortEintrag("G\u00fctersloh", 'einkauf', 62, null, ' · P3 bahn', { punkt: [0.814, 0.886] }), standortEintrag("Wuppertal", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Wuppertal", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.18, 0.67] }), standortEintrag("Wuppertal", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.5, 0.57] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 06: Gütersloh / Wuppertal', spalten: 3, kachel: [720, 1280] }), 20));

import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("G\u00f6rlitz", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("G\u00f6rlitz", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.259, 0.574] }), standortEintrag("G\u00f6rlitz", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.953, 0.5] }), standortEintrag("Gera", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Gera", 'einkauf', 62, null, ' · P2 Wohnen (platte)', { punkt: [0.343, 0.916] }), standortEintrag("Gera", 'einkauf', 62, null, ' · P3 gewerbe', { punkt: [0.207, 0.092] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 13: Görlitz / Gera', spalten: 3, kachel: [720, 1280] }), 20));

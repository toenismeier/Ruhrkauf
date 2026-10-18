import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Berlin", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Berlin", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.241, 0.849] }), standortEintrag("Berlin", 'einkauf', 62, null, ' · P3 center', { punkt: [0.729, 0.944] }), standortEintrag("Hamburg", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Hamburg", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.948, 0.155] }), standortEintrag("Hamburg", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.5, 0.944] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 01: Berlin / Hamburg', spalten: 3, kachel: [720, 1280] }), 20));

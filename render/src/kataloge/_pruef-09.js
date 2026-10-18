import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Bremerhaven", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Bremerhaven", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.446, 0.07] }), standortEintrag("Bremerhaven", 'einkauf', 62, null, ' · P3 speicherzeile', { punkt: [0.82, 0.288] }), standortEintrag("Hannover", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Hannover", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.349, 0.191] }), standortEintrag("Hannover", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.12, 0.89] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 09: Bremerhaven / Hannover', spalten: 3, kachel: [720, 1280] }), 20));

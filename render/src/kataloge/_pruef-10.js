import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Celle", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Celle", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.18, 0.625] }), standortEintrag("Celle", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.039, 0.5] }), standortEintrag("Rostock", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Rostock", 'einkauf', 62, null, ' · P2 Wohnen (platte)', { punkt: [0.808, 0.305] }), standortEintrag("Rostock", 'einkauf', 62, null, ' · P3 hafen', { punkt: [0.14, 0.799] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 10: Celle / Rostock', spalten: 3, kachel: [720, 1280] }), 20));

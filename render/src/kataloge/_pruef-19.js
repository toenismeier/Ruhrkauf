import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Mannheim", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Mannheim", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.888, 0.934] }), standortEintrag("Mannheim", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.036, 0.5] }), standortEintrag("Kempten", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Kempten", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.251, 0.749] }), standortEintrag("Kempten", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.738, 0.647] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 19: Mannheim / Kempten', spalten: 3, kachel: [720, 1280] }), 20));

import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Mainz", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Mainz", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.836, 0.806] }), standortEintrag("Mainz", 'einkauf', 62, null, ' · P3 mitte_ufer', { punkt: [0.836, 0.286] }), standortEintrag("Wiesbaden", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Wiesbaden", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.627, 0.923] }), standortEintrag("Wiesbaden", 'einkauf', 62, null, ' · P3 center', { punkt: [0.208, 0.075] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 16: Mainz / Wiesbaden', spalten: 3, kachel: [720, 1280] }), 20));

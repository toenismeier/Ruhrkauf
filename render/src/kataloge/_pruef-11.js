import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Stralsund", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Stralsund", 'einkauf', 62, null, ' · P2 Wohnen (platte)', { punkt: [0.106, 0.461] }), standortEintrag("Stralsund", 'einkauf', 62, null, ' · P3 hafen', { punkt: [0.172, 0.746] }), standortEintrag("Dresden", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Dresden", 'einkauf', 62, null, ' · P2 Wohnen (platte)', { punkt: [0.312, 0.205] }), standortEintrag("Dresden", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.5, 0.819] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 11: Stralsund / Dresden', spalten: 3, kachel: [720, 1280] }), 20));

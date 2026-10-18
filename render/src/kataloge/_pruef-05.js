import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Marl", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Marl", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.636, 0.137] }), standortEintrag("Marl", 'einkauf', 62, null, ' · P3 west_kanal', { punkt: [0.743, 0.925] }), standortEintrag("Bielefeld", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Bielefeld", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.937, 0.27] }), standortEintrag("Bielefeld", 'einkauf', 62, null, ' · P3 west_promenade', { punkt: [0.453, 0.27] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 05: Marl / Bielefeld', spalten: 3, kachel: [720, 1280] }), 20));

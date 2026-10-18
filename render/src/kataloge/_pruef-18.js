import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Ulm", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Ulm", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.297, 0.844] }), standortEintrag("Ulm", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.5, 0.945] }), standortEintrag("Freiburg", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Freiburg", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.447, 0.208] }), standortEintrag("Freiburg", 'einkauf', 62, null, ' · P3 mall', { punkt: [0.702, 0.31] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 18: Ulm / Freiburg', spalten: 3, kachel: [720, 1280] }), 20));

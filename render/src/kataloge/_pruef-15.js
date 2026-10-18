import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import '../kit/archetypen/index.js';
const eintraege = [standortEintrag("Saarbr\u00fccken", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Saarbr\u00fccken", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.553, 0.073] }), standortEintrag("Saarbr\u00fccken", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.288, 0.5] }), standortEintrag("Koblenz", 'einkauf', 62, null, ' · P1 Zentrum'), standortEintrag("Koblenz", 'einkauf', 62, null, ' · P2 Wohnen (bebaut)', { punkt: [0.823, 0.418] }), standortEintrag("Koblenz", 'einkauf', 62, null, ' · P3 wasser', { punkt: [0.169, 0.5] })];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Prüfung 15: Saarbrücken / Koblenz', spalten: 3, kachel: [720, 1280] }), 20));

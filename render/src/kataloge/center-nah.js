// Nahansicht geteilter Einkaufszentren: Hartwig und Hartwig Sport als Mieter im selben Center.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
const eintraege = [['Köln', 110], ['Düsseldorf', 100], ['Dresden', 90], ['Stuttgart', 90]].map(([n, z]) => standortEintrag(n, 'center', z));
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Geteilte Center: Hartwig und Hartwig Sport als Mieter', spalten: 2, kachel: [900, 900] }), 20));

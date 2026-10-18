// Nahansicht: Einkaufslage einer Metropole und einer Großstadt, dazu ein Center-Standort.
import { zeigeKatalog } from '../kit/katalog.js';
import { standortEintrag } from './_standorte-staedte.js';
import { stadtDaten } from '../kit/staedte.js';
// Mit Zuständen: erstes Warenhaus Räumung, zweites Untermiete + Sale, Sporthaus geschlossen
function ZUSTAND(name, zoom = 62) {
  const st = stadtDaten(name).standorte;
  const wh = st.filter((x) => x.rolle === 'warenhaus'), sp = st.filter((x) => x.rolle === 'sport');
  const z = {};
  if (wh[0]) z[wh[0].id] = { status: 'raeumung' };
  if (wh[1]) z[wh[1].id] = { status: 'untermiete', zusatz: ['aktion'], aktion: 'sale', untermieter: [{ name: 'Preisfuchs Markt', typ: 'discounter', etage: 0 }, { name: 'IronCity Fitness', typ: 'fitness', etage: 3 }] };
  if (wh[2]) z[wh[2].id] = { status: 'umbau' };
  if (sp[0]) z[sp[0].id] = { status: 'geschlossen' };
  return standortEintrag(name, 'einkauf', zoom, z, ' · mit Zuständen');
}
const eintraege = [standortEintrag('Berlin', 'einkauf', 70), standortEintrag('Bremen', 'einkauf', 62), standortEintrag('Kiel', 'center', 62), ZUSTAND('Bremen'), ZUSTAND('Essen'), ZUSTAND('Berlin', 70)];
window.addEventListener('load', () => setTimeout(() => zeigeKatalog(eintraege, { titel: 'Standorte nah: Einkaufslage und Center', spalten: 3, kachel: [720, 1280] }), 20));

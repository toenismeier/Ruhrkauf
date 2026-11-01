// E48/E49 Umbau je Format: Möbelgeneration 1 und 3 innen, Baustelle 1. OG und EG außen, nach Technik-Umbau mit Klima auf dem Dach.
import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { etage } from '../kit/grundriss.js';
import { warenhaus } from '../kit/warenhaus.js';
import { premiumhaus } from '../kit/premium.js';
import { sporthaus } from '../kit/sporthaus.js';
import { schwesterhaus } from '../kit/schwesterhaus.js';
import { outlet, innenOutlet } from '../kit/outlet.js';
import { technikAufDach } from '../kit/umbau-aussen.js';
import haeuser from '../../haeuser.json';
import schwester from '../../haeuser-schwester.json';
import fundus from '../../haeuser-outlet.json';
const HG = '#26313a';
const nur = (globalThis.location?.search.match(/nur=([^&]+)/)?.[1] ?? '').split(',').filter(Boolean);
const FORMATE = [
  { name: 'Hartwig', haus: haeuser.find((h) => h.id === 'W046'), bau: warenhaus, innen: 2 },
  { name: 'Premium', haus: haeuser.find((h) => h.id === 'W361'), bau: premiumhaus, innen: 1 },
  { name: 'Volkskauf', haus: { ...schwester[0], kette: 'schwester' }, bau: schwesterhaus, innen: 1 },
  { name: 'Sport', haus: haeuser.find((h) => h.id === 'S001'), bau: sporthaus, innen: 1 },
  { name: 'FUNDUS', haus: fundus.find((h) => h.id === 'O002'), bau: outlet, innen: 0, fundus: true },
].filter((f) => !nur.length || nur.includes(f.name));
const mit = (h, gen, technik = false) => ({ ...structuredClone(h), etagenBau: Object.fromEntries(h.etagen.map((n) => [n, { moebelGeneration: gen, technik: { klima: technik ? 2 : 0 }, klimaModernisiert: technik }])) });
const teile = [];
for (const f of FORMATE) {
  for (const gen of [1, 3]) teile.push({
    titel: f.name + ' · innen Generation ' + gen, unter: gen === 1 ? '90er: Buche, Messing, Beige' : 'heute: hell mit Akzent', hintergrund: HG,
    bau(S, scene) {
      const h = mit(f.haus, gen);
      if (f.fundus) { const r = innenOutlet(S, scene, h, { geschosse: [f.innen], innenZustand: 'normal' }); return new THREE.Box3(new THREE.Vector3(-3, 0, -3), new THREE.Vector3(r.w + 3, 6, r.d + 3)); }
      return etage(S, scene, h, f.innen, { ausschnitt: { anker: 'ecke' }, kunden: 4 }).box;
    },
  });
  const aussen = (titel, unter, opt, technik = false) => teile.push({
    titel: f.name + ' · ' + titel, unter, hintergrund: HG,
    bau(S, scene) {
      const h = mit(f.haus, 1, technik);
      const res = f.bau(S, scene, h, { x: 0, z: 0, passanten: false, ...opt });
      if (technik) technikAufDach(S, h, { x: 0, z: 0, w: res.w, d: res.d, hoehe: res.hoehe, dach: res.dach, platz: res.platz });
      return new THREE.Box3(new THREE.Vector3(-5, -1, -5), new THREE.Vector3(res.w + 12, Math.max(res.hoehe, res.dach ?? 0) + 6, res.d + 12));
    },
  });
  aussen('Baustelle 1. OG', 'Gerüst nur vor der Etage', { bauEtagen: [f.haus.etagen.includes(1) ? 1 : 0] });
  aussen('Baustelle EG', 'Bauzaun, Schaufenster abgeklebt', { bauEtagen: [0] });
  aussen('nach Fassadenumbau', 'Neueröffnung, Klima auf dem Dach', { status: 'neueroeffnung' }, true);
}
zeigeKatalog(teile, { titel: 'Umbau je Format', spalten: 5, kachel: [560, 440] });

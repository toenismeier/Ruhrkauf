// O08/E48 Umbau: dieselbe Etage in drei Möbelgenerationen, Baustelle je Etage und Vorher/Nachher am Haus.
import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { etage } from '../kit/grundriss.js';
import { warenhaus } from '../kit/warenhaus.js';
import { technikAufDach } from '../kit/umbau-aussen.js';
import haeuser from '../../haeuser.json';
const HG = '#26313a';
const basis = haeuser.find((h) => h.id === 'W046') ?? haeuser.find((h) => h.format === 'warenhaus' && h.etagen.length >= 3);
const mitGeneration = (gen) => {
  const h = structuredClone(basis);
  h.etagenBau = Object.fromEntries(h.etagen.map((n) => [n, { moebelGeneration: gen }]));
  return h;
};
const teile = [];
for (const [gen, unter] of [[1, '90er · Buche, Messing, Beige'], [2, '2000er · Grau und Chrom'], [3, 'Aktuell · hell mit Akzent']]) teile.push({
  titel: 'Möbelgeneration ' + gen, unter, hintergrund: HG,
  bau(S, scene) { return etage(S, scene, mitGeneration(gen), 2, { ausschnitt: { anker: 'eingang' } }).box; },
});
const aussen = (titel, unter, substanz, opt = {}, technik = false) => teile.push({
  titel, unter, hintergrund: HG,
  bau(S, scene) {
    const h = { ...structuredClone(basis), substanz };
    if (technik) h.etagenBau = Object.fromEntries(h.etagen.map((n) => [n, { technik: { klima: 2 }, klimaModernisiert: true }]));
    const res = warenhaus(S, scene, h, { x: 0, z: 0, passanten: false, ...opt });
    if (technik) technikAufDach(S, h, { x: 0, z: 0, w: res.w, d: res.d, hoehe: res.hoehe });
    return new THREE.Box3(new THREE.Vector3(-5, -1, -5), new THREE.Vector3(res.w + 12, res.hoehe + 8, res.d + 12));
  },
});
aussen('Baustelle 1. OG', 'Gerüst nur vor der Etage, Haus geöffnet', 45, { bauEtagen: [1] });
aussen('Baustelle EG', 'Schaufenster abgeklebt, Bauzaun', 45, { bauEtagen: [0] });
aussen('Komplettumbau', 'Gerüst, Plane und Kran', 45, { status: 'umbau' });
aussen('Vorher', 'alte Fassade, Technik von 1970', 32);
aussen('Nachher', 'Fassade erneuert, Klima auf dem Dach', 90, {}, true);
zeigeKatalog(teile, { titel: 'Modernisierung', spalten: 2, kachel: [800, 600] });

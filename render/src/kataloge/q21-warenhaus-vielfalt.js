// Q21-Abnahmekatalog: alle Hartwig-Häuser in Berlin, Hamburg, München und Essen.
// cd render && node render-katalog.js q21-warenhaus-vielfalt
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { warenhaus } from '../kit/warenhaus.js';
import { premiumhaus } from '../kit/premium.js';
import { warenhausVielfalt } from '../kit/warenhaus-vielfalt.js';
import haeuser from '../../haeuser.json';

const STAEDTE = ['Berlin', 'Hamburg', 'München', 'Essen'];
const varianten = warenhausVielfalt(haeuser);
const eintraege = STAEDTE.flatMap((stadt) => haeuser
  .filter((h) => h.stadt === stadt && h.format === 'warenhaus')
  .map((h) => ({
    titel: `${stadt} · ${h.id}`,
    unter: h.klasse === 'premium' ? 'Premium · eigenes Modell' :
      `Familie ${varianten.get(h.id)?.familie}, Variante ${varianten.get(h.id)?.fassade} · ${h.lage} · ${h.baujahr}`,
    bau(S, scene) {
      const v = varianten.get(h.id);
      const gebaeude = h.klasse === 'premium' ? premiumhaus(S, scene, h, { x: 0, z: 0 }) :
        warenhaus(S, scene, { ...h, fassade: v?.fassade ?? h.fassade }, { x: 0, z: 0, familie: v?.familie });
      sockel(S, 0, 0, gebaeude.w, gebaeude.d, 4);
      return new THREE.Box3(new THREE.Vector3(-4, 0, -4),
        new THREE.Vector3(gebaeude.w + 4, gebaeude.hoehe, gebaeude.d + 4));
    },
  })));
zeigeKatalog(eintraege, { titel: 'Q21 · Warenhausvielfalt – Berlin, Hamburg, München, Essen', spalten: 4, kachel: [330, 330] });

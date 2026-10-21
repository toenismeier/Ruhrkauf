// Q02: sechs Warenhausdächer, gleiche Perspektive und Seed für den Vorher/Nachher-Vergleich.
import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { warenhaus, familieVon } from '../kit/warenhaus.js';
import haeuser from '../../haeuser.json';

const beispiele = [];
for (const h of haeuser) {
  if (h.format !== 'warenhaus' || h.klasse === 'premium' || beispiele.some((v) => familieVon(v) === familieVon(h))) continue;
  beispiele.push(h);
  if (beispiele.length >= 6) break;
}
if (beispiele.length < 6) throw new Error('Es wurden weniger als sechs unterschiedliche Warenhausfamilien gefunden.');
const eintraege = beispiele.map((h, i) => ({
  titel: h.stadt + ' – Familie ' + familieVon(h),
  unter: 'Flache, maßhaltige Technik und Dachdetails; ' + h.name,
  bau(S, scene) {
    const erg = warenhaus(S, scene, h, { x: 0, z: 0 });
    if (erg.teile > 8000) throw new Error('Teilebudget überschritten: ' + erg.teile);
    const von = Math.max(0, erg.hoehe - 16);
    return new THREE.Box3(new THREE.Vector3(-3, von, -3), new THREE.Vector3(erg.w + 3, erg.hoehe + 6, erg.d + 3));
  },
}));
zeigeKatalog(eintraege, { titel: 'Q02 – sechs Dachansichten', spalten: 3, kachel: [540, 480], rand: 1.08 });

// Katalog: Hartwig-Sport-Häuser in allen 12 Zuständen (Zeilen) × fünf Familien (Spalten).
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { sporthaus, familieSport, FAMILIEN_SPORT } from '../kit/sporthaus.js';
import { STATI, STATUS_TITEL } from '../kit/zustaende.js';
import haeuser from '../../haeuser.json';

const sport = haeuser.filter((h) => h.format === 'sport');
const je = (f, nr = 0) => sport.filter((h) => familieSport(h) === f)[nr];
const SPALTEN = [je(1, 1), je(2, 0), je(3, 0), je(4, 0), je(5, 0)].filter(Boolean);
const MIETER = [{ name: 'Drogerie Nachbar', etage: 0 }, { name: 'FitWerk 24', etage: 1 }, { name: 'Café Fräulein', etage: 99 }];
const EXTRA = { aktion: (i) => ({ aktion: ['sale', 'blackfriday', 'jubilaeum', 'weihnachten', 'sale'][i] }), untermiete: () => ({ untermieter: MIETER }) };
let letzteSonne = null;
const eintraege = [];
for (const st of STATI) SPALTEN.forEach((h, i) => eintraege.push({
  titel: STATUS_TITEL[st],
  bau(S, scene) {
    if (letzteSonne?.shadow.map) { letzteSonne.shadow.map.dispose(); letzteSonne.shadow.map = null; }
    letzteSonne = scene.userData.sonne;
    letzteSonne.shadow.mapSize.set(3072, 3072);
    const opt = { status: st, ...(EXTRA[st]?.(i) ?? {}) };
    const erg = sporthaus(S, scene, h, { x: 0, z: 0, ...opt });
    sockel(S, 0, 0, erg.w, erg.d, 4);
    this.titel = `${STATUS_TITEL[st]}${opt.aktion ? ' · ' + opt.aktion : ''} · ${h.id}`;
    this.unter = `F${erg.familie} ${FAMILIEN_SPORT[erg.familie]} · ${h.etagen.filter((e) => e >= 0).length} Et. · ${erg.teile} Teile`;
    return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(erg.w + 4, erg.hoehe, erg.d + 4));
  },
}));
setTimeout(() => zeigeKatalog(eintraege, { titel: 'Hartwig Sport: alle 12 Zustände', spalten: SPALTEN.length, kachel: [440, 380] }), 50);

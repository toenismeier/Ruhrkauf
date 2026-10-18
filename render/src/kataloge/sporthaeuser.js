// Katalog: alle 50 Hartwig-Sport-Häuser aus haeuser.json als Kontaktbogen, dazu die Statusvarianten.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { sporthaus, FAMILIEN_SPORT } from '../kit/sporthaus.js';
import haeuser from '../../haeuser.json';

const sport = haeuser.filter((h) => h.format === 'sport');
const extra = [
  [sport[2], { status: 'umbau' }, 'Status: Umbau'],
  [sport[5], { status: 'raeumung' }, 'Status: Räumung'],
  [sport[10], { status: 'leer' }, 'Status: leer'],
  [sport[4], { status: 'geschlossen' }, 'Status: geschlossen'],
  [sport[16], { status: 'raeumung' }, 'Status: Räumung'],
  [sport[0], { status: 'geschlossen' }, 'Status: geschlossen'],
];
const liste = [...sport.map((h) => [h, {}, null]), ...extra];
let letzteSonne = null;
const stat = [];
const eintraege = liste.map(([h, opt, titel]) => ({
  titel: titel ?? h.name.replace('Hartwig Sport ', ''),
  unter: '',
  bau(S, scene) {
    if (letzteSonne?.shadow.map) { letzteSonne.shadow.map.dispose(); letzteSonne.shadow.map = null; }
    letzteSonne = scene.userData.sonne;
    letzteSonne.shadow.mapSize.set(3072, 3072);
    const erg = sporthaus(S, scene, h, { x: 0, z: 0, ...opt });
    sockel(S, 0, 0, erg.w, erg.d, 4);
    stat.push({ id: h.id, fam: erg.familie, teile: erg.teile });
    if (titel) this.titel = `${titel} · ${h.id}`;
    this.unter = `F${erg.familie} ${FAMILIEN_SPORT[erg.familie]} · ${h.lage} · ${h.baujahr} · ${h.etagen.length} Et. · ${h.grundflaecheQm} m² · ${erg.teile} T.`;
    return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(erg.w + 4, erg.hoehe, erg.d + 4));
  },
}));
setTimeout(() => {
  zeigeKatalog(eintraege, { titel: 'Hartwig Sport: alle 50 Sporthäuser', spalten: 6, kachel: [440, 400] });
  console.log('STATJSON ' + JSON.stringify(stat));
}, 50);

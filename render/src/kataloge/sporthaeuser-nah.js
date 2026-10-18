// Nahansicht: je Familie zwei Sporthäuser in großen Kacheln (Arbeitskatalog).
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { sporthaus, FAMILIEN_SPORT } from '../kit/sporthaus.js';
import haeuser from '../../haeuser.json';

const nach = Object.fromEntries(haeuser.map((h) => [h.id, h]));
const ids = 'S002,S011,S001,S004,S014,S021,S032,S038,S007,S049,S039,S044';
let letzteSonne = null;
const eintraege = ids.split(',').map((id) => ({
  titel: id,
  bau(S, scene) {
    if (letzteSonne?.shadow.map) { letzteSonne.shadow.map.dispose(); letzteSonne.shadow.map = null; }
    letzteSonne = scene.userData.sonne;
    const h = nach[id];
    const erg = sporthaus(S, scene, h, { x: 0, z: 0 });
    sockel(S, 0, 0, erg.w, erg.d, 4);
    this.titel = `${h.name} · F${erg.familie} ${FAMILIEN_SPORT[erg.familie]}`;
    this.unter = `${h.lage} · ${h.baujahr} · ${h.etagen.length} Et. · ${h.grundflaecheQm} m² · ${erg.w}×${erg.d} · ${erg.teile} Teile`;
    return new THREE.Box3(new THREE.Vector3(-4, 0, -4), new THREE.Vector3(erg.w + 4, erg.hoehe, erg.d + 4));
  },
}));
setTimeout(() => zeigeKatalog(eintraege, { titel: 'Hartwig Sport: Familien nah', spalten: 4, kachel: [720, 620], rand: 1.02 }), 50);

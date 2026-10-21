// Kontaktbogen: alle FUNDUS-Filialen, drei Bauformen und typische Statuswechsel.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { outlet, FAMILIEN_OUTLET, NAME_OUTLET } from '../kit/outlet.js';
import haeuser from '../../haeuser-outlet.json';
const zustandsmuster = ['neueroeffnung', 'raeumung', 'leer', 'geschlossen', 'umbau', 'aktion', 'offprice', 'teilschliessung', 'verfall', 'abriss', 'untermiete'];
const exemplar = [haeuser[0], haeuser[1], haeuser[14]];
const liste = [
  ...haeuser.map((h) => ({ h, zustand: {}, titel: NAME_OUTLET + ' ' + h.stadt })), 
  ...exemplar.flatMap((h) => zustandsmuster.map((status) => ({ h, zustand: { status }, titel: NAME_OUTLET + ' ' + h.stadt + ' · ' + status }))),
];
let letzteSonne = null;
const stat = [];
const eintraege = liste.map(({ h, zustand, titel }) => ({
  titel,
  unter: '',
  bau(S, scene) {
    if (letzteSonne?.shadow.map) { letzteSonne.shadow.map.dispose(); letzteSonne.shadow.map = null; }
    letzteSonne = scene.userData.sonne;
    letzteSonne.shadow.mapSize.set(2048, 2048);
    const e = outlet(S, scene, h, { x: 0, z: 0, ...zustand });
    sockel(S, 0, 0, e.w, e.d, 4);
    stat.push({ id: h.id, status: zustand.status ?? 'offen', familie: e.familie, teile: e.teile });
    this.unter = h.id + ' · ' + FAMILIEN_OUTLET[e.familie] + ' · ' + h.lage + ' · ' + h.grundflaecheQm + ' m² · ' + e.teile + ' Teile';
    return new THREE.Box3(new THREE.Vector3(-5, 0, -5), new THREE.Vector3(e.w + 5, e.hoehe, e.d + 5));
  },
}));
setTimeout(() => {
  zeigeKatalog(eintraege, { titel: 'FUNDUS – alle ' + haeuser.length + ' Filialen und Statusvarianten', spalten: 6, kachel: [430, 380] });
  const melde = () => window.fertig ? console.log('FUNDUS_STAT ' + JSON.stringify(stat)) : setTimeout(melde, 300);
  melde();
}, 50);

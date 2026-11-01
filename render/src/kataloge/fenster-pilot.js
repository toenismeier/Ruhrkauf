// Pilot E51: Schaufenster mit Raum dahinter (three-fenestra), Glas vor und nach der Fassadenerneuerung.
import { THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { warenhaus } from '../kit/warenhaus.js';
import { schaufensterInnen } from '../kit/fenster-innen.js';
import haeuser from '../../haeuser.json';
const e = [];
for (const id of ['W012']) for (const sauber of [false, true]) e.push({
  titel: id + (sauber ? ' · nachher: Glas sauber' : ' · vorher: Glas trüb'), hintergrund: '#26313a',
  bau(S, scene) {
    const h = { ...haeuser.find((x) => x.id === id), substanz: sauber ? 90 : 35 };
    const res = warenhaus(S, scene, h, { x: 0, z: 0, passanten: false });
    const mesh = schaufensterInnen(scene, res.koerper, res.fensterOG, { sauber, seed: 7 });
    this.unter = (res.fensterOG?.length ?? 0) + ' Fenster, ' + (mesh ? 1 : 0) + ' Draw Call';
    // Nahansicht auf die Ecke mit dem Eingang
    return new THREE.Box3(new THREE.Vector3(res.koerper.w * 0.55, 5, res.koerper.d - 2), new THREE.Vector3(res.koerper.w + 2, 15, res.koerper.d + 2));
  },
});
zeigeKatalog(e, { titel: 'Pilot Fenster Obergeschosse (three-fenestra)', spalten: 2, kachel: [900, 600] });

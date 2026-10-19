// Vergleichstafel: Jede Bauart in vier aktiven und inaktiven Zuständen.
import { sockel, THREE } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { wettbewerber, ARTEN, NAMEN } from '../kit/wettbewerber.js';

const STATI = ['eroeffnung', 'offen', 'raeumung', 'geschlossen'];
const BEZEICHNUNG = { eroeffnung: 'Neueröffnung', offen: 'Aktion 25 %',
  raeumung: 'Räumung', geschlossen: 'Leerstand' };
const eintraege = [];
for (const [i, art] of ARTEN.entries()) {
  for (const [j, status] of STATI.entries()) {
    eintraege.push({
      titel: (NAMEN[art]?.[0] ?? art) + ' · ' + BEZEICHNUNG[status],
      bau(S, scene) {
        const w = 52, d = 38;
        const erg = wettbewerber(S, scene, {
          x: 0, z: 0, w, d, seed: 111 + i, form: i % 5,
          name: NAMEN[art][0], art, region: ['nord', 'ost', 'sued'][i % 3],
          zustand: { status, rabatt: status === 'offen' ? 0.25 : 0 },
        });
        sockel(S, 0, 0, w, d, 4);
        this.unter = status + ' · ' + erg.teile + ' Teile · ' + erg.hoehe.toFixed(1) + ' m';
        return new THREE.Box3(new THREE.Vector3(-6, 0, -6),
          new THREE.Vector3(w + 6, erg.hoehe + 2, d + 9));
      },
    });
  }
}
setTimeout(() => zeigeKatalog(eintraege, {
  titel: 'Wettbewerber · Zustandsvergleich', spalten: 4, kachel: [540, 445],
}), 50);

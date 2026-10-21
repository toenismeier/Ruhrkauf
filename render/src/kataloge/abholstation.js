// O09: Abnahme-Kontaktbogen für den Hauseingang mit und ohne Abholstation.
import { sockel } from '../kit/basis.js';
import { zeigeKatalog } from '../kit/katalog.js';
import { warenhaus, masse } from '../kit/warenhaus.js';
import { abholstation } from '../kit/abholstation.js';
import haeuser from '../../haeuser.json';

const haus = haeuser.find((h) => h.format === 'warenhaus' && h.lage !== 'center');
if (!haus) throw new Error('Kein Hartwig-Warenhaus für den Abholstation-Katalog.');
const m = masse(haus);
const eintraege = [false, true].map((mit) => ({
  titel: mit ? 'Hartwig mit Abholstation und Paketboxen' : 'Hartwig ohne Abholstation',
  bau(S, scene) {
    const n = S.anzahl;
    warenhaus(S, scene, haus, { x: 0, z: 0 });
    if (mit) abholstation(S, scene, { x: 0, z: 0, w: m.w, d: m.d });
    sockel(S, 0, 0, m.w, m.d, 6);
    this.unter = (mit ? 'Click & Collect' : 'Standardhaus') + ' · ' + (S.anzahl - n) + ' Teile';
  },
}));
zeigeKatalog(eintraege, { titel: 'O09 Abholstation am Hartwig-Haus', spalten: 2, kachel: [650, 570] });

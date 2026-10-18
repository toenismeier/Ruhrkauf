// Katalog der zusätzlichen Westbauten für die Stadttypen (west.js): bergisches Haus, Schwebebahn, Brauhaus, Medienhafen, Fernmeldeturm, Pfalzdom.
import { zeigeKatalog } from '../kit/katalog.js';
import './_west-kein-autostart.js';
import { westEintraege } from './westbauten.js';
const LISTE = [
  ['Bergisches Schieferhaus', 'slot:berg_haus', { seed: 1, variante: 'schiefer', w: 11, d: 13 }, 2500],
  ['Bergisches Fachwerkhaus', 'slot:berg_haus', { seed: 2, variante: 'fachwerk', w: 12, d: 13 }, 2500],
  ['Bergisches Haus mit Laden', 'slot:berg_haus', { seed: 3, variante: 'putz', w: 9, d: 13, laden: true }, 2500],
  ['Bergisches Haus am Hang', 'slot:berg_haus', { seed: 4, variante: 'schiefer', w: 10, d: 12, sockelY: 4 }, 2500],
  ['Schwebebahn Strecke', 'slot:berg_schwebebahn', { seed: 1, variante: 'strecke', w: 60, d: 28 }, 2500],
  ['Schwebebahn Haltestelle', 'slot:berg_schwebebahn', { seed: 2, variante: 'station', w: 56, d: 28 }, 2500],
  ['Brauhauszeile', 'slot:rhein_brauhaus', { seed: 1, w: 28, d: 20 }, 4000],
  ['Medienhafen verformt', 'slot:rhein_medienhafen', { seed: 1, variante: 'gehry', w: 64, d: 40 }, 4000],
  ['Kranhaus', 'slot:rhein_medienhafen', { seed: 2, variante: 'kranhaus', w: 70, d: 30 }, 4000],
  ['Glasbau am Hafen', 'slot:rhein_medienhafen', { seed: 3, variante: 'glas', w: 44, d: 36 }, 4000],
  ['Fernmeldeturm', 'slot:rhein_turm', { seed: 1, w: 24, d: 24 }, 2500],
  ['Pfalzdom', 'slot:west_pfalzdom', { seed: 1, w: 80, d: 40 }, 4000],
];
zeigeKatalog(westEintraege(LISTE), { titel: 'Westbauten für die Stadttypen', spalten: 4, kachel: [520, 520] });

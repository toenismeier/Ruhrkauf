import { zeigeKatalog } from '../kit/katalog.js';
import { baueEintraegeL } from './hilfe-katalog.js';

// Stadt-Slots in typischen, auch zu kleinen Flächen (eingepasst bzw. skaliert)
const liste = [
  ['slot:kirche 40×18', 'slot:kirche', { seed: 11, w: 40, d: 18, region: 'sued' }, 2500],
  ['slot:rathaus 28×16', 'slot:rathaus', { seed: 11, w: 28, d: 16, region: 'sued' }, 2500],
  ['slot:schloss 60×48', 'slot:schloss', { seed: 11, w: 60, d: 48, region: 'sued' }, 6000],
  ['slot:theater 30×30', 'slot:theater', { seed: 11, w: 30, d: 30, region: 'sued' }, 2500],
  ['slot:museum 36×22', 'slot:museum', { seed: 11, w: 36, d: 22, region: 'sued' }, 2500],
  ['slot:tor 14×10', 'slot:tor', { seed: 11, w: 14, d: 10, region: 'sued' }, 2500],
  ['slot:denkmal 10×10', 'slot:denkmal', { seed: 11, w: 10, d: 10, region: 'sued' }, 2500],
  ['slot:markthalle 30×20', 'slot:markthalle', { seed: 11, w: 30, d: 20, region: 'sued' }, 2500],
  ['slot:hochhaus 22×20', 'slot:hochhaus', { seed: 11, w: 22, d: 20, region: 'sued' }, 2500],
  ['slot:hotel 26×16', 'slot:hotel', { seed: 11, w: 26, d: 16, region: 'sued' }, 2500],
  ['slot:parkhaus 28×32', 'slot:parkhaus', { seed: 11, w: 28, d: 32, region: 'sued' }, 2500],
  ['slot:konkurrenz 30×24', 'slot:konkurrenz', { seed: 11, w: 30, d: 24, region: 'sued' }, 2500],
  ['slot:mall 60×48', 'slot:mall', { seed: 11, w: 60, d: 48, region: 'sued' }, 6000],
  ['slot:bahnhof 70×24', 'slot:bahnhof', { seed: 11, w: 70, d: 24, region: 'sued' }, 6000],
  ['slot:wasserturm 12×12', 'slot:wasserturm', { seed: 11, w: 12, d: 12, region: 'sued' }, 2500],
  ['slot:tankstelle 32×28', 'slot:tankstelle', { seed: 11, w: 32, d: 28, region: 'sued' }, 2500],
  ['slot:discounter 40×44', 'slot:discounter', { seed: 11, w: 40, d: 44, region: 'sued' }, 2500],
];
zeigeKatalog(baueEintraegeL(liste), { titel: 'Stadt-Slots', spalten: 6, kachel: [400, 400] });

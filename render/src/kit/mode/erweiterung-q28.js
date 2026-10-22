// Q28: eigene Silhouetten und Zeichner dieses Chats (Konfliktvermeidung zwischen Q27, Q28, Q29).
// SILHOUETTEN: neue Einträge oder Ersatz bestehender (gleiche id überschreibt den Basiseintrag), Format wie in silhouetten.js.
// ZEICHNER: { name: (S, t, p) => void } – in SILHOUETTEN als zeichner: 'z:name' verwenden.
// Schuhe: p.schuh = Leistenart (q28-schuhe.js), p.art = Platz am Model (sneaker | pumps | stiefel | halb).
import { SCHUH_ZEICHNER } from './q28-schuhe.js';
import { TASCHEN_ZEICHNER } from './q28-taschen.js';
import { ACCESSOIRE_ZEICHNER } from './q28-accessoires.js';
import { WAESCHE_ZEICHNER } from './q28-waesche.js';

const tasche = (id, art, material, farbe, model = 'tasche', extra = {}) => ({ gruppe: 'tasche', zeichner: 'z:q28' + id, p: { art, ...extra }, material, farbe, model });
const acc = (id, material, farbe, model = null, p = {}) => ({ gruppe: 'accessoire', zeichner: 'z:q28' + id, p, material, farbe, model });
const w = (id, material, farbe, model = null, p = {}) => ({ gruppe: 'waesche', zeichner: 'z:q28' + id, p, material, farbe, model });
const schuh = (schuh, art, material, farbe, extra = {}) => ({ gruppe: 'schuhe', zeichner: 'z:q28schuh', p: { schuh, art, ...extra }, material, farbe, model: 'schuhe' });

export const SILHOUETTEN = {
  // Ersatz der alten Zeichner
  sneaker: schuh('sneaker', 'sneaker', 'leder', 'weiß'),
  pumps: schuh('pumps', 'pumps', 'leder', 'schwarz'),
  stiefel: schuh('stiefel', 'stiefel', 'leder', 'braun'),
  loafer: schuh('loafer', 'halb', 'leder', 'braun'),
  sandale: { gruppe: 'schuhe', zeichner: 'z:q28sandale', p: { art: 'halb' }, material: 'leder', farbe: 'cognac', model: 'schuhe' },
  // neue Schuhe
  chunkysneaker: schuh('chunky', 'sneaker', 'leder', 'offwhite'),
  plateausneaker: schuh('plateau', 'sneaker', 'leder', 'weiß'),
  chelseaboot: schuh('chelsea', 'halb', 'leder', 'braun'),
  schnuerstiefel: schuh('schnuerstiefel', 'halb', 'leder', 'schwarz'),
  winterstiefel: schuh('winterstiefel', 'halb', 'polyester', 'anthrazit'),
  overknee: schuh('overknee', 'stiefel', 'leder', 'schwarz'),
  ballerina: schuh('ballerina', 'halb', 'leder', 'altrosa'),
  mule: schuh('mule', 'halb', 'leder', 'camel'),
  espadrille: schuh('espadrille', 'halb', 'baumwolle', 'marine'),
  slipper: schuh('slipper', 'halb', 'leder', 'cognac'),
  businessschuh: schuh('business', 'halb', 'leder', 'schwarz'),
  hausschuh: schuh('hausschuh', 'halb', 'wolle', 'grau'),
  wanderschuh: schuh('wanderschuh', 'halb', 'leder', 'anthrazit'),
  gummistiefel: schuh('gummistiefel', 'stiefel', 'lack', 'gelb'),
  lauflernschuh: schuh('lauflern', 'sneaker', 'leder', 'hellblau'),
  // Taschen (Model: umhaenge = über der Schulter, tote = in der Hand; Kleinleder nur als Freisteller)
  handtasche: tasche('handtasche', 'tote', 'leder', 'cognac'),
  crossbody: tasche('crossbody', 'umhaenge', 'leder', 'schwarz'),
  clutch: tasche('clutch', 'tote', 'leder', 'gold'),
  shopper: tasche('shopper', 'tote', 'leder', 'camel'),
  weekender: tasche('weekender', 'tote', 'baumwolle', 'olive'),
  reisetasche: tasche('reisetasche', 'tote', 'polyester', 'marine'),
  portemonnaie: tasche('portemonnaie', null, 'leder', 'bordeaux', null),
  kartenetui: tasche('kartenetui', null, 'leder', 'cognac', null),
  guerteltasche: tasche('guerteltasche', 'umhaenge', 'polyester', 'olive'),
  kinderrucksack: tasche('kinderrucksack', null, 'polyester', 'hellblau', null),
  minibag: tasche('minibag', 'umhaenge', 'leder', 'altrosa'),
  // Accessoires (Kopfbedeckungen am Model: beanie | bucket)
  muetze: acc('muetze', 'strick', 'senf', 'muetze', { art: 'beanie' }),
  beanie: acc('beanie', 'rippe', 'olive', 'muetze', { art: 'beanie', bommel: false }),
  strohhut: acc('strohhut', 'leinen', 'sand', 'muetze', { art: 'bucket' }),
  muetzeschalset: acc('muetzeschalset', 'strick', 'koralle', 'muetze', { art: 'beanie' }),
  sonnenbrille: acc('sonnenbrille', 'kunststoff', 'schwarz'),
  halskette: acc('halskette', 'metall', 'gold'),
  ohrringe: acc('ohrringe', 'metall', 'gold'),
  armband: acc('armband', 'metall', 'gold'),
  haarreif: acc('haarreif', 'samt', 'bordeaux'),
  handschuhe: acc('handschuhe', 'leder', 'cognac'),
  regenschirm: acc('regenschirm', 'polyester', 'marine'),
  seidentuch: acc('seidentuch', 'seide', 'petrol'),
  krawatte: acc('krawatte', 'seide', 'marine'),
  fliege: acc('fliege', 'seide', 'bordeaux', null, { muster: 'punkte' }),
  // Wäsche, Nachtwäsche, Strümpfe (Unterwäsche nur als Freisteller; Nachtwäsche am Model)
  socken: w('socken', 'merino', 'anthrazit'),
  sockenset: w('sockenset', 'strick', 'marine'),
  strumpfhose: w('strumpfhose', 'polyester', 'schwarz'),
  pyjama: w('pyjama', 'baumwolle', 'hellblau', 'oberteil', { aermel: 'lang', kragen: 'hemd', knopfleiste: true, muster: 'streifen' }),
  nachthemd: w('nachthemd', 'baumwolle', 'flieder', 'kleid', { laenge: 'maxi', form: 'a-linie', aermel: 'halb', kragen: 'rund' }),
  bademantel: w('bademantel', 'frottee', 'hellgrau', 'jacke', { art: 'mantel' }),
  unterhemd: w('unterhemd', 'rippe', 'weiß'),
  slip: w('slip', 'baumwolle', 'altrosa'),
  boxershorts: w('boxershorts', 'baumwolle', 'hellblau', null, { muster: 'karo' }),
  unterwaesche: w('unterwaesche', 'baumwolle', 'anthrazit'),
  bh: w('bh', 'satin', 'altrosa'),
  sportbh: w('sportbh', 'polyester', 'petrol'),
  shapewear: w('shapewear', 'satin', 'beige'),
};
export const ZEICHNER = { ...SCHUH_ZEICHNER, ...TASCHEN_ZEICHNER, ...ACCESSOIRE_ZEICHNER, ...WAESCHE_ZEICHNER };

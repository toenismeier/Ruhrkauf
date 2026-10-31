// Q25: Silhouetten-Bibliothek – die feste Liste, aus der jeder Artikeltyp sein Bild bezieht (Schnittstelle für Q24).
// Artikeltyp in der Engine: bild: { silhouette, aermel?, laenge?, kragen?, passform?, muster?, form?, art? }
// silhouetten.json wird aus dieser Datei erzeugt (scripts/silhouetten-json.mjs) und muss gleich bleiben (Test).
//
// Felder je Silhouette:
//   gruppe   oberteil | unterteil | rock | kleid | jacke | schuhe | tasche | accessoire | waesche | home | beauty | spielzeug
//   zeichner oberteil | hose | rock | kleid | jacke | ding:<id> | alt:<Artikeltyp aus produktbild.js>
//   p        Standardparameter, überschreibbar durch den Artikeltyp
//   material Standardmaterial, farbe Standardfarbe
//   model    Platz am Model (oberteil | hose | rock | kleid | jacke | schuhe | tasche | muetze) oder null (nur Freisteller)
//   nur      optional: damen | herren | kinder | teens – Model nur in dieser Gruppe (Kleider nicht am Herrenmodel)
//   modelTeile optional (p, farbe, material) → [Teile] für Sets und Einteiler am Model (Q27)

export const PARAMETER = {
  aermel: ['ohne', 'traeger', 'kurz', 'halb', 'lang', 'puff'],
  laenge: ['crop', 'normal', 'lang', 'tunika', 'kurz', 'bermuda', 'cropped', 'mini', 'knie', 'midi', 'maxi', 'mantel'],
  kragen: ['rund', 'v', 'carree', 'hemd', 'polo', 'stehkragen', 'rollkragen', 'kapuze', 'wickel', 'offshoulder', 'troyer', 'henley'],
  passform: ['tailliert', 'gerade', 'oversize', 'boxy', 'skinny', 'schmal', 'weit', 'baggy', 'flare', 'jogger', 'leggings'],
  form: ['a-linie', 'plissee', 'bleistift', 'wickel', 'glocke', 'stufen', 'gerade', 'slip', 'etui', 'tuell'],
  muster: ['uni', 'streifen', 'karo', 'blumen', 'punkte', 'blockstreifen', 'print'],
  jackenart: ['blazer', 'sakko', 'mantel', 'trench', 'steppjacke', 'steppweste', 'jeansjacke', 'regenjacke', 'varsity', 'overshirt', 'parka', 'lederjacke', 'bomber', 'strickjacke', 'teddy', 'harrington', 'fieldjacket', 'funktion', 'track', 'strickweste', 'anzugweste'],
};

const o = (p, model = 'oberteil', material = 'baumwolle', farbe = 'weiß') => ({ gruppe: 'oberteil', zeichner: 'oberteil', p, material, farbe, model });
const h = (p, material = 'baumwolle', farbe = 'sand') => ({ gruppe: 'unterteil', zeichner: 'hose', p, material, farbe, model: 'hose' });
const r = (p, material = 'viskose', farbe = 'marine') => ({ gruppe: 'rock', zeichner: 'rock', p, material, farbe, model: 'rock' });
const k = (p, material = 'viskose', farbe = 'bordeaux') => ({ gruppe: 'kleid', zeichner: 'kleid', p, material, farbe, model: 'kleid' });
const j = (art, material, farbe, p = {}) => ({ gruppe: 'jacke', zeichner: 'jacke', p: { art, ...p }, material, farbe, model: 'jacke' });
const d = (gruppe, id, material, farbe, model = null, p = {}) => ({ gruppe, zeichner: 'ding:' + id, p, material, farbe, model });
const a = (gruppe, alt, material, farbe, model = null, p = {}) => ({ gruppe, zeichner: 'alt:' + alt, p, material, farbe, model });

export const SILHOUETTEN = {
  // Oberteile
  tshirt: o({ aermel: 'kurz', kragen: 'rund' }),
  babytee: o({ aermel: 'kurz', kragen: 'rund', passform: 'tailliert', laenge: 'crop' }, 'oberteil', 'baumwolle', 'rosa'),
  boxytee: o({ aermel: 'kurz', kragen: 'rund', passform: 'boxy' }, 'oberteil', 'baumwolle', 'schwarz'),
  vshirt: o({ aermel: 'kurz', kragen: 'v' }),
  longsleeve: o({ aermel: 'lang', kragen: 'rund' }, 'oberteil', 'baumwolle', 'ecru'),
  top: o({ aermel: 'ohne', kragen: 'rund', passform: 'tailliert' }, 'oberteil', 'rippe', 'weiß'),
  traegertop: o({ aermel: 'traeger', kragen: 'v', passform: 'tailliert' }, 'oberteil', 'seide', 'creme'),
  croptop: o({ aermel: 'ohne', laenge: 'crop', passform: 'tailliert', kragen: 'carree' }, 'oberteil', 'rippe', 'schwarz'),
  bluse: o({ aermel: 'lang', kragen: 'hemd', passform: 'tailliert', knopfleiste: true }, 'oberteil', 'viskose', 'weiß'),
  schluppenbluse: o({ aermel: 'lang', kragen: 'rund', passform: 'gerade', schleife: true, knopfleiste: true }, 'oberteil', 'seide', 'creme'),
  hemd: o({ aermel: 'lang', kragen: 'hemd', brusttasche: true }, 'oberteil', 'baumwolle', 'hellblau'),
  kurzarmhemd: o({ aermel: 'kurz', kragen: 'hemd', passform: 'boxy' }, 'oberteil', 'leinen', 'salbei'),
  polo: o({ aermel: 'kurz', kragen: 'polo' }, 'oberteil', 'baumwolle', 'marine'),
  pullover: o({ aermel: 'lang', kragen: 'rund', rippbund: true, strick: true }, 'oberteil', 'strick', 'camel'),
  vpullover: o({ aermel: 'lang', kragen: 'v', rippbund: true, strick: true }, 'oberteil', 'merino', 'marine'),
  rollkragen: o({ aermel: 'lang', kragen: 'rollkragen', rippbund: true, strick: true }, 'oberteil', 'kaschmir', 'ecru'),
  sweatshirt: o({ aermel: 'lang', kragen: 'rund', rippbund: true, passform: 'oversize' }, 'oberteil', 'baumwolle', 'grau'),
  hoodie: o({ aermel: 'lang', kragen: 'kapuze', kaenguru: true, rippbund: true, passform: 'oversize' }, 'oberteil', 'baumwolle', 'salbei'),
  tunika: o({ aermel: 'halb', kragen: 'v', laenge: 'tunika' }, 'oberteil', 'leinen', 'terrakotta'),
  wickelshirt: o({ aermel: 'lang', kragen: 'wickel', passform: 'tailliert' }, 'oberteil', 'viskose', 'bordeaux'),
  kinderbody: a('oberteil', 'Kinderbody', 'baumwolle', 'gelb', 'oberteil', { aermel: 'kurz' }),
  // Unterteile
  jeans: h({ passform: 'gerade' }, 'denim', 'jeansblau'),
  skinnyjeans: h({ passform: 'skinny' }, 'denim', 'dunkeldenim'),
  momjeans: h({ passform: 'gerade', saum: 'umschlag', laenge: 'cropped' }, 'denim', 'hellerdenim'),
  widelegjeans: h({ passform: 'weit' }, 'denim', 'jeansblau'),
  baggyjeans: h({ passform: 'baggy', ripped: true }, 'denim', 'hellerdenim'),
  flarejeans: h({ passform: 'flare' }, 'denim', 'dunkeldenim'),
  chino: h({ passform: 'schmal' }, 'baumwolle', 'sand'),
  stoffhose: h({ passform: 'gerade', bundfalte: true }, 'wolle', 'anthrazit'),
  marlenehose: h({ passform: 'weit', bundfalte: true }, 'wolle', 'camel'),
  leinenhose: h({ passform: 'weit', komfortbund: true }, 'leinen', 'ecru'),
  cargohose: h({ passform: 'baggy', cargo: true }, 'baumwolle', 'khaki'),
  jogginghose: h({ passform: 'jogger', taschen: false }, 'baumwolle', 'grau'),
  leggings: h({ passform: 'leggings', taschen: false }, 'polyester', 'schwarz'),
  komforthose: h({ passform: 'gerade', komfortbund: true }, 'baumwolle', 'anthrazit'),
  cordhose: h({ passform: 'gerade' }, 'cord', 'braun'),
  shorts: h({ laenge: 'kurz', passform: 'weit' }, 'baumwolle', 'sand'),
  bermuda: h({ laenge: 'bermuda', passform: 'gerade', saum: 'umschlag' }, 'baumwolle', 'beige'),
  culotte: h({ laenge: 'cropped', passform: 'weit', bundfalte: true }, 'viskose', 'olive'),
  latzhose: h({ passform: 'gerade', latz: true }, 'denim', 'jeansblau'),
  jeansshorts: { gruppe: 'unterteil', zeichner: 'ding:jeansshorts', p: { laenge: 'kurz', passform: 'gerade', saum: 'offen' }, material: 'denim', farbe: 'jeansblau', model: 'hose' },
  // Röcke
  rock: r({ laenge: 'knie', form: 'a-linie' }),
  minirock: r({ laenge: 'mini', form: 'a-linie' }, 'denim', 'jeansblau'),
  plisseerock: r({ laenge: 'midi', form: 'plissee' }, 'polyester', 'salbei'),
  plisseeminirock: r({ laenge: 'mini', form: 'plissee', muster: 'karo' }, 'polyester', 'bordeaux'),
  bleistiftrock: r({ laenge: 'knie', form: 'bleistift' }, 'wolle', 'schwarz'),
  midirock: r({ laenge: 'midi', form: 'a-linie' }, 'satin', 'senf'),
  wickelrock: r({ laenge: 'midi', form: 'wickel' }, 'viskose', 'terrakotta'),
  stufenrock: r({ laenge: 'maxi', form: 'stufen' }, 'baumwolle', 'weiß'),
  // Kleider
  kleid: k({ laenge: 'knie', form: 'a-linie', aermel: 'ohne' }),
  etuikleid: k({ laenge: 'knie', form: 'etui', aermel: 'ohne', kragen: 'rund' }, 'wolle', 'marine'),
  slipdress: k({ laenge: 'midi', form: 'slip', aermel: 'traeger' }, 'satin', 'flieder'),
  hemdblusenkleid: k({ laenge: 'midi', form: 'a-linie', aermel: 'halb', kragen: 'hemd', guertel: true }, 'baumwolle', 'hellblau'),
  maxikleid: k({ laenge: 'maxi', form: 'stufen', aermel: 'traeger' }, 'viskose', 'terrakotta'),
  wickelkleid: k({ laenge: 'midi', form: 'wickel', aermel: 'kurz', kragen: 'v' }, 'viskose', 'flaschengruen'),
  sommerkleid: k({ laenge: 'knie', form: 'glocke', aermel: 'puff', kragen: 'carree' }, 'baumwolle', 'gelb'),
  strickkleid: k({ laenge: 'midi', form: 'gerade', aermel: 'lang', kragen: 'rund' }, 'strick', 'camel'),
  kinderkleid: k({ laenge: 'knie', form: 'glocke', aermel: 'puff', kragen: 'rund' }, 'baumwolle', 'koralle'),
  // Jacken
  blazer: j('blazer', 'wolle', 'anthrazit'),
  mantel: j('mantel', 'wolle', 'camel'),
  trenchcoat: j('trench', 'baumwolle', 'beige'),
  steppjacke: j('steppjacke', 'polyester', 'marine'),
  steppweste: j('steppweste', 'polyester', 'olive'),
  jeansjacke: j('jeansjacke', 'denim', 'jeansblau'),
  regenjacke: j('regenjacke', 'polyester', 'gelb'),
  parka: j('parka', 'baumwolle', 'olive'),
  varsityjacke: j('varsity', 'wolle', 'flaschengruen'),
  bomberjacke: j('bomber', 'nylon', 'olive'),
  lederjacke: j('lederjacke', 'leder', 'schwarz'),
  overshirt: j('overshirt', 'cord', 'cognac'),
  strickjacke: j('strickjacke', 'strick', 'grau', { laenge: 'normal' }),
  // Schuhe
  sneaker: a('schuhe', 'Sneaker', 'leder', 'weiß', 'schuhe', { art: 'sneaker' }),
  pumps: a('schuhe', 'Pumps', 'leder', 'schwarz', 'schuhe', { art: 'pumps' }),
  stiefel: a('schuhe', 'Stiefel', 'leder', 'cognac', 'schuhe', { art: 'stiefel' }),
  loafer: d('schuhe', 'loafer', 'leder', 'braun', 'schuhe', { art: 'halb' }),
  sandale: d('schuhe', 'sandale', 'leder', 'cognac', 'schuhe', { art: 'halb' }),
  // Taschen und Accessoires
  handtasche: a('tasche', 'Handtasche', 'leder', 'cognac', 'tasche', { art: 'umhaenge' }),
  tote: d('tasche', 'tote', 'baumwolle', 'ecru', 'tasche', { art: 'tote' }),
  rucksack: d('tasche', 'rucksack', 'polyester', 'olive'),
  cap: d('accessoire', 'cap', 'baumwolle', 'marine', 'muetze', { art: 'cap' }),
  buckethat: d('accessoire', 'buckethat', 'baumwolle', 'sand', 'muetze', { art: 'bucket' }),
  muetze: a('accessoire', 'Mütze', 'merino', 'senf', 'muetze', { art: 'beanie' }),
  schal: d('accessoire', 'schal', 'kaschmir', 'bordeaux'),
  guertel: d('accessoire', 'guertel', 'leder', 'cognac'),
  socken: a('waesche', 'Socken', 'merino', 'anthrazit'),
  // Wäsche
  pyjama: a('waesche', 'Pyjama', 'baumwolle', 'hellblau'),
  unterwaesche: a('waesche', 'Unterwäsche', 'baumwolle', 'schwarz'),
  bh: a('waesche', 'BH', 'seide', 'altrosa'),
  // Home/Living
  bettwaesche: d('home', 'bettwaesche', 'leinen', 'salbei'),
  handtuch: d('home', 'handtuch', 'frottee', 'petrol'),
  plaid: d('home', 'plaid', 'strick', 'senf'),
  kissen: d('home', 'kissen', 'boucle', 'ecru'),
  duftkerze: d('home', 'duftkerze', 'wachs', 'terrakotta'),
  vase: d('home', 'vase', 'keramik', 'flaschengruen'),
  becher: d('home', 'becher', 'keramik', 'salbei'),
  teller: d('home', 'teller', 'keramik', 'creme'),
  glas: d('home', 'glas', 'glas', 'hellblau'),
  karaffe: d('home', 'karaffe', 'glas', 'hellblau'),
  korb: d('home', 'korb', 'rattan', 'camel'),
  serviette: d('home', 'serviette', 'leinen', 'altrosa'),
  bilderrahmen: d('home', 'bilderrahmen', 'holz', 'camel'),
  teppich: d('home', 'teppich', 'wolle', 'terrakotta'),
  // Beauty, Spielwaren
  lippenstift: d('beauty', 'lippenstift', 'kosmetik', 'rot'),
  creme: a('beauty', 'Creme', 'kosmetik', 'rosa'),
  parfum: a('beauty', 'Parfum', 'glas', 'flieder'),
  plueschtier: a('spielzeug', 'Plüschtier', 'polyester', 'camel'),
};

// Model nur in passender Gruppe (Q27): Röcke, Kleider, typische Damenoberteile nur an Damen; Kinderteile nur an Kindern
for (const [id, s] of Object.entries(SILHOUETTEN)) if (s.gruppe === 'rock' || s.gruppe === 'kleid') s.nur = 'damen';
for (const id of ['babytee', 'traegertop', 'croptop', 'schluppenbluse', 'tunika', 'wickelshirt']) SILHOUETTEN[id].nur = 'damen';
Object.assign(SILHOUETTEN.kinderkleid, { nur: 'kinder', geschlecht: 'damen' });
SILHOUETTEN.kinderbody.nur = 'kinder';

// Erweiterungen der Bild-Chats Q27–Q29, Q34 (überschreiben gleichnamige Basiseinträge)
import * as Q27 from './erweiterung-q27.js';
import * as Q28 from './erweiterung-q28.js';
import * as Q29 from './erweiterung-q29.js';
import * as Q33 from './erweiterung-q33.js';
import * as Q34 from './erweiterung-q34.js';
import * as B01 from './erweiterung-b01.js';
import * as B02 from './erweiterung-b02.js';
import * as B03 from './erweiterung-b03.js';
import * as B04 from './erweiterung-b04.js';
import * as B05 from './erweiterung-b05.js';
import * as B06 from './erweiterung-b06.js';
import * as B07 from './erweiterung-b07.js';
import * as B08 from './erweiterung-b08.js';
import * as B09 from './erweiterung-b09.js';
import * as B10 from './erweiterung-b10.js';
import * as B11 from './erweiterung-b11.js';
import * as B12 from './erweiterung-b12.js';
import * as B13 from './erweiterung-b13.js';
import * as B14 from './erweiterung-b14.js';
import * as B15 from './erweiterung-b15.js';
import * as B16 from './erweiterung-b16.js';
import * as B17 from './erweiterung-b17.js';
import * as B18 from './erweiterung-b18.js';
import * as B19 from './erweiterung-b19.js';
import * as B20 from './erweiterung-b20.js';
import * as B21 from './erweiterung-b21.js';
import * as B22 from './erweiterung-b22.js';
import * as B23 from './erweiterung-b23.js';
import * as B24 from './erweiterung-b24.js';
import * as B25 from './erweiterung-b25.js';
import * as B26 from './erweiterung-b26.js';
import * as B27 from './erweiterung-b27.js';
import * as B28 from './erweiterung-b28.js';
import * as B29 from './erweiterung-b29.js';
import * as B30 from './erweiterung-b30.js';
Object.assign(SILHOUETTEN, Q27.SILHOUETTEN, Q28.SILHOUETTEN, Q29.SILHOUETTEN, Q33.SILHOUETTEN, Q34.SILHOUETTEN, B01.SILHOUETTEN, B02.SILHOUETTEN, B03.SILHOUETTEN, B04.SILHOUETTEN, B05.SILHOUETTEN, B06.SILHOUETTEN, B07.SILHOUETTEN, B08.SILHOUETTEN, B09.SILHOUETTEN, B10.SILHOUETTEN, B11.SILHOUETTEN, B12.SILHOUETTEN, B13.SILHOUETTEN, B14.SILHOUETTEN, B15.SILHOUETTEN, B16.SILHOUETTEN, B17.SILHOUETTEN, B18.SILHOUETTEN, B19.SILHOUETTEN, B20.SILHOUETTEN, B21.SILHOUETTEN, B22.SILHOUETTEN, B23.SILHOUETTEN, B24.SILHOUETTEN, B25.SILHOUETTEN, B26.SILHOUETTEN, B27.SILHOUETTEN, B28.SILHOUETTEN, B29.SILHOUETTEN, B30.SILHOUETTEN);
export const ZEICHNER_ERWEITERT = { ...Q27.ZEICHNER, ...Q28.ZEICHNER, ...Q29.ZEICHNER, ...Q33.ZEICHNER, ...Q34.ZEICHNER, ...B01.ZEICHNER, ...B02.ZEICHNER, ...B03.ZEICHNER, ...B04.ZEICHNER, ...B05.ZEICHNER, ...B06.ZEICHNER, ...B07.ZEICHNER, ...B08.ZEICHNER, ...B09.ZEICHNER, ...B10.ZEICHNER, ...B11.ZEICHNER, ...B12.ZEICHNER, ...B13.ZEICHNER, ...B14.ZEICHNER, ...B15.ZEICHNER, ...B16.ZEICHNER, ...B17.ZEICHNER, ...B18.ZEICHNER, ...B19.ZEICHNER, ...B20.ZEICHNER, ...B21.ZEICHNER, ...B22.ZEICHNER, ...B23.ZEICHNER, ...B24.ZEICHNER, ...B25.ZEICHNER, ...B26.ZEICHNER, ...B27.ZEICHNER, ...B28.ZEICHNER, ...B29.ZEICHNER, ...B30.ZEICHNER };

export const SILHOUETTEN_IDS = Object.keys(SILHOUETTEN);

// Daten für silhouetten.json (ohne Zeichner-Interna)
export function silhouettenDaten() {
  return {
    hinweis: 'Q25-Bildschnittstelle. Artikeltyp: bild: { silhouette, …Parameter }. Erzeugt aus render/src/kit/mode/silhouetten.js, nicht von Hand ändern.',
    parameter: PARAMETER,
    silhouetten: Object.fromEntries(Object.entries(SILHOUETTEN).map(([id, s]) => [id, { gruppe: s.gruppe, standard: s.p, material: s.material, farbe: s.farbe, model: s.model, ...(s.nur ? { nur: s.nur } : {}), ...(s.geschlecht ? { geschlecht: s.geschlecht } : {}) }])),
  };
}

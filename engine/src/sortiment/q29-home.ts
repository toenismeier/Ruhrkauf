// Q29: neue Artikeltypen Home/Living, Beauty, Spielwaren (Phase 2). Bilder aus render/src/kit/mode/erweiterung-q29.js.
// Gruppe = Passung je Trendgruppe (kinder, jung, mitte, reif); Nicht-Textil-Materialien laufen wie bei Tasse/Vase/Creme über 'Polyester'.
// pfad je Block fest gesetzt (Bett und Textilien, Badtextilien, Tisch und Küche, Leuchten und Deko, Pflege, Körper und Haar, Duft, Make-up, Spielwaren).
import { G, type SortimentTyp } from './basis';
import type { BaumKategorie } from '../produkt-sortiment';

const NT = ['Polyester'] as const; // Nicht-Textil (Steingut, Glas, Holz, Metall, Kosmetik)

export const NAMEN = [
  'Satin-Bettwäsche', 'Renforcé-Bettwäsche', 'Leinen-Bettwäsche', 'Kinderbettwäsche', 'Ganzjahres-Bettdecke', 'Daunendecke', 'Sommerdecke',
  'Kopfkissen', 'Nackenstützkissen', 'Jersey-Spannbettlaken', 'Boxspring-Spannbettlaken', 'Gesteppte Tagesdecke', 'Bouclé-Kissen', 'Strickplaid',
  'Waffelpiqué-Handtuch', 'Saunatuch', 'Badematte', 'Leinen-Tischdecke', 'Leinenserviette', 'Ösenschal', 'Leinenvorhang',
  'Speiseteller', 'Frühstücksteller', 'Steingut-Geschirrset', 'Müslischale', 'Besteckset', 'Wasserglas', 'Weinglas', 'Steingut-Becher-Set',
  'Henkelbecher', 'Teekanne', 'Kochtopf', 'Bratpfanne', 'Schneidebrett', 'Vorratsglas', 'Servierplatte', 'Glaskaraffe',
  'Tischleuchte', 'Wandspiegel', 'Laterne', 'Messing-Kerzenleuchter', 'Kunstpflanze im Übertopf', 'Duftstäbchen', 'Duftkerze', 'Aufbewahrungsbox',
  'Wäschekorb', 'Wanduhr', 'Bilderrahmen-Set', 'Dekoschale', 'Steingutvase',
  'Gesichtscreme', 'Körperbutter', 'Lippenbalsam', 'Eau de Parfum', 'Herrenduft', 'Matter Lippenstift', 'Volumen-Mascara', 'Lidschattenpalette',
  'Hyaluron-Serum', 'Augencreme', 'Sonnencreme', 'Flüssigseife', 'Duschcreme', 'Shampoo', 'Nassrasierer', 'Haarbürste',
  'Holzeisenbahn', 'Puzzle', 'Holzbausteine', 'Stoffpuppe', 'Plüsch-Teddy',
] as const;

type N = (typeof NAMEN)[number];
type T = SortimentTyp<N>;
let pfad: readonly [BaumKategorie, string] = ['home', 'Bett und Textilien'];
const ast = (k: BaumKategorie, u: string) => { pfad = [k, u]; };
const t = (typ: N, kategorie: T['kategorie'], wgs: T['wgs'], saison: T['saison'], preis: number,
  materialien: readonly T['materialien'][number][], gruppe: T['gruppe'], aufwand: number, bild: T['bild']): T =>
  ({ typ, kategorie, wgs, saison, preis, materialien: [...materialien], gruppe, aufwand, bild, pfad });

ast('home', 'Bett und Textilien');
const BETT: T[] = [
  t('Satin-Bettwäsche', 'home', ['wohnen.bett'], 'ganz', 69, ['Baumwolle', 'Seide'], G(0, 0.55, 0.9, 0.85), 2, { silhouette: 'bettwaesche' }),
  t('Renforcé-Bettwäsche', 'home', ['wohnen.bett'], 'ganz', 45, ['Baumwolle', 'Bio-Baumwolle'], G(0, 0.75, 0.85, 0.7), 1, { silhouette: 'bettwaesche', muster: 'punkte' }),
  t('Leinen-Bettwäsche', 'home', ['wohnen.bett'], 'sommer', 99, ['Leinen'], G(0, 0.6, 0.9, 0.75), 2, { silhouette: 'bettwaesche' }),
  t('Kinderbettwäsche', 'home', ['wohnen.bett'], 'ganz', 35, ['Baumwolle', 'Bio-Baumwolle'], G(1, 0.1, 0, 0), 1, { silhouette: 'bettwaesche', muster: 'blumen' }),
  t('Ganzjahres-Bettdecke', 'home', ['wohnen.bett'], 'ganz', 79, ['Baumwolle', 'Polyester'], G(0.3, 0.7, 0.85, 0.85), 2, { silhouette: 'bettdecke' }),
  t('Daunendecke', 'home', ['wohnen.bett'], 'winter', 169, ['Baumwolle'], G(0, 0.45, 0.85, 0.95), 3, { silhouette: 'bettdecke' }),
  t('Sommerdecke', 'home', ['wohnen.bett'], 'sommer', 49, ['Baumwolle', 'Polyester'], G(0.3, 0.7, 0.8, 0.75), 1, { silhouette: 'bettdecke' }),
  t('Kopfkissen', 'home', ['wohnen.bett'], 'ganz', 29, ['Baumwolle', 'Polyester'], G(0.4, 0.75, 0.85, 0.85), 1, { silhouette: 'kopfkissen' }),
  t('Nackenstützkissen', 'home', ['wohnen.bett'], 'ganz', 49, ['Baumwolle', 'Polyester'], G(0, 0.2, 0.7, 0.95), 2, { silhouette: 'kopfkissen' }),
  t('Jersey-Spannbettlaken', 'home', ['wohnen.bett'], 'ganz', 25, ['Baumwolle', 'Bio-Baumwolle'], G(0.4, 0.85, 0.85, 0.75), 1, { silhouette: 'spannbettlaken' }),
  t('Boxspring-Spannbettlaken', 'home', ['wohnen.bett'], 'ganz', 39, ['Baumwolle', 'Polyester'], G(0, 0.5, 0.9, 0.85), 1, { silhouette: 'spannbettlaken' }),
  t('Gesteppte Tagesdecke', 'home', ['wohnen.bett', 'wohnen.heimtextil'], 'ganz', 89, ['Baumwolle', 'Polyester'], G(0, 0.45, 0.85, 0.9), 2, { silhouette: 'tagesdecke' }),
  t('Bouclé-Kissen', 'home', ['wohnen.heimtextil', 'wohnen.deko'], 'winter', 35, ['Polyester', 'Baumwolle'], G(0, 0.9, 0.85, 0.55), 1, { silhouette: 'kissen' }),
  t('Strickplaid', 'home', ['wohnen.heimtextil'], 'winter', 59, ['Baumwolle', 'Merino', 'Kaschmir'], G(0.1, 0.8, 0.85, 0.8), 1, { silhouette: 'plaid' }),
];
ast('home', 'Badtextilien');
const B0: T[] = [
  t('Waffelpiqué-Handtuch', 'home', ['wohnen.heimtextil'], 'ganz', 22, ['Baumwolle', 'Leinen'], G(0, 0.85, 0.85, 0.6), 1, { silhouette: 'waffelhandtuch' }),
  t('Saunatuch', 'home', ['wohnen.heimtextil'], 'ganz', 39, ['Baumwolle', 'Bio-Baumwolle'], G(0, 0.55, 0.85, 0.85), 1, { silhouette: 'handtuch' }),
  t('Badematte', 'home', ['wohnen.heimtextil'], 'ganz', 25, ['Baumwolle', 'Polyester'], G(0.2, 0.75, 0.85, 0.8), 1, { silhouette: 'badematte' }),
];
ast('home', 'Tischtextilien und Fenster');
const B1: T[] = [
  t('Leinen-Tischdecke', 'home', ['wohnen.heimtextil', 'wohnen.tisch'], 'ganz', 59, ['Leinen', 'Baumwolle'], G(0, 0.45, 0.85, 0.9), 1, { silhouette: 'tischdecke' }),
  t('Leinenserviette', 'home', ['wohnen.tisch'], 'ganz', 19, ['Leinen'], G(0, 0.6, 0.85, 0.8), 1, { silhouette: 'serviette' }),
  t('Ösenschal', 'home', ['wohnen.heimtextil'], 'ganz', 39, ['Polyester', 'Baumwolle', 'Leinen'], G(0, 0.65, 0.85, 0.85), 1, { silhouette: 'vorhang' }),
  t('Leinenvorhang', 'home', ['wohnen.heimtextil'], 'sommer', 69, ['Leinen'], G(0, 0.7, 0.85, 0.7), 2, { silhouette: 'vorhang' }),
];
ast('home', 'Tisch und Küche');
const B2: T[] = [
  t('Speiseteller', 'home', ['wohnen.tisch'], 'ganz', 12, NT, G(0, 0.75, 0.9, 0.85), 1, { silhouette: 'teller' }),
  t('Frühstücksteller', 'home', ['wohnen.tisch'], 'ganz', 9, NT, G(0, 0.75, 0.9, 0.85), 1, { silhouette: 'teller' }),
  t('Steingut-Geschirrset', 'home', ['wohnen.tisch'], 'ganz', 89, NT, G(0, 0.8, 0.9, 0.7), 2, { silhouette: 'geschirrset' }),
  t('Müslischale', 'home', ['wohnen.tisch'], 'ganz', 9, NT, G(0.3, 0.85, 0.85, 0.7), 1, { silhouette: 'schalen' }),
  t('Besteckset', 'home', ['wohnen.tisch'], 'ganz', 59, NT, G(0, 0.65, 0.9, 0.85), 2, { silhouette: 'besteck' }),
  t('Wasserglas', 'home', ['wohnen.tisch'], 'ganz', 6, NT, G(0.2, 0.85, 0.85, 0.75), 1, { silhouette: 'wasserglas' }),
  t('Weinglas', 'home', ['wohnen.tisch'], 'ganz', 12, NT, G(0, 0.55, 0.9, 0.9), 1, { silhouette: 'weinglas' }),
  t('Steingut-Becher-Set', 'home', ['wohnen.tisch'], 'ganz', 29, NT, G(0, 0.9, 0.85, 0.6), 1, { silhouette: 'becherset' }),
  t('Henkelbecher', 'home', ['wohnen.tisch'], 'ganz', 12, NT, G(0.4, 0.85, 0.8, 0.75), 1, { silhouette: 'becher' }),
  t('Teekanne', 'home', ['wohnen.tisch'], 'winter', 39, NT, G(0, 0.5, 0.8, 0.9), 2, { silhouette: 'teekanne' }),
  t('Kochtopf', 'home', ['wohnen.tisch'], 'ganz', 49, NT, G(0, 0.6, 0.9, 0.85), 2, { silhouette: 'topf' }),
  t('Bratpfanne', 'home', ['wohnen.tisch'], 'ganz', 45, NT, G(0, 0.65, 0.9, 0.85), 2, { silhouette: 'pfanne' }),
  t('Schneidebrett', 'home', ['wohnen.tisch'], 'ganz', 25, NT, G(0, 0.75, 0.9, 0.8), 1, { silhouette: 'schneidebrett' }),
  t('Vorratsglas', 'home', ['wohnen.tisch'], 'ganz', 9, NT, G(0, 0.8, 0.85, 0.8), 1, { silhouette: 'vorratsglas' }),
  t('Servierplatte', 'home', ['wohnen.tisch'], 'ganz', 29, NT, G(0, 0.6, 0.9, 0.85), 1, { silhouette: 'servierplatte' }),
  t('Glaskaraffe', 'home', ['wohnen.tisch'], 'sommer', 25, NT, G(0, 0.7, 0.85, 0.8), 1, { silhouette: 'karaffe' }),
];
ast('home', 'Leuchten und Deko');
const B3: T[] = [
  t('Tischleuchte', 'home', ['wohnen.deko'], 'winter', 79, NT, G(0, 0.75, 0.9, 0.8), 2, { silhouette: 'tischleuchte' }),
  t('Wandspiegel', 'home', ['wohnen.deko'], 'ganz', 69, NT, G(0, 0.85, 0.85, 0.7), 2, { silhouette: 'spiegel' }),
  t('Laterne', 'home', ['wohnen.deko'], 'winter', 35, NT, G(0, 0.55, 0.85, 0.85), 1, { silhouette: 'laterne' }),
  t('Messing-Kerzenleuchter', 'home', ['wohnen.deko'], 'winter', 29, NT, G(0, 0.6, 0.85, 0.85), 1, { silhouette: 'kerzenhalter' }),
  t('Kunstpflanze im Übertopf', 'home', ['wohnen.deko'], 'ganz', 39, NT, G(0, 0.8, 0.85, 0.75), 1, { silhouette: 'pflanze' }),
  t('Duftstäbchen', 'home', ['wohnen.deko'], 'ganz', 25, NT, G(0, 0.9, 0.85, 0.6), 1, { silhouette: 'duftstaebchen' }),
  t('Duftkerze', 'home', ['wohnen.deko'], 'winter', 22, NT, G(0, 0.95, 0.85, 0.65), 1, { silhouette: 'duftkerze' }),
  t('Aufbewahrungsbox', 'home', ['wohnen.deko'], 'ganz', 25, ['Leinen', 'Baumwolle'], G(0.3, 0.8, 0.85, 0.7), 1, { silhouette: 'aufbewahrungsbox' }),
  t('Wäschekorb', 'home', ['wohnen.deko'], 'ganz', 45, NT, G(0, 0.7, 0.9, 0.8), 1, { silhouette: 'waeschekorb' }),
  t('Wanduhr', 'home', ['wohnen.deko'], 'ganz', 39, NT, G(0, 0.6, 0.85, 0.9), 1, { silhouette: 'wanduhr' }),
  t('Bilderrahmen-Set', 'home', ['wohnen.deko'], 'ganz', 35, NT, G(0, 0.9, 0.85, 0.7), 1, { silhouette: 'bilderrahmenset' }),
  t('Dekoschale', 'home', ['wohnen.deko'], 'ganz', 29, NT, G(0, 0.65, 0.85, 0.85), 1, { silhouette: 'dekoschale' }),
  t('Steingutvase', 'home', ['wohnen.deko'], 'ganz', 35, NT, G(0, 0.8, 0.85, 0.8), 1, { silhouette: 'vase' }),
];
ast('beauty', 'Pflege');
const B4: T[] = [
  t('Gesichtscreme', 'beauty', ['beauty.pflege'], 'ganz', 25, NT, G(0, 0.6, 0.9, 0.95), 2, { silhouette: 'creme' }),
  t('Körperbutter', 'beauty', ['beauty.pflege', 'beauty.drogerie'], 'winter', 15, NT, G(0, 0.8, 0.85, 0.75), 1, { silhouette: 'tiegel' }),
  t('Lippenbalsam', 'beauty', ['beauty.drogerie'], 'winter', 5, NT, G(0.3, 0.9, 0.8, 0.75), 1, { silhouette: 'tiegel' }),
  t('Hyaluron-Serum', 'beauty', ['beauty.pflege'], 'ganz', 29, NT, G(0, 0.75, 0.95, 0.9), 2, { silhouette: 'serum' }),
  t('Augencreme', 'beauty', ['beauty.pflege'], 'ganz', 22, NT, G(0, 0.35, 0.9, 0.95), 2, { silhouette: 'tube' }),
  t('Sonnencreme', 'beauty', ['beauty.drogerie'], 'sommer', 12, NT, G(0.8, 0.9, 0.85, 0.85), 1, { silhouette: 'tube' }),
];
ast('beauty', 'Körper und Haar');
const B4b: T[] = [
  t('Flüssigseife', 'beauty', ['beauty.drogerie'], 'ganz', 6, NT, G(0.3, 0.75, 0.85, 0.85), 1, { silhouette: 'pumpspender' }),
  t('Duschcreme', 'beauty', ['beauty.drogerie'], 'ganz', 5, NT, G(0.3, 0.9, 0.85, 0.8), 1, { silhouette: 'duschgel' }),
  t('Shampoo', 'beauty', ['beauty.drogerie'], 'ganz', 6, NT, G(0.3, 0.9, 0.85, 0.8), 1, { silhouette: 'duschgel' }),
  t('Nassrasierer', 'beauty', ['beauty.drogerie'], 'ganz', 12, NT, G(0, 0.85, 0.9, 0.8), 1, { silhouette: 'rasierer' }),
  t('Haarbürste', 'beauty', ['beauty.drogerie'], 'ganz', 15, NT, G(0.4, 0.85, 0.85, 0.8), 1, { silhouette: 'haarbuerste' }),
];
ast('beauty', 'Duft');
const B5: T[] = [
  t('Eau de Parfum', 'beauty', ['beauty.pflege'], 'ganz', 59, NT, G(0, 0.75, 0.9, 0.9), 3, { silhouette: 'parfum', form: 'rund' }),
  t('Herrenduft', 'beauty', ['beauty.pflege'], 'ganz', 55, NT, G(0, 0.8, 0.9, 0.8), 3, { silhouette: 'parfum', form: 'saeule' }),
];
ast('beauty', 'Make-up');
const B6: T[] = [
  t('Matter Lippenstift', 'beauty', ['beauty.pflege'], 'ganz', 15, NT, G(0, 0.95, 0.85, 0.6), 1, { silhouette: 'lippenstift' }),
  t('Volumen-Mascara', 'beauty', ['beauty.pflege'], 'ganz', 14, NT, G(0, 0.95, 0.85, 0.65), 1, { silhouette: 'mascara' }),
  t('Lidschattenpalette', 'beauty', ['beauty.pflege'], 'ganz', 25, NT, G(0, 0.95, 0.8, 0.5), 2, { silhouette: 'lidschatten' }),
];
ast('kinder', 'Plüsch und Spielwaren');
const B7: T[] = [
  t('Holzeisenbahn', 'kinder', ['kinder.baby'], 'ganz', 39, NT, G(1, 0, 0, 0), 2, { silhouette: 'holzspielzeug' }),
  t('Puzzle', 'kinder', ['kinder.baby'], 'ganz', 15, NT, G(1, 0.1, 0, 0), 1, { silhouette: 'puzzle' }),
  t('Holzbausteine', 'kinder', ['kinder.baby'], 'ganz', 29, NT, G(1, 0, 0, 0), 1, { silhouette: 'bauklotze' }),
  t('Stoffpuppe', 'kinder', ['kinder.baby'], 'ganz', 29, ['Baumwolle', 'Bio-Baumwolle'], G(1, 0, 0, 0), 2, { silhouette: 'puppe' }),
  t('Plüsch-Teddy', 'kinder', ['kinder.baby'], 'winter', 25, ['Polyester', 'Bio-Baumwolle'], G(1, 0, 0, 0), 1, { silhouette: 'plueschtier' }),
];

export const TYPEN: T[] = [...BETT, ...B0, ...B1, ...B2, ...B3, ...B4, ...B4b, ...B5, ...B6, ...B7];

// Q34: neue Artikeltypen für Adults (30–49) und Best Ager (50+), Damen, Herren, Home und Beauty.
// Bilder aus render/src/kit/mode/erweiterung-q34.js (eigene Silhouette oder eigene Parameter je Typ, kein Bild doppelt).
// Zielgruppen über G(kinder, jung, mitte, reif): Best-Ager-Artikel mit reif ≥ 0,9 und jung ≤ 0,2 (keine Crop-Tops oder
// Baggy-Teile hier), Adults-Artikel mit mitte ≥ 0,85. WG nur dort, wo schon Artikeltypen liegen (Startsortiment unverändert).
import { G, type ArtikelBild, type SortimentTyp } from './basis';
import type { BaumKategorie } from '../produkt-sortiment';

export const NAMEN = [
  // Damen
  'Longbluse', 'Kurzarmbluse', 'Rollkragenshirt', 'Halbarmshirt', 'Feinstrickjacke', 'Shirtjacke', 'Strickmantel', 'Bundfaltenhose',
  '7/8-Hose', 'Schlupfhose', 'Jerseyrock', 'Karo-Faltenrock', 'Jerseykleid', 'Shirtkleid', 'Abendkleid', 'Kurzmantel', 'Cabanjacke',
  'Cape', 'Unterkleid', 'Morgenmantel', 'Minimizer-BH',
  // Herren
  'Zip-Strickjacke', 'Herren-Schlafanzug', 'Thermo-Unterhemd',
  // Schuhe
  'Komfortschuh', 'Monk-Schuh', 'Quastenloafer', 'Slip-on-Sneaker', 'Clog', 'Pantoffel', 'Haferlschuh', 'Kitten-Heel-Pumps',
  'Keilsandalette', 'Zehentrenner', 'Stützkniestrümpfe',
  // Accessoires und Taschen
  'Lesebrille', 'Lesebrillenetui', 'Herrenuhr', 'Damenuhr', 'Manschettenknöpfe', 'Brosche', 'Perlenkette', 'Schiebermütze',
  'Filzhut', 'Hosenträger', 'Gehstock-Schirm', 'Leselupe', 'Karoschal', 'Kulturbeutel', 'Aktentasche', 'Einkaufstrolley',
  // Home
  'Isolierkanne', 'Kaffeeservice', 'Brotkorb', 'Sitzkissen', 'Teppich', 'Teelichthalter',
  // Beauty
  'Haarspray', 'Deospray', 'Kompaktpuder', 'Make-up-Pinselset', 'Anti-Aging-Creme', 'Nachtcreme', 'Aftershave',
] as const;

type N = (typeof NAMEN)[number];
type T = SortimentTyp<N>;
const bild = (silhouette: string, p: Omit<ArtikelBild, 'silhouette'> = {}): ArtikelBild => ({ silhouette, ...p });
let pfad: readonly [BaumKategorie, string] = ['oberteile', 'Blusen'];
const ast = (k: BaumKategorie, u: string) => { pfad = [k, u]; };
const t = (typ: N, kategorie: T['kategorie'], wgs: T['wgs'], saison: T['saison'], preis: number,
  materialien: readonly T['materialien'][number][], gruppe: T['gruppe'], aufwand: number, b: ArtikelBild): T =>
  ({ typ, kategorie, wgs, saison, preis, materialien: [...materialien], gruppe, aufwand, bild: b, pfad });

// Zielgruppenprofile
const BEST = G(0, 0.1, 0.6, 0.95);     // Best Ager
const REIF = G(0, 0.25, 0.8, 0.95);    // Adults und Best Ager, Schwerpunkt Best Ager
const ADULT = G(0, 0.45, 0.95, 0.75);  // Adults, auch Best Ager
const MITTE = G(0, 0.35, 0.9, 0.9);    // Adults und Best Ager gleich

const BW = ['Baumwolle', 'Viskose'] as const, STRICK = ['Merino', 'Kaschmir', 'Baumwolle'] as const, WOLLE = ['Merino', 'Polyester'] as const;
const LEDER = ['Leder'] as const, NT = ['Polyester'] as const;

ast('oberteile', 'Blusen');
const OBERTEILE: T[] = [
  t('Longbluse', 'oberteile', ['damen.blusen', 'damen.gg'], 'ganz', 59, BW, REIF, 2, bild('longbluse')),
  t('Kurzarmbluse', 'oberteile', ['damen.blusen'], 'sommer', 45, BW, MITTE, 1, bild('kurzarmbluse')),
  (ast('oberteile', 'Shirts'), t('Rollkragenshirt', 'oberteile', ['damen.blusen'], 'winter', 35, BW, MITTE, 1, bild('rollkragenshirt'))),
  t('Halbarmshirt', 'oberteile', ['damen.blusen', 'damen.gg'], 'sommer', 29, BW, BEST, 1, bild('halbarmshirt')),
  (ast('oberteile', 'Cardigans und Strickjacken'), t('Feinstrickjacke', 'oberteile', ['damen.strick'], 'ganz', 69, STRICK, REIF, 2, bild('feinstrickjacke'))),
  t('Shirtjacke', 'oberteile', ['damen.strick', 'damen.gg'], 'ganz', 49, BW, BEST, 1, bild('shirtjacke')),
  t('Strickmantel', 'oberteile', ['damen.strick'], 'winter', 99, STRICK, REIF, 3, bild('strickmantel')),
  t('Zip-Strickjacke', 'oberteile', ['herren.strick'], 'winter', 79, STRICK, REIF, 2, bild('zipstrickjacke')),
];
ast('unterteile', 'Stoffhosen');
const UNTERTEILE: T[] = [
  t('Bundfaltenhose', 'unterteile', ['damen.hosen', 'herren.hosen'], 'ganz', 79, ['Merino', 'Polyester', 'Leinen'], REIF, 2, bild('bundfaltenhose')),
  t('7/8-Hose', 'unterteile', ['damen.hosen'], 'sommer', 55, ['Baumwolle', 'Viskose', 'Leinen'], ADULT, 1, bild('siebenachtelhose')),
  t('Schlupfhose', 'unterteile', ['damen.hosen', 'damen.gg'], 'ganz', 49, BW, BEST, 1, bild('schlupfhose')),
  (ast('unterteile', 'Röcke'), t('Jerseyrock', 'unterteile', ['damen.hosen'], 'ganz', 45, BW, REIF, 1, bild('jerseyrock'))),
  t('Karo-Faltenrock', 'unterteile', ['damen.hosen'], 'winter', 69, WOLLE, REIF, 2, bild('karofaltenrock')),
  (ast('kleider', 'Kleider'), t('Jerseykleid', 'unterteile', ['damen.kleider'], 'ganz', 69, BW, REIF, 2, bild('jerseykleid'))),
  t('Shirtkleid', 'unterteile', ['damen.kleider'], 'sommer', 49, BW, ADULT, 1, bild('shirtkleid')),
  t('Abendkleid', 'unterteile', ['damen.kleider'], 'ganz', 149, ['Seide', 'Viskose', 'Polyester'], ADULT, 3, bild('abendkleid')),
];
ast('jacken', 'Mäntel');
const JACKEN: T[] = [
  t('Kurzmantel', 'jacken', ['damen.jacken', 'herren.jacken'], 'winter', 159, ['Merino', 'Kaschmir', 'Polyester'], REIF, 3, bild('kurzmantel')),
  t('Cabanjacke', 'jacken', ['herren.jacken', 'damen.jacken'], 'winter', 179, ['Merino', 'Polyester'], ADULT, 3, bild('cabanjacke')),
  (ast('jacken', 'Weitere Jacken'), t('Cape', 'jacken', ['damen.jacken'], 'winter', 99, WOLLE, BEST, 2, bild('cape'))),
];
ast('waesche', 'Nachtwäsche');
const WAESCHE: T[] = [
  t('Morgenmantel', 'waesche', ['waesche.nacht'], 'ganz', 69, ['Seide', 'Viskose', 'Baumwolle'], REIF, 2, bild('morgenmantel')),
  t('Herren-Schlafanzug', 'waesche', ['waesche.nacht', 'waesche.herren'], 'ganz', 49, ['Baumwolle', 'Bio-Baumwolle'], REIF, 1, bild('herrenschlafanzug')),
  (ast('waesche', 'Unterwäsche'), t('Unterkleid', 'waesche', ['waesche.tag'], 'ganz', 39, ['Viskose', 'Seide'], BEST, 1, bild('unterkleid'))),
  t('Minimizer-BH', 'waesche', ['waesche.mieder'], 'ganz', 49, ['Polyester', 'Baumwolle'], REIF, 2, bild('minimizerbh')),
  t('Thermo-Unterhemd', 'waesche', ['waesche.herren', 'waesche.tag'], 'winter', 25, ['Merino', 'Baumwolle'], BEST, 1, bild('thermounterhemd')),
  (ast('waesche', 'Strümpfe'), t('Stützkniestrümpfe', 'waesche', ['waesche.struempfe'], 'ganz', 25, ['Baumwolle', 'Polyester'], BEST, 1, bild('stuetzstruempfe'))),
];
ast('schuhe', 'Komfortschuhe');
const SCHUHE: T[] = [
  t('Komfortschuh', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe'], 'ganz', 99, LEDER, BEST, 2, bild('komfortschuh')),
  t('Pantoffel', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe'], 'winter', 35, ['Merino', 'Leder'], BEST, 1, bild('pantoffel')),
  t('Clog', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe'], 'sommer', 69, LEDER, REIF, 2, bild('clog')),
  (ast('schuhe', 'Halbschuhe'), t('Monk-Schuh', 'schuhe', ['accessoires.herrenschuhe'], 'ganz', 149, LEDER, MITTE, 3, bild('monkschuh'))),
  t('Quastenloafer', 'schuhe', ['accessoires.herrenschuhe', 'accessoires.damenschuhe'], 'ganz', 119, LEDER, REIF, 2, bild('quastenloafer')),
  t('Haferlschuh', 'schuhe', ['accessoires.herrenschuhe'], 'ganz', 139, LEDER, REIF, 3, bild('haferlschuh')),
  (ast('schuhe', 'Sneaker'), t('Slip-on-Sneaker', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe'], 'sommer', 59, ['Baumwolle', 'Leder'], ADULT, 1, bild('slipon'))),
  (ast('schuhe', 'Pumps und Mules'), t('Kitten-Heel-Pumps', 'schuhe', ['accessoires.damenschuhe'], 'ganz', 89, LEDER, MITTE, 2, bild('kittenheel'))),
  (ast('schuhe', 'Sommerschuhe'), t('Keilsandalette', 'schuhe', ['accessoires.damenschuhe'], 'sommer', 69, LEDER, ADULT, 2, bild('keilsandalette'))),
  t('Zehentrenner', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe'], 'sommer', 25, ['Leder', 'Polyester'], ADULT, 1, bild('zehentrenner')),
];
ast('accessoires', 'Brillen und Etuis');
const ACCESSOIRES: T[] = [
  t('Lesebrille', 'accessoires', ['accessoires.schmuck'], 'ganz', 29, NT, BEST, 1, bild('lesebrille')),
  t('Lesebrillenetui', 'accessoires', ['accessoires.lederwaren'], 'ganz', 19, LEDER, BEST, 1, bild('brillenetui')),
  t('Leselupe', 'accessoires', ['accessoires.schmuck'], 'ganz', 25, NT, BEST, 1, bild('leselupe')),
  (ast('accessoires', 'Uhren und Schmuck'), t('Herrenuhr', 'accessoires', ['accessoires.schmuck'], 'ganz', 149, LEDER, MITTE, 3, bild('armbanduhr'))),
  t('Damenuhr', 'accessoires', ['accessoires.schmuck'], 'ganz', 129, LEDER, MITTE, 3, bild('damenuhr')),
  t('Manschettenknöpfe', 'accessoires', ['accessoires.schmuck', 'herren.business'], 'ganz', 49, NT, REIF, 2, bild('manschettenknoepfe')),
  t('Brosche', 'accessoires', ['accessoires.schmuck'], 'ganz', 39, NT, BEST, 2, bild('brosche')),
  t('Perlenkette', 'accessoires', ['accessoires.schmuck'], 'ganz', 79, NT, REIF, 2, bild('perlenkette')),
  (ast('accessoires', 'Hüte und Mützen'), t('Schiebermütze', 'accessoires', ['accessoires.lederwaren', 'herren.casual'], 'winter', 39, ['Merino', 'Leinen'], REIF, 1, bild('schiebermuetze'))),
  t('Filzhut', 'accessoires', ['accessoires.lederwaren'], 'winter', 69, ['Merino'], REIF, 2, bild('filzhut')),
  (ast('accessoires', 'Weitere Accessoires'), t('Hosenträger', 'accessoires', ['accessoires.lederwaren', 'herren.business'], 'ganz', 35, ['Polyester', 'Leder'], REIF, 1, bild('hosentraeger'))),
  t('Gehstock-Schirm', 'accessoires', ['accessoires.lederwaren'], 'ganz', 59, NT, BEST, 2, bild('stockschirm')),
  t('Karoschal', 'accessoires', ['accessoires.lederwaren'], 'winter', 49, ['Merino', 'Kaschmir'], MITTE, 1, bild('karoschal')),
  (ast('accessoires', 'Taschen'), t('Kulturbeutel', 'accessoires', ['accessoires.lederwaren', 'accessoires.reise'], 'ganz', 29, ['Polyester', 'Leder'], MITTE, 1, bild('kulturbeutel'))),
  t('Aktentasche', 'accessoires', ['accessoires.lederwaren', 'herren.business'], 'ganz', 199, LEDER, MITTE, 3, bild('aktentasche')),
  t('Einkaufstrolley', 'accessoires', ['accessoires.reise'], 'ganz', 59, NT, BEST, 2, bild('einkaufstrolley')),
];
ast('home', 'Haushalt und Dekoration');
const HOME: T[] = [
  t('Isolierkanne', 'home', ['wohnen.tisch'], 'ganz', 39, NT, REIF, 1, bild('isolierkanne')),
  t('Kaffeeservice', 'home', ['wohnen.tisch'], 'ganz', 89, NT, BEST, 2, bild('kaffeeservice')),
  t('Brotkorb', 'home', ['wohnen.tisch'], 'ganz', 19, ['Leinen', 'Baumwolle'], MITTE, 1, bild('brotkorb')),
  t('Teelichthalter', 'home', ['wohnen.deko'], 'winter', 15, NT, MITTE, 1, bild('teelicht')),
  t('Teppich', 'home', ['wohnen.heimtextil'], 'ganz', 129, ['Baumwolle', 'Polyester'], MITTE, 2, bild('teppich')),
  (ast('home', 'Bett und Textilien'), t('Sitzkissen', 'home', ['wohnen.heimtextil'], 'ganz', 19, ['Baumwolle', 'Leinen'], REIF, 1, bild('sitzkissen'))),
];
ast('beauty', 'Pflege');
const BEAUTY: T[] = [
  t('Anti-Aging-Creme', 'beauty', ['beauty.pflege'], 'ganz', 39, NT, BEST, 2, bild('antiaging')),
  t('Nachtcreme', 'beauty', ['beauty.pflege'], 'ganz', 29, NT, REIF, 2, bild('nachtcreme')),
  (ast('beauty', 'Haare und Körper'), t('Haarspray', 'beauty', ['beauty.drogerie'], 'ganz', 6, NT, REIF, 1, bild('haarspray'))),
  t('Deospray', 'beauty', ['beauty.drogerie'], 'ganz', 4, NT, MITTE, 1, bild('deospray')),
  (ast('beauty', 'Make-up'), t('Kompaktpuder', 'beauty', ['beauty.pflege'], 'ganz', 19, NT, REIF, 1, bild('kompaktpuder'))),
  t('Make-up-Pinselset', 'beauty', ['beauty.pflege'], 'ganz', 35, NT, ADULT, 2, bild('pinselset')),
  (ast('beauty', 'Duft'), t('Aftershave', 'beauty', ['beauty.parfuem'], 'ganz', 39, NT, REIF, 2, bild('aftershave'))),
];

export const TYPEN: T[] = [...OBERTEILE, ...UNTERTEILE, ...JACKEN, ...WAESCHE, ...SCHUHE, ...ACCESSOIRES, ...HOME, ...BEAUTY];

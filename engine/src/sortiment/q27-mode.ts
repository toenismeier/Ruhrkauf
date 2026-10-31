// Q27: neue Mode-Artikeltypen (Damen, Herren, Kinder, Teens). Nur diese Datei füllen; Haken in ./index.ts, Typen in ./basis.ts.
// NAMEN: alle neuen Typnamen (eindeutig, nicht schon in produkte.ts); TYPEN: je Name ein Eintrag mit bild.
// Bild: Silhouette aus render/src/kit/mode/silhouetten.json (Q25/Q27), Parameter überschreiben deren Standard.
// Zielgruppen über gruppe G(kinder, jung, mitte, reif): jung = Teens und Young Adults, reif = Best Ager.
// Grundsätze: kein Twinset und keine Komforthose für Junge, keine Baggy- oder Cargo-Teile für Best Ager, Kinderartikel nur Kinder.
// WG bewusst nur in Warengruppen, die schon Artikeltypen haben (Grundsortiment beim Start bleibt gleich, Kalibrierung neutral).
import { G, type ArtikelBild, type SortimentTyp } from './basis';
import type { Material, ProduktKategorie, TypSaison, TrendGruppe } from '../produkte';
import type { BaumKategorie } from '../produkt-sortiment';
import type { WgId } from '../einkauf';

export const NAMEN = [
  // Damen
  'Jumpsuit', 'Hosenanzug', 'Puffärmelbluse', 'Off-Shoulder-Top', 'Corsagen-Top', 'Twinset', 'Kimono-Jacke', 'Kaftan',
  'Cropped Cardigan', 'Teddyjacke', 'Poncho', 'Tüllrock', 'Lederrock', 'Paperbag-Hose', 'Badeanzug', 'Bikini', 'Blusenkleid',
  'Maxikleid', 'Satin-Slipdress', 'Etuikleid', 'Sommerkleid', 'Strickkleid', 'Hemdblusenkleid',
  'Schluppenbluse', 'Wickelshirt', 'Trägertop', 'Babytee', 'Marlenehose', 'Komforthose', 'Komfort-Jeans',
  'Wide-Leg-Jeans', 'Mom-Jeans', 'Skinny-Jeans', 'Flare-Jeans', 'Satin-Midirock', 'Wickelrock', 'Stufenrock', 'Steppmantel',
  // Damen und Herren
  'Pullunder', 'Feinstrick-Pullunder', 'Strickweste', 'Steppweste', 'Parka', 'Regenjacke', 'Jeansjacke', 'Lederjacke', 'Bomberjacke',
  'Hoodie', 'Sweatshirt', 'Longsleeve', 'Fieldjacket', 'Funktionsjacke',
  // Herren
  'Anzug', 'Tweed-Sakko', 'Anzugweste', 'Troyer', 'Rugbyshirt', 'Cargo-Shorts', 'Badeshorts', 'Chino-Shorts',
  'Harrington-Jacke', 'Hemdjacke', 'Cord-Overshirt', 'Kurzarmhemd', 'Boxy-Shirt', 'V-Shirt', 'Cordhose',
  'Jogginghose', 'Baggy-Jeans', 'Varsity-Jacke',
  // Kinder
  'Strampler', 'Langarmbody', 'Latzkleid', 'Matschhose', 'Schneeanzug', 'Baby-Schlafsack', 'Leggings-Set', 'Kinder-Badeanzug',
  'Kinder-Kapuzenjacke', 'Kinder-Badeshorts', 'Kinder-Steppjacke', 'Kinder-Jeans', 'Kinder-Hoodie', 'Kinder-Shorts', 'Kinder-Sommerkleid',
  'Kinder-Cargohose', 'Kinder-T-Shirt', 'Kinder-Langarmshirt', 'Kinder-Parka', 'Kinder-Plisseerock',
  // Teens
  'Trainingsjacke', 'Trainingshose', 'Oversize-Hemd', 'Cargorock', 'Minikleid', 'Corsage', 'Plissee-Minirock', 'Crop-Hoodie',
  'Jeans-Minirock', 'Rippen-Tanktop',
] as const;
type Name = (typeof NAMEN)[number];

// Materialgruppen
const BW: Material[] = ['Baumwolle', 'Bio-Baumwolle'];
const BW_P: Material[] = ['Baumwolle', 'Bio-Baumwolle', 'Polyester'];
const FLIESS: Material[] = ['Viskose', 'Seide', 'Polyester', 'Baumwolle'];
const LEICHT: Material[] = ['Viskose', 'Leinen', 'Baumwolle', 'Polyester'];
const STRICK: Material[] = ['Merino', 'Baumwolle', 'Kaschmir', 'Viskose'];
const WOLLE: Material[] = ['Merino', 'Polyester', 'Leinen', 'Kaschmir'];
const DENIM: Material[] = ['Denim', 'Bio-Baumwolle'];
const JACKE: Material[] = ['Polyester', 'Baumwolle'];
const BADE: Material[] = ['Polyester'];

type Pfad = readonly [BaumKategorie, string];
function t(typ: Name, kategorie: ProduktKategorie, wgs: WgId[], saison: TypSaison, preis: number, materialien: Material[], gruppe: Record<TrendGruppe, number>, aufwand: number, bild: ArtikelBild, pfad?: Pfad): SortimentTyp<Name> {
  return { typ, kategorie, wgs, saison, preis, materialien, gruppe, aufwand, bild, ...(pfad ? { pfad } : {}) };
}
const b = (silhouette: string, p: Record<string, string | number | boolean> = {}): ArtikelBild => ({ silhouette, ...p });
const KIND = G(1, 0, 0, 0);
const KLEID: Pfad = ['kleider', 'Kleider'];
const JUMP: Pfad = ['kleider', 'Jumpsuits'];
const SETS: Pfad = ['jacken', 'Anzüge und Sets'];
const WESTEN: Pfad = ['jacken', 'Westen'];
const BADEMODE: Pfad = ['waesche', 'Bademode'];
const BABY: Pfad = ['kinder', 'Baby'];
const KINDER: Pfad = ['kinder', 'Kinderbekleidung'];

export const TYPEN: SortimentTyp<Name>[] = [
  // ─────────── Damen
  t('Jumpsuit', 'unterteile', ['damen.kleider', 'damen.young'], 'sommer', 69, LEICHT, G(0, 0.85, 0.75, 0.35), 2, b('jumpsuit'), JUMP),
  t('Hosenanzug', 'jacken', ['damen.jacken', 'damen.hosen'], 'ganz', 179, WOLLE, G(0, 0.5, 0.9, 0.75), 3, b('hosenanzug'), SETS),
  t('Puffärmelbluse', 'oberteile', ['damen.blusen', 'damen.young'], 'sommer', 39, FLIESS, G(0.1, 0.9, 0.6, 0.25), 1, b('puffaermelbluse')),
  t('Off-Shoulder-Top', 'oberteile', ['damen.young', 'damen.blusen'], 'sommer', 29, LEICHT, G(0, 0.95, 0.45, 0.05), 1, b('offshoulder'), ['oberteile', 'Tops']),
  t('Corsagen-Top', 'oberteile', ['damen.young'], 'ganz', 35, ['Polyester', 'Viskose', 'Seide'], G(0, 0.95, 0.3, 0), 2, b('corsagetop'), ['oberteile', 'Tops']),
  t('Twinset', 'oberteile', ['damen.strick', 'damen.gg'], 'ganz', 89, STRICK, G(0, 0.1, 0.6, 0.95), 2, b('twinset'), ['oberteile', 'Strick']),
  t('Kimono-Jacke', 'jacken', ['damen.blusen', 'damen.young'], 'sommer', 49, FLIESS, G(0, 0.75, 0.75, 0.5), 1, b('kimono'), ['jacken', 'Leichte Jacken']),
  t('Kaftan', 'unterteile', ['damen.kleider', 'damen.gg'], 'sommer', 59, FLIESS, G(0, 0.35, 0.7, 0.85), 1, b('kimono', { laenge: 'lang' }), ['kleider', 'Kaftane und Tuniken']),
  t('Cropped Cardigan', 'oberteile', ['damen.strick', 'damen.young'], 'ganz', 45, STRICK, G(0, 0.95, 0.55, 0.15), 1, b('croppedcardigan'), ['oberteile', 'Cardigans und Strickjacken']),
  t('Teddyjacke', 'jacken', ['damen.jacken', 'damen.young', 'herren.jacken'], 'winter', 89, JACKE, G(0.3, 0.95, 0.6, 0.2), 2, b('teddyjacke')),
  t('Poncho', 'jacken', ['damen.strick', 'damen.gg'], 'winter', 59, STRICK, G(0, 0.35, 0.7, 0.85), 1, b('poncho'), ['jacken', 'Ponchos und Capes']),
  t('Tüllrock', 'unterteile', ['damen.hosen', 'damen.young'], 'ganz', 49, ['Polyester'], G(0, 0.85, 0.6, 0.25), 2, b('tuellrock')),
  t('Lederrock', 'unterteile', ['damen.hosen', 'damen.young'], 'ganz', 79, ['Leder', 'Polyester'], G(0, 0.85, 0.7, 0.3), 2, b('lederrock')),
  t('Paperbag-Hose', 'unterteile', ['damen.hosen'], 'sommer', 55, LEICHT, G(0, 0.7, 0.85, 0.55), 1, b('paperbaghose'), ['unterteile', 'Stoffhosen']),
  t('Badeanzug', 'waesche', ['waesche.tag'], 'sommer', 49, BADE, G(0, 0.6, 0.85, 0.95), 2, b('badeanzug'), BADEMODE),
  t('Bikini', 'waesche', ['waesche.tag', 'damen.young'], 'sommer', 39, BADE, G(0, 0.95, 0.7, 0.2), 2, b('bikini'), BADEMODE),
  t('Blusenkleid', 'unterteile', ['damen.kleider'], 'ganz', 69, FLIESS, G(0, 0.55, 0.85, 0.8), 2, b('blusenkleid'), KLEID),
  t('Maxikleid', 'unterteile', ['damen.kleider', 'damen.young'], 'sommer', 69, LEICHT, G(0, 0.85, 0.75, 0.4), 2, b('maxikleid'), KLEID),
  t('Satin-Slipdress', 'unterteile', ['damen.kleider', 'damen.young'], 'ganz', 59, ['Viskose', 'Seide', 'Polyester'], G(0, 0.9, 0.6, 0.15), 2, b('slipdress'), KLEID),
  t('Etuikleid', 'unterteile', ['damen.kleider'], 'ganz', 79, WOLLE, G(0, 0.4, 0.9, 0.75), 2, b('etuikleid'), KLEID),
  t('Sommerkleid', 'unterteile', ['damen.kleider', 'damen.young'], 'sommer', 49, LEICHT, G(0.1, 0.9, 0.7, 0.4), 1, b('sommerkleid'), KLEID),
  t('Strickkleid', 'unterteile', ['damen.kleider', 'damen.strick'], 'winter', 69, STRICK, G(0, 0.6, 0.8, 0.75), 2, b('strickkleid'), KLEID),
  t('Hemdblusenkleid', 'unterteile', ['damen.kleider'], 'ganz', 65, LEICHT, G(0, 0.5, 0.85, 0.85), 2, b('hemdblusenkleid'), KLEID),
  t('Schluppenbluse', 'oberteile', ['damen.blusen', 'damen.gg'], 'ganz', 49, FLIESS, G(0, 0.3, 0.85, 0.9), 1, b('schluppenbluse')),
  t('Wickelshirt', 'oberteile', ['damen.blusen'], 'ganz', 35, FLIESS, G(0, 0.6, 0.85, 0.7), 1, b('wickelshirt'), ['oberteile', 'Shirts']),
  t('Trägertop', 'oberteile', ['damen.blusen', 'damen.young'], 'sommer', 25, FLIESS, G(0, 0.9, 0.7, 0.3), 1, b('traegertop'), ['oberteile', 'Tops']),
  t('Babytee', 'oberteile', ['damen.young'], 'sommer', 19, BW, G(0.2, 1, 0.3, 0), 1, b('b01babytee'), ['oberteile', 'Shirts']),
  t('Marlenehose', 'unterteile', ['damen.hosen', 'damen.gg'], 'ganz', 69, WOLLE, G(0, 0.4, 0.85, 0.9), 1, b('marlenehose'), ['unterteile', 'Stoffhosen']),
  t('Komforthose', 'unterteile', ['damen.hosen', 'damen.gg'], 'ganz', 49, BW_P, G(0, 0, 0.4, 1), 1, b('komforthose'), ['unterteile', 'Stoffhosen']),
  t('Komfort-Jeans', 'unterteile', ['damen.denim', 'damen.gg'], 'ganz', 59, DENIM, G(0, 0, 0.5, 1), 1, b('jeans', { komfortbund: true }), ['unterteile', 'Jeans und Denim']),
  t('Wide-Leg-Jeans', 'unterteile', ['damen.denim', 'damen.young'], 'ganz', 65, DENIM, G(0, 0.95, 0.7, 0.2), 2, b('widelegjeans')),
  t('Mom-Jeans', 'unterteile', ['damen.denim', 'damen.young'], 'ganz', 59, DENIM, G(0, 0.95, 0.55, 0.1), 2, b('momjeans')),
  t('Skinny-Jeans', 'unterteile', ['damen.denim', 'herren.casual'], 'ganz', 55, DENIM, G(0.3, 0.6, 0.7, 0.5), 2, b('skinnyjeans')),
  t('Flare-Jeans', 'unterteile', ['damen.denim', 'damen.young'], 'ganz', 65, DENIM, G(0, 0.85, 0.6, 0.25), 2, b('flarejeans')),
  t('Satin-Midirock', 'unterteile', ['damen.hosen'], 'ganz', 55, ['Viskose', 'Seide', 'Polyester'], G(0, 0.75, 0.8, 0.55), 1, b('midirock')),
  t('Wickelrock', 'unterteile', ['damen.hosen'], 'sommer', 49, LEICHT, G(0, 0.5, 0.8, 0.7), 1, b('wickelrock')),
  t('Stufenrock', 'unterteile', ['damen.hosen', 'damen.young'], 'sommer', 49, LEICHT, G(0, 0.8, 0.65, 0.4), 1, b('stufenrock')),
  t('Steppmantel', 'jacken', ['damen.jacken'], 'winter', 149, JACKE, G(0, 0.4, 0.8, 0.95), 3, b('steppjacke', { laenge: 'mantel' }), ['jacken', 'Mäntel']),
  // ─────────── Damen und Herren
  t('Pullunder', 'oberteile', ['herren.strick', 'damen.strick'], 'ganz', 49, STRICK, G(0.2, 0.75, 0.6, 0.55), 1, b('pullunder'), ['oberteile', 'Strick']),
  t('Feinstrick-Pullunder', 'oberteile', ['herren.strick', 'damen.strick'], 'ganz', 55, STRICK, G(0, 0.5, 0.75, 0.8), 1, b('pullunder', { muster: 'uni' }), ['oberteile', 'Strick']),
  t('Strickweste', 'oberteile', ['damen.strick', 'herren.strick'], 'winter', 59, STRICK, G(0, 0.4, 0.7, 0.85), 1, b('strickweste'), WESTEN),
  t('Steppweste', 'jacken', ['damen.jacken', 'herren.jacken'], 'winter', 69, JACKE, G(0.3, 0.75, 0.85, 0.75), 2, b('steppweste'), WESTEN),
  t('Parka', 'jacken', ['damen.jacken', 'herren.jacken'], 'winter', 159, JACKE, G(0, 0.75, 0.85, 0.7), 3, b('parka')),
  t('Regenjacke', 'jacken', ['damen.jacken', 'herren.jacken', 'outdoor.bekleidung'], 'ganz', 89, ['Polyester'], G(0, 0.6, 0.8, 0.85), 2, b('regenjacke')),
  t('Jeansjacke', 'jacken', ['damen.denim', 'herren.casual', 'damen.young'], 'ganz', 69, DENIM, G(0.4, 0.9, 0.7, 0.35), 2, b('jeansjacke')),
  t('Lederjacke', 'jacken', ['damen.jacken', 'herren.jacken', 'damen.young'], 'ganz', 199, ['Leder', 'Polyester'], G(0, 0.85, 0.75, 0.4), 3, b('lederjacke')),
  t('Bomberjacke', 'jacken', ['herren.jacken', 'damen.young', 'herren.casual'], 'ganz', 79, JACKE, G(0.2, 0.95, 0.55, 0.1), 2, b('bomberjacke')),
  t('Hoodie', 'oberteile', ['herren.strick', 'damen.young', 'sporttextil.freizeit'], 'ganz', 45, BW_P, G(0.5, 1, 0.5, 0.15), 1, b('hoodie'), ['oberteile', 'Pullover und Sweatshirts']),
  t('Sweatshirt', 'oberteile', ['herren.strick', 'damen.young', 'sporttextil.freizeit'], 'ganz', 39, BW_P, G(0.5, 0.9, 0.6, 0.35), 1, b('sweatshirt'), ['oberteile', 'Pullover und Sweatshirts']),
  t('Longsleeve', 'oberteile', ['damen.blusen', 'herren.casual'], 'ganz', 25, BW, G(0.4, 0.85, 0.75, 0.5), 1, b('longsleeve'), ['oberteile', 'Shirts']),
  t('Fieldjacket', 'jacken', ['herren.jacken', 'damen.jacken'], 'ganz', 119, ['Baumwolle', 'Polyester'], G(0, 0.7, 0.85, 0.6), 2, b('fieldjacket')),
  t('Funktionsjacke', 'jacken', ['herren.jacken', 'damen.jacken', 'outdoor.bekleidung'], 'ganz', 129, ['Polyester'], G(0, 0.55, 0.85, 0.85), 3, b('funktionsjacke')),
  // ─────────── Herren
  t('Anzug', 'jacken', ['herren.business'], 'ganz', 249, WOLLE, G(0, 0.55, 0.9, 0.85), 3, b('anzug'), SETS),
  t('Tweed-Sakko', 'jacken', ['herren.business', 'herren.jacken'], 'winter', 149, WOLLE, G(0, 0.45, 0.85, 0.9), 3, b('sakko')),
  t('Anzugweste', 'jacken', ['herren.business'], 'ganz', 69, WOLLE, G(0, 0.55, 0.75, 0.65), 2, b('anzugweste'), WESTEN),
  t('Troyer', 'oberteile', ['herren.strick'], 'winter', 69, STRICK, G(0.1, 0.55, 0.85, 0.85), 1, b('troyer'), ['oberteile', 'Strick']),
  t('Rugbyshirt', 'oberteile', ['herren.casual'], 'ganz', 49, BW, G(0.3, 0.85, 0.7, 0.45), 1, b('rugbyshirt'), ['oberteile', 'Polos']),
  t('Cargo-Shorts', 'unterteile', ['herren.casual'], 'sommer', 39, BW, G(0.5, 0.9, 0.6, 0.15), 1, b('cargoshorts'), ['unterteile', 'Shorts']),
  t('Badeshorts', 'waesche', ['waesche.herren'], 'sommer', 29, BADE, G(0, 0.85, 0.85, 0.7), 1, b('badeshorts'), BADEMODE),
  t('Chino-Shorts', 'unterteile', ['herren.casual', 'herren.hosen'], 'sommer', 39, BW, G(0.3, 0.7, 0.85, 0.75), 1, b('chinoshorts'), ['unterteile', 'Shorts']),
  t('Harrington-Jacke', 'jacken', ['herren.jacken'], 'ganz', 99, ['Baumwolle', 'Polyester'], G(0, 0.6, 0.85, 0.8), 2, b('harringtonjacke')),
  t('Hemdjacke', 'jacken', ['herren.casual', 'herren.jacken'], 'winter', 69, ['Merino', 'Baumwolle', 'Polyester'], G(0, 0.85, 0.75, 0.45), 1, b('hemdjacke')),
  t('Cord-Overshirt', 'jacken', ['herren.casual'], 'winter', 65, BW, G(0, 0.8, 0.8, 0.5), 1, b('overshirt')),
  t('Kurzarmhemd', 'oberteile', ['herren.hemden', 'herren.casual'], 'sommer', 39, ['Baumwolle', 'Leinen', 'Viskose'], G(0.2, 0.75, 0.8, 0.7), 1, b('kurzarmhemd')),
  t('Boxy-Shirt', 'oberteile', ['herren.casual', 'damen.young'], 'sommer', 25, BW, G(0.2, 1, 0.4, 0.05), 1, b('boxytee'), ['oberteile', 'Shirts']),
  t('V-Shirt', 'oberteile', ['herren.casual', 'damen.blusen'], 'sommer', 19, BW, G(0.2, 0.6, 0.85, 0.8), 1, b('vshirt'), ['oberteile', 'Shirts']),
  t('Cordhose', 'unterteile', ['herren.hosen', 'damen.hosen'], 'winter', 69, BW, G(0.3, 0.6, 0.8, 0.8), 1, b('cordhose')),
  t('Jogginghose', 'unterteile', ['herren.casual', 'sporttextil.freizeit', 'damen.young'], 'ganz', 35, BW_P, G(0.6, 0.9, 0.6, 0.35), 1, b('jogginghose')),
  t('Baggy-Jeans', 'unterteile', ['herren.casual', 'damen.young'], 'ganz', 65, DENIM, G(0.3, 1, 0.2, 0), 2, b('baggyjeans')),
  t('Varsity-Jacke', 'jacken', ['herren.casual', 'damen.young'], 'ganz', 89, ['Merino', 'Polyester', 'Leder'], G(0.4, 0.95, 0.3, 0.05), 2, b('varsityjacke')),
  // ─────────── Kinder
  t('Strampler', 'kinder', ['kinder.baby'], 'ganz', 19, BW, KIND, 1, b('strampler'), BABY),
  t('Langarmbody', 'kinder', ['kinder.baby'], 'ganz', 12, BW, KIND, 1, b('langarmbody'), ['kinder', 'Bodys']),
  t('Latzkleid', 'kinder', ['kinder.maedchen'], 'ganz', 29, ['Baumwolle', 'Bio-Baumwolle', 'Denim'], KIND, 1, b('latzkleid'), KINDER),
  t('Matschhose', 'kinder', ['kinder.jungen', 'kinder.maedchen'], 'ganz', 35, ['Polyester'], KIND, 1, b('matschhose'), ['kinder', 'Matsch und Regen']),
  t('Schneeanzug', 'kinder', ['kinder.baby', 'kinder.jungen', 'kinder.maedchen'], 'winter', 59, ['Polyester'], KIND, 2, b('schneeanzug'), ['kinder', 'Winter']),
  t('Baby-Schlafsack', 'kinder', ['kinder.baby'], 'ganz', 39, BW, KIND, 1, b('schlafsack'), BABY),
  t('Leggings-Set', 'kinder', ['kinder.maedchen'], 'ganz', 25, BW, KIND, 1, b('leggingsset'), KINDER),
  t('Kinder-Badeanzug', 'kinder', ['kinder.maedchen'], 'sommer', 19, BADE, KIND, 1, b('kinderbadeanzug'), ['kinder', 'Bademode']),
  t('Kinder-Kapuzenjacke', 'kinder', ['kinder.jungen', 'kinder.maedchen'], 'ganz', 29, BW, KIND, 1, b('kapuzenjacke'), KINDER),
  t('Kinder-Badeshorts', 'kinder', ['kinder.jungen'], 'sommer', 15, BADE, KIND, 1, b('badeshorts', { muster: 'punkte' }), ['kinder', 'Bademode']),
  t('Kinder-Steppjacke', 'kinder', ['kinder.jungen', 'kinder.maedchen'], 'winter', 49, ['Polyester'], KIND, 2, b('steppjacke'), ['kinder', 'Winter']),
  t('Kinder-Jeans', 'kinder', ['kinder.jungen', 'kinder.maedchen'], 'ganz', 29, DENIM, KIND, 1, b('jeans'), KINDER),
  t('Kinder-Hoodie', 'kinder', ['kinder.jungen', 'kinder.maedchen'], 'ganz', 25, BW, KIND, 1, b('hoodie', { muster: 'streifen' }), KINDER),
  t('Kinder-Shorts', 'kinder', ['kinder.jungen', 'kinder.maedchen'], 'sommer', 15, BW, KIND, 1, b('shorts'), KINDER),
  t('Kinder-Sommerkleid', 'kinder', ['kinder.maedchen'], 'sommer', 25, BW, KIND, 1, b('sommerkleid', { muster: 'blumen' }), KINDER),
  t('Kinder-Cargohose', 'kinder', ['kinder.jungen'], 'ganz', 29, BW, KIND, 1, b('cargohose'), KINDER),
  t('Kinder-T-Shirt', 'kinder', ['kinder.jungen', 'kinder.maedchen'], 'sommer', 9, BW, KIND, 1, b('tshirt', { muster: 'streifen' }), KINDER),
  t('Kinder-Langarmshirt', 'kinder', ['kinder.jungen', 'kinder.maedchen'], 'ganz', 12, BW, KIND, 1, b('longsleeve'), KINDER),
  t('Kinder-Parka', 'kinder', ['kinder.jungen', 'kinder.maedchen'], 'winter', 69, ['Polyester', 'Baumwolle'], KIND, 2, b('parka'), ['kinder', 'Winter']),
  t('Kinder-Plisseerock', 'kinder', ['kinder.maedchen'], 'ganz', 19, ['Polyester'], KIND, 1, b('plisseeminirock'), KINDER),
  // ─────────── Teens (jung hoch, reif nie)
  t('Trainingsjacke', 'jacken', ['sporttextil.freizeit', 'herren.casual', 'damen.young'], 'ganz', 49, ['Polyester'], G(0.4, 1, 0.3, 0.05), 1, b('trackjacket')),
  t('Trainingshose', 'unterteile', ['sporttextil.freizeit', 'herren.casual', 'damen.young'], 'ganz', 39, ['Polyester'], G(0.4, 1, 0.3, 0.05), 1, b('trackpants')),
  t('Oversize-Hemd', 'oberteile', ['damen.young', 'herren.casual'], 'ganz', 45, BW, G(0.2, 1, 0.4, 0.05), 1, b('oversizehemd')),
  t('Cargorock', 'unterteile', ['damen.young'], 'ganz', 45, BW, G(0.1, 1, 0.35, 0), 1, b('cargorock')),
  t('Minikleid', 'unterteile', ['damen.young'], 'ganz', 39, ['Viskose', 'Polyester', 'Baumwolle'], G(0, 1, 0.3, 0), 1, b('minikleid'), KLEID),
  t('Corsage', 'oberteile', ['damen.young'], 'ganz', 35, ['Baumwolle', 'Polyester'], G(0, 1, 0.2, 0), 2, b('corsage'), ['oberteile', 'Tops']),
  t('Plissee-Minirock', 'unterteile', ['damen.young'], 'ganz', 35, ['Polyester'], G(0.3, 1, 0.3, 0), 1, b('plisseeminirock')),
  t('Crop-Hoodie', 'oberteile', ['damen.young', 'sporttextil.freizeit'], 'ganz', 35, BW_P, G(0.2, 1, 0.2, 0), 1, b('hoodie', { laenge: 'crop' }), ['oberteile', 'Pullover und Sweatshirts']),
  t('Jeans-Minirock', 'unterteile', ['damen.young', 'damen.denim'], 'ganz', 39, DENIM, G(0.2, 1, 0.4, 0.05), 1, b('minirock')),
  t('Rippen-Tanktop', 'oberteile', ['damen.young'], 'sommer', 15, BW, G(0.2, 1, 0.5, 0.1), 1, b('top'), ['oberteile', 'Tops']),
];

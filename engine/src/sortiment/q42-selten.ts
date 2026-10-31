// Q42: seltene Typen aus dem Referenzsortiment (auftraege/wurf4/daten/q42-typen.csv, 83 Typen unter 3 Artikeln, von Ummo am 25.10.2026
// freigegeben; die 13 Typen unter „Draußen“ in auftraege/wurf4/q42-seltene-typen.md sind nicht angelegt).
// Bild: Silhouette aus den Bildpaketen B22 bis B30 (render/src/kit/mode/b22-zuordnung.json bis b30-zuordnung.json) über BILD_WURF4;
// Korsagenbluse und Tabi-Sneaker stehen in BILD_REST und bleiben bildOffen mit der Ersatz-Silhouette (Nachlauf).
// Zielgruppen: Teens und Young Adults ausdrücklich über Q33_ZUORDNUNG (Spalte zielgruppen), Adults über mitte ≥ 0,4 aus dem
// Adults-Anteil der Referenz, Best Ager und Kinder nie (reif < 0,4). Preis (mitte) am Preismedian, Warenhaus-Eigenmarke leicht darüber.
// Nur Auswahl, nicht im Startsortiment, nur WGs mit vorhandenen Artikeltypen (Kalibrierung neutral); BHs zusätzlich in Tagwäsche,
// weil Miederwaren nicht eigenmarkenfähig sind. Anlass-Typen tragen `anlass`
// (daten/anlass-zuordnung.csv) und stehen damit zusätzlich im Ast Anlass (Q37). Materialien der Engine: Kunstleder/Kunstfell/Nylon →
// Polyester, Cord → Baumwolle, Metall und Kosmetik wie die vorhandenen Schmuck- und Beautytypen → Polyester.
import { G, type SortimentTyp } from './basis';
import { bildWurf4 } from './bilder-wurf4';
import type { Material, ProduktKategorie, TypSaison, TrendGruppe } from '../produkte';
import type { BaumKategorie } from '../produkt-sortiment';
import type { WgId } from '../einkauf';
import type { AnlassId } from '../anlass';
import { Q33_ZUORDNUNG } from './q33-zielgruppen';

type Z = 'teens' | 'young';
type Pfad = readonly [BaumKategorie, string];
type T = SortimentTyp<string>;

const TY: Z[] = ['teens', 'young'], Y: Z[] = ['young'];
/** Gewicht aus der Referenz: mit Adults mitte 0,45 + 0,45 × Adults-Anteil, sonst 0,3; reif immer unter 0,4 (keine Best Ager). */
const g = (adults: number | null, jung = 1): Record<TrendGruppe, number> =>
  G(0, jung, adults === null ? 0.3 : Math.round((0.45 + 0.45 * adults) * 100) / 100, adults !== null && adults >= 0.75 ? 0.3 : 0.15);
const A1 = g(1), A05 = g(0.5), OHNE = g(null);

// Materialien
const PE: Material[] = ['Polyester'];
const KL: Material[] = ['Polyester', 'Leder'];
const BW: Material[] = ['Baumwolle', 'Bio-Baumwolle'];
const JERSEY: Material[] = ['Baumwolle', 'Bio-Baumwolle', 'Viskose'];
const FLIESS: Material[] = ['Viskose', 'Polyester', 'Seide'];
const STRICK: Material[] = ['Baumwolle', 'Merino', 'Viskose'];
const DENIM: Material[] = ['Denim', 'Bio-Baumwolle'];
const SATIN: Material[] = ['Polyester', 'Seide', 'Viskose'];

// WG-Bündel (Damen jung mit Mädchen-WG wie Q38/Q39, Herren jung mit Jungen-WG)
const LW: WgId = 'accessoires.lederwaren', SM: WgId = 'accessoires.schmuck';
const ACC: WgId[] = [LW, 'damen.young'], ACC_U: WgId[] = [LW, 'damen.young', 'herren.casual'];
const BADE: WgId[] = ['waesche.tag', 'damen.young', 'kinder.maedchen'];
const MAKEUP: WgId[] = ['beauty.pflege', 'beauty.drogerie'];
const D_BL: WgId[] = ['damen.young', 'damen.blusen', 'kinder.maedchen'];
const D_ST: WgId[] = ['damen.young', 'damen.strick', 'kinder.maedchen'];
const H_ST: WgId[] = ['herren.strick', 'herren.casual', 'kinder.jungen'];
const H_HE: WgId[] = ['herren.hemden', 'herren.casual', 'kinder.jungen'];
const D_HO: WgId[] = ['damen.young', 'damen.hosen', 'kinder.maedchen'];
const D_DE: WgId[] = ['damen.young', 'damen.denim', 'kinder.maedchen'];
const U_DE: WgId[] = ['damen.denim', 'herren.casual', 'damen.young', 'kinder.maedchen', 'kinder.jungen'];
const D_KL: WgId[] = ['damen.kleider', 'damen.young', 'kinder.maedchen'];
const D_JA: WgId[] = ['damen.jacken', 'damen.young', 'kinder.maedchen'];
const U_JA: WgId[] = ['herren.jacken', 'damen.jacken', 'kinder.jungen', 'kinder.maedchen'];
const DS: WgId[] = ['accessoires.damenschuhe'], US: WgId[] = ['accessoires.damenschuhe', 'accessoires.herrenschuhe'];

const P = {
  hut: ['accessoires', 'Mützen und Hüte'] as Pfad, haar: ['accessoires', 'Haarschmuck'] as Pfad, wei: ['accessoires', 'Weitere Accessoires'] as Pfad,
  brille: ['accessoires', 'Brillen und Etuis'] as Pfad, schmuck: ['accessoires', 'Schmuck'] as Pfad, taschen: ['accessoires', 'Taschen'] as Pfad,
  bade: ['waesche', 'Bademode'] as Pfad, bh: ['waesche', 'BHs'] as Pfad, unter: ['waesche', 'Unterwäsche'] as Pfad, nacht: ['waesche', 'Nachtwäsche'] as Pfad,
  struempfe: ['waesche', 'Strümpfe'] as Pfad, makeup: ['beauty', 'Make-up'] as Pfad, duft: ['beauty', 'Duft'] as Pfad,
  blusen: ['oberteile', 'Blusen'] as Pfad, hemden: ['oberteile', 'Hemden'] as Pfad, cardigan: ['oberteile', 'Cardigans und Strickjacken'] as Pfad,
  strick: ['oberteile', 'Strick'] as Pfad, pulli: ['oberteile', 'Pullover und Sweatshirts'] as Pfad, shirts: ['oberteile', 'Shirts'] as Pfad,
  hosen: ['unterteile', 'Hosen'] as Pfad, stoffhosen: ['unterteile', 'Stoffhosen'] as Pfad, leggings: ['unterteile', 'Leggings'] as Pfad,
  jeans: ['unterteile', 'Jeans und Denim'] as Pfad, shorts: ['unterteile', 'Shorts'] as Pfad, rock: ['unterteile', 'Röcke'] as Pfad,
  kleid: ['kleider', 'Kleider'] as Pfad, jumpsuit: ['kleider', 'Jumpsuits'] as Pfad,
  jacken: ['jacken', 'Jacken'] as Pfad, maentel: ['jacken', 'Mäntel'] as Pfad, westen: ['jacken', 'Westen'] as Pfad,
  sneaker: ['schuhe', 'Sneaker'] as Pfad, stiefel: ['schuhe', 'Stiefel und Boots'] as Pfad, sommer: ['schuhe', 'Sommerschuhe'] as Pfad,
  pumps: ['schuhe', 'Pumps und Mules'] as Pfad, halb: ['schuhe', 'Halbschuhe'] as Pfad,
};

/** Anlass laut daten/anlass-zuordnung.csv (Unterkategorie im Ast Anlass). */
const ANLASS: Readonly<Record<string, readonly AnlassId[]>> = {
  Ballkleid: ['abiball', 'tanzschulball'], Brautkleid: ['braut'], Corsagenkleid: ['konfirmation', 'feier'], Blazerkleid: ['tanzschulball', 'konfirmation'],
  'Plateau-Pumps': ['abiball', 'tanzschulball', 'feier'], 'Plateau-Sandalette': ['abiball', 'tanzschulball', 'feier'],
  Trachtenjacke: ['tracht'], Trachtenhemd: ['tracht'], Trachtenlederhose: ['tracht'],
  'Pillbox-Hut': ['zubehoer'], Kopfschmuck: ['zubehoer'], 'Lange Handschuhe': ['zubehoer'], Muscheltasche: ['zubehoer'],
};

const L: { t: T; zg: Z[] }[] = [];
/** platzhalter: vorhandene Ersatz-Silhouette, nur sichtbar, solange der Typ in BILD_REST steht. */
const t = (typ: string, kategorie: ProduktKategorie, wgs: WgId[], saison: TypSaison, preis: number, materialien: Material[],
  gruppe: Record<TrendGruppe, number>, aufwand: number, platzhalter: string, pfad: Pfad, zg: Z[] = TY): void => {
  const anlass = ANLASS[typ];
  L.push({ t: { typ, kategorie, wgs, saison, preis, materialien: [...materialien], gruppe, aufwand, ...bildWurf4(typ, platzhalter), pfad, ...(anlass ? { anlass } : {}) }, zg });
};

// Referenz: Preismedian in Klammern
// ───────────── Accessoire
t('Cowboyhut', 'accessoires', ACC, 'sommer', 27, PE, OHNE, 1, 'filzhut', P.hut);                         // 24,99
t('Fellmütze', 'accessoires', ACC, 'winter', 16, PE, A05, 1, 'muetze', P.hut);                           // 13,99
t('Kapitänsmütze', 'accessoires', ACC, 'ganz', 19, ['Merino', 'Polyester'], A1, 1, 'schiebermuetze', P.hut); // 16,99
t('Kopfschmuck', 'accessoires', [SM, 'damen.young'], 'ganz', 24, PE, A1, 1, 'haarreif', P.haar);       // 21,49
t('Lange Handschuhe', 'accessoires', ACC, 'ganz', 22, KL, A1, 1, 'handschuhe', P.wei);                  // 19,99
t('Bonnet', 'accessoires', ACC, 'winter', 25, STRICK, OHNE, 1, 'beanie', P.hut);                        // 22,99
t('Hosenkette', 'accessoires', [SM, 'damen.young'], 'ganz', 15, PE, OHNE, 1, 'halskette', P.schmuck);  // 12,99
t('Modebrille', 'accessoires', [SM, LW], 'ganz', 18, PE, OHNE, 1, 'lesebrille', P.brille);             // 15,99
t('Pillbox-Hut', 'accessoires', ACC, 'ganz', 22, ['Merino', 'Polyester'], A1, 2, 'filzhut', P.hut);     // 19,99
t('Strickkapuze', 'accessoires', ACC, 'winter', 25, STRICK, OHNE, 1, 'beanie', P.hut);                  // 22,99
// ───────────── Bademode
t('Balconette-Bikinioberteil', 'waesche', BADE, 'sommer', 20, PE, A1, 1, 'bikini', P.bade);             // 17,99
t('Bralette-Bikinioberteil', 'waesche', BADE, 'sommer', 20, PE, OHNE, 1, 'bikini', P.bade);             // 17,99
t('Tanga-Bikinislip', 'waesche', BADE, 'sommer', 18, PE, A1, 1, 'bikini', P.bade);                      // 15,99
t('Bandeau-Bikinioberteil', 'waesche', BADE, 'sommer', 20, PE, OHNE, 1, 'bikini', P.bade);              // 17,99
t('Boardshorts', 'waesche', ['waesche.herren', 'herren.casual', 'kinder.jungen'], 'sommer', 49, PE, OHNE, 1, 'badeshorts', P.bade); // 45,99
t('High-Leg-Bikinislip', 'waesche', BADE, 'sommer', 28, PE, A1, 1, 'bikini', P.bade);                   // 25,99
// ───────────── Beauty
t('Duft-Geschenkset', 'beauty', ['beauty.parfuem', 'beauty.drogerie'], 'ganz', 22, PE, A1, 1, 'parfum', P.duft); // 19,49
t('Lip Tint', 'beauty', MAKEUP, 'ganz', 12, PE, A1, 1, 'lippenstift', P.makeup);                         // 9,99
t('Eyeliner', 'beauty', MAKEUP, 'ganz', 15, PE, A1, 1, 'mascara', P.makeup);                             // 12,99
t('Highlighter', 'beauty', MAKEUP, 'ganz', 12, PE, A1, 1, 'kompaktpuder', P.makeup);                     // 9,99
// ───────────── Blazer
t('Trachtenjacke', 'jacken', ['damen.jacken', 'damen.young', 'kinder.maedchen'], 'ganz', 45, PE, A1, 2, 'cabanjacke', P.jacken); // 39,99
// ───────────── Bluse
t('Blusenbody', 'oberteile', D_BL, 'ganz', 21, SATIN, A1, 2, 'bluse', P.blusen);                         // 18,49
t('Jeansbluse', 'oberteile', ['damen.young', 'damen.blusen', 'damen.denim', 'kinder.maedchen'], 'ganz', 28, DENIM, OHNE, 2, 'bluse', P.blusen); // 24,99
t('Milkmaid-Bluse', 'oberteile', D_BL, 'sommer', 18, FLIESS, OHNE, 2, 'puffaermelbluse', P.blusen);     // 15,99
t('Off-Shoulder-Bluse', 'oberteile', D_BL, 'sommer', 19, FLIESS, OHNE, 2, 'offshoulder', P.blusen);     // 16,99
// ───────────── Cardigan
t('Kapuzen-Strickjacke', 'oberteile', D_ST, 'winter', 47, STRICK, OHNE, 2, 'strickjacke', P.cardigan);  // 42,99
t('Varsity-Cardigan', 'oberteile', H_ST, 'winter', 45, STRICK, OHNE, 2, 'strickjacke', P.cardigan);      // 40,99
t('Strick-Bomberjacke', 'oberteile', H_ST, 'winter', 55, STRICK, OHNE, 2, 'zipstrickjacke', P.cardigan); // 49,99
// ───────────── Hemd
t('Korsagenbluse', 'oberteile', D_BL, 'ganz', 24, ['Baumwolle', 'Polyester', 'Viskose'], A05, 2, 'corsagetop', P.blusen); // 21,49
t('Leinenhemd', 'oberteile', H_HE, 'sommer', 36, ['Leinen', 'Baumwolle'], A1, 1, 'kurzarmhemd', P.hemden); // 32,99
t('Strickhemd', 'oberteile', H_ST, 'sommer', 39, STRICK, A05, 2, 'kurzarmhemd', P.hemden);               // 35,99
t('Cordhemd', 'oberteile', H_HE, 'winter', 39, BW, A1, 1, 'oversizehemd', P.hemden);                     // 35,99
t('Trachtenhemd', 'oberteile', H_HE, 'ganz', 22, ['Leinen', 'Baumwolle'], A1, 1, 'hemd', P.hemden);     // 19,99
// ───────────── Hoodie
t('Jogginganzug', 'oberteile', ['herren.casual', 'damen.young', 'kinder.jungen'], 'ganz', 58, ['Baumwolle', 'Bio-Baumwolle', 'Polyester'], A1, 2, 'hoodie', P.pulli); // 52,99
// ───────────── Hose
t('Sarong-Hose', 'unterteile', D_HO, 'sommer', 29, ['Viskose', 'Leinen'], A1, 1, 'marlenehose', P.hosen);  // 25,99
t('Kunstleder-Leggings', 'unterteile', D_HO, 'ganz', 22, PE, A1, 1, 'leggings', P.leggings);              // 19,99
t('Plisseehose', 'unterteile', D_HO, 'ganz', 22, ['Polyester', 'Viskose'], A1, 1, 'marlenehose', P.stoffhosen); // 19,99
t('Zigarettenhose', 'unterteile', D_HO, 'ganz', 29, ['Polyester', 'Viskose'], A1, 1, 'stoffhose', P.stoffhosen); // 25,99
// ───────────── Jacke
t('Anorak', 'jacken', U_JA, 'ganz', 45, PE, A1, 2, 't_windbreaker', P.jacken);                              // 40,99
t('Wachsjacke', 'jacken', D_JA, 'ganz', 75, ['Baumwolle', 'Polyester'], A1, 2, 'fieldjacket', P.jacken);   // 67,99
// ───────────── Jeans
t('Carpenter-Jeans', 'unterteile', U_DE, 'ganz', 45, DENIM, A05, 2, 'widelegjeans', P.jeans);            // 39,99
t('Boyfriend-Jeans', 'unterteile', D_DE, 'ganz', 45, DENIM, OHNE, 2, 'baggyjeans', P.jeans);              // 39,99
t('Denim-Jogger', 'unterteile', ['herren.casual', 'damen.denim', 'kinder.jungen'], 'ganz', 33, DENIM, OHNE, 1, 'jeans', P.jeans); // 29,99
t('Karottenjeans', 'unterteile', D_DE, 'ganz', 33, DENIM, A1, 2, 'momjeans', P.jeans);                    // 29,99
// ───────────── Jumpsuit
t('Latzshorts', 'unterteile', D_DE, 'sommer', 39, DENIM, OHNE, 2, 'latzhose', P.jumpsuit);                // 35,99
t('Sport-Jumpsuit', 'unterteile', ['damen.young', 'sport.bekleidung', 'kinder.maedchen'], 'ganz', 39, ['Polyester', 'Baumwolle'], OHNE, 2, 'jumpsuit', P.jumpsuit); // 35,99
// ───────────── Kleid
t('Ballkleid', 'unterteile', D_KL, 'ganz', 379, SATIN, A05, 3, 'abendkleid', P.kleid);                     // 354,00
t('Brautkleid', 'unterteile', ['damen.kleider', 'damen.young'], 'ganz', 239, ['Seide', 'Polyester', 'Viskose'], A1, 3, 'abendkleid', P.kleid); // 219,00
t('Häkelkleid', 'unterteile', D_KL, 'sommer', 36, ['Baumwolle', 'Viskose'], OHNE, 2, 'strickkleid', P.kleid); // 32,99
t('Blazerkleid', 'unterteile', D_KL, 'ganz', 39, ['Polyester', 'Viskose'], A1, 2, 'etuikleid', P.kleid);  // 34,99
t('Corsagenkleid', 'unterteile', D_KL, 'ganz', 179, SATIN, G(0, 1, 0.9, 0.15), 3, 'abendkleid', P.kleid);                 // 169,00
t('Hängerkleid', 'unterteile', D_KL, 'sommer', 39, ['Viskose', 'Baumwolle'], OHNE, 1, 'minikleid', P.kleid); // 35,99
t('Skaterkleid', 'unterteile', D_KL, 'ganz', 22, JERSEY, OHNE, 1, 'jerseykleid', P.kleid);                // 19,99
// ───────────── Mantel
t('Kunstfellmantel', 'jacken', D_JA, 'winter', 82, PE, A1, 2, 'mantel', P.maentel);                        // 74,99
t('Ledermantel', 'jacken', D_JA, 'ganz', 77, KL, A1, 3, 'trenchcoat', P.maentel);                          // 69,99
// ───────────── Pullover
t('Häkelpullover', 'oberteile', D_ST, 'sommer', 28, ['Baumwolle', 'Viskose'], A1, 2, 'pullover', P.strick); // 24,99
// ───────────── Rock
t('Überrock', 'unterteile', D_HO, 'ganz', 29, KL, OHNE, 2, 'minirock', P.rock);                         // 25,99
t('Cordrock', 'unterteile', D_HO, 'winter', 22, BW, OHNE, 1, 'minirock', P.rock);                        // 19,99
t('Jeans-Maxirock', 'unterteile', D_DE, 'ganz', 39, DENIM, A1, 1, 'midirock', P.rock);                   // 35,99
t('Parachute-Rock', 'unterteile', D_HO, 'ganz', 39, PE, OHNE, 1, 'cargorock', P.rock);                   // 35,99
// ───────────── Schmuck
t('Oberarmreif', 'accessoires', [SM, 'damen.young'], 'sommer', 16, PE, A1, 1, 'armband', P.schmuck);     // 14,49
t('Ear Cuff', 'accessoires', [SM, 'damen.young'], 'ganz', 15, PE, A1, 1, 'ohrringe', P.schmuck);         // 12,99
// ───────────── Schuh
t('Mini-Boot', 'schuhe', DS, 'winter', 25, PE, A1, 1, 'stiefelette', P.stiefel);                          // 22,49
t('Plateau-Sandalette', 'schuhe', DS, 'sommer', 45, KL, A1, 2, 'keilsandalette', P.sommer);               // 39,99
t('Tabi-Sneaker', 'schuhe', US, 'ganz', 75, KL, OHNE, 2, 'sneaker', P.sneaker);                           // 67,99
t('Keil-Sneaker', 'schuhe', DS, 'ganz', 55, KL, A1, 2, 'plateausneaker', P.sneaker);                      // 49,99
t('Mary-Jane-Pumps', 'schuhe', DS, 'ganz', 39, KL, A1, 2, 'spangenschuh', P.pumps);                       // 35,99
t('Plateau-Pumps', 'schuhe', DS, 'ganz', 49, KL, A1, 2, 'pumps', P.pumps);                                // 45,99
t('Wallabee', 'schuhe', ['accessoires.herrenschuhe', 'accessoires.damenschuhe'], 'ganz', 45, ['Leder', 'Polyester'], A1, 2, 'mokassin', P.halb); // 39,99
// ───────────── Shirt
t('Half-Zip-Shirt', 'oberteile', ['damen.young', 'kinder.maedchen'], 'ganz', 22, JERSEY, A1, 1, 'troyer', P.shirts); // 19,49
t('Kapuzenshirt', 'oberteile', ['damen.young', 'kinder.maedchen'], 'ganz', 25, JERSEY, A05, 1, 'longsleeve', P.shirts); // 22,99
// ───────────── Shorts
t('Trachtenlederhose', 'unterteile', ['herren.casual', 'herren.hosen', 'kinder.jungen'], 'ganz', 55, KL, A1, 2, 'bermuda', P.shorts); // 49,99
t('Kampfsportshorts', 'unterteile', ['herren.casual', 'kinder.jungen'], 'sommer', 65, SATIN, OHNE, 1, 'shorts', P.shorts); // 59,99
t('Pyjamashorts', 'waesche', ['waesche.nacht', 'waesche.herren'], 'sommer', 25, BW, OHNE, 1, 'kurzpyjama', P.nacht); // 22,99
// ───────────── Socken
t('Beinstulpen', 'waesche', ['waesche.struempfe'], 'winter', 19, STRICK, OHNE, 1, 'kniestruempfe', P.struempfe); // 16,99
// ───────────── Tasche
t('Handytasche', 'accessoires', ACC_U, 'ganz', 19, KL, A1, 1, 'crossbody', P.taschen);                   // 16,99
t('Lunchtasche', 'accessoires', ACC_U, 'ganz', 27, ['Polyester', 'Baumwolle'], A1, 1, 'tote', P.taschen); // 24,49
t('Muscheltasche', 'accessoires', ACC, 'ganz', 39, PE, A1, 2, 'clutch', P.taschen);                       // 35,99
// ───────────── Weste
t('Utility-Weste', 'jacken', D_JA, 'ganz', 34, ['Baumwolle', 'Polyester'], A05, 2, 'strickweste', P.westen); // 30,49
t('Kunstlederweste', 'jacken', ['damen.jacken', 'herren.jacken', 'damen.young', 'kinder.maedchen'], 'ganz', 33, PE, OHNE, 2, 'steppweste', P.westen); // 29,99
// ───────────── Wäsche
t('Bügelloser BH', 'waesche', ['waesche.mieder', 'waesche.tag'], 'ganz', 9, ['Polyester', 'Baumwolle'], A1, 1, 'sportbh', P.bh);  // 7,99
t('Harness-Body', 'waesche', ['waesche.mieder', 'waesche.tag'], 'ganz', 22, ['Polyester', 'Seide'], g(1, 0.9), 2, 'shapewear', P.unter, Y); // 19,99
t('T-Shirt-BH', 'waesche', ['waesche.mieder', 'waesche.tag'], 'ganz', 9, ['Polyester', 'Baumwolle'], A1, 1, 'bh', P.bh);         // 7,49

for (const e of L) Q33_ZUORDNUNG.set(e.t.typ, e.zg);

export const NAMEN: readonly string[] = L.map((e) => e.t.typ);
export const TYPEN: T[] = L.map((e) => e.t);

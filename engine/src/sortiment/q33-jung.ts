// Q33: neue Artikeltypen für Kinder, Teens & Tweens und Young Adults. Haken in ./index.ts, Sichtbarkeit je Zielgruppe in ./q33-zielgruppen.ts.
// Bilder: Silhouetten k_* (Kinder und Baby) und t_* (Teens und Young Adults) aus render/src/kit/mode/erweiterung-q33.js.
// Zielgruppe G(kinder, jung, mitte, reif): Kinder G(1,0,0,0); Teens-Mode G(0,25, 1, 0,3, 0) mit Kinder-WG, damit Kinder- und Jugendmarken
// (z. B. Pünktchen) sie entwickeln können; Young-Adults-Teile G(0,1, 1, 0,5, 0,1). Kein Teil startet im Grundsortiment
// (nur WGs, die schon Artikeltypen haben; neue Typen hängen hinten an), Kalibrierung bleibt neutral.
import { G, type ArtikelBild, type SortimentTyp } from './basis';
import type { Material, ProduktKategorie, TypSaison, TrendGruppe } from '../produkte';
import type { BaumKategorie } from '../produkt-sortiment';
import type { WgId } from '../einkauf';
import { Q33_ZUORDNUNG } from './q33-zielgruppen';

type Z = 'kinder' | 'teens' | 'young';
type Pfad = readonly [BaumKategorie, string];
interface Eintrag { typ: string; kategorie: ProduktKategorie; wgs: WgId[]; saison: TypSaison; preis: number; materialien: Material[]; gruppe: Record<TrendGruppe, number>; aufwand: number; bild: ArtikelBild; pfad: Pfad; zg: Z[] }

// Materialgruppen
const BW: Material[] = ['Baumwolle', 'Bio-Baumwolle'];
const BW_P: Material[] = ['Baumwolle', 'Bio-Baumwolle', 'Polyester'];
const DENIM: Material[] = ['Denim', 'Bio-Baumwolle'];
const STRICK: Material[] = ['Baumwolle', 'Merino', 'Bio-Baumwolle'];
const SYNTH: Material[] = ['Polyester'];
const FLIESS: Material[] = ['Viskose', 'Polyester', 'Baumwolle'];
const LEDER: Material[] = ['Leder', 'Polyester'];

// WG-Bündel
const KIND_U: WgId[] = ['kinder.jungen', 'kinder.maedchen'];
const MAED: WgId[] = ['kinder.maedchen'];
const JUNG: WgId[] = ['kinder.jungen'];
const BABY: WgId[] = ['kinder.baby'];
const KSCHUH: WgId[] = ['kinder.schuhe', 'kinder.maedchen', 'kinder.jungen'];
const TEEN_D: WgId[] = ['damen.young', 'kinder.maedchen'];
const TEEN_U: WgId[] = ['damen.young', 'herren.casual', 'kinder.maedchen', 'kinder.jungen'];
const TEEN_H: WgId[] = ['herren.casual', 'kinder.jungen'];
const TEEN_ACC: WgId[] = ['accessoires.lederwaren', 'kinder.maedchen', 'kinder.jungen'];

const KIND = G(1, 0, 0, 0);
const TEEN = G(0.25, 1, 0.3, 0);
const YOUNG = G(0.1, 1, 0.5, 0.1);

const P = {
  kOber: ['oberteile', 'Kinder-Oberteile'] as Pfad, kUnter: ['unterteile', 'Kinderhosen und -röcke'] as Pfad, kKleid: ['kleider', 'Kinderkleider'] as Pfad,
  kJacke: ['jacken', 'Kinderjacken'] as Pfad, kWaesche: ['waesche', 'Kinderwäsche'] as Pfad, kSchuhe: ['schuhe', 'Kinderschuhe'] as Pfad,
  kAcc: ['accessoires', 'Kinder-Accessoires'] as Pfad, schule: ['accessoires', 'Schule und Kita'] as Pfad, baby: ['kinder', 'Baby'] as Pfad,
  spiel: ['kinder', 'Spielzeug'] as Pfad, kZimmer: ['home', 'Kinderzimmer'] as Pfad, kPflege: ['beauty', 'Kinderpflege'] as Pfad,
  tShirts: ['oberteile', 'Shirts'] as Pfad, tTops: ['oberteile', 'Tops'] as Pfad, tSweat: ['oberteile', 'Pullover und Sweatshirts'] as Pfad,
  tHemd: ['oberteile', 'Hemden'] as Pfad, tStrick: ['oberteile', 'Strick'] as Pfad, tJeans: ['unterteile', 'Jeans und Denim'] as Pfad,
  tHosen: ['unterteile', 'Hosen'] as Pfad, tCargo: ['unterteile', 'Cargohosen'] as Pfad, tShorts: ['unterteile', 'Shorts'] as Pfad,
  tLeggings: ['unterteile', 'Leggings'] as Pfad, tRock: ['unterteile', 'Röcke'] as Pfad, tKleid: ['kleider', 'Kleider'] as Pfad,
  tJacke: ['jacken', 'Jacken'] as Pfad, tWeste: ['jacken', 'Westen'] as Pfad, tSneaker: ['schuhe', 'Sneaker'] as Pfad,
  tBoots: ['schuhe', 'Stiefel und Boots'] as Pfad, tSommer: ['schuhe', 'Sommerschuhe'] as Pfad, tHaar: ['accessoires', 'Haarschmuck'] as Pfad,
  tHut: ['accessoires', 'Mützen und Hüte'] as Pfad, tTasche: ['accessoires', 'Taschen'] as Pfad, tSchmuck: ['accessoires', 'Schmuck'] as Pfad,
  tTuch: ['accessoires', 'Tücher und Schals'] as Pfad, tSocken: ['waesche', 'Strümpfe'] as Pfad, tBeauty: ['beauty', 'Make-up'] as Pfad,
  tDuft: ['beauty', 'Duft'] as Pfad, tZimmer: ['home', 'Jugendzimmer'] as Pfad,
};

const L: Eintrag[] = [];
function t(typ: string, kategorie: ProduktKategorie, wgs: WgId[], saison: TypSaison, preis: number, materialien: Material[], gruppe: Record<TrendGruppe, number>, aufwand: number, silhouette: string, pfad: Pfad, zg: Z[]): void {
  L.push({ typ, kategorie, wgs, saison, preis, materialien, gruppe, aufwand, bild: { silhouette }, pfad, zg });
}
const k = (typ: string, kat: ProduktKategorie, wgs: WgId[], saison: TypSaison, preis: number, mat: Material[], aufwand: number, sil: string, pfad: Pfad) => t(typ, kat, wgs, saison, preis, mat, KIND, aufwand, sil, pfad, ['kinder']);
const te = (typ: string, kat: ProduktKategorie, wgs: WgId[], saison: TypSaison, preis: number, mat: Material[], aufwand: number, sil: string, pfad: Pfad, zg: Z[] = ['teens', 'young']) => t(typ, kat, wgs, saison, preis, mat, TEEN, aufwand, sil, pfad, zg);
const yo = (typ: string, kat: ProduktKategorie, wgs: WgId[], saison: TypSaison, preis: number, mat: Material[], aufwand: number, sil: string, pfad: Pfad, zg: Z[] = ['teens', 'young']) => t(typ, kat, wgs, saison, preis, mat, YOUNG, aufwand, sil, pfad, zg);

// ───────────── Kinder: Oberteile
k('Kinder-Dino-Shirt', 'oberteile', KIND_U, 'sommer', 14, BW, 1, 'k_motivshirt', P.kOber);
k('Kinder-Ringel-Longsleeve', 'oberteile', KIND_U, 'ganz', 17, BW, 1, 'k_ringellongsleeve', P.kOber);
k('Wendepailletten-Shirt', 'oberteile', MAED, 'ganz', 19, BW, 2, 'k_paillettenshirt', P.kOber);
k('Kinder-Tanktop', 'oberteile', KIND_U, 'sommer', 10, BW, 1, 'k_tanktop', P.kOber);
k('Kinder-Rüschenbluse', 'oberteile', MAED, 'sommer', 22, ['Baumwolle', 'Viskose'], 2, 'k_rueschenbluse', P.kOber);
k('Kinder-Hemd', 'oberteile', JUNG, 'ganz', 22, BW, 2, 'k_hemd', P.kOber);
k('Kinder-Rollkragenshirt', 'oberteile', KIND_U, 'winter', 16, BW, 1, 'k_rollkragen', P.kOber);
k('Kinder-Norwegerpullover', 'oberteile', KIND_U, 'winter', 32, STRICK, 2, 'k_norweger', P.kOber);
k('Kinder-Fleecepullover', 'oberteile', KIND_U, 'winter', 24, SYNTH, 1, 'k_fleecepulli', P.kOber);
k('Kinder-Raglanshirt', 'oberteile', JUNG, 'ganz', 16, BW, 1, 'k_raglanshirt', P.kOber);
k('UV-Badeshirt', 'waesche', KIND_U, 'sommer', 18, SYNTH, 1, 'k_uvshirt', ['waesche', 'Bademode']);
k('Kinder-Unterhemd', 'waesche', KIND_U, 'ganz', 8, BW, 1, 'k_unterhemd', P.kWaesche);
k('Kinder-Plüschjacke mit Ohren', 'jacken', KIND_U, 'winter', 29, SYNTH, 2, 'k_tierkapuzenjacke', P.kJacke);
// ───────────── Kinder: Unterteile
k('Kinder-Cordhose', 'unterteile', KIND_U, 'winter', 24, BW, 1, 'k_cordhose', P.kUnter);
k('Kinder-Chino', 'unterteile', JUNG, 'ganz', 22, BW, 1, 'k_chino', P.kUnter);
k('Kinder-Thermohose', 'unterteile', KIND_U, 'winter', 29, SYNTH, 2, 'k_thermohose', P.kUnter);
k('Kinder-Radlerhose', 'unterteile', MAED, 'sommer', 9, BW, 1, 'k_radler', P.kUnter);
k('Kinder-Bermuda', 'unterteile', JUNG, 'sommer', 17, BW, 1, 'k_bermuda', P.kUnter);
k('Kinder-Latzshorts', 'unterteile', KIND_U, 'sommer', 22, DENIM, 2, 'k_latzshorts', P.kUnter);
k('Baby-Pumphose', 'kinder', BABY, 'ganz', 12, BW, 1, 'k_pumphose', P.baby);
k('Kinder-Sweatshorts', 'unterteile', KIND_U, 'sommer', 12, BW, 1, 'k_sweatshorts', P.kUnter);
k('Kinder-Skihose', 'unterteile', KIND_U, 'winter', 39, SYNTH, 2, 'k_skihose', P.kUnter);
k('Kinder-Jeansrock', 'unterteile', MAED, 'ganz', 19, DENIM, 1, 'k_jeansrock', P.kUnter);
k('Kinder-Rüschenrock', 'unterteile', MAED, 'sommer', 16, BW, 1, 'k_rueschenrock', P.kUnter);
// ───────────── Kinder: Kleider
k('Kinder-Tüllkleid', 'unterteile', MAED, 'ganz', 34, ['Polyester', 'Viskose'], 2, 'k_tuellkleid', P.kKleid);
k('Kinder-Trägerkleid', 'unterteile', MAED, 'sommer', 19, BW, 1, 'k_traegerkleid', P.kKleid);
k('Kinder-Sweatkleid', 'unterteile', MAED, 'ganz', 22, BW, 1, 'k_sweatkleid', P.kKleid);
k('Kinder-Strickkleid', 'unterteile', MAED, 'winter', 29, STRICK, 2, 'k_strickkleid', P.kKleid);
k('Kinder-Nachthemd', 'waesche', MAED, 'ganz', 16, BW, 1, 'k_nachthemd', P.kWaesche);
k('Kinder-Dirndl', 'unterteile', MAED, 'sommer', 39, BW, 2, 'k_dirndl', P.kKleid);
// ───────────── Kinder: Jacken
k('Kinder-Jeansjacke', 'jacken', KIND_U, 'ganz', 29, DENIM, 2, 'k_jeansjacke', P.kJacke);
k('Kinder-Daunenweste', 'jacken', KIND_U, 'winter', 35, SYNTH, 2, 'k_daunenweste', P.kJacke);
k('Kinder-Dufflecoat', 'jacken', KIND_U, 'winter', 49, ['Merino', 'Polyester'], 3, 'k_dufflecoat', P.kJacke);
k('Kinder-Blouson', 'jacken', JUNG, 'ganz', 32, SYNTH, 2, 'k_blouson', P.kJacke);
k('Kinder-Skijacke', 'jacken', KIND_U, 'winter', 55, SYNTH, 3, 'k_skijacke', P.kJacke);
k('Kinder-Strickjacke', 'oberteile', KIND_U, 'ganz', 24, STRICK, 1, 'k_strickjacke', P.kOber);
// ───────────── Kinder: Wäsche, Socken, Bademode
k('Kinder-Slips im Set', 'waesche', MAED, 'ganz', 12, BW, 1, 'k_slipset', P.kWaesche);
k('Kinder-Boxershorts', 'waesche', JUNG, 'ganz', 12, BW, 1, 'k_boxershorts', P.kWaesche);
k('Kinder-Bikini', 'waesche', MAED, 'sommer', 15, SYNTH, 1, 'k_bikini', ['waesche', 'Bademode']);
k('Stoppersocken', 'waesche', KIND_U, 'winter', 7, BW, 1, 'k_stoppersocken', P.kWaesche);
k('Kinder-Socken bunt im Set', 'waesche', KIND_U, 'ganz', 9, BW, 1, 'k_sockenset', P.kWaesche);
// ───────────── Kinder: Schuhe
k('Hallenschuh', 'schuhe', KSCHUH, 'ganz', 29, LEDER, 2, 'k_hallenschuh', P.kSchuhe);
k('Leuchtsneaker', 'schuhe', KSCHUH, 'ganz', 39, LEDER, 2, 'k_leuchtsneaker', P.kSchuhe);
k('Kinder-Riemchenschuh', 'schuhe', ['kinder.schuhe', 'kinder.maedchen'], 'ganz', 39, LEDER, 2, 'k_riemchenschuh', P.kSchuhe);
k('Krabbelschuh', 'schuhe', ['kinder.schuhe', 'kinder.baby'], 'ganz', 19, ['Leder'], 1, 'k_krabbelschuh', P.kSchuhe);
k('Kinder-Sandale', 'schuhe', KSCHUH, 'sommer', 32, LEDER, 2, 'k_sandale', P.kSchuhe);
k('Kinder-Badeschuh', 'schuhe', KSCHUH, 'sommer', 12, SYNTH, 1, 'k_badeschuh', P.kSchuhe);
// ───────────── Baby
k('Wickelbody', 'kinder', BABY, 'ganz', 10, BW, 1, 'k_wickelbody', P.baby);
k('Erstlingsmütze', 'kinder', BABY, 'ganz', 8, BW, 1, 'k_erstlingsmuetze', P.baby);
k('Lätzchen', 'kinder', BABY, 'ganz', 6, BW, 1, 'k_laetzchen', P.baby);
k('Schmusetuch', 'kinder', BABY, 'ganz', 15, BW, 1, 'k_schmusetuch', P.baby);
k('Schnullerkette', 'kinder', BABY, 'ganz', 12, BW, 1, 'k_schnullerkette', P.baby);
k('Babyrassel', 'kinder', BABY, 'ganz', 12, BW, 1, 'k_rassel', P.baby);
k('Greifling', 'kinder', BABY, 'ganz', 10, BW, 1, 'k_beissring', P.baby);
k('Babydecke', 'kinder', BABY, 'winter', 29, STRICK, 1, 'k_babydecke', P.baby);
k('Kapuzenbadetuch', 'kinder', BABY, 'ganz', 22, BW, 1, 'k_kapuzenhandtuch', P.baby);
k('Spieluhr', 'kinder', BABY, 'ganz', 24, BW, 2, 'k_spieluhr', P.baby);
k('Baby-Mobile', 'kinder', BABY, 'ganz', 29, BW, 2, 'k_mobile', P.baby);
k('Wickeltasche', 'accessoires', ['accessoires.lederwaren', 'kinder.baby'], 'ganz', 49, SYNTH, 2, 'k_wickeltasche', P.baby);
k('Baby-Wickeljacke', 'kinder', BABY, 'ganz', 19, STRICK, 1, 'k_babyjaeckchen', P.baby);
// ───────────── Spielzeug
k('Spielball', 'kinder', BABY, 'sommer', 8, SYNTH, 1, 'k_ball', P.spiel);
k('Holzauto', 'kinder', BABY, 'ganz', 16, BW, 1, 'k_spielzeugauto', P.spiel);
k('Holzkreisel', 'kinder', BABY, 'ganz', 9, BW, 1, 'k_kreisel', P.spiel);
k('Pappbilderbuch', 'kinder', BABY, 'ganz', 10, BW, 1, 'k_bilderbuch', P.spiel);
k('Buntstifte', 'kinder', KIND_U, 'ganz', 9, BW, 1, 'k_buntstifte', P.spiel);
k('Stapelturm', 'kinder', BABY, 'ganz', 15, BW, 1, 'k_stapelturm', P.spiel);
k('Schaukelpferd', 'kinder', BABY, 'ganz', 89, BW, 3, 'k_schaukelpferd', P.spiel);
k('Sandspielzeug-Set', 'kinder', BABY, 'sommer', 12, SYNTH, 1, 'k_sandspielzeug', P.spiel);
k('Springseil', 'kinder', KIND_U, 'sommer', 9, BW, 1, 'k_springseil', P.spiel);
k('Xylophon', 'kinder', BABY, 'ganz', 25, BW, 2, 'k_xylophon', P.spiel);
k('Handpuppe', 'kinder', BABY, 'ganz', 19, BW, 1, 'k_handpuppe', P.spiel);
k('Drachen', 'kinder', KIND_U, 'sommer', 19, SYNTH, 1, 'k_drachen', P.spiel);
k('Badeente', 'kinder', BABY, 'ganz', 6, SYNTH, 1, 'k_badeente', P.spiel);
k('Kuschelhase', 'kinder', BABY, 'ganz', 22, BW, 1, 'k_kuschelhase', P.spiel);
k('Malkasten', 'kinder', KIND_U, 'ganz', 10, SYNTH, 1, 'k_malkasten', P.spiel);
k('Legespiel', 'kinder', KIND_U, 'ganz', 14, BW, 1, 'k_legespiel', P.spiel);
// ───────────── Schule, Kita, Accessoires
k('Schulranzen', 'accessoires', KIND_U, 'ganz', 129, SYNTH, 3, 'k_schulranzen', P.schule);
k('Turnbeutel', 'accessoires', KIND_U, 'ganz', 14, BW, 1, 'k_turnbeutel', P.schule);
k('Federmäppchen', 'accessoires', KIND_U, 'ganz', 19, SYNTH, 1, 'k_federmaeppchen', P.schule);
k('Brotdose', 'home', KIND_U, 'ganz', 14, SYNTH, 1, 'k_brotdose', P.schule);
k('Kinder-Trinkflasche', 'home', KIND_U, 'ganz', 19, SYNTH, 1, 'k_trinkflasche', P.schule);
k('Bommelmütze', 'accessoires', KIND_U, 'winter', 15, STRICK, 1, 'k_bommelmuetze', P.kAcc);
k('Kinder-Fäustlinge', 'accessoires', KIND_U, 'winter', 12, STRICK, 1, 'k_faeustlinge', P.kAcc);
k('Haarspangen im Set', 'accessoires', MAED, 'ganz', 6, SYNTH, 1, 'k_haarspangen', P.kAcc);
k('Kinderuhr', 'accessoires', KIND_U, 'ganz', 25, SYNTH, 2, 'k_kinderuhr', P.kAcc);
k('Kinderschirm', 'accessoires', KIND_U, 'ganz', 15, SYNTH, 1, 'k_kinderschirm', P.kAcc);
k('Kinder-Geldbörse', 'accessoires', KIND_U, 'ganz', 10, SYNTH, 1, 'k_kindergeldboerse', P.kAcc);
k('Kinder-Cap', 'accessoires', KIND_U, 'sommer', 12, BW, 1, 'k_kindercap', P.kAcc);
k('Kinder-Strickschal', 'accessoires', KIND_U, 'winter', 12, STRICK, 1, 'k_schal', P.kAcc);
// ───────────── Kinderzimmer und Pflege
k('Spielteppich', 'home', ['wohnen.heimtextil', 'kinder.baby'], 'ganz', 59, BW, 2, 'k_spielteppich', P.kZimmer);
k('Nachtlicht', 'home', ['wohnen.deko', 'kinder.baby'], 'ganz', 22, SYNTH, 1, 'k_nachtlicht', P.kZimmer);
k('Wimpelkette', 'home', ['wohnen.deko', 'kinder.baby'], 'ganz', 15, BW, 1, 'k_wimpelkette', P.kZimmer);
k('Kindergeschirr', 'home', ['wohnen.tisch', 'kinder.baby'], 'ganz', 19, SYNTH, 1, 'k_kindergeschirr', P.kZimmer);
k('Spielzeugkorb', 'home', ['wohnen.deko', 'kinder.baby'], 'ganz', 25, BW, 1, 'k_spielkorb', P.kZimmer);
k('Wolkenkissen', 'home', ['wohnen.heimtextil', 'kinder.baby'], 'ganz', 19, BW, 1, 'k_wolkenkissen', P.kZimmer);
k('Sparschwein', 'home', ['wohnen.deko', 'kinder.baby'], 'ganz', 15, SYNTH, 1, 'k_spardose', P.kZimmer);
k('Kindershampoo', 'beauty', ['beauty.drogerie'], 'ganz', 5, SYNTH, 1, 'k_kindershampoo', P.kPflege);
k('Zahnputzset', 'beauty', ['beauty.drogerie'], 'ganz', 8, SYNTH, 1, 'k_zahnputzset', P.kPflege);

// ───────────── Teens & Tweens, Young Adults: Oberteile
te('Batik-Shirt', 'oberteile', TEEN_U, 'sommer', 19, BW, 1, 't_tiedye', P.tShirts);
te('Oversize-Printshirt', 'oberteile', TEEN_U, 'ganz', 22, BW, 1, 't_printshirt', P.tShirts);
te('Smiley-Shirt', 'oberteile', TEEN_U, 'sommer', 17, BW, 1, 't_smileyshirt', P.tShirts);
te('Crop-Longsleeve', 'oberteile', TEEN_D, 'ganz', 19, BW, 1, 't_croplongsleeve', P.tShirts);
te('Netzshirt', 'oberteile', TEEN_D, 'ganz', 22, SYNTH, 1, 't_meshtop', P.tShirts);
te('Schachbrett-Pullover', 'oberteile', TEEN_U, 'winter', 39, STRICK, 2, 't_schachpulli', P.tStrick);
te('Zip-Hoodie', 'oberteile', TEEN_U, 'ganz', 39, BW, 2, 't_ziphoodie', P.tSweat);
te('Batik-Hoodie', 'oberteile', TEEN_U, 'ganz', 39, BW, 2, 't_tiedyehoodie', P.tSweat);
te('Crop-Sweatshirt', 'oberteile', TEEN_D, 'ganz', 29, BW, 1, 't_cropsweat', P.tSweat);
te('College-Sweatshirt', 'oberteile', TEEN_U, 'ganz', 35, BW, 1, 't_collegesweat', P.tSweat);
te('Raglan-Longsleeve', 'oberteile', TEEN_U, 'ganz', 22, BW, 1, 't_raglanlong', P.tShirts);
te('Trikotshirt', 'oberteile', TEEN_U, 'sommer', 29, SYNTH, 1, 't_trikot', P.tShirts);
te('Basketball-Tanktop', 'oberteile', TEEN_H, 'sommer', 25, SYNTH, 1, 't_basketballtank', P.tTops);
yo('Bowlinghemd', 'oberteile', TEEN_U, 'sommer', 35, FLIESS, 2, 't_bowlinghemd', P.tHemd);
te('Flanellhemd', 'oberteile', TEEN_U, 'winter', 35, BW, 1, 't_flanellhemd', P.tHemd);
yo('Cut-out-Top', 'oberteile', TEEN_D, 'ganz', 25, BW, 1, 't_cutouttop', P.tTops);
yo('Neckholder-Top', 'oberteile', TEEN_D, 'sommer', 22, FLIESS, 1, 't_neckholder', P.tTops);
te('Bandeau-Top', 'oberteile', TEEN_D, 'sommer', 15, BW, 1, 't_bandeau', P.tTops);
yo('Teddy-Hoodie', 'oberteile', TEEN_U, 'winter', 45, SYNTH, 2, 't_teddypulli', P.tSweat);
te('Fleece-Troyer', 'oberteile', TEEN_U, 'winter', 39, SYNTH, 2, 't_fleecetroyer', P.tSweat);
te('Camouflage-Shirt', 'oberteile', TEEN_U, 'ganz', 19, BW, 1, 't_camoshirt', P.tShirts);
te('Ringel-Croptop', 'oberteile', TEEN_D, 'sommer', 15, BW, 1, 't_ringelcrop', P.tTops);
yo('Glitzer-Top', 'oberteile', TEEN_D, 'ganz', 29, SYNTH, 2, 't_glitzertop', P.tTops);
// ───────────── Teens & Young Adults: Unterteile
te('Fallschirmhose', 'unterteile', TEEN_U, 'ganz', 45, SYNTH, 2, 't_parachute', P.tHosen);
te('Cargo-Jeans', 'unterteile', TEEN_U, 'ganz', 49, DENIM, 2, 't_cargojeans', P.tJeans);
te('Jorts', 'unterteile', TEEN_U, 'sommer', 35, DENIM, 1, 't_jorts', P.tShorts);
yo('Destroyed-Jeans', 'unterteile', TEEN_U, 'ganz', 49, DENIM, 2, 't_rippedjeans', P.tJeans);
te('Schlagleggings', 'unterteile', TEEN_D, 'ganz', 25, BW, 1, 't_flareleggings', P.tLeggings);
te('Sweatshorts', 'unterteile', TEEN_U, 'sommer', 22, BW, 1, 't_sweatshorts', P.tShorts);
te('Basketballshorts', 'unterteile', TEEN_H, 'sommer', 25, SYNTH, 1, 't_basketballshorts', P.tShorts);
te('Camouflage-Cargohose', 'unterteile', TEEN_U, 'ganz', 45, BW, 2, 't_camocargo', P.tCargo);
te('Trackpants', 'unterteile', TEEN_U, 'ganz', 35, SYNTH, 1, 't_trackpants', P.tHosen);
te('Sportleggings', 'unterteile', TEEN_D, 'ganz', 29, SYNTH, 1, 't_sportleggings', P.tLeggings);
te('Tennisrock', 'unterteile', TEEN_D, 'sommer', 25, SYNTH, 1, 't_tennisrock', P.tRock);
te('Karo-Minirock', 'unterteile', TEEN_D, 'winter', 29, ['Merino', 'Polyester'], 1, 't_karominirock', P.tRock);
te('Jeans-Latzhose', 'unterteile', TEEN_U, 'ganz', 55, DENIM, 2, 't_jeanslatzhose', P.tJeans);
te('Cropped Pullunder', 'oberteile', TEEN_D, 'ganz', 29, STRICK, 1, 't_croppullunder', P.tStrick);
te('Longline-Shirt', 'oberteile', TEEN_U, 'ganz', 19, BW, 1, 't_longline', P.tShirts);
te('Crop-Polo', 'oberteile', TEEN_D, 'sommer', 22, BW, 1, 't_croppolo', P.tTops);
te('Regenbogen-Pullover', 'oberteile', TEEN_U, 'winter', 39, STRICK, 2, 't_regenbogenpulli', P.tStrick);
te('Fleecejacke', 'oberteile', TEEN_U, 'winter', 39, SYNTH, 1, 't_fleecejacke', P.tSweat);
te('Sweatweste', 'oberteile', TEEN_U, 'ganz', 29, BW, 1, 't_sweatweste', P.tSweat);
te('Karohose', 'unterteile', TEEN_U, 'winter', 45, ['Merino', 'Polyester', 'Baumwolle'], 2, 't_karohose', P.tHosen);
te('Pyjamahose', 'waesche', ['waesche.nacht', 'kinder.maedchen', 'kinder.jungen'], 'ganz', 19, BW, 1, 't_pyjamahose', ['waesche', 'Nachtwäsche']);
te('Radlerhose', 'unterteile', TEEN_D, 'sommer', 19, SYNTH, 1, 't_radler', P.tLeggings);
yo('Leo-Midirock', 'unterteile', TEEN_D, 'ganz', 39, FLIESS, 1, 't_leorock', P.tRock);
te('Skort', 'unterteile', TEEN_D, 'sommer', 25, SYNTH, 1, 't_skort', P.tRock);
te('Jeanskleid', 'unterteile', TEEN_D, 'sommer', 45, DENIM, 2, 't_jeanskleid', P.tKleid);
te('Cropped Jeansjacke', 'jacken', TEEN_U, 'ganz', 49, DENIM, 2, 't_cropjeansjacke', P.tJacke);
te('Fleeceweste', 'jacken', TEEN_U, 'winter', 35, SYNTH, 1, 't_fleeceweste', P.tWeste);
te('Camouflage-Shorts', 'unterteile', TEEN_U, 'sommer', 29, BW, 1, 't_camoshorts', P.tShorts);
te('Ringel-Hoodie', 'oberteile', TEEN_U, 'ganz', 39, BW, 1, 't_ringelhoodie', P.tSweat);
te('Schachbrett-Shorts', 'unterteile', TEEN_U, 'sommer', 22, BW, 1, 't_schachshorts', P.tShorts);
te('Leo-Shirt', 'oberteile', TEEN_D, 'ganz', 19, BW, 1, 't_leoshirt', P.tShirts);
te('Sterne-Pullover', 'oberteile', TEEN_U, 'winter', 35, STRICK, 1, 't_sternepulli', P.tStrick);
te('Herzchen-Croptop', 'oberteile', TEEN_D, 'sommer', 17, BW, 1, 't_herzcrop', P.tTops);
te('Tüll-Minirock', 'unterteile', TEEN_D, 'ganz', 29, SYNTH, 1, 't_tuellmini', P.tRock);
te('Cargo-Overall', 'unterteile', TEEN_U, 'ganz', 59, BW, 2, 't_cargooverall', P.tHosen);
// ───────────── Teens & Young Adults: Kleider
te('Hoodie-Kleid', 'unterteile', TEEN_D, 'ganz', 39, BW, 1, 't_hoodiekleid', P.tKleid);
yo('Bodycon-Kleid', 'unterteile', TEEN_D, 'ganz', 39, BW, 1, 't_bodycon', P.tKleid);
te('Babydoll-Kleid', 'unterteile', TEEN_D, 'sommer', 35, FLIESS, 2, 't_babydoll', P.tKleid);
// ───────────── Teens & Young Adults: Jacken
te('Cropped Pufferjacke', 'jacken', TEEN_U, 'winter', 69, SYNTH, 3, 't_croppuffer', P.tJacke);
te('Windbreaker', 'jacken', TEEN_U, 'ganz', 49, SYNTH, 2, 't_windbreaker', P.tJacke);
yo('Coach-Jacke', 'jacken', TEEN_U, 'ganz', 55, SYNTH, 2, 't_coachjacket', P.tJacke);
yo('Sherpa-Jacke', 'jacken', TEEN_U, 'winter', 65, SYNTH, 2, 't_sherpajacke', P.tJacke);
te('Cropped Steppweste', 'jacken', TEEN_D, 'winter', 45, SYNTH, 2, 't_cropweste', P.tWeste);
yo('Kunstleder-Cropjacke', 'jacken', TEEN_D, 'ganz', 59, ['Polyester', 'Leder'], 2, 't_kunstlederjacke', P.tJacke);
te('Karo-Overshirt', 'jacken', TEEN_U, 'winter', 49, ['Merino', 'Polyester', 'Baumwolle'], 2, 't_karojacke', P.tJacke);
yo('Satin-Bomberjacke', 'jacken', TEEN_U, 'ganz', 59, SYNTH, 2, 't_satinbomber', P.tJacke);
// ───────────── Teens & Young Adults: Schuhe
te('Skateschuh', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe', 'kinder.schuhe', 'kinder.jungen', 'kinder.maedchen'], 'ganz', 59, ['Baumwolle', 'Leder'], 2, 't_skateschuh', P.tSneaker);
te('High-Top-Sneaker', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe', 'kinder.schuhe', 'kinder.jungen', 'kinder.maedchen'], 'ganz', 69, ['Baumwolle', 'Leder'], 2, 't_hightop', P.tSneaker);
yo('Retro-Laufschuh', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe', 'kinder.jungen', 'kinder.maedchen'], 'ganz', 79, LEDER, 2, 't_retrorunner', P.tSneaker);
te('Plateau-Boots', 'schuhe', ['accessoires.damenschuhe', 'kinder.maedchen'], 'winter', 89, LEDER, 3, 't_plateauboots', P.tBoots);
te('Badeschlappen', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe', 'kinder.jungen', 'kinder.maedchen'], 'sommer', 19, SYNTH, 1, 't_slides', P.tSommer);
te('Clogs', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe', 'kinder.jungen', 'kinder.maedchen'], 'ganz', 39, SYNTH, 1, 't_clogs', P.tSommer);
// ───────────── Teens & Young Adults: Accessoires
te('Bucket Hat', 'accessoires', TEEN_ACC, 'sommer', 19, BW, 1, 't_buckethat', P.tHut);
te('Bandana', 'accessoires', TEEN_ACC, 'ganz', 9, BW, 1, 't_bandana', P.tTuch);
te('Herz-Sonnenbrille', 'accessoires', ['accessoires.lederwaren', 'kinder.maedchen'], 'sommer', 12, SYNTH, 1, 't_herzbrille', ['accessoires', 'Sonnenbrillen']);
te('Scrunchies im Set', 'accessoires', ['accessoires.lederwaren', 'kinder.maedchen'], 'ganz', 9, ['Polyester', 'Seide', 'Baumwolle'], 1, 't_scrunchies', P.tHaar);
te('Frottee-Stirnband', 'accessoires', TEEN_ACC, 'ganz', 8, BW, 1, 't_stirnband', P.tHaar);
te('Truckercap', 'accessoires', TEEN_ACC, 'sommer', 19, BW_P, 1, 't_truckercap', P.tHut);
te('Schulrucksack', 'accessoires', TEEN_ACC, 'ganz', 59, SYNTH, 2, 't_schulrucksack', P.tTasche, ['teens']);
te('Stoffbeutel mit Print', 'accessoires', TEEN_ACC, 'ganz', 12, BW, 1, 't_stoffbeutel', P.tTasche);
yo('Mini-Rucksack', 'accessoires', ['accessoires.lederwaren', 'kinder.maedchen'], 'ganz', 45, LEDER, 2, 't_minirucksack', P.tTasche);
te('Handykette', 'accessoires', ['accessoires.lederwaren', 'kinder.maedchen'], 'ganz', 15, SYNTH, 1, 't_handykette', P.tSchmuck);
te('Freundschaftsarmbänder', 'accessoires', ['accessoires.lederwaren', 'kinder.maedchen', 'kinder.jungen'], 'ganz', 8, BW, 1, 't_freundschaftsarmband', P.tSchmuck);
yo('Kreolen', 'accessoires', ['accessoires.lederwaren', 'kinder.maedchen'], 'ganz', 19, SYNTH, 1, 't_kreolen', P.tSchmuck);
te('Choker', 'accessoires', ['accessoires.lederwaren', 'kinder.maedchen'], 'ganz', 12, SYNTH, 1, 't_choker', P.tSchmuck);
te('Tennissocken im Set', 'waesche', ['waesche.struempfe', 'kinder.jungen', 'kinder.maedchen'], 'ganz', 12, BW, 1, 't_tennissocken', P.tSocken);
// ───────────── Teens & Young Adults: Beauty und Zimmer
te('Lipgloss', 'beauty', ['beauty.pflege'], 'ganz', 9, SYNTH, 1, 't_lipgloss', P.tBeauty);
te('Bodyspray', 'beauty', ['beauty.drogerie'], 'ganz', 8, SYNTH, 1, 't_bodyspray', P.tDuft);
te('Lichterkette', 'home', ['wohnen.deko'], 'winter', 19, SYNTH, 1, 't_lichterkette', P.tZimmer);
te('Sitzsack', 'home', ['wohnen.heimtextil'], 'ganz', 89, BW_P, 2, 't_sitzsack', P.tZimmer);
te('Poster im Set', 'home', ['wohnen.deko'], 'ganz', 29, BW, 1, 't_posterset', P.tZimmer);
te('Pinnwand', 'home', ['wohnen.deko'], 'ganz', 25, BW, 1, 't_pinnwand', P.tZimmer, ['teens']);
te('Retro-Wecker', 'home', ['wohnen.deko'], 'ganz', 22, SYNTH, 1, 't_wecker', P.tZimmer);
yo('Hochflor-Teppich rund', 'home', ['wohnen.heimtextil'], 'ganz', 79, SYNTH, 2, 't_flauschteppich', P.tZimmer);
yo('Klemmleuchte', 'home', ['wohnen.deko'], 'ganz', 35, SYNTH, 1, 't_klemmleuchte', P.tZimmer);
te('Wendebettwäsche', 'home', ['wohnen.bett'], 'ganz', 39, BW, 1, 't_wendebettwaesche', P.tZimmer);
te('LED-Neonschild', 'home', ['wohnen.deko'], 'ganz', 39, SYNTH, 2, 't_neonlampe', P.tZimmer);

for (const e of L) Q33_ZUORDNUNG.set(e.typ, e.zg);

export const NAMEN: readonly string[] = L.map((e) => e.typ);
export const TYPEN: SortimentTyp<string>[] = L.map(({ zg: _zg, ...e }) => e);

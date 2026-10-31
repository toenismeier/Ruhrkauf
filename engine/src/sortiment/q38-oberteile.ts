// Q38: neue Oberteile aus dem Referenzsortiment (Wurf 4, auftraege/wurf4/daten/q38-typen.csv; 7.454 Artikel aus fünf Jungmodeketten).
// Je Typ: Zielgruppen wie in der Referenz (Typ zählt für eine Gruppe ab 30 % ihrer Artikel), Preis am Preismedian mit Warenhaus-Aufschlag,
// Bild: bis zur Abnahme durch Ummo bildOffen mit der nächstliegenden vorhandenen Silhouette (auftraege/wurf4/bilder-neu.md,
// Abschnitt 1); die eigenen Bilder liefern die Bildpakete B01–B30. Teens und Young Adults teilen sich das Gewicht „jung“, deshalb
// trägt jeder Typ seine Zuordnung ausdrücklich in Q33_ZUORDNUNG ein; Adults über mitte ≥ 0,4, Best Ager bleiben außen vor (reif < 0,4,
// die Referenz hat keine 50+-Ketten). „Baby-Tee“ ist als „Babytee“ schon im Sortiment (Q27): nicht doppelt angelegt, aber für
// Teens und Young Adults freigeschaltet (unten). „Strickpullover“ legt Q37 als Muster-Grundtyp an (Teens, Young, Adults).
// Neue Typen hängen hinten an und nur an WGs, die schon Artikeltypen haben: Startsortiment und Kalibrierung bleiben unverändert.
import { G, type ArtikelBild, type SortimentTyp } from './basis';
import { bildWurf4 } from './bilder-wurf4';
import type { Material, ProduktKategorie, TypSaison, TrendGruppe } from '../produkte';
import type { BaumKategorie } from '../produkt-sortiment';
import type { WgId } from '../einkauf';
import { Q33_ZUORDNUNG } from './q33-zielgruppen';

type Z = 'teens' | 'young';
type Pfad = readonly [BaumKategorie, string];
interface Eintrag { typ: string; kategorie: ProduktKategorie; wgs: WgId[]; saison: TypSaison; preis: number; materialien: Material[]; gruppe: Record<TrendGruppe, number>; aufwand: number; bild: ArtikelBild; bildOffen?: true; pfad: Pfad; zg: Z[] }

const P = {
  shirts: ['oberteile', 'Shirts'] as Pfad, tops: ['oberteile', 'Tops'] as Pfad, blusen: ['oberteile', 'Blusen'] as Pfad, hemden: ['oberteile', 'Hemden'] as Pfad,
  polos: ['oberteile', 'Polos'] as Pfad, pulli: ['oberteile', 'Pullover und Sweatshirts'] as Pfad, strick: ['oberteile', 'Strick'] as Pfad,
  cardigan: ['oberteile', 'Cardigans und Strickjacken'] as Pfad, westen: ['jacken', 'Westen'] as Pfad, capes: ['jacken', 'Ponchos und Capes'] as Pfad,
};

// Materialgruppen
const JERSEY: Material[] = ['Baumwolle', 'Bio-Baumwolle', 'Viskose'];
const BW: Material[] = ['Baumwolle', 'Bio-Baumwolle'];
const STRICK: Material[] = ['Baumwolle', 'Merino', 'Viskose'];
const FEIN: Material[] = ['Merino', 'Kaschmir', 'Viskose'];
const FLIESS: Material[] = ['Viskose', 'Polyester', 'Seide'];
const POPELINE: Material[] = ['Baumwolle', 'Bio-Baumwolle', 'Viskose'];
const DENIM: Material[] = ['Denim', 'Bio-Baumwolle'];
const SPORT: Material[] = ['Polyester', 'Baumwolle'];

// WG-Bündel: Damen jung (mit Mädchen-WG, damit Kinder- und Jugendmarken Teens-Teile entwickeln), Unisex jung, Herren jung
const D: WgId[] = ['damen.young', 'kinder.maedchen'];
const D_BL: WgId[] = ['damen.young', 'damen.blusen', 'kinder.maedchen'];
const D_ST: WgId[] = ['damen.young', 'damen.strick', 'kinder.maedchen'];
const D_DE: WgId[] = ['damen.young', 'damen.denim', 'kinder.maedchen'];
const U: WgId[] = ['damen.young', 'herren.casual', 'kinder.maedchen', 'kinder.jungen'];
const U_ST: WgId[] = ['damen.young', 'herren.strick', 'damen.strick', 'kinder.maedchen', 'kinder.jungen'];
const H: WgId[] = ['herren.casual', 'kinder.jungen'];
const H_HE: WgId[] = ['herren.hemden', 'herren.casual', 'kinder.jungen'];
const H_ST: WgId[] = ['herren.strick', 'herren.casual', 'kinder.jungen'];
const SP: WgId[] = ['sport.bekleidung', 'damen.young'];
const D_JA: WgId[] = ['damen.young', 'damen.jacken', 'kinder.maedchen'];

const TY: Z[] = ['teens', 'young'];
/** Gewicht aus dem Adults-Anteil der Referenz: Adults laut Zielgruppenspalte (mitte 0,45 bis 0,9), sonst darunter (mitte 0,3).
 * Die Spalte zählt ab 30 % der Artikel; bei nur 3 Referenzartikeln reicht einer (0,33) nicht. */
const g = (adults: number, kinder = 0.25, istAdults = adults >= 0.3): Record<TrendGruppe, number> =>
  G(kinder, 1, istAdults ? Math.round((0.45 + 0.45 * adults) * 100) / 100 : 0.3, adults >= 0.75 ? 0.3 : 0.15);

const L: Eintrag[] = [];
const t = (typ: string, kategorie: ProduktKategorie, wgs: WgId[], saison: TypSaison, preis: number, materialien: Material[], gruppe: Record<TrendGruppe, number>, aufwand: number, silhouette: string, pfad: Pfad, zg: Z[] = TY) =>
  L.push({ typ, kategorie, wgs, saison, preis, materialien, gruppe, aufwand, ...bildWurf4(typ, silhouette), pfad, zg });

// ───────────── Shirts (Referenz-Preismedian in Klammern)
t('Crop-T-Shirt', 'oberteile', D, 'sommer', 18, JERSEY, g(0.19), 1, 'boxytee', P.shirts);              // 15,99
t('Ringer-T-Shirt', 'oberteile', U, 'sommer', 20, BW, g(0.33), 1, 'tshirt', P.shirts);                 // 17,99
t('Raglan-T-Shirt', 'oberteile', D, 'sommer', 20, BW, g(0.25), 1, 't_raglanlong', P.shirts);                // 17,99
t('Henley-Longsleeve', 'oberteile', U, 'ganz', 22, JERSEY, g(0.64), 1, 'henley', P.shirts);             // 19,99
t('Layer-Shirt', 'oberteile', U, 'ganz', 25, BW, g(0), 2, 't_longline', P.shirts);                          // 22,99
t('Ärmelloses Shirt', 'oberteile', U, 'sommer', 22, JERSEY, g(0.62), 1, 'shirttop', P.shirts);             // 19,49
t('Strickshirt', 'oberteile', U_ST, 'sommer', 29, STRICK, g(0.57), 2, 'boxytee', P.strick);             // 25,99
t('Fledermausshirt', 'oberteile', D, 'ganz', 18, JERSEY, g(0.75), 1, 'tunika', P.shirts);              // 15,99
t('Spitzenshirt', 'oberteile', ['damen.young', 'damen.blusen'], 'ganz', 20, FLIESS, g(0.67, 0), 2, 'longsleeve', P.shirts, ['young']); // 17,99
t('Peplum-Shirt', 'oberteile', D, 'sommer', 22, JERSEY, g(0.33, 0.25, false), 1, 'babytee', P.shirts);               // 19,99
t('Baseballshirt', 'oberteile', U, 'ganz', 20, BW, g(1), 1, 't_raglanlong', P.shirts);                     // 17,99
t('Sportshirt', 'oberteile', SP, 'ganz', 20, SPORT, g(0.33, 0.25, false), 1, 't_trikot', P.shirts);                   // 17,99
// ───────────── Tops
t('Body', 'oberteile', D, 'ganz', 20, JERSEY, g(0.83), 2, 'rollkragenshirt', P.tops);                                  // 17,99
t('Tanktop', 'oberteile', D, 'sommer', 15, ['Baumwolle', 'Bio-Baumwolle'], g(0.65), 1, 'top', P.tops);  // 12,99
t('Peplum-Top', 'oberteile', D, 'sommer', 22, FLIESS, g(0.62), 2, 'traegertop', P.tops);                     // 19,99
t('Stricktop', 'oberteile', D_ST, 'sommer', 24, STRICK, g(0.3), 1, 't_croppullunder', P.tops);                    // 21,49
t('Bustier-Top', 'oberteile', D, 'sommer', 25, ['Baumwolle', 'Polyester', 'Seide'], g(0.57), 2, 'corsagetop', P.tops); // 22,99
t('Muscle-Shirt', 'oberteile', H, 'sommer', 18, BW, g(0.43), 1, 't_basketballtank', P.tops);                          // 15,99
t('One-Shoulder-Top', 'oberteile', D, 'sommer', 20, JERSEY, g(0.67), 2, 'offshoulder', P.tops);            // 17,99
t('Westentop', 'oberteile', D, 'ganz', 22, ['Polyester', 'Viskose', 'Leinen'], g(0.6), 2, 'strickweste', P.tops); // 19,99
t('Jeans-Top', 'oberteile', D_DE, 'sommer', 38, DENIM, g(0), 2, 'puffaermelbluse', P.tops);                        // 34,49
t('Sporttop', 'oberteile', SP, 'ganz', 22, SPORT, g(0.67), 1, 't_bandeau', P.tops);                          // 19,99
// ───────────── Blusen und Hemden
t('Resorthemd', 'oberteile', H_HE, 'sommer', 22, ['Leinen', 'Viskose', 'Baumwolle'], g(0.75), 1, 't_bowlinghemd', P.hemden); // 19,99
t('Hemdbluse', 'oberteile', D_BL, 'ganz', 28, POPELINE, g(0.82), 2, 'bluse', P.blusen);                // 24,99
t('Wickelbluse', 'oberteile', D_BL, 'sommer', 29, FLIESS, g(0.89), 2, 'wickelshirt', P.blusen);             // 25,99
t('Peplum-Bluse', 'oberteile', D_BL, 'ganz', 29, POPELINE, g(1), 2, 'longbluse', P.blusen);               // 25,99
t('Jeanshemd', 'oberteile', H_HE, 'ganz', 40, DENIM, g(0.17), 2, 'hemd', P.hemden);                    // 35,99
t('Lagenlook-Hemd', 'oberteile', H_HE, 'ganz', 40, POPELINE, g(0), 2, 'oversizehemd', P.hemden);               // 35,99
t('Lagenlook-Bluse', 'oberteile', D_BL, 'ganz', 28, ['Baumwolle', 'Merino', 'Viskose'], g(0.75), 2, 'pullunder', P.blusen); // 24,99
// ───────────── Polos, Pullover, Strick
t('Langarm-Poloshirt', 'oberteile', U, 'ganz', 21, BW, g(0.42), 1, 'rugbyshirt', P.polos);                 // 18,99
t('Strickpolo', 'oberteile', H_ST, 'sommer', 33, STRICK, g(0.67), 2, 'polo', P.polos);                // 29,99
t('Kurzarm-Strickpullover', 'oberteile', D_ST, 'ganz', 24, FEIN, g(0.62), 2, 'rollkragenshirt', P.strick);    // 21,49
t('Off-Shoulder-Pullover', 'oberteile', D_ST, 'winter', 28, STRICK, g(0.25), 2, 'offshoulder', P.strick);      // 25,49
t('Netzstrickpullover', 'oberteile', U_ST, 'ganz', 33, STRICK, g(0.29), 2, 'pullover', P.strick);         // 29,99
t('Henley-Pullover', 'oberteile', H_ST, 'winter', 33, STRICK, g(0.71), 2, 'feinstrickpullover', P.strick);         // 29,99
t('V-Pullover', 'oberteile', U_ST, 'winter', 28, FEIN, g(1), 2, 'vpullover', P.strick);                     // 24,99
t('Strickcape', 'jacken', D_JA, 'winter', 29, ['Merino', 'Kaschmir', 'Polyester'], g(0.8), 2, 'poncho', P.capes); // 25,99
// ───────────── Sweat
t('Sweatjacke', 'oberteile', U, 'ganz', 33, BW, g(0.44), 2, 't_ziphoodie', P.pulli);                         // 29,99
t('Sweat-Troyer', 'oberteile', U, 'winter', 36, BW, g(0.48), 2, 'troyer', P.pulli);                    // 32,99
t('Kurzarm-Sweatshirt', 'oberteile', H, 'sommer', 25, BW, g(0.27), 1, 'sweatshirt', P.pulli);             // 22,99
t('Off-Shoulder-Sweatshirt', 'oberteile', D, 'ganz', 29, BW, g(0.2), 1, 't_collegesweat', P.pulli);               // 25,99
t('Polo-Sweatshirt', 'oberteile', H, 'winter', 36, BW, g(0.25), 2, 'polo', P.pulli);                   // 32,99
t('Strick-Hoodie', 'oberteile', D_ST, 'winter', 33, STRICK, g(0.33, 0.25, false), 2, 'hoodie', P.pulli);           // 29,99
// ───────────── Cardigans und Westen
t('Bolero', 'oberteile', D_ST, 'ganz', 29, FEIN, g(0.57), 2, 'croppedcardigan', P.cardigan);                         // 25,99
t('Wickeljacke', 'oberteile', D_ST, 'ganz', 29, STRICK, g(0.67), 2, 'strickjacke', P.cardigan);             // 25,99
t('Jeansweste', 'jacken', ['damen.young', 'damen.denim', 'damen.jacken', 'kinder.maedchen'], 'sommer', 30, DENIM, g(0.33), 2, 'jeansjacke', P.westen);                   // 27,49
t('Weste', 'jacken', D_JA, 'ganz', 25, ['Leinen', 'Viskose', 'Polyester'], g(0.75), 2, 'strickweste', P.westen);     // 21,99
t('Kunstfellweste', 'jacken', D_JA, 'winter', 33, ['Polyester'], g(0.5), 2, 't_sherpajacke', P.westen);        // 29,99

for (const e of L) Q33_ZUORDNUNG.set(e.typ, e.zg);
// Baby-Tee der Referenz = vorhandener Babytee (Q27); er galt wegen „Baby…“ im Namen als Kinderartikel und war für Teens unsichtbar.
Q33_ZUORDNUNG.set('Babytee', TY);

export const NAMEN: readonly string[] = L.map((e) => e.typ);
export const TYPEN: SortimentTyp<string>[] = L.map(({ zg: _zg, ...e }) => e);

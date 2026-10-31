// Q40: neue Artikeltypen Jacken, Schuhe, Wäsche aus dem Referenzsortiment (Wurf 4, auftraege/wurf4/daten/q40-typen.csv).
// Bild (auftraege/wurf4/bilder-neu.md, Abschnitt 1): bildOffen bis zur Abnahme durch Ummo, bis dahin die nächstliegende vorhandene
// Silhouette (PLATZHALTER); die eigenen Bilder liefern die Bildpakete B01–B30. Anlass-Typen (daten/anlass-zuordnung.csv) tragen `anlass`
// und stehen damit zusätzlich im Ast Anlass (Q37).
// Zielgruppen: Kinder/Teens/Young ausdrücklich über Q33_ZUORDNUNG (Spalte zielgruppen der CSV), Adults über mitte ≥ 0,4,
// Best Ager bleiben außen vor (reif < 0,4, die Referenz hat keine 50+-Ketten). Preis (mitte) am Preismedian, Eigenmarke
// leicht darüber. Nur Auswahl, nicht im Startsortiment (Kalibrierung neutral). Materialien der Engine: Kunstleder und Kunstfell
// → Polyester, Wildleder → Leder, Spitze/Mesh/Satin → Polyester oder Seide.
import { G, type SortimentTyp } from './basis';
import { bildWurf4 } from './bilder-wurf4';
import type { AnlassId } from '../anlass';
import { Q33_ZUORDNUNG } from './q33-zielgruppen';
import type { BaumKategorie } from '../produkt-sortiment';

export const NAMEN = [
  // Wäsche
  'String', 'Push-up-BH', 'Schlafshirt', 'Sportsocken', 'Tanga', 'Balconette-BH', 'Panty', 'Schlafshorts', 'Bralette', 'Brazilian-Slip',
  'Negligee', 'Schlaftop', 'Pyjama-Oberteil', 'Klebe-BH', 'Longline-BH', 'Strumpfhalter',
  // Jacken
  'Blouson', 'Jacke', 'Kunstfelljacke', 'Workerjacke', 'Fliegerjacke', 'Military-Jacke', 'Kapuzenjacke', 'Wildlederjacke', 'Racing-Jacke',
  'Peplum-Jacke', 'Sakko',
  // Schuhe
  'Sandalette', 'Sneakerina', 'Mary-Jane-Ballerina', 'Slouch-Stiefel', 'Barfuß-Sneaker', 'Cowboystiefel', 'Slingback-Ballerina',
  'Cowboy-Stiefelette', 'Slouch-Stiefelette', 'Sock-Boot', 'Bikerstiefel', 'Reitstiefel', 'Trail-Sneaker', 'Keilstiefelette', 'Loafer-Mule',
  'Tabi-Ballerina', 'Trouser-Boots', 'Peeptoe-Stiefel',
] as const;

type N = (typeof NAMEN)[number];
type T = SortimentTyp<N>;
type Z = 'teens' | 'young';
const TY: Z[] = ['teens', 'young'], Y: Z[] = ['young'];

/** Nächstliegende vorhandene Silhouette je Typ (render/src/kit/mode/silhouetten.json), nur bis das Bildpaket abgenommen ist.
 * Keine Silhouette mit Bindung an Kinder; Damentypen nicht an Herren gebunden. */
const PLATZHALTER: Record<N, string> = {
  String: 'spitzenslip', Tanga: 'slip', Panty: 'taillenslip', 'Brazilian-Slip': 'slip', 'Push-up-BH': 'bh', 'Balconette-BH': 'spitzenbh',
  Bralette: 'sportbh', 'Klebe-BH': 'bh', 'Longline-BH': 'minimizerbh', Strumpfhalter: 'shapewear', Schlafshirt: 'nachthemd',
  Schlafshorts: 'kurzpyjama', Schlaftop: 'traegertop', Negligee: 'nachthemd', 'Pyjama-Oberteil': 'pyjama', Sportsocken: 't_tennissocken',
  Blouson: 'bomberjacke', Jacke: 'overshirt', Kunstfelljacke: 'teddyjacke', Workerjacke: 'harringtonjacke', Fliegerjacke: 'lederjacke',
  'Military-Jacke': 'fieldjacket', Kapuzenjacke: 'hoodie', Wildlederjacke: 't_kunstlederjacke', 'Racing-Jacke': 'varsityjacke',
  'Peplum-Jacke': 'lederjacke', Sakko: 'sakko',
  Sandalette: 'riemchensandale', Sneakerina: 'ballerina', 'Mary-Jane-Ballerina': 'ballerina', 'Slingback-Ballerina': 'ballerina',
  'Tabi-Ballerina': 'ballerina', 'Barfuß-Sneaker': 'slipon', 'Trail-Sneaker': 'trekkingschuh', 'Loafer-Mule': 'mule', 'Slouch-Stiefel': 'stiefel',
  Cowboystiefel: 'stiefel', Bikerstiefel: 'stiefel', Reitstiefel: 'stiefel', 'Cowboy-Stiefelette': 'stiefelette', 'Slouch-Stiefelette': 'stiefelette',
  'Sock-Boot': 'stiefelette', Keilstiefelette: 'stiefelette', 'Trouser-Boots': 'chelseaboot', 'Peeptoe-Stiefel': 'overknee',
};
/** Anlass laut daten/anlass-zuordnung.csv (Grundtyp in der Referenz für den Anlass gelistet). */
const ANLASS: Partial<Record<N, readonly AnlassId[]>> = {
  Sakko: ['abiball', 'tanzschulball', 'konfirmation', 'feier'],
  Sandalette: ['abiball', 'tanzschulball', 'feier'],
  'Sock-Boot': ['abiball', 'tanzschulball', 'feier'],
  'Klebe-BH': ['zubehoer'],
};
const L: { t: T; zg: Z[] }[] = [];
let pfad: readonly [BaumKategorie, string] = ['waesche', 'Unterwäsche'];
const ast = (k: BaumKategorie, u: string) => { pfad = [k, u]; };
const t = (typ: N, kategorie: T['kategorie'], wgs: T['wgs'], saison: T['saison'], preis: number,
  materialien: readonly T['materialien'][number][], gruppe: T['gruppe'], aufwand: number, zg: Z[]): void => {
  const anlass = ANLASS[typ];
  L.push({ t: { typ, kategorie, wgs, saison, preis, materialien: [...materialien], gruppe, aufwand, ...bildWurf4(typ, PLATZHALTER[typ]), pfad, ...(anlass ? { anlass } : {}) }, zg });
};

const PE = ['Polyester'] as const, PB = ['Polyester', 'Baumwolle'] as const, BW = ['Baumwolle', 'Bio-Baumwolle'] as const;
const LE = ['Leder'] as const, LP = ['Leder', 'Polyester'] as const;

// ── Wäsche (Spalte zielgruppen: String, Tanga, Push-up, Balconette, Negligee, Klebe-, Longline-BH, Strumpfhalter ohne Teens)
ast('waesche', 'Unterwäsche');
t('String', 'waesche', ['waesche.tag'], 'ganz', 9, PB, G(0, 0.9, 0.55, 0.15), 1, Y);
t('Tanga', 'waesche', ['waesche.tag'], 'ganz', 7, PB, G(0, 0.9, 0.6, 0.2), 1, Y);
t('Panty', 'waesche', ['waesche.tag'], 'ganz', 10, ['Baumwolle', 'Polyester'], G(0, 0.85, 0.8, 0.35), 1, TY);
t('Brazilian-Slip', 'waesche', ['waesche.tag'], 'ganz', 9, ['Baumwolle', 'Polyester'], G(0, 0.9, 0.7, 0.3), 1, TY);
ast('waesche', 'BHs');
t('Push-up-BH', 'waesche', ['waesche.mieder'], 'ganz', 15, PB, G(0, 0.9, 0.7, 0.3), 2, Y);
t('Balconette-BH', 'waesche', ['waesche.mieder'], 'ganz', 15, PB, G(0, 0.85, 0.7, 0.35), 2, Y);
t('Bralette', 'waesche', ['waesche.mieder'], 'ganz', 10, ['Baumwolle', 'Polyester'], G(0, 0.95, 0.5, 0.15), 1, TY);
t('Klebe-BH', 'waesche', ['waesche.mieder'], 'ganz', 12, PE, G(0, 0.85, 0.7, 0.25), 1, Y);
t('Longline-BH', 'waesche', ['waesche.mieder'], 'ganz', 16, PB, G(0, 0.85, 0.6, 0.2), 2, Y);
ast('waesche', 'Miederwaren');
t('Strumpfhalter', 'waesche', ['waesche.mieder'], 'ganz', 10, PE, G(0, 0.8, 0.55, 0.15), 1, Y);
ast('waesche', 'Nachtwäsche');
t('Schlafshirt', 'waesche', ['waesche.nacht'], 'ganz', 15, ['Baumwolle', 'Viskose'], G(0, 0.95, 0.55, 0.35), 1, TY);
t('Schlafshorts', 'waesche', ['waesche.nacht'], 'sommer', 10, ['Baumwolle', 'Viskose'], G(0, 0.95, 0.45, 0.2), 1, TY);
t('Schlaftop', 'waesche', ['waesche.nacht'], 'sommer', 12, ['Baumwolle', 'Viskose'], G(0, 0.95, 0.6, 0.25), 1, TY);
t('Negligee', 'waesche', ['waesche.nacht'], 'ganz', 19, ['Seide', 'Polyester'], G(0, 0.8, 0.75, 0.35), 2, Y);
t('Pyjama-Oberteil', 'waesche', ['waesche.nacht'], 'ganz', 19, ['Baumwolle', 'Viskose', 'Seide'], G(0, 0.8, 0.75, 0.35), 1, TY);
ast('waesche', 'Strümpfe');
t('Sportsocken', 'waesche', ['waesche.struempfe'], 'ganz', 9, BW, G(0, 0.95, 0.7, 0.3), 1, TY);

// ── Jacken (Kapuzen- und Racing-Jacke ohne Adults)
ast('jacken', 'Jacken');
t('Blouson', 'jacken', ['herren.jacken', 'damen.jacken'], 'ganz', 49, LP, G(0, 0.95, 0.6, 0.2), 2, TY);
t('Jacke', 'jacken', ['damen.jacken', 'damen.young'], 'ganz', 55, ['Polyester', 'Baumwolle', 'Denim'], G(0, 0.95, 0.65, 0.25), 2, TY);
t('Kunstfelljacke', 'jacken', ['damen.jacken', 'damen.young'], 'winter', 59, PE, G(0, 0.95, 0.5, 0.15), 2, TY);
t('Workerjacke', 'jacken', ['herren.jacken', 'damen.jacken'], 'ganz', 69, ['Baumwolle', 'Denim'], G(0, 0.95, 0.45, 0.2), 2, TY);
t('Fliegerjacke', 'jacken', ['damen.jacken', 'herren.jacken'], 'winter', 69, LP, G(0, 0.9, 0.75, 0.35), 3, TY);
t('Military-Jacke', 'jacken', ['damen.jacken'], 'ganz', 55, ['Baumwolle', 'Polyester'], G(0, 0.9, 0.6, 0.25), 2, TY);
t('Kapuzenjacke', 'jacken', ['herren.jacken', 'damen.young'], 'ganz', 55, ['Baumwolle', 'Denim'], G(0, 0.95, 0.3, 0.05), 1, TY);
t('Wildlederjacke', 'jacken', ['damen.jacken'], 'ganz', 119, LE, G(0, 0.85, 0.8, 0.35), 3, TY);
t('Racing-Jacke', 'jacken', ['herren.jacken'], 'ganz', 65, LP, G(0, 0.95, 0.3, 0.05), 2, TY);
t('Peplum-Jacke', 'jacken', ['damen.jacken'], 'ganz', 49, PB, G(0, 0.85, 0.65, 0.3), 2, TY);
ast('jacken', 'Blazer und Sakkos');
t('Sakko', 'jacken', ['herren.business', 'herren.jacken'], 'ganz', 49, ['Polyester', 'Merino', 'Viskose'], G(0, 0.7, 0.9, 0.35), 2, TY);

// ── Schuhe
ast('schuhe', 'Sommerschuhe');
t('Sandalette', 'schuhe', ['accessoires.damenschuhe'], 'sommer', 35, LP, G(0, 0.9, 0.85, 0.35), 2, TY);
ast('schuhe', 'Sneaker');
t('Sneakerina', 'schuhe', ['accessoires.damenschuhe'], 'ganz', 35, ['Polyester', 'Leder'], G(0, 0.95, 0.6, 0.2), 1, TY);
t('Barfuß-Sneaker', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe'], 'ganz', 45, ['Polyester', 'Leder'], G(0, 0.9, 0.7, 0.35), 2, TY);
t('Trail-Sneaker', 'schuhe', ['accessoires.damenschuhe', 'accessoires.herrenschuhe'], 'ganz', 49, LP, G(0, 0.95, 0.7, 0.3), 2, TY);
ast('schuhe', 'Halbschuhe');
t('Mary-Jane-Ballerina', 'schuhe', ['accessoires.damenschuhe'], 'ganz', 35, LE, G(0, 0.9, 0.65, 0.35), 1, TY);
t('Slingback-Ballerina', 'schuhe', ['accessoires.damenschuhe'], 'sommer', 39, LE, G(0, 0.85, 0.85, 0.35), 1, TY);
t('Tabi-Ballerina', 'schuhe', ['accessoires.damenschuhe'], 'ganz', 39, LE, G(0, 0.95, 0.6, 0.2), 2, TY);
ast('schuhe', 'Pumps und Mules');
t('Loafer-Mule', 'schuhe', ['accessoires.damenschuhe'], 'ganz', 45, LE, G(0, 0.85, 0.8, 0.35), 2, TY);
ast('schuhe', 'Stiefel und Boots');
t('Slouch-Stiefel', 'schuhe', ['accessoires.damenschuhe'], 'winter', 69, LP, G(0, 0.9, 0.7, 0.3), 2, TY);
t('Cowboystiefel', 'schuhe', ['accessoires.damenschuhe'], 'winter', 69, LE, G(0, 0.9, 0.6, 0.3), 3, TY);
t('Cowboy-Stiefelette', 'schuhe', ['accessoires.damenschuhe'], 'ganz', 65, LE, G(0, 0.85, 0.8, 0.35), 2, TY);
t('Slouch-Stiefelette', 'schuhe', ['accessoires.damenschuhe'], 'winter', 69, LE, G(0, 0.85, 0.8, 0.35), 2, TY);
t('Sock-Boot', 'schuhe', ['accessoires.damenschuhe'], 'ganz', 45, PE, G(0, 0.85, 0.8, 0.35), 2, TY);
t('Bikerstiefel', 'schuhe', ['accessoires.damenschuhe'], 'winter', 75, LE, G(0, 0.9, 0.7, 0.3), 3, TY);
t('Reitstiefel', 'schuhe', ['accessoires.damenschuhe'], 'winter', 79, LE, G(0, 0.75, 0.85, 0.35), 3, TY);
t('Keilstiefelette', 'schuhe', ['accessoires.damenschuhe'], 'winter', 55, LP, G(0, 0.85, 0.75, 0.35), 2, TY);
t('Trouser-Boots', 'schuhe', ['accessoires.damenschuhe'], 'winter', 55, LP, G(0, 0.9, 0.7, 0.3), 2, TY);
t('Peeptoe-Stiefel', 'schuhe', ['accessoires.damenschuhe'], 'ganz', 69, ['Polyester', 'Leder', 'Denim'], G(0, 0.9, 0.65, 0.25), 2, TY);

for (const e of L) Q33_ZUORDNUNG.set(e.t.typ, e.zg);
// Reihenfolge der Datei: nach Häufigkeit im Referenzsortiment innerhalb der Kategorie
export const TYPEN: T[] = L.map((e) => e.t);

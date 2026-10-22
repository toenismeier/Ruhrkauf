// Q28: neue Artikeltypen Schuhe, Taschen, Accessoires, Wäsche (63), Bilder aus render/src/kit/mode/erweiterung-q28.js.
// pfad: Baumkategorie und Unterkategorie ausdrücklich, weil sortimentsPfad Namen wie „Bademantel“ (Mantel),
// „Nachthemd“/„Unterhemd“ (Hemd), „Boxershorts“ (Shorts) und „Kinder-…“ sonst falsch einsortiert.
import { G, type SortimentTyp } from './basis';

export const NAMEN = [
  // Schuhe (21)
  'Chunky-Sneaker', 'Kinder-Klettsneaker', 'Lauflernschuh', 'Kinder-Gummistiefel', 'Gummistiefel', 'Kinder-Winterstiefel', 'Overknee-Stiefel',
  'Schnürboots', 'Combat-Boots', 'Mule', 'Pantolette', 'Riemchensandale', 'Hausschuh', 'Kinder-Hausschuh', 'Mokassin', 'Bootsschuh',
  'Derby-Schuh', 'Budapester', 'Slingpumps', 'Kinder-Ballerina', 'Trekkingschuh',
  // Taschen (10)
  'Mini-Bag', 'Gürteltasche', 'Kinderrucksack', 'Schultertasche', 'Abendtasche', 'Kabinentrolley', 'Herren-Geldbörse', 'Schlüsseletui',
  'Strandtasche', 'Sporttasche',
  // Accessoires (14)
  'Sonnenbrille', 'Kinder-Sonnenbrille', 'Halskette', 'Ohrringe', 'Armband', 'Haarreif', 'Regenschirm', 'Fliege', 'Einstecktuch', 'Nickituch',
  'Beanie', 'Kinder-Mütze-Schal-Set', 'Strohhut', 'Panamahut',
  // Wäsche und Nacht (18)
  'Slip', 'Spitzenslip', 'Taillenslip', 'Retropants', 'Boxershorts', 'Unterhemd', 'Spitzen-BH', 'Sport-BH', 'Shapewear-Body', 'Strumpfhose',
  'Kinder-Strumpfhose', 'Socken-Set', 'Sneakersocken', 'Kniestrümpfe', 'Nachthemd', 'Bademantel', 'Kinder-Bademantel', 'Kurzpyjama',
] as const;

const DS = 'accessoires.damenschuhe', HS = 'accessoires.herrenschuhe', KS = 'kinder.schuhe', LW = 'accessoires.lederwaren', SM = 'accessoires.schmuck';

export const TYPEN: SortimentTyp<(typeof NAMEN)[number]>[] = [
  // ── Schuhe
  { typ: 'Chunky-Sneaker', kategorie: 'schuhe', pfad: ['schuhe', 'Sneaker'], wgs: [DS, HS, 'sportschuhe.sneaker'], saison: 'ganz', preis: 89, materialien: ['Leder', 'Polyester'], gruppe: G(0.4, 1, 0.5, 0.1), aufwand: 2, bild: { silhouette: 'chunkysneaker' } },
  { typ: 'Kinder-Klettsneaker', kategorie: 'schuhe', pfad: ['schuhe', 'Kinderschuhe'], wgs: [KS], saison: 'ganz', preis: 39, materialien: ['Leder', 'Polyester'], gruppe: G(1, 0, 0, 0), aufwand: 1, bild: { silhouette: 'lauflernschuh' } },
  { typ: 'Lauflernschuh', kategorie: 'schuhe', pfad: ['schuhe', 'Kinderschuhe'], wgs: [KS, 'kinder.baby'], saison: 'ganz', preis: 35, materialien: ['Leder'], gruppe: G(1, 0, 0, 0), aufwand: 2, bild: { silhouette: 'lauflernschuh' } },
  { typ: 'Kinder-Gummistiefel', kategorie: 'schuhe', pfad: ['schuhe', 'Kinderschuhe'], wgs: [KS], saison: 'winter', preis: 25, materialien: ['Polyester'], gruppe: G(1, 0, 0, 0), aufwand: 1, bild: { silhouette: 'gummistiefel' } },
  { typ: 'Gummistiefel', kategorie: 'schuhe', pfad: ['schuhe', 'Stiefel und Boots'], wgs: [DS, HS], saison: 'winter', preis: 39, materialien: ['Polyester'], gruppe: G(0.2, 0.6, 0.8, 0.6), aufwand: 1, bild: { silhouette: 'gummistiefel' } },
  { typ: 'Kinder-Winterstiefel', kategorie: 'schuhe', pfad: ['schuhe', 'Kinderschuhe'], wgs: [KS], saison: 'winter', preis: 49, materialien: ['Polyester', 'Leder'], gruppe: G(1, 0, 0, 0), aufwand: 2, bild: { silhouette: 'winterstiefel' } },
  { typ: 'Overknee-Stiefel', kategorie: 'schuhe', pfad: ['schuhe', 'Stiefel und Boots'], wgs: [DS], saison: 'winter', preis: 149, materialien: ['Leder', 'Polyester'], gruppe: G(0, 0.8, 0.6, 0.1), aufwand: 3, bild: { silhouette: 'overknee' } },
  { typ: 'Schnürboots', kategorie: 'schuhe', pfad: ['schuhe', 'Stiefel und Boots'], wgs: [DS, HS], saison: 'winter', preis: 119, materialien: ['Leder'], gruppe: G(0.2, 0.9, 0.7, 0.3), aufwand: 2, bild: { silhouette: 'schnuerstiefel' } },
  { typ: 'Combat-Boots', kategorie: 'schuhe', pfad: ['schuhe', 'Stiefel und Boots'], wgs: [DS, 'damen.young'], saison: 'winter', preis: 99, materialien: ['Leder', 'Polyester'], gruppe: G(0.3, 1, 0.4, 0.05), aufwand: 2, bild: { silhouette: 'schnuerstiefel' } },
  { typ: 'Mule', kategorie: 'schuhe', pfad: ['schuhe', 'Pumps und Mules'], wgs: [DS], saison: 'sommer', preis: 69, materialien: ['Leder'], gruppe: G(0, 0.6, 0.85, 0.6), aufwand: 2, bild: { silhouette: 'mule' } },
  { typ: 'Pantolette', kategorie: 'schuhe', pfad: ['schuhe', 'Sommerschuhe'], wgs: [DS, HS], saison: 'sommer', preis: 39, materialien: ['Leder', 'Polyester'], gruppe: G(0.3, 0.8, 0.8, 0.7), aufwand: 1, bild: { silhouette: 'sandale' } },
  { typ: 'Riemchensandale', kategorie: 'schuhe', pfad: ['schuhe', 'Sommerschuhe'], wgs: [DS], saison: 'sommer', preis: 59, materialien: ['Leder'], gruppe: G(0.2, 0.85, 0.85, 0.6), aufwand: 1, bild: { silhouette: 'sandale' } },
  { typ: 'Hausschuh', kategorie: 'schuhe', pfad: ['schuhe', 'Hausschuhe'], wgs: [DS, HS], saison: 'winter', preis: 29, materialien: ['Merino', 'Polyester'], gruppe: G(0.3, 0.4, 0.7, 0.95), aufwand: 1, bild: { silhouette: 'hausschuh' } },
  { typ: 'Kinder-Hausschuh', kategorie: 'schuhe', pfad: ['schuhe', 'Kinderschuhe'], wgs: [KS], saison: 'winter', preis: 19, materialien: ['Polyester', 'Merino'], gruppe: G(1, 0, 0, 0), aufwand: 1, bild: { silhouette: 'hausschuh' } },
  { typ: 'Mokassin', kategorie: 'schuhe', pfad: ['schuhe', 'Halbschuhe'], wgs: [DS, HS], saison: 'sommer', preis: 69, materialien: ['Leder'], gruppe: G(0, 0.4, 0.8, 0.9), aufwand: 2, bild: { silhouette: 'slipper' } },
  { typ: 'Bootsschuh', kategorie: 'schuhe', pfad: ['schuhe', 'Halbschuhe'], wgs: [HS, DS], saison: 'sommer', preis: 79, materialien: ['Leder'], gruppe: G(0, 0.4, 0.85, 0.85), aufwand: 2, bild: { silhouette: 'slipper' } },
  { typ: 'Derby-Schuh', kategorie: 'schuhe', pfad: ['schuhe', 'Halbschuhe'], wgs: [HS, 'herren.business'], saison: 'ganz', preis: 99, materialien: ['Leder'], gruppe: G(0, 0.5, 0.85, 0.8), aufwand: 2, bild: { silhouette: 'businessschuh' } },
  { typ: 'Budapester', kategorie: 'schuhe', pfad: ['schuhe', 'Halbschuhe'], wgs: [HS, 'herren.business'], saison: 'ganz', preis: 139, materialien: ['Leder'], gruppe: G(0, 0.3, 0.8, 0.9), aufwand: 3, bild: { silhouette: 'businessschuh' } },
  { typ: 'Slingpumps', kategorie: 'schuhe', pfad: ['schuhe', 'Pumps und Mules'], wgs: [DS], saison: 'sommer', preis: 89, materialien: ['Leder'], gruppe: G(0, 0.5, 0.85, 0.6), aufwand: 2, bild: { silhouette: 'pumps' } },
  { typ: 'Kinder-Ballerina', kategorie: 'schuhe', pfad: ['schuhe', 'Kinderschuhe'], wgs: [KS], saison: 'sommer', preis: 29, materialien: ['Leder', 'Polyester'], gruppe: G(1, 0, 0, 0), aufwand: 1, bild: { silhouette: 'ballerina' } },
  { typ: 'Trekkingschuh', kategorie: 'schuhe', pfad: ['schuhe', 'Outdoor und Wandern'], wgs: [HS, DS, 'outdoor.ausruestung'], saison: 'ganz', preis: 109, materialien: ['Leder', 'Polyester'], gruppe: G(0.3, 0.5, 0.85, 0.85), aufwand: 2, bild: { silhouette: 'wanderschuh' } },
  // ── Taschen
  { typ: 'Mini-Bag', kategorie: 'accessoires', pfad: ['accessoires', 'Taschen'], wgs: [LW, 'damen.young'], saison: 'ganz', preis: 59, materialien: ['Leder', 'Polyester'], gruppe: G(0, 0.95, 0.6, 0.2), aufwand: 2, bild: { silhouette: 'minibag' } },
  { typ: 'Gürteltasche', kategorie: 'accessoires', pfad: ['accessoires', 'Taschen'], wgs: [LW, 'sporttextil.freizeit'], saison: 'ganz', preis: 29, materialien: ['Polyester', 'Leder'], gruppe: G(0.4, 1, 0.6, 0.2), aufwand: 1, bild: { silhouette: 'guerteltasche' } },
  { typ: 'Kinderrucksack', kategorie: 'accessoires', pfad: ['accessoires', 'Taschen'], wgs: [LW, 'kinder.maedchen', 'kinder.jungen'], saison: 'ganz', preis: 29, materialien: ['Polyester'], gruppe: G(1, 0, 0, 0), aufwand: 1, bild: { silhouette: 'kinderrucksack' } },
  { typ: 'Schultertasche', kategorie: 'accessoires', pfad: ['accessoires', 'Taschen'], wgs: [LW], saison: 'ganz', preis: 79, materialien: ['Leder', 'Polyester'], gruppe: G(0, 0.6, 0.85, 0.85), aufwand: 2, bild: { silhouette: 'handtasche' } },
  { typ: 'Abendtasche', kategorie: 'accessoires', pfad: ['accessoires', 'Taschen'], wgs: [LW], saison: 'ganz', preis: 49, materialien: ['Seide', 'Leder', 'Polyester'], gruppe: G(0, 0.7, 0.85, 0.75), aufwand: 2, bild: { silhouette: 'clutch' } },
  { typ: 'Kabinentrolley', kategorie: 'accessoires', pfad: ['accessoires', 'Reisegepäck'], wgs: ['accessoires.reise'], saison: 'ganz', preis: 89, materialien: ['Polyester'], gruppe: G(0.2, 0.7, 0.85, 0.85), aufwand: 3, bild: { silhouette: 'reisetasche' } },
  { typ: 'Herren-Geldbörse', kategorie: 'accessoires', pfad: ['accessoires', 'Kleinlederwaren'], wgs: [LW], saison: 'ganz', preis: 39, materialien: ['Leder'], gruppe: G(0, 0.6, 0.85, 0.85), aufwand: 1, bild: { silhouette: 'portemonnaie', farbe: 'braun' } },
  { typ: 'Schlüsseletui', kategorie: 'accessoires', pfad: ['accessoires', 'Kleinlederwaren'], wgs: [LW], saison: 'ganz', preis: 19, materialien: ['Leder'], gruppe: G(0, 0.5, 0.8, 0.85), aufwand: 1, bild: { silhouette: 'kartenetui' } },
  { typ: 'Strandtasche', kategorie: 'accessoires', pfad: ['accessoires', 'Taschen'], wgs: [LW], saison: 'sommer', preis: 35, materialien: ['Baumwolle', 'Leinen'], gruppe: G(0.3, 0.85, 0.85, 0.7), aufwand: 1, bild: { silhouette: 'shopper', muster: 'streifen' } },
  { typ: 'Sporttasche', kategorie: 'accessoires', pfad: ['accessoires', 'Taschen'], wgs: [LW, 'sport.geraete', 'accessoires.reise'], saison: 'ganz', preis: 45, materialien: ['Polyester'], gruppe: G(0.6, 0.85, 0.75, 0.4), aufwand: 1, bild: { silhouette: 'weekender' } },
  // ── Accessoires
  { typ: 'Sonnenbrille', kategorie: 'accessoires', pfad: ['accessoires', 'Sonnenbrillen'], wgs: [SM, LW], saison: 'sommer', preis: 39, materialien: ['Polyester'], gruppe: G(0.2, 0.95, 0.85, 0.7), aufwand: 2, bild: { silhouette: 'sonnenbrille' } },
  { typ: 'Kinder-Sonnenbrille', kategorie: 'accessoires', pfad: ['accessoires', 'Sonnenbrillen'], wgs: [SM, 'kinder.maedchen', 'kinder.jungen'], saison: 'sommer', preis: 15, materialien: ['Polyester'], gruppe: G(1, 0, 0, 0), aufwand: 1, bild: { silhouette: 'sonnenbrille' } },
  { typ: 'Halskette', kategorie: 'accessoires', pfad: ['accessoires', 'Schmuck'], wgs: [SM], saison: 'ganz', preis: 39, materialien: ['Polyester'], gruppe: G(0.2, 0.85, 0.85, 0.8), aufwand: 2, bild: { silhouette: 'halskette' } },
  { typ: 'Ohrringe', kategorie: 'accessoires', pfad: ['accessoires', 'Schmuck'], wgs: [SM], saison: 'ganz', preis: 25, materialien: ['Polyester'], gruppe: G(0.2, 0.9, 0.85, 0.75), aufwand: 2, bild: { silhouette: 'ohrringe' } },
  { typ: 'Armband', kategorie: 'accessoires', pfad: ['accessoires', 'Schmuck'], wgs: [SM], saison: 'ganz', preis: 29, materialien: ['Polyester', 'Leder'], gruppe: G(0.4, 0.9, 0.8, 0.7), aufwand: 1, bild: { silhouette: 'armband' } },
  { typ: 'Haarreif', kategorie: 'accessoires', pfad: ['accessoires', 'Haarschmuck'], wgs: [SM, 'kinder.maedchen'], saison: 'ganz', preis: 15, materialien: ['Polyester', 'Viskose'], gruppe: G(0.8, 0.9, 0.5, 0.3), aufwand: 1, bild: { silhouette: 'haarreif' } },
  { typ: 'Regenschirm', kategorie: 'accessoires', pfad: ['accessoires', 'Schirme'], wgs: [LW], saison: 'ganz', preis: 25, materialien: ['Polyester'], gruppe: G(0.4, 0.7, 0.85, 0.9), aufwand: 1, bild: { silhouette: 'regenschirm' } },
  { typ: 'Fliege', kategorie: 'accessoires', pfad: ['accessoires', 'Krawatten und Fliegen'], wgs: ['herren.business', LW], saison: 'ganz', preis: 29, materialien: ['Seide', 'Polyester'], gruppe: G(0.2, 0.7, 0.7, 0.6), aufwand: 1, bild: { silhouette: 'fliege' } },
  { typ: 'Einstecktuch', kategorie: 'accessoires', pfad: ['accessoires', 'Krawatten und Fliegen'], wgs: ['herren.business'], saison: 'ganz', preis: 19, materialien: ['Seide', 'Leinen'], gruppe: G(0, 0.4, 0.8, 0.85), aufwand: 1, bild: { silhouette: 'seidentuch' } },
  { typ: 'Nickituch', kategorie: 'accessoires', pfad: ['accessoires', 'Tücher und Schals'], wgs: [LW], saison: 'sommer', preis: 15, materialien: ['Seide', 'Viskose', 'Baumwolle'], gruppe: G(0.2, 0.85, 0.7, 0.6), aufwand: 1, bild: { silhouette: 'seidentuch' } },
  { typ: 'Beanie', kategorie: 'accessoires', pfad: ['accessoires', 'Mützen und Hüte'], wgs: [LW, 'damen.young', 'herren.casual'], saison: 'winter', preis: 19, materialien: ['Merino', 'Baumwolle', 'Polyester'], gruppe: G(0.6, 1, 0.6, 0.3), aufwand: 1, bild: { silhouette: 'beanie' } },
  { typ: 'Kinder-Mütze-Schal-Set', kategorie: 'accessoires', pfad: ['accessoires', 'Mützen und Hüte'], wgs: ['kinder.maedchen', 'kinder.jungen', 'kinder.baby'], saison: 'winter', preis: 25, materialien: ['Merino', 'Baumwolle', 'Polyester'], gruppe: G(1, 0, 0, 0), aufwand: 1, bild: { silhouette: 'muetzeschalset' } },
  { typ: 'Strohhut', kategorie: 'accessoires', pfad: ['accessoires', 'Mützen und Hüte'], wgs: [LW], saison: 'sommer', preis: 35, materialien: ['Leinen', 'Baumwolle'], gruppe: G(0.3, 0.7, 0.85, 0.85), aufwand: 1, bild: { silhouette: 'strohhut' } },
  { typ: 'Panamahut', kategorie: 'accessoires', pfad: ['accessoires', 'Mützen und Hüte'], wgs: [LW, 'herren.casual'], saison: 'sommer', preis: 59, materialien: ['Leinen'], gruppe: G(0, 0.4, 0.8, 0.9), aufwand: 2, bild: { silhouette: 'strohhut', farbe: 'creme' } },
  // ── Wäsche und Nacht
  { typ: 'Slip', kategorie: 'waesche', pfad: ['waesche', 'Unterwäsche'], wgs: ['waesche.tag'], saison: 'ganz', preis: 12, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Viskose'], gruppe: G(0.2, 0.85, 0.85, 0.8), aufwand: 1, bild: { silhouette: 'slip' } },
  { typ: 'Spitzenslip', kategorie: 'waesche', pfad: ['waesche', 'Unterwäsche'], wgs: ['waesche.tag'], saison: 'ganz', preis: 19, materialien: ['Polyester', 'Viskose', 'Seide'], gruppe: G(0, 0.85, 0.85, 0.6), aufwand: 2, bild: { silhouette: 'slip' } },
  { typ: 'Taillenslip', kategorie: 'waesche', pfad: ['waesche', 'Unterwäsche'], wgs: ['waesche.tag', 'waesche.mieder'], saison: 'ganz', preis: 15, materialien: ['Baumwolle', 'Bio-Baumwolle'], gruppe: G(0, 0.3, 0.7, 0.95), aufwand: 1, bild: { silhouette: 'slip', farbe: 'beige' } },
  { typ: 'Retropants', kategorie: 'waesche', pfad: ['waesche', 'Herrenwäsche'], wgs: ['waesche.herren'], saison: 'ganz', preis: 25, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Viskose'], gruppe: G(0.4, 0.95, 0.85, 0.6), aufwand: 1, bild: { silhouette: 'unterwaesche' } },
  { typ: 'Boxershorts', kategorie: 'waesche', pfad: ['waesche', 'Herrenwäsche'], wgs: ['waesche.herren'], saison: 'ganz', preis: 19, materialien: ['Baumwolle', 'Bio-Baumwolle'], gruppe: G(0.3, 0.7, 0.85, 0.85), aufwand: 1, bild: { silhouette: 'boxershorts' } },
  { typ: 'Unterhemd', kategorie: 'waesche', pfad: ['waesche', 'Herrenwäsche'], wgs: ['waesche.herren', 'waesche.tag'], saison: 'ganz', preis: 15, materialien: ['Baumwolle', 'Bio-Baumwolle'], gruppe: G(0.5, 0.4, 0.75, 0.95), aufwand: 1, bild: { silhouette: 'unterhemd' } },
  { typ: 'Spitzen-BH', kategorie: 'waesche', pfad: ['waesche', 'BHs'], wgs: ['waesche.tag'], saison: 'ganz', preis: 39, materialien: ['Polyester', 'Viskose', 'Seide'], gruppe: G(0, 0.85, 0.85, 0.6), aufwand: 2, bild: { silhouette: 'bh' } },
  { typ: 'Sport-BH', kategorie: 'waesche', pfad: ['waesche', 'BHs'], wgs: ['waesche.tag', 'sport.bekleidung'], saison: 'ganz', preis: 35, materialien: ['Polyester'], gruppe: G(0.1, 0.95, 0.85, 0.5), aufwand: 2, bild: { silhouette: 'sportbh' } },
  { typ: 'Shapewear-Body', kategorie: 'waesche', pfad: ['waesche', 'Miederwaren'], wgs: ['waesche.mieder'], saison: 'ganz', preis: 49, materialien: ['Polyester', 'Viskose'], gruppe: G(0, 0.3, 0.75, 0.9), aufwand: 2, bild: { silhouette: 'shapewear' } },
  { typ: 'Strumpfhose', kategorie: 'waesche', pfad: ['waesche', 'Strümpfe'], wgs: ['waesche.struempfe'], saison: 'winter', preis: 9, materialien: ['Polyester', 'Baumwolle'], gruppe: G(0.2, 0.85, 0.85, 0.85), aufwand: 1, bild: { silhouette: 'strumpfhose' } },
  { typ: 'Kinder-Strumpfhose', kategorie: 'waesche', pfad: ['waesche', 'Strümpfe'], wgs: ['waesche.struempfe', 'kinder.maedchen'], saison: 'winter', preis: 7, materialien: ['Baumwolle', 'Bio-Baumwolle'], gruppe: G(1, 0, 0, 0), aufwand: 1, bild: { silhouette: 'strumpfhose', farbe: 'rosa' } },
  { typ: 'Socken-Set', kategorie: 'waesche', pfad: ['waesche', 'Strümpfe'], wgs: ['waesche.struempfe'], saison: 'ganz', preis: 15, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Merino'], gruppe: G(0.6, 0.8, 0.85, 0.85), aufwand: 1, bild: { silhouette: 'sockenset' } },
  { typ: 'Sneakersocken', kategorie: 'waesche', pfad: ['waesche', 'Strümpfe'], wgs: ['waesche.struempfe', 'sport.bekleidung'], saison: 'sommer', preis: 9, materialien: ['Baumwolle', 'Polyester'], gruppe: G(0.6, 0.95, 0.8, 0.4), aufwand: 1, bild: { silhouette: 'socken', farbe: 'weiß' } },
  { typ: 'Kniestrümpfe', kategorie: 'waesche', pfad: ['waesche', 'Strümpfe'], wgs: ['waesche.struempfe'], saison: 'winter', preis: 9, materialien: ['Merino', 'Baumwolle'], gruppe: G(0.6, 0.5, 0.6, 0.85), aufwand: 1, bild: { silhouette: 'socken' } },
  { typ: 'Nachthemd', kategorie: 'waesche', pfad: ['waesche', 'Nachtwäsche'], wgs: ['waesche.nacht'], saison: 'ganz', preis: 39, materialien: ['Baumwolle', 'Viskose', 'Seide'], gruppe: G(0.2, 0.2, 0.6, 0.95), aufwand: 1, bild: { silhouette: 'nachthemd' } },
  { typ: 'Bademantel', kategorie: 'waesche', pfad: ['waesche', 'Nachtwäsche'], wgs: ['waesche.nacht', 'wohnen.heimtextil'], saison: 'ganz', preis: 59, materialien: ['Baumwolle', 'Bio-Baumwolle'], gruppe: G(0.3, 0.6, 0.85, 0.9), aufwand: 2, bild: { silhouette: 'bademantel' } },
  { typ: 'Kinder-Bademantel', kategorie: 'waesche', pfad: ['waesche', 'Nachtwäsche'], wgs: ['waesche.nacht', 'kinder.maedchen', 'kinder.jungen'], saison: 'ganz', preis: 35, materialien: ['Baumwolle'], gruppe: G(1, 0, 0, 0), aufwand: 1, bild: { silhouette: 'bademantel', farbe: 'hellblau' } },
  { typ: 'Kurzpyjama', kategorie: 'waesche', pfad: ['waesche', 'Nachtwäsche'], wgs: ['waesche.nacht'], saison: 'sommer', preis: 35, materialien: ['Baumwolle', 'Viskose'], gruppe: G(0.5, 0.8, 0.75, 0.7), aufwand: 1, bild: { silhouette: 'pyjama' } },
];

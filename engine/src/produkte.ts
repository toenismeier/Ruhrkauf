// Produktentwicklung für Eigenmarken: Artikeltypen je Kategorie, Farbe, Material, Preislage, Entwicklung mit
// Dauer und Budget, Sterne-Bewertung, Trendbericht je Saison, Sortimentskapazität. Produkte bestimmen Nachfrage
// und Marge der Marke in ihren Warengruppen (relativ zum Start, damit die Ausgangslage unverändert bleibt).
// Vertrag: ../VORSTAND-MARKETING-VERTRAG.md, Abschnitt 3.
import type { GameState, GruppeId, Haus } from './types';
import { PRODUKT_ZIELGRUPPEN, ZIELGRUPPE_PRODUKT, sortimentsBaum, type ProduktZielgruppe, type BaumAst, type BaumKategorie } from './produkt-sortiment';
export { PRODUKT_ZIELGRUPPEN, sortimentsBaum } from './produkt-sortiment';
export type { ProduktZielgruppe } from './produkt-sortiment';
import { clamp, eur, melde, mio, normal, waehle, zufall, type RngHalter } from './util';
import { WG, saisonId, saisonName, type WgId } from './einkauf';
import { BESCHAFFUNG, eigenmarkeAnteil, istVerkaufsaktiv, mehrmarge, passungWg, passungHaus, ZIELGRUPPEN_TEXT, type Eigenmarke, type EmKategorie, type Preislage, type Stil } from './eigenmarken';
import { hqAktualisiere } from './hq';
import { SORTIMENT_TYPEN, type ArtikelBild, type SortimentName } from './sortiment';
export { SORTIMENT_TYPEN, type ArtikelBild, type SortimentTyp, type SortimentName } from './sortiment';

// ---------------------------------------------------------------------------------------------
// Katalog (abgestimmt mit der Grafik: render/src/kit/produktbild.js zeichnet genau diese Typen und Farben)
// ---------------------------------------------------------------------------------------------

/** Zusätzliche Schnitt- und Sortimentsvarianten für acht Eigenmarken-Sparten. */
export const ZUSATZ_ARTIKEL = {
  damen: ['A-Linien-Kleid', 'Wickelkleid', 'Tunikabluse', 'Oversize-Bluse', 'Bootcut-Jeans', 'Culotte', 'Plisseerock', 'Bleistiftrock', 'Feinstrickpullover', 'Longcardigan', 'Trenchcoat', 'Bouclé-Jacke'],
  herren: ['Slim-Fit-Hemd', 'Regular-Fit-Hemd', 'Oxford-Hemd', 'Henley-Shirt', 'Rundhalspullover', 'Rollkragenpullover', 'Cargo-Hose', 'Anzughose', 'Bermuda-Shorts', 'Stricksakko', 'Wollmantel', 'Leinen-Sakko'],
  kinder: ['Kinder-Jeansshorts', 'Latzhose', 'Kinder-Sweatshirt', 'Kinder-Regenjacke', 'Kinder-Leggings', 'Kinder-Softshelljacke', 'Kinder-Polo', 'Kinder-Pyjama', 'Kinder-Strickpullover', 'Kinder-Tüllrock', 'Kinder-Sonnenhut', 'Kinder-Jogginghose'],
  schuhe: ['Loafer', 'Ballerina', 'Chelsea-Boot', 'Stiefelette', 'Sandale', 'Espadrille', 'Slipper', 'Schnürschuh', 'Business-Schuh', 'Wanderschuh', 'Plateau-Sneaker', 'Winterstiefel'],
  accessoires: ['Umhängetasche', 'Crossbody-Tasche', 'Shopper', 'Clutch', 'Portemonnaie', 'Rucksack', 'Weekender', 'Kartenetui', 'Seidentuch', 'Krawatte', 'Handschuhe', 'Reisetasche'],
  heimtextil: ['Spannbettlaken', 'Bettbezug', 'Kopfkissenbezug', 'Wohndecke', 'Tagesdecke', 'Badetuch', 'Gästehandtuch', 'Waschlappen', 'Duschvorleger', 'Tischläufer', 'Tischdecke', 'Dekokissen'],
  haushalt: ['Geschirrtuch', 'Schürze', 'Topflappen', 'Tischset', 'Serviette', 'Vorratsdose', 'Trinkbecher', 'Servierschale', 'Salatschüssel', 'Kerzenhalter', 'Aufbewahrungskorb', 'Dekotablett'],
  beauty: ['Mascara', 'Foundation', 'Concealer', 'Rouge', 'Lidschatten', 'Nagellack', 'Handcreme', 'Gesichtsserum', 'Reinigungsgel', 'Duschgel', 'Körperlotion', 'Eau de Toilette'],
} as const;
export type Produktsparte = keyof typeof ZUSATZ_ARTIKEL;
export type ArtikelTyp =
  | (typeof ZUSATZ_ARTIKEL)[Produktsparte][number]
  | 'Jeans-Shorts' | 'Kaschmirpullover' | 'Strickjacke' | 'Bluse' | 'Hemd' | 'T-Shirt' | 'Poloshirt' | 'Kleid' | 'Rock' | 'Chino' | 'Jeans'
  | 'Mantel' | 'Steppjacke' | 'Blazer' | 'Sneaker' | 'Pumps' | 'Stiefel' | 'Pyjama' | 'Unterwäsche' | 'BH' | 'Socken' | 'Schal' | 'Mütze'
  | 'Handtasche' | 'Gürtel' | 'Bettwäsche' | 'Handtuch' | 'Kissen' | 'Tasse' | 'Vase' | 'Lippenstift' | 'Creme' | 'Parfum'
  | 'Kinderbody' | 'Kinderkleid' | 'Plüschtier' | 'Top' | 'Crop-Top' | 'Stoffhose' | 'Leinenhose' | 'Cargohose' | 'Minirock' | 'A-Linien-Rock'
  | SortimentName;

export type Farbe =
  | 'weiß' | 'creme' | 'sand' | 'beige' | 'camel' | 'cognac' | 'braun' | 'grau' | 'anthrazit' | 'schwarz' | 'marine' | 'hellblau' | 'jeansblau'
  | 'petrol' | 'mintgrün' | 'salbei' | 'olive' | 'flaschengrün' | 'senf' | 'gelb' | 'orange' | 'koralle' | 'rot' | 'bordeaux' | 'rosa'
  | 'altrosa' | 'flieder' | 'lila';

export type Material = 'Baumwolle' | 'Bio-Baumwolle' | 'Leinen' | 'Kaschmir' | 'Merino' | 'Denim' | 'Leder' | 'Polyester' | 'Seide' | 'Viskose';

export type ProduktKategorie = 'oberteile' | 'unterteile' | 'jacken' | 'schuhe' | 'waesche' | 'accessoires' | 'home' | 'beauty' | 'kinder';
export type TrendGruppe = 'kinder' | 'jung' | 'mitte' | 'reif';
export type TypSaison = 'sommer' | 'winter' | 'ganz';

export const PRODUKT_KATEGORIEN: Record<ProduktKategorie, string> = {
  oberteile: 'Oberteile', unterteile: 'Hosen, Röcke, Kleider', jacken: 'Jacken und Mäntel', schuhe: 'Schuhe', waesche: 'Wäsche und Nacht',
  accessoires: 'Accessoires', home: 'Home', beauty: 'Beauty', kinder: 'Baby und Kind',
};

export const TREND_GRUPPEN: Record<TrendGruppe, string> = { kinder: 'Kinder', jung: 'Junge Kundschaft bis 29', mitte: '30 bis 49', reif: '50 plus und 70 plus' };

export const FARBEN: Record<Farbe, string> = {
  'weiß': '#f7f5f0', creme: '#efe6d2', sand: '#d8c6a3', beige: '#cdb894', camel: '#b98a53', cognac: '#9a5a2c', braun: '#6b4a32', grau: '#9a9a9a',
  anthrazit: '#3f4247', schwarz: '#1f1f22', marine: '#1f2f4f', hellblau: '#a9c8e6', jeansblau: '#4f6f9a', petrol: '#1f5f68', 'mintgrün': '#a8dcc4',
  salbei: '#9cae8f', olive: '#6f7040', 'flaschengrün': '#1f4a35', senf: '#c9a13a', gelb: '#f0d04a', orange: '#e8843a', koralle: '#ec7d6a',
  rot: '#c8323a', bordeaux: '#6e1f2e', rosa: '#f2b8c6', altrosa: '#c99a9a', flieder: '#c4b0d8', lila: '#7a4f9a',
};
const FARBLISTE = Object.keys(FARBEN) as Farbe[];

/** Material: Preis- und Kostenfaktor gegen Baumwolle, Wertigkeit 0..1. */
export const MATERIALIEN: Record<Material, { preis: number; kosten: number; wertig: number }> = {
  Baumwolle: { preis: 1, kosten: 1, wertig: 0.45 },
  'Bio-Baumwolle': { preis: 1.12, kosten: 1.14, wertig: 0.6 },
  Leinen: { preis: 1.2, kosten: 1.2, wertig: 0.6 },
  Kaschmir: { preis: 2.3, kosten: 2.36, wertig: 1 },
  Merino: { preis: 1.5, kosten: 1.52, wertig: 0.8 },
  Denim: { preis: 1, kosten: 1, wertig: 0.45 },
  Leder: { preis: 1.6, kosten: 1.62, wertig: 0.8 },
  Polyester: { preis: 0.75, kosten: 0.68, wertig: 0.1 },
  Seide: { preis: 1.9, kosten: 1.94, wertig: 0.95 },
  Viskose: { preis: 0.9, kosten: 0.86, wertig: 0.3 },
};
const MATERIALLISTE = Object.keys(MATERIALIEN) as Material[];

export interface TypDef {
  typ: ArtikelTyp; kategorie: ProduktKategorie; wgs: WgId[]; saison: TypSaison;
  /** Mittlerer Verkaufspreis in € bei Preislage mitte, Baumwolle, Qualität 3. */
  preis: number;
  materialien: Material[];
  /** Passung je Zielgruppe 0..1. */
  gruppe: Record<TrendGruppe, number>;
  /** Entwicklungsaufwand (1 einfach, 3 aufwendig). */
  aufwand: number;
  sparte?: Produktsparte;
  /** Bild aus der Silhouetten-Bibliothek (Q27–Q29); ohne Angabe leitet die Grafik das Bild aus dem Namen ab. */
  bild?: ArtikelBild;
  /** Platz im Sortimentsbaum [Kategorie, Unterkategorie]; ohne Angabe aus dem Namen (sortimentsPfad). */
  pfad?: readonly [BaumKategorie, string];
}

const G = (kinder: number, jung: number, mitte: number, reif: number): Record<TrendGruppe, number> => ({ kinder, jung, mitte, reif });

export const ARTIKELTYPEN: TypDef[] = [
  { typ: 'Jeans-Shorts', kategorie: 'unterteile', wgs: ['damen.denim', 'damen.young', 'herren.casual', 'kinder.maedchen', 'kinder.jungen', 'sporttextil.freizeit'], saison: 'sommer', preis: 35, materialien: ['Denim', 'Bio-Baumwolle', 'Baumwolle'], gruppe: G(0.9, 0.95, 0.55, 0.15), aufwand: 1 },
  { typ: 'Kaschmirpullover', kategorie: 'oberteile', wgs: ['damen.strick', 'herren.strick', 'damen.gg'], saison: 'winter', preis: 79, materialien: ['Kaschmir'], gruppe: G(0.1, 0.45, 0.8, 0.95), aufwand: 2 },
  { typ: 'Strickjacke', kategorie: 'oberteile', wgs: ['damen.strick', 'herren.strick', 'damen.gg', 'kinder.maedchen', 'kinder.jungen'], saison: 'winter', preis: 55, materialien: ['Merino', 'Baumwolle', 'Kaschmir', 'Viskose', 'Polyester'], gruppe: G(0.6, 0.4, 0.7, 0.9), aufwand: 1 },
  { typ: 'Bluse', kategorie: 'oberteile', wgs: ['damen.blusen', 'damen.gg', 'damen.young'], saison: 'ganz', preis: 45, materialien: ['Viskose', 'Seide', 'Baumwolle', 'Leinen', 'Polyester'], gruppe: G(0.1, 0.55, 0.85, 0.85), aufwand: 1 },
  { typ: 'Hemd', kategorie: 'oberteile', wgs: ['herren.hemden', 'herren.business', 'herren.casual'], saison: 'ganz', preis: 45, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Leinen', 'Polyester'], gruppe: G(0.2, 0.55, 0.9, 0.85), aufwand: 1 },
  { typ: 'T-Shirt', kategorie: 'oberteile', wgs: ['damen.blusen', 'herren.casual', 'damen.young', 'kinder.jungen', 'kinder.maedchen', 'sporttextil.freizeit', 'sport.bekleidung'], saison: 'sommer', preis: 19, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Viskose', 'Polyester', 'Leinen'], gruppe: G(0.95, 0.95, 0.7, 0.45), aufwand: 1 },
  { typ: 'Poloshirt', kategorie: 'oberteile', wgs: ['herren.casual', 'herren.hemden', 'damen.blusen', 'sport.bekleidung'], saison: 'sommer', preis: 35, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Polyester'], gruppe: G(0.5, 0.45, 0.8, 0.85), aufwand: 1 },
  { typ: 'Kleid', kategorie: 'unterteile', wgs: ['damen.kleider', 'damen.young', 'damen.gg'], saison: 'sommer', preis: 59, materialien: ['Viskose', 'Baumwolle', 'Leinen', 'Seide', 'Polyester'], gruppe: G(0.2, 0.9, 0.85, 0.6), aufwand: 2 },
  { typ: 'Rock', kategorie: 'unterteile', wgs: ['damen.hosen', 'damen.gg', 'damen.young'], saison: 'ganz', preis: 45, materialien: ['Viskose', 'Baumwolle', 'Denim', 'Leder', 'Polyester'], gruppe: G(0.2, 0.6, 0.75, 0.7), aufwand: 1 },
  { typ: 'Chino', kategorie: 'unterteile', wgs: ['herren.hosen', 'damen.hosen', 'herren.casual'], saison: 'ganz', preis: 55, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Leinen'], gruppe: G(0.3, 0.6, 0.9, 0.85), aufwand: 1 },
  { typ: 'Jeans', kategorie: 'unterteile', wgs: ['damen.denim', 'herren.casual', 'herren.hosen', 'kinder.jungen', 'kinder.maedchen', 'damen.young'], saison: 'ganz', preis: 59, materialien: ['Denim', 'Bio-Baumwolle'], gruppe: G(0.85, 0.95, 0.85, 0.55), aufwand: 2 },
  { typ: 'Mantel', kategorie: 'jacken', wgs: ['damen.jacken', 'herren.jacken'], saison: 'winter', preis: 149, materialien: ['Merino', 'Kaschmir', 'Polyester', 'Baumwolle', 'Leder'], gruppe: G(0.2, 0.5, 0.8, 0.95), aufwand: 3 },
  { typ: 'Steppjacke', kategorie: 'jacken', wgs: ['damen.jacken', 'herren.jacken', 'outdoor.bekleidung', 'kinder.jungen', 'kinder.maedchen'], saison: 'winter', preis: 99, materialien: ['Polyester', 'Baumwolle'], gruppe: G(0.9, 0.85, 0.8, 0.6), aufwand: 2 },
  { typ: 'Blazer', kategorie: 'jacken', wgs: ['damen.jacken', 'herren.business', 'damen.blusen'], saison: 'ganz', preis: 99, materialien: ['Merino', 'Leinen', 'Viskose', 'Polyester', 'Baumwolle'], gruppe: G(0.05, 0.55, 0.9, 0.8), aufwand: 2 },
  { typ: 'Sneaker', kategorie: 'schuhe', wgs: ['accessoires.damenschuhe', 'accessoires.herrenschuhe', 'kinder.schuhe'], saison: 'ganz', preis: 69, materialien: ['Leder', 'Baumwolle', 'Polyester'], gruppe: G(0.9, 0.95, 0.8, 0.55), aufwand: 2 },
  { typ: 'Pumps', kategorie: 'schuhe', wgs: ['accessoires.damenschuhe'], saison: 'ganz', preis: 79, materialien: ['Leder', 'Polyester'], gruppe: G(0, 0.55, 0.8, 0.5), aufwand: 2 },
  { typ: 'Stiefel', kategorie: 'schuhe', wgs: ['accessoires.damenschuhe', 'accessoires.herrenschuhe', 'kinder.schuhe'], saison: 'winter', preis: 119, materialien: ['Leder', 'Polyester'], gruppe: G(0.6, 0.7, 0.8, 0.75), aufwand: 2 },
  { typ: 'Pyjama', kategorie: 'waesche', wgs: ['waesche.nacht'], saison: 'ganz', preis: 39, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Seide', 'Viskose', 'Polyester'], gruppe: G(0.8, 0.5, 0.75, 0.9), aufwand: 1 },
  { typ: 'Unterwäsche', kategorie: 'waesche', wgs: ['waesche.tag', 'waesche.herren'], saison: 'ganz', preis: 19, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Viskose', 'Polyester', 'Seide'], gruppe: G(0.6, 0.8, 0.85, 0.8), aufwand: 1 },
  { typ: 'BH', kategorie: 'waesche', wgs: ['waesche.tag'], saison: 'ganz', preis: 35, materialien: ['Polyester', 'Baumwolle', 'Seide', 'Viskose'], gruppe: G(0, 0.8, 0.85, 0.75), aufwand: 2 },
  { typ: 'Socken', kategorie: 'waesche', wgs: ['waesche.struempfe'], saison: 'ganz', preis: 9, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Merino', 'Polyester'], gruppe: G(0.8, 0.75, 0.8, 0.8), aufwand: 1 },
  { typ: 'Schal', kategorie: 'accessoires', wgs: ['accessoires.lederwaren'], saison: 'winter', preis: 29, materialien: ['Kaschmir', 'Merino', 'Viskose', 'Seide', 'Polyester', 'Baumwolle'], gruppe: G(0.3, 0.6, 0.8, 0.9), aufwand: 1 },
  { typ: 'Mütze', kategorie: 'accessoires', wgs: ['accessoires.lederwaren', 'kinder.baby'], saison: 'winter', preis: 19, materialien: ['Merino', 'Baumwolle', 'Kaschmir', 'Polyester'], gruppe: G(0.85, 0.8, 0.6, 0.6), aufwand: 1 },
  { typ: 'Handtasche', kategorie: 'accessoires', wgs: ['accessoires.lederwaren'], saison: 'ganz', preis: 89, materialien: ['Leder', 'Polyester', 'Baumwolle'], gruppe: G(0, 0.7, 0.85, 0.8), aufwand: 2 },
  { typ: 'Gürtel', kategorie: 'accessoires', wgs: ['accessoires.lederwaren'], saison: 'ganz', preis: 29, materialien: ['Leder', 'Polyester'], gruppe: G(0.2, 0.6, 0.8, 0.8), aufwand: 1 },
  { typ: 'Bettwäsche', kategorie: 'home', wgs: ['wohnen.bett'], saison: 'ganz', preis: 49, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Leinen', 'Seide', 'Polyester'], gruppe: G(0.6, 0.6, 0.9, 0.85), aufwand: 1 },
  { typ: 'Handtuch', kategorie: 'home', wgs: ['wohnen.heimtextil'], saison: 'ganz', preis: 15, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Leinen'], gruppe: G(0.5, 0.6, 0.85, 0.85), aufwand: 1 },
  { typ: 'Kissen', kategorie: 'home', wgs: ['wohnen.heimtextil', 'wohnen.deko'], saison: 'ganz', preis: 25, materialien: ['Baumwolle', 'Leinen', 'Viskose', 'Polyester', 'Seide'], gruppe: G(0.5, 0.75, 0.85, 0.75), aufwand: 1 },
  { typ: 'Tasse', kategorie: 'home', wgs: ['wohnen.tisch'], saison: 'ganz', preis: 9, materialien: ['Polyester'], gruppe: G(0.5, 0.8, 0.8, 0.7), aufwand: 1 },
  { typ: 'Vase', kategorie: 'home', wgs: ['wohnen.deko'], saison: 'ganz', preis: 29, materialien: ['Polyester'], gruppe: G(0.1, 0.6, 0.85, 0.85), aufwand: 1 },
  { typ: 'Lippenstift', kategorie: 'beauty', wgs: ['beauty.pflege'], saison: 'ganz', preis: 15, materialien: ['Polyester'], gruppe: G(0, 0.9, 0.8, 0.6), aufwand: 2 },
  { typ: 'Creme', kategorie: 'beauty', wgs: ['beauty.pflege', 'beauty.drogerie'], saison: 'ganz', preis: 19, materialien: ['Polyester'], gruppe: G(0.3, 0.7, 0.85, 0.9), aufwand: 2 },
  { typ: 'Parfum', kategorie: 'beauty', wgs: ['beauty.pflege'], saison: 'ganz', preis: 45, materialien: ['Polyester'], gruppe: G(0, 0.85, 0.85, 0.75), aufwand: 3 },
  { typ: 'Kinderbody', kategorie: 'kinder', wgs: ['kinder.baby'], saison: 'ganz', preis: 12, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Merino'], gruppe: G(1, 0, 0, 0), aufwand: 1 },
  { typ: 'Kinderkleid', kategorie: 'kinder', wgs: ['kinder.maedchen', 'kinder.baby'], saison: 'sommer', preis: 25, materialien: ['Baumwolle', 'Bio-Baumwolle', 'Viskose', 'Leinen'], gruppe: G(1, 0, 0, 0), aufwand: 1 },
  { typ: 'Plüschtier', kategorie: 'kinder', wgs: ['kinder.baby'], saison: 'ganz', preis: 19, materialien: ['Polyester', 'Bio-Baumwolle', 'Baumwolle'], gruppe: G(1, 0, 0, 0), aufwand: 1 },
];
/** Zwölf eigenständige Modelle je Sparte, zusätzliche Farbe-, Material- und Preisvarianten
 * ergeben sich aus den vorhandenen Assistent-Reglern. Alte Artikel und Startsortimente bleiben unverändert. */
const ZUSATZ_WG: Record<Produktsparte, WgId[]> = {
  damen: ['damen.kleider', 'damen.blusen', 'damen.denim', 'damen.strick', 'damen.hosen', 'damen.jacken', 'damen.gg'],
  herren: ['herren.hemden', 'herren.casual', 'herren.hosen', 'herren.strick', 'herren.business', 'herren.jacken'],
  kinder: ['kinder.maedchen', 'kinder.jungen', 'kinder.baby'],
  schuhe: ['accessoires.damenschuhe', 'accessoires.herrenschuhe', 'kinder.schuhe'],
  accessoires: ['accessoires.lederwaren'],
  heimtextil: ['wohnen.heimtextil', 'wohnen.bett'],
  haushalt: ['wohnen.tisch', 'wohnen.deko'],
  beauty: ['beauty.pflege', 'beauty.drogerie'],
};
const ZUSATZ_MATERIAL: Record<Produktsparte, Material[]> = {
  damen: ['Baumwolle', 'Viskose', 'Leinen', 'Merino', 'Kaschmir', 'Seide'],
  herren: ['Baumwolle', 'Bio-Baumwolle', 'Leinen', 'Merino', 'Kaschmir'],
  kinder: ['Bio-Baumwolle', 'Baumwolle', 'Denim', 'Merino'],
  schuhe: ['Leder', 'Baumwolle', 'Polyester'],
  accessoires: ['Leder', 'Baumwolle', 'Leinen', 'Seide', 'Polyester'],
  heimtextil: ['Baumwolle', 'Bio-Baumwolle', 'Leinen', 'Viskose'],
  haushalt: ['Baumwolle', 'Leinen', 'Polyester'],
  beauty: ['Polyester'],
};
const SPARTEN_KATEGORIE: Record<Produktsparte, ProduktKategorie> = {
  damen:'oberteile', herren:'oberteile', kinder:'kinder', schuhe:'schuhe',
  accessoires:'accessoires', heimtextil:'home', haushalt:'home', beauty:'beauty',
};
const SPARTEN_PREIS: Record<Produktsparte, number> = {
  damen: 49, herren: 49, kinder: 25, schuhe: 79, accessoires: 39, heimtextil: 35, haushalt: 18, beauty: 19,
};
/** Die Warengruppe und Produktkategorie passen je Schnitt zur realen Sparte. */
const BEKLEIDUNG_DEF: Record<'damen' | 'herren', { kategorie: ProduktKategorie; wg: WgId }[]> = {
  damen: [
    {kategorie:'unterteile',wg:'damen.kleider'}, {kategorie:'unterteile',wg:'damen.kleider'},
    {kategorie:'oberteile',wg:'damen.blusen'}, {kategorie:'oberteile',wg:'damen.blusen'},
    {kategorie:'unterteile',wg:'damen.denim'}, {kategorie:'unterteile',wg:'damen.hosen'},
    {kategorie:'unterteile',wg:'damen.hosen'}, {kategorie:'unterteile',wg:'damen.hosen'},
    {kategorie:'oberteile',wg:'damen.strick'}, {kategorie:'oberteile',wg:'damen.strick'},
    {kategorie:'jacken',wg:'damen.jacken'}, {kategorie:'jacken',wg:'damen.jacken'},
  ],
  herren: [
    {kategorie:'oberteile',wg:'herren.hemden'}, {kategorie:'oberteile',wg:'herren.hemden'},
    {kategorie:'oberteile',wg:'herren.hemden'}, {kategorie:'oberteile',wg:'herren.casual'},
    {kategorie:'oberteile',wg:'herren.strick'}, {kategorie:'oberteile',wg:'herren.strick'},
    {kategorie:'unterteile',wg:'herren.hosen'}, {kategorie:'unterteile',wg:'herren.hosen'},
    {kategorie:'unterteile',wg:'herren.casual'}, {kategorie:'jacken',wg:'herren.business'},
    {kategorie:'jacken',wg:'herren.jacken'}, {kategorie:'jacken',wg:'herren.business'},
  ],
};

export const ZUSATZ_ARTIKELTYPEN: TypDef[] = (Object.keys(ZUSATZ_ARTIKEL) as Produktsparte[]).flatMap((sparte) =>
  ZUSATZ_ARTIKEL[sparte].map((typ, index) => {
    const wgs = ZUSATZ_WG[sparte];
    const bekleidung = (sparte === 'damen' || sparte === 'herren') ? BEKLEIDUNG_DEF[sparte][index] : undefined;
    const kategorie = bekleidung?.kategorie ?? SPARTEN_KATEGORIE[sparte];
    const wg = bekleidung ? [bekleidung.wg] : sparte === 'schuhe' ? wgs : [wgs[index % wgs.length]];
    return {
      typ, sparte, kategorie, wgs: wg,
      saison: index % 3 === 0 ? 'sommer' : index % 3 === 1 ? 'winter' : 'ganz',
      preis: SPARTEN_PREIS[sparte] + index * 2,
      materialien: [...ZUSATZ_MATERIAL[sparte]],
      gruppe: sparte === 'kinder' ? G(1, 0.1, 0.1, 0.1) : G(0.2, 0.75, 0.85, 0.85),
      aufwand: 1 + (index % 3),
    } satisfies TypDef;
  })
);
const BASIS_ARTIKELTYPEN = [...ARTIKELTYPEN];
ARTIKELTYPEN.push(...ZUSATZ_ARTIKELTYPEN);
// Q11 ergänzt ausschließlich neue Artikeltypen. Die Reihenfolge und Parameter alter Typen bleiben gleich.
export const Q11_ARTIKELTYPEN: TypDef[] = [
  { ...ARTIKELTYPEN.find((t) => t.typ === 'T-Shirt')!, typ: 'Top', preis: 24, wgs: ['damen.blusen', 'damen.young'] },
  { ...ARTIKELTYPEN.find((t) => t.typ === 'T-Shirt')!, typ: 'Crop-Top', preis: 22, wgs: ['damen.young', 'damen.blusen'], gruppe: G(0.2, 1, 0.5, 0.1) },
  { ...ARTIKELTYPEN.find((t) => t.typ === 'Chino')!, typ: 'Stoffhose', preis: 65, wgs: ['damen.hosen', 'herren.hosen'] },
  { ...ARTIKELTYPEN.find((t) => t.typ === 'Chino')!, typ: 'Leinenhose', preis: 69, materialien: ['Leinen'], saison: 'sommer' },
  { ...ARTIKELTYPEN.find((t) => t.typ === 'Chino')!, typ: 'Cargohose', preis: 59, wgs: ['damen.young', 'herren.casual'] },
  { ...ARTIKELTYPEN.find((t) => t.typ === 'Rock')!, typ: 'Minirock', preis: 39, wgs: ['damen.young', 'damen.hosen'] },
  { ...ARTIKELTYPEN.find((t) => t.typ === 'Rock')!, typ: 'A-Linien-Rock', preis: 49, wgs: ['damen.hosen', 'damen.young'] },
];
ARTIKELTYPEN.push(...Q11_ARTIKELTYPEN);
// Q27–Q29: neue Artikeltypen der Bild-Chats (engine/src/sortiment), immer hinten angehängt.
ARTIKELTYPEN.push(...(SORTIMENT_TYPEN as TypDef[]));
export const TYP: Record<string, TypDef> = Object.fromEntries(ARTIKELTYPEN.map((t) => [t.typ, t]));

/** Grundfarben je Zielgruppe (unabhängig vom Trend). */
const FARB_BASIS: Record<TrendGruppe, Farbe[]> = {
  kinder: ['gelb', 'rot', 'hellblau', 'rosa', 'mintgrün', 'orange', 'jeansblau', 'weiß', 'koralle'],
  jung: ['schwarz', 'weiß', 'jeansblau', 'rosa', 'lila', 'olive', 'grau', 'koralle'],
  mitte: ['marine', 'weiß', 'olive', 'salbei', 'schwarz', 'cognac', 'sand', 'petrol', 'grau'],
  reif: ['marine', 'camel', 'grau', 'bordeaux', 'creme', 'sand', 'anthrazit', 'flaschengrün', 'beige'],
};

export const PREISLAGE_FAKTOR: Record<Preislage, number> = { einstieg: 0.65, mitte: 1, gehoben: 1.7 };
export const DAUER_STUFEN = [4, 8, 12, 24, 48] as const;

export const PRODUKT_PARAM = {
  /** Kapazität je Marke und Produktkategorie nach wirksamer Stufe der Produktentwicklung 0..3. */
  kapazitaet: [3, 5, 6, 8] as const,
  /** Entwicklungsbudget, das ein Artikel je Aufwandspunkt bei Preislage mitte braucht (Sättigung). */
  budgetBedarf: 60_000,
  /** Sterne verlieren nach einem Jahr im Sortiment bis zu 0,75 (über zwei weitere Jahre). */
  alterung: 0.75,
  /** Nachfragegewicht eines Produkts: 0,375 + 0,25 × Sterne (2,5 Sterne = 1, 5 Sterne = 1,6). */
  gewichtBasis: 0.375, gewichtJeStern: 0.25,
  /** Preiselastizität des Umsatzes gegen den Normpreis. */
  preisElastizitaet: 1.1,
  /** Faktor auf die Markennachfrage je WG, begrenzt. */
  faktorMin: 0.5, faktorMax: 2,
  /** Startanteil, wenn ein Produkt in eine WG ohne Markenanteil kommt. */
  anteilNeu: 0.1,
};

// ---------------------------------------------------------------------------------------------
// Datenmodell
// ---------------------------------------------------------------------------------------------

export type ProduktStatus = 'entwicklung' | 'sortiment' | 'pausiert' | 'ausgelistet';

export interface SterneTeile { zielgruppe: number; trend: number; preisQualitaet: number; entwicklung: number; team: number }

export interface Produkt {
  id: string; marke: string; typ: ArtikelTyp; name: string; farbe: Farbe; material: Material; stil: Stil;
  zielgruppe?: ProduktZielgruppe; // Q11; alte Produkte bleiben ohne eigene Zielgruppe wirtschaftlich unverändert.
  preislage: Preislage; qualitaet: number; wg: WgId; kategorie: ProduktKategorie;
  /** Normpreis (aus Typ, Preislage, Material, Qualität) und aktueller Preis in €. */
  normpreis: number; preis: number; ekStueck: number;
  /** Marge, die die Marke in der WG bei Einführung erwarten durfte (Bezug für den Margeneffekt). */
  margeErwartet: number;
  status: ProduktStatus;
  start: number; dauer: number; budgetWoche: number; fertig: number;
  /** Bewertung bei Einführung (0,5 bis 5) und ihre Teile 0..1; vor Einführung leer. */
  sterne?: number; teile?: SterneTeile;
  /** Teamstärke bei Entwicklungsbeginn (Stufe Produktentwicklung, Fachwissen CPO). */
  team: number;
  seit?: number;
  verkauf: number[]; // Stück je Woche (letzte 13)
  umsatz: number[]; // € je Woche (letzte 13)
  saison: number; // Saison-Id bei Einführung
  basis?: boolean; // Grundsortiment des Produzenten
}

export interface ProdukteStand {
  liste: Produkt[];
  zaehler: number;
  rng: number;
  /** Nachfrage- und Margenbasis je Marke und WG zum Start (Wirkung 1 bzw. 0 = bisherige Kalibrierung). */
  basisF: Record<string, number>;
  basisM: Record<string, number>;
}

export interface ProduktEntwurf {
  marke: string; typ: ArtikelTyp; farbe: Farbe; material: Material; preislage?: Preislage; qualitaet?: number; stil?: Stil;
  dauer: number; budgetWoche: number; name?: string; wg?: WgId; zielgruppe?: ProduktZielgruppe;
}

// ---------------------------------------------------------------------------------------------
// Trend je Saison (deterministisch aus Seed und Saison, eigener Strom)
// ---------------------------------------------------------------------------------------------

export interface TrendSaison { saison: number; name: string; gruppen: Record<TrendGruppe, { farben: Farbe[]; artikel: ArtikelTyp[]; materialien: Material[]; out: Farbe[] }> }

function hashRng(seed: number, sid: number, g: number): RngHalter {
  return { rng: (Math.imul(seed + 0x9e37, 2654435761) ^ Math.imul(sid + 1013, 40503) ^ Math.imul(g + 7, 0x27d4eb2d)) >>> 0 };
}

function ziehe<T>(r: RngHalter, liste: readonly T[], n: number): T[] {
  const pool = [...liste];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(zufall(r) * pool.length), 1)[0]);
  return out;
}

export function trendFuer(s: GameState, sid: number): TrendSaison {
  const sommer = ((sid % 2) + 2) % 2 === 0;
  const gruppen = {} as TrendSaison['gruppen'];
  (Object.keys(TREND_GRUPPEN) as TrendGruppe[]).forEach((g, i) => {
    const r = hashRng(s.seed, sid, i);
    // Die fünf bisherigen Saisontrends müssen exakt gleich bleiben: Startkalibrierung.
    const typen = BASIS_ARTIKELTYPEN.filter((t) => t.gruppe[g] >= 0.5 && (t.saison === 'ganz' || (t.saison === 'sommer') === sommer));
    const basisArtikel = ziehe(r, typen.map((t) => t.typ), 5);
    // Zusätzliche Trends laufen in einem eigenen deterministischen Zufallsstrom und
    // verschieben weder die bisherigen Artikel noch Farben und Materialien.
    const z = hashRng(s.seed, sid, 100 + i);
    const neu = ZUSATZ_ARTIKELTYPEN.filter((t) => t.gruppe[g] >= 0.5 && (t.saison === 'ganz' || (t.saison === 'sommer') === sommer));
    const artikel = [...basisArtikel, ...ziehe(z, neu.map((t) => t.typ), 4)];
    // Trendfarben: zwei aus der Grundpalette der Gruppe, zwei frische von außerhalb
    const basis = FARB_BASIS[g];
    const farben = [...ziehe(r, basis, 2), ...ziehe(r, FARBLISTE.filter((f) => !basis.includes(f)), 2)];
    const out = ziehe(r, FARBLISTE.filter((f) => !farben.includes(f)), 3);
    const mats = ziehe(r, MATERIALLISTE.filter((m) => m !== 'Polyester' || g === 'kinder'), 3);
    gruppen[g] = { farben, artikel, materialien: mats, out };
  });
  return { saison: sid, name: saisonName(s, sid), gruppen };
}

export function trendGruppe(m: Pick<Eigenmarke, 'zielgruppe'>): TrendGruppe {
  if (m.zielgruppe.geschlecht === 'kinder') return 'kinder';
  const a = m.zielgruppe.alter;
  return a === '50+' || a === '70+' ? 'reif' : a === '30-49' ? 'mitte' : 'jung';
}

// ---------------------------------------------------------------------------------------------
// Bewertung
// ---------------------------------------------------------------------------------------------

const PREIS_STUFE: Record<Preislage, number> = { einstieg: 0, mitte: 1, gehoben: 2 };

export function normpreis(typ: TypDef, preislage: Preislage, material: Material, qualitaet: number, zielgruppe?: ProduktZielgruppe): number {
  const p = typ.preis * PREISLAGE_FAKTOR[preislage] * MATERIALIEN[material].preis * (0.85 + 0.05 * qualitaet) * (zielgruppe ? ZIELGRUPPE_PRODUKT[zielgruppe].preis : 1);
  return Math.max(3, Math.round(p) - 0.01);
}

/** Wirksame Stufe der Produktentwicklung (HQ-Abteilung 'produkt'). */
export const produktStufe = (s: GameState): number => clamp(s.hq?.wirkung.produkt ?? 1, 0, 3);

/** Teamstärke 0..1: Stufe Produktentwicklung und Fachwissen CPO. */
export function teamStaerke(s: GameState): number {
  const cpo = s.vorstand?.ressorts.cpo.person;
  return clamp(0.6 * Math.min(1, produktStufe(s) / 2) + 0.4 * (cpo ? cpo.fachwissen / 100 : 0.2), 0, 1);
}


/** Q24: Markenbezogene, deterministische Diagnose. Keine eigenen Designstellen im
 * Spielstand: Teamgröße ist eine aus HQ-Kapazität und Portfolio abgeleitete
 * Designer-Äquivalenz; Kategorieerfahrung basiert auf tatsächlich entwickelten Artikeln.
 * Der zentrierte Leistungswert verändert niemals das bestehende Startsortiment. */
export interface MarkenLeistung {
  wert: number; team: number; zielgruppe: number; trend: number; lieferant: number; hq: number;
  teamgroesse: number; kategorieErfahrung: number;
}
type RohLeistung = Omit<MarkenLeistung, 'wert'> & { roh: number };
const prozent = (x: number): number => Math.round(clamp(x, 0, 1) * 100);

function markenLeistungRoh(s: GameState, m: Eigenmarke, saison: TrendSaison): RohLeistung {
  const liste = (s.produkte?.liste ?? []).filter((p) => p.marke === m.id && p.status !== 'ausgelistet');
  const kategorien = new Map<ProduktKategorie, number>();
  for (const p of liste) kategorien.set(p.kategorie, (kategorien.get(p.kategorie) ?? 0) + 1);
  const erfahren = liste.length ? Math.max(...kategorien.values()) / liste.length : 0;
  const teamgroesse = Math.max(1, Math.round(1 + produktStufe(s) * 2 + Math.min(4, liste.length / 3)));
  const erfahrung = clamp(0.35 + 0.035 * liste.length + 0.2 * erfahren, 0, 1);
  const team = clamp(0.22 + teamgroesse * 0.055 + erfahrung * 0.38, 0, 1);
  const g = trendGruppe(m);
  const zielgruppe = liste.length ? liste.reduce((sum, p) => {
    const t = TYP[p.typ];
    if (!t) return sum + 0.5;
    const ziel = p.zielgruppe ? ZIELGRUPPE_PRODUKT[p.zielgruppe].trend : g;
    const markenFit = ziel === g || (ziel === 'jung' && g === 'mitte') ? 1 : 0.55;
    return sum + t.gruppe[ziel] * markenFit;
  }, 0) / liste.length : 0.5;
  const sTrend = saison.gruppen[g];
  const treffer = liste.length ? liste.reduce((sum, p) =>
    sum + (sTrend.artikel.includes(p.typ) ? 0.5 : 0) + (sTrend.farben.includes(p.farbe) ? 0.3 : 0)
    + (sTrend.materialien.includes(p.material) ? 0.2 : 0), 0) / liste.length : 0.4;
  const trend = clamp(0.35 * treffer + 0.65 * m.stilAktualitaet / 100, 0, 1);
  const lieferant = clamp((m.beschaffung === 'europa' ? 0.76 : m.beschaffung === 'nahost' ? 0.66 : 0.56)
    + 0.055 * (m.qualitaet - 3) + 0.08 * BESCHAFFUNG[m.beschaffung].mehrmarge, 0, 1);
  const hq = clamp(0.25 + 0.14 * produktStufe(s) + 0.1 * (s.hq?.wirkung.einkauf ?? 1), 0, 1);
  const roh = 0.28 * team + 0.25 * zielgruppe + 0.18 * trend + 0.14 * lieferant + 0.15 * hq;
  return { roh, team: prozent(team), zielgruppe: prozent(zielgruppe), trend: prozent(trend),
    lieferant: prozent(lieferant), hq: prozent(hq), teamgroesse, kategorieErfahrung: prozent(erfahrung) };
}

/** Marke zu Marke unterschiedlich. Der arithmetische Markenmittelwert bleibt
 * vor Rundung exakt bei der bisherigen zentralen Teamstärke. */
export function markenLeistung(s: GameState, markeId: string): MarkenLeistung {
  const marken = s.eigenmarken.marken.filter((m) => m.status !== 'eingestellt');
  const saison = trendFuer(s, saisonId(s.woche));
  const daten = marken.map((m) => ({ id: m.id, daten: markenLeistungRoh(s, m, saison) }));
  const mittel = daten.length ? daten.reduce((sum, x) => sum + x.daten.roh, 0) / daten.length : 0;
  const gefunden = daten.find((x) => x.id === markeId)?.daten;
  if (!gefunden) return { wert: prozent(teamStaerke(s)), team: 0, zielgruppe: 0, trend: 0,
    lieferant: 0, hq: 0, teamgroesse: 0, kategorieErfahrung: 0 };
  const { roh, ...teile } = gefunden;
  // Begrenzung ohne Verschiebung des Mittelwerts, auch bei extremen HQ-Stufen.
  const basis = teamStaerke(s);
  const groessteAbweichung = Math.max(0, ...daten.map((x) => Math.abs(x.daten.roh - mittel)));
  const faktor = groessteAbweichung ? Math.min(0.65, Math.min(basis, 1 - basis) / groessteAbweichung) : 0;
  return { wert: prozent(basis + faktor * (roh - mittel)), ...teile };
}

function wgFuer(s: GameState, m: Eigenmarke, t: TypDef, wunsch?: WgId): WgId | undefined {
  const ok = (wg: WgId) => !!WG[wg] && s.basisUmsatz[WG[wg].bereich] !== undefined && passungWg(m, wg) > 0;
  if (wunsch) return t.wgs.includes(wunsch) && ok(wunsch) ? wunsch : undefined;
  return t.wgs.find((wg) => ok(wg) && (m.wgAnteile[wg] ?? 0) > 0) ?? t.wgs.find(ok);
}

/** Teile der Bewertung 0..1. trend = undefined: Trend der Einführungssaison noch unbekannt (neutral). */
export function bewerte(s: GameState, m: Eigenmarke, e: { typ: ArtikelTyp; farbe: Farbe; material: Material; preislage: Preislage; qualitaet: number; dauer: number; budgetWoche: number; zielgruppe?: ProduktZielgruppe }, team: number, trend: TrendSaison | undefined, trendOhne = 0.4): SterneTeile {
  const t = TYP[e.typ];
  const g = e.zielgruppe ? ZIELGRUPPE_PRODUKT[e.zielgruppe].trend : trendGruppe(m);
  const mat = MATERIALIEN[e.material];
  // Zielgruppe: Artikeltyp, Grundfarbe, Wertigkeit des Materials (Reife schätzt Wertiges, Junge sind preisbewusst)
  const farbBasis = FARB_BASIS[g].includes(e.farbe) ? 1 : 0.35;
  const matZiel = g === 'reif' ? mat.wertig : g === 'mitte' ? 0.4 + 0.6 * mat.wertig : g === 'jung' ? 1 - 0.5 * mat.wertig : e.material === 'Bio-Baumwolle' || e.material === 'Baumwolle' || e.material === 'Merino' ? 1 : 0.4;
  const zielgruppe = 0.55 * t.gruppe[g] + 0.25 * farbBasis + 0.2 * matZiel;
  // Trend der Saison
  let tr = trendOhne;
  if (trend) {
    const x = trend.gruppen[g];
    tr = 0.1 + (x.artikel.includes(e.typ) ? 0.4 : 0) + (x.farben.includes(e.farbe) ? 0.35 : 0) + (x.materialien.includes(e.material) ? 0.15 : 0) - (x.out.includes(e.farbe) ? 0.25 : 0);
    const sommer = ((trend.saison % 2) + 2) % 2 === 0;
    if (t.saison !== 'ganz' && (t.saison === 'sommer') !== sommer) tr -= 0.15;
  }
  const trendW = clamp(tr, 0, 1);
  // Preis und Qualität: Preislage passend zur Marke, Qualität passend zur Preislage, Material zur Preislage
  const dp = Math.abs(PREIS_STUFE[e.preislage] - PREIS_STUFE[m.preislage]);
  const qZiel = [2.5, 3.2, 4.3][PREIS_STUFE[e.preislage]];
  const mZiel = [0.3, 0.55, 0.85][PREIS_STUFE[e.preislage]];
  const preisQualitaet = clamp((dp === 0 ? 1 : dp === 1 ? 0.6 : 0.25) * (1 - 0.18 * Math.abs(e.qualitaet - qZiel)) * (1 - 0.5 * Math.abs(mat.wertig - mZiel)), 0, 1);
  // Entwicklung: Budget mal Dauer gegen Aufwand, kurze Entwicklungen sind weniger effizient
  const bedarf = PRODUKT_PARAM.budgetBedarf * t.aufwand * Math.sqrt(PREISLAGE_FAKTOR[e.preislage]);
  const eff = e.budgetWoche * e.dauer * Math.min(1, Math.pow(e.dauer / 12, 0.35));
  const entwicklung = clamp(1 - Math.exp(-eff / bedarf), 0, 1);
  return { zielgruppe: r2(zielgruppe), trend: r2(trendW), preisQualitaet: r2(preisQualitaet), entwicklung: r2(entwicklung), team: r2(team) };
}

const r2 = (x: number): number => Math.round(x * 100) / 100;

export function scoreAus(t: SterneTeile): number {
  return 0.28 * t.zielgruppe + 0.25 * t.trend + 0.15 * t.preisQualitaet + 0.2 * t.entwicklung + 0.12 * t.team;
}

const halbe = (x: number): number => clamp(Math.round(x * 2) / 2, 0.5, 5);
export const sterneAus = (score: number): number => halbe(0.5 + 4.5 * score);

/** Wirksame Sterne mit Alterung (nach einem Jahr im Sortiment). */
export function sterneWirksam(s: GameState, p: Produkt): number {
  if (p.sterne === undefined) return 0;
  const alter = s.woche - (p.seit ?? s.woche);
  return Math.max(0.5, p.sterne - PRODUKT_PARAM.alterung * clamp((alter - 52) / 104, 0, 1));
}

// ---------------------------------------------------------------------------------------------
// Wirkung auf Nachfrage und Marge
// ---------------------------------------------------------------------------------------------

const imSortiment = (p: Produkt): boolean => p.status === 'sortiment';

function gewicht(s: GameState, p: Produkt): number {
  const st = sterneWirksam(s, p);
  return (PRODUKT_PARAM.gewichtBasis + PRODUKT_PARAM.gewichtJeStern * st) * Math.pow(p.normpreis / Math.max(0.5, p.preis), PRODUKT_PARAM.preisElastizitaet);
}

function rohFaktor(s: GameState, markeId: string, wg: WgId): number {
  let sum = 0; let n = 0;
  for (const p of s.produkte.liste) if (p.marke === markeId && p.wg === wg && imSortiment(p)) { sum += gewicht(s, p); n++; }
  if (!n) return 0.6;
  return (sum / n) * Math.min(1.12, 0.7 + 0.15 * n);
}

function rohMarge(s: GameState, markeId: string, wg: WgId): number {
  let sum = 0; let gw = 0;
  for (const p of s.produkte.liste) if (p.marke === markeId && p.wg === wg && imSortiment(p)) {
    const x = gewicht(s, p);
    sum += x * (1 - p.ekStueck / Math.max(0.5, p.preis) - p.margeErwartet);
    gw += x;
  }
  return gw > 0 ? sum / gw : 0;
}

/** Faktor auf die Nachfrage der Marke in der WG (Start = genau 1). */
export function produktNachfrageFaktor(s: GameState, markeId: string, wg: WgId): number {
  const pr = s.produkte;
  if (!pr) return 1;
  const key = `${markeId}|${wg}`;
  const f = rohFaktor(s, markeId, wg) / (pr.basisF[key] ?? 1);
  return clamp(f, PRODUKT_PARAM.faktorMin, PRODUKT_PARAM.faktorMax);
}

/** Altersstruktur des Einzugsgebiets beeinflusst neue, gezielt entwickelte Produkte je Haus.
 * Ohne explizite Produktzielgruppe: exakt 1 (Bestand/Spielstände Version 2 bleiben neutral).
 * Die Hauspassung wird über dieselben Engine-Parameter wie bei den Eigenmarken berechnet. */
export function produktHausFaktor(s: GameState, m: Eigenmarke, wg: WgId, h: Pick<Haus, 'einzug' | 'cluster' | 'region'>): number {
  if (!s.produkte) return 1;
  const liste = s.produkte.liste.filter((p) => p.marke === m.id && p.wg === wg && imSortiment(p));
  if (!liste.some((p) => p.zielgruppe)) return 1;
  const alt = passungHaus(m, h);
  let gewichtet = 0, sum = 0;
  for (const p of liste) {
    const w = gewicht(s, p);
    sum += w;
    // Altprodukte ohne Kennzeichnung übernehmen neutral die Zielgruppe der Marke.
    if (!p.zielgruppe) continue;
    const z = ZIELGRUPPE_PRODUKT[p.zielgruppe];
    const alter = p.zielgruppe === 'bestager' && m.zielgruppe.alter === '70+' ? '70+' : z.alter;
    const ziel = passungHaus({ zielgruppe: { ...m.zielgruppe, alter }, preislage: p.preislage }, h);
    gewichtet += w * (ziel - alt);
  }
  return clamp(1 + 0.8 * gewichtet / Math.max(sum, 0.01), 0.75, 1.25);
}

/** Margenverschiebung der Marke in der WG gegenüber dem Start (Preis, Material, Qualität der Produkte). */
export function produktMargeDelta(s: GameState, markeId: string, wg: WgId): number {
  const pr = s.produkte;
  if (!pr) return 0;
  return clamp(rohMarge(s, markeId, wg) - (pr.basisM[`${markeId}|${wg}`] ?? 0), -0.25, 0.25);
}

// ---------------------------------------------------------------------------------------------
// Produkte anlegen
// ---------------------------------------------------------------------------------------------

function margeErwartet(s: GameState, m: Eigenmarke, wg: WgId): number {
  const st = s.einkauf?.wgs[wg];
  return (st?.margeSaison ?? WG[wg]?.margeSaison ?? 0.5) + mehrmarge(m);
}

function ekStueck(normp: number, me: number, material: Material, qualitaet: number, zielgruppe?: ProduktZielgruppe): number {
  const mat = MATERIALIEN[material];
  return Math.round(normp * (1 - me) * (mat.kosten / mat.preis) * (1 + 0.03 * (qualitaet - 3)) * (zielgruppe ? ZIELGRUPPE_PRODUKT[zielgruppe].kosten / ZIELGRUPPE_PRODUKT[zielgruppe].preis : 1) * 100) / 100;
}

function produktName(typ: ArtikelTyp, farbe: Farbe, material: Material): string {
  const t = TYP[typ];
  const matWort = t.materialien.length > 1 && material !== t.materialien[0] ? ` aus ${material}` : '';
  return `${typ} ${farbe}${matWort}`;
}

function neuesProdukt(s: GameState, m: Eigenmarke, e: Required<Pick<ProduktEntwurf, 'typ' | 'farbe' | 'material' | 'dauer' | 'budgetWoche'>> & { preislage: Preislage; qualitaet: number; stil: Stil; name?: string; zielgruppe?: ProduktZielgruppe }, wg: WgId, team: number): Produkt {
  const t = TYP[e.typ];
  const np = normpreis(t, e.preislage, e.material, e.qualitaet, e.zielgruppe);
  const me = margeErwartet(s, m, wg);
  s.produkte.zaehler += 1;
  return {
    id: `pr${s.produkte.zaehler}`, marke: m.id, typ: e.typ, name: e.name?.trim() || produktName(e.typ, e.farbe, e.material), farbe: e.farbe, material: e.material,
    stil: e.stil, preislage: e.preislage, qualitaet: e.qualitaet, zielgruppe: e.zielgruppe, wg, kategorie: t.kategorie, normpreis: np, preis: np, ekStueck: ekStueck(np, me, e.material, e.qualitaet, e.zielgruppe),
    margeErwartet: me, status: 'entwicklung', start: s.woche, dauer: e.dauer, budgetWoche: e.budgetWoche, fertig: s.woche + e.dauer, team,
    verkauf: [], umsatz: [], saison: saisonId(s.woche + e.dauer),
  };
}

function einfuehren(s: GameState, p: Produkt, rauschen: boolean): void {
  const m = s.eigenmarken.marken.find((x) => x.id === p.marke);
  if (!m) return;
  const teile = bewerte(s, m, p, p.team, trendFuer(s, saisonId(s.woche)));
  const r: RngHalter = s.produkte;
  const noise = rauschen ? clamp(normal(r) * 0.25, -0.5, 0.5) : 0;
  p.teile = teile;
  p.sterne = sterneAus(scoreAus(teile) + noise / 4.5);
  p.status = 'sortiment';
  p.seit = s.woche;
  p.saison = saisonId(s.woche);
}

/** Startsortiment der vier gewachsenen Marken (Lisanne eher altbacken). */
const START: Record<string, [ArtikelTyp, Farbe, Material, WgId, number][]> = {
  em1: [
    ['Bluse', 'beige', 'Polyester', 'damen.blusen', 0.15], ['Bluse', 'flieder', 'Viskose', 'damen.blusen', 0.15], ['Strickjacke', 'altrosa', 'Polyester', 'damen.strick', 0.15],
    ['Strickjacke', 'grau', 'Viskose', 'damen.strick', 0.2], ['Rock', 'marine', 'Polyester', 'damen.hosen', 0.15], ['Chino', 'beige', 'Baumwolle', 'damen.hosen', 0.15],
    ['Bluse', 'altrosa', 'Polyester', 'damen.gg', 0.1], ['Mantel', 'camel', 'Polyester', 'damen.jacken', 0.25], ['Kleid', 'bordeaux', 'Viskose', 'damen.kleider', 0.15],
  ],
  em2: [
    ['Hemd', 'hellblau', 'Baumwolle', 'herren.hemden', 0.55], ['Hemd', 'weiß', 'Baumwolle', 'herren.hemden', 0.5], ['Blazer', 'marine', 'Merino', 'herren.business', 0.55],
    ['Chino', 'sand', 'Baumwolle', 'herren.hosen', 0.5], ['Strickjacke', 'anthrazit', 'Merino', 'herren.strick', 0.5], ['Poloshirt', 'marine', 'Baumwolle', 'herren.casual', 0.45],
  ],
  em3: [
    ['Kissen', 'salbei', 'Leinen', 'wohnen.heimtextil', 0.6], ['Handtuch', 'weiß', 'Baumwolle', 'wohnen.heimtextil', 0.55], ['Bettwäsche', 'grau', 'Baumwolle', 'wohnen.bett', 0.55],
    ['Bettwäsche', 'creme', 'Bio-Baumwolle', 'wohnen.bett', 0.6], ['Tasse', 'olive', 'Polyester', 'wohnen.tisch', 0.5], ['Vase', 'sand', 'Polyester', 'wohnen.deko', 0.5],
  ],
  em4: [
    ['Kinderbody', 'weiß', 'Baumwolle', 'kinder.baby', 0.45], ['Plüschtier', 'braun', 'Polyester', 'kinder.baby', 0.4], ['Kinderkleid', 'rosa', 'Baumwolle', 'kinder.maedchen', 0.45],
    ['T-Shirt', 'gelb', 'Baumwolle', 'kinder.jungen', 0.45], ['Jeans', 'jeansblau', 'Denim', 'kinder.jungen', 0.4], ['T-Shirt', 'rosa', 'Baumwolle', 'kinder.maedchen', 0.4],
  ],
};

/** Legt den Produktstand an (nach dem Einkauf, braucht die Margen der WG) und setzt die Basis. */
export function erzeugeProdukte(s: GameState): ProdukteStand {
  const pr: ProdukteStand = { liste: [], zaehler: 0, rng: (s.seed * 3266489917 + 0x7e0d) >>> 0, basisF: {}, basisM: {} };
  s.produkte = pr;
  for (const m of s.eigenmarken.marken) {
    for (const [typ, farbe, material, wg, budgetAnteil] of START[m.id] ?? []) {
      const t = TYP[typ];
      const p = neuesProdukt(s, m, { typ, farbe, material, preislage: m.preislage, qualitaet: m.qualitaet, stil: m.stil, dauer: 12, budgetWoche: Math.round((PRODUKT_PARAM.budgetBedarf * t.aufwand * budgetAnteil) / 12) }, wg, m.id === 'em1' ? 0.35 : 0.5);
      p.start = -300; p.fertig = -288;
      // Bewertung ohne Rauschen; der Trend der Einführung liegt Jahre zurück (Lisanne wirkt aus der Zeit gefallen)
      p.teile = bewerte(s, m, p, p.team, undefined, m.id === 'em1' ? 0.1 : 0.4);
      p.sterne = sterneAus(scoreAus(p.teile));
      p.status = 'sortiment'; p.seit = -260; p.saison = saisonId(-260);
      pr.liste.push(p);
    }
  }
  setzeBasis(s);
  return pr;
}

function setzeBasis(s: GameState): void {
  const pr = s.produkte;
  for (const m of s.eigenmarken.marken) for (const wg of new Set([...Object.keys(m.wgAnteile), ...Object.keys(m.wgIst), ...pr.liste.filter((p) => p.marke === m.id).map((p) => p.wg)])) {
    const key = `${m.id}|${wg}`;
    pr.basisF[key] = rohFaktor(s, m.id, wg);
    pr.basisM[key] = rohMarge(s, m.id, wg);
  }
}

// ---------------------------------------------------------------------------------------------
// Kapazität
// ---------------------------------------------------------------------------------------------

export function kapazitaet(s: GameState): number {
  const L = produktStufe(s);
  const k = PRODUKT_PARAM.kapazitaet;
  return Math.floor(k[Math.min(3, Math.floor(L + 1e-9))]);
}

export function belegt(s: GameState, markeId: string, kat: ProduktKategorie, ohne?: string): number {
  return s.produkte.liste.filter((p) => p.marke === markeId && p.kategorie === kat && p.id !== ohne && (p.status === 'sortiment' || p.status === 'entwicklung')).length;
}

// ---------------------------------------------------------------------------------------------
// Wochentakt
// ---------------------------------------------------------------------------------------------

/** Entwicklungskosten je Woche (laufen über die Zentrale). */
export function produktKostenWoche(s: GameState): number {
  return s.produkte ? s.produkte.liste.reduce((a, p) => a + (p.status === 'entwicklung' ? p.budgetWoche : 0), 0) : 0;
}

/** Wochenschritt: Einführungen, Grundsortiment neuer Marken, Auslistung eingestellter Marken. */
export function produkteWoche(s: GameState): void {
  const pr = s.produkte;
  if (!pr) return;
  let kosten = false;
  for (const p of pr.liste) {
    if (p.status === 'entwicklung' && s.woche >= p.fertig) {
      einfuehren(s, p, !s.prognose);
      kosten = true;
      const m = s.eigenmarken.marken.find((x) => x.id === p.marke);
      if (m && (m.wgAnteile[p.wg] ?? 0) <= 0 && m.status !== 'eingestellt') eigenmarkeAnteil(s, m.id, p.wg, PRODUKT_PARAM.anteilNeu);
      melde(s, 'info', `${m?.name ?? 'Eigenmarke'}: ${p.name} ist im Sortiment (${(p.sterne ?? 0).toLocaleString('de-DE')} Sterne).`);
    }
  }
  for (const m of s.eigenmarken.marken) {
    if (m.status === 'eingestellt') {
      for (const p of pr.liste) if (p.marke === m.id && p.status !== 'ausgelistet') { if (p.status === 'entwicklung') kosten = true; p.status = 'ausgelistet'; }
      continue;
    }
    // WG ohne Produkte (neue Marke oder neuer Anteil): Grundsortiment vom Produzenten (schlicht, ohne Trendbezug)
    for (const wg of Object.keys(m.wgAnteile)) {
      if (pr.liste.some((p) => p.marke === m.id && p.wg === wg && p.status !== 'ausgelistet')) continue;
      const t = ARTIKELTYPEN.find((x) => x.wgs.includes(wg) && x.gruppe[trendGruppe(m)] >= 0.5) ?? ARTIKELTYPEN.find((x) => x.wgs.includes(wg));
      if (!t) continue;
      const farbe = FARB_BASIS[trendGruppe(m)][0];
      const p = neuesProdukt(s, m, { typ: t.typ, farbe, material: t.materialien[0], preislage: m.preislage, qualitaet: m.qualitaet, stil: m.stil, dauer: 12, budgetWoche: Math.round(PRODUKT_PARAM.budgetBedarf * t.aufwand * 0.4 / 12) }, wg, 0.4);
      p.basis = true;
      p.budgetWoche = 0;
      p.teile = bewerte(s, m, p, 0.4, undefined);
      p.sterne = sterneAus(scoreAus(p.teile));
      p.status = 'sortiment'; p.seit = s.woche;
      pr.basisF[`${m.id}|${wg}`] ??= 1;
      pr.basisM[`${m.id}|${wg}`] ??= 0;
      pr.liste.push(p);
    }
  }
  if (kosten) hqAktualisiere(s);
}

/** Nach dem Abverkauf: Stück und Umsatz je Produkt aus dem Markenumsatz der WG. */
export function produkteBuchen(s: GameState): void {
  const pr = s.produkte;
  if (!pr) return;
  const jeKey = new Map<string, Produkt[]>();
  for (const p of pr.liste) if (imSortiment(p)) { const k = `${p.marke}|${p.wg}`; const l = jeKey.get(k); if (l) l.push(p); else jeKey.set(k, [p]); }
  for (const [k, liste] of jeKey) {
    const [m, wg] = k.split('|');
    const st = s.einkauf.wgs[wg];
    const u = st?.v?.u?.length ? st.v.u[st.v.u.length - 1] * (st.pool[m] ?? 0) : 0;
    const gw = liste.map((p) => gewicht(s, p));
    const sum = gw.reduce((a, b) => a + b, 0) || 1;
    liste.forEach((p, i) => {
      const x = (u * gw[i]) / sum;
      p.umsatz.push(eur(x)); p.verkauf.push(Math.round(x / Math.max(0.5, p.preis)));
      if (p.umsatz.length > 13) { p.umsatz.shift(); p.verkauf.shift(); }
    });
  }
  for (const p of pr.liste) if (!imSortiment(p) && p.verkauf.length && p.verkauf[p.verkauf.length - 1] !== 0) {
    p.umsatz.push(0); p.verkauf.push(0);
    if (p.umsatz.length > 13) { p.umsatz.shift(); p.verkauf.shift(); }
  }
}

// ---------------------------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------------------------

export type ProduktAktion =
  | { typ: 'produktEntwickeln'; entwurf: ProduktEntwurf }
  | { typ: 'produktPreis'; produkt: string; preis: number }
  | { typ: 'produktAuslisten'; produkt: string }
  | { typ: 'produktSortiment'; produkt: string; an: boolean };

export const PRODUKT_AKTIONEN = new Set<string>(['produktEntwickeln', 'produktPreis', 'produktAuslisten', 'produktSortiment']);

interface Pruefung { fehler?: string; m?: Eigenmarke; t?: TypDef; wg?: WgId; preislage: Preislage; qualitaet: number; stil: Stil; kapFrei: number }

function pruefe(s: GameState, e: ProduktEntwurf): Pruefung {
  const m = s.eigenmarken.marken.find((x) => x.id === e.marke);
  const preislage = e.preislage ?? m?.preislage ?? 'mitte';
  const qualitaet = clamp(Math.round(e.qualitaet ?? m?.qualitaet ?? 3), 1, 5);
  const stil = e.stil ?? m?.stil ?? 'klassisch';
  const leer: Pruefung = { preislage, qualitaet, stil, kapFrei: 0 };
  if (!m || m.status === 'eingestellt') return { ...leer, fehler: 'Marke nicht gefunden.' };
  const t = TYP[e.typ];
  if (!t) return { ...leer, m, fehler: 'Unbekannter Artikeltyp.' };
  if (e.zielgruppe && !ZIELGRUPPE_PRODUKT[e.zielgruppe]) return { ...leer, m, t, fehler: 'Unbekannte Zielgruppe.' };
  if (!FARBEN[e.farbe]) return { ...leer, m, t, fehler: 'Unbekannte Farbe.' };
  if (!t.materialien.includes(e.material)) return { ...leer, m, t, fehler: `${e.typ} gibt es nicht aus ${e.material}. Möglich: ${t.materialien.join(', ')}.` };
  if (!DAUER_STUFEN.includes(e.dauer as (typeof DAUER_STUFEN)[number])) return { ...leer, m, t, fehler: 'Entwicklungsdauer 4, 8, 12, 24 oder 48 Wochen.' };
  if (!(e.budgetWoche >= 0)) return { ...leer, m, t, fehler: 'Budget je Woche angeben.' };
  const wg = wgFuer(s, m, t, e.wg);
  if (!wg) return { ...leer, m, t, fehler: `${e.typ} passt nicht zu ${m.name} (Kategorie oder Zielgruppe).` };
  const kapFrei = kapazitaet(s) - belegt(s, m.id, t.kategorie);
  if (kapFrei <= 0) return { ...leer, m, t, wg, kapFrei, fehler: `Kapazität für ${PRODUKT_KATEGORIEN[t.kategorie]} bei ${m.name} erreicht. Bitte erst Produkte auslisten.` };
  return { m, t, wg, preislage, qualitaet, stil, kapFrei };
}

export function produktAktion(s: GameState, a: ProduktAktion): { ok: boolean; text: string } {
  const ok = (text: string) => ({ ok: true, text });
  const fehler = (text: string) => ({ ok: false, text });
  if (a.typ === 'produktEntwickeln') {
    const e = a.entwurf;
    const c = pruefe(s, e);
    if (c.fehler || !c.m || !c.wg) return fehler(c.fehler ?? 'Ungültiger Entwurf.');
    if (s.phase === 'insolvenz' && e.budgetWoche * e.dauer > 1_500_000) return fehler('Im Verfahren gibt der Sachwalter höchstens 1,5 Mio. € je Entwicklung frei.');
    const p = neuesProdukt(s, c.m, { ...e, budgetWoche: eur(e.budgetWoche), preislage: c.preislage, qualitaet: c.qualitaet, stil: c.stil }, c.wg, markenLeistung(s, c.m.id).wert / 100);
    s.produkte.liste.push(p);
    hqAktualisiere(s);
    return ok(`${c.m.name}: ${p.name} in Entwicklung, ${e.dauer} Wochen, ${mio(e.budgetWoche * e.dauer)} Budget. Fertig in Woche ${p.fertig + 1}.`);
  }
  const p = s.produkte.liste.find((x) => x.id === a.produkt);
  if (!p || p.status === 'ausgelistet') return fehler('Produkt nicht gefunden.');
  switch (a.typ) {
    case 'produktPreis': {
      const neu = Math.round(clamp(a.preis, p.normpreis * 0.4, p.normpreis * 2.5) * 100) / 100;
      p.preis = neu;
      const marge = 1 - p.ekStueck / neu;
      return ok(`${p.name}: Preis ${neu.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €, Marge ${Math.round(marge * 100)} %.`);
    }
    case 'produktAuslisten': {
      const warEnt = p.status === 'entwicklung';
      p.status = 'ausgelistet';
      if (warEnt) hqAktualisiere(s);
      return ok(`${p.name} ausgelistet${warEnt ? ', die Entwicklung ist gestoppt' : ''}.`);
    }
    case 'produktSortiment': {
      if (p.status === 'entwicklung') return fehler('Das Produkt ist noch in Entwicklung.');
      if (a.an) {
        if (p.status === 'sortiment') return ok(`${p.name} ist im Sortiment.`);
        if (belegt(s, p.marke, p.kategorie) >= kapazitaet(s)) return fehler(`Kapazität für ${PRODUKT_KATEGORIEN[p.kategorie]} erreicht.`);
        p.status = 'sortiment';
        return ok(`${p.name} wieder im Sortiment.`);
      }
      p.status = 'pausiert';
      return ok(`${p.name} vorübergehend aus dem Sortiment.`);
    }
  }
  return fehler('Unbekannte Aktion.');
}

// ---------------------------------------------------------------------------------------------
// Ressort-KI (CPO, delegierte Produktentwicklung)
// ---------------------------------------------------------------------------------------------

/** Delegierte Produktentwicklung: gute CPOs treffen Trend und Zielgruppe, schwache wählen beliebig. */
export function produktKi(s: GameState, guete: number, r: RngHalter): string | undefined {
  if (s.woche % 4 !== 2) return undefined;
  const texte: string[] = [];
  const trifft = () => zufall(r) < 0.3 + 0.65 * guete;
  const kap = kapazitaet(s);
  for (const m of s.eigenmarken.marken.filter(istVerkaufsaktiv)) {
    if (s.produkte.liste.some((p) => p.marke === m.id && p.status === 'entwicklung')) continue;
    const eigene = s.produkte.liste.filter((p) => p.marke === m.id && p.status === 'sortiment');
    const kats = [...new Set(eigene.map((p) => p.kategorie))];
    if (!kats.length) continue;
    const gut = trifft();
    const markenteam = markenLeistung(s, m.id).wert / 100;
    // Schwache Produkte auslisten, wenn die Kategorie voll ist
    for (const k of kats) {
      if (belegt(s, m.id, k) < kap) continue;
      const liste = eigene.filter((p) => p.kategorie === k).sort((a, b) => sterneWirksam(s, a) - sterneWirksam(s, b));
      const weg = gut ? liste[0] : waehle(r, liste);
      if (weg && (!gut || sterneWirksam(s, weg) <= 3)) { produktAktion(s, { typ: 'produktAuslisten', produkt: weg.id }); texte.push(`${m.name}: ${weg.name} ausgelistet`); }
    }
    const frei = kats.filter((k) => belegt(s, m.id, k) < kap);
    if (!frei.length) continue;
    const g = trendGruppe(m);
    const trend = trendFuer(s, saisonId(s.woche + 12)).gruppen[g];
    const kand = ARTIKELTYPEN.filter((t) => frei.includes(t.kategorie) && wgFuer(s, m, t));
    if (!kand.length) continue;
    let e: ProduktEntwurf;
    if (gut) {
      const bewertet = kand.flatMap((t) => [...new Set([...trend.farben, ...FARB_BASIS[g].slice(0, 2)])].flatMap((farbe) => t.materialien.map((material) => ({ t, farbe, material }))))
        .map((x) => ({ ...x, sc: scoreAus(bewerte(s, m, { typ: x.t.typ, farbe: x.farbe, material: x.material, preislage: m.preislage, qualitaet: m.qualitaet, dauer: 12, budgetWoche: 20_000 }, markenteam, trendFuer(s, saisonId(s.woche + 12)))) }))
        .sort((a, b) => b.sc - a.sc);
      const b = bewertet[0];
      e = { marke: m.id, typ: b.t.typ, farbe: b.farbe, material: b.material, dauer: 12, budgetWoche: Math.round((PRODUKT_PARAM.budgetBedarf * b.t.aufwand * 1.6) / 12 / 1000) * 1000 };
    } else {
      const t = waehle(r, kand);
      e = { marke: m.id, typ: t.typ, farbe: waehle(r, FARBLISTE), material: waehle(r, t.materialien), dauer: waehle(r, [4, 8]), budgetWoche: 5_000 };
    }
    const res = produktAktion(s, { typ: 'produktEntwickeln', entwurf: e });
    if (res.ok) texte.push(res.text);
  }
  return texte.length ? texte.join(' ') : undefined;
}

// ---------------------------------------------------------------------------------------------
// Abfragen
// ---------------------------------------------------------------------------------------------

export interface ProduktKarte {
  id: string; marke: string; markeName: string; typ: ArtikelTyp; name: string; farbe: Farbe; farbeHex: string; material: Material; stil: Stil; zielgruppe?: ProduktZielgruppe; zielgruppeName: string;
  preislage: Preislage; qualitaet: number; wg: WgId; wgName: string; bereich: GruppeId; kategorie: ProduktKategorie; kategorieName: string;
  status: ProduktStatus; normpreis: number; preis: number; ekStueck: number; marge: number;
  sterne: number; sterneEinfuehrung?: number; sterneTeile?: SterneTeile;
  verkaufLetzteWoche: number; verkaufVorwoche: number; veraenderung: number; veraenderungProzent: number; umsatzLetzteWoche: number;
  start: number; fertigWoche: number; dauer: number; budgetWoche: number; fortschritt: number; seit?: number; basis: boolean;
  /** Bild des Artikeltyps (Silhouette + Parameter), falls im Katalog hinterlegt. */
  bild?: ArtikelBild;
}

export interface MarkenProdukte {
  marke: string; name: string; farbe: string; zielgruppe: string; trendGruppe: TrendGruppe;
  kategorien: { id: ProduktKategorie; name: string; kapazitaet: number; belegt: number }[];
  leistung: MarkenLeistung;
  produkte: ProduktKarte[]; inEntwicklung: number; hinweis: string;
}

export interface ProdukteListe { woche: number; kapazitaet: number; stufe: number; team: number; kostenWoche: number; marken: MarkenProdukte[] }

export function produktKarte(s: GameState, p: Produkt): ProduktKarte {
  const m = s.eigenmarken.marken.find((x) => x.id === p.marke);
  const n = p.verkauf.length;
  const a = n ? p.verkauf[n - 1] : 0;
  const b = n > 1 ? p.verkauf[n - 2] : a;
  const ent = p.status === 'entwicklung';
  return {
    id: p.id, marke: p.marke, markeName: m?.name ?? p.marke, typ: p.typ, name: p.name, farbe: p.farbe, farbeHex: FARBEN[p.farbe], material: p.material, stil: p.stil, zielgruppe: p.zielgruppe, zielgruppeName: p.zielgruppe ? ZIELGRUPPE_PRODUKT[p.zielgruppe].name : 'Markenzielgruppe',
    preislage: p.preislage, qualitaet: p.qualitaet, wg: p.wg, wgName: WG[p.wg]?.name ?? p.wg, bereich: WG[p.wg]?.bereich, kategorie: p.kategorie, kategorieName: PRODUKT_KATEGORIEN[p.kategorie],
    status: p.status, normpreis: p.normpreis, preis: p.preis, ekStueck: p.ekStueck, marge: Math.round((1 - p.ekStueck / Math.max(0.5, p.preis)) * 1000) / 1000,
    sterne: ent ? 0 : halbe(sterneWirksam(s, p)), sterneEinfuehrung: p.sterne, sterneTeile: p.teile,
    verkaufLetzteWoche: a, verkaufVorwoche: b, veraenderung: a - b, veraenderungProzent: b > 0 ? Math.round(((a - b) / b) * 1000) / 1000 : 0,
    umsatzLetzteWoche: p.umsatz.length ? p.umsatz[p.umsatz.length - 1] : 0,
    start: p.start, fertigWoche: p.fertig, dauer: p.dauer, budgetWoche: p.budgetWoche,
    fortschritt: ent ? clamp((s.woche - p.start) / Math.max(1, p.dauer), 0, 1) : 1, seit: p.seit, basis: !!p.basis,
    ...(TYP[p.typ]?.bild ? { bild: { ...TYP[p.typ].bild! } } : {}),
  };
}

export function produkte(s: GameState, marke?: string): ProdukteListe {
  const kap = kapazitaet(s);
  const marken = s.eigenmarken.marken.filter((m) => m.status !== 'eingestellt' && (!marke || m.id === marke)).map((m): MarkenProdukte => {
    const liste = s.produkte.liste.filter((p) => p.marke === m.id && p.status !== 'ausgelistet');
    // Keine Kategorie durch ein anfangs leeres Sortiment künstlich sperren.
    const moegliche = ARTIKELTYPEN.filter((t) => t.gruppe[trendGruppe(m)] > 0.15 && wgFuer(s,m,t)).map((t) => t.kategorie);
    const kats = [...new Set([...liste.map((p) => p.kategorie), ...moegliche])];
    const ent = liste.filter((p) => p.status === 'entwicklung').length;
    const voll = kats.filter((k) => belegt(s, m.id, k) >= kap).map((k) => PRODUKT_KATEGORIEN[k]);
    return {
      marke: m.id, name: m.name, farbe: m.farbe, zielgruppe: `${ZIELGRUPPEN_TEXT[m.zielgruppe.alter]}, ${m.zielgruppe.geschlecht.charAt(0).toUpperCase() + m.zielgruppe.geschlecht.slice(1)}`, trendGruppe: trendGruppe(m),
      leistung: markenLeistung(s, m.id),
      kategorien: kats.map((k) => ({ id: k, name: PRODUKT_KATEGORIEN[k], kapazitaet: kap, belegt: belegt(s, m.id, k) })),
      produkte: liste.map((p) => produktKarte(s, p)), inEntwicklung: ent,
      hinweis: ent ? `Wir entwickeln gerade ${ent === 1 ? 'ein neues Produkt' : `${ent} neue Produkte`}.` : voll.length ? `Kapazität erreicht bei ${voll.join(', ')}. Für Neues bitte erst auslisten.` : 'Wir entwickeln gerade keine neuen Produkte. Zeit zu investieren.',
    };
  });
  return { woche: s.woche, kapazitaet: kap, stufe: Math.round(produktStufe(s) * 100) / 100, team: Math.round(teamStaerke(s) * 100) / 100, kostenWoche: eur(produktKostenWoche(s)), marken };
}

export interface ProduktKatalog {
  version: 2;
  baum: BaumAst[];
  zielgruppen: typeof PRODUKT_ZIELGRUPPEN;
  sparten: { id: Produktsparte; name: string; typen: ArtikelTyp[] }[];
  kategorien: { id: ProduktKategorie; name: string }[];
  typen: { typ: ArtikelTyp; kategorie: ProduktKategorie; wgs: WgId[]; saison: TypSaison; preisMitte: number; materialien: Material[]; aufwand: number; gruppe: Record<TrendGruppe, number>; bild?: ArtikelBild }[];
  farben: { name: Farbe; hex: string }[];
  materialien: { name: Material; preis: number; kosten: number; wertig: number }[];
  preislagen: { id: Preislage; faktor: number }[];
  dauer: number[];
  budgetSchritt: number;
}

export function produktKatalog(_s: GameState): ProduktKatalog {
  return {
    version: 2, baum: sortimentsBaum(ARTIKELTYPEN), zielgruppen: PRODUKT_ZIELGRUPPEN,
    sparten: (Object.keys(ZUSATZ_ARTIKEL) as Produktsparte[]).map((id) => ({
      id, name: ({ damen:'Bekleidung Damen', herren:'Bekleidung Herren', kinder:'Bekleidung Kinder',
        schuhe:'Schuhe', accessoires:'Accessoires', heimtextil:'Heimtextil', haushalt:'Haushalt', beauty:'Beauty' })[id],
      typen: [...ZUSATZ_ARTIKEL[id]],
    })),
    kategorien: (Object.keys(PRODUKT_KATEGORIEN) as ProduktKategorie[]).map((id) => ({ id, name: PRODUKT_KATEGORIEN[id] })),
    typen: ARTIKELTYPEN.map((t) => ({ ...t, preisMitte: t.preis, wgs: [...t.wgs], materialien: [...t.materialien], gruppe: { ...t.gruppe }, ...(t.bild ? { bild: { ...t.bild } } : {}) })),
    farben: FARBLISTE.map((f) => ({ name: f, hex: FARBEN[f] })),
    materialien: MATERIALLISTE.map((m) => ({ name: m, ...MATERIALIEN[m] })),
    preislagen: (Object.keys(PREISLAGE_FAKTOR) as Preislage[]).map((id) => ({ id, faktor: PREISLAGE_FAKTOR[id] })),
    dauer: [...DAUER_STUFEN],
    budgetSchritt: 5_000,
  };
}

export interface Trendbericht {
  woche: number; aktuell: TrendSaison; naechste: TrendSaison;
  zielgruppen: { id: TrendGruppe; name: string; grundfarben: Farbe[] }[];
  /** Genauigkeit des Berichts hängt nicht vom Vorstand ab (Messe), die Vorschau schon. */
  hinweis: string;
}

/** Trendbericht der Messe: laufende und kommende Saison je Zielgruppe. */
export function trendbericht(s: GameState): Trendbericht {
  const sid = saisonId(s.woche);
  return {
    woche: s.woche, aktuell: trendFuer(s, sid), naechste: trendFuer(s, sid + 1),
    zielgruppen: (Object.keys(TREND_GRUPPEN) as TrendGruppe[]).map((id) => ({ id, name: TREND_GRUPPEN[id], grundfarben: [...FARB_BASIS[id]] })),
    hinweis: 'Was zur Einführung angesagt ist, zählt. Lange Entwicklungen landen in der nächsten Saison.',
  };
}

export interface ProduktVorschau {
  ok: boolean; fehler?: string; wg?: WgId; wgName?: string; kategorie?: ProduktKategorie; name?: string;
  normpreis: number; ekStueck: number; marge: number; kosten: number; fertigWoche: number; saisonEinfuehrung: string;
  sterneErwartet: number; sterneVon: number; sterneBis: number; teile?: SterneTeile; trendBekannt: boolean; kapazitaetFrei: number; passform: number;
  hinweise: string[];
}

/** Für den Assistenten "Neues Produkt": erwartete Sterne (Spanne nach Fachwissen CPO), Preis, Marge, Kosten. */
export function produktVorschau(s: GameState, e: ProduktEntwurf): ProduktVorschau {
  const c = pruefe(s, e);
  const fertig = s.woche + (e.dauer || 0);
  const sid = saisonId(fertig);
  const bekannt = sid <= saisonId(s.woche) + 1;
  const leer: ProduktVorschau = { ok: false, fehler: c.fehler, normpreis: 0, ekStueck: 0, marge: 0, kosten: eur((e.budgetWoche || 0) * (e.dauer || 0)), fertigWoche: fertig, saisonEinfuehrung: saisonName(s, sid), sterneErwartet: 0, sterneVon: 0, sterneBis: 0, trendBekannt: bekannt, kapazitaetFrei: c.kapFrei, passform: 0, hinweise: [] };
  if (!c.m || !c.t || !c.wg) return leer;
  const team = markenLeistung(s, c.m.id).wert / 100;
  const teile = bewerte(s, c.m, { typ: e.typ, farbe: e.farbe, material: e.material, preislage: c.preislage, qualitaet: c.qualitaet, dauer: e.dauer, budgetWoche: e.budgetWoche, zielgruppe: e.zielgruppe }, team, bekannt ? trendFuer(s, sid) : undefined);
  const st = sterneAus(scoreAus(teile));
  const cpo = s.vorstand?.ressorts.cpo.person;
  const spanne = halbe(0.5 + 1.5 * (1 - (cpo ? cpo.fachwissen / 100 : 0))) - 0.5 + (bekannt ? 0 : 0.5);
  const np = normpreis(c.t, c.preislage, e.material, c.qualitaet, e.zielgruppe);
  const me = margeErwartet(s, c.m, c.wg);
  const ek = ekStueck(np, me, e.material, c.qualitaet, e.zielgruppe);
  const hinweise: string[] = [];
  if (teile.trend < 0.3 && bekannt) hinweise.push('Trifft den Trend der Einführungssaison kaum');
  if (teile.zielgruppe < 0.5) hinweise.push(`Passt wenig zur gewählten Zielgruppe`);
  if (teile.entwicklung < 0.5) hinweise.push('Budget oder Dauer knapp für diesen Artikel');
  if (!bekannt) hinweise.push('Trend der Einführungssaison noch unbekannt');
  if (e.zielgruppe) hinweise.push(`Zielgruppe ${ZIELGRUPPE_PRODUKT[e.zielgruppe].name}: Preis, Marge und Nachfrage nach Standort werden berücksichtigt`);
  if ((c.m.wgAnteile[c.wg] ?? 0) <= 0) hinweise.push(`${c.m.name} bekommt dafür einen Anteil von ${Math.round(PRODUKT_PARAM.anteilNeu * 100)} % in ${WG[c.wg].name}`);
  return {
    ok: !c.fehler, fehler: c.fehler, wg: c.wg, wgName: WG[c.wg].name, kategorie: c.t.kategorie, name: e.name?.trim() || produktName(e.typ, e.farbe, e.material),
    normpreis: np, ekStueck: ek, marge: Math.round((1 - ek / np) * 1000) / 1000, kosten: eur(e.budgetWoche * e.dauer), fertigWoche: fertig, saisonEinfuehrung: saisonName(s, sid),
    sterneErwartet: st, sterneVon: halbe(st - spanne / 2), sterneBis: halbe(st + spanne / 2), teile, trendBekannt: bekannt, kapazitaetFrei: c.kapFrei,
    passform: c.t.gruppe[e.zielgruppe ? ZIELGRUPPE_PRODUKT[e.zielgruppe].trend : trendGruppe(c.m)], hinweise,
  };
}

// Q37: Freischaltungen (auftraege/wurf4/daten/q37-freischalten.csv): 112 vorhandene Typen bekommen weitere Zielgruppen,
// weil das Referenzsortiment sie dort führt (Typ zählt für eine Gruppe ab 30 % ihrer Artikel).
// Außerdem: die Zielgruppen der aufgelösten Muster-Typen wandern auf den Grundtyp, Anlassmode auch für Teens und Young Adults (E45).
// Nur Sichtbarkeit und Passung bei gezielter Zielgruppe: die Gewichte G(…) bleiben (Kalibrierung, Trend, Ressort-KI unverändert).
import type { ProduktZielgruppe } from '../produkt-sortiment';
import type { WgId } from '../einkauf';
import { ANLASS_TYPEN, ANLASS_NICHT_TEENS } from '../anlass';
import { MUSTER_ALIAS, TYP_UMBENANNT } from './q37-muster';

/** t = Teens, y = Young Adults, a = Adults (Spalte freischalten_fuer). */
export const FREISCHALTEN: readonly (readonly [string, string])[] = [
  ['Gürtel', 't'], ['Jorts', 'a'], ['Schultertasche', 't'], ['Blazer', 't'], ['Portemonnaie', 't'], ['Trenchcoat', 't'], ['Sweatshorts', 'a'],
  ['Skort', 'a'], ['Schal', 't'], ['Bluse', 't'], ['Slingpumps', 't'], ['Stiefel', 't'], ['Minikleid', 'a'], ['Eau de Parfum', 't'],
  ['Poloshirt', 't'], ['Bundfaltenhose', 'ty'], ['Stiefelette', 't'], ['Cropped Pufferjacke', 'a'], ['Feinstrickpullover', 't'], ['Loafer', 't'],
  ['Handtasche', 't'], ['Pyjamahose', 'a'], ['Corsagen-Top', 'a'], ['Mantel', 't'], ['Mule', 't'], ['Windbreaker', 'a'], ['Bandana', 'a'],
  ['Crop-Longsleeve', 'a'], ['Strickkleid', 't'], ['Kartenetui', 't'], ['Umhängetasche', 't'], ['Choker', 'a'], ['Chino', 't'], ['Clog', 'ty'],
  ['Netzshirt', 'a'], ['Anzughose', 't'], ['Kurzmantel', 'ty'], ['Cropped Jeansjacke', 'a'], ['Wollmantel', 't'], ['Steppmantel', 'ty'],
  ['Kurzarmbluse', 'ty'], ['Troyer', 't'], ['Kulturbeutel', 'ty'], ['Bodyspray', 'a'], ['Bootcut-Jeans', 't'], ['Handschuhe', 't'],
  ['Zip-Strickjacke', 'ty'], ['Schlupfhose', 'ty'], ['Perlenkette', 'ty'], ['Feinstrickjacke', 'ty'], ['Rollkragenpullover', 't'],
  ['Satin-Midirock', 't'], ['Pumps', 't'], ['Krawatte', 't'], ['Damenuhr', 'ty'], ['Eau de Toilette', 't'], ['Strickweste', 't'], ['Culotte', 't'],
  ['Rock', 't'], ['Etuikleid', 't'], ['Bouclé-Jacke', 't'], ['Harrington-Jacke', 't'], ['Tennissocken im Set', 'a'], ['Clutch', 't'],
  ['Flanellhemd', 'a'], ['Weekender', 't'], ['Poncho', 'ty'], ['Parfum', 't'], ['Wickelshirt', 't'], ['Radlerhose', 'a'], ['Sportleggings', 'a'],
  ['Anzugweste', 't'], ['Regenjacke', 't'], ['Cape', 'ty'], ['Kimono-Jacke', 't'], ['Wanderschuh', 't'], ['Badeschlappen', 'a'], ['Bootsschuh', 't'],
  ['Federmäppchen', 'ty'], ['Schiebermütze', 'ty'], ['Shapewear-Body', 'ty'], ['Schluppenbluse', 'y'], ['Oxford-Hemd', 't'], ['Wickelrock', 't'],
  ['Wickelkleid', 't'], ['Fieldjacket', 't'], ['Funktionsjacke', 't'], ['Nachthemd', 'y'], ['Espadrille', 't'], ['Stoppersocken', 'tya'],
  ['Brosche', 'ty'], ['V-Shirt', 't'], ['Shirtjacke', 'ty'], ['Fleece-Troyer', 'a'], ['Marlenehose', 't'], ['Hemdblusenkleid', 't'],
  ['Bleistiftrock', 't'], ['A-Linien-Rock', 't'], ['Tunikabluse', 'ty'], ['Schürze', 't'], ['Leinen-Sakko', 't'], ['Bademantel', 't'],
  ['Derby-Schuh', 't'], ['Mokassin', 'ty'], ['Hausschuh', 'ty'], ['Trekkingschuh', 't'], ['Overknee-Stiefel', 't'], ['Strumpfhose', 't'],
  ['Bommelmütze', 'tya'], ['Strohhut', 't'], ['Lipgloss', 'a'], ['Abendtasche', 't'],

];

const KUERZEL: Record<string, ProduktZielgruppe> = { t: 'teens', y: 'young', a: 'adults' };
const grund = (typ: string): string => MUSTER_ALIAS[typ]?.typ ?? TYP_UMBENANNT[typ] ?? typ;

/** Zielgruppen der aufgelösten Muster-Typen auf main (Stand vor Q37), Test q37-muster.test.ts prüft die Übernahme. */
export const ALIAS_ZIELGRUPPEN: Record<string, readonly ProduktZielgruppe[]> = {
  Hemd: ['kinder', 'teens'], Stoffhose: ['teens'], 'Cargo-Hose': ['teens', 'young'], Strickpullover: ['teens', 'young'],
  Faltenrock: ['adults', 'bestager'], Midirock: ['teens', 'young', 'adults'], Hoodie: ['teens', 'young'], 'Crop-Top': ['teens', 'young'],
  'Cargo-Shorts': ['teens', 'young'], Sweatshorts: ['teens', 'young'], Hemdjacke: ['teens', 'young'], Minirock: ['teens', 'young'],
  'T-Shirt': ['teens', 'young'], Kleid: ['young', 'adults', 'bestager'], Bluse: ['young', 'adults', 'bestager'], Anzug: ['young', 'adults', 'bestager'],
  Schal: ['adults', 'bestager'], Jumpsuit: ['teens', 'young', 'adults'],
};

/** Zusätzliche Zielgruppen je Artikeltyp (Freischaltung, Muster-Grundtyp, Anlass). */
export const Q37_ZUSATZ: ReadonlyMap<string, ReadonlySet<ProduktZielgruppe>> = (() => {
  const m = new Map<string, Set<ProduktZielgruppe>>();
  const add = (typ: string, z: ProduktZielgruppe) => { const k = grund(typ); if (!m.has(k)) m.set(k, new Set()); m.get(k)!.add(z); };
  for (const [typ, z] of FREISCHALTEN) for (const c of z) add(typ, KUERZEL[c]);
  for (const [typ, l] of Object.entries(ALIAS_ZIELGRUPPEN)) for (const z of l) add(typ, z);
  for (const liste of Object.values(ANLASS_TYPEN)) for (const typ of liste) {
    if (!ANLASS_NICHT_TEENS.has(typ)) add(typ, 'teens');
    add(typ, 'young');
  }
  return m;
})();

/** Gezielt freigeschaltet: Passung der Zielgruppe beim Entwickeln mindestens wie ein typischer Artikel dieser Gruppe. */
export const q37Freigeschaltet = (typ: string, z: ProduktZielgruppe): boolean => Q37_ZUSATZ.get(typ)?.has(z) ?? false;

/** Freigeschaltete Kinderartikel brauchen eine Warengruppe außerhalb von Kinder, sonst kann keine Erwachsenen- oder Teens-Marke sie entwickeln. */
export const KORREKTUREN: Record<string, { wgs: WgId[] }> = {
  Federmäppchen: { wgs: ['kinder.jungen', 'kinder.maedchen', 'accessoires.lederwaren'] },
  Stoppersocken: { wgs: ['kinder.jungen', 'kinder.maedchen', 'waesche.struempfe'] },
  Bommelmütze: { wgs: ['kinder.jungen', 'kinder.maedchen', 'accessoires.lederwaren'] },
};

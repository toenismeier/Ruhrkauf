// Q42: Schnittvarianten aus dem Referenzsortiment (auftraege/wurf4/daten/q42-varianten.csv, 35 Varianten).
// Eine Variante ist kein eigener Artikeltyp, sondern eine wählbare Schnitt-/Modellvariante ihres Zieltyps im Produktentwickler
// (Feld `variante` am Produkt; ohne Angabe die Grundform, alte Spielstände unverändert). Bild: bis zum eigenen Bildpaket das Bild des
// Zieltyps. Zielgruppen der Variante gelten nur für die Variante: Bringt sie eine Gruppe mit, die der Zieltyp nicht hat, passt nur ein
// Produkt dieser Variante zu der Gruppe (wie eine Freischaltung), der Zieltyp selbst bleibt unverändert.
import type { ProduktZielgruppe } from '../produkt-sortiment';
import type { WgId } from '../einkauf';

export interface Schnittvariante {
  name: string; zieltyp: string; zielgruppen: readonly ProduktZielgruppe[];
  /** Zusätzliche WGs nur für die Variante: Haarspangen im Set hat nur Kinder-WGs (Variante für Teens bis Adults), Bralette nur die
   * nicht eigenmarkenfähigen Miederwaren (das Bralette-Top ist ein Oberteil). */
  wgs?: readonly WgId[];
}

const TY: ProduktZielgruppe[] = ['teens', 'young'];
const TYA: ProduktZielgruppe[] = ['teens', 'young', 'adults'];
const YA: ProduktZielgruppe[] = ['young', 'adults'];
const HAAR: WgId[] = ['accessoires.lederwaren', 'damen.young'];
const v = (name: string, zieltyp: string, zielgruppen: ProduktZielgruppe[], wgs?: WgId[]): Schnittvariante => ({ name, zieltyp, zielgruppen, ...(wgs ? { wgs } : {}) });

export const VARIANTEN: readonly Schnittvariante[] = [
  v('Haartuch', 'Bandana', TY),
  v('Bandana-Top', 'Bandeau-Top', TY),
  v('Blazerbluse', 'Bluse', TYA),
  v('Cape-Bluse', 'Bluse', TYA),
  v('Web-Boxershorts', 'Boxershorts', TYA),
  v('Kurzarm-Cardigan', 'Cropped Cardigan', TYA),
  v('Haarnadeln', 'Haarspangen im Set', TYA, HAAR),
  v('Haarspange', 'Haarspangen im Set', TYA, HAAR),
  v('Boxer-Sneaker', 'High-Top-Sneaker', TY),
  v('Taschen-Organizer', 'Kulturbeutel', TYA),
  v('U-Boot-Shirt', 'Longsleeve', TY),
  v('Ballonkleid', 'Minikleid', TY),
  v('Rockgürtel', 'Minirock', TY),
  v('Netzmütze', 'Mütze', TYA),
  v("D'Orsay-Pumps", 'Pumps', TYA),
  v('Schlauchschal', 'Schal', TYA),
  v('Loafer-Sneaker', 'Slip-on-Sneaker', TYA),
  v('Füßlinge', 'Sneakersocken', TYA),
  v('Zehenfreie Socken', 'Socken', TYA),
  v('Keilstiefel', 'Stiefel', TYA),
  v('T-Shirt-Multipack', 'T-Shirt', TYA),
  v('Wasserfall-Top', 'Top', TYA),
  v('Cape-Top', 'Fledermausshirt', TY),
  v('Spitzenjacke', 'Spitzenshirt', YA),
  v('Half-Zip-Top', 'Sporttop', TYA),
  v('Jeans-Playsuit', 'Playsuit', TY),
  v('Bikinioberteil', 'Triangel-Bikinioberteil', TY),
  v('Biker-Stiefelette', 'Bikerstiefel', TYA),
  v('Bralette-Top', 'Bralette', TYA, ['damen.young', 'waesche.tag']),
  v('Peeptoe-Stiefelette', 'Sock-Boot', TYA),
  v('Zehenring', 'Ring', TYA),
  v('Körperglitzer', 'Highlighter', TYA),
  v('Matrosenmütze', 'Kapitänsmütze', TYA),
  v('Blaulichtfilter-Brille', 'Modebrille', TY),
  v('Gürtelrock', 'Überrock', TY),
];

const JE_TYP = new Map<string, Schnittvariante[]>();
for (const x of VARIANTEN) { if (!JE_TYP.has(x.zieltyp)) JE_TYP.set(x.zieltyp, []); JE_TYP.get(x.zieltyp)!.push(x); }

/** Wählbare Schnittvarianten eines Artikeltyps (leer: nur Grundform). */
export const variantenFuer = (typ: string): readonly Schnittvariante[] => JE_TYP.get(typ) ?? [];
/** Variante eines Typs nach Name (undefined: unbekannt oder Grundform). */
export const varianteVon = (typ: string, name: string | undefined): Schnittvariante | undefined =>
  name ? JE_TYP.get(typ)?.find((x) => x.name === name) : undefined;

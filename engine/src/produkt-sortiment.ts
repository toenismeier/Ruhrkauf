// Q11: Zwei unabhängige Achsen für Eigenmarken-Produkte: Sortiment und Zielgruppe.
// Die bestehenden Produktkategorien bleiben für Kapazität, WG und ältere Spielstände bestehen.
export const PRODUKT_ZIELGRUPPEN = [
  { id: 'kinder', name: 'Kinder', alter: '10-13', trend: 'kinder', preis: 0.82, kosten: 0.83 },
  { id: 'teens', name: 'Teens & Tweens', alter: '13-17', trend: 'jung', preis: 0.90, kosten: 0.89 },
  { id: 'young', name: 'Young Adults', alter: '18-29', trend: 'jung', preis: 0.96, kosten: 0.94 },
  { id: 'adults', name: 'Adults', alter: '30-49', trend: 'mitte', preis: 1, kosten: 1 },
  { id: 'bestager', name: 'Best Ager', alter: '50+', trend: 'reif', preis: 1.12, kosten: 1.08 },
] as const;
export type ProduktZielgruppe = (typeof PRODUKT_ZIELGRUPPEN)[number]['id'];
export const ZIELGRUPPE_PRODUKT = Object.fromEntries(PRODUKT_ZIELGRUPPEN.map((z) => [z.id, z])) as
  Record<ProduktZielgruppe, (typeof PRODUKT_ZIELGRUPPEN)[number]>;

export const BAUM_KATEGORIEN = [
  { id: 'oberteile', name: 'Oberteile' },
  { id: 'unterteile', name: 'Unterteile' },
  { id: 'kleider', name: 'Kleider' },
  { id: 'jacken', name: 'Jacken und Mäntel' },
  { id: 'schuhe', name: 'Schuhe' },
  { id: 'waesche', name: 'Wäsche und Nachtwäsche' },
  { id: 'accessoires', name: 'Accessoires' },
  { id: 'home', name: 'Wohnen und Haushalt' },
  { id: 'beauty', name: 'Beauty' },
  { id: 'kinder', name: 'Kinder und Baby' },
] as const;
export type BaumKategorie = (typeof BAUM_KATEGORIEN)[number]['id'];

export interface BaumKnoten { id: string; name: string; typen: string[] }
export interface BaumAst { id: BaumKategorie; name: string; unterkategorien: BaumKnoten[]; anzahl: number }

/** Der Artikeltyp und nicht seine WG bestimmt die sichtbare Navigationsgruppe. */
export function sortimentsPfad(typ: string, basis: string): [BaumKategorie, string] {
  const t = typ.toLowerCase();
  if (/body|plüsch|kinder-/i.test(t)) return ['kinder', /plüsch/.test(t) ? 'Plüsch und Spielwaren' : /body/.test(t) ? 'Bodys' : 'Kinderbekleidung'];
  if (/kleid/.test(t) && !/kleidung/.test(t)) return ['kleider', /wickel/.test(t) ? 'Wickelkleider' : /a-linien/.test(t) ? 'A-Linien-Kleider' : 'Kleider'];
  if (/rock/.test(t)) return ['unterteile', /plissee/.test(t) ? 'Plisseeröcke' : /bleistift/.test(t) ? 'Bleistiftröcke' : /tüll/.test(t) ? 'Tüllröcke' : 'Röcke'];
  if (/hose|jeans|chino|culotte|shorts|leggings|bermuda/.test(t)) {
    const u = /jeans|denim/.test(t) ? 'Jeans und Denim' : /leinen/.test(t) ? 'Leinenhosen' : /cargo/.test(t) ? 'Cargohosen'
      : /stoff|anzug|culotte/.test(t) ? 'Stoffhosen' : /chino/.test(t) ? 'Chinos'
      : /shorts|bermuda/.test(t) ? 'Shorts' : /leggings/.test(t) ? 'Leggings' : 'Hosen';
    return ['unterteile', u];
  }
  if (/jacke|mantel|trench|blazer|sakko|softshell/.test(t)) {
    const u = /trench/.test(t) ? 'Trenchcoats' : /mantel/.test(t) ? 'Mäntel' : /blazer|sakko/.test(t) ? 'Blazer und Sakkos' : 'Jacken';
    return ['jacken', u];
  }
  if (/bluse|hemd/.test(t)) return ['oberteile', /bluse/.test(t) ? 'Blusen' : 'Hemden'];
  if (/cardigan|strickjacke/.test(t)) return ['oberteile', 'Cardigans und Strickjacken'];
  if (/pullover|strick|sweatshirt/.test(t)) return ['oberteile', /strick/.test(t) ? 'Strick' : 'Pullover und Sweatshirts'];
  if (/crop-top/.test(t)) return ['oberteile', 'Crop-Tops'];
  if (/^top$/.test(t)) return ['oberteile', 'Tops'];
  if (/polo/.test(t)) return ['oberteile', 'Polos'];
  if (/shirt/.test(t)) return ['oberteile', 'Shirts'];
  if (basis === 'oberteile') return ['oberteile', 'Weitere Oberteile'];
  if (basis === 'jacken') return ['jacken', 'Weitere Jacken'];
  if (basis === 'unterteile') return ['unterteile', 'Weitere Unterteile'];
  if (basis === 'schuhe') return ['schuhe', /sneaker/.test(t) ? 'Sneaker' : /stiefel|boot|stiefelette/.test(t) ? 'Stiefel und Boots' : /sandale|espadrille/.test(t) ? 'Sommerschuhe' : 'Weitere Schuhe'];
  if (basis === 'waesche') return ['waesche', /pyjama/.test(t) ? 'Nachtwäsche' : 'Unterwäsche'];
  if (basis === 'accessoires') return ['accessoires', /tasche|rucksack|clutch|shopper|weekender/.test(t) ? 'Taschen' : 'Weitere Accessoires'];
  if (basis === 'home') return ['home', /bett|kissen|decke|laken/.test(t) ? 'Bett und Textilien' : /handtuch|waschlappen/.test(t) ? 'Badtextilien' : 'Haushalt und Dekoration'];
  if (basis === 'beauty') return ['beauty', /serum|creme|lotion|gel/.test(t) ? 'Pflege' : /parfum|toilette/.test(t) ? 'Duft' : 'Make-up'];
  return ['kinder', 'Baby und Kind'];
}

export function sortimentsBaum(typen: readonly { typ: string; kategorie: string }[]): BaumAst[] {
  const ast = new Map<string, Map<string, string[]>>();
  for (const t of typen) {
    const [k, u] = sortimentsPfad(t.typ, t.kategorie);
    if (!ast.has(k)) ast.set(k, new Map());
    const gruppen = ast.get(k)!;
    if (!gruppen.has(u)) gruppen.set(u, []);
    gruppen.get(u)!.push(t.typ);
  }
  return BAUM_KATEGORIEN.map((k) => {
    const eintraege = [...(ast.get(k.id)?.entries() ?? [])];
    return {
      id: k.id, name: k.name,
      unterkategorien: eintraege.map(([name, liste], i) => ({ id: k.id + '-' + i, name, typen: liste.sort((a, b) => a.localeCompare(b, 'de')) })),
      anzahl: eintraege.reduce((n, [, t]) => n + t.length, 0),
    };
  }).filter((k) => k.anzahl > 0);
}

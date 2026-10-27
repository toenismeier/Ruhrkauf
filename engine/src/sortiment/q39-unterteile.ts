// Q39 (Wurf 4): 48 neue Artikeltypen (Faltenrock und Midirock kamen mit Q37) Hosen, Jeans, Shorts, Röcke, Kleider, Jumpsuits und Bademode aus dem Referenzsortiment
// (auftraege/wurf4/daten/q39-typen.csv). Haken in ./index.ts. Bild: bis zur Abnahme durch Ummo bildOffen mit der nächstliegenden
// vorhandenen Silhouette (auftraege/wurf4/bilder-neu.md, Abschnitt 1); die eigenen Bilder liefern die Bildpakete B01–B30.
// Low-Rise-Jeans, Ballon-Jeans, Caprihose und Hotpants zeigen schon die B01-Silhouetten (b01*).
// Zielgruppen wie in der CSV (Teens 12–17, Young Adults 18–24, Adults ab 25): Teens und Young Adults über die feste Zuordnung
// (Q33_ZUORDNUNG), Adults über das Gewicht mitte ≥ 0,4; Best Ager nie (reif < 0,4). Preis (mitte) am Preismedian, Eigenmarke
// leicht darüber. WGs nur dort, wo schon Artikeltypen liegen; die Typen hängen hinten an (Startsortiment und Kalibrierung neutral).
import { G, type ArtikelBild, type SortimentTyp } from './basis';
import type { Material, ProduktKategorie, TypSaison, TrendGruppe } from '../produkte';
import type { BaumKategorie } from '../produkt-sortiment';
import type { WgId } from '../einkauf';
import type { AnlassId } from '../anlass';
import { Q33_ZUORDNUNG } from './q33-zielgruppen';

type Pfad = readonly [BaumKategorie, string];
type Ziel = 'TY' | 'TYA';
interface Eintrag { typ: string; kategorie: ProduktKategorie; wgs: WgId[]; saison: TypSaison; preis: number; materialien: Material[]; gruppe: Record<TrendGruppe, number>; aufwand: number; bild: ArtikelBild; bildOffen: true; pfad: Pfad }

// Zielgruppenprofile: TY = Teens und Young Adults, TYA = zusätzlich Adults
const GEWICHT: Record<Ziel, Record<TrendGruppe, number>> = { TY: G(0.15, 1, 0.3, 0), TYA: G(0.1, 1, 0.6, 0.15) };

// Materialgruppen
const DENIM: Material[] = ['Denim', 'Bio-Baumwolle'];
const BW: Material[] = ['Baumwolle', 'Bio-Baumwolle'];
const BW_P: Material[] = ['Baumwolle', 'Bio-Baumwolle', 'Polyester'];
const FLIESS: Material[] = ['Viskose', 'Polyester', 'Leinen'];
const JERSEY: Material[] = ['Viskose', 'Baumwolle', 'Polyester'];
const STRETCH: Material[] = ['Polyester', 'Baumwolle'];
const STRICK: Material[] = ['Baumwolle', 'Merino', 'Viskose'];
const LEINEN: Material[] = ['Leinen', 'Baumwolle', 'Viskose'];
const KLEDER: Material[] = ['Polyester', 'Leder'];
const GLANZ: Material[] = ['Polyester', 'Viskose'];
const SATIN: Material[] = ['Seide', 'Viskose', 'Polyester'];
const BADE: Material[] = ['Polyester'];

// WG-Bündel (Kinder-WG, damit Teens unter dem Reiter Kinder erscheinen und Kinder- und Jugendmarken entwickeln können)
const D_JEANS: WgId[] = ['damen.denim', 'damen.young', 'kinder.maedchen'];
const U_JEANS: WgId[] = ['damen.denim', 'damen.young', 'herren.casual', 'kinder.maedchen', 'kinder.jungen'];
const D_HOSE: WgId[] = ['damen.hosen', 'damen.young', 'kinder.maedchen'];
const U_HOSE: WgId[] = ['damen.hosen', 'damen.young', 'herren.hosen', 'herren.casual', 'kinder.maedchen', 'kinder.jungen'];
const H_HOSE: WgId[] = ['herren.hosen', 'herren.casual', 'damen.young', 'kinder.jungen', 'kinder.maedchen'];
const D_YOUNG: WgId[] = ['damen.young', 'kinder.maedchen'];
const D_ROCK: WgId[] = ['damen.hosen', 'damen.young', 'kinder.maedchen'];
const D_KLEID: WgId[] = ['damen.kleider', 'damen.young', 'kinder.maedchen'];
const D_BADE: WgId[] = ['waesche.tag', 'damen.young', 'kinder.maedchen'];

// Baumplätze
const P = {
  jeans: ['unterteile', 'Jeans und Denim'] as Pfad, hosen: ['unterteile', 'Hosen'] as Pfad, leggings: ['unterteile', 'Leggings'] as Pfad,
  cargo: ['unterteile', 'Cargohosen'] as Pfad, shorts: ['unterteile', 'Shorts'] as Pfad, rock: ['unterteile', 'Röcke'] as Pfad,
  kleid: ['kleider', 'Kleider'] as Pfad, jump: ['kleider', 'Jumpsuits'] as Pfad, bade: ['waesche', 'Bademode'] as Pfad,
};

const L: (Eintrag & { ziel: Ziel })[] = [];
function t(typ: string, kategorie: ProduktKategorie, wgs: WgId[], saison: TypSaison, preis: number, materialien: Material[], ziel: Ziel, aufwand: number, silhouette: string, pfad: Pfad): void {
  L.push({ typ, kategorie, wgs, saison, preis, materialien, gruppe: GEWICHT[ziel], aufwand, bild: { silhouette }, bildOffen: true, pfad, ziel });
}
const U = 'unterteile' as const;

// Reihenfolge wie die CSV (Häufigkeit im Referenzsortiment)
t('Barrel-Jeans', U, U_JEANS, 'ganz', 39, DENIM, 'TY', 2, 'widelegjeans', P.jeans);
t('Low-Rise-Jeans', U, D_JEANS, 'ganz', 39, DENIM, 'TY', 2, 'b01lowrisejeans', P.jeans);
t('Neckholderkleid', U, D_KLEID, 'sommer', 35, FLIESS, 'TYA', 2, 'kleid', P.kleid);
t('Barrel-Hose', U, U_HOSE, 'ganz', 39, ['Polyester', 'Viskose', 'Merino'], 'TYA', 2, 'marlenehose', P.hosen);
t('Trägerkleid', U, D_KLEID, 'sommer', 35, FLIESS, 'TYA', 1, 'slipdress', P.kleid);
t('Pumphose', U, D_HOSE, 'sommer', 35, JERSEY, 'TYA', 1, 'jogginghose', P.hosen);
t('Stoffshorts', U, D_YOUNG.concat(['damen.hosen']), 'sommer', 22, FLIESS, 'TYA', 1, 'shorts', P.shorts);
t('Playsuit', U, D_KLEID, 'sommer', 29, FLIESS, 'TY', 2, 'jumpsuit', P.jump);
t('Triangel-Bikinioberteil', 'waesche', D_BADE, 'sommer', 19, BADE, 'TYA', 1, 'bikini', P.bade);
t('Schlaghose', U, D_HOSE, 'ganz', 29, STRETCH, 'TY', 1, 't_flareleggings', P.hosen);
t('Hotpants', U, D_YOUNG, 'sommer', 25, BW_P, 'TY', 1, 'b01hotpants', P.shorts);
t('Caprihose', U, D_HOSE, 'sommer', 27, STRETCH, 'TYA', 1, 'b01caprihose', P.hosen);
t('Bikinislip', 'waesche', D_BADE, 'sommer', 17, BADE, 'TY', 1, 'bikini', P.bade);
t('Bandeaukleid', U, D_KLEID, 'sommer', 29, JERSEY, 'TYA', 1, 't_bodycon', P.kleid);
t('Leggings', U, D_HOSE, 'ganz', 22, STRETCH, 'TYA', 1, 'leggings', P.leggings);
t('Midikleid', U, D_KLEID, 'ganz', 35, JERSEY, 'TYA', 2, 'etuikleid', P.kleid);
t('Maxirock', U, D_ROCK, 'sommer', 32, FLIESS, 'TYA', 1, 'stufenrock', P.rock);
t('Strickshorts', U, D_YOUNG, 'sommer', 25, STRICK, 'TY', 1, 'shorts', P.shorts);
t('Strickhose', U, D_HOSE, 'winter', 27, STRICK, 'TYA', 2, 'schlupfhose', P.hosen);
t('Brazilian-Bikinislip', 'waesche', D_BADE, 'sommer', 17, BADE, 'TYA', 1, 'bikini', P.bade);
t('Ballon-Jeans', U, D_JEANS, 'ganz', 39, DENIM, 'TYA', 2, 'b01ballonjeans', P.jeans);
t('Ballonhose', U, D_HOSE, 'ganz', 35, GLANZ, 'TYA', 2, 'paperbaghose', P.hosen);
t('Paillettenrock', U, D_ROCK, 'winter', 25, GLANZ, 'TY', 2, 'minirock', P.rock);
t('Stufenkleid', U, D_KLEID, 'sommer', 32, ['Viskose', 'Baumwolle'], 'TYA', 2, 't_babydoll', P.kleid);
t('Cargo-Jogger', U, H_HOSE, 'ganz', 32, BW_P, 'TYA', 2, 'cargohose', P.cargo);
t('Steg-Leggings', U, D_HOSE, 'ganz', 27, STRETCH, 'TYA', 1, 'leggings', P.leggings);
t('Sportshorts', U, D_YOUNG, 'sommer', 19, ['Polyester', 'Baumwolle'], 'TYA', 1, 't_sweatshorts', P.shorts);
t('Strickrock', U, D_ROCK, 'winter', 17, STRICK, 'TYA', 1, 'jerseyrock', P.rock);
t('Baggy-Hose', U, H_HOSE, 'ganz', 42, ['Polyester', 'Baumwolle'], 'TY', 2, 't_parachute', P.hosen);
t('Capri-Jeans', U, D_JEANS, 'sommer', 32, DENIM, 'TYA', 1, 'momjeans', P.jeans);
t('Kunstledershorts', U, D_YOUNG, 'ganz', 22, KLEDER, 'TY', 1, 'shorts', P.shorts);
t('Leinenshorts', U, D_YOUNG.concat(['damen.hosen', 'herren.casual', 'kinder.jungen']), 'sommer', 22, LEINEN, 'TYA', 1, 'bermuda', P.shorts);
t('5-Pocket-Hose', U, H_HOSE, 'ganz', 32, BW, 'TY', 1, 'jeans', P.hosen);
t('Jeans-Jumpsuit', U, D_KLEID, 'ganz', 49, DENIM, 'TYA', 2, 'jumpsuit', P.jump);
t('Paillettenkleid', U, D_KLEID, 'winter', 42, GLANZ, 'TYA', 2, 'minikleid', P.kleid);
t('Jeans-Midirock', U, D_JEANS, 'ganz', 39, DENIM, 'TYA', 1, 'jerseyrock', P.rock);
t('Carpenter-Hose', U, H_HOSE, 'ganz', 45, BW, 'TY', 2, 'cargohosegerade', P.hosen);
t('Jerseyhose', U, D_HOSE, 'ganz', 27, JERSEY, 'TYA', 1, 't_trackpants', P.hosen);
t('Paillettenshorts', U, D_YOUNG, 'winter', 27, GLANZ, 'TY', 2, 'shorts', P.shorts);
t('Kunstlederhose', U, D_HOSE, 'ganz', 35, KLEDER, 'TYA', 2, 'stoffhose', P.hosen);
t('Skinny-Hose', U, D_HOSE, 'ganz', 27, STRETCH, 'TYA', 1, 'chino', P.hosen);
t('Ballonrock', U, D_ROCK, 'ganz', 32, ['Polyester', 'Viskose', 'Seide'], 'TYA', 2, 't_tuellmini', P.rock);
t('Palazzohose', U, D_HOSE, 'sommer', 32, FLIESS, 'TYA', 1, 'marlenehose', P.hosen);
t('Qipao', U, D_KLEID, 'ganz', 35, SATIN, 'TYA', 2, 'etuikleid', P.kleid);
t('Lederkleid', U, D_KLEID, 'ganz', 35, KLEDER, 'TY', 2, 'minikleid', P.kleid);
t('Häkelrock', U, D_ROCK, 'sommer', 25, ['Baumwolle', 'Viskose'], 'TY', 2, 'minirockstoff', P.rock);
t('Dirndl', U, D_KLEID, 'ganz', 69, ['Baumwolle', 'Polyester', 'Seide'], 'TYA', 3, 'sommerkleid', P.kleid);
t('Cocktailkleid', U, D_KLEID, 'ganz', 169, SATIN, 'TYA', 3, 'kleid', P.kleid);

// Anlass (Q37): Ast „Anlass“ zusätzlich zum Stammplatz, nach auftraege/wurf4/daten/anlass-zuordnung.csv (ab zwei Referenzartikeln je Anlass)
const ANLASS: Record<string, AnlassId[]> = {
  Neckholderkleid: ['abiball', 'tanzschulball', 'konfirmation', 'feier'], Trägerkleid: ['abiball', 'tanzschulball', 'konfirmation'],
  Midikleid: ['konfirmation', 'feier'], Playsuit: ['tanzschulball', 'konfirmation'], Cocktailkleid: ['tanzschulball', 'konfirmation', 'feier'],
  Qipao: ['konfirmation'], Paillettenkleid: ['tanzschulball'], Bandeaukleid: ['tanzschulball'], Paillettenrock: ['tanzschulball', 'feier'],
  Paillettenshorts: ['tanzschulball'], Dirndl: ['tracht'],
};
for (const e of L) if (ANLASS[e.typ]) (e as Eintrag & { anlass?: AnlassId[] }).anlass = ANLASS[e.typ];
for (const e of L) Q33_ZUORDNUNG.set(e.typ, ['teens', 'young']);
// Faltenrock und Midirock legt Q37 als Grundtyp an (Muster-Typen); die Referenz zeigt beide auch für Teens und Young Adults
for (const typ of ['Faltenrock', 'Midirock']) Q33_ZUORDNUNG.set(typ, ['teens', 'young']);
/** Typen der CSV, die Q37 schon als Grundtyp angelegt hat (hier nur Zielgruppen ergänzt). */
export const VON_Q37 = ['Faltenrock', 'Midirock'] as const;

export const NAMEN: readonly string[] = L.map((e) => e.typ);
export const TYPEN: SortimentTyp<string>[] = L.map(({ ziel: _ziel, ...e }) => e);
/** Zielgruppen laut Referenz (Test): TY = Teens und Young Adults, TYA = zusätzlich Adults. */
export const ZIEL: Readonly<Record<string, Ziel>> = Object.fromEntries(L.map((e) => [e.typ, e.ziel]));

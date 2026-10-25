// Q37: Musterfeld für Eigenmarken-Produkte (neben Farbe und Material).
// Ein Produkt ohne Muster (alte Spielstände, Grundsortiment, Ressort-KI) gilt als Uni und ist wirtschaftlich unverändert:
// Muster wirken nur, wenn der Spieler eines wählt (Preis, Zielgruppe, Trend der Saison).
// Trendanteile je Zielgruppe und Saison aus dem Referenzsortiment (auftraege/wurf4/daten/muster-anteile.csv):
// Anteil der Artikel mit diesem Muster (Mehrfachnennung möglich), Weihnachtsmotiv zählt als Print.
// Lizenzmotiv ist angelegt, aber gesperrt, bis es einen Lizenzgeber gibt (Kooperationen folgen).

export const MUSTER = ['Uni', 'Streifen', 'Ringel', 'Karo', 'Punkte', 'Blumen', 'Leo', 'Tier', 'Camouflage', 'Batik', 'Print', 'Schriftzug', 'Schachbrett', 'Norweger', 'Häkel/Strick', 'Lizenzmotiv'] as const;
export type Muster = (typeof MUSTER)[number];

export interface MusterInfo {
  /** Anhang im Produktnamen („Hemd marine kariert“). */
  wort: string;
  /** Preisfaktor gegen Uni (Druck, Webmuster, Strickmuster). */
  preis: number;
  /** Schlüssel für die Grafik (render/src/kit/mode/stoff.js). */
  bild: string;
  /** Gesperrt mit Begründung (Lizenzmotiv ohne Lizenzgeber). */
  gesperrt?: string;
}

export const MUSTER_INFO: Record<Muster, MusterInfo> = {
  Uni: { wort: '', preis: 1, bild: 'uni' },
  Streifen: { wort: 'gestreift', preis: 1.03, bild: 'nadelstreifen' },
  Ringel: { wort: 'geringelt', preis: 1.03, bild: 'ringel' },
  Karo: { wort: 'kariert', preis: 1.05, bild: 'karo' },
  Punkte: { wort: 'gepunktet', preis: 1.03, bild: 'punkte' },
  Blumen: { wort: 'mit Blumen', preis: 1.05, bild: 'blumen' },
  Leo: { wort: 'im Leo-Muster', preis: 1.05, bild: 'leo' },
  Tier: { wort: 'im Tiermuster', preis: 1.05, bild: 'tier' },
  Camouflage: { wort: 'in Camouflage', preis: 1.04, bild: 'camouflage' },
  Batik: { wort: 'in Batik', preis: 1.06, bild: 'batik' },
  Print: { wort: 'mit Print', preis: 1.05, bild: 'print' },
  Schriftzug: { wort: 'mit Schriftzug', preis: 1.04, bild: 'schriftzug' },
  Schachbrett: { wort: 'im Schachbrett', preis: 1.04, bild: 'schachbrett' },
  Norweger: { wort: 'im Norweger-Muster', preis: 1.1, bild: 'norweger' },
  'Häkel/Strick': { wort: 'mit Strickmuster', preis: 1.08, bild: 'haekel' },
  Lizenzmotiv: { wort: 'mit Lizenzmotiv', preis: 1.15, bild: 'lizenz', gesperrt: 'Lizenzmotive brauchen einen Lizenzgeber. Kooperationen folgen.' },
};

/** Gruppe der Trendgewichte: kinder, jung, mitte, reif (wie TrendGruppe in produkte.ts). */
type Gruppe = 'kinder' | 'jung' | 'mitte' | 'reif';

// Anteile in der Reihenfolge von MUSTER (Uni … Lizenzmotiv), Referenzsortiment 7.454 Artikel.
const REF: Record<'teens_fs' | 'teens_hw' | 'young_fs' | 'young_hw' | 'adults_fs' | 'adults_hw', number[]> = {
  teens_fs: [0.487, 0.067, 0.026, 0.036, 0.023, 0.061, 0.007, 0.014, 0.008, 0.005, 0.138, 0.223, 0, 0, 0.034, 0.039],
  teens_hw: [0.643, 0.047, 0.018, 0.081, 0.003, 0.008, 0.011, 0.011, 0.008, 0.001, 0.077, 0.14, 0, 0.001, 0.034, 0.019],
  young_fs: [0.488, 0.067, 0.026, 0.036, 0.022, 0.062, 0.007, 0.015, 0.008, 0.005, 0.138, 0.222, 0, 0, 0.034, 0.04],
  young_hw: [0.641, 0.047, 0.018, 0.081, 0.004, 0.008, 0.011, 0.011, 0.008, 0.001, 0.078, 0.14, 0, 0.001, 0.034, 0.019],
  adults_fs: [0.617, 0.063, 0.023, 0.029, 0.023, 0.058, 0.01, 0.021, 0.002, 0.001, 0.05, 0.083, 0, 0, 0.037, 0.026],
  adults_hw: [0.758, 0.03, 0.012, 0.076, 0.004, 0.01, 0.014, 0.013, 0.002, 0, 0.024, 0.039, 0, 0.001, 0.026, 0.008],
};

/** Schachbrett kommt im Referenzsortiment nicht vor (Mindestanteil); Norweger im Winter mindestens wie Häkel/Strick bei Älteren. */
const MIN = 0.004;
/** Kinder: wie Teens, mehr Ringel, Punkte, Print und Lizenz, kein Leo. Best Ager: wie Adults, kaum Schriftzug, Camouflage, Batik, Lizenz. */
const KINDER: Partial<Record<Muster, number>> = { Ringel: 1.8, Punkte: 1.6, Print: 1.3, Lizenzmotiv: 2, Leo: 0.2, Tier: 0.5, Schriftzug: 0.6 };
const REIF: Partial<Record<Muster, number>> = { Schriftzug: 0.25, Camouflage: 0.2, Batik: 0.3, Lizenzmotiv: 0.2, Schachbrett: 0.3, Print: 0.7, Blumen: 1.3, Streifen: 1.2, Norweger: 8 };

function zeile(werte: number[], faktor: Partial<Record<Muster, number>> = {}): Record<Muster, number> {
  return Object.fromEntries(MUSTER.map((m, i) => [m, Math.round(Math.max(m === 'Uni' ? 0 : MIN, werte[i] * (faktor[m] ?? 1)) * 1000) / 1000])) as Record<Muster, number>;
}
const mittel = (a: number[], b: number[]): number[] => a.map((x, i) => (x + b[i]) / 2);

/** Anteil je Muster nach Trendgruppe und Saison (sommer = Frühjahr/Sommer). */
export const MUSTER_ANTEILE: Record<Gruppe, { sommer: Record<Muster, number>; winter: Record<Muster, number> }> = {
  kinder: { sommer: zeile(REF.teens_fs, KINDER), winter: zeile(REF.teens_hw, KINDER) },
  jung: { sommer: zeile(mittel(REF.teens_fs, REF.young_fs)), winter: zeile(mittel(REF.teens_hw, REF.young_hw)) },
  mitte: { sommer: zeile(REF.adults_fs), winter: zeile(REF.adults_hw) },
  reif: { sommer: zeile(REF.adults_fs, REIF), winter: zeile(REF.adults_hw, REIF) },
};

/** Anteil eines Musters in Zielgruppe und Saison. */
export const musterAnteil = (g: Gruppe, sommer: boolean, m: Muster): number => MUSTER_ANTEILE[g][sommer ? 'sommer' : 'winter'][m];

// ---------------------------------------------------------------------------------------------
// Erlaubte Muster je Artikeltyp: Standard der Kategorie plus Ausnahmen nach Art
// ---------------------------------------------------------------------------------------------

export interface MusterTyp { typ: string; kategorie: string; materialien: readonly string[]; muster?: readonly Muster[] }

const KLEIDUNG: Muster[] = ['Uni', 'Streifen', 'Karo', 'Punkte', 'Blumen', 'Leo', 'Tier', 'Camouflage', 'Batik', 'Print', 'Schachbrett'];
const FORMELL: Muster[] = ['Uni', 'Streifen', 'Karo'];
const HEMD: Muster[] = ['Uni', 'Streifen', 'Karo', 'Punkte', 'Blumen', 'Print'];
const DENIM: Muster[] = ['Uni', 'Batik', 'Print', 'Leo', 'Camouflage'];
const LEDER: Muster[] = ['Uni', 'Leo', 'Tier'];
const OUTDOOR: Muster[] = ['Uni', 'Camouflage', 'Print', 'Karo'];
const SCHUH: Muster[] = ['Uni', 'Leo', 'Tier', 'Karo', 'Camouflage', 'Print', 'Blumen', 'Punkte'];
const SCHUH_KLASSISCH: Muster[] = ['Uni', 'Tier'];
const TASCHE: Muster[] = ['Uni', 'Streifen', 'Karo', 'Punkte', 'Blumen', 'Leo', 'Tier', 'Camouflage', 'Print', 'Schriftzug', 'Lizenzmotiv'];
const TUCH: Muster[] = ['Uni', 'Streifen', 'Ringel', 'Karo', 'Punkte', 'Blumen', 'Leo', 'Tier', 'Camouflage', 'Print'];
const WAESCHE: Muster[] = ['Uni', 'Streifen', 'Ringel', 'Karo', 'Punkte', 'Blumen', 'Leo', 'Tier', 'Camouflage', 'Print'];
const HOME_TEXTIL: Muster[] = ['Uni', 'Streifen', 'Karo', 'Punkte', 'Blumen', 'Print', 'Lizenzmotiv'];
const HOME_HART: Muster[] = ['Uni', 'Streifen', 'Punkte', 'Blumen', 'Print'];
const BABY: Muster[] = ['Uni', 'Streifen', 'Ringel', 'Punkte', 'Blumen', 'Karo', 'Print', 'Lizenzmotiv'];

const plus = (l: Muster[], ...x: Muster[]): Muster[] => [...l, ...x.filter((m) => !l.includes(m))];

/** Muster, die für einen Artikeltyp angeboten werden (Uni immer zuerst). */
export function musterFuer(t: MusterTyp): Muster[] {
  if (t.muster?.length) return t.muster.includes('Uni') ? [...t.muster] : ['Uni', ...t.muster];
  const n = t.typ;
  const nur = (m: string) => t.materialien.length > 0 && t.materialien.every((x) => x === m || (m === 'Denim' && x === 'Bio-Baumwolle'));
  const strick = /Strick|Pullover|Cardigan|Troyer|Pullunder|Rollkragen|Twinset|Norweger/.test(n);
  const shirtig = /Shirt|Top|Tee|Longsleeve|Hoodie|Sweat|Polo|Body|Pullover|Bustier|Tanktop/.test(n) && !/Hemd|Bluse|Overshirt/.test(n);
  switch (t.kategorie) {
    case 'beauty': return ['Uni'];
    case 'home': {
      if (/Plüsch|Puppe|Teddy|Spiel|Holz|Puzzle/.test(n)) return ['Uni'];
      const textil = /Bett|Kissen|Decke|Laken|Bezug|Plaid|Tuch|Handtuch|Waschlappen|Vorhang|Schal|Läufer|Tischdecke|Tischset|Serviette|Schürze|Topflappen|Vorleger|Matte|Teppich/.test(n);
      if (textil) return /Decke|Kissen|Plaid/.test(n) ? plus(HOME_TEXTIL, 'Norweger', 'Häkel/Strick') : HOME_TEXTIL;
      return /Tasse|Becher|Brotdose|Trinkflasche|Teller/.test(n) ? plus(HOME_HART, 'Schriftzug', 'Lizenzmotiv') : HOME_HART;
    }
    case 'kinder': return /Plüsch|Puppe|Teddy|Spiel|Holz|Puzzle|Rassel|Greifling|Schnuller/.test(n) ? ['Uni'] : BABY;
    case 'schuhe':
      if (/Business|Budapester|Derby|Oxford|Monk|Loafer|Mokassin|Bootsschuh|Slipper|Schnürschuh|Haferl/.test(n)) return SCHUH_KLASSISCH;
      if (/Sneaker|Kinder|Gummistiefel|Hausschuh|Pantoffel|Slip-on|Espadrille/.test(n)) return plus(SCHUH, 'Streifen');
      return SCHUH;
    case 'accessoires':
      if (/Kette|Ohrring|Ohrstecker|Armband|Armreif|Ring|Brosche|Choker|Uhr|Sonnenbrille|Brille|Anhänger|Schmuck|Haarreif|Haarspange|Spange|Klammer/.test(n)) return ['Uni'];
      if (/Gürtel|Geldbörse|Portemonnaie|Kartenetui|Schlüssel|Etui/.test(n)) return LEDER;
      if (/Krawatte|Fliege|Einstecktuch/.test(n)) return ['Uni', 'Streifen', 'Punkte', 'Karo', 'Print', 'Blumen'];
      if (/Schal|Tuch|Mütze|Beanie|Stirnband|Handschuh|Loop|Kappe|Cap|Hut/.test(n)) return /Mütze|Beanie|Schal|Stirnband|Handschuh|Loop/.test(n) ? plus(TUCH, 'Norweger', 'Häkel/Strick') : TUCH;
      if (/Tasche|Rucksack|Shopper|Clutch|Beutel|Weekender|Trolley|Koffer|Bag/.test(n)) return nur('Leder') ? LEDER : TASCHE;
      return ['Uni', 'Streifen', 'Karo', 'Punkte', 'Blumen', 'Print'];
    case 'waesche': {
      let l = WAESCHE;
      if (/Pyjama|Schlafanzug|Boxershorts|Socken|Strümpfe|Nachthemd|Bademantel|Loungewear|Jogger/.test(n)) l = plus(l, 'Schriftzug', 'Lizenzmotiv');
      if (/Socken|Strümpfe|Strumpfhose/.test(n)) l = plus(l, 'Norweger', 'Häkel/Strick');
      if (/Spitzen|Shapewear|Mieder|Strumpfhose/.test(n)) l = l.filter((m) => !['Camouflage', 'Karo', 'Schriftzug', 'Lizenzmotiv'].includes(m));
      return l;
    }
    default: {
      // Oberteile, Unterteile, Kleider, Jacken
      if (/Anzug|Sakko|Smoking|Frack|Anzughose|Anzugweste|Hosenanzug|Trenchcoat|Gehrock/.test(n)) return FORMELL;
      if (/Lederjacke|Bikerjacke/.test(n) || nur('Leder')) return LEDER;
      if (/Funktions|Regenjacke|Softshell|Outdoor|Windbreaker|Matschhose|Skihose|Schneeanzug/.test(n)) return OUTDOOR;
      if (nur('Denim') || /Jeans/.test(n)) return DENIM;
      if (/Hemd|Bluse|Overshirt/.test(n) && !/Hemdkleid|Hemdblusenkleid/.test(n)) return plus(HEMD, ...(/Overshirt|Hemdjacke|Flanell|Holzfäller/.test(n) ? ['Camouflage' as Muster] : []));
      let l = KLEIDUNG;
      if (shirtig || /[Kk]leid|[Rr]ock|Jumpsuit|Overall|Shorts|Jogginghose|Sweathose|Leggings/.test(n)) l = plus(l, 'Ringel');
      if (shirtig || /Jogginghose|Sweathose|Sweatshorts|Pyjama|Kapuzenjacke|Sweatjacke|Varsity|College/.test(n)) l = plus(l, 'Schriftzug', 'Lizenzmotiv');
      if (strick || /Mütze|Strickkleid|Strickrock|Strickjacke/.test(n)) l = plus(l, 'Norweger', 'Häkel/Strick');
      if (/Top|Häkel|Weste/.test(n)) l = plus(l, 'Häkel/Strick');
      if (/Mantel|Wollmantel|Steppmantel|Parka/.test(n)) l = l.filter((m) => ['Uni', 'Karo', 'Streifen', 'Leo', 'Tier', 'Camouflage'].includes(m));
      return l;
    }
  }
}

/** Prüft eine Musterwahl: Fehlertext oder undefined. */
export function musterFehler(t: MusterTyp, m: Muster): string | undefined {
  if (!MUSTER_INFO[m]) return 'Unbekanntes Muster.';
  if (MUSTER_INFO[m].gesperrt) return MUSTER_INFO[m].gesperrt;
  if (!musterFuer(t).includes(m)) return `${t.typ} gibt es nicht ${MUSTER_INFO[m].wort}.`;
  return undefined;
}

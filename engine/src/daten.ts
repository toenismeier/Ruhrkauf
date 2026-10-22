import type { Cluster, Format, GruppeId, Lage, MieterTyp, Region, BeraterTyp, WettbewerberArt } from './types';

export interface GruppeDef {
  id: GruppeId;
  name: string;
  format: Format;
  marge: number; // Rohertragsmarge auf Normalpreis
  saisonAnteil: number; // Anteil Saisonware (Abschriftrisiko)
  vorlauf: number; // Orderlaufzeit in Wochen
  beratung: number; // 0..1, wie sehr Beratungsqualität zählt
  kkElast: number; // Elastizität Kaufkraft
  alterElast: number; // Elastizität Altersstruktur
  qmUmsatz: number; // typischer €/qm/Woche
  anteilFlaeche: number; // typischer Flächenanteil im Format
  saison: number[]; // 12 Monatsfaktoren, wird normalisiert
}

// M7: Januar/Februar weniger stark als nachgelagerte Verlustmonate gewichten.
// Warengruppe Spielwaren behält ihren eigenständigen Abverkauf nach Weihnachten.
// Nach Weihnachten: stärkeres Basisgeschäft im Q1, ohne isolierte EBITDA-Gutschriften.
// Spielwaren und Wintersport behalten ihre eigenen saisonalen Abweichungen.
const WH: number[] = [1.06, 1.045, 1.03, 0.94, 0.95, 0.88, 0.95, 0.85, 0.9, 1.0, 1.2, 1.75];

function mit(basis: number[], over: Record<number, number>): number[] {
  return basis.map((x, i) => (over[i] !== undefined ? over[i] : x));
}

const ROH: GruppeDef[] = [
  { id: 'damen', name: 'Damen', format: 'warenhaus', marge: 0.48, saisonAnteil: 0.7, vorlauf: 14, beratung: 0.5, kkElast: 0.5, alterElast: 0.1, qmUmsatz: 35, anteilFlaeche: 0.2, saison: WH },
  { id: 'herren', name: 'Herren', format: 'warenhaus', marge: 0.47, saisonAnteil: 0.6, vorlauf: 14, beratung: 0.5, kkElast: 0.4, alterElast: 0.1, qmUmsatz: 33, anteilFlaeche: 0.12, saison: WH },
  { id: 'kinder', name: 'Kinder', format: 'warenhaus', marge: 0.42, saisonAnteil: 0.5, vorlauf: 12, beratung: 0.3, kkElast: -0.1, alterElast: -0.4, qmUmsatz: 30, anteilFlaeche: 0.07, saison: mit(WH, { 7: 1.05, 8: 1.0 }) },
  { id: 'beauty', name: 'Beauty', format: 'warenhaus', marge: 0.38, saisonAnteil: 0.1, vorlauf: 4, beratung: 0.8, kkElast: 0.7, alterElast: 0, qmUmsatz: 110, anteilFlaeche: 0.06, saison: mit(WH, { 11: 2.1, 4: 1.0 }) },
  { id: 'accessoires', name: 'Schuhe & Accessoires', format: 'warenhaus', marge: 0.45, saisonAnteil: 0.4, vorlauf: 10, beratung: 0.7, kkElast: 0.6, alterElast: 0.1, qmUmsatz: 60, anteilFlaeche: 0.1, saison: WH },
  { id: 'waesche', name: 'Wäsche', format: 'warenhaus', marge: 0.5, saisonAnteil: 0.3, vorlauf: 10, beratung: 0.5, kkElast: 0.2, alterElast: 0.4, qmUmsatz: 40, anteilFlaeche: 0.07, saison: WH },
  { id: 'wohnen', name: 'Wohnen & Haushalt', format: 'warenhaus', marge: 0.4, saisonAnteil: 0.2, vorlauf: 8, beratung: 0.4, kkElast: 0.1, alterElast: 0.5, qmUmsatz: 25, anteilFlaeche: 0.15, saison: mit(WH, { 11: 1.6 }) },
  { id: 'spielwaren', name: 'Spielwaren', format: 'warenhaus', marge: 0.35, saisonAnteil: 0.3, vorlauf: 12, beratung: 0.3, kkElast: 0, alterElast: -0.3, qmUmsatz: 28, anteilFlaeche: 0.06, saison: mit(WH, { 10: 1.6, 11: 3.0, 0: 0.6, 1: 0.55 }) },
  { id: 'food', name: 'Feinkost', format: 'warenhaus', marge: 0.3, saisonAnteil: 0.05, vorlauf: 1, beratung: 0.3, kkElast: 0.5, alterElast: 0.3, qmUmsatz: 55, anteilFlaeche: 0.07, saison: mit(WH, { 11: 1.5 }) },
  { id: 'sport', name: 'Sport', format: 'warenhaus', marge: 0.38, saisonAnteil: 0.5, vorlauf: 12, beratung: 0.5, kkElast: 0.1, alterElast: -0.3, qmUmsatz: 22, anteilFlaeche: 0.1, saison: WH },

  // Eigenes Schuhsortiment von FUNDUS (Phase 3: wirtschaftliche Simulation).
  { id: 'schuhe', name: 'Schuhe', format: 'outlet', marge: 0.43, saisonAnteil: 0.5, vorlauf: 10, beratung: 0.3, kkElast: 0.2, alterElast: 0, qmUmsatz: 38, anteilFlaeche: 0.14, saison: WH },
  { id: 'sportschuhe', name: 'Sportschuhe', format: 'sport', marge: 0.4, saisonAnteil: 0.3, vorlauf: 10, beratung: 0.6, kkElast: 0.1, alterElast: -0.5, qmUmsatz: 70, anteilFlaeche: 0.22, saison: [0.9, 0.8, 1.0, 1.05, 1.05, 1.0, 1.0, 1.05, 1.1, 0.95, 1.05, 1.3] },
  { id: 'sporttextil', name: 'Sporttextil', format: 'sport', marge: 0.45, saisonAnteil: 0.6, vorlauf: 12, beratung: 0.4, kkElast: 0.1, alterElast: -0.3, qmUmsatz: 40, anteilFlaeche: 0.28, saison: [0.95, 0.8, 0.95, 1.0, 1.05, 1.05, 1.0, 0.95, 1.0, 0.95, 1.05, 1.4] },
  { id: 'outdoor', name: 'Outdoor', format: 'sport', marge: 0.45, saisonAnteil: 0.6, vorlauf: 14, beratung: 0.7, kkElast: 0.4, alterElast: 0.2, qmUmsatz: 40, anteilFlaeche: 0.2, saison: [1.0, 0.8, 0.9, 1.0, 1.0, 0.95, 0.95, 0.85, 1.0, 1.2, 1.3, 1.5] },
  { id: 'rad', name: 'Rad', format: 'sport', marge: 0.3, saisonAnteil: 0.4, vorlauf: 16, beratung: 0.8, kkElast: 0.3, alterElast: 0, qmUmsatz: 30, anteilFlaeche: 0.12, saison: [0.4, 0.5, 1.1, 1.7, 1.8, 1.7, 1.5, 1.2, 0.9, 0.6, 0.5, 0.6] },
  { id: 'wintersport', name: 'Wintersport', format: 'sport', marge: 0.42, saisonAnteil: 0.9, vorlauf: 20, beratung: 0.9, kkElast: 0.6, alterElast: 0, qmUmsatz: 30, anteilFlaeche: 0.08, saison: [2.0, 1.6, 0.7, 0.3, 0.2, 0.2, 0.2, 0.2, 0.4, 1.0, 2.2, 3.0] },
  { id: 'teamsport', name: 'Teamsport', format: 'sport', marge: 0.4, saisonAnteil: 0.3, vorlauf: 8, beratung: 0.3, kkElast: -0.2, alterElast: -0.6, qmUmsatz: 30, anteilFlaeche: 0.1, saison: [0.8, 0.8, 1.0, 1.0, 0.9, 0.9, 1.2, 1.4, 1.3, 0.9, 0.8, 1.0] },
];

export const GRUPPEN: Record<GruppeId, GruppeDef> = Object.fromEntries(
  ROH.map((g) => {
    const m = g.saison.reduce((a, b) => a + b, 0) / 12;
    return [g.id, { ...g, saison: g.saison.map((x) => x / m) }];
  }),
) as Record<GruppeId, GruppeDef>;

export const GRUPPEN_LISTE: GruppeId[] = ROH.map((g) => g.id);
/** Die Sortimentstruktur steht schon vor dem wirtschaftlichen Start von Engine-Formate. */
export const sortimentVon = (f: Format): 'warenhaus' | 'sport' | 'outlet' => f === 'schwester' ? 'warenhaus' : f;
export const gruppenFuer = (f: Format): GruppeId[] =>
  f === 'schwester' ? ROH.filter((g) => g.format === 'warenhaus' && g.id !== 'food').map((g) => g.id)
  : f === 'outlet' ? ['damen', 'herren', 'kinder', 'schuhe', 'accessoires', 'wohnen', 'beauty']
  : ROH.filter((g) => g.format === f).map((g) => g.id);

/** Saisonfaktor einer Gruppe in einer Woche (linear zwischen Monaten interpoliert). */
export function saisonFaktor(g: GruppeId, woche: number): number {
  const s = GRUPPEN[g].saison;
  // KW 1–3 dürfen nicht anteilig Dezember/Weihnachten enthalten:
  // Der bisherige Wert -0,5 blendete KW 1 künstlich in den Dezember zurück.
  // Ab KW 4 bleibt die bisherige Interpolation und damit die Q4-Kurve unverändert.
  const pos = Math.max(0, ((woche % 52) / 52) * 12 - 0.5);
  const i = Math.floor(pos);
  const t = pos - i;
  const a = s[(i + 12) % 12];
  const b = s[(i + 13) % 12];
  return a + (b - a) * t;
}

export const LAGE_FAKTOR: Record<Lage, number> = { '1a': 1.15, b: 0.9, center: 1.0, rand: 0.8 };
export const CLUSTER_FAKTOR: Record<Cluster, number> = { metropole: 1.1, grossstadt: 1.0, mittelstadt: 0.85 };
/** Struktureller Frequenzverlust je Jahr nach Lage. */
export const TREND_LAGE: Record<Lage, number> = { '1a': 0.02, b: 0.035, center: 0.01, rand: 0.015 };
/** Marktübliche Mietquote am Umsatz bei Neuverhandlung. */
export const MARKTMIETE: Record<Lage, number> = { '1a': 0.1, b: 0.075, center: 0.11, rand: 0.065 };

// [Stadt, Region, Stadtgrößenklasse, Kaufkraft, Standortzahlen je Format]; Metropolen exakt die sieben definierten Zentren.
export interface StadtFormate { hartwig: number; premium: number; volkskauf: number; sport: number; fundus: number }
export type StadtDef = [string, Region, Cluster, number, StadtFormate];
export const STAEDTE: StadtDef[] = [
  ["Berlin", 'Ost', 'metropole', 0.97, { hartwig: 5, premium: 1, volkskauf: 0, sport: 2, fundus: 1 }],
  ["Hamburg", 'Nord', 'metropole', 1.1, { hartwig: 5, premium: 1, volkskauf: 1, sport: 2, fundus: 0 }],
  ["München", 'Süd', 'metropole', 1.3, { hartwig: 5, premium: 1, volkskauf: 1, sport: 2, fundus: 0 }],
  ["Köln", 'West', 'metropole', 1.05, { hartwig: 5, premium: 0, volkskauf: 2, sport: 2, fundus: 0 }],
  ["Frankfurt", 'Mitte', 'metropole', 1.15, { hartwig: 5, premium: 0, volkskauf: 1, sport: 2, fundus: 1 }],
  ["Düsseldorf", 'West', 'metropole', 1.15, { hartwig: 4, premium: 1, volkskauf: 2, sport: 2, fundus: 0 }],
  ["Stuttgart", 'Süd', 'metropole', 1.2, { hartwig: 5, premium: 0, volkskauf: 1, sport: 2, fundus: 1 }],
  ["Essen", 'West', 'grossstadt', 0.98, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Dortmund", 'West', 'grossstadt', 0.92, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Bremen", 'Nord', 'grossstadt', 0.98, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Leipzig", 'Ost', 'grossstadt', 0.88, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Dresden", 'Ost', 'grossstadt', 0.9, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Hannover", 'Nord', 'grossstadt', 1.02, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Nürnberg", 'Süd', 'grossstadt', 1.05, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Duisburg", 'West', 'grossstadt', 0.85, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Bochum", 'West', 'grossstadt', 0.92, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Wuppertal", 'West', 'grossstadt', 0.93, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Bielefeld", 'West', 'grossstadt', 0.98, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Bonn", 'West', 'grossstadt', 1.1, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Münster", 'West', 'grossstadt', 1.05, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Mannheim", 'Süd', 'grossstadt', 1, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 1 }],
  ["Karlsruhe", 'Süd', 'grossstadt', 1.05, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 1 }],
  ["Augsburg", 'Süd', 'grossstadt', 1.02, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 1 }],
  ["Wiesbaden", 'Mitte', 'grossstadt', 1.12, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 1 }],
  ["Mönchengladbach", 'West', 'grossstadt', 0.95, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Gelsenkirchen", 'West', 'grossstadt', 0.82, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Aachen", 'West', 'grossstadt', 0.97, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 1 }],
  ["Braunschweig", 'Nord', 'grossstadt', 1, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 1 }],
  ["Kiel", 'Nord', 'grossstadt', 0.95, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 1 }],
  ["Chemnitz", 'Ost', 'grossstadt', 0.85, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 0 }],
  ["Halle", 'Ost', 'grossstadt', 0.84, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 1 }],
  ["Magdeburg", 'Ost', 'grossstadt', 0.85, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 0 }],
  ["Freiburg", 'Süd', 'grossstadt', 1.05, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 0 }],
  ["Krefeld", 'West', 'grossstadt', 0.97, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Mainz", 'Mitte', 'grossstadt', 1.08, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 0 }],
  ["Lübeck", 'Nord', 'grossstadt', 0.95, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 0 }],
  ["Erfurt", 'Ost', 'grossstadt', 0.88, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 0 }],
  ["Oberhausen", 'West', 'grossstadt', 0.88, { hartwig: 3, premium: 0, volkskauf: 1, sport: 1, fundus: 0 }],
  ["Rostock", 'Ost', 'grossstadt', 0.86, { hartwig: 3, premium: 0, volkskauf: 0, sport: 1, fundus: 0 }],
  ["Kassel", 'Mitte', 'grossstadt', 0.93, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Hagen", 'West', 'grossstadt', 0.9, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Potsdam", 'Ost', 'grossstadt', 1, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Saarbrücken", 'Mitte', 'grossstadt', 0.93, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Hamm", 'West', 'grossstadt', 0.88, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Ludwigshafen", 'Mitte', 'grossstadt', 0.95, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Oldenburg", 'Nord', 'grossstadt', 0.98, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Mülheim", 'West', 'grossstadt', 1, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Osnabrück", 'Nord', 'grossstadt', 0.98, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Leverkusen", 'West', 'grossstadt', 1, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Darmstadt", 'Mitte', 'grossstadt', 1.1, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Heidelberg", 'Süd', 'grossstadt', 1.08, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Solingen", 'West', 'grossstadt', 0.98, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Regensburg", 'Süd', 'grossstadt', 1.1, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Paderborn", 'West', 'grossstadt', 0.95, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Ingolstadt", 'Süd', 'grossstadt', 1.18, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Würzburg", 'Süd', 'grossstadt', 1.02, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Ulm", 'Süd', 'grossstadt', 1.1, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Wolfsburg", 'Nord', 'grossstadt', 1.12, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Göttingen", 'Nord', 'grossstadt', 0.93, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Pforzheim", 'Süd', 'grossstadt', 1, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Offenbach", 'Mitte', 'grossstadt', 0.95, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Heilbronn", 'Süd', 'grossstadt', 1.12, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Bremerhaven", 'Nord', 'grossstadt', 0.83, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Trier", 'Mitte', 'grossstadt', 0.95, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Koblenz", 'Mitte', 'grossstadt', 1, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Jena", 'Ost', 'grossstadt', 0.92, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Siegen", 'West', 'grossstadt', 1, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Hildesheim", 'Nord', 'grossstadt', 0.95, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Cottbus", 'Ost', 'mittelstadt', 0.82, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Gütersloh", 'West', 'grossstadt', 1.05, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Recklinghausen", 'West', 'grossstadt', 0.92, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Bottrop", 'West', 'grossstadt', 0.9, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Reutlingen", 'Süd', 'grossstadt', 1.1, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Erlangen", 'Süd', 'grossstadt', 1.15, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Fürth", 'Süd', 'grossstadt', 1, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Bamberg", 'Süd', 'mittelstadt', 1, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Bayreuth", 'Süd', 'mittelstadt', 0.98, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Landshut", 'Süd', 'mittelstadt', 1.08, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Rosenheim", 'Süd', 'mittelstadt', 1.1, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Kempten", 'Süd', 'mittelstadt', 1.02, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Passau", 'Süd', 'mittelstadt', 0.95, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Konstanz", 'Süd', 'mittelstadt', 1.08, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Esslingen", 'Süd', 'mittelstadt', 1.15, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Ludwigsburg", 'Süd', 'mittelstadt', 1.15, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Tübingen", 'Süd', 'mittelstadt', 1.08, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Gießen", 'Mitte', 'mittelstadt', 0.92, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Marburg", 'Mitte', 'mittelstadt', 0.92, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Fulda", 'Mitte', 'mittelstadt', 0.98, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Hanau", 'Mitte', 'grossstadt', 1, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Wetzlar", 'Mitte', 'mittelstadt', 0.95, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Lüneburg", 'Nord', 'mittelstadt', 1, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Celle", 'Nord', 'mittelstadt', 0.97, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Flensburg", 'Nord', 'mittelstadt', 0.9, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Neumünster", 'Nord', 'mittelstadt', 0.88, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Stralsund", 'Ost', 'mittelstadt', 0.83, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Schwerin", 'Ost', 'mittelstadt', 0.86, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Zwickau", 'Ost', 'mittelstadt', 0.82, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Görlitz", 'Ost', 'mittelstadt', 0.78, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Dessau", 'Ost', 'mittelstadt', 0.8, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Gera", 'Ost', 'mittelstadt', 0.8, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Weimar", 'Ost', 'mittelstadt', 0.88, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Neuss", 'West', 'grossstadt', 1.05, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Düren", 'West', 'mittelstadt', 0.92, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Wesel", 'West', 'mittelstadt', 0.95, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Iserlohn", 'West', 'mittelstadt', 0.95, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Lüdenscheid", 'West', 'mittelstadt', 0.97, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Witten", 'West', 'mittelstadt', 0.93, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Marl", 'West', 'mittelstadt', 0.88, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Moers", 'West', 'grossstadt', 0.95, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Kaiserslautern", 'Mitte', 'grossstadt', 0.9, { hartwig: 3, premium: 0, volkskauf: 0, sport: 0, fundus: 1 }],
  ["Worms", 'Mitte', 'mittelstadt', 0.93, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Speyer", 'Mitte', 'mittelstadt', 1, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Offenburg", 'Süd', 'mittelstadt', 1.02, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Lörrach", 'Süd', 'mittelstadt', 1.02, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Ravensburg", 'Süd', 'mittelstadt', 1.08, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Aschaffenburg", 'Süd', 'mittelstadt', 1.02, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Schweinfurt", 'Süd', 'mittelstadt', 0.97, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Hof", 'Süd', 'mittelstadt', 0.85, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Amberg", 'Süd', 'mittelstadt', 0.92, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Straubing", 'Süd', 'mittelstadt', 0.95, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Neubrandenburg", 'Ost', 'mittelstadt', 0.8, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Frankfurt (Oder)", 'Ost', 'mittelstadt', 0.78, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Wilhelmshaven", 'Nord', 'mittelstadt', 0.84, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Emden", 'Nord', 'mittelstadt', 0.87, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Herford", 'West', 'mittelstadt', 0.97, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Detmold", 'West', 'mittelstadt', 0.97, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Minden", 'West', 'mittelstadt', 0.95, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Bocholt", 'West', 'mittelstadt', 0.95, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Ahaus", 'West', 'mittelstadt', 0.98, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Borken", 'West', 'mittelstadt', 0.96, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Dorsten", 'West', 'mittelstadt', 0.93, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Gladbeck", 'West', 'mittelstadt', 0.9, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Herten", 'West', 'mittelstadt', 0.9, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Castrop-Rauxel", 'West', 'mittelstadt', 0.9, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Lünen", 'West', 'mittelstadt', 0.92, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Bergkamen", 'West', 'mittelstadt', 0.92, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Unna", 'West', 'mittelstadt', 0.99, { hartwig: 1, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Schwerte", 'West', 'mittelstadt', 0.98, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Menden", 'West', 'mittelstadt', 0.96, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Arnsberg", 'West', 'mittelstadt', 0.98, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Soest", 'West', 'mittelstadt', 0.99, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Lippstadt", 'West', 'mittelstadt', 0.98, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Warendorf", 'West', 'mittelstadt', 1, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Ahlen", 'West', 'mittelstadt', 0.92, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Beckum", 'West', 'mittelstadt', 0.96, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Rheda-Wiedenbrück", 'West', 'mittelstadt', 1.03, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Oelde", 'West', 'mittelstadt', 1.02, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Bünde", 'West', 'mittelstadt', 0.98, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Bad Oeynhausen", 'West', 'mittelstadt', 0.98, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Löhne", 'West', 'mittelstadt', 0.97, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Bad Salzuflen", 'West', 'mittelstadt', 1, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Lemgo", 'West', 'mittelstadt', 0.97, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Euskirchen", 'West', 'mittelstadt', 0.97, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Brühl", 'West', 'mittelstadt', 1.03, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Hürth", 'West', 'mittelstadt', 1.04, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Pulheim", 'West', 'mittelstadt', 1.06, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Frechen", 'West', 'mittelstadt', 1, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Bergheim", 'West', 'mittelstadt', 0.96, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Kerpen", 'West', 'mittelstadt', 0.99, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Troisdorf", 'West', 'mittelstadt', 0.98, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Sankt Augustin", 'West', 'mittelstadt', 1, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Hennef", 'West', 'mittelstadt', 1, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Siegburg", 'West', 'mittelstadt', 1.01, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Gummersbach", 'West', 'mittelstadt', 0.95, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Remscheid", 'West', 'grossstadt', 0.94, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Bergisch Gladbach", 'West', 'grossstadt', 1.05, { hartwig: 3, premium: 0, volkskauf: 1, sport: 0, fundus: 1 }],
  ["Ratingen", 'West', 'mittelstadt', 1.08, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Rüsselsheim", 'Mitte', 'mittelstadt', 0.99, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Bad Homburg", 'Mitte', 'mittelstadt', 1.25, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Oberursel", 'Mitte', 'mittelstadt', 1.2, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Hofheim", 'Mitte', 'mittelstadt', 1.15, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Maintal", 'Mitte', 'mittelstadt', 1.03, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Dreieich", 'Mitte', 'mittelstadt', 1.12, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Neu-Isenburg", 'Mitte', 'mittelstadt', 1.1, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Rodgau", 'Mitte', 'mittelstadt', 1.05, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Bad Vilbel", 'Mitte', 'mittelstadt', 1.12, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Bad Nauheim", 'Mitte', 'mittelstadt', 1.07, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Friedberg", 'Mitte', 'mittelstadt', 1.02, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Limburg", 'Mitte', 'mittelstadt', 0.99, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Bad Kreuznach", 'Mitte', 'mittelstadt', 0.95, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Bingen", 'Mitte', 'mittelstadt', 1, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Neustadt an der Weinstraße", 'Mitte', 'mittelstadt', 1.02, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Landau in der Pfalz", 'Mitte', 'mittelstadt', 1.03, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Villingen-Schwenningen", 'Süd', 'mittelstadt', 1.02, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Singen", 'Süd', 'mittelstadt', 1.03, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Friedrichshafen", 'Süd', 'mittelstadt', 1.08, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Biberach an der Riß", 'Süd', 'mittelstadt', 1.06, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Memmingen", 'Süd', 'mittelstadt', 1.04, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Kaufbeuren", 'Süd', 'mittelstadt', 1.01, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Kitzingen", 'Süd', 'mittelstadt', 0.99, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Ansbach", 'Süd', 'mittelstadt', 1.03, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Schwabach", 'Süd', 'mittelstadt', 1.02, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Neumarkt in der Oberpfalz", 'Süd', 'mittelstadt', 1.02, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Weiden in der Oberpfalz", 'Süd', 'mittelstadt', 0.94, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Dachau", 'Süd', 'mittelstadt', 1.15, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Freising", 'Süd', 'mittelstadt', 1.12, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Erding", 'Süd', 'mittelstadt', 1.12, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Germering", 'Süd', 'mittelstadt', 1.15, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Fürstenfeldbruck", 'Süd', 'mittelstadt', 1.15, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Norderstedt", 'Nord', 'mittelstadt', 1.1, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Pinneberg", 'Nord', 'mittelstadt', 1.05, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Elmshorn", 'Nord', 'mittelstadt', 1, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Itzehoe", 'Nord', 'mittelstadt', 0.96, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Stade", 'Nord', 'mittelstadt', 1.02, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Buxtehude", 'Nord', 'mittelstadt', 1.04, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Nienburg", 'Nord', 'mittelstadt', 0.97, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Hameln", 'Nord', 'mittelstadt', 0.95, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Garbsen", 'Nord', 'mittelstadt', 1.01, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Langenhagen", 'Nord', 'mittelstadt', 1.04, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Neustadt am Rübenberge", 'Nord', 'mittelstadt', 0.99, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Plauen", 'Ost', 'mittelstadt', 0.82, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Bautzen", 'Ost', 'mittelstadt', 0.84, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Freiberg", 'Ost', 'mittelstadt', 0.85, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Pirna", 'Ost', 'mittelstadt', 0.87, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Riesa", 'Ost', 'mittelstadt', 0.81, { hartwig: 1, premium: 0, volkskauf: 0, sport: 0, fundus: 0 }],
  ["Meißen", 'Ost', 'mittelstadt', 0.91, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Bernburg", 'Ost', 'mittelstadt', 0.84, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Bitterfeld-Wolfen", 'Ost', 'mittelstadt', 0.82, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Eberswalde", 'Ost', 'mittelstadt', 0.89, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
  ["Oranienburg", 'Ost', 'mittelstadt', 0.93, { hartwig: 0, premium: 0, volkskauf: 1, sport: 0, fundus: 0 }],
];


/** Namen und Grafikschlüssel der vier Premium-Häuser. */
export const PREMIUM_HAEUSER = [
  { id: 'P001', schluessel: 'P001', rang: 1, name: 'Palais Hartwig', stadt: 'Berlin' },
  { id: 'P002', schluessel: 'P002', rang: 1, name: 'Hartwig am Hofgarten', stadt: 'München' },
  { id: 'P003', schluessel: 'P003', rang: 2, name: 'Alsterhaus Hartwig', stadt: 'Hamburg' },
  { id: 'P004', schluessel: 'P004', rang: 3, name: 'Hartwig Königsallee', stadt: 'Düsseldorf' },
] as const;

// Geografische Vertriebsregion ist die feste Eigenschaft der Stadt, nicht der
// dynamisch erzeugte Hauscluster (z. B. „Lausitz“ oder „Unterweser“).
export const STADT_REGIONEN: Readonly<Record<string, Region>> =
  Object.freeze(Object.fromEntries(STAEDTE.map(([name, region]) => [name, region])) as Record<string, Region>);
export function stadtRegion(name: string): Region | undefined { return STADT_REGIONEN[name]; }

// O01 Organisation: Namen nach geografischen Teilräumen je Region.
export const HAUSCLUSTER_NAMEN: Record<Region, string[]> = {
  Nord: ['Elbe West','Unterweser','Ostholstein','Nordseeküste','Hannover Nord','Weserbergland','Schleswig'],
  Ost: ['Berlin & Umland','Sachsen Nord','Lausitz','Thüringen Ost','Sachsen-Anhalt','Ostseeküste'],
  West: ['Ruhr West','Ruhr Ost','Rheinland Süd','Niederrhein','Westfalen Nord','Bergisches Land','Rhein-Wupper'],
  Mitte: ['Rhein-Main','Nordhessen','Mittelhessen','Pfalz','Mainfranken','Taunus'],
  Süd: ['Oberbayern','Schwaben','Neckarraum','Oberfranken','Südbaden','Donau','Allgäu'],
};

export const STANDORT_ZUSATZ: Record<Lage, string[]> = {
  '1a': ['Marktplatz', 'Hauptstraße', 'Innenstadt', 'Am Markt', 'Königstraße', 'Altstadt'],
  b: ['Bahnhofstraße', 'Am Wall', 'Neustadt', 'Ring', 'Lindenstraße'],
  center: ['Arkaden', 'City-Center', 'Einkaufszentrum', 'Galerie am Fluss'],
  rand: ['Gewerbepark', 'Am Stadtrand', 'Fachmarktzentrum'],
};

export const VORNAMEN = ['Sabine', 'Thomas', 'Petra', 'Michael', 'Andrea', 'Frank', 'Claudia', 'Jörg', 'Kerstin', 'Ralf', 'Nicole', 'Stefan', 'Anja', 'Markus', 'Birgit', 'Holger', 'Silke', 'Dirk', 'Heike', 'Uwe', 'Melanie', 'Jens', 'Tanja', 'Sven'];
export const NACHNAMEN = ['Krämer', 'Weber', 'Schulte', 'Hoffmann', 'Brandt', 'Wagner', 'Kaiser', 'Lorenz', 'Peters', 'Böhm', 'Seidel', 'Fuchs', 'Graf', 'Vogel', 'Hartmann', 'Busch', 'Wolff', 'Engel', 'Lange', 'Möller'];

/** Fiktive Käufer für den jährlichen Konzernverkauf ab Jahr vier. */
export const KONZERN_KAEUFER: { typ: 'Finanzinvestor' | 'Handelskonzern' | 'Immobilienfonds'; name: string }[] = [
  { typ: 'Finanzinvestor', name: 'Rheingold Beteiligungen' },
  { typ: 'Handelskonzern', name: 'Nordstern Handelsholding' },
  { typ: 'Immobilienfonds', name: 'Mosaik Immobilienfonds' },
  { typ: 'Finanzinvestor', name: 'Südwest Kapitalpartner' },
  { typ: 'Handelskonzern', name: 'Wesergrund Handelspartner' },
];

export const VERMIETER = ['Rheinkontor Immobilien', 'Nordwert Real Estate', 'Prisma Asset Management', 'Familie von Haller', 'Stadtwerk Grundbesitz', 'Atlas Retail Properties', 'Merian Fonds IV', 'Kontinental Immobilien KG'];

export interface LieferantDef {
  id: string;
  name: string;
  beschreibung: string;
  gruppen: Partial<Record<GruppeId, number>>;
  geduld: number;
  kvSensitivitaet: number;
  fragilitaet: number;
  wkzQuote: number;
  vertrauen: number;
}

export const LIEFERANTEN: LieferantDef[] = [
  { id: 'hallberg', name: 'Hallberg & Söhne', beschreibung: 'Mittelständler, Herren. Treu und geduldig, aber selbst knapp bei Kasse.', gruppen: { herren: 0.4 }, geduld: 0.85, kvSensitivitaet: 0.3, fragilitaet: 0.05, wkzQuote: 0.01, vertrauen: 70 },
  { id: 'arvel', name: 'Maison Arvel', beschreibung: 'Premium-Beauty. Bringt Frequenz, stellt Bedingungen an die Fläche.', gruppen: { beauty: 0.5 }, geduld: 0.4, kvSensitivitaet: 0.6, fragilitaet: 0, wkzQuote: 0.03, vertrauen: 55 },
  { id: 'nordline', name: 'Nordline', beschreibung: 'Große Sportmarke. Üppige Zuschüsse, baut parallel den Direktvertrieb aus.', gruppen: { sportschuhe: 0.45, sporttextil: 0.35, sport: 0.3 }, geduld: 0.5, kvSensitivitaet: 0.7, fragilitaet: 0, wkzQuote: 0.035, vertrauen: 58 },
  { id: 'kessler', name: 'Kessler Haushalt', beschreibung: 'Konditionen-Hardliner. Reagiert als Erster auf den Kreditversicherer.', gruppen: { wohnen: 0.4 }, geduld: 0.2, kvSensitivitaet: 2.0, fragilitaet: 0, wkzQuote: 0.015, vertrauen: 50 },
  { id: 'goldenthread', name: 'Golden Thread', beschreibung: 'Eigenmarken-Produzent in Asien. Günstig, lange Vorläufe, Fracht- und Währungsrisiko.', gruppen: { damen: 0.3, kinder: 0.3 }, geduld: 0.6, kvSensitivitaet: 0.5, fragilitaet: 0, wkzQuote: 0, vertrauen: 60 },
];

export interface MieterDef {
  typ: MieterTyp;
  namen: string[];
  etagen: number[]; // bevorzugte Etagen
  qm: [number, number];
  mieteQmMonat: [number, number];
  laufzeit: [number, number];
  frequenzBonus: number;
  umbauAnteil: number;
}

export const MIETER: MieterDef[] = [
  { typ: 'discounter', namen: ['Preisfuchs Markt', 'NettoPlus', 'Kaufgut'], etagen: [0, -1], qm: [1200, 2500], mieteQmMonat: [9, 16], laufzeit: [10, 15], frequenzBonus: 0.06, umbauAnteil: 0.5 },
  { typ: 'fitness', namen: ['IronCity Fitness', 'Pulsraum', 'FitWerk 24'], etagen: [-1, 3, 4], qm: [1500, 3000], mieteQmMonat: [6, 10], laufzeit: [10, 15], frequenzBonus: 0.02, umbauAnteil: 0.6 },
  { typ: 'aerztehaus', namen: ['MVZ Stadtmitte', 'Praxisgemeinschaft Zentrum', 'MediCampus'], etagen: [2, 3, 4], qm: [1000, 2500], mieteQmMonat: [10, 15], laufzeit: [10, 20], frequenzBonus: 0.02, umbauAnteil: 0.3 },
  { typ: 'behoerde', namen: ['Bürgeramt', 'Stadtbibliothek', 'Volkshochschule'], etagen: [1, 2, 3], qm: [1500, 4000], mieteQmMonat: [8, 12], laufzeit: [10, 20], frequenzBonus: 0.03, umbauAnteil: 0.4 },
  { typ: 'gastro', namen: ['Markthalle Kost', 'Café Fräulein', 'Burgerwerk'], etagen: [0, 4, 5], qm: [300, 900], mieteQmMonat: [14, 25], laufzeit: [5, 10], frequenzBonus: 0.015, umbauAnteil: 0.5 },
  { typ: 'coworking', namen: ['Deskhaus', 'WorkLoft', 'Raum & Ruhe'], etagen: [3, 4, 5], qm: [800, 2000], mieteQmMonat: [9, 14], laufzeit: [5, 10], frequenzBonus: 0.005, umbauAnteil: 0.3 },
  { typ: 'drogerie', namen: ['Rossberg Drogerie', 'Pflegewelt', 'Drogeriekontor'], etagen: [0, -1], qm: [600, 1200], mieteQmMonat: [14, 22], laufzeit: [10, 15], frequenzBonus: 0.04, umbauAnteil: 0.5 },
  // O07 Haus: zusätzliche Frequenzbringer mit fiktiven Eigennamen.
  { typ: 'baeckerei', namen: ['Backstube Mühlenfeld', 'Brot & Krumme', 'Kruste & Korn'], etagen: [0, -1], qm: [120, 350], mieteQmMonat: [15, 27], laufzeit: [5, 10], frequenzBonus: 0.017, umbauAnteil: 0.4 },
  { typ: 'paketshop', namen: ['PaketKontor', 'Paketpunkt Markt', 'Paketstube'], etagen: [0, -1], qm: [100, 270], mieteQmMonat: [12, 19], laufzeit: [5, 10], frequenzBonus: 0.014, umbauAnteil: 0.5 },
  { typ: 'bibliothek', namen: ['Stadtteilbibliothek', 'Lesekontor', 'Bücherraum'], etagen: [1, 2, 3], qm: [400, 1200], mieteQmMonat: [6, 11], laufzeit: [10, 20], frequenzBonus: 0.025, umbauAnteil: 0.3 },
];

export interface BeraterDef {
  typ: BeraterTyp;
  haeuser: string[];
  wochenSatz: number;
  dauer: number;
  bankBonus: number;
  eigentuemerBonus: number;
}

export const BERATER: BeraterDef[] = [
  { typ: 'strategie', haeuser: ['McKenzie Partners', 'Barnstorm Group', 'Rolland & Bergmann'], wochenSatz: 420_000, dauer: 10, bankBonus: 10, eigentuemerBonus: 6 },
  { typ: 'sanierung', haeuser: ['Alix & Hartmann', 'Brückner Restructuring', 'Falkenstein Advisory'], wochenSatz: 260_000, dauer: 8, bankBonus: 6, eigentuemerBonus: 3 },
  { typ: 'boutique', haeuser: ['Kontor Neun', 'Weissbach & Co.', 'Retailwerk'], wochenSatz: 110_000, dauer: 8, bankBonus: 1, eigentuemerBonus: 0 },
];

export const PROJEKTNAMEN = ['Phönix', 'Aufbruch', 'Zukunft 2030', 'Fokus', 'Leuchtturm', 'Neustart', 'Kompass', 'Horizont', 'Wende', 'Herzschlag', 'Fundament', 'Evolution'];

/** Identische Namensliste zur Stadtgrafik render/src/kit/wettbewerber.js. */
export const WETTBEWERBER_NAMEN: Record<WettbewerberArt, readonly string[]> = {
  modehaus: ['Brandhoff Mode', 'Lindner & Söhne', 'Haus Weidenau', 'Modehaus Kersting', 'Gebr. Hallmann', 'Haus Rosenau'],
  offprice: ['KAUFKISTE', 'WÜHLWERK', 'RESTEPARADIES', 'SCHNÄPPCHENHOF', 'PREISSPRUNG', 'POSTENPALAST'],
  textildiscounter: ['SPARMODE', 'KLEIDKAUF', 'TEXTILECK', 'MODEPREIS', 'STOFFSPAR', 'KLEIDERKISTE'],
  elektronik: ['VOLTWERK', 'KABELKÖNIG', 'GERÄTEHALLE', 'STROMHAUS', 'DIGIMARKT', 'SCHALTWERK'],
  premium: ['Haus Ahlert', 'Feldmann & Cie.', 'Kaufhaus Morgenroth', 'Haus Bellmann', 'Wagner & Thiel', 'Kaufhaus Lindenhof'],
  fastfashion: ['NOVA', 'TRENDWERK', 'WIRBEL', 'STYLO', 'KOLLEKT', 'PULS'],
  leer_ehemals: ['KAUFHAUS STRAUB', 'BÖLLING', 'WESTKAUF', 'HAUS MERTENS', 'WARENHAUS ELSNER', 'KAUFHAUS DREWS'],
};

/** Nachfrageüberschneidung je Konkurrenzart und Hartwig-Gruppe (0..1). */
export const WETTBEWERB_UEBERSCHNEIDUNG: Record<WettbewerberArt, Partial<Record<GruppeId, number>>> = {
  modehaus: { damen: 1, herren: 1, waesche: 0.6, accessoires: 0.6, kinder: 0.3 },
  fastfashion: { damen: 1, herren: 0.8, accessoires: 0.5, kinder: 0.3, sporttextil: 0.4 },
  textildiscounter: { kinder: 1, waesche: 0.8, damen: 0.6, herren: 0.6 },
  offprice: { damen: 0.4, herren: 0.4, kinder: 0.4, beauty: 0.4, accessoires: 0.4, waesche: 0.4, wohnen: 0.4, spielwaren: 0.4, food: 0.4, sport: 0.4,
    sportschuhe: 0.3, sporttextil: 0.3, outdoor: 0.3, rad: 0.3, wintersport: 0.3, teamsport: 0.3 },
  elektronik: { wohnen: 0.5, spielwaren: 0.3 },
  premium: { beauty: 1, accessoires: 1, damen: 0.6, food: 0.5 },
  leer_ehemals: {},
};


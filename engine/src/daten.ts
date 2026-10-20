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

const WH: number[] = [0.82, 0.72, 0.88, 0.92, 0.95, 0.88, 0.95, 0.85, 0.9, 1.0, 1.2, 1.75];

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
export const gruppenFuer = (f: Format): GruppeId[] => ROH.filter((g) => g.format === f).map((g) => g.id);

/** Saisonfaktor einer Gruppe in einer Woche (linear zwischen Monaten interpoliert). */
export function saisonFaktor(g: GruppeId, woche: number): number {
  const s = GRUPPEN[g].saison;
  const pos = ((woche % 52) / 52) * 12 - 0.5;
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

// [Stadt, Region, Cluster, Kaufkraft, Warenhäuser, Sporthäuser]
export type StadtDef = [string, Region, Cluster, number, number, number];
export const STAEDTE: StadtDef[] = [
  ['Berlin', 'Ost', 'metropole', 0.97, 4, 3], ['Hamburg', 'Nord', 'metropole', 1.1, 3, 2],
  ['München', 'Süd', 'metropole', 1.3, 3, 3], ['Köln', 'West', 'metropole', 1.05, 2, 2],
  ['Frankfurt', 'Mitte', 'metropole', 1.15, 2, 2], ['Düsseldorf', 'West', 'metropole', 1.15, 2, 2],
  ['Stuttgart', 'Süd', 'metropole', 1.2, 2, 2],
  ['Essen', 'West', 'grossstadt', 0.98, 2, 1], ['Dortmund', 'West', 'grossstadt', 0.92, 2, 1],
  ['Bremen', 'Nord', 'grossstadt', 0.98, 2, 1], ['Leipzig', 'Ost', 'grossstadt', 0.88, 2, 1],
  ['Dresden', 'Ost', 'grossstadt', 0.9, 2, 1], ['Hannover', 'Nord', 'grossstadt', 1.02, 2, 1],
  ['Nürnberg', 'Süd', 'grossstadt', 1.05, 2, 1], ['Duisburg', 'West', 'grossstadt', 0.85, 1, 1],
  ['Bochum', 'West', 'grossstadt', 0.92, 1, 1], ['Wuppertal', 'West', 'grossstadt', 0.93, 1, 1],
  ['Bielefeld', 'West', 'grossstadt', 0.98, 1, 1], ['Bonn', 'West', 'grossstadt', 1.1, 1, 1],
  ['Münster', 'West', 'grossstadt', 1.05, 1, 1], ['Mannheim', 'Süd', 'grossstadt', 1.0, 1, 1],
  ['Karlsruhe', 'Süd', 'grossstadt', 1.05, 1, 1], ['Augsburg', 'Süd', 'grossstadt', 1.02, 1, 1],
  ['Wiesbaden', 'Mitte', 'grossstadt', 1.12, 1, 1], ['Mönchengladbach', 'West', 'grossstadt', 0.95, 1, 0],
  ['Gelsenkirchen', 'West', 'grossstadt', 0.82, 1, 0], ['Aachen', 'West', 'grossstadt', 0.97, 1, 1],
  ['Braunschweig', 'Nord', 'grossstadt', 1.0, 1, 1], ['Kiel', 'Nord', 'grossstadt', 0.95, 1, 1],
  ['Chemnitz', 'Ost', 'grossstadt', 0.85, 1, 1], ['Halle', 'Ost', 'grossstadt', 0.84, 1, 0],
  ['Magdeburg', 'Ost', 'grossstadt', 0.85, 1, 1], ['Freiburg', 'Süd', 'grossstadt', 1.05, 1, 1],
  ['Krefeld', 'West', 'grossstadt', 0.97, 1, 0], ['Mainz', 'Mitte', 'grossstadt', 1.08, 1, 1],
  ['Lübeck', 'Nord', 'grossstadt', 0.95, 1, 1], ['Erfurt', 'Ost', 'grossstadt', 0.88, 1, 1],
  ['Oberhausen', 'West', 'grossstadt', 0.88, 1, 1], ['Rostock', 'Ost', 'grossstadt', 0.86, 1, 1],
  ['Kassel', 'Mitte', 'grossstadt', 0.93, 1, 1], ['Hagen', 'West', 'grossstadt', 0.9, 1, 0],
  ['Potsdam', 'Ost', 'grossstadt', 1.0, 1, 0], ['Saarbrücken', 'Mitte', 'grossstadt', 0.93, 1, 1],
  ['Hamm', 'West', 'grossstadt', 0.88, 1, 0], ['Ludwigshafen', 'Mitte', 'grossstadt', 0.95, 1, 0],
  ['Oldenburg', 'Nord', 'grossstadt', 0.98, 1, 0], ['Mülheim', 'West', 'grossstadt', 1.0, 1, 0],
  ['Osnabrück', 'Nord', 'grossstadt', 0.98, 1, 0], ['Leverkusen', 'West', 'grossstadt', 1.0, 1, 0],
  ['Darmstadt', 'Mitte', 'grossstadt', 1.1, 1, 0], ['Heidelberg', 'Süd', 'grossstadt', 1.08, 1, 0],
  ['Solingen', 'West', 'grossstadt', 0.98, 1, 0], ['Regensburg', 'Süd', 'grossstadt', 1.1, 1, 0],
  ['Paderborn', 'West', 'grossstadt', 0.95, 1, 0], ['Ingolstadt', 'Süd', 'grossstadt', 1.18, 1, 0],
  ['Würzburg', 'Süd', 'grossstadt', 1.02, 1, 0], ['Ulm', 'Süd', 'grossstadt', 1.1, 1, 0],
  ['Wolfsburg', 'Nord', 'grossstadt', 1.12, 1, 0], ['Göttingen', 'Nord', 'grossstadt', 0.93, 1, 0],
  ['Pforzheim', 'Süd', 'grossstadt', 1.0, 1, 0], ['Offenbach', 'Mitte', 'grossstadt', 0.95, 1, 0],
  ['Heilbronn', 'Süd', 'grossstadt', 1.12, 1, 0], ['Bremerhaven', 'Nord', 'grossstadt', 0.83, 1, 0],
  ['Trier', 'Mitte', 'grossstadt', 0.95, 1, 0], ['Koblenz', 'Mitte', 'grossstadt', 1.0, 1, 0],
  ['Jena', 'Ost', 'grossstadt', 0.92, 1, 0], ['Siegen', 'West', 'grossstadt', 1.0, 1, 0],
  ['Hildesheim', 'Nord', 'grossstadt', 0.95, 1, 0], ['Cottbus', 'Ost', 'grossstadt', 0.82, 1, 0],
  ['Gütersloh', 'West', 'mittelstadt', 1.05, 1, 0], ['Recklinghausen', 'West', 'mittelstadt', 0.92, 1, 0],
  ['Bottrop', 'West', 'mittelstadt', 0.9, 1, 0], ['Reutlingen', 'Süd', 'mittelstadt', 1.1, 1, 0],
  ['Erlangen', 'Süd', 'mittelstadt', 1.15, 1, 0], ['Fürth', 'Süd', 'mittelstadt', 1.0, 1, 0],
  ['Bamberg', 'Süd', 'mittelstadt', 1.0, 1, 0], ['Bayreuth', 'Süd', 'mittelstadt', 0.98, 1, 0],
  ['Landshut', 'Süd', 'mittelstadt', 1.08, 1, 0], ['Rosenheim', 'Süd', 'mittelstadt', 1.1, 1, 0],
  ['Kempten', 'Süd', 'mittelstadt', 1.02, 1, 0], ['Passau', 'Süd', 'mittelstadt', 0.95, 1, 0],
  ['Konstanz', 'Süd', 'mittelstadt', 1.08, 1, 0], ['Esslingen', 'Süd', 'mittelstadt', 1.15, 1, 0],
  ['Ludwigsburg', 'Süd', 'mittelstadt', 1.15, 1, 0], ['Tübingen', 'Süd', 'mittelstadt', 1.08, 1, 0],
  ['Gießen', 'Mitte', 'mittelstadt', 0.92, 1, 0], ['Marburg', 'Mitte', 'mittelstadt', 0.92, 1, 0],
  ['Fulda', 'Mitte', 'mittelstadt', 0.98, 1, 0], ['Hanau', 'Mitte', 'mittelstadt', 1.0, 1, 0],
  ['Wetzlar', 'Mitte', 'mittelstadt', 0.95, 1, 0], ['Lüneburg', 'Nord', 'mittelstadt', 1.0, 1, 0],
  ['Celle', 'Nord', 'mittelstadt', 0.97, 1, 0], ['Flensburg', 'Nord', 'mittelstadt', 0.9, 1, 0],
  ['Neumünster', 'Nord', 'mittelstadt', 0.88, 1, 0], ['Stralsund', 'Ost', 'mittelstadt', 0.83, 1, 0],
  ['Schwerin', 'Ost', 'mittelstadt', 0.86, 1, 0], ['Zwickau', 'Ost', 'mittelstadt', 0.82, 1, 0],
  ['Görlitz', 'Ost', 'mittelstadt', 0.78, 1, 0], ['Dessau', 'Ost', 'mittelstadt', 0.8, 1, 0],
  ['Gera', 'Ost', 'mittelstadt', 0.8, 1, 0], ['Weimar', 'Ost', 'mittelstadt', 0.88, 1, 0],
  ['Neuss', 'West', 'mittelstadt', 1.05, 1, 0], ['Düren', 'West', 'mittelstadt', 0.92, 1, 0],
  ['Wesel', 'West', 'mittelstadt', 0.95, 1, 0], ['Iserlohn', 'West', 'mittelstadt', 0.95, 1, 0],
  ['Lüdenscheid', 'West', 'mittelstadt', 0.97, 1, 0], ['Witten', 'West', 'mittelstadt', 0.93, 1, 0],
  ['Marl', 'West', 'mittelstadt', 0.88, 1, 0], ['Moers', 'West', 'mittelstadt', 0.95, 1, 0],
  ['Kaiserslautern', 'Mitte', 'mittelstadt', 0.9, 1, 0], ['Worms', 'Mitte', 'mittelstadt', 0.93, 1, 0],
  ['Speyer', 'Mitte', 'mittelstadt', 1.0, 1, 0], ['Offenburg', 'Süd', 'mittelstadt', 1.02, 1, 0],
  ['Lörrach', 'Süd', 'mittelstadt', 1.02, 1, 0], ['Ravensburg', 'Süd', 'mittelstadt', 1.08, 1, 0],
  ['Aschaffenburg', 'Süd', 'mittelstadt', 1.02, 1, 0], ['Schweinfurt', 'Süd', 'mittelstadt', 0.97, 1, 0],
  ['Hof', 'Süd', 'mittelstadt', 0.85, 1, 0], ['Amberg', 'Süd', 'mittelstadt', 0.92, 1, 0],
  ['Straubing', 'Süd', 'mittelstadt', 0.95, 1, 0], ['Neubrandenburg', 'Ost', 'mittelstadt', 0.8, 1, 0],
  ['Frankfurt (Oder)', 'Ost', 'mittelstadt', 0.78, 1, 0], ['Wilhelmshaven', 'Nord', 'mittelstadt', 0.84, 1, 0],
  ['Emden', 'Nord', 'mittelstadt', 0.87, 1, 0], ['Herford', 'West', 'mittelstadt', 0.97, 1, 0],
  ['Detmold', 'West', 'mittelstadt', 0.97, 1, 0], ['Minden', 'West', 'mittelstadt', 0.95, 1, 0],
];

export const STANDORT_ZUSATZ: Record<Lage, string[]> = {
  '1a': ['Marktplatz', 'Hauptstraße', 'Innenstadt', 'Am Markt', 'Königstraße', 'Altstadt'],
  b: ['Bahnhofstraße', 'Am Wall', 'Neustadt', 'Ring', 'Lindenstraße'],
  center: ['Arkaden', 'City-Center', 'Einkaufszentrum', 'Galerie am Fluss'],
  rand: ['Gewerbepark', 'Am Stadtrand', 'Fachmarktzentrum'],
};

export const VORNAMEN = ['Sabine', 'Thomas', 'Petra', 'Michael', 'Andrea', 'Frank', 'Claudia', 'Jörg', 'Kerstin', 'Ralf', 'Nicole', 'Stefan', 'Anja', 'Markus', 'Birgit', 'Holger', 'Silke', 'Dirk', 'Heike', 'Uwe', 'Melanie', 'Jens', 'Tanja', 'Sven'];
export const NACHNAMEN = ['Krämer', 'Weber', 'Schulte', 'Hoffmann', 'Brandt', 'Wagner', 'Kaiser', 'Lorenz', 'Peters', 'Böhm', 'Seidel', 'Fuchs', 'Graf', 'Vogel', 'Hartmann', 'Busch', 'Wolff', 'Engel', 'Lange', 'Möller'];

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
  { typ: 'drogerie', namen: ['Rossberg Drogerie', 'dm-Nachbar', 'Pflegewelt'], etagen: [0, -1], qm: [600, 1200], mieteQmMonat: [14, 22], laufzeit: [10, 15], frequenzBonus: 0.04, umbauAnteil: 0.5 },
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

/** Namen der Hartwig-Premiumhäuser; unabhängig von Premium-Mitbewerbern. */
export const PREMIUM_HAEUSER = [
  { id: 'P001', name: 'Palais Hartwig', stadt: 'Berlin', rang: 1 },
  { id: 'P002', name: 'Hartwig am Hofgarten', stadt: 'München', rang: 1 },
  { id: 'P003', name: 'Alsterhaus Hartwig', stadt: 'Hamburg', rang: 2 },
  { id: 'P004', name: 'Hartwig Königsallee', stadt: 'Düsseldorf', rang: 3 },
] as const;

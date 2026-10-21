/**
 * M7 / Abschnitt 17: Filial-GuV als eigenständige Kostenstelle.
 * Die IST-Referenz wird unverändert dokumentiert. Ihre Einzel-OPEX addieren
 * sich zu -44,6 % (ausgewiesene Summe -42,4 %); die Zeilen sind maßgeblich.
 * Keine Differenz wird als verdeckter Zuschuss gebucht.
 */
import type { GameState } from './types';

export const REFERENZ_FILIAL_GUV = [
  { id: 'umsatz', name: 'Umsatz', ist: 100.0 },
  { id: 'wareneinsatz', name: 'Wareneinsatz', ist: -58.8 },
  { id: 'bruttogewinn', name: 'Bruttogewinn', ist: 41.2, vorjahr: 41.7, plan: 46.1 },
  { id: 'uebrigeErtraege', name: 'Übrige betriebliche Erträge', ist: 2.3 },
  { id: 'personal', name: 'Personalaufwand', ist: -16.0, vorjahr: -15.6, plan: -15.6 },
  { id: 'fremdkraefte', name: 'Fremdkräfte', ist: -0.7 },
  { id: 'miete', name: 'Miete / Leasing', ist: -11.2 },
  { id: 'mietnebenkosten', name: 'Mietnebenkosten', ist: -1.5 },
  { id: 'logistik', name: 'Logistik', ist: -6.3 },
  { id: 'werbung', name: 'Werbung', ist: -1.8 },
  { id: 'unterhalt', name: 'Unterhalt', ist: -1.9 },
  { id: 'zahlungsverkehr', name: 'Zahlungsverkehr', ist: -0.2 },
  { id: 'facilityManagement', name: 'Facility Management', ist: -1.7 },
  { id: 'energie', name: 'Energie', ist: -2.4 },
  { id: 'it', name: 'IT', ist: -0.3 },
  { id: 'administration', name: 'Administrative Kosten', ist: -0.2 },
  { id: 'uebrigeAufwendungen', name: 'Übrige betriebliche Aufwendungen', ist: -0.4 },
  { id: 'opex', name: 'Total OPEX', ist: -42.4 },
  { id: 'ebitda', name: 'EBITDA Filialebene', ist: -1.2 },
] as const;

export type GuVPosition = typeof REFERENZ_FILIAL_GUV[number]['id'];
export type GuVKostenPosition = Exclude<GuVPosition, 'umsatz' | 'wareneinsatz' | 'bruttogewinn' | 'uebrigeErtraege' | 'opex' | 'ebitda'>;

export interface FilialGuV {
  umsatz: number;
  wareneinsatz: number;
  bruttogewinn: number;
  uebrigeErtraege: number;
  personal: number;
  fremdkraefte: number;
  miete: number;
  mietnebenkosten: number;
  logistik: number;
  werbung: number;
  unterhalt: number;
  zahlungsverkehr: number;
  facilityManagement: number;
  energie: number;
  it: number;
  administration: number;
  uebrigeAufwendungen: number;
  opex: number;
  ebitda: number;
  /** Darin enthaltene Warenabschriften: separate analytische Größe. */
  abschriften: number;
}

export const GUV_KOSTEN: GuVKostenPosition[] = [
  'personal', 'fremdkraefte', 'miete', 'mietnebenkosten', 'logistik',
  'werbung', 'unterhalt', 'zahlungsverkehr', 'facilityManagement',
  'energie', 'it', 'administration', 'uebrigeAufwendungen',
];

export function leereFilialGuV(): FilialGuV {
  return {
    umsatz: 0, wareneinsatz: 0, bruttogewinn: 0, uebrigeErtraege: 0,
    personal: 0, fremdkraefte: 0, miete: 0, mietnebenkosten: 0,
    logistik: 0, werbung: 0, unterhalt: 0, zahlungsverkehr: 0,
    facilityManagement: 0, energie: 0, it: 0, administration: 0,
    uebrigeAufwendungen: 0, opex: 0, ebitda: 0, abschriften: 0,
  };
}
export function guvAbschluss(g: FilialGuV): FilialGuV {
  g.opex = GUV_KOSTEN.reduce((x, p) => x + g[p], 0);
  g.ebitda = g.bruttogewinn + g.uebrigeErtraege - g.opex;
  return g;
}
export function guvAddiere(ziel: FilialGuV, quelle: FilialGuV): void {
  for (const key of Object.keys(ziel) as (keyof FilialGuV)[]) ziel[key] += quelle[key];
}

/** Ein Programm wirkt auf nachweisbare Erlöse, Preise oder Kosten, niemals auf die Insolvenzmechanik. */
export const FILIAL_PROGRAMME = {
  sortiment: { name: 'Sortiments- und Preisarchitektur', position: 'bruttogewinn', vorlauf: 10, ersparnis: 0.012, investitionsQuote: 0.0005, nebenwirkung: 'Höhere Preise können die Stücknachfrage dämpfen.' },
  personal: { name: 'Einsatzplanung und Produktivität', position: 'personal', vorlauf: 6, ersparnis: 0.09, investitionsQuote: 0.0003, nebenwirkung: 'Engere Besetzung erhöht das Risiko von Wartezeiten.' },
  fremdkraefte: { name: 'Fremdpersonal-Pooling', position: 'fremdkraefte', vorlauf: 4, ersparnis: 0.20, investitionsQuote: 0.00005, nebenwirkung: 'In Spitzenzeiten geringere flexible Reserve.' },
  miete: { name: 'Mietportfolio nachverhandeln', position: 'miete', vorlauf: 20, ersparnis: 0.12, investitionsQuote: 0.0004, nebenwirkung: 'Verhandlungskosten und Vermieterrisiko; keine Filialschließung.' },
  mietnebenkosten: { name: 'Flächennutzung und Nebenkosten prüfen', position: 'mietnebenkosten', vorlauf: 12, ersparnis: 0.12, investitionsQuote: 0.00015, nebenwirkung: 'Flächeneinschränkungen während der Umstellung.' },
  logistik: { name: 'Logistiknetz und Filialbelieferung bündeln', position: 'logistik', vorlauf: 12, ersparnis: 0.18, investitionsQuote: 0.0007, nebenwirkung: 'Weniger Lieferfenster und größere Bestelllose.' },
  werbung: { name: 'Werbewirkungssteuerung', position: 'werbung', vorlauf: 5, ersparnis: 0.15, investitionsQuote: 0.0001, nebenwirkung: 'Geringere Werbereichweite kann Frequenz kosten.' },
  unterhalt: { name: 'Präventive Instandhaltungsplanung', position: 'unterhalt', vorlauf: 12, ersparnis: 0.18, investitionsQuote: 0.0003, nebenwirkung: 'Umbau- und Wartungsfenster stören zeitweise den Betrieb.' },
  zahlungsverkehr: { name: 'Payment-Mix optimieren', position: 'zahlungsverkehr', vorlauf: 6, ersparnis: 0.22, investitionsQuote: 0.00006, nebenwirkung: 'Umstellung der Kassenterminals und Zahlungsarten.' },
  facilityManagement: { name: 'FM-Leistungsbündel neu vergeben', position: 'facilityManagement', vorlauf: 10, ersparnis: 0.20, investitionsQuote: 0.00012, nebenwirkung: 'Niedrigere Reinigungs- und Servicefrequenz.' },
  energie: { name: 'LED, HLK und Energiesteuerung', position: 'energie', vorlauf: 18, ersparnis: 0.28, investitionsQuote: 0.0014, nebenwirkung: 'Investition und temporäre Abschaltung einzelner Anlagen.' },
  it: { name: 'IT-Lizenzen und Endgeräte konsolidieren', position: 'it', vorlauf: 10, ersparnis: 0.22, investitionsQuote: 0.00013, nebenwirkung: 'Migration und Schulungsbedarf.' },
  administration: { name: 'Filialadministration automatisieren', position: 'administration', vorlauf: 8, ersparnis: 0.22, investitionsQuote: 0.00013, nebenwirkung: 'Prozessumstellung und Anlaufaufwand.' },
  uebrigeAufwendungen: { name: 'Filialverbrauch und Beschaffung bündeln', position: 'uebrigeAufwendungen', vorlauf: 7, ersparnis: 0.20, investitionsQuote: 0.0001, nebenwirkung: 'Striktere Ausgabenfreigaben vermindern Flexibilität.' },
} as const;
export type FilialProgrammId = keyof typeof FILIAL_PROGRAMME;
export type FilialProgrammeStand = Partial<Record<FilialProgrammId, { start: number; wirksamAb: number }>>;

/** Wirkt ausschließlich nach Abschluss der Vorlaufzeit und reduziert echte Kosten-/Preispositionen. */
export function programmErsparnis(s: GameState, id: FilialProgrammId): number {
  const p = s.filialProgramme?.[id];
  return p && s.woche >= p.wirksamAb ? FILIAL_PROGRAMME[id].ersparnis : 0;
}

/** Niedrigere Preiselastizität bei aktiver Werbe- und Personaloptimierung ist nicht garantiert. */
export function programmNachfrageFaktor(s: GameState): number {
  return (1 - (programmErsparnis(s, 'sortiment') ? 0.006 : 0))
    * (1 - (programmErsparnis(s, 'personal') ? 0.004 : 0))
    * (1 - (programmErsparnis(s, 'werbung') ? 0.006 : 0));
}

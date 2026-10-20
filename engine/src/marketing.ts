// Marketing: Kanäle mit Wochenbudget, Kundenkarte "Hartwig Karte" plus App, CRM-Kampagnen, Aktionskalender.
// Vertrag: ../VORSTAND-MARKETING-VERTRAG.md, Abschnitt 2.
//
// Kalibrierung: Alle Wirkungen laufen als Verhältnis zwischen dem Ist-Zustand (`stand.ist`) und dem
// Standardplan (`stand.plan`, Startbudgets, Startkarte, Start-CRM, Startkalender `stand.referenz`). Der Standardplan
// entwickelt sich mit Umsatz, Netz und Zeit genauso weiter wie der Ist-Zustand, nur ohne Eingriffe des Spielers.
// Solange der Spieler nichts ändert, sind beide gleich und das Ergebnis trifft die bisherige Ausgangslage exakt
// (Saisonkurve, Margen und Gewöhnung haben das Standardjahr eingepreist). Jede Abweichung wirkt als Differenz.
// Die Netto-Werbekosten des Standardplans sind die bisherige Werbequote (PARAM.marketingQuote); die
// Lieferantenbeteiligung an Prospekt und Anzeigen schließt die Lücke zur Bruttoquote.

import { GRUPPEN, saisonFaktor } from './daten';
import type { Aktion, AktionsScope, GameState, GruppeId, Haus, Region } from './types';
import { clamp, eur, kw as kwVon, melde, mio, neueId, zwischen, type RngHalter } from './util';
import { hqMarketingFaktor } from './hq';
import { WG, type WgId } from './einkauf';
import { PARAM } from './welt';
import { registriereDelegation } from './vorstand';

// ---------------------------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------------------------

export type KanalId = 'prospekt' | 'anzeigen' | 'plakat' | 'radio' | 'tv' | 'online' | 'social' | 'schaufenster' | 'crm';
export type Altersgruppe = 'jung' | 'mitte' | 'aelter' | 'senioren';
export const ALTERSGRUPPEN: Altersgruppe[] = ['jung', 'mitte', 'aelter', 'senioren'];
export const ALTERSGRUPPE_TEXT: Record<Altersgruppe, string> = { jung: 'unter 30', mitte: '30 bis 49', aelter: '50 bis 64', senioren: '65 plus' };
export const REGIONEN: Region[] = ['Nord', 'Ost', 'West', 'Mitte', 'Süd'];

export interface KanalDef {
  id: KanalId;
  name: string;
  text: string;
  /** Startbudget als Anteil vom Umsatz (brutto). */
  quote: number;
  /** Wirkungselastizität des Budgets (abnehmender Grenznutzen). */
  e: number;
  /** Gedächtnis (Adstock) je Woche: hoch = Wirkung baut sich langsam auf und hält lange. */
  adstock: number;
  reichweite: Record<Altersgruppe, number>;
  /** Beitrag zur Markenstärke (Image). */
  marke: number;
  /** Beitrag zur Kommunikation von Aktionen. */
  aktion: number;
  regional: boolean;
}

export const KANAELE: KanalDef[] = [
  { id: 'prospekt', name: 'Prospekt und Beilage', text: 'Wochenprospekt als Beilage und Haushaltsverteilung, größter Block, trägt die Aktionen.', quote: 0.01297, e: 0.55, adstock: 0.35, reichweite: { jung: 0.18, mitte: 0.4, aelter: 0.62, senioren: 0.75 }, marke: 0.1, aktion: 0.5, regional: true },
  { id: 'anzeigen', name: 'Anzeigen', text: 'Tageszeitung und Magazine.', quote: 0.00162, e: 0.45, adstock: 0.4, reichweite: { jung: 0.05, mitte: 0.18, aelter: 0.42, senioren: 0.6 }, marke: 0.2, aktion: 0.1, regional: true },
  { id: 'plakat', name: 'Plakat', text: 'Großflächen und City-Light-Poster in den Innenstädten.', quote: 0.00195, e: 0.5, adstock: 0.75, reichweite: { jung: 0.5, mitte: 0.5, aelter: 0.45, senioren: 0.4 }, marke: 0.6, aktion: 0.1, regional: true },
  { id: 'radio', name: 'Radio', text: 'Regionale Sender, Spots zu Aktionen.', quote: 0.0013, e: 0.5, adstock: 0.6, reichweite: { jung: 0.3, mitte: 0.55, aelter: 0.6, senioren: 0.5 }, marke: 0.4, aktion: 0.15, regional: true },
  { id: 'tv', name: 'TV', text: 'Bundesweite Spots, vor allem zu Weihnachten und Jubiläum.', quote: 0.00162, e: 0.5, adstock: 0.85, reichweite: { jung: 0.35, mitte: 0.5, aelter: 0.7, senioren: 0.82 }, marke: 1, aktion: 0.05, regional: false },
  { id: 'online', name: 'Online (Suche, Display)', text: 'Suchmaschinenwerbung, Display, Preisportale.', quote: 0.00357, e: 0.6, adstock: 0.25, reichweite: { jung: 0.75, mitte: 0.7, aelter: 0.5, senioren: 0.25 }, marke: 0.2, aktion: 0.2, regional: false },
  { id: 'social', name: 'Social und Influencer', text: 'Social-Media-Kampagnen und Kooperationen mit Influencern.', quote: 0.0013, e: 0.55, adstock: 0.5, reichweite: { jung: 0.85, mitte: 0.55, aelter: 0.22, senioren: 0.06 }, marke: 0.6, aktion: 0.15, regional: false },
  { id: 'schaufenster', name: 'Schaufenster und Fläche', text: 'Schaufenster, Aktionsflächen, Deko und Beschilderung im Haus.', quote: 0.00227, e: 0.5, adstock: 0.7, reichweite: { jung: 0.5, mitte: 0.5, aelter: 0.5, senioren: 0.5 }, marke: 0.5, aktion: 0.25, regional: true },
  { id: 'crm', name: 'CRM (Mail, Push, Brief)', text: 'Grundbetrieb CRM: Werkzeuge, Agentur, Kontaktstrategie. Versandkosten der Kampagnen kommen dazu.', quote: 0.0013, e: 0.5, adstock: 0.4, reichweite: { jung: 0.15, mitte: 0.3, aelter: 0.6, senioren: 0.7 }, marke: 0.1, aktion: 0.1, regional: false },
];
export const KANAL: Record<KanalId, KanalDef> = Object.fromEntries(KANAELE.map((k) => [k.id, k])) as Record<KanalId, KanalDef>;

export interface KanalStand { quote: number; adstock: number; abnutzung: number; regionen: Record<Region, number> }

export interface AppStand {
  downloads: number;
  aktiveNutzer: number;
  pushQuote: number; // Anteil aktiver Nutzer mit Push-Einwilligung
  budgetWoche: number;
  qualitaet: number; // 0..1
  relaunchBis?: number;
  appCoupons: boolean; // Coupons der Aktionen in der App
}

export interface KarteStand {
  mitglieder: number;
  aktivQuote: number;
  optInMail: number; // Anzahl Mitglieder mit Mail-Einwilligung
  adressQuote: number;
  punkteSatz: number; // Punktewert je Euro Umsatz (0,005 = 1 Punkt je 2 € à 1 Cent)
  stufen: boolean; // Statusstufen Silber und Gold
  kartenrabatt: number; // dauerhafter Rabatt auf Kartenkäufe
  anmeldepraemie: number; // Willkommensgutschein in €
  anmeldeBis?: number;
  datenqualitaet: number; // 0..1
  datenBudgetWoche: number;
  umsatzAnteil: number;
  neuWoche: number;
  abgangWoche: number;
  reaktiviert: number;
  app: AppStand;
}

export type SegmentTyp = 'alle' | 'alter' | 'kaufkraft' | 'inaktive' | 'top' | 'geburtstag' | 'affinitaet';
export interface CrmSegment { typ: SegmentTyp; alter?: Altersgruppe; kaufkraft?: 'hoch' | 'mittel' | 'niedrig'; gruppe?: GruppeId }
export type CrmKanal = 'mail' | 'push' | 'brief';
export type CrmAngebot =
  | { typ: 'coupon'; prozent: number; mindestbon: number }
  | { typ: 'punkte'; faktor: number }
  | { typ: 'zugabe'; wert: number }
  | { typ: 'info' };
export type CrmFrequenz = 'einmalig' | 'woechentlich' | 'zweiwoechentlich' | 'monatlich' | 'quartal';
export const FREQUENZ_WOCHEN: Record<CrmFrequenz, number> = { einmalig: 0, woechentlich: 1, zweiwoechentlich: 2, monatlich: 4, quartal: 13 };

export interface CrmErgebnis {
  sendungen: number;
  versendet: number;
  geoeffnet: number;
  eingeloest: number;
  umsatzEingeloest: number;
  mehrumsatz: number; // wahr, vor Bestandsgrenze
  mitnahme: number; // Umsatz der Einlöser, die ohnehin gekauft hätten
  rabattkosten: number;
  versandkosten: number;
  abmeldungen: number;
}

export interface CrmKampagne {
  id: string;
  name: string;
  segment: CrmSegment;
  kanal: CrmKanal;
  angebot: CrmAngebot;
  frequenz: CrmFrequenz;
  start: number;
  ende?: number; // exklusiv
  status: 'geplant' | 'aktiv' | 'gestoppt' | 'beendet';
  naechster: number;
  kontrollgruppe: boolean;
  standard?: boolean;
  summe: CrmErgebnis;
  letzte?: CrmErgebnis & { woche: number };
}

/** Ein Szenario: Ist oder Standardplan. */
export interface MarketingSzenario {
  kanaele: Record<KanalId, KanalStand>;
  karte: KarteStand;
  crm: CrmKampagne[];
  ermuedung: Record<CrmKanal, number>;
  marke: number; // Markenstärke 0..100
  vorzug: Partial<Record<GruppeId, number>>; // vorgezogene Nachfrage (Anteil einer Normalwoche)
}

export type Mechanik = 'rabatt_alles' | 'rabatt_bereich' | 'rabatt_wg' | 'coupon' | 'punkte' | 'staffel' | 'reduzierung' | 'personalkauf';
export type Anlass =
  | 'wsv' | 'ssv' | 'midseason' | 'blackfriday' | 'weihnachten' | 'ostern' | 'muttertag' | 'beauty' | 'waesche' | 'schulanfang'
  | 'jubilaeum' | 'mwst' | 'friends' | 'personalkauf' | 'raeumung' | 'sonder';

export const MECHANIK_TEXT: Record<Mechanik, string> = {
  rabatt_alles: 'Rabatt auf alles', rabatt_bereich: 'Rabatt auf Bereiche', rabatt_wg: 'Rabatt auf eine Warengruppe', coupon: 'Coupon ab Mindestbon',
  punkte: 'Mehrfachpunkte', staffel: 'Staffel (3 für 2)', reduzierung: 'Preisreduzierung (Sale)', personalkauf: 'Personalkauf',
};

/** Verdeckte Wahrheit einer Aktion (Controlling schätzt sie in der Auswertung). */
export interface AktionWahr { rabatt: number; mitnahme: number; vorzieh: number; kanni: number; altware: number; image: number; gewoehnung: number; umsatzMit: number }

export interface WochenWert { u: Partial<Record<GruppeId | '_', number>>; d: Partial<Record<GruppeId | '_', number>> }
interface Druck { basis: Partial<Record<GruppeId, number>>; u: Partial<Record<GruppeId, number>>; nu: Partial<Record<GruppeId, number>>; d: number; dBasis: number; img: number; bon: number }

/** Arbeitsstand der laufenden Woche (wird jede Woche neu gesetzt). */
export interface MarketingWocheArbeit {
  woche: number;
  uLetzt: number; // Umsatz der Vorwoche (Bezug für CRM und Coupons)
  regionAnteil: Record<Region, number>;
  crm: { ist: WochenWert; plan: WochenWert };
  sigma: { ist: Record<string, number>; plan: Record<string, number> }; // Couponanteil je Aktion
  /** Altwaren-Boost je Bereich oder WG-Id. */
  alt: { ist: Record<string, number>; plan: Record<string, number> };
  /** Nachfrageverschiebung zwischen den WG eines Bereichs je Haus (`haus|bereich`), Ist zu Plan; nur bei WG-Aktionen. */
  tilt: Record<string, Partial<Record<WgId, number>>>;
  druck: { ist: Druck; plan: Druck };
  altVerkauf: Record<string, number>; // je Bereich und je WG-Id
  crmKosten: { ist: number; plan: number };
  komm: { ist: number; plan: number };
}

export interface MarketingVerlauf {
  woche: number;
  umsatz: number;
  brutto: number;
  beteiligung: number;
  netto: number;
  sonderwerbung: number;
  kunden: number;
  bon: number;
  kartenanteil: number;
  rabattquote: number;
  marke: number;
  image: number;
  gewoehnung: number;
  crmMehrumsatz: number;
  aktionen: number;
}

export interface MarketingStand {
  ist: MarketingSzenario;
  plan: MarketingSzenario;
  /** Startkalender, fortgeschrieben: Bezug für alle Aktionseffekte. */
  referenz: Aktion[];
  rng: number;
  netzStart: number;
  netzLetzt: number;
  woche: MarketingWocheArbeit;
  verlauf: MarketingVerlauf[];
  kalenderJahre: number[];
}

// ---------------------------------------------------------------------------------------------
// Parameter
// ---------------------------------------------------------------------------------------------

export const MK = {
  /** Anteil der Nachfrage, der an der Kanalwirkung hängt. */
  kanalAnteil: 0.03,
  /** Wirkung der Marketingabteilung (HQ), wie bisher 3 % der Nachfrage. */
  hqAnteil: 0.03,
  markeStart: 60,
  markeTempo: 0.008,
  markeNachfrage: 0.03,
  markeImage: 0.002,
  bon: 41, // Ø Kassenbon in €
  karteMitglieder: 4_100_000,
  karteAktiv: 0.38,
  karteAnteil: 0.34,
  karteOptIn: 0.42,
  kartenBetriebJeMitglied: 0.45, // € je Jahr
  punkteEinloesung: 0.85,
  stufenKosten: 0.0015, // vom Kartenumsatz
  neuBasis: 9_000,
  abgangBasis: 0.0022,
  appDownloads: 650_000,
  appAktiv: 170_000,
  appBudget: 30_000,
  appQualitaet: 0.35,
  appRelaunch: 1_800_000,
  stufenEinfuehrung: 1_200_000,
  datenBudget: 15_000,
  prospektHaushalte: 6_500_000,
  versand: { mail: 0.002, push: 0.0005, brief: 0.65 } as Record<CrmKanal, number>,
  versandPauschale: 2_500,
  oeffnung: { mail: 0.33, push: 0.11, brief: 0.6 } as Record<CrmKanal, number>,
  einloesungKanal: { mail: 1, push: 0.85, brief: 1.35 } as Record<CrmKanal, number>,
  abmeldung: { mail: 0.0004, push: 0.0008, brief: 0 } as Record<CrmKanal, number>,
  kannibalisierung: 0.15,
  /** Anteil des WG-Mehrabsatzes, der den Nachbar-WG im selben Bereich fehlt. */
  kannibalisierungWg: 0.25,
  vorzugAbbau: 0.75,
  gewoehnung: 0.033,
  /** Anteil der Aktionswirkung, der an der Kommunikation (Prospekt, Online, Fläche) hängt. */
  kommAnteil: 0.25,
};

const SEG: Record<SegmentTyp, { oeffnung: number; einl: number; mitnahme: number; bon: number }> = {
  alle: { oeffnung: 1, einl: 1, mitnahme: 0.55, bon: 48 },
  alter: { oeffnung: 1.05, einl: 1.05, mitnahme: 0.52, bon: 48 },
  kaufkraft: { oeffnung: 1.05, einl: 1.05, mitnahme: 0.55, bon: 46 },
  inaktive: { oeffnung: 0.6, einl: 0.5, mitnahme: 0.2, bon: 40 },
  top: { oeffnung: 1.2, einl: 1.7, mitnahme: 0.75, bon: 95 },
  geburtstag: { oeffnung: 1.35, einl: 1.9, mitnahme: 0.45, bon: 58 },
  affinitaet: { oeffnung: 1.15, einl: 1.25, mitnahme: 0.5, bon: 52 },
};
const KARTE_ALTER: Record<Altersgruppe, number> = { jung: 0.12, mitte: 0.28, aelter: 0.34, senioren: 0.26 };

const MODE: GruppeId[] = ['damen', 'herren', 'kinder', 'accessoires', 'waesche', 'sporttextil', 'outdoor', 'wintersport', 'sportschuhe'];

export interface KalenderVorlage {
  anlass: Anlass; name: string; kw: number; wochen: number; mechanik: Mechanik; rabatt?: number; bereiche?: GruppeId[];
  mindestbon?: number; punkteFaktor?: number; auflage?: number;
}

/** Startkalender: ein übliches Warenhausjahr. */
export const STARTKALENDER: KalenderVorlage[] = [
  { anlass: 'wsv', name: 'Winterschlussverkauf', kw: 1, wochen: 4, mechanik: 'reduzierung', rabatt: 0.4, bereiche: MODE },
  { anlass: 'friends', name: 'Friends and Family', kw: 10, wochen: 1, mechanik: 'coupon', rabatt: 0.2, mindestbon: 0, auflage: 900_000 },
  { anlass: 'ostern', name: 'Ostern', kw: 13, wochen: 2, mechanik: 'rabatt_bereich', rabatt: 0.15, bereiche: ['spielwaren', 'food', 'kinder'] },
  { anlass: 'beauty', name: 'Beauty Days', kw: 16, wochen: 2, mechanik: 'rabatt_bereich', rabatt: 0.2, bereiche: ['beauty'] },
  { anlass: 'muttertag', name: 'Muttertag', kw: 19, wochen: 1, mechanik: 'punkte', punkteFaktor: 5, bereiche: ['beauty', 'accessoires', 'waesche'] },
  { anlass: 'midseason', name: 'Mid Season Sale', kw: 22, wochen: 2, mechanik: 'reduzierung', rabatt: 0.3, bereiche: ['damen', 'herren', 'kinder', 'sporttextil'] },
  { anlass: 'personalkauf', name: 'Personalkauf Sommer', kw: 24, wochen: 1, mechanik: 'personalkauf', rabatt: 0.2 },
  { anlass: 'ssv', name: 'Sommerschlussverkauf', kw: 27, wochen: 4, mechanik: 'reduzierung', rabatt: 0.4, bereiche: MODE },
  { anlass: 'schulanfang', name: 'Schulanfang', kw: 32, wochen: 2, mechanik: 'rabatt_bereich', rabatt: 0.15, bereiche: ['kinder', 'spielwaren', 'teamsport'] },
  { anlass: 'waesche', name: 'Wäsche Days', kw: 35, wochen: 1, mechanik: 'staffel', bereiche: ['waesche'] },
  { anlass: 'jubilaeum', name: 'Hartwig Jubiläumswochen', kw: 39, wochen: 2, mechanik: 'coupon', rabatt: 0.15, mindestbon: 50 },
  { anlass: 'mwst', name: 'Mehrwertsteuer-Aktion', kw: 43, wochen: 1, mechanik: 'rabatt_alles', rabatt: 0.16 },
  { anlass: 'personalkauf', name: 'Personalkauf Winter', kw: 45, wochen: 1, mechanik: 'personalkauf', rabatt: 0.2 },
  { anlass: 'blackfriday', name: 'Black Friday und Cyber Week', kw: 47, wochen: 2, mechanik: 'rabatt_alles', rabatt: 0.2 },
  { anlass: 'weihnachten', name: 'Weihnachtspunkte', kw: 49, wochen: 3, mechanik: 'punkte', punkteFaktor: 5 },
];

/** Anlässe mit typischem Termin und Standardmechanik (für den Planungsdialog). */
export const ANLAESSE: Record<Anlass, { name: string; kw: number; wochen: number; mechanik: Mechanik; rabatt: number; bereiche?: GruppeId[] }> = {
  wsv: { name: 'Winterschlussverkauf', kw: 1, wochen: 4, mechanik: 'reduzierung', rabatt: 0.4, bereiche: MODE },
  ssv: { name: 'Sommerschlussverkauf', kw: 27, wochen: 4, mechanik: 'reduzierung', rabatt: 0.4, bereiche: MODE },
  midseason: { name: 'Mid Season Sale', kw: 22, wochen: 2, mechanik: 'reduzierung', rabatt: 0.3, bereiche: ['damen', 'herren', 'kinder', 'sporttextil'] },
  blackfriday: { name: 'Black Friday und Cyber Week', kw: 47, wochen: 2, mechanik: 'rabatt_alles', rabatt: 0.2 },
  weihnachten: { name: 'Weihnachten', kw: 49, wochen: 3, mechanik: 'punkte', rabatt: 0 },
  ostern: { name: 'Ostern', kw: 13, wochen: 2, mechanik: 'rabatt_bereich', rabatt: 0.15, bereiche: ['spielwaren', 'food', 'kinder'] },
  muttertag: { name: 'Muttertag', kw: 19, wochen: 1, mechanik: 'punkte', rabatt: 0, bereiche: ['beauty', 'accessoires', 'waesche'] },
  beauty: { name: 'Beauty Days', kw: 16, wochen: 2, mechanik: 'rabatt_bereich', rabatt: 0.2, bereiche: ['beauty'] },
  waesche: { name: 'Wäsche Days', kw: 35, wochen: 1, mechanik: 'staffel', rabatt: 0.33, bereiche: ['waesche'] },
  schulanfang: { name: 'Schulanfang', kw: 32, wochen: 2, mechanik: 'rabatt_bereich', rabatt: 0.15, bereiche: ['kinder', 'spielwaren', 'teamsport'] },
  jubilaeum: { name: 'Jubiläumswochen', kw: 39, wochen: 2, mechanik: 'coupon', rabatt: 0.15 },
  mwst: { name: 'Mehrwertsteuer-Aktion', kw: 43, wochen: 1, mechanik: 'rabatt_alles', rabatt: 0.16 },
  friends: { name: 'Friends and Family', kw: 10, wochen: 1, mechanik: 'coupon', rabatt: 0.2 },
  personalkauf: { name: 'Personalkauf', kw: 24, wochen: 1, mechanik: 'personalkauf', rabatt: 0.2 },
  raeumung: { name: 'Räumungsverkauf', kw: 1, wochen: 4, mechanik: 'reduzierung', rabatt: 0.4 },
  sonder: { name: 'Sonderaktion', kw: 1, wochen: 1, mechanik: 'rabatt_alles', rabatt: 0.2 },
};

// ---------------------------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------------------------

const leerErgebnis = (): CrmErgebnis => ({ sendungen: 0, versendet: 0, geoeffnet: 0, eingeloest: 0, umsatzEingeloest: 0, mehrumsatz: 0, mitnahme: 0, rabattkosten: 0, versandkosten: 0, abmeldungen: 0 });
const regionen1 = (): Record<Region, number> => ({ Nord: 1, Ost: 1, West: 1, Mitte: 1, Süd: 1 });

function startKampagnen(): CrmKampagne[] {
  const k = (id: string, name: string, segment: CrmSegment, kanal: CrmKanal, angebot: CrmAngebot, frequenz: CrmFrequenz, start = 0): CrmKampagne => ({
    id, name, segment, kanal, angebot, frequenz, start, status: 'aktiv', naechster: start, kontrollgruppe: true, standard: true, summe: leerErgebnis(),
  });
  return [
    k('crm-newsletter', 'Hartwig Newsletter', { typ: 'alle' }, 'mail', { typ: 'info' }, 'woechentlich'),
    k('crm-geburtstag', 'Geburtstagsgruß', { typ: 'geburtstag' }, 'mail', { typ: 'coupon', prozent: 0.1, mindestbon: 0 }, 'woechentlich'),
    k('crm-topbrief', 'Kundenbrief Saisonstart', { typ: 'top' }, 'brief', { typ: 'coupon', prozent: 0.15, mindestbon: 100 }, 'quartal', 6),
  ];
}

function startSzenario(): MarketingSzenario {
  const kanaele = Object.fromEntries(KANAELE.map((k) => [k.id, { quote: k.quote, adstock: k.quote, abnutzung: 0, regionen: regionen1() }])) as Record<KanalId, KanalStand>;
  return {
    kanaele,
    karte: {
      mitglieder: MK.karteMitglieder, aktivQuote: MK.karteAktiv, optInMail: MK.karteMitglieder * MK.karteOptIn, adressQuote: 0.93,
      punkteSatz: 0.005, stufen: false, kartenrabatt: 0, anmeldepraemie: 0, datenqualitaet: 0.45, datenBudgetWoche: MK.datenBudget,
      umsatzAnteil: MK.karteAnteil, neuWoche: MK.neuBasis, abgangWoche: MK.neuBasis, reaktiviert: 0,
      app: { downloads: MK.appDownloads, aktiveNutzer: MK.appAktiv, pushQuote: 0.34, budgetWoche: MK.appBudget, qualitaet: MK.appQualitaet, appCoupons: false },
    },
    crm: startKampagnen(),
    ermuedung: { mail: 0.408, push: 0, brief: 0.01 },
    marke: MK.markeStart,
    vorzug: {},
  };
}

function leererDruck(): Druck { return { basis: {}, u: {}, nu: {}, d: 0, dBasis: 0, img: 0, bon: 0 }; }
function leereArbeit(w: number): MarketingWocheArbeit {
  return {
    woche: w, uLetzt: 0, regionAnteil: { Nord: 0.2, Ost: 0.2, West: 0.2, Mitte: 0.2, Süd: 0.2 },
    crm: { ist: { u: {}, d: {} }, plan: { u: {}, d: {} } }, sigma: { ist: {}, plan: {} }, alt: { ist: {}, plan: {} }, tilt: {},
    druck: { ist: leererDruck(), plan: leererDruck() }, altVerkauf: {}, crmKosten: { ist: 0, plan: 0 }, komm: { ist: 1, plan: 1 },
  };
}

function netz(s: GameState): number {
  let x = 0;
  for (const h of s.haeuser) {
    if (h.status !== 'offen' && h.status !== 'schliessung_verhandlung' && h.status !== 'raeumung') continue;
    for (const [g, P] of Object.entries(h.potenzial) as [GruppeId, number][]) {
      let qm = 0;
      for (const f of h.flaechen) if (f.gruppe === g && (f.konzept === 'eigen' || f.konzept === 'kommission')) qm += f.qm;
      x += P * (1 - Math.exp(-qm / (h.saettigungQm[g] ?? 1)));
    }
  }
  return x;
}

/** Aktion aus einer Kalendervorlage für ein Jahr. */
function ausVorlage(s: GameState, v: KalenderVorlage, jahrIndex: number, id: string): Aktion {
  const start = jahrIndex * 52 + v.kw - 1;
  return {
    id, name: v.name, rabatt: v.rabatt ?? 0, start, ende: start + v.wochen, scope: { typ: 'alle' }, kontrollHaeuser: [], kosten: 0,
    _mehrumsatzWahr: 0, _rohertragseffektWahr: 0, anlass: v.anlass, mechanik: v.mechanik, bereiche: v.bereiche ? [...v.bereiche] : undefined,
    mindestbon: v.mindestbon, punkteFaktor: v.punkteFaktor, auflage: v.auflage, standard: true, status: 'geplant',
  };
}

/** Plant den Standardkalender eines Jahres (Ist und Standardplan). */
function kalenderJahr(s: GameState, jahrIndex: number): void {
  const m = s.marketing.stand;
  if (m.kalenderJahre.includes(jahrIndex)) return;
  m.kalenderJahre.push(jahrIndex);
  STARTKALENDER.forEach((v, i) => {
    const id = `k${jahrIndex}-${i + 1}`;
    m.referenz.push(ausVorlage(s, v, jahrIndex, id));
    s.marketing.aktionen.push(ausVorlage(s, v, jahrIndex, id));
  });
}

export function erzeugeMarketing(s: GameState): MarketingStand {
  return {
    ist: startSzenario(), plan: startSzenario(), referenz: [], rng: (s.seed * 2246822519 + 0x4d4b) >>> 0,
    netzStart: 0, netzLetzt: 0, woche: leereArbeit(0), verlauf: [], kalenderJahre: [],
  };
}

/** Nach dem Weltaufbau: Netz messen, Startkalender des ersten Jahres. */
export function initialisiereMarketing(s: GameState): void {
  const m = s.marketing.stand;
  m.netzStart = m.netzLetzt = netz(s);
  kalenderJahr(s, Math.floor(s.woche / 52));
  registriereMarketingKi();
}

/** CMO-Delegation in vorstand.ts einhängen (erst zur Laufzeit, wegen der Importreihenfolge). */
export function registriereMarketingKi(): void {
  registriereDelegation('cmo', 'aktionskalender', delegiereAktionskalender);
  registriereDelegation('cmo', 'crm', delegiereCrm);
  registriereDelegation('cmo', 'kanalbudget', delegiereKanalbudget);
}

// ---------------------------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------------------------

const rngM = (s: GameState): RngHalter => s.marketing.stand as unknown as RngHalter;
export const marketingRng = rngM;

function trifft(a: Aktion, h: Haus, s: GameState): boolean {
  if (a.kontrollHaeuser.includes(h.id)) return false;
  if (h.klasse === 'premium' && a.scope.typ === 'alle' && s.premiumSchuetzen !== false) return false;
  const sc = a.scope;
  return sc.typ === 'alle' || (sc.typ === 'format' && sc.format === h.format) || (sc.typ === 'region' && sc.region === h.region) ||
    (sc.typ === 'cluster' && sc.cluster === h.cluster) || (sc.typ === 'haeuser' && sc.ids.includes(h.id));
}
const laeuft = (a: Aktion, w: number): boolean => a.status !== 'abgesagt' && w >= a.start && w < a.ende;
const mech = (a: Aktion): Mechanik => (a.mechanik as Mechanik | undefined) ?? 'rabatt_alles';

/** Gruppen, die die Aktion betrifft (undefined = alle). */
function gruppenVon(a: Aktion): GruppeId[] | undefined {
  if (a.wg) { const d = WG[a.wg as WgId]; return d ? [d.bereich] : undefined; }
  return a.bereiche && a.bereiche.length ? a.bereiche : undefined;
}

function altersAnteile(h: Haus): Record<Altersgruppe, number> {
  const a = h.einzug.alter;
  const roh = { jung: 0.16 * Math.pow(a, -1.5), mitte: 0.3 * Math.pow(a, -0.5), aelter: 0.31 * Math.pow(a, 0.6), senioren: 0.23 * Math.pow(a, 1.4) };
  const sum = roh.jung + roh.mitte + roh.aelter + roh.senioren;
  return { jung: roh.jung / sum, mitte: roh.mitte / sum, aelter: roh.aelter / sum, senioren: roh.senioren / sum };
}

const LAGE_SCHAUFENSTER: Record<Haus['lage'], number> = { '1a': 1.2, b: 1, center: 0.9, rand: 0.7 };

function kanalRel(sc: MarketingSzenario, k: KanalId): number { return sc.kanaele[k].adstock / KANAL[k].quote; }

function regionFaktor(st: KanalStand, def: KanalDef, r: Region, anteil: Record<Region, number>): number {
  if (!def.regional) return 1;
  let n = 0;
  for (const x of REGIONEN) n += st.regionen[x] * anteil[x];
  return n > 0 ? st.regionen[r] / n : 1;
}

/** Kanalwirkung in einem Haus (Summe Reichweite × Budgetwirkung). */
function kanalWirkung(s: GameState, sc: MarketingSzenario, h: Haus): number {
  const al = altersAnteile(h);
  const anteil = s.marketing.stand.woche.regionAnteil;
  let x = 0;
  for (const def of KANAELE) {
    const st = sc.kanaele[def.id];
    let wirk = 0;
    for (const a of ALTERSGRUPPEN) wirk += al[a] * def.reichweite[a];
    if (def.id === 'schaufenster') wirk *= LAGE_SCHAUFENSTER[h.lage];
    const rel = kanalRel(sc, def.id) * regionFaktor(st, def, h.region, anteil);
    x += def.quote * wirk * Math.pow(Math.max(0, rel), def.e) * (1 - st.abnutzung);
  }
  return x;
}

function markenZiel(sc: MarketingSzenario): number {
  let a = 0; let b = 0;
  for (const def of KANAELE) { a += def.marke * def.quote * Math.sqrt(Math.max(0, kanalRel(sc, def.id))) * (1 - sc.kanaele[def.id].abnutzung); b += def.marke * def.quote; }
  return MK.markeStart * Math.pow(a / b, 0.8);
}

function kommunikation(sc: MarketingSzenario): number {
  let a = 0; let b = 0;
  for (const def of KANAELE) { a += def.aktion * Math.sqrt(Math.max(0, kanalRel(sc, def.id))); b += def.aktion; }
  return 1 - MK.kommAnteil + MK.kommAnteil * (a / b);
}

/** Mengeneffekt eines Preisvorteils: Aktionselastizität rund 2 (kommunizierter Rabatt), gedämpft durch Gewöhnung und Kaufkraft. */
const uplift = (r: number, g: number, h: Haus): number => 1.6 * Math.pow(Math.max(0, r), 0.85) * (1 - g) * Math.sqrt(clamp(2 - h.einzug.kaufkraft, 0.5, 1.5));

// ---------------------------------------------------------------------------------------------
// Wirkung je Haus (aus wirtschaft.ts)
// ---------------------------------------------------------------------------------------------

/** Faktor auf die Hausnachfrage aus Kanälen, Markenstärke und Marketingabteilung (Ausgangslage = 1). */
export function marketingHausFaktor(s: GameState, h: Haus): number {
  const m = s.marketing.stand;
  if (!m) return 1;
  const q = kanalWirkung(s, m.ist, h) / kanalWirkung(s, m.plan, h);
  const hq = hqMarketingFaktor(s);
  return (1 + MK.kanalAnteil * (q - 1)) * (1 + MK.hqAnteil * (hq - 1) * q) * (1 + (MK.markeNachfrage * (m.ist.marke - m.plan.marke)) / MK.markeStart);
}

interface PromoWert { u: number; d: number; nu: number; alt: number; bon: number; img: number; a: Aktion; uWg?: number }

/** Wirkung einer Aktion auf eine Gruppe in einem Haus (ohne Kannibalisierung). */
function promoWert(s: GameState, a: Aktion, h: Haus, g: GruppeId, sc: MarketingSzenario, sigma: number, komm: number): PromoWert | undefined {
  const gs = gruppenVon(a);
  if (gs && !gs.includes(g)) return undefined;
  const gw = s.marketing.gewoehnung;
  const r = a.rabatt;
  const kb = komm * (a.kosten > 0 ? 1 + 0.25 * Math.min(1, (a.kosten / Math.max(1, a.ende - a.start)) / Math.max(1, 0.004 * s.marketing.stand.woche.uLetzt)) : 1);
  const v: PromoWert = { u: 0, d: 0, nu: 0, alt: 0, bon: 0, img: 0, a };
  switch (mech(a)) {
    case 'rabatt_alles': v.d = 0.6 * r; v.u = uplift(r, gw, h) * kb; v.nu = 0.07; v.alt = 0.3 * r; v.img = r >= 0.3 ? -0.3 : 0; break;
    case 'rabatt_bereich': v.d = 0.85 * r; v.u = 1.1 * uplift(r, gw, h) * kb; v.nu = 0.07; v.alt = 0.4 * r; v.img = r >= 0.3 ? -0.15 : 0; break;
    case 'rabatt_wg': {
      // Wirkung auf die WG selbst; im Bereich zählt ihr Anteil, abzüglich Kannibalisierung der Nachbar-WG
      const an = WG[a.wg as WgId]?.anteil ?? 0.2;
      v.uWg = 1.3 * uplift(r, gw, h) * kb;
      v.u = an * v.uWg * (1 - MK.kannibalisierungWg);
      v.d = 0.85 * r * Math.min(1, (an * (1 + v.uWg)) / (1 + v.u)); v.nu = 0.06; v.alt = 0; break;
    }
    case 'coupon': {
      v.d = sigma * r; v.u = sigma * (1 - 0.55) + sigma * 0.55 * 0.12; v.nu = 0.06; v.bon = sigma * Math.max(0, (a.mindestbon ?? 0) / MK.bon - 1) * 0.5; break;
    }
    case 'punkte': {
      const wert = ((a.punkteFaktor ?? 5) - 1) * sc.karte.punkteSatz * MK.punkteEinloesung;
      const ant = sc.karte.umsatzAnteil;
      v.d = ant * wert; v.u = ant * uplift(Math.min(0.5, 2.5 * wert), gw, h) * kb; v.nu = 0.05; break;
    }
    case 'staffel': v.d = 0.3 * 0.333; v.u = uplift(0.2, gw, h) * kb; v.nu = 0.08; v.alt = 0.3; v.bon = 0.12; break;
    case 'reduzierung': v.d = 0.45 * r; v.u = 0.8 * uplift(r, gw, h) * kb; v.nu = 0.09; v.alt = 1.3 * (r / 0.3); v.img = r >= 0.5 ? -0.25 : r >= 0.3 ? -0.05 : 0; break;
    case 'personalkauf': v.d = 0.025 * (r / 0.2); v.u = 0.035 * (r / 0.2); v.nu = 0.02; break;
  }
  return v;
}

interface GruppenEffekt { u: number; d: number; nu: number; sieger?: PromoWert; alle: PromoWert[] }

function gruppenEffekt(s: GameState, liste: Aktion[], h: Haus, g: GruppeId, sc: MarketingSzenario, sigma: Record<string, number>, komm: number): GruppenEffekt {
  const ws: PromoWert[] = [];
  for (const a of liste) { const v = promoWert(s, a, h, g, sc, sigma[a.id] ?? 0, komm); if (v) ws.push(v); }
  if (!ws.length) return { u: 0, d: 0, nu: 0, alle: ws };
  ws.sort((x, y) => y.u - x.u);
  let u = ws[0].u; let d = ws[0].d; let nu = ws[0].nu * ws[0].u;
  for (const v of ws.slice(1)) { u += 0.3 * v.u; d += v.d; nu += v.nu * 0.3 * v.u; }
  return { u, d: Math.min(0.6, d), nu, sieger: ws[0], alle: ws };
}

/** Messdatensatz je Haus, Gruppe und Aktion (vor Bestandsgrenze). */
export interface AktionsMessung { id: string; g: GruppeId; tE: number; bruttoMit: number; umsatzMit: number; bruttoOhne: number; umsatzOhne: number; mitnahme: number; kanni: boolean }

export interface MarketingGruppe { nachfrage: number; preis: number }

/**
 * Aktionen, Kundenkarte und CRM je Gruppe eines Hauses als Verhältnis zum Standardplan. `basis` = Nachfrage je Gruppe
 * vor Aktionen, `tE` = Eigenanteil je Gruppe. Schreibt Messdatensätze für die Aktionsauswertung in `mess`.
 */
export function marketingGruppen(s: GameState, h: Haus, basis: Partial<Record<GruppeId, number>>, tE: Partial<Record<GruppeId, number>>, mess: AktionsMessung[]): Partial<Record<GruppeId, MarketingGruppe>> {
  const m = s.marketing.stand;
  const out: Partial<Record<GruppeId, MarketingGruppe>> = {};
  if (!m) { for (const g of Object.keys(basis) as GruppeId[]) out[g] = { nachfrage: 1, preis: 1 }; return out; }
  const w = s.woche;
  const ist = s.marketing.aktionen.filter((a) => laeuft(a, w) && trifft(a, h, s));
  const plan = m.referenz.filter((a) => laeuft(a, w) && trifft(a, h, s));
  const A = m.woche;
  const gruppen = Object.keys(basis) as GruppeId[];
  const eI: Partial<Record<GruppeId, GruppenEffekt>> = {};
  const eP: Partial<Record<GruppeId, GruppenEffekt>> = {};
  let sumB = 0; let promB = { ist: 0, plan: 0 }; let promU = { ist: 0, plan: 0 };
  const breit = (e: GruppenEffekt) => e.sieger && (mech(e.sieger.a) === 'rabatt_bereich' || mech(e.sieger.a) === 'rabatt_wg' || mech(e.sieger.a) === 'staffel' || ((mech(e.sieger.a) === 'coupon' || mech(e.sieger.a) === 'reduzierung' || mech(e.sieger.a) === 'punkte') && !!gruppenVon(e.sieger.a)));
  for (const g of gruppen) {
    const b = basis[g] ?? 0;
    sumB += b;
    eI[g] = gruppenEffekt(s, ist, h, g, m.ist, A.sigma.ist, A.komm.ist);
    eP[g] = gruppenEffekt(s, plan, h, g, m.plan, A.sigma.plan, A.komm.plan);
    if (breit(eI[g]!)) { promB.ist += b; promU.ist += b * eI[g]!.u; }
    if (breit(eP[g]!)) { promB.plan += b; promU.plan += b * eP[g]!.u; }
  }
  // Kannibalisierung: Aktionen auf einzelne Bereiche ziehen Nachfrage aus den übrigen Bereichen des Hauses
  const kanI = sumB > 0 && promB.ist > 0 ? MK.kannibalisierung * (promU.ist / promB.ist) * (promB.ist / sumB) : 0;
  const kanP = sumB > 0 && promB.plan > 0 ? MK.kannibalisierung * (promU.plan / promB.plan) * (promB.plan / sumB) : 0;
  let staerkste: PromoWert | undefined;
  for (const g of gruppen) { const x = eI[g]!.sieger; if (x && (!staerkste || x.u > staerkste.u)) staerkste = x; }
  const kI = m.ist.karte; const kP = m.plan.karte;
  const kartU = (k: KarteStand) => k.umsatzAnteil * (0.12 + (k.stufen ? 0.02 : 0)) + k.umsatzAnteil * uplift(k.kartenrabatt, s.marketing.gewoehnung, h) * 0.5;
  const ukI = kartU(kI); const ukP = kartU(kP);
  const dkI = kI.umsatzAnteil * kI.kartenrabatt; const dkP = kP.umsatzAnteil * kP.kartenrabatt;
  const cI = A.crm.ist; const cP = A.crm.plan;
  const DI = A.druck.ist; const DP = A.druck.plan;
  for (const g of gruppen) {
    const b = basis[g] ?? 0;
    const ei = eI[g]!; const ep = eP[g]!;
    const kanniI = ei.u === 0 && kanI > 0 ? -kanI : 0;
    const kanniP = ep.u === 0 && kanP > 0 ? -kanP : 0;
    const crmUI = (cI.u._ ?? 0) + (cI.u[g] ?? 0); const crmUP = (cP.u._ ?? 0) + (cP.u[g] ?? 0);
    const crmDI = (cI.d._ ?? 0) + (cI.d[g] ?? 0); const crmDP = (cP.d._ ?? 0) + (cP.d[g] ?? 0);
    const nennerU = 1 + ep.u + kanniP + crmUP + ukP;
    const nennerD = 1 - ep.d - crmDP - dkP;
    const vz = (1 - (m.ist.vorzug[g] ?? 0)) / (1 - (m.plan.vorzug[g] ?? 0));
    const nachfrage = ((1 + ei.u + kanniI + crmUI + ukI) / nennerU) * vz;
    const preis = (1 - ei.d - crmDI - dkI) / nennerD;
    out[g] = { nachfrage, preis };
    // WG-Aktionen: Nachfrage innerhalb des Bereichs zur beworbenen WG verschieben (einkauf.ts normiert auf den Bereich)
    if (ei.alle.some((v) => v.uWg !== undefined) || ep.alle.some((v) => v.uWg !== undefined)) {
      const ti = wgTilt(g, ei.alle); const tp = wgTilt(g, ep.alle);
      const r: Partial<Record<WgId, number>> = {};
      for (const d of Object.keys(ti) as WgId[]) r[d] = (ti[d] ?? 1) / (tp[d] ?? 1);
      A.tilt[`${h.id}|${g}`] = r;
    }
    // Druck für Vorzug, Gewöhnung und Image (Kettenebene)
    for (const [D, e] of [[DI, ei], [DP, ep]] as [Druck, GruppenEffekt][]) {
      D.basis[g] = (D.basis[g] ?? 0) + b;
      D.u[g] = (D.u[g] ?? 0) + b * e.u;
      D.nu[g] = (D.nu[g] ?? 0) + b * e.nu;
      D.d += b * e.d; D.dBasis += b;
      if (e.sieger) { D.img += b * e.sieger.img; D.bon += b * e.sieger.bon; }
    }
    // Messung: Ist mit gegen Ist ohne die Aktionen des Spielers
    const sieger = ei.sieger ?? (kanniI < 0 ? staerkste : undefined);
    if (sieger && !s.prognose) {
      const nOhne = ((1 + crmUI + ukI) / nennerU) * vz;
      const pOhne = (1 - crmDI - dkI) / nennerD;
      mess.push({ id: sieger.a.id, g, tE: tE[g] ?? 1, bruttoMit: b * nachfrage, umsatzMit: b * nachfrage * preis, bruttoOhne: b * nOhne, umsatzOhne: b * nOhne * pOhne, mitnahme: b * nOhne * (pOhne - (1 - ei.d - crmDI - dkI) / nennerD) , kanni: !ei.sieger });
    }
  }
  return out;
}

/** Relative Nachfrage je WG eines Bereichs aus den laufenden WG-Aktionen eines Szenarios (1 = ohne Aktion). */
function wgTilt(g: GruppeId, ws: PromoWert[]): Partial<Record<WgId, number>> {
  const liste = Object.values(WG).filter((d) => d.bereich === g);
  const t: Partial<Record<WgId, number>> = Object.fromEntries(liste.map((d) => [d.id, 1]));
  for (const v of ws) {
    if (v.uWg === undefined || !v.a.wg) continue;
    const an = WG[v.a.wg as WgId]?.anteil ?? 0.2;
    const nachbar = an < 1 ? (MK.kannibalisierungWg * an * v.uWg) / (1 - an) : 0;
    for (const d of liste) t[d.id] = (t[d.id] ?? 1) * (d.id === v.a.wg ? 1 + v.uWg : Math.max(0.2, 1 - nachbar));
  }
  return t;
}

/** Verschiebung der Nachfrage zwischen den WG eines Bereichs in einem Haus (undefined = keine WG-Aktion). */
export function marketingWgTilt(s: GameState, hausId: string, g: GruppeId): Partial<Record<WgId, number>> | undefined {
  const A = s.marketing.stand?.woche;
  if (!A || A.woche !== s.woche) return undefined;
  return A.tilt[`${hausId}|${g}`];
}

/** Faktor auf die Altware, die die Saisonnachfrage einer WG decken darf (Sale baut Altware ab, Bereich oder WG). */
export function marketingAltwareFaktor(s: GameState, g: GruppeId, wg?: WgId): number {
  const A = s.marketing.stand?.woche;
  if (!A || A.woche !== s.woche) return 1;
  const ist = Math.max(A.alt.ist[g] ?? 0, wg ? A.alt.ist[wg] ?? 0 : 0);
  const plan = Math.max(A.alt.plan[g] ?? 0, wg ? A.alt.plan[wg] ?? 0 : 0);
  return (1 + ist) / (1 + plan);
}

/** Einkauf meldet die verkaufte Altware je Bereich und WG (für die Auswertung des Altwarenabbaus). */
export function marketingAltVerkauf(s: GameState, g: GruppeId, wert: number, wg?: WgId): void {
  const A = s.marketing.stand?.woche;
  if (!A || A.woche !== s.woche) return;
  A.altVerkauf[g] = (A.altVerkauf[g] ?? 0) + wert;
  if (wg) A.altVerkauf[wg] = (A.altVerkauf[wg] ?? 0) + wert;
}

// ---------------------------------------------------------------------------------------------
// Wochentakt
// ---------------------------------------------------------------------------------------------

function kartenWoche(s: GameState, k: KarteStand, netzRatio: number, netzRel: number): void {
  const w = s.woche;
  const app = k.app;
  // App
  if (app.relaunchBis !== undefined && w >= app.relaunchBis) { app.qualitaet = Math.min(0.95, app.qualitaet + 0.35); app.relaunchBis = undefined; }
  const qZiel = 0.2 + 0.15 * Math.sqrt(app.budgetWoche / MK.appBudget);
  app.qualitaet += 0.01 * (Math.min(0.95, qZiel) - app.qualitaet) * (app.qualitaet > qZiel ? 1 : 0.5);
  const anmeldung = k.anmeldeBis !== undefined && w < k.anmeldeBis && k.anmeldepraemie > 0;
  app.downloads += 2_500 * ((0.6 + app.qualitaet) / 0.95) * (app.appCoupons ? 1.3 : 1) * netzRel * (anmeldung ? 1.4 : 1);
  app.downloads *= Math.pow(netzRatio, 0.8);
  const aZiel = app.downloads * (0.12 + 0.4 * app.qualitaet);
  app.aktiveNutzer += 0.03 * (aZiel - app.aktiveNutzer);
  app.pushQuote += 0.02 * (clamp(0.34 + 0.2 * (app.qualitaet - MK.appQualitaet), 0.05, 0.7) - app.pushQuote);
  // Karte
  k.mitglieder *= Math.pow(netzRatio, 0.8);
  k.optInMail *= Math.pow(netzRatio, 0.8);
  const A = 1 + 30 * (k.punkteSatz - 0.005) + (k.stufen ? 0.15 : 0) + 5 * k.kartenrabatt + 0.15 * (app.qualitaet - MK.appQualitaet);
  const neu = MK.neuBasis * Math.max(0.2, A) * netzRel + (anmeldung ? 7_000 * Math.pow(k.anmeldepraemie / 10, 0.6) * netzRel : 0);
  const abgang = MK.abgangBasis * k.mitglieder * (1 + Math.max(0, 1 - A));
  k.optInMail += neu * 0.5 - abgang * (k.optInMail / Math.max(1, k.mitglieder));
  k.mitglieder += neu - abgang;
  k.neuWoche = neu; k.abgangWoche = abgang;
  const appQuote = app.aktiveNutzer / Math.max(1, k.mitglieder);
  const aktivZiel = MK.karteAktiv * Math.sqrt(Math.max(0.2, A)) * (1 + 0.25 * (appQuote - MK.appAktiv / MK.karteMitglieder) / 0.1);
  k.aktivQuote = clamp(k.aktivQuote + 0.02 * (aktivZiel - k.aktivQuote) + k.reaktiviert / Math.max(1, k.mitglieder), 0.05, 0.85);
  k.reaktiviert = 0;
  const dqZiel = 0.25 + 0.15 * Math.sqrt(k.datenBudgetWoche / MK.datenBudget) + 1.2 * appQuote;
  k.datenqualitaet = clamp(k.datenqualitaet + 0.01 * (Math.min(0.95, dqZiel) - k.datenqualitaet), 0.05, 0.95);
  const aktive0 = MK.karteMitglieder * MK.karteAktiv;
  k.umsatzAnteil = clamp(MK.karteAnteil * Math.pow((k.mitglieder * k.aktivQuote) / (aktive0 * Math.max(0.05, netzRel)), 0.85) * (k.stufen ? 1.06 : 1), 0.05, 0.62);
}

function kanalWoche(sc: MarketingSzenario): void {
  for (const def of KANAELE) {
    const st = sc.kanaele[def.id];
    st.adstock = def.adstock * st.adstock + (1 - def.adstock) * st.quote;
    const rel = st.quote / def.quote;
    // Abnutzung bei Dauerbeschallung
    st.abnutzung = clamp(st.abnutzung * 0.97 + 0.01 * Math.max(0, rel - 1.3), 0, 0.35);
  }
  sc.marke += MK.markeTempo * (markenZiel(sc) - sc.marke);
}

function segmentAnteil(s: GameState, sc: MarketingSzenario, seg: CrmSegment): number {
  const k = sc.karte;
  switch (seg.typ) {
    case 'alle': return 1;
    case 'alter': return KARTE_ALTER[seg.alter ?? 'aelter'];
    case 'kaufkraft': return seg.kaufkraft === 'mittel' ? 0.5 : 0.25;
    case 'inaktive': return 1 - k.aktivQuote;
    case 'top': return 0.05;
    case 'geburtstag': return 1 / 52;
    case 'affinitaet': {
      const g = seg.gruppe ?? 'damen';
      const sum = Object.values(s.basisUmsatz).reduce((a, b) => a + (b ?? 0), 0);
      return clamp((2.5 * (s.basisUmsatz[g] ?? 0)) / Math.max(1, sum), 0.03, 0.6);
    }
  }
}

function poolGroesse(sc: MarketingSzenario, kanal: CrmKanal): number {
  const k = sc.karte;
  if (kanal === 'mail') return k.optInMail;
  if (kanal === 'push') return k.app.aktiveNutzer * k.app.pushQuote;
  return k.mitglieder * k.adressQuote;
}

/** Ein Versand einer Kampagne: Ergebnis (deterministisch). */
export function crmVersand(s: GameState, sc: MarketingSzenario, c: CrmKampagne): CrmErgebnis {
  const k = sc.karte;
  const seg = SEG[c.segment.typ];
  const dq = k.datenqualitaet;
  const pool = poolGroesse(sc, c.kanal);
  const empf = pool * segmentAnteil(s, sc, c.segment) * (c.kontrollgruppe ? 0.9 : 1);
  const e = sc.ermuedung[c.kanal];
  const of = c.angebot.typ === 'info' ? 0.9 : c.angebot.typ === 'punkte' ? 1.05 : 1.1;
  const relevanz = c.segment.typ === 'affinitaet' ? seg.oeffnung * (0.85 + 0.5 * dq) : seg.oeffnung;
  const oeffnung = clamp(MK.oeffnung[c.kanal] * (0.75 + 0.5 * dq) * relevanz * (1 - e) * of, 0, 0.9);
  const dqF = 0.8 + 0.45 * dq;
  let einlQ = 0;
  const ang = c.angebot;
  if (ang.typ === 'coupon') {
    const mb = ang.mindestbon > 0 ? Math.sqrt(60 / Math.max(30, ang.mindestbon)) : 1.15;
    einlQ = 0.032 * Math.pow(Math.max(0.01, ang.prozent) / 0.15, 0.6) * seg.einl * mb * dqF * MK.einloesungKanal[c.kanal] * (1 - 0.5 * e);
  } else if (ang.typ === 'punkte') einlQ = 0.045 * Math.sqrt(Math.max(0, ang.faktor - 1) / 4) * seg.einl * dqF * MK.einloesungKanal[c.kanal] * (1 - 0.5 * e);
  else if (ang.typ === 'zugabe') einlQ = 0.04 * Math.sqrt(Math.max(0, ang.wert) / 10) * seg.einl * dqF * MK.einloesungKanal[c.kanal] * (1 - 0.5 * e);
  else einlQ = oeffnung * 0.03;
  einlQ = clamp(einlQ, ang.typ === 'info' ? 0 : 0.004, 0.12);
  const einl = empf * einlQ;
  const segBon = c.segment.typ === 'kaufkraft' ? (c.segment.kaufkraft === 'hoch' ? 62 : c.segment.kaufkraft === 'mittel' ? 46 : 36) : seg.bon;
  const bon = Math.max(ang.typ === 'coupon' ? ang.mindestbon * 1.08 : 0, segBon * (ang.typ === 'coupon' ? 1.12 : 1.05));
  const mit = clamp((ang.typ === 'info' ? 0.65 : seg.mitnahme) * (1 - 0.3 * (dq - 0.45)), 0.05, 0.95);
  const umsatz = einl * bon;
  const mehr = umsatz * (1 - mit) + umsatz * mit * 0.1;
  const rabatt = ang.typ === 'coupon' ? umsatz * ang.prozent : ang.typ === 'punkte' ? umsatz * (ang.faktor - 1) * k.punkteSatz * MK.punkteEinloesung : ang.typ === 'zugabe' ? einl * ang.wert : 0;
  return {
    sendungen: 1, versendet: empf, geoeffnet: empf * oeffnung, eingeloest: einl, umsatzEingeloest: umsatz, mehrumsatz: mehr, mitnahme: umsatz * mit,
    rabattkosten: rabatt, versandkosten: empf * MK.versand[c.kanal] + MK.versandPauschale, abmeldungen: empf * MK.abmeldung[c.kanal] * (1 + 8 * e),
  };
}

function addiere(a: CrmErgebnis, b: CrmErgebnis): void {
  for (const key of Object.keys(b) as (keyof CrmErgebnis)[]) a[key] += b[key];
}

function crmWoche(s: GameState, sc: MarketingSzenario, wert: WochenWert, U: number): number {
  const w = s.woche;
  const intens: Record<CrmKanal, number> = { mail: 0, push: 0, brief: 0 };
  let kosten = 0;
  for (const c of sc.crm) {
    if (c.status === 'geplant' && w >= c.start) c.status = 'aktiv';
    if (c.status !== 'aktiv') continue;
    if (c.ende !== undefined && w >= c.ende) { c.status = 'beendet'; continue; }
    if (w < c.naechster) continue;
    const pool = poolGroesse(sc, c.kanal);
    const r = crmVersand(s, sc, c);
    addiere(c.summe, r);
    c.letzte = { ...r, woche: w };
    kosten += r.versandkosten;
    intens[c.kanal] += pool > 0 ? r.versendet / pool : 0;
    const key: GruppeId | '_' = c.segment.typ === 'affinitaet' && c.segment.gruppe ? c.segment.gruppe : '_';
    const bez = key === '_' ? U : U * clamp(((s.basisUmsatz[key as GruppeId] ?? 0) / Math.max(1, Object.values(s.basisUmsatz).reduce((a, b) => a + (b ?? 0), 0))), 0.01, 1);
    wert.u[key] = (wert.u[key] ?? 0) + r.mehrumsatz / Math.max(1, bez);
    wert.d[key] = (wert.d[key] ?? 0) + r.rabattkosten / Math.max(1, bez);
    // Abmeldungen und Reaktivierung
    if (c.kanal === 'mail') sc.karte.optInMail = Math.max(0, sc.karte.optInMail - r.abmeldungen);
    if (c.kanal === 'push') sc.karte.app.pushQuote = Math.max(0.02, sc.karte.app.pushQuote - r.abmeldungen / Math.max(1, sc.karte.app.aktiveNutzer));
    if (c.segment.typ === 'inaktive') sc.karte.reaktiviert += r.eingeloest * 0.35;
    const f = FREQUENZ_WOCHEN[c.frequenz];
    if (f === 0) c.status = 'beendet'; else c.naechster = w + f;
  }
  for (const k of ['mail', 'push', 'brief'] as CrmKanal[]) sc.ermuedung[k] = clamp(sc.ermuedung[k] * 0.85 + 0.06 * intens[k], 0, 0.9);
  for (const key of Object.keys(wert.u)) wert.u[key as GruppeId] = clamp(wert.u[key as GruppeId] ?? 0, 0, 0.3);
  for (const key of Object.keys(wert.d)) wert.d[key as GruppeId] = clamp(wert.d[key as GruppeId] ?? 0, 0, 0.2);
  return kosten;
}

/** Couponanteil (Anteil des Umsatzes im Geltungsbereich, der mit Coupon gekauft wird) je laufender Coupon-Aktion. */
function couponSigma(s: GameState, sc: MarketingSzenario, a: Aktion, U: number): number {
  const k = sc.karte;
  const netzRel = s.marketing.stand.netzStart > 0 ? s.marketing.stand.netzLetzt / s.marketing.stand.netzStart : 1;
  const auflage = a.auflage ?? MK.prospektHaushalte * Math.sqrt(Math.max(0, kanalRel(sc, 'prospekt'))) * netzRel + k.app.aktiveNutzer * (k.app.appCoupons ? 1 : 0.3) + k.mitglieder * k.aktivQuote * 0.4;
  const r = Math.max(0.01, a.rabatt);
  const mb = (a.mindestbon ?? 0) > 0 ? Math.sqrt(60 / Math.max(30, a.mindestbon ?? 0)) : 1.15;
  const e = clamp(0.035 * Math.pow(r / 0.15, 0.6) * mb * (1 + 0.6 * (k.datenqualitaet - 0.45)), 0.01, 0.1);
  const bon = Math.max((a.mindestbon ?? 0) * 1.1, MK.bon * 1.25);
  const gs = gruppenVon(a);
  let anteil = 1;
  if (gs) {
    const sum = Object.values(s.basisUmsatz).reduce((x, y) => x + (y ?? 0), 0);
    anteil = clamp(gs.reduce((x, g) => x + (s.basisUmsatz[g] ?? 0), 0) / Math.max(1, sum), 0.02, 1);
  }
  return clamp((auflage * e * bon) / Math.max(1, U * anteil), 0, 0.6);
}

/** Umsatzanteil der Häuser im Geltungsbereich (nach Vorwochenumsatz). */
function scopeAnteil(s: GameState, a: Aktion): number {
  let x = 0; let y = 0;
  for (const h of s.haeuser) {
    const u = h.kpi && h.kpi.woche === s.woche - 1 ? h.kpi.umsatz : 0;
    if (u <= 0) continue;
    y += u;
    if (trifft(a, h, s)) x += u;
  }
  return y > 0 ? x / y : 1;
}

/** Wochenbeginn: Kanäle, Karte, CRM und Aktionsvorbereitung für Ist und Standardplan. Vor simuliereHaus. */
export function marketingVorbereiten(s: GameState): void {
  const m = s.marketing.stand;
  if (!m) return;
  const w = s.woche;
  // Kalender des Folgejahres in KW 40
  if (w % 52 === 39) {
    const j = Math.floor(w / 52) + 1;
    if (!m.kalenderJahre.includes(j)) {
      kalenderJahr(s, j);
      melde(s, 'info', `Marketing hat den Aktionskalender ${s.startJahr + j} aufgestellt (${STARTKALENDER.length} Aktionen, Fortschreibung des Rahmenplans).`);
    }
  }
  if (!m.kalenderJahre.includes(Math.floor(w / 52))) kalenderJahr(s, Math.floor(w / 52));
  const A = leereArbeit(w);
  const letzte = s.historie[s.historie.length - 1];
  A.uLetzt = letzte?.umsatz ?? 3_084_000_000 / 52;
  // Regionale Umsatzanteile
  const reg: Record<Region, number> = { Nord: 0, Ost: 0, West: 0, Mitte: 0, Süd: 0 };
  let sum = 0;
  for (const h of s.haeuser) { const u = h.kpi && (h.status === 'offen' || h.status === 'schliessung_verhandlung' || h.status === 'raeumung') ? h.kpi.umsatz : 0; reg[h.region] += u; sum += u; }
  if (sum > 0) for (const r of REGIONEN) A.regionAnteil[r] = reg[r] / sum;
  m.woche = A;
  // Netz (Schließungen verkleinern Mitglieder und Verteilgebiet)
  const n = netz(s);
  const ratio = m.netzLetzt > 0 ? clamp(n / m.netzLetzt, 0, 1.5) : 1;
  m.netzLetzt = n;
  const netzRel = m.netzStart > 0 ? n / m.netzStart : 1;
  for (const [sc, key] of [[m.ist, 'ist'], [m.plan, 'plan']] as [MarketingSzenario, 'ist' | 'plan'][]) {
    kanalWoche(sc);
    kartenWoche(s, sc.karte, ratio, netzRel);
    A.crmKosten[key] = crmWoche(s, sc, A.crm[key], A.uLetzt);
    A.komm[key] = kommunikation(sc);
    const liste = key === 'ist' ? s.marketing.aktionen : m.referenz;
    for (const a of liste) {
      if (!laeuft(a, w)) continue;
      if (mech(a) === 'coupon') A.sigma[key][a.id] = couponSigma(s, sc, a, A.uLetzt);
      // Altwarenabbau: Sale-Aktionen erlauben mehr Altware in der Saisonnachfrage
      const fl = scopeAnteil(s, a);
      const r = a.rabatt;
      const boost = mech(a) === 'reduzierung' ? 1.3 * (r / 0.3) : mech(a) === 'staffel' ? 0.3 : mech(a) === 'rabatt_bereich' || mech(a) === 'rabatt_wg' ? 0.4 * r : mech(a) === 'rabatt_alles' ? 0.3 * r : 0;
      if (boost <= 0) continue;
      const gs: string[] = a.wg && WG[a.wg as WgId] ? [a.wg] : gruppenVon(a) ?? Object.keys(s.basisUmsatz);
      for (const g of gs) A.alt[key][g] = Math.max(A.alt[key][g] ?? 0, boost * fl);
    }
  }
}

/** Werbekosten der Woche (netto, in die GuV): Kanäle, Karte, App, CRM, Sonderwerbung abzüglich Lieferantenbeteiligung. */
export interface MarketingKosten {
  kanaele: Partial<Record<KanalId, number>>;
  kanaeleSumme: number;
  karte: { punkte: number; stufen: number; betrieb: number; daten: number; anmeldung: number; summe: number };
  app: number;
  crmVersand: number;
  brutto: number;
  beteiligung: number;
  sonderwerbung: number;
  netto: number;
}

function szenarioBrutto(sc: MarketingSzenario, U: number, crmVersand: number, w: number) {
  const kanaele: Partial<Record<KanalId, number>> = {};
  let ks = 0;
  for (const def of KANAELE) { const x = sc.kanaele[def.id].quote * U; kanaele[def.id] = x; ks += x; }
  const k = sc.karte;
  const kartenUmsatz = k.umsatzAnteil * U;
  const anmeldung = k.anmeldeBis !== undefined && w < k.anmeldeBis && k.anmeldepraemie > 0 ? k.anmeldepraemie * Math.max(0, k.neuWoche - MK.neuBasis) * 0.6 : 0;
  const karte = {
    punkte: k.punkteSatz * kartenUmsatz * MK.punkteEinloesung, stufen: k.stufen ? MK.stufenKosten * kartenUmsatz : 0,
    betrieb: (MK.kartenBetriebJeMitglied / 52) * k.mitglieder, daten: k.datenBudgetWoche, anmeldung, summe: 0,
  };
  karte.summe = karte.punkte + karte.stufen + karte.betrieb + karte.daten + karte.anmeldung;
  const app = k.app.budgetWoche;
  const pa = sc.kanaele.prospekt.quote + sc.kanaele.anzeigen.quote;
  return { kanaele, ks, karte, app, brutto: ks + karte.summe + app + crmVersand, pa };
}

export function marketingKosten(s: GameState, U: number): MarketingKosten {
  const m = s.marketing.stand;
  const w = s.woche;
  const sonder = s.marketing.aktionen.filter((a) => laeuft(a, w)).reduce((x, a) => x + a.kosten / Math.max(1, a.ende - a.start), 0);
  if (!m) {
    const n = s.marketing.budgetQuote * U + sonder;
    return { kanaele: {}, kanaeleSumme: n, karte: { punkte: 0, stufen: 0, betrieb: 0, daten: 0, anmeldung: 0, summe: 0 }, app: 0, crmVersand: 0, brutto: n, beteiligung: 0, sonderwerbung: sonder, netto: n };
  }
  const A = m.woche.woche === w ? m.woche : undefined;
  const I = szenarioBrutto(m.ist, U, A?.crmKosten.ist ?? 0, w);
  const P = szenarioBrutto(m.plan, U, A?.crmKosten.plan ?? 0, w);
  const betPlan = Math.max(0, P.brutto - PARAM.marketingQuote * U);
  const bet = P.pa > 0 ? betPlan * (I.pa / P.pa) : 0;
  return {
    kanaele: I.kanaele, kanaeleSumme: I.ks, karte: I.karte, app: I.app, crmVersand: A?.crmKosten.ist ?? 0, brutto: I.brutto, beteiligung: bet,
    sonderwerbung: sonder, netto: I.brutto - bet + sonder,
  };
}

/** Bucht die Messdatensätze eines Hauses auf die Aktionen (nach Verfügbarkeit der Ware). */
export function messeAktionen(s: GameState, mess: AktionsMessung[] | undefined, verfuegbar: Partial<Record<GruppeId, number>>, kommMarge: number): void {
  if (!mess || !mess.length || s.prognose) return;
  const byId = new Map<string, Aktion>();
  for (const a of s.marketing.aktionen) byId.set(a.id, a);
  for (const x of mess) {
    const a = byId.get(x.id);
    if (!a) continue;
    const f = verfuegbar[x.g] ?? 1;
    const marge = GRUPPEN[x.g].marge;
    const eff = (u: number) => u * (x.tE * f + (1 - x.tE));
    const roh = (u: number, b: number) => u * x.tE * f - b * x.tE * f * (1 - marge) + u * (1 - x.tE) * kommMarge;
    const dU = eff(x.umsatzMit) - eff(x.umsatzOhne);
    a._mehrumsatzWahr += dU;
    a._rohertragseffektWahr += roh(x.umsatzMit, x.bruttoMit) - roh(x.umsatzOhne, x.bruttoOhne);
    const wa = (a._wahr ??= { rabatt: 0, mitnahme: 0, vorzieh: 0, kanni: 0, altware: 0, image: 0, gewoehnung: 0, umsatzMit: 0 });
    wa.umsatzMit += eff(x.umsatzMit);
    wa.rabatt += eff(x.bruttoMit - x.umsatzMit);
    wa.mitnahme += eff(x.mitnahme);
    if (x.kanni) wa.kanni += dU;
  }
}

/** Wochenende: Kosten sind gebucht; Vorzug, Gewöhnung, Image, Verlauf. Nach der EBITDA-Berechnung. */
export function marketingAbschluss(s: GameState, umsatz: number, kosten: MarketingKosten): void {
  const m = s.marketing.stand;
  if (!m) return;
  const A = m.woche;
  if (A.woche !== s.woche) return;
  // Vorzieheffekt je Gruppe
  for (const [sc, D] of [[m.ist, A.druck.ist], [m.plan, A.druck.plan]] as [MarketingSzenario, Druck][]) {
    for (const g of Object.keys(D.basis) as GruppeId[]) {
      const b = D.basis[g] ?? 0;
      const nu = b > 0 ? (D.nu[g] ?? 0) / b : 0;
      sc.vorzug[g] = clamp((sc.vorzug[g] ?? 0) * MK.vorzugAbbau + nu, 0, 0.5);
    }
  }
  // Gewöhnung und Image als Differenz zum Standardplan
  const dI = A.druck.ist.dBasis > 0 ? A.druck.ist.d / A.druck.ist.dBasis : 0;
  const dP = A.druck.plan.dBasis > 0 ? A.druck.plan.d / A.druck.plan.dBasis : 0;
  const dG = MK.gewoehnung * (dI - dP);
  s.marketing.gewoehnung = clamp(s.marketing.gewoehnung + dG, 0, 0.6);
  const iI = A.druck.ist.dBasis > 0 ? A.druck.ist.img / A.druck.ist.dBasis : 0;
  const iP = A.druck.plan.dBasis > 0 ? A.druck.plan.img / A.druck.plan.dBasis : 0;
  const dImg = iI - iP + MK.markeImage * (m.ist.marke - m.plan.marke);
  if (dImg !== 0) s.stakeholder.image = clamp(s.stakeholder.image + dImg, 0, 100);
  // Wahrheiten der laufenden Ist-Aktionen: Vorzug, Altware, Gewöhnung, Image anteilig
  if (!s.prognose) {
    const lauf = s.marketing.aktionen.filter((a) => laeuft(a, s.woche) && a._wahr);
    const summeU = lauf.reduce((x, a) => x + Math.max(0, a._wahr!.umsatzMit), 0);
    for (const a of lauf) {
      const wa = a._wahr!;
      const t = summeU > 0 ? Math.max(0, wa.umsatzMit) / summeU : 0;
      const gs: string[] = a.wg && WG[a.wg as WgId] ? [a.wg] : gruppenVon(a) ?? Object.keys(A.druck.ist.basis);
      let alt = 0;
      for (const g of gs) { const f = (1 + (A.alt.ist[g] ?? 0)); if (f > 1) alt += (A.altVerkauf[g] ?? 0) * (1 - 1 / f); }
      wa.altware += alt * t;
      wa.gewoehnung += Math.max(0, dG) * t;
      wa.image += (iI - iP) * t;
    }
  }
  // Verlauf
  const bonLift = A.druck.ist.dBasis > 0 ? (A.druck.ist.bon - A.druck.plan.bon) / A.druck.ist.dBasis : 0;
  const kwx = kwVon(s.woche);
  const bon = MK.bon * (kwx >= 47 && kwx <= 51 ? 1.12 : 1) * (1 + bonLift) * (1 - dI * 0.5);
  const crmMehr = m.ist.crm.reduce((x, c) => x + (c.letzte && c.letzte.woche === s.woche ? c.letzte.mehrumsatz : 0), 0);
  m.verlauf.push({
    woche: s.woche, umsatz: eur(umsatz), brutto: eur(kosten.brutto), beteiligung: eur(kosten.beteiligung), netto: eur(kosten.netto), sonderwerbung: eur(kosten.sonderwerbung),
    kunden: Math.round(umsatz / bon), bon: Math.round(bon * 100) / 100, kartenanteil: m.ist.karte.umsatzAnteil, rabattquote: dI,
    marke: m.ist.marke, image: s.stakeholder.image, gewoehnung: s.marketing.gewoehnung, crmMehrumsatz: eur(crmMehr),
    aktionen: s.marketing.aktionen.filter((a) => laeuft(a, s.woche)).length,
  });
  if (m.verlauf.length > 156) m.verlauf.splice(0, m.verlauf.length - 156);
  // Alte Einträge aufräumen (drei Jahre Historie)
  const grenze = s.woche - 156;
  if (grenze > 0) {
    m.referenz = m.referenz.filter((a) => a.ende > grenze);
    s.marketing.aktionen = s.marketing.aktionen.filter((a) => a.ende > grenze);
  }
}

// ---------------------------------------------------------------------------------------------
// Aktionen des Spielers
// ---------------------------------------------------------------------------------------------

export type MarketingAktion =
  | { typ: 'kanalBudget'; kanal: KanalId | 'alle'; euroWoche?: number; quote?: number; faktor?: number; regionen?: Partial<Record<Region, number>> }
  | { typ: 'kundenkarteSetzen'; punkteSatz?: number; stufen?: boolean; kartenrabatt?: number; anmeldepraemie?: number; anmeldeWochen?: number; datenBudgetWoche?: number }
  | { typ: 'appSetzen'; budgetWoche?: number; relaunch?: boolean; appCoupons?: boolean }
  | { typ: 'crmKampagneAnlegen'; name?: string; segment: CrmSegment; kanal: CrmKanal; angebot: CrmAngebot; frequenz: CrmFrequenz; start?: number; wochen?: number; kontrollgruppe?: boolean }
  | { typ: 'crmKampagneStoppen'; id: string }
  | ({ typ: 'aktionPlanen' } & AktionEntwurf)
  | ({ typ: 'aktionAendern'; id: string } & Partial<AktionEntwurf>)
  | { typ: 'aktionAbsagen'; id: string };

export interface AktionEntwurf {
  anlass?: Anlass;
  name?: string;
  mechanik?: Mechanik;
  rabatt?: number;
  bereiche?: GruppeId[];
  wg?: WgId;
  mindestbon?: number;
  punkteFaktor?: number;
  auflage?: number;
  /** Startwoche (absolut) oder KW im laufenden bzw. angegebenen Jahr. */
  start?: number;
  kw?: number;
  jahr?: number;
  wochen?: number;
  scope?: AktionsScope;
  kontrollHaeuser?: string[];
  /** Zusätzliche Werbung für die Aktion in € (Sonderbeilage, Spots). */
  sonderwerbung?: number;
}

export const MARKETING_AKTIONEN = new Set<string>(['kanalBudget', 'kundenkarteSetzen', 'appSetzen', 'crmKampagneAnlegen', 'crmKampagneStoppen', 'aktionPlanen', 'aktionAendern', 'aktionAbsagen']);

type Erg = { ok: boolean; text: string; id?: string };
const ok = (text: string, id?: string): Erg => ({ ok: true, text, id });
const fehler = (text: string): Erg => ({ ok: false, text });
const pz = (x: number, d = 0) => `${(x * 100).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

/** Bezugsumsatz je Woche für die Umrechnung Euro zu Quote (Mittel der letzten 13 Wochen). */
export function umsatzBezug(s: GameState): number {
  const h = s.historie.slice(-13);
  return h.length ? h.reduce((a, b) => a + b.umsatz, 0) / h.length : 3_084_000_000 / 52;
}

function offeneHaeuserIds(s: GameState): Haus[] { return s.haeuser.filter((h) => h.status === 'offen'); }

function scopeHaeuser(s: GameState, sc: AktionsScope): Haus[] {
  return offeneHaeuserIds(s).filter((h) =>
    sc.typ === 'alle' || (sc.typ === 'format' && sc.format === h.format) || (sc.typ === 'region' && sc.region === h.region) ||
    (sc.typ === 'cluster' && sc.cluster === h.cluster) || (sc.typ === 'haeuser' && sc.ids.includes(h.id)));
}

function startAus(s: GameState, e: AktionEntwurf, fallback: number): number {
  if (e.start !== undefined) return Math.round(e.start);
  if (e.kw !== undefined) {
    const j = e.jahr !== undefined ? e.jahr - s.startJahr : Math.floor(s.woche / 52);
    let st = j * 52 + clamp(Math.round(e.kw), 1, 52) - 1;
    if (e.jahr === undefined && st < s.woche) st += 52;
    return st;
  }
  return fallback;
}

function pruefeEntwurf(e: AktionEntwurf & { mechanik: Mechanik }): string | undefined {
  if (e.mechanik === 'rabatt_bereich' || e.mechanik === 'staffel') { if (!e.bereiche || !e.bereiche.length) return 'Die Mechanik braucht mindestens einen Bereich.'; }
  if (e.mechanik === 'rabatt_wg' && (!e.wg || !WG[e.wg])) return 'Die Mechanik braucht eine gültige Warengruppe.';
  if (e.bereiche) for (const g of e.bereiche) if (!GRUPPEN[g]) return `Unbekannter Bereich: ${g}.`;
  return undefined;
}

/** Standard-Werbung für eine zusätzliche Aktion: wie bisher 0,4 % des Umsatzes je Woche und Abdeckung. */
export function sonderwerbungStandard(s: GameState, wochen: number, anteil: number): number {
  return eur(umsatzBezug(s) * 0.004 * wochen * anteil);
}

function planen(s: GameState, e: AktionEntwurf): Erg {
  const w = s.woche;
  const vor = e.anlass ? ANLAESSE[e.anlass] : undefined;
  const mechanik: Mechanik = e.mechanik ?? vor?.mechanik ?? 'rabatt_alles';
  const bereiche = e.bereiche ?? vor?.bereiche;
  const f = pruefeEntwurf({ ...e, mechanik, bereiche });
  if (f) return fehler(f);
  const wochen = clamp(Math.round(e.wochen ?? vor?.wochen ?? 1), 1, 8);
  const start = Math.max(w, startAus(s, e, vor && e.kw === undefined && e.start === undefined ? startAus(s, { kw: vor.kw }, w) : w));
  const scope = e.scope ?? { typ: 'alle' };
  const kontroll = e.kontrollHaeuser ?? [];
  const hs = scopeHaeuser(s, scope).filter((h) => !kontroll.includes(h.id));
  if (!hs.length) return fehler('Die Aktion trifft kein offenes Haus.');
  const rabatt = mechanik === 'punkte' ? 0 : mechanik === 'staffel' ? 0.33 : clamp(e.rabatt ?? vor?.rabatt ?? 0.2, 0.05, 0.7);
  const kosten = e.sonderwerbung !== undefined ? eur(Math.max(0, e.sonderwerbung)) : 0;
  const a: Aktion = {
    id: neueId(s, 'm'), name: e.name ?? vor?.name ?? `${Math.round(rabatt * 100)} % auf alles`, rabatt, start, ende: start + wochen, scope, kontrollHaeuser: kontroll,
    kosten, _mehrumsatzWahr: 0, _rohertragseffektWahr: 0, anlass: e.anlass ?? 'sonder', mechanik, bereiche: bereiche ? [...bereiche] : undefined, wg: e.wg,
    mindestbon: e.mindestbon, punkteFaktor: mechanik === 'punkte' ? clamp(e.punkteFaktor ?? 5, 2, 20) : undefined, auflage: e.auflage, status: 'geplant', standard: false,
  };
  s.marketing.aktionen.push(a);
  return ok(`Aktion „${a.name}“ geplant: ${MECHANIK_TEXT[mechanik]}${rabatt > 0 && mechanik !== 'staffel' ? ` ${Math.round(rabatt * 100)} %` : ''}, ${hs.length} Häuser, ${wochen} Wochen ab KW ${kwVon(start)}${kosten > 0 ? `, Sonderwerbung ${mio(kosten)}` : ''}.`, a.id);
}

/** Bisherige Aktion `aktion` (Rabatt auf alles mit Werbung), kompatibel. */
export function aktionKompatibel(s: GameState, a: { name?: string; rabatt: number; wochen: number; scope: AktionsScope; kontrollHaeuser?: string[]; start?: number }): Erg {
  const rabatt = clamp(a.rabatt, 0.1, 0.5);
  const wochen = clamp(Math.round(a.wochen), 1, 6);
  const hs = scopeHaeuser(s, a.scope).filter((h) => !(a.kontrollHaeuser ?? []).includes(h.id));
  if (!hs.length) return fehler('Die Aktion trifft kein offenes Haus.');
  const anteil = hs.length / Math.max(1, offeneHaeuserIds(s).length);
  const r = planen(s, { name: a.name ?? `${Math.round(rabatt * 100)} % auf alles`, mechanik: 'rabatt_alles', rabatt, wochen, scope: a.scope, kontrollHaeuser: a.kontrollHaeuser, start: a.start ?? s.woche, sonderwerbung: sonderwerbungStandard(s, wochen, anteil) });
  return r;
}

/** Bisherige Aktion `marketingBudget`: Netto-Werbequote, skaliert alle Kanäle gegenüber dem Start. */
export function marketingBudgetKompatibel(s: GameState, quote: number): Erg {
  const q = clamp(quote, 0, 0.06);
  s.marketing.budgetQuote = q;
  const m = s.marketing.stand;
  if (m) {
    // Kanäle so skalieren, dass die Netto-Werbequote (nach Lieferantenbeteiligung, mit Karte, App und CRM) q trifft
    for (const def of KANAELE) m.ist.kanaele[def.id].quote = def.quote;
    const U = umsatzBezug(s);
    const k = marketingKosten(s, U);
    const rest = k.netto - k.sonderwerbung - k.kanaeleSumme + k.beteiligung; // Karte, App, CRM
    const f = k.kanaeleSumme - k.beteiligung > 0 ? Math.max(0, (q * U - rest) / (k.kanaeleSumme - k.beteiligung)) : q / PARAM.marketingQuote;
    for (const def of KANAELE) m.ist.kanaele[def.id].quote = def.quote * f;
  }
  return ok(`Marketingbudget auf ${(q * 100).toFixed(1)} % vom Umsatz gesetzt.`);
}

/** Bisherige Aktion `kundenkarte`: Neustart der Hartwig Karte mit Statusstufen. */
export function kundenkarteKompatibel(s: GameState, einmalKosten: (x: number) => void): Erg {
  if (s.marketing.kundenkarte || s.marketing.stand?.ist.karte.stufen) return fehler('Die Hartwig Karte hat ihre Statusstufen schon.');
  einmalKosten(2_500_000);
  s.marketing.kundenkarte = true;
  if (s.marketing.stand) s.marketing.stand.ist.karte.stufen = true;
  return ok('Hartwig Karte neu aufgestellt: Statusstufen Silber und Gold, Coupons gehen gezielter raus.');
}

export function marketingAktion(s: GameState, a: MarketingAktion, einmalKosten: (x: number) => void): Erg {
  const m = s.marketing.stand;
  const w = s.woche;
  const I = m.ist;
  switch (a.typ) {
    case 'kanalBudget': {
      const ids = a.kanal === 'alle' ? KANAELE.map((k) => k.id) : [a.kanal];
      if (a.kanal !== 'alle' && !KANAL[a.kanal]) return fehler('Unbekannter Kanal.');
      const bezug = umsatzBezug(s);
      for (const id of ids) {
        const st = I.kanaele[id];
        const def = KANAL[id];
        if (a.quote !== undefined) st.quote = a.quote;
        else if (a.euroWoche !== undefined) st.quote = Math.max(0, a.euroWoche) / Math.max(1, bezug);
        else if (a.faktor !== undefined) st.quote *= Math.max(0, a.faktor);
        st.quote = clamp(st.quote, 0, def.quote * 4);
        if (a.regionen) for (const [r, x] of Object.entries(a.regionen) as [Region, number][]) if (REGIONEN.includes(r)) st.regionen[r] = clamp(x, 0, 3);
      }
      const netto = marketingKosten(s, bezug).netto;
      s.marketing.budgetQuote = netto / Math.max(1, bezug);
      const txt = ids.length === 1 ? `${KANAL[ids[0]].name}: ${mio(I.kanaele[ids[0]].quote * bezug * 52)} im Jahr (${mio(I.kanaele[ids[0]].quote * bezug)} je Woche)` : `Alle Kanäle angepasst`;
      return ok(`${txt}. Werbequote netto ${pz(s.marketing.budgetQuote, 1)}.`);
    }
    case 'kundenkarteSetzen': {
      const k = I.karte;
      const teile: string[] = [];
      if (a.punkteSatz !== undefined) { k.punkteSatz = clamp(a.punkteSatz, 0, 0.03); teile.push(`Punkte ${pz(k.punkteSatz, 1)} vom Umsatz`); }
      if (a.stufen !== undefined && a.stufen !== k.stufen) {
        if (a.stufen) { einmalKosten(MK.stufenEinfuehrung); s.marketing.kundenkarte = true; }
        k.stufen = a.stufen; teile.push(a.stufen ? 'Statusstufen Silber und Gold eingeführt' : 'Statusstufen abgeschafft');
        if (!a.stufen) s.stakeholder.image = clamp(s.stakeholder.image - 1, 0, 100);
      }
      if (a.kartenrabatt !== undefined) { k.kartenrabatt = clamp(a.kartenrabatt, 0, 0.1); teile.push(`Kartenrabatt ${pz(k.kartenrabatt)}`); }
      if (a.anmeldepraemie !== undefined) {
        k.anmeldepraemie = clamp(a.anmeldepraemie, 0, 50);
        k.anmeldeBis = k.anmeldepraemie > 0 ? w + clamp(Math.round(a.anmeldeWochen ?? 8), 1, 52) : undefined;
        teile.push(k.anmeldepraemie > 0 ? `Anmeldeaktion mit ${k.anmeldepraemie} € Willkommensgutschein bis KW ${kwVon(k.anmeldeBis!)}` : 'Anmeldeaktion beendet');
      }
      if (a.datenBudgetWoche !== undefined) { k.datenBudgetWoche = clamp(a.datenBudgetWoche, 0, 200_000); teile.push(`Datenpflege ${mio(k.datenBudgetWoche * 52)} im Jahr`); }
      return teile.length ? ok(`Hartwig Karte: ${teile.join(', ')}.`) : fehler('Keine Änderung angegeben.');
    }
    case 'appSetzen': {
      const app = I.karte.app;
      const teile: string[] = [];
      if (a.budgetWoche !== undefined) { app.budgetWoche = clamp(a.budgetWoche, 0, 300_000); teile.push(`Weiterentwicklung ${mio(app.budgetWoche * 52)} im Jahr`); }
      if (a.appCoupons !== undefined) { app.appCoupons = a.appCoupons; teile.push(a.appCoupons ? 'Aktionscoupons in der App' : 'keine Coupons in der App'); }
      if (a.relaunch) {
        if (app.relaunchBis !== undefined) return fehler('Der Relaunch der App läuft schon.');
        einmalKosten(MK.appRelaunch);
        app.relaunchBis = w + 16;
        teile.push(`Relaunch beauftragt (${mio(MK.appRelaunch)}, fertig KW ${kwVon(app.relaunchBis)})`);
      }
      return teile.length ? ok(`Hartwig App: ${teile.join(', ')}.`) : fehler('Keine Änderung angegeben.');
    }
    case 'crmKampagneAnlegen': {
      if (a.segment.typ === 'affinitaet' && (!a.segment.gruppe || !GRUPPEN[a.segment.gruppe])) return fehler('Das Segment braucht einen Bereich.');
      if (a.kanal === 'push' && I.karte.app.aktiveNutzer * I.karte.app.pushQuote < 1_000) return fehler('Zu wenige Push-Empfänger.');
      const start = Math.max(w, a.start ?? w);
      const c: CrmKampagne = {
        id: neueId(s, 'crm'), name: a.name ?? `${segmentText(a.segment)} per ${KANAL_TEXT[a.kanal]}`, segment: { ...a.segment }, kanal: a.kanal,
        angebot: normAngebot(a.angebot), frequenz: a.frequenz, start, ende: a.wochen !== undefined ? start + Math.max(1, Math.round(a.wochen)) : undefined,
        status: start > w ? 'geplant' : 'aktiv', naechster: start, kontrollgruppe: a.kontrollgruppe ?? true, summe: leerErgebnis(),
      };
      I.crm.push(c);
      const v = crmVersand(s, I, c);
      return ok(`Kampagne „${c.name}“ angelegt: rund ${Math.round(v.versendet).toLocaleString('de-DE')} Empfänger je Versand, ${FREQUENZ_TEXT[c.frequenz]}.`, c.id);
    }
    case 'crmKampagneStoppen': {
      const c = I.crm.find((x) => x.id === a.id);
      if (!c) return fehler('Kampagne nicht gefunden.');
      if (c.status === 'gestoppt' || c.status === 'beendet') return fehler('Die Kampagne läuft nicht.');
      c.status = 'gestoppt';
      return ok(`Kampagne „${c.name}“ gestoppt.`);
    }
    case 'aktionPlanen': return planen(s, a);
    case 'aktionAendern': {
      const x = s.marketing.aktionen.find((y) => y.id === a.id);
      if (!x) return fehler('Aktion nicht gefunden.');
      if (x.status === 'abgesagt' || x.ende <= w) return fehler('Die Aktion ist vorbei oder abgesagt.');
      const laufend = x.start <= w;
      if (a.mechanik !== undefined || a.bereiche !== undefined || a.wg !== undefined) {
        if (laufend) return fehler('Die Mechanik einer laufenden Aktion lässt sich nicht mehr ändern.');
        const neu = { mechanik: a.mechanik ?? mech(x), bereiche: a.bereiche ?? x.bereiche, wg: (a.wg ?? x.wg) as WgId | undefined };
        const f = pruefeEntwurf(neu);
        if (f) return fehler(f);
        x.mechanik = neu.mechanik; x.bereiche = neu.bereiche; x.wg = neu.wg;
      }
      if (a.rabatt !== undefined) x.rabatt = clamp(a.rabatt, 0.05, 0.7);
      if (a.mindestbon !== undefined) x.mindestbon = Math.max(0, a.mindestbon);
      if (a.punkteFaktor !== undefined) x.punkteFaktor = clamp(a.punkteFaktor, 2, 20);
      if (a.name !== undefined) x.name = a.name;
      if (a.sonderwerbung !== undefined) x.kosten = eur(Math.max(0, a.sonderwerbung));
      if (a.kontrollHaeuser !== undefined) x.kontrollHaeuser = [...a.kontrollHaeuser];
      if (a.scope !== undefined && !laufend) x.scope = a.scope;
      if (a.start !== undefined || a.kw !== undefined) {
        if (laufend) return fehler('Eine laufende Aktion lässt sich nicht verschieben.');
        const d = x.ende - x.start;
        x.start = Math.max(w, startAus(s, a, x.start)); x.ende = x.start + d;
      }
      if (a.wochen !== undefined) x.ende = Math.max(laufend ? w + 1 : x.start + 1, x.start + clamp(Math.round(a.wochen), 1, 8));
      return ok(`Aktion „${x.name}“ geändert: ${MECHANIK_TEXT[mech(x)]}, KW ${kwVon(x.start)} bis ${kwVon(x.ende - 1)}.`, x.id);
    }
    case 'aktionAbsagen': {
      const x = s.marketing.aktionen.find((y) => y.id === a.id);
      if (!x) return fehler('Aktion nicht gefunden.');
      if (x.status === 'abgesagt' || x.ende <= w) return fehler('Die Aktion ist vorbei oder schon abgesagt.');
      if (x.start <= w) { x.ende = w; return ok(`Aktion „${x.name}“ vorzeitig beendet.`); }
      x.status = 'abgesagt';
      return ok(`Aktion „${x.name}“ abgesagt.`);
    }
  }
}

function normAngebot(a: CrmAngebot): CrmAngebot {
  if (a.typ === 'coupon') return { typ: 'coupon', prozent: clamp(a.prozent, 0.02, 0.5), mindestbon: Math.max(0, a.mindestbon) };
  if (a.typ === 'punkte') return { typ: 'punkte', faktor: clamp(a.faktor, 2, 20) };
  if (a.typ === 'zugabe') return { typ: 'zugabe', wert: clamp(a.wert, 1, 100) };
  return { typ: 'info' };
}

// ---------------------------------------------------------------------------------------------
// Delegation (CMO, Ressort-KI aus vorstand.ts)
// ---------------------------------------------------------------------------------------------

/** CMO entscheidet den Aktionskalender: gut = Kontrollhäuser, keine zu tiefen Rabatte; schlecht = Rabattitis. */
export function delegiereAktionskalender(s: GameState, guete: number, rng: RngHalter): void {
  const w = s.woche;
  const kommend = s.marketing.aktionen.filter((a) => a.status !== 'abgesagt' && a.start > w && a.start <= w + 6);
  if (guete >= 0.55) {
    for (const a of kommend) {
      if (!a.kontrollHaeuser.length && a.scope.typ === 'alle') {
        const kand = offeneHaeuserIds(s).filter((h) => h.format === 'warenhaus');
        if (kand.length > 20) a.kontrollHaeuser = Array.from({ length: 5 }, (_, i) => kand[Math.floor(((i + 0.5) / 5) * kand.length)].id);
      }
      if (mech(a) === 'rabatt_alles' && a.rabatt > 0.25 && !a.standard) a.rabatt = 0.25;
    }
  } else if (guete < 0.4 && zwischen(rng, 0, 1) < (0.4 - guete) * 0.25) {
    const start = w + 2;
    if (!s.marketing.aktionen.some((a) => a.status !== 'abgesagt' && a.start <= start && a.ende > start && mech(a) === 'rabatt_alles')) {
      planen(s, { name: 'Sonderaktion 20 % auf alles', mechanik: 'rabatt_alles', rabatt: 0.2, wochen: 1, start, sonderwerbung: sonderwerbungStandard(s, 1, 1) });
    }
  }
}

/** CMO steuert CRM: gut = Kampagnen mit negativem Ergebnis stoppen, Reaktivierung bei vielen Inaktiven; schlecht = mehr Versand. */
export function delegiereCrm(s: GameState, guete: number, rng: RngHalter): void {
  const I = s.marketing.stand.ist;
  if (s.woche % 4 !== 0) return;
  if (guete >= 0.55) {
    for (const c of I.crm) {
      if (c.status !== 'aktiv' || c.standard || c.summe.sendungen < 3) continue;
      if (crmErgebnisWert(c.summe) < 0) c.status = 'gestoppt';
    }
    if (I.karte.aktivQuote < 0.36 && !I.crm.some((c) => c.status === 'aktiv' && c.segment.typ === 'inaktive')) {
      marketingAktion(s, { typ: 'crmKampagneAnlegen', name: 'Reaktivierung Inaktive', segment: { typ: 'inaktive' }, kanal: 'mail', angebot: { typ: 'coupon', prozent: 0.15, mindestbon: 40 }, frequenz: 'monatlich', wochen: 26 }, () => undefined);
    }
  } else if (guete < 0.4 && zwischen(rng, 0, 1) < 0.15) {
    if (!I.crm.some((c) => c.name === 'Zusatzmailing Wochenende' && c.status === 'aktiv')) {
      marketingAktion(s, { typ: 'crmKampagneAnlegen', name: 'Zusatzmailing Wochenende', segment: { typ: 'alle' }, kanal: 'mail', angebot: { typ: 'coupon', prozent: 0.1, mindestbon: 0 }, frequenz: 'woechentlich', wochen: 12 }, () => undefined);
    }
  }
}

/** CMO verteilt das Kanalbudget: gut = 5 % vom schwächsten zum stärksten Kanal je Euro; schlecht = zufällige Verschiebung. */
export function delegiereKanalbudget(s: GameState, guete: number, rng: RngHalter): void {
  if (s.woche % 13 !== 1) return;
  const I = s.marketing.stand.ist;
  // Budgethöhe: in der Insolvenz knapper; schlechte Entscheidungen schießen nach oben oder unten
  const gut = zwischen(rng, 0, 1) < 0.3 + 0.65 * guete;
  const ziel = gut ? (s.phase === 'insolvenz' ? 0.02 : 0.024) : zwischen(rng, 0, 1) < 0.5 ? 0.013 : 0.032;
  const U = umsatzBezug(s);
  const k = marketingKosten(s, U);
  const rest = k.netto - k.sonderwerbung - k.kanaeleSumme; // Karte, App, CRM abzüglich Beteiligung
  const f = k.kanaeleSumme > 0 ? clamp((ziel * U - rest) / k.kanaeleSumme, 0.3, 2) : 1;
  for (const d of KANAELE) I.kanaele[d.id].quote = clamp(I.kanaele[d.id].quote * f, 0, d.quote * 4);
  s.marketing.budgetQuote = ziel;
  const grenz = KANAELE.filter((d) => d.id !== 'crm').map((d) => ({ d, x: (d.e * Math.pow(Math.max(0.05, kanalRel(I, d.id)), d.e - 1) * (1 + d.marke * 0.3)) * (1 - I.kanaele[d.id].abnutzung) }));
  grenz.sort((a, b) => a.x - b.x);
  const fehlerQ = (1 - guete) * 0.6;
  const von = zwischen(rng, 0, 1) < fehlerQ ? grenz[grenz.length - 1].d.id : grenz[0].d.id;
  const nach = zwischen(rng, 0, 1) < fehlerQ ? grenz[0].d.id : grenz[grenz.length - 1].d.id;
  if (von === nach) return;
  const x = I.kanaele[von].quote * 0.05;
  I.kanaele[von].quote -= x;
  I.kanaele[nach].quote = Math.min(KANAL[nach].quote * 4, I.kanaele[nach].quote + x);
}

// ---------------------------------------------------------------------------------------------
// Abfragen
// ---------------------------------------------------------------------------------------------

const KANAL_TEXT: Record<CrmKanal, string> = { mail: 'Mail', push: 'Push', brief: 'Brief' };
const FREQUENZ_TEXT: Record<CrmFrequenz, string> = { einmalig: 'einmalig', woechentlich: 'wöchentlich', zweiwoechentlich: 'alle zwei Wochen', monatlich: 'monatlich', quartal: 'jedes Quartal' };

export function segmentText(seg: CrmSegment): string {
  switch (seg.typ) {
    case 'alle': return 'Alle Mitglieder';
    case 'alter': return `Alter ${ALTERSGRUPPE_TEXT[seg.alter ?? 'aelter']}`;
    case 'kaufkraft': return `Kaufkraft ${seg.kaufkraft ?? 'hoch'}`;
    case 'inaktive': return 'Inaktive Mitglieder';
    case 'top': return 'Top-Kunden';
    case 'geburtstag': return 'Geburtstagskinder';
    case 'affinitaet': return `Käufer ${GRUPPEN[seg.gruppe ?? 'damen'].name}`;
  }
}

export function angebotText(a: CrmAngebot): string {
  if (a.typ === 'coupon') return `${Math.round(a.prozent * 100)} % Coupon${a.mindestbon > 0 ? ` ab ${a.mindestbon} €` : ''}`;
  if (a.typ === 'punkte') return `${a.faktor}-fach Punkte`;
  if (a.typ === 'zugabe') return `Gratiszugabe im Wert von ${a.wert} €`;
  return 'Information ohne Angebot';
}

/** Rohertrag aus Mehrumsatz minus Rabatt und Versand (Kampagnenwert, wahr). */
function crmErgebnisWert(e: CrmErgebnis): number { return e.mehrumsatz * 0.4 - e.rabattkosten - e.versandkosten; }

function kontrolliert(s: GameState, x: number, seed: string, breite: number): { von: number; bis: number; wert: number } {
  let hsh = 0;
  for (let i = 0; i < seed.length; i++) hsh = (hsh * 31 + seed.charCodeAt(i)) >>> 0;
  const z = ((hsh % 1000) / 1000) * 2 - 1;
  const bias = [0.12, 0.03, 0][s.controllingStufe];
  const c = x * (1 + bias + z * breite * 0.35);
  const h = Math.abs(x) * breite;
  return { von: eur(c - h), bis: eur(c + h), wert: eur(c) };
}
const breiteVon = (s: GameState, kontrolle: boolean) => [0.45, 0.25, 0.12][s.controllingStufe] * (kontrolle ? 0.5 : 1);

export interface KanalZeile {
  id: KanalId; name: string; text: string; budgetWoche: number; budgetJahr: number; quote: number; startBudgetWoche: number; anteil: number;
  wirkung: number; adstock: number; abnutzung: number; reichweite: Record<Altersgruppe, number>; marke: number; aktion: number; regional: boolean; regionen: Record<Region, number>;
}

export function kanaele(s: GameState): { kanaele: KanalZeile[]; summeWoche: number; quote: number; beteiligungWoche: number; bezugUmsatzWoche: number } {
  const m = s.marketing.stand;
  const U = umsatzBezug(s);
  const k = marketingKosten(s, U);
  const summe = KANAELE.reduce((x, d) => x + m.ist.kanaele[d.id].quote, 0);
  return {
    kanaele: KANAELE.map((d) => {
      const st = m.ist.kanaele[d.id];
      return {
        id: d.id, name: d.name, text: d.text, budgetWoche: eur(st.quote * U), budgetJahr: eur(st.quote * U * 52), quote: st.quote, startBudgetWoche: eur(d.quote * U),
        anteil: summe > 0 ? st.quote / summe : 0, wirkung: Math.pow(Math.max(0, kanalRel(m.ist, d.id)), d.e) * (1 - st.abnutzung), adstock: kanalRel(m.ist, d.id),
        abnutzung: st.abnutzung, reichweite: { ...d.reichweite }, marke: d.marke, aktion: d.aktion, regional: d.regional, regionen: { ...st.regionen },
      };
    }),
    summeWoche: eur(summe * U), quote: summe, beteiligungWoche: eur(k.beteiligung), bezugUmsatzWoche: eur(U),
  };
}

export function kundenkarte(s: GameState) {
  const m = s.marketing.stand;
  const k = m.ist.karte;
  const U = umsatzBezug(s);
  const c = marketingKosten(s, U);
  return {
    name: 'Hartwig Karte',
    mitglieder: Math.round(k.mitglieder), aktiveMitglieder: Math.round(k.mitglieder * k.aktivQuote), aktivQuote: k.aktivQuote,
    umsatzAnteil: k.umsatzAnteil, kartenumsatzWoche: eur(k.umsatzAnteil * U),
    punkteSatz: k.punkteSatz, punkteText: `1 Punkt je ${k.punkteSatz > 0 ? Math.round((0.01 / k.punkteSatz) * 100) / 100 : 0} € (1 Punkt = 1 Cent)`,
    stufen: k.stufen, kartenrabatt: k.kartenrabatt, anmeldepraemie: k.anmeldepraemie, anmeldeBis: k.anmeldeBis,
    neuWoche: Math.round(k.neuWoche), abgaengeWoche: Math.round(k.abgangWoche),
    datenqualitaet: k.datenqualitaet, datenBudgetWoche: k.datenBudgetWoche,
    mailEinwilligung: Math.round(k.optInMail), mailQuote: k.optInMail / Math.max(1, k.mitglieder), adressQuote: k.adressQuote,
    kostenWoche: { punkte: eur(c.karte.punkte), stufen: eur(c.karte.stufen), betrieb: eur(c.karte.betrieb), daten: eur(c.karte.daten), anmeldung: eur(c.karte.anmeldung), summe: eur(c.karte.summe) },
    app: {
      name: 'Hartwig App', downloads: Math.round(k.app.downloads), aktiveNutzer: Math.round(k.app.aktiveNutzer), pushEinwilligung: Math.round(k.app.aktiveNutzer * k.app.pushQuote),
      pushQuote: k.app.pushQuote, qualitaet: k.app.qualitaet, budgetWoche: k.app.budgetWoche, relaunchBis: k.app.relaunchBis, appCoupons: k.app.appCoupons, kostenWoche: eur(c.app),
    },
  };
}

function ergebnisZeile(e: CrmErgebnis) {
  return {
    sendungen: e.sendungen, versendet: Math.round(e.versendet), geoeffnet: Math.round(e.geoeffnet), eingeloest: Math.round(e.eingeloest),
    oeffnungsrate: e.versendet > 0 ? e.geoeffnet / e.versendet : 0, einloesequote: e.versendet > 0 ? e.eingeloest / e.versendet : 0,
    umsatzEingeloest: eur(e.umsatzEingeloest), rabattkosten: eur(e.rabattkosten), versandkosten: eur(e.versandkosten), abmeldungen: Math.round(e.abmeldungen),
  };
}

export function crmKampagnen(s: GameState) {
  const m = s.marketing.stand;
  const I = m.ist;
  return {
    kampagnen: I.crm.map((c) => {
      const b = breiteVon(s, c.kontrollgruppe);
      const mehr = kontrolliert(s, c.summe.mehrumsatz, c.id + 'm', b);
      const mit = kontrolliert(s, c.summe.mitnahme, c.id + 'n', b);
      const wert = mehr.wert * 0.4 - c.summe.rabattkosten - c.summe.versandkosten;
      return {
        id: c.id, name: c.name, segment: c.segment, segmentText: segmentText(c.segment), kanal: c.kanal, kanalText: KANAL_TEXT[c.kanal],
        angebot: c.angebot, angebotText: angebotText(c.angebot), frequenz: c.frequenz, frequenzText: FREQUENZ_TEXT[c.frequenz],
        start: c.start, ende: c.ende, status: c.status, standard: !!c.standard, kontrollgruppe: c.kontrollgruppe, naechsterVersand: c.status === 'aktiv' ? c.naechster : undefined,
        summe: ergebnisZeile(c.summe), letzte: c.letzte ? { woche: c.letzte.woche, ...ergebnisZeile(c.letzte) } : undefined,
        auswertung: c.summe.sendungen > 0 ? {
          mehrumsatzVon: mehr.von, mehrumsatzBis: mehr.bis, mitnahme: mit.wert, ergebnis: eur(wert),
          hinweis: c.kontrollgruppe ? 'Gemessen gegen Kontrollgruppe (10 % ohne Versand).' : 'Ohne Kontrollgruppe: Schätzung gegen Vorjahr.',
        } : undefined,
      };
    }),
    pools: { mail: Math.round(poolGroesse(I, 'mail')), push: Math.round(poolGroesse(I, 'push')), brief: Math.round(poolGroesse(I, 'brief')) },
    ermuedung: { ...I.ermuedung },
    datenqualitaet: I.karte.datenqualitaet,
    segmente: ([
      { typ: 'alle' }, { typ: 'alter', alter: 'jung' }, { typ: 'alter', alter: 'mitte' }, { typ: 'alter', alter: 'aelter' }, { typ: 'alter', alter: 'senioren' },
      { typ: 'kaufkraft', kaufkraft: 'hoch' }, { typ: 'kaufkraft', kaufkraft: 'mittel' }, { typ: 'kaufkraft', kaufkraft: 'niedrig' }, { typ: 'inaktive' }, { typ: 'top' }, { typ: 'geburtstag' },
      ...(Object.keys(s.basisUmsatz) as GruppeId[]).map((g) => ({ typ: 'affinitaet' as const, gruppe: g })),
    ] as CrmSegment[]).map((seg) => ({ segment: seg, text: segmentText(seg), groesse: Math.round(I.karte.mitglieder * segmentAnteil(s, I, seg)) })),
  };
}

function statusVon(a: Aktion, w: number): 'geplant' | 'laufend' | 'beendet' | 'abgesagt' {
  if (a.status === 'abgesagt') return 'abgesagt';
  if (w >= a.ende) return 'beendet';
  return w >= a.start ? 'laufend' : 'geplant';
}

function scopeText(s: GameState, a: Aktion): string {
  const sc = a.scope;
  const t = sc.typ === 'alle' ? 'alle Häuser' : sc.typ === 'format' ? (sc.format === 'sport' ? 'Sporthäuser' : 'Warenhäuser') : sc.typ === 'region' ? `Region ${sc.region}` : sc.typ === 'cluster' ? `Cluster ${sc.cluster}` : `${sc.ids.length} Häuser`;
  return a.kontrollHaeuser.length ? `${t}, ${a.kontrollHaeuser.length} Kontrollhäuser` : t;
}

function eintrag(s: GameState, a: Aktion) {
  return {
    id: a.id, name: a.name, anlass: (a.anlass as Anlass | undefined) ?? 'sonder', mechanik: mech(a), mechanikText: MECHANIK_TEXT[mech(a)], rabatt: a.rabatt,
    bereiche: a.bereiche, bereicheText: (gruppenVon(a) ?? []).map((g) => GRUPPEN[g].name), wg: a.wg, mindestbon: a.mindestbon, punkteFaktor: a.punkteFaktor,
    start: a.start, ende: a.ende, startKw: kwVon(a.start), endeKw: kwVon(a.ende - 1), jahr: s.startJahr + Math.floor(a.start / 52), wochen: a.ende - a.start,
    status: statusVon(a, s.woche), standard: !!a.standard, scope: a.scope, scopeText: scopeText(s, a), kontrollHaeuser: a.kontrollHaeuser.length,
    sonderwerbung: a.kosten, ausgewertet: !!a.ausgewertet,
  };
}

export function aktionskalender(s: GameState, jahr = s.startJahr + Math.floor(s.woche / 52)) {
  const j = jahr - s.startJahr;
  const von = j * 52; const bis = von + 52;
  const eintraege = s.marketing.aktionen.filter((a) => a.start < bis && a.ende > von).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id)).map((a) => eintrag(s, a));
  const raeumungen = s.haeuser.filter((h) => h.status === 'raeumung').map((h) => ({ haus: h.id, name: h.name, bis: h.statusBis, text: 'Räumungsverkauf bis zur Schließung (35 % auf alles)' }));
  return {
    jahr, woche: s.woche, kw: kwVon(s.woche), eintraege, raeumungen,
    anlaesse: (Object.entries(ANLAESSE) as [Anlass, (typeof ANLAESSE)[Anlass]][]).map(([id, v]) => ({ id, ...v, mechanikText: MECHANIK_TEXT[v.mechanik] })),
    mechaniken: (Object.keys(MECHANIK_TEXT) as Mechanik[]).map((id) => ({ id, text: MECHANIK_TEXT[id] })),
    geplant: s.marketing.stand.kalenderJahre.includes(j),
  };
}

export function aktionsAuswertung(s: GameState, id: string) {
  const a = s.marketing.aktionen.find((x) => x.id === id);
  if (!a) return undefined;
  const st = statusVon(a, s.woche);
  const basis = eintrag(s, a);
  if (!a.ausgewertet) return { ...basis, gemessen: false, text: st === 'laufend' ? 'Die Aktion läuft noch. Controlling wertet nach dem Ende aus.' : st === 'geplant' ? 'Die Aktion ist geplant.' : 'Keine Auswertung vorhanden.' };
  const e = a.ausgewertet;
  const kontrolle = a.kontrollHaeuser.length >= 5;
  const b = breiteVon(s, kontrolle);
  const wa = a._wahr ?? { rabatt: 0, mitnahme: 0, vorzieh: 0, kanni: 0, altware: 0, image: 0, gewoehnung: 0, umsatzMit: 0 };
  const zentrum = (e.schaetzungVon + e.schaetzungBis) / 2;
  const f = a._mehrumsatzWahr !== 0 ? zentrum / a._mehrumsatzWahr : 1;
  const roh = kontrolliert(s, a._rohertragseffektWahr * f, a.id + 'r', b);
  const vorzieh = kontrolliert(s, vorziehSchaetzung(s, a), a.id + 'v', b * 1.5);
  return {
    ...basis, gemessen: true,
    marketingBericht: e.marketingBericht, mehrumsatzVon: e.schaetzungVon, mehrumsatzBis: e.schaetzungBis, hinweis: e.hinweis,
    rohertragseffektVon: roh.von, rohertragseffektBis: roh.bis,
    rabattkosten: kontrolliert(s, wa.rabatt, a.id + 'k', b * 0.3).wert,
    mitnahme: kontrolliert(s, wa.mitnahme, a.id + 'n', b).wert,
    vorzieheffekt: vorzieh.wert,
    kannibalisierung: kontrolliert(s, wa.kanni, a.id + 'c', b * 1.5).wert,
    altwarenabbau: kontrolliert(s, wa.altware, a.id + 'a', b).wert,
    gewoehnung: wa.gewoehnung,
    image: wa.image,
    sonderwerbung: a.kosten,
    ergebnis: eur(roh.wert - a.kosten - vorzieh.wert * 0.4),
    genauigkeit: s.controllingStufe === 2 ? 'hoch' : s.controllingStufe === 1 ? 'mittel' : 'gering',
  };
}

/** Vorgezogene Nachfrage: Umsatz, der in den Wochen nach der Aktion fehlt (Schätzung aus Uplift und Mechanik). */
function vorziehSchaetzung(s: GameState, a: Aktion): number {
  const nu = mech(a) === 'reduzierung' ? 0.09 : mech(a) === 'staffel' ? 0.08 : mech(a) === 'rabatt_alles' || mech(a) === 'rabatt_bereich' ? 0.07 : mech(a) === 'coupon' || mech(a) === 'rabatt_wg' ? 0.06 : mech(a) === 'punkte' ? 0.05 : 0.02;
  const wa = a._wahr;
  if (!wa) return 0;
  // Mehrnachfrage × Vorziehquote über die Abklingzeit
  return Math.max(0, a._mehrumsatzWahr + wa.rabatt) * nu / (1 - MK.vorzugAbbau) * 0.9;
}

export interface MarketingUebersicht {
  kw: number; jahr: number;
  werbequoteBrutto: number; werbequoteNetto: number;
  wocheBrutto: number; wocheBeteiligung: number; wocheNetto: number; wocheSonderwerbung: number;
  bloecke: { kanaele: number; karte: number; app: number; crm: number };
  jahrBrutto: number; jahrNetto: number;
  markenstaerke: number; image: number; gewoehnung: number;
  frequenzWoche: number; frequenzVorjahr?: number; bon: number;
  kartenanteil: number; mitglieder: number; appAktive: number;
  rabattquote13: number; crmMehrumsatz13: number;
  laufend: ReturnType<typeof eintrag>[]; naechste: ReturnType<typeof eintrag>[];
  kampagnenAktiv: number;
  verlauf: MarketingVerlauf[];
  hinweise: string[];
}

export function marketingUebersicht(s: GameState): MarketingUebersicht {
  const m = s.marketing.stand;
  const U = umsatzBezug(s);
  const k = marketingKosten(s, U);
  const v = m.verlauf;
  const letzte = v[v.length - 1];
  const vj = v.find((x) => x.woche === (letzte?.woche ?? -1) - 52);
  const v13 = v.slice(-13);
  const v52 = v.slice(-52);
  const w = s.woche;
  const hinweise: string[] = [];
  if (s.marketing.gewoehnung > 0.2) hinweise.push('Die Kundschaft wartet auf Rabatte: Gewöhnung hoch, Normalpreisabsatz leidet.');
  if (m.ist.marke < m.plan.marke - 3) hinweise.push('Die Markenstärke sinkt gegenüber dem Rahmenplan.');
  if (m.ist.ermuedung.mail > 0.5) hinweise.push('Mail-Ermüdung hoch: Öffnungen sinken, Abmeldungen steigen.');
  for (const d of KANAELE) if (m.ist.kanaele[d.id].abnutzung > 0.08) hinweise.push(`${d.name}: Abnutzung durch Dauerbeschallung.`);
  if (m.ist.karte.app.qualitaet < 0.3) hinweise.push('Die App ist veraltet: wenige aktive Nutzer, schwache Datenqualität.');
  return {
    kw: kwVon(w), jahr: s.startJahr + Math.floor(w / 52),
    werbequoteBrutto: k.brutto / Math.max(1, U), werbequoteNetto: (k.netto - k.sonderwerbung) / Math.max(1, U),
    wocheBrutto: eur(k.brutto), wocheBeteiligung: eur(k.beteiligung), wocheNetto: eur(k.netto), wocheSonderwerbung: eur(k.sonderwerbung),
    bloecke: { kanaele: eur(k.kanaeleSumme), karte: eur(k.karte.summe), app: eur(k.app), crm: eur(k.crmVersand) },
    jahrBrutto: eur(v52.reduce((x, y) => x + y.brutto, 0)), jahrNetto: eur(v52.reduce((x, y) => x + y.netto, 0)),
    markenstaerke: m.ist.marke, image: s.stakeholder.image, gewoehnung: s.marketing.gewoehnung,
    frequenzWoche: letzte?.kunden ?? 0, frequenzVorjahr: vj?.kunden, bon: letzte?.bon ?? MK.bon,
    kartenanteil: m.ist.karte.umsatzAnteil, mitglieder: Math.round(m.ist.karte.mitglieder), appAktive: Math.round(m.ist.karte.app.aktiveNutzer),
    rabattquote13: v13.length ? v13.reduce((x, y) => x + y.rabattquote * y.umsatz, 0) / Math.max(1, v13.reduce((x, y) => x + y.umsatz, 0)) : 0,
    crmMehrumsatz13: eur(v13.reduce((x, y) => x + y.crmMehrumsatz, 0)),
    laufend: s.marketing.aktionen.filter((a) => laeuft(a, w)).map((a) => eintrag(s, a)),
    naechste: s.marketing.aktionen.filter((a) => a.status !== 'abgesagt' && a.start > w).sort((a, b) => a.start - b.start).slice(0, 5).map((a) => eintrag(s, a)),
    kampagnenAktiv: m.ist.crm.filter((c) => c.status === 'aktiv').length,
    verlauf: v.slice(-13),
    hinweise,
  };
}


import type { Hq } from './hq';
import type { Art, Einkauf, WgId } from './einkauf';
import type { EigenmarkenStand } from './eigenmarken';
import type { VorstandStand } from './vorstand';
import type { ProdukteStand } from './produkte';
import type { AktionWahr, MarketingStand } from './marketing';
import type { SchwierigkeitId } from './schwierigkeit';

// Geldbeträge sind immer ganze Euro (Integer). Alle Rundungen laufen über util.eur().
export type Eur = number;

export type Format = 'warenhaus' | 'sport';
export type WettbewerberArt = 'modehaus' | 'offprice' | 'textildiscounter' | 'elektronik' | 'premium' | 'fastfashion' | 'leer_ehemals';

export interface Wettbewerber {
  id: string;
  name: string;
  art: WettbewerberArt;
  kette: string;
  stadt: string;
  lage: Lage;
  grundflaecheQm: number;
  staerke: number;
  preisdruck: number;
  status: 'offen' | 'eroeffnung' | 'raeumung' | 'geschlossen';
  seit: number;
  bis?: number;
  inHartwigGebaeude?: string;
  form: number;
  aktionVon?: number;
  aktionBis?: number;
  konterVon?: number;
  konterBis?: number;
  konterDruck?: number;
  abwehrBis?: number;
  abwehrFaktor?: number;
}
export type Lage = '1a' | 'b' | 'center' | 'rand';
export type Cluster = 'metropole' | 'grossstadt' | 'mittelstadt';
export type Region = 'Nord' | 'Ost' | 'West' | 'Mitte' | 'Süd';

export type GruppeId =
  | 'damen' | 'herren' | 'kinder' | 'beauty' | 'accessoires' | 'waesche'
  | 'wohnen' | 'spielwaren' | 'food' | 'sport'
  | 'sportschuhe' | 'sporttextil' | 'outdoor' | 'rad' | 'wintersport' | 'teamsport';

/** Was auf einer Fläche passiert. */
export type Konzept = 'eigen' | 'kommission' | 'konzession' | 'untermiete' | 'offprice' | 'leer';

export type MieterTyp = 'discounter' | 'fitness' | 'aerztehaus' | 'behoerde' | 'gastro' | 'coworking' | 'drogerie';

export interface Untermieter {
  name: string;
  typ: MieterTyp;
  mieteWoche: Eur;
  bisWoche: number;
  frequenzBonus: number; // z. B. 0.05 = +5 % Frequenz im Haus
  dealId?: string;
}

export interface Flaeche {
  id: string;
  etage: number; // -1 = UG, 0 = EG, 1.. = OG
  qm: number;
  konzept: Konzept;
  gruppe?: GruppeId; // bei eigen, kommission, konzession
  lieferantId?: string; // bei kommission, konzession
  mieter?: Untermieter;
  umbauBis?: number; // Woche, ab der die Fläche wieder läuft
  umbauZiel?: { konzept: Konzept; gruppe?: GruppeId; mieter?: Untermieter; lieferantId?: string };
}

export type NetTyp = 'net' | 'double' | 'triple';

export interface Mietvertrag {
  mieteWoche: Eur;
  bisWoche: number;
  netTyp: NetTyp;
  vermieter: 'eigentuemer' | 'dritt';
  vermieterName: string;
  nebenkostenQmWoche: number; // nur bei double/triple
  verhandeltWoche?: number; // letzte Mietverhandlung (Cooldown)
  keineVerlaengerung?: boolean; // Vermieter verlängert nicht
}

export interface Filialleiter {
  name: string;
  skill: number; // 0..1
  moral: number; // 0..100
  interimBis?: number;
}

export interface Personal {
  vollzeit: number; // FTE
  teilzeit: number; // FTE
  aushilfen: number; // FTE
  filialleiter: Filialleiter;
}

export type HausStatus = 'offen' | 'schliessung_verhandlung' | 'raeumung' | 'geschlossen' | 'verkauft';

export interface Einzugsgebiet {
  kaufkraft: number; // Index, 1 = Durchschnitt
  alter: number; // Index, >1 = älter
  wettbewerb: number; // 0..1
}

export interface HausKpi {
  woche: number;
  umsatz: Eur; // eigener Umsatz inkl. Kommission und Offprice
  rohertrag: Eur;
  konzessionserloes: Eur;
  untermiete: Eur;
  personal: Eur;
  miete: Eur;
  nebenkosten: Eur;
  sonstige: Eur;
  db: Eur; // Deckungsbeitrag Haus
  fteBedarf: number;
  fteIst: number;
  umsatzJeGruppe: Partial<Record<GruppeId, Eur>>;
}

export interface Haus {
  id: string;
  name: string;
  stadt: string;
  region: Region;
  cluster: Cluster;
  lage: Lage;
  format: Format;
  klasse?: 'premium';
  premiumSchluessel?: string;
  premiumImage?: number;
  premiumEigentuemer?: string;
  premiumInvestition?: { bis: number; substanzProWoche: number; imageProWoche: number };
  einzug: Einzugsgebiet;
  wettbewerbStart: number;
  /** Unveränderliche historische Nachfragebasis je Warengruppe. */
  wettbewerbGruppeStart?: Partial<Record<GruppeId, number>>;
  /** Startbasis für die Nachfrage auf Offprice-Flächen. */
  wettbewerbOffpriceStart?: number;
  /** Additive Kalibrierung, weil der historische Startwert je Haus eigenständig gezogen wurde. */
  wettbewerbRohStart?: number;
  wettbewerbRohGruppenStart?: Partial<Record<GruppeId, number>>;
  wettbewerbLeerStart?: number;
  wettbewerbRohOffpriceStart?: number;
  wettbewerbSchliessungWoche?: number;
  etagen: number[];
  grundflaecheQm: number;
  baujahr: number;
  fassade: number; // Stilindex für die 3D-Generierung
  flaechen: Flaeche[];
  miete: Mietvertrag;
  restmieteWoche?: Eur; // laufende Miete nach Schließung
  restmieteBis?: number;
  personal: Personal;
  substanz: number; // 0..100
  substanzStart: number;
  status: HausStatus;
  statusBis?: number;
  /** Umsatzpotenzial je Gruppe bei Sättigung (€/Woche, saisonbereinigt). */
  potenzial: Partial<Record<GruppeId, number>>;
  /** Sättigungsfläche je Gruppe in qm. */
  saettigungQm: Partial<Record<GruppeId, number>>;
  transferBonus: number; // Frequenzbonus aus geschlossenen Nachbarhäusern
  streikBis?: number;
  standortgarantie?: boolean;
  kpi?: HausKpi;
  /** N01: Wochenhistorie des Hauses, höchstens 156 Wochen. */
  verlauf?: { woche: number; umsatz: Eur; db: Eur; frequenz: number; personalFte: number }[];
}

export interface Kohorte {
  gruppe: GruppeId;
  wert: Eur; // Einstandswert
  alter: number; // Wochen
  saisonAnteil: number;
  kostenFaktor: number; // 1 = normal, <1 = Sonderposten
  ladenhueter?: boolean; // verkauft sich nur über Offprice und Räumung
  /** Einkaufsebene: Warengruppe, Art (NOS/Saison), Eigenmarke, Saison des Wareneingangs. */
  wg?: WgId;
  art?: Art;
  marke?: string;
  saisonId?: number;
}

export interface Bestellung {
  id: string;
  gruppe: GruppeId;
  wert: Eur;
  ankunft: number;
  vorkasse: boolean;
  lieferantId?: string;
  kostenFaktor?: number;
  wg?: WgId;
  art?: Art;
  marke?: string;
  saisonId?: number;
}

export interface Verbindlichkeit {
  id: string;
  art: 'ware' | 'sonstiges';
  gruppe?: GruppeId;
  lieferantId?: string;
  wert: Eur;
  faellig: number;
  ueberfaelligSeit?: number;
}

export interface Lieferant {
  id: string;
  name: string;
  beschreibung: string;
  gruppen: Partial<Record<GruppeId, number>>; // Anteil am Einkauf der Gruppe
  vertrauen: number; // 0..100
  geduld: number; // 0..1, wie langsam Vertrauen bei Zahlungsverzug sinkt
  kvSensitivitaet: number; // wie stark er auf den Kreditversicherer reagiert
  fragilitaet: number; // Wahrscheinlichkeit/Woche zu kippen, wenn wir nicht zahlen
  wkzQuote: number; // Werbekostenzuschuss auf Einkaufsvolumen
  aktiv: boolean;
  ausfallBis?: number;
  rueckzug?: boolean; // z. B. Arvel zieht sich aus B-Lagen zurück
  dtc?: boolean; // Nordline hat auf Direktvertrieb umgestellt
  verspaetungen: number; // Gedächtnis
  letztesJahresgespraech?: number;
}

export type AktionsScope =
  | { typ: 'alle' }
  | { typ: 'format'; format: Format }
  | { typ: 'region'; region: Region }
  | { typ: 'cluster'; cluster: Cluster }
  | { typ: 'haeuser'; ids: string[] };

export interface Aktion {
  id: string;
  name: string;
  rabatt: number; // 0.1 .. 0.5
  start: number;
  ende: number; // exklusiv
  scope: AktionsScope;
  kontrollHaeuser: string[];
  kosten: Eur; // Werbung für die Aktion
  _mehrumsatzWahr: Eur; // verdeckt: echter Mehrumsatz
  _rohertragseffektWahr: Eur; // verdeckt
  ausgewertet?: AktionsAuswertung;
  // Marketing-Deep-Dive (src/marketing.ts): Anlass, Mechanik, Geltungsbereich, Status, verdeckte Effekte
  anlass?: string;
  mechanik?: string;
  bereiche?: GruppeId[];
  wg?: string;
  mindestbon?: number;
  punkteFaktor?: number;
  auflage?: number;
  status?: 'geplant' | 'abgesagt';
  standard?: boolean;
  _wahr?: AktionWahr;
}

export interface AktionsAuswertung {
  marketingBericht: Eur; // was das Marketing meldet
  schaetzungVon: Eur;
  schaetzungBis: Eur;
  hinweis: string;
}

export type BeraterTyp = 'strategie' | 'sanierung' | 'boutique';

export interface BeraterMandat {
  id: string;
  typ: BeraterTyp;
  haus: string; // Name der Beratung
  projektname: string;
  start: number;
  ende: number;
  wochenSatz: Eur;
  _qualitaet: number; // verdeckt 0..1
  ergebnis?: { empfohleneSchliessungen: string[]; folien: number; fazit: string };
}

export type AngebotTyp = 'untermiete' | 'paket' | 'stadt' | 'sportverkauf' | 'sonderposten' | 'uebernahme' | 'premiumVerkauf';

export interface Angebot {
  id: string;
  typ: AngebotTyp;
  woche: number;
  frist: number;
  titel: string;
  text: string;
  // untermiete / paket / stadt
  mieterTyp?: MieterTyp;
  mieterName?: string;
  etage?: number;
  qmJeHaus?: number;
  mieteQmMonat?: number;
  laufzeitJahre?: number;
  umbauAnteilMieter?: number; // Anteil der Umbaukosten, den der Mieter trägt
  wunschHaeuser?: string[];
  vorschlagHaeuser?: string[]; // aktueller Verhandlungsstand
  minHaeuser?: number;
  flexibilitaet?: number; // verdeckt 0..1
  einmalzahlung?: Eur;
  /** Angebot zur Übernahme eines aufgegebenen Konkurrenzstandorts. */
  wettbewerberId?: string;
  // sportverkauf
  kaufpreis?: Eur;
  premiumKaeuferTyp?: 'Luxusgruppe' | 'Family Office' | 'Staatsfonds';
  premiumKaeuferName?: string;
  // sonderposten
  gruppe?: GruppeId;
  wert?: Eur;
  _passt?: boolean;
  status: 'offen' | 'angenommen' | 'abgelehnt' | 'verfallen';
  erledigtWoche?: number;
}

export interface Entscheidung {
  id: string;
  typ: string;
  woche: number;
  frist: number;
  titel: string;
  text: string;
  optionen: { id: string; label: string }[];
  standard: string;
  daten: Record<string, string | number | boolean>;
}

export type MeldungTyp = 'presse' | 'info' | 'warnung' | 'ereignis' | 'eigentuemer' | 'insolvenz';

export interface Meldung {
  id?: string;
  woche: number;
  typ: MeldungTyp;
  text: string;
  bezug?: { stadt?: string; hausId?: string; modul?: string };
}

export interface Entscheidungsprotokoll {
  id: string;
  typ: string;
  titel: string;
  option: string;
  ergebnis: string;
  woche: number;
  standard: boolean;
  hausId?: string;
}

export interface Stakeholder {
  bank: number;
  kreditversicherer: number;
  vermieter: number;
  betriebsrat: number;
  image: number;
  eigentuemer: number; // Glaubwürdigkeit beim Eigentümer
}

export type Phase = 'regulaer' | 'insolvenz' | 'zerschlagen';

export interface Insolvenz {
  seit: number;
  versammlung: number;
  altVerbindlichkeiten: Eur;
  insolvenzgeldBis: number;
  quote: number; // angebotene Quote im Insolvenzplan
  grund: string;
}

export interface WochenKpi {
  woche: number;
  umsatz: Eur;
  rohertrag: Eur;
  abschriften: Eur;
  konzession: Eur;
  untermiete: Eur;
  wkz: Eur;
  personal: Eur;
  miete: Eur;
  nebenkosten: Eur;
  sonstige: Eur;
  logistik: Eur;
  zentrale: Eur;
  marketing: Eur;
  beratung: Eur;
  ebitda: Eur; // vor Sondereffekten
  sondereffekte: Eur;
  cash: Eur;
  kreditFrei: Eur;
  bestand: Eur;
  offeneHaeuser: number;
  fte: number;
}

export interface Quartal {
  nr: number; // 0-basiert
  start: number;
  plan?: Eur; // eingereichter Plan-EBITDA
  planStandard: Eur; // Engine-Prognose zu Quartalsbeginn
  ebitdaIst: Eur;
}

export interface GameState {
  version: 1;
  /** Schwierigkeit beim Spielstart (src/schwierigkeit.ts), fehlt = mittel. */
  schwierigkeit?: SchwierigkeitId;
  seed: number;
  rng: number;
  woche: number; // 0-basiert, Woche 0 = KW 1 im Startjahr
  startJahr: number;
  firma: { name: string; sportName: string };
  phase: Phase;
  insolvenz?: Insolvenz;
  insolvenzenGesamt: number;
  cash: Eur; // darf bis -kreditlinie negativ werden
  kreditlinie: Eur;
  kreditlinieBasis: Eur;
  zahlungsstockungSeit?: number;
  haeuser: Haus[];
  /** Globale Rabattaktionen erreichen Kronjuwelen nur bei ausdrücklich deaktiviertem Schutz. */
  premiumSchuetzen?: boolean;
  wettbewerber: Wettbewerber[];
  wettbewerbRng: number;
  wettbewerbNachnutzungen: { haus: string; woche: number }[];
  wettbewerbGeseheneSchliessungen: string[];
  /** Testschalter: reproduziert die alte Simulation ohne Wettbewerbsdynamik. */
  wettbewerbDeaktiviert?: boolean;
  /** Testschalter: nur autonome Ereignisse unterdrücken, der Startbestand bleibt aktiv. */
  wettbewerbEreignisseDeaktiviert?: boolean;
  wettbewerbNaechsteId: number;
  wettbewerbStadtUmsatz: Record<string, number[]>;
  bestand: Kohorte[];
  bestellungen: Bestellung[];
  verbindlichkeiten: Verbindlichkeit[];
  orderLevel: Partial<Record<GruppeId, number>>;
  basisUmsatz: Partial<Record<GruppeId, number>>; // saisonbereinigt, Bruttonachfrage eigen
  vorkasseAkzeptieren: boolean;
  lieferanten: Lieferant[];
  restLieferantenVertrauen: number;
  stakeholder: Stakeholder;
  kvLimitBasis: Eur;
  tarif: 'flaeche' | 'sanierung' | 'ohne';
  standortgarantieBis?: number;
  tarifAusstiegSeit?: number;
  tarifVersuch?: number;
  /** Zentralkosten je Woche, berechnet aus der Hauptverwaltung (hq). */
  zentrale: { kostenWoche: Eur; kostenStart: Eur; fte: number };
  /** Hauptverwaltung: Bürogebäude, Etagen, Abteilungen, Angebote. */
  hq: Hq;
  /** Einkauf: Warengruppen, Steuerung, Freigabe-Eingang, Kennzahlenverlauf. */
  einkauf: Einkauf;
  /** Eigenmarken. */
  eigenmarken: EigenmarkenStand;
  /** Vorstand (C-Level): Ressorts, Personen, Delegation, Kandidaten, Sitzungen. */
  vorstand: VorstandStand;
  /** Produktentwicklung der Eigenmarken. */
  produkte: ProdukteStand;
  /** Marketing: Werbequote netto (kompatibel), Gewöhnung, Aktionskalender; `stand` = Kanäle, Karte, App, CRM (src/marketing.ts). */
  marketing: { budgetQuote: number; gewoehnung: number; kundenkarte: boolean; aktionen: Aktion[]; stand: MarketingStand };
  controllingStufe: 0 | 1 | 2;
  berater: BeraterMandat[];
  beraterQualitaet: Record<string, number>; // verdeckt, je Beratungshaus
  angebote: Angebot[];
  entscheidungen: Entscheidung[];
  /** Gefallene Entscheidungen, maximal 52 Wochen. Für alte Spielstände optional. */
  entscheidungsprotokoll?: Entscheidungsprotokoll[];
  quartale: Quartal[];
  eigentuemer: { strikes: number; kapitalZugefuehrt: Eur; forderung?: string };
  makro: { konjunktur: number; schockBis?: number; schockStaerke: number; phase: number };
  meldungen: Meldung[];
  historie: WochenKpi[];
  /** N01: Statistik ist optional und ändert keine Berechnung. */
  statistikDeaktiviert?: boolean;
  statistik?: { sparsam: boolean; stimmung: { woche: number; wert: number }[] };
  zaehler: number; // für IDs
  prognose?: boolean; // true in Vorschau-Klonen: keine Zufallsereignisse
  einmalkostenWoche: Eur; // Sondereffekte der laufenden Woche
  einmalErloeseWoche: Eur;
}

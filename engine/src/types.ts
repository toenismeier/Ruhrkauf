import type { Hq } from './hq';
import type { ChronikEintrag, ChronikStand } from './chronik';
import type { OrganisationsStand } from './organisation';
import type { MarktbeobachtungStand } from './marktbeobachtung';
import type { PlanungStand } from './planung';
import type { BauEtage, UmbauStand } from './umbau';
import type { Art, Einkauf, WgId } from './einkauf';
import type { EigenmarkenStand } from './eigenmarken';
import type { VorstandStand } from './vorstand';
import type { ProdukteStand } from './produkte';
import type { AktionWahr, MarketingStand } from './marketing';
import type { SchwierigkeitId } from './schwierigkeit';
import type { FilialGuV, FilialProgrammeStand } from './filialguv';
import type { EcommerceStand } from './ecommerce';
// O02 Umsatztreiber
import type { TreiberFaktoren, TreiberQuellen, TreiberPeriode } from './treiber';
// O03 IT
import type { ItStand } from './it';
// O07 Haus
import type { HausBetrieb, HausbetriebStand } from './haus';
// O04 Personal
import type { PersonalHausStand, PersonalStand } from './personaleinsatz';
// O05 Ware
import type { WareStand } from './merchandise';
import type { SzenarioStand } from './szenarien';
import type { VorjahrWoche } from './vertrieb';

// Geldbeträge sind immer ganze Euro (Integer). Alle Rundungen laufen über util.eur().
export type Eur = number;

export type Format = 'warenhaus' | 'sport' | 'schwester' | 'outlet';
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
  | 'damen' | 'herren' | 'kinder' | 'beauty' | 'accessoires' | 'waesche' | 'schuhe'
  | 'wohnen' | 'spielwaren' | 'food' | 'sport'
  | 'sportschuhe' | 'sporttextil' | 'outdoor' | 'rad' | 'wintersport' | 'teamsport';

/** Was auf einer Fläche passiert. */
export type Konzept = 'eigen' | 'kommission' | 'konzession' | 'untermiete' | 'offprice' | 'leer';

export type MieterTyp = 'discounter' | 'fitness' | 'aerztehaus' | 'behoerde' | 'gastro' | 'coworking' | 'drogerie' | 'baeckerei' | 'paketshop' | 'bibliothek';

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
  // O07 Haus
  staerken?: { personal: number; ware: number; kunde: number; kosten: number };
  ehrlichkeit?: number;
  gehalt?: number;
  bonusAnteil?: number;
  wechselwille?: number;
  stellvertretung?: { name: string; qualitaet: number };
}

export interface Personal {
  vollzeit: number; // Vertrags-FTE
  teilzeit: number; // Vertrags-FTE
  aushilfen: number; // Vertrags-FTE
  /** Realisierter Ausgangsumsatz als Bezug für die flexible Wochen-Einsatzplanung. */
  umsatzReferenzWoche?: number;
  filialleiter: Filialleiter;
}

/** Entgeltliche, bereits bei Spielstart vertraglich belegte Filialleistungen.
 * Die Werbeflächen sind Vermarktungsplätze IM Verkaufsraum (keine Umwandlung der Fläche).
 * O07-Konzessionäre/Untervermieter bleiben eigenständige, zusätzliche Vertragsquellen.
 */
export interface FilialNebenvertrag {
  werbeflaecheQm: number;
  werbeEuroJeQmWoche: number;
  dienstleistungEuroJeBon: number;
  durchschnittsBonEuro: number;
}

export type HausStatus = 'offen' | 'schliessung_verhandlung' | 'raeumung' | 'geschlossen' | 'verkauft';

export interface Einzugsgebiet {
  kaufkraft: number; // Index, 1 = Durchschnitt
  alter: number; // Index, >1 = älter
  wettbewerb: number; // 0..1
}

export interface HausKpi {
  /** Vollständige Filial-GuV, ohne die Hauptverwaltung. */
  guv?: FilialGuV;
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
  /** Nur zusätzliche Altstandorte des Fusionsszenarios. */
  fusionUrsprung?: 'volkskauf';
  id: string;
  name: string;
  stadt: string;
  region: Region;
  cluster: Cluster;
  // O01 Organisation: geografischer Hauscluster (auch bei Premium/Flagship für Rankings).
  hauscluster?: string;
  // O07 Haus: Schnittstellen zu O01 (Hauscluster) und O06 (Wochenplan)
  flagship?: boolean;
  clusterleitungQualitaet?: number;
  wochenPlan?: number;
  betrieb?: HausBetrieb;
  lage: Lage;
  format: Format;
  /** A/B/C ist nur für reguläre Hartwig-Häuser definiert. */
  hausklasse?: 'A' | 'B' | 'C';
  /** Premium bleibt wirtschaftlich ein Warenhaus. */
  klasse?: 'premium';
  premiumSchluessel?: string;
  premiumImage?: number;
  premiumEigentuemer?: string;
  premiumInvestition?: { bis: number; substanzProWoche: number; imageProWoche: number };
  /** Volkskauf und FUNDUS sind bis Engine-Formate reine Bestandsdaten. */
  nurDaten?: boolean;
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
  /** Werbeplatz- und Dienstleistungsverträge, ohne Filialumsatz-Gutschrift. */
  nebenvertrag?: FilialNebenvertrag;
  // O04 Personal: zusätzliche Dienstplanung, Basis-FTE bleiben in personal.
  personaleinsatz?: PersonalHausStand;
  substanz: number; // 0..100
  substanzStart: number;
  // O08 Umbau
  etagenBau?: Record<number, BauEtage>;
  umbauFrequenz?: number;
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
  // O02 Umsatztreiber: Startfaktoren sind neutral, Quellen der späteren operativen Module.
  treiber?: TreiberFaktoren;
  treiberQuellen?: TreiberQuellen;
  treiberVerlauf?: TreiberPeriode[];
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
  // O05 Ware: physischer Warenbestand je Hauscluster
  hauscluster?: string;
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

export type AngebotTyp = 'untermiete' | 'paket' | 'stadt' | 'sportverkauf' | 'sonderposten' | 'uebernahme' | 'premiumVerkauf' | 'konzernVerkauf' | 'staatshilfe';

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
  konzernKaeuferTyp?: 'Finanzinvestor' | 'Handelskonzern' | 'Immobilienfonds';
  konzernKaeuferName?: string;
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

/** Zahlungsstrom der abgeschlossenen Woche, auf den tatsächlichen Cash-Bestand abgestimmt. */
export interface KapitalflussWoche {
  operativ: Eur;
  investitionen: Eur;
  finanzierung: Eur;
  sonstiges: Eur;
  netto: Eur;
  bestand: Eur;
  woche: number;
}

export interface WochenKpi {
  /** Addition aller aktiven Filialkostenstellen; bei alten Savegames optional. */
  filialGuV?: FilialGuV;
  onlineUmsatz?: Eur;
  onlineKannibalisierung?: Eur;
  onlineEffekt?: Eur;
  woche: number;
  umsatz: Eur;
  rohertrag: Eur;
  abschriften: Eur;
  konzession: Eur;
  untermiete: Eur;
  wkz: Eur;
  werbeflaechen: Eur;
  dienstleistungen: Eur;
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
  kapitalfluss?: KapitalflussWoche; // optional für alte Spielstände
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

export type EndArt = 'zerschlagen' | 'saniert' | 'investor' | 'ruhestand';
export interface WertungTeil { id: string; name: string; wert: number; punkte: number }
export interface Endwertung {
  teile: WertungTeil[];
  grundpunkte: number;
  multiplikator: number;
  punkte: number;
  schwierigkeit: SchwierigkeitId;
}
export interface SpielendeKennzahlen {
  geretteteHaeuser: number; startHaeuser: number;
  fte: number; startFte: number;
  ebitda52: Eur; umsatz52: Eur; unternehmenswert: Eur; image: number;
}
export interface SpielEnde {
  art: EndArt;
  woche: number;
  kennzahlen: SpielendeKennzahlen;
  wertung: Endwertung;
  kaeufer?: string;
}

export interface GameState {
  ecommerce?: EcommerceStand;
  /** O09 A/B-Referenz ohne Online-Kanal. */
  ecommerceDeaktiviert?: boolean;
  /** Optional, damit historische Spielstände und das Standardszenario identisch bleiben. */
  szenario?: SzenarioStand;
  version: 2;
  /** Anfangsbasis der Endwertung; bei alten Spielständen optional. */
  spielendeStart?: { haeuser: number; fte: number };
  /** N02 abschaltbar (künftig über Einstellungen). */
  spielendeDeaktiviert?: boolean;
  spielendeFortgesetzt?: boolean;
  testspiel?: boolean;
  ende?: SpielEnde;
  /** N14: Testwerkzeuge wurden in diesem Spielstand genutzt. */
  testGenutzt?: boolean;
  /** Schwierigkeit beim Spielstart (src/schwierigkeit.ts), fehlt = mittel. */
  schwierigkeit?: SchwierigkeitId;
  seed: number;
  rng: number;
  woche: number; // 0-basiert, Woche 0 = KW 1 im Startjahr
  /** Q07: Kalenderstart in Wochen (Januar/April/Juli/Oktober); fehlt = 0. */
  spielStartWoche?: number;
  startMonat?: 1 | 4 | 7 | 10;
  /** Q07: Historische Vergleichswochen vor Amtsantritt, nur Lesedaten. */
  vorjahrHistorie?: Record<string, VorjahrWoche[]>;
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
  // O07 Haus
  hausbetrieb?: HausbetriebStand;
  /** O07 Haus: nur für A/B-Performance und Baseline-Kalibrierung. */
  hausbetriebAbnahmeAus?: boolean;
  // O08 Umbau
  umbau?: UmbauStand;
  // O04 Personal
  personaleinsatz?: PersonalStand;
  /** O04 ausschließlich A/B-Laufzeitmessung: überspringt die wöchentliche Neuplanung. */
  personaleinsatzDeaktiviert?: boolean;
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
  // O03 IT: optional für ältere Spielstände.
  it?: ItStand;
  /** Hauptverwaltung: Bürogebäude, Etagen, Abteilungen, Angebote. */
  hq: Hq;
  // O01 Organisation (optional für ältere Spielstände).
  organisation?: OrganisationsStand;
  /** Q06: lokale Marktbeobachtung und archivierte Meldungszahlen. */
  marktbeobachtung?: MarktbeobachtungStand;
  /** Einkauf: Warengruppen, Steuerung, Freigabe-Eingang, Kennzahlenverlauf. */
  einkauf: Einkauf;
  // O05 Ware
  ware?: WareStand;
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
  /** N03: freigeschaltete Erfolgs-IDs auf die Woche der Freischaltung abbilden. */
  erfolge?: Record<string, number>;
  /** Opt-out für das Nice-to-have, künftig über N13. Standard: eingeschaltet. */
  erfolgeAktiv?: boolean;
  /** Ausschließlich für Fortschritt und Streaks, ohne Einfluss auf das Balancing. */
  erfolgeVerlauf?: import('./erfolge').ErfolgStand;
  /** Reserviert für echte Format-KPIs aus der späteren Formate-Engine. */
  formatErfolge?: { fundusDb?: number; volkskaufSaniert?: boolean };
  /** Gefallene Entscheidungen, maximal 52 Wochen. Für alte Spielstände optional. */
  entscheidungsprotokoll?: Entscheidungsprotokoll[];
  quartale: Quartal[];
  /** Freiwillige, deterministische Chronik des Spielverlaufs (N12). */
  chronik?: ChronikEintrag[];
  chronikStand?: ChronikStand;
  // O06 Planung: Jahresbudget, Forecast, Boni (optional für alte Spielstände).
  planung?: PlanungStand;
  /** Nur für Kalibrierung: schaltet die operativen Planungseffekte ab. */
  planungDeaktiviert?: boolean;
  eigentuemer: { strikes: number; kapitalZugefuehrt: Eur; forderung?: string };
  makro: { konjunktur: number; schockBis?: number; schockStaerke: number; phase: number };
  meldungen: Meldung[];
  historie: WochenKpi[];
  /** Laufende Sanierungsprogramme: Kosten, Vorlauf und Wirkungsbeginn werden separat gebucht. */
  filialProgramme?: FilialProgrammeStand;
  /** Persistiertes Archiv des Handelsboten (maximal 104 Wochen). */
  zeitung?: import('./zeitung').ZeitungStand;
  /** N01: Statistik ist optional und ändert keine Berechnung. */
  statistikDeaktiviert?: boolean;
  statistik?: { sparsam: boolean; stimmung: { woche: number; wert: number }[] };
  /** Noch nicht in einem Wochenabschluss ausgewiesene Investitions-/Finanzierungszahlungen. */
  kapitalflussOffen?: { investitionen: Eur; finanzierung: Eur };
  /** Anfangsbestand vor Spielermaßnahmen in Woche 0 (wichtig bei noch leerer Historie). */
  kapitalflussStartCash?: Eur;
  zaehler: number; // für IDs
  prognose?: boolean; // true in Vorschau-Klonen: keine Zufallsereignisse
  /** O02 Umsatztreiber: nur für den A/B-Laufzeitbenchmark, schaltet die neue Erfassung ab. */
  treiberErfassungAus?: boolean;
  einmalkostenWoche: Eur; // Sondereffekte der laufenden Woche
  einmalErloeseWoche: Eur;
}

// Einkauf: 57 Warengruppen (WG) unter den 16 Bereichen, Bestand und Orders je WG und Art (NOS, Saison),
// Orderrhythmus (Vororder, Nachorder, NOS-Dispo), Open to Buy, Freigabe-Eingang und Kennzahlen.
// Vertrag: ../EINKAUF-VERTRAG.md. Die Bereichswerte (GameState.bestand je gruppe, basisUmsatz, Wareneinsatz)
// bleiben die Aggregation, damit wirtschaft, abfragen und HQ unverändert weiterlaufen.
import { GRUPPEN, LIEFERANTEN, saisonFaktor } from './daten';
import type { Bestellung, Format, GameState, GruppeId, Kohorte } from './types';
import { clamp, eur, melde, mio, normal, zwischen, type RngHalter } from './util';
import type { HausRoh } from './wirtschaft';
import { produktMargeDelta, produktNachfrageFaktor } from './produkte';
import { marketingAltVerkauf, marketingAltwareFaktor, marketingWgTilt } from './marketing';
import {
  attraktivitaet, BESCHAFFUNG, eigenmarkeAnteil, eigenmarkeEinstellen, eigenmarkeGruenden, eigenmarkeNeupositionieren,
  eigenmarkeSetzen, istVerkaufsaktiv, mehrmarge, passungWg,
  type Beschaffung, type EigenmarkeEntwurf, type Eigenmarke, type EmGeschlecht, type EmKategorie,
} from './eigenmarken';

// ---------------------------------------------------------------------------------------------
// Datenmodell (Vertrag)
// ---------------------------------------------------------------------------------------------

export type WgId = string; // `${bereich}.${kurz}`
export type Art = 'nos' | 'saison';
export type FreigabeModus = 'auto' | 'verfall';
export type Reduzierung = 'frueh' | 'normal' | 'spaet';
export type Servicegrad = 0.9 | 0.95 | 0.98;
export type OrderTyp = 'vororder' | 'nachorder' | 'nos';
export type Ampel = 'gruen' | 'gelb' | 'rot';
/** Ziel einer WG-Aktion: eine WG, ein ganzer Bereich oder alle. */
export type WgAuswahl = WgId | GruppeId | 'alle';

export interface WgDef {
  id: WgId;
  name: string;
  bereich: GruppeId;
  anteil: number; // Anteil am Bereichsumsatz
  nosAnteil: number; // Start, auf Bereichswert normiert (1 - saisonAnteil)
  margeNos: number; // Rohwerte, beim Start auf die Bereichsmarge kalibriert
  margeSaison: number;
  vorlaufVor: number;
  vorlaufNach: number;
  vorlaufNos: number;
  saison: number[]; // 12 Monatsfaktoren der WG (Bereichskurve mit Abweichungen)
  mindestabnahme: number; // € EK je Saisonorder
  eigenmarkenfaehig: boolean;
  kategorie?: EmKategorie;
  geschlecht: EmGeschlecht;
  jung?: boolean;
  reif?: boolean;
  lieferant: string;
}

export interface WgSteuerung {
  limitFaktor: number; // Open to Buy als Faktor auf den Saisonplan
  limitEuro?: number; // oder fest in Euro je Saison
  nosZiel: number;
  servicegrad: Servicegrad;
  vororderquote: number;
  reduzierung: Reduzierung;
  modus: Record<Art, FreigabeModus>;
}

export interface WgVerlauf {
  w: number[]; // Woche
  u: number[]; // Umsatz VK
  r: number[]; // Rohertrag nach Abschriften
  e: number[]; // Wareneinsatz
  b: number[]; // Bestand EK Wochenende
  a: number[]; // Abschriften
  f: number[]; // entgangener Umsatz (Fehlmengen) VK
  n: number[]; // NOS-Verfügbarkeit 0..1
  eu: number[]; // Eigenmarkenumsatz
  er: number[]; // Eigenmarkenrohertrag (vor Abschriften)
  nd: number[]; // Bruttonachfrage VK
}

export interface WgStand {
  id: WgId;
  st: WgSteuerung;
  nosAnteil: number; // aktuell (nähert sich dem Ziel)
  margeNos: number; // Fremdware, kalibriert
  margeSaison: number;
  norm: number; // Nachfragenorm (Startmix = 1)
  basisVK: number; // saisonbereinigte Nachfrage VK
  fehler: number; // Prognosefehler der Auto-Dispo (AR-Prozess)
  /** Nachfrageanteile je Pool (fremd, Marken-Id) der letzten Woche. */
  pool: Record<string, number>;
  /** Open to Buy je Saison-Id: Planbasis (EK) und verbraucht. */
  limits: Record<string, { plan: number; verbraucht: number; stand?: number }>;
  /** Wareneingang und Abverkauf (EK) der Saisonware je Saison-Id (laufende und nächste). */
  saisons: Record<string, { eingang: number; abverkauf: number }>;
  /** Letzte Saison-Id mit Vororder je Pool. */
  vororder: Record<string, number>;
  v: WgVerlauf;
}

export interface Lieferung { woche: number; wert: number }

export interface Freigabe {
  id: string;
  wg: WgId;
  art: Art;
  typ: OrderTyp;
  lieferant: string;
  marke?: string;
  wert: number; // € EK
  lieferungen: Lieferung[];
  erwarteterAbverkauf: number; // € VK in den 8 Wochen ab Ankunft
  reichweiteDanach: number; // Wochen
  erstellt: number;
  frist: number; // letzte Woche für die Freigabe
  ueberLimit: boolean; // vom Open to Buy gekürzt
  hinweis?: string;
}

export interface FreigabeProtokoll { woche: number; neu: number; direkt: number; freigegeben: number; auto: number; verfallen: number; verfallenWert: number; abgelehnt: number }

export interface Einkauf {
  grenze: number;
  wgs: Record<WgId, WgStand>;
  freigaben: Freigabe[];
  rng: number;
  zaehler: number;
  protokoll: FreigabeProtokoll[];
  /** Eigener Warenumsatz VK je Woche (alle WG), 52 Wochen. */
  eigenUmsatz: number[];
  /** Umsatz und Rohertrag je Eigenmarke, 52 Wochen. */
  markenKpi: Record<string, { u: number[]; r: number[] }>;
  /** VK-Anteil der Eigenmarken je Bereich (letzte Woche). */
  emJeBereich: Partial<Record<GruppeId, Record<string, number>>>;
  /** Eigenmarkenanteil je Bereich beim Start (Bezug für die Kannibalisierung). */
  emStart: Partial<Record<GruppeId, number>>;
}

// ---------------------------------------------------------------------------------------------
// Warengruppen
// ---------------------------------------------------------------------------------------------

type Roh = [kurz: string, name: string, anteil: number, nos: number, margeDelta: number, vorVor: number, vorNach: number, vorNos: number, mindestK: number, em: EmKategorie | '', lieferant: string, saison?: Record<number, number>, extra?: { geschlecht?: EmGeschlecht; jung?: boolean; reif?: boolean }];

const JACKE = { 0: 1.3, 1: 1.1, 5: 0.5, 6: 0.4, 7: 0.6, 8: 1.2, 9: 1.6, 10: 1.5 };
const STRICK = { 9: 1.4, 10: 1.4, 11: 1.3, 0: 1.2, 5: 0.5, 6: 0.5 };

const ROH: Partial<Record<GruppeId, Roh[]>> = {
  damen: [
    ['jacken', 'Jacken und Mäntel', 0.17, 0.1, 0.01, 26, 8, 4, 40, 'Bekleidung', 'Lanberg Outerwear', JACKE],
    ['kleider', 'Kleider', 0.11, 0.15, 0.02, 22, 6, 4, 25, 'Bekleidung', 'Costa Viva Moden', { 3: 1.3, 4: 1.5, 5: 1.5, 6: 1.2, 10: 0.8, 11: 0.8, 0: 0.6 }],
    ['blusen', 'Blusen und Shirts', 0.14, 0.35, 0, 20, 6, 3, 25, 'Bekleidung', 'Weberei Kaltenbach'],
    ['strick', 'Strick', 0.11, 0.3, 0, 22, 6, 3, 25, 'Bekleidung', 'Strickhaus Ammerland', STRICK],
    ['hosen', 'Hosen und Röcke', 0.13, 0.45, -0.01, 20, 6, 3, 25, 'Bekleidung', 'Brandauer Hosenmanufaktur'],
    ['denim', 'Denim', 0.09, 0.55, -0.02, 18, 6, 3, 20, 'Bekleidung', 'Bluefield Denim'],
    ['young', 'Young Fashion', 0.1, 0.1, 0.01, 14, 4, 3, 20, 'Bekleidung', 'Urbanrise', undefined, { jung: true }],
    ['gg', 'Große Größen', 0.1, 0.4, 0, 20, 6, 3, 20, 'Bekleidung', 'Ellmann Moden', undefined, { reif: true }],
    ['trachten', 'Trachten', 0.05, 0.15, 0.03, 26, 8, 4, 15, '', 'Alpenhof Trachten', { 7: 1.5, 8: 2.6, 9: 1.2, 0: 0.5, 1: 0.5, 2: 0.6 }],
  ],
  herren: [
    ['business', 'Business und Anzüge', 0.2, 0.35, 0.02, 22, 8, 4, 30, 'Bekleidung', 'Hallberg & Söhne', undefined, { reif: true }],
    ['casual', 'Casual', 0.2, 0.3, 0, 20, 6, 3, 25, 'Bekleidung', 'Nordkap Menswear'],
    ['hemden', 'Hemden', 0.18, 0.6, -0.01, 18, 6, 3, 25, 'Bekleidung', 'Hallberg & Söhne'],
    ['hosen', 'Hosen', 0.16, 0.5, -0.01, 18, 6, 3, 25, 'Bekleidung', 'Brandauer Hosenmanufaktur'],
    ['strick', 'Strick und Sweat', 0.12, 0.3, 0, 22, 6, 3, 20, 'Bekleidung', 'Strickhaus Ammerland', STRICK],
    ['jacken', 'Jacken und Mäntel', 0.14, 0.1, 0.01, 26, 8, 4, 30, 'Bekleidung', 'Lanberg Outerwear', JACKE],
  ],
  waesche: [
    ['tag', 'Tagwäsche', 0.3, 0.8, 0, 16, 6, 2, 20, 'Wäsche', 'Lindauer Wäschefabrik', undefined, { geschlecht: 'damen' }],
    ['nacht', 'Nachtwäsche', 0.2, 0.6, 0.01, 18, 6, 3, 15, 'Wäsche', 'Lindauer Wäschefabrik', { 10: 1.3, 11: 1.5 }, { geschlecht: 'unisex' }],
    ['mieder', 'Miederwaren', 0.17, 0.8, 0.01, 16, 6, 2, 15, '', 'Corsina', undefined, { geschlecht: 'damen' }],
    ['herren', 'Herrenwäsche', 0.15, 0.85, -0.01, 16, 6, 2, 15, 'Wäsche', 'Lindauer Wäschefabrik', undefined, { geschlecht: 'herren' }],
    ['struempfe', 'Strümpfe und Strumpfhosen', 0.18, 0.7, 0, 14, 4, 2, 10, 'Wäsche', 'Feinstrick Plauen', { 9: 1.3, 10: 1.3, 11: 1.2, 5: 0.7, 6: 0.7 }, { geschlecht: 'unisex' }],
  ],
  accessoires: [
    ['damenschuhe', 'Damenschuhe', 0.3, 0.35, 0, 22, 6, 4, 25, 'Schuhe', 'Pirmasenser Schuhwerk', undefined, { geschlecht: 'damen' }],
    ['herrenschuhe', 'Herrenschuhe', 0.18, 0.55, 0, 22, 6, 4, 20, 'Schuhe', 'Pirmasenser Schuhwerk', undefined, { geschlecht: 'herren' }],
    ['lederwaren', 'Lederwaren und Taschen', 0.2, 0.6, 0.02, 18, 6, 3, 15, 'Accessoires', 'Offenbacher Lederwerk'],
    ['schmuck', 'Schmuck und Uhren', 0.22, 0.75, 0.01, 12, 4, 2, 15, '', 'Goldbach Schmuck', { 10: 1.3, 11: 1.9 }],
    ['reise', 'Reisegepäck', 0.1, 0.8, -0.02, 16, 6, 3, 15, 'Accessoires', 'Travelline', { 4: 1.3, 5: 1.4, 6: 1.4, 11: 1.2, 0: 0.7, 1: 0.7 }],
  ],
  kinder: [
    ['baby', 'Baby', 0.25, 0.7, 0.01, 18, 6, 3, 15, 'Bekleidung', 'Wolkenweich'],
    ['maedchen', 'Mädchen', 0.3, 0.4, 0, 20, 6, 3, 20, 'Bekleidung', 'Kinderland Textil'],
    ['jungen', 'Jungen', 0.27, 0.45, 0, 20, 6, 3, 20, 'Bekleidung', 'Kinderland Textil'],
    ['schuhe', 'Kinderschuhe', 0.18, 0.4, -0.01, 18, 6, 3, 15, 'Schuhe', 'Pirmasenser Schuhwerk', { 2: 1.3, 3: 1.3, 7: 1.3, 8: 1.3 }],
  ],
  wohnen: [
    ['tisch', 'Tisch und Küche', 0.3, 0.85, 0, 16, 6, 3, 20, 'Home', 'Kessler Haushalt'],
    ['heimtextil', 'Heimtextilien', 0.2, 0.7, 0.02, 18, 6, 3, 15, 'Home', 'Webhaus Nordhorn'],
    ['bett', 'Bettwaren', 0.17, 0.85, 0.01, 16, 6, 3, 15, 'Home', 'Daunenwerk Allgäu', { 9: 1.2, 10: 1.3, 11: 1.2 }],
    ['deko', 'Leuchten und Deko', 0.15, 0.4, 0.03, 20, 6, 3, 15, 'Home', 'Lichtform', { 10: 1.5, 11: 1.7, 0: 0.6 }],
    ['elektro', 'Elektrokleingeräte', 0.18, 0.9, -0.08, 8, 4, 2, 20, '', 'Kessler Haushalt', { 11: 1.6 }],
  ],
  beauty: [
    ['parfuem', 'Parfüm', 0.45, 0.85, 0.01, 8, 4, 2, 20, '', 'Maison Arvel'],
    ['pflege', 'Pflege und Kosmetik', 0.35, 0.95, 0.01, 6, 3, 2, 15, 'Beauty', 'Maison Arvel'],
    ['drogerie', 'Drogerie', 0.2, 0.98, -0.05, 4, 2, 1, 10, 'Beauty', 'Rheinpharm Vertrieb'],
  ],
  food: [
    ['deli', 'Delikatessen', 0.45, 0.95, 0, 4, 2, 1, 5, '', 'Hanseatische Feinkost'],
    ['wein', 'Wein und Spirituosen', 0.3, 0.95, -0.02, 6, 3, 1, 10, '', 'Weinkontor Rheingau', { 11: 1.6 }],
    ['suess', 'Süßwaren', 0.25, 0.9, 0.02, 8, 3, 1, 5, '', 'Confiserie Lauenstein', { 2: 1.3, 3: 1.2, 11: 1.7 }],
  ],
  spielwaren: [
    ['klein', 'Kleinspielwaren', 0.35, 0.85, 0.02, 12, 4, 2, 10, '', 'Spielwerk Fürth'],
    ['lizenz', 'Lizenzartikel', 0.35, 0.6, -0.03, 16, 6, 3, 20, '', 'Kinderwelt Lizenz'],
    ['saison', 'Saisonspielwaren', 0.3, 0.45, 0.01, 20, 6, 3, 15, '', 'Spielwerk Fürth', { 10: 1.2, 11: 1.4, 4: 1.2, 5: 1.3 }],
  ],
  sport: [
    ['bekleidung', 'Sportbekleidung', 0.6, 0.4, 0.01, 16, 6, 3, 20, 'Bekleidung', 'Nordline'],
    ['geraete', 'Sportgeräte und Fitness', 0.4, 0.65, -0.02, 14, 6, 3, 15, '', 'Fitwerk Sportgeräte', { 0: 1.5, 1: 1.2 }],
  ],
  sportschuhe: [
    ['lauf', 'Laufschuhe', 0.55, 0.75, 0, 16, 6, 3, 25, '', 'Nordline'],
    ['sneaker', 'Freizeit-Sneaker', 0.45, 0.6, 0, 14, 6, 3, 25, '', 'Nordline'],
  ],
  sporttextil: [
    ['funktion', 'Funktionsbekleidung', 0.55, 0.45, 0, 16, 6, 3, 20, 'Bekleidung', 'Nordline'],
    ['freizeit', 'Freizeit und Athleisure', 0.45, 0.35, 0, 14, 4, 3, 20, 'Bekleidung', 'Urbanrise', undefined, { jung: true }],
  ],
  outdoor: [
    ['bekleidung', 'Outdoorbekleidung', 0.6, 0.35, 0.01, 22, 6, 3, 25, 'Bekleidung', 'Fjellmark', { 9: 1.3, 10: 1.3 }],
    ['ausruestung', 'Ausrüstung und Zelte', 0.4, 0.5, -0.01, 18, 6, 3, 20, '', 'Fjellmark', { 4: 1.4, 5: 1.4, 6: 1.3, 0: 0.6, 1: 0.6 }],
  ],
  rad: [
    ['raeder', 'Fahrräder und E-Bikes', 0.6, 0.55, -0.02, 24, 8, 4, 40, '', 'Velowerk'],
    ['zubehoer', 'Radzubehör', 0.4, 0.7, 0.03, 12, 4, 2, 10, '', 'Velowerk'],
  ],
  wintersport: [
    ['ski', 'Ski und Snowboard', 0.45, 0.1, -0.01, 26, 8, 4, 40, '', 'Alpin Sport Vertrieb'],
    ['bekleidung', 'Skibekleidung', 0.55, 0.1, 0.01, 26, 8, 4, 30, 'Bekleidung', 'Alpin Sport Vertrieb'],
  ],
  teamsport: [
    ['fussball', 'Fußball', 0.65, 0.65, 0, 14, 6, 3, 20, '', 'Nordline', { 6: 1.4, 7: 1.3 }],
    ['verein', 'Vereinsbedarf', 0.35, 0.8, 0.01, 12, 4, 2, 10, '', 'Teamline Vereinsausstatter'],
  ],
};

const GESCHLECHT_BEREICH: Partial<Record<GruppeId, EmGeschlecht>> = { damen: 'damen', herren: 'herren', kinder: 'kinder' };

function baueWgDef(): WgDef[] {
  const out: WgDef[] = [];
  for (const [g, liste] of Object.entries(ROH) as [GruppeId, Roh[]][]) {
    const G = GRUPPEN[g];
    // NOS-Anteil auf den Bereich normieren: gewichteter Saisonanteil = saisonAnteil des Bereichs
    const saisonRoh = liste.reduce((a, r) => a + r[2] * (1 - r[3]), 0);
    const k = G.saisonAnteil / Math.max(0.001, saisonRoh);
    const sum = liste.reduce((a, r) => a + r[2], 0);
    for (const r of liste) {
      const [kurz, name, anteil, nos, md, vv, vn, vnos, mk, em, lief, sai, extra] = r;
      const m = G.marge + md;
      // Monatskurve: Bereichskurve mal WG-Abweichung, im Jahresmittel auf den Bereich normiert
      const kurve = G.saison.map((x, i) => x * (sai?.[i] ?? 1));
      const mittel = kurve.reduce((a, b) => a + b, 0) / 12;
      out.push({
        id: `${g}.${kurz}`, name, bereich: g, anteil: anteil / sum,
        nosAnteil: clamp(1 - (1 - nos) * k, 0.02, 0.98),
        margeNos: m - 0.03, margeSaison: m + 0.04,
        vorlaufVor: vv, vorlaufNach: vn, vorlaufNos: vnos,
        saison: kurve.map((x) => x / mittel),
        mindestabnahme: mk * 1000,
        eigenmarkenfaehig: em !== '', kategorie: em || undefined,
        geschlecht: extra?.geschlecht ?? GESCHLECHT_BEREICH[g] ?? 'unisex', jung: extra?.jung, reif: extra?.reif,
        lieferant: lief,
      });
    }
  }
  return out;
}

export const WG_DEF: WgDef[] = baueWgDef();
export const WG: Record<WgId, WgDef> = Object.fromEntries(WG_DEF.map((d) => [d.id, d]));
export const WG_JE_BEREICH: Partial<Record<GruppeId, WgDef[]>> = {};
for (const d of WG_DEF) (WG_JE_BEREICH[d.bereich] ??= []).push(d);

/** Saisonfaktor der WG-Kurve (wie saisonFaktor, Monate linear interpoliert). */
function wgKurve(d: WgDef, woche: number): number {
  const pos = ((((woche % 52) + 52) % 52) / 52) * 12 - 0.5;
  const i = Math.floor(pos);
  const t = pos - i;
  const a = d.saison[(i + 12) % 12];
  const b = d.saison[(i + 13) % 12];
  return a + (b - a) * t;
}

/** Anteil ω der WG am Bereich in einer Kalenderwoche (Summe je Bereich = 1). Vorberechnet. */
const OMEGA: Record<WgId, number[]> = {};
for (const [, liste] of Object.entries(WG_JE_BEREICH) as [GruppeId, WgDef[]][]) {
  for (let t = 0; t < 52; t++) {
    const roh = liste.map((d) => d.anteil * wgKurve(d, t));
    const sum = roh.reduce((a, b) => a + b, 0);
    liste.forEach((d, i) => { (OMEGA[d.id] ??= [])[t] = roh[i] / sum; });
  }
}
const omega = (wg: WgId, t: number): number => OMEGA[wg][((t % 52) + 52) % 52];
/** Saisonindex der WG: Nachfrage(t) = basisVK × S(t). */
export const wgSaison = (d: WgDef, t: number): number => (saisonFaktor(d.bereich, t) * omega(d.id, t)) / d.anteil;

// ---------------------------------------------------------------------------------------------
// Saisons und Parameter
// ---------------------------------------------------------------------------------------------

/** Saison-Id: gerade = Frühjahr/Sommer (ab KW 7), ungerade = Herbst/Winter (ab KW 33). */
export const saisonId = (t: number): number => Math.floor((t - 6) / 26);
export const saisonStart = (id: number): number => 6 + 26 * id;
/** Saison, für die eine Lieferung in Woche t eingekauft ist (Vorlieferungen bis 6 Wochen vor Saisonstart zählen zur neuen Saison). */
export const saisonVon = (t: number): number => saisonId(t + 6);
export function saisonName(s: GameState, id: number): string {
  const j = s.startJahr + Math.floor(saisonStart(id) / 52);
  return id % 2 === 0 ? `Frühjahr/Sommer ${j}` : `Herbst/Winter ${j}/${String((j + 1) % 100).padStart(2, '0')}`;
}

export const EK_PARAM = {
  grenze: 50_000,
  verfRef: 0.95, // NOS-Verfügbarkeit, auf die die Ausgangsnachfrage kalibriert ist
  saisonRef: 0.9875, // mittlere Saisonverfügbarkeit der Ausgangslage (Fehlmengen bei Standardsteuerung)
  servicegrad: { 0.9: { basis: 0.905, cover: 7 }, 0.95: { basis: 0.95, cover: 10 }, 0.98: { basis: 0.975, cover: 13 } } as Record<Servicegrad, { basis: number; cover: number }>,
  prognoseSd: [0.14, 0.07, 0.04, 0.025] as const, // Prognosefehler nach Einkauf-Stufe 0..3
  verfBonus: [-0.02, 0, 0.005, 0.01] as const,
  abschrift: {
    // ab: Woche, ab der reduziert wird; Sätze je Woche; cap: Anteil des Saisonbedarfs, den Altware decken darf;
    // nachfrage: frühe Reduzierung hält die Fläche frisch (mehr Saisonnachfrage), späte lässt sie altern
    frueh: { ab: 5, frisch: 0.015, alt: 0.034, spaet: 0.034, cap: 0.45, nachfrage: 1.02 },
    normal: { ab: 8, frisch: 0.012, alt: 0.03, spaet: 0.03, cap: 0.3, nachfrage: 1 },
    spaet: { ab: 12, frisch: 0.008, alt: 0.022, spaet: 0.04, cap: 0.2, nachfrage: 0.98 },
  } as Record<Reduzierung, { ab: number; frisch: number; alt: number; spaet: number; cap: number; nachfrage: number }>,
  optimismus: [0.14, 0.07, 0.035, 0.015] as const, // Mehrmenge der Saisondisposition nach Einkauf-Stufe 0..3 (Planoptimismus der Einkäufer)
  abschriftK: 0.395, // M7: realistische Abschriften auf Altware ohne überhöhte Dauerbelastung
  praesentation: 12, // Wochen Saisonbestand, ab denen das Sortiment voll verkauft (Größen, Farben, Fläche)
  saisonCover: 14, // Zielreichweite der Nachorder in Wochen
  altSaison: 16,
  altNos: 52,
  substitution: 0.5, // fehlende Eigenmarkenware: Anteil, der auf Fremdware ausweicht
  vororderSpanne: [-4, 9] as const, // Liefertermine der Vororder relativ zum Saisonstart
  frist: { vororder: 3, nachorder: 2, nos: 1 } as Record<OrderTyp, number>,
  orderrunde: 30, // Orderrunde: Wochen vor Saisonstart
  nosGrenzeFaktor: 5, // NOS-Sonderorder erst ab dem 5-fachen der Freigabegrenze im Eingang
  nosSonder: 2.1, // NOS-Order über dem 2,1-fachen Wochenbedarf ist eine Sonderorder (freigabepflichtig)
  nosMindest: 5_000,
  nosTempo: 0.01, // Umbau des NOS-Anteils je Woche
  verlauf: 52,
};

export const STANDARD_STEUERUNG = (d: WgDef): WgSteuerung => ({
  limitFaktor: 1.2, nosZiel: d.nosAnteil, servicegrad: 0.95, vororderquote: 0.6, reduzierung: 'normal',
  // Für die Grundversorgung gilt eine Freigabefrist mit automatischer Freigabe.
  // Der Spieler kann vor Fristablauf weiterhin kürzen oder ablehnen und
  // über wgFreigabeModus ausdrücklich auf 'verfall' umstellen.
  modus: { nos: 'auto', saison: 'auto' },
});

const leererVerlauf = (): WgVerlauf => ({ w: [], u: [], r: [], e: [], b: [], a: [], f: [], n: [], eu: [], er: [], nd: [] });

const rngHalter = (s: GameState): RngHalter => s.einkauf;
const einkaufStufe = (s: GameState): number => clamp(s.hq?.wirkung.einkauf ?? 1, 0, 3);
function interpol(arr: readonly number[], L: number): number {
  const i = Math.min(arr.length - 2, Math.floor(L));
  return arr[i] + (arr[i + 1] - arr[i]) * (L - i);
}
export const aktiveWg = (s: GameState): WgDef[] => WG_DEF.filter((d) => s.basisUmsatz[d.bereich] !== undefined);

// ---------------------------------------------------------------------------------------------
// Pools: Fremdware ('fremd') und Eigenmarken (Marken-Id)
// ---------------------------------------------------------------------------------------------

export const FREMD = 'fremd';
const poolVon = (k: { marke?: string }): string => k.marke ?? FREMD;

export function margeVon(s: GameState, wg: WgStand, art: Art, pool: string): number {
  const m = art === 'nos' ? wg.margeNos : wg.margeSaison;
  if (pool === FREMD) return m;
  const mk = s.eigenmarken.marken.find((x) => x.id === pool);
  // Produkte der Marke in der WG (Preis, Material, Qualität) verschieben die Marge gegenüber dem Start
  return mk ? m + mehrmarge(mk) + produktMargeDelta(s, pool, wg.id) : m;
}

function vorlaufPool(s: GameState, d: WgDef, art: Art, typ: OrderTyp, pool: string): number {
  if (pool !== FREMD) {
    const m = s.eigenmarken.marken.find((x) => x.id === pool);
    const v = m ? BESCHAFFUNG[m.beschaffung].vorlauf : 10;
    return typ === 'vororder' ? v + 2 : v;
  }
  return typ === 'vororder' ? d.vorlaufVor : typ === 'nachorder' ? d.vorlaufNach : d.vorlaufNos;
}

function mindestPool(s: GameState, d: WgDef, art: Art, pool: string): number {
  if (pool !== FREMD) {
    const m = s.eigenmarken.marken.find((x) => x.id === pool);
    return m ? BESCHAFFUNG[m.beschaffung].mindestabnahme : 0;
  }
  return art === 'nos' ? EK_PARAM.nosMindest : d.mindestabnahme;
}

function lieferantPool(s: GameState, d: WgDef, pool: string): string {
  if (pool === FREMD) return d.lieferant;
  const m = s.eigenmarken.marken.find((x) => x.id === pool);
  return m ? BESCHAFFUNG[m.beschaffung].produzent : d.lieferant;
}

/** Marken, die in einer WG Ware führen oder bekommen (aktiv, Aufbau, Neupositionierung). */
function markenInWg(s: GameState, wg: WgId): Eigenmarke[] {
  return s.eigenmarken.marken.filter((m) => m.status !== 'eingestellt' && ((m.wgAnteile[wg] ?? 0) > 0 || (m.wgIst[wg] ?? 0) > 0));
}

/** Nachfrageanteil eines Pools für die Disposition (nimmt den Zielanteil der Marken vorweg). */
function poolAnteilPlan(s: GameState, st: WgStand, pool: string): number {
  const marken = markenInWg(s, st.id);
  const anteil = (m: Eigenmarke): number => {
    const ist = st.pool[m.id] ?? 0;
    const eIst = m.wgIst[st.id] ?? 0;
    const eZiel = istVerkaufsaktiv(m) || m.status === 'aufbau' ? (m.wgAnteile[st.id] ?? 0) : 0;
    if (eIst > 0.001) return ist * (eZiel / eIst);
    return eZiel * 0.9;
  };
  if (pool !== FREMD) { const m = marken.find((x) => x.id === pool); return m ? anteil(m) : 0; }
  return Math.max(0, 1 - marken.reduce((a, m) => a + anteil(m), 0));
}

const artAnteil = (st: WgStand, art: Art): number => (art === 'nos' ? st.nosAnteil : 1 - st.nosAnteil);
const brutto = (art: Art): number => (art === 'nos' ? 1 / EK_PARAM.verfRef : 1 / EK_PARAM.saisonRef);

/** Prognose der Disposition: Bedarf EK eines Pools und einer Art in Woche t. */
export function prognoseEk(s: GameState, st: WgStand, art: Art, pool: string, t: number): number {
  const d = WG[st.id];
  return st.basisVK * wgSaison(d, t) * poolAnteilPlan(s, st, pool) * artAnteil(st, art) * brutto(art) * (1 - margeVon(s, st, art, pool)) * (1 + st.fehler);
}

/** Mittlerer Wochenbedarf EK ohne Saisonfaktor (Bezug für Präsentations- und Sicherheitsbestand). */
export function prognoseEkMittel(s: GameState, st: WgStand, art: Art, pool: string): number {
  return st.basisVK * poolAnteilPlan(s, st, pool) * artAnteil(st, art) * brutto(art) * (1 - margeVon(s, st, art, pool));
}

/** Bedarf, an dem der Bestand gemessen wird: Mittel aus aktuellem und mittlerem Wochenbedarf. */
const bezugsBedarf = (s: GameState, st: WgStand, art: Art, pool: string, t: number): number =>
  0.5 * (prognoseEk(s, st, art, pool, t) / (1 + st.fehler) + prognoseEkMittel(s, st, art, pool));

function prognoseVk(s: GameState, st: WgStand, art: Art, pool: string, t: number): number {
  return prognoseEk(s, st, art, pool, t) / Math.max(0.05, 1 - margeVon(s, st, art, pool));
}

/** Attraktivität des NOS-Mix: Abweichung vom gewachsenen Sortiment kostet etwas Nachfrage. */
function nosAttraktivitaet(d: WgDef, st: WgStand): number {
  const x = st.nosAnteil - d.nosAnteil;
  return 1 - 0.3 * Math.pow(Math.max(0, x), 1.3) - 0.2 * Math.pow(Math.max(0, -x), 1.3);
}

// ---------------------------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------------------------

/** Legt den Einkauf an und baut Bestand und Pipeline je WG auf (ersetzt die Bereichskohorten). */
export function erzeugeEinkauf(s: GameState): Einkauf {
  // Bei 560 Häusern erzeugte die reine Volumenskalierung über 18 manuelle
  // Freigaben je Woche. Der zusätzliche Maßstabsfaktor halbiert die Routinefälle;
  // die durch den Spieler veränderbare absolute Euro-Grenze bleibt erhalten.
  const basisJahr = Object.values(s.basisUmsatz).reduce((a, u) => a + (u ?? 0), 0) * 52;
  const volumenFaktor = Math.max(1, basisJahr / 3_100_000_000);
  const startGrenze = Math.round(EK_PARAM.grenze * volumenFaktor * 2 / 5_000) * 5_000;
  const e: Einkauf = { grenze: startGrenze, wgs: {}, freigaben: [], rng: (s.seed * 2654435761 + 97) >>> 0, zaehler: 0, protokoll: [], eigenUmsatz: [], markenKpi: {}, emJeBereich: {}, emStart: {} };
  for (const d of WG_DEF) {
    e.wgs[d.id] = {
      id: d.id, st: STANDARD_STEUERUNG(d), nosAnteil: d.nosAnteil, margeNos: d.margeNos, margeSaison: d.margeSaison, norm: 1,
      basisVK: 0, fehler: 0, pool: { [FREMD]: 1 }, limits: {}, saisons: {}, vororder: {}, v: leererVerlauf(),
    };
  }
  return e;
}

/**
 * Kalibriert Nachfragenorm und Margen auf die Ausgangslage und verteilt Bestand und Pipeline.
 * Danach gilt: Bereichsnachfrage, Wareneinsatz und Rohertrag der Startwoche wie ohne Einkaufsebene.
 */
export function initialisiereEinkauf(s: GameState): void {
  const e = s.einkauf;
  // 1. Nachfragenorm je WG (umsatzgewichtet über die Häuser) und Poolanteile
  const gewicht: Partial<Record<GruppeId, number>> = {};
  const x: Record<WgId, number> = {};
  const poolSum: Record<WgId, Record<string, number>> = {};
  for (const h of s.haeuser) {
    // Schwester- und FUNDUS-Häuser sind nur Stammdaten und nicht Teil der Einkaufsbasis.
    if (h.nurDaten) continue;
    for (const [g, P] of Object.entries(h.potenzial) as [GruppeId, number][]) {
      const qm = h.flaechen.filter((f) => f.gruppe === g && f.konzept === 'eigen').reduce((a, b) => a + b.qm, 0);
      if (qm <= 0) continue;
      const b = P * (1 - Math.exp(-qm / (h.saettigungQm[g] as number)));
      gewicht[g] = (gewicht[g] ?? 0) + b;
      for (const d of WG_JE_BEREICH[g] ?? []) {
        const marken = markenInWg(s, d.id).filter(istVerkaufsaktiv);
        let rest = 1;
        const ps = (poolSum[d.id] ??= {});
        for (const m of marken) {
          const em = m.wgIst[d.id] ?? 0;
          const a = em * Math.sqrt(attraktivitaet(s, m, h) * passungWg(m, d.id));
          ps[m.id] = (ps[m.id] ?? 0) + b * a;
          rest -= em;
        }
        ps[FREMD] = (ps[FREMD] ?? 0) + b * rest;
      }
    }
  }
  for (const d of WG_DEF) {
    const g = gewicht[d.bereich] ?? 0;
    const ps = poolSum[d.id] ?? { [FREMD]: 1 };
    const X = g > 0 ? Object.values(ps).reduce((a, b) => a + b, 0) / g : 1;
    x[d.id] = X;
    const st = e.wgs[d.id];
    st.norm = X;
    const sum = Object.values(ps).reduce((a, b) => a + b, 0) || 1;
    st.pool = Object.fromEntries(Object.entries(ps).map(([k, v]) => [k, v / sum]));
  }
  // 2. Margen: Fremdware so verschieben, dass die VK-gewichtete Marge je Bereich exakt der Bereichsmarge entspricht
  for (const [g, liste] of Object.entries(WG_JE_BEREICH) as [GruppeId, WgDef[]][]) {
    let m = 0;
    for (const d of liste) {
      const st = e.wgs[d.id];
      const n = st.nosAnteil;
      let mm = n * d.margeNos + (1 - n) * d.margeSaison;
      for (const [pool, a] of Object.entries(st.pool)) if (pool !== FREMD) {
        const mk = s.eigenmarken.marken.find((y) => y.id === pool);
        if (mk) mm += a * mehrmarge(mk);
      }
      m += d.anteil * mm;
    }
    const c = GRUPPEN[g].marge - m;
    for (const d of liste) { e.wgs[d.id].margeNos = d.margeNos + c; e.wgs[d.id].margeSaison = d.margeSaison + c; }
    // Eigenmarkenanteil je Bereich zum Start (Bezug für Kannibalisierung)
    let em = 0;
    const je: Record<string, number> = {};
    for (const d of liste) for (const [pool, a] of Object.entries(e.wgs[d.id].pool)) if (pool !== FREMD) { em += d.anteil * a; je[pool] = (je[pool] ?? 0) + d.anteil * a; }
    e.emStart[g] = em;
    e.emJeBereich[g] = je;
  }
  // 3. Nachfragebasis, Bestand und Pipeline je WG, Art und Pool (ersetzt die Bereichskohorten aus der Welt)
  const alter = [1, 5, 9, 14, 20, 30];
  const verteilung = [0.24, 0.22, 0.2, 0.15, 0.11, 0.08];
  const bestand: Kohorte[] = [];
  const bestellungen: Bestellung[] = [];
  const aktS = saisonId(0);
  const naechste = aktS + 1;
  for (const d of WG_DEF) {
    const st = e.wgs[d.id];
    st.basisVK = (s.basisUmsatz[d.bereich] ?? 0) * d.anteil;
    if (st.basisVK <= 0) continue;
    const ref = s.basisUmsatz[d.bereich] ?? 0;
    for (const art of ['nos', 'saison'] as Art[]) {
      for (const pool of Object.keys(st.pool)) {
        // Jahresmittel der Wochennachfrage EK (ohne Bruttoaufschlag, wie bisher 11 Wochen Reichweite)
        const wochenEk = ref * d.anteil * st.pool[pool] * artAnteil(st, art) * (1 - margeVon(s, st, art, pool));
        // Startreichweite: NOS 11 Wochen, Saison 1 Woche über dem Präsentationsbestand
        const rw = art === 'nos' ? 11 : EK_PARAM.praesentation + 1;
        let vorne = 0;
        for (let t = 0; t < rw; t++) vorne += wochenEk * wgSaison(d, t);
        const gesamt = Math.max(wochenEk * rw, vorne);
        verteilung.forEach((v, i) => bestand.push({
          gruppe: d.bereich, wg: d.id, art, marke: pool === FREMD ? undefined : pool, saisonId: art === 'saison' ? saisonVon(-alter[i]) : undefined,
          wert: eur(gesamt * v), alter: alter[i], saisonAnteil: art === 'saison' ? 1 : 0, kostenFaktor: 1,
        }));
        if (art === 'saison') verteilung.forEach((v, i) => { saisonTally(st, saisonVon(-alter[i])).eingang += gesamt * v; });
        // Pipeline: NOS laufend, Saison mit der bereits platzierten Vororder Frühjahr/Sommer
        if (art === 'nos') {
          const L = vorlaufPool(s, d, art, 'nos', pool);
          for (let t = 0; t < L; t++) bestellungen.push({ id: `b0-${d.id}-${pool}-n${t}`, gruppe: d.bereich, wg: d.id, art, marke: pool === FREMD ? undefined : pool, wert: eur(prognoseEk(s, st, art, pool, t)), ankunft: t, vorkasse: false });
        } else {
          const P = vororderWoche(s, d, pool, naechste);
          if (P < 0) {
            const f = vororderVorschlag(s, d, st, pool, naechste);
            for (const l of f) if (l.woche >= 0 && l.wert > 0) bestellungen.push({ id: `b0-${d.id}-${pool}-v${l.woche}`, gruppe: d.bereich, wg: d.id, art, marke: pool === FREMD ? undefined : pool, wert: eur(l.wert), ankunft: l.woche, vorkasse: false, saisonId: naechste });
            st.vororder[pool] = naechste;
            limitFuer(s, st, naechste).verbraucht += f.reduce((a, l) => a + l.wert, 0);
          }
          st.vororder[pool] = Math.max(st.vororder[pool] ?? aktS, aktS);
        }
      }
    }
  }
  s.bestand = bestand;
  s.bestellungen = bestellungen;
}

// ---------------------------------------------------------------------------------------------
// Open to Buy
// ---------------------------------------------------------------------------------------------

/**
 * Open to Buy einer Saison: Planbasis = Bedarf aller Pools über die 26 Saisonwochen nach der aktuellen Nachfragebasis
 * (wird wöchentlich fortgeschrieben, damit Schließungen und Nachfragerückgang das Limit senken).
 */
export function limitFuer(s: GameState, st: WgStand, sid: number): { plan: number; verbraucht: number } {
  const key = String(sid);
  let l = st.limits[key];
  if (!l) {
    l = st.limits[key] = { plan: 0, verbraucht: 0, stand: -1 };
    for (const k of Object.keys(st.limits)) if (Number(k) < sid - 2) delete st.limits[k];
  }
  if (l.stand !== s.woche) {
    let plan = 0;
    const a = saisonStart(sid);
    const pools = poolsDerWg(s, st);
    for (let t = a; t < a + 26; t++) for (const art of ['nos', 'saison'] as Art[]) for (const pool of pools) plan += prognoseEk(s, st, art, pool, t) / (1 + st.fehler);
    l.plan = eur(plan);
    l.stand = s.woche;
  }
  return l;
}

export const limitWert = (st: WgStand, l: { plan: number }): number => eur(st.st.limitEuro ?? l.plan * st.st.limitFaktor);

function poolsDerWg(s: GameState, st: WgStand): string[] {
  return [FREMD, ...markenInWg(s, st.id).map((m) => m.id)];
}

function offenImLimit(s: GameState, st: WgStand, sid: number): number {
  let x = 0;
  for (const f of s.einkauf.freigaben) if (f.wg === st.id) for (const l of f.lieferungen) if (saisonId(l.woche) === sid) x += l.wert;
  return x;
}

// ---------------------------------------------------------------------------------------------
// Nachfrage und Verbrauch (Wochentakt)
// ---------------------------------------------------------------------------------------------

/** Ergebnis der Nachfrageverteilung, wird vom Verbrauch genutzt. */
export interface EinkaufNachfrage {
  /** VK-Nachfrage je WG und Pool (vor NOS-Bruttoaufschlag). */
  vk: Record<WgId, Record<string, number>>;
  bruttoBereich: Partial<Record<GruppeId, number>>;
}

/**
 * Wendet Eigenmarken (Attraktivität, Passung je Haus) und NOS-Mix auf die Bruttonachfrage der Häuser an
 * und verteilt sie auf WG und Pools. Verändert roh[].eigen (brutto, umsatz) um den Faktor je Haus und Bereich.
 */
export function einkaufNachfrage(s: GameState, roh: HausRoh[]): EinkaufNachfrage {
  const w = s.woche;
  const vk: EinkaufNachfrage['vk'] = {};
  const bruttoBereich: Partial<Record<GruppeId, number>> = {};
  const markenJeWg: Record<WgId, { m: Eigenmarke; e: number; fit: number }[]> = {};
  for (const d of WG_DEF) {
    markenJeWg[d.id] = s.eigenmarken.marken.filter((m) => istVerkaufsaktiv(m) && (m.wgIst[d.id] ?? 0) > 0)
      .map((m) => ({ m, e: m.wgIst[d.id] ?? 0, fit: passungWg(m, d.id) * produktNachfrageFaktor(s, m.id, d.id) }));
  }
  const attrCache = new Map<string, number>();
  for (const r of roh) {
    const h = r.haus;
    for (const [g, v] of Object.entries(r.eigen) as [GruppeId, { brutto: number; umsatz: number }][]) {
      const liste = WG_JE_BEREICH[g];
      if (!liste) continue;
      let F = 0;
      // WG-Aktionen (src/marketing.ts): Nachfrage zur beworbenen WG verschieben, Bereichssumme bleibt (dort schon eingerechnet)
      const tilt = marketingWgTilt(s, h.id, g);
      const teile: [Record<string, number>, string, number][] | undefined = tilt ? [] : undefined;
      let F0 = 0;
      for (const d of liste) {
        const st = s.einkauf.wgs[d.id];
        const tl = tilt?.[d.id] ?? 1;
        const om = omega(d.id, w) * tl;
        const nAttr = nosAttraktivitaet(d, st);
        let rest = 1;
        const ziel = (vk[d.id] ??= {});
        for (const x of markenJeWg[d.id]) {
          const key = `${x.m.id}|${h.id}`;
          let A = attrCache.get(key);
          if (A === undefined) { A = attraktivitaet(s, x.m, h); attrCache.set(key, A); }
          // Nachfragewirkung gedämpft: Wurzel aus Attraktivität und WG-Passung
          const t = (v.brutto * om * x.e * Math.sqrt(A * x.fit) * nAttr) / st.norm;
          if (teile) teile.push([ziel, x.m.id, t]); else ziel[x.m.id] = (ziel[x.m.id] ?? 0) + t;
          F += t; F0 += t / tl;
          rest -= x.e;
        }
        const t = (v.brutto * om * Math.max(0, rest) * nAttr) / st.norm;
        if (teile) teile.push([ziel, FREMD, t]); else ziel[FREMD] = (ziel[FREMD] ?? 0) + t;
        F += t; F0 += t / tl;
      }
      if (teile) {
        const c = F > 0 ? F0 / F : 1;
        for (const [z, k, t] of teile) z[k] = (z[k] ?? 0) + t * c;
        F = F0;
      }
      const f = v.brutto > 0 ? F / v.brutto : 1;
      v.brutto *= f;
      v.umsatz *= f;
      bruttoBereich[g] = (bruttoBereich[g] ?? 0) + v.brutto;
    }
  }
  // Nachfragebasis der WG (saisonbereinigt) und Poolanteile fortschreiben
  const L = einkaufStufe(s);
  const sd = interpol(EK_PARAM.prognoseSd, L);
  for (const d of aktiveWg(s)) {
    const st = s.einkauf.wgs[d.id];
    const p = vk[d.id] ?? {};
    const D = Object.values(p).reduce((a, b) => a + b, 0);
    const S = Math.max(0.05, wgSaison(d, w));
    st.basisVK = 0.85 * st.basisVK + 0.15 * (D / S);
    if (D > 0) st.pool = Object.fromEntries(Object.entries(p).map(([k, x]) => [k, x / D]));
    if (!s.prognose) st.fehler = clamp(0.9 * st.fehler + sd * Math.sqrt(0.19) * normal(rngHalter(s)), -0.4, 0.4);
    // NOS-Anteil nähert sich dem Ziel
    const z = st.st.nosZiel;
    st.nosAnteil = st.nosAnteil < z ? Math.min(z, st.nosAnteil + EK_PARAM.nosTempo) : Math.max(z, st.nosAnteil - EK_PARAM.nosTempo);
  }
  return { vk, bruttoBereich };
}

interface VerbrauchWg { vkReal: number; ekVoll: number; ekGebucht: number; nosBrutto: number; nosReal: number; brutto: number; emVk: number; emEk: number; markenVk: Record<string, number>; markenEk: Record<string, number> }

/** Arbeitsstand der Woche je WG (nur zwischen Verbrauch und Buchung). */
let WOCHE: Record<WgId, VerbrauchWg & { ab: number }> = {};

type Topf = Kohorte[];

function toepfe(s: GameState): Map<string, Topf> {
  const m = new Map<string, Topf>();
  for (const k of s.bestand) {
    if (!k.wg) normalisiereKohorte(k);
    const key = `${k.wg}|${k.art}|${poolVon(k)}`;
    let t = m.get(key);
    if (!t) { t = []; m.set(key, t); }
    t.push(k);
  }
  for (const t of m.values()) t.sort((a, b) => b.alter - a.alter);
  return m;
}

/** Kohorten ohne WG (alte Spielstände, Sonderposten) der größten WG des Bereichs zuordnen. */
export function normalisiereKohorte(k: Kohorte): void {
  if (k.wg && k.art) return;
  const liste = WG_JE_BEREICH[k.gruppe] ?? [];
  const d = liste.reduce((a, b) => (b.anteil > a.anteil ? b : a), liste[0]);
  k.wg = d?.id ?? `${k.gruppe}.?`;
  k.art = k.saisonAnteil >= 0.5 || !d ? 'saison' : 'saison';
}

const istAlt = (k: Kohorte): boolean => !!k.ladenhueter || (k.art === 'nos' ? k.alter > EK_PARAM.altNos : k.alter > EK_PARAM.altSaison);

/** Nimmt bis zu `menge` (EK voll) aus einem Topf, älteste zuerst; altMax begrenzt den Anteil aus Altware. */
export function saisonTally(st: WgStand, sid: number): { eingang: number; abverkauf: number } {
  const key = String(sid);
  let x = st.saisons[key];
  if (!x) {
    x = st.saisons[key] = { eingang: 0, abverkauf: 0 };
    for (const k of Object.keys(st.saisons)) if (Number(k) < sid - 1) delete st.saisons[k];
  }
  return x;
}

function nimm(topf: Topf | undefined, menge: number, altMax: number, saisonAkt: number, st: WgStand | undefined): { voll: number; gebucht: number; alt: number } {
  let voll = 0; let gebucht = 0; let altG = 0;
  if (!topf || menge <= 0) return { voll, gebucht, alt: 0 };
  let altRest = altMax;
  for (const k of topf) {
    if (voll >= menge) break;
    if (k.ladenhueter || k.wert <= 0) continue;
    const alt = istAlt(k);
    let x = Math.min(k.wert, menge - voll);
    if (alt) { x = Math.min(x, altRest); altRest -= x; altG += Math.max(0, x); }
    if (x <= 0) continue;
    k.wert -= x;
    voll += x;
    gebucht += x * k.kostenFaktor;
    if (st && k.art === 'saison' && k.saisonId !== undefined && k.saisonId >= saisonAkt) saisonTally(st, k.saisonId).abverkauf += x;
  }
  return { voll, gebucht, alt: altG };
}

function verfuegbar(topf: Topf | undefined): { frisch: number; alt: number } {
  let frisch = 0; let alt = 0;
  for (const k of topf ?? []) { if (k.ladenhueter) continue; if (istAlt(k)) alt += k.wert; else frisch += k.wert; }
  return { frisch, alt };
}

/**
 * Verbrauch je WG, Art und Pool. NOS: Verfügbarkeit nach Servicegrad und Deckung. Saison: wie bisher nach
 * Reichweite, Altware nur bis zur Quote der Reduzierungsstrategie. Fehlende Eigenmarkenware weicht teils auf Fremdware aus.
 * Gibt je Bereich die Verfügbarkeit (realisierter VK zu Bruttonachfrage) und den gebuchten Wareneinsatz zurück.
 */
export function einkaufVerbrauch(s: GameState, n: EinkaufNachfrage): { verfuegbar: Partial<Record<GruppeId, number>>; einsatz: Partial<Record<GruppeId, number>> } {
  const w = s.woche;
  const toepfeMap = toepfe(s);
  const verf: Partial<Record<GruppeId, number>> = {};
  const einsatz: Partial<Record<GruppeId, number>> = {};
  const vkReal: Partial<Record<GruppeId, number>> = {};
  const Lst = einkaufStufe(s);
  const bonus = interpol(EK_PARAM.verfBonus, Lst);
  const sAkt = saisonId(w);
  WOCHE = {};
  for (const d of aktiveWg(s)) {
    const st = s.einkauf.wgs[d.id];
    const p = n.vk[d.id] ?? {};
    const r: VerbrauchWg & { ab: number } = { vkReal: 0, ekVoll: 0, ekGebucht: 0, nosBrutto: 0, nosReal: 0, brutto: 0, emVk: 0, emEk: 0, markenVk: {}, markenEk: {}, ab: 0 };
    const red = EK_PARAM.abschrift[st.st.reduzierung];
    // Sale-Aktionen im Aktionskalender erlauben mehr Altware in der Saisonnachfrage (src/marketing.ts, Ausgangslage = 1)
    const capM = Math.min(1, red.cap * marketingAltwareFaktor(s, d.bereich, d.id));
    const sg = EK_PARAM.servicegrad[st.st.servicegrad];
    for (const art of ['nos', 'saison'] as Art[]) {
      const pools = Object.keys(p).sort((a, b) => (a === FREMD ? 1 : b === FREMD ? -1 : a.localeCompare(b))); // Marken zuerst, Fremdware zuletzt
      let ausweichVk = 0;
      for (const pool of pools) {
        const m = margeVon(s, st, art, pool);
        const vkBedarf = (p[pool] ?? 0) * artAnteil(st, art) * brutto(art) * (art === 'saison' ? red.nachfrage : 1);
        const ekBedarf = vkBedarf * (1 - m);
        const topf = toepfeMap.get(`${d.id}|${art}|${pool}`);
        const v = verfuegbar(topf);
        let quote: number;
        if (art === 'nos') {
          const bedarfW = Math.max(1, bezugsBedarf(s, st, art, pool, w));
          const x = (v.frisch + v.alt) / (bedarfW * sg.cover);
          const g = x >= 1 ? 1 : (1 - Math.exp(-3 * x)) / (1 - Math.exp(-3));
          const rausch = s.prognose ? 0 : zwischen(rngHalter(s), -0.01, 0.01);
          quote = clamp((sg.basis + bonus + rausch) * g, 0, 1);
        } else {
          const nutzbar = v.frisch + Math.min(v.alt, ekBedarf * capM);
          const rw = nutzbar / Math.max(1, bezugsBedarf(s, st, art, pool, w));
          quote = Math.min(1, Math.sqrt(clamp(rw / EK_PARAM.praesentation, 0, 1)));
        }
        let ziel = ekBedarf * quote;
        let extraVk = 0;
        if (pool === FREMD && ausweichVk > 0) { extraVk = ausweichVk; ziel += ausweichVk * (1 - m) * quote; }
        const x = nimm(topf, ziel, ekBedarf * (art === 'saison' ? capM : 1), sAkt, st);
        if (art === 'saison' && x.alt > 0) marketingAltVerkauf(s, d.bereich, x.alt, d.id);
        const vkR = x.voll / Math.max(0.05, 1 - m);
        if (pool !== FREMD) {
          ausweichVk += Math.max(0, vkBedarf * quote - vkR) * EK_PARAM.substitution + vkBedarf * (1 - quote) * 0;
          r.emVk += vkR; r.emEk += x.gebucht;
          r.markenVk[pool] = (r.markenVk[pool] ?? 0) + vkR;
          r.markenEk[pool] = (r.markenEk[pool] ?? 0) + x.gebucht;
        }
        r.vkReal += vkR; r.ekVoll += x.voll; r.ekGebucht += x.gebucht;
        r.brutto += vkBedarf + extraVk * 0;
        if (art === 'nos') { r.nosBrutto += vkBedarf; r.nosReal += vkR; }
      }
    }
    WOCHE[d.id] = r;
    einsatz[d.bereich] = (einsatz[d.bereich] ?? 0) + r.ekGebucht;
    vkReal[d.bereich] = (vkReal[d.bereich] ?? 0) + r.vkReal;
  }
  for (const [g, b] of Object.entries(n.bruttoBereich) as [GruppeId, number][]) verf[g] = b > 0 ? (vkReal[g] ?? 0) / b : 1;
  s.bestand = s.bestand.filter((k) => k.wert > 0.5);
  return { verfuegbar: verf, einsatz };
}

/** Alterung und Abschriften je Kohorte nach Art und Reduzierungsstrategie der WG. */
export function einkaufAltern(s: GameState): number {
  let ab = 0;
  const K = EK_PARAM.abschriftK;
  for (const k of s.bestand) {
    if (!k.wg) normalisiereKohorte(k);
    k.alter += 1;
    let q = 0;
    if (k.ladenhueter) q = 0.06;
    else if (k.art === 'nos') q = k.alter > EK_PARAM.altNos ? 0.04 : 0;
    else {
      const st = s.einkauf.wgs[k.wg as WgId];
      const r = EK_PARAM.abschrift[st?.st.reduzierung ?? 'normal'];
      if (k.alter > 39) q = 0.08;
      else if (k.alter > 26) q = r.spaet;
      else if (k.alter > EK_PARAM.altSaison) q = r.alt;
      else if (k.alter > r.ab) q = r.frisch;
      q *= K;
    }
    const x = k.wert * q;
    k.wert -= x;
    const y = x * k.kostenFaktor;
    ab += y;
    const wk = WOCHE[k.wg as WgId];
    if (wk) wk.ab += y;
  }
  s.bestand = s.bestand.filter((k) => k.wert > 0.5);
  return ab;
}

/** Offprice: zieht Altware (Saison älter 16, NOS älter 52 Wochen, Ladenhüter) eines Formats. */
export function verbraucheAltwareWg(s: GameState, f: Format, wertVoll: number): { gebucht: number; zukauf: number } {
  let rest = wertVoll;
  let gebucht = 0;
  const ks = s.bestand.filter((k) => GRUPPEN[k.gruppe].format === f && istAlt(k)).sort((a, b) => b.alter - a.alter);
  for (const k of ks) {
    if (rest <= 0) break;
    const nimmX = Math.min(k.wert, rest);
    k.wert -= nimmX;
    rest -= nimmX;
    gebucht += nimmX * k.kostenFaktor;
  }
  s.bestand = s.bestand.filter((k) => k.wert > 0.5);
  return { gebucht, zukauf: rest };
}

/** Bucht die Wochenwerte je WG (Umsatz nach Aktionen auf die WG verteilt) und je Marke. */
export function einkaufBuchen(s: GameState, umsatzEigen: Partial<Record<GruppeId, number>>): Record<string, number> {
  const e = s.einkauf;
  const vkBereich: Partial<Record<GruppeId, number>> = {};
  for (const d of WG_DEF) { const r = WOCHE[d.id]; if (r) vkBereich[d.bereich] = (vkBereich[d.bereich] ?? 0) + r.vkReal; }
  const best: Record<WgId, number> = {};
  for (const k of s.bestand) if (k.wg) best[k.wg] = (best[k.wg] ?? 0) + k.wert;
  const markenU: Record<string, number> = {};
  const markenR: Record<string, number> = {};
  const emBereich: Partial<Record<GruppeId, Record<string, number>>> = {};
  let gesamt = 0;
  for (const d of aktiveWg(s)) {
    const st = e.wgs[d.id];
    const r = WOCHE[d.id] ?? { vkReal: 0, ekVoll: 0, ekGebucht: 0, nosBrutto: 0, nosReal: 0, brutto: 0, emVk: 0, emEk: 0, markenVk: {}, markenEk: {}, ab: 0 };
    const vb = vkBereich[d.bereich] ?? 0;
    const k = vb > 0 ? (umsatzEigen[d.bereich] ?? 0) / vb : 0;
    const u = r.vkReal * k;
    gesamt += u;
    const v = st.v;
    v.w.push(s.woche); v.u.push(eur(u)); v.e.push(eur(r.ekGebucht)); v.a.push(eur(r.ab));
    v.r.push(eur(u - r.ekGebucht - r.ab)); v.b.push(eur(best[d.id] ?? 0));
    v.f.push(eur(Math.max(0, r.brutto - r.vkReal) * k)); v.n.push(r.nosBrutto > 0 ? Math.round((r.nosReal / r.nosBrutto) * 1000) / 1000 : 1);
    v.eu.push(eur(r.emVk * k)); v.er.push(eur(r.emVk * k - r.emEk)); v.nd.push(eur(r.brutto * k));
    for (const key of Object.keys(v) as (keyof WgVerlauf)[]) if (v[key].length > EK_PARAM.verlauf) v[key].splice(0, v[key].length - EK_PARAM.verlauf);
    const je = (emBereich[d.bereich] ??= {});
    for (const [m, x] of Object.entries(r.markenVk)) {
      markenU[m] = (markenU[m] ?? 0) + x * k;
      markenR[m] = (markenR[m] ?? 0) + x * k - (r.markenEk[m] ?? 0);
      je[m] = (je[m] ?? 0) + x * k;
    }
  }
  for (const [g, je] of Object.entries(emBereich) as [GruppeId, Record<string, number>][]) {
    const ub = umsatzEigen[g] ?? 0;
    e.emJeBereich[g] = Object.fromEntries(Object.entries(je).map(([m, x]) => [m, ub > 0 ? x / ub : 0]));
  }
  e.eigenUmsatz.push(eur(gesamt));
  if (e.eigenUmsatz.length > 52) e.eigenUmsatz.splice(0, e.eigenUmsatz.length - 52);
  for (const m of s.eigenmarken.marken) {
    const kz = (e.markenKpi[m.id] ??= { u: [], r: [] });
    kz.u.push(eur(markenU[m.id] ?? 0)); kz.r.push(eur(markenR[m.id] ?? 0));
    if (kz.u.length > 52) { kz.u.splice(0, kz.u.length - 52); kz.r.splice(0, kz.r.length - 52); }
  }
  return markenU;
}

/** Eigenmarkenanteil je Bereich über dem Startwert (für WKZ und Lieferantenvertrauen). */
export function kannibalisierung(s: GameState, g: GruppeId): number {
  const je = s.einkauf.emJeBereich[g] ?? {};
  const em = Object.values(je).reduce((a, b) => a + b, 0);
  return Math.max(0, em - (s.einkauf.emStart[g] ?? 0));
}

// ---------------------------------------------------------------------------------------------
// Wareneingang
// ---------------------------------------------------------------------------------------------

/** Legt angekommene Ware als Kohorte an (je WG, Art, Marke; gleiche Woche wird zusammengelegt). */
export function einbuchen(s: GameState, b: Bestellung, wert: number): void {
  const wg = b.wg ?? (WG_JE_BEREICH[b.gruppe]?.[0]?.id);
  const art: Art = b.art ?? 'saison';
  const sid = art === 'saison' ? saisonVon(s.woche) : undefined;
  const kf = b.kostenFaktor ?? 1;
  const vorh = s.bestand.find((k) => k.alter === 0 && k.wg === wg && k.art === art && k.marke === b.marke && k.kostenFaktor === kf && !k.ladenhueter && k.saisonId === sid);
  const em = b.marke ? s.eigenmarken.marken.find((m) => m.id === b.marke) : undefined;
  if (vorh) vorh.wert += eur(wert);
  else s.bestand.push({ gruppe: b.gruppe, wg, art, marke: b.marke, saisonId: sid, wert: eur(wert), alter: 0, saisonAnteil: art === 'saison' ? 1 : 0, kostenFaktor: kf, ladenhueter: em?.status === 'eingestellt' ? true : undefined });
  const st = wg ? s.einkauf.wgs[wg] : undefined;
  if (st && art === 'saison' && sid !== undefined) saisonTally(st, sid).eingang += wert;
}

// ---------------------------------------------------------------------------------------------
// Disposition: NOS wöchentlich, Nachorder alle 4 Wochen, Vororder zweimal im Jahr
// ---------------------------------------------------------------------------------------------

interface Vorschlag { d: WgDef; st: WgStand; art: Art; typ: OrderTyp; pool: string; lieferungen: Lieferung[]; wochenBedarf: number; hinweis?: string; lieferant?: string }

function bestandPool(s: GameState, wg: WgId, art: Art, pool: string, nurNutzbar: boolean): number {
  let x = 0;
  for (const k of s.bestand) if (k.wg === wg && k.art === art && poolVon(k) === pool && !k.ladenhueter) {
    if (nurNutzbar && art === 'saison' && istAlt(k)) x += k.wert * 0.3;
    else x += k.wert;
  }
  return x;
}

function pipelinePool(s: GameState, wg: WgId, art: Art, pool: string, bis = Infinity): number {
  let x = 0;
  for (const b of s.bestellungen) if (b.wg === wg && b.art === art && (b.marke ?? FREMD) === pool && b.ankunft <= bis) x += b.wert;
  for (const f of s.einkauf.freigaben) if (f.wg === wg && f.art === art && (f.marke ?? FREMD) === pool) for (const l of f.lieferungen) if (l.woche <= bis) x += l.wert;
  return x;
}

/** Weitere Lieferanten je Bereich (fiktiv); die Vororder einer WG geht anteilig an Haupt- und Zweitlieferanten. */
const ZWEIT: Partial<Record<GruppeId, string[]>> = {
  damen: ['Moda Lucca', 'Hanse Fashion Group', 'Vestis Textil', 'Rieger & Kolb'],
  herren: ['Nordkap Menswear', 'Castell Herrenmode', 'Bergmann Konfektion'],
  waesche: ['Corsina', 'Nachtfalter Wäsche', 'Feinstrick Plauen'],
  accessoires: ['Riva Calzature', 'Lederwerk Hanau', 'Chronos Uhrenvertrieb'],
  kinder: ['Wolkenweich', 'Rasselbande Kids', 'Golden Thread'],
  wohnen: ['Porzellanmanufaktur Selbtal', 'Webhaus Nordhorn', 'Lichtform'],
  beauty: ['Belcourt Paris', 'Rheinpharm Vertrieb', 'Aurelia Cosmetics'],
  food: ['Kaffeerösterei Hafenblick', 'Hanseatische Feinkost', 'Weinkontor Rheingau'],
  spielwaren: ['Klötzchen & Co.', 'Kinderwelt Lizenz', 'Spielwerk Fürth'],
  sport: ['Fitwerk Sportgeräte', 'Athletika', 'Nordline'],
  sportschuhe: ['Athletika', 'Stridewell'], sporttextil: ['Athletika', 'Stridewell'], outdoor: ['Bergpfad Outdoor', 'Nordline'],
  rad: ['Kettenblatt Parts', 'Velo Rheinland'], wintersport: ['Gipfelwerk', 'Nordline'], teamsport: ['Athletika', 'Stridewell'],
};

/** Lieferantenaufteilung der Vororder: Hauptlieferant 55 %, zwei weitere 30 und 15 %. */
export function lieferantenSplit(d: WgDef): [string, number][] {
  const z = (ZWEIT[d.bereich] ?? []).filter((n) => n !== d.lieferant);
  const i = WG_DEF.indexOf(d);
  if (z.length < 2) return [[d.lieferant, 1]];
  return [[d.lieferant, 0.55], [z[i % z.length], 0.3], [z[(i + 1) % z.length], 0.15]];
}

/** Woche der Vororder einer Saison: Orderrunde rund 30 Wochen vor Saisonstart (über 4 Wochen gestaffelt), bei langem Vorlauf früher. */
export function vororderWoche(s: GameState, d: WgDef, pool: string, sid: number): number {
  const lead = vorlaufPool(s, d, 'saison', 'vororder', pool);
  const spaetestens = saisonStart(sid) + EK_PARAM.vororderSpanne[0] - lead;
  const runde = saisonStart(sid) - EK_PARAM.orderrunde + (WG_DEF.indexOf(d) % 4);
  return Math.min(runde, spaetestens);
}

function vororderVorschlag(s: GameState, d: WgDef, st: WgStand, pool: string, sid: number): Lieferung[] {
  const a = saisonStart(sid);
  const lead = vorlaufPool(s, d, 'saison', 'vororder', pool);
  let vq = st.st.vororderquote;
  if (pool !== FREMD && lead > 12) vq = Math.max(vq, 0.95); // lange Vorläufe: keine Nachorder möglich
  const level = s.orderLevel[d.bereich] ?? 1;
  let saisonBedarf = 0;
  for (let t = a; t < a + 26; t++) saisonBedarf += prognoseEk(s, st, 'saison', pool, t);
  const gesamt = vq * saisonBedarf * level * (1 + interpol(EK_PARAM.optimismus, einkaufStufe(s)));
  const [v0, v1] = EK_PARAM.vororderSpanne;
  const gew: number[] = [];
  for (let t = a + v0; t <= a + v1; t++) gew.push(Math.max(0.01, prognoseEk(s, st, 'saison', pool, t + 2)));
  const sum = gew.reduce((x, y) => x + y, 0);
  return gew.map((g, i) => ({ woche: a + v0 + i, wert: (gesamt * g) / sum }));
}

function vorschlaege(s: GameState): Vorschlag[] {
  const w = s.woche;
  const out: Vorschlag[] = [];
  const idx = new Map(WG_DEF.map((d, i) => [d.id, i]));
  const sAkt = saisonId(w);
  for (const d of aktiveWg(s)) {
    const st = s.einkauf.wgs[d.id];
    if (st.basisVK <= 1) continue;
    const level = s.orderLevel[d.bereich] ?? 1;
    const sg = EK_PARAM.servicegrad[st.st.servicegrad];
    const sdZusatz = interpol(EK_PARAM.prognoseSd, einkaufStufe(s)) / 0.07 - 1;
    for (const pool of poolsDerWg(s, st)) {
      const m = pool === FREMD ? undefined : s.eigenmarken.marken.find((x) => x.id === pool);
      // Marken im Aufbau ordern erst so, dass die Ware zum Start da ist
      const bereit = (L: number) => !m || istVerkaufsaktiv(m) || (m.status === 'aufbau' && (m.bis ?? 0) <= w + L);
      // NOS
      {
        const L = vorlaufPool(s, d, 'nos', 'nos', pool);
        if (bereit(L) && artAnteil(st, 'nos') > 0.005) {
          let ziel = 0;
          for (let t = w + 1; t <= w + L; t++) ziel += prognoseEk(s, st, 'nos', pool, t);
          const wb = prognoseEk(s, st, 'nos', pool, w + L);
          const bez = 0.5 * (wb + prognoseEkMittel(s, st, 'nos', pool) * (1 + st.fehler));
          ziel += wb + (sg.cover + Math.max(0, sdZusatz) * 0.5 + (L > 8 ? 0.08 * L : 0)) * bez;
          // Der Einkaufsregler wirkt auf NOS nur gedämpft: der Servicegrad bestimmt den Sicherheitsbestand
          const order = ziel * (1 + (level - 1) * 0.3) - bestandPool(s, d.id, 'nos', pool, false) - pipelinePool(s, d.id, 'nos', pool);
          const min = mindestPool(s, d, 'nos', pool);
          if (order > Math.max(1000, min) || (order > 0 && order > 0.3 * min && bestandPool(s, d.id, 'nos', pool, false) < 0.7 * ziel)) {
            out.push({ d, st, art: 'nos', typ: 'nos', pool, lieferungen: [{ woche: w + L, wert: Math.max(order, min) }], wochenBedarf: wb });
          }
        }
      }
      if (artAnteil(st, 'saison') <= 0.005) continue;
      // Vororder für die nächste Saison (oder nachgeholt für die laufende, wenn die Marke neu ist)
      for (const sid of [sAkt + 2, sAkt + 1, sAkt]) {
        if ((st.vororder[pool] ?? -99) >= sid) continue;
        const lead = vorlaufPool(s, d, 'saison', 'vororder', pool);
        const P = vororderWoche(s, d, pool, sid);
        const spaet = w > P;
        if (w < P) continue;
        if (spaet && w - saisonStart(sid) > 10) { st.vororder[pool] = sid; continue; }
        if (!bereit(lead)) continue;
        let lief = vororderVorschlag(s, d, st, pool, sid);
        if (spaet) lief = lief.filter((l) => l.woche >= w + lead).map((l) => l);
        if (spaet && lief.length === 0) { st.vororder[pool] = sid; continue; }
        const min = mindestPool(s, d, 'saison', pool);
        const sum = lief.reduce((a, l) => a + l.wert, 0);
        if (sum < min && sum > 0) lief = lief.map((l) => ({ ...l, wert: (l.wert * min) / sum }));
        st.vororder[pool] = sid;
        if (sum > 0) {
          const wb = prognoseEk(s, st, 'saison', pool, saisonStart(sid));
          const hinweis = spaet ? 'Erstausstattung' : `Orderrunde ${saisonName(s, sid)}`;
          // Fremdware: je Lieferant eine Order; Eigenmarke: eine Order beim Produzenten
          const split: [string | undefined, number][] = pool === FREMD ? lieferantenSplit(d) : [[undefined, 1]];
          for (const [lieferant, a] of split) out.push({ d, st, art: 'saison', typ: 'vororder', pool, lieferungen: lief.map((l) => ({ woche: l.woche, wert: l.wert * a })), wochenBedarf: wb * a, hinweis, lieferant });
        }
      }
      // Nachorder alle 4 Wochen, gestaffelt nach WG
      if (((w + (idx.get(d.id) ?? 0)) % 4) === 0) {
        const L = vorlaufPool(s, d, 'saison', 'nachorder', pool);
        const a = w + L;
        if (bereit(L) && L <= 12) {
          let ziel = 0;
          for (let t = w + 1; t <= a + 4; t++) ziel += prognoseEk(s, st, 'saison', pool, t);
          for (let t = a + 5; t <= a + 4 + EK_PARAM.saisonCover; t++) ziel += prognoseEk(s, st, 'saison', pool, t);
          const order = ziel * level * (1 + interpol(EK_PARAM.optimismus, einkaufStufe(s))) - bestandPool(s, d.id, 'saison', pool, true) - pipelinePool(s, d.id, 'saison', pool, a + 4);
          if (order > mindestPool(s, d, 'saison', pool)) out.push({ d, st, art: 'saison', typ: 'nachorder', pool, lieferungen: [{ woche: a, wert: order }], wochenBedarf: prognoseEk(s, st, 'saison', pool, a) });
        }
      }
    }
  }
  return out;
}

const neueFreigabeId = (s: GameState): string => `o${++s.einkauf.zaehler}`;

function protokoll(s: GameState): FreigabeProtokoll {
  const p = s.einkauf.protokoll;
  let x = p[p.length - 1];
  if (!x || x.woche !== s.woche) {
    x = { woche: s.woche, neu: 0, direkt: 0, freigegeben: 0, auto: 0, verfallen: 0, verfallenWert: 0, abgelehnt: 0 };
    p.push(x);
    if (p.length > 26) p.splice(0, p.length - 26);
  }
  return x;
}

/** Disposition der Woche: Vorschläge, Open to Buy, Freigabegrenze. */
export function einkaufDispo(s: GameState): void {
  const w = s.woche;
  // Die Beschaffungsbasis muss der tatsächlichen Nachfrageentwicklung folgen.
  // Vorher blieb sie auf dem Startportfolio stehen; nach Schließungen entstanden
  // überdimensionierte Orders, Bestandsüberhänge und zusätzliche Liquiditätslast.
  // s.basisUmsatz wird in engine.ts vor der Disposition aus der Bruttonachfrage
  // fortgeschrieben und ist bewusst unabhängig vom aktuellen Warenfehlbestand.
  for (const d of aktiveWg(s)) {
    s.einkauf.wgs[d.id].basisVK = Math.max(0, (s.basisUmsatz[d.bereich] ?? 0) * d.anteil);
  }
  const pr = protokoll(s);
  for (const v of vorschlaege(s)) {
    let lief = v.lieferungen.filter((l) => l.wert > 0);
    // Open to Buy je Saison der Liefertermine
    let ueber = false;
    const jeSaison = new Map<number, number>();
    for (const l of lief) jeSaison.set(saisonId(l.woche), (jeSaison.get(saisonId(l.woche)) ?? 0) + l.wert);
    // NOS-Nachschub zählt aufs Limit, wird aber nicht gekürzt (sonst fehlen die Dauerartikel); gekürzt wird die Saisonware
    if (v.typ !== 'nos') for (const [sid, x] of jeSaison) {
      const L = limitFuer(s, v.st, sid);
      const frei = Math.max(0, limitWert(v.st, L) - L.verbraucht - offenImLimit(s, v.st, sid));
      if (x > frei + 1) {
        ueber = true;
        const k = frei / x;
        lief = lief.map((l) => (saisonId(l.woche) === sid ? { ...l, wert: l.wert * k } : l));
      }
    }
    lief = lief.filter((l) => l.wert >= 1).map((l) => ({ woche: l.woche, wert: eur(l.wert) }));
    const wert = lief.reduce((a, l) => a + l.wert, 0);
    if (wert < 1000) continue;
    const f: Freigabe = {
      id: neueFreigabeId(s), wg: v.d.id, art: v.art, typ: v.typ, lieferant: v.lieferant ?? lieferantPool(s, v.d, v.pool), marke: v.pool === FREMD ? undefined : v.pool,
      wert, lieferungen: lief, erwarteterAbverkauf: 0, reichweiteDanach: 0, erstellt: w, frist: w + EK_PARAM.frist[v.typ], ueberLimit: ueber,
      hinweis: [v.hinweis, ueber ? 'vom Limit gekürzt' : undefined].filter(Boolean).join(', ') || undefined,
    };
    const ab = lief[0].woche;
    let vk8 = 0; let ek8 = 0;
    for (let t = ab; t < ab + 8; t++) { vk8 += prognoseVk(s, v.st, v.art, v.pool, t); ek8 += prognoseEk(s, v.st, v.art, v.pool, t); }
    f.erwarteterAbverkauf = eur(vk8);
    f.reichweiteDanach = Math.round(((bestandPool(s, v.d.id, v.art, v.pool, false) + pipelinePool(s, v.d.id, v.art, v.pool) + wert) / Math.max(1, ek8 / 8)) * 10) / 10;
    // NOS-Nachschub läuft automatisch; in den Eingang kommt nur eine Sonderorder (hoher Einzelwert und deutlich über dem Wochenbedarf)
    const pflichtig = v.typ === 'nos'
      ? wert >= EK_PARAM.nosGrenzeFaktor * s.einkauf.grenze && wert > EK_PARAM.nosSonder * v.wochenBedarf
      : wert >= s.einkauf.grenze;
    pr.neu++;
    if (pflichtig) s.einkauf.freigaben.push(f);
    else { pr.direkt++; gebeFrei(s, f); }
  }
}

/** Bestellt eine Order (alle Liefertermine) und bucht sie aufs Limit. */
function gebeFrei(s: GameState, f: Freigabe): void {
  const st = s.einkauf.wgs[f.wg];
  const d = WG[f.wg];
  const lid = LIEFERANTEN.find((l) => l.name === f.lieferant)?.id;
  for (const l of f.lieferungen) {
    const woche = Math.max(l.woche, s.woche + 1);
    s.bestellungen.push({ id: `b${f.id}-${woche}`, gruppe: d.bereich, wg: f.wg, art: f.art, marke: f.marke, wert: l.wert, ankunft: woche, vorkasse: false, lieferantId: lid, saisonId: saisonVon(woche) });
    limitFuer(s, st, saisonId(woche)).verbraucht += l.wert;
  }
}

/** Fristablauf im Freigabe-Eingang: auto gibt frei, verfall streicht die Order. Läuft zu Wochenbeginn. */
export function einkaufFristen(s: GameState): void {
  const w = s.woche;
  const pr = protokoll(s);
  // Bereiche, die es nicht mehr gibt (Sportverkauf), fallen heraus
  s.einkauf.freigaben = s.einkauf.freigaben.filter((f) => s.basisUmsatz[WG[f.wg].bereich] !== undefined);
  const faellig = s.einkauf.freigaben.filter((f) => f.frist < w);
  if (!faellig.length) return;
  s.einkauf.freigaben = s.einkauf.freigaben.filter((f) => f.frist >= w);
  let verfallen = 0; let wert = 0;
  for (const f of faellig) {
    const modus = s.einkauf.wgs[f.wg].st.modus[f.art];
    if (modus === 'auto' || s.prognose) { gebeFrei(s, f); pr.auto++; }
    else { verfallen++; wert += f.wert; pr.verfallen++; pr.verfallenWert += f.wert; }
  }
  if (verfallen) melde(s, 'warnung', `${verfallen} Orders über ${mio(wert)} sind ohne Freigabe verfallen. Die Ware fehlt in den Häusern.`);
}

// ---------------------------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------------------------

export interface FreigabeFilter { bereich?: GruppeId; wg?: WgId; art?: Art; typ?: OrderTyp; marke?: string; bisWert?: number; fristBis?: number }

export type EinkaufAktion =
  | { typ: 'wgLimit'; wg: WgAuswahl; faktor?: number; euro?: number | null }
  | { typ: 'wgNosZiel'; wg: WgAuswahl; anteil: number }
  | { typ: 'wgServicegrad'; wg: WgAuswahl; ziel: Servicegrad }
  | { typ: 'wgVororderquote'; wg: WgAuswahl; quote: number }
  | { typ: 'wgReduzierung'; wg: WgAuswahl; strategie: Reduzierung }
  | { typ: 'wgFreigabeModus'; wg: WgAuswahl; art: Art | 'beide'; modus: FreigabeModus }
  | { typ: 'freigeben'; ids: string[] }
  | { typ: 'freigabeAblehnen'; ids: string[] }
  | { typ: 'freigabeKuerzen'; id: string; prozent: number; freigeben?: boolean }
  | { typ: 'sammelfreigabe'; filter?: FreigabeFilter }
  | { typ: 'freigabeGrenze'; euro: number }
  | { typ: 'eigenmarkeGruenden'; entwurf: EigenmarkeEntwurf }
  | { typ: 'eigenmarkeNeupositionieren'; marke: string; neu: NonNullable<Eigenmarke['neu']> }
  | { typ: 'eigenmarkeEinstellen'; marke: string }
  | { typ: 'eigenmarkeAnteil'; marke: string; wg: WgId; anteil: number }
  | { typ: 'eigenmarkeSetzen'; marke: string; budgetWoche?: number; qualitaet?: number; beschaffung?: Beschaffung };

export const EINKAUF_AKTIONEN = new Set<string>(['wgLimit', 'wgNosZiel', 'wgServicegrad', 'wgVororderquote', 'wgReduzierung', 'wgFreigabeModus', 'freigeben', 'freigabeAblehnen', 'freigabeKuerzen', 'sammelfreigabe', 'freigabeGrenze', 'eigenmarkeGruenden', 'eigenmarkeNeupositionieren', 'eigenmarkeEinstellen', 'eigenmarkeAnteil', 'eigenmarkeSetzen']);

export function wgAuswahl(s: GameState, a: WgAuswahl): WgDef[] {
  if (a === 'alle') return aktiveWg(s);
  if (WG[a]) return [WG[a]];
  return (WG_JE_BEREICH[a as GruppeId] ?? []).filter((d) => s.basisUmsatz[d.bereich] !== undefined);
}

const auswahlText = (a: WgAuswahl, n: number): string => (a === 'alle' ? `alle ${n} Warengruppen` : WG[a] ? WG[a].name : `${GRUPPEN[a as GruppeId]?.name ?? a} (${n} Warengruppen)`);

function passtFilter(f: Freigabe, x: FreigabeFilter | undefined): boolean {
  if (!x) return true;
  if (x.bereich && WG[f.wg].bereich !== x.bereich) return false;
  if (x.wg && f.wg !== x.wg) return false;
  if (x.art && f.art !== x.art) return false;
  if (x.typ && f.typ !== x.typ) return false;
  if (x.marke !== undefined && (f.marke ?? '') !== x.marke) return false;
  if (x.bisWert !== undefined && f.wert > x.bisWert) return false;
  if (x.fristBis !== undefined && f.frist > x.fristBis) return false;
  return true;
}

export function einkaufAktion(s: GameState, a: EinkaufAktion, einmalKosten: (x: number) => void): { ok: boolean; text: string } {
  const ok = (text: string) => ({ ok: true, text });
  const fehler = (text: string) => ({ ok: false, text });
  const pr = protokoll(s);
  const wgOp = (sel: WgAuswahl, fn: (st: WgStand, d: WgDef) => void, was: string) => {
    const ds = wgAuswahl(s, sel);
    if (!ds.length) return fehler('Keine passende Warengruppe.');
    for (const d of ds) fn(s.einkauf.wgs[d.id], d);
    return ok(`${was} für ${auswahlText(sel, ds.length)}.`);
  };
  switch (a.typ) {
    case 'wgLimit': {
      if (a.euro !== undefined && a.euro !== null && a.euro < 0) return fehler('Limit kann nicht negativ sein.');
      const fk = a.faktor !== undefined ? clamp(a.faktor, 0.3, 2) : undefined;
      return wgOp(a.wg, (st) => {
        if (fk !== undefined) st.st.limitFaktor = fk;
        if (a.euro === null) st.st.limitEuro = undefined;
        else if (a.euro !== undefined) st.st.limitEuro = eur(a.euro);
      }, a.euro !== undefined && a.euro !== null ? `Limit ${mio(a.euro)} je Saison` : `Limit ${Math.round((fk ?? 1) * 100)} % vom Saisonplan`);
    }
    case 'wgNosZiel': {
      const z = clamp(a.anteil, 0.02, 0.98);
      return wgOp(a.wg, (st) => { st.st.nosZiel = z; }, `NOS-Anteil Ziel ${Math.round(z * 100)} %`);
    }
    case 'wgServicegrad': {
      if (![0.9, 0.95, 0.98].includes(a.ziel)) return fehler('Servicegrad 90, 95 oder 98 %.');
      return wgOp(a.wg, (st) => { st.st.servicegrad = a.ziel; }, `NOS-Servicegrad ${Math.round(a.ziel * 100)} %`);
    }
    case 'wgVororderquote': {
      const q = clamp(a.quote, 0.2, 1);
      return wgOp(a.wg, (st) => { st.st.vororderquote = q; }, `Vororderquote ${Math.round(q * 100)} %`);
    }
    case 'wgReduzierung': {
      if (!EK_PARAM.abschrift[a.strategie]) return fehler('Reduzierung früh, normal oder spät.');
      return wgOp(a.wg, (st) => { st.st.reduzierung = a.strategie; }, `Reduzierung ${a.strategie === 'frueh' ? 'früh' : a.strategie === 'spaet' ? 'spät' : 'normal'}`);
    }
    case 'wgFreigabeModus': {
      const arten: Art[] = a.art === 'beide' ? ['nos', 'saison'] : [a.art];
      return wgOp(a.wg, (st) => { for (const x of arten) st.st.modus[x] = a.modus; }, `Ohne Freigabe: ${a.modus === 'auto' ? 'automatisch bestellen' : 'Order verfällt'} (${arten.map((x) => (x === 'nos' ? 'NOS' : 'Saison')).join(', ')})`);
    }
    case 'freigeben': case 'freigabeAblehnen': {
      const ids = new Set(a.ids);
      const treffer = s.einkauf.freigaben.filter((f) => ids.has(f.id));
      if (!treffer.length) return fehler('Keine offene Order gefunden.');
      s.einkauf.freigaben = s.einkauf.freigaben.filter((f) => !ids.has(f.id));
      const wert = treffer.reduce((x, f) => x + f.wert, 0);
      if (a.typ === 'freigeben') { for (const f of treffer) gebeFrei(s, f); pr.freigegeben += treffer.length; return ok(`${treffer.length} Orders über ${mio(wert)} freigegeben.`); }
      pr.abgelehnt += treffer.length;
      return ok(`${treffer.length} Orders über ${mio(wert)} abgelehnt.`);
    }
    case 'freigabeKuerzen': {
      const f = s.einkauf.freigaben.find((x) => x.id === a.id);
      if (!f) return fehler('Order nicht gefunden.');
      const p = clamp(a.prozent, 0, 0.95);
      f.lieferungen = f.lieferungen.map((l) => ({ woche: l.woche, wert: eur(l.wert * (1 - p)) }));
      f.wert = f.lieferungen.reduce((x, l) => x + l.wert, 0);
      f.reichweiteDanach = Math.round(f.reichweiteDanach * (1 - p) * 10) / 10;
      f.erwarteterAbverkauf = eur(f.erwarteterAbverkauf);
      f.hinweis = [f.hinweis, `um ${Math.round(p * 100)} % gekürzt`].filter(Boolean).join(', ');
      if (a.freigeben === false) return ok(`Order ${WG[f.wg].name} auf ${mio(f.wert)} gekürzt.`);
      s.einkauf.freigaben = s.einkauf.freigaben.filter((x) => x.id !== f.id);
      gebeFrei(s, f);
      pr.freigegeben++;
      return ok(`Order ${WG[f.wg].name} um ${Math.round(p * 100)} % gekürzt und über ${mio(f.wert)} freigegeben.`);
    }
    case 'sammelfreigabe': {
      const treffer = s.einkauf.freigaben.filter((f) => passtFilter(f, a.filter));
      if (!treffer.length) return ok('Keine offenen Orders im Filter.');
      const ids = new Set(treffer.map((f) => f.id));
      s.einkauf.freigaben = s.einkauf.freigaben.filter((f) => !ids.has(f.id));
      for (const f of treffer) gebeFrei(s, f);
      pr.freigegeben += treffer.length;
      return ok(`Sammelfreigabe: ${treffer.length} Orders über ${mio(treffer.reduce((x, f) => x + f.wert, 0))}.`);
    }
    case 'freigabeGrenze': {
      if (!(a.euro >= 0)) return fehler('Grenze in Euro angeben.');
      s.einkauf.grenze = eur(a.euro);
      return ok(`Freigabegrenze ${Math.round(s.einkauf.grenze).toLocaleString('de-DE')} € EK je Order.`);
    }
    case 'eigenmarkeGruenden': return eigenmarkeGruenden(s, a.entwurf, einmalKosten);
    case 'eigenmarkeNeupositionieren': return eigenmarkeNeupositionieren(s, a.marke, a.neu, einmalKosten);
    case 'eigenmarkeEinstellen': return eigenmarkeEinstellen(s, a.marke);
    case 'eigenmarkeAnteil': return eigenmarkeAnteil(s, a.marke, a.wg, a.anteil);
    case 'eigenmarkeSetzen': return eigenmarkeSetzen(s, a.marke, a);
  }
}

// ---------------------------------------------------------------------------------------------
// Abfragen
// ---------------------------------------------------------------------------------------------

export interface EinkaufKennzahlen {
  umsatz: number; // 13 Wochen VK
  umsatzWoche: number;
  rohertrag: number; // 13 Wochen nach Abschriften
  rohertragsquote: number;
  bestandEk: number;
  lagerumschlag: number; // Wareneinsatz zu Ø Bestand EK, rollierend 52 Wochen, aufs Jahr gerechnet
  lagerumschlag13: number;
  reichweite: number; // Wochen (Bestand zu Bedarf der nächsten 4 Wochen)
  abverkaufsquote: number; // laufende Saison, Saisonware EK
  altwarenanteil: number;
  abschriften: number; // 13 Wochen
  reduzierungsquote: number; // Abschriften zu Umsatz
  nosVerfuegbarkeit: number; // Ø 4 Wochen
  entgangenerUmsatz: number; // 13 Wochen
  limit: number; // Open to Buy der laufenden Saison
  limitVerbraucht: number;
  limitFrei: number;
  offeneOrders: number; // bestellt, noch nicht geliefert (EK)
  offeneFreigaben: number;
  offeneFreigabenWert: number;
  eigenmarkenAnteil: number; // am Umsatz, 13 Wochen
  eigenmarkenMarge: number; // Rohertragsquote der Eigenmarken (vor Abschriften)
}
export type KennzahlId = keyof EinkaufKennzahlen;
export type Ampeln = Partial<Record<KennzahlId, Ampel>>;

/** Spalten für die Übersicht (Reihenfolge und Format). */
export const EINKAUF_SPALTEN: { id: KennzahlId; name: string; format: 'eur' | 'prozent' | 'faktor' | 'wochen' | 'anzahl'; standard: boolean }[] = [
  { id: 'umsatz', name: 'Umsatz 13 Wo.', format: 'eur', standard: true },
  { id: 'rohertragsquote', name: 'Rohertragsquote', format: 'prozent', standard: true },
  { id: 'lagerumschlag', name: 'Umschlag', format: 'faktor', standard: true },
  { id: 'reichweite', name: 'Reichweite', format: 'wochen', standard: true },
  { id: 'abverkaufsquote', name: 'Abverkauf', format: 'prozent', standard: true },
  { id: 'altwarenanteil', name: 'Altware', format: 'prozent', standard: true },
  { id: 'nosVerfuegbarkeit', name: 'NOS-Verfügbarkeit', format: 'prozent', standard: true },
  { id: 'limitFrei', name: 'Limit frei', format: 'eur', standard: true },
  { id: 'rohertrag', name: 'Rohertrag 13 Wo.', format: 'eur', standard: false },
  { id: 'bestandEk', name: 'Bestand EK', format: 'eur', standard: false },
  { id: 'abschriften', name: 'Abschriften 13 Wo.', format: 'eur', standard: false },
  { id: 'reduzierungsquote', name: 'Reduzierungsquote', format: 'prozent', standard: false },
  { id: 'entgangenerUmsatz', name: 'Fehlmengen 13 Wo.', format: 'eur', standard: false },
  { id: 'offeneOrders', name: 'Offene Orders', format: 'eur', standard: false },
  { id: 'offeneFreigaben', name: 'Freigaben offen', format: 'anzahl', standard: false },
  { id: 'eigenmarkenAnteil', name: 'Eigenmarkenanteil', format: 'prozent', standard: false },
  { id: 'eigenmarkenMarge', name: 'Eigenmarkenmarge', format: 'prozent', standard: false },
];

/** Basissummen, aus denen die Kennzahlen abgeleitet werden (Bereich = Summe der WG). */
interface Basis {
  u13: number; uW: number; r13: number; best: number; e52: number; bSum52: number; n52: number; e13: number; bSum13: number; n13: number;
  ab13: number; fehl13: number; nosZ: number; nosN: number; eu13: number; er13: number; alt: number; sEin: number; sAb: number;
  limit: number; limitV: number; pipe: number; offenN: number; offenW: number; bedarf4: number; plMarge: number; sollAbverkauf: number;
}

const leer = (): Basis => ({ u13: 0, uW: 0, r13: 0, best: 0, e52: 0, bSum52: 0, n52: 0, e13: 0, bSum13: 0, n13: 0, ab13: 0, fehl13: 0, nosZ: 0, nosN: 0, eu13: 0, er13: 0, alt: 0, sEin: 0, sAb: 0, limit: 0, limitV: 0, pipe: 0, offenN: 0, offenW: 0, bedarf4: 0, plMarge: 0, sollAbverkauf: 0 });

/** Deterministisches Rauschen je WG, Woche und Feld (Controlling-Genauigkeit). */
function rauschen(s: GameState, wg: string, feld: string, woche = s.woche): number {
  const stufe = s.hq?.wirkung.controlling ?? 1;
  const r = stufe >= 2.5 ? 0 : [0.12, 0.04, 0][s.controllingStufe];
  if (r === 0) return 1;
  let h = 2166136261;
  const t = `${wg}|${woche}|${feld}`;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 1 + r * ((((h >>> 0) % 10000) / 10000) * 2 - 1);
}

const summe = (x: number[], n: number): number => { let a = 0; for (let i = Math.max(0, x.length - n); i < x.length; i++) a += x[i]; return a; };

function basisWg(s: GameState, d: WgDef, bestandJe: Map<WgId, { best: number; alt: number }>): Basis {
  const st = s.einkauf.wgs[d.id];
  const v = st.v;
  const R = (f: string) => rauschen(s, d.id, f);
  const b = leer();
  const n52 = Math.min(52, v.w.length);
  const n13 = Math.min(13, v.w.length);
  b.u13 = summe(v.u, 13) * R('u');
  b.uW = (v.u[v.u.length - 1] ?? 0) * R('u');
  b.r13 = summe(v.r, 13) + Math.abs(summe(v.u, 13)) * (R('r') - 1) * 0.5;
  const bj = bestandJe.get(d.id) ?? { best: 0, alt: 0 };
  b.best = bj.best * R('b');
  b.alt = bj.alt * R('b') * R('alt');
  b.e52 = summe(v.e, 52) * R('e'); b.bSum52 = summe(v.b, 52) * R('b'); b.n52 = n52;
  b.e13 = summe(v.e, 13) * R('e'); b.bSum13 = summe(v.b, 13) * R('b'); b.n13 = n13;
  b.ab13 = summe(v.a, 13) * R('a');
  b.fehl13 = summe(v.f, 13) * R('f');
  const nN = Math.min(4, v.n.length);
  // NOS-Verfügbarkeit: über den NOS-Bruttobedarf gewichtet (Näherung über die Nachfrage)
  for (let i = v.n.length - nN; i < v.n.length; i++) { const g = v.nd[i] * st.nosAnteil; b.nosZ += v.n[i] * g; b.nosN += g; }
  b.nosZ *= 1 + (R('n') - 1) * 0.25;
  b.eu13 = summe(v.eu, 13) * R('u'); b.er13 = summe(v.er, 13) * R('u');
  const sz = st.saisons[String(saisonId(s.woche))] ?? { eingang: 0, abverkauf: 0 };
  b.sEin = sz.eingang; b.sAb = sz.abverkauf * R('s');
  const sid = saisonId(s.woche);
  const L = limitFuer(s, st, sid);
  b.limit = limitWert(st, L); b.limitV = L.verbraucht;
  for (const x of s.bestellungen) if (x.wg === d.id) b.pipe += x.wert;
  for (const f of s.einkauf.freigaben) if (f.wg === d.id) { b.offenN++; b.offenW += f.wert; }
  for (let t = s.woche; t < s.woche + 4; t++) for (const art of ['nos', 'saison'] as Art[]) for (const pool of poolsDerWg(s, st)) b.bedarf4 += prognoseEk(s, st, art, pool, t) / (1 + st.fehler);
  b.plMarge = (st.nosAnteil * st.margeNos + (1 - st.nosAnteil) * st.margeSaison) * b.u13;
  const rel = s.woche - saisonStart(sid);
  b.sollAbverkauf = clamp((0.7 * (rel + 1)) / 26, 0, 0.7) * b.sEin; // Ziel: rund 70 % Abverkauf bis Saisonende
  return b;
}

function addiere(a: Basis, b: Basis): Basis {
  const o = { ...a };
  for (const k of Object.keys(o) as (keyof Basis)[]) o[k] = a[k] + b[k];
  o.n52 = Math.max(a.n52, b.n52); o.n13 = Math.max(a.n13, b.n13);
  return o;
}

function kennzahlen(b: Basis): EinkaufKennzahlen {
  const avg52 = b.n52 > 0 ? b.bSum52 / b.n52 : b.best;
  const avg13 = b.n13 > 0 ? b.bSum13 / b.n13 : b.best;
  return {
    umsatz: eur(b.u13), umsatzWoche: eur(b.uW), rohertrag: eur(b.r13), rohertragsquote: b.u13 > 0 ? b.r13 / b.u13 : 0,
    bestandEk: eur(b.best),
    lagerumschlag: avg52 > 0 && b.n52 > 0 ? Math.round(((b.e52 * 52) / b.n52 / avg52) * 100) / 100 : 0,
    lagerumschlag13: avg13 > 0 && b.n13 > 0 ? Math.round(((b.e13 * 52) / b.n13 / avg13) * 100) / 100 : 0,
    reichweite: b.bedarf4 > 0 ? Math.round((b.best / (b.bedarf4 / 4)) * 10) / 10 : 0,
    abverkaufsquote: b.sEin > 0 ? Math.min(1, b.sAb / b.sEin) : 0,
    altwarenanteil: b.best > 0 ? b.alt / b.best : 0,
    abschriften: eur(b.ab13), reduzierungsquote: b.u13 > 0 ? b.ab13 / b.u13 : 0,
    nosVerfuegbarkeit: b.nosN > 0 ? Math.min(1, b.nosZ / b.nosN) : 1,
    entgangenerUmsatz: eur(b.fehl13),
    limit: eur(b.limit), limitVerbraucht: eur(b.limitV), limitFrei: eur(b.limit - b.limitV),
    offeneOrders: eur(b.pipe), offeneFreigaben: b.offenN, offeneFreigabenWert: eur(b.offenW),
    eigenmarkenAnteil: b.u13 > 0 ? b.eu13 / b.u13 : 0, eigenmarkenMarge: b.eu13 > 0 ? b.er13 / b.eu13 : 0,
  };
}

function ampeln(k: EinkaufKennzahlen, b: Basis): Ampeln {
  const a = (gut: boolean, mittel: boolean): Ampel => (gut ? 'gruen' : mittel ? 'gelb' : 'rot');
  const plan = b.u13 > 0 ? b.plMarge / b.u13 : 0;
  const soll = b.sEin > 0 ? b.sollAbverkauf / b.sEin : 0;
  return {
    rohertragsquote: a(k.rohertragsquote >= plan - 0.03, k.rohertragsquote >= plan - 0.06), // Plan vor Abschriften, 3 Punkte Reduzierung sind normal
    lagerumschlag: a(k.lagerumschlag >= 3, k.lagerumschlag >= 2),
    reichweite: a(k.reichweite >= 3 && k.reichweite <= 12, k.reichweite >= 2 && k.reichweite <= 18),
    abverkaufsquote: a(k.abverkaufsquote >= soll - 0.1, k.abverkaufsquote >= soll - 0.2),
    altwarenanteil: a(k.altwarenanteil <= 0.1, k.altwarenanteil <= 0.2),
    reduzierungsquote: a(k.reduzierungsquote <= 0.03, k.reduzierungsquote <= 0.06),
    nosVerfuegbarkeit: a(k.nosVerfuegbarkeit >= 0.945, k.nosVerfuegbarkeit >= 0.9),
    entgangenerUmsatz: a(k.umsatz > 0 && k.entgangenerUmsatz / k.umsatz <= 0.04, k.umsatz > 0 && k.entgangenerUmsatz / k.umsatz <= 0.08),
    limitFrei: a(k.limit > 0 && k.limitFrei / k.limit >= 0.1, k.limitFrei > 0),
  };
}

function bestandJeWg(s: GameState): Map<WgId, { best: number; alt: number }> {
  const m = new Map<WgId, { best: number; alt: number }>();
  for (const k of s.bestand) {
    if (!k.wg) continue;
    let x = m.get(k.wg);
    if (!x) { x = { best: 0, alt: 0 }; m.set(k.wg, x); }
    x.best += k.wert;
    if (istAlt(k)) x.alt += k.wert;
  }
  return m;
}

export interface EinkaufFilter { format?: Format; bereich?: GruppeId }

export interface WgZeile { id: WgId; name: string; kennzahlen: EinkaufKennzahlen; ampeln: Ampeln; eigenmarken: string[] }
export interface BereichZeile { bereich: GruppeId; name: string; format: Format; kennzahlen: EinkaufKennzahlen; ampeln: Ampeln; wgs: WgZeile[] }

export interface EinkaufUebersicht {
  woche: number;
  saison: { id: number; name: string; woche: number; wochen: number };
  grenze: number;
  offeneFreigaben: number;
  offeneFreigabenWert: number;
  genauigkeit: 'grob' | 'normal' | 'exakt';
  einkaufStufe: number;
  summe: { kennzahlen: EinkaufKennzahlen; ampeln: Ampeln };
  bereiche: BereichZeile[];
  spalten: typeof EINKAUF_SPALTEN;
}

const genauigkeit = (s: GameState): 'grob' | 'normal' | 'exakt' => ((s.hq?.wirkung.controlling ?? 1) >= 2.5 || s.controllingStufe === 2 ? 'exakt' : s.controllingStufe === 1 ? 'normal' : 'grob');

/** Übersicht nach Bereich, aufklappbar zu WG. Werte so, wie das Controlling sie liefert (Rauschen nach Stufe). */
export function einkaufUebersicht(s: GameState, filter: EinkaufFilter = {}): EinkaufUebersicht {
  const bj = bestandJeWg(s);
  const bereiche: BereichZeile[] = [];
  let gesamt = leer();
  for (const [g, liste] of Object.entries(WG_JE_BEREICH) as [GruppeId, WgDef[]][]) {
    if (s.basisUmsatz[g] === undefined) continue;
    if (filter.bereich && filter.bereich !== g) continue;
    if (filter.format && GRUPPEN[g].format !== filter.format) continue;
    let sum = leer();
    const wgs: WgZeile[] = [];
    for (const d of liste) {
      const b = basisWg(s, d, bj);
      sum = addiere(sum, b);
      const k = kennzahlen(b);
      wgs.push({ id: d.id, name: d.name, kennzahlen: k, ampeln: ampeln(k, b), eigenmarken: markenInWg(s, d.id).map((m) => m.name) });
    }
    gesamt = addiere(gesamt, sum);
    const k = kennzahlen(sum);
    bereiche.push({ bereich: g, name: GRUPPEN[g].name, format: GRUPPEN[g].format, kennzahlen: k, ampeln: ampeln(k, sum), wgs });
  }
  const sid = saisonId(s.woche);
  const kg = kennzahlen(gesamt);
  return {
    woche: s.woche,
    saison: { id: sid, name: saisonName(s, sid), woche: s.woche - saisonStart(sid) + 1, wochen: 26 },
    grenze: s.einkauf.grenze,
    offeneFreigaben: s.einkauf.freigaben.length,
    offeneFreigabenWert: eur(s.einkauf.freigaben.reduce((a, f) => a + f.wert, 0)),
    genauigkeit: genauigkeit(s),
    einkaufStufe: Math.round(einkaufStufe(s) * 100) / 100,
    summe: { kennzahlen: kg, ampeln: ampeln(kg, gesamt) },
    bereiche,
    spalten: EINKAUF_SPALTEN,
  };
}

export interface FreigabeZeile extends Freigabe { wgName: string; bereich: GruppeId; bereichName: string; markeName?: string; restWochen: number; modus: FreigabeModus; ersteLieferung: number }

export interface FreigabenListe { woche: number; grenze: number; anzahl: number; wert: number; liste: FreigabeZeile[]; protokoll: FreigabeProtokoll[] }

function freigabeZeile(s: GameState, f: Freigabe): FreigabeZeile {
  const d = WG[f.wg];
  return {
    ...f, lieferungen: f.lieferungen.map((l) => ({ ...l })), wgName: d.name, bereich: d.bereich, bereichName: GRUPPEN[d.bereich].name,
    markeName: f.marke ? s.eigenmarken.marken.find((m) => m.id === f.marke)?.name : undefined,
    restWochen: f.frist - s.woche, modus: s.einkauf.wgs[f.wg].st.modus[f.art], ersteLieferung: f.lieferungen[0]?.woche ?? f.erstellt,
  };
}

/** Freigabe-Eingang, nach Frist sortiert. */
export function freigaben(s: GameState, filter?: FreigabeFilter): FreigabenListe {
  const liste = s.einkauf.freigaben.filter((f) => passtFilter(f, filter)).map((f) => freigabeZeile(s, f)).sort((a, b) => a.frist - b.frist || b.wert - a.wert);
  return { woche: s.woche, grenze: s.einkauf.grenze, anzahl: liste.length, wert: eur(liste.reduce((a, f) => a + f.wert, 0)), liste, protokoll: s.einkauf.protokoll.map((p) => ({ ...p })) };
}

export interface WgDetail {
  id: WgId; name: string; bereich: GruppeId; bereichName: string; format: Format; lieferant: string;
  kennzahlen: EinkaufKennzahlen; ampeln: Ampeln;
  steuerung: WgSteuerung & { nosAnteil: number };
  stammdaten: { margeNos: number; margeSaison: number; vorlaufVor: number; vorlaufNach: number; vorlaufNos: number; mindestabnahme: number; eigenmarkenfaehig: boolean; kategorie?: EmKategorie; saison: number[] };
  eigenmarken: { marke: string; name: string; farbe: string; anteilZiel: number; anteilIst: number; mehrmarge: number }[];
  /** 26 Wochen: Bestand EK, Umsatz VK, Reichweite (Wochen), NOS-Verfügbarkeit, Abschriften. */
  verlauf: { woche: number[]; bestand: number[]; umsatz: number[]; reichweite: number[]; nosVerfuegbarkeit: number[]; abschriften: number[] };
  limits: { saison: number; name: string; limit: number; verbraucht: number; frei: number }[];
  bestellungen: { ankunft: number; art: Art; marke?: string; wert: number }[];
  freigaben: FreigabeZeile[];
}

export function wgDetail(s: GameState, wgId: WgId): WgDetail | undefined {
  const d = WG[wgId];
  if (!d) return undefined;
  const st = s.einkauf.wgs[wgId];
  const b = basisWg(s, d, bestandJeWg(s));
  const k = kennzahlen(b);
  const v = st.v;
  const n = Math.min(26, v.w.length);
  const ab = v.w.length - n;
  const verlauf: WgDetail['verlauf'] = { woche: [], bestand: [], umsatz: [], reichweite: [], nosVerfuegbarkeit: [], abschriften: [] };
  for (let i = ab; i < v.w.length; i++) {
    const w = v.w[i];
    const best = v.b[i] * rauschen(s, wgId, 'b', w);
    const e4 = (v.e.slice(Math.max(0, i - 3), i + 1).reduce((x, y) => x + y, 0) / Math.min(4, i + 1)) || 1;
    verlauf.woche.push(w); verlauf.bestand.push(eur(best)); verlauf.umsatz.push(eur(v.u[i] * rauschen(s, wgId, 'u', w)));
    verlauf.reichweite.push(Math.round((best / e4) * 10) / 10); verlauf.nosVerfuegbarkeit.push(v.n[i]); verlauf.abschriften.push(eur(v.a[i] * rauschen(s, wgId, 'a', w)));
  }
  const sid = saisonId(s.woche);
  const limits = [sid, sid + 1].map((x) => { const L = limitFuer(s, st, x); const lw = limitWert(st, L); return { saison: x, name: saisonName(s, x), limit: lw, verbraucht: eur(L.verbraucht), frei: eur(lw - L.verbraucht) }; });
  const best: Map<string, { ankunft: number; art: Art; marke?: string; wert: number }> = new Map();
  for (const x of s.bestellungen) if (x.wg === wgId) {
    const key = `${x.ankunft}|${x.art}|${x.marke ?? ''}`;
    const y = best.get(key) ?? { ankunft: x.ankunft, art: x.art ?? 'saison', marke: x.marke, wert: 0 };
    y.wert += x.wert;
    best.set(key, y);
  }
  return {
    id: d.id, name: d.name, bereich: d.bereich, bereichName: GRUPPEN[d.bereich].name, format: GRUPPEN[d.bereich].format, lieferant: d.lieferant,
    kennzahlen: k, ampeln: ampeln(k, b),
    steuerung: { ...st.st, modus: { ...st.st.modus }, nosAnteil: Math.round(st.nosAnteil * 1000) / 1000 },
    stammdaten: { margeNos: st.margeNos, margeSaison: st.margeSaison, vorlaufVor: d.vorlaufVor, vorlaufNach: d.vorlaufNach, vorlaufNos: d.vorlaufNos, mindestabnahme: d.mindestabnahme, eigenmarkenfaehig: d.eigenmarkenfaehig, kategorie: d.kategorie, saison: d.saison.map((x) => Math.round(x * 100) / 100) },
    eigenmarken: markenInWg(s, wgId).map((m) => ({ marke: m.id, name: m.name, farbe: m.farbe, anteilZiel: m.wgAnteile[wgId] ?? 0, anteilIst: Math.round((m.wgIst[wgId] ?? 0) * 1000) / 1000, mehrmarge: mehrmarge(m) })),
    verlauf, limits,
    bestellungen: [...best.values()].sort((a, c) => a.ankunft - c.ankunft).map((x) => ({ ...x, wert: eur(x.wert) })),
    freigaben: s.einkauf.freigaben.filter((f) => f.wg === wgId).map((f) => freigabeZeile(s, f)),
  };
}

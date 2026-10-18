// Vorstand (C-Level): Ressorts mit Personen, Wirkung auf die HQ-Abteilungen, Delegation an eine Ressort-KI,
// Einstellen, Entlassen, Gehalt und Boni, Abwerbung und die Vorstandssitzung einmal je Quartal.
// Vertrag: ../VORSTAND-MARKETING-VERTRAG.md, Abschnitt 1. Der Spieler ist CEO.
import type { Entscheidung, GameState } from './types';
import { ABTEILUNG_NAME, hqAktualisiere, type AbteilungId } from './hq';
import { chance, clamp, eur, melde, mio, normal, waehle, zufall, zwischen, type RngHalter } from './util';
import { fuehreAus, type SpielerAktion } from './aktionen';
import { portfolio } from './abfragen';
import { runwayWochen } from './stakeholder';
import { einmalKosten } from './prozesse';
import { produktKi } from './produkte';

// ---------------------------------------------------------------------------------------------
// Datenmodell
// ---------------------------------------------------------------------------------------------

export type RessortId = 'cfo' | 'coo' | 'cso' | 'cpo' | 'cmo' | 'chro' | 'cro' | 'cdo';
export const RESSORTS: RessortId[] = ['cfo', 'coo', 'cso', 'cpo', 'cmo', 'chro', 'cro', 'cdo'];

export type Haar = 'kurz' | 'seitenscheitel' | 'glatze' | 'halbglatze' | 'locken' | 'afro' | 'bob' | 'lang' | 'zopf' | 'dutt' | 'pony' | 'halblang';
export type Haarfarbe = 'schwarz' | 'dunkelbraun' | 'braun' | 'hellbraun' | 'blond' | 'rot' | 'grau' | 'weiß';
export type Brille = 'keine' | 'rund' | 'eckig' | 'horn';
export type KleidungFarbe = 'marine' | 'anthrazit' | 'grau' | 'schwarz' | 'bordeaux' | 'petrol' | 'olive' | 'camel' | 'beige' | 'hellblau' | 'weiß' | 'senf';
export type Kleidung = 'anzug' | 'blazer' | 'kostuem' | 'hemd' | 'pullover' | 'rollkragen' | 'bluse' | 'strick';
export type Bart = 'keiner' | 'drei' | 'voll' | 'schnauz';

/** Porträt-Merkmale für render/src/kit/portraet.js (deterministisch gezeichnet). */
export interface Portraet {
  geschlecht: 'w' | 'm'; haar: Haar; haarfarbe: Haarfarbe; brille: Brille; kleidungFarbe: KleidungFarbe;
  hautton: number; // 0..5
  alter: number; kleidung: Kleidung; bart: Bart;
}

export interface VorstandPerson {
  id: string;
  name: string;
  portraet: Portraet;
  fuehrung: number; // 0..100
  fachwissen: number; // 0..100
  loyalitaet: number; // 0..100
  gehalt: number; // € im Jahr
  /** Haltebonus: Betrag, ausgezahlt in Raten bis zur Woche halteBis (senkt das Abwerberisiko). */
  haltebonus: number;
  halteBis?: number;
  halteStart?: number;
  /** Erfolgsbonus in Prozent des Jahresgehalts bei Erreichen des Quartalsplans (anteilig je Quartal). */
  erfolgsbonus: number; // 0..1
  seitWoche: number;
  vorgeschichte: string;
  gewachsen: boolean;
  /** Kündigung zum Ende der Frist (Abwerbung angenommen). */
  gehtWoche?: number;
  gehtZu?: string;
}

export interface Kandidat {
  id: string; name: string; portraet: Portraet; fuehrung: number; fachwissen: number; loyalitaet: number;
  aktuellePosition: string; aktuelleFirma: string; aktuellesGehalt: number; wechselwille: number; vorgeschichte: string;
}

export interface Ressort {
  id: RessortId;
  person?: VorstandPerson;
  delegation: Record<string, boolean>;
  kandidaten: Kandidat[];
  vakantSeit?: number;
}

export interface VorstandBoost { abteilung: AbteilungId; faktor: number; bis: number; text: string }
export interface VorstandSitzung {
  woche: number;
  berichte: { ressort: RessortId; name?: string; text: string }[];
  thema?: { id: string; ressort: RessortId; titel: string; entscheidungId: string; ergebnis?: string };
}
export interface VorstandProtokoll { woche: number; ressort: RessortId; text: string }

export interface VorstandStand {
  ressorts: Record<RessortId, Ressort>;
  /** Eigener Zufallsstrom: Vorstand verschiebt die übrige Simulation nicht. */
  rng: number;
  zaehler: number;
  /** Ressortwert zum Start: Wirkung 1 = bisherige Kalibrierung. */
  basis: Record<RessortId, number>;
  boosts: VorstandBoost[];
  sitzungen: VorstandSitzung[];
  protokoll: VorstandProtokoll[];
  /** Erfolgsboni, die in dieser Woche fällig sind (fließen in die Zentralkosten). */
  bonusWoche: number;
}

// ---------------------------------------------------------------------------------------------
// Parameter
// ---------------------------------------------------------------------------------------------

export const RESSORT_INFO: Record<RessortId, { kurz: string; titel: string; zustaendig: string; markt: number; abteilungen: Partial<Record<AbteilungId, number>> }> = {
  cfo: { kurz: 'CFO', titel: 'Finanzvorstand', zustaendig: 'Finanzen, Controlling, Bank und Kreditversicherer', markt: 520_000, abteilungen: { controlling: 1, verwaltung: 1 } },
  coo: { kurz: 'COO', titel: 'Vorstand Operations', zustaendig: 'Filialbetrieb, Logistik', markt: 450_000, abteilungen: { logistik: 1, personal: 0.3 } },
  cso: { kurz: 'CSO', titel: 'Vertriebsvorstand', zustaendig: 'Regionen, Filialleitungen, Flächen', markt: 420_000, abteilungen: { vm: 1 } },
  cpo: { kurz: 'CPO', titel: 'Einkaufsvorstand', zustaendig: 'Einkauf, Eigenmarken, Produktentwicklung, Freigaben', markt: 480_000, abteilungen: { einkauf: 1, produkt: 1 } },
  cmo: { kurz: 'CMO', titel: 'Marketingvorstand', zustaendig: 'Marketing, CRM, Kundenkarte, E-Commerce', markt: 430_000, abteilungen: { marketing: 1, ecommerce: 0.5 } },
  chro: { kurz: 'CHRO', titel: 'Personalvorstand', zustaendig: 'Personal, Betriebsrat', markt: 380_000, abteilungen: { personal: 0.7 } },
  cro: { kurz: 'CRO', titel: 'Restrukturierungsvorstand', zustaendig: 'Sanierung, Insolvenzverfahren, Recht, Immobilien', markt: 560_000, abteilungen: { immobilien: 1, recht: 1 } },
  cdo: { kurz: 'CDO', titel: 'Digitalvorstand', zustaendig: 'IT, Daten, Online', markt: 450_000, abteilungen: { ecommerce: 0.5 } },
};

export interface DelegationDef { id: string; label: string; beschreibung: string }

export const DELEGATIONEN: Record<RessortId, DelegationDef[]> = {
  cfo: [
    { id: 'zahlungsplanung', label: 'Zahlungsplanung delegieren', beschreibung: 'Orderniveau nach Liquidität steuern' },
    { id: 'bank', label: 'Bank und Kreditversicherer delegieren', beschreibung: 'Quartalsplan einreichen, Bankgespräche führen' },
  ],
  coo: [
    { id: 'filialpersonal', label: 'Filialpersonal delegieren', beschreibung: 'Aushilfenquote nach Saison' },
    { id: 'personalbedarf', label: 'Personalbedarf delegieren', beschreibung: 'Überbesetzung in den Häusern abbauen' },
  ],
  cso: [
    { id: 'filialbesetzung', label: 'Filialbesetzung delegieren', beschreibung: 'Halteprämien für wacklige Filialleitungen' },
    { id: 'flaechenvermietung', label: 'Flächenvermietung delegieren', beschreibung: 'Untermietangebote prüfen und annehmen' },
  ],
  cpo: [
    { id: 'freigaben', label: 'Freigaben bis Grenze delegieren', beschreibung: 'Freigabe-Eingang abarbeiten' },
    { id: 'dispo', label: 'Dispo und Limits delegieren', beschreibung: 'Open to Buy und Servicegrad je Saison setzen' },
    { id: 'produktentwicklung', label: 'Eigenmarken-Produktentwicklung delegieren', beschreibung: 'Neue Produkte entwickeln, schwache auslisten' },
  ],
  cmo: [
    { id: 'aktionskalender', label: 'Aktionskalender delegieren', beschreibung: 'Aktionen planen und auswerten' },
    { id: 'crm', label: 'CRM-Kampagnen delegieren', beschreibung: 'Kampagnen für Kartenkunden steuern' },
    { id: 'kanalbudget', label: 'Kanalbudget delegieren', beschreibung: 'Werbebudget nach Lage setzen' },
  ],
  chro: [
    { id: 'betriebsrat', label: 'Betriebsratsverhandlungen delegieren', beschreibung: 'Sanierungstarif verhandeln' },
    { id: 'personalplanung', label: 'Personalplanung delegieren', beschreibung: 'Abteilungen der Zentrale auf Soll bringen' },
  ],
  cro: [
    { id: 'schliessungen', label: 'Schließungsprozesse delegieren', beschreibung: 'Dauerhaft defizitäre Häuser schließen' },
    { id: 'mietverhandlungen', label: 'Mietverhandlungen delegieren', beschreibung: 'Teure Mieten nachverhandeln' },
  ],
  cdo: [
    { id: 'onlinesortiment', label: 'Online-Sortiment delegieren', beschreibung: 'Sortiment und Pflege des Onlineshops' },
  ],
};

export const VORSTAND_PARAM = {
  /** Ressortwert eines unbesetzten Ressorts (besetzt: 0,65 Führung + 0,35 Fachwissen, 0..1). */
  wertLeer: 0.2,
  /** Wirkung je Punkt Ressortwert über dem Start auf die wirksame Stufe der Abteilungen. */
  wirkung: 0.5,
  einarbeitungWochen: 12,
  loyalitaetTempo: 0.04,
  /** Basis-Wahrscheinlichkeit je Woche für ein Abwerbeangebot bei Loyalität 50. */
  abwerbung: 0.002,
  kuendigungsfrist: 4,
  abfindungRegulaer: 1.0, // Jahresgehälter
  abfindungInsolvenz: 0.25,
  sitzungWoche: 6, // Woche im Quartal
};

// ---------------------------------------------------------------------------------------------
// Namen und Porträts (fiktiv)
// ---------------------------------------------------------------------------------------------

const VORNAMEN_W = ['Andrea', 'Birgit', 'Claudia', 'Dagmar', 'Elif', 'Franziska', 'Henrike', 'Ines', 'Jana', 'Katrin', 'Lena', 'Mareike', 'Nadine', 'Olga', 'Petra', 'Ricarda', 'Sevgi', 'Tanja', 'Ulrike', 'Vanessa', 'Wiebke', 'Yasemin', 'Zofia', 'Miriam', 'Anouk', 'Larissa'];
const VORNAMEN_M = ['Achim', 'Bernd', 'Carsten', 'Dirk', 'Emre', 'Florian', 'Gregor', 'Holger', 'Ingo', 'Jörg', 'Kai', 'Lars', 'Malte', 'Nils', 'Oliver', 'Pascal', 'Ralf', 'Stefan', 'Tobias', 'Uwe', 'Volker', 'Wladimir', 'Yusuf', 'Konstantin', 'Matthias', 'Tarek'];
const NACHNAMEN = ['Albers', 'Brockmann', 'Cetin', 'Dahlmann', 'Ehlers', 'Fuchsberger', 'Grabowski', 'Hollmann', 'Ilgner', 'Jankowski', 'Kersting', 'Lindqvist', 'Mertens', 'Nowak', 'Overbeck', 'Pohlmann', 'Quast', 'Reinholz', 'Schäfermeier', 'Tillmanns', 'Uhlenbrock', 'Voss', 'Wendland', 'Yilmaz', 'Zander', 'Bruckner', 'Kahraman', 'Lewandowski', 'Nguyen', 'Petersen', 'Rademacher', 'Sommerfeld', 'Thiele', 'Wolters'];
const FIRMEN = ['Lindner und Voss Warenhaus AG', 'Sternhaus Gruppe', 'Nordmode AG', 'Feldmann Handel KG', 'Rheinwerk Versand GmbH', 'Brandauer Sport AG', 'Kessler Logistik SE', 'Falkenhain Consulting', 'Mittelland Moden GmbH', 'Hanse Textil AG', 'Odenwald Möbel KG', 'Weserland Discount GmbH', 'Kranich Beauty AG', 'Pfalzgraf Lebensmittel SE'];
const POSITIONEN: Record<RessortId, string[]> = {
  cfo: ['CFO', 'Leiter Finanzen', 'Bereichsleiterin Controlling', 'Partner Restrukturierung'],
  coo: ['COO', 'Leiter Filialbetrieb', 'Geschäftsführer Logistik', 'Bereichsleiterin Operations'],
  cso: ['Vertriebsdirektor', 'Leiterin Region West', 'Geschäftsführer Vertrieb', 'Head of Stores'],
  cpo: ['Einkaufsdirektorin', 'Chief Merchandising Officer', 'Leiter Eigenmarken', 'Bereichsleiter Einkauf'],
  cmo: ['CMO', 'Leiterin Marketing', 'Head of CRM', 'Geschäftsführer Agentur'],
  chro: ['Personaldirektorin', 'Leiter Personal', 'Arbeitsdirektor', 'Head of People'],
  cro: ['Chief Restructuring Officer', 'Partner Restrukturierung', 'Generalbevollmächtigter', 'Sanierungsgeschäftsführerin'],
  cdo: ['CDO', 'Head of E-Commerce', 'CTO', 'Leiterin Digital'],
};
const HAAR_W: Haar[] = ['bob', 'lang', 'zopf', 'dutt', 'pony', 'halblang', 'locken', 'kurz', 'afro'];
const HAAR_M: Haar[] = ['kurz', 'seitenscheitel', 'glatze', 'halbglatze', 'locken', 'afro', 'kurz', 'seitenscheitel', 'halblang'];
const HAARFARBEN: Haarfarbe[] = ['schwarz', 'dunkelbraun', 'braun', 'hellbraun', 'blond', 'rot'];
const KLEIDUNGFARBEN: KleidungFarbe[] = ['marine', 'anthrazit', 'grau', 'schwarz', 'bordeaux', 'petrol', 'olive', 'camel', 'beige', 'hellblau', 'weiß', 'senf'];

function zufallsPortraet(r: RngHalter, w: boolean, alter: number): Portraet {
  const grau = alter > 55 ? 0.6 : alter > 48 ? 0.3 : 0.05;
  const haarfarbe: Haarfarbe = zufall(r) < grau ? (zufall(r) < 0.3 ? 'weiß' : 'grau') : waehle(r, HAARFARBEN);
  const kleidung: Kleidung = w ? waehle(r, ['blazer', 'kostuem', 'bluse', 'strick', 'rollkragen'] as Kleidung[]) : waehle(r, ['anzug', 'anzug', 'blazer', 'hemd', 'pullover', 'rollkragen'] as Kleidung[]);
  return {
    geschlecht: w ? 'w' : 'm',
    haar: waehle(r, w ? HAAR_W : HAAR_M),
    haarfarbe,
    brille: zufall(r) < 0.45 ? waehle(r, ['rund', 'eckig', 'horn'] as Brille[]) : 'keine',
    kleidungFarbe: waehle(r, KLEIDUNGFARBEN),
    hautton: Math.floor(zufall(r) * 6),
    alter,
    kleidung,
    bart: w ? 'keiner' : zufall(r) < 0.6 ? 'keiner' : waehle(r, ['drei', 'voll', 'schnauz'] as Bart[]),
  };
}

// ---------------------------------------------------------------------------------------------
// Grundfunktionen
// ---------------------------------------------------------------------------------------------

const rng = (s: GameState): RngHalter => s.vorstand;

function neueVid(s: GameState, p: string): string {
  s.vorstand.zaehler += 1;
  return `${p}${s.vorstand.zaehler}`;
}

const skill = (p: { fuehrung: number; fachwissen: number }): number => (p.fuehrung + p.fachwissen) / 200;

/** Gehaltsforderung aus Fähigkeiten und Markt (in der Insolvenz mit Risikoaufschlag). */
export function gehaltsforderung(s: GameState, r: RessortId, p: { fuehrung: number; fachwissen: number }, ohneRisiko = false): number {
  const f = 0.55 + 0.9 * skill(p);
  const inso = s.phase === 'insolvenz' && !ohneRisiko ? 1.1 : 1;
  return Math.round((RESSORT_INFO[r].markt * f * inso) / 5000) * 5000;
}

/** Ressortwert 0..1: Führung (mit Erfolgsbonus), Fachwissen, Einarbeitung. Unbesetzt: wertLeer. */
export function ressortWert(s: GameState, r: RessortId): number {
  const p = s.vorstand?.ressorts[r]?.person;
  if (!p) return VORSTAND_PARAM.wertLeer;
  const fuehrung = Math.min(100, p.fuehrung * (1 + 0.08 * Math.min(1, p.erfolgsbonus)));
  const voll = (0.65 * fuehrung + 0.35 * p.fachwissen) / 100;
  const ein = clamp((s.woche - p.seitWoche) / VORSTAND_PARAM.einarbeitungWochen, 0, 1);
  return VORSTAND_PARAM.wertLeer + (voll - VORSTAND_PARAM.wertLeer) * (0.5 + 0.5 * ein);
}

/** Faktor auf die wirksame Stufe einer HQ-Abteilung (Start = genau 1). */
export function vorstandWirkung(s: GameState, a: AbteilungId): number {
  const v = s.vorstand;
  if (!v) return 1;
  let f = 1;
  for (const r of RESSORTS) {
    const g = RESSORT_INFO[r].abteilungen[a];
    if (!g) continue;
    const d = ressortWert(s, r) - v.basis[r];
    if (d !== 0) f *= 1 + VORSTAND_PARAM.wirkung * g * d;
  }
  for (const b of v.boosts) if (b.abteilung === a && b.bis > s.woche) f *= b.faktor;
  // CDO mit delegiertem Online-Sortiment: Pflege des Shops nach Fachwissen
  if (a === 'ecommerce') {
    const cdo = v.ressorts.cdo;
    if (cdo.person && cdo.delegation.onlinesortiment) f *= 1 + 0.25 * (cdo.person.fachwissen / 100 - 0.4);
  }
  return Math.max(0, f);
}

/** Vorstandskosten je Woche: Gehälter, Haltebonus-Raten, fällige Erfolgsboni. */
export function vorstandKostenWoche(s: GameState): number {
  const v = s.vorstand;
  if (!v) return 0;
  let k = v.bonusWoche;
  for (const r of RESSORTS) {
    const p = v.ressorts[r].person;
    if (!p) continue;
    k += p.gehalt / 52;
    if (p.halteBis !== undefined && p.halteBis > s.woche && p.haltebonus > 0) k += p.haltebonus / Math.max(1, p.halteBis - (p.halteStart ?? p.seitWoche));
  }
  return k;
}

// ---------------------------------------------------------------------------------------------
// Startbesetzung
// ---------------------------------------------------------------------------------------------

function startPerson(id: string, name: string, portraet: Portraet, fuehrung: number, fachwissen: number, loyalitaet: number, gehalt: number, seitWoche: number, vorgeschichte: string): VorstandPerson {
  return { id, name, portraet, fuehrung, fachwissen, loyalitaet, gehalt, haltebonus: 0, erfolgsbonus: 0, seitWoche, vorgeschichte, gewachsen: true };
}

/** Gewachsener, mittelmäßiger Vorstand; CRO und CDO unbesetzt. */
export function erzeugeVorstand(s: GameState): VorstandStand {
  const leer = (id: RessortId): Ressort => ({ id, delegation: Object.fromEntries(DELEGATIONEN[id].map((d) => [d.id, false])), kandidaten: [] });
  const ressorts = Object.fromEntries(RESSORTS.map((r) => [r, leer(r)])) as Record<RessortId, Ressort>;
  ressorts.cfo.person = startPerson('vp1', 'Renate Kolbeck', { geschlecht: 'w', haar: 'bob', haarfarbe: 'grau', brille: 'eckig', kleidungFarbe: 'anthrazit', hautton: 1, alter: 59, kleidung: 'kostuem', bart: 'keiner' },
    48, 58, 74, 495_000, -52 * 11, 'Seit 2015 im Haus, vorher Konzerncontrolling. Kennt jede Kostenstelle, scheut aber Konflikte mit den Banken.');
  ressorts.coo.person = startPerson('vp2', 'Dieter Hambrock', { geschlecht: 'm', haar: 'halbglatze', haarfarbe: 'weiß', brille: 'keine', kleidungFarbe: 'marine', hautton: 0, alter: 63, kleidung: 'anzug', bart: 'schnauz' },
    52, 47, 78, 430_000, -52 * 19, 'Hat als Lehrling im Haus Essen angefangen. Verlässlich im Tagesgeschäft, Logistik denkt er noch in Lagern statt in Flüssen.');
  ressorts.cso.person = startPerson('vp3', 'Murat Demirel', { geschlecht: 'm', haar: 'kurz', haarfarbe: 'schwarz', brille: 'keine', kleidungFarbe: 'petrol', hautton: 3, alter: 49, kleidung: 'blazer', bart: 'drei' },
    56, 50, 66, 410_000, -52 * 4, 'Früher Regionalleiter West, die Filialleitungen mögen ihn. Für Flächenkonzepte fehlt ihm der Blick von außen.');
  ressorts.cpo.person = startPerson('vp4', 'Gisela Wernicke', { geschlecht: 'w', haar: 'dutt', haarfarbe: 'hellbraun', brille: 'horn', kleidungFarbe: 'bordeaux', hautton: 1, alter: 57, kleidung: 'blazer', bart: 'keiner' },
    47, 52, 72, 465_000, -52 * 14, 'Hat Lisanne einst groß gemacht und hängt an der Marke. Kennt die Lieferanten in Fernost, Trends erreichen sie spät.');
  ressorts.cmo.person = startPerson('vp5', 'Jens Opitz', { geschlecht: 'm', haar: 'seitenscheitel', haarfarbe: 'blond', brille: 'rund', kleidungFarbe: 'hellblau', hautton: 0, alter: 52, kleidung: 'hemd', bart: 'keiner' },
    50, 46, 63, 420_000, -52 * 6, 'Kommt aus der Prospektwerbung. Liebt Beilagen und Rabattwochen, CRM ist für ihn Neuland.');
  ressorts.chro.person = startPerson('vp6', 'Sabine Lückemeyer', { geschlecht: 'w', haar: 'halblang', haarfarbe: 'dunkelbraun', brille: 'keine', kleidungFarbe: 'camel', hautton: 2, alter: 54, kleidung: 'strick', bart: 'keiner' },
    51, 55, 75, 370_000, -52 * 9, 'Gutes Verhältnis zum Gesamtbetriebsrat, hat zwei Sanierungstarife mitverhandelt. Wenig Erfahrung mit Zentralabbau.');
  const v: VorstandStand = {
    ressorts, rng: (s.seed * 2246822519 + 0x5a0e) >>> 0, zaehler: 10, basis: {} as Record<RessortId, number>, boosts: [], sitzungen: [], protokoll: [], bonusWoche: 0,
  };
  s.vorstand = v;
  for (const r of RESSORTS) v.basis[r] = ressortWert(s, r);
  for (const r of RESSORTS) erneuereKandidaten(s, r);
  return v;
}

function erzeugeKandidat(s: GameState, r: RessortId): Kandidat {
  const h = rng(s);
  const w = zufall(h) < 0.45;
  const alter = Math.round(zwischen(h, 38, 62));
  const name = `${waehle(h, w ? VORNAMEN_W : VORNAMEN_M)} ${waehle(h, NACHNAMEN)}`;
  // Profile: Führungstyp, Fachtyp, Allrounder, Spitzenkraft, Nachwuchs
  const typ = zufall(h);
  let f: number, k: number;
  if (typ < 0.2) { f = zwischen(h, 70, 92); k = zwischen(h, 35, 60); }
  else if (typ < 0.4) { f = zwischen(h, 35, 60); k = zwischen(h, 70, 94); }
  else if (typ < 0.75) { f = zwischen(h, 50, 75); k = zwischen(h, 50, 75); }
  else if (typ < 0.88) { f = zwischen(h, 78, 96); k = zwischen(h, 78, 96); }
  else { f = zwischen(h, 30, 50); k = zwischen(h, 40, 65); }
  const loy = zwischen(h, 30, 90);
  const firma = waehle(h, FIRMEN);
  const pos = waehle(h, POSITIONEN[r]);
  const p = { fuehrung: Math.round(f), fachwissen: Math.round(k) };
  const ford = gehaltsforderung(s, r, p);
  return {
    id: neueVid(s, 'vk'), name, portraet: zufallsPortraet(h, w, alter), ...p, loyalitaet: Math.round(loy),
    aktuellePosition: pos, aktuelleFirma: firma, aktuellesGehalt: Math.round((ford * zwischen(h, 0.8, 0.97)) / 5000) * 5000,
    wechselwille: Math.round(zwischen(h, 0, 1) * 100) / 100,
    vorgeschichte: `${pos} bei ${firma}, ${Math.round(zwischen(h, 3, 12))} Jahre im Amt.`,
  };
}

function erneuereKandidaten(s: GameState, r: RessortId): void {
  const n = 3 + Math.floor(zufall(rng(s)) * 3);
  s.vorstand.ressorts[r].kandidaten = Array.from({ length: n }, () => erzeugeKandidat(s, r));
}

// ---------------------------------------------------------------------------------------------
// Angebot und Annahme
// ---------------------------------------------------------------------------------------------

/** Annahmewahrscheinlichkeit eines Angebots: Gehalt gegen Forderung, Boni, Firmenlage, Image, Wechselwille. */
export function angebotsChance(s: GameState, r: RessortId, kandidatId: string, gehalt: number, haltebonus = 0, erfolgsbonus = 0): number {
  const k = s.vorstand.ressorts[r]?.kandidaten.find((x) => x.id === kandidatId);
  if (!k) return 0;
  const ford = gehaltsforderung(s, r, k);
  const lage = s.phase === 'insolvenz' ? -0.22 : runwayWochen(s) < 8 ? -0.1 : 0;
  const p = 0.45 + 3 * (gehalt / ford - 1) + 0.5 * Math.min(1, haltebonus / ford) * 0.5 + 0.12 * Math.min(1, erfolgsbonus)
    + (s.stakeholder.image - 45) / 250 + lage + 0.25 * (k.wechselwille - 0.5);
  return clamp(p, 0.02, 0.97);
}

// ---------------------------------------------------------------------------------------------
// Wochentakt
// ---------------------------------------------------------------------------------------------

function protokolliere(s: GameState, r: RessortId, text: string): void {
  if (s.prognose) return;
  s.vorstand.protokoll.push({ woche: s.woche, ressort: r, text });
  if (s.vorstand.protokoll.length > 200) s.vorstand.protokoll.splice(0, s.vorstand.protokoll.length - 200);
}

function loyalitaetsZiel(s: GameState, r: RessortId, p: VorstandPerson): number {
  // Amtierende vergleichen mit dem Marktgehalt ohne Insolvenzaufschlag (der gilt nur für Neue)
  const ford = gehaltsforderung(s, r, p, true);
  let z = 58 + 45 * (p.gehalt / ford - 1) + (p.gewachsen ? 12 : 0) + (s.stakeholder.image - 45) / 4 + 8 * Math.min(1, p.erfolgsbonus);
  if (p.halteBis !== undefined && p.halteBis > s.woche && p.haltebonus > 0) z += 10 + 10 * Math.min(1, p.haltebonus / p.gehalt);
  if (s.phase === 'insolvenz') z -= 12;
  return clamp(z, 0, 100);
}

/** Wöchentlicher Vorstandstakt (läuft nach quartalsStart): Loyalität, Abwerbung, Abgänge, Boni, Sitzung, Ressort-KI. */
export function vorstandWoche(s: GameState): void {
  const v = s.vorstand;
  if (!v) return;
  const w = s.woche;
  v.bonusWoche = 0;
  v.boosts = v.boosts.filter((b) => b.bis > w);
  // Erfolgsbonus für das abgelaufene Quartal
  if (w > 0 && w % 13 === 0) {
    const q = s.quartale.find((x) => x.start === w - 13);
    if (q && q.ebitdaIst >= (q.plan ?? q.planStandard)) {
      for (const r of RESSORTS) {
        const p = v.ressorts[r].person;
        if (p && p.erfolgsbonus > 0) { v.bonusWoche += (p.gehalt * p.erfolgsbonus) / 4; p.loyalitaet = clamp(p.loyalitaet + 3, 0, 100); }
      }
      if (v.bonusWoche > 0) melde(s, 'info', `Quartalsplan erreicht: Erfolgsboni für den Vorstand ${mio(v.bonusWoche)}.`);
    }
  }
  for (const r of RESSORTS) {
    const res = v.ressorts[r];
    const p = res.person;
    if (!p) continue;
    if (p.gehtWoche !== undefined && p.gehtWoche <= w) {
      melde(s, 'presse', `${p.name} (${RESSORT_INFO[r].kurz}) verlässt ${s.firma.name}${p.gehtZu ? ` und wechselt zu ${p.gehtZu}` : ''}.`);
      vakant(s, r);
      continue;
    }
    if (p.halteBis !== undefined && p.halteBis <= w) { p.halteBis = undefined; p.halteStart = undefined; p.haltebonus = 0; }
    p.loyalitaet = clamp(p.loyalitaet + (loyalitaetsZiel(s, r, p) - p.loyalitaet) * VORSTAND_PARAM.loyalitaetTempo, 0, 100);
    if (s.prognose || p.gehtWoche !== undefined || s.entscheidungen.some((e) => e.typ === 'vorstand_abwerbung' && e.daten.ressort === r)) continue;
    let pr = VORSTAND_PARAM.abwerbung * Math.pow((100 - p.loyalitaet) / 50, 3);
    if (s.phase === 'insolvenz') pr *= 1.5;
    if (p.halteBis !== undefined && p.halteBis > w) pr *= 0.4;
    if (w - p.seitWoche < 26) pr *= 0.3;
    if (chance(rng(s), pr)) abwerbung(s, r, p);
  }
  // Kandidaten frischen sich jedes Quartal auf (und sofort, wenn ein Ressort keine mehr hat)
  for (const r of RESSORTS) if ((w > 0 && w % 13 === 3) || v.ressorts[r].kandidaten.length === 0) erneuereKandidaten(s, r);
  if (!s.prognose && w > 0 && w % 13 === VORSTAND_PARAM.sitzungWoche) vorstandssitzung(s);
  if (!s.prognose) ressortKi(s);
}

function vakant(s: GameState, r: RessortId): void {
  const res = s.vorstand.ressorts[r];
  res.person = undefined;
  res.vakantSeit = s.woche;
  for (const k of Object.keys(res.delegation)) res.delegation[k] = false;
  erneuereKandidaten(s, r);
  hqAktualisiere(s);
}

function abwerbung(s: GameState, r: RessortId, p: VorstandPerson): void {
  const h = rng(s);
  const firma = waehle(h, FIRMEN);
  const plus = Math.round(zwischen(h, 15, 35));
  const e: Entscheidung = {
    id: neueVid(s, 've'), typ: 'vorstand_abwerbung', woche: s.woche, frist: s.woche + 2,
    titel: `${p.name} hat ein Angebot von ${firma}`,
    text: `${firma} bietet ${p.name} (${RESSORT_INFO[r].kurz}) rund ${plus} % mehr Gehalt. Ohne Gegenangebot geht ${p.portraet.geschlecht === 'w' ? 'sie' : 'er'} nach ${VORSTAND_PARAM.kuendigungsfrist} Wochen.`,
    optionen: [
      { id: 'gegenangebot', label: `Gegenangebot: Gehalt plus ${plus} %` },
      { id: 'haltebonus', label: 'Haltebonus: ein halbes Jahresgehalt, 52 Wochen' },
      { id: 'ziehen', label: 'Ziehen lassen' },
    ],
    standard: 'ziehen',
    daten: { ressort: r, person: p.id, firma, plus },
  };
  s.entscheidungen.push(e);
  melde(s, 'warnung', e.text);
}

// ---------------------------------------------------------------------------------------------
// Vorstandssitzung
// ---------------------------------------------------------------------------------------------

interface Thema { id: string; ressort: RessortId; titel: string; kosten: number; boosts: { abteilung: AbteilungId; faktor: number; wochen: number }[]; extra?: (s: GameState, f: number) => void; text: string }

const THEMEN: Thema[] = [
  { id: 'controlling', ressort: 'cfo', titel: 'Liquiditätscontrolling und Bankreporting', kosten: 600_000, boosts: [{ abteilung: 'controlling', faktor: 1.35, wochen: 26 }], extra: (s, f) => { s.stakeholder.bank = clamp(s.stakeholder.bank + 3 * f, 0, 100); s.stakeholder.kreditversicherer = clamp(s.stakeholder.kreditversicherer + 2 * f, 0, 100); }, text: 'Wöchentliche 13-Wochen-Liquiditätsplanung mit Bank und Kreditversicherer, neues Reporting.' },
  { id: 'logistik', ressort: 'coo', titel: 'Tourenplanung und Lagerkonsolidierung', kosten: 1_500_000, boosts: [{ abteilung: 'logistik', faktor: 1.3, wochen: 52 }], text: 'Zwei Außenlager zusammenlegen, Touren neu planen.' },
  { id: 'filialleitung', ressort: 'cso', titel: 'Programm für Filialleitungen', kosten: 900_000, boosts: [{ abteilung: 'vm', faktor: 1.2, wochen: 26 }], extra: (s, f) => { for (const h of s.haeuser) if (h.status === 'offen') h.personal.filialleiter.moral = clamp(h.personal.filialleiter.moral + 6 * f, 0, 100); }, text: 'Schulung, klare Flächenziele und ein Bonus für die Filialleitungen.' },
  { id: 'sortiment', ressort: 'cpo', titel: 'Sortimentsbereinigung und Trendscouting', kosten: 800_000, boosts: [{ abteilung: 'einkauf', faktor: 1.2, wochen: 26 }, { abteilung: 'produkt', faktor: 1.3, wochen: 26 }], text: 'Lieferantenzahl senken, Trendscouts auf die Messen schicken.' },
  { id: 'kampagne', ressort: 'cmo', titel: 'Imagekampagne', kosten: 2_000_000, boosts: [{ abteilung: 'marketing', faktor: 1.3, wochen: 13 }], extra: (s, f) => { s.stakeholder.image = clamp(s.stakeholder.image + 3 * f, 0, 100); }, text: 'Kampagne in Funk, Plakat und Online, die zeigt, dass das Haus weitermacht.' },
  { id: 'betriebsrat', ressort: 'chro', titel: 'Bündnis mit dem Betriebsrat', kosten: 500_000, boosts: [{ abteilung: 'personal', faktor: 1.25, wochen: 26 }], extra: (s, f) => { s.stakeholder.betriebsrat = clamp(s.stakeholder.betriebsrat + 5 * f, 0, 100); }, text: 'Gemeinsame Zukunftswerkstatt, Qualifizierung statt Kündigung, wo es geht.' },
  { id: 'mieten', ressort: 'cro', titel: 'Mietoffensive mit externem Makler', kosten: 700_000, boosts: [{ abteilung: 'immobilien', faktor: 1.35, wochen: 26 }, { abteilung: 'recht', faktor: 1.15, wochen: 26 }], text: 'Alle Mietverträge mit Restlaufzeit unter drei Jahren auf den Tisch.' },
  { id: 'online', ressort: 'cdo', titel: 'Neuer Onlineshop', kosten: 2_500_000, boosts: [{ abteilung: 'ecommerce', faktor: 1.4, wochen: 52 }], text: 'Shopsystem erneuern, Click and Collect in allen Häusern.' },
];

function bericht(s: GameState, r: RessortId): string {
  const p = s.vorstand.ressorts[r].person;
  if (!p) return 'Ressort unbesetzt, der CEO berichtet selbst.';
  const h = rng(s);
  // Fachwissen bestimmt die Treffsicherheit der Zahlen im Bericht
  const fehl = (x: number) => x * (1 + normal(h) * 0.3 * (1 - p.fachwissen / 100));
  const k13 = s.historie.slice(-13);
  const sum = (f: (k: (typeof k13)[number]) => number) => k13.reduce((a, b) => a + f(b), 0);
  const offen = s.haeuser.filter((x) => x.status === 'offen');
  switch (r) {
    case 'cfo': return `Reichweite der Liquidität rund ${Math.max(0, Math.round(fehl(runwayWochen(s))))} Wochen, EBITDA der letzten 13 Wochen ${mio(fehl(sum((k) => k.ebitda)))}.`;
    case 'coo': return `Logistikkosten ${mio(sum((k) => k.logistik))} im Quartal, ${offen.length} Häuser im Betrieb.`;
    case 'cso': { const m = offen.length ? offen.reduce((a, x) => a + x.personal.filialleiter.moral, 0) / offen.length : 0; return `Moral der Filialleitungen im Schnitt ${Math.round(fehl(m))}, ${s.haeuser.filter((x) => x.status === 'schliessung_verhandlung' || x.status === 'raeumung').length} Häuser in Schließung.`; }
    case 'cpo': { const ent = s.produkte?.liste.filter((x) => x.status === 'entwicklung').length ?? 0; return `${s.einkauf.freigaben.length} offene Freigaben, ${ent} Produkte in Entwicklung, Abschriften ${mio(sum((k) => k.abschriften))} im Quartal.`; }
    case 'cmo': return `Marketing ${mio(sum((k) => k.marketing))} im Quartal, Image ${Math.round(fehl(s.stakeholder.image))}.`;
    case 'chro': return `Betriebsrat ${Math.round(fehl(s.stakeholder.betriebsrat))} Punkte, Zentrale ${s.zentrale.fte} FTE.`;
    case 'cro': return s.insolvenz ? `Verfahren läuft seit Woche ${s.insolvenz.seit}, Restmieten und Sozialpläne ${mio(-sum((k) => Math.min(0, k.sondereffekte)))} im Quartal.` : `Kein Verfahren. Sondereffekte ${mio(sum((k) => k.sondereffekte))} im Quartal.`;
    case 'cdo': return `E-Commerce arbeitet mit wirksamer Stufe ${(Math.round(s.hq.wirkung.ecommerce * 10) / 10).toLocaleString('de-DE')}.`;
  }
}

function vorstandssitzung(s: GameState): void {
  const v = s.vorstand;
  const h = rng(s);
  const berichte = RESSORTS.map((r) => ({ ressort: r, name: v.ressorts[r].person?.name, text: bericht(s, r) }));
  const sitzung: VorstandSitzung = { woche: s.woche, berichte };
  const moeglich = THEMEN.filter((t) => v.ressorts[t.ressort].person);
  if (moeglich.length) {
    const t = waehle(h, moeglich);
    const p = v.ressorts[t.ressort].person!;
    const id = neueVid(s, 've');
    // Verdeckte Güte: Fachwissen bestimmt, ob das Projekt hält, was es verspricht
    const guete = clamp(0.35 + p.fachwissen / 100 + normal(h) * 0.15, 0.1, 1.4);
    const inso = s.phase === 'insolvenz';
    const e: Entscheidung = {
      id, typ: 'vorstand_sitzung', woche: s.woche, frist: s.woche + 3,
      titel: `Vorstandssitzung: ${t.titel}`,
      text: `${p.name} (${RESSORT_INFO[t.ressort].kurz}) schlägt vor: ${t.text} Kosten ${mio(t.kosten)}${inso ? ', der Sachwalter muss zustimmen' : ''}.`,
      optionen: [
        { id: 'umsetzen', label: `Umsetzen (${mio(t.kosten)})` },
        { id: 'kleiner', label: `Kleiner umsetzen (${mio(t.kosten / 2)})` },
        { id: 'vertagen', label: 'Vertagen' },
      ],
      standard: 'vertagen',
      daten: { thema: t.id, ressort: t.ressort, guete },
    };
    s.entscheidungen.push(e);
    sitzung.thema = { id: t.id, ressort: t.ressort, titel: t.titel, entscheidungId: id };
    melde(s, 'ereignis', `Vorstandssitzung Quartal ${Math.floor(s.woche / 13) + 1}: ${e.text}`);
  }
  v.sitzungen.push(sitzung);
  if (v.sitzungen.length > 24) v.sitzungen.splice(0, v.sitzungen.length - 24);
}

/** Entscheidungen 'vorstand_sitzung' und 'vorstand_abwerbung' (aus loeseEntscheidung). */
export function loeseVorstandEntscheidung(s: GameState, e: Entscheidung, option: string): void {
  const v = s.vorstand;
  const r = e.daten.ressort as RessortId;
  if (e.typ === 'vorstand_abwerbung') {
    const p = v.ressorts[r]?.person;
    if (!p || p.id !== e.daten.person) return;
    if (option === 'gegenangebot') {
      p.gehalt = Math.round((p.gehalt * (1 + Number(e.daten.plus) / 100)) / 5000) * 5000;
      p.loyalitaet = clamp(p.loyalitaet + 15, 0, 100);
      protokolliere(s, r, `Gegenangebot angenommen, neues Gehalt ${Math.round(p.gehalt / 1000)} Tsd. €.`);
    } else if (option === 'haltebonus') {
      p.haltebonus = Math.round(p.gehalt / 2);
      p.halteBis = s.woche + 52;
      p.halteStart = s.woche;
      p.loyalitaet = clamp(p.loyalitaet + 10, 0, 100);
      protokolliere(s, r, `Bleibt gegen Haltebonus von ${Math.round(p.haltebonus / 1000)} Tsd. €.`);
    } else {
      p.gehtWoche = s.woche + VORSTAND_PARAM.kuendigungsfrist;
      p.gehtZu = String(e.daten.firma);
      protokolliere(s, r, `Hat gekündigt, geht in ${VORSTAND_PARAM.kuendigungsfrist} Wochen.`);
    }
    return;
  }
  if (e.typ === 'vorstand_sitzung') {
    const t = THEMEN.find((x) => x.id === e.daten.thema);
    const sitzung = v.sitzungen.find((x) => x.thema?.entscheidungId === e.id);
    const p = v.ressorts[r]?.person;
    if (!t) return;
    if (option === 'vertagen') {
      if (p) p.loyalitaet = clamp(p.loyalitaet - 3, 0, 100);
      if (sitzung?.thema) sitzung.thema.ergebnis = 'vertagt';
      return;
    }
    const anteil = option === 'kleiner' ? 0.5 : 1;
    const g = Number(e.daten.guete) * anteil;
    einmalKosten(s, t.kosten * anteil);
    for (const b of t.boosts) v.boosts.push({ abteilung: b.abteilung, faktor: 1 + (b.faktor - 1) * g, bis: s.woche + b.wochen, text: t.titel });
    t.extra?.(s, g);
    if (p) p.loyalitaet = clamp(p.loyalitaet + 4, 0, 100);
    if (sitzung?.thema) sitzung.thema.ergebnis = option === 'kleiner' ? 'kleiner umgesetzt' : 'umgesetzt';
    protokolliere(s, r, `${t.titel} ${option === 'kleiner' ? 'in kleinem Umfang ' : ''}beschlossen.`);
    hqAktualisiere(s);
  }
}

// ---------------------------------------------------------------------------------------------
// Ressort-KI (Delegation)
// ---------------------------------------------------------------------------------------------

export type DelegationsHandler = (s: GameState, guete: number, r: RngHalter) => void;
const EXTERN: Partial<Record<string, DelegationsHandler>> = {};

/** Andere Module (z. B. marketing.ts) hängen ihre Ressort-KI ein: registriereDelegation('cmo', 'crm', fn). */
export function registriereDelegation(ressort: RessortId, bereich: string, fn: DelegationsHandler): void {
  EXTERN[`${ressort}.${bereich}`] = fn;
}

function ressortKi(s: GameState): void {
  const v = s.vorstand;
  for (const r of RESSORTS) {
    const res = v.ressorts[r];
    const p = res.person;
    if (!p) continue;
    const guete = p.fachwissen / 100;
    for (const [bereich, an] of Object.entries(res.delegation)) {
      if (!an || s.phase === 'zerschlagen') continue;
      const f = EXTERN[`${r}.${bereich}`] ?? KI[`${r}.${bereich}`];
      if (f) f(s, guete, rng(s));
    }
  }
}

/** Trefferquote einer delegierten Entscheidung nach Fachwissen. */
const trifft = (r: RngHalter, guete: number): boolean => chance(r, 0.3 + 0.65 * guete);

function tu(s: GameState, r: RessortId, a: SpielerAktion, text?: string): boolean {
  const e = fuehreAus(s, a);
  if (e.ok) protokolliere(s, r, text ?? e.text);
  return e.ok;
}

const KI: Record<string, DelegationsHandler> = {
  'cfo.zahlungsplanung': (s, g, h) => {
    if (s.woche % 4 !== 0) return;
    const rw = runwayWochen(s);
    let ziel = rw < 5 ? 0.88 : rw > 14 ? 1 : 0.95;
    if (!trifft(h, g)) ziel = clamp(ziel + (zufall(h) < 0.5 ? -0.12 : 0.1), 0.7, 1.15);
    tu(s, 'cfo', { typ: 'orderLevel', gruppe: 'alle', level: ziel }, `Orderniveau auf ${Math.round(ziel * 100)} % gesetzt (Reichweite ${Math.round(rw)} Wochen).`);
  },
  'cfo.bank': (s, g, h) => {
    const q = s.quartale[s.quartale.length - 1];
    if (q && q.start === s.woche) {
      const b = Math.abs(q.planStandard);
      const plan = trifft(h, g) ? q.planStandard - 0.04 * b - 300_000 : q.planStandard + 0.15 * b + 1_500_000;
      tu(s, 'cfo', { typ: 'plan', ebitda: plan }, `Quartalsplan eingereicht: ${mio(plan)}.`);
    }
    // Bankgespräche: gute CFOs bauen Vertrauen auf, schwache verspielen es
    const d = (g - 0.5) * 0.06;
    s.stakeholder.bank = clamp(s.stakeholder.bank + d, 0, 100);
    s.stakeholder.kreditversicherer = clamp(s.stakeholder.kreditversicherer + d, 0, 100);
  },
  'coo.filialpersonal': (s, g, h) => {
    const w = s.woche % 52;
    if (w !== 43 && w !== 2) return;
    let q = w === 43 ? 0.2 : 0.1;
    if (!trifft(h, g)) q = w === 43 ? 0.12 : 0.18;
    tu(s, 'coo', { typ: 'aushilfen', haeuser: 'alle', quote: q }, `Aushilfenquote auf ${Math.round(q * 100)} % gesetzt.`);
  },
  'coo.personalbedarf': (s, g, h) => {
    if (s.woche % 13 !== 4) return;
    let n = 0;
    for (const x of s.haeuser.filter((y) => y.status === 'offen' && y.kpi)) {
      const ist = x.kpi!.fteIst, bedarf = x.kpi!.fteBedarf;
      const gut = trifft(h, g);
      const ziel = gut ? bedarf * 1.02 : bedarf * zwischen(h, 0.9, 1.08);
      if (ist > ziel * 1.01) { if (tu(s, 'coo', { typ: 'personalabbau', haeuser: [x.id], prozent: Math.min(0.2, (ist - ziel) / ist) }, '')) n++; }
    }
    if (n) protokolliere(s, 'coo', `Personal in ${n} Häusern an den Bedarf angepasst.`);
  },
  'cso.filialbesetzung': (s, g, h) => {
    if (s.woche % 13 !== 5) return;
    const wackel = s.haeuser.filter((x) => x.status === 'offen' && x.personal.filialleiter.moral < 35);
    if (!wackel.length) return;
    const ids = trifft(h, g) ? wackel.filter((x) => (x.kpi?.db ?? 0) > 0).map((x) => x.id) : s.haeuser.filter((x) => x.status === 'offen').map((x) => x.id);
    if (ids.length) tu(s, 'cso', { typ: 'halteprämie', haeuser: ids, betrag: 5000 }, `Halteprämien für ${ids.length} Filialleitungen.`);
  },
  'cso.flaechenvermietung': (s, g, h) => {
    for (const a of s.angebote.filter((x) => x.status === 'offen' && (x.typ === 'untermiete' || x.typ === 'paket' || x.typ === 'stadt'))) {
      if (a.frist > s.woche + 1) continue; // erst kurz vor Fristende entscheiden
      const fair = (a.mieteQmMonat ?? 0) >= 7;
      const ja = trifft(h, g) ? fair : zufall(h) < 0.5;
      if (ja) tu(s, 'cso', { typ: 'angebotAnnehmen', angebot: a.id });
      else tu(s, 'cso', { typ: 'angebotAblehnen', angebot: a.id });
    }
  },
  'cpo.freigaben': (s, g, h) => {
    if (!s.einkauf.freigaben.length) return;
    let offen = 0; let weg = 0;
    for (const x of s.haeuser) { const u = x.kpi?.umsatz ?? 0; if (x.status === 'offen') offen += u; else if (x.status === 'schliessung_verhandlung' || x.status === 'raeumung') weg += u; }
    const k = offen + weg > 0 ? weg / (offen + weg) : 0;
    if (trifft(h, g)) {
      if (k > 0.02) for (const f of s.einkauf.freigaben.filter((x) => x.typ === 'vororder')) fuehreAus(s, { typ: 'freigabeKuerzen', id: f.id, prozent: k });
      tu(s, 'cpo', { typ: 'sammelfreigabe' }, `Freigabe-Eingang abgearbeitet${k > 0.02 ? `, Vororders um ${Math.round(k * 100)} % gekürzt` : ''}.`);
    } else if (zufall(h) < 0.5) {
      tu(s, 'cpo', { typ: 'sammelfreigabe' }, 'Alles freigegeben, ohne Kürzung.');
    } // sonst bleibt der Eingang liegen (Saisonorders verfallen bei Fristablauf)
  },
  'cpo.dispo': (s, g, h) => {
    if (s.woche % 26 !== 7) return;
    const gut = trifft(h, g);
    const limit = gut ? 1.05 : waehle(h, [0.82, 1.35]);
    tu(s, 'cpo', { typ: 'wgLimit', wg: 'alle', faktor: limit }, `Open to Buy auf ${Math.round(limit * 100)} % vom Plan.`);
    tu(s, 'cpo', { typ: 'wgServicegrad', wg: 'alle', ziel: gut ? 0.95 : 0.9 }, '');
  },
  'cpo.produktentwicklung': (s, g, h) => { const t = produktKi(s, g, h); if (t) protokolliere(s, 'cpo', t); },
  'cmo.kanalbudget': (s, g, h) => {
    if (s.woche % 13 !== 1) return;
    let q = s.phase === 'insolvenz' ? 0.018 : 0.022;
    if (!trifft(h, g)) q = waehle(h, [0.012, 0.032]);
    tu(s, 'cmo', { typ: 'marketingBudget', quote: q }, `Werbebudget auf ${(q * 100).toLocaleString('de-DE')} % vom Umsatz.`);
  },
  'chro.betriebsrat': (s, g, h) => {
    if (s.tarif === 'sanierung' || s.woche % 4 !== 0 || (s.phase !== 'insolvenz' && runwayWochen(s) > 10)) return;
    const garantie = trifft(h, g) ? 78 : 130;
    tu(s, 'chro', { typ: 'tarif', ziel: 'sanierung', garantieWochen: garantie }, `Sanierungstarif mit ${garantie} Wochen Standortgarantie verhandelt.`);
  },
  'chro.personalplanung': (s, g, h) => {
    if (s.woche % 26 !== 8) return;
    for (const a of s.hq.abteilungen) {
      const st = trifft(h, g) ? Math.max(1, a.stufe) : waehle(h, [0, 1, 2]);
      fuehreAus(s, { typ: 'abteilungStufe', abteilung: a.id, stufe: st as 0 | 1 | 2 | 3 });
    }
    protokolliere(s, 'chro', 'Abteilungen der Zentrale auf Soll gebracht.');
  },
  'cro.schliessungen': (s, g, h) => {
    if (s.woche % 13 !== 9) return;
    const p = portfolio(s).filter((x) => x.status === 'offen' && x.umsatz > 0).sort((a, b) => a.db / a.umsatz - b.db / b.umsatz);
    const kand = trifft(h, g) ? p.filter((x) => x.db / x.umsatz < -0.08).slice(0, 4) : p.slice(Math.floor(p.length * 0.3), Math.floor(p.length * 0.3) + 2);
    for (const x of kand) tu(s, 'cro', { typ: 'schliessen', haus: x.id }, `${x.name} zur Schließung gestellt.`);
  },
  'cro.mietverhandlungen': (s, g, h) => {
    if (s.woche % 13 !== 10) return;
    const p = portfolio(s).filter((x) => x.status === 'offen' && x.mietquote > 0.13).sort((a, b) => b.mietquote - a.mietquote).slice(0, 5);
    for (const x of p) {
      const red = trifft(h, g) ? 0.15 : 0.3;
      tu(s, 'cro', { typ: 'mieteVerhandeln', haus: x.id, reduktion: red });
    }
  },
};

// ---------------------------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------------------------

export type VorstandAktion =
  | { typ: 'vorstandEinstellen'; ressort: RessortId; kandidat: string; gehalt: number; haltebonus?: number; erfolgsbonus?: number }
  | { typ: 'vorstandEntlassen'; ressort: RessortId }
  | { typ: 'vorstandGehalt'; ressort: RessortId; gehalt: number }
  | { typ: 'vorstandBonus'; ressort: RessortId; haltebonus?: number; halteWochen?: number; erfolgsbonus?: number }
  | { typ: 'vorstandDelegation'; ressort: RessortId; bereich: string; an: boolean };

export const VORSTAND_AKTIONEN = new Set<string>(['vorstandEinstellen', 'vorstandEntlassen', 'vorstandGehalt', 'vorstandBonus', 'vorstandDelegation']);

export function abfindung(s: GameState, p: VorstandPerson): number {
  const f = s.phase === 'insolvenz' ? VORSTAND_PARAM.abfindungInsolvenz : VORSTAND_PARAM.abfindungRegulaer;
  const offenBonus = p.halteBis !== undefined && p.halteBis > s.woche ? p.haltebonus * ((p.halteBis - s.woche) / Math.max(1, p.halteBis - (p.halteStart ?? p.seitWoche))) : 0;
  return eur(p.gehalt * f + offenBonus);
}

export function vorstandAktion(s: GameState, a: VorstandAktion): { ok: boolean; text: string } {
  const ok = (text: string) => ({ ok: true, text });
  const fehler = (text: string) => ({ ok: false, text });
  const res = s.vorstand.ressorts[a.ressort];
  if (!res) return fehler('Unbekanntes Ressort.');
  const info = RESSORT_INFO[a.ressort];
  switch (a.typ) {
    case 'vorstandEinstellen': {
      if (res.person) return fehler(`${info.kurz} ist besetzt. Erst entlassen, dann neu besetzen.`);
      const k = res.kandidaten.find((x) => x.id === a.kandidat);
      if (!k) return fehler('Kandidat nicht gefunden.');
      const gehalt = Math.max(0, Math.round(a.gehalt / 5000) * 5000);
      const hb = Math.max(0, eur(a.haltebonus ?? 0));
      const eb = clamp(a.erfolgsbonus ?? 0, 0, 1);
      const p = angebotsChance(s, a.ressort, k.id, gehalt, hb, eb);
      if (!chance(rng(s), p)) {
        const ford = gehaltsforderung(s, a.ressort, k);
        if (zufall(rng(s)) < 0.5) res.kandidaten = res.kandidaten.filter((x) => x.id !== k.id);
        return fehler(`${k.name} lehnt ab (Chance war ${Math.round(p * 100)} %). Forderung liegt bei ${Math.round(ford / 1000)} Tsd. €.`);
      }
      const person: VorstandPerson = {
        id: k.id, name: k.name, portraet: k.portraet, fuehrung: k.fuehrung, fachwissen: k.fachwissen,
        loyalitaet: clamp(k.loyalitaet + 10 * (gehalt / gehaltsforderung(s, a.ressort, k) - 1) * 3, 0, 100),
        gehalt, haltebonus: hb, halteBis: hb > 0 ? s.woche + 52 : undefined, halteStart: s.woche, erfolgsbonus: eb, seitWoche: s.woche,
        vorgeschichte: k.vorgeschichte, gewachsen: false,
      };
      res.person = person;
      res.vakantSeit = undefined;
      res.kandidaten = res.kandidaten.filter((x) => x.id !== k.id);
      hqAktualisiere(s);
      melde(s, 'presse', `${s.firma.name} beruft ${k.name} zum ${info.titel} (${info.kurz}).`);
      return ok(`${k.name} sagt zu: ${info.kurz} ab sofort, Gehalt ${Math.round(gehalt / 1000)} Tsd. € im Jahr. Volle Wirkung nach ${VORSTAND_PARAM.einarbeitungWochen} Wochen.`);
    }
    case 'vorstandEntlassen': {
      const p = res.person;
      if (!p) return fehler(`${info.kurz} ist unbesetzt.`);
      const abf = abfindung(s, p);
      einmalKosten(s, abf);
      for (const r of RESSORTS) { const x = s.vorstand.ressorts[r].person; if (x && x !== p) x.loyalitaet = clamp(x.loyalitaet - 3, 0, 100); }
      vakant(s, a.ressort);
      hqAktualisiere(s);
      melde(s, 'presse', `${p.name} verlässt den Vorstand von ${s.firma.name}.`);
      return ok(`${p.name} entlassen, Abfindung ${mio(abf)}. ${info.kurz} ist unbesetzt, Delegation aus.`);
    }
    case 'vorstandGehalt': {
      const p = res.person;
      if (!p) return fehler(`${info.kurz} ist unbesetzt.`);
      const neu = Math.max(0, Math.round(a.gehalt / 5000) * 5000);
      const alt = p.gehalt;
      if (neu < alt) p.loyalitaet = clamp(p.loyalitaet - 150 * (1 - neu / alt), 0, 100);
      else p.loyalitaet = clamp(p.loyalitaet + 40 * (neu / alt - 1), 0, 100);
      p.gehalt = neu;
      return ok(`${p.name}: Gehalt ${Math.round(neu / 1000)} Tsd. € im Jahr (${neu >= alt ? '+' : ''}${Math.round((neu / alt - 1) * 100)} %). Loyalität ${Math.round(p.loyalitaet)}.`);
    }
    case 'vorstandBonus': {
      const p = res.person;
      if (!p) return fehler(`${info.kurz} ist unbesetzt.`);
      const teile: string[] = [];
      if (a.haltebonus !== undefined) {
        const hb = Math.max(0, eur(a.haltebonus));
        const wochen = clamp(Math.round(a.halteWochen ?? 52), 13, 156);
        p.haltebonus = hb;
        p.halteBis = hb > 0 ? s.woche + wochen : undefined;
        p.halteStart = s.woche;
        if (hb > 0) p.loyalitaet = clamp(p.loyalitaet + 6, 0, 100);
        teile.push(hb > 0 ? `Haltebonus ${Math.round(hb / 1000)} Tsd. € über ${wochen} Wochen` : 'kein Haltebonus');
      }
      if (a.erfolgsbonus !== undefined) {
        p.erfolgsbonus = clamp(a.erfolgsbonus, 0, 1);
        teile.push(`Erfolgsbonus ${Math.round(p.erfolgsbonus * 100)} % vom Jahresgehalt bei Planerfüllung`);
      }
      hqAktualisiere(s);
      return ok(`${p.name}: ${teile.join(', ') || 'unverändert'}.`);
    }
    case 'vorstandDelegation': {
      if (!DELEGATIONEN[a.ressort].some((d) => d.id === a.bereich)) return fehler('Diesen Bereich gibt es im Ressort nicht.');
      if (a.an && !res.person) return fehler(`${info.kurz} ist unbesetzt, ohne Vorstand keine Delegation.`);
      res.delegation[a.bereich] = a.an;
      hqAktualisiere(s);
      const d = DELEGATIONEN[a.ressort].find((x) => x.id === a.bereich)!;
      return ok(`${d.beschreibung}: ${a.an ? `entscheidet ab jetzt ${res.person!.name}` : 'entscheidet wieder der CEO'}.`);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Abfragen
// ---------------------------------------------------------------------------------------------

export interface PersonKarte {
  id: string; name: string; portraet: Portraet; fuehrung: number; fachwissen: number; loyalitaet: number;
  gehalt: number; gehaltsforderung: number; haltebonus: number; halteBis?: number; erfolgsbonus: number; seitWoche: number;
  gewachsen: boolean; gehtWoche?: number;
}

export interface RessortKarte {
  id: RessortId; kurz: string; titel: string; zustaendig: string; besetzt: boolean; person?: PersonKarte;
  /** Ressortwert 0..100 und Wirkung auf die Abteilungen (Faktor auf die wirksame Stufe). */
  wert: number;
  abteilungen: { id: AbteilungId; name: string; faktor: number }[];
  delegationen: { id: string; label: string; beschreibung: string; an: boolean }[];
  /** Abwerberisiko je Jahr (0..1) und Ampel. */
  risiko: number; risikoAmpel: 'gruen' | 'gelb' | 'rot';
  vakantSeit?: number;
}

export interface VorstandUebersicht {
  woche: number; ressorts: RessortKarte[]; besetzt: number; kostenJahr: number; kostenWoche: number;
  naechsteSitzung: number; letzteSitzung?: VorstandSitzung; offeneEntscheidungen: { id: string; typ: string; titel: string; frist: number }[];
  boosts: VorstandBoost[];
}

export interface VorstandProfil extends RessortKarte {
  vorgeschichte?: string; abfindung?: number; gehaltsSchritt: number; gehaltProzent?: number;
  protokoll: VorstandProtokoll[]; kandidatenAnzahl: number;
}

function personKarte(s: GameState, r: RessortId, p: VorstandPerson): PersonKarte {
  return {
    id: p.id, name: p.name, portraet: { ...p.portraet }, fuehrung: Math.round(p.fuehrung), fachwissen: Math.round(p.fachwissen), loyalitaet: Math.round(p.loyalitaet),
    gehalt: p.gehalt, gehaltsforderung: gehaltsforderung(s, r, p), haltebonus: p.haltebonus, halteBis: p.halteBis, erfolgsbonus: p.erfolgsbonus,
    seitWoche: p.seitWoche, gewachsen: p.gewachsen, gehtWoche: p.gehtWoche,
  };
}

function jahresRisiko(s: GameState, p: VorstandPerson): number {
  let pr = VORSTAND_PARAM.abwerbung * Math.pow((100 - p.loyalitaet) / 50, 3);
  if (s.phase === 'insolvenz') pr *= 1.5;
  if (p.halteBis !== undefined && p.halteBis > s.woche) pr *= 0.4;
  return 1 - Math.pow(1 - Math.min(1, pr), 52);
}

export function ressortKarte(s: GameState, r: RessortId): RessortKarte {
  const res = s.vorstand.ressorts[r];
  const info = RESSORT_INFO[r];
  const p = res.person;
  const risiko = p ? (p.gehtWoche !== undefined ? 1 : jahresRisiko(s, p)) : 0;
  return {
    id: r, kurz: info.kurz, titel: info.titel, zustaendig: info.zustaendig, besetzt: !!p, person: p ? personKarte(s, r, p) : undefined,
    wert: Math.round(ressortWert(s, r) * 100),
    abteilungen: (Object.keys(info.abteilungen) as AbteilungId[]).map((id) => ({ id, name: ABTEILUNG_NAME[id], faktor: Math.round(vorstandWirkung(s, id) * 1000) / 1000 })),
    delegationen: DELEGATIONEN[r].map((d) => ({ ...d, an: !!res.delegation[d.id] })),
    risiko: Math.round(risiko * 100) / 100, risikoAmpel: risiko < 0.15 ? 'gruen' : risiko < 0.35 ? 'gelb' : 'rot',
    vakantSeit: res.vakantSeit,
  };
}

export function vorstandUebersicht(s: GameState): VorstandUebersicht {
  const v = s.vorstand;
  const w = s.woche;
  const q = Math.floor(w / 13) * 13 + VORSTAND_PARAM.sitzungWoche;
  return {
    woche: w,
    ressorts: RESSORTS.map((r) => ressortKarte(s, r)),
    besetzt: RESSORTS.filter((r) => v.ressorts[r].person).length,
    kostenWoche: eur(vorstandKostenWoche(s)),
    kostenJahr: eur(RESSORTS.reduce((a, r) => a + (v.ressorts[r].person?.gehalt ?? 0), 0)),
    naechsteSitzung: q > w ? q : q + 13,
    letzteSitzung: v.sitzungen[v.sitzungen.length - 1],
    offeneEntscheidungen: s.entscheidungen.filter((e) => e.typ.startsWith('vorstand_')).map((e) => ({ id: e.id, typ: e.typ, titel: e.titel, frist: e.frist })),
    boosts: v.boosts.filter((b) => b.bis > w),
  };
}

export function vorstandProfil(s: GameState, r: RessortId): VorstandProfil | undefined {
  const res = s.vorstand.ressorts[r];
  if (!res) return undefined;
  const k = ressortKarte(s, r);
  const p = res.person;
  return {
    ...k, vorgeschichte: p?.vorgeschichte, abfindung: p ? abfindung(s, p) : undefined, gehaltsSchritt: 10_000,
    gehaltProzent: p ? Math.round((p.gehalt / gehaltsforderung(s, r, p) - 1) * 100) : undefined,
    protokoll: s.vorstand.protokoll.filter((x) => x.ressort === r).slice(-12), kandidatenAnzahl: res.kandidaten.length,
  };
}

export interface KandidatKarte {
  id: string; name: string; portraet: Portraet; aktuellePosition: string; aktuelleFirma: string;
  fuehrung: number; fachwissen: number; loyalitaet: number; aktuellesGehalt: number; gehaltsforderung: number; chanceBeiForderung: number;
  vorgeschichte: string;
}

export interface KandidatenListe { ressort: RessortId; kurz: string; titel: string; besetzt: boolean; kandidaten: KandidatKarte[]; gehaltsSchritt: number }

export function kandidaten(s: GameState, r: RessortId): KandidatenListe | undefined {
  const res = s.vorstand.ressorts[r];
  if (!res) return undefined;
  return {
    ressort: r, kurz: RESSORT_INFO[r].kurz, titel: RESSORT_INFO[r].titel, besetzt: !!res.person, gehaltsSchritt: 10_000,
    kandidaten: res.kandidaten.map((k) => {
      const ford = gehaltsforderung(s, r, k);
      return {
        id: k.id, name: k.name, portraet: { ...k.portraet }, aktuellePosition: k.aktuellePosition, aktuelleFirma: k.aktuelleFirma,
        fuehrung: k.fuehrung, fachwissen: k.fachwissen, loyalitaet: k.loyalitaet, aktuellesGehalt: k.aktuellesGehalt, gehaltsforderung: ford,
        chanceBeiForderung: Math.round(angebotsChance(s, r, k.id, ford) * 100) / 100, vorgeschichte: k.vorgeschichte,
      };
    }),
  };
}

/** Für hqFuerGrafik: Namensschilder der Vorstandsetage. */
export function vorstandFuerGrafik(s: GameState): { id: RessortId; kurz: string; titel: string; name?: string; portraet?: Portraet }[] {
  if (!s.vorstand) return [];
  return RESSORTS.map((r) => { const p = s.vorstand.ressorts[r].person; return { id: r, kurz: RESSORT_INFO[r].kurz, titel: RESSORT_INFO[r].titel, name: p?.name, portraet: p ? { ...p.portraet } : undefined }; });
}

